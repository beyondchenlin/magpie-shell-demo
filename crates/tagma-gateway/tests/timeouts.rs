//! Real owned loopback, TLS-stall and body-lifetime fixtures; no desktop or keys.
use axum::{
    Json, Router,
    body::{Body, Bytes},
    extract::Request,
    routing::post,
};
use futures_util::FutureExt;
use serde_json::{Value, json};
use std::{
    convert::Infallible,
    path::Path,
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    time::Duration,
};
use tagma_core::{credentials::SystemCredentials, timeouts::*, *};
use tagma_runtime::GatewayManager;
struct Server(tokio::task::JoinHandle<()>);
impl Drop for Server {
    fn drop(&mut self) {
        self.0.abort();
    }
}
struct Closed(Arc<AtomicBool>);
impl Drop for Closed {
    fn drop(&mut self) {
        self.0.store(true, Ordering::SeqCst);
    }
}
fn setup(url: String) -> (tempfile::TempDir, ConfigService, u16, String) {
    let temp = tempfile::Builder::new()
        .prefix("tagma-timeout-http-")
        .tempdir()
        .unwrap();
    let config = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
    let port = std::net::TcpListener::bind("127.0.0.1:0")
        .unwrap()
        .local_addr()
        .unwrap()
        .port();
    config
        .save_gateway(SaveGateway {
            protocol_version: 1,
            expected_revision: 0,
            port,
            auth_enabled: false,
        })
        .unwrap();
    let id = config
        .save_provider(SaveProvider {
            protocol_version: 1,
            expected_revision: 1,
            id: None,
            name: "owned timer fixture".into(),
            protocol: ProviderProtocol::OpenaiChatCompletions,
            base_url: url,
            enabled: true,
            models: vec!["timer-model".into()],
            credential: None,
        })
        .unwrap()
        .providers[0]
        .id
        .clone();
    (temp, config, port, id)
}
fn save(config: &ConfigService, id: &str, revision: u32, timeouts: ProviderTimeouts) {
    config
        .save_provider_timeouts(SaveProviderTimeouts {
            protocol_version: 1,
            expected_revision: revision,
            id: id.into(),
            timeouts,
        })
        .unwrap();
}
fn input(prompt: &str, stream: bool) -> Value {
    json!({"model":"timer-model","messages":[{"role":"user","content":prompt}],"stream":stream})
}
fn answer() -> Value {
    json!({"model":"timer-model","choices":[{"index":0,"message":{"role":"assistant","content":"owned timer answer"},"finish_reason":"stop"}],"usage":{"prompt_tokens":2,"completion_tokens":1}})
}
async fn wait_closed(closed: &AtomicBool) {
    tokio::time::timeout(Duration::from_secs(3), async {
        while !closed.load(Ordering::SeqCst) {
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn response_timeout_changes_only_new_requests_and_old_client_snapshot_completes() {
    let entered = Arc::new(tokio::sync::Notify::new());
    let upstream = Router::new().fallback(post({
        let entered = entered.clone();
        move |request: Request| {
            let entered = entered.clone();
            async move {
                let bytes = axum::body::to_bytes(request.into_body(), 128 * 1024)
                    .await
                    .unwrap();
                let value: Value = serde_json::from_slice(&bytes).unwrap();
                if value["messages"][0]["content"] == "old" {
                    entered.notify_one();
                }
                tokio::time::sleep(Duration::from_millis(400)).await;
                Json(answer())
            }
        }
    }));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let up = listener.local_addr().unwrap().port();
    let _server = Server(tokio::spawn(async move {
        axum::serve(listener, upstream).await.unwrap();
    }));
    let (temp, config, port, id) = setup(format!("http://127.0.0.1:{up}/v1"));
    save(
        &config,
        &id,
        2,
        ProviderTimeouts {
            connect_ms: 100,
            first_response_ms: 1500,
            idle_ms: 1000,
            total_ms: 3000,
        },
    );
    let manager = GatewayManager::new(temp.path(), Path::new(env!("CARGO_BIN_EXE_tagma-gateway")));
    manager.start(port).await.unwrap();
    let result=std::panic::AssertUnwindSafe(async{
        let client=reqwest::Client::builder().no_proxy().timeout(Duration::from_secs(5)).build().unwrap();let endpoint=format!("http://127.0.0.1:{port}/v1/chat/completions");
        let old={let client=client.clone();let endpoint=endpoint.clone();tokio::spawn(async move{client.post(endpoint).json(&input("old",false)).send().await.unwrap()})};tokio::time::timeout(Duration::from_secs(3),entered.notified()).await.unwrap();
        save(&config,&id,3,ProviderTimeouts{connect_ms:100,first_response_ms:100,idle_ms:1000,total_ms:3000});assert_eq!(manager.apply().await.unwrap().effective_revision,Some(4));
        let response=client.post(&endpoint).json(&input("new",false)).send().await.unwrap();assert_eq!(response.status(),504);assert_eq!(response.headers()["x-tagma-config-revision"],"4");assert!(response.text().await.unwrap().contains("UPSTREAM_RESPONSE_TIMEOUT"));
        let response=old.await.unwrap();assert_eq!(response.status(),200);assert_eq!(response.headers()["x-tagma-config-revision"],"3");assert_eq!(response.json::<Value>().await.unwrap()["choices"][0]["message"]["content"],"owned timer answer");
        println!("Actual provider headers:old cfg3/1500ms in flight before apply,new cfg4/100ms returns504 UPSTREAM_RESPONSE_TIMEOUT,old400ms response still200/cfg3;client/timers pinned,new config never cancels old run");
    }).catch_unwind().await;
    let stopped = manager.stop().await;
    if let Err(error) = result {
        std::panic::resume_unwind(error);
    }
    stopped.unwrap();
}

#[tokio::test]
async fn provider_idle_and_total_budgets_have_distinct_stream_errors_and_cancel_upstream() {
    let idle_closed = Arc::new(AtomicBool::new(false));
    let total_closed = Arc::new(AtomicBool::new(false));
    let upstream=Router::new().fallback(post({let idle_closed=idle_closed.clone();let total_closed=total_closed.clone();move|request:Request|{let idle_closed=idle_closed.clone();let total_closed=total_closed.clone();async move{let bytes=axum::body::to_bytes(request.into_body(),128*1024).await.unwrap();let value:Value=serde_json::from_slice(&bytes).unwrap();let idle=value["messages"][0]["content"]=="idle";let closed=Closed(if idle{idle_closed}else{total_closed});
        ([("content-type","text/event-stream")],Body::from_stream(async_stream::stream!{let _closed=closed;yield Ok::<_,Infallible>(Bytes::from(format!("data: {}\n\n",json!({"choices":[{"index":0,"delta":{"role":"assistant","content":"owned partial"},"finish_reason":null}]}))));loop{tokio::time::sleep(Duration::from_millis(if idle{2000}else{30})).await;yield Ok(Bytes::from_static(b": heartbeat\n\n"));}}))
    }}}));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let up = listener.local_addr().unwrap().port();
    let _server = Server(tokio::spawn(async move {
        axum::serve(listener, upstream).await.unwrap();
    }));
    let (temp, config, port, id) = setup(format!("http://127.0.0.1:{up}/v1"));
    save(
        &config,
        &id,
        2,
        ProviderTimeouts {
            connect_ms: 100,
            first_response_ms: 500,
            idle_ms: 150,
            total_ms: 2000,
        },
    );
    let manager = GatewayManager::new(temp.path(), Path::new(env!("CARGO_BIN_EXE_tagma-gateway")));
    manager.start(port).await.unwrap();
    let result=std::panic::AssertUnwindSafe(async{
        let client=reqwest::Client::builder().no_proxy().timeout(Duration::from_secs(5)).build().unwrap();let endpoint=format!("http://127.0.0.1:{port}/v1/chat/completions");
        let response=client.post(&endpoint).json(&input("idle",true)).send().await.unwrap();assert_eq!(response.status(),200);let idle_id=response.headers()["x-tagma-request-id"].to_str().unwrap().to_owned();let text=response.text().await.unwrap();assert!(text.contains("owned partial"));assert!(text.contains("UPSTREAM_IDLE_TIMEOUT"));assert!(!text.contains("[DONE]"));wait_closed(&idle_closed).await;
        save(&config,&id,3,ProviderTimeouts{connect_ms:100,first_response_ms:300,idle_ms:300,total_ms:500});manager.apply().await.unwrap();let response=client.post(&endpoint).json(&input("total",true)).send().await.unwrap();assert_eq!(response.status(),200);let total_id=response.headers()["x-tagma-request-id"].to_str().unwrap().to_owned();let text=response.text().await.unwrap();assert!(text.contains("REQUEST_BUDGET_EXCEEDED"));assert!(!text.contains("UPSTREAM_IDLE_TIMEOUT"));assert!(!text.contains("[DONE]"));wait_closed(&total_closed).await;
        manager.recover_usage().await.unwrap();let reader=tagma_runtime::usage::UsageReader::default();for (id,code,revision) in [(idle_id,"UPSTREAM_IDLE_TIMEOUT",3),(total_id,"REQUEST_BUDGET_EXCEEDED",4)]{let row=reader.details(temp.path(),usage::read::UsageDetailsQuery{protocol_version:1,request_id:id}).await.unwrap().record.unwrap();assert_eq!(row.error_code.as_deref(),Some(code));assert_eq!(row.config_revision,revision);assert_eq!(row.input_tokens,None);assert_eq!(row.output_tokens,None);}
        println!("Actual stream timers:150ms idle ->UPSTREAM_IDLE_TIMEOUT with partial text,noDONE;30ms heartbeat avoids idle but500ms total ->REQUEST_BUDGET_EXCEEDED/noDONE;both upstreams closed,explicit accounting recovery then cfg3/4 errors and unknown tokens retained");
    }).catch_unwind().await;
    let stopped = manager.stop().await;
    if let Err(error) = result {
        std::panic::resume_unwind(error);
    }
    stopped.unwrap();
}

#[tokio::test]
async fn configured_connect_timeout_covers_stalled_owned_tls_handshake() {
    use tokio::io::AsyncReadExt;
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let up = listener.local_addr().unwrap().port();
    let entered = Arc::new(tokio::sync::Notify::new());
    let closed = Arc::new(AtomicBool::new(false));
    let _server = Server(tokio::spawn({
        let entered = entered.clone();
        let closed = closed.clone();
        async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let _closed = Closed(closed);
            entered.notify_one();
            let mut bytes = [0u8; 4096];
            while let Ok(size) = socket.read(&mut bytes).await {
                if size == 0 {
                    break;
                }
            }
        }
    }));
    let (temp, config, port, id) = setup(format!("https://127.0.0.1:{up}/v1"));
    save(
        &config,
        &id,
        2,
        ProviderTimeouts {
            connect_ms: 150,
            first_response_ms: 1500,
            idle_ms: 1000,
            total_ms: 3000,
        },
    );
    let manager = GatewayManager::new(temp.path(), Path::new(env!("CARGO_BIN_EXE_tagma-gateway")));
    manager.start(port).await.unwrap();
    let result=std::panic::AssertUnwindSafe(async{let client=reqwest::Client::builder().no_proxy().timeout(Duration::from_secs(5)).build().unwrap();let response=client.post(format!("http://127.0.0.1:{port}/v1/chat/completions")).json(&input("tls stall",false)).send().await.unwrap();assert_eq!(response.status(),502);assert!(response.text().await.unwrap().contains("UPSTREAM_CONNECT_TIMEOUT"));tokio::time::timeout(Duration::from_secs(1),entered.notified()).await.unwrap();wait_closed(&closed).await;println!("Actual TLS stall:accepted TCP/never supplied TLS response,configured connect150ms wins over first-response1500ms,total3000ms ->502 UPSTREAM_CONNECT_TIMEOUT,owned upstream socket closed,no credentials/certificate bypass");}).catch_unwind().await;
    let stopped = manager.stop().await;
    if let Err(error) = result {
        std::panic::resume_unwind(error);
    }
    stopped.unwrap();
}
