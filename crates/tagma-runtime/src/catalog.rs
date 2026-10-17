//! One declared non-generative GET /models; never retries or probes inference.
use futures_util::StreamExt;
use std::{sync::Arc, time::Duration};
use tagma_core::{Provider, catalog::CatalogOutcome};
use tokio_util::sync::CancellationToken;
pub struct Detection {
    pub outcome: CatalogOutcome,
    pub status: Option<u16>,
    pub models: Vec<String>,
}
impl Detection {
    fn failed(outcome: CatalogOutcome, status: Option<u16>) -> Self {
        Self {
            outcome,
            status,
            models: vec![],
        }
    }
}
fn transport(error: &reqwest::Error) -> CatalogOutcome {
    if error.is_timeout() {
        return CatalogOutcome::Timeout;
    }
    let mut source = std::error::Error::source(error);
    while let Some(cause) = source {
        if cause.downcast_ref::<native_tls::Error>().is_some() {
            return CatalogOutcome::Tls;
        }
        source = cause.source();
    }
    CatalogOutcome::Network
}
pub fn client() -> Result<reqwest::Client, reqwest::Error> {
    reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .retry(reqwest::retry::never())
        .connect_timeout(Duration::from_secs(2))
        .timeout(Duration::from_secs(6))
        .pool_max_idle_per_host(1)
        .build()
}
pub async fn detect(
    client: &reqwest::Client,
    provider: &Provider,
    credential: Option<Arc<zeroize::Zeroizing<String>>>,
    cancel: &CancellationToken,
) -> Detection {
    let operation = async {
        let mut request = client
            .get(format!(
                "{}/models",
                provider.base_url.trim_end_matches('/')
            ))
            .header("accept", "application/json");
        if let Some(secret) = credential {
            request = request.bearer_auth(secret.as_str());
        }
        let response = match request.send().await {
            Ok(response) => response,
            Err(error) => return Detection::failed(transport(&error), None),
        };
        let status = response.status().as_u16();
        let outcome = match status {
            401 | 403 => Some(CatalogOutcome::Authentication),
            429 => Some(CatalogOutcome::RateLimited),
            404 | 405 | 501 => Some(CatalogOutcome::Unsupported),
            500..=599 => Some(CatalogOutcome::Upstream),
            200..=299 => None,
            _ => Some(CatalogOutcome::Protocol),
        };
        if let Some(outcome) = outcome {
            return Detection::failed(outcome, Some(status));
        }
        let mut bytes = Vec::new();
        let mut stream = response.bytes_stream();
        loop {
            match tokio::time::timeout(Duration::from_secs(2), stream.next()).await {
                Err(_) => return Detection::failed(CatalogOutcome::Timeout, Some(status)),
                Ok(Some(Err(error))) => return Detection::failed(transport(&error), Some(status)),
                Ok(Some(Ok(chunk))) => {
                    if bytes.len() + chunk.len() > 256 * 1024 {
                        return Detection::failed(CatalogOutcome::Protocol, Some(status));
                    }
                    bytes.extend_from_slice(&chunk);
                }
                Ok(None) => break,
            }
        }
        let models = match parse_models(&bytes) {
            Some(models) => models,
            None => return Detection::failed(CatalogOutcome::Protocol, Some(status)),
        };
        Detection {
            outcome: CatalogOutcome::Available,
            status: Some(status),
            models,
        }
    };
    tokio::select! {biased;_ = cancel.cancelled()=>Detection::failed(CatalogOutcome::Cancelled,None),result=tokio::time::timeout(Duration::from_secs(6),operation)=>result.unwrap_or_else(|_|Detection::failed(CatalogOutcome::Timeout,None))}
}
pub fn parse_models(bytes: &[u8]) -> Option<Vec<String>> {
    let value: serde_json::Value = serde_json::from_slice(bytes).ok()?;
    let rows = value.get("data")?.as_array()?;
    if rows.len() > 128 {
        return None;
    }
    let mut seen = std::collections::HashSet::new();
    let mut models = Vec::new();
    for row in rows {
        let id = row.get("id")?.as_str()?;
        if id.trim().is_empty()
            || id.len() > 256
            || id.chars().any(char::is_control)
            || !seen.insert(id.to_owned())
        {
            return None;
        }
        models.push(id.to_owned());
    }
    if serde_json::to_vec(&models).ok()?.len() > 60 * 1024 {
        return None;
    }
    Some(models)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn catalog_ids_are_preserved_but_bad_shapes_duplicates_controls_and_limits_are_rejected() {
        assert_eq!(
            parse_models(br#"{"data":[{"id":"org/model:id"}]}"#).unwrap(),
            vec!["org/model:id"]
        );
        for input in [
            r#"{"data":null}"#,
            r#"{"data":[{}]}"#,
            r#"{"data":[{"id":123}]}"#,
            r#"{"data":[{"id":""}]}"#,
            r#"{"data":[{"id":"a\nb"}]}"#,
            r#"{"data":[{"id":"same"},{"id":"same"}]}"#,
        ] {
            assert!(parse_models(input.as_bytes()).is_none());
        }
        let too_many = serde_json::json!({"data":(0..129).map(|i|serde_json::json!({"id":format!("model-{i}")})).collect::<Vec<_>>()});
        assert!(parse_models(&serde_json::to_vec(&too_many).unwrap()).is_none());
        let long = serde_json::json!({"data":[{"id":"x".repeat(257)}]});
        assert!(parse_models(&serde_json::to_vec(&long).unwrap()).is_none());
        let escaped = serde_json::json!({"data":(0..128).map(|i|serde_json::json!({"id":format!("{}{}","\\".repeat(248),i)})).collect::<Vec<_>>()});
        assert!(
            parse_models(&serde_json::to_vec(&escaped).unwrap()).is_none(),
            "Escaping cannot exceed the persisted catalog budget"
        );
    }
}
