# SUP-008：恢复操作结果与运行快照分开确认

2026-10-18，基于S12本地提交7bd2c92继续修复OBS-06/A28的一个管理确认边界。只做隔离私有IPC、writer和实际无窗口sidecar回归；未操作桌面或用户dev.9安装/数据，未读取真实凭据/访问真实上游。A28/A16/A27及P1均未整体通过。

## 先失败，再修复

S12的GatewayManager::recover_usage只检查实例、usage_degraded=false及Running/Degraded，未要求pending=0或核实操作错误。新增真正本机私有IPC测试监听器返回匹配信封与实例、运行态、degraded=false/pending0，同时status.error=USAGE_STORAGE_UNAVAILABLE的快照。原始SUP-008-before.txt确定性显示manager_accepted=true，断言失败。这里只证明该具体错误快照被旧源码接受，没有宣称所有其他负例都已跑过before。

前置源码及测试指纹见before-source.json，三个既有源码可由基线提交恢复，新测试原样保留于before-test-source.txt。测试监听器不启动桌面、不模拟真实供应商；这是管理确认层证明，不把它当作完整真实进程故障矩阵。

## 当前确认规则

私有Response新增带种类的operation结果，RecoverUsage显式携带confirmed及error，原有RuntimeStatus保留独立的运行错误。sidecar保存本次恢复返回值，再读取运行快照；即使writer随后完成，原来的超时/失败仍在操作结果中。IPC客户端在信封和challenge校验后核实本次操作；manager再次核实当前状态。

只有本次RecoverUsage明确confirmed=true、操作error=None、当前实例匹配、Running/Degraded、usage_degraded=Some(false)、pending=Some(0)才可确认。缺失操作确认的旧回复失败关闭，不默认健康。明确记账错误或含糊的StorageUnavailable状态也拒绝。

成功恢复可以与已有ConfigApplyFailed/RestartRequired/CredentialStoreUnavailable/MaintenanceInProgress配置运行错误并存；只有明确成功的操作结果才能按此区分，原运行错误原样返回，未清空或冒充整个网关正常。同样的错误码若位于本次operation.error则始终拒绝，不能当作“无关错误”吞掉。

## 两轮自查和有界竞态

第一轮核对manager与IPC各层信封/实例/字段：12个负例全部拒绝（记账错误、缺失或非零pending、错误实例、失败运行态、失败操作配健康快照、缺操作确认、缺健康字段、含糊存储错误、操作中的配置错误、否定确认、缺confirmed）。两个正例接受：完整健康确认，以及带明确恢复成功结果且保留无关配置错误。它们合并在一个集成用例，不冒称14个独立测试。

第二轮核对恢复超时与晚完成：在真实UsageStore中先制造一项结束写失败，去除自有触发器，再用test-only latch暂停writer处理恢复。调用方800ms到期返回Err；释放后writer确实将pending1变0、degraded变false；原操作结果保持Err。该worker竞态单元与“操作失败+健康快照”私有IPC负例分别证明两端边界，不宣称已在独立进程中确定性复现完整时序。测试latch最多等3秒，父端入场最多2秒，晚完成最多1秒，失败也不会留下永久等待线程。生产构建不包含这些hook。

## 验证与留存

| 检查 | 实际结果 | evidence/ |
| --- | --- | --- |
| runtime全测试 | lib1 +管理IPC综合1通过 | P1-S13-runtime-final.txt、SUP-008-matrix-final.txt |
| writer相关单元 | 3通过，含新增晚恢复竞态、S12晚开始确认和剩余预算 | SUP-008-writer-final.txt |
| 实际gateway相关集成 | 生命周期12/撤销1/用量2通过，2显式忽略不计 | P1-S13-gateway-related.txt |
| SUP-007定向回归 | 1用例内provider/token首步/后续步各0调用；已准入false仍1调用完成 | P1-S13-sup007-regression.txt |
| workspace全target +最后runtime全target Clippy | 通过；原有ts-rs宏提示保留 | P1-S13-clippy.txt、P1-S13-clippy-final.txt |

本批相关gateway19项、runtime2项通过，非全阶段通过率；不与S12完整33项重复累计。没有改前端DTO/CIS，因此不重复前端或桌面验收。原始失败、修复、最终源码和结果由P1-S13-manifest.json绑定。用量/业务schema与候选dev.15不变；私有操作确认是本未发布候选内的收紧，缺确认的旧回复安全拒绝。

复用原target/registry，无新worktree/环境/安装包。附加峰值计划0.3GiB，前后C/D余量见space-plan和manifest；盘差值含并发任务，不报净释放量。本批tagma-recovery-*临时前缀无残留；S12记录的两个既有小fixture、旧审批拒绝文件及其他验收资料原样保留，没有手工删除。下一步恢复独立A27配置应用失败+IPC未送达/确认丢失矩阵工作；它仍为出口待办，SUP-008不替代它。
