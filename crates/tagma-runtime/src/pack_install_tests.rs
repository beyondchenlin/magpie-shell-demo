use super::*;
use ed25519_dalek::{Signer, SigningKey};
use sha2::{Digest, Sha256};
use std::io::{Cursor, Read, Write};
use tagma_core::{AppResult, credentials::CredentialStore};

struct NoCredentials;

#[tokio::test]
#[ignore = "requires owned protocol helper; actual offline archive and child process"]
async fn offline_archive_keeps_signature_checksum_health_and_cancellation_gates() {
    let f = Fixture::new();
    let review = f.installer.review(&f.config, f.record.clone()).unwrap();
    let mut corrupt = f.archive.clone();
    corrupt[0] ^= 1;
    assert!(
        f.installer
            .install_archive(
                &f.config,
                review.review_id,
                &review.manifest_sha256,
                CancellationToken::new(),
                |_| {},
                Arc::from(corrupt)
            )
            .await
            .is_err()
    );
    assert!(f.config.view().unwrap().installed_packs.is_empty());
    let review = f.installer.review(&f.config, f.record.clone()).unwrap();
    let cancelled = CancellationToken::new();
    cancelled.cancel();
    assert!(matches!(
        f.installer
            .install_archive(
                &f.config,
                review.review_id,
                &review.manifest_sha256,
                cancelled,
                |_| {},
                Arc::from(f.archive.clone())
            )
            .await,
        Err(InstallError::Cancelled)
    ));
    assert!(f.config.view().unwrap().installed_packs.is_empty());
    let review = f.installer.review(&f.config, f.record.clone()).unwrap();
    let view = f
        .installer
        .install_archive(
            &f.config,
            review.review_id,
            &review.manifest_sha256,
            CancellationToken::new(),
            |_| {},
            Arc::from(f.archive.clone()),
        )
        .await
        .unwrap();
    assert_eq!(
        view.installed_packs[0].active_version.as_deref(),
        Some("1.0.0")
    );
    let installed=&view.installed_packs[0].versions[0];
    let lease=std::fs::OpenOptions::new().read(true).write(true)
        .open(f.root.path().join("preparations/call.lock")).unwrap();
    fs2::FileExt::try_lock_exclusive(&lease).unwrap();
    assert!(matches!(f.installer.executor().call(
        uuid::Uuid::parse_str(&installed.preparation_id).unwrap(),
        &installed.manifest_sha256,
        crate::packs::PackOperation::Ping,
        CancellationToken::new(),
    ).await,Err(crate::packs::PackRunError::Busy)));
    drop(lease);
    assert!(f.installer.executor().call(
        uuid::Uuid::parse_str(&installed.preparation_id).unwrap(),
        &installed.manifest_sha256,
        crate::packs::PackOperation::Ping,
        CancellationToken::new(),
    ).await.is_ok());
}
impl CredentialStore for NoCredentials {
    fn set(&self, _: &str, _: &str) -> AppResult<()> {
        panic!("no credentials in install test")
    }
    fn get(&self, _: &str) -> AppResult<zeroize::Zeroizing<String>> {
        panic!("no credentials in install test")
    }
    fn delete(&self, _: &str) -> AppResult<()> {
        panic!("no credentials in install test")
    }
}
struct Fixture {
    config: ConfigService,
    installer: PackInstaller,
    record: SignedManifestRecord,
    archive: Vec<u8>,
    root: tempfile::TempDir,
}
impl Fixture {
    fn new() -> Self {
        let executable = PathBuf::from(
            std::env::var_os("TAGMA_PACK_FIXTURE").expect("build/pin owned protocol helper"),
        );
        assert_eq!(executable.file_name().unwrap(), "pack_protocol_fixture.exe");
        let binary = std::fs::read(executable).unwrap();
        assert!(binary.len() < 16 * 1024 * 1024);
        let root = tempfile::Builder::new()
            .prefix("tagma-p2-install-")
            .tempdir()
            .unwrap();
        let config =
            ConfigService::open(&root.path().join("config"), Arc::new(NoCredentials)).unwrap();
        let preparations = root.path().join("preparations");
        let temp = root.path().join("download");
        std::fs::create_dir(&preparations).unwrap();
        std::fs::create_dir(&temp).unwrap();
        let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
        zip.start_file(
            "worker.exe",
            zip::write::SimpleFileOptions::default()
                .compression_method(zip::CompressionMethod::Stored),
        )
        .unwrap();
        zip.write_all(&binary).unwrap();
        let archive = zip.finish().unwrap().into_inner();
        let now = now_ms().unwrap();
        let key = SigningKey::from_bytes(&[44; 32]);
        let manifest = serde_json::json!({"contract_version":1,"id":"acceptance-worker","version":"1.0.0","source":{"kind":"official","publisher":"tagma-owned-test"},"issued_ms":now-1000,"expires_ms":now+3600000,"artifacts":[{"target":{"os":"windows","arch":"x86_64"},"download":{"url":"https://packages.example.invalid/owned.zip","sha256":format!("{:x}",Sha256::digest(&archive)),"size_bytes":archive.len(),"format":"zip"},"entry":{"protocol":"stdio_jsonl_v1","executable":"worker.exe","arguments":["normal"]},"resources":{"max_unpacked_bytes":binary.len()+4096,"max_archive_entries":8,"memory_mib":64,"max_concurrency":1,"task_timeout_ms":1000},"permissions":{"network_hosts":[],"workspace":"none","browser":false,"subprocess":false},"health":{"protocol":"stdio_ping_v1","timeout_ms":1000},"models":[{"id":"tagma/acceptance-worker","display_name":"本机测试队员"}]}]});
        let raw = serde_json::to_vec(&manifest).unwrap();
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
        let installer = PackInstaller::new(
            config.configuration_id().unwrap(),
            &preparations,
            &temp,
            PackTarget {
                os: PackOs::Windows,
                arch: PackArch::X86_64,
            },
            trust,
        )
        .unwrap();
        Self {
            config,
            installer,
            record: proof.signed_record(),
            archive,
            root,
        }
    }
    fn server(&mut self, body: Vec<u8>, slow: bool) -> std::thread::JoinHandle<()> {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        self.installer.fixture_endpoint = Some(format!("http://{address}/owned-fixture"));
        // Only the unit-test binary has this field. Production still requires HTTPS.
        self.installer.client = reqwest::Client::builder()
            .no_proxy()
            .redirect(reqwest::redirect::Policy::none())
            .retry(reqwest::retry::never())
            .timeout(Duration::from_secs(5))
            .build()
            .unwrap();
        listener.set_nonblocking(true).unwrap();
        std::thread::spawn(move || {
            let deadline = Instant::now();
            let mut stream = loop {
                match listener.accept() {
                    Ok((s, _)) => break s,
                    Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                        if deadline.elapsed() > Duration::from_secs(5) {
                            return;
                        }
                        std::thread::sleep(Duration::from_millis(10));
                    }
                    Err(_) => return,
                }
            };
            stream.set_nonblocking(false).unwrap();
            stream
                .set_read_timeout(Some(Duration::from_secs(2)))
                .unwrap();
            stream
                .set_write_timeout(Some(Duration::from_secs(2)))
                .unwrap();
            let mut request = [0u8; 2048];
            let _ = stream.read(&mut request);
            let header = format!(
                "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                body.len()
            );
            if stream.write_all(header.as_bytes()).is_err() {
                return;
            }
            for chunk in body.chunks(16 * 1024) {
                if stream.write_all(chunk).is_err() {
                    break;
                }
                if slow {
                    std::thread::sleep(Duration::from_millis(30));
                }
            }
        })
    }
}

