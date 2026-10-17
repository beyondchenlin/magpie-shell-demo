# TEAM-03 自动选脑接线（源码候选 dev.12 / schema6）

2026-10-17：本批按授权只做源码、文件和无窗口检查。用户安装仍保留 dev.9/schema3；没有读取或操作窗口、截图、拖动、安装或迁移用户配置。拖动验收维持未通过。本记录仅对应 TEAM-03/A14 的局部实现与证据，不代表整个 A14、P1 或发行通过。

## 最终行为

小队可使用 `first_cloud`，步骤通过严格的 `{kind:"brain"}` 引用本次固定的脑。历史 `{provider_id,model_id}` 显式目标 JSON 形状保留；explicit 与 manual 行为继续沿用。已发布配方不可变，修改草稿或发布 @2 不改裸 ID 对应的第一个版本。

默认按全局供应商顺序、再按各供应商模型顺序选择。启用状态、配置身份代次、最近五分钟内的真实文本推理成功同时合格才可选；目录存在、失败、过期、未来时刻及落盘未确认均不足以选用。目录查询及被拒绝的调用不发起上游探测或静默重放。没有候选返回 503 `NO_AVAILABLE_BRAIN`，模型目录不列出当前不能执行的自动小队。

新增持久化 `first_cloud_order`：历史配置默认 `{kind:"global"}`；`{kind:"default_app",profile_id}` 表示明确不用全局脑顺序，改用这个默认 App 的供应商范围及其有效顺序。储存列表仍用于管理已配置供应商，不被当作另一条隐含选择序。App 可跟随全局排序或用独立排序，模型仍按供应商模型序。空/缺失 App 范围直接无候选，不越界回到全部供应商；全局序没有合格候选也不擅自转用 App。受限原生 `save_first_cloud_order` 经相同核心服务保存，使用 expected_revision；所选 App 不能直接删除。UI 源码通过现有 CIS ModelPick 让用户明确选具体档案，不默认代选第一个 App。

运行时先有界读取健康事实，再在同一有效配置读锁下解析一次 brain、供应商、模型、凭据及配置修订。健康队列须已确认，读取前后及最终固定计划时复核 epoch；单个阻塞读取许可随 worker 持有，等待许可 250ms、读取等待 500ms，调用总预算包含读取时间。固定后的步骤不因重排或健康变化重新选脑，只影响后来的调用。

## 数据保护与 UI 范围

schema5 的旧 writer 会丢失新增顺序来源，故候选升为 schema6/dev.12，复用已有受锁迁移、WAL 一致备份与 journal，历史快照字节不改写。5→6 保留健康记录和配置修订，旧快照默认全局。没有对用户库执行迁移；本批没有生成或安装新原生安装包。

前端源码补齐自动/固定选脑、步骤脑引用、无候选提示、App 顺序来源以及供应商引用联合类型。沿用 PrefRow、Segs、ModelPick 等 CIS 组件；未改公共 CSS 或原版 App.tsx。TypeScript、Vite、oxlint、DTO 与静态 CIS guard 通过，只证明源码/构建范围，不是点击、焦点、键盘、缩放、深浅主题或实际外观验收。原生命令只允许本地 main 窗口，宿主通过 Clippy 类型检查，未运行原生 UI。

## 实际命令和结果

命令均在 `D:/demo1/tagmaai`，复用现有 MSVC/Rust、Cargo registry、target 和 node_modules；Rust 使用 `--locked --offline`。原始 stdout/stderr 保留为小型 `.txt`，源码及产物指纹见 `evidence/P1-S08-manifest.json`。

