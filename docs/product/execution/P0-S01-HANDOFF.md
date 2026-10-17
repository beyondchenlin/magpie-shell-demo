# P0-S01：原生宿主与配置服务交接

状态：本切片验证通过，P0 整体未通过，release_blocked。2026-10-17，唯一执行者两遍自查，未使用子代理。

用户路径：原生 Tauri 2 窗口 → 产品三页 → 供应商表单 → 版本化受限命令 → 共享 Rust 应用服务 → SQLite/系统凭据库 → 确认后的版本与界面。旧 Electron 演示构建与存储独立。

## 交付与验证

- `tagma-core` 无 Tauri 依赖，配置 revision 事务、CRUD/排序、expected_revision 冲突、schema 拒绝、维护/凭据锁及 journal 恢复；秘密不进入配置 DTO/数据库/错误。
- `tagma-desktop` 仅本地 main 窗口列举命令，异步工作线程调用共享服务；无 shell/fs/raw SQL 插件。应用身份 `com.tagmaai.desktop`。
- 三页复用 CIS app.css、TextBtn/WordsField/Tick/LibSwitch/Segs/PrefRow；真实空态；未开放推理/队员/进程控制不假成功；Web 预览无本机命令。
- Rust 单源 ts-rs 12.0.1 DTO，contract:check 无漂移。Tauri 2.12.4/CLI 2.12.3，依赖由 Cargo.lock/package-lock 锁定。

设备：Windows 10 Pro 10.0.19045 x64、i7-12700KF、RAM 32 GiB、Rust 1.98.1 MSVC、Node 24.14.0、WebView2 155.0.4283.60。debug 开发宿主，不是发行包。

| 边界 | 实际结果 |
| --- | --- |
| Rust 故障集成 | 6 通过：重启/CRUD/排序、双入口冲突、凭据锁定/SQL失败、journal恢复与补偿失败、未来schema/维护锁、输入/协议边界 |
| 系统凭据库 | Windows 显式测试 1 项通过；UUID 合成秘密，Drop 精确清理该引用，不扫描真实凭据 |
| 产品构建 | build:tagma、contract:check 通过；oxlint src/product 无诊断 |
| 原生 UI→IPC→SQLite | tagma-native-smoke.mjs 7 检查通过：原生空配置、表单提交、脱敏DTO、协议拒绝、并发冲突、编辑保留、刷新版本；无 mock bridge |
| CIS 保留 | chrome-guard全通过；cis-guard六份同源样式通过；不替代产品视觉验收 |
| 全仓 lint | 0 error；旧代码既有 warning 保留，产品新增 warning 已修复 |
| 原生图形 | sky 可访问性确认真实窗口/版本；截图连续超时停止路线，改 WebView 调试协议验证；外观仍待验 |

原生测试由调用者提供独占临时目录，仅合成配置、无 Key。debug-only TAGMA_TEST_CONFIG_DIR 支持隔离，release 忽略；CDP 由测试进程环境显式启动，正式配置不启动调试端口。没有上游请求、付费或外部消息。证据见 evidence/P0-S01.json。

## 两遍自查

第一遍需求/用户路径：核对空态、CRUD、忙态/错误、翻译覆盖和编辑冲突。修正开关 payload 多传 has_credential 会被后端拒绝的问题，确保取反；编辑器固定原 expected_revision，刷新不盲目覆盖。保留 zh/en/zh-TW/ja/de，后三种新增文案明确英文回退。

第二遍架构/安全/发布：核心不依赖宿主；凭据先 journal，只清有记录的无引用孤儿；旧引用保留。命令异步避免阻塞窗口；未来schema拒写；能力白名单；产品不读演示业务存储。修正指定不存在UUID会被当作新建，限制供应商128。确认 sidecar/AppProfile/安装/签名缺失，不把本批记作 A01–A07 全过。

## 故障及限制

- registry search schannel 握手失败→停止相同搜索；最小 curl sparse config TLS返回200，Cargo sparse 下载/构建成功。仅定位搜索API路径异常，未确认更深根因；未关闭TLS。监督反馈已闭环。
- 缺 icon.ico→自有T字矢量图经官方 icon 命令生成后通过。
- exe 被本任务测试宿主占用→核对唯一PID/绝对路径/开始时间后停止本实例，再构建通过。未停止其他应用。
- sky 截图两次失败→停止；只读可访问性成功，原生开发协议完成实际UI/IPC验证；不声称像素对齐。
- has_credential 仅表示有引用，不是凭据可访问或上游健康。请求前必须读取凭据设施。
- 历史已引用凭据暂保留；运行时/在途保留契约完成前不回收。无 AppProfile、网关生命周期/鉴权/推理/用量/Pack。

下一批 P0-S02：真实独立网关空配置、私有IPC/身份版本握手、受管/独立所有权、固定端口冲突、就绪与退出；补 desired/effective 实例确认，不提前扩大上游协议。
