# PackGate 产品需求文档（PRD）

| 字段 | 内容 |
|------|------|
| 产品 | PackGate |
| 负责人 | 吱 陈 |
| 版本 | v0.1 |
| 日期 | 2026-10-14（Asia/Shanghai） |
| 许可证 | MIT |
| 状态 | 共识冻结 · 可开工 |

---

## 1. 背景与目标

### 1.1 问题

本地 Agent（Claude Code、Codex、Cursor CLI 等）各自管理「选模型」与供应商 Key，能力割裂：

1. **入口分散**：每个 Agent 单独配 Provider，故障转移、用量、意图分流难统一。
2. **重能力进不来**：TTS / ASR / 字幕 / FFmpeg / Remotion / ReachFlow 等本地重 Skill+MCP，无法作为「模型」被 Agent 一键选中。
3. **壳与网关割裂**：CC Switch 类工具擅长多 App 供应商管理；Magpie 类工具擅长 OpenAI 兼容网关与路由舞台；缺少「壳 + 网关 + 可热加载 Pack + 内置对话」一体产品。

### 1.2 产品一句话

**PackGate** = 本地统一网关：抢 Agent「选模型」入口；背后是云 LLM + 本地 Pack；壳管 Provider/MCP/Skills，网关做 OpenAI 兼容与意图路由，内置对话经 VerticalCraft/agent-web 承载 pi-web 能力。

### 1.3 目标（可验收）

| # | 目标 | 验收信号 |
|---|------|----------|
| G1 | 自研重写，非二开 | Tauri 2 + Rust + React；仓库自有，不 fork CC Switch / Magpie 源码 |
| G2 | 抢「选模型」入口 | Agent 将 Base URL 指到本机 PackGate 后，可选到组合模型 / Pack / 云模型 |
| G3 | 组合模型可用 | 一条模型 id = 云 LLM + 本地 Pack；无云模型时默认优先 Agent 自带额度 |
| G4 | Pack 可热加载 | 市场下载安装后即可作为路由目标与 OpenAI 兼容工具面 |
| G5 | 外观与壳能力对齐 | UI 对标 Magpie（灰白 + 靛紫 token、路由舞台）；壳能力对标 CC Switch |
| G6 | 分阶段交付 | 先桌面壳假数据；再接网关 / Pack / 真实对话 |

### 1.4 非目标（本期不做）

- 云端 SaaS 托管网关、多租户计费后台
- 自研全新 Agent 运行时（对话执行走 agent-web / SessionDaemon，不另起第二执行器）
- 与 Magpie / CC Switch 代码兼容或配置一键迁移（可后续做导入）
- 移动端原生 App

---

## 2. 用户与场景

### 2.1 用户

| 角色 | 诉求 |
|------|------|
| 重度本地 Agent 用户 | 多 CLI/IDE Agent 共用一套 Provider、路由与用量 |
| 内容 / 音视频制作者 | 在 Agent 里直接调用本地 TTS/ASR/剪辑 Pack，而不是另开一堆 CLI |
| 自建能力开发者 | 把 Skill+MCP 打成 Pack 上架，热加载进路由 |

### 2.2 核心场景

1. **换入口**：在 Claude Code / Codex 把 `OPENAI_BASE_URL`（或等价配置）指到 `http://127.0.0.1:<port>/v1`，Key 填任意（如 `packgate`），模型列表出现「组合 · 视频多模态」「Pack · 本地 TTS」等。
2. **无云也能聊**：后台未配任何云 LLM 时，默认走 Agent 自带额度；用户可在设置关闭该策略。
3. **装 Pack 即用**：市场安装 ReachFlow / FFmpeg Pack → 路由图出现本地目标 → 对话里 `/crawl`、`/video` 或工具卡触发。
4. **意图分流**：路由策略「按意图」：编码请求打云编码模型；语音请求打本地 ASR Pack。
5. **壳侧运维**：按 App 管理供应商卡片（启用、排序、检测连通、聚合默认），与 CC Switch 操作习惯一致。

---

## 3. 对标与差异

