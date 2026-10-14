# Magpie 桌面壳拆解（只读源码事实）

> 对照树：`/workspace/magpie-src/internal/gui/`（assets + Go 窗口）  
> 目的：在声称「1:1」之前，先把壳的真实结构、token、IA、Routing 舞台写死。  
> 范围：视觉壳 / 信息架构 / 关键交互；网关业务深度只在它塑造 UI chrome 时提及。

---

## 1. 窗口与外壳

### 1.1 默认尺寸与最小尺寸

| 项 | 值 | 源 |
|----|-----|-----|
| 默认打开（无已存尺寸） | **660 × 600** pt | `window_rule.go`：`const windowW, windowH = 660, 600` |
| 最小（100% 字号） | **560 × 420** pt | `textsize.go`：`const windowMinW, windowMinH = 560, 420` |
| 打开逻辑 | 优先 `settings.Window`，否则 660×600；再与 `minW/minH` 取 max | `window_rule.go` `openSize` |
| 实际创建 | `makeMain`：`Width/Height = openSize(...)`，`MinWidth/MinHeight = windowMin(z,...)` | `lightweight.go` |

### 1.2 标题栏 / 圆角 / 背景

| 平台 | 行为 | 源 |
|------|------|-----|
| macOS 主窗 | `MacTitleBarHiddenInset`；页面 header 可拖；traffic lights 在侧栏顶左 | `mainwindow.go` `mainMacWindow`；`app.css` `body.window.mac .side-top` padding-left `84px/zoom` |
| Linux 主窗 | `plainTitlebar`：去掉系统标题栏，**页面 `.top` 即标题栏** | `app.go` + `titlebar_gtk*.go` |
| Windows 主窗 | **保留系统标题栏**；页面内 brand 隐藏 | `titlebar_other.go`；`app.css`：`body.window:not(.mac):not(.linux):not(.web) .brand { display: none }`；`.side-top { height: 10px }` |
| 托盘 panel | frameless；Mac `CornerRadius: 12`；半透明 | `app.go` `panelOptions`；`body.panel { border-radius: 12px }` |
| 主窗背景色 | `--bg`（浅 `#f4f4f6` / 深 `#1a1a1e`）；Windows 从启动起 tint 标题栏 | `app.css`；`lightweight.go` `windowChrome` |

### 1.3 总布局骨架（DOM）

```
aside#side.sidebar          ← layoutNav 打开后常显（body.side-nav）
  .side-top                 ← 可拖；Mac 放 brand
  .side-scroll              ← 放入 #nav
  .side-foot                ← #sideGw + #prefs（Settings）
  #sideEdge.side-edge       ← 拖宽
header.top                  ← 高 46px（Mac 侧栏态约 50px/zoom）
  .brand / #sideToggle / #crumb / #nav.seg / .actions
main.view#view-*            ← 各页
```

源：`assets/index.html` L23–93；侧栏 CSS `app.css` L319–431。

侧栏宽：

- `body.side-nav { --side-w: 212px; padding-left: var(--side-w) }`
- `@media (max-width: 859px) { --side-w: 184px }`

顶栏：`.top { height: 46px; padding: 0 10px 0 14px }`（`app.css` L179）。

正文：`body { font: … 13px/1.4 …; background: var(--bg); display: flex; flex-direction: column; overflow: hidden }`。

---

## 2. Design tokens（真实 CSS 变量）

源：`assets/app.css` `:root`（L2–43）与暗色块（L44–91）。**theme.js 不定义色值**，只在启动时设 `document.documentElement.dataset.theme` / `--zoom`。

### 2.1 浅色（默认 `:root`）

