use crate::*;
use fs2::FileExt;
use serde::{Deserialize, Serialize};
use std::{
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};
use ts_rs::TS;

pub const MAX_LOG_BYTES: u64 = 20 * 1024 * 1024;
pub const MAX_LOG_FILES: usize = 5;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
pub enum Component {
    Desktop,
    Gateway,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
pub enum Event {
    Starting,
    Ready,
    Attached,
    StartFailed,
    ApplySucceeded,
    ApplyFailed,
    CrashDetected,
    RestartAttempt,
    RestartExhausted,
    StopRequested,
    Stopped,
    ConfigurationUnavailable,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct Record {
    pub unix_seconds: u32,
    pub component: Component,
    pub event: Event,
    pub code: Option<ErrorCode>,
    pub revision: Option<u32>,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct DiagnosticBundle {
    pub product_version: String,
    pub protocol_version: u32,
    pub platform: String,
    pub architecture: String,
    pub supported_schema_version: u32,
    pub config_schema_version: Option<u32>,
    pub desired_revision: Option<u32>,
    pub runtime: RuntimeStatus,
    pub console_attached: bool,
    pub sidecar_console_attached: Option<bool>,
    pub logging_available: bool,
    pub max_log_bytes: u32,
    pub max_log_files: u32,
    pub telemetry_enabled: bool,
    pub recent_events: Vec<Record>,
}

pub fn console_attached() -> bool {
    #[cfg(windows)]
    {
        !unsafe { windows_sys::Win32::System::Console::GetConsoleWindow() }.is_null()
    }
    #[cfg(not(windows))]
    {
        false
    }
}
fn error() -> AppError {
    AppError::new(ErrorCode::StorageUnavailable)
}
fn log_path(directory: &Path, index: usize) -> std::path::PathBuf {
    directory.join(format!("tagma.{index}.jsonl"))
}

pub fn record(
    directory: &Path,
    component: Component,
    event: Event,
    code: Option<ErrorCode>,
    revision: Option<u32>,
) -> AppResult<()> {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        .min(u32::MAX as u64) as u32;
    write(
        directory,
        &Record {
            unix_seconds: seconds,
            component,
            event,
            code,
            revision,
        },
        MAX_LOG_BYTES,
    )
}

fn write(directory: &Path, record: &Record, limit: u64) -> AppResult<()> {
    let logs = directory.join("logs");
    fs::create_dir_all(&logs).map_err(|_| error())?;
    if fs::symlink_metadata(&logs)
        .map_err(|_| error())?
        .file_type()
        .is_symlink()
    {
        return Err(error());
    }
    let lock = OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .open(logs.join("writer.lock"))
        .map_err(|_| error())?;
    lock.try_lock_exclusive().map_err(|_| error())?;
    let mut bytes = serde_json::to_vec(record).map_err(|_| error())?;
    bytes.push(b'\n');
    if bytes.len() as u64 > limit {
        return Err(error());
    }
    let path = log_path(&logs, 0);
    for index in 0..MAX_LOG_FILES {
        let candidate = log_path(&logs, index);
        if let Ok(metadata) = fs::symlink_metadata(&candidate)
            && (!metadata.is_file() || metadata.file_type().is_symlink())
        {
            return Err(error());
        }
    }
    let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
    if size + bytes.len() as u64 > limit {
        let oldest = log_path(&logs, MAX_LOG_FILES - 1);
        if oldest.exists() {
            fs::remove_file(oldest).map_err(|_| error())?;
        }
        for index in (0..MAX_LOG_FILES - 1).rev() {
            let source = log_path(&logs, index);
            if source.exists() {
                fs::rename(source, log_path(&logs, index + 1)).map_err(|_| error())?;
            }
        }
    }
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|_| error())?;
    file.write_all(&bytes).map_err(|_| error())?;
    Ok(())
}

/// Only typed whitelist records are exported. Corrupt/arbitrary lines are not copied.
pub fn recent(directory: &Path) -> AppResult<Vec<Record>> {
    let path = log_path(&directory.join("logs"), 0);
    if !path.exists() {
        return Ok(vec![]);
    }
    let mut file = File::open(path).map_err(|_| error())?;
    let length = file.metadata().map_err(|_| error())?.len();
    use std::io::{Seek, SeekFrom};
    let offset = length.saturating_sub(16 * 1024);
    file.seek(SeekFrom::Start(offset)).map_err(|_| error())?;
    let mut bytes = Vec::with_capacity(16 * 1024 + 1);
    file.take(16 * 1024 + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| error())?;
    let text = std::str::from_utf8(&bytes).map_err(|_| error())?;
    let mut result: Vec<Record> = text
        .lines()
        .skip(usize::from(offset > 0))
        .filter_map(|line| serde_json::from_str(line).ok())
        .collect();
    if result.len() > 64 {
        result.drain(0..result.len() - 64);
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn logs_rotate_within_five_files_and_never_export_unknown_fields() {
        let temp = tempfile::tempdir().unwrap();
        let record = Record {
            unix_seconds: 1,
            component: Component::Gateway,
            event: Event::ApplyFailed,
            code: Some(ErrorCode::ConfigApplyFailed),
            revision: Some(1),
        };
        for _ in 0..100 {
            write(temp.path(), &record, 512).unwrap();
        }
        let files: Vec<_> = fs::read_dir(temp.path().join("logs"))
            .unwrap()
            .filter_map(Result::ok)
            .filter(|e| e.path().extension().is_some_and(|x| x == "jsonl"))
            .collect();
        assert_eq!(files.len(), MAX_LOG_FILES);
        assert!(files.iter().all(|f| f.metadata().unwrap().len() <= 512));
        assert!(recent(temp.path()).unwrap().len() <= 64);
        OpenOptions::new()
            .append(true)
            .open(log_path(&temp.path().join("logs"), 0))
            .unwrap()
            .write_all(b"{\"credential\":\"synthetic-not-exportable\"}\n")
            .unwrap();
        let exported = serde_json::to_string(&recent(temp.path()).unwrap()).unwrap();
        assert!(!exported.contains("synthetic-not-exportable"));
    }
}
