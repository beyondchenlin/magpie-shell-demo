# Tip changelog · 循环检测日志

每条 tip 必须有 **WHY**。动到壳 chrome 时再加 **CAUSE / WHAT kept / WHAT changed**。见 [`TIP-CYCLE.md`](./TIP-CYCLE.md)。

---

## v0.1.124 · CIS_AROWN_ABOUT_SYNC_TEXTBTN · 2026-10-15 Asia/Shanghai

- **WHY:** Continue CIS on 0.1.123 leftovers that Magpie maps to PrefRow/TextBtn without inventing parallel CSS.
- **CAUSE:** AutoResetOwn / AboutVersionRow / SyncForms still hand-rolled `.row.pref` / `<button class="text">` after NestedBlocks PrefRow wave.
- **Gold cites:**
  - Magpie `app.js` **22249–22280** `renderAutoResetOwn`: `div.row.pref.ar-own` → `.who` + `.ar-own-cases` (no `.val`); `dataset.user`
  - Magpie `app.css` **1771–1774** `.ar-own-cases` / `.ar-own-case` / `.ar-own-say`
  - Magpie `app.js` **21118–21130** About `row("Version","",version)` + **23730–23768** `renderUpdate` ready → `.sub` "{v} is downloaded" + `.text` Restart
  - Magpie `app.js` **21603–21605** / **21641–21648** / **21668–21695** davForm/export/import: `el("button","text"|"text primary"|"text danger")`
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; FontRow pop/fontFamily `style={{` (geometry); Providers Field grids; Magpie-distinct `.ar-own-cases` CSS (not forced into `.val`).
- **WHAT changed:**
  - `PrefRow`: optional `dataUser` → `data-user`
  - `AutoResetOwn` → PrefRow `wrapVal={false}` + `className="ar-own"`
  - `AboutVersionRow` → PrefRow + TextBtn (adds Magpie `.name` Version the demo had dropped)
  - SyncForms / RestoreModal / WhatsNewModal → TextBtn
- **Guard:** `npm run chrome-guard`. Push/PR required. No portable / Vercel.

---
## v0.1.123 · CIS_NESTEDBLOCKS_PREFROW · 2026-10-15 Asia/Shanghai

- **WHY:** Continue CIS unification: NestedBlocks still hand-rolled `.row.pref` for LAN / OTel / CLI / Font / Redact / Download source / Disable models / Search APIs — duplicate PrefRow / TextBtn / WordsField / PrefPick DOM.
- **CAUSE:** v0.1.122 only migrated Proxy + Daily warm-up; specialized Settings blocks kept raw row markup.
- **Gold cites:**
  - Magpie `app.js` **23630–23657** LAN Address `row()` + `lan-address-controls` / `lan-address-row`
  - Magpie `app.js` **23212–23220** OTel `row()` + `otel-stacked` (endpoint/headers/bodies)
  - Magpie `app.js` **20883–20914** CLI `cli-row` — shells/note under `.who` (`afterWho`)
  - Magpie `index.html` **285–298** font-row: `.font-controls` sibling of `.who` (no `.val`) → PrefRow `wrapVal={false}`
  - Magpie `app.js` **20940–20978** / **21166** Download source `update-mirror-row` + `.words.update-mirror-input`
  - Magpie Settings Masking rules / Disable a model / Search APIs = `.row.pref` + `.text` / `.words`
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Providers Field() grids; intentional `style={{` (FontRow pop geometry / fontFamily); AutoResetOwn `.ar-own` (not `.val`); AboutVersionRow specialized (sub-only who).
- **WHAT changed:**
  - `PrefRow`: `wrapVal` (font-row), `subClassName`, `dataPattern`; `afterWho` for CLI / mirror err sub
  - `TextBtn`: `forwardRef` (Disable… anchor)
  - NestedBlocks → PrefRow / TextBtn: LanAddressRow, RedactRulesBlock, OtelFull, CliRow, UpdateMirrorRow, DisableModelsBlock, SearchApisBlock, FontRow
- **Guard:** `npm run chrome-guard`. Push/PR required. No portable / Vercel.

---
## v0.1.122 · CIS_PROVIDERS_SEGS_PREFROW · 2026-10-15 Asia/Shanghai

