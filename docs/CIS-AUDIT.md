# CIS 校核账本 · 2026-10-16

2026-10-17当前执行结果：26通过/0失败/3待验（N3独立观感、D2远端/云身份、D4最终用户）。最新UI1ebfb66/v206；阶段1下文保留为发现历史，不是当前未修队列。F01/F02/F03/F04/F06/F08已按C1–C4/S2有限证据处理；F05的34配方分类完成；F07本机build-info/产物链已补，云端身份仍归D2。当前证据入口[release notes](../interactions/cis-release-1ebfb66/NOTES.md)，唯一规格仍CIS-CONTROLS，不将本账本另作标准。

状态：阶段1校核账本；监督已于2026-10-16 19:43消息批准冻结028dab55a3877656c115439835d1d0d14465e4ee规格。唯一规则入口为[CIS-CONTROLS](CIS-CONTROLS.md)，现进入首批N3/N1/N2复现，F01–F08仍待相应批次。原先本文件记述的v191–v195“已处理”仅是历史线索，继承版可从接管补丁及Git恢复。

## 结论与证据等级

旧CIS适合作为开发基础，不能原样作全壳1:1终验标准。颜色、基础行配方、组件复用和多数动效原则可保留；具体变体、级联、关闭状态机、范围和证据绑定需校核后执行。来源优先级不能变成“当前代码就是标准”。

- 已独立对照：旧CIS、补充契约、固定提交源码及已接线调用；25个规则ID，其中R01–R15为15类公共控件，R16–R25补导航、复合控件和页面；保留正确条款，不重造设计系统。
- 来源文件14份初次Git blob身份比对全部相同；补读Usage page.js后共15份。前12份缓存字节一致，sessions/context经Git LF归一化一致；详见source-verification JSON。直接HTTP的TLS/timeout及一次连接器传输失败已换到成功的GitHub路径，停止原失败路径，不关闭证书校验。
- AST调用索引：20个使用文件、465个组件/共享hook调用（含公共组件内部调用），34个裸DOM配方候选。它们不是465个验收项、也不是34个已证实缺陷。
- 本机guard重跑通过；lint59 warnings/0 errors（exit0），日志18027 bytes。阶段1未构建、未修改UI；不以此声明D1或B2全项通过。
- 浏览器仅新建后台独立标签，确认实际加载4173的index-gzRBpZxd.js；未切换偏好或视口。默认viewport1280×720/DPR1。实际dist无可核验构建SHA/壳版本标记，package v195和About里的原生版本样本文字都不能绑定运行候选。

## 重点校核结果

| 问题 | 原证据 / 现结论 | 归入规则 / 验收 |
| --- | --- | --- |
| 导航500/320冲突 | 固定app.css:457明确320ms与(.42,0,.58,1)，app.js watchdog1500；旧500来自旧版记录。采用固定源参数；尚不能据此认定顺滑 | R16 / N3 |
| 开关32×18/.18s | 固定library.css基础为32×19/.2+.22s、off line；use-credits/auto-reset/archive/tool/mirror才28×16。旧泛化不准确；rt-gon/rt-mon还额外scale(.85) | R05 / B3/C4/P3/P4 |
| 普通分段12.5/r7–8 | 源页内.opt字12、r5、轨r7；顶栏才12.5/r6、轨r8，拥挤级别和Usage小分段另有更具体选择器 | R02 / B3/N2 |
| 只读最早CSS规则 | .text/.icon早期.12s被全局motion块.16s覆盖；status早期.3s最终.2s。六CSS同源不验证最终级联与调用class | R03/R10 / B3 |
| words invalid泛化 | 固定源只有.row.pref .set-field[aria-invalid=true]红边，普通.words无该视觉选择器。撤回“全部words红边”的无来源通用断言；不把当前组件aria实现当颜色证据 | R04 / B3 |
| 模型与协议都out220 | 模型交互层立即关闭，另建aria-hidden/inert ghost220ms（reduce无ghost）；协议/行/日期直接移除。不能把“视觉还在”当“菜单还开着” | R12/R13/R18 / C2 |
| 一律Escape回焦 | 协议、行、AgentModels、日期明确回锚；closePicker没有同一显式回焦语句。Home/End和Tab也只按对应用途，不扩成通用要求 | R18矩阵 / C2 |
| Confirm套modal动画 | 原confirmAction未强制一般modal280+570；有rAF打开、取消初焦、Tab与遮罩按下/抬起保护 | R11 / C3 |
| Settings字体/语言 | 字体.proto.pick grid、语言.sess-pick.pref-pick；width cap不能重复。七分区与otel gate核实，不能从旧8tab说明推成八区默认 | R01/R07/R21 / S1–S4 |
| Gateway文档间差异 | 固定源码SystemOne空模型provider/jev-latest；旧LinuxNOTES有jev_latest且称OS仅Shell，新固定源码Shell/curl均显示。按固定提交修订文档，不照录旧截图文案 | R22 / G2/G4 |
| 产品规划/延期/Done | 旧§3的TagmaP0、换肤建议、旧流水已完成、库未录制建议均不是当前终验事实；在当前mock范围内的缺陷不能靠旧延期消除 | R23–R25 / P1–P5/D4 |

