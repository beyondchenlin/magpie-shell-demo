use super::Runtime;
use axum::{
    Json, Router,
    body::{Body, Bytes},
    extract::{DefaultBodyLimit, Request, State, rejection::JsonRejection},
    http::{HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use futures_util::StreamExt;
use serde_json::{Value, json};
use std::{collections::HashSet, convert::Infallible, sync::Arc, time::Duration};
use tagma_core::chat::{MAX_RESPONSE_BYTES, SseDecoder};
use tagma_core::{
    Provider,
    teams::{CloudTarget, TeamBrain, TeamStepInput, TeamStepTarget, valid_team_slug},
};

struct PinnedStep {
    provider: Provider,
    model: String,
    credential: Option<Arc<zeroize::Zeroizing<String>>>,
    input: TeamStepInput,
    timeout: Duration,
    fingerprint: String,
}
#[derive(Clone)]
struct HealthContext {
    tracker: Arc<super::health::Tracker>,
    provider_id: String,
    model_id: String,
    fingerprint: String,
}
impl HealthContext {
    fn observe(&self, observation: tagma_core::health::HealthObservation) {
        self.tracker.observe(
            &self.provider_id,
            &self.model_id,
            &self.fingerprint,
            observation,
        );
    }
}
fn health_failure(code: &str) -> Option<tagma_core::health::HealthFailure> {
    use tagma_core::health::HealthFailure::*;
    match code {
        "UPSTREAM_AUTH_FAILED" => Some(Authentication),
        "UPSTREAM_CONNECT_TIMEOUT"
        | "UPSTREAM_RESPONSE_TIMEOUT"
        | "UPSTREAM_IDLE_TIMEOUT"
        | "REQUEST_BUDGET_EXCEEDED" => Some(Timeout),
        "UPSTREAM_RATE_LIMITED" => Some(RateLimited),
        "UPSTREAM_PROTOCOL_ERROR" | "RESPONSE_LIMIT_EXCEEDED" => Some(Protocol),
        "UPSTREAM_CONNECTION_FAILED"
        | "UPSTREAM_TRANSPORT_ERROR"
        | "UPSTREAM_STREAM_INTERRUPTED" => Some(Connection),
        code if code.starts_with("UPSTREAM_") => Some(Upstream),
        _ => None,
    }
}
struct PinnedPlan {
    revision: u32,
    steps: Vec<PinnedStep>,
    timeout: Duration,
    public_model: Option<String>,
    team_revision: Option<u32>,
    automatic_brain: bool,
}

struct PlanError(StatusCode, &'static str);

fn pin_plan(
    loaded: &super::LoadedSnapshot,
    model: &str,
    first_cloud: Option<&CloudTarget>,
) -> Result<PinnedPlan, PlanError> {
    let pin =
        |record: &tagma_core::service::ProviderRecord, model: String, input, timeout| PinnedStep {
            provider: record.provider.clone(),
            credential: loaded.3.get(&record.provider.id).cloned(),
            fingerprint: tagma_core::health::provider_fingerprint(record),
            model,
            input,
            timeout,
        };
    if !model.starts_with("tagma/") {
        let record = loaded
            .1
            .providers
            .iter()
            .find(|r| r.provider.enabled && r.provider.models.iter().any(|id| id == model))
            .ok_or(PlanError(StatusCode::NOT_FOUND, "MODEL_NOT_FOUND"))?;
        return Ok(PinnedPlan {
            revision: loaded.0,
            steps: vec![pin(
                record,
                model.into(),
                TeamStepInput::OriginalMessages,
                Duration::from_secs(120),
            )],
            timeout: Duration::from_secs(120),
            public_model: None,
            team_revision: None,
            automatic_brain: false,
        });
    }
    let (team, version) = loaded
        .1
        .teams
        .iter()
        .find_map(|team| {
            team.versions
                .iter()
                .find(|v| v.public_id == model)
                .map(|v| (team, v))
        })
        .ok_or(PlanError(StatusCode::NOT_FOUND, "MODEL_NOT_FOUND"))?;
    if !team.enabled_revisions.contains(&version.revision) {
        return Err(PlanError(StatusCode::GONE, "TEAM_DISABLED"));
    }
    let automatic_brain = matches!(version.recipe.brain, TeamBrain::FirstCloud {});
    let brain = version.recipe.resolve_brain(first_cloud);
    if automatic_brain && brain.is_none() {
        return Err(PlanError(
            StatusCode::SERVICE_UNAVAILABLE,
            "NO_AVAILABLE_BRAIN",
        ));
    }
    if !valid_team_slug(&team.slug)
        || version.recipe.validate_draft().is_err()
        || !version
            .recipe
            .publish_issues_with_candidate(&loaded.1, first_cloud)
            .is_empty()
    {
        return Err(PlanError(
            StatusCode::SERVICE_UNAVAILABLE,
            "TEAM_DEPENDENCY_UNAVAILABLE",
        ));
    }
    let mut steps = Vec::new();
    for step in &version.recipe.steps {
        let TeamStepTarget::CloudModel { target } = &step.target else {
            return Err(PlanError(
                StatusCode::SERVICE_UNAVAILABLE,
                "TEAM_DEPENDENCY_UNAVAILABLE",
            ));
        };
        let target = target.resolve(brain.as_ref()).ok_or(PlanError(
            StatusCode::SERVICE_UNAVAILABLE,
            "TEAM_DEPENDENCY_UNAVAILABLE",
        ))?;
        let provider = loaded
            .1
            .providers
            .iter()
            .find(|r| {
                r.provider.id == target.provider_id
                    && r.provider.enabled
                    && r.provider.models.contains(&target.model_id)
            })
            .ok_or(PlanError(
                StatusCode::SERVICE_UNAVAILABLE,
                "TEAM_DEPENDENCY_UNAVAILABLE",
            ))?;
        steps.push(pin(
            provider,
            target.model_id.clone(),
            step.input.clone(),
            Duration::from_millis(step.timeout_ms.into()),
        ));
    }
    Ok(PinnedPlan {
        revision: loaded.0,
        steps,
        timeout: Duration::from_millis(version.recipe.total_timeout_ms.into()),
        public_model: Some(version.public_id.clone()),
        team_revision: Some(version.revision),
        automatic_brain,
    })
}

pub fn client() -> Result<reqwest::Client, reqwest::Error> {
    reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .retry(reqwest::retry::never())
        .connect_timeout(Duration::from_secs(10))
        .pool_max_idle_per_host(2)
        .build()
}

pub fn trusted_local_request(request: &Request, port: u16) -> bool {
    // The bundled UI uses the native bridge, not browser cross-origin fetch.
    !request.headers().contains_key("origin")
        && !request.headers().contains_key("sec-fetch-site")
        && request
            .headers()
            .get("host")
            .and_then(|h| h.to_str().ok())
            .is_some_and(|host| {
                host == format!("127.0.0.1:{port}") || host == format!("localhost:{port}")
            })
}

pub fn error(status: StatusCode, code: &str) -> Response {
    let mut response = (
        status,
        Json(json!({"error":{"code":code,"message":code,"type":"tagma_gateway_error"}})),
    )
        .into_response();
    if let Some(failure) = health_failure(code) {
        response.extensions_mut().insert(failure);
    }
    response
}

pub fn router(state: Arc<Runtime>) -> Router {
    Router::new()
        .route("/v1/models", get(models))
        .route("/v1/chat/completions", post(completion))
        .fallback(|| async { error(StatusCode::NOT_IMPLEMENTED, "UNSUPPORTED_CAPABILITY") })
        .layer(DefaultBodyLimit::max(128 * 1024))
        .with_state(state)
}

async fn models(State(state): State<Arc<Runtime>>) -> Response {
    let health_snapshot = {
        let loaded = state.snapshot.read().await;
        if loaded.1.teams.iter().any(|team| {
            team.versions.iter().any(|version| {
                team.enabled_revisions.contains(&version.revision)
                    && matches!(version.recipe.brain, TeamBrain::FirstCloud {})
            })
        }) {
            Some(loaded.1.clone())
        } else {
            None
        }
    };
    let health = if let Some(snapshot) = health_snapshot {
        state.health.read_confirmed(snapshot).await
    } else {
        None
    };
    let loaded = state.snapshot.read().await;
    let first_cloud = health.as_ref().and_then(|(_, records)| {
        tagma_core::health::select_first_cloud(
            &loaded.1,
            records,
            tagma_core::health::now_ms().unwrap_or(0),
        )
    });
    let mut seen = HashSet::new();
    let mut data: Vec<_> = loaded
        .1
        .providers
        .iter()
        .filter(|record| record.provider.enabled)
        .flat_map(|record| &record.provider.models)
        .filter(|id| !id.starts_with("tagma/") && seen.insert((*id).clone()))
        .map(|id| json!({"id":id,"object":"model","created":0,"owned_by":"configured-provider"}))
        .collect();
    for team in &loaded.1.teams {
        for version in &team.versions {
            if pin_plan(&loaded, &version.public_id, first_cloud.as_ref()).is_ok_and(|plan| {
                !plan.automatic_brain
                    || health.as_ref().is_some_and(|(epoch, _)| {
                        *epoch == state.health.epoch() && state.health.confirmed()
                    })
            }) && seen.insert(version.public_id.clone())
            {
                data.push(
                    json!({"id":version.public_id,"object":"model","created":0,"owned_by":"tagma"}),
                );
            }
        }
    }
    let mut response = Json(json!({"object":"list","data":data})).into_response();
    response
        .headers_mut()
        .insert("x-tagma-config-revision", HeaderValue::from(loaded.0));
    response.headers_mut().insert(
        "x-tagma-health-revision",
        HeaderValue::from(state.health.epoch()),
    );
    response.headers_mut().insert(
        "x-tagma-health-writes-confirmed",
        HeaderValue::from_static(if state.health.confirmed() {
            "true"
        } else {
            "false"
        }),
    );
    response
}

fn validate(input: &Value) -> Result<(&str, bool), &'static str> {
    let object = input.as_object().ok_or("INVALID_REQUEST")?;
    const FIELDS: &[&str] = &[
        "model",
        "messages",
        "stream",
        "temperature",
        "top_p",
        "max_tokens",
        "max_completion_tokens",
        "stop",
        "seed",
        "stream_options",
        "n",
    ];
    if object.keys().any(|key| !FIELDS.contains(&key.as_str())) {
        return Err("UNSUPPORTED_FIELD");
    }
    let model = input["model"]
        .as_str()
        .filter(|s| !s.is_empty() && s.len() <= 256)
        .ok_or("INVALID_REQUEST")?;
    let messages = input["messages"]
        .as_array()
        .filter(|m| !m.is_empty() && m.len() <= 128)
        .ok_or("INVALID_REQUEST")?;
    for message in messages {
        let fields = message.as_object().ok_or("INVALID_REQUEST")?;
        if fields
            .keys()
            .any(|key| !["role", "content"].contains(&key.as_str()))
        {
            return Err("UNSUPPORTED_FIELD");
        }
        if !matches!(
            message["role"].as_str(),
            Some("system" | "user" | "assistant" | "developer")
        ) || !message["content"].is_string()
        {
            return Err("UNSUPPORTED_MESSAGE");
        }
    }
    for (key, max) in [("temperature", 2.0), ("top_p", 1.0)] {
        if let Some(value) = object.get(key)
            && !value
                .as_f64()
                .is_some_and(|n| n.is_finite() && n >= 0.0 && n <= max)
        {
            return Err("INVALID_REQUEST");
        }
    }
    for key in ["max_tokens", "max_completion_tokens"] {
        if let Some(value) = object.get(key)
            && !value.as_u64().is_some_and(|n| n > 0 && n <= 32768)
        {
            return Err("INVALID_REQUEST");
        }
    }
    if object.contains_key("max_tokens") && object.contains_key("max_completion_tokens") {
        return Err("INVALID_REQUEST");
    }
    if let Some(value) = object.get("seed")
        && !value.is_i64()
    {
        return Err("INVALID_REQUEST");
    }
    if let Some(value) = object.get("n")
        && value.as_u64() != Some(1)
    {
        return Err("UNSUPPORTED_FIELD");
    }
    if let Some(value) = object.get("stop") {
        let valid = value.is_null()
            || value.as_str().is_some_and(|s| s.len() <= 1024)
            || value.as_array().is_some_and(|a| {
                a.len() <= 4
                    && a.iter()
                        .all(|s| s.as_str().is_some_and(|s| s.len() <= 1024))
            });
        if !valid {
            return Err("INVALID_REQUEST");
        }
    }
    let stream = object
        .get("stream")
        .map(|v| v.as_bool().ok_or("INVALID_REQUEST"))
        .transpose()?
        .unwrap_or(false);
    if let Some(options) = object.get("stream_options") {
        let fields = options.as_object().ok_or("INVALID_REQUEST")?;
        if !stream
            || fields.keys().any(|key| key != "include_usage")
            || fields.get("include_usage").is_some_and(|v| !v.is_boolean())
        {
            return Err("UNSUPPORTED_FIELD");
        }
    }
    Ok((model, stream))
}

fn stream_error(health: &HealthContext, code: &str) -> Bytes {
    if let Some(failure) = health_failure(code) {
        health.observe(tagma_core::health::HealthObservation::InferenceFailed(
            failure,
        ));
    }
    Bytes::from(format!(
        "data: {}\n\n",
        json!({"error":{"code":code,"message":code}})
    ))
}

fn valid_chunk(value: &Value) -> bool {
    let Some(choices) = value["choices"].as_array() else {
        return false;
    };
    if choices.is_empty() {
        return value["usage"].is_object();
    }
    choices.len() == 1
        && choices.iter().all(|choice| {
            let Some(delta) = choice["delta"].as_object() else {
                return false;
            };
            choice["index"] == 0
                && delta
                    .keys()
                    .all(|key| matches!(key.as_str(), "role" | "content" | "refusal"))
                && ["content", "refusal"].iter().all(|key| {
                    delta
                        .get(*key)
                        .is_none_or(|value| value.is_null() || value.is_string())
                })
                && (choice["finish_reason"].is_null()
                    || matches!(
                        choice["finish_reason"].as_str(),
                        Some("stop" | "length" | "content_filter")
                    ))
        })
}

/// Only a completed assistant text answer can become a subsequent step's input.
/// Final responses retain their ordinary length/content_filter presentation semantics.
fn intermediate_text(value: &Value) -> Result<&str, &'static str> {
    let choices = value["choices"]
        .as_array()
        .filter(|choices| choices.len() == 1)
        .ok_or("UPSTREAM_PROTOCOL_ERROR")?;
    if choices[0]["index"] != 0 {
        return Err("UPSTREAM_PROTOCOL_ERROR");
    }
    match choices[0]["finish_reason"].as_str() {
        Some("stop") => {}
        Some("length") => return Err("TEAM_INTERMEDIATE_TRUNCATED"),
        Some("content_filter") => return Err("TEAM_INTERMEDIATE_FILTERED"),
        _ => return Err("TEAM_INTERMEDIATE_INCOMPLETE"),
    }
    let message = &choices[0]["message"];
    if message.get("tool_calls").is_some() || message.get("function_call").is_some() {
        return Err("TEAM_INTERMEDIATE_UNHANDLED_CALL");
    }
    if message.get("refusal").is_some_and(|value| !value.is_null()) {
        return Err("TEAM_INTERMEDIATE_REFUSED");
    }
    if message["role"] != "assistant" {
        return Err("UPSTREAM_PROTOCOL_ERROR");
    }
    message["content"]
        .as_str()
        .filter(|text| !text.trim().is_empty())
        .ok_or("TEAM_INTERMEDIATE_EMPTY")
}

async fn completion(
    State(state): State<Arc<Runtime>>,
    headers: HeaderMap,
    body: Result<Json<Value>, JsonRejection>,
) -> Response {
    let request_started = tokio::time::Instant::now();
    let Json(input) = match body {
        Ok(input) => input,
        Err(rejection) => {
            return error(
                rejection.status(),
                if rejection.status() == StatusCode::PAYLOAD_TOO_LARGE {
                    "REQUEST_TOO_LARGE"
                } else {
                    "INVALID_REQUEST"
                },
            );
        }
    };
    let (model, streaming) = match validate(&input) {
        Ok(value) => value,
        Err(code) => return error(StatusCode::BAD_REQUEST, code),
    };
    let health_snapshot = if model.starts_with("tagma/") {
        let loaded = state.snapshot.read().await;
        if loaded.1.teams.iter().any(|team| {
            team.versions.iter().any(|version| {
                version.public_id == model
                    && team.enabled_revisions.contains(&version.revision)
                    && matches!(version.recipe.brain, TeamBrain::FirstCloud {})
            })
        }) {
            Some(loaded.1.clone())
        } else {
            None
        }
    } else {
        None
    };
    let health = if let Some(snapshot) = health_snapshot {
        state.health.read_confirmed(snapshot).await
    } else {
        None
    };
    // Pin target, credentials and revision together. A later config apply affects only new calls.
    let plan = {
        let loaded = state.snapshot.read().await;
        if let Some(expected) = headers.get("x-tagma-expected-revision")
            && expected.to_str().ok().and_then(|v| v.parse::<u32>().ok()) != Some(loaded.0)
        {
            return error(StatusCode::CONFLICT, "CONFIG_NOT_APPLIED");
        }
        let first_cloud = health.as_ref().and_then(|(_, records)| {
            tagma_core::health::select_first_cloud(
                &loaded.1,
                records,
                tagma_core::health::now_ms().unwrap_or(0),
            )
        });
        match pin_plan(&loaded, model, first_cloud.as_ref()) {
            Ok(plan) => {
                if plan.automatic_brain
                    && !health.as_ref().is_some_and(|(epoch, _)| {
                        *epoch == state.health.epoch() && state.health.confirmed()
                    })
                {
                    return error(StatusCode::SERVICE_UNAVAILABLE, "NO_AVAILABLE_BRAIN");
                }
                plan
            }
            Err(PlanError(status, code)) => return error(status, code),
        }
    };
    let request_id = uuid::Uuid::new_v4().to_string();
    let total_deadline = request_started + plan.timeout;
    let count = plan.steps.len();
    let mut previous = None;
    for (index, step) in plan.steps.into_iter().enumerate() {
        if state.shutdown.is_cancelled() {
            return error(StatusCode::SERVICE_UNAVAILABLE, "GATEWAY_STOPPING");
        }
        if tokio::time::Instant::now() >= total_deadline {
            return error(StatusCode::GATEWAY_TIMEOUT, "REQUEST_BUDGET_EXCEEDED");
        }
        let final_step = index + 1 == count;
        let mut payload = input.clone();
        payload["model"] = json!(step.model);
        payload["stream"] = json!(final_step && streaming);
        if !final_step {
            payload
                .as_object_mut()
                .expect("validated request")
                .remove("stream_options");
        }
        if step.input == TeamStepInput::PreviousText {
            let Some(text) = previous.take() else {
                return error(StatusCode::BAD_GATEWAY, "TEAM_INTERMEDIATE_EMPTY");
            };
            payload["messages"] = json!([{"role":"user","content":text}]);
        }
        if serde_json::to_vec(&payload).map_or(true, |bytes| bytes.len() > 128 * 1024) {
            return error(StatusCode::PAYLOAD_TOO_LARGE, "TEAM_INTERMEDIATE_LIMIT");
        }
        let deadline = total_deadline.min(tokio::time::Instant::now() + step.timeout);
        let mut response = forward(
            &state,
            &step,
            &payload,
            final_step && streaming,
            deadline,
            if final_step {
                plan.public_model.clone()
            } else {
                None
            },
        )
        .await;
        response.headers_mut().insert(
            "x-tagma-request-id",
            HeaderValue::from_str(&request_id).expect("UUID header"),
        );
        response
            .headers_mut()
            .insert("x-tagma-config-revision", HeaderValue::from(plan.revision));
        if let Some(revision) = plan.team_revision {
            response
                .headers_mut()
                .insert("x-tagma-team-revision", HeaderValue::from(revision));
            response
                .headers_mut()
                .insert("x-tagma-team-step", HeaderValue::from(index as u32 + 1));
        }
        if final_step || !response.status().is_success() {
            return response;
        }
        let bytes = match axum::body::to_bytes(response.into_body(), MAX_RESPONSE_BYTES).await {
            Ok(bytes) => bytes,
            Err(_) => return error(StatusCode::BAD_GATEWAY, "TEAM_INTERMEDIATE_LIMIT"),
        };
        let value = match serde_json::from_slice::<Value>(&bytes) {
            Ok(value) => value,
            Err(_) => return error(StatusCode::BAD_GATEWAY, "UPSTREAM_PROTOCOL_ERROR"),
        };
        let text = match intermediate_text(&value) {
            Ok(text) => text.to_owned(),
            Err(code) => return error(StatusCode::BAD_GATEWAY, code),
        };
        if text.len() > 96 * 1024 {
            return error(StatusCode::BAD_GATEWAY, "TEAM_INTERMEDIATE_LIMIT");
        }
        previous = Some(text);
    }
    error(
        StatusCode::SERVICE_UNAVAILABLE,
        "TEAM_DEPENDENCY_UNAVAILABLE",
    )
}

async fn forward(
    state: &Arc<Runtime>,
    step: &PinnedStep,
    input: &Value,
    streaming: bool,
    total_deadline: tokio::time::Instant,
    public_model: Option<String>,
) -> Response {
    let health = HealthContext {
        tracker: state.health.clone(),
        provider_id: step.provider.id.clone(),
        model_id: step.model.clone(),
        fingerprint: step.fingerprint.clone(),
    };
    let response = forward_response(
        state,
        step,
        input,
        streaming,
        total_deadline,
        public_model,
        health,
    )
    .await;
    if let Some(failure) = response
        .extensions()
        .get::<tagma_core::health::HealthFailure>()
    {
        state.health.observe(
            &step.provider.id,
            &step.model,
            &step.fingerprint,
            tagma_core::health::HealthObservation::InferenceFailed(failure.clone()),
        );
    }
    response
}

async fn forward_response(
    state: &Arc<Runtime>,
    step: &PinnedStep,
    input: &Value,
    streaming: bool,
    total_deadline: tokio::time::Instant,
    public_model: Option<String>,
    health: HealthContext,
) -> Response {
    let mut request = state
        .client
        .post(format!(
            "{}/chat/completions",
            step.provider.base_url.trim_end_matches('/')
        ))
        .json(&input);
    if let Some(secret) = &step.credential {
        request = request.bearer_auth(secret.as_str());
    }
    let upstream = tokio::select! {
        _ = state.shutdown.cancelled() => return error(StatusCode::SERVICE_UNAVAILABLE,"GATEWAY_STOPPING"),
        _ = tokio::time::sleep_until(total_deadline) => return error(StatusCode::GATEWAY_TIMEOUT,"REQUEST_BUDGET_EXCEEDED"),
        response = tokio::time::timeout(Duration::from_secs(30),request.send()) => match response {
            Ok(Ok(response)) => response,
            Ok(Err(error_value)) => return error(StatusCode::BAD_GATEWAY,if error_value.is_timeout(){"UPSTREAM_CONNECT_TIMEOUT"}else if error_value.is_connect(){"UPSTREAM_CONNECTION_FAILED"}else{"UPSTREAM_TRANSPORT_ERROR"}),
            Err(_) => return error(StatusCode::GATEWAY_TIMEOUT,"UPSTREAM_RESPONSE_TIMEOUT"),
        }
    };
    if !upstream.status().is_success() {
        let (status, code) = match upstream.status().as_u16() {
            401 | 403 => (StatusCode::BAD_GATEWAY, "UPSTREAM_AUTH_FAILED"),
            429 => (StatusCode::TOO_MANY_REQUESTS, "UPSTREAM_RATE_LIMITED"),
            404 => (StatusCode::NOT_FOUND, "UPSTREAM_MODEL_UNAVAILABLE"),
            400 | 422 => (StatusCode::BAD_REQUEST, "UPSTREAM_REQUEST_REJECTED"),
            300..=399 => (StatusCode::BAD_GATEWAY, "UPSTREAM_REDIRECT_REJECTED"),
            _ => (StatusCode::BAD_GATEWAY, "UPSTREAM_ERROR"),
        };
        return error(status, code);
    }
    let content_type = upstream
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_owned();
    if streaming && !content_type.starts_with("text/event-stream") {
        return error(StatusCode::BAD_GATEWAY, "UPSTREAM_PROTOCOL_ERROR");
    }
    let mut upstream = upstream.bytes_stream();
    if streaming {
        let shutdown = state.shutdown.clone();
        let output = async_stream::stream! {
            let mut decoder = SseDecoder::default();
            let mut total = 0usize;
            let mut finished = false;
            let mut saw_text=false;
            let mut saw_refusal=false;
            let mut valid_role=true;
            'reading: loop {
                let next = tokio::select! {
                    _ = shutdown.cancelled() => { yield Ok::<_,Infallible>(stream_error(&health,"GATEWAY_STOPPING")); break; },
                    _ = tokio::time::sleep_until(total_deadline) => { yield Ok(stream_error(&health,"REQUEST_BUDGET_EXCEEDED")); break; },
                    next = tokio::time::timeout(Duration::from_secs(30),upstream.next()) => next,
                };
                let chunk = match next { Ok(Some(Ok(chunk))) => chunk, Ok(None) => { yield Ok(stream_error(&health,"UPSTREAM_STREAM_INTERRUPTED")); break; }, Ok(Some(Err(_))) => { yield Ok(stream_error(&health,"UPSTREAM_STREAM_INTERRUPTED")); break; }, Err(_) => { yield Ok(stream_error(&health,"UPSTREAM_IDLE_TIMEOUT")); break; } };
                total += chunk.len();
                if total > MAX_RESPONSE_BYTES { yield Ok(stream_error(&health,"RESPONSE_LIMIT_EXCEEDED")); break; }
                let events = match decoder.push(&chunk) { Ok(events) => events, Err(code) => { yield Ok(stream_error(&health,code)); break; } };
                for data in events {
                    if data == "[DONE]" {
                        if finished {
                            if saw_text&&!saw_refusal&&valid_role{health.observe(tagma_core::health::HealthObservation::InferenceSucceeded);}
                            else if !valid_role{health.observe(tagma_core::health::HealthObservation::InferenceFailed(tagma_core::health::HealthFailure::Protocol));}
                            yield Ok(Bytes::from_static(b"data: [DONE]\n\n"));
                        }
                        else { yield Ok(stream_error(&health,"UPSTREAM_STREAM_INTERRUPTED")); }
                        break 'reading;
                    }
                    let mut value: Value = match serde_json::from_str(&data) { Ok(value) => value, Err(_) => { yield Ok(stream_error(&health,"UPSTREAM_PROTOCOL_ERROR")); break 'reading; } };
                    if value.get("error").is_some() { yield Ok(stream_error(&health,"UPSTREAM_ERROR")); break 'reading; }
                    let Some(choices) = value["choices"].as_array() else { yield Ok(stream_error(&health,"UPSTREAM_PROTOCOL_ERROR")); break 'reading; };
                    if !valid_chunk(&value) { yield Ok(stream_error(&health,"UPSTREAM_PROTOCOL_ERROR")); break 'reading; }
                    finished |= choices.iter().any(|choice| choice["finish_reason"].is_string());
                    saw_text|=choices.iter().any(|choice|choice["delta"]["content"].as_str().is_some_and(|text|!text.trim().is_empty()));
                    saw_refusal|=choices.iter().any(|choice|choice["delta"].get("refusal").is_some_and(|value|!value.is_null()));
                    valid_role&=choices.iter().all(|choice|choice["delta"].get("role").is_none_or(|value|value.is_null()||value=="assistant"));
                    if let Some(model)=&public_model { value["model"]=json!(model);yield Ok(Bytes::from(format!("data: {value}\n\n"))); }
                    else { yield Ok(Bytes::from(format!("data: {data}\n\n"))); }
                }
            }
            // Dropping the response stream drops the upstream body and its request permit.
        };
        (
            [
                ("content-type", "text/event-stream"),
                ("cache-control", "no-store"),
            ],
            Body::from_stream(output),
        )
            .into_response()
    } else {
        let mut bytes = Vec::new();
        loop {
            let next = tokio::select! {
                _ = state.shutdown.cancelled() => return error(StatusCode::SERVICE_UNAVAILABLE,"GATEWAY_STOPPING"),
                _ = tokio::time::sleep_until(total_deadline) => return error(StatusCode::GATEWAY_TIMEOUT,"REQUEST_BUDGET_EXCEEDED"),
                next = tokio::time::timeout(Duration::from_secs(30),upstream.next()) => next,
            };
            match next {
                Ok(Some(Ok(chunk))) if bytes.len() + chunk.len() <= MAX_RESPONSE_BYTES => {
                    bytes.extend_from_slice(&chunk)
                }
                Ok(None) => break,
                Ok(Some(Ok(_))) => {
                    return error(StatusCode::BAD_GATEWAY, "RESPONSE_LIMIT_EXCEEDED");
                }
                Ok(Some(Err(_))) => {
                    return error(StatusCode::BAD_GATEWAY, "UPSTREAM_STREAM_INTERRUPTED");
                }
                Err(_) => return error(StatusCode::GATEWAY_TIMEOUT, "UPSTREAM_IDLE_TIMEOUT"),
            }
        }
        let mut value: Value = match serde_json::from_slice(&bytes) {
            Ok(value) => value,
            Err(_) => return error(StatusCode::BAD_GATEWAY, "UPSTREAM_PROTOCOL_ERROR"),
        };
        if !value["choices"].as_array().is_some_and(|choices| {
            choices.len() == 1
                && choices[0]["message"]["content"].is_string()
                && choices[0]["message"].get("tool_calls").is_none()
        }) {
            return error(StatusCode::BAD_GATEWAY, "UPSTREAM_PROTOCOL_ERROR");
        }
        let message = &value["choices"][0]["message"];
        if message["role"] != "assistant"
            || message.get("function_call").is_some()
            || !matches!(
                value["choices"][0]["finish_reason"].as_str(),
                Some("stop" | "length" | "content_filter")
            )
        {
            health.observe(tagma_core::health::HealthObservation::InferenceFailed(
                tagma_core::health::HealthFailure::Protocol,
            ));
        }
        if message["role"] == "assistant"
            && message["content"]
                .as_str()
                .is_some_and(|text| !text.trim().is_empty())
            && message.get("function_call").is_none()
            && message.get("refusal").is_none_or(|value| value.is_null())
            && matches!(
                value["choices"][0]["finish_reason"].as_str(),
                Some("stop" | "length" | "content_filter")
            )
        {
            health.observe(tagma_core::health::HealthObservation::InferenceSucceeded);
        }
        if let Some(model) = public_model {
            value["model"] = json!(model);
        }
        Json(value).into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn refuses_unimplemented_fields_before_dispatch() {
        assert!(validate(&json!({"model":"test","messages":[{"role":"user","content":"hello"}],"stream":true})).is_ok());
        assert_eq!(
            validate(
                &json!({"model":"test","messages":[{"role":"user","content":"hello"}],"tools":[]})
            )
            .unwrap_err(),
            "UNSUPPORTED_FIELD"
        );
        assert!(validate(&json!({"model":"test","messages":[{"role":"user","content":[{"type":"image_url"}]}]})).is_err());
    }
}
