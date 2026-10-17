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
const OWNER: &str = "com.tagmaai.desktop/migration-1-2/v1";
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Journal {
    owner: String,
    operation_id: String,
    source_revision: u32,
    backup_sha256: Option<String>,
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
    prepare_inner(directory, || Ok(()))
}
fn prepare_inner(directory: &Path, after_backup: impl FnOnce() -> AppResult<()>) -> AppResult<()> {
    let mut db = Connection::open_with_flags(
        directory.join("config.sqlite3"),
        OpenFlags::SQLITE_OPEN_READ_WRITE,
    )
    .map_err(|_| error())?;
    db.busy_timeout(Duration::from_secs(2))
        .map_err(|_| error())?;
    let version = schema(&db)?;
    if version != 1 && version != 2 {
        return Err(incompatible());
    }
    if version == 2 && !pending(directory) {
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
    } else {
        vec![
            "config_head",
            "config_metadata",
            "credential_journal",
            "revisions",
        ]
    };
    if application != 0x5441474d || names != expected {
        return Err(incompatible());
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
        };
        write_journal(directory, &journal, false)?;
        journal
    };
    if journal.owner != OWNER
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
    let backup_path = backups.join(format!("schema-1-{}.sqlite3", journal.operation_id));
    if journal.backup_sha256.is_none() {
        if version != 1 || revision(&db)? != journal.source_revision {
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
        } else if previous != 1 || revision(&destination)? != journal.source_revision {
            return Err(incompatible());
        }
        drop(destination);
        let verify = Connection::open_with_flags(&backup_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
            .map_err(|_| error())?;
        let integrity: String = verify
            .query_row("PRAGMA quick_check", [], |r| r.get(0))
            .map_err(|_| error())?;
        if integrity != "ok"
            || schema(&verify)? != 1
            || revision(&verify)? != journal.source_revision
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
    if version == 1 {
        if revision(&db)? != journal.source_revision {
            return Err(AppError::new(ErrorCode::ConfigConflict));
        }
        let tx = db
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| error())?;
        tx.execute_batch("CREATE TABLE config_metadata(singleton INTEGER PRIMARY KEY CHECK(singleton=1),config_uuid TEXT NOT NULL);").map_err(|_|error())?;
        tx.execute(
            "INSERT INTO config_metadata VALUES(1,?1)",
            [uuid::Uuid::new_v4().to_string()],
        )
        .map_err(|_| error())?;
        // Historical snapshot bytes stay immutable. V2 readers supply the documented defaults.
        tx.pragma_update(None, "user_version", 2)
            .map_err(|_| error())?;
        tx.commit().map_err(|_| error())?;
    }
    let archived = backups.join(format!("migration-{}.json", journal.operation_id));
    crate::initialization::publish_new(&directory.join(JOURNAL), &archived).map_err(|_| error())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn legacy(directory: &Path) -> Connection {
        let db = Connection::open(directory.join("config.sqlite3")).unwrap();
        db.execute_batch("PRAGMA journal_mode=WAL;PRAGMA application_id=1413564237;CREATE TABLE revisions(revision INTEGER PRIMARY KEY,snapshot TEXT NOT NULL);CREATE TABLE config_head(singleton INTEGER PRIMARY KEY,revision INTEGER NOT NULL);CREATE TABLE credential_journal(operation_id TEXT PRIMARY KEY,credential_ref TEXT NOT NULL UNIQUE);INSERT INTO revisions VALUES(0,'{\"providers\":[]}');INSERT INTO config_head VALUES(1,0);PRAGMA user_version=1;").unwrap();
        db
    }
    #[test]
    fn backup_includes_committed_wal_and_historical_snapshot_bytes_are_unchanged() {
        let temp = tempfile::tempdir().unwrap();
        let db = legacy(temp.path());
        db.execute_batch("INSERT INTO revisions VALUES(1,'{\"providers\":[]}');UPDATE config_head SET revision=1;").unwrap();
        prepare(temp.path()).unwrap();
        assert_eq!(schema(&db).unwrap(), 2);
        assert_eq!(revision(&db).unwrap(), 1);
        let backup = fs::read_dir(temp.path().join("backups"))
            .unwrap()
            .filter_map(Result::ok)
            .find(|e| e.path().extension().is_some_and(|s| s == "sqlite3"))
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
        assert_eq!(schema(&db).unwrap(), 2);
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
        assert_eq!(writer.view().unwrap().schema_version, 2);
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
        assert_eq!(service.view().unwrap().schema_version, 2);
        assert!(!pending(temp.path()));
    }
}
