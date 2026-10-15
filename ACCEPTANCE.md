## v0.1.166 · LED_RAIL_SCROLLBAR_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Magpie Usage `#ledRail` custom slim scrollbar beside `#ledRank` was missing — restore gold.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; drawLedRank + emphasize (0.1.165); skip oauth Approve wall.
- **Cite:** Magpie app.js ledRankEdges **L18193–18206**; ledRail **L18209–18229**; wired **L18324**; app.css **L1172–1178** / **L1182**; index.html **L197**.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.165 · LED_RANK_EMPHASIZE_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Magpie `#ledRank` was empty — restore `drawLedRank` + hover emphasize gold.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; day-pick + speed marks (0.1.163–164); skip oauth Approve wall; `#ledRail` deferred.
- **Cite:** Magpie app.js drawLedRank **L18126–18189**; emphasize **L18107–17** / **L18174–75**; choose **L18327–39**; ledSplit default **L17490**; app.css **L1147–1171**.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.164 · LED_SPEED_MARKS_STEMS_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Magpie led-chart Speed metric — pill track + category marks + leader stems (`metric===speed`).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; day-pick (0.1.163); skip oauth Approve wall; drawLedRank emphasize deferred.
- **Cite:** Magpie app.js drawLedColumns **L17974–76** / **L18030–55**; ledSpeed **L17884**; app.css **L1130–1135**.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.163 · LED_DAY_PICK_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Continue Magpie led-chart after 0.1.162 — restore day-column pick (`.led-day`) + selected `.hot` + dim other days (`emphasize(null)` when `l.day` set).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Magpie SVG led-chart columns/tip (0.1.162); skip oauth Approve wall; speed marks/stems + drawLedRank hover emphasize deferred.
- **Cite:** Magpie app.js drawLedColumns **L17981** selectable; **L18013–14** selected hot; **L18062–69** `.led-day` hits; **L18107–18** emphasize dimDay; **L18318–21** chooseDay toggle + reload; app.css **L1136–1137** `.led-day`.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.162 · LED_CHART_SVG_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** invent `us-miniplot` div bars → Magpie SVG `led-chart` (partial `drawLedColumns`).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefPick/WordsField; Magpie mk-official (0.1.160); skip oauth Approve wall.
- **Cite:** Magpie app.js drawLedColumns **L17962–18118** / ledAxis **L17923** / ledCategories **L17932**; app.css **L1122–1146**.
- **Partial:** day-pick / speed marks / led-rank emphasize → later tip.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.161 · DEAD_INVENT_CSS_AUDIT · 2026-10-16 Asia/Shanghai

- **WHY:** Audit leftover invent CSS / tip bridges in `shell-patch.css` with no live JSX/JS selectors — delete dead invent; restore Magpie context shareBar / score bar / Usage fill widths.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefPick/WordsField; Magpie mk-official/installs (0.1.160); us-miniplot demo led stand-in (Magpie led-chart=SVG); skip oauth Approve wall.
- **Cite:** Magpie context.js shareBar **L834–844** / score bar **L865–868**; context.css **L4–14** k-*/i.dot; app.js Usage `fill.style.width`; routing.css **L396–397** `.rt-act .bar i`.
- **Deleted (dead invent):** `.usage-relative` / `.pop.anchored-tr` / `.us-empty-copy` / `.us-fade` / `.us-col` / `.us-acts` / `.us-tools` / `.us-find*` / `.led-legend` / `.us-kpi` / `.muted-12` / `.us-detail` / `.us-end` / `.us-rowacts` / `.us-tick` / `#view-usage .sess-more` / `.usage-note.sm` / `.ctx-block` / invent `.ctx-empty` / `.pm-body-rel` / `.rt-col-live` / `.led-heat-legend` / `.model-pop .hint-sm` / invent k-* hardcode + `.ctx-mix-keys .dot` 6px / `--bar|--h|--grow` chart/share/meter/ctx-fill / `pm-tabs` media orphan.
- **Restore:** SimpleViews ctx-share → Magpie `k-*` + `flexGrow`; ctx-bar / share / meter / chart → `style.width|height`; RoutingView `.bar i` → `style.width`.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.160 · LIBRARY_MK_OFFICIAL_INSTALLS_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** invent skill `verified` / text-only installs → Magpie `mk-official` + `GLYPH.down` (library client/css).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefPick/WordsField; Magpie mk-icon / ag-conn; skip oauth Approve wall.
- **Cite:** library/client.js L4868–4882 / L4908–4909; library.css L423 / L428; app.js CHECK L219; GLYPH.down L41.
- **chrome-guard:** pass (SIDE_AT=1024).
- **No portable / Vercel.**
- **Handoff remaining invent (light):** demo oauth Approve wall (nest=browser by design); leftover shell-patch tip comments / invent CSS without live selectors (audit drop).

