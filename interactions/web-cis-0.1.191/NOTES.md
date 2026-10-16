# v0.1.191 浏览器验收

日期：2026-10-16，Windows / Codex Chromium 浏览器，本机 production build，110% 文字大小，假数据。

## 已检查

- 900、1048、1364px：Agents / Providers / Gateway 各执行展开再折叠，等待 `.nav-morph` 清理后测量；九组滑块的 x/width 均等于当前 `.on` 按钮；无根框横向溢出。
- 1048px 设置：语言完整显示；字体两列 grid 同排；搜索在预览框标题栏内；设置分区可切换；键盘 ArrowDown 从常规进入额度；菜单有六个语言选项。
- 网关 Connect 可收起/展开；收起头保留地址；“网络与共享”进入对应设置分区；空模型列表使用 `provider/model`。
- 390px：phone-web 模式、无页面横向溢出；设置语言完整；网关保留五组连接字段。
- 浏览器控制台未收集到 error。未调用真实网关，也未进行 Mac 原生点录。

## 构建检查

- `npm run chrome-guard`：通过。
- `npm run build`：通过；保留现有大 chunk 提示。
- `npm run lint`：通过（现有仓库有警告；本轮修正受控 setTab 的依赖项）。

## 证据与限制

本目录只保存受影响页面的 JPEG 截图，不复制历史基线。导航坐标检查以过渡完成后的 DOM 测量为准。

本轮接入既有 View Transition 动效并消除布局测量时序问题；没有采集帧率，顺滑程度仍需用户在原 Chrome 环境查看确认，不宣称跨平台性能验收完成。
