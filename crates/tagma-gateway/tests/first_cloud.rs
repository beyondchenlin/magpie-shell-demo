//! Real headless sidecar + controlled loopback upstream. No desktop or paid upstream.
use axum::{
    Json, Router, extract::Request, http::StatusCode, response::IntoResponse, routing::post,
};
use futures_util::FutureExt;
use serde_json::{Value, json};
use std::{
    sync::{Arc, Mutex},
    time::Duration,
};
use tagma_core::{credentials::SystemCredentials, health::*, teams::*, *};
use tagma_runtime::GatewayManager;

struct AbortServer(tokio::task::JoinHandle<()>);
impl Drop for AbortServer {
    fn drop(&mut self) {
        self.0.abort();
    }
}
fn recipe(sequential: bool) -> TeamRecipe {
    let step = |input, output| TeamStep {
        target: TeamStepTarget::CloudModel {
            target: CloudSelection::brain(),
        },
        input,
        output,
        timeout_ms: 4000,
        failure: TeamFailurePolicy::Abort,
        side_effect: TeamSideEffect::OutboundModelRequest,
    };
    TeamRecipe {
        display_name: "自动选脑合成测试".into(),
        brain: TeamBrain::FirstCloud {},
        routing: if sequential {
            TeamRouting::Sequential
        } else {
            TeamRouting::Manual
        },
        total_timeout_ms: 8000,
        steps: if sequential {
            vec![
                step(
                    TeamStepInput::OriginalMessages,
                    TeamStepOutput::IntermediateText,
                ),
                step(TeamStepInput::PreviousText, TeamStepOutput::FinalAnswer),
            ]
        } else {
            vec![step(
                TeamStepInput::OriginalMessages,
                TeamStepOutput::FinalAnswer,
            )]
        },
    }
}
fn rev(config: &ConfigService) -> u32 {
    config.view().unwrap().desired_revision
}
async fn call(
    client: &reqwest::Client,
    base: &str,
    model: &str,
    prompt: &str,
) -> reqwest::Response {
    client
        .post(format!("{base}/chat/completions"))
        .json(&json!({"model":model,"messages":[{"role":"user","content":prompt}],"stream":false}))
        .send()
        .await
        .unwrap()
}
async fn answer(client: &reqwest::Client, base: &str, model: &str, prompt: &str) -> String {
    let response = call(client, base, model, prompt).await;
    let status = response.status();
    let body: Value = response.json().await.unwrap();
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["model"], model);
    body["choices"][0]["message"]["content"]
        .as_str()
        .unwrap()
        .into()
}
async fn catalog(client: &reqwest::Client, base: &str, confirmed: bool) -> Value {
    tokio::time::timeout(Duration::from_secs(3), async {
        loop {
            let response = client.get(format!("{base}/models")).send().await.unwrap();
            let matches = response.headers()["x-tagma-health-writes-confirmed"]
                == if confirmed { "true" } else { "false" };
            let body = response.json().await.unwrap();
            if matches {
                break body;
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    })
    .await
    .unwrap()
}
async fn unavailable(client: &reqwest::Client, base: &str) {
    let response = call(client, base, "tagma/auto-test", "must-not-forward").await;
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    let body: Value = response.json().await.unwrap();
    assert_eq!(body["error"]["code"], "NO_AVAILABLE_BRAIN");
}
fn save_models(config: &ConfigService, provider: &Provider, models: Vec<String>) {
    config
        .save_provider(SaveProvider {
            protocol_version: 1,
            expected_revision: rev(config),
            id: Some(provider.id.clone()),
            name: provider.name.clone(),
            protocol: provider.protocol.clone(),
            base_url: provider.base_url.clone(),
            enabled: true,
            models,
            credential: None,
        })
        .unwrap();
}

#[tokio::test]
async fn automatic_brain_real_http_order_fallback_uncertainty_and_inflight_pinning() {
    let calls = Arc::new(Mutex::new(Vec::<(String, String, String)>::new()));
    let entered = Arc::new(tokio::sync::Notify::new());
    let release = Arc::new(tokio::sync::Notify::new());
    let upstream=Router::new().fallback(post({let calls=calls.clone();let entered=entered.clone();let release=release.clone();move|request:Request|{let calls=calls.clone();let entered=entered.clone();let release=release.clone();async move {
        let provider=if request.uri().path().starts_with("/a/") {"a"} else {"b"};
        let input:Value=serde_json::from_slice(&axum::body::to_bytes(request.into_body(),128*1024).await.unwrap()).unwrap();
        let model=input["model"].as_str().unwrap();let prompt=input["messages"][0]["content"].as_str().unwrap();
        calls.lock().unwrap().push((provider.into(),model.into(),prompt.into()));
        if prompt=="fail" {return (StatusCode::UNAUTHORIZED,"private fixture authentication error").into_response();}
        if prompt=="pin" {entered.notify_one();release.notified().await;}
        Json(json!({"model":model,"choices":[{"index":0,"message":{"role":"assistant","content":format!("{provider}/{model}")},"finish_reason":"stop"}]})).into_response()
    }}}));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    let _server = AbortServer(tokio::spawn(async move {
        axum::serve(listener, upstream).await.unwrap()
    }));
    let temp = tempfile::Builder::new()
        .prefix("tagma-first-cloud-")
        .tempdir()
        .unwrap();
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
    let mut providers = Vec::new();
    for name in ["a", "b"] {
        let view = config
            .save_provider(SaveProvider {
                protocol_version: 1,
                expected_revision: rev(&config),
                id: None,
                name: name.into(),
                protocol: ProviderProtocol::OpenaiChatCompletions,
                base_url: format!("http://127.0.0.1:{port}/{name}/v1"),
                enabled: true,
                models: vec![format!("{name}1"), format!("{name}2")],
                credential: None,
            })
            .unwrap();
        providers.push(view.providers.last().unwrap().clone());
    }
    let team = config
        .save_team(SaveTeam {
            protocol_version: 1,
            expected_revision: rev(&config),
            id: None,
            slug: "auto-test".into(),
            recipe: recipe(false),
        })
        .unwrap()
        .teams[0]
        .team
        .clone();
    let publish = || {
        config.publish_team(RevisionCommand {
            protocol_version: 1,
            expected_revision: rev(&config),
            id: team.id.clone(),
        })
    };
    assert_eq!(publish().unwrap_err().code, ErrorCode::NoAvailableBrain);
    let snapshot = config.read_snapshot().unwrap().1;
    for p in &snapshot.providers {
        for model in &p.provider.models {
            ConfigService::record_runtime_health(
                temp.path(),
                &p.provider.id,
                model,
                &provider_fingerprint(p),
                HealthObservation::CatalogSeen,
            )
            .unwrap();
        }
    }
    assert_eq!(
        publish().unwrap_err().code,
        ErrorCode::NoAvailableBrain,
        "Catalog does not prove inference"
    );
    let manager = GatewayManager::new(
        temp.path(),
        std::path::Path::new(env!("CARGO_BIN_EXE_tagma-gateway")),
    );
    manager.start(gateway_port).await.unwrap();
    // Stop the exact owned sidecar before TempDir drops even if an assertion fails.
    let outcome = std::panic::AssertUnwindSafe(async {
    let client = reqwest::Client::builder()
        .no_proxy()
        .timeout(Duration::from_secs(12))
        .build()
        .unwrap();
    let base = format!("http://127.0.0.1:{gateway_port}/v1");
    catalog(&client, &base, true).await;
    assert!(
        calls.lock().unwrap().is_empty(),
        "Catalog listing must not probe upstream"
    );
    assert_eq!(answer(&client, &base, "a2", "warm").await, "a/a2");
    assert_eq!(answer(&client, &base, "b1", "warm").await, "b/b1");
    catalog(&client, &base, true).await;
    publish().unwrap();
    manager.apply().await.unwrap();
    assert_eq!(
        answer(&client, &base, "tagma/auto-test", "normal").await,
        "a/a2"
    );
    answer(&client, &base, "a1", "warm").await;
    catalog(&client, &base, true).await;
    assert_eq!(
        answer(&client, &base, "tagma/auto-test", "normal").await,
        "a/a1"
    );
    catalog(&client, &base, true).await;
    save_models(&config, &providers[0], vec!["a2".into(), "a1".into()]);
    manager.apply().await.unwrap();
    assert_eq!(
        answer(&client, &base, "tagma/auto-test", "normal").await,
        "a/a2"
    );
    catalog(&client, &base, true).await;
    config
        .reorder_providers(ReorderProviders {
            protocol_version: 1,
            expected_revision: rev(&config),
            ids: vec![providers[1].id.clone(), providers[0].id.clone()],
        })
        .unwrap();
    manager.apply().await.unwrap();
    assert_eq!(
        answer(&client, &base, "tagma/auto-test", "normal").await,
        "b/b1"
    );
    catalog(&client, &base, true).await;
    let profile = config
        .save_profile(SaveAppProfile {
            protocol_version: 1,
            expected_revision: rev(&config),
            id: None,
            name: "Explicit default".into(),
            target_app: "fixture".into(),
            provider_ids: vec![providers[0].id.clone(), providers[1].id.clone()],
            use_global_order: false,
        })
        .unwrap()
        .profiles[1]
        .clone();
    config
        .save_first_cloud_order(SaveFirstCloudOrder {
            protocol_version: 1,
            expected_revision: rev(&config),
            order: FirstCloudOrder::DefaultApp {
                profile_id: profile.id.clone(),
            },
        })
        .unwrap();
    manager.apply().await.unwrap();
    assert_eq!(
        answer(&client, &base, "tagma/auto-test", "normal").await,
        "a/a2"
    );
    catalog(&client, &base, true).await;
    config
        .save_profile(SaveAppProfile {
            protocol_version: 1,
            expected_revision: rev(&config),
            id: Some(profile.id),
            name: profile.name,
            target_app: profile.target_app,
            provider_ids: vec![],
            use_global_order: false,
        })
        .unwrap();
    manager.apply().await.unwrap();
    let count = calls.lock().unwrap().len();
    unavailable(&client, &base).await;
    assert_eq!(
        calls.lock().unwrap().len(),
        count,
        "Empty default App must not escape to global"
    );
    config
        .save_first_cloud_order(SaveFirstCloudOrder {
            protocol_version: 1,
            expected_revision: rev(&config),
            order: FirstCloudOrder::Global {},
        })
        .unwrap();
    let first = config.view().unwrap().teams[0].team.versions[0].clone();
    config
        .save_team(SaveTeam {
            protocol_version: 1,
            expected_revision: rev(&config),
            id: Some(team.id.clone()),
            slug: team.slug.clone(),
            recipe: recipe(true),
        })
        .unwrap();
    assert_eq!(
        config.view().unwrap().teams[0].team.versions[0],
        first,
        "Published manual recipe stays immutable"
    );
    publish().unwrap();
    manager.apply().await.unwrap();
    calls.lock().unwrap().clear();
    let pending = {
        let client = client.clone();
        let base = base.clone();
        tokio::spawn(async move { answer(&client, &base, "tagma/auto-test@2", "pin").await })
    };
    tokio::time::timeout(Duration::from_secs(2), entered.notified())
        .await
        .unwrap();
    config
        .reorder_providers(ReorderProviders {
            protocol_version: 1,
            expected_revision: rev(&config),
            ids: vec![providers[0].id.clone(), providers[1].id.clone()],
        })
        .unwrap();
    manager.apply().await.unwrap();
    assert_eq!(
        call(&client, &base, "b1", "fail").await.status(),
        StatusCode::BAD_GATEWAY
    );
    catalog(&client, &base, true).await;
    assert_eq!(
        answer(&client, &base, "tagma/auto-test", "new-while-old-running").await,
        "a/a2"
    );
    release.notify_one();
    assert_eq!(pending.await.unwrap(), "b/b1");
    catalog(&client, &base, true).await;
    let seen = calls.lock().unwrap().clone();
    assert_eq!(seen[0], ("b".into(), "b1".into(), "pin".into()));
    assert_eq!(
        seen.last().unwrap(),
        &("b".into(), "b1".into(), "b/b1".into())
    );
    println!(
        "A14 HTTP pin: in-flight two-step target=b/b1 across config reorder + b1 authentication failure; concurrent new call=a/a2; old published manual recipe unchanged"
    );
    // Only health changes here: new calls must use a1 while the pinned a2 call remains in flight.
    let pending = {
        let client = client.clone();
        let base = base.clone();
        tokio::spawn(async move { answer(&client, &base, "tagma/auto-test@2", "pin").await })
    };
    tokio::time::timeout(Duration::from_secs(2), entered.notified())
        .await
        .unwrap();
    assert_eq!(
        call(&client, &base, "a2", "fail").await.status(),
        StatusCode::BAD_GATEWAY
    );
    catalog(&client, &base, true).await;
    assert_eq!(
        answer(&client, &base, "tagma/auto-test", "new-after-health-change").await,
        "a/a1"
    );
    release.notify_one();
    assert_eq!(pending.await.unwrap(), "a/a2");
    catalog(&client, &base, true).await;
    // Force one bounded metadata write failure in this fixture; old ready rows are insufficient.
    let db = rusqlite::Connection::open(temp.path().join("config.sqlite3")).unwrap();
    db.execute_batch("BEGIN IMMEDIATE").unwrap();
    answer(&client, &base, "a1", "warm-but-unconfirmed").await;
    let unavailable_catalog = catalog(&client, &base, false).await;
    assert!(
        !unavailable_catalog["data"]
            .as_array()
            .unwrap()
            .iter()
            .any(|v| v["id"] == "tagma/auto-test")
    );
    let count = calls.lock().unwrap().len();
    unavailable(&client, &base).await;
    assert_eq!(calls.lock().unwrap().len(), count);
    tokio::time::sleep(Duration::from_millis(320)).await;
    db.execute_batch("ROLLBACK").unwrap();
    // A successful read does not clear an unconfirmed write; only a later successful observation does.
    unavailable(&client, &base).await;
    answer(&client, &base, "a1", "recover").await;
    catalog(&client, &base, true).await;
    // Age only synthetic records; avoid a five-minute sleep or any change to the OS clock.
    let expired = i64::try_from(now_ms().unwrap() - HEALTH_TTL_MS).unwrap();
    db.execute("UPDATE model_health SET observation=json_set(observation,'$.inference_succeeded_ms',?1,'$.inference_failed_ms',NULL,'$.failure',NULL)",[expired]).unwrap();
    let before = calls.lock().unwrap().len();
    let expired_catalog = catalog(&client, &base, true).await;
    assert!(
        !expired_catalog["data"]
            .as_array()
            .unwrap()
            .iter()
            .any(|v| v["id"] == "tagma/auto-test")
    );
    unavailable(&client, &base).await;
    assert_eq!(
        calls.lock().unwrap().len(),
        before,
        "Rejected or listing requests never generate a probe"
    );
    println!(
        "A14 HTTP selection: actual inference required; global provider+model reorder; default App custom/empty scope; stale rows -> NO_AVAILABLE_BRAIN; pending/failed write -> omitted/rejected; no implicit probes; metadata recovery verified"
    );
    drop(db);
    }).catch_unwind().await;
    let stopped = manager.stop().await;
    if let Err(payload) = outcome {
        std::panic::resume_unwind(payload);
    }
    stopped.unwrap();
}
