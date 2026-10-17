# P0-S03 App 配置档案

基于6e618ef；候选0.2.0-dev.4、IPC1/schema2。PROV-03配置存储与原生管理切片，不表示P1外部客户端接入或模型路由已完成。

全局默认档案由供应商全局序投影，固定UUID且不可删除。自定义App档案有UUID、名称、目标App文本、供应商ID引用及跟随全局/独立排序选择。跟随时按全局序筛选所选供应商；独立时保留自己的顺序。两个方向均不改写另一方，档案不复制凭据。历史snapshot缺少profiles时读取为空，原历史文本不重写。

保存/删除走共享Rust事务、operation锁及expected_revision。过期编辑保持输入并返回CONFIG_CONFLICT；未知供应商、重复引用、超额列表或伪造全局档案被拒绝。删除供应商时后端检查自定义档案引用并返回PROVIDER_REFERENCED；原生确认框列出名称/目标App并禁止提交，先修改或删除档案方可继续。上限64个自定义档案、每档案128个引用。

验证：配置集成8通过（含新增2项，覆盖系统凭据条目不增加、排序分离、跟随传播、重开恢复、引用阻止与解除、过期/非法编辑不创建修订）；真实Tauri原生8项通过，结果P0-S03-profiles-native-corrected.json，截图在同名目录。最终revision8到达独立网关effective，退出完成。并非mock bridge，也未调用外部上游。

截图复核发现首次驱动的通用click选择了关闭的另一个dialog中的“取消”，导致真实模态仍在而DOM直点继续；首轮P0-S03-profiles-native.json及截图因此不作为UI验收通过证据。已将click限定当前打开dialog/可见按钮，并新增模态关闭及编辑器退出断言，纠正轮全部通过。旧文件保留，禁止把首轮的passed字段单独引用为有效结论。

产品TypeScript/Vite构建、产品oxlint、DTO生成和核心/runtime/gateway/desktop全部targets的Clippy -D warnings通过；六份CIS stylesheet及原壳chrome guard通过。新增界面仅用现有CIS控件和产品布局样式，未修改冻结样式或继承dirty。检查到desktop既有三处Clippy可折叠条件并按等价形式修正。

两轮任务独占fixture在finally核验进程引用、重解析点、文件锁及稳定根目录后回收，各约10.6MB逻辑数据；结果与一张必要截图保留。未新建worktree、环境或下载依赖。旧清理审批拒绝目录保持原样；默认用户配置和现有证据未删除。正式签名/干净机器/其他平台/托盘关闭路径仍未通过，网关端口与鉴权持久设置继续实施。
