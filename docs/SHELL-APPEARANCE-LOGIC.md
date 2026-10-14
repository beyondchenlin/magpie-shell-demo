# Magpie 外壳外观制作逻辑（PackGate / 二开备忘）

> 对照：官方 Magpie `internal/gui/assets/`（app.js / app.css / index.html / i18n.js / plugins/gateway）。  
> 目的：说明**目的 → 机制 → 如何扩展**，不是 PRD。  
> Demo：`magpie-shell-demo`。品牌可换；**壳的结构与动效应对齐**，不要凭感觉抄。

---

## 1. 窗口 Chrome（标题栏 / 顶栏标签 / 侧栏）

| 目的 | 机制 | 二开注意 |
|------|------|----------|
| 默认桌面窗像 Win/Mac 安装包 | 默认 **660×600**；`SIDE_AT = 1024` | 窄窗 = **顶栏 tabs**（金标）；宽窗才侧栏 |
| 侧栏开关可记忆 | `localStorage magpie.navLayout` = `side` \| `top` \| 空 | 空 = 跟媒体查询；有值则强制 |
| 布局类 | `body.window` + 可选 `body.side-nav` / `body.web` / `body.linux` / `body.mac` | Win exe：**系统标题栏** + 藏页内 brand；勿把 Linux 页内关闭钮当金标 |
| 侧栏宽 | `--side-w: 212px`（≤859px → 184px）；`padding-left: var(--side-w)` | 拖宽 `#sideEdge` 可后做 |

**判定金标：** Win/Mac 默认 = 顶栏；web 宽屏截图的侧栏 ≠ 桌面默认。

---

## 2. 布局 DOM（nav / stage / foot / modal）

```
aside#side.sidebar          ← body.side-nav 时常显
header.top                  ← brand | sideToggle | crumb | #nav.seg | actions(#sync)
main.view#view-*            ← 一页一个 main；hash / data-view 切换
footer.foot                 ← #status toast 胶囊
#modal / #pop               ← 对话框 / 模型选择浮层
```

- **顶栏态：** `#nav` 在 `.top` 里，`.segs` 滑块选中。  
- **侧栏态：** `#nav` 挪进 `.side-scroll`；`.top` 只留 crumb + sync；Settings 在 `.side-foot`。  
- 页切换：`location.hash`（demo）或 Magpie `view` + plugin `slots.page`。

**扩展新页：** 加 `data-view` 导航项 + `#view-xxx` +（Magpie）`magpie.plugin` 的 `slots.add("page")`；不要另起一套路由壳。

---

## 3. Design tokens / CSS 架构

- **色与字：** `:root` CSS 变量（`--bg --card --fg --muted --accent --green --ease …`）；暗色 `data-theme="dark"` 或系统 dark。  
- **theme.js / demo：** 只写 `data-theme` / zoom，**不**在 JS 里硬编码色值。  
- **组件层：** 通用 `.list .row .segs .fold .copy .text.action`；页专用块（`.gwcard .connect .activity .rt-*`）叠在上面。  
- **Windows 字体：** `:root.win` 切 Segoe / 雅黑。

改皮肤：先改变量；少改组件选择器。PackGate 可换 accent，保留间距与圆角节奏。

---

## 4. Motion tokens（必须 1:1，禁止“静止壳”）

`--ease: cubic-bezier(.2, .8, .2, 1)`（app.css `:root`）。

