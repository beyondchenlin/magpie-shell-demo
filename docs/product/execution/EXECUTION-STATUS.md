# Tagma 执行状态

唯一执行进度入口；依据 PRD v0.3 + EXECUTION-BASELINE.md。执行者独占代码与构建；监督文件由原聊天维护。

## 最新用户限制：禁止电脑控制

2026-10-17，用户在监督聊天明确指令“汇报一下工作进度，现在禁止控制电脑”，已通过监督转达。此前保持电脑控制的授权撤销。立即停止所有截图、窗口读取、激活、点击、输入、拖动及会抢焦点的原生UI验收；不关闭或操纵当前用户应用。仅继续已授权源码/文件/非UI构建与测试，用户重新明确授权前不恢复电脑控制。下文的窗口/连接记录均为本限制之前的历史观察，不表示当前仍在读取或操作。

## 用户保留预览（禁止按测试清理）

用户仍反馈“不能自由拖拽啊”：窗口拖动验收保持未通过。dev.9 历史安装及八项命令检查不能证明现场自由拖动可用；已只读核对源码和本地 Tauri 拖动实现，本次未操作窗口、重启或更新用户安装。遵守禁止电脑控制限制，实际复现尚待重新授权。详见[P0-S06](P0-S06-WINDOW-DRAG.md)顶部状态。

2026-10-17 17:44：用户要求重装、随后要求修复拖动；当前已安装且打开 **dev.9/schema3**，目录 C:/Users/ai/AppData/Local/Tagma，桌面和稳定入口指向最新版、沿用原预览data/webview。CIS沿用dev.8；原生拖动权限/区域及双击最大化还原补齐，八项原生交互验证通过，真实物理鼠标位移未确认。Computer Use重新枚举绑定、文字状态可读；截图FrameArrived超时并做有界恢复。旧预览EXE批量删除被自动审批 blocked by policy 拒绝，原文件保留，未绕过。详见[P0-S06](P0-S06-WINDOW-DRAG.md)。下文dev.6/7状态为历史。

2026-10-17 16:22：dev.7（650b2c9）已复制并核对hash，稳定入口更新且加运行保护；原dev.6仍运行，当前表单/进程未关闭，dev.7尚未实际打开。旧版本退出后再开稳定入口即可使用新对话。清单与evidence/P1-S01-retained-preview-dev7-prepared.json明确区分“准备完成”和“当前运行”；未复制/改写data/webview。

2026-10-17 15:58已实际打开dev.6可见接入工作台，已保存1/运行中1。入口[D:\demo1\tagmaai-preview\打开Tagma预览.lnk](D:/demo1/tagmaai-preview/打开Tagma预览.lnk)，桌面“Tagma 最新预览”；独立持久data/webview，不是fixture。运行EXE从c655972已验构建复制后hash核对，网关无附着控制台。更新前确认旧预览已退出，本执行器未关闭；旧dev.5及配置保留。不要关闭/卸载/覆盖这个预览来解构建锁或执行测试清理。完整保护约定见[USER-PREVIEW](USER-PREVIEW.md)，evidence/P0-S04-retained-preview-dev6.json记录实际窗口及版本，旧证据留存。

## 当前批次

- **空闲业务保留处理局部完成**：候选仍dev.16/config9/usage2，现有唯一用量writer生产空闲60秒执行原保留检查，非系统清理/自动化；先复现无数据/边界变化prune仍递增修订1→2，再修复为仅实际变化bump。空闲不重放pending/自动解除fence；core86通过/8忽略不计、writer8、实际HTTP usage4+clear1、workspace Clippy通过，两轮自查见[P1-S24](P1-S24-IDLE-USAGE-RETENTION.md)。完整容量/延迟矩阵及A16/A28/P1仍未通过，用户dev.9/电脑禁令/拖动未通过保持；继续独立缺口。

