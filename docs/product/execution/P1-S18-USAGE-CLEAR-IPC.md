# 用量清除私有管理接线（未开放桌面命令/UI）

2026-10-18，接续99e3a8d，候选仍dev.16/config schema8/usage schema2。本批接唯一writer、真实私有IPC、manager及错误DTO，不新增数据面管理路由、native capability或清除UI。用户安装仍dev.9，资料/窗口未操作，禁止电脑控制与拖动未通过状态不变；A16/A28/P1未整体通过。

## 写入与等待边界

PrepareUsageClear和ClearUsage经当前用户私有通道进入原有唯一用量writer，复用32条有界队列，没有额外线程/环境。管理队列满返回busy，不能把正常的管理繁忙/旧预览失效当作推理记账失败。开始执行前若调用已取消或800ms等待期限已过则跳过；已开始的SQLite操作不会因调用者停止等待自动撤销。clear等待超时为USAGE_CLEAR_UNCONFIRMED，须显式核实同一plan，不能新建范围自动重放。

管理操作后独立读取记账状态，真实存储/恢复故障仍使记账降级；busy/changed/等待到期不新增降级。原先已存在的未确认准入标记，即使核心存储暂时可读也阻止新清除，需要原有显式恢复。没有通过清除操作自动解除记账围栏。工作线程仍持有真实资源直到返回，超过等待预算不代表OS IO已终止。

## 明确的操作结果

预览回复独立包含plan或error；客户端核对请求范围、规范UUID、精确非负整数串及当前实例/运行态。清除回复独立包含receipt或error，核对完整原plan、下一代次和有效提交时刻；缺失/错误种类、错误范围/ID/数量/修订/代次、无回执、明确操作错误都不能用健康runtime快照替代。

私有manager新增方法，保留原call返回RuntimeStatus的契约，内部共享已校验的完整Response。传输失败/版本握手失配后的clear保守标未确认。回执证明该操作的逻辑删除提交，不证明当前配置已应用或当前记账始终健康；明确成功的回执可与随后出现的运行错误并存。原始operation.error始终拒绝，不借用稍后的健康快照将其改成成功。私有协议64KiB帧、2秒、8连接、配置/实例/challenge身份检查保持。

没有自动重试、付费推理或数据面权限扩张；同一plan核实由调用者明确触发。桌面暴露与范围确认、最低代次缓存围栏留到下一批。

## 两轮自查与实际证据

第一轮检查writer所有权/生命周期：所有SQL继续单worker；enqueue短锁在await前释放，避免持同步锁等待。真实writer在clear已提交后暂停回执，800ms调用返回unconfirmed；释放后同plan取得原generation1，原超时不被改为成功。另一实际worker测试在恢复暂停期间加入过期及已关闭回复的控制，均跳过，代次保持0；独立1格合成通道的full返回busy且不锁死记账。hook等待有3秒上限，父等待有界，退出关闭worker。

第二轮检查操作/快照分离及错误分类：真实socket的两项综合测试包括clear 16负例/3正例、preview 6负例/1正例，不把22个负例重复算22个测试。正例中的配置或用量runtime错误只用于证明独立操作回执语义，不冒称真实进程时序。随后补入内存blocked围栏的拒绝/恢复检查，最终6个writer用例复验。SUP-008和安全确认旧矩阵也回归通过。

真实无窗口sidecar综合用例：先用生产UsageStore接口填入过去一天的**合成历史**1请求/1尝试/2日桶，再经实际HTTP产生当天3条请求（token2/1），不是让HTTP服务器伪造过去调用时间。保持真实上游正文在途时prepare返回busy、正文仍活跃；释放后成功完成。新HTTP写入使旧plan返回changed，记账仍健康。配置apply为RestartRequired时，清除仍基于独立操作回执确认，配置错误保留。

自有私有代理转交真实ClearUsage，内部校验真实回执后丢弃客户端回复。客户端返回unconfirmed；恢复原manifest，两次同plan核实均为原generation1。新只读查询证实过去种子已删、当天3条实际请求及config2/token记录仍在，上游调用仍3。数据面POST /v1/clear_usage为501，额外推理0。最后恢复精确manifest并停止本fixture拥有的sidecar；不操纵用户安装。

| 范围 | 结果 | evidence/P1-S18- |
| --- | --- | --- |
| runtime完整 | 6通过：lib2、recover ack1、security ack1、新clear ack2 | runtime-final.txt |
| gateway相关 | bin18、revocation_faults1、security1、usage2、usage_clear1，共23通过 | gateway-final.txt |
| 最后受影响复验 | writer6、实际sidecar clear1通过，不重复累计 | writer-verified.txt、live-complete.txt |
| Clippy | workspace全target通过，最后gateway全target复验通过 | clippy.txt、clippy-verified.txt |
| DTO、前端 | 生成/一致性、TS/Vite、单文件116规则零诊断通过 | dto.txt、dto-check.txt、frontend.txt、lint.txt |

没有核心持久化语义/公共CSS/TSX改动，不重复S17核心72或原生视觉检查。早期未接入的dead_code检查输出保留，没有关闭警告；实际接线后Clippy零新增警告，原有ts-rs宏提示保留。源码及原始成功/初检绑定见manifest。

复用已有缓存，无新worktree/环境/安装包。附加峰值计划0.15GiB，盘前后见plan/manifest，包含并发写入，不能作净释放量。自有任务/worker/sidecar关闭后TempDir收尾，末次本批clear/clear-http前缀无残留；旧fixture、真实预览/资料、历史证据及审批拒绝清理的文件均保留。无真实凭据/上游/费用，也没有电脑控制。

下一步接本机main窗口限定native命令与清除范围/数量确认、同请求核实和最低代次缓存失效；再继续软预算与容量完整矩阵，不能因此放行整个A16/A28/P1。
