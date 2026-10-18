use std::{path::Path, sync::Arc};
use tagma_core::{credentials::CredentialStore, *};

// Called once by host setup. A failed result stays failed until the host exits;
// refreshing a view must never replay initialization or an acknowledged write.
pub fn open(
    directory: &Path,
    credentials: Arc<dyn CredentialStore>,
    initialize_token: bool,
) -> AppResult<ConfigService> {
    let config = ConfigService::open(directory, credentials)?;
    if initialize_token {
        let view = config.view()?;
        if view.gateway.auth_enabled && !view.gateway.has_access_token {
            config.initialize_gateway_token(RevisionInput {
                protocol_version: PROTOCOL_VERSION,
                expected_revision: view.desired_revision,
            })?;
        }
    }
    Ok(config)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        collections::HashMap,
        sync::{
            Mutex,
            atomic::{AtomicBool, Ordering},
        },
    };
    use zeroize::Zeroizing;

    #[derive(Default)]
    struct Credentials {
        locked: AtomicBool,
        values: Mutex<HashMap<String, String>>,
    }
    impl CredentialStore for Credentials {
        fn set(&self, reference: &str, secret: &str) -> AppResult<()> {
            if self.locked.load(Ordering::SeqCst) {
                return Err(AppError::new(ErrorCode::CredentialStoreUnavailable));
            }
            self.values
                .lock()
                .unwrap()
                .insert(reference.into(), secret.into());
            Ok(())
        }
        fn get(&self, reference: &str) -> AppResult<Zeroizing<String>> {
            self.values
                .lock()
                .unwrap()
                .get(reference)
                .cloned()
                .map(Zeroizing::new)
                .ok_or_else(|| AppError::new(ErrorCode::CredentialStoreUnavailable))
        }
        fn delete(&self, reference: &str) -> AppResult<()> {
            if self.locked.load(Ordering::SeqCst) {
                return Err(AppError::new(ErrorCode::CredentialStoreUnavailable));
            }
            self.values.lock().unwrap().remove(reference);
            Ok(())
        }
    }

    #[test]
    fn cached_startup_failure_needs_reopen_and_preserves_saved_data() {
        let root = tempfile::Builder::new()
            .prefix("tagma-p0-startup-recovery-")
            .tempdir()
            .unwrap();
        let credentials = Arc::new(Credentials::default());
        let initial = open(root.path(), credentials.clone(), false).unwrap();
        let saved = initial
            .save_provider(SaveProvider {
                protocol_version: PROTOCOL_VERSION,
                expected_revision: 0,
                id: None,
                name: "owned recovery fixture".into(),
                protocol: ProviderProtocol::OpenaiChatCompletions,
                base_url: "https://recovery.invalid/v1".into(),
                enabled: true,
                models: vec!["owned-model".into()],
                credential: Some("synthetic-only".into()),
            })
            .unwrap();
        let original_keys = credentials.values.lock().unwrap().clone();
        drop(initial);
        credentials.locked.store(true, Ordering::SeqCst);
        let cached = open(root.path(), credentials.clone(), true);
        assert_eq!(
            cached.as_ref().err().unwrap().code,
            ErrorCode::CredentialStoreUnavailable
        );
        credentials.locked.store(false, Ordering::SeqCst);
        // This is what Application.config.as_ref() returns even after unlocking.
        assert_eq!(
            cached.as_ref().err().unwrap().code,
            ErrorCode::CredentialStoreUnavailable
        );
        drop(cached);
        let reopened = open(root.path(), credentials.clone(), true).unwrap();
        let view = reopened.view().unwrap();
        assert_eq!(view.providers, saved.providers);
        assert_eq!(view.desired_revision, saved.desired_revision + 1);
        assert!(view.gateway.has_access_token);
        let token = reopened.reveal_gateway_token(PROTOCOL_VERSION).unwrap();
        assert!(!token.is_empty());
        for (reference, secret) in original_keys {
            assert_eq!(&*credentials.get(&reference).unwrap(), &secret);
        }
        drop(reopened);
        let again = open(root.path(), credentials.clone(), true).unwrap();
        assert_eq!(
            again.view().unwrap().desired_revision,
            view.desired_revision
        );
        assert_eq!(
            *again.reveal_gateway_token(PROTOCOL_VERSION).unwrap(),
            *token
        );
        assert_eq!(credentials.values.lock().unwrap().len(), 2);
        drop(again);
        root.close().unwrap();
        println!(
            "cached failure survives unlock; reopening actual host initializer preserves provider/credential, creates one token, and never replays the save"
        );
    }

    #[test]
    fn reopening_unknown_database_keeps_failure_and_original_bytes() {
        let root = tempfile::Builder::new()
            .prefix("tagma-p0-startup-recovery-")
            .tempdir()
            .unwrap();
        let database = root.path().join("config.sqlite3");
        let original = b"owned synthetic unknown database; never reset";
        std::fs::write(&database, original).unwrap();
        let credentials = Arc::new(Credentials::default());
        let first = open(root.path(), credentials.clone(), true).err().unwrap();
        let second = open(root.path(), credentials.clone(), true).err().unwrap();
        assert_eq!(first.code, second.code);
        assert_eq!(std::fs::read(database).unwrap(), original);
        assert!(credentials.values.lock().unwrap().is_empty());
        root.close().unwrap();
    }

    struct Worker(std::process::Child);
    impl Drop for Worker {
        fn drop(&mut self) {
            if !matches!(self.0.try_wait(), Ok(Some(_))) {
                let _ = self.0.kill();
            }
            let _ = self.0.wait();
        }
    }
    fn run_worker(root: &Path, owner: &str, phase: &str) {
        let mut command = std::process::Command::new(std::env::current_exe().unwrap());
        command
            .args([
                "--exact",
                "startup::tests::recovery_worker",
                "--ignored",
                "--nocapture",
            ])
            .env("TAGMA_STARTUP_RECOVERY_ROOT", root)
            .env("TAGMA_STARTUP_RECOVERY_OWNER", owner)
            .env("TAGMA_STARTUP_RECOVERY_PHASE", phase)
            .stdin(std::process::Stdio::null());
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000);
        }
        let mut worker = Worker(command.spawn().unwrap());
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(20);
        loop {
            if let Some(status) = worker.0.try_wait().unwrap() {
                assert!(status.success(), "{phase}");
                break;
            }
            assert!(
                std::time::Instant::now() < deadline,
                "startup worker timeout"
            );
            std::thread::sleep(std::time::Duration::from_millis(20));
        }
    }

    #[test]
    fn new_process_reopens_after_maintenance_without_replaying_saved_provider() {
        use fs2::FileExt;
        let root = tempfile::Builder::new()
            .prefix("tagma-p0-startup-recovery-")
            .tempdir()
            .unwrap();
        let owner = uuid::Uuid::new_v4().to_string();
        std::fs::write(root.path().join("owner.txt"), &owner).unwrap();
        let service = open(root.path(), Arc::new(Credentials::default()), false).unwrap();
        service
            .save_provider(SaveProvider {
                protocol_version: PROTOCOL_VERSION,
                expected_revision: 0,
                id: None,
                name: owner.clone(),
                protocol: ProviderProtocol::OpenaiChatCompletions,
                base_url: "https://recovery.invalid/v1".into(),
                enabled: true,
                models: vec!["owned-model".into()],
                credential: None,
            })
            .unwrap();
        drop(service);
        let lock = std::fs::OpenOptions::new()
            .read(true)
            .write(true)
            .open(root.path().join("maintenance.lock"))
            .unwrap();
        lock.try_lock_exclusive().unwrap();
        run_worker(root.path(), &owner, "blocked");
        FileExt::unlock(&lock).unwrap();
        drop(lock);
        run_worker(root.path(), &owner, "reopen");
        run_worker(root.path(), &owner, "reopen");
        root.close().unwrap();
    }

    #[test]
    #[ignore = "owned synthetic child process; invoked by parent test only"]
    fn recovery_worker() {
        let root =
            std::path::PathBuf::from(std::env::var_os("TAGMA_STARTUP_RECOVERY_ROOT").unwrap());
        let owner = std::env::var("TAGMA_STARTUP_RECOVERY_OWNER").unwrap();
        uuid::Uuid::parse_str(&owner).unwrap();
        assert!(root.is_absolute());
        assert!(
            root.file_name()
                .unwrap()
                .to_string_lossy()
                .starts_with("tagma-p0-startup-recovery-")
        );
        assert_eq!(
            std::fs::read_to_string(root.join("owner.txt")).unwrap(),
            owner
        );
        let state = open(&root, Arc::new(Credentials::default()), false);
        if std::env::var("TAGMA_STARTUP_RECOVERY_PHASE").unwrap() == "blocked" {
            assert_eq!(state.err().unwrap().code, ErrorCode::MaintenanceInProgress);
        } else {
            let view = state.unwrap().view().unwrap();
            assert_eq!(view.desired_revision, 1);
            assert_eq!(view.providers.len(), 1);
            assert_eq!(view.providers[0].name, owner);
            assert_eq!(view.providers[0].models, ["owned-model"]);
        }
    }
}
