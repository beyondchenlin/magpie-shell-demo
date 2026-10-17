# 唯一用量写者的空闲保留处理

2026-10-18，接续25cd96e；源码候选仍dev.16/config9/usage2。补OBS的业务元数据保留，不是系统磁盘清理或新增Codex/系统计划任务。用户dev.9安装/真实资料不动；禁止电脑控制与拖动未通过保持。A16/A28/P1不整体通过。

原实现只在打开库或新请求登记时执行期限保留，空闲写者长期存在时不会主动检查。现在同一个有界worker使用recv_timeout，在生产连续空闲60秒后执行UsageStore::maintain，仍复用原admit/WAL/降级/事务清理路径；持续推理已有begin触发检查，不新增线程、等候队列或独立写连接。关闭sender立刻唤醒Disconnected并join，不为等待定时器拖延退出。不是严格到秒的删除SLA；忙碌事务及阻塞可能延迟。

无数据及保留起点变化的prune不再推进change_revision。先失败用例证明同一时刻相同库视图的原prune无故1→2，让已预览清除失效；修复为汇总删除数量、明细删除数量和实际单调floor更新，只有存在变化才bump。保留边界本身推进仍属真实可见变化，应该使旧计划失效；显式清除代次独立不因期限清理增加。DELETE/floor/bump仍同事务，容量128条限制及30天/12月策略不变。

空闲处理只在健康未fenced状态运行，故障/pending时跳过。不会retry_pending或偷偷恢复失败结果；clock/storage/metadata错误使现有Shared.blocked=true并维持到明确私有恢复命令。通过原运行状态暴露，不添加正文日志。原有时间期限删除仍为批量，16MiB是新登记围栏，不能据此承诺所有事务WAL或全目录严格16/256MiB物理封顶；完整容量/延迟组合仍待验。

第一轮自查：no-op修订/已预览clear、实际期限删除与在途保护、清除epoch不变、日汇总保留；core4项定向通过（包含S23容量2），新无变化及维护2项通过。初次gateway命令误用了--lib（此包只有bin），失败日志writer-first.txt保留，正确--bin后8项writer测试通过。源码补丁一处过宽匹配在检查时发现落到完成更新位置，立即纠正后再编译，没有把错误版本测试结果当成功。

第二轮生命周期/失败检查：同一worker真实空闲timer让一个合成明细跨过30天，无新请求/派发/管理消息即被删除，日汇总1保留、健康、drop线程关闭。仅单元构建缩短timer为50ms，生产仍60s，不能声称真实等候60秒的安装版验收。真实结果写故障形成pending1，移除故障后idle tick仍不重放；明确retry后模拟clock失败重新fence，后续tick不自动解除。所有测试仅自有SQLite/内存或实际headless sidecar，无用户窗口、凭据/付费上游。

完整core86通过/8显式忽略不计（lib63/5ignore、catalog1、config10/3ignore、first1、security4、teams7）；writer8通过；实际HTTP usage4+clear1通过，含SSE记账故障/取消/顺序、进程死亡恢复、软阈值、长读者checkpoint及丢回执清除。workspace全target Clippy（含native源码）通过。原ts-rs提示保留。DTO/前端未变，不重复TS/视觉检查；引用S21/S22源码证据，不冒充原生预算/Storage或拖动验收。

证据evidence/P1-S24-{noop-before,core-first,core-final,writer-first,writer-final,http,clippy}.txt与manifest。复用target/registry，计划附加峰值0.03GiB；自有TempDir/worker/sidecar关闭后收尾，idle前缀残留0。未建环境/worktree，未删除既有缓存/证据/旧fixture/被审批拒绝文件。C42.44/D10.02→C42.45/D10.02GiB含并发变化，不当净释放；用户安装和资料继续保留。
