import { invoke, isTauri } from "@tauri-apps/api/core";
import type { ApplicationView, ConfigView, DiagnosticBundle, RecoverInitialization, RecoveryOutcome, ReorderProviders, RevisionCommand, RuntimeStatus, SaveProvider } from "./contract";

export const desktop = isTauri();
export const protocolVersion = 1;

// A UI timeout stops waiting only. Mutations are never automatically replayed.
async function command<T>(name: string, args: Record<string, unknown>): Promise<T> {
  if (!desktop) throw { code: "DESKTOP_REQUIRED", retryable: false };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      invoke<T>(name, args),
      new Promise<T>((_, reject) => { timer = setTimeout(() => reject({ code: "CONFIRMATION_TIMEOUT" }), 12_000); }),
    ]);
  } finally { clearTimeout(timer); }
}

export const service = {
  view: () => command<ApplicationView>("application_view", { protocolVersion }),
  save: (input: SaveProvider) => command<ConfigView>("save_provider", { input }),
  remove: (input: RevisionCommand) => command<ConfigView>("delete_provider", { input }),
  reorder: (input: ReorderProviders) => command<ConfigView>("reorder_providers", { input }),
  startGateway: () => command<RuntimeStatus>("start_gateway", { protocolVersion }),
  stopGateway: () => command<RuntimeStatus>("stop_gateway", { protocolVersion }),
  applyGateway: () => command<RuntimeStatus>("apply_gateway", { protocolVersion }),
  quit: () => command<void>("quit_application", { protocolVersion }),
  diagnostics: () => command<DiagnosticBundle>("diagnostics_view", { protocolVersion }),
  recoverInitialization: (input:RecoverInitialization)=>command<RecoveryOutcome>("recover_initialization",{input}),
};
