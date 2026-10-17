import type { RuntimeStatus, UsageClearPlan, UsageClearReceipt, UsageRange, UsageReadInfo } from "./contract";

type Saved = { version: 1; context_id: string; floor: string; pending: UsageClearPlan | null; unresolved: UsageClearPlan | null };
type Store = Pick<Storage, "getItem" | "setItem">;
type API = { usageContext(): Promise<UsageReadInfo>; prepareUsageClear(range: UsageRange): Promise<UsageClearPlan>; clearUsage(plan: UsageClearPlan): Promise<UsageClearReceipt>; recoverUsage(): Promise<RuntimeStatus> };
export type ClearState = { busy: boolean; preview: UsageClearPlan | null; pending: UsageClearPlan | null; unresolved: UsageClearPlan | null; receipt: UsageClearReceipt | null; error: unknown; storageBlocked: boolean; recovered: boolean };
export type UsageBarrier = { context: string; floor: string; blocked: boolean; error?: unknown };
const day = 86_400_000;
const fail = () => ({ code: "USAGE_CLEAR_STATE_UNAVAILABLE" });
const changed = () => ({ code: "USAGE_CLEAR_CHANGED" });
function decimal(value: unknown): value is string { return typeof value === "string" && /^(0|[1-9][0-9]{0,18})$/.test(value) && BigInt(value) <= 9223372036854775807n; }
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function keys(value: Record<string, unknown>, expected: string[]) { return Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key)); }
function validPlan(value: unknown, context: string): value is UsageClearPlan {
  if (!object(value) || !keys(value, ["context_id", "operation_id", "range", "expected_revision", "generation", "requests", "attempts", "summary_buckets"]) || value.context_id !== context || typeof value.operation_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value.operation_id) || !object(value.range) || !keys(value.range, ["start_ms", "end_ms"])) return false;
  const { start_ms: start, end_ms: end } = value.range;
  return typeof start === "number" && typeof end === "number" && Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && start % day === 0 && end % day === 0 && end > start && end - start <= 366 * day && [value.expected_revision, value.generation, value.requests, value.attempts, value.summary_buckets].every(decimal);
}
function samePlan(a: UsageClearPlan, b: UsageClearPlan) { return a.context_id === b.context_id && a.operation_id === b.operation_id && a.range.start_ms === b.range.start_ms && a.range.end_ms === b.range.end_ms && a.expected_revision === b.expected_revision && a.generation === b.generation && a.requests === b.requests && a.attempts === b.attempts && a.summary_buckets === b.summary_buckets; }
function maximum(a: string, b: string) { return BigInt(a) >= BigInt(b) ? a : b; }
function validInfo(info: UsageReadInfo, context: string) { return info.context_id === context && (info.generation === null || decimal(info.generation)); }

