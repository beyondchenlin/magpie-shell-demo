# Tip changelog · 循环检测日志

每条 tip 必须有 **WHY**。动到壳 chrome 时再加 **CAUSE / WHAT kept / WHAT changed**。见 [`TIP-CYCLE.md`](./TIP-CYCLE.md)。

---

## v0.1.113 · CIS_LIBRARY_THUNAR_CHOOSE · 2026-10-15 Asia/Shanghai

- **WHY:** CIS §10 — Library Thunar / Choose-project GTK OS chrome mocks drop page-local `style={{…}}` for Magpie/demo GTK dialog classes (same pattern as Providers `.dialog.gtk-select-files`).
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Win chrome / 752 frame; browse / pick / confirm-cancel behavior unchanged; no new Magpie features.
- **WHAT changed:**
  - CSS: `.lib-thunar*` / `.modal.lib-thunar-scrim` + `.dialog.gtk-choose-project` in `shell-patch.css`.
  - `LibThunar` + `LibChooseProject` in `LibraryView.tsx` → class-based JSX (0 `style={{` in those regions).
  - CIS §10 marks Thunar/Choose Done; listed CIS knife empty for shell demo (aside from future nest).
- **Guard:** `npm run chrome-guard`. No portable. No push/Vercel.

---
## v0.1.112 · CIS_PROVIDERS_OAUTH_WALLS · 2026-10-15 Asia/Shanghai

- **WHY:** CIS §10 — Providers OAuth walls / GTK Select Files / Move menu / remove confirm drop page-local `style={{…}}` for Magpie classes (+ ActionConfirm).
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Win chrome / 752 frame; no new OAuth product behavior; Library Thunar/GTK mocks skipped; `--detect-n` token kept.
- **WHAT changed:**
  - Signing: `.s.note`; Cancel relies on Magpie `.signing` flex-start (drop alignSelf inline).
  - GTK Select Files → `.dialog.gtk-select-files` + `.places` / `.pane` / `.empty` (shell-patch).
  - Move menu → `.scrim` + `.pop.move` with `--pop-x`/`--pop-y` only for coordinates.
  - Provider Remove → `ActionConfirm`.
- **Guard:** `npm run chrome-guard`. No portable. No push/Vercel.

---
## v0.1.111 · CIS_LIBRARY_EDITOR_FIELDS · 2026-10-15 Asia/Shanghai

- **WHY:** CIS §10 — Library MCP/skill/hook/image editors drop field-level `style={{…}}`; Magpie classes + WordsField/Segs/PrefPick.
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Win chrome / 752 frame; Thunar/Choose-project OS chrome mocks untouched; Providers OAuth skipped.
- **WHAT changed:**
  - LibChip → CSS `button.lib-ag` (no inline).
  - MCP / Image / Skill / Hook editors: `.ehead` / `.stack` / `label.field` / `.pair` / `.hint` / `.agents` / `.pop.menu`; WordsField (+ mono/full/port/timeout); Segs transport; PrefPick hook menus.
  - WordsField forwardRef (MCP name focus).
- **Guard:** `npm run chrome-guard`. No portable. No push/Vercel.

---
## v0.1.110 · CIS_LIBRARY_SHEET_MODALS · 2026-10-15 Asia/Shanghai

- **WHY:** CIS §10 — Library non-confirm LibModals (How skills / by-agent sheets) drop page-local `style={{…}}`; Magpie `.modal` / `.dialog.lib-editor`.
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Win chrome / 752 frame; no new features; Providers OAuth/folder pickers skipped.
- **WHAT changed:**
  - `LibModal` chrome → Magpie `.modal` > `.dialog.lib-editor` (+ `.sm`); sizing/animation in shell-patch (no inline).
  - How skills / Skills by agent / MCP by agent: Magpie `.ehead` / `.lib-confirm` / `.list` / `.row` / `.who` / `.bar`; How uses `Segs`.
  - Light: other LibModal `.bar` flex inlines stripped (CSS owns layout).
- **Guard:** `npm run chrome-guard`. No portable. No push/Vercel.

