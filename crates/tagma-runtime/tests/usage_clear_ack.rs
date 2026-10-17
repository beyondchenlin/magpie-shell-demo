//! Real private socket framing with synthetic replies. No sidecar/UI/provider.
use serde_json::{Value, json};
use std::{path::Path, time::Duration};
use tagma_core::{
    usage::{
        clear::{UsageClearPlan, UsageClearReceipt},
        read::UsageRange,
    },
    *,
};
use tagma_runtime::{GatewayManager, ipc};
fn plan() -> UsageClearPlan {
    UsageClearPlan {
        operation_id: "00000000-0000-4000-8000-000000000001".into(),
        range: UsageRange {
            start_ms: 0.0,
            end_ms: 86_400_000.0,
        },
        expected_revision: "7".into(),
        generation: "0".into(),
        requests: "1".into(),
        attempts: "2".into(),
        summary_buckets: "2".into(),
    }
}
fn status() -> RuntimeStatus {
    RuntimeStatus {
        usage_degraded: Some(false),
        usage_pending_results: Some(0),
        security_revision: Some(0),
        state: RuntimeState::Running,
        instance_id: None,
        effective_revision: Some(1),
        address: None,
        owned: false,
        error: None,
    }
}
async fn accepted(
    clear: bool,
    operation: Value,
    mut status: RuntimeStatus,
    drop_reply: bool,
) -> bool {
    use interprocess::local_socket::tokio::prelude::*;
    let temp = tempfile::Builder::new()
        .prefix("tagma-clear-ack-")
        .tempdir()
        .unwrap();
    let instance = uuid::Uuid::new_v4().to_string();
    if status.instance_id.is_none() {
        status.instance_id = Some(instance.clone());
    }
    #[cfg(windows)]
    let endpoint = format!("tagma-{}", uuid::Uuid::new_v4());
    #[cfg(unix)]
    let endpoint = temp
        .path()
        .join("clear.sock")
        .to_string_lossy()
        .into_owned();
    let manifest = ipc::Manifest {
        protocol_version: PROTOCOL_VERSION,
        product_version: PRODUCT_VERSION.into(),
        schema_version: SCHEMA_VERSION,
        config_id: ipc::config_id(temp.path()).unwrap(),
        instance_id: instance,
        endpoint,
        port: 9168,
        console_attached: false,
    };
    let listener = ipc::listener(&manifest.endpoint).unwrap();
    std::fs::write(
        temp.path().join("runtime.json"),
        serde_json::to_vec(&manifest).unwrap(),
    )
    .unwrap();
    let server = tokio::spawn(async move {
        let mut stream = tokio::time::timeout(Duration::from_secs(2), listener.accept())
            .await
            .unwrap()
            .unwrap();
        let request: ipc::Request = ipc::read_frame(&mut stream).await.unwrap();
        if clear {
            assert!(matches!(request.command, ipc::Command::ClearUsage { .. }));
        } else {
            assert!(matches!(
                request.command,
                ipc::Command::PrepareUsageClear { .. }
            ));
        }
        if !drop_reply {
            ipc::write_frame(&mut stream,&json!({"protocol_version":PROTOCOL_VERSION,"product_version":PRODUCT_VERSION,"config_id":request.config_id,"instance_id":request.instance_id,"challenge":request.challenge,"status":status,"operation":operation})).await.unwrap();
        }
    });
    let manager = GatewayManager::new(temp.path(), Path::new("unused-private-clear-fixture"));
    let result = if clear {
        manager.clear_usage(plan()).await.is_ok()
    } else {
        manager.prepare_usage_clear(plan().range).await.is_ok()
    };
    server.await.unwrap();
    result
}
#[tokio::test]
async fn clear_receipt_requires_matching_operation_scope_generation_and_instance() {
    let receipt = UsageClearReceipt {
        plan: plan(),
        generation: "1".into(),
        committed_ms: 86_400_001.0,
    };
    let success = json!({"kind":"clear_usage","receipt":receipt,"error":null});
    let mut cases = vec![
        Value::Null,
        json!({"kind":"recover_usage","confirmed":true,"error":null}),
        json!({"kind":"clear_usage","receipt":null,"error":null}),
    ];
    for (field, value) in [
        (
            "operation_id",
            json!("00000000-0000-4000-8000-000000000099"),
        ),
        ("requests", json!("9")),
        ("expected_revision", json!("8")),
    ] {
        let mut bad = success.clone();
        bad["receipt"]["plan"][field] = value;
        cases.push(bad);
    }
    let mut wrong_range = success.clone();
    wrong_range["receipt"]["plan"]["range"]["end_ms"] = json!(172800000);
    cases.push(wrong_range);
    for value in [json!("0"), json!("01"), json!("9223372036854775808")] {
        let mut bad = success.clone();
        bad["receipt"]["generation"] = value;
        cases.push(bad);
    }
    for value in [json!(1), json!(86400000.5)] {
        let mut bad = success.clone();
        bad["receipt"]["committed_ms"] = value;
        cases.push(bad);
    }
    let mut failed = success.clone();
    failed["error"] = json!({"code":"USAGE_CLEAR_UNCONFIRMED","retryable":true});
    cases.push(failed);
    for operation in cases.iter().cloned() {
        assert!(!accepted(true, operation, status(), false).await);
    }
    let mut wrong_instance = status();
    wrong_instance.instance_id = Some(uuid::Uuid::new_v4().to_string());
    assert!(!accepted(true, success.clone(), wrong_instance, false).await);
    let mut stopped = status();
    stopped.state = RuntimeState::Stopped;
    assert!(!accepted(true, success.clone(), stopped, false).await);
    assert!(!accepted(true, success.clone(), status(), true).await);
    assert!(accepted(true, success.clone(), status(), false).await);
    for code in [
        ErrorCode::ConfigApplyFailed,
        ErrorCode::UsageStorageUnavailable,
    ] {
        let mut unrelated = status();
        unrelated.state = RuntimeState::Degraded;
        unrelated.error = Some(AppError::new(code));
        assert!(accepted(true, success.clone(), unrelated, false).await);
    }
    println!(
        "Usage clear IPC:{} malformed/failed operation replies plus wrong instance/stopped/lost reply rejected;3 explicit receipt positives accepted;later runtime error does not replace actual operation result",
        cases.len()
    );
}
#[tokio::test]
async fn preview_requires_requested_range_complete_plan_and_no_operation_error() {
    let success = json!({"kind":"prepare_usage_clear","plan":plan(),"error":null});
    let mut bad_range = success.clone();
    bad_range["plan"]["range"]["end_ms"] = json!(172800000);
    let mut bad_counter = success.clone();
    bad_counter["plan"]["requests"] = json!("01");
    let mut bad_id = success.clone();
    bad_id["plan"]["operation_id"] = json!("invalid");
    let mut failed = success.clone();
    failed["error"] = json!({"code":"USAGE_CLEAR_BUSY","retryable":true});
    for operation in [
        Value::Null,
        bad_range,
        bad_counter,
        bad_id,
        failed,
        json!({"kind":"prepare_usage_clear","plan":null,"error":null}),
    ] {
        assert!(!accepted(false, operation, status(), false).await);
    }
    assert!(accepted(false, success, status(), false).await);
    println!(
        "Usage preview IPC:6 missing/changed/incomplete/error replies rejected;exact requested range and canonical numeric plan accepted"
    );
}
