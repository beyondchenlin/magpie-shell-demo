# Agents — Interaction Spec

> P2 进行中。优先批次 **A-01 / A-02 / A-05 / A-06 / A-08 / A-09** 已从源码填满；截图路径按约定预留，待 computerUse 按 [`RECORDING-QUEUE.md`](./RECORDING-QUEUE.md) 实机点击补齐。  
> `demo状态`：实现前一律 `未实现`。录制子状态写在「备注」列或下方详表。  
> 基准空态：`/workspace/magpie-official/shots/01-agents.png` · URL：`http://127.0.0.1:17890/?k=magpie-shell-review-key1`
>
> 视觉进度：`A-01-before.png`、`A-02-after.png` 已进 `shots/`（后者由误标的 A-01-after 纠正）；其余仍待 RECORDING-QUEUE。

## 总表（优先批次）

| id | 页面 | 控件文案/选择器 | 操作 | 前态截图 | 后态截图 | 动效(CSS/时长) | DOM/class变化 | 源码位置 | demo状态 |
|----|------|-----------------|------|----------|----------|----------------|---------------|----------|----------|
| A-01 | Agents | `.guide-x` / title「隐藏快速上手」 | 点击 × | `shots/A-01-before.png`（已有·EN） | `shots/A-01-after.png`（待录） | **无离场 transition**：`hideGuide` → API 后 `renderAgents()` 直接卸掉 `.guide`。Hover：`.guide-x:hover` → `background:var(--pill); color:var(--fg)`（无 transition）。Busy：`x.disabled` while `guideBusy==="hide"` | 前：`.ag-lead.guiding` 含 `section.guide`。中：`guideBusy="hide"`、× disabled、`guideRedraw`。后：prefs `settings.guide.hidden`；lead 无 guide（或换成非 guiding lead） | `app.js` `guideCard` 1540–1546，`hideGuide` 1682–1696；`app.css` `.guide-x` 3728–3729；`i18n`「Hide Get started」→「隐藏快速上手」 | 未实现 |
| A-02 | Agents | `button.text.primary.guide-go` /「添加供应商」 | 点击 | `shots/A-02-before.png`（待录） | `shots/A-02-after.png`（已有·Providers Add sheet；before 仍待） | **页切无 View Transition**（`nav-morph` 仅侧栏布局切换 `navMorph` 24871）。`show("providers")` 切换 `#view-*[hidden]` + `#nav button.on`。按钮 hover：`.text.primary:hover { filter:brightness(1.08) }`；`.text` transition `background/color .12s`。随后 `#addProvider.click()` 打开添加供应商 sheet（Providers 页动效另录 P-*） | window 模式：`addProviderFromAgents` → `show("providers")` → 必要时 `loadProviders()` → `$("#addProvider")?.click()`。web 非 window：`api("window/main?view=providers")`。导航：对应 `data-view=providers` 加 `.on`/`aria-current=page`，Agents 去掉 | `app.js` `guideCard` 1556–1562，`addProviderFromAgents` 1698–1705，`show` 24330–24386；`app.css` `.text` 1836、`.text.primary` 1840–1841；`i18n`「Add a provider」→「添加供应商」 | 未实现 |
| A-05 | Agents | `.ag-manage-button` /「管理」 | 点击 | `shots/A-05-before.png`（待录） | `shots/A-05-after.png`（待录：Manage modal 开） | **openModal JS WAAPI**（非纯 CSS）：`#modal` opacity 0→1 **280ms ease-out**；dialog transform `translateY(24px) scale(.94)`→`none`（或从 `pressed` 源按钮矩形）**570ms SPRING**；dialog opacity 0→1 **200–240ms ease-out**。`prefers-reduced-motion`：仅 opacity **160ms**。按钮 hover：`.ag-manage-button` `color/background .2s` | 前：`#agentsManage .ag-manage-button`。后：`confirmAsk=ed`；`#modal` 显示且加 `.lib`；内容 `.editor.ag-manager`（ehead / search / actions / rows / bar）；焦点进首个可聚焦控件。记录 `pressed` 供 spring 起点 | `app.js` `agentsManageButton` 2511–2528，`openAgentsManager` 2531–2637，`openModal` 8062–8109，`SPRING`/`IOS_EASE`/`calm` 7974–7979；`app.css` `.ag-manage-button` 3928–3931；`i18n`「Manage」→「管理」 | 未实现 |
| A-06 | Agents | `.ag-install-head` /「安装其他 Agent（{n}）」 | 点击展开/再点收起 | `shots/A-06-before.png`（待录：aria-expanded=false） | `shots/A-06-after.png`（待录：expanded + rows） | **Chevron**：`.ag-install-head .chev { transition: transform .3s cubic-bezier(.22,1,.36,1) }`；`[aria-expanded=true] .chev { transform:rotate(180deg) }`。Head hover：`color .2s` muted→fg。**列表内容无 fold grid 动画**：`paintInstalls` `replaceChildren` 瞬时插入/移除 note+rows（不同于 `.agent-fold` 的 0fr↔1fr） | `installsOpen = !open` 后整段重绘。默认：`installsOpen ?? !(agents.length)` → 有 Cursor 时空态默认 **收起**。展开后出现 `.ag-install-note` + 多个 `.ag-install-row`（A-11…A-14） | `app.js` `paintInstalls` 2338–2393，`installsOpen` 2305；`app.css` 628–645；`i18n`「Install another agent ({n})」→「安装其他 Agent（{n}）」 | 未实现 |
| A-08 | Agents | `#save` /「＋ 保存当前」 | 点击进入命名 | `shots/A-08-before.png`（待录） | `shots/A-08-after.png`（待录：chip-input +「Save」） | **无 CSS transition 开场**：同步插入 `input.chip-input`、改文案、加 class。`.chip-input` 样式：高 25px、圆 pill、`border:1px solid var(--accent)`、宽 140px。二次点击「Save」走 `profileAction("save")`（有值）或 focus 空字段。`onmousedown` 在已有字段时 `preventDefault` 保焦点 | 前：`#save` 文案 `＋ Save current`。后：`.profiles.naming`；`#save` 前插入 `.chip-input`（placeholder「方案名称」）；`#save` 文案→`Save`；hint 在 panel 下 naming 时隐藏。blur 100ms 后 `closeSave` 还原 | `app.js` `saveCurrent` 5364–5390，`renderProfiles` 738–754；`app.css` `.chip-input` 1893–1899，`.profiles` 1815–1820；`i18n`「＋ Save current」→「＋ 保存当前」，「Profile name」→「方案名称」 | 未实现 |
| A-09 | Agents | `#sync`（顶栏 refresh icon） | 点击 | `shots/A-09-before.png`（待录） | `shots/A-09-mid.png`（spin 中，待录）· `shots/A-09-after.png`（停转+toast，待录） | **Spin**：`.icon.spin svg > * { animation: spin .9s linear infinite }`（`@keyframes spin`）。结束后把各 animation `iterations` 调到本圈末再 `remove('spin')`，避免跳帧。Busy 时再点直接 return | Agents 页：`refreshPage("agents")` → `api("agents/rescan")` → `renderAgents()` → `loadInstalls`+`loadCLIs`；`status("Agents looked for again"→「已重新检测 Agent」, "ok")`。title/aria：`syncTitle` 按页刷新 | `app.js` `$("#sync").onclick` 24556–24580，`refreshPage` 24532–24553，`syncTitle` 24520–24530；`app.css` `.icon.spin` 253，`@keyframes spin` 317；`i18n` 438/442 | 未实现 |

