#![cfg_attr(windows, windows_subsystem = "windows")]

mod catalog;
mod health;
mod http_api;
mod security;
mod usage;
use axum::{
    extract::{Request as HttpRequest, State},
    middleware::{self, Next},
    response::{IntoResponse, Response as HttpResponse},
};
use fs2::FileExt;
use std::{
    io::{BufRead, Read},
    path::PathBuf,
    sync::Arc,
    time::Duration,
};
use subtle::ConstantTimeEq;
use tagma_core::{
    credentials::{CredentialStore, SystemCredentials},
    *,
};
use tagma_runtime::ipc::{self, Bootstrap, Command, Manifest, Request, Response};
use tokio::{net::TcpListener, sync::RwLock};
use tokio_util::sync::CancellationToken;

type LoadedSnapshot = (
    u32,
    tagma_core::service::ConfigSnapshot,
    Option<zeroize::Zeroizing<String>>,
    std::collections::HashMap<String, Arc<zeroize::Zeroizing<String>>>,
);

struct Runtime {
    usage: Arc<usage::Ledger>,
    security: Arc<security::Gate>,
    catalog_client: reqwest::Client,
    catalog_jobs: Arc<catalog::Jobs>,
    catalog_slots: Arc<tokio::sync::Semaphore>,
    directory: PathBuf,
    manifest: Manifest,
    status: RwLock<RuntimeStatus>,
    snapshot: RwLock<LoadedSnapshot>,
    configured_port: u16,
    token: zeroize::Zeroizing<String>,
    shutdown: CancellationToken,
    apply_guard: tokio::sync::Mutex<()>,
    load_slots: Arc<tokio::sync::Semaphore>,
    client: reqwest::Client,
    request_slots: Arc<tokio::sync::Semaphore>,
    health: Arc<health::Tracker>,
    #[cfg(test)]
    _fixture: Option<tempfile::TempDir>,
}

fn main() {
    let args: Vec<_> = std::env::args_os().skip(1).collect();
    let managed = args.iter().any(|a| a == "--managed");
    let test_port_override =
        cfg!(debug_assertions) && args.iter().any(|a| a == "--test-port-override");
    let directory = args
        .windows(2)
        .find(|p| p[0] == "--config-dir")
        .map(|p| PathBuf::from(&p[1]));
    let port = args
        .windows(2)
        .find(|p| p[0] == "--port")
        .and_then(|p| p[1].to_str())
        .and_then(|p| p.parse::<u16>().ok());
    let (Some(directory), Some(port)) = (directory, port) else {
        std::process::exit(12);
    };
    if port == 0 {
        std::process::exit(12);
    }
    let mut input = std::io::BufReader::new(std::io::stdin());
    let mut line = zeroize::Zeroizing::new(String::new());
    if (&mut input).take(4096).read_line(&mut line).is_err() {
        std::process::exit(12);
    }
    let bootstrap: Bootstrap = match serde_json::from_str(&line) {
        Ok(v) => v,
        Err(_) => std::process::exit(12),
    };
    if uuid::Uuid::parse_str(&bootstrap.owner_token).is_err()
        || uuid::Uuid::parse_str(&bootstrap.instance_id).is_err()
    {
        std::process::exit(12);
    }
    let shutdown = CancellationToken::new();
    if managed {
        let signal = shutdown.clone();
        std::thread::spawn(move || {
            let mut byte = [0u8; 1];
            loop {
                match input.read(&mut byte) {
                    Ok(0) | Err(_) => {
                        signal.cancel();
                        break;
                    }
                    _ => {}
                }
            }
        });
    }
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(2)
        .enable_all()
        .build()
        .expect("gateway runtime");
    let code = runtime.block_on(run(
        directory.clone(),
        port,
        test_port_override,
        bootstrap.instance_id,
        zeroize::Zeroizing::new(bootstrap.owner_token),
        shutdown,
    ));
    let _ = tagma_core::diagnostics::record(
        &directory,
        tagma_core::diagnostics::Component::Gateway,
        if code == 0 {
            tagma_core::diagnostics::Event::Stopped
        } else {
            tagma_core::diagnostics::Event::StartFailed
        },
        match code {
            0 => None,
            10 => Some(ErrorCode::AlreadyRunning),
            11 => Some(ErrorCode::PortInUse),
            13 => Some(ErrorCode::IncompatibleVersion),
            14 => Some(ErrorCode::CredentialStoreUnavailable),
            15 => Some(ErrorCode::StorageUnavailable),
            16 => Some(ErrorCode::MaintenanceInProgress),
            17 => Some(ErrorCode::RestartRequired),
            _ => Some(ErrorCode::ConfigApplyFailed),
        },
        None,
    );
    std::process::exit(code);
}

