# Tagma 执行状态

唯一执行进度入口；依据 PRD v0.3 + EXECUTION-BASELINE.md。执行者独占代码与构建；监督文件由原聊天维护。

## 当前批次

- 日期：2026-10-17（Asia/Shanghai）；P0-S03先闭环SUP-004初始化记录原子发布及原生受控恢复，再进行AppProfile/网关设置/迁移。P0整体未通过。
- 源码起点03643407ed214f7e4d2a3804423028ee496b9a4a；S01提交7f5c5fb，S02提交6b24b95，恢复提交7cfb5a5；当前codex/tagma-p0 S03 dirty+保留继承dirty。已交付dev.3，原生dev.4恢复切片已验证；最新配置核心IPC1/schema2迁移通过局部测试，原生/安装包待随下一切片复验。
- 启动盘点时仅有Electron/React mock；现已新增Tauri宿主、Rust核心/独立网关。继续复用npm/node_modules、Cargo registry、MSVC、Rust1.98.1、WebView2 155.0.4283.60，未重复安装环境。
- 已实现：Tauri原生三页、受限异步IPC、共享Rust配置服务、SQLite乐观事务、系统凭据/journal恢复、单源生成DTO。详细边界与两遍自查见 [S01交接](P0-S01-HANDOFF.md)。
- 已验证：S01历史6项故障集成/OS凭据1项/原生7项；S02新增安装后16项、最新进程8项、并发apply4项、初始化/诊断5项、OS凭据真实进程恢复。构建/DTO/lint和保留CIS guard通过；无完整A用例通过声明。
- 最近有意义变化：dev.3安装后16项通过；宿主/网关PE=GUI(2)，不隐藏窗口的驱动确认两者无附着控制台，Windows应用启动器仅Tagma主窗；日志20MiB×5及脱敏预览。SUP-001/002先复现后修复测试通过；最新进程回归8项。NSIS安装/升级/卸载与配置保留通过，仍debug未签名。详见[P0-S02交接](P0-S02-HANDOFF.md)及evidence/P0-S02.json。
- 最近S03变化：SUP-004三个真实子进程故障（intent刚创建/半写/已sync未发布）修复前3失败、原子暂存发布后3通过；未知/损坏正式记录保护与显式hash确认归档2项通过；真实原生确认/归档/退出重启/网关恢复8项通过，finally清理通过。首轮原生驱动误读了第二次预览生成的UUID，已改验用户实际看到的计划并复验通过，失败证据保留。
- 迁移切片：schema1→2一致WAL备份、排他锁、journal恢复及真实dev.3网关拒绝/退出后升级通过；核心lib14项通过，配置integration6项通过，Clippy通过。详见[P0-S03迁移记录](P0-S03-MIGRATION.md)。没有自动降级/回滚UI，不将局部测试当成完整A23。
- 下一步：P0-S03 AppProfile引用与覆盖、持久网关设置/令牌、排他迁移与一致性备份；再完成主路径/性能及平台出口验证。
- 外部依赖：macOS/Linux 目标环境、发行签名、已授权真实上游及预算、ReachFlow 发行与服务授权。当前可独立实施的 P0 工作不依赖它们。
- release_blocked：是；Windows内部debug NSIS安装/升级/卸载已验证；正式签名、干净无开发环境机器、macOS/Linux及完整P0门槛仍未通过。

## 继承修改（不提交、不覆盖）

`docs/REPLICA-ACCEPTANCE.md`、`docs/cis/EXECUTION-STATUS.md`、`docs/cis/PR-DESCRIPTION.md`、`docs/cis/RETENTION-2026-10-17.md`、`interactions/cis-release-1ebfb66/NOTES.md`、`src/data/{de,ja,zh-TW,zh}.json`、`src/pages/RoutingView.tsx`、`src/pages/SimpleViews.tsx`、`src/styles/context.css`；未跟踪 `interactions/web-cis-0.1.195/`。现有 `docs/product/` 为已交付产品依据，保留；只提交本执行新增文件及明确的产品接线。

## 阶段门槛

| 阶段 | 退出条件 | 当前状态 |
| --- | --- | --- |
| P0 | A01–A07，适用 A23–A25；真实配置/凭据/生命周期/安装 | 实现中；未通过 |
| P1 | A08–A16、A27/A28，适用 A23–A25；先真实协议链路再小队/用量 | 未开始 |
| P2 | A17–A20 + 受影响回归；首个队员仅 ReachFlow | 未开始 |
| P3 | A21；CLI/Skill/MCP 共用核心 | 未开始 |
| 对话 | A22 的 P0 未接入态 → 真实网关对话独立切片 | 未开始；完整 Pi 未立项 |
| 后续 | P4/A26、完整 Pi harness、其他队员 | 不在本轮 |

## 用例与需求映射

逐项状态不是通过率。以下“未验证”均不计已完成。

| 用例 | 需求 | 状态/证据 |
| --- | --- | --- |
| A01 | UI-01/02 ARCH-01 REL-01/04 | Windows debug包内资源/sidecar/三页启动通过；干净无开发环境机器/正式签名/其他平台待验 |
| A02 | PROV-01/03 DATA-01/02 | CRUD/排序/重启及原生提交通过；AppProfile/运行确认未完成 |
| A03 | PROV-05 DATA-03 NFR-07 | OS凭据写后、建库中断、intent创建/半写/发布前中断真实进程恢复通过；损坏记录原生显式归档及重启恢复通过；未知数据库始终保留拒写 |
| A04 | GW-01 ARCH-02 RUN-01/02/06 | Windows真实二进制端口/并发/握手/所有权通过；完整历史版本与跨用户/Unix待验 |
| A05 | RUN-03/04/05 | 父EOF/独立实例/有限重启/原生完整退出通过；原生关闭到托盘helper受阻未通过；Mac/Linux待验 |
| A06 | UI-01/02/03/04 NFR-01/06 | P0 未验证 |
| A07 | DATA-01/05 | 双入口与原生过期编辑冲突通过；演示无导入路径；阶段复查待完成 |
| A08 | PROV-02/04/06 NFR-08 | P1 未开始 |
| A09 | G2 GW-02/03/04 | P1 未开始 |
| A10 | GW-04/05/06/07 NFR-04 | P1 未开始 |
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
| A22 | CHAT-01/02 | P0 未接入态待实现；真实对话待独立切片；Pi 后续 |
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
