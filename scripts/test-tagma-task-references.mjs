// Pure task-version reference regression; no browser, model calls or installs.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = await fs.readFile(path.join(root, "src/product/taskReferences.ts"), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { referencedPackVersions, executedPackVersions } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);
const target = version => ({ kind: "pack", pack_id: "reachflow", version });
const step = version => ({ target: target(version) });
const recipe = {
  brain: { kind: "local_brain_pack", pack_id: "reachflow", version: "0.2.0-dev.42" },
  steps: [step("0.2.0-dev.42"), { target: { kind: "cloud_model" } }, step("0.2.0-dev.44")],
};
assert.deepEqual(referencedPackVersions(recipe, "reachflow"), ["0.2.0-dev.42", "0.2.0-dev.44"]);
assert.deepEqual(referencedPackVersions(recipe, "another-pack"), []);
assert.deepEqual(referencedPackVersions({ brain: { kind: "first_cloud" }, steps: [] }, "reachflow"), []);
const attempts = [
  { provider_id: "24eb3f13-893a-4fbd-972a-93ea2ac777b1", model: "tagma/reachflow@0.2.0-dev.42", state: "succeeded" },
  { provider_id: "cloud-provider", model: "controlled-cloud-model", state: "running" },
  { provider_id: "cloud-provider", model: "tagma/reachflow@2.0.0", state: "succeeded" },
  { provider_id: "24eb3f13-893a-4fbd-972a-93ea2ac777b1", model: "tagma/reachflow", state: "running" },
  { provider_id: "24eb3f13-893a-4fbd-972a-93ea2ac777b1", model: "tagma/reachflow@0.2.0-dev.42", state: "failed" },
  { provider_id: "24eb3f13-893a-4fbd-972a-93ea2ac777b1", model: "tagma/reachflow@0.2.0-dev.44", state: "cancelled" },
];
assert.deepEqual(executedPackVersions(attempts), [
  "tagma/reachflow@0.2.0-dev.42",
  "tagma/reachflow@0.2.0-dev.44",
]);
assert.deepEqual(executedPackVersions([]), []);
console.log("Tagma task reference regression: pinned recipes and actual attempt versions PASS");