| Token / 选择器 | 时长 / 曲线 | 用在 |
|----------------|-------------|------|
| `view-in` | **.24s** `--ease`；from `opacity 0` + `translateY(5px)` | 每次进入 `.view` |
| `fade-in`（reduced / side-nav 页） | opacity only | `prefers-reduced-motion` 时 `.view` 改名 |
| `.segs` thumb（JS `slide` / demo `useSegThumb`） | **280ms** `cubic-bezier(.2,.8,.2,1)` | API / Shell / OS 等分段钮 |
| `.opt` color/transform | **.18s / .14s** `--ease` | 分段选项 hover/选中 |
| `.fold svg` | **transform .15s ease-out**；展开 `rotate(90deg)` | Connect / Models 折叠 |
| `.copy` hover | background/color **.12s** | 复制钮 |
| `.copy.done` + `copy-pop` | **.36s** `--ease`；scale .55→1.16→1；图标换 ✓ **1200ms** | 复制成功 |
| `.gw .url` | background/box-shadow **.12s** | 状态卡地址 pill |
| `.text` / `.text.action` | background/color **.12s** | 文本钮 / Restart |
| `#sync.spin` / `spin` | **.9s** linear infinite | 顶栏刷新 |
| `.status.ok` 胶囊 | 出现约 **3.5s** 后清；opacity transition **.2–.3s** | footer toast |
| `.nav-hl`（侧栏） | transform/height **.3s** `cubic-bezier(.25,.9,.3,1)` | 侧栏行高亮 |
| view-transition（侧栏进出） | **.5s** `cubic-bezier(.32,.72,0,1)` | 顶栏↔侧栏 morph（可选） |
| `skeleton-shift` | **1.4s** ease-in-out infinite | Gateway loading 骨架 |
| `.lib-switch` / `i` | background **.18s**；thumb translateX **.18s** `--ease` | Agents 连接 / Providers / 额度开关 |
| `.pref-pick` chevron | transform **.15s** `--ease`；open 旋转 180° | Settings 语言等菜单钮 |
| `.warm-tabs button` | color/background **.12s** | Settings Allowances 预热分区 |
| `.set-searching` | tabs 隐藏；`.set-page::before` 显示 `data-part` | Settings 搜索 |
| `.text` / `.discord`/`.github` | background/color **.12s** | Settings About / Sync 文本钮 |
| `lan-address-row` height | **.28s** `--ease` | Network LAN 地址行展开 |
| `#pop` `pop-fade` + `pop-in` | **.18s** ease-out + **.42s** cubic-bezier(.16,1,.3,1) | 模型选择器打开 |
| `#pop.leaving` `pop-out` | **.22s** cubic-bezier(.4,0,.7,.2) | 模型选择器关闭 |
| `.rail-thumb` | transform **260ms** cubic-bezier(.22,1,.36,1) | model-picker 左侧 rail（All/Favorites grid·star；Disable `#pop` 已接） |
| `.warm-at input.at` | border/box-shadow **.12s** | Daily warm-up 时间片 |
| `.proxy-segs input` | border/box-shadow **.12s** | Proxy / SOCKS 字段 |
| `.modal` / `.dialog` | fade **280ms** + spring **570ms**（Providers 已有 `useModalAnim`） | Restore / What's new |

**规则：** 每个可点控件落地时对照 Magpie 同选择器的 `transition` / `@keyframes` / JS 定时器；缺动效 = 未对齐。尊重 `prefers-reduced-motion: reduce`。

---

## 5. 路由 / 页挂载

| Magpie | Demo |
|--------|------|
| `kernel` plugin pages + `loads: "providers"` | React `view === "gateway"` 挂载 |
| `loading` → skeleton；`draft`/`render` | 空态直接画最终几何（可后补 skeleton） |
| Gateway HTML 在 `plugins/gateway/client.js` 的 `html:` | `GatewayView.tsx` 同 DOM 类名 |

**扩展：** 新页先抄官方空态 DOM class，再接线状态机；不要自创卡片层级。

---

## 6. i18n

- **源文案 = 英文 key**；`t(en)` → `I18N[locale][en]`。  
- Magpie UI locale：settings prefs / `?locale=`（**不是** `magpie.lang`）。  
- Magpie Gateway **snippet 方言**存在 `localStorage magpie.lang`（shell/curl/…）。  
- **Demo：** UI 暂用 `magpie.lang` = `zh`\|`en`；snippet 用 **`magpie.snipLang`**，避免冲掉 UI 语言（二开若跟上游合并，应把 UI 改到 prefs/`magpie.locale`）。

扩展：新字符串先写英文，再进 zh.json；勿在 JSX 硬编码中文业务句（demoCopy 仅用于“非 Magpie 文案”的演示说明）。

---

## 7. 交互模式（toast / modal / toggle）

