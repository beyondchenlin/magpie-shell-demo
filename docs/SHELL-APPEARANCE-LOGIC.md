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
| `.rail-thumb` | transform **260ms** cubic-bezier(.22,1,.36,1) | model-picker 左侧 rail（二开可后续） |
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
