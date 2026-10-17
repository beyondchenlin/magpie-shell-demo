# P0-S03 配置 schema 1 → 2

基于7cfb5a5；候选0.2.0-dev.4，IPC1/schema2。此页只记录迁移切片，不宣称P0或发行升级门槛通过。

配置写入端先释放自己的共享维护锁，再尝试排他锁；其他桌面/网关仍持锁时返回MAINTENANCE_IN_PROGRESS，不停止无所有权实例。运行端只读，schema1明确拒绝，不执行建库或迁移。未来schema及未知schema0继续拒写。

迁移只接受带TAGM application_id与预期表集合的已知旧库。排他维护锁内先原子发布拥有者及UUID明确的迁移journal，使用SQLite online backup复制一致状态（包括已提交WAL），quick_check、schema/revision和SHA256核验后，才在单个事务内增加config_metadata并升级user_version。原历史snapshot文本不重写。备份文件使用唯一名称，禁止覆盖未知文件、链接或Windows重解析点。

schema2增加本配置库UUID，为后续凭据命名空间及配置档案提供稳定身份。AppProfile与持久网关设置尚在实现；历史配置的新增字段将由版本化读取默认值补齐，不伪造新历史修订。

备份后失败或进程中断保留schema1、journal及一致备份；重开按拥有者/hash/revision校验后继续。schema升级事务已提交但journal尚未归档时继续完成归档，不再重复升级。若源revision与记录不符则拒绝覆盖。备份及完成journal保留在该配置目录backups/，属于恢复资料，不当缓存清理。迁移后的新写入不能通过直接换回旧数据库回滚；人工恢复前必须先保全现库及WAL、展示新修订差异并明确选择恢复点。尚未提供自动回滚UI。

验证（本机Windows）：

- 核心lib：14通过，3个仅子进程入口忽略；其中迁移4项覆盖WAL一致备份/历史字节、失败重试、只读端与维护锁、备份后真实进程退出91的恢复。
- 真实dev.3可执行文件测试1项通过：旧网关ready后，新manager拒绝版本，配置写入端拒绝迁移，旧进程仍存活且未生成迁移journal；关闭拥有的stdin后旧进程正常退出，迁到schema2并启动新网关读取revision0。
- 旧版fixture测试首次缺少旧程序要求预先存在的maintenance.lock，子进程exit12，未进入握手；补齐冻结旧环境条件后通过。不是把模拟manifest当成真实旧二进制结果。
- 核心/runtime/gateway全部targets的Clippy -D warnings通过。既有配置integration6项及初始化故障恢复在schema2变化后已复验通过；完整原生UI/包安装待后续切片一起重验。

复用已有target/Cargo registry；没有安装依赖环境、下载二进制或新建worktree。前置空间C49.45GiB/D28.93GiB。真实旧二进制仍保留在忽略目录.cache/tagma-version-fixture-dev3，5,144,064逻辑字节，SHA256 9bb354063d5949c39fd4a09aac57cd25888bd0782ba771ab1ae2a83d59baf51a，负责人执行者，2026-10-24复查。测试临时目录由tempfile持有并回收。旧批量清理被自动审批拒绝的目录按既有台账保留，不重试。
