# Agents — Interaction Spec

> P2：优先批次 **A-01 / A-02 / A-05 / A-06 / A-08 / A-09** 已按实机 CLICK-LOG 录制并对齐 demo。  
> ID 以 [`shots/CLICK-LOG.md`](./shots/CLICK-LOG.md) 为准（覆盖早期「A-01=guide×」草案）。  
> 基准空态：`/workspace/magpie-official/shots/01-agents.png` · 官方 URL：`http://127.0.0.1:17890/?k=…`

## 总表（优先批次）

| id | 页面 | 控件文案/选择器 | 操作 | 前态截图 | 后态截图 | 动效(CSS/时长) | DOM/class变化 | 源码位置 | 录制 | demo状态 |
|----|------|-----------------|------|----------|----------|----------------|---------------|----------|------|----------|
| A-01 | Agents | `button.text.primary.guide-go` /「添加供应商」 | 点击 | `shots/A-01-before.png` | `shots/A-01-after.png`（Providers 目录） | **页切无 leave VT**；`.text` transition `.12s`；primary hover brightness | `show("providers")`；nav providers `.on`；空态 Providers sheet（厂商网格）。**无 modal** | `app.js` `addProviderFromAgents` 1698–1705，`show` 24330+；`app.css` `.text` 1836 | 已录 | **已实现** |
| A-02 | Agents | 步骤2「接入一个 agent」行（**无按钮**） | 点击行/文案 | `shots/A-02-before.png` | `shots/A-02-after.png`（同页无变化） | 无 | **无控件**；点击无页面/modal/展开。demo **不得**发明 Connect 按钮 | guide 步骤2 仅 title+say | 已录（无控件） | **已对齐（无控件）** |
| A-05 | Agents | `.ag-manage-button` /「管理」 | 点击 | `shots/A-05-before.png` | `shots/A-05-after.png` | **openModal WAAPI**：backdrop opacity **280ms** ease-out；dialog `translateY(24px) scale(.94)`→none **570ms SPRING**；dialog opacity **240ms**。Esc/`Done`/backdrop 关：**260ms** `IOS_EASE` | `#modal.lib` + `.editor.ag-manager.framed`（搜索/选择动作/Cursor 行/Hide·Unhide·Done） | `app.js` `openAgentsManager` 2531–2637，`openModal` 8062–8109 | 已录 | **已实现** |
| A-06 | Agents | `.ag-install-head` /「安装其他 Agent（14）」 | 展开/收起 | `shots/A-06-before.png` | `shots/A-06-after.png` | chev **`.3s`** `cubic-bezier(.22,1,.36,1)` 旋 180°；列表 **瞬时** mount（非 grid fold） | `aria-expanded`；`.ag-install-note` + 14× `.ag-install-row` | `app.js` `paintInstalls` 2338–2393；`app.css` 628–645 | 已录 | **已实现** |
| A-08 | Agents | `#save` /「＋ 保存当前」 | 进入命名 | `shots/A-08-before.png` | `shots/A-08-after.png` | **无开场 transition**；同步插 `input.chip-input` | `.profiles.naming`；placeholder「方案名称」；按钮文案→「保存」；blur/Esc 取消（demo 不强制真保存） | `app.js` `saveCurrent` 5364–5390；`app.css` `.chip-input` 1893 | 已录 | **已实现** |
| A-09 | Agents | `#sync` | 点击刷新 | `shots/A-09-before.png` | mid `A-09-mid.png` · after `A-09-after.png` | `.icon.spin` → svg 子节点 `spin` **`.9s linear infinite`**；结束对齐 iteration；toast | footer `.status.ok`「已重新检测 Agent」；naming 关闭 | `app.js` `#sync.onclick` 24556–24580；i18n 442 | 已录 | **已实现** |

---

## 详表补记

### A-01 · 添加供应商
导航到 Providers 空态目录（ADD YOUR FIRST PROVIDER / 订阅·厂商·中转…）。官方 window 模式随后可能自动点 `#addProvider` 开 sheet；**本批 after 截图是目录页、无 modal**，demo 对齐截图：只 `go("providers")`。

### A-02 · 接入 agent（无控件）
步骤 2 仅说明文案。实机点击行保持 Agents，无导航。demo 不增加任何 guide-go / Connect 按钮。

### A-05…A-09
见总表；关闭 Manage 用 Esc（实机已验证）。

---

## 尚未实现（Agents 其余 A-xx）

A-03/A-04（行只读）· A-07（hint 只读）· A-10（面包屑）· A-11…A-14 复制等（展开内容已有复制按钮，派生验收未单测）· A-15…A-24 Manage 内页细交互（搜索/多选 UI 已有，Hide 无后端）· A-25…A-52 条件态 → 见 CONTROLS.md。

**本文件状态：优先 6 项 录制=已录 · demo=已实现（web）· 全应用仍非 PASS。**
