use super::*;
use std::{
    fs::{File, OpenOptions},
    io::{Read, Write},
};
use tagma_core::{
    ConfigService, ConfigView,
    packs::{InstalledPack, PreparedRemoval},
};

const MAX_INTENT: u64 = 16 * 1024 * 1024;
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Intent {
    owner: String,
    config: Uuid,
    pack: InstalledPack,
    plans: Vec<PreparedRemoval>,
}
pub struct RemovalStatus {
    pub pending_pack: Option<String>,
    pub gateway_running: bool,
    pub pack_call_running: bool,
}
impl PackExecutor {
    fn intent_path(&self) -> PathBuf {
        self.preparations.join("pending-removal.json")
    }
    fn read_intent(&self) -> Result<Option<Intent>> {
        let path = self.intent_path();
        if !path.try_exists().map_err(|_| PackRunError::Unavailable)? {
            return Ok(None);
        }
        ordinary(&path)?;
        let mut bytes = Vec::new();
        File::open(path)
            .map_err(|_| PackRunError::Unavailable)?
            .take(MAX_INTENT + 1)
            .read_to_end(&mut bytes)
            .map_err(|_| PackRunError::Unavailable)?;
        if bytes.len() as u64 > MAX_INTENT {
            return Err(PackRunError::Unavailable);
        }
        let intent: Intent =
            serde_json::from_slice(&bytes).map_err(|_| PackRunError::Unavailable)?;
        if intent.owner != "TagmaPackRemovalV1"
            || intent.config != self.config_uuid
            || intent.pack.active_version.is_some()
            || intent.plans.len() != intent.pack.versions.len()
            || tagma_core::packs::validate_installations(std::slice::from_ref(&intent.pack))
                .is_err()
            || intent
                .plans
                .iter()
                .zip(&intent.pack.versions)
                .any(|(p, v)| p.preparation_id() != v.preparation_id)
        {
            return Err(PackRunError::Unavailable);
        }
        Ok(Some(intent))
    }
    pub fn removal_pending(&self) -> Result<bool> {
        Ok(self.read_intent()?.is_some())
    }
    pub fn removal_status(&self, directory: &Path) -> Result<RemovalStatus> {
        let pending_pack = self.read_intent()?.map(|i| i.pack.id);
        Ok(RemovalStatus {
            pending_pack,
            gateway_running: busy(&directory.join("gateway.lock"))?,
            pack_call_running: busy(&self.preparations.join("call.lock"))?,
        })
    }
    /// Blocking bounded maintenance. The desktop owns the host-operation guard.
    /// The gateway must already be stopped; its startup lock and the pack call
    /// lease remain held through unregister + cleanup, including retry.
    pub fn uninstall(
        &self,
        directory: &Path,
        config: &ConfigService,
        expected_revision: u32,
        pack_id: &str,
        cancel: CancellationToken,
    ) -> Result<ConfigView> {
        if config
            .configuration_id()
            .map_err(|_| PackRunError::Unavailable)?
            != self.config_uuid
        {
            return Err(PackRunError::Unavailable);
        }
        let _gateway = exclusive(&directory.join("gateway.lock"))?;
        let _call = exclusive(&self.preparations.join("call.lock"))?;
        let _slot = self
            .admission
            .clone()
            .try_acquire_owned()
            .map_err(|_| PackRunError::Busy)?;
        let (revision, snapshot) = config
            .read_snapshot()
            .map_err(|_| PackRunError::Unavailable)?;
        if revision != expected_revision {
            return Err(PackRunError::ConfigurationConflict);
        }
        if cancel.is_cancelled() {
            return Err(PackRunError::Cancelled);
        }
        let control = PackStageControl::new(Duration::from_secs(30))
            .map_err(|_| PackRunError::Unavailable)?;
        let pending = self.read_intent()?;
        let is_new = pending.is_none();
        let intent = if let Some(intent) = pending {
            if intent.pack.id != pack_id {
                return Err(PackRunError::Busy);
            }
            intent
        } else {
            let pack = snapshot
                .installed_packs
                .iter()
                .find(|p| p.id == pack_id)
                .filter(|p| p.active_version.is_none())
                .ok_or(PackRunError::InvalidInput)?
                .clone();
            let mut plans = Vec::new();
            for version in &pack.versions {
                if cancel.is_cancelled() {
                    return Err(PackRunError::Cancelled);
                }
                plans.push(
                    PreparedRemoval::prepare(
                        &self
                            .preparations
                            .join(format!("prepared-{}", version.preparation_id)),
                        self.config_uuid,
                        &self.trust,
                        epoch_ms()?,
                        &control,
                    )
                    .map_err(|_| PackRunError::Unavailable)?,
                );
            }
            Intent {
                owner: "TagmaPackRemovalV1".into(),
                config: self.config_uuid,
                pack,
                plans,
            }
        };
        for plan in &intent.plans {
            plan.check(
                &self.preparations,
                self.config_uuid,
                &intent.pack,
                &self.trust,
                epoch_ms()?,
                &control,
            )
            .map_err(|_| PackRunError::Unavailable)?;
        }
        if cancel.is_cancelled() {
            return Err(PackRunError::Cancelled);
        }
        if is_new {
            let bytes = serde_json::to_vec(&intent).map_err(|_| PackRunError::Unavailable)?;
            if bytes.len() as u64 > MAX_INTENT {
                return Err(PackRunError::Unavailable);
            }
            let mut temp = tempfile::NamedTempFile::new_in(&self.preparations)
                .map_err(|_| PackRunError::Unavailable)?;
            temp.write_all(&bytes)
                .map_err(|_| PackRunError::Unavailable)?;
            temp.as_file()
                .sync_all()
                .map_err(|_| PackRunError::Unavailable)?;
            temp.persist_noclobber(self.intent_path())
                .map_err(|_| PackRunError::Unavailable)?;
        }
        // Commit before deleting any runtime file. Interrupted cleanup leaves an
        // explicit retryable intent; startup never removes files automatically.
        let view = config
            .unregister_inactive_pack(revision, &intent.pack)
            .map_err(|e| {
                if e.code == tagma_core::ErrorCode::ConfigConflict {
                    PackRunError::ConfigurationConflict
                } else {
                    PackRunError::Unavailable
                }
            })?;
        for plan in &intent.plans {
            if cancel.is_cancelled() {
                return Err(PackRunError::Cancelled);
            }
            plan.remove_checked(&self.preparations, &control)
                .map_err(|_| PackRunError::CleanupPending)?;
        }
        std::fs::remove_file(self.intent_path()).map_err(|_| PackRunError::CleanupPending)?;
        Ok(view)
    }
}
fn ordinary(path: &Path) -> Result<()> {
    let m = std::fs::symlink_metadata(path).map_err(|_| PackRunError::Unavailable)?;
    if !m.is_file() || m.file_type().is_symlink() {
        return Err(PackRunError::Unavailable);
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if m.file_attributes() & 0x400 != 0 {
            return Err(PackRunError::Unavailable);
        }
    }
    Ok(())
}
fn exclusive(path: &Path) -> Result<File> {
    if path.try_exists().map_err(|_| PackRunError::Unavailable)? {
        ordinary(path)?;
    }
    let file = OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(path)
        .map_err(|_| PackRunError::Unavailable)?;
    fs2::FileExt::try_lock_exclusive(&file).map_err(|_| PackRunError::Busy)?;
    Ok(file)
}
fn busy(path: &Path) -> Result<bool> {
    match exclusive(path) {
        Ok(_) => Ok(false),
        Err(PackRunError::Busy) => Ok(true),
        Err(e) => Err(e),
    }
}
