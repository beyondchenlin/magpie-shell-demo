# P0-S03 持久端口与本机访问令牌

基于c6c485a；最终候选0.2.0-dev.5，IPC1/schema3。源码/PRD/宿主/sidecar SHA256与验证范围记录在evidence/P0-S03-gateway-settings-dev5.json。P0及发行门槛仍未全部通过。

## 行为

网关端口、鉴权开关及凭据引用与供应商/App档案共用不可变修订、operation锁及expected_revision。端口为1–65535，默认9168；修改后现有进程保留原地址/effective修订，返回RESTART_REQUIRED，用户停止并启动或重新打开后读取保存端口。无所有权实例不能被停止；不暗换端口。

新桌面正常首次启动默认开启鉴权，通过系统随机源创建32字节随机令牌，hex编码后放系统凭据库。SQLite仅存引用。写前journal、提交后移除journal，失败补偿和崩溃恢复与供应商秘密一致，历史仍引用的令牌不会提前回收。已有引用但凭据丢失不会静默新建替代；启动明确报CREDENTIAL_STORE_UNAVAILABLE。无法使用凭据库没有明文后备。

普通ConfigView只显示port/auth_enabled/has_access_token。显示/复制是受限桌面命令的显式动作；显示30秒后隐藏，修改设置或离页清除显示状态，复制必须得到剪贴板成功结果。令牌不进业务localStorage、诊断、SQLite/WAL或应用日志。当前仅初始化，不提供轮换/撤销按钮；P1持久撤销记录未完成前不能宣称A11/DATA-06已通过。

数据API以加载到内存的有效快照做鉴权，缺失/错误/重复Authorization返回401，有效Bearer使用恒定时间比较。显式关闭鉴权只影响loopback数据API；管理仍是每用户私有IPC，数据令牌不能停止网关。当前模型推理尚未接入，有效鉴权后明确503 UNSUPPORTED_CAPABILITY，不冒充上游调用。

## 版本保护

schema3同时版本化gateway JSON合同，防止旧schema2程序忽略新增鉴权字段后写回。1→2、2→3分别在排他维护锁下用online backup做含已提交WAL的一致备份/hash核验，保留历史snapshot原文及库UUID。兼容旧1→2未完成journal，先恢复再继续下一步。schema2档案与UUID迁移后保留，旧schema1/2程序面对3拒绝读写。schema3常规入口也核验TAGM应用标记和合法库UUID。

恢复材料保留backups/schema-N-UUID.sqlite3及完成journal；不自动清理，不宣称任意降级可行。迁移后新写入须先保全并展示差异再选恢复点，暂无自动回滚UI。损坏/未知记录和未知数据库始终保护拒写。

## 验证

- 最终dev.5：core lib16、配置integration10、gateway unit4、真实进程integration9通过；child-only入口及显式OS测试默认忽略。指定OS令牌+HTTP用例1通过，含凭据丢失明确错误/不替换；真实dev.3 schema1及dev.4 schema2二进制分别验证版本拒绝、活动锁阻止迁移、拥有的正常退出、升级及旧程序拒绝新schema。
- 最终原生网关10项通过：正常默认令牌、显示/隐藏、missing/wrong 401、valid 503、设置表单、原地址/effective保留、降级停止、无测试端口覆盖的真实重启使用保存端口、显式兼容模式及脱敏。结果P0-S03-gateway-settings-dev5-native.json。原生复制令牌未单独验证，不算该项通过。
- 最终原生主路径16项通过，结果P0-S03-dev5-full-native.json。均为真实宿主/WebView/IPC/SQLite/独立sidecar，嵌入资源，无mock bridge，不隐藏控制台掩盖问题。两个PE仍为GUI(2)。产品构建/oxlint、DTO check、四个Rust包全部targets Clippy -D warnings、CIS guard通过。
- 开发中进程回归暴露两处问题：新启动前的旧残留manifest被提前当作新版本冲突；有所有权的Stop响应残留原配置错误。已按发布前后manifest区别及接受Stop时清除旧错误修复，相关进程测试重新通过。
- 首次原生网关驱动未等待UI轮询确认所有权，过早点击禁用的停止按钮而失败；未修改产品权限/等待策略来凑通过。驱动增加可见且启用确认后，schema2候选10通过，版本升级后dev.5又10通过。所有失败与中间候选证据保留，不能替代最终dev.5证据。

## 资源与后续

复用原workspace/target/Cargo缓存，未新建worktree、依赖环境或下载。测试独占Temp目录，终于退出后核验进程/链接/文件锁，再由开发辅助程序按fixture receipt及库引用精确删除合成系统凭据（每轮1条），不枚举凭据库；最后回收文件。三轮约9.5/18.7/18.7MB逻辑数据均回收，主路径约10.6MB回收。全盘并发写入存在，逻辑数据量不等于磁盘净释放量。

为真实旧程序测试额外保留忽略目录.cache/tagma-version-fixture-dev4-schema2，5,257,728字节，hash fc67db241aafb87be3aa18a13093846c9dae2bed6c7ea145f5a25ed76cb10cc5；来源为schema升级前实际dev.4候选。与dev.3 fixture合计约9.9MiB，负责人执行者、2026-10-24复查，不进Git。之前被自动清理审批拒绝的6个旧目录按台账保留，不重试。

磁盘最近C49.24GiB/D26.40GiB；沿用原target峰值预算，未全量复制。继续P0启动性能/键盘焦点/关闭到托盘及适用安装门槛。签名、干净机器、macOS/Linux和真实上游等外部条件仍未满足；不发布、不推送、不宣称P0完成。