| 命令 | 结果 | 原始记录 |
| --- | --- | --- |
| `cargo test -p tagma-core --locked --offline -- --nocapture` | lib 28 通过/3 子进程 helper 显式忽略；配置 10 通过/3 显式忽略；顺序来源 1、小队 7 通过 | `P1-S08-core.txt` |
| `cargo test -p tagma-gateway --locked --offline -- --nocapture` | 单元 9、first_cloud HTTP 1、旧推理 HTTP 1、生命周期 12、小队 HTTP 1 通过；2 显式忽略 | `P1-S08-gateway-regression.txt` |
| `cargo test -p tagma-gateway --test first_cloud --locked --offline -- --nocapture` | 最终 fixture 收尾修正后定向 1 通过，未累计为额外用例 | `P1-S08-first-cloud-http-final.txt` |
| `cargo clippy --workspace --all-targets --locked --offline -- -D warnings` | 通过，包括宿主 IPC 和测试；ts-rs 对 enum deny_unknown_fields 的已知宏提示仍存在，Serde 严格解析测试通过 | `P1-S08-clippy-final.txt` |
| `cargo run -p tagma-core --example export-contract --locked --offline -- --check` | DTO 一致 | `P1-S08-dto.txt` |
| `npm run build:tagma`、指定修改文件 `npx oxlint ...`、`npm run chrome-guard`、`npm run cis-guard` | TypeScript/Vite/lint/原版 chrome 与六 CSS 检查通过 | `P1-S08-frontend.txt` |

原生安装、Computer Use、真实付费上游、系统凭据专项、保留旧二进制专项均未运行；忽略项没有计入通过。

源码与说明的 Git whitespace 检查通过。原始工具输出中的宏提示自带行尾空格和末尾空行，保留原样；未为通过格式检查改写原始日志。

真实 HTTP 用例启动独占无窗口 sidecar 与受控 loopback 服务：目录成功不可发布；实际调用成功后可发布执行；模型/供应商重排与默认 App 自定义/空范围生效。两步请求暂停时分别重排配置并制造原模型鉴权失败，旧步骤仍固定 `b/b1`，并行新请求改用 `a/a2`；另一次只改健康时新请求改用 `a/a1`，旧调用仍 `a/a2`。旧 manual 已发布配方保持原值。测试还持有自有 SQLite 写锁，证明 pending/落盘失败时旧 ready 行不能绕过确认；释放写锁也不会自行清除未确认，新的成功观测才恢复。过期场景仅回拨自有 fixture 健康行的时间戳，不改变系统时钟、不等待五分钟。严格 TTL 边界、未来时刻、失败优先和代次替换另由核心测试验证。不是仅用选择器单测代表 HTTP 行为。

开发中先修正 Clippy 的可合并 if，再修正测试 u64→SQLite i64 转换；首次 HTTP 运行错误地期待把上游 401 原样返回，实际既有网关协议为 502/UPSTREAM_AUTH_FAILED，已纠正断言，未放宽产品处理。那次断言失败遗留的合成 Temp 目录 305,793 逻辑字节已做精确路径、Temp 边界、重解析点、进程引用、近期写入及独占打开检查后回收，清单见 `P1-S08-fixture-cleanup.json`。最终测试补 catch_unwind 收尾，断言失败也先停止自己拥有的 sidecar，再释放 TempDir；成功测试未遗留同前缀目录。

## 尚未通过的边界与收尾

本批覆盖文本 manual/sequential 的自动脑选择。供应商目录探测/无需生成计费内容的复检、完整能力协商、真实供应商矩阵、Local Brain 健康队员、原生 UI 验收仍未完成；A14 保持局部实现/未整体通过。P0、P1 和 release_blocked 均不改变。没有把纯选择器通过当作整个 A14 完成，也没有把构建当作用户已看到变化。

未新增 worktree、clone、运行环境或下载。目标与临时盘起始 C47.70/D16.45 GiB；最终磁盘记录见 manifest。复用缓存做有界检查，预计新增低于 1 GiB；保留源码、少量必要证据及可重建 target/dist-tagma，无大文件副本。磁盘差包含并发写入，不报告为本任务净占用或净释放。用户 `D:/demo1/tagmaai-preview/data`、`webview` 和 dev.9 安装继续保留；此前被自动审批拒绝的旧版本及旧 Temp 删除没有重试。
