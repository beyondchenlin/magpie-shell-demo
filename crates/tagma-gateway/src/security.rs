//! Fresh durable policy before dispatch, plus instance-bound acknowledgement/cancellation.
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{
        Arc, Mutex,
        atomic::{AtomicU32, AtomicU64, Ordering},
    },
    time::Duration,
};
use tagma_core::{security::SecuritySnapshot, *};
use tokio_util::sync::CancellationToken;
#[derive(Clone)]
pub struct Grant {
    pub target: Option<String>,
}
struct Active {
    targets: Vec<String>,
    cancel: CancellationToken,
}
pub struct Gate {
    dispatch: Arc<tokio::sync::Mutex<()>>,
    #[cfg(test)]
    dispatch_hook: Mutex<Option<Arc<DispatchHook>>>,
    directory: PathBuf,
    slots: Arc<tokio::sync::Semaphore>,
    active: Mutex<HashMap<String, Active>>,
    epoch: AtomicU64,
    confirmed: AtomicU32,
    shutdown: CancellationToken,
}
pub struct Run {
    id: String,
    gate: Arc<Gate>,
    pub cancel: CancellationToken,
    pub token_target: Option<String>,
}
impl Drop for Run {
    fn drop(&mut self) {
        if let Ok(mut active) = self.gate.active.lock() {
            active.remove(&self.id);
        }
    }
}
fn unknown() -> AppError {
    AppError::new(ErrorCode::SecurityStateUnconfirmed)
}
impl Gate {
    pub fn new(directory: PathBuf, shutdown: CancellationToken) -> Arc<Self> {
        Arc::new(Self {
            dispatch: Arc::new(tokio::sync::Mutex::new(())),
            #[cfg(test)]
            dispatch_hook: Mutex::new(None),
            directory,
            shutdown,
            slots: Arc::new(tokio::sync::Semaphore::new(2)),
            active: Mutex::new(HashMap::new()),
            epoch: AtomicU64::new(0),
            confirmed: AtomicU32::new(0),
        })
    }
    pub async fn read(&self, targets: Vec<String>) -> AppResult<SecuritySnapshot> {
        let epoch = self.epoch.load(Ordering::SeqCst);
        let permit = tokio::time::timeout(
            Duration::from_millis(250),
            self.slots.clone().acquire_owned(),
        )
        .await
        .map_err(|_| unknown())?
        .map_err(|_| unknown())?;
        let directory = self.directory.clone();
        let task = tokio::task::spawn_blocking(move || {
            let _permit = permit;
            ConfigService::read_runtime_security(&directory, &targets)
        });
        let result = tokio::time::timeout(Duration::from_millis(500), task)
            .await
            .map_err(|_| unknown())?
            .map_err(|_| unknown())?
            .map_err(|_| unknown())?;
        if epoch != self.epoch.load(Ordering::SeqCst)
            || result.revision < self.confirmed.load(Ordering::SeqCst)
        {
            return Err(unknown());
        }
        Ok(result)
    }
    pub fn register(
        self: &Arc<Self>,
        token_target: Option<String>,
        provider_targets: Vec<String>,
        cancel: Option<CancellationToken>,
    ) -> AppResult<Arc<Run>> {
        let id = uuid::Uuid::new_v4().to_string();
        if self.shutdown.is_cancelled() {
            return Err(AppError::new(ErrorCode::GatewayUnavailable));
        }
        let cancel = cancel.unwrap_or_default();
        let mut targets = provider_targets;
        targets.extend(token_target.iter().cloned());
        let mut active = self.active.lock().map_err(|_| unknown())?;
        if active.len() >= 16 {
            return Err(AppError::new(ErrorCode::ProbeBusy));
        }
        active.insert(
            id.clone(),
            Active {
                targets,
                cancel: cancel.clone(),
            },
        );
        Ok(Arc::new(Run {
            id,
            gate: self.clone(),
            cancel,
            token_target,
        }))
    }
    pub async fn confirm(&self, expected: u32) -> AppResult<u32> {
        // No confirmation may overtake a request's admission and first send poll.
        let _dispatch = self.dispatch.lock().await;
        // Registration always precedes the first policy read. Any request that can
        // have observed policy before this persisted revocation is already included.
        let targets: Vec<_> = self
            .active
            .lock()
            .map_err(|_| unknown())?
            .values()
            .flat_map(|a| a.targets.iter().cloned())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();
        let policy = self.read(targets).await?;
        if policy.revision < expected {
            return Err(unknown());
        }
        let active = self.active.lock().map_err(|_| unknown())?;
        for item in active.values() {
            if item
                .targets
                .iter()
                .any(|target| policy.revoked.get(target) == Some(&true))
            {
                item.cancel.cancel();
            }
        }
        if policy.revision > self.confirmed.fetch_max(policy.revision, Ordering::SeqCst) {
            self.epoch.fetch_add(1, Ordering::SeqCst);
        }
        Ok(self.confirmed.load(Ordering::SeqCst))
    }
}
impl Run {
    #[cfg(test)]
    pub async fn before_dispatch(&self, model: &str, inside: bool) {
        let hook = self.gate.dispatch_hook.lock().unwrap().clone();
        if let Some(hook) = hook.filter(|hook| hook.model == model && hook.inside == inside) {
            hook.entered.notify_one();
            hook.release.notified().await;
        }
    }
    pub async fn admit_dispatch(
        &self,
        provider_target: &str,
    ) -> AppResult<tokio::sync::OwnedMutexGuard<()>> {
        let guard = self.gate.dispatch.clone().lock_owned().await;
        // Unlike speculative recipe checks, this read and the first send poll
        // share one critical section with confirmation.
        self.check(provider_target).await?;
        Ok(guard)
    }
    pub async fn check_all(&self) -> AppResult<()> {
        if self.cancel.is_cancelled() {
            return Err(AppError::new(ErrorCode::AccessRevoked));
        }
        let targets = self
            .gate
            .active
            .lock()
            .map_err(|_| unknown())?
            .get(&self.id)
            .ok_or_else(unknown)?
            .targets
            .clone();
        if !self.gate.read(targets).await?.revoked.is_empty() {
            return Err(AppError::new(ErrorCode::AccessRevoked));
        }
        Ok(())
    }
    pub async fn check(&self, provider_target: &str) -> AppResult<()> {
        if self.cancel.is_cancelled() {
            return Err(AppError::new(ErrorCode::AccessRevoked));
        }
        let mut targets = vec![provider_target.to_owned()];
        targets.extend(self.token_target.iter().cloned());
        let policy = self.gate.read(targets).await?;
        if policy.revoked.contains_key(provider_target)
            || self
                .token_target
                .as_ref()
                .is_some_and(|target| policy.revoked.contains_key(target))
        {
            return Err(AppError::new(ErrorCode::AccessRevoked));
        }
        Ok(())
    }
}

