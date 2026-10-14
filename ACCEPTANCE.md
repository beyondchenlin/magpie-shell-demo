# Magpie Shell Demo — 验收清单（对照官方截图 + 源码）

> **静态空态 ≠ 交互 1:1。**  
> 当前总判定：**`AGENTS_PROVIDERS_PARTIAL`** — Agents（含 Hide Get started / Arrange）+ Providers 目录/Import/已录表单壳已接线；Routing/Gateway/Usage/Plugins/Settings 交互未做。  
> **不是**全应用 PASS。  
> 交互计划：[`INTERACTION-PLAN.md`](./INTERACTION-PLAN.md)  
> Spec：[`interactions/pages/agents/SPEC.md`](./interactions/pages/agents/SPEC.md) · [`interactions/pages/providers/SPEC.md`](./interactions/pages/providers/SPEC.md)

对照基准：
- 官方实机截图：`/workspace/magpie-official/shots/`
- 源码：`magpie` `internal/gui/assets/`
- 交互录制：`interactions/pages/<page>/shots/CLICK-LOG.md`

图例：`[x]` 自检通过 · `[~]` 有意简化 · `[ ]` 未过 / 未做

---

## A. 外壳 / IA

| # | 项 | 状态 |
|---|----|------|
| A1–A6 | 窗框 / tokens / 侧栏分组 / Brand / 选中 pill / zh 文案 | [x] |

## B. Agents 空态 + 交互

| # | 项 | 状态 |
|---|----|------|
| B1–B4 | 空态结构 | [x] |
| A-01…A-09 | 优先 6 控件 | [x] |
| A-M01…A-M09 | Manage | [x] |
| A-I01…A-I18 | Install Copy | [x] |
| A-GS01 | Hide Get started（会话持久 localStorage） | [x] |
| A-AR01 | Arrange 菜单（上移/下移 disabled；Hide；Esc） | [x] |

## C. Providers

| # | 项 | 状态 |
|---|----|------|
| C1–C4 | 空目录分区 | [x] |
| P-01/P-02 | Find 过滤 + Escape 清空 | [x] |
| P-03 | Import… Not found 空态 + Cancel | [x] |
| P-S1 | Claude 行内 risk | [x]（无真 OAuth） |
| P-S2…P-S5 / P-C1 | Anthropic / OpenRouter / Ollama / Remote / Custom 表单壳 | [x]（Cancel；Add 仅 toast） |
| C5 | 全厂商字段差异 | [~] | 仅采样；其它瓦片用 generic 壳 |

## D. Routing / E. 其它

| # | 项 | 状态 |
|---|----|------|
| D1–D4 | Routing 空态外观 | [x] |
| D5–D6 / E* | 飞鸟真迹 / 真网关 / 其它页交互 | [ ] |

## F. 交付

| # | 项 | 状态 |
|---|----|------|
| F1 | Windows Setup `.exe` | [x] | https://github.com/beyondchenlin/magpie-shell-demo/releases/download/v0.1.4/Magpie-Shell-Demo-Setup-0.1.4.exe |
| F2 | Vercel Web | [x] | https://magpie-shell-demo.vercel.app （验 A-GS01/A-AR01 + Providers P-*） |

---

*诚实原则：Agents leftovers + Providers 部分达标 ≠ 全应用 1:1；不写全量 PASS。*
