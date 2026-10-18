use super::*;
use std::collections::HashMap;

/// Portable ASCII paths; rejecting links is deliberate for the first contract.
pub fn validate_pack_path(path: &str) -> PackResult<()> {
    if path.is_empty() || path.len() > 240 {
        return Err(PackError::UnsafePath);
    }
    for part in path.split('/') {
        if part.is_empty()
            || part.len() > 64
            || matches!(part, "." | "..")
            || part.ends_with('.')
            || !part
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'.' | b'_' | b'-'))
        {
            return Err(PackError::UnsafePath);
        }
        let stem = part.split('.').next().unwrap_or("").to_ascii_uppercase();
        if matches!(stem.as_str(), "CON" | "PRN" | "AUX" | "NUL")
            || (stem.len() == 4
                && (stem.starts_with("COM") || stem.starts_with("LPT"))
                && matches!(stem.as_bytes()[3], b'1'..=b'9'))
        {
            return Err(PackError::UnsafePath);
        }
    }
    Ok(())
}
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ArchiveEntryKind {
    File,
    Directory,
    Symlink,
    Hardlink,
    Other,
}
#[derive(Debug, Clone)]
pub struct ArchiveEntry {
    pub path: String,
    pub kind: ArchiveEntryKind,
    pub unpacked_bytes: u64,
}
#[derive(Debug, Clone)]
pub struct ValidatedArchiveIndex {
    entries: Vec<ArchiveEntry>,
    total_bytes: u64,
    filesystem_entries: u32,
}
impl ValidatedArchiveIndex {
    pub fn entries(&self) -> &[ArchiveEntry] {
        &self.entries
    }
    pub fn total_bytes(&self) -> u64 {
        self.total_bytes
    }
    /// Files, explicit directories, and unique implicit parent directories.
    pub fn filesystem_entries(&self) -> u32 {
        self.filesystem_entries
    }
}
impl VerifiedManifest {
    /// Only validates decoder metadata. A real extractor must also reject links
    /// before opening files and protect its private root from filesystem races.
    pub fn validate_archive_index(
        &self,
        target: PackTarget,
        entries: Vec<ArchiveEntry>,
    ) -> PackResult<ValidatedArchiveIndex> {
        let artifact = self.artifact(target)?;
        if entries.is_empty() || entries.len() > artifact.resources.max_archive_entries as usize {
            return Err(PackError::ArchiveLimit);
        }
        let mut paths = HashMap::new();
        let mut filesystem_paths = HashMap::new();
        let mut total = 0u64;
        let mut executable = false;
        for entry in &entries {
            validate_pack_path(&entry.path)?;
            if !matches!(
                entry.kind,
                ArchiveEntryKind::File | ArchiveEntryKind::Directory
            ) || (entry.kind == ArchiveEntryKind::Directory && entry.unpacked_bytes != 0)
            {
                return Err(PackError::UnsafePath);
            }
            if paths
                .insert(entry.path.to_ascii_lowercase(), entry.kind)
                .is_some()
            {
                return Err(PackError::InvalidArchiveIndex);
            }
            // A single ZIP file may create many parents. Count every actual
            // path before writes, and use one spelling per case-folded parent
            // so Windows and case-sensitive filesystems share the same bound.
            for end in entry
                .path
                .match_indices('/')
                .map(|(i, _)| i)
                .chain(std::iter::once(entry.path.len()))
            {
                let prefix = &entry.path[..end];
                let previous = filesystem_paths
                    .entry(prefix.to_ascii_lowercase())
                    .or_insert(prefix);
                if *previous != prefix {
                    return Err(PackError::InvalidArchiveIndex);
                }
                if filesystem_paths.len() > artifact.resources.max_archive_entries as usize {
                    return Err(PackError::ArchiveLimit);
                }
            }
            total = total
                .checked_add(entry.unpacked_bytes)
                .ok_or(PackError::ArchiveLimit)?;
            if total > artifact.resources.max_unpacked_bytes {
                return Err(PackError::ArchiveLimit);
            }
            executable |= entry.kind == ArchiveEntryKind::File
                && entry.path == artifact.entry.executable
                && entry.unpacked_bytes > 0;
        }
        for path in paths.keys() {
            for (index, _) in path.match_indices('/') {
                if paths.get(&path[..index]) == Some(&ArchiveEntryKind::File) {
                    return Err(PackError::InvalidArchiveIndex);
                }
            }
        }
        if !executable {
            return Err(PackError::InvalidArchiveIndex);
        }
        let filesystem_entries = filesystem_paths.len() as u32;
        Ok(ValidatedArchiveIndex {
            entries,
            total_bytes: total,
            filesystem_entries,
        })
    }
}
