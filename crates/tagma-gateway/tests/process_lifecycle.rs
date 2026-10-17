use std::{path::Path, sync::Arc, time::Duration};
use tagma_core::{credentials::SystemCredentials, *};
use tagma_runtime::{
    GatewayManager,
    ipc::{self, Bootstrap, Command},
};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    process::{Child, Command as Process},
};

fn free_port() -> u16 {
    std::net::TcpListener::bind("127.0.0.1:0")
        .unwrap()
        .local_addr()
        .unwrap()
        .port()
}
fn manager(path: &Path) -> GatewayManager {
    GatewayManager::new(path, Path::new(env!("CARGO_BIN_EXE_tagma-gateway")))
}
fn initialize(path: &Path) -> ConfigService {
    ConfigService::open(path, Arc::new(SystemCredentials)).unwrap()
}

#[tokio::test]
#[ignore = "Requires explicitly supplied retained dev.3 executable; no binary download or key access"]
async fn real_old_binary_is_not_stopped_or_migrated_by_new_entrypoint() {
    let old = std::env::var_os("TAGMA_OLD_GATEWAY").expect("retained dev.3 executable");
    let old_version = std::env::var("TAGMA_OLD_GATEWAY_VERSION").unwrap_or("0.2.0-dev.3".into());
    let old_schema: u32 = std::env::var("TAGMA_OLD_GATEWAY_SCHEMA")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(1);
    let temp = tempfile::tempdir().unwrap();
    let db = rusqlite::Connection::open(temp.path().join("config.sqlite3")).unwrap();
    db.execute_batch("PRAGMA application_id=1413564237;CREATE TABLE revisions(revision INTEGER PRIMARY KEY,snapshot TEXT NOT NULL);CREATE TABLE config_head(singleton INTEGER PRIMARY KEY,revision INTEGER NOT NULL);CREATE TABLE credential_journal(operation_id TEXT PRIMARY KEY,credential_ref TEXT NOT NULL UNIQUE);INSERT INTO revisions VALUES(0,'{\"providers\":[]}');INSERT INTO config_head VALUES(1,0);PRAGMA user_version=1;").unwrap();
    if old_schema == 2 {
        db.execute_batch("CREATE TABLE config_metadata(singleton INTEGER PRIMARY KEY CHECK(singleton=1),config_uuid TEXT NOT NULL);INSERT INTO config_metadata VALUES(1,'00000000-0000-4000-8000-000000000001');PRAGMA user_version=2;").unwrap();
    }
    drop(db);
    std::fs::File::create(temp.path().join("maintenance.lock")).unwrap();
    let mut child = Process::new(old)
        .arg("--config-dir")
        .arg(temp.path())
        .arg("--port")
        .arg(free_port().to_string())
        .arg("--managed")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .kill_on_drop(true)
        .spawn()
        .unwrap();
    let mut pipe = child.stdin.take().unwrap();
    let mut bootstrap = serde_json::to_vec(&Bootstrap {
        owner_token: uuid::Uuid::new_v4().to_string(),
        instance_id: uuid::Uuid::new_v4().to_string(),
    })
    .unwrap();
    bootstrap.push(b'\n');
    pipe.write_all(&bootstrap).await.unwrap();
    wait_until(async || {
        if let Some(exit) = child.try_wait().unwrap() {
            panic!(
                "old fixture exited {exit}; typed log: {}",
                std::fs::read_to_string(temp.path().join("logs/tagma.0.jsonl")).unwrap_or_default()
            );
        }
        std::fs::read(temp.path().join("runtime.json"))
            .ok()
            .and_then(|b| serde_json::from_slice::<serde_json::Value>(&b).ok())
            .is_some_and(|m| m["product_version"] == old_version)
    })
    .await;
    assert_eq!(
        manager(temp.path())
            .start(free_port())
            .await
            .unwrap_err()
            .code,
        ErrorCode::IncompatibleVersion
    );
    assert_eq!(
        ConfigService::open(temp.path(), Arc::new(SystemCredentials))
            .err()
            .unwrap()
            .code,
        ErrorCode::MaintenanceInProgress
    );
    assert!(child.try_wait().unwrap().is_none());
    assert!(!temp.path().join("config-migration.json").exists());
    drop(pipe);
    assert!(
        tokio::time::timeout(Duration::from_secs(5), child.wait())
            .await
            .unwrap()
            .unwrap()
            .success()
    );
    let config = initialize(temp.path());
    assert_eq!(config.view().unwrap().schema_version, SCHEMA_VERSION);
    assert_eq!(config.view().unwrap().desired_revision, 0);
    // An old executable must reject the new schema before changing a revision.
    let mut stale = Process::new(std::env::var_os("TAGMA_OLD_GATEWAY").unwrap())
        .arg("--config-dir")
        .arg(temp.path())
        .arg("--port")
        .arg(free_port().to_string())
        .arg("--managed")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .kill_on_drop(true)
        .spawn()
        .unwrap();
    stale
        .stdin
        .as_mut()
        .unwrap()
        .write_all(&bootstrap)
        .await
        .unwrap();
    assert_eq!(
        tokio::time::timeout(Duration::from_secs(5), stale.wait())
            .await
            .unwrap()
            .unwrap()
            .code(),
        Some(13)
    );
    assert_eq!(config.view().unwrap().desired_revision, 0);
    let current = manager(temp.path());
    assert_eq!(
        current.start(free_port()).await.unwrap().effective_revision,
        Some(0)
    );
    current.stop().await.unwrap();
}
async fn wait_until(mut check: impl AsyncFnMut() -> bool) {
    tokio::time::timeout(Duration::from_secs(5), async {
        loop {
            if check().await {
                break;
            }
            tokio::time::sleep(Duration::from_millis(30)).await;
        }
    })
    .await
    .expect("bounded gateway condition");
}

