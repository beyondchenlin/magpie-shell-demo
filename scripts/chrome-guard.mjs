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

// Nest web frame: width min(752px, …) — may be zoom-aware calc
if (!/width:\s*min\(752px/.test(patch)) {
  fail("shell-patch must keep web #root 752 frame (nest responsive)");
}
if (!/max-width:\s*min\(752px/.test(patch) && !/max-width:\s*752px/.test(patch)) {
  fail("shell-patch must keep web #root max-width 752 (or min(752px,…))");
}
ok("web #root 752 frame");

// Overflow fix: CSS width must divide by --zoom so html{zoom} does not clip
if (!/body\.web\s+#root\s*\{[\s\S]*?100vw[\s\S]*?\/\s*var\(--zoom/.test(patch)) {
  fail("body.web #root width must be zoom-aware: calc((100vw - …) / var(--zoom, …))");
}
ok("web #root zoom-aware width");

if (!/@media\s*\(\s*min-width:\s*1024px\s*\)\s*\{\s*body\.web\s+#root\s*\{/.test(patch)) {
  fail("wide preview sizing must depend on viewport >=1024, not navigation");
}
for (const block of patch.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  if (/body\.web\.side-nav\s+#root/.test(block[1]) &&
      /(?:^|[;\s])(?:min-|max-)?(?:width|height)\s*:/.test(block[2])) {
    fail("side-nav must not resize the preview window");
  }
}
ok("preview sizing independent of navigation; wide frame gated at 1024");


// Windows Magpie desktop sim (v0.1.101+): not Linux in-page brand chrome
const winCap = join(root, "src/components/WinCaption.tsx");
if (!existsSync(winCap)) fail("missing WinCaption.tsx (Win OS title bar sim)");
ok("WinCaption.tsx present");

if (!/document\.documentElement\.classList\.add\(\s*["']win["']\s*\)/.test(app)) {
  fail('App must add html.win (:root.win Segoe — Magpie layout.js:16)');
}
ok("html.win forced");

if (!/dataset\.simPlatform\s*=\s*["']win["']/.test(app) && !/simPlatform\s*=\s*["']win["']/.test(app)) {
  fail('App must set data-sim-platform=win for desktop preview');
}
ok("data-sim-platform=win");

if (!/WinCaption/.test(app)) {
  fail("App must render <WinCaption />");
}
ok("App renders WinCaption");

if (!/data-sim-platform="win"[\s\S]*?\.brand[\s\S]*?display:\s*none/s.test(patch) &&
    !/\[data-sim-platform="win"\][\s\S]{0,200}\.brand[\s\S]{0,80}display:\s*none/.test(patch)) {
  fail('shell-patch must hide .brand under [data-sim-platform="win"] (Magpie app.css L184)');
}
ok("Win brand-hide in shell-patch");

if (!/\.win-caption/.test(patch)) {
  fail("shell-patch must style .win-caption");
}
ok("win-caption styles");

if (!/:root\.win/.test(css)) {
  fail("app.css must keep :root.win Segoe stack (Magpie app.css L108)");
}
ok(":root.win fonts in app.css");

console.log("chrome-guard: all checks passed");
