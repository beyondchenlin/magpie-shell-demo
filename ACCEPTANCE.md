# Magpie Shell Demo — 验收清单（对照官方截图 + 源码）

> **静态空态 ≠ 交互 1:1。**  
> 当前总判定：**`AGENTS_MANAGE_INSTALL_PARTIAL`** — Agents 优先 6 控件 + Manage A-M01…A-M09 + Install Copy A-I01…A-I18 已接线；Hide Get started / Arrange Cursor 未录；其余页未做。  
> **不是**全应用 PASS。  
> 交互计划：[`INTERACTION-PLAN.md`](./INTERACTION-PLAN.md) · Spec：[`interactions/pages/agents/SPEC.md`](./interactions/pages/agents/SPEC.md)

对照基准：
- 官方实机截图：`/workspace/magpie-official/shots/`（01-agents … 03-routing 等）
- 源码：`magpie` `internal/gui/assets/`（`app.css` / `routing.css` / `index.html` / `i18n.js` zh）
- 本仓库自检截图：`acceptance-shots/demo-*.png`
- 交互录制：`interactions/pages/<page>/SPEC.md` + `shots/`（P2 起）

外观空态（旧）：Agents / Providers / Routing 空态结构接近 → 曾标 `VISUAL_EMPTY_MATCH`；**在交互 Spec 完成前不再单独作为交付结论。**

图例：`[x]` 自检通过 · `[~]` 有意简化 · `[ ]` 未过 / 未做

---

## A. 外壳 / IA（对照 01–03 截图侧栏）

| # | 项 | 状态 | 证据 |
|---|----|------|------|
| A1 | 窗 / Web 框 **660×600** | [x] | Electron `main.cjs`；`shell-patch` Web 框 |
| A2 | `--bg #f4f4f6`、`--accent #4f46e5`、`--line #e3e3e8`、侧栏 ~212px | [x] | 复制 Magpie `app.css` |
| A3 | 侧栏分组：使用→Agent；模型→供应商/路由/网关；观测→用量；扩展→插件；设置置底；绿色网关行 | [x] | 对照 `01-agents.png`；**无** Sessions/Library 顶栏（插件默认关） |
| A4 | Brand：黑鸟 + `magpie` 在 `.side-top` | [x] | `App.tsx`；自检 `demo-agents.png` |
| A5 | 选中项白圆角 pill + graphite（非 accent 填底） | [x] | Magpie `body.side-nav … .on` |
| A6 | 文案用 Magpie `i18n.js` zh（不自拟） | [x] | `src/data/mock.ts` `ZH` |

## B. Agents 空态（对照 `01-agents.png`）

| # | 项 | 状态 |
|---|----|------|
| B1 | 快速上手卡 0/2：添加模型来源 + 接入 agent +「添加供应商」按钮 | [x] |
| B2 | Cursor 行：不能接入 +「只能用 Cursor 自己的模型」 | [x] |
| B3 | 管理 / 安装其他 Agent（14）/ 方案空态 + 保存当前 | [x] |
| B4 | DOM class：`.guide` / `.row.agent` / `.ag-cant` / `.profiles` | [x] |

## C. Providers 空态（对照 `02-providers.png`）

| # | 项 | 状态 |
|---|----|------|
| C1 | 「添加第一个供应商」+ 查找 + 导入 | [x] |
| C2 | 分区：订阅 / 供应商 / 中转 / 本机 / 另一台电脑 + 自定义 | [x] |
| C3 | 订阅含 Claude、ChatGPT、Copilot… +「插件中还有更多」 | [x] |
| C4 | 厂商网格布局（`.sheet .kind` / `.grid` / `.tile`） | [x] |
| C5 | 完整官方 preset 数与排序 | [~] | 自 `presets.go` 解析约 57 项；中国镜像 `*-cn` 默认折叠；无真实添加流程 |

## D. Routing 空态（对照 `03-routing.png`）

| # | 项 | 状态 |
|---|----|------|
| D1 | 白卡：路由 + 绿点 +「实时 · 网关正在做的决定」+ 账号打码 | [x] |
| D2 | 「等待请求」+ 说明句（zh） | [x] |
| D3 | 舞台：你的 Agent → magpie/`127.0.0.1:3425` → 虚线「还没有请求」 | [x] |
| D4 | 页脚说明 + 统计 0/0/0 | [x] |
| D5 | `.rt-sky` 飞鸟 | [~] | 「演示飞鸟」开关提供 mock 轨迹；默认空态无飞鸟（对齐官方空态） |
| D6 | 真实网关 trace / rt-log / 历史 | [ ] | Demo 无后端 |

## E. 其它页

| # | 项 | 状态 |
|---|----|------|
| E1 | Gateway / Usage / Plugins / Settings 骨架 | [~] |
| E2 | 原生 Tauri / 完整飞鸟拍翅 SVG 与官方一致 | [ ] |

## G. Agents 优先交互（对照 SPEC + shots/CLICK-LOG）

| id | 项 | 状态 |
|----|----|------|
| A-01 | 添加供应商 → Providers 目录（无 leave 动画 / 无假 modal） | [x] |
| A-02 | 接入 agent 步骤 **无控件**（不发明按钮） | [x] |
| A-05 | 管理 → Manage modal；backdrop 280ms + dialog spring 570ms；Esc 关 | [x] |
| A-06 | 安装其他 Agent（14）chev .3s 展开安装命令 | [x] |
| A-08 | ＋ 保存当前 → chip-input「方案名称」+「保存」 | [x] |
| A-09 | #sync spin .9s + toast「已重新检测 Agent」 | [x] |
| — | A-03…A-04 / A-07 / A-10 / A-11…A-52 | [ ] 未验收 |

Web 预览先验 Manage 隐藏/取消隐藏/Done 与安装 Copy toast；Windows `.exe` 随 0.1.3 GHA/Release。

## F. 交付

| # | 项 | 状态 |
|---|----|------|
| F1 | Windows Setup `.exe` Release | [~] | v0.1.2 已有；**v0.1.3** 待 GHA（含 Manage/Copy） |
| F2 | Vercel Web 预览 | [x] | https://magpie-shell-demo.vercel.app （验 A-01…A-09） |

---

*诚实原则：Agents Manage+Install Copy 部分达标 ≠ 全应用 1:1；不写全量 PASS。*
