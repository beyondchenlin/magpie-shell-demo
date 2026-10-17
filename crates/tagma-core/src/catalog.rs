//! Provider catalog facts, separate from inference facts and immutable configuration.
use crate::{
    health::{health_connection, now_ms, provider_fingerprint},
    service::{ConfigSnapshot, ProviderRecord},
    *,
};
use rusqlite::{Connection, OptionalExtension, TransactionBehavior, params};
use serde::{Deserialize, Serialize};
use std::path::Path;
use ts_rs::TS;

pub(crate) const CREATE_CATALOG_TABLE: &str = "CREATE TABLE provider_catalog(provider_id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,record TEXT NOT NULL);";
#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CatalogOutcome {
    Pending,
    Available,
    Authentication,
    RateLimited,
    Unsupported,
    Network,
    Tls,
    Timeout,
    Protocol,
    Upstream,
    Cancelled,
}
impl CatalogOutcome {
    pub fn blocks_previous_inference(&self) -> bool {
        matches!(
            self,
            Self::Authentication
                | Self::Network
                | Self::Tls
                | Self::Timeout
                | Self::Protocol
                | Self::Upstream
                | Self::RateLimited
        )
    }
}
#[derive(Debug, Clone, Deserialize, Serialize, TS)]
#[serde(deny_unknown_fields)]
pub struct ProbeProvider {
    pub protocol_version: u32,
    pub expected_revision: u32,
    pub provider_id: String,
    pub request_id: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CatalogRecord {
    pub provider_id: String,
    pub fingerprint: String,
    pub request_id: String,
    pub attempted_ms: u64,
    pub finished_ms: Option<u64>,
    pub outcome: CatalogOutcome,
    pub http_status: Option<u16>,
    pub catalog_ms: Option<u64>,
    pub models: Vec<String>,
    pub consecutive_failures: u32,
    pub next_allowed_ms: u64,
    pub blocked_ms: Option<u64>,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CatalogView {
    pub provider_id: String,
    pub request_id: String,
    pub attempted_ms: f64,
    pub finished_ms: Option<f64>,
    pub outcome: CatalogOutcome,
    pub http_status: Option<u16>,
    pub catalog_ms: Option<f64>,
    pub models: Vec<String>,
    pub stale: bool,
    pub next_allowed_ms: f64,
    pub source: String,
    pub manual_inference_required: bool,
}
fn storage(_: impl std::fmt::Display) -> AppError {
    AppError::new(ErrorCode::StorageUnavailable)
}
fn read(db: &Connection, id: &str) -> AppResult<Option<CatalogRecord>> {
    let value: Option<(String, String)> = db
        .query_row(
            "SELECT fingerprint,record FROM provider_catalog WHERE provider_id=?1",
            [id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()
        .map_err(storage)?;
    value
        .map(|(fingerprint, json)| {
            if json.len() > 65536 {
                return Err(storage("catalog limit"));
            }
            let record: CatalogRecord = serde_json::from_str(&json).map_err(storage)?;
            if record.provider_id != id || record.fingerprint != fingerprint {
                return Err(storage("catalog identity"));
            }
            Ok(record)
        })
        .transpose()
}
pub(crate) fn invalidate_pending(
    db: &Connection,
    snapshot: &ConfigSnapshot,
    now: u64,
) -> AppResult<()> {
    for mut record in records(db, snapshot)? {
        if record.outcome == CatalogOutcome::Pending {
            record.outcome = CatalogOutcome::Cancelled;
            record.finished_ms = Some(now);
            write(db, &record)?;
        }
    }
    Ok(())
}
fn write(db: &Connection, record: &CatalogRecord) -> AppResult<()> {
    let json = serde_json::to_string(record).map_err(storage)?;
    if json.len() > 65536 {
        return Err(storage("catalog limit"));
    }
    db.execute("INSERT INTO provider_catalog VALUES(?1,?2,?3) ON CONFLICT(provider_id) DO UPDATE SET fingerprint=excluded.fingerprint,record=excluded.record",params![record.provider_id,record.fingerprint,json]).map_err(storage)?;
    Ok(())
}
pub(crate) fn records(db: &Connection, snapshot: &ConfigSnapshot) -> AppResult<Vec<CatalogRecord>> {
    snapshot
        .providers
        .iter()
        .filter_map(|provider| match read(db, &provider.provider.id) {
            Ok(Some(record)) if record.fingerprint == provider_fingerprint(provider) => {
                Some(Ok(record))
            }
            Ok(_) => None,
            Err(error) => Some(Err(error)),
        })
        .collect()
}
pub(crate) fn views(
    db: &Connection,
    snapshot: &ConfigSnapshot,
    now: u64,
) -> AppResult<Vec<CatalogView>> {
    Ok(records(db, snapshot)?
        .into_iter()
        .map(|r| CatalogView {
            provider_id: r.provider_id,
            request_id: r.request_id,
            attempted_ms: r.attempted_ms as f64,
            finished_ms: r.finished_ms.map(|v| v as f64),
            outcome: r.outcome.clone(),
            http_status: r.http_status,
            catalog_ms: r.catalog_ms.map(|v| v as f64),
            stale: r.outcome != CatalogOutcome::Available
                || r.catalog_ms
                    .is_none_or(|t| t > now || now - t >= crate::health::HEALTH_TTL_MS),
            models: r.models,
            next_allowed_ms: r.next_allowed_ms as f64,
            source: "discovered: GET /models".into(),
            manual_inference_required: true,
        })
        .collect())
}
impl ConfigService {
    /// Atomic durable admission; timestamps and retry schedule never come from the frontend.
    pub fn begin_runtime_catalog(
        directory: &Path,
        input: &ProbeProvider,
        pinned: &ProviderRecord,
    ) -> AppResult<()> {
        check_protocol(input.protocol_version)?;
        if uuid::Uuid::parse_str(&input.request_id).is_err()
            || input.provider_id != pinned.provider.id
        {
            return Err(AppError::new(ErrorCode::InvalidInput));
        }
        let (_lease, mut db) = health_connection(directory, true)?;
        let tx = db
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(storage)?;
        let (revision, snapshot) = Self::read_db(&tx)?;
        let fingerprint = provider_fingerprint(pinned);
        if revision != input.expected_revision
            || !snapshot.providers.iter().any(|p| {
                p.provider.id == input.provider_id && provider_fingerprint(p) == fingerprint
            })
        {
            return Err(AppError::new(ErrorCode::ConfigConflict));
        }
        let now = now_ms()?;
        let old = read(&tx, &input.provider_id)?.filter(|r| r.fingerprint == fingerprint);
        if old.as_ref().is_some_and(|r| r.next_allowed_ms > now) {
            return Err(AppError::new(ErrorCode::ProbeBackoff));
        }
        if old
            .as_ref()
            .is_some_and(|r| r.request_id == input.request_id)
        {
            return Err(AppError::new(ErrorCode::InvalidInput));
        }
        let mut record = old.unwrap_or(CatalogRecord {
            provider_id: input.provider_id.clone(),
            fingerprint,
            request_id: String::new(),
            attempted_ms: 0,
            finished_ms: None,
            outcome: CatalogOutcome::Pending,
            http_status: None,
            catalog_ms: None,
            models: vec![],
            consecutive_failures: 0,
            next_allowed_ms: 0,
            blocked_ms: None,
        });
        record.request_id = input.request_id.clone();
        record.attempted_ms = now;
        record.finished_ms = None;
        record.outcome = CatalogOutcome::Pending;
        record.http_status = None;
        record.next_allowed_ms = now + 30_000;
        write(&tx, &record)?;
        tx.commit().map_err(storage)
    }
    pub fn finish_runtime_catalog(
        directory: &Path,
        input: &ProbeProvider,
        fingerprint: &str,
        outcome: CatalogOutcome,
        status: Option<u16>,
        models: Vec<String>,
        observed_at_ms: u64,
    ) -> AppResult<bool> {
        if outcome == CatalogOutcome::Pending
            || serde_json::to_vec(&models).map_or(true, |json| json.len() > 60 * 1024)
            || models.len() > 128
            || models.iter().any(|id| {
                id.trim().is_empty() || id.len() > 256 || id.chars().any(char::is_control)
            })
            || (!matches!(outcome, CatalogOutcome::Available) && !models.is_empty())
        {
            return Err(AppError::new(ErrorCode::InvalidInput));
        }
        let (_lease, mut db) = health_connection(directory, true)?;
        let tx = db
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(storage)?;
        let (_, snapshot) = Self::read_db(&tx)?;
        if !snapshot
            .providers
            .iter()
            .any(|p| p.provider.id == input.provider_id && provider_fingerprint(p) == fingerprint)
        {
            return Ok(false);
        }
        let Some(mut record) = read(&tx, &input.provider_id)?.filter(|r| {
            r.fingerprint == fingerprint
                && r.request_id == input.request_id
                && r.outcome == CatalogOutcome::Pending
        }) else {
            return Ok(false);
        };
        let now = observed_at_ms;
        record.finished_ms = Some(now);
        record.http_status = status;
        if outcome == CatalogOutcome::Available {
            record.catalog_ms = Some(now);
            record.models = models;
            record.consecutive_failures = 0;
        } else {
            record.consecutive_failures = (record.consecutive_failures + 1).min(5);
        }
        if outcome.blocks_previous_inference() {
            record.blocked_ms = Some(record.blocked_ms.unwrap_or(0).max(now));
        }
        record.next_allowed_ms = now
            + if outcome == CatalogOutcome::Available {
                30_000
            } else {
                (30_000u64 << record.consecutive_failures).min(300_000)
            };
        record.outcome = outcome;
        write(&tx, &record)?;
        tx.commit().map_err(storage)?;
        Ok(true)
    }
}
