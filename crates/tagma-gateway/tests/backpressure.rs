//! Owned raw slow-reader fixtures; never control a desktop or real provider.
use axum::{
    Router,
    body::{Body, Bytes},
    routing::post,
};
use futures_util::FutureExt;
use serde_json::json;
use std::{
    convert::Infallible,
    path::Path,
    sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    },
    time::Duration,
};
use tagma_core::{credentials::SystemCredentials, timeouts::*, *};
use tagma_runtime::GatewayManager;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
struct Server(tokio::task::JoinHandle<()>);
impl Drop for Server {
    fn drop(&mut self) {
        self.0.abort();
    }
}
struct Closed(Arc<AtomicUsize>);
impl Drop for Closed {
    fn drop(&mut self) {
        self.0.fetch_add(1, Ordering::SeqCst);
    }
}
struct Fixture {
    manager: GatewayManager,
    config: ConfigService,
    provider: String,
    port: u16,
    closed: Arc<AtomicUsize>,
    produced: Arc<AtomicUsize>,
    _server: Server,
    temp: tempfile::TempDir,
}
impl Fixture {
    async fn start(total_ms: u32) -> Self {
        let closed = Arc::new(AtomicUsize::new(0));
        let produced = Arc::new(AtomicUsize::new(0));
        let upstream = Router::new().fallback(post({
            let closed = closed.clone(); let produced = produced.clone();
            move || { let closed = closed.clone(); let produced = produced.clone(); async move {
                let guard = Closed(closed);
                let event = Bytes::from(format!("data: {}\n\n", json!({"choices":[{"index":0,"delta":{"role":"assistant","content":"x".repeat(32768)},"finish_reason":null}]})));
                ([("content-type", "text/event-stream")], Body::from_stream(async_stream::stream! {
                    let _guard = guard;
                    // Streaming clones share a single 32KiB allocation. No body is written to disk.
                    for _ in 0..1024 {
                        produced.fetch_add(event.len(), Ordering::SeqCst);
                        yield Ok::<_, Infallible>(event.clone());
                        tokio::task::yield_now().await;
                    }
                    tokio::time::sleep(Duration::from_secs(5)).await;
                }))
            }}
        }));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let up = listener.local_addr().unwrap().port();
        let server = Server(tokio::spawn(async move {
            axum::serve(listener, upstream).await.unwrap();
        }));
        let temp = tempfile::Builder::new()
            .prefix("tagma-slow-client-")
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
        let provider = config
            .save_provider(SaveProvider {
                protocol_version: 1,
                expected_revision: 1,
                id: None,
                name: "owned slow reader fixture".into(),
                protocol: ProviderProtocol::OpenaiChatCompletions,
                base_url: format!("http://127.0.0.1:{up}/v1"),
                enabled: true,
                models: vec!["slow-model".into()],
                credential: None,
            })
            .unwrap()
            .providers[0]
            .id
            .clone();
        config
            .save_provider_timeouts(SaveProviderTimeouts {
                protocol_version: 1,
                expected_revision: 2,
                id: provider.clone(),
                timeouts: ProviderTimeouts {
                    connect_ms: 100,
                    first_response_ms: 500,
                    idle_ms: 500,
                    total_ms,
                },
            })
            .unwrap();
        let manager =
            GatewayManager::new(temp.path(), Path::new(env!("CARGO_BIN_EXE_tagma-gateway")));
        manager.start(port).await.unwrap();
        Self {
            manager,
            config,
            provider,
            port,
            closed,
            produced,
            _server: server,
            temp,
        }
    }
    async fn client(&self) -> (tokio::net::TcpStream, String) {
        let socket = tokio::net::TcpSocket::new_v4().unwrap();
        socket.set_recv_buffer_size(1024).unwrap();
        let mut client = socket
            .connect(format!("127.0.0.1:{}", self.port).parse().unwrap())
            .await
            .unwrap();
        let body = serde_json::to_vec(&json!({"model":"slow-model","messages":[{"role":"user","content":"owned slow receiver"}],"stream":true})).unwrap();
        client.write_all(format!("POST /v1/chat/completions HTTP/1.1\r\nHost: 127.0.0.1:{}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n", self.port, body.len()).as_bytes()).await.unwrap();
        client.write_all(&body).await.unwrap();
        let mut headers = Vec::new();
        tokio::time::timeout(Duration::from_secs(3), async {
            let mut byte = [0u8; 1];
            while !headers.ends_with(b"\r\n\r\n") {
                assert_eq!(client.read(&mut byte).await.unwrap(), 1);
                headers.push(byte[0]);
                assert!(headers.len() < 8192);
            }
        })
        .await
        .unwrap();
        let headers = String::from_utf8(headers).unwrap();
        if !headers.starts_with("HTTP/1.1 200") {
            let mut failure = Vec::new();
            let _ = tokio::time::timeout(Duration::from_secs(2), (&mut client).take(8192).read_to_end(&mut failure)).await;
            panic!("{headers}{}", String::from_utf8_lossy(&failure));
        }
        assert!(headers.starts_with("HTTP/1.1 200"), "{headers}");
        let id = headers
            .lines()
            .find_map(|line| {
                let (key, value) = line.split_once(':')?;
                key.eq_ignore_ascii_case("x-tagma-request-id")
                    .then(|| value.trim().to_owned())
            })
            .unwrap();
        (client, id)
    }
    async fn record(&self, id: &str) -> usage::read::UsageDetailsView {
        tagma_runtime::usage::UsageReader::default()
            .details(
                self.temp.path(),
                usage::read::UsageDetailsQuery {
                    protocol_version: 1,
                    request_id: id.into(),
                },
            )
            .await
            .unwrap()
    }
    async fn wait_closed(&self, count: usize) {
        tokio::time::timeout(Duration::from_secs(2), async {
            while self.closed.load(Ordering::SeqCst) != count {
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
        })
        .await
        .unwrap();
    }
    async fn stop(&self, result: Result<(), Box<dyn std::any::Any + Send>>) {
        let stopped = self.manager.stop().await;
        if let Err(error) = result {
            std::panic::resume_unwind(error);
        }
        stopped.unwrap();
    }
}

#[tokio::test]
async fn stalled_downstream_cannot_suspend_upstream_budget_and_settlement() {
    let f = Fixture::start(700).await;
    let result = std::panic::AssertUnwindSafe(async {
        let (mut client,id) = f.client().await;
        // Keep the actual TCP peer alive but stop draining its response body.
        tokio::time::sleep(Duration::from_millis(1500)).await;
        let detail = f.record(&id).await;
        assert_eq!(detail.attempts.len(), 1);
        assert_eq!(detail.attempts[0].error_code.as_deref(), Some("REQUEST_BUDGET_EXCEEDED"));
        let row = detail.record.unwrap();
        println!("Slow reader after1500ms for total700ms:upstream_closed={},produced_bytes={},record_state={:?},error={:?}", f.closed.load(Ordering::SeqCst), f.produced.load(Ordering::SeqCst), row.state, row.error_code);
        assert_eq!(f.closed.load(Ordering::SeqCst),1,"budget must close upstream without downstream polling");
        assert_eq!(row.state,usage::read::UsageRecordState::Failed);
        assert_eq!(row.error_code.as_deref(),Some("REQUEST_BUDGET_EXCEEDED"));
        assert_eq!(row.input_tokens,None); assert_eq!(row.output_tokens,None);
        // Resume the same socket: pending data precedes exactly one failure, never DONE.
        let mut bytes = Vec::new();
        tokio::time::timeout(Duration::from_secs(6), (&mut client).take(8*1024*1024+1).read_to_end(&mut bytes)).await.unwrap().unwrap();
        assert!(bytes.len()<=8*1024*1024);
        let text=String::from_utf8(bytes).unwrap();
        assert_eq!(text.matches("\"code\":\"REQUEST_BUDGET_EXCEEDED\"").count(),1);
        assert!(!text.contains("[DONE]"));
        println!("Same stalled socket resumed:bounded partial body then exactly one budget error,noDONE;settlement already visible before resume");
    }).catch_unwind().await;
    f.stop(result).await;
}

#[tokio::test]
async fn stalled_readers_retain_all_slots_but_cannot_suspend_confirmed_revocation() {
    let f = Fixture::start(8000).await;
    let result = std::panic::AssertUnwindSafe(async {
        let mut clients=Vec::new(); let mut ids=Vec::new();
        for _ in 0..tagma_core::DEFAULT_HTTP_CONCURRENCY { let (client,id)=f.client().await; clients.push(client); ids.push(id); }
        tokio::time::sleep(Duration::from_millis(200)).await;
        let http=reqwest::Client::builder().no_proxy().timeout(Duration::from_secs(3)).build().unwrap();
        let endpoint=format!("http://127.0.0.1:{}/v1/models",f.port);
        let response=http.get(&endpoint).send().await.unwrap();
        assert_eq!(response.status(),429); assert!(response.text().await.unwrap().contains("GATEWAY_BUSY"));
        let receipt=f.config.revoke_access(security::RevokeAccess {
            protocol_version:1, expected_revision:3, kind:security::RevokeKind::ProviderConnection,
            provider_id:Some(f.provider.clone()), cancel_inflight:true,
        }).unwrap();
        assert_eq!(f.manager.confirm_security(receipt.revision).await.unwrap().security_revision,Some(receipt.revision));
        f.wait_closed(tagma_core::DEFAULT_HTTP_CONCURRENCY).await;
        for id in &ids {
            let detail = tokio::time::timeout(Duration::from_secs(2), async {
                loop {
                    let detail = f.record(id).await;
                    if detail.record.as_ref().unwrap().state != usage::read::UsageRecordState::Running { break detail; }
                    tokio::time::sleep(Duration::from_millis(10)).await;
                }
            }).await.unwrap();
            let row=detail.record.unwrap();
            assert_eq!(row.state,usage::read::UsageRecordState::Cancelled);
            assert_eq!(row.error_code.as_deref(),Some("ACCESS_REVOKED"));
            assert_eq!(detail.attempts.len(),1);
            assert_eq!(detail.attempts[0].error_code.as_deref(),Some("ACCESS_REVOKED"));
        }
        assert_eq!(http.get(&endpoint).send().await.unwrap().status(),429,"settled upstreams must not release downstream permits");
        drop(clients);
        tokio::time::timeout(Duration::from_secs(2),async {
            loop { if http.get(&endpoint).send().await.unwrap().status()==200 { break; } tokio::time::sleep(Duration::from_millis(10)).await; }
        }).await.unwrap();
        println!("{} real stalled TCP readers:extra request429;private revoke(true) acknowledged,all upstreams closed and logical/attempt rows ACCESS_REVOKED;slots still429 until downstream sockets dropped,then200",tagma_core::DEFAULT_HTTP_CONCURRENCY);
    }).catch_unwind().await;
    f.stop(result).await;
}
