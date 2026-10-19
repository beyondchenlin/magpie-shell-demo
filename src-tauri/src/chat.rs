use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::Duration,
};
use tagma_core::{
    AppError, AppResult, ErrorCode,
    chat::{ChatEvent, MAX_RESPONSE_BYTES, SseDecoder, StartChat},
};
use tauri::ipc::Channel;
use tokio_util::sync::CancellationToken;
use zeroize::Zeroizing;

pub struct ChatBridge {
    requests: Arc<Mutex<HashMap<String, CancellationToken>>>,
    client: reqwest::Client,
}
struct Registration {
    id: String,
    requests: Arc<Mutex<HashMap<String, CancellationToken>>>,
}
impl Drop for Registration {
    fn drop(&mut self) {
        if let Ok(mut requests) = self.requests.lock() {
            requests.remove(&self.id);
        }
    }
}
impl ChatBridge {
    pub fn new() -> Result<Self, reqwest::Error> {
        Ok(Self {
            requests: Default::default(),
            client: reqwest::Client::builder()
                .no_proxy()
                .redirect(reqwest::redirect::Policy::none())
                .retry(reqwest::retry::never())
                .connect_timeout(Duration::from_secs(3))
                .timeout(Duration::from_secs(135))
                .build()?,
        })
    }
    pub fn cancel(&self, id: &str) -> AppResult<()> {
        let requests = self
            .requests
            .lock()
            .map_err(|_| AppError::new(ErrorCode::InternalError))?;
        if let Some(token) = requests.get(id) {
            token.cancel();
        }
        Ok(())
    }
    pub async fn start(
        &self,
        input: StartChat,
        address: String,
        access_token: Option<Zeroizing<String>>,
        channel: Channel<ChatEvent>,
    ) -> AppResult<()> {
        if uuid::Uuid::parse_str(&input.request_id).is_err()
            || input.messages.is_empty()
            || input.messages.len() > 128
            || input.model.is_empty()
            || input.model.len() > 256
            || input
                .messages
                .iter()
                .map(|m| m.content.len())
                .sum::<usize>()
                > 100 * 1024
            || input.messages.iter().any(|m| {
                !matches!(
                    m.role.as_str(),
                    "user" | "assistant" | "system" | "developer"
                )
            })
        {
            return Err(AppError::new(ErrorCode::InvalidInput));
        }
        let token = CancellationToken::new();
        {
            let mut requests = self
                .requests
                .lock()
                .map_err(|_| AppError::new(ErrorCode::InternalError))?;
            if !requests.is_empty() {
                return Err(AppError::new(ErrorCode::InvalidInput));
            }
            requests.insert(input.request_id.clone(), token.clone());
        }
        let _registration = Registration {
            id: input.request_id.clone(),
            requests: self.requests.clone(),
        };
        if channel.send(ChatEvent::Started).is_err() {
            return Ok(());
        }
        tokio::select! {
            _ = token.cancelled() => { let _=channel.send(ChatEvent::Cancelled); },
            result = self.stream(&input,&address,access_token,&channel) => if let Err(code)=result { let _=channel.send(ChatEvent::Failed{code:code.into()}); },
        }
        Ok(())
    }
    async fn stream(
        &self,
        input: &StartChat,
        address: &str,
        access_token: Option<Zeroizing<String>>,
        channel: &Channel<ChatEvent>,
    ) -> Result<(), &'static str> {
        let url = reqwest::Url::parse(address).map_err(|_| "GATEWAY_UNAVAILABLE")?;
        if url.scheme() != "http"
            || url.host_str() != Some("127.0.0.1")
            || url.path() != "/v1"
            || url.port().is_none()
        {
            return Err("GATEWAY_UNAVAILABLE");
        }
        let mut request = self
            .client
            .post(format!("{address}/chat/completions"))
            .header("x-tagma-expected-revision", input.expected_revision)
            .json(
                &serde_json::json!({"model":input.model,"messages":input.messages,"stream":true}),
            );
        if let Some(secret) = access_token {
            request = request.bearer_auth(secret.as_str());
        }
        let mut response = request.send().await.map_err(|_| "GATEWAY_UNAVAILABLE")?;
        if !response.status().is_success() {
            let status = response.status().as_u16();
            let mut bytes = Vec::new();
            while let Some(chunk) = response.chunk().await.map_err(|_| "GATEWAY_UNAVAILABLE")? {
                if bytes.len() + chunk.len() > 4096 {
                    return Err("GATEWAY_REQUEST_FAILED");
                }
                bytes.extend_from_slice(&chunk);
            }
            let value: serde_json::Value = serde_json::from_slice(&bytes).unwrap_or_default();
            let code = value["error"]["code"].as_str().unwrap_or("");
            return Err(match code {
                "PACK_SAMPLE_COMMAND_REQUIRED" => "PACK_SAMPLE_COMMAND_REQUIRED",
                "PACK_UNAVAILABLE" => "PACK_UNAVAILABLE",
                "PACK_APPROVAL_CHANGED" => "PACK_APPROVAL_CHANGED",
                "PACK_UNSUPPORTED_PLATFORM" => "PACK_UNSUPPORTED_PLATFORM",
                "PACK_BUSY" => "PACK_BUSY",
                "PACK_CANCELLED" => "PACK_CANCELLED",
                "PACK_TIMED_OUT" => "PACK_TIMED_OUT",
                "PACK_START_FAILED" => "PACK_START_FAILED",
                "PACK_PROCESS_FAILED" => "PACK_PROCESS_FAILED",
                "PACK_PROTOCOL_ERROR" => "PACK_PROTOCOL_ERROR",
                "PACK_OUTPUT_LIMIT" => "PACK_OUTPUT_LIMIT",
                "PACK_INVALID_INPUT" => "PACK_INVALID_INPUT",
                "CONFIG_CONFLICT" => "CONFIG_CONFLICT",
                "REACHFLOW_AUTH_REQUIRED" => "REACHFLOW_AUTH_REQUIRED",
                "REACHFLOW_CONFIRMATION_REQUIRED" => "REACHFLOW_CONFIRMATION_REQUIRED",
                "REACHFLOW_RESULT_UNCONFIRMED" => "REACHFLOW_RESULT_UNCONFIRMED",
                "REACHFLOW_REPORT_UNAVAILABLE" => "REACHFLOW_REPORT_UNAVAILABLE",
                "PACK_NETWORK_NOT_ALLOWED" => "PACK_NETWORK_NOT_ALLOWED",
                "MODEL_NOT_FOUND" => "MODEL_NOT_FOUND",
                "CONFIG_NOT_APPLIED" => "CONFIG_NOT_APPLIED",
                "GATEWAY_BUSY" => "GATEWAY_BUSY",
                "UPSTREAM_AUTH_FAILED" => "UPSTREAM_AUTH_FAILED",
                "UPSTREAM_RATE_LIMITED" => "UPSTREAM_RATE_LIMITED",
                "UPSTREAM_MODEL_UNAVAILABLE" => "UPSTREAM_MODEL_UNAVAILABLE",
                "UPSTREAM_REQUEST_REJECTED" => "UPSTREAM_REQUEST_REJECTED",
                "UPSTREAM_CONNECT_TIMEOUT" => "UPSTREAM_CONNECT_TIMEOUT",
                "UPSTREAM_RESPONSE_TIMEOUT" => "UPSTREAM_RESPONSE_TIMEOUT",
                "UPSTREAM_CONNECTION_FAILED" => "UPSTREAM_CONNECTION_FAILED",
                "UPSTREAM_PROTOCOL_ERROR" => "UPSTREAM_PROTOCOL_ERROR",
                _ if status == 401 => "LOCAL_AUTH_FAILED",
                _ => "GATEWAY_REQUEST_FAILED",
            });
        }
        if !response
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .is_some_and(|v| v.starts_with("text/event-stream"))
        {
            return Err("UPSTREAM_PROTOCOL_ERROR");
        }
        let mut decoder = SseDecoder::default();
        let mut total = 0usize;
        let mut characters = 0usize;
        let mut finish_reason = String::from("stop");
        while let Some(chunk) = response
            .chunk()
            .await
            .map_err(|_| "UPSTREAM_STREAM_INTERRUPTED")?
        {
            total += chunk.len();
            if total > MAX_RESPONSE_BYTES {
                return Err("RESPONSE_LIMIT_EXCEEDED");
            }
            for data in decoder.push(&chunk)? {
                if data == "[DONE]" {
                    let _ = channel.send(ChatEvent::Finished {
                        reason: finish_reason,
                    });
                    return Ok(());
                }
                let value: serde_json::Value =
                    serde_json::from_str(&data).map_err(|_| "UPSTREAM_PROTOCOL_ERROR")?;
                if value.get("error").is_some() {
                    return Err(match value["error"]["code"].as_str() {
                        Some("UPSTREAM_IDLE_TIMEOUT") => "UPSTREAM_IDLE_TIMEOUT",
                        Some("REQUEST_BUDGET_EXCEEDED") => "REQUEST_BUDGET_EXCEEDED",
                        Some("RESPONSE_LIMIT_EXCEEDED") => "RESPONSE_LIMIT_EXCEEDED",
                        Some("GATEWAY_STOPPING") => "GATEWAY_STOPPING",
                        _ => "UPSTREAM_STREAM_INTERRUPTED",
                    });
                }
                if let Some(choices) = value["choices"].as_array() {
                    for choice in choices {
                        if let Some(reason) = choice["finish_reason"].as_str() {
                            finish_reason = reason.to_owned();
                        }
                        for key in ["content", "refusal"] {
                            if let Some(text) = choice["delta"][key].as_str() {
                                characters += text.len();
                                if characters > 256 * 1024 {
                                    return Err("RESPONSE_LIMIT_EXCEEDED");
                                }
                                channel
                                    .send(ChatEvent::Delta { text: text.into() })
                                    .map_err(|_| "CLIENT_DISCONNECTED")?;
                            }
                        }
                    }
                }
            }
        }
        Err("UPSTREAM_STREAM_INTERRUPTED")
    }
}
