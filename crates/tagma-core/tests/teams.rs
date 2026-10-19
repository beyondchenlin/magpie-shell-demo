use std::sync::Arc;
use tagma_core::{credentials::SystemCredentials, teams::*, *};

fn provider(revision: u32) -> SaveProvider {
    SaveProvider {
        protocol_version: 1,
        expected_revision: revision,
        id: None,
        name: "测试渠道".into(),
        protocol: ProviderProtocol::OpenaiChatCompletions,
        base_url: "https://example.invalid/v1".into(),
        enabled: true,
        models: vec!["answer".into(), "review".into()],
        credential: None,
    }
}
fn manual(id: &str) -> TeamRecipe {
    let target = CloudTarget {
        provider_id: id.into(),
        model_id: "answer".into(),
    };
    TeamRecipe {
        display_name: "中文小队".into(),
        brain: TeamBrain::Explicit {
            target: target.clone(),
        },
        routing: TeamRouting::Manual,
        total_timeout_ms: 30_000,
        steps: vec![TeamStep {
            target: TeamStepTarget::CloudModel {
                target: target.into(),
            },
            input: TeamStepInput::OriginalMessages,
            output: TeamStepOutput::FinalAnswer,
            timeout_ms: 30_000,
            failure: TeamFailurePolicy::Abort,
            side_effect: TeamSideEffect::OutboundModelRequest,
        }],
    }
}
fn save(revision: u32, id: Option<String>, recipe: TeamRecipe) -> SaveTeam {
    SaveTeam {
        protocol_version: 1,
        expected_revision: revision,
        id,
        slug: "my-team".into(),
        recipe,
    }
}
fn command(revision: u32, id: &str) -> RevisionCommand {
    RevisionCommand {
        protocol_version: 1,
        expected_revision: revision,
        id: id.into(),
    }
}

#[test]
fn reachflow_steps_require_installed_fixed_version_and_explicit_side_effect() {
    let temp=tempfile::tempdir().unwrap();
    let config=ConfigService::open(temp.path(),Arc::new(SystemCredentials)).unwrap();
    let id=config.save_provider(provider(0)).unwrap().providers[0].id.clone();
    let mut snapshot=config.read_snapshot().unwrap().1;
    let mut recipe=manual(&id);
    recipe.routing=TeamRouting::Sequential;
    recipe.total_timeout_ms=60_000;
    recipe.steps[0].input=TeamStepInput::PreviousText;
    recipe.steps.insert(0,TeamStep{target:TeamStepTarget::Pack{pack_id:"reachflow".into(),version:"1.0.0".into()},input:TeamStepInput::OriginalMessages,output:TeamStepOutput::IntermediateText,timeout_ms:10_000,failure:TeamFailurePolicy::Abort,side_effect:TeamSideEffect::PackOperation});
    assert!(recipe.publish_issues(&snapshot).contains(&TeamPublishIssue::PackNotAvailable));
    snapshot.installed_packs.push(tagma_core::packs::InstalledPack{id:"reachflow".into(),active_version:Some("2.0.0".into()),versions:vec![tagma_core::packs::InstalledPackVersion{version:"1.0.0".into(),preparation_id:uuid::Uuid::new_v4().to_string(),manifest_sha256:"a".repeat(64),display_name:"ReachFlow".into(),installed_ms:"1".into()}]});
    let mut active=snapshot.installed_packs[0].versions[0].clone();active.version="2.0.0".into();active.preparation_id=uuid::Uuid::new_v4().to_string();snapshot.installed_packs[0].versions.push(active);
    tagma_core::packs::validate_installations(&snapshot.installed_packs).unwrap();
    assert!(recipe.publish_issues(&snapshot).is_empty(),"fixed retained version, not active alias");
    recipe.steps[0].side_effect=TeamSideEffect::OutboundModelRequest;
    assert!(recipe.publish_issues(&snapshot).contains(&TeamPublishIssue::InvalidSideEffect));
    recipe.steps[0].side_effect=TeamSideEffect::PackOperation;
    snapshot.installed_packs[0].active_version=None;
    assert!(recipe.publish_issues(&snapshot).contains(&TeamPublishIssue::PackNotAvailable));
}

