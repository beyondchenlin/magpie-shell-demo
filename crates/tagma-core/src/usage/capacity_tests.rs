//! Real SQLite capacity/checkpoint behavior using bounded owned fixtures.
use super::*;
fn request(at: u64, provider: &str) -> RequestStart {
    RequestStart {
        id: uuid::Uuid::new_v4().to_string(),
        provider_id: provider.into(),
        model: "capacity-fixture".into(),
        config_revision: 1,
        team_revision: None,
        started_ms: at,
    }
}
fn finish(store: &mut UsageStore, request: &RequestStart) {
    store
        .finish(Completion {
            request_id: request.id.clone(),
            ordinal: None,
            finished_ms: request.started_ms + 1,
            outcome: Outcome::Succeeded,
            error_code: None,
            tokens: Tokens::default(),
        })
        .unwrap();
}
fn count(db: &Connection, sql: &str) -> i64 {
    db.query_row(sql, [], |row| row.get(0)).unwrap()
}

#[test]
fn unchanged_retention_preserves_usage_revision_and_reviewed_clear_plan() {
    let temp = tempfile::Builder::new()
        .prefix("tagma-usage-capacity-")
        .tempdir()
        .unwrap();
    let mut store = UsageStore::open(temp.path(), 40 * DAY).unwrap();
    let before = count(&store.db, "SELECT change_revision FROM usage_meta");
    let plan = store
        .prepare_clear(
            read::UsageRange {
                start_ms: 38.0 * DAY as f64,
                end_ms: 39.0 * DAY as f64,
            },
            40 * DAY,
        )
        .unwrap();
    store.prune(40 * DAY, true).unwrap();
    assert_eq!(
        count(&store.db, "SELECT change_revision FROM usage_meta"),
        before,
        "no-op retention must not invalidate a reviewed clear plan"
    );
    store.clear(&plan, 40 * DAY).unwrap();
}

#[test]
fn maintenance_expires_finished_details_but_preserves_running_and_retained_summaries() {
    let temp = tempfile::Builder::new()
        .prefix("tagma-usage-capacity-")
        .tempdir()
        .unwrap();
    let mut store = UsageStore::open(temp.path(), DAY).unwrap();
    let provider = uuid::Uuid::new_v4().to_string();
    let completed = request(DAY, &provider);
    store.begin_request(&completed).unwrap();
    finish(&mut store, &completed);
    let active = request(DAY + 1000, &provider);
    store.begin_request(&active).unwrap();
    store.maintain(40 * DAY).unwrap();
    assert_eq!(
        count(
            &store.db,
            "SELECT count(*) FROM usage_requests WHERE outcome='succeeded'"
        ),
        0
    );
    assert_eq!(
        count(
            &store.db,
            "SELECT count(*) FROM usage_requests WHERE outcome='running'"
        ),
        1
    );
    assert_eq!(count(&store.db, "SELECT sum(count) FROM usage_daily"), 1);
    assert_eq!(count(&store.db, "SELECT generation FROM usage_meta"), 0);
    assert_eq!(store.state().unwrap().detail_start_ms, DAY + 1000);
    let revision = count(&store.db, "SELECT change_revision FROM usage_meta");
    store.maintain(40 * DAY + 60000).unwrap();
    assert_eq!(
        count(&store.db, "SELECT change_revision FROM usage_meta"),
        revision,
        "no data/floor change means no new revision even on a later tick"
    );
    assert!(!temp.path().join("config.sqlite3").exists());
    println!(
        "Idle core retention:finished detail expires without new dispatch,recent daily1 and old running1 retained,clear epoch0 unchanged;unchanged view on later tick keeps exact revision"
    );
}