| 模式 | 机制 |
|------|------|
| Toast | `#status` + `.ok/.err/.warn`；`status(msg, kind, ms)` 默认 3500 / err 8000 |
| Copy | `/api/copy` → clipboard → execCommand；成功 `flashCopied` + toast `{what} copied` |
| Segs | 一组 `.opt`，选中 `.on` + thumb 滑动；`aria-pressed` |
| Fold | `.fold[aria-expanded]` + chevron；状态可写入 `magpie.gwConnectFolded` / `magpie.gwModelsFolded` |
| Modal | `#modal` + `.dialog`；Esc / 遮罩关闭（页级再录） |

---

## 8. Gateway 页结构（空态金标）

1. **`.gwcard` / `.row.gw`**：dot · Gateway+state · sub · `.gw-fix` · `.url`  
2. **keys 说明**（lan 关）：`#gatewayKeysOff` +「网络与共享」  
3. **Connect**（可折）：API segs · Base URL · API key · Model · Example（snip + OS segs + `.snip`）  
4. **Models**：空 → `.empty-state`  
5. **Recent calls**：`.activity .none`

源码：`plugins/gateway/client.js`（renderGateway / renderConnect / renderGatewayModels / renderActivity）。

---

## 9. PackGate 应保留 vs 应改名

| 保留（行为/结构） | 改名 / 去掉（品牌） |
|-------------------|-------------------|
| DOM class（`.gw` `.connect` `.segs` `.fold`…）与 motion | 文案里的 “magpie” 产品名 → PackGate |
| `SIDE_AT`、navLayout、空态 IA | Logo / bird 品牌图 |
| 英文 i18n key 策略与 duration 表 | `magpie.*` localStorage 前缀可迁 `packgate.*`（需迁移层） |
| five APIs 接入卡信息架构 | Pi / 第三方壳品牌元素 |

**不要：** 另起一套无 transition 的“像一下”的卡片；不要把侧栏宽窗当桌面默认。

---

## 10. 怎么加一页（清单）

1. 官方空态截图 + 源码 HTML/CSS/JS 动效表  
2. `interactions/pages/<page>/SPEC.md` + shots  
3. 实现 DOM class **同名**；控件 onClick 接 toast/fold/segs  
4. 核对 §4 motion 表逐条  
5. Gap 写进 GAP-MATRIX；未录的控件不宣称 1:1  

*文档版本：随 Gateway 空态落地（demo v0.1.9）*


---

## 11. Settings 页（二开）

- **DOM：** `#view-settings` → `.set-head`（`.set-tabs` + `#setQ`）→ 多个 `.set-page`（`hidden` 切换，非卸载）。  
- **渲染：** Magpie `renderSettings()` 往 `#themeSegs` 等空容器 `replaceChildren(segs(...))`；demo 用 React `Segs` + `magpie.demoPrefs`。  
- **搜索：** 输入非空 → `set-searching`；各行按名称/译文过滤；无匹配 → `#setNone`。  
- **扩展一行：** 在对应 `setPage-*` 加 `.row.pref`（`.who` + `.val`），控件用 `Segs` / `.pref-pick` / `.text` / `.copy`，对照 `app.js` 同名字段的 API，demo 只本地态。  
- **从 Gateway：** `#openLanSettings` → `sessionStorage magpie.setTab=network` 再进 Settings。

*文档版本：Settings nested + #pop v0.1.12*


---

## 12. Usage / Plugins（v0.1.13）

### Usage

- DOM：`#usageTab` + `#period`（含 Custom/`range-opt`）+ `#usageRefresh`（reload + `#usageEvery` sess-pick）+ `#usageCost`。
- Tab 切换藏/显 `#usagePane` / `#ledgerPane` / `#sessionsPane` / `#contextPane`（与 index.html 同构）。
- Period 预设：`today|7d|30d|all`；Custom 打开 `range-menu`（快捷区间；日历可后接）。
- Refresh every：`USAGE_EVERY` = Off/5s/10s/30s/1min；busy 时 reload 图标 `spin .8s`。
- Requests：`ledStatus` segs + search + Export；`ledMetric`/`ledSplit`；KPI 条。
- Sessions：`SESS_RANGES` + agent segs + 6 KPI 空态。

### Plugins