#[test]
fn published_ids_pin_recipes_while_drafts_and_availability_change() {
    let temp = tempfile::tempdir().unwrap();
    let service = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
    let p = service.save_provider(provider(0)).unwrap().providers[0]
        .id
        .clone();
    let draft = service.save_team(save(1, None, manual(&p))).unwrap();
    let id = draft.teams[0].team.id.clone();
    assert!(draft.teams[0].team.versions.is_empty());
    assert!(draft.teams[0].publish_issues.is_empty());
    let first = service.publish_team(command(2, &id)).unwrap().teams[0]
        .team
        .versions[0]
        .clone();
    assert_eq!(first.public_id, "tagma/my-team");
    assert_eq!(first.revision, 1);
    assert_eq!(
        first.permissions,
        vec![TeamPermission::OutboundModelRequest]
    );
    let mut edited = manual(&p);
    edited.display_name = "修订后的显示名".into();
    service
        .save_team(save(3, Some(id.clone()), edited.clone()))
        .unwrap();
    assert_eq!(service.view().unwrap().teams[0].team.versions[0], first);
    let second = service.publish_team(command(4, &id)).unwrap();
    assert_eq!(
        second.teams[0].team.versions[1].public_id,
        "tagma/my-team@2"
    );
    assert_eq!(second.teams[0].team.versions[0], first);
    let disabled = service
        .set_team_enabled(SetTeamEnabled {
            protocol_version: 1,
            expected_revision: 5,
            id: id.clone(),
            team_revision: 1,
            enabled: false,
        })
        .unwrap();
    assert_eq!(disabled.teams[0].team.enabled_revisions, vec![2]);
    assert!(!disabled.teams[0].published[0].enabled);
    assert!(disabled.teams[0].published[1].enabled);
    assert!(disabled.teams[0].published[0].configured_ready);
    assert_eq!(disabled.teams[0].team.versions[0], first);
    assert_eq!(
        service.delete_team(command(6, &id)).unwrap_err().code,
        ErrorCode::TeamPublished
    );
    let mut rename = save(6, Some(id.clone()), edited);
    rename.slug = "renamed".into();
    assert_eq!(
        service.save_team(rename).unwrap_err().code,
        ErrorCode::TeamPublished
    );
    drop(service);
    let reopened = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
    assert_eq!(reopened.view().unwrap().teams[0].team.versions[0], first);
    assert_eq!(reopened.view().unwrap().desired_revision, 6);
}

#[test]
fn drafts_keep_missing_dependencies_but_cannot_publish_or_escalate_permissions() {
    let temp = tempfile::tempdir().unwrap();
    let service = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
    let absent = uuid::Uuid::new_v4().to_string();
    let draft = service.save_team(save(0, None, manual(&absent))).unwrap();
    let id = draft.teams[0].team.id.clone();
    assert!(
        draft.teams[0]
            .publish_issues
            .contains(&TeamPublishIssue::MissingBrain)
    );
    assert_eq!(
        service.publish_team(command(1, &id)).unwrap_err().code,
        ErrorCode::TeamRecipeUnavailable
    );
    let mut pack = manual(&absent);
    pack.steps[0].target = TeamStepTarget::Pack {
        pack_id: "reachflow".into(),
        version: "1.0.0".into(),
    };
    pack.steps[0].side_effect = TeamSideEffect::PackOperation;
    let saved = service.save_team(save(1, Some(id.clone()), pack)).unwrap();
    assert!(
        saved.teams[0]
            .publish_issues
            .contains(&TeamPublishIssue::PackNotAvailable)
    );
    assert_eq!(
        service.publish_team(command(2, &id)).unwrap_err().code,
        ErrorCode::TeamRecipeUnavailable
    );
    let mut first_cloud = manual(&absent);
    first_cloud.brain = TeamBrain::FirstCloud {};
    first_cloud.steps[0].target = TeamStepTarget::CloudModel {
        target: CloudSelection::brain(),
    };
    let saved = service
        .save_team(save(2, Some(id.clone()), first_cloud))
        .unwrap();
    assert!(
        saved.teams[0]
            .publish_issues
            .contains(&TeamPublishIssue::NoAvailableBrain)
    );
    assert_eq!(
        service.publish_team(command(3, &id)).unwrap_err().code,
        ErrorCode::NoAvailableBrain
    );
    let json = serde_json::json!({"protocol_version":1,"expected_revision":3,"id":id,"slug":"my-team","recipe":manual(&absent),"permissions":["shell"]});
    assert!(serde_json::from_value::<SaveTeam>(json).is_err());
}