## v0.1.159 · AGENTS_CONN_SWITCH_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** invent Agents `.val.acts` Connect/Relocate → Magpie `lib-switch.ag-conn` + `.ag-link` (Relocate = Sessions).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefPick/WordsField; Magpie mk-icon (0.1.158).
- **Cite:** app.js L1067–1094 / L1308–1344 / L1389–1423; sessions/client.js L633 / L900+; app.css L3780–3794.
- **chrome-guard:** pass (SIDE_AT=1024).
- **No portable / Vercel.**
- **Handoff remaining invent (light):** demo oauth Approve wall (nest=browser by design); skill grid `mk-official` / installs GLYPH.down polish; any leftover shell-patch tip comments without live invent selectors.

## v0.1.158 · LIBRARY_MK_ICON_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Discover `mk-card` grid omitted Magpie `mk-icon` → restore `logo()` gold.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefPick/WordsField; Magpie mk-sheet (0.1.157).
- **Cite:** library/client.js L4709–4728 / L4775 / L4873; library.css L402–413.
- **chrome-guard:** pass (SIDE_AT=1024).
- **No portable / Vercel.**
- **Handoff remaining invent (light):** Agents `#view-agents .val.acts` Connect/Relocate bridge (`shell-patch` ~L929); demo oauth Approve wall (nest=browser by design); skill grid `mk-official` / installs GLYPH.down polish; any leftover shell-patch tip comments without live invent selectors.

## v0.1.157 · LIBRARY_MK_SHEET_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** invent image/skill `.ehead.detail` / `.blurb` → Magpie `mk-sheet` / `mk-sheethead` / `mk-about` / `mk-hint`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefPick/WordsField; Magpie field()/MCP `.bar`/OS file input.
- **Cite:** library/client.js L4795–4849 / L4899–4939; library.css L441–451.
- **chrome-guard:** pass (SIDE_AT=1024).
- **No portable / Vercel.**
- **Handoff remaining invent (light):** Discover cards still omit Magpie `mk-icon` on grid; demo oauth Approve wall; Agents `.val.acts` Connect/Relocate bridge; any leftover shell-patch tip comments without live invent selectors.

## v0.1.156 · GTK_SELECT_FILES_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** invent `.dialog.gtk-select-files` → Magpie OS `<input type=file>` (Providers import + Sync importForm).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefPick/WordsField; image/skill `.ehead.detail` / `.blurb` later.
- **Cite:** app.js L12425–12445 / L21668–21674.
- **chrome-guard:** pass (SIDE_AT=1024).
- **No portable / Vercel.**

## v0.1.155 · LIBRARY_MCP_REMOVE_BAR_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Library invent `.acts` MCP Remove / Copy config → Magpie `.bar` (editServer L2046–2091).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefPick/WordsField; invent gtk-select-files / ehead.detail / blurb later.
- **Cite:** client.js L2046–2091 / L79–82 / L3183–3205; app.css L2847–2848.
- **chrome-guard:** pass (SIDE_AT=1024).
- **No portable / Vercel.**

## v0.1.154 · LIBRARY_FIELD_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Library invent `field-block` / `label.field` / `.stack` / `.pair`+`.hrow` → Magpie `field()` + `lib-pairs` / `lib-slot`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefPick/WordsField; invent `.acts` / gtk-select-files / ehead.detail later.
- **Cite:** app.js L7219–7238; client.js L1900–2038 / L2270–2348; app.css L2693–2708; library.css L332–343.
- **chrome-guard:** pass (SIDE_AT=1024).
- **No portable / Vercel.**

## v0.1.153 · PROVIDERS_MOVE_ROW_MENU_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Providers invent `.pop.move` / `.scrim` → Magpie `openProviderMenu` → `openRowMenu` `.pop.row-menu`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefRow; Library invent `field-block` later.
- **Cite:** app.js L5713–5726 / L3497–3538; app.css L694–700.

