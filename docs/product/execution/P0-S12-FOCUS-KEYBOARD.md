# P0-S12：取消回焦、真实键盘遍历与 dev.21 原生回归

2026-10-18。接续 `010c5ea` / dev.19，复用唯一工作区、依赖及原隔离 data/webview/端口49697。用户要求直接执行并将有效原生方案写入项目 AGENTS.md；没有重复询问，没有恢复调度或唤醒旧聊天。

## 实际修改

- `eba8322` / dev.20：ProductApp 在点击捕获阶段记住编辑入口（包含键盘激活和 UIA Invoke），在编辑器关闭、入口重新启用后回焦；隐藏或消失的入口回退到“添加供应商”或当前内容。覆盖供应商、超时、App 档案、网关及共用编辑状态。删除确认取消也使用入口记录。取消与成功保存回焦，保存失败不关闭表单。
- ProviderForm、ProviderTimeoutForm 支持非忙态 Escape 取消，输入法组合期间不误取消；供应商取消清除内存中的新密钥输入。编辑期间禁用导航布局切换及错误区刷新，避免额外可操作入口。
- `8c49bec` / dev.21：真实原生发现“拒绝保存后焦点落到文档，错误在屏幕外”。新增可程序聚焦的错误区域；操作失败结束后滚入视野并聚焦，Tab 可继续进入表单。没有清空失败、伪造保存或自动重放请求。
- `4a49b17` 及本批文档补充：项目根 `AGENTS.md` 固化 Windows PrintWindow + UI Automation + SendInput 首选方案、隔离身份与前台保护、逐步预期焦点断言、调度暂停要求。

冻结 CIS 样式没有修改；继承的翻译、页面、样式、文档、图标差异保留。没有安装新依赖、另建 worktree、执行安装器或重新建立已有 CI/旧热修复。

## 通道诊断与边界

本批截图为已核验 Tagma HWND 的 Windows PrintWindow。UIA 用于控件身份、状态、原生表单操作；物理遍历、回车、Escape、拖动使用 SendInput。没有向 Tagma 注入 DOM/CDP 脚本，没有用后台结果代替原生通过。

UIA 报“名称已聚焦”时，初始连续 Tab 没有移动。对当前可见输入框原生点击后，实际 WebView 键盘通路恢复，dev.19 首次真实遍历到保存/取消，并复现取消后 Document 焦点。顶层 UIA 根节点不能 SetFocus；此失败不再重试。后续只对具体可聚焦控件 SetFocus，再核验前台并物理点击。一次只读 GetGUIThreadInfo 在 UIA 仍有聚焦标记时返回 Win32 Focus=0；成功键盘记录包含非零的原生焦点句柄。

仍出现前台保护拒绝、页面/尺寸/字段状态变化以及键盘顺序中途偏离，来源没有证实。`18-timeout-trace.json` 和 `36-saved-keyboard-trace.json` 是失败记录，不能按文件名记为成功。后者没有保存，随后重新核对合成字段并通过 UIA 原生保存。最终辅助脚本要求每键都有预期焦点，偏离即停止后续输入并保留已完成步骤。UIA 按钮的 Toggle/Invoke 模式按现场支持能力选择，不能只按“Button”类型猜测。

旧 sky/WGC 跨应用截图故障没有证明已修好；本批没有重连该通道。前台被抢占时仍会安全拒绝动作，不能宣称本机输入永远可靠。用户无需代点。

## 原生通过与证据

证据根为 [P0-S12](evidence/P0-S12/)，`actions.jsonl` 保存版本标题、PID、时间、动作和 UIA 快照，trace 保存逐键焦点；密码值不读取。

| 候选 / 场景 | 实际结果 | 主要证据 |
| --- | --- | --- |
| dev.19 缺陷复现 | 名称→地址→模型→密钥→启用→取消→保存，反向回到取消并回车后焦点为 Document | dev19-actual-tab-cancel.json |
| dev.20 供应商编辑 | 七项控件完整 Tab/Shift+Tab；回车取消回到“添加供应商” | 13-dev20-full-form-trace.json、13-dev20-returned-focus.png |
| dev.20 供应商页面 | 顶部导航、供应商开关/排序/编辑/删除、目录/超时/手动调用入口、安全入口、App 档案、网关，完整双向顺序；禁用按钮跳过；WebView 文档边界也记录 | 14-providers-tab-trace.json |
| dev.20 超时编辑器 | 四字段及取消/保存双向遍历；Escape 回到对应 Beta 超时入口 | 20-timeout-physical-trace.json |
| dev.20 设置与语言 | 设置全部按钮双向遍历；语言方向键到 English、回车选中并回焦；再次打开后方向键/Escape 不改变语言且回焦 | 26-settings-physical-keyboard-trace.json、27/28-language-*-trace.json |
| dev.20 英文侧栏150% | 表单七项完整双向遍历，自动滚动到页脚；Escape 回到 Add provider；设置无裁切 | 29-en-side150.png、30-side150-form-keyboard-trace.json |
| dev.21 保存失败 | 合成 `http://example.invalid/v1` 被保存校验拒绝，没有发上游请求；草稿保留、revision仍6。错误区域可见并聚焦，下一 Tab 回到名称 | 34-dev21-visible-error.png、34/35-*-trace.json |
| dev.21 保存与长文本 | 103字符合成名称通过原生表单保存，revision7，回焦到原编辑按钮；列表长名称省略，操作按钮可用 | 40-native-save-confirmed.json、40-long-name-confirmed.png |
| dev.21 排序 | Alpha上移变为首位revision8；Beta再上移恢复原顺序revision9 | 41-alpha-first.json、42-beta-first.json |
| dev.21 网关停止时保存 | UI停止网关，所属sidecar和49697监听均消失；原生表单恢复Beta名称，desired10/effective未确认，回焦编辑按钮 | 43-stopped*.json、45-saved-while-stopped.json |
| dev.21 宿主完全退出重启 | UI“退出 Tagma”后宿主34036及fixture进程均消失；同一data/webview重启为47436，sidecar8744；恢复Beta→Alpha Offline、模型、凭据存在状态和10/10 | 46-host-exited.json、47-restarted-processes.json、47-recovered-providers.json、60-final-providers.json |
| dev.21 物理拖动 | 顶部空白区 `[1574,629,2250,2037]` → `[1674,689,2350,2097]`，位移+100/+60；供应商按钮拖动不移窗；侧栏空白区−100/−60返回 | 48–51 对应 JSON |
| dev.21 最大化还原 | 双击头部空白区至 `[-8,-8,3848,2128]`，再次双击还原 | 52-maximized.json、53-restored.json |
| dev.21 App档案/网关 | App档案7项、网关4项控件完整双向遍历；回车取消分别回到添加App档案、修改网关配置；配置不改变 | 57-profile-full-keyboard-trace.json、58-gateway-full-keyboard-trace.json |
| dev.21 删除确认 | Escape取消，返回原Beta删除按钮；未执行删除，仍10/10 | 59-delete-cancel-trace.json、60-final-providers.json |

