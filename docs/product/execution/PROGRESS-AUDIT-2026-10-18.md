# TagmaAI 代码进度核查（2026-10-18，14:52 CST 更新）

本次按用户要求核对项目定时任务、真实代码、Git、安装包和定向验证，并更新接续提示词。本次没有修改业务代码、启动安装器、操作原生窗口、读写用户数据库、恢复旧聊天或创建调度。本文更新同日早先核查；早先的 HEAD、未跟踪热修复、旧 CI 和 RUN-BINDING 状态已经过期。

## 结论

实现已覆盖 P0 主体、较多 P1 功能及 P2 准备层，但**验收仍停在 P0，尚未形成已验收可交付的完整桌面主流程**。应先解决 P0 中现有代码与需求的差异，完成当前候选原生保存、重启恢复、自由拖动等验证，再按 P1 → P2 → P3 推进。代码切片和测试数量不能换算为产品完成百分比。

## 项目定时任务

- 扫描本机 Codex automations 配置，按 Tagma/Magpie、项目路径/ID及旧执行/监督聊天绑定匹配到 2 项：`tagma-prd` 和 `magpie-cis`，均为 `PAUSED`。调用 automation_update 的 view 核对；读取时已暂停，保持原配置，无须重复改写。
- Windows 计划任务按 TaskPath、TaskName 和每个 Action 的 Execute/Arguments/WorkingDirectory 完整字段匹配，结果 0 项。
- 当前本地 GitHub 工作流没有 schedule：正式 Tauri 工作流仅 workflow_dispatch；旧 Electron 工作流为 push/release/手动触发。本次未登录远程核查其他分支或其他托管平台调度，不扩大“全部”到未知外部系统。
- RUN-BINDING.json 已是 PAUSED；旧监督状态文件的 ACTIVE 和等待宿主重启等描述是历史快照，不能据此重新唤醒。
- 未修改其他项目任务。应用内部状态轮询、网关监督和用量保留是产品运行逻辑，没有按开发定时任务删除。

## 当前源码与交付身份

- 工作区：`D:/demo1/tagmaai`；仅 1 个 Git worktree；当前聊天无附加 worktree。
- 分支：`codex/tagma-p0`；HEAD：`e5977537a5d2c26d74e5da03b21714f4cd9ee1b8`（电脑控制跨应用诊断记录）。
- `bf6e28d` 已提交 dev.17 兼容修复、历史 SQL fixture、保存恢复测试、正式 Tauri CI 与说明。关键热修复已经跟踪，不能继续按“未保存源码”处理。
- `Cargo.toml` 与 `src-tauri/tauri.conf.json`：`0.2.0-dev.17`。package.json 的 `0.1.208` 仍属于历史演示包标识，不代表当前 Tauri 产品版本。
- 本轮写文档前有 12 条已跟踪修改和 13 条未跟踪状态记录（含折叠目录）；主要是继承 CIS/翻译/页面改动、产品需求/监督文件和移动图标。产品 Rust/Tauri/src/product 没有已跟踪差异。必须保留，不能 reset、清空或 git add -A。
- 交付：`D:/demo1/tagmaai-deliveries/0.2.0-dev.17/Tagma_0.2.0-dev.17_x64-setup.exe`。
- 本次重新计算：6,629,799 字节；SHA256 `155c0f26ff3d5617867ca6ddcc6c1d1fcbf316ab33a241184c597dbcf022cc0c`，与交付记录一致。
- 该包是 Windows x64 未签名 debug 候选；来源仍是 `7485c244` 加当时 dirty 输入，不能写成当前 clean HEAD 构建。304 文件冻结记录、BUILD-MANIFEST.json 和约 1.85 MiB 的 source-overlay.json.gz 已保留。本轮未重新核验全部304输入，也未重打包/运行安装器。用户当前实际安装版本未知。

## 真实实现进度

| 范围 | 直接核对到的代码 | 未完成的出口 |
| --- | --- | --- |
| P0 | src/product 的 Tauri invoke → src-tauri 命令 → ConfigService/GatewayManager；供应商 CRUD/排序、SQLite revision 冲突、SystemCredentials/keyring、sidecar 启停/所有权/恢复；严格识别早期 schema1 并经备份迁移 | 最新候选原生保存、宿主重启恢复、自由拖动及完整 A06；托盘/退出、安装与性能等适用出口仍需核对 |
| P1 | http_api.rs 注册 models/chat/completions；文本和函数调用转发、SSE、超时/背压/取消、鉴权/撤销；云小队与用量/清除/软预算；前端命令已接线 | 真实供应商、最新原生界面、鉴权开启的版本绑定外部客户端及 A08–A16/A27/A28 全部适用证据 |
| 对话 | ChatView → Tauri Channel → ChatBridge → 本机网关；分片显示、取消、错误处理 | 真实供应商原生闭环未验；完整 Pi/工具执行回环未交付 |
| P2 | manifest/Ed25519/路径/空间检查，ZIP 暂存解压，签名记录，prepared 原子发布/重读和有界发现 | 无 installed/active、安装激活/健康/更新卸载和 ReachFlow 实际运行闭环；市场仍显示未安装 |
| P3/发布 | Rust workspace 无正式 CLI/MCP 产品；正式 Tauri 手动 CI 已存在，README 已区分历史 Electron | A21 未完成；CI 执行、干净安装、签名及其他目标平台证据未确认。macOS 首发要求不能用 Windows 本机检查替代 |

