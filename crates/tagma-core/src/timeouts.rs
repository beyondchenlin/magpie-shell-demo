//! Provider inference timeouts. Catalog probes have a separate bounded policy.
use crate::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct ProviderTimeouts {
    pub connect_ms: u32,
    pub first_response_ms: u32,
    pub idle_ms: u32,
    pub total_ms: u32,
}
impl Default for ProviderTimeouts {
    fn default() -> Self {
        Self {
            connect_ms: 10000,
            first_response_ms: 30000,
            idle_ms: 30000,
            total_ms: 120000,
        }
    }
}
impl ProviderTimeouts {
    pub fn validate(&self) -> AppResult<()> {
        if !(100..=60000).contains(&self.connect_ms)
            || !(100..=120000).contains(&self.first_response_ms)
            || !(100..=120000).contains(&self.idle_ms)
            || !(100..=120000).contains(&self.total_ms)
            || self.connect_ms > self.first_response_ms
            || self.first_response_ms > self.total_ms
            || self.idle_ms > self.total_ms
        {
            Err(AppError::new(ErrorCode::InvalidInput))
        } else {
            Ok(())
        }
    }
}
#[derive(Debug, Clone, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct SaveProviderTimeouts {
    pub protocol_version: u32,
    pub expected_revision: u32,
    pub id: String,
    pub timeouts: ProviderTimeouts,
}
pub(crate) fn validate(snapshot: &crate::service::ConfigSnapshot) -> AppResult<()> {
    for record in &snapshot.providers {
        record.provider.timeouts.validate()?;
    }
    Ok(())
}
impl ConfigService {
    pub fn save_provider_timeouts(&self, input: SaveProviderTimeouts) -> AppResult<ConfigView> {
        check_protocol(input.protocol_version)?;
        input.timeouts.validate()?;
        let _operation = self.operation_lock()?;
        let (revision, mut snapshot) = self.read_snapshot()?;
        if revision != input.expected_revision {
            return Err(AppError::new(ErrorCode::ConfigConflict));
        }
        let provider = snapshot
            .providers
            .iter_mut()
            .find(|provider| provider.provider.id == input.id)
            .ok_or_else(|| AppError::new(ErrorCode::InvalidInput))?;
        provider.provider.timeouts = input.timeouts;
        self.commit(revision, &snapshot, None)?;
        self.view()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::credentials::CredentialStore;
    use rusqlite::{Connection, OpenFlags, params};
    use std::sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    };
    struct NoSecrets(AtomicUsize);
    impl CredentialStore for NoSecrets {
        fn set(&self, _: &str, _: &str) -> AppResult<()> {
            self.0.fetch_add(1, Ordering::SeqCst);
            Err(AppError::new(ErrorCode::CredentialStoreUnavailable))
        }
        fn get(&self, _: &str) -> AppResult<zeroize::Zeroizing<String>> {
            self.0.fetch_add(1, Ordering::SeqCst);
            Err(AppError::new(ErrorCode::CredentialStoreUnavailable))
        }
        fn delete(&self, _: &str) -> AppResult<()> {
            self.0.fetch_add(1, Ordering::SeqCst);
            Err(AppError::new(ErrorCode::CredentialStoreUnavailable))
        }
    }
    fn provider(revision: u32, id: Option<String>) -> SaveProvider {
        SaveProvider {
            protocol_version: 1,
            expected_revision: revision,
            id,
            name: "owned timeout fixture".into(),
            protocol: ProviderProtocol::OpenaiChatCompletions,
            base_url: "https://example.invalid/v1".into(),
            enabled: true,
            models: vec!["owned-timeout-model".into()],
            credential: None,
        }
    }
    fn custom() -> ProviderTimeouts {
        ProviderTimeouts {
            connect_ms: 500,
            first_response_ms: 1000,
            idle_ms: 2000,
            total_ms: 3000,
        }
    }
    #[test]
    fn timeouts_validate_exact_ranges_relationships_and_strict_wire_types() {
        assert!(ProviderTimeouts::default().validate().is_ok());
        assert!(custom().validate().is_ok());
        for value in [
            ProviderTimeouts {
                connect_ms: 0,
                ..custom()
            },
            ProviderTimeouts {
                connect_ms: 60001,
                first_response_ms: 120000,
                total_ms: 120000,
                ..custom()
            },
            ProviderTimeouts {
                connect_ms: 1001,
                ..custom()
            },
            ProviderTimeouts {
                first_response_ms: 3001,
                ..custom()
            },
            ProviderTimeouts {
                idle_ms: 3001,
                ..custom()
            },
            ProviderTimeouts {
                total_ms: 120001,
                ..custom()
            },
        ] {
            assert_eq!(value.validate().unwrap_err().code, ErrorCode::InvalidInput);
        }
        for value in [
            serde_json::json!({"connect_ms":100.5,"first_response_ms":1000,"idle_ms":1000,"total_ms":1000}),
            serde_json::json!({"connect_ms":-1,"first_response_ms":1000,"idle_ms":1000,"total_ms":1000}),
            serde_json::json!({"connect_ms":100,"first_response_ms":1000,"idle_ms":1000,"total_ms":1000,"unknown":1}),
        ] {
            assert!(serde_json::from_value::<ProviderTimeouts>(value).is_err());
        }
    }
    #[test]
    fn corrupt_stored_timeouts_are_preserved_and_refused_without_default_fallback() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-timeout-core-")
            .tempdir()
            .unwrap();
        let secrets = Arc::new(NoSecrets(AtomicUsize::new(0)));
        let service = ConfigService::open(temp.path(), secrets.clone()).unwrap();
        service.save_provider(provider(0, None)).unwrap();
        let db = Connection::open(temp.path().join("config.sqlite3")).unwrap();
        let json: String = db
            .query_row(
                "SELECT snapshot FROM revisions WHERE revision=1",
                [],
                |row| row.get(0),
            )
            .unwrap();
        let mut value: serde_json::Value = serde_json::from_str(&json).unwrap();
        value["providers"][0]["provider"]["timeouts"]["idle_ms"] = serde_json::json!(0);
        let damaged = serde_json::to_string(&value).unwrap();
        db.execute(
            "UPDATE revisions SET snapshot=?1 WHERE revision=1",
            [&damaged],
        )
        .unwrap();
        assert_eq!(
            service.view().unwrap_err().code,
            ErrorCode::StorageUnavailable
        );
        assert!(service.save_provider(provider(1, None)).is_err());
        assert_eq!(
            db.query_row::<String, _, _>(
                "SELECT snapshot FROM revisions WHERE revision=1",
                [],
                |row| row.get(0)
            )
            .unwrap(),
            damaged
        );
        assert_eq!(
            db.query_row::<i64, _, _>("SELECT count(*) FROM revisions", [], |row| row.get(0))
                .unwrap(),
            2
        );
        drop(service);
        let reopened = ConfigService::open(temp.path(), secrets.clone()).unwrap();
        assert_eq!(
            reopened.view().unwrap_err().code,
            ErrorCode::StorageUnavailable
        );
        assert_eq!(secrets.0.load(Ordering::SeqCst), 0);
        println!(
            "Stored invalid timeout0:read/save/reopen refused,original JSON preserved,revision count2 unchanged,secrets0;default applies only to absent legacy field"
        );
    }
    #[test]
    fn shared_timeout_save_preserves_provider_edits_identity_conflicts_and_commit_failures() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-timeout-core-")
            .tempdir()
            .unwrap();
        let secrets = Arc::new(NoSecrets(AtomicUsize::new(0)));
        let service = ConfigService::open(temp.path(), secrets.clone()).unwrap();
        let view = service.save_provider(provider(0, None)).unwrap();
        let id = view.providers[0].id.clone();
        assert_eq!(view.providers[0].timeouts, ProviderTimeouts::default());
        let before =
            crate::health::provider_fingerprint(&service.read_snapshot().unwrap().1.providers[0]);
        let view = service
            .save_provider_timeouts(SaveProviderTimeouts {
                protocol_version: 1,
                expected_revision: 1,
                id: id.clone(),
                timeouts: custom(),
            })
            .unwrap();
        assert_eq!(view.desired_revision, 2);
        assert_eq!(view.providers[0].timeouts, custom());
        assert_eq!(
            crate::health::provider_fingerprint(&service.read_snapshot().unwrap().1.providers[0]),
            before,
            "timeout settings do not rotate provider connection identity or credentials"
        );
        assert_eq!(
            service
                .save_provider_timeouts(SaveProviderTimeouts {
                    protocol_version: 1,
                    expected_revision: 1,
                    id: id.clone(),
                    timeouts: custom()
                })
                .unwrap_err()
                .code,
            ErrorCode::ConfigConflict
        );
        assert_eq!(
            service
                .save_provider_timeouts(SaveProviderTimeouts {
                    protocol_version: 1,
                    expected_revision: 2,
                    id: uuid::Uuid::new_v4().to_string(),
                    timeouts: custom()
                })
                .unwrap_err()
                .code,
            ErrorCode::InvalidInput
        );
        service
            .save_provider(provider(2, Some(id.clone())))
            .unwrap();
        assert_eq!(
            service.view().unwrap().providers[0].timeouts,
            custom(),
            "ordinary provider edit must not reset advanced settings"
        );
        let db = Connection::open(temp.path().join("config.sqlite3")).unwrap();
        db.execute_batch("CREATE TRIGGER owned_timeout_failure BEFORE INSERT ON revisions BEGIN SELECT RAISE(ABORT,'owned save fault');END;").unwrap();
        assert!(
            service
                .save_provider_timeouts(SaveProviderTimeouts {
                    protocol_version: 1,
                    expected_revision: 3,
                    id,
                    timeouts: ProviderTimeouts::default()
                })
                .is_err()
        );
        assert_eq!(service.view().unwrap().desired_revision, 3);
        assert_eq!(service.view().unwrap().providers[0].timeouts, custom());
        drop(db);
        drop(service);
        let service = ConfigService::open(temp.path(), secrets.clone()).unwrap();
        assert_eq!(service.view().unwrap().providers[0].timeouts, custom());
        assert_eq!(secrets.0.load(Ordering::SeqCst), 0);
        assert!(!temp.path().join("usage.sqlite3").exists());
        println!(
            "Timeout core:default10/30/30/120s,custom0.5/1/2/3s persisted;stale editor/unknown provider refused;ordinary provider save retains settings;failed SQL preserves revision3;reopen same;connection fingerprint unchanged,secrets0,usage not created"
        );
    }
    #[test]
    fn schema_nine_backup_preserves_legacy_json_and_defaults_until_explicit_new_revision() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-timeout-core-")
            .tempdir()
            .unwrap();
        let secrets = Arc::new(NoSecrets(AtomicUsize::new(0)));
        let service = ConfigService::open(temp.path(), secrets.clone()).unwrap();
        let id = service.save_provider(provider(0, None)).unwrap().providers[0]
            .id
            .clone();
        drop(service);
        let db = Connection::open(temp.path().join("config.sqlite3")).unwrap();
        let json: String = db
            .query_row(
                "SELECT snapshot FROM revisions WHERE revision=1",
                [],
                |row| row.get(0),
            )
            .unwrap();
        let mut value: serde_json::Value = serde_json::from_str(&json).unwrap();
        value["providers"][0]["provider"]
            .as_object_mut()
            .unwrap()
            .remove("timeouts");
        let legacy = serde_json::to_string(&value).unwrap();
        db.execute(
            "UPDATE revisions SET snapshot=?1 WHERE revision=1",
            [&legacy],
        )
        .unwrap();
        db.pragma_update(None, "user_version", 9).unwrap();
        drop(db);
        let service = ConfigService::open(temp.path(), secrets.clone()).unwrap();
        assert_eq!(service.view().unwrap().schema_version, SCHEMA_VERSION);
        assert_eq!(service.view().unwrap().desired_revision, 1);
        assert_eq!(
            service.view().unwrap().providers[0].timeouts,
            ProviderTimeouts::default()
        );
        let db = Connection::open_with_flags(
            temp.path().join("config.sqlite3"),
            OpenFlags::SQLITE_OPEN_READ_ONLY,
        )
        .unwrap();
        let after: String = db
            .query_row(
                "SELECT snapshot FROM revisions WHERE revision=1",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(after, legacy);
        let backup = std::fs::read_dir(temp.path().join("backups"))
            .unwrap()
            .map(|entry| entry.unwrap().path())
            .find(|path| {
                path.file_name()
                    .unwrap()
                    .to_string_lossy()
                    .starts_with("schema-9-")
            })
            .unwrap();
        let saved = Connection::open_with_flags(backup, OpenFlags::SQLITE_OPEN_READ_ONLY).unwrap();
        assert_eq!(
            saved
                .pragma_query_value(None, "user_version", |row| row.get::<_, u32>(0))
                .unwrap(),
            9
        );
        assert_eq!(
            saved
                .query_row::<String, _, _>(
                    "SELECT snapshot FROM revisions WHERE revision=1",
                    [],
                    |row| row.get(0)
                )
                .unwrap(),
            legacy
        );
        drop(saved);
        service
            .save_provider_timeouts(SaveProviderTimeouts {
                protocol_version: 1,
                expected_revision: 1,
                id,
                timeouts: custom(),
            })
            .unwrap();
        let new: String = db
            .query_row(
                "SELECT snapshot FROM revisions WHERE revision=2",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(new.contains("\"timeouts\""));
        assert_eq!(
            db.query_row::<String, _, _>(
                "SELECT snapshot FROM revisions WHERE revision=?1",
                params![1],
                |row| row.get(0)
            )
            .unwrap(),
            legacy
        );
        assert_eq!(secrets.0.load(Ordering::SeqCst), 0);
        println!(
            "Timeout schema9->current:known consistent schema9 backup preserves original provider JSON byte-for-byte,implicit defaults do not rewrite revision1,new settings only revision2,secrets0"
        );
    }
}
