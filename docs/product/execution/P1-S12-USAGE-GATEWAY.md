# 用量登记接入真实网关（dev.15 / config schema8 / usage schema1）

2026-10-18。本批继续非 UI PRD 工作，接入实际独立网关、首步/后续步骤及响应生命周期。用户安装仍 dev.9，data/webview 未更新；没有窗口读取、截图、拖动、原生 UI 运行或安装，也没有真实凭据/上游访问。拖拽仍未通过。**A16、A28、A27 与 P1 继续未整体通过。**

## 最终行为

每个网关实例持有一个用量 writer 线程及32条消息的有界通道，不按请求创建线程。消息只包含有界元数据，不带正文/头/凭据。逻辑请求开始登记完成后才执行计划；每步在 SUP-007 共享屏障内等待其尝试开始记录提交，再复核取消/停止/预算，在同一屏障内首次轮询 HTTP send。撤销确认不能越过这一过程。登记失败或确认超时返回 USAGE_STORAGE_UNAVAILABLE，不派发该步骤，并围栏后续新登记。

登记/结算确认最多等待800ms，同时受剩余逻辑请求预算约束；超时不会另开 writer 或增加无界等待。过期、已失去接收端的排队开始命令不创建可用派发许可；已经提交但确认未送达的开始记录以 USAGE_START_UNCONFIRMED/interrupted 收尾，token未知。该路径没有网络执行，完成时间采用登记时刻，避免晚确认越过已经排队的取消。时间序列用请求的 UTC 起点加单调经过时间，避免普通系统时钟回退破坏顺序。

非流式响应在返回成功前结算尝试及逻辑请求；顺序小队按各次尝试归集 token，未知部分不补零。流式响应保留已有片段，在发出成功 DONE 前确认结算；写入/确认失败输出记账错误并停止成功结束。已有上游错误保持原始错误码，附 unconfirmed 用量状态；非流失败响应通过 x-tagma-usage-state 表示额外的记录不确定。连接丢弃通过生命周期 guard 登记取消，随响应释放实际上游。撤销、停止、上游断流与取消的结果不冒充成功。

成功表示网关完成了响应准备/结算，不保证客户端最终收到了所有字节。尝试数是持久登记的执行尝试，也可能在发送前取消或失去确认；不能等同于上游接收数或账单。无效鉴权、请求形状和未找到模型等派发前拒绝尚不纳入这批逻辑请求统计。目录 GET 不产生推理用量。

结束写入失败保留 S11 的有界恢复记录，已登记开始行留在库中。运行状态独立暴露 usage_degraded / usage_pending_results，不被普通配置 apply 清除。恢复仅走当前实例的私有 RecoverUsage IPC + GatewayManager，验证队列及 metadata/checkpoint 后按 writer FIFO 顺序解除围栏；有故障时拒绝确认，数据 API 没有管理恢复入口。目前尚无原生恢复按钮或用量界面。崩溃重启将未终结行转为 interrupted，最终用量未知保持 NULL；内存中未落盘的真实结果不能在崩溃后凭空恢复。

## 真实 HTTP 验证

新增两个综合集成用例，全部使用自己的 loopback 上游、隔离目录和实际 sidecar 二进制。上游处理器在收到请求时直接只读检查已有 running 逻辑请求及相应模型的 running 尝试记录，缺失就失败。

| 场景 | 实际断言 |
| --- | --- |
| 非流成功 | 请求1/尝试1，cfg2，token2/1，返回成功前已持久保存 |
| 逻辑请求开始写失败 | HTTP503，上游增量0，degraded=true，显式恢复后解除 |
| 首次尝试开始写失败 | HTTP503，上游增量0；已有逻辑请求正常记失败 |
| 顺序小队 | 请求1/尝试2，总token4/2；第二尝试登记失败时第一步仅1次、第二步0次 |
| 结束写失败 | 两项待恢复，未知token NULL；新请求上游增量0，普通apply不解除围栏；故障仍在时恢复被拒，修复后pending0且未知仍NULL |
| 成功SSE | token3/2在DONE之前保存 |
| SSE结算失败 | 保留部分正文、输出记账错误，无成功DONE；两项有界结果可恢复 |
| 客户端断开 | 实际上游流关闭，请求及尝试为cancelled，未知token不变0 |
| revoke(true) | 现有片段后ACCESS_REVOKED，无DONE，请求及尝试cancelled/未知用量 |
| 实际sidecar被杀及重启 | 杀之前已存在请求/尝试开始记录；重启两行均interrupted，token NULL |
| 管理/隐私 | /v1/recover-usage为501；元数据错误仅稳定代码，无合成正文落入用量文件 |

