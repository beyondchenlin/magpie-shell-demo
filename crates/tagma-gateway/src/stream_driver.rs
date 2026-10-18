//! A single queued SSE event per admitted request. Deadlines and revocation
//! keep running when the downstream socket stops polling its response body.
use crate::{http_api::StreamControl, usage::Attempt};
use axum::body::{Body, Bytes};
use futures_util::StreamExt;
use serde_json::Value;
use std::convert::Infallible;
use tagma_core::usage::Tokens;
use tokio::sync::{mpsc, oneshot};

struct AbortOnDrop(tokio::task::JoinHandle<()>);
impl Drop for AbortOnDrop {
    fn drop(&mut self) {
        self.0.abort();
    }
}

pub fn drive(body: Body, attempt: Attempt, control: StreamControl) -> Body {
    // The bounded HTTP request permits remain owned by the downstream body,
    // including after its upstream has stopped. Never queue complete responses.
    let (sender, mut receiver) = mpsc::channel(1);
    let (terminal, completed) = oneshot::channel();
    let driver = AbortOnDrop(tokio::spawn(produce(
        body, attempt, control, sender, terminal,
    )));
    Body::from_stream(async_stream::stream! {
        let _driver = driver;
        while let Some(bytes) = receiver.recv().await {
            yield Ok::<_, Infallible>(bytes);
        }
        let bytes = completed.await.unwrap_or_else(|_| {
            crate::http_api::usage_stream_error_state("UPSTREAM_STREAM_INTERRUPTED", true)
        });
        yield Ok(bytes);
    })
}

async fn produce(
    body: Body,
    mut attempt: Attempt,
    control: StreamControl,
    sender: mpsc::Sender<Bytes>,
    terminal: oneshot::Sender<Bytes>,
) {
    let mut body = body.into_data_stream();
    let mut tokens = Tokens::default();
    let mut seen_usage = false;
    let mut ambiguous = false;
    let (code, bytes) = loop {
        let chunk = tokio::select! {
            biased;
            _ = sender.closed() => return,
            code = control.stopped() => break (Some(code.to_owned()), control.error(code)),
            chunk = body.next() => chunk,
        };
        let bytes = match chunk {
            Some(Ok(bytes)) => bytes,
            _ => {
                let code = "UPSTREAM_STREAM_INTERRUPTED";
                break (Some(code.to_owned()), control.error(code));
            }
        };
        if bytes.as_ref() == b"data: [DONE]\n\n" {
            break (None, bytes);
        }
        let value = std::str::from_utf8(&bytes)
            .ok()
            .and_then(|text| text.strip_prefix("data: "))
            .and_then(|text| serde_json::from_str::<Value>(text.trim()).ok());
        if let Some(value) = value {
            if let Some(code) = value["error"]["code"].as_str() {
                break (Some(code.to_owned()), bytes);
            }
            if value.get("usage").is_some_and(Value::is_object) {
                let reported = crate::usage::tokens(&value);
                ambiguous |= seen_usage && tokens != reported;
                seen_usage = true;
                tokens = if ambiguous {
                    Tokens::default()
                } else {
                    reported
                };
            }
        }
        tokio::select! {
            biased;
            code = control.stopped() => break (Some(code.to_owned()), control.error(code)),
            sent = sender.send(bytes) => if sent.is_err() { return; },
        }
    };
    // Close the actual upstream before waiting for durable settlement or a
    // downstream reader. The terminal has a separate single-value slot, so it
    // cannot wait behind a full data channel. It is emitted after queued data.
    drop(body);
    let result = attempt.finish(code.as_deref(), tokens).await;
    let request_code = code
        .as_deref()
        .or_else(|| result.is_err().then_some(crate::usage::FAILURE));
    let request_result = attempt.finish_request(request_code).await;
    let bytes = if result.is_err() || request_result.is_err() {
        crate::http_api::usage_stream_error_state(
            code.as_deref().unwrap_or(crate::usage::FAILURE),
            true,
        )
    } else {
        bytes
    };
    let _ = terminal.send(bytes);
}
