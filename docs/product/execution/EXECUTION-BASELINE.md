# Tagma 本轮执行基线

- 建立时间：2026-10-17，Asia/Shanghai。
- 用户请求：“ok 你写一个完整的提示词 然后新开对话执行，并自己来执行一个定时任务 作为监督和验证，防止偏离目标，任务执行陷入死循环等，这个你也要给自己写一个提示词 来更好的约束 全程你来执行”。
- 本轮将该继续指令解释为：授权按刚交付 PRD 的推荐方案开始实施和监督，无需重复询问常规开发决策。
- 冻结参考：TAGMA-PRD-v0.3.md，SHA256 6e6503391f70e3f2e53347890de6e7c9f7fd93cc393c68f7bba494ac4d67a6d6。
- 保留原 PRD 和两轮审查历史，不倒改其“建议/待确认”历史状态。本补充记录本轮采用的开发行为：DEC-01 默认本机令牌鉴权（显式兼容模式可无鉴权且仅 loopback）；DEC-02 slug 唯一，@n 仅不可变配方修订；DEC-03 P0 真配置/持久化/生命周期，mock 仅独立预览。
- 当前范围：按 P0–P3 连续交付，真实对话按独立切片实施。完整 Pi harness 另行立项；P4 按后续产品需求触发，不以“全程”扩大到未排期积压。
- 技术：React/TypeScript/Vite + CIS；Tauri 2 + Rust 独立 sidecar；Rust 核心无桌面依赖。
- 本机 Windows 开发；保持 macOS 优先首发策略，未获得目标平台证据不得声称发行就绪。
- 执行对话独占产品代码、执行台账与 Git/构建。监督对话独占 SUPERVISION-STATE.json、SUPERVISION-LOG.md、RUN-BINDING.json；只读核验产品，不与执行者竞争写入。
- 旧 CIS 执行聊天已空闲，magpie-cis 自动化已 PAUSED。保留旧状态，不恢复旧复刻目标。
- 本轮不授权公开发布、推送 main、购买服务、真实付费调用或替代 ReachFlow 服务本身授权。
- 完整执行提示词：[EXECUTOR-PROMPT.md](EXECUTOR-PROMPT.md)；监督提示词：[SUPERVISOR-PROMPT.md](SUPERVISOR-PROMPT.md)。