| 维度 | Magpie | CC Switch | PackGate |
|------|--------|-----------|----------|
| 定位 | OpenAI 入口 + 路由舞台 | 多 App 供应商 / MCP / Skills 壳 | 三层一体：壳 + 网关 + Pack/对话 |
| 外观 | 灰白 + 靛紫、节点路由 | 偏工具管理台 | **外观跟 Magpie** |
| 壳能力 | 中等 | 强（Provider 卡片全套） | **能力跟 CC Switch** |
| Pack 市场 | 无（偏插件/中间件） | 无 | **差异化核心** |
| 组合模型 | 路由组近似 | 聚合模式近似 | **显式「云 + Pack」组合 id** |
| 内置对话 | Sessions | — | agent-ui 简洁壳 + agent-web |
| 实现策略 | 参考交互 | 参考交互 | **MIT 自研，不二开** |

参考实现（只学交互与信息架构，不拷贝代码）：`yetone/magpie`、`farion1231/cc-switch`、`VerticalCraft/agent-web`、`VerticalCraft/agent-ui`。现有可点击假数据演示：`packgate-demo`。

---

## 4. 范围与非范围

### 4.1 范围内（v0.x）

- 桌面壳（Tauri 2）：侧栏导航、供应商、路由图、网关、Pack 市场、组合模型、MCP/Skills/提示词、会话、授权、用量、应用、设置
- 本地网关：OpenAI 兼容（Chat Completions / Models 至少）；意图 / 智能 / 顺序 / 轮询 / 用量 / 手动策略
- Pack：清单、下载、安装、启用、热加载、试跑；首批品类 TTS/ASR/字幕/FFmpeg/Remotion/ReachFlow
- 内置对话：投影 agent-web 会话语义（first-send、prompt、followUp、abort、工具卡、Host UI confirm）
- 默认策略：无云模型 → 优先 Agent 自带额度

### 4.2 非范围（见 1.4）及暂缓

- Pack 开发者完整 SDK / CI 发布流水线（可先约定目录与 manifest）
- WebDAV / 多机同步（设置可留入口，实现后置）
- Anthropic / Gemini 原生协议完整透传（网关以 OpenAI 兼容为主，其余按需）

---

## 5. 信息架构

侧栏结构（与 demo `CORE_NAV` / `GLOBAL_NAV` / `EXTRA_NAV` 对齐，可微调文案）：

```
PackGate
├── 核心
│   ├── 对话          # agent-ui 风格简洁壳
│   ├── Pack 市场
│   └── 组合模型
├── 按 App 的供应商   # Claude Code / Codex / …（CC Switch 式）
├── 全局
│   ├── MCP · Skills · 提示词 · 会话 · 授权中心 · 用量
├── 网关面
│   ├── 路由图 · 网关
└── 设置 · 应用 · 插件 · 资料库（后两者可降优先级）
```

顶栏：Profile / 方案切换、本地 Proxy 开关、当前页主操作（添加供应商 / 安装 Pack / 新建组合）。

视觉 token：灰白底 + 靛紫强调（Magpie）；对话页可保留暖底简洁壳（agent-ui），与管理页分区即可，避免两套设计系统失控——管理面统一 Magpie token，对话面允许 Claude 壳子集。

---

## 6. 核心流程

### 6.1 Agent 接入

```
用户配置 Agent Base URL → PackGate /v1
     → GET /v1/models 列出云模型 + Pack + 组合模型
     → POST /v1/chat/completions
           → 路由策略判定
           → 云 Provider / 本地 Pack / Agent 自带额度
```

### 6.2 组合模型解析

```
Agent 选择 model = composite:video-mm
     → 读组合定义：cloud = X，packs = [ffmpeg, remotion, asr]
     → 文本推理走 cloud（或无云时走 Agent 自带额度）
     → 工具/模态调用热加载对应 Pack
```

### 6.3 Pack 生命周期

```
市场浏览 → 下载 → 校验 manifest → 安装到本地 Pack 目录
     → 注册为路由目标 + OpenAI 工具/模型面
     → 启用/禁用 · 试跑 · 卸载（热更新优先，尽量不重启壳）
```

### 6.4 内置对话（不另起执行器）

