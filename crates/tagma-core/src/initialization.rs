//! An unpublished database is staged under a journal-owned unique name. The final
//! database is published only after initialization commits and closes SQLite.
use crate::*;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::{
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    path::Path,
};

const APPLICATION_ID: u32 = 0x5441474d; // TAGM
const INTENT: &str = "config-initialization.json";
const OWNER: &str = "com.tagmaai.desktop/config-initialization/v1";

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Intent {
    owner: String,
    operation_id: String,
    schema_version: u32,
    staging_file: String,
}

fn error() -> AppError {
    AppError::new(ErrorCode::StorageUnavailable)
}
fn incompatible() -> AppError {
    AppError::new(ErrorCode::IncompatibleVersion)
}
pub(crate) fn pending(directory: &Path) -> bool {
    directory.join(INTENT).exists()
}

fn regular(path: &Path) -> AppResult<()> {
    let metadata = fs::symlink_metadata(path).map_err(|_| error())?;
    if !metadata.is_file() || metadata.file_type().is_symlink() {
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

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum IntentPoint {
    Created,
    PartialWritten,
    Synced,
    DatabaseReady,
}

pub(crate) fn ensure(directory: &Path, after_create: impl FnOnce()) -> AppResult<()> {
    ensure_inner(directory, after_create, |_| {})
}

fn ensure_inner(
    directory: &Path,
    after_create: impl FnOnce(),
    intent_hook: impl Fn(IntentPoint),
) -> AppResult<()> {
    let target = directory.join("config.sqlite3");
    let intent_path = directory.join(INTENT);
    let intent: Intent = if intent_path.exists() {
        regular(&intent_path)?;
        let mut bytes = Vec::with_capacity(4097);
        File::open(&intent_path)
            .map_err(|_| error())?
            .take(4097)
            .read_to_end(&mut bytes)
            .map_err(|_| error())?;
        if bytes.len() > 4096 {
            return Err(incompatible());
        }
        serde_json::from_slice(&bytes)
            .map_err(|_| AppError::new(ErrorCode::InitializationRecoveryRequired))?
    } else {
        if target.exists() {
            return Err(incompatible());
        }
        let operation_id = uuid::Uuid::new_v4().to_string();
        let intent = Intent {
            owner: OWNER.into(),
            staging_file: format!(".config-initializing-{operation_id}.sqlite3"),
            operation_id,
            schema_version: SCHEMA_VERSION,
        };
        // Never expose an empty/partial JSON record at the committed intent path.
        // Unpublished unique temporary records have no database or credential side effects.
        let temporary = directory.join(format!(
            ".config-initialization-intent-{}.tmp",
            intent.operation_id
        ));
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&temporary)
            .map_err(|_| error())?;
        intent_hook(IntentPoint::Created);
        let bytes = serde_json::to_vec(&intent).map_err(|_| error())?;
        let midpoint = bytes.len() / 2;
        file.write_all(&bytes[..midpoint]).map_err(|_| error())?;
        intent_hook(IntentPoint::PartialWritten);
        file.write_all(&bytes[midpoint..]).map_err(|_| error())?;
        file.sync_all().map_err(|_| error())?;
        intent_hook(IntentPoint::Synced);
        drop(file);
        publish_new(&temporary, &intent_path).map_err(|_| error())?;
        intent
    };
    let operation = uuid::Uuid::parse_str(&intent.operation_id).map_err(|_| incompatible())?;
    if intent.owner != OWNER
        || !(1..=SCHEMA_VERSION).contains(&intent.schema_version)
        || intent.staging_file != format!(".config-initializing-{operation}.sqlite3")
    {
        return Err(incompatible());
    }
    let staging = directory.join(&intent.staging_file);
    if target.exists() {
        // A crash after publication leaves only the marker. Never replace an existing database.
        regular(&target)?;
        if staging.exists() {
            return Err(incompatible());
        }
        let db = Connection::open_with_flags(&target, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)
            .map_err(|_| error())?;
        let schema: u32 = db
            .pragma_query_value(None, "user_version", |r| r.get(0))
            .map_err(|_| error())?;
        let owner: u32 = db
            .pragma_query_value(None, "application_id", |r| r.get(0))
            .map_err(|_| error())?;
        if schema != intent.schema_version || owner != APPLICATION_ID {
            return Err(incompatible());
        }
        drop(db);
        fs::remove_file(intent_path).map_err(|_| error())?;
        return Ok(());
    }
    if staging.exists() {
        regular(&staging)?;
    }
    let mut db = Connection::open(&staging).map_err(|_| error())?;
    after_create();
    let schema: u32 = db
        .pragma_query_value(None, "user_version", |r| r.get(0))
        .map_err(|_| error())?;
    let owner: u32 = db
        .pragma_query_value(None, "application_id", |r| r.get(0))
        .map_err(|_| error())?;
    let objects: u32 = db
        .query_row(
            "SELECT count(*) FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%'",
            [],
            |r| r.get(0),
        )
        .map_err(|_| error())?;
    if schema == 0 && owner == 0 && objects == 0 {
        let tx = db
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
            .map_err(|_| error())?;
        tx.execute_batch("
            CREATE TABLE revisions(revision INTEGER PRIMARY KEY, snapshot TEXT NOT NULL);
            CREATE TABLE config_head(singleton INTEGER PRIMARY KEY CHECK(singleton=1), revision INTEGER NOT NULL REFERENCES revisions(revision));
            CREATE TABLE credential_journal(operation_id TEXT PRIMARY KEY, credential_ref TEXT NOT NULL UNIQUE);
            INSERT INTO revisions VALUES(0, '{\"providers\":[]}');
            INSERT INTO config_head VALUES(1,0);
            PRAGMA application_id=1413564237;").map_err(|_|error())?;
        if intent.schema_version >= 2 {
            tx.execute_batch("CREATE TABLE config_metadata(singleton INTEGER PRIMARY KEY CHECK(singleton=1),config_uuid TEXT NOT NULL);").map_err(|_|error())?;
            tx.execute(
                "INSERT INTO config_metadata VALUES(1,?1)",
                [uuid::Uuid::new_v4().to_string()],
            )
            .map_err(|_| error())?;
        }
        if intent.schema_version >= 5 {
            tx.execute_batch(crate::health::CREATE_HEALTH_TABLE)
                .map_err(|_| error())?;
        }
        if intent.schema_version >= 7 {
            tx.execute_batch(crate::catalog::CREATE_CATALOG_TABLE)
                .map_err(|_| error())?;
        }
        if intent.schema_version >= 8 {
            tx.execute_batch(crate::security::CREATE_SECURITY_TABLES)
                .map_err(|_| error())?;
        }
        tx.pragma_update(None, "user_version", intent.schema_version)
            .map_err(|_| error())?;
        tx.commit().map_err(|_| error())?;
    } else if schema != intent.schema_version
        || owner != APPLICATION_ID
        || objects
            != if intent.schema_version >= 8 {
                9
            } else if intent.schema_version >= 7 {
                6
            } else if intent.schema_version >= 5 {
                5
            } else if intent.schema_version >= 2 {
                4
            } else {
                3
            }
    {
        return Err(incompatible());
    }
    // This staging file cannot have received business writes before publication.
    let initial: u32 = db
        .query_row(
            "SELECT revision FROM config_head WHERE singleton=1",
            [],
            |r| r.get(0),
        )
        .map_err(|_| error())?;
    if initial != 0 {
        return Err(incompatible());
    }
    drop(db);
    // Windows FlushFileBuffers requires a handle opened for writing.
    OpenOptions::new()
        .read(true)
        .write(true)
        .open(&staging)
        .map_err(|_| error())?
        .sync_all()
        .map_err(|_| error())?;
    intent_hook(IntentPoint::DatabaseReady);
    publish_new(&staging, &target).map_err(|_| error())?;
    fs::remove_file(intent_path).map_err(|_| error())?;
    Ok(())
}

/// Same-volume atomic publication with NO replacement and no shared writable hard links.
#[cfg(windows)]
pub(crate) fn publish_new(source: &Path, target: &Path) -> std::io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{MOVEFILE_WRITE_THROUGH, MoveFileExW};
    let source: Vec<u16> = source.as_os_str().encode_wide().chain(Some(0)).collect();
    let target: Vec<u16> = target.as_os_str().encode_wide().chain(Some(0)).collect();
    // No MOVEFILE_REPLACE_EXISTING flag: a newly appeared unknown target is preserved.
    if unsafe { MoveFileExW(source.as_ptr(), target.as_ptr(), MOVEFILE_WRITE_THROUGH) } == 0 {
        Err(std::io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn committed_owned_staging_for_catalog_and_security_schemas_can_finish_publication() {
        for version in [7, 8, 9, SCHEMA_VERSION] {
            let temp = tempfile::tempdir().unwrap();
            let operation_id = uuid::Uuid::new_v4().to_string();
            let staging_file = format!(".config-initializing-{operation_id}.sqlite3");
            let intent = Intent {
                owner: OWNER.into(),
                operation_id,
                schema_version: version,
                staging_file: staging_file.clone(),
            };
            fs::write(
                temp.path().join(INTENT),
                serde_json::to_vec(&intent).unwrap(),
            )
            .unwrap();
            let stopped = std::process::Command::new(std::env::current_exe().unwrap())
                .args([
                    "--ignored",
                    "--exact",
                    "initialization::tests::intent_crash_worker",
                ])
                .env("TAGMA_INTENT_CRASH_DIR", temp.path())
                .env("TAGMA_INTENT_CRASH_POINT", "database-ready")
                .status()
                .unwrap();
            assert_eq!(stopped.code(), Some(90));
            assert!(!temp.path().join("config.sqlite3").exists());
            let staged = Connection::open_with_flags(
                temp.path().join(&staging_file),
                rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
            )
            .unwrap();
            let count: u32 = staged
                .query_row(
                    "SELECT count(*) FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%'",
                    [],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(count, if version == 7 { 6 } else { 9 });
            drop(staged);
            let before = fs::read(temp.path().join(&staging_file)).unwrap();
            ensure(temp.path(), || {}).unwrap();
            assert_eq!(
                fs::read(temp.path().join("config.sqlite3")).unwrap(),
                before
            );
            let db = Connection::open(temp.path().join("config.sqlite3")).unwrap();
            assert_eq!(
                db.pragma_query_value::<u32, _>(None, "user_version", |row| row.get(0))
                    .unwrap(),
                version
            );
            assert!(!pending(temp.path()));
            assert!(!temp.path().join(staging_file).exists());
        }
        println!(
            "Initialization recovery: committed owned schema7/8/9 staging publish after interruption; unknown staging protection remains enabled"
        );
    }
    #[test]
    #[ignore = "Child only: intent publication interruption"]
    fn intent_crash_worker() {
        let directory = std::env::var_os("TAGMA_INTENT_CRASH_DIR").expect("owned directory");
        let point = match std::env::var("TAGMA_INTENT_CRASH_POINT").unwrap().as_str() {
            "created" => IntentPoint::Created,
            "partial" => IntentPoint::PartialWritten,
            "database-ready" => IntentPoint::DatabaseReady,
            "synced" => IntentPoint::Synced,
            _ => panic!("point"),
        };
        let _ = ensure_inner(
            Path::new(&directory),
            || {},
            move |at| {
                if at == point {
                    std::process::exit(90);
                }
            },
        );
        panic!("fixture did not exit");
    }
    fn interrupted_intent(point: &str) {
        let temp = tempfile::tempdir().unwrap();
        let result = std::process::Command::new(std::env::current_exe().unwrap())
            .args([
                "--ignored",
                "--exact",
                "initialization::tests::intent_crash_worker",
            ])
            .env("TAGMA_INTENT_CRASH_DIR", temp.path())
            .env("TAGMA_INTENT_CRASH_POINT", point)
            .status()
            .unwrap();
        assert_eq!(result.code(), Some(90));
        assert!(
            !temp.path().join(INTENT).exists(),
            "Unpublished/partial intent must not appear at the committed path"
        );
        let owned_before: Vec<_> = fs::read_dir(temp.path())
            .unwrap()
            .map(|e| e.unwrap().path())
            .collect();
        let service = ConfigService::open(
            temp.path(),
            std::sync::Arc::new(crate::credentials::SystemCredentials),
        )
        .unwrap();
        assert_eq!(service.view().unwrap().desired_revision, 0);
        assert!(
            owned_before.iter().all(|p| p.exists()),
            "Interrupted temporary records must be preserved, not silently deleted"
        );
    }
    #[test]
    fn crash_after_intent_file_creation_recovers() {
        interrupted_intent("created");
    }
    #[test]
    fn crash_after_partial_intent_write_recovers() {
        interrupted_intent("partial");
    }
    #[test]
    fn crash_after_intent_sync_before_publication_recovers() {
        interrupted_intent("synced");
    }
    #[test]
    fn atomic_publication_never_replaces_a_newly_appeared_target() {
        let temp = tempfile::tempdir().unwrap();
        let staging = temp.path().join("owned-stage");
        let target = temp.path().join("database");
        fs::write(&staging, b"app-owned").unwrap();
        fs::write(&target, b"unknown-data").unwrap();
        assert!(publish_new(&staging, &target).is_err());
        assert_eq!(fs::read(&target).unwrap(), b"unknown-data");
        assert_eq!(fs::read(&staging).unwrap(), b"app-owned");
    }
    #[test]
    fn owned_staging_with_unexpected_tables_is_preserved() {
        let temp = tempfile::tempdir().unwrap();
        let interrupted = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            ensure(temp.path(), || panic!("test interruption"))
        }));
        assert!(interrupted.is_err());
        let intent: Intent =
            serde_json::from_slice(&fs::read(temp.path().join(INTENT)).unwrap()).unwrap();
        let staging = temp.path().join(intent.staging_file);
        let db = Connection::open(&staging).unwrap();
        db.execute_batch(
            "CREATE TABLE important(value TEXT);INSERT INTO important VALUES('retain');",
        )
        .unwrap();
        drop(db);
        let before = fs::read(&staging).unwrap();
        assert_eq!(
            ensure(temp.path(), || {}).unwrap_err().code,
            ErrorCode::IncompatibleVersion
        );
        assert_eq!(fs::read(&staging).unwrap(), before);
        assert!(!temp.path().join("config.sqlite3").exists());
    }
}

#[cfg(unix)]
pub(crate) fn publish_new(source: &Path, target: &Path) -> std::io::Result<()> {
    use std::{ffi::CString, os::unix::ffi::OsStrExt};
    let source = CString::new(source.as_os_str().as_bytes())?;
    let target = CString::new(target.as_os_str().as_bytes())?;
    #[cfg(target_os = "linux")]
    let result = unsafe {
        libc::renameat2(
            libc::AT_FDCWD,
            source.as_ptr(),
            libc::AT_FDCWD,
            target.as_ptr(),
            libc::RENAME_NOREPLACE,
        )
    };
    #[cfg(target_os = "macos")]
    let result = unsafe { libc::renamex_np(source.as_ptr(), target.as_ptr(), libc::RENAME_EXCL) };
    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    return Err(std::io::Error::new(
        std::io::ErrorKind::Unsupported,
        "platform publication not implemented",
    ));
    if result != 0 {
        Err(std::io::Error::last_os_error())
    } else {
        Ok(())
    }
}