async fn run(
    directory: PathBuf,
    port: u16,
    test_port_override: bool,
    instance_id: String,
    token: zeroize::Zeroizing<String>,
    shutdown: CancellationToken,
) -> i32 {
    let lock = match std::fs::OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .open(directory.join("gateway.lock"))
    {
        Ok(v) => v,
        Err(_) => return 12,
    };
    if lock.try_lock_exclusive().is_err() {
        return 10;
    }
    let previous_runtime_unconfirmed = directory.join("runtime.json").exists();
    let maintenance = match std::fs::OpenOptions::new()
        .read(true)
        .write(true)
        .open(directory.join("maintenance.lock"))
    {
        Ok(file) => file,
        Err(_) => return 12,
    };
    if FileExt::try_lock_shared(&maintenance).is_err() {
        return 16;
    }
    let startup_directory = directory.clone();
    let initial = tokio::time::timeout(
        Duration::from_secs(8),
        tokio::task::spawn_blocking(move || load_snapshot(&startup_directory)),
    )
    .await;
    let (revision, snapshot, access_token, provider_tokens) = match initial
        .unwrap_or_else(|_| Ok(Err(AppError::new(ErrorCode::StartupTimeout))))
        .unwrap_or_else(|_| Err(AppError::new(ErrorCode::ConfigApplyFailed)))
    {
        Ok(v) => v,
        Err(e) if e.code == ErrorCode::IncompatibleVersion => return 13,
        Err(e) if e.code == ErrorCode::CredentialStoreUnavailable => return 14,
        Err(e) if e.code == ErrorCode::StorageUnavailable => return 15,
        Err(e) if e.code == ErrorCode::MaintenanceInProgress => return 16,
        Err(_) => return 12,
    };
    // A concurrent save or a crash restart may have changed the desired port.
    // Do not acknowledge that revision on a different listener. Release builds
    // cannot opt out; only explicit synthetic debug fixtures may override it.
    if port != snapshot.gateway.port && !test_port_override {
        return 17;
    }
    let tcp = match TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, port)).await {
        Ok(v) => v,
        Err(e) if e.kind() == std::io::ErrorKind::AddrInUse => return 11,
        Err(_) => return 12,
    };
    #[cfg(windows)]
    let endpoint = format!("tagma-{}", uuid::Uuid::new_v4());
    #[cfg(unix)]
    let endpoint = directory
        .join(format!("runtime-{}.sock", instance_id))
        .to_string_lossy()
        .into_owned();
    let manifest = Manifest {
        protocol_version: PROTOCOL_VERSION,
        schema_version: SCHEMA_VERSION,
        product_version: PRODUCT_VERSION.into(),
        config_id: match ipc::config_id(&directory) {
            Ok(v) => v,
            Err(_) => return 12,
        },
        instance_id: instance_id.clone(),
        endpoint,
        port,
        console_attached: tagma_core::diagnostics::console_attached(),
    };
    let listener = match ipc::listener(&manifest.endpoint) {
        Ok(v) => v,
        Err(_) => return 12,
    };
    let security = security::Gate::new(directory.clone(), shutdown.clone());
    let security_revision = match security.confirm(0).await {
        Ok(revision) => revision,
        Err(_) => return 15,
    };
    let usage_directory = directory.clone();
    let usage = match tokio::time::timeout(
        Duration::from_secs(8),
        tokio::task::spawn_blocking(move || usage::Ledger::open(&usage_directory)),
    )
    .await
    {
        Ok(Ok(Ok(ledger))) => ledger,
        _ => return 15,
    };
    let status = RuntimeStatus {
        usage_degraded: None,
        usage_pending_results: None,
        security_revision: Some(security_revision),
        state: RuntimeState::Running,
        instance_id: Some(instance_id),
        effective_revision: Some(revision),
        address: Some(format!("http://127.0.0.1:{port}/v1")),
        owned: false,
        error: None,
    };
    if previous_runtime_unconfirmed
        && ConfigService::invalidate_unconfirmed_runtime_health(&directory).is_err()
    {
        return 15;
    }
    let health = health::Tracker::new(directory.clone(), shutdown.clone());
    health.reconcile(&snapshot);
    let state = Arc::new(Runtime {
        usage,
        security,
        catalog_jobs: Arc::new(catalog::Jobs::default()),
        catalog_slots: Arc::new(tokio::sync::Semaphore::new(2)),
        catalog_client: match tagma_runtime::catalog::client() {
            Ok(client) => client,
            Err(_) => return 12,
        },
        directory: directory.clone(),
        manifest: manifest.clone(),
        status: RwLock::new(status),
        configured_port: snapshot.gateway.port,
        snapshot: RwLock::new((revision, snapshot, access_token, provider_tokens)),
        token,
        shutdown: shutdown.clone(),
        apply_guard: tokio::sync::Mutex::new(()),
        load_slots: Arc::new(tokio::sync::Semaphore::new(1)),
        client: match http_api::client() {
            Ok(client) => client,
            Err(_) => return 12,
        },
        request_slots: Arc::new(tokio::sync::Semaphore::new(8)),
        health,
        #[cfg(test)]
        _fixture: None,
    });
    let staged = directory.join(format!("runtime-{}.json", manifest.instance_id));
    let bytes = match serde_json::to_vec(&manifest) {
        Ok(v) => v,
        Err(_) => return 12,
    };
    if std::fs::write(&staged, bytes).is_err() {
        return 12;
    }
    // The single-instance lock is held throughout replacement; stale manifests carry no authority.
    if std::fs::rename(&staged, directory.join("runtime.json")).is_err() {
        return 12;
    }
    let _ = tagma_core::diagnostics::record(
        &directory,
        tagma_core::diagnostics::Component::Gateway,
        tagma_core::diagnostics::Event::Ready,
        None,
        Some(revision),
    );
    let control = state.clone();
    let management = tokio::spawn(async move {
        use interprocess::local_socket::tokio::prelude::*;
        let limit = Arc::new(tokio::sync::Semaphore::new(8));
        loop {
            tokio::select! {
                _ = control.shutdown.cancelled() => break,
                connection = listener.accept() => {
                    let Ok(mut stream) = connection else { break; };
                    let Ok(permit) = limit.clone().try_acquire_owned() else { continue; };
                    let state = control.clone();
                    tokio::spawn(async move {
                        let _permit = permit;
                        let _ = tokio::time::timeout(Duration::from_secs(2), async {
                            let Ok(request) = ipc::read_frame::<Request>(&mut stream).await else { return; };
                            if request.protocol_version != PROTOCOL_VERSION || request.product_version != PRODUCT_VERSION || request.instance_id != state.manifest.instance_id || request.config_id != state.manifest.config_id || request.challenge.len() > 64 { return; }
                            let mut stop = false;
                            match request.command {
                                Command::Status => {},
                                Command::RecoverUsage => {
                                    if let Err(error)=state.usage.recover().await {let mut status=status_snapshot(&state).await;status.error=Some(error);let response=Response{protocol_version:PROTOCOL_VERSION,product_version:PRODUCT_VERSION.into(),instance_id:state.manifest.instance_id.clone(),config_id:state.manifest.config_id.clone(),challenge:request.challenge,status};let _=ipc::write_frame(&mut stream,&response).await;return;}
                                },
                                Command::ConfirmSecurity {revision} => {
                                    match confirm_security(&state,revision).await {Ok(_)=>{},Err(error)=>{
                                        let mut status=status_snapshot(&state).await;status.error=Some(error);let response=Response {protocol_version:PROTOCOL_VERSION,product_version:PRODUCT_VERSION.into(),instance_id:state.manifest.instance_id.clone(),config_id:state.manifest.config_id.clone(),challenge:request.challenge,status};let _=ipc::write_frame(&mut stream,&response).await;return;
                                    }}
                                },
                                Command::Probe { input } => {
                                    if let Err(error)=catalog::start(&state,input).await {
                                        let mut status=status_snapshot(&state).await;status.error=Some(error);
                                        let response=Response {protocol_version:PROTOCOL_VERSION,product_version:PRODUCT_VERSION.into(),instance_id:state.manifest.instance_id.clone(),config_id:state.manifest.config_id.clone(),challenge:request.challenge,status};let _=ipc::write_frame(&mut stream,&response).await;return;
                                    }
                                },
                                Command::CancelProbe {request_id} => {let _=state.catalog_jobs.cancel(&request_id);},
                                Command::Apply => apply(&state).await,
                                Command::Stop { owner_token } => {
                                    if owner_token == *state.token { let mut status=state.status.write().await;status.state = RuntimeState::Stopping;status.error=None; stop = true; }
                                    else { let mut status = status_snapshot(&state).await; status.error = Some(AppError::new(ErrorCode::OwnershipRequired));
                                        let response = Response { protocol_version: PROTOCOL_VERSION, product_version: PRODUCT_VERSION.into(), instance_id: state.manifest.instance_id.clone(), config_id: state.manifest.config_id.clone(), challenge: request.challenge, status }; let _ = ipc::write_frame(&mut stream,&response).await; return; }
                                },
                            }
                            let response = Response { protocol_version: PROTOCOL_VERSION, product_version: PRODUCT_VERSION.into(), instance_id: state.manifest.instance_id.clone(), config_id: state.manifest.config_id.clone(), challenge: request.challenge, status: status_snapshot(&state).await };
                            let _ = ipc::write_frame(&mut stream,&response).await;
                            if stop { state.shutdown.cancel(); }
                        }).await;
                    });
                }
            }
        }
    });
    let reconcile = state.clone();
    let synchronizer = tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(2));
        loop {
            tokio::select! { _ = reconcile.shutdown.cancelled() => break, _ = interval.tick() => {apply(&reconcile).await;let _=confirm_security(&reconcile,0).await;} }
        }
    });
    let router = http_api::router(state.clone())
        .layer(middleware::from_fn_with_state(state.clone(), authorize));
    use std::future::IntoFuture;
    let serving = axum::serve(tcp, router)
        .with_graceful_shutdown(shutdown.clone().cancelled_owned())
        .into_future();
    tokio::pin!(serving);
    tokio::select! {
        _ = &mut serving => {},
        _ = shutdown.cancelled() => { let _ = tokio::time::timeout(Duration::from_secs(10), &mut serving).await; },
    }
    shutdown.cancel();
    let _ = tokio::join!(management, synchronizer);
    // Preserve the existing manifest as an uncertainty marker if metadata cannot be
    // fenced. A future owner already treats an inactive manifest as stale, and must
    // invalidate its health cache before reusing it for an automatic brain.
    let settled = state.health.settle(Duration::from_millis(500)).await;
    let health_fenced = settled
        && (state.health.confirmed()
            || ConfigService::invalidate_unconfirmed_runtime_health(&directory).is_ok());
    if health_fenced {
        let _ = std::fs::remove_file(directory.join("runtime.json"));
    }
    0
}

