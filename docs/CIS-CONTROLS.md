# CIS 当前规则入口（监督冻结候选）

状态：**frozen；2026-10-16 19:43监督消息批准进入阶段2**。冻结规格基线：`028dab55a3877656c115439835d1d0d14465e4ee`中的本页R01–R25、CIS-AUDIT和REPLICA-ACCEPTANCE有限范围与证据边界。规则ID及参数保持稳定；本次仅更新批准元数据。不是v195已通过声明。
本页是本轮唯一规则入口；批准来源为监督聊天01a143c3-8101-75e1-b638-c39ad15d55ed的续行指令，首批限N3/N1/N2，B1构建身份为前置。此后常规批次可继续，规格冲突/同修复两轮失败/不可代理阻塞才停相应动作。

## 1. 依据、生效与历史

判定次序：用户明确的复刻目标与边界 → 固定原版证据 → 本页校核规则 → 组件与页面验证。现有实现只用于查调用和差异，不能反过来证明设计正确。

- 固定来源： [yetone/magpie@63be477](https://github.com/yetone/magpie/tree/63be47717a9ca91fc89102078a1f1fff3e03e0ce/internal/gui/assets)。下文路径均相对 internal/gui/assets，行号为本地已验证原文件的1基行号。
- 身份证据：[固定来源校验](cis/source-verification-2026-10-16.json)记录GitHub固定ref的完整文件blob SHA及本机比对；[六CSS清单](cis/source-manifest.json)保留LF SHA-256。两者均不证明调用、级联或交互正确。
- [2026-10-15原CIS](magpie-shell-cis-2026-10-15.md)原样保留，为历史提案与版本记录。本页逐项保留正确规则、替代冲突条款；其中Tagma换肤、产品P0、旧Done/延期不进入本轮验收。
- [验收清单](REPLICA-ACCEPTANCE.md)只组织29项步骤、环境、证据和终点，规则引用本页；[校核账本](CIS-AUDIT.md)记发现与风险；TIP-CYCLE管交付流程；last-cycle及interactions中的SPEC/NOTES管历史证据。
- 未获监督确认前，以下“采用”均为有证据的冻结提案。冻结后清单外问题先登记；不能私自增项、改值或豁免。
- 组件全部调用位置及文件哈希见[调用点索引](cis/component-call-sites.json)。这是接管脏稿的静态索引，阶段2改动后需更新；数量不代表通过数量。

### 保留的基础token与排版

旧§1.1的同源token原则保留，精确值引用已验证app.css:2–115：浅色bg #f4f4f6、card #fff、fg #1c1c21、accent #4f46e5；深色bg #1a1a1e、card #232327、fg #ededf1、accent #a5b4fc。line/pill/seg/shadow及其他色完整使用该文件的对应变量，不自行抽近似色。body为13px/1.4，UI默认400字重；Windows的--font为Segoe UI Variable Text / Segoe UI / Microsoft YaHei UI / Microsoft YaHei / system-ui / sans-serif，--code为Cascadia Mono / Consolas / Microsoft YaHei UI / Microsoft YaHei / monospace；用户选择字体时才用--ui-*、--code-*。字体实际命中需浏览器记录，不能用抗锯齿解释错误fallback。

旧§1.3的顶栏46px、侧栏默认212px（原生<=859规则184px）、拖动168–320保持，按app.css对应媒体选择器和app.js sideWidth/sideDrag执行，不把拖动值当全局固定宽。旧§1.2的圆角层级只作设计总览，实际控件取下表精确变体；本轮不换品牌accent。默认原生窗660×600与Web模拟框尺寸是不同层，Web框按R17，不互相替换。

## 2. 15类公共控件校核表

“保留”保留有效原则并补明变体；“修正”替代有冲突/错误条款；“补齐”原文没有可执行细则。表中列出的静态值均为100%逻辑CSS值；响应式、平台和容器变体另述。原生完整选择器级联仍须核对，不能把表中基础值强制覆盖更具体变体。

| 规则ID / 类 | 旧条款 | 独立参考证据 | 结论与采用值、变体、状态 | 组件与主要调用点 | 验收方法 / ID |
| --- | --- | --- | --- | --- | --- |
| R01 PrefRow | §10.1/10.7：50px、gap14及复用 | app.css:3176–3189、3303；index.html:153–183 | 保留。min-height50，padding8px 12px 8px 14px，gap14；.prefs .val为inline-flex、gap2、max-width60%。字体行直接接.font-controls而非.val：310px grid，列minmax(100px,1fr)/minmax(72px,auto)，gap5px 6px；preview跨两列。手机变体按R19。原生.acc/pm-row/agent行不硬包PrefRow | PrefRow；SettingsView各分区、NestedBlocks；SimpleViews内置设置。92处调用索引 | 查DOM父子结构、最终grid、60%约束和换行；S1/S2/S4/B3 |
| R02 Segs / SegThumb | §2.1/10.1把分段字与圆角概括为范围 | app.css:227–238、2878–2900；app.js:8499–8594 | 修正精确变体。页内.segs轨padding2/r7；.opt高22/pad0 10/r5/字12；thumb r5。顶栏.seg padding2/r8，按钮高24/pad0 12/r6/字12.5，thumb r6；cramped/crowded/packed有明确padding/字级。thumb280ms cubic(.2,.8,.2,1)，只选择变化滑动；隐藏/首次挂载/resize直接定位，折行时记录y/h；不得继承另一条坐标。源thumbSame内0.5比较是算法去重，不是验收容差 | Segs、SegThumb；App顶栏、Providers、Settings、Gateway、Usage、Library、GroupEditor | 追踪offsetLeft/Width、最终transform/width及所选按钮身份；变化/首次/隐藏恢复/折行各核；N2/S3/G2/B3 |
| R03 TextBtn / icon按钮 | §2.2/10.1：6–8px、.12–.16s | app.css:240–246、1913–1919、3363–3369 | 修正为具体级联。基础.text字12/pad3px 7px/r6；.action高27/pad0 10/1px line/card底；primary用accent与500字重；danger默认不强制常红，hover red/red-soft。最终共用motion块transition .16s var(--ease)，active .96；.icon26×26/r7/active .9。busy/disabled是否禁交互与文案由具体原版入口决定，不把所有busy统一造spinner | TextBtn、现有.icon按钮；Providers编辑器、Gateway主操作、Settings、Library及插件 | 查最终computed transition，default/hover/active/disabled及已有busy；B3/G1/P1/P4 |
| R04 WordsField | §10.1：h27/r7/12.5、aria-invalid→red | app.css:3210–3219、3234–3236；3165–3167 | 部分保留/修正。input.words基础h27/pad0 9/r7/1px line/字12.5，最终默认宽240/max100%；focus accent+3px 22%混色ring，border/shadow .12s。gateway-port/rule-kind宽110，compact-num76等按明确class。固定源只给.set-field[aria-invalid=true]红边，未给普通.words同规则；原“所有words aria-invalid变红”来源不足，撤回通用视觉断言，保留aria语义和具体表单原版验证 | WordsField；Settings、NestedBlocks、Providers、Library、GroupEditor；41处 | 输入/聚焦/具体invalid/禁用，按实际class查；不新增无来源通用红边；B3/S4/P1/P2 |
| R05 LibSwitch | §2.4/10.1：32×18、off pill、bg/thumb .18s | plugins/library/library.css:147–152、505–507；app.css:1294–1296、1846–1849；plugins.css:7–9；routing.css:406、549 | 修正。基础32×19/r10/off line/on fg；i为15×15/top2/left2/translateX13，off白、on card、dark-on bg；背景.2s、thumb .22s var(--ease)。use-credits/auto-reset、archive、lib-tool、pm-mirror变体28×16/i12/translateX12；rt-gon/rt-mon另scale(.85)，不得以视觉缩小误改基础CSS。disabled取具体变体与原生入口；当前shell额外统一opacity .5须作为兼容例外核查 | LibSwitch；Agents/Providers/Library/Groups；RequestArchive与AgentModels的原生复合DOM仍需审查 | 基础+上述变体off/on/disabled/浅深色computed值、语义和调用；B3/C4/P3/P4 |
| R06 Tick | §10.2：用Tick，不用系统裸checkbox | app.css:3613–3614、4064–4081；app.js tick构造；原版checkbox全局样式 | 保留并补齐。label.tick+input checkbox；14×14/r4/1px faint/card；checked/indeterminate accent；focus-visible2px accent/offset1；disabled opacity .45。editor label gap7，mname特例gap4。checkbox由同源CSS绘制；不得把Gateway .dot.tick单选点误认此类 | Tick；Providers、NestedBlocks、Library；shell对editor外label的扩展只复制布局语义，须核对computed | unchecked/checked/focus/disabled及已使用indeterminate；B3/P1/C3 |
| R07 PrefPick | §2.9/10选型将语言、字体一并概括 | app.css:1428–1433、2575–2578、3182–3205；index.html语言/字体DOM；app.js:14301–14388 | 修正/补齐两种配方。语言.sess-pick.pref-pick：基础r7/字12，pref高29/max min(230px,45%)/fg。字体.proto.pick：高24/pad0 6px 0 9px/r7/pill，无.pref-pick；字体grid内宽100%。chevron .15s --ease/打开180°。React anchor不得使45%父子重复计算。字体源系统枚举用有限mock目录替代，菜单搜索/空查/Refresh行为仍对齐 | PrefPick；Settings语言；NestedBlocks FontPair、Library；字体不是第二套Select | 两种变体分别默认/展开/选中/空查询/关闭/禁用字重；S2/S3/C1/C2 |
| R08 FieldPill | §10.5：.field+.k/.v/.chev | app.css:735–787 | 保留并补齐。桌面field高25/r6/pad0 5px 0 8px/gap5/字12.5；panel高24/字12是另一变体，本轮不扩tray全量。k字11.5 faint，v 500可省略，open inset1px accent，bg/shadow .12s；main/solo/extra保留原排版 | FieldPill；Agents、Tray；Providers模型行按自身DOM而非强制同尺寸 | 有值/默认/长值/open/窄屏；B3/C1 |
| R09 Fold | §2.3/10.1：6px pad、chevron .15s | app.css:2196–2200；gateway/client.js:406–416、renderGatewayModels | 保留动效、补齐几何。gap5，margin-left-4，padding3px 6px 3px 4px/r6；svg展开90°、false无transform，.15s ease-out。Connect折起保留地址+复制；Models空列表折起仍留空卡，已有数据才隐藏；不能只根据expanded隐藏所有正文 | Fold/FoldChev；Gateway Connect/Models、Providers Turned off | 折起/展开/重入持久状态，空与filled Models；G1/G4/P1 |
| R10 StatusToast | §2.6：约3.5/8s、opacity .2–.3s | app.js:333–345；app.css:1982–1991、3374 | 保留时限、修正最终opacity为.2s var(--ease)。默认3500ms、err8000ms，入口显式ms优先；ok/err/warn胶囊r999，字12.5/line16/pad3 10；idle字11.5，无正文时不留伪成功。卸载/新消息清定时器；lift仅对应modal状态 | StatusToast；App showStatus；各页面onStatus | 连续两消息、错误时限/入口时限、空态/裁切；B3/G3 |
| R11 ActionConfirm | §2.7把一般modal280+570ms与confirm混写；§10.1 r14/max420 | app.js:7395–7452；app.css:3384–3392 | 修正生命周期。dialog top-layer，r14/pad22/width min(420,window-32)/max-height window-32；h2字16，正文line1.6；backdrop黑.32+blur4。下一rAF showModal，默认Cancel、Tab正反循环、Escape取消、关闭回原焦点；遮罩必须从遮罩按下且抬起，正文拖出不关。confirm源无一般.modal的280/570开场强制，不叠加。Web top-layer按模拟窗口换算几何/遮罩，不重画基础样式 | ActionConfirm14处；Providers dirty discard、Plugins Remove/Clear、Library、GroupEditor | 两入口+所有键鼠关闭/回焦/禁用accept/窗口边界；C3 |
| R12 ModelPop | §2.8/10.1与协议菜单统称out .22s | app.css:1994–2015、2067–2077；app.js:4396–4432、4525–4588、5340–5379 | 修正。pop基础r11；构造model-picker宽min(490,window-16)/高至420；普通说明选项372、无说明300/高至340；仅原生effort专用途232×96/r12、range初焦且隐藏搜索/列表，不能因文案含reasoning就认此用途。均受可用窗口约束。打开fade180+scale420；关闭**立即结束交互层**，只留aria-hidden/inert ghost220ms，400ms兜底移除；reduce不留ghost，开fade120。桌面搜索初焦，coarse Web不强唤键盘；方向键选中、Enter提交；Escape关闭；closePicker未统一显式anchor.focus，不照抄其他菜单的回焦约定 | ModelPop；Agents模型/Settings模型/GroupEditor成员，13处 | 首次/筛选/无匹配/选择/关闭后立即操作另一控件，检查焦点与事件不被影像截获；C1/C2 |
| R13 Proto / 行 / 日期菜单 | §2.8/10.1合并模型关闭；细节不足 | app.js:14247–14388、3569–3612；plugins/usage/page.js:86–187 | 修正/补齐。协议.pop.proto-menu宽262/pad4/r11/max min(360,70vh)，项r7；关闭立即remove，无模型ghost。单选选择后关；非live多选关闭且有变化才按原顺序提交一次，live逐次提交；空v清除并关，NUL说明不提交。行菜单min-width176/项高28/pad0 8/r7，left dx-4；首个可用项焦点、上下循环跳禁用、Escape回锚、Tab关闭。日期菜单按R18矩阵。各类scroll/resize按R18，不能只共用坐标就声称生命周期统一 | ProtoMultiMenu；useRowMenu五处（含GroupEditor）；NestedBlocks字体/LAN/托盘菜单、SimpleViews RangeMenu、Library裸菜单 | 各用途首次/初焦/提交次数/键盘/外点/内部及外部滚动/resize；C1/C2/P5 |
| R14 CopyButton | §10.1允许页内CopyBtn pattern | app.js:6247–6266；app.css:2220–2222 | 保留视觉并收口到共用CopyButton：22×22/r5、SVG12；done绿/green-soft、copy-pop360ms，1200ms复位；失败不能标done或成功toast。代码复制按钮在滚动pre外；卸载清timer；复制文本核对实际剪贴板，不仅图标 | CopyButton18处；Gateway/Settings/Providers/Agents/Library/Usage | 地址/Key/模型/示例逐一读剪贴板；失败及重复复制/卸载；G3 |
| R15 品牌/插件图标 | 旧文泛用.ic，前稿称统一图标已接 | app.js:236–332；plugins.js logo；app.css .ic/.mask；实际icons资源 | 保留原资源和语义、补齐加载状态。单色SVG=currentColor mask，彩色SVG/PNG/file图=image，generic或失败=cube；插件无品牌图按middleware/agent/tools/page/puzzle原glyph。不得以菱形字符或undefined路径代替；各上下文尺寸由原class，不全局固定同一尺寸 | MagpieIcon35处、PluginLogo6处；六主页面、模型列表、Library等；InfoTip是独立INFO_I，不是品牌图 | 浅深色、已存在SVG/PNG、generic、失败资源；比较原资源身份/尺寸/颜色继承；B3/B4/P4 |

## 3. 导航、复合控件与页面规则

| 规则ID | 旧条款 / 校核结论 | 独立来源与采用规则 | 接入与验收 |
| --- | --- | --- | --- |
| R16 导航morph | 旧§2.13 500ms/cubic(.32,.72,0,1)过时；保留后续320ms修订 | app.css:457–485、app.js:22925–22947：320ms cubic(.42,0,.58,1)，1500ms watchdog；reduce/无ViewTransition直接切换。固定源Linux也直接切换，本轮Windows/Web不造Mac点录。连续操作最后意图胜出是React适配要求，不改原曲线 | App、lib/navMorph；N1/N3，须记录实际动效与性能，参数不等于顺滑 |
| R17 壳、thumb、分区 | 保留SIDE_AT1024及2026-10-16稳定窗口要求；旧默认660×600与Web752不能混称 | app.js:22691–22739、8499–8594、22949–23071；app.css:369–408。fitTop完成后测目标；正文/路由/选中一致。sidebar主项h30/r7/gap9；白card+seg-edge。分区.nav-hl h26/r6/300ms cubic(.25,.9,.3,1)，布局重排.still。SidebarTabs共用受控分区状态，收起仍保留。Web最大752×652(<1024视口)/1100×720(>=1024)，除zoom与可用视口，尺寸不随side状态变；这是用户批准的模拟框规则，不冒称原版OS窗默认尺寸。标题栏贯穿同一窗口 | App/SegThumb/SidebarTabs/WinCaption；N1/N2/N4；每次记录目标身份与矩形、无需统一1px容差 |
| R18 弹层坐标与生命周期 | 原补充契约“统一坐标”正确，但不能统称所有关闭行为 | placeMenu app.js:14286–14300：gap5/pad8/不足下方向上或较多空间限高；Model用placePop:4403–4432有独立上翻/钳制；AgentModels:3497–3529为gap8/dx-10/宽380或580/高至560/箭头18与锚宽上限60。Web将原版window替换成模拟#root内边界，按frame原点、border、scale换算，避标题栏；转换不得改变对应算法。先挂载再layout测量，不以缺坐标阻止挂载 | PopoverPortal/useAnchoredPopover/popover及每个调用参数；C1/C2；下表逐类测 |
| R19 手机/字号 | 保留phoneWeb的适配，不以手机当桌面金标 | app.css:3463+、theme.js applyZoom：web max760，或coarse且max1024；phone zoom1，返回恢复保存文字大小。phone body字14，icon44×44、text/field/opt/copy min-height44、表单既有响应式；Connect在phone单列，桌面<=520子规则48px标签列。桌面文字100/110/125/150，默认110；各媒体条件以实测为准 | applyTheme/App，N4/S3/B4/C1 |
| R20 Agent模型管理 | 旧§2.8/工作稿缺完整状态与来源，补齐；不采信39条即全过 | app.js:3023–3529。All/Shown/Order；多组且>8无在用的组初折起；>2组且window宽>=600才rail（Web取模拟window）；搜索跨组；Shown刚隐藏项保留到换视图；Current锁定。Order为全体已显示模型顺序，含原生own分区规则，键盘Alt上下/拖拽后焦点与顺序保持。批量首次显示跨供应商数量、4秒撤回/第二次执行；其他列表操作撤回。Only逐agent保存，不改已显示集合。首焦点搜索；scroll/resize关闭；关闭立即失去交互，ghost按R12 | AgentModelsPop/AgentsView；C4。mock仅保存现有agent偏好，不造真服务 |
| R21 Settings七分区 | 保留§2.11隐藏不卸载、§10.7复用；旧8tabs无条件显示过时 | index.html设置分区、app.js renderSettings；字体配方R01/R07；搜索隐藏tabs且按data-part显示标题，无匹配空态。常规/额度/网络/模型/隐私/同步/关于固定七区；otel功能门关闭不新增第八。无订阅不造余额卡；Mac-only托盘外观不混入Win | SettingsView/NestedBlocks/data/settings；S1–S4/B4，选中/布局/持久mock状态均验 |
| R22 Gateway | 保留五字段、同端口、空态；纠正旧NOTES的SystemOne模型拼写/OS菜单范围 | gateway/client.js:94–122、173–287、364–481；app.css:2207–2222。Connect label72px+minmax(0,1fr)，gap10px 14px/pad12 14 14；值高26/r7/字12，hint11/line1.4。API/URL/key/model/example五组。OpenAI/Responses/SystemOne base=/v1，Anthropic/Gemini base=根URL；empty model为provider/model，SystemOne为provider/jev-latest（不是jev_latest）。SystemOne无shell；OS选择在shell和curl显示，Python/Node不显示。原生on/off/older/other及忙态文案由对应函数，other无主按钮；全为mock | GatewayView/ConnectionField五处/CopyButton/Segs/Fold；G1–G4，窗口内代码滚动、端口改后状态/示例一致 |
| R23 Providers/Agents | 保留原行层级、公共控件，不视旧Done为验收 | app.js renderProviders/renderAgents/openRowMenu/confirmAction；不得把.row.agent/.row.provider/.acc扁平为PrefRow。Providers空/加/改/字段/移动/丢弃；Agents空态和demoAgents接线、模型入口及行菜单。真OAuth/订阅访问不执行 | ProvidersView/AgentsView；P1/C1–C4/B4 |
| R24 Routing | 旧§10.4舞台原理保留；GroupEditor旧延期不能豁免当前mock | plugins/routing/client.js GroupEditor、rules、save:5303–5333；routing.css .rt-rule/.rt-main。规则四列与when/then/condition/more原层级；9条件分别维护，pause仅允许agents/folders/exceptFolders/time；删除intent不删images。保存/再编辑保留完整规则/成员/模式。max560按rt-main内容宽<=560，变后重算线；不新增真实流量/飞鸟 | RoutingView/GroupEditor；P2/B4。9条件清单固定见验收步骤 |
| R25 Usage/Plugins/Library | 旧演示按钮、故意延期/已Done作标准过时；范围仍有限 | plugins/usage/page.js:86–187及renderUsage/renderLedger/renderUsageTab/renderUsageEvery；plugins.js；library/client.js。Usage默认空与filled fixture，概览/请求/会话/Context；RequestArchive label和28×16开关同一目标。插件内置/发现/安装、开关/次数/详情/移除取消。Library四页签只验当前mock默认与已有编辑/菜单/取消，不补真实资源业务；会话/Context同理 | SimpleViews/RequestArchive/LibraryView；P3–P5/B4 |

### R18 / C2 六类浮层行为矩阵

| 类 | 打开焦点 / 键盘 | 关闭、提交与滚动 |
| --- | --- | --- |
| 模型ModelPop | 桌面搜索初焦，coarse Web不强唤键盘；搜索内上下改变选中，Enter提交，Escape关闭；按调用用途保留keepOpen | 原版立即隐藏交互层+inert ghost；单选提交后关闭，keepOpen用途除外；不能把协议的scroll/resize规则直接加给它；按placePop和实际调用核对 |
| 协议/语言 | 无搜索时当前选中或首项，有搜索则搜索初焦；上下循环；搜索有Home/End时仅项已聚焦生效 | Escape关并回锚；外点关；非live关闭一次提交、live逐项；resize关；scrollCloses区分内部、自发文本滚动、程序恢复与用户外部滚动 |
| AgentModels | 搜索初焦；Order Alt+↑/↓及拖拽重排后保持该项焦点；不强造协议的全部键盘 | Escape回锚，外点/外部用户scroll/resize关闭；原版ghost不可交互；不等待视觉结束才让另一入口打开 |
| 行菜单 | 首个可用项初焦；上下循环跳禁用；源没有Home/End要求 | Escape回锚；Tab关且正常移焦；外点、外部用户scroll、resize关；内部scroll不关；立即remove |
| 字体菜单 | family搜索初焦、搜索后上下/Enter；style按原字体函数选中项；System default时style禁用 | 用协议生命周期立即关；family无结果仍有Refresh；Refresh先关再刷新，原入口无额外toast；无真字体枚举要求 |
| 日期RangeMenu | 当前边界日/今天/quick首项初焦；左右±1天、上下±7天；跨月续焦 | 第一次选日只设start，第二次按升序提交from/to并关；未来日禁用；Escape回锚，外点/外部scroll/resize关；立即remove。来源plugins/usage/page.js:86–187 |

程序造成的自动scroll不能被误判为用户外部scroll。useAnchoredPopover负责定位与观察，不代表已实现各类关闭状态机。所有关闭后留存的影像不得保留可交互、可聚焦或会拦截新入口的状态。

## 4. 原则与验证界限

- 颜色、字体、line-height、几何、动画精确复用已核实token/class及用途；“r7–8”“卡片10–12”仅为历史总览，不是任取一个值的授权。
- 固定源有全局motion与媒体级联：如.text最终160ms、.status最终200ms；不能只抓最早一个选择器。主入口CSS顺序为app/routing/library/plugins/sessions/context；Web兼容层可以插入但每个生效覆盖必须有理由、来源、受影响调用和浏览器证据。
- 同源CSS不阻止调用选错变体、React包装改变宽度、旧shell覆盖、首开死锁、焦点丢失。公共组件存在也不等于所有调用正确；裸DOM配方候选逐个分类，原生特殊结构不机械抽象。
- 不设统一1px容差。不把设计参数与屏幕像素混为一谈：记录DPR、zoom、字体fallback、浏览器取整；差异逐项归因并可复现，来源或实现错误必须修正，无法归因待验。
- 缺原生Mac新点录不阻止Windows/Web有界实现，但不认证Mac专属行为。没有对应同环境金标图的状态只报源码/浏览器验证，不报像素1:1通过。
- 只写文档不增加UI版本。本轮源码与v195脏稿、实际dist、PR提交分开标识，最终验收锁同一候选SHA与构建哈希。
- 已批准的29项结束条件与操作上限见028dab5验收清单；批准不等于实现通过。技术回归完成和用户四个重点观感认可分开，不代替用户确认。
