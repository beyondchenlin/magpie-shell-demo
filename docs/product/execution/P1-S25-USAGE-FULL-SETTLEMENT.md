# 真实SQLITE_FULL结束写入与有限恢复

2026-10-18，接续4ae6d61；源码候选dev.16/config9/usage2。仅新增核心故障测试，不改生产逻辑；用户dev.9/资料、禁止电脑控制和拖动未通过保持。A16/A28/P1仍不整体通过。

隔离库通过真实UsageStore登记8逻辑请求和8尝试，再把本连接max_page_count降到当前页数+2，用本测试触发器的256KiB插入制造真实SQLITE_FULL。额外直接插入确认SQLite错误确为DiskFull，非RAISE(ABORT)替代。故障发生在结束UPDATE事务内，16条结束分别失败/有界排队；8请求+8尝试保留running且token未知，日汇总0、部分padding0。新登记及空闲维护拒绝，故障仍存在时显式retry保留首项和16pending。

恢复原页上限、移除本测试触发器/表后，明确retry_pending两次：pending0/degraded=false，逻辑与尝试各8次、各输入16/输出8，记录token2/1准确且未重复计数。结果故障队列满限32和真实在途最多16的其他约束见S11/S12；本测试证明实际16项，不把它冒充32实际在途或实际HTTP磁盘耗尽。

第一轮检查真实错误类别、事务回滚/未知与有限队列、故障仍在时不能伪恢复；第二轮检查恢复幂等、逻辑/尝试不合并及资源：fixture逻辑文件总计73728字节，小于1MiB，不耗尽真实盘、不读取真实资料/凭据。TempDir在所有SQLite句柄关闭后回收，末次本任务capacity前缀0。新增测试1与core全target Clippy通过（原有ts-rs提示保留）；未改DTO/UI/网关生产代码，不重复无关全量验证。完整core基线引用S24的86/8ignore，新项另计，未声称重新跑完整87。

复用现有target/registry，新增峰值计划0.01GiB，C42.45/D10.02前后保持；不称净释放。无环境/worktree/安装/桌面/付费调用，无人工删除旧证据/缓存/审批拒绝文件。原始证据P1-S25-full-first.txt、clippy.txt、space-plan.json、space-after.json和manifest。尚缺实际平台/真实服务/外部客户端版本/桌面交互及完整容量组合证据，继续按台账推进独立源码工作。
