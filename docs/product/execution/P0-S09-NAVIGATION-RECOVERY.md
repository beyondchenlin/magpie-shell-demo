# P0-S09 三页导航与启动恢复（2026-10-18）

本批只推进 P0；tagma-prd、magpie-cis、RUN-BINDING 保持 PAUSED，未唤醒旧聊天、未使用子代理。开始现场为 codex/tagma-p0 @ e5977537a5d2c26d74e5da03b21714f4cd9ee1b8，唯一工作区、无当前聊天附加 worktree。继承 CIS/翻译/文档/图标修改保留，不整体暂存。

## 修改及验证边界

主导航改为对话、供应商、队员市场；用量移到设置二层，有返回设置入口，设置图标在用量页标记所在位置。保留原 CIS 控件、顶部/侧栏布局和 deep 拖动区，切换页面后将键盘焦点落在命名的正文区域；打开编辑器时不抢表单焦点。

启动恢复选择明确的完整退出流程。宿主原有 ConfigService::open + 条件访问令牌初始化提取为同一个 startup::open，setup 仍只调用一次，refresh 仍只读状态。界面明确刷新不会重新打开配置库，修复原因后应使用“退出 Tagma”再重开；关闭窗口可能仅隐藏到托盘，重启也不能修复不兼容/损坏库。失败面板给诊断、刷新状态与真正退出命令。配置错误单独保留，普通外观/退出错误不覆盖它，只有实际读取成功才清除；首次读取失败后不再每两秒轮询同一个启动错误。没有新增初始化重试、自动写重放、删库、凭据重置或空配置成功。

先用合成凭据存储故障复现：真实初始化失败，解除故障后缓存仍失败，重新打开真实初始化函数才能恢复。验证原供应商/原凭据不变、只补建一个访问令牌、再次重开不递增 revision/不换 token。未知库重复打开始终失败且原字节不变。新增真实子进程维护锁场景：首次进程拒绝打开；解除合成维护锁后两个新进程均读取原供应商和 revision1，无重放。均只用独占 TempDir 与合成凭据，不接触用户配置或系统凭据。

本批新增测试只证明源组件渲染、初始化函数和进程边界，不称作原生表单或宿主 UI 验收。

## 空间预检与候选计划

开始 C/Temp 41.16 GiB、D31.06 GiB；定向验证后 C41.16/D31.02 GiB。原地复用 node_modules、Cargo registry/target、锁定依赖；没有安装新版本依赖，desktop 的 tempfile/fs2 测试依赖均为锁中已存在版本。未创建 worktree/clone/运行环境。

计划 dev.18 内部 debug NSIS 构建峰值：D:/demo1/tagmaai/target 增量上界2 GiB，dist-tagma/src-tauri/binaries 合计0.1 GiB，D:/demo1/tagmaai-deliveries/0.2.0-dev.18 交付0.03 GiB；C:/Users/ai/AppData/Local/Temp 链接/打包与一个独占验收目录上界1 GiB。均保留至少10 GiB。无模型/环境下载；复用原编译缓存和打包工具。若超过预算先复核，不复制整个环境。

收尾保留有版本交付/源码身份/必要证据，测试 TempDir 正常关闭；已有 target 留作后续构建缓存，不作为交付打包。原 dev.17 及 source-overlay、历史证据、用户默认库和 D:/demo1/tagmaai-preview 全部保留。旧原生 fixture 仍运行，禁止清理或覆盖。

## 原生控制边界

重新枚举而未复用旧句柄：旧隔离宿主 PID18320、网关 PID31912、窗口657920，路径仍为 C:/Users/ai/AppData/Local/Temp/tagma-hotfix-s01-d01972fd-b495-478e-8b54-af7eedbbfe47；端口57772。实际文字为 dev.17 的四项主导航和 desired/effective0，不据此宣称本批 UI 已通过。

