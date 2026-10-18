//! Prepared-only persistent files. No installed/active state, execution, or
//! automatic cleanup. Caller supplies an app-owned private parent and config
//! UUID; this low-level layer does not replace host preflight/config binding.
use super::*;
use cap_std::fs::Dir;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    io::{Read, Write},
    path::{Path, PathBuf},
};

const OWNER: &str = "TagmaPackPreparedV1";
const MAX_RECEIPT_BYTES: u64 = 8 * 1024 * 1024;
const RECEIPT: &str = "prepared.json";
pub const MAX_PREPARATION_INVENTORY_ENTRIES: usize = 128;

/// Read-only startup discovery. Unpublished/unknown names are diagnostic only,
/// never evidence of ownership that would authorize deleting their contents.
pub enum PreparationEntry {
    Prepared(Box<PreparedPack>),
    Unpublished { path: PathBuf },
    Unavailable { path: PathBuf, error: PackError },
    Unknown { path: PathBuf },
}
/// Bound the whole inventory before opening any receipt; a crowded or hostile
/// parent cannot induce unbounded scanning or a partial success list. The same
/// operation deadline/cancellation covers every subsequent tree read.
pub fn inspect_preparations(
    parent: &Path,
    config_uuid: uuid::Uuid,
    trust: &PackTrustStore,
    now_ms: u64,
    control: &PackStageControl,
) -> PackResult<Vec<PreparationEntry>> {
    control.check()?;
    if config_uuid.is_nil() {
        return Err(PackError::InvalidPreparedPack);
    }
    regular_directory(parent)?;
    let parent = std::fs::canonicalize(parent).map_err(|_| PackError::ReadFailed)?;
    let mut paths = Vec::new();
    for entry in std::fs::read_dir(&parent).map_err(|_| PackError::ReadFailed)? {
        control.check()?;
        if paths.len() == MAX_PREPARATION_INVENTORY_ENTRIES {
            return Err(PackError::ArchiveLimit);
        }
        paths.push(entry.map_err(|_| PackError::ReadFailed)?.path());
    }
    paths.sort();
    let mut result = Vec::with_capacity(paths.len());
    for path in paths {
        control.check()?;
        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if name.starts_with("tagma-pack-preparing-") {
            result.push(PreparationEntry::Unpublished { path });
        } else if name
            .strip_prefix("prepared-")
            .and_then(|s| uuid::Uuid::parse_str(s).ok())
            .is_some_and(|id| !id.is_nil() && name == format!("prepared-{id}"))
        {
            match PreparedPack::reopen(&path, config_uuid, trust, now_ms, control) {
                Ok(prepared) => result.push(PreparationEntry::Prepared(Box::new(prepared))),
                Err(PackError::Cancelled) => return Err(PackError::Cancelled),
                Err(PackError::TimedOut) => return Err(PackError::TimedOut),
                Err(error) => result.push(PreparationEntry::Unavailable { path, error }),
            }
        } else {
            result.push(PreparationEntry::Unknown { path });
        }
    }
    control.check()?;
    Ok(result)
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
struct TreeEntry {
    path: String,
    directory: bool,
    bytes: u64,
    sha256: String,
}
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Receipt {
    owner: String,
    config_uuid: String,
    operation_id: String,
    manifest: SignedManifestRecord,
    target: PackTarget,
    #[serde(deserialize_with = "read_tree")]
    tree: Vec<TreeEntry>,
}
fn read_tree<'de, D: serde::Deserializer<'de>>(
    deserializer: D,
) -> Result<Vec<TreeEntry>, D::Error> {
    struct Visitor;
    impl<'de> serde::de::Visitor<'de> for Visitor {
        type Value = Vec<TreeEntry>;
        fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
            f.write_str("at most 10000 prepared tree entries")
        }
        fn visit_seq<A: serde::de::SeqAccess<'de>>(
            self,
            mut seq: A,
        ) -> Result<Self::Value, A::Error> {
            let mut entries = Vec::new();
            while let Some(entry) = seq.next_element()? {
                if entries.len() == MAX_ARCHIVE_ENTRIES as usize {
                    return Err(serde::de::Error::custom("prepared tree entry limit"));
                }
                entries.push(entry);
            }
            Ok(entries)
        }
    }
    deserializer.deserialize_seq(Visitor)
}

/// Successfully prepared files, not a callable or health-checked installation.
/// Drop only closes this value; persistent files are intentionally retained.
/// Receipt file hashes detect local corruption; they are not separately signed
/// by the publisher. This store does not defend against an attacker who can
/// rewrite both the app-owned receipt and payload as the same OS user.
pub struct PreparedPack {
    root: PathBuf,
    proof: VerifiedManifest,
    target: PackTarget,
    operation_id: uuid::Uuid,
}
impl PreparedPack {
    pub fn root_path(&self) -> &Path {
        &self.root
    }
    pub fn manifest(&self) -> &VerifiedManifest {
        &self.proof
    }
    pub fn target(&self) -> PackTarget {
        self.target
    }
    pub fn operation_id(&self) -> uuid::Uuid {
        self.operation_id
    }

