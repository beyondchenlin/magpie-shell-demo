//! Opt-in, real-binary NFR-03 measurement. No native desktop acceptance is implied.
use axum::{Router, routing::post};
use serde_json::json;
use std::{sync::Arc, time::Instant};
use tagma_core::{
    ConfigService, ProviderProtocol, SaveGateway, SaveProvider, credentials::SystemCredentials,
};
use tagma_runtime::GatewayManager;

async fn first_chunk(client: &reqwest::Client, endpoint: &str) -> Result<f64, String> {
    let start = Instant::now();
    let mut response = client.post(endpoint).json(&json!({"model":"perf-model","stream":true,"messages":[{"role":"user","content":"Owned loopback performance fixture"}]}))
        .send().await.map_err(|e| e.to_string())?;
    if response.status() != 200 {
        return Err(format!("HTTP {}", response.status()));
    }
    let first = response
        .chunk()
        .await
        .map_err(|e| e.to_string())?
        .ok_or("missing first body chunk")?;
    let elapsed = start.elapsed().as_secs_f64() * 1000.0;
    let mut body = first.to_vec();
    while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
        if body.len() + chunk.len() > 8192 {
            return Err("fixture response oversized".into());
        }
        body.extend_from_slice(&chunk);
    }
    if !String::from_utf8_lossy(&body).contains("[DONE]") {
        return Err("incomplete SSE".into());
    }
    Ok(elapsed)
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[ignore = "manual NFR-03; writes only a caller-selected task-owned report"]
async fn thousand_requests_at_ten_concurrency_against_loopback() {
    let report =
        std::path::PathBuf::from(std::env::var("TAGMA_PERF_REPORT").expect("owned report path"));
    assert_eq!(
        std::fs::read_to_string(report.parent().unwrap().join("owner.txt")).unwrap(),
        "tagma-p0-s14/closure/v1"
    );
    assert!(!report.exists(), "preserve previous measurements");
    let server = Router::new().route("/v1/chat/completions", post(|| async {
        ([("content-type", "text/event-stream")], "data: {\"choices\":[{\"index\":0,\"delta\":{\"role\":\"assistant\",\"content\":\"fixture\"},\"finish_reason\":null}]}\n\ndata: {\"choices\":[{\"index\":0,\"delta\":{},\"finish_reason\":\"stop\"}]}\n\ndata: [DONE]\n\n")
    }));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let upstream_port = listener.local_addr().unwrap().port();
    let upstream = tokio::spawn(async move {
        axum::serve(listener, server).await.unwrap();
    });
    let temp = tempfile::Builder::new()
        .prefix("tagma-nfr03-")
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
            name: "Owned performance fixture".into(),
            protocol: ProviderProtocol::OpenaiChatCompletions,
            base_url: format!("http://127.0.0.1:{upstream_port}/v1"),
            models: vec!["perf-model".into()],
            enabled: true,
            credential: None,
        })
        .unwrap();
    let executable = std::path::Path::new(env!("CARGO_BIN_EXE_tagma-gateway"));
    let manager = GatewayManager::new(temp.path(), executable);
    manager.start(port).await.unwrap();
    let client = reqwest::Client::builder()
        .no_proxy()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap();
    let mut work = tokio::task::JoinSet::new();
    let started = tagma_core::health::now_ms().unwrap();
    for worker in 0..10 {
        let client = client.clone();
        work.spawn(async move {
            let mut rows = Vec::new();
            for run in 0..100 {
                let index = worker * 100 + run;
                let direct = format!("http://127.0.0.1:{upstream_port}/v1/chat/completions");
                let gateway = format!("http://127.0.0.1:{port}/v1/chat/completions");
                let (d, g) = if index % 2 == 0 {
                    let d = first_chunk(&client, &direct).await;
                    let g = first_chunk(&client, &gateway).await;
                    (d, g)
                } else {
                    let g = first_chunk(&client, &gateway).await;
                    let d = first_chunk(&client, &direct).await;
                    (d, g)
                };
                rows.push((index, d, g));
            }
            rows
        });
    }
    let mut pairs = Vec::new();
    let mut failures = Vec::new();
    while let Some(result) = work.join_next().await {
        match result {
            Ok(rows) => pairs.extend(rows),
            Err(e) => failures.push(e.to_string()),
        }
    }
    let ended = tagma_core::health::now_ms().unwrap();
    let stopped = manager.stop().await;
    upstream.abort();
    let _ = upstream.await;
    let mut direct = Vec::new();
    let mut gateway = Vec::new();
    let mut deltas = Vec::new();
    for (index, d, g) in &pairs {
        if let (Ok(d), Ok(g)) = (d, g) {
            direct.push(*d);
            gateway.push(*g);
            deltas.push(g - d);
        } else {
            failures.push(format!("pair {index}: direct={d:?}, gateway={g:?}"));
        }
    }
    fn p95(values: &mut [f64]) -> Option<f64> {
        values.sort_by(f64::total_cmp);
        if values.is_empty() {
            None
        } else {
            Some(values[(values.len() * 95).div_ceil(100) - 1])
        }
    }
    let direct_p95 = p95(&mut direct);
    let gateway_p95 = p95(&mut gateway);
    let overhead = p95(&mut deltas);
    let result = json!({"version":tagma_core::PRODUCT_VERSION,"optimized":!cfg!(debug_assertions),"executable":executable,"startedMs":started,"endedMs":ended,"concurrency":10,"gatewayRequests":1000,"directRequests":1000,"failures":failures,"successPairs":deltas.len(),"directFirstP95Ms":direct_p95,"gatewayFirstP95Ms":gateway_p95,"pairedOverheadP95Ms":overhead,"budgetMs":30,"method":"10 workers x100 pairs, alternating direct/gateway order, first body chunk, no warmup discarded, reqwest client, real compiled sidecar with receipt-owned temporary configuration; backend measurement only","pairs":pairs});
    std::fs::write(&report, serde_json::to_vec_pretty(&result).unwrap()).unwrap();
    println!(
        "NFR03 optimized={} successPairs={} overhead p95={overhead:?}ms",
        !cfg!(debug_assertions),
        deltas.len()
    );
    drop(manager);
    drop(config);
    temp.close().unwrap();
    stopped.unwrap();
    assert_eq!(deltas.len(), 1000, "all requests must succeed");
    assert!(
        overhead.unwrap() <= 30.0,
        "PRD NFR-03 overhead budget exceeded"
    );
}
