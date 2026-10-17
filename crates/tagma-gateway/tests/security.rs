//! Actual isolated sidecar/HTTP, provider without credentials; no UI or OS keys.
use axum::{Json, Router, extract::Request, routing::post};
use futures_util::FutureExt;
use serde_json::{Value, json};
use std::{
    sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    },
    time::Duration,
};
use tagma_core::{credentials::SystemCredentials, security::*, teams::*, *};
use tagma_runtime::GatewayManager;
struct Server(tokio::task::JoinHandle<()>);
impl Drop for Server {
    fn drop(&mut self) {
        self.0.abort();
    }
}
#[tokio::test]
async fn persistent_revocation_overrides_pinned_team_steps_and_restarts_without_credential_access()
{
    let calls = Arc::new(AtomicUsize::new(0));
    let entered = Arc::new(tokio::sync::Notify::new());
    let release = Arc::new(tokio::sync::Notify::new());
    let upstream=Router::new().fallback(post({let calls=calls.clone();let entered=entered.clone();let release=release.clone();move|request:Request|{let calls=calls.clone();let entered=entered.clone();let release=release.clone();async move{let input:Value=serde_json::from_slice(&axum::body::to_bytes(request.into_body(),128*1024).await.unwrap()).unwrap();calls.fetch_add(1,Ordering::SeqCst);if input["messages"][0]["content"]=="hold"{entered.notify_one();release.notified().await;}Json(json!({"model":input["model"],"choices":[{"index":0,"message":{"role":"assistant","content":"intermediate"},"finish_reason":"stop"}]}))}}}));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    let _server = Server(tokio::spawn(async move {
        axum::serve(listener, upstream).await.unwrap()
    }));
    let temp = tempfile::Builder::new()
        .prefix("tagma-security-")
        .tempdir()
        .unwrap();
    let config = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
    let gateway_port = std::net::TcpListener::bind("127.0.0.1:0")
        .unwrap()
        .local_addr()
        .unwrap()
        .port();
    config
        .save_gateway(SaveGateway {
            protocol_version: 1,
            expected_revision: 0,
            port: gateway_port,
            auth_enabled: false,
        })
        .unwrap();
    let mut ids = Vec::new();
    for name in ["review", "final"] {
        let provider = config
            .save_provider(SaveProvider {
                protocol_version: 1,
                expected_revision: config.view().unwrap().desired_revision,
                id: None,
                name: name.into(),
                protocol: ProviderProtocol::OpenaiChatCompletions,
                base_url: format!("http://127.0.0.1:{port}/{name}/v1"),
                enabled: true,
                models: vec![name.into()],
                credential: None,
            })
            .unwrap()
            .providers
            .last()
            .unwrap()
            .clone();
        ids.push(provider.id);
    }
    let target = CloudTarget {
        provider_id: ids[1].clone(),
        model_id: "final".into(),
    };
    let team = config
        .save_team(SaveTeam {
            protocol_version: 1,
            expected_revision: 3,
            id: None,
            slug: "revocation-test".into(),
            recipe: TeamRecipe {
                display_name: "security fixture".into(),
                brain: TeamBrain::Explicit {
                    target: target.clone(),
                },
                routing: TeamRouting::Sequential,
                total_timeout_ms: 8000,
                steps: vec![
                    TeamStep {
                        target: TeamStepTarget::CloudModel {
                            target: CloudTarget {
                                provider_id: ids[0].clone(),
                                model_id: "review".into(),
                            }
                            .into(),
                        },
                        input: TeamStepInput::OriginalMessages,
                        output: TeamStepOutput::IntermediateText,
                        timeout_ms: 4000,
                        failure: TeamFailurePolicy::Abort,
                        side_effect: TeamSideEffect::OutboundModelRequest,
                    },
                    TeamStep {
                        target: TeamStepTarget::CloudModel {
                            target: target.into(),
                        },
                        input: TeamStepInput::PreviousText,
                        output: TeamStepOutput::FinalAnswer,
                        timeout_ms: 4000,
                        failure: TeamFailurePolicy::Abort,
                        side_effect: TeamSideEffect::OutboundModelRequest,
                    },
                ],
            },
        })
        .unwrap()
        .teams[0]
        .team
        .clone();
    config
        .publish_team(RevisionCommand {
            protocol_version: 1,
            expected_revision: 4,
            id: team.id,
        })
        .unwrap();
    let manager = GatewayManager::new(
        temp.path(),
        std::path::Path::new(env!("CARGO_BIN_EXE_tagma-gateway")),
    );
    manager.start(gateway_port).await.unwrap();
    let result=std::panic::AssertUnwindSafe(async{
        let client=reqwest::Client::builder().no_proxy().timeout(Duration::from_secs(10)).build().unwrap();let base=format!("http://127.0.0.1:{gateway_port}/v1");
        let pending={let client=client.clone();let base=base.clone();tokio::spawn(async move{client.post(format!("{base}/chat/completions")).json(&json!({"model":"tagma/revocation-test","messages":[{"role":"user","content":"hold"}]})).send().await.unwrap()})};
        tokio::time::timeout(Duration::from_secs(2),entered.notified()).await.unwrap();
        let receipt=config.revoke_access(RevokeAccess{protocol_version:1,expected_revision:5,kind:RevokeKind::ProviderConnection,provider_id:Some(ids[1].clone()),cancel_inflight:false}).unwrap();
        assert_eq!(config.view().unwrap().desired_revision,5);let status=manager.confirm_security(receipt.revision).await.unwrap();assert_eq!(status.security_revision,Some(receipt.revision));assert!(status.instance_id.is_some());
        release.notify_one();let response=pending.await.unwrap();assert_eq!(response.status(),403);assert_eq!(response.json::<Value>().await.unwrap()["error"]["code"],"ACCESS_REVOKED");assert_eq!(calls.load(Ordering::SeqCst),1,"Revoked future step cannot dispatch from the pinned old plan");
        let catalog:Value=client.get(format!("{base}/models")).send().await.unwrap().json().await.unwrap();assert!(!catalog["data"].as_array().unwrap().iter().any(|m|m["id"]=="final"||m["id"]=="tagma/revocation-test"));
        manager.stop().await.unwrap();manager.start(gateway_port).await.unwrap();
        let response=client.post(format!("{base}/chat/completions")).json(&json!({"model":"final","messages":[{"role":"user","content":"must not dispatch"}]})).send().await.unwrap();assert_eq!(response.status(),403);assert_eq!(calls.load(Ordering::SeqCst),1);
        let denied=manager.probe_provider(tagma_core::catalog::ProbeProvider{protocol_version:1,expected_revision:5,provider_id:ids[1].clone(),request_id:uuid::Uuid::new_v4().to_string()}).await.unwrap_err();assert_eq!(denied.code,ErrorCode::AccessRevoked);
        config.save_provider(SaveProvider{protocol_version:1,expected_revision:5,id:None,name:"replacement route".into(),protocol:ProviderProtocol::OpenaiChatCompletions,base_url:format!("http://127.0.0.1:{port}/replacement/v1"),enabled:true,models:vec!["final".into()],credential:None}).unwrap();manager.apply().await.unwrap();
        let replacement=client.post(format!("{base}/chat/completions")).json(&json!({"model":"final","messages":[{"role":"user","content":"new permitted target"}]})).send().await.unwrap();assert_eq!(replacement.status(),200);assert_eq!(calls.load(Ordering::SeqCst),2);
        let fixed_team=client.post(format!("{base}/chat/completions")).json(&json!({"model":"tagma/revocation-test","messages":[{"role":"user","content":"must not substitute fixed UUID"}]})).send().await.unwrap();assert_eq!(fixed_team.status(),403);assert_eq!(calls.load(Ordering::SeqCst),2);
        println!("DATA-06 routing: raw duplicate model uses the first permitted configured provider on a new call; immutable explicit team UUID never substitutes a replacement");
        println!("DATA-06 actual sidecar: saved revocation -> instance-bound acknowledgement; old in-flight step finishes, revoked next step dispatch count=0; directory filtered; restart and private catalog probe remain denied");
    }).catch_unwind().await;
    let stopped = manager.stop().await;
    if let Err(error) = result {
        std::panic::resume_unwind(error);
    }
    stopped.unwrap();
}
