# 供应商超时配置核心与schema10

2026-10-18，接续4351888；内部源码仍dev.16/config schema10/usage2。**尚未接网关实际超时、native命令或编辑界面**，不能把保存设置当作已生效。默认执行路径仍原固定超时；仅隔离测试使用新核心方法，用户dev.9和真实资料不动。禁止电脑控制、拖动未通过及A09/A10/P1未整体完成保持。

Provider增加有默认值的ProviderTimeouts：connect_ms10000、first_response_ms30000、idle_ms30000、total_ms120000，保存四个有界u32整数，不接受小数/负数/未知字段。连接100..60000ms，其余100..120000ms；connect≤first_response≤total、idle≤total。first_response指发送阶段等待首个HTTP响应，未来流读取另受idle和total约束，不能把它含混称为已实现首token独立预算。目录检测继续独立策略，不因该配置自动探测/生成。

共享ConfigService::save_provider_timeouts复用operation锁、expected_revision和不可变提交；未知供应商/冲突/失败不增修订。普通供应商编辑保留其高级超时，新增供应商用默认值；删除供应商随记录移除，无额外历史引用或凭据清理。不读取/轮换凭据、不创建用量库；连接fingerprint保持原身份语义，超时变更不伪装成连接代次撤销。

schema10保护新字段不被旧schema9写者静默丢弃，9→10沿用排他maintenance锁、一致备份/hash/journal，只推进pragma、不重写历史snapshot或业务revision。缺少整个timeouts字段的旧Provider在读取时补默认；存在但错误的值拒绝视图/保存，不能用默认掩盖损坏。8→9旧预算测试改为精确单步，仍断言9；新9→10单独验证。初始化真实退出staging覆盖7/8/9/10，不因最新版本改变丢掉9的恢复覆盖。ProviderTimeouts及SaveProviderTimeouts由Rust单源生成TS。

第一轮自查：四项核心测试覆盖范围/关系/严格类型、CRUD/重开/普通编辑保留/冲突/SQL提交回滚、不改变fingerprint/凭据调用0/用量库不存在，以及已知schema9备份与原provider JSON逐字节保留、新配置只进revision2。损坏设置0保持原JSON与修订条数，读/保存和重开后的读均拒绝。

第二轮检查兼容与证据：初次新增损坏测试误把ConfigService工厂打开视为读取，断言open必须失败；实际设计允许打开后诊断/恢复，view/save才拒绝。保留core-final.txt失败原文，更正为重开后view失败后完整重验，生产逻辑未为此改变。日志“reopen refused”指重新读取被拒绝，非工厂必然返回Err。旧JSON默认不写回，历史已发布小队/健康/撤销/预算/清除及SQLITE_FULL基线仍通过。

完整core91通过/8显式忽略不计：lib68/5ignore、catalog1、config10/3ignore、first1、security4、teams7。core全target Clippy、workspace全target check（含native源码）、DTO生成/漂移检查、TS/Vite通过；实际headless默认文本inference1与function工具1通过。原ts-rs属性解析提示保留，Serde仍严格校验；前端TSX/CIS未改，不重复视觉/源码页面检查。没有声称custom超时已被HTTP使用，下一步必须在固定快照里接client/首响应/idle/total并验证在途隔离。

证据evidence/P1-S27-{check-first,core-first,core-final,core-reviewed,clippy,dto,dto-check,workspace-check,http-default,frontend}.txt及manifest。首次多文件patch因上下文不同整批未应用，核对后重做，没有覆盖继承dirty。所有检查复用既有target/registry/node_modules，无clean、全量重建、安装包、新环境/worktree、真实凭据或付费调用。

D低于10GiB，预计>1GiB操作保持暂停；本批有界缓存验证峰值计划0.08GiB，C42.44/D9.93→C42.44/D9.87GiB，差值含并发写入不当净释放。自有timeout TempDir/连接收尾，末次该前缀0；没有人工删除旧缓存/证据/fixture/被审批拒绝文件。用户安装/预览/data/webview原样保留。
