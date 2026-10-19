# TagmaAI 新窗口接续提示词（2026-10-18 14:52 CST 更新）

复制分隔线后的正文到新窗口即可。本文取代同文件早先基于7485c244的提示词；已完成的热修复提交、源码保全、Tauri CI和README不应重做。

---

请接手 D:/demo1/tagmaai 的正式 TagmaAI 产品开发，直接落实下一批工作。保留已建立的 CIS 外观与交互，先收口 P0 可用性，再按 P1 → P2 → P3 推进。不要把后台测试、版本号或安装包构建成功当成桌面可用性通过。

约束：
- 用户已停止本项目所有定时任务。tagma-prd、magpie-cis 和 RUN-BINDING 都是 PAUSED，保持停止；不创建或恢复自动监督/续作/清理，不唤醒旧聊天，不创建第二执行者或子代理。普通可逆开发无需重复问许可。
- 复用当前工作区、node_modules、Cargo target 和锁文件；先检查 git status/worktree、活动写入者及 C/D/Temp 空间。遵守用户 AGENTS.md 与 LOCAL-WORK-RULES，不另复制环境。>1 GiB操作先记录目录/峰值/复用/收尾，保留至少10 GiB余量。
- 保留继承 CIS/翻译/文档/图标修改；不 reset/stash/覆盖，不 git add -A。精确提交本批文件或hunk，缓存/包/数据库不能进Git。
- 用户默认库、凭据、D:/demo1/tagmaai-preview 和历史证据不能用于破坏性测试或清理。不得用删库/重置绕过不兼容。
- 不公开发布、推送main、购买服务或做未经授权的真实付费调用。ReachFlow服务的研究预算/平台/登录/浏览器授权不能被本开发任务代替。

先读：
1. docs/product/execution/PROGRESS-AUDIT-2026-10-18.md（14:52更新）；
2. docs/product/TAGMA-PRD-v0.3.md、TAGMA-PRD-v0.3-REVIEW.md、docs/CIS-CONTROLS.md；
3. docs/product/execution/EXECUTION-BASELINE.md、LOCAL-WORK-RULES.md、EXECUTION-STATUS.md；
4. HOTFIX-S01-DEV17-STARTUP.md、P0-S07-DEV17-ACCEPTANCE.md、P0-S08-CONTROL-CHANNEL.md及必要原始证据。
旧 EXECUTOR/SUPERVISOR 提示词的“创建监督、恢复执行、继续P2”不得覆盖最新停止调度及逐阶段收口指令。

接手基线（必须现场复核，发生变化按diff接续）：
- 分支 codex/tagma-p0；HEAD e5977537a5d2c26d74e5da03b21714f4cd9ee1b8。
- bf6e28d 已跟踪 dev.17旧库修复、历史SQL fixture、跨进程保存恢复测试、正式Tauri CI/README。不要再要求把这些当未跟踪热修复补交。
- 当前产品0.2.0-dev.17；package.json 0.1.208属于旧演示标识。正式包 D:/demo1/tagmaai-deliveries/0.2.0-dev.17/Tagma_0.2.0-dev.17_x64-setup.exe，6,629,799字节，SHA256 155c0f26ff3d5617867ca6ddcc6c1d1fcbf316ab33a241184c597dbcf022cc0c。
- 包是未签名debug候选，来源7485c244+当时dirty；304输入冻结记录和source-overlay已保全。不能把当前HEAD冒充原包构建来源。
- .github/workflows/build-tagma-windows.yml已是仅手动触发的Tauri+sidecar内部构建；旧dist:win仍是Electron。CI未在本轮执行，不要再从零创建相同工作流。
- 本次复核27项前端源码测试、启动3项/跨进程保存2项/sidecar停止保存恢复1项及CIS/chrome guard均通过。它们不是原生表单、宿主重启、物理拖动证据。
- P0整体未通过；P1网关/对话/小队/用量已有大量代码但未完成真实供应商与原生闭环；P2仅prepared基础；P3未交付。
- 用户当前安装版本未知，dev.9/dev.16历史记载不能当现场事实。

第一批：P0现有缺口，先做不依赖截图通道的实质工作。

