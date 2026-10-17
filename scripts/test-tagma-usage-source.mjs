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
cache.set(servicePath, { desktop: false, service: new Proxy({}, { get() { return () => { throw Error("No native calls in source tests"); }; } }) });
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
