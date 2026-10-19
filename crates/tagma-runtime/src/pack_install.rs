//! Host-owned review -> explicit approval -> download -> prepare -> health -> activate.
//! The release policy supplies trusted roots. Downloads cannot introduce roots.
use crate::packs::{PackExecutor, PackRunError};
use futures_util::StreamExt;
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use tagma_core::{ConfigService, ConfigView, packs::*};
use tokio::sync::Semaphore;
use tokio_util::sync::CancellationToken;
use uuid::Uuid;

#[derive(Debug)]
pub enum InstallError {
    Admission(PackError),
    Execution(PackRunError),
    ReviewExpired,
    ApprovalChanged,
    Busy,
    Cancelled,
    ConfigurationConflict,
    SpaceUnavailable,
    DownloadFailed,
    Unavailable,
}
impl From<PackError> for InstallError {
    fn from(e: PackError) -> Self {
        Self::Admission(e)
    }
}
impl From<PackRunError> for InstallError {
    fn from(e: PackRunError) -> Self {
        Self::Execution(e)
    }
}
impl std::fmt::Display for InstallError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Admission(e) => e.fmt(f),
            Self::Execution(e) => e.fmt(f),
            Self::ReviewExpired => f.write_str("PACK_REVIEW_EXPIRED"),
            Self::ApprovalChanged => f.write_str("PACK_APPROVAL_CHANGED"),
            Self::Busy => f.write_str("PACK_BUSY"),
            Self::Cancelled => f.write_str("PACK_CANCELLED"),
            Self::ConfigurationConflict => f.write_str("CONFIG_CONFLICT"),
            Self::SpaceUnavailable => f.write_str("PACK_SPACE_UNAVAILABLE"),
            Self::DownloadFailed => f.write_str("PACK_DOWNLOAD_FAILED"),
            Self::Unavailable => f.write_str("PACK_UNAVAILABLE"),
        }
    }
}
impl std::error::Error for InstallError {}
type Result<T> = std::result::Result<T, InstallError>;

/// Trusted projection for the approval surface. Display all fields before confirm.
#[derive(Clone)]
pub struct InstallReview {
    pub review_id: Uuid,
    pub expected_revision: u32,
    pub manifest_sha256: String,
    pub manifest: PackManifest,
    pub target: PackTarget,
    pub space: PackSpacePlan,
}
struct PendingReview {
    view: InstallReview,
    record: SignedManifestRecord,
    created: Instant,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InstallPhase {
    Download,
    VerifyAndPrepare,
    HealthCheck,
    Activated,
}

pub struct PackInstaller {
    config_id: Uuid,
    preparations: PathBuf,
    temporary: PathBuf,
    target: PackTarget,
    trust: Arc<PackTrustStore>,
    executor: Arc<PackExecutor>,
    reviews: Mutex<HashMap<Uuid, PendingReview>>,
    admission: Arc<Semaphore>,
    client: reqwest::Client,
    #[cfg(test)]
    fixture_endpoint: Option<String>,
}
impl PackInstaller {
    /// Roots must already be host-owned private directories. The caller provides
    /// no per-request paths, URL override, headers, TLS bypass or shell arguments.
    pub fn new(
        config_id: Uuid,
        preparations: &Path,
        temporary: &Path,
        target: PackTarget,
        trust: Arc<PackTrustStore>,
    ) -> Result<Self> {
        let executor = Arc::new(PackExecutor::new(config_id, preparations, trust.clone())?);
        let temporary = ordinary_directory(temporary)?;
        Ok(Self {
            config_id,
            preparations: ordinary_directory(preparations)?,
            temporary,
            target,
            trust,
            executor,
            reviews: Mutex::new(HashMap::new()),
            admission: Arc::new(Semaphore::new(1)),
            #[cfg(test)]
            fixture_endpoint: None,
            client: reqwest::Client::builder()
                .https_only(true)
                .no_proxy()
                .redirect(reqwest::redirect::Policy::none())
                .retry(reqwest::retry::never())
                .connect_timeout(Duration::from_secs(5))
                .timeout(Duration::from_secs(120))
                .build()
                .map_err(|_| InstallError::Unavailable)?,
        })
    }

    pub fn executor(&self) -> Arc<PackExecutor> {
        self.executor.clone()
    }