fn load_snapshot(directory: &std::path::Path) -> AppResult<LoadedSnapshot> {
    let result = ConfigService::read_runtime_snapshot(directory)?;
    let mut provider_tokens = std::collections::HashMap::new();
    for record in &result.1.providers {
        if record.provider.enabled
            && let Some(reference) = &record.credential_ref
        {
            provider_tokens.insert(
                record.provider.id.clone(),
                Arc::new(SystemCredentials.get(reference)?),
            );
        }
    }
    let access_token = if result.1.gateway.auth_enabled {
        result
            .1
            .gateway
            .credential_ref
            .as_ref()
            .map(|reference| SystemCredentials.get(reference))
            .transpose()?
    } else {
        None
    };
    if access_token
        .as_ref()
        .is_some_and(|token| token.len() != 64 || !token.bytes().all(|b| b.is_ascii_hexdigit()))
    {
        return Err(AppError::new(ErrorCode::CredentialStoreUnavailable));
    }
    Ok((result.0, result.1, access_token, provider_tokens))
}

async fn authorize(
    State(state): State<Arc<Runtime>>,
    mut request: HttpRequest,
    next: Next,
) -> HttpResponse {
    if !http_api::trusted_local_request(&request, state.manifest.port) {
        return http_api::error(axum::http::StatusCode::FORBIDDEN, "UNTRUSTED_ORIGIN");
    }
    let (allowed, target) = {
        let loaded = state.snapshot.read().await;
        if !loaded.1.gateway.auth_enabled {
            (true, None)
        } else {
            let header = request.headers().get_all(axum::http::header::AUTHORIZATION);
            let mut values = header.iter();
            let candidate = values
                .next()
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.split_once(' '))
                .filter(|(scheme, _)| scheme.eq_ignore_ascii_case("Bearer"))
                .map(|(_, token)| token);
            let allowed = values.next().is_none()
                && loaded
                    .2
                    .as_ref()
                    .zip(candidate)
                    .is_some_and(|(expected, actual)| {
                        bool::from(expected.as_bytes().ct_eq(actual.as_bytes()))
                    });
            (
                allowed,
                loaded
                    .1
                    .gateway
                    .credential_ref
                    .as_deref()
                    .map(tagma_core::security::gateway_target),
            )
        }
    };
    if !allowed {
        return (axum::http::StatusCode::UNAUTHORIZED,[(axum::http::header::WWW_AUTHENTICATE,"Bearer")],axum::Json(serde_json::json!({"error":{"code":"UNAUTHORIZED","message":"A valid local access token is required"}}))).into_response();
    }
    // Acquire before body extraction, and retain until the downstream body is
    // consumed/dropped. Slow callers cannot create an unbounded response queue.
    let permit = match state.request_slots.clone().try_acquire_owned() {
        Ok(permit) => permit,
        Err(_) => {
            return http_api::error(axum::http::StatusCode::TOO_MANY_REQUESTS, "GATEWAY_BUSY");
        }
    };
    let policy = match state.security.read(target.iter().cloned().collect()).await {
        Ok(policy) => policy,
        Err(_) => {
            return http_api::error(
                axum::http::StatusCode::SERVICE_UNAVAILABLE,
                "SECURITY_STATE_UNCONFIRMED",
            );
        }
    };
    if target
        .as_ref()
        .is_some_and(|target| policy.revoked.contains_key(target))
    {
        return http_api::error(axum::http::StatusCode::UNAUTHORIZED, "ACCESS_REVOKED");
    }
    request.extensions_mut().insert(security::Grant { target });
    let (parts, body) = next.run(request).await.into_parts();
    let stream = async_stream::stream! {
        use futures_util::StreamExt;
        let _permit=permit;
        let mut body=body.into_data_stream();
        while let Some(chunk)=body.next().await { yield chunk; }
    };
    HttpResponse::from_parts(parts, axum::body::Body::from_stream(stream))
}

