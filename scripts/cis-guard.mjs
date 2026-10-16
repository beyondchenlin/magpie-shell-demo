import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync("docs/cis/source-manifest.json", "utf8"));
let failed = false;
for (const { file, sha256 } of manifest.files) {
  const normalized = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const actual = createHash("sha256").update(normalized).digest("hex");
  if (actual !== sha256) {
    console.error(`cis-guard FAIL: ${file} differs from Magpie ${manifest.commit.slice(0, 7)}`);
    failed = true;
  } else console.log(`cis-guard OK: ${file}`);
}
if (failed) process.exitCode = 1;
else console.log("cis-guard: six native stylesheets match the pinned source; browser checks are still required");
