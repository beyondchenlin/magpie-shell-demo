# 普通云模型的有界函数调用转发

2026-10-18，接续d646fb9。候选仍dev.16/config9/usage2，未打包/安装。用户dev.9、真实资料、禁止电脑控制与拖动未通过不变。本批只用自有loopback上游，没有真实供应商、API密钥或付费调用；不声称SDK/外部Agent兼容、实际工具执行或A09/A10/P1整体通过。

## 依据与支持范围

已使用OpenAI Docs技能搜索并实际读取[Chat Completions创建协议](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)与[流事件协议](https://developers.openai.com/api/reference/resources/chat/subresources/completions/streaming-events)，核对函数定义、tool选择、assistant调用/tool结果和流中可选增量字段；function.arguments是字符串，其片段不要求各自构成完整JSON，执行者仍须自行校验参数。本实现是该协议的明确子集，以下额外数量/长度界限为Tagma本机约束，不当作上游全部支持能力或官方限制。

仅普通云模型路由支持至多32个function定义及单选择n=1：名称ASCII字母/数字/下划线/横杠≤64，description≤8192字节，parameters对象原样传递，strict布尔/null；tool_choice none/auto/required/已声明单个函数，parallel_tool_calls布尔。保留原始定义/选项/历史消息，不改写schema或解析引用。历史assistant调用匹配≤32个唯一id（≤128字节、无控制字符），tool结果需对应未答复ID、字符串content，允许结果任意顺序，拒绝重复/孤立/未答复历史。请求仍受128KiB、128条消息及现有采样参数约束。

非流式允许assistant空文本与函数调用，绑定已声明/所选名称、唯一ID和parallel=false单调用约束。参数保持不透明字符串，即使不是有效JSON也不替客户端执行或修复。流式逐事件校验≤32个index、稳定ID、函数类型/名称片段、字符串参数片段；仅保存有界ID/名称/完成标志，不累计整段参数。工具成功结束需完整已知身份/名称/参数字段，畸形流返回错误且不发成功DONE；length/content_filter仍表达截断/过滤，不伪造完整参数。保留256KiB事件/8MiB响应、取消/预算/记账DONE屏障。

小队的外部工具字段和工具历史在登记/派发前明确400 UNSUPPORTED_TEAM_TOOLS，避免把客户端工具权限或语义偷偷分配给中间步骤。内置文本对话仍为文本入口。custom/旧functions/function_call、Responses/多模态/结构输出/多选择等未声明字段继续拒绝。本机不注册/执行这些函数，不写工具参数到用量库；成功用量仅表示模型完成响应，不表示工具已经执行。函数调用及其文本前缀不刷新first_cloud所依赖的完整文本答案健康状态。

## 两轮自查与证据

第一轮检查输入形状/工具上限/名称/历史对应、非流空文本和不透明参数、流式名称/参数跨片、唯一/稳定身份、parallel限制，纯契约5通过。实际sidecar证明原始定义/choice/parallel/历史完整保留，非流返回调用，逐字节UTF8+CRLF SSE由客户端还原参数，确认token3/2后才成功DONE；调用方提交tool结果后才有后续文字。小队与孤立结果0上游调用，坏index返回流错误/无DONE且记账失败；调用参数标记不出现在usage主库/WAL。

第二轮检查生命周期/健康：补非流length+文本前缀和流式文本前缀+tool_calls，在实际健康写确认后仍不把这些当完整文本Ready；随后普通调用方结果文字保留正常语义。元数据/配置/用量沿用现有独立worker和安全撤销，不引入执行器、队列、重试、凭据路径或日志正文。

gateway单元25通过（含新增5），实际function HTTP1通过；文本inference1、teams1（17类中间失败/8个final呈现组合）、revocation_faults1/security1、usage4合计8通过，gateway全target Clippy通过。共34个测试分批通过，不把失败命令整体说成通过：regression-first.txt中单元25通过后，旧文本用例仍断言tools:[]应400，因新增兼容字段已合法而失败；保留原日志，将旧“未支持能力”断言改为仍不支持的custom工具，维持400与0上游后复验通过。Clippy首轮指出测试嵌套if，合并let-chain后通过，未屏蔽规则。

证据evidence/P1-S26-{check-first,contract-first,http-first,http-reviewed,http-final,regression-first,regression-reviewed,clippy-first,clippy-final}.txt及manifest。Rust核心/DTO/前端未变，不重复不相关构建/视觉检查。此为受控本机协议证据，没有真实服务、外部SDK/Agent版本或安装体验批准。

## 空间与保留

初始C42.45/D10.02GiB、峰值估计0.03GiB；监督检查及本机复核D降至9.93GiB，已新增space-review.json按当前余量收窄剩余峰值0.01GiB，只复用已有target做定向小验证，暂停预计>1GiB操作，未启动全量重建/安装包/环境。末次C42.44/D9.93GiB；并发变化不当净释放。自有function前缀残留0，sidecar finally stop、上游Drop abort；无新工作树/环境，既有证据/缓存/预览/资料和被审批拒绝文件均保留。