---

## 详表（源码证据）

### A-01 · 快速上手 ×

| 项 | 内容 |
|----|------|
| 选择器 | `section.guide button.guide-x` |
| 操作 | click（`stopPropagation`）→ `hideGuide()` |
| 前态 | 空态 Agents：guide 卡可见（「快速上手」「0 of 2 done」类文案 + 步骤1「添加供应商」） |
| 后态 | guide 整卡消失；设置持久 `settings/guide {hidden:true}`；刷新后不再出现直至设置改回 |
| 动效 | 无 exit animation；仅 hover 变色/底（无时长）。Busy 时 × disabled |
| DOM | 去掉 `.guide`；`.ag-lead` 可能不再 `.guiding` |
| 证据 | `app.js:1540-1546,1682-1696` · `app.css:3728-3729` |
| 截图约定 | before=有 guide；after=无 guide（同滚动位置） |
| 录制状态 | 源码已录 · before 已有 · after 待录 |

### A-02 · 添加供应商

| 项 | 内容 |
|----|------|
| 选择器 | `button.text.primary.guide-go`（步骤1，非 `.guide-tpl`） |
| 操作 | click → `addProviderFromAgents()`（window） |
| 前态 | Agents + guide 步骤1 未完成 |
| 后态 | `#view-providers` 可见；若列表空或未在 adding，触发 `#addProvider` → 厂商添加 sheet 打开 |
| 动效 | 按钮 `.12s` color/bg + primary hover brightness；**页面内容瞬时切换**（无 VT）。Add sheet 动效属 Providers，本条只记导航到 sheet 打开 |
| DOM | `view="providers"`；nav providers `.on`；可能 `#addSheet` 打开 / `adding=true` |
| 证据 | `app.js:1556-1562,1698-1705,24330+` · `app.css:1836,1840-1841` |
| 截图约定 | before=Agents guide；after=Providers 且 Add UI 可见 |
| 录制状态 | 源码已录 · after 已有（误名纠正） · before 待录 |
| 注意 | `nav-morph` / `::view-transition*` **不**用于本点击；勿误标 .5s 页动画 |

