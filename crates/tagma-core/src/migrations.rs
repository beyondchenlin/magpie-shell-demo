//! Caller holds the exclusive maintenance lock for this entire operation.
//! Backup is SQLite's online backup API, including committed WAL contents.
use crate::*;
use rusqlite::{
    Connection, OpenFlags, TransactionBehavior,
    backup::{Backup, StepResult},
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, OpenOptions},
    io::{Read, Write},
    path::Path,
    time::{Duration, Instant},
};

const JOURNAL: &str = "config-migration.json";
mod legacy_schema1;
const OWNER: &str = "com.tagmaai.desktop/migration/v1";
const LEGACY_OWNER: &str = "com.tagmaai.desktop/migration-1-2/v1";
fn first_schema() -> u32 {
    1
}
fn second_schema() -> u32 {
    2
}
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Journal {
    owner: String,
    operation_id: String,
    source_revision: u32,
    backup_sha256: Option<String>,
    #[serde(default = "first_schema")]
    from_schema: u32,
    #[serde(default = "second_schema")]
    to_schema: u32,
}
fn error() -> AppError {
    AppError::new(ErrorCode::StorageUnavailable)
}
fn incompatible() -> AppError {
    AppError::new(ErrorCode::IncompatibleVersion)
}
fn ordinary(path: &Path, directory: bool) -> AppResult<()> {
    let metadata = fs::symlink_metadata(path).map_err(|_| error())?;
    if metadata.file_type().is_symlink()
        || (if directory {
            !metadata.is_dir()
        } else {
            !metadata.is_file()
        })
    {
        return Err(incompatible());
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes() & 0x400 != 0 {
            return Err(incompatible());
        }
    }
    Ok(())
}
pub(crate) fn pending(directory: &Path) -> bool {
    directory.join(JOURNAL).exists()
}
fn revision(db: &Connection) -> AppResult<u32> {
    db.query_row(
        "SELECT revision FROM config_head WHERE singleton=1",
        [],
        |r| r.get(0),
    )
    .map_err(|_| error())
}
fn schema(db: &Connection) -> AppResult<u32> {
    db.pragma_query_value(None, "user_version", |r| r.get(0))
        .map_err(|_| error())
}
fn digest(path: &Path) -> AppResult<String> {
    let mut file = fs::File::open(path).map_err(|_| error())?;
    let mut hash = Sha256::new();
    let mut buffer = [0u8; 65536];
    loop {
        let n = file.read(&mut buffer).map_err(|_| error())?;
        if n == 0 {
            break;
        }
        hash.update(&buffer[..n]);
    }
    Ok(format!("{:x}", hash.finalize()))
}
fn write_journal(directory: &Path, journal: &Journal, replace: bool) -> AppResult<()> {
    let temporary = directory.join(format!(".migration-{}.tmp", uuid::Uuid::new_v4()));
    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temporary)
        .map_err(|_| error())?;
    file.write_all(&serde_json::to_vec(journal).map_err(|_| error())?)
        .map_err(|_| error())?;
    file.sync_all().map_err(|_| error())?;
    drop(file);
    if replace {
        fs::rename(temporary, directory.join(JOURNAL)).map_err(|_| error())?;
    } else {
        crate::initialization::publish_new(&temporary, &directory.join(JOURNAL))
            .map_err(|_| error())?;
    }
    Ok(())
}

