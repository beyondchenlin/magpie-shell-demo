//! Verified bytes -> fresh disposable version directory. No activation or run.
use super::*;
use cap_std::fs::{Dir, OpenOptions};
use std::{
    io::{Read, Seek, SeekFrom, Write},
    path::Path,
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    time::{Duration, Instant},
};
const BUFFER: usize = 64 * 1024;
const MAX_CENTRAL_BYTES: u64 = 4 * 1024 * 1024;
#[derive(Clone)]
pub struct PackStageControl {
    cancelled: Arc<AtomicBool>,
    deadline: Instant,
}
impl PackStageControl {
    pub fn new(timeout: Duration) -> PackResult<Self> {
        if timeout.is_zero() || timeout > Duration::from_secs(600) {
            return Err(PackError::InvalidManifest);
        }
        Ok(Self {
            cancelled: Arc::new(AtomicBool::new(false)),
            deadline: Instant::now() + timeout,
        })
    }
    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
    }
    pub fn check(&self) -> PackResult<()> {
        if self.cancelled.load(Ordering::SeqCst) {
            Err(PackError::Cancelled)
        } else if Instant::now() >= self.deadline {
            Err(PackError::TimedOut)
        } else {
            Ok(())
        }
    }
}
fn zip_failure(control: &PackStageControl) -> PackError {
    control.check().err().unwrap_or(PackError::InvalidArchive)
}

pub struct PackArchiveStager {
    file: tempfile::NamedTempFile,
    checksum: ArchiveChecksum,
    proof: VerifiedManifest,
    target: PackTarget,
    failed: bool,
}
pub struct StagedPackArchive {
    file: tempfile::NamedTempFile,
    proof: VerifiedManifest,
    target: PackTarget,
}
pub struct ExtractedPack {
    // Close the directory capability before TempDir attempts Windows cleanup.
    _directory: Dir,
    root: tempfile::TempDir,
    proof: VerifiedManifest,
    target: PackTarget,
    index: ValidatedArchiveIndex,
}
impl ExtractedPack {
    pub fn root_path(&self) -> &Path {
        self.root.path()
    }
    pub fn manifest(&self) -> &VerifiedManifest {
        &self.proof
    }
    pub fn target(&self) -> PackTarget {
        self.target
    }
    pub fn index(&self) -> &ValidatedArchiveIndex {
        &self.index
    }
}
impl PackArchiveStager {
    /// Low-level byte staging only. The installer must preflight trusted volume
    /// observations and its retained versions before beginning a download.
    pub fn new(
        proof: VerifiedManifest,
        target: PackTarget,
        temp_parent: &Path,
    ) -> PackResult<Self> {
        let checksum = proof.archive_checksum(target)?;
        if proof.artifact(target)?.download.format != PackArchiveFormat::Zip {
            return Err(PackError::UnsupportedArchive);
        }
        let file = tempfile::Builder::new()
            .prefix("tagma-pack-download-")
            .tempfile_in(temp_parent)
            .map_err(|_| PackError::WriteFailed)?;
        Ok(Self {
            file,
            checksum,
            proof,
            target,
            failed: false,
        })
    }
    /// Called from a bounded downloader; cancellation is cooperative between
    /// writes. This does not claim to interrupt a blocked network/kernel call.
    pub fn push(&mut self, bytes: &[u8], control: &PackStageControl) -> PackResult<()> {
        if self.failed {
            return Err(PackError::WriteFailed);
        }
        if let Err(error) = control.check() {
            self.failed = true;
            return Err(error);
        }
        for chunk in bytes.chunks(BUFFER) {
            if let Err(error) = control.check() {
                self.failed = true;
                return Err(error);
            }
            if let Err(error) = self.checksum.push(chunk) {
                self.failed = true;
                return Err(error);
            }
            if self.file.write_all(chunk).is_err() {
                self.failed = true;
                return Err(PackError::WriteFailed);
            }
        }
        Ok(())
    }
    pub fn finish(mut self, control: &PackStageControl) -> PackResult<StagedPackArchive> {
        if self.failed {
            return Err(PackError::WriteFailed);
        }
        control.check()?;
        self.checksum.finish()?;
        self.file
            .as_file()
            .sync_all()
            .map_err(|_| PackError::WriteFailed)?;
        control.check()?;
        self.file
            .seek(SeekFrom::Start(0))
            .map_err(|_| PackError::ReadFailed)?;
        Ok(StagedPackArchive {
            file: self.file,
            proof: self.proof,
            target: self.target,
        })
    }
}

