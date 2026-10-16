> 设计与交互执行 [项目 CIS](docs/magpie-shell-cis-2026-10-15.md) 及其生效修订；当前核验步骤见 [CIS 执行验收清单 v1.1](docs/REPLICA-ACCEPTANCE.md)。清单不另立设计值或统一像素容差。以下为历史逐版本修改记录，不代表整体验收通过。

## v0.1.194 · CIS_NATIVE_BASELINE_AND_SHARED_CONTROLS · 2026-10-16 Asia/Shanghai

- WHY: 用户要求不一致不能停；按历史 CIS 与固定参考源码检查全部公共控件。
- CAUSE: 基础样式混用多个版本；浮层初始挂载与定位互相等待，且用浏览器坐标定位窗口内 absolute 元素；语言菜单外部监听抢先关闭选项；路由规则旧 DOM 与二次样式并存。
- WHAT kept: SIDE_AT=1024；窗口尺寸与导航解耦；原生 320ms 过渡；纯 mock 壳、PR → 临时预览工作流。
- WHAT changed: 六份基础 CSS 同步到 63be477 并加 cis-guard；共用浮层窗口坐标/边界；修复首次打开、方向键与回焦；统一图标、插件 logo、复制反馈与请求归档；路由规则四列/条件删除/完整编辑状态；移除演示控件；语言五种实际接线，额外词典按需分块。
- Checks: build/chrome-guard/cis-guard 通过；lint 59 warnings/0 errors。52 组页面/分区/宽度检查发现 390px Routing 窄屏 class 错位，修复后手机 13 组复测无溢出；设置语言四次切换、字体空结果、模型/规则菜单、规则保存再编辑、深色复制反馈实际检查。证据 interactions/web-cis-0.1.194。
- Remaining: 确认框焦点/遮罩拖动、Agent 模型管理完整页脚与排序等继续检查，见 docs/CIS-AUDIT.md；不宣称全应用/原生 Mac/FPS 验收完成。
- Ship: PR #1；不合并 main、不打 portable/exe、不发布生产环境。

## v0.1.193 · NAV_WINDOW_GEOMETRY · 2026-10-16 Asia/Shanghai

- WHY: 用户明确要求 1:1 继续复刻，修正折叠导航导致外框缩放的差异。
- CAUSE: shell-patch 将 1100×720 尺寸绑定 side-nav；原生 layoutNav 仅改变窗口内容，不改变 OS 窗口。
- WHAT kept: SIDE_AT=1024；紧凑 752×652 / 宽窗最大 1100×720 的视口与字号约束；320ms 原生曲线；设置/网关组件修复。
- WHAT changed: 预览宽高仅按视口选择；移除所有 side-nav 宽高覆盖；系统标题栏横贯窗口，折叠时位置/大小不变；同步 CIS 与 chrome-guard 新契约。
- Cite: Magpie 63be477 app.js L22749+ layoutNav；app.css L457–485 nav-morph。
- Checks: chrome-guard / build / lint 通过（lint 59 warnings、0 errors）；900/1048/1364px × 三页 × 两次切换，18 次外框与标题栏矩形不变，九次折叠后 thumb 对齐；125% 字号与 390px 无横向溢出。证据 interactions/web-frame-0.1.193。未采集 FPS，人工顺滑度待验收。
- Ship: 更新 PR #1 → 分支临时预览；无 main 合并、portable/exe 或生产部署。

## v0.1.192 · NAV_MORPH_REFERENCE_TIMING · 2026-10-16 Asia/Shanghai

- WHY: 用户追问折叠动效是否与参考仓库相同；逐项对比发现 v0.1.191 仍沿用了旧 CSS 的 500ms 曲线。
- WHAT changed: 按 Magpie 63be477 app.css L457–483 使用 --morph-t:.32s / cubic-bezier(.42,0,.58,1)，三组过渡共用参数；修正 CIS 中的 500ms 描述。
- WHAT kept: SIDE_AT=1024；Web 顶栏 752×652 / 侧栏最大 1100×720；v0.1.191 设置与网关修复。
- Remaining: 原生外框不随折叠缩放，当前 Web 框仍会变尺寸；已明确记录为复刻差异，不宣称完整动效 1:1。
- Checks: chrome-guard / build；时长与曲线逐项源码对照，未宣称 FPS 验收。PR #1 → 临时预览；无 portable / 生产部署。