#[test]
fn real_sqlite_full_results_roll_back_and_recover_bounded_without_double_counting() {
    let temp = tempfile::Builder::new()
        .prefix("tagma-usage-capacity-")
        .tempdir()
        .unwrap();
    let mut store = UsageStore::open(temp.path(), DAY).unwrap();
    let provider = uuid::Uuid::new_v4().to_string();
    let mut requests = Vec::new();
    for index in 0..8 {
        let next = request(DAY + index * 4, &provider);
        store.begin_request(&next).unwrap();
        store
            .begin_attempt(&AttemptStart {
                request_id: next.id.clone(),
                ordinal: 1,
                provider_id: provider.clone(),
                model: "capacity-fixture".into(),
                started_ms: next.started_ms + 1,
            })
            .unwrap();
        requests.push(next);
    }
    store.db.execute_batch("CREATE TABLE owned_result_padding(bytes BLOB);CREATE TRIGGER owned_result_full BEFORE UPDATE ON usage_attempts BEGIN INSERT INTO owned_result_padding VALUES(zeroblob(262144));END;").unwrap();
    let original: i64 = store
        .db
        .pragma_query_value(None, "max_page_count", |row| row.get(0))
        .unwrap();
    let pages: i64 = store
        .db
        .pragma_query_value(None, "page_count", |row| row.get(0))
        .unwrap();
    store
        .db
        .pragma_update(None, "max_page_count", pages + 2)
        .unwrap();
    let full = store
        .db
        .execute(
            "INSERT INTO owned_result_padding VALUES(zeroblob(262144))",
            [],
        )
        .unwrap_err();
    assert_eq!(
        full.sqlite_error_code(),
        Some(rusqlite::ErrorCode::DiskFull)
    );
    for next in &requests {
        assert_eq!(
            store
                .finish(Completion {
                    request_id: next.id.clone(),
                    ordinal: Some(1),
                    finished_ms: next.started_ms + 2,
                    outcome: Outcome::Succeeded,
                    error_code: None,
                    tokens: Tokens {
                        input: Some(2),
                        output: Some(1)
                    }
                })
                .unwrap_err()
                .code,
            ErrorCode::StorageUnavailable
        );
        assert_eq!(
            store
                .finish(Completion {
                    request_id: next.id.clone(),
                    ordinal: None,
                    finished_ms: next.started_ms + 3,
                    outcome: Outcome::Succeeded,
                    error_code: None,
                    tokens: Tokens::default()
                })
                .unwrap_err()
                .code,
            ErrorCode::StorageUnavailable
        );
    }
    assert_eq!(store.pending_results(), 16);
    assert!(store.state().unwrap().degraded);
    assert_eq!(
        count(
            &store.db,
            "SELECT count(*) FROM usage_requests WHERE outcome='running' AND input_tokens IS NULL"
        ),
        8
    );
    assert_eq!(
        count(
            &store.db,
            "SELECT count(*) FROM usage_attempts WHERE outcome='running' AND input_tokens IS NULL"
        ),
        8
    );
    assert_eq!(count(&store.db, "SELECT count(*) FROM usage_daily"), 0);
    assert_eq!(
        count(&store.db, "SELECT count(*) FROM owned_result_padding"),
        0
    );
    assert!(
        store
            .begin_request(&request(DAY + 1000, &provider))
            .is_err()
    );
    assert!(store.maintain(DAY + 1000).is_err());
    assert_eq!(
        store.pending_results(),
        16,
        "maintenance cannot retry failed settlements"
    );
    assert!(store.retry_pending().is_err());
    assert_eq!(
        store.pending_results(),
        16,
        "fault-active retry must keep the first failed settlement"
    );
    store
        .db
        .pragma_update(None, "max_page_count", original)
        .unwrap();
    store
        .db
        .execute_batch("DROP TRIGGER owned_result_full;DROP TABLE owned_result_padding;")
        .unwrap();
    store.retry_pending().unwrap();
    store.retry_pending().unwrap();
    assert_eq!(store.pending_results(), 0);
    assert!(!store.state().unwrap().degraded);
    for kind in ["request", "attempt"] {
        let total:(i64,i64,i64)=store.db.query_row("SELECT sum(count),sum(input_known),sum(output_known) FROM usage_daily WHERE kind=?1",[kind],|row|Ok((row.get(0)?,row.get(1)?,row.get(2)?))).unwrap();
        assert_eq!(total, (8, 16, 8));
    }
    assert_eq!(
        count(
            &store.db,
            "SELECT count(*) FROM usage_requests WHERE outcome='succeeded' AND input_tokens=2 AND output_tokens=1"
        ),
        8
    );
    let size: u64 = fs::read_dir(temp.path())
        .unwrap()
        .filter_map(Result::ok)
        .filter_map(|entry| entry.metadata().ok())
        .filter(|meta| meta.is_file())
        .map(|meta| meta.len())
        .sum();
    assert!(size < 1024 * 1024);
    println!(
        "Actual SQLITE_FULL finish:8logical+8attempt remain running/unknown,0daily/0partial padding,16bounded pending;new starts/idle maintenance/fault-active retry refused;after restoring page capacity explicit recovery twice ->8/8 counts input16/output8 each,0pending,healthy;owned logical files {size}bytes<1MiB,not actual disk exhaustion"
    );
}