- Tabs：`builtin|discover|installed`（`magpie.pluginTab`）。
- Built-in：`renderBuiltins` 式 Off/On（Sessions / Library / Gateway keys / Observability）。
- Discover：`pm-intro` + `pm-grid`/`pm-card`；Install → 本地 Installed；`pm-mirror` 国内镜像开关。
- Installed：空态 `pm-none`；行内 Options 折叠 textarea、Disable、Remove 确认；`Check for updates` 壳。

### Settings Models `#pop`

- Image recognition / Image generation / Searches for other models：**`SideModelPick` → `#pop`**（Automatic · note / Off / DEMO_MODELS），与 Codex titles 同套 `ModelPop` 动效。
- Replies：**不是**模型 pick — `Name the member` / `Stop looping` / `Ask again after a refusal` 三段 segs。
- About：**Download source** = `GitHub` + `Use a mirror…` 行内编辑（`UpdateMirrorRow`）。
- Allowances menu bar：`TrayUsagePick` Off ▾ / Today / 7 days（对齐 native NOTES）。

---

## 13. v0.1.14 — Network LAN / Models Disable+Search / Usage calendar / Plugins opts

### Network (native 41–50)

- Share On → `LanAddressRow` (OpenAI|Anthropic segs + multi-IP pick + copy) height **.28s** `--ease`.
- Demo LAN bases: `http://172.30.0.2:3425`, `http://172.17.0.1:3425`; OpenAI appends `/v1`.
- Allowed addresses + Web pages Add rows (CORS) stay as Magpie `rule-add`.

### Models

- **Disable…** → real `#pop` (`DisableModelsBlock` / `ModelPop`); Enter typed glob adds pattern; Enable removes.
- **Search APIs** → vendor proto-pick (Tavily/Brave/You/SearXNG) + key + URL + Add; list Show/Copy/Remove.

### Usage

- Custom period = Magpie `openRangeMenu`: quick spans + month grid (first→last day); period id `YYYY-MM-DD..YYYY-MM-DD`.
- Requests `led-strip` uses Magpie `.blk` / `.k` / `.v` / `.sub` (5 cells); demo `led-chart` bars with metric/split labels.
- Sessions keeps 6 KPI + agent segs + filter empty.

### Plugins

- Install `pm-act` / `.get` accent soft→fill; Options = `.pm-opts` textarea + err + bar (Clear/Cancel/Save JSON object) + middleware hooks note.

### Motion tokens re-scan (still required)

Same as §4; added: `.pm-opts textarea` focus .12s; `.range-menu .rm-day` background .12s; `.search-vendor.open` chevron .15s; led-chart bar height .28s.

*文档版本：v0.1.14*


---

## Privacy 嵌套（Settings › Privacy，shots 63–70）

| 控件 | Magpie | demo |
|------|--------|------|
| Mask personal data On | 展开 `REDACT_KINDS` 10 行（`.redact-kind` 左缩进） | 同；`redactKinds` 存 prefs |
| Prefix / Regex | 切换只改 placeholder；录屏里样本 `oc_sk_` ↔ `oc_sk_[A-Za-z0-9]{20,}` | 空或仍为上一模式样本时交换 value |
| Agents' sign-ins | **Subscription accounts** Off/On（非 Ask/Allow/Deny） | 同；关时确认框二开可后做 |
| Disable… `#pop` | 左轨 grid=All / star=Favorites；空 catalog **No matches.** | ModelPop `pickerRail` + `.none` |

## Usage 空态

- Requests：`#ledDash` 无数据时 **hidden**（官方）；demo 提供「显示演示图」开关。
- Sessions：`#sessStats.stats.empty` + `.none` 文案；`#sessChart` / `#sessGrid` hidden。
- Context：`context.js` — 「No prompts read yet」+ Through magpie 头。


## 15. Usage filled / Context cards / Plugins ask（v0.1.16）

