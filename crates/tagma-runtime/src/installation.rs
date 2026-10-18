//! Cooperate with the Windows installer before opening configuration or IPC.
//! This lease is separate from the per-configuration migration/maintenance lock.
use fs2::FileExt;
use std::fs::File;
#[cfg(any(windows, test))]
use std::path::Path;
use tagma_core::AppResult;
#[cfg(any(windows, test))]
use tagma_core::{AppError, ErrorCode};

pub const LOCK_FILE: &str = ".tagma-install.lock";

#[derive(Debug)]
pub struct InstallationLease(Option<File>);

impl InstallationLease {
    pub fn current() -> AppResult<Self> {
        #[cfg(windows)]
        {
            let executable = std::env::current_exe().map_err(storage)?;
            let directory = executable
                .parent()
                .ok_or_else(|| AppError::new(ErrorCode::StorageUnavailable))?;
            Self::open(directory)
        }
        #[cfg(not(windows))]
        Ok(Self(None))
    }

    #[cfg(any(windows, test))]
    fn open(directory: &Path) -> AppResult<Self> {
        let mut options = std::fs::OpenOptions::new();
        options.read(true);
        #[cfg(windows)]
        {
            use std::os::windows::fs::OpenOptionsExt;
            // Other participants may open/lock the same file, but cannot replace
            // its identity while a process is using it. No write access needed.
            options.share_mode(0x1 | 0x2);
        }
        let file = match options.open(directory.join(LOCK_FILE)) {
            Ok(file) => file,
            // Unpacked developer binaries and older installs have no lease file.
            // The installer creates it before publishing any new payload.
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Self(None)),
            Err(error) => return Err(storage(error)),
        };
        if !file.metadata().map_err(storage)?.is_file() {
            return Err(AppError::new(ErrorCode::StorageUnavailable));
        }
        FileExt::try_lock_shared(&file).map_err(|error| {
            if error.kind() == fs2::lock_contended_error().kind() {
                AppError::new(ErrorCode::MaintenanceInProgress)
            } else {
                storage(error)
            }
        })?;
        Ok(Self(Some(file)))
    }
}

impl Drop for InstallationLease {
    fn drop(&mut self) {
        if let Some(file) = &self.0 {
            let _ = FileExt::unlock(file);
        }
    }
}

#[cfg(any(windows, test))]
fn storage(_: std::io::Error) -> AppError {
    AppError::new(ErrorCode::StorageUnavailable)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn install_lease_excludes_updates_until_every_entry_exits_and_then_recovers() {
        let root = tempfile::Builder::new()
            .prefix("tagma-install-lease-")
            .tempdir()
            .unwrap();
        let update = File::create(root.path().join(LOCK_FILE)).unwrap();
        let first = InstallationLease::open(root.path()).unwrap();
        let second = InstallationLease::open(root.path()).unwrap();
        assert!(update.try_lock_exclusive().is_err());
        drop(first);
        assert!(update.try_lock_exclusive().is_err());
        drop(second);
        update.try_lock_exclusive().unwrap();
        assert_eq!(
            InstallationLease::open(root.path()).unwrap_err().code,
            ErrorCode::MaintenanceInProgress
        );
        FileExt::unlock(&update).unwrap();
        InstallationLease::open(root.path()).unwrap();
    }

    #[test]
    fn unpacked_binary_does_not_create_files_but_invalid_existing_lease_fails_closed() {
        let root = tempfile::Builder::new()
            .prefix("tagma-install-lease-")
            .tempdir()
            .unwrap();
        InstallationLease::open(root.path()).unwrap();
        assert_eq!(std::fs::read_dir(root.path()).unwrap().count(), 0);
        std::fs::create_dir(root.path().join(LOCK_FILE)).unwrap();
        assert_eq!(
            InstallationLease::open(root.path()).unwrap_err().code,
            ErrorCode::StorageUnavailable
        );
    }
}