- **用量容量/长读者恢复局部验证补齐**：候选仍dev.16/config9/usage2，仅测试新增，生产逻辑不变。core2和实际headless HTTP1通过：真实16MiB WAL围栏拒绝新派发/上游增量0，长读者未关时恢复拒绝，关后TRUNCATE0并恢复；128条有界明细清理保留日汇总/在途，删除失败整事务回滚。core/gateway全target Clippy通过，两轮自查/空间收尾见[P1-S23](P1-S23-USAGE-CAPACITY-EVIDENCE.md)。空闲过期处理与完整容量矩阵仍未完成，A16/A28/P1不整体通过；用户dev.9不动，电脑控制禁令及拖动未通过不变，继续独立源码缺口。

- **CIS软预算编辑/展示源码接线完成，未作桌面验收**：候选仍dev.16/config9/usage2，精确字符串软目标CRUD、固定编辑/删除修订、手动周期报告、未知token不绘条/实际余额账单未知，预算缓存共用目录/代次/pending围栏，清除及配置变化丢弃旧读。21项无窗口源模型/静态HTML检查（原15+预算6）、TS/Vite、6文件116规则零lint及CIS/chrome guard通过；两轮自查见[P1-S22](P1-S22-BUDGET-UI-SOURCE.md)。未调用原生预算命令或更新用户dev.9，拖动仍未通过，禁止电脑控制继续有效。A16/A28/P1及容量完整矩阵仍未整体完成，继续独立源码工作。

- **周期观察报告/本机源码桥接局部完成，尚无预算UI**：候选仍dev.16/config9/usage2，固定配置规则+单用量读事务，UTC日/月、逻辑请求/实际尝试分开、未知token不生成进度；core82通过/8忽略不计、reader1、实际headless HTTP软阈值1、main限定三命令静态权限与workspace Clippy/DTO/TS/Vite/lint通过。两轮自查及限制见[P1-S21](P1-S21-BUDGET-OBSERVATIONS.md)，不计A16/A28/P1完成。安装仍dev.9，禁止电脑控制与拖动未通过不变；继续CIS预算源码接线。

- **软预算规则核心局部完成**：候选dev.16/config schema9/usage2，32条有界规则，精确正整数限额、UTC周期/供应商/模型/小队口径、共享配置CRUD；已知8→9一致备份保留原snapshot，初始化7/8/9真实退出恢复通过。core78（8忽略不计）、runtime6、实际gateway相关5与workspace Clippy/DTO/TS/Vite通过，见[P1-S20](P1-S20-SOFT-BUDGET-RULES.md)。尚未接预算报告/native/UI，不做硬限制或假余额，A16/A28/P1未整体通过。用户dev.9/资料不动、禁止电脑控制/拖动未通过不变，继续周期报告源码。

- **清除确认与本机缓存围栏源码完成，未作桌面验收**：候选仍dev.16/schema8/usage2，plan/游标/metadata绑定目录身份，main限定三命令，CIS范围/数量确认、同plan核实、显式结束核实、记账恢复；有界本地pending/floor先保存再发，晚回执不覆盖新操作或回填旧数据。core相关20通过（2忽略不计）、runtime2、gateway相关9、源模型/静态渲染15及native编译/静态权限、workspace Clippy/DTO/TS/Vite/JSON lint/CIS通过；两轮自查/旧回执兼容见[P1-S19](P1-S19-USAGE-CLEAR-UI-SOURCE.md)。未实际调用native窗口/Storage或更新用户dev.9，拖动仍未通过；软预算/容量完整矩阵及A16/A28/P1未整体完成，继续独立源码工作。

- **清除私有管理接线局部完成**：候选仍dev.16/schema8/usage2，唯一writer有界控制、800ms未确认与同plan持久回执、明确操作结果/严格实例与范围校验。runtime6/gateway相关23通过，最后writer6/真实clear1及Clippy复验通过，DTO/TS/Vite/lint通过。实际sidecar的过去合成历史被删、当天3条真实HTTP保留；真实回复丢失后两次核实同回执，busy/changed不锁死记账，配置RestartRequired保留。两轮自查与分层证据见[P1-S18](P1-S18-USAGE-CLEAR-IPC.md)。尚未接native清除/UI/最低代次围栏，A16/A28/P1未整体通过；用户dev.9、拖动未通过与禁止电脑控制不变，继续本机源码接线。

