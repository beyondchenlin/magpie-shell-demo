# P0 电脑控制通道对照诊断

2026-10-18，接用户“先解决截图和点击通道，保持控制，不再要求代点，再验收保存/重启/自由拖动”的指令。结果仍是 **not_fixed**；实际 UI 验收未完成，没有新的产品功能通过声明。

## 新证据

- 复用原 node_repl / sky 会话，没有 reset、终止控制进程或重启 Codex。原隔离 Tagma 窗口 id69124、进程10184始终保留；其 MainWindowHandle 与控制器返回 id 一致，进程响应正常。
- 原窗口截图先返回 `FrameArrived timed out: timed out waiting on channel`；重新选择/激活后返回 `window capture timed out: timed out waiting on channel`。
- 新建被动 WinForms 对照窗口，仅有输入框、按钮和计数器，没有截图、输入注入、私有协议或网络代码。用现有 .NET Framework 编译器编译，不安装依赖。
- 对照窗口截图也超时；通过实际可访问性观察按钮后，`sky.click(element_index:3)` 返回 `coordinate input geometry is unavailable`，前后计数保持8。随后增加250ms持续重绘，截图仍超时。因此可以排除“只有 Tagma 或只有静态画面失败”；不能据此直接判定显卡、Windows 服务或控制组件内部的具体根因。
- 对照窗口 `Return` 使计数0→1，日志时间与调用一致；`type_text` 输入 `tagma-channel-20261018` 后，由可访问性状态完整读回。两次 `Alt+F4` 都实际关闭了对照窗口，下一次枚举确认消失。键盘/文本部分通道有真实成功证据，不把所有控制能力都说成不可用。
- 测试期间出现其他无对应助手调用的计数/按键变化，另有一次 Tagma 操作触发 `user input was detected in this window; call get_window_state before continuing`。这些不归因于助手，也不计成功；按要求重新观察后才继续。Tagma 的 Tab 操作仍没有确认进入具体按钮/编辑框，不能盲输供应商内容。
- Windows 10 Pro 19045，console会话1 Active，两个测试进程及DWM处于同一会话；CaptureService_1f54cc 为 Running；GPU4090和GameViewer虚拟适配器均报告OK，实际物理显示3840×2160。只读查看没有发现所查询的图形捕获策略覆盖；这不等于所有权限和图形栈都已证明正常。

证据：[通道结果](evidence/P0-S08-channel-result.json)、[对照窗口事件](evidence/P0-S08-probe-events.txt)、[被动窗口源码](../../../scripts/fixtures/computer-channel-probe.cs)。事件日志只记录类型、数量、位置和时间，不记录键值或用户输入内容。

## 操作边界与未解决项

使用 [Computer Use SKILL.md](C:/Users/ai/.codex/plugins/cache/openai-bundled/computer-use/26.1013.40934/skills/computer-use/SKILL.md) 及其 [guidance](C:/Users/ai/.codex/plugins/cache/openai-bundled/computer-use/26.1013.40934/docs/guidance.md)。其中要求“Use only the Computer Use JS APIs for Windows app automation”，并要求捕获失败后重新选择并有界重试。本批没有改用自制截图/鼠标注入器，没有使用猜测坐标，也没有修改产品来冒充控制通道修复。

现有公开 sky 接口没有重建截图后端的专用操作。用户要求不断开控制，所以没有通过重置整个会话/重启宿主来试错；也没有证据证明这类重启必然有效。没有重启共享捕获服务、显示驱动或远程连接。只读技术资料查询没有及时返回，已结束该查询，没有依据未获得的网页作结论。

当前无法在保持该连接的前提下，通过已提供的接口确认修复公共截图/坐标通道。下一项必要外部条件是该组件恢复有效截图帧及鼠标输入；不是让用户代点 Tagma。条件满足后才能继续原生供应商保存、宿主退出重启和物理鼠标自由拖动。现有3项后台进程测试不替代这些验收。

## 保留和清理

额外对照窗口由 sky 正常关闭，确认进程退出后，仅清理本批专属 `C:/Users/ai/AppData/Local/Temp/tagma-p0-channel-5cff696d-f59f-41ae-aaf8-60f595a424c9`。删除前核对精确绝对路径、owner标记、三文件清单、重解析点、进程引用、独占文件锁及最后写入；原始事件已复制并校验哈希。逻辑10067字节，不宣称等量物理净释放；[清理记录](evidence/P0-S08-cleanup.json)。源码、精简结果和事件保留，无新worktree/环境，没有全量构建或产品二进制变化。

原 Tagma 隔离目录和控制会话仍保留。两项项目自动化仍为 PAUSED，未添加任何调度；对照窗口内部重绘计时器随其退出销毁。C/D从约41.60/34.02GiB到41.53/31.77GiB；本批仅创建并回收约10KB程序和少量证据，盘差来源未确定，不归因于本批，也不作为释放量。
