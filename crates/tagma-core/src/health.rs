//! Operational model observations: no request bodies, secrets or implicit paid probes.
use crate::{
    service::{ConfigSnapshot, ProviderRecord},
    *,
};
use fs2::FileExt;
use rusqlite::{Connection, OpenFlags, OptionalExtension, TransactionBehavior, params};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs::OpenOptions,
    path::Path,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use ts_rs::TS;

pub const HEALTH_TTL_MS: u64 = 5 * 60 * 1000;
pub(crate) const CREATE_HEALTH_TABLE: &str = "CREATE TABLE model_health(provider_id TEXT NOT NULL,model_id TEXT NOT NULL,fingerprint TEXT NOT NULL,observation TEXT NOT NULL,PRIMARY KEY(provider_id,model_id));";
#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum HealthFailure {
    Authentication,
    Connection,
    Timeout,
    RateLimited,
    Protocol,
    Upstream,
    ObservationUnconfirmed,
}
impl HealthFailure {
    /// Same-millisecond conflicts keep the more definite failure, never a success.
    pub fn precedence(&self) -> u8 {
        match self {
            Self::Authentication => 7,
            Self::Protocol => 6,
            Self::Connection => 5,
            Self::Timeout => 4,
            Self::RateLimited => 3,
            Self::Upstream => 2,
            Self::ObservationUnconfirmed => 1,
        }
    }
}
#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InferenceHealth {
    Unknown,
    Ready,
    Stale,
    Failed,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ModelHealthView {
    pub provider_id: String,
    pub model_id: String,
    pub catalog_age_seconds: Option<u32>,
    pub inference_age_seconds: Option<u32>,
    pub inference: InferenceHealth,
    pub failure: Option<HealthFailure>,
}
#[derive(Debug, Clone)]
pub enum HealthObservation {
    CatalogSeen,
    InferenceSucceeded,
    InferenceFailed(HealthFailure),
}
impl HealthObservation {
    pub fn precedence(&self) -> u8 {
        match self {
            Self::InferenceFailed(failure) => failure.precedence() + 1,
            _ => 0,
        }
    }
}
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(deny_unknown_fields)]
pub struct ModelHealthRecord {
    #[serde(skip)]
    pub provider_revoked: bool,
    #[serde(skip)]
    pub provider_check_blocked_ms: Option<u64>,
    pub provider_id: String,
    pub model_id: String,
    pub fingerprint: String,
    pub catalog_seen_ms: Option<u64>,
    pub inference_succeeded_ms: Option<u64>,
    pub inference_failed_ms: Option<u64>,
    pub failure: Option<HealthFailure>,
}
fn storage(_: impl std::fmt::Display) -> AppError {
    AppError::new(ErrorCode::StorageUnavailable)
}
pub fn now_ms() -> AppResult<u64> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(storage)?
        .as_millis()
        .try_into()
        .map_err(storage)
}
pub fn provider_fingerprint(provider: &ProviderRecord) -> String {
    let identity = serde_json::to_vec(&(
        &provider.provider.id,
        &provider.provider.protocol,
        &provider.provider.base_url,
        &provider.credential_ref,
    ))
    .expect("fixed provider identity serializes");
    format!("{:x}", Sha256::digest(identity))
}

