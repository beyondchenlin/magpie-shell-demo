# 自设软预算规则核心（未接报告/UI）

2026-10-18，接续2fed994。内部源码候选仍dev.16，**config schema9/usage schema2**；未打包/安装，实际用户仍dev.9。规则只作观察目标，不参与授权、派发、重试、收费或硬限制，不读取平台余额。A16/A28/P1未整体通过；禁止电脑控制、拖动未通过、真实资料保护持续有效。

## 规则与存储

最多32条，包含规范UUID、120 UTF-8字节内名称、UTC日/自然月、一个或两个正整数限额（次数/token）。限额以十进制字符串保存，支持超过JS安全整数直至i64MAX；0、前导零、小数、指数、负数及溢出拒绝。不能用浮点数存预算或把未知余额设为0。

范围支持全部上游尝试、供应商UUID、供应商+实际模型、小队公开ID。前三者按实际尝试口径，小队按逻辑请求及其步骤总用量；不相加成全局消耗。小队匹配第一版tagma/slug或后续精确@n，不接受不存在的@1或非规范版本。历史供应商/模型/小队目标可保留，不因从当前配置移除而丢掉历史观察规则；预算引用不当作推理依赖或凭据引用。

ConfigService新增save_budget/delete_budget，复用operation锁、expected_revision与不可变业务修订事务；保存失败原规则/修订保持。规则进入共享snapshot和ConfigView，读取与提交都校验数量/身份/字段，损坏规则不默默变空。没有新用量写入或凭据操作。

## schema9保护

v9阻止旧程序重新保存时丢失预算字段，沿用排他maintenance锁、SQLite一致备份、hash与可恢复迁移记录；8→9只推进schema，不改写历史snapshot或业务修订。旧JSON缺budgets按已知空默认读取，新保存才写入新修订。数据表布局仍与v8相同，已知owned对象数9；初始化提交后恢复保留7/8/9三种staging证明，不放宽未知库识别。旧v7安全迁移测试仍专门检查7→8单步，新增8→9备份检查另行覆盖。

内部版本号在源码切片期间保持dev.16，证据绑定具体commit/schema/hash；不能仅凭这个版本串判断发行候选相同，也没有宣称此候选已更新到用户安装。

## 两轮自查与验证

第一轮核对限额精度、名称字节/控制字符、规范UUID、公开ID版本、32条上限、未知ID更新/删除、重复ID和不同统计口径。凭据后端测试桩对所有访问计数并拒绝，预算CRUD/重开/失败后的访问总数仍0；预算操作不创建usage.sqlite3。中间SQL提交故障保留原revision0/空规则，明确重试只创建一条。

第二轮检查schema与其他路径：8→9保留原revision0字节及一致schema8备份，默认规则为空、新revision1才含目标；旧schema7/8及新9的真实exit90 staging恢复检查通过。验证预算字段默认/校验不破坏既有凭据补偿、撤销、模型健康和小队契约。此轮没有加入报告、额度条、native命令或预算UI，不能用核心规则测试冒充这些已完成。

| 检查 | 结果 | evidence/P1-S20- |
| --- | --- | --- |
| core完整 | 78通过，8显式忽略不计：lib55/5ignore、catalog1、config10/3ignore、first1、security4、teams7 | core-first.txt |
| 新规则/迁移 | 规则3、8→9综合迁移1；已包含上行 | rules-first.txt、core-first.txt |
| runtime完整 | 6通过 | runtime.txt |
| 实际headless gateway相关 | usage2、clear1、revocation_faults1、security1，共5通过 | gateway.txt |
| workspace全target Clippy、DTO、TS/Vite | 通过，原有ts-rs属性提示保留 | clippy.txt、dto-check.txt、frontend.txt |

原CSS/TSX无变动，不重复视觉或源码页面用例。无真实凭据、付费调用、桌面操作、安装、发布、worktree或新环境。自有小TempDir和worker/子进程退出后收尾，最后本批预算fixture前缀无残留。既有target/node_modules、证据、用户预览/资料、旧fixture及审批拒绝清理文件保留。附加峰值计划0.05GiB，末段0.03GiB；盘前后见plan/manifest，含并发写入，不宣称净释放。

下一步实现同一读事务内的周期观察报告和main限定命令，再接CIS软预算编辑/展示。只显示保留登记口径、已知/未知token与自设限额；实际平台余额/账单保持未知，不产生虚假剩余额度或硬金额封顶承诺。清除历史会影响保留记录统计，仍需明确呈现。