## v0.1.191 · NAV_MORPH_CIS_CONTROLS · 2026-10-16 Asia/Shanghai

- WHY: 用户截图指出折叠侧栏卡顿、顶栏滑块错位，以及 Settings / Gateway 控件不一致。
- CAUSE: body/layout 提交晚于滑块测量；fitTop 观察自己会改尺寸的 nav；字体 grid 被 flex 补丁覆盖；菜单 45% 宽度上限在嵌套包装中重复作用；设置标题工具按视口定位被框裁切。
- WHAT kept: SIDE_AT=1024；752×652 顶栏 Web 框；Windows chrome；仅假数据壳；不扩展其他产品功能。
- WHAT changed: 原生 navMorph 与 React 同步布局；滑块监听选项尺寸/字体；PrefPick menu/protocol 两配方；字体恢复两列 grid；Settings 侧栏分区与页内 tabs 共用状态；标题栏搜索归入预览框；Gateway 使用 ConnectionField、与 Settings 共用 CopyButton，空模型占位和端口统一。
- Cite: yetone/magpie @ 63be477，app.js L8524–8599 / L22691–22739 / L22925–23030；index.html L153–183；app.css L2207–2220 / L3176–3205；plugins/gateway/client.js L364–481。
- CIS: docs/CIS-CONTROLS.md；Evidence: interactions/web-cis-0.1.191/NOTES.md。九组导航坐标和 390px 页面检查通过；未采集 FPS，用户顺滑度验收待确认。
- Ship: PR #1 → 分支临时预览；不 merge main，不打 portable/exe，不强制生产部署。

## v0.1.190 · AG_INSTALL_OPENAI_ICON_OSS · 2026-10-16 Asia/Shanghai
- Agents invent `div.ag-install-body` → Magpie siblings `ag-install-note` + `ag-install-row` under `section.ag-install` (paintInstalls; no body wrapper).
- NestedBlocks invent `openai-mark` / ◉ → Magpie `icon("openai")` = `span.ic[data-icon]` + `img`; Codex/Side selected use model icon.
- **Cite:** Magpie `app.js` **L2348–2392** paintInstalls; **L284–318** `icon()`; **L22407+** Codex picks; `app.css` **L628–645** `.ag-install*`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth; Magpie `.ag-install-*` CSS already vendored; GroupEditor / led-tools-extra deferred.
- No portable / Vercel.

## v0.1.189 · AG_DIFF_LINE_OSS · 2026-10-16 Asia/Shanghai
- AgentsView invent `pre.ag-diff-body` (+ blob) → Magpie `div.ag-diff-line.back` with `.op` / `code>.ind+.t` / `.ag-tag` (changesList line()).
- **Cite:** Magpie `app.js` **L1959–1991** `changesList`; **L1970–1977** `line()` → `ag-diff-line` + `del`/`back`; `app.css` **L3867–3876** `.ag-diff-line` (already vendored).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth; Magpie `.ag-diff-*` CSS already vendored; ag-install-body / openai-mark deferred.
- Routing tip extras / led-tools-extra left (skip unless clear).
- No portable / Vercel.

## v0.1.188 · FEAT_WHY_OSS · 2026-10-16 Asia/Shanghai
- Plugins Built-in invent `sub feat-use` (+ invent visible "In use…" sub) → Magpie `sub feat-why` with f.use ("1 gateway key"); "In use, so it stays on" stays on switch title only.
- **Cite:** Magpie `app.js` **L24450** `el("div","sub feat-why", t(f.use,…))`; **L24458** `b.title = t("In use, so it stays on")`; `app.css` **L3042** `.row.pref .sub.feat-why`; builtins.test `one: "1 gateway key"`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth; Magpie `.feat-why` CSS already vendored; routing tip extras / led-tools-extra deferred.
- Routing tip extras / led-tools-extra left (skip unless clear).

