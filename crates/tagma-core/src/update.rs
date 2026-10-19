//! Read-only compatibility inspection. The installer holds maintenance.lock
//! exclusively for this check and until all program writes have finished.
use crate::*;
use rusqlite::{Connection, OpenFlags};
use std::path::Path;

pub fn check_configuration(directory: &Path) -> AppResult<()> {
    crate::usage::check_update(directory)?;
    // Interrupted initialization/migration must recover through its existing
    // journal, never be interpreted as an empty new installation.
    if crate::initialization::pending(directory) || crate::migrations::pending(directory) {
        return Err(AppError::new(ErrorCode::MaintenanceInProgress));
    }
    let path = directory.join("config.sqlite3");
    match std::fs::symlink_metadata(&path) {
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(_) => return Err(AppError::new(ErrorCode::StorageUnavailable)),
        Ok(m) => {
            if !m.is_file() || m.file_type().is_symlink() {
                return Err(AppError::new(ErrorCode::IncompatibleVersion));
            }
            #[cfg(windows)]
            {
                use std::os::windows::fs::MetadataExt;
                if m.file_attributes() & 0x400 != 0 {
                    return Err(AppError::new(ErrorCode::IncompatibleVersion));
                }
            }
        }
    }
    let db = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|_| AppError::new(ErrorCode::StorageUnavailable))?;
    db.busy_timeout(std::time::Duration::from_secs(2))
        .map_err(|_| AppError::new(ErrorCode::StorageUnavailable))?;
    let version = db
        .pragma_query_value(None, "user_version", |r| r.get(0))
        .map_err(|_| AppError::new(ErrorCode::IncompatibleVersion))?;
    crate::migrations::validate_update_schema(&db, version)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::credentials::CredentialStore;
    use std::sync::Arc;
    struct NoCredentials;
    impl CredentialStore for NoCredentials {
        fn set(&self, _: &str, _: &str) -> AppResult<()> {
            panic!("unexpected credentials access")
        }
        fn get(&self, _: &str) -> AppResult<zeroize::Zeroizing<String>> {
            panic!("unexpected credentials access")
        }
        fn delete(&self, _: &str) -> AppResult<()> {
            panic!("unexpected credentials access")
        }
    }

    #[test]
    fn update_check_accepts_current_without_changing_database_and_rejects_future_or_foreign() {
        let root = tempfile::tempdir().unwrap();
        check_configuration(root.path()).unwrap();
        assert_eq!(std::fs::read_dir(root.path()).unwrap().count(), 0);
        drop(ConfigService::open(root.path(), Arc::new(NoCredentials)).unwrap());
        let path = root.path().join("config.sqlite3");
        let before = std::fs::read(&path).unwrap();
        check_configuration(root.path()).unwrap();
        assert_eq!(before, std::fs::read(&path).unwrap());
        for (schema, owner) in [(SCHEMA_VERSION + 1, 0x5441474d), (SCHEMA_VERSION, 0)] {
            let db = Connection::open(&path).unwrap();
            db.pragma_update(None, "user_version", schema).unwrap();
            db.pragma_update(None, "application_id", owner).unwrap();
            drop(db);
            let before = std::fs::read(&path).unwrap();
            assert_eq!(
                check_configuration(root.path()).unwrap_err().code,
                ErrorCode::IncompatibleVersion
            );
            assert_eq!(before, std::fs::read(&path).unwrap());
        }
    }
}
