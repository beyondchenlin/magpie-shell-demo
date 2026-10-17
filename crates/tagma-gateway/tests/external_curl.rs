//! Version-bound external CLI interop; no SDK or Agent compatibility claim.
#![cfg(windows)]
use axum::{
    Json, Router,
    body::{Body, Bytes},
    extract::Request,
    response::IntoResponse,
    routing::post,
};
use futures_util::FutureExt;
use serde_json::{Value, json};
use std::os::windows::process::CommandExt;
use std::{
    convert::Infallible,
    path::{Path, PathBuf},
    process::Stdio,
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
    time::Duration,
};
use tagma_core::{credentials::SystemCredentials, *};
use tagma_runtime::GatewayManager;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
struct Server(tokio::task::JoinHandle<()>);
impl Drop for Server {
    fn drop(&mut self) {
        self.0.abort();
    }
}
fn curl() -> PathBuf {
    PathBuf::from(std::env::var_os("SystemRoot").unwrap()).join("System32/curl.exe")
}
fn process() -> tokio::process::Command {
    let mut command = std::process::Command::new(curl());
    command.creation_flags(0x08000000); // CREATE_NO_WINDOW: console CLI never activates a desktop window.
    let mut command = tokio::process::Command::from(command);
    command.kill_on_drop(true);
    command.arg("-q");
    command
}
fn request(url: &str, body: Option<&Value>) -> tokio::process::Command {
    let mut command = process();
    command.args([
        "--silent",
        "--show-error",
        "--noproxy",
        "*",
        "--proto",
        "=http",
        "--http1.1",
        "--retry",
        "0",
        "--max-time",
        "5",
        "--connect-timeout",
        "1",
        "--max-filesize",
        "65536",
        "--include",
        "--no-buffer",
    ]);
    if body.is_some() {
        command.args([
            "--header",
            "Content-Type: application/json",
            "--data-binary",
            "@-",
        ]);
    }
    command
        .arg(url)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    command
}
async fn start(url: &str, body: Option<&Value>) -> tokio::process::Child {
    let mut child = request(url, body).spawn().unwrap();
    let mut stdin = child.stdin.take().unwrap();
    if let Some(body) = body {
        stdin
            .write_all(&serde_json::to_vec(body).unwrap())
            .await
            .unwrap();
    }
    drop(stdin);
    child
}
fn reply(bytes: &[u8]) -> (u16, String, String) {
    assert!(bytes.len() < 65536);
    let split = bytes
        .windows(4)
        .position(|part| part == b"\r\n\r\n")
        .unwrap();
    let headers = String::from_utf8(bytes[..split].to_vec()).unwrap();
    let body = String::from_utf8(bytes[split + 4..].to_vec()).unwrap();
    let status = headers
        .lines()
        .next()
        .unwrap()
        .split_whitespace()
        .nth(1)
        .unwrap()
        .parse()
        .unwrap();
    (status, headers, body)
}
fn id(headers: &str) -> String {
    headers
        .lines()
        .find_map(|line| {
            let (key, value) = line.split_once(':')?;
            key.eq_ignore_ascii_case("x-tagma-request-id")
                .then(|| value.trim().to_owned())
        })
        .unwrap()
}
async fn invoke(url: &str, body: Option<&Value>) -> (u16, String, String) {
    let child = start(url, body).await;
    let output = tokio::time::timeout(Duration::from_secs(7), child.wait_with_output())
        .await
        .unwrap()
        .unwrap();
    assert!(
        output.status.success(),
        "curl transport failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    reply(&output.stdout)
}
fn input(prompt: &str, stream: bool) -> Value {
    json!({"model":"curl-model","messages":[{"role":"user","content":prompt}],"stream":stream})
}

#[tokio::test]
#[ignore = "Explicit version-bound Windows curl integration; owned loopback only, no UI or real provider"]
async fn windows_curl_version_bound_nonstream_live_sse_tools_and_usage() {
    let version = process().arg("--version").output().await.unwrap();
    assert!(version.status.success());
    let version = String::from_utf8(version.stdout).unwrap();
    assert!(
        version.starts_with("curl 8.13.0 (Windows)"),
        "Rebind client evidence before accepting another curl version"
    );
    let seen = Arc::new(Mutex::new(Vec::<Value>::new()));
    let release = Arc::new(tokio::sync::Notify::new());
    let final_sent = Arc::new(AtomicBool::new(false));
    let upstream=Router::new().fallback(post({let seen=seen.clone();let release=release.clone();let final_sent=final_sent.clone();move|request:Request|{let seen=seen.clone();let release=release.clone();let final_sent=final_sent.clone();async move{
        let bytes=axum::body::to_bytes(request.into_body(),128*1024).await.unwrap();let value:Value=serde_json::from_slice(&bytes).unwrap();seen.lock().unwrap().push(value.clone());
        if value.get("tools").is_some(){return Json(json!({"model":"curl-model","choices":[{"index":0,"message":{"role":"assistant","content":null,"tool_calls":[{"id":"curl_call","type":"function","function":{"name":"owned_echo","arguments":"{\"value\":\"参数\"}"}}]},"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":4,"completion_tokens":2}})).into_response();}
        if value["stream"]==true{return ([("content-type","text/event-stream")],Body::from_stream(async_stream::stream!{
            yield Ok::<_,Infallible>(Bytes::from(format!("data: {}\n\n",json!({"choices":[{"index":0,"delta":{"role":"assistant","content":"owned-curl-first 你好"},"finish_reason":null}]}))));
            release.notified().await;final_sent.store(true,Ordering::SeqCst);
            yield Ok(Bytes::from(format!("data: {}\n\ndata: {}\n\ndata: [DONE]\n\n",json!({"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}),json!({"choices":[],"usage":{"prompt_tokens":3,"completion_tokens":2}}))));
        })).into_response();}
        Json(json!({"model":"curl-model","choices":[{"index":0,"message":{"role":"assistant","content":"独立 curl 客户端"},"finish_reason":"stop"}],"usage":{"prompt_tokens":2,"completion_tokens":1}})).into_response()
    }}}));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let up = listener.local_addr().unwrap().port();
    let _server = Server(tokio::spawn(async move {
        axum::serve(listener, upstream).await.unwrap();
    }));
    let temp = tempfile::Builder::new()
        .prefix("tagma-external-curl-")
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
            name: "owned curl fixture".into(),
            protocol: ProviderProtocol::OpenaiChatCompletions,
            base_url: format!("http://127.0.0.1:{up}/v1"),
            enabled: true,
            models: vec!["curl-model".into()],
            credential: None,
        })
        .unwrap();
    let manager = GatewayManager::new(temp.path(), Path::new(env!("CARGO_BIN_EXE_tagma-gateway")));
    manager.start(port).await.unwrap();
    let result=std::panic::AssertUnwindSafe(async{
        let base=format!("http://127.0.0.1:{port}/v1");let endpoint=format!("{base}/chat/completions");let (status,_,catalog)=invoke(&format!("{base}/models"),None).await;assert_eq!(status,200);assert_eq!(serde_json::from_str::<Value>(&catalog).unwrap()["data"][0]["id"],"curl-model");assert!(seen.lock().unwrap().is_empty());
        let first=input("owned-curl-nonstream 用户字节",false);let (status,headers,body)=invoke(&endpoint,Some(&first)).await;assert_eq!(status,200);let first_id=id(&headers);assert_eq!(serde_json::from_str::<Value>(&body).unwrap()["choices"][0]["message"]["content"],"独立 curl 客户端");assert_eq!(seen.lock().unwrap()[0],first);
        let mut stream=input("owned-curl-stream",true);stream["stream_options"]=json!({"include_usage":true});let mut child=start(&endpoint,Some(&stream)).await;let mut stdout=child.stdout.take().unwrap();let mut captured=Vec::new();
        tokio::time::timeout(Duration::from_secs(3),async{let mut byte=[0u8;1];loop{assert_eq!(stdout.read(&mut byte).await.unwrap(),1);captured.push(byte[0]);assert!(captured.len()<8192);if captured.windows(b"owned-curl-first".len()).any(|part|part==b"owned-curl-first"){break;}}}).await.unwrap();
        assert!(!final_sent.load(Ordering::SeqCst),"curl must expose the first streamed bytes before upstream is allowed to finish");assert!(!String::from_utf8_lossy(&captured).contains("[DONE]"));release.notify_one();tokio::time::timeout(Duration::from_secs(5),stdout.read_to_end(&mut captured)).await.unwrap().unwrap();let status=tokio::time::timeout(Duration::from_secs(2),child.wait()).await.unwrap().unwrap();assert!(status.success());let (status,headers,text)=reply(&captured);assert_eq!(status,200);let stream_id=id(&headers);assert!(text.contains("你好"));assert!(text.ends_with("data: [DONE]\n\n"));
        let mut tools=input("owned-curl-tool",false);tools["tools"]=json!([{"type":"function","function":{"name":"owned_echo","parameters":{"type":"object"}}}]);tools["parallel_tool_calls"]=json!(false);let (status,headers,body)=invoke(&endpoint,Some(&tools)).await;assert_eq!(status,200);let tools_id=id(&headers);let answer:Value=serde_json::from_str(&body).unwrap();assert_eq!(answer["choices"][0]["message"]["tool_calls"][0]["function"]["arguments"],"{\"value\":\"参数\"}");assert_eq!(seen.lock().unwrap()[2],tools);
        let (status,_,body)=invoke(&format!("{base}/responses"),Some(&json!({}))).await;assert_eq!(status,501);assert!(body.contains("UNSUPPORTED_CAPABILITY"));assert_eq!(seen.lock().unwrap().len(),3);
        let reader=tagma_runtime::usage::UsageReader::default();for (request_id,input,output) in [(first_id,"2","1"),(stream_id,"3","2"),(tools_id,"4","2")]{let row=reader.details(temp.path(),usage::read::UsageDetailsQuery{protocol_version:1,request_id}).await.unwrap().record.unwrap();assert_eq!(row.config_revision,2);assert_eq!(row.input_tokens.as_deref(),Some(input));assert_eq!(row.output_tokens.as_deref(),Some(output));assert_eq!(row.state,usage::read::UsageRecordState::Succeeded);}
        let today=health::now_ms().unwrap()/86_400_000*86_400_000;
        let range=usage::read::UsageRange{start_ms:(today-86_400_000) as f64,end_ms:(today+2*86_400_000) as f64};
        let records=reader.requests(temp.path(),usage::read::UsageRequestsQuery{protocol_version:1,range:range.clone(),filter:Default::default(),cursor:None,limit:32}).await.unwrap();assert_eq!(records.records.len(),3);
        for kind in [usage::read::UsageMetricKind::Request,usage::read::UsageMetricKind::Attempt]{let total=reader.summary(temp.path(),usage::read::UsageSummaryQuery{protocol_version:1,range:range.clone(),filter:Default::default(),kind,cursor:None,limit:32}).await.unwrap().totals.unwrap();assert_eq!(total.total,"3");assert_eq!(total.input_total.as_deref(),Some("9"));assert_eq!(total.output_total.as_deref(),Some("5"));}
        println!("External client: {} path={} Windows HTTP/1.1 explicit loopback/auth-disabled fixture;real CLI models+nonstream Unicode+live unbuffered first bytes before release+SSE DONE+function arguments;Responses501/0extra upstream;3 request IDs cfg2/tokens2-1,3-2,4-2 match durable ledger,logical3/attempt3/input9/output5;no SDK/Agent/auth-on/platform/real-provider claim",version.lines().next().unwrap(),curl().display());
    }).catch_unwind().await;
    let stopped = manager.stop().await;
    if let Err(error) = result {
        std::panic::resume_unwind(error);
    }
    stopped.unwrap();
}