HTTP存储故障通过自有测试触发器注入，不把它冒称真实磁盘耗尽。真正 SQLITE_FULL 的小容量样本仍是 S11 核心测试的证明范围。没有真实收费、真实供应商或 OS 凭据验收。配置中的 SystemCredentials 在这些 fixture 中没有凭据引用，未执行 OS 密钥读写；令牌 HTTP 回归仍使用内存凭据。

## 两轮自查

同一执行者两轮，非独立审计。

1. 检查开始确认与取消竞态，先用确定性 test-only 屏障复现“提交已成、确认未送达”遗留1行，再修复为0行；before-source与before/after失败原输出保留，实际修复通过的是 ack-fixed/ack-deadline-final，不能把名称为 after 的失败日志计通过。该单元验证生命周期，不替代 HTTP 零调用用例。补剩余150ms预算到期时停止确认等待、显式恢复及队列关闭后连接释放。
2. 检查结果/恢复确认顺序：恢复解除围栏在 writer 内完成，metadata可读性与内存待恢复数量在确认前核实；避免调用方在收到确认后覆盖另一次故障状态。补第一次/第二次尝试故障、流token与撤销记录、上游入场时查开始行、普通apply不能解除围栏。隐私检查只检验产品写入的正文/元数据，不把测试自己写入的触发器SQL当作产品泄漏。已修正首轮类型/命令名及Clippy提示，没有放宽检查或抑制警告。

## 命令与原始结果

全部 Rust 命令使用 --locked --offline，复用已有缓存。

| 检查 | 结果 | evidence/P1-S12- |
| --- | --- | --- |
| 完整tagma-core | 60通过，7显式忽略 | core-final.txt |
| 完整tagma-gateway | 33通过，2显式忽略；包括SUP-007原有五场景 | gateway-verified.txt |
| 最终usage HTTP补验 | 两综合用例通过，新增apply不解除围栏及元数据隐私断言 | usage-http-complete.txt |
| runtime lib | 1通过 | runtime-final.txt |
| workspace全target Clippy + 最终gateway全target补验 | 通过；ts-rs原有严格serde宏提示保留 | clippy-final.txt、clippy-complete.txt |
| DTO生成/一致性、TS/Vite、CIS guard | 通过，公共样式及原App.tsx未改；不代表UI验收 | dto-generate/dto-check/frontend/cis.txt |
| oxlint JSON | 两文件、116规则、diagnostics为空 | lint-json.txt |

重复运行不累计为新用例；9项显式忽略均不计通过。最后源码/测试与原始结果绑定见 evidence/P1-S12-manifest.json。用户配置/安装未迁移，候选升级dev.15，业务配置schema仍8，用量库单独schema1。

## 留存与继续工作

无新增worktree/clone/环境/模型。开始计划C42.63/D12.71GiB，附加峰值1.5GiB、目标盘预留至少10GiB；末次值见manifest，差值含其他任务，不宣称净占用/释放。仅保留原target/dist和必要源码/日志，没有新安装包。新增tagma-usage-* fixture无残留。扫描另发现两个先于本批计划存在的tagma-gateway-unit目录，共122880逻辑字节，均无usage文件；不根据目录名清理，不把它们计为本批新增。绝对路径、创建/写入时间与保留决定见 retention.json。此前被审批拒绝的旧文件与Temp清理均未重试。

后续继续用量只读查询/筛选/汇总、明确清除及缓存失效、软预算/真实额度区分、原生恢复入口和容量/长期读者完整矩阵。A27的“配置应用失败+IPC丢失”组合矩阵仍为出口待办，不能用本批正常apply与记账围栏测试替代。P0/P1与发行仍未通过，P2/P3尚待实施；不因完成此批而停止其他已授权独立工作。
