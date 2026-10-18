use super::*;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PackManifest {
    pub contract_version: u32,
    pub id: String,
    pub version: String,
    pub source: PackSource,
    pub issued_ms: u64,
    pub expires_ms: u64,
    pub artifacts: Vec<PackArtifact>,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum PackSource {
    Official { publisher: String },
    Community { publisher: String },
}
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct PackTarget {
    pub os: PackOs,
    pub arch: PackArch,
}
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum PackOs {
    Windows,
    Macos,
    Linux,
}
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum PackArch {
    X86_64,
    Aarch64,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PackArtifact {
    pub target: PackTarget,
    pub download: PackDownload,
    pub entry: PackEntry,
    pub resources: PackResources,
    pub permissions: PackPermissions,
    pub health: PackHealth,
    pub models: Vec<PackModel>,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PackDownload {
    pub url: String,
    pub sha256: String,
    pub size_bytes: u64,
    pub format: PackArchiveFormat,
}
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PackArchiveFormat {
    Zip,
    TarGz,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PackEntry {
    pub protocol: PackEntryProtocol,
    /// Relative to the private installed version, never a shell command line.
    pub executable: String,
    /// Literal argv, without shell expansion. Not an OS security boundary.
    pub arguments: Vec<String>,
}
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PackEntryProtocol {
    StdioJsonlV1,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PackResources {
    pub max_unpacked_bytes: u64,
    /// Also bounds unique filesystem entries, including implicit parents.
    pub max_archive_entries: u32,
    pub memory_mib: u32,
    pub max_concurrency: u8,
    pub task_timeout_ms: u32,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PackPermissions {
    pub network_hosts: Vec<String>,
    pub workspace: PackWorkspaceAccess,
    pub browser: bool,
    pub subprocess: bool,
}
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PackWorkspaceAccess {
    None,
    Read,
    ReadWrite,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PackHealth {
    pub protocol: PackHealthProtocol,
    pub timeout_ms: u32,
}
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PackHealthProtocol {
    StdioPingV1,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PackModel {
    pub id: String,
    pub display_name: String,
}

pub(super) fn identifier(value: &str) -> bool {
    (2..=64).contains(&value.len())
        && value
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        && value.as_bytes()[0].is_ascii_alphanumeric()
        && value.as_bytes()[value.len() - 1].is_ascii_alphanumeric()
}
fn text(value: &str, max: usize) -> bool {
    !value.trim().is_empty() && value.len() <= max && !value.chars().any(char::is_control)
}
pub(super) fn dns_host(host: &str) -> bool {
    let Ok(url::Host::Domain(domain)) = url::Host::parse(host) else {
        return false;
    };
    domain == host
        && domain.contains('.')
        && !domain.ends_with('.')
        && domain.split('.').all(|label| {
            !label.is_empty()
                && label.len() <= 63
                && label
                    .bytes()
                    .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
                && label.as_bytes()[0].is_ascii_alphanumeric()
                && label.as_bytes()[label.len() - 1].is_ascii_alphanumeric()
        })
        && !domain.ends_with(".localhost")
        && !domain.ends_with(".local")
}
impl PackManifest {
    pub fn parse(bytes: &[u8]) -> PackResult<Self> {
        if bytes.is_empty() || bytes.len() > MAX_MANIFEST_BYTES {
            return Err(PackError::InvalidManifest);
        }
        let manifest: Self =
            serde_json::from_slice(bytes).map_err(|_| PackError::InvalidManifest)?;
        manifest.validate()?;
        Ok(manifest)
    }
    pub fn validate(&self) -> PackResult<()> {
        if self.contract_version != PACK_CONTRACT_VERSION {
            return Err(PackError::UnsupportedContract);
        }
        let invalid = || PackError::InvalidManifest;
        let version = semver::Version::parse(&self.version).map_err(|_| invalid())?;
        let publisher = match &self.source {
            PackSource::Official { publisher } | PackSource::Community { publisher } => publisher,
        };
        if !identifier(&self.id)
            || self.version.len() > 80
            || !version.build.is_empty()
            || !identifier(publisher)
            || self.issued_ms >= self.expires_ms
            || self.expires_ms > i64::MAX as u64
            || self.expires_ms - self.issued_ms > 90 * 86_400_000
            || self.artifacts.is_empty()
            || self.artifacts.len() > 6
        {
            return Err(invalid());
        }
        let mut targets = HashSet::new();
        for a in &self.artifacts {
            if !targets.insert(a.target) {
                return Err(invalid());
            }
            let d = &a.download;
            let u = url::Url::parse(&d.url).map_err(|_| invalid())?;
            if d.url.len() > 2048
                || u.scheme() != "https"
                || u.host_str().is_none_or(|h| !dns_host(h))
                || !u.username().is_empty()
                || u.password().is_some()
                || u.query().is_some()
                || u.fragment().is_some()
                || u.port_or_known_default() != Some(443)
                || d.sha256.len() != 64
                || !d
                    .sha256
                    .bytes()
                    .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
                || !(1..=MAX_ARCHIVE_BYTES).contains(&d.size_bytes)
            {
                return Err(invalid());
            }
            validate_pack_path(&a.entry.executable)?;
            if a.entry.arguments.len() > 16 || a.entry.arguments.iter().any(|arg| !text(arg, 256)) {
                return Err(invalid());
            }
            let r = &a.resources;
            if !(1..=MAX_UNPACKED_BYTES).contains(&r.max_unpacked_bytes)
                || !(1..=MAX_ARCHIVE_ENTRIES).contains(&r.max_archive_entries)
                || !(16..=65536).contains(&r.memory_mib)
                || !(1..=8).contains(&r.max_concurrency)
                || !(1000..=3_600_000).contains(&r.task_timeout_ms)
                || !(100..=10_000).contains(&a.health.timeout_ms)
            {
                return Err(invalid());
            }
            let mut hosts = HashSet::new();
            if a.permissions.network_hosts.len() > 32
                || a.permissions
                    .network_hosts
                    .iter()
                    .any(|h| h.len() > 253 || !dns_host(h) || !hosts.insert(h))
            {
                return Err(invalid());
            }
            if a.models.len() > 1
                || a.models
                    .iter()
                    .any(|m| m.id != format!("tagma/{}", self.id) || !text(&m.display_name, 240))
            {
                return Err(invalid());
            }
        }
        Ok(())
    }
}
