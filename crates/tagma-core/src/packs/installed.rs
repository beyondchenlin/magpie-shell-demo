//! Installed version metadata in the existing immutable configuration snapshots.
//! Files are prepared first; the runtime checks health before this transaction.
//! Deactivation never deletes output or running-version files.
use super::*;
use crate::{AppError, AppResult, ConfigService, ConfigView, ErrorCode};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct InstalledPackVersion {
    pub version: String,
    pub preparation_id: String,
    pub manifest_sha256: String,
    pub display_name: String,
    pub installed_ms: String,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct InstalledPack {
    pub id: String,
    pub active_version: Option<String>,
    pub versions: Vec<InstalledPackVersion>,
}

pub fn validate_installations(packs: &[InstalledPack]) -> PackResult<()> {
    let mut ids = std::collections::HashSet::new();
    if packs.len() > 16 {
        return Err(PackError::InvalidPreparedPack);
    }
    for pack in packs {
        if !manifest::identifier(&pack.id)
            || !ids.insert(&pack.id)
            || pack.versions.is_empty()
            || pack.versions.len() > 8
        {
            return Err(PackError::InvalidPreparedPack);
        }
        let mut versions = std::collections::HashSet::new();
        for v in &pack.versions {
            if semver::Version::parse(&v.version).is_err()
                || v.version.len() > 80
                || !versions.insert(&v.version)
                || !uuid::Uuid::parse_str(&v.preparation_id)
                    .is_ok_and(|id| !id.is_nil() && id.to_string() == v.preparation_id)
                || v.manifest_sha256.len() != 64
                || !v
                    .manifest_sha256
                    .bytes()
                    .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
                || v.display_name.trim().is_empty()
                || v.display_name.len() > 240
                || v.display_name.chars().any(char::is_control)
                || !v
                    .installed_ms
                    .parse::<u64>()
                    .is_ok_and(|ms| ms.to_string() == v.installed_ms)
            {
                return Err(PackError::InvalidPreparedPack);
            }
        }
        if pack
            .active_version
            .as_ref()
            .is_some_and(|v| !versions.contains(v))
        {
            return Err(PackError::InvalidPreparedPack);
        }
    }
    Ok(())
}

impl ConfigService {
    /// Internal host API, deliberately not a deserializable desktop/HTTP command.
    /// Caller must verify the preparation for this configuration and complete its
    /// health protocol before invoking. `proof` has already passed trusted roots.
    pub fn activate_healthy_pack(
        &self,
        expected_revision: u32,
        proof: &VerifiedManifest,
        target: PackTarget,
        preparation: uuid::Uuid,
        now_ms: u64,
    ) -> AppResult<ConfigView> {
        let invalid = || AppError::new(ErrorCode::InvalidInput);
        let artifact = proof.artifact(target).map_err(|_| invalid())?;
        let manifest = proof.manifest();
        if preparation.is_nil()
            || now_ms < proof.verified_ms()
            || now_ms - proof.verified_ms() > 10_000
            || now_ms >= manifest.expires_ms
        {
            return Err(invalid());
        }
        let _operation = self.operation_lock()?;
        let (revision, mut snapshot) = self.read_snapshot()?;
        if revision != expected_revision {
            return Err(AppError::new(ErrorCode::ConfigConflict));
        }
        let new = InstalledPackVersion {
            version: manifest.version.clone(),
            preparation_id: preparation.to_string(),
            manifest_sha256: proof.sha256().into(),
            display_name: artifact
                .models
                .first()
                .map(|m| m.display_name.clone())
                .unwrap_or_else(|| manifest.id.clone()),
            installed_ms: now_ms.to_string(),
        };
        if let Some(pack) = snapshot
            .installed_packs
            .iter_mut()
            .find(|p| p.id == manifest.id)
        {
            if let Some(old) = pack.versions.iter().find(|v| v.version == manifest.version) {
                if old.preparation_id != new.preparation_id
                    || old.manifest_sha256 != new.manifest_sha256
                {
                    return Err(invalid());
                }
            } else {
                pack.versions.push(new);
            }
            pack.active_version = Some(manifest.version.clone());
        } else {
            snapshot.installed_packs.push(InstalledPack {
                id: manifest.id.clone(),
                active_version: Some(manifest.version.clone()),
                versions: vec![new],
            });
        }
        validate_installations(&snapshot.installed_packs).map_err(|_| invalid())?;
        self.commit(revision, &snapshot, None)?;
        self.view()
    }

    /// Stops future resolution; existing tasks retain their pinned preparation.
    /// The caller separately coordinates waiting/cancelling and owned-file cleanup.
    pub fn deactivate_pack(&self, expected_revision: u32, id: &str) -> AppResult<ConfigView> {
        let _operation = self.operation_lock()?;
        let (revision, mut snapshot) = self.read_snapshot()?;
        if revision != expected_revision {
            return Err(AppError::new(ErrorCode::ConfigConflict));
        }
        let pack = snapshot
            .installed_packs
            .iter_mut()
            .find(|p| p.id == id)
            .ok_or_else(|| AppError::new(ErrorCode::InvalidInput))?;
        pack.active_version = None;
        self.commit(revision, &snapshot, None)?;
        self.view()
    }
}