- **WHY:** Continue CIS unification: Providers editor local `Segs` had no Magpie `slide()` thumb; Settings NestedBlocks still hand-rolled `.row.pref` for Proxy / Daily warm-up instead of shared PrefRow/TextBtn.
- **CAUSE:** ProvidersView kept a page-local Segs (`.opt` only) while Settings already used `components/Segs` + `useSegThumb`; NestedBlocks Proxy/DailyWarm duplicated PrefRow DOM.
- **Gold cites:**
  - Magpie `app.js` **6174–6202** `segs()` → always `slide(box, key)` (thumb)
  - Magpie `app.js` **7410** provider Proxy Global/Direct/Custom segs
  - Magpie `app.js` **8827** Key header Both/x-api-key/Bearer segs
  - Magpie `app.js` **8983–8990** Region segs + `slide(seg, "regions")`
  - Magpie `app.js` **10611** model API segs + slide
  - Magpie Settings Proxy / Daily warm-up = `.row.pref` + `.text` (CIS PrefRow / TextBtn)
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Providers editor `Field` label+hint grid (Magpie `field()`, not Settings PrefRow); leftover `style={{` CSS vars / pop geometry; NestedBlocks specialized rows (LAN/OTel/font…) still raw until next tips.
- **WHAT changed:**
  - `ProvidersView.tsx`: delete local Segs; import shared `Segs` (useSegThumb) for Region / API / Proxy / Key header
  - `PrefRow.tsx`: optional `afterWho` for Magpie sibling `.sub` (`#proxyCheck`)
  - `NestedBlocks.tsx`: `DailyWarmRow` + `ProxyBlock` → PrefRow; Proxy Test/Save → TextBtn
- **Guard:** `npm run chrome-guard`. Push/PR required. No portable / Vercel.

---
## v0.1.121 · SEG_THUMB_SLIDE_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Close SHELL-APPEARANCE-LOGIC motion re-scan for Settings Appearance `.segs` + top `#nav.seg` (pages users check often): tip already had 280ms, but `useSegThumb` lacked Magpie `slide()` mid-glide / `.still` / ResizeObserver fit.
- **CAUSE:** Demo hook stored last *target* only and skipped Magpie `thumbPut`/`thumbNow`/`thumbFit`; interrupting a glide or resizing the nest left the thumb off Magpie gold.
- **Gold cites:**
  - Magpie `app.js` **8168–8267** `slide()` / `thumbPut` / `thumbNow` / `thumbFit`; **8185** `THUMB_MS=280`, `THUMB_EASE=cubic-bezier(.2,.8,.2,1)`
  - Magpie `app.css` **2798–2804** `.thumb` base; **2836** `.thumb.still`; **227–232** `#nav.seg` / `.seg > .thumb`
  - Magpie `app.css` **~3305–3308** `prefers-reduced-motion` zeros CSS transitions (covers `html.theming`); Magpie `slide()` does **not** call `calm()`
  - Magpie `app.js` **20999** Appearance `#themeSegs` → `segs()` + `slide`; demo `Segs` + `useSegThumb`
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Win chrome / 752 frame; theme persist + applyTheme `.35s`/`450ms` (v0.1.119–120); warm-tabs/set-tabs without SegThumb (v0.1.118).
- **WHAT changed:**
  - `SegThumb.tsx`: Magpie-faithful `slide()` — `.still` put, mid-glide `thumbNow`, ResizeObserver fit, wrap y/h
  - `applyTheme.ts` / `shell-patch.css` cites for reduced-motion + slide fidelity
  - `SHELL-APPEARANCE-LOGIC.md` §4 + motion re-scan note closed for this path
- **Guard:** `npm run chrome-guard`. No portable. No push/Vercel.

---
## v0.1.120 · THEME_PERSIST_BODY_WEB_DARK · 2026-10-15 Asia/Shanghai