dev.20 不受错误区域修改影响的键盘证据单列复用，没有冒充 dev.21 逐项重测。dev.21 成功保存使用 UIA Invoke，失败保存/取消及其余标明的键盘步骤使用实际 SendInput。没有真实凭据回读、删库、重置或真实付费推理。窗口尺寸/页面的未归因变化不计入本脚本拖动位移。

## 定向非原生验证

- TypeScript build、修改组件 oxlint、30项源码/SSR/模拟桥接测试通过。扩展测试覆盖取消、失败不关闭、成功回焦、隐藏/消失入口回退以及错误可聚焦区域。
- CIS/chrome guard通过。React技能复查了ref保存事件来源、effect依赖、DOM提交后回焦、失败状态保留及重复轮询不抢焦点；没有增加全局键盘拦截或Tab焦点陷阱。
- dev.20与dev.21 Tauri debug NSIS构建通过，各306份冻结输入构建后全匹配。既有 ts-rs warning仍存在。没有为前端焦点改动重复全量Rust历史矩阵。
- 本批未新增独立浏览器测试；上一批布局证据和本批原生英文150%检查按版本记录。以上检查均不替代原生。

## 交付与源码身份

最终内部包：[Tagma_0.2.0-dev.21_x64-setup.exe](D:/demo1/tagmaai-deliveries/0.2.0-dev.21/Tagma_0.2.0-dev.21_x64-setup.exe)，6,619,582字节，SHA256 `732c2d314f62243ce4c0640f37de4bcc19579fa7d2a4f2bb8d9de54e1f6518b8`。来源 `8c49bec` + 继承dirty，未签名debug；安装器未运行。

中间 dev.20 保留：6,627,587字节，SHA256 `c65cf7d88bd3a5120c06a50bb62a321e17832bc18ac64f1324ffcd46e4e1a32c`，产品提交 `eba8322`。初次提交因本仓库没有作者配置失败，构建期间使用既有 Codex 提交身份以单命令 `git -c` 完成；未改全局Git设置。其preBuildHead为010c5ea加dirty，已通过冻结字节证明与eba8322的产品源码相同。

两个交付目录均有 BUILD-MANIFEST.json、SOURCE-INPUTS.json、使用说明。未重复复制旧保全包；继承dirty恢复引用dev.18已有source-overlay，排除清单中的9个已变更路径，再核验306输入。不能将后来文档HEAD或干净工作区冒充构建来源。

最新原生辅助入口：`D:/demo1/tagmaai/.cache/p0-s12-focus/Run.ps1 -Json '{"action":"launch"}'`。它只允许所有权/哈希匹配的dev.21隔离候选，并拒绝已有fixture进程。已有宿主保持运行；下次先观察，不直接启动旧launcher或双击裸EXE。

## 未通过与下一动作

**P0整体仍未通过，不放行P1/P2/P3。** 本批收口的是上述焦点/键盘及原生主流程。

剩余边界包括：减弱动效的原生确认；持续忙态和焦点被打断时的更多恢复路径；托盘菜单实际显示/退出及故障矩阵剩余原生项；无供应商时跨页入口回焦目前只有模拟验证；其他P1编辑器没有因此全部获得键盘通过。dev.21没有重新执行原生确认删除（dev.18已有独立证据）。安装/升级/卸载、签名、干净机器、macOS及A24性能门槛未完成。下一批按适用A01–A07/A23–A25证据缺口推进，不重复本批通过范围，也不将缺失条件降为通过。

## 空间、保留与调度

仅一个worktree。复用node_modules/Cargo target，构建前记录D盘新增峰值2GiB、dist/sidecar0.1GiB、交付0.03GiB及C/Temp1GiB预算；均保留超过10GiB余量。开始约C35.85/D31.16GiB，结束C36.47/D29.67GiB，变化包含并发写入，不声称为本任务净占用或释放。

证据初始51文件约4.03MiB逻辑大小，加两份小清单；未创建硬链接、压缩或稀疏文件，物理分配未单独测量。截图/日志上限20MiB，本批未新建浏览器profile。保留dev.19/20/21候选及交付、原隔离data/webview、`.cache/p0-s12-focus`、历史证据/源码overlay和用户preview。没有人工删除；上批被拒绝的1.68MiB profile清理没有重试。

tagma-prd、magpie-cis配置以及RUN-BINDING只读确认PAUSED。没有新建或恢复任何定时任务、监督、旧聊天或子代理。