## v0.1.152 · LIBRARY_HOOK_PROTO_MENU_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Hook editor When-it-runs / For-which-tools invent `.pop.menu` / `.gl` / `.text.item` → Magpie `openProtoMenu` `.pop.proto-menu`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefPick/PrefRow; Magpie library.css `lib-hookedit` / `lib-menu`; Copy-config proto-menu.
- **Cite:** library/client.js L2291–2347; app.js L13799–13849 openProtoMenu; app.css L2499–2506 `.pm-*`.
- **chrome-guard:** pass (SIDE_AT=1024).
- **No portable / Vercel.**

## v0.1.151 · LIBRARY_PROJECT_HOOK_OAUTH_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Cut Library invent project/hook/oauth/intro/Copy-config/lib-mini bridges → Magpie OSS DOM.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefRow/Segs/TextBtn; Magpie library.css; pref-anchor proto-menu Copy config; oauth wall Cancel-only nest sim.
- **Cite:** client.js L3535–3605 / L2247–2262 / L810 / L3183–3205; library.css L42–48 / L288–291 / L468–517 / L616–618; app.css L3250+ / L2847.
- **chrome-guard:** pass (SIDE_AT=1024).
- **No portable / Vercel.**

## v0.1.150 · LIBRARY_TIP_BRIDGES_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.149 — cut remaining Library tip invent bridges (`lib-setrow` / `lib-chev` / `lib-mcp.*` / `lib-savebar` pill / `lib-tag.agents` / invent `mk-card` / `pm-mirror-tip`) that re-owned Magpie `library.css` + client.js DOM.
- **CAUSE:** Demo Instructions used invent `lib-setrow`+`lib-chev`+`lib-tag.agents` instead of Magpie `row lib-row click lib-set` + `who`/`lib-tags` + `span.chev` (client.js **L1172–1198**); MCP used invent `card.lib-mcp` instead of `row lib-row click lib-server` (**L1463–1480**); Discover used invent card/`mk-card` who/tag/by instead of Magpie `mk-card click` + `mk-top`/`mk-who`/`mk-desc`/`mk-foot` (**L4762–4783**, **L4861–4888**); savebar tip pill999 fought library.css **L72–79**; Plugins invent `.pm-mirror-tip` fade-in instead of Magpie native `title` (plugins.js **L695**).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefRow/Segs/TextBtn; Magpie `library.css`/`plugins.css` import; true web-demo bridges: `.lib-intro` title, `.lib-addmenu` Copy-config pop, `.lib-mini` head glyphs, `.grow-min`/`.lib-find .words`, demo `.lib-project`/`.lib-hook`/oauth modal chrome (later tip).
- **Cite:**
  - Magpie `plugins/library/client.js` **1172–1252** `setRow`; **1463–1480** `serverRow`; **3134+** `pickBar`; **4762–4783** `serverCard`; **4861–4888** `skillCard`
  - Magpie `plugins/library/library.css` **72–79** `.lib-savebar`; **96–97** `.lib-row .chev`; **117–118** `.lib-tag`; **148–169** sets; **347** `.text.danger-fill`; **393–432** `.mk-grid`/`.mk-card`; **473–476** `.lib-srvwho`; **586** `.lib-pickbar`
  - Magpie `plugins.js` **695** `b.title` (no invent tip)
- **WHAT changed:** `LibraryView.tsx` Magpie set/MCP/mk-card/pickbar/savebar DOM; `SimpleViews.tsx` drop invent mirror tip; `shell-patch.css` drop ~80 invent `#view-library` / `pm-mirror-tip` rules.
- **chrome-guard:** pass (SIDE_AT=1024).
- **No portable / Vercel.**

## v0.1.149 · LIBRARY_THUNAR_GTK_CHOOSE_OSS_FIDELITY · 2026-10-15 Asia/Shanghai
- Drop invent in-app Thunar + GTK Choose-a-project (Magpie OSS: reveal + !web Choose).
- SIDE_AT=1024; nest 752×652; no portable / Vercel.

