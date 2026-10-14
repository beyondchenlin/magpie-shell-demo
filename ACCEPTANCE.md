# Magpie Shell Demo — 验收清单（对照官方 **Linux 原生窗**）

> **桌面 1:1 金标 = 原生顶栏标签，不是 web 左侧栏。**  
> 证据：[`interactions/native-linux/shots/`](./interactions/native-linux/shots/) · [`NATIVE-CHROME.md`](./interactions/native-linux/NATIVE-CHROME.md)  
> 当前总判定：**`NATIVE_CHROME_PARTIAL`** — 外壳已改为顶栏；Agents/Providers/Routing 既有交互在顶栏下保留；Gateway/Usage/Plugins/Settings 仍为壳级。  
> **不是**全应用 PASS。  
> 交互计划：[`INTERACTION-PLAN.md`](./INTERACTION-PLAN.md)

对照基准：
- **桌面金标**：官方 Linux 原生窗截图 `interactions/native-linux/shots/N-00…N-09`
- ~~web 侧栏截图~~：仅作宽窗/web 布局参考，**不作**桌面 exe 验收金标
- 源码：`magpie` `internal/gui/assets/`（`body.window` 无 `side-nav` = 顶栏）

图例：`[x]` 自检通过 · `[~]` 有意简化 · `[ ]` 未过 / 未做

---

## A. 外壳 / IA（原生顶栏）

| # | 项 | 状态 |
|---|----|------|
| A1 | 无左侧栏、无 Work/Models 分组、无面包屑 | [x] |
| A2 | 顶栏标签 Agents / Providers / Routing / Gateway / Usage / Plugins | [x] |
| A3 | 右侧 refresh + gear + Linux close | [x] |
| A4 | 窗默认 ≈712×652（web 预览框 / Electron） | [x] |
| A5 | Settings = 原地视图 + 横向 set-tabs | [x] |
| A6 | web side-nav 标为错误桌面目标 | [x] | 见 NATIVE-CHROME.md |

## B–D. 页内交互（顶栏下保留）

| # | 项 | 状态 |
|---|----|------|
| B | Agents 空态 + 已接线交互 | [x] | 对照仍可参考 web 录制；chrome 以 N-00 为准 |
| C | Providers 空目录 + 部分交互 | [x] |
| D | Routing 空态交互 | [x] |

## E. 其它页

| # | 项 | 状态 |
|---|----|------|
| E1 | Gateway | [~] | 空态壳；交互未完录 |
| E2 | Usage | [~] | Overview 空态文案 |
| E3 | Plugins | [~] | Discover 壳 |
| E4 | Settings 全部分页内容 | [~] | 横签齐；General 部分行；其余占位 |

## F. 交付

| # | 项 | 状态 |
|---|----|------|
| F1 | Windows Setup `.exe` | [ ] | v0.1.6（GHA 构建中） |
| F2 | Vercel Web | [x] | https://magpie-shell-demo.vercel.app |

---

*诚实原则：顶栏外壳对齐原生 ≠ 全应用交互 1:1。判定 `NATIVE_CHROME_PARTIAL`。*