一次 Tab 和一次当前状态截图均返回 `foreground window did not report a process id`。没有可确认的焦点移动或截图，未猜坐标、未重连/重置控制器、未要求用户代点。使用 [Computer Use 技能](C:/Users/ai/.codex/plugins/cache/openai-bundled/computer-use/26.1013.40934/skills/computer-use/SKILL.md) 及 guidance；其要求“Use only the Computer Use JS APIs for Windows app automation”。本轮不改用自制输入器/截图器或旧 WebView 注入驱动绕过，后台测试不替代原生。

## 自查

第一轮检查实际调用链和失败状态：startup::open 与原 setup 的开库/令牌顺序一致；runtime 只在真实初始化成功后启动；退出命令不依赖可用配置，仍按所有权停止网关。未知数据保持拒绝，恢复不会重放保存。最初29项、补状态测试后最终30项源码测试和3项初始化测试通过，worker重复输出不累计。

第二轮检查前端异步/键盘/样式：用量页不占主导航，顶部和侧栏中英文渲染均核对；原始配置错误不被普通错误清除；配置尚未可读时不启动轮询。初次 lint 提示复杂 effect 依赖，改为稳定布尔 hasView 并定向复核。遵循 React Best Practices 的 effect 依赖/派生状态和命名控件原则，没有增加 UI 框架或替换 CIS。

## 最终候选与定向结果

产品提交 `8b6f0d65f90f956a674099b409d076be72f95534`；构建仍包含继承 dirty 输入，不称 clean 构建。最初 Git 未配置作者，提交被拒；随后仅该命令使用与项目历史相同的 Codex/codex@openai.com 身份，没有改全局配置。

[dev.18 内部安装包](D:/demo1/tagmaai-deliveries/0.2.0-dev.18/Tagma_0.2.0-dev.18_x64-setup.exe)：6,627,330字节，SHA256 `6943d9244a39ae75971559ce0ac51a2a198babb49745ca3b757cbf8a9fdc0885`。Windows x64 debug/未签名，安装器未执行，未公开发布。包内宿主与构建宿主仅NSIS的UNK→NSS三字节标记不同；sidecar全文件一致，两者AMD64/GUI。见 [包验证](evidence/P0-S09-package-verification.json)。

源码306文件集合的采集开始于构建命令前，完成于命令早期，**不能称为完整的构建前快照**；构建后重核全部306文件无变化。来源manifest明确记录这一时间边界。保留新候选source-overlay 1,823,959字节（SHA256 `50d3b6755488b6546ed9601dc848def2de101241fc533b5d34c370ad39af34a3`），仅用于相对8b6f0d6复原新包输入；未重新制作dev.17保全。见 [冻结记录](evidence/P0-S09-source-frozen.json) / [交付身份](evidence/P0-S09-delivery.json)。

| 定向检查 | 结果与边界 |
| --- | --- |
| node --test scripts/test-tagma-usage-source.mjs | 30通过，含顶栏/侧栏中英文三项导航、错误恢复文案、真实ProductApp源码的无DOM hook harness：刷新不抹错、退出拒绝不覆盖启动原因、读取成功才轮询、设置→用量→返回 |
| cargo test --offline --locked -p tagma-desktop --features custom-protocol startup::tests -- --nocapture | dev.18匹配打包feature，3个独立用例通过；1个worker入口忽略，不重复计数；合成故障与跨进程初始化恢复 |
| cargo clippy --offline --locked -p tagma-desktop --all-targets -- -D warnings | 通过；既有ts-rs deny_unknown_fields提示仍存在 |
| oxlint --deny-warnings 四个本批前端源文件 | 通过；最初effect依赖警告已修复，原日志保留 |
| tsc -b / Vite / Tauri debug NSIS | 通过；构建日志约3KB，没有重复既有热修复或CI工作流 |
| CIS/chrome guard、源码/文档 git diff --check | 通过；CSS保护不当作原生视觉/拖动通过；原始编译日志的ts-rs行尾空格原样保留，整体暂存检查会报告这些日志空格，不改写原始证据 |

