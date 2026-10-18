# TagmaAI 代码进度核查（2026-10-18）

本次范围：按用户要求确认停止项目定时任务，检查实际工作区、关键调用链、交付文件及已有验证，并给出下一步提示词。本次没有继续开发产品功能，没有操作用户窗口或真实数据库。

## 结论

项目已从 Magpie 外观演示进入 Tauri + Rust 正式产品实现。P1 网关相关代码已做了很多，P2 也已有安全准备目录的基础；但当前交付仍卡在 **P0 原生可用性与启动升级收尾**。不能把后端切片数量、版本号或测试数量换算为产品完成百分比。

接下来先把 dev.17 修复、保存/重启/拖动等真实交互和交付来源收口，再完成 P1 的真实服务闭环，之后推进 ReachFlow。完整 Pi 与 P4 不属于当前已排期范围。

## 定时任务核对

- Codex `tagma-prd`：PAUSED；本次读取时已暂停，保持暂停。
- Codex `magpie-cis`：PAUSED；本次读取时已暂停，保持暂停。
- 检查本机 automation.toml 的名称、提示词、项目路径与绑定，未发现第三个匹配本项目的自动化。
- Windows 计划任务：名称、路径、动作中匹配 Tagma/Magpie 的任务为 0。
- 当前仓库 `.github/workflows/build-windows.yml` 使用 push、workflow_dispatch、release 触发，没有 schedule；检查 scripts/package.json 未发现独立 cron 或 Windows 计划任务注册入口。
- 没有修改其他项目任务，也没有停止应用正常运行所需的轮询和生命周期逻辑。

`RUN-BINDING.json` 中的 `automation_status: ACTIVE` 是旧记录，与当前真实调度状态不符。不得据此恢复自动化。原执行台账顶部已经说明该差异；本次另存核查报告，未覆盖原监督专属文件。

## 代码与交付基线

- 工作区：`D:/demo1/tagmaai`；唯一 Git worktree。
- 分支：`codex/tagma-p0`；HEAD：`7485c244e1b59a14531fadab3c0ca5564d482822`，提交主题仍是 dev.16 安装包交付。
- Rust workspace 与 Tauri 配置的当前版本均为 `0.2.0-dev.17`。
- 核查开始时 Git 状态包含 24 条已跟踪修改与 44 条未跟踪状态记录，后者含折叠目录，不能视为 44 个文件。包含继承 CIS 改动、产品文档和 dev.17 热修复，不能一并清理或直接 `git add .`。
- `migrations/legacy_schema1.rs`、`startup_upgrade.rs`、历史 SQL fixture 等热修复关键文件仍未跟踪。因此仅 checkout 当前 HEAD 不能还原 dev.17。
- 冻结清单中的 304 个源码文件本次逐项 SHA256 复核无差异；该清单在构建期间生成，不是构建前冻结，也不等于当前仓库的全部文件。

实际存在的候选包：`D:/demo1/tagmaai-deliveries/0.2.0-dev.17/Tagma_0.2.0-dev.17_x64-setup.exe`。

- 本次重新计算大小：6,629,799 字节。
- 本次重新计算 SHA256：`155c0f26ff3d5617867ca6ddcc6c1d1fcbf316ab33a241184c597dbcf022cc0c`，与交付清单一致。
- 是 Windows x64 内部未签名 debug 候选包。已有构建日志和包内容核查记录；本次未运行安装器，不推断用户目前安装版本。

## 按真实实现划分的进度

| 范围 | 已在代码中确认 | 尚缺的出口证据/实现 |
| --- | --- | --- |
| P0 原生底座 | Tauri 页面与命令注册；供应商 CRUD/排序；SQLite 配置、revision 冲突、系统凭据接线；独立 gateway 进程的所有权、启停和有限恢复；dev.17 旧库兼容修复 | 最新候选的真实保存、切页、重启恢复、自由拖动；A06 键盘/焦点/主题/语言/缩放；托盘与退出路径完整复查；A24 性能；发布平台条件 |
| P1 网关与组合 | `/v1/models`、`/v1/chat/completions`；非流式/SSE、function 工具转发；配置快照、超时和背压处理；令牌撤销；云模型小队 manual/sequential；用量、恢复、清除与软预算；前端已接 IPC | 真实供应商与最新原生界面闭环；鉴权开启的版本绑定外部客户端；完整 A08–A16、A27/A28 验收。受控本机上游不能算真实云服务 |
| 对话切片 | ChatView → Tauri Channel → 本机 gateway；发送、分片展示与取消代码存在 | 本批没有真实供应商原生验收；完整 Pi、工具执行回环与会话恢复不能据此认定完成 |
| P2 队员 | 可信 manifest/Ed25519、路径与空间预算、ZIP 有界解压、原始签名记录、prepared 目录原子发布与有界发现 | installed/active 状态、健康检查、安装事务接入宿主、更新/卸载、ReachFlow 进程和调用闭环、A17–A20 完整验收 |
| P3 多入口 | 未发现正式 CLI/Skill/MCP 的共同业务闭环交付 | A21；网关二进制及测试用 curl 不等于正式多入口产品 |
| 发布 | 本地 dev.17 NSIS 包与来源证据存在 | CI 仍构建旧 Electron 壳；正式产品工作流、干净安装环境、签名及 macOS/Linux 证据未完成 |

关键源码依据：

