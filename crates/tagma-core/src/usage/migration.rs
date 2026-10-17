//! Single usage writer lock is held. Consistent bounded backup precedes DDL.
use super::*;
use rusqlite::backup::{Backup, StepResult};
use sha2::{Digest, Sha256};
use std::io::{Read, Write};
use std::time::Instant;
const JOURNAL: &str = "usage-migration.json";
const IDENTITY: &str = "com.tagmaai.desktop/usage-migration/1-2/v1";
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Journal {
    owner: String,
    operation_id: String,
    source_sha256: String,
    backup_sha256: Option<String>,
}
pub(super) fn pending(directory: &Path) -> AppResult<bool> {
    match fs::symlink_metadata(directory.join(JOURNAL)) {
        Ok(_) => Ok(true),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(e) => Err(storage(e)),
    }
}
fn digest(path: &Path) -> AppResult<String> {
    regular(path, false)?;
    if fs::metadata(path).map_err(storage)?.len() > MAX_BYTES {
        return Err(storage("usage digest size"));
    }
    let mut input = File::open(path).map_err(storage)?;
    let mut hash = Sha256::new();
    let mut buffer = [0; 65536];
    let deadline = Instant::now() + Duration::from_secs(10);
    loop {
        if Instant::now() > deadline {
            return Err(storage("usage digest timeout"));
        }
        let n = input.read(&mut buffer).map_err(storage)?;
        if n == 0 {
            break;
        }
        hash.update(&buffer[..n]);
    }
    Ok(format!("{:x}", hash.finalize()))
}
fn write(directory: &Path, journal: &Journal, replace: bool) -> AppResult<()> {
    let staging = directory.join(format!(".usage-migration-{}.tmp", uuid::Uuid::new_v4()));
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&staging)
        .map_err(storage)?;
    file.write_all(&serde_json::to_vec(journal).map_err(storage)?)
        .map_err(storage)?;
    file.sync_all().map_err(storage)?;
    drop(file);
    if replace {
        fs::rename(staging, directory.join(JOURNAL)).map_err(storage)?;
    } else {
        crate::initialization::publish_new(&staging, &directory.join(JOURNAL)).map_err(storage)?;
    }
    Ok(())
}
pub(super) fn prepare(directory: &Path, db: &mut Connection) -> AppResult<()> {
    let version: u32 = db
        .pragma_query_value(None, "user_version", |r| r.get(0))
        .map_err(storage)?;
    validate_schema_version(db, version)?;
    // Freeze committed WAL into the source before recording its hash. An active
    // reader preventing this checkpoint delays upgrade, never drops WAL data.
    if version == 1 {
        let busy: u32 = db
            .query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |row| row.get(0))
            .map_err(storage)?;
        if busy != 0 {
            return Err(storage("usage backup checkpoint busy"));
        }
    }
    let target = directory.join("usage.sqlite3");
    let mut journal: Journal = if pending(directory)? {
        let path = directory.join(JOURNAL);
        regular(&path, false)?;
        let mut bytes = Vec::new();
        File::open(path)
            .map_err(storage)?
            .take(4097)
            .read_to_end(&mut bytes)
            .map_err(storage)?;
        if bytes.len() > 4096 {
            return Err(storage("usage migration bound"));
        }
        serde_json::from_slice(&bytes).map_err(storage)?
    } else {
        if version != 1 {
            return Err(storage("missing migration intent"));
        }
        let journal = Journal {
            owner: IDENTITY.into(),
            operation_id: uuid::Uuid::new_v4().to_string(),
            source_sha256: digest(&target)?,
            backup_sha256: None,
        };
        write(directory, &journal, false)?;
        journal
    };
    let hash = |s: &str| s.len() == 64 && s.bytes().all(|b| b.is_ascii_hexdigit());
    if journal.owner != IDENTITY
        || !identifier(&journal.operation_id)
        || !hash(&journal.source_sha256)
        || journal.backup_sha256.as_deref().is_some_and(|s| !hash(s))
    {
        return Err(storage("unknown usage migration"));
    }
    if version == 1 && digest(&target)? != journal.source_sha256 {
        return Err(storage("usage changed after backup intent"));
    }
    #[cfg(test)]
    crash_hook("backup_intent");
    let backups = directory.join("usage-backups");
    fs::create_dir_all(&backups).map_err(storage)?;
    regular(&backups, true)?;
    let backup = backups.join(format!("schema-1-{}.sqlite3", journal.operation_id));
    if journal.backup_sha256.is_none() {
        if version != 1 {
            return Err(storage("unconfirmed usage backup"));
        }
        let size: u64 = db
            .pragma_query_value(None, "page_count", |row| unsigned(row, 0))
            .map_err(storage)?
            .checked_mul(
                db.pragma_query_value(None, "page_size", |row| unsigned(row, 0))
                    .map_err(storage)?,
            )
            .ok_or_else(|| storage("backup size overflow"))?;
        if size > MAX_BYTES
            || fs2::available_space(directory).map_err(storage)?
                < size.saturating_mul(2).saturating_add(4 * 1024 * 1024)
        {
            return Err(storage("usage backup space"));
        }
        match fs::symlink_metadata(&backup) {
            Ok(_) => regular(&backup, false)?,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                OpenOptions::new()
                    .write(true)
                    .create_new(true)
                    .open(&backup)
                    .map_err(storage)?;
            }
            Err(e) => return Err(storage(e)),
        }
        let mut destination =
            Connection::open_with_flags(&backup, OpenFlags::SQLITE_OPEN_READ_WRITE)
                .map_err(storage)?;
        let previous: u32 = destination
            .pragma_query_value(None, "user_version", |row| row.get(0))
            .map_err(storage)?;
        let objects: u32 = destination
            .query_row(
                "SELECT count(*) FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%'",
                [],
                |row| row.get(0),
            )
            .map_err(storage)?;
        if previous == 0 && objects == 0 {
            let copy = Backup::new(db, &mut destination).map_err(storage)?;
            let deadline = Instant::now() + Duration::from_secs(10);
            loop {
                match copy.step(128).map_err(storage)? {
                    StepResult::Done => break,
                    StepResult::More if Instant::now() < deadline => {}
                    _ => return Err(storage("usage backup timeout")),
                }
            }
        } else {
            validate_schema_version(&destination, 1)?;
        }
        validate_schema_version(&destination, 1)?;
        let check: String = destination
            .query_row("PRAGMA quick_check", [], |row| row.get(0))
            .map_err(storage)?;
        if check != "ok" {
            return Err(storage("usage backup integrity"));
        }
        drop(destination);
        #[cfg(test)]
        crash_hook("backup_copy");
        journal.backup_sha256 = Some(digest(&backup)?);
        write(directory, &journal, true)?;
    }
    if journal.backup_sha256.as_deref() != Some(&digest(&backup)?) {
        return Err(storage("usage backup changed"));
    }
    #[cfg(test)]
    crash_hook("backed_up");
    if version == 1 {
        let tx = db
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(storage)?;
        tx.execute_batch(UPGRADE_V2).map_err(storage)?;
        tx.pragma_update(None, "user_version", 2).map_err(storage)?;
        #[cfg(test)]
        crash_hook("upgrading");
        tx.commit().map_err(storage)?;
        #[cfg(test)]
        crash_hook("upgraded");
    }
    crate::initialization::publish_new(
        &directory.join(JOURNAL),
        &backups.join(format!("migration-{}.json", journal.operation_id)),
    )
    .map_err(storage)?;
    Ok(())
}