#[test]
fn slug_namespace_conflicts_and_stale_edits_do_not_rewrite_configuration() {
    for invalid in [
        "a",
        "-aa",
        "aa-",
        "UPPER",
        "中文",
        "has space",
        "a@2",
        "tagma/team",
        "reachflow",
        "local-brain",
        "",
    ] {
        assert!(!valid_team_slug(invalid), "{invalid}");
    }
    assert!(!valid_team_slug(&"a".repeat(65)));
    assert!(valid_team_slug("ab"));
    assert!(valid_team_slug("a-2"));
    assert!(valid_team_slug(&"a".repeat(64)));
    let temp = tempfile::tempdir().unwrap();
    let first = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
    let other = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
    let p = first.save_provider(provider(0)).unwrap().providers[0]
        .id
        .clone();
    let saved = first.save_team(save(1, None, manual(&p))).unwrap();
    let id = saved.teams[0].team.id.clone();
    assert_eq!(
        other
            .save_team(save(1, Some(id.clone()), manual(&p)))
            .unwrap_err()
            .code,
        ErrorCode::ConfigConflict
    );
    assert_eq!(
        other.save_team(save(2, None, manual(&p))).unwrap_err().code,
        ErrorCode::TeamSlugConflict
    );
    assert_eq!(first.view().unwrap().desired_revision, 2);
    assert_eq!(
        first.delete_provider(command(2, &p)).unwrap_err().code,
        ErrorCode::ProviderReferenced
    );
    first.delete_team(command(2, &id)).unwrap();
    assert!(
        first
            .delete_provider(command(3, &p))
            .unwrap()
            .providers
            .is_empty()
    );
}

#[test]
fn sequential_flow_budgets_side_effects_and_fixed_answering_brain_are_checked() {
    let temp = tempfile::tempdir().unwrap();
    let service = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
    let p = service.save_provider(provider(0)).unwrap().providers[0]
        .id
        .clone();
    let snapshot = service.read_snapshot().unwrap().1;
    let mut sequential = manual(&p);
    sequential.routing = TeamRouting::Sequential;
    sequential.total_timeout_ms = 60_000;
    let mut review = sequential.steps[0].clone();
    review.target = TeamStepTarget::CloudModel {
        target: CloudTarget {
            provider_id: p.clone(),
            model_id: "review".into(),
        }
        .into(),
    };
    review.output = TeamStepOutput::IntermediateText;
    sequential.steps[0].input = TeamStepInput::PreviousText;
    sequential.steps.insert(0, review);
    assert!(sequential.publish_issues(&snapshot).is_empty());
    let mut invalid = sequential.clone();
    invalid.steps[0].input = TeamStepInput::PreviousText;
    assert!(
        invalid
            .publish_issues(&snapshot)
            .contains(&TeamPublishIssue::InvalidStepFlow)
    );
    let mut invalid = sequential.clone();
    invalid.total_timeout_ms = 30_000;
    assert!(
        invalid
            .publish_issues(&snapshot)
            .contains(&TeamPublishIssue::BudgetExceeded)
    );
    let mut invalid = sequential.clone();
    invalid.steps[0].side_effect = TeamSideEffect::PackOperation;
    assert!(
        invalid
            .publish_issues(&snapshot)
            .contains(&TeamPublishIssue::InvalidSideEffect)
    );
    let mut invalid = sequential.clone();
    invalid.steps[1].output = TeamStepOutput::IntermediateText;
    assert!(
        invalid
            .publish_issues(&snapshot)
            .contains(&TeamPublishIssue::InvalidStepFlow)
    );
    let mut invalid = sequential.clone();
    invalid.brain = TeamBrain::Explicit {
        target: CloudTarget {
            provider_id: p.clone(),
            model_id: "review".into(),
        },
    };
    assert!(
        invalid
            .publish_issues(&snapshot)
            .contains(&TeamPublishIssue::InvalidStepFlow)
    );
    let saved = service.save_team(save(1, None, sequential)).unwrap();
    let id = saved.teams[0].team.id.clone();
    service.publish_team(command(2, &id)).unwrap();
    let mut replacement = provider(3);
    replacement.id = Some(p.clone());
    replacement.enabled = false;
    service.save_provider(replacement).unwrap();
    assert!(!service.view().unwrap().teams[0].published[0].configured_ready);
    assert!(
        service.view().unwrap().teams[0]
            .publish_issues
            .contains(&TeamPublishIssue::MissingDependency)
    );
    assert_eq!(
        service.delete_provider(command(4, &p)).unwrap_err().code,
        ErrorCode::ProviderReferenced
    );
    assert_eq!(
        service.publish_team(command(4, &id)).unwrap_err().code,
        ErrorCode::TeamRecipeUnavailable
    );
}

