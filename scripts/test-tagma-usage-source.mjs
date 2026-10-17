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
const { UsageResults, UsageDetail, UsagePanel } = load("src/product/UsagePanel.tsx");
const selection = usageSelection(usageDefault(Date.parse("2026-10-18T12:00:00Z")));
const info = { generation: "0", availability: "available", observed_ms: 1792324800000, detail_start_ms: 1792000000000, summary_start_ms: 1791936000000, timezone: "UTC" };
const requestId = "00000000-0000-4000-8000-000000000001";
const record = { request_id: requestId, provider_id: "00000000-0000-4000-8000-000000000002", model: "tagma/private-team@2", config_revision: 8, team_revision: 2, started_ms: 1792324800000, finished_ms: null, state: "running", error_code: null, input_tokens: null, output_tokens: "0" };
const requests = { info, records: [record], next_cursor: { generation: "0", started_ms: record.started_ms, request_id: requestId } };
const totals = { total: "1", completed: "0", unfinished: "1", succeeded: "0", failed: "0", cancelled: "0", interrupted: "0", input_known: "27670116110564327421", input_unknown: "1", output_known: "0", output_unknown: "0", input_total: null, output_total: "0", elapsed_ms: "0" };
const summary = { info, kind: "request", records: [], totals, next_cursor: null };
const detail = { info, record, attempts: [{ ordinal: 1, provider_id: record.provider_id, model: "actual-step-model", started_ms: record.started_ms, finished_ms: null, state: "running", error_code: null, input_tokens: null, output_tokens: "0" }] };
function deferred() { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));

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
