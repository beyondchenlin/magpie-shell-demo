use serde::{Deserialize, Serialize};
use ts_rs::TS;

pub const PROTOCOL_VERSION: u32 = 1;
pub const SCHEMA_VERSION: u32 = 8;
pub const PRODUCT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    InvalidInput,
    ConfigConflict,
    StorageUnavailable,
    CredentialStoreUnavailable,
    IncompatibleVersion,
    MaintenanceInProgress,
    DesktopRequired,
    InternalError,
    PortInUse,
    AlreadyRunning,
    GatewayUnavailable,
    ConfigApplyFailed,
    OwnershipRequired,
    StartupTimeout,
    InitializationRecoveryRequired,
    ProviderReferenced,
    ProfileReferenced,
    ProbeBackoff,
    ProbeBusy,
    AccessRevoked,
    SecurityStateUnconfirmed,
    UsageStorageUnavailable,
    RestartRequired,
    TeamSlugConflict,
    TeamPublished,
    TeamRecipeUnavailable,
    NoAvailableBrain,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
pub struct AppError {
    pub code: ErrorCode,
    pub retryable: bool,
}

impl AppError {
    pub fn new(code: ErrorCode) -> Self {
        let retryable = matches!(
            code,
            ErrorCode::ConfigConflict
                | ErrorCode::CredentialStoreUnavailable
                | ErrorCode::StorageUnavailable
                | ErrorCode::MaintenanceInProgress
        );
        Self { code, retryable }
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ProviderProtocol {
    OpenaiChatCompletions,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
pub struct Provider {
    pub id: String,
    pub name: String,
    pub protocol: ProviderProtocol,
    pub base_url: String,
    pub enabled: bool,
    pub models: Vec<String>,
    pub has_credential: bool,
}

/// A secret is accepted only on explicit save; it is never returned or Debug-formatted.
#[derive(Clone, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct SaveProvider {
    pub protocol_version: u32,
    pub expected_revision: u32,
    pub id: Option<String>,
    pub name: String,
    pub protocol: ProviderProtocol,
    pub base_url: String,
    pub enabled: bool,
    pub models: Vec<String>,
    pub credential: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct RevisionCommand {
    pub protocol_version: u32,
    pub expected_revision: u32,
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct ReorderProviders {
    pub protocol_version: u32,
    pub expected_revision: u32,
    pub ids: Vec<String>,
}

pub const GLOBAL_PROFILE_ID: &str = "00000000-0000-4000-8000-000000000000";

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct AppProfile {
    pub id: String,
    pub name: String,
    pub target_app: String,
    pub provider_ids: Vec<String>,
    pub use_global_order: bool,
    pub is_global: bool,
}

#[derive(Debug, Clone, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct SaveAppProfile {
    pub protocol_version: u32,
    pub expected_revision: u32,
    pub id: Option<String>,
    pub name: String,
    pub target_app: String,
    pub provider_ids: Vec<String>,
    pub use_global_order: bool,
}

/// Global is present by default for historical configurations. DefaultApp explicitly
/// clears the global sequence for automatic brains; it is never an inference-failure fallback.
#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
#[ts(tag = "kind", rename_all = "snake_case")]
pub enum FirstCloudOrder {
    Global {},
    DefaultApp { profile_id: String },
}

impl Default for FirstCloudOrder {
    fn default() -> Self {
        Self::Global {}
    }
}

#[derive(Debug, Clone, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct SaveFirstCloudOrder {
    pub protocol_version: u32,
    pub expected_revision: u32,
    pub order: FirstCloudOrder,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct GatewayView {
    pub port: u16,
    pub auth_enabled: bool,
    pub has_access_token: bool,
}

#[derive(Debug, Clone, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct SaveGateway {
    pub protocol_version: u32,
    pub expected_revision: u32,
    pub port: u16,
    pub auth_enabled: bool,
}

#[derive(Debug, Clone, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct RevisionInput {
    pub protocol_version: u32,
    pub expected_revision: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ConfigView {
    pub security: crate::security::SecurityView,
    pub protocol_version: u32,
    pub schema_version: u32,
    pub desired_revision: u32,
    pub providers: Vec<Provider>,
    pub profiles: Vec<AppProfile>,
    pub first_cloud_order: FirstCloudOrder,
    pub gateway: GatewayView,
    pub teams: Vec<crate::teams::TeamView>,
    pub model_health: Vec<crate::health::ModelHealthView>,
    pub provider_catalog: Vec<crate::catalog::CatalogView>,
    pub pending_credential_cleanup: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
pub enum RuntimeState {
    Stopped,
    Starting,
    Running,
    Degraded,
    Stopping,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct RuntimeStatus {
    #[serde(default)]
    pub usage_degraded: Option<bool>,
    #[serde(default)]
    pub usage_pending_results: Option<u32>,
    #[serde(default)]
    pub security_revision: Option<u32>,
    pub state: RuntimeState,
    pub instance_id: Option<String>,
    pub effective_revision: Option<u32>,
    pub address: Option<String>,
    pub owned: bool,
    pub error: Option<AppError>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ApplicationView {
    pub product_version: String,
    pub config: ConfigView,
    pub runtime: RuntimeStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct InitializationRecoveryPlan {
    pub operation_id: String,
    pub record_path: String,
    pub archive_path: String,
    pub expected_sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct RecoverInitialization {
    pub protocol_version: u32,
    pub operation_id: String,
    pub expected_sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct RecoveryOutcome {
    pub archive_path: String,
    pub requires_restart: bool,
}

pub fn check_protocol(version: u32) -> AppResult<()> {
    if version == PROTOCOL_VERSION {
        Ok(())
    } else {
        Err(AppError::new(ErrorCode::IncompatibleVersion))
    }
}
