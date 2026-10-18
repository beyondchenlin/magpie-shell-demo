# dev.17 早期配置库启动热修复

2026-10-18。dev.16 把本项目最早 schema1/application_id0 的配置库判作 INCOMPATIBLE_VERSION，首页仍显示加载中。本批修复严格历史识别、安全迁移及首页错误状态；正式原生可用性验收尚未完成，P0/P1/P2 不标整体通过。

## 修复与数据边界

最早 7f5c5fb 建库 SQL 是独立 fixture 的来源。识别仅接受精确表/约束/对象、闭合早期 JSON、有效修订和外键；未知结构、额外对象、异常 JSON 等保持拒绝。先完成原库备份和验证，再在 1→2 事务内写 TAGM 身份及配置 UUID，随后执行既有迁移。backup 后和事务提交后真实子进程退出的恢复测试保留原 JSON 与配置身份。没有使用删库、重置或宽泛接收任意 application_id0 绕过问题。

真实默认库只做此前必要的只读 metadata/schema 核对；未修改用户数据库、凭据或独立 preview/data。前端在配置读取失败后结束 loading，显示错误及重试入口；没有新外观重做。

## 验证证据

- startup-final 3、migrations 12 加修正 fixture 后 migration-negative-final 1、initialization 6、config 10，共 32 个不同 Rust 测试通过。初始 migrations 日志包含 1 个 fixture 构造失败，原失败证据保留，不把那次运行说成全绿；忽略项不计通过。
- ui-source 27 项通过，范围是源码/SSR/模拟桥接；ui-lint-json 无诊断，既有 Clippy、fixture check 和 TS/Vite/NSIS 构建结果已保存。不替代原生页面操作。
- 隔离正例曾迁移并出现首页/网关 ready 文字状态；截图 FrameArrived 超时，点击 coordinate input geometry is unavailable。保存、切页、重启新增实际通过数 0，物理拖动仍未确认。电脑控制故障未修好，本轮不重试。

证据均在 [evidence](evidence/) 的 HOTFIX-S01-* 文件。没有因本轮整理重建或重复整套测试。

## 固化交付

[Tagma_0.2.0-dev.17_x64-setup.exe](D:/demo1/tagmaai-deliveries/0.2.0-dev.17/Tagma_0.2.0-dev.17_x64-setup.exe)，6629799 字节（约 6.32 MiB）；SHA256 155c0f26ff3d5617867ca6ddcc6c1d1fcbf316ab33a241184c597dbcf022cc0c。目录附 BUILD-MANIFEST.json 与安装说明.txt。内部未签名 debug，config10/usage2/protocol1；没有运行安装器，也不宣称已更新用户安装。

构建来源 HEAD 7485c244e1b59a14531fadab3c0ca5564d482822 加原有 dirty 工作区。冻结记录采集于构建期间，不能冒充构建前快照；本轮逐项重核 304 文件无变化。7-Zip 只流式解包到内存，未执行 EXE、未创建解包目录。宿主和 sidecar 均 AMD64/GUI，NSIS 安装器自身为 x86 stub。

包内宿主 SHA256 73dd93f2ec85df0473c9b8c251b79e233c04a675d5a69083722ab200caa5320e；与原宿主仅偏移 15372704–15372706 的 UNK→NSS 三字节差异，唯一 bundle 标记替换后的完整文件一致。sidecar SHA256 e8d0ab53e4a5c92e33fa98fc9e0648a94cfcdb577b80a9dd77f76f0919e0e67a，与构建输入完整一致。见 package-verification.json 和 delivery.json。

## 调度与收尾

按用户最新要求保持 tagma-prd、magpie-cis 暂停；Windows 任务名称/动作路径未找到项目匹配项，未修改其他项目调度。正式后续顺序仍是完成 P0 原生交互及启动/恢复出口，再进入 P1/P2/P3，不能因打包通过跨阶段。

复用现有工作区、依赖及构建，无新 worktree/运行环境。固化包及清单新增约 6.4 MiB；本轮未删除文件或声称净释放空间。保留 dev.17 交付目录、原 target 构建和 HOTFIX-S01 证据；隔离 fixture C:/Users/ai/AppData/Local/Temp/tagma-hotfix-s01-d01972fd-b495-478e-8b54-af7eedbbfe47 保留待后续核验进程/锁后收尾，不清理用户资料。
