# P0-S10 dev.18 控制通道诊断（2026-10-18）

**未修复截图/输入通道；P0 未收口。** 本批复用已有 dev.18 隔离实例，没有产品源码修改、版本递增、重新构建或后台验收替代。原生供应商保存、排序、网关停止时保存、宿主退出重启恢复、自由拖动新增通过数为 0。

## 现场与保护

- 分支 `codex/tagma-p0`，开始 HEAD `a55655f4897d17f07a783448dc0222529ed38106`，产品提交 `8b6f0d6`，唯一 worktree `D:/demo1/tagmaai`。继承 dirty 文件保持，不整体暂存。
- 已有实例 `C:/Users/ai/AppData/Local/Temp/tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88`；宿主 PID45604、网关 PID7332，端口49697。本批重新枚举获得窗口593796，标题 `Tagma 隔离测试 dev18 P0-S09 128d7053`。PID/窗口均为观察值，下次须重新枚举。
- 原生可访问性仍读到三项主导航、空供应商、网关运行、已保存版本0/运行中版本0。没有打开编辑器或输入供应商数据，没有停止网关、退出宿主或移动窗口。
- `tagma-prd`、`magpie-cis` 的 automation.toml 和 RUN-BINDING 均为 PAUSED，未修改、恢复或创建定时任务，未唤醒旧聊天、未调用子代理。

## 本轮新增事实

使用已安装 Computer Use 26.1013.40934，`@oai/sky` 0.7.8，cua_node 0.0.30/20261014203459-0849368674e2。原始观察见 [P0-S10-native-channel.json](evidence/P0-S10-native-channel.json)。

| 检查 | 实际结果 | 判断边界 |
| --- | --- | --- |
| 重新枚举、读取可访问性 | 成功；起始焦点为“切换导航布局” | 只证明文字/对象可读；不能称输入已恢复 |
| 一次 Tab、立即及后续独立读取 | 均只读到 `2 窗格 Tagma` | 延迟读取没有确认按钮焦点；不能向未知焦点输入 |
| 当前实例一次截图 | `FrameArrived timed out: timed out waiting on channel` | 未获得图像或有效坐标几何 |
| 新观察的“添加供应商”索引32点击 | `coordinate input geometry is unavailable`；页面保持首页 | 索引点击也依赖原生几何，不能当作不需要截图的替代路径 |
| 新观察的窗口 secondary action `Raise` | 动作返回成功；其后截图 `window capture timed out: timed out waiting on channel` | 显式置前仍未恢复取帧，停止截图尝试；没有重连或重置 |
| Shift+Tab 后等待300ms再读 | 焦点仍为 `2 窗格 Tagma` | 反向进入页面的键盘替代路径也未成立；未输入任何测试文本 |

本批截图请求共2次（当前状态与显式Raise后的有界恢复），点击1次，Tab/Shift+Tab各1次，Raise1次；控制器重连、重置、重新启动次数均为0。没有重建此前已经失败的跨应用 WinForms 对照。

## 根因调查：已缩小范围，尚未确定底层原因

Windows10 Pro 19045；console会话1为Active，DWM、宿主和网关同属会话1；CaptureService_1f54cc为Running。NVIDIA RTX4090驱动32.0.16.1714与GameViewer虚拟显示驱动15.6.5.199的设备状态均OK，虚拟设备当前ProblemCode=0/IsPresent=true。当前查询显示物理显示输出存在，不能由这些状态单独推出WGC可用。

本机启动时13:08:57有Kernel-PnP219：ROOT\\DISPLAY\\0000的WudfRd加载警告。当前设备已正常报告，**这条历史事件不是已证实根因**。限定最近3小时、最多100条Application警告/错误中没有匹配Tagma、WebView2或DWM的结果；这也不证明不存在底层图形故障。没有禁用虚拟显卡、修改安全/隐私配置、重启共享服务或切换用户显示环境。

只读查看已安装JS适配层：公开的 `get_window_state`、`press_key` 和索引 `click` 主要负责参数检查、转发原生请求和解释返回结果。截图错误由原生取帧返回；索引点击转发到原生点击后也返回几何不可用。公开API没有选择图形适配器、重建capture frame pool、保留/恢复WebView焦点或修复原生端的接口。本批没有修改运行时文件、调用私有接口或另建控制器。

Microsoft文档说明 [CreateFreeThreaded](https://learn.microsoft.com/en-us/uwp/api/windows.graphics.capture.direct3d11captureframepool.createfreethreaded?view=winrt-26100) 可解除DispatcherQueue依赖、让FrameArrived由内部线程触发；[SendInput](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput) 还受完整性级别和现有按键状态影响。这些是原生端应检查的候选条件，**没有证据证明本机正是其中某一原因，不能据此声称已修好**。本机wry0.57.0源码已有WM_SETFOCUS→MoveFocus处理，也不足以把本次容器焦点问题直接归因于Tagma前端。

历史S08已证明标准WinForms同样取帧/几何失败，而其键盘输入曾成功。因此截图故障不限于Tagma；本轮把“读文字成功”“键盘调用返回”“目标控件实际收到输入”分开记录，不把三者等同。

## 可交接的最小复现与修复出口

无需新建fixture。按Computer Use技能初始化后，从 `sky.list_windows()` 唯一选择上述完整标题，调用 `get_window_state({window,include_screenshot:false,include_text:true})`，再分别验证截图和最新树中的“添加供应商”索引。调用、时间、窗口身份与错误已落盘，无需重复无条件重连。

下一项必须是**受支持的原生控制运行时修复或经证据支持的图形环境修复**：核对捕获线程/FrameArrived等待、设备选择及几何生成失败传播，核对输入前置激活是否丢失WebView子控件焦点；修复后先证明这个原窗口能返回截图、点击打开编辑器、聚焦字段并读回合成文本。只有通过这一小组门槛，再执行供应商保存→排序→停止网关保存→真正退出/重开→恢复→顶部/侧栏拖动。当前公开接口无法实施底层修复，不要求用户代点，不用WebView脚本注入或后台数据库检查替代。

使用的 [Computer Use技能](C:/Users/ai/.codex/plugins/cache/openai-bundled/computer-use/26.1013.40934/skills/computer-use/SKILL.md) 的 [guidance](C:/Users/ai/.codex/plugins/cache/openai-bundled/computer-use/26.1013.40934/docs/guidance.md) 明确要求："Use only the Computer Use JS APIs for Windows app automation." 本轮因此没有改用自制输入/截图器；这不是用户权限不足，也没有请求用户批准同一操作。

| 用户要求的原生验收 | 本批出口 |
| --- | --- |
| 供应商保存、排序 | 未验；编辑器未打开 |
| 网关停止时保存 | 未验；网关未停止 |
| 宿主退出重启恢复 | 未验；原宿主继续运行 |
| 自由拖动 | 未验；没有可用截图/几何或真实位移证据 |

## 收尾

无新增/保留额外worktree，无安装、下载、全量构建和测试数据库。开始读数C41.09/D30.68GiB；后续读数C44.92/D35.33GiB，回升来源未调查，不归为本任务释放。仅增加有界JSON和Markdown证据；人工删除0。已有dev.18隔离目录、构建缓存、dev.17/dev.18交付和用户preview继续保留。P0未通过，P1、ReachFlow P2、P3不放行。