## v195工作稿风险队列（静态发现，尚非浏览器验收结果）

| 风险ID | 静态证据 | 需要的有限复现 / 下一步 |
| --- | --- | --- |
| F01 模型关闭仍留事件层 | ModelPop.dismiss及AgentModelsPop.dismiss都延时220ms才onClose，shown期间keydown/mousedown仍注册；原版立即关闭，仅ghost不可交互 | C2：按Escape/外点后立即开另一个入口、Tab、再次Escape；逐帧查影像aria/inert与事件层。不能因时长相同自动判过 |
| F02 Agent模型初焦/重排/生命周期 | 初焦静态判断已撤回：原组件已有autoFocus，0a2a014浏览器确认正常，没有因此改初焦。实际风险为Order moveTo无源重绘后focus、缺scroll/resize关闭；源app.js:3332、3516–3529明示行为 | C4/C2已完成有限复验，见396c11c证据；保留此更正，不将旧误判当已修缺陷 |
| F03 字体、日期、协议生命周期 | FontRow/RangeMenu/ProtoMultiMenu主要监听外点/键盘，useAnchoredPopover在scroll/resize只重定位；源各类明示关闭 | C2：分别内部滚动、用户外部滚动与resize一次；程序恢复滚动不关。共用坐标不能代替专用状态机 |
| F04 字体style初焦 | FontRow仅family显式初焦；style原版openProtoMenu初焦选中项；当前style菜单可能仍留锚 | S2/C2：选非默认family后开style，记录activeElement，方向键一次 |
| F05 组件配方未全收口 | 原34候选包含定义、原生.dot.tick、复合archive/mirror/group及特殊菜单；已逐项分类，未知0；特殊菜单独立键盘/生命周期冲突实证后收口到useProtocolMenu | B3通过：[34分类](../interactions/cis-controls-a8976e0/raw-recipe-classification.json)、[R01–R15证据链](../interactions/cis-controls-a8976e0/NOTES.md)。保留原生复合DOM，不机械删除或重包；调用数不是通过数 |
| F06 历史证据不能绑定候选 | v195 JSON共39observations，首search rows=[]，notes称query后来yi，独立claude复测四行；没有commit/完整环境字段 | C4：绑定最终候选后只重做对应路径；原记录与失败留存；不补写不存在的旧SHA |
| F07 dist构建身份缺失 | preview.json=v194/93b4b74，但dist构建18:39:38且实际asset index-gzRBpZxd；bundle没有壳package版本。HTTP200只证明能加载 | B1/D2：阶段2最终构建记录源码SHA、版本、产物hash与预览映射；阶段1称“继承dist，版本未可证明”，不冒称已发布v195 |
| F08 模型定位算法可能过度合并 | placePopover对model与proto使用“较多空间”统一判向；原placePop与placeMenu上翻逻辑不同；各调用的preferUp也需与对应源核对 | C1：靠近底部且上方也不够的同窗口锚点、短/长列表各一次；对照R18各自算法，不以在框内就算对齐 |

风险队列只指导复现，不新增验收ID。发现尚未在冻结范围内的独立功能缺项，记下一阶段候选；直接破坏上述路径者归原ID提监督判断。阶段1没有修复这些风险，不能将其写成“已关闭”。

## 29项必要性、可测性与终点校核

29个原ID全部保留；不另加“为了完善”而没有终点的项目。下表是逐项裁定与具体化，执行步骤在REPLICA-ACCEPTANCE，对应设计规则在唯一入口。