/// Resolve one text-capable brain in the effective global provider/model order.
/// Catalog observations alone never qualify; a future timestamp is not fresh.
pub fn select_first_cloud(
    snapshot: &ConfigSnapshot,
    records: &[ModelHealthRecord],
    now: u64,
) -> Option<crate::teams::CloudTarget> {
    let by_model: std::collections::HashMap<_, _> = records
        .iter()
        .map(|record| {
            (
                (record.provider_id.as_str(), record.model_id.as_str()),
                record,
            )
        })
        .collect();
    let providers: std::collections::HashMap<_, _> = snapshot
        .providers
        .iter()
        .map(|record| (record.provider.id.as_str(), record))
        .collect();
    for id in snapshot.first_cloud_provider_order().ok()? {
        let provider = providers.get(id.as_str())?;
        if !provider.provider.enabled {
            continue;
        }
        let fingerprint = provider_fingerprint(provider);
        for model in &provider.provider.models {
            if model.starts_with("tagma/") {
                continue;
            }
            if by_model
                .get(&(provider.provider.id.as_str(), model.as_str()))
                .is_some_and(|record| {
                    !record.provider_revoked
                        && record.fingerprint == fingerprint
                        && record.is_ready(now)
                        && record.provider_check_blocked_ms.is_none_or(|blocked| {
                            record
                                .inference_succeeded_ms
                                .is_some_and(|success| success > blocked)
                        })
                })
            {
                return Some(crate::teams::CloudTarget {
                    provider_id: provider.provider.id.clone(),
                    model_id: model.clone(),
                });
            }
        }
    }
    None
}
impl ModelHealthRecord {
    pub fn is_ready(&self, now: u64) -> bool {
        self.inference_succeeded_ms.is_some_and(|success| {
            success <= now
                && now - success < HEALTH_TTL_MS
                && self
                    .inference_failed_ms
                    .is_none_or(|failure| failure < success)
        })
    }
    pub fn view(&self, now: u64) -> ModelHealthView {
        let age = |time: Option<u64>| {
            time.filter(|time| *time <= now)
                .map(|time| ((now - time) / 1000).min(u32::MAX.into()) as u32)
        };
        let failed = self.inference_failed_ms.is_some_and(|failure| {
            self.inference_succeeded_ms
                .is_none_or(|success| failure >= success)
        });
        let inference = if failed && self.failure == Some(HealthFailure::ObservationUnconfirmed) {
            if self.inference_succeeded_ms.is_some() {
                InferenceHealth::Stale
            } else {
                InferenceHealth::Unknown
            }
        } else if failed {
            InferenceHealth::Failed
        } else if self.is_ready(now) {
            InferenceHealth::Ready
        } else if self.inference_succeeded_ms.is_some() {
            InferenceHealth::Stale
        } else {
            InferenceHealth::Unknown
        };
        ModelHealthView {
            provider_id: self.provider_id.clone(),
            model_id: self.model_id.clone(),
            catalog_age_seconds: age(self.catalog_seen_ms),
            inference_age_seconds: age(self.inference_succeeded_ms),
            inference,
            failure: self.failure.clone(),
        }
    }
    fn observe(&mut self, observation: HealthObservation, time: u64) {
        match observation {
            HealthObservation::CatalogSeen => {
                self.catalog_seen_ms = Some(self.catalog_seen_ms.unwrap_or(0).max(time));
            }
            HealthObservation::InferenceSucceeded => {
                if self
                    .inference_succeeded_ms
                    .is_none_or(|previous| time >= previous)
                {
                    self.inference_succeeded_ms = Some(time);
                }
                if self
                    .inference_failed_ms
                    .is_some_and(|failure| time > failure)
                {
                    self.inference_failed_ms = None;
                    self.failure = None;
                }
            }
            HealthObservation::InferenceFailed(failure) => {
                if self.inference_failed_ms.is_none_or(|previous| {
                    time > previous
                        || (time == previous
                            && self
                                .failure
                                .as_ref()
                                .is_none_or(|old| failure.precedence() > old.precedence()))
                }) && self
                    .inference_succeeded_ms
                    .is_none_or(|success| time >= success)
                {
                    self.inference_failed_ms = Some(time);
                    self.failure = Some(failure);
                }
            }
        }
    }
}
pub(crate) fn records(
    db: &Connection,
    snapshot: &ConfigSnapshot,
) -> AppResult<Vec<ModelHealthRecord>> {
    let mut statement = db
        .prepare("SELECT provider_id,model_id,fingerprint,observation FROM model_health")
        .map_err(storage)?;
    let rows = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(storage)?;
    let fingerprints: std::collections::HashMap<_, _> = snapshot
        .providers
        .iter()
        .filter(|provider| provider.provider.enabled)
        .map(|provider| {
            (
                &provider.provider.id,
                (provider_fingerprint(provider), provider),
            )
        })
        .collect();
    let revoked: std::collections::HashSet<_> = crate::security::view(db, snapshot)?
        .revoked_provider_ids
        .into_iter()
        .collect();
    let checks: std::collections::HashMap<_, _> = crate::catalog::records(db, snapshot)?
        .into_iter()
        .map(|r| {
            (
                r.provider_id,
                if r.outcome == crate::catalog::CatalogOutcome::Pending {
                    Some(r.blocked_ms.unwrap_or(0).max(r.attempted_ms))
                } else {
                    r.blocked_ms
                },
            )
        })
        .collect();
    let mut result = Vec::new();
    for row in rows {
        let (id, model, fingerprint, json) = row.map_err(storage)?;
        let Some((expected, provider)) = fingerprints.get(&id) else {
            continue;
        };
        if expected != &fingerprint || !provider.provider.models.contains(&model) {
            continue;
        }
        if json.len() > 4096 {
            return Err(AppError::new(ErrorCode::StorageUnavailable));
        }
        let mut record: ModelHealthRecord = serde_json::from_str(&json).map_err(storage)?;
        if record.provider_id != id || record.model_id != model || record.fingerprint != fingerprint
        {
            return Err(AppError::new(ErrorCode::StorageUnavailable));
        }
        record.provider_check_blocked_ms = checks.get(&id).copied().flatten();
        record.provider_revoked = revoked.contains(&id);
        result.push(record);
    }
    Ok(result)
}
impl ConfigService {
    /// Preserve old success facts, but make an unconfirmed prior runtime ineligible.
    /// This is operational metadata, not a configuration revision or a provider failure.
    pub fn invalidate_unconfirmed_runtime_health(directory: &Path) -> AppResult<()> {
        let (_lease, mut db) = health_connection(directory, true)?;
        let tx = db
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(storage)?;
        let (_, snapshot) = Self::read_db(&tx)?;
        let current: std::collections::HashMap<_, _> = snapshot
            .providers
            .iter()
            .map(|p| {
                (
                    &p.provider.id,
                    (provider_fingerprint(p), &p.provider.models),
                )
            })
            .collect();
        let rows = {
            let mut statement = tx
                .prepare("SELECT provider_id,model_id,fingerprint,observation FROM model_health")
                .map_err(storage)?;
            statement
                .query_map([], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, String>(3)?,
                    ))
                })
                .map_err(storage)?
                .collect::<Result<Vec<_>, _>>()
                .map_err(storage)?
        };
        let observed_now = now_ms()?;
        for (id, model, fingerprint, json) in rows {
            if !current.get(&id).is_some_and(|(expected, models)| {
                expected == &fingerprint && models.contains(&model)
            }) {
                continue;
            }
            if json.len() > 4096 {
                return Err(AppError::new(ErrorCode::StorageUnavailable));
            }
            let mut record: ModelHealthRecord = serde_json::from_str(&json).map_err(storage)?;
            if record.provider_id != id
                || record.model_id != model
                || record.fingerprint != fingerprint
            {
                return Err(AppError::new(ErrorCode::StorageUnavailable));
            }
            record.observe(
                HealthObservation::InferenceFailed(HealthFailure::ObservationUnconfirmed),
                observed_now,
            );
            tx.execute(
                "UPDATE model_health SET observation=?3 WHERE provider_id=?1 AND model_id=?2",
                params![id, model, serde_json::to_string(&record).map_err(storage)?],
            )
            .map_err(storage)?;
        }
        crate::catalog::invalidate_pending(&tx, &snapshot, observed_now)?;
        tx.commit().map_err(storage)
    }
    /// Runtime observations do not open/migrate configuration or access the credential store.
    /// A generation that no longer matches the desired provider is ignored, never reassigned.
    pub fn record_runtime_health(
        directory: &Path,
        provider_id: &str,
        model_id: &str,
        fingerprint: &str,
        observation: HealthObservation,
    ) -> AppResult<bool> {
        record_at(
            directory,
            provider_id,
            model_id,
            fingerprint,
            observation,
            now_ms()?,
        )
    }
    pub fn read_runtime_health(
        directory: &Path,
        snapshot: &ConfigSnapshot,
    ) -> AppResult<Vec<ModelHealthRecord>> {
        let (_lease, db) = health_connection(directory, false)?;
        records(&db, snapshot)
    }
    /// Trusted runtime callers supply the time captured when the response was observed.
    /// No frontend command accepts a caller-provided health timestamp.
    pub fn record_observed_runtime_health(
        directory: &Path,
        provider_id: &str,
        model_id: &str,
        fingerprint: &str,
        observation: HealthObservation,
        observed_at_ms: u64,
    ) -> AppResult<bool> {
        record_at(
            directory,
            provider_id,
            model_id,
            fingerprint,
            observation,
            observed_at_ms,
        )
    }
}
pub(crate) fn health_connection(
    directory: &Path,
    write: bool,
) -> AppResult<(std::fs::File, Connection)> {
    // The directory/database must already exist. Never create a second store on runtime paths.
    if !directory.join("config.sqlite3").is_file() {
        return Err(AppError::new(ErrorCode::StorageUnavailable));
    }
    let lease = OpenOptions::new()
        .read(true)
        .write(true)
        .open(directory.join("maintenance.lock"))
        .map_err(storage)?;
    FileExt::try_lock_shared(&lease)
        .map_err(|_| AppError::new(ErrorCode::MaintenanceInProgress))?;
    if crate::migrations::pending(directory) {
        return Err(AppError::new(ErrorCode::MaintenanceInProgress));
    }
    let db = Connection::open_with_flags(
        directory.join("config.sqlite3"),
        if write {
            OpenFlags::SQLITE_OPEN_READ_WRITE
        } else {
            OpenFlags::SQLITE_OPEN_READ_ONLY
        },
    )
    .map_err(storage)?;
    db.busy_timeout(Duration::from_millis(250))
        .map_err(storage)?;
    let schema: u32 = db
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .map_err(storage)?;
    let owner: u32 = db
        .pragma_query_value(None, "application_id", |row| row.get(0))
        .map_err(storage)?;
    if schema != SCHEMA_VERSION || owner != 0x5441474d {
        return Err(AppError::new(ErrorCode::IncompatibleVersion));
    }
    Ok((lease, db))
}
fn record_at(
    directory: &Path,
    provider_id: &str,
    model_id: &str,
    fingerprint: &str,
    observation: HealthObservation,
    time: u64,
) -> AppResult<bool> {
    let (_lease, mut db) = health_connection(directory, true)?;
    // This transaction serializes the generation check with config commits. Do not
    // take the business operation lock: metadata must not cause spurious stale-edit errors.
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(storage)?;
    let (_, snapshot) = ConfigService::read_db(&tx)?;
    let Some(provider) = snapshot.providers.iter().find(|provider| {
        provider.provider.id == provider_id
            && provider.provider.enabled
            && provider
                .provider
                .models
                .iter()
                .any(|model| model == model_id)
    }) else {
        return Ok(false);
    };
    if provider_fingerprint(provider) != fingerprint {
        return Ok(false);
    }
    let saved: Option<(String, String)> = tx
        .query_row(
            "SELECT fingerprint,observation FROM model_health WHERE provider_id=?1 AND model_id=?2",
            params![provider_id, model_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(storage)?;
    let mut record = match saved {
        Some((previous, json)) if previous == fingerprint => {
            if json.len() > 4096 {
                return Err(AppError::new(ErrorCode::StorageUnavailable));
            }
            let record: ModelHealthRecord = serde_json::from_str(&json).map_err(storage)?;
            if record.provider_id != provider_id
                || record.model_id != model_id
                || record.fingerprint != fingerprint
            {
                return Err(AppError::new(ErrorCode::StorageUnavailable));
            }
            record
        }
        _ => ModelHealthRecord {
            provider_id: provider_id.into(),
            model_id: model_id.into(),
            fingerprint: fingerprint.into(),
            ..Default::default()
        },
    };
    record.observe(observation, time);
    tx.execute("INSERT INTO model_health VALUES(?1,?2,?3,?4) ON CONFLICT(provider_id,model_id) DO UPDATE SET fingerprint=excluded.fingerprint,observation=excluded.observation",params![provider_id,model_id,fingerprint,serde_json::to_string(&record).map_err(storage)?]).map_err(storage)?;
    tx.commit().map_err(storage)?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    fn provider(revision: u32) -> SaveProvider {
        SaveProvider {
            protocol_version: 1,
            expected_revision: revision,
            id: None,
            name: "health fixture".into(),
            protocol: ProviderProtocol::OpenaiChatCompletions,
            base_url: "https://example.invalid/v1".into(),
            enabled: true,
            models: vec!["model".into()],
            credential: None,
        }
    }
    #[test]
    fn catalog_is_not_inference_and_five_minute_boundary_is_strict() {
        let mut record = ModelHealthRecord::default();
        record.observe(HealthObservation::CatalogSeen, 1000);
        assert!(!record.is_ready(1000));
        assert_eq!(record.view(1000).inference, InferenceHealth::Unknown);
        record.observe(HealthObservation::InferenceSucceeded, 1000);
        assert!(record.is_ready(1000));
        assert!(record.is_ready(1000 + HEALTH_TTL_MS - 1));
        assert!(!record.is_ready(1000 + HEALTH_TTL_MS));
        assert!(!record.is_ready(999));
        assert_eq!(record.view(999).inference, InferenceHealth::Stale);
        record.observe(
            HealthObservation::InferenceFailed(HealthFailure::Authentication),
            1100,
        );
        assert!(!record.is_ready(1100));
        record.observe(HealthObservation::InferenceSucceeded, 1050);
        assert!(!record.is_ready(1100));
        record.observe(HealthObservation::InferenceSucceeded, 1200);
        assert!(record.is_ready(1200));
        assert!(record.failure.is_none());
    }
    #[test]
    fn runtime_health_is_persistent_generation_bound_and_does_not_change_revisions() {
        let temp = tempfile::tempdir().unwrap();
        let service =
            ConfigService::open(temp.path(), Arc::new(crate::credentials::SystemCredentials))
                .unwrap();
        let p = service.save_provider(provider(0)).unwrap().providers[0].clone();
        let snapshot = service.read_snapshot().unwrap().1;
        let fingerprint = provider_fingerprint(&snapshot.providers[0]);
        assert!(
            record_at(
                temp.path(),
                &p.id,
                "model",
                &fingerprint,
                HealthObservation::InferenceSucceeded,
                1000
            )
            .unwrap()
        );
        assert_eq!(service.view().unwrap().desired_revision, 1);
        let saved = ConfigService::read_runtime_health(temp.path(), &snapshot).unwrap();
        assert_eq!(saved.len(), 1);
        assert!(saved[0].is_ready(1001));
        let mut changed = provider(1);
        changed.id = Some(p.id.clone());
        changed.base_url = "https://changed.invalid/v1".into();
        service.save_provider(changed).unwrap();
        assert!(
            !record_at(
                temp.path(),
                &p.id,
                "model",
                &fingerprint,
                HealthObservation::InferenceSucceeded,
                2000
            )
            .unwrap()
        );
        assert!(
            ConfigService::read_runtime_health(temp.path(), &service.read_snapshot().unwrap().1)
                .unwrap()
                .is_empty()
        );
        assert_eq!(service.view().unwrap().desired_revision, 2);
    }
    #[test]
    fn runtime_health_never_initializes_or_migrates_an_unknown_store() {
        let temp = tempfile::tempdir().unwrap();
        assert!(
            ConfigService::read_runtime_health(temp.path(), &ConfigSnapshot::default()).is_err()
        );
        assert!(!temp.path().join("config.sqlite3").exists());
        let service =
            ConfigService::open(temp.path(), Arc::new(crate::credentials::SystemCredentials))
                .unwrap();
        drop(service);
        let db = Connection::open(temp.path().join("config.sqlite3")).unwrap();
        db.pragma_update(None, "user_version", 3).unwrap();
        drop(db);
        assert_eq!(
            ConfigService::read_runtime_health(temp.path(), &ConfigSnapshot::default())
                .err()
                .unwrap()
                .code,
            ErrorCode::IncompatibleVersion
        );
        let db = Connection::open(temp.path().join("config.sqlite3")).unwrap();
        assert_eq!(
            db.pragma_query_value::<u32, _>(None, "user_version", |r| r.get(0))
                .unwrap(),
            3
        );
    }

    #[test]
    fn model_reorder_and_enable_toggle_preserve_observations_but_removed_models_do_not() {
        let temp = tempfile::tempdir().unwrap();
        let service =
            ConfigService::open(temp.path(), Arc::new(crate::credentials::SystemCredentials))
                .unwrap();
        let mut input = provider(0);
        input.models.push("second".into());
        let p = service.save_provider(input).unwrap().providers[0].clone();
        let fingerprint = provider_fingerprint(&service.read_snapshot().unwrap().1.providers[0]);
        assert!(
            record_at(
                temp.path(),
                &p.id,
                "model",
                &fingerprint,
                HealthObservation::InferenceSucceeded,
                1000
            )
            .unwrap()
        );
        let save = |revision, enabled, models: Vec<String>| SaveProvider {
            protocol_version: 1,
            expected_revision: revision,
            id: Some(p.id.clone()),
            name: p.name.clone(),
            protocol: p.protocol.clone(),
            base_url: p.base_url.clone(),
            enabled,
            models,
            credential: None,
        };
        service
            .save_provider(save(1, true, vec!["second".into(), "model".into()]))
            .unwrap();
        assert_eq!(
            ConfigService::read_runtime_health(temp.path(), &service.read_snapshot().unwrap().1)
                .unwrap()
                .len(),
            1
        );
        service
            .save_provider(save(2, false, vec!["second".into(), "model".into()]))
            .unwrap();
        assert!(
            ConfigService::read_runtime_health(temp.path(), &service.read_snapshot().unwrap().1)
                .unwrap()
                .is_empty()
        );
        service
            .save_provider(save(3, true, vec!["second".into(), "model".into()]))
            .unwrap();
        assert!(
            ConfigService::read_runtime_health(temp.path(), &service.read_snapshot().unwrap().1)
                .unwrap()[0]
                .is_ready(1001)
        );
        service
            .save_provider(save(4, true, vec!["second".into()]))
            .unwrap();
        assert!(
            ConfigService::read_runtime_health(temp.path(), &service.read_snapshot().unwrap().1)
                .unwrap()
                .is_empty()
        );
        assert!(
            !record_at(
                temp.path(),
                &p.id,
                "model",
                &fingerprint,
                HealthObservation::InferenceSucceeded,
                2000
            )
            .unwrap()
        );
    }
    #[test]
    fn credential_generation_changes_fingerprint_without_exposing_the_reference_in_views() {
        let mut provider = ProviderRecord {
            provider: Provider {
                id: uuid::Uuid::new_v4().to_string(),
                name: "test".into(),
                protocol: ProviderProtocol::OpenaiChatCompletions,
                base_url: "https://example.invalid/v1".into(),
                enabled: true,
                models: vec!["model".into()],
                has_credential: true,
            },
            credential_ref: Some("synthetic-reference-1".into()),
        };
        let before = provider_fingerprint(&provider);
        provider.credential_ref = Some("synthetic-reference-2".into());
        assert_ne!(before, provider_fingerprint(&provider));
        let view = ModelHealthRecord {
            provider_id: provider.provider.id,
            model_id: "model".into(),
            fingerprint: before,
            ..Default::default()
        }
        .view(1000);
        let json = serde_json::to_string(&view).unwrap();
        assert!(!json.contains("reference"));
        assert!(!json.contains("fingerprint"));
    }

    #[test]
    fn first_cloud_uses_both_global_orders_and_rejects_stale_failed_or_replaced_generations() {
        let make = |name: &str| ProviderRecord {
            provider: Provider {
                id: uuid::Uuid::new_v4().to_string(),
                name: name.into(),
                protocol: ProviderProtocol::OpenaiChatCompletions,
                base_url: "https://example.invalid/v1".into(),
                enabled: true,
                models: vec!["first".into(), "second".into()],
                has_credential: false,
            },
            credential_ref: None,
        };
        let mut snapshot = ConfigSnapshot {
            providers: vec![make("one"), make("two")],
            ..Default::default()
        };
        let record = |provider: &ProviderRecord, model: &str| ModelHealthRecord {
            provider_id: provider.provider.id.clone(),
            model_id: model.into(),
            fingerprint: provider_fingerprint(provider),
            inference_succeeded_ms: Some(1000),
            ..Default::default()
        };
        let mut records = vec![
            record(&snapshot.providers[1], "first"),
            record(&snapshot.providers[0], "second"),
            record(&snapshot.providers[0], "first"),
        ];
        assert_eq!(
            select_first_cloud(&snapshot, &records, 1001).unwrap(),
            crate::teams::CloudTarget {
                provider_id: snapshot.providers[0].provider.id.clone(),
                model_id: "first".into()
            }
        );
        snapshot.providers[0].provider.models.reverse();
        assert_eq!(
            select_first_cloud(&snapshot, &records, 1001)
                .unwrap()
                .model_id,
            "second"
        );
        snapshot.providers.swap(0, 1);
        assert_eq!(
            select_first_cloud(&snapshot, &records, 1001)
                .unwrap()
                .provider_id,
            snapshot.providers[0].provider.id
        );
        snapshot.providers[0].provider.enabled = false;
        assert_eq!(
            select_first_cloud(&snapshot, &records, 1001)
                .unwrap()
                .provider_id,
            snapshot.providers[1].provider.id
        );
        snapshot.providers[1].credential_ref = Some("changed-generation".into());
        assert!(select_first_cloud(&snapshot, &records, 1001).is_none());
        snapshot.providers[1].credential_ref = None;
        assert!(select_first_cloud(&snapshot, &records, 1000 + HEALTH_TTL_MS).is_none());
        assert!(select_first_cloud(&snapshot, &records, 999).is_none());
        for record in &mut records {
            record.inference_failed_ms = Some(1001);
            record.failure = Some(HealthFailure::Authentication);
        }
        assert!(select_first_cloud(&snapshot, &records, 1002).is_none());
        for record in &mut records {
            record.inference_succeeded_ms = None;
            record.inference_failed_ms = None;
            record.catalog_seen_ms = Some(1001);
        }
        assert!(select_first_cloud(&snapshot, &records, 1002).is_none());
    }
    #[test]
    fn unconfirmed_shutdown_preserves_success_history_but_requires_new_confirmation() {
        let temp = tempfile::tempdir().unwrap();
        let config =
            ConfigService::open(temp.path(), Arc::new(crate::credentials::SystemCredentials))
                .unwrap();
        let p = config.save_provider(provider(0)).unwrap().providers[0].clone();
        let snapshot = config.read_snapshot().unwrap().1;
        let fingerprint = provider_fingerprint(&snapshot.providers[0]);
        ConfigService::record_runtime_health(
            temp.path(),
            &p.id,
            "model",
            &fingerprint,
            HealthObservation::InferenceSucceeded,
        )
        .unwrap();
        let before = ConfigService::read_runtime_health(temp.path(), &snapshot).unwrap()[0]
            .inference_succeeded_ms;
        ConfigService::invalidate_unconfirmed_runtime_health(temp.path()).unwrap();
        let view = config.view().unwrap();
        assert_eq!(view.desired_revision, 1);
        assert_eq!(view.model_health[0].inference, InferenceHealth::Stale);
        assert_eq!(
            view.model_health[0].failure,
            Some(HealthFailure::ObservationUnconfirmed)
        );
        assert_eq!(
            ConfigService::read_runtime_health(temp.path(), &snapshot).unwrap()[0]
                .inference_succeeded_ms,
            before
        );
        let failed_at = ConfigService::read_runtime_health(temp.path(), &snapshot).unwrap()[0]
            .inference_failed_ms
            .unwrap();
        record_at(
            temp.path(),
            &p.id,
            "model",
            &fingerprint,
            HealthObservation::InferenceSucceeded,
            failed_at + 1,
        )
        .unwrap();
        assert!(
            ConfigService::read_runtime_health(temp.path(), &snapshot).unwrap()[0]
                .is_ready(failed_at + 1)
        );
    }
    #[test]
    fn same_millisecond_failures_win_in_either_arrival_order() {
        use HealthObservation::*;
        let auth = InferenceFailed(HealthFailure::Authentication);
        let rate = InferenceFailed(HealthFailure::RateLimited);
        for events in [
            vec![InferenceSucceeded, auth.clone()],
            vec![auth.clone(), InferenceSucceeded],
            vec![rate.clone(), auth.clone(), InferenceSucceeded],
            vec![InferenceSucceeded, auth, rate],
        ] {
            let mut record = ModelHealthRecord::default();
            for event in events {
                record.observe(event, 1000);
            }
            assert!(!record.is_ready(1000));
            assert_eq!(record.failure, Some(HealthFailure::Authentication));
            record.observe(InferenceSucceeded, 999);
            assert!(!record.is_ready(1000));
            record.observe(InferenceSucceeded, 1001);
            assert!(record.is_ready(1001));
        }
        let mut record = ModelHealthRecord::default();
        record.observe(InferenceSucceeded, 2000);
        record.observe(InferenceFailed(HealthFailure::Authentication), 1999);
        assert!(record.is_ready(2000));
    }
}
