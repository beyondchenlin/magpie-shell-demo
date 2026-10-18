// Headless source semantics only. No WebView, browser, window or native commands.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const cache = new Map();
const servicePath = resolve("src/product/service.ts");
cache.set(servicePath, { desktop: false, protocolVersion:1, service: new Proxy({}, { get() { return () => { throw Error("No native calls in source tests"); }; } }) });
function load(filename) {
  filename = resolve(filename);
  if (cache.has(filename)) return cache.get(filename);
  const exports = {};
  cache.set(filename, exports);
  const source = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports };
  const localRequire = name => {
    if (!name.startsWith(".")) return require(name);
    const base = resolve(dirname(filename), name);
    const file = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    assert.ok(file, `Missing source dependency ${base}`);
    return load(file);
  };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename })(localRequire, module, exports);
  cache.set(filename, module.exports);
  return module.exports;
}
const { UsageLoader, usageDefault, usageSelection, usageNumber, usageUtc } = load("src/product/usageModel.ts");
const { UsageClearSession } = load("src/product/usageClearModel.ts");
const { UsageClearScope, UsageClearControls } = load("src/product/UsageClearControls.tsx");
const { UsageResults, UsageDetail, UsagePanel } = load("src/product/UsagePanel.tsx");
const { BudgetLoader, budgetDraft, budgetSpec } = load("src/product/budgetModel.ts");
const { BudgetFacts, BudgetReport, BudgetEditor, BudgetPanel } = load("src/product/BudgetPanel.tsx");
const {timeoutDraft,timeoutValues,TimeoutSaver}=load("src/product/providerTimeoutModel.ts");
const {ProviderTimeoutForm}=load("src/product/ProviderTimeoutForm.tsx");
const selection = usageSelection(usageDefault(Date.parse("2026-10-18T12:00:00Z")));
const info = { context_id: "a".repeat(64), generation: "0", availability: "available", observed_ms: 1792324800000, detail_start_ms: 1792000000000, summary_start_ms: 1791936000000, timezone: "UTC" };
const requestId = "00000000-0000-4000-8000-000000000001";
const record = { request_id: requestId, provider_id: "00000000-0000-4000-8000-000000000002", model: "tagma/private-team@2", config_revision: 8, team_revision: 2, started_ms: 1792324800000, finished_ms: null, state: "running", error_code: null, input_tokens: null, output_tokens: "0" };
const requests = { info, records: [record], next_cursor: { context_id: info.context_id, generation: "0", started_ms: record.started_ms, request_id: requestId } };
const totals = { total: "1", completed: "0", unfinished: "1", succeeded: "0", failed: "0", cancelled: "0", interrupted: "0", input_known: "27670116110564327421", input_unknown: "1", output_known: "0", output_unknown: "0", input_total: null, output_total: "0", elapsed_ms: "0" };
const summary = { info, kind: "request", records: [], totals, next_cursor: null };
const detail = { info, record, attempts: [{ ordinal: 1, provider_id: record.provider_id, model: "actual-step-model", started_ms: record.started_ms, finished_ms: null, state: "running", error_code: null, input_tokens: null, output_tokens: "0" }] };
function deferred() { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
class MemoryStore {
  values = new Map(); failWrites = false;
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { if (this.failWrites) throw Error("owned quota fixture"); this.values.set(key, value); }
}
const clearPlan = { context_id: info.context_id, operation_id: requestId, range: { start_ms: 0, end_ms: 86400000 }, expected_revision: "7", generation: "0", requests: "1", attempts: "2", summary_buckets: "2" };
const receiptFor = plan => ({ plan, generation: (BigInt(plan.generation) + 1n).toString(), committed_ms: 86400001 });
const savedKey = `tagma.usage-clear.v1.${info.context_id}`;

test("UTC inclusive dates, leap dates, max span and strict filters", () => {
  assert.equal(selection.range.end_ms - selection.range.start_ms, 30 * 86400000);
  assert.equal(selection.range.end_ms, Date.parse("2026-10-19T00:00:00Z"));
  const base = usageDefault(1792324800000);
  assert.equal(usageSelection({ ...base, from: "2024-02-29", through: "2024-03-01" }).range.end_ms - Date.parse("2024-02-29T00:00:00Z"), 2 * 86400000);
  for (const change of [{ from: "2026-02-29" }, { through: "2026-01-01" }, { from: "2024-01-01" }, { config: "1.5" }, { config: "4294967296" }, { team: "0" }, { provider: "other" }, { error: "raw content" }, { state: "unknown" }, { model: "中".repeat(86) }, { model: " " }, { model: "a\u0085" }]) assert.throws(() => usageSelection({ ...base, ...change }));
  assert.equal(usageSelection({ ...base, model: "中".repeat(85) + "a" }).filter.model.length, 86);
  assert.equal(usageSelection({ ...base, error: "ACCESS_REVOKED", model: "' OR 1=1--", config: "0", team: "2" }).filter.model, "' OR 1=1--");
});
test("decimal precision, known zero, unknown and out-of-Date-range timestamps", () => {
  assert.equal(usageNumber("27670116110564327421", "Unknown"), "27,670,116,110,564,327,421");
  assert.equal(usageNumber("0", "Unknown"), "0");
  assert.equal(usageNumber(null, "Unknown"), "Unknown");
  assert.equal(usageUtc(Number.MAX_SAFE_INTEGER), "9007199254740991 ms UTC");
});
test("sequential single-reader calls; duplicate clicks ignored; cursor pins applied selection", async () => {
  const first = deferred(); const calls = []; const published = [];
  const loader = new UsageLoader({ usageRequests: input => { calls.push(["requests", input]); return calls.length === 1 ? first.promise : Promise.resolve({ ...requests, next_cursor: null }); }, usageSummary: async input => { calls.push(["summary", input]); return summary; }, usageDetails: async () => detail }, state => published.push(state));
  const pending = loader.load(selection);
  await loader.load(selection);
  assert.equal(calls.length, 1); assert.equal(published.at(-1).busy, true);
  first.resolve(requests); await pending;
  assert.deepEqual(calls.map(call => call[0]), ["requests", "summary"]);
  assert.equal(published.at(-1).data.summary, summary);
  await loader.load({ ...selection, filter: { ...selection.filter, model: "different draft" } }, true);
  assert.equal(calls.length, 3); assert.deepEqual(calls.at(-1)[1].cursor, requests.next_cursor);
  assert.equal(calls.at(-1)[1].filter.model, null);
  assert.equal(published.at(-1).data.requests.records.length, 1, "replace page; do not append an unbounded cache");
  assert.equal(published.at(-1).data.summary.info.observed_ms, info.observed_ms, "cached totals retain their own observation time");
  loader.dispose();
});
test("query failure clears prior result, and errors never silently broaden summary", async () => {
  let fail = false; let summaryFail = false; let detailFail = false; let summaryCalls = 0; const published = [];
  const loader = new UsageLoader({ usageRequests: async () => { if (fail) throw { code: "USAGE_QUERY_UNAVAILABLE" }; return requests; }, usageSummary: async () => { summaryCalls++; if (summaryFail) throw { code: "USAGE_QUERY_UNAVAILABLE" }; return summary; }, usageDetails: async () => { if (detailFail) throw { code: "USAGE_QUERY_UNAVAILABLE" }; return detail; } }, state => published.push(state));
  await loader.load(selection); assert.ok(published.at(-1).data);
  fail = true; await loader.load(selection);
  assert.equal(published.at(-1).data, null); assert.equal(published.at(-1).error.code, "USAGE_QUERY_UNAVAILABLE");
  fail = false; await loader.load({ ...selection, filter: { ...selection.filter, error_code: "ACCESS_REVOKED" } });
  assert.equal(summaryCalls, 1); assert.equal(published.at(-1).data.summary, null);
  await loader.inspect(requestId); assert.ok(published.at(-1).detail);
  detailFail = true; await loader.inspect(requestId);
  assert.equal(published.at(-1).detail, null); assert.ok(published.at(-1).data);
  summaryFail = true; await loader.load(selection);
  assert.equal(published.at(-1).data, null); assert.equal(published.at(-1).error.code, "USAGE_QUERY_UNAVAILABLE");
  loader.dispose();
});
test("disposed query and detail cannot repopulate cache or launch next stage", async () => {
  const waiting = deferred(); const published = []; let summaryCalls = 0;
  const loader = new UsageLoader({ usageRequests: () => waiting.promise, usageSummary: async () => { summaryCalls++; return summary; }, usageDetails: async () => detail }, state => published.push(state));
  const pending = loader.load(selection); loader.dispose(); const count = published.length;
  waiting.resolve(requests); await pending;
  assert.equal(summaryCalls, 0); assert.equal(published.length, count);
  const late = deferred(); const next = new UsageLoader({ usageRequests: async () => requests, usageSummary: async () => summary, usageDetails: () => late.promise }, state => published.push(state));
  const inspect = next.inspect(requestId); next.dispose(); const after = published.length;
  late.reject({ code: "USAGE_QUERY_UNAVAILABLE" }); await inspect;
  assert.equal(published.length, after);
});
test("clear generations cannot mix cached totals/requests; fresh detail invalidates older list", async () => {
  const published = []; let nextSummary = summary;
  const loader = new UsageLoader({ usageRequests: async () => requests, usageSummary: async () => nextSummary, usageDetails: async () => ({ ...detail, info: { ...info, generation: "1" } }) }, state => published.push(state));
  await loader.load(selection); assert.ok(published.at(-1).data);
  await loader.inspect(requestId); assert.equal(published.at(-1).data, null); assert.equal(published.at(-1).detail.info.generation, "1");
  nextSummary = { ...summary, info: { ...info, generation: "1" } }; await loader.load(selection);
  assert.equal(published.at(-1).data, null); assert.equal(published.at(-1).error.code, "USAGE_CLEAR_CHANGED");
  loader.dispose();
});
test("source rendering uses CIS rows; precise unknown/zero, absent store and detail identity", () => {
  const props = { data: { selection, requests, summary }, providers: [], zh: true, busy: false, inspect() {}, next() {} };
  const html = render(UsageResults, props);
  assert.match(html, /class="row pref"/); assert.match(html, /27,670,116,110,564,327,421/);
  assert.match(html, /未知 \/ 0/); assert.match(html, /未终结/); assert.match(html, /config 8 · team 2/);
  assert.match(html, /UTC/); assert.match(html, /下一页/);
  const absent = render(UsageResults, { ...props, zh: false, data: { selection, requests: { info: { ...info, availability: "not_created" }, records: [], next_cursor: null }, summary: { ...summary, totals: null } } });
  assert.match(absent, /has not been created; usage is unknown/);
  assert.doesNotMatch(absent, />0<|No matching retained/);
  const details = render(UsageDetail, { detail, providers: [], zh: true });
  assert.match(details, new RegExp(requestId)); assert.match(details, /actual-step-model/); assert.match(details, /未知 \/ 0/);
  const escaped = render(UsageDetail, { detail: { ...detail, record: { ...record, model: "<script>private</script>" } }, providers: [], zh: false });
  assert.match(escaped, /&lt;script&gt;private&lt;\/script&gt;/); assert.doesNotMatch(escaped, /<script>/);
  const errorFiltered = render(UsageResults, { ...props, data: { selection: { ...selection, filter: { ...selection.filter, error_code: "ACCESS_REVOKED" } }, requests, summary: null } });
  assert.match(errorFiltered, /日汇总不支持此筛选/); assert.doesNotMatch(errorFiltered, /逻辑请求汇总/);
  const preview = render(UsagePanel, { providers: [], language: "zh" });
  assert.match(preview, /预览不会显示模拟用量/); assert.match(preview, /disabled/); assert.doesNotMatch(preview, new RegExp(requestId));
});
test("clear intent is saved before native call; own-clear invalidation drops late query and raises durable floor", async () => {
  const store = new MemoryStore(); const states = []; const reads = []; const old = deferred(); const cleared = deferred(); let loader; let clearCalls = 0; let summaryCalls = 0;
  const session = new UsageClearSession({ usageContext: async () => info, prepareUsageClear: async () => clearPlan, clearUsage: () => { clearCalls++; assert.deepEqual(JSON.parse(store.getItem(savedKey)).pending, clearPlan); return cleared.promise; }, recoverUsage: async () => ({}) }, info, store, state => states.push(state), () => loader?.invalidate());
  loader = new UsageLoader({ usageRequests: () => old.promise, usageSummary: async () => { summaryCalls++; return summary; }, usageDetails: async () => detail }, state => reads.push(state), () => session.barrier());
  const loading = loader.load(selection); await session.prepare(clearPlan.range); const clearing = session.confirm();
  assert.equal(clearCalls, 1); assert.equal(session.barrier().blocked, true); assert.equal(reads.at(-1).data, null);
  old.resolve(requests); await loading; assert.equal(summaryCalls, 0); assert.equal(reads.at(-1).data, null);
  cleared.resolve(receiptFor(clearPlan)); await clearing;
  assert.equal(states.at(-1).pending, null); assert.equal(states.at(-1).receipt.generation, "1"); assert.equal(JSON.parse(store.getItem(savedKey)).floor, "1");
  await loader.load(selection); assert.equal(reads.at(-1).data, null); assert.equal(reads.at(-1).error.code, "USAGE_CLEAR_CHANGED");
  loader.dispose(); session.dispose();
});
test("failed intent persistence sends no clear; malformed state is preserved and refuses mutation", async () => {
  const store = new MemoryStore(); const states = []; let calls = 0;
  const api = { usageContext: async () => info, prepareUsageClear: async () => clearPlan, clearUsage: async () => { calls++; return receiptFor(clearPlan); }, recoverUsage: async () => ({}) };
  const session = new UsageClearSession(api, info, store, state => states.push(state), () => {}); await session.prepare(clearPlan.range); store.failWrites = true; await session.confirm(); assert.equal(calls, 0); assert.equal(states.at(-1).storageBlocked, true); assert.equal(JSON.parse(store.getItem(savedKey)).pending, null); session.dispose();
  for (const raw of ["{bad-json", "x".repeat(8193), JSON.stringify({ version: 1, context_id: "b".repeat(64), floor: "0", pending: null, unresolved: null })]) {
    const damaged = new MemoryStore(); damaged.setItem(savedKey, raw); const snapshots = []; const blocked = new UsageClearSession(api, info, damaged, state => snapshots.push(state), () => {}); assert.equal(snapshots.at(-1).storageBlocked, true); await blocked.prepare(clearPlan.range); await blocked.confirm(); assert.equal(damaged.getItem(savedKey), raw); assert.equal(calls, 0); blocked.dispose();
  }
});
test("saved pending clear survives unmount and retries the exact plan after receipt persistence fails", async () => {
  const store = new MemoryStore(); const states = []; const sent = [];
  const api = { usageContext: async () => ({ ...info, generation: "1" }), prepareUsageClear: async () => clearPlan, clearUsage: async plan => { sent.push(plan); store.failWrites = true; return receiptFor(plan); }, recoverUsage: async () => ({}) };
  const first = new UsageClearSession(api, info, store, state => states.push(state), () => {}); await first.prepare(clearPlan.range); await first.confirm(); assert.deepEqual(JSON.parse(store.getItem(savedKey)).pending, clearPlan); assert.equal(states.at(-1).receipt, null); first.dispose();
  store.failWrites = false; api.clearUsage = async plan => { sent.push(plan); return receiptFor(plan); };
  const restored = []; const next = new UsageClearSession(api, { ...info, generation: "1" }, store, state => restored.push(state), () => {}); assert.deepEqual(restored.at(-1).pending, clearPlan); assert.equal(sent.length, 1, "mount never replays a mutation"); await next.confirm(true); assert.equal(sent.length, 2); assert.deepEqual(sent[0], sent[1]); assert.equal(restored.at(-1).pending, null); assert.equal(JSON.parse(store.getItem(savedKey)).floor, "1"); next.dispose();
});
test("late disposed clear reply cannot erase a newer pending operation or lower its floor", async () => {
  const store = new MemoryStore(); const one = deferred(); const two = deferred(); const states = []; let currentPlan = clearPlan;
  const nextPlan = { ...clearPlan, operation_id: "00000000-0000-4000-8000-000000000099", generation: "1", expected_revision: "9" };
  const api = { usageContext: async () => ({ ...info, generation: "1" }), prepareUsageClear: async () => currentPlan, clearUsage: plan => plan.operation_id === clearPlan.operation_id ? one.promise : two.promise, recoverUsage: async () => ({}) };
  const first = new UsageClearSession(api, info, store, () => {}, () => {}); await first.prepare(clearPlan.range); const pendingOne = first.confirm(); first.dispose();
  const second = new UsageClearSession(api, info, store, state => states.push(state), () => {}); await second.leaveUnconfirmed(); assert.equal(states.at(-1).receipt, null); assert.equal(states.at(-1).unresolved.operation_id, clearPlan.operation_id);
  currentPlan = nextPlan; await second.prepare(nextPlan.range); const pendingTwo = second.confirm(); assert.equal(JSON.parse(store.getItem(savedKey)).pending.operation_id, nextPlan.operation_id);
  one.resolve(receiptFor(clearPlan)); await pendingOne; assert.equal(JSON.parse(store.getItem(savedKey)).pending.operation_id, nextPlan.operation_id); assert.equal(JSON.parse(store.getItem(savedKey)).floor, "1");
  two.resolve(receiptFor(nextPlan)); await pendingTwo; assert.equal(JSON.parse(store.getItem(savedKey)).pending, null); assert.equal(JSON.parse(store.getItem(savedKey)).floor, "2"); assert.equal(states.at(-1).receipt.generation, "2"); second.dispose();
});
test("explicit leave/recovery sends no new clear and keeps the unknown outcome visible", async () => {
  const store = new MemoryStore(); const states = []; let calls = 0; let recoveries = 0; let reads = 0;
  const api = { usageContext: async () => { reads++; return info; }, prepareUsageClear: async () => clearPlan, clearUsage: async () => { calls++; throw { code: "USAGE_CLEAR_UNCONFIRMED" }; }, recoverUsage: async () => { recoveries++; return {}; } };
  const session = new UsageClearSession(api, info, store, state => states.push(state), () => {}); await session.prepare(clearPlan.range); await session.confirm(); assert.equal(session.barrier().blocked, true); await session.leaveUnconfirmed(); assert.equal(calls, 1); assert.equal(reads, 1); assert.equal(states.at(-1).receipt, null); assert.equal(states.at(-1).pending, null); assert.deepEqual(states.at(-1).unresolved, clearPlan); await session.recover(); assert.equal(recoveries, 1); assert.equal(calls, 1); assert.equal(states.at(-1).recovered, true); assert.equal(states.at(-1).receipt, null); session.dispose();
});
test("invalid clear receipts cannot confirm or release pending state", async () => {
  for (const make of [plan => ({ ...receiptFor(plan), generation: "2" }), plan => ({ ...receiptFor(plan), plan: { ...plan, context_id: "b".repeat(64) } }), plan => ({ ...receiptFor(plan), plan: { ...plan, unexpected: true } })]) {
    const store = new MemoryStore(); const states = []; const session = new UsageClearSession({ usageContext: async () => info, prepareUsageClear: async () => clearPlan, clearUsage: async plan => make(plan), recoverUsage: async () => ({}) }, info, store, state => states.push(state), () => {}); await session.prepare(clearPlan.range); await session.confirm(); assert.equal(states.at(-1).receipt, null); assert.equal(states.at(-1).error.code, "USAGE_CLEAR_UNCONFIRMED"); assert.equal(session.barrier().blocked, true); assert.equal(JSON.parse(store.getItem(savedKey)).floor, "0"); session.dispose();
  }
});
test("context namespaces and exact large-generation floors reject foreign/old reads without fake zero", async () => {
  const store = new MemoryStore(); const api = { usageContext: async () => info, prepareUsageClear: async () => clearPlan, clearUsage: async () => receiptFor(clearPlan), recoverUsage: async () => ({}) };
  const a = new UsageClearSession(api, { ...info, generation: "9007199254740993" }, store, () => {}, () => {}); const b = new UsageClearSession(api, { ...info, context_id: "b".repeat(64) }, store, () => {}, () => {}); assert.equal(a.barrier().floor, "9007199254740993"); assert.equal(b.barrier().floor, "0"); assert.equal(b.barrier().blocked, false);
  let current = { ...requests, info: { ...info, generation: "9007199254740992" } }; const states = []; const loader = new UsageLoader({ usageRequests: async () => current, usageSummary: async () => ({ ...summary, info: current.info }), usageDetails: async () => ({ ...detail, info: { ...info, context_id: "b".repeat(64) } }) }, state => states.push(state), () => a.barrier()); await loader.load(selection); assert.equal(states.at(-1).error.code, "USAGE_CLEAR_CHANGED"); current = { ...requests, info: { ...info, generation: "9007199254740993" } }; await loader.load(selection); assert.ok(states.at(-1).data); await loader.inspect(requestId); assert.equal(states.at(-1).detail, null); assert.equal(states.at(-1).error.code, "USAGE_CLEAR_CHANGED"); loader.dispose(); a.dispose(); b.dispose();
});
test("clear source rendering exposes exact range/counts and explicit uncertainty, with CIS controls", () => {
  const scope = render(UsageClearScope, { plan: { ...clearPlan, attempts: "27670116110564327421" }, zh: true }); assert.match(scope, /27,670,116,110,564,327,421/); assert.match(scope, /结束（不含）/); assert.match(scope, /级联尝试明细（含跨日）/); assert.match(scope, /class="row pref"/);
  const state = { busy: false, preview: null, pending: clearPlan, unresolved: null, receipt: null, error: null, storageBlocked: false, recovered: false };
  const html = render(UsageClearControls, { session: {}, state, busy: false, language: "zh" }); assert.match(html, /本次清除尚未确认/); assert.match(html, /核实同一次清除/); assert.match(html, /结束核实，查看当前状态/); assert.match(html, /不会撤销已提交的清除/); assert.match(html, /迁移备份和 WAL/); assert.match(html, /查询筛选不缩小此范围/);
  const invalid = render(UsageClearControls, { session: {}, state: { ...state, error: { code: "INVALID_INPUT" } }, busy: false, language: "zh" }); assert.match(invalid, /清除范围或核实数据无效/); assert.doesNotMatch(invalid, /HTTPS/);
});

const budgetRule = { id: requestId, spec: { name: "Owned soft target", scope: { kind: "provider", provider_id: record.provider_id }, period: "utc_month", request_limit: "9007199254740993", token_limit: "9223372036854775807" } };
const budgetRecord = { rule_id: requestId, range: selection.range, kind: "attempt", recorded_count: "9007199254740993", known_input_tokens: "27670116110564327421", known_output_tokens: "0", unknown_input_records: "1", unknown_output_records: "0", token_total: null, request_progress_bps: 10000, token_progress_bps: null, request_reached: true, token_reached: null };
const budgetReport = { config_revision: 9, info, records: [budgetRecord] };

test("budget drafts preserve exact integer targets and historical scopes without numeric coercion", () => {
  const draft = budgetDraft(budgetRule);
  assert.deepEqual(budgetSpec(draft), budgetRule.spec);
  assert.equal(typeof budgetSpec(draft).request_limit, "string");
  for (const requests of ["0", "01", "-1", "1.1", "1e6", "9223372036854775808", " "]) assert.throws(() => budgetSpec({ ...draft, requests }));
  for (const change of [{ requests: "", tokens: "" }, { name: " " }, { name: "中".repeat(41) }, { name: "a\u0085" }]) assert.throws(() => budgetSpec({ ...draft, ...change }));
  for (const change of [{ provider: "removed-name" }, { scope: "model", model: "tagma/team" }, { scope: "model", model: "中".repeat(86) }, { scope: "team", model: "tagma/team@1" }, { scope: "team", model: "tagma/team@02" }, { scope: "team", model: "tagma/reachflow" }, { scope: "team", model: "tagma/team@4294967296" }]) assert.throws(() => budgetSpec({ ...draft, ...change }));
  for (const scope of [{ kind: "all_attempts" }, { kind: "model", provider_id: record.provider_id, model_id: "historical-removed" }, { kind: "team", public_id: "tagma/team@2" }]) {
    const rule = { ...budgetRule, spec: { ...budgetRule.spec, scope } };
    assert.deepEqual(budgetSpec(budgetDraft(rule)), rule.spec);
  }
});

test("budget read pins config and scope with one call; failure clears old data and duplicate clicks cannot queue", async () => {
  const wait = deferred(); const states = []; let calls = 0; let answer = budgetReport;
  const loader = new BudgetLoader({ budgetObservations: revision => { assert.equal(revision, 9); calls++; return calls === 1 ? wait.promise : Promise.resolve(answer); } }, 9, [budgetRule], () => null, state => states.push(state));
  const reading = loader.load(); await loader.load(); assert.equal(calls, 1); wait.resolve(budgetReport); await reading; assert.equal(states.at(-1).data, budgetReport);
  for (const bad of [{ ...budgetReport, config_revision: 8 }, { ...budgetReport, records: [] }, { ...budgetReport, records: [{ ...budgetRecord, kind: "request" }] }, { ...budgetReport, records: [{ ...budgetRecord, rule_id: record.provider_id }] }]) {
    answer = bad; await loader.load(); assert.equal(states.at(-1).data, null); assert.equal(states.at(-1).error.code, "CONFIG_CONFLICT");
  }
  loader.dispose(); const after = calls; await loader.load(); assert.equal(calls, after);
});

test("pending clear and large generation floor block budget reports before or after actual read", async () => {
  const waiting = deferred(); const states = []; let calls = 0;
  let barrier = { context: info.context_id, floor: "0", blocked: true };
  let answer = waiting.promise;
  const loader = new BudgetLoader({ budgetObservations: () => { calls++; return answer; } }, 9, [budgetRule], () => barrier, state => states.push(state));
  await loader.load(); assert.equal(calls, 0); assert.equal(states.at(-1).error.code, "USAGE_CLEAR_UNCONFIRMED");
  barrier = { ...barrier, blocked: false }; const reading = loader.load(); barrier = { ...barrier, blocked: true }; waiting.resolve(budgetReport); await reading; assert.equal(states.at(-1).data, null); assert.equal(states.at(-1).error.code, "USAGE_CLEAR_UNCONFIRMED");
  barrier = { ...barrier, blocked: false, floor: "9007199254740993" };
  for (const changedInfo of [{ ...info, generation: "9007199254740992" }, { ...info, generation: null }, { ...info, generation: "9007199254740993", context_id: "b".repeat(64) }]) {
    answer = Promise.resolve({ ...budgetReport, info: changedInfo }); await loader.load(); assert.equal(states.at(-1).data, null); assert.equal(states.at(-1).error.code, "USAGE_CLEAR_CHANGED");
  }
  answer = Promise.resolve({ ...budgetReport, info: { ...info, generation: barrier.floor } }); await loader.load(); assert.ok(states.at(-1).data); loader.dispose();
});

test("clear session invalidation disposes old budget report; late reply cannot repopulate after clear", async () => {
  const store = new MemoryStore(); const waiting = deferred(); const states = []; let loader;
  const session = new UsageClearSession({ usageContext: async () => info, prepareUsageClear: async () => clearPlan, clearUsage: async plan => receiptFor(plan), recoverUsage: async () => ({}) }, info, store, () => {}, () => loader?.dispose());
  loader = new BudgetLoader({ budgetObservations: () => waiting.promise }, 9, [budgetRule], () => session.barrier(), state => states.push(state));
  const reading = loader.load(); await session.prepare(clearPlan.range); await session.confirm(); const count = states.length; waiting.resolve(budgetReport); await reading;
  assert.equal(session.barrier().floor, "1"); assert.equal(states.length, count); assert.equal(states.at(-1).data, null);
  const fresh = new BudgetLoader({ budgetObservations: async () => budgetReport }, 9, [budgetRule], () => session.barrier(), state => states.push(state)); await fresh.load(); assert.equal(states.at(-1).data, null); assert.equal(states.at(-1).error.code, "USAGE_CLEAR_CHANGED"); fresh.dispose(); session.dispose();
});

test("budget source report uses CIS facts and exact counts; unknown tokens have no fake progress", () => {
  const html = render(BudgetFacts, { rule: budgetRule, record: budgetRecord, zh: true });
  assert.match(html, /class="row pref"/); assert.match(html, /9,007,199,254,740,993/); assert.match(html, /27,670,116,110,564,327,421/);
  assert.match(html, /未知 \/ 9,223,372,036,854,775,807/); assert.equal((html.match(/<progress /g) ?? []).length, 1); assert.match(html, /max="10000" value="10000"/); assert.match(html, /已达到自设软目标/);
  const absent = render(BudgetReport, { data: { ...budgetReport, info: { ...info, availability: "not_created", generation: null }, records: [{ ...budgetRecord, recorded_count: null, known_input_tokens: null, known_output_tokens: null, unknown_input_records: null, unknown_output_records: null, request_progress_bps: null, request_reached: null }] }, rules: [budgetRule], zh: false });
  assert.match(absent, /usage is unknown/); assert.doesNotMatch(absent, /<progress|value="0"/);
  const cleared = render(BudgetReport, { data: { ...budgetReport, info: { ...info, generation: "1" } }, rules: [budgetRule], zh: true }); assert.match(cleared, /历史曾清除/);
  const escaped = render(BudgetReport, { data: budgetReport, rules: [{ ...budgetRule, spec: { ...budgetRule.spec, name: "<script>private</script>" } }], zh: false }); assert.doesNotMatch(escaped, /<script>/);
});

test("budget source editor has named text integer controls, explicit cancellation and no automatic balance", () => {
  const config = { desired_revision: 9, providers: [], budgets: [budgetRule] };
  const html = render(BudgetEditor, { rule: budgetRule, config, busy: false, language: "zh", onSave: async () => { throw Error("No native writes in static rendering"); }, onCancel() {} });
  assert.match(html, /class="words"/); assert.match(html, /9223372036854775807/); assert.match(html, /value="9007199254740993"/); assert.doesNotMatch(html, /type="number"/); assert.match(html, /取消/);
  const panel = render(BudgetPanel, { config, busy: false, language: "zh", session: {}, readEpoch: 0, onBusy() {}, onMutate: async () => false, onEditingChange() {} });
  assert.match(panel, /平台真实余额 \/ 账单：未知/); assert.match(panel, /规则可重叠，请勿相加/); assert.match(panel, /保留已有用量记录/); assert.match(panel, /Read period usage|读取周期用量/);
});

const timeouts={connect_ms:10000,first_response_ms:30000,idle_ms:30000,total_ms:120000};
test("timeout editor validates exact integer ranges and cross-field budgets before any save",()=>{
  assert.deepEqual(timeoutValues(timeoutDraft(timeouts)),timeouts);
  const draft=timeoutDraft(timeouts);
  for(const change of [{connect_ms:"0"},{connect_ms:"0100"},{connect_ms:"1e3"},{connect_ms:"100.5"},{connect_ms:"60001"},{first_response_ms:"500"},{idle_ms:"120001"},{total_ms:"29999"},{total_ms:""},{total_ms:"9007199254740993"}])assert.throws(()=>timeoutValues({...draft,...change}));
  assert.deepEqual(timeoutValues({connect_ms:"100",first_response_ms:"200",idle_ms:"150",total_ms:"300"}),{connect_ms:100,first_response_ms:200,idle_ms:150,total_ms:300});
});
test("timeout saves pin provider and base revision; duplicate submits cannot queue or auto-apply",async()=>{
  const pending=deferred();const states=[];const inputs=[];let reply=pending.promise;
  const saver=new TimeoutSaver(requestId,7,input=>{inputs.push(input);return reply;},state=>states.push(state));
  const draft=timeoutDraft(timeouts);const first=saver.submit(draft);await saver.submit(draft);assert.equal(inputs.length,1);assert.equal(states.at(-1).busy,true);assert.deepEqual(inputs[0],{protocol_version:1,expected_revision:7,id:requestId,timeouts});
  pending.resolve(false);await first;assert.equal(states.at(-1).saved,false);assert.equal(states.at(-1).busy,false);assert.deepEqual(draft,timeoutDraft(timeouts));
  await saver.submit({...draft,total_ms:"0"});assert.equal(inputs.length,1);assert.equal(states.at(-1).error.code,"INVALID_INPUT");
  reply=Promise.resolve(true);await saver.submit(draft);assert.equal(inputs.length,2);assert.deepEqual(inputs[1],inputs[0]);assert.equal(states.at(-1).saved,true);await saver.submit(draft);assert.equal(inputs.length,2,"successful editor cannot submit again before unmount");saver.dispose();
});
test("failed timeout save remains unsaved; disposed late success never closes another editor",async()=>{
  const states=[];let calls=0;
  const saver=new TimeoutSaver(requestId,4,async()=>{calls++;throw {code:"CONFIG_CONFLICT"};},state=>states.push(state));await saver.submit(timeoutDraft(timeouts));assert.equal(calls,1);assert.equal(states.at(-1).saved,false);assert.equal(states.at(-1).error.code,"CONFIG_CONFLICT");saver.dispose();
  const pending=deferred();const late=[];const disposed=new TimeoutSaver(requestId,4,()=>pending.promise,state=>late.push(state));const first=disposed.submit(timeoutDraft(timeouts));disposed.dispose();const count=late.length;pending.resolve(true);await first;assert.equal(late.length,count);await disposed.submit(timeoutDraft(timeouts));assert.equal(late.length,count);
});
test("timeout source form keeps CIS controls, named ms fields, explicit apply and in-flight semantics",()=>{
  const provider={id:requestId,name:"<owned provider>",timeouts};
  const html=render(ProviderTimeoutForm,{provider,revision:7,busy:false,language:"zh",onSave:async()=>{throw Error("No writes during source render");},onCancel(){}});
  assert.match(html,/class="editor tagma-editor"/);assert.equal((html.match(/class="words"/g)??[]).length,4);assert.match(html,/首个 HTTP 响应头/);assert.match(html,/连接 ≤ 响应头 ≤ 总预算/);assert.match(html,/在途请求保留原值/);assert.match(html,/保存后需要在网关应用配置/);assert.match(html,/不会自动重试/);assert.match(html,/取消/);assert.match(html,/&lt;owned provider&gt;/);assert.doesNotMatch(html,/type="number"|<owned provider>/);
  const disabled=render(ProviderTimeoutForm,{provider,revision:7,busy:true,language:"en",onSave:async()=>false,onCancel(){}});assert.match(disabled,/<fieldset disabled=""/);assert.match(disabled,/Catalog checks have a separate policy/);
});

const {ConnectionWorkspace}=load("src/product/ConnectionWorkspace.tsx");
test("startup failure ends loading;preview and pending states stay distinct",()=>{
  const props={view:null,busy:false,language:"zh",onAddProvider(){},onProviders(){},onGateway(){},onMarket(){}};
  const failed=renderToStaticMarkup(React.createElement(ConnectionWorkspace,{...props,configurationError:{code:"INCOMPATIBLE_VERSION"}}));
  assert.ok(failed.includes("本机配置读取失败"));assert.ok(failed.includes("设置中查看诊断"));assert.ok(!failed.includes("正在读取本机配置"));
  const pending=renderToStaticMarkup(React.createElement(ConnectionWorkspace,{...props,busy:true}));assert.ok(pending.includes("正在读取本机配置"));assert.ok(!pending.includes("读取失败"));
  const preview=renderToStaticMarkup(React.createElement(ConnectionWorkspace,props));assert.ok(!preview.includes("正在读取本机配置"));assert.ok(!preview.includes("读取失败"));
});

test("desktop command rejection remains a failure and clears its waiting timer",async()=>{
  const source=ts.transpileModule(readFileSync(servicePath,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const rejection={code:"INCOMPATIBLE_VERSION",retryable:false};let calls=0,scheduled=0,cleared=0;
  const module={exports:{}};
  const invoke=(name,args)=>{assert.equal(name,"application_view");assert.equal(args.protocolVersion,1);calls++;return Promise.reject(rejection)};
  const execute=vm.runInThisContext('(function(require,module,exports,setTimeout,clearTimeout){'+source+'\n})',{filename:servicePath});
  execute(name=>{assert.equal(name,"@tauri-apps/api/core");return{isTauri:()=>true,invoke,Channel:class{}}},module,module.exports,()=>{scheduled++;return 123},id=>{assert.equal(id,123);cleared++});
  await assert.rejects(module.exports.service.view(),err=>err===rejection);
  assert.equal(calls,1);assert.equal(scheduled,1);assert.equal(cleared,1);
});

test("CIS top and side navigation have exactly the three PRD pages; usage belongs to Settings",()=>{
  const {ProductChrome}=load("src/product/ProductChrome.tsx");
  const previousStorage=globalThis.localStorage;
  const previousMedia=globalThis.matchMedia;
  try {
    for (const layout of ["top","side"]) for (const language of ["zh","en"]) {
      globalThis.localStorage={getItem:()=>layout};
      globalThis.matchMedia=()=>({matches:false});
      const html=render(ProductChrome,{page:"usage",onPage(){},onRefresh(){},disabled:false,view:null,language});
      const nav=html.match(/<nav\b[^>]*>(.*?)<\/nav>/s)?.[1];
      assert.ok(nav);
      assert.deepEqual([...nav.matchAll(/data-view="([^"]+)"/g)].map(m=>m[1]),["chat","providers","market"]);
      assert.match(html,/<button[^>]+id="prefs"[^>]+class="icon on"[^>]+aria-current="location"/);
      assert.match(html,/data-tauri-drag-region="deep"/);
      assert.equal(html.includes('class="sidebar"'),layout==="side");
    }
  } finally {
    if(previousStorage===undefined) delete globalThis.localStorage; else globalThis.localStorage=previousStorage;
    if(previousMedia===undefined) delete globalThis.matchMedia; else globalThis.matchMedia=previousMedia;
  }
});

test("startup recovery retains the cause and distinguishes refresh from a full quit",()=>{
  const {ConfigurationFailure}=load("src/product/ConfigurationFailure.tsx");
  const props={error:{code:"INCOMPATIBLE_VERSION"},busy:false,onRefresh(){},onDiagnostics(){},onQuit(){}};
  const zh=render(ConfigurationFailure,{...props,language:"zh"});
  assert.match(zh,/程序、协议或配置结构版本不兼容/);
  assert.match(zh,/刷新只读取该失败状态，不会重新打开配置库/);
  assert.match(zh,/退出 Tagma/);assert.match(zh,/关闭窗口可能仅隐藏到托盘/);
  assert.match(zh,/重启不能修复不兼容或损坏的数据库/);
  assert.doesNotMatch(zh,/刷新重试/);
  const en=render(ConfigurationFailure,{...props,busy:true,language:"en"});
  assert.match(en,/Resolve the cause above/);assert.match(en,/reopen the app/);
  assert.equal((en.match(/disabled=""/g)??[]).length,3);
});

test("ProductApp keeps failure state, secondary navigation and editor focus across cancel, failed and successful saves",async()=>{
  // Headless hook harness around the real component. No DOM, native host or input injection.
  const states=[],refs=[],effects=[];let si=0,ri=0,ei=0,intervals=0,reads=0;
  const same=(a,b)=>a&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const hooks={
    useState(initial){const i=si++;if(!(i in states))states[i]=typeof initial==="function"?initial():initial;return[states[i],v=>{states[i]=typeof v==="function"?v(states[i]):v}];},
    useRef(initial){const i=ri++;return refs[i]??(refs[i]={current:initial});},
    useCallback(fn){return fn;},
    useEffect(fn,deps){const i=ei++;if(!same(effects[i]?.deps,deps)){effects[i]?.cleanup?.();effects[i]={deps,run:fn};}},
  };
  let pending=deferred();
  const service={view(){reads++;return pending.promise;},quit:async()=>{throw{code:"INTERNAL_ERROR"};}};
  const module={exports:{}};
  const source=ts.transpileModule(readFileSync("src/product/ProductApp.tsx","utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const fakeRequire=name=>{
    if(name==="react")return hooks;
    if(name==="react/jsx-runtime")return require(name);
    if(name==="./copy")return load("src/product/copy.ts");
    if(name==="./service")return{desktop:true,protocolVersion:1,service};
    if(name==="./preferences")return{readPreferences:()=>({language:"zh",theme:"light",textSize:110}),applyPreferences(){},savePreferences:()=>true};
    if(name==="@tauri-apps/api/window")return{getCurrentWindow:()=>({setTheme:async()=>{}})};
    return new Proxy({}, {get:(_,key)=>key});
  };
  vm.runInThisContext('(function(require,module,exports,setInterval,clearInterval){'+source+'\n})')(fakeRequire,module,module.exports,()=>{intervals++;return 1},()=>{});
  const draw=()=>{si=ri=ei=0;const tree=module.exports.default();for(const effect of effects){if(effect.run){const run=effect.run;delete effect.run;effect.cleanup=run();}}return tree;};
  const nodes=tree=>Array.isArray(tree)?tree.flatMap(nodes):tree&&typeof tree==="object"&&tree.props?[tree,...nodes(tree.props.children)]:[];
  const one=(tree,type,predicate=()=>true)=>{const result=nodes(tree).filter(n=>n.type===type&&predicate(n.props));assert.equal(result.length,1,type);return result[0];};
  const settle=()=>new Promise(resolve=>setImmediate(resolve));
  try {
    draw();assert.equal(reads,1);assert.equal(intervals,0);
    const failure={code:"CREDENTIAL_STORE_UNAVAILABLE"};pending.reject(failure);await settle();
    let tree=draw();assert.equal(one(tree,"ConfigurationFailure").props.error,failure);assert.equal(intervals,0);
    pending=deferred();one(tree,"ConfigurationFailure").props.onRefresh();tree=draw();
    assert.equal(one(tree,"ConfigurationFailure").props.error,failure);assert.equal(one(tree,"ConfigurationFailure").props.busy,true);
    pending.reject(failure);await settle();tree=draw();one(tree,"ConfigurationFailure").props.onQuit();await settle();tree=draw();
    assert.equal(one(tree,"ConfigurationFailure").props.error,failure,"quit failure must not replace the startup cause");
    pending=deferred();one(tree,"ConfigurationFailure").props.onRefresh();draw();
    pending.resolve({product_version:"test",config:{desired_revision:1,providers:[],profiles:[],teams:[]},runtime:{state:"stopped",effective_revision:null}});await settle();tree=draw();
    assert.equal(nodes(tree).filter(n=>n.type==="ConfigurationFailure").length,0);assert.equal(intervals,1);
    one(tree,"ProductChrome").props.onPage("settings");tree=draw();
    one(tree,"PrefRow",p=>p.name==="用量").props.children.props.onClick();tree=draw();
    one(tree,"UsagePanel");
    one(tree,"TextBtn",p=>Array.isArray(p.children)&&p.children.join("")==="返回 · 设置").props.onClick();tree=draw();
    one(tree,"PrefRow",p=>p.name==="用量");
    one(tree,"ProductChrome").props.onPage("providers");tree=draw();
    let focused=null;
    const opener={isConnected:true,disabled:false,getClientRects:()=>[{}],focus(){focused=this;}};
    const fallback={disabled:false,focus(){focused=this;}};
    const add=()=>one(tree,"TextBtn",p=>p.children==="添加供应商");
    const capture=target=>one(tree,"main").props.onClickCapture({target:{closest:()=>target}});
    add().props.ref.current=fallback;
    capture(opener);add().props.onClick();tree=draw();
    assert.equal(focused,null,"opening must leave auto-focus to the form");
    one(tree,"ProviderForm").props.onCancel();tree=draw();assert.equal(focused,opener);
    focused=null;capture(opener);add().props.onClick();tree=draw();
    service.save=async()=>{throw{code:"CONFIG_CONFLICT"}};
    assert.equal(await one(tree,"ProviderForm").props.onSave({}),false);tree=draw();
    assert.equal(focused,null,"failed save must not restore the editor opener");one(tree,"ProviderForm");
    assert.equal(one(tree,"div",p=>p.role==="alert").props.tabIndex,-1,"the failure must be a programmatic focus target outside the tab order");
    assert.equal(one(tree,"TextBtn",p=>p.children==="刷新").props.disabled,true);
    service.save=async()=>({desired_revision:2,providers:[],profiles:[],teams:[]});
    assert.equal(await one(tree,"ProviderForm").props.onSave({}),true);tree=draw();assert.equal(focused,opener);
    focused=null;capture(opener);add().props.onClick();tree=draw();
    opener.isConnected=false;one(tree,"ProviderForm").props.onCancel();tree=draw();assert.equal(focused,fallback,"removed launch control falls back to Add");
    focused=null;opener.isConnected=true;opener.getClientRects=()=>[];
    capture(opener);add().props.onClick();tree=draw();one(tree,"ProviderForm").props.onCancel();tree=draw();assert.equal(focused,fallback,"hidden cross-page opener must not receive focus");
  } finally {for(const effect of effects)effect.cleanup?.();}
});
