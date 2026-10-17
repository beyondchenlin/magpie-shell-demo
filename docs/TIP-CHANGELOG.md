## v0.1.208 · REVIEWED_WINDOWS_MILESTONE · 2026-10-17

两轮 review 修复 Agent 状态校验、对照模型目录、并发禁用和切页计时器问题；九项回归通过，build/两guard通过、lint55/0。WHY/CAUSE、保留范围、合并和交付边界见 docs/releases/v0.1.208.md。

## v0.1.207 · ELECTRON_SCREENSHOT_FIXES · 2026-10-17

WHY：用户安装后七图反馈。CAUSE：双标题栏、file 图标根路径、Agent 默认空态不匹配。WHAT kept：六原 CSS、窗口断点、Web 布局和模拟后端。WHAT changed：移除 Electron 模拟栏、修复本地图标、安装版五 Agent 显式对照样例。其余差异见 [七图对照](docs/cis/SCREENSHOT-COMPARISON-2026-10-17.md)，尚未宣称全完成。最终源75e29d1；构建/两guard及Electron本地文件检查通过，lint55/0；交付v207安装包。

## v0.1.195–206 · FROZEN_CIS_FINITE_VERIFICATION · 2026-10-16/17 Asia/Shanghai

WHY：在028dab5冻结29项范围内复现、修复、验证，不扩展真实服务或产品规划。WHAT kept：SIDE_AT1024、稳定窗口、320ms原曲线、六固定源CSS、mock和非生产边界。以下是UI来源链，不把提交数当验收数量。

| UI版本 / 最终SHA | 已证实原因与改动 | 有限证据 |
| --- | --- | --- |
| 195 /90099b9 | 字体style初焦/菜单生命周期、长对话翻译键 | cis-settings-90099b9 |
| 196 /874268b | 五API/SystemOne示例与复制失败、隐式模型默认 | cis-gateway-874268b |
| 197 /0a2a014 | thumb高度变化未纳入去重，折行定位修复 | cis-layout-0a2a014 |
| 198 /396c11c | 模型ghost即时失交互、协议/行/日期/模型管理状态机 | cis-menus-* |
| 199 /7880135 | 确认框焦点/框内位置、供应商完整配置保存/Gemini默认 | cis-confirm-7880135 |
| 200 /1100d15 | 组菜单共享控制器、MCP确认框Escape事件、移除无源详情占位 | cis-pages-1100d15 |
| 201 /bb1a250 | 图标/file失败fallback、特殊菜单共享控制器、移除通用开关.5覆盖 | cis-controls-a8976e0 |
| 202 /f896ebd | LAN缺键盘导航，接同一控制器 | cis-controls-a8976e0 |
| 203 /8431291 | 发现搜索框缺原生mk-find结构 | cis-controls-a8976e0 |
| 204 /a8976e0 | 指令/MCP/Skills默认结构与模型说明键；54690da未用变量tsc失败、未服务 | cis-controls-a8976e0 |
| 205 /5f7f9bc | 撤除7条无源日期/输入/Context/fade旧覆盖 | cis-final-5f7f9bc |
| 206 /1ebfb66 | Web活动快照绕过frame overflow，按既有frame裁切 | cis-release-1ebfb66 |

最新Checks：build/TypeScript/两guard、N3监督独立技术复核通过，lint55 warnings/0errors。27通过/0失败/2待验；Git/PR同步与6a6d47b自动部署已确认，但D2因Vercel连接403尚未实测受保护页面，D4用户未确认。未新增worktree/依赖环境，未改用户4173/rootdist，未合并main/生产部署/打exe。

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

- **WHY:** Hard invent leftovers — Agents "Install another" still wrapped note+rows in invent `div.ag-install-body`; Settings Codex/Side model chips still painted invent `span.ic.openai-mark` (◉ glyph) instead of Magpie `icon("openai")`.
- **CAUSE:** Tip invented a body wrapper Magpie never has, and a text-mark stand-in for Magpie `icon()`.
- **Cite:**
  - Magpie `app.js` **L2348–2392** `paintInstalls`: `section.ag-install` → `ag-install-head` + (when open) `p.ag-install-note` + `div.ag-install-row`s as **siblings** — no `ag-install-body`
  - Magpie `app.js` **L284–318** `icon(name)`: `span.ic` + `dataset.icon` + `img`/`mask`
  - Magpie `app.js` **L22407** / **L22463** / **L22488**: empty Codex pick → `icon("openai")`; selected → `icon(model.icon || "generic")`
  - Magpie `app.css` **L628–645** `.ag-install*` (no `.ag-install-body`)
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Magpie `.ag-install-*` CSS already vendored; routing tip extras / led-tools-extra / GroupEditor deferred unchanged.
- **WHAT changed:**
  - `AgentsView.tsx`: invent `div.ag-install-body` → Magpie fragment siblings (`ag-install-note` + `ag-install-row`).
  - `NestedBlocks.tsx`: invent `OpenAIIcon` / `openai-mark` → Magpie `MagpieIcon` (`span.ic[data-icon]` + `img` via `iconSrc`); Codex empty → `openai`, selected → model icon; SideModelPick selected → model icon.
  - `shell-patch.css`: drop invent `.ic.openai-mark`.
- **Remaining invent (intentional skip):** oauth Approve wall; `rt-flier-demo`; `win-caption*`; `lib-hook*` / `pref-anchor` React bridges. **Deferred (not 1:1 this tip):** routing.css tip extras `rt-info`/`rt-cond-*`/`rt-pause-*`/`rt-rule-more`/`rt-arrow`/`rt-effort-row` (GroupEditor rewrite); `led-tools-extra`.
- **Guard:** `npm run chrome-guard`. No portable. No manual Vercel.

## v0.1.189 · AG_DIFF_LINE_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Hard invent leftover — AgentsView connected "View" diff still painted invent `pre.ag-diff-body` with a raw `+` blob. Magpie OSS builds each preview row as `div.ag-diff-line` (`del` / `back`) via `changesList` / `line()`.
- **CAUSE:** Tip demo used a single `<pre>` invent wrapper instead of Magpie per-line DOM.
- **Cite:**
  - Magpie `app.js` **L1959–1991** `changesList`: `ag-diff` → `ag-diff-file` → `ag-diff-path` + lines
  - Magpie `app.js` **L1970–1977** `line()`: `el("div","ag-diff-line "+(del|back))` + `span.op` (−/↺) + `code` (`span.ind` + `span.t`) + optional `span.ag-tag` "value before connecting"
  - Magpie `app.css` **L3867–3876** `.ag-diff-line` / `.op` / `code` / `.del` / `.back` (already vendored in tip `app.css`)
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Magpie `.ag-diff-box` / `.ag-diff` / `.ag-diff-file` / `.ag-diff-path` / `.ag-tag` gold already in tip; `ag-install-body` / `openai-mark` deferred; routing tip extras / led-tools-extra unchanged.
- **WHAT changed:**
  - `AgentsView.tsx`: invent `pre.ag-diff-body` → two Magpie `div.ag-diff-line.back` rows (demo model/env restore lines) with `.op` ↺, `code>.ind+.t`, `.ag-tag` "value before connecting".
- **Remaining invent (intentional skip):** oauth Approve wall; `rt-flier-demo`; `win-caption*`; `lib-hook*` / `pref-anchor` React bridges. **Deferred (not 1:1 this tip):** routing.css tip extras `rt-info`/`rt-cond-*`/`rt-pause-*`/`rt-rule-more`/`rt-arrow`/`rt-effort-row` (GroupEditor rewrite); `led-tools-extra`. Live weak leftovers for later: `ag-install-body` (no Magpie wrapper), `openai-mark` (→ Magpie `icon("openai")`).
- **Guard:** `npm run chrome-guard`. No portable. No manual Vercel.

## v0.1.188 · FEAT_WHY_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Hard invent audit — Plugins Built-in still painted invent `div.sub.feat-use` for "1 gateway key", plus a second invent visible `div.sub.feat-why` with "In use, so it stays on". Magpie OSS uses only `sub feat-why` for `f.use` (e.g. "1 gateway key") and puts "In use, so it stays on" on the switch `title` only.
- **CAUSE:** Tip coined `feat-use` and duplicated the locked phrase as a visible sub instead of Magpie `renderBuiltins`.
- **Cite:**
  - Magpie `app.js` **L24450**: `who.append(el("div", "sub feat-why", t(f.use, { n: f.inUse })))`
  - Magpie `app.js` **L24458**: `if (f.inUse > 0) b.title = t("In use, so it stays on")`
  - Magpie `app.css` **L3042**: `.row.pref .sub.feat-why` (already vendored)
  - Magpie `builtins.test.cjs`: gateway `one: "1 gateway key"`
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Magpie `.feat-why` / `.feat-say` / `.feat-row` gold already in tip; LibSwitch title when locked unchanged; routing tip extras / led-tools-extra / ag-diff-body / ag-install-body / openai-mark deferred or next.
- **WHAT changed:**
  - `SimpleViews.tsx` Built-in: invent `feat-use` + invent visible locked sub → Magpie single `sub feat-why` ("1 gateway key") when locked; drop invent second sub.
- **Remaining invent (intentional skip):** oauth Approve wall; `rt-flier-demo`; `win-caption*`; `lib-hook*` / `pref-anchor` React bridges. **Deferred (not 1:1 this tip):** routing.css tip extras `rt-info`/`rt-cond-*`/`rt-pause-*`/`rt-rule-more`/`rt-arrow`/`rt-effort-row` (GroupEditor rewrite); `led-tools-extra`. Live weak leftovers for later: `ag-diff-body` (→ Magpie `ag-diff-line`), `ag-install-body` (no Magpie wrapper), `openai-mark` (→ Magpie `icon("openai")`).
- **Guard:** `npm run chrome-guard`. No portable. No manual Vercel.