| ID | 裁定及理由 | 可测的终点 / 调整 |
| --- | --- | --- |
| B1 | 保留，先防版本混报 | 一套候选SHA/源hash/版本/产物hash/地址/环境/fixture清单，全部相互对应；脏稿只能用于诊断 |
| B2 | 保留，但哈希不是整体验收 | 六CSS均匹配固定源，兼容覆盖逐项有原因与受影响路径证据；不要求再复制全部参考库 |
| B3 | 保留，防控件有而调用错 | R01–R15映射与全调用索引存在；34裸配方候选逐个分类；按每个实际出现的不同变体/状态验证，不机械点击465次 |
| B4 | 保留，限制静态矩阵 | 1364浅/深：6主+7设置+Library4+Sessions/Context2=19状态×2=38；900/390浅色各19状态只查溢出和关键操作=38，共76记录，不做无边界全笛卡尔积；非默认深态由对应ID负责 |
| N1 | 保留，直接用户问题 | 1364/1048/900各在Agents/Settings/Gateway展开/收起一对，root/caption矩形保持，复用其他ID同条件数据 |
| N2 | 保留，直接用户问题 | 1364六主页面各10次导航切换=60；正文/选中identity与thumb目标一致；最终检查源offset算法并单独归因测量差异 |
| N3 | 保留，直接用户问题 | Agents正常可见document三轮各10次=30；第一轮与N2 Agents的10次重用，另加20次。录屏/逐帧或等价可复查动效、帧间隔及主线程阻塞记录；参数/性能/观感三列，不自造FPS门槛；不把后台节流当原版性能 |
| N4 | 保留断点恢复 | 默认900/1023/1024/1364、显式top/side各重入一次、390；恢复原偏好/viewport，有确定首末状态 |
| S1 | 保留，直接用户问题 | 常规页字体、列、边线、控件、选中、滚动逐项有源/图/候选对照；四张原附件已从监督聊天找回并查看，见USER-REFERENCE；它们是旧demo问题图，不是原生正确金标 |
| S2 | 保留变体，范围封顶 | ui/code family+style，两列、普通/无匹配/选中/关闭，默认禁用style；初焦与菜单关闭按R18；只用现有mock字体 |
| S3 | 保留兼容验证，避免全组合 | zh/en/zh-TW/ja/de各一次，系统语言入口一次；字号100/110/125/150在常规页各一次，另125%复测导航/网关各一次；非五语言×四字号×全页 |
| S4 | 保留六区现有控件 | 每区默认+固定一个操作，存在时一个原生禁用态；无禁用态记录源中不存在，不新增控件凑数 |
| G1 | 保留，状态机覆盖 | on/off/older/other四URL fixture；on重启/off启动/older接管各一次，other无按钮；一个端口占用失败fixture；不启动真实进程 |
| G2 | 保留五API | 5种各一次；URL/模型占位/代码/提示同步。SystemOne无Shell，空模型用jev-latest，纠正旧记录冲突 |
| G3 | 保留复制真值 | 地址/假Key/模型/示例各一次、成功1200ms恢复；一个可控失败、重复复制/卸载清理；不写真实Key |
| G4 | 保留布局封顶 | Shell/curl/Python/Node在OpenAI各一次；Shell与curl两OS各一次；SystemOne验证无Shell；1364和390各查代码自身滚动与按钮留在pre外 |
| C1 | 保留六族，按变体而非泛称 | 模型/协议/AgentModels/行/字体/日期在1364、390各首开一次；模型另普通有注释/无注释变体，使用中的特殊用途按调用源；期望定位算法不是仅在框内 |
| C2 | 保留用途区分 | 按R18六族矩阵完成每个已规定事件一次；不得给没有该原版行为的类强加Tab/Home/End或统一回焦 |
| C3 | 保留两入口 | Providers dirty discard与Plugins Remove各完成Cancel初焦、正反Tab、Escape、遮罩与正文拖出、关闭回焦；只额外查已有accept禁用态 |
| C4 | 保留深层mock | All/Shown/Order、跨组搜索、保留隐藏项、Current锁、批量4秒/第二次/撤回、Only逐agent、Alt上下/拖拽/默认顺序；每条一遍，无真实模型后端 |
| P1 | 保留现有供应商路径 | 空、加、编辑、字段/排序菜单、丢弃取消与确认各一；表单保留/清除结果可见，不做真OAuth |
| P2 | 保留已有路由mock | 空、创建/保存/再编辑；9条件各加/删一次，另intent+images互不误删；上/下/暂停/删规则、复制/排序组各一次；pause限制明确 |
| P3 | 保留现有Usage mock | 4页签各空与filled一遍、刷新周期一次、日期两端一次、归档label一次、已有详情一条；不扩Sessions/Context业务 |
| P4 | 保留现有插件mock | 内置/发现/安装各一次；开关/调用数菜单/详情/移除取消各一；无真实插件执行 |
| P5 | 保留但不扩库业务 | Library4页签默认；指令现有编辑/取消、MCP现有菜单/取消、Skills现有入口/取消、Hooks现有入口/取消，各一条，不消费全部旧录制序列 |
| D1 | 保留工程门 | 最终候选build/两guard通过；lint0错误且不比继承基线59警告增加；浏览器无新异常/嵌套交互错误。文件级静态基线不算D1通过 |
| D2 | 保留发布身份 | 当前PR分支推送SHA与临时预览匹配；若云端保护，清楚区分“部署对应”与“已登录实测”，至少同SHA本机可核验。云端未验不假报通过 |
| D3 | 保留可追溯交付 | 每个规则→组件/调用→验收证据可追踪，失败有复现，兼容例外有依据；0未分类的范围内已知差异 |
| D4 | 保留结束门，拆分技术与用户认可 | B1–D3同候选全过+固定主流程+监督抽查后，技术完成；如只剩用户最终观感，终态technical_complete_awaiting_user、D4待验并停止改UI，不无限调参。不冒称用户认可 |

