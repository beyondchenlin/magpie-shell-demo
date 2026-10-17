# Magpie / Tagma 壳 · Component & Interaction Spec（CIS）

> **用途：** 以后加按钮、加页、改控件时，按本文件保持 Magpie 视觉/交互对齐，并让 Tagma 产品壳不乱风格。  
> **对照源：** `magpie-shell-demo` v0.1.71 · `SHELL-APPEARANCE-LOGIC.md` · `MAGPIE-TEARDOWN.md` · `INTERACTION-PLAN.md` · `GAP-MATRIX.md` · `ACCEPTANCE.md` · `docs/last-cycle.md` · `src/`  
> **日期：** 2026-10-15（Asia/Shanghai）  
> **非目标：** 本文不是 PRD；不代替点录；不宣称全应用 1:1 PASS。

---

## 0. 状态快照（写 CIS 当日）

| 项 | 值 |
|----|-----|
| Demo 版本 | **v0.1.129** |
| 最近可携带包 | `Magpie-Shell-Demo-0.1.71-portable.exe`（见 `docs/last-cycle.md`） |
| 最近完成 nest | **Plugins 104–138**：reinstall Think Tags+Word Guard · sort A→Z/Z→A · Options Save/Escape/Not JSON/Clear confirm · Bun 1.4.3 |
| Nest 状态 | **进行中**（104–138 已消费；下一切片仍建议 Gateway 深态） |
| 此前大块已消费 | Agents 19–54 · Library/Skills～219（含 MCP health/OAuth + Instructions/projects） · Providers～60 · Routing～30 · Usage 01–50 · Settings～183 · Tray 01–14 · Plugins 01–138（含 Install/Off/Remove confirm/Detail） |
| 诚实剩余 P1 | 真网关飞鸟 hop · 真 OAuth/key 落盘 · Allowances 配额正文（无订阅时原生隐藏，**不编造**） |
| 产品关系 | Magpie 全壳 1:1 = **外观/点录轨**；Tagma 产品 P0 = **默认三页**（对话 / 供应商 / 队员市场）。两轨并行；点录 **不**阻塞产品 P0 |

**CIS chrome 波：** 已收口于 **v0.1.126**（见 §10.7 PrefRow recipe）。**v0.1.129** 续 Magpie 1:1（Library health/tools/radio + drop lib-switch invent；**v0.1.128** bar/guide-x；**v0.1.127** livedot+hideGuide）。

**建议恢复 nest 的下一切片（见 §8）：** Gateway 深态（not-running / Start / take-over / Restart 全路径）——Plugins 主线已到 90；Settings 磁盘无 71–85。

---

## 1. Design tokens（必须用变量，禁止硬编码色）

色与字写在 `src/styles/app.css` `:root`；主题只改 `html[data-theme]` / `data-fonts` / `--zoom`，**JS 不写死色值**。

### 1.1 浅色（默认）

| Token | 值 | 用途 |
|-------|-----|------|
| `--bg` | `#f4f4f6` | 窗底 |
| `--card` | `#ffffff` | 卡片 / 侧栏选中 |
| `--card-2` | `#f9f9fb` | 展开编辑器底 |
| `--pill` / `--pill-hover` | `#f1f1f4` / `#e9e9ee` | 弱底钮 / hover |
| `--seg-track` / `--seg-thumb` | `#e6e6eb` / `var(--card)` | 分段轨 / 滑块 |
| `--seg-edge` | `0 1px 2px rgba(0,0,0,.14), 0 0 0 .5px rgba(0,0,0,.08)` | 选中浮起 |
| `--ctl-fg` | `#63636b` | 未选分段字 |
| `--line` / `--line-2` | `#e3e3e8` / `#ececf0` | 描边 / 弱线 |
| `--fg` / `--fg-2` | `#1c1c21` / `#4b4b53` | 主/次文字 |
| `--muted` / `--faint` | `#85858d` / `#b9b9c2` | 提示 / 更弱 |
| `--accent` | `#4f46e5` | 靛紫主色（Tagma 管理面同调） |
| `--accent-soft` / `--accent-fg` | `#eeedfd` / `#ffffff` | soft 填充 / 反白 |
| `--sel` | `#ecebfb` | 选中浅底 |
| `--green` / soft | `#189a58` / `#e4f6ec` | 成功 / ok toast |
| `--red` / soft | `#d64545` / `#fbe9e9` | 危险 / err |
| `--amber` / soft | `#b45309` / `#fbf0df` | 警告 lift |
| `--drift` / soft | `#ce2c31` / `#feebec` | 漂移/严重 |
| `--pop-bg` | `rgba(255,255,255,.94)` | 浮层 |
| `--shadow` | 多层大阴影 | modal / pop |
| `--font` | SF Pro / Segoe / system | UI |
| `--code` | ui-monospace / SF Mono… | 代码 |
| `--ease` | `cubic-bezier(.2, .8, .2, 1)` | **全局默认曲线** |

暗色：`data-theme="dark"`（或系统 dark 且非 light）——`--bg #1a1a1e`、`--accent #a5b4fc` 等；见 teardown §2.2。Windows：`:root.win` → Segoe + 雅黑。

**换肤规则（Tagma）：** 可改 `--accent` 品牌色；**保留**间距、圆角节奏、`--ease` 与 motion 表。侧栏选中 **不用 accent**（白卡 + `--seg-edge` graphite）。

### 1.2 圆角节奏（无统一 `--radius`，按控件级别）