## v0.1.187 · OUTPUT_COMPACT_CXFIELD_OSS · 2026-10-16 Asia/Shanghai
- Providers Max output / Compact at invent `max-output`/`compact-at` + `.chips`/`.chip` → Magpie `input.outputs`/`input.compacts` in `.cxfield` + `.cxpicks`/`.cxpick` (app.js outputField / compactField).
- **Cite:** Magpie `app.js` **L9312–9331** `outputField`; **L9339–9358** `compactField`; `app.css` **L3464–3473** `.cxpicks`/`.cxpick` (already vendored).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth; Context window `.cxfield` from v0.1.186; Settings `.compact-at` segs untouched.
- Routing tip extras / led-tools-extra left (skip unless clear).
- No portable / Vercel.

## v0.1.186 · CTX_WINDOW_CXFIELD_OSS · 2026-10-16 Asia/Shanghai
- Providers Context window invent `ctx-window` + `.chips`/`.chip` → Magpie plain input in `.cxfield` + `.cxpicks`/`.cxpick` (app.js contextPicks).
- **Cite:** Magpie `app.js` **L8586–8587** / **L9264–9304** `contextPicks`; `app.css` **L3464–3473** `.cxpicks`/`.cxpick`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth; Magpie `.cxpicks` CSS already vendored.
- Max output / Compact at / routing tip extras / led-tools-extra left (next or skip).
- No portable / Vercel.

## v0.1.185 · LIB_SKILLHOW_NOTE_OSS · 2026-10-16 Asia/Shanghai
- Library skill-how bar invent `lib-skillhow-note` → Magpie `.note` inside `.lib-skillhow` (library.css L361 / client.js skillHowBar).
- **Cite:** Magpie `plugins/library/client.js` skillHowBar `el("span","note",…)`; `library.css` L361 `.lib-skillhow .note`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth; Magpie `.lib-skillhow` layout already vendored.
- Routing tip extras / led-tools-extra / ctx-window left (no clear 1:1 Magpie class swap this tip).
- No portable / Vercel.

## v0.1.184 · AM_MR_N_CK_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** AgentModelsPop invent `.am-tick` / `.am-name` (+ invent `.am-mr.on` / `.am-ord`) vs Magpie `am-mr` row: `span.n` + `span.ck` (SVG check) + hidden → `.off`; order uses `.am-or` + `.ix`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth; Magpie `.am-mr .n` / `.ck` / `.am-or .ix` gold already in tip CSS.
- **Cite:** Magpie app.js **L3308–3332** (`el("span","n")` / `el("span","ck")` + svg check); app.css **L3660–3671** / **L3707**.
## v0.1.183 · AGENTS_IC_SPAN_IMG_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** AgentsView still had bare `img.ic` on Relocate `ehead` (class on `<img>`); other Agents rows were `span.ic>img` missing Magpie `data-icon` + `draggable=false`. Magpie `icon()` / `askRelocate` / `pickRow` wrap `span.ic[data-icon]>img`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth; Magpie `.ic` / `.ic img` / `.editor .ehead .ic` gold.
- **Cite:** Magpie app.js **L284–322** `icon()`; **L7040–46** `pickRow`; sessions `askRelocate` **L903** `h.append(icon("claude"),…)`; app.css **L156–157** / **L2695**.
- **WHAT changed:** AgentsView Relocate bare `img.ic` + Agents manage/row/install `span.ic>img` → Magpie `span.ic[data-icon]>img` (`draggable={false}`). Repo `rg` bare `img.ic` / `img className="ic"` = 0.
- **Remaining invent (intentional skip):** oauth Approve wall; `rt-flier-demo`; `win-caption*`; `lib-hook*` / `pref-anchor` React bridges.
- **Guard:** `npm run chrome-guard`. No portable. No manual Vercel.

