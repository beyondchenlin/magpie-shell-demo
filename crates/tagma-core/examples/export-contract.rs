use tagma_core::budgets::*;
use tagma_core::diagnostics::{Component, DiagnosticBundle, Event, Record};
use tagma_core::teams::*;
use tagma_core::timeouts::*;
use tagma_core::usage::clear::*;
use tagma_core::usage::read::budgets::{BudgetObservation, BudgetObservations};
use tagma_core::usage::read::*;
use tagma_core::*;
use ts_rs::TS;

fn main() {
    let cfg = ts_rs::Config::default();
    let declarations = [
        packs::PackUiError::decl(&cfg),
        packs::PackReviewView::decl(&cfg),
        packs::PackTaskEvent::decl(&cfg),
        packs::PackMarketView::decl(&cfg),
        packs::ConfirmPackInstall::decl(&cfg),
        packs::InvokePack::decl(&cfg),
        packs::PackUserOperation::decl(&cfg),
        packs::ReachFlowRequest::decl(&cfg),
        packs::ReachFlowAction::decl(&cfg),
        packs::InstalledPackVersion::decl(&cfg),
        packs::InstalledPack::decl(&cfg),
        ErrorCode::decl(&cfg),
        AppError::decl(&cfg),
        BudgetScope::decl(&cfg),
        BudgetPeriod::decl(&cfg),
        BudgetSpec::decl(&cfg),
        BudgetRule::decl(&cfg),
        SaveBudget::decl(&cfg),
        BudgetObservation::decl(&cfg),
        BudgetObservations::decl(&cfg),
        ProviderProtocol::decl(&cfg),
        ProviderTimeouts::decl(&cfg),
        SaveProviderTimeouts::decl(&cfg),
        Provider::decl(&cfg),
        SaveProvider::decl(&cfg),
        RevisionCommand::decl(&cfg),
        ReorderProviders::decl(&cfg),
        AppProfile::decl(&cfg),
        SaveAppProfile::decl(&cfg),
        FirstCloudOrder::decl(&cfg),
        SaveFirstCloudOrder::decl(&cfg),
        GatewayView::decl(&cfg),
        SaveGateway::decl(&cfg),
        RevisionInput::decl(&cfg),
        CloudTarget::decl(&cfg),
        BrainTargetKind::decl(&cfg),
        BrainTarget::decl(&cfg),
        CloudSelection::decl(&cfg),
        TeamBrain::decl(&cfg),
        TeamStepTarget::decl(&cfg),
        TeamRouting::decl(&cfg),
        TeamStepInput::decl(&cfg),
        TeamStepOutput::decl(&cfg),
        TeamFailurePolicy::decl(&cfg),
        TeamSideEffect::decl(&cfg),
        TeamStep::decl(&cfg),
        TeamRecipe::decl(&cfg),
        TeamPermission::decl(&cfg),
        PublishedTeam::decl(&cfg),
        TeamRecord::decl(&cfg),
        TeamPublishIssue::decl(&cfg),
        TeamView::decl(&cfg),
        PublishedTeamView::decl(&cfg),
        health::HealthFailure::decl(&cfg),
        health::InferenceHealth::decl(&cfg),
        health::ModelHealthView::decl(&cfg),
        catalog::CatalogOutcome::decl(&cfg),
        catalog::CatalogView::decl(&cfg),
        catalog::ProbeProvider::decl(&cfg),
        security::RevokeKind::decl(&cfg),
        security::RevokeAccess::decl(&cfg),
        security::RotateGatewayToken::decl(&cfg),
        security::SecurityView::decl(&cfg),
        security::RevocationReceipt::decl(&cfg),
        UsageRange::decl(&cfg),
        UsageRecordState::decl(&cfg),
        UsageFilter::decl(&cfg),
        UsageCursor::decl(&cfg),
        UsageRequestsQuery::decl(&cfg),
        UsageDetailsQuery::decl(&cfg),
        UsageMetricKind::decl(&cfg),
        UsageSummaryCursor::decl(&cfg),
        UsageSummaryQuery::decl(&cfg),
        UsageAvailability::decl(&cfg),
        UsageReadInfo::decl(&cfg),
        UsageRequestView::decl(&cfg),
        UsageAttemptView::decl(&cfg),
        UsageRequestsView::decl(&cfg),
        UsageDetailsView::decl(&cfg),
        UsageSummaryRow::decl(&cfg),
        UsageSummaryTotals::decl(&cfg),
        UsageSummaryView::decl(&cfg),
        UsageClearPlan::decl(&cfg),
        UsageClearReceipt::decl(&cfg),
        SaveTeam::decl(&cfg),
        SetTeamEnabled::decl(&cfg),
        ConfigView::decl(&cfg),
        RuntimeState::decl(&cfg),
        RuntimeStatus::decl(&cfg),
        ApplicationView::decl(&cfg),
        Component::decl(&cfg),
        Event::decl(&cfg),
        Record::decl(&cfg),
        DiagnosticBundle::decl(&cfg),
        InitializationRecoveryPlan::decl(&cfg),
        RecoverInitialization::decl(&cfg),
        RecoveryOutcome::decl(&cfg),
        chat::ChatMessage::decl(&cfg),
        chat::StartChat::decl(&cfg),
        chat::ChatEvent::decl(&cfg),
    ];
    let content = format!(
        "// Generated from tagma-core. Run npm run contract:generate; do not edit.\n{}\n",
        declarations
            .iter()
            .map(|d| format!(
                "export {}",
                d.lines().map(str::trim_end).collect::<Vec<_>>().join("\n")
            ))
            .collect::<Vec<_>>()
            .join("\n")
    );
    let path =
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../src/product/contract.ts");
    if std::env::args().any(|a| a == "--check") {
        assert_eq!(
            std::fs::read_to_string(path).expect("generate contract first"),
            content,
            "DTO drift; regenerate contract"
        );
    } else {
        std::fs::write(path, content).expect("write contract");
    }
}
