# Magpie 壳交互 1:1 计划

## 目的

外观 + 交互 + 动效 1:1。静态空态像 ≠ 交互 1:1。

## 方法

| 角色 | 来源 |
|------|------|
| 对照物 | 本机官方 Magpie web：`http://127.0.0.1:17890/?k=magpie-shell-review-key1`（挂了则 `magpie web` 重启）+ 源码 `/workspace/magpie-src/internal/gui/assets/` |
| 记录物 | 每控件一条 Interaction Spec（下表模板） |
| 实现物 | `magpie-shell-demo` 按 Spec 回写，逐条验收 |

## Spec 模板（必须用）

| id | 页面 | 控件文案/选择器 | 操作 | 前态截图 | 后态截图 | 动效(CSS/时长) | DOM/class变化 | 源码位置 | demo状态 |
|----|------|-----------------|------|----------|----------|----------------|---------------|----------|----------|

`demo状态`：`未录` / `已录` / `已实现` / `已对照` / `跳过(说明)`。

## 阶段

| 阶段 | 内容 | 出口 |
|------|------|------|
| **P0** | 本计划 + `interactions/` 目录 | 文件就位、总判定诚实 |
| **P1** | 控件清单：按导航树列全部可点目标 | 每页有 `CONTROLS.md` checklist |
| **P2** | 逐页录制：点击前→后→过渡（截图序列 + CSS transition/animation 名与时长 + DOM class + modal/popover） | 每页 `SPEC.md` + `shots/` |
| **P3** | 按 Spec 实现 demo 交互（无后端用 mock 状态机；动效时长/曲线对齐源码） | Spec 行 `已实现` |
| **P4** | 回归：同一点击路径官方 vs demo 对照 | Spec 行 `已对照`；总判定更新 |

## 页面优先级

1. **Agents（首页）** 及页内每个按钮  
2. **Providers**（搜索、Import、各 vendor tile、Custom）  
3. **Routing**（Hide accounts、演示/live、舞台元素）  
4. **Gateway**  
5. **Usage** 及 Overview / Requests / Sessions / Context  
6. **Plugins** 及 Built-in / Discover / Installed  
7. **Settings** 全部分页  
8. **侧栏本身**（选中态、分组、Gateway 状态行）

Sessions / Library：仅在 Plugins → Built-in 打开后出现时再录。

## 规则

1. **一页未录完，不宣称该页 1:1。**  
2. 无后端流程用 mock 状态机复现 UI 反馈；**动效时长/曲线必须对齐源码**（见 `app.css` / `app.js` 的 `UNROLL`/`ROLLUP`/`nav-hl`/`view-transition` 等）。  
3. 录制顺序：先空态可见控件，再点开后出现的二级（modal / fold / popover）。  
4. 侧栏控件在第 8 页集中验收；各页 Spec 可引用 `S-*` id，避免重复实现。  
5. 本任务只做计划 + Agents 清单；**不改 UI**。

## 目录

见 [`interactions/README.md`](./interactions/README.md)。

## 当前进度（2026-10-14 19:14 CST）

- P0：本文件  
- P1 起步：[`interactions/pages/agents/CONTROLS.md`](./interactions/pages/agents/CONTROLS.md)  
- 总判定：`INTERACTION_NOT_STARTED`（见 `ACCEPTANCE.md`）  
- 下一步：**P2 开始录 Agents**（逐条点官方 → 填 Spec + shots）

## Magpie 对照可用性

- 进程：`magpie web --addr 127.0.0.1:17890` 在跑  
- 首次访问 303 + Set-Cookie 属鉴权跳转，带 `?k=` 后可用  
- 空态基准图：`/workspace/magpie-official/shots/01-agents.png`