async fn http(port: u16, authorization: Option<&str>) -> u16 {
    let mut stream = tokio::net::TcpStream::connect((std::net::Ipv4Addr::LOCALHOST, port))
        .await
        .unwrap();
    let header = authorization
        .map(|v| format!("Authorization: {v}\r\n"))
        .unwrap_or_default();
    stream
        .write_all(
            format!(
                "GET /v1/models HTTP/1.1\r\nHost: localhost\r\n{header}Connection: close\r\n\r\n"
            )
            .as_bytes(),
        )
        .await
        .unwrap();
    let mut response = String::new();
    tokio::time::timeout(Duration::from_secs(2), stream.read_to_string(&mut response))
        .await
        .unwrap()
        .unwrap();
    response.split_whitespace().nth(1).unwrap().parse().unwrap()
}

#[tokio::test]
async fn auth_missing_token_denies_by_default_and_port_changes_require_explicit_restart() {
    let temp = tempfile::tempdir().unwrap();
    let config = initialize(temp.path());
    let manager = manager(temp.path());
    let port = free_port();
    manager.start(port).await.unwrap();
    assert_eq!(http(port, None).await, 401);
    assert_eq!(http(port, Some("Bearer incorrect")).await, 401);
    config
        .save_gateway(SaveGateway {
            protocol_version: 1,
            expected_revision: 0,
            port: 9168,
            auth_enabled: false,
        })
        .unwrap();
    manager.apply().await.unwrap();
    assert_eq!(
        http(port, None).await,
        503,
        "Compatibility mode still has no inference endpoints"
    );
    config
        .save_gateway(SaveGateway {
            protocol_version: 1,
            expected_revision: 1,
            port: 19168,
            auth_enabled: true,
        })
        .unwrap();
    let old = manager.apply().await.unwrap();
    assert_eq!(old.effective_revision, Some(1));
    assert_eq!(old.error.unwrap().code, ErrorCode::RestartRequired);
    assert!(old.address.unwrap().contains(&port.to_string()));
    assert_eq!(
        http(port, None).await,
        503,
        "Unapplied settings must not be reported effective"
    );
    manager.stop().await.unwrap();
    let new_port = free_port();
    let new = manager.start(new_port).await.unwrap();
    assert_eq!(new.effective_revision, Some(2));
    assert_eq!(http(new_port, None).await, 401);
    manager.stop().await.unwrap();
}

