## v0.1.122 CIS_PROVIDERS_SEGS_PREFROW
- Providers editor Region / API / Proxy / Key header use shared `Segs` + Magpie thumb (`useSegThumb`), not page-local `.opt` strip.
- NestedBlocks Proxy + Daily warm-up use CIS `PrefRow` / `TextBtn` (`PrefRow.afterWho` for `#proxyCheck`).
- `SIDE_AT=1024` only; no `WEB_SIDE_AT`. chrome-guard pass. Push/PR; no portable / Vercel.

## v0.1.119 APPEARANCE_THEMING + TOP_SEG_THUMB
- Appearance theme switch: Magpie `html.theming` **.35s** / clear **450ms** via `applyDocumentTheme` (sync `data-theme` same turn as Magpie `applyPrefs` app.js ~20581–20590; CSS app.css ~3233–3236).
- Top-bar `#nav.seg > .thumb` selected pill: `--seg-thumb` / `--seg-edge` (Magpie app.css ~227–232); Appearance `.segs > .thumb` keeps Magpie `.thumb` base `--card` (~2798–2804). SIDE_AT=1024 top tabs.
- chrome-guard pass. Local tip only (no push/Vercel/portable).

## v0.1.118 SETTINGS_LEFT_CLIP_THUMB
- Settings set-tabs / PrefRow labels fully visible at nest ~752 + textSize 110% (no left white thumb overlay).
- Magpie-faithful: warm-tabs/set-tabs use `.on` pill, not sliding thumb (`app.css` ~3009–3012).
- `SIDE_AT=1024` only; no `WEB_SIDE_AT`. chrome-guard pass. Local tip only (no push/Vercel/portable).

## v0.1.117 CIS_AGENTS_SETTINGS_LEFTOVERS
- AgentsView 29→6 (`--n`/`--i`); NestedBlocks 24→2 (FontRow pos/fontFamily); GroupEditor 0; LedHeat/ModelPop tokens. SIDE_AT=1024. No portable / Vercel.

## v0.1.116 CIS_ROUTINGVIEW_LAYOUT_CHROME
- RoutingView layout chrome → Magpie `.rt-*` + bridge; `style={{` 58 → 10 (`--agent`/`--bar`/replay left). fromHub/max560 kept. SIDE_AT=1024. No portable / Vercel.

## v0.1.115 CIS_SIMPLEVIEWS_LAYOUT_CHROME
- SimpleViews Usage/Plugins layout chrome → Magpie `plugins.css` + bridge; `style={{` 118 → 10 (metric CSS vars). SIDE_AT=1024. No portable / Vercel.

## v0.1.114 CIS_LIBRARYVIEW_LAYOUT_CHROME
- LibraryView layout/field chrome → Magpie `library.css` + CIS Segs/WordsField/Tick + bridge classes. `style={{` 232 → 1 (health color). SIDE_AT=1024. No portable / Vercel.

## v0.1.113 CIS_LIBRARY_THUNAR_CHOOSE
- Library `LibThunar` / `LibChooseProject`: Magpie/demo GTK classes (`.lib-thunar*`, `.dialog.gtk-choose-project`); 0 `style={{` in those regions. Behavior kept.
- CIS listed knife empty for shell demo (aside from future nest). SIDE_AT=1024. No portable / Vercel.

## v0.1.112 CIS_PROVIDERS_OAUTH_WALLS
- Providers: signing note Magpie class; GTK Select Files `.gtk-select-files`; Move `.scrim`/`.pop.move`; Remove → ActionConfirm. Only `--detect-n` style token left.
- Library Thunar / Choose-project GTK mocks still Open. SIDE_AT=1024. No portable / Vercel.

## v0.1.111 CIS_LIBRARY_EDITOR_FIELDS
- Library MCP / Image / Skill / Hook editors: Magpie field classes + WordsField/Segs/PrefPick; LibChip CSS; 0 field-level `style` in editor region.
- Thunar / Choose-project GTK mocks and Providers OAuth/folder pickers still Open. SIDE_AT=1024. No portable / Vercel.

