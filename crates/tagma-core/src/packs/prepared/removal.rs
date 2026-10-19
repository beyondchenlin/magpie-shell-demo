//! Explicit deletion of a verified, unregistered runtime tree only. A durable
//! host intent keeps the receipt so interrupted partial removal can be retried.
use super::*;

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PreparedRemoval {
    receipt: Receipt,
}
impl PreparedRemoval {
    pub fn prepare(
        path: &Path,
        config: uuid::Uuid,
        trust: &PackTrustStore,
        now: u64,
        control: &PackStageControl,
    ) -> PackResult<Self> {
        PreparedPack::reopen(path, config, trust, now, control)?;
        let dir = Dir::open_ambient_dir(path, cap_std::ambient_authority())
            .map_err(|_| PackError::ReadFailed)?;
        Ok(Self {
            receipt: read_receipt(&dir)?,
        })
    }
    pub fn preparation_id(&self) -> &str {
        &self.receipt.operation_id
    }
    pub fn check(
        &self,
        parent: &Path,
        config: uuid::Uuid,
        pack: &InstalledPack,
        trust: &PackTrustStore,
        now: u64,
        control: &PackStageControl,
    ) -> PackResult<()> {
        control.check()?;
        let r = &self.receipt;
        let version = pack
            .versions
            .iter()
            .find(|v| v.preparation_id == r.operation_id)
            .ok_or(PackError::InvalidPreparedPack)?;
        let id =
            uuid::Uuid::parse_str(&r.operation_id).map_err(|_| PackError::InvalidPreparedPack)?;
        if r.owner != OWNER
            || r.config_uuid != config.to_string()
            || id.is_nil()
            || id.to_string() != r.operation_id
            || r.operation_id != version.preparation_id
        {
            return Err(PackError::InvalidPreparedPack);
        }
        let proof = trust.verify_record(&r.manifest, now)?;
        if proof.sha256() != version.manifest_sha256
            || proof.manifest().id != pack.id
            || proof.manifest().version != version.version
        {
            return Err(PackError::InvalidPreparedPack);
        }
        validate_tree(&proof, r.target, &r.tree)?;
        regular_directory(parent)?;
        let root = parent.join(format!("prepared-{id}"));
        if !root.try_exists().map_err(|_| PackError::ReadFailed)? {
            return Ok(());
        }
        regular_directory(&root)?;
        let dir = Dir::open_ambient_dir(root, cap_std::ambient_authority())
            .map_err(|_| PackError::ReadFailed)?;
        let mut names = Vec::new();
        for entry in dir.entries().map_err(|_| PackError::ReadFailed)? {
            control.check()?;
            if names.len() == 2 {
                return Err(PackError::InvalidPreparedPack);
            }
            let name = entry.map_err(|_| PackError::ReadFailed)?.file_name();
            if name != "payload" && name != RECEIPT {
                return Err(PackError::InvalidPreparedPack);
            }
            names.push(name);
        }
        if names.iter().any(|n| n == RECEIPT) {
            let disk = read_receipt(&dir)?;
            // Compare the complete approved receipt; never adopt a newly written tree.
            if serde_json::to_vec(&disk).ok() != serde_json::to_vec(r).ok() {
                return Err(PackError::InvalidPreparedPack);
            }
        } else if !names.is_empty() {
            return Err(PackError::InvalidPreparedPack);
        }
        if names.iter().any(|n| n == "payload") {
            let meta = dir
                .symlink_metadata("payload")
                .map_err(|_| PackError::ReadFailed)?;
            no_reparse(&meta)?;
            if !meta.is_dir() {
                return Err(PackError::UnsafePath);
            }
            let payload = dir.open_dir("payload").map_err(|_| PackError::ReadFailed)?;
            let actual = tree(&payload, proof.artifact(r.target)?, control)?;
            if actual.iter().any(|entry| {
                r.tree
                    .binary_search_by(|e| e.path.cmp(&entry.path))
                    .ok()
                    .is_none_or(|i| r.tree[i] != *entry)
            }) {
                return Err(PackError::InvalidPreparedPack);
            }
        }
        Ok(())
    }
    /// Caller checks all plans while holding gateway + executor exclusion, then
    /// unregisters configuration before this method. Unknown files are preserved.
    pub fn remove_checked(&self, parent: &Path, control: &PackStageControl) -> PackResult<()> {
        control.check()?;
        regular_directory(parent)?;
        let name = format!("prepared-{}", self.receipt.operation_id);
        // Revalidate the identifier even when a deserialized plan reaches here.
        if uuid::Uuid::parse_str(&self.receipt.operation_id)
            .ok()
            .is_none_or(|id| id.is_nil() || id.to_string() != self.receipt.operation_id)
        {
            return Err(PackError::InvalidPreparedPack);
        }
        let root = parent.join(&name);
        if !root.try_exists().map_err(|_| PackError::ReadFailed)? {
            return Ok(());
        }
        regular_directory(&root)?;
        let outer = Dir::open_ambient_dir(parent, cap_std::ambient_authority())
            .map_err(|_| PackError::ReadFailed)?;
        let dir = outer.open_dir(&name).map_err(|_| PackError::ReadFailed)?;
        if dir
            .try_exists("payload")
            .map_err(|_| PackError::ReadFailed)?
        {
            let meta = dir
                .symlink_metadata("payload")
                .map_err(|_| PackError::ReadFailed)?;
            no_reparse(&meta)?;
            let payload = dir.open_dir("payload").map_err(|_| PackError::ReadFailed)?;
            for entry in self.receipt.tree.iter().rev() {
                control.check()?;
                validate_pack_path(&entry.path)?;
                match payload.symlink_metadata(&entry.path) {
                    Ok(meta) => {
                        no_reparse(&meta)?;
                        if entry.directory && meta.is_dir() {
                            payload
                                .remove_dir(&entry.path)
                                .map_err(|_| PackError::WriteFailed)?;
                        } else if !entry.directory && meta.is_file() {
                            payload
                                .remove_file(&entry.path)
                                .map_err(|_| PackError::WriteFailed)?;
                        } else {
                            return Err(PackError::UnsafePath);
                        }
                    }
                    Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
                    Err(_) => return Err(PackError::ReadFailed),
                }
            }
            drop(payload);
            dir.remove_dir("payload")
                .map_err(|_| PackError::WriteFailed)?;
        }
        if dir.try_exists(RECEIPT).map_err(|_| PackError::ReadFailed)? {
            dir.remove_file(RECEIPT)
                .map_err(|_| PackError::WriteFailed)?;
        }
        drop(dir);
        outer.remove_dir(name).map_err(|_| PackError::WriteFailed)
    }
}
fn read_receipt(dir: &Dir) -> PackResult<Receipt> {
    let meta = dir
        .symlink_metadata(RECEIPT)
        .map_err(|_| PackError::ReadFailed)?;
    no_reparse(&meta)?;
    if !meta.is_file() || meta.len() > MAX_RECEIPT_BYTES {
        return Err(PackError::InvalidPreparedPack);
    }
    let file = dir
        .open(RECEIPT)
        .map_err(|_| PackError::ReadFailed)?
        .into_std();
    single_link_file(&file)?;
    let mut bytes = Vec::new();
    file.take(MAX_RECEIPT_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| PackError::ReadFailed)?;
    if bytes.len() as u64 > MAX_RECEIPT_BYTES {
        return Err(PackError::InvalidPreparedPack);
    }
    serde_json::from_slice(&bytes).map_err(|_| PackError::InvalidPreparedPack)
}