| 级别 | 典型值 | 例 |
|------|--------|-----|
| 微 | 4–6px | focus ring、小 tag、`.nav-sub` 钮 |
| 控件 | **7–8px** | 侧栏行 7、icon 钮 7、seg 轨 8 / thumb 6、Restart～8 |
| 卡片 | **10–12px** | logo 盘 10、`.pm-card` 12、`.rt-node` 12 |
| 舞台 | **14px** | `.rt` 路由舞台 |
| 胶囊 | `999px` | toast、部分 pill |
| 托盘窗 | **12px** | `body.panel` |

### 1.3 字号 / 行高 / 间距

| 项 | 值 |
|----|-----|
| 正文基线 | **13px / 1.4**（`body`） |
| 分段钮 | 12.5px；挤时 12 / 11.5 |
| 分组标签 `.nav-gl` | 11px · weight 500 · letter-spacing .04em · `--muted` |
| 顶栏高 | **46px**（Mac 侧栏态约 50px/zoom） |
| 侧栏行 | h **30px** · gap **9px** · pad `0 8px` |
| 侧栏宽 | `--side-w: 212px`（≤859 → 184）；拖 168–320 |
| 默认窗 | **660×600**；最小约 560×420（100% 字号） |
| `SIDE_AT` | **1024**：窄窗顶栏 tabs（桌面金标）；宽窗可侧栏 |

### 1.4 CSS 文件分工

| 文件 | 职责 |
|------|------|
| `src/styles/app.css` | tokens + 通用壳/控件（Magpie 同源风格） |
| `src/styles/shell-patch.css` | demo 壳补丁、页级微调、已移植 keyframes |
| `src/styles/routing.css` | Routing 舞台 / 飞鸟 / 账号行 |
| `src/styles/context.css` | Context 评分卡 / waffle |

**禁止：** 在页面 TSX 内联写死 Magpie 色；新动效绕过 §2 motion 表自创「看起来像」的 transition。

---

## 2. Control patterns（控件字典）

实现时优先复用 `src/components/*` 与已有 class；没有同名组件就先对齐 DOM class，再抽组件。

### 2.1 分段 `Segs` / `.segs` / `.opt`

- 一组 `.opt`；选中 `.on` + **thumb 滑动 280ms** `cubic-bezier(.2,.8,.2,1)`（`useSegThumb`）  
- `aria-pressed`；hover color/transform **.18s / .14s** `--ease`  
- 用途：API/Shell/OS、Settings Off/On、Usage period 等

### 2.2 文本钮 / 图标钮

- `.text` / `.text.action` / `.icon`：bg/color **.12–.16s** `--ease`  
- `:active` scale **.96**（icon **.9**）  
- Restart 等：白底 + 1px `--line`，勿做成大实心 CTA（除非 Magpie 同源 `.pm-act.get`）

### 2.3 折叠 `.fold`

- `aria-expanded` + chevron；svg **transform .15s ease-out**；开 → `rotate(90deg)`  
- 状态可持久：`magpie.gwConnectFolded` 等

### 2.4 开关 `.lib-switch`

- track bg **.18s**；thumb translateX **.18s** `--ease`  
- Agents 连接 / Providers / 插件 Switch off|on

### 2.5 Chip / pill

- 弱信息：`--pill` 底；状态 chip（Installed / Up to date / Middleware）跟 Magpie 文案与色，**不自创 Saving…** 除非 NOTES 有  
- 侧栏选中：白卡 + `--seg-edge`，图标跟 `--fg`（非 accent）

### 2.6 Toast `#status` / `.status`

- kind：`.ok` / `.err` / `.warn`  
- 默认 **～3.5s** 清；err 可 **～8s**；opacity **.2–.3s**  
- Copy 成功：`.copy.done` + `copy-pop` **.36s**，图标 ✓ 约 **1200ms** + toast `{what} copied`

### 2.7 Modal / Dialog `#modal` / `.dialog`

- 开：fade **～280ms** + spring **～570ms**（`useModalAnim`）  
- Esc / 遮罩：以 **该控件 NOTES** 为准（例：Plugins detail Escape **不**关；Import Claude Escape **不**关；多数 Confirm Esc/Cancel 关）  
- 危险确认：`.action-confirm` 文案 + Cancel 默认焦点 / danger 钮

### 2.8 浮层 `#pop` / ModelPop / ProtoMultiMenu

- 开：`pop-fade` **.18s** + `pop-in` **.42s** cubic-bezier(.16,1,.3,1)  
- 关：`pop-out` **.22s** cubic-bezier(.4,0,.7,.2)  
- 左轨 `.rail-thumb` **260ms**；Disable / Favorites 等同套

### 2.9 菜单钮 `.pref-pick` / sess-pick

- chevron **.15s**；open 旋转 180°  
- 字体菜单、Usage refresh every、语言等

### 2.10 列表行 / 卡片

- `.row` / `.list` / `.pm-card`：hover border/shadow **.16s**；勿另起一层「Dashboard 卡片美学」  
- Providers 行 / Agents 行：跟官方 DOM 层级，不扁平化成单行 icon+title

### 2.11 Nested panels（页内嵌套，非新路由）

- Settings：`.set-page` **hidden 切换，不卸载**  
- Plugins Options：行内 textarea，非新 modal（Think Tags）  
- LAN Share On：高度 **.28s** 展开 Address 行  
- Export/Import：行内 expand，**无 scrim**（Appearance NOTES）