    /// No download or execution. The review expires after five minutes and is
    /// consumed exactly once by install, including on a failed attempt.
    pub fn review(
        &self,
        config: &ConfigService,
        record: SignedManifestRecord,
    ) -> Result<InstallReview> {
        self.identity(config)?;
        let (revision, _) = config
            .read_snapshot()
            .map_err(|_| InstallError::Unavailable)?;
        let proof = self.trust.verify_record(&record, now_ms()?)?;
        proof.artifact(self.target)?;
        let space = self.space(&proof)?;
        let view = InstallReview {
            review_id: Uuid::new_v4(),
            expected_revision: revision,
            manifest_sha256: proof.sha256().into(),
            manifest: proof.manifest().clone(),
            target: self.target,
            space,
        };
        let mut reviews = self.reviews.lock().map_err(|_| InstallError::Unavailable)?;
        reviews.retain(|_, r| r.created.elapsed() < Duration::from_secs(300));
        if reviews.len() >= 4 {
            return Err(InstallError::Busy);
        }
        reviews.insert(
            view.review_id,
            PendingReview {
                view: view.clone(),
                record,
                created: Instant::now(),
            },
        );
        Ok(view)
    }

    pub async fn install(
        &self,
        config: &ConfigService,
        review_id: Uuid,
        approved_manifest: &str,
        cancel: CancellationToken,
        on_phase: impl Fn(InstallPhase),
    ) -> Result<ConfigView> {
        self.identity(config)?;
        if cancel.is_cancelled() {
            return Err(InstallError::Cancelled);
        }
        let slot = self
            .admission
            .clone()
            .try_acquire_owned()
            .map_err(|_| InstallError::Busy)?;
        let review = self
            .reviews
            .lock()
            .map_err(|_| InstallError::Unavailable)?
            .remove(&review_id)
            .ok_or(InstallError::ReviewExpired)?;
        if review.created.elapsed() >= Duration::from_secs(300) {
            return Err(InstallError::ReviewExpired);
        }
        if review.view.manifest_sha256 != approved_manifest {
            return Err(InstallError::ApprovalChanged);
        }
        let (revision, _) = config
            .read_snapshot()
            .map_err(|_| InstallError::Unavailable)?;
        if revision != review.view.expected_revision {
            return Err(InstallError::ConfigurationConflict);
        }
        let proof = self.trust.verify_record(&review.record, now_ms()?)?;
        if proof.sha256() != approved_manifest {
            return Err(InstallError::ApprovalChanged);
        }
        let space = self.space(&proof)?;
        if space.target_shortfall_bytes != 0 || space.temp_shortfall_bytes != 0 {
            return Err(InstallError::SpaceUnavailable);
        }
        let control = PackStageControl::new(Duration::from_secs(180))?;
        let download = proof.artifact(self.target)?.download.clone();
        let staged = PackArchiveStager::new(proof, self.target, &self.temporary)?;
        on_phase(InstallPhase::Download);
        // The download owns the admission permit as well as the staging file.
        // If this future is dropped during a blocking write, the worker keeps
        // the permit until it has released both resources.
        let (staged, slot) = self
            .download(staged, slot, &download, &control, &cancel)
            .await?;
        let fresh_proof = self.trust.verify_record(&review.record, now_ms()?)?;
        let space = self.space(&fresh_proof)?;
        if !space.fits() {
            return Err(InstallError::SpaceUnavailable);
        }
        on_phase(InstallPhase::VerifyAndPrepare);
        let parent = self.preparations.clone();
        let config_id = self.config_id;
        let worker_control = control.clone();
        let mut worker = tokio::task::spawn_blocking(move || {
            let prepared = staged
                .finish(&worker_control)?
                .extract(&parent, &worker_control)?
                .publish_prepared(&parent, config_id, &worker_control)?;
            Ok::<_, PackError>((prepared.operation_id(), slot))
        });
        let (preparation, _slot) = tokio::select! {
            biased;
            _=cancel.cancelled()=>{control.cancel();let _=worker.await;return Err(InstallError::Cancelled)},
            result=&mut worker=>result.map_err(|_|InstallError::Unavailable)??,
        };
        if cancel.is_cancelled() {
            return Err(InstallError::Cancelled);
        }
        on_phase(InstallPhase::HealthCheck);
        let view = self
            .executor
            .activate(config, revision, preparation, approved_manifest, cancel)
            .await?;
        on_phase(InstallPhase::Activated);
        Ok(view)
    }