- **清除核心与schema2备份升级局部完成**：候选dev.16/config schema8/usage schema2，显式UTC范围/数量预览、变更修订、事务删除/代次/持久回执、旧游标拒绝及源页面代次隔离。迁移一致性备份/WAL/校验与七点真实exit90、两类损坏拒绝验证；最终core72通过（8忽略不计）、实际gateway相关3、源页面7、workspace Clippy/DTO/TS/Vite/lint/CIS通过。两轮自查与精确范围见[P1-S17](P1-S17-USAGE-CLEAR-CORE.md)。尚未接IPC清除/确认UI/自身清除后最低代次围栏，A16/A28/P1未整体通过；用户dev.9、拖动未通过与禁止电脑控制不变，继续管理接线。

- **用量页源码接线完成，未作桌面验收**：候选仍dev.16，CIS组件增加用量入口、UTC范围/结果/错误/目标/修订筛选、两种汇总口径、32条有界翻页和请求/尝试详情。精确整数与未知区分、失败清缓存、退出迟到隔离；6项无窗口检查、TS/Vite、6文件JSON lint零诊断、CIS/chrome guard通过。两轮自查及限制见[P1-S16](P1-S16-USAGE-UI-SOURCE.md)。没有更新用户dev.9安装或控制窗口；拖动未通过，清除/软预算/完整容量矩阵及A16/A28/P1仍待完成。继续独立源码工作。

- **用量只读查询及本机源码桥接局部完成**：候选dev.16/config schema8/usage schema1，请求/详情/UTC日汇总、精确字符串总计与未知区分、单worker超时/实际SQL interrupt、固定本机main权限。core66/runtime4/gateway相关3通过（core7显式忽略不计）；末次读6/reader1及Clippy复验、DTO/TS/Vite/JSON lint/CIS通过。真实sidecar→reader ID/配置/token一致，在途读取不取消上游。两轮自查及边界见[P1-S15](P1-S15-USAGE-READ.md)。尚无新用量面板/清除/预算或桌面验收，不计A16/A28/P1整体完成。用户安装仍dev.9、拖动未通过、禁止电脑控制不变；继续独立源码工作。

- **A27供应商连接代次的组合矩阵局部验证完成**：实际sidecar的应用RestartRequired（old effective5/desired6）同时遇私有请求未送达/已处理但回复丢失，分别false/true取消四组合均为撤销final0调用；管理调用Err且未知状态不冒称确认，false保留已在途正文。自查另先复现安全确认错误快照被误接受，再按明确操作种类/请求修订/结果与运行快照分离修复。相关gateway17/runtime3通过（2显式忽略不计），workspace Clippy通过；已修正既有测试的端口预留竞争。见[P1-S14](P1-S14-REVOCATION-FAULTS.md)。A27真实凭据/桌面及完整错误矩阵、A16/A28仍未整体通过；继续用量查询等独立后台缺口，用户dev.9与电脑控制禁令不变。

- **SUP-008管理恢复确认边界已局部修复**：先以真实私有IPC复现带USAGE_STORAGE_UNAVAILABLE的健康字段快照被manager误接受，再以明确operation确认/错误与runtime快照分离修复；12负例拒绝、2正例接受。真实writer的pending1恢复暂停至调用超时，晚完成false/0仍保留原操作Err；hook有界。相关gateway19/runtime2通过（2显式忽略不计），workspace及最终runtime Clippy通过，见[SUP-008](SUP-008-RECOVERY-ACK.md)。候选dev.15/schema不变，A28/A16/P1未整体通过；继续A27 apply失败+IPC丢失矩阵，用户安装与电脑控制禁令不变。

- 源码候选 **dev.15/config schema8/usage schema1** 已将用量登记接入实际网关首步/后续步及SSE/非流/取消/崩溃生命周期：开始失败HTTP上游0调用，结束失败有界保留并拒绝新登记，私有显式恢复，未知token保持NULL，成功DONE前结算。核心60/网关33/runtime1通过（9项显式忽略不计），workspace Clippy、DTO、TS/Vite/oxlint JSON/CIS通过；两轮自查含确认超时遗留1→0修复及剩余预算检查。见[P1-S12](P1-S12-USAGE-GATEWAY.md)。A16/A28查询/清除/预算及完整容量矩阵未完，A27 apply失败+IPC丢失矩阵待办，P1未通过。继续独立非UI工作，用户dev.9/数据不动，拖拽保持未通过。