    /// Read-only recovery of one published preparation. Unknown/corrupt/expired
    /// records are rejected and preserved, never activated or automatically deleted.
    pub fn reopen(
        path: &Path,
        config_uuid: uuid::Uuid,
        trust: &PackTrustStore,
        now_ms: u64,
        control: &PackStageControl,
    ) -> PackResult<Self> {
        control.check()?;
        if config_uuid.is_nil() {
            return Err(PackError::InvalidPreparedPack);
        }
        regular_directory(path)?;
        let root = std::fs::canonicalize(path).map_err(|_| PackError::ReadFailed)?;
        let directory = Dir::open_ambient_dir(&root, cap_std::ambient_authority())
            .map_err(|_| PackError::ReadFailed)?;
        // Exactly receipt + payload. Do not ignore extra state or guess which
        // partially written record the caller meant to open.
        let mut names = Vec::new();
        for entry in directory.entries().map_err(|_| PackError::ReadFailed)? {
            control.check()?;
            if names.len() == 2 {
                return Err(PackError::InvalidPreparedPack);
            }
            names.push(entry.map_err(|_| PackError::ReadFailed)?.file_name());
        }
        names.sort();
        if names
            != [
                std::ffi::OsString::from("payload"),
                std::ffi::OsString::from(RECEIPT),
            ]
        {
            return Err(PackError::InvalidPreparedPack);
        }
        let metadata = directory
            .symlink_metadata(RECEIPT)
            .map_err(|_| PackError::ReadFailed)?;
        if !metadata.is_file() || metadata.len() > MAX_RECEIPT_BYTES {
            return Err(PackError::InvalidPreparedPack);
        }
        no_reparse(&metadata)?;
        let mut bytes = Vec::new();
        let input = directory
            .open(RECEIPT)
            .map_err(|_| PackError::ReadFailed)?
            .into_std();
        single_link_file(&input)?;
        let mut input = input.take(MAX_RECEIPT_BYTES + 1);
        let mut buffer = [0u8; 64 * 1024];
        loop {
            control.check()?;
            let n = input.read(&mut buffer).map_err(|_| PackError::ReadFailed)?;
            if n == 0 {
                break;
            }
            bytes.extend_from_slice(&buffer[..n]);
            if bytes.len() as u64 > MAX_RECEIPT_BYTES {
                return Err(PackError::InvalidPreparedPack);
            }
        }
        let receipt: Receipt =
            serde_json::from_slice(&bytes).map_err(|_| PackError::InvalidPreparedPack)?;
        let operation_id = uuid::Uuid::parse_str(&receipt.operation_id)
            .map_err(|_| PackError::InvalidPreparedPack)?;
        if receipt.owner != OWNER
            || receipt.config_uuid != config_uuid.to_string()
            || operation_id.is_nil()
            || receipt.operation_id != operation_id.to_string()
            || root.file_name().and_then(|n| n.to_str())
                != Some(&format!("prepared-{}", receipt.operation_id))
        {
            return Err(PackError::InvalidPreparedPack);
        }
        let proof = trust.verify_record(&receipt.manifest, now_ms)?;
        let artifact = proof.artifact(receipt.target)?;
        validate_tree(&proof, receipt.target, &receipt.tree)?;
        let payload_meta = directory
            .symlink_metadata("payload")
            .map_err(|_| PackError::ReadFailed)?;
        if !payload_meta.is_dir() {
            return Err(PackError::InvalidPreparedPack);
        }
        no_reparse(&payload_meta)?;
        let payload = directory
            .open_dir("payload")
            .map_err(|_| PackError::ReadFailed)?;
        let actual = tree(&payload, artifact, control)?;
        if actual != receipt.tree {
            return Err(PackError::InvalidPreparedPack);
        }
        control.check()?;
        Ok(Self {
            root,
            proof,
            target: receipt.target,
            operation_id,
        })
    }
}
impl ExtractedPack {
    /// Same-volume no-replace publication of a complete outer directory.
    /// The destination remains only prepared; no active pointer/config changes.
    pub fn publish_prepared(
        self,
        parent: &Path,
        config_uuid: uuid::Uuid,
        control: &PackStageControl,
    ) -> PackResult<PreparedPack> {
        self.publish_inner(parent, config_uuid, control, uuid::Uuid::new_v4(), |_| {})
    }
    pub(super) fn publish_inner(
        self,
        parent: &Path,
        config_uuid: uuid::Uuid,
        control: &PackStageControl,
        operation_id: uuid::Uuid,
        hook: impl Fn(PreparationPoint),
    ) -> PackResult<PreparedPack> {
        control.check()?;
        if config_uuid.is_nil() || operation_id.is_nil() {
            return Err(PackError::InvalidPreparedPack);
        }
        regular_directory(parent)?;
        let parent = std::fs::canonicalize(parent).map_err(|_| PackError::WriteFailed)?;
        let proof = self.manifest().clone();
        let target = self.target();
        let source = Dir::open_ambient_dir(self.root_path(), cap_std::ambient_authority())
            .map_err(|_| PackError::ReadFailed)?;
        let tree = tree(&source, proof.artifact(target)?, control)?;
        let index = validate_tree(&proof, target, &tree)?;
        let mut expected = BTreeMap::new();
        for entry in self.index().entries() {
            for (end, _) in entry.path.match_indices('/') {
                expected
                    .entry(entry.path[..end].to_owned())
                    .or_insert((true, 0));
            }
            expected.insert(
                entry.path.clone(),
                (
                    entry.kind == ArchiveEntryKind::Directory,
                    entry.unpacked_bytes,
                ),
            );
        }
        if index.total_bytes() != self.index().total_bytes()
            || index.filesystem_entries() != self.index().filesystem_entries()
            || tree.len() != expected.len()
            || tree.iter().any(|entry| {
                expected.get(&entry.path) != Some(&(entry.directory, entry.bytes))
                    || (!entry.directory
                        && self.file_hashes().get(&entry.path) != Some(&entry.sha256))
            })
        {
            return Err(PackError::InvalidPreparedPack);
        }
        drop(source);
        let receipt = Receipt {
            owner: OWNER.into(),
            config_uuid: config_uuid.to_string(),
            operation_id: operation_id.to_string(),
            manifest: proof.signed_record(),
            target,
            tree,
        };
        let bytes = serde_json::to_vec(&receipt).map_err(|_| PackError::InvalidPreparedPack)?;
        if bytes.len() as u64 > MAX_RECEIPT_BYTES {
            return Err(PackError::InvalidPreparedPack);
        }
        let temporary = tempfile::Builder::new()
            .prefix("tagma-pack-preparing-")
            .tempdir_in(&parent)
            .map_err(|_| PackError::WriteFailed)?;
        let destination = parent.join(format!("prepared-{operation_id}"));
        self.relocate(&temporary.path().join("payload"))?;
        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(temporary.path().join(RECEIPT))
            .map_err(|_| PackError::WriteFailed)?;
        for chunk in bytes.chunks(64 * 1024) {
            control.check()?;
            file.write_all(chunk).map_err(|_| PackError::WriteFailed)?;
        }
        file.sync_all().map_err(|_| PackError::WriteFailed)?;
        drop(file);
        hook(PreparationPoint::Ready);
        control.check()?;
        crate::initialization::publish_new(temporary.path(), &destination)
            .map_err(|_| PackError::WriteFailed)?;
        // Commit point: never return a cancellation after publishing, or callers
        // might replay an operation that already succeeded. Recovery revalidates.
        let _ = temporary.keep();
        hook(PreparationPoint::Published);
        Ok(PreparedPack {
            root: destination,
            proof,
            target,
            operation_id,
        })
    }
}
#[derive(Clone, Copy)]
pub(super) enum PreparationPoint {
    Ready,
    Published,
}
fn regular_directory(path: &Path) -> PackResult<()> {
    let metadata = std::fs::symlink_metadata(path).map_err(|_| PackError::ReadFailed)?;
    if !metadata.is_dir() || metadata.file_type().is_symlink() {
        return Err(PackError::InvalidPreparedPack);
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes() & 0x400 != 0 {
            return Err(PackError::InvalidPreparedPack);
        }
    }
    Ok(())
}
fn validate_tree(
    proof: &VerifiedManifest,
    target: PackTarget,
    tree: &[TreeEntry],
) -> PackResult<ValidatedArchiveIndex> {
    if tree.is_empty() || tree.len() > MAX_ARCHIVE_ENTRIES as usize {
        return Err(PackError::ArchiveLimit);
    }
    let mut previous: Option<&str> = None;
    for entry in tree {
        if previous.is_some_and(|p| p >= entry.path.as_str())
            || (entry.directory && (entry.bytes != 0 || !entry.sha256.is_empty()))
            || (!entry.directory
                && (entry.sha256.len() != 64
                    || !entry
                        .sha256
                        .bytes()
                        .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))))
        {
            return Err(PackError::InvalidPreparedPack);
        }
        previous = Some(&entry.path);
    }
    proof.validate_archive_index(
        target,
        tree.iter()
            .map(|e| ArchiveEntry {
                path: e.path.clone(),
                kind: if e.directory {
                    ArchiveEntryKind::Directory
                } else {
                    ArchiveEntryKind::File
                },
                unpacked_bytes: e.bytes,
            })
            .collect(),
    )
}
fn no_reparse(metadata: &cap_std::fs::Metadata) -> PackResult<()> {
    if metadata.file_type().is_symlink() {
        return Err(PackError::UnsafePath);
    }
    #[cfg(windows)]
    {
        use cap_std::fs::MetadataExt;
        if metadata.file_attributes() & 0x400 != 0 {
            return Err(PackError::UnsafePath);
        }
    }
    Ok(())
}
fn single_link_file(file: &std::fs::File) -> PackResult<()> {
    if !file
        .metadata()
        .map_err(|_| PackError::ReadFailed)?
        .is_file()
    {
        return Err(PackError::UnsafePath);
    }
    #[cfg(windows)]
    {
        use std::os::windows::io::AsRawHandle;
        use windows_sys::Win32::Storage::FileSystem::{
            BY_HANDLE_FILE_INFORMATION, GetFileInformationByHandle,
        };
        let mut info: BY_HANDLE_FILE_INFORMATION = unsafe { std::mem::zeroed() };
        // Borrow the already-open regular file; this never opens another path.
        if unsafe { GetFileInformationByHandle(file.as_raw_handle(), &mut info) } == 0 {
            return Err(PackError::ReadFailed);
        }
        if info.nNumberOfLinks != 1 || info.dwFileAttributes & 0x400 != 0 {
            return Err(PackError::UnsafePath);
        }
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        if file.metadata().map_err(|_| PackError::ReadFailed)?.nlink() != 1 {
            return Err(PackError::UnsafePath);
        }
    }
    Ok(())
}

