use fs2::FileExt;
use interprocess::local_socket::{
    GenericNamespaced, ListenerOptions,
    tokio::{Listener, Stream, prelude::*},
};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use sha2::{Digest, Sha256};
use std::{io, path::Path};
use tagma_core::*;
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};

pub const MAX_FRAME: usize = 65536;
pub const DEFAULT_PORT: u16 = 9168;

#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Manifest {
    pub protocol_version: u32,
    pub product_version: String,
    pub schema_version: u32,
    pub config_id: String,
    pub instance_id: String,
    pub endpoint: String,
    pub port: u16,
    pub console_attached: bool,
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Bootstrap {
    pub owner_token: String,
    pub instance_id: String,
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Request {
    pub protocol_version: u32,
    pub product_version: String,
    pub config_id: String,
    pub instance_id: String,
    pub challenge: String,
    pub command: Command,
}

#[derive(Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum Command {
    Status,
    Apply,
    RecoverUsage,
    ConfirmSecurity {
        revision: u32,
    },
    Probe {
        input: tagma_core::catalog::ProbeProvider,
    },
    CancelProbe {
        request_id: String,
    },
    Stop {
        owner_token: String,
    },
}

#[derive(Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum OperationResult {
    ConfirmSecurity {
        requested_revision: u32,
        confirmed: bool,
        error: Option<AppError>,
    },
    RecoverUsage {
        confirmed: bool,
        error: Option<AppError>,
    },
}
#[derive(Serialize, Deserialize)]
pub struct Response {
    #[serde(default)]
    pub operation: Option<OperationResult>,
    pub protocol_version: u32,
    pub product_version: String,
    pub config_id: String,
    pub instance_id: String,
    pub challenge: String,
    pub status: RuntimeStatus,
}

pub fn config_id(directory: &Path) -> AppResult<String> {
    let absolute = directory
        .canonicalize()
        .map_err(|_| AppError::new(ErrorCode::StorageUnavailable))?;
    Ok(format!(
        "{:x}",
        Sha256::digest(absolute.to_string_lossy().as_bytes())
    ))
}

pub async fn read_frame<T: DeserializeOwned>(
    stream: &mut (impl AsyncRead + Unpin),
) -> io::Result<T> {
    let length = stream.read_u32().await? as usize;
    if length == 0 || length > MAX_FRAME {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "IPC frame limit",
        ));
    }
    let mut bytes = zeroize::Zeroizing::new(vec![0u8; length]);
    stream.read_exact(&mut bytes).await?;
    serde_json::from_slice(&bytes)
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "IPC contract"))
}

pub async fn write_frame<T: Serialize>(
    stream: &mut (impl AsyncWrite + Unpin),
    value: &T,
) -> io::Result<()> {
    let bytes = zeroize::Zeroizing::new(
        serde_json::to_vec(value)
            .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "IPC contract"))?,
    );
    if bytes.len() > MAX_FRAME {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "IPC frame limit",
        ));
    }
    stream.write_u32(bytes.len() as u32).await?;
    stream.write_all(&bytes).await?;
    stream.flush().await
}

pub fn listener(endpoint: &str) -> io::Result<Listener> {
    #[cfg(windows)]
    let name = endpoint.to_ns_name::<GenericNamespaced>()?;
    #[cfg(unix)]
    let name = endpoint.to_fs_name::<interprocess::local_socket::GenericFilePath>()?;
    let options = ListenerOptions::new().name(name).try_overwrite(false);
    #[cfg(windows)]
    let options = {
        use interprocess::os::windows::{
            local_socket::ListenerOptionsExt, security_descriptor::SecurityDescriptor,
        };
        let sddl =
            widestring::U16CString::from_str(format!("D:P(A;;GA;;;{})", current_user_sid()?))
                .map_err(|_| io::Error::other("SID encoding"))?;
        options.security_descriptor(SecurityDescriptor::deserialize(&sddl)?)
    };
    #[cfg(unix)]
    let options = {
        use interprocess::os::unix::local_socket::ListenerOptionsExt;
        options.mode(0o600)
    };
    options.create_tokio()
}