1. `src/product/service.ts` 的调用实际走 Tauri invoke；`src-tauri/src/main.rs` 的命令落到 ConfigService/GatewayManager，启动使用 SystemCredentials。相关入口约在 service.ts:30、main.rs:43/72/251/623/680。
2. `crates/tagma-core/src/service.rs:367` 起实现供应商写入与 expected_revision 检查，事务提交在同文件中；不只是 UI 模拟状态。
3. `src-tauri/src/chat.rs:112` 校验 loopback 地址，`:120` 向本机 `/chat/completions` 发请求；不是前端直接访问云 API。
4. `crates/tagma-gateway/src/http_api.rs:302` 注册两个正式协议路由，其余接口返回 501/UNSUPPORTED_CAPABILITY。没有依据声称 Responses、Anthropic、Gemini 或所有 Agent 已兼容。
5. `crates/tagma-core/src/packs/prepared.rs:1` 明确只有 prepared 状态；`:30` 是发现接口，`:250` 是准备目录发布。`src/product/ProductApp.tsx:148` 仍显示 ReachFlow 未安装；service.ts 与宿主命令表没有安装/激活命令。
6. `crates/tagma-core/src/migrations/legacy_schema1.rs` 严格识别历史表结构与闭合 JSON；`migrations.rs:202` 接受精确旧格式，`:317` 起验证备份，`:352` 起事务内补应用身份和配置 UUID。未采用删库重建。
7. `.github/workflows/build-windows.yml:35` 仍调用 `npm run dist:win`，对应 package.json 中 Electron 构建；正式 Tagma 使用另一份 Tauri 配置。根 README 和 npm 包名称仍偏向旧演示项目，容易误指入口。

## 本次实际执行的验证

| 命令/核验 | 本次结果 | 边界 |
| --- | --- | --- |
| `node --test --test-reporter=dot scripts/test-tagma-usage-source.mjs` | 27 通过，退出码 0 | 源码语义、SSR 与模拟桥接；不含 WebView 原生操作 |
| `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit` | 退出码 0 | 类型检查，不是浏览器/原生功能验收 |
| `cargo test --offline --locked -p tagma-core --test startup_upgrade` | 3 通过，0 失败 | 精确历史 schema1、schema3/新库和未完成初始化/迁移恢复；使用合成目录和内存凭据 |
| `cargo test --offline --locked -p tagma-core --lib migrations::legacy_schema1::tests::` | 2 通过，0 失败，1 个辅助 worker 忽略 | 外来/损坏库拒绝，以及真实子进程在提交前后退出的恢复；忽略项不计通过 |
| 源码冻结清单 SHA256 | 304 项匹配 | 保持清单自身的构建期间采集限制 |
| 交付安装包 SHA256/大小 | 与清单一致 | 本次没有启动安装包或重做包内解包核查 |

Rust 检查复用了现有 target，无依赖下载；有既有 ts-rs 对 `deny_unknown_fields` 的解析 warning，不影响上述命令退出结果。不能把它说成完整 Clippy/全量无警告构建。

另读取历史 HOTFIX 原始日志：最初 migrations 有 1 项 fixture 失败，随后 negative-final 已通过；startup 3 + migrations 12 + 修正负例 1 + initialization 6 + config 10，共 32 个不同 Rust 用例，是已有批次记录，并非本次重跑 32 项。P1-S32 同样保存了前后失败与最终成功日志，不把中间失败抹去。

`HOTFIX-S01-native-ui.json` 只证明隔离窗口曾出现首页和 gateway ready 文字；保存、切页、重启尚未补齐，物理拖动也未确认。截图超时和点击坐标故障的历史记录不能自动认定今天仍未恢复，本次没有重试电脑控制。

## 台账需要校正的地方

1. RUN-BINDING 的 ACTIVE 已过期，以真实 PAUSED 为准。
2. EXECUTION-STATUS 的 A18 行仍写“未开始”，但 P2-S06/S07 和 prepared.rs 已有准备发布/发现。应改为“准备层局部实现，安装/激活/更新恢复未完成”，不能改成 A18 通过。
3. 旧 dev.9、dev.16 的原生操作证据不能直接覆盖 dev.17；用户当前安装版本应按后续现场只读识别结果记录。
4. 旧 CIS 的 27/29 是历史候选范围，不是正式 Tauri 产品整体视觉验收结论。

## 下一步顺序

1. 建立可重建 dev.17 的精确源码基线：区分继承改动，保全热修复、历史 fixture、PRD 与必要证据，校正调度和验收记录，不恢复定时监督。
2. P0 先完成隔离原生闭环：旧库安全升级/失败重试 → 三页 → 供应商新增编辑排序删除 → gateway 停止仍可保存 → 应用与 effective 确认 → 重启保留 → 自由拖动、托盘/退出、键盘焦点与缩放。每项绑定同一候选和数据目录，优先复现失败再修复。
3. 为正式 Tauri 产品补正确构建入口/CI 配置与交付说明。先本地核验，不擅自公开发布；不将旧 Electron 产物当正式安装包。
4. P0 适用出口关闭后，用已授权供应商验证 P1：连接、模型目录、真实非流式/SSE、停止、小队、用量和鉴权客户端。缺真实凭据或调用预算时说明具体缺口，受控上游结果单独保存。
5. P1 后再补 P2 安装/激活/健康/更新/卸载及 ReachFlow；最后 P3 多入口。完整 Pi/P4 暂不扩入。

可复制执行提示词见同目录 `NEXT-STEP-PROMPT-2026-10-18.md`。

## 本轮磁盘与保留

只复用原工作区、node_modules 和 Cargo target，未创建 worktree、环境或模型副本。检查前 C/Temp 约 41.87 GiB、D 约 33.77 GiB；定向检查后约 41.86/33.76 GiB，差值包含系统和其他并发写入，不能当作精确新增量。本轮没有删除文件或声称净释放空间。

新增交付为本报告及下一步提示词。现有构建缓存保留，旧验收资料、dev.17 交付目录、用户预览和历史隔离 fixture 均未清理。定向 Rust 测试使用其已有 tempfile 生命周期，未新建需要长期保留的测试目录。