### 2.12 点击顺序与焦点（录制纪律）

1. **阅读/点击顺序：** 左→右，上→下（LTR / TTB）；一页先空态可见控件，再二级（fold → modal → popover）  
2. **Esc：** 只关 NOTES 允许关的层；禁止「一律 Esc 关一切」  
3. **Busy：** 按钮文案/宽度跟 Magpie（例：Plugins Install → **Getting Bun…** 有 spinner；Manual github fail → **Installing…** **无** spinner）  
4. **不发明：** NOTES 没出现的 chip/toast/配额卡片 → 不实现  
5. **reduced-motion：** `prefers-reduced-motion: reduce` 时 `.view` 改 opacity-only；尊重已有 reduce 分支

### 2.13 Motion 速查（缺动效 = 未对齐）

| 名称 | 时长 | 用在 |
|------|------|------|
| `view-in` | **.24s** `--ease`（+Y 5px） | 进页 |
| segs thumb | **280ms** | 分段 |
| fold chevron | **.15s** | 折叠 |
| copy-pop | **.36s** | 复制成功 |
| sync spin | **.9s** linear | 顶栏刷新 |
| nav-hl | **.3s** cubic(.25,.9,.3,1) | 侧栏高亮 |
| nav morph | **.5s** cubic(.32,.72,0,1) | 顶↔侧（可选） |
| `#pop` in/out | .18+.42 / .22 | 模型浮层 |
| modal | ～280 + 570 | 对话框 |
| `rtflap` | **.42s** | 路由飞鸟翅 |
| theming | **.35s** / clear 450ms | Appearance |
| lib/pm skeletons | 见 `shell-patch`（`pm-pulse` `lib-bob`…） | 搜索/探针 |

完整表以 `SHELL-APPEARANCE-LOGIC.md` §4 为准；新增控件必须对照 Magpie 同选择器补一行。

---

### 2.14 Library folder / Backups（library 88–100）

- Head 第二行 LTR：**Discover**（仅 MCP/Skills）· **Library folder** · **Backups**；idle 无 tip
- Tips（暗 tip / `title`）：Library folder = 一行 `~/.config/magpie/library`；Backups = 两行 `magpie keeps a copy…` + `~/.config/magpie/backups`（**不是** `library/backups`）；752px 可贴边裁切
- 点击：真 Magpie 外抛 OS 文件管理器；demo 用 Thunar 叠层（路径/嵌套夹对齐 NOTES）。**Escape 不关、不上翻**（仅关 File 菜单）；关窗用 × / File → Close Window；无 Cancel；Backups 右键无菜单
- 外抛真实 Thunar 时 Escape N/A（焦点在外部进程）

### 2.15 In projects → Choose a project（library 101–119）

- **Add a project** 内联卡：placeholder · **Choose…** / **Add** / **Cancel**；这些控件 **无 tip**
- **Choose…** → Magpie 自有 GTK 对话框 **Choose a project**（demo 叠层；**不是** Thunar）。侧栏 Recent（空）/ Home / Desktop / workspace / Other Locations；脚 **Cancel** / **Open**（Open 字色深，非灰禁用）
- Escape：先关 location 栏（及补全），再关对话框；表单路径不变。对话框 Cancel 同。Sheet Escape **仅** path 聚焦时关卡；空 Add = no-op。Open@Home → 填 `/home/box`，**不**提交项目
- 项目行 skill 勾选仍未点录 → 不实现

### 2.16 In projects 行（library 120–147）

- Add → toast **{name} added — pick the skills it gets**；行 **默认展开**
- **Copy files instead of linking** 开关：On → 名旁 **Copies** + 副本说明 + toast **gets copies now**；Off → 链接说明 + **gets links now**（默认 links）
- 技能行 Cursor 芯片：关 tip **Give it to Cursor**；开 toast **{skill} is in {name} for Cursor**、tip **has it — click to take it away**；关 toast **is out of {name}**
- 文件夹图 tip：展开 **Hide its skills** / 折起 **Pick the skills it gets**；名字 tip=项目名；垃圾桶 tip **Remove the project**（hover 变红）；折起且已放置时药丸；右键无菜单
- Remove：有 placed 才有 **Keep its skills…**；勾脏后 Cancel → **Discard unsaved changes?**；Discard **不**删项目；无 placed 无勾选；Remove toast **{name} removed**

### 2.17 Instructions dirty/save/new-set（library 148–183）

- Radio tip：在用 **The agents switched on below read this set**；未在用 **Switch the agents to this set**（点即切换）。**In use** 药丸同在用 tip
- 名字 Escape 撤回未提交改名；正文 Escape **不**丢弃。底栏 sticky：**Not saved yet / Discard / Save**；折起才改副标题为首行 + 琥珀 **Not saved yet**
- Discard 对话框 Cancel/Escape 留字；红 Discard 丢弃不写盘。Ctrl+S / Save toast **Saved — the agents already had it**（无 agent 指令文件）
- 新套：空 Add no-op；Escape/Cancel 丢草稿；**Keep in a file…** = 内联路径。在用空时 Add → toast **… added — the agents read it**。Remove 两步红字（非对话框）；在用时禁用+tip
- 不做：agent 行 / Your file 已提交套 / Enter 创建 / Discard 点遮罩

### 2.18 MCP health / tools / OAuth refuse（library 184–219）

