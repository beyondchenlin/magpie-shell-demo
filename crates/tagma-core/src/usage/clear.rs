//! Explicit logical deletion in the sole usage writer. No file removal/VACUUM.
use super::*;
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct UsageClearPlan {
    pub context_id: String,
    pub operation_id: String,
    pub range: read::UsageRange,
    pub expected_revision: String,
    pub generation: String,
    pub requests: String,
    /// All attempts cascading from selected logical requests, even across days.
    pub attempts: String,
    pub summary_buckets: String,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct UsageClearReceipt {
    pub plan: UsageClearPlan,
    pub generation: String,
    pub committed_ms: f64,
}
fn changed() -> AppError {
    AppError::new(ErrorCode::UsageClearChanged)
}
// Read only the exact pre-context schema2 receipt format. Incoming plans still
// require context_id; this does not make an unbound request valid or rewrite
// historical JSON. Duplicate/unknown fields fail both strict decoders.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct LegacyPlan {
    operation_id: String,
    range: read::UsageRange,
    expected_revision: String,
    generation: String,
    requests: String,
    attempts: String,
    summary_buckets: String,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct LegacyReceipt {
    plan: LegacyPlan,
    generation: String,
    committed_ms: f64,
}
fn decode_receipt(json: &str, identity: &str) -> AppResult<UsageClearReceipt> {
    let receipt: UsageClearReceipt = match serde_json::from_str(json) {
        Ok(receipt) => receipt,
        Err(_) => {
            let legacy: LegacyReceipt = serde_json::from_str(json).map_err(storage)?;
            UsageClearReceipt {
                plan: UsageClearPlan {
                    context_id: identity.into(),
                    operation_id: legacy.plan.operation_id,
                    range: legacy.plan.range,
                    expected_revision: legacy.plan.expected_revision,
                    generation: legacy.plan.generation,
                    requests: legacy.plan.requests,
                    attempts: legacy.plan.attempts,
                    summary_buckets: legacy.plan.summary_buckets,
                },
                generation: legacy.generation,
                committed_ms: legacy.committed_ms,
            }
        }
    };
    if receipt.plan.context_id.len() != 64
        || !receipt
            .plan
            .context_id
            .bytes()
            .all(|b| b.is_ascii_hexdigit())
        || !identifier(&receipt.plan.operation_id)
        || receipt.plan.range.validate(true).is_err()
        || !receipt.committed_ms.is_finite()
        || receipt.committed_ms.fract() != 0.0
        || receipt.committed_ms < receipt.plan.range.end_ms
        || receipt.committed_ms > 9_007_199_254_740_991.0
    {
        return Err(storage("invalid clear receipt"));
    }
    for value in [
        &receipt.plan.expected_revision,
        &receipt.plan.generation,
        &receipt.plan.requests,
        &receipt.plan.attempts,
        &receipt.plan.summary_buckets,
        &receipt.generation,
    ] {
        number(value).map_err(|_| storage("invalid clear receipt number"))?;
    }
    if number(&receipt.generation)?
        != number(&receipt.plan.generation)?
            .checked_add(1)
            .ok_or_else(|| storage("clear receipt generation overflow"))?
    {
        return Err(storage("clear receipt generation mismatch"));
    }
    Ok(receipt)
}
fn number(value: &str) -> AppResult<u64> {
    let n = value.parse::<u64>().map_err(|_| invalid())?;
    if n > i64::MAX as u64 || n.to_string() != value {
        return Err(invalid());
    }
    Ok(n)
}
fn bounds(range: &read::UsageRange, now: u64) -> AppResult<(i64, i64)> {
    let (start, end) = range.validate(true)?;
    if end as u64 > now {
        return Err(invalid());
    }
    Ok((start, end))
}
fn idle(db: &Connection) -> AppResult<()> {
    let running:bool=db.query_row("SELECT EXISTS(SELECT 1 FROM usage_requests WHERE outcome='running') OR EXISTS(SELECT 1 FROM usage_attempts WHERE outcome='running')",[],|row|row.get(0)).map_err(storage)?;
    if running {
        return Err(AppError::new(ErrorCode::UsageClearBusy));
    }
    Ok(())
}
fn snapshot(
    db: &Connection,
    range: read::UsageRange,
    operation_id: String,
    context_id: String,
) -> AppResult<UsageClearPlan> {
    let (start, end) = range.validate(true)?;
    let (revision, generation) = db
        .query_row(
            "SELECT change_revision,generation FROM usage_meta WHERE singleton=1",
            [],
            |row| Ok((unsigned(row, 0)?, unsigned(row, 1)?)),
        )
        .map_err(storage)?;
    let count = |sql: &str, a: i64, b: i64| {
        db.query_row(sql, params![a, b], |row| unsigned(row, 0))
            .map(|n| n.to_string())
            .map_err(storage)
    };
    Ok(UsageClearPlan {
        context_id,
        operation_id,
        range,
        expected_revision: revision.to_string(),
        generation: generation.to_string(),
        requests: count(
            "SELECT count(*) FROM usage_requests WHERE started_ms>=?1 AND started_ms<?2",
            start,
            end,
        )?,
        attempts: count(
            "SELECT count(*) FROM usage_attempts WHERE request_id IN(SELECT id FROM usage_requests WHERE started_ms>=?1 AND started_ms<?2)",
            start,
            end,
        )?,
        summary_buckets: count(
            "SELECT count(*) FROM usage_daily WHERE day>=?1 AND day<?2",
            start / DAY as i64,
            end / DAY as i64,
        )?,
    })
}
impl UsageStore {
    pub fn prepare_clear(
        &mut self,
        range: read::UsageRange,
        now_ms: u64,
    ) -> AppResult<UsageClearPlan> {
        bounds(&range, now_ms)?;
        if self.degraded || !self.pending.is_empty() {
            return Err(AppError::new(ErrorCode::UsageClearBusy));
        }
        let tx = self.db.transaction().map_err(storage)?;
        idle(&tx)?;
        snapshot(
            &tx,
            range,
            uuid::Uuid::new_v4().to_string(),
            context_id(&self.directory)?,
        )
    }
    pub fn clear(&mut self, plan: &UsageClearPlan, now_ms: u64) -> AppResult<UsageClearReceipt> {
        let (start, end) = bounds(&plan.range, now_ms)?;
        let identity = context_id(&self.directory)?;
        if identity != plan.context_id {
            return Err(changed());
        }
        time(now_ms)?;
        if now_ms > 9_007_199_254_740_991 || !identifier(&plan.operation_id) {
            return Err(invalid());
        }
        for n in [
            &plan.expected_revision,
            &plan.generation,
            &plan.requests,
            &plan.attempts,
            &plan.summary_buckets,
        ] {
            number(n)?;
        }
        let result = (|| {
            let tx = self
                .db
                .transaction_with_behavior(TransactionBehavior::Immediate)
                .map_err(storage)?;
            let stored: Option<String> = tx
                .query_row(
                    "SELECT last_clear_json FROM usage_meta WHERE singleton=1",
                    [],
                    |row| row.get(0),
                )
                .map_err(storage)?;
            if let Some(json) = stored {
                if json.len() > 4096 {
                    return Err(storage("clear receipt bound"));
                }
                let receipt = decode_receipt(&json, &identity)?;
                if receipt.plan.operation_id == plan.operation_id {
                    let current: u64 = tx
                        .query_row(
                            "SELECT generation FROM usage_meta WHERE singleton=1",
                            [],
                            |row| unsigned(row, 0),
                        )
                        .map_err(storage)?;
                    if receipt.plan != *plan
                        || receipt.generation != current.to_string()
                        || number(&receipt.generation)?
                            != number(&plan.generation)?
                                .checked_add(1)
                                .ok_or_else(changed)?
                    {
                        return Err(changed());
                    }
                    return Ok(receipt);
                }
            }
            if self.degraded || !self.pending.is_empty() {
                return Err(AppError::new(ErrorCode::UsageClearBusy));
            }
            idle(&tx)?;
            if snapshot(&tx, plan.range.clone(), plan.operation_id.clone(), identity)? != *plan {
                return Err(changed());
            }
            let foreign_keys: bool = tx
                .pragma_query_value(None, "foreign_keys", |row| row.get(0))
                .map_err(storage)?;
            if !foreign_keys {
                return Err(storage("foreign key protection"));
            }
            tx.execute(
                "DELETE FROM usage_requests WHERE started_ms>=?1 AND started_ms<?2",
                params![start, end],
            )
            .map_err(storage)?;
            tx.execute(
                "DELETE FROM usage_daily WHERE day>=?1 AND day<?2",
                params![start / DAY as i64, end / DAY as i64],
            )
            .map_err(storage)?;
            let generation = number(&plan.generation)?
                .checked_add(1)
                .filter(|n| *n <= i64::MAX as u64)
                .ok_or_else(changed)?;
            let receipt = UsageClearReceipt {
                plan: plan.clone(),
                generation: generation.to_string(),
                committed_ms: now_ms as f64,
            };
            let json = serde_json::to_string(&receipt).map_err(storage)?;
            if json.len() > 4096 {
                return Err(storage("clear receipt bound"));
            }
            tx.execute("UPDATE usage_meta SET generation=?1,last_clear_json=?2,detail_start_ms=MAX(detail_start_ms,COALESCE((SELECT MIN(started_ms) FROM usage_requests),?3)) WHERE singleton=1",params![time(generation)?,json,end]).map_err(storage)?;
            bump(&tx)?;
            #[cfg(test)]
            crash_hook("clearing");
            tx.commit().map_err(storage)?;
            #[cfg(test)]
            crash_hook("cleared");
            Ok(receipt)
        })();
        if result
            .as_ref()
            .is_err_and(|error| error.code == ErrorCode::StorageUnavailable)
        {
            self.degraded = true;
        }
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exact_legacy_receipt_is_readable_but_unbound_plans_remain_invalid() {
        let temp = directory();
        let mut store = UsageStore::open(temp.path(), DAY * 4).unwrap();
        let plan = store.prepare_clear(range(), DAY * 4).unwrap();
        let receipt = store.clear(&plan, DAY * 4).unwrap();
        let mut legacy = serde_json::to_value(&receipt).unwrap();
        legacy["plan"].as_object_mut().unwrap().remove("context_id");
        let json = serde_json::to_string(&legacy).unwrap();
        store
            .db
            .execute("UPDATE usage_meta SET last_clear_json=?1", [&json])
            .unwrap();
        assert_eq!(store.clear(&plan, DAY * 4).unwrap(), receipt);
        assert_eq!(
            store
                .db
                .query_row::<String, _, _>("SELECT last_clear_json FROM usage_meta", [], |row| row
                    .get(0))
                .unwrap(),
            json,
            "legacy read does not rewrite metadata"
        );
        let mut unbound = plan;
        unbound.context_id.clear();
        assert_eq!(
            store.clear(&unbound, DAY * 4).unwrap_err().code,
            ErrorCode::UsageClearChanged
        );
        legacy["plan"]["unexpected"] = serde_json::json!(true);
        assert!(
            decode_receipt(
                &serde_json::to_string(&legacy).unwrap(),
                &receipt.plan.context_id
            )
            .is_err()
        );
        let mut invalid = receipt.clone();
        invalid.committed_ms = -1.0;
        assert!(
            decode_receipt(
                &serde_json::to_string(&invalid).unwrap(),
                &receipt.plan.context_id
            )
            .is_err()
        );
        println!(
            "Usage legacy schema2 receipt:exact old shape resolves within its current owned context without rewriting;incoming unbound plan,unknown legacy fields and invalid receipt time rejected"
        );
    }
    #[test]
    fn identical_counts_in_another_directory_never_authorize_its_clear() {
        let first = directory();
        let second = directory();
        let mut a = UsageStore::open(first.path(), DAY * 4).unwrap();
        let mut b = UsageStore::open(second.path(), DAY * 4).unwrap();
        for at in [DAY + 100, DAY + 200] {
            seed(&mut a, at);
            seed(&mut b, at);
        }
        let plan = a.prepare_clear(range(), DAY * 4).unwrap();
        let other = b.prepare_clear(range(), DAY * 4).unwrap();
        assert_eq!(plan.expected_revision, other.expected_revision);
        assert_eq!(plan.requests, other.requests);
        assert_ne!(plan.context_id, other.context_id);
        assert_eq!(
            b.clear(&plan, DAY * 4).unwrap_err().code,
            ErrorCode::UsageClearChanged
        );
        assert_eq!(generation(&b.db), 0);
        let info = read::metadata(second.path(), &Default::default()).unwrap();
        assert_eq!(info.context_id, other.context_id);
        assert_eq!(info.generation.as_deref(), Some("0"));
        let mut query = read::UsageRequestsQuery {
            protocol_version: 1,
            range: range(),
            filter: Default::default(),
            cursor: None,
            limit: 1,
        };
        query.cursor = read::requests(first.path(), query.clone(), &Default::default())
            .unwrap()
            .next_cursor;
        assert!(query.cursor.is_some());
        assert_eq!(
            read::requests(second.path(), query, &Default::default())
                .unwrap_err()
                .code,
            ErrorCode::UsageClearChanged
        );
        let mut query = read::UsageSummaryQuery {
            protocol_version: 1,
            range: range(),
            filter: Default::default(),
            kind: read::UsageMetricKind::Attempt,
            cursor: None,
            limit: 1,
        };
        query.cursor = read::summary(first.path(), query.clone(), &Default::default())
            .unwrap()
            .next_cursor;
        assert!(query.cursor.is_some());
        assert_eq!(
            read::summary(second.path(), query, &Default::default())
                .unwrap_err()
                .code,
            ErrorCode::UsageClearChanged
        );
        println!(
            "Usage context:identical range/revision/counts in separate owned directories do not authorize cross-directory clear or either cursor;metadata identity matches its plan and generation0 remains"
        );
    }
    fn directory() -> tempfile::TempDir {
        tempfile::Builder::new()
            .prefix("tagma-usage-clear-")
            .tempdir()
            .unwrap()
    }
    fn range() -> read::UsageRange {
        read::UsageRange {
            start_ms: DAY as f64,
            end_ms: (DAY * 2) as f64,
        }
    }
    fn seed(store: &mut UsageStore, at: u64) -> RequestStart {
        let request = RequestStart {
            id: uuid::Uuid::new_v4().to_string(),
            provider_id: uuid::Uuid::new_v4().to_string(),
            model: "synthetic-clear".into(),
            config_revision: 7,
            team_revision: Some(2),
            started_ms: at,
        };
        store.begin_request(&request).unwrap();
        store
            .begin_attempt(&AttemptStart {
                request_id: request.id.clone(),
                ordinal: 1,
                provider_id: request.provider_id.clone(),
                model: "actual-clear-model".into(),
                started_ms: at + 10,
            })
            .unwrap();
        store
            .finish(Completion {
                request_id: request.id.clone(),
                ordinal: Some(1),
                finished_ms: at + 20,
                outcome: Outcome::Succeeded,
                error_code: None,
                tokens: Tokens {
                    input: Some(1),
                    output: None,
                },
            })
            .unwrap();
        store
            .finish(Completion {
                request_id: request.id.clone(),
                ordinal: None,
                finished_ms: at + 30,
                outcome: Outcome::Succeeded,
                error_code: None,
                tokens: Tokens::default(),
            })
            .unwrap();
        request
    }
    fn count(db: &Connection, table: &str) -> u64 {
        db.query_row(&format!("SELECT count(*) FROM {table}"), [], |row| {
            unsigned(row, 0)
        })
        .unwrap()
    }
    fn generation(db: &Connection) -> u64 {
        db.query_row(
            "SELECT generation FROM usage_meta WHERE singleton=1",
            [],
            |row| unsigned(row, 0),
        )
        .unwrap()
    }
    fn v1(path: &Path) {
        let db = Connection::open(path.join("usage.sqlite3")).unwrap();
        db.execute_batch(SCHEMA).unwrap();
        db.pragma_update(None, "application_id", OWNER).unwrap();
        db.pragma_update(None, "user_version", 1).unwrap();
        db.execute("INSERT INTO usage_requests VALUES(?1,?2,'v1-preserved',7,NULL,?3,?4,'interrupted','PROCESS_INTERRUPTED',NULL,NULL)",params![uuid::Uuid::new_v4().to_string(),uuid::Uuid::new_v4().to_string(),time(DAY).unwrap(),time(DAY+10).unwrap()]).unwrap();
    }
    #[test]
    fn clear_is_reviewed_atomic_idempotent_and_invalidates_old_cursors() {
        let temp = directory();
        let mut store = UsageStore::open(temp.path(), DAY * 4).unwrap();
        seed(&mut store, DAY + 100);
        seed(&mut store, DAY * 2 + 100);
        let cancel = read::UsageReadCancellation::default();
        let query = read::UsageRequestsQuery {
            protocol_version: 1,
            range: read::UsageRange {
                start_ms: 0.0,
                end_ms: (DAY * 4) as f64,
            },
            filter: Default::default(),
            cursor: None,
            limit: 1,
        };
        let before = read::requests(temp.path(), query.clone(), &cancel).unwrap();
        assert_eq!(before.info.generation.as_deref(), Some("0"));
        let mut summary_query = read::UsageSummaryQuery {
            protocol_version: 1,
            range: query.range.clone(),
            filter: Default::default(),
            kind: read::UsageMetricKind::Attempt,
            cursor: None,
            limit: 1,
        };
        summary_query.cursor = read::summary(temp.path(), summary_query.clone(), &cancel)
            .unwrap()
            .next_cursor;
        assert!(summary_query.cursor.is_some());
        let plan = store.prepare_clear(range(), DAY * 4).unwrap();
        assert_eq!(
            (&plan.requests, &plan.attempts, &plan.summary_buckets),
            (&"1".to_string(), &"1".to_string(), &"2".to_string())
        );
        // A WAL reader already in a transaction may finish with old generation0.
        // New reads/cursors distinguish it from committed generation1.
        let mut old = Connection::open_with_flags(
            temp.path().join("usage.sqlite3"),
            OpenFlags::SQLITE_OPEN_READ_ONLY,
        )
        .unwrap();
        let snapshot = old.transaction().unwrap();
        assert_eq!(generation(&snapshot), 0);
        let receipt = store.clear(&plan, DAY * 4).unwrap();
        assert_eq!(receipt.generation, "1");
        assert_eq!(count(&store.db, "usage_requests"), 1);
        assert_eq!(count(&store.db, "usage_attempts"), 1);
        assert_eq!(count(&store.db, "usage_daily"), 2);
        assert_eq!(generation(&snapshot), 0);
        assert_eq!(count(&snapshot, "usage_requests"), 2);
        drop(snapshot);
        drop(old);
        let mut stale = query.clone();
        stale.cursor = before.next_cursor;
        assert_eq!(
            read::requests(temp.path(), stale, &cancel)
                .unwrap_err()
                .code,
            ErrorCode::UsageClearChanged
        );
        assert_eq!(
            read::summary(temp.path(), summary_query, &cancel)
                .unwrap_err()
                .code,
            ErrorCode::UsageClearChanged
        );
        let fresh = read::requests(temp.path(), query, &cancel).unwrap();
        assert_eq!(fresh.info.generation.as_deref(), Some("1"));
        assert_eq!(fresh.records.len(), 1);
        // Clock rollback/new registration after a clear is new activity. Replaying
        // the same receipt must not delete it, even after a process/store restart.
        let new = seed(&mut store, DAY + 200);
        drop(store);
        let mut store = UsageStore::open(temp.path(), DAY * 4).unwrap();
        assert_eq!(store.clear(&plan, DAY * 4).unwrap(), receipt);
        assert!(
            store
                .db
                .query_row(
                    "SELECT EXISTS(SELECT 1 FROM usage_requests WHERE id=?1)",
                    [new.id],
                    |row| row.get::<_, bool>(0)
                )
                .unwrap()
        );
        let mut changed = plan.clone();
        changed.range.end_ms = (DAY * 3) as f64;
        assert_eq!(
            store.clear(&changed, DAY * 4).unwrap_err().code,
            ErrorCode::UsageClearChanged
        );
        println!(
            "Usage clear:reviewed1request/1attempt/2buckets removed atomically;outside range retained;WAL snapshot old0/new read1;both stale cursors refused;lost-ACK replay after restart leaves new activity intact"
        );
    }
    #[test]
    fn stale_busy_pending_and_storage_faults_never_partially_clear() {
        let temp = directory();
        let mut store = UsageStore::open(temp.path(), DAY * 4).unwrap();
        let req = seed(&mut store, DAY + 100);
        let plan = store.prepare_clear(range(), DAY * 4).unwrap();
        seed(&mut store, DAY * 3);
        assert_eq!(
            store.clear(&plan, DAY * 4).unwrap_err().code,
            ErrorCode::UsageClearChanged
        );
        assert_eq!(generation(&store.db), 0);
        let mut running = req.clone();
        running.id = uuid::Uuid::new_v4().to_string();
        running.started_ms = DAY * 3 + 100;
        store.begin_request(&running).unwrap();
        assert_eq!(
            store.prepare_clear(range(), DAY * 4).unwrap_err().code,
            ErrorCode::UsageClearBusy
        );
        store.db.execute_batch("CREATE TRIGGER owned_clear_pending BEFORE UPDATE ON usage_requests BEGIN SELECT RAISE(ABORT,'owned pending result');END;").unwrap();
        assert!(
            store
                .finish(Completion {
                    request_id: running.id,
                    ordinal: None,
                    finished_ms: DAY * 3 + 200,
                    outcome: Outcome::Cancelled,
                    error_code: Some("CLIENT_CANCELLED".into()),
                    tokens: Tokens::default()
                })
                .is_err()
        );
        assert_eq!(store.pending_results(), 1);
        assert_eq!(
            store.prepare_clear(range(), DAY * 4).unwrap_err().code,
            ErrorCode::UsageClearBusy
        );
        store
            .db
            .execute_batch("DROP TRIGGER owned_clear_pending;")
            .unwrap();
        store.retry_pending().unwrap();
        let plan = store.prepare_clear(range(), DAY * 4).unwrap();
        let counts = (
            count(&store.db, "usage_requests"),
            count(&store.db, "usage_daily"),
        );
        store.db.execute_batch("CREATE TRIGGER owned_clear_fail BEFORE DELETE ON usage_daily BEGIN SELECT RAISE(ABORT,'owned delete failure');END;").unwrap();
        assert_eq!(
            store.clear(&plan, DAY * 4).unwrap_err().code,
            ErrorCode::StorageUnavailable
        );
        assert_eq!(
            (
                count(&store.db, "usage_requests"),
                count(&store.db, "usage_daily")
            ),
            counts
        );
        assert_eq!(generation(&store.db), 0);
        assert!(store.state().unwrap().degraded);
        store
            .db
            .execute_batch("DROP TRIGGER owned_clear_fail;")
            .unwrap();
        store.retry_pending().unwrap();
        store.clear(&plan, DAY * 4).unwrap();
        for range in [
            read::UsageRange {
                start_ms: 1.0,
                end_ms: DAY as f64,
            },
            read::UsageRange {
                start_ms: 0.0,
                end_ms: (DAY * 5) as f64,
            },
            read::UsageRange {
                start_ms: 0.0,
                end_ms: (DAY * 367) as f64,
            },
        ] {
            assert!(store.prepare_clear(range, DAY * 4).is_err());
        }
        println!(
            "Usage clear:mutation invalidates preview;running/pending/degraded refuse;daily-delete failure rolls back earlier detail/cascade deletion and epoch;explicit recovery then clear succeeds;invalid/future scopes refused"
        );
    }
    #[test]
    fn known_v1_upgrade_is_atomic_and_preserves_records_unknown_is_untouched() {
        let temp = directory();
        v1(temp.path());
        let db = Connection::open(temp.path().join("usage.sqlite3")).unwrap();
        assert!(validate_schema(&db).is_err());
        drop(db);
        let wal = Connection::open(temp.path().join("usage.sqlite3")).unwrap();
        wal.execute_batch(
            "PRAGMA journal_mode=WAL;UPDATE usage_requests SET model='committed-wal-record';",
        )
        .unwrap();
        assert!(
            fs::metadata(temp.path().join("usage.sqlite3-wal"))
                .unwrap()
                .len()
                > 0
        );
        let store = UsageStore::open(temp.path(), DAY * 4).unwrap();
        assert_eq!(count(&store.db, "usage_requests"), 1);
        assert_eq!(generation(&store.db), 0);
        validate_schema(&store.db).unwrap();
        let backup = fs::read_dir(temp.path().join("usage-backups"))
            .unwrap()
            .map(|entry| entry.unwrap().path())
            .find(|path| {
                path.extension()
                    .is_some_and(|extension| extension == "sqlite3")
            })
            .unwrap();
        let backup = Connection::open_with_flags(backup, OpenFlags::SQLITE_OPEN_READ_ONLY).unwrap();
        validate_schema_version(&backup, 1).unwrap();
        let model: String = backup
            .query_row("SELECT model FROM usage_requests", [], |row| row.get(0))
            .unwrap();
        assert_eq!(model, "committed-wal-record");
        drop(backup);
        drop(wal);
        drop(store);
        let unknown = directory();
        v1(unknown.path());
        let target = unknown.path().join("usage.sqlite3");
        let db = Connection::open(&target).unwrap();
        db.execute_batch("CREATE TABLE not_ours(value);").unwrap();
        drop(db);
        let before = fs::read(&target).unwrap();
        assert!(UsageStore::open(unknown.path(), DAY * 4).is_err());
        assert_eq!(fs::read(target).unwrap(), before);
        println!(
            "Usage upgrade:known owner/schema1 records preserved to schema2;readonly does not migrate;unknown extra object database unchanged"
        );
    }
    #[test]
    fn cross_day_cascade_is_counted_and_revision_exhaustion_rolls_back() {
        let temp = directory();
        let mut store = UsageStore::open(temp.path(), DAY * 4).unwrap();
        let request = RequestStart {
            id: uuid::Uuid::new_v4().to_string(),
            provider_id: uuid::Uuid::new_v4().to_string(),
            model: "cross-day".into(),
            config_revision: 1,
            team_revision: None,
            started_ms: DAY * 2 - 100,
        };
        store.begin_request(&request).unwrap();
        store
            .begin_attempt(&AttemptStart {
                request_id: request.id.clone(),
                ordinal: 1,
                provider_id: request.provider_id,
                model: "next-day-attempt".into(),
                started_ms: DAY * 2 + 10,
            })
            .unwrap();
        store
            .finish(Completion {
                request_id: request.id.clone(),
                ordinal: Some(1),
                finished_ms: DAY * 2 + 20,
                outcome: Outcome::Succeeded,
                error_code: None,
                tokens: Tokens::default(),
            })
            .unwrap();
        store
            .finish(Completion {
                request_id: request.id,
                ordinal: None,
                finished_ms: DAY * 2 + 30,
                outcome: Outcome::Succeeded,
                error_code: None,
                tokens: Tokens::default(),
            })
            .unwrap();
        let plan = store.prepare_clear(range(), DAY * 4).unwrap();
        assert_eq!(plan.requests, "1");
        assert_eq!(plan.attempts, "1");
        assert_eq!(plan.summary_buckets, "1");
        store.clear(&plan, DAY * 4).unwrap();
        assert_eq!(count(&store.db, "usage_attempts"), 0);
        assert_eq!(count(&store.db, "usage_daily"), 1);
        let remaining: String = store
            .db
            .query_row("SELECT kind FROM usage_daily", [], |row| row.get(0))
            .unwrap();
        assert_eq!(remaining, "attempt");
        store
            .db
            .execute("UPDATE usage_meta SET generation=2", [])
            .unwrap();
        assert_eq!(
            store.clear(&plan, DAY * 4).unwrap_err().code,
            ErrorCode::UsageClearChanged,
            "inconsistent stored receipt cannot confirm a clear"
        );
        let overflow = directory();
        let mut store = UsageStore::open(overflow.path(), DAY * 4).unwrap();
        seed(&mut store, DAY + 10);
        store
            .db
            .execute(
                "UPDATE usage_meta SET change_revision=9223372036854775807",
                [],
            )
            .unwrap();
        let plan = store.prepare_clear(range(), DAY * 4).unwrap();
        assert_eq!(
            store.clear(&plan, DAY * 4).unwrap_err().code,
            ErrorCode::StorageUnavailable
        );
        assert_eq!(count(&store.db, "usage_requests"), 1);
        assert_eq!(generation(&store.db), 0);
        println!(
            "Usage clear:preview counts next-day cascading attempts,keeps outside-day summaries;contradictory receipt rejected;revision exhaustion rolls back deletion/receipt/epoch without wrap"
        );
    }
    #[test]
    #[ignore = "owned child process only"]
    fn clear_crash_worker() {
        let root = std::env::var_os("TAGMA_TEST_CLEAR_ROOT").unwrap();
        let root = Path::new(&root);
        let mut store = UsageStore::open(root, DAY * 4).unwrap();
        if std::env::var("TAGMA_TEST_CLEAR_MODE").unwrap() == "clear" {
            let plan = store.prepare_clear(range(), DAY * 4).unwrap();
            fs::write(
                root.join("owned-plan.json"),
                serde_json::to_vec(&plan).unwrap(),
            )
            .unwrap();
            store.clear(&plan, DAY * 4).unwrap();
        }
        panic!("crash hook did not exit");
    }
    #[test]
    fn changed_backup_or_source_refuses_migration_and_preserves_schema_one() {
        for hook in ["backup_intent", "backed_up"] {
            let temp = directory();
            v1(temp.path());
            let status = std::process::Command::new(std::env::current_exe().unwrap())
                .args([
                    "--exact",
                    "usage::clear::tests::clear_crash_worker",
                    "--ignored",
                    "--nocapture",
                ])
                .env("TAGMA_TEST_CLEAR_ROOT", temp.path())
                .env("TAGMA_TEST_CLEAR_MODE", "upgrade")
                .env("TAGMA_TEST_USAGE_CRASH", hook)
                .status()
                .unwrap();
            assert_eq!(status.code(), Some(90));
            let target = temp.path().join("usage.sqlite3");
            let changed = if hook == "backup_intent" {
                target.clone()
            } else {
                fs::read_dir(temp.path().join("usage-backups"))
                    .unwrap()
                    .map(|entry| entry.unwrap().path())
                    .find(|path| {
                        path.extension()
                            .is_some_and(|extension| extension == "sqlite3")
                    })
                    .unwrap()
            };
            let db = Connection::open(&changed).unwrap();
            db.execute(
                "UPDATE usage_requests SET model='owned-changed-metadata'",
                [],
            )
            .unwrap();
            drop(db);
            let before = fs::read(&target).unwrap();
            assert!(UsageStore::open(temp.path(), DAY * 4).is_err());
            assert_eq!(fs::read(&target).unwrap(), before);
            let db = Connection::open(target).unwrap();
            assert_eq!(
                db.pragma_query_value::<u32, _>(None, "user_version", |row| row.get(0))
                    .unwrap(),
                1
            );
            assert_eq!(count(&db, "usage_requests"), 1);
        }
        println!(
            "Usage migration:source changed after intent or backup checksum changed -> refuse before DDL,preserve schema1/current bytes and recovery files;no automatic backup restoration"
        );
    }
    #[test]
    fn real_exit90_rolls_back_upgrade_or_clear_and_keeps_committed_receipt() {
        for hook in [
            "backup_intent",
            "backup_copy",
            "backed_up",
            "upgrading",
            "upgraded",
            "clearing",
            "cleared",
        ] {
            let temp = directory();
            let clearing = hook.starts_with("clear");
            if clearing {
                let mut store = UsageStore::open(temp.path(), DAY * 4).unwrap();
                seed(&mut store, DAY + 100);
                seed(&mut store, DAY * 2 + 100);
            } else {
                v1(temp.path());
            }
            let status = std::process::Command::new(std::env::current_exe().unwrap())
                .args([
                    "--exact",
                    "usage::clear::tests::clear_crash_worker",
                    "--ignored",
                    "--nocapture",
                ])
                .env("TAGMA_TEST_CLEAR_ROOT", temp.path())
                .env(
                    "TAGMA_TEST_CLEAR_MODE",
                    if clearing { "clear" } else { "upgrade" },
                )
                .env("TAGMA_TEST_USAGE_CRASH", hook)
                .status()
                .unwrap();
            assert_eq!(status.code(), Some(90));
            // Recover SQLite's own hot journal without invoking application
            // migration first, so an accidentally committed upgrade is visible.
            let recovered = Connection::open(temp.path().join("usage.sqlite3")).unwrap();
            let version: u32 = recovered
                .pragma_query_value(None, "user_version", |row| row.get(0))
                .unwrap();
            assert_eq!(
                version,
                if ["backup_intent", "backup_copy", "backed_up", "upgrading"].contains(&hook) {
                    1
                } else {
                    2
                }
            );
            assert_eq!(
                count(&recovered, "usage_requests"),
                if hook == "cleared" {
                    1
                } else if clearing {
                    2
                } else {
                    1
                }
            );
            drop(recovered);
            let store = UsageStore::open(temp.path(), DAY * 4).unwrap();
            let expected = if hook == "cleared" {
                1
            } else if clearing {
                2
            } else {
                1
            };
            assert_eq!(count(&store.db, "usage_requests"), expected);
            assert_eq!(generation(&store.db), u64::from(hook == "cleared"));
            validate_schema(&store.db).unwrap();
            drop(store);
            if hook == "cleared" {
                let plan: UsageClearPlan =
                    serde_json::from_slice(&fs::read(temp.path().join("owned-plan.json")).unwrap())
                        .unwrap();
                let mut store = UsageStore::open(temp.path(), DAY * 4).unwrap();
                assert_eq!(store.clear(&plan, DAY * 4).unwrap().generation, "1");
                assert_eq!(count(&store.db, "usage_requests"), 1);
            }
        }
        println!(
            "Usage actual exit90:backup intent/copy/hash resume safely;uncommitted schema upgrade/delete roll back;committed upgrade survives;committed clear epoch+receipt survive/replay;seven isolated TempDir children exit and teardown"
        );
    }
}
