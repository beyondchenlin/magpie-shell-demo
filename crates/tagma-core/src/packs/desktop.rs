use serde::{Deserialize, Serialize};
use ts_rs::TS;
use zeroize::Zeroize;

#[derive(Debug, Clone, Serialize, TS)]
pub struct PackUiError {
    pub code: String,
}
#[derive(Debug, Clone, Serialize, TS)]
pub struct SavedPackResult {
    pub name: String,
    pub bytes: String,
}
#[derive(Debug, Clone, Serialize, TS)]
pub struct PackReviewView {
    pub review_id: String,
    pub manifest_sha256: String,
    pub pack_id: String,
    pub version: String,
    pub publisher: String,
    pub platform: String,
    pub network_hosts: Vec<String>,
    pub workspace: String,
    pub browser: bool,
    pub subprocess: bool,
    pub memory_mib: u32,
    pub timeout_ms: u32,
    pub download_bytes: String,
    pub unpack_bytes: String,
    pub peak_bytes: String,
    pub target_shortfall_bytes: String,
    pub temp_shortfall_bytes: String,
    pub fits: bool,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct PackTaskEvent {
    pub task_id: String,
    pub phase: String,
    pub state: String,
    pub text: Option<String>,
    pub error: Option<String>,
}
#[derive(Debug, Clone, Serialize, TS)]
pub struct PackMarketView {
    pub release_ready: bool,
    pub internal_manifest: Option<String>,
    pub task: Option<PackTaskEvent>,
}
#[derive(Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct ConfirmPackInstall {
    pub protocol_version: u32,
    pub task_id: String,
    pub review_id: String,
    pub manifest_sha256: String,
}
#[derive(Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct InvokePack {
    pub protocol_version: u32,
    pub task_id: String,
    pub pack_id: String,
    pub operation: PackUserOperation,
}
#[derive(Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct ManagePack {
    pub protocol_version: u32,
    pub task_id: String,
    pub expected_revision: u32,
    pub pack_id: String,
    /// None deactivates; Some rechecks and activates a retained installed version.
    pub version: Option<String>,
}
#[derive(Deserialize, TS)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum PackUserOperation {
    LocalSample,
    ReachFlow { request: ReachFlowRequest },
}

/// One-call credentials; never included in Debug, manifests, configuration or task history.
#[derive(Clone, Serialize, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct ReachFlowRequest {
    pub service_url: String,
    pub workspace_id: String,
    pub access_token: String,
    pub action: ReachFlowAction,
}
impl std::fmt::Debug for ReachFlowRequest {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("ReachFlowRequest([redacted])")
    }
}
impl Drop for ReachFlowRequest {
    fn drop(&mut self) {
        self.access_token.zeroize();
    }
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum ReachFlowAction {
    StartCollection {
        draft_id: String,
        confirmation_id: String,
        plan_digest: String,
        engine_selection_revision: u32,
        idempotency_key: String,
    },
    TaskStatus {
        task_id: String,
    },
    TaskReport {
        task_id: String,
    },
    CancelTask {
        task_id: String,
    },
}
impl ReachFlowRequest {
    pub fn validate(&self) -> Result<url::Url, super::PackError> {
        let invalid = || super::PackError::InvalidManifest;
        let identifier = |s: &str| {
            !s.is_empty()
                && s.len() <= 128
                && s.bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b"-_".contains(&b))
        };
        let url = url::Url::parse(&self.service_url).map_err(|_| invalid())?;
        if self.service_url.len() > 2048
            || url.scheme() != "https"
            || url.host_str().is_none_or(|h| !super::manifest::dns_host(h))
            || !url.username().is_empty()
            || url.password().is_some()
            || url.path() != "/"
            || url.query().is_some()
            || url.fragment().is_some()
            || url.port_or_known_default() != Some(443)
            || !identifier(&self.workspace_id)
            || self.access_token.is_empty()
            || self.access_token.len() > 8192
            || !self.access_token.bytes().all(|b| (33..=126).contains(&b))
        {
            return Err(invalid());
        }
        match &self.action {
            ReachFlowAction::StartCollection {
                draft_id,
                confirmation_id,
                plan_digest,
                engine_selection_revision,
                idempotency_key,
            } => {
                if !identifier(draft_id)
                    || !identifier(confirmation_id)
                    || !identifier(idempotency_key)
                    || *engine_selection_revision == 0
                    || plan_digest.len() != 64
                    || !plan_digest
                        .bytes()
                        .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
                {
                    return Err(invalid());
                }
            }
            ReachFlowAction::TaskStatus { task_id }
            | ReachFlowAction::TaskReport { task_id }
            | ReachFlowAction::CancelTask { task_id } => {
                if !identifier(task_id) {
                    return Err(invalid());
                }
            }
        }
        Ok(url)
    }
}
