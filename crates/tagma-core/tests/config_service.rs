use std::{
    collections::HashMap,
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
};
use tagma_core::{
    credentials::{CredentialStore, SystemCredentials},
    *,
};
use zeroize::Zeroizing;

#[derive(Default)]
struct TestCredentials {
    values: Mutex<HashMap<String, String>>,
    fail_set: AtomicBool,
    fail_delete: AtomicBool,
}
impl CredentialStore for TestCredentials {
    fn set(&self, reference: &str, secret: &str) -> AppResult<()> {
        if self.fail_set.load(Ordering::SeqCst) {
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
        if self.fail_delete.load(Ordering::SeqCst) {
            return Err(AppError::new(ErrorCode::CredentialStoreUnavailable));
        }
        self.values.lock().unwrap().remove(reference);
        Ok(())
    }
}
fn provider(revision: u32) -> SaveProvider {
    SaveProvider {
        protocol_version: PROTOCOL_VERSION,
        expected_revision: revision,
        id: None,
        name: "测试供应商".into(),
        protocol: ProviderProtocol::OpenaiChatCompletions,
        base_url: "https://example.invalid/v1".into(),
        enabled: true,
        models: vec!["test-model".into()],
        credential: Some("test-only-synthetic-secret".into()),
    }
}

#[test]
fn crud_reopen_and_reorder_share_one_transactional_service() {
    let temp = tempfile::tempdir().unwrap();
    let credentials = Arc::new(TestCredentials::default());
    let service = ConfigService::open(temp.path(), credentials.clone()).unwrap();
    assert_eq!(service.view().unwrap().desired_revision, 0);
    let first = service.save_provider(provider(0)).unwrap();
    let first_id = first.providers[0].id.clone();
    let second = service.save_provider(provider(1)).unwrap();
    let second_id = second.providers[1].id.clone();
    service
        .reorder_providers(ReorderProviders {
            protocol_version: 1,
            expected_revision: 2,
            ids: vec![second_id.clone(), first_id.clone()],
        })
        .unwrap();
    drop(service);
    let service = ConfigService::open(temp.path(), credentials).unwrap();
    assert_eq!(service.view().unwrap().providers[0].id, second_id);
    let mut edit = provider(3);
    edit.id = Some(first_id.clone());
    edit.name = "Changed".into();
    edit.enabled = false;
    edit.credential = None;
    service.save_provider(edit).unwrap();
    let view = service
        .delete_provider(RevisionCommand {
            protocol_version: 1,
            expected_revision: 4,
            id: second_id,
        })
        .unwrap();
    assert_eq!(view.desired_revision, 5);
    assert_eq!(view.providers[0].name, "Changed");
    assert!(!view.providers[0].enabled);
    assert!(view.providers[0].has_credential);
}

#[test]
fn stale_editor_cannot_overwrite_other_entrypoint_or_create_a_secret() {
    let temp = tempfile::tempdir().unwrap();
    let credentials = Arc::new(TestCredentials::default());
    let a = ConfigService::open(temp.path(), credentials.clone()).unwrap();
    let b = ConfigService::open(temp.path(), credentials.clone()).unwrap();
    a.save_provider(provider(0)).unwrap();
    assert_eq!(
        b.save_provider(provider(0)).unwrap_err().code,
        ErrorCode::ConfigConflict
    );
    assert_eq!(credentials.values.lock().unwrap().len(), 1);
    assert_eq!(b.view().unwrap().desired_revision, 1);
}

#[test]
fn credential_lock_and_sqlite_failure_do_not_report_success_or_leave_plaintext() {
    let temp = tempfile::tempdir().unwrap();
    let credentials = Arc::new(TestCredentials::default());
    let service = ConfigService::open(temp.path(), credentials.clone()).unwrap();
    credentials.fail_set.store(true, Ordering::SeqCst);
    assert_eq!(
        service.save_provider(provider(0)).unwrap_err().code,
        ErrorCode::CredentialStoreUnavailable
    );
    assert_eq!(service.view().unwrap().desired_revision, 0);
    credentials.fail_set.store(false, Ordering::SeqCst);
    let db = rusqlite::Connection::open(temp.path().join("config.sqlite3")).unwrap();
    db.execute_batch("CREATE TRIGGER fail_revision BEFORE INSERT ON revisions BEGIN SELECT RAISE(ABORT,'simulated disk failure'); END;").unwrap();
    assert_eq!(
        service.save_provider(provider(0)).unwrap_err().code,
        ErrorCode::StorageUnavailable
    );
    assert_eq!(service.view().unwrap().desired_revision, 0);
    assert!(credentials.values.lock().unwrap().is_empty());
    drop(db);
    drop(service);
    for entry in std::fs::read_dir(temp.path()).unwrap() {
        let bytes = std::fs::read(entry.unwrap().path()).unwrap();
        assert!(
            !bytes
                .windows(b"test-only-synthetic-secret".len())
                .any(|v| v == b"test-only-synthetic-secret")
        );
    }
}

#[test]
fn recovery_only_deletes_journal_owned_unreferenced_secrets_and_retries_cleanup() {
    let temp = tempfile::tempdir().unwrap();
    let credentials = Arc::new(TestCredentials::default());
    let service = ConfigService::open(temp.path(), credentials.clone()).unwrap();
    service.save_provider(provider(0)).unwrap();
    let (_, snapshot) = service.read_snapshot().unwrap();
    let used_ref = snapshot.providers[0].credential_ref.clone().unwrap();
    drop(service);
    let db = rusqlite::Connection::open(temp.path().join("config.sqlite3")).unwrap();
    db.execute(
        "INSERT INTO credential_journal VALUES('crashed-before-set','owned-orphan')",
        [],
    )
    .unwrap();
    db.execute(
        "INSERT INTO credential_journal VALUES('crashed-after-commit',?1)",
        [&used_ref],
    )
    .unwrap();
    credentials.set("owned-orphan", "synthetic-orphan").unwrap();
    credentials.set("unrelated", "synthetic-unrelated").unwrap();
    credentials.fail_delete.store(true, Ordering::SeqCst);
    drop(db);
    let service = ConfigService::open(temp.path(), credentials.clone()).unwrap();
    assert_eq!(service.view().unwrap().pending_credential_cleanup, 1);
    assert!(credentials.get(&used_ref).is_ok());
    assert!(credentials.get("unrelated").is_ok());
    credentials.fail_delete.store(false, Ordering::SeqCst);
    service.recover_credentials().unwrap();
    assert_eq!(service.view().unwrap().pending_credential_cleanup, 0);
    assert!(credentials.get("owned-orphan").is_err());
    assert!(credentials.get(&used_ref).is_ok());
}

#[test]
fn future_schema_is_not_modified_and_maintenance_lock_blocks_entrypoints() {
    let temp = tempfile::tempdir().unwrap();
    let credentials = Arc::new(TestCredentials::default());
    drop(ConfigService::open(temp.path(), credentials.clone()).unwrap());
    let db = rusqlite::Connection::open(temp.path().join("config.sqlite3")).unwrap();
    db.pragma_update(None, "user_version", 999).unwrap();
    drop(db);
    assert_eq!(
        ConfigService::open(temp.path(), credentials.clone())
            .err()
            .unwrap()
            .code,
        ErrorCode::IncompatibleVersion
    );
    let maintenance = std::fs::OpenOptions::new()
        .read(true)
        .write(true)
        .open(temp.path().join("maintenance.lock"))
        .unwrap();
    fs2::FileExt::try_lock_exclusive(&maintenance).unwrap();
    assert_eq!(
        ConfigService::open(temp.path(), credentials)
            .err()
            .unwrap()
            .code,
        ErrorCode::MaintenanceInProgress
    );
}

#[test]
fn invalid_urls_duplicate_models_protocol_and_secret_are_rejected_without_writes() {
    let temp = tempfile::tempdir().unwrap();
    let credentials = Arc::new(TestCredentials::default());
    let service = ConfigService::open(temp.path(), credentials.clone()).unwrap();
    for url in [
        "http://example.com/v1",
        "https://user:password@example.com/v1",
        "https://example.com/v1?key=secret",
        "file:///tmp",
    ] {
        let mut p = provider(0);
        p.base_url = url.into();
        assert_eq!(
            service.save_provider(p).unwrap_err().code,
            ErrorCode::InvalidInput
        );
    }
    let mut p = provider(0);
    p.models = vec!["tagma/reachflow".into()];
    assert_eq!(
        service.save_provider(p).unwrap_err().code,
        ErrorCode::InvalidInput
    );
    let mut p = provider(0);
    p.protocol_version = 2;
    assert_eq!(
        service.save_provider(p).unwrap_err().code,
        ErrorCode::IncompatibleVersion
    );
    assert!(credentials.values.lock().unwrap().is_empty());
    assert_eq!(service.view().unwrap().desired_revision, 0);
}

#[test]
#[ignore = "Explicit local OS credential-store integration; synthetic secret only, exact owned reference cleaned by Drop"]
fn system_credential_store_round_trip() {
    struct Cleanup(String);
    impl Drop for Cleanup {
        fn drop(&mut self) {
            let _ = SystemCredentials.delete(&self.0);
        }
    }
    let owned = Cleanup(format!("test/{}", uuid::Uuid::new_v4()));
    let secret = Zeroizing::new("tagma-synthetic-integration-secret".to_string());
    SystemCredentials.set(&owned.0, &secret).unwrap();
    assert_eq!(*SystemCredentials.get(&owned.0).unwrap(), *secret);
    SystemCredentials.delete(&owned.0).unwrap();
    assert!(SystemCredentials.get(&owned.0).is_err());
}

#[test]
#[ignore = "Child fixture only: invoked by process_crash_after_system_credential_set_recovers"]
fn credential_crash_worker() {
    struct CrashStore;
    impl CredentialStore for CrashStore {
        fn set(&self, reference: &str, secret: &str) -> AppResult<()> {
            SystemCredentials.set(reference, secret)?;
            // No destructors: real process termination between external-store write and SQL commit.
            std::process::exit(86);
        }
        fn get(&self, reference: &str) -> AppResult<Zeroizing<String>> {
            SystemCredentials.get(reference)
        }
        fn delete(&self, reference: &str) -> AppResult<()> {
            SystemCredentials.delete(reference)
        }
    }
    let directory = std::env::var_os("TAGMA_CREDENTIAL_CRASH_DIR")
        .expect("isolated child fixture directory required");
    let service =
        ConfigService::open(std::path::Path::new(&directory), Arc::new(CrashStore)).unwrap();
    let _ = service.save_provider(provider(0));
    panic!("crash fixture did not exit after system credential write");
}

#[test]
#[ignore = "Explicit real-process + OS credential-store integration; synthetic secret with exact journal-owned cleanup"]
fn process_crash_after_system_credential_set_recovers() {
    let temp = tempfile::tempdir().unwrap();
    let status = std::process::Command::new(std::env::current_exe().unwrap())
        .args(["--ignored", "--exact", "credential_crash_worker"])
        .env("TAGMA_CREDENTIAL_CRASH_DIR", temp.path())
        .status()
        .unwrap();
    assert_eq!(status.code(), Some(86));
    let db = rusqlite::Connection::open(temp.path().join("config.sqlite3")).unwrap();
    let reference: String = db
        .query_row("SELECT credential_ref FROM credential_journal", [], |r| {
            r.get(0)
        })
        .unwrap();
    struct Cleanup(String);
    impl Drop for Cleanup {
        fn drop(&mut self) {
            let _ = SystemCredentials.delete(&self.0);
        }
    }
    let cleanup = Cleanup(reference);
    assert!(SystemCredentials.get(&cleanup.0).is_ok());
    drop(db);
    let recovered = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
    assert_eq!(recovered.view().unwrap().desired_revision, 0);
    assert_eq!(recovered.view().unwrap().pending_credential_cleanup, 0);
    assert!(SystemCredentials.get(&cleanup.0).is_err());
}
