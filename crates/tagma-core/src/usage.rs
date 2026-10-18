//! Separate, single-writer request ledger. No messages, headers or credentials.
//! The gateway actor awaits begin_request/begin_attempt before dispatch.
//! Read-only projections share this ledger through the read module.
#[cfg(test)]
mod capacity_tests;
pub mod clear;
mod migration;
pub mod read;
#[cfg(test)]
mod read_tests;
use crate::*;
use fs2::FileExt;
use rusqlite::{Connection, OpenFlags, OptionalExtension, TransactionBehavior, params};
use serde::{Deserialize, Serialize};
use std::{
    collections::VecDeque,
    fs::{self, File, OpenOptions},
    path::{Path, PathBuf},
    time::Duration,
};

const OWNER: u32 = 0x54414755; // TAGU, not the configuration database.
const MAX_BYTES: u64 = 256 * 1024 * 1024;
const MAX_WAL_BYTES: u64 = 16 * 1024 * 1024;
const MAX_PENDING: usize = DEFAULT_HTTP_CONCURRENCY * 2;
const DAY: u64 = 86_400_000;
#[cfg(test)]
fn crash_hook(point: &str) {
    if std::env::var("TAGMA_TEST_USAGE_CRASH").ok().as_deref() == Some(point) {
        std::process::exit(90);
    }
}
const SCHEMA: &str = "
CREATE TABLE usage_meta(singleton INTEGER PRIMARY KEY CHECK(singleton=1),detail_start_ms INTEGER NOT NULL);
INSERT INTO usage_meta VALUES(1,0);
CREATE TABLE usage_requests(id TEXT PRIMARY KEY,provider_id TEXT NOT NULL,model TEXT NOT NULL,config_revision INTEGER NOT NULL,team_revision INTEGER,started_ms INTEGER NOT NULL,finished_ms INTEGER,outcome TEXT NOT NULL,error_code TEXT,input_tokens INTEGER,output_tokens INTEGER);
CREATE TABLE usage_attempts(request_id TEXT NOT NULL REFERENCES usage_requests(id) ON DELETE CASCADE,ordinal INTEGER NOT NULL,provider_id TEXT NOT NULL,model TEXT NOT NULL,started_ms INTEGER NOT NULL,finished_ms INTEGER,outcome TEXT NOT NULL,error_code TEXT,input_tokens INTEGER,output_tokens INTEGER,PRIMARY KEY(request_id,ordinal));
CREATE INDEX usage_request_time ON usage_requests(started_ms);
CREATE TABLE usage_daily(day INTEGER NOT NULL,kind TEXT NOT NULL,provider_id TEXT NOT NULL,model TEXT NOT NULL,config_revision INTEGER NOT NULL,team_revision INTEGER NOT NULL,outcome TEXT NOT NULL,count INTEGER NOT NULL CHECK(typeof(count)='integer'),input_known INTEGER NOT NULL CHECK(typeof(input_known)='integer'),input_unknown INTEGER NOT NULL CHECK(typeof(input_unknown)='integer'),output_known INTEGER NOT NULL CHECK(typeof(output_known)='integer'),output_unknown INTEGER NOT NULL CHECK(typeof(output_unknown)='integer'),elapsed_ms INTEGER NOT NULL CHECK(typeof(elapsed_ms)='integer'),PRIMARY KEY(day,kind,provider_id,model,config_revision,team_revision,outcome));
";
const UPGRADE_V2: &str = "
ALTER TABLE usage_meta ADD COLUMN change_revision INTEGER NOT NULL DEFAULT 0 CHECK(typeof(change_revision)='integer' AND change_revision>=0);
ALTER TABLE usage_meta ADD COLUMN generation INTEGER NOT NULL DEFAULT 0 CHECK(typeof(generation)='integer' AND generation>=0);
ALTER TABLE usage_meta ADD COLUMN last_clear_json TEXT;
";
fn bump(db: &Connection) -> AppResult<()> {
    if db.execute("UPDATE usage_meta SET change_revision=change_revision+1 WHERE singleton=1 AND change_revision<9223372036854775807", []).map_err(storage)? != 1 {
        return Err(storage("usage revision exhausted"));
    }
    Ok(())
}

fn storage(_: impl std::fmt::Display) -> AppError {
    AppError::new(ErrorCode::StorageUnavailable)
}
fn context_id(directory: &Path) -> AppResult<String> {
    use sha2::{Digest, Sha256};
    let directory = directory.canonicalize().map_err(storage)?;
    Ok(format!(
        "{:x}",
        Sha256::digest(directory.to_string_lossy().as_bytes())
    ))
}
fn invalid() -> AppError {
    AppError::new(ErrorCode::InvalidInput)
}
fn regular(path: &Path, directory: bool) -> AppResult<()> {
    let meta = fs::symlink_metadata(path).map_err(storage)?;
    if meta.file_type().is_symlink()
        || (if directory {
            !meta.is_dir()
        } else {
            !meta.is_file()
        })
    {
        return Err(storage("file type"));
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if meta.file_attributes() & 0x400 != 0 {
            return Err(storage("reparse point"));
        }
    }
    Ok(())
}
fn identifier(value: &str) -> bool {
    uuid::Uuid::parse_str(value).is_ok_and(|id| id.to_string() == value)
}
fn model(value: &str) -> bool {
    !value.trim().is_empty() && value.len() <= 256 && !value.chars().any(char::is_control)
}
fn unsigned(row: &rusqlite::Row<'_>, index: usize) -> rusqlite::Result<u64> {
    let value: i64 = row.get(index)?;
    u64::try_from(value).map_err(|_| rusqlite::Error::IntegralValueOutOfRange(index, value))
}
fn optional_unsigned(row: &rusqlite::Row<'_>, index: usize) -> rusqlite::Result<Option<u64>> {
    let value: Option<i64> = row.get(index)?;
    value
        .map(|v| u64::try_from(v).map_err(|_| rusqlite::Error::IntegralValueOutOfRange(index, v)))
        .transpose()
}
fn time(value: u64) -> AppResult<i64> {
    i64::try_from(value).map_err(|_| invalid())
}