### 固定运行与fixture

阶段2允许复用已有node_modules/dist，在**任务独占的临时预览origin**测试，避免共享用户4173存储；启动前核对端口占用。仅绑定127.0.0.1，记录任务PID与用途。浏览器全程Cua、后台新页，不动用户原页。

- 空态不写demo数据。Agents用?demoAgents=1；Routing组编辑用?rtGroups=1，成员需?fixture=filled；Usage用?fixture=filled；Gateway用?gw=on|off|older|other，失败用gwHold=python。
- Library现有magpie.feature.library=1门；otel保持关。Providers填充若URL无入口，就在任务origin通过现有Add表单建立一条假供应商，或使用本来存在的mock存储，记录准确值与来源；不把fixture当功能按钮。
- Gateway filled来自既有demoPrefs.showGwDemo，但本轮重点默认空态；不造真模型。UI语言magpie.lang/uiLocale与snippet magpie.snipLang分开。
- 测试前记录task origin偏好、视口、语言、主题、字号、导航、feature、mock标记及剪贴板；最后精确恢复。不得清空用户全站存储。所有日期预期以运行当日Asia/Shanghai计算并记录，不硬编码未来日。
- 失败最多无新信息重试2次；同一修复两轮无效，重新定位并请监督审查；只保留最小失败证据。不靠增版本/增文档计进度。

S4每区的固定操作：额度Allowance display Used→Left→恢复；网络Gateway port在mock中3425→3426 Apply→恢复，并与G2端口同步复用证据；模型Stop looping replies开关→恢复；隐私Mask secrets开关→恢复（只改mock偏好）；同步Export展开→Cancel/Close，不配置真实远端；关于Update button开关→恢复。禁用态只核该固定fixture中已存在的原版控件，没有则记录不存在及源依据，不新增功能。设置搜索固定测一次Language/其译文、一次zzzz-cis-none无匹配、清空恢复；与S1/S3复用。

证据预算：阶段2–3只保留新候选必要截图、三轮动态证据、结构化摘要与最小失败复现，先按总量不超过40 MiB规划；动态证据各轮上限10 MiB，日志单文件<=20 MiB/最多5份。若格式导致需超过预算先说明采样/压缩方案，不复制整个旧基线。该预算只约束本任务新产物，不授权删除任何历史证据。

## 缺证据与监督冻结审查点

1. **四张用户问题图指针已找回**：只读监督聊天原用户轮次，取得Temp四个附件并逐张查看，必要副本留任务.cache，详见[原图索引](cis/USER-REFERENCE-2026-10-16.md)。已消除“附件缺失”限制；仍缺这些旧demo截图的候选SHA，且它们不能当原生正确金标。图二明确复现“正文Agent、选中供应商”的问题证据，图三为设置110%浅色，图四含旧错误模型占位。
2. **当前dist的完整源码SHA**没有构建身份文件，阶段0只记录资源哈希与实际加载URL，不能追认v195已通过；最终候选构建时补链。
3. **原生Mac新点录与同环境Windows原生全套截图**没有取得。已有LinuxNOTES用于内容辅助，不能认证Windows标题栏像素或Mac交互。范围仍为既定Windows/Web mock壳；所有无配对金标的状态报告“源码/浏览器验证”。
4. **N3可复查动态证据**继承记录明确没有FPS/帧数据。本轮拟用Cua支持的逐帧/录屏或CDP采样保留实际过程，document必须可见且记录节流状态；若能力不足则N3待验，不能把困难改成通过或反复调CSS。
5. 待监督确认：R01–R25替代关系、29项有限状态集合及上述证据边界。确认后记录冻结SHA，再进入N3/N1/N2（至多3ID）首批复现/修复。没有确认前本任务只整理证据，不改UI。

## 旧证据归档索引

- web-cis-0.1.191：设置/网关/导航几何线索，不覆盖后续候选。
- web-frame-0.1.193：18次切换、9次收起坐标；其“差<1px”旧断言不可直接转成新标准通过，保留数据重新按算法判断。
- web-cis-0.1.194：52布局+13手机复测、菜单/语言/路由线索；与93b4b74同源性需按候选差异复核。
- web-cis-0.1.195：39条脏稿观测，无SHA绑定。初次search不确定与独立claude复测均保留；不得只摘后者包装全过。
- native-linux、win-mac、pages/*/SPEC：带旧原生版本/平台的历史材料；有与固定63be477冲突时登记，以本页规则入口的校核提案收口；原文件不批量改写或删除。