- 已继续 OBS-01/06 独立用量库基础：开始持久登记、逻辑请求/尝试分离、未知token、有限失败结果队列及真实exit90恢复；新增6项、完整core lib37项通过（4 helper忽略），core Clippy通过。尚未接实际网关派发/流/IPC/UI，不能据此通过A16/A28。详见[P1-S11](P1-S11-USAGE-FOUNDATION.md)；下一步接实际派发屏障及结果生命周期。用户dev.9安装与拖动未通过状态保持。

- 当前源码候选 **dev.14/schema8** 完成持久安全撤销局部接线：核心54项、网关29项通过（8项显式忽略不计通过），包括内存凭据轮换/回滚、真实隔离sidecar的旧快照/后续步骤/重启保护及实例确认。SUP-007已先复现首步/后续步各误派发1次，再用共享准入/发送屏障修复为0次/403；另覆盖令牌范围和cancel=false已准入请求可完成。workspace Clippy、DTO、TS/Vite/lint/CIS通过；两轮自查、真正提交后退出恢复及源码绑定见[P1-S10](P1-S10-SECURITY-REVOCATION.md)与[SUP-007](SUP-007-DISPATCH-BARRIER.md)。A11/A27/P1未整体通过；禁止电脑控制、用户dev.9安装/数据不动。继续 OBS-01/06 请求与尝试持久登记等独立后台缺口。

- PROV-02/04 检测/目录局部闭环：源码候选 **dev.13/schema7** 支持手动非生成 GET /models、连通/TLS/鉴权/限流/超时/协议分类、独立目录来源/时间、取消、两任务上限、持久间隔与退避、代次/原始观测时间及自动脑确认围栏。受控 HTTP13类及显式模型404、重启退避/取消上游/代次隔离通过，相关核心/网关/异常退出/parser、DTO/TS/Vite/lint/Clippy/CIS通过；已记录两轮自查及失败原始日志。A08/A14/P1仍局部未整体通过；无真实上游/桌面操作，用户安装仍dev.9。详见[P1-S09](P1-S09-PROVIDER-CATALOG.md)。继续其他独立P1工作，不等电脑控制验收。

- TEAM-03/A14 局部接线完成：源码候选 **dev.12/schema6** 支持 first_cloud、历史显式目标 JSON、明确的默认 App 顺序来源、确认健康读取/epoch 复核以及调用开始固定 brain。真实无窗口 HTTP 验证全局/模型序、默认 App 空范围、过期/未确认拒绝、配置/健康变化只影响新调用；核心46项、网关24项通过，8项显式忽略不计入通过，DTO/前端构建/lint/CIS guard/Clippy通过。A14仍未整体通过，原生UI/非计费复检/能力与真实上游矩阵待验；用户安装仍dev.9，禁止电脑控制持续有效。详见[P1-S08](P1-S08-FIRST-CLOUD.md)与原始证据/源码指纹。

## 历史切片记录

以下保留各批当时的实现范围与版本；其中“未开放/待接线/下一步”等描述不是本批最新状态。最新范围以上方 dev.16/config schema9/usage schema2、P1-S24及后续补充为准。

- SUP-006按先失败后修复完成观测时刻校验：延迟到TTL后落盘不刷新成功时间；同毫秒失败优先、目录/推理分槽。原始before/after/core/final/regression结果保留。纯选择器与未确认退出围栏已验证，first_cloud发布/解析仍未开放；新增两项无窗口异常退出测试通过，禁止电脑控制持续有效。详见[SUP-006](SUP-006-OBSERVATION-TIME.md)及[P1-S07](P1-S07-HEALTH-UNCERTAINTY.md)。

- P1-S06实际网关调用已接健康观测：单worker有界合并写入、世代固定、真实完成才刷新成功、错误及写入未确认分开，取消不刷新。网关6单元/直接HTTP1/小队HTTP1及Clippy通过；first_cloud仍未开放、UI未验、用户安装不变、禁止电脑控制有效。详见[P1-S06](P1-S06-OBSERVED-HEALTH.md)。