fn tree(
    root: &Dir,
    artifact: &PackArtifact,
    control: &PackStageControl,
) -> PackResult<Vec<TreeEntry>> {
    let mut entries = BTreeMap::new();
    let mut total = 0u64;
    // One shared read buffer, not 64KiB per recursion level. Portable path
    // length bounds directory depth, and every actual parent counts as an entry.
    let mut buffer = [0u8; 64 * 1024];
    walk(
        root,
        "",
        artifact,
        control,
        &mut entries,
        &mut total,
        &mut buffer,
    )?;
    Ok(entries.into_values().collect())
}
fn walk(
    dir: &Dir,
    prefix: &str,
    artifact: &PackArtifact,
    control: &PackStageControl,
    entries: &mut BTreeMap<String, TreeEntry>,
    total: &mut u64,
    buffer: &mut [u8],
) -> PackResult<()> {
    for item in dir.entries().map_err(|_| PackError::ReadFailed)? {
        control.check()?;
        if entries.len() >= artifact.resources.max_archive_entries as usize {
            return Err(PackError::ArchiveLimit);
        }
        let item = item.map_err(|_| PackError::ReadFailed)?;
        let name = item
            .file_name()
            .into_string()
            .map_err(|_| PackError::UnsafePath)?;
        let path = if prefix.is_empty() {
            name
        } else {
            format!("{prefix}/{name}")
        };
        validate_pack_path(&path)?;
        let metadata = dir
            .symlink_metadata(item.file_name())
            .map_err(|_| PackError::ReadFailed)?;
        no_reparse(&metadata)?;
        let kind = metadata.file_type();
        if kind.is_symlink() || (!kind.is_file() && !kind.is_dir()) {
            return Err(PackError::UnsafePath);
        }
        let mut entry = TreeEntry {
            path: path.clone(),
            directory: kind.is_dir(),
            bytes: 0,
            sha256: String::new(),
        };
        if !entry.directory {
            if metadata.len() > artifact.resources.max_unpacked_bytes.saturating_sub(*total) {
                return Err(PackError::ArchiveLimit);
            }
            let mut file = item.open().map_err(|_| PackError::ReadFailed)?.into_std();
            single_link_file(&file)?;
            let mut hash = Sha256::new();
            loop {
                control.check()?;
                let n = file.read(buffer).map_err(|_| PackError::ReadFailed)?;
                if n == 0 {
                    break;
                }
                *total = total.checked_add(n as u64).ok_or(PackError::ArchiveLimit)?;
                entry.bytes += n as u64;
                if *total > artifact.resources.max_unpacked_bytes {
                    return Err(PackError::ArchiveLimit);
                }
                hash.update(&buffer[..n]);
            }
            if entry.bytes != metadata.len() {
                return Err(PackError::InvalidPreparedPack);
            }
            entry.sha256 = format!("{:x}", hash.finalize());
        }
        let directory = entry.directory;
        entries.insert(path.clone(), entry);
        if directory {
            let child = item.open_dir().map_err(|_| PackError::ReadFailed)?;
            walk(&child, &path, artifact, control, entries, total, buffer)?;
        }
    }
    Ok(())
}
