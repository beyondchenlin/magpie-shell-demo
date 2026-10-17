use std::{path::Path, sync::Arc, time::Duration};
use tagma_core::{credentials::SystemCredentials, *};
use tagma_runtime::{
    GatewayManager,
    ipc::{self, Bootstrap, Command},
};
use tokio::{
    io::AsyncWriteExt,
    process::{Child, Command as Process},
};

fn free_port() -> u16 {
    std::net::TcpListener::bind("127.0.0.1:0")
        .unwrap()
        .local_addr()
        .unwrap()
        .port()
}
fn manager(path: &Path) -> GatewayManager {
    GatewayManager::new(path, Path::new(env!("CARGO_BIN_EXE_tagma-gateway")))
}
fn initialize(path: &Path) -> ConfigService {
    ConfigService::open(path, Arc::new(SystemCredentials)).unwrap()
}
async fn wait_until(mut check: impl AsyncFnMut() -> bool) {
    tokio::time::timeout(Duration::from_secs(5), async {
        loop {
            if check().await {
                break;
            }
            tokio::time::sleep(Duration::from_millis(30)).await;
        }
    })
    .await
    .expect("bounded gateway condition");
}

#[tokio::test]
async fn managed_ready_apply_reconcile_wrong_owner_and_graceful_stop() {
    let temp = tempfile::tempdir().unwrap();
    let config = initialize(temp.path());
    let manager = manager(temp.path());
    let port = free_port();
    let ready = manager.start(port).await.unwrap();
    assert!(ready.owned);
    assert!(matches!(ready.state, RuntimeState::Running));
    assert_eq!(ready.effective_revision, Some(0));
    let manifest = ipc::read_manifest(temp.path()).unwrap();
    assert!(
        !manifest.console_attached,
        "gateway GUI subsystem must not allocate a console even when stdin is inherited"
    );
    let denied = ipc::call(
        &manifest,
        Command::Stop {
            owner_token: uuid::Uuid::new_v4().to_string(),
        },
    )
    .await
    .unwrap();
    assert_eq!(denied.error.unwrap().code, ErrorCode::OwnershipRequired);
    let mut incompatible = manifest.clone();
    incompatible.product_version = "wrong-version".into();
    assert_eq!(
        ipc::call(&incompatible, Command::Status)
            .await
            .unwrap_err()
            .code,
        ErrorCode::IncompatibleVersion
    );
    config
        .save_provider(SaveProvider {
            protocol_version: 1,
            expected_revision: 0,
            id: None,
            name: "real-process-fixture".into(),
            protocol: ProviderProtocol::OpenaiChatCompletions,
            base_url: "https://example.invalid/v1".into(),
            enabled: true,
            models: vec![],
            credential: None,
        })
        .unwrap();
    // No notification: periodic reconciliation must recover the lost apply signal.
    wait_until(async || manager.status().await.effective_revision == Some(1)).await;
    let attached = super_manager(temp.path());
    let status = attached.start(port).await.unwrap();
    assert!(!status.owned);
    assert_eq!(status.instance_id, ready.instance_id);
    assert_eq!(
        attached.stop().await.unwrap_err().code,
        ErrorCode::OwnershipRequired
    );
    manager.stop().await.unwrap();
    assert!(std::net::TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, port)).is_ok());
    assert!(!temp.path().join("runtime.json").exists());
}
fn super_manager(path: &Path) -> GatewayManager {
    manager(path)
}

#[tokio::test]
async fn port_conflict_never_changes_port_or_kills_existing_listener() {
    let temp = tempfile::tempdir().unwrap();
    let _config = initialize(temp.path());
    let manager = manager(temp.path());
    let foreign = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let port = foreign.local_addr().unwrap().port();
    assert_eq!(
        manager.start(port).await.unwrap_err().code,
        ErrorCode::PortInUse
    );
    assert!(std::net::TcpStream::connect((std::net::Ipv4Addr::LOCALHOST, port)).is_ok());
    assert!(!temp.path().join("runtime.json").exists());
}

