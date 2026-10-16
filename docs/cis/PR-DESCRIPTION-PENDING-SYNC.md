**同步状态：本地交付尚未进入本 PR diff。** 远端 HEAD 已通过认证连接器确认仍为 `e19fd5a8a0c346192d3d2cd6552160eabbab350c`（v0.1.196）；本地 UI 为 v0.1.206，交付文档提交为 `504d6333deedbd14bbffd9c720ce16ef0ff585b1`。2026-10-17 本轮一次正常 Git push 在 schannel TLS 握手阶段失败，未关闭证书校验或强推。以下描述本地待同步结果；不能把旧云预览称为 v206。

Magpie 壳在导航折叠、控件/弹层生命周期、设置和网关模板上存在实际偏差。本轮按固定 `yetone/magpie@63be477` 和冻结的 R01–R25 修复，并保留每个失败复现、源码版本和有限复验范围。

当前 UI：**v0.1.206 / `1ebfb663e4833e653bc621742cc342f3cdc7373a`**。文档/证据提交可以在它之后；本机4176通过 immutable Git archive 提供这个确切UI。继承的未提交词典/页面草稿不在构建中。

主要结果：

- 折叠保持窗口/标题栏大小，选中正文一致；thumb覆盖折行高度；Web过渡快照裁切到既有模拟窗口。保留320ms原曲线和原生正文快照策略。
- 共用菜单按用途保留焦点/提交/滚动/关闭行为；确认框修复遮罩拖出误关、Tab和返回焦点；完整模型管理mock状态可复查。
- 网关五API和SystemOne模板/复制失败反馈、供应商完整表单保存、路由条件/Library默认结构、图标失败回退及设置变体已按固定源核验。
- 六份原CSS哈希不变；473调用/34裸配方逐项分类，兼容层109规则有用途和来源。76静态状态按实际采集SHA和AST/Git差异复用，新增候选只补受影响记录。

验证：TypeScript/Vite build、chrome-guard、cis-guard通过；56文件lint55 warnings/0errors（继承59）；最终六主页面+Settings同候选，1364/1048/900及125%折叠检查；console空、无横溢出/破图/交互嵌套；39项任务偏好精确恢复。保留现有>500kB构建块警告。所有后端动作均为mock，未使用真实API/OAuth/插件命令/Key。

**验收26通过/0失败/3待验：N3监督独立动态观感、D2 PR/云预览身份、D4最终四重点用户观感。** 原三轮录屏与性能记录保留，不能仅凭参数/截图宣称顺滑或全量1:1。源码/浏览器验证不冒称原生Windows像素金标。

最新报告与唯一规则入口：`docs/cis/EXECUTION-STATUS.md`、`docs/REPLICA-ACCEPTANCE.md`、`docs/CIS-CONTROLS.md`、`interactions/cis-release-1ebfb66/NOTES.md`。

只更新本工作分支与既有临时预览流程；不合并main、不发布生产、不打exe/portable、不强制Vercel部署或升级套餐。用户4173/rootdist未动，未新增worktree或依赖环境，必要历史证据/恢复资料保留。