async fn status_snapshot(state: &Runtime) -> RuntimeStatus {
    let mut status = state.status.read().await.clone();
    status.usage_degraded = Some(state.usage.degraded());
    status.usage_pending_results = Some(state.usage.pending());
    if state.usage.degraded()
        && matches!(status.state, RuntimeState::Running | RuntimeState::Degraded)
    {
        status.state = RuntimeState::Degraded;
        if status.error.is_none() {
            status.error = Some(AppError::new(ErrorCode::UsageStorageUnavailable));
        }
    }
    status
}

async fn confirm_security(state: &Runtime, expected: u32) -> AppResult<u32> {
    match state.security.confirm(expected).await {
        Ok(revision) => {
            let mut status = state.status.write().await;
            status.security_revision = Some(status.security_revision.unwrap_or(0).max(revision));
            Ok(revision)
        }
        Err(error) => {
            state.status.write().await.security_revision = None;
            Err(error)
        }
    }
}
async fn apply(state: &Runtime) {
    let directory = state.directory.clone();
    apply_with(state, async move {
        bounded_load(&state.load_slots, Duration::from_millis(1500), move || {
            load_snapshot(&directory)
        })
        .await
    })
    .await;
}

async fn bounded_load(
    slots: &Arc<tokio::sync::Semaphore>,
    budget: Duration,
    load: impl FnOnce() -> AppResult<LoadedSnapshot> + Send + 'static,
) -> AppResult<LoadedSnapshot> {
    // A timed-out OS credential call may still run. Its permit stays in the worker,
    // so later polls cannot create an unbounded queue of blocked threads.
    let permit = slots
        .clone()
        .try_acquire_owned()
        .map_err(|_| AppError::new(ErrorCode::ConfigApplyFailed))?;
    let task = tokio::task::spawn_blocking(move || {
        let _permit = permit;
        load()
    });
    tokio::time::timeout(budget, task)
        .await
        .map_err(|_| AppError::new(ErrorCode::ConfigApplyFailed))?
        .map_err(|_| AppError::new(ErrorCode::ConfigApplyFailed))?
}

