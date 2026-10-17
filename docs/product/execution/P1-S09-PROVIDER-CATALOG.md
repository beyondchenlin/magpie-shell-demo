# PROV-02/04 非生成检测与目录（dev.13 / schema7 源码）

2026-10-17，本批只做授权的非 UI 开发、文件和无窗口测试。用户 dev.9 安装、data/webview 未动；未读取窗口、截图、拖动、重装或运行原生 UI。A08、A14、P1 及发行门槛均未整体通过。完成此切片后继续其他独立 P1 工作，不等待桌面验收。

## 协议与最终行为

当前唯一协议为 OpenAI 兼容文本协议。本批实现手动触发其声明的 `GET <base_url>/models`，不会自动扫描全部供应商、发起生成探测或静默重放。不支持该目录端点（404/405/501）时明确需要按预算手动试调用；不把任意自定义供应商的 GET 宣称为已经核验收费政策的免费接口。真实供应商仍未访问。

检测区分 DNS/网络、TLS、连接/响应超时、401/403、429、上游 5xx、目录协议错误、取消和成功。HTTP 状态、开始/完成时间独立记录，错误正文和密钥不保存。200 只表示此目录端点请求成功，不能证明生成接口鉴权或真实推理成功。格式错误仍由既有保存校验拒绝。真实推理中的上游 404 保持 `UPSTREAM_MODEL_UNAVAILABLE`，不会误报成目录协议不支持。

目录记录原始上游 ID、来源 `discovered: GET /models`、原始观测时刻和严格五分钟缓存过期状态，与显式配置的模型清单及真实推理事实分开。目录返回不自动修改配置或健康成功时间；“用目录编辑”只填入编辑表单，须显式保存才转为配置。旧目录可保留供查看，但失败/过期明确标记，不能当作调用保证。

每个供应商配置代次持久化检测间隔：成功后至少 30 秒；失败从 60 秒逐级退避，最多 5 分钟，不自动重试。重启 sidecar 不绕过间隔。全局最多两个检测任务，私有控制通道仅登记/取消，仍保留两秒帧预算；检测网络过程独立运行，总预算 6 秒、连接 2 秒、正文空闲 2 秒，无代理和重定向，禁止 reqwest 重试。响应最多 256 KiB、128 个 ID、每 ID 256 字节；解析/存储还约束转义后的目录 JSON，避免合法短 ID 经转义突破 64 KiB 存储上限。

开始时固定当前有效 provider、凭据及修订，持久化入场再次核验 desired revision 和连接指纹；结束只接受同代次、同 request_id、仍为 Pending 的结果。URL/凭据引用变更或删除供应商会清理其目录；在途旧结果不能写到新连接。配置/模型重排不清除同代次退避。

目录写入与健康消费者共享 epoch 和确认状态，Pending/落盘未知时不借用旧 ready 行。目录失败的负面事实单独保存，不把它伪装成推理失败；自动选脑只接受比该负面事实更新的真实推理成功。随后目录成功不消除先前推理失败或把旧推理重新变成合格。取消/不支持目录不是一次推理失败。中断遗留的 Pending 在恢复围栏内转为 Cancelled，避免 UI 永久只能取消旧任务。未知落盘结果保持未确认，不声称成功。

## IPC、UI 源码及数据

受限本地 main 窗口新增 probe_provider / cancel_probe，经同一 GatewayManager 私有 IPC；数据 API 没有检测管理入口。原生宿主类型检查通过，没有实际点击验收。供应商页源码新增 CIS PrefRow/TextBtn 目录检测区、取消、来源/时间/冷却、缓存展开、用目录编辑和手动试调用入口；沿用共享行结构，未改公共 CSS。手动试调用只导航到对话，不自动发请求。键盘、焦点、布局、缩放、主题、可见安装与真实供应商留待授权验收。

新增 `provider_catalog` 元数据表，候选升级 schema7/dev.13，保护旧 writer 不识别的事实。复用受锁迁移和 WAL 备份；6→7 测试确认保留 schema6 备份与配置修订。没有迁移用户库。目录变化不生成业务配置修订，快照/密钥继续按原契约保护。

## 两轮自查

