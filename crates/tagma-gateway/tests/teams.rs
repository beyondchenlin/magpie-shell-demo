//! Headless loopback-only integration: never launches or controls a desktop window.
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
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
    time::Duration,
};
use tagma_core::{credentials::SystemCredentials, teams::*, *};
use tagma_runtime::GatewayManager;

struct Dropped(Arc<AtomicBool>);
impl Drop for Dropped {
    fn drop(&mut self) {
        self.0.store(true, Ordering::SeqCst);
    }
}
struct AbortServer(tokio::task::JoinHandle<()>);
impl Drop for AbortServer {
    fn drop(&mut self) {
        self.0.abort();
    }
}
fn command(revision: u32, id: &str) -> RevisionCommand {
    RevisionCommand {
        protocol_version: 1,
        expected_revision: revision,
        id: id.into(),
    }
}
fn recipe(provider: &str) -> TeamRecipe {
    let target = |model: &str| CloudTarget {
        provider_id: provider.into(),
        model_id: model.into(),
    };
    let step = |model: &str, input, output| TeamStep {
        target: TeamStepTarget::CloudModel {
            target: target(model).into(),
        },
        input,
        output,
        timeout_ms: 1000,
        failure: TeamFailurePolicy::Abort,
        side_effect: TeamSideEffect::OutboundModelRequest,
    };
    TeamRecipe {
        display_name: "合成测试小队".into(),
        brain: TeamBrain::Explicit {
            target: target("final-model"),
        },
        routing: TeamRouting::Sequential,
        total_timeout_ms: 2000,
        steps: vec![
            step(
                "review-model",
                TeamStepInput::OriginalMessages,
                TeamStepOutput::IntermediateText,
            ),
            step(
                "final-model",
                TeamStepInput::PreviousText,
                TeamStepOutput::FinalAnswer,
            ),
        ],
    }
}