| Token | 值 |
|-------|-----|
| `--bg` | `#f4f4f6` |
| `--card` | `#ffffff` |
| `--card-2` | `#f9f9fb` |
| `--pill` | `#f1f1f4` |
| `--pill-hover` | `#e9e9ee` |
| `--seg-track` | `#e6e6eb` |
| `--seg-thumb` | `var(--card)` |
| `--seg-edge` | `0 1px 2px rgba(0,0,0,.14), 0 0 0 .5px rgba(0,0,0,.08)` |
| `--ctl-fg` | `#63636b` |
| `--line` | `#e3e3e8` |
| `--line-2` | `#ececf0` |
| `--fg` | `#1c1c21` |
| `--fg-2` | `#4b4b53` |
| `--muted` | `#85858d` |
| `--faint` | `#b9b9c2` |
| `--accent` | `#4f46e5` |
| `--accent-soft` | `#eeedfd` |
| `--accent-fg` | `#ffffff` |
| `--sel` | `#ecebfb` |
| `--green` / soft | `#189a58` / `#e4f6ec` |
| `--red` / soft | `#d64545` / `#fbe9e9` |
| `--amber` / soft | `#b45309` / `#fbf0df` |
| `--drift` / soft | `#ce2c31` / `#feebec` |
| `--font` | `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif` |
| `--code` | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` |
| `--ease` | `cubic-bezier(.2, .8, .2, 1)`（约 L3219） |

Windows：`:root.win` 改用 Segoe UI Variable Text + Microsoft YaHei UI。

### 2.2 暗色（`data-theme="dark"` 或 `prefers-color-scheme: dark` 且非 light）

| Token | 值 |
|-------|-----|
| `--bg` | `#1a1a1e` |
| `--card` | `#232327` |
| `--accent` | `#a5b4fc` |
| `--accent-soft` | `#2b2c47` |
| `--accent-fg` | `#14142a` |
| `--fg` | `#ededf1` |
| `--line` | `#333339` |
| … | 见 `app.css` L80–91 |

侧栏选中态刻意 **不用 accent**：graphite 白卡 + `box-shadow: var(--seg-edge)`（见 §5）。

---

## 3. 侧栏信息架构

### 3.1 导航 DOM（`index.html` `#nav`）

> **实机默认 IA（2026-10-14 官方截图）：** Sessions / Library 带 `data-feature`，插件默认关闭时**不出现在侧栏**。Work 下仅 Agents。拆解表列出 HTML 全量项；验收以截图为准。

分组与项（`data-t` 英文 key → `i18n.js` zh）：

| 分组 EN / ZH | 项 `data-view` | 标签 EN → ZH |
|--------------|----------------|--------------|
| Work → **使用** | `agents` | Agents → **Agent** |
| | `sessions` | Sessions → **会话** |
| | `library` | Library → **资源库** |
| Models → **模型** | `providers` | Providers → **供应商** |
| | `routing` | Routing → **路由** |
| | `gateway` | Gateway → **网关** |
| Insights → **观测** | `usage` | Usage → **用量** |
| Extend → **扩展** | `plugins` | Plugins → **插件** |

页脚：`#prefs` → Settings → **设置**；可选 `#sideGw.side-gw`（网关状态条）。

图标：每项内联 SVG，`class="nav-ic"`，20×20 viewBox，描边 `currentColor` stroke-width 1.6。

### 3.2 侧栏选中 / hover（`app.css`）

```css
body.side-nav :is(#nav button[data-view], #prefs).on {
  background: var(--card); color: var(--fg);
  box-shadow: var(--seg-edge); font-weight: 500;
}
body.side-nav :is(#nav button[data-view], #prefs):hover:not(.on) {
  background: var(--pill); color: var(--fg);
}
/* graphite：选中图标跟文字同色，不用 accent */
body.side-nav :is(#nav button.on .nav-ic, #prefs.on svg) { color: var(--fg); }
```

行高：`height: 30px; border-radius: 7px; font-size: 13px; gap: 9px`。

分组 `.nav-gl`：`font-size: 11px; font-weight: 500; letter-spacing: .04em; color: var(--muted)`。

### 3.3 Brand 位置

- HTML 初始：`.brand` 在 `header.top`（鸟 SVG +「magpie」）。
- `app.js` `layoutNav`：侧栏开启时把 brand **搬进** `.side-top`（约 L24697：`side.querySelector(".side-top").append(brand)`）。

---

## 4. 主舞台各页（壳层）

### 4.1 Agents `#view-agents`

- 列表 `#agents` → `.row.agent`（handle logo + `.who .name` + `.fields` 内 `.field` pill）。
- 底部 `.profiles`：方案 chips +「＋ 保存当前」（i18n：Profiles → 方案，＋ Save current → ＋ 保存当前）。

### 4.2 Providers `#view-providers`

- 搜索、开启列表、`offHead`「已关闭的供应商」、`＋ 添加供应商`。
- 行 DOM 由 `app.js` 动态拼装（非简单 flex patch）。

### 4.3 Routing 舞台（硬核）

**静态壳**（`index.html`）：

```html
<main id="view-routing">
  <div class="row-head">… Routing · live note · 新建组 · 账号打码</div>
  <section class="rt" id="rt"></section>   <!-- JS 填 -->
  <div class="rt-more" id="rtMore"></div>
</main>
```

**JS 装配**（`routing.js` L26–110）——舞台内真实三栏：