## v0.1.187 · OUTPUT_COMPACT_CXFIELD_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Invent leftover — Providers editor Max output / Compact at still used invent `input.max-output` / `input.compact-at` + generic `.chips`/`.chip`. Magpie OSS builds `input.outputs` / `input.compacts` wrapped in `div.cxfield` with `div.cxpicks` / `button.cxpick` (same pattern as contextPicks).
- **CAUSE:** Tip mirrored profile `.chips` instead of Magpie Providers `outputField` / `compactField` (app.js #875 / #876).
- **Cite:**
  - Magpie `app.js` **L8588–8589** / **L9009–9010**: `ed.append(...outputField())` / `ed.append(...compactField())`
  - Magpie `app.js` **L9312–9331** `outputField`: `ox.classList.add("outputs")` → `el("div","cxpicks")` + `el("button","cxpick")` → `el("div","cxfield").append(ox, row)`
  - Magpie `app.js` **L9339–9358** `compactField`: `cp.classList.add("compacts")` + same `.cxfield`/`.cxpicks`/`.cxpick`
  - Magpie `app.css` **L3464–3473** `.cxpicks` / `.cxpick` / `.cxpick.on` (already vendored in tip `app.css`)
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Context window `.cxfield` from v0.1.186; Settings Long conversations `.compact-at` segs (app.js L21840+) untouched; Magpie `.cxpicks` CSS already in tip; routing tip extras / led-tools-extra unchanged.
- **WHAT changed:**
  - `ProvidersView.tsx`: Max output `input.max-output` + `.chips`/`.chip` → Magpie `input.outputs` inside `.cxfield` + `.cxpicks`/`.cxpick`; Compact at `input.compact-at` + `.chips` → Magpie `input.compacts` + same; add `COMPACT_CHIPS` matching Magpie L9342 sizes.
- **Remaining invent (intentional skip):** oauth Approve wall; `rt-flier-demo`; `win-caption*`; `lib-hook*` / `pref-anchor` React bridges. Live weak leftovers (not this tip): routing.css tip extras `rt-info`/`rt-cond-*`/`rt-pause-*`/`rt-rule-more`/`rt-arrow`/`rt-effort-row`; `led-tools-extra`.
- **Guard:** `npm run chrome-guard`. No portable. No manual Vercel.

## v0.1.186 · CTX_WINDOW_CXFIELD_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Invent leftover — Providers editor Context window still used invent `input.ctx-window` + generic `.chips`/`.chip`. Magpie OSS builds a plain `input()` wrapped in `div.cxfield` with `div.cxpicks` / `button.cxpick` (contextPicks).
- **CAUSE:** Tip mirrored profile `.chips` instead of Magpie Providers contextPicks (app.js #120).
- **Cite:**
  - Magpie `app.js` **L8586–8587** / **L9007–9008**: `const cx = input(…); field(t("Context window"), contextPicks(p, cx), …)` — plain input, no invent class
  - Magpie `app.js` **L9264–9304** `contextPicks`: `el("div","cxpicks")` + `el("button","cxpick"+…)` → `el("div","cxfield").append(cx, row)`
  - Magpie `app.css` **L3464–3473** `.cxpicks` / `.cxpick` / `.cxpick.on` (already vendored in tip `app.css` L3473–3482)
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Magpie `.cxpicks`/`.cxpick` CSS already in tip; Max output / Compact at still invent `max-output`/`compact-at` + `.chips` (next tips); routing tip extras / led-tools-extra unchanged.
- **WHAT changed:**
  - `ProvidersView.tsx`: Context window `input.ctx-window` + `.chips`/`.chip` → Magpie plain `input` inside `.cxfield` + `.cxpicks`/`.cxpick`.
- **Remaining invent (intentional skip):** oauth Approve wall; `rt-flier-demo`; `win-caption*`; `lib-hook*` / `pref-anchor` React bridges. Live weak leftovers (not this tip): routing.css tip extras `rt-info`/`rt-cond-*`/`rt-pause-*`/`rt-rule-more`/`rt-arrow`/`rt-effort-row`; `led-tools-extra`; Providers `max-output`/`compact-at` + `.chips` (Magpie `input.outputs`/`input.compacts` in `.cxfield`+`.cxpicks`).
- **Guard:** `npm run chrome-guard`. No portable. No manual Vercel.

## v0.1.185 · LIB_SKILLHOW_NOTE_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Weak invent leftover — skill-how note still carried invent class `lib-skillhow-note` beside Magpie `.note`. Magpie OSS paints `el("span","note",…)` only; layout is `.lib-skillhow .note`.
- **CAUSE:** Tip stacked a redundant invent class; CSS already matched Magpie `.lib-skillhow .note` (library.css L361).
- **Cite:**
  - Magpie `plugins/library/client.js` **skillHowBar**: `bar.append(by, el("span", "note", how === "copy" ? … : …))`
  - Magpie `plugins/library/library.css` **L361** `.lib-skillhow .note { font-size:11px; color:var(--faint); … flex:1 0 100%; margin-top:-4px }`
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Magpie `.lib-skillhow` / `.segs` / `.lib-updall` gold already in tip CSS; routing tip extras unchanged (Magpie uses `rt-rwarn` / `rt-cond.rt-act` / `.ctl` Remove — not a 1:1 class swap).
- **WHAT changed:**
  - `LibraryView.tsx`: `className="note lib-skillhow-note"` → Magpie `className="note"`.
- **Remaining invent (intentional skip):** oauth Approve wall; `rt-flier-demo`; `win-caption*`; `lib-hook*` / `pref-anchor` React bridges. Live weak leftovers (not this tip): routing.css tip extras `rt-info`/`rt-cond-*`/`rt-pause-*`/`rt-rule-more`/`rt-arrow`/`rt-effort-row`; `led-tools-extra`; `ctx-window` input class (Magpie plain input in `.cxfield` + `.cxpicks`).
- **Guard:** `npm run chrome-guard`. No portable. No manual Vercel.

## v0.1.184 · AM_MR_N_CK_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Hard invent audit — `AgentModelsPop` still painted invent checkbox `.am-tick.on` + `.am-name` (and invent `.am-mr.on` / `.am-ord`). Magpie OSS builds `button.am-mr` (+ `off` when hidden) with `span.n` / `span.ck` (stroke check SVG when shown); order rows are `.am-mr.am-or` with `.ix`.
- **CAUSE:** Tip v0.1.20 invented a bordered tick + renamed name class instead of Magpie `.n` / `.ck`.
- **Cite:**
  - Magpie `app.js` **L3308–3332** list row: `el("button","am-mr"+off+lock)` → `lg, n, x, ck`; `ck.append(svg("m3.5 8.5 3 3 6-7",12,1.9))` when `!m.hidden`
  - Magpie `app.js` **L3246–3254** order: `am-mr am-or` + `grip` / `ix` / `lg` / `n` / `x`
  - Magpie `app.css` **L3660–3675** `.am-mr .n` / `.ck` / `.off`; **L3707** `.am-or .ix`
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth; Magpie am-pop chrome CSS already vendored; no shell chrome change.
- **WHAT changed:**
  - `AgentModelsPop.tsx`: `.am-tick`/`.am-name` → Magpie `.n` + `.ck` (SVG path); invent `.on` → Magpie `.off` when hidden; order `.am-ord` → `.ix` + `.am-or`; `aria-checked` + `menuitemcheckbox`.
  - `app.css`: drop invent `.am-tick*` / `.am-name` / `.am-ord` / `.am-mr.on .am-name`.
- **Remaining invent (intentional skip):** oauth Approve wall; `rt-flier-demo`; `win-caption*`; `lib-hook*` / `pref-anchor` React bridges. Live weak leftovers (CSS-only / demo bridges, not this tip): routing.css tip extras `rt-info`/`rt-cond-*`/`rt-pause-*`/`rt-rule-more`/`rt-arrow`/`rt-effort-row`; `led-tools-extra`; `lib-skillhow-note`; `ctx-window` input class.
## v0.1.183 · AGENTS_IC_SPAN_IMG_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Hard invent audit — AgentsView Relocate `editor.sm-ask` `.ehead` still painted bare `img.ic` (class on the `<img>`, invent width attrs). Magpie OSS `askRelocate` does `h.append(icon("claude"), el("b",…))`; `icon()` builds `span.ic` + `dataset.icon` + `img.draggable=false`. Other AgentsView rows already used `span.ic>img` but omitted `data-icon` / `draggable` (incomplete vs Magpie `icon()` / `pickRow`).
- **CAUSE:** Tip put Magpie `.ic` on the Relocate header `<img>` instead of wrapping like Magpie `icon()`; row wraps lacked `dataset.icon` / `draggable`.
- **Cite:**
  - Magpie `app.js` **L284–322** `function icon(name)` → `el("span","ic")` + `dataset.icon` + append `img` (`draggable=false`) or mask/svg
  - Magpie `app.js` **L7040–46** `pickRow` → `b.append(icon(ic), nm)` on `button.tile`
  - Magpie `plugins/sessions/client.js` **L900–903** `askRelocate` → `editor.sm-ask` / `ehead` + `icon("claude")`
  - Magpie `app.css` **L156–157** `.ic` / `.ic img`; **L2695** `.editor .ehead .ic { width:20px; height:20px }`
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Tray/Gateway/Providers already Magpie span.ic (v0.1.182); Magpie `.ic` gold in tip CSS.
- **WHAT changed:**
  - `AgentsView.tsx`: Relocate ehead bare `img.ic` → Magpie `span.ic[data-icon="claude-color"]>img` (`draggable={false}`).
  - `AgentsView.tsx`: manage / row handle / install-who `span.ic>img` → add `data-icon` + `draggable={false}` (Magpie `icon()`).
  - Repo-wide `rg`: no remaining bare `img.ic` / `img className="ic"`.
- **Remaining invent (intentional skip):** oauth Approve wall (nest=browser); `rt-flier-demo`; `win-caption*`; intentional `lib-hook*` / `pref-anchor` React bridges. Bare `img.ic` invent queue empty.
- **Guard:** `npm run chrome-guard`. No portable. No manual Vercel.

## v0.1.182 · ROW_IC_SPAN_IMG_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Hard invent audit — TrayPanel agent handle / FieldPill trailing, Gateway model rows, and Providers list handle + `.use` chips still painted bare `img.ic` (class on the `<img>`). Magpie OSS `icon(name)` builds `span.ic` with `dataset.icon`, then appends `img` with `draggable = false` (file:/color/png); sizing is gold `.ic` + `.ic img`, not invent class on the image.
- **CAUSE:** Tip put Magpie `.ic` on the `<img>` in row chrome instead of wrapping like Magpie `icon()` / `pickRow`.
- **Cite:**
  - Magpie `app.js` **L284–322** `function icon(name)` → `el("span","ic")` + `dataset.icon` + append `img` (`draggable=false`) or mask/svg
  - Magpie `app.js` **L7040–46** `pickRow` → `b.append(icon(ic), nm)` on `button.tile`
  - Magpie `app.css` **L156–157** `.ic` / `.ic img { width:100%; height:100%; object-fit:contain }`
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Providers add-sheet tiles already `span.ic[data-icon]>img` (v0.1.179); Magpie `.ic` gold in tip CSS.
- **WHAT changed:**
  - `TrayPanel.tsx`: ag-handle + FieldPill trailing `img.ic` → Magpie `span.ic[data-icon]>img` (`draggable={false}`).
  - `GatewayView.tsx`: model row `img.ic` → Magpie `span.ic[data-icon]>img`.
  - `ProvidersView.tsx`: provider handle + agent `.use` chip `img.ic` → Magpie `span.ic[data-icon]>img`.
- **Remaining invent (weak/skip):** oauth Approve wall (nest=browser); `rt-flier-demo`; `win-caption*`; intentional `lib-hook*` / `pref-anchor` React bridges; AgentsView still one bare `img.ic` (out of this tip's Tray/Gateway/Providers scope).
- **Guard:** `npm run chrome-guard`. No portable. No manual Vercel.

## v0.1.181 · RANGE_OPT_SPAN_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Hard invent audit — Usage Custom `.range-opt > span` got invent `max-width` / `text-overflow: ellipsis` / `white-space` bridges under `.usage-head` (plus a redundant flex re-own). Magpie OSS `.range-opt` is only `inline-flex` + gap; label overflow is handled by hiding `:not(.on) > span` when `.usage-head.tight` or `@media (max-width: 640px)` — no span max-width.
- **CAUSE:** Tip invented ellipsis clamps for long custom range labels instead of Magpie's hide-when-tight gold.
- **Cite:**
  - Magpie `app.css` **L2504–05** `.range-opt { display:inline-flex; align-items:center; gap:5px }` / `.range-opt svg { flex:none }`
  - Magpie `app.css` **L1018** `.usage-head.tight .range-opt:not(.on) > span { display:none }`
  - Magpie `app.css` **L2528** `@media (max-width:640px) { .range-opt:not(.on) > span { display:none } }`
  - Magpie `app.js` **L14390** `button.opt.range-opt` (+ optional `on`) — no span clamp helpers
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Magpie `.range-opt` gold already in tip `app.css`; `#period` segs + Custom calendar JSX; `.usage-refresh .sess-menu` width; `.ctx-tune-note`.
- **WHAT changed:**
  - `shell-patch.css`: delete invent `.usage-head .range-opt` flex re-own + `.range-opt > span` / `.on > span` max-width/ellipsis/white-space.
- **Remaining invent (weak/skip):** oauth Approve wall (nest=browser); `rt-flier-demo`; `win-caption*`; intentional `lib-hook*` / `pref-anchor` React bridges; some rows still bare `img.ic` (not invent class `ic-img`) — TrayPanel / GatewayView / ProvidersView.
- **Guard:** `npm run chrome-guard`. No portable. No manual Vercel.

## v0.1.180 · RT_PEER_FADE_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Hard invent audit — Routing peer/offline used invent `pr-none rt-peer` plus shell-patch/routing `.rt-peer` margin/wrap; replay/log stacked invent `rt-fade` animation. Magpie OSS main view uses `div.none.rt-off` via `offline()`; tray panel alone uses bare `pr-none`. Magpie builds `rt-replay` / `rt-log` with no fade class (`fade-in` is for `.view` / status etc.).
- **CAUSE:** Tip borrowed tray `pr-none` into the main window and invented `rt-peer`/`rt-fade` bridges instead of Magpie `offline()` + plain stage nodes.
- **Cite:**
  - Magpie `routing.js` **L97** `el("div","none rt-off")`; **L3129–3134** `offline(msg)` hides top/stage/foot/log
  - Magpie `routing.js` **L3175–3179** peer copy when `gw.window`; **L5295** tray panel `el("p","pr-none",…)` only
  - Magpie `routing.css` **L182** `.rt-off { padding:18px 4px; text-align:center; color:var(--muted); font-size:13px }`
  - Magpie `routing.js` **L71** `el("div","rt-log")`; **L100** `el("div","rt-replay")` — no fade class
  - Magpie `app.css` **L3302** `@keyframes fade-in` (not bound to rt-replay/log)
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Magpie `.rt-off` / `.rt-replay` / `.rt-log` gold in routing.css; demo peerServes early return.
- **WHAT changed:**
  - `RoutingView.tsx`: peer card `p.pr-none.rt-peer` → Magpie `div.rt-main > div.none.rt-off`; drop `rt-fade` from `#rtReplay` / `#rtLog`.
  - `routing.css`: delete invent `.rt-peer.pr-none`.
  - `shell-patch.css`: delete invent `.rt-peer.pr-none` wrap + `#view-routing .rt-fade` / `.fast`.
- **Remaining invent (weak/skip):** oauth Approve wall (nest=browser); `rt-flier-demo`; `win-caption*`; intentional `lib-hook*` / `pref-anchor` React bridges; residual `.usage-head .range-opt > span` max-width ellipsis bridge; some rows still bare `img.ic` (not invent class `ic-img`).
- **Guard:** `npm run chrome-guard`. No portable. No manual Vercel.

## v0.1.179 · TILE_IC_SPAN_IMG_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Hard invent audit — Providers add-sheet tiles used invent `img.ic-img.ic` plus shell-patch `.tile img.ic-img { 18×18; object-fit }`. Magpie OSS `pickRow` appends `icon(ic)` → `span.ic` with child `img` (or mask/svg); sizing is gold `.tile .ic` + `.ic img`.
- **CAUSE:** Tip put the Magpie `.ic` class on the `<img>` and invented a fill class instead of wrapping like Magpie `icon()`.
- **Cite:**
  - Magpie `app.js` **L284–322** `function icon(name)` → `el("span","ic")` + append `img` (file:/color/png) or mask
  - Magpie `app.js` **L7040–46** `pickRow` → `b.append(icon(ic), nm)` on `button.tile`
  - Magpie `app.css` **L156–157** `.ic` / `.ic img { width:100%; height:100%; object-fit:contain }`
  - Magpie `app.css` **L2682** `.tile .ic { width:18px; height:18px; flex:none }`
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Magpie `.tile` / `.nm` / `.n`; React onError png fallback; editor `.ehead` already `span.ic>img`.
- **WHAT changed:**
  - `ProvidersView.tsx` tile: `img.ic-img.ic` → Magpie `span.ic[data-icon]>img` (`draggable={false}`).
  - `shell-patch.css`: delete invent `.tile img.ic-img`.
- **Remaining invent (weak/skip):** oauth Approve wall (nest=browser); `rt-flier-demo`; `win-caption*`; intentional `lib-hook*` / `pref-anchor` React bridges; weak: `rt-peer` / `rt-fade` extras; residual `.usage-head .range-opt > span` max-width ellipsis bridge; some rows still bare `img.ic` (not invent class `ic-img`).
- **Guard:** `npm run chrome-guard`. No portable. No manual Vercel.

## v0.1.178 · PM_FIND_NATIVE_CANCEL · 2026-10-16 Asia/Shanghai

- **WHY:** Hard invent audit — Plugins head search stacked invent `button.pm-find-clear` (×) + shell-patch styles on Magpie `.pm-find`. Magpie OSS uses bare `input type="search"` inside `.pm-find` and styles the **native** webkit cancel (`cursor: default`); Escape clears and re-runs oninput (Discover if needed). No custom clear control.
- **CAUSE:** Tip invented a React clear button (and previously hid webkit cancel) instead of Magpie native search cancel.
- **Cite:**
  - Magpie `plugins.js` **L637–55** `el("label","pm-find")` + `q.type = "search"` + glyph + Escape → clear/oninput (no clear button)
  - Magpie `plugins.css` **L10–19** `.pm-find` / `input::-webkit-search-cancel-button { cursor: default }`
  - Magpie `plugins.js` **L575–81** `pm-ghfind` same pattern (tip already bare)
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Magpie Escape + onChange → Discover when leaving Installed with leftover query; `.pm-find` gold in plugins.css.
- **WHAT changed:**
  - `SimpleViews.tsx`: drop invent `pm-find-clear` button + `searchInputRef` focus bridge; keep Magpie `type="search"` + Escape.
  - `shell-patch.css`: delete invent `.pm-find-clear` / `:hover`.
- **Remaining invent (weak/skip):** oauth Approve wall (nest=browser); `rt-flier-demo`; `win-caption*`; intentional `lib-hook*` / `pref-anchor` React bridges; weak: `ic-img` vs Magpie `span.ic>img`; `rt-peer` / `rt-fade` extras; residual `.usage-head .range-opt > span` max-width ellipsis bridge.
- **Guard:** `npm run chrome-guard`. No portable. No manual Vercel.

## v0.1.177 · PERIOD_LEDQ_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Hard invent audit — Usage period picker stacked invent `period-wrap` on Magpie `#period.segs`, and Requests search wrapped `#ledQ` in invent `led-q-wrap` plus invent `icon led-q-clear` with paddingRight. Magpie OSS uses plain `.segs#period` and a bare `.sess-filter#ledQ`; Escape clears the query (no clear button). Gold already gives `.segs` `position:relative` and `body.web .usage-head > .segs` wrap/max-width.
- **CAUSE:** Tip invented layout wrappers for calendar pop / clear UX instead of relying on Magpie `.segs` + Escape.
- **Cite:**
  - Magpie `index.html` **L138** `<div class="segs" id="period"></div>`
  - Magpie `index.html` **L182** bare `<input class="sess-filter" id="ledQ" type="search" …>`
  - Magpie `app.css` **L2782** `.segs { position: relative; … }`
  - Magpie `app.css` **L3359** `body.web .usage-head > .segs { max-width: 100%; flex-wrap: wrap; }`
  - Magpie `app.js` **L18964–65** Escape → clear ledQ / ledModel (no clear button)
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Magpie `.range-opt`; `#view-usage .usage-refresh { position: relative }` for pops; Escape clear (+ stopPropagation to match Magpie).
- **WHAT changed:**
  - `SimpleViews.tsx`: `segs period-wrap` → Magpie `segs`; unwrap `led-q-wrap`; drop invent `led-q-clear` + paddingRight.
  - `shell-patch.css`: delete invent `.usage-head .period-wrap`, `.led-q-wrap .sess-filter`, `body.web .usage-head .period-wrap`, `#view-usage .period-wrap` relative (`.segs` already relative).
- **Remaining invent (weak/skip):** oauth Approve wall (nest=browser); `rt-flier-demo`; `win-caption*`; intentional `lib-hook*` / `pref-anchor` React bridges; weak: `pm-find-clear` vs Magpie native search cancel; `ic-img` vs Magpie `span.ic>img`; `rt-peer` / `rt-fade` extras; residual `.usage-head .range-opt > span` max-width ellipsis bridge.
- **Guard:** `npm run chrome-guard`. No portable. No manual Vercel.

## v0.1.176 · CTX_EMPTY_DASH_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Hard invent audit — Context "Through magpie" empty state stacked invent `ctx-empty-dash` on Magpie `ctx-none`, with shell-patch `.ctx-empty-dash b { display:block; font-weight:600 }`. Magpie OSS uses only `div.ctx-none` with `b` + `span`; `.ctx-none` is already column flex and `.ctx-none b` already sets weight 600.
- **CAUSE:** Tip duplicated Magpie title styling under an invent modifier instead of relying on gold `.ctx-none b`.
- **Cite:**
  - Magpie `context.js` **L1269–70** `el("div","ctx-none")` → append `b` ("No prompts read yet") + `span`
  - Magpie `context.css` **L236–237** `.ctx-none` / `.ctx-none b` (color, 13.5px, font-weight 600)
  - Tip already mirrors gold in `app.css` / `context.css` `.ctx-none b`
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; Magpie dashed empty card markup (`b` + `span`).
- **WHAT changed:**
  - `SimpleViews.tsx`: `ctx-none ctx-empty-dash` → Magpie `ctx-none`.
  - `shell-patch.css`: delete invent `.ctx-empty-dash b`.
- **Remaining invent (weak/skip):** oauth Approve wall (nest=browser); `rt-flier-demo`; `win-caption*`; intentional `lib-hook*` / `pref-anchor` React bridges; weak: `period-wrap` / `led-q-wrap`; `pm-find-clear` vs Magpie native search cancel; `ic-img` vs Magpie `span.ic>img`; `rt-peer` / `rt-fade` extras.
- **Guard:** `npm run chrome-guard`. No portable. No manual Vercel.

## v0.1.175 · DETECT_GRID_FLAT_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Hard invent audit — clear Magpie-faithful invent in Providers Detect APIs: tip wrapped each model in invent `div.dg-row` + shell-patch `.detect-grid .dg-row { display: contents }`. Magpie OSS appends `code.dg-model` and `span.dg-cell` **directly** onto `div.detect-grid` (no row wrapper).
- **CAUSE:** React map convenience invented a per-model row; Magpie CSS grid places cells as direct children (`gridTemplateColumns` inline from asked APIs).
- **Cite:**
  - Magpie `app.js` **L10023–45** `el("div","detect-grid")` → append `dg-head`s, then per model `dg-model` + cells
  - Magpie `app.css` **L2902–09** `.detect-grid` / `.dg-head` / `.dg-model` / `.dg-cell*` — **no** `.dg-row`
- **WHAT kept:** SIDE_AT=1024; nest 752×652; skip oauth Approve wall; tip `--detect-n` CSS var (app.css) as React stand-in for Magpie inline columns.
- **WHAT changed:**
  - `ProvidersView.tsx`: Fragment flatten — drop invent `dg-row`.
  - `shell-patch.css`: delete invent `.detect-grid` column override + `.dg-row { display: contents }` (columns already in app.css via `--detect-n`).
- **Remaining invent (weak/skip):** oauth Approve wall (nest=browser); `rt-flier-demo`; `win-caption*`; intentional `lib-hook*` / `pref-anchor` React bridges; weak: `ctx-empty-dash` on Magpie `ctx-none`; `period-wrap` / `led-q-wrap`; `pm-find-clear` vs Magpie native search cancel; `ic-img` vs Magpie `span.ic>img`; `rt-peer` / `rt-fade` extras.
- **Guard:** `npm run chrome-guard`. No portable. No manual Vercel.

## v0.1.174 · PM_HEAD_FOLDER_ROW_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Drop invent Plugins/ProtoMenu wrappers `pm-headrow` + invent folder-picker `pm-folder-row` dialog; restore Magpie `pm-head` / system `.pm-browse` choose.
- **CAUSE:** Tip stacked `pm-head pm-headrow` + dead `#view-plugins .pm-headrow` flex wrap, and painted an in-app Recent/Home/Other folder dialog with invent `.pm-folder-row` rows over Magpie gold. Magpie OSS proto/sess menus use `.pm-head` only; folder install uses native `plugins/choose` beside `.pm-browse` (no in-app folder list). Same invent class as gtk-select-files (0.1.156).
- **Cite:**
  - Magpie `app.js` **13806** `el("div", "pm-head", t(head))` in `openProtoMenu`
  - Magpie `app.js` **19442** `top.append(el("div", "pm-head", t(head)), q)` in `openSessCombo`
  - Magpie `app.css` **2495** `.proto-menu .pm-head`
  - Magpie `plugins.js` **853–868** `browse` → `api("plugins/choose")` fills `pm-minput`; **846–847** web has no picker
  - Magpie `plugins.css` **153–156** `.pm-browse`
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Magpie `.pm-browse` / `.pm-manual` / `.pm-minput`; skip oauth Approve wall.
- **WHAT changed:**
  - `SimpleViews.tsx` ProtoMenu: `pm-head pm-headrow` → Magpie `pm-head`.
  - `SimpleViews.tsx` Plugins: drop invent `folderPicker` / `folderLoc` / `folderHint` / `.pm-folder-row` modal; `pm-browse` fills field via `showDirectoryPicker` when available else demo path (Magpie choose).
  - `shell-patch.css`: delete invent `#view-plugins .pm-headrow`.
- **Chrome:** none (Plugins/proto-menu nest slice only).
- **Remaining invent (weak/skip):** oauth Approve wall (nest=browser); rt-flier-demo; win-caption*; intentional React bridges; lib-hook* demo extras; pref-anchor React bridge.
- **Guard:** `npm run chrome-guard`. No portable. No Vercel.

---

## v0.1.173 · SESS_SHOW_HISTORY_EMPTY_RANGE · 2026-10-16 Asia/Shanghai

- **WHY:** Wire Magpie Sessions empty-range control `text sess-show-history` ("All sessions") when the picked range has no rows but history exists under the same filters.
- **CAUSE:** v0.1.172 restored list pager `sess-page-more` and noted empty-range cousin still unwired. Magpie OSS (app.js L19607–18) overrides empty copy to "No sessions in this range" and appends `button.text.sess-show-history` → sets `sessRange=all`.
- **Cite:**
  - Magpie `app.js` **19607–18** `from && all.some(…)` → `t("No sessions in this range")` + `el("button", "text sess-show-history", t("All sessions"))` → `sessRange = "all"`
  - Magpie `app.js` **19564 / 19020** range `from` via `SESS_RANGES` days; **19401** `sessDate`
  - Magpie test `sessions-empty-range.test.cjs` L38 `#sessStats .sess-show-history`
  - Magpie i18n `"No sessions in this range"` / `"All sessions"`
- **WHAT kept:** SIDE_AT=1024; nest 752×652; `sess-page-more`; `#sessAll.sess-all` head; skip oauth Approve wall.
- **WHAT changed:**
  - `SimpleViews.tsx`: filter Sessions by `sessRange` (Magpie day floor); empty `#sessStats` Magpie messages; wire `TextBtn.sess-show-history` → `setSessRange("all")`.
  - `usage-demo.ts`: shift s1/s2 `last` outside Today so Today → empty-range is demonstrable (default 30d still filled).
- **Chrome:** none (Sessions nest slice only).
- **Remaining invent (weak/skip):** oauth Approve wall (nest=browser); pm-headrow/pm-folder-row wrappers; rt-flier-demo; win-caption*; intentional React bridges; lib-hook* demo extras; pref-anchor React bridge.
- **Guard:** `npm run chrome-guard`. No portable. No Vercel.

---

## v0.1.172 · SESS_PAGE_MORE_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Drop invent Sessions pager class `sess-show-more` + invent copy/Show less; restore Magpie list pager `sess-page-more`.
- **CAUSE:** Tip invented `.sess-show-more` + "Show more · {n} left" / "Show less". Magpie OSS pages the Sessions list with `button.text.sess-page-more` and `Show {n} more` only (no collapse). Magpie `sess-show-history` is the empty-range "All sessions" control, not this invent.
- **Cite:**
  - Magpie `app.js` **19681–83** `el("button", "text sess-page-more")` + `t("Show {n} more", …)`
  - Magpie `plugins/sessions/client.js` **656** `text sess-page-more sm-more`
  - Magpie `app.css` **1392** `.sess-page-more`
  - Magpie `app.js` **19611** `text sess-show-history` (empty-range cousin; not this invent)
- **WHAT kept:** SIDE_AT=1024; nest 752×652; demo fill; `#sessAll`; skip oauth Approve wall.
- **WHAT changed:**
  - `SimpleViews.tsx`: pager → `className="sess-page-more"` + `t("Show {n} more")`; drop invent Show less branch.
  - `shell-patch.css`: delete invent `.sess-show-more` rule.
- **Chrome:** none (Sessions nest slice only).
- **Remaining invent (weak/skip):** oauth Approve wall (nest=browser); empty-range `sess-show-history` not yet wired (needs range→empty-with-history); pm-headrow/pm-folder-row; rt-flier-demo; win-caption*; intentional React bridges.
- **Guard:** `npm run chrome-guard`. No portable. No Vercel.

---

## v0.1.171 · US_EMPTY_STATS_NONE_OSS · 2026-10-16 Asia/Shanghai

- **WHY:** Drop invent Usage empty `card empty-state us-empty` + shell-patch pad; restore Magpie Usage empty `#stats.stats.empty > .none`.
- **CAUSE:** Tip invented a card/`us-empty` empty block (22px pad, bold title). Magpie OSS puts the empty copy inside `#stats` with `.empty` + child `.none` (same pattern as Sessions empty).
- **Cite:**
  - Magpie `app.js` **17250–55** `renderUsage` empty → `stats.classList.add("empty")` + `el("div","none", none + " " + tip)`
  - Magpie `app.css` **1020–21** `.stats.empty` / `.stats .none`
  - Magpie `app.js` **14434–37** `noCallsIn(period)`
- **WHAT kept:** SIDE_AT=1024; nest 752×652; demo "Show demo with data" TextBtn (demo affordance, Magpie text-btn family); skip oauth Approve wall.
- **WHAT changed:**
  - `SimpleViews.tsx` Usage empty → `<section class="stats empty">` + `.none` concatenated copy (drop invent `us-empty` / card / split b+span).
  - `shell-patch.css` delete `#view-usage .us-empty*`.
- **Chrome:** none (Usage nest slice only).
- **Remaining invent (weak/skip):** oauth Approve wall (nest=browser); `sess-show-more` vs Magpie `sess-show-history`; pm-headrow/pm-folder-row; rt-flier-demo; win-caption*; intentional React bridges.
- **Guard:** `npm run chrome-guard`. No portable. No Vercel.

---

## v0.1.170 · RT_GEDIT_DROP_INVENT_SHEET · 2026-10-16 Asia/Shanghai

- **WHY:** Broader invent audit (Usage queue exhausted except oauth Approve wall nest=browser). Clear Magpie-faithful invent in Routing GroupEditor chrome: tip invented `card ge-add-sheet` + `ge-full-row` + pop-in sheet CSS; Magpie OSS is plain `editor rt-gedit` + `.bar`.
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; nest 752 frame; ledFit/heatmap tips; skip oauth Approve wall.
- **WHAT changed:**
  - GroupEditor: `editor rt-gedit` only (drop invent `card ge-add-sheet`).
  - Footer: Magpie `.bar` only (drop invent `ge-full-row`; app.css `.editor .bar` already `grid-column: 1 / -1`).
  - Remove → Magpie `text danger` (routing.js L4891; `.editor .bar .danger` margin).
  - shell-patch: delete invent `.ge-add-sheet` / `.ge-full-row` / dead `.am-pop .empty` (Magpie am-pop empty = `.am-none`).
- **Cite:** Magpie `routing.js` groupEditor L4097 (`editor rt-gedit`), L4888–4938 (`.bar` + `text danger`); `app.css` L2847–2848.
- **Guard:** `npm run chrome-guard`. No portable. No Vercel.

---

## v0.1.169 · LED_HEAT_TIP_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Continue Magpie Usage after 0.1.168 — optional heatmap tip polish to Magpie gold (invent CSS out; tip behavior + metric segs id + cost format).
- **CAUSE:** shell-patch still re-owned Magpie `.heat-tip` (with invent `--pop-bg` fallback) and added invent `.heat-grid i` transition/cursor Magpie never ships; tip used per-cell leave (flicker) instead of Magpie grid pointerover/leave; Segs lacked `#ledHeatMetric`; tip cost used demo `fmtCost` (`≈$` + 4dp) instead of Magpie heat tip `≈` + `fmtCost` (`$` + 3dp under $1).
- **Cite:**
  - Magpie `app.css` **1202–1203** `.heat-grid i` (aspect/radius only) + **1203** hover outline; **1208–1211** `.heat-tip`
  - Magpie `app.js` **18375–18390** `ledHeatTip` (metric order + `≈` + fmtCost)
  - Magpie `app.js` **18458–59** `grid.onpointerover` / `onpointerleave`
  - Magpie `app.js` **18489–99** `ledHeatKeepEnd` + `ResizeObserver` on scroll+grid; scroll ignores own setAt
  - Magpie `index.html` **205** `.segs#ledHeatMetric`
  - Magpie `app.js` **14595–14601** `fmtCost` → `$` + decimals
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Magpie ledFit (0.1.168); skip oauth Approve wall (nest=browser).
- **WHAT changed:** `shell-patch.css` drop invent `.heat-tip*` / `.heat-grid i` transition; `LedHeat.tsx` Magpie grid pointer handlers + keepEnd observe grid + tip cost `≈$…`; `Segs` optional `id` → `#ledHeatMetric`.
- **Chrome:** none (nest Usage heatmap slice only).
- **Remaining invent:** oauth Approve wall (nest=browser by design). Heatmap invent queue after this tip.

## v0.1.168 · LED_FIT_TIGHT_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Continue Magpie Usage after 0.1.167 — restore `ledFit` tight/tighter column collapse so a narrow wrap hides `.lc-opt` (Sent / Effort / cache) into row details and can still drop `.price-reference` + shorten names.
- **CAUSE:** Tip table omitted Magpie optional columns + `ledFit()`; CSS gold (`.led.tight` / `.led.tighter` / `.led-tight`) was unused; overflow relied only on `#ledHScroll`.
- **Cite:**
  - Magpie `app.js` **18561–64** `LED_COLS` (opt → `lc-opt`)
  - Magpie `app.js` **18629–48** `ledFit`: remove tight/tighter → measure overflow → `.tight` → still over → `.tighter`; `#ledTight` after `#ledSum`
  - Magpie `app.js` **18528–37** ResizeObserver width → `ledFit`; **18544–51** `ledGrow` when table overflows without width change
  - Magpie `app.js` **17673–80** `ledDetail` `opt()` marks Sent/Effort as `.lc-opt` (shown only while `.led.tight`)
  - Magpie `app.css` **1281–1296** `.led.tight` / `.led.tighter` / `.led-tight`
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Magpie `#ledHScroll` (0.1.167); skip oauth Approve wall.
- **WHAT changed:** `SimpleViews.tsx` mounts Magpie `LED_COLS` + `ledFit` inside wrap RO; `#ledTight` hint; Sent/Effort/Cache/Speed columns + `price-reference`; detail `lc-opt`. `usage-demo.ts` adds `model` / `pricing_model`.
- **Chrome:** none (nest Usage slice only).

## v0.1.167 · LED_HSCROLL_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Continue Magpie Usage after 0.1.166 — restore sticky `#ledHScroll` that stands in for the Requests table's own horizontal scrollbar (native bar hidden).
- **CAUSE:** Tip had Magpie `.led-hscroll` CSS (app.css L1253–1259) + `.led-wrap::-webkit-scrollbar { height: 0 }` but no `#ledHScroll` DOM or `ledHScroll()` sync — table overflow could not be scrolled on WebKit.
- **Cite:**
  - Magpie `index.html` **214** `.led-hscroll#ledHScroll` sibling under `#ledWrap`
  - Magpie `app.js` **18513–18520** `ledHScroll`: show when table overflows; size inner div; mirror scrollLeft
  - Magpie `app.js` **18521–22** bidirectional scroll listeners
  - Magpie `app.js` **18528–37** / **18544–51** ResizeObserver → `--ledw` + `ledHScroll()`
  - Magpie `app.css` **1247–1259** `.led-wrap` / `.led-hscroll`
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Magpie #ledRail (0.1.166); heatmap already faithful; skip oauth Approve wall; `ledFit` tight/tighter deferred.
- **WHAT changed:** `SimpleViews.tsx` `UsageView` mounts `#ledHScroll` after filled `#ledWrap`; wires Magpie sync + ResizeObserver + `--ledw`.
- **Chrome:** none (nest Usage slice only).

## v0.1.166 · LED_RAIL_SCROLLBAR_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Continue Magpie led-chart after 0.1.165 — restore Magpie custom `#ledRail` slim scrollbar that tracks `#ledRank` scroll (native bar hidden; thumb drag / rail click).
- **CAUSE:** v0.1.165 restored `drawLedRank` + edge fades but deferred Magpie `ledRail($("#ledRail"), rank)` + rail sync inside `ledRankEdges` (app.js **L18193–18229**, wired **L18324**; HTML **L197**; CSS **L1172–1178**). Tip had CSS for `.led-rail` but no DOM/handlers.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Magpie led-chart day-pick + speed marks + drawLedRank emphasize (0.1.163–165); skip oauth Approve wall.
- **Cite:**
  - Magpie `index.html` **197** `.led-rail#ledRail` sibling of `#ledRank` inside `.led-body`
  - Magpie `app.js` **18193–18206** `ledRankEdges`: more-above/below + `rail.hidden` / thumb height / `translateY`
  - Magpie `app.js` **18209–18229** `ledRail`: pointerdown thumb drag + click-on-rail jump
  - Magpie `app.js` **18324** `if (!rank.rail) ledRail($("#ledRail"), rank)`
  - Magpie `app.css` **1172–1178** `.led-rail` / thumb; **1182** hide ≤860px
- **WHAT changed:** `LedChart.tsx` `LedRank` renders `#ledRail` sibling; syncs rail in edges effect; wires Magpie drag/click.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

---
## v0.1.165 · LED_RANK_EMPHASIZE_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Continue Magpie led-chart after 0.1.164 — restore empty `#ledRank` with Magpie `drawLedRank` + hover `box.emphasize` that dims non-matching chart columns.
- **CAUSE:** v0.1.162–164 restored SVG columns / day-pick / speed marks but left `<div id="ledRank" />` empty and deferred Magpie rank list + `box.chart?.emphasize?.(id)` (app.js **L18126–18189**, **L18174–75**, **L18107–17**; wired at **L18323–39**).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Magpie led-chart day-pick + speed marks/stems (0.1.163–164); skip oauth Approve wall. Custom `#ledRail` scrollbar deferred.
- **Cite:**
  - Magpie `app.js` **17490** `ledSplit = "model"` default
  - Magpie `app.js` **17915** `ledRankValue`; **17932–17936** `ledCategories` top/rest/list + `LED_SHOWN=7`
  - Magpie `app.js` **18107–17** `box.emphasize(key)` — dimDay faint + opacity `.22` when day|key miss
  - Magpie `app.js` **18126–18189** `drawLedRank`: `.rk` / `.rk-a` / `.rk-bar` / `.rk-b` / Other plain
  - Magpie `app.js` **18174–75** pointerenter/leave → `emphasize(id|null)`
  - Magpie `app.js` **18323–39** `rank.chart = chart`; choose toggles provider/agent/model filter
  - Magpie `app.css` **1147–1171** `.led-rank` / `.rk` / more-above|below masks
- **WHAT changed:** `LedChart.tsx` `emphasizeKey` + export `LedRank`; `SimpleViews` wire rank + pick filter + Magpie default split `model`; `ledCategories` returns rest/list.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

---
## v0.1.164 · LED_SPEED_MARKS_STEMS_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Continue Magpie led-chart after 0.1.163 day-pick — restore Speed metric marks/stems that Magpie draws when `metric===speed` (speeds don't stack; pill track + per-category marks; leader stems when a mark is above the day's aggregate).
- **CAUSE:** v0.1.162–163 restored stacked columns + day-pick but deferred Magpie drawLedColumns **L17974–76** / **L18030–55** (`rect.col.all` track, `rect.col.mark`, `line.stem`) and LED_TREND Speed seg (**L17866–68**).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Magpie SVG led-chart + `.led-day` pick (0.1.162–163); skip oauth Approve wall. `drawLedRank` hover emphasize (empty `#ledRank` list) still deferred.
- **Cite:** Magpie app.js `ledSpeed` **L17884**; `drawLedColumns` speed branch **L17974–76**, **L18030–55**; tip All/TTFT **L18084–96**; app.css **L1130–1135** `.col.all` / `line.stem`.
- **WHAT changed:** demo trend parts/points get `decode_*` / `ttft_*`; `LedChart` speed path; Usage metric Segs + `Speed`.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

---
## v0.1.163 · LED_DAY_PICK_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.162 SVG `led-chart` — restore Magpie day-column pick that was deferred (`.led-day` / selected hot / dim non-picked days).
- **CAUSE:** v0.1.162 restored stacked `rect.col` + `.tip` but skipped Magpie `chooseDay` path where day-bucket charts get transparent `.led-day` hit targets, a persistent selected `.hot`, and `box.emphasize(null)` dimming columns whose `data-day !== l.day` (app.js **L17981**, **L18013–14**, **L18062–69**, **L18107–18**; wired at **L18318–21**).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Magpie SVG led-chart grid/axis/hot/col/tip (0.1.162); dead-invent CSS audit (0.1.161); oauth Approve wall skip (nest=browser). Speed marks/stems (`metric===speed`) and `drawLedRank` hover emphasize (rank list) still deferred.
- **Cite:**
  - Magpie `app.js` **17981** `selectable = l.bucket === "day" && !!box.chooseDay`
  - Magpie `app.js` **18013–14** selected-day `.hot` rect
  - Magpie `app.js` **18062–69** `.led-day` role=button / tabindex / aria-pressed / chooseDay
  - Magpie `app.js` **18107–18** `box.emphasize`: dimDay → opacity `.22` + faint fill; focus restore
  - Magpie `app.js` **18318–21** Usage `chooseDay`: toggle `ledDay`, reset offset, reload ledger
  - Magpie `app.css` **1136–1137** `.led-chart .led-day` cursor / focus-visible stroke
- **WHAT changed:** `LedChart.tsx` day/`onChooseDay` props, `.led-day` hits, selected hot, dim non-picked cols; `SimpleViews` `ledDay` state + ledger day filter + period clears day.
- **chrome-guard:** pass (SIDE_AT=1024). Push/PR #1. No portable/Vercel.

## v0.1.162 · LED_CHART_SVG_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.161 — replace invent Usage `us-miniplot` div-bar stand-in with Magpie SVG `led-chart` gold (partial restore of `drawLedColumns`).
- **CAUSE:** CIS Usage bridge painted `#ledChart.led-chart.us-miniplot` as flex `.col` height bars (`--h`/`--op`) + invent shell-patch CSS, covering Magpie `drawLedColumns` where `#ledChart` gets `.plot` → SVG (`.grid` / `.axis` / `.hot` / `rect.col`) + `.tip` (app.js **L17962–18118**; app.css **L1122–1146**).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Magpie mk-official/installs (0.1.160); dead-invent CSS audit (0.1.161); oauth Approve wall skip (nest=browser). Full Magpie day-pick (`.led-day`), speed marks/stems, and `drawLedRank` emphasize sync deferred — next tips.
- **Cite:**
  - Magpie `app.js` **17951–17957** `sv()` SVGNS helpers
  - Magpie `app.js` **17923–17928** `ledAxis`; **17932–17936** `ledCategories` + `LED_SHOWN=7`
  - Magpie `app.js` **17962–18118** `drawLedColumns`: `.plot` + svg + stacked `rect.col` + `.tip`
  - Magpie `app.css` **1122–1146** `.led-chart` / `.plot` 236px / `.grid` / `.axis` / `.hot` / `.tip` / `.none`
- **WHAT changed:** `LedChart.tsx` + `buildDemoLedTrend()`; `SimpleViews` drop invent `us-miniplot` → `<LedChart metric split />`; `shell-patch.css` drop invent `#view-usage .us-miniplot` rules.
- **chrome-guard:** pass (SIDE_AT=1024). Push/PR #1. No portable/Vercel.

## v0.1.161 · DEAD_INVENT_CSS_AUDIT · 2026-10-16 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.160 — audit leftover invent CSS / tip comments in `shell-patch.css` (and related) without live selectors in JSX/JS; delete dead invent; where invent fought Magpie gold, restore Magpie.
- **CAUSE:** CIS v0.1.115 Usage/Plugins chrome bridge left many invent selectors (`.us-acts` / `.anchored-tr` / `.pm-body-rel` / invent k-* palette / `--bar` fills…) that never landed in React, plus invent that fought Magpie context.css / shareBar / score bars.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Magpie mk-official + installs (0.1.160); us-miniplot demo ledger stand-in (Magpie led-chart is SVG); oauth Approve wall skip (nest=browser).
- **Cite:**
  - Magpie `context.js` **834–844** `shareBar`: `i.k-{k}` + `style.flexGrow`
  - Magpie `context.js` **865–868** score `.ctx-bar` + bare `i` + `style.width`
  - Magpie `context.css` **4–14** `--k-*` / `.k-*` / `i.dot` 8×8 radius 2.5
  - Magpie Usage `fill.style.width` (app.js); routing.css **396–397** `.rt-act .bar i`
- **WHAT changed:** Delete dead invent rules listed in ACCEPTANCE; SimpleViews + RoutingView Magpie-faithful width/flexGrow; drop invent k-* hardcode fighting context.css.
- **chrome-guard:** pass (SIDE_AT=1024). Push/PR #1. No portable/Vercel.

## v0.1.160 · LIBRARY_MK_OFFICIAL_INSTALLS_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.159 — restore Discover skill `mk-card` Magpie `mk-official` + installs `GLYPH.down` that demo omitted (text-only installs / invent `verified` flag).
- **CAUSE:** Demo skill market cards painted `mk-title` alone and `mk-installs` as bare text, covering Magpie `skillCard` gold where `official` → `span.mk-official` + CHECK svg (title "Official — from the team that makes it") and installs → `svg(GLYPH.down)` + compact count (library/client.js **L4868–4882**; library.css **L423** / **L428**). Sheet meta also missed Magpie `mk-badge` "Official" (**L4909**).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefPick/WordsField/Segs/TextBtn/LibSwitch; Magpie mk-icon (0.1.158) + Agents ag-conn (0.1.159); demo oauth Approve wall (nest=browser by design).
- **Cite:**
  - Magpie `plugins/library/client.js` **4868** `mk-official` + `svg(CHECK, 9, 2.2)` + title
  - Magpie `plugins/library/client.js` **4878–4882** `mk-installs` + `svg(GLYPH.down, 11, 1.5)` + compact
  - Magpie `plugins/library/client.js` **4908–4909** skillSheet meta installs badge + Official badge
  - Magpie `plugins/library/library.css` **423** `.mk-official`; **428** `.mk-installs`
  - Magpie `app.js` **219** `CHECK`; library/client.js **41** `GLYPH.down`
- **WHAT changed:** `LibraryView.tsx` DEMO `verified`→`official`; Discover skill cards restore Magpie `mk-official` + `GLYPH.down` installs; skillSheet meta adds Magpie Official `mk-badge`; zh Official title + `{n} installs`.
- **chrome-guard:** pass (SIDE_AT=1024). Push/PR #1. No portable/Vercel.

## v0.1.159 · AGENTS_CONN_SWITCH_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.158 — cut Agents invent `#view-agents .row.agent .val.acts` Connect/Relocate text buttons that covered Magpie `connectSwitch` / `expandLink` gold.
- **CAUSE:** Demo painted Connect + Relocate as invent `.val.acts` flex (shell-patch display/gap) with `button.text` / `text primary` labels, covering Magpie `connectRow` where a wired row gets `expandLink` (`.ag-link` Collapse/Tiers/Details) + `connectSwitch` (`button.lib-switch.ag-conn` role=switch) and Relocate lives only in Sessions as `button.text` "Relocate project" → `askRelocate` (app.js **L1067–1094** / **L1308–1344** / **L1389–1423**; sessions/client.js **L633** / **L900+**; app.css **L3780–3794**).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefPick/WordsField/Segs/TextBtn/LibSwitch; Magpie mk-icon (0.1.158); demo oauth Approve wall (nest=browser by design); Magpie askRelocate `editor.sm-ask` modal already (0.1.140).
- **Cite:**
  - Magpie `app.js` **1067–1094** `connectSwitch`: `lib-switch ag-conn` + role=switch; wired → `askDisconnect`
  - Magpie `app.js` **1308–1344** `expandLink`: `.ag-link` / Collapse · Tiers · Models · Details + chev
  - Magpie `app.js` **1389–1423** `connectRow`: append expandLink + start/menu + `sw`; else `ag-cant`
  - Magpie `app.css` **3780–3794** `.ag-link` / `.row.agent.conn > .ag-conn` margins
  - Magpie `plugins/sessions/client.js` **633–635** Relocate project; **900+** `askRelocate` sm-ask modal
- **WHAT changed:** `AgentsView.tsx` drop invent `.val.acts` → Magpie `ag-link` + `LibSwitch` `ag-conn` (fold Not-set-up too); Claude Relocate → Magpie Sessions `text` "Relocate project" inside `ag-exp`; row `unplugged` when connectable && !wired; `shell-patch.css` drop invent `.val.acts`; zh `Relocate project`.
- **chrome-guard:** pass (SIDE_AT=1024). Push/PR #1. No portable/Vercel.

## v0.1.158 · LIBRARY_MK_ICON_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.157 — restore Discover `mk-card` Magpie `mk-icon` that 0.1.150 DOM still omitted on the grid.
- **CAUSE:** Demo MCP/Skills Discover cards painted `mk-top` → `mk-who` only, covering Magpie `serverCard` / `skillCard` gold where `top.append(logo(x.icon, …), who)` puts `span.mk-icon` (img via `/api/library/icon`, or mono initial) beside the title (library/client.js **L4709–4728**, **L4775**, **L4873**; library.css **L402–413**).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefPick/WordsField/Segs/TextBtn/LibSwitch; Magpie mk-sheet (0.1.157); demo oauth Approve wall (nest=browser by design); Agents `#view-agents .val.acts` Connect/Relocate bridge — later tip.
- **Cite:**
  - Magpie `plugins/library/client.js` **4709–4728** `logo(url, name)` → `span.mk-icon` / `.mono` + `span.mk-mono` initial
  - Magpie `plugins/library/client.js` **4762–4783** `serverCard`: `top.append(logo(x.icon, title||name), who)`
  - Magpie `plugins/library/client.js` **4861–4888** `skillCard`: `top.append(logo(x.icon, x.source), who)`
  - Magpie `plugins/library/library.css` **402–413** `.mk-top` / `.mk-icon` / `.mk-mono`
- **WHAT changed:** `LibraryView.tsx` `MkLogo` + Discover MCP/Skills `mk-card` grids restore Magpie `mk-icon` (demo mono fallback; skill initial from `by` = Magpie `source`).
- **chrome-guard:** pass (SIDE_AT=1024). Push/PR #1. No portable/Vercel.

## v0.1.157 · LIBRARY_MK_SHEET_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.156 — cut invent image/skill sheet `.ehead.detail` / `.mark` / `.who` / `.blurb` / `.bar .note` that painted a fake editor-head over Magpie market sheet gold.
- **CAUSE:** Demo Magpie Image + skills.sh detail sheets used invent `ehead detail` + `blurb`/`blurb muted` (+ shell-patch geometry) instead of Magpie `serverSheet` / `skillSheet` → `editor.lib-editor.mk-sheet` + `mk-sheethead` (`mk-icon` / `mk-who` / `mk-name.big` / `mk-meta` / `mk-ext`) + `mk-about` + `mk-hint` + bar `mk-id` (library/client.js **L4795–4849** / **L4899–4939**; library.css **L441–451**).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefPick/WordsField/Segs/TextBtn/LibSwitch; Magpie field()/lib-pairs (0.1.154) + MCP `.bar` (0.1.155) + OS file input (0.1.156).
- **Cite:**
  - Magpie `plugins/library/client.js` **4795–4849** `serverSheet`: `mk-sheethead` + logo + `mk-about` + opt-in `mk-hint` + `field(Agents)` + bar `mk-id` / Cancel / Add
  - Magpie `plugins/library/client.js` **4899–4939** `skillSheet`: same head + `mk-about` + `mk-hint` From+github `mk-ext` + skills.sh `mk-ext`
  - Magpie `plugins/library/client.js` **4853–4858** `extLink` → `a.mk-ext` + GLYPH.out; **4709–4728** `logo` → `mk-icon` / mono fallback
  - Magpie `plugins/library/library.css` **441–451** `.mk-sheet` / `.mk-sheethead` / `.mk-about` / `.mk-hint` / `.mk-ext` / `.mk-id`
- **WHAT changed:** `LibraryView.tsx` image/skill sheets → Magpie `mk-sheet` DOM; `shell-patch.css` drop invent `.ehead.detail` / `.blurb` / `.bar .note`.
- **chrome-guard:** pass (SIDE_AT=1024). Push/PR #1. No portable/Vercel.

## v0.1.156 · GTK_SELECT_FILES_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.155 — cut invent `.dialog.gtk-select-files` / `.places` / `.pane` that painted an in-app GTK Select Files sheet over Magpie OS file input gold.
- **CAUSE:** Demo Providers Claude/Antigravity "Choose files…" and Settings Sync Import "Choose…" opened invent modal `dialog.gtk-select-files` (Recent/Home/Desktop sidebar + empty pane + demo sample link) + shell-patch geometry, covering Magpie which never ships an in-app GTK chooser — import signing uses hidden `<input type=file multiple>` (app.js **L12425–12445**); sync `importForm` uses hidden `<input accept=.magpie-backup>` (app.js **L21668–21674**). Same class of invent as Library Thunar dropped in 0.1.149.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefPick/WordsField/Segs/TextBtn/LibSwitch; Magpie field()/lib-pairs (0.1.154) + MCP `.bar` (0.1.155); image/skill `.ehead.detail` / `.blurb` bridges — later tips.
- **Cite:**
  - Magpie `app.js` **12425–12445** signing import: `input.type=file` multiple accept `.json,.txt,…`; `Choose files…` → `file.click()`; `fname` + 4MiB skip
  - Magpie `app.js` **21668–21674** `importForm`: `input.accept=.magpie-backup`; `Choose…` → `file.click()`; `fname` / `pair`
  - Magpie `app.js` **7908** related choose → `file.click()` pattern
  - GAP-MATRIX NOTES 24 already: Magpie itself uses OS `<input type=file>`
- **WHAT changed:** `ProvidersView.tsx` invent GTK modal → Magpie hidden file input in `.acts`; `NestedBlocks.tsx` Sync import invent chooser → Magpie hidden `.magpie-backup` input in `.pair`; `shell-patch.css` drop invent `.gtk-select-files*`.
- **chrome-guard:** pass (SIDE_AT=1024). Push/PR #1. No portable/Vercel.

## v0.1.155 · LIBRARY_MCP_REMOVE_BAR_OSS_FIDELITY · 2026-10-16 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.154 — cut Library MCP invent `.acts` that held Remove / Copy config above the footer instead of Magpie `.bar`.
- **CAUSE:** Demo painted MCP editor Remove + Copy config as invent `.acts` (shell-patch grid-column + margin) before `.bar`, covering Magpie `editServer` gold where `bar.append(Remove…)` + `copyConfigButton` + grow + Cancel + Save/Add live in one `.bar` (library/client.js **L2046–2091**; app.css **L2847–2848** `.editor .bar` / `.bar .danger` margin-left:-7px).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefPick/WordsField/Segs/TextBtn/LibSwitch; Magpie field()/lib-pairs (0.1.154); invent gtk-select-files + image/skill `.ehead.detail`/`.blurb` bridges — later tips.
- **Cite:**
  - Magpie `plugins/library/client.js` **2046–2091** `editServer` bar: Remove from the library (`danger`) + `copyConfigButton` + grow + Cancel + Save/Add
  - Magpie `plugins/library/client.js` **79–82** `button(text, cls)` → `text `+cls; **3183–3205** `copyConfigButton` → `text lib-updall lib-copyconfig` + openProtoMenu
  - Magpie `plugins/library/client.js` **2353–2370** `editHook` same Remove-in-`.bar` pattern
  - Magpie `app.css` **2847–2848** `.editor .bar` / `.bar .danger`
- **WHAT changed:** `LibraryView.tsx` MCP Remove + Copy config → Magpie `.bar` (drop invent `.acts`); `shell-patch.css` drop invent `.modal .editor.lib-editor .acts`.
- **chrome-guard:** pass (SIDE_AT=1024). Push/PR #1. No portable/Vercel.

## v0.1.154 · LIBRARY_FIELD_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.153 — cut Library invent `field-block` / `label.field` / invent `.stack` / invent `.pair`+`.hrow` that covered Magpie `field()` gold in MCP / hook / image / skill editors.
- **CAUSE:** Demo painted editor rows as invent column `label.field` + `.k` / invent `field-block` (+ shell-patch re-own) instead of Magpie `field(label, control, hint)` → bare `<label>` + wrap `<div>` as `.editor` 2-col grid children (app.js **L7219–7238**); env/headers used invent `.pair`/`.hrow` instead of Magpie `pairs()` → `.lib-pairs` / `.lib-pair` / `.lib-addpair` / `.lib-x` (library/client.js **L1900–1919**; library.css **L336–343**); agents used invent `field-block.agents` instead of Magpie `field(Agents)` + `.lib-agents`; transport/matcher slots lacked Magpie `lib-slot`/`lib-grid` (`display:contents`).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefPick/WordsField/Segs/TextBtn/LibSwitch; Magpie proto-menu hook picks (0.1.152); invent `.acts` MCP Remove (Magpie `.bar`) + invent gtk-select-files + image/skill `.ehead.detail`/`.blurb` bridges — later tips.
- **Cite:**
  - Magpie `app.js` **7219–7238** `field()` → `[label, wrap]` (+ `.hint`)
  - Magpie `app.css` **2693–2708** `.editor` grid 72px|1fr + `.editor label` / `.editor .hint`
  - Magpie `plugins/library/client.js` **1900–1919** `pairs`; **1998–2038** `editServer` (+ lib-slot/lib-grid); **2270–2348** `editHook` (+ lib-hookdescin / lib-hooktimeout / lib-hookmatcher)
  - Magpie `plugins/library/library.css` **332–343** lib-slot/lib-grid/lib-pairs; **610/618** hook timeout/desc
- **WHAT changed:** `LibraryView.tsx` LibField/LibPairs + Magpie field DOM for MCP/hook/image/skill editors; `shell-patch.css` drop invent `label.field` / `field-block` / `.pair` / `.hrow` / `.agents`.
- **chrome-guard:** pass (SIDE_AT=1024). Push/PR #1. No portable/Vercel.

## v0.1.153 · PROVIDERS_MOVE_ROW_MENU_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.152 — cut Providers invent `.pop.move` / `.scrim` / `.text.item` / `.lab`/`.kbd` / `--pop-x`/`--pop-y` that covered Magpie `openProviderMenu` → `openRowMenu` gold.
- **CAUSE:** Demo painted provider arrange as invent fixed pop at click coords under a full-screen scrim instead of Magpie `openRowMenu(anchor, acts)` → `.pop.row-menu` + `.rm-item` / `.rm-name` / `.rm-key` + MOVE_* icons, placed under `.pv-handle` (app.js **L3497–3538**, **L5713–5726**; app.css **L694–700**). Items never disabled at list ends; arrange ignored Magpie on/shown split.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefRow/Segs/TextBtn/LibSwitch; Magpie Agents/Routing/Usage `.pop.row-menu` already; Library invent `field-block` (not Magpie — later tip when editor DOM is gold).
- **Cite:**
  - Magpie `app.js` **5713–5726** `openProviderMenu` → `openRowMenu` with Move to top/up/down/bottom + ALT/SHIFT keys + `off` at ends
  - Magpie `app.js` **3497–3538** `openRowMenu` (`.pop.row-menu` / `.rm-item` / `.rm-name` / `.rm-key` / icons; `placeMenu` under handle)
  - Magpie `app.js` **5635** row `oncontextmenu` → handle anchor; **5701–5708** `onProviderIds` / `shownProviderIds` / `stepProvider`; **5794–5811** `arrangeProvider`
  - Magpie `app.css` **694–700** `.pop.row-menu` / `.rm-*`; **1922+** `.pop` fixed + animation
- **WHAT changed:** `ProvidersView.tsx` invent menu → `ProviderMoveMenu` Magpie row-menu DOM; row+handle contextmenu toggle on handle anchor; arrange/step Magpie on/shown; `shell-patch.css` drop invent `.scrim` / `.pop.move*`.
- **chrome-guard:** pass (SIDE_AT=1024). Push/PR #1. No portable/Vercel.

## v0.1.152 · LIBRARY_HOOK_PROTO_MENU_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.151 — cut Hook editor invent `.pop.menu` / `.gl` / `.text.item` that covered Magpie `openProtoMenu` gold for When-it-runs / For-which-tools.
- **CAUSE:** Demo painted hook event/tool picks as invent `role=menu` `.pop.menu.down` + `.gl` header + `.text.item` / `.v`/`.n` (+ shell-patch re-own) instead of Magpie `openProtoMenu` → `.pop.proto-menu` + `.pm-head` / `.pm-item` / `.pm-tick` / `.pm-words` / `.pm-name` / `.pm-note` + search `.sc-top`/`.sc-q` (library/client.js **L2305–2311** event with `always` shared + "Find an event"; **L2345** tools; app.js **L13799–13849**). PrefPick lacked Magpie `lib-menu lib-hookevent` / `lib-hooktool`; editor lacked `lib-hookedit`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefPick/WordsField/Segs/TextBtn; Magpie `library.css`/`plugins.css`; Copy-config `pref-anchor`+proto-menu; invent `.pop.move` (Providers) and remaining non-hook `field-block` elsewhere — later tips.
- **Cite:**
  - Magpie `plugins/library/client.js` **2291–2313** event `sess-pick.lib-menu.lib-hookevent` + `openProtoMenu(..., "When it runs", "", "left", false, "Find an event")`; **2337–2347** tools `lib-hooktool` + `openProtoMenu(..., "For which tools")`; **2270** `editor.lib-editor.lib-hookedit`
  - Magpie `app.js` **13799–13849** `openProtoMenu` (`.pm-head` / `.pm-item` / `.pm-tick` / `.sc-top`/`.sc-q` / `always` filter)
  - Magpie `app.css` **2499–2506** `.pop.proto-menu` / `.pm-*`; **1378–1380** `.sc-top`/`.sc-q` (under `.sess-menu` in OSS; hook cls="")
  - Magpie `library.css` **609** `.lib-hookedit .lib-menu`
- **WHAT changed:** `LibraryView.tsx` event/tool menus → Magpie proto-menu DOM + `lib-hookedit` / `lib-menu lib-hookevent|lib-hooktool` + outside/Escape close; `shell-patch.css` drop invent `.pop.menu`/`.gl`/`.text.item`, add `.pref-anchor.lib-hookpick` left nest.
- **chrome-guard:** pass (SIDE_AT=1024). Push/PR #1. No portable/Vercel.

## v0.1.151 · LIBRARY_PROJECT_HOOK_OAUTH_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.150 — cut remaining Library invent bridges for projects / hooks / oauth modal / intro / Copy-config / lib-mini / grow-min / lib-find.words that re-owned Magpie `library.css` + client.js DOM.
- **CAUSE:** Demo painted projects as invent `card.lib-project` + `lib-project-head` / shell-patch border-card chrome instead of Magpie `list.lib-card.lib-project` + `row.lib-row.click.lib-projhead` (client.js **L3535–3565**); hooks as bare `.row` instead of `row.lib-row.click.lib-hook` (**L2247–2262**); oauth wall invent `.lib-oauth-*` instead of Magpie `modal`/`dialog`/`editor`/`bar` (app.css **L3250+** / **L2847**; nest oauth = browser); invent `#view-library .lib-intro b/p` / `.lib-addmenu` / `.lib-mini` / `.grow-min` / `.lib-find .words` against Magpie `intro()` **L810**, `copyConfigButton`→`openProtoMenu` **L3183–3205**, library.css **L42–43** / **L288–291**.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefRow/Segs/TextBtn; Magpie `library.css`/`plugins.css` import; Magpie `pref-anchor`+`.pop.proto-menu` for Copy config (React nest of openProtoMenu); demo oauth wall still refuses Approve (nest); editor event/tool invent `.pop.menu` still used by hook When-it-runs (later tip).
- **Cite:**
  - Magpie `plugins/library/client.js` **3535–3605** `projectCard`; **3643–3665** `projectServers`; **2247–2262** `hookRow`; **803–808** `empty`; **810** `intro`; **3183–3205** `copyConfigButton` / openProtoMenu
  - Magpie `plugins/library/library.css` **42–48** `.lib-mini` / `.lib-intro` / `.lib-aside`; **288–291** `.lib-find`; **310–312** `.lib-empty`; **468–517** `.lib-project` / `.lib-proj*`; **616–618** `.lib-hook*`
  - Magpie `app.css` **3250+** `.modal`/`.dialog`; **2847** `.editor .bar`; **2500+** `.proto-menu .pm-*`
- **WHAT changed:** `LibraryView.tsx` Magpie project/hook/oauth/intro/copy-config/lib-mini DOM + restore GLYPH + `DEMO_MCP`/`DEMO_SKILLS_MARKET`/`DEMO_PROBE_SKILLS` consts lost in 0.1.149/150; `shell-patch.css` drop invent `#view-library` lib-intro/addmenu/mini/grow-min/find.words/lib-project/lib-hook/oauth rules.
- **chrome-guard:** pass (SIDE_AT=1024). Push/PR #1. No portable/Vercel.

## v0.1.150 · LIBRARY_TIP_BRIDGES_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.149 — cut remaining Library tip invent bridges (`lib-setrow` / `lib-chev` / `lib-mcp.*` / `lib-savebar` pill / `lib-tag.agents` / invent `mk-card` / `pm-mirror-tip`) that re-owned Magpie `library.css` + client.js DOM.
- **CAUSE:** Demo Instructions used invent `lib-setrow`+`lib-chev`+`lib-tag.agents` instead of Magpie `row lib-row click lib-set` + `who`/`lib-tags` + `span.chev` (client.js **L1172–1198**); MCP used invent `card.lib-mcp` instead of `row lib-row click lib-server` (**L1463–1480**); Discover used invent card/`mk-card` who/tag/by instead of Magpie `mk-card click` + `mk-top`/`mk-who`/`mk-desc`/`mk-foot` (**L4762–4783**, **L4861–4888**); savebar tip pill999 fought library.css **L72–79**; Plugins invent `.pm-mirror-tip` fade-in instead of Magpie native `title` (plugins.js **L695**).
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefRow/Segs/TextBtn; Magpie `library.css`/`plugins.css` import; true web-demo bridges: `.lib-intro` title, `.lib-addmenu` Copy-config pop, `.lib-mini` head glyphs, `.grow-min`/`.lib-find .words`, demo `.lib-project`/`.lib-hook`/oauth modal chrome (later tip).
- **Cite:**
  - Magpie `plugins/library/client.js` **1172–1252** `setRow`; **1463–1480** `serverRow`; **3134+** `pickBar`; **4762–4783** `serverCard`; **4861–4888** `skillCard`
  - Magpie `plugins/library/library.css` **72–79** `.lib-savebar`; **96–97** `.lib-row .chev`; **117–118** `.lib-tag`; **148–169** sets; **347** `.text.danger-fill`; **393–432** `.mk-grid`/`.mk-card`; **473–476** `.lib-srvwho`; **586** `.lib-pickbar`
  - Magpie `plugins.js` **695** `b.title` (no invent tip)
- **WHAT changed:** `LibraryView.tsx` Magpie set/MCP/mk-card/pickbar/savebar DOM; `SimpleViews.tsx` drop invent mirror tip; `shell-patch.css` drop ~80 invent `#view-library` / `pm-mirror-tip` rules.
- **chrome-guard:** pass (SIDE_AT=1024). Push/PR #1. No portable/Vercel.

## v0.1.149 · LIBRARY_THUNAR_GTK_CHOOSE_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.148 — delete tip invent Library in-app Thunar + GTK “Choose a project” + view-scoped lib-card/tag/acts/text re-owns that covered Magpie OSS.
- **CAUSE:** Demo painted Library folder/Backups as invent `LibThunar` (`.lib-thunar*` / `.modal.lib-thunar-scrim`) and Add-project Choose… as invent `LibChooseProject` (`.dialog.gtk-choose-project` / `.modal.lib-choose-scrim`) instead of Magpie `reveal()` (`library/reveal`, client.js **L88–94**, **L750–757**) and web path-only `addProjectCard` (`if (!web)` Choose…, client.js **L3500–3508**). shell-patch also re-owned Magpie `.lib-card` / `.lib-tag` / `.lib-acts` / `.lib-text` against library.css **L58** / **L117–118** / **L169** / **L62–69**.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; CIS PrefRow/Segs/TextBtn; Magpie `library.css` import; demo leftover `#view-library` bridges (lib-setrow / lib-chev / lib-mcp.* / lib-savebar pill / lib-tag.agents) — Magpie uses different Instructions/MCP DOM in places; no invent parallel mp-* file-manager CSS.
- **Magpie gold cited:**
  - `plugins/library/client.js` **88–94** `reveal(p)` → `api("library/reveal")`; **750–757** Library folder / Backups buttons
  - `plugins/library/client.js` **3486–3532** `addProjectCard` — web: path input only; app: Choose… → `library/projects/choose`
  - `plugins/library/library.css` **58** `.lib-card`; **117–118** `.lib-tag`; **169** `.lib-acts`; **287–291** `.lib-install` / `.lib-find`
- **WHAT changed:** `LibraryView.tsx` drop LibThunar/LibChooseProject; reveal → status toast path (web has no reveal API); Add-project drop Choose…; MCP install card → Magpie `lib-install`/`lib-find`; `shell-patch.css` drop ~522 lines thunar/gtk invent + invent view lib-card/tag/acts/text.
- **chrome-guard:** pass (SIDE_AT=1024).
- **No portable / Vercel.**

## v0.1.148 · PLUGINS_GHKINDS_LIBRARY_RTK_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.147 — delete tip invent Plugins GitHub kinds / detail chrome + Library RTK/skillHow that covered Magpie OSS.
- **CAUSE:** Demo painted GitHub kinds as invent `#view-plugins .pm-ghkinds` seg-track buttons instead of Magpie `segs().classList.add("pm-ghkinds")`; shell-patch re-owned Magpie `.pm-ghnone`/`.pm-who`/`.pm-sum`/`.pm-meta` and invent `.modal .pm-detail.dialog` / `.pm-plugin` against Magpie `.modal .editor.pm-detail.framed`; Library RTK used invent `card.lib-rtk-card` + tip gain/cmd margins + img logo instead of Magpie `list.lib-card` + `.mask`; skillHow invent `.opt .spin` fought Magpie `saving()` SVG.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Agents fields/unplugged (0.1.147); CIS PrefRow/Segs/TextBtn; Magpie `plugins.css` / `library.css` import; demo pm-mirror-tip / lib-thunar bridges (later tip).
- **Cite:**
  - Magpie `plugins.js` **609** `pick.classList.add("pm-ghkinds")` on Magpie `segs`
  - Magpie `plugins.css` **48–76** `.pm-ghbar` / `.segs` / `.pm-ghfind` / `.pm-ghnone` / `.pm-who` / `.pm-name` / `.pm-by` / `.pm-verified` / `.pm-sum` / `.pm-meta`; **144** `.pm-note.warn`; **191–207** `.modal .editor.pm-detail.framed` + `.pm-d*`
  - Magpie `plugins/library/client.js` **839–843** `list.lib-card` + `lib-glyph.lib-rtk-logo` + `maskSpan`
  - Magpie `plugins/library/library.css` **51–53** / **452** `.lib-rtk-gain` / **465** `.lib-rtk-cmd`
  - Magpie `app.js` **14058–14062** `saving()`; **2094** `CLI_SPIN`; `app.css` **2852–2855** `.saving`
- **WHAT changed:** `SimpleViews.tsx` ghkinds→Segs + pm-name; `LibraryView.tsx` RTK mask + skillHow SVG; `shell-patch.css` drop invents above.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

---
## v0.1.147 · AGENTS_FIELDS_UNPLUGGED_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.146 — delete tip invent Agents New-sessions fields chrome + unplugged status that covered Magpie OSS connectLine.
- **CAUSE:** Demo painted New sessions as invent `div.fields.inline` (+ shell-patch flex/min-width re-owns) instead of Magpie `line(fields)` → `.ag-vl > .fields`; unplugged rows used invent `sub faint` demo copy instead of Magpie `ag-st`/`ag-dot`/`ag-st-t`; shell-patch re-owned `.ag-cant` with invent cursor/user-select Magpie does not have.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Routing/Settings invent drops (0.1.146); CIS PrefRow/Segs/TextBtn/FieldPill; Magpie `app.css` agents import; remaining `.val.acts` Connect/Relocate demo bridge (later tip).
- **Cite:**
  - Magpie `app.js` **1903** `kv(… "New sessions", line(fields))` → `.ag-vl > .fields`
  - Magpie `app.css` **3814–3820** `.ag-vl > .fields` + `#agents .ag-exp .ag-vl > .fields` flex wrap / `.field` min-width **170**; **3840** `.ag-vl .field.ag-pick` width **220**
  - Magpie `app.js` **1234–1272** `connectLine` unplugged → `.ag-st` + `.ag-dot` + `.ag-st-t` ("Not connected · {agent} uses its own settings")
  - Magpie `app.css` **3800** `.ag-cant` flex/font/color only (no cursor/user-select)
- **WHAT changed:** `AgentsView.tsx` fields + unplugged ag-st; `shell-patch.css` drop invents above.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

---
## v0.1.146 · ROUTING_REQ_MIN1150_SETTINGS_DEAD_INVENT_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.145 — delete tip invent Routing selected-req / min1150-on-cols + dead Settings invent chrome that covered Magpie OSS.
- **CAUSE:** Demo painted picked request as invent `.rt-req.on` (pill/fg-2) instead of Magpie `[aria-pressed=true]` (card-2/line); put invent `min1150` on `.rt-cols` and re-owned purpose/metric open chevrons against Magpie `.rt-more.min1150` + routing.css; shell-patch still held dead invent Settings selectors (`.sync-row` / `.mirror-row` / `.tray-usage-wrap` / `.models-empty` / `.search-apis*` / `.about-ver` / empty `#view-settings .font-preview` / invent `.font-menu .opt .preview`) after TrayUsage/Search/About/Sync already used Magpie DOM.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Library OAuth/signing (0.1.145); CIS PrefRow/Segs/TextBtn; Magpie `routing.css` import.
- **Cite:**
  - Magpie `routing.css` **251** `.rt-req[aria-pressed="true"]`; **237–239** `:where(.rt-more.min1150) .rt-cols*`; **324–335** purpose/metric open + purpose-menu pm-head/pm-note
  - Magpie `routing.js` **260** `byWidth(more, { min1150 })`; **2340** `hist.classList.toggle("solo", none)`
  - Magpie `app.js` **20952** `update-mirror-row`; **21812+** TrayUsage `#trayUsagePick`; **21118–21130** About Version PrefRow
  - Magpie `app.css` **3117** `.search-api`; **3063–3065** `.font-preview`; **3456+** `.editor.sync-form`
- **WHAT changed:** `RoutingView.tsx` drop invent req `.on` + cols `min1150`; `shell-patch.css` drop invents above.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

---
## v0.1.145 · LIBRARY_OAUTH_LIBAPP_SIGNING_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.144 — delete tip invent Library OAuth layout + Providers signing chrome that covered Magpie OSS.
- **CAUSE:** Demo wrapped OAuth Client ID/secret/port in invent `oauth-pair` + text × and Sign-in wait in invent `sign-row`; shell-patch re-owned Magpie `.signing .mark` (amber 22px) and `.signing > .text` / invent `.s.note`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Plugins ask (0.1.144); CIS PrefRow/Segs/TextBtn; Magpie `library.css` import.
- **Cite:**
  - Magpie `plugins/library/client.js` **1971–2031** `drawApp` → `lib-app` / `lib-addpair` / `lib-x` + `field2`
  - Magpie `plugins/library/client.js` **1714–1733** `signInBox` → `.lib-signin` / `.lib-signin-line` / `.note`
  - Magpie `plugins/library/library.css` **131–135** / **341–343**
  - Magpie `app.css` **2563–2564** `.signing .s` / `.signing > .text`; **2603** `.signing .mark`
- **WHAT changed:** `LibraryView.tsx` OAuth/Sign-in DOM; `ProvidersView.tsx` Codex note `s`; `shell-patch.css` drop invents above.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

---
## v0.1.144 · PLUGINS_ASK_INLINE_OPTS_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.143 — delete tip invent Plugins ask card + shell-patch pm-opts/pm-chip/pv-add invents that covered Magpie OSS.
- **CAUSE:** Demo painted remove/off/move confirm as invent bordered `pm-ask` card under the row instead of Magpie asked-in-row `.sub.ask` + `.val` buttons only (plugins.js early return); shell-patch re-owned Magpie `pm-opts`/`pm-act`/`pm-chip` (pill999, wrong .sub.ask colors) and left dead `.pv-add-steps`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Agents/WhatsNew (0.1.143); CIS PrefRow/Segs/TextBtn; Magpie `plugins.css` import after shell-patch.
- **Cite:**
  - Magpie `plugins.js` **1025–1108** ask → `.sub.ask` text + `val` Not now/Cancel + primary Move/Remove/Switch off
  - Magpie `plugins.js` **1057–1059** mwLine before optionsEditor; **1145–1189** optionsEditor; **1223–1241** mwLine
  - Magpie `plugins.css` **88** `.pm-row .sub.ask`; **79–87** `.pm-chip`; **114–132** `.pm-act*`; **173–182** `.pm-opts*`; **135–140** ghost
- **WHAT changed:** `SimpleViews.tsx` Plugins ask/mw/opts; `shell-patch.css` drop invents above.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.143 · AGENTS_NATIVE_WHATSNEW_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.142 — delete tip invent Agents Cursor native-only chrome + Settings What's new badge/body that covered Magpie OSS.
- **CAUSE:** Demo painted Cursor "Only Cursor's own models" as invent `ag-native-note` with square `.sq` chips instead of Magpie `connectLine("no")` `.ag-st`/`.ag-dot`/`.ag-st-t`; What's new used invent `whatsnew-body` padding + invent uppercase `wn-badge` / muted `wn-ref` instead of Magpie `span.badge` "Not installed yet" + `a.wn-link`. Dead shell-patch still owned invent `.ag-tick` / `.ag-json-preview` / `.mt6`/`.mt2` / `.ag-exp.enter`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Routing empty/gsel (0.1.142); CIS PrefRow/Segs/TextBtn; Magpie `.ag-st.on`/`.wait` paths for wired agents.
- **Cite:**
  - Magpie `app.js` **1107** `NATIVE_ONLY.cursor`; **1234–1240** `connectLine` kind `"no"` → `.ag-st` + `.ag-dot` + `.ag-st-t`
  - Magpie `app.css` **3762–3765** `.ag-st` / `.ag-dot`
  - Magpie `app.js` **4144–4152** `showWhatsNew` / pending `span.badge` `Not installed yet`; **4240–4246** `noteLink` → `a.wn-link`; ISSUES L4076
  - Magpie `app.css` **3279** `.modal .editor.whatsnew > .ebody`; **3268+** `.editor.framed`
- **WHAT changed:** `AgentsView.tsx` native line → Magpie ag-st; `NestedBlocks.tsx` WhatsNew → Magpie badge/wn-link/ebody; `shell-patch.css` + `app.css` drop invents above.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.142 · ROUTING_EMPTY_GSEL_LANPOP_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.141 — delete tip invent Routing empty/filters/gsel chrome + dead LAN lan-pop that covered Magpie OSS.
- **CAUSE:** Demo painted live-stage fly copy as invent `p.rt-req-head.note` under `.rt-top` (Magpie top is what+mode only); gsel Remove used invent `rt-pick-clear` muted/red instead of Magpie `text danger rt-gremove`; shell-patch re-owned `.empty-state` / `.rt-filters` (+ invent margin-bottom) / `.rt-days` / `.rt-cols` margin-top / dead `.rt-add-stack` against Magpie routing.css; leftover `.lan-pop*` after 0.1.137 proto-menu.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Gateway/StatusToast (0.1.141); CIS PrefRow/Segs/TextBtn; demo rt-fade / rt-col-live bridges.
- **Cite:**
  - Magpie `routing.js` **26–29** `rt-top` = what + mode; **115** `row-head rt-req-head` + child `span.note`
  - Magpie `routing.js` **2338–2346** `rt-reqs.none` + `empty-state`; **3773–3814** `selectBar` → checkbox + `note` + `text danger rt-gremove` + Done
  - Magpie `routing.css` **314–315** `.rt-filters` / `.rt-days`; **340** `.rt-req-head .note`; **352–353** `.rt-reqs.none .empty-state`; **483** `.rt-gsel`
  - Magpie `app.css` **521–522** `.empty-state`; **1842** `.text.danger:hover`
  - Magpie `app.js` **23639–23640** LAN `openProtoMenu` / `lan-address-menu`
- **WHAT changed:** `RoutingView.tsx` drop invent fly note; gsel → Magpie selectBar; `shell-patch.css` drop invents above.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

## v0.1.140 · PROJECT_REMOVE_LIBKEEP_AGENTS_SMASK_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

## v0.1.141 GATEWAY_DOT_ERR_STATUSTOAST_OSS_FIDELITY

- **WHY:** Continue Magpie 1:1 after 0.1.140 — delete tip invent Gateway fix-error / older-dot chrome + StatusToast timing/lift that covered Magpie OSS.
- **CAUSE:** Demo painted Gateway take-over/start errors as invent `sub err` (+ invent `role=alert`) instead of Magpie `sub old err`; older mode never set Magpie `dot old`. Foot toast defaulted invent kind=`ok` / always 3500ms and lifted on any `.modal:not(.out)` instead of Magpie `status()` kind default `""` / err 8000ms / `#modal` lift.
- **WHAT kept:** SIDE_AT=1024; Web 752×652; StatusToast CIS DOM (`#status.status`); Gateway TextBtn `gw-fix` CIS; no portable/Vercel.
- **Cite:**
  - Magpie `plugins/gateway/client.js` **141** `dot` + older/`on`; **159** `sub old err`
  - Magpie `app.css` **2095–2096** `.gw .sub.old` / `.gw .sub.err`
  - Magpie `app.js` **324–335** `status(msg, kind="", ms=err?8000:3500)` + `#modal` lift
- **WHAT changed:** `GatewayView.tsx` dot/err → Magpie; `App.tsx` showStatus + lift; `StatusToast.tsx` drop invent aria-atomic.
- **chrome-guard:** pass. Push/PR #1.


- **WHY:** Continue Magpie 1:1 after 0.1.139 — delete tip invent Library project-remove ActionConfirm.extra / Tick.keep and Agents inline ag-relocate that covered Magpie OSS.
- **CAUSE:** Demo painted Keep-skills as invent `ActionConfirm` + `extra`/`Tick.keep` (+ invent Discard on cancel) instead of Magpie `confirmRemoveProject` openLib sheet; Agents relocate painted invent inline `ag-relocate`/`ag-settings`/`ag-quiet` instead of Magpie `askRelocate` `editor.sm-ask` modal.
- **Magpie cites:**
  - Magpie `plugins/library/client.js` **3668–3703** `confirmRemoveProject` → `editor.lib-editor` + `p.lib-confirm` + `label.lib-pick.lib-keep` + bar Cancel/Remove
  - Magpie `plugins/library/library.css` **345** `.lib-editor .lib-keep`; **299–305** `.lib-pick`
  - Magpie `plugins/sessions/client.js` **901–959** `askRelocate` → `editor.sm-ask` + `openModal` + `$("#modal").classList.add("lib")`; bar `text` / `text primary`
  - Magpie `plugins/sessions/sessions.css` **55–58** `.sm-ask-field` / `.sm-ask-path`
- **WHAT kept:** SIDE_AT=1024; nest 752×652; LibModal editor path (0.1.139); other ActionConfirm uses (Discard / skill remove still tip for later); CIS PrefRow/Segs/TextBtn.
- **WHAT changed:** `LibraryView.tsx` project remove → LibModal lib-keep; `AgentsView.tsx` relocate → sm-ask modal; `sessions.css` import; `ActionConfirm` drop invent `extra`; `shell-patch.css` drop invents above.
- **Guard:** `npm run chrome-guard`. No portable. Push/PR #1. No Vercel.

## v0.1.139 · LIB_MODAL_EDITOR_AG_CONFIRM_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.138 — delete tip invent Library sheet chrome (`.dialog.lib-editor` / unused `.sm` / invent ehead-bar padding) + invent `.lib-confirm` / pill `button.lib-ag` that covered Magpie OSS.
- **CAUSE:** Demo painted Library modals as invent `.modal` > `.dialog.lib-editor` (lib-editor on dialog) instead of Magpie openLib `.modal.lib` > `.dialog` > `.editor.lib-editor`; shell-patch re-owned `.lib-confirm` at line-height 1.5 and invent pill chips against Magpie library.css.
- **Magpie cites:**
  - Magpie `plugins/library/client.js` **4944** `openLib` → `openModal` + `$("#modal").classList.add("lib")`
  - Magpie `app.js` **8062+** `openModal` → `.modal` > `.dialog` > content (`.editor.lib-editor`)
  - Magpie `app.css` **2693–2706** `.editor` / `.ehead`; **2847** `.editor .bar`; **3250–3275** `.modal` / `.dialog` / framed bars
  - Magpie `plugins/library/library.css` **330+** `.lib-editor`; **346** `.lib-confirm` (line-height **1.55**); **187–217** `.lib-ag` (radius 7, not invent 999 pill)
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Usage row-menu (0.1.138); CIS PrefRow/Segs/TextBtn; demo-only editor field bridges under `.modal .editor.lib-editor` (oauth-pair / field-block / pop.menu).
- **WHAT changed:** `LibraryView.tsx` LibModal → Magpie DOM; `shell-patch.css` drop invents above.
- **Guard:** `npm run chrome-guard`. No portable. Push/PR #1. No Vercel.

## v0.1.138 · USAGE_AGENT_ROW_MENU_HID_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.137 — delete tip invent Usage Agents ⋯ menu (`proto-menu`/`proto-item`) + shell-patch `.us-more-pop` / `.us-hidline` that covered Magpie OSS row-menu + us-hid.
- **CAUSE:** Demo painted Hide-from-list as invent inline `proto-menu open` + bare `proto-item` (no icon) instead of Magpie `openRowMenu` → `.pop.row-menu` / `.rm-item` + EYE_OFF; `#usageAgentsHid` missing `.us-hid`/`.list`; shell-patch re-owned hidline margin/font and invented absolute `.us-more-pop`.
- **Magpie cites:**
  - Magpie `app.js` **3497–3518** `openRowMenu` → `el("div", "pop row-menu")` + `rm-item` / `rm-name` / `rm-sep`
  - Magpie `app.js` **17375–17379** Usage Agents menu: Hide from this list + EYE_OFF via openRowMenu
  - Magpie `app.js` **3518** `placeMenu(box, anchor, "left", -4)`; **13784–13797** placeMenu
  - Magpie `app.css` **694–704** `.pop.row-menu` / `.rm-item`; **1065–1072** `.us-hid` / `.us-hidline`
  - Magpie `index.html` `div.us-hid#usageAgentsHid` + `button.us-hidline` + `div.list`
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Tray/LAN/Search proto menus (0.1.137); CIS PrefRow/Segs/TextBtn; other Usage chrome.
- **WHAT changed:** `SimpleViews.tsx` Usage Agents menu → Magpie row-menu; hid → `.us-hid`+`.list`; `shell-patch.css` drop invents above.
- **Guard:** `npm run chrome-guard`. No portable. Push/PR #1. No Vercel.

## v0.1.137 · TRAY_LAN_SEARCH_PROTO_MENU_OSS_FIDELITY · 2026-10-15 Asia/Shanghai
- **WHY:** Continue Magpie 1:1 after 0.1.136 — delete tip invent PrefPick/other menus (TrayUsage / LAN Address / Search APIs) that painted bare button lists instead of Magpie `openProtoMenu`.
- **CAUSE:** TrayUsage invent `sess-pick` + bare `.sess-menu` buttons (no pm-head/pm-item); LAN invent `<ul><li.sel>`; Search invent bare `button.on` — all fought Magpie openProtoMenu DOM.
- **Gold:**
  - Magpie `app.js` **21873** tray pill `proto pick` (+set); **21910** `openProtoMenu(..., "Shown beside the icon")`; **21946** TRAY_TOTALS; **13799–13828** pm-head/pm-item/pm-tick/pm-words
  - Magpie `app.js` **23639–23640** LAN `openProtoMenu(..., "Address", "lan-address-menu")`; `app.css` **3180–3181**
  - Magpie `app.js` **22732–22733** Search `openProtoMenu(..., "Search API")`
  - Magpie `app.css` **2494–2497** `.pop.proto-menu` / `.pm-head` / `.pm-item`
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Settings Language / Usage led (0.1.136); CIS PrefPick/PrefRow/Segs/TextBtn; FontRow portal menu.
- **WHAT changed:** `NestedBlocks.tsx` TrayUsagePick / LanAddressRow / SearchApisBlock menus → Magpie openProtoMenu DOM.

## v0.1.136 · SETTINGS_LANG_USAGE_LED_OSS_FIDELITY · 2026-10-15 Asia/Shanghai
- **WHY:** Continue Magpie 1:1 after 0.1.135 — delete tip invent Settings Language menu + set-q/pref-pick chrome + Usage ledger/sess invents that covered Magpie OSS.
- **CAUSE:** Demo painted Language as invent `<ul.sess-menu>` + shell-patch `.pref-pick`/`.sess-menu`/`.set-q` geometry against Magpie `openProtoMenu` + `.sess-pick`/`.sess-filter`; Usage invent `led-detail-inner` + sess grid/sess-go fought Magpie `.led-box`/`.led-dl` and flex `.row.sess`.
- **Gold:**
  - Magpie `app.js` **21217–21229** `renderLangPick` → `openProtoMenu(..., "sess-menu", "right")`; **13799–13808** `.pop.proto-menu` + `pm-head` / `pm-item`
  - Magpie `app.css` **2499–2506** `.pop.proto-menu` / `.pm-item`; **1375–1377** `.pop.proto-menu.sess-menu`; **1366** `.sess-filter`; **1369–1374** `.sess-pick`; **3027–3035** `.set-q` / `.set-searching`; **3080** `.pref-pick`
  - Magpie `app.css` **1326–1330** `.led tr.open` / `.led-detail` / `.led-box` / `.led-dl`; `app.js` **17729–17753** led detail DOM
  - Magpie `app.css` **1514–1527** `.sess-item` / `.row.sess` / `.sess-go`; **1019** `.stats`; **1395** `.stats.six`
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Gateway Connect / Agents guide (0.1.135); CIS PrefPick/PrefRow/Segs/TextBtn; React pref-anchor absolute `.pop` nest bridge.
- **WHAT changed:** `SettingsView.tsx` Language menu → Magpie proto-menu; `SimpleViews.tsx` led detail → led-box/led-dl; `shell-patch.css` drop invents above.
- SIDE_AT=1024. Push/PR #1. No portable / Vercel.

## v0.1.135 · GW_CONNECT_AGENTS_GUIDE_OSS_FIDELITY · 2026-10-15 Asia/Shanghai
- **WHY:** Continue Magpie 1:1 after 0.1.134 — delete tip invent Gateway Connect key/model chrome + Agents guide missing optional step; restore Magpie OSS.
- **CAUSE:** Demo always labeled Connect key `API key` and painted invent model-row `◎`; Models head lacked Magpie `#findModel`; Agents Get started omitted Magpie optional routing step 3.
- **Gold:**
  - Magpie `plugins/gateway/client.js` **431–442** keyLabel / empty create / lan key hints; **446–448** model hint; **467–478** snippet without secret; **500–509** `#findModel`; **525** none match; **534** `icon(provider)`
  - Magpie `app.css` **2659–2673** `#view-gateway .find` / `.row-head .find`
  - Magpie `app.js` **1591–1622** guide step 3 optional routing; **1611–1615** `guide-open` → Routing; **1597** acts iff source
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Gateway keys accts/acc (0.1.133); Providers search/add (0.1.134); CIS PrefRow/Segs/TextBtn.
- **WHAT changed:** `GatewayView.tsx` Connect key/model/snippet + Models find/icon; `AgentsView.tsx` + `App.tsx` guide step 3 / onGoRouting.
- SIDE_AT=1024. Push/PR #1. No portable / Vercel.

## v0.1.134 · PV_SEARCH_ADD_IMPORTAPPS_OSS_FIDELITY · 2026-10-15 Asia/Shanghai
- **WHY:** Continue Magpie 1:1 after 0.1.133 — delete tip invent Providers search/add chrome + shell-patch `.importapps` that covered Magpie OSS.
- **CAUSE:** Demo painted Providers find as invent `row-head.pv-tools` + `find.pv-find` and add as invent `rt-gadd.pv-gap` (Routing add chrome); ImportApps used invent `framed`/`ebody` + shell-patch `.importapps` geometry against Magpie `.editor.importapps`.
- **Gold:**
  - Magpie `index.html` **112–113** `.pv-head#pvHead` > `input.sess-filter.pv-q#pvQ`; `p.set-none.pv-none#pvNone`
  - Magpie `index.html` **118–120** `.after-list` > `button.text#addProvider` (`＋ Add provider`)
  - Magpie `app.css` **2113–2115** `.pv-head` / `.pv-q` / `.pv-none`; **1366–1367** `.sess-filter`; **3036** `.set-none`
  - Magpie `app.css` **2611 / 2616–2617** `.after-list` sticky bar
  - Magpie `app.js` **9489–9490** `renderImportApps` → `editor.new.importapps` (no framed/ebody)
  - Magpie `app.css` **3435–3464** `.editor.importapps` apptabs / applist / appempty
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Gateway keys accts/acc (0.1.133); React detect-grid `.dg-row` display:contents bridge; CIS PrefRow/Segs/TextBtn.
- **WHAT changed:** `ProvidersView.tsx` search/add → Magpie DOM; ImportApps drop framed/ebody; `shell-patch.css` drop invent `.importapps*` + invent pv-tools/pv-find/pv-none/pv-gap.
- SIDE_AT=1024. Push/PR #1. No portable / Vercel.

## v0.1.133 · GW_KEYS_TILE_SETTINGS_OSS_FIDELITY · 2026-10-15 Asia/Shanghai
- **WHY:** Continue Magpie 1:1 after 0.1.132 — delete tip invent Gateway keys PrefRow + Providers `.tile` / Settings pref gap / badge.off invents that covered Magpie OSS.
- **CAUSE:** Demo painted `#gatewayKeys` as invent `list prefs` + `row pref` instead of Magpie `accts`/`acc`; shell-patch re-owned `.tile` (gap 8 / width 100%) against Magpie app.css; invent Settings `.row.pref` gap 10/16 fought Magpie gap:14px; invent `.badge.off` redeclared Magpie badge tokens.
- **Gold:**
  - Magpie `plugins/gateway/keys.js` **171–192** `div.accts` → `div.acc` (+ tick / rename / plan.mono / grow / copy / Rotate / Remove); empty `.none`
  - Magpie `plugins/gateway/client.js` **661–666** `#gatewayKeys` bare section (no `list prefs`)
  - Magpie `app.css` **2318–2370** `.accts`/`.acc`; **2463–2464** `#gatewayKeys .acc`
  - Magpie `app.css` **2676–2682** `.tile` gap:10px / min-width:0 / transition; `.tile .ic` 18×18
  - Magpie `app.css` **3052** `.row.pref` gap:14px; **3026** set-head wrap; **2261/2266** `.badge` / `.badge.off`
- **WHAT kept:** SIDE_AT=1024; nest 752×652; set-head/ptabs wrap nest bridge; React `.tile img.ic-img` fill bridge; Settings name/val min-width framed-web bridges.
- **WHAT changed:** `GatewayView.tsx` keys → Magpie accts/acc; `shell-patch.css` drop invent `.tile` geometry, invent Settings row.pref gap, invent `#view-providers .badge.off`.
- SIDE_AT=1024. Push/PR #1. No portable / Vercel.

## v0.1.132 · RT_GROUPS_CARD_OSS_FIDELITY · 2026-10-15 Asia/Shanghai
- **WHY:** Continue Magpie 1:1 after 0.1.131 — delete tip invent Default groups card + shell-patch group/tpl invents that covered Magpie OSS list chrome.
- **CAUSE:** Demo painted empty groups as bordered `rt-group card` + invent `rt-ghead` / Conditions PrefRow; shell-patch forced flex-gap cards and invent `.rt-group.row`/`.who` against Magpie flat list + `.main`/`.nm`.
- **Gold:**
  - Magpie `routing.js` **3268** `list rt-groups`; **3597–3599** `.none.rt-gnone` empty copy (foundOn branch)
  - Magpie `routing.css` **414–416** border-top list / `.rt-group` row; **442–444** `.main` / `.nm`; **472** `.rt-gnone`
  - Magpie `routing.css` **316** / **667** `.rt-group-by` flex (not invent inline-flex)
  - Magpie `routing.js` **3884–3939** groupRow — never `.card` / `.rt-ghead` / `.who`
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; 752×652; CIS PrefRow/Segs/TextBtn elsewhere; saved group rows; `rt-pick-clear` demo select chrome.
- **WHAT changed:** `RoutingView.tsx` empty → Magpie rt-gnone; drop invent ModelPop/PrefRow/TextBtn empty-card state; `shell-patch.css` drop groups card/tpl/who invents.
- **Guard:** chrome-guard. Push/PR. No portable / Vercel.

## v0.1.131 · PROVIDERS_EDITOR_AGENTS_CONN_OSS_FIDELITY · 2026-10-15 Asia/Shanghai
- **WHY:** Continue Magpie 1:1 after 0.1.130 — delete tip invents on Providers editor (more/chips/icon-pick/danger) + Agents conn row layout that covered Magpie OSS.
- **CAUSE:** shell-patch painted `details.more` as a bordered card and forced `.more > .inner` flex-column against Magpie disclosure grid; invent icon-grid `.n` labels + always-red danger; invent Agents `.conn` flex re-layout against Magpie window/web rules.
- **Gold:**
  - Magpie `app.css` **2834–2843** `.editor .more` / `summary` / `[open]::before` / `.inner` grid
  - Magpie `app.css` **2775** `.extra-body textarea.json` padding 7px 9px / radius 7px
  - Magpie `app.css` **2757** `.editor .stack`
  - Magpie `app.css` **1848–1858** `.chip` height 25 / radius 999px
  - Magpie `app.css` **2696–2704** `.icon-pick` / `.icon-grid button` 34×34; **app.js ~7948–7953** icon only
  - Magpie `app.css` **1842** `.text.danger:hover`; **2848** `.editor .bar .danger` margin-left:-7px
  - Magpie `app.css` **3774–3776** `body.window .row.agent.conn`; **3786** who+ag-cant; **3329** `body.web .row.agent`
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; 752×652; CIS PrefRow/Segs/TextBtn; React `.ehead .ic img` bridge; detect-grid / hint.fade|err; Usage/Plugins/Library fidelity 0.1.129–130.
- **WHAT changed:** `shell-patch.css` drop Providers editor + Agents conn invents; `ProvidersView.tsx` icon-grid drop `<span class="n">`, title Magpie strip `-color`.
- **Guard:** chrome-guard. Push/PR. No portable / Vercel.

## v0.1.130 · USAGE_PLUGINS_FOLD_OSS_FIDELITY · 2026-10-15 Asia/Shanghai
- **WHY:** Continue Magpie 1:1 after 0.1.129 — delete tip invents on Usage chrome + Plugins shell-patch fight + Providers fold rotate that covered Magpie OSS.
- **CAUSE:** shell-patch overrode Magpie `app.css` Usage (load order); Plugins invent properties Magpie `plugins.css` never redeclared stuck (transition / min-max width / :active / font-weight); tip invent `.fold.open` rotate fought Magpie default-open chevron.
- **Gold:**
  - Magpie `app.css` **773** `.usage-head` `height: 34px; flex: none` (wrap only `@media max-width:640` / `.tight`)
  - Magpie `app.css` **3589–3591** `.usage-refresh` / `.icon` width + busy spin only; hover = shared `.icon` **240–246**
  - Magpie `app.css` **984–985** `.usage-cost` overflow/ellipsis; **1074** `.usage-note` `11px` / `--faint`
  - Magpie `app.css` **1369–1374** `.sess-pick`; **1366–1367** `.sess-filter` (no invent focus ring / transitions)
  - Magpie `plugins.css` **3–19** `.pm-mirror` (no color transition) / `.pm-find` `width: min(280px, 46%)` + webkit cancel `cursor: default`
  - Magpie `plugins.css` **23–38** `.pm-intro` bordered card; **58–64** `.pm-card` column (no `:active` scale); **114–131** `.pm-act`; **149–150** `.pm-mlabel` `12px` muted
  - Magpie `app.css` **2121–2122** `.fold svg` default `rotate(90deg)`; `[aria-expanded=false]` none
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; 752×652; CIS PrefRow/Segs/TextBtn; Library fidelity 0.1.129; React `#view-usage .usage-refresh` position + `.pm-find-clear` bridge.
- **WHAT changed:** `shell-patch.css` drop Usage invent block; drop Plugins duplicate invent block; drop `.provider`/`.rt-group` fold invent.
- **Guard:** chrome-guard. Push/PR. No portable / Vercel.

## v0.1.129 · LIB_HEALTH_TOOL_RADIO_FIDELITY · 2026-10-15 Asia/Shanghai
- **WHY:** Continue Magpie 1:1 after 0.1.128 — remove tip invents on Library MCP health / tools / instructions radio (and shell-patch lib-switch fight).
- **CAUSE:** Tip invented `.lib-health .dot` + `›` chevron + inline colors instead of Magpie `::before`/`::after`+class states; tools used invent whole-row opacity without Magpie `lib-tooltxt` DOM; radio used nested `<i>` accent fill; shell-patch re-sized `.lib-switch` against Magpie library.css.
- **Gold:**
  - Magpie `plugins/library/client.js` **1679–1698** `paintHealth`: `idle|checking|ok|auth|err`, `has-list` + `aria-expanded`, children = `span` text only
  - Magpie `library.css` **477–510**: `::before` disc; `.checking::before` = `lib-health-pulse`; `.has-list::after` chevron
  - Magpie `client.js` **1540–1559** `paintTools`: `ul.lib-toollist` > `li.lib-tool` + `div.lib-tooltxt` > `lib-toolname` / `lib-tooldesc` + switch; `lib-toolcant` / `lib-toolfoot`
  - Magpie `library.css` **500–501**: `.lib-tool.off .lib-tooltxt { opacity: .5 }` + `.lib-toolname` strike — **not** whole-row opacity
  - Magpie `library.css` **150–153** / **141–146**: `.lib-radio` empty+`::after`; `.lib-switch` 32×19 / translateX(13px)
  - Magpie `library.css` **166**: `.lib-detail` `content-in .2s` (not invent fade-in .18s)
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; 752×652; CIS PrefRow/Segs/TextBtn/LibSwitch; Routing/Agents fidelity 0.1.127–128; no PrefRow on Magpie-distinct `.acc` / `pm-row`.
- **WHAT changed:**
  - `LibraryView.tsx`: Magpie health classes/DOM; tools Magpie list DOM; radio drop `<i>`
  - `shell-patch.css`: drop invent lib-switch / lib-radio / lib-health.dot / lib-tool.off / lib-detail fade-in / health chev overrides
- **Guard:** chrome-guard. Push/PR. No portable / Vercel.

## v0.1.128 · RT_ACCTS_BAR_GUIDE_X_FIDELITY · 2026-10-15 Asia/Shanghai
- **WHY:** Continue Magpie 1:1 fidelity after 0.1.127 — remove tip invents on Routing live accounts bar and Agents guide-x hover.
- **CAUSE:** Tip painted `.rt-accts .bar` as the fill (`--bar` width + agent color-mix + shell-patch overrides) instead of Magpie track+`i`; invented `.guide-x` transition Magpie does not have; idle row tip override fought Magpie L74.
- **Gold:**
  - Magpie `routing.css` **84–90**: `.bar` track `var(--card-2)`; `.bar i` fill `var(--muted)` → `var(--fg)` when `li.on`; `transition: width .4s` on `i`
  - Magpie `routing.js` **1315–1317** `makeRow`: `i.dot` + `b` + `em` + `div.bar>i`; **1587** `row.bi.style.width = fill(w)`
  - Magpie `app.css` **3728–3729** `.guide-x` / `:hover` — **no** transition
  - Magpie `routing.css` **74** `.rt-accts li.idle { display: block; … text-align: center; }`
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; 752×652 frame; CIS PrefRow/Segs/TextBtn; livedot always-green (0.1.127); guide hide instant (0.1.127); no PrefRow on Magpie `.acc` / `pm-row`.
- **WHAT changed:**
  - `RoutingView.tsx`: live stage Magpie makeRow DOM + inner `i` width
  - `shell-patch.css`: remove invent `.rt-accts` bar-as-fill / `#view-routing` bar fill / idle override / `.guide-x` transition
- **Guard:** chrome-guard. Push/PR. No portable / Vercel.

## v0.1.127 · RT_LIVEDOT_GUIDE_HIDE_FIDELITY · 2026-10-15 Asia/Shanghai
- **WHY:** Next 1:1 visual/interaction tip after CIS chrome wave closed at 0.1.126 — pick Magpie-faithful CSS/motion on pages users check (Routing empty/live stage, Agents guide).
- **CAUSE:** Tip had diverged `.rt-livedot` to faint + `.on` and invented shell-patch 7px glow (not Magpie); Agents `guide-x` invent fade not in Magpie `hideGuide`.
- **Gold:**
  - Magpie `routing.css` **405**: `.rt-livedot { width: 6px; height: 6px; … background: var(--green); animation: rtlive 1.8s infinite; }`
  - Magpie `app.js` **1682–1695** `hideGuide()` — prefs write + re-render, **no** opacity/transform fade
  - Win chrome / nest-752 / `SIDE_AT=1024` unchanged
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; 752×652 frame; CIS PrefRow/Segs/TextBtn; no PrefRow on Magpie `.acc` / `pm-row`.
- **WHAT changed:**
  - `routing.css`: Magpie livedot restore
  - `shell-patch.css`: remove invented `.rt-livedot.on` 7px glow
  - `RoutingView.tsx`: `rt-livedot` without invent `.on`
  - `AgentsView.tsx`: instant guide hide
  - CIS md: chrome wave closed @ 0.1.126 + PrefRow add-row recipe
- **Guard:** chrome-guard. Push/PR. No portable / Vercel.

# Tip changelog · 循环检测日志

每条 tip 必须有 **WHY**。动到壳 chrome 时再加 **CAUSE / WHAT kept / WHAT changed**。见 [`TIP-CYCLE.md`](./TIP-CYCLE.md)。

---

## v0.1.126 · CIS_SIMPLEVIEWS_FEAT_USAGE_PLUGINS · 2026-10-15 Asia/Shanghai

- **WHY:** Continue CIS — SimpleViews feat-row / Usage / Plugins still hand-rolled Magpie-mapped `.row.pref` / `.lib-switch` / `.text` / sort segs (deferred after 0.1.125).
- **CAUSE:** PrefRow wave closed Settings + Gateway/Library/Routing/Agents; builtins feat-row was the named leftover.
- **Gold cites:**
  - Magpie `app.js` **24446–24473** `renderBuiltins`: `div.row.pref.feat-row` + `lib-switch use-credits` appended beside `.who` (**no** `.val`)
  - Magpie `app.js` **24487–24489** settings rows `.feat-set` + `dataset.of`
  - Magpie `plugins.js` **893–898** `feat-say` + `#builtinList`; **921–923** `sortBy("plugins")` → `segs` + `.sortby`
  - Magpie `plugins.js` **835 / 934 / 1072–1178** Install / Check / Options / Sign in / Remove `.text` (+ primary/quiet)
  - Magpie `app.js` **17400** `text us-unhide`; Usage Hide accounts / sess-all `.text`
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; pm-mirror nested `.lib-switch` (Magpie-distinct outer button); installed `row pm-row` (Magpie **not** `.pref` — do not PrefRow); Gateway keys Magpie `.acc`; feat-set `sess-pick` (ui.form); CSS-var/pop `style={{`.
- **WHAT changed:**
  - `PrefRow`: `dataId` / `dataFeature` / `dataOf`; feat-row uses `wrapVal={false}`
  - `Segs`: optional `dataSort` (Magpie sortBy `dataset.sort`)
  - `SimpleViews`: builtins → PrefRow + LibSwitch; Usage/Plugins `.text` → TextBtn; Plugins A→Z → Segs sortby
  - CIS md snapshot 0.1.126; chrome wave largely closed (leftovers = Magpie-distinct DOM / geometry tokens)
- **Guard:** `npm run chrome-guard`. Push/PR required. No portable / Vercel.

---
## v0.1.125 · CIS_GATEWAY_LIBRARY_ROUTING_AGENTS · 2026-10-15 Asia/Shanghai

- **WHY:** Continue CIS unification outside Settings: Gateway / Library / Routing / Agents still hand-rolled Magpie-mapped `.text` / `.segs` / `.lib-switch` / Conditions `.row.pref`.
- **CAUSE:** PrefRow wave closed for Settings (0.1.122–124); scan found clear wins elsewhere that Magpie already maps to shared CIS.
- **Gold cites:**
  - Magpie `plugins/gateway/client.js` **97** `text action gw-fix`; **418** `segs(FLAVORS)`; **452–460** snip + `.snip-os` `segs()`; **661–669** Add gateway key / openLanSettings / copyModels `.text`
  - Magpie `plugins/gateway/keys.js` **180** Remove `text quiet` (keys themselves stay Magpie `.acc`, **not** PrefRow)
  - Magpie `app.js` **6174–6202** `segs()` + `slide()` thumb
  - Magpie `plugins/library/client.js` **98** `lib-switch`; MCP sort A→Z / toolbar `.text.action` (library.css Select/Done)
  - Magpie Routing Conditions = `.row.pref` + `.text`; found groups `.lib-switch`; names list `segs()`
  - Magpie Agents manage modal = `.text` actions / Done bar
- **WHAT kept:** `SIDE_AT=1024`; no `WEB_SIDE_AT`; Gateway keys demo `.row.pref` simplification (Magpie `.acc` — do not fake PrefRow contract); Library skillHow busy opts (Segs has no busy); Agents `row agent conn` / Routing `.rt-gfound .txt` Magpie-distinct; CSS-var/pop `style={{`.
- **WHAT changed:**
  - `GatewayView`: Restart / Add key / Remove / Network / Copy all ids → `TextBtn`; Connect flavor + snip + snip-os → shared `Segs` (drop page `useSegThumb`)
  - `LibraryView`: MCP A→Z `Segs`; tool/project/RTK → `LibSwitch`; MCP toolbar Select/Turn all on|off/By agent/Remove all → `TextBtn`
  - `RoutingView`: Conditions → `PrefRow`+`TextBtn`; found → `LibSwitch`; names → `Segs`
  - `AgentsView`: Manage Agents search actions + Hide/Unhide/Done → `TextBtn`
  - CIS md: PrefRow API `wrapVal`/`afterWho`/`dataUser`/`dataPattern`/`subClassName`; snapshot 0.1.125
- **Guard:** `npm run chrome-guard`. Push/PR required. No portable / Vercel.

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
