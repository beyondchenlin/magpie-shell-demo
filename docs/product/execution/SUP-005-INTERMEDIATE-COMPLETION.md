# SUP-005：不把中间部分回答当作成功

复现：两步顺序小队，中间上游返回HTTP200、非空partial-review-output与finish_reason=length。旧路径只取非空content，最终模型实际被调用1次并返回200；测试要求0次，修复前失败。原始输出保留于evidence/P1-S03-SUP005-before.txt，没有将旧队列通过当作这一条件已验证。

修复仅作用于中间结果消费：必须恰好一个index=0的choice、finish_reason为stop、assistant角色、非空文字，且无tool_calls/function_call字段、无非null refusal，才允许进入下一步骤。length、content_filter分别返回TEAM_INTERMEDIATE_TRUNCATED/FILTERED；缺失、null、非字符串、未知、tool_calls/function_call终止原因返回INCOMPLETE；遗留调用与refusal分别报UNHANDLED_CALL/REFUSED。空结果与体积预算继续受原有限制。全部错误均不重试、不启动后续步骤。

最终步骤及普通单模型的length/content_filter保持正常呈现部分回答的契约，没有套用中间结果门槛。测试覆盖小队@2手动最终模型和直接final-model，各以非流式与SSE验证两种终止原因，8个组合均保留相应finish_reason，SSE正常DONE。

真实loopback队列最终覆盖17个中间失败条件，日志逐个记录final_calls=0及响应状态。原复现失败、首轮修复结果和扩展最终结果分别保留before/after/final三个小日志；final同时包含原有输入来源、版本固定、取消、目录与停用检查。相关网关all-targets Clippy -D warnings通过。

这不是完整A15通过声明：first_cloud、UI验收、真实上游、工具转发等仍待完成。用户禁止电脑控制全程有效，本批没有窗口操作或原生UI验收；测试仅启动独占无窗口网关与可控上游。D盘检查18.55→17.89GiB，已提示低于20GiB；复用已编译target，仅相关检查，无新环境/worktree、大下载或用户资料清理，净变化含并发写入。