关键代码：
- `src/product/service.ts`：原生命令、超时及 Channel；Web 预览明确拒绝正式原生命令。
- `src-tauri/src/main.rs`：Application、application_view、真实保存/启停/管理命令与 setup；`src-tauri/src/chat.rs`：向 loopback 网关发送。
- `crates/tagma-core/src/service.rs`：revision/事务/凭据 journal；`credentials.rs`：系统凭据，无文件明文降级；`migrations/legacy_schema1.rs`：精确历史识别。
- `crates/tagma-runtime/src/manager.rs`：真实子进程和所有权。
- `crates/tagma-gateway/src/http_api.rs:301`：仅两个已声明路由，其余 501/UNSUPPORTED_CAPABILITY；不能宣称 Responses/Anthropic/Gemini 或任意 Agent 兼容。
- `crates/tagma-core/src/packs/prepared.rs`：仅准备态，无活动版本或执行；`src/product/ProductApp.tsx` 的 market 仍只有未安装说明和小队管理。

## 两个具体代码缺口

1. **默认主导航偏离 PRD。** PRD v0.3 第3/5节和 EXECUTOR-PROMPT 要求“对话、供应商、队员市场”三页，运维在二层；ProductChrome.tsx:23 的 items 实际包括 usage，共四项。检索产品文档未见批准改为四项的决策。应保留用量功能，移到合适的二层入口，并核对顶部/侧栏两种布局与键盘访问。
2. **启动错误后的“刷新重试”与真实能力不一致。** ProductApp.tsx:48 的 refresh 只调用 service.view；main.rs:13 的 Application.config 保存 setup 时的 AppResult，:38 返回已保存错误，:623 的 ConfigService::open 仅在 setup 执行。因此首次打开失败后，即使外部可恢复条件已修复，刷新不会重新 open。copy.ts:7/32 却引导刷新重试。应先用合成失败条件复现，再选择安全的显式重试初始化，或对必须重启的情况清楚引导并验证重启恢复；不能无条件改写未知/损坏数据库。

这些是本次静态链路核对，不是已经操作窗口复现的结论。本轮只记录，不代为实施修复。

## 本次实际复核

| 命令/动作 | 本次结果 | 边界 |
| --- | --- | --- |
| node --test scripts/test-tagma-usage-source.mjs | 27 通过，0 失败 | 源码语义、SSR、模拟桥接，不是原生UI |
| cargo test --offline --locked -p tagma-core --test startup_upgrade --test save_restart | 3个启动 + 2个跨进程保存恢复通过；1个辅助worker忽略 | 独占合成目录；子进程重复输出不重复累计；不使用用户资料或系统真实凭据 |
| cargo test --offline --locked -p tagma-gateway --test process_lifecycle save_while_stopped_is_durable_and_applied_only_after_restart -- --exact | 1 通过 | 真实独占sidecar；停止期间保存、启动后生效，不等于宿主重启 |
| node scripts/cis-guard.mjs / chrome-guard.mjs | 均通过 | 样式/源码保护；不能证明 ProductChrome 导航正确、视觉相同或原生自由拖动可用 |
| 安装包 hash/大小 | 匹配 | 未重新解包或安装 |

本轮共6个独立Rust用例，不把worker重复输出计数。复用既有 node_modules/Cargo target，没有安装依赖或全量构建。存在既有 ts-rs 对 deny_unknown_fields 的解析 warning，命令退出码0；本轮没有重新执行全量 Clippy、TypeScript 或32项历史热修复矩阵。原始输出保存在 `evidence/PROGRESS-AUDIT-2026-10-18-1452.json`。

## 原生控制阻塞的准确边界

P0-S07/S08 和原始 channel-result.json 显示：Tagma 与被动 WinForms 对照窗口都截图超时、坐标点击缺 geometry；对照窗口键盘输入/回车有成功，不能说所有控制能力都坏了。原因未确定，不能归为已证实的 Tagma 点击逻辑或显卡故障。当前原生保存、宿主重启、物理拖动仍无有效通过证据；本轮没有再次尝试控制，历史句柄/PID不可直接复用。

后续仅使用获支持的能力及适用技能，重新枚举隔离实例；相同失败不重复循环。控制条件受阻时先完成本阶段可独立解决的上述代码缺口、错误状态与验收准备，不跳到 P2，也不反复要求用户代点或重启。

## 下一批与保留

接续提示词见 `NEXT-STEP-PROMPT-2026-10-18.md`。先补 P0 导航/错误恢复，再完成隔离原生主流程及适用门槛；之后才是真实 P1 → ReachFlow P2 → 多入口P3。完整 Pi/P4保持后续范围。

无新 worktree、运行环境或模型副本。唯一工作树保留。本次测试使用 TempDir；检查 `C:/Users/ai/AppData/Local/Temp/tagma-p0-save-restart-*` 无残留，没有人工删除其他资料。前 C/Temp约41.17 GiB、D31.09 GiB；验证后约41.16/31.09 GiB，变化含并发写入，不归因于任务净占用或净释放。

保留 dev.17交付与source-overlay、既有target、历史验收资料、`D:/demo1/tagmaai-preview` 及原原生fixture `C:/Users/ai/AppData/Local/Temp/tagma-hotfix-s01-d01972fd-b495-478e-8b54-af7eedbbfe47`。后者曾保持运行，未复核安全清理条件，不删除。原交付保全复查日期2026-10-25，仅文档记录，未创建定时清理。
