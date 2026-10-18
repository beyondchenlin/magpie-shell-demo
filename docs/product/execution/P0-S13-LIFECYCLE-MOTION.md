# P0-S13：减弱动效、托盘与原生故障恢复

2026-10-18。接续 `38e90d7` / dev.21，复用唯一工作区、依赖、原隔离 data/webview 和端口49697。所有调度保持 PAUSED；没有唤醒旧聊天、创建子代理、使用真实凭据或发送付费上游请求。

## 本批修改与当前候选

- `9fe0487` / dev.22：正式产品通过 `RespectReducedMotion` context 启用分段滑块的减弱动效策略。原 WAAPI 动画不受 CSS 媒体查询影响；现在在减弱动效下直接定位，并在偏好改变时取消进行中的滑动、回到当前选项。取消媒体查询订阅与组件卸载配对。主导航及设置等共用选择器覆盖，冻结 CIS 参考入口默认不启用该策略，六份冻结样式未改。
- `976c531` / dev.23：原生并发编辑暴露冲突提示要求“刷新”，但编辑期间刷新禁用。中英文提示改为：本次修改未写入、草稿保留，先记下所需的非敏感修改，取消编辑后刷新并核对最新配置，再重新编辑。没有自动重试或覆盖他人修订。

最终 [dev.23 内部安装包](D:/demo1/tagmaai-deliveries/0.2.0-dev.23/Tagma_0.2.0-dev.23_x64-setup.exe) 为未签名 Windows x64 debug，6,629,753字节，SHA256 `86fe7b88e226825415b640a91f21ae532eb05618af60a92ef05fe2920f1f1eb3`。来源 `976c531` 加继承 dirty；306份构建输入前后全匹配。安装器未运行。dev.22中间包和dev.21原二进制/证据保留，没有重做旧热修复、源码保全包或手动 CI。

最终隔离宿主15512、网关36692，标题 `Tagma 隔离测试 dev23 P0-S13 128d7053`，desired/effective **12/12**，仍为 Beta → Alpha Offline、原模型及凭据存在状态。修订10→11→12来自两个版本的第二原生窗口保存同一供应商原值；被拒绝的草稿没有写入。进程身份只是本批记录，下次必须重查。

## 原生证据与结果

证据目录 [P0-S13](evidence/P0-S13/)。`actions.jsonl`、分步骤UIA快照、PrintWindow截图、过程身份和应用诊断日志分别记录；API Key输入值不读取。模拟故障驱动只用于建立条件，判定同时依赖实际窗口与真实进程，未把驱动的结果当成桌面验收。