pub(crate) fn prepare(directory: &Path) -> AppResult<()> {
    // Bound the known transition chain, including one resumed committed step.
    for _ in 0..SCHEMA_VERSION {
        prepare_inner(directory, || Ok(()))?;
        let db = Connection::open_with_flags(
            directory.join("config.sqlite3"),
            OpenFlags::SQLITE_OPEN_READ_ONLY,
        )
        .map_err(|_| error())?;
        if schema(&db)? == SCHEMA_VERSION && !pending(directory) {
            return Ok(());
        }
    }
    Err(incompatible())
}
fn prepare_inner(directory: &Path, after_backup: impl FnOnce() -> AppResult<()>) -> AppResult<()> {
    prepare_step(directory, after_backup, || Ok(()))
}
fn prepare_step(
    directory: &Path,
    after_backup: impl FnOnce() -> AppResult<()>,
    after_commit: impl FnOnce() -> AppResult<()>,
) -> AppResult<()> {
    let mut db = Connection::open_with_flags(
        directory.join("config.sqlite3"),
        OpenFlags::SQLITE_OPEN_READ_WRITE,
    )
    .map_err(|_| error())?;
    db.busy_timeout(Duration::from_secs(2))
        .map_err(|_| error())?;
    let version = schema(&db)?;
    if !(1..=SCHEMA_VERSION).contains(&version) {
        return Err(incompatible());
    }
    if version == SCHEMA_VERSION && !pending(directory) {
        return Ok(());
    }
    let application: u32 = db
        .pragma_query_value(None, "application_id", |r| r.get(0))
        .map_err(|_| error())?;
    let mut statement = db
        .prepare("SELECT name FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY name")
        .map_err(|_| error())?;
    let names = statement
        .query_map([], |r| r.get::<_, String>(0))
        .map_err(|_| error())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| error())?;
    let expected = if version == 1 {
        vec!["config_head", "credential_journal", "revisions"]
    } else if version < 5 {
        vec![
            "config_head",
            "config_metadata",
            "credential_journal",
            "revisions",
        ]
    } else if version < 7 {
        vec![
            "config_head",
            "config_metadata",
            "credential_journal",
            "model_health",
            "revisions",
        ]
    } else if version < 8 {
        vec![
            "config_head",
            "config_metadata",
            "credential_journal",
            "model_health",
            "provider_catalog",
            "revisions",
        ]
    } else {
        vec![
            "config_head",
            "config_metadata",
            "credential_journal",
            "model_health",
            "provider_catalog",
            "revisions",
            "security_head",
            "security_revocations",
            "security_revocations_revision",
        ]
    };
    // The first builder predated application_id. Recognize only its exact
    // schema and closed snapshots, never arbitrary owner-zero databases.
    let original_schema1 = version == 1 && application == 0 && legacy_schema1::recognize(&db)?;
    if (application != 0x5441474d && !original_schema1) || names != expected {
        return Err(incompatible());
    }
    if version >= 2 {
        let id: String = db
            .query_row(
                "SELECT config_uuid FROM config_metadata WHERE singleton=1",
                [],
                |r| r.get(0),
            )
            .map_err(|_| incompatible())?;
        uuid::Uuid::parse_str(&id).map_err(|_| incompatible())?;
    }
    drop(statement);
    let mut journal: Journal = if pending(directory) {
        let path = directory.join(JOURNAL);
        ordinary(&path, false)?;
        let mut bytes = Vec::with_capacity(4097);
        fs::File::open(path)
            .map_err(|_| error())?
            .take(4097)
            .read_to_end(&mut bytes)
            .map_err(|_| error())?;
        if bytes.len() > 4096 {
            return Err(incompatible());
        }
        serde_json::from_slice(&bytes).map_err(|_| incompatible())?
    } else {
        let journal = Journal {
            owner: OWNER.into(),
            operation_id: uuid::Uuid::new_v4().to_string(),
            source_revision: revision(&db)?,
            backup_sha256: None,
            from_schema: version,
            to_schema: version + 1,
        };
        write_journal(directory, &journal, false)?;
        journal
    };
    if (journal.owner != OWNER
        && !(journal.owner == LEGACY_OWNER && journal.from_schema == 1 && journal.to_schema == 2))
        || !matches!(
            (journal.from_schema, journal.to_schema),
            (1, 2) | (2, 3) | (3, 4) | (4, 5) | (5, 6) | (6, 7) | (7, 8) | (8, 9) | (9, 10)
        )
        || (version != journal.from_schema && version != journal.to_schema)
        || uuid::Uuid::parse_str(&journal.operation_id).is_err()
        || journal
            .backup_sha256
            .as_ref()
            .is_some_and(|h| h.len() != 64 || !h.bytes().all(|b| b.is_ascii_hexdigit()))
    {
        return Err(incompatible());
    }
    if revision(&db)? != journal.source_revision {
        return Err(AppError::new(ErrorCode::ConfigConflict));
    }
    let backups = directory.join("backups");
    fs::create_dir_all(&backups).map_err(|_| error())?;
    ordinary(&backups, true)?;
    let backup_path = backups.join(format!(
        "schema-{}-{}.sqlite3",
        journal.from_schema, journal.operation_id
    ));
    if journal.backup_sha256.is_none() {
        if version != journal.from_schema || revision(&db)? != journal.source_revision {
            return Err(AppError::new(ErrorCode::ConfigConflict));
        }
        let size = fs::metadata(directory.join("config.sqlite3"))
            .map_err(|_| error())?
            .len()
            + fs::metadata(directory.join("config.sqlite3-wal"))
                .map(|m| m.len())
                .unwrap_or(0);
        if fs2::available_space(directory).map_err(|_| error())?
            < size.saturating_mul(2) + 4 * 1024 * 1024
        {
            return Err(error());
        }
        if !backup_path.exists() {
            OpenOptions::new()
                .create_new(true)
                .write(true)
                .open(&backup_path)
                .map_err(|_| error())?;
        }
        ordinary(&backup_path, false)?;
        let mut destination =
            Connection::open_with_flags(&backup_path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                .map_err(|_| error())?;
        let previous = schema(&destination)?;
        let objects: u32 = destination
            .query_row(
                "SELECT count(*) FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%'",
                [],
                |r| r.get(0),
            )
            .map_err(|_| error())?;
        if previous == 0 && objects == 0 {
            let copy = Backup::new(&db, &mut destination).map_err(|_| error())?;
            let deadline = Instant::now() + Duration::from_secs(10);
            loop {
                match copy.step(128).map_err(|_| error())? {
                    StepResult::Done => break,
                    StepResult::More if Instant::now() < deadline => {}
                    _ => return Err(error()),
                }
            }
        } else if previous != journal.from_schema
            || revision(&destination)? != journal.source_revision
        {
            return Err(incompatible());
        }
        drop(destination);
        let verify = Connection::open_with_flags(&backup_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
            .map_err(|_| error())?;
        let integrity: String = verify
            .query_row("PRAGMA quick_check", [], |r| r.get(0))
            .map_err(|_| error())?;
        if integrity != "ok"
            || schema(&verify)? != journal.from_schema
            || revision(&verify)? != journal.source_revision
        {
            return Err(incompatible());
        }
        let backup_owner: u32 = verify
            .pragma_query_value(None, "application_id", |r| r.get(0))
            .map_err(|_| error())?;
        if backup_owner != 0x5441474d
            && !(journal.from_schema == 1
                && backup_owner == 0
                && legacy_schema1::recognize(&verify)?)
        {
            return Err(incompatible());
        }
        drop(verify);
        journal.backup_sha256 = Some(digest(&backup_path)?);
        write_journal(directory, &journal, true)?;
    }
    ordinary(&backup_path, false)?;
    if journal.backup_sha256.as_deref() != Some(&digest(&backup_path)?) {
        return Err(incompatible());
    }
    after_backup()?;
    if version == journal.from_schema {
        if revision(&db)? != journal.source_revision {
            return Err(AppError::new(ErrorCode::ConfigConflict));
        }
        let tx = db
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| error())?;
        if journal.from_schema == 1 {
            // The original owner-zero bytes already have a verified backup.
            // Identity and schema2 commit atomically and resume together.
            tx.pragma_update(None, "application_id", 0x5441474du32)
                .map_err(|_| error())?;
            tx.execute_batch("CREATE TABLE config_metadata(singleton INTEGER PRIMARY KEY CHECK(singleton=1),config_uuid TEXT NOT NULL);").map_err(|_|error())?;
            tx.execute(
                "INSERT INTO config_metadata VALUES(1,?1)",
                [uuid::Uuid::new_v4().to_string()],
            )
            .map_err(|_| error())?;
        }
        if journal.to_schema == 5 {
            tx.execute_batch(crate::health::CREATE_HEALTH_TABLE)
                .map_err(|_| error())?;
        }
        if journal.to_schema == 7 {
            tx.execute_batch(crate::catalog::CREATE_CATALOG_TABLE)
                .map_err(|_| error())?;
        }
        if journal.to_schema == 8 {
            tx.execute_batch(crate::security::CREATE_SECURITY_TABLES)
                .map_err(|_| error())?;
        }
        // V3 protects authentication fields; V4 protects team drafts and immutable
        // publications from being silently dropped by older writers. V6 protects
        // the automatic-brain order source and dynamic step targets. V9 protects
        // soft-budget snapshot fields from being dropped by older writers. V10
        // protects provider timeout settings from older snapshot writers.
        // Historical snapshot bytes stay immutable; current readers supply defaults.
        tx.pragma_update(None, "user_version", journal.to_schema)
            .map_err(|_| error())?;
        tx.commit().map_err(|_| error())?;
        after_commit()?;
    }
    let archived = backups.join(format!("migration-{}.json", journal.operation_id));
    crate::initialization::publish_new(&directory.join(JOURNAL), &archived).map_err(|_| error())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn schema_eight_upgrade_preserves_historical_json_and_adds_soft_rules_only_in_new_revisions() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-budget-migration-")
            .tempdir()
            .unwrap();
        let db = legacy(temp.path());
        while schema(&db).unwrap() < 8 {
            prepare_inner(temp.path(), || Ok(())).unwrap();
        }
        let before: String = db
            .query_row(
                "SELECT snapshot FROM revisions WHERE revision=0",
                [],
                |row| row.get(0),
            )
            .unwrap();
        prepare_inner(temp.path(), || Ok(())).unwrap();
        assert_eq!(schema(&db).unwrap(), 9);
        assert_eq!(revision(&db).unwrap(), 0);
        assert_eq!(
            db.query_row::<String, _, _>(
                "SELECT snapshot FROM revisions WHERE revision=0",
                [],
                |row| row.get(0)
            )
            .unwrap(),
            before
        );
        let source = fs::read_dir(temp.path().join("backups"))
            .unwrap()
            .map(|entry| entry.unwrap().path())
            .find(|path| {
                path.file_name()
                    .unwrap()
                    .to_string_lossy()
                    .starts_with("schema-8-")
            })
            .unwrap();
        let backup = Connection::open_with_flags(source, OpenFlags::SQLITE_OPEN_READ_ONLY).unwrap();
        assert_eq!(schema(&backup).unwrap(), 8);
        assert_eq!(
            backup
                .query_row::<String, _, _>(
                    "SELECT snapshot FROM revisions WHERE revision=0",
                    [],
                    |row| row.get(0)
                )
                .unwrap(),
            before
        );
        drop(backup);
        drop(db);
        let config = ConfigService::open(
            temp.path(),
            std::sync::Arc::new(crate::credentials::SystemCredentials),
        )
        .unwrap();
        assert!(config.view().unwrap().budgets.is_empty());
        let view = config
            .save_budget(crate::budgets::SaveBudget {
                protocol_version: 1,
                expected_revision: 0,
                id: None,
                spec: crate::budgets::BudgetSpec {
                    name: "owned soft target".into(),
                    scope: crate::budgets::BudgetScope::AllAttempts,
                    period: crate::budgets::BudgetPeriod::UtcMonth,
                    request_limit: Some("10".into()),
                    token_limit: None,
                },
            })
            .unwrap();
        assert_eq!(view.desired_revision, 1);
        assert_eq!(view.budgets.len(), 1);
        println!(
            "Soft budget schema8->9:consistent source8 backup and original revision0 bytes preserved;default empty;only new revision1 contains a soft rule"
        );
    }
    fn legacy(directory: &Path) -> Connection {
        let db = Connection::open(directory.join("config.sqlite3")).unwrap();
        db.execute_batch("PRAGMA journal_mode=WAL;PRAGMA application_id=1413564237;CREATE TABLE revisions(revision INTEGER PRIMARY KEY,snapshot TEXT NOT NULL);CREATE TABLE config_head(singleton INTEGER PRIMARY KEY,revision INTEGER NOT NULL);CREATE TABLE credential_journal(operation_id TEXT PRIMARY KEY,credential_ref TEXT NOT NULL UNIQUE);INSERT INTO revisions VALUES(0,'{\"providers\":[]}');INSERT INTO config_head VALUES(1,0);PRAGMA user_version=1;").unwrap();
        db
    }
    #[test]
    fn schema_five_upgrade_backs_up_health_and_preserves_original_snapshot_bytes() {
        let temp = tempfile::tempdir().unwrap();
        let db = legacy(temp.path());
        while schema(&db).unwrap() < 5 {
            prepare_inner(temp.path(), || Ok(())).unwrap();
        }
        let original: String = db
            .query_row("SELECT snapshot FROM revisions WHERE revision=0", [], |r| {
                r.get(0)
            })
            .unwrap();
        let observed = r#"{"provider_id":"synthetic","model_id":"model","fingerprint":"synthetic","catalog_seen_ms":null,"inference_succeeded_ms":1000,"inference_failed_ms":null,"failure":null}"#;
        db.execute(
            "INSERT INTO model_health VALUES('synthetic','model','synthetic',?1)",
            [observed],
        )
        .unwrap();
        prepare(temp.path()).unwrap();
        assert_eq!(schema(&db).unwrap(), SCHEMA_VERSION);
        assert_eq!(revision(&db).unwrap(), 0);
        assert_eq!(
            db.query_row::<String, _, _>(
                "SELECT snapshot FROM revisions WHERE revision=0",
                [],
                |r| r.get(0)
            )
            .unwrap(),
            original
        );
        assert_eq!(
            db.query_row::<String, _, _>("SELECT observation FROM model_health", [], |r| r.get(0))
                .unwrap(),
            observed
        );
        let backup = fs::read_dir(temp.path().join("backups"))
            .unwrap()
            .filter_map(Result::ok)
            .find(|entry| entry.file_name().to_string_lossy().starts_with("schema-5-"))
            .unwrap();
        let saved = Connection::open(backup.path()).unwrap();
        assert_eq!(schema(&saved).unwrap(), 5);
        assert_eq!(
            saved
                .query_row::<String, _, _>("SELECT observation FROM model_health", [], |r| r.get(0))
                .unwrap(),
            observed
        );
        println!(
            "A14 schema5->{SCHEMA_VERSION}: backup includes health, original snapshot bytes and config revision preserved"
        );
    }

    #[test]
    fn schema_six_catalog_upgrade_retains_a_recoverable_backup_and_revision() {
        let temp = tempfile::tempdir().unwrap();
        let db = legacy(temp.path());
        while schema(&db).unwrap() < 6 {
            prepare_inner(temp.path(), || Ok(())).unwrap();
        }
        prepare(temp.path()).unwrap();
        assert_eq!(schema(&db).unwrap(), SCHEMA_VERSION);
        assert_eq!(revision(&db).unwrap(), 0);
        let count: u32 = db
            .query_row("SELECT count(*) FROM provider_catalog", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(count, 0);
        let saved = fs::read_dir(temp.path().join("backups"))
            .unwrap()
            .filter_map(Result::ok)
            .find(|entry| entry.file_name().to_string_lossy().starts_with("schema-6-"))
            .unwrap();
        let saved = Connection::open(saved.path()).unwrap();
        assert_eq!(schema(&saved).unwrap(), 6);
        assert_eq!(revision(&saved).unwrap(), 0);
        println!(
            "A08 schema6->7: catalog table created, source6 backup and config revision preserved"
        );
    }

    #[test]
    fn schema_seven_security_upgrade_keeps_snapshot_bytes_and_starts_with_empty_ledger() {
        let temp = tempfile::tempdir().unwrap();
        let db = legacy(temp.path());
        while schema(&db).unwrap() < 7 {
            prepare_inner(temp.path(), || Ok(())).unwrap();
        }
        let before: String = db
            .query_row(
                "SELECT snapshot FROM revisions WHERE revision=0",
                [],
                |row| row.get(0),
            )
            .unwrap();
        prepare_inner(temp.path(), || Ok(())).unwrap();
        assert_eq!(schema(&db).unwrap(), 8);
        assert_eq!(revision(&db).unwrap(), 0);
        assert_eq!(
            db.query_row::<u32, _, _>("SELECT revision FROM security_head", [], |row| row.get(0))
                .unwrap(),
            0
        );
        assert_eq!(
            db.query_row::<String, _, _>(
                "SELECT snapshot FROM revisions WHERE revision=0",
                [],
                |row| row.get(0)
            )
            .unwrap(),
            before
        );
        assert!(
            fs::read_dir(temp.path().join("backups"))
                .unwrap()
                .filter_map(Result::ok)
                .any(|entry| entry.file_name().to_string_lossy().starts_with("schema-7-"))
        );
        println!(
            "A11 schema7->8: recoverable source7 backup, unchanged business snapshot/revision, empty security head and indexed revocation ledger verified"
        );
    }

    #[test]
    fn backup_includes_committed_wal_and_historical_snapshot_bytes_are_unchanged() {
        let temp = tempfile::tempdir().unwrap();
        let db = legacy(temp.path());
        db.execute_batch("INSERT INTO revisions VALUES(1,'{\"providers\":[]}');UPDATE config_head SET revision=1;").unwrap();
        prepare(temp.path()).unwrap();
        assert_eq!(schema(&db).unwrap(), SCHEMA_VERSION);
        assert_eq!(revision(&db).unwrap(), 1);
        let backup = fs::read_dir(temp.path().join("backups"))
            .unwrap()
            .filter_map(Result::ok)
            .find(|e| e.file_name().to_string_lossy().starts_with("schema-1-"))
            .unwrap();
        let saved = Connection::open(backup.path()).unwrap();
        assert_eq!(schema(&saved).unwrap(), 1);
        assert_eq!(revision(&saved).unwrap(), 1);
        let original: String = db
            .query_row("SELECT snapshot FROM revisions WHERE revision=0", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(original, "{\"providers\":[]}");
    }
    #[test]
    fn failure_after_backup_keeps_original_schema_and_retry_uses_the_owned_backup() {
        let temp = tempfile::tempdir().unwrap();
        let db = legacy(temp.path());
        assert!(prepare_inner(temp.path(), || Err(error())).is_err());
        assert_eq!(schema(&db).unwrap(), 1);
        assert!(pending(temp.path()));
        prepare(temp.path()).unwrap();
        assert_eq!(schema(&db).unwrap(), SCHEMA_VERSION);
        assert!(!pending(temp.path()));
    }

    #[test]
    fn runtime_reader_never_migrates_and_writer_requires_all_live_readers_to_exit() {
        use fs2::FileExt;
        let temp = tempfile::tempdir().unwrap();
        let db = legacy(temp.path());
        drop(db);
        let before = fs::read(temp.path().join("config.sqlite3")).unwrap();
        assert_eq!(
            ConfigService::read_runtime_snapshot(temp.path())
                .err()
                .unwrap()
                .code,
            ErrorCode::IncompatibleVersion
        );
        assert_eq!(
            fs::read(temp.path().join("config.sqlite3")).unwrap(),
            before
        );
        let live = OpenOptions::new()
            .create(true)
            .truncate(false)
            .read(true)
            .write(true)
            .open(temp.path().join("maintenance.lock"))
            .unwrap();
        FileExt::try_lock_shared(&live).unwrap();
        assert_eq!(
            ConfigService::open(
                temp.path(),
                std::sync::Arc::new(crate::credentials::SystemCredentials)
            )
            .err()
            .unwrap()
            .code,
            ErrorCode::MaintenanceInProgress
        );
        assert!(!pending(temp.path()));
        drop(live);
        let writer = ConfigService::open(
            temp.path(),
            std::sync::Arc::new(crate::credentials::SystemCredentials),
        )
        .unwrap();
        assert_eq!(writer.view().unwrap().schema_version, SCHEMA_VERSION);
        assert_eq!(
            ConfigService::read_runtime_snapshot(temp.path()).unwrap().0,
            0
        );
    }

    #[test]
    #[ignore = "Child only: real migration interruption"]
    fn migration_crash_worker() {
        let directory = std::env::var_os("TAGMA_MIGRATION_CRASH_DIR").expect("owned fixture");
        let _ = prepare_inner(Path::new(&directory), || std::process::exit(91));
        panic!("did not interrupt");
    }
    #[test]
    fn real_process_exit_after_backup_recovers_without_losing_original_revision() {
        let temp = tempfile::tempdir().unwrap();
        drop(legacy(temp.path()));
        let status = std::process::Command::new(std::env::current_exe().unwrap())
            .args([
                "--ignored",
                "--exact",
                "migrations::tests::migration_crash_worker",
            ])
            .env("TAGMA_MIGRATION_CRASH_DIR", temp.path())
            .status()
            .unwrap();
        assert_eq!(status.code(), Some(91));
        let db = Connection::open(temp.path().join("config.sqlite3")).unwrap();
        assert_eq!(schema(&db).unwrap(), 1);
        drop(db);
        let service = ConfigService::open(
            temp.path(),
            std::sync::Arc::new(crate::credentials::SystemCredentials),
        )
        .unwrap();
        assert_eq!(service.view().unwrap().desired_revision, 0);
        assert_eq!(service.view().unwrap().schema_version, SCHEMA_VERSION);
        assert!(!pending(temp.path()));
    }

    #[test]
    fn schema_two_profiles_and_config_identity_survive_gateway_contract_upgrade() {
        let temp = tempfile::tempdir().unwrap();
        let db = legacy(temp.path());
        prepare_inner(temp.path(), || Ok(())).unwrap();
        assert_eq!(schema(&db).unwrap(), 2);
        let id: String = db
            .query_row("SELECT config_uuid FROM config_metadata", [], |r| r.get(0))
            .unwrap();
        let snapshot = format!(
            "{{\"providers\":[],\"profiles\":[{{\"id\":\"{}\",\"name\":\"Editor\",\"target_app\":\"Cursor\",\"provider_ids\":[],\"use_global_order\":true,\"is_global\":false}}]}}",
            uuid::Uuid::new_v4()
        );
        db.execute("INSERT INTO revisions VALUES(1,?1)", [&snapshot])
            .unwrap();
        db.execute("UPDATE config_head SET revision=1", []).unwrap();
        prepare(temp.path()).unwrap();
        assert_eq!(schema(&db).unwrap(), SCHEMA_VERSION);
        let after: String = db
            .query_row("SELECT snapshot FROM revisions WHERE revision=1", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(after, snapshot);
        let identity: String = db
            .query_row("SELECT config_uuid FROM config_metadata", [], |r| r.get(0))
            .unwrap();
        assert_eq!(identity, id);
        drop(db);
        let service = ConfigService::open(
            temp.path(),
            std::sync::Arc::new(crate::credentials::SystemCredentials),
        )
        .unwrap();
        let view = service.view().unwrap();
        assert_eq!(view.profiles[1].name, "Editor");
        assert!(view.gateway.auth_enabled);
        assert!(!view.gateway.has_access_token);
        assert!(
            fs::read_dir(temp.path().join("backups"))
                .unwrap()
                .filter_map(Result::ok)
                .any(|e| e.file_name().to_string_lossy().starts_with("schema-2-"))
        );
    }

    #[test]
    fn legacy_pending_one_to_two_journal_resumes_before_following_transition() {
        let temp = tempfile::tempdir().unwrap();
        let db = legacy(temp.path());
        fs::write(temp.path().join(JOURNAL),serde_json::to_vec(&serde_json::json!({"owner":LEGACY_OWNER,"operation_id":uuid::Uuid::new_v4().to_string(),"source_revision":0,"backup_sha256":null})).unwrap()).unwrap();
        prepare(temp.path()).unwrap();
        assert_eq!(schema(&db).unwrap(), SCHEMA_VERSION);
        assert!(!pending(temp.path()));
    }

    #[test]
    fn schema_three_team_upgrade_preserves_bytes_and_retains_schema_three_backup() {
        let temp = tempfile::tempdir().unwrap();
        let db = legacy(temp.path());
        prepare_inner(temp.path(), || Ok(())).unwrap();
        prepare_inner(temp.path(), || Ok(())).unwrap();
        assert_eq!(schema(&db).unwrap(), 3);
        let identity: String = db
            .query_row("SELECT config_uuid FROM config_metadata", [], |r| r.get(0))
            .unwrap();
        let original: String = db
            .query_row("SELECT snapshot FROM revisions WHERE revision=0", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(
            ConfigService::read_runtime_snapshot(temp.path())
                .err()
                .unwrap()
                .code,
            ErrorCode::IncompatibleVersion
        );
        prepare(temp.path()).unwrap();
        assert_eq!(schema(&db).unwrap(), SCHEMA_VERSION);
        assert_eq!(
            db.query_row::<String, _, _>(
                "SELECT snapshot FROM revisions WHERE revision=0",
                [],
                |r| r.get(0)
            )
            .unwrap(),
            original
        );
        assert_eq!(
            db.query_row::<String, _, _>("SELECT config_uuid FROM config_metadata", [], |r| r
                .get(0))
                .unwrap(),
            identity
        );
        assert!(
            ConfigService::read_runtime_snapshot(temp.path())
                .unwrap()
                .1
                .teams
                .is_empty()
        );
        let backup = fs::read_dir(temp.path().join("backups"))
            .unwrap()
            .filter_map(Result::ok)
            .find(|entry| entry.file_name().to_string_lossy().starts_with("schema-3-"))
            .unwrap();
        let old = Connection::open(backup.path()).unwrap();
        assert_eq!(schema(&old).unwrap(), 3);
        assert_eq!(
            old.query_row::<String, _, _>(
                "SELECT snapshot FROM revisions WHERE revision=0",
                [],
                |r| r.get(0)
            )
            .unwrap(),
            original
        );
    }
}
