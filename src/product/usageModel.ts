import type { UsageDetailsView, UsageFilter, UsageMetricKind, UsageRange, UsageReadInfo, UsageRequestsQuery, UsageRequestsView, UsageSummaryQuery, UsageSummaryView } from "./contract";
import type {UsageBarrier} from "./usageClearModel";

const day = 86_400_000;
export type UsageDraft = { from: string; through: string; provider: string; model: string; state: string; error: string; config: string; team: string; kind: UsageMetricKind };
export type UsageSelection = { range: UsageRange; filter: UsageFilter; kind: UsageMetricKind };
export type UsageData = { selection: UsageSelection; requests: UsageRequestsView; summary: UsageSummaryView | null };
type UsageAPI = {
  usageRequests(input: UsageRequestsQuery): Promise<UsageRequestsView>;
  usageSummary(input: UsageSummaryQuery): Promise<UsageSummaryView>;
  usageDetails(input: { protocol_version: number; request_id: string }): Promise<UsageDetailsView>;
};
export type UsageReadState = { busy: boolean; data: UsageData | null; detail: UsageDetailsView | null; error: unknown };

export function usageDefault(now = Date.now()): UsageDraft {
  const today = Math.floor(now / day) * day;
  return { from: new Date(today - 29 * day).toISOString().slice(0, 10), through: new Date(today).toISOString().slice(0, 10), provider: "", model: "", state: "", error: "", config: "", team: "", kind: "request" };
}
export function usageSelection(draft: UsageDraft): UsageSelection {
  const invalid = () => { throw { code: "INVALID_INPUT" }; };
  function date(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return invalid();
    const millis = Date.parse(`${value}T00:00:00Z`);
    if (!Number.isSafeInteger(millis) || millis < 0 || new Date(millis).toISOString().slice(0, 10) !== value) return invalid();
    return millis;
  }
  function revision(value: string, positive: boolean): number | null {
    if (!value) return null;
    if (!/^\d+$/.test(value)) return invalid();
    const number = Number(value);
    if (!Number.isInteger(number) || number > 4_294_967_295 || (positive && number === 0)) return invalid();
    return number;
  }
  const range = { start_ms: date(draft.from), end_ms: date(draft.through) + day };
  if (range.end_ms <= range.start_ms || range.end_ms - range.start_ms > 366 * day) return invalid();
  const states = ["running", "succeeded", "failed", "cancelled", "interrupted"] as const;
  const state = states.find(state => state === draft.state) ?? null;
  if (draft.state && !state) return invalid();
  if (draft.kind !== "request" && draft.kind !== "attempt") return invalid();
  if (draft.provider && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(draft.provider)) return invalid();
  const hasControl = [...draft.model].some(character => { const code = character.charCodeAt(0); return code < 32 || (code >= 127 && code <= 159); });
  if ((draft.model && (!draft.model.trim() || new TextEncoder().encode(draft.model).length > 256 || hasControl)) || (draft.error && !/^[A-Z0-9_]{1,64}$/.test(draft.error))) return invalid();
  return { range, kind: draft.kind, filter: { provider_id: draft.provider || null, model: draft.model || null, state, error_code: draft.error || null, config_revision: revision(draft.config, false), team_revision: revision(draft.team, true) } };
}

// Keep integer strings exact. Never convert usage counters through Number.
export function usageNumber(value: string | null, unknown: string): string {
  return value === null ? unknown : value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
export function usageUtc(value: number): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? `${value} ms UTC` : date.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

export function assertUsageRead(info: UsageReadInfo | undefined, barrier: UsageBarrier | null) {
  if (!barrier) return;
  if (barrier.blocked) throw barrier.error ?? { code: "USAGE_CLEAR_UNCONFIRMED" };
  if (info && (info.context_id !== barrier.context || (info.generation === null ? BigInt(barrier.floor) > 0n : !/^(0|[1-9][0-9]{0,18})$/.test(info.generation) || BigInt(info.generation) > 9223372036854775807n || BigInt(info.generation) < BigInt(barrier.floor)))) throw { code: "USAGE_CLEAR_CHANGED" };
}

// One source of async ownership. Each screen mount creates a fresh loader.
// Requests and summary are sequential because the native reader has one slot.
// Results from a superseded query or disposed screen cannot repopulate its cache.
export class UsageLoader {
  private generation = 0;
  private disposed = false;
  private state: UsageReadState = { busy: false, data: null, detail: null, error: null };
  private api: UsageAPI;
  private publish: (state: UsageReadState) => void;
  private barrier:()=>UsageBarrier|null;
  constructor(api: UsageAPI, publish: (state: UsageReadState) => void,barrier:()=>UsageBarrier|null=()=>null) { this.api = api; this.publish = publish; this.barrier=barrier; }
  dispose() { this.disposed = true; this.generation++; }
  invalidate() {this.generation++;if(!this.disposed)this.update({busy:false,data:null,detail:null,error:null});}
  private allow(info?:UsageReadInfo) {
    assertUsageRead(info,this.barrier());
  }
  private update(state: UsageReadState) { this.state = state; this.publish(state); }
  async load(selection: UsageSelection, next = false) {
    if (this.disposed || this.state.busy) return;
    const previous = next ? this.state.data : null;
    const cursor = previous?.requests.next_cursor ?? null;
    if (next && !cursor) return;
    if (previous) selection = previous.selection;
    const generation = ++this.generation;
    this.update({ busy: true, data: null, detail: null, error: null });
    try {
      this.allow();
      const requests = await this.api.usageRequests({ protocol_version: 1, range: selection.range, filter: selection.filter, cursor, limit: 32 });
      if (this.disposed || generation !== this.generation) return;
      this.allow(requests.info);
      // Error-code filtering has no daily-summary equivalent. Never silently
      // drop that filter and present a broader total beside filtered requests.
      const summary = selection.filter.error_code ? null : previous?.summary ?? await this.api.usageSummary({ protocol_version: 1, range: selection.range, filter: selection.filter, kind: selection.kind, cursor: null, limit: 1 });
      if(summary)this.allow(summary.info);
      if (summary && (summary.info.generation !== requests.info.generation || summary.info.context_id!==requests.info.context_id)) throw { code: "USAGE_CLEAR_CHANGED" };
      if (!this.disposed && generation === this.generation) this.update({ busy: false, data: { selection, requests, summary }, detail: null, error: null });
    } catch (error) {
      if (!this.disposed && generation === this.generation) this.update({ busy: false, data: null, detail: null, error });
    }
  }
  async inspect(requestId: string) {
    if (this.disposed || this.state.busy) return;
    const generation = ++this.generation;
    this.update({ ...this.state, busy: true, detail: null, error: null });
    try {
      this.allow();
      const detail = await this.api.usageDetails({ protocol_version: 1, request_id: requestId });
      this.allow(detail.info);
      if (!this.disposed && generation === this.generation) this.update({ ...this.state, data: this.state.data?.requests.info.generation === detail.info.generation && this.state.data.requests.info.context_id===detail.info.context_id ? this.state.data : null, busy: false, detail, error: null });
    } catch (error) {
      if (!this.disposed && generation === this.generation) this.update({ ...this.state, busy: false, detail: null, error });
    }
  }
}
