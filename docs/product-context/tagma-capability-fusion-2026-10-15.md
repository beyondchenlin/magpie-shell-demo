# Tagma 能力融合清单（Track A · 2026-10-15）

| 字段 | 内容 |
|------|------|
| 产品 | **Tagma**（塔格玛） |
| 日期 | 2026-10-15（Asia/Shanghai） |
| 状态 | 讨论可执行 · Track A 真源 |
| 对齐 | PRD `/workspace/tagma-prd-2026-10-15.md` **v0.2.4**；共识 `/workspace/packgate-consensus-2026-10-15.md`；LocalAI 深研 `/workspace/packgate-localai-research.md` |
| 范围 | CC Switch + Magpie + New API + LocalAI → Tagma 落层；**不**改 Magpie demo 代码 |
| 原则 | 融**能力**，不叠**四个完整 UI**；地基优先；C++ 仅重型队员；Pi Agent = 长线 |

---

## 0. 一句话

**Tagma = L0（CC Switch 壳）+ L1（Magpie 网关 + New API 用量味）+ L2（LocalAI 式按需队员，不 fork LocalAI）+ 长线 Pi 系内置 Agent。**

用户每天碰默认三页；运维进二层；重能力市场按需装。

---

## 1. 落层图例（全文共用）

| 落层代号 | 含义 |
|----------|------|
| **L0** | 壳：按 App 配置、写回、托盘、管理面 |
| **L1** | 网关 sidecar：`/v1`、路由、组合小队、渠道、用量 |
| **L2** | 队员运行时：manifest、安装、子进程隔离、市场 |
| **Pi** | 长线内置 Pi 系 harness + 对内控制 MCP（不挡地基） |
| **入口** | Skill / MCP / CLI / `/v1` 对等面（壳是管理面） |
| **学** | 只学交互/打包/心智，**不**进产品实现或一期范围 |
| **外** | 外接 Provider / 用户自装第三方，不进核心 |
| **否** | 明确不做 / 非目标 |

---

## 2. CC Switch → 功能清单与落层

来源心智：`farion1231/cc-switch`（Tauri2+Rust+React）；多 Agent 供应商/MCP/Skills/提示词一键管理；**不**跑本地大模型。

| # | 能力（可执行粒度） | 落层 | Tagma 阶段 | 备注 |
|---|-------------------|------|------------|------|
| C1 | 多 App 供应商页（启用/切换/排序/编辑/复制/删除） | L0 | 地基 P0 | 默认三页之「供应商」主路径 |
| C2 | 检测连通 / 终端打开配置上下文 | L0 | P0–P1 | P0 可假连通；P1 真测 |
| C3 | 聚合供应商（添加/移除/设默认） | L0→L1 | P1 | 聚合结果写进网关默认渠道序 |
| C4 | 应用管理（安装检测、显示名、进对应供应商上下文） | L0 | P0 | |
| C5 | MCP 列表 / 开关 / 按 App 写回 | L0 | P0 薄；P3 桥完整 | 与 Magpie Library 合并为「一处写、多 Agent 出」 |
| C6 | 薄 Skills（SKILL.md）列表 / 开关 / 写回 | L0 | P0–P3 | 薄 Skill ≠ L2 队员 |
| C7 | 提示词集中管理与写回 | L0 | P0 二层 | |
| C8 | 直连 vs 本地路由 vs 聚合模式切换 | L0+L1 | P1 | 本地路由 = 指到本机 `tagma-gateway` |
| C9 | 用量入口（额度条、周期） | L0 入口 + L1 数据 | P1 | 数据源在网关；壳只展示 |
| C10 | 设置（通用、网络、关于） | L0 | P0 | 含本机 `/v1` 地址展示 |
| C11 | 托盘 / 菜单栏快切 | L0 | P1+ | 学 Magpie 菜单栏；非 P0 阻塞 |
| C12 | Profiles / 方案一切换 | L0 | P2+ | 学 Magpie Profiles；可后置 |
| C13 | 授权中心（Copilot/ChatGPT/xAI 等） | L0 | 后置 | 个人版可后；勿挡地基 |
| C14 | 会话列表深链各 Agent | L0 | 后置 | 能列先于深链 |

**CC Switch 不进 Tagma 的：** 单独再做一个「只改配置、无网关」的第二产品；二开其源码。

---

## 3. Magpie → 功能清单与落层

来源心智：`yetone/magpie`（本机网关 ≈ `:3425`；协议互译；路由组；Library；CLI/TUI/Web）。