- **WHY:** Close two leftovers from v0.1.119: Appearance reload reset to light; nest preview `body.web` canvas stayed `#e8e8ec` in dark (light strip around `#root`).
- **CAUSE:** Theme lived only in React state (default `"light"`); Magpie persists via `savePrefs({ theme })` (app.js ~20999) and early-applies with `theme.js` from `bootPrefs`. Demo `body.web` hard-coded light canvas while Magpie body uses `background: var(--bg)` (app.css L118) → dark `#1a1a1e` (L46/L81).
- **Gold cites:**
  - Magpie `app.js` **20999** Appearance segs → `savePrefs({ ...keep, theme })`
  - Magpie `app.js` **23926** `prefsKeep` includes `theme`
  - Magpie `theme.js` **5–10** early `dataset.theme` from `bootPrefs.theme` (before first paint)
  - Magpie `app.js` **20581–20590** applyPrefs theming `.35s` / clear **450ms** (unchanged; still `applyTheme.ts`)
  - Magpie `app.css` **L3** `--bg: #f4f4f6`; **L46/L81** dark `--bg: #1a1a1e`; **L118** `body { background: var(--bg) }`
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Win chrome / 752 frame; `.35s`/`450ms` theming; CIS components.
- **WHAT changed:**
  - `applyTheme.ts`: `readDemoTheme` / `persistDemoTheme` / `bootDemoTheme` on **`magpie.demoPrefs.theme`**
  - `main.tsx` calls `bootDemoTheme()` before React (Magpie theme.js)
  - `App.tsx` theme state inits from `readDemoTheme()`
  - `SettingsView` Appearance onChange → `persistDemoTheme` after sync apply
  - `shell-patch.css` `body.web` dark canvas `#1a1a1e` under `data-theme="dark"` + system dark
- **Guard:** `npm run chrome-guard`. No portable. No push/Vercel.

---
## v0.1.119 · APPEARANCE_THEMING_TOP_SEG · 2026-10-15 Asia/Shanghai

- **WHY:** After CIS + Settings clip (v0.1.118), close two user-visible shell gaps: Appearance theme crossfade timing, and top-bar selected pill backgrounds at nest widths (top tabs under `SIDE_AT=1024`).
- **CAUSE:** Theme `data-theme` was applied in `applyChrome` React effect (one frame after Settings added `html.theming`); Magpie `applyPrefs` sets `dataset.theme` **synchronously** with the theming class (app.js ~20581–20590). Top `#nav.seg` thumb tokens already Magpie-shaped; shell-patch clarified `.seg > .thumb` vs `.segs > .thumb` so Appearance segs never steal `--seg-thumb`.
- **Gold cites:**
  - Magpie `internal/gui/assets/app.css` **3233–3236** `html.theming` transitions **.35s** `--ease`
  - Magpie `internal/gui/assets/app.js` **20585–20587** add `theming`, clear at **450ms**; **20589** sync `dataset.theme`
  - Magpie `app.css` **227–232** `.seg` / `.seg > .thumb` → `--seg-thumb` / `--seg-edge` (no grey track)
  - Magpie `app.css` **2798–2804** `.thumb` base for in-page `.segs` (`--card` + light edge)
  - Magpie `app.js` `slide()` / demo `useSegThumb` **280ms** for thumb glide
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Win chrome / 752 frame; Settings Appearance Segs UI; CIS components.
- **WHAT changed:**
  - New `src/applyTheme.ts` `applyDocumentTheme` (Magpie applyPrefs theme slice)
  - `App.tsx` theme effect owns DOM theme; `applyChrome` no longer sets `data-theme`
  - `SettingsView` Appearance onChange calls `applyDocumentTheme` **sync** then `setTheme` (Magpie same-turn); App theme effect no-ops when already applied
  - `shell-patch.css` top-bar / Appearance thumb comments + `.segs > .thumb` child selector
  - `app.css` theming block cite
- **Guard:** `npm run chrome-guard`. No portable. No push/Vercel.

---
## v0.1.118 · SETTINGS_LEFT_CLIP_THUMB · 2026-10-15 Asia/Shanghai

- **WHY:** tip-0117 preview `01-settings.png` — Settings left gutter clipped 「常规」tab + row labels (外观→见) at nest ~752 / textSize 110%.
- **CAUSE:** Demo `useSegThumb` on `.warm-tabs.set-tabs` / `#warmTabs` injected `.thumb` (`position:absolute; top/bottom:2px`) without a `position:relative` host. Nearest positioned ancestor is `#root` (`shell-patch.css`), so the white card thumb stretched ~full card height over the left edge.
- **Gold:** Magpie `app.css` `.warm-tabs button.on { background: var(--pill) }` — no `slide()` on set-tabs/warm-tabs (`app.js` only wires click/tabKeys). Cite: `magpie-src/internal/gui/assets/app.css` ~3009–3012; `app.js` ~20769–20780.
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Win chrome / 752 frame; PrefRow / set-tabs DOM; `.warm-tabs` −7px optical align.
- **WHAT changed:** Drop `useSegThumb` + refs from `SettingsView` set-tabs and warm-tabs; selection stays `.on` pill.
- **Guard:** `npm run chrome-guard`. No portable. No push/Vercel.

