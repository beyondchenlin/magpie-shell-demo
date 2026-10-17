//! A27 provider-generation scope, actual owned sidecars and private IPC faults.
//! No real keys, user state, desktop operations or external provider requests.
use axum::{
    Json, Router,
    body::{Body, Bytes},
    extract::Request,
    response::IntoResponse,
    routing::post,
};
use futures_util::FutureExt;
use serde_json::{Value, json};
use std::{
    convert::Infallible,
    path::Path,
    sync::{
        Arc,
        atomic::{AtomicBool, AtomicUsize, Ordering},
    },
    time::Duration,
};
use tagma_core::{credentials::SystemCredentials, security::*, teams::*, *};
use tagma_runtime::{GatewayManager, ipc};
struct Task(tokio::task::JoinHandle<()>);
impl Drop for Task {
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
fn free_port() -> u16 {
    std::net::TcpListener::bind("127.0.0.1:0")
        .unwrap()
        .local_addr()
        .unwrap()
        .port()
}

#[tokio::test]
async fn failed_configuration_apply_and_missing_private_ack_never_restore_revoked_dispatch() {
    for (delivered, cancel_inflight) in [(false, false), (true, false), (false, true), (true, true)]
    {
        let entered = Arc::new(tokio::sync::Notify::new());
        let release = Arc::new(tokio::sync::Notify::new());
        let dropped = Arc::new(AtomicBool::new(false));
        let review_calls = Arc::new(AtomicUsize::new(0));
        let final_calls = Arc::new(AtomicUsize::new(0));
        let upstream=Router::new().fallback(post({let entered=entered.clone();let release=release.clone();let dropped=dropped.clone();let review_calls=review_calls.clone();let final_calls=final_calls.clone();move|request:Request|{let entered=entered.clone();let release=release.clone();let dropped=dropped.clone();let review_calls=review_calls.clone();let final_calls=final_calls.clone();async move{
            let bytes=axum::body::to_bytes(request.into_body(),128*1024).await.unwrap();let value:Value=serde_json::from_slice(&bytes).unwrap();let is_review=value["model"]=="review";if is_review{review_calls.fetch_add(1,Ordering::SeqCst);}else{final_calls.fetch_add(1,Ordering::SeqCst);}
            let value=json!({"model":value["model"],"choices":[{"index":0,"message":{"role":"assistant","content":"owned intermediate"},"finish_reason":"stop"}]});
            if is_review&&value["model"]=="review"{
                entered.notify_one();let guard=Dropped(dropped);let body=serde_json::to_vec(&value).unwrap();
                return ([("content-type","application/json")],Body::from_stream(async_stream::stream!{let _guard=guard;yield Ok::<_,Infallible>(Bytes::from_static(b" "));loop{tokio::select!{_=release.notified()=>break,_=tokio::time::sleep(Duration::from_millis(20))=>yield Ok(Bytes::from_static(b" ")),}}yield Ok(Bytes::from(body));})).into_response();
            }
            Json(value).into_response()
        }}}));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let up = listener.local_addr().unwrap().port();
        let _upstream = Task(tokio::spawn(async move {
            axum::serve(listener, upstream).await.unwrap()
        }));
        let temp = tempfile::Builder::new()
            .prefix("tagma-revocation-fault-")
            .tempdir()
            .unwrap();
        let config = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
        let port = free_port();
        config
            .save_gateway(SaveGateway {
                protocol_version: 1,
                expected_revision: 0,
                port,
                auth_enabled: false,
            })
            .unwrap();
        let mut providers = Vec::new();
        for model in ["review", "final"] {
            let view = config
                .save_provider(SaveProvider {
                    protocol_version: 1,
                    expected_revision: config.view().unwrap().desired_revision,
                    id: None,
                    name: model.into(),
                    protocol: ProviderProtocol::OpenaiChatCompletions,
                    base_url: format!("http://127.0.0.1:{up}/{model}/v1"),
                    enabled: true,
                    models: vec![model.into()],
                    credential: None,
                })
                .unwrap();
            providers.push(view.providers.last().unwrap().id.clone());
        }
        let final_target = CloudTarget {
            provider_id: providers[1].clone(),
            model_id: "final".into(),
        };
        let view = config
            .save_team(SaveTeam {
                protocol_version: 1,
                expected_revision: 3,
                id: None,
                slug: "fault-matrix".into(),
                recipe: TeamRecipe {
                    display_name: "owned fault matrix".into(),
                    brain: TeamBrain::Explicit {
                        target: final_target.clone(),
                    },
                    routing: TeamRouting::Sequential,
                    total_timeout_ms: 40000,
                    steps: vec![
                        TeamStep {
                            target: TeamStepTarget::CloudModel {
                                target: CloudTarget {
                                    provider_id: providers[0].clone(),
                                    model_id: "review".into(),
                                }
                                .into(),
                            },
                            input: TeamStepInput::OriginalMessages,
                            output: TeamStepOutput::IntermediateText,
                            timeout_ms: 20000,
                            failure: TeamFailurePolicy::Abort,
                            side_effect: TeamSideEffect::OutboundModelRequest,
                        },
                        TeamStep {
                            target: TeamStepTarget::CloudModel {
                                target: final_target.into(),
                            },
                            input: TeamStepInput::PreviousText,
                            output: TeamStepOutput::FinalAnswer,
                            timeout_ms: 20000,
                            failure: TeamFailurePolicy::Abort,
                            side_effect: TeamSideEffect::OutboundModelRequest,
                        },
                    ],
                },
            })
            .unwrap();
        config
            .publish_team(RevisionCommand {
                protocol_version: 1,
                expected_revision: 4,
                id: view.teams[0].team.id.clone(),
            })
            .unwrap();
        let manager =
            GatewayManager::new(temp.path(), Path::new(env!("CARGO_BIN_EXE_tagma-gateway")));
        manager.start(port).await.unwrap();
        let original_manifest = std::fs::read(temp.path().join("runtime.json")).unwrap();
        let real = ipc::read_manifest(temp.path()).unwrap();
        let result=std::panic::AssertUnwindSafe(async{
            let client=reqwest::Client::builder().no_proxy().timeout(Duration::from_secs(15)).build().unwrap();let endpoint=format!("http://127.0.0.1:{port}/v1/chat/completions");let mut pending={let client=client.clone();let endpoint=endpoint.clone();tokio::spawn(async move{client.post(endpoint).json(&json!({"model":"tagma/fault-matrix","messages":[{"role":"user","content":"hold owned first step"}]})).send().await.unwrap()})};tokio::time::timeout(Duration::from_secs(3),entered.notified()).await.unwrap();
            let next_port=loop{let next=free_port();if next!=port{break next;}};config.save_gateway(SaveGateway{protocol_version:1,expected_revision:5,port:next_port,auth_enabled:false}).unwrap();let applied=manager.apply().await.unwrap();assert_eq!(applied.error.as_ref().unwrap().code,ErrorCode::RestartRequired);let status=manager.status().await;assert_eq!(status.effective_revision,Some(5));assert!(matches!(status.state,RuntimeState::Degraded));
            let receipt=config.revoke_access(RevokeAccess{protocol_version:1,expected_revision:6,kind:RevokeKind::ProviderConnection,provider_id:Some(providers[1].clone()),cancel_inflight}).unwrap();
            let mut faulty=real.clone();
            #[cfg(windows)] {faulty.endpoint=format!("tagma-{}",uuid::Uuid::new_v4());}
            #[cfg(unix)] {faulty.endpoint=temp.path().join(format!("lost-{}.sock",uuid::Uuid::new_v4())).to_string_lossy().into_owned();}
            let mut processed=None;let mut proxy=None;
            if delivered{
                use interprocess::local_socket::tokio::prelude::*;
                let listener=ipc::listener(&faulty.endpoint).unwrap();let real=real.clone();let (sender,receiver)=tokio::sync::oneshot::channel();processed=Some(receiver);
                proxy=Some(Task(tokio::spawn(async move{let mut stream=listener.accept().await.unwrap();let request:ipc::Request=ipc::read_frame(&mut stream).await.unwrap();assert!(matches!(request.command,ipc::Command::ConfirmSecurity{..}));let status=ipc::call(&real,request.command).await.unwrap();let _=sender.send(status);drop(stream);})));
            }
            std::fs::write(temp.path().join("runtime.json"),serde_json::to_vec(&faulty).unwrap()).unwrap();let failed_confirmation=manager.confirm_security(receipt.revision).await;assert!(failed_confirmation.is_err(),"lost confirmation must never be reported as success");
            if let Some(processed)=processed{let actual=tokio::time::timeout(Duration::from_secs(3),processed).await.unwrap().unwrap();assert!(actual.security_revision.is_some_and(|revision|revision>=receipt.revision));assert_eq!(actual.effective_revision,Some(5));}
            let unavailable=manager.status().await;assert!(unavailable.security_revision.is_none());
            let refused=client.post(&endpoint).json(&json!({"model":"final","messages":[{"role":"user","content":"must stay revoked despite old config"}]})).send().await.unwrap();assert_eq!(refused.status(),403);assert_eq!(refused.json::<Value>().await.unwrap()["error"]["code"],"ACCESS_REVOKED");assert_eq!(final_calls.load(Ordering::SeqCst),0);
            if delivered&&cancel_inflight{tokio::time::timeout(Duration::from_secs(3),async{while !dropped.load(Ordering::SeqCst){tokio::time::sleep(Duration::from_millis(10)).await;}}).await.unwrap();}
            if !cancel_inflight{assert!(tokio::time::timeout(Duration::from_millis(100),&mut pending).await.is_err(),"cancel=false must keep the admitted first body in flight");assert!(!dropped.load(Ordering::SeqCst));}
            release.notify_one();let response=tokio::time::timeout(Duration::from_secs(3),pending).await.unwrap().unwrap();assert_eq!(response.status(),403);assert_eq!(response.json::<Value>().await.unwrap()["error"]["code"],"ACCESS_REVOKED");assert_eq!(review_calls.load(Ordering::SeqCst),1);assert_eq!(final_calls.load(Ordering::SeqCst),0);
            drop(proxy);std::fs::write(temp.path().join("runtime.json"),&original_manifest).unwrap();let actual=manager.confirm_security(receipt.revision).await.unwrap();assert_eq!(actual.effective_revision,Some(5));assert_eq!(actual.error.unwrap().code,ErrorCode::RestartRequired);assert_eq!(config.view().unwrap().desired_revision,6);
            println!("A27 actual sidecar:apply=RestartRequired old_effective5 desired6 IPC_delivered={delivered} cancel={cancel_inflight} client_confirm=Err unknown_status=true review_calls1 revoked_final_calls0;real confirmation keeps apply error");
        }).catch_unwind().await;
        release.notify_one();
        std::fs::write(temp.path().join("runtime.json"), &original_manifest).unwrap();
        let stopped = manager.stop().await;
        if let Err(error) = result {
            std::panic::resume_unwind(error);
        }
        stopped.unwrap();
    }
}
