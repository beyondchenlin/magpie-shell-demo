#!/usr/bin/env node
/** Magpie tip chrome-guard — fail if shell gold is broken. See docs/TIP-CYCLE.md */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const fail = (m) => {
  console.error("chrome-guard FAIL:", m);
  process.exit(1);
};
const ok = (m) => console.log("chrome-guard OK:", m);

const appPath = join(root, "src/App.tsx");
const patchPath = join(root, "src/styles/shell-patch.css");
const cssPath = join(root, "src/styles/app.css");
for (const p of [appPath, patchPath, cssPath]) {
  if (!existsSync(p)) fail(`missing ${p}`);
}
const app = readFileSync(appPath, "utf8");
const patch = readFileSync(patchPath, "utf8");
const css = readFileSync(cssPath, "utf8");

if (!/const\s+SIDE_AT\s*=\s*1024\s*;/.test(app)) {
  fail("SIDE_AT must be 1024 (Magpie gold)");
}
ok("SIDE_AT = 1024");

if (/\bWEB_SIDE_AT\b/.test(app) || /\bWEB_SIDE_AT\b/.test(patch)) {
  fail("WEB_SIDE_AT must not exist (v0.1.98 regression; gold uses SIDE_AT only)");
}
ok("no WEB_SIDE_AT");

if (!/wantSide[\s\S]*?min-width:\s*\$\{SIDE_AT\}px/.test(app)) {
  fail("wantSide must key off SIDE_AT only");
}
ok("wantSide uses SIDE_AT");

if (!/<aside[^>]*className=\"sidebar\"/.test(app) && !/<aside[^>]*id=\"side\"/.test(app)) {
  // either order
  if (!/aside[\s\S]{0,80}sidebar/.test(app)) fail("App must still render sidebar aside");
}
ok("sidebar aside present");

if (!/body\.side-nav[\s\S]{0,200}\.on[\s\S]{0,120}seg-edge/.test(css) &&
    !/body\.side-nav[\s\S]{0,200}--card[\s\S]{0,80}seg-edge/.test(css)) {
  // app.css has: body.side-nav :is(...).on { background: var(--card); ... box-shadow: var(--seg-edge)
  if (!/body\.side-nav[\s\S]*?\.on\s*\{[\s\S]*?--card[\s\S]*?seg-edge/.test(css)) {
    fail("app.css missing side-nav .on graphite (card + seg-edge)");
  }
}
ok("side-nav .on graphite in app.css");

if (!/max-width:\s*752px/.test(patch) || !/width:\s*min\(752px/.test(patch)) {
  fail("shell-patch must keep web #root 752 frame (nest responsive)");
}
ok("web #root 752 frame");

if (!/@media\s*\(\s*min-width:\s*1024px\s*\)\s*\{[\s\S]*?body\.web\.side-nav\s+#root/.test(patch)) {
  fail("side-nav card expand must stay behind @media (min-width: 1024px)");
}
ok("side-nav expand gated at 1024");

console.log("chrome-guard: all checks passed");