#[test]
fn pinned_reader_bounds_real_wal_and_requires_actual_checkpoint_before_recovery() {
    let temp = tempfile::Builder::new()
        .prefix("tagma-usage-capacity-")
        .tempdir()
        .unwrap();
    let mut store = UsageStore::open(temp.path(), DAY).unwrap();
    store.retry_pending().unwrap();
    let reader = Connection::open_with_flags(
        temp.path().join("usage.sqlite3"),
        OpenFlags::SQLITE_OPEN_READ_ONLY,
    )
    .unwrap();
    reader.execute_batch("BEGIN").unwrap();
    assert_eq!(count(&reader, "SELECT count(*) FROM usage_requests"), 0);
    let provider = uuid::Uuid::new_v4().to_string();
    let mut completed = 0;
    let started = std::time::Instant::now();
    for index in 0..2000 {
        let next = request(DAY + index * 2, &provider);
        match store.begin_request(&next) {
            Ok(()) => {
                finish(&mut store, &next);
                completed += 1;
                assert!(
                    started.elapsed() < Duration::from_secs(20),
                    "bounded fixture time"
                );
                assert!(
                    fs::metadata(temp.path().join("usage.sqlite3-wal"))
                        .unwrap()
                        .len()
                        < 17 * 1024 * 1024,
                    "stop fixture growth if the production fence regresses"
                );
            }
            Err(error) => {
                assert_eq!(error.code, ErrorCode::StorageUnavailable);
                break;
            }
        }
    }
    assert!(
        store.state().unwrap().degraded,
        "real WAL admission fence was not reached within bounded fixture"
    );
    let wal = temp.path().join("usage.sqlite3-wal");
    let bytes = fs::metadata(&wal).unwrap().len();
    assert!(bytes > MAX_WAL_BYTES);
    assert!(
        bytes < MAX_WAL_BYTES + 512 * 1024,
        "bounded final transaction overshoot, not a whole-directory hard cap"
    );
    assert_eq!(
        count(&reader, "SELECT count(*) FROM usage_requests"),
        0,
        "pinned reader keeps its actual old WAL snapshot"
    );
    assert_eq!(
        count(&store.db, "SELECT count(*) FROM usage_requests"),
        completed
    );
    assert!(
        store
            .begin_request(&request(DAY + 10000, &provider))
            .is_err()
    );
    assert_eq!(
        fs::metadata(&wal).unwrap().len(),
        bytes,
        "blocked new starts cannot keep growing WAL"
    );
    assert!(
        store.retry_pending().is_err(),
        "a live WAL reader must not be reported as a successful TRUNCATE checkpoint"
    );
    assert!(store.state().unwrap().degraded);
    reader.execute_batch("ROLLBACK").unwrap();
    drop(reader);
    store.retry_pending().unwrap();
    assert!(!store.state().unwrap().degraded);
    assert_eq!(fs::metadata(&wal).unwrap().len(), 0);
    assert_eq!(
        count(
            &store.db,
            "SELECT sum(count) FROM usage_daily WHERE kind='request'"
        ),
        completed
    );
    let next = request(DAY + 10000, &provider);
    store.begin_request(&next).unwrap();
    finish(&mut store, &next);
    assert_eq!(
        count(
            &store.db,
            "SELECT sum(count) FROM usage_daily WHERE kind='request'"
        ),
        completed + 1
    );
    println!(
        "Real long-reader WAL:completed={completed},WAL={bytes}bytes >16MiB with bounded final-write overshoot;subsequent starts write0;checkpoint busy refuses recovery;reader closes then TRUNCATE0,all summaries preserved,new registration succeeds"
    );
}

