//! Exact historical formats, never copied user databases or system credentials.
use rusqlite::Connection;
use std::{
    collections::HashMap,
    path::Path,
    sync::{Arc, Mutex},
};
use tagma_core::{credentials::CredentialStore, *};
use zeroize::Zeroizing;

// Verbatim table definitions emitted at 7f5c5fb (before application_id existed).
const EARLY_SCHEMA: &str = include_str!("fixtures/original-schema1.sql");
const ORIGINAL: &str = r#"{ "providers": [{"provider":{"id":"00000000-0000-4000-8000-000000000001","name":"owned historical fixture","protocol":"openai_chat_completions","base_url":"https://fixture.example.invalid/v1","enabled":true,"models":["owned-model"],"has_credential":true},"credential_ref":"owned-fixture-reference"}] }"#;
#[derive(Default)]
struct MemoryCredentials(Mutex<HashMap<String, String>>);
impl CredentialStore for MemoryCredentials {
    fn set(&self, reference: &str, secret: &str) -> AppResult<()> {
        self.0
            .lock()
            .unwrap()
            .insert(reference.into(), secret.into());
        Ok(())
    }
    fn get(&self, reference: &str) -> AppResult<Zeroizing<String>> {
        self.0
            .lock()
            .unwrap()
            .get(reference)
            .cloned()
            .map(Zeroizing::new)
            .ok_or_else(|| AppError::new(ErrorCode::CredentialStoreUnavailable))
    }
    fn delete(&self, reference: &str) -> AppResult<()> {
        self.0.lock().unwrap().remove(reference);
        Ok(())
    }
}
fn fixture(path: &Path, schema: u32) -> String {
    let db = Connection::open(path.join("config.sqlite3")).unwrap();
    db.execute_batch(EARLY_SCHEMA).unwrap();
    db.execute("INSERT INTO revisions VALUES(1,?1)", [ORIGINAL])
        .unwrap();
    db.execute("UPDATE config_head SET revision=1", []).unwrap();
    let config_id = uuid::Uuid::new_v4().to_string();
    if schema == 3 {
        // dev.9 uses 36001a5's schema3 metadata and provider/profile/gateway JSON.
        db.execute_batch("PRAGMA application_id=1413564237;CREATE TABLE config_metadata(singleton INTEGER PRIMARY KEY CHECK(singleton=1),config_uuid TEXT NOT NULL);PRAGMA user_version=3;").unwrap();
        db.execute("INSERT INTO config_metadata VALUES(1,?1)", [&config_id])
            .unwrap();
        let mut snapshot: serde_json::Value = serde_json::from_str(ORIGINAL).unwrap();
        snapshot["profiles"] = serde_json::json!([]);
        snapshot["gateway"] =
            serde_json::json!({"port":9168,"auth_enabled":true,"credential_ref":null});
        db.execute(
            "UPDATE revisions SET snapshot=?1 WHERE revision=1",
            [serde_json::to_string_pretty(&snapshot).unwrap()],
        )
        .unwrap();
    }
    config_id
}
fn open_and_check(path: &Path, original: &str, id: Option<&str>) {
    if !path.join("config-initialization.json").exists()
        && !path.join("config-migration.json").exists()
    {
        let before = std::fs::read(path.join("config.sqlite3")).unwrap();
        tagma_core::update::check_configuration(path).unwrap();
        assert_eq!(before, std::fs::read(path.join("config.sqlite3")).unwrap());
    }
    let credentials = Arc::new(MemoryCredentials::default());
    credentials
        .set("owned-fixture-reference", "owned fake credential")
        .unwrap();
    let service = ConfigService::open(path, credentials.clone())
        .expect("historical entrypoint must migrate without resetting data");
    let view = service.view().unwrap();
    assert_eq!(view.schema_version, SCHEMA_VERSION);
    assert_eq!(view.desired_revision, 1);
    assert_eq!(view.providers[0].name, "owned historical fixture");
    assert!(view.providers[0].has_credential);
    assert!(credentials.get("owned-fixture-reference").is_ok());
    // Same token initialization method as desktop startup, memory credentials only.
    service
        .initialize_gateway_token(RevisionInput {
            protocol_version: PROTOCOL_VERSION,
            expected_revision: 1,
        })
        .unwrap();
    assert!(service.view().unwrap().gateway.has_access_token);
    drop(service);
    let db = Connection::open(path.join("config.sqlite3")).unwrap();
    assert_eq!(
        db.query_row::<String, _, _>("SELECT snapshot FROM revisions WHERE revision=1", [], |r| r
            .get(0))
            .unwrap(),
        original
    );
    assert_eq!(
        db.query_row::<String, _, _>("SELECT snapshot FROM revisions WHERE revision=0", [], |r| r
            .get(0))
            .unwrap(),
        "{\"providers\":[]}"
    );
    let current: String = db
        .query_row("SELECT config_uuid FROM config_metadata", [], |r| r.get(0))
        .unwrap();
    if let Some(id) = id {
        assert_eq!(current, id);
    }
    assert_eq!(
        db.pragma_query_value::<u32, _>(None, "application_id", |r| r.get(0))
            .unwrap(),
        0x5441474d
    );
    assert!(!path.join("config-migration.json").exists());
    assert!(!path.join("config-initialization.json").exists());
    drop(db);
    let again = ConfigService::open(path, credentials).unwrap();
    assert_eq!(again.view().unwrap().desired_revision, 2);
}
#[test]
fn original_pre_identity_schema1_opens_through_real_config_service() {
    let root = tempfile::Builder::new()
        .prefix("tagma-startup-upgrade-")
        .tempdir()
        .unwrap();
    fixture(root.path(), 1);
    open_and_check(root.path(), ORIGINAL, None);
    let backups = std::fs::read_dir(root.path().join("backups")).unwrap();
    let first = backups
        .filter_map(Result::ok)
        .find(|e| e.file_name().to_string_lossy().starts_with("schema-1-"))
        .unwrap();
    let db = Connection::open(first.path()).unwrap();
    assert_eq!(
        db.pragma_query_value::<u32, _>(None, "user_version", |r| r.get(0))
            .unwrap(),
        1
    );
    assert_eq!(
        db.pragma_query_value::<u32, _>(None, "application_id", |r| r.get(0))
            .unwrap(),
        0
    );
    assert_eq!(
        db.query_row::<String, _, _>("SELECT snapshot FROM revisions WHERE revision=1", [], |r| r
            .get(0))
            .unwrap(),
        ORIGINAL
    );
    println!(
        "Exact7f5c5fb schema1/appID0 -> real ConfigService open/view/token init/reopen;original backups/snapshot0+1/provider/credential reference preserved,memory keys only"
    );
}
#[test]
fn dev9_schema3_and_fresh_directory_use_the_actual_startup_services() {
    let root = tempfile::Builder::new()
        .prefix("tagma-startup-upgrade-")
        .tempdir()
        .unwrap();
    let id = fixture(root.path(), 3);
    let db = Connection::open(root.path().join("config.sqlite3")).unwrap();
    let original: String = db
        .query_row("SELECT snapshot FROM revisions WHERE revision=1", [], |r| {
            r.get(0)
        })
        .unwrap();
    drop(db);
    open_and_check(root.path(), &original, Some(&id));
    let fresh = tempfile::Builder::new()
        .prefix("tagma-startup-upgrade-")
        .tempdir()
        .unwrap();
    let store = Arc::new(MemoryCredentials::default());
    let service = ConfigService::open(fresh.path(), store).unwrap();
    assert_eq!(service.view().unwrap().desired_revision, 0);
    service
        .initialize_gateway_token(RevisionInput {
            protocol_version: PROTOCOL_VERSION,
            expected_revision: 0,
        })
        .unwrap();
    assert!(service.view().unwrap().gateway.has_access_token);
    println!(
        "Historical dev9/schema3 -> schema10 with original identity/raw JSON preserved;fresh actual initialize+view+token init also ready,no desktop/UI/system key access"
    );
}
#[test]
fn dev9_published_initialization_and_pending_migration_records_resume() {
    for (initialization, migration) in [(true, false), (false, true), (true, true)] {
        let root = tempfile::Builder::new()
            .prefix("tagma-startup-upgrade-")
            .tempdir()
            .unwrap();
        let id = fixture(root.path(), 3);
        let db = Connection::open(root.path().join("config.sqlite3")).unwrap();
        let original: String = db
            .query_row("SELECT snapshot FROM revisions WHERE revision=1", [], |r| {
                r.get(0)
            })
            .unwrap();
        drop(db);
        if initialization {
            let op = uuid::Uuid::new_v4().to_string();
            std::fs::write(root.path().join("config-initialization.json"),serde_json::to_vec(&serde_json::json!({"owner":"com.tagmaai.desktop/config-initialization/v1","operation_id":op,"schema_version":3,"staging_file":format!(".config-initializing-{op}.sqlite3")})).unwrap()).unwrap();
        }
        if migration {
            std::fs::write(root.path().join("config-migration.json"),serde_json::to_vec(&serde_json::json!({"owner":"com.tagmaai.desktop/migration/v1","operation_id":uuid::Uuid::new_v4().to_string(),"source_revision":1,"backup_sha256":null,"from_schema":3,"to_schema":4})).unwrap()).unwrap();
        }
        open_and_check(root.path(), &original, Some(&id));
    }
    println!(
        "Historical dev9/schema3 published initialization marker,pending3->4 journal,and both together resume real entrypoint;raw snapshots/UUID preserved,no user paths"
    );
}

