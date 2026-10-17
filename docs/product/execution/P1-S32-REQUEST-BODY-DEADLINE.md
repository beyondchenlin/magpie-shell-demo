# 请求体准入后的绝对读取期限

2026-10-18，接续98ee3ad；源码候选仍dev.16/config10/usage2。仅自有loopback TCP/headless sidecar/源码检查；禁止电脑控制、安装和真实付费上游继续有效，用户dev.9/data/webview不动，拖动仍未通过。

main::authorize已有八名额准入，位于next.run/Json提取前，并持有到下游Body结束，不能再声称需要移动准入。缺口是Json提取没有期限：4个Content-Length4096只送首字节、4个未结束chunked（其中一个每200ms发一个空格chunk），11秒后目录仍429、上游0。另一真实测试确认丢弃一个请求的TCP两半会释放一个名额，但重新补满后的私有停止约10015ms才返回，触及既有10s退出/强制终止边界。before/stop-before原始失败保留，没有反复用同一路线猜测。

最小修复：拿到名额时写入私有BodyDeadline(now+10s)，沿原安全策略读取；completion手动调用现有axum0.8.9 Json::from_request，把固定期限和shutdown选择器只包在请求提取上。保持原128KiB DefaultBodyLimit、JSON/media错误和校验；provider及整队请求时钟仍在成功提取后开始，不把十秒期限套在完整响应或长流上。超时408 REQUEST_BODY_TIMEOUT、退出503 GATEWAY_STOPPING；未完整读取/提取失败的响应加HTTP1.1 Connection: close，避免继续排空或复用此请求。没有改变配置schema、增加用户开关、自动重试或登记错误用量。

第一遍自查用户路径及异常：

- 新实际TCP3通过：八请求均408/Connection close/EOF，49次滴流不延长绝对期限，目录11秒后200，静止客户端尚未消费错误时名额已释放；上游0且逻辑/尝试登记均0。
- peer disconnect释放一个名额、补满再次429；私有owned停止5ms，八响应503 GATEWAY_STOPPING/关闭，0派发/登记。不能把历史10秒的stop成功当作本次快速取消证据。
- malformed JSON400/media415保持，Content-Length和真实chunked的128KiB+1均413/REQUEST_TOO_LARGE，负例0派发；正常完整请求立即发出SSE首段，11秒后仍收到DONE，证明本次期限不覆盖长流。
- 原26网关单元、相关HTTP13（文本/函数/小队/供应商各期限/用量/清除/撤销）与S31慢客户端2均通过；显式Windows curl8.13.0实际进程1通过。加新3，共45个不同用例；重复复验不累计。gateway全target Clippy -D warnings通过。

最初after有2通过/1失败：服务已释放名额，测试却在11秒后才读仍持续写的滴流socket，Windows报10053 ConnectionAborted。写入已关闭连接可以重置它，不能据此要求服务无限保留连接。测试改为滴流同时有界读取响应，七个静止socket仍延后读取；继续严格断言滴流和静止都408/关闭/EOF、至少40次成功滴流（实际49）、0派发，未把失败放宽成任意断线。reviewed3通过，再补实际chunked超限/滴流计数，final3通过。原始after保留供核验。

第二遍自查架构/资源/证据：私有deadline由准入点生成，客户端不可改；安全前置读原有250ms排队+500msworker预算保持，读取完成后仍走原Grant/Run及派发屏障。Json沿用本地实际依赖的内容类型/UTF8/错误处理和字节限额，没有另写解析器。提取失败在request_id/usage begin之前返回；退出drop提取future关闭请求体，不创建Detached任务。本批只新增独占test任务，Task drop abort、两半socket drop、自有manager stop及TempDir RAII收尾。没有声称对尚未完成HTTP头的连接、所有连接数量、HTTP2、所有平台或物理内存峰值设了完整限制，这些及native/真实上游仍未验证。

空间计划0.05GiB，发现盘D累计差0.05后记录定向既有回归/Clippy的计划复核0.08GiB，不扩大构建。C42.23/D9.68→C42.23/D9.63GiB；含缓存/并发变化，不算任务峰值或净释放。D<10GiB暂停>1GiB操作；复用现有锁/离线缓存/target，未下载依赖/新建环境/worktree/包。新fixture前缀0；无人工删除旧证据/缓存/审批拒绝文件。target/node_modules/dist继续保留，用户安装与预览资料保留。

A10/GW-05/GW-06局部改进，A10/A27/A28及P1整体未通过。证据evidence/P1-S32-*及manifest绑定源码/文档/PRD/日志hash，不把新断言追记成旧版本曾通过。继续其他已授权非UI缺口，不等待桌面验收。
