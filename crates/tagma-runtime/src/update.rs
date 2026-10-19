//! Candidate package inspection, without Tauri, credentials or gateway startup.
use std::{io::Read, path::Path};
use tagma_core::*;

pub fn check_configuration(directory: &Path) -> AppResult<()> {
    tagma_core::update::check_configuration(directory)?;
    let file = match std::fs::File::open(directory.join("runtime.json")) {
        Ok(file) => file,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(_) => return Err(AppError::new(ErrorCode::StorageUnavailable)),
    };
    let mut bytes = Vec::new();
    file.take(65537)
        .read_to_end(&mut bytes)
        .map_err(|_| AppError::new(ErrorCode::StorageUnavailable))?;
    if bytes.len() > 65536 {
        return Err(AppError::new(ErrorCode::IncompatibleVersion));
    }
    let manifest: crate::ipc::Manifest = serde_json::from_slice(&bytes)
        .map_err(|_| AppError::new(ErrorCode::IncompatibleVersion))?;
    if manifest.protocol_version != PROTOCOL_VERSION
        || !(1..=SCHEMA_VERSION).contains(&manifest.schema_version)
    {
        return Err(AppError::new(ErrorCode::IncompatibleVersion));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn update_protocol_check_preserves_records_and_rejects_newer_protocol() {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("runtime.json");
        let mut manifest = crate::ipc::Manifest {
            protocol_version: PROTOCOL_VERSION,
            schema_version: SCHEMA_VERSION,
            product_version: PRODUCT_VERSION.into(),
            config_id: uuid::Uuid::new_v4().to_string(),
            instance_id: uuid::Uuid::new_v4().to_string(),
            endpoint: "unused".into(),
            port: 9168,
            console_attached: false,
        };
        std::fs::write(&path, serde_json::to_vec(&manifest).unwrap()).unwrap();
        check_configuration(root.path()).unwrap();
        manifest.protocol_version += 1;
        let before = serde_json::to_vec(&manifest).unwrap();
        std::fs::write(&path, &before).unwrap();
        assert_eq!(
            check_configuration(root.path()).unwrap_err().code,
            ErrorCode::IncompatibleVersion
        );
        assert_eq!(std::fs::read(&path).unwrap(), before);
    }
}
