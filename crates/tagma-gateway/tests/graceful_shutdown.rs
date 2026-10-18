use axum::{
    Json, Router,
    body::{Body, Bytes},
    response::IntoResponse,
    routing::post,
};
use serde_json::{Value, json};
use std::{
    convert::Infallible,
    sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    },
    time::{Duration, Instant},
};
use tagma_core::{
    ConfigService, ProviderProtocol, SaveGateway, SaveProvider, credentials::SystemCredentials,
};
use tagma_runtime::GatewayManager;

// Real sidecar + real HTTP stream. No desktop/UI acceptance is claimed here.
#[tokio::test]
async fn stop_drains_admitted_streams_then_cancels_at_the_deadline() {
    let count = Arc::new(AtomicUsize::new(0));
    let observed = count.clone();
    let router=Router::new().route("/v1/chat/completions",post(move |Json(input):Json<Value>| {
        let count=observed.clone();
        async move {
            count.fetch_add(1,Ordering::SeqCst);
            let short=input["messages"][0]["content"]=="finish";
            ([("content-type","text/event-stream")],Body::from_stream(async_stream::stream! {
                yield Ok::<_,Infallible>(Bytes::from(format!("data: {}\n\n",json!({"choices":[{"index":0,"delta":{"content":"synthetic"},"finish_reason":null}]}))));
                tokio::time::sleep(if short {Duration::from_millis(600)} else {Duration::from_secs(30)}).await;
                yield Ok(Bytes::from(format!("data: {}\n\ndata: [DONE]\n\n",json!({"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}))));
            })).into_response()
        }
    }));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let upstream_port = listener.local_addr().unwrap().port();
    let upstream = tokio::spawn(async move {
        axum::serve(listener, router).await.unwrap();
    });
    let temp = tempfile::Builder::new()
        .prefix("tagma-p0-drain-")
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
    config
        .save_provider(SaveProvider {
            protocol_version: 1,
            expected_revision: 1,
            id: None,
            name: "owned drain fixture".into(),
            protocol: ProviderProtocol::OpenaiChatCompletions,
            base_url: format!("http://127.0.0.1:{upstream_port}/v1"),
            enabled: true,
            models: vec!["drain-model".into()],
            credential: None,
        })
        .unwrap();
    let manager = Arc::new(GatewayManager::new(
        temp.path(),
        std::path::Path::new(env!("CARGO_BIN_EXE_tagma-gateway")),
    ));
    let client = reqwest::Client::builder()
        .no_proxy()
        .timeout(Duration::from_secs(15))
        .build()
        .unwrap();
    let endpoint = format!("http://127.0.0.1:{port}/v1/chat/completions");
    for prompt in ["finish", "hold"] {
        manager.start(port).await.unwrap();
        let body = json!({"model":"drain-model","stream":true,"messages":[{"role":"user","content":prompt}]});
        let mut response = client.post(&endpoint).json(&body).send().await.unwrap();
        assert_eq!(response.status(), 200);
        assert!(response.chunk().await.unwrap().is_some());
        let before = count.load(Ordering::SeqCst);
        let owner = manager.clone();
        let start = Instant::now();
        let stopping = tokio::spawn(async move { owner.stop().await });
        tokio::time::sleep(Duration::from_millis(100)).await;
        let rejected = client.post(&endpoint).json(&body).send().await;
        assert!(rejected.is_err() || rejected.unwrap().status().as_u16() == 503);
        let tail = response.text().await.unwrap();
        stopping.await.unwrap().unwrap();
        assert_eq!(
            count.load(Ordering::SeqCst),
            before,
            "new upstream dispatch after stop"
        );
        if prompt == "finish" {
            assert!(tail.contains("[DONE]"), "admitted stream must finish");
            assert!(start.elapsed() >= Duration::from_millis(350));
            assert!(start.elapsed() < Duration::from_secs(4));
        } else {
            assert!(tail.contains("GATEWAY_STOPPING"));
            assert!(!tail.contains("[DONE]"));
            assert!(start.elapsed() >= Duration::from_millis(9900));
            assert!(start.elapsed() < Duration::from_secs(13));
        }
        assert!(!temp.path().join("runtime.json").exists());
    }
    upstream.abort();
    let _ = upstream.await;
    drop(manager);
    drop(config);
    temp.close().unwrap();
}