| # | 能力（可执行粒度） | 落层 | Tagma 阶段 | 备注 |
|---|-------------------|------|------------|------|
| M1 | OpenAI Chat / Responses + Anthropic Messages + Gemini 兼容与互译 | L1 | P1 | 个人版先 OpenAI `/v1` 真通；其余协议按需跟 |
| M2 | `GET /v1/models` 混合列表 | L1 | P0 假 / P1 真 | 上游云名 + `tagma/…`（见 PRD §7） |
| M3 | 按 Agent 选模型并原子改写其配置 | L0 | P0–P1 | CC Switch「写回」+ Magpie Agents 表合并 |
| M4 | Provider 预设 + key + models.dev 补全 | L0+L1 | P0 预设卡片；P1 真拉模 | Ollama/LocalAI/LM Studio = **外** Provider |
| M5 | 从 CC Switch / Claude / Codex 等导入 Provider | L0 | P2 | 降低迁移成本 |
| M6 | 「添加到 magpie」式导入链 | 学 / 后置 | — | 品牌后可做「添加到 Tagma」 |
| M7 | 订阅当 Provider（Claude/Codex/Copilot/Gemini/Grok…） | L0+L1 | 后置 | 复杂度高；地基后评估 |
| M8 | 多账号 / 额度用尽自动切 | L1 | P1 简版 failover；完整 smart/pace 后置 | |
| M9 | **路由组** `group/…`（order/rotate/usage/smart/pace） | L1 | P1：手动+顺序必有；其余 P2+ | Tagma **组合小队** `tagma/<slug>` ⊃ 路由组心智，但成员可含 **L2 队员** |
| M10 | 意图路由 + 命中轨迹 | L1 | P2+ | P1 可用规则板替代 |
| M11 | 路由舞台 UI（实时决策图） | L0 二层 | P1 可简；视觉 1:1 **非**产品 P0 阻塞 | Track B 管视觉；产品主轴仍三页 |
| M12 | 网关状态（地址/协议/连接数） | L0 二层 + L1 | P1 | |
| M13 | 决策日志 | L1 | P2 | |
| M14 | 插件（Bun provider 插件 + 网关中间件） | 学 / 后置 | — | 中间件能力用 Rust 钩子或后置插件面；**不**一期引入 Bun 运行时 |
| M15 | New API 同构中间件（param-override / model-map / word-guard…） | L1 | P2+ / 服务器 P4 | 个人版从简 |
| M16 | 用量：token/花费/额度窗口/会话花费 | L1 + L0 二层 | P1 简易；热力/OTLP 后置 | New API 味见 §4 |
| M17 | Library：指令 / MCP / Skills 一处写回多 Agent | L0 | P0–P3 | 与 C5/C6 同一模块 |
| M18 | CLI / TUI | 入口 | P3（薄 CLI 可随网关提前） | `tagma …` 对等 Skill/MCP |
| M19 | 局域网共享 + 命名 Key 限额 | L1 | **服务器 P4** | 个人版默认 localhost |
| M20 | 远程 magpie / Docker / WebDAV 同步 | 否 / P4 | — | 个人版不依赖 Docker；同步后置 |
| M21 | 任意模型代为联网搜索 | L1 或 L2 | 后置 | 可做可选队员或网关插件 |
| M22 | 生图/视频 MCP 工具 | L2 | 插件目录 | 非地基 |
| M23 | Agent CLI 版本检测与更新提示 | L0 | 后置 | |
| M24 | WSL Agent 配置 | L0 | 后置（Win） | |

**Magpie → Tagma 关键改写：**

- 路由组（纯云模型 failover）→ **组合小队**（云脑 + **队员** + 路由策略）。
- Library 保留并与 CC Switch 写回合并，避免两套「同步到 Agent」。
- Magpie **1:1 壳点录** = Track B 视觉资产；**≠** 产品 IA 第四套主导航。

---

## 4. New API → 功能清单与落层

来源心智：`QuantumNous/new-api`（自托管渠道网关；多用户；配额/倍率；渠道优先级；控制台）。Magpie 中间件已部分对齐其 `param_override` / `model_mapping` 等。