---
## v0.1.109 · CIS_LIBRARY_REMAINING_CONFIRMS · 2026-10-15 Asia/Shanghai

- **WHY:** CIS §10 — finish Library LibModal danger confirms onto Magpie `ActionConfirm` (skill/project/MCP remove + Turn all off).
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Win chrome / 752 frame; Providers OAuth/folder pickers skipped; non-confirm LibModals (How/by-agent sheets) kept.
- **WHAT changed:**
  - `ActionConfirm` gains optional `extra` slot; Keep-skills uses `Tick.keep` under `.action-confirm .extra` (shell-patch tokens).
  - Library: skill remove · project remove (keep-skills) · Turn all off · single MCP remove · MCP project remove → `ActionConfirm`.
  - Project remove hides while discard overlay open (`!projectDiscard`).
- **Guard:** `npm run chrome-guard`. No portable. No push/Vercel.

---
## v0.1.108 · CIS_ACTIONCONFIRM_LIBRARY_GROUP · 2026-10-15 Asia/Shanghai

- **WHY:** CIS §10 — migrate Library LibModal discard/remove-all/remove-selected (+ project discard) and GroupEditor `#modal` discard/remove onto Magpie `ActionConfirm`.
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Win chrome / 752 frame; no new features; Providers OAuth walls skipped (not trivial 1:1).
- **WHAT changed:**
  - Library: `discardOpen` / `instDiscardOpen` / `projectDiscard` / `mcpRemoveAllAsk` / `mcpRemoveSelectedAsk` → `ActionConfirm` (drop inline red/flex styles).
  - GroupEditor: discard + remove → `ActionConfirm` (drop `#modal` + inline danger styles).
  - Escape for migrated confirms owned by dialog `onCancel` (removed capture duplicates).
  - CIS §10.5 marks Library/GroupEditor ActionConfirm Done.
- **Guard:** `npm run chrome-guard`. No portable. No push/Vercel.

---
## v0.1.107 · CIS_FOLD_TOAST_CONFIRM · 2026-10-15 Asia/Shanghai

- **WHY:** CIS §10 next knife — extract Fold / StatusToast / ActionConfirm; wire existing Magpie-class call sites only (no feature stuffing).
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Win chrome / 752 frame; no new Magpie features.
- **WHAT changed:**
  - `Fold` (+ `FoldChev`) → Gateway Connect/Models + Providers Turned off (drop page-local fold markup / chevron).
  - `StatusToast` → App foot `#status` (kind + `.lift`).
  - `ActionConfirm` → Providers editor discard + Plugins Remove/Clear confirms (showModal, Cancel focus, Tab cycle, Escape/backdrop).
  - CIS §10 marks Fold / StatusToast / ActionConfirm Done.
- **Guard:** `npm run chrome-guard`. No portable. No push/Vercel.

---
## v0.1.106 · CIS_P2_PREFPICK_FIELDPILL · 2026-10-15 Asia/Shanghai

- **WHY:** CIS P2 — extract PrefPick (Language/font `.pref-pick`) + FieldPill (Agents/tray `.field`); wire existing call sites only.
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Win chrome / 752 frame; no new features.
- **WHAT changed:**
  - `PrefPick` → Settings Language + NestedBlocks FontRow (family/style).
  - `FieldPill` → Agents tier/New-sessions model pills + Tray solo model (drop page-local field chrome styles).
  - Light Providers list: find/none/+Add → `.pv-tools` / `.pv-find` / `.pv-none` / `.pv-gap`.
  - CIS §10.5 P2 marked done.
- **Guard:** `npm run chrome-guard`. No portable. No push/Vercel.

---
## v0.1.105 · CIS_P1_PROVIDERS_EDITOR · 2026-10-15 Asia/Shanghai

