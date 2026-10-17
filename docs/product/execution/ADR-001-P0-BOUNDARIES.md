# ADR-001：原生底座与配置事务

2026-10-17，采用；产品依据 PRD v0.3 与执行基线 DEC-01/02/03。

1. Cargo workspace 分 `tagma-core`（领域/应用/存储/契约，无 Tauri）、`tagma-gateway`（独立数据面）、`tagma-desktop`（薄原生宿主）。React 保留；产品入口与旧 Electron 演示构建分开，不读 `magpie.*` 业务数据。默认对话/供应商/市场，网关二层。
2. SQLite 保存 schema_version、不可变 revision 快照、desired revision、凭据操作 journal。`BEGIN IMMEDIATE` + expected_revision；提交后由特定网关 instance 确认 effective revision，不能由前端猜测。P0 未实现的能力明确不可用。
3. 秘密用 keyring 3 的目标平台原生 provider（必须显式启用 features，避免库默认 mock）。写入前持久 journal 和唯一引用，凭据成功后提交新快照；失败/崩溃只清理 journal 明确标记且无任何快照引用的孤儿。跨进程操作锁串行化 journal 恢复与写入；不长持 SQLite 事务等待凭据设施。旧引用先保留，未证明运行时/在途均不使用前不回收。
4. 每配置目录维护锁：常规入口共享；迁移/更新排他。第一版只初始化 schema 1，遇新 schema 拒绝写入；不臆造降级。未来迁移必须使用 SQLite backup API 保全 WAL 一致性，协调所有入口，不用裸文件复制。
5. Rust DTO 为单源，ts-rs 生成 TypeScript 并检查漂移。命令携带协议版本；错误只传稳定类别/可执行恢复信息，不传数据库/凭据库原始异常。保存是事务结果，取消等待不撤销已提交编辑。
6. 桌面只允许打包本地窗口的指定命令。管理 IPC 不挂 HTTP：Windows Named Pipe（当前用户权限、随机实例能力、版本/配置身份握手）；Unix Domain Socket 同用户权限。生命周期控制权是可验证实例所有权，PID 仅诊断。数据令牌不能管理；不向前端开放 shell/fs/raw SQL。
7. sidecar 同包，版本与目标架构一致；单配置目录原子实例锁，端口不自动更换，连接现有 standalone 不获得停止权。启动/退出/重启有界，管理与日志分离；未完成平台约束前不声称壳崩溃回收通过。
8. 首个真实协议仅 OpenAI Chat Completions 子集 `/v1/models`、`/v1/chat/completions`；Responses/Anthropic/Gemini 不列兼容。生成请求不透明重试。P1 再实现流/用量/撤销持久覆盖，不以 P0 空服务冒充推理。

核对资料（本批实现前读取）：[Tauri 2 Vite](https://v2.tauri.app/start/frontend/vite/)、[Rust commands](https://v2.tauri.app/develop/calling-rust/)、[sidecar](https://v2.tauri.app/develop/sidecar/)、[keyring 3.6.3 原生功能开关](https://docs.rs/keyring/3.6.3/keyring/)、[ts-rs 12](https://docs.rs/ts-rs/12.0.1/ts_rs/)、[rusqlite](https://docs.rs/rusqlite/)。实际依赖以 Cargo.lock/package-lock 锁定，不以 latest 链接作为构建输入。

首批选依赖：现有 Rust 1.98.1/MSVC；Tauri API 2.12.4、CLI 2.12.3（npm registry 实查）；Rust Tauri 2 系列由 Cargo 锁定。crates.io 搜索 API 出现 schannel handshake 错误，停止重复搜索，先用官方文档与 sparse registry 完成有界解析。未关闭 TLS 校验。
