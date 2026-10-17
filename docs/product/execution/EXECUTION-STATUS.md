# Tagma 执行状态

唯一执行进度入口；依据 PRD v0.3 + EXECUTION-BASELINE.md。执行者独占代码与构建；监督文件由原聊天维护。

## 最新用户限制：禁止电脑控制

2026-10-17，用户在监督聊天明确指令“汇报一下工作进度，现在禁止控制电脑”，已通过监督转达。此前保持电脑控制的授权撤销。立即停止所有截图、窗口读取、激活、点击、输入、拖动及会抢焦点的原生UI验收；不关闭或操纵当前用户应用。仅继续已授权源码/文件/非UI构建与测试，用户重新明确授权前不恢复电脑控制。下文的窗口/连接记录均为本限制之前的历史观察，不表示当前仍在读取或操作。

## 用户保留预览（禁止按测试清理）

2026-10-17 17:44：用户要求重装、随后要求修复拖动；当前已安装且打开 **dev.9/schema3**，目录 C:/Users/ai/AppData/Local/Tagma，桌面和稳定入口指向最新版、沿用原预览data/webview。CIS沿用dev.8；原生拖动权限/区域及双击最大化还原补齐，八项原生交互验证通过，真实物理鼠标位移未确认。Computer Use重新枚举绑定、文字状态可读；截图FrameArrived超时并做有界恢复。旧预览EXE批量删除被自动审批 blocked by policy 拒绝，原文件保留，未绕过。详见[P0-S06](P0-S06-WINDOW-DRAG.md)。下文dev.6/7状态为历史。

2026-10-17 16:22：dev.7（650b2c9）已复制并核对hash，稳定入口更新且加运行保护；原dev.6仍运行，当前表单/进程未关闭，dev.7尚未实际打开。旧版本退出后再开稳定入口即可使用新对话。清单与evidence/P1-S01-retained-preview-dev7-prepared.json明确区分“准备完成”和“当前运行”；未复制/改写data/webview。

2026-10-17 15:58已实际打开dev.6可见接入工作台，已保存1/运行中1。入口[D:\demo1\tagmaai-preview\打开Tagma预览.lnk](D:/demo1/tagmaai-preview/打开Tagma预览.lnk)，桌面“Tagma 最新预览”；独立持久data/webview，不是fixture。运行EXE从c655972已验构建复制后hash核对，网关无附着控制台。更新前确认旧预览已退出，本执行器未关闭；旧dev.5及配置保留。不要关闭/卸载/覆盖这个预览来解构建锁或执行测试清理。完整保护约定见[USER-PREVIEW](USER-PREVIEW.md)，evidence/P0-S04-retained-preview-dev6.json记录实际窗口及版本，旧证据留存。

## 当前批次

- 小队网关后端已支持精确发布版本目录、manual/sequential执行、修订/目标固定、仅最终流及中间失败/取消中止；实际本机HTTP集成通过。网关5单元+旧推理1+生命周期10+新小队1通过（2显式测试忽略），前端仍待接线，用户安装仍dev.9、禁止电脑控制继续有效。详见[P1-S03执行](P1-S03-TEAM-EXECUTION.md)。

- 源码候选dev.10/schema4新增小队草稿/不可变修订/逐版本可用性与发布校验，核心19+原配置10+小队6项非UI测试通过；网关执行/前端仍待接线，不能宣称A13–15完成。已安装用户版本仍dev.9/schema3，未触碰用户库或控制窗口。详见[P1-S02基础](P1-S02-TEAM-FOUNDATION.md)。

- dev.9窗口拖动热修已安装并实际打开；未修改公共CIS CSS或业务schema，未新增worktree/环境。八项交互验证只证明原生命令/按钮排除/实际最大化还原，不冒充真实物理拖动验收。配置、密钥引用、WebView资料和用户安装继续保留。

