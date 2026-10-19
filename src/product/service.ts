import { invoke, isTauri, Channel } from "@tauri-apps/api/core";
import type {PackMarketView,PackReviewView,PackTaskEvent,ConfirmPackInstall,InvokePack} from "./contract";
import type { StartChat, ChatEvent } from "./contract";
import type {UsageReadInfo,UsageClearPlan,UsageClearReceipt,UsageRange} from "./contract";
import type {SaveBudget,BudgetObservations} from "./contract";
import type {SaveProviderTimeouts} from "./contract";
import type { UsageRequestsQuery, UsageRequestsView, UsageDetailsQuery, UsageDetailsView, UsageSummaryQuery, UsageSummaryView } from "./contract";
import type { SaveTeam, SetTeamEnabled, SaveFirstCloudOrder, ProbeProvider, RevokeAccess, RotateGatewayToken } from "./contract";
import type { ApplicationView, ConfigView, DiagnosticBundle, RecoverInitialization, RecoveryOutcome, ReorderProviders, RevisionCommand, RuntimeStatus, SaveProvider, SaveAppProfile, SaveGateway, RevisionInput } from "./contract";

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
  managePack:(input:import("./contract").ManagePack,onEvent:(event:PackTaskEvent)=>void)=>{const channel=new Channel<PackTaskEvent>();channel.onmessage=onEvent;return invoke<ConfigView>("manage_pack",{input,onEvent:channel});},
  listPackResults:(directory:string)=>command<import("./contract").SavedPackResult[]>("list_pack_results",{protocolVersion,directory}),
  readPackResult:(directory:string,name:string)=>command<string>("read_pack_result",{protocolVersion,directory,name}),
  savePackResult:(directory:string,raw:string)=>command<string>("save_pack_result",{protocolVersion,directory,raw}),
  packMarket:()=>command<PackMarketView>("pack_market",{protocolVersion}),
  reviewPack:(record:string)=>command<PackReviewView>("review_pack",{protocolVersion,record}),
  installPack:(input:ConfirmPackInstall,onEvent:(event:PackTaskEvent)=>void)=>{const channel=new Channel<PackTaskEvent>();channel.onmessage=onEvent;return invoke<ConfigView>("install_pack",{input,onEvent:channel});},
  invokePack:(input:InvokePack,onEvent:(event:PackTaskEvent)=>void)=>{const channel=new Channel<PackTaskEvent>();channel.onmessage=onEvent;return invoke<void>("invoke_pack",{input,onEvent:channel});},
  cancelPack:(taskId:string)=>command<void>("cancel_pack",{protocolVersion,taskId}),
  saveProviderTimeouts:(input:SaveProviderTimeouts)=>command<ConfigView>("save_provider_timeouts",{input}),
  saveBudget:(input:SaveBudget)=>command<ConfigView>("save_budget",{input}),
  deleteBudget:(input:RevisionCommand)=>command<ConfigView>("delete_budget",{input}),
  budgetObservations:(revision:number)=>command<BudgetObservations>("usage_budgets",{input:{protocol_version:protocolVersion,expected_revision:revision}}),
  usageContext:()=>command<UsageReadInfo>("usage_context",{protocolVersion}),
  prepareUsageClear:(range:UsageRange)=>command<UsageClearPlan>("prepare_usage_clear",{protocolVersion,range}),
  clearUsage:(plan:UsageClearPlan)=>command<UsageClearReceipt>("clear_usage",{protocolVersion,plan}),
  usageRequests:(input:UsageRequestsQuery)=>command<UsageRequestsView>("usage_requests",{input}),
  usageDetails:(input:UsageDetailsQuery)=>command<UsageDetailsView>("usage_details",{input}),
  usageSummary:(input:UsageSummaryQuery)=>command<UsageSummaryView>("usage_summary",{input}),
  recoverUsage:()=>command<RuntimeStatus>("recover_usage",{protocolVersion}),
  revokeAccess:(input:RevokeAccess)=>command<ConfigView>("revoke_access",{input}),
  rotateGatewayToken:(input:RotateGatewayToken)=>command<ConfigView>("rotate_gateway_token",{input}),
  probeProvider:(input:ProbeProvider)=>command<ConfigView>("probe_provider",{input}),
  cancelProbe:(requestId:string)=>command<void>("cancel_probe",{protocolVersion,requestId}),
  saveTeam: (input: SaveTeam) => command<ConfigView>("save_team", { input }),
  publishTeam: (input: RevisionCommand) => command<ConfigView>("publish_team", { input }),
  setTeamEnabled: (input: SetTeamEnabled) => command<ConfigView>("set_team_enabled", { input }),
  deleteTeam: (input: RevisionCommand) => command<ConfigView>("delete_team", { input }),
  sendChat: (input: StartChat, onEvent: (event: ChatEvent) => void) => {
    const channel = new Channel<ChatEvent>();
    channel.onmessage = onEvent;
    return invoke<void>("send_chat", { input, onEvent: channel });
  },
  cancelChat: (requestId: string) => command<void>("cancel_chat", { protocolVersion, requestId }),
  view: () => command<ApplicationView>("application_view", { protocolVersion }),
  save: (input: SaveProvider) => command<ConfigView>("save_provider", { input }),
  remove: (input: RevisionCommand) => command<ConfigView>("delete_provider", { input }),
  reorder: (input: ReorderProviders) => command<ConfigView>("reorder_providers", { input }),
  saveFirstCloudOrder: (input: SaveFirstCloudOrder) => command<ConfigView>("save_first_cloud_order", { input }),
  saveProfile: (input: SaveAppProfile) => command<ConfigView>("save_profile", { input }),
  deleteProfile: (input: RevisionCommand) => command<ConfigView>("delete_profile", { input }),
  saveGateway: (input: SaveGateway) => command<ConfigView>("save_gateway", { input }),
  initializeToken: (input: RevisionInput) => command<ConfigView>("initialize_gateway_token", { input }),
  revealToken: () => command<string>("reveal_gateway_token", { protocolVersion }),
  startGateway: () => command<RuntimeStatus>("start_gateway", { protocolVersion }),
  stopGateway: () => command<RuntimeStatus>("stop_gateway", { protocolVersion }),
  applyGateway: () => command<RuntimeStatus>("apply_gateway", { protocolVersion }),
  quit: () => command<void>("quit_application", { protocolVersion }),
  confirmQuit: () => command<void>("confirm_quit", { protocolVersion }),
  diagnostics: () => command<DiagnosticBundle>("diagnostics_view", { protocolVersion }),
  recoverInitialization: (input:RecoverInitialization)=>command<RecoveryOutcome>("recover_initialization",{input}),
};
