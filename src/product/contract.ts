// Generated from tagma-core. Run npm run contract:generate; do not edit.
export type ErrorCode = "INVALID_INPUT" | "CONFIG_CONFLICT" | "STORAGE_UNAVAILABLE" | "CREDENTIAL_STORE_UNAVAILABLE" | "INCOMPATIBLE_VERSION" | "MAINTENANCE_IN_PROGRESS" | "DESKTOP_REQUIRED" | "INTERNAL_ERROR" | "PORT_IN_USE" | "ALREADY_RUNNING" | "GATEWAY_UNAVAILABLE" | "CONFIG_APPLY_FAILED" | "OWNERSHIP_REQUIRED" | "STARTUP_TIMEOUT";
export type AppError = { code: ErrorCode, retryable: boolean, };
export type ProviderProtocol = "openai_chat_completions";
export type Provider = { id: string, name: string, protocol: ProviderProtocol, base_url: string, enabled: boolean, models: Array<string>, has_credential: boolean, };
export type SaveProvider = { protocol_version: number, expected_revision: number, id: string | null, name: string, protocol: ProviderProtocol, base_url: string, enabled: boolean, models: Array<string>, credential: string | null, };
export type RevisionCommand = { protocol_version: number, expected_revision: number, id: string, };
export type ReorderProviders = { protocol_version: number, expected_revision: number, ids: Array<string>, };
export type ConfigView = { protocol_version: number, schema_version: number, desired_revision: number, providers: Array<Provider>, pending_credential_cleanup: number, };
export type RuntimeState = "stopped" | "starting" | "running" | "degraded" | "stopping" | "failed";
export type RuntimeStatus = { state: RuntimeState, instance_id: string | null, effective_revision: number | null, address: string | null, owned: boolean, error: AppError | null, };
export type ApplicationView = { product_version: string, config: ConfigView, runtime: RuntimeStatus, };
export type Component = "desktop" | "gateway";
export type Event = "starting" | "ready" | "attached" | "start_failed" | "apply_succeeded" | "apply_failed" | "crash_detected" | "restart_attempt" | "restart_exhausted" | "stop_requested" | "stopped" | "configuration_unavailable";
export type Record = { unix_seconds: number, component: Component, event: Event, code: ErrorCode | null, revision: number | null, };
export type DiagnosticBundle = { product_version: string, protocol_version: number, platform: string, architecture: string, supported_schema_version: number, config_schema_version: number | null, desired_revision: number | null, runtime: RuntimeStatus, console_attached: boolean, sidecar_console_attached: boolean | null, logging_available: boolean, max_log_bytes: number, max_log_files: number, telemetry_enabled: boolean, recent_events: Array<Record>, };
