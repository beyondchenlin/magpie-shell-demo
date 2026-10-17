//! Development-only cleanup for the test runner's fresh, receipt-owned Temp fixture.
//! Does not enumerate credentials or remove files. No production IPC exposes this helper.
use serde::Deserialize;
use std::{collections::HashSet, path::Path};
use tagma_core::{
    credentials::{CredentialStore, SystemCredentials},
    service::ConfigSnapshot,
};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Receipt {
    owner: String,
    operation_id: String,
}
fn ordinary(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let metadata = std::fs::symlink_metadata(path)?;
    if metadata.file_type().is_symlink() {
        return Err("fixture has a link".into());
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes() & 0x400 != 0 {
            return Err("fixture has a reparse point".into());
        }
    }
    Ok(())
}
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let path = std::env::args_os().nth(1).ok_or("fixture path required")?;
    let path = Path::new(&path);
    ordinary(path)?;
    let path = path.canonicalize()?;
    let temporary = std::env::temp_dir().canonicalize()?;
    if path.parent() != Some(temporary.as_path()) {
        return Err("fixture must be a direct child of system Temp".into());
    }
    let receipt_path = path.join("tagma-native-fixture-owner.json");
    ordinary(&receipt_path)?;
    let bytes = std::fs::read(receipt_path)?;
    if bytes.len() > 4096 {
        return Err("invalid receipt size".into());
    }
    let receipt: Receipt = serde_json::from_slice(&bytes)?;
    let operation = uuid::Uuid::parse_str(&receipt.operation_id)?;
    if receipt.owner != "tagma-native-test/v1"
        || path.file_name().and_then(|v| v.to_str())
            != Some(format!("tagma-native-owned-{operation}").as_str())
    {
        return Err("fixture receipt mismatch".into());
    }
    let database = path.join("config.sqlite3");
    ordinary(&database)?;
    let db = rusqlite::Connection::open_with_flags(
        database,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
    )?;
    let application: u32 = db.pragma_query_value(None, "application_id", |r| r.get(0))?;
    let schema: u32 = db.pragma_query_value(None, "user_version", |r| r.get(0))?;
    if application != 0x5441474d || schema != tagma_core::SCHEMA_VERSION {
        return Err("unexpected fixture database identity".into());
    }
    let snapshots = db
        .prepare("SELECT snapshot FROM revisions")?
        .query_map([], |r| r.get::<_, String>(0))?
        .collect::<Result<Vec<_>, _>>()?;
    let mut references = HashSet::new();
    for json in snapshots {
        let snapshot: ConfigSnapshot = serde_json::from_str(&json)?;
        references.extend(snapshot.gateway.credential_ref);
        references.extend(
            snapshot
                .providers
                .into_iter()
                .filter_map(|p| p.credential_ref),
        );
    }
    references.extend(
        db.prepare("SELECT credential_ref FROM credential_journal")?
            .query_map([], |r| r.get::<_, String>(0))?
            .collect::<Result<Vec<_>, _>>()?,
    );
    if references.iter().any(|r| {
        r.split_once('/').is_none_or(|(kind, id)| {
            !matches!(kind, "provider" | "gateway") || uuid::Uuid::parse_str(id).is_err()
        })
    }) {
        return Err("unexpected credential reference namespace".into());
    }
    for reference in &references {
        SystemCredentials
            .delete(reference)
            .map_err(|_| "fixture credential cleanup failed")?;
    }
    println!(
        "Removed {} exact receipt-owned fixture credential references",
        references.len()
    );
    Ok(())
}
