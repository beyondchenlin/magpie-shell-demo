//! Monotonic safety policy, independent of desired/effective configuration snapshots.
use crate::{
    health::{health_connection, provider_fingerprint},
    service::ConfigSnapshot,
    *,
};
use rusqlite::{Connection, OptionalExtension, TransactionBehavior, params};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{collections::HashMap, path::Path};
use ts_rs::TS;
pub(crate) const CREATE_SECURITY_TABLES: &str = "CREATE TABLE security_head(singleton INTEGER PRIMARY KEY CHECK(singleton=1),revision INTEGER NOT NULL);INSERT INTO security_head VALUES(1,0);CREATE TABLE security_revocations(target TEXT PRIMARY KEY,revision INTEGER NOT NULL,cancel_inflight INTEGER NOT NULL CHECK(cancel_inflight IN(0,1)));CREATE INDEX security_revocations_revision ON security_revocations(revision);";
#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RevokeKind {
    GatewayToken,
    ProviderConnection,
}
#[derive(Debug, Clone, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct RevokeAccess {
    pub protocol_version: u32,
    pub expected_revision: u32,
    pub kind: RevokeKind,
    pub provider_id: Option<String>,
    pub cancel_inflight: bool,
}
#[derive(Debug, Clone, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct RotateGatewayToken {
    pub protocol_version: u32,
    pub expected_revision: u32,
    pub cancel_inflight: bool,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct SecurityView {
    pub revision: u32,
    pub gateway_token_revoked: bool,
    pub revoked_provider_ids: Vec<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct RevocationReceipt {
    pub revision: u32,
    pub cancel_inflight: bool,
}
#[derive(Clone)]
pub struct SecuritySnapshot {
    pub revision: u32,
    pub revoked: HashMap<String, bool>,
}
fn storage(_: impl std::fmt::Display) -> AppError {
    AppError::new(ErrorCode::StorageUnavailable)
}
pub fn gateway_target(reference: &str) -> String {
    format!("gateway:{:x}", Sha256::digest(reference.as_bytes()))
}
pub fn provider_target(fingerprint: &str) -> String {
    format!("provider:{fingerprint}")
}
pub(crate) fn read(db: &Connection, targets: &[String]) -> AppResult<SecuritySnapshot> {
    if targets.len() > 160 || targets.iter().any(|key| key.len() > 96) {
        return Err(AppError::new(ErrorCode::InvalidInput));
    }
    let revision = db
        .query_row(
            "SELECT revision FROM security_head WHERE singleton=1",
            [],
            |r| r.get::<_, u32>(0),
        )
        .map_err(storage)?;
    let mut revoked = HashMap::new();
    let maximum: u32 = db
        .query_row(
            "SELECT COALESCE(MAX(revision),0) FROM security_revocations",
            [],
            |row| row.get(0),
        )
        .map_err(storage)?;
    if maximum != revision {
        return Err(storage("revocation head mismatch"));
    }
    let mut query = db
        .prepare("SELECT revision,cancel_inflight FROM security_revocations WHERE target=?1")
        .map_err(storage)?;
    for target in targets {
        let item: Option<(u32, i64)> = query
            .query_row([target], |row| Ok((row.get(0)?, row.get(1)?)))
            .optional()
            .map_err(storage)?;
        if let Some((at, cancel)) = item {
            if at == 0 || at > revision || !(0..=1).contains(&cancel) {
                return Err(storage("revocation state"));
            }
            revoked.insert(target.clone(), cancel == 1);
        }
    }
    Ok(SecuritySnapshot { revision, revoked })
}
pub(crate) fn revoke(db: &Connection, target: &str, cancel: bool) -> AppResult<u32> {
    let old = read(db, &[target.to_owned()])?;
    if old
        .revoked
        .get(target)
        .is_some_and(|cancelled| *cancelled || !cancel)
    {
        return Ok(old.revision);
    }
    let revision = old
        .revision
        .checked_add(1)
        .ok_or_else(|| storage("revocation counter"))?;
    db.execute("INSERT INTO security_revocations VALUES(?1,?2,?3) ON CONFLICT(target) DO UPDATE SET revision=excluded.revision,cancel_inflight=MAX(security_revocations.cancel_inflight,excluded.cancel_inflight)",params![target,revision,cancel]).map_err(storage)?;
    db.execute(
        "UPDATE security_head SET revision=?1 WHERE singleton=1",
        [revision],
    )
    .map_err(storage)?;
    Ok(revision)
}
pub(crate) fn view(db: &Connection, snapshot: &ConfigSnapshot) -> AppResult<SecurityView> {
    let gateway = snapshot
        .gateway
        .credential_ref
        .as_deref()
        .map(gateway_target);
    let providers: Vec<_> = snapshot
        .providers
        .iter()
        .map(|p| (&p.provider.id, provider_target(&provider_fingerprint(p))))
        .collect();
    let targets: Vec<_> = gateway
        .iter()
        .cloned()
        .chain(providers.iter().map(|(_, key)| key.clone()))
        .collect();
    let current = read(db, &targets)?;
    Ok(SecurityView {
        revision: current.revision,
        gateway_token_revoked: gateway.is_some_and(|key| current.revoked.contains_key(&key)),
        revoked_provider_ids: providers
            .into_iter()
            .filter(|(_, key)| current.revoked.contains_key(key))
            .map(|(id, _)| id.clone())
            .collect(),
    })
}
impl ConfigService {
    pub fn read_runtime_security(
        directory: &Path,
        targets: &[String],
    ) -> AppResult<SecuritySnapshot> {
        let (_lease, mut db) = health_connection(directory, false)?;
        let tx = db.transaction().map_err(storage)?;
        read(&tx, targets)
    }
    pub fn revoke_access(&self, input: RevokeAccess) -> AppResult<RevocationReceipt> {
        check_protocol(input.protocol_version)?;
        let _operation = self.operation_lock()?;
        let (_lease, mut db) = health_connection(self.directory(), true)?;
        let tx = db
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(storage)?;
        let (revision, snapshot) = Self::read_db(&tx)?;
        if revision != input.expected_revision {
            return Err(AppError::new(ErrorCode::ConfigConflict));
        }
        let target = match input.kind {
            RevokeKind::GatewayToken if input.provider_id.is_none() => snapshot
                .gateway
                .credential_ref
                .as_deref()
                .map(gateway_target),
            RevokeKind::ProviderConnection => snapshot
                .providers
                .iter()
                .find(|p| Some(&p.provider.id) == input.provider_id.as_ref())
                .map(|p| provider_target(&provider_fingerprint(p))),
            _ => None,
        }
        .ok_or_else(|| AppError::new(ErrorCode::InvalidInput))?;
        let revision = revoke(&tx, &target, input.cancel_inflight)?;
        let cancel_inflight = read(&tx, std::slice::from_ref(&target))?
            .revoked
            .get(&target)
            == Some(&true);
        tx.commit().map_err(storage)?;
        Ok(RevocationReceipt {
            revision,
            cancel_inflight,
        })
    }
}
