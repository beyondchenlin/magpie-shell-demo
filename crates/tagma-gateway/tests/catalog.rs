//! All HTTP is controlled loopback; no UI, paid calls, external DNS or real credentials.
use axum::{
    Json, Router,
    body::{Body, Bytes},
    extract::Request,
    http::{Method, StatusCode},
    response::IntoResponse,
    routing::any,
};
use futures_util::FutureExt;
use serde_json::{Value, json};
use std::{
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
    time::Duration,
};
use tagma_core::teams::*;
use tagma_core::{catalog::*, credentials::SystemCredentials, health::*, *};
use tagma_runtime::GatewayManager;
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
fn input(config: &ConfigService, p: &Provider) -> ProbeProvider {
    ProbeProvider {
        protocol_version: 1,
        expected_revision: config.view().unwrap().desired_revision,
        provider_id: p.id.clone(),
        request_id: uuid::Uuid::new_v4().to_string(),
    }
}
async fn finished(config: &ConfigService, p: &Provider, request: &ProbeProvider) -> CatalogView {
    tokio::time::timeout(Duration::from_secs(9), async {
        loop {
            let check = config
                .view()
                .unwrap()
                .provider_catalog
                .into_iter()
                .find(|r| {
                    r.provider_id == p.id
                        && r.request_id == request.request_id
                        && r.outcome != CatalogOutcome::Pending
                });
            if let Some(check) = check {
                break check;
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    })
    .await
    .unwrap()
}
fn cooldown(db: &rusqlite::Connection, p: &Provider) {
    db.execute("UPDATE provider_catalog SET record=json_set(record,'$.next_allowed_ms',0) WHERE provider_id=?1",[&p.id]).unwrap();
}
async fn settled(client: &reqwest::Client, base: &str) {
    tokio::time::timeout(Duration::from_secs(2), async {
        loop {
            let response = client.get(format!("{base}/models")).send().await.unwrap();
            if response.headers()["x-tagma-health-writes-confirmed"] == "true" {
                break;
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    })
    .await
    .unwrap();
}
#[tokio::test]
async fn controlled_catalog_classification_cancellation_backoff_and_health_separation() {
    let calls = Arc::new(Mutex::new(Vec::<(Method, String)>::new()));
    let denied = Arc::new(AtomicBool::new(false));
    let disconnected = Arc::new(AtomicBool::new(false));
    let server=Router::new().fallback(any({let calls=calls.clone();let denied=denied.clone();let disconnected=disconnected.clone();move|request:Request|{let calls=calls.clone();let denied=denied.clone();let disconnected=disconnected.clone();async move {
        let path=request.uri().path().to_owned();let method=request.method().clone();calls.lock().unwrap().push((method.clone(),path.clone()));
        let bytes=axum::body::to_bytes(request.into_body(),128*1024).await.unwrap();
        if method==Method::POST {assert!(path.ends_with("/chat/completions"));let input:Value=serde_json::from_slice(&bytes).unwrap();if input["messages"][0]["content"]=="missing"{return StatusCode::NOT_FOUND.into_response();}return Json(json!({"model":input["model"],"choices":[{"index":0,"message":{"role":"assistant","content":"controlled inference"},"finish_reason":"stop"}]})).into_response();}
        assert_eq!(method,Method::GET);assert!(bytes.is_empty());assert!(path.ends_with("/models"));
        let case=path.split('/').nth(1).unwrap();
        if case=="ok"&&denied.load(Ordering::SeqCst){return StatusCode::UNAUTHORIZED.into_response();}
        if let Ok(status)=case.parse::<u16>(){return StatusCode::from_u16(status).unwrap().into_response();}
        if case=="invalid"{return Json(json!({"data":[{"model":"not-an-id"}]})).into_response();}
        if case=="huge"{return "x".repeat(256*1024+1).into_response();}
        if case.starts_with("slow")||case=="idle" {let guard=Dropped(disconnected);let idle=case=="idle";return ([("content-type","application/json")],Body::from_stream(async_stream::stream!{let _guard=guard;yield Ok::<_,std::convert::Infallible>(Bytes::from_static(b"{\"data\":["));loop{tokio::time::sleep(if idle {Duration::from_secs(10)}else {Duration::from_millis(30)}).await;yield Ok(Bytes::from_static(b" "));}})).into_response();}
        Json(json!({"data":[{"id":"configured"},{"id":"observed-id/with:original"}]})).into_response()
    }}}));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    let _server = Server(tokio::spawn(async move {
        axum::serve(listener, server).await.unwrap()
    }));
    let temp = tempfile::Builder::new()
        .prefix("tagma-catalog-")
        .tempdir()
        .unwrap();
    let config = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
    let db = rusqlite::Connection::open(temp.path().join("config.sqlite3")).unwrap();
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
    let mut providers = std::collections::HashMap::new();
    let reset_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let reset_port = reset_listener.local_addr().unwrap().port();
    let _reset = Server(tokio::spawn(async move {
        while let Ok((stream, _)) = reset_listener.accept().await {
            drop(stream);
        }
    }));
    for case in [
        "ok", "401", "403", "429", "404", "405", "501", "500", "invalid", "huge", "slow", "idle",
        "other", "slow-two", "tls", "network",
    ] {
        let p = config
            .save_provider(SaveProvider {
                protocol_version: 1,
                expected_revision: config.view().unwrap().desired_revision,
                id: None,
                name: case.into(),
                protocol: ProviderProtocol::OpenaiChatCompletions,
                base_url: if case == "tls" {
                    format!("https://127.0.0.1:{port}/{case}/v1")
                } else if case == "network" {
                    format!("http://127.0.0.1:{reset_port}/{case}/v1")
                } else {
                    format!("http://127.0.0.1:{port}/{case}/v1")
                },
                enabled: true,
                models: vec!["configured".into()],
                credential: None,
            })
            .unwrap()
            .providers
            .last()
            .unwrap()
            .clone();
        providers.insert(case, p);
    }
    let manager = GatewayManager::new(
        temp.path(),
        std::path::Path::new(env!("CARGO_BIN_EXE_tagma-gateway")),
    );
    manager.start(gateway_port).await.unwrap();
    let outcome=std::panic::AssertUnwindSafe(async {
        let client=reqwest::Client::builder().no_proxy().timeout(Duration::from_secs(10)).build().unwrap();let base=format!("http://127.0.0.1:{gateway_port}/v1");
        let initial_revision=config.view().unwrap().desired_revision;
        for (case,expected) in [("ok",CatalogOutcome::Available),("401",CatalogOutcome::Authentication),("403",CatalogOutcome::Authentication),("429",CatalogOutcome::RateLimited),("404",CatalogOutcome::Unsupported),("405",CatalogOutcome::Unsupported),("501",CatalogOutcome::Unsupported),("500",CatalogOutcome::Upstream),("invalid",CatalogOutcome::Protocol),("huge",CatalogOutcome::Protocol),("idle",CatalogOutcome::Timeout),("tls",CatalogOutcome::Tls),("network",CatalogOutcome::Network)] {
            let p=&providers[case];let request=input(&config,p);manager.probe_provider(request.clone()).await.unwrap();let check=finished(&config,p,&request).await;
            assert_eq!(check.outcome,expected,"{case}");assert!(check.finished_ms.unwrap()>=check.attempted_ms);assert!(check.manual_inference_required);
            if case=="ok" {assert_eq!(check.models,vec!["configured","observed-id/with:original"]);assert_eq!(check.source,"discovered: GET /models");assert!(!check.stale);assert!(check.catalog_ms.is_some());}
            else {assert!(check.stale);assert!(check.models.is_empty());assert!(check.next_allowed_ms-check.finished_ms.unwrap()>=60_000.0);}
            let count=calls.lock().unwrap().len();assert_eq!(manager.probe_provider(input(&config,p)).await.unwrap_err().code,ErrorCode::ProbeBackoff);assert_eq!(calls.lock().unwrap().len(),count);
            println!("A08 controlled catalog case={case} outcome={:?} status={:?} durable_backoff=true",check.outcome,check.http_status);
        }
        assert_eq!(config.view().unwrap().desired_revision,initial_revision);assert!(config.view().unwrap().model_health.is_empty(),"Catalog must not create inference success");assert!(calls.lock().unwrap().iter().all(|c|c.0==Method::GET));
        disconnected.store(false,Ordering::SeqCst);let p=&providers["slow"];let request=input(&config,p);manager.probe_provider(request.clone()).await.unwrap();
        tokio::time::timeout(Duration::from_secs(2),async{while !calls.lock().unwrap().iter().any(|entry|entry.1=="/slow/v1/models"){tokio::time::sleep(Duration::from_millis(10)).await;}}).await.unwrap();
        manager.cancel_probe(request.request_id.clone()).await.unwrap();assert_eq!(finished(&config,p,&request).await.outcome,CatalogOutcome::Cancelled);
        tokio::time::timeout(Duration::from_secs(2),async{while !disconnected.load(Ordering::SeqCst){tokio::time::sleep(Duration::from_millis(10)).await;}}).await.unwrap();
        settled(&client,&base).await;
        cooldown(&db,&providers["slow"]);
        let first=input(&config,&providers["slow"]);let second=input(&config,&providers["slow-two"]);
        manager.probe_provider(first.clone()).await.unwrap();manager.probe_provider(second.clone()).await.unwrap();
        assert_eq!(manager.probe_provider(input(&config,&providers["other"])).await.unwrap_err().code,ErrorCode::ProbeBusy);
        manager.cancel_probe(first.request_id.clone()).await.unwrap();manager.cancel_probe(second.request_id.clone()).await.unwrap();
        finished(&config,&providers["slow"],&first).await;finished(&config,&providers["slow-two"],&second).await;settled(&client,&base).await;
        manager.stop().await.unwrap();manager.start(gateway_port).await.unwrap();
        assert_eq!(manager.probe_provider(input(&config,&providers["ok"])).await.unwrap_err().code,ErrorCode::ProbeBackoff);
        println!("A08 admission: two-job bound, cancellation and cooldown after real sidecar restart verified");
        // GET detection never qualifies as a brain; an explicit synthetic inference does.
        settled(&client,&base).await;
        let call=||client.post(format!("{base}/chat/completions")).json(&json!({"model":"configured","messages":[{"role":"user","content":"explicit synthetic test"}],"stream":false})).send();
        assert!(call().await.unwrap().status().is_success());settled(&client,&base).await;
        let recipe=TeamRecipe{display_name:"probe gated brain".into(),brain:TeamBrain::FirstCloud{},routing:TeamRouting::Manual,total_timeout_ms:5000,steps:vec![TeamStep{target:TeamStepTarget::CloudModel{target:CloudSelection::brain()},input:TeamStepInput::OriginalMessages,output:TeamStepOutput::FinalAnswer,timeout_ms:5000,failure:TeamFailurePolicy::Abort,side_effect:TeamSideEffect::OutboundModelRequest}]};
        let team=config.save_team(SaveTeam{protocol_version:1,expected_revision:config.view().unwrap().desired_revision,id:None,slug:"catalog-gated".into(),recipe}).unwrap().teams[0].team.clone();
        config.publish_team(RevisionCommand{protocol_version:1,expected_revision:config.view().unwrap().desired_revision,id:team.id}).unwrap();manager.apply().await.unwrap();
        let snapshot=config.read_snapshot().unwrap().1;let records=ConfigService::read_runtime_health(temp.path(),&snapshot).unwrap();assert!(select_first_cloud(&snapshot,&records,now_ms().unwrap()).is_some());
        let p=&providers["ok"];cooldown(&db,p);denied.store(true,Ordering::SeqCst);let request=input(&config,p);manager.probe_provider(request.clone()).await.unwrap();
        let blocked=client.post(format!("{base}/chat/completions")).json(&json!({"model":"tagma/catalog-gated","messages":[{"role":"user","content":"must not generate"}]})).send().await.unwrap();assert_eq!(blocked.status(),StatusCode::SERVICE_UNAVAILABLE);assert_eq!(blocked.json::<Value>().await.unwrap()["error"]["code"],"NO_AVAILABLE_BRAIN");
        finished(&config,p,&request).await;settled(&client,&base).await;
        let records=ConfigService::read_runtime_health(temp.path(),&snapshot).unwrap();assert!(records[0].is_ready(now_ms().unwrap()),"Inference fact remains separate");assert!(select_first_cloud(&snapshot,&records,now_ms().unwrap()).is_none(),"Later authentication failure excludes old inference");
        cooldown(&db,p);denied.store(false,Ordering::SeqCst);let request=input(&config,p);manager.probe_provider(request.clone()).await.unwrap();finished(&config,p,&request).await;settled(&client,&base).await;
        assert!(select_first_cloud(&snapshot,&ConfigService::read_runtime_health(temp.path(),&snapshot).unwrap(),now_ms().unwrap()).is_none(),"Catalog success cannot revive old inference");
        tokio::time::sleep(Duration::from_millis(2)).await;assert!(call().await.unwrap().status().is_success());settled(&client,&base).await;
        assert!(select_first_cloud(&snapshot,&ConfigService::read_runtime_health(temp.path(),&snapshot).unwrap(),now_ms().unwrap()).is_some());
        let response=client.post(format!("{base}/chat/completions")).json(&json!({"model":"configured","messages":[{"role":"user","content":"missing"}]})).send().await.unwrap();
        assert_eq!(response.status(),StatusCode::NOT_FOUND);assert_eq!(response.json::<Value>().await.unwrap()["error"]["code"],"UPSTREAM_MODEL_UNAVAILABLE");
        assert_eq!(calls.lock().unwrap().iter().filter(|entry|entry.0==Method::POST).count(),3,"Only the three explicit synthetic inference calls generate content");
        println!("A08 inference: actual upstream 404 mapped to UPSTREAM_MODEL_UNAVAILABLE, exactly three explicitly requested inference calls, zero automatic generation probes");
        // A current-generation job may not write its result into a replacement provider.
        let p=&providers["slow"];cooldown(&db,p);let request=input(&config,p);manager.probe_provider(request.clone()).await.unwrap();
        config.save_provider(SaveProvider{protocol_version:1,expected_revision:config.view().unwrap().desired_revision,id:Some(p.id.clone()),name:p.name.clone(),protocol:p.protocol.clone(),base_url:format!("http://127.0.0.1:{port}/replacement/v1"),enabled:true,models:p.models.clone(),credential:None}).unwrap();manager.apply().await.unwrap();manager.cancel_probe(request.request_id).await.unwrap();settled(&client,&base).await;
        assert!(!config.view().unwrap().provider_catalog.iter().any(|r|r.provider_id==p.id));
        println!("A08 facts: GET-only discovery, original IDs/source/time, no inference promotion, auth negative fence, no catalog revival, explicit inference recovery, cancelled/stale-generation rejection verified");
    }).catch_unwind().await;
    let stopped = manager.stop().await;
    drop(db);
    if let Err(error) = outcome {
        std::panic::resume_unwind(error);
    }
    stopped.unwrap();
}