- 已装行健康：**checking…** / **no answer to initialize**（30s tip + 再检查）/ 绿 **N tools**（see/hide）/ **needs sign-in**
- 工具列表开关 → toast **Tools of {name} saved**；Cursor 在用时注 can't turn off single tools；**Check again**
- 芯片 Written/Removed from Cursor；**By agent**；**Turn off all N?** Escape 不关
- MCP In projects：aside `.cursor/mcp.json`；place/out toast
- HTTP **Save and sign in** → **Finish signing in…** → 厂商墙 Cancel → **access_denied**（未 Approve）
- 不做：Select / 排序 / Remove all / Copy config / not checked / 签到成功

## 3. Page / IA 规则（Magpie 全壳 vs Tagma P0）

### 3.1 Magpie 桌面壳 IA（demo 金标）

**桌面默认 = 顶栏 tabs**（660×600，`SIDE_AT=1024` 以下）。宽窗 / 用户强制才侧栏。  
**不是** Linux 页内关闭钮；**不是** web 宽屏侧栏截图。

| 分组 | `data-view` | 默认是否出现 |
|------|-------------|--------------|
| Work | `agents` | ✅ |
| | `sessions` / `library` | ❌（`data-feature`；demo 用 `magpie.feature.library=1` 才开 Library） |
| Models | `providers` · `routing` · `gateway` | ✅ |
| Insights | `usage` | ✅ |
| Extend | `plugins` | ✅ |
| 脚 | `settings`（`#prefs`） | ✅ |

路由：demo 用 `location.hash`（`#agents`…）；Magpie 用 `view` + plugin `slots.page`。

### 3.2 Tagma 产品 P0（PRD 冻结）vs Demo

| 面 | Tagma P0 | Magpie demo | 规则 |
|----|----------|-------------|------|
| 对话 / 内置 Agent | ✅ 默认三页之一（可假→长线 Pi） | ❌ 无对应对话页 | **产品页**；风格可暖底子集，控件仍用本 CIS tokens/motion |
| 供应商 | ✅ | ✅ Providers | 管理面 **跟 Magpie** |
| 队员市场（含组合入口） | ✅ | ≈ Plugins / 扩展感 | 信息架构产品化；**控件字典仍用本 CIS** |
| Routing / Usage / Gateway 深运维 | 二层，非默认三页 | ✅ 全壳 | Demo 继续 1:1；**Tagma 默认导航不膨胀** |
| Settings | 需要时进二层 | ✅ | 保留 pattern；文案/前缀可迁 `tagma.*` |
| Sessions / Library | 非 P0 默认 | feature 关 | 勿当缺口 |

**判定：**

- **Demo-only（继续 nest）：** Magpie 全导航、Routing 舞台飞鸟、Usage 四 Tab、Plugins Discover 细节、Tray panel…  
- **Tagma-keep：** tokens、segs/fold/toast/modal/pop、顶栏/侧栏 chrome、`.row`/卡片节奏、英文 i18n key 策略、加控件 checklist（§4）  
- **Tagma 改名：** 产品名、logo、`magpie.*` localStorage 前缀（需迁移层）、业务文案

### 3.3 壳 DOM 骨架（两边都保留结构）

```
aside#side.sidebar     ← body.side-nav
header.top             ← brand | sideToggle | crumb | #nav.seg | actions
main.view#view-*       ← 一页一个 main
footer.foot            ← #status toast
#modal / #pop          ← 对话框 / 浮层
```

**扩展新页：** 加导航 `data-view` + `#view-xxx`（或 Tagma 等价 id）+ 进页 `view-in`；**不要另起一套路由壳或 Dashboard 布局。**

---

## 4. 如何加一个新控件（强制 checklist）

以后「新加一个按钮 / 一行设置 / 一个弹层」按此顺序，避免风格漂移与假 1:1。

### 4.1 Magpie 1:1 轨（外观 demo）

1. **定范围** — 写清页面 + 控件文案/选择器；查 `interactions/pages/<page>/CONTROLS.md` 是否已有 id  
2. **录 nest（computerUse / 父代理）** — 空态 → 点击前 → 中 → 后；截图进 `interactions/native-linux/<page>/` 或 `pages/.../shots/`；**同时写 NOTES**（文案、busy、Esc、toast、不点的项）  
3. **填 Spec** — `INTERACTION-PLAN` 表：操作 · 动效 · DOM class · 源码位置 · `demo状态=已录`  
4. **对照源码** — `magpie-src/internal/gui/assets/` 同选择器的 transition / 定时器；补 §2 motion 行  
5. **实现** — 同名 DOM class；优先复用 `Segs` / `ModelPop` / toast；mock 状态机允许，**禁止编造 NOTES 没有的 UI**  
6. **验收** — 同路径对照；更新 `GAP-MATRIX` / `ACCEPTANCE` / `docs/last-cycle.md`；bump `package.json` version；需要时打 portable  
7. **宣称纪律** — 一页未录完 **不**宣称该页 1:1；P1 缺口保持诚实

### 4.2 Tagma 产品轨（新功能进三页 / 二层）

