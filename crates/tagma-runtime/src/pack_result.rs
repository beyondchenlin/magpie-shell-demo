//! Explicit user export to an existing work directory, outside installation/configuration.
use std::{
    io::Write,
    path::{Component, Path},
};

fn plain_directory(path: &Path) -> Result<std::path::PathBuf, &'static str> {
    if !path.is_absolute() || path.components().any(|p| matches!(p, Component::ParentDir)) {
        return Err("RESULT_DIRECTORY_INVALID");
    }
    for ancestor in path.ancestors() {
        let metadata =
            std::fs::symlink_metadata(ancestor).map_err(|_| "RESULT_DIRECTORY_INVALID")?;
        if !metadata.is_dir() || metadata.file_type().is_symlink() {
            return Err("RESULT_DIRECTORY_INVALID");
        }
        #[cfg(windows)]
        {
            use std::os::windows::fs::MetadataExt;
            if metadata.file_attributes() & 0x400 != 0 {
                return Err("RESULT_DIRECTORY_INVALID");
            }
        }
    }
    std::fs::canonicalize(path).map_err(|_| "RESULT_DIRECTORY_INVALID")
}

pub fn save(
    directory: &Path,
    raw: &str,
    protected: &[std::path::PathBuf],
) -> Result<String, &'static str> {
    if directory.as_os_str().len() > 4096 || raw.len() > 128 * 1024 {
        return Err("RESULT_LIMIT");
    }
    let directory = plain_directory(directory)?;
    for path in protected {
        let protected = std::fs::canonicalize(path).map_err(|_| "RESULT_DIRECTORY_INVALID")?;
        if directory.starts_with(protected) {
            return Err("RESULT_DIRECTORY_PROTECTED");
        }
    }
    let value: serde_json::Value = serde_json::from_str(raw).map_err(|_| "RESULT_INVALID")?;
    if !matches!(
        value["mode"].as_str(),
        Some("local_fixed_sample" | "reachflow_service" | "reachflow_report")
    ) {
        return Err("RESULT_INVALID");
    }
    let mut result = serde_json::Map::new();
    for key in [
        "mode",
        "network_used",
        "sources",
        "note",
        "task_id",
        "state",
        "location",
        "workspace_id",
        "report_id",
        "result_id",
        "document_preview",
        "preview_truncated",
        "candidate_count",
        "final_count",
        "failed_count",
        "cancellation_requested",
    ] {
        if let Some(value) = value.get(key) {
            result.insert(key.into(), value.clone());
        }
    }
    let document = serde_json::json!({"format":"tagma.pack-result.v1","saved_ms":tagma_core::health::now_ms().map_err(|_|"RESULT_SAVE_FAILED")?,"scope":"received_result_only_not_full_remote_report","result":result});
    let bytes = serde_json::to_vec_pretty(&document).map_err(|_| "RESULT_INVALID")?;
    let mut temporary = tempfile::Builder::new()
        .prefix(".tagma-result-")
        .tempfile_in(&directory)
        .map_err(|_| "RESULT_SAVE_FAILED")?;
    temporary
        .write_all(&bytes)
        .map_err(|_| "RESULT_SAVE_FAILED")?;
    temporary
        .as_file()
        .sync_all()
        .map_err(|_| "RESULT_SAVE_FAILED")?;
    let target = directory.join(format!("tagma-result-{}.json", uuid::Uuid::new_v4()));
    temporary
        .persist_noclobber(&target)
        .map_err(|_| "RESULT_SAVE_FAILED")?;
    Ok(target.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn explicit_result_export_is_durable_separate_and_never_overwrites() {
        let temp = tempfile::tempdir().unwrap();
        let config = temp.path().join("config");
        let work = temp.path().join("work");
        std::fs::create_dir(&config).unwrap();
        std::fs::create_dir(&work).unwrap();
        let raw = r#"{"mode":"local_fixed_sample","sources":[{"id":"one","title":"<script>not executable</script>"}],"access_token":"must-not-export"}"#;
        assert_eq!(
            save(&config, raw, std::slice::from_ref(&config)).unwrap_err(),
            "RESULT_DIRECTORY_PROTECTED"
        );
        assert!(save(Path::new("relative"), raw, &[]).is_err());
        assert!(save(&work, "{}", &[]).is_err());
        let first = save(&work, raw, std::slice::from_ref(&config)).unwrap();
        let bytes = std::fs::read(&first).unwrap();
        let second = save(&work, raw, std::slice::from_ref(&config)).unwrap();
        assert_ne!(first, second);
        assert_eq!(std::fs::read(&first).unwrap(), bytes);
        assert!(
            !String::from_utf8(bytes)
                .unwrap()
                .contains("must-not-export")
        );
        assert_eq!(
            std::fs::read_dir(&work).unwrap().count(),
            2,
            "no staging file retained"
        );
    }
}
