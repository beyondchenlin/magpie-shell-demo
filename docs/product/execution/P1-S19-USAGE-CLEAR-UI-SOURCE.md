# 清除确认、目录身份与本机缓存围栏（源码范围）

2026-10-18，接续ae28bac，候选仍dev.16/config schema8/usage schema2。新增本机main窗口限定命令、清除预览/确认界面及有界本地核实状态。本批没有操作桌面、调用真实WebView命令、更新用户dev.9、读取真实凭据或访问真实上游。拖动仍未通过；A16/A28/P1未整体通过。

## 目录身份与命令

core metadata、清除plan、两种分页游标现在都带规范化目录的SHA256身份，与私有manifest.config_id算法相同。相同日期/数量/修订/代次的另一个目录也不能使用旧plan或游标。此身份绑定目录位置，不是可跨移动保持不变的数据库UUID；目录更名/人为替换数据库不等于无条件恢复旧确认。

metadata只读，不初始化/迁移库；runtime复用唯一受限reader。native增加usage_context、prepare_usage_clear、clear_usage，检查协议和本机main窗口，固定Application.directory；管理操作仍走唯一writer/私有IPC。没有任意路径参数或数据面管理路由。build、invoke和三个生成permission与main capability静态核对/编译通过，未实际调用native命令。

schema2存储形状不变。为避免此前源码版本保存的无context_id历史回执阻塞新清除，精确识别旧schema2回执形状并在当前已知owner目录中只读补充身份。未知/重复字段、无效时间/计数拒绝，不改写原JSON；**新输入的未绑定plan仍拒绝**。这是已知回执读取兼容，不是对任意旧客户端/游标的兼容承诺，也不自动恢复备份。

## 确认界面与不确定结果

继续使用CIS PrefRow/TextBtn/WordsField和现有有界滚动dialog，公共CSS未改。清除日期独立于查询筛选，默认最近30个已结束UTC日，最多366日；先由真实管理服务给出日期/数量预览，再由用户确认。界面明确范围包含所有供应商/模型/小队，逻辑请求的全部尝试可跨日级联；日桶按各自开始日删除，范围外桶保留。核实编号、精确数量、已确认/未确认范围均可查看。

提示清除是逻辑删除，迁移备份/WAL可能保留历史元数据且不会自动恢复；配置、凭据、会话正文不在范围。取消只撤销尚未发送的预览。确认后结果未确认时保留同plan，只有用户明确点击才核实同一次请求，没有自动重试或重新生成新删除范围。记账恢复使用既有严格recover_usage确认，不能当作清除成功。

用户也可明确结束核实并读取当前代次；这个动作只改变本地核实记录/读取metadata，不发送新清除，不把原请求说成已撤销或成功。原plan继续标为unresolved并可查看范围；后续新清除仍须重新预览/确认。原操作的晚回执若最终到达，按真实回执更新围栏。

## 核实状态与缓存

首次metadata读确认目录后，按该身份使用版本化localStorage键，仅保存最多8192字符的floor、pending及最近未确认plan；无请求正文、密钥、查询结果缓存或费用。新清除必须先成功保存本地核实意图再调用native，保存失败则本次发送0。核实状态损坏/未知版本/超限保留原值并阻断新清除，不自动擦除或变成空成功。

清除开始即废弃当前查询代次、列表和详情；确认回执后保存精确最低代次。每次接受请求、汇总、详情时重新核对身份、最低代次及是否仍有pending；旧回复不能回填。floor用BigInt比较十进制字符串，不经Number舍入。重挂载从metadata及本地记录取较高floor，不自动发送清除。StrictMode effect重放共享同一个只读bootstrap promise，清除动作仅位于事件处理器。

清除请求离开页面后仍可将收到的真实回执保存到本地；合并最新状态时只移除同操作的pending，较旧控制器不能删除后来新建的pending或降低floor。UI状态回调在dispose后停止。浏览器持久化实际落盘/断电保证尚未平台验收；本批只验证Storage接口模型，**SQLite持久回执才是操作结果真值**。不把localStorage说成与数据库同一事务，也不宣称已验证WebView2崩溃持久性。

## 两轮自查及验证

第一轮沿身份、清除前持久意图、迟到结果与重挂载检查，补齐plan/游标目录绑定，拒绝同代次跨目录复用；保存失败0发送，确认失败保留pending，最低代次与不同目录隔离。复查发现旧schema2回执需要精确读取兼容，已补上不改写原记录/拒绝未知字段的综合用例；修正一个AppError不能直接映射Display的编译失败，原输出保留。

第二轮按已读React技能检查异步所有权、语义控件/标题/alert/status、modal取消及焦点恢复、有界记录和纯渲染。初次lint指出render内Date.now和effect同步重置，改为事件时验证及重试事件重置，没有关闭规则。已有modal max-height/overflow适用于长范围说明；这只是源码核对，不冒充现场布局/键盘验收。

| 范围 | 结果 | evidence/P1-S19- |
| --- | --- | --- |
| 最后core用量相关 | 20通过，2个child helper忽略不计；含读取/失败/备份/真实退出/身份及旧回执 | core-last.txt |
| runtime私有清除 | 2个综合用例通过，新增错误context拒绝；clear17负例/3正例，preview6负例/1正例 | context-ipc.txt |
| gateway相关 | writer6、usage2、usage_clear1通过；最后受影响writer6/clear1复验，不累加 | writer-final.txt、live.txt、live-final.txt |
| 源页面/模型 | 15通过：原7 + 新8，包括本地意图、存储失败、重挂载、晚回执并发合并、显式结束核实、错误回执、目录/floor、CIS静态HTML | headless-verified.txt |
| native/Clippy/DTO | native编译及三项静态权限通过，workspace全target Clippy/DTO一致性通过 | native-first.txt、native-capabilities.json、clippy-final.txt、dto-check-final.txt |
| 前端/CIS | TS/Vite、7文件116规则零诊断，六CIS原样通过 | frontend-verified.txt、lint-verified.txt、cis.txt |

实际sidecar用例继续证明过去合成历史被清除、当天3条真实HTTP配置2/token2/1保留、忙不取消上游、丢回复后同plan取原回执；现在还断言plan/metadata身份与私有manifest一致。页面源码测试使用明确假API和内存Storage，只在node静态渲染，不是浏览器/native点击链路。所有复验不累计为新增测试。

复用原target/node_modules，无新worktree/环境/安装包；测试TempDir关闭worker/子进程后回收，无本批新残留，内存Storage不接触真实WebView资料。用户目录、原验收证据、旧小fixture及审批拒绝删除的文件继续保留。空间计划0.1GiB，后段剩余0.04GiB，盘前后见plan/manifest，差值含并发写入，不宣称释放空间。

## 剩余

真实native IPC/DOM事件、键盘/视觉、WebView持久化、目标平台安装与自由拖动未验；软预算/额度展示和完整容量矩阵仍待完成。继续独立非UI工作，不因此放行A16/A28/P1或安装候选版。