async fn apply_with(
    state: &Runtime,
    load: impl std::future::Future<Output = AppResult<LoadedSnapshot>>,
) {
    // Serialize the entire read/credential-validation/commit, including failed loads.
    let _apply = state.apply_guard.lock().await;
    if state.shutdown.is_cancelled()
        || matches!(state.status.read().await.state, RuntimeState::Stopping)
    {
        return;
    }
    let loaded = load.await.and_then(|loaded| {
        if loaded.1.gateway.port != state.configured_port {
            Err(AppError::new(ErrorCode::RestartRequired))
        } else {
            Ok(loaded)
        }
    });
    let mut status = state.status.write().await;
    if state.shutdown.is_cancelled() || matches!(status.state, RuntimeState::Stopping) {
        return;
    }
    match loaded {
        Ok((revision, snapshot, access_token, provider_tokens)) => {
            if status
                .effective_revision
                .is_some_and(|current| revision < current)
            {
                return;
            }
            if status.effective_revision != Some(revision) {
                state.health.reconcile(&snapshot);
            }
            if status.effective_revision != Some(revision) || status.error.is_some() {
                let _ = tagma_core::diagnostics::record(
                    &state.directory,
                    tagma_core::diagnostics::Component::Gateway,
                    tagma_core::diagnostics::Event::ApplySucceeded,
                    None,
                    Some(revision),
                );
            }
            *state.snapshot.write().await = (revision, snapshot, access_token, provider_tokens);
            status.effective_revision = Some(revision);
            status.state = RuntimeState::Running;
            status.error = None;
        }
        Err(error) => {
            if status.error.as_ref() != Some(&error) {
                let _ = tagma_core::diagnostics::record(
                    &state.directory,
                    tagma_core::diagnostics::Component::Gateway,
                    tagma_core::diagnostics::Event::ApplyFailed,
                    Some(error.code.clone()),
                    None,
                );
            }
            status.state = RuntimeState::Degraded;
            status.error = Some(error);
        }
    }
}

