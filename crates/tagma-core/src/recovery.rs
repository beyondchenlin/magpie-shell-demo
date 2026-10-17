//! Explicit, reversible recovery of a damaged initialization record. No generic paths
//! are accepted from clients, and an existing database is never overwritten.
use crate::*;
use fs2::FileExt;
use sha2::{Digest, Sha256};
use std::{
    fs::{self, OpenOptions},
    io::Read,
    path::{Path, PathBuf},
};

const RECORD: &str = "config-initialization.json";
fn required() -> AppError {
    AppError::new(ErrorCode::InitializationRecoveryRequired)
}
fn read_record(directory: &Path) -> AppResult<Vec<u8>> {
    let path = directory.join(RECORD);
    let metadata = fs::symlink_metadata(&path).map_err(|_| required())?;
    if !metadata.is_file() || metadata.file_type().is_symlink() || metadata.len() > 4096 {
        return Err(required());
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes() & 0x400 != 0 {
            return Err(required());
        }
    }
    let mut bytes = Vec::with_capacity(4097);
    fs::File::open(path)
        .map_err(|_| required())?
        .take(4097)
        .read_to_end(&mut bytes)
        .map_err(|_| required())?;
    if bytes.len() > 4096 {
        return Err(required());
    }
    Ok(bytes)
}
fn archive(directory: &Path, operation: &uuid::Uuid) -> PathBuf {
    directory
        .join("recovery")
        .join(format!("initialization-intent-{operation}.json"))
}

pub fn initialization_plan(directory: &Path) -> AppResult<Option<InitializationRecoveryPlan>> {
    if directory.join("config.sqlite3").exists() || !directory.join(RECORD).exists() {
        return Ok(None);
    }
    let bytes = read_record(directory)?;
    // Intact records, including newer schemas, follow their own initialization/version path.
    if serde_json::from_slice::<serde_json::Value>(&bytes).is_ok() {
        return Ok(None);
    }
    let operation = uuid::Uuid::new_v4();
    Ok(Some(InitializationRecoveryPlan {
        operation_id: operation.to_string(),
        record_path: directory.join(RECORD).to_string_lossy().into_owned(),
        archive_path: archive(directory, &operation)
            .to_string_lossy()
            .into_owned(),
        expected_sha256: format!("{:x}", Sha256::digest(&bytes)),
    }))
}

pub fn archive_initialization_record(
    directory: &Path,
    input: RecoverInitialization,
) -> AppResult<RecoveryOutcome> {
    check_protocol(input.protocol_version)?;
    if input.expected_sha256.len() != 64
        || !input
            .expected_sha256
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit())
    {
        return Err(AppError::new(ErrorCode::InvalidInput));
    }
    let operation = uuid::Uuid::parse_str(&input.operation_id)
        .map_err(|_| AppError::new(ErrorCode::InvalidInput))?;
    let maintenance = OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .open(directory.join("maintenance.lock"))
        .map_err(|_| required())?;
    maintenance
        .try_lock_exclusive()
        .map_err(|_| AppError::new(ErrorCode::MaintenanceInProgress))?;
    if directory.join("config.sqlite3").exists() {
        return Err(required());
    }
    let bytes = read_record(directory)?;
    if format!("{:x}", Sha256::digest(&bytes)) != input.expected_sha256 {
        return Err(AppError::new(ErrorCode::ConfigConflict));
    }
    if serde_json::from_slice::<serde_json::Value>(&bytes).is_ok() {
        return Err(required());
    }
    let destination = archive(directory, &operation);
    let parent = destination.parent().ok_or_else(required)?;
    fs::create_dir_all(parent).map_err(|_| required())?;
    let metadata = fs::symlink_metadata(parent).map_err(|_| required())?;
    if !metadata.is_dir() || metadata.file_type().is_symlink() {
        return Err(required());
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes() & 0x400 != 0 {
            return Err(required());
        }
    }
    crate::initialization::publish_new(&directory.join(RECORD), &destination)
        .map_err(|_| required())?;
    Ok(RecoveryOutcome {
        archive_path: destination.to_string_lossy().into_owned(),
        requires_restart: true,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn corrupt_committed_record_is_preserved_until_exact_explicit_archive() {
        let temp = tempfile::tempdir().unwrap();
        let source = temp.path().join(RECORD);
        fs::write(&source, b"{partial-json").unwrap();
        fs::write(temp.path().join("unrelated-output"), b"keep").unwrap();
        assert_eq!(
            ConfigService::open(
                temp.path(),
                std::sync::Arc::new(crate::credentials::SystemCredentials)
            )
            .err()
            .unwrap()
            .code,
            ErrorCode::InitializationRecoveryRequired
        );
        assert_eq!(fs::read(&source).unwrap(), b"{partial-json");
        let plan = initialization_plan(temp.path()).unwrap().unwrap();
        let outcome = archive_initialization_record(
            temp.path(),
            RecoverInitialization {
                protocol_version: 1,
                operation_id: plan.operation_id,
                expected_sha256: plan.expected_sha256,
            },
        )
        .unwrap();
        assert_eq!(fs::read(outcome.archive_path).unwrap(), b"{partial-json");
        assert_eq!(
            fs::read(temp.path().join("unrelated-output")).unwrap(),
            b"keep"
        );
        let reopened = ConfigService::open(
            temp.path(),
            std::sync::Arc::new(crate::credentials::SystemCredentials),
        )
        .unwrap();
        assert_eq!(reopened.view().unwrap().desired_revision, 0);
    }
    #[test]
    fn changed_record_existing_database_and_valid_future_record_are_protected() {
        let temp = tempfile::tempdir().unwrap();
        let source = temp.path().join(RECORD);
        fs::write(&source, b"{").unwrap();
        let plan = initialization_plan(temp.path()).unwrap().unwrap();
        fs::write(&source, b"{changed").unwrap();
        assert_eq!(
            archive_initialization_record(
                temp.path(),
                RecoverInitialization {
                    protocol_version: 1,
                    operation_id: plan.operation_id,
                    expected_sha256: plan.expected_sha256
                }
            )
            .unwrap_err()
            .code,
            ErrorCode::ConfigConflict
        );
        fs::write(temp.path().join("config.sqlite3"), b"unknown-database").unwrap();
        assert!(initialization_plan(temp.path()).unwrap().is_none());
        assert_eq!(
            fs::read(temp.path().join("config.sqlite3")).unwrap(),
            b"unknown-database"
        );
        let other = tempfile::tempdir().unwrap();
        fs::write(
            other.path().join(RECORD),
            b"{\"owner\":\"future\",\"schema_version\":999}",
        )
        .unwrap();
        assert!(initialization_plan(other.path()).unwrap().is_none());
    }
}
