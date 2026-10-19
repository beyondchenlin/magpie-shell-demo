//! Explicit opt-in because the helper must be built and pinned by this task first.
use ed25519_dalek::{Signer, SigningKey};
use sha2::{Digest, Sha256};
use std::{
    io::{Cursor, Write},
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tagma_core::packs::*;
use tagma_runtime::packs::*;
use tokio_util::sync::CancellationToken;

struct Fixture {
    config: tagma_core::ConfigService,
    executor: PackExecutor,
    operation: uuid::Uuid,
    sha: String,
    path: std::path::PathBuf,
    root: tempfile::TempDir,
}
struct NoCredentials;
impl tagma_core::credentials::CredentialStore for NoCredentials {
    fn set(&self, _: &str, _: &str) -> tagma_core::AppResult<()> {
        panic!("pack fixture must not write credentials")
    }
    fn get(&self, _: &str) -> tagma_core::AppResult<zeroize::Zeroizing<String>> {
        panic!("pack fixture must not read credentials")
    }
    fn delete(&self, _: &str) -> tagma_core::AppResult<()> {
        panic!("pack fixture must not delete credentials")
    }
}
impl Fixture {
    fn new(mode: &str) -> Self {
        let executable = std::path::PathBuf::from(
            std::env::var_os("TAGMA_PACK_FIXTURE").expect("build/pin owned fixture first"),
        );
        assert_eq!(executable.file_name().unwrap(), "pack_protocol_fixture.exe");
        let binary = std::fs::read(executable).unwrap();
        assert!(binary.len() < 16 * 1024 * 1024);
        let root = tempfile::Builder::new()
            .prefix("tagma-p2-execution-")
            .tempdir()
            .unwrap();
        let preparations = root.path().join("preparations");
        std::fs::create_dir(&preparations).unwrap();
        let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
        zip.start_file(
            "worker.exe",
            zip::write::SimpleFileOptions::default()
                .compression_method(zip::CompressionMethod::Stored),
        )
        .unwrap();
        zip.write_all(&binary).unwrap();
        let archive = zip.finish().unwrap().into_inner();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        let value = serde_json::json!({"contract_version":1,"id":"acceptance-worker","version":"1.0.0","source":{"kind":"official","publisher":"tagma-owned-test"},"issued_ms":now-1000,"expires_ms":now+3600000,"artifacts":[{"target":{"os":"windows","arch":"x86_64"},"download":{"url":"https://packages.example.invalid/acceptance.zip","sha256":format!("{:x}",Sha256::digest(&archive)),"size_bytes":archive.len(),"format":"zip"},"entry":{"protocol":"stdio_jsonl_v1","executable":"worker.exe","arguments":[mode]},"resources":{"max_unpacked_bytes":binary.len()+4096,"max_archive_entries":8,"memory_mib":64,"max_concurrency":1,"task_timeout_ms":1000},"permissions":{"network_hosts":[],"workspace":"none","browser":false,"subprocess":false},"health":{"protocol":"stdio_ping_v1","timeout_ms":1000},"models":[{"id":"tagma/acceptance-worker","display_name":"本机测试队员"}]}]});
        let raw = serde_json::to_vec(&value).unwrap();
        let key = SigningKey::from_bytes(&[43; 32]);
        let mut signed = MANIFEST_SIGNATURE_DOMAIN.to_vec();
        signed.extend_from_slice(&raw);
        let trust = Arc::new(
            PackTrustStore::new(vec![PackTrustRoot {
                key_id: "owned-test".into(),
                publisher: "tagma-owned-test".into(),
                public_key: key.verifying_key().to_bytes(),
                valid_from_ms: now - 2000,
                valid_until_ms: now + 3600000,
            }])
            .unwrap(),
        );
        let proof = trust
            .verify("owned-test", &raw, &key.sign(&signed).to_bytes(), now)
            .unwrap();
        let sha = proof.sha256().to_owned();
        let control = PackStageControl::new(Duration::from_secs(10)).unwrap();
        let target = PackTarget {
            os: PackOs::Windows,
            arch: PackArch::X86_64,
        };
        let mut staged = PackArchiveStager::new(proof, target, root.path()).unwrap();
        staged.push(&archive, &control).unwrap();
        let service =
            tagma_core::ConfigService::open(&root.path().join("config"), Arc::new(NoCredentials))
                .unwrap();
        let config = service.configuration_id().unwrap();
        let prepared = staged
            .finish(&control)
            .unwrap()
            .extract(root.path(), &control)
            .unwrap()
            .publish_prepared(&preparations, config, &control)
            .unwrap();
        let operation = prepared.operation_id();
        let path = prepared.root_path().to_owned();
        let executor = PackExecutor::new(config, &preparations, trust).unwrap();
        Self {
            config: service,
            root,
            executor,
            operation,
            sha,
            path,
        }
    }
    async fn call(&self, operation: PackOperation) -> Result<PackReply, PackRunError> {
        self.executor
            .call(
                self.operation,
                &self.sha,
                operation,
                CancellationToken::new(),
            )
            .await
    }
}

#[tokio::test]
#[ignore = "owned native helper; see P2 execution protocol runbook"]
async fn health_before_activation_persisted_version_and_deactivation() {
    let f = Fixture::new("normal");
    assert_eq!(
        f.executor
            .call_active(
                &f.config,
                "acceptance-worker",
                PackOperation::Ping,
                CancellationToken::new()
            )
            .await
            .unwrap_err(),
        PackRunError::Unavailable
    );
    let view = f
        .executor
        .activate(&f.config, 0, f.operation, &f.sha, CancellationToken::new())
        .await
        .unwrap();
    assert_eq!(view.desired_revision, 1);
    assert_eq!(
        view.installed_packs[0].active_version.as_deref(),
        Some("1.0.0")
    );
    assert_eq!(
        f.executor
            .call_active(
                &f.config,
                "acceptance-worker",
                PackOperation::LocalSample {
                    text: "实际激活后调用".into()
                },
                CancellationToken::new()
            )
            .await
            .unwrap()
            .body,
        PackReplyBody::Result {
            text: "本机测试队员已处理：实际激活后调用".into()
        }
    );
    assert_eq!(
        f.executor
            .activate(&f.config, 0, f.operation, &f.sha, CancellationToken::new())
            .await
            .unwrap_err(),
        PackRunError::ConfigurationConflict
    );
    let reopened =
        tagma_core::ConfigService::open(&f.root.path().join("config"), Arc::new(NoCredentials))
            .unwrap();
    assert_eq!(
        reopened.view().unwrap().installed_packs,
        view.installed_packs
    );
    let disabled = f.config.deactivate_pack(1, "acceptance-worker").unwrap();
    assert_eq!(disabled.desired_revision, 2);
    assert!(disabled.installed_packs[0].active_version.is_none());
    assert!(f.path.join("payload/worker.exe").exists());
    assert_eq!(
        f.executor
            .call_active(
                &f.config,
                "acceptance-worker",
                PackOperation::Ping,
                CancellationToken::new()
            )
            .await
            .unwrap_err(),
        PackRunError::Unavailable
    );
}

#[tokio::test]
#[ignore = "owned native helper; see P2 execution protocol runbook"]
async fn failed_health_never_publishes_installation() {
    let f = Fixture::new("wrong-id");
    assert_eq!(
        f.executor
            .activate(&f.config, 0, f.operation, &f.sha, CancellationToken::new())
            .await
            .unwrap_err(),
        PackRunError::ProtocolError
    );
    let view = f.config.view().unwrap();
    assert_eq!(view.desired_revision, 0);
    assert!(view.installed_packs.is_empty());
    assert!(f.path.join("payload/worker.exe").exists());
}

#[tokio::test]
#[ignore = "owned native helper; see P2 execution protocol runbook"]
async fn signed_preparation_health_and_sample_reach_actual_process() {
    let f = Fixture::new("normal");
    assert_eq!(
        f.call(PackOperation::Ping).await.unwrap().body,
        PackReplyBody::Ready
    );
    assert_eq!(
        f.call(PackOperation::LocalSample {
            text: "固定中文素材".into()
        })
        .await
        .unwrap()
        .body,
        PackReplyBody::Result {
            text: "本机测试队员已处理：固定中文素材".into()
        }
    );
    assert!(f.root.path().exists());
}

#[tokio::test]
#[ignore = "owned native helper; see P2 execution protocol runbook"]
async fn consent_and_payload_changes_are_rejected_before_execution() {
    let f = Fixture::new("normal");
    assert_eq!(
        f.executor
            .call(
                f.operation,
                &"0".repeat(64),
                PackOperation::Ping,
                CancellationToken::new()
            )
            .await
            .unwrap_err(),
        PackRunError::ApprovalChanged
    );
    std::fs::write(f.path.join("payload/worker.exe"), b"damaged owned fixture").unwrap();
    assert_eq!(
        f.call(PackOperation::Ping).await.unwrap_err(),
        PackRunError::Unavailable
    );
}

#[tokio::test]
#[ignore = "owned native helper; see P2 execution protocol runbook"]
async fn process_failure_identity_and_output_bounds_are_not_success() {
    for (mode, error) in [
        ("crash", PackRunError::ProcessFailed),
        ("wrong-id", PackRunError::ProtocolError),
        ("flood", PackRunError::OutputLimit),
        ("stderr-flood", PackRunError::OutputLimit),
    ] {
        let f = Fixture::new(mode);
        assert_eq!(
            f.call(PackOperation::Ping).await.unwrap_err(),
            error,
            "{mode}"
        );
    }
}

#[tokio::test]
#[ignore = "owned native helper; see P2 execution protocol runbook"]
async fn deadline_cancel_and_busy_release_the_process_and_admission() {
    let f = Fixture::new("hang");
    let start = std::time::Instant::now();
    assert_eq!(
        f.call(PackOperation::Ping).await.unwrap_err(),
        PackRunError::TimedOut
    );
    assert!(start.elapsed() < Duration::from_secs(5));
    let cancel = CancellationToken::new();
    let signal = cancel.clone();
    let pending = f
        .executor
        .call(f.operation, &f.sha, PackOperation::Ping, cancel);
    let concurrent = async {
        tokio::time::sleep(Duration::from_millis(150)).await;
        assert_eq!(
            f.call(PackOperation::Ping).await.unwrap_err(),
            PackRunError::Busy
        );
        signal.cancel();
    };
    let (result, ()) = tokio::join!(pending, concurrent);
    assert_eq!(result.unwrap_err(), PackRunError::Cancelled);
    let pre = CancellationToken::new();
    pre.cancel();
    assert_eq!(
        f.executor
            .call(f.operation, &f.sha, PackOperation::Ping, pre)
            .await
            .unwrap_err(),
        PackRunError::Cancelled
    );
    // Removal while fixture scope is alive confirms the executable is not held by the child on Windows.
    std::fs::remove_file(f.path.join("payload/worker.exe")).unwrap();
}
