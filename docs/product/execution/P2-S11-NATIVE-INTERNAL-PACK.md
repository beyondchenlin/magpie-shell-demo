# P2-S11：内部签名包与原生本机闭环

2026-10-19；基线 ad826f7，产品 0.2.0-dev.42 r2。适用P0与受控P1结论沿用前批，不重跑安装器专项，不宣称完整P2通过。

## 本批实际交付

此前市场只能等待正式发行材料，原生安装和试跑无法推进。本批增加显式的内部离线发行通道：使用本仓库真实 ReachFlow 适配器构建ZIP，以一次性内存随机密钥签名；私钥不落盘，公开根和包在构建期嵌入。只允许debug构建且运行时明确匹配隔离配置目录；普通配置不开放该入口，正式发行根仍为空。

离线包走同一签名、一次性批准、配置版本、容量、归档内容校验、健康检查与事务激活链，不接受前端任意路径或信任根注入。界面明确内部测试、无网络权限、不提供OS沙箱保证；已安装后可试跑，服务表单明确为何不可用。内部清单有效期7天；它不是长期发行或签名更新策略。后续候选应复用此包，不能为相同版本悄悄换签名身份。

接手时另一执行聊天留下报告操作的4个文件改动，本批保留并整合：核心任务报告合同、ReachFlow报告HTTP读取与有界结果、市场报告操作/结果展示、生成TypeScript合同。补上报告不可用及域名未授权的稳定错误码。报告定位是服务工作区/任务/报告标识，不伪造本地成果路径。未触碰真实凭据或发送真实付费请求。

## 原生验收

使用AGENTS指定的PrintWindow和Windows UI Automation，对核验owner/EXE哈希/唯一进程/启动时间/窗口标题后的隔离实例操作。UIA Invoke、ScrollItem和ExpandCollapse为实际原生交互；本批没有物理键盘遍历结论，没有借DOM或后台测试替代原生。旧文件选择框与前台输入问题未重试，也未宣称修好。

| 候选 | 操作与结果 | 证据 |
| --- | --- | --- |
| dev42 r1 | 内部包审阅展示发行者、权限与空间；取消审阅回到发起按钮，配置仍19 | 03-review、05-cancel-review |
| dev42 r1 | 再次审阅并批准，实际包解压/适配器健康检查后安装42，配置20 | 06-review-again、09-installed、native-review.png |
| dev42 r1 | 界面调用实际安装的适配器，返回三条固定素材；不访问远端 | 10-native-sample、native-sample.png |
| dev42 r2 | 正常退出并重开同一data，安装42保留，配置20/20、schema11；试跑成功 | 14-restart、15-restored-market、16-restored-call |
| dev42 r2 | 原生展开服务区，内部包无网络权限提示和禁用表单可见 | 18-service-boundary、native-service-boundary.png |
| dev42 r2 | 发起本机试跑后观察真实停止按钮，168ms时Invoke；随后界面明确已取消/PACK_CANCELLED | native-cancel-attempt、20-call-cancel、native-cancelled.png |
| dev42 r2 | 取消后再次试跑成功；快捷入口复用同一进程，没有启动第二实例 | 21-retry-after-cancel、22-launcher-open |

本机取消任务为 `9d4d0fec-a179-4820-9090-b660b47c97fc`，重试任务为 `89bc620c-3f78-456b-a1bb-0ac995e33c1e`。取消可能发生在执行前校验阶段，因此这里只证明界面运行中本机操作取消，不单独宣称原生子进程强杀、活动下载取消或远端任务取消。

## 源码与定向验证

- TSC/Vite前端构建、PackMarketPanel定向oxlint、core/runtime/desktop all-targets Clippy `-D warnings`通过；已有ts-rs属性解析提示保留原始日志，生成合同`--check`通过。
- 新离线安装测试使用实际helper EXE：损坏归档拒绝、预取消不安装、有效包健康检查后激活，1项通过。
- ReachFlow合同HTTP fixture 3项通过，含报告接线与有界展示数据；它们不是授权HTTPS真实服务验收。
- 宿主2项定向测试通过；额外在嵌入内部包的构建中重跑，普通配置仍不开放内部包。排他、日志和取消归属断言保持。
- 最终328个构建输入与`source-frozen42.json`逐项哈希一致。ZIP与适配器二进制独立按哈希绑定，不将后台检查计为原生通过。

## 仍缺条件与代码待办

环境/发行条件：没有正式发行根及允许真实服务域名的对应签名包，没有授权ReachFlow HTTPS服务/工作区/访问令牌和已确认计划、预算回执。真实启动、查询、报告、请求远端取消及最终状态均未原生通过。内部包无网络权限，不拿固定素材结果冒充真实采集成果。

仍需开发：队员版本更新/卸载界面、成果更完整的浏览交付、队员接入对话与小队路由、OS子进程树/内存约束、PRD A17–20其余出口。它们不是缺环境；本批完成当前指定的内部安装/调用闭环后，下一产品开发应接队员路由与成果入口，真实服务条件齐备时补外部闭环。活动安装取消及文件选择/完整键盘属于未验项。P3尚未开始。

## 入口、证据与保留

用户入口：`D:/demo1/tagmaai-deliveries/0.2.0-dev.42/Tagma-dev42-isolated.lnk`；README说明当前范围。快捷方式只控制核验后的同一隔离实例，正常用户安装不变。

隔离根：`C:/Users/ai/AppData/Local/Temp/tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88`，owner `tagma-p0-s09/native/v1`。r2观察时宿主44484、网关23976，后续必须重新枚举身份；标题 `Tagma 隔离测试 dev42r2 P2-S11 128d7053`。

desktop SHA256 `71A83ADF70F9AD200140B8928AAFE29C5651BFBE4DC07608C04496767E119CEB`；gateway `46BCC43D79683D2728EE0532ACE4BDDD1C568C82D80D449148FCF97D73BDBFED`；实际安装适配器 `AE922DB0B00C5818D0E89A3C1D63D48C6FACF49DEE3133B3750E0DB4B9DE8DF7`。

证据为`evidence/P2-S11/`的选择性快照、窗口截图、5份日志、哈希和控制脚本；不提交ZIP、EXE、数据库或构建缓存。原始有界资料及公开签名包保留在`.cache/p2-s11-native-install/`。dev41与dev42r1二进制保留在隔离根`retained-dev41-p2s11/`供回溯，负责人Tagma开发，2026-10-26复查，不自动删除。入口依赖当前缓存控制脚本，未把它误称独立正式安装包。

复用原工作树、node_modules、target、data和webview，没有新worktree。预计新增峰值≤2GiB，开始C31.84/D16.49GiB，末次C31.71/D15.00GiB，保留超过10GiB余量；净变化包含并发写入，不当作本任务精确物理占用。测试TempDir自行清理；未删除历史证据/回滚产物，无净释放宣称。继承的其他dirty文件保留且不纳入本批产品提交。

唯一执行权已由用户授权转回本聊天，另一执行聊天确认停笔后才开始编辑。实际tagma-prd及magpie-cis均核实PAUSED，RUN-BINDING保持PAUSED；旧UI-DELIVERY绑定元数据不作为恢复调度依据。没有新增自动化、清理调度或第二执行者。