## v0.1.182 · ROW_IC_SPAN_IMG_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Bare `img.ic` on TrayPanel / GatewayView / Providers rows — Magpie `icon()` wraps `span.ic[data-icon]>img` (`draggable=false`).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth; Magpie `.ic` / `.ic img` gold; tile pickRow already span.ic.
- **Cite:** Magpie app.js **L284–322** `icon()`; **L7040–46** `pickRow`; app.css **L156–157** `.ic` / `.ic img`.
- **WHAT changed:** TrayPanel / Gateway / Providers bare `img.ic` → `span.ic[data-icon]>img`.
- **Remaining invent (weak/skip):** oauth Approve wall; `rt-flier-demo`; `win-caption*`; `lib-hook*` / `pref-anchor`; AgentsView bare `img.ic` (next).
- **Guard:** `npm run chrome-guard`. No portable. No manual Vercel.

## v0.1.181 · RANGE_OPT_SPAN_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Drop invent Usage `.usage-head .range-opt > span` max-width/ellipsis; restore Magpie `.range-opt` flex + hide-when-tight gold.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Magpie `.range-opt` gold in app.css; Custom calendar JSX.
- **Cite:** Magpie app.css **L2504–05** `.range-opt` flex/gap; **L1018** tight hide; **L2528** @640 hide; app.js **L14390** `opt range-opt`.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.180 · RT_PEER_FADE_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Drop invent `rt-peer` / `rt-fade`; restore Magpie `none rt-off` + plain `rt-replay` / `rt-log`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Magpie `.rt-off` gold.
- **Cite:** Magpie routing.js **L97** / **L3129–34** `offline()`; **L71**/`L100` rt-log/rt-replay; routing.css **L182** `.rt-off`; app.css fade-in not on those nodes.

## v0.1.179 · TILE_IC_SPAN_IMG_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Drop invent tile `img.ic-img`; restore Magpie `span.ic>img` (pickRow / icon()).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Magpie `.tile .ic` 18×18 + `.ic img` fill.
- **Cite:** Magpie app.js **L284–322** `icon()` → `span.ic`+img; **L7040–46** `pickRow`; app.css **L156–157** `.ic`/`.ic img`; **L2682** `.tile .ic`.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.178 · PM_FIND_NATIVE_CANCEL · 2026-10-16 Asia/Shanghai

- **WHY:** Drop invent Plugins search clear `pm-find-clear`; restore Magpie native `type="search"` cancel (`::-webkit-search-cancel-button`) + Escape.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Magpie `.pm-find` width/focus + Escape → Discover; `pm-ghfind` already bare.
- **Cite:** Magpie plugins.js **L637–55** `label.pm-find` + `input type=search` + Escape (no clear button); plugins.css **L10–19** `.pm-find` / `::-webkit-search-cancel-button { cursor: default }`.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.177 · PERIOD_LEDQ_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Drop invent Usage wrappers `period-wrap` + `led-q-wrap` / invent `led-q-clear`; restore Magpie plain `#period.segs` and bare `#ledQ.sess-filter` (Escape clears).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Magpie `.range-opt` / Escape clear; `#view-usage .usage-refresh` relative for pops.
- **Cite:** Magpie index.html **L138** `div.segs#period`; **L182** bare `input.sess-filter#ledQ`; app.css **L2782** `.segs` position:relative; **L3359** `body.web .usage-head > .segs`; app.js **L18964–65** Escape clears ledQ (no clear button).
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.176 · CTX_EMPTY_DASH_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Drop invent Context empty class `ctx-empty-dash` on Magpie `ctx-none`; Magpie OSS already styles title via `.ctx-none b`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Magpie `.ctx-none` dashed empty card + `b`/`span` copy.
- **Cite:** Magpie context.js **L1269–70** `el("div","ctx-none")` + `b`/`span`; context.css **L236–237** `.ctx-none` / `.ctx-none b` (font-weight 600).
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.175 · DETECT_GRID_FLAT_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Drop invent Providers Detect APIs row wrapper `dg-row` (+ shell-patch `display: contents`); restore Magpie flat `detect-grid` children (`dg-model` + `dg-cell`).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; `--detect-n` column count (React stand-in for Magpie inline `gridTemplateColumns`).
- **Cite:** Magpie app.js **L10023–45** `detect-grid` append name then cells (no row); app.css **L2902–09** `.detect-grid` / `.dg-head` / `.dg-model` / `.dg-cell` (no `.dg-row`).
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.174 · PM_HEAD_FOLDER_ROW_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** invent `pm-headrow` / `pm-folder-row` → Magpie `pm-head` + `.pm-browse`/`plugins/choose`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Magpie `.pm-manual`/`.pm-browse`.
- **Cite:** Magpie app.js **L13806** / **L19442** `pm-head`; app.css **L2495**; plugins.js **L853–868** browse/choose; plugins.css **L153–156** `.pm-browse`.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.173 · SESS_SHOW_HISTORY_EMPTY_RANGE · 2026-10-16 Asia/Shanghai

