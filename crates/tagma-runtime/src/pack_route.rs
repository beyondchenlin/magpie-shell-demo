//! Gateway routing uses the same signed prepared executable as the desktop.
//! Service credentials are one-call input, never conversation text or stored recipes.
use crate::packs::{PackExecutor, PackOperation, PackReplyBody, PackRunError};
use std::{
    path::{Path, PathBuf},
    sync::Arc,
};
use tagma_core::packs::{InstalledPackVersion, PackTrustRoot, PackTrustStore};
use tokio_util::sync::CancellationToken;

pub const MODEL: &str = "tagma/reachflow";
/// Stable local executor identity for usage attribution; not a cloud provider.
pub const USAGE_ID: &str = "24eb3f13-893a-4fbd-972a-93ea2ac777b1";
#[derive(serde::Deserialize)]
struct Root {
    key_id: String,
    publisher: String,
    public_key: [u8; 32],
    valid_from_ms: u64,
    valid_until_ms: u64,
}
#[derive(serde::Deserialize)]
struct Internal {
    root: Root,
}
pub fn trust(directory: &Path) -> Result<Arc<PackTrustStore>, PackRunError> {
    let mut roots: Vec<Root> =
        serde_json::from_str(include_str!("../../../src-tauri/pack-roots.json"))
            .map_err(|_| PackRunError::Unavailable)?;
    if cfg!(debug_assertions)
        && std::env::var_os("TAGMA_TEST_CONFIG_DIR")
            .map(PathBuf::from)
            .as_deref()
            == Some(directory)
    {
        let internal: Option<Internal> = serde_json::from_str(include_str!(concat!(
            env!("OUT_DIR"),
            "/internal-pack.json"
        )))
        .map_err(|_| PackRunError::Unavailable)?;
        if let Some(internal) = internal {
            roots.push(internal.root);
        }
    }
    PackTrustStore::new(
        roots
            .into_iter()
            .map(|r| PackTrustRoot {
                key_id: r.key_id,
                publisher: r.publisher,
                public_key: r.public_key,
                valid_from_ms: r.valid_from_ms,
                valid_until_ms: r.valid_until_ms,
            })
            .collect(),
    )
    .map(Arc::new)
    .map_err(|_| PackRunError::Unavailable)
}
pub async fn execute(
    directory: &Path,
    version: InstalledPackVersion,
    operation: PackOperation,
    cancel: CancellationToken,
) -> Result<String, PackRunError> {
    let directory = directory.to_path_buf();
    let executor = tokio::task::spawn_blocking(move || {
        let identity = tagma_core::ConfigService::read_runtime_identity(&directory)
            .map_err(|_| PackRunError::Unavailable)?;
        PackExecutor::new(
            identity,
            &directory.join("packs/versions"),
            trust(&directory)?,
        )
    })
    .await
    .map_err(|_| PackRunError::Unavailable)??;
    let reply = executor
        .call(
            uuid::Uuid::parse_str(&version.preparation_id)
                .map_err(|_| PackRunError::Unavailable)?,
            &version.manifest_sha256,
            operation,
            cancel,
        )
        .await?;
    if reply.version != version.version || reply.pack_id != "reachflow" {
        return Err(PackRunError::ProtocolError);
    }
    match reply.body {
        PackReplyBody::Result { text } => Ok(text),
        _ => Err(PackRunError::ProtocolError),
    }
}