1. **先问 IA** — 是否必须进默认三页？能挂二层 / 市场入口就不加顶栏项  
2. **选型** — 在 §2 字典里找最接近的 pattern（segs / fold / text / switch / modal / pop / toast）  
3. **Tokens only** — 颜色/圆角/字号走变量；accent 可品牌化，节奏不改  
4. **Motion** — 使用 §2.13 已有时长；新动画先补 CIS 一行再写 CSS  
5. **i18n** — 英文 key → zh；JSX 不硬编码中文业务句（demoCopy 仅说明性）  
6. **持久化** — 新 prefs 用产品前缀（未来 `tagma.*`）；勿与 snippet `magpie.snipLang` 类键冲突  
7. **记录** — 在实现 PR/笔记写「用了哪条 CIS pattern」；若偏离 Magpie，写明 **有意产品差异** 而非 silent drift

### 4.3 一句话流程（两边共用）

```
record nest → NOTES → Spec/consume → 同 class + motion → GAP 诚实 →（demo）portable release
```

---

## 5. Naming / 文件约定（demo 仓库）

### 5.1 源码

| 路径 | 约定 |
|------|------|
| `src/App.tsx` | 壳 chrome、侧栏拖宽、hash 路由、`SIDE_AT` |
| `src/pages/*View.tsx` | 一页一文件；Settings 子块在 `pages/settings/` |
| `src/components/` | 可复用控件（`Segs` `ModelPop` `Bird` `ProtoMultiMenu`…） |
| `src/data/` | `mock.ts` NAV/ViewId；`presets.json`；demo 数据 |
| `src/i18n.ts` + `data/zh.json` | 英文 key → 译文 |
| `src/styles/` | 见 §1.4 |
| `electron/` | 桌面包装；视觉仍以 webview CSS 为准 |

### 5.2 交互资产

| 路径 | 约定 |
|------|------|
| `interactions/pages/<page>/CONTROLS.md` | 可点清单 + id（A-01 / P-01 / S-01…） |
| `.../SPEC.md` | Interaction Spec 表 |
| `.../RECORDING-QUEUE.md` | 实机点击顺序 |
| `.../shots/{id}-before\|after\|mid.png` | 截图 |
| `interactions/native-linux/<page>/NN-*.png` + `NOTES.md` | 主 nest 源（Linux 原生窗内容参考；**金标 chrome 仍是 Win/Mac 顶栏**） |
| `interactions/win-mac/` | 顶栏 chrome 金标说明 |

### 5.3 文档与版本

| 文件 | 何时更新 |
|------|----------|
| `GAP-MATRIX.md` | 每 bump： consumene st 结果 + 诚实 P1 |
| `ACCEPTANCE.md` | 验收条目 |
| `SHELL-APPEARANCE-LOGIC.md` / `docs/` 副本 | 新 pattern / motion |
| `docs/last-cycle.md` | **每个 nest 周期结尾** |
| `package.json` `version` | 语义化 demo 版本（现 0.1.x） |
| `preview-*.webp` | 可选预览图 |

### 5.4 localStorage 键（demo）

- UI 布局：`magpie.navLayout` · `magpie.sideWidth`  
- 功能开关：`magpie.feature.library` · `magpie.feature.otel`  
- Demo 假数据：`magpie.demoAgents` · `magpie.demoProviders` · `magpie.demoGw` 等  
- **注意：** Magpie 上游 UI locale ≠ `magpie.lang`；demo 暂用 `magpie.lang` / snippet `magpie.snipLang` —— 合并上游时要迁移

Tagma 产品实现应规划 `tagma.*` 前缀，避免永久绑死 magpie 键名。

---

## 6. 已知缺口（诚实）

### 6.1 仍开放 P1（壳保真）

| # | 项 | 说明 |
|---|-----|------|
| 7 | 真网关飞鸟 | `rtflap` 已齐；hop 仍 mock，非 live gateway trace |
| 9 | 真 OAuth / key 落盘 / arrange persist | 列表与编辑器壳已有；NOTES 故意未点登录/存钥 |
| — | Allowances 配额正文 | 无订阅时原生整段隐藏；**禁止编造余额卡**；需 signed-in 点录才做 |

### 6.2 有意 Demo / 范围外（非失败）

- 无真后端、真 npm/Bun、真 session 扫描、真 Detect HTTP  
- Electron 标题栏 vs 各 OS 原生 chrome 差异  
- Usage「显示演示图」开关  
- OS 字体枚举用 catalogue mock  
- OTel / Observability tab 默认隐藏  
- Sessions 默认不进导航  

### 6.3 Nest 暂停相关

- **v0.1.69 后 nest 暂停**（产品讨论）；磁盘上 Plugins 已到 90、Library～87、Settings 无 71–85 帧  
- Gateway「仍可再抠」（GAP #10）：非 running / take-over / 更深 Restart 与 filled models  
- 不把「暂停」写成「已 100% 1:1」

### 6.4 产品轨（非本 demo 缺口）

- Tagma 三页 IA、sidecar 网关、Skill/MCP/CLI、内置 Pi Agent：见 `/workspace/tagma-prd-2026-10-15.md`；**不**要求本 demo 实现  

---

## 7. 快速决策树（加东西时）

```
要加的东西 →
  ├─ Magpie 里已有同控件？ → 走 §4.1 nest→NOTES→consume
  ├─ 仅 Tagma 产品有？     → 走 §4.2：三页 IA？选 §2 pattern？tokens+motion
  ├─ 只是换文案/品牌？     → 改 i18n / accent；不动 DOM class 与时长
  └─ 想「好看一点」自创？  → 停止；先改 CIS 再改 CSS
```

---

## 8. 建议的下一 Magpie nest 目标

**主推荐：Gateway 深态切片**