## v0.1.110 CIS_LIBRARY_SHEET_MODALS
- LibModal → Magpie `.modal` / `.dialog.lib-editor` (shell-patch; no inline chrome).
- How skills / Skills by agent / MCP by agent sheets: Magpie ehead/list/row/bar + Segs; no local styles.
- Library MCP/skill/hook/image editors still have field-level `style`. Providers OAuth/folder pickers Open. SIDE_AT=1024. No portable / Vercel.

## v0.1.109 CIS_LIBRARY_REMAINING_CONFIRMS
- Library skill remove / project remove (Keep-skills Tick) / Turn all off / single MCP remove / MCP project remove → `ActionConfirm` (+ `extra` slot).
- Non-confirm LibModals (How skills / by-agent sheets) and Providers OAuth/folder pickers still Open. SIDE_AT=1024. No portable / Vercel.

## v0.1.108 CIS_ACTIONCONFIRM_LIBRARY_GROUP
- Library discard / Instructions discard / project discard / MCP remove-all / remove-selected → `ActionConfirm`.
- GroupEditor discard + remove → `ActionConfirm` (Magpie `.action-confirm`).
- Providers OAuth walls / folder pickers / remaining LibModal (skill remove, project remove sheet, Turn all off, single MCP remove) still Open. SIDE_AT=1024. No portable / Vercel.

## v0.1.107 CIS_FOLD_TOAST_CONFIRM
- Extracted `Fold` / `FoldChev` — Gateway Connect+Models, Providers Turned off.
- Extracted `StatusToast` — App `#status` foot toast.
- Extracted `ActionConfirm` — Providers discard + Plugins Remove/Clear (Magpie confirmAction).
- CIS §10 Fold/StatusToast/ActionConfirm Done. Library LibModal discard/remove-all + GroupEditor modal still one-offs. SIDE_AT=1024. No portable / Vercel.

## v0.1.106 CIS_P2_PREFPICK_FIELDPILL
- Extracted `PrefPick` (`.sess-pick.pref-pick`) — Settings Language + FontRow.
- Extracted `FieldPill` (`.field` + k/v/chev) — Agents tiers / New sessions + Tray solo; removed one-off field border/height styles.
- Light Providers list chrome classes. CIS §10.5 P2 done. OAuth walls / remove-all confirms still open. SIDE_AT=1024. No portable / Vercel.

## v0.1.105 CIS_P1_PROVIDERS_EDITOR
- ProviderEditorModal: icon-pick / headers / discard use Magpie classes (`.icon-pick`, `.headers` `.pair` `.hhead`, `.action-confirm` + showModal + danger-fill). Editor layout inline styles cleared (only `--detect-n` CSS var remains).
- CIS §10.5 P1 marked done. P2 PrefPick / `.field` open. Outside-editor Providers styles deferred. SIDE_AT=1024. No portable / Vercel.

## v0.1.104 CIS_P0_SETTINGS_TICK
- Settings prefs: bare `input.words` / page-local flex styles → `WordsField` + Magpie classes (`.pref-anchor`, `.rule-add`, `.github-token-input`, `.words.full`); redact kinds use `PrefRow`.
- add-model + Sync/Export: native checkbox + inline `label.tick` styles → `Tick` (Magpie styled checkbox). Editor numeric fields get Magpie class names (`concurrency`, `queue-limit`, …).
- CIS §10.5 P0 marked done. P1 layout styles / P2 PrefPick still open. SIDE_AT=1024. No portable / Vercel.

## v0.1.103 CIS_COMPONENTS_ROUTING_WIRES
- CIS §10: Magpie-class component contract + React wrappers (`PrefRow` `TextBtn` `WordsField` `LibSwitch`); Settings/add-model mismatch prioritized; consume rule — no one-off styles.
- Routing live stage: Magpie-faithful wires (horizontal beside hub; vertical lane when `.rt-main.max560` / nest 117); viewBox + redraw on narrow. CSS max560 grid unchanged (agent‖magpie, No request yet full width).
- Shared extraction landed; Gateway port + Providers On/Off switches use wrappers. SIDE_AT=1024 kept. No portable / Vercel.

