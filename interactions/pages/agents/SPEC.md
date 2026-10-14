# Agents — Interaction Spec

> P2：优先批次 **A-01 / A-02 / A-05 / A-06 / A-08 / A-09** 已对齐；  
> Manage 内页 **A-M01…A-M09** 与安装 Copy **A-I01…A-I18** 已按 [`shots/CLICK-LOG.md`](./shots/CLICK-LOG.md) 录制并对齐 demo（v0.1.4）。  
> ID 以 CLICK-LOG 为准。全应用仍非 PASS。

## 总表（优先批次）

| id | 页面 | 控件文案/选择器 | 操作 | 前态截图 | 后态截图 | 动效(CSS/时长) | DOM/class变化 | 源码位置 | 录制 | demo状态 |
|----|------|-----------------|------|----------|----------|----------------|---------------|----------|------|----------|
| A-01 | Agents | `button.text.primary.guide-go` /「添加供应商」 | 点击 | `shots/A-01-before.png` | `shots/A-01-after.png` | **页切无 leave VT**；`.text` transition `.12s` | `show("providers")` | `app.js` `addProviderFromAgents` | 已录 | **已实现** |
| A-02 | Agents | 步骤2「接入一个 agent」行（**无按钮**） | 点击行/文案 | `shots/A-02-before.png` | `shots/A-02-after.png` | 无 | **无控件** | guide 步骤2 | 已录 | **已对齐（无控件）** |
| A-05 | Agents | `.ag-manage-button` /「管理」 | 点击 | `shots/A-05-before.png` | `shots/A-05-after.png` | openModal WAAPI 570ms SPRING | `#modal.lib` + `.editor.ag-manager` | `openAgentsManager` | 已录 | **已实现** |
| A-06 | Agents | `.ag-install-head` | 展开/收起 | `shots/A-06-before.png` | `shots/A-06-after.png` | chev `.3s` | `aria-expanded` | `paintInstalls` | 已录 | **已实现** |
| A-08 | Agents | `#save` /「＋ 保存当前」 | 进入命名 | `shots/A-08-before.png` | `shots/A-08-after.png` | 无开场 transition | `.profiles.naming` | `saveCurrent` | 已录 | **已实现** |
| A-09 | Agents | `#sync` | 点击刷新 | `shots/A-09-before.png` | mid/after | spin `.9s` + toast | footer status | `#sync.onclick` | 已录 | **已实现** |

---

## Manage modal（A-11 / A-M*）

基准：`shots/A-11-before.png`（modal 已开）。源码：`openAgentsManager` 2531–2637。

| id | 控件 | 操作 | 后态（CLICK-LOG） | 录制 | demo状态 |
|----|------|------|-------------------|------|----------|
| A-11 | modal 基线 | 已开 | 搜索/动作/Cursor 未选·未隐藏；Hide/Unhide disabled；Done 可用 | 已录 | **已实现** |
| A-M01 | `.ag-manage-search` | 点击（已聚焦） | 像素不变；未输入查询 | 已录 | **已实现**（打开时 focus） |
| A-M02 | 行 checkbox Cursor | 勾选 | 「1 agent selected」；Hide enabled；Unhide disabled | 已录 | **已实现** |
| A-M03 | Hide selected | 点击 | status「1 agent hidden」；行「Hidden」；清空选择；列表去掉 Cursor | 已录 | **已实现**（本地 hiddenIds，无 API） |
| A-M04 | Select search results | 点击 | Cursor 勾选且仍 Hidden；Unhide enabled；Hide disabled | 已录 | **已实现** |
| A-M05 | Unhide selected | 点击 |「1 agent unhidden」；「Not hidden」；清空选择；Cursor 回列表 | 已录 | **已实现** |
| A-M06 | Invert search selection | 点击 | 空选→勾选 Cursor；Hide enabled | 已录 | **已实现** |
| A-M07 | Clear selection | 点击 | 0 selected；Hide/Unhide disabled；result 文案保留 | 已录 | **已实现** |
| A-M08 | Select unconnected agents | 点击 | 选中未接入（Cursor）；Hide enabled | 已录 | **已实现** |
| A-M09 | Done | 点击 | 关 modal（Esc 同）；列表 Cursor「不能接入」 | 已录 | **已实现** |

zh 文案：`已选择 {n} 个 Agent` · `已隐藏 {n} 个 Agent` · `已取消隐藏 {n} 个 Agent` · `未隐藏`/`已隐藏`。

---

## Install Copy（A-I01…A-I18）

展开「安装其他 Agent」后，每条命令的 `.copy`：**只复制命令，不执行**。  
Toast：`{agent}'s install command copied` → zh **`已复制{agent} 的安装命令`**（i18n `{what} copied` + `{agent}'s install command`）。

| id | Agent · via | 录制 | demo状态 |
|----|-------------|------|----------|
| A-I01…A-I18 | 见 CLICK-LOG（Claude Code×2 … Snow CLI） | 已录 | **已实现**（clipboard + footer toast；按钮 `.done` 闪一下） |

---

## 尚未录制 / 未实现

- **Hide Get started**（`.guide-x`）：CLICK-LOG NOTE 标明本批未录 → demo 仅 stub 隐藏，不标 1:1  
- **Arrange Cursor**（行菜单）：未录 → 不发明  
- Profiles 真保存、多 Agent、接入开关、拖拽等 A-25…A-52 条件态  
- Providers / Routing / … 其它页

**本文件状态：A-01…09 + A-M* + A-I* 录制=已录 · demo=已实现（web v0.1.4）· 全应用仍非 PASS · 判定 AGENTS_MANAGE_INSTALL_PARTIAL。**


---

## Agents leftovers（A-GS01 / A-AR01）

| id | 控件 | 操作 | 后态 | 录制 | demo 状态 |
|----|------|------|------|------|-----------|
| A-GS01 | `.guide-x` Hide Get started | 点击 | 快速上手卡消失 | 已录 | **已实现**（`localStorage` `magpie-demo-guideHidden`） |
| A-AR01 | `.ag-handle` Arrange Cursor | 点击开菜单 | Move up/down **disabled**（仅 1 agent）；Hide；Esc 关；**非**拖拽 | 已录 | **已实现**（Hide → 同 Manage 隐藏） |
