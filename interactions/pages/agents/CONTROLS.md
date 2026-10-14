# Agents — P1 控件清单

基准：
- 空态截图：`/workspace/magpie-official/shots/01-agents.png`（及 demo 自检 `acceptance-shots/demo-agents.png`）
- 源码：`/workspace/magpie-src/internal/gui/assets/app.js`（Agents 段）+ `index.html` `#view-agents` + `app.css`（`.guide` / `.agent-*` / `.profiles` / `.ag-install*`）

状态图例：`[ ]` 未盘点完细节 · `[x]` 已列入 · 录制在 P2 `SPEC.md`（本文件不填动效）

---

## A. 空态可见（对照 01-agents.png）

| id | 控件 | 选择器 / 文案 | 操作预期（源码） | 源码锚点 | 盘点 |
|----|------|---------------|------------------|----------|------|
| A-01 | 快速上手 · 关闭 | `.guide-x` / 卡右上 × | 隐藏 guide；写 `settings/guide` hidden | `guideCard` → `hideGuide` ~1680 | [x] |
| A-02 | 快速上手 · 添加供应商 | `.guide-go` /「添加供应商」 | `show("providers")` 后点 `#addProvider` | `addProviderFromAgents` ~1700 | [x] |
| A-03 | Cursor 行本体 | `.row.agent`（Cursor） | 不可接入类；点击展开/无 connect（`ag-cant`） | `renderAgents` / `connectKind` | [x] |
| A-04 | Cursor · 不能接入文案 | `.ag-cant` | 只读展示 | 同上 | [x] |
| A-05 | 管理 | `.ag-manage-button` /「管理」 | 打开 Manage agents modal | `agentsManageButton` / `openAgentsManager` ~2511 | [x] |
| A-06 | 安装其他 Agent (14) | `.ag-install-head` | 展开/收起安装目录；chev 旋转 | `paintInstalls` ~2338 | [x] |
| A-07 | 方案区提示 | `.profiles .hint` | 只读 | `renderProfiles` ~733 | [x] |
| A-08 | ＋ 保存当前 | `#save` | 打开命名 chip-input（naming） | `saveCurrent` / profiles ~5359 | [x] |
| A-09 | 顶栏刷新 | `#sync` | 重新扫描本机 agents；按钮 spin | `#sync.onclick` ~24556 | [x] |
| A-10 | 面包屑 | `#crumb` | 只读（使用 / Agent） | layout / `show` | [x] |

---

## B. 安装目录展开后（点 A-06）

| id | 控件 | 选择器 / 文案 | 操作预期 | 源码锚点 | 盘点 |
|----|------|---------------|----------|----------|------|
| A-11 | 安装说明段 | `.ag-install-note` | 只读 | `installNote` | [x] |
| A-12 | 每个未装 Agent 行 | `.ag-install-row` | 展示 icon/name/commands | `paintInstalls` | [x] |
| A-13 | 安装命令 · 复制 | `.ag-install-cmd` 内 copy | 复制 command 到剪贴板 + toast | `copyBtn` | [x] |
| A-14 | via 标签 | `.ag-install-via` | 只读（Installer/npm/…） | `VIA` map | [x] |

---

## C. Manage agents modal（点 A-05）

| id | 控件 | 选择器 / 文案 | 操作预期 | 源码锚点 | 盘点 |
|----|------|---------------|----------|----------|------|
| A-15 | modal 遮罩/容器 | `#modal.lib` + `.editor.ag-manager` | openModal；关走 Done/Escape | `openAgentsManager` / `openModal` | [x] |
| A-16 | 搜索框 | `.ag-manage-search` | 过滤行 | `search.oninput = draw` | [x] |
| A-17 | Select search results | `.ag-manage-actions` 按钮 | 选中当前匹配 | 同上 | [x] |
| A-18 | Invert search selection | 同上 | 反选匹配 | 同上 | [x] |
| A-19 | Select unconnected agents | 同上 | 选未接入 | 同上 | [x] |
| A-20 | Clear selection | 同上 | 清空 | 同上 | [x] |
| A-21 | 行 checkbox | `.ag-manage-row input` | 切换选中 | `draw` | [x] |
| A-22 | Hide selected | bar「Hide selected」 | `agents/arrange` hidden | `save(true)` | [x] |
| A-23 | Unhide selected | bar「Unhide selected」 | 同上 unhide | `save(false)` | [x] |
| A-24 | Done | bar「Done」 | `closeConfirmAsk` | 同上 | [x] |

---

## D. Profiles（有方案后 / 保存流程）

| id | 控件 | 选择器 / 文案 | 操作预期 | 源码锚点 | 盘点 |
|----|------|---------------|----------|----------|------|
| A-25 | 命名输入 | `.profiles > .chip-input` | A-08 后出现；Enter 保存 | profiles save flow ~5359 | [x] |
| A-26 | 方案 chip | `#profiles .chip` | 选中 / 展开 detail | `renderProfiles` | [x] |
| A-27 | chip · Apply | `.prof-detail` Apply | 应用到 agents | `showProfile` / apply ~896 | [x] |
| A-28 | chip · 删除/更新 | chip × / ↻ | 确认后 API | profilePending | [x] |
| A-29 | Escape 取消 | 键盘 | `profileEscape` | ~853 | [x] |

---

## E. Agent 行（有可接入 Agent 后 · 条件）