#[test]
fn malformed_or_recursive_targets_and_unbounded_drafts_are_rejected() {
    let p = uuid::Uuid::new_v4().to_string();
    let mut recipe = manual(&p);
    recipe.steps[0].timeout_ms = 0;
    assert!(recipe.validate_draft().is_err());
    let mut recipe = manual(&p);
    recipe.steps[0].target = TeamStepTarget::CloudModel {
        target: CloudTarget {
            provider_id: p.clone(),
            model_id: "tagma/another-team".into(),
        }
        .into(),
    };
    assert!(recipe.validate_draft().is_err());
    let mut recipe = manual(&p);
    recipe.display_name = "bad\nname".into();
    assert!(recipe.validate_draft().is_err());
    let mut recipe = manual(&p);
    recipe.steps = vec![recipe.steps[0].clone(); 9];
    assert!(recipe.validate_draft().is_err());
    let mut recipe = manual(&p);
    recipe.steps.clear();
    recipe.validate_draft().unwrap();
    assert!(
        recipe
            .publish_issues(&tagma_core::service::ConfigSnapshot::default())
            .contains(&TeamPublishIssue::MissingSteps)
    );
    assert!(
        serde_json::from_value::<TeamBrain>(
            serde_json::json!({"kind":"first_cloud","permissions":["shell"]})
        )
        .is_err()
    );
    assert!(serde_json::from_value::<TeamStepTarget>(serde_json::json!({"kind":"cloud_model","target":{"provider_id":p,"model_id":"answer"},"script":"no"})).is_err());
    assert!(
        <TeamBrain as ts_rs::TS>::decl(&ts_rs::Config::default())
            .contains("\"kind\": \"explicit\"")
    );
}

#[test]
fn published_provider_reference_stays_protected_after_draft_and_status_change() {
    let temp = tempfile::tempdir().unwrap();
    let service = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
    let old = service.save_provider(provider(0)).unwrap().providers[0]
        .id
        .clone();
    let new = service.save_provider(provider(1)).unwrap().providers[1]
        .id
        .clone();
    let id = service
        .save_team(save(2, None, manual(&old)))
        .unwrap()
        .teams[0]
        .team
        .id
        .clone();
    service.publish_team(command(3, &id)).unwrap();
    service
        .save_team(save(4, Some(id.clone()), manual(&new)))
        .unwrap();
    service
        .set_team_enabled(SetTeamEnabled {
            protocol_version: 1,
            expected_revision: 5,
            id,
            team_revision: 1,
            enabled: false,
        })
        .unwrap();
    assert_eq!(
        service.delete_provider(command(6, &old)).unwrap_err().code,
        ErrorCode::ProviderReferenced
    );
    assert_eq!(service.view().unwrap().desired_revision, 6);
}

#[test]
fn brain_targets_preserve_legacy_json_and_require_a_real_recent_success_to_publish() {
    let temp = tempfile::tempdir().unwrap();
    let config = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
    let p = config.save_provider(provider(0)).unwrap().providers[0].clone();
    let target = CloudTarget {
        provider_id: p.id.clone(),
        model_id: "answer".into(),
    };
    let legacy = serde_json::to_value(&target).unwrap();
    let selection: CloudSelection = serde_json::from_value(legacy.clone()).unwrap();
    assert_eq!(selection.explicit(), Some(&target));
    assert_eq!(serde_json::to_value(selection).unwrap(), legacy);
    assert_eq!(
        serde_json::to_value(CloudSelection::brain()).unwrap(),
        serde_json::json!({"kind":"brain"})
    );
    assert!(
        serde_json::from_value::<CloudSelection>(
            serde_json::json!({"kind":"brain","permissions":["shell"]})
        )
        .is_err()
    );
    let mut recipe = manual(&p.id);
    recipe.brain = TeamBrain::FirstCloud {};
    recipe.steps[0].target = TeamStepTarget::CloudModel {
        target: CloudSelection::brain(),
    };
    let id = config.save_team(save(1, None, recipe)).unwrap().teams[0]
        .team
        .id
        .clone();
    assert_eq!(
        config.publish_team(command(2, &id)).unwrap_err().code,
        ErrorCode::NoAvailableBrain
    );
    let snapshot = config.read_snapshot().unwrap().1;
    let fingerprint = tagma_core::health::provider_fingerprint(&snapshot.providers[0]);
    ConfigService::record_runtime_health(
        temp.path(),
        &p.id,
        "answer",
        &fingerprint,
        tagma_core::health::HealthObservation::CatalogSeen,
    )
    .unwrap();
    assert_eq!(
        config.publish_team(command(2, &id)).unwrap_err().code,
        ErrorCode::NoAvailableBrain
    );
    ConfigService::record_runtime_health(
        temp.path(),
        &p.id,
        "answer",
        &fingerprint,
        tagma_core::health::HealthObservation::InferenceSucceeded,
    )
    .unwrap();
    let published = config.publish_team(command(2, &id)).unwrap();
    assert!(published.teams[0].published[0].configured_ready);
    assert_eq!(
        published.teams[0].team.versions[0].public_id,
        "tagma/my-team"
    );
    ConfigService::record_runtime_health(
        temp.path(),
        &p.id,
        "answer",
        &fingerprint,
        tagma_core::health::HealthObservation::InferenceFailed(
            tagma_core::health::HealthFailure::Authentication,
        ),
    )
    .unwrap();
    assert!(!config.view().unwrap().teams[0].published[0].configured_ready);
    assert_eq!(
        config.publish_team(command(3, &id)).unwrap_err().code,
        ErrorCode::NoAvailableBrain
    );
}