#[tokio::test]
#[ignore = "owned helper plus loopback HTTP transport fixture; no real ReachFlow/TLS claim"]
async fn approved_download_prepare_health_activate_and_call() {
    let mut f = Fixture::new();
    let review = f.installer.review(&f.config, f.record.clone()).unwrap();
    assert_eq!(
        review.manifest.artifacts[0].permissions.workspace,
        PackWorkspaceAccess::None
    );
    assert!(review.space.fits());
    assert!(f.config.view().unwrap().installed_packs.is_empty());
    let server = f.server(f.archive.clone(), false);
    let phases = Mutex::new(Vec::new());
    let view = f
        .installer
        .install(
            &f.config,
            review.review_id,
            &review.manifest_sha256,
            CancellationToken::new(),
            |p| phases.lock().unwrap().push(p),
        )
        .await
        .unwrap();
    server.join().unwrap();
    assert_eq!(
        *phases.lock().unwrap(),
        vec![
            InstallPhase::Download,
            InstallPhase::VerifyAndPrepare,
            InstallPhase::HealthCheck,
            InstallPhase::Activated
        ]
    );
    assert_eq!(view.desired_revision, 1);
    let result = f
        .installer
        .executor()
        .call_active(
            &f.config,
            "acceptance-worker",
            crate::packs::PackOperation::LocalSample {
                text: "安装后试跑".into(),
            },
            CancellationToken::new(),
        )
        .await
        .unwrap();
    assert_eq!(
        result.body,
        crate::packs::PackReplyBody::Result {
            text: "本机测试队员已处理：安装后试跑".into()
        }
    );
    assert_eq!(
        std::fs::read_dir(f.root.path().join("download"))
            .unwrap()
            .count(),
        0
    );
    assert!(matches!(
        f.installer
            .install(
                &f.config,
                review.review_id,
                &review.manifest_sha256,
                CancellationToken::new(),
                |_| {}
            )
            .await,
        Err(InstallError::ReviewExpired)
    ));
}