### A-05 · 管理

| 项 | 内容 |
|----|------|
| 选择器 | `#agentsManage button.ag-manage-button` |
| 操作 | click → `openAgentsManager()` → `openModal(ed)` |
| 前态 | Agents 列表下方「管理」可见（有 ≥1 agent） |
| 后态 | 居中 dialog「批量管理 / Manage agents」：搜索、4 个选择动作、checkbox 行、Hide/Unhide/Done |
| 动效 | 见总表：backdrop 280ms；dialog spring 570ms；opacity ~220ms；关闭走 `closeConfirmAsk`→`closeModal`（260–380ms `IOS_EASE`，可折回源按钮） |
| DOM | `#modal` 去 hidden、`.lib`；`.editor.ag-manager`；`confirmAsk` 指向编辑器 |
| 证据 | `app.js:2511-2637,8062-8109,16865-16874,7974-7979` · `app.css:3924-3942` |
| 截图约定 | before=Agents；after=modal 完全展开（动画结束后） |
| 录制状态 | 源码已录 · 截图待录 |
| 派生 | 打开后内页控件见 A-15…A-24（下批） |

### A-06 · 安装其他 Agent

| 项 | 内容 |
|----|------|
| 选择器 | `#agentsInstall button.ag-install-head` |
| 操作 | click 切换 `installsOpen` → `paintInstalls()` |
| 前态 | 空态默认 **collapsed**（有 Cursor 时 `installsOpen ?? false`）；文案「安装其他 Agent（14）」类；`aria-expanded=false`；chev 0° |
| 后态 | `aria-expanded=true`；chev 180°；下方 note + 各未装 agent 行（命令+复制） |
| 动效 | chev **.3s** `cubic-bezier(.22,1,.36,1)`；内容 **瞬时** mount（非 `.agent-fold`） |
| DOM | `#agentsInstall` 子节点：head 仅 ↔ head+note+rows |
| 证据 | `app.js:2305,2338-2393` · `app.css:628-645` |
| 截图约定 | before=collapsed；after=expanded 露出 ≥2 行；可选 mid=无（chev 过渡难抓） |
| 录制状态 | 源码已录 · 截图待录 |
| 派生 | A-11…A-14 在 expanded 后录 |

### A-08 · ＋ 保存当前

| 项 | 内容 |
|----|------|
| 选择器 | `.profiles #save` |
| 操作 | 首次 click 开命名；有输入后再 click 或 Enter 保存；Escape / blur 取消 |
| 前态 | 文案「＋ 保存当前」；chips 区 hint「还没有 · 保存当前设置…」 |
| 后态 | `.profiles.naming`；左侧/前方 `input.chip-input` focus；按钮文案「Save」 |
| 动效 | 无开场 transition；accent 边框即 focus（`:focus-visible { outline:none }`） |
| DOM | 见总表；`closeSave` 移除 input、去 naming、文案还原 |
| 证据 | `app.js:5364-5390,738-754` · `app.css:1893-1899,1815-1820` |
| 截图约定 | before=默认；after=naming 态（勿真保存污染 profiles，Escape 关掉即可） |
| 录制状态 | 源码已录 · 截图待录 |

### A-09 · 顶栏刷新

| 项 | 内容 |
|----|------|
| 选择器 | `button#sync.icon` |
| 操作 | click → rescan agents |
| 前态 | 无 `.spin`；title「重新检测本机的 Agent…」 |
| 后态 | 短暂 `.spin`；结束停在整圈；footer `.status.ok`「已重新检测 Agent」；列表/安装区可能刷新 |
| 动效 | `spin` **.9s linear infinite** on `svg > *`；结束对齐 iteration |
| DOM | class `spin` 加/删；status 文案与 `.ok` |
| 证据 | `app.js:24556-24580,24532-24538` · `app.css:253,317` |
| 截图约定 | before；mid=spin 中；after=停转+status |
| 录制状态 | 源码已录 · 截图待录 |

---

## 尚未源码填满的行（下批）

A-03, A-04, A-07, A-10（只读/弱交互）· A-11…A-24（依赖 A-06/A-05）· A-25…A-52（条件）→ 见 CONTROLS.md；视觉队列见 RECORDING-QUEUE.md。

## 截图文件名约定

```
shots/A-{nn}-before.png   # 点击前
shots/A-{nn}-after.png    # 稳态后
shots/A-{nn}-mid.png      # 可选：动画中（A-09 spin、A-05 modal 打开中）
shots/A-{nn}-hover.png    # 可选：hover
```

相对本目录：`interactions/pages/agents/shots/`。
