//! Trusted pack process calls. This is not a sandbox or an installation claim.
//! The caller must display/approve the exact signed manifest and its permissions.
//! No gateway credentials, inherited environment, shell, or user files are supplied.
use serde::{Deserialize, Serialize};
use std::{
    path::{Path, PathBuf},
    process::Stdio,
    sync::Arc,
    time::Duration,
};
use tagma_core::packs::{
    PackArch, PackOs, PackStageControl, PackTarget, PackTrustStore, PreparedPack,
};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    process::Command,
    sync::Semaphore,
};
use tokio_util::sync::CancellationToken;
use uuid::Uuid;
mod removal;
pub use removal::RemovalStatus;

const MAX_TEXT: usize = 16 * 1024;
const MAX_RESPONSE: u64 = 128 * 1024;
const MAX_STDERR: u64 = 64 * 1024;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PackRunError {
    Unavailable,
    ApprovalChanged,
    UnsupportedPlatform,
    Busy,
    Cancelled,
    TimedOut,
    StartFailed,
    ProcessFailed,
    ProtocolError,
    OutputLimit,
    InvalidInput,
    ConfigurationConflict,
    ServiceAuthRequired,
    ServiceConfirmationRequired,
    ServiceUnconfirmed,
    ServiceReportUnavailable,
    NetworkNotAllowed,
    CleanupPending,
}
impl std::fmt::Display for PackRunError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::Unavailable => "PACK_UNAVAILABLE",
            Self::ApprovalChanged => "PACK_APPROVAL_CHANGED",
            Self::UnsupportedPlatform => "PACK_UNSUPPORTED_PLATFORM",
            Self::Busy => "PACK_BUSY",
            Self::Cancelled => "PACK_CANCELLED",
            Self::TimedOut => "PACK_TIMED_OUT",
            Self::StartFailed => "PACK_START_FAILED",
            Self::ProcessFailed => "PACK_PROCESS_FAILED",
            Self::ProtocolError => "PACK_PROTOCOL_ERROR",
            Self::OutputLimit => "PACK_OUTPUT_LIMIT",
            Self::InvalidInput => "PACK_INVALID_INPUT",
            Self::ConfigurationConflict => "CONFIG_CONFLICT",
            Self::ServiceAuthRequired => "REACHFLOW_AUTH_REQUIRED",
            Self::ServiceConfirmationRequired => "REACHFLOW_CONFIRMATION_REQUIRED",
            Self::ServiceUnconfirmed => "REACHFLOW_RESULT_UNCONFIRMED",
            Self::ServiceReportUnavailable => "REACHFLOW_REPORT_UNAVAILABLE",
            Self::NetworkNotAllowed => "PACK_NETWORK_NOT_ALLOWED",
            Self::CleanupPending => "PACK_CLEANUP_PENDING",
        })
    }
}
impl std::error::Error for PackRunError {}
type Result<T> = std::result::Result<T, PackRunError>;

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum PackOperation {
    Ping,
    LocalSample {
        text: String,
    },
    ReachFlow {
        request: tagma_core::packs::ReachFlowRequest,
    },
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PackCall {
    pub protocol_version: u32,
    pub request_id: Uuid,
    pub pack_id: String,
    pub version: String,
    pub operation: PackOperation,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum PackReplyBody {
    Ready,
    Result { text: String },
    Failed { code: String },
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PackReply {
    pub protocol_version: u32,
    pub request_id: Uuid,
    pub pack_id: String,
    pub version: String,
    pub body: PackReplyBody,
}

/// The owning controller shares this executor; one in-flight call at a time.
/// No unbounded queue. This does not coordinate separate host processes.
/// An approval is the SHA256 of the signed manifest reviewed by the user. It
/// never originates from model output or the pack's self-reported permissions.
pub struct PackExecutor {
    config_uuid: Uuid,
    preparations: PathBuf,
    trust: Arc<PackTrustStore>,
    admission: Arc<Semaphore>,
}
impl PackExecutor {
    /// Health succeeds before the configuration publishes this immutable version.
    /// Cancellation/failure/conflict leaves the previous active version intact.
    pub async fn activate(
        &self,
        config: &tagma_core::ConfigService,
        expected_revision: u32,
        preparation: Uuid,
        approved_manifest: &str,
        cancel: CancellationToken,
    ) -> Result<tagma_core::ConfigView> {
        if config
            .configuration_id()
            .map_err(|_| PackRunError::Unavailable)?
            != self.config_uuid
        {
            return Err(PackRunError::Unavailable);
        }
        self.call(
            preparation,
            approved_manifest,
            PackOperation::Ping,
            cancel.clone(),
        )
        .await?;
        if cancel.is_cancelled() {
            return Err(PackRunError::Cancelled);
        }
        let root = self.preparations.join(format!("prepared-{preparation}"));
        let trust = self.trust.clone();
        let identity = self.config_uuid;
        let now = epoch_ms()?;
        let control = PackStageControl::new(Duration::from_secs(10))
            .map_err(|_| PackRunError::Unavailable)?;
        let check_control = control.clone();
        let slot = self
            .admission
            .clone()
            .try_acquire_owned()
            .map_err(|_| PackRunError::Busy)?;
        let mut validation = tokio::task::spawn_blocking(move || {
            (
                PreparedPack::reopen(&root, identity, &trust, now, &check_control),
                slot,
            )
        });
        let (prepared, _slot) = tokio::select! {
            biased;
            _=cancel.cancelled()=>{control.cancel();let _=validation.await;return Err(PackRunError::Cancelled)},
            result=&mut validation=>result.map_err(|_|PackRunError::Unavailable)?,
        };
        let prepared = prepared.map_err(|_| PackRunError::Unavailable)?;
        if prepared.manifest().sha256() != approved_manifest {
            return Err(PackRunError::ApprovalChanged);
        }
        if cancel.is_cancelled() {
            return Err(PackRunError::Cancelled);
        }
        config
            .activate_healthy_pack(
                expected_revision,
                prepared.manifest(),
                prepared.target(),
                preparation,
                epoch_ms()?,
            )
            .map_err(|e| {
                if e.code == tagma_core::ErrorCode::ConfigConflict {
                    PackRunError::ConfigurationConflict
                } else {
                    PackRunError::Unavailable
                }
            })
    }

    /// Resolves once, so updates cannot change the version of an in-flight call.
    pub async fn call_active(
        &self,
        config: &tagma_core::ConfigService,
        id: &str,
        operation: PackOperation,
        cancel: CancellationToken,
    ) -> Result<PackReply> {
        if config
            .configuration_id()
            .map_err(|_| PackRunError::Unavailable)?
            != self.config_uuid
        {
            return Err(PackRunError::Unavailable);
        }
        let (_, snapshot) = config
            .read_snapshot()
            .map_err(|_| PackRunError::Unavailable)?;
        let pack = snapshot
            .installed_packs
            .iter()
            .find(|p| p.id == id)
            .ok_or(PackRunError::Unavailable)?;
        let version = pack
            .versions
            .iter()
            .find(|v| Some(&v.version) == pack.active_version.as_ref())
            .ok_or(PackRunError::Unavailable)?;
        let reply = self
            .call(
                Uuid::parse_str(&version.preparation_id).map_err(|_| PackRunError::Unavailable)?,
                &version.manifest_sha256,
                operation,
                cancel,
            )
            .await?;
        if reply.pack_id != id || reply.version != version.version {
            return Err(PackRunError::ProtocolError);
        }
        Ok(reply)
    }
    pub fn new(config_uuid: Uuid, preparations: &Path, trust: Arc<PackTrustStore>) -> Result<Self> {
        if config_uuid.is_nil() {
            return Err(PackRunError::InvalidInput);
        }
        let metadata =
            std::fs::symlink_metadata(preparations).map_err(|_| PackRunError::Unavailable)?;
        if !metadata.is_dir() || metadata.file_type().is_symlink() {
            return Err(PackRunError::Unavailable);
        }
        #[cfg(windows)]
        {
            use std::os::windows::fs::MetadataExt;
            if metadata.file_attributes() & 0x400 != 0 {
                return Err(PackRunError::Unavailable);
            }
        }
        Ok(Self {
            config_uuid,
            preparations: std::fs::canonicalize(preparations)
                .map_err(|_| PackRunError::Unavailable)?,
            trust,
            admission: Arc::new(Semaphore::new(1)),
        })
    }

    pub async fn call(
        &self,
        preparation: Uuid,
        approved_manifest: &str,
        operation: PackOperation,
        cancel: CancellationToken,
    ) -> Result<PackReply> {
        if preparation.is_nil()
            || approved_manifest.len() != 64
            || !approved_manifest
                .bytes()
                .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
        {
            return Err(PackRunError::InvalidInput);
        }
        if let PackOperation::LocalSample { text } = &operation
            && (text.trim().is_empty() || text.len() > MAX_TEXT || text.contains('\0'))
        {
            return Err(PackRunError::InvalidInput);
        }
        if cancel.is_cancelled() {
            return Err(PackRunError::Cancelled);
        }
        // Coordinate desktop and gateway execution of the same installation.
        // This lease lives through validation, process completion and cancellation cleanup.
        let lease = std::fs::OpenOptions::new()
            .create(true)
            .truncate(false)
            .read(true)
            .write(true)
            .open(self.preparations.join("call.lock"))
            .map_err(|_| PackRunError::Unavailable)?;
        fs2::FileExt::try_lock_exclusive(&lease).map_err(|_| PackRunError::Busy)?;
        let slot = self
            .admission
            .clone()
            .try_acquire_owned()
            .map_err(|_| PackRunError::Busy)?;
        let root = self.preparations.join(format!("prepared-{preparation}"));
        let config = self.config_uuid;
        let trust = self.trust.clone();
        let control = PackStageControl::new(Duration::from_secs(10))
            .map_err(|_| PackRunError::Unavailable)?;
        let check_control = control.clone();
        let now = epoch_ms()?;
        let mut validation = tokio::task::spawn_blocking(move || {
            (
                PreparedPack::reopen(&root, config, &trust, now, &check_control),
                slot,
            )
        });
        let (prepared, _slot) = tokio::select! {
            biased;
            _=cancel.cancelled()=>{control.cancel();let _=validation.await;return Err(PackRunError::Cancelled)},
            result=&mut validation=>result.map_err(|_|PackRunError::Unavailable)?,
        };
        let prepared = prepared.map_err(|_| PackRunError::Unavailable)?;
        if prepared.manifest().sha256() != approved_manifest {
            return Err(PackRunError::ApprovalChanged);
        }
        let target = host_target()?;
        if prepared.target() != target {
            return Err(PackRunError::UnsupportedPlatform);
        }
        let artifact = prepared
            .manifest()
            .artifact(target)
            .map_err(|_| PackRunError::Unavailable)?;
        // Only native binaries in v1, never a shell/interpreter selected from PATH.
        #[cfg(windows)]
        if !artifact.entry.executable.ends_with(".exe") {
            return Err(PackRunError::UnsupportedPlatform);
        }
        let executable = prepared
            .root_path()
            .join("payload")
            .join(&artifact.entry.executable);
        let manifest = prepared.manifest().manifest();
        if let PackOperation::ReachFlow { request } = &operation {
            let endpoint = request.validate().map_err(|_| PackRunError::InvalidInput)?;
            if manifest.id != "reachflow"
                || !artifact
                    .permissions
                    .network_hosts
                    .iter()
                    .any(|h| Some(h.as_str()) == endpoint.host_str())
            {
                return Err(PackRunError::NetworkNotAllowed);
            }
        }
        let ping = matches!(operation, PackOperation::Ping);
        let timeout_ms = if ping {
            artifact.health.timeout_ms
        } else {
            artifact.resources.task_timeout_ms
        };
        let input = PackCall {
            protocol_version: 1,
            request_id: Uuid::new_v4(),
            pack_id: manifest.id.clone(),
            version: manifest.version.clone(),
            operation,
        };
        if cancel.is_cancelled() {
            return Err(PackRunError::Cancelled);
        }
        invoke(
            &executable,
            prepared.root_path(),
            &artifact.entry.arguments,
            &input,
            Duration::from_millis(timeout_ms.into()),
            cancel,
        )
        .await
    }
}

fn host_target() -> Result<PackTarget> {
    let os = match std::env::consts::OS {
        "windows" => PackOs::Windows,
        "macos" => PackOs::Macos,
        "linux" => PackOs::Linux,
        _ => return Err(PackRunError::UnsupportedPlatform),
    };
    let arch = match std::env::consts::ARCH {
        "x86_64" => PackArch::X86_64,
        "aarch64" => PackArch::Aarch64,
        _ => return Err(PackRunError::UnsupportedPlatform),
    };
    Ok(PackTarget { os, arch })
}

fn epoch_ms() -> Result<u64> {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| PackRunError::Unavailable)?
        .as_millis()
        .try_into()
        .map_err(|_| PackRunError::Unavailable)
}

async fn invoke(
    executable: &Path,
    working: &Path,
    args: &[String],
    input: &PackCall,
    limit: Duration,
    cancel: CancellationToken,
) -> Result<PackReply> {
    let mut bytes =
        zeroize::Zeroizing::new(serde_json::to_vec(input).map_err(|_| PackRunError::InvalidInput)?);
    bytes.push(b'\n');
    let mut command = Command::new(executable);
    command
        .args(args)
        .current_dir(working)
        .env_clear()
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    // Native Windows loader/runtime uses SystemRoot. Do not inherit PATH,
    // proxy variables, API keys, home directories or a parent's app config.
    #[cfg(windows)]
    {
        if let Some(root) = std::env::var_os("SystemRoot") {
            command.env("SystemRoot", root);
        }
        command.creation_flags(0x08000000);
    }
    let mut child = command.spawn().map_err(|_| PackRunError::StartFailed)?;
    let mut stdin = child.stdin.take().ok_or(PackRunError::StartFailed)?;
    let stdout = child.stdout.take().ok_or(PackRunError::StartFailed)?;
    let stderr = child.stderr.take().ok_or(PackRunError::StartFailed)?;
    let work = async {
        let send = async {
            stdin
                .write_all(&bytes)
                .await
                .map_err(|_| PackRunError::ProcessFailed)?;
            drop(stdin);
            Ok::<_, PackRunError>(())
        };
        let output = async {
            let mut b = Vec::new();
            stdout
                .take(MAX_RESPONSE + 1)
                .read_to_end(&mut b)
                .await
                .map_err(|_| PackRunError::ProcessFailed)?;
            if b.len() as u64 > MAX_RESPONSE {
                return Err(PackRunError::OutputLimit);
            }
            Ok(b)
        };
        let errors = async {
            let mut b = Vec::new();
            stderr
                .take(MAX_STDERR + 1)
                .read_to_end(&mut b)
                .await
                .map_err(|_| PackRunError::ProcessFailed)?;
            if b.len() as u64 > MAX_STDERR {
                return Err(PackRunError::OutputLimit);
            }
            Ok(())
        };
        let (_, output, ()) = tokio::try_join!(send, output, errors)?;
        let status = child
            .wait()
            .await
            .map_err(|_| PackRunError::ProcessFailed)?;
        if !status.success() {
            return Err(PackRunError::ProcessFailed);
        }
        let reply: PackReply =
            serde_json::from_slice(&output).map_err(|_| PackRunError::ProtocolError)?;
        if reply.protocol_version != 1
            || reply.request_id != input.request_id
            || reply.pack_id != input.pack_id
            || reply.version != input.version
        {
            return Err(PackRunError::ProtocolError);
        }
        match (&input.operation, &reply.body) {
            (PackOperation::Ping, PackReplyBody::Ready) => {}
            (PackOperation::LocalSample { .. }, PackReplyBody::Result { text })
            | (PackOperation::ReachFlow { .. }, PackReplyBody::Result { text })
                if !text.trim().is_empty() && text.len() <= 64 * 1024 => {}
            (_, PackReplyBody::Failed { code }) => {
                return Err(match code.as_str() {
                    "REACHFLOW_AUTH_REQUIRED" => PackRunError::ServiceAuthRequired,
                    "REACHFLOW_CONFIRMATION_REQUIRED" => PackRunError::ServiceConfirmationRequired,
                    "REACHFLOW_RESULT_UNCONFIRMED" => PackRunError::ServiceUnconfirmed,
                    "REACHFLOW_REPORT_UNAVAILABLE" => PackRunError::ServiceReportUnavailable,
                    _ => PackRunError::ProcessFailed,
                });
            }
            _ => return Err(PackRunError::ProtocolError),
        }
        Ok(reply)
    };
    let result = tokio::select! {biased;_=cancel.cancelled()=>Err(PackRunError::Cancelled), result=tokio::time::timeout(limit,work)=>result.unwrap_or(Err(PackRunError::TimedOut))};
    if result.is_err() {
        let _ = child.kill().await;
        let _ = child.wait().await;
    }
    result
}
