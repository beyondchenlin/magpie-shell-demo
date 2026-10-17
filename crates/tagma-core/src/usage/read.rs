//! Bounded read-only views; never initializes, migrates, writes or calls providers.
use super::*;
use rusqlite::{Row, named_params};
use std::sync::{
    Arc, Mutex,
    atomic::{AtomicBool, Ordering},
};
use ts_rs::TS;
const JS_MAX: f64 = 9_007_199_254_740_991.0;
const PAGE: u32 = 32;
const OUTPUT: usize = 48 * 1024;
fn unavailable<T>(_: T) -> AppError {
    AppError::new(ErrorCode::UsageQueryUnavailable)
}
fn cancelled() -> AppError {
    AppError::new(ErrorCode::UsageQueryCancelled)
}
fn millis(value: f64) -> AppResult<i64> {
    if !value.is_finite() || value.fract() != 0.0 || !(0.0..=JS_MAX).contains(&value) {
        Err(invalid())
    } else {
        Ok(value as i64)
    }
}
fn timestamp(row: &Row<'_>, index: usize) -> rusqlite::Result<f64> {
    let value = unsigned(row, index)?;
    if value as f64 > JS_MAX {
        return Err(rusqlite::Error::IntegralValueOutOfRange(
            index,
            value as i64,
        ));
    }
    Ok(value as f64)
}
fn decimal(row: &Row<'_>, index: usize) -> rusqlite::Result<Option<String>> {
    optional_unsigned(row, index).map(|n| n.map(|n| n.to_string()))
}
fn invalid_row() -> rusqlite::Error {
    rusqlite::Error::InvalidQuery
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct UsageRange {
    pub start_ms: f64,
    pub end_ms: f64,
}
impl UsageRange {
    pub(super) fn validate(&self, days: bool) -> AppResult<(i64, i64)> {
        let start = millis(self.start_ms)?;
        let end = millis(self.end_ms)?;
        if end <= start
            || end - start > 366 * DAY as i64
            || (days && (start % DAY as i64 != 0 || end % DAY as i64 != 0))
        {
            return Err(invalid());
        }
        Ok((start, end))
    }
}
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
pub enum UsageRecordState {
    Running,
    Succeeded,
    Failed,
    Cancelled,
    Interrupted,
}
impl UsageRecordState {
    fn value(self) -> &'static str {
        match self {
            Self::Running => "running",
            Self::Succeeded => "succeeded",
            Self::Failed => "failed",
            Self::Cancelled => "cancelled",
            Self::Interrupted => "interrupted",
        }
    }
    fn read(row: &Row<'_>, index: usize) -> rusqlite::Result<Self> {
        match row.get::<_, String>(index)?.as_str() {
            "running" => Ok(Self::Running),
            "succeeded" => Ok(Self::Succeeded),
            "failed" => Ok(Self::Failed),
            "cancelled" => Ok(Self::Cancelled),
            "interrupted" => Ok(Self::Interrupted),
            _ => Err(invalid_row()),
        }
    }
}
#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct UsageFilter {
    pub provider_id: Option<String>,
    pub model: Option<String>,
    pub config_revision: Option<u32>,
    pub team_revision: Option<u32>,
    pub state: Option<UsageRecordState>,
    pub error_code: Option<String>,
}
impl UsageFilter {
    fn validate(&self) -> AppResult<()> {
        if self
            .provider_id
            .as_deref()
            .is_some_and(|id| !identifier(id))
            || self.model.as_deref().is_some_and(|id| !model(id))
            || self.team_revision == Some(0)
            || self.error_code.as_ref().is_some_and(|code| {
                code.is_empty()
                    || code.len() > 64
                    || !code
                        .bytes()
                        .all(|b| b.is_ascii_uppercase() || b.is_ascii_digit() || b == b'_')
            })
        {
            return Err(invalid());
        }
        Ok(())
    }
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct UsageCursor {
    pub context_id: String,
    pub generation: String,
    pub started_ms: f64,
    pub request_id: String,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct UsageRequestsQuery {
    pub protocol_version: u32,
    pub range: UsageRange,
    pub filter: UsageFilter,
    pub cursor: Option<UsageCursor>,
    pub limit: u32,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct UsageDetailsQuery {
    pub protocol_version: u32,
    pub request_id: String,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
pub enum UsageMetricKind {
    Request,
    Attempt,
}
impl UsageMetricKind {
    fn value(self) -> &'static str {
        match self {
            Self::Request => "request",
            Self::Attempt => "attempt",
        }
    }
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct UsageSummaryCursor {
    pub context_id: String,
    pub generation: String,
    pub day_ms: f64,
    pub provider_id: String,
    pub model: String,
    pub config_revision: u32,
    pub team_revision: u32,
    pub state: UsageRecordState,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct UsageSummaryQuery {
    pub protocol_version: u32,
    pub range: UsageRange,
    pub filter: UsageFilter,
    pub kind: UsageMetricKind,
    pub cursor: Option<UsageSummaryCursor>,
    pub limit: u32,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
pub enum UsageAvailability {
    NotCreated,
    Available,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UsageReadInfo {
    pub context_id: String,
    pub generation: Option<String>,
    pub availability: UsageAvailability,
    pub observed_ms: f64,
    pub detail_start_ms: Option<f64>,
    /// Earliest currently retained UTC daily bucket, not an activity guarantee.
    pub summary_start_ms: Option<f64>,
    pub timezone: String,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UsageRequestView {
    pub request_id: String,
    pub provider_id: String,
    pub model: String,
    pub config_revision: u32,
    pub team_revision: Option<u32>,
    pub started_ms: f64,
    pub finished_ms: Option<f64>,
    pub state: UsageRecordState,
    pub error_code: Option<String>,
    pub input_tokens: Option<String>,
    pub output_tokens: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UsageAttemptView {
    pub ordinal: u32,
    pub provider_id: String,
    pub model: String,
    pub started_ms: f64,
    pub finished_ms: Option<f64>,
    pub state: UsageRecordState,
    pub error_code: Option<String>,
    pub input_tokens: Option<String>,
    pub output_tokens: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UsageRequestsView {
    pub info: UsageReadInfo,
    pub records: Vec<UsageRequestView>,
    pub next_cursor: Option<UsageCursor>,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UsageDetailsView {
    pub info: UsageReadInfo,
    pub record: Option<UsageRequestView>,
    pub attempts: Vec<UsageAttemptView>,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UsageSummaryRow {
    pub day_ms: f64,
    pub provider_id: String,
    pub model: String,
    pub config_revision: u32,
    pub team_revision: Option<u32>,
    pub state: UsageRecordState,
    pub count: String,
    pub input_known: String,
    pub input_unknown: String,
    pub output_known: String,
    pub output_unknown: String,
    pub elapsed_ms: String,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UsageSummaryTotals {
    pub total: String,
    pub completed: String,
    pub unfinished: String,
    pub succeeded: String,
    pub failed: String,
    pub cancelled: String,
    pub interrupted: String,
    pub input_known: String,
    pub input_unknown: String,
    pub output_known: String,
    pub output_unknown: String,
    pub input_total: Option<String>,
    pub output_total: Option<String>,
    pub elapsed_ms: String,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UsageSummaryView {
    pub info: UsageReadInfo,
    pub kind: UsageMetricKind,
    pub records: Vec<UsageSummaryRow>,
    pub totals: Option<UsageSummaryTotals>,
    pub next_cursor: Option<UsageSummaryCursor>,
}

#[derive(Default)]
pub struct UsageReadCancellation {
    cancelled: AtomicBool,
    handle: Mutex<Option<Arc<rusqlite::InterruptHandle>>>,
}
impl UsageReadCancellation {
    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
        if let Ok(handle) = self.handle.lock()
            && let Some(handle) = handle.as_ref()
        {
            handle.interrupt();
        }
    }
    pub fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::SeqCst)
    }
    fn check(&self) -> AppResult<()> {
        if self.is_cancelled() {
            Err(cancelled())
        } else {
            Ok(())
        }
    }
    fn bind(&self, db: &Connection) -> AppResult<()> {
        *self.handle.lock().map_err(unavailable)? = Some(Arc::new(db.get_interrupt_handle()));
        self.check()
    }
}
fn open(directory: &Path, cancel: &UsageReadCancellation) -> AppResult<Option<Connection>> {
    cancel.check()?;
    regular(directory, true).map_err(unavailable)?;
    if present(&directory.join("usage-initialization.json"))?
        || super::migration::pending(directory).map_err(unavailable)?
    {
        return Err(unavailable("initialization pending"));
    }
    let path = directory.join("usage.sqlite3");
    if !present(&path)? {
        return Ok(None);
    }
    for suffix in ["", "-wal", "-shm", "-journal"] {
        let path = directory.join(format!("usage.sqlite3{suffix}"));
        if present(&path)? {
            regular(&path, false).map_err(unavailable)?;
        }
    }
    let db = Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .map_err(unavailable)?;
    cancel.bind(&db)?;
    db.busy_timeout(Duration::from_millis(100))
        .map_err(unavailable)?;
    db.execute_batch("PRAGMA query_only=ON;PRAGMA cache_size=-512;PRAGMA temp_store=MEMORY;")
        .map_err(unavailable)?;
    validate_schema(&db).map_err(unavailable)?;
    cancel.check()?;
    Ok(Some(db))
}
fn present(path: &Path) -> AppResult<bool> {
    match fs::symlink_metadata(path) {
        Ok(_) => Ok(true),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(error) => Err(unavailable(error)),
    }
}
fn read_info(db: Option<&Connection>, directory: &Path) -> AppResult<UsageReadInfo> {
    let detail = if let Some(db) = db {
        Some(
            db.query_row(
                "SELECT detail_start_ms FROM usage_meta WHERE singleton=1",
                [],
                |r| timestamp(r, 0),
            )
            .map_err(unavailable)?,
        )
    } else {
        None
    };
    let summary_start_ms = if let Some(db) = db {
        let day = db
            .query_row("SELECT MIN(day) FROM usage_daily", [], |r| {
                optional_unsigned(r, 0)
            })
            .map_err(unavailable)?;
        day.map(|day| {
            let at = day
                .checked_mul(DAY)
                .ok_or_else(|| unavailable("summary time overflow"))?;
            if at as f64 > JS_MAX {
                return Err(unavailable("summary time precision"));
            }
            Ok(at as f64)
        })
        .transpose()?
    } else {
        None
    };
    Ok(UsageReadInfo {
        context_id: context_id(directory).map_err(unavailable)?,
        generation: db
            .map(|db| {
                db.query_row(
                    "SELECT generation FROM usage_meta WHERE singleton=1",
                    [],
                    |row| unsigned(row, 0),
                )
                .map(|n| n.to_string())
                .map_err(unavailable)
            })
            .transpose()?,
        availability: if db.is_some() {
            UsageAvailability::Available
        } else {
            UsageAvailability::NotCreated
        },
        observed_ms: crate::health::now_ms().map_err(unavailable)? as f64,
        detail_start_ms: detail,
        summary_start_ms,
        timezone: "UTC".into(),
    })
}
fn bounded<T: Serialize>(value: T, cancel: &UsageReadCancellation) -> AppResult<T> {
    cancel.check()?;
    if serde_json::to_vec(&value).map_err(unavailable)?.len() > OUTPUT {
        return Err(unavailable("response bound"));
    }
    Ok(value)
}
fn validate_result(
    state: UsageRecordState,
    start: f64,
    finish: Option<f64>,
    error: Option<&str>,
    input: Option<&str>,
    output: Option<&str>,
) -> rusqlite::Result<()> {
    if finish.is_some_and(|end| end < start)
        || (state == UsageRecordState::Running) != (finish.is_none())
        || error.is_some_and(|code| {
            code.is_empty()
                || code.len() > 64
                || !code
                    .bytes()
                    .all(|b| b.is_ascii_uppercase() || b.is_ascii_digit() || b == b'_')
        })
        || (state == UsageRecordState::Running && (input.is_some() || output.is_some()))
        || (state == UsageRecordState::Succeeded && error.is_some())
    {
        return Err(invalid_row());
    }
    Ok(())
}
fn request_row(row: &Row<'_>) -> rusqlite::Result<UsageRequestView> {
    let record = UsageRequestView {
        request_id: row.get(0)?,
        provider_id: row.get(1)?,
        model: row.get(2)?,
        config_revision: row.get(3)?,
        team_revision: row.get(4)?,
        started_ms: timestamp(row, 5)?,
        finished_ms: if row.get::<_, Option<i64>>(6)?.is_some() {
            Some(timestamp(row, 6)?)
        } else {
            None
        },
        state: UsageRecordState::read(row, 7)?,
        error_code: row.get(8)?,
        input_tokens: decimal(row, 9)?,
        output_tokens: decimal(row, 10)?,
    };
    if !identifier(&record.request_id)
        || !identifier(&record.provider_id)
        || !model(&record.model)
        || record.team_revision == Some(0)
    {
        return Err(invalid_row());
    }
    validate_result(
        record.state,
        record.started_ms,
        record.finished_ms,
        record.error_code.as_deref(),
        record.input_tokens.as_deref(),
        record.output_tokens.as_deref(),
    )?;
    Ok(record)
}
fn attempt_row(row: &Row<'_>) -> rusqlite::Result<UsageAttemptView> {
    let record = UsageAttemptView {
        ordinal: row.get(0)?,
        provider_id: row.get(1)?,
        model: row.get(2)?,
        started_ms: timestamp(row, 3)?,
        finished_ms: if row.get::<_, Option<i64>>(4)?.is_some() {
            Some(timestamp(row, 4)?)
        } else {
            None
        },
        state: UsageRecordState::read(row, 5)?,
        error_code: row.get(6)?,
        input_tokens: decimal(row, 7)?,
        output_tokens: decimal(row, 8)?,
    };
    if !(1..=16).contains(&record.ordinal)
        || !identifier(&record.provider_id)
        || !model(&record.model)
    {
        return Err(invalid_row());
    }
    validate_result(
        record.state,
        record.started_ms,
        record.finished_ms,
        record.error_code.as_deref(),
        record.input_tokens.as_deref(),
        record.output_tokens.as_deref(),
    )?;
    Ok(record)
}
fn checked<T>(cancel: &UsageReadCancellation, work: impl FnOnce() -> AppResult<T>) -> AppResult<T> {
    cancel.check()?;
    let result = work();
    cancel.check()?;
    result
}
pub fn requests(
    directory: &Path,
    input: UsageRequestsQuery,
    cancel: &UsageReadCancellation,
) -> AppResult<UsageRequestsView> {
    checked(cancel, || requests_inner(directory, input, cancel))
}
pub fn metadata(directory: &Path, cancel: &UsageReadCancellation) -> AppResult<UsageReadInfo> {
    checked(cancel, || {
        let Some(mut db) = open(directory, cancel)? else {
            return bounded(read_info(None, directory)?, cancel);
        };
        let tx = db.transaction().map_err(unavailable)?;
        bounded(read_info(Some(&tx), directory)?, cancel)
    })
}
pub fn details(
    directory: &Path,
    input: UsageDetailsQuery,
    cancel: &UsageReadCancellation,
) -> AppResult<UsageDetailsView> {
    checked(cancel, || details_inner(directory, input, cancel))
}
pub fn summary(
    directory: &Path,
    input: UsageSummaryQuery,
    cancel: &UsageReadCancellation,
) -> AppResult<UsageSummaryView> {
    checked(cancel, || summary_inner(directory, input, cancel))
}

fn requests_inner(
    directory: &Path,
    input: UsageRequestsQuery,
    cancel: &UsageReadCancellation,
) -> AppResult<UsageRequestsView> {
    check_protocol(input.protocol_version)?;
    input.filter.validate()?;
    let (start, end) = input.range.validate(false)?;
    if !(1..=PAGE).contains(&input.limit) {
        return Err(invalid());
    }
    let cursor = if let Some(cursor) = &input.cursor {
        let at = millis(cursor.started_ms)?;
        if !identifier(&cursor.request_id) || at < start || at >= end {
            return Err(invalid());
        }
        Some(at)
    } else {
        None
    };
    let Some(mut db) = open(directory, cancel)? else {
        if input.cursor.is_some() {
            return Err(AppError::new(ErrorCode::UsageClearChanged));
        }
        return bounded(
            UsageRequestsView {
                info: read_info(None, directory)?,
                records: Vec::new(),
                next_cursor: None,
            },
            cancel,
        );
    };
    let tx = db.transaction().map_err(unavailable)?;
    let read_info = read_info(Some(&tx), directory)?;
    if input.cursor.as_ref().is_some_and(|cursor| {
        cursor.context_id != read_info.context_id
            || Some(cursor.generation.as_str()) != read_info.generation.as_deref()
    }) {
        return Err(AppError::new(ErrorCode::UsageClearChanged));
    }
    let mut query=tx.prepare("SELECT id,provider_id,model,config_revision,team_revision,started_ms,finished_ms,outcome,error_code,input_tokens,output_tokens FROM usage_requests WHERE started_ms>=:start AND started_ms<:end AND (:provider IS NULL OR provider_id=:provider) AND (:model IS NULL OR model=:model) AND (:revision IS NULL OR config_revision=:revision) AND (:team IS NULL OR team_revision=:team) AND (:state IS NULL OR outcome=:state) AND (:error IS NULL OR error_code=:error) AND (:cursor IS NULL OR started_ms<:cursor OR (started_ms=:cursor AND id<:id)) ORDER BY started_ms DESC,id DESC LIMIT :limit").map_err(unavailable)?;
    let rows=query.query_map(named_params!{":start":start,":end":end,":provider":input.filter.provider_id.as_deref(),":model":input.filter.model.as_deref(),":revision":input.filter.config_revision,":team":input.filter.team_revision,":state":input.filter.state.map(UsageRecordState::value),":error":input.filter.error_code.as_deref(),":cursor":cursor,":id":input.cursor.as_ref().map(|c|c.request_id.as_str()),":limit":input.limit+1},request_row).map_err(unavailable)?;
    let mut records = Vec::new();
    for row in rows {
        cancel.check()?;
        records.push(row.map_err(unavailable)?);
    }
    let more = records.len() > input.limit as usize;
    records.truncate(input.limit as usize);
    let next_cursor = if more {
        records.last().map(|r| UsageCursor {
            context_id: read_info.context_id.clone(),
            generation: read_info.generation.clone().unwrap_or_default(),
            started_ms: r.started_ms,
            request_id: r.request_id.clone(),
        })
    } else {
        None
    };
    bounded(
        UsageRequestsView {
            info: read_info,
            records,
            next_cursor,
        },
        cancel,
    )
}
fn details_inner(
    directory: &Path,
    input: UsageDetailsQuery,
    cancel: &UsageReadCancellation,
) -> AppResult<UsageDetailsView> {
    check_protocol(input.protocol_version)?;
    if !identifier(&input.request_id) {
        return Err(invalid());
    }
    let Some(mut db) = open(directory, cancel)? else {
        return bounded(
            UsageDetailsView {
                info: read_info(None, directory)?,
                record: None,
                attempts: Vec::new(),
            },
            cancel,
        );
    };
    let tx = db.transaction().map_err(unavailable)?;
    let read_info = read_info(Some(&tx), directory)?;
    let record=tx.query_row("SELECT id,provider_id,model,config_revision,team_revision,started_ms,finished_ms,outcome,error_code,input_tokens,output_tokens FROM usage_requests WHERE id=?1",[&input.request_id],request_row).optional().map_err(unavailable)?;
    let mut attempts = Vec::new();
    if record.is_some() {
        let mut query=tx.prepare("SELECT ordinal,provider_id,model,started_ms,finished_ms,outcome,error_code,input_tokens,output_tokens FROM usage_attempts WHERE request_id=?1 ORDER BY ordinal LIMIT 17").map_err(unavailable)?;
        let rows = query
            .query_map([&input.request_id], attempt_row)
            .map_err(unavailable)?;
        for row in rows {
            cancel.check()?;
            attempts.push(row.map_err(unavailable)?);
        }
        if attempts.len() > 16 {
            return Err(unavailable("attempt bound"));
        }
    }
    bounded(
        UsageDetailsView {
            info: read_info,
            record,
            attempts,
        },
        cancel,
    )
}

fn summary_row(row: &Row<'_>) -> rusqlite::Result<UsageSummaryRow> {
    let count = unsigned(row, 6)?;
    let input_unknown = unsigned(row, 8)?;
    let output_unknown = unsigned(row, 10)?;
    if count == 0 || input_unknown > count || output_unknown > count {
        return Err(invalid_row());
    }
    let day = unsigned(row, 0)?.checked_mul(DAY).ok_or_else(invalid_row)?;
    if day as f64 > JS_MAX {
        return Err(invalid_row());
    }
    let record = UsageSummaryRow {
        day_ms: day as f64,
        provider_id: row.get(1)?,
        model: row.get(2)?,
        config_revision: row.get(3)?,
        team_revision: match row.get::<_, u32>(4)? {
            0 => None,
            n => Some(n),
        },
        state: UsageRecordState::read(row, 5)?,
        count: count.to_string(),
        input_known: unsigned(row, 7)?.to_string(),
        input_unknown: input_unknown.to_string(),
        output_known: unsigned(row, 9)?.to_string(),
        output_unknown: output_unknown.to_string(),
        elapsed_ms: unsigned(row, 11)?.to_string(),
    };
    if !identifier(&record.provider_id)
        || !model(&record.model)
        || record.state == UsageRecordState::Running
    {
        return Err(invalid_row());
    }
    Ok(record)
}
fn summary_inner(
    directory: &Path,
    input: UsageSummaryQuery,
    cancel: &UsageReadCancellation,
) -> AppResult<UsageSummaryView> {
    check_protocol(input.protocol_version)?;
    input.filter.validate()?;
    let (start, end) = input.range.validate(true)?;
    if !(1..=PAGE).contains(&input.limit) || input.filter.error_code.is_some() {
        return Err(invalid());
    }
    let cursor = if let Some(cursor) = &input.cursor {
        let at = millis(cursor.day_ms)?;
        if at < start
            || at >= end
            || at % DAY as i64 != 0
            || !identifier(&cursor.provider_id)
            || !model(&cursor.model)
            || cursor.state == UsageRecordState::Running
        {
            return Err(invalid());
        }
        Some(at / DAY as i64)
    } else {
        None
    };
    let Some(mut db) = open(directory, cancel)? else {
        if input.cursor.is_some() {
            return Err(AppError::new(ErrorCode::UsageClearChanged));
        }
        return bounded(
            UsageSummaryView {
                info: read_info(None, directory)?,
                kind: input.kind,
                records: Vec::new(),
                totals: None,
                next_cursor: None,
            },
            cancel,
        );
    };
    let tx = db.transaction().map_err(unavailable)?;
    let read_info = read_info(Some(&tx), directory)?;
    if input.cursor.as_ref().is_some_and(|cursor| {
        cursor.context_id != read_info.context_id
            || Some(cursor.generation.as_str()) != read_info.generation.as_deref()
    }) {
        return Err(AppError::new(ErrorCode::UsageClearChanged));
    }
    let mut query=tx.prepare("SELECT day,provider_id,model,config_revision,team_revision,outcome,count,input_known,input_unknown,output_known,output_unknown,elapsed_ms FROM usage_daily WHERE day>=:start AND day<:end AND kind=:kind AND (:provider IS NULL OR provider_id=:provider) AND (:model IS NULL OR model=:model) AND (:revision IS NULL OR config_revision=:revision) AND (:team IS NULL OR team_revision=:team) AND (:state IS NULL OR outcome=:state) AND (:cursor IS NULL OR (day,provider_id,model,config_revision,team_revision,outcome)<(:cursor,:cp,:cm,:cr,:ct,:cs)) ORDER BY day DESC,provider_id DESC,model DESC,config_revision DESC,team_revision DESC,outcome DESC LIMIT :limit").map_err(unavailable)?;
    let rows=query.query_map(named_params!{":start":start/DAY as i64,":end":end/DAY as i64,":kind":input.kind.value(),":provider":input.filter.provider_id.as_deref(),":model":input.filter.model.as_deref(),":revision":input.filter.config_revision,":team":input.filter.team_revision,":state":input.filter.state.map(UsageRecordState::value),":cursor":cursor,":cp":input.cursor.as_ref().map(|c|c.provider_id.as_str()),":cm":input.cursor.as_ref().map(|c|c.model.as_str()),":cr":input.cursor.as_ref().map(|c|c.config_revision),":ct":input.cursor.as_ref().map(|c|c.team_revision),":cs":input.cursor.as_ref().map(|c|c.state.value()),":limit":input.limit+1},summary_row).map_err(unavailable)?;
    let mut records = Vec::new();
    for row in rows {
        cancel.check()?;
        records.push(row.map_err(unavailable)?);
    }
    let more = records.len() > input.limit as usize;
    records.truncate(input.limit as usize);
    let next_cursor = if more {
        records.last().map(|r| UsageSummaryCursor {
            context_id: read_info.context_id.clone(),
            generation: read_info.generation.clone().unwrap_or_default(),
            day_ms: r.day_ms,
            provider_id: r.provider_id.clone(),
            model: r.model.clone(),
            config_revision: r.config_revision,
            team_revision: r.team_revision.unwrap_or(0),
            state: r.state,
        })
    } else {
        None
    };
    drop(query);
    let totals = totals(&tx, &input, start, end, cancel)?;
    bounded(
        UsageSummaryView {
            info: read_info,
            kind: input.kind,
            records,
            totals: Some(totals),
            next_cursor,
        },
        cancel,
    )
}
fn totals(
    db: &Connection,
    input: &UsageSummaryQuery,
    start: i64,
    end: i64,
    cancel: &UsageReadCancellation,
) -> AppResult<UsageSummaryTotals> {
    let mut counts = [0u128; 5];
    let mut tokens = [0u128; 4];
    let mut elapsed = 0u128;
    let mut query=db.prepare("SELECT outcome,count,input_known,input_unknown,output_known,output_unknown,elapsed_ms FROM usage_daily WHERE day>=:start AND day<:end AND kind=:kind AND (:provider IS NULL OR provider_id=:provider) AND (:model IS NULL OR model=:model) AND (:revision IS NULL OR config_revision=:revision) AND (:team IS NULL OR team_revision=:team) AND (:state IS NULL OR outcome=:state)").map_err(unavailable)?;
    let mut rows=query.query(named_params!{":start":start/DAY as i64,":end":end/DAY as i64,":kind":input.kind.value(),":provider":input.filter.provider_id.as_deref(),":model":input.filter.model.as_deref(),":revision":input.filter.config_revision,":team":input.filter.team_revision,":state":input.filter.state.map(UsageRecordState::value)}).map_err(unavailable)?;
    while let Some(row) = rows.next().map_err(unavailable)? {
        cancel.check()?;
        let state = UsageRecordState::read(row, 0).map_err(unavailable)?;
        let index = match state {
            UsageRecordState::Succeeded => 1,
            UsageRecordState::Failed => 2,
            UsageRecordState::Cancelled => 3,
            UsageRecordState::Interrupted => 4,
            UsageRecordState::Running => return Err(unavailable("daily running")),
        };
        let count = unsigned(row, 1).map_err(unavailable)? as u128;
        if count == 0 {
            return Err(unavailable("invalid daily count"));
        }
        counts[index] = counts[index]
            .checked_add(count)
            .ok_or_else(|| unavailable("count overflow"))?;
        counts[0] = counts[0]
            .checked_add(count)
            .ok_or_else(|| unavailable("count overflow"))?;
        for (index, total) in tokens.iter_mut().enumerate() {
            let value = unsigned(row, index + 2).map_err(unavailable)? as u128;
            if (index == 1 || index == 3) && value > count {
                return Err(unavailable("invalid unknown count"));
            }
            *total = total
                .checked_add(value)
                .ok_or_else(|| unavailable("token overflow"))?;
        }
        elapsed = elapsed
            .checked_add(unsigned(row, 6).map_err(unavailable)? as u128)
            .ok_or_else(|| unavailable("elapsed overflow"))?;
    }
    let unfinished = if input
        .filter
        .state
        .is_none_or(|state| state == UsageRecordState::Running)
    {
        let sql = match input.kind {
            UsageMetricKind::Request => {
                "SELECT count(*) FROM usage_requests r WHERE r.outcome='running' AND r.started_ms>=:start AND r.started_ms<:end AND (:provider IS NULL OR r.provider_id=:provider) AND (:model IS NULL OR r.model=:model) AND (:revision IS NULL OR r.config_revision=:revision) AND (:team IS NULL OR r.team_revision=:team)"
            }
            UsageMetricKind::Attempt => {
                "SELECT count(*) FROM usage_attempts a JOIN usage_requests r ON a.request_id=r.id WHERE a.outcome='running' AND a.started_ms>=:start AND a.started_ms<:end AND (:provider IS NULL OR a.provider_id=:provider) AND (:model IS NULL OR a.model=:model) AND (:revision IS NULL OR r.config_revision=:revision) AND (:team IS NULL OR r.team_revision=:team)"
            }
        };
        db.query_row(sql,named_params!{":start":start,":end":end,":provider":input.filter.provider_id.as_deref(),":model":input.filter.model.as_deref(),":revision":input.filter.config_revision,":team":input.filter.team_revision},|r|unsigned(r,0)).map_err(unavailable)? as u128
    } else {
        0
    };
    tokens[1] = tokens[1]
        .checked_add(unfinished)
        .ok_or_else(|| unavailable("unknown count overflow"))?;
    tokens[3] = tokens[3]
        .checked_add(unfinished)
        .ok_or_else(|| unavailable("unknown count overflow"))?;
    let total = counts[0]
        .checked_add(unfinished)
        .ok_or_else(|| unavailable("total overflow"))?;
    Ok(UsageSummaryTotals {
        total: total.to_string(),
        completed: counts[0].to_string(),
        unfinished: unfinished.to_string(),
        succeeded: counts[1].to_string(),
        failed: counts[2].to_string(),
        cancelled: counts[3].to_string(),
        interrupted: counts[4].to_string(),
        input_known: tokens[0].to_string(),
        input_unknown: tokens[1].to_string(),
        output_known: tokens[2].to_string(),
        output_unknown: tokens[3].to_string(),
        input_total: if tokens[1] == 0 {
            Some(tokens[0].to_string())
        } else {
            None
        },
        output_total: if tokens[3] == 0 {
            Some(tokens[2].to_string())
        } else {
            None
        },
        elapsed_ms: elapsed.to_string(),
    })
}

#[cfg(test)]
mod interrupt_tests {
    use super::*;
    struct Worker {
        cancel: Arc<UsageReadCancellation>,
        thread: Option<std::thread::JoinHandle<()>>,
    }
    impl Drop for Worker {
        fn drop(&mut self) {
            self.cancel.cancel();
            if let Some(thread) = self.thread.take() {
                let _ = thread.join();
            }
        }
    }
    #[test]
    fn cancellation_interrupts_actual_sqlite_work_and_closes_its_connection() {
        let cancel = Arc::new(UsageReadCancellation::default());
        let (entered, ready) = std::sync::mpsc::channel();
        let (result, done) = std::sync::mpsc::channel();
        let thread = {
            let cancel = cancel.clone();
            std::thread::spawn(move || {
                let db = Connection::open_in_memory().unwrap();
                cancel.bind(&db).unwrap();
                let _ = entered.send(());
                let outcome=db.query_row("WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<100000000) SELECT count(*) FROM n",[],|r|r.get::<_,i64>(0));
                let _ = result.send(outcome);
            })
        };
        let mut worker = Worker {
            cancel: cancel.clone(),
            thread: Some(thread),
        };
        ready.recv_timeout(Duration::from_secs(1)).unwrap();
        let deadline = std::time::Instant::now() + Duration::from_secs(1);
        let result = loop {
            cancel.cancel();
            match done.recv_timeout(Duration::from_millis(1)) {
                Ok(result) => break result,
                Err(std::sync::mpsc::RecvTimeoutError::Timeout)
                    if std::time::Instant::now() < deadline => {}
                Err(error) => panic!("SQLite interrupt did not settle: {error}"),
            }
        };
        worker.thread.take().unwrap().join().unwrap();
        assert_eq!(
            result.unwrap_err().sqlite_error_code(),
            Some(rusqlite::ErrorCode::OperationInterrupted)
        );
        println!(
            "Usage reader cancellation:actual SQLite VM exits SQLITE_INTERRUPT;one owned memory connection/thread closes,constant-memory recursive stream"
        );
    }
}