---
## v0.1.117 · CIS_AGENTS_SETTINGS_LEFTOVERS · 2026-10-15 Asia/Shanghai

- **WHY:** CIS continuous — AgentsView (~29) + NestedBlocks (~24) layout `style={{…}}`; also knock GroupEditor / ModelPop / AgentModelsPop / LedHeat legend chrome.
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Win chrome / 752 frame; agent-fold `--n`/`--i`; FontRow fixed pos + fontFamily preview; LedHeat `gridArea`; pop position tokens.
- **WHAT changed:**
  - Bridge in `shell-patch.css` (`#view-agents` relocate/exp, `#view-settings` lan/sync/font/search).
  - AgentsView layout → Magpie/agent classes; NestedBlocks GTK chooser → `.gtk-select-files` places/pane; GroupEditor `display:contents` / `ge-add-sheet` / `ge-full-row`.
  - Counts: AgentsView **29→6**; NestedBlocks **24→2**; GroupEditor **4→0**; LedHeat **4→3**; ModelPop **2→1**; AgentModelsPop **2→1**.
- **Guard:** `npm run chrome-guard`. No portable. No push/Vercel.

---
## v0.1.116 · CIS_ROUTINGVIEW_LAYOUT_CHROME · 2026-10-15 Asia/Shanghai

- **WHY:** CIS continuous — RoutingView held ~58 `style={{…}}`; cut layout chrome to Magpie routing classes + bridge (same approach as Library/SimpleViews).
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Win chrome / 752 frame; adaptive `max560` / fromHub wire logic; `--agent` / replay `left` / `--bar` tokens.
- **WHAT changed:**
  - Bridge in `shell-patch.css` (`#view-routing` filters/empty/tpl/confirm).
  - Layout inlines → Magpie `.rt-*` / `.empty-state` / `.rt-livedot` / `hidden`; confirm → `.modal.rt-confirm` + `.danger-fill`.
  - RoutingView `style={{` **58 → 10** (~83%; remaining = `--agent` / `--bar` / replay `left` only).
- **Guard:** `npm run chrome-guard`. No portable. No push/Vercel.

---
## v0.1.115 · CIS_SIMPLEVIEWS_LAYOUT_CHROME · 2026-10-15 Asia/Shanghai

- **WHY:** CIS continuous — SimpleViews (Usage + Plugins) held ~118 `style={{…}}`; cut layout chrome to Magpie classes + CIS wrappers (same approach as LibraryView).
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Win chrome / 752 frame; behavior unchanged; dynamic bar/% → CSS vars (`--h`/`--bar`/`--grow`/`--to`).
- **WHAT changed:**
  - Import Magpie `plugins.css`.
  - Bridge tokens in `shell-patch.css` (`#view-usage` / `#view-plugins` / plugin dialogs).
  - Chart/share/meter consume `var(--h)` / `var(--bar)`; gh kinds → `.opt.on`; hid chevron via `aria-expanded`.
  - SimpleViews `style={{` **118 → 10** (~91.5%; remaining = metric CSS vars only).
- **Guard:** `npm run chrome-guard`. No portable. No push/Vercel.

---
## v0.1.114 · CIS_LIBRARYVIEW_LAYOUT_CHROME · 2026-10-15 Asia/Shanghai

- **WHY:** CIS continuous — LibraryView still held ~232 `style={{…}}` after Thunar/Choose; cut layout/field chrome to Magpie classes + existing CIS wrappers.
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Win chrome / 752 frame; behavior unchanged; no new Magpie features.
- **WHAT changed:**
  - Import Magpie `library.css` (`src/styles/library.css`).
  - Bridge tokens in `shell-patch.css` (`#view-library` lib-set/radio/savebar/mcp/mk-card/oauth…).
  - Tabs → `Segs` + `.lib-tabs`; head acts → `.lib-discover` / `.lib-more` / `.lib-backups` + `.lib-mini`.
  - Sets / MCP / skills / projects / OAuth wall → Magpie class chrome; CSS-var color on health dot kept (1 token).
  - LibraryView `style={{` **232 → 1** (~99.6%).
- **Guard:** `npm run chrome-guard`. No portable. No push/Vercel.

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