#[test]
fn capacity_pruning_is_bounded_keeps_daily_and_running_and_rolls_back_failed_deletes() {
    let temp = tempfile::Builder::new()
        .prefix("tagma-usage-capacity-")
        .tempdir()
        .unwrap();
    let mut store = UsageStore::open(temp.path(), DAY).unwrap();
    let provider = uuid::Uuid::new_v4().to_string();
    for index in 0..140 {
        let next = request(DAY + index, &provider);
        store.begin_request(&next).unwrap();
        finish(&mut store, &next);
    }
    let active = request(DAY + 1000, &provider);
    store.begin_request(&active).unwrap();
    let pages: u64 = store
        .db
        .pragma_query_value(None, "page_count", |row| unsigned(row, 0))
        .unwrap();
    store
        .db
        .pragma_update(None, "max_page_count", time(pages).unwrap())
        .unwrap();
    store.admit(DAY + 2000).unwrap();
    assert_eq!(
        count(
            &store.db,
            "SELECT count(*) FROM usage_requests WHERE outcome='succeeded'"
        ),
        12
    );
    assert_eq!(
        count(
            &store.db,
            "SELECT count(*) FROM usage_requests WHERE outcome='running'"
        ),
        1
    );
    assert_eq!(
        count(
            &store.db,
            "SELECT sum(count) FROM usage_daily WHERE kind='request'"
        ),
        140
    );
    assert_eq!(store.state().unwrap().detail_start_ms, DAY + 128);
    let revision = count(&store.db, "SELECT change_revision FROM usage_meta");
    store.db.execute_batch("CREATE TRIGGER owned_capacity_delete_failure BEFORE DELETE ON usage_requests BEGIN SELECT RAISE(ABORT,'owned delete fault');END;").unwrap();
    assert!(store.admit(DAY + 2001).is_err());
    assert!(store.state().unwrap().degraded);
    assert_eq!(count(&store.db, "SELECT count(*) FROM usage_requests"), 13);
    assert_eq!(
        count(&store.db, "SELECT change_revision FROM usage_meta"),
        revision
    );
    assert_eq!(store.state().unwrap().detail_start_ms, DAY + 128);
    assert_eq!(
        count(
            &store.db,
            "SELECT sum(count) FROM usage_daily WHERE kind='request'"
        ),
        140
    );
    store
        .db
        .execute_batch("DROP TRIGGER owned_capacity_delete_failure")
        .unwrap();
    store.retry_pending().unwrap();
    store.admit(DAY + 2002).unwrap();
    assert_eq!(count(&store.db, "SELECT count(*) FROM usage_requests"), 1);
    assert_eq!(store.state().unwrap().detail_start_ms, DAY + 1000);
    println!(
        "Capacity small-page fixture:140finished ->12 after128-row pass,then0;running1 always retained,daily140 exact,detail floor advances128/1000;delete fault rolls back data/revision/floor and degrades,explicit recovery succeeds"
    );
}
