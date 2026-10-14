# Magpie 壳 vs magpie-shell-demo 差距矩阵

对照：`MAGPIE-TEARDOWN.md`（源事实）× 本仓库 `src/`（2026-10-14 拆解时读取）。

等级：
- **P0**：一眼不像 / 用户已明确不满意的 1:1 缺口，改完前不得再宣称 PASS
- **P1**：结构或文案明显偏离，壳验收应修
- **P2**：可接受简化 / 明确划出 Demo 范围

| # | Magpie 源事实 | demo 现状 | 等级 | 改法 |
|---|---------------|-----------|------|------|
| 1 | Routing 舞台含 `svg.rt-sky` + `.rt-flier` 飞鸟沿路径运请求/回包（`routing.js` + `routing.css` `.rt-flier`/`rtflap`） | 仅静态 Hub 鸟标；**无 `.rt-sky`、无拍翅、无 pkt** | **P0** | 从 `routing.js` 抽 flier SVG + 沿 wire 路径的简化 mock 飞行动画；保留 `prefers-reduced-motion` |
| 2 | `.rt-stage` 下完整：`wires + srcs + hub + accts + sky`，另有 `.rt-log` / `.rt-steps` / `#rtMore` 历史 | 有三列+wires+stats；**缺 sky、rt-log、rt-more、replay** | **P0** | 补齐 DOM 层级与空态/mock 日志区，class 与 Magpie 同名 |
| 3 | Hub `small` = gateway URL 或 i18n `"gateway"`→「网关」；chip 为模式文案（`hubText`/`chip`） | Hub `small` 写成「本地网关」；chip 写死 `live` | **P0** | 副标题改「网关」或 mock URL；chip 用真实模式短标签（如智能） |
| 4 | 策略 i18n：Smart→智能，**In order→按顺序**，By weight→按权重 | 按钮写「顺序」；说明句自拟「顺序：按列表…」 | **P0** | 文案改「按顺序」；说明句尽量贴 i18n 长句或标明 Demo 摘要 |
| 5 | Brand 在侧栏态位于 **`.side-top`**（`layoutNav` 搬移）；无 DEMO 徽章 | Brand 放在 **`.side-scroll`** 顶部 + `.demo-badge` | **P0** | Brand 移入 `.side-top`；Demo 标识放到页脚/设置，勿破坏 side-top 高度 46px |
| 6 | 默认窗 **660×600**；Web 非「放大画布」 | Electron 已 660×600；**Web `shell-patch` 强制 1100×760** | **P0** | Web 预览改为 660×600（或等比例），去掉加大舞台的 patch |
| 7 | `.rt-accts li` 用 `.dot` / `.bar` / `em`；`.on`→`border-color: var(--fg)` + 脉冲点 | 行内 **inline style** 自绘圆点（accent/line）；缺 bar；`.on` 被 patch 改成 `--fg-2` | **P0** | 去掉 inline；用 Magpie class；删掉冲突的 `.rt-accts li.on` patch |
| 8 | Provider 行由 `app.js` 拼装完整控件（开关、账号、模型数等 Magpie DOM） | `shell-patch` 自造 flex 行 +「关闭」文本按钮 | **P1** | 按 Magpie provider 行 class 重搭 mock DOM，少写 patch |
| 9 | Agents 行含 Magpie `.field` 弹出语义、宽屏 effort 布局 | 结构接近但无真实 pop/reorder；**可接受 mock** | P1 | 保留 class；补 hover grip；勿另起卡片皮肤 |
| 10 | Sessions / Library / Usage / Plugins / Gateway：完整页结构 | **占位列表**（自标 Demo） | **P1** | 至少套 Magpie 页头/list/segs 骨架；标 `[~]` 不写 PASS |
| 11 | `#sideGw.side-gw` 侧栏底网关状态 | 无 | P1 | mock 一条 side-gw（未运行/端口） |
| 12 | `#sideEdge` 可拖改 `--side-w` | 仅视觉 separator，无 drag | P1 | 实现简单 pointer drag，或验收标 `[~]` |
| 13 | 顶栏 `.actions`：sync / open / prefs / winclose（侧栏态 prefs 在脚） | 仅 sync；prefs 在脚 OK；缺 open/winclose（Web 可略） | P2 | Desktop 壳补图标位；Web 可 hidden |
| 14 | `body.side-nav .crumb` 默认 hidden，由 JS 控 | patch **强制显示 crumb** | P1 | 对齐 Magpie：侧栏态用 crumb 或不用，勿 `display:flex !important` 打架 |
| 15 | Tokens / 正文字号 13px/1.4 / 暗色板 | **已复制**完整 `app.css`+`routing.css` | — | 保持；勿再发明并行 token |
| 16 | 侧栏 IA 顺序与 zh 标签 | **已对齐** `mock.ts` NAV | — | 保持 |
| 17 | 托盘 `glide.go` 高度动画 | 无托盘（Electron 单窗） | P2 | 划出范围；勿与飞鸟混淆 |
| 18 | Mac traffic lights inset / Linux plainTitlebar | Electron 系统标题栏 | P2 | 文档标明；非视觉 1:1 阻塞（Windows 上游本就系统栏） |
| 19 | 飞鸟依赖真实 gateway trace 时序 | Demo 无后端 | P0（视觉）/ 业务豁免 | **用定时 mock 轨迹**模拟飞鸟即可，不接真网关 |
| 20 | 先前 ACCEPTANCE 汇总标多项 `[x]` / `PASS_WITH_GAPS` | **过早宣称**；用户反馈非 1:1 | **P0（流程）** | 以本矩阵为准重写 ACCEPTANCE；未闭环前总判定 `FAIL_NOT_1TO1` |

---

## P0 计数

**P0 条目：8**（表中 #1–7、#19 视觉飞鸟与 #20 验收诚实性；若 #19 并入 #1 则计 **7 项功能 P0 + 1 项流程**）。

严格功能/视觉 P0：**7**（#1–7）；流程 P0：**1**（#20）。

---

## Top 5 P0 修复清单（下一步只做这些）

1. **补 Routing `.rt-sky` 飞鸟 mock**（拍翅 + 沿 wire 走），不再只放静态 logo。  
2. **Web/壳预览改回 660×600**，删掉把画布拉到 1100×760 的 patch。  
3. **Brand 移入 `.side-top`**，去掉破坏布局的 DEMO 徽章位置。  
4. **账号行与 Hub 文案对齐 Magpie**（`.dot`/`.bar`、副标题「网关」、策略「按顺序」）。  
5. **补齐 Routing DOM 层级**（`rt-log` / `rt-more` 骨架），并重写 ACCEPTANCE 为诚实未通过。

---

*本文件只列差距与改法；本轮任务不启动大改 UI。*
