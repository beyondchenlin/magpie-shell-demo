//! Storage generation, source/time, recovery and strict catalog bounds.
use std::sync::Arc;
use tagma_core::{catalog::*, credentials::SystemCredentials, health::*, *};
#[test]
fn catalog_time_and_generation_do_not_refresh_inference_or_rewrite_configuration() {
    let temp = tempfile::tempdir().unwrap();
    let config = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
    let provider = config
        .save_provider(SaveProvider {
            protocol_version: 1,
            expected_revision: 0,
            id: None,
            name: "fixture".into(),
            protocol: ProviderProtocol::OpenaiChatCompletions,
            base_url: "https://example.invalid/v1".into(),
            enabled: true,
            models: vec!["explicit-id".into()],
            credential: None,
        })
        .unwrap()
        .providers[0]
        .clone();
    let pinned = config.read_snapshot().unwrap().1.providers[0].clone();
    let fingerprint = provider_fingerprint(&pinned);
    let request = ProbeProvider {
        protocol_version: 1,
        expected_revision: 1,
        provider_id: provider.id.clone(),
        request_id: uuid::Uuid::new_v4().to_string(),
    };
    ConfigService::begin_runtime_catalog(temp.path(), &request, &pinned).unwrap();
    assert_eq!(
        config.view().unwrap().provider_catalog[0].outcome,
        CatalogOutcome::Pending
    );
    assert_eq!(
        ConfigService::begin_runtime_catalog(temp.path(), &request, &pinned)
            .unwrap_err()
            .code,
        ErrorCode::ProbeBackoff
    );
    let old = now_ms().unwrap() - HEALTH_TTL_MS;
    ConfigService::finish_runtime_catalog(
        temp.path(),
        &request,
        &fingerprint,
        CatalogOutcome::Available,
        Some(200),
        vec!["original/model:id".into()],
        old,
    )
    .unwrap();
    let view = config.view().unwrap();
    assert_eq!(view.desired_revision, 1);
    assert_eq!(view.providers[0].models, vec!["explicit-id"]);
    assert!(view.model_health.is_empty());
    assert_eq!(view.provider_catalog[0].catalog_ms, Some(old as f64));
    assert_eq!(view.provider_catalog[0].finished_ms, Some(old as f64));
    assert!(view.provider_catalog[0].stale);
    assert!(
        !ConfigService::finish_runtime_catalog(
            temp.path(),
            &request,
            &fingerprint,
            CatalogOutcome::Available,
            Some(200),
            vec![],
            now_ms().unwrap()
        )
        .unwrap(),
        "Completed attempt cannot be replayed to freshen a cache"
    );
    let request = ProbeProvider {
        request_id: uuid::Uuid::new_v4().to_string(),
        ..request
    };
    ConfigService::begin_runtime_catalog(temp.path(), &request, &pinned).unwrap();
    ConfigService::invalidate_unconfirmed_runtime_health(temp.path()).unwrap();
    assert_eq!(
        config.view().unwrap().provider_catalog[0].outcome,
        CatalogOutcome::Cancelled,
        "Interrupted pending jobs cannot trap the UI forever"
    );
    assert!(
        !ConfigService::finish_runtime_catalog(
            temp.path(),
            &request,
            &fingerprint,
            CatalogOutcome::Available,
            Some(200),
            vec![],
            now_ms().unwrap()
        )
        .unwrap()
    );
    config
        .save_provider(SaveProvider {
            protocol_version: 1,
            expected_revision: 1,
            id: Some(provider.id),
            name: provider.name,
            protocol: provider.protocol,
            base_url: "https://replacement.invalid/v1".into(),
            enabled: true,
            models: provider.models,
            credential: None,
        })
        .unwrap();
    assert!(config.view().unwrap().provider_catalog.is_empty());
    assert!(
        !ConfigService::finish_runtime_catalog(
            temp.path(),
            &request,
            &fingerprint,
            CatalogOutcome::Available,
            Some(200),
            vec![],
            now_ms().unwrap()
        )
        .unwrap()
    );
    assert_eq!(config.view().unwrap().desired_revision, 2);
    println!(
        "A08 storage: original observation time/ID/source, strict TTL, no config/inference writes, no result replay, interrupted Pending cancellation and generation invalidation verified"
    );
}
