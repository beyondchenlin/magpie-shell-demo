use crate::ipc::{self, Bootstrap, Command as Control};
use std::{
    collections::VecDeque,
    path::{Path, PathBuf},
    process::Stdio,
    sync::atomic::{AtomicBool, Ordering},
    time::Duration,
};
use tagma_core::*;
use tokio::{
    io::AsyncWriteExt,
    process::{Child, ChildStdin, Command},
    sync::Mutex,
};

struct Owned {
    child: Child,
    _parent_lifetime: ChildStdin,
    token: zeroize::Zeroizing<String>,
    instance: String,
}
#[derive(Default)]
struct RestartPolicy {
    wanted: bool,
    port: Option<u16>,
    attempts: VecDeque<tokio::time::Instant>,
    next: Option<tokio::time::Instant>,
}
pub struct GatewayManager {
    directory: PathBuf,
    binary: PathBuf,
    owned: Mutex<Option<Owned>>,
    operation: Mutex<()>,
    failure: Mutex<Option<AppError>>,
    restart: Mutex<RestartPolicy>,
    starting: AtomicBool,
    logging_available: AtomicBool,
}

impl GatewayManager {
    pub fn new(directory: &Path, binary: &Path) -> Self {
        Self {
            directory: directory.into(),
            binary: binary.into(),
            owned: Mutex::new(None),
            operation: Mutex::new(()),
            failure: Mutex::new(None),
            restart: Mutex::new(RestartPolicy::default()),
            starting: AtomicBool::new(false),
            logging_available: AtomicBool::new(true),
        }
    }
    pub async fn status(&self) -> RuntimeStatus {
        let mut owned = self.owned.lock().await;
        let crashed = if let Some(instance) = owned.as_mut() {
            instance.child.try_wait().ok().flatten().is_some()
        } else {
            false
        };
        if crashed {
            *owned = None;
            *self.failure.lock().await = Some(AppError::new(ErrorCode::GatewayUnavailable));
            self.log(
                tagma_core::diagnostics::Event::CrashDetected,
                Some(ErrorCode::GatewayUnavailable),
                None,
            );
            let mut policy = self.restart.lock().await;
            if policy.wanted && policy.next.is_none() {
                policy.next = Some(
                    tokio::time::Instant::now()
                        + Duration::from_secs(1 << policy.attempts.len().min(2)),
                );
            }
        }
        let failure = self.failure.lock().await.clone();
        let active = match ipc::has_active_instance(&self.directory) {
            Ok(active) => active,
            Err(error) => return Self::unavailable(RuntimeState::Failed, Some(error)),
        };
        if !active {
            return Self::unavailable(
                if self.starting.load(Ordering::SeqCst) {
                    RuntimeState::Starting
                } else if failure.is_some() {
                    RuntimeState::Failed
                } else {
                    RuntimeState::Stopped
                },
                failure,
            );
        }
        match ipc::read_manifest(&self.directory) {
            Ok(manifest) => match ipc::call(&manifest, Control::Status).await {
                Ok(mut status) => {
                    status.owned = owned
                        .as_ref()
                        .is_some_and(|o| o.instance == manifest.instance_id);
                    status
                }
                Err(error) => Self::unavailable(RuntimeState::Failed, failure.or(Some(error))),
            },
            Err(error) => Self::unavailable(
                if failure.is_some() {
                    RuntimeState::Failed
                } else if self.starting.load(Ordering::SeqCst) {
                    RuntimeState::Starting
                } else {
                    RuntimeState::Failed
                },
                failure.or(Some(error)),
            ),
        }
    }
    fn unavailable(state: RuntimeState, error: Option<AppError>) -> RuntimeStatus {
        RuntimeStatus {
            state,
            instance_id: None,
            effective_revision: None,
            address: None,
            owned: false,
            error,
        }
    }