#[tokio::test]
#[ignore = "owned helper; no remote network on admission errors"]
async fn changed_approval_and_revision_never_download() {
    let f = Fixture::new();
    let review = f.installer.review(&f.config, f.record.clone()).unwrap();
    assert!(matches!(
        f.installer
            .install(
                &f.config,
                review.review_id,
                &"0".repeat(64),
                CancellationToken::new(),
                |_| panic!("no download")
            )
            .await,
        Err(InstallError::ApprovalChanged)
    ));
    assert!(matches!(
        f.installer
            .install(
                &f.config,
                review.review_id,
                &review.manifest_sha256,
                CancellationToken::new(),
                |_| panic!("no replay")
            )
            .await,
        Err(InstallError::ReviewExpired)
    ));
    let review = f.installer.review(&f.config, f.record.clone()).unwrap();
    f.config
        .save_provider(tagma_core::SaveProvider {
            protocol_version: 1,
            expected_revision: 0,
            id: None,
            name: "changed configuration".into(),
            protocol: tagma_core::ProviderProtocol::OpenaiChatCompletions,
            base_url: "https://fixture.example.invalid/v1".into(),
            models: vec![],
            enabled: true,
            credential: None,
        })
        .unwrap();
    assert!(matches!(
        f.installer
            .install(
                &f.config,
                review.review_id,
                &review.manifest_sha256,
                CancellationToken::new(),
                |_| panic!("no download")
            )
            .await,
        Err(InstallError::ConfigurationConflict)
    ));
    assert_eq!(
        std::fs::read_dir(f.root.path().join("download"))
            .unwrap()
            .count(),
        0
    );
    assert!(f.config.view().unwrap().installed_packs.is_empty());
}

#[tokio::test]
#[ignore = "owned helper plus loopback HTTP transport fixture; no real ReachFlow/TLS claim"]
async fn cancelled_or_bad_download_never_activates() {
    for slow in [true, false] {
        let mut f = Fixture::new();
        let review = f.installer.review(&f.config, f.record.clone()).unwrap();
        let mut bytes = f.archive.clone();
        if !slow {
            bytes[0] ^= 1;
        }
        let server = f.server(bytes, slow);
        let cancel = CancellationToken::new();
        let signal = cancel.clone();
        let work = f.installer.install(
            &f.config,
            review.review_id,
            &review.manifest_sha256,
            cancel,
            |_| {},
        );
        let stop = async {
            if slow {
                tokio::time::sleep(Duration::from_millis(100)).await;
                signal.cancel();
            }
        };
        let (result, ()) = tokio::join!(work, stop);
        server.join().unwrap();
        if slow {
            assert!(matches!(result, Err(InstallError::Cancelled)))
        } else {
            assert!(matches!(
                result,
                Err(InstallError::Admission(PackError::ChecksumMismatch))
            ))
        }
        assert_eq!(f.config.view().unwrap().desired_revision, 0);
        assert!(f.config.view().unwrap().installed_packs.is_empty());
        assert_eq!(
            std::fs::read_dir(f.root.path().join("download"))
                .unwrap()
                .count(),
            0
        );
        assert_eq!(
            std::fs::read_dir(f.root.path().join("preparations"))
                .unwrap()
                .count(),
            0
        );
    }
}