- **WHY:** Wire Magpie empty-range `text sess-show-history` ("All sessions") on Sessions `#sessStats` when range is empty but history matches filters.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; `sess-page-more`; `#sessAll`.
- **Cite:** Magpie app.js **L19607–18** / **L19611** `sess-show-history`; **L19564** `from`; sessions-empty-range.test.cjs **L38**; i18n "No sessions in this range".
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.172 · SESS_PAGE_MORE_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Drop invent Sessions list pager `sess-show-more` (+ invent Show less / "Show more · {n} left"); restore Magpie `text sess-page-more` + `Show {n} more`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; `#sessAll.sess-all` head control.
- **Cite:** Magpie app.js **L19681–83** `text sess-page-more` / `Show {n} more`; sessions/client.js **L656** `text sess-page-more sm-more`; app.css **L1392** `.sess-page-more`. (Empty-range Magpie `sess-show-history` = app.js **L19611** — different control; tip range→empty-with-history not wired yet.)
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.171 · US_EMPTY_STATS_NONE_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Drop invent Usage empty `us-empty` / card; restore Magpie `#stats.stats.empty > .none`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall.
- **Cite:** Magpie app.js renderUsage **L17250–55**; app.css **L1020–21**.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.170 · RT_GEDIT_DROP_INVENT_SHEET · 2026-10-16 Asia/Shanghai

- **WHY:** Broader invent audit — drop GroupEditor invent `ge-add-sheet` / `ge-full-row`; restore Magpie `editor.rt-gedit` + `.bar`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall.
- **Cite:** Magpie routing.js groupEditor **L4097** / bar **L4888–4938**; app.css **L2847–2848**.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.169 · LED_HEAT_TIP_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Magpie Usage heatmap tip polish — drop invent shell-patch `.heat-tip` / `.heat-grid i` transition; align tip DOM/handlers + `#ledHeatMetric` + tip cost `≈` with Magpie gold.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; ledFit (0.1.168); skip oauth Approve wall.
- **Cite:** Magpie app.css **L1202–1211** heat-grid/heat-tip; app.js **L18375–90** ledHeatTip; **L18458–59** grid pointerover/leave; **L18489–99** ledHeatKeepEnd+sized; **L14595** fmtCost; index.html **L205** `#ledHeatMetric`.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.168 · LED_FIT_TIGHT_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Magpie Usage `ledFit` tight/tighter column collapse was missing — restore gold (optional cols → details + #ledTight).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; #ledHScroll (0.1.167); skip oauth Approve wall.
- **Cite:** Magpie app.js `ledFit` **L18629–48**; `LED_COLS` **L18561–64**; RO/ledGrow **L18528–51**; ledDetail opt **L17673–80**; app.css **L1281–1296**.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.167 · LED_HSCROLL_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Magpie Usage `#ledHScroll` sticky bottom h-scrollbar was missing — CSS gold already in app.css but no DOM/sync; native `.led-wrap` scrollbar is height:0 so overflow was unreachable.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; #ledRail (0.1.166); heatmap (LedHeat); skip oauth Approve wall.
- **Cite:** Magpie app.js `ledHScroll` **L18513–18520**; scroll sync **L18521–22**; ResizeObserver **L18528–37** / **L18544–51**; index.html **L214**; app.css **L1247–1259**.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

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
