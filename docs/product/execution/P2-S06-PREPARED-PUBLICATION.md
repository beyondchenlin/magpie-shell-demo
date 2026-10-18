# 完整目录的准备态发布与重读

2026-10-18，接续87e5a7f；候选dev.16/config10/usage2。新增PreparedPack持久准备层：完成的私有解压目录与原始签名记录、配置UUID、操作UUID、平台及规范有序文件树放入同一个私有外层目录，记录create_new并sync，最后复用现有同卷no-replace原子发布。目录名prepared-UUID是发布提交点；此前tagma-pack-preparing-*不视为完成。drop不删除已发布准备目录。没有installed/active标记、配置写入、进程执行或活动版本指针，不能称安装器已完成。

输入树须与解压时的实际索引/全部隐式目录/大小及读取解压字节同步计算的SHA256一致，拒绝同长度篡改；不是只比较总大小。原本归档文件仍在成功解压后回收，没有为了发布复制ZIP或整树。移动失败保持原私有根清理生效，无跨卷copy fallback；新外层TempDir只负责本次材料，失败/取消回收。提交点之前再次检查取消，之后即使取消也返回已完成准备，避免把已提交操作报失败而重放。

重读是只读：根/载荷/记录拒绝符号链接与Windows reparse，目录恰好payload+prepared.json；记录最大8MiB，流读每64KiB检查期限/取消，树反序列化在第10001项拒绝，规范路径/排序/类型/数量/字节受签名资源限制。记录必须闭合字段、owner/配置/操作UUID和目录名一致，按当前根和时间重验原文签名，再真实遍历、逐文件重hash并比较完整树。文件使用已开句柄检查常规类型和单硬链接；Windows GetFileInformationByHandle失败即拒绝。未知/损坏/过期/不完整记录保持原样，不扫描删除或自动恢复为活动版本。低层调用者仍须提供应用私有父目录、真实配置身份与新鲜磁盘预检；目前未接ConfigService或UI。

第一轮自查/测试：真实小ZIP发布后关闭值再重读，UTF-8内容与原文SHA保持；错误配置、空信任根、过期拒绝。发布前后同长损坏、额外文件、未知installed字段拒绝且保留证据。已有未知目标碰撞不覆盖；记录sync后取消只回收新暂存，原活动/成果哨兵保持；提交后取消仍返回成功。两个真实子测试进程分别exit91（sync后rename前）和exit92（rename后），不靠panic/unwind冒充崩溃。前者仅留不可调用私有准备目录，reopen拒绝且保留；后者完整准备可重读。父测试的独占根在最后回收所有新材料，没有接触用户安装。

第二轮自查补充：外部实际硬链接被已开句柄link count拒绝；8MiB+1记录在读前拒绝；实际C→D移动失败且两处新目录回收，原哨兵不变。64KiB树读取缓冲共享、不按递归深度重复分配；目录深度受240字节路径及实际条目上限约束。8MiB记录新增后，空间计划的固定元数据预留从1MiB升到16MiB并验证同卷/双盘缺口，避免沿用旧低估。新5常规+旧7=12通过，跨卷显式1通过（另一ignored子进程helper不计通过），Pack11通过，共24个不同用例；core全target Clippy -D warnings通过。未重跑无关网关/原生UI或全平台构建。

原始失败保留：首次编译发现本仓Uuid未启serde，改为闭合字符串并显式解析/规范UUID，没有为此改依赖特性。随后cap-std未公开Windows by-handle link trait，改用已有windows-sys真实文件句柄API；一次into_std遗漏的编译错误也保留。空间测试一处仍写旧1MiB预留而失败，修正为16MiB后的明确字节断言；没有改fits或降低余量。最终日志分开，失败不冒充验收成功。

边界：记录文件树hash用于发现本地损坏，不是发行者额外签署的树；同OS用户同时改写记录与载荷的攻击不由该层防御。此层不返回可调用句柄，后续运行/激活仍需完整信任与健康流程。不声称断电/全平台文件系统持久性已验；真实process exit只证明相应提交边界。没有自动枚举/修复未完成事务、更新任务固定旧版、健康/激活、真实ReachFlow发行公钥或服务契约，A18仅开始局部证据，A17–20/P2仍未通过。

依据：[GetFileInformationByHandle](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getfileinformationbyhandle)的返回值/已开句柄语义；[MoveFileExW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw)的目录必须同卷及不使用copy/replace选项。已对照本机锁定windows-sys0.61与cap-std4.0.3源码。

本批空间初估新增峰值0.15GiB，复用现有target/锁文件和缓存，无新依赖/schema/环境/worktree。前C46.01/D26.18GiB，后C46.3/D30.57GiB；盘差受外部并发影响，不作为本任务净释放或峰值。新临时/工作区fixture前缀均0，250拒绝文件仍250存在/身份大小mtime全同、不重试清理。保留源码、必要失败/成功日志、已有缓存/证据及用户dev.9/data/webview；电脑控制禁令与拖动未通过保持。