#[derive(Debug, Clone)]
pub struct RequestStart {
    pub id: String,
    pub provider_id: String,
    pub model: String,
    pub config_revision: u32,
    pub team_revision: Option<u32>,
    pub started_ms: u64,
}
#[derive(Debug, Clone)]
pub struct AttemptStart {
    pub request_id: String,
    pub ordinal: u32,
    pub provider_id: String,
    pub model: String,
    pub started_ms: u64,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Outcome {
    Succeeded,
    Failed,
    Cancelled,
    Interrupted,
}
impl Outcome {
    fn as_str(self) -> &'static str {
        match self {
            Self::Succeeded => "succeeded",
            Self::Failed => "failed",
            Self::Cancelled => "cancelled",
            Self::Interrupted => "interrupted",
        }
    }
}
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct Tokens {
    pub input: Option<u64>,
    pub output: Option<u64>,
}
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Completion {
    pub request_id: String,
    /// None terminates the logical request; Some terminates one actual attempt.
    pub ordinal: Option<u32>,
    pub finished_ms: u64,
    pub outcome: Outcome,
    /// Only stable gateway error codes are accepted; upstream text is forbidden.
    pub error_code: Option<String>,
    pub tokens: Tokens,
}
impl Completion {
    fn validate(&self) -> AppResult<()> {
        if !identifier(&self.request_id) || self.ordinal.is_some_and(|n| n == 0 || n > 16) {
            return Err(invalid());
        }
        if self.ordinal.is_none() && self.tokens != Tokens::default() {
            return Err(invalid());
        }
        time(self.finished_ms)?;
        for token in [self.tokens.input, self.tokens.output]
            .into_iter()
            .flatten()
        {
            time(token)?;
        }
        if self.error_code.as_deref().is_some_and(|code| {
            !matches!(
                code,
                "UPSTREAM_AUTH_FAILED"
                    | "UPSTREAM_CONNECT_TIMEOUT"
                    | "UPSTREAM_RESPONSE_TIMEOUT"
                    | "UPSTREAM_IDLE_TIMEOUT"
                    | "UPSTREAM_RATE_LIMITED"
                    | "UPSTREAM_MODEL_UNAVAILABLE"
                    | "UPSTREAM_PROTOCOL_ERROR"
                    | "UPSTREAM_CONNECTION_FAILED"
                    | "UPSTREAM_TRANSPORT_ERROR"
                    | "UPSTREAM_STREAM_INTERRUPTED"
                    | "UPSTREAM_ERROR"
                    | "RESPONSE_LIMIT_EXCEEDED"
                    | "REQUEST_BUDGET_EXCEEDED"
                    | "ACCESS_REVOKED"
                    | "SECURITY_STATE_UNCONFIRMED"
                    | "GATEWAY_STOPPING"
                    | "CLIENT_CANCELLED"
                    | "PROCESS_INTERRUPTED"
                    | "TEAM_INTERMEDIATE_EMPTY"
                    | "TEAM_INTERMEDIATE_INCOMPLETE"
                    | "TEAM_INTERMEDIATE_UNSUPPORTED"
                    | "USAGE_STORAGE_UNAVAILABLE"
                    | "USAGE_START_UNCONFIRMED"
                    | "UPSTREAM_REDIRECT_REJECTED"
                    | "UPSTREAM_REQUEST_REJECTED"
                    | "TEAM_DEPENDENCY_UNAVAILABLE"
                    | "TEAM_INTERMEDIATE_LIMIT"
                    | "TEAM_INTERMEDIATE_FILTERED"
                    | "TEAM_INTERMEDIATE_REFUSED"
                    | "TEAM_INTERMEDIATE_TRUNCATED"
                    | "TEAM_INTERMEDIATE_UNHANDLED_CALL"
            )
        }) {
            return Err(invalid());
        }
        if self.outcome == Outcome::Succeeded && self.error_code.is_some() {
            return Err(invalid());
        }
        Ok(())
    }
}
#[derive(Debug, Clone, Serialize)]
pub struct LedgerState {
    pub degraded: bool,
    pub pending_results: usize,
    pub detail_start_ms: u64,
}

