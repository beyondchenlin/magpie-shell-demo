# Magpie 壳 1:1 视觉验收标准（ACCEPTANCE）

对照上游：[yetone/magpie](https://github.com/yetone/magpie) `internal/gui/assets/`（`index.html` / `app.css` / `routing.css` / `routing.js` / `i18n.js`）与 `internal/gui/window_rule.go`、`textsize.go`、`lightweight.go`。

**规则：** 交付前每一项必须勾选 `[x]`，或标 `[~]` 并写明差距与原因。禁止无清单交差。本仓库 Demo 只复刻 **桌面主窗口外观与关键交互**（假数据），不复刻网关/真实 Agent 探测。

**自检日期：** 2026-10-14  
**自检人：** Grok Bot（executor）  
**交付物：** Web 预览 + Windows NSIS/portable `.exe` + Linux AppImage

---

## 0. 方法与证据

- [ ] 样式以 Magpie `app.css` + `routing.css` 为基准（MIT，保留版权说明），React 输出 **同名 class**，禁止另起一套 Tailwind「看起来像」的皮肤。
- [ ] 中文文案对照 `i18n.js` 的 `zh` 表（见 §6），不得随意意译导航名。
- [ ] 验收时并排：本 Demo 与 Magpie 截图/实机（或 README 内嵌对照），分辨率与字号接近。

---

## 1. Design tokens（`app.css` `:root`）

| Token | Magpie 值 | 验收 |
|-------|-----------|------|
| `--bg` | `#f4f4f6` | [ ] |
| `--card` | `#ffffff` | [ ] |
| `--card-2` | `#f9f9fb` | [ ] |
| `--pill` | `#f1f1f4` | [ ] |
| `--line` | `#e3e3e8` | [ ] |
| `--fg` | `#1c1c21` | [ ] |
| `--fg-2` | `#4b4b53` | [ ] |
| `--muted` | `#85858d` | [ ] |
| `--accent` | `#4f46e5` | [ ] |
| `--accent-soft` | `#eeedfd` | [ ] |
| 正文字号/行高 | `13px/1.4`，系统字体栈 | [ ] |
| 暗色主题 | `data-theme="dark"` 或 `prefers-color-scheme` 与 Magpie 同色板 | [ ] |

---

## 2. 窗口与总布局

来源：`window_rule.go` `windowW,windowH = 660,600`；`textsize.go` `windowMinW,windowMinH = 560,420`；`app.css` `body.side-nav { --side-w: 212px }`；`.top { height: 46px }`。

- [ ] 默认打开尺寸约 **660×600**（桌面壳）；Web 预览可用同比例画布或 `min-width` 模拟。
- [ ] 最小约 **560×420**（桌面壳 MinWidth/MinHeight）。
- [ ] `body`：`flex` 纵向、`overflow: hidden`、背景 `--bg`。
- [ ] 常开侧栏模式：`body.side-nav`，左侧 `--side-w: 212px`（窄屏 ≤859px 可 184px）。
- [ ] 顶栏 `.top` 高度 **46px**，含 brand / 面包屑或标题 / 右侧 actions。
- [ ] 主区 `.view`：可滚动，padding 与 Magpie 一致量级（约 `0 12px`）。

---

## 3. 侧栏（Sidebar）

来源：`index.html` `#side` / `#nav`；`app.css` `.sidebar`、`body.side-nav …`。

- [ ] 固定左侧：`position: fixed; left:0; top:0; bottom:0`，背景 `--bg`，右边框 `.5px solid var(--line)`。
- [ ] 分组标签 `.nav-gl`（字号 ~11px、字距、颜色 `--muted`）：**使用 / 模型 / 观测 / 扩展**（en: Work / Models / Insights / Extend）。
- [ ] 导航项（图标 + 中文标签），当前项 `.on`：白卡片底 + 轻阴影 `seg-edge`，**非**靛紫高亮（Magpie graphite 侧栏）。
- [ ] 项列表与顺序：
  - 使用：Agent、会话、资源库
  - 模型：供应商、路由、网关
  - 观测：用量
  - 扩展：插件
- [ ] 底部 **设置**（`#prefs` / Settings）。
- [ ] 可选：侧栏底「网关」状态条 `.side-gw`（可 mock）。
- [ ] 侧栏可拖宽边 `.side-edge`（可 `[~]` 若仅视觉保留分隔）。

---

## 4. 顶栏（Header）

- [ ] 左侧 brand：magpie 鸟 SVG + 文案 `magpie`（或 Demo 注明「Magpie 壳 Demo」但不破坏布局）。
- [ ] 侧栏模式下顶栏导航收进侧栏；顶栏保留刷新/设置/关闭等 icon 按钮风格（圆角、hover `--pill`）。
- [ ] 无巨大色块标题；整体安静灰底。

---

## 5. Agent 页（`#view-agents`）

来源：`app.js` `renderAgents` → `.row.agent`；`app.css` `.row` / `.fields` / `.field`。

- [ ] 列表为白底圆角卡片行（`.row`），非大色块卡片墙。
- [ ] 行结构：左侧 logo handle（`.ag-handle`）+ 名称 `.name` + 右侧 `.fields` 控件格。
- [ ] 模型选择控件外观为 `.field` pill（非 Ant Design Select）。
- [ ] 底部 **方案** 区：`.profiles` + `＋ 保存当前`。
- [ ] Mock ≥3 个常见 Agent（如 Claude Code、Codex、Cursor），带真实感图标。
- [ ] 空态文案可用中文：「没有找到 Agent」类（若列表非空可跳过）。

---

## 6. 中文文案（`i18n.js` zh）

必须与上游一致（节选）：

| EN | ZH | 验收 |
|----|-----|------|
| Agents | Agent | [ ] |
| Sessions | 会话 | [ ] |
| Library | 资源库 | [ ] |
| Providers | 供应商 | [ ] |
| Routing | 路由 | [ ] |
| Gateway | 网关 | [ ] |
| Usage | 用量 | [ ] |
| Plugins | 插件 | [ ] |
| Settings | 设置 | [ ] |
| Work | 使用 | [ ] |
| Models | 模型 | [ ] |
| Insights | 观测 | [ ] |
| Extend | 扩展 | [ ] |
| Profiles | 方案 | [ ] |
| ＋ Add provider | ＋ 添加供应商 | [ ] |
| ＋ Save current | ＋ 保存当前 | [ ] |
| Turned off | 已关闭的供应商 | [ ] |
| Hide accounts | 账号打码 | [ ] |
| New group | 新建组 | [ ] |
| live, as the gateway decides | 实时 · 网关正在做的决定 | [ ] |
| Find a provider | 查找供应商 | [ ] |
| requests / rerouted | 请求 / 改道 | [ ] |

---

## 7. 供应商页（`#view-providers`）

- [ ] 搜索框风格 `.sess-filter` / `.pv-q`（「查找供应商」）。
- [ ] Provider 列表行与 Agent 行同族视觉（白卡、细线、13px）。
- [ ] `＋ 添加供应商` 文本按钮。
- [ ] 「已关闭的供应商」可折叠区（可 mock 空/有数）。
- [ ] 启用态与关闭态区分清晰（opacity / 分区），无大红大绿按钮墙。

---

## 8. 路由舞台（`#view-routing` + `routing.css` / `routing.js`）

**硬性 1:1 重点。**

- [ ] 页头：`路由` + 绿点 `.rt-livedot` + 注记「实时 · 网关正在做的决定」+「新建组」「账号打码」。
- [ ] 舞台容器 `.rt`：白卡、`border-radius: 14px`、内边距约 14–16px。
- [ ] `.rt-stage` grid：**`124px 124px minmax(0,1fr)`**，`column-gap: 56px`。
- [ ] 三列语义：**Agent 源（`.rt-srcs`）→ Hub（`.rt-node.rt-hub`）→ 账号/供应商列表（`.rt-accts`）**。
- [ ] Hub：鸟标 + `magpie` + 状态 chip；边框用 `--fg`，外圈 `box-shadow: 0 0 0 4px var(--card-2)`。
- [ ] SVG 连线层 `.rt-wires`（Agent→Hub→Accounts）；至少静态线，优先虚线流动 `.live`。
- [ ] 账号行：`li` 网格，含 logo、名称、状态 pill。
- [ ] 底部统计：请求 / 改道 / Agent 收到的错误（数字 mock）。
- [ ] 舞台下方可有请求历史列表区（可简化，但 class/层级不跑偏）。
- [ ] **策略/模式说明** `.rt-what` / `.rt-mode` 有可读中文（mock 策略切换可点则加分）。

---

## 9. 网关 / 用量 / 插件 / 设置（可简化但不可缺席）

- [ ] 网关页：本地 OpenAI 兼容入口说明、端口/状态 mock，视觉同 tokens。
- [ ] 用量页：有分段控件 `.segs` 与列表骨架，不为空白 404。
- [ ] 插件页：占位列表即可。
- [ ] 设置页：主题（浅/深/跟随）、语言固定中文说明即可。

---

## 10. 关键交互（外观层）

- [ ] 侧栏点击切换 view，当前项 `.on`，其余隐藏（`hidden` 或等价）。
- [ ] Agent 行 hover：左侧 grip 点阵显现（若复用 Magpie CSS `#agents > .row .ag-handle::before`）。
- [ ] Provider 行 hover 显示操作区（或菜单入口），不永久堆满按钮。
- [ ] 路由：点击某一 Agent 源或账号行，高亮对应连线 / 行（`.on`）。
- [ ] 「账号打码」切换：账号文字模糊/掩码（`aria-pressed`）。
- [ ] 键盘：侧栏/按钮 `:focus-visible` 为 accent 描边（吃 Magpie CSS）。
- [ ] 无页面级路由花活导致整页白闪；切换用 Magpie 式 fade 即可。

---

## 11. 明确不在本 Demo 范围（标差距用）

以下 **不要求** 1:1 功能，但若 UI 占位需注明「Demo」：

- 真实本机 Agent 扫描 / 写回配置
- 真实网关 trace / 飞鸟动画完整时序
- Sessions / Library 插件内核
- Wails 托盘 / macOS traffic lights 嵌入
- Go 后端、installer 与 Magpie 安装器一致

---

## 12. 交付物

- [ ] 源码仓库：`beyondchenlin/magpie-shell-demo`（或约定名），含本 `ACCEPTANCE.md`。
- [ ] Web 预览 URL（Vercel 或静态托管）。
- [ ] 可安装产物路径写在 README（AppImage / `.deb` / 平台包）；若 box 缺 `webkit2gtk` 导致 Tauri 失败，必须写明 blocker，并提供次优安装方式（如 Electron 包或仅 Web）。
- [ ] `/workspace` 下有可拷贝安装包或 `dist/`。
- [ ] README 写清：如何在用户机器安装/打开；注明「视觉壳 Demo，非官方 Magpie」。

---

## 13. 交付前自检汇总（2026-10-14）

| 区块 | 状态 | 差距说明 |
|------|------|----------|
| Tokens | [x] | 直接复用 Magpie `app.css` `:root` |
| 窗口/布局 | [x] | Electron 默认 660×600、最小 560×420；Web 预览为圆角画布模拟 |
| 侧栏 | [x] | 分组/顺序/中文与 Magpie 一致；选中为 graphite 白卡 |
| Agent 页 | [x] | `.row.agent` + `.field` + 方案区；effort 侧栏在宽屏同行、窄屏换行依 Magpie media |
| 供应商页 | [x] | 搜索/开启关闭/已关闭折叠/添加；行布局有少量 shell-patch（非 100% Magpie provider DOM） |
| 路由舞台 | [x] | `.rt-stage` 124/124/1fr、Hub、SVG wires、live 虚线、统计中文；飞鸟 sky 动画未做 |
| 中文文案 | [x] | 导航与关键句对照 i18n.js zh |
| 关键交互 | [x] | 切页、策略、打码、点选高亮连线；侧栏拖宽仅视觉 edge |
| 安装包 | [~] | **AppImage 已交付**；`.deb` 因 builder 元数据未再打；**Tauri 因 box 缺 webkit2gtk+无 sudo 未编** |

截图：`acceptance-shots/02-*.png`

**总判定：** `PASS_WITH_GAPS`

关键项（Tokens + 侧栏 + 路由舞台 + 中文导航）已过；差距：无 Tauri 包、无完整飞鸟动画、Sessions/Library/Usage 为占位、供应商行 DOM 未逐像素对齐 Magpie `app.js`。