    pub async fn start(&self, port: u16) -> AppResult<RuntimeStatus> {
        self.log(tagma_core::diagnostics::Event::Starting, None, None);
        *self.restart.lock().await = RestartPolicy::default();
        let result = self.start_once(port, false).await;
        if let Ok(status) = &result {
            self.log(
                if status.owned {
                    tagma_core::diagnostics::Event::Ready
                } else {
                    tagma_core::diagnostics::Event::Attached
                },
                None,
                status.effective_revision,
            );
            let mut policy = self.restart.lock().await;
            policy.wanted = status.owned;
            policy.port = Some(port);
            *self.failure.lock().await = None;
        } else if let Err(error) = &result {
            self.log(
                tagma_core::diagnostics::Event::StartFailed,
                Some(error.code.clone()),
                None,
            );
            *self.failure.lock().await = Some(error.clone());
        }
        result
    }

    async fn start_once(&self, port: u16, automatic: bool) -> AppResult<RuntimeStatus> {
        let _operation = self.operation.lock().await;
        struct Starting<'a>(&'a AtomicBool);
        impl Drop for Starting<'_> {
            fn drop(&mut self) {
                self.0.store(false, Ordering::SeqCst);
            }
        }
        self.starting.store(true, Ordering::SeqCst);
        let _starting = Starting(&self.starting);
        if automatic && !self.restart.lock().await.wanted {
            return Err(AppError::new(ErrorCode::OwnershipRequired));
        }
        if port == 0 {
            return Err(AppError::new(ErrorCode::InvalidInput));
        }
        if ipc::has_active_instance(&self.directory)? {
            let manifest = ipc::read_manifest(&self.directory)?;
            match ipc::call(&manifest, Control::Status).await {
                Ok(_) => return Ok(self.status().await),
                Err(e) if e.code == ErrorCode::IncompatibleVersion => return Err(e),
                Err(_) => {}
            }
        }
        let token = zeroize::Zeroizing::new(uuid::Uuid::new_v4().to_string());
        let expected_instance = uuid::Uuid::new_v4().to_string();
        let mut command = Command::new(&self.binary);
        command
            .args(["--config-dir"])
            .arg(&self.directory)
            .args(["--port", &port.to_string(), "--managed"])
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .kill_on_drop(true);
        #[cfg(windows)]
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW: sidecar has no console UI.
        let mut child = command
            .spawn()
            .map_err(|_| AppError::new(ErrorCode::GatewayUnavailable))?;
        let mut stdin = child
            .stdin
            .take()
            .ok_or_else(|| AppError::new(ErrorCode::InternalError))?;
        let mut bootstrap = zeroize::Zeroizing::new(
            serde_json::to_vec(&Bootstrap {
                owner_token: token.to_string(),
                instance_id: expected_instance.clone(),
            })
            .map_err(|_| AppError::new(ErrorCode::InternalError))?,
        );
        bootstrap.push(b'\n');
        stdin
            .write_all(&bootstrap)
            .await
            .map_err(|_| AppError::new(ErrorCode::GatewayUnavailable))?;
        let limit = tokio::time::Instant::now() + Duration::from_secs(10);
        loop {
            if let Ok(manifest) = ipc::read_manifest(&self.directory)
                && let Ok(mut status) = ipc::call(&manifest, Control::Status).await
            {
                // A simultaneous starter may win. Only our own child can acknowledge our stop token.
                if manifest.instance_id == expected_instance
                    && child
                        .try_wait()
                        .map_err(|_| AppError::new(ErrorCode::GatewayUnavailable))?
                        .is_none()
                {
                    status.owned = true;
                    *self.owned.lock().await = Some(Owned {
                        child,
                        _parent_lifetime: stdin,
                        token,
                        instance: manifest.instance_id,
                    });
                }
                return Ok(status);
            }
            if let Some(exit) = child
                .try_wait()
                .map_err(|_| AppError::new(ErrorCode::GatewayUnavailable))?
            {
                return Err(AppError::new(match exit.code() {
                    Some(11) => ErrorCode::PortInUse,
                    Some(12) => ErrorCode::ConfigApplyFailed,
                    Some(13) => ErrorCode::IncompatibleVersion,
                    Some(10) => ErrorCode::AlreadyRunning,
                    _ => ErrorCode::GatewayUnavailable,
                }));
            }
            if tokio::time::Instant::now() >= limit {
                let _ = child.kill().await;
                return Err(AppError::new(ErrorCode::StartupTimeout));
            }
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
    }

    pub async fn apply(&self) -> AppResult<RuntimeStatus> {
        let manifest = ipc::read_manifest(&self.directory)?;
        let mut status = ipc::call(&manifest, Control::Apply).await?;
        status.owned = self
            .owned
            .lock()
            .await
            .as_ref()
            .is_some_and(|o| o.instance == manifest.instance_id);
        Ok(status)
    }

    pub async fn stop(&self) -> AppResult<RuntimeStatus> {
        let _operation = self.operation.lock().await;
        self.restart.lock().await.wanted = false;
        let mut owned = self.owned.lock().await;
        let instance = owned
            .as_mut()
            .ok_or_else(|| AppError::new(ErrorCode::OwnershipRequired))?;
        self.log(tagma_core::diagnostics::Event::StopRequested, None, None);
        let manifest = ipc::read_manifest(&self.directory)?;
        if manifest.instance_id != instance.instance {
            return Err(AppError::new(ErrorCode::OwnershipRequired));
        }
        let status = ipc::call(
            &manifest,
            Control::Stop {
                owner_token: instance.token.to_string(),
            },
        )
        .await?;
        if let Some(error) = status.error {
            return Err(error);
        }
        match tokio::time::timeout(Duration::from_secs(10), instance.child.wait()).await {
            Ok(Ok(_)) => {}
            Ok(Err(_)) => return Err(AppError::new(ErrorCode::GatewayUnavailable)),
            Err(_) => {
                instance
                    .child
                    .kill()
                    .await
                    .map_err(|_| AppError::new(ErrorCode::GatewayUnavailable))?;
            }
        }
        *owned = None;
        *self.failure.lock().await = None;
        self.log(tagma_core::diagnostics::Event::Stopped, None, None);
        Ok(Self::unavailable(RuntimeState::Stopped, None))
    }

    pub async fn owned_process_id(&self) -> Option<u32> {
        self.owned.lock().await.as_ref().and_then(|o| o.child.id())
    }

    /// Called by the owning host, never by a detached CLI client. Maximum three restarts / five minutes.
    pub async fn supervise(&self) {
        let status = self.status().await;
        if !matches!(status.state, RuntimeState::Failed) {
            return;
        }
        let port = {
            let mut policy = self.restart.lock().await;
            if !policy.wanted {
                return;
            }
            let now = tokio::time::Instant::now();
            while policy
                .attempts
                .front()
                .is_some_and(|t| now.duration_since(*t) > Duration::from_secs(300))
            {
                policy.attempts.pop_front();
            }
            if policy.attempts.len() >= 3 {
                policy.wanted = false;
                self.log(
                    tagma_core::diagnostics::Event::RestartExhausted,
                    Some(ErrorCode::GatewayUnavailable),
                    None,
                );
                return;
            }
            if policy.next.is_none_or(|deadline| now < deadline) {
                return;
            }
            policy.attempts.push_back(now);
            policy.next = None;
            policy.port.unwrap_or(ipc::DEFAULT_PORT)
        };
        self.log(tagma_core::diagnostics::Event::RestartAttempt, None, None);
        match self.start_once(port, true).await {
            Ok(status) => {
                *self.failure.lock().await = None;
                if !status.owned {
                    self.restart.lock().await.wanted = false;
                }
            }
            Err(error) => {
                let mut policy = self.restart.lock().await;
                if matches!(
                    error.code,
                    ErrorCode::GatewayUnavailable | ErrorCode::StartupTimeout
                ) {
                    policy.next = Some(
                        tokio::time::Instant::now()
                            + Duration::from_secs(1 << policy.attempts.len().min(2)),
                    );
                } else {
                    policy.wanted = false;
                }
                *self.failure.lock().await = Some(error);
            }
        }
    }

    fn log(
        &self,
        event: tagma_core::diagnostics::Event,
        code: Option<ErrorCode>,
        revision: Option<u32>,
    ) {
        let result = tagma_core::diagnostics::record(
            &self.directory,
            tagma_core::diagnostics::Component::Desktop,
            event,
            code,
            revision,
        );
        self.logging_available
            .store(result.is_ok(), Ordering::SeqCst);
    }
    pub fn logging_available(&self) -> bool {
        self.logging_available.load(Ordering::SeqCst)
    }
}