#[tokio::test]
#[ignore = "Explicit synthetic OS credential + actual HTTP integration, exact created reference cleaned"]
async fn system_token_authenticates_only_data_plane_and_never_appears_in_configuration_files() {
    let temp = tempfile::tempdir().unwrap();
    let config = initialize(temp.path());
    config
        .initialize_gateway_token(RevisionInput {
            protocol_version: 1,
            expected_revision: 0,
        })
        .unwrap();
    struct Cleanup(String);
    impl Drop for Cleanup {
        fn drop(&mut self) {
            let _ = tagma_core::credentials::CredentialStore::delete(&SystemCredentials, &self.0);
        }
    }
    let cleanup = Cleanup(
        config
            .read_snapshot()
            .unwrap()
            .1
            .gateway
            .credential_ref
            .unwrap(),
    );
    let token = config.reveal_gateway_token(1).unwrap();
    let manager = manager(temp.path());
    let port = free_port();
    manager.start(port).await.unwrap();
    assert_eq!(http(port, None).await, 401);
    assert_eq!(http(port, Some("Bearer incorrect")).await, 401);
    assert_eq!(
        http(port, Some(&format!("Bearer {}", token.as_str()))).await,
        503
    );
    let manifest = ipc::read_manifest(temp.path()).unwrap();
    let denied = ipc::call(
        &manifest,
        Command::Stop {
            owner_token: token.to_string(),
        },
    )
    .await
    .unwrap();
    assert_eq!(denied.error.unwrap().code, ErrorCode::OwnershipRequired);
    manager.stop().await.unwrap();
    for path in [
        "config.sqlite3",
        "config.sqlite3-wal",
        "runtime.json",
        "logs/tagma.0.jsonl",
    ] {
        if let Ok(bytes) = std::fs::read(temp.path().join(path)) {
            assert!(
                !bytes
                    .windows(token.len())
                    .any(|window| window == token.as_bytes())
            );
        }
    }
    tagma_core::credentials::CredentialStore::delete(&SystemCredentials, &cleanup.0).unwrap();
    assert_eq!(
        manager.start(free_port()).await.unwrap_err().code,
        ErrorCode::CredentialStoreUnavailable
    );
    assert_eq!(config.view().unwrap().desired_revision, 1);
    assert!(config.view().unwrap().gateway.has_access_token);
}

#[tokio::test]
async fn managed_ready_apply_reconcile_wrong_owner_and_graceful_stop() {
    let temp = tempfile::tempdir().unwrap();
    let config = initialize(temp.path());
    let manager = manager(temp.path());
    let port = free_port();
    let ready = manager.start(port).await.unwrap();
    assert!(ready.owned);
    assert!(matches!(ready.state, RuntimeState::Running));
    assert_eq!(ready.effective_revision, Some(0));
    let manifest = ipc::read_manifest(temp.path()).unwrap();
    assert!(
        !manifest.console_attached,
        "gateway GUI subsystem must not allocate a console even when stdin is inherited"
    );
    let denied = ipc::call(
        &manifest,
        Command::Stop {
            owner_token: uuid::Uuid::new_v4().to_string(),
        },
    )
    .await
    .unwrap();
    assert_eq!(denied.error.unwrap().code, ErrorCode::OwnershipRequired);
    let mut incompatible = manifest.clone();
    incompatible.product_version = "wrong-version".into();
    assert_eq!(
        ipc::call(&incompatible, Command::Status)
            .await
            .unwrap_err()
            .code,
        ErrorCode::IncompatibleVersion
    );
    config
        .save_provider(SaveProvider {
            protocol_version: 1,
            expected_revision: 0,
            id: None,
            name: "real-process-fixture".into(),
            protocol: ProviderProtocol::OpenaiChatCompletions,
            base_url: "https://example.invalid/v1".into(),
            enabled: true,
            models: vec![],
            credential: None,
        })
        .unwrap();
    // No notification: periodic reconciliation must recover the lost apply signal.
    wait_until(async || manager.status().await.effective_revision == Some(1)).await;
    let attached = super_manager(temp.path());
    let status = attached.start(port).await.unwrap();
    assert!(!status.owned);
    assert_eq!(status.instance_id, ready.instance_id);
    assert_eq!(
        attached.stop().await.unwrap_err().code,
        ErrorCode::OwnershipRequired
    );
    manager.stop().await.unwrap();
    assert!(std::net::TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, port)).is_ok());
    assert!(!temp.path().join("runtime.json").exists());
}
fn super_manager(path: &Path) -> GatewayManager {
    manager(path)
}