- 源码候选dev.11/schema5开始模型健康记录：目录与真实推理分开、严格五分钟过期、身份代次保护、操作记录不改配置修订；核心与健康定向测试通过。尚未接网关观察/目录探测/first_cloud，不能当作自动选脑完成。无用户安装更新或电脑控制；详见[P1-S05](P1-S05-MODEL-HEALTH.md)。

- P1-S04前端与受限IPC源码接线完成：市场小队编辑/发布/启停、对话模型、供应商引用提示；TypeScript/Vite、oxlint、DTO、Clippy与核心小队6项通过。没有桌面验收/截图/实际点击；用户安装未更新，仍保留此前dev.9。原生外观/交互验证待用户重新授权，不能把源码构建当成可见交付。详见[P1-S04源码](P1-S04-TEAM-UI-SOURCE.md)。

- SUP-005已按先失败后修复闭环：length复现中最终模型误调用1次；修复为中间仅消费正常stop的assistant文字，拒绝未处理调用/拒答/无效形状。最终17个中间失败条件final_calls=0，普通模型/最终步骤的截断/过滤8组合保留原呈现语义，三个原始日志保留，见[SUP-005](SUP-005-INTERMEDIATE-COMPLETION.md)。这不代表整个A15完成。禁止电脑控制仍有效；D盘17.89GiB，只复用现有缓存做相关小检查，不清理既有资料。

- 小队网关后端已支持精确发布版本目录、manual/sequential执行、修订/目标固定、仅最终流及中间失败/取消中止；实际本机HTTP集成通过。网关5单元+旧推理1+生命周期10+新小队1通过（2显式测试忽略），前端仍待接线，用户安装仍dev.9、禁止电脑控制继续有效。详见[P1-S03执行](P1-S03-TEAM-EXECUTION.md)。

- 源码候选dev.10/schema4新增小队草稿/不可变修订/逐版本可用性与发布校验，核心19+原配置10+小队6项非UI测试通过；网关执行/前端仍待接线，不能宣称A13–15完成。已安装用户版本仍dev.9/schema3，未触碰用户库或控制窗口。详见[P1-S02基础](P1-S02-TEAM-FOUNDATION.md)。

- dev.9窗口拖动热修已安装并实际打开；未修改公共CIS CSS或业务schema，未新增worktree/环境。八项交互验证只证明原生命令/按钮排除/实际最大化还原，不冒充真实物理拖动验收。配置、密钥引用、WebView资料和用户安装继续保留。

- 用户最新优先级：先恢复前期一比一复刻的CIS外观，再继续小队。dev.8/schema3已恢复同源顶栏/侧栏/行卡片/引导/菜单及完整共享样式，默认110%、原生窗口theme同步；两轮看图与独立原复刻同原生视口比较后，最终CIS14项通过，聊天14/主路径16/网关10回归通过。详见[P0-S05外观纠偏](P0-S05-CIS-CORRECTION.md)。旧dev.6/7仅功能通过不当作外观批准，六guard不代替整页验收。

