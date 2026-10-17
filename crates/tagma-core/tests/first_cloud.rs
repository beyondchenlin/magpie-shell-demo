//! Persistent order-source contracts; no network, credentials or desktop access.
use std::sync::Arc;
use tagma_core::{credentials::SystemCredentials, health::*, service::ConfigSnapshot, *};

#[test]
fn default_app_is_explicit_persistent_bounded_and_never_a_failure_fallback() {
    let temp = tempfile::tempdir().unwrap();
    let config = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
    let mut ids = Vec::new();
    for index in 0..2 {
        let view = config
            .save_provider(SaveProvider {
                protocol_version: 1,
                expected_revision: index,
                id: None,
                name: format!("fixture-{index}"),
                protocol: ProviderProtocol::OpenaiChatCompletions,
                base_url: "https://example.invalid/v1".into(),
                enabled: true,
                models: vec!["one".into(), "two".into()],
                credential: None,
            })
            .unwrap();
        ids.push(view.providers[index as usize].id.clone());
    }
    let profile = config
        .save_profile(SaveAppProfile {
            protocol_version: 1,
            expected_revision: 2,
            id: None,
            name: "Chosen app".into(),
            target_app: "fixture".into(),
            provider_ids: vec![ids[1].clone(), ids[0].clone()],
            use_global_order: false,
        })
        .unwrap()
        .profiles[1]
        .id
        .clone();
    let snapshot = config.read_snapshot().unwrap().1;
    let records: Vec<_> = snapshot
        .providers
        .iter()
        .flat_map(|p| {
            p.provider.models.iter().map(|model| ModelHealthRecord {
                provider_id: p.provider.id.clone(),
                model_id: model.clone(),
                fingerprint: provider_fingerprint(p),
                inference_succeeded_ms: Some(1000),
                ..Default::default()
            })
        })
        .collect();
    assert_eq!(
        select_first_cloud(&snapshot, &records, 1001)
            .unwrap()
            .provider_id,
        ids[0]
    );
    let order = FirstCloudOrder::DefaultApp {
        profile_id: profile.clone(),
    };
    config
        .save_first_cloud_order(SaveFirstCloudOrder {
            protocol_version: 1,
            expected_revision: 3,
            order: order.clone(),
        })
        .unwrap();
    assert_eq!(config.view().unwrap().first_cloud_order, order);
    let mut snapshot = config.read_snapshot().unwrap().1;
    assert_eq!(
        select_first_cloud(&snapshot, &records, 1001)
            .unwrap()
            .provider_id,
        ids[1]
    );
    snapshot.providers[1].provider.models.reverse();
    assert_eq!(
        select_first_cloud(&snapshot, &records, 1001)
            .unwrap()
            .model_id,
        "two"
    );
    // An inherited App order is projected from the current global listing, restricted to its selection.
    snapshot.profiles[0].use_global_order = true;
    assert_eq!(
        select_first_cloud(&snapshot, &records, 1001)
            .unwrap()
            .provider_id,
        ids[0]
    );
    snapshot.profiles[0].provider_ids.clear();
    assert!(
        select_first_cloud(&snapshot, &records, 1001).is_none(),
        "Empty chosen App cannot fall back to all providers"
    );
    snapshot.first_cloud_order = FirstCloudOrder::DefaultApp {
        profile_id: "absent".into(),
    };
    assert!(select_first_cloud(&snapshot, &records, 1001).is_none());
    assert!(
        select_first_cloud(
            &config.read_snapshot().unwrap().1,
            &records,
            1000 + HEALTH_TTL_MS
        )
        .is_none()
    );
    let invalid = config
        .save_first_cloud_order(SaveFirstCloudOrder {
            protocol_version: 1,
            expected_revision: 4,
            order: FirstCloudOrder::DefaultApp {
                profile_id: GLOBAL_PROFILE_ID.into(),
            },
        })
        .unwrap_err();
    assert_eq!(invalid.code, ErrorCode::InvalidInput);
    let invalid = config
        .save_first_cloud_order(SaveFirstCloudOrder {
            protocol_version: 1,
            expected_revision: 4,
            order: FirstCloudOrder::DefaultApp {
                profile_id: "absent".into(),
            },
        })
        .unwrap_err();
    assert_eq!(invalid.code, ErrorCode::InvalidInput);
    assert_eq!(
        config
            .delete_profile(RevisionCommand {
                protocol_version: 1,
                expected_revision: 4,
                id: profile.clone()
            })
            .unwrap_err()
            .code,
        ErrorCode::ProfileReferenced
    );
    assert_eq!(
        config
            .save_first_cloud_order(SaveFirstCloudOrder {
                protocol_version: 1,
                expected_revision: 3,
                order: FirstCloudOrder::Global {}
            })
            .unwrap_err()
            .code,
        ErrorCode::ConfigConflict
    );
    assert_eq!(config.view().unwrap().desired_revision, 4);
    drop(config);
    let reopened = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
    assert_eq!(reopened.view().unwrap().first_cloud_order, order);
    reopened
        .save_first_cloud_order(SaveFirstCloudOrder {
            protocol_version: 1,
            expected_revision: 4,
            order: FirstCloudOrder::Global {},
        })
        .unwrap();
    reopened
        .delete_profile(RevisionCommand {
            protocol_version: 1,
            expected_revision: 5,
            id: profile,
        })
        .unwrap();
    // Older snapshots retain their global order, with no invented default App.
    let legacy: ConfigSnapshot =
        serde_json::from_value(serde_json::json!({"providers":[]})).unwrap();
    assert_eq!(legacy.first_cloud_order, FirstCloudOrder::Global {});
    assert!(
        serde_json::from_value::<FirstCloudOrder>(
            serde_json::json!({"kind":"global","profile_id":"ignored"})
        )
        .is_err()
    );
    println!(
        "A14 order-source: global provider/model order; explicit/default App custom/inherited/empty/missing order; strict TTL; persistent selection; reference protection; conflict; legacy default all verified"
    );
}