```
.rt
  .rt-main
    .rt-top (.rt-what + .rt-mode)
    .rt-replay (回放条，默认可 hidden)
    .rt-stage
      svg.rt-wires          ← 连线（stroke 1.5；.live 虚线流动）
      .rt-srcs              ← 左：Agent 节点 .rt-node.rt-src
      .rt-node.rt-hub       ← 中：鸟 + "magpie" + small(URL|「网关」) + i chip
      ol.rt-accts           ← 右：账号/供应商行
      svg.rt-sky            ← 飞鸟 .rt-flier + 请求点 .pkt（在节点之上）
    .rt-foot (.rt-cap + .rt-stats: requests / rerouted / errors…)
    .rt-log + .rt-steps     ← 当前请求步骤日志
    .rt-off
  .rt-ctx                   ← 上下文窗口折叠
```

**舞台 grid**（`routing.css` L11）：

```css
.rt-stage {
  display: grid;
  grid-template-columns: 124px 124px minmax(0, 1fr);
  column-gap: 56px;
  align-items: center;
  padding: 22px 2px;
}
.rt { border-radius: 14px; padding: 14px 16px 12px; background: var(--card); border: 1px solid var(--line); }
```

**节点**：

- `.rt-node`：`border-radius: 12px; padding: 12px 8px 10px; border: 1px solid var(--line)`
- `.rt-hub`：`border-color: var(--fg); box-shadow: 0 0 0 4px var(--card-2)`；chip `background: var(--fg); color: var(--card)`
- `.rt-src b::before`：7px 圆点 `background: var(--agent)`
- `.rt-accts li`：三列 grid `10px minmax(0,1fr) auto`；`.on` 时 `border-color: var(--fg)` + `.dot` 实心脉冲

**飞鸟**：`.rt-flier .wing` → `@keyframes rtflap` 0.42s；请求/回包 `.pkt` / `.pkt.back` / `.pkt.back.err`。

**页头注记** i18n：`live, as the gateway decides` → **实时 · 网关正在做的决定**。

**策略文案**（Settings/路由模式，i18n）：Smart→智能，In order→**按顺序**，By weight→**按权重**。

**Hub 副标题**：`hubSub` = gateway URL（去协议）或 `t("gateway")` → **网关**（`routing.js` `hubText`）。

### 4.4 其他页

Usage / Sessions / Library / Plugins / Gateway / Settings：各自完整 DOM 在 `index.html` + `app.js` / `plugins.js` / `context.js`；壳验收至少要求同 token、有结构，不能假 PASS。

---

## 5. 关键交互

| 交互 | 行为 | 源 |
|------|------|-----|
| 侧栏选中 | 白卡 + seg-edge，非 accent | `app.css` 上引 |
| 侧栏拖宽 | `#sideEdge` col-resize，`sideDrag` | `app.js` |
| 子页 tabs | `.nav-sub` + 滑动 `.nav-hl`（0.3s cubic-bezier） | `app.css` / `navSubGlide` |
| 页切换动画 | `body.side-nav .view { animation-name: fade-in }` | `app.css` |
| View Transition | `.nav-morph` 给 brand/各 nav 项命名 | `app.css` L449+ |
| Routing 连线 | `.rt-wires path.live` → `rtflow` 0.7s | `routing.css` |
| 飞鸟 | `.rt-sky` + flap / path follow | `routing.js` + `routing.css` |
| 托盘高度 glide | Go `Glide{MS, Curve}`，默认 ease，最长 2000ms | `glide.go`（**托盘 panel**，非主窗飞鸟） |
| 账号打码 | `#rtMask` aria-pressed | Routing 页头 |
| focus-visible | `outline: 2px solid var(--accent)` | `app.css` |

---

## 6. 关键源文件索引

| 文件 | 用途 |
|------|------|
| `assets/index.html` | 壳 DOM、侧栏、各 view 骨架 |
| `assets/app.css` | tokens、侧栏、顶栏、通用控件 |
| `assets/routing.css` | Routing 舞台 / 飞鸟 / 账号行 |
| `assets/routing.js` | 舞台装配、连线、飞鸟、日志 |
| `assets/theme.js` | 仅 theme/zoom boot，无色板 |
| `assets/layout.js` | `body.window|panel`、`mac|linux`、`html.win` |
| `assets/i18n.js` | zh 文案（首个 locale 块） |
| `assets/app.js` | `layoutNav`、侧栏拖宽、Agent/Provider 渲染 |
| `window_rule.go` / `textsize.go` | 660×600 / 560×420 |
| `lightweight.go` / `mainwindow.go` | 建窗、Mac titlebar |
| `glide.go` | 托盘高度动画曲线 |

---

*本文只记录 Magpie 源事实；与 demo 对照见 `GAP-MATRIX.md`。*
