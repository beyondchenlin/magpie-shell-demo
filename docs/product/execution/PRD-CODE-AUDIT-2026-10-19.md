# PRD 与当前代码进度核对

2026-10-19。依据 PRD v0.3（含 §11.1 外部历史导入）、执行基线、HEAD `102ef9c` 及当前 dev.40 未提交产品差异。不是全量重新验收，也不是正式发行通过声明。

## 结论与统计口径

技术架构及阶段顺序符合 PRD；执行节奏曾偏重 P0 安装器边界，完整用户功能推进不足。P0-S23 已补更新前配置兼容检查与配置目录维护协调，应保持 P1 → ReachFlow P2 → P3 的主线，不继续扩展无已知缺陷触发的安装器专项。Pi 是独立工作包，当前基础对话没有内置 Pi 循环。

P0–P3 工程实现粗估约四至五成；这只是按四阶段等权、P0 约九成/P1 约七成/P2 约两成/P3 尚无完整交付估算的范围，不是工时、代码行、测试数或验收通过率。包含 Pi 或 P4 的“全产品”不能套用该数字。准确阶段状态为：1 个本机适用阶段收口、1 个主阶段实现及验收中、1 个只有准备层、1 个尚无完整交付。正式发行阶段尚未放行。

| 范围 | 源码与现有证据 | 状态/剩余 |
| --- | --- | --- |
| P0 底座 | Tauri/CIS 三页；真实供应商 CRUD、排序、凭据引用、离线保存及重启恢复；sidecar 所有权；原生焦点/拖动/托盘；故障恢复；更新只读前检与维护锁 | 本机内部适用主路径已收口；平台及发行环境门槛保留。见 P0-S11–15、S23 |
| P1 供应商与对话 | ProviderCatalog → ProductApp 选模型 → ChatView → Tauri service → 网关；dev.40 修复试调用未携带模型，加入编辑后重试 | 本机受控 HTTP 上游的原生检测、流式、停止、401、编辑后手动重试及用量已验；真实远端服务未验 |
| P1 小队 | TeamsPanel 草稿/发布/版本启停；核心 immutable recipe；网关 manual/sequential、first_cloud 与固定模型；有核心/HTTP 测试 | 完整原生创建→发布→选用→顺序执行→用量尚未验完；不可只凭按钮和后台测试标交付 |
| P1 协议、安全、用量 | OpenAI Chat Completions 子集、SSE/工具转发、取消/超时、鉴权/撤销、快照及用量恢复、软预算；curl 8.13.0 外部进程有版本绑定证据 | A08–16、A27/28 要汇总剩余适用场景；curl 证据不等于任意 Agent 兼容，既有分层通过项不重复跑 |
| P2 ReachFlow | packs 有 manifest、签名/解包/空间、prepared 发布与检查代码 | prepared 明确不是 installed；尚无安装/健康激活/运行/更新/卸载完整业务链；市场仍显示未安装 |
| P3 CLI/Skill/MCP | 共享 Rust 核心和既有 HTTP 接口可复用 | Cargo workspace 只有 core/runtime/gateway/desktop；尚无三入口完整交付。curl 验证不计官方 CLI 完成 |
| Pi 与历史导入 | PRD CHAT-02–05/A29 已定义只读快照、Tagma 独立续聊、不回写原 Agent | 未实现 Pi 循环、持久会话及外部历史适配。ChatView 当前仅窗口内 React 状态 |
| P4 | PRD 未来服务器范围 | 未交付，不属于当前 P0–P3 估算分母 |

## 最新可体验变化与证据边界

dev.40 工作区产品差异为 ProductApp、ProviderCatalog、ChatView 和版本文件，尚未作为产品提交归档。`.cache/p1-s33-native-flow/build40.log` 记录构建完成；`upgrade40.json` 记录隔离候选升级与配置不变。`baseline-wrong-model.json` 保留旧版本试调用选错模型证据。

同目录 `catalog-success.json`、`selected-target-model.json`、`normal-completed.json`、`stopped.json`、`auth-failed.json`、`auth-retry-draft.json`、`retry-send.json`、`usage-read.json` 与三张 native 截图记录原生操作。用量截图是当时的四请求切片：成功2、失败1、取消1，已知输入16/输出8但总体 token 未知；不能当作此后累计总数。当前 upstream 日志另有后续请求，本审计没有重新派发或推断其操作者。

受控本机上游确实经过实际 HTTP、网关和原生窗口，但回复为合成内容，不证明真实模型智能、远端供应商健康、计费或 Pi 工具执行。普通安装与旧预览未随隔离候选自动升级，用户打开旧入口时不会看到全部最新变化。

## 剩余执行顺序

1. 完成当前 P1 原生小队完整流程，补实际发现的功能缺口；把 dev.40 差异与证据归档，提供清晰可体验入口。
2. 汇总 P1 验收余项，按实际缺口补原生操作、安全与用量恢复的必要验证；复用已通过的核心/HTTP/外部 curl 证据。真实远端调用单列条件，禁止拿本机合成上游代替。
3. P1 适用出口收口后完成一个 ReachFlow 队员从安装到调用、取消、更新、卸载的完整产品链。停止提前堆叠只有底层准备态的切片。
4. 完成同核心 CLI、Skill、MCP 入口，再按 PRD 独立切片实现 Pi 持久会话与外部历史只读导入续聊。

环境条件：真实远端模型凭据/测试预算；真实凭据设施锁定或不可用的隔离 OS；实际 OS 减弱动效切换；干净 Windows/缺 WebView；签名；macOS/Linux 平台矩阵。macOS 优先首发仍是 PRD 要求，Windows 内部验证不能代替。

本次只读核对代码/记录，新增本审计并更新执行状态入口；未跑安装器或重复验收，未创建工作树/依赖/任务。实查 tagma-prd、magpie-cis 与 RUN-BINDING 为 PAUSED，未修改调度。