- 日期：2026-10-17（Asia/Shanghai）；已按用户反馈恢复CIS并安装dev.9，随后按禁止电脑控制继续非UI开发。当前源码dev.10的小队后端通过相关本机HTTP检查、前端待桌面验收；不再问用户排优先级，不以后台构建代替可见界面批准。P0整体及发行门槛仍未通过。
- 源码起点03643407ed214f7e4d2a3804423028ee496b9a4a；当前codex/tagma-p0保留继承dirty。dev.9窗口修复767dd4d、禁用电脑控制92fed3a，小队基础3c7569f、网关ca131a1、SUP-005修复2922b70/原始证据3896db5。源码候选dev.10/IPC1/schema4；最后用户安装dev.9/schema3已核验，禁止电脑控制后未更改安装。内部未签名，未冒充正式发行验收。
- 启动盘点时仅有Electron/React mock；现已新增Tauri宿主、Rust核心/独立网关。继续复用npm/node_modules、Cargo registry、MSVC、Rust1.98.1、WebView2 155.0.4283.60，未重复安装环境。
- 已实现：Tauri原生三页、受限异步IPC、共享Rust配置服务、SQLite乐观事务、系统凭据/journal恢复、单源生成DTO。详细边界与两遍自查见 [S01交接](P0-S01-HANDOFF.md)。
- 已验证：S01历史6项故障集成/OS凭据1项/原生7项；S02新增安装后16项、最新进程8项、并发apply4项、初始化/诊断5项、OS凭据真实进程恢复。构建/DTO/lint和保留CIS guard通过；无完整A用例通过声明。
- 最近有意义变化：dev.3安装后16项通过；宿主/网关PE=GUI(2)，不隐藏窗口的驱动确认两者无附着控制台，Windows应用启动器仅Tagma主窗；日志20MiB×5及脱敏预览。SUP-001/002先复现后修复测试通过；最新进程回归8项。NSIS安装/升级/卸载与配置保留通过，仍debug未签名。详见[P0-S02交接](P0-S02-HANDOFF.md)及evidence/P0-S02.json。
- 最近S03变化：SUP-004三个真实子进程故障（intent刚创建/半写/已sync未发布）修复前3失败、原子暂存发布后3通过；未知/损坏正式记录保护与显式hash确认归档2项通过；真实原生确认/归档/退出重启/网关恢复8项通过，finally清理通过。首轮原生驱动误读了第二次预览生成的UUID，已改验用户实际看到的计划并复验通过，失败证据保留。
- 迁移切片：schema1→2一致WAL备份、排他锁、journal恢复及真实dev.3网关拒绝/退出后升级通过；核心lib14项通过，配置integration6项通过，Clippy通过。详见[P0-S03迁移记录](P0-S03-MIGRATION.md)。没有自动降级/回滚UI，不将局部测试当成完整A23。
- AppProfile切片：全局默认/自定义引用、跟随或独立序、过期编辑、供应商引用删除保护已接入Rust及原生UI。配置integration8通过，纠正后的原生8项通过，effective8确认；首轮驱动误点关闭dialog的同名取消，保留但不作为UI通过证据。详见[App档案记录](P0-S03-APP-PROFILES.md)。
- 网关设置切片：持久端口/显式兼容鉴权、默认系统令牌与显示/隐藏、401数据鉴权已接入；schema3保护新增合同。最终核心16/配置10/网关单元4/进程9、指定系统令牌HTTP1、真实旧schema1/2二进制、原生网关10/主路径16通过；源/构建hash见evidence/P0-S03-gateway-settings-dev5.json。详见[网关设置记录](P0-S03-GATEWAY-SETTINGS.md)。轮换/持久撤销及真实推理未实施，不宣称A11通过。
- 网关设置提交36001a5；S04已做20次原生进程冷启动，Windows debug交互p95 1033.31ms/网关987.12ms，3秒本地预算满足；OS/磁盘缓存未清空，不冒充正式包/macOS结果，详见[启动测量](P0-S04-STARTUP.md)。用户查看预览期间，不抢焦点运行额外原生UI测试。
- 最新dev.6/schema3：首页已改成可操作的接入工作台，真实模型清单/三步进度/状态/直接表单；原生8项、进程10项、构建/Clippy/lint/CIS通过。界面“已生效”提示与端口崩溃重启误确认边界一并修正，详见[工作台交付](P0-S04-WORKSPACE.md)。已更新稳定预览入口并核对实际dev.6窗口；dev.5二进制和共同持久数据保留。
- 最新dev.7/schema3：已打通原生文本对话→认证loopback网关→可控上游→流式显示；首段前/中途/页面离开停止均关闭相应上游，断流保留文字并报错，不自动重放。原生聊天14项、网关10/主路径16回归和Rust真实HTTP集成通过，详见[P1-S01聊天](P1-S01-CHAT.md)。没有真实付费上游验收，不宣称P1整体通过。
- 用户dev.6进程保留，未关闭表单或覆盖程序；dev.7按独立版本目录准备。Sky会话保留，图像/坐标通道失败如实记录，不用用户预览作为测试fixture。
- 下一步：直接进入小队配置、不可变发布和执行链路；同时记录检测/工具/用量/撤销等未完成门槛。预览/切片交付是阶段进展，不主动在此停止，不再问用户排既定顺序。
- 外部依赖：macOS/Linux 目标环境、发行签名、已授权真实上游及预算、ReachFlow 发行与服务授权。当前可独立实施的 P0 工作不依赖它们。
- release_blocked：是；Windows内部debug NSIS安装/升级/卸载已验证；正式签名、干净无开发环境机器、macOS/Linux及完整P0门槛仍未通过。

