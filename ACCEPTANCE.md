# Magpie Shell Demo — 验收清单（金标：**Win / Mac 默认窗**）

> **桌面 1:1 金标 = Win/Mac 默认 660×600 顶栏标签**（不是 web 宽窗侧栏；也不是 Linux 页内关闭钮）。  
> 依据：[`interactions/win-mac/WIN-MAC-CHROME.md`](./interactions/win-mac/WIN-MAC-CHROME.md)  
> 源码：`window_rule.go` 660×600 · `SIDE_AT=1024` → 默认顶栏；Windows 保留系统标题栏、藏 brand、无 `#winclose`。  
> 当前总判定：**`WIN_MAC_CHROME_PARTIAL`**  
> **不是**全应用 PASS。

对照基准：
- **金标**：官方营销图 `magpie-src/site/public/img/agents-light.png`（顶栏）+ Win 标题栏规则
- 页内容可参考：`interactions/native-linux/shots/`（同为顶栏空态；忽略 Linux 的页内 X）
- ~~web 侧栏~~：宽窗/浏览器 ≥1024 布局，**非** Win/Mac 默认窗金标

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

## B–D. 页内交互

| # | 项 | 状态 |
|---|----|------|
| B–D | Agents / Providers / Routing 既有交互 | [x] |
| E | Gateway / Usage / Plugins / Settings 深交互 | [~]/[ ] |

## F. 交付

| # | 项 | 状态 |
|---|----|------|
| F1 | Windows Setup `.exe` | [x] | https://github.com/beyondchenlin/magpie-shell-demo/releases/download/v0.1.7/Magpie-Shell-Demo-Setup-0.1.7.exe |
| F2 | Vercel Web | [x] | https://magpie-shell-demo.vercel.app |

---

*判定 `WIN_MAC_CHROME_PARTIAL`：外壳对齐 Win/Mac 默认顶栏 + Windows 标题栏；交互仍部分。*