- **WHY:** CIS P1 — Providers editor remaining layout `style={{…}}` → Magpie `.icon-pick` / `.headers` / `.pair` / `.action-confirm` (no feature stuffing; PrefPick/.field skipped).
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Win chrome / 752 frame; P2 deferred.
- **WHAT changed:**
  - Icon: Magpie `.icon-pick` + `.icon-now` + `.icon-grid` (drop flex/grid inline styles).
  - Headers: `.headers` / `.pair` / `.pair.col` / `.hhead` / `.side` / `textarea.json` (no gap/width inline).
  - Discard: `.action-confirm` dialog + `showModal` + `.text.primary.danger-fill` (Magpie confirmAction).
  - Remove → `.text.danger`; detect-grid → `--detect-n` + `.dg-row`; hint → `.hint.fade`/`.err`.
  - CIS §10.5 P1 editor rows marked done.
- **Guard:** `npm run chrome-guard`. No portable. No push/Vercel.

---
## v0.1.104 · CIS_P0_SETTINGS_TICK · 2026-10-15 Asia/Shanghai

- **WHY:** Bring Settings / add-model onto CIS — replace bare inputs + native checkbox chrome (P0 only; no feature stuffing).
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Win chrome / 752 frame; P1 sheet/stack and P2 PrefPick deferred.
- **WHAT changed:**
  - Settings: `WordsField` for compact/GitHub/port/allow/cors/masked words; drop page-local flex/position styles → `.pref-anchor` / `.compact-at` / `.rule-add` / `.github-token-input` / `.redact-kind`; redact kinds via `PrefRow`.
  - Extract `Tick`; Providers add-model User-Agent / Redaction / Web search + NestedBlocks Sync/Export ticks consume it (Magpie `label.tick` + styled checkbox).
  - NestedBlocks Sync/Export/Search/Mirror/OTLP/rules: `WordsField` (+ `.words.full`); add-model concurrency/queue/ctx fields get Magpie editor class names.
  - CIS §10.5 marks P0 done.
- **Guard:** `npm run chrome-guard`. No portable. No push/Vercel.

---
## v0.1.103 · CIS_COMPONENTS_ROUTING_WIRES · 2026-10-15 Asia/Shanghai

- **WHY:** User: nest/1:1 is to learn Magpie into a **unified CIS + reusable components** — not feature stuffing. Gaps: Routing live stage weak adaptive; Settings/add-model unfit controls.
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Win chrome / 752 nest frame; no new Magpie features.
- **WHAT changed:**
  - CIS `/workspace/magpie-shell-cis-2026-10-15.md` §10 component contract (Segs/TextBtn/WordsField/LibSwitch/PrefRow; Routing max560 + fromHub wires; Settings mismatch list).
  - Routing live wires: Magpie `layout()` side vs under-hub paths; `viewBox`; redraw on `mainNarrow` (nest 116–117 / max560).
  - Extract `PrefRow` `TextBtn` `WordsField` `LibSwitch`; Settings Gateway port + Providers list switches consume them.
- **Nest:** routing NOTES 116–117 + Magpie `routing.js` layout/fromHub; Mac click tour reference only for nav/Appearance (not Linux chrome gold).
- **Guard:** `npm run chrome-guard`. No portable. No Vercel.

---
## v0.1.102 · DUPLICATE_MOVE_FILTER_205_222 · 2026-10-15 Asia/Shanghai

- **WHY:** Consume nest `routing/205–222` Duplicate / Move / Filter into RoutingView (slice only).
- **WHAT kept:** Win desktop chrome from v0.1.101 (`html.win`, `.win-caption`, brand hide); `SIDE_AT=1024`; no `WEB_SIDE_AT`; 752 nest frame.
- **WHAT changed (Routing only):**
  - Duplicate names **`{name} copy`** / numbered **`{name} copy 2`** (was wrong `Copy of {name}`) · toast **Duplicated {name}** · listed after source
  - Move up/down disabled at ends · toast **Group order saved** · handle tip + Alt+↑/↓
  - Filter: every word · empty **No group or model matches “{q}”** · Escape clears · Select mode hides Templates/Import/Select/+ New group
- **Nest:** `interactions/native-linux/routing/205–222` + NOTES; Magpie OSS `routing.js` groupMenu / hayMatches / gQ Escape.
- **Guard:** `npm run chrome-guard` pass. No portable. Vercel not forced (402 risk).

---
## v0.1.101 · WIN_DESKTOP_CHROME · 2026-10-15 Asia/Shanghai