#[cfg(windows)]
fn current_user_sid() -> io::Result<String> {
    use windows_sys::Win32::{
        Foundation::{CloseHandle, HANDLE, LocalFree},
        Security::{
            Authorization::ConvertSidToStringSidW, GetTokenInformation, TOKEN_QUERY, TOKEN_USER,
            TokenUser,
        },
        System::Threading::{GetCurrentProcess, OpenProcessToken},
    };
    struct TokenHandle(HANDLE);
    impl Drop for TokenHandle {
        fn drop(&mut self) {
            unsafe {
                CloseHandle(self.0);
            }
        }
    }
    let mut raw_token = std::ptr::null_mut();
    if unsafe { OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut raw_token) } == 0 {
        return Err(io::Error::last_os_error());
    }
    let token = TokenHandle(raw_token);
    let mut length = 0;
    // SAFETY: Query size then allocate aligned storage; token pseudo-handle is process-owned.
    unsafe {
        GetTokenInformation(token.0, TokenUser, std::ptr::null_mut(), 0, &mut length);
    }
    if length == 0 || length > 65536 {
        return Err(io::Error::last_os_error());
    }
    let mut buffer = vec![0usize; (length as usize).div_ceil(std::mem::size_of::<usize>())];
    let mut sid_text = std::ptr::null_mut();
    unsafe {
        if GetTokenInformation(
            token.0,
            TokenUser,
            buffer.as_mut_ptr().cast(),
            length,
            &mut length,
        ) == 0
        {
            return Err(io::Error::last_os_error());
        }
        let token = &*(buffer.as_ptr().cast::<TOKEN_USER>());
        if ConvertSidToStringSidW(token.User.Sid, &mut sid_text) == 0 {
            return Err(io::Error::last_os_error());
        }
        let result = widestring::U16CStr::from_ptr_str(sid_text).to_string_lossy();
        LocalFree(sid_text.cast());
        Ok(result)
    }
}

pub async fn call(manifest: &Manifest, command: Command) -> AppResult<RuntimeStatus> {
    let recovery = matches!(&command, Command::RecoverUsage);
    let safety = match &command {
        Command::ConfirmSecurity { revision } => Some(*revision),
        _ => None,
    };
    check_protocol(manifest.protocol_version)?;
    if manifest.product_version != PRODUCT_VERSION || manifest.schema_version != SCHEMA_VERSION {
        return Err(AppError::new(ErrorCode::IncompatibleVersion));
    }
    let challenge = uuid::Uuid::new_v4().to_string();
    let request = Request {
        protocol_version: PROTOCOL_VERSION,
        product_version: PRODUCT_VERSION.into(),
        config_id: manifest.config_id.clone(),
        instance_id: manifest.instance_id.clone(),
        challenge: challenge.clone(),
        command,
    };
    let operation = async {
        #[cfg(windows)]
        let name = manifest.endpoint.as_str().to_ns_name::<GenericNamespaced>();
        #[cfg(unix)]
        let name = manifest
            .endpoint
            .as_str()
            .to_fs_name::<interprocess::local_socket::GenericFilePath>();
        let mut stream =
            Stream::connect(name.map_err(|_| AppError::new(ErrorCode::GatewayUnavailable))?)
                .await
                .map_err(|_| AppError::new(ErrorCode::GatewayUnavailable))?;
        write_frame(&mut stream, &request)
            .await
            .map_err(|_| AppError::new(ErrorCode::GatewayUnavailable))?;
        let response: Response = read_frame(&mut stream)
            .await
            .map_err(|_| AppError::new(ErrorCode::GatewayUnavailable))?;
        if response.challenge != challenge
            || response.config_id != manifest.config_id
            || response.instance_id != manifest.instance_id
            || response.product_version != PRODUCT_VERSION
            || response.protocol_version != PROTOCOL_VERSION
        {
            return Err(AppError::new(ErrorCode::IncompatibleVersion));
        }
        if recovery {
            match &response.operation {
                Some(OperationResult::RecoverUsage {
                    error: Some(error), ..
                }) => return Err(error.clone()),
                Some(OperationResult::RecoverUsage {
                    confirmed: true,
                    error: None,
                }) => validate_recovered_usage(&response.status, &manifest.instance_id)?,
                _ => return Err(AppError::new(ErrorCode::UsageStorageUnavailable)),
            }
        }
        if let Some(expected) = safety {
            match &response.operation {
                Some(OperationResult::ConfirmSecurity {
                    error: Some(error), ..
                }) => return Err(error.clone()),
                Some(OperationResult::ConfirmSecurity {
                    requested_revision,
                    confirmed: true,
                    error: None,
                }) if *requested_revision == expected => {
                    validate_confirmed_security(&response.status, &manifest.instance_id, expected)?
                }
                _ => return Err(AppError::new(ErrorCode::SecurityStateUnconfirmed)),
            }
        }
        Ok(response.status)
    };
    tokio::time::timeout(std::time::Duration::from_secs(2), operation)
        .await
        .map_err(|_| AppError::new(ErrorCode::GatewayUnavailable))?
}
pub(crate) fn validate_confirmed_security(
    status: &RuntimeStatus,
    instance: &str,
    revision: u32,
) -> AppResult<()> {
    if status.instance_id.as_deref() != Some(instance)
        || status
            .security_revision
            .is_none_or(|current| current < revision)
        || !matches!(status.state, RuntimeState::Running | RuntimeState::Degraded)
    {
        return Err(AppError::new(ErrorCode::SecurityStateUnconfirmed));
    }
    if let Some(error) = &status.error
        && !matches!(
            error.code,
            ErrorCode::ConfigApplyFailed
                | ErrorCode::RestartRequired
                | ErrorCode::CredentialStoreUnavailable
                | ErrorCode::MaintenanceInProgress
                | ErrorCode::UsageStorageUnavailable
        )
    {
        return Err(error.clone());
    }
    Ok(())
}
pub(crate) fn validate_recovered_usage(status: &RuntimeStatus, instance: &str) -> AppResult<()> {
    if status.instance_id.as_deref() != Some(instance)
        || status.usage_degraded != Some(false)
        || status.usage_pending_results != Some(0)
        || !matches!(status.state, RuntimeState::Running | RuntimeState::Degraded)
    {
        return Err(AppError::new(ErrorCode::UsageStorageUnavailable));
    }
    // Configuration failures may coexist with successful usage recovery. Keep
    // those visible, but refuse a contradictory or ambiguous storage failure.
    if let Some(error) = &status.error
        && !matches!(
            error.code,
            ErrorCode::ConfigApplyFailed
                | ErrorCode::RestartRequired
                | ErrorCode::CredentialStoreUnavailable
                | ErrorCode::MaintenanceInProgress
        )
    {
        return Err(error.clone());
    }
    Ok(())
}

