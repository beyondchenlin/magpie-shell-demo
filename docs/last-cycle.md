# last-cycle
- tip: v0.1.193 NAV_WINDOW_GEOMETRY
- WHY: 用户明确要求继续 1:1，消除导航折叠时 Web 外框额外缩放。
- CAUSE: side-nav 决定预览宽高，与原生 layoutNav 保持 OS 窗口尺寸的行为不同。
- WHAT changed: 窗口尺寸仅按视口选择，标题栏始终横贯窗口；更新 CIS / TIP-CYCLE / chrome-guard。
- WHAT kept: SIDE_AT=1024；752×652 紧凑 / 1100×720 宽窗上限与字号约束；320ms 曲线；设置/网关修复。
- Checks: chrome-guard/build/lint pass；18 次切换窗口/标题栏矩形不变，九次收起后滑块对齐；125% 字号、390px phone 无横向溢出。详见 interactions/web-frame-0.1.193/NOTES.md。未采集 FPS。
- Deferred: routing tip extras / GroupEditor、led-tools-extra、oauth；全应用不宣称已完成 1:1。
- Ship: PR #1 → 临时预览，不合并 main，不打 portable/exe，不强制生产部署。
