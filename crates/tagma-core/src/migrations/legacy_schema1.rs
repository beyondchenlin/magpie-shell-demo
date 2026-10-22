//! Exact 7f5c5fb format compatibility, before application_id existed.
use super::*;

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Snapshot {
    providers: Vec<Record>,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Record {
    provider: Provider,
    credential_ref: Option<String>,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Provider {
    id: String,
    name: String,
    protocol: crate::ProviderProtocol,
    base_url: String,
    enabled: bool,
    models: Vec<String>,
    has_credential: bool,
}
fn normalized(sql: &str) -> String {
    sql.chars()
        .filter(|c| !c.is_ascii_whitespace())
        .collect::<String>()
        .to_ascii_lowercase()
}
pub(super) fn recognize(db: &Connection) -> AppResult<bool> {
    if schema(db)? != 1 {
        return Ok(false);
    }
    let expected = [
        (
            "config_head",
            "CREATE TABLE config_head(singleton INTEGER PRIMARY KEY CHECK(singleton=1), revision INTEGER NOT NULL REFERENCES revisions(revision))",
        ),
        (
            "credential_journal",
            "CREATE TABLE credential_journal(operation_id TEXT PRIMARY KEY, credential_ref TEXT NOT NULL UNIQUE)",
        ),
        (
            "revisions",
            "CREATE TABLE revisions(revision INTEGER PRIMARY KEY, snapshot TEXT NOT NULL)",
        ),
    ];
    let mut statement = db
        .prepare(
            "SELECT type,name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .map_err(|_| error())?;
    let objects = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
            ))
        })
        .map_err(|_| error())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| error())?;
    if objects.len() != expected.len()
        || objects
            .iter()
            .zip(expected)
            .any(|((kind, name, sql), (want_name, want_sql))| {
                kind != "table"
                    || name != want_name
                    || sql.as_deref().map(normalized) != Some(normalized(want_sql))
            })
    {
        return Ok(false);
    }
    // Every historical row must match the original closed format. Unknown
    // fields, corrupt JSON, different constraints, triggers and foreign tables
    // are rejected before any journal, backup or identity write.
    let bad_size:bool=db.query_row("SELECT EXISTS(SELECT 1 FROM revisions WHERE revision<0 OR typeof(snapshot)!='text' OR length(CAST(snapshot AS BLOB))>1048576)",[],|r|r.get(0)).map_err(|_|error())?;
    let heads: u32 = db
        .query_row("SELECT count(*) FROM config_head", [], |r| r.get(0))
        .map_err(|_| error())?;
    if bad_size || heads != 1 {
        return Ok(false);
    }
    let valid_head:bool=db.query_row("SELECT EXISTS(SELECT 1 FROM config_head h JOIN revisions r ON r.revision=h.revision WHERE h.singleton=1)",[],|r|r.get(0)).map_err(|_|error())?;
    if !valid_head {
        return Ok(false);
    }
    let deadline = Instant::now() + Duration::from_secs(10);
    let mut statement = db
        .prepare("SELECT snapshot FROM revisions ORDER BY revision")
        .map_err(|_| error())?;
    let mut rows = statement.query([]).map_err(|_| error())?;
    while let Some(row) = rows.next().map_err(|_| error())? {
        if Instant::now() >= deadline {
            return Err(error());
        }
        let json: String = row.get(0).map_err(|_| error())?;
        if serde_json::from_str::<Snapshot>(&json).is_err() {
            return Ok(false);
        }
    }
    let mut check = db
        .prepare("PRAGMA foreign_key_check")
        .map_err(|_| error())?;
    if check
        .query([])
        .map_err(|_| error())?
        .next()
        .map_err(|_| error())?
        .is_some()
    {
        return Ok(false);
    }
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    const ORIGINAL_SQL: &str = include_str!("../../tests/fixtures/original-schema1.sql");
    #[test]
    fn foreign_or_damaged_owner_zero_stores_are_never_claimed() {
        for fault in [
            "schema0",
            "schema2",
            "foreign_owner",
            "extra_table",
            "weakened_schema",
            "bad_json",
            "unknown_json",
            "duplicate_json",
            "bad_head",
        ] {
            let root = tempfile::Builder::new()
                .prefix("tagma-startup-upgrade-")
                .tempdir()
                .unwrap();
            let file = root.path().join("config.sqlite3");
            let db = Connection::open(&file).unwrap();
            db.execute_batch(&if fault == "weakened_schema" {
                ORIGINAL_SQL.replace("CHECK(singleton=1)", "")
            } else {
                ORIGINAL_SQL.into()
            })
            .unwrap();
            match fault {
                "schema0" => db.pragma_update(None, "user_version", 0).unwrap(),
                "schema2" => db.pragma_update(None, "user_version", 2).unwrap(),
                "foreign_owner" => db.pragma_update(None, "application_id", 12345).unwrap(),
                "extra_table" => db
                    .execute_batch("CREATE TABLE foreign_data(value TEXT)")
                    .unwrap(),
                "bad_json" => {
                    db.execute("UPDATE revisions SET snapshot='{'", []).unwrap();
                }
                "unknown_json" => {
                    db.execute(
                        "UPDATE revisions SET snapshot=?1",
                        [r#"{"providers":[],"foreign":true}"#],
                    )
                    .unwrap();
                }
                "duplicate_json" => {
                    db.execute(
                        "UPDATE revisions SET snapshot=?1",
                        [r#"{"providers":[],"providers":[]}"#],
                    )
                    .unwrap();
                }
                "bad_head" => {
                    // Deliberately construct a damaged historical fixture;
                    // production migration does not disable FK enforcement.
                    db.pragma_update(None, "foreign_keys", false).unwrap();
                    db.execute("UPDATE config_head SET revision=99", [])
                        .unwrap();
                }
                _ => (),
            }
            drop(db);
            let before = fs::read(&file).unwrap();
            let result =
                ConfigService::open(root.path(), Arc::new(crate::credentials::SystemCredentials));
            assert_eq!(
                result.err().unwrap().code,
                ErrorCode::IncompatibleVersion,
                "{fault}"
            );
            assert_eq!(
                fs::read(&file).unwrap(),
                before,
                "no database bytes changed:{fault}"
            );
            assert!(!root.path().join(JOURNAL).exists());
            assert!(!root.path().join("backups").exists());
        }
        println!(
            "Nine foreign/damaged format negatives refused before journal/backup/identity writes;all original SQLite bytes unchanged,no key operations"
        );
    }
    #[test]
    fn original_identity_upgrade_survives_real_exit_before_and_after_commit() {
        for (point, code, want_schema, want_owner) in
            [("backup", 93, 1, 0), ("commit", 94, 2, 0x5441474d)]
        {
            let root = tempfile::Builder::new()
                .prefix("tagma-startup-upgrade-")
                .tempdir()
                .unwrap();
            let db = Connection::open(root.path().join("config.sqlite3")).unwrap();
            db.execute_batch(ORIGINAL_SQL).unwrap();
            drop(db);
            let status = std::process::Command::new(std::env::current_exe().unwrap())
                .args([
                    "--exact",
                    "migrations::legacy_schema1::tests::crash_worker",
                    "--ignored",
                    "--nocapture",
                ])
                .env("TAGMA_LEGACY_CRASH_ROOT", root.path())
                .env("TAGMA_LEGACY_CRASH_POINT", point)
                .status()
                .unwrap();
            assert_eq!(status.code(), Some(code));
            let db = Connection::open(root.path().join("config.sqlite3")).unwrap();
            assert_eq!(schema(&db).unwrap(), want_schema);
            assert_eq!(
                db.pragma_query_value::<u32, _>(None, "application_id", |r| r.get(0))
                    .unwrap(),
                want_owner
            );
            let prior_id: Option<String> = if want_schema == 2 {
                Some(
                    db.query_row("SELECT config_uuid FROM config_metadata", [], |r| r.get(0))
                        .unwrap(),
                )
            } else {
                None
            };
            drop(db);
            assert!(pending(root.path()));
            let service =
                ConfigService::open(root.path(), Arc::new(crate::credentials::SystemCredentials))
                    .unwrap();
            assert_eq!(service.view().unwrap().schema_version, SCHEMA_VERSION);
            assert_eq!(service.view().unwrap().desired_revision, 0);
            drop(service);
            let db = Connection::open(root.path().join("config.sqlite3")).unwrap();
            if let Some(id) = prior_id {
                assert_eq!(
                    db.query_row::<String, _, _>(
                        "SELECT config_uuid FROM config_metadata",
                        [],
                        |r| r.get(0)
                    )
                    .unwrap(),
                    id
                );
            }
            assert_eq!(
                db.query_row::<String, _, _>(
                    "SELECT snapshot FROM revisions WHERE revision=0",
                    [],
                    |r| r.get(0)
                )
                .unwrap(),
                "{\"providers\":[]}"
            );
            let files: Vec<_> = fs::read_dir(root.path().join("backups"))
                .unwrap()
                .filter_map(Result::ok)
                .filter(|e| e.path().extension().is_some_and(|s| s == "sqlite3"))
                .collect();
            assert_eq!(files.len(), (SCHEMA_VERSION - 1) as usize, "one preserved backup per historical schema transition");
            let first = files
                .iter()
                .find(|e| e.file_name().to_string_lossy().starts_with("schema-1-"))
                .unwrap();
            let old = Connection::open(first.path()).unwrap();
            assert_eq!(schema(&old).unwrap(), 1);
            assert_eq!(
                old.pragma_query_value::<u32, _>(None, "application_id", |r| r.get(0))
                    .unwrap(),
                0
            );
            assert!(!pending(root.path()));
        }
        println!(
            "Real exit93 after verified original-owner0 backup and exit94 after atomic identity/schema2 commit both resume through ConfigService to current schema;original backup/JSON retained,new identity stable,no repeated migration"
        );
    }
    #[test]
    #[ignore = "only explicit parent-owned crash fixture"]
    fn crash_worker() {
        use fs2::FileExt;
        let root = std::path::PathBuf::from(
            std::env::var_os("TAGMA_LEGACY_CRASH_ROOT").expect("owned fixture required"),
        );
        let point = std::env::var("TAGMA_LEGACY_CRASH_POINT").unwrap();
        let lock = OpenOptions::new()
            .create(true)
            .truncate(false)
            .read(true)
            .write(true)
            .open(root.join("maintenance.lock"))
            .unwrap();
        lock.try_lock_exclusive().unwrap();
        super::super::prepare_step(
            &root,
            || {
                if point == "backup" {
                    std::process::exit(93)
                }
                Ok(())
            },
            || {
                if point == "commit" {
                    std::process::exit(94)
                }
                Ok(())
            },
        )
        .unwrap();
        panic!("crash boundary not reached");
    }
}
