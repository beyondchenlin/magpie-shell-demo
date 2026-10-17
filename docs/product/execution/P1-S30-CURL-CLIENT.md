# Windows curl 8.13.0 独立客户端版本证据

2026-10-18，接续210af47；候选仍dev.16/config10/usage2。本批仅增加显式外部CLI集成用例，不改生产协议/界面。复用系统已有curl，不安装SDK/客户端或环境，不控制窗口/更新用户dev.9。拖动未通过、电脑禁令及资料保留不变；A09/P1不整体通过。

| 绑定项 | 本批范围 |
| --- | --- |
| 客户端 | curl 8.13.0 (Windows)，libcurl8.13.0/Schannel/zlib1.3.1/WinIDN |
| 程序 | C:/Windows/System32/curl.exe，711736字节 |
| SHA256 | 3345339164cf384eff527b6c3160fea8d849a4231ec6ca80513e3a739e505168，前后相同 |
| 传输 | 本机127.0.0.1、HTTP/1.1、显式无鉴权兼容模式、自有受控上游 |
| 验证 | GET /models、文本非流/实时SSE、function参数返回、Responses拒绝、request_id/用量对应 |
| 未覆盖 | SDK/Agent、其他curl版本、鉴权开启模式的curl、远程/TLS客户端、真实供应商、其他OS、安装版体验 |

从实际外部进程运行系统curl，stdin传UTF8 JSON、stdout接真实HTTP头/体。SSE使用--no-buffer，测试先读取到owned首段，此时假上游被Notify门闩禁止发送最终帧；确认客户端已暴露首段后才放行上游，证明是实时传输而非结束后的整段字符串假装流式。收到正常DONE，中文内容完整，function.arguments原样交回调用方。没有执行函数。

GET /models和不支持的POST /responses（501/UNSUPPORTED_CAPABILITY）不多发上游；共3次明确生成，三条request_id均对应cfg2及token2/1、3/2、4/2。只读列表恰好3条，逻辑/尝试汇总各3、输入9/输出5，元数据路径不伪造计费调用。

第一轮检查真实进程/非流及分片流/UTF8/函数响应和错误状态。首次新测试有多余右括号导致fmt/编译失败，curl-first.txt保留；修正后curl-reviewed通过。第二轮检查证据与资源：通过-q首参数禁curlrc、显式无proxy/仅http/HTTP1.1、retry0、5秒任务/1秒连接/64KiB输出上限，无配置/凭据读取或真实上游。CREATE_NO_WINDOW及kill-on-drop，curl退出与自有网关stop/上游abort后再清理TempDir；测试前后系统客户端SHA不变，未修改系统文件。

为防其他机器/系统更新后把不同客户端版本误算成此证据，用例标为显式ignored集成；本批实际以`cargo test -p tagma-gateway --test external_curl --locked --offline -- --ignored --nocapture`运行，**1通过**（不是把默认忽略算通过），定向Clippy通过。源中断言Windows curl8.13.0，版本变化需重新绑定记录，不能套用本证据。没有重跑无关全量Rust/前端/视觉；生产逻辑未改，引用S28/S29分层结果。

证据evidence/P1-S30-{client-before,client-after,space-plan,space-after}.json、curl-{first,reviewed,final}.txt、clippy.txt及manifest。D低于10GiB，预计>1GiB操作暂停；有界缓存计划0.02GiB，C42.43/D9.77→C42.43/D9.73GiB。盘D差值0.04GiB超过初估，含缓存/并发变化，不当任务峰值或净释放；收尾不再扩大编译。无新依赖/环境/worktree/安装包，fixture前缀0；无人工删除旧证据/缓存/fixture/审批拒绝文件，用户data/webview保持。不声称本机假上游等于真实服务，也不扩大其他App兼容名单。
