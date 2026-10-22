use fs2::FileExt;
use std::{
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::{
        Mutex,
        atomic::{AtomicBool, Ordering},
    },
    time::Duration,
};
use tagma_core::{ConfigService, ConfigView, packs::*};
use tagma_runtime::{
    pack_install::{InstallPhase, PackInstaller},
    packs::{PackOperation, PackReplyBody},
};
use tauri::ipc::Channel;
use tokio_util::sync::CancellationToken;
type Result<T> = std::result::Result<T, PackUiError>;
fn error(code: impl ToString) -> PackUiError {
    PackUiError {
        code: code.to_string(),
    }
}
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct ReleaseRoot {
    key_id: String,
    publisher: String,
    public_key: [u8; 32],
    valid_from_ms: u64,
    valid_until_ms: u64,
}
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct InternalPack {
    root: ReleaseRoot,
    #[serde(default)]
    previous_roots: Vec<ReleaseRoot>,
    record: SignedManifestRecord,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct Journal {
    owner: String,
    task: PackTaskEvent,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct PinJournal {
    owner: String,
    task_id: String,
    pack_id: String,
    pack_version: String,
    preparation_id: String,
}
pub struct PackBridge {
    installer: PackInstaller,
    active: Mutex<Option<(String, CancellationToken)>>,
    last: Mutex<Option<PackTaskEvent>>,
    closing: AtomicBool,
    journal: PathBuf,
    pin_journal: PathBuf,
    release_ready: bool,
    internal_record: Option<SignedManifestRecord>,
    internal_hash: Option<String>,
    _lease: std::fs::File,
    directory: PathBuf,
}
impl PackBridge {
    pub fn new(directory: &Path, config: &ConfigService) -> Result<Self> {
        let parent = directory.join("packs");
        let temp = parent.join("downloads");
        let preparations = parent.join("versions");
        for path in [&parent, &temp, &preparations] {
            if !path.exists() {
                std::fs::create_dir(path).map_err(|_| error("PACK_STORAGE_UNAVAILABLE"))?;
            }
            let m =
                std::fs::symlink_metadata(path).map_err(|_| error("PACK_STORAGE_UNAVAILABLE"))?;
            if !m.is_dir() || m.file_type().is_symlink() {
                return Err(error("PACK_STORAGE_UNAVAILABLE"));
            }
            #[cfg(windows)]
            {
                use std::os::windows::fs::MetadataExt;
                if m.file_attributes() & 0x400 != 0 {
                    return Err(error("PACK_STORAGE_UNAVAILABLE"));
                }
            }
        }
        let lock_path = parent.join("host.lock");
        if lock_path.exists() {
            ordinary_file(&lock_path)?;
        }
        let lease = std::fs::OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(lock_path)
            .map_err(|_| error("PACK_STORAGE_UNAVAILABLE"))?;
        lease.try_lock_exclusive().map_err(|_| error("PACK_BUSY"))?;
        let mut roots: Vec<ReleaseRoot> = serde_json::from_str(include_str!("../pack-roots.json"))
            .map_err(|_| error("PACK_RELEASE_POLICY_INVALID"))?;
        let release_ready = !roots.is_empty();
        // A compile-time signed development bundle is available only in the
        // explicitly isolated debug instance. No runtime key import/bypass.
        let internal: Option<InternalPack> = if cfg!(debug_assertions)
            && std::env::var_os("TAGMA_TEST_CONFIG_DIR")
                .map(PathBuf::from)
                .as_deref()
                == Some(directory)
        {
            serde_json::from_str(include_str!(concat!(
                env!("OUT_DIR"),
                "/internal-pack.json"
            )))
            .map_err(|_| error("PACK_RELEASE_POLICY_INVALID"))?
        } else {
            None
        };
        let internal_record = internal.map(|bundle| {
            roots.extend(bundle.previous_roots);
            roots.push(bundle.root);
            bundle.record
        });
        let trust = PackTrustStore::new(
            roots
                .into_iter()
                .map(|r| PackTrustRoot {
                    key_id: r.key_id,
                    publisher: r.publisher,
                    public_key: r.public_key,
                    valid_from_ms: r.valid_from_ms,
                    valid_until_ms: r.valid_until_ms,
                })
                .collect(),
        )
        .map_err(error)?;
        let internal_hash = internal_record
            .as_ref()
            .map(|record| {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map_err(|_| error("PACK_RELEASE_POLICY_INVALID"))?
                    .as_millis() as u64;
                trust
                    .verify_record(record, now)
                    .map(|proof| proof.sha256().to_owned())
                    .map_err(error)
            })
            .transpose()?;
        let os = match std::env::consts::OS {
            "windows" => PackOs::Windows,
            "macos" => PackOs::Macos,
            "linux" => PackOs::Linux,
            _ => return Err(error("PACK_UNSUPPORTED_PLATFORM")),
        };
        let arch = match std::env::consts::ARCH {
            "x86_64" => PackArch::X86_64,
            "aarch64" => PackArch::Aarch64,
            _ => return Err(error("PACK_UNSUPPORTED_PLATFORM")),
        };
        let journal = parent.join("last-task.json");
        let pin_journal = parent.join("last-task-pin.json");
        let last = if journal.exists() {
            ordinary_file(&journal)?;
            let mut bytes = Vec::new();
            std::fs::File::open(&journal)
                .map_err(|_| error("PACK_STORAGE_UNAVAILABLE"))?
                .take(4097)
                .read_to_end(&mut bytes)
                .map_err(|_| error("PACK_STORAGE_UNAVAILABLE"))?;
            if bytes.len() > 4096 {
                return Err(error("PACK_STORAGE_UNAVAILABLE"));
            }
            let record: Journal =
                serde_json::from_slice(&bytes).map_err(|_| error("PACK_STORAGE_UNAVAILABLE"))?;
            if record.owner != "TagmaPackTaskV1"
                || uuid::Uuid::parse_str(&record.task.task_id).is_err()
                || !matches!(
                    record.task.state.as_str(),
                    "running" | "cancelling" | "interrupted" | "succeeded" | "failed" | "cancelled"
                )
                || !valid_task_pin(&record.task)
            {
                return Err(error("PACK_STORAGE_UNAVAILABLE"));
            }
            let mut task = record.task;
            task.text = None;
            if task.state == "running" || task.state == "cancelling" {
                task.state = "interrupted".into();
                task.error = Some("PACK_INTERRUPTED".into());
            }
            Some(task)
        } else {
            None
        };
        let mut last = last;
        if let Some(task) = last.as_mut() {
            if pin_journal.exists() {
                ordinary_file(&pin_journal)?;
                let mut bytes = Vec::new();
                std::fs::File::open(&pin_journal)
                    .map_err(|_| error("PACK_STORAGE_UNAVAILABLE"))?
                    .take(1025)
                    .read_to_end(&mut bytes)
                    .map_err(|_| error("PACK_STORAGE_UNAVAILABLE"))?;
                if bytes.len() > 1024 {
                    return Err(error("PACK_STORAGE_UNAVAILABLE"));
                }
                let pin: PinJournal =
                    serde_json::from_slice(&bytes).map_err(|_| error("PACK_STORAGE_UNAVAILABLE"))?;
                if pin.owner != "TagmaPackTaskPinV1"
                    || !uuid::Uuid::parse_str(&pin.task_id)
                        .is_ok_and(|value| !value.is_nil() && value.to_string() == pin.task_id)
                {
                    return Err(error("PACK_STORAGE_UNAVAILABLE"));
                }
                // A new task may have pinned its version just before a crash,
                // before replacing the old compatible task journal.
                if pin.task_id == task.task_id {
                    task.pack_id = Some(pin.pack_id);
                    task.pack_version = Some(pin.pack_version);
                    task.preparation_id = Some(pin.preparation_id);
                    if !valid_task_pin(task) {
                        return Err(error("PACK_STORAGE_UNAVAILABLE"));
                    }
                }
            }
        }
        Ok(Self {
            installer: PackInstaller::new(
                config
                    .configuration_id()
                    .map_err(|_| error("PACK_UNAVAILABLE"))?,
                &preparations,
                &temp,
                PackTarget { os, arch },
                std::sync::Arc::new(trust),
            )
            .map_err(error)?,
            active: Mutex::new(None),
            last: Mutex::new(last),
            closing: AtomicBool::new(false),
            journal,
            pin_journal,
            release_ready,
            internal_record,
            internal_hash,
            _lease: lease,
            directory: directory.to_owned(),
        })
    }
    pub fn view(&self) -> Result<PackMarketView> {
        let status = self.installer.executor().removal_status(&self.directory).map_err(error)?;
        Ok(PackMarketView {
            gateway_running: status.gateway_running,
            pack_call_running: status.pack_call_running,
            pending_removal: status.pending_pack,
            release_ready: self.release_ready,
            internal_manifest: self
                .internal_record
                .as_ref()
                .map(serde_json::to_string)
                .transpose()
                .map_err(|_| error("PACK_RELEASE_POLICY_INVALID"))?,
            task: self
                .last
                .lock()
                .map_err(|_| error("PACK_UNAVAILABLE"))?
                .clone(),
        })
    }
    pub fn review(&self, config: &ConfigService, record: &str) -> Result<PackReviewView> {
        self.no_pending_removal()?;
        let record = SignedManifestRecord::parse(record.as_bytes()).map_err(error)?;
        let review = self.installer.review(config, record).map_err(error)?;
        let a = review
            .manifest
            .artifacts
            .iter()
            .find(|a| a.target == review.target)
            .ok_or_else(|| error("PACK_UNSUPPORTED_PLATFORM"))?;
        let publisher = match &review.manifest.source {
            PackSource::Official { publisher } | PackSource::Community { publisher } => {
                publisher.clone()
            }
        };
        Ok(PackReviewView {
            review_id: review.review_id.to_string(),
            manifest_sha256: review.manifest_sha256,
            pack_id: review.manifest.id.clone(),
            version: review.manifest.version.clone(),
            publisher,
            platform: format!("{:?} / {:?}", review.target.os, review.target.arch),
            network_hosts: a.permissions.network_hosts.clone(),
            workspace: format!("{:?}", a.permissions.workspace),
            browser: a.permissions.browser,
            subprocess: a.permissions.subprocess,
            memory_mib: a.resources.memory_mib,
            timeout_ms: a.resources.task_timeout_ms,
            download_bytes: review.space.download_bytes.to_string(),
            unpack_bytes: review.space.staged_unpack_bytes.to_string(),
            peak_bytes: review.space.logical_peak_bytes.to_string(),
            target_shortfall_bytes: review.space.target_shortfall_bytes.to_string(),
            temp_shortfall_bytes: review.space.temp_shortfall_bytes.to_string(),
            fits: review.space.fits(),
        })
    }
    fn begin(&self, id: &str) -> Result<CancellationToken> {
        let mut active = self.active.lock().map_err(|_| error("PACK_UNAVAILABLE"))?;
        if self.closing.load(Ordering::SeqCst)
            || !uuid::Uuid::parse_str(id).is_ok_and(|id| !id.is_nil())
        {
            return Err(error("PACK_BUSY"));
        }
        if active.is_some() {
            return Err(error("PACK_BUSY"));
        }
        let token = CancellationToken::new();
        *active = Some((id.into(), token.clone()));
        Ok(token)
    }
    fn event(&self, channel: &Channel<PackTaskEvent>, task: PackTaskEvent) -> Result<()> {
        self.persist(&task)?;
        *self.last.lock().map_err(|_| error("PACK_UNAVAILABLE"))? = Some(task.clone());
        if channel.send(task).is_err()
            && let Ok(active) = self.active.lock()
            && let Some((_, token)) = &*active
        {
            token.cancel()
        }
        Ok(())
    }
    pub fn cancel(&self, id: &str) -> Result<()> {
        let active = self.active.lock().map_err(|_| error("PACK_UNAVAILABLE"))?;
        if let Some((owned, token)) = &*active {
            if owned != id {
                return Err(error("PACK_UNAVAILABLE"));
            }
            token.cancel();
        }
        Ok(())
    }
    fn persist(&self, task: &PackTaskEvent) -> Result<()> {
        if !valid_task_pin(task) {
            return Err(error("PACK_STORAGE_UNAVAILABLE"));
        }
        if let (Some(pack_id), Some(pack_version), Some(preparation_id)) = (
            task.pack_id.as_ref(),
            task.pack_version.as_ref(),
            task.preparation_id.as_ref(),
        ) {
            // This is written before the V1 journal. Older installed candidates
            // ignore the sidecar and can still reopen the exact V1 journal.
            let bytes = serde_json::to_vec(&PinJournal {
                owner: "TagmaPackTaskPinV1".into(),
                task_id: task.task_id.clone(),
                pack_id: pack_id.clone(),
                pack_version: pack_version.clone(),
                preparation_id: preparation_id.clone(),
            })
            .map_err(|_| error("PACK_STORAGE_UNAVAILABLE"))?;
            if bytes.len() > 1024 {
                return Err(error("PACK_STORAGE_UNAVAILABLE"));
            }
            write_owned_journal(&self.pin_journal, ".pack-pin-", &bytes)?;
        }
        let mut task = task.clone();
        task.text = None;
        let mut record = serde_json::to_value(&Journal {
            owner: "TagmaPackTaskV1".into(),
            task,
        })
        .map_err(|_| error("PACK_STORAGE_UNAVAILABLE"))?;
        let fields = record
            .get_mut("task")
            .and_then(serde_json::Value::as_object_mut)
            .ok_or_else(|| error("PACK_STORAGE_UNAVAILABLE"))?;
        // The original journal schema is unchanged for rollback to R9.
        for key in ["pack_id", "pack_version", "preparation_id"] {
            fields.remove(key);
        }
        let bytes = serde_json::to_vec(&record).map_err(|_| error("PACK_STORAGE_UNAVAILABLE"))?;
        if bytes.len() > 4096 {
            return Err(error("PACK_STORAGE_UNAVAILABLE"));
        }
        write_owned_journal(&self.journal, ".pack-task-", &bytes)
    }
    pub fn resume_after_failed_quit(&self) {
        self.closing.store(false, Ordering::SeqCst);
    }
    pub async fn install(
        &self,
        config: &ConfigService,
        input: ConfirmPackInstall,
        channel: Channel<PackTaskEvent>,
    ) -> Result<ConfigView> {
        self.no_pending_removal()?;
        let cancel = self.begin(&input.task_id)?;
        let _guard = Guard { bridge: self };
        self.event(
            &channel,
            event(&input.task_id, "starting", "running", None, None),
        )?;
        let review_id =
            uuid::Uuid::parse_str(&input.review_id).map_err(|_| error("PACK_REVIEW_EXPIRED"))?;
        let phases = |phase| {
            let phase = match phase {
                InstallPhase::Download => "download",
                InstallPhase::VerifyAndPrepare => "verify",
                InstallPhase::HealthCheck => "health",
                InstallPhase::Activated => "activated",
            };
            if self
                .event(
                    &channel,
                    event(&input.task_id, phase, "running", None, None),
                )
                .is_err()
            {
                cancel.cancel();
            }
        };
        let result = if self.internal_hash.as_deref() == Some(&input.manifest_sha256) {
            self.installer
                .install_archive(
                    config,
                    review_id,
                    &input.manifest_sha256,
                    cancel.clone(),
                    phases,
                    std::sync::Arc::from(
                        &include_bytes!(concat!(env!("OUT_DIR"), "/internal-pack.zip"))[..],
                    ),
                )
                .await
        } else {
            self.installer
                .install(
                    config,
                    review_id,
                    &input.manifest_sha256,
                    cancel.clone(),
                    phases,
                )
                .await
        }
        .map_err(error);
        self.finish(
            &channel,
            &input.task_id,
            &result.as_ref().map(|_| None).map_err(|e| e.code.clone()),
        )?;
        result
    }
    pub async fn manage(
        &self,
        config: &ConfigService,
        input: ManagePack,
        channel: Channel<PackTaskEvent>,
    ) -> Result<ConfigView> {
        self.no_pending_removal()?;
        let cancel = self.begin(&input.task_id)?;
        let _guard = Guard { bridge: self };
        self.event(
            &channel,
            event(
                &input.task_id,
                if input.version.is_some() {
                    "health"
                } else {
                    "deactivating"
                },
                "running",
                None,
                None,
            ),
        )?;
        let result = async {
            let (revision, snapshot) = config
                .read_snapshot()
                .map_err(|_| error("PACK_UNAVAILABLE"))?;
            if revision != input.expected_revision {
                return Err(error("CONFIG_CONFLICT"));
            }
            let pack = snapshot
                .installed_packs
                .iter()
                .find(|pack| pack.id == input.pack_id)
                .ok_or_else(|| error("PACK_UNAVAILABLE"))?;
            match input.version.as_deref() {
                Some(version) => {
                    let version = pack
                        .versions
                        .iter()
                        .find(|item| item.version == version)
                        .ok_or_else(|| error("PACK_UNAVAILABLE"))?;
                    self.installer
                        .executor()
                        .activate(
                            config,
                            revision,
                            uuid::Uuid::parse_str(&version.preparation_id)
                                .map_err(|_| error("PACK_UNAVAILABLE"))?,
                            &version.manifest_sha256,
                            cancel,
                        )
                        .await
                        .map_err(error)
                }
                None => config
                    .deactivate_pack(revision, &input.pack_id)
                    .map_err(|err| {
                        error(if err.code == tagma_core::ErrorCode::ConfigConflict {
                            "CONFIG_CONFLICT"
                        } else {
                            "PACK_UNAVAILABLE"
                        })
                    }),
            }
        }
        .await;
        self.finish(
            &channel,
            &input.task_id,
            &result
                .as_ref()
                .map(|_| None)
                .map_err(|err| err.code.clone()),
        )?;
        result
    }
    pub async fn call(
        &self,
        config: &ConfigService,
        input: InvokePack,
        channel: Channel<PackTaskEvent>,
    ) -> Result<()> {
        self.no_pending_removal()?;
        let cancel = self.begin(&input.task_id)?;
        let _guard = Guard { bridge: self };
        self.event(
            &channel,
            event(&input.task_id, "starting", "running", None, None),
        )?;
        // The version is pinned before the invocation is announced as running.
        // This survives an active-version switch and is journaled across restart.
        let pinned = match self.installer.executor().pin_active(config, &input.pack_id) {
            Ok(version) => version,
            Err(failure) => {
                let code = failure.to_string();
                self.finish(&channel, &input.task_id, &Err(code.clone()))?;
                return Err(error(code));
            }
        };
        self.event(
            &channel,
            PackTaskEvent {
                pack_id: Some(input.pack_id.clone()),
                pack_version: Some(pinned.version.clone()),
                preparation_id: Some(pinned.preparation_id.clone()),
                ..event(&input.task_id, "calling", "running", None, None)
            },
        )?;
        let operation = match input.operation {
            PackUserOperation::LocalSample => PackOperation::LocalSample {
                text: tagma_runtime::reachflow::LOCAL_SAMPLE.into(),
            },
            PackUserOperation::ReachFlow { request } => PackOperation::ReachFlow { request },
        };
        let result = self
            .installer
            .executor()
            .call_pinned(&input.pack_id, &pinned, operation, cancel)
            .await
            .map_err(|e| e.to_string())
            .and_then(|reply| match reply.body {
                PackReplyBody::Result { text } => Ok(Some(text)),
                _ => Err("PACK_PROTOCOL_ERROR".into()),
            });
        self.finish(&channel, &input.task_id, &result)?;
        result.map(|_| ()).map_err(error)
    }
    fn no_pending_removal(&self) -> Result<()> {
        if self.installer.executor().removal_pending().map_err(error)? {
            return Err(error("PACK_REMOVAL_PENDING"));
        }
        Ok(())
    }
    pub fn uninstall(&self, config: &ConfigService, input: UninstallPack, channel: Channel<PackTaskEvent>) -> Result<ConfigView> {
        let cancel = self.begin(&input.task_id)?;
        let _guard = Guard { bridge: self };
        self.event(&channel, event(&input.task_id, "removing", "running", None, None))?;
        let result=self.installer.executor().uninstall(&self.directory,config,input.expected_revision,&input.pack_id,cancel).map_err(error);
        self.finish(&channel,&input.task_id,&result.as_ref().map(|_|None).map_err(|e|e.code.clone()))?;
        result
    }
    fn finish(
        &self,
        channel: &Channel<PackTaskEvent>,
        id: &str,
        result: &std::result::Result<Option<String>, String>,
    ) -> Result<()> {
        let mut terminal = match result {
            Ok(text) => event(id, "finished", "succeeded", text.clone(), None),
            Err(code) => event(
                id,
                "finished",
                if code == "PACK_CANCELLED" {
                    "cancelled"
                } else {
                    "failed"
                },
                None,
                Some(code.clone()),
            ),
        };
        if let Some(pinned) = self
            .last
            .lock()
            .map_err(|_| error("PACK_UNAVAILABLE"))?
            .as_ref()
            .filter(|task| task.task_id == id)
        {
            terminal.pack_id.clone_from(&pinned.pack_id);
            terminal.pack_version.clone_from(&pinned.pack_version);
            terminal.preparation_id.clone_from(&pinned.preparation_id);
        }
        self.event(channel, terminal)
    }
    pub async fn shutdown(&self) -> Result<()> {
        self.closing.store(true, Ordering::SeqCst);
        if let Some((_, token)) = &*self.active.lock().map_err(|_| error("PACK_UNAVAILABLE"))? {
            token.cancel();
        }
        let wait = async {
            loop {
                if self
                    .active
                    .lock()
                    .map_err(|_| error("PACK_UNAVAILABLE"))?
                    .is_none()
                {
                    return Ok(());
                }
                tokio::time::sleep(Duration::from_millis(25)).await;
            }
        };
        match tokio::time::timeout(Duration::from_secs(15), wait).await {
            Ok(result) => result,
            Err(_) => {
                self.closing.store(false, Ordering::SeqCst);
                Err(error("PACK_STOP_UNCONFIRMED"))
            }
        }
    }
}
fn event(
    id: &str,
    phase: &str,
    state: &str,
    text: Option<String>,
    error: Option<String>,
) -> PackTaskEvent {
    PackTaskEvent {
        task_id: id.into(),
        phase: phase.into(),
        state: state.into(),
        text,
        error,
        pack_id: None,
        pack_version: None,
        preparation_id: None,
    }
}
struct Guard<'a> {
    bridge: &'a PackBridge,
}
impl Drop for Guard<'_> {
    fn drop(&mut self) {
        if let Ok(mut last) = self.bridge.last.lock()
            && let Some(task) = last.as_mut()
            && task.state == "running"
        {
            task.state = "interrupted".into();
            task.error = Some("PACK_INTERRUPTED".into());
            let _ = self.bridge.persist(task);
        }
        if let Ok(mut active) = self.bridge.active.lock() {
            *active = None;
        }
    }
}
fn write_owned_journal(path: &Path, prefix: &str, bytes: &[u8]) -> Result<()> {
    if path.exists() {
        ordinary_file(path)?;
    }
    let mut file = tempfile::Builder::new()
        .prefix(prefix)
        .tempfile_in(
            path.parent()
                .ok_or_else(|| error("PACK_STORAGE_UNAVAILABLE"))?,
        )
        .map_err(|_| error("PACK_STORAGE_UNAVAILABLE"))?;
    file.write_all(bytes)
        .and_then(|_| file.as_file().sync_all())
        .map_err(|_| error("PACK_STORAGE_UNAVAILABLE"))?;
    file.persist(path).map_err(|_| error("PACK_STORAGE_UNAVAILABLE"))?;
    Ok(())
}
fn valid_task_pin(task: &PackTaskEvent) -> bool {
    match (
        task.pack_id.as_deref(),
        task.pack_version.as_deref(),
        task.preparation_id.as_deref(),
    ) {
        (None, None, None) => true,
        (Some(id), Some(version), Some(preparation)) => {
            !id.is_empty()
                && id.len() <= 128
                && id.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'-')
                && !version.is_empty()
                && version.len() <= 80
                && version
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || b".+-".contains(&byte))
                && uuid::Uuid::parse_str(preparation)
                    .is_ok_and(|value| !value.is_nil() && value.to_string() == preparation)
        }
        _ => false,
    }
}
fn ordinary_file(path: &Path) -> Result<()> {
    let m = std::fs::symlink_metadata(path).map_err(|_| error("PACK_STORAGE_UNAVAILABLE"))?;
    if !m.is_file() || m.file_type().is_symlink() {
        return Err(error("PACK_STORAGE_UNAVAILABLE"));
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if m.file_attributes() & 0x400 != 0 {
            return Err(error("PACK_STORAGE_UNAVAILABLE"));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    struct NoCredentials;
    impl tagma_core::credentials::CredentialStore for NoCredentials {
        fn set(&self, _: &str, _: &str) -> tagma_core::AppResult<()> {
            panic!("no credential access")
        }
        fn get(&self, _: &str) -> tagma_core::AppResult<zeroize::Zeroizing<String>> {
            panic!("no credential access")
        }
        fn delete(&self, _: &str) -> tagma_core::AppResult<()> {
            panic!("no credential access")
        }
    }
    #[test]
    fn interrupted_task_recovers_without_prompt_or_result_persistence() {
        let root = tempfile::Builder::new()
            .prefix("tagma-pack-bridge-")
            .tempdir()
            .unwrap();
        let config = ConfigService::open(root.path(), std::sync::Arc::new(NoCredentials)).unwrap();
        let bridge = PackBridge::new(root.path(), &config).unwrap();
        assert!(!bridge.view().unwrap().release_ready);
        assert!(bridge.view().unwrap().internal_manifest.is_none());
        assert!(PackBridge::new(root.path(), &config).is_err());
        let untrusted = serde_json::json!({
            "record_version": 1,
            "key_id": "untrusted-fixture",
            "manifest_utf8": "{}",
            "signature_hex": "0".repeat(128),
        });
        assert_eq!(
            bridge
                .review(&config, &untrusted.to_string())
                .unwrap_err()
                .code,
            "PACK_UNTRUSTED_PUBLISHER"
        );
        let id = uuid::Uuid::new_v4().to_string();
        let preparation = uuid::Uuid::new_v4().to_string();
        let pinned = PackTaskEvent {
            pack_id: Some("reachflow".into()),
            pack_version: Some("0.2.0-dev.44".into()),
            preparation_id: Some(preparation.clone()),
            ..event(
                &id,
                "calling",
                "running",
                Some("do not persist synthetic content".into()),
                None,
            )
        };
        assert!(valid_task_pin(&pinned));
        bridge.persist(&pinned).unwrap();
        let raw = std::fs::read_to_string(&bridge.journal).unwrap();
        assert!(!raw.contains("synthetic content"));
        let compatible: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(compatible["owner"], "TagmaPackTaskV1");
        assert_eq!(compatible["task"].as_object().unwrap().len(), 5);
        assert!(!raw.contains("pack_version"));
        let sidecar = std::fs::read_to_string(&bridge.pin_journal).unwrap();
        assert!(sidecar.contains("0.2.0-dev.44"));
        assert!(!sidecar.contains("synthetic content"));
        drop(bridge);
        let reopened = PackBridge::new(root.path(), &config).unwrap();
        let task = reopened.view().unwrap().task.unwrap();
        assert_eq!(task.task_id, id);
        assert_eq!(task.state, "interrupted");
        assert_eq!(task.error.as_deref(), Some("PACK_INTERRUPTED"));
        assert!(task.text.is_none());
        assert_eq!(task.pack_id.as_deref(), Some("reachflow"));
        assert_eq!(task.pack_version.as_deref(), Some("0.2.0-dev.44"));
        assert_eq!(task.preparation_id.as_deref(), Some(preparation.as_str()));
        // Existing journals without version fields continue to load without
        // pretending they contain a pinned version.
        let legacy: PackTaskEvent = serde_json::from_str(&format!(
            r#"{{"task_id":"{id}","phase":"calling","state":"running","text":null,"error":null}}"#
        )).unwrap();
        assert!(valid_task_pin(&legacy));
        assert!(legacy.pack_version.is_none());
        let invalid = PackTaskEvent { preparation_id: None, ..pinned };
        assert!(!valid_task_pin(&invalid));
        assert_eq!(config.view().unwrap().desired_revision, 0);
        assert!(config.view().unwrap().installed_packs.is_empty());
    }
    #[tokio::test]
    async fn busy_owned_cancellation_and_shutdown_do_not_admit_another_operation() {
        let root = tempfile::Builder::new()
            .prefix("tagma-pack-bridge-")
            .tempdir()
            .unwrap();
        let config = ConfigService::open(root.path(), std::sync::Arc::new(NoCredentials)).unwrap();
        let bridge = PackBridge::new(root.path(), &config).unwrap();
        let id = uuid::Uuid::new_v4().to_string();
        let token = bridge.begin(&id).unwrap();
        assert_eq!(
            bridge
                .begin(&uuid::Uuid::new_v4().to_string())
                .unwrap_err()
                .code,
            "PACK_BUSY"
        );
        assert!(bridge.cancel("another-task").is_err());
        assert!(!token.is_cancelled());
        bridge.cancel(&id).unwrap();
        assert!(token.is_cancelled());
        let guard = Guard { bridge: &bridge };
        drop(guard);
        bridge.shutdown().await.unwrap();
        assert!(bridge.begin(&uuid::Uuid::new_v4().to_string()).is_err());
        bridge.resume_after_failed_quit();
        assert!(bridge.begin(&uuid::Uuid::new_v4().to_string()).is_ok());
        let guard = Guard { bridge: &bridge };
        drop(guard);
    }
}