## 新隔离实例与准确出口

旧dev.17在后续只读进程检查中已不存在，本执行者未发送关闭/终止命令，不推断退出原因，旧目录仍保留。新候选只准备并启动一个本批专属实例：

- 路径：`C:/Users/ai/AppData/Local/Temp/tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88`。
- 启动入口：上述目录的 `launch-tagma.exe`；独占data/webview，端口49697，标题“Tagma 隔离测试 dev18 P0-S09 128d7053”。launcher只设置环境和启动相邻程序，不实现输入、截图或私有协议。源码为 scripts/fixtures/p0-s09-launcher.rs。
- 观察时宿主PID45604、网关PID7332、窗口593796；下次必须重新枚举，不复用这些值。sky启动器提示未暴露窗口后，正常枚举得到实际子进程窗口，没有反复重启。
- 原生可访问性文字确认：主导航三项、真实空供应商、网关运行于49697、desired/effective均0。一次Tab只观察到WebView窗格焦点；一次截图报 `FrameArrived timed out: timed out waiting on channel`。停止重试，未对未确认编辑焦点输入内容，未猜坐标。
- [原始文字与错误](evidence/P0-S09-native-channel.json)、[实例身份](evidence/P0-S09-native-fixture.json)。这些只证明候选初次启动及三页导航文字，不能证明CIS像素一致、二层可操作、保存或拖动。

**当前候选尚不能认定完成“启动→供应商保存→宿主退出重启→恢复”的实际可用闭环；真实物理拖动未通过。** 错误恢复与数据保全在生产初始化函数/跨进程层一致，但原生失败面板/退出入口/宿主重开仍待验证。

| P0门槛 | 本批后状态 / 下一动作 |
| --- | --- |
| A01/A06三页与二层 | 三项原生文字确认；源码中两布局/中英文、二层前进返回及失败态通过；实际焦点/长文本/主题/缩放/减弱动效/截图仍待验 |
| A02供应商CRUD/排序/停止网关仍保存 | 复用P0-S07核心/sidecar证据；dev.18原生表单、desired/effective差异待验 |
| A03/A07启动故障、数据保全、冲突 | 新故障恢复3项通过，未知库拒写；原生操作与完整阶段复查未过 |
| A04/A05重复启动/端口/所有权/托盘/宿主重启 | 既有进程证据保留；本候选宿主退出、重开及托盘待验 |
| A06自由拖动 | 无真实位移证据，未通过；须有效截图/输入后核对顶部/侧栏空白拖动及按钮不误拖 |
| A23/A24发行与性能 | 当前包静态核验通过；干净安装、签名、macOS等目标平台、当前候选性能未验 |
| A25 | 复用工作区/依赖、证据有界、新自动测试临时目录关闭；运行中的隔离目录保留，不删除 |

下一动作仍为恢复可确认的原生截图/输入条件后，在这一个隔离实例完成上述P0；不是要求用户代点。未找到能够安全修复控制器的已支持接口，本批不重启共享服务或另造控制器；P0未过不进入真实P1、ReachFlow P2或P3。

候选交付与新隔离实例的保留责任为当前项目执行者，复查日2026-10-25；只记录复查日，未创建定时清理。收尾空间和进程清单见 [收尾记录](evidence/P0-S09-closeout.json)。

收尾C/Temp41.103 GiB、D30.676 GiB，均在预算内；盘差包含并发写入，不当作本任务精确净占用。交付目录逻辑8,453,974字节，新运行验收目录观察时逻辑43,630,124字节，均不宣称物理占用。自动测试目录 `tagma-p0-startup-recovery-*` 残留0；人工删除0，无新增worktree。唯一主工作区、构建缓存、两版交付、两版原生fixture与用户preview继续保留；两项automation配置收尾读回仍PAUSED。