#[cfg(test)]
mod apply_tests {
    use super::*;
    pub(super) fn state() -> Arc<Runtime> {
        let fixture = tempfile::Builder::new()
            .prefix("tagma-gateway-unit-")
            .tempdir()
            .unwrap();
        Arc::new(Runtime {
            usage: usage::Ledger::open(fixture.path()).unwrap(),
            security: security::Gate::new(fixture.path().to_owned(), CancellationToken::new()),
            catalog_jobs: Arc::new(catalog::Jobs::default()),
            catalog_slots: Arc::new(tokio::sync::Semaphore::new(2)),
            catalog_client: tagma_runtime::catalog::client().unwrap(),
            directory: fixture.path().to_owned(),
            manifest: Manifest {
                protocol_version: 1,
                product_version: PRODUCT_VERSION.into(),
                schema_version: SCHEMA_VERSION,
                config_id: "test".into(),
                instance_id: "test".into(),
                endpoint: "test".into(),
                port: 1,
                console_attached: false,
            },
            status: RwLock::new(RuntimeStatus {
                usage_degraded: None,
                usage_pending_results: None,
                security_revision: None,
                state: RuntimeState::Running,
                instance_id: Some("test".into()),
                effective_revision: Some(0),
                address: None,
                owned: false,
                error: None,
            }),
            snapshot: RwLock::new((0, Default::default(), None, Default::default())),
            configured_port: 9168,
            token: zeroize::Zeroizing::new(String::new()),
            shutdown: CancellationToken::new(),
            apply_guard: tokio::sync::Mutex::new(()),
            load_slots: Arc::new(tokio::sync::Semaphore::new(1)),
            client: http_api::client().unwrap(),
            request_slots: Arc::new(tokio::sync::Semaphore::new(8)),
            health: health::Tracker::new(fixture.path().to_owned(), CancellationToken::new()),
            _fixture: Some(fixture),
        })
    }
    async fn delayed_old(old: AppResult<LoadedSnapshot>) -> Arc<Runtime> {
        let state = state();
        let (started_tx, started_rx) = tokio::sync::oneshot::channel();
        let (release_tx, release_rx) = tokio::sync::oneshot::channel();
        let older = {
            let state = state.clone();
            tokio::spawn(async move {
                apply_with(&state, async move {
                    let _ = started_tx.send(());
                    release_rx.await.unwrap();
                    old
                })
                .await;
            })
        };
        started_rx.await.unwrap();
        let (new_started_tx, new_started_rx) = tokio::sync::oneshot::channel();
        let newer = {
            let state = state.clone();
            tokio::spawn(async move {
                let _ = new_started_tx.send(());
                apply_with(&state, async {
                    Ok((2, Default::default(), None, Default::default()))
                })
                .await;
            })
        };
        new_started_rx.await.unwrap();
        release_tx.send(()).unwrap();
        older.await.unwrap();
        newer.await.unwrap();
        state
    }
    #[tokio::test]
    async fn delayed_old_success_never_regresses_effective_revision() {
        let state = delayed_old(Ok((1, Default::default(), None, Default::default()))).await;
        assert_eq!(state.status.read().await.effective_revision, Some(2));
        assert_eq!(state.snapshot.read().await.0, 2);
    }
    #[tokio::test]
    async fn delayed_old_failure_never_overwrites_new_success() {
        let state = delayed_old(Err(AppError::new(ErrorCode::CredentialStoreUnavailable))).await;
        assert!(matches!(
            state.status.read().await.state,
            RuntimeState::Running
        ));
        assert!(state.status.read().await.error.is_none());
    }
    #[tokio::test]
    async fn pending_apply_cannot_resurrect_stopping_runtime() {
        let state = state();
        let (ready_tx, ready_rx) = tokio::sync::oneshot::channel();
        let (release_tx, release_rx) = tokio::sync::oneshot::channel();
        let task = {
            let state = state.clone();
            tokio::spawn(async move {
                apply_with(&state, async {
                    let _ = ready_tx.send(());
                    release_rx.await.unwrap();
                    Ok((1, Default::default(), None, Default::default()))
                })
                .await;
            })
        };
        ready_rx.await.unwrap();
        state.status.write().await.state = RuntimeState::Stopping;
        state.shutdown.cancel();
        release_tx.send(()).unwrap();
        task.await.unwrap();
        assert!(matches!(
            state.status.read().await.state,
            RuntimeState::Stopping
        ));
        assert_eq!(state.status.read().await.effective_revision, Some(0));
    }
    #[tokio::test]
    async fn timed_out_credential_load_keeps_one_worker_limit() {
        let slots = Arc::new(tokio::sync::Semaphore::new(1));
        let (release_tx, release_rx) = std::sync::mpsc::channel();
        let (started_tx, started_rx) = tokio::sync::oneshot::channel();
        let first = {
            let slots = slots.clone();
            tokio::spawn(async move {
                bounded_load(&slots, Duration::from_millis(20), move || {
                    let _ = started_tx.send(());
                    release_rx.recv().unwrap();
                    Ok((1, Default::default(), None, Default::default()))
                })
                .await
            })
        };
        started_rx.await.unwrap();
        assert_eq!(
            first.await.unwrap().err().unwrap().code,
            ErrorCode::ConfigApplyFailed
        );
        let second_called = Arc::new(std::sync::atomic::AtomicBool::new(false));
        let observed = second_called.clone();
        assert_eq!(
            bounded_load(&slots, Duration::from_millis(20), move || {
                observed.store(true, std::sync::atomic::Ordering::SeqCst);
                Ok((2, Default::default(), None, Default::default()))
            })
            .await
            .err()
            .unwrap()
            .code,
            ErrorCode::ConfigApplyFailed
        );
        assert!(!second_called.load(std::sync::atomic::Ordering::SeqCst));
        release_tx.send(()).unwrap();
        tokio::time::timeout(Duration::from_secs(1), async {
            while slots.available_permits() == 0 {
                tokio::task::yield_now().await;
            }
        })
        .await
        .unwrap();
    }
}
