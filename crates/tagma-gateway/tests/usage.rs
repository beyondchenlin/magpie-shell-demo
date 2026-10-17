//! Controlled loopback only; no credentials, user database or desktop operations.
use axum::{
    Json, Router,
    body::{Body, Bytes},
    extract::Request,
    response::IntoResponse,
    routing::post,
};
use futures_util::FutureExt;
use rusqlite::{Connection, OpenFlags};
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
use tagma_core::{credentials::SystemCredentials, teams::*, *};
use tagma_runtime::{GatewayManager, ipc};
struct Server(tokio::task::JoinHandle<()>);
impl Drop for Server {
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
fn port() -> u16 {
    std::net::TcpListener::bind("127.0.0.1:0")
        .unwrap()
        .local_addr()
        .unwrap()
        .port()
}
fn db(path: &Path, write: bool) -> Connection {
    let db = Connection::open_with_flags(
        path.join("usage.sqlite3"),
        if write {
            OpenFlags::SQLITE_OPEN_READ_WRITE
        } else {
            OpenFlags::SQLITE_OPEN_READ_ONLY
        },
    )
    .unwrap();
    db.busy_timeout(Duration::from_secs(1)).unwrap();
    db
}
fn setup(upstream: u16) -> (tempfile::TempDir, ConfigService, u16, String) {
    let temp = tempfile::Builder::new()
        .prefix("tagma-usage-http-")
        .tempdir()
        .unwrap();
    let config = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
    let port = port();
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
            name: "owned usage fixture".into(),
            protocol: ProviderProtocol::OpenaiChatCompletions,
            base_url: format!("http://127.0.0.1:{upstream}/v1"),
            enabled: true,
            models: vec!["usage-model".into()],
            credential: None,
        })
        .unwrap();
    let id = view.providers[0].id.clone();
    (temp, config, port, id)
}
fn input(model: &str, prompt: &str, stream: bool) -> Value {
    json!({"model":model,"messages":[{"role":"user","content":prompt}],"stream":stream})
}
fn state(path: &Path, id: &str) -> (String, Option<i64>, Option<i64>) {
    db(path, false)
        .query_row(
            "SELECT outcome,input_tokens,output_tokens FROM usage_requests WHERE id=?1",
            [id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .unwrap()
}
async fn wait_state(path: &Path, id: &str, outcome: &str) {
    tokio::time::timeout(Duration::from_secs(3), async {
        loop {
            if state(path, id).0 == outcome {
                break;
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn actual_http_usage_starts_precede_dispatch_and_failed_results_fence_new_calls() {
    let calls = Arc::new(AtomicUsize::new(0));
    let cancelled = Arc::new(AtomicBool::new(false));
    let audit = Arc::new(std::sync::Mutex::new(None::<std::path::PathBuf>));
    let upstream=Router::new().fallback(post({let calls=calls.clone();let cancelled=cancelled.clone();let audit=audit.clone();move|request:Request|{let calls=calls.clone();let cancelled=cancelled.clone();let audit=audit.clone();async move{
        calls.fetch_add(1,Ordering::SeqCst);let bytes=axum::body::to_bytes(request.into_body(),128*1024).await.unwrap();let value:Value=serde_json::from_slice(&bytes).unwrap();
        let path=audit.lock().unwrap().clone().unwrap();let registered:bool=db(&path,false).query_row("SELECT EXISTS(SELECT 1 FROM usage_attempts a JOIN usage_requests r ON r.id=a.request_id WHERE a.outcome='running' AND r.outcome='running' AND a.model=?1)",[value["model"].as_str().unwrap()],|r|r.get(0)).unwrap();assert!(registered,"upstream observed a send without committed request+attempt starts");
        let prompt=value["messages"][0]["content"].as_str().unwrap();
        if value["stream"]==true{
            let hold=prompt=="cancel";let guard=Dropped(cancelled);
            let first=format!("data: {}\n\n",json!({"choices":[{"index":0,"delta":{"content":"synthetic private response"},"finish_reason":null}]}));
            let usage=if prompt=="stream_usage" {format!("data: {}\n\n",json!({"choices":[],"usage":{"prompt_tokens":3,"completion_tokens":2}}))}else{String::new()};
            let last=format!("data: {}\n\n{usage}data: [DONE]\n\n",json!({"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}));
            return ([("content-type","text/event-stream")],Body::from_stream(async_stream::stream!{let _guard=guard;yield Ok::<_,Infallible>(Bytes::from(first));if hold{loop{tokio::time::sleep(Duration::from_millis(20)).await;yield Ok(Bytes::from_static(b": ping\n\n"));}}else{yield Ok(Bytes::from(last));}})).into_response();
        }
        let mut result=json!({"model":value["model"],"choices":[{"index":0,"message":{"role":"assistant","content":"synthetic private response"},"finish_reason":"stop"}]});if prompt!="unknown"{result["usage"]=json!({"prompt_tokens":2,"completion_tokens":1});}Json(result).into_response()
    }}}));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let up = listener.local_addr().unwrap().port();
    let _server = Server(tokio::spawn(async move {
        axum::serve(listener, upstream).await.unwrap()
    }));
    let (temp, config, port, provider) = setup(up);
    *audit.lock().unwrap() = Some(temp.path().to_owned());
    let manager = GatewayManager::new(temp.path(), Path::new(env!("CARGO_BIN_EXE_tagma-gateway")));
    manager.start(port).await.unwrap();
    let result=std::panic::AssertUnwindSafe(async{
        let client=reqwest::Client::builder().no_proxy().build().unwrap();let endpoint=format!("http://127.0.0.1:{port}/v1/chat/completions");
        let response=client.post(&endpoint).json(&input("usage-model","normal",false)).send().await.unwrap();assert_eq!(response.status(),200);assert_eq!(response.headers()["x-tagma-config-revision"],"2");let id=response.headers()["x-tagma-request-id"].to_str().unwrap().to_owned();response.bytes().await.unwrap();assert_eq!(state(temp.path(),&id),("succeeded".into(),Some(2),Some(1)));assert_eq!(calls.load(Ordering::SeqCst),1);
        let counts:(i64,i64)=db(temp.path(),false).query_row("SELECT (SELECT sum(count) FROM usage_daily WHERE kind='request'),(SELECT sum(count) FROM usage_daily WHERE kind='attempt')",[],|r|Ok((r.get(0)?,r.get(1)?))).unwrap();assert_eq!(counts,(1,1));println!("Usage HTTP success: requests=1 attempts=1 cfg=2 tokens=2/1 persisted before response success");
        let reader=tagma_runtime::usage::UsageReader::default();let started:i64=db(temp.path(),false).query_row("SELECT started_ms FROM usage_requests WHERE id=?1",[&id],|r|r.get(0)).unwrap();let day=started as u64/86400000*86400000;let range=usage::read::UsageRange{start_ms:day as f64,end_ms:(day+86400000) as f64};
        let rows=reader.requests(temp.path(),usage::read::UsageRequestsQuery{protocol_version:1,range:range.clone(),filter:Default::default(),cursor:None,limit:32}).await.unwrap();assert_eq!(rows.records.len(),1);assert_eq!(rows.records[0].request_id,id);assert_eq!(rows.records[0].input_tokens.as_deref(),Some("2"));
        let detail=reader.details(temp.path(),usage::read::UsageDetailsQuery{protocol_version:1,request_id:id.clone()}).await.unwrap();assert_eq!(detail.attempts.len(),1);assert_eq!(detail.record.unwrap().config_revision,2);
        let totals=reader.summary(temp.path(),usage::read::UsageSummaryQuery{protocol_version:1,range,filter:Default::default(),kind:usage::read::UsageMetricKind::Attempt,cursor:None,limit:32}).await.unwrap().totals.unwrap();assert_eq!(totals.total,"1");assert_eq!(totals.input_total.as_deref(),Some("2"));assert_eq!(totals.output_total.as_deref(),Some("1"));println!("Usage live readonly bridge:actual sidecar request -> exact request/detail/UTC attempt summary,config2 and tokens2/1");let blocked=client.get(format!("http://127.0.0.1:{port}/v1/usage_requests")).send().await.unwrap();assert_eq!(blocked.status(),501);blocked.bytes().await.unwrap();assert_eq!(calls.load(Ordering::SeqCst),1,"metadata reads and unsupported data API paths never generate inference");
        db(temp.path(),true).execute_batch("CREATE TRIGGER owned_fail_begin BEFORE INSERT ON usage_requests BEGIN SELECT RAISE(ABORT,'owned start fault'); END;").unwrap();
        let before=calls.load(Ordering::SeqCst);let response=client.post(&endpoint).json(&input("usage-model","normal",false)).send().await.unwrap();assert_eq!(response.status(),503);assert!(response.text().await.unwrap().contains("USAGE_STORAGE_UNAVAILABLE"));assert_eq!(calls.load(Ordering::SeqCst),before);assert_eq!(manager.status().await.usage_degraded,Some(true));
        db(temp.path(),true).execute_batch("DROP TRIGGER owned_fail_begin").unwrap();manager.recover_usage().await.unwrap();println!("Usage HTTP begin failure: upstream delta=0,503,degraded=true;private explicit recovery acknowledged");
        db(temp.path(),true).execute_batch("CREATE TRIGGER owned_fail_first BEFORE INSERT ON usage_attempts BEGIN SELECT RAISE(ABORT,'owned first attempt start fault'); END;").unwrap();
        let before=calls.load(Ordering::SeqCst);let response=client.post(&endpoint).json(&input("usage-model","normal",false)).send().await.unwrap();assert_eq!(response.status(),503);response.bytes().await.unwrap();assert_eq!(calls.load(Ordering::SeqCst),before);assert_eq!(manager.status().await.usage_degraded,Some(true));db(temp.path(),true).execute_batch("DROP TRIGGER owned_fail_first").unwrap();manager.recover_usage().await.unwrap();println!("Usage HTTP first-attempt registration failure:upstream delta0,degraded and explicit recovery");
        let response=client.post(&endpoint).json(&input("usage-model","stream_usage",true)).send().await.unwrap();let id=response.headers()["x-tagma-request-id"].to_str().unwrap().to_owned();let text=response.text().await.unwrap();assert!(text.contains("[DONE]"));assert_eq!(state(temp.path(),&id),("succeeded".into(),Some(3),Some(2)));println!("Usage successful SSE:final reported tokens3/2 persisted before DONE");
        db(temp.path(),true).execute_batch("CREATE TRIGGER owned_fail_finish BEFORE UPDATE ON usage_attempts BEGIN SELECT RAISE(ABORT,'owned result fault'); END;").unwrap();
        let response=client.post(&endpoint).json(&input("usage-model","unknown",false)).send().await.unwrap();assert_eq!(response.status(),503);let id=response.headers()["x-tagma-request-id"].to_str().unwrap().to_owned();response.bytes().await.unwrap();assert_eq!(state(temp.path(),&id),("running".into(),None,None));let status=manager.status().await;assert_eq!(status.usage_degraded,Some(true));assert_eq!(status.usage_pending_results,Some(2));let _=manager.apply().await;assert_eq!(manager.status().await.usage_degraded,Some(true),"config apply cannot clear the accounting fence");
        let before=calls.load(Ordering::SeqCst);let response=client.post(&endpoint).json(&input("usage-model","normal",false)).send().await.unwrap();assert_eq!(response.status(),503);assert_eq!(calls.load(Ordering::SeqCst),before);assert!(manager.recover_usage().await.is_err());
        db(temp.path(),true).execute_batch("DROP TRIGGER owned_fail_finish").unwrap();manager.recover_usage().await.unwrap();assert_eq!(state(temp.path(),&id),("failed".into(),None,None));let status=manager.status().await;assert_eq!(status.usage_pending_results,Some(0));assert_eq!(status.usage_degraded,Some(false));println!("Usage HTTP result failure:2 pending,unknown tokens NULL,subsequent upstream delta0;fault-active recovery refused;after recovery pending0,unknown stays NULL");
        db(temp.path(),true).execute_batch("CREATE TRIGGER owned_fail_stream_finish BEFORE UPDATE ON usage_attempts BEGIN SELECT RAISE(ABORT,'owned stream result fault'); END;").unwrap();
        let response=client.post(&endpoint).json(&input("usage-model","stream",true)).send().await.unwrap();let id=response.headers()["x-tagma-request-id"].to_str().unwrap().to_owned();let text=response.text().await.unwrap();assert!(text.contains("synthetic private response"));assert!(text.contains("USAGE_STORAGE_UNAVAILABLE"));assert!(!text.contains("[DONE]"));assert_eq!(manager.status().await.usage_pending_results,Some(2));
        db(temp.path(),true).execute_batch("DROP TRIGGER owned_fail_stream_finish").unwrap();manager.recover_usage().await.unwrap();assert_eq!(state(temp.path(),&id),("failed".into(),None,None));println!("Usage SSE result failure:partial text retained,error frame,successful DONE withheld,2 bounded pending;recovery retains unknown tokens");
        cancelled.store(false,Ordering::SeqCst);let mut response=client.post(&endpoint).json(&input("usage-model","cancel",true)).send().await.unwrap();let id=response.headers()["x-tagma-request-id"].to_str().unwrap().to_owned();response.chunk().await.unwrap().unwrap();let live=reader.details(temp.path(),usage::read::UsageDetailsQuery{protocol_version:1,request_id:id.clone()}).await.unwrap();assert!(matches!(live.record.unwrap().state,usage::read::UsageRecordState::Running));assert_eq!(live.attempts[0].input_tokens,None);assert!(!cancelled.load(Ordering::SeqCst),"read cancellation must not affect the actual upstream");drop(response);wait_state(temp.path(),&id,"cancelled").await;assert_eq!(state(temp.path(),&id),("cancelled".into(),None,None));tokio::time::timeout(Duration::from_secs(3),async{while !cancelled.load(Ordering::SeqCst){tokio::time::sleep(Duration::from_millis(10)).await;}}).await.unwrap();println!("Usage SSE client drop:actual upstream closed;request+attempt cancelled with unknown tokens");
        let target=CloudTarget{provider_id:provider.clone(),model_id:"usage-model".into()};let view=config.save_team(SaveTeam{protocol_version:1,expected_revision:2,id:None,slug:"usage-team".into(),recipe:TeamRecipe{display_name:"usage fixture".into(),brain:TeamBrain::Explicit{target:target.clone()},routing:TeamRouting::Sequential,total_timeout_ms:8000,steps:vec![TeamStep{target:TeamStepTarget::CloudModel{target:target.clone().into()},input:TeamStepInput::OriginalMessages,output:TeamStepOutput::IntermediateText,timeout_ms:4000,failure:TeamFailurePolicy::Abort,side_effect:TeamSideEffect::OutboundModelRequest},TeamStep{target:TeamStepTarget::CloudModel{target:target.into()},input:TeamStepInput::PreviousText,output:TeamStepOutput::FinalAnswer,timeout_ms:4000,failure:TeamFailurePolicy::Abort,side_effect:TeamSideEffect::OutboundModelRequest}]}}).unwrap();let view=config.publish_team(RevisionCommand{protocol_version:1,expected_revision:3,id:view.teams[0].team.id.clone()}).unwrap();let team=view.teams[0].team.versions[0].public_id.clone();manager.apply().await.unwrap();
        let before=calls.load(Ordering::SeqCst);let response=client.post(&endpoint).json(&input(&team,"normal",false)).send().await.unwrap();assert_eq!(response.status(),200);let id=response.headers()["x-tagma-request-id"].to_str().unwrap().to_owned();response.bytes().await.unwrap();assert_eq!(calls.load(Ordering::SeqCst)-before,2);assert_eq!(state(temp.path(),&id),("succeeded".into(),Some(4),Some(2)));
        db(temp.path(),true).execute_batch("CREATE TRIGGER owned_fail_next BEFORE INSERT ON usage_attempts WHEN NEW.ordinal=2 BEGIN SELECT RAISE(ABORT,'owned next step start fault'); END;").unwrap();let before=calls.load(Ordering::SeqCst);let response=client.post(&endpoint).json(&input(&team,"normal",false)).send().await.unwrap();assert_eq!(response.status(),503);response.bytes().await.unwrap();assert_eq!(calls.load(Ordering::SeqCst)-before,1);db(temp.path(),true).execute_batch("DROP TRIGGER owned_fail_next").unwrap();manager.recover_usage().await.unwrap();println!("Usage sequential:logical1/attempts2/tokens4/2;second-attempt begin failure sends first once and second zero");
        let bytes=client.post(format!("http://127.0.0.1:{port}/v1/recover-usage")).send().await.unwrap();assert_eq!(bytes.status(),501,"data API has no management recovery");
        let mut response=client.post(&endpoint).json(&input("usage-model","cancel",true)).send().await.unwrap();let id=response.headers()["x-tagma-request-id"].to_str().unwrap().to_owned();response.chunk().await.unwrap().unwrap();let receipt=config.revoke_access(security::RevokeAccess{protocol_version:1,expected_revision:config.view().unwrap().desired_revision,kind:security::RevokeKind::ProviderConnection,provider_id:Some(provider.clone()),cancel_inflight:true}).unwrap();manager.confirm_security(receipt.revision).await.unwrap();let text=response.text().await.unwrap();assert!(text.contains("ACCESS_REVOKED"));assert!(!text.contains("[DONE]"));assert_eq!(state(temp.path(),&id),("cancelled".into(),None,None));println!("Usage actual revoke(true):partial stream ends ACCESS_REVOKED,request+attempt cancelled,NULL usage;no success DONE");
        let leaked:i64=db(temp.path(),false).query_row("SELECT (SELECT count(*) FROM usage_requests WHERE error_code GLOB '*[a-z ]*')+(SELECT count(*) FROM usage_attempts WHERE error_code GLOB '*[a-z ]*')",[],|r|r.get(0)).unwrap();assert_eq!(leaked,0,"only stable gateway error codes, never exception/upstream text");
        for suffix in ["","-wal"]{if let Ok(bytes)=std::fs::read(temp.path().join(format!("usage.sqlite3{suffix}"))){let needle=b"synthetic private response";assert!(!bytes.windows(needle.len()).any(|window|window==needle));}}
    }).catch_unwind().await;
    let stopped = manager.stop().await;
    if let Err(error) = result {
        std::panic::resume_unwind(error);
    }
    stopped.unwrap();
}

async fn raw_start(path: &Path, port: u16) -> tokio::process::Child {
    use tokio::io::AsyncWriteExt;
    let mut child = tokio::process::Command::new(env!("CARGO_BIN_EXE_tagma-gateway"))
        .arg("--config-dir")
        .arg(path)
        .arg("--port")
        .arg(port.to_string())
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .kill_on_drop(true)
        .spawn()
        .unwrap();
    let mut pipe = child.stdin.take().unwrap();
    let mut bytes = serde_json::to_vec(&ipc::Bootstrap {
        owner_token: uuid::Uuid::new_v4().to_string(),
        instance_id: uuid::Uuid::new_v4().to_string(),
    })
    .unwrap();
    bytes.push(b'\n');
    pipe.write_all(&bytes).await.unwrap();
    drop(pipe);
    tokio::time::timeout(Duration::from_secs(5), async {
        loop {
            if let Ok(manifest) = ipc::read_manifest(path)
                && ipc::call(&manifest, ipc::Command::Status).await.is_ok()
            {
                break;
            }
            assert!(child.try_wait().unwrap().is_none());
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
    })
    .await
    .unwrap();
    child
}
#[tokio::test]
async fn actual_sidecar_death_keeps_started_usage_and_restart_marks_unknown_interrupted() {
    let entered = Arc::new(tokio::sync::Notify::new());
    let upstream = Router::new().fallback(post({
        let entered = entered.clone();
        move || {
            let entered = entered.clone();
            async move {
                entered.notify_one();
                std::future::pending::<()>().await;
                Json(json!({}))
            }
        }
    }));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let up = listener.local_addr().unwrap().port();
    let _server = Server(tokio::spawn(async move {
        axum::serve(listener, upstream).await.unwrap()
    }));
    let (temp, _config, port, _) = setup(up);
    let mut child = raw_start(temp.path(), port).await;
    let result=std::panic::AssertUnwindSafe(async{
        let endpoint=format!("http://127.0.0.1:{port}/v1/chat/completions");let request=tokio::spawn(async move{reqwest::Client::builder().no_proxy().build().unwrap().post(endpoint).json(&input("usage-model","owned crash fixture",false)).send().await});
        tokio::time::timeout(Duration::from_secs(3),entered.notified()).await.unwrap();let id:String=db(temp.path(),false).query_row("SELECT id FROM usage_requests",[],|r|r.get(0)).unwrap();assert_eq!(state(temp.path(),&id),("running".into(),None,None));let attempts:i64=db(temp.path(),false).query_row("SELECT count(*) FROM usage_attempts WHERE outcome='running'",[],|r|r.get(0)).unwrap();assert_eq!(attempts,1);
        child.kill().await.unwrap();child.wait().await.unwrap();assert!(request.await.unwrap().is_err());child=raw_start(temp.path(),port).await;assert_eq!(state(temp.path(),&id),("interrupted".into(),None,None));let row:(String,Option<i64>,Option<i64>)=db(temp.path(),false).query_row("SELECT outcome,input_tokens,output_tokens FROM usage_attempts",[],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).unwrap();assert_eq!(row,("interrupted".into(),None,None));println!("Usage actual sidecar kill/restart:upstream entered only after request+attempt starts persisted;both recovered interrupted,NULL tokens,no fabricated zero");
    }).catch_unwind().await;
    let _ = child.kill().await;
    let _ = child.wait().await;
    if let Err(error) = result {
        std::panic::resume_unwind(error);
    }
}