| # | 能力（可执行粒度） | 落层 | Tagma 阶段 | 备注 |
|---|-------------------|------|------------|------|
| N1 | 统一 OpenAI 兼容入口 | L1 | P1 | 与 M1 合一，不另起端口产品 |
| N2 | 渠道（上游）CRUD + 多 Key | L1 | P1 | UI 入口可在「供应商」或二层「渠道」 |
| N3 | 渠道优先级 / 权重 / 失败重试 / 自动禁用 | L1 | P1 重试+排序；权重/亲和 P2+ | |
| N4 | 渠道测试 | L1 | P1 | 与 C2 连通检测共用 |
| N5 | 模型映射（对外名 ≠ 上游名） | L1 | P2 | `tagma/` 自有 id 另册，不混用映射表 |
| N6 | 参数覆盖 / 敏感词 / 系统提示注入 | L1 | P2+ | 学 Magpie 中间件，不必抄 New API 控制台 |
| N7 | 按模型/渠道/Key 记 token、费用、耗时 | L1 | **P1 必有简易版** | PRD §10.2 |
| N8 | 额度条 / 周期汇总 | L0 二层 | P1 | |
| N9 | 完整倍率体系（模型×补全×分组） | 否（个人）/ P4 | — | 个人版不搞计费 SaaS |
| N10 | 预扣/后结算配额 | 否 / P4 | — | |
| N11 | 多用户 / 分组 / RBAC / OAuth / 2FA | 否 / P4 | — | 服务器版再评估 |
| N12 | API Key 限额、模型限制、IP 白名单 | L1 | 个人：可选开鉴权（§10.1）；完整限制 P4 | |
| N13 | 兑换码 / 充值 / 邀请返利 / Stripe | **否** | — | 非个人产品目标 |
| N14 | 数据看板 / 审计日志全站 | L1 简 / P4 全 | P1 只要本机汇总 | |
| N15 | 模型广场（定价展示） | 学 | — | 队员市场价格/体积卡片可借鉴，不做充值广场 |
| N16 | Playground 试聊 | Pi / L0 对话 | P0 假 → Pi 长线 | 不另做 New API 式运营 Playground |
| N17 | JS 异步任务插件（图/视频任务 API） | L2 或否 | 插件目录 | 用队员契约，不引进 New API 插件市场整套 |
| N18 | 多语言运营控制台 | 否 | — | 壳跟产品语言即可 |

**New API 一句话：学「渠道 + 用量记账」，不学「多租户充值站」。**

---

## 5. LocalAI → 功能清单与落层

来源：`/workspace/packgate-localai-research.md` + 官方 docs。  
**总闸：不 fork、不内嵌 LocalAI 全家桶；默认不做本机大模型服务器。**

| # | 能力（可执行粒度） | 落层 | Tagma 阶段 | 备注 |
|---|-------------------|------|------------|------|
| L01 | OpenAI/Anthropic 兼容 shim | L1 | P1 | 网关自研，非 LocalAI 核心 |
| L02 | 小核心 + 后端按需加载 | **学 → L2** | 契约 P2 | 队员 = 可装单元，不是 60+ gRPC 后端 |
| L03 | Backend Gallery（OCI/CUDA 变体） | **学** | — | 学「变体/拟合/显式体积」；个人版优先**预编译目录包**，不默认 Docker pull |
| L04 | Model Gallery 一键装 / 异步 job | **学 → L2 市场** | P2 | 队员市场 UX |
| L05 | 磁盘/VRAM 拟合与清理保护（被引用则保护） | L2 | P2+ | |
| L06 | 签名校验（Sigstore 等） | L2 | P2 官方源强制 | PRD §8 |
| L07 | TTS/STT/图像/视频/嵌入等多模态后端 | L2 插件目录 | 地基后 | TTS/ASR **优先 native/C++** |
| L08 | llama.cpp / vLLM / 装 GGUF | **外** 或可选 Local Brain Pack | — | Provider 指 Ollama/LocalAI；**不**进默认包 |
| L09 | MCP 服务端执行循环 + 作用域 | L1 + 入口 | P3；作用域 P2 起可简 | 一期不做 MCP Apps iframe |
| L10 | LocalAGI Agent 池 / Jobs / Hub | **否**（整池）/ **Pi**（单内置） | Pi 长线 | 一个内置 Agent ≠ Agent Hub |
| L11 | LocalAI Assistant（聊着装模型） | **Pi** 对内控制 MCP | 网关稳后 | 「装队员/改供应商」用人话 |
| L12 | Terminal agent + 审批门 | Pi 或入口 | 后置 | |
| L13 | RAG Collections | L2 或否 | 后置 | 勿塞壳 |
| L14 | Skills（轻指令块） | L0 薄 Skill | P0–P3 | 与 LocalAI Skill 同级；**不是**队员 |
| L15 | P2P / Federated / Worker 分片 / NATS | **否** | — | 复杂度主来源 |
| L16 | WebUI 平铺 Backends/Swarm/Activity… | **否** | — | 违背三页 IA |
| L17 | CLI `local-ai run/models/worker` | **学 →** `tagma` CLI | P3 | |
| L18 | API Discovery（`.well-known`） | 学 / 后置 | — | |
| L19 | Docker/K8s 安装路径 | 个人 **否**；服务器 P4 | — | |
| L20 | 预编译 / 单二进制发行体验 | **学 →** 个人安装包 + 队员包 | 全程 | 用户原话：网页看着重，**编译后的包值得学** |