#[tokio::test]
async fn port_conflict_never_changes_port_or_kills_existing_listener() {
    let temp = tempfile::tempdir().unwrap();
    let _config = initialize(temp.path());
    let manager = manager(temp.path());
    let foreign = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let port = foreign.local_addr().unwrap().port();
    assert_eq!(
        manager.start(port).await.unwrap_err().code,
        ErrorCode::PortInUse
    );
    assert!(std::net::TcpStream::connect((std::net::Ipv4Addr::LOCALHOST, port)).is_ok());
    assert!(!temp.path().join("runtime.json").exists());
}

async fn raw_start(path: &Path, managed: bool) -> (Child, ipc::Manifest, String) {
    let token = uuid::Uuid::new_v4().to_string();
    let instance_id = uuid::Uuid::new_v4().to_string();
    let mut process = Process::new(env!("CARGO_BIN_EXE_tagma-gateway"));
    process
        .arg("--config-dir")
        .arg(path)
        .arg("--port")
        .arg(free_port().to_string())
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .kill_on_drop(true);
    if managed {
        process.arg("--managed");
    }
    let mut child = process.spawn().unwrap();
    let mut pipe = child.stdin.take().unwrap();
    let mut data = serde_json::to_vec(&Bootstrap {
        owner_token: token.clone(),
        instance_id,
    })
    .unwrap();
    data.push(b'\n');
    pipe.write_all(&data).await.unwrap();
    let manifest = tokio::time::timeout(Duration::from_secs(5), async {
        loop {
            if let Ok(m) = ipc::read_manifest(path)
                && ipc::call(&m, Command::Status).await.is_ok()
            {
                break m;
            }
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
    })
    .await
    .unwrap();
    // Simulates the owning shell dying: the inherited lifetime pipe is closed.
    drop(pipe);
    (child, manifest, token)
}

#[tokio::test]
async fn parent_eof_exits_managed_process_but_standalone_survives() {
    let managed = tempfile::tempdir().unwrap();
    let _config = initialize(managed.path());
    let (mut child, _, _) = raw_start(managed.path(), true).await;
    assert!(
        tokio::time::timeout(Duration::from_secs(5), child.wait())
            .await
            .unwrap()
            .unwrap()
            .success()
    );
    assert!(!managed.path().join("runtime.json").exists());
    let independent = tempfile::tempdir().unwrap();
    let _config2 = initialize(independent.path());
    let (mut child, manifest, token) = raw_start(independent.path(), false).await;
    assert!(ipc::call(&manifest, Command::Status).await.is_ok());
    ipc::call(&manifest, Command::Stop { owner_token: token })
        .await
        .unwrap();
    assert!(
        tokio::time::timeout(Duration::from_secs(5), child.wait())
            .await
            .unwrap()
            .unwrap()
            .success()
    );
}

#[tokio::test]
async fn concurrent_start_has_one_instance_and_one_owner() {
    let temp = tempfile::tempdir().unwrap();
    let _config = initialize(temp.path());
    let a = manager(temp.path());
    let b = manager(temp.path());
    let port = free_port();
    let (a_started, b_started) = tokio::join!(a.start(port), b.start(port));
    assert!(a_started.is_ok() || b_started.is_ok());
    let a_status = a.status().await;
    let b_status = b.status().await;
    assert_eq!(a_status.instance_id, b_status.instance_id);
    assert_ne!(a_status.owned, b_status.owned);
    if a_status.owned {
        a.stop().await.unwrap();
    } else {
        b.stop().await.unwrap();
    }
}

#[tokio::test]
async fn oversized_private_frame_is_dropped_without_crashing_gateway() {
    use interprocess::local_socket::{
        GenericNamespaced,
        tokio::{Stream, prelude::*},
    };
    let temp = tempfile::tempdir().unwrap();
    let _config = initialize(temp.path());
    let manager = manager(temp.path());
    manager.start(free_port()).await.unwrap();
    let manifest = ipc::read_manifest(temp.path()).unwrap();
    #[cfg(windows)]
    let name = manifest
        .endpoint
        .as_str()
        .to_ns_name::<GenericNamespaced>()
        .unwrap();
    #[cfg(unix)]
    let name = manifest
        .endpoint
        .as_str()
        .to_fs_name::<interprocess::local_socket::GenericFilePath>()
        .unwrap();
    let mut stream = Stream::connect(name).await.unwrap();
    stream.write_u32(ipc::MAX_FRAME as u32 + 1).await.unwrap();
    drop(stream);
    assert!(ipc::call(&manifest, Command::Status).await.is_ok());
    manager.stop().await.unwrap();
}

#[tokio::test]
async fn stale_old_version_manifest_does_not_block_start_without_an_active_lock() {
    let temp = tempfile::tempdir().unwrap();
    let _config = initialize(temp.path());
    let manager = manager(temp.path());
    manager.start(free_port()).await.unwrap();
    let mut stale = ipc::read_manifest(temp.path()).unwrap();
    manager.stop().await.unwrap();
    stale.product_version = "old-version".into();
    std::fs::write(
        temp.path().join("runtime.json"),
        serde_json::to_vec(&stale).unwrap(),
    )
    .unwrap();
    assert!(matches!(
        manager.status().await.state,
        RuntimeState::Stopped
    ));
    assert!(manager.start(free_port()).await.unwrap().owned);
    manager.stop().await.unwrap();
}

#[tokio::test]
async fn active_older_version_envelope_is_reported_without_spawn_or_stop() {
    let temp = tempfile::tempdir().unwrap();
    let _config = initialize(temp.path());
    let manager = manager(temp.path());
    manager.start(free_port()).await.unwrap();
    let original = std::fs::read(temp.path().join("runtime.json")).unwrap();
    let mut older: serde_json::Value = serde_json::from_slice(&original).unwrap();
    older["product_version"] = "old-product".into();
    older.as_object_mut().unwrap().remove("console_attached");
    std::fs::write(
        temp.path().join("runtime.json"),
        serde_json::to_vec(&older).unwrap(),
    )
    .unwrap();
    let other = super_manager(temp.path());
    assert_eq!(
        other.start(free_port()).await.unwrap_err().code,
        ErrorCode::IncompatibleVersion
    );
    assert_eq!(
        other.status().await.error.unwrap().code,
        ErrorCode::IncompatibleVersion
    );
    assert!(manager.owned_process_id().await.is_some());
    std::fs::write(temp.path().join("runtime.json"), original).unwrap();
    manager.stop().await.unwrap();
}

#[cfg(windows)]
#[tokio::test]
async fn managed_crashes_restart_at_most_three_times_then_remain_failed() {
    let temp = tempfile::tempdir().unwrap();
    let _config = initialize(temp.path());
    let manager = manager(temp.path());
    manager.start(free_port()).await.unwrap();
    for attempt in 0..4 {
        let pid = manager
            .owned_process_id()
            .await
            .expect("only owned child may be terminated by this fixture");
        let result = Process::new("taskkill.exe")
            .args(["/PID", &pid.to_string(), "/F"])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .await
            .unwrap();
        assert!(result.success());
        wait_until(async || matches!(manager.status().await.state, RuntimeState::Failed)).await;
        if attempt < 3 {
            tokio::time::timeout(Duration::from_secs(7), async {
                loop {
                    manager.supervise().await;
                    if matches!(manager.status().await.state, RuntimeState::Running) {
                        break;
                    }
                    tokio::time::sleep(Duration::from_millis(50)).await;
                }
            })
            .await
            .expect("bounded automatic restart");
            assert!(
                !ipc::read_manifest(temp.path()).unwrap().console_attached,
                "automatic restart must remain console-free"
            );
        } else {
            for _ in 0..3 {
                manager.supervise().await;
            }
            assert!(manager.owned_process_id().await.is_none());
            assert!(matches!(manager.status().await.state, RuntimeState::Failed));
        }
    }
}
