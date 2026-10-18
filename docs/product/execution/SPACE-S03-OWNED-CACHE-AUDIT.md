# 历史编译产物盘点与拒绝记录

2026-10-18。P2-S02后D9.24GiB，盘变动超过最初0.20GiB估算（含并发/缓存），先暂停扩大编译并只读核对可回收本任务产物。cargo clean帮助确认支持dry-run；core/dev两次不同verbosity只显示fingerprint细项和2563项/约1.5GiB汇总，不能据此假称它列出了全部实际文件，也没有执行Cargo清理。

为保留当前P2库和第三方依赖，缩小为target/debug/deps下早于2026-10-17T22:40Z的历史core测试exe/pdb与rlib/rmeta；按tagma-core fingerprint hash、.d中的core源码归属关联，不按temp/old名称猜测。完整绝对路径、用途、字节数、元数据身份与归属来源在SPACE-S03-candidates.json。250个文件，逻辑1036742470字节；本机D=NTFS，Node/libuv stat blocks*512按dev/inode去重已分配1037139968字节，250独立身份，边界外硬链0。这个分配统计不是承诺净释放量，未计文件系统元数据/COW/并发变化。

前检确认D:/demo1/tagmaai/target/debug/deps及祖先无重解析点、无target或Cargo/rustc/link/rustfmt进程，逐文件长度/mtime/重解析/独占读写锁无问题，近期仅本任务已结束验证的当前缓存排除。计划仅对清单中的普通文件用单一PowerShell与LiteralPath删除、保留源/当前cache/依赖/主程序/安装包/用户资料/验收证据及此前拒绝目标，不做递归目录删除。

执行工具在创建PowerShell进程前被自动审批以blocked by policy拒绝；**0文件删除，250文件全部保留**，没有发生可报告的本任务净释放。SPACE-S03-result.json留存拒绝及后续约束；不再改用Cargo/另一shell/手工逐项删除绕过该拒绝。两次只读诊断Node筛选未找到deps路径，是Cargo dry-run输出未包括deps实项所致，随后用fingerprint/.d直接关联完成真正清单；没有把空筛选当成文件不存在。

新增/保留worktree0/0（当前原工作区继续），无新环境/定时清理服务。安装dev.9、预览data/webview和旧证据保持。继续已授权源码与严格有界小缓存验证，预计>1GiB增长仍暂停；不能因拒绝宣称已释放空间或停止全部非UI实现。
