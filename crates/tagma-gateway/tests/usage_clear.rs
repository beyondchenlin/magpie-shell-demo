//! Actual owned sidecar/private IPC with controlled loopback and seeded history.
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
use tagma_core::{
    credentials::SystemCredentials,
    usage::{
        AttemptStart, Completion, Outcome, RequestStart, Tokens, UsageStore,
        read::{self, UsageRange},
    },
    *,
};
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
#[tokio::test]
async fn actual_private_clear_preserves_active_calls_and_recovers_lost_receipt() {
    let calls = Arc::new(AtomicUsize::new(0));
    let entered = Arc::new(tokio::sync::Notify::new());
    let release = Arc::new(tokio::sync::Notify::new());
    let dropped = Arc::new(AtomicBool::new(false));
    let upstream=Router::new().fallback(post({let calls=calls.clone();let entered=entered.clone();let release=release.clone();let dropped=dropped.clone();move|request:Request|{let calls=calls.clone();let entered=entered.clone();let release=release.clone();let dropped=dropped.clone();async move{calls.fetch_add(1,Ordering::SeqCst);let body=axum::body::to_bytes(request.into_body(),128*1024).await.unwrap();let input:Value=serde_json::from_slice(&body).unwrap();let output=json!({"model":"clear-model","choices":[{"index":0,"message":{"role":"assistant","content":"owned clear response"},"finish_reason":"stop"}],"usage":{"prompt_tokens":2,"completion_tokens":1}});
        if input["messages"][0]["content"]=="hold"{entered.notify_one();let guard=Dropped(dropped);let bytes=serde_json::to_vec(&output).unwrap();return ([("content-type","application/json")],Body::from_stream(async_stream::stream!{let _guard=guard;yield Ok::<_,Infallible>(Bytes::from_static(b" "));loop{tokio::select!{_=release.notified()=>break,_=tokio::time::sleep(Duration::from_millis(20))=>yield Ok(Bytes::from_static(b" ")),}}yield Ok(Bytes::from(bytes));})).into_response();}Json(output).into_response()
    }}}));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let upstream_port = listener.local_addr().unwrap().port();
    let _upstream = Task(tokio::spawn(async move {
        axum::serve(listener, upstream).await.unwrap()
    }));
    let temp = tempfile::Builder::new()
        .prefix("tagma-usage-clear-http-")
        .tempdir()
        .unwrap();
    let config = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
    let reservation = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let port = reservation.local_addr().unwrap().port();
    config
        .save_gateway(SaveGateway {
            protocol_version: 1,
            expected_revision: 0,
            port,
            auth_enabled: false,
        })
        .unwrap();
    let view = config
        .save_provider(SaveProvider {
            protocol_version: 1,
            expected_revision: 1,
            id: None,
            name: "owned clear fixture".into(),
            protocol: ProviderProtocol::OpenaiChatCompletions,
            base_url: format!("http://127.0.0.1:{upstream_port}/v1"),
            enabled: true,
            models: vec!["clear-model".into()],
            credential: None,
        })
        .unwrap();
    let provider = view.providers[0].id.clone();
    let now = health::now_ms().unwrap();
    let day = 86_400_000;
    let end = now / day * day;
    let range = UsageRange {
        start_ms: (end - day) as f64,
        end_ms: end as f64,
    };
    let old_id = uuid::Uuid::new_v4().to_string();
    {
        let mut store = UsageStore::open(temp.path(), now).unwrap();
        store
            .begin_request(&RequestStart {
                id: old_id.clone(),
                provider_id: provider.clone(),
                model: "seeded-past-day".into(),
                config_revision: 1,
                team_revision: None,
                started_ms: end - day + 100,
            })
            .unwrap();
        store
            .begin_attempt(&AttemptStart {
                request_id: old_id.clone(),
                ordinal: 1,
                provider_id: provider,
                model: "seeded-actual-target".into(),
                started_ms: end - day + 110,
            })
            .unwrap();
        for ordinal in [Some(1), None] {
            store
                .finish(Completion {
                    request_id: old_id.clone(),
                    ordinal,
                    finished_ms: end - day + ordinal.map_or(130, |_| 120),
                    outcome: Outcome::Succeeded,
                    error_code: None,
                    tokens: if ordinal.is_some() {
                        Tokens {
                            input: Some(3),
                            output: Some(2),
                        }
                    } else {
                        Tokens::default()
                    },
                })
                .unwrap();
        }
    }
    let manager = GatewayManager::new(temp.path(), Path::new(env!("CARGO_BIN_EXE_tagma-gateway")));
    drop(reservation);
    manager.start(port).await.unwrap();
    let original_manifest = std::fs::read(temp.path().join("runtime.json")).unwrap();
    let real = ipc::read_manifest(temp.path()).unwrap();
    let result=std::panic::AssertUnwindSafe(async{
        let client=reqwest::Client::builder().no_proxy().timeout(Duration::from_secs(10)).build().unwrap();let endpoint=format!("http://127.0.0.1:{port}/v1/chat/completions");let input=|content:&str|json!({"model":"clear-model","messages":[{"role":"user","content":content}]});
        let response=client.post(&endpoint).json(&input("initial")).send().await.unwrap();assert_eq!(response.status(),200);response.bytes().await.unwrap();
        let held={let client=client.clone();let endpoint=endpoint.clone();let input=input("hold");tokio::spawn(async move{let response=client.post(endpoint).json(&input).send().await.unwrap();let status=response.status();response.bytes().await.unwrap();status})};tokio::time::timeout(Duration::from_secs(3),entered.notified()).await.unwrap();
        assert_eq!(manager.prepare_usage_clear(range.clone()).await.unwrap_err().code,ErrorCode::UsageClearBusy);assert!(!dropped.load(Ordering::SeqCst));assert_eq!(manager.status().await.usage_degraded,Some(false));release.notify_one();assert_eq!(held.await.unwrap(),200);
        let stale=manager.prepare_usage_clear(range.clone()).await.unwrap();let response=client.post(&endpoint).json(&input("invalidate preview")).send().await.unwrap();assert_eq!(response.status(),200);response.bytes().await.unwrap();assert_eq!(manager.clear_usage(stale).await.unwrap_err().code,ErrorCode::UsageClearChanged);assert_eq!(manager.status().await.usage_degraded,Some(false));
        let next_reservation=std::net::TcpListener::bind("127.0.0.1:0").unwrap();config.save_gateway(SaveGateway{protocol_version:1,expected_revision:2,port:next_reservation.local_addr().unwrap().port(),auth_enabled:false}).unwrap();assert_eq!(manager.apply().await.unwrap().error.unwrap().code,ErrorCode::RestartRequired);
        let plan=manager.prepare_usage_clear(range).await.unwrap();assert_eq!(plan.context_id,ipc::config_id(temp.path()).unwrap());assert_eq!(plan.requests,"1");assert_eq!(plan.attempts,"1");assert_eq!(plan.summary_buckets,"2");
        let mut faulty=real.clone();
        #[cfg(windows)]{faulty.endpoint=format!("tagma-{}",uuid::Uuid::new_v4());}
        #[cfg(unix)]{faulty.endpoint=temp.path().join("lost-clear.sock").to_string_lossy().into_owned();}
        use interprocess::local_socket::tokio::prelude::*;let listener=ipc::listener(&faulty.endpoint).unwrap();let (processed,done)=tokio::sync::oneshot::channel();let proxy=Task(tokio::spawn(async move{let mut stream=listener.accept().await.unwrap();let request:ipc::Request=ipc::read_frame(&mut stream).await.unwrap();assert!(matches!(request.command,ipc::Command::ClearUsage{..}));let status=ipc::call(&real,request.command).await.unwrap();let _=processed.send(status);drop(stream);}));
        std::fs::write(temp.path().join("runtime.json"),serde_json::to_vec(&faulty).unwrap()).unwrap();assert_eq!(manager.clear_usage(plan.clone()).await.unwrap_err().code,ErrorCode::UsageClearUnconfirmed);let actual=tokio::time::timeout(Duration::from_secs(3),done).await.unwrap().unwrap();assert_eq!(actual.usage_degraded,Some(false));assert_eq!(actual.error.unwrap().code,ErrorCode::RestartRequired);drop(proxy);std::fs::write(temp.path().join("runtime.json"),&original_manifest).unwrap();
        let receipt=manager.clear_usage(plan.clone()).await.unwrap();assert_eq!(receipt.plan,plan);assert_eq!(receipt.generation,"1");assert_eq!(manager.clear_usage(plan).await.unwrap(),receipt);
        let view=read::requests(temp.path(),read::UsageRequestsQuery{protocol_version:1,range:UsageRange{start_ms:(end-day)as f64,end_ms:(end+day)as f64},filter:Default::default(),cursor:None,limit:32},&Default::default()).unwrap();assert_eq!(view.info.generation.as_deref(),Some("1"));assert_eq!(view.info.context_id,ipc::config_id(temp.path()).unwrap());assert_eq!(view.records.len(),3);assert!(view.records.iter().all(|record|record.request_id!=old_id&&record.config_revision==2&&record.input_tokens.as_deref()==Some("2")&&record.output_tokens.as_deref()==Some("1")));assert_eq!(calls.load(Ordering::SeqCst),3);
        let response=client.post(format!("http://127.0.0.1:{port}/v1/clear_usage")).json(&json!({})).send().await.unwrap();assert_eq!(response.status(),501);response.bytes().await.unwrap();assert_eq!(calls.load(Ordering::SeqCst),3);
        println!("Usage actual private clear:seeded past-day1request/1attempt/2buckets removed;3 actual HTTP today records retained;busy holds upstream alive and changed preview leaves accounting healthy;real reply lost ->unconfirmed;same plan retry twice receipt generation1;config RestartRequired preserved;data API clear501,extra inference0");
    }).catch_unwind().await;
    release.notify_one();
    std::fs::write(temp.path().join("runtime.json"), &original_manifest).unwrap();
    let stopped = manager.stop().await;
    if let Err(error) = result {
        std::panic::resume_unwind(error);
    }
    stopped.unwrap();
}