export class UsageClearSession {
  readonly context: string;
  private key: string;
  private store: Store;
  private api: API;
  private publish: (state: ClearState) => void;
  private invalidate: () => void;
  private disposed = false;
  private epoch = 0;
  private floor = "0";
  private state: ClearState = { busy: false, preview: null, pending: null, unresolved: null, receipt: null, error: null, storageBlocked: false, recovered: false };
  constructor(api: API, info: UsageReadInfo, store: Store, publish: (state: ClearState) => void, invalidate: () => void) {
    this.api = api; this.context = info.context_id; this.key = `tagma.usage-clear.v1.${this.context}`; this.store = store; this.publish = publish; this.invalidate = invalidate;
    try {
      if (!/^[0-9a-f]{64}$/.test(this.context) || !validInfo(info, this.context)) throw fail();
      this.floor = info.generation ?? "0";
      const saved = this.save(saved => ({ ...saved, floor: maximum(saved.floor, this.floor) }));
      this.state = { ...this.state, pending: saved.pending, unresolved: saved.unresolved };
    } catch { this.state = { ...this.state, storageBlocked: true, error: fail() }; }
    this.emit();
  }
  dispose() { this.disposed = true; this.epoch++; }
  private emit() { if (!this.disposed) this.publish(this.state); }
  private update(change: Partial<ClearState>) { this.state = { ...this.state, ...change }; this.emit(); }
  private read(): Saved {
    const raw = this.store.getItem(this.key);
    if (raw === null) return { version: 1, context_id: this.context, floor: this.floor, pending: null, unresolved: null };
    if (raw.length > 8192) throw fail();
    const value: unknown = JSON.parse(raw);
    if (!object(value) || !keys(value, ["version", "context_id", "floor", "pending", "unresolved"]) || value.version !== 1 || value.context_id !== this.context || !decimal(value.floor) || (value.pending !== null && !validPlan(value.pending, this.context)) || (value.unresolved !== null && !validPlan(value.unresolved, this.context))) throw fail();
    return value as Saved;
  }
  private save(change: (saved: Saved) => Saved): Saved {
    try {
      const saved = change(this.read()); saved.floor = maximum(saved.floor, this.floor);
      const json = JSON.stringify(saved); if (json.length > 8192) throw fail();
      this.store.setItem(this.key, json); this.floor = saved.floor; return saved;
    } catch (error) { if (error && typeof error === "object" && "code" in error && error.code === "USAGE_CLEAR_CHANGED") throw error; throw fail(); }
  }
  barrier(): UsageBarrier {
    try { const saved = this.read(); this.floor = maximum(this.floor, saved.floor); return { context: this.context, floor: this.floor, blocked: !!saved.pending || this.state.storageBlocked, error: this.state.storageBlocked ? fail() : { code: "USAGE_CLEAR_UNCONFIRMED" } }; }
    catch { return { context: this.context, floor: this.floor, blocked: true, error: fail() }; }
  }
  cancelPreview() { if (!this.state.busy) this.update({ preview: null, error: null }); }
  async prepare(range: UsageRange) {
    if (this.disposed || this.state.busy) return;
    const barrier=this.barrier();if(barrier.blocked){this.update({error:barrier.error});return;}
    const epoch = ++this.epoch; this.update({ busy: true, preview: null, receipt: null, error: null, recovered: false });
    try {
      const plan = await this.api.prepareUsageClear(range);
      if (!validPlan(plan, this.context) || plan.range.start_ms !== range.start_ms || plan.range.end_ms !== range.end_ms || BigInt(plan.generation) < BigInt(this.floor)) throw changed();
      if (!this.disposed && epoch === this.epoch) this.update({ busy: false, preview: plan });
    } catch (error) { if (!this.disposed && epoch === this.epoch) this.update({ busy: false, error }); }
  }
  async confirm(retry = false) {
    if (this.disposed || this.state.busy || this.state.storageBlocked) return;
    const plan = retry ? this.state.pending : this.state.preview; if (!plan) return;
    // Durable local verification intent BEFORE invoking the native mutation.
    try {
      const saved = this.save(saved => { if (saved.pending && !samePlan(saved.pending, plan)) throw changed(); return { ...saved, pending: plan }; });
      this.update({ busy: true, preview: null, pending: saved.pending, receipt: null, error: null, recovered: false }); this.invalidate();
    } catch (error) { this.update({ storageBlocked: true, error: error && typeof error === "object" && "code" in error ? error : fail() }); return; }
    try {
      const receipt = await this.api.clearUsage(plan);
      if (!validPlan(receipt.plan, this.context) || !samePlan(receipt.plan, plan) || !decimal(receipt.generation) || BigInt(receipt.generation) !== BigInt(plan.generation) + 1n || !Number.isSafeInteger(receipt.committed_ms) || receipt.committed_ms < plan.range.end_ms) throw { code: "USAGE_CLEAR_UNCONFIRMED" };
      const saved = this.save(saved => ({ ...saved, floor: maximum(saved.floor, receipt.generation), pending: saved.pending?.operation_id === plan.operation_id ? null : saved.pending, unresolved: saved.unresolved?.operation_id === plan.operation_id ? null : saved.unresolved }));
      this.invalidate(); this.update({ busy: false, pending: saved.pending, unresolved: saved.unresolved, receipt, error: null });
    } catch (error) {
      // Keep the same persisted plan even if this screen has since unmounted.
      this.update({ busy: false, error });
    }
  }
  async leaveUnconfirmed() {
    if (this.disposed || this.state.busy || !this.state.pending) return;
    const pending = this.state.pending; this.update({ busy: true, error: null });
    try {
      const info = await this.api.usageContext(); if (!validInfo(info, this.context) || (info.generation === null && this.floor !== "0")) throw changed();
      const saved = this.save(saved => ({ ...saved, floor: maximum(saved.floor, info.generation ?? "0"), pending: saved.pending?.operation_id === pending.operation_id ? null : saved.pending, unresolved: saved.pending?.operation_id === pending.operation_id ? pending : saved.unresolved }));
      this.invalidate(); this.update({ busy: false, pending: saved.pending, unresolved: saved.unresolved, receipt: null, error: null });
    } catch (error) { this.update({ busy: false, error }); }
  }
  async recover() {
    if (this.disposed || this.state.busy) return;
    this.update({ busy: true, preview: null, error: null, recovered: false });
    try { await this.api.recoverUsage(); this.invalidate(); this.update({ busy: false, recovered: true }); }
    catch (error) { this.update({ busy: false, error }); }
  }
}
