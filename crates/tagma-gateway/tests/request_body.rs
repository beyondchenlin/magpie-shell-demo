//! Actual owned HTTP/1.1 incomplete/drip bodies; no desktop or provider credentials.
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
        atomic::{AtomicUsize, Ordering},
    },
    time::Duration,
};
use tagma_core::{
    ConfigService, ProviderProtocol, SaveGateway, SaveProvider, credentials::SystemCredentials,
};
use tagma_runtime::GatewayManager;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
struct Task(tokio::task::JoinHandle<()>);
impl Drop for Task {
    fn drop(&mut self) {
        self.0.abort();
    }
}
struct Partial {
    reader: tokio::net::tcp::OwnedReadHalf,
    writer: Option<tokio::net::tcp::OwnedWriteHalf>,
}
impl Partial {
    fn drip(&mut self) -> (Task, Arc<AtomicUsize>) {
        let mut writer = self.writer.take().unwrap();
        let count = Arc::new(AtomicUsize::new(0));
        let sent = count.clone();
        let task = Task(tokio::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_millis(200)).await;
                if writer.write_all(b"1\r\n \r\n").await.is_err() {
                    break;
                }
                sent.fetch_add(1, Ordering::SeqCst);
            }
        }));
        (task, count)
    }
    async fn response(&mut self) -> String {
        self.response_within(Duration::from_secs(3)).await
    }
    async fn response_within(&mut self, limit: Duration) -> String {
        let mut bytes = Vec::new();
        tokio::time::timeout(
            limit,
            (&mut self.reader).take(65537).read_to_end(&mut bytes),
        )
        .await
        .unwrap()
        .unwrap();
        assert!(bytes.len() <= 65536);
        String::from_utf8(bytes).unwrap()
    }
}
struct Fixture {
    manager: GatewayManager,
    port: u16,
    calls: Arc<AtomicUsize>,
    _server: Task,
    temp: tempfile::TempDir,
}
impl Fixture {
    async fn start() -> Self {
        let calls = Arc::new(AtomicUsize::new(0));
        let upstream=Router::new().fallback(post({
            let calls=calls.clone();
            move |request:Request| {let calls=calls.clone();async move {
                calls.fetch_add(1,Ordering::SeqCst);
                let bytes=axum::body::to_bytes(request.into_body(),128*1024).await.unwrap();
                let value:Value=serde_json::from_slice(&bytes).unwrap();
                if value["stream"]==true {
                    return ([("content-type","text/event-stream")],Body::from_stream(async_stream::stream! {
                        yield Ok::<_,Infallible>(Bytes::from_static(b"data: {\"choices\":[{\"index\":0,\"delta\":{\"content\":\"owned first\"},\"finish_reason\":null}]}\n\n"));
                        tokio::time::sleep(Duration::from_secs(11)).await;
                        yield Ok(Bytes::from_static(b"data: {\"choices\":[{\"index\":0,\"delta\":{},\"finish_reason\":\"stop\"}]}\n\ndata: [DONE]\n\n"));
                    })).into_response();
                }
                Json(json!({"choices":[{"index":0,"message":{"role":"assistant","content":"owned valid body"},"finish_reason":"stop"}]})).into_response()
            }}
        }));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let up = listener.local_addr().unwrap().port();
        let server = Task(tokio::spawn(async move {
            axum::serve(listener, upstream).await.unwrap();
        }));
        let temp = tempfile::Builder::new()
            .prefix("tagma-request-body-")
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
                name: "owned body fixture".into(),
                protocol: ProviderProtocol::OpenaiChatCompletions,
                base_url: format!("http://127.0.0.1:{up}/v1"),
                enabled: true,
                models: vec!["body-model".into()],
                credential: None,
            })
            .unwrap();
        let manager =
            GatewayManager::new(temp.path(), Path::new(env!("CARGO_BIN_EXE_tagma-gateway")));
        manager.start(port).await.unwrap();
        Self {
            manager,
            port,
            calls,
            _server: server,
            temp,
        }
    }
    fn url(&self, path: &str) -> String {
        format!("http://127.0.0.1:{}/v1/{path}", self.port)
    }
    fn http(&self) -> reqwest::Client {
        reqwest::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(16))
            .build()
            .unwrap()
    }
    async fn partial(&self, chunked: bool) -> Partial {
        let mut socket = tokio::net::TcpStream::connect(("127.0.0.1", self.port))
            .await
            .unwrap();
        let framing = if chunked {
            "Transfer-Encoding: chunked"
        } else {
            "Content-Length: 4096"
        };
        socket.write_all(format!("POST /v1/chat/completions HTTP/1.1\r\nHost: 127.0.0.1:{}\r\nContent-Type: application/json\r\n{framing}\r\n\r\n",self.port).as_bytes()).await.unwrap();
        socket
            .write_all(if chunked { b"1\r\n{\r\n" } else { b"{" })
            .await
            .unwrap();
        let (reader, writer) = socket.into_split();
        Partial {
            reader,
            writer: Some(writer),
        }
    }
    fn no_dispatch(&self) {
        assert_eq!(self.calls.load(Ordering::SeqCst), 0);
        let db = rusqlite::Connection::open_with_flags(
            self.temp.path().join("usage.sqlite3"),
            rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
        )
        .unwrap();
        for table in ["usage_requests", "usage_attempts"] {
            assert_eq!(
                db.query_row(&format!("SELECT count(*) FROM {table}"), [], |row| row
                    .get::<_, i64>(0))
                    .unwrap(),
                0
            );
        }
    }
    async fn status(&self) -> u16 {
        self.http()
            .get(self.url("models"))
            .send()
            .await
            .unwrap()
            .status()
            .as_u16()
    }
    async fn wait_status(&self, status: u16) {
        // Allow loopback connections to settle under busy Windows test runs;
        // this observation budget does not relax the gateway's 10s body deadline.
        tokio::time::timeout(Duration::from_secs(5), async {
            loop {
                if self.status().await == status {
                    break;
                }
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
        })
        .await
        .unwrap();
    }
    async fn finish(&self, result: Result<(), Box<dyn std::any::Any + Send>>) {
        let stopped = if self.manager.owned_process_id().await.is_some() {
            self.manager.stop().await.map(|_| ())
        } else {
            Ok(())
        };
        if let Err(error) = result {
            std::panic::resume_unwind(error);
        }
        stopped.unwrap();
    }
}
#[tokio::test]
async fn incomplete_and_drip_bodies_expire_without_dispatch_and_release_slots() {
    let f = Fixture::start().await;
    let result=std::panic::AssertUnwindSafe(async{
        let mut clients=Vec::new();
        for index in 0..tagma_core::DEFAULT_HTTP_CONCURRENCY{clients.push(f.partial(index>=tagma_core::DEFAULT_HTTP_CONCURRENCY/2).await);}
        let mut drip_client=clients.pop().unwrap();
        let (drip,drip_count)=drip_client.drip();
        // Read while the peer still drips. Writing after the server closes can
        // reset a Windows socket and erase a response left unread until 11s.
        let (sender,receiver)=tokio::sync::oneshot::channel();
        let read_task=Task(tokio::spawn(async move {
            let response=drip_client.response_within(Duration::from_secs(13)).await;
            let _=sender.send(response);
        }));
        f.wait_status(429).await;f.no_dispatch();
        tokio::time::sleep(Duration::from_millis(11000)).await;
        let status=f.status().await;
        println!("{} incomplete raw TCP bodies(half content-length/half chunked,one drips each200ms):after11s models_status={status},upstream_calls={}",tagma_core::DEFAULT_HTTP_CONCURRENCY,f.calls.load(Ordering::SeqCst));
        assert_eq!(status,200,"absolute request-body deadline must expire even if bytes keep arriving");
        for client in &mut clients{
            let response=client.response().await;
            assert!(response.starts_with("HTTP/1.1 408"),"{response}");
            assert!(response.to_ascii_lowercase().contains("connection: close"));
            assert_eq!(response.matches("HTTP/1.1 ").count(),1);
            assert!(response.contains("REQUEST_BODY_TIMEOUT"));
            assert!(!response.contains("x-tagma-request-id"));
        }
        let response=receiver.await.unwrap();
        assert!(drip_count.load(Ordering::SeqCst)>=40,"drip must continue through at least8s of the absolute10s deadline");
        assert!(response.starts_with("HTTP/1.1 408"),"{response}");
        assert!(response.contains("REQUEST_BODY_TIMEOUT"));
        assert!(response.to_ascii_lowercase().contains("connection: close"));
        assert_eq!(response.matches("HTTP/1.1 ").count(),1);
        drop(read_task);
        drop(drip);f.no_dispatch();
        println!("All{} bodies:408 REQUEST_BODY_TIMEOUT/Connection close/EOF,0upstream and0usage registrations;drips={} do not extend deadline,slots released before idle readers consume errors",tagma_core::DEFAULT_HTTP_CONCURRENCY,drip_count.load(Ordering::SeqCst));
    }).catch_unwind().await;
    f.finish(result).await;
}
#[tokio::test]
async fn partial_disconnect_releases_slot_and_private_stop_interrupts_body_reads() {
    let f = Fixture::start().await;
    let result=std::panic::AssertUnwindSafe(async{
        let mut clients=Vec::new();for _ in 0..tagma_core::DEFAULT_HTTP_CONCURRENCY{clients.push(f.partial(false).await);}
        f.wait_status(429).await;
        drop(clients.pop());f.wait_status(200).await;
        clients.push(f.partial(true).await);f.wait_status(429).await;f.no_dispatch();
        let started=tokio::time::Instant::now();f.manager.stop().await.unwrap();let elapsed=started.elapsed();
        println!("{} partial bodies:peer disconnect frees1slot;replacement saturates;private owned stop completed in{}ms,upstream0",tagma_core::DEFAULT_HTTP_CONCURRENCY,elapsed.as_millis());
        assert!(elapsed<Duration::from_secs(3),"body waits must observe shutdown instead of waiting for forced10s kill");
        for client in &mut clients{
            let response=client.response().await;
            assert!(response.starts_with("HTTP/1.1 503"),"{response}");
            assert!(response.contains("GATEWAY_STOPPING"));
            assert!(response.to_ascii_lowercase().contains("connection: close"));
        }
        f.no_dispatch();
    }).catch_unwind().await;
    f.finish(result).await;
}
#[tokio::test]
async fn bounded_json_read_keeps_media_size_errors_and_does_not_timeout_long_sse() {
    let f = Fixture::start().await;
    let result=std::panic::AssertUnwindSafe(async{
        let client=f.http();let endpoint=f.url("chat/completions");
        for (body,content,status,code) in [("{".to_owned(),"application/json",400,"INVALID_REQUEST"),("{}".to_owned(),"text/plain",415,"INVALID_REQUEST"),(" ".repeat(128*1024+1),"application/json",413,"REQUEST_TOO_LARGE")]{
            let response=client.post(&endpoint).header("content-type",content).body(body).send().await.unwrap();
            assert_eq!(response.status(),status);assert!(response.text().await.unwrap().contains(code));
        }
        let chunks=futures_util::stream::iter([Ok::<_,std::io::Error>(Bytes::from(vec![b' ';128*1024+1]))]);
        let response=client.post(&endpoint).header("content-type","application/json").body(reqwest::Body::wrap_stream(chunks)).send().await.unwrap();
        assert_eq!(response.status(),413);assert!(response.text().await.unwrap().contains("REQUEST_TOO_LARGE"));
        f.no_dispatch();
        let started=tokio::time::Instant::now();
        let mut response=client.post(&endpoint).json(&json!({"model":"body-model","messages":[{"role":"user","content":"owned long stream"}],"stream":true})).send().await.unwrap();
        assert_eq!(response.status(),200);let first=response.chunk().await.unwrap().unwrap();assert!(String::from_utf8_lossy(&first).contains("owned first"));
        let rest=response.text().await.unwrap();assert!(rest.ends_with("data: [DONE]\n\n"));assert!(started.elapsed()>=Duration::from_secs(11));assert_eq!(f.calls.load(Ordering::SeqCst),1);
        println!("Actual JSON400/media415/content-length and chunked128KiB+1=>413 with0dispatch;valid body starts SSE immediately and completes after11s withDONE,body10s deadline never wraps inference/response");
    }).catch_unwind().await;
    f.finish(result).await;
}