## 继承修改（不提交、不覆盖）

`docs/REPLICA-ACCEPTANCE.md`、`docs/cis/EXECUTION-STATUS.md`、`docs/cis/PR-DESCRIPTION.md`、`docs/cis/RETENTION-2026-10-17.md`、`interactions/cis-release-1ebfb66/NOTES.md`、`src/data/{de,ja,zh-TW,zh}.json`、`src/pages/RoutingView.tsx`、`src/pages/SimpleViews.tsx`、`src/styles/context.css`；未跟踪 `interactions/web-cis-0.1.195/`。现有 `docs/product/` 为已交付产品依据，保留；只提交本执行新增文件及明确的产品接线。

## 阶段门槛

| 阶段 | 退出条件 | 当前状态 |
| --- | --- | --- |
| P0 | A01–A07，适用 A23–A25；真实配置/凭据/生命周期/安装 | 实现中；未通过 |
| P1 | A08–A16、A27/A28，适用 A23–A25；先真实协议链路再小队/用量 | 实现中；基础文本链路本地通过，整体未通过 |
| P2 | A17–A20 + 受影响回归；首个队员仅 ReachFlow | 未开始 |
| P3 | A21；CLI/Skill/MCP 共用核心 | 未开始 |
| 对话 | A22 的 P0 未接入态 → 真实网关对话独立切片 | 基础文本本地端到端14项通过；真实供应商/Pi未验 |
| 后续 | P4/A26、完整 Pi harness、其他队员 | 不在本轮 |

## 用例与需求映射

逐项状态不是通过率。以下“未验证”均不计已完成。