## v0.1.102 DUPLICATE_MOVE_FILTER_205_222
- Consumed native `routing/205–222` NOTES: Duplicate → **{name} copy** / **{name} copy 2** after original + toast **Duplicated {name}**; Move up/down gray at ends + toast **Group order saved**; handle tip **Drag to reorder — agents' model lists show the groups in this order · Alt+↑/↓ to move** (+ Alt+↑/↓); Filter every-word, empty **No group or model matches “{q}”**, Escape clears; Select hides Templates/Import/Select/New group (filter stays).
- Win chrome from v0.1.101 **kept** (`html.win` / caption / brand hide). SIDE_AT=1024; no WEB_SIDE_AT. No portable.

## v0.1.101 WIN_DESKTOP_CHROME
- Web/Electron desktop preview defaults to **Windows Magpie** chrome: fake OS title bar (`.win-caption`), `html.win` Segoe, in-page brand hidden, `side-top` 10px — from Magpie open source (`layout.js`, `app.css` L184/L347, `titlebar_other.go`).
- `SIDE_AT=1024` gold; no `WEB_SIDE_AT`; 752 nest frame kept; Duplicate 205–222 deferred. No portable.

## v0.1.100 WEB_FRAME_ZOOM_FIT
- Web card at text 110%: CSS width/height divide by `--zoom` so visual frame fits viewport (no left-shift / right clip at ~752–1100).
- SIDE_AT=1024 gold; no WEB_SIDE_AT; chrome-guard + zoom-aware check pass.
- Nest/routing consume still paused. No portable.

## v0.1.99 CHROME_GOLD_RESTORE
- Reverted v0.1.98 `WEB_SIDE_AT` (side-nav from 800px). Gold again: **top tabs under SIDE_AT 1024**; side-nav only ≥1024 / user toggle.
- Kept nest web frame **752×652** + text 110% from v0.1.91.
- Tip cycle: `docs/TIP-CYCLE.md` + `npm run chrome-guard` (blocks WEB_SIDE_AT, guards SIDE_AT/752/1024 gate).
- Nest/consume still paused. Vercel sync for verify. No portable.

## v0.1.82 SETTINGS_COLORBLIND_178_183
- Consumed native `settings/178–183` NOTES: Colorblind mode between Appearance and Language; **Off/On** only (no popover); hover darkens On label; segment `title` tip clipped ("Colorblind-safe chart colors, and each allowance windo…"); On → green **Saved** + `data-colorblind` (chart `--c1`–`--c7` / allowance dashes only — Settings chrome unchanged); Off restores **Saved** and removes `colorblind` key; Escape no-op while On.
- Visible Settings nest largely done. Still out of scope: Observability tab, Allowances quota body, Codex memories row.
- **No portable / GitHub release / Vercel** (user freeze).

## v0.1.81 SETTINGS_GENERAL_135_177
- Consumed native `settings/135–177` (161/164 dropped) NOTES: tray two-way + **Saved** → restored Open the quick panel; Provider **On** / Subagents **Off** / Compact at **272K** / four Codex chips own / Login **Off** / Lightweight **Off** / Prevent sleep **Off**.
- Dedicated endpoints (provider / subagents / compact / Codex pickers / login) **no toast**; Compact rejects `nope` (red), accepts `180k`, clears→272K, Full window hides field; titles menu **up**, use as typed, Escape no save; Descriptions **no Off**; predictions Off copy; auto-review **Codex's own pick**; Login On→demo autostart desktop, Off deletes; Lightweight tip ~100MB; Prevent sleep Screen on too changes subtitle.
- Observability hidden; Allowances **N/A**; Codex memories hidden. **No portable / GitHub release / Vercel** (user freeze).

## v0.1.80 SETTINGS_FONTS_107_134
- Consumed native `settings/107–134` NOTES: Interface/Code font family menus — **Search fonts…**, **✓ System default**, faces in own type, **Refresh fonts** (zzzznone → only Refresh; System default filtered out when query set); style menu shut on System default (no tooltip); after family pick style enables (Regular/Book); **Noto Sans CJK SC Bold** restyles chrome; **DejaVu Sans Mono Oblique** changes Aa preview only; Escape closes without change; green **Saved** on pick; both restored System default; textSize **110**; Observability hidden; Allowances **N/A**.
- Still mock: true OS font enumeration API (demo catalogue).
- **No portable / GitHub release / Vercel** (user freeze).