| 候选 / 场景 | 实际结果 | 证据 |
| --- | --- | --- |
| dev.21 托盘关闭/恢复 | 物理Alt+F4隐藏主窗；宿主47436、网关8744与49697监听保留。物理打开专属托盘菜单、点击Tagma恢复原窗，仍10/10 | 02/03记录、tray-actions.jsonl、tray-menu.png |
| dev.21 托盘退出 | 实际点击“退出 Tagma / Quit”，宿主、所属网关及监听均消失 | 04-tray-quit-menu.png、04-tray-quit-result.json |
| dev.21 减弱动效缺陷复现 | 隔离WebView进程启用减弱动效信号，供应商导航滑块仍滑动；约99/145/192ms的白色边界为278/284/289px，最终291px | 06-dev21-motion帧、12-native-motion-pixels.json |
| dev.22 动效修复 | 同样信号、实际SendInput点击，约46ms后的采样帧已经定位291px，至540ms不再移动 | 12-dev22-motion帧、12-dev22-media-flag-process.json |
| dev.21 所属网关连续崩溃 | 精确终止四个本任务所属sidecar。前三次约1.65/2.62/4.25秒观察到新PID；第四次没有新进程，界面失败/effective未确认，日志有restart_exhausted | 08-crash-processes.json、08-crash-runtime-tail.jsonl、08-crash-exhausted.png |
| dev.21 耗尽后手动启动 | 原生“启动网关”重新验证并恢复10/10 | 09-manual-restart.json |
| dev.21 宿主异常退出 | 精确终止宿主27972后，其所属网关48512及监听退出，符合RUN-05。重开宿主14752恢复10/10 | 10-host-crash.json、11-after-host-crash-relaunch.json |
| dev.22 端口占用 | 自有合成监听占住49697；原生启动明确报端口错误，没有换端口或结束监听PID46804；释放后原生启动恢复10/10 | 13-port-*.json/png、14-port-conflict-recovered.json |
| dev.22 独立网关所有权 | 合成驱动启动真实非managed网关42856，桌面55056连接后显示“由其他入口拥有”、停止禁用；原生设置退出后该网关和监听仍在。随后驱动用自己持有的内存令牌优雅清理，exit0 | 15-independent-*.json/png |
| dev.22 写入失败与忙态 | 仅对隔离SQLite执行BEGIN IMMEDIATE持锁，不读/写业务行；原生保存显示“正在保存”、字段/取消/导航禁用。超时拒绝后草稿保留，错误聚焦可见，仍10/10；释放锁ROLLBACK后取消、刷新不写入草稿 | 16-write-busy.json/png、16-write-rejected.json/png、16-write-lock-recovered.json |
| dev.22 两个真实编辑窗口 | 两窗共用隔离配置、不同临时WebView配置；只有一个网关。第二窗保存至11，第一窗仍以10保存被拒绝且草稿保留 | 17-primary/second记录、17-stale-save-rejected.json/png |
| dev.23 冲突提示及恢复 | 仅重测受提示变更影响的冲突流程：第二窗保存至12，第一窗拒绝旧11并完整显示新指引；把取消按钮滚至可见后物理点击，再刷新，恢复12/12 | 18-dev23-conflict-guidance.png、18-native-cancel.json、18-recovered-12.json、second-dev23/ |
| dev.22 连接较新dev.23网关 | 旧候选明确显示版本不兼容，发送/停止/应用禁用，显式启动仍拒绝。退出旧窗后dev.23网关PID36692不变 | second/20-*.json/png、20-incompatible-preserved-active.json |

本批没有重跑前批已经通过的CRUD/排序、停网关保存、自由拖动、最大化还原、语言/主题/缩放和完整键盘遍历。dev.21、22、23的证据按实际版本保留；dev.23没有被宣称逐项重跑前两个版本的运行时故障矩阵。