struct ZipBounds {
    start: u64,
    count: usize,
}
fn zip_bounds(file: &mut std::fs::File, maximum_entries: u32) -> PackResult<ZipBounds> {
    let length = file
        .seek(SeekFrom::End(0))
        .map_err(|_| PackError::ReadFailed)?;
    if length < 22 {
        return Err(PackError::InvalidArchive);
    }
    file.seek(SeekFrom::Start(length - 22))
        .map_err(|_| PackError::ReadFailed)?;
    let mut end = [0; 22];
    file.read_exact(&mut end)
        .map_err(|_| PackError::InvalidArchive)?;
    let u16_at = |i| u16::from_le_bytes([end[i], end[i + 1]]);
    let u32_at = |i| u32::from_le_bytes([end[i], end[i + 1], end[i + 2], end[i + 3]]);
    if &end[..4] != b"PK\x05\x06" || u16_at(4) != 0 || u16_at(6) != 0 || u16_at(20) != 0 {
        return Err(PackError::UnsupportedArchive);
    }
    let count = u16_at(10);
    if count == 0 || count == u16::MAX || count != u16_at(8) || u32::from(count) > maximum_entries {
        return Err(PackError::ArchiveLimit);
    }
    let size = u64::from(u32_at(12));
    let start = u64::from(u32_at(16));
    if size > MAX_CENTRAL_BYTES || start.checked_add(size) != Some(length - 22) {
        return Err(PackError::ArchiveLimit);
    }
    // ZIP32 profile, no prepended executable or archive comments/ZIP64 footer.
    file.seek(SeekFrom::Start(0))
        .map_err(|_| PackError::ReadFailed)?;
    let mut first = [0; 4];
    file.read_exact(&mut first)
        .map_err(|_| PackError::InvalidArchive)?;
    if first != *b"PK\x03\x04" {
        return Err(PackError::UnsupportedArchive);
    }
    file.seek(SeekFrom::Start(start))
        .map_err(|_| PackError::ReadFailed)?;
    let mut central = vec![0; size as usize];
    file.read_exact(&mut central)
        .map_err(|_| PackError::InvalidArchive)?;
    // The library can fall back to an earlier footer after a bad directory.
    // Keep precisely one footer visible during metadata parsing, so a crafted
    // earlier ZIP64/count field cannot bypass our pre-allocation limits.
    if central
        .windows(4)
        .any(|s| matches!(s, b"PK\x05\x06" | b"PK\x06\x06" | b"PK\x06\x07"))
    {
        return Err(PackError::UnsupportedArchive);
    }
    file.seek(SeekFrom::Start(0))
        .map_err(|_| PackError::ReadFailed)?;
    Ok(ZipBounds {
        start,
        count: count as usize,
    })
}
struct GuardedReader<'a> {
    file: &'a mut std::fs::File,
    floor: u64,
    contents: Arc<AtomicBool>,
    control: &'a PackStageControl,
}
impl Read for GuardedReader<'_> {
    fn read(&mut self, bytes: &mut [u8]) -> std::io::Result<usize> {
        self.control.check().map_err(std::io::Error::other)?;
        if !self.contents.load(Ordering::Relaxed) {
            let position = self.file.stream_position()?;
            if position < self.floor {
                let count = bytes.len().min((self.floor - position) as usize);
                bytes[..count].fill(0);
                self.file.seek(SeekFrom::Start(position + count as u64))?;
                return Ok(count);
            }
        }
        self.file.read(bytes)
    }
}
impl Seek for GuardedReader<'_> {
    fn seek(&mut self, position: SeekFrom) -> std::io::Result<u64> {
        self.file.seek(position)
    }
}