## v0.1.79 SETTINGS_SYNC_ABOUT_71_106
- Consumed native `settings/71–106` NOTES: Sync Set up WebDAV/S3/GitHub forms (Prefix/Region/Path-style, Branch/Folder/token hints, Usage day-file hint); Cancel / Turn on shown — **Turn on not required**; Export/Import Cancel; Import Choose… → GTK **Select File** (Home/Desktop/workspace/Other Locations, empty `.magpie-backup` list, Escape → No file chosen); Sync stays off.
- About: running **0.1.1240**, **0.1.1244 is downloaded**, Restart hover-only; What's new → **NOT INSTALLED YET** + Close (issue # as text); Update button Off→On→header purple arrow + Saved→Off; Automatic updates Off dims Check every / Restart automatically then On; Check every 30 min then **6 h**; Restart automatically On then Off; Mirror tip + editor Cancel; Config path copy → Path copied; CLI bash tip + Copy; Gateway URL copy; Discord/GitHub tips **not opened**.
- Allowances **N/A**. P1 bird **N/A**. **No portable / GitHub release / Vercel** (user freeze).

## v0.1.78 TRAY_25_27
- Consumed native `tray/25–27` NOTES honesty: Cursor **no effort field**; three faint unlit bars = **one** control; hover tip is row path `~/.cursor/cli-config.` (clipped) — **not** an effort name; click opens row with **model** line only (**no** slider / levels invented); hover again same path tip.
- Demo: `?panel=1` row `title` = path; `.eff[data-l=0]` no effort title; open body model-only.
- Tray effort recorded **thin** / GAP closed honestly. Allowances **N/A**. P1 bird **N/A**. **No portable / GitHub release / Vercel** (user freeze).

## v0.1.77 TRAY_22_24
- Consumed native `tray/22–24` NOTES: **＋ Save current** → name field placeholder **Profile name**, button **Save**, hint hidden; type `draft` without Enter/Save; blur on **PROFILES** label discards field → hint **none yet · save the setup to switch back in one click**, button **＋ Save current** again, no chip.
- Escape is **not** naming discard (`HideOnEscape` unmaps panel); blur is.
- Demo: `?panel=1` Profiles → Save current naming class `.profiles.naming` + `.chip-input`.
- Allowances **N/A**. P1 bird **N/A**. **No portable / GitHub release / Vercel** (user freeze).

## v0.1.76 TRAY_15_21
- Consumed native `tray/15–21` NOTES: rail **All models** / **Favorites** tips; Favorites → **No matches.**; filter `zzznomatch` → **use as typed** (no Enter); **Open Usage** → Requests · Today · **No calls today.** · 0 / ≈$0.000 · Request archive off; **Open Routing** → green live + **Another magpie serves the gateway; its routing plays live in that magpie's window.** (panel Routing still gateway-not-running); Escape unmaps panel.
- Demo: `?panel=1` · Open Routing sets `magpie.routingPeerServes=1` / `?rtPeer=1`; Escape → `.panel-unmapped`.
- Allowances **N/A**. P1 bird **N/A**. **No portable / GitHub release / Vercel** (user freeze).

## v0.1.75 ROUTING_MODES_99_114
- Consumed native `routing/99–114` NOTES: mode pills In order / In turn / Least used / Weekly pace / By weight / Manual + nest sentence; **Rate limited** stays for In order / Least used / Weekly pace, gone for In turn / By weight / Manual; By weight chips **Weight 1 · 50%** → edit **3** → **75% / 25%**; Manual rules line **The rules wait while you pick the model by hand.**; card picks opus/haiku + toast `{name}: every request to {model}`; Remove → **group removed**; Day pills **N/A**; P1 **N/A**.
- Code+docs+git only. **No portable / GitHub release / Vercel** (user freeze).

