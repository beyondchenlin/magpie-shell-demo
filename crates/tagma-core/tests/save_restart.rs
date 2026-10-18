//! Persistence across real process exits, with synthetic data and no OS credentials.
//! These are core acceptance checks, not desktop UI or physical drag acceptance.
use std::{
    path::Path,
    process::{Child, Command, Stdio},
    sync::Arc,
    time::{Duration, Instant},
};
use tagma_core::{credentials::CredentialStore, *};
use zeroize::Zeroizing;

const ORIGINAL: &str = r#"{"providers":[{"provider":{"id":"00000000-0000-4000-8000-000000000001","name":"historical fixture","protocol":"openai_chat_completions","base_url":"https://history.invalid/v1","enabled":true,"models":["historical-model"],"has_credential":false},"credential_ref":null}]}"#;
struct NoCredentials;
impl CredentialStore for NoCredentials {
    fn set(&self, _: &str, _: &str) -> AppResult<()> {
        panic!("this persistence test must not create credentials")
    }
    fn get(&self, _: &str) -> AppResult<Zeroizing<String>> {
        Err(AppError::new(ErrorCode::CredentialStoreUnavailable))
    }
    fn delete(&self, _: &str) -> AppResult<()> {
        panic!("this persistence test must not delete credentials")
    }
}
fn provider(revision: u32, name: &str) -> SaveProvider {
    SaveProvider {
        protocol_version: PROTOCOL_VERSION,
        expected_revision: revision,
        id: None,
        name: name.into(),
        protocol: ProviderProtocol::OpenaiChatCompletions,
        base_url: "https://save-restart.invalid/v1".into(),
        enabled: true,
        models: vec!["model-one".into(), "model-two".into()],
        credential: None,
    }
}
struct Worker(Child);
impl Drop for Worker {
    fn drop(&mut self) {
        if !matches!(self.0.try_wait(), Ok(Some(_))) {
            let _ = self.0.kill();
        }
        let _ = self.0.wait();
    }
}
fn run_worker(path: &Path, owner: &str, legacy: bool, phase: &str, exit: i32) {
    let mut command = Command::new(std::env::current_exe().unwrap());
    command
        .args(["--exact", "persistence_worker", "--ignored", "--nocapture"])
        .env("TAGMA_PERSISTENCE_ROOT", path)
        .env("TAGMA_PERSISTENCE_OWNER", owner)
        .env("TAGMA_PERSISTENCE_LEGACY", if legacy { "1" } else { "0" })
        .env("TAGMA_PERSISTENCE_PHASE", phase)
        .stdin(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let mut child = Worker(command.spawn().unwrap());
    let deadline = Instant::now() + Duration::from_secs(20);
    loop {
        if let Some(status) = child.0.try_wait().unwrap() {
            assert_eq!(status.code(), Some(exit), "phase {phase}");
            break;
        }
        assert!(Instant::now() < deadline, "worker deadline: {phase}");
        std::thread::sleep(Duration::from_millis(20));
    }
}
fn exercise(legacy: bool) {
    let root = tempfile::Builder::new()
        .prefix("tagma-p0-save-restart-")
        .tempdir()
        .unwrap();
    let owner = uuid::Uuid::new_v4().to_string();
    std::fs::write(root.path().join("owner.txt"), &owner).unwrap();
    if legacy {
        let db = rusqlite::Connection::open(root.path().join("config.sqlite3")).unwrap();
        db.execute_batch(include_str!("fixtures/original-schema1.sql"))
            .unwrap();
        db.execute("INSERT INTO revisions VALUES(1,?1)", [ORIGINAL])
            .unwrap();
        db.execute("UPDATE config_head SET revision=1", []).unwrap();
    }
    // Exit immediately after the acknowledged save, without ConfigService Drop.
    run_worker(root.path(), &owner, legacy, "save", 93);
    run_worker(root.path(), &owner, legacy, "read-edit-delete", 0);
    run_worker(root.path(), &owner, legacy, "read-final", 0);
    root.close()
        .expect("all child processes and database handles closed");
}
#[test]
fn fresh_save_survives_process_exit_and_second_restart() {
    exercise(false);
}
#[test]
fn legacy_upgrade_save_survives_process_exit_and_second_restart() {
    exercise(true);
}
#[test]
#[ignore = "child process entrypoint; parent tests supply an owned temporary directory"]
fn persistence_worker() {
    let path = std::path::PathBuf::from(std::env::var_os("TAGMA_PERSISTENCE_ROOT").unwrap());
    assert!(path.is_absolute());
    assert!(
        path.file_name()
            .unwrap()
            .to_string_lossy()
            .starts_with("tagma-p0-save-restart-")
    );
    let owner = std::env::var("TAGMA_PERSISTENCE_OWNER").unwrap();
    uuid::Uuid::parse_str(&owner).unwrap();
    assert_eq!(
        std::fs::read_to_string(path.join("owner.txt")).unwrap(),
        owner
    );
    let legacy = std::env::var("TAGMA_PERSISTENCE_LEGACY").unwrap() == "1";
    let base = u32::from(legacy);
    let phase = std::env::var("TAGMA_PERSISTENCE_PHASE").unwrap();
    let service = ConfigService::open(&path, Arc::new(NoCredentials)).unwrap();
    if phase == "save" {
        assert_eq!(service.view().unwrap().desired_revision, base);
        let first = service.save_provider(provider(base, "first")).unwrap();
        let first_id = first.providers.last().unwrap().id.clone();
        let second = service.save_provider(provider(base + 1, "second")).unwrap();
        let second_id = second.providers.last().unwrap().id.clone();
        let mut ids = vec![second_id, first_id.clone()];
        if legacy {
            ids.push(second.providers[0].id.clone());
        }
        service
            .reorder_providers(ReorderProviders {
                protocol_version: PROTOCOL_VERSION,
                expected_revision: base + 2,
                ids,
            })
            .unwrap();
        let mut edit = provider(base + 3, "edited before exit");
        edit.id = Some(first_id);
        edit.enabled = false;
        edit.models.reverse();
        let saved = service.save_provider(edit).unwrap();
        assert_eq!(saved.desired_revision, base + 4);
        std::process::exit(93);
    }
    let view = service.view().unwrap();
    assert_eq!(view.schema_version, SCHEMA_VERSION);
    let final_read = phase == "read-final";
    assert!(final_read || phase == "read-edit-delete");
    assert_eq!(view.desired_revision, base + if final_read { 5 } else { 4 });
    assert_eq!(
        view.providers.len(),
        usize::from(legacy) + if final_read { 1 } else { 2 }
    );
    let edited = &view.providers[usize::from(!final_read)];
    assert_eq!(edited.name, "edited before exit");
    assert!(!edited.enabled);
    assert_eq!(edited.models, ["model-two", "model-one"]);
    assert!(!edited.has_credential);
    if legacy {
        assert_eq!(view.providers.last().unwrap().name, "historical fixture");
        let db = rusqlite::Connection::open(path.join("config.sqlite3")).unwrap();
        let original: String = db
            .query_row("SELECT snapshot FROM revisions WHERE revision=1", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(original, ORIGINAL);
    }
    if !final_read {
        assert_eq!(view.providers[0].name, "second");
        assert_eq!(
            service
                .save_provider(provider(base + 3, "stale editor"))
                .unwrap_err()
                .code,
            ErrorCode::ConfigConflict
        );
        assert_eq!(service.view().unwrap().desired_revision, base + 4);
        service
            .delete_provider(RevisionCommand {
                protocol_version: PROTOCOL_VERSION,
                expected_revision: base + 4,
                id: view.providers[0].id.clone(),
            })
            .unwrap();
    }
}