| 轮次 | 实际发现和处理 | 证据 |
| --- | --- | --- |
| 第一轮：边界与生命周期 | 修正健康读取逐模型重复查询目录；目录事实一次映射；阻塞 worker 持有任务许可；取消/退出共享健康 epoch，未知写入不确认。补 Pending 恢复、代次切换、两任务上限及重启退避 | health 模块新增确认测试，catalog HTTP 实际私有 IPC/重启/取消，unclean 回归 |
| 第二轮：时间、存储和界面语义 | 观测时间在网络返回后立即捕获，写入不重记时；拒绝已完成结果重放与旧代次写入；约束转义 JSON 体积；目录成功文案限定“仅此端点”；5xx 单独归为上游服务错误；CIS 行直接作为 list 子节点 | 核心 catalog 时间/代次用例、parser 转义上限、真实 HTTP 负面事实/恢复/模型404、TS/Vite/oxlint/CIS guard |

首次扩展网络用例假定关闭本机端口必定立刻 connection-refused；本机实际产生 Timeout，产品分类正确、测试假设错误。保留失败原始输出，改用明确接受后重置的本机 TCP 服务验证 Network，未放宽断言或禁用 TLS。初轮 Clippy 的嵌套 if 已修正。各次原始日志均保留，不累计重跑为新增用例。

## 原始命令和结果

全部 Rust 命令使用既有工具链、`--locked --offline`，没有下载/复制环境。

| 命令/范围 | 实际结果 | 原始证据前缀 P1-S09- |
| --- | --- | --- |
| `cargo test -p tagma-core ...`（同批早期完整检查） | lib28/配置10/目录1/顺序1/小队7通过，6显式忽略；后续相关范围补验如下 | core.txt |
| `cargo test -p tagma-core --lib --test catalog --test first_cloud --test teams ...` | lib29（含新增6→7）/目录1/顺序1/小队7通过；3子进程helper显式忽略；不重复累计 | core-final.txt、storage-verified.txt |
| `cargo test -p tagma-gateway --bin tagma-gateway --test catalog --test first_cloud --test inference --test teams ...` | 单元10，目录HTTP1、自动脑HTTP1、旧推理HTTP1、小队HTTP1通过 | gateway-final.txt |
| 最终 `cargo test -p tagma-gateway --test catalog ... -- --nocapture` | 13种目录/传输结果、取消实际关闭上游、重启退避、两任务上限、代次隔离、自动脑拒绝、实际上游模型404通过（一个综合用例） | catalog-final.txt |
| `cargo test -p tagma-gateway --test process_lifecycle unclean_health_ ...` | 仅受影响异常退出2项通过，其他12项未重跑 | unclean-regression.txt |
| `cargo test -p tagma-runtime --lib ...` | parser1通过，覆盖形状、原始ID、重复、控制字符、数量/ID/转义后体积 | parser-final.txt |
| workspace Clippy + 最后相关三个crate Clippy | 通过；ts-rs已知严格serde宏提示仍存在，未去掉严格解析 | clippy-verified.txt、clippy-last.txt |
| DTO `export-contract -- --check`；TypeScript/Vite/oxlint；CIS guard | 通过；最终前端也已复验；静态 guard 不代替 UI 验收 | dto.txt、frontend-verified.txt、frontend-final.txt |

目录 HTTP 测试的网络请求全部为独占受控 loopback。检测阶段只有 GET；三次生成请求均是测试代码显式发起的本机合成推理，断言上游 POST 数正好为 3，没有自动生成探测、真实付费调用或密钥访问。元数据时间测试仅对自身 fixture 注入过期观测，未修改系统时钟。没有真实供应商兼容/收费承诺。

## 留存与继续工作

源码及原始结果指纹见 `evidence/P1-S09-manifest.json`。测试均在 catch_unwind 后停止确切拥有的 sidecar，再释放 TempDir；成功和失败均无同前缀残留。未新建 worktree、clone 或环境。保留少量源码/必要原始日志和可重建 target/dist-tagma；不清理用户资料、旧验收证据或此前被审批拒绝的旧版本/Temp。原始宏输出含空格，按原样保留，源码 whitespace 检查不据此改写日志。

开始盘点 C47.58/D15.69 GiB；中途 C46.91/D13.47，剩余检查峰值按 1.2 GiB 预留、复用 target 并缩小范围，计划见 space-plan.json。最终余量见 manifest，差值包含其他并发写入，不能称作本任务净占用或净释放。A08仍缺真实供应商、桌面与客户端矩阵；A14仍缺完整能力/真实渠道等门槛，P1/发行继续未通过。后续继续令牌持久撤销与用量等独立后台缺口，不以这次切片结束整个实施。