| 用例 | 需求 | 状态/证据 |
| --- | --- | --- |
| A01 | UI-01/02 ARCH-01 REL-01/04 | Windows debug包内资源/sidecar/三页启动通过；干净无开发环境机器/正式签名/其他平台待验 |
| A02 | PROV-01/03 DATA-01/02 | CRUD/排序/重启及原生提交通过；AppProfile引用/排序/冲突/删除保护与effective8确认通过；完整A02阶段复查待完成 |
| A03 | PROV-05 DATA-03 NFR-07 | OS凭据写后、建库中断、intent创建/半写/发布前中断真实进程恢复通过；损坏记录原生显式归档及重启恢复通过；未知数据库始终保留拒写 |
| A04 | GW-01 ARCH-02 RUN-01/02/06 | Windows真实二进制端口/并发/握手/所有权通过；完整历史版本与跨用户/Unix待验 |
| A05 | RUN-03/04/05 | 父EOF/独立实例/有限重启/原生完整退出通过；原生关闭到托盘helper受阻未通过；Mac/Linux待验 |
| A06 | UI-01/02/03/04 NFR-01/06 | P0 未验证 |
| A07 | DATA-01/05 | 双入口与原生过期编辑冲突通过；演示无导入路径；阶段复查待完成 |
| A08 | PROV-02/04/06 NFR-08 | 手动非生成目录、错误分类、来源/时间/缓存、取消/退避/代次及模型404本机HTTP通过；真实供应商、桌面与客户端矩阵待验，整体未通过，见P1-S09 |
| A09 | G2 GW-02/03/04 | 文本非流式/SSE/目录真实网关集成通过；工具及外部Agent版本矩阵待验 |
| A10 | GW-04/05/06/07 NFR-04 | 分片/取消/断流/限流/体积/修订隔离本地通过；供应商超时配置及完整用例待验 |
| A11 | GW-08 NFR-07 | 缺失/错误/撤销令牌、内存凭据轮换与数据面管理拒绝本机HTTP通过；真实OS凭据及完整用例待验，整体未通过，见P1-S10 |
| A12 | DATA-02 GW-04 | P1 未开始 |
| A13 | TEAM-01/02 GW-03 | P1 未开始 |
| A14 | TEAM-03/04 | first_cloud文本manual/sequential、全局/默认App序、确认健康与在途固定本机HTTP通过；explicit失效/缺Local Brain发布保护已有检查，能力/非计费复检/真实上游及UI待验，整体未通过，见P1-S08 |
| A15 | TEAM-02/05/06/07 | P1 未开始 |
| A16 | OBS-01/02/03/04/05/06 NFR-05 | 请求/尝试持久登记、未知token和有限失败恢复本机HTTP通过；查询/清除/预算/真实额度/界面及完整用例待验，整体未通过，见P1-S11/12 |
| A17 | PACK-01/02/03 | P2 未开始 |
| A18 | PACK-04 REL-03 | P2 未开始 |
| A19 | PACK-05/06 DATA-02 | P2 未开始 |
| A20 | PACK-05/07 | P2 未开始 |
| A21 | ENTRY-01/02 | P3 未开始 |
| A22 | CHAT-01/02 | P0引导/工作台8项、基础文本原生14项本地通过；真实服务预算与Pi未验 |
| A23 | DATA-04 REL-01/02/03/04 | Windows debug NSIS安装/升级/卸载保留配置通过；迁移/正式签名/macOS/Linux待验 |
| A24 | NFR-02/03/04 | 设备登记后测量，未验证 |
| A25 | REL-05 NFR-05 | 有界日志/诊断/新finally清理通过；旧六合成目录批量清理被自动审批拒绝，已留账 |
| A26 | G6 GW-08 OBS-01 ARCH-01 | P4 后续 |
| A27 | DATA-06 GW-08 RUN-06 | 持久策略/SUP-007屏障与旧快照保护通过；供应商连接代次在实际apply RestartRequired+私有未送达/丢回复、false/true四组合及严格操作确认已本机验证。真实凭据/桌面/其他错误平台矩阵与完整阶段仍待验，整体未通过，见P1-S10/14 |
| A28 | OBS-06 NFR-04 | 核心小容量SQLITE_FULL、实际HTTP开始/结束写故障、取消及sidecar真实死亡恢复通过；长期容量/WAL/查询清除矩阵仍待验，整体未通过，见P1-S11/12 |

目标映射：G1→A02/07/12，G2→A09/10，G3→A13–15，G4→A17–20，G5→A03–05/08/27/28，G6→A21/26，G7→A22。覆盖全部 69 条需求，测试结果逐批附证据。

## 空间与保留

启动：C/Temp 57.47 GiB，D 48.77 GiB。只使用 C/D，不操作 F。

本次 Rust/Tauri 首次构建预计新增峰值 6–10 GiB：`D:/demo1/tagmaai/target`（调试/编译缓存 ≤8 GiB），`D:/demo1/tagmaai/node_modules`（现有目录原地增加 Tauri 依赖 ≤0.3 GiB），`C:/Users/ai/.cargo/registry`（复用，新增 ≤1 GiB），系统 Temp（链接器/打包峰值 ≤1 GiB）。D/C 各保留至少 10 GiB。构建关闭 incremental、debug 信息等级 0 以限制缓存。若实际接近估算上限重新盘点再扩展。

不新增worktree/clone/运行环境/模型。旧.cache/release/dist/interactions保留；产品dist-tagma与target复用。S01两个fixture已回收；S02新finally驱动fixture已回收，专用安装已卸载。六个早期合成fixture约29.2MiB被自动审批以blocked by policy拒绝递归清理，原样保留，路径/用途/负责人/2026-10-24复查日见evidence/P0-S02-cleanup.json。末次C约50.3/D37.5GiB，target逻辑约2.2GiB；盘净变化受其他并发写入影响，不冒称精确物理占用或净释放。默认开发配置、WebView资料、生成未提交移动图标保留。

## 故障与审查

故障及替代验证见S01交接：search TLS→sparse成功；缺图标→补资源；本任务exe锁→核验停止；sky截图2次超时→停止，改原生WebView协议验证。未关闭TLS或重复整仓构建；监督网络反馈闭环。每阶段两遍自查明确同一执行者，不冒充独立审查。
