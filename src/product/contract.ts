// Generated from tagma-core. Run npm run contract:generate; do not edit.
export type ErrorCode = "INVALID_INPUT" | "CONFIG_CONFLICT" | "STORAGE_UNAVAILABLE" | "CREDENTIAL_STORE_UNAVAILABLE" | "INCOMPATIBLE_VERSION" | "MAINTENANCE_IN_PROGRESS" | "DESKTOP_REQUIRED" | "INTERNAL_ERROR" | "PORT_IN_USE" | "ALREADY_RUNNING" | "GATEWAY_UNAVAILABLE" | "CONFIG_APPLY_FAILED" | "OWNERSHIP_REQUIRED" | "STARTUP_TIMEOUT" | "INITIALIZATION_RECOVERY_REQUIRED" | "PROVIDER_REFERENCED" | "PROFILE_REFERENCED" | "PROBE_BACKOFF" | "PROBE_BUSY" | "ACCESS_REVOKED" | "SECURITY_STATE_UNCONFIRMED" | "USAGE_STORAGE_UNAVAILABLE" | "USAGE_QUERY_UNAVAILABLE" | "USAGE_QUERY_CANCELLED" | "USAGE_CLEAR_BUSY" | "USAGE_CLEAR_CHANGED" | "USAGE_CLEAR_UNCONFIRMED" | "RESTART_REQUIRED" | "TEAM_SLUG_CONFLICT" | "TEAM_PUBLISHED" | "TEAM_RECIPE_UNAVAILABLE" | "NO_AVAILABLE_BRAIN";
export type AppError = { code: ErrorCode, retryable: boolean, };
export type BudgetScope = { "kind": "all_attempts" } | { "kind": "provider", provider_id: string, } | { "kind": "model", provider_id: string, model_id: string, } | { "kind": "team", public_id: string, };
export type BudgetPeriod = "utc_day" | "utc_month";
export type BudgetSpec = { name: string, scope: BudgetScope, period: BudgetPeriod, request_limit: string | null, token_limit: string | null, };
export type BudgetRule = { id: string, spec: BudgetSpec, };
export type SaveBudget = { protocol_version: number, expected_revision: number, id: string | null, spec: BudgetSpec, };
export type BudgetObservation = { rule_id: string, range: UsageRange, kind: UsageMetricKind, recorded_count: string | null, known_input_tokens: string | null, known_output_tokens: string | null, unknown_input_records: string | null, unknown_output_records: string | null, token_total: string | null, request_progress_bps: number | null, token_progress_bps: number | null, request_reached: boolean | null, token_reached: boolean | null, };
export type BudgetObservations = { config_revision: number, info: UsageReadInfo,
/**
 * Every total is over retained local registrations. There is no remaining
 * allowance, price, provider balance or bill encoded in this projection.
 */
records: Array<BudgetObservation>, };
export type ProviderProtocol = "openai_chat_completions";
export type Provider = { id: string, name: string, protocol: ProviderProtocol, base_url: string, enabled: boolean, models: Array<string>, has_credential: boolean, };
export type SaveProvider = { protocol_version: number, expected_revision: number, id: string | null, name: string, protocol: ProviderProtocol, base_url: string, enabled: boolean, models: Array<string>, credential: string | null, };
export type RevisionCommand = { protocol_version: number, expected_revision: number, id: string, };
export type ReorderProviders = { protocol_version: number, expected_revision: number, ids: Array<string>, };
export type AppProfile = { id: string, name: string, target_app: string, provider_ids: Array<string>, use_global_order: boolean, is_global: boolean, };
export type SaveAppProfile = { protocol_version: number, expected_revision: number, id: string | null, name: string, target_app: string, provider_ids: Array<string>, use_global_order: boolean, };
export type FirstCloudOrder = { "kind": "global", } | { "kind": "default_app", profile_id: string, };
export type SaveFirstCloudOrder = { protocol_version: number, expected_revision: number, order: FirstCloudOrder, };
export type GatewayView = { port: number, auth_enabled: boolean, has_access_token: boolean, };
export type SaveGateway = { protocol_version: number, expected_revision: number, port: number, auth_enabled: boolean, };
export type RevisionInput = { protocol_version: number, expected_revision: number, };
export type CloudTarget = { provider_id: string, model_id: string, };
export type BrainTargetKind = "brain";
export type BrainTarget = { kind: BrainTargetKind, };
export type CloudSelection = CloudTarget | BrainTarget;
export type TeamBrain = { "kind": "explicit", target: CloudTarget, } | { "kind": "first_cloud", } | { "kind": "local_brain_pack", pack_id: string, version: string, };
export type TeamStepTarget = { "kind": "cloud_model", target: CloudSelection, } | { "kind": "pack", pack_id: string, version: string, };
export type TeamRouting = "manual" | "sequential" | "intent";
export type TeamStepInput = "original_messages" | "previous_text";
export type TeamStepOutput = "intermediate_text" | "final_answer";
export type TeamFailurePolicy = "abort";
export type TeamSideEffect = "outbound_model_request" | "pack_operation";
export type TeamStep = { target: TeamStepTarget, input: TeamStepInput, output: TeamStepOutput, timeout_ms: number, failure: TeamFailurePolicy, side_effect: TeamSideEffect, };
export type TeamRecipe = { display_name: string,
/**
 * The final answering model. Sequential intermediate models are explicit step targets.
 */
brain: TeamBrain, routing: TeamRouting, steps: Array<TeamStep>, total_timeout_ms: number, };
export type TeamPermission = "outbound_model_request";
export type PublishedTeam = { team_id: string, public_id: string, revision: number, recipe: TeamRecipe, permissions: Array<TeamPermission>, };
export type TeamRecord = { id: string, slug: string, draft: TeamRecipe, versions: Array<PublishedTeam>,
/**
 * Availability is separate from immutable recipe revisions.
 */
enabled_revisions: Array<number>, };
export type TeamPublishIssue = "missing_steps" | "unsupported_routing" | "unsupported_brain" | "missing_brain" | "no_available_brain" | "revoked_dependency" | "missing_dependency" | "pack_not_available" | "invalid_step_flow" | "invalid_side_effect" | "budget_exceeded";
export type TeamView = { team: TeamRecord, publish_issues: Array<TeamPublishIssue>, published: Array<PublishedTeamView>, };
export type PublishedTeamView = { revision: number, public_id: string, display_name: string, enabled: boolean, configured_ready: boolean, issues: Array<TeamPublishIssue>, };
export type HealthFailure = "authentication" | "connection" | "timeout" | "rate_limited" | "protocol" | "upstream" | "observation_unconfirmed";
export type InferenceHealth = "unknown" | "ready" | "stale" | "failed";
export type ModelHealthView = { provider_id: string, model_id: string, catalog_age_seconds: number | null, inference_age_seconds: number | null, inference: InferenceHealth, failure: HealthFailure | null, };
export type CatalogOutcome = "pending" | "available" | "authentication" | "rate_limited" | "unsupported" | "network" | "tls" | "timeout" | "protocol" | "upstream" | "cancelled";
export type CatalogView = { provider_id: string, request_id: string, attempted_ms: number, finished_ms: number | null, outcome: CatalogOutcome, http_status: number | null, catalog_ms: number | null, models: Array<string>, stale: boolean, next_allowed_ms: number, source: string, manual_inference_required: boolean, };
export type ProbeProvider = { protocol_version: number, expected_revision: number, provider_id: string, request_id: string, };
export type RevokeKind = "gateway_token" | "provider_connection";
export type RevokeAccess = { protocol_version: number, expected_revision: number, kind: RevokeKind, provider_id: string | null, cancel_inflight: boolean, };
export type RotateGatewayToken = { protocol_version: number, expected_revision: number, cancel_inflight: boolean, };
export type SecurityView = { revision: number, gateway_token_revoked: boolean, revoked_provider_ids: Array<string>, };
export type RevocationReceipt = { revision: number, cancel_inflight: boolean, };
export type UsageRange = { start_ms: number, end_ms: number, };
export type UsageRecordState = "running" | "succeeded" | "failed" | "cancelled" | "interrupted";
export type UsageFilter = { provider_id: string | null, model: string | null, config_revision: number | null, team_revision: number | null, state: UsageRecordState | null, error_code: string | null, };
export type UsageCursor = { context_id: string, generation: string, started_ms: number, request_id: string, };
export type UsageRequestsQuery = { protocol_version: number, range: UsageRange, filter: UsageFilter, cursor: UsageCursor | null, limit: number, };
export type UsageDetailsQuery = { protocol_version: number, request_id: string, };
export type UsageMetricKind = "request" | "attempt";
export type UsageSummaryCursor = { context_id: string, generation: string, day_ms: number, provider_id: string, model: string, config_revision: number, team_revision: number, state: UsageRecordState, };
export type UsageSummaryQuery = { protocol_version: number, range: UsageRange, filter: UsageFilter, kind: UsageMetricKind, cursor: UsageSummaryCursor | null, limit: number, };
export type UsageAvailability = "not_created" | "available";
export type UsageReadInfo = { context_id: string, generation: string | null, availability: UsageAvailability, observed_ms: number, detail_start_ms: number | null,
/**
 * Earliest currently retained UTC daily bucket, not an activity guarantee.
 */
summary_start_ms: number | null, timezone: string, };
export type UsageRequestView = { request_id: string, provider_id: string, model: string, config_revision: number, team_revision: number | null, started_ms: number, finished_ms: number | null, state: UsageRecordState, error_code: string | null, input_tokens: string | null, output_tokens: string | null, };
export type UsageAttemptView = { ordinal: number, provider_id: string, model: string, started_ms: number, finished_ms: number | null, state: UsageRecordState, error_code: string | null, input_tokens: string | null, output_tokens: string | null, };
export type UsageRequestsView = { info: UsageReadInfo, records: Array<UsageRequestView>, next_cursor: UsageCursor | null, };
export type UsageDetailsView = { info: UsageReadInfo, record: UsageRequestView | null, attempts: Array<UsageAttemptView>, };
export type UsageSummaryRow = { day_ms: number, provider_id: string, model: string, config_revision: number, team_revision: number | null, state: UsageRecordState, count: string, input_known: string, input_unknown: string, output_known: string, output_unknown: string, elapsed_ms: string, };
export type UsageSummaryTotals = { total: string, completed: string, unfinished: string, succeeded: string, failed: string, cancelled: string, interrupted: string, input_known: string, input_unknown: string, output_known: string, output_unknown: string, input_total: string | null, output_total: string | null, elapsed_ms: string, };
export type UsageSummaryView = { info: UsageReadInfo, kind: UsageMetricKind, records: Array<UsageSummaryRow>, totals: UsageSummaryTotals | null, next_cursor: UsageSummaryCursor | null, };
export type UsageClearPlan = { context_id: string, operation_id: string, range: UsageRange, expected_revision: string, generation: string, requests: string,
/**
 * All attempts cascading from selected logical requests, even across days.
 */
attempts: string, summary_buckets: string, };
export type UsageClearReceipt = { plan: UsageClearPlan, generation: string, committed_ms: number, };
export type SaveTeam = { protocol_version: number, expected_revision: number, id: string | null, slug: string, recipe: TeamRecipe, };
export type SetTeamEnabled = { protocol_version: number, expected_revision: number, id: string, team_revision: number, enabled: boolean, };
export type ConfigView = { budgets: Array<BudgetRule>, security: SecurityView, protocol_version: number, schema_version: number, desired_revision: number, providers: Array<Provider>, profiles: Array<AppProfile>, first_cloud_order: FirstCloudOrder, gateway: GatewayView, teams: Array<TeamView>, model_health: Array<ModelHealthView>, provider_catalog: Array<CatalogView>, pending_credential_cleanup: number, };
export type RuntimeState = "stopped" | "starting" | "running" | "degraded" | "stopping" | "failed";
export type RuntimeStatus = { usage_degraded: boolean | null, usage_pending_results: number | null, security_revision: number | null, state: RuntimeState, instance_id: string | null, effective_revision: number | null, address: string | null, owned: boolean, error: AppError | null, };
export type ApplicationView = { product_version: string, config: ConfigView, runtime: RuntimeStatus, };
export type Component = "desktop" | "gateway";
export type Event = "starting" | "ready" | "attached" | "start_failed" | "apply_succeeded" | "apply_failed" | "crash_detected" | "restart_attempt" | "restart_exhausted" | "stop_requested" | "stopped" | "configuration_unavailable";
export type Record = { unix_seconds: number, component: Component, event: Event, code: ErrorCode | null, revision: number | null, };
export type DiagnosticBundle = { product_version: string, protocol_version: number, platform: string, architecture: string, supported_schema_version: number, config_schema_version: number | null, desired_revision: number | null, runtime: RuntimeStatus, console_attached: boolean, sidecar_console_attached: boolean | null, logging_available: boolean, max_log_bytes: number, max_log_files: number, telemetry_enabled: boolean, recent_events: Array<Record>, initialization_recovery: InitializationRecoveryPlan | null, };
export type InitializationRecoveryPlan = { operation_id: string, record_path: string, archive_path: string, expected_sha256: string, };
export type RecoverInitialization = { protocol_version: number, operation_id: string, expected_sha256: string, };
export type RecoveryOutcome = { archive_path: string, requires_restart: boolean, };
export type ChatMessage = { role: string, content: string, };
export type StartChat = { protocol_version: number, request_id: string, expected_revision: number, model: string, messages: Array<ChatMessage>, };
export type ChatEvent = { "kind": "started" } | { "kind": "delta", text: string, } | { "kind": "finished", reason: string, } | { "kind": "cancelled" } | { "kind": "failed", code: string, };