async fn raw_start(path: &Path, managed: bool) -> (Child, ipc::Manifest, String) {
    let token = uuid::Uuid::new_v4().to_string();
    let instance_id = uuid::Uuid::new_v4().to_string();
    let mut process = Process::new(env!("CARGO_BIN_EXE_tagma-gateway"));
    process
        .arg("--config-dir")
        .arg(path)
        .arg("--port")
        .arg(free_port().to_string())
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .kill_on_drop(true);
    if managed {
        process.arg("--managed");
    }
    let mut child = process.spawn().unwrap();
    let mut pipe = child.stdin.take().unwrap();
    let mut data = serde_json::to_vec(&Bootstrap {
        owner_token: token.clone(),
        instance_id,
    })
    .unwrap();
    data.push(b'\n');
    pipe.write_all(&data).await.unwrap();
    let manifest = tokio::time::timeout(Duration::from_secs(5), async {
        loop {
            if let Ok(m) = ipc::read_manifest(path)
                && ipc::call(&m, Command::Status).await.is_ok()
            {
                break m;
            }
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
    })
    .await
    .unwrap();
    // Simulates the owning shell dying: the inherited lifetime pipe is closed.
    drop(pipe);
    (child, manifest, token)
}

#[tokio::test]
async fn parent_eof_exits_managed_process_but_standalone_survives() {
    let managed = tempfile::tempdir().unwrap();
    let _config = initialize(managed.path());
    let (mut child, _, _) = raw_start(managed.path(), true).await;
    assert!(
        tokio::time::timeout(Duration::from_secs(5), child.wait())
            .await
            .unwrap()
            .unwrap()
            .success()
    );
    assert!(!managed.path().join("runtime.json").exists());
    let independent = tempfile::tempdir().unwrap();
    let _config2 = initialize(independent.path());
    let (mut child, manifest, token) = raw_start(independent.path(), false).await;
    assert!(ipc::call(&manifest, Command::Status).await.is_ok());
    ipc::call(&manifest, Command::Stop { owner_token: token })
        .await
        .unwrap();
    assert!(
        tokio::time::timeout(Duration::from_secs(5), child.wait())
            .await
            .unwrap()
            .unwrap()
            .success()
    );
}

#[tokio::test]
async fn concurrent_start_has_one_instance_and_one_owner() {
    let temp = tempfile::tempdir().unwrap();
    let _config = initialize(temp.path());
    let a = manager(temp.path());
    let b = manager(temp.path());
    let port = free_port();
    let (a_started, b_started) = tokio::join!(a.start(port), b.start(port));
    assert!(a_started.is_ok() || b_started.is_ok());
    let a_status = a.status().await;
    let b_status = b.status().await;
    assert_eq!(a_status.instance_id, b_status.instance_id);
    assert_ne!(a_status.owned, b_status.owned);
    if a_status.owned {
        a.stop().await.unwrap();
    } else {
        b.stop().await.unwrap();
    }
}

#[tokio::test]
async fn oversized_private_frame_is_dropped_without_crashing_gateway() {
    use interprocess::local_socket::{
        GenericNamespaced,
        tokio::{Stream, prelude::*},
    };
    let temp = tempfile::tempdir().unwrap();
    let _config = initialize(temp.path());
    let manager = manager(temp.path());
    manager.start(free_port()).await.unwrap();
    let manifest = ipc::read_manifest(temp.path()).unwrap();
    #[cfg(windows)]
    let name = manifest
        .endpoint
        .as_str()
        .to_ns_name::<GenericNamespaced>()
        .unwrap();
    #[cfg(unix)]
    let name = manifest
        .endpoint
        .as_str()
        .to_fs_name::<interprocess::local_socket::GenericFilePath>()
        .unwrap();
    let mut stream = Stream::connect(name).await.unwrap();
    stream.write_u32(ipc::MAX_FRAME as u32 + 1).await.unwrap();
    drop(stream);
    assert!(ipc::call(&manifest, Command::Status).await.is_ok());
    manager.stop().await.unwrap();
}

#[tokio::test]
async fn stale_old_version_manifest_does_not_block_start_without_an_active_lock() {
    let temp = tempfile::tempdir().unwrap();
    let _config = initialize(temp.path());
    let manager = manager(temp.path());
    manager.start(free_port()).await.unwrap();
    let mut stale = ipc::read_manifest(temp.path()).unwrap();
    manager.stop().await.unwrap();
    stale.product_version = "old-version".into();
    std::fs::write(
        temp.path().join("runtime.json"),
        serde_json::to_vec(&stale).unwrap(),
    )
    .unwrap();
    assert!(matches!(
        manager.status().await.state,
        RuntimeState::Stopped
    ));
    assert!(manager.start(free_port()).await.unwrap().owned);
    manager.stop().await.unwrap();
}

#[tokio::test]
async fn active_older_version_envelope_is_reported_without_spawn_or_stop() {
    let temp = tempfile::tempdir().unwrap();
    let _config = initialize(temp.path());
    let manager = manager(temp.path());
    manager.start(free_port()).await.unwrap();
    let original = std::fs::read(temp.path().join("runtime.json")).unwrap();
    let mut older: serde_json::Value = serde_json::from_slice(&original).unwrap();
    older["product_version"] = "old-product".into();
    older.as_object_mut().unwrap().remove("console_attached");
    std::fs::write(
        temp.path().join("runtime.json"),
        serde_json::to_vec(&older).unwrap(),
    )
    .unwrap();
    let other = super_manager(temp.path());
    assert_eq!(
        other.start(free_port()).await.unwrap_err().code,
        ErrorCode::IncompatibleVersion
    );
    assert_eq!(
        other.status().await.error.unwrap().code,
        ErrorCode::IncompatibleVersion
    );
    assert!(manager.owned_process_id().await.is_some());
    std::fs::write(temp.path().join("runtime.json"), original).unwrap();
    manager.stop().await.unwrap();
}

#[cfg(windows)]
#[tokio::test]
async fn managed_crashes_restart_at_most_three_times_then_remain_failed() {
    let temp = tempfile::tempdir().unwrap();
    let _config = initialize(temp.path());
    let manager = manager(temp.path());
    manager.start(free_port()).await.unwrap();
    for attempt in 0..4 {
        let pid = manager
            .owned_process_id()
            .await
            .expect("only owned child may be terminated by this fixture");
        let result = Process::new("taskkill.exe")
            .args(["/PID", &pid.to_string(), "/F"])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .await
            .unwrap();
        assert!(result.success());
        wait_until(async || matches!(manager.status().await.state, RuntimeState::Failed)).await;
        if attempt < 3 {
            tokio::time::timeout(Duration::from_secs(7), async {
                loop {
                    manager.supervise().await;
                    if matches!(manager.status().await.state, RuntimeState::Running) {
                        break;
                    }
                    tokio::time::sleep(Duration::from_millis(50)).await;
                }
            })
            .await
            .expect("bounded automatic restart");
            assert!(
                !ipc::read_manifest(temp.path()).unwrap().console_attached,
                "automatic restart must remain console-free"
            );
        } else {
            for _ in 0..3 {
                manager.supervise().await;
            }
            assert!(manager.owned_process_id().await.is_none());
            assert!(matches!(manager.status().await.state, RuntimeState::Failed));
        }
    }
}
