# P2-S12：ReachFlow 对话、小队路由和结果入口

2026-10-19，接续4775881，宿主/网关dev.43 r4，保留安装中的dev.42 ReachFlow包及原隔离data/webview。调度保持PAUSED；没有第二执行者、worktree、安装器测试或依赖环境复制。

## 可用功能

网关`/v1/models`登记已启用ReachFlow，`/v1/chat/completions`执行真实已安装的签名队员程序。对话可选择`tagma/reachflow`，明确发送“本地试跑”或`local sample`。其余输入拒绝，不把自然语言当成真实采集授权，不向模型或服务发送凭据。

小队编辑器新增“添加 ReachFlow 试跑步骤”，固定安装版本并声明`pack_operation`。发布检查版本存在和副作用一致性，执行开始固定preparation/hash/version；不因后续活动版本变化改掉在途步骤。队员结果以文字进入后续云模型，只有最后一步流式回答。Gateway与desktop共用PackExecutor，增加同一安装目录的文件租约，防止两入口同时执行。HTTP断开、撤销、退出和截止时间会取消本机工作，工作任务持有资源直到清理完成；不宣称OS沙箱。

对话和市场共用成果展开入口，显示实际返回的固定素材条目，以及已有服务任务/报告定位、报告预览和原始返回内容。文本由React转义；不执行HTML、脚本或结果中的指令。固定素材来自适配器返回值，不再由界面硬编码三条名称。新增“成果目录（已有绝对路径）”和“保存到成果目录”：用户明确指定已有目录，宿主核验窗口、协议、目录边界后原子生成唯一JSON文件，不覆盖已有文件；拒绝安装/配置目录及目录链接。仅导出允许的返回字段，不复制访问令牌。界面显示真实落盘路径；报告预览依然标明预览，不宣称完整报告下载。

本机试跑不调用模型，步骤token记录0/0；后续云模型独立记账，界面标识`ReachFlow · local pack`，不把它冒充云供应商。

## 原生发现与修复

1. dev43首候选构建缺少`custom-protocol`，页面尝试访问未运行的开发服务器，显示ERR_CONNECTION_REFUSED。保留05-dev43证据，仅结束核验过的失败隔离宿主/网关，改用打包资源构建r2；未修改数据或启动额外前端服务。
2. r2原生发送非法队员命令后，网关拒绝下步调用，但新错误码未进入账本允许集合，导致用量降级暂停派发，界面还显示通用错误。r3补用量错误码及宿主错误传递，新增18个错误码的记账回归。原库直接重开恢复；原始失败请求保留为中断，修复后新拒绝记录为失败，后续正常调用/取消/重试可用，未删库或修改历史为成功。

原生控件按最新RuntimeId/名称/类型/模式读取。ModelPick使用ExpandCollapse，分段按钮使用Toggle，普通按钮Invoke，文本框Value；两次错误模式调用停止后按实际模式操作，没有重连。观察过期、控件状态变化和进程已退出均被保护拒绝；不归因于用户或其他软件，也不记作操作通过。没有宣称物理键盘遍历通过。

r4成果目录第一次UIA Value写入后出现额外字符，重新观察后恢复目标值；第二次末尾少一个字符，断言拒绝继续保存。未盲点或重连。改用当前截图中的输入框原生点击→核对焦点→Ctrl+A→核对焦点→SendInput文字→核对完整值，成功后才保存。证据77–84保留异常与恢复，不把UIA返回成功计为通过。

## 原生结果与证据

| 范围 | 实际结果 | 证据 |
| --- | --- | --- |
| 对话直接调用 | r2选择ReachFlow、填入本地命令、发送并展开三条实际固定素材 | 08–11，native-chat-result.png |
| 小队创建发布 | r2创建`P2 ReachFlow 顺序小队`，固定队员dev.42，后一步选已有本机受控云模型；保存21、发布22 | 21-pack-step、25-team-saved、30-team-published |
| 混合小队执行 | r2选择`tagma/reachflow-sequence`发送，最终回复完成；受控上游收到1条消息且previousText=true，内容为队员返回 | 36-team-complete、upstream-events.jsonl |
| 非法命令 | r2首次暴露账本问题；r3提示仅接受本地试跑，未发出云模型请求，随后网关仍可继续运行 | 38-invalid-refused、42-gateway-state、51-refusal-readable |
| 停止与重试 | r3 ReachFlow完成后进入慢流云步骤，实际点击停止回复，保留两段；再次发送正常完成 | 53-team-slow、54-team-cancelled、57-retry-complete、native-retry-r3.png |
| 用量 | r3成功请求6e25696a-8886-440f-8887-d77863fa516e，config22/team1；步骤1 ReachFlow 0/0，步骤2受控模型8/4，逻辑请求8/4 | 65-usage-visible、native-team-usage.png |
| 市场成果入口 | r3实际本机调用89def3c5-07fd-43d5-89ef-f443dc465fa7，展开结果及明确非研究成果说明 | 69-market-results、native-market-result.png |
| 成果保存 | r4实际调用07e26913-ac17-43ab-83b2-99f4d5f12bbe；安装目录被RESULT_DIRECTORY_PROTECTED拒绝；改用指定成果目录后成功，564字节JSON包含三条实际试跑结果，配置仍22/22 | 75–86、native-result-export.png、export-receipt.json |

