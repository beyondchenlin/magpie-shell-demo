# Magpie Shell Demo — 验收清单（金标：**Win / Mac 默认窗**）

> **桌面 1:1 金标 = Win/Mac 默认 660×600 顶栏标签**（不是 web 宽窗侧栏；也不是 Linux 页内关闭钮）。  
> 依据：[`interactions/win-mac/WIN-MAC-CHROME.md`](./interactions/win-mac/WIN-MAC-CHROME.md)  
> 外壳外观逻辑（二开）：[`docs/SHELL-APPEARANCE-LOGIC.md`](./docs/SHELL-APPEARANCE-LOGIC.md)  
> 当前总判定：**`GATEWAY_SHELL_LOGIC_PARTIAL`**  
> **不是**全应用 PASS。

对照基准：
- **金标**：官方营销图顶栏 + Win 标题栏规则
- Gateway 空态：`magpie-official/shots/04-gateway.png` + `interactions/pages/gateway/`
- ~~web 侧栏~~：宽窗布局，**非** Win/Mac 默认窗金标

图例：`[x]` 自检通过 · `[~]` 有意简化 · `[ ]` 未过 / 未做

---

## A. 外壳（Win/Mac）

| # | 项 | 状态 |
|---|----|------|
| A1 | 默认顶栏标签（非 side-nav） | [x] |
| A2 | 无 Linux 页内 winclose | [x] |
| A3 | Windows exe：系统标题栏 + 页内 brand 隐藏 | [x] |
| A4 | 窗默认 660×600 | [x] |
| A5 | Settings = 原地 + 横向 set-tabs | [x] |
| A6 | 侧栏仅作宽窗参考，非桌面默认金标 | [x] |
| A7 | Motion tokens 文档 + Gateway 控件动效 | [x] |

## B–E. 页内交互

| # | 项 | 状态 |
|---|----|------|
| B–D | Agents / Providers / Routing 既有交互 | [x] |
| E1 | Gateway 空态 + fold/segs/copy/restart 动效 | [x] |
| E2 | Gateway LAN keys / 调用详情 | [ ] |
| E3 | Usage / Plugins 深交互 | [ ] |

## F. 交付

| # | 项 | 状态 |
|---|----|------|
| F1 | Windows portable `.exe` | [x] | https://github.com/beyondchenlin/magpie-shell-demo/releases/download/v0.1.9/Magpie-Shell-Demo-0.1.9-portable.exe （本机 wine 坏，NSIS Setup 暂不可用） |
| F2 | Vercel Web | [x] | https://magpie-shell-demo.vercel.app |

---

## Verdict

**GATEWAY_SHELL_LOGIC_PARTIAL** — Gateway 空态壳与主控件（含 transition）已对齐；LAN keys / Usage / Plugins 未齐；全应用非 PASS。