- 理由：Plugins 71–90 已收口；Agents/Library/Providers/Settings/Usage/Tray 主 nest 已大块消费；GAP 仍标 Gateway 可再抠；且 `?gw=off|older` / Restart busy 与产品「壳+网关 sidecar」叙事最相关。  
- 范围建议：not-running → Start；take-over「Quit magpie {v}」文案；Restart hover→busy→after 全帧；Connect/Models 空态回归；**不**发明真 port Apply / 真 key mint。  
- 出口：NOTES + demo bump（如 v0.1.70）+ `last-cycle.md` + GAP 更新。

**备选：**

1. Settings：**有新帧 71+ 再录**（当前磁盘无）；或 Sync Export/Import / About Check 对照源码微修  
2. Routing：live 请求路径（依赖真/演示 gateway，服务飞鸟 P1）  
3. Library：第二 skill 后的 Group / Update all / head Turn all（单 skill 时原生没有）  

**恢复纪律：** 父代理 computerUse 负责录；实现代理只 consume NOTES——与本 CIS §4.1 一致。

---

## 9. 文档关系

| 文档 | 角色 |
|------|------|
| **本 CIS** | 加按钮/加页的**日常规范**（tokens · pattern · checklist） |
| `SHELL-APPEARANCE-LOGIC.md` | 外观机制长文 + motion 全表 |
| `MAGPIE-TEARDOWN.md` | 上游事实拆解 |
| `INTERACTION-PLAN.md` | 点录方法论与 Spec 模板 |
| `GAP-MATRIX.md` | 版本差分与诚实缺口 |
| `tagma-prd-*.md` | 产品冻结（三页 · 网关 · Agent 长线） |

*CIS 版本：2026-10-15 · 对应 demo v0.1.69 · nest 暂停于 Plugins 71–90*

## v0.1.88 library 220–237 MCP chrome
- Idle **not checked** (+ tip); unset `${NAME}` badge/tip; editor TOKEN / `${MAGPIE_PROBE_UNSET}` + `${NAME}` hint.
- Sort A→Z/Z→A; Select (Done, N selected, Copy config…, Remove…, Clear).
- Copy config… → Cursor; toast paste into `.cursor/mcp.json` (no write).
- paste-JSON fill + Escape→Discard; Remove all → empty card.
- No Signed in/Sign out; no Vercel; no portable.

## v0.1.89 providers 61–93
- Search open → OpenAI/Zhipu/Azure/Open* relays; Escape clears, sheet stays.
- Import CC Switch / Claude Code Not found; Antigravity risk+import; ChatGPT/API/Gemini CLI walls.
- List: Find a provider, drag/Move menu, On tip; Ollama empty-key add+remove; empty default OK.
- Skip thin: Copilot device-code deepen, two-row sort, Turned off fold.
- No Vercel; no portable.

## v0.1.90 providers 94–116
- Copilot device-code (placeholder code): Copy/Copy link, GHE, Proxy Global/Direct/Custom…
- Two-row sort Move down → Provider order saved + order ids.
- Turned off fold collapsed; SWITCHED OFF; On/Off tips; fold tip; off editor keys-kept note.
- Empty list after remove. Skip thin: Show-turned-off tip polish, drag motion, account fold.
- No Vercel; no portable.

## v0.1.91 appearance / top-bar / narrow clamp
- Settings Appearance segs (System, 110%, fonts, tray) + selected white thumb/shadow.
- Top-bar selected pill for Agents…Plugins.
- Routing peer empty-gateway copy; readable at ~616.
- Web frame 752×652, min-width 560 CSS (~616 at 110% zoom); top-bar/Settings hold.
- Providers: Show the providers turned off tip; drag lift + Escape cancel.
- No Vercel; no portable.


---

## 10. Component contract（强制复用 · 2026-10-15）

> **目的：** Settings / 加供应商 / 加模型 / 自创控件 **必须**走本表。禁止页面内联「看起来像」的新控件样式。  
> **原则：** DOM class = Magpie 开源同源（`.text` `.segs` `.row.pref`…）；React 包装只映射这些 class，**不**另起 `mp-*` CSS 层（避免双轨漂移）。  
> **consume 规则：** 新屏先查本表 → 用 `src/components/*` → 缺组件则先抽再写页；一屏一用的 class 禁止。

### 10.1 React 包装 ↔ Magpie DOM

| React（`src/components/`） | DOM / class | 状态 | 圆角 / 字 | Motion |
|----------------------------|-------------|------|-----------|--------|
| `Segs` | `.segs` > `.opt` + `.thumb` | default / `.on` / hover | 轨 7–8 · thumb 5–6 · 12.5px | thumb **280ms** cubic(.2,.8,.2,1) |
| `TextBtn` | `.text` · `.text.action` · `.text.primary` · `.text.danger` | default / hover / `:active` scale .96 / disabled / `.busy` | 6–8px · 12px | bg/color **.12–.16s** `--ease` |
| `WordsField` | `input.words` | default / `:focus` accent ring / `aria-invalid` → `--red` | **7px** · 12.5px · h 27 | border/shadow **.12s** |
| `LibSwitch` | `button.lib-switch` + `i` · `.on` | off=pill / on=`--fg`（**非 accent**）/ disabled | 胶囊 · track 32×18 | bg+thumb **.18s** `--ease` |
| `PrefRow` | `.row.pref` > `.who`/`.name`/`.sub` + `.val`（可选 `wrapVal={false}` 无 `.val`；`afterWho` 插在 `.who` 内；`dataUser`/`dataPattern`/`subClassName`） | — | min-h 50 · pad 8/12/8/14 · gap 14 | — |
| `ModelPop` / `ProtoMultiMenu` | `#pop` / `.pop` | open/close | pop 圆角跟 shell | in .18+.42 / out .22 |
| （页内仍可）`CopyBtn` pattern | `.copy` / `.copy.done` | idle / done | — | copy-pop **.36s** |
| （壳）nav | `#nav .opt` / `aside .on` | 白卡 + `--seg-edge` | 侧栏行 7px / h 30 | nav-hl **.3s** |
| `Fold` / `FoldChev` | `button.fold` + chevron + `.label` / `.note` | `aria-expanded` | 6px pad · faint | chevron **.15s** ease-out |
| `StatusToast` | `#status.status` (+ `.ok`/`.err`/`.warn` / `.lift`) | idle / kind | 胶囊 | opacity **.2–.3s** |
| `ActionConfirm` | `dialog.action-confirm` (+ `.extra`) | open / Cancel focus | 14px · max 420 | Magpie confirmAction |

