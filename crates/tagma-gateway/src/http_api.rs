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
    (
        status,
        Json(json!({"error":{"code":code,"message":code,"type":"tagma_gateway_error"}})),
    )
        .into_response()
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
    let loaded = state.snapshot.read().await;
    let mut seen = HashSet::new();
    let data: Vec<_> = loaded
        .1
        .providers
        .iter()
        .filter(|record| record.provider.enabled)
        .flat_map(|record| &record.provider.models)
        .filter(|id| !id.starts_with("tagma/") && seen.insert((*id).clone()))
        .map(|id| json!({"id":id,"object":"model","created":0,"owned_by":"configured-provider"}))
        .collect();
    let mut response = Json(json!({"object":"list","data":data})).into_response();
    response
        .headers_mut()
        .insert("x-tagma-config-revision", HeaderValue::from(loaded.0));
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

fn stream_error(code: &str) -> Bytes {
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

async fn completion(
    State(state): State<Arc<Runtime>>,
    headers: HeaderMap,
    body: Result<Json<Value>, JsonRejection>,
) -> Response {
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
    // Pin target, credentials and revision together. A later config apply affects only new calls.
    let (revision, target, credential) = {
        let loaded = state.snapshot.read().await;
        if let Some(expected) = headers.get("x-tagma-expected-revision")
            && expected.to_str().ok().and_then(|v| v.parse::<u32>().ok()) != Some(loaded.0)
        {
            return error(StatusCode::CONFLICT, "CONFIG_NOT_APPLIED");
        }
        let Some(record) = loaded.1.providers.iter().find(|record| {
            record.provider.enabled
                && !model.starts_with("tagma/")
                && record.provider.models.iter().any(|id| id == model)
        }) else {
            return error(StatusCode::NOT_FOUND, "MODEL_NOT_FOUND");
        };
        (
            loaded.0,
            record.provider.clone(),
            loaded.3.get(&record.provider.id).cloned(),
        )
    };
    let request_id = uuid::Uuid::new_v4().to_string();
    let total_deadline = tokio::time::Instant::now() + Duration::from_secs(120);
    let mut request = state
        .client
        .post(format!(
            "{}/chat/completions",
            target.base_url.trim_end_matches('/')
        ))
        .json(&input);
    if let Some(secret) = &credential {
        request = request.bearer_auth(secret.as_str());
    }
    let upstream = tokio::select! {
        _ = state.shutdown.cancelled() => return error(StatusCode::SERVICE_UNAVAILABLE,"GATEWAY_STOPPING"),
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
    let mut response = if streaming {
        let shutdown = state.shutdown.clone();
        let output = async_stream::stream! {
            let mut decoder = SseDecoder::default();
            let mut total = 0usize;
            let mut finished = false;
            'reading: loop {
                let next = tokio::select! {
                    _ = shutdown.cancelled() => { yield Ok::<_,Infallible>(stream_error("GATEWAY_STOPPING")); break; },
                    _ = tokio::time::sleep_until(total_deadline) => { yield Ok(stream_error("REQUEST_BUDGET_EXCEEDED")); break; },
                    next = tokio::time::timeout(Duration::from_secs(30),upstream.next()) => next,
                };
                let chunk = match next { Ok(Some(Ok(chunk))) => chunk, Ok(None) => { yield Ok(stream_error("UPSTREAM_STREAM_INTERRUPTED")); break; }, Ok(Some(Err(_))) => { yield Ok(stream_error("UPSTREAM_STREAM_INTERRUPTED")); break; }, Err(_) => { yield Ok(stream_error("UPSTREAM_IDLE_TIMEOUT")); break; } };
                total += chunk.len();
                if total > MAX_RESPONSE_BYTES { yield Ok(stream_error("RESPONSE_LIMIT_EXCEEDED")); break; }
                let events = match decoder.push(&chunk) { Ok(events) => events, Err(code) => { yield Ok(stream_error(code)); break; } };
                for data in events {
                    if data == "[DONE]" {
                        if finished { yield Ok(Bytes::from_static(b"data: [DONE]\n\n")); }
                        else { yield Ok(stream_error("UPSTREAM_STREAM_INTERRUPTED")); }
                        break 'reading;
                    }
                    let value: Value = match serde_json::from_str(&data) { Ok(value) => value, Err(_) => { yield Ok(stream_error("UPSTREAM_PROTOCOL_ERROR")); break 'reading; } };
                    if value.get("error").is_some() { yield Ok(stream_error("UPSTREAM_ERROR")); break 'reading; }
                    let Some(choices) = value["choices"].as_array() else { yield Ok(stream_error("UPSTREAM_PROTOCOL_ERROR")); break 'reading; };
                    if !valid_chunk(&value) { yield Ok(stream_error("UPSTREAM_PROTOCOL_ERROR")); break 'reading; }
                    finished |= choices.iter().any(|choice| choice["finish_reason"].is_string());
                    yield Ok(Bytes::from(format!("data: {data}\n\n")));
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
        let value: Value = match serde_json::from_slice(&bytes) {
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
        Json(value).into_response()
    };
    response.headers_mut().insert(
        "x-tagma-request-id",
        HeaderValue::from_str(&request_id).expect("UUID header"),
    );
    response
        .headers_mut()
        .insert("x-tagma-config-revision", HeaderValue::from(revision));
    response
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
