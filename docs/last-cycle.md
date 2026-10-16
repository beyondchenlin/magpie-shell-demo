# last-cycle

当前UI：**v0.1.206 /1ebfb663e4833e653bc621742cc342f3cdc7373a**，本机4176。冻结028dab5规格，27通过/0失败/2待验；N3监督有限技术项已通过。Git正常推送读回6a6d47b、PR正文更新读回、Vercel自动部署success；D2因Vercel连接403不能实测受保护页面，D4用户观感待确认。build/TypeScript/两guard通过、lint55/0、六原CSS不变、39偏好恢复；未合并main/生产部署/打包。证据[当前候选](../interactions/cis-release-1ebfb66/NOTES.md)，完整进度[EXECUTION-STATUS](cis/EXECUTION-STATUS.md)。

WHY：按用户既定Magpie复刻范围关闭实际CIS偏差。CAUSE：共享菜单/确认框/模型状态、假供应商保存、图标失败、原生默认DOM与兼容层旧覆盖；最终发现Web过渡快照越模拟窗。WHAT kept：原320ms曲线、SIDE_AT1024、稳定窗、六同源CSS、mock边界。WHAT changed：逐批有限修复和SHA绑定证据；v206只加活动快照框内裁切。历史批次和未采集身份不追认，新候选只补受影响回归。

下文v194为历史记录。

2026-10-16阶段1说明：下列v194是历史UI交付记录。当前本机v195仍为继承脏稿，实际dist未绑定源码SHA；最新接管/规格状态看 [EXECUTION-STATUS](cis/EXECUTION-STATUS.md)，设计候选入口看 [CIS-CONTROLS](CIS-CONTROLS.md)。本轮文档校核不增加UI版本，不把历史Checks转成新候选通过。
- tip: v0.1.194 CIS_NATIVE_BASELINE_AND_SHARED_CONTROLS
- WHY: 用户要求继续全量 CIS 对照，不一致继续处理。
- CAUSE: 多版本基础 CSS、浮层首次挂载死锁、窗口/视口坐标混用、语言监听提前卸载、路由旧结构。
- WHAT changed: 六份同源 CSS + cis-guard；统一菜单、图标、复制、归档；路由条件/编辑恢复；五种语言接线并分块；手机 zoom=1，Routing max560 挂到原生容器。
- WHAT kept: SIDE_AT=1024、稳定窗口、320ms 原生曲线、mock 后端边界、PR → 临时预览。
- Checks: build/chrome-guard/cis-guard pass；lint 59 warnings / 0 errors；52 组布局检查 + 修复后 13 组手机复测；语言/菜单/规则/复制深态，见 interactions/web-cis-0.1.194。
- Next: docs/CIS-AUDIT.md 中的确认框、Agent 深层模型管理与其他已知未验收项；不以本 checkpoint 宣称全应用完成。
- Ship: PR #1，不合并 main、不打 portable/exe、不发布生产环境。