**已抽（v0.1.104–107）：** PrefRow / TextBtn / WordsField / LibSwitch / Tick / PrefPick / FieldPill / Fold / StatusToast / ActionConfirm。  
**已抽（v0.1.113）：** Library Thunar / Choose-project GTK 叠层（`.lib-thunar*` / `.dialog.gtk-choose-project`）。
**已抽（v0.1.114）：** LibraryView 页内 layout/field `style={{…}}` → Magpie `library.css` + CIS wrappers（232→1；仅 health color token）。
**已抽（v0.1.115）：** SimpleViews Usage/Plugins layout `style={{…}}` → Magpie `plugins.css` + bridge（118→10；metric CSS vars）。
**已抽（v0.1.116）：** RoutingView layout `style={{…}}` → Magpie `.rt-*` + bridge（58→10；`--agent`/`--bar`/replay left；fromHub/max560 保留）。
**已抽（v0.1.117）：** AgentsView/NestedBlocks（+ GroupEditor/ModelPop leftovers）layout `style={{…}}`（Agents 29→6 · Nested 24→2 · CSS vars only）。
**仍 Open（下一刀）：** tip src `style={{` 仅余 CSS vars / pop geometry tokens（SimpleViews/Routing/Agents/Nested/LedHeat/pops）。Aside from future nest。

### 10.2 选型决策（Settings / add-model）

| 需求 | 用 | 不要用 |
|------|-----|--------|
| 二～四选一 | `Segs` | 原生 `<select>`、自绘 radio 组 |
| 开/关 | `LibSwitch` 或 Off/On `Segs`（跟 NOTES） | accent 实心开关、Ant Switch |
| 短文本 / 端口 / token | `WordsField`（`input.words`） | 无 class 的 `<input>`、重 UI Input |
| 设置一行 | `PrefRow` | 自定义 flex 行、Dashboard 卡片行 |
| 次要操作 / Apply / Cancel | `TextBtn` | 大实心 CTA（除非 Magpie `.text.primary` / `.pm-act.get`） |
| 主保存（accent） | `TextBtn variant="primary"` | 自创渐变钮 |
| 危险 | `TextBtn variant="danger"` + confirm NOTES | 红边框自创 |
| 列表选中 | 侧栏/顶栏既有 `.on` | accent 底选中条 |

### 10.3 Spacing / radius / type 速查（控件级）

摘自 §1；实现时只引 token / 已有 class，不重写数。

- 正文 **13/1.4**；控件字 **12–12.5**；hint **11–11.5** `--muted`
- 控件圆角 **7–8**；卡片 **10–12**；路由舞台 `.rt` **14**；toast 胶囊
- 设置行 min-h **50**；侧栏行 h **30**；`input.words` h **27**
- 主色 `--accent` 仅 CTA / focus / soft；**选中导航不用 accent**

### 10.4 Routing 舞台自适应（live / Waiting）

Magpie `routing.js`：**不用** CSS container query；`ResizeObserver` 给 `.rt-main` 打 `max560`（宽 ≤560 CSS ≈ 616@110%）。

| 宽 | 舞台 | 脚 |
|----|------|-----|
| `rt-main` > 560 | `.rt-stage`：`124px 124px minmax(0,1fr)` · gap 56 | `.rt-foot` 横排 sentence + stats |
| `rt-main.max560`（nest 117） | 两列：agent ‖ magpie；`.rt-accts` `grid-column:1/-1`（No request yet 全宽在下） | foot 竖排，counts 在 sentence 下 |

**飞线：** 旁路用三次贝塞尔；账号在 hub **下方**时走 Magpie `fromHub` 竖巷（`routing.js` layout），禁止仍画水平虚线。`viewBox` 跟 stage 尺寸；`max560` 切换后 **rAF + ResizeObserver** 重算。

### 10.5 Settings / add-provider 已知 mismatch（优先修）