## v0.1.148 PLUGINS_GHKINDS_LIBRARY_RTK_OSS_FIDELITY
- Plugins GitHub kinds: invent button track → Magpie `segs.pm-ghkinds` (plugins.js L609; Segs CIS).
- Plugins installed row: invent `pm-name-row` → Magpie `pm-name` (plugins.css L67).
- shell-patch: drop invent Plugins ghkinds/ghnone/who/sum/meta/detail.dialog/pm-plugin/note.warn re-owns — Magpie plugins.css L48–76 / L144 / L191–207.
- Library RTK: invent `card.lib-rtk-card` + img + shell-patch gain/cmd/logo → Magpie `list.lib-card` + `.mask` (client.js L839–843; library.css L51–53 / L452 / L465).
- Library skillHow: invent `.opt .spin` CSS → Magpie `saving()` `.busy.saving` + CLI_SPIN SVG (app.js L14058 / L2094; app.css L2852).
- SIDE_AT=1024. No portable / Vercel.

## v0.1.147 AGENTS_FIELDS_UNPLUGGED_OSS_FIDELITY
- Agents New sessions: invent `fields inline` → Magpie `fields` (app.js L1903 line(fields)).
- Agents unplugged status: invent `sub faint` demo copy → Magpie `ag-st` / `ag-dot` / `ag-st-t` connectLine (app.js L1234–1272).
- shell-patch: drop invent `.ag-vl > .field` / `.fields.inline` / `#view-agents .sub.faint` / `.ag-cant` cursor — Magpie app.css L3814–3820 / L3840 / L3800.
- SIDE_AT=1024. No portable / Vercel.

## v0.1.146 ROUTING_REQ_MIN1150_SETTINGS_DEAD_INVENT_OSS_FIDELITY
- Routing selected request: drop invent class `on` + shell-patch `.rt-req.on` pill — Magpie `aria-pressed` only (routing.css L251).
- Routing hist cols: drop invent `.rt-cols.min1150*` + purpose/metric re-owns — Magpie min1150 on `.rt-more` (routing.js L260; routing.css L237–239 / L324–335); cols keep Magpie `solo` only.
- Settings shell-patch: drop dead invent `.sync-row` / `.mirror-row` / `.tray-usage-wrap` / `.models-empty` / `.search-apis*` / `.about-ver` / empty `.font-preview` / invent `.font-menu .opt .preview` — Magpie update-mirror-row / `.search-api` / `.font-preview` L3063+.
- SIDE_AT=1024. No portable / Vercel.

## v0.1.145 LIBRARY_OAUTH_LIBAPP_SIGNING_OSS_FIDELITY
- Library MCP OAuth app: drop invent `oauth-pair` + text × — restore Magpie `lib-app` + bare `field2` inputs + `lib-x` / closed `lib-addpair` (client.js L1971–2031; library.css L133–135 / L341–343).
- Library Sign-in waiting: drop invent `sign-row` + hint — restore Magpie `lib-signin` > `lib-signin-line` + `span.note` (client.js L1714–1733; library.css L131–132).
- Providers signing: drop invent shell-patch `.signing .mark` amber22 / `.s.note` / `.signing > .text` align-self — Magpie app.css L2563–2564 / L2603; Codex note class `s` only.
- SIDE_AT=1024. No portable / Vercel.

## v0.1.144 PLUGINS_ASK_INLINE_OPTS_OSS_FIDELITY
- Plugins installed ask: drop invent `pm-ask` / `pm-ask-say` / `pm-ask-sub` / `pm-ask-acts` card — restore Magpie in-row `.sub.ask` + `.val` Cancel|Not now + primary (plugins.js L1025–1108; plugins.css L88).
- Plugins middleware: `mwLine` (`.sub.pm-mw`) sibling before `optionsEditor` (plugins.js L1057–1059 / L1223); hide opts while asking; no empty `.sub`.
- shell-patch: drop invent `.pm-opts*` / `.pm-act*` overrides / `.pm-ask*` / `.pm-card.installing|.has` / invent `.pm-chip` pill999 / invent `.sub.ask` / dead `.pv-add-steps` / invent ghost+detail duplicates — Magpie plugins.css L79–88 / L114–132 / L135–140 / L173–182 / L193–207.
- SIDE_AT=1024. No portable / Vercel.

