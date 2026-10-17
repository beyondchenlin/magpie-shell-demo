// Generated from tagma-core. Run npm run contract:generate; do not edit.
export type ErrorCode = "INVALID_INPUT" | "CONFIG_CONFLICT" | "STORAGE_UNAVAILABLE" | "CREDENTIAL_STORE_UNAVAILABLE" | "INCOMPATIBLE_VERSION" | "MAINTENANCE_IN_PROGRESS" | "DESKTOP_REQUIRED" | "INTERNAL_ERROR";
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