- **WHY:** User wants 1:1 **Windows** Magpie desktop chrome from open source — Linux nest screenshots look thinner; Win system title bar is the gold look.
- **CAUSE:** Demo web preview used `body.web` framing with **in-page brand** (Linux/web look). Magpie Windows is the opposite: native OS title bar + brand hidden in page.
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; nest web `#root` 752×652 zoom-aware frame; top tabs under 1024; Duplicate nest 205–222 **not** consumed this tip.
- **WHAT changed:** Default desktop preview = Windows Magpie sim:
  - `html.win` Segoe stack — Magpie `layout.js:16`, `app.css` L108–111
  - Fake `.win-caption` (icon + Magpie + min/max/close) — `titlebar_other.go` (“Windows keeps its own title bar”), tinted `--bg` like `titletint_windows.go`
  - Hide in-page `.brand` / `side-top` → 10px — `app.css` L184, L347 (mirrored under `[data-sim-platform="win"]` because true Win selector excludes `.web`)
  - No `body.linux` / no in-page `#winclose` — `app.css` L187, `app.js` (~24590)
- **Nest:** 无（纯 chrome platform gold；Duplicate 205–222 deferred）。

---
## v0.1.100 · WEB_FRAME_ZOOM_FIT · 2026-10-15 Asia/Shanghai

- **WHY:** chrome audit `web-chrome-audit-2026-10-15` — at text 110%, web card overflowed / clipped right actions (不能接入 / 管理 / ＋保存当前) and left-shifted Settings labels at ~752–1100.
- **CAUSE:** `html { zoom: 1.1 }` scales `#root`, but `shell-patch` sized the card with raw `100vw` / fixed `752` / `1100` CSS px, so visual width ≈ CSS×1.1 exceeded the viewport (stuck left, right clipped). Not a SIDE_AT / nest-feature change.
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; nest gold 752×652 CSS footprint; top tabs under 1024; side-nav expand still behind `@media (min-width: 1024px)`; nest/routing consume still paused.
- **WHAT changed:** `body.web #root` (and side-nav card) widths/heights use `calc((100vw|vh - 48px) / var(--zoom, 1.1))`; margins `24px / zoom`; `overflow-x: hidden` on `body.web`; phone-web nav `padding-inline-end` so 插件 can scroll in; chrome-guard requires zoom-aware width.
- **Nest:** 无（纯 chrome overflow fix；nest/consume 仍暂停）。

---
## v0.1.99 · CHROME_GOLD_RESTORE · 2026-10-15 Asia/Shanghai

- **WHY:** 外观回归审计：撤掉 v0.1.98 错误的 Web 侧栏门槛，恢复 Magpie 金标（窄/中宽 = 顶栏 tabs）。
- **CAUSE:** v0.1.98 加 `WEB_SIDE_AT=800`，把 ~900 宽 Vercel 预览强行改成侧栏；对照 nest `responsive/01–10` 与 CIS「`SIDE_AT=1024` 以下 = 顶栏」明显变差。
- **WHAT kept:** v0.1.91 起的 Web 框 **752×652** + text 110% zoom（nest 对齐）；Electron/`SIDE_AT=1024`；页内 routing feature 不动。
- **WHAT changed:** 删除 `WEB_SIDE_AT`；`wantSide` 只认 `SIDE_AT`；`shell-patch` side-nav 卡扩回 **≥1024** 媒体查询；落地正确的 TIP-CYCLE + chrome-guard。
- **Nest:** 无（纯 chrome；nest/consume 仍暂停）。

---

## v0.1.98 · WEB_SIDE_RESTORE · 2026-10-15 Asia/Shanghai

- **WHY:**（已证伪）以为 Vercel「侧栏没了」要降门槛。
- **CAUSE:** 误判 v0.1.91 的 752 框 + SIDE_AT=1024（其实是金标顶栏）。
- **Reverted in:** **v0.1.99**.

---

## v0.1.97 · ROUTING_COPY_SHARE_190_204 · 2026-10-15 Asia/Shanghai

- **WHY:** nest `routing/190–204` Copy to share / Import success / Select remove.
- **Chrome:** 无故意壳改动。