| id | 控件 | 选择器 / 文案 | 操作预期 | 源码锚点 | 盘点 |
|----|------|---------------|----------|----------|------|
| A-30 | 行点击展开 | `.row.agent` | `panelOpenAgent` / `.open` / `aria-expanded` | `renderAgents` ~527 | [x] |
| A-31 | 接入开关 | `.lib-switch.ag-conn` | 接通/断开 magpie | connect panel | [x] |
| A-32 | 空态 · 行内添加供应商 | `.ag-add` | 同 A-02 | connectKind empty ~1416 | [x] |
| A-33 | 模型/字段 picker | `.field` / `.ag-pick` | 打开 pick popover | fieldBtn / pick | [x] |
| A-34 | 行 handle · 拖拽排序 | `.ag-handle` | drag reorder → `moveAgent` | `agentHandle` ~2683 | [x] |
| A-35 | 行右键 / handle 菜单 | `.pop.row-menu` | Move up/down、Hide、Disconnect… | `openAgentMenu` ~3471 | [x] |
| A-36 | 菜单 · Move up/down | 菜单项 | Alt+↑/↓；`moveAgent` | 同上 | [x] |
| A-37 | 菜单 · Hide / Show | 菜单项 | `setAgentHidden`；fold 动画 UNROLL/ROLLUP | ~2652 | [x] |
| A-38 | 菜单 · Disconnect | 菜单项 | 确认后断开 | `askDisconnect` | [x] |
| A-39 | 菜单 · Apply again | 条件 · drift | `reapplyAgent` | 同上 | [x] |
| A-40 | Import / Add magpie | `.field.import` | 打开 import URL | `importButton` ~2444 | [x] |
| A-41 | 展开区 · Got it / Restart | `.ag-quiet` | stale 提示关闭；Codex daemon restart | `connectPanel` | [x] |
| A-42 | Claude tiers / subagents | `.ag-tier` + picks | 改 tier/model | `connectPanel` claude | [x] |
| A-43 | Desktop longest switch | `.ag-longest .lib-switch` | settings/desktop-longest | `desktopLongestLine` | [x] |

---

## F. 折叠列表（多 Agent / 隐藏后 · 条件）

| id | 控件 | 选择器 / 文案 | 操作预期 | 源码锚点 | 盘点 |
|----|------|---------------|----------|----------|------|
| A-44 | Show more / Show less | `.agent-more` | 展开 folded；chev 180°；grid 0fr→1fr | ~675；CSS `.agent-fold` | [x] |
| A-45 | Hidden 分区线 | `.agent-hid-line` | 展开 hidden fold | ~647 | [x] |
| A-46 | 折行内 Show | `.ag-show` | `setAgentHidden(a,false)` | ~561 | [x] |

---

## G. Guide 进阶（有模型后 · 条件）

| id | 控件 | 选择器 / 文案 | 操作预期 | 源码锚点 | 盘点 |
|----|------|---------------|----------|----------|------|
| A-47 | 步骤2 · agent chip | `.guide-agent` | `guideConnect(a)`；busy class | `guideCard` ~1573 | [x] |
| A-48 | 步骤3 · 加模板 | `.guide-tpl` | `guideTemplate` | ~1603 | [x] |
| A-49 | 步骤3 · Open Routing | `.guide-open` | `show("routing")` | ~1611 | [x] |

---

## H. 关键页 chrome（Agents 打开时可见；侧栏归 S-*）

| id | 控件 | 说明 | 盘点 |
|----|------|------|------|
| A-50 | `#open` Open as window | web 壳；桌面或忽略 | [x] |
| A-51 | loading 骨架 | `renderAgentsLoading` / `.ag-sk-row` | [x] |
| A-52 | empty-state「No agents found」 | 无 agents 时 | [x] |

侧栏导航 / Gateway 状态行 → **不在本页验收**，见 `pages/sidebar/CONTROLS.md`（P1 后续）。空态截图里可见的侧栏项仅作交叉引用：Agents.on、Providers、Routing、Gateway、Usage、Plugins、Settings、`.side-gw`。

---

## 关键效备忘（P2 录制时核对，勿在未录时标 1:1）

| 符号 | 值（源码） | 用途 |
|------|------------|------|
| `UNROLL` | `{ ms: 620, ease: ".22,1,.36,1" }` | fold 展开 / show agent |
| `ROLLUP` | `{ ms: 420, ease: ".4,0,.2,1" }` | fold 收起 / hide |
| `.agent-fold` | grid-template-rows .42s / .open .62s | 折叠容器 |
| `.agent-more .chev` | transform .5s cubic-bezier(.22,1,.36,1) | 箭头 |
| `.ag-install-head .chev` | transform .3s 同上 | 安装区箭头 |
| `#sync` spin | `@keyframes spin` | 刷新中 |
| modal | `openModal` JS 动画（非纯 CSS） | Manage / 确认框 |
| nav 切页 | `view-transition` ~.5s / `.nav-hl` .3s | 离页时；侧栏页详录 |

---

## 统计

| 范围 | 数量 |
|------|------|
| 空态可见 A-01…A-10 | **10** |
| 安装展开 A-11…A-14 | **4** |
| Manage modal A-15…A-24 | **10** |
| Profiles A-25…A-29 | **5** |
| Agent 行条件 A-30…A-43 | **14** |
| 折叠 A-44…A-46 | **3** |
| Guide 进阶 A-47…A-49 | **3** |
| Chrome A-50…A-52 | **3** |
| **合计** | **52** |

P2 建议顺序：先 A-01 → A-02 → A-05（含 A-15…24）→ A-06（含 A-11…14）→ A-08/A-25 → A-09；有第二个可接入 agent 后再录 E/F/G。

**本文件状态：P1 盘点完成 · 录制未开始（无 SPEC 行、无 shots）。**