| 目的 | 机制 | 二开注意 |
|------|------|----------|
| Requests 有数据 | `table.led` + `.led-row` 展开详情；KPI `.led-strip` 五格 | 空态仍藏 dash；演示开关 `demoFilled` |
| Sessions 总览 | `.stats.six` 六 KPI + `.sess-list .row.sess` | Magpie 真数据来自 session 文件索引 |
| Context 评分卡 | `context.css` `.ctx-agent` ring/scores/tags/facts/mix | 动画 `ctx-arc` / `ctx-grow`；`prefers-reduced-motion` → `.still` |
| Plugins Disable | `.pm-ask` 内联确认，非立刻 toggle | 有 movable 订阅时 Magpie 文案更长 |
| Providers 嵌套 | `.fold` chevron **.15s** 账户/模型 | 添加后写入 `#providers` 列表 |
| Routing 组 | `#rtMore` 组卡 + `#pop` ModelPop + Conditions fold | 空舞台仍保留；组为演示壳 |



## 16. Overview filled / Agents Connect / Plugins search（v0.1.19）

| 目的 | 机制 | 二开注意 |
|------|------|----------|
| Overview KPI | `.stats` 四格 `.kpi`（tokens / cache read / reasoning / calls） | 空态藏 chart 与 Agents/Models 头；`buildDemoOverview` |
| Overview chart | `.chart .bars .bar i.in/i.out` peak+labels | 高度 transition `.28s`；hour/day bucket |
| Agents Connect | 接入后展开 `.ag-exp` / `.ag-settings` / `.ag-foot` | Disconnect and restore；View diff；Relocate 同壳 |
| Get started hide | `#agentsLead` opacity/transform `.22s` | `magpie-demo-guideHidden` |
| Plugins search | 350ms debounce → Suggested `DEMO_NPM` | Mirror tip absolute；folder → manualSpec |
| Routing trace | `.rt-reqs .rt-req` live demo rows | wait 点 rtlive；failover `.swap` |
| Privacy discovery Off | `window.confirm` 双段文案 | Saved toast 仍走 setPrefs |


## v0.1.20 Agents / Routing motion notes

| 控件 | Magpie | demo |
|------|--------|------|
| `#pop` field (ag-pick) | pop-fade .18s + pop-in .42s；leaving .22s | ModelPop 同 |
| `.pop.am-pop` | 同上 + am-fold chevron .2s | AgentModelsPop |
| `.ag-exp` open | fade-in ~.22s | 同；reduced → none |
| `.field.ag-pick.open` | accent ring | box-shadow 1.5px |
| `.rt-session` fold | instant list swap (steady) | fade-in .18s on head |
| Privacy rule inputs | accent focus ring | rule-add .words:focus |


## v0.1.21 Routing Purpose / Metrics / Accounts

| 控件 | Magpie | demo |
|------|--------|------|
| `#rtPurpose` | `openProtoMenu` live multi；`All purposes` 清空并关；pill `.set` | `ProtoMultiMenu` live；clear × |
| `#rtMetrics` | multi live；`magpie.routingMetrics` | 同；6 项 Duration/TTFT/Tokens/Cache/Speed/Cost |
| `.rt-purpose` / `.rt-metric-pick` chevron | transform **.15s** `--ease`；open 180° | 同 |
| `proto-menu` open | pop-fade **.18s** + pop-in **.42s** | ProtoMultiMenu |
| `proto-menu` close | scale/opacity **~180ms** | 同 |
| Accounts 列 `.rt-acts` | `renderActs`：prov 头 + `.rt-act` + keys fold + bar | demoLive mock；`#rtReadAllowances` busy spin |
| `.rt-read.busy svg` | spin **.8s** linear | 同（routing.css） |
| `.rt-req .kind` | purpose pill | unmarked 不显示 |
| Agents Install head | `Install another agent ({n})`；chevron **.3s** cubic-bezier(.22,1,.36,1) | `t(...)` + fade-in body **.22s** |
| Manage 四钮 | Select search / Invert / Select unconnected agents / Clear | `t()` 对齐 Magpie 英文源键 |

*文档版本：v0.1.21*


## v0.1.22 Plugins search / Agents guide (native shots)

