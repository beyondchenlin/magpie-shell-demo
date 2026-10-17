use axum::{
    Json, Router,
    body::{Body, Bytes},
    extract::Request,
    http::StatusCode,
    response::IntoResponse,
    routing::post,
};
use serde_json::{Value, json};
use std::{
    convert::Infallible,
    sync::{
        Arc,
        atomic::{AtomicBool, AtomicUsize, Ordering},
    },
    time::Duration,
};
use tagma_core::{
    ConfigService, ProviderProtocol, SaveGateway, SaveProvider, credentials::SystemCredentials,
};
use tagma_runtime::GatewayManager;

struct Dropped(Arc<AtomicBool>);
impl Drop for Dropped {
    fn drop(&mut self) {
        self.0.store(true, Ordering::SeqCst);
    }
}

#[tokio::test]
async fn real_gateway_text_contract_streaming_snapshot_pin_and_client_cancel() {
    let calls = Arc::new(AtomicUsize::new(0));
    let cancelled = Arc::new(AtomicBool::new(false));
    let server_calls = calls.clone();
    let server_cancelled = cancelled.clone();
    let upstream=Router::new().fallback(post(move |request:Request| {
        let calls=server_calls.clone(); let cancelled=server_cancelled.clone();
        async move {
            calls.fetch_add(1,Ordering::SeqCst);
            let secondary=request.uri().path().starts_with("/second/");
            let bytes=axum::body::to_bytes(request.into_body(),128*1024).await.unwrap();
            let input:Value=serde_json::from_slice(&bytes).unwrap();
            let prompt=input["messages"][0]["content"].as_str().unwrap();
            if prompt=="error" { return (StatusCode::TOO_MANY_REQUESTS,"upstream-private-error-body").into_response(); }
            if !input["stream"].as_bool().unwrap_or(false) { return Json(json!({"id":"test","object":"chat.completion","model":"test-model","choices":[{"index":0,"message":{"role":"assistant","content":if secondary{"secondary"}else{"你好"}},"finish_reason":"stop"}],"usage":{"prompt_tokens":2,"completion_tokens":1,"total_tokens":3}})).into_response(); }
            let content=json!({"choices":[{"index":0,"delta":{"content":"你好"},"finish_reason":null}]}).to_string();
            let first=format!("data: {content}\r\n\r\n");
            if prompt=="cancel" {
                let guard=Dropped(cancelled);
                return ([("content-type","text/event-stream")],Body::from_stream(async_stream::stream! {
                    let _guard=guard;
                    yield Ok::<_,Infallible>(Bytes::from(first));
                    loop { tokio::time::sleep(Duration::from_millis(30)).await; yield Ok(Bytes::from_static(b": ping\n\n")); }
                })).into_response();
            }
            let truncated=prompt=="broken";
            let frames=format!("{first}{}",if truncated { String::new() } else { format!("data: {}\n\ndata: [DONE]\n\n",json!({"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]})) });
            ([("content-type","text/event-stream")],Body::from_stream(async_stream::stream! {
                for chunk in frames.as_bytes().chunks(5) { yield Ok::<_,Infallible>(Bytes::copy_from_slice(chunk)); tokio::time::sleep(Duration::from_millis(1)).await; }
            })).into_response()
        }
    }));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let upstream_port = listener.local_addr().unwrap().port();
    let server = tokio::spawn(async move {
        axum::serve(listener, upstream).await.unwrap();
    });
    let temp = tempfile::tempdir().unwrap();
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
    let provider = |revision, base_url| SaveProvider {
        protocol_version: 1,
        expected_revision: revision,
        id: None,
        name: format!("fixture {revision}"),
        protocol: ProviderProtocol::OpenaiChatCompletions,
        base_url,
        enabled: true,
        models: vec!["test-model".into()],
        credential: None,
    };
    config
        .save_provider(provider(1, format!("http://127.0.0.1:{upstream_port}/v1")))
        .unwrap();
    config
        .save_provider(provider(
            2,
            format!("http://127.0.0.1:{upstream_port}/second/v1"),
        ))
        .unwrap();
    let manager = GatewayManager::new(
        temp.path(),
        std::path::Path::new(env!("CARGO_BIN_EXE_tagma-gateway")),
    );
    manager.start(gateway_port).await.unwrap();
    let client = reqwest::Client::builder().no_proxy().build().unwrap();
    let base = format!("http://127.0.0.1:{gateway_port}/v1");
    let endpoint = format!("{base}/chat/completions");
    let input = |prompt, stream| json!({"model":"test-model","messages":[{"role":"user","content":prompt}],"stream":stream});
    let models: Value = client
        .get(format!("{base}/models"))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(models["data"].as_array().unwrap().len(), 1);
    assert!(config.view().unwrap().model_health.is_empty());
    assert_eq!(
        calls.load(Ordering::SeqCst),
        0,
        "Reading the local directory must not generate upstream probes"
    );
    let result = client
        .post(&endpoint)
        .json(&input("normal", false))
        .send()
        .await
        .unwrap();
    assert_eq!(result.headers()["x-tagma-config-revision"], "3");
    let result: Value = result.json().await.unwrap();
    assert_eq!(result["choices"][0]["message"]["content"], "你好");
    assert_eq!(result["usage"]["total_tokens"], 3);
    tokio::time::timeout(Duration::from_secs(2), async {
        loop {
            if config
                .view()
                .unwrap()
                .model_health
                .iter()
                .any(|record| record.inference == tagma_core::health::InferenceHealth::Ready)
            {
                break;
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    })
    .await
    .expect("Real complete response must persist model health");
    let stream = client
        .post(&endpoint)
        .json(&input("normal", true))
        .send()
        .await
        .unwrap()
        .text()
        .await
        .unwrap();
    assert!(stream.contains("你好"));
    assert!(stream.ends_with("data: [DONE]\n\n"));
    let count = calls.load(Ordering::SeqCst);
    let mut unsupported = input("normal", true);
    unsupported["tools"] = json!([]);
    assert_eq!(
        client
            .post(&endpoint)
            .json(&unsupported)
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::BAD_REQUEST
    );
    assert_eq!(calls.load(Ordering::SeqCst), count);
    let rejected = client
        .post(&endpoint)
        .json(&input("error", true))
        .send()
        .await
        .unwrap();
    assert_eq!(rejected.status(), StatusCode::TOO_MANY_REQUESTS);
    let rejected = rejected.text().await.unwrap();
    assert!(rejected.contains("UPSTREAM_RATE_LIMITED"));
    assert!(!rejected.contains("private-error"));
    tokio::time::timeout(Duration::from_secs(2), async {
        loop {
            if config.view().unwrap().model_health.iter().any(|record| {
                record.inference == tagma_core::health::InferenceHealth::Failed
                    && record.failure == Some(tagma_core::health::HealthFailure::RateLimited)
            }) {
                break;
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    })
    .await
    .expect("Real upstream failure must invalidate fresh model health");
    let broken = client
        .post(&endpoint)
        .json(&input("broken", true))
        .send()
        .await
        .unwrap()
        .text()
        .await
        .unwrap();
    assert!(broken.contains("你好"));
    assert!(broken.contains("UPSTREAM_STREAM_INTERRUPTED"));
    assert!(!broken.contains("[DONE]"));
    let health_baseline_snapshot = config.read_snapshot().unwrap().1;
    let first_id = health_baseline_snapshot.providers[0].provider.id.clone();
    let before_cancel_success =
        ConfigService::read_runtime_health(temp.path(), &health_baseline_snapshot)
            .unwrap()
            .iter()
            .find(|record| record.provider_id == first_id)
            .unwrap()
            .inference_succeeded_ms;
    let mut in_flight = client
        .post(&endpoint)
        .json(&input("cancel", true))
        .send()
        .await
        .unwrap();
    assert!(in_flight.chunk().await.unwrap().is_some());
    let old = config.view().unwrap().providers[0].clone();
    config
        .save_provider(SaveProvider {
            protocol_version: 1,
            expected_revision: 3,
            id: Some(old.id),
            name: old.name,
            protocol: old.protocol,
            base_url: old.base_url,
            enabled: false,
            models: old.models,
            credential: None,
        })
        .unwrap();
    manager.apply().await.unwrap();
    assert_eq!(in_flight.headers()["x-tagma-config-revision"], "3");
    let switched = client
        .post(&endpoint)
        .json(&input("normal", false))
        .send()
        .await
        .unwrap();
    assert_eq!(switched.headers()["x-tagma-config-revision"], "4");
    let switched: Value = switched.json().await.unwrap();
    assert_eq!(switched["choices"][0]["message"]["content"], "secondary");
    drop(in_flight);
    tokio::time::timeout(Duration::from_secs(3), async {
        while !cancelled.load(Ordering::SeqCst) {
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
    })
    .await
    .expect("upstream must close after client disconnect");
    let after_cancel_success =
        ConfigService::read_runtime_health(temp.path(), &health_baseline_snapshot)
            .unwrap()
            .iter()
            .find(|record| record.provider_id == first_id)
            .unwrap()
            .inference_succeeded_ms;
    assert_eq!(
        before_cancel_success, after_cancel_success,
        "A cancelled partial stream must not refresh successful-inference health"
    );
    assert_eq!(
        client
            .get(format!("{base}/models"))
            .header("origin", "https://untrusted.example")
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        client
            .get(format!("{base}/models"))
            .header("host", format!("untrusted.example:{gateway_port}"))
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        client
            .post(&endpoint)
            .header("x-tagma-expected-revision", "3")
            .json(&input("normal", false))
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::CONFLICT
    );
    assert_eq!(
        client
            .post(&endpoint)
            .header("content-type", "application/json")
            .body("x".repeat(128 * 1024 + 1))
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::PAYLOAD_TOO_LARGE
    );
    assert_eq!(
        client
            .post(format!("{base}/responses"))
            .json(&json!({}))
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::NOT_IMPLEMENTED
    );
    let mut occupied = Vec::new();
    for _ in 0..8 {
        let mut response = client
            .post(&endpoint)
            .json(&input("cancel", true))
            .send()
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        assert!(response.chunk().await.unwrap().is_some());
        occupied.push(response);
    }
    let count = calls.load(Ordering::SeqCst);
    let busy = client
        .post(&endpoint)
        .json(&input("normal", false))
        .send()
        .await
        .unwrap();
    assert_eq!(busy.status(), StatusCode::TOO_MANY_REQUESTS);
    assert!(busy.text().await.unwrap().contains("GATEWAY_BUSY"));
    assert_eq!(calls.load(Ordering::SeqCst), count);
    drop(occupied);
    manager.stop().await.unwrap();
    server.abort();
    let _ = server.await;
}