| P | 问题 | 正解 | 状态 |
|---|------|------|------|
| P0 | 页内 `style={{…}}` / 裸 `input.words` | `PrefRow` + `WordsField` + Magpie class | **Done v0.1.104** |
| P0 | add-model 原生 checkbox + 内联 `label.tick` | `Tick` | **Done v0.1.104** |
| P1 | Providers 编辑器 `style={{ gap }}` / icon-pick / headers | Magpie `.icon-pick` `.icon-now` `.icon-grid` `.headers` `.pair`/`.pair.col` `.hhead` `.side` `textarea.json` `.stack` | **Done v0.1.105** — ProviderEditorModal layout styles cleared (only `--detect-n` token left) |
| P1 | discard dialog 内联 modal 样式 | Magpie `.action-confirm` + `showModal` + `.text.primary.danger-fill` | **Done v0.1.105** |
| P2 | Language / font `.pref-pick` | `PrefPick`（`.sess-pick.pref-pick`） | **Done v0.1.106** — Settings Language + FontRow |
| P2 | `.field` 模型行 pill | `FieldPill`（`.field` + `.k`/`.v`/`.chev`） | **Done v0.1.106** — Agents tiers/New sessions + Tray solo |
| — | Providers 列表轻量 chrome（find / none / +Add） | `.pv-tools` `.pv-find` `.pv-none` `.pv-gap` | **Done v0.1.106**（轻量） |
| — | Providers OAuth 墙 / GTK Select Files / Move / Remove | Magpie classes + ActionConfirm | **Done v0.1.112** |
| — | `.fold` / `#status` / `.action-confirm` 页内重复 | `Fold` / `StatusToast` / `ActionConfirm` | **Done v0.1.107** — Gateway+Providers folds; App toast; Providers discard + Plugins Remove/Clear |
| — | Library `LibModal` discard/remove-all/remove-selected；GroupEditor `#modal` | `ActionConfirm` | **Done v0.1.108** — + project discard; Escape via dialog |
| — | Library 其余 danger confirms（skill/project remove、Turn all off、单条 MCP remove、MCP project remove） | `ActionConfirm` (+ `extra` Keep-skills) | **Done v0.1.109** |
| — | Library 非 confirm LibModal（How / by-agent sheets） | Magpie `.modal`/`.dialog.lib-editor` + ehead/list/row/bar/`Segs` | **Done v0.1.110** |
| — | Library MCP/skill/hook/image 编辑器字段 inline | Magpie field/stack/pair + WordsField/Segs/PrefPick | **Done v0.1.111** |
| — | Providers OAuth 墙 / GTK Select Files / Move / Remove confirm | Magpie signing + `.gtk-select-files` + `.pop.move` + ActionConfirm | **Done v0.1.112** |
| — | Library Thunar / Choose-project GTK 叠层（OS chrome mock） | `.lib-thunar*` / `.dialog.gtk-choose-project`（同 Providers GTK 模式） | **Done v0.1.113** |
| — | LibraryView layout/field `style={{…}}` 热区 | Magpie `library.css` + Segs/bridge classes | **Done v0.1.114** |
| — | SimpleViews Usage/Plugins layout `style={{…}}` | Magpie `plugins.css` + bridge / CSS vars | **Done v0.1.115** |

**已落地组件：** `PrefRow` `TextBtn` `WordsField` `LibSwitch` `Tick` `PrefPick` `FieldPill` `Fold` `StatusToast` `ActionConfirm`（+既有 `Segs`）。

### 10.6 Consume checklist（加控件）

1. 本表有包装？ → import，勿复制 DOM  
2. 只有 class？ → 用 class；第三次出现再抽组件  
3. Magpie NOTES 无此控件？ → **不实现**（§2.12）  
4. 动效不在 §2.13？ → 先改 CIS 再写 CSS  
5. tip bump：走 `docs/TIP-CYCLE.md` + `chrome-guard`；**不**动 `SIDE_AT` / 752 框除非 CAUSE

**CIS chrome 波已收口（v0.1.126）：** Settings PrefRow · Providers Segs · Gateway/Library/Routing/Agents · SimpleViews feat/Usage/Plugins。勿再硬套 PrefRow 到 Magpie `.acc` / `pm-row` / `pm-mirror` / `row agent`。
**v0.1.127 1:1：** Routing `.rt-livedot` 回 Magpie 恒绿 6px+rtlive；Agents `guide-x` 回 Magpie instant hide（无自创 fade）。
**仍 Open（诚实）：** Gateway keys Magpie `.acc` · Library skillHow busy · Magpie-distinct DOM · tip `style={{` geometry tokens。下一切片建议 Gateway 深态 nest。

### 10.7 加一行 Settings 用 PrefRow（recipe）

```tsx
import { PrefRow } from "../components/PrefRow";
import { LibSwitch } from "../components/LibSwitch"; // 或 Segs / WordsField / TextBtn / PrefPick

<PrefRow name={t("My setting")} sub={t("Hint under the name")}>
  <LibSwitch on={on} onChange={setOn} ariaLabel={t("My setting")} />
</PrefRow>
```

- 二～四选一 → `Segs`；短文本 → `WordsField`；次要钮 → `TextBtn`；主色保存 → `TextBtn variant="primary"`。
- Magpie 本来不是 `.row.pref` 的（`.acc`、`pm-row`、font-row 无 `.val`）→ **不要** PrefRow；用 `wrapVal={false}` 仅当 Magpie `r.append(who, control)`。
- tip bump：`docs/TIP-CYCLE.md` + `npm run chrome-guard`；**不**动 `SIDE_AT=1024` / 752 框。

*CIS §10 落地 tip：v0.1.127 livedot+guide hide · v0.1.126 SimpleViews · v0.1.125 Gateway/Library/Routing/Agents · v0.1.124–122 PrefRow wave · v0.1.117–103 CIS extract*