#[test]
fn schema10_pack_metadata_migration_preserves_existing_configuration() {
    let root = tempfile::Builder::new()
        .prefix("tagma-pack-schema-")
        .tempdir()
        .unwrap();
    let credentials = Arc::new(MemoryCredentials::default());
    let service = ConfigService::open(root.path(), credentials.clone()).unwrap();
    let id = service.configuration_id().unwrap();
    service
        .save_provider(SaveProvider {
            protocol_version: PROTOCOL_VERSION,
            expected_revision: 0,
            id: None,
            name: "schema10 provider".into(),
            protocol: ProviderProtocol::OpenaiChatCompletions,
            base_url: "https://fixture.example.invalid/v1".into(),
            models: vec!["owned-model".into()],
            enabled: true,
            credential: None,
        })
        .unwrap();
    drop(service);
    let db = Connection::open(root.path().join("config.sqlite3")).unwrap();
    let raw: String = db
        .query_row("SELECT snapshot FROM revisions WHERE revision=1", [], |r| {
            r.get(0)
        })
        .unwrap();
    let mut legacy: serde_json::Value = serde_json::from_str(&raw).unwrap();
    legacy.as_object_mut().unwrap().remove("installed_packs");
    let raw = serde_json::to_string_pretty(&legacy).unwrap();
    db.execute("UPDATE revisions SET snapshot=?1 WHERE revision=1", [&raw])
        .unwrap();
    db.pragma_update(None, "user_version", 10).unwrap();
    drop(db);
    let reopened = ConfigService::open(root.path(), credentials).unwrap();
    let view = reopened.view().unwrap();
    assert_eq!(view.schema_version, 11);
    assert_eq!(view.desired_revision, 1);
    assert_eq!(view.providers[0].name, "schema10 provider");
    assert!(view.installed_packs.is_empty());
    assert_eq!(reopened.configuration_id().unwrap(), id);
    drop(reopened);
    let db = Connection::open(root.path().join("config.sqlite3")).unwrap();
    assert_eq!(
        db.query_row::<String, _, _>("SELECT snapshot FROM revisions WHERE revision=1", [], |r| r
            .get(0))
            .unwrap(),
        raw
    );
    assert!(!root.path().join("config-migration.json").exists());
    let backup = std::fs::read_dir(root.path().join("backups"))
        .unwrap()
        .filter_map(Result::ok)
        .find(|e| e.file_name().to_string_lossy().starts_with("schema-10-"))
        .unwrap();
    let old = Connection::open(backup.path()).unwrap();
    assert_eq!(
        old.pragma_query_value::<u32, _>(None, "user_version", |r| r.get(0))
            .unwrap(),
        10
    );
    assert_eq!(
        old.query_row::<String, _, _>("SELECT snapshot FROM revisions WHERE revision=1", [], |r| r
            .get(0))
            .unwrap(),
        raw
    );
}
