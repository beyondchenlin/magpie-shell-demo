# Magpie 壳验收清单（ACCEPTANCE）

> 每条必须能指回 Magpie **源文件 + 选择器/token**。  
> 状态只允许：`[ ]` 未做 / `[~]` 部分且写明差距 / `[x]` 已对照源事实通过。  
> **禁止无源事实的 PASS。** 拆解见 `MAGPIE-TEARDOWN.md`，差距见 `GAP-MATRIX.md`。

**对照树：** [yetone/magpie](https://github.com/yetone/magpie) → 本地 `/workspace/magpie-src/internal/gui/`  
**Demo：** `/workspace/magpie-shell-demo/`  
**自检日期：** 2026-10-14（源码拆解后重写；**撤销**此前虚假 `[x]` / `PASS_WITH_GAPS`）  
**总判定：** `FAIL_NOT_1TO1`（用户反馈 + 矩阵 P0 未清）

---

## 0. 方法

- [x] 先读 Magpie 源再改验收（本轮产出 `MAGPIE-TEARDOWN.md` / `GAP-MATRIX.md`）
- [ ] 并排对照：本 Demo 与 Magpie 实机/截图，同字号同窗宽（660）
- [ ] 样式以 `app.css` + `routing.css` 同名 class 为准；`shell-patch.css` 仅允许 React 根布局修补，**不得**改写选中色/舞台比例冒充 1:1

---

## 1. Design tokens — `assets/app.css` `:root`

| 检查项 | Magpie 事实 | Demo 状态 |
|--------|-------------|-----------|
| `--bg` `#f4f4f6` | `app.css` L3 | [x] 已拷贝 `src/styles/app.css` |
| `--card` `#ffffff` | L4 | [x] |
| `--card-2` `#f9f9fb` | L5 | [x] |
| `--pill` `#f1f1f4` | L6 | [x] |
| `--line` `#e3e3e8` | L16 | [x] |
| `--fg` `#1c1c21` | L18 | [x] |
| `--fg-2` `#4b4b53` | L19 | [x] |
| `--muted` `#85858d` | L20 | [x] |
| `--accent` `#4f46e5` | L22 | [x] |
| `--accent-soft` `#eeedfd` | L23 | [x] |
| `--seg-edge` 双层阴影 | L12 | [x] |
| 正文 `13px/1.4` + `--font` | L115–116 | [x] |
| 暗色 `--bg #1a1a1e` / `--accent #a5b4fc` | L80–84 | [x] 设置页可切 `data-theme` |
| `theme.js` 只设 dataset/zoom，不定义色 | `theme.js` | [x] Demo 用 React 设 `data-theme`（等价） |

---

## 2. 窗口与总布局

| 检查项 | Magpie 事实 | Demo 状态 |
|--------|-------------|-----------|
| 默认 **660×600** | `window_rule.go` `windowW,windowH` | [~] Electron `main.cjs` 已 660×600；**Web `shell-patch` 改为 max 1100×760** → 非 1:1 |
| 最小 **560×420** | `textsize.go` `windowMinW/H` | [x] Electron min 已设 |
| `body` flex 列 + `overflow:hidden` + `--bg` | `app.css` L115–121 | [x] `#root` 模拟 |
| `body.side-nav` `--side-w: 212px`（≤859→184） | `app.css` L326–327 | [x] class 已加 |
| `.top` height **46px** | `app.css` L179 | [x] |
| Brand 在侧栏态于 **`.side-top`** | `app.js` `layoutNav` ≈L24697 | [ ] Brand 在 `.side-scroll` + DEMO 徽章（P0） |
| Windows 主窗系统标题栏、页内 brand 隐藏 | `app.css` L184；`titlebar_other.go` | [~] Electron 有系统栏；Web 仍显示 brand（可接受） |
| 托盘 panel 圆角 12 / glide | `app.go` / `glide.go` | [ ] 划出 Demo 范围（P2） |

---

## 3. 侧栏 IA — `index.html` `#nav` + `i18n.js` zh

| 检查项 | Magpie 事实 | Demo 状态 |
|--------|-------------|-----------|
| 分组：使用/模型/观测/扩展 | Work/Models/Insights/Extend → zh | [x] `src/data/mock.ts` |
| 顺序：Agent→会话→资源库→供应商→路由→网关→用量→插件 | `index.html` L48–59 | [x] |
| 标签 zh：Agent/会话/资源库/供应商/路由/网关/用量/插件/设置 | `i18n.js` zh | [x] |
| 选中：`background: var(--card); box-shadow: var(--seg-edge)` **非 accent** | `app.css` L372 | [~] CSS 已有；`shell-patch` 有加固，需目视确认无 accent 泄漏 |
| 行高 30px / radius 7px / `.nav-gl` 11px | `app.css` L363–370 | [x] 吃上游 CSS |
| `#prefs` + `.side-l`「设置」在 `.side-foot` | `index.html` / layoutNav | [x] |
| `#sideGw.side-gw` | `index.html` L30 | [ ] 未做（P1） |
| `#sideEdge` 可拖宽 | `app.js` sideDrag | [~] 仅视觉（P1） |
| 图标为 Magpie 同款 stroke SVG | `index.html` nav-ic | [~] `NavIcons.tsx` 近似，未逐 path 比对 |

---

## 4. 顶栏 — `header.top`

| 检查项 | Magpie 事实 | Demo 状态 |
|--------|-------------|-----------|
| 侧栏态导航在侧栏，顶栏保留 actions | layoutNav | [~] 有 sync；缺 update/open/winclose |
| `#crumb` 默认 hidden，由 JS 控制 | `index.html` L41 附近 | [ ] `shell-patch` 强制 `display:flex !important`（P1） |
| 无巨大色块标题 | 整体 `--bg` | [x] |

---

## 5. Agents — `#view-agents`

| 检查项 | Magpie 事实 | Demo 状态 |
|--------|-------------|-----------|
| `.row.agent` + `.ag-handle` + `.fields` `.field` | `app.css` / `app.js` | [~] 结构有；无真实 pop |
| `.profiles` +「方案」+「＋ 保存当前」 | i18n Profiles / ＋ Save current | [x] 文案对 |
| Mock ≥3 Agent | — | [x] |

---

## 6. Providers — `#view-providers`

| 检查项 | Magpie 事实 | Demo 状态 |
|--------|-------------|-----------|
| 搜索 placeholder「查找供应商」 | i18n `Find a provider` | [x] |
| 「＋ 添加供应商」 | i18n | [~] 需确认按钮在页内 |
| 「已关闭的供应商」折叠 | i18n `Turned off` | [~] 有折叠逻辑 |
| 行 DOM = Magpie provider 行 | `app.js` 渲染 | [ ] `shell-patch` 自造 flex 行（P1） |

---

## 7. Routing 舞台 — **1:1 硬核**

源：`routing.css` + `routing.js` + `index.html` `#view-routing`。

| 检查项 | Magpie 事实 | Demo 状态 |
|--------|-------------|-----------|
| 页头：路由 + `.rt-livedot` +「实时 · 网关正在做的决定」 | i18n `live, as the gateway decides` | [x] 文案 |
| 「新建组」「账号打码」 | i18n New group / Hide accounts | [x] 按钮在；新建无实操可 `[~]` |
| `.rt` radius **14px**，padding 14/16 | `routing.css` L6 | [x] 吃 CSS |
| `.rt-stage` **`124px 124px minmax(0,1fr)`** gap **56px** | L11 | [x] class；但 Web 画布过宽导致观感≠660 窗 |
| 三列：`.rt-srcs` → `.rt-hub` → `.rt-accts` | `routing.js` L34–47 | [~] 有三列；缺 sky |
| Hub：鸟 + `magpie` + small(URL\|\|「网关」) + chip | `hubText`；i18n `gateway` | [ ] small=「本地网关」；chip=`live`（P0） |
| `svg.rt-wires` + `.live` 虚线流动 | `routing.css` L12–15 | [~] 有 wires/live；曲线自拟 |
| **`svg.rt-sky` + `.rt-flier` 飞鸟** | L19–38；`routing.js` FLIER | [ ] **未实现（P0）** |
| 账号行 `.dot` / `.bar` / `.on`→`border-color: var(--fg)` | `routing.css` L54–91 | [ ] inline 圆点 + patch 改 on 色（P0） |
| `.rt-foot` 统计：请求 / 改道 / Agent 收到的错误 | i18n requests / rerouted / errors your agent saw | [x] 文案 |
| `.rt-log` / `#rtMore` | `routing.js` / `index.html` | [ ] 缺失（P0） |
| 策略：智能 / **按顺序** / 按权重 | i18n Smart / In order / By weight | [ ] UI 写「顺序」（P0） |

---

## 8. 其他页（可简化，不可假 PASS）

| 页 | Magpie 锚点 | Demo 状态 |
|----|-------------|-----------|
| Gateway `#view-gateway` | `index.html` 大块设置+状态 | [~] 占位卡，非上游 DOM |
| Usage `#view-usage` | segs + lists | [~] 骨架占位 |
| Plugins | `plugins.js` | [~] 占位 |
| Sessions / Library | 各 view | [~] 占位 |
| Settings | `#view-settings` tabs | [~] 仅主题切换 |

---

## 9. 关键交互

| 检查项 | Magpie 事实 | Demo 状态 |
|--------|-------------|-----------|
| 侧栏切 view，`.on` graphite | `app.css` L372 | [x] |
| 点 Agent/账号高亮对应 wire | routing 交互 | [~] 有；无飞鸟联动 |
| 账号打码 `aria-pressed` | Routing 页头 | [x] |
| `:focus-visible` accent 描边 | `app.css` L147 | [x] 吃 CSS |
| 页切换 fade-in | `body.side-nav .view` | [~] React 换挂载，非 Magpie hidden 切换 |

---

## 10. 明确不在本 Demo 功能范围（仍须在 UI 标 Demo）

- 真实 Agent 扫描 / 写配置  
- 真实 gateway trace（**可用 mock 轨迹做飞鸟**）  
- Sessions/Library/Plugins 内核  
- Wails 托盘 / Mac traffic lights 嵌入 / `glide.go` 托盘高度  
- 与官方安装器一致  

---

## 11. 交付物

| 项 | 状态 |
|----|------|
| 仓库含本清单 + `MAGPIE-TEARDOWN.md` + `GAP-MATRIX.md` | [x] 本轮 |
| Web 预览 | [~] 有；比例未按 660×600 |
| Windows `.exe` | [x] Release v0.1.0（壳版本；**视觉未 1:1**） |
| Linux AppImage | [x] 有；同视觉差距 |
| README 注明非官方 / 非 1:1 完成 | [ ] 应改为诚实表述 |

---

## 12. 汇总（诚实）

| 区块 | 状态 | 说明 |
|------|------|------|
| Tokens | [x] | 文件级拷贝上游 |
| 窗口 660×600 | [~] | Electron OK；Web patch 破坏比例 |
| 侧栏 IA/文案 | [x] | 顺序与 zh 正确；brand 位置错 |
| Agents | [~] | 形似 |
| Providers | [~]/[ ] | patch 行 ≠ Magpie DOM |
| **Routing 舞台** | **[ ]** | **缺飞鸟/sky/log；Hub/策略/账号行文案与 DOM 偏离** |
| 其他页 | [~] | 占位 |
| 安装包 | [x] | 有 exe；不代表视觉 PASS |

**总判定：`FAIL_NOT_1TO1`**

闭环前勿再写 `PASS` / `PASS_WITH_GAPS`。优先执行 `GAP-MATRIX.md` Top 5 P0。
