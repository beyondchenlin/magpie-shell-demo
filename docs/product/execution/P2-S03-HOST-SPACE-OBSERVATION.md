# 安装预检的真实卷观察

2026-10-18，接续175fef7；候选dev.16/config10/usage2。SPACE-S03定向历史编译产物回收在启动前被blocked by policy拒绝，250文件全部保留，未通过Cargo或另一方式重试。本批只复用当前小缓存，不下载依赖/完整构建/安装/修改卷/清理用户资料，也不控制桌面。

S01空间算术现在有真实宿主输入：observe_pack_space要求目标和Temp目录已存在，先canonicalize并确认目录，Windows沿GetVolumePathNameW得到卷根，再GetVolumeNameForVolumeMountPointW取卷GUID，按身份判断同卷，不靠盘符/字符串路径；GetDiskFreeSpaceW读取分配单元，fs2 available_space读取实际可用字节。分配单元必须512B–1MiB的2次幂，失败保持不可确认，不猜值或换盘。相关API定义已在实际windows-sys0.61.2源码和[卷根官方文档](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getvolumepathnamew)、[卷GUID官方文档](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getvolumenameforvolumemountpointw)核对。

ObservedPackSpace私有构造/无JSON反序列化，返回规范目标/Temp路径与计龄；space()超过2秒拒绝。第一轮自查发现若在查询结束才打时间戳，慢查询会把过时值冒称刚观察，已改从整个查询开始取单调时刻。可用空间只是当时观察，安装仍须在实际写入前重新测量；它不是预留quota，也没有将S02低层stager自动放行成完整安装器。Unix按statvfs分配单位及metadata dev写了源码，未编译/运行对应目标，不算macOS/Linux通过；Windows本批只验证本机NTFS，网络/ReFS/卷别名或挂载变化不冒称已覆盖。

第一遍验证：同卷两个真实Temp子目录识别为同卷/单位一致/可用空间正数/返回规范路径；缺失路径不创建、文件输入不改为目录，原文件保留。观察过期使用私有测试时刻模拟3秒，不睡眠制造耗时，确认space()拒绝旧容量。

第二遍验证：显式绑定本机C:/D:用例单独标ignore，实际以--ignored运行1通过；普通运行的忽略不算成功。新常规3+显式1共4个不同用例通过，core全target Clippy -D warnings通过。实际观测D可用9921134592、C可用45918621696字节，两者卷身份不同、分配单位均4096字节，未做文件写入空间压力/真实安装。C/D条件只属于这个显式夹具，不写成任意Windows机器的盘符假设；其他已过Core/ZIP不重复计数，也未重跑无关前端/宿主/网关。

FFI只调用同步只读文件系统函数，使用已初始化并有NUL边界的自有UTF16 buffer，输出长度检查；不读取窗口/进程UI或调用桌面控制。测试唯一写入是task独占TempDir及target下空夹具、一个很小的输入文件，函数本身只读；收尾tagma-space-observe-*在C/target均0，正常RAII。未查看或修改真实预览、凭据、Pack服务/发行根。

计划新增峰值0.03GiB，C约42.77/D9.24→C42.76/D9.24GiB，盘差含并发/缓存不是任务峰值/净释放。D<10GiB持续暂停预计>1GiB操作；旧250文件与此前拒绝的预览/Temp全部保留，源码/当前依赖/target/node_modules/dist/旧证据和用户dev.9/data/webview保持，无新worktree/环境/自动清理。源/PRD/日志绑定见evidence/P2-S03-manifest.json。

A17及P2整体未过。继续持久准备记录/同卷不覆盖原子发布/进程退出恢复，只有后续真实健康和运行契约就绪才能激活，不把“解压文件存在”当作可调用。P0/P1门槛、电脑控制禁令和用户拖动未通过状态均不改变。