---

## 6. LocalAI 专节：学什么 / 不抄什么

### 6.1 必须学进 Tagma 的（可执行）

| 学习点 | 落到 Tagma | 怎么验收 |
|--------|------------|----------|
| **小核心，用到再装** | 默认安装包 = 壳 + 网关 sidecar + CLI；重能力全是队员 | 干净安装体积理想数十～数百 MB；无大 GGUF |
| **按需后端 / 预编译包** | L2 `binary_pipeline` / `mcp_runtime`；音频优先 C++ native（YoVoice 路） | 装 ReachFlow/TTS 后路由可见，用户无装 Python |
| **Gallery 交互** | 队员市场：体积、平台变体、取消、试跑、引用保护 | 安装过程可取消；被小队引用的队员卸载有提示 |
| **后端故障不拖垮核心** | 队员子进程隔离；网关 sidecar 与壳分离 | 队员崩 → 壳仍能改供应商 |
| **内置 Assistant 心智** | Pi 对内控制 MCP（装队员/改供应商/看用量/组小队 + 确认门） | 长线；不挡地基 |
| **同一运行时多入口** | `/v1` + Skill + MCP + CLI | G7 |
| **Agent-in-binary 模式** | 内置 Pi harness 跟壳同发，脑仍走网关 | 打开即聊；不嵌大本地 LLM |

### 6.2 明确不抄 / 不做

| 不抄项 | 原因 |
|--------|------|
| Fork / 内嵌 LocalAI 仓库或进程当核心 | 运维面吞噬产品；与 PRD 冲突 |
| 侧栏平铺 Backends / Swarm / P2P / Agent Hub | 重、丑、违背「比 LocalAI 更简洁」 |
| 默认 Docker/OCI 拉后端当个人主路径 | Windows/国内体验差；个人版原生包优先 |
| 把 WebUI 信息架构搬进 Tagma | LocalAI = 运行时优先；Tagma = 壳/路由 UX 优先 |
| 一期 P2P / 模型分片 / 联邦 | 心智与稳定性成本过高 |
| MCP Apps（工具 iframe UI）一期 | 安全面大 |
| 混淆 LocalAI「Skill」与 Tagma「队员」 | 薄指令 vs 胖运行时必须分色/分安装器 |
| 静默拉取超大包 | 必须显式大小与确认 |

### 6.3 「网页看着重、包不重」如何表述给用户

设置或关于页可有一行边界文案（与 LocalAI 深研 §6.8 同向）：

> 需要通用本地大模型服务器时，把 **Ollama / LocalAI** 加为供应商即可。Tagma 专注 Agent 入口与可安装队员；重能力用预编译队员包，按需下载。

---

## 7. 四产品 → Tagma 总映射（速查）

| 主题 | CC Switch | Magpie | New API | LocalAI | **Tagma** |
|------|-----------|--------|---------|---------|-----------|
| 按 App 改配置 | ✅ 主业 | ✅ Agents 表 | — | — | **L0** |
| 本机兼容网关 | 弱 | ✅ 主业 | ✅ 主业 | ✅ shim | **L1 sidecar** |
| 路由 / failover | 弱 | ✅ 路由组 | ✅ 渠道策略 | 弱 | **L1**；组合小队升级 |
| 用量 / 配额 | 入口 | ✅ | ✅ 完整计费 | 多用户 | **L1 简易**；计费站 ❌ |
| 薄 Skill / MCP 写回 | ✅ | ✅ Library | — | 轻 Skill | **L0 + 入口** |
| 按需重能力 | ❌ | 弱 | 插件任务 | ✅ Gallery/后端 | **L2 队员市场** |
| 内置 Agent | ❌ | ❌ | Playground | ✅ LocalAGI | **Pi 长线** |
| 个人安装 | 桌面 | 桌面 | 常服务端 | 常 Docker | **原生单包两进程** |

---

## 8. 集成后的 IA / 模块边界（产品冻结对齐）

### 8.1 默认三页（每天碰）

```
┌─────────────────────────────────────────────────────────┐
│ 1. 对话 / 内置 Agent     P0 可假 → 长线 Pi + 对内 MCP   │
│ 2. 供应商                 CC Switch 主路径（C1–C4）       │
│ 3. 队员市场               LocalAI Gallery 心智（L2）     │
│    └─ 含「组合小队」入口   Magpie 路由组升级形态          │
└─────────────────────────────────────────────────────────┘
```