小队取消发生在云模型流式阶段，不能宣称本批原生取消了正在执行的ReachFlow子进程或远端任务。固定素材对话/市场原生通过，不代表真实采集通过。后台源头验证仅辅助核对上步输入；主要交互证据为Windows UIA与本窗口PrintWindow，未用DOM或后台接口替代原生操作。

## 定向检查

- core teams 8项通过；固定版本/未安装/停用/副作用检查新增1项，后续改成完整有效的两版测试fixture再单独通过。
- gateway HTTP单元2项通过，新增无云凭据的队员目标固定与停用拒绝；已有真实loopback小队执行集成1项通过。
- 实际helper离线安装测试1项通过，并补文件租约占用拒绝/释放恢复；不是桌面原生测试。
- 新队员错误码账本回归1项覆盖18码通过。TSC/Vite、5个组件oxlint、生成合同`--check`通过。按React检查技能复核组件状态、原生details语义、文本转义；沿用CIS，没有引入组件库。
- 生产core/runtime库与gateway/desktop二进制Clippy `-D warnings`通过。全目标检查被已有`crates/tagma-gateway/tests/inference.rs:326`常量断言告警阻断，未修改无关测试，不宣称全目标通过。
- r3有331个构建输入，历史字节差异见post-build-note.json；r4更新为332个输入，构建前冻结、构建后全部一致（source-r4-check.json）。构建自动生成的save_pack_result权限文件另行记录生成来源与哈希并随源码提交（generated-permission.json），未冒充预先冻结输入。使用custom-protocol打包资源，内部包仍为原签名dev42。
- r4成果导出专项通过：拒绝受保护/相对/非法结果，连续两次生成不同文件并保留首个内容，不导出access_token，临时文件自动清理。新增UI TSC/Vite/oxlint与runtime库、desktop二进制Clippy通过；这些不代替75–86原生证据。

## 未验环境与代码待办

**外部条件缺失：** 正式受信任发行材料、允许服务域名的包、授权HTTPS ReachFlow服务/工作区/令牌/已确认计划与预算；真实服务启动、报告、取消最终状态仍未验。云模型为loopback合成回复，不是真实远端供应商。正常用户安装、其他平台和正式发行矩阵本批未验。

**代码待办：** 当前对话/小队队员操作只支持固定本地试跑；带明确授权上下文的服务型小队步骤仍需契约与实现。返回内容已可导出到用户选定目录；跨重启的成果浏览器与完整远端报告下载尚未实现，报告导出仍只包含实际收到的有界预览。队员更新/卸载、引用与在途管理、OS子进程树/内存约束及A17–20其余出口仍需完成。不能把这些全部归为缺环境。P3尚未开始。

当前仍为schema11；新发布配方带`pack_operation`权限枚举，旧dev42不支持读取该新配方。保留旧二进制仅供回溯，不承诺直接对当前数据降级。正式版本管理仍需配套前向/回滚兼容出口，不能以旧EXE保留代表回滚已验。

下一产品动作：接服务型步骤的明确授权合同与安全凭据引用（不能把令牌放入对话），完成跨重启成果浏览，再处理队员更新卸载。真实服务条件齐备后补授权调用/报告/远端取消验收，不回到无关安装器边界循环。

## 交付、空间与保留

入口`D:/demo1/tagmaai-deliveries/0.2.0-dev.43/Tagma-dev43-isolated.lnk`复用同一实例；README写明本地试跑、混合小队、成果保存和限制。成果文件为`D:/demo1/tagmaai-deliveries/0.2.0-dev.43/results/tagma-result-0c9f3fab-a539-43c9-a2f4-941bf2cd2cbd.json`，SHA256 `C0915B398748FB06F10DBDBA8A90E4777F37C3EDD4299F8174B61AED841DF6B9`；不在安装和配置目录内。入口依赖当前缓存控制脚本，不是独立正式安装包。原dev42公开签名ZIP未重新生成。

隔离根`C:/Users/ai/AppData/Local/Temp/tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88`，owner仍`tagma-p0-s09/native/v1`。r4观察宿主34384；后续操作重新核验，不直接复用PID或窗口。desktop SHA256 `BB53A2455CCA15586DF31DB2A7B17FA6A5DFD5F34CFA129FFFE9C0CAE5DF2060`，gateway `205502E06A28636693EF04C6F232A0276D94401B3635A46C6692C53BBEB513A2`。

证据选择性归档在`evidence/P2-S12/`；原始有界资料位于`.cache/p2-s12-routing/`。不提交EXE、ZIP、测试库、依赖或构建产物。隔离根`retained-dev42-p2s12/`保留dev42、失败dev43及r2/r3二进制，负责人Tagma开发，2026-10-26复查，不自动删除。继承dirty和历史证据未纳入产品改动。

开始C31.50/D14.63GiB，预算新增峰值≤2GiB，复用现有target/node_modules/data/webview，收尾C31.05/D13.64GiB，保持10GiB以上余量。选择归档约2.58MiB逻辑文件字节，不当作净物理占用/释放；原始采集哈希与Git文本行尾归一化区别见MANIFEST。未新增worktree。测试TempDir自行回收，临时合成上游在自身20分钟TTL后已不运行（收尾核验无对应进程/监听），不宣称手动停止操作通过；保留缓存、原包、回滚二进制和证据供使用与回溯，无净释放宣称。五份归档日志分别为check/tests/frontend/clippy/build，保留失败输出。