- 用户最新优先级：先恢复前期一比一复刻的CIS外观，再继续小队。dev.8/schema3已恢复同源顶栏/侧栏/行卡片/引导/菜单及完整共享样式，默认110%、原生窗口theme同步；两轮看图与独立原复刻同原生视口比较后，最终CIS14项通过，聊天14/主路径16/网关10回归通过。详见[P0-S05外观纠偏](P0-S05-CIS-CORRECTION.md)。旧dev.6/7仅功能通过不当作外观批准，六guard不代替整页验收。

- 日期：2026-10-17（Asia/Shanghai）；P0-S04按用户最新反馈优先交付可见接入工作台，随后真实基础对话，再小队/ReachFlow；不再问用户排优先级，不以后台测试代替界面交付。P0整体及发行门槛仍未通过。
- 源码起点03643407ed214f7e4d2a3804423028ee496b9a4a；S01提交7f5c5fb，S02提交6b24b95，恢复7cfb5a5，迁移6e618ef，档案c6c485a，网关36001a5，工作台c655972，聊天650b2c9；当前codex/tagma-p0保留继承dirty。最新候选dev.8、IPC1/schema3，原生嵌入构建及声明范围CIS对照通过；安装包仍为历史dev.3，未冒充新版本发行验收。
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
| A08 | PROV-02/04/06 NFR-08 | P1 未开始 |
| A09 | G2 GW-02/03/04 | 文本非流式/SSE/目录真实网关集成通过；工具及外部Agent版本矩阵待验 |
| A10 | GW-04/05/06/07 NFR-04 | 分片/取消/断流/限流/体积/修订隔离本地通过；供应商超时配置及完整用例待验 |
| A11 | GW-08 NFR-07 | P1 未开始 |
| A12 | DATA-02 GW-04 | P1 未开始 |
| A13 | TEAM-01/02 GW-03 | P1 未开始 |
| A14 | TEAM-03/04 | P1 未开始 |
| A15 | TEAM-02/05/06/07 | P1 未开始 |
| A16 | OBS-01/02/03/04/05/06 NFR-05 | P1 未开始 |
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
| A27 | DATA-06 GW-08 RUN-06 | P1 未开始 |
| A28 | OBS-06 NFR-04 | P1 未开始 |

目标映射：G1→A02/07/12，G2→A09/10，G3→A13–15，G4→A17–20，G5→A03–05/08/27/28，G6→A21/26，G7→A22。覆盖全部 69 条需求，测试结果逐批附证据。

## 空间与保留

启动：C/Temp 57.47 GiB，D 48.77 GiB。只使用 C/D，不操作 F。

本次 Rust/Tauri 首次构建预计新增峰值 6–10 GiB：`D:/demo1/tagmaai/target`（调试/编译缓存 ≤8 GiB），`D:/demo1/tagmaai/node_modules`（现有目录原地增加 Tauri 依赖 ≤0.3 GiB），`C:/Users/ai/.cargo/registry`（复用，新增 ≤1 GiB），系统 Temp（链接器/打包峰值 ≤1 GiB）。D/C 各保留至少 10 GiB。构建关闭 incremental、debug 信息等级 0 以限制缓存。若实际接近估算上限重新盘点再扩展。

不新增worktree/clone/运行环境/模型。旧.cache/release/dist/interactions保留；产品dist-tagma与target复用。S01两个fixture已回收；S02新finally驱动fixture已回收，专用安装已卸载。六个早期合成fixture约29.2MiB被自动审批以blocked by policy拒绝递归清理，原样保留，路径/用途/负责人/2026-10-24复查日见evidence/P0-S02-cleanup.json。末次C约50.3/D37.5GiB，target逻辑约2.2GiB；盘净变化受其他并发写入影响，不冒称精确物理占用或净释放。默认开发配置、WebView资料、生成未提交移动图标保留。

## 故障与审查

故障及替代验证见S01交接：search TLS→sparse成功；缺图标→补资源；本任务exe锁→核验停止；sky截图2次超时→停止，改原生WebView协议验证。未关闭TLS或重复整仓构建；监督网络反馈闭环。每阶段两遍自查明确同一执行者，不冒充独立审查。
