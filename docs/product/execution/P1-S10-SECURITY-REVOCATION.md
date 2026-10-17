# 持久安全撤销（dev.14 / schema8 源码）

2026-10-18。本批完成令牌轮换、令牌/供应商连接代次撤销与运行实例确认的局部闭环。仅进行了源码、文件、隔离无窗口 HTTP 与构建检查。用户安装仍为 dev.9，未操作桌面、重装、迁移用户数据库或访问真实凭据/供应商。窗口自由拖动仍未通过；本批后端结果不能替代该项验收。A11、A27、P1 与发行门槛均未整体通过。

## 保存与运行语义

安全修订独立于业务配置修订，新增 security_head / security_revocations 及修订索引，候选 schema8 保护旧 writer。访问令牌按凭据引用的 SHA256 定位；供应商按 UUID、URL、协议及凭据引用组成的连接指纹定位。表中不保存明文密钥，撤销不读取密钥。重复撤销幂等，取消在途只能从 false 升为 true；历史配置恢复不会解除既有撤销。普通配置变化仍保持原有在途快照语义。

轮换通过原有凭据补偿日志建立新随机令牌，再将新配置与旧令牌撤销在同一事务内提交。失败只补偿本次新引用，保留旧配置与旧访问。读取被撤销的令牌被拒绝；UI 源码在业务/安全修订变化后隐藏旧明文及复制状态，保留原有三十秒清除。没有提供导入自定义访问令牌或清除安全历史的入口。

每次 HTTP 鉴权、计划固定及步骤准入均读取持久策略。缺表、损坏、修订不一致、读取超时或确认 epoch 变化按未确认拒绝，不按空策略放行。读取最多两条阻塞 worker，入场250ms/读取500ms，许可由真实 worker 持有。请求先持有既有八并发许可，安全登记最多16项，不无限排队。

运行确认通过当前私有 IPC 实例身份及 security_revision 返回；配置应用失败不能撤回安全策略。宿主区分“已保存”和“当前运行实例已确认”，通信失败不伪报生效。前端在任何修改开始或通信失败时撤销缓存确认，等待重新读取实例状态。不能操作的独立实例仅显示未确认及手动停止指引。

cancel=false 允许已经准入的请求完成，阻止尚未准入的首步及后续步骤；cancel=true 尝试取消匹配的在途请求，流中已有内容保留，错误后不输出成功 DONE。数据令牌没有管理权限。无鉴权兼容模式仍仅绑定 loopback，界面明确说明撤销令牌不会阻止无需令牌的调用。

供应商撤销不篡改原始推理成功事实，但排除其自动选脑及新目录检测/新对话选择。新请求遇重名原始模型可选第一个允许的配置供应商；固定小队 UUID/显式目标不会替换为其他连接。历史小队保留并显示失效依赖，新发布校验拒绝撤销目标。

## 两轮自查与修正

两轮均由同一执行者完成，不冒充独立审查。

| 轮次 | 发现与处理 | 可复核证据 |
| --- | --- | --- |
| 第一轮：事务、恢复与失败关闭 | 轮换凭据/SQL失败补偿；安全账本缺表及 head/MAX 不一致拒绝；schema7 已提交 staging 的已知对象计数补齐。初版 staging 测试仅提前制造阻挡，未真正覆盖提交后中断，已撤回其证明效力；改为子进程在 DatabaseReady 真正 exit90，核对 schema7/8 原 staging 字节相同地发布 | security core、staging-recovery-real-exit、完整 core-final；早期弱测试原始输出保留但不计通过 |
| 第二轮：派发竞态、运行确认与隐私 | SUP-007 先确定性复现确认撤销后首步/后续步仍调用1次，再以共享准入/确认锁及发送首轮询修复；补令牌范围和已准入 cancel=false 正常完成。清除前端过期确认、旧令牌显示，检查只读安全连接与目录路径共用准入屏障 | SUP-007 before/all-scopes/inflight-regression、gateway-final、frontend、clippy-verified、DTO |

SUP-007 的线性化点、前后源码快照及完整边界见 [派发屏障记录](SUP-007-DISPATCH-BARRIER.md)。屏障内启动 HTTP future，不声称字节已经到达远端；等待响应头/正文时不持锁。仅增加一次无同步检查不能关闭这项竞态。

## 验证与限制

| 范围 | 结果 | 原始证据（evidence/） |
| --- | --- | --- |
| 完整 tagma-core 测试 | 54通过、6显式忽略；含4项安全集成及真实退出恢复 | P1-S10-core-final.txt、P1-S10-security-core-final.txt |
| 完整 tagma-gateway 测试 | 29通过、2显式忽略；含真实独立 sidecar 与受控上游 | P1-S10-gateway-final.txt |
| 令牌 HTTP / 撤销流 | 内存凭据：缺失/错误/撤销401，新令牌应用前后、管理路径拒绝、false保留流/true关闭上游、损坏账本503 | P1-S10-token-http.txt、P1-S10-gateway-final.txt |
| SUP-007 首步/后续步 | 修复前各1次/200；修复后 provider/token 四场景0次/403，已准入场景1次/200且确认等待屏障 | SUP-007-before.txt、SUP-007-all-scopes.txt、P1-S10-gateway-final.txt |
| schema7/8 建库提交后真正退出恢复 | 原 staging 完整发布，未知目录保护保留 | P1-S10-staging-recovery-real-exit.txt |
| workspace Clippy、DTO一致性 | 通过；保留 ts-rs 对严格 serde 属性的已有宏提示 | P1-S10-clippy-verified.txt、P1-S10-dto.txt |
| tagma-runtime lib | 目录解析边界1项通过 | P1-S10-runtime.txt |
| TypeScript/Vite、oxlint、CIS guard | 通过；公共 CIS 样式及原 App.tsx 未改，不代表 UI 验收 | P1-S10-frontend.txt |

所有 Rust 检查使用已有缓存与 --locked --offline。OS凭据专项测试仍显式忽略，不计通过；测试中的 SystemCredentials 仅用于没有配置凭据的隔离 sidecar，没有调用真实凭据读写。HTTP 单元使用内存凭据与自有 loopback。没有真实上游、付费生成或自动生成探测。重复日志不累计为新增用例。

## 空间、留存与后续

不新增 worktree/clone/运行环境。目标仍为现有 target，计划附加峰值1.5GiB；开始C46.84/D13.18GiB，收尾磁盘值记录于 manifest。D低于20GiB，持续复用缓存、相关范围验证；没有大规模重建或安装包。末次扫描本批 tagma-security-/tagma-gateway-unit- 临时前缀无残留，测试按自身进程所有权关闭并由 TempDir 清理。原有 target/dist、用户安装/数据、历史验收证据及审批拒绝删除的旧文件均保留，不宣称盘差值是本任务净占用/释放。

最终源码、命令及原始结果绑定见 evidence/P1-S10-manifest.json 与 SUP-007-after-source.json。后续继续 OBS-01/06 请求与尝试持久登记、用量失败关闭及恢复等独立后台工作。A16/A28尚未实现完整闭环；真实安装、OS凭据、真实供应商与平台/客户端验收仍待授权条件满足。
