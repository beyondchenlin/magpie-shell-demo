use super::*;
use ed25519_dalek::{Signature, VerifyingKey};
use sha2::{Digest, Sha256};
use std::collections::HashMap;

pub const MANIFEST_SIGNATURE_DOMAIN: &[u8] = b"Tagma pack manifest v1\0";

/// Supplied by a trusted application/release policy, never by a downloaded pack.
/// No production keys are installed by this module; the default denies all.
pub struct PackTrustRoot {
    pub key_id: String,
    pub publisher: String,
    pub public_key: [u8; 32],
    pub valid_from_ms: u64,
    pub valid_until_ms: u64,
}
struct TrustedKey {
    publisher: String,
    key: VerifyingKey,
    from: u64,
    until: u64,
}
#[derive(Default)]
pub struct PackTrustStore {
    keys: HashMap<String, TrustedKey>,
}
#[derive(Debug, Clone)]
pub struct VerifiedManifest {
    manifest: PackManifest,
    sha256: String,
    key_id: String,
    verified_ms: u64,
}
impl VerifiedManifest {
    pub fn manifest(&self) -> &PackManifest {
        &self.manifest
    }
    pub fn sha256(&self) -> &str {
        &self.sha256
    }
    pub fn key_id(&self) -> &str {
        &self.key_id
    }
    pub fn verified_ms(&self) -> u64 {
        self.verified_ms
    }
    pub fn artifact(&self, target: PackTarget) -> PackResult<&PackArtifact> {
        self.manifest
            .artifacts
            .iter()
            .find(|a| a.target == target)
            .ok_or(PackError::UnsupportedPlatform)
    }
    pub fn archive_checksum(&self, target: PackTarget) -> PackResult<ArchiveChecksum> {
        let a = self.artifact(target)?;
        Ok(ArchiveChecksum {
            expected_size: a.download.size_bytes,
            expected_hash: a.download.sha256.clone(),
            target,
            seen: 0,
            hash: Sha256::new(),
            failed: false,
        })
    }
}
impl PackTrustStore {
    pub fn new(roots: Vec<PackTrustRoot>) -> PackResult<Self> {
        if roots.len() > 16 {
            return Err(PackError::UntrustedPublisher);
        }
        let mut store = Self::default();
        for root in roots {
            if !manifest::identifier(&root.key_id)
                || !manifest::identifier(&root.publisher)
                || root.valid_from_ms >= root.valid_until_ms
                || root.valid_until_ms > i64::MAX as u64
                || store.keys.contains_key(&root.key_id)
            {
                return Err(PackError::UntrustedPublisher);
            }
            let key = VerifyingKey::from_bytes(&root.public_key)
                .map_err(|_| PackError::UntrustedPublisher)?;
            if key.is_weak() {
                return Err(PackError::UntrustedPublisher);
            }
            store.keys.insert(
                root.key_id,
                TrustedKey {
                    publisher: root.publisher,
                    key,
                    from: root.valid_from_ms,
                    until: root.valid_until_ms,
                },
            );
        }
        Ok(store)
    }
    pub fn verify(
        &self,
        key_id: &str,
        bytes: &[u8],
        signature: &[u8],
        now_ms: u64,
    ) -> PackResult<VerifiedManifest> {
        if bytes.is_empty() || bytes.len() > MAX_MANIFEST_BYTES {
            return Err(PackError::InvalidManifest);
        }
        let key = self.keys.get(key_id).ok_or(PackError::UntrustedPublisher)?;
        if now_ms < key.from || now_ms >= key.until {
            return Err(PackError::UntrustedPublisher);
        }
        let signature =
            Signature::from_slice(signature).map_err(|_| PackError::InvalidSignature)?;
        let mut message = Vec::with_capacity(MANIFEST_SIGNATURE_DOMAIN.len() + bytes.len());
        message.extend_from_slice(MANIFEST_SIGNATURE_DOMAIN);
        message.extend_from_slice(bytes);
        key.key
            .verify_strict(&message, &signature)
            .map_err(|_| PackError::InvalidSignature)?;
        let manifest = PackManifest::parse(bytes)?;
        if !matches!(&manifest.source,PackSource::Official{publisher} if *publisher==key.publisher)
        {
            return Err(PackError::UntrustedPublisher);
        }
        if now_ms < manifest.issued_ms || now_ms >= manifest.expires_ms {
            return Err(PackError::ExpiredManifest);
        }
        Ok(VerifiedManifest {
            manifest,
            sha256: format!("{:x}", Sha256::digest(bytes)),
            key_id: key_id.into(),
            verified_ms: now_ms,
        })
    }
}

/// Feed the exact bytes being downloaded/written. This verifies content, not a
/// later path or file identity; extraction/installation must bind that itself.
pub struct ArchiveChecksum {
    expected_size: u64,
    expected_hash: String,
    target: PackTarget,
    seen: u64,
    hash: Sha256,
    failed: bool,
}
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VerifiedArchiveDigest {
    sha256: String,
    size_bytes: u64,
    target: PackTarget,
}
impl VerifiedArchiveDigest {
    pub fn sha256(&self) -> &str {
        &self.sha256
    }
    pub fn size_bytes(&self) -> u64 {
        self.size_bytes
    }
    pub fn target(&self) -> PackTarget {
        self.target
    }
}
impl ArchiveChecksum {
    pub fn push(&mut self, bytes: &[u8]) -> PackResult<()> {
        if self.failed {
            return Err(PackError::ArchiveLimit);
        }
        let Some(seen) = self
            .seen
            .checked_add(bytes.len() as u64)
            .filter(|n| *n <= self.expected_size)
        else {
            self.failed = true;
            return Err(PackError::ArchiveLimit);
        };
        self.seen = seen;
        self.hash.update(bytes);
        Ok(())
    }
    pub fn finish(self) -> PackResult<VerifiedArchiveDigest> {
        if self.failed {
            return Err(PackError::ArchiveLimit);
        }
        let hash = format!("{:x}", self.hash.finalize());
        if self.seen != self.expected_size || hash != self.expected_hash {
            return Err(PackError::ChecksumMismatch);
        }
        Ok(VerifiedArchiveDigest {
            sha256: hash,
            size_bytes: self.seen,
            target: self.target,
        })
    }
}