#[tokio::test]
async fn team_execution_pins_recipe_and_targets_and_stops_after_failure_timeout_or_cancel() {
    let calls = Arc::new(Mutex::new(Vec::<(String, String, bool, bool)>::new()));
    let cancelled = Arc::new(AtomicBool::new(false));
    let entered = Arc::new(tokio::sync::Notify::new());
    let release = Arc::new(tokio::sync::Notify::new());
    let upstream=Router::new().fallback(post({let calls=calls.clone();let cancelled=cancelled.clone();let entered=entered.clone();let release=release.clone();move|request:Request|{
        let calls=calls.clone();let cancelled=cancelled.clone();let entered=entered.clone();let release=release.clone();async move{
            let secondary=request.uri().path().starts_with("/second/");
            let bytes=axum::body::to_bytes(request.into_body(),128*1024).await.unwrap();let input:Value=serde_json::from_slice(&bytes).unwrap();
            let model=input["model"].as_str().unwrap().to_owned();let prompt=input["messages"][0]["content"].as_str().unwrap().to_owned();let streaming=input["stream"].as_bool().unwrap_or(false);
            calls.lock().unwrap().push((model.clone(),prompt.clone(),streaming,secondary));
            if model=="review-model"{
                assert!(!streaming);assert!(input.get("stream_options").is_none());
                if prompt=="error"{return(StatusCode::TOO_MANY_REQUESTS,"private-upstream-body").into_response();}
                if prompt=="tool"{return Json(json!({"choices":[{"message":{"content":"unhandled","tool_calls":[]}}]})).into_response();}
                if ["length","content_filter","missing_finish","null_finish","non_string_finish","unknown_finish","legacy_function","legacy_reason","tool_reason","refusal","invalid_role","invalid_index"].contains(&prompt.as_str()){
                    let reason=match prompt.as_str(){"unknown_finish"=>"unknown","legacy_reason"=>"function_call","tool_reason"=>"tool_calls","legacy_function"|"refusal"=>"stop",other=>other};
                    let mut result=json!({"model":model,"choices":[{"index":0,"message":{"role":"assistant","content":"partial-review-output"},"finish_reason":reason}]});
                    if prompt=="missing_finish"{result["choices"][0].as_object_mut().unwrap().remove("finish_reason");}
                    if prompt=="null_finish"{result["choices"][0]["finish_reason"]=Value::Null;}
                    if prompt=="non_string_finish"{result["choices"][0]["finish_reason"]=json!(123);}
                    if prompt=="invalid_role"{result["choices"][0]["finish_reason"]=json!("stop");result["choices"][0]["message"]["role"]=json!("user");}
                    if prompt=="invalid_index"{result["choices"][0]["finish_reason"]=json!("stop");result["choices"][0]["index"]=json!(1);}
                    if prompt=="legacy_function"{result["choices"][0]["message"]["function_call"]=json!({"name":"unhandled","arguments":"{}"});}
                    if prompt=="refusal"{result["choices"][0]["message"]["refusal"]=json!("refused");}
                    return Json(result).into_response();
                }
                if prompt=="cancel"||prompt=="timeout"{
                    let guard=Dropped(cancelled);return ([("content-type","application/json")],Body::from_stream(async_stream::stream!{let _guard=guard;yield Ok::<_,Infallible>(Bytes::from_static(b"{\"choices\":["));loop{tokio::time::sleep(Duration::from_millis(30)).await;yield Ok(Bytes::from_static(b" "));}})).into_response();
                }
                if prompt=="pin"{entered.notify_one();release.notified().await;}
                let content=if prompt=="empty"{String::new()}else if prompt=="huge"{"x".repeat(96*1024+1)}else{"intermediate-only".into()};
                return Json(json!({"model":model,"choices":[{"index":0,"message":{"role":"assistant","content":content},"finish_reason":"stop"}]})).into_response();
            }
            let content=if secondary{"changed-answer"}else{"final-only"};
            let finish=match prompt.as_str(){"final-length"=>"length","final-filter"=>"content_filter",_=>"stop"};
            if streaming{
                let frames=format!("data: {}\n\ndata: {}\n\ndata: [DONE]\n\n",json!({"model":model,"choices":[{"index":0,"delta":{"content":content},"finish_reason":null}]}),json!({"model":model,"choices":[{"index":0,"delta":{},"finish_reason":finish}]}));
                return ([("content-type","text/event-stream")],frames).into_response();
            }
            Json(json!({"model":model,"choices":[{"index":0,"message":{"role":"assistant","content":content},"finish_reason":finish}]})).into_response()
        }
    }}));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let upstream_port = listener.local_addr().unwrap().port();
    let _server = AbortServer(tokio::spawn(async move {
        axum::serve(listener, upstream).await.unwrap()
    }));
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
    let provider = config
        .save_provider(SaveProvider {
            protocol_version: 1,
            expected_revision: 1,
            id: None,
            name: "fixture".into(),
            protocol: ProviderProtocol::OpenaiChatCompletions,
            base_url: format!("http://127.0.0.1:{upstream_port}/v1"),
            enabled: true,
            models: vec!["review-model".into(), "final-model".into()],
            credential: None,
        })
        .unwrap()
        .providers[0]
        .clone();
    let team = config
        .save_team(SaveTeam {
            protocol_version: 1,
            expected_revision: 2,
            id: None,
            slug: "test-team".into(),
            recipe: recipe(&provider.id),
        })
        .unwrap()
        .teams[0]
        .team
        .clone();
    let manager = GatewayManager::new(
        temp.path(),
        std::path::Path::new(env!("CARGO_BIN_EXE_tagma-gateway")),
    );
    manager.start(gateway_port).await.unwrap();
    let client = reqwest::Client::builder()
        .no_proxy()
        .timeout(Duration::from_secs(5))
        .build()
        .unwrap();
    let base = format!("http://127.0.0.1:{gateway_port}/v1");
    let endpoint = format!("{base}/chat/completions");
    let input = |prompt: &str, stream: bool, model: &str| {
        let mut value =
            json!({"model":model,"messages":[{"role":"user","content":prompt}],"stream":stream});
        if stream {
            value["stream_options"] = json!({"include_usage":true});
        }
        value
    };
    let catalog: Value = client
        .get(format!("{base}/models"))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(
        catalog["data"].as_array().unwrap().len(),
        2,
        "Draft must not be callable"
    );
    config.publish_team(command(3, &team.id)).unwrap();
    manager.apply().await.unwrap();
    let catalog: Value = client
        .get(format!("{base}/models"))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert!(
        catalog["data"]
            .as_array()
            .unwrap()
            .iter()
            .any(|m| m["id"] == "tagma/test-team")
    );
    let response = client
        .post(&endpoint)
        .json(&input("normal", true, "tagma/test-team"))
        .send()
        .await
        .unwrap();
    assert_eq!(response.headers()["x-tagma-team-revision"], "1");
    let text = response.text().await.unwrap();
    assert!(text.contains("final-only"));
    assert!(text.contains("tagma/test-team"));
    assert!(!text.contains("intermediate-only"));
    assert!(text.ends_with("data: [DONE]\n\n"));
    assert_eq!(
        *calls.lock().unwrap(),
        vec![
            ("review-model".into(), "normal".into(), false, false),
            (
                "final-model".into(),
                "intermediate-only".into(),
                true,
                false
            )
        ]
    );
    for (prompt, code) in [
        ("length", "TEAM_INTERMEDIATE_TRUNCATED"),
        ("content_filter", "TEAM_INTERMEDIATE_FILTERED"),
        ("missing_finish", "TEAM_INTERMEDIATE_INCOMPLETE"),
        ("null_finish", "TEAM_INTERMEDIATE_INCOMPLETE"),
        ("non_string_finish", "TEAM_INTERMEDIATE_INCOMPLETE"),
        ("unknown_finish", "TEAM_INTERMEDIATE_INCOMPLETE"),
        ("legacy_function", "TEAM_INTERMEDIATE_UNHANDLED_CALL"),
        ("legacy_reason", "TEAM_INTERMEDIATE_INCOMPLETE"),
        ("tool_reason", "TEAM_INTERMEDIATE_INCOMPLETE"),
        ("refusal", "TEAM_INTERMEDIATE_REFUSED"),
        ("invalid_role", "UPSTREAM_PROTOCOL_ERROR"),
        ("invalid_index", "UPSTREAM_PROTOCOL_ERROR"),
        ("error", "UPSTREAM_RATE_LIMITED"),
        ("tool", "UPSTREAM_PROTOCOL_ERROR"),
        ("empty", "TEAM_INTERMEDIATE_EMPTY"),
        ("huge", "TEAM_INTERMEDIATE_LIMIT"),
        ("timeout", "REQUEST_BUDGET_EXCEEDED"),
    ] {
        calls.lock().unwrap().clear();
        let response = client
            .post(&endpoint)
            .json(&input(prompt, false, "tagma/test-team"))
            .send()
            .await
            .unwrap();
        let final_calls = calls
            .lock()
            .unwrap()
            .iter()
            .filter(|call| call.0 == "final-model")
            .count();
        println!(
            "SUP-005 case={prompt} final_calls={final_calls} status={}",
            response.status()
        );
        assert_eq!(
            final_calls, 0,
            "Intermediate {prompt} must not start the final step"
        );
        assert!(!response.status().is_success());
        let text = response.text().await.unwrap();
        assert!(text.contains(code), "{prompt}: {text}");
        assert!(!text.contains("private-upstream-body"));
        assert_eq!(
            calls.lock().unwrap().len(),
            1,
            "No later step or retry on {prompt}"
        );
    }
    cancelled.store(false, Ordering::SeqCst);
    calls.lock().unwrap().clear();
    let request = tokio::spawn({
        let client = client.clone();
        let endpoint = endpoint.clone();
        let body = input("cancel", false, "tagma/test-team");
        async move { client.post(endpoint).json(&body).send().await }
    });
    tokio::time::timeout(Duration::from_secs(2), async {
        while calls.lock().unwrap().is_empty() {
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    })
    .await
    .unwrap();
    request.abort();
    let _ = request.await;
    tokio::time::timeout(Duration::from_secs(2), async {
        while !cancelled.load(Ordering::SeqCst) {
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    })
    .await
    .expect("Cancel must close the intermediate upstream");
    assert_eq!(calls.lock().unwrap().len(), 1);
    calls.lock().unwrap().clear();
    let pinned = tokio::spawn({
        let client = client.clone();
        let endpoint = endpoint.clone();
        let body = input("pin", false, "tagma/test-team");
        async move { client.post(endpoint).json(&body).send().await.unwrap() }
    });
    tokio::time::timeout(Duration::from_secs(2), entered.notified())
        .await
        .unwrap();
    let mut manual = recipe(&provider.id);
    manual.routing = TeamRouting::Manual;
    manual.steps.remove(0);
    manual.steps[0].input = TeamStepInput::OriginalMessages;
    config
        .save_team(SaveTeam {
            protocol_version: 1,
            expected_revision: 4,
            id: Some(team.id.clone()),
            slug: team.slug.clone(),
            recipe: manual,
        })
        .unwrap();
    config.publish_team(command(5, &team.id)).unwrap();
    config
        .save_provider(SaveProvider {
            protocol_version: 1,
            expected_revision: 6,
            id: Some(provider.id.clone()),
            name: provider.name.clone(),
            protocol: provider.protocol.clone(),
            base_url: format!("http://127.0.0.1:{upstream_port}/second/v1"),
            enabled: true,
            models: provider.models.clone(),
            credential: None,
        })
        .unwrap();
    manager.apply().await.unwrap();
    release.notify_one();
    let response = pinned.await.unwrap();
    assert_eq!(response.headers()["x-tagma-config-revision"], "4");
    let response: Value = response.json().await.unwrap();
    assert_eq!(response["choices"][0]["message"]["content"], "final-only");
    assert_eq!(calls.lock().unwrap().len(), 2);
    assert!(
        !calls.lock().unwrap()[1].3,
        "Later step must retain the pinned provider target"
    );
    calls.lock().unwrap().clear();
    let response: Value = client
        .post(&endpoint)
        .json(&input("normal", false, "tagma/test-team@2"))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(response["model"], "tagma/test-team@2");
    assert_eq!(
        response["choices"][0]["message"]["content"],
        "changed-answer"
    );
    assert_eq!(
        calls.lock().unwrap().len(),
        1,
        "Explicit revision 2 uses its manual recipe"
    );
    for (prompt, reason) in [
        ("final-length", "length"),
        ("final-filter", "content_filter"),
    ] {
        for model in ["tagma/test-team@2", "final-model"] {
            let response: Value = client
                .post(&endpoint)
                .json(&input(prompt, false, model))
                .send()
                .await
                .unwrap()
                .error_for_status()
                .unwrap()
                .json()
                .await
                .unwrap();
            assert_eq!(response["choices"][0]["finish_reason"], reason);
            let response = client
                .post(&endpoint)
                .json(&input(prompt, true, model))
                .send()
                .await
                .unwrap()
                .error_for_status()
                .unwrap()
                .text()
                .await
                .unwrap();
            assert!(response.contains(&format!("\"finish_reason\":\"{reason}\"")));
            assert!(response.ends_with("data: [DONE]\n\n"));
            assert!(!response.contains("TEAM_INTERMEDIATE"));
            println!("SUP-005 final model={model} reason={reason} nonstream_and_stream=preserved");
        }
    }
    calls.lock().unwrap().clear();
    client
        .post(&endpoint)
        .json(&input("normal", false, "tagma/test-team"))
        .send()
        .await
        .unwrap()
        .error_for_status()
        .unwrap();
    assert_eq!(
        calls.lock().unwrap().len(),
        2,
        "Bare ID remains the original sequential recipe"
    );
    config
        .set_team_enabled(SetTeamEnabled {
            protocol_version: 1,
            expected_revision: 7,
            id: team.id,
            team_revision: 1,
            enabled: false,
        })
        .unwrap();
    manager.apply().await.unwrap();
    calls.lock().unwrap().clear();
    let response = client
        .post(&endpoint)
        .json(&input("normal", false, "tagma/test-team"))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::GONE);
    assert!(calls.lock().unwrap().is_empty());
    let catalog: Value = client
        .get(format!("{base}/models"))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert!(
        !catalog["data"]
            .as_array()
            .unwrap()
            .iter()
            .any(|m| m["id"] == "tagma/test-team")
    );
    assert!(
        catalog["data"]
            .as_array()
            .unwrap()
            .iter()
            .any(|m| m["id"] == "tagma/test-team@2")
    );
    config
        .save_provider(SaveProvider {
            protocol_version: 1,
            expected_revision: 8,
            id: Some(provider.id),
            name: provider.name,
            protocol: provider.protocol,
            base_url: format!("http://127.0.0.1:{upstream_port}/second/v1"),
            enabled: false,
            models: provider.models,
            credential: None,
        })
        .unwrap();
    manager.apply().await.unwrap();
    let response = client
        .post(&endpoint)
        .json(&input("normal", false, "tagma/test-team@2"))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    assert!(
        response
            .text()
            .await
            .unwrap()
            .contains("TEAM_DEPENDENCY_UNAVAILABLE")
    );
    assert!(calls.lock().unwrap().is_empty());
    let catalog: Value = client
        .get(format!("{base}/models"))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert!(
        catalog["data"].as_array().unwrap().is_empty(),
        "Disabled dependencies must not be advertised"
    );
    manager.stop().await.unwrap();
}