```
空态首条消息 → 条件建 Session（Machine/Project/Workspace/Session）
     → 空闲：prompt；执行中：followUp 入队
     → 停止：abort（保留 Session，≠ kill）
     → Pack 命令 → 工具卡；敏感操作 → Host UI confirm
```

正式版经网关代理到真实 SessionDaemon（VerticalCraft/agent-web）；Demo 仅状态机投影。

---

## 7. 功能列表（按三层）

### 7.1 壳层（对标 CC Switch）

| 模块 | 优先级 | 说明 |
|------|--------|------|
| 多 App 供应商页 | P0 | 启用/切换/排序/编辑/复制/检测连通/用量查询/终端/删除；聚合添加/移除/默认 |
| 应用管理 | P0 | 安装检测、显示名、进入对应供应商上下文 |
| MCP / Skills / 提示词 | P0 | 列表、开关、按 App 作用域；Skills 发现可 P1 |
| 授权中心 | P1 | Copilot / ChatGPT / xAI 等入口聚合 |
| 用量 | P0 | 额度条、周期统计；热力图/日志 P1 |
| 会话列表 | P1 | 与内置对话、外部 Agent 会话索引（能列先于能深链） |
| 设置 | P0 | 通用、网络/本地路由、模型与「自带额度优先」、OpenAI 兼容地址展示、关于 |
| Profiles | P1 | 顶栏方案切换 |

### 7.2 网关层（对标 Magpie）

| 模块 | 优先级 | 说明 |
|------|--------|------|
| OpenAI 兼容 HTTP | P0 | `/v1/models`、`/v1/chat/completions`；本地 Key 校验可放宽 |
| 路由舞台 UI | P0 | Agent → PackGate → 云/本地目标节点流 |
| 策略 | P0 | 智能 / 意图 / 顺序 / 轮询 / 用量 / 手动 |
| 意图规则 | P0 | 规则面板 + 命中轨迹（可先规则，后模型分类） |
| 故障转移 | P0 | 与供应商排序联动 |
| 网关状态页 | P0 | 监听地址、协议、Proxy 开关、连接数（假数据→真） |
| 决策日志 | P1 | 每轮路由原因，便于排障 |

### 7.3 Pack / 内置 Agent 层

| 模块 | 优先级 | 说明 |
|------|--------|------|
| Pack 市场 | P0 | 卡片、安装/卸载、启用、版本；远程源可先固定清单 |
| Pack 运行时 | P0 | manifest、进程/模块加载、健康检查、OpenAI 工具暴露 |
| 组合模型 | P0 | CRUD；展示 cloud + packs；生成稳定 model id |
| 自带额度优先 | P0 | 设置默认 ON；无云模型时生效 |
| 本地试跑 | P0 | Pack 级 TTS/ASR 等试跑面板 |
| 内置对话 | P0→P1 | UI P0（假数据）；接 SessionDaemon P1 |
| 首批 Pack | P1 | TTS、ASR、字幕、FFmpeg、Remotion、ReachFlow（可并行，不阻塞壳） |

---

## 8. 技术架构

### 8.1 栈

| 层 | 选型 |
|----|------|
| 桌面壳 | Tauri 2 |
| 前端 | React + TypeScript（可延续 Vite；样式 token 对齐 Magpie） |
| 网关 / 本地服务 | Rust（Tauri 侧或独立 sidecar，需在里程碑定一种） |
| 对话后端 | VerticalCraft/agent-web（SessionDaemon）；UI 简洁对标 agent-ui |
| 许可 | MIT |

**硬约束**：不二开 CC Switch / Magpie；可对照其 UX 与 FEATURE-PARITY 清单做回归。

### 8.2 逻辑视图

```
┌─────────────────────────────────────────────┐
│  Tauri Shell (React)                        │
│  供应商 · 路由图 · Pack · 组合 · 对话 · 设置 │
└───────────────┬─────────────────────────────┘
                │ IPC / localhost
┌───────────────▼─────────────────────────────┐
│  PackGate Gateway (Rust)                    │
│  OpenAI 兼容 · 路由策略 · 用量 · Provider    │
└───────┬─────────────────────┬───────────────┘
        │                     │
   Cloud LLM APIs        Pack Runtime
                              │
                    TTS/ASR/FFmpeg/…
                ┌─────────────┴─────────────┐
                │ agent-web SessionDaemon   │
                │ （内置对话，非第二执行器） │
                └───────────────────────────┘
```

