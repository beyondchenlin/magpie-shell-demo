//! Synthetic in-memory credentials only; never reads or creates OS credentials.
use std::{
    collections::HashMap,
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, AtomicUsize, Ordering},
    },
};
use tagma_core::{credentials::CredentialStore, health::provider_fingerprint, security::*, *};
use zeroize::Zeroizing;
#[derive(Default)]
struct Credentials {
    values: Mutex<HashMap<String, String>>,
    fail: AtomicBool,
    gets: AtomicUsize,
}
impl CredentialStore for Credentials {
    fn set(&self, id: &str, secret: &str) -> AppResult<()> {
        if self.fail.load(Ordering::SeqCst) {
            return Err(AppError::new(ErrorCode::CredentialStoreUnavailable));
        }
        self.values.lock().unwrap().insert(id.into(), secret.into());
        Ok(())
    }
    fn get(&self, id: &str) -> AppResult<Zeroizing<String>> {
        self.gets.fetch_add(1, Ordering::SeqCst);
        self.values
            .lock()
            .unwrap()
            .get(id)
            .cloned()
            .map(Zeroizing::new)
            .ok_or_else(|| AppError::new(ErrorCode::CredentialStoreUnavailable))
    }
    fn delete(&self, id: &str) -> AppResult<()> {
        self.values.lock().unwrap().remove(id);
        Ok(())
    }
}
fn revoke(revision: u32) -> RevokeAccess {
    RevokeAccess {
        protocol_version: 1,
        expected_revision: revision,
        kind: RevokeKind::GatewayToken,
        provider_id: None,
        cancel_inflight: false,
    }
}
#[test]
fn token_revocation_survives_reopen_rotation_and_old_snapshot_restore_without_plaintext() {
    let temp = tempfile::tempdir().unwrap();
    let secrets = Arc::new(Credentials::default());
    let config = ConfigService::open(temp.path(), secrets.clone()).unwrap();
    config
        .initialize_gateway_token(RevisionInput {
            protocol_version: 1,
            expected_revision: 0,
        })
        .unwrap();
    let old_snapshot = config.read_snapshot().unwrap().1;
    let reference = old_snapshot.gateway.credential_ref.as_ref().unwrap();
    let old = config.reveal_gateway_token(1).unwrap();
    let gets = secrets.gets.load(Ordering::SeqCst);
    let first = config.revoke_access(revoke(1)).unwrap();
    assert_eq!(first.revision, 1);
    assert_eq!(
        secrets.gets.load(Ordering::SeqCst),
        gets,
        "Revocation never needs to retrieve a secret"
    );
    assert_eq!(config.view().unwrap().desired_revision, 1);
    assert!(config.view().unwrap().security.gateway_token_revoked);
    assert_eq!(
        config.reveal_gateway_token(1).unwrap_err().code,
        ErrorCode::AccessRevoked
    );
    assert_eq!(
        config.revoke_access(revoke(1)).unwrap().revision,
        1,
        "Retry is idempotent"
    );
    let mut cancel = revoke(1);
    cancel.cancel_inflight = true;
    assert_eq!(config.revoke_access(cancel).unwrap().revision, 2);
    assert_eq!(
        config.revoke_access(revoke(1)).unwrap().revision,
        2,
        "Cancellation cannot be undone"
    );
    config
        .rotate_gateway_token(RotateGatewayToken {
            protocol_version: 1,
            expected_revision: 1,
            cancel_inflight: false,
        })
        .unwrap();
    let new = config.reveal_gateway_token(1).unwrap();
    assert_ne!(old.as_str(), new.as_str());
    assert!(!config.view().unwrap().security.gateway_token_revoked);
    assert_eq!(config.view().unwrap().security.revision, 2);
    let before = config.view().unwrap().desired_revision;
    assert_eq!(before, 2);
    drop(config);
    let config = ConfigService::open(temp.path(), secrets).unwrap();
    assert!(
        ConfigService::read_runtime_security(temp.path(), &[gateway_target(reference)])
            .unwrap()
            .revoked[&gateway_target(reference)]
    );
    // Fixture-only restoration of a historical saved snapshot exercises the safety overlay.
    let db = rusqlite::Connection::open(temp.path().join("config.sqlite3")).unwrap();
    db.execute(
        "INSERT INTO revisions VALUES(3,?1)",
        [serde_json::to_string(&old_snapshot).unwrap()],
    )
    .unwrap();
    db.execute("UPDATE config_head SET revision=3", []).unwrap();
    assert!(config.view().unwrap().security.gateway_token_revoked);
    assert_eq!(
        config.reveal_gateway_token(1).unwrap_err().code,
        ErrorCode::AccessRevoked
    );
    for name in ["config.sqlite3", "config.sqlite3-wal"] {
        if let Ok(bytes) = std::fs::read(temp.path().join(name)) {
            for secret in [&old, &new] {
                assert!(
                    !bytes
                        .windows(secret.len())
                        .any(|window| window == secret.as_bytes())
                );
            }
        }
    }
    println!(
        "A11 core: persistent/idempotent revocation, monotonic cancellation, atomic rotation, old snapshot safety overlay, no plaintext and no credential reads during revoke verified"
    );
}
#[test]
fn failed_rotation_preserves_old_access_and_compensates_only_its_new_credential() {
    let temp = tempfile::tempdir().unwrap();
    let secrets = Arc::new(Credentials::default());
    let config = ConfigService::open(temp.path(), secrets.clone()).unwrap();
    config
        .initialize_gateway_token(RevisionInput {
            protocol_version: 1,
            expected_revision: 0,
        })
        .unwrap();
    let old = config.reveal_gateway_token(1).unwrap();
    secrets.fail.store(true, Ordering::SeqCst);
    assert_eq!(
        config
            .rotate_gateway_token(RotateGatewayToken {
                protocol_version: 1,
                expected_revision: 1,
                cancel_inflight: true
            })
            .unwrap_err()
            .code,
        ErrorCode::CredentialStoreUnavailable
    );
    secrets.fail.store(false, Ordering::SeqCst);
    let db = rusqlite::Connection::open(temp.path().join("config.sqlite3")).unwrap();
    db.execute_batch("CREATE TRIGGER deny_new_revision BEFORE INSERT ON revisions BEGIN SELECT RAISE(ABORT,'owned fixture'); END;").unwrap();
    assert_eq!(
        config
            .rotate_gateway_token(RotateGatewayToken {
                protocol_version: 1,
                expected_revision: 1,
                cancel_inflight: true
            })
            .unwrap_err()
            .code,
        ErrorCode::StorageUnavailable
    );
    assert_eq!(secrets.values.lock().unwrap().len(), 1);
    assert_eq!(
        config.reveal_gateway_token(1).unwrap().as_str(),
        old.as_str()
    );
    assert_eq!(config.view().unwrap().security.revision, 0);
    assert_eq!(config.view().unwrap().desired_revision, 1);
    assert_eq!(
        config.revoke_access(revoke(0)).unwrap_err().code,
        ErrorCode::ConfigConflict
    );
    println!(
        "A11 transaction: credential failure/SQLite abort never revoke old token or report rotation success; exact new reference compensated; stale revoke rejected"
    );
}
#[test]
fn provider_generation_revocation_cannot_be_cleared_by_reorder_or_restoring_an_old_connection() {
    let temp = tempfile::tempdir().unwrap();
    let config = ConfigService::open(temp.path(), Arc::new(Credentials::default())).unwrap();
    let create = SaveProvider {
        protocol_version: 1,
        expected_revision: 0,
        id: None,
        name: "fixture".into(),
        protocol: ProviderProtocol::OpenaiChatCompletions,
        base_url: "https://old.invalid/v1".into(),
        enabled: true,
        models: vec!["model".into()],
        credential: None,
    };
    let provider = config.save_provider(create.clone()).unwrap().providers[0].clone();
    let old_fingerprint = provider_fingerprint(&config.read_snapshot().unwrap().1.providers[0]);
    ConfigService::record_runtime_health(
        temp.path(),
        &provider.id,
        "model",
        &old_fingerprint,
        tagma_core::health::HealthObservation::InferenceSucceeded,
    )
    .unwrap();
    config
        .revoke_access(RevokeAccess {
            protocol_version: 1,
            expected_revision: 1,
            kind: RevokeKind::ProviderConnection,
            provider_id: Some(provider.id.clone()),
            cancel_inflight: false,
        })
        .unwrap();
    config
        .reorder_providers(ReorderProviders {
            protocol_version: 1,
            expected_revision: 1,
            ids: vec![provider.id.clone()],
        })
        .unwrap();
    let snapshot = config.read_snapshot().unwrap().1;
    let health = ConfigService::read_runtime_health(temp.path(), &snapshot).unwrap();
    assert!(
        health[0].is_ready(tagma_core::health::now_ms().unwrap()),
        "Inference fact itself remains unchanged"
    );
    assert!(
        tagma_core::health::select_first_cloud(
            &snapshot,
            &health,
            tagma_core::health::now_ms().unwrap()
        )
        .is_none(),
        "Revoked generation cannot become an automatic brain from old success"
    );
    assert_eq!(
        config.view().unwrap().security.revoked_provider_ids,
        vec![provider.id.clone()]
    );
    config
        .save_provider(SaveProvider {
            expected_revision: 2,
            id: Some(provider.id.clone()),
            base_url: "https://new.invalid/v1".into(),
            ..create.clone()
        })
        .unwrap();
    assert!(
        config
            .view()
            .unwrap()
            .security
            .revoked_provider_ids
            .is_empty()
    );
    config
        .save_provider(SaveProvider {
            expected_revision: 3,
            id: Some(provider.id.clone()),
            ..create
        })
        .unwrap();
    assert_eq!(
        config.view().unwrap().security.revoked_provider_ids,
        vec![provider.id]
    );
    assert!(
        ConfigService::read_runtime_security(temp.path(), &[provider_target(&old_fingerprint)])
            .unwrap()
            .revoked
            .contains_key(&provider_target(&old_fingerprint))
    );
}

#[test]
fn missing_or_contradictory_security_ledger_is_never_an_empty_allow_policy() {
    let temp = tempfile::tempdir().unwrap();
    let _config = ConfigService::open(temp.path(), Arc::new(Credentials::default())).unwrap();
    assert_eq!(
        ConfigService::read_runtime_security(temp.path(), &[])
            .unwrap()
            .revision,
        0
    );
    let db = rusqlite::Connection::open(temp.path().join("config.sqlite3")).unwrap();
    db.execute("UPDATE security_head SET revision=1", [])
        .unwrap();
    assert_eq!(
        ConfigService::read_runtime_security(temp.path(), &[])
            .err()
            .unwrap()
            .code,
        ErrorCode::StorageUnavailable
    );
    db.execute("UPDATE security_head SET revision=0", [])
        .unwrap();
    db.execute_batch("ALTER TABLE security_revocations RENAME TO owned_unavailable_ledger;")
        .unwrap();
    assert_eq!(
        ConfigService::read_runtime_security(temp.path(), &[])
            .err()
            .unwrap()
            .code,
        ErrorCode::StorageUnavailable
    );
}