减弱动效使用子进程专属 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--force-prefers-reduced-motion`，未更改Windows设置，未向Tagma注入DOM/CDP脚本。信号依据[WebView2浏览器参数说明](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/webview-features-flags)和[Chromium的减弱动效开关](https://chromium.googlesource.com/chromium/src/+/HEAD/ui/gfx/switches.cc)。系统动画读取为开启；**不是实际切换Windows全局偏好的验收**。最终dev.23正常启动，未附加该信号。

## 定向非原生验证

独立浏览器使用真实React组件，仅连接自己的合成页面，5项通过：普通模式仍滑动、动画途中切到reduce立即定位、reduce下随后选择无WAAPI、CIS参考入口行为保留、卸载删除媒体订阅。首次检查遗漏Page.enable导致订阅探针未加载，修正测试驱动后通过；没有把第一次失败当成功。可复查 `motion-check.mjs`、`motion-test.tsx/html` 和 `motion-browser-result.json`；缓存中原路径用于运行，归档副本需相应解析导入路径。

dev.22 TypeScript、两修改TSX的oxlint、CIS/chrome guards通过；React技能复查了context作用域、effect依赖、媒体变化时中断动画及卸载清理。dev.23仅文案与版本变化，copy.ts lint通过。两次Tauri debug NSIS构建均包含类型/Vite构建并成功，306输入逐项构建后核验。未重跑不受影响的30项历史源码测试、Rust矩阵或完整性能测试。既有ts-rs警告仍在。

## 通道限制和失败记录

托盘用进程所属 `tray_icon_app` 窗口及tray-icon本地源码推导的ID2调用Shell_NotifyIconGetRect；隐藏时返回S_FALSE的回退矩形不直接点击。只展开系统托盘，再对专属图标实际右击；菜单读Windows原生菜单文字/边界并物理点击。Shell UIA仅提供通用Pane，不能伪称其给出了独立Tagma按钮。原始无关Shell调试元数据不进入提交证据。

后续一次托盘点位命中保护拒绝，改用已观察到的Tagma设置退出完成独立所有权场景；**独立所有权退出不是托盘退出新增通过**。两次屏外UIA取消没有确认关闭、一条Escape轨迹仍停在名称，均停止后续输入，记录失败；可见取消按钮的真实点击成功。还观察到非本脚本写入的名称 `P0 Native Beta的`，来源未确认，非敏感字段先保全，再完成隔离fixture取消。不能把这些归因于已证实的产品缺陷、用户输入或已修复的控制根因。

旧sky/WGC跨应用故障没有重连或宣称修复。没有要求用户代点。可用原生点击和截图不等于所有输入场景永远可靠。

## 未通过与下一动作

**P0整体仍未通过，继续阻止P1/P2/P3放行。** 本批收口上述有版本证据的场景；剩余条件不能自动降级：

- 系统偏好实际变化及动画中切换的原生证明，仍只有进程信号/独立浏览器对应证据；前台抢占、IME/输入中断与取消的稳定恢复还需专项定位。无供应商跨页入口回焦尚只有既有模拟验证。
- 启动阶段的凭据库不可用、维护/权限、未知/不兼容配置结构等剩余原生恢复路径，需用新的受控合成条件逐项核对；本批没有触碰系统凭据库或破坏当前配置。既有核心/进程测试按其原证据复用。
- 两窗口的已有实例连接/冲突已验证，不冒充完全同步的冷启动竞态。活跃请求退出/取消的原生说明与等待路径未补；后台进程测试不替代其UI体验。
- 安装、升级、卸载、签名、干净机器、macOS与A24登记设备性能门槛未完成。性能样本、发行环境和真实上游不得以当前debug实例替代。

下一批先补启动阶段剩余原生错误恢复与输入中断专项，只重跑发生变化/有失败的范围。当前可继续观察的入口是 `.cache/p0-s13-lifecycle/Run.ps1 -Json '{"action":"observe"}'`，已固定dev.23身份；不要直接套旧PID、句柄或启动旧版本。第二窗口及独立网关驱动都已结束，已回收的临时profile不能再按存在假设启动。

## 空间、保全与调度

仍只有一个worktree，复用node_modules/Cargo target。构建前分别记录D/target新增峰值2GiB、dist/sidecar0.1GiB、每候选交付0.03GiB、C/Temp1GiB，均留足10GiB；前后各306输入一致。开始约C36.47/D29.67GiB，收尾约C35.77/D29.39GiB，含并发写入，不归因于本任务净占用。

本批证据约8.2MiB，缓存与归档合计仍在20MiB证据预算内；没有复制完整基线或源码overlay。既有dev.18 overlay仅恢复未变化的继承dirty；各交付SOURCE-INPUTS列出后续变化路径。dev.21/22/23候选、原隔离data/webview、历史证据、恢复材料和用户preview全部保留。

两个**本批新建**且已退出的临时profile完成边界/owner、重解析点、进程引用、文件锁和近期写入检查后回收：

| 目录 | 逻辑字节 | 按卷/文件ID去重的文件分配字节 |
| --- | ---: | ---: |
| D:/demo1/tagmaai/.cache/p0-s13-lifecycle/motion-browser-profile | 3,574,492 | 3,600,560 |
| C:/Users/ai/AppData/Local/Temp/tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88/webview-second-p0s13 | 12,268,227 | 12,331,144 |

无指向目录外的硬链接；文件分配量不含目录元数据。清理期间C可用增加12,374,016字节，D反而减少2,588,672字节，说明并发变化，不能声称这些整盘差值都是净回收。详见cleanup-result.json。历史P0-S11被拒绝的profile清理没有重试。写锁ROLLBACK、端口listener和独立fixture网关均由finally释放，无删库或凭据重置。

构建后发现0字节Git index.lock遗留超过10分钟，未发现git进程，独占打开成功；仅将精确锁文件移至本批缓存保全，未删除index或源码。提交继续成功，记录git-lock-recovery.json。继承dirty保持，未git add -A。

tagma-prd、magpie-cis及RUN-BINDING再次只读核实PAUSED，无创建/恢复定时任务、监督或清理服务。