impl StagedPackArchive {
    /// Always creates a new private directory. The caller cannot supply an
    /// existing extraction root, and no archive permissions/links are applied.
    pub fn extract(
        mut self,
        parent: &Path,
        control: &PackStageControl,
    ) -> PackResult<ExtractedPack> {
        control.check()?;
        let artifact = self.proof.artifact(self.target)?;
        let bounds = zip_bounds(
            self.file.as_file_mut(),
            artifact.resources.max_archive_entries,
        )?;
        control.check()?;
        let enabled = Arc::new(AtomicBool::new(false));
        let reader = GuardedReader {
            file: self.file.as_file_mut(),
            floor: bounds.start,
            contents: enabled.clone(),
            control,
        };
        let mut archive = zip::ZipArchive::with_config(
            zip::read::Config {
                archive_offset: zip::read::ArchiveOffset::Known(0),
            },
            reader,
        )
        .map_err(|_| zip_failure(control))?;
        if archive.len() != bounds.count || archive.central_directory_start() != bounds.start {
            return Err(PackError::InvalidArchiveIndex);
        }
        enabled.store(true, Ordering::Relaxed);
        let mut entries = Vec::with_capacity(archive.len());
        for i in 0..archive.len() {
            control.check()?;
            let file = archive.by_index_raw(i).map_err(|_| zip_failure(control))?;
            if file.encrypted()
                || file.extra_data().is_some_and(|extra| !extra.is_empty())
                || !matches!(
                    file.compression(),
                    zip::CompressionMethod::Stored | zip::CompressionMethod::Deflated
                )
            {
                return Err(PackError::UnsupportedArchive);
            }
            let raw = std::str::from_utf8(file.name_raw()).map_err(|_| PackError::UnsafePath)?;
            if raw != file.name() {
                return Err(PackError::UnsafePath);
            }
            let directory = file.is_dir();
            if directory && (file.size() != 0 || file.compressed_size() != 0) {
                return Err(PackError::InvalidArchive);
            }
            let path = if directory {
                raw.strip_suffix('/').ok_or(PackError::UnsafePath)?
            } else {
                raw
            };
            let mode = file.unix_mode().unwrap_or(0) & 0o170000;
            let kind = if file.is_symlink() {
                ArchiveEntryKind::Symlink
            } else if mode != 0 && mode != 0o100000 && mode != 0o040000 {
                ArchiveEntryKind::Other
            } else if directory {
                ArchiveEntryKind::Directory
            } else if mode == 0o040000 {
                ArchiveEntryKind::Other
            } else {
                ArchiveEntryKind::File
            };
            entries.push(ArchiveEntry {
                path: path.into(),
                kind,
                unpacked_bytes: file.size(),
            });
        }
        let index = self.proof.validate_archive_index(self.target, entries)?;
        control.check()?;
        let root = tempfile::Builder::new()
            .prefix("tagma-pack-stage-")
            .tempdir_in(parent)
            .map_err(|_| PackError::WriteFailed)?;
        let directory = Dir::open_ambient_dir(root.path(), cap_std::ambient_authority())
            .map_err(|_| PackError::WriteFailed)?;
        let mut total = 0u64;
        let mut buffer = [0; BUFFER];
        for (i, entry) in index.entries().iter().enumerate() {
            control.check()?;
            if entry.kind == ArchiveEntryKind::Directory {
                directory
                    .create_dir_all(&entry.path)
                    .map_err(|_| PackError::WriteFailed)?;
                continue;
            }
            if let Some((parent, _)) = entry.path.rsplit_once('/') {
                directory
                    .create_dir_all(parent)
                    .map_err(|_| PackError::WriteFailed)?;
            }
            let mut options = OpenOptions::new();
            options.write(true).create_new(true);
            #[cfg(unix)]
            {
                use cap_std::fs::OpenOptionsExt;
                options.mode(0o600);
            }
            let mut output = directory
                .open_with(&entry.path, &options)
                .map_err(|_| PackError::WriteFailed)?;
            let mut source = archive.by_index(i).map_err(|_| zip_failure(control))?;
            let mut written = 0u64;
            loop {
                control.check()?;
                let n = source.read(&mut buffer).map_err(|_| zip_failure(control))?;
                if n == 0 {
                    break;
                }
                written = written
                    .checked_add(n as u64)
                    .ok_or(PackError::ArchiveLimit)?;
                total = total.checked_add(n as u64).ok_or(PackError::ArchiveLimit)?;
                if written > entry.unpacked_bytes || total > artifact.resources.max_unpacked_bytes {
                    return Err(PackError::ArchiveLimit);
                }
                output
                    .write_all(&buffer[..n])
                    .map_err(|_| PackError::WriteFailed)?;
            }
            if written != entry.unpacked_bytes {
                return Err(PackError::InvalidArchive);
            }
            #[cfg(unix)]
            if entry.path == artifact.entry.executable {
                use cap_std::fs::PermissionsExt;
                output
                    .set_permissions(cap_std::fs::Permissions::from_mode(0o700))
                    .map_err(|_| PackError::WriteFailed)?;
            }
            output.sync_all().map_err(|_| PackError::WriteFailed)?;
        }
        if total != index.total_bytes() {
            return Err(PackError::InvalidArchive);
        }
        control.check()?;
        drop(archive);
        Ok(ExtractedPack {
            _directory: directory,
            root,
            proof: self.proof,
            target: self.target,
            index,
        })
    }
}