| 控件 | Magpie | demo |
|------|--------|------|
| Search debounce | askNPM **350ms**, min 2 chars | 同 |
| Suggested | listings match only | npmHits；无匹配则不渲染该节 |
| On npm | 搜索时始终有；副文案固定 | DEMO_ON_NPM；Mirror On → DEMO_ON_NPM_MIRROR |
| Folder choose | `plugins/choose`；Cancel 不改字段 | 演示对话框 Cancel/Open；Cancel 保持 manualSpec |
| Mirror tip | hover title + tip | `.pm-mirror-tip` fade-in **.12s** |
| Get started | `{n} of {total} done`；无 connectable → 无芯片 | 同；Cursor Can't connect 非按钮 |
| Manage hide result | `{n} agent(s) hidden/unhidden` | `t()` |
| Install chevron | **.3s** cubic-bezier(.22,1,.36,1) | app.css 已有 |
| Profile Escape | 关 naming | 已有 |

*文档版本：v0.1.22*

## v0.1.26 Copilot device-code / pairTile

| 控件 | Magpie | demo |
|------|--------|------|
| Copilot tile | `startSignIn("copilot")` → device code，无 risk 门 | 点开即 `.signing` waiting（mock code `WXYZ-9K2M`） |
| `.devcode code` + `.copy` | 字距 .12em、17px 600；copy-pop **1.2s** | `SignCopy` + toast `{what} copied` |
| `.signlink` | URL + Copy；Open again → `api("open")` | `window.open` 公网 device 页；无 OAuth 轮询 |
| `Account on GHE.com?` | `signing.state=ghe` → `.copilot-ghe` | 同；校验 `*.ghe.com` 后 mock waiting + `https://{host}/login/device` |
| `Proxy: {proxy}` | `signInProxyLink` + proto-menu | 演示 Global ↔ Direct 切换；完整菜单可后接 |
| Cancel | `cancelSignIn` | 清 `copilotSign` |
| `pairTile(pr, cn)` | 一格；title 两行 Global/China host | `vendorPairs` + `pairHostTip`；点开 Global 编辑器（Region 仍切 China） |
| China 独立格 | **不出现**（除非无 global） | `-cn` 不进 grid |

动效：`.signing` **fade-in .2s**；`.spinner` **spin .8s**；`.copy.done` **1.2s**（同 §4）。

*文档版本：v0.1.26*

## v0.1.29 Routing New group editor (native 02–22)

| 控件 | Magpie | demo |
|------|--------|------|
| `.editor.rt-gedit` open | `newGroup()` → `renderGroups` | `GroupEditor` pop-in **.42s** cubic-bezier(.16,1,.3,1) |
| Name / In agents' lists | idHint `group/{slug}` · suffixMode | 同；suffix 跟 Names On |
| Models `#pop` | multi picker · typed id | ModelPop；**use as typed**；DEMO_MODELS |
| Reasoning `.rt-fixed` | Follow/low…max | ModelPop `modelPicker=false` |
| Patterns | `rt-patadd` * / re: | 同 |
| Model lists / Routing segs | LIST + Smart…Manual | Segs + hints；sinkable→Rate limited |
| Rate limited / Slow / Busy | SINK / FIRST / PATIENCE | 同 |
| Context / Stays / Effort / Levels | Magpie opts | 同 |
| Cancel dirty | `confirmDiscard` | Discard modal；pop-in **.28s** |
| Add | `groupAction("save")` | mock `savedGroups`；无真 API |
| Bird hop | `fly()` 620/900/**1400**/1350 | demo flier **1400ms**（原 2200） |
| Pools `renderPools` | Several accounts or keys | demoLive Anthropic mock |

*文档版本：v0.1.29*

## v0.1.30 Routing templates / Import / Accounts (native 23–30)

| 控件 | Magpie | demo |
|------|--------|------|
| Empty stage | Waiting for a request · Send one… · Every request… | `t()` 英文源键（zh 表已有） |
| `#rtMask` | Accounts hidden / Hide accounts · tip 两句 | 同 NOTES 28–30 |
| `.rt-gtpl` | 三卡 + Add a provider first（无 provider 时 off） | 无 own group 时显示；无真 Add |
| Import box | Paste… never a key · placeholder Copy to share · Import disabled 空 | `.rt-gimport` / `.rt-gimport-text` |
| Discard → 23 | 关编辑器 · templates 仍在 | GroupEditor discard |
| ModelPop multi | pick 后保持打开 · use as typed | `keepOpen` |

