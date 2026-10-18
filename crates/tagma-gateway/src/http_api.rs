use super::Runtime;
use axum::{
    Json, Router,
    body::{Body, Bytes},
    extract::{DefaultBodyLimit, FromRequest, Request, State},
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
    client: reqwest::Client,
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
struct ForwardContext {
    health: HealthContext,
    run: Arc<super::security::Run>,
    request: Arc<super::usage::TrackedRequest>,
    ordinal: u32,
    attempt: AttemptSlot,
}
#[derive(Clone, Default)]
struct AttemptSlot(Arc<std::sync::Mutex<Option<super::usage::Attempt>>>);
struct Invocation {
    run: Arc<super::security::Run>,
    request: Arc<super::usage::TrackedRequest>,
    ordinal: u32,
}
struct Execution {
    plan: PinnedPlan,
    run: Arc<super::security::Run>,
    request: Arc<super::usage::TrackedRequest>,
    deadline: tokio::time::Instant,
    streaming: bool,
}
#[derive(Clone)]
struct FailureCode(String);
#[derive(Clone)]
struct UsageStream;
pub(crate) const REQUEST_BODY_TIMEOUT: Duration = Duration::from_secs(10);
#[derive(Clone, Copy)]
pub(crate) struct BodyDeadline(pub tokio::time::Instant);
#[derive(Clone)]
pub(crate) struct StreamControl {
    deadline: tokio::time::Instant,
    cancelled: tokio_util::sync::CancellationToken,
    shutdown: tokio_util::sync::CancellationToken,
    health: HealthContext,
}
impl StreamControl {
    pub async fn stopped(&self) -> &'static str {
        tokio::select! {
            biased;
            _ = self.cancelled.cancelled() => "ACCESS_REVOKED",
            _ = self.shutdown.cancelled() => "GATEWAY_STOPPING",
            _ = tokio::time::sleep_until(self.deadline) => "REQUEST_BUDGET_EXCEEDED",
        }
    }
    pub fn error(&self, code: &str) -> Bytes {
        stream_error(&self.health, code)
    }
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
    revoked: &std::collections::HashMap<String, bool>,
) -> Result<PinnedPlan, PlanError> {
    let pin = |record: &tagma_core::service::ProviderRecord,
               model: String,
               input,
               timeout: Duration|
     -> Result<PinnedStep, PlanError> {
        Ok(PinnedStep {
            client: loaded.4.get(&record.provider.id).cloned().ok_or(PlanError(
                StatusCode::SERVICE_UNAVAILABLE,
                "CONFIG_NOT_APPLIED",
            ))?,
            provider: record.provider.clone(),
            credential: loaded.3.get(&record.provider.id).cloned(),
            fingerprint: tagma_core::health::provider_fingerprint(record),
            model,
            input,
            timeout: timeout.min(Duration::from_millis(
                record.provider.timeouts.total_ms.into(),
            )),
        })
    };
    if !model.starts_with("tagma/") {
        let record =
            loaded
                .1
                .providers
                .iter()
                .find(|r| {
                    r.provider.enabled
                        && r.provider.models.iter().any(|id| id == model)
                        && !revoked.contains_key(&tagma_core::security::provider_target(
                            &tagma_core::health::provider_fingerprint(r),
                        ))
                })
                .ok_or_else(|| {
                    if loaded.1.providers.iter().any(|r| {
                        r.provider.enabled && r.provider.models.iter().any(|id| id == model)
                    }) {
                        PlanError(StatusCode::FORBIDDEN, "ACCESS_REVOKED")
                    } else {
                        PlanError(StatusCode::NOT_FOUND, "MODEL_NOT_FOUND")
                    }
                })?;
        return Ok(PinnedPlan {
            revision: loaded.0,
            steps: vec![pin(
                record,
                model.into(),
                TeamStepInput::OriginalMessages,
                Duration::from_secs(120),
            )?],
            timeout: Duration::from_millis(record.provider.timeouts.total_ms.into()),
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
        if revoked.contains_key(&tagma_core::security::provider_target(
            &tagma_core::health::provider_fingerprint(provider),
        )) {
            return Err(PlanError(StatusCode::FORBIDDEN, "ACCESS_REVOKED"));
        }
        steps.push(pin(
            provider,
            target.model_id.clone(),
            step.input.clone(),
            Duration::from_millis(step.timeout_ms.into()),
        )?);
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

pub fn client(connect_timeout: Duration) -> Result<reqwest::Client, reqwest::Error> {
    reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .retry(reqwest::retry::never())
        .connect_timeout(connect_timeout)
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
    response.extensions_mut().insert(FailureCode(code.into()));
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
    let policy = match state
        .security
        .read(
            loaded
                .1
                .providers
                .iter()
                .map(|p| {
                    tagma_core::security::provider_target(
                        &tagma_core::health::provider_fingerprint(p),
                    )
                })
                .collect(),
        )
        .await
    {
        Ok(policy) => policy,
        Err(_) => {
            return error(
                StatusCode::SERVICE_UNAVAILABLE,
                "SECURITY_STATE_UNCONFIRMED",
            );
        }
    };
    let first_cloud = health.as_ref().and_then(|(_, records)| {
        tagma_core::health::select_first_cloud(
            &loaded.1,
            records,
            tagma_core::health::now_ms().unwrap_or(0),
        )
    });
    let mut seen = HashSet::new();
    let mut data = Vec::new();
    for record in loaded.1.providers.iter().filter(|record| {
        record.provider.enabled
            && !policy
                .revoked
                .contains_key(&tagma_core::security::provider_target(
                    &tagma_core::health::provider_fingerprint(record),
                ))
    }) {
        for id in &record.provider.models {
            if !id.starts_with("tagma/")
                && seen.insert(id.clone())
                && !policy
                    .revoked
                    .contains_key(&tagma_core::security::provider_target(
                        &tagma_core::health::provider_fingerprint(record),
                    ))
            {
                data.push(
                    json!({"id":id,"object":"model","created":0,"owned_by":"configured-provider"}),
                );
            }
        }
    }
    for team in &loaded.1.teams {
        for version in &team.versions {
            if pin_plan(
                &loaded,
                &version.public_id,
                first_cloud.as_ref(),
                &policy.revoked,
            )
            .is_ok_and(|plan| {
                plan.steps.iter().all(|step| {
                    !policy
                        .revoked
                        .contains_key(&tagma_core::security::provider_target(&step.fingerprint))
                }) && (!plan.automatic_brain
                    || health.as_ref().is_some_and(|(epoch, _)| {
                        *epoch == state.health.epoch() && state.health.confirmed()
                    }))
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
        "tools",
        "tool_choice",
        "parallel_tool_calls",
    ];
    if object.keys().any(|key| !FIELDS.contains(&key.as_str())) {
        return Err("UNSUPPORTED_FIELD");
    }
    let model = input["model"]
        .as_str()
        .filter(|s| !s.is_empty() && s.len() <= 256)
        .ok_or("INVALID_REQUEST")?;
    input["messages"]
        .as_array()
        .filter(|m| !m.is_empty() && m.len() <= 128)
        .ok_or("INVALID_REQUEST")?;
    super::function_tools::validate(input)?;
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
    grant: Option<axum::extract::Extension<super::security::Grant>>,
    request: Request,
) -> Response {
    let Some(axum::extract::Extension(grant)) = grant else {
        return error(
            StatusCode::SERVICE_UNAVAILABLE,
            "SECURITY_STATE_UNCONFIRMED",
        );
    };
    let Some(BodyDeadline(deadline)) = request.extensions().get::<BodyDeadline>().copied() else {
        return unread_body_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "SECURITY_STATE_UNCONFIRMED",
        );
    };
    // Bound only request extraction, from the instant its slot was admitted.
    // Drip bytes do not reset this deadline; provider/response budgets start
    // afterwards and retain their own configuration and streaming lifetime.
    let body = tokio::select! {
        biased;
        // An incomplete request has not been dispatched upstream. Do not let a
        // drip-fed body consume the grace period reserved for active inference.
        _ = state.stop_accepting.cancelled() => return unread_body_error(StatusCode::SERVICE_UNAVAILABLE, "GATEWAY_STOPPING"),
        _ = state.shutdown.cancelled() => return unread_body_error(StatusCode::SERVICE_UNAVAILABLE, "GATEWAY_STOPPING"),
        _ = tokio::time::sleep_until(deadline) => return unread_body_error(StatusCode::REQUEST_TIMEOUT, "REQUEST_BODY_TIMEOUT"),
        body = Json::<Value>::from_request(request, &state) => body,
    };
    let Json(input) = match body {
        Ok(input) => input,
        Err(rejection) => {
            return unread_body_error(
                rejection.status(),
                if rejection.status() == StatusCode::PAYLOAD_TOO_LARGE {
                    "REQUEST_TOO_LARGE"
                } else {
                    "INVALID_REQUEST"
                },
            );
        }
    };
    let request_started = tokio::time::Instant::now();
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
        let policy = match state
            .security
            .read(
                loaded
                    .1
                    .providers
                    .iter()
                    .map(|record| {
                        tagma_core::security::provider_target(
                            &tagma_core::health::provider_fingerprint(record),
                        )
                    })
                    .collect(),
            )
            .await
        {
            Ok(policy) => policy,
            Err(_) => {
                return error(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "SECURITY_STATE_UNCONFIRMED",
                );
            }
        };
        match pin_plan(&loaded, model, first_cloud.as_ref(), &policy.revoked) {
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
    if plan.public_model.is_some() && super::function_tools::uses_tools(&input) {
        return error(StatusCode::BAD_REQUEST, "UNSUPPORTED_TEAM_TOOLS");
    }
    let request_id = uuid::Uuid::new_v4().to_string();
    let run = match state.security.register(
        grant.target,
        plan.steps
            .iter()
            .map(|step| tagma_core::security::provider_target(&step.fingerprint))
            .collect(),
        None,
    ) {
        Ok(run) => run,
        Err(_) => {
            return error(
                StatusCode::SERVICE_UNAVAILABLE,
                "SECURITY_STATE_UNCONFIRMED",
            );
        }
    };
    if let Err(failure) = run.check_all().await {
        return error(
            if failure.code == tagma_core::ErrorCode::AccessRevoked {
                StatusCode::FORBIDDEN
            } else {
                StatusCode::SERVICE_UNAVAILABLE
            },
            if failure.code == tagma_core::ErrorCode::AccessRevoked {
                "ACCESS_REVOKED"
            } else {
                "SECURITY_STATE_UNCONFIRMED"
            },
        );
    }
    let deadline = request_started + plan.timeout;
    let Some(final_provider) = plan.steps.last().map(|step| step.provider.id.clone()) else {
        return error(
            StatusCode::SERVICE_UNAVAILABLE,
            "TEAM_DEPENDENCY_UNAVAILABLE",
        );
    };
    let config_revision = plan.revision;
    let team_revision = plan.team_revision;
    let start = tagma_core::usage::RequestStart {
        id: request_id.clone(),
        provider_id: final_provider,
        model: model.into(),
        config_revision: plan.revision,
        team_revision: plan.team_revision,
        started_ms: match tagma_core::health::now_ms() {
            Ok(now) => now,
            Err(_) => return error(StatusCode::SERVICE_UNAVAILABLE, super::usage::FAILURE),
        },
    };
    let request = match tokio::time::timeout_at(deadline, state.usage.begin(start, deadline)).await
    {
        Ok(Ok(request)) => request,
        _ => {
            return request_metadata(
                error(StatusCode::SERVICE_UNAVAILABLE, super::usage::FAILURE),
                &request_id,
                config_revision,
                team_revision,
            );
        }
    };
    let mut response = execute_plan(
        &state,
        &input,
        Execution {
            plan,
            run,
            request: request.clone(),
            deadline,
            streaming,
        },
    )
    .await;
    if response.extensions().get::<UsageStream>().is_none() {
        let code = response
            .extensions()
            .get::<FailureCode>()
            .map(|code| code.0.as_str());
        if request.finish(code).await.is_err() {
            response = unconfirmed_response(response);
        }
    }
    request_metadata(response, &request_id, config_revision, team_revision)
}
fn unread_body_error(status: StatusCode, code: &str) -> Response {
    let mut response = error(status, code);
    // Do not let HTTP/1.1 drain or reuse an incomplete/oversized request body.
    response.headers_mut().insert(
        axum::http::header::CONNECTION,
        HeaderValue::from_static("close"),
    );
    response
}
fn request_metadata(
    mut response: Response,
    id: &str,
    revision: u32,
    team: Option<u32>,
) -> Response {
    response.headers_mut().insert(
        "x-tagma-request-id",
        HeaderValue::from_str(id).expect("UUID"),
    );
    response
        .headers_mut()
        .insert("x-tagma-config-revision", HeaderValue::from(revision));
    if let Some(team) = team {
        response
            .headers_mut()
            .insert("x-tagma-team-revision", HeaderValue::from(team));
    }
    response
}

async fn execute_plan(state: &Arc<Runtime>, input: &Value, execution: Execution) -> Response {
    let Execution {
        plan,
        run,
        request,
        deadline: total_deadline,
        streaming,
    } = execution;
    let request_id = request.id.clone();
    let count = plan.steps.len();
    let mut previous = None;
    for (index, step) in plan.steps.into_iter().enumerate() {
        if let Err(failure) = run
            .check(&tagma_core::security::provider_target(&step.fingerprint))
            .await
        {
            return error(
                if failure.code == tagma_core::ErrorCode::AccessRevoked {
                    StatusCode::FORBIDDEN
                } else {
                    StatusCode::SERVICE_UNAVAILABLE
                },
                if failure.code == tagma_core::ErrorCode::AccessRevoked {
                    "ACCESS_REVOKED"
                } else {
                    "SECURITY_STATE_UNCONFIRMED"
                },
            );
        }
        if state.shutdown.is_cancelled() {
            return error(StatusCode::SERVICE_UNAVAILABLE, "GATEWAY_STOPPING");
        }
        if tokio::time::Instant::now() >= total_deadline {
            return error(StatusCode::GATEWAY_TIMEOUT, "REQUEST_BUDGET_EXCEEDED");
        }
        let final_step = index + 1 == count;
        let mut payload = (*input).clone();
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
            state,
            Invocation {
                run: run.clone(),
                request: request.clone(),
                ordinal: index as u32 + 1,
            },
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
            let (parts, body) = response.into_parts();
            let stream = async_stream::stream! {let _run=run;let mut body=body.into_data_stream();while let Some(chunk)=body.next().await {yield chunk;}};
            return Response::from_parts(parts, Body::from_stream(stream));
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
    invocation: Invocation,
    step: &PinnedStep,
    input: &Value,
    streaming: bool,
    total_deadline: tokio::time::Instant,
    public_model: Option<String>,
) -> Response {
    let attempt = AttemptSlot::default();
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
        ForwardContext {
            health,
            run: invocation.run,
            request: invocation.request,
            ordinal: invocation.ordinal,
            attempt: attempt.clone(),
        },
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
    let tracked = attempt.0.lock().unwrap_or_else(|p| p.into_inner()).take();
    match tracked {
        Some(attempt) => account_response(response, attempt, streaming).await,
        None => response,
    }
}

async fn account_response(
    response: Response,
    mut attempt: super::usage::Attempt,
    streaming: bool,
) -> Response {
    if !streaming || !response.status().is_success() {
        let code = response
            .extensions()
            .get::<FailureCode>()
            .map(|code| code.0.as_str());
        let tokens = response
            .extensions()
            .get::<tagma_core::usage::Tokens>()
            .copied()
            .unwrap_or_default();
        if attempt.finish(code, tokens).await.is_err() {
            return unconfirmed_response(response);
        }
        return response;
    }
    let (mut parts, body) = response.into_parts();
    parts.extensions.insert(UsageStream);
    let control = parts
        .extensions
        .remove::<StreamControl>()
        .expect("successful streaming forward supplies its pinned controls");
    Response::from_parts(parts, super::stream_driver::drive(body, attempt, control))
}
fn usage_stream_error(code: &str) -> Bytes {
    Bytes::from(format!(
        "data: {}\n\n",
        json!({"error":{"code":code,"message":code}})
    ))
}
pub(crate) fn usage_stream_error_state(code: &str, unconfirmed: bool) -> Bytes {
    if !unconfirmed {
        return usage_stream_error(code);
    }
    Bytes::from(format!(
        "data: {}\n\n",
        json!({"error":{"code":code,"message":code},"usage_state":"unconfirmed"})
    ))
}
fn unconfirmed_response(mut response: Response) -> Response {
    if response.status().is_success() {
        response = error(StatusCode::SERVICE_UNAVAILABLE, super::usage::FAILURE);
    }
    response.headers_mut().insert(
        "x-tagma-usage-state",
        HeaderValue::from_static("unconfirmed"),
    );
    response
}

async fn forward_response(
    state: &Arc<Runtime>,
    step: &PinnedStep,
    input: &Value,
    streaming: bool,
    total_deadline: tokio::time::Instant,
    public_model: Option<String>,
    context: ForwardContext,
) -> Response {
    let ForwardContext {
        health,
        run,
        request: tracked,
        ordinal,
        attempt,
    } = context;
    if run.cancel.is_cancelled() {
        return error(StatusCode::FORBIDDEN, "ACCESS_REVOKED");
    }
    if tokio::time::Instant::now() >= total_deadline {
        return error(StatusCode::GATEWAY_TIMEOUT, "REQUEST_BUDGET_EXCEEDED");
    }
    #[cfg(test)]
    run.before_dispatch(&step.model, false).await;
    let mut request = step
        .client
        .post(format!(
            "{}/chat/completions",
            step.provider.base_url.trim_end_matches('/')
        ))
        .json(&input);
    if let Some(secret) = &step.credential {
        request = request.bearer_auth(secret.as_str());
    }
    let dispatch = match tokio::time::timeout_at(
        total_deadline,
        run.admit_dispatch(&tagma_core::security::provider_target(&step.fingerprint)),
    )
    .await
    {
        Ok(Ok(guard)) => guard,
        Ok(Err(failure)) => {
            return error(
                if failure.code == tagma_core::ErrorCode::AccessRevoked {
                    StatusCode::FORBIDDEN
                } else {
                    StatusCode::SERVICE_UNAVAILABLE
                },
                if failure.code == tagma_core::ErrorCode::AccessRevoked {
                    "ACCESS_REVOKED"
                } else {
                    "SECURITY_STATE_UNCONFIRMED"
                },
            );
        }
        Err(_) => return error(StatusCode::GATEWAY_TIMEOUT, "REQUEST_BUDGET_EXCEEDED"),
    };
    #[cfg(test)]
    run.before_dispatch(&step.model, true).await;
    if run.cancel.is_cancelled() {
        return error(StatusCode::FORBIDDEN, "ACCESS_REVOKED");
    }
    if state.shutdown.is_cancelled() {
        return error(StatusCode::SERVICE_UNAVAILABLE, "GATEWAY_STOPPING");
    }
    if tokio::time::Instant::now() >= total_deadline {
        return error(StatusCode::GATEWAY_TIMEOUT, "REQUEST_BUDGET_EXCEEDED");
    }
    let tracked_attempt = match tokio::time::timeout_at(
        total_deadline,
        tracked.attempt(ordinal, &step.provider.id, &step.model),
    )
    .await
    {
        Ok(Ok(attempt)) => attempt,
        Ok(Err(_)) => return error(StatusCode::SERVICE_UNAVAILABLE, super::usage::FAILURE),
        Err(_) => return error(StatusCode::GATEWAY_TIMEOUT, "REQUEST_BUDGET_EXCEEDED"),
    };
    *attempt.0.lock().unwrap_or_else(|p| p.into_inner()) = Some(tracked_attempt);
    if run.cancel.is_cancelled() {
        return error(StatusCode::FORBIDDEN, "ACCESS_REVOKED");
    }
    if state.shutdown.is_cancelled() {
        return error(StatusCode::SERVICE_UNAVAILABLE, "GATEWAY_STOPPING");
    }
    if tokio::time::Instant::now() >= total_deadline {
        return error(StatusCode::GATEWAY_TIMEOUT, "REQUEST_BUDGET_EXCEEDED");
    }
    // Initiate the HTTP send under the same barrier. Holding the guard only
    // through another check would leave the original check-to-send race intact.
    let mut sending = Box::pin(request.send());
    let initial = futures_util::poll!(sending.as_mut());
    drop(dispatch);
    let sending = async move {
        match initial {
            std::task::Poll::Ready(result) => result,
            std::task::Poll::Pending => sending.await,
        }
    };
    let upstream = tokio::select! {
        biased;
        _ = run.cancel.cancelled()=>return error(StatusCode::FORBIDDEN,"ACCESS_REVOKED"),
        _ = state.shutdown.cancelled() => return error(StatusCode::SERVICE_UNAVAILABLE,"GATEWAY_STOPPING"),
        _ = tokio::time::sleep_until(total_deadline) => return error(StatusCode::GATEWAY_TIMEOUT,"REQUEST_BUDGET_EXCEEDED"),
        response = tokio::time::timeout(Duration::from_millis(step.provider.timeouts.first_response_ms.into()),sending) => match response {
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
    let available_functions = super::function_tools::names(input);
    let idle_timeout = Duration::from_millis(step.provider.timeouts.idle_ms.into());
    let parallel_tools = input["parallel_tool_calls"] != false;
    if streaming {
        let shutdown = state.shutdown.clone();
        let cancelled = run.cancel.clone();
        let control = StreamControl {
            deadline: total_deadline,
            cancelled: cancelled.clone(),
            shutdown: shutdown.clone(),
            health: health.clone(),
        };
        let output = async_stream::stream! {
            let mut function_stream=if available_functions.is_empty(){None}else{Some(super::function_tools::StreamTools::new(available_functions,parallel_tools))};
            let mut decoder = SseDecoder::default();
            let mut total = 0usize;
            let mut finished = false;
            let mut saw_text=false;
            let mut saw_refusal=false;
            let mut saw_tools=false;
            let mut valid_role=true;
            'reading: loop {
                let next = tokio::select! {
                    biased;
                    _ = cancelled.cancelled()=>{yield Ok::<_,Infallible>(stream_error(&health,"ACCESS_REVOKED"));break;},
                    _ = shutdown.cancelled() => { yield Ok::<_,Infallible>(stream_error(&health,"GATEWAY_STOPPING")); break; },
                    _ = tokio::time::sleep_until(total_deadline) => { yield Ok(stream_error(&health,"REQUEST_BUDGET_EXCEEDED")); break; },
                    next = tokio::time::timeout(idle_timeout,upstream.next()) => next,
                };
                let chunk = match next { Ok(Some(Ok(chunk))) => chunk, Ok(None) => { yield Ok(stream_error(&health,"UPSTREAM_STREAM_INTERRUPTED")); break; }, Ok(Some(Err(_))) => { yield Ok(stream_error(&health,"UPSTREAM_STREAM_INTERRUPTED")); break; }, Err(_) => { yield Ok(stream_error(&health,"UPSTREAM_IDLE_TIMEOUT")); break; } };
                total += chunk.len();
                if total > MAX_RESPONSE_BYTES { yield Ok(stream_error(&health,"RESPONSE_LIMIT_EXCEEDED")); break; }
                let events = match decoder.push(&chunk) { Ok(events) => events, Err(code) => { yield Ok(stream_error(&health,code)); break; } };
                for data in events {
                    if data == "[DONE]" {
                        if finished {
                            if saw_text&&!saw_refusal&&!saw_tools&&valid_role{health.observe(tagma_core::health::HealthObservation::InferenceSucceeded);}
                            else if !valid_role{health.observe(tagma_core::health::HealthObservation::InferenceFailed(tagma_core::health::HealthFailure::Protocol));}
                            yield Ok(Bytes::from_static(b"data: [DONE]\n\n"));
                        }
                        else { yield Ok(stream_error(&health,"UPSTREAM_STREAM_INTERRUPTED")); }
                        break 'reading;
                    }
                    let mut value: Value = match serde_json::from_str(&data) { Ok(value) => value, Err(_) => { yield Ok(stream_error(&health,"UPSTREAM_PROTOCOL_ERROR")); break 'reading; } };
                    if value.get("error").is_some() { yield Ok(stream_error(&health,"UPSTREAM_ERROR")); break 'reading; }
                    let Some(choices) = value["choices"].as_array() else { yield Ok(stream_error(&health,"UPSTREAM_PROTOCOL_ERROR")); break 'reading; };
                    let valid=if let Some(stream)=&mut function_stream{stream.accept(&value)}else{valid_chunk(&value)};
                    if !valid { yield Ok(stream_error(&health,"UPSTREAM_PROTOCOL_ERROR")); break 'reading; }
                    finished |= choices.iter().any(|choice| choice["finish_reason"].is_string());
                    saw_text|=choices.iter().any(|choice|choice["delta"]["content"].as_str().is_some_and(|text|!text.trim().is_empty()));
                    saw_tools|=choices.iter().any(|choice|choice["delta"].get("tool_calls").is_some());
                    saw_refusal|=choices.iter().any(|choice|choice["delta"].get("refusal").is_some_and(|value|!value.is_null()));
                    valid_role&=choices.iter().all(|choice|choice["delta"].get("role").is_none_or(|value|value.is_null()||value=="assistant"));
                    if let Some(model)=&public_model { value["model"]=json!(model);yield Ok(Bytes::from(format!("data: {value}\n\n"))); }
                    else { yield Ok(Bytes::from(format!("data: {data}\n\n"))); }
                }
            }
            // Dropping the response stream drops the upstream body and its request permit.
        };
        let mut response = (
            [
                ("content-type", "text/event-stream"),
                ("cache-control", "no-store"),
            ],
            Body::from_stream(output),
        )
            .into_response();
        response.extensions_mut().insert(control);
        response
    } else {
        let mut bytes = Vec::new();
        loop {
            let next = tokio::select! {
                biased;
                _ = run.cancel.cancelled()=>return error(StatusCode::FORBIDDEN,"ACCESS_REVOKED"),
                _ = state.shutdown.cancelled() => return error(StatusCode::SERVICE_UNAVAILABLE,"GATEWAY_STOPPING"),
                _ = tokio::time::sleep_until(total_deadline) => return error(StatusCode::GATEWAY_TIMEOUT,"REQUEST_BUDGET_EXCEEDED"),
                next = tokio::time::timeout(idle_timeout,upstream.next()) => next,
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
        let tool_answer = value["choices"][0]["message"].get("tool_calls").is_some();
        if if tool_answer {
            !super::function_tools::response(&value, &available_functions, parallel_tools)
        } else {
            !value["choices"].as_array().is_some_and(|choices| {
                choices.len() == 1
                    && choices[0]["message"]["content"].is_string()
                    && choices[0]["message"].get("tool_calls").is_none()
            })
        } {
            return error(StatusCode::BAD_GATEWAY, "UPSTREAM_PROTOCOL_ERROR");
        }
        let message = &value["choices"][0]["message"];
        if message["role"] != "assistant"
            || message.get("function_call").is_some()
            || !(matches!(
                value["choices"][0]["finish_reason"].as_str(),
                Some("stop" | "length" | "content_filter")
            ) || (tool_answer && value["choices"][0]["finish_reason"] == "tool_calls"))
        {
            health.observe(tagma_core::health::HealthObservation::InferenceFailed(
                tagma_core::health::HealthFailure::Protocol,
            ));
        }
        if !tool_answer
            && message["role"] == "assistant"
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
        let tokens = super::usage::tokens(&value);
        let mut response = Json(value).into_response();
        response.extensions_mut().insert(tokens);
        response
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
                &json!({"model":"test","messages":[{"role":"user","content":"hello"}],"response_format":{"type":"json_object"}})
            )
            .unwrap_err(),
            "UNSUPPORTED_FIELD"
        );
        assert!(validate(&json!({"model":"test","messages":[{"role":"user","content":[{"type":"image_url"}]}]})).is_err());
    }
}
