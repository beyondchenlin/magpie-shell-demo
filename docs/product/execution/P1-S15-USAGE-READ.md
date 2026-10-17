# 用量只读查询与本机桥接（限定源码及无窗口验证）

2026-10-18，接续 fd39e96；源码候选 dev.16/config schema8/usage schema1。新增请求列表、请求及步骤详情、UTC日汇总，复用独立 usage.sqlite3，不改配置库或用量写入格式。用户安装仍 dev.9，用户资料、密钥及当前窗口不动。拖动仍未通过，A16/A28/P1未整体通过。

## 查询语义

请求列表按开始时间及请求ID降序、游标分页；详情包含至多16个实际尝试。筛选供应商、模型、配置/小队修订、结果状态，明细另支持错误码。每页最多32项、响应最多48KiB，时间范围最多366日。汇总只接受完整UTC日边界，明确拒绝未被日表保存的错误码筛选；每个口径按各自开始日归属。请求口径的供应商为最终回答目标、模型为请求的公开ID；尝试口径为实际步骤目标，不能相加当作单一调用数。

汇总总计覆盖完整筛选范围，不随当前页变化。运行中表示尚未终结的持久记录，不证明上游此刻仍活跃。计数、已知/未知token计数及token和为十进制字符串，跨行使用checked u128；未知保持null，确实报告的0才是"0"。任一未知存在时完整token总量为null。无库返回not_created及未知总计，不伪造0。返回明细保留起点、最早日桶及观测时刻，不能把已保留登记记录当作全部HTTP访问、完整历史、服务商账单或费用。

## 边界与资源

只读打开固定usage.sqlite3，query_only、512KiB缓存、内存临时页及100ms锁等待；核对schema归属/版本/对象/列及数据形状。缺库不初始化，初始化未确认、未知库、不可读取、重解析点或矛盾记录拒绝，不修复、不清理。不存在必须是实际NotFound，其他元数据错误不得显示成空库。每次查询有一致读事务；跨页在数据库变化后不是同一个冻结快照，清除代次失效尚未实现。

共享runtime reader仅一个实际阻塞worker，无排队；500ms只限制调用等待，超时/取消设置标志并调用SQLite interrupt，许可一直由实际worker持有到连接/事务退出。不能据此保证任意OS文件IO在500ms结束。取消查询不取消模型请求。native只在本机main窗口、配置固定目录开放usage_requests/details/summary和既有严格recover_usage；没有任意路径参数、数据面管理路由或凭据读取。前端本批只有类型、服务及错误文本接线，没有新面板或现场可见交付。

## 两轮自查

第一轮检查语义和失真：相同时间分页、请求/尝试分离、未知与真实零、范围完整总计、超过JS整数及u64的加总、SQL字面筛选、最长转义模型和响应上限。补入summary_start_ms，避免把保留范围外的缺失日解释为已知零；不支持的汇总筛选明确报错。

第二轮检查失效与生命周期：缺库与访问失败区分，pending/未知schema/矛盾行拒绝且原文件不改；真实SQLite递归VM被OperationInterrupted，连接线程退出。reader超时后仍占唯一许可，第二查询不增线程，真实退出才恢复；真实网关在途详情读取不关上游。最后将Path.exists改为symlink_metadata，仅NotFound判缺失，相关6个读测试及1个reader测试、core Clippy复验通过。

## 验证证据

| 范围 | 结果 | evidence/P1-S15- |
| --- | --- | --- |
| core完整 | 66通过，7显式忽略不计 | core-final.txt |
| runtime完整 | 4通过 | runtime-final.txt |
| gateway相关 | revocation_faults 1、usage 2通过；最后usage 2复验 | live-bridge.txt、live-bridge-complete.txt |
| 最后受影响检查 | 只读6、reader 1通过，core Clippy通过 | read-verified.txt、reader-verified.txt、clippy-verified.txt |
| workspace/网关Clippy | 通过；原有ts-rs属性解析提示保留 | clippy-final.txt、clippy-complete.txt |
| DTO、TypeScript/Vite、lint、CIS | 通过，lint 3文件116规则0诊断 | dto-check.txt、frontend.txt、types-execution.json、lint-final.txt、cis.txt |
| native权限/注册 | 静态四项核对通过，未实际调用桌面命令 | native-capabilities.txt |

同一用例的多次复验不累加。6个读测试包括7逻辑请求/11尝试与未终结1条、精确3*i64MAX="27670116110564327421"、最大页及16尝试、坏库及真实SQL interrupt。真实无窗口sidecar请求→reader列表/详情/UTC尝试总计的ID、配置2、token2/1一致；在途SSE读出running/null且上游未断，直到测试主动丢弃客户端。数据面usage_requests为501、额外推理0。旧S12失败/恢复/取消/异常退出用例同时回归，但不当作新覆盖数。

原始失败/初检及成功输出均保留。tsc成功静默，types-execution.json诚实记录先前已完成的guarded执行，未虚构stdout。源码和证据绑定见manifest。无真实上游/费用、真实凭据或UI验收。

复用已有Cargo target/registry/node_modules，无新worktree/环境/安装包。计划附加峰值0.5GiB，末段修订剩余0.15GiB；各盘前后见space-plan/manifest，含并发写入，不能作净释放量。自有TempDir及worker退出，最后本批reader前缀无新残留；原先小fixture、用户目录及审批拒绝清理的旧文件均保留。本批未清理先前证据。

## 剩余

用量面板、显式清除/并发清除失效、预算与完整容量故障矩阵仍待做。查询后端的本机证据不等于A16/A28或发行通过；继续可独立完成的源码工作。自由拖动的真实失败原因及物理位移仍未确认，禁止电脑控制期间不猜测根因或以合成命令响应冒充修复。
