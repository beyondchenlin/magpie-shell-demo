# last-cycle
- tip: v0.1.194 CIS_NATIVE_BASELINE_AND_SHARED_CONTROLS
- WHY: 用户要求继续全量 CIS 对照，不一致继续处理。
- CAUSE: 多版本基础 CSS、浮层首次挂载死锁、窗口/视口坐标混用、语言监听提前卸载、路由旧结构。
- WHAT changed: 六份同源 CSS + cis-guard；统一菜单、图标、复制、归档；路由条件/编辑恢复；五种语言接线并分块；手机 zoom=1，Routing max560 挂到原生容器。
- WHAT kept: SIDE_AT=1024、稳定窗口、320ms 原生曲线、mock 后端边界、PR → 临时预览。
- Checks: build/chrome-guard/cis-guard pass；lint 59 warnings / 0 errors；52 组布局检查 + 修复后 13 组手机复测；语言/菜单/规则/复制深态，见 interactions/web-cis-0.1.194。
- Next: docs/CIS-AUDIT.md 中的确认框、Agent 深层模型管理与其他已知未验收项；不以本 checkpoint 宣称全应用完成。
- Ship: PR #1，不合并 main、不打 portable/exe、不发布生产环境。