pub fn read_manifest(directory: &Path) -> AppResult<Manifest> {
    parse_manifest(directory, &manifest_bytes(directory)?)
}

pub(crate) fn manifest_bytes(directory: &Path) -> AppResult<Vec<u8>> {
    let file = std::fs::File::open(directory.join("runtime.json"))
        .map_err(|_| AppError::new(ErrorCode::GatewayUnavailable))?;
    let mut bytes = Vec::with_capacity(4097);
    std::io::Read::read_to_end(&mut std::io::Read::take(file, 4097), &mut bytes)
        .map_err(|_| AppError::new(ErrorCode::GatewayUnavailable))?;
    if bytes.len() > 4096 {
        return Err(AppError::new(ErrorCode::InvalidInput));
    }
    Ok(bytes)
}

pub(crate) fn parse_manifest(directory: &Path, bytes: &[u8]) -> AppResult<Manifest> {
    // Check the version envelope before decoding fields added by newer programs.
    // An active older program must report incompatibility, not a misleading parse/start error.
    #[derive(Deserialize)]
    struct VersionEnvelope {
        protocol_version: u32,
        product_version: String,
        schema_version: u32,
    }
    let version: VersionEnvelope =
        serde_json::from_slice(bytes).map_err(|_| AppError::new(ErrorCode::InvalidInput))?;
    if version.protocol_version != PROTOCOL_VERSION
        || version.product_version != PRODUCT_VERSION
        || version.schema_version != SCHEMA_VERSION
    {
        return Err(AppError::new(ErrorCode::IncompatibleVersion));
    }
    let manifest: Manifest =
        serde_json::from_slice(bytes).map_err(|_| AppError::new(ErrorCode::InvalidInput))?;
    if manifest.config_id != config_id(directory)? {
        return Err(AppError::new(ErrorCode::IncompatibleVersion));
    }
    Ok(manifest)
}

pub fn has_active_instance(directory: &Path) -> AppResult<bool> {
    let file = std::fs::OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .open(directory.join("gateway.lock"))
        .map_err(|_| AppError::new(ErrorCode::StorageUnavailable))?;
    match file.try_lock_exclusive() {
        Ok(()) => Ok(false),
        Err(error)
            if error.kind() == io::ErrorKind::WouldBlock || error.raw_os_error() == Some(33) =>
        {
            Ok(true)
        }
        Err(_) => Err(AppError::new(ErrorCode::StorageUnavailable)),
    }
}
