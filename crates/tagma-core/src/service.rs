use crate::{credentials::CredentialStore, *};
use fs2::FileExt;
use rusqlite::{Connection, TransactionBehavior, params};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    fs::{File, OpenOptions},
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};
use uuid::Uuid;
use zeroize::Zeroizing;

#[derive(Clone, Serialize, Deserialize)]
pub struct ProviderRecord {
    pub provider: Provider,
    pub credential_ref: Option<String>,
}

#[derive(Clone, Default, Serialize, Deserialize)]
pub struct ConfigSnapshot {
    pub providers: Vec<ProviderRecord>,
}

pub struct ConfigService {
    db: Mutex<Connection>,
    credentials: Arc<dyn CredentialStore>,
    directory: PathBuf,
    _maintenance: File,
}

fn storage(_: impl std::fmt::Display) -> AppError {
    AppError::new(ErrorCode::StorageUnavailable)
}
fn invalid() -> AppError {
    AppError::new(ErrorCode::InvalidInput)
}
fn lock_file(path: &Path) -> AppResult<File> {
    OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .open(path)
        .map_err(storage)
}

impl ConfigService {
    pub fn open(directory: &Path, credentials: Arc<dyn CredentialStore>) -> AppResult<Self> {
        std::fs::create_dir_all(directory).map_err(storage)?;
        let maintenance = lock_file(&directory.join("maintenance.lock"))?;
        // Only schema creation holds the exclusive lock. All live entrypoints retain a shared lock.
        let exists = directory.join("config.sqlite3").exists();
        if !exists {
            maintenance
                .try_lock_exclusive()
                .map_err(|_| AppError::new(ErrorCode::MaintenanceInProgress))?;
        } else {
            FileExt::try_lock_shared(&maintenance)
                .map_err(|_| AppError::new(ErrorCode::MaintenanceInProgress))?;
        }
        let db = Connection::open(directory.join("config.sqlite3")).map_err(storage)?;
        db.busy_timeout(std::time::Duration::from_secs(2))
            .map_err(storage)?;
        let schema: u32 = db
            .pragma_query_value(None, "user_version", |row| row.get(0))
            .map_err(storage)?;
        if schema > SCHEMA_VERSION || (exists && schema != SCHEMA_VERSION) {
            return Err(AppError::new(ErrorCode::IncompatibleVersion));
        }
        if schema == 0 {
            db.execute_batch("BEGIN IMMEDIATE;
                CREATE TABLE revisions(revision INTEGER PRIMARY KEY, snapshot TEXT NOT NULL);
                CREATE TABLE config_head(singleton INTEGER PRIMARY KEY CHECK(singleton=1), revision INTEGER NOT NULL REFERENCES revisions(revision));
                CREATE TABLE credential_journal(operation_id TEXT PRIMARY KEY, credential_ref TEXT NOT NULL UNIQUE);
                INSERT INTO revisions VALUES(0, '{\"providers\":[]}');
                INSERT INTO config_head VALUES(1,0);
                PRAGMA user_version=1;
                COMMIT;").map_err(storage)?;
            FileExt::unlock(&maintenance).map_err(storage)?;
            FileExt::try_lock_shared(&maintenance)
                .map_err(|_| AppError::new(ErrorCode::MaintenanceInProgress))?;
        }
        db.pragma_update(None, "journal_mode", "WAL")
            .map_err(storage)?;
        db.pragma_update(None, "foreign_keys", true)
            .map_err(storage)?;
        db.pragma_update(None, "synchronous", "FULL")
            .map_err(storage)?;
        let service = Self {
            db: Mutex::new(db),
            credentials,
            directory: directory.to_owned(),
            _maintenance: maintenance,
        };
        service.recover_credentials()?;
        Ok(service)
    }

    fn operation_lock(&self) -> AppResult<File> {
        let file = lock_file(&self.directory.join("operation.lock"))?;
        file.try_lock_exclusive()
            .map_err(|_| AppError::new(ErrorCode::ConfigConflict))?;
        Ok(file)
    }

    pub fn read_snapshot(&self) -> AppResult<(u32, ConfigSnapshot)> {
        let db = self.db.lock().map_err(storage)?;
        Self::read_db(&db)
    }

    fn read_db(db: &Connection) -> AppResult<(u32, ConfigSnapshot)> {
        let (revision, json): (u32, String) = db.query_row(
            "SELECT r.revision,r.snapshot FROM revisions r JOIN config_head h ON h.revision=r.revision WHERE h.singleton=1", [],
            |row| Ok((row.get(0)?, row.get(1)?))).map_err(storage)?;
        Ok((revision, serde_json::from_str(&json).map_err(storage)?))
    }

    pub fn view(&self) -> AppResult<ConfigView> {
        let db = self.db.lock().map_err(storage)?;
        let (revision, snapshot) = Self::read_db(&db)?;
        let pending = db
            .query_row("SELECT count(*) FROM credential_journal", [], |r| r.get(0))
            .map_err(storage)?;
        Ok(ConfigView {
            protocol_version: PROTOCOL_VERSION,
            schema_version: SCHEMA_VERSION,
            desired_revision: revision,
            providers: snapshot.providers.into_iter().map(|r| r.provider).collect(),
            pending_credential_cleanup: pending,
        })
    }

    pub fn save_provider(&self, input: SaveProvider) -> AppResult<ConfigView> {
        check_protocol(input.protocol_version)?;
        Self::validate_provider(&input)?;
        let _operation = self.operation_lock()?;
        let (revision, mut snapshot) = self.read_snapshot()?;
        if revision != input.expected_revision {
            return Err(AppError::new(ErrorCode::ConfigConflict));
        }
        let editing = input.id.is_some();
        let id = input.id.unwrap_or_else(|| Uuid::new_v4().to_string());
        let position = snapshot.providers.iter().position(|p| p.provider.id == id);
        if (editing && position.is_none()) || (!editing && snapshot.providers.len() >= 128) {
            return Err(invalid());
        }
        let old_ref = position.and_then(|i| snapshot.providers[i].credential_ref.clone());
        let credential = input.credential.map(Zeroizing::new);
        let new_ref = credential
            .as_ref()
            .map(|_| format!("provider/{}", Uuid::new_v4()));
        let operation_id = Uuid::new_v4().to_string();
        if let (Some(reference), Some(secret)) = (&new_ref, &credential) {
            // Persist intent before creating anything in the external credential store.
            self.db
                .lock()
                .map_err(storage)?
                .execute(
                    "INSERT INTO credential_journal VALUES(?1,?2)",
                    params![operation_id, reference],
                )
                .map_err(storage)?;
            if let Err(error) = self.credentials.set(reference, secret) {
                // set may have partially succeeded: retain journal until confirmed cleanup.
                let _ = self.recover_locked();
                return Err(error);
            }
        }
        let reference = new_ref.or(old_ref);
        let record = ProviderRecord {
            provider: Provider {
                id,
                name: input.name.trim().into(),
                protocol: input.protocol,
                base_url: input.base_url.trim_end_matches('/').into(),
                enabled: input.enabled,
                models: input.models,
                has_credential: reference.is_some(),
            },
            credential_ref: reference,
        };
        if let Some(i) = position {
            snapshot.providers[i] = record;
        } else {
            snapshot.providers.push(record);
        }
        let result = self.commit(revision, &snapshot, Some(&operation_id));
        if result.is_err() {
            let _ = self.recover_locked();
        }
        result?;
        self.view()
    }

    fn validate_provider(input: &SaveProvider) -> AppResult<()> {
        if input.name.trim().is_empty() || input.name.chars().count() > 120 {
            return Err(invalid());
        }
        if let Some(id) = &input.id {
            Uuid::parse_str(id).map_err(|_| invalid())?;
        }
        if input.models.len() > 256
            || input.models.iter().any(|m| {
                m.is_empty()
                    || m.len() > 256
                    || m.chars().any(char::is_control)
                    || m.starts_with("tagma/")
            })
        {
            return Err(invalid());
        }
        if input.models.iter().collect::<HashSet<_>>().len() != input.models.len() {
            return Err(invalid());
        }
        let url = url::Url::parse(&input.base_url).map_err(|_| invalid())?;
        let loopback = matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "[::1]"));
        if !(url.scheme() == "https" || (url.scheme() == "http" && loopback))
            || url.host_str().is_none()
            || !url.username().is_empty()
            || url.password().is_some()
            || url.query().is_some()
            || url.fragment().is_some()
            || input.base_url.len() > 2048
        {
            return Err(invalid());
        }
        if input.credential.as_ref().is_some_and(|s| {
            s.trim().is_empty() || s.len() > 2400 || s.chars().any(char::is_control)
        }) {
            return Err(invalid());
        }
        Ok(())
    }

    pub fn delete_provider(&self, input: RevisionCommand) -> AppResult<ConfigView> {
        check_protocol(input.protocol_version)?;
        let _operation = self.operation_lock()?;
        let (revision, mut snapshot) = self.read_snapshot()?;
        let previous = snapshot.providers.len();
        snapshot.providers.retain(|p| p.provider.id != input.id);
        if snapshot.providers.len() == previous {
            return Err(invalid());
        }
        self.commit(input.expected_revision, &snapshot, None)?;
        if revision != input.expected_revision {
            return Err(AppError::new(ErrorCode::ConfigConflict));
        }
        self.view()
    }

    pub fn reorder_providers(&self, input: ReorderProviders) -> AppResult<ConfigView> {
        check_protocol(input.protocol_version)?;
        let _operation = self.operation_lock()?;
        let (_, mut snapshot) = self.read_snapshot()?;
        let wanted: HashSet<_> = input.ids.iter().collect();
        if wanted.len() != input.ids.len()
            || input.ids.len() != snapshot.providers.len()
            || snapshot
                .providers
                .iter()
                .any(|p| !wanted.contains(&p.provider.id))
        {
            return Err(invalid());
        }
        snapshot
            .providers
            .sort_by_key(|p| input.ids.iter().position(|id| id == &p.provider.id));
        self.commit(input.expected_revision, &snapshot, None)?;
        self.view()
    }

    fn commit(
        &self,
        expected: u32,
        snapshot: &ConfigSnapshot,
        operation: Option<&str>,
    ) -> AppResult<()> {
        let mut db = self.db.lock().map_err(storage)?;
        let tx = db
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(storage)?;
        let (current, _) = Self::read_db(&tx)?;
        if current != expected {
            return Err(AppError::new(ErrorCode::ConfigConflict));
        }
        let next = current.checked_add(1).ok_or_else(invalid)?;
        let json = serde_json::to_string(snapshot).map_err(storage)?;
        tx.execute("INSERT INTO revisions VALUES(?1,?2)", params![next, json])
            .map_err(storage)?;
        tx.execute(
            "UPDATE config_head SET revision=?1 WHERE singleton=1",
            [next],
        )
        .map_err(storage)?;
        if let Some(operation) = operation {
            tx.execute(
                "DELETE FROM credential_journal WHERE operation_id=?1",
                [operation],
            )
            .map_err(storage)?;
        }
        tx.commit().map_err(storage)
    }

    pub fn recover_credentials(&self) -> AppResult<()> {
        let _operation = self.operation_lock()?;
        self.recover_locked()
    }

    fn recover_locked(&self) -> AppResult<()> {
        let db = self.db.lock().map_err(storage)?;
        let pending: Vec<(String, String)> = db
            .prepare("SELECT operation_id,credential_ref FROM credential_journal")
            .map_err(storage)?
            .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
            .map_err(storage)?
            .collect::<Result<_, _>>()
            .map_err(storage)?;
        let snapshots: Vec<String> = db
            .prepare("SELECT snapshot FROM revisions")
            .map_err(storage)?
            .query_map([], |r| r.get(0))
            .map_err(storage)?
            .collect::<Result<_, _>>()
            .map_err(storage)?;
        let all: Vec<ConfigSnapshot> = snapshots
            .iter()
            .map(|s| serde_json::from_str(s).map_err(storage))
            .collect::<AppResult<_>>()?;
        drop(db);
        for (operation, reference) in pending {
            let referenced = all.iter().any(|s| {
                s.providers
                    .iter()
                    .any(|p| p.credential_ref.as_deref() == Some(&reference))
            });
            // Cleanup failure leaves a retryable journal, without making saved config disappear.
            if referenced || self.credentials.delete(&reference).is_ok() {
                self.db
                    .lock()
                    .map_err(storage)?
                    .execute(
                        "DELETE FROM credential_journal WHERE operation_id=?1",
                        [operation],
                    )
                    .map_err(storage)?;
            }
        }
        Ok(())
    }
}