1. 修正信息架构：src/product/ProductChrome.tsx:23 的items包含chat/providers/market/usage四项，PRD要求默认三页。保留用量功能，把它放到清楚可达的二层入口；保持顶部/侧栏布局、CIS、焦点和语言，不重做视觉。先检查是否有更新的用户授权改变需求，若无按现有PRD修正。
2. 修正启动失败的恢复语义：ProductApp.refresh只调用service.view；Application.config保存setup时的AppResult，ConfigService::open不在刷新时重跑，copy.ts却说“刷新重试”。先用合成的临时启动失败条件建立最小复现，再决定安全的显式重试初始化，或明确必须完全退出重启并验证恢复。成功要建立真实ConfigService/凭据/sidecar状态；失败保留错误和数据。不得简单清error、造空配置或宽泛接受未知数据库，不对已完成的写操作自动重放。
3. 对新增变更做相关类型/源码/核心或进程验证，两轮不同侧重自查；核对实际调用链和失败后状态。不要为了制造进度重复全部既有测试。更新EXECUTION-STATUS的当前入口，修正明显过期状态但保留历史证据。
4. 原生验收准备好唯一隔离实例：独占配置、WebView、端口及可识别窗口；旧fixture可能仍在用，先读进程/身份，不直接重用旧PID/句柄或删除。此前仅隔离Tagma测试窗口的点击/输入/截图/重启有授权，真实用户窗口/默认库/preview不在其中；工具与当前技能限制优先遵守。
5. P0-S08已经证明截图/坐标问题跨Tagma与WinForms存在，而部分键盘通道有用。先确认当前支持能力与实际状态；若可用就完成供应商新增/编辑/排序/删除、网关停止时保存、desired/effective差异、宿主完全退出重启后恢复、顶部/侧栏空白区自由拖动、按钮不误拖、最大化还原/托盘。绑定当前观察到的目标，不盲输或猜坐标，不通过自制输入器绕过控制限制。
6. 同一失败同一方法最多两次，不再重复已记录的无效截图/重连实验，不把“换窗口”或“后端测试通过”算修复。若支持的原生控制能力不可用，完成本批能独立修复的代码/合同/证据再交付具体剩余条件；不要求用户代点、不无限等待、不跳到P2掩盖P0未过。是否需要用户操作必须有不可替代证据，不能机械复用旧“重启宿主即可”猜测。
7. 按A01–A07及适用A23–A25检查候选，补键盘焦点、主题/语言/长文本/缩放/减弱动效、错误忙态、重复启动/端口/退出及性能的真正缺口。同版本同配置证据可复用，改变的范围才重测。macOS/签名/干净安装等未具备条件继续明确为发行阻塞，不降低门槛。
8. 产品源码有实质变化且定向验证通过后，再按空间规则生成新内部候选、递增版本、绑定commit+dirty与hash。保留dev.17及来源保全，不覆盖它冒充原包；仅改交接文档不需要重打包。提交精确变更，输出可运行入口、原生通过/未通过、保留目录和下一动作。

第一批结果必须回答：当前候选能否从启动、供应商保存、宿主重启到恢复实际用起来；拖动是否经真实位移通过；错误恢复和数据保全是否一致；哪些P0/发行门槛仍未过。未通过就保留未通过，不只回复测试数量或再次写计划。

后续顺序（不提前扩展）：
- P0门槛满足后完成P1：已授权真实供应商保存/检测/生效/非流式与SSE/取消/失败/用量；原生小队草稿发布/manual/sequential及失败中止；版本绑定外部客户端覆盖鉴权开启和显式loopback兼容模式；A08–A16、A27/A28。当前只有Chat Completions声明子集，未支持协议明确拒绝。缺真实资源或预算时列最小条件，受控HTTP不冒充真实上游。
- P1之后才把P2 prepared接到安装事务、活动版本、健康、崩溃恢复、更新/卸载和ReachFlow试跑，完成A17–A20；真实采集另守原服务确认。
- P2之后完成CLI/Skill/MCP共用核心的调用/状态/取消A21；基础对话按独立切片验证；不擅自扩大完整Pi/P4/更多队员。

现在先复核现场并完成第一批前两项源码问题的最小复现/修复，随后推进该批必要验证。不要只返回计划；不要恢复任何定时任务。