#[cfg(test)]
struct DispatchHook {
    inside: bool,
    model: String,
    entered: tokio::sync::Notify,
    release: tokio::sync::Notify,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{authorize, confirm_security, http_api};
    use axum::{
        Router,
        body::{Body, Bytes},
        extract::Request,
        middleware,
        response::IntoResponse,
        routing::post,
    };
    use futures_util::{FutureExt, StreamExt};
    use std::sync::atomic::{AtomicBool, AtomicUsize};
    use tagma_core::{credentials::CredentialStore, security::*};
    #[derive(Default)]
    struct Memory(Mutex<HashMap<String, String>>);
    impl CredentialStore for Memory {
        fn set(&self, id: &str, value: &str) -> AppResult<()> {
            self.0.lock().unwrap().insert(id.into(), value.into());
            Ok(())
        }
        fn get(&self, id: &str) -> AppResult<zeroize::Zeroizing<String>> {
            self.0
                .lock()
                .unwrap()
                .get(id)
                .cloned()
                .map(zeroize::Zeroizing::new)
                .ok_or_else(|| AppError::new(ErrorCode::CredentialStoreUnavailable))
        }
        fn delete(&self, id: &str) -> AppResult<()> {
            self.0.lock().unwrap().remove(id);
            Ok(())
        }
    }
    struct Server(tokio::task::JoinHandle<()>);
    impl Drop for Server {
        fn drop(&mut self) {
            self.0.abort();
        }
    }
    struct Dropped(Arc<AtomicBool>);
    impl Drop for Dropped {
        fn drop(&mut self) {
            self.0.store(true, Ordering::SeqCst);
        }
    }
    #[tokio::test]
    async fn sup007_confirmed_revoke_cannot_overtake_an_unstarted_dispatch() {
        use tagma_core::teams::*;
        let mut results = Vec::new();
        for (sequential, inside, token_scope) in [
            (false, false, false),
            (true, false, false),
            (false, true, false),
            (false, false, true),
            (true, false, true),
        ] {
            let mut state = crate::apply_tests::state();
            let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
            let port = listener.local_addr().unwrap().port();
            {
                let state = Arc::get_mut(&mut state).unwrap();
                state.manifest.port = port;
                state.configured_port = port;
                state.security = Gate::new(state.directory.clone(), state.shutdown.clone());
            }
            let config =
                ConfigService::open(&state.directory, Arc::new(Memory::default())).unwrap();
            config
                .save_gateway(SaveGateway {
                    protocol_version: 1,
                    expected_revision: 0,
                    port,
                    auth_enabled: token_scope,
                })
                .unwrap();
            let token = if token_scope {
                config
                    .initialize_gateway_token(RevisionInput {
                        protocol_version: 1,
                        expected_revision: config.view().unwrap().desired_revision,
                    })
                    .unwrap();
                Some(config.reveal_gateway_token(1).unwrap().to_string())
            } else {
                None
            };
            let calls = Arc::new(Mutex::new(HashMap::<String, usize>::new()));
            let upstream=Router::new().fallback(post({let calls=calls.clone();move|request:Request|{let calls=calls.clone();async move{let input:serde_json::Value=serde_json::from_slice(&axum::body::to_bytes(request.into_body(),128*1024).await.unwrap()).unwrap();let model=input["model"].as_str().unwrap().to_owned();*calls.lock().unwrap().entry(model.clone()).or_default()+=1;axum::Json(serde_json::json!({"model":model,"choices":[{"index":0,"message":{"role":"assistant","content":"normal completed output"},"finish_reason":"stop"}]}))}}}));
            let upstream_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
            let upstream_port = upstream_listener.local_addr().unwrap().port();
            let upstream = Server(tokio::spawn(async move {
                axum::serve(upstream_listener, upstream).await.unwrap()
            }));
            let provider = config
                .save_provider(SaveProvider {
                    protocol_version: 1,
                    expected_revision: config.view().unwrap().desired_revision,
                    id: None,
                    name: "SUP007".into(),
                    protocol: ProviderProtocol::OpenaiChatCompletions,
                    base_url: format!("http://127.0.0.1:{upstream_port}/v1"),
                    enabled: true,
                    models: vec!["first".into(), "second".into()],
                    credential: None,
                })
                .unwrap()
                .providers[0]
                .clone();
            let target_model = if sequential { "second" } else { "first" };
            let public_model = if sequential {
                let target = |model: &str| CloudTarget {
                    provider_id: provider.id.clone(),
                    model_id: model.into(),
                };
                let step = |model: &str, input, output| TeamStep {
                    target: TeamStepTarget::CloudModel {
                        target: target(model).into(),
                    },
                    input,
                    output,
                    timeout_ms: 4000,
                    failure: TeamFailurePolicy::Abort,
                    side_effect: TeamSideEffect::OutboundModelRequest,
                };
                let view = config
                    .save_team(SaveTeam {
                        protocol_version: 1,
                        expected_revision: config.view().unwrap().desired_revision,
                        id: None,
                        slug: "sup007".into(),
                        recipe: TeamRecipe {
                            display_name: "SUP007".into(),
                            brain: TeamBrain::Explicit {
                                target: target("second"),
                            },
                            routing: TeamRouting::Sequential,
                            total_timeout_ms: 8000,
                            steps: vec![
                                step(
                                    "first",
                                    TeamStepInput::OriginalMessages,
                                    TeamStepOutput::IntermediateText,
                                ),
                                step(
                                    "second",
                                    TeamStepInput::PreviousText,
                                    TeamStepOutput::FinalAnswer,
                                ),
                            ],
                        },
                    })
                    .unwrap();
                config
                    .publish_team(RevisionCommand {
                        protocol_version: 1,
                        expected_revision: config.view().unwrap().desired_revision,
                        id: view.teams[0].team.id.clone(),
                    })
                    .unwrap();
                "tagma/sup007"
            } else {
                "first"
            };
            let (revision, snapshot) = config.read_snapshot().unwrap();
            let clients = crate::provider_clients(&snapshot).unwrap();
            *state.snapshot.write().await = (
                revision,
                snapshot,
                token.clone().map(zeroize::Zeroizing::new),
                Default::default(),
                clients,
            );
            let hook = Arc::new(DispatchHook {
                inside,
                model: target_model.into(),
                entered: tokio::sync::Notify::new(),
                release: tokio::sync::Notify::new(),
            });
            *state.security.dispatch_hook.lock().unwrap() = Some(hook.clone());
            let router = http_api::router(state.clone())
                .layer(middleware::from_fn_with_state(state.clone(), authorize));
            let gateway = Server(tokio::spawn(async move {
                axum::serve(listener, router).await.unwrap()
            }));
            let client = reqwest::Client::builder()
                .no_proxy()
                .timeout(Duration::from_secs(8))
                .build()
                .unwrap();
            let pending = {
                let client = client.clone();
                tokio::spawn(async move {
                    client.post(format!("http://127.0.0.1:{port}/v1/chat/completions")).bearer_auth(token.as_deref().unwrap_or("unused")).json(&serde_json::json!({"model":public_model,"messages":[{"role":"user","content":"hold after check before send"}]})).send().await.unwrap()
                })
            };
            tokio::time::timeout(Duration::from_secs(2), hook.entered.notified())
                .await
                .unwrap();
            assert_eq!(
                calls
                    .lock()
                    .unwrap()
                    .get(target_model)
                    .copied()
                    .unwrap_or(0),
                0,
                "Hook is before the target upstream receives anything"
            );
            let receipt = config
                .revoke_access(RevokeAccess {
                    protocol_version: 1,
                    expected_revision: revision,
                    kind: if token_scope {
                        RevokeKind::GatewayToken
                    } else {
                        RevokeKind::ProviderConnection
                    },
                    provider_id: if token_scope { None } else { Some(provider.id) },
                    cancel_inflight: false,
                })
                .unwrap();
            let acknowledgement = if inside {
                assert!(
                    state.security.dispatch.try_lock().is_err(),
                    "Admitted send owns the confirmation barrier"
                );
                let started = Arc::new(tokio::sync::Notify::new());
                let state = state.clone();
                let signal = started.clone();
                let mut task = tokio::spawn(async move {
                    signal.notify_one();
                    confirm_security(&state, receipt.revision).await
                });
                started.notified().await;
                assert!(
                    tokio::time::timeout(Duration::from_millis(50), &mut task)
                        .await
                        .is_err(),
                    "Confirmation cannot overtake an admitted but unpolled send"
                );
                Some(task)
            } else {
                confirm_security(&state, receipt.revision).await.unwrap();
                None
            };
            hook.release.notify_one();
            let response = pending.await.unwrap();
            if let Some(acknowledgement) = acknowledgement {
                acknowledgement.await.unwrap().unwrap();
            }
            let status = response.status().as_u16();
            let _body = response.bytes().await.unwrap();
            let dispatched = calls
                .lock()
                .unwrap()
                .get(target_model)
                .copied()
                .unwrap_or(0);
            println!(
                "SUP-007 phase={} token_scope={token_scope} cancel_inflight=false confirmed_revision={} upstream_target_calls={dispatched} status={status}",
                if inside {
                    "admitted-first-send"
                } else if sequential {
                    "next-step"
                } else {
                    "first-step"
                },
                receipt.revision
            );
            if inside {
                let next=client.post(format!("http://127.0.0.1:{port}/v1/chat/completions")).json(&serde_json::json!({"model":"first","messages":[{"role":"user","content":"after confirmation"}]})).send().await.unwrap();
                assert_eq!(next.status(), 403);
                assert_eq!(
                    calls
                        .lock()
                        .unwrap()
                        .get(target_model)
                        .copied()
                        .unwrap_or(0),
                    1
                );
                assert_eq!(
                    (status, dispatched),
                    (200, 1),
                    "Already admitted send remains allowed when cancel=false"
                );
            } else {
                results.push((status, dispatched));
            }
            state.shutdown.cancel();
            drop(client);
            drop(gateway);
            drop(upstream);
            drop(config);
            drop(state);
            tokio::task::yield_now().await;
        }
        assert!(
            results
                .iter()
                .all(|(status, calls)| *status == 403 && *calls == 0),
            "A confirmed revoke must reject every still-unstarted dispatch: {results:?}"
        );
    }
    #[tokio::test]
    async fn real_http_token_revocation_rotation_inflight_cancel_and_storage_failure() {
        let mut state = crate::apply_tests::state();
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        {
            let state = Arc::get_mut(&mut state).unwrap();
            state.manifest.port = port;
            state.configured_port = port;
            state.security = Gate::new(state.directory.clone(), state.shutdown.clone());
        }
        let memory = Arc::new(Memory::default());
        let config = ConfigService::open(&state.directory, memory.clone()).unwrap();
        config
            .save_gateway(SaveGateway {
                protocol_version: 1,
                expected_revision: 0,
                port,
                auth_enabled: true,
            })
            .unwrap();
        config
            .initialize_gateway_token(RevisionInput {
                protocol_version: 1,
                expected_revision: 1,
            })
            .unwrap();
        let old = config.reveal_gateway_token(1).unwrap();
        let calls = Arc::new(AtomicUsize::new(0));
        let dropped = Arc::new(AtomicBool::new(false));
        let upstream=Router::new().fallback(post({let calls=calls.clone();let dropped=dropped.clone();move|request:Request|{let calls=calls.clone();let dropped=dropped.clone();async move{let _=axum::body::to_bytes(request.into_body(),128*1024).await.unwrap();calls.fetch_add(1,Ordering::SeqCst);let guard=Dropped(dropped);([( "content-type","text/event-stream")],Body::from_stream(async_stream::stream!{let _guard=guard;loop{yield Ok::<_,std::convert::Infallible>(Bytes::from_static(b"data: {\"model\":\"model\",\"choices\":[{\"index\":0,\"delta\":{\"content\":\"partial\"},\"finish_reason\":null}]}\n\n"));tokio::time::sleep(Duration::from_millis(15)).await;}})).into_response()}}}));
        let upstream_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let upstream_port = upstream_listener.local_addr().unwrap().port();
        let upstream = Server(tokio::spawn(async move {
            axum::serve(upstream_listener, upstream).await.unwrap()
        }));
        let provider = config
            .save_provider(SaveProvider {
                protocol_version: 1,
                expected_revision: 2,
                id: None,
                name: "controlled".into(),
                protocol: ProviderProtocol::OpenaiChatCompletions,
                base_url: format!("http://127.0.0.1:{upstream_port}/v1"),
                enabled: true,
                models: vec!["model".into()],
                credential: None,
            })
            .unwrap()
            .providers[0]
            .clone();
        let (revision, snapshot) = config.read_snapshot().unwrap();
        let clients = crate::provider_clients(&snapshot).unwrap();
        *state.snapshot.write().await = (
            revision,
            snapshot,
            Some(zeroize::Zeroizing::new(old.to_string())),
            Default::default(),
            clients,
        );
        state.status.write().await.security_revision = Some(0);
        let router = http_api::router(state.clone())
            .layer(middleware::from_fn_with_state(state.clone(), authorize));
        let gateway = Server(tokio::spawn(async move {
            axum::serve(listener, router).await.unwrap()
        }));
        let client = reqwest::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(8))
            .build()
            .unwrap();
        let base = format!("http://127.0.0.1:{port}/v1");
        let result=std::panic::AssertUnwindSafe(async{
            assert_eq!(client.get(format!("{base}/models")).send().await.unwrap().status(),401);
            assert_eq!(client.get(format!("{base}/models")).bearer_auth("wrong").send().await.unwrap().status(),401);
            assert_eq!(client.get(format!("{base}/models")).bearer_auth(old.as_str()).send().await.unwrap().status(),200);
            assert_eq!(client.post(format!("{base}/stop")).bearer_auth(old.as_str()).send().await.unwrap().status(),501,"Data token cannot invoke management");
            let receipt=config.revoke_access(RevokeAccess{protocol_version:1,expected_revision:3,kind:RevokeKind::GatewayToken,provider_id:None,cancel_inflight:false}).unwrap();
            assert_eq!(client.get(format!("{base}/models")).bearer_auth(old.as_str()).send().await.unwrap().status(),401,"Durable revoke overrides old effective snapshot before acknowledgement");
            config.rotate_gateway_token(RotateGatewayToken{protocol_version:1,expected_revision:3,cancel_inflight:false}).unwrap();let new=config.reveal_gateway_token(1).unwrap();
            assert_eq!(client.get(format!("{base}/models")).bearer_auth(new.as_str()).send().await.unwrap().status(),401,"Saved new token is not silently applied");
            let (revision,snapshot)=config.read_snapshot().unwrap();
            let clients=crate::provider_clients(&snapshot).unwrap();
            crate::apply_with(&state,async{Ok((revision,snapshot,Some(memory.get(config.read_snapshot().unwrap().1.gateway.credential_ref.as_ref().unwrap()).unwrap()),Default::default(),clients))}).await;
            confirm_security(&state,receipt.revision).await.unwrap();assert_eq!(state.status.read().await.security_revision,Some(receipt.revision));
            assert_eq!(client.get(format!("{base}/models")).bearer_auth(new.as_str()).send().await.unwrap().status(),200);
            assert_eq!(client.get(format!("{base}/models")).bearer_auth(old.as_str()).send().await.unwrap().status(),401);
            let response=client.post(format!("{base}/chat/completions")).bearer_auth(new.as_str()).json(&serde_json::json!({"model":"model","messages":[{"role":"user","content":"explicit synthetic stream"}],"stream":true})).send().await.unwrap();assert_eq!(response.status(),200);let mut stream=response.bytes_stream();let first=stream.next().await.unwrap().unwrap();assert!(String::from_utf8_lossy(&first).contains("partial"));
            let receipt=config.revoke_access(RevokeAccess{protocol_version:1,expected_revision:4,kind:RevokeKind::ProviderConnection,provider_id:Some(provider.id.clone()),cancel_inflight:false}).unwrap();confirm_security(&state,receipt.revision).await.unwrap();
            assert!(stream.next().await.unwrap().is_ok(),"Revoke without cancellation permits the already dispatched step to finish");
            let denied=client.post(format!("{base}/chat/completions")).bearer_auth(new.as_str()).json(&serde_json::json!({"model":"model","messages":[{"role":"user","content":"must not dispatch"}]})).send().await.unwrap();assert_eq!(denied.status(),403);assert_eq!(calls.load(Ordering::SeqCst),1);
            let receipt=config.revoke_access(RevokeAccess{protocol_version:1,expected_revision:4,kind:RevokeKind::ProviderConnection,provider_id:Some(provider.id.clone()),cancel_inflight:true}).unwrap();confirm_security(&state,receipt.revision).await.unwrap();
            let tail=tokio::time::timeout(Duration::from_secs(2),async{let mut bytes=Vec::new();while let Some(chunk)=stream.next().await{bytes.extend_from_slice(&chunk.unwrap());}String::from_utf8(bytes).unwrap()}).await.unwrap();assert!(tail.contains("ACCESS_REVOKED"));assert!(!tail.contains("[DONE]"));
            tokio::time::timeout(Duration::from_secs(2),async{while !dropped.load(Ordering::SeqCst){tokio::time::sleep(Duration::from_millis(10)).await;}}).await.unwrap();
            assert_eq!(calls.load(Ordering::SeqCst),1);assert!(state.security.active.lock().unwrap().is_empty());
            let db=rusqlite::Connection::open(state.directory.join("config.sqlite3")).unwrap();db.execute_batch("ALTER TABLE security_revocations RENAME TO owned_missing_security_fixture;").unwrap();
            let response=client.get(format!("{base}/models")).bearer_auth(new.as_str()).send().await.unwrap();assert_eq!(response.status(),503);assert_eq!(response.json::<serde_json::Value>().await.unwrap()["error"]["code"],"SECURITY_STATE_UNCONFIRMED");assert!(confirm_security(&state,receipt.revision).await.is_err());assert_eq!(state.status.read().await.security_revision,None);
            assert!(ConfigService::read_runtime_security(&state.directory,&[]).is_err(),"Even empty policy reads verify the ledger");
            println!("A11 real HTTP/in-memory credentials: missing/wrong/revoked 401; no data-plane management; new token saved-before-apply denied then accepted; provider revoke blocks new dispatch; optional cancellation closes real upstream and retains partial/error without DONE; corrupt security store 503/unconfirmed");
        }).catch_unwind().await;
        state.shutdown.cancel();
        drop(client);
        drop(gateway);
        drop(upstream);
        drop(config);
        drop(state);
        if let Err(error) = result {
            std::panic::resume_unwind(error);
        }
    }
}
