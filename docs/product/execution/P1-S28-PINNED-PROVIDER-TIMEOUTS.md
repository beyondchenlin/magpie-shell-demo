# 固定配置快照的供应商超时执行

2026-10-18，接续820beb4。候选仍dev.16/config10/usage2；已把S27核心配置接入实际headless网关，**native超时命令/UI尚未接**。未打包/安装/控制窗口；用户仍dev.9、原资料保留，拖动未通过与电脑控制禁令不变。A10/P1及外部客户端/真实服务/桌面门槛不整体通过。

## 执行与边界

LoadedSnapshot同时持有配置、凭据引用的已加载值及每供应商reqwest Client缓存。建快照时验证计时设置/供应商唯一ID/≤128条，再构建客户端；客户端沿用no_proxy、禁重定向、禁透明重试和每host最多2闲连接，connect_timeout来自该供应商。不在每个请求里新建客户端。调用固定克隆该Client和Provider设置，配置应用原子替换整份快照，旧在途引用继续有效；缓存创建失败不发布新配置。当前快照至多128个客户端，旧引用受现有8个请求/≤16步/任务预算生命周期限制，不新增无限缓存或请求队列。目录探测保留独立catalog_client/策略。

普通调用总预算来自provider.total_ms，步骤预算取provider.total和既有小队步骤预算更小者，小队全局预算仍取已发布配方；三者的较早deadline生效。首HTTP响应（发送/等待响应头）按first_response_ms，连接DNS/TCP/TLS按连接Client的connect_ms，响应体每次等待chunk按idle_ms（含首body chunk）。总预算另行钳制，heartbeat可以避免idle但不能无限延长总预算。不是首个模型token的独立计时承诺。

连接计时失败仍502 UPSTREAM_CONNECT_TIMEOUT；首响应等待超时504 UPSTREAM_RESPONSE_TIMEOUT；已开始流的idle/total分别错误帧UPSTREAM_IDLE_TIMEOUT/REQUEST_BUDGET_EXCEEDED，保留已有片段、不发成功DONE、不重试/重放。现有派发/撤销同锁、客户端取消、用量开始确认/结果与DONE屏障不变；总预算末尾的记账等待可能未确认，仍须原显式恢复流程，不冒充已结算成功。

## 两轮自查与验证

第一轮新实际HTTP3：TLS假上游只接受TCP从不完成握手，connect150ms先于header1500/total3000触发并关闭实际socket，未跳过证书；真实慢响应400ms，旧cfg3/header1500在途后apply到cfg4/header100，新请求504而旧请求200/cfg3；流idle150ms错误保留片段/无DONE，持续30ms heartbeat时total500ms仍到期/无idle假报，两个真实上游都关闭。显式记账恢复后请求保留准确cfg3/4错误和未知token。

第二轮检查缓存/安全/生命周期：新增单元拒绝无效计时、重复供应商、129记录，只为合法配置创建缓存且不发请求。更新私有测试快照构造为含实际客户端的五元组，避免安全屏障用例因缺缓存而被假短路。初次编译发现旧四元组及patch误把?放到错误分支，修正后又定位宏内残留的一处构造，最终check通过；失败check-first/check-reviewed原文保留。首轮新测试有未使用import提示，移除后Clippy通过，不屏蔽检查。

| 检查 | 最终结果 | evidence/P1-S28- |
| --- | --- | --- |
| gateway单元 | 26通过，含缓存1/SUP-007/008/写者/健康/配置应用 | regression.txt |
| 实际定向超时 | 3通过，TLS/header旧新快照/idle-total | http-first.txt、regression.txt |
| 实际相关回归 | catalog1、first_cloud1、function1、inference1、revocation_faults1、security1、teams1、usage4，共11通过 | regression.txt |
| gateway全target Clippy / Rust检查 | 通过，原ts-rs提示保留 | clippy.txt、check-final.txt |

单元26+HTTP14，共40项通过；TLS和计时均为本机受控服务，不算真实供应商/外部SDK或安装版体验。没有对缓存128个真实上游的性能作承诺，A24仍未完成。核心/DTO/前端未变，引用S27核心91与生成/构建证据，不重复全量重建/无关前端或视觉检查。

D低于10GiB保持预计>1GiB操作暂停；本批初估缓存增量峰值0.06GiB，C42.44/D9.87→末次C42.45/D9.78GiB。盘D差值0.09GiB超过初估，含缓存/并发变化，不能当成本任务实测峰值或净释放；收尾仅余有界文档/清单写入，不再扩大编译。仅复用现有依赖/target；无新环境/worktree/安装。自有sidecar catch后stop，上游任务Drop abort，socket/SQLite句柄先关再TempDir收尾，末次timeout-http前缀0。旧验收、缓存、fixture和审批拒绝文件不人工删除，用户data/webview保留。下一步接main限定保存与CIS编辑器，继续区分保存、网关应用和桌面验收。