    fn identity(&self, config: &ConfigService) -> Result<()> {
        if config
            .configuration_id()
            .map_err(|_| InstallError::Unavailable)?
            != self.config_id
        {
            return Err(InstallError::Unavailable);
        }
        Ok(())
    }
    fn space(&self, proof: &VerifiedManifest) -> Result<PackSpacePlan> {
        // Existing retained files are already reflected in available-space;
        // calculate their bounded logical size only for the peak shown to users.
        let existing = retained_size(&self.preparations)?;
        let observed = observe_pack_space(&self.preparations, &self.temporary)?;
        Ok(proof.plan_install_space(self.target, existing, observed.space()?)?)
    }
    async fn download(
        &self,
        mut staged: PackArchiveStager,
        mut slot: tokio::sync::OwnedSemaphorePermit,
        download: &PackDownload,
        control: &PackStageControl,
        cancel: &CancellationToken,
    ) -> Result<(PackArchiveStager, tokio::sync::OwnedSemaphorePermit)> {
        #[cfg(not(test))]
        let endpoint = &download.url;
        #[cfg(test)]
        let endpoint = self.fixture_endpoint.as_ref().unwrap_or(&download.url);
        let response = tokio::select! {
            biased;
            _=cancel.cancelled()=>return Err(InstallError::Cancelled),
            value=self.client.get(endpoint).send()=>value.map_err(|_|InstallError::DownloadFailed)?,
        };
        if response.status() != reqwest::StatusCode::OK
            || response
                .content_length()
                .is_some_and(|n| n != download.size_bytes)
        {
            return Err(InstallError::DownloadFailed);
        }
        let mut stream = response.bytes_stream();
        loop {
            let chunk = tokio::select! {
                biased;
                _=cancel.cancelled()=>return Err(InstallError::Cancelled),
                value=stream.next()=>value,
            };
            let Some(chunk) = chunk else { break };
            let chunk = chunk.map_err(|_| InstallError::DownloadFailed)?;
            let check = control.clone();
            let mut writer = tokio::task::spawn_blocking(move || {
                let result = staged.push(&chunk, &check);
                (staged, slot, result)
            });
            let (next, next_slot, result) = tokio::select! {
                biased;
                _=cancel.cancelled()=>{control.cancel();let _=writer.await;return Err(InstallError::Cancelled)},
                value=&mut writer=>value.map_err(|_|InstallError::Unavailable)?,
            };
            result?;
            staged = next;
            slot = next_slot;
        }
        Ok((staged, slot))
    }
}

#[cfg(test)]
#[path = "pack_install_tests.rs"]
mod tests;
fn now_ms() -> Result<u64> {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| InstallError::Unavailable)?
        .as_millis()
        .try_into()
        .map_err(|_| InstallError::Unavailable)
}
fn ordinary_directory(path: &Path) -> Result<PathBuf> {
    let m = std::fs::symlink_metadata(path).map_err(|_| InstallError::Unavailable)?;
    if !m.is_dir() || m.file_type().is_symlink() {
        return Err(InstallError::Unavailable);
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if m.file_attributes() & 0x400 != 0 {
            return Err(InstallError::Unavailable);
        }
    }
    std::fs::canonicalize(path).map_err(|_| InstallError::Unavailable)
}
fn retained_size(root: &Path) -> Result<u64> {
    let mut pending = vec![ordinary_directory(root)?];
    let mut count = 0usize;
    let mut bytes = 0u64;
    let deadline = Instant::now();
    while let Some(directory) = pending.pop() {
        for entry in std::fs::read_dir(directory).map_err(|_| InstallError::Unavailable)? {
            count += 1;
            if count > 20_000 || deadline.elapsed() > Duration::from_secs(2) {
                return Err(InstallError::Unavailable);
            }
            let entry = entry.map_err(|_| InstallError::Unavailable)?;
            let m =
                std::fs::symlink_metadata(entry.path()).map_err(|_| InstallError::Unavailable)?;
            if m.file_type().is_symlink() {
                return Err(InstallError::Unavailable);
            }
            #[cfg(windows)]
            {
                use std::os::windows::fs::MetadataExt;
                if m.file_attributes() & 0x400 != 0 {
                    return Err(InstallError::Unavailable);
                }
            }
            if m.is_dir() {
                pending.push(entry.path())
            } else if m.is_file() {
                bytes = bytes
                    .checked_add(m.len())
                    .ok_or(InstallError::Unavailable)?
            } else {
                return Err(InstallError::Unavailable);
            }
        }
    }
    Ok(bytes)
}