## v0.1.143 AGENTS_NATIVE_WHATSNEW_OSS_FIDELITY
- Agents Cursor native-only line: drop invent `ag-native-note` + square `.sq` — restore Magpie `connectLine` kind `"no"` → `.ag-st` > `.ag-dot` + `.ag-st-t` (app.js L1234–1240 / NATIVE_ONLY L1107; app.css L3762–3765).
- Settings What's new: drop invent `whatsnew-body` / `wn-badge` / `wn-ref` — restore Magpie `showWhatsNew` `.ebody` + `span.badge` "Not installed yet" + `a.wn-link` issues (app.js L4144–4152 / L4240–4246; app.css L3279).
- shell-patch: drop invent `.ag-native-note*` + dead `#view-agents .ag-exp.enter` / `.mt6` / `.mt2` / `.ag-tick` / `.ag-json-preview` + invent `.whatsnew-body`.
- SIDE_AT=1024. No portable / Vercel.

## v0.1.142 ROUTING_EMPTY_GSEL_LANPOP_OSS_FIDELITY
- Routing: drop invent live-stage `<p className="rt-req-head note">` under `.rt-top` — Magpie `rt-top` is only `.rt-what` + `.rt-mode` (routing.js L26–29 / L115 child `span.note` on Requests head only).
- Routing groups select bar: drop invent `text rt-pick-clear` — restore Magpie `selectBar` checkbox + `span.note` + `text danger rt-gremove` (routing.js L3773–3814).
- shell-patch: drop invent `#view-routing .rt-req-head.note` / `.rt-filters`+mb / `.rt-days` / `.empty-state` re-own / `.rt-cols` margin-top / `.rt-pick-clear` / `.rt-add-stack`; drop dead `.lan-pop*` (LAN already openProtoMenu 0.1.137). Magpie gold: routing.css L314–315 / L340 / L352–353; app.css L521–522.
- SIDE_AT=1024. No portable / Vercel.

## v0.1.141 GATEWAY_DOT_ERR_STATUSTOAST_OSS_FIDELITY
- Gateway status card: restore Magpie `dot old` when older (plugins/gateway/client.js L141) — demo only used `.on`/amber.
- Gateway fix error: restore Magpie `sub old err` (client.js L159; app.css L2095–2096) — drop invent bare `sub err` + invent `role="alert"` on the card line.
- StatusToast / showStatus: restore Magpie `status()` defaults — kind `""`, err timeout **8000**ms else 3500 (app.js L324–335); lift via `#modal` not invent `.modal:not(.out)`; drop invent `aria-atomic`.
- SIDE_AT=1024. No portable / Vercel.

## v0.1.140 PROJECT_REMOVE_LIBKEEP_AGENTS_SMASK_OSS_FIDELITY
- Library project remove: drop invent ActionConfirm.extra / Tick.keep / Discard-on-cancel — restore Magpie confirmRemoveProject openLib `.editor.lib-editor` + `label.lib-pick.lib-keep` (plugins/library/client.js L3668–3703; library.css L345).
- Agents relocate: drop invent inline `ag-relocate` / ag-settings / ag-quiet bar — restore Magpie askRelocate `.modal.lib` > `.editor.sm-ask` (plugins/sessions/client.js L901–959; sessions.css sm-ask-*).
- shell-patch: drop invent `.action-confirm .extra` + `#view-agents .ag-relocate*`.
- SIDE_AT=1024. No portable / Vercel.

## v0.1.139 LIB_MODAL_EDITOR_AG_CONFIRM_OSS_FIDELITY
- Library sheets: drop invent `.dialog.lib-editor` (+ unused `.sm`) — restore Magpie openLib `.modal.lib` > `.dialog` > `.editor.lib-editor` (plugins/library/client.js L4944; app.js openModal L8062+; `.editor` app.css L2693–2706 / L2847).
- shell-patch: drop invent `.lib-confirm` (wrong line-height 1.5) — Magpie library.css L346; drop invent pill `button.lib-ag` — Magpie library.css L187–217.
- SIDE_AT=1024. No portable / Vercel.

## v0.1.138 USAGE_AGENT_ROW_MENU_HID_OSS_FIDELITY
- Usage Agents ⋯ menu: drop invent `proto-menu open` + `proto-item` — restore Magpie `openRowMenu` `.pop.row-menu` + `.rm-item` + EYE_OFF (app.js L3497–3518 / L17375–17379; app.css L694–704).
- Usage hidden block: restore Magpie `.us-hid` + `.list` (index.html usageAgentsHid; app.css L1065–1072).
- shell-patch: drop invent `.us-more-pop` + invent `#view-usage .us-hidline` geometry fighting Magpie L1067–1070.
- SIDE_AT=1024. No portable / Vercel.