### 8.3 关键接口（对外）

- `GET /v1/models`
- `POST /v1/chat/completions`（流式优先）
- 环境变量约定：`OPENAI_BASE_URL`、`OPENAI_API_KEY=packgate`（示例）

Pack manifest（草案，实现时可修订）：`id`、`name`、`version`、`kind`、`entry`、`openai`（model/tool 暴露）、`resources`、`permissions`。

---

## 9. 里程碑

| 阶段 | 主题 | 交付 | 建议周期 |
|------|------|------|----------|
| M0 | 共识与 Demo | 本 PRD；`packgate-demo` 假数据可点（已有） | 完成 |
| M1 | 桌面壳假数据 | Tauri 2 壳跑起来；导航与 Magpie token；供应商/路由/Pack/组合/设置为假数据但操作完整 | 2–3 周 |
| M2 | 网关最小可用 | 本机 OpenAI 兼容；至少一种策略 + 手动；真实云 Provider 连通；`/v1/models` 含组合与 Pack 占位 | 2–3 周 |
| M3 | Pack 热加载 | 本地目录安装至少 1–2 个 Pack（建议 TTS + ReachFlow 或 FFmpeg）；试跑；路由可达 | 2–4 周 |
| M4 | 对话接通 | 网关代理 agent-web；first-send / prompt / followUp / abort；工具卡与 confirm | 2–3 周 |
| M5 | 硬化 | 用量真实化、故障转移、意图规则、打包安装、FEATURE-PARITY 对照收口 | 持续 |

阶段纪律：**先壳假数据，再网关/Pack/对话**——与产品共识一致，禁止 M1 未稳就并行大面积真实 Pack。

---

## 10. 风险与开放问题

### 10.1 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| Pack 进程隔离与权限 | 本地代码执行安全面大 | manifest 权限声明、默认拒绝网络/文件系统扩展、试跑沙箱 |
| 多 Agent 配置形态不一 | 「一键接入」文案难兑现 | 先做好 OpenAI 兼容 + 文档；各 App 配置向导 P1 |
| agent-web 耦合过深 | 对话进度绑死上游 | 网关只依赖稳定 HTTP/WS 契约；UI 可降级为纯网关客户端 |
| 路由策略过早智能化 | 意图误判伤害信任 | M2 先手动/顺序；意图规则从显式规则表起步 |
| 外观双轨（Magpie vs agent-ui） | 品牌分裂 | 管理面统一 Magpie；对话面独立皮，不反污染全局 token |

### 10.2 开放问题（需产品拍板）

1. 网关进程模型：Tauri 内嵌 vs 独立 sidecar？
2. Pack 分发源：仅官方清单，还是允许自定义 registry？
3. 组合模型 id 命名空间与对外稳定性承诺（Agent 配置会写死 id）？
4. 「Agent 自带额度」在网关层如何技术实现（透传上游 Session vs 本地探测）？
5. 首发平台：仅 macOS，还是 macOS + Windows 同发？
6. FEATURE-PARITY 中插件/资料库是否进 M1 导航，还是隐藏到「更多」？

---

## 11. 附录：成功标准（M2 切片）

满足以下即可对外称「网关可用」：

1. 任意支持 OpenAI 兼容的 Agent 指向 PackGate 后能完成一轮流式对话。
2. 模型列表同时出现至少：1 个云模型、1 个组合模型、1 个 Pack（可为占位实现）。
3. 关闭全部云 Provider 时，默认策略落到 Agent 自带额度（或明确错误提示，不可静默失败）。
4. 壳侧供应商卡片具备启用、排序、检测连通三条主路径。

---

*本文对齐 packgate-demo README / FEATURE-PARITY 与既有产品共识；实现细节以仓库设计文档迭代，不在本 PRD 展开。*
