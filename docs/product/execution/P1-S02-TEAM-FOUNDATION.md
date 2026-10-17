# P1-S02 小队基础存储与发布校验（开发候选 dev.10/schema4）

本批在用户禁止电脑控制后仅修改源码、运行非UI测试。已安装并供用户体验的dev.9/schema3保持原样；没有打开/读取/激活任何窗口，没有运行原生UI驱动，也没有将用户数据库升级到schema4。

采用EXECUTION-BASELINE已记录的DEC-02：slug本机唯一，裸tagma/slug永久固定修订1，后续使用@2等，无latest漂移。新增Rust配置服务草稿保存/删除、内部不可变发布、逐版本启停；供应商删除检查草稿和所有已发布历史引用，停用或改草稿不解除历史引用保护。可执行网关和前端入口是后续接线，此批不宣称小队已能调用或出现在models中。

配方含内部UUID、显示名、脑、手动/顺序策略、显式cloud_model/pack步骤、原始消息/上步文字输入、输出用途、每步及整队预算、中止失败策略和可见副作用。当前支持发布校验的脑为显式最终回答模型；手动要求唯一步骤，顺序允许显式中间模型，最后步骤匹配所选脑。权限由已验证cloud步骤派生为OutboundModelRequest，不接受请求自填额外权限。first_cloud缺健康时间契约、Local Brain和pack未安装、intent未实现时允许保存有界草稿但拒绝发布，不假称依赖可用。

约束：slug为2–64 ASCII小写/数字/内部连字符，拒绝reachflow/local-brain保留名；最多32小队、每队16发布版本、8步骤，单步/整队1–120秒，发布时步骤预算之和不超整队预算。禁止tagma/云目标以避免小队递归，未知字段拒绝。已发布版本内容不经任何输入API改写；enabled_revisions分开控制可用性。草稿可缺依赖或未补齐步骤，publish_issues明确返回缺口。

schema4版本化新增JSON合同，防止旧写入器不识别teams后静默丢数据。3→4沿用维护排他锁、在线一致备份、journal及恢复；新增测试验证schema3库/原快照字节/配置身份保全及schema3备份，历史1/2迁移和中断恢复回归通过。没有接触真实预览库或做静默降级。

非UI结果：核心lib19通过/3个child-only忽略，原配置集成10通过/3个显式OS凭据fixture忽略，小队集成最终6通过；工作区all-targets Clippy -D warnings、生成DTO、TypeScript/Vite和产品oxlint通过。新增用例覆盖裸ID/@2不可变、过期编辑、slug冲突、未就绪依赖、顺序流/预算/副作用、字段拒绝和历史引用删除保护。

一次加强测试发现Serde内部tag的unit型first_cloud仍忽略未知字段，改为空struct变体后严格拒绝通过；未把首次失败计作通过。ts-rs对enum deny_unknown_fields给出已知宏告警，不影响Serde运行时；两个enum另外显式指定TS tag与命名规则，生成TypeScript和严格反序列化均已验证，没有关闭全局告警或删掉严格限制。

本批Temp仅Rust tempfile持有的独占合成库，由Drop回收；没有真实凭据读写/收费请求/新环境/worktree。复用target/node_modules/缓存，最后只读磁盘C48.39/D22.28GiB，不把并发变化当作本任务净占用。用户禁止电脑控制继续有效，后续只做非UI执行引擎/HTTP测试，前端验收待重新授权。
