// Generated from tagma-core. Run npm run contract:generate; do not edit.
export type ErrorCode = "INVALID_INPUT" | "CONFIG_CONFLICT" | "STORAGE_UNAVAILABLE" | "CREDENTIAL_STORE_UNAVAILABLE" | "INCOMPATIBLE_VERSION" | "MAINTENANCE_IN_PROGRESS" | "DESKTOP_REQUIRED" | "INTERNAL_ERROR" | "PORT_IN_USE" | "ALREADY_RUNNING" | "GATEWAY_UNAVAILABLE" | "CONFIG_APPLY_FAILED" | "OWNERSHIP_REQUIRED" | "STARTUP_TIMEOUT" | "INITIALIZATION_RECOVERY_REQUIRED" | "PROVIDER_REFERENCED" | "RESTART_REQUIRED" | "TEAM_SLUG_CONFLICT" | "TEAM_PUBLISHED" | "TEAM_RECIPE_UNAVAILABLE";
export type AppError = { code: ErrorCode, retryable: boolean, };
export type ProviderProtocol = "openai_chat_completions";
export type Provider = { id: string, name: string, protocol: ProviderProtocol, base_url: string, enabled: boolean, models: Array<string>, has_credential: boolean, };
export type SaveProvider = { protocol_version: number, expected_revision: number, id: string | null, name: string, protocol: ProviderProtocol, base_url: string, enabled: boolean, models: Array<string>, credential: string | null, };
export type RevisionCommand = { protocol_version: number, expected_revision: number, id: string, };
export type ReorderProviders = { protocol_version: number, expected_revision: number, ids: Array<string>, };
export type AppProfile = { id: string, name: string, target_app: string, provider_ids: Array<string>, use_global_order: boolean, is_global: boolean, };
export type SaveAppProfile = { protocol_version: number, expected_revision: number, id: string | null, name: string, target_app: string, provider_ids: Array<string>, use_global_order: boolean, };
export type GatewayView = { port: number, auth_enabled: boolean, has_access_token: boolean, };
export type SaveGateway = { protocol_version: number, expected_revision: number, port: number, auth_enabled: boolean, };
export type RevisionInput = { protocol_version: number, expected_revision: number, };
export type CloudTarget = { provider_id: string, model_id: string, };
export type TeamBrain = { "kind": "explicit", target: CloudTarget, } | { "kind": "first_cloud", } | { "kind": "local_brain_pack", pack_id: string, version: string, };
export type TeamStepTarget = { "kind": "cloud_model", target: CloudTarget, } | { "kind": "pack", pack_id: string, version: string, };
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
export type TeamPublishIssue = "missing_steps" | "unsupported_routing" | "unsupported_brain" | "missing_brain" | "missing_dependency" | "pack_not_available" | "invalid_step_flow" | "invalid_side_effect" | "budget_exceeded";
export type TeamView = { team: TeamRecord, publish_issues: Array<TeamPublishIssue>, published: Array<PublishedTeamView>, };
export type PublishedTeamView = { revision: number, public_id: string, display_name: string, enabled: boolean, configured_ready: boolean, issues: Array<TeamPublishIssue>, };
export type HealthFailure = "authentication" | "connection" | "timeout" | "rate_limited" | "protocol" | "upstream";
export type InferenceHealth = "unknown" | "ready" | "stale" | "failed";
export type ModelHealthView = { provider_id: string, model_id: string, catalog_age_seconds: number | null, inference_age_seconds: number | null, inference: InferenceHealth, failure: HealthFailure | null, };
export type SaveTeam = { protocol_version: number, expected_revision: number, id: string | null, slug: string, recipe: TeamRecipe, };
export type SetTeamEnabled = { protocol_version: number, expected_revision: number, id: string, team_revision: number, enabled: boolean, };
export type ConfigView = { protocol_version: number, schema_version: number, desired_revision: number, providers: Array<Provider>, profiles: Array<AppProfile>, gateway: GatewayView, teams: Array<TeamView>, model_health: Array<ModelHealthView>, pending_credential_cleanup: number, };
export type RuntimeState = "stopped" | "starting" | "running" | "degraded" | "stopping" | "failed";
export type RuntimeStatus = { state: RuntimeState, instance_id: string | null, effective_revision: number | null, address: string | null, owned: boolean, error: AppError | null, };
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
