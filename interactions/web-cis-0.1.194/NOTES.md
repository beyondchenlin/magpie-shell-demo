# v0.1.194 浏览器与同源验收

固定参考：yetone/magpie 63be477；2026-10-16。复用既有依赖、工作区与 4173 preview，无额外工作树。

- app/routing/library/plugins/sessions/context 六份 CSS 经归一化 LF 后 SHA-256 校验；清单 docs/cis/source-manifest.json。
- 900/1048/1364/390px，六个主页与七个设置分区，共 52 个布局场景。首次发现 390px Routing 溢出；窄屏标记挂到 #rt，并按原生浏览器逻辑令手机 zoom=1，返回桌面恢复保存的文字大小。之后 13 个手机页面/分区全部复测无横向溢出。browser-checks.json 保留初次失败与最终复测，不覆盖失败证据。
- 设置实际切换 Deutsch / 繁體中文 / 日本語 / 简体中文，标题与 html.lang 一致，选完菜单关闭；额外词典独立 chunk。字体菜单首次可开，zzzznone 只剩 Refresh，字体控件仍两列 grid。
- Codex 标题模型菜单、路由添加模型/条件菜单、Agent 专用模型列表均首次打开；浮层挂 #root，缩放后仍在窗口边界内。协议菜单方向键可换焦点。
- 路由添加两个模型、添加图片条件，删除 intent 后图片条件仍在、classifier 隐藏、焦点回到 +；保存后 Edit 仍保留图片规则，没有根据数量伪造规则；没有 button 嵌套 button。
- 深色设置与字体菜单、深色 Gateway Copy 成功/1200ms 复位截图已保存。截图不含真实密钥；API 地址为演示回环地址。
- 专用后台临时标签用于验收，避免与用户正在看的页面混用。URL fixture 启用 mock 数据，不是实际服务调用；未测试真 OAuth/订阅额度、原生 Mac 或 FPS。
- 后续深层确认框与 Agent 模型管理继续检查，不能将此记录标成全应用 1:1 PASS。