## v0.1.72 GATEWAY_STATUS_27_42
- Consumed native `gateway/27–42` NOTES: Restarting… → orange **not running** / Start (login tip, no red kept); Starting… clears red; port held by python3.13 red (Escape unchanged); **another magpie** green · no button; older **0.1.550** Quit… and take over (hover, no tip); take-over refused when Python (red, button stays); Quitting… → this magpie + Restart gateway; Copy gateway URL tip; models/recent empty; no confirm/Cancel; P1 bird **N/A**.
- Demo: `?gw=on|off|older|other` + `?gwHold=python` / `magpie.demoGwHold`. Still mock: real POST gateway/restart|take-over.
- Allowances **N/A**. Skip Vercel 402. P1 unchanged.

## v0.1.71 PLUGINS_OPTIONS_SORT
- Consumed native `plugins/104–138` NOTES: reinstall Think Tags + Word Guard → Installed · 2; sort A→Z/Z→A tips; search clear × → Discover; Options Save nest (unsaved tip, example JSON, Not JSON on `{`, Escape discard, toast **Think Tags's options saved**, tip **The options it runs with**, Applied + Clear confirm Escape, Editor Cancel).
- Busy label **Installing…** when Bun on disk. Seed left state matches NOTES.
- Allowances **N/A**. Skip Vercel 402. P1 unchanged.

## v0.1.70 PLUGINS_REMOVE_NEST

- Consumed native `interactions/native-linux/plugins/91–103` + NOTES into `PluginsView` Installed Remove.
- Magpie `confirmAction`: `showModal`, Cancel focused, Tab cycles Cancel↔danger Remove, Escape/Cancel/backdrop dismiss restores focus to row Remove; Enter on focused Remove reopens.
- Commit: empty Installed (no · N) + toast `{name} removed` same step — **Removing…** too brief on native (not frozen).
- Bun footer **1.4.3**. Empty: No plugins yet / Discover plugins.
- **Allowances:** still **N/A**. Skip Vercel 402. P1 unchanged.

- **v0.1.68** AGENTS_NEST_DONE — agents/19-42 Arrange / Cant connect / Manage / Install / Profiles Escape.
- **v0.1.67** SKILLS_HOW_DONE — library/72–85 chip re-on + Give skills as Saving… / By-agent Links·Copies.\n- **v0.1.66** MANUAL_INSTALL_DONE — plugins/66–72 Installing… / bun 404 err toast / field clear.\n## v0.1.55 FETCH_MODELS_DONE
- **v0.1.65** SKILLS_POST_DONE — library 63–71 Check/By agent/Add project/Remove + manual github Installing…

- **v0.1.64** SKILLS_INSTALL_DONE — library 57–62 Install nest + post-install list/how/projects.
- **v0.1.63** SKILLS_INSTALL_PARTIAL — Magpie-source Installing… / installed toast / have-tag (await library/57+).
- **v0.1.57** HOOKS_NEST_DONE — library 39–46 tool matcher + Cursor Matcher.

- **v0.1.56** EACH_MODEL_DONE / HOOKS_NEST_PARTIAL / DETAIL_INSTALL — System One Each warn + detect-grid; Hooks Cursor Matcher; Plugins detail Install path.

- Native providers **54–60** Custom Fetch models nest: empty-URL toast; port-9 refused red line; no chips; Discard.
- Models after Context/Max/Compact on Custom only.
- Still mock: true list/OAuth. Allowances N/A.

## v0.1.54 IMPORT_CLAUDE_DONE

- Import apps paths + empty Not found (NOTES 20–21); Import… tooltip; Claude Escape-safe import; GTK Select Files mock (NOTES 24).
- Fetch models nest **54+** not landed — PARTIAL.
- Still mock: true import/OAuth. Allowances N/A.

## v0.1.53 DETECT_APIS_DONE

- Native providers **44–53** Detect APIs nest consumed (amber tip, Asking…, no-model / dial refused rows, Discard).
- Custom More endpoints + Web search; vendor Endpoints Test shell.
- Still mock: true HTTP probe / OAuth. Allowances N/A.

## v0.1.52 DETECT_FETCH_DONE

- Custom Detect APIs / Each / Fetch models UI states aligned to Magpie (NOTES 06–07 + `app.js`); no real probe/list.
- Gateway `?gw=off|older` empty / take-over copy.
- Still mock: true Detect/favicon/file picker/OAuth/key persist. Allowances N/A.

## v0.1.51 PROVIDERS_LOCAL_DONE

- Consumed native providers **35–43** On-this-machine editors (Ollama nest + oMLX / LM Studio / MLX-Serve).
- Local form: Server address, optional key, Redaction, Key header, User-Agent, Context/Max/Compact.
- Still mock: true detect/Add/OAuth. Allowances N/A.

## v0.1.50 PROVIDERS_CUSTOM_DONE

- Custom 03–18 fidelity: proto tooltips + urlHint, Extra body placeholder, Edit-as-JSON headers, custom headers hint, Key header on custom Anthropic.
- Local On-this-machine editors → **v0.1.51** DONE (35–43).
- Still mock: true Detect/favicon/file picker/OAuth/key persist. Allowances N/A.

## v0.1.46 PLUGINS_REMOVE_CONFIRM

- Remove without moved → Magpie `action-confirm` dialog; Check for updates busy + Every plugin is up to date.
- Switch off/Remove nest with moved still awaiting recorder.
- Allowances N/A.

## v0.1.45 PLUGINS_INSTALL

- Consumed native plugins **35–40**: Install hover → Getting Bun… → Installed check + toast + Installed · 1; Installed row Bun 1.4.2.
- Switch off / Remove / Check for updates not exercised (next nest).
- Still mock: real Bun/npm; Allowances quota N/A.

## v0.1.44 MOTION_GAP

- Ported Magpie-only motion keyframes (`pm-pulse` / lib-* / `mk-spin`) into demo.
- Plugins: ghost search skeletons + detail README `pm-rskel`; Install still recorder-only (NOTES).
- Library: `lib-bob` on Find skills · `lib-probe` enter.
- GAP: tray Routing + sideEdge marked **closed** (done in 0.1.36). Remaining P1 = bird / OAuth / Allowances quota N/A.

## v0.1.43 AGENTS_MOTION

- Default Agents = native empty (Cursor only · Manage Select unconnected · Install 14 · Profiles none).
- Demo Connect/stale/ModelPop/Not-set-up fold behind `?demoAgents=1`.
- Motion: guide-x + agent-fold/install reduce + providers sorting.
- Still mock: true OAuth / provider arrange persist / Allowances quota body N/A.

## v0.1.42 ROUTING_NEST

- Templates show **Add a provider first** with no demo providers; Import disabled until paste; Accounts hidden default.
- New group editor / Discard / Import box from prior bumps.

## v0.1.41 FONTS_MENU + MOTION

## v0.1.41 FONTS_MENU + MOTION

- Interface/Code font menus (family + style + Search/Refresh) + preview; Appearance theming class.
- Still mock: OS font list API.

## v0.1.40 SETTINGS_NEST

## v0.1.40 SETTINGS_NEST

- Consumed native `interactions/native-linux/settings/10–70` + NOTES (disk has no 71–85).
- Allowances controls 1:1 structure (alert % field, balance amount, TRAY_EVERY 1/3/5/10/30, Linux no logos/bird). **No quota body invented.**
- Network GitHub Create one ↗; Models/Privacy/Sync/About nest; Observability tab off unless `magpie.feature.otel=1`.
- Still mock: live quotas, true token/port/sync/update APIs, Interface/Code font menus.

## v0.1.39 SETTINGS_NEST_PARTIAL

## v0.1.39 SETTINGS_NEST_PARTIAL

- General: Magpie `suffixSegs` Off / Not on names I set / On; Text size tip `Everything in magpie's windows…`; Interface/Code font System default + Aa preview (menus mock).
- Next: continue native settings 10–85 (Allowances/Network/Models/…).

## v0.1.38 PLUGINS_NEST

- Consumed native `interactions/native-linux/plugins/01–34` + NOTES into `PluginsView`.
- Tabs Built-in / Discover / Installed; Discover intro + market (Subscriptions, Gateway middleware, Agents, Unofficial on GitHub); search Suggested / On npm; Mirrors in China tip; manual install row + demo folder picker (Cancel leaves field); Built-in Magpie copy + Recent calls 10/20/50/100; Installed empty default.
- Detail modal facts + unofficial warning; Escape does not close (Close / backdrop do).
- **Allowances:** still **N/A** — not invented.
- Still mock: true npm/git install, OS folder picker, live listings API.

## v0.1.37 USAGE_NEST

- Consumed native `interactions/native-linux/usage/01–50` + NOTES into `UsageView`.
- Period **range-opt** (calendar SVG + Custom / picked label) + `openRangeMenu` (Yesterday / This·Last month / 90 days · first→last · ends/in/today · Esc/arrows).
- Refresh every: `pm-head` "Refresh every" + `pm-tick` check; Overview reload tip mentions allowances.
- Empty default matches native (calls==0): Overview period copy, Requests status/search/clear×/disabled Export, Sessions empty card + `~/.claude · ~/.codex · ~/.cursor`, Context Tuned-for-you note + dashed Through-magpie empty; ctx range Today/7d/30d only (`magpie.ctxDays`).
- **Allowances:** still **N/A** — native shots have no quotas; demo does not invent quota cards.
- Persist: `magpie.usageTab` / `usageEvery` / `sessRange` / `ctxDays`.

## v0.1.36 TRAY_CONSUME + GATEWAY_NATIVE

- Tray panel consumes native `interactions/native-linux/tray/01–14` (Agents / Usage periods / Routing gateway-off / model menu / Profiles empty / tips / handle tip).
- Allowances tab: **N/A** without quotas (Magpie hides it) — not scored as a gap.
- Bird logo wag + Routing demo FLIER wing `rtflap .42s`; `#sideEdge` width drag.

## v0.1.69 MIRROR_TOGGLE_DONE
- Mirrors in China On/Off + tip (71–75); switch On = fg track.
- No fake installs. P1 N/A. Skip Vercel.

## v0.1.73 ROUTING_RULES_31_54

- Consumed native `interactions/native-linux/routing/31–54` + NOTES into GroupEditor / RoutingView.
- Two members → **+ Add a rule** + info tip; rule row asks-for · **+ Add a condition** menu · **→ member**.
- Conditions: Conversation length, has an image, Reasoning level (≥ high), compacting, Agents (list through PI-Desktop; filter grok / zzzz → No matches; Escape leaves dashed any agent), in/not in folder, Hours and days (from/to + every day).
- Effort info tip; Levels **Named** chips (default low/medium/high).
- **Add** → green toast **group added**; row `group` / `group/group` · members · Smart · 1 rule · red **no member ready** · Edit · switch. Templates collapses to menu.
- Edit footer **Remove / Cancel / Save**; **Remove group?** → red Remove → toast **group removed**; templates cards return.
- P1 live bird hop: **N/A**. Skip Vercel 402.

- Code+docs+git only. **No portable / GitHub release / Vercel** (user freeze).

## v0.1.74 ROUTING_SEGMENTS_55_98

- Consumed native `interactions/native-linux/routing/55–98` + NOTES into GroupEditor.
- Rate limited Keeps/Goes to the back; Slow Wait/30s/1min/2min/Custom (hints in **seconds**; Custom prefills last pill; 5 min → 300 s); Every member busy Off/1/2/4 min; Context largest/smallest/Custom **200,000**; Stays Auto/Session/Within a turn/Off/Strict.
- Intent **choose a model**: empty No matches → typed opus; info tip; Intent hidden when rule is pause-only.
- Other conditions: Conversation length · has image · compacting · in/not in folder (short tips).
- Rule **⋯**: Move up/down · Pause the model instead · Remove rule → pause chip + orange note; Filter action send/pause.
- Cancel→Discard 98 unchanged. Day pills **N/A**. P1 bird hop **N/A**. No portable/Vercel this cycle (user freeze).