*文档版本：v0.1.30*

## v0.1.32 Library Skills/Hooks/RTK + Rules dragRows

| 控件 | Magpie | demo |
|------|--------|------|
| New MCP server modal | `editServer` · segs Command/HTTP/SSE · paste JSON | `LibModal` pop-in **.42s**；Runs as segs **.18s** |
| OAuth app / Sign-in | `drawApp` + `signInBox` | 字段齐；Save and sign in = mock toast |
| Discard | `confirmDiscard` | pop-in **.28s**；红 Discard |
| Magpie Image sheet | market `optIn` · Add to the library | Discover Add… → sheet |
| Skills installCard | probe `library/skills/probe` | mock 480ms Looking… + pick/Install |
| Hooks empty + editHook | HOOK_EVENTS / HOOK_TOOLS menus | 同；无真写入 agent 文件 |
| RTK card | `renderRTK` not installed | Install mock 900ms；agent `.lib-switch` |
| Rules members drag | `dragRows` in routing.js | `src/lib/dragRows.ts` + `.fbl.sorting` **.22s** |
| Members Alt+↑/↓ | Magpie | 同；已去掉 Up/Down 钮 |

动效：`.lib-switch` thumb **.18s**；Discover card fade-in **.18s**；modal fade-in **.18s** + pop-in。

*文档版本：v0.1.32*

## v0.1.33 Library Skills probe / Hooks (native 29–33)

| 控件 | Magpie | demo |
|------|--------|------|
| Skills probe | `installCard` + `probeResult` | Find skills 480ms mock → DEMO_PROBE_SKILLS |
| Probe head | `{n} skills in github.com/…` · Select all | 同；>8 显示 Filter… |
| Probe foot | for · agent chips · Cancel · Install {n} | Install 0 when pick empty (disabled) |
| Discover skills | Popular on skills.sh · market cards | 8 DEMO cards；sheet for grill-me 等 |
| Hooks empty | dashed + ＋ Add a hook | 同；头无 Discover |
| New hook | Name/Description/When/Command/Timeout/Agents | LibModal pop-in **.42s** |

*文档版本：v0.1.33*

## v0.1.33 Library native DONE (01–38)

Full nested capture consumed. Hook When-it-runs includes shared events + Cursor own list through **preCompact** (Find an event filter). RTK card shows install.sh curl; Install/Get/Check = mock. Magpie Image + grill-me sheets; MCP New Command/HTTP/SSE/OAuth/Discard.

*文档版本：v0.1.33 LIBRARY_DONE*


## v0.1.34 Providers list-with-accounts + Tray Agents

| 控件 | Magpie | demo |
|------|--------|------|
| `#providers > .row.provider` | handle · who · uses · key · pswitch · chev | 同；默认 Anthropic mock 有账号 |
| `.key.acct` / `.key.on` | 绿点 pill 128px | 同 CSS |
| `.uses` / `.use` | agent 图标钮 | Cursor mock |
| `.lib-switch.pswitch` | on/off 立即 | mock toast；off → `#offProviders` |
| 点行 → editor | `openModal(renderEditor)` | modal + `.accts` / `.acc` |
| `.acc .dot.tick` | 勾选用账号 | mock toggle |
| Tray `body.panel` | ptabs + agents + foot | `?panel=1` / `#panel` |
| ptabs thumb | slide 280ms | `useSegThumb` |
| Allowances 无配额 | tab hidden | `hasAllowances=false` |
| `.row.agent` open | `--row-spring` .48s | CSS 已齐；Model/Effort 字段 mock |

*文档版本：v0.1.34*


## v0.1.35 Tray Usage empty (native 02)

| 控件 | Magpie | demo |
|------|--------|------|
| `#panelUsage` stats tab | `renderPanelUse` | TrayPanel when `data-ptab=stats` |
| period segs | Today/7 days/30 days/All | `useSegThumb` 280ms |
| `.pu-again` spin | refresh | mock toast |
| Open Usage | `window/main?view=usage` | leave panel → `#/usage` |
| `.pu-none` | No requests today | 同文案 |

*文档版本：v0.1.35*