pub struct UsageStore {
    db: Connection,
    directory: PathBuf,
    _lock: File,
    degraded: bool,
    pending: VecDeque<Completion>,
}
struct StoredAttempt {
    provider: String,
    model: String,
    started: u64,
    outcome: String,
    finished: Option<u64>,
    error: Option<String>,
    tokens: Tokens,
}
fn validate_schema(db: &Connection) -> AppResult<()> {
    validate_schema_version(db, 2)
}
fn validate_schema_version(db: &Connection, expected: u32) -> AppResult<()> {
    let owner: u32 = db
        .pragma_query_value(None, "application_id", |r| r.get(0))
        .map_err(storage)?;
    let version: u32 = db
        .pragma_query_value(None, "user_version", |r| r.get(0))
        .map_err(storage)?;
    if owner != OWNER || version != expected || !matches!(expected, 1 | 2) {
        return Err(storage("unknown usage identity"));
    }
    let mut objects = db
        .prepare("SELECT name FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY name")
        .map_err(storage)?;
    let names = objects
        .query_map([], |r| r.get::<_, String>(0))
        .map_err(storage)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(storage)?;
    drop(objects);
    if names
        != [
            "usage_attempts",
            "usage_daily",
            "usage_meta",
            "usage_request_time",
            "usage_requests",
        ]
    {
        return Err(storage("unknown usage objects"));
    }
    // Validate every expected column before changing journal mode on an
    // existing file. Matching application_id alone does not establish shape.
    for sql in [
        "SELECT singleton,detail_start_ms FROM usage_meta LIMIT 0",
        "SELECT id,provider_id,model,config_revision,team_revision,started_ms,finished_ms,outcome,error_code,input_tokens,output_tokens FROM usage_requests LIMIT 0",
        "SELECT request_id,ordinal,provider_id,model,started_ms,finished_ms,outcome,error_code,input_tokens,output_tokens FROM usage_attempts LIMIT 0",
        "SELECT day,kind,provider_id,model,config_revision,team_revision,outcome,count,input_known,input_unknown,output_known,output_unknown,elapsed_ms FROM usage_daily LIMIT 0",
    ] {
        db.prepare(sql).map_err(storage)?;
    }
    if expected == 2 {
        db.prepare("SELECT change_revision,generation,last_clear_json FROM usage_meta LIMIT 0")
            .map_err(storage)?;
        db.query_row(
            "SELECT change_revision,generation FROM usage_meta WHERE singleton=1",
            [],
            |row| Ok((unsigned(row, 0)?, unsigned(row, 1)?)),
        )
        .map_err(storage)?;
    }
    Ok(())
}
impl UsageStore {
    /// The directory must already be owned/created by the configuration service.
    pub fn open(directory: &Path, now_ms: u64) -> AppResult<Self> {
        regular(directory, true)?;
        time(now_ms)?;
        let lock_path = directory.join("usage.lock");
        if lock_path.exists() {
            regular(&lock_path, false)?;
        }
        let lock = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(&lock_path)
            .map_err(storage)?;
        lock.try_lock_exclusive().map_err(storage)?;
        let target = directory.join("usage.sqlite3");
        if !target.exists() && migration::pending(directory)? {
            return Err(storage("migration without usage database"));
        }
        let intent = directory.join("usage-initialization.json");
        const MARKER: &[u8] =
            b"{\"owner\":\"com.tagmaai.desktop/usage/v1\",\"target\":\"usage.sqlite3\"}";
        if intent.exists() {
            regular(&intent, false)?;
            if fs::metadata(&intent).map_err(storage)?.len() != MARKER.len() as u64 || {
                use std::io::Read;
                let mut bytes = Vec::new();
                File::open(&intent)
                    .map_err(storage)?
                    .take(MARKER.len() as u64 + 1)
                    .read_to_end(&mut bytes)
                    .map_err(storage)?;
                bytes
            } != MARKER
            {
                return Err(storage("unknown intent"));
            }
        } else if !target.exists() {
            let staging = directory.join(format!(".usage-intent-{}.tmp", uuid::Uuid::new_v4()));
            let mut file = OpenOptions::new()
                .create_new(true)
                .write(true)
                .open(&staging)
                .map_err(storage)?;
            use std::io::Write;
            file.write_all(MARKER).map_err(storage)?;
            file.sync_all().map_err(storage)?;
            drop(file);
            crate::initialization::publish_new(&staging, &intent).map_err(storage)?;
        }
        for suffix in ["", "-wal", "-shm", "-journal"] {
            let file = directory.join(format!("usage.sqlite3{suffix}"));
            if file.exists() {
                regular(&file, false)?;
            }
        }
        let fresh = intent.exists();
        if !fresh {
            let readonly = Connection::open_with_flags(&target, OpenFlags::SQLITE_OPEN_READ_ONLY)
                .map_err(storage)?;
            readonly
                .busy_timeout(Duration::from_millis(100))
                .map_err(storage)?;
            let version: u32 = readonly
                .pragma_query_value(None, "user_version", |row| row.get(0))
                .map_err(storage)?;
            validate_schema_version(&readonly, version)?;
        }
        let mut flags = OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_NO_MUTEX;
        if fresh {
            flags |= OpenFlags::SQLITE_OPEN_CREATE;
        }
        let mut db = Connection::open_with_flags(&target, flags).map_err(storage)?;
        #[cfg(test)]
        crash_hook("opened");
        db.busy_timeout(Duration::from_millis(100))
            .map_err(storage)?;
        let owner: u32 = db
            .pragma_query_value(None, "application_id", |row| row.get(0))
            .map_err(storage)?;
        let version: u32 = db
            .pragma_query_value(None, "user_version", |row| row.get(0))
            .map_err(storage)?;
        let objects: u32 = db
            .query_row(
                "SELECT count(*) FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%'",
                [],
                |row| row.get(0),
            )
            .map_err(storage)?;
        if fresh && owner == 0 && version == 0 && objects == 0 {
            let tx = db
                .transaction_with_behavior(TransactionBehavior::Immediate)
                .map_err(storage)?;
            tx.execute_batch(SCHEMA).map_err(storage)?;
            tx.execute_batch(UPGRADE_V2).map_err(storage)?;
            tx.pragma_update(None, "application_id", OWNER)
                .map_err(storage)?;
            tx.pragma_update(None, "user_version", 2).map_err(storage)?;
            tx.commit().map_err(storage)?;
            #[cfg(test)]
            crash_hook("initialized");
        } else if owner != OWNER || !matches!(version, 1 | 2) || objects != 5 {
            return Err(storage("unknown usage database"));
        } else if version == 1 || migration::pending(directory)? {
            migration::prepare(directory, &mut db)?;
        }
        validate_schema(&db)?;
        if fresh {
            fs::remove_file(&intent).map_err(storage)?;
        }
        db.execute_batch("PRAGMA foreign_keys=ON;PRAGMA journal_mode=WAL;PRAGMA synchronous=FULL;PRAGMA wal_autocheckpoint=64;PRAGMA journal_size_limit=2097152;PRAGMA cache_size=-2048;").map_err(storage)?;
        let page_size: u64 = db
            .pragma_query_value(None, "page_size", |r| unsigned(r, 0))
            .map_err(storage)?;
        let pages = db
            .pragma_query_value(None, "page_count", |r| unsigned(r, 0))
            .map_err(storage)?;
        if pages > MAX_BYTES / page_size {
            return Err(storage("usage DB size limit"));
        }
        db.pragma_update(None, "max_page_count", time(MAX_BYTES / page_size)?)
            .map_err(storage)?;
        let mut store = Self {
            db,
            directory: directory.to_owned(),
            _lock: lock,
            degraded: false,
            pending: VecDeque::new(),
        };
        store.recover(now_ms)?;
        store.prune(now_ms, false)?;
        Ok(store)
    }
    pub fn state(&self) -> AppResult<LedgerState> {
        let detail_start_ms = self
            .db
            .query_row(
                "SELECT detail_start_ms FROM usage_meta WHERE singleton=1",
                [],
                |row| unsigned(row, 0),
            )
            .map_err(storage)?;
        Ok(LedgerState {
            degraded: self.degraded,
            pending_results: self.pending.len(),
            detail_start_ms,
        })
    }
    pub fn pending_results(&self) -> usize {
        self.pending.len()
    }
    /// Business retention on the existing sole writer. Never retries failed
    /// completions or clears degradation; recovery remains an explicit command.
    pub fn maintain(&mut self, now_ms: u64) -> AppResult<()> {
        self.admit(now_ms)
    }
    fn admit(&mut self, now_ms: u64) -> AppResult<()> {
        if self.degraded {
            return Err(storage("usage degraded"));
        }
        let wal = self.directory.join("usage.sqlite3-wal");
        let wal_bytes = match fs::metadata(wal) {
            Ok(meta) => meta.len(),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => 0,
            Err(error) => {
                self.degraded = true;
                return Err(storage(error));
            }
        };
        if wal_bytes > MAX_WAL_BYTES {
            self.degraded = true;
            return Err(storage("usage WAL bound"));
        }
        let result = self.prune(now_ms, true);
        if result.is_err() {
            self.degraded = true;
        }
        result
    }
    pub fn begin_request(&mut self, start: &RequestStart) -> AppResult<()> {
        if !identifier(&start.id)
            || !identifier(&start.provider_id)
            || !model(&start.model)
            || start.team_revision == Some(0)
        {
            return Err(invalid());
        }
        let at = time(start.started_ms)?;
        self.admit(start.started_ms)?;
        let result = (|| {
            let tx = self
                .db
                .transaction_with_behavior(TransactionBehavior::Immediate)
                .map_err(storage)?;
            let active: u32 = tx
                .query_row(
                    "SELECT count(*) FROM usage_requests WHERE outcome='running'",
                    [],
                    |r| r.get(0),
                )
                .map_err(storage)?;
            if active as usize >= DEFAULT_HTTP_CONCURRENCY {
                return Err(AppError::new(ErrorCode::ProbeBusy));
            }
            tx.execute("INSERT INTO usage_requests(id,provider_id,model,config_revision,team_revision,started_ms,outcome) VALUES(?1,?2,?3,?4,?5,?6,'running')",params![start.id,start.provider_id,start.model,start.config_revision,start.team_revision,at]).map_err(storage)?;
            bump(&tx)?;
            tx.commit().map_err(storage)
        })();
        if result
            .as_ref()
            .is_err_and(|error| error.code == ErrorCode::StorageUnavailable)
        {
            self.degraded = true;
        }
        result
    }
    pub fn begin_attempt(&mut self, start: &AttemptStart) -> AppResult<()> {
        if !identifier(&start.request_id)
            || !identifier(&start.provider_id)
            || !model(&start.model)
            || start.ordinal == 0
            || start.ordinal > 16
        {
            return Err(invalid());
        }
        let at = time(start.started_ms)?;
        self.admit(start.started_ms)?;
        let result = (|| {
            let tx = self
                .db
                .transaction_with_behavior(TransactionBehavior::Immediate)
                .map_err(storage)?;
            let request: Option<(String, u64)> = tx
                .query_row(
                    "SELECT outcome,started_ms FROM usage_requests WHERE id=?1",
                    [&start.request_id],
                    |r| Ok((r.get(0)?, unsigned(r, 1)?)),
                )
                .optional()
                .map_err(storage)?;
            if !request
                .is_some_and(|(state, started)| state == "running" && start.started_ms >= started)
            {
                return Err(invalid());
            }
            let (last,active,finished):(u32,u32,u64)=tx.query_row("SELECT COALESCE(MAX(ordinal),0),COALESCE(SUM(outcome='running'),0),COALESCE(MAX(finished_ms),0) FROM usage_attempts WHERE request_id=?1",[&start.request_id],|r|Ok((r.get(0)?,r.get(1)?,unsigned(r,2)?))).map_err(storage)?;
            if active != 0 || start.ordinal != last + 1 || start.started_ms < finished {
                return Err(invalid());
            }
            tx.execute("INSERT INTO usage_attempts(request_id,ordinal,provider_id,model,started_ms,outcome) VALUES(?1,?2,?3,?4,?5,'running')",params![start.request_id,start.ordinal,start.provider_id,start.model,at]).map_err(storage)?;
            bump(&tx)?;
            tx.commit().map_err(storage)
        })();
        if result
            .as_ref()
            .is_err_and(|error| error.code == ErrorCode::StorageUnavailable)
        {
            self.degraded = true;
        }
        result
    }
    pub fn finish(&mut self, completion: Completion) -> AppResult<()> {
        completion.validate()?;
        if self.pending.iter().any(|item| {
            item.request_id == completion.request_id && item.ordinal == completion.ordinal
        }) {
            return Err(invalid());
        }
        if !self.pending.is_empty() {
            let exists: bool = if let Some(n) = completion.ordinal {
                self.db.query_row("SELECT EXISTS(SELECT 1 FROM usage_attempts WHERE request_id=?1 AND ordinal=?2 AND outcome='running')",params![completion.request_id,n],|r|r.get(0)).map_err(storage)?
            } else {
                self.db.query_row("SELECT EXISTS(SELECT 1 FROM usage_requests WHERE id=?1 AND outcome='running')",[&completion.request_id],|r|r.get(0)).map_err(storage)?
            };
            if !exists {
                return Err(invalid());
            }
            if self.pending.len() < MAX_PENDING {
                self.pending.push_back(completion);
            }
            return Err(storage("pending results"));
        }
        match self.apply(&completion) {
            Ok(()) => Ok(()),
            Err(error) if error.code == ErrorCode::StorageUnavailable => {
                self.degraded = true;
                if self.pending.len() < MAX_PENDING {
                    self.pending.push_back(completion);
                }
                Err(error)
            }
            Err(error) => Err(error),
        }
    }
    pub fn retry_pending(&mut self) -> AppResult<()> {
        while let Some(next) = self.pending.front() {
            let next = next.clone();
            self.apply(&next)?;
            self.pending.pop_front();
        }
        // A successful checkpoint is also required before clearing degradation.
        let busy: i64 = self
            .db
            .query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |r| r.get(0))
            .map_err(storage)?;
        if busy != 0 {
            return Err(storage("checkpoint busy"));
        }
        // Do not confirm recovery when the metadata view itself is unreadable.
        self.state()?;
        self.degraded = false;
        Ok(())
    }
    fn apply(&mut self, end: &Completion) -> AppResult<()> {
        let tx = self
            .db
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(storage)?;
        let request:Option<(String,String,u32,Option<u32>,u64)>=tx.query_row("SELECT provider_id,model,config_revision,team_revision,started_ms FROM usage_requests WHERE id=?1",[&end.request_id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,unsigned(r,4)?))).optional().map_err(storage)?;
        let Some((mut provider, mut target, revision, team_revision, mut started)) = request else {
            return Err(invalid());
        };
        let (kind, current, finished, error, input, output) = if let Some(ordinal) = end.ordinal {
            let row:Option<StoredAttempt>=tx.query_row("SELECT provider_id,model,started_ms,outcome,finished_ms,error_code,input_tokens,output_tokens FROM usage_attempts WHERE request_id=?1 AND ordinal=?2",params![end.request_id,ordinal],|r|Ok(StoredAttempt{provider:r.get(0)?,model:r.get(1)?,started:unsigned(r,2)?,outcome:r.get(3)?,finished:optional_unsigned(r,4)?,error:r.get(5)?,tokens:Tokens{input:optional_unsigned(r,6)?,output:optional_unsigned(r,7)?}})).optional().map_err(storage)?;
            let Some(row) = row else {
                return Err(invalid());
            };
            provider = row.provider;
            target = row.model;
            started = row.started;
            (
                "attempt",
                row.outcome,
                row.finished,
                row.error,
                row.tokens.input,
                row.tokens.output,
            )
        } else {
            let active: u32 = tx
                .query_row(
                    "SELECT count(*) FROM usage_attempts WHERE request_id=?1 AND outcome='running'",
                    [&end.request_id],
                    |r| r.get(0),
                )
                .map_err(storage)?;
            if active != 0 {
                return Err(invalid());
            }
            let last = tx
                .query_row(
                    "SELECT COALESCE(MAX(finished_ms),0) FROM usage_attempts WHERE request_id=?1",
                    [&end.request_id],
                    |r| unsigned(r, 0),
                )
                .map_err(storage)?;
            if end.finished_ms < last {
                return Err(invalid());
            }
            let row:(String,Option<u64>,Option<String>,Option<u64>,Option<u64>)=tx.query_row("SELECT outcome,finished_ms,error_code,input_tokens,output_tokens FROM usage_requests WHERE id=?1",[&end.request_id],|r|Ok((r.get(0)?,optional_unsigned(r,1)?,r.get(2)?,optional_unsigned(r,3)?,optional_unsigned(r,4)?))).map_err(storage)?;
            ("request", row.0, row.1, row.2, row.3, row.4)
        };
        if end.finished_ms < started {
            return Err(invalid());
        }
        let tokens = if end.ordinal.is_none() {
            // Logical token totals cover all attempts, never only the final model.
            tx.query_row("SELECT CASE WHEN count(*)>0 AND count(input_tokens)=count(*) THEN sum(input_tokens) END,CASE WHEN count(*)>0 AND count(output_tokens)=count(*) THEN sum(output_tokens) END FROM usage_attempts WHERE request_id=?1",[&end.request_id],|r|Ok(Tokens{input:optional_unsigned(r,0)?,output:optional_unsigned(r,1)?})).map_err(storage)?
        } else {
            end.tokens
        };
        if current != "running" {
            return if current == end.outcome.as_str()
                && finished == Some(end.finished_ms)
                && error == end.error_code
                && input == tokens.input
                && output == tokens.output
            {
                Ok(())
            } else {
                Err(invalid())
            };
        }
        let sql = if end.ordinal.is_some() {
            "UPDATE usage_attempts SET finished_ms=?1,outcome=?2,error_code=?3,input_tokens=?4,output_tokens=?5 WHERE request_id=?6 AND ordinal=?7"
        } else {
            "UPDATE usage_requests SET finished_ms=?1,outcome=?2,error_code=?3,input_tokens=?4,output_tokens=?5 WHERE id=?6 AND ?7 IS NULL"
        };
        tx.execute(
            sql,
            params![
                time(end.finished_ms)?,
                end.outcome.as_str(),
                end.error_code,
                tokens.input.map(time).transpose()?,
                tokens.output.map(time).transpose()?,
                end.request_id,
                end.ordinal
            ],
        )
        .map_err(storage)?;
        tx.execute("INSERT INTO usage_daily VALUES(?1,?2,?3,?4,?5,?6,?7,1,?8,?9,?10,?11,?12) ON CONFLICT(day,kind,provider_id,model,config_revision,team_revision,outcome) DO UPDATE SET count=count+1,input_known=input_known+excluded.input_known,input_unknown=input_unknown+excluded.input_unknown,output_known=output_known+excluded.output_known,output_unknown=output_unknown+excluded.output_unknown,elapsed_ms=elapsed_ms+excluded.elapsed_ms",params![time(started/DAY)?,kind,provider,target,revision,team_revision.unwrap_or(0),end.outcome.as_str(),time(tokens.input.unwrap_or(0))?,u32::from(tokens.input.is_none()),time(tokens.output.unwrap_or(0))?,u32::from(tokens.output.is_none()),time(end.finished_ms-started)?]).map_err(storage)?;
        bump(&tx)?;
        tx.commit().map_err(storage)
    }
    fn recover(&mut self, now: u64) -> AppResult<()> {
        // Admission bounds active requests and one running attempt per request. Recovery
        // records unknown results rather than fabricating successful zero usage.
        let mut query=self.db.prepare("SELECT request_id,ordinal,started_ms FROM usage_attempts WHERE outcome='running' LIMIT ?1").map_err(storage)?;
        let attempts = query
            .query_map([(DEFAULT_HTTP_CONCURRENCY + 1) as i64], |r| {
                Ok((r.get::<_, String>(0)?, r.get::<_, u32>(1)?, unsigned(r, 2)?))
            })
            .map_err(storage)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(storage)?;
        drop(query);
        if attempts.len() > DEFAULT_HTTP_CONCURRENCY {
            return Err(storage("active attempts bound"));
        }
        for (id, n, started) in attempts {
            self.apply(&Completion {
                request_id: id,
                ordinal: Some(n),
                finished_ms: now.max(started),
                outcome: Outcome::Interrupted,
                error_code: Some("PROCESS_INTERRUPTED".into()),
                tokens: Tokens::default(),
            })?;
        }
        let mut query = self
            .db
            .prepare("SELECT id,started_ms FROM usage_requests WHERE outcome='running' LIMIT ?1")
            .map_err(storage)?;
        let requests = query
            .query_map([(DEFAULT_HTTP_CONCURRENCY + 1) as i64], |r| Ok((r.get::<_, String>(0)?, unsigned(r, 1)?)))
            .map_err(storage)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(storage)?;
        drop(query);
        if requests.len() > DEFAULT_HTTP_CONCURRENCY {
            return Err(storage("active requests bound"));
        }
        for (id, started) in requests {
            self.apply(&Completion {
                request_id: id,
                ordinal: None,
                finished_ms: now.max(started),
                outcome: Outcome::Interrupted,
                error_code: Some("PROCESS_INTERRUPTED".into()),
                tokens: Tokens::default(),
            })?;
        }
        Ok(())
    }
    fn prune(&mut self, now: u64, capacity: bool) -> AppResult<()> {
        let tx = self
            .db
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(storage)?;
        let cutoff = now.saturating_sub(30 * DAY);
        let mut changes = tx
            .execute(
                "DELETE FROM usage_requests WHERE finished_ms IS NOT NULL AND started_ms<?1",
                [time(cutoff)?],
            )
            .map_err(storage)?;
        // Twelve calendar months of UTC daily summaries, rather than 365 days.
        changes += tx.execute("DELETE FROM usage_daily WHERE day<CAST(strftime('%s',?1/1000,'unixepoch','-12 months') AS INTEGER)/86400",[time(now)?]).map_err(storage)?;
        if capacity {
            let pages: u64 = tx
                .pragma_query_value(None, "page_count", |r| unsigned(r, 0))
                .map_err(storage)?;
            let free: u64 = tx
                .pragma_query_value(None, "freelist_count", |r| unsigned(r, 0))
                .map_err(storage)?;
            let max: u64 = tx
                .pragma_query_value(None, "max_page_count", |r| unsigned(r, 0))
                .map_err(storage)?;
            if max.saturating_sub(pages) + free < 16 {
                // Finished records already have durable daily summaries. Bound
                // each cleanup pass; if insufficient, a later insert fails shut.
                changes += tx.execute("DELETE FROM usage_requests WHERE id IN(SELECT id FROM usage_requests WHERE finished_ms IS NOT NULL ORDER BY started_ms LIMIT 128)",[]).map_err(storage)?;
            }
        }
        let floor: u64 = tx
            .query_row(
                "SELECT COALESCE(MIN(started_ms),?1) FROM usage_requests",
                [time(cutoff)?],
                |row| unsigned(row, 0),
            )
            .map_err(storage)?;
        changes += tx
            .execute(
                "UPDATE usage_meta SET detail_start_ms=?1 WHERE singleton=1 AND detail_start_ms<?1",
                [time(floor)?],
            )
            .map_err(storage)?;
        if changes > 0 {
            bump(&tx)?;
        }
        tx.commit().map_err(storage)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn request(at: u64) -> RequestStart {
        RequestStart {
            id: uuid::Uuid::new_v4().to_string(),
            provider_id: uuid::Uuid::new_v4().to_string(),
            model: "tagma/usage-fixture@2".into(),
            config_revision: 7,
            team_revision: Some(2),
            started_ms: at,
        }
    }
    fn attempt(start: &RequestStart, n: u32) -> AttemptStart {
        AttemptStart {
            request_id: start.id.clone(),
            ordinal: n,
            provider_id: start.provider_id.clone(),
            model: format!("synthetic-{n}"),
            started_ms: start.started_ms + n as u64 * 100,
        }
    }
    fn end(start: &RequestStart, n: Option<u32>, tokens: Tokens) -> Completion {
        Completion {
            request_id: start.id.clone(),
            ordinal: n,
            finished_ms: start.started_ms + n.map_or(2000, |n| n as u64 * 100 + 50),
            outcome: Outcome::Succeeded,
            error_code: None,
            tokens,
        }
    }
    #[test]
    fn logical_requests_and_attempts_keep_unknown_tokens_and_aggregate_once() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-usage-")
            .tempdir()
            .unwrap();
        let mut store = UsageStore::open(temp.path(), DAY).unwrap();
        let req = request(DAY);
        store.begin_request(&req).unwrap();
        store.begin_attempt(&attempt(&req, 1)).unwrap();
        let first = end(
            &req,
            Some(1),
            Tokens {
                input: Some(5),
                output: Some(7),
            },
        );
        store.finish(first.clone()).unwrap();
        store.finish(first).unwrap();
        store.begin_attempt(&attempt(&req, 2)).unwrap();
        store
            .finish(end(
                &req,
                Some(2),
                Tokens {
                    input: None,
                    output: Some(3),
                },
            ))
            .unwrap();
        let logical = end(&req, None, Tokens::default());
        store.finish(logical.clone()).unwrap();
        store.finish(logical).unwrap();
        let totals:(i64,i64)=store.db.query_row("SELECT (SELECT sum(count) FROM usage_daily WHERE kind='request'),(SELECT sum(count) FROM usage_daily WHERE kind='attempt')",[],|r|Ok((r.get(0)?,r.get(1)?))).unwrap();
        assert_eq!(totals, (1, 2));
        let tokens: (Option<i64>, Option<i64>) = store
            .db
            .query_row(
                "SELECT input_tokens,output_tokens FROM usage_requests",
                [],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert_eq!(tokens, (None, Some(10)));
        let daily:(i64,i64,i64)=store.db.query_row("SELECT input_known,input_unknown,output_known FROM usage_daily WHERE kind='request'",[],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).unwrap();
        assert_eq!(daily, (0, 1, 10));
        assert!(!temp.path().join("config.sqlite3").exists());
        println!(
            "Usage ledger: logical=1, attempts=2, input=NULL/unknown1, output=10, duplicate completion counts unchanged; separate DB"
        );
    }
    #[test]
    fn actual_sqlite_full_at_start_refuses_registration_and_degrades() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-usage-")
            .tempdir()
            .unwrap();
        let mut store = UsageStore::open(temp.path(), DAY).unwrap();
        store.db.execute_batch("CREATE TABLE owned_fixture_padding(bytes BLOB);CREATE TRIGGER owned_full_start BEFORE INSERT ON usage_requests BEGIN INSERT INTO owned_fixture_padding VALUES(zeroblob(131072)); END;").unwrap();
        let pages: i64 = store
            .db
            .pragma_query_value(None, "page_count", |r| r.get(0))
            .unwrap();
        store
            .db
            .pragma_update(None, "max_page_count", pages + 2)
            .unwrap();
        let error = store
            .db
            .execute(
                "INSERT INTO owned_fixture_padding VALUES(zeroblob(131072))",
                [],
            )
            .unwrap_err();
        assert_eq!(
            error.sqlite_error_code(),
            Some(rusqlite::ErrorCode::DiskFull)
        );
        assert_eq!(
            store.begin_request(&request(DAY)).unwrap_err().code,
            ErrorCode::StorageUnavailable
        );
        assert!(store.state().unwrap().degraded);
        let count: i64 = store
            .db
            .query_row("SELECT count(*) FROM usage_requests", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0);
        assert!(store.begin_request(&request(DAY)).is_err());
        println!(
            "Usage real SQLITE_FULL: no committed start record, admission degraded; test data below1MiB, no actual disk exhaustion"
        );
    }
    #[test]
    fn failed_results_are_bounded_retryable_and_never_allow_new_registration() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-usage-")
            .tempdir()
            .unwrap();
        let mut store = UsageStore::open(temp.path(), DAY).unwrap();
        let mut requests = Vec::new();
        for _ in 0..DEFAULT_HTTP_CONCURRENCY {
            let req = request(DAY);
            store.begin_request(&req).unwrap();
            store.begin_attempt(&attempt(&req, 1)).unwrap();
            requests.push(req);
        }
        assert_eq!(
            store.begin_request(&request(DAY)).unwrap_err().code,
            ErrorCode::ProbeBusy
        );
        store.db.execute_batch("CREATE TRIGGER owned_fail_result BEFORE UPDATE ON usage_attempts BEGIN SELECT RAISE(ABORT,'owned fixture write failure'); END;").unwrap();
        for req in &requests {
            assert!(store.finish(end(req, Some(1), Tokens::default())).is_err());
            assert!(store.finish(end(req, None, Tokens::default())).is_err());
        }
        assert_eq!(store.state().unwrap().pending_results, MAX_PENDING);
        assert!(store.state().unwrap().degraded);
        for req in &requests {
            assert_eq!(
                store
                    .finish(end(req, Some(1), Tokens::default()))
                    .unwrap_err()
                    .code,
                ErrorCode::InvalidInput
            );
        }
        assert_eq!(store.state().unwrap().pending_results, MAX_PENDING);
        assert!(store.begin_request(&request(DAY)).is_err());
        assert!(store.retry_pending().is_err());
        store
            .db
            .execute_batch("DROP TRIGGER owned_fail_result")
            .unwrap();
        store.retry_pending().unwrap();
        assert!(!store.state().unwrap().degraded);
        assert_eq!(store.state().unwrap().pending_results, 0);
        let counts:(i64,i64)=store.db.query_row("SELECT (SELECT sum(count) FROM usage_daily WHERE kind='request'),(SELECT sum(count) FROM usage_daily WHERE kind='attempt')",[],|r|Ok((r.get(0)?,r.get(1)?))).unwrap();
        assert_eq!(counts, (DEFAULT_HTTP_CONCURRENCY as i64, DEFAULT_HTTP_CONCURRENCY as i64));
        store.retry_pending().unwrap();
        let count: i64 = store
            .db
            .query_row("SELECT sum(count) FROM usage_daily", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, MAX_PENDING as i64);
        println!(
            "Usage failed finishes: {} requests/attempts ->{} bounded pending results, new begins refused, explicit recovery exactly once", DEFAULT_HTTP_CONCURRENCY, MAX_PENDING
        );
    }
    #[test]
    fn full_admission_capacity_recovers_unfinished_results_without_inventing_usage() {
        let temp = tempfile::tempdir().unwrap();
        let mut store = UsageStore::open(temp.path(), DAY).unwrap();
        for _ in 0..DEFAULT_HTTP_CONCURRENCY {
            let req = request(DAY);
            store.begin_request(&req).unwrap();
            store.begin_attempt(&attempt(&req, 1)).unwrap();
        }
        drop(store);
        let recovered = UsageStore::open(temp.path(), DAY + 1000).unwrap();
        for table in ["usage_requests", "usage_attempts"] {
            let count: i64 = recovered.db.query_row(&format!("SELECT count(*) FROM {table} WHERE outcome='interrupted' AND error_code='PROCESS_INTERRUPTED' AND input_tokens IS NULL AND output_tokens IS NULL"), [], |row| row.get(0)).unwrap();
            assert_eq!(count, DEFAULT_HTTP_CONCURRENCY as i64);
        }
        let running: i64 = recovered.db.query_row("SELECT count(*) FROM usage_requests WHERE outcome='running'", [], |row| row.get(0)).unwrap();
        assert_eq!(running, 0);
        drop(recovered);
        let repeated = UsageStore::open(temp.path(), DAY + 2000).unwrap();
        let total: i64 = repeated.db.query_row("SELECT sum(count) FROM usage_daily", [], |row| row.get(0)).unwrap();
        assert_eq!(total, (DEFAULT_HTTP_CONCURRENCY * 2) as i64);
    }
    #[test]
    fn retention_keeps_summaries_and_preserves_unknown_unowned_databases() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-usage-")
            .tempdir()
            .unwrap();
        let mut store = UsageStore::open(temp.path(), DAY).unwrap();
        let req = request(DAY);
        store.begin_request(&req).unwrap();
        store.begin_attempt(&attempt(&req, 1)).unwrap();
        store.finish(end(&req, Some(1), Tokens::default())).unwrap();
        store.finish(end(&req, None, Tokens::default())).unwrap();
        drop(store);
        let store = UsageStore::open(temp.path(), 32 * DAY).unwrap();
        let details: i64 = store
            .db
            .query_row("SELECT count(*) FROM usage_requests", [], |r| r.get(0))
            .unwrap();
        assert_eq!(details, 0);
        let daily: i64 = store
            .db
            .query_row("SELECT sum(count) FROM usage_daily", [], |r| r.get(0))
            .unwrap();
        assert_eq!(daily, 2);
        assert_eq!(store.state().unwrap().detail_start_ms, 2 * DAY);
        drop(store);
        let store = UsageStore::open(temp.path(), 400 * DAY).unwrap();
        let daily: i64 = store
            .db
            .query_row("SELECT count(*) FROM usage_daily", [], |r| r.get(0))
            .unwrap();
        assert_eq!(daily, 0);
        drop(store);
        let unknown = tempfile::tempdir().unwrap();
        let file = unknown.path().join("usage.sqlite3");
        fs::write(&file, b"unknown data preserve exactly").unwrap();
        assert!(UsageStore::open(unknown.path(), DAY).is_err());
        assert_eq!(fs::read(file).unwrap(), b"unknown data preserve exactly");
        let impostor = tempfile::tempdir().unwrap();
        let path = impostor.path().join("usage.sqlite3");
        let db = Connection::open(&path).unwrap();
        db.pragma_update(None, "application_id", OWNER).unwrap();
        db.pragma_update(None, "user_version", 1).unwrap();
        db.execute_batch(
            "CREATE TABLE unrelated(value TEXT);INSERT INTO unrelated VALUES('preserve');",
        )
        .unwrap();
        drop(db);
        let before = fs::read(&path).unwrap();
        assert!(UsageStore::open(impostor.path(), DAY).is_err());
        assert_eq!(fs::read(path).unwrap(), before);
        println!(
            "Usage retention:30day details prune only after durable daily aggregate;12calendar months summary retention;unknown database bytes preserved"
        );
    }
    #[test]
    fn admission_identity_timing_and_metadata_privacy_are_checked() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-usage-")
            .tempdir()
            .unwrap();
        let mut store = UsageStore::open(temp.path(), DAY).unwrap();
        let req = request(DAY);
        store.begin_request(&req).unwrap();
        assert!(
            UsageStore::open(temp.path(), DAY).is_err(),
            "one writer only"
        );
        assert!(store.begin_attempt(&attempt(&req, 2)).is_err());
        store.begin_attempt(&attempt(&req, 1)).unwrap();
        assert!(store.begin_attempt(&attempt(&req, 2)).is_err());
        assert!(store.finish(end(&req, None, Tokens::default())).is_err());
        let mut bad = end(&req, Some(1), Tokens::default());
        bad.outcome = Outcome::Failed;
        bad.error_code = Some("synthetic upstream body must not persist".into());
        assert_eq!(store.finish(bad).unwrap_err().code, ErrorCode::InvalidInput);
        assert_eq!(store.state().unwrap().pending_results, 0);
        store.finish(end(&req, Some(1), Tokens::default())).unwrap();
        let mut earlier = attempt(&req, 2);
        earlier.started_ms = req.started_ms + 101;
        assert!(store.begin_attempt(&earlier).is_err());
        let mut bad = end(&req, None, Tokens::default());
        bad.finished_ms = req.started_ms + 100;
        assert!(store.finish(bad).is_err());
        store.finish(end(&req, None, Tokens::default())).unwrap();
        assert!(
            !store.state().unwrap().degraded,
            "validation errors do not impersonate storage failures"
        );
        let needle = b"synthetic upstream body must not persist";
        for suffix in ["", "-wal"] {
            if let Ok(bytes) = fs::read(temp.path().join(format!("usage.sqlite3{suffix}"))) {
                assert!(!bytes.windows(needle.len()).any(|window| window == needle));
            }
        }
        println!(
            "Usage bounds:one writer,8active maximum,sequential ordinals and timestamps;arbitrary error text rejected before queue/write"
        );
    }
    #[test]
    fn real_process_exit_recovers_owned_initialization_and_unfinished_attempts() {
        for phase in ["opened", "initialized", "registered"] {
            let temp = tempfile::Builder::new()
                .prefix("tagma-usage-")
                .tempdir()
                .unwrap();
            let status = std::process::Command::new(std::env::current_exe().unwrap())
                .args(["--ignored", "--exact", "usage::tests::usage_crash_worker"])
                .env("TAGMA_TEST_USAGE_CRASH", phase)
                .env("TAGMA_TEST_USAGE_DIRECTORY", temp.path())
                .status()
                .unwrap();
            assert_eq!(status.code(), Some(90));
            let store = UsageStore::open(temp.path(), 2 * DAY).unwrap();
            assert!(!temp.path().join("usage-initialization.json").exists());
            if phase == "registered" {
                for table in ["usage_requests", "usage_attempts"] {
                    let row: (String, Option<i64>, Option<i64>) = store
                        .db
                        .query_row(
                            &format!("SELECT outcome,input_tokens,output_tokens FROM {table}"),
                            [],
                            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
                        )
                        .unwrap();
                    assert_eq!(row, ("interrupted".into(), None, None));
                }
                let counts: i64 = store
                    .db
                    .query_row(
                        "SELECT sum(count) FROM usage_daily WHERE outcome='interrupted'",
                        [],
                        |r| r.get(0),
                    )
                    .unwrap();
                assert_eq!(counts, 2);
            }
        }
        println!(
            "Usage exit90: pre-DDL and committed-DDL intent recovery;registered request+attempt become interrupted with NULL tokens after real child process death"
        );
    }
    #[test]
    #[ignore = "child-process crash worker, invoked only by the owned recovery test"]
    fn usage_crash_worker() {
        let directory = PathBuf::from(std::env::var_os("TAGMA_TEST_USAGE_DIRECTORY").unwrap());
        let mut store = UsageStore::open(&directory, DAY).unwrap();
        let req = request(DAY);
        store.begin_request(&req).unwrap();
        store.begin_attempt(&attempt(&req, 1)).unwrap();
        std::process::exit(90);
    }
}