### 8.2 二层（需要再进）

| 模块 | 主要来源 | 边界 |
|------|----------|------|
| 组合小队 CRUD | Magpie 路由组 + Tagma 队员 | 完整配方编辑；保存 → `/v1/models` |
| 路由图 / 网关状态 | Magpie | 运维面；非第四主导航 |
| 用量 | Magpie + New API 从简 | 本机汇总；无充值 |
| MCP · Skills · 提示词 | CC Switch + Magpie Library | **一套**写回，禁止两套 UI |
| 设置 · 应用 · 关于 | CC Switch | 含 `/v1` 地址、鉴权开关 |
| 渠道高级（映射/中间件） | New API / Magpie 插件 | P2+；勿塞进默认三页 |

### 8.3 进程 / 包边界

| 单元 | 形态 | 谁拥有 |
|------|------|--------|
| 壳 | Tauri 进程 | L0 + 管理面 UI |
| `tagma-gateway` | **sidecar** 同安装包 | L1 |
| `tagma` CLI | 同安装包 | 入口 |
| 队员 | 另层子进程 / 自有包 | L2 |
| Pi harness | 壳内或紧邻库；脑走网关 | Pi 长线 |

### 8.4 加新功能时的落层纪律（防乱）

1. 先问：这是 **改各 Agent 文件** → L0；**改请求去向** → L1；**装本地产能** → L2；**人话管本机** → Pi。  
2. 默认三页满了？→ **二层**，禁止新主导航。  
3. 云模型 id **不要**加 `tagma/`；只有自有实体加。  
4. 薄 Skill 与队员 **分安装器、分徽章**。  
5. 视觉新控件：管理面跟 Magpie token；**不**为了 1:1 点录拆掉三页 IA（细节由 Track B CIS 约束）。

---

## 9. 与 PRD 交付阶段对齐（能力视角）

| 阶段 | 能力融合焦点 | 来自谁 |
|------|--------------|--------|
| **P0 壳主路径** | 三页可用；供应商卡片；市场+组合入口（可假）；models 假数据 | 主 CC Switch + 壳 IA |
| **P1 真网关+组合+用量** | sidecar `/v1`；小队真 id；简易用量；手动/顺序路由；鉴权默认关 | Magpie + New API 从简 |
| **P2 运行时+ReachFlow** | Pack manifest/安装/健康检查；英雄验证队员 | LocalAI 加载哲学 |
| **P3 三入口** | Skill + MCP + CLI 对等 | YoVoice / Magpie CLI / LocalAI 多表面 |
| **P4 服务器** | Docker；Key 记账；渠道策略加强 | New API 服务端味 + Magpie 局域网 |
| **Pi 长线（并行）** | 真 Agent 循环 + 对内控制 MCP | LocalAI Assistant + Pi harness |

纪律：**禁止** P0–P2 未稳并行铺插件目录长串队员；**禁止**为 Pi 推迟地基。

---

## 10. 附录：对 PRD 的补丁建议（本文为 Track A 真源；**不**自动升版）

以下与 v0.2.4 **无硬冲突**，仅建议日后 PRD 小改时可吸收：

1. §4 竞品表可加一句：「New API 能力进 L1 用量/渠道从简；完整多租户计费仅 P4 评估。」（正文 §10 已有，表可对称。）  
2. §6.1 二层列表可显式写「MCP·Skills·提示词 = 单一写回模块（CC Switch∪Magpie Library）」，防实现拆成两页。  
3. §8 可加「安装 UX 学 LocalAI Gallery：显式体积、可取消、引用保护」三条验收子弹。  
4. 非目标已够；若需更硬，可补「不引入 Bun 作为网关插件运行时（Magpie 插件模型一期不照搬）」。

**不建议**因本文单独 bump PRD；能力争论以**本文**为准，产品冻结句仍以 PRD 为准。

---

## 11. 引用

- Tagma PRD v0.2.4：`/workspace/tagma-prd-2026-10-15.md`  
- 共识：`/workspace/packgate-consensus-2026-10-15.md`  
- LocalAI 深研：`/workspace/packgate-localai-research.md`  
- Magpie README：`/workspace/magpie-src/README.zh-CN.md`  
- New API：https://github.com/QuantumNous/new-api · https://www.newapi.ai/  
- CC Switch：https://github.com/farion1231/cc-switch  
- LocalAI：https://localai.io/docs/overview/

---

*Track A 交付结束。与 Track B（Magpie 1:1 + CIS）并行关系见 `/workspace/tagma-dual-track-plan-2026-10-15.md`。*
