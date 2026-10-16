# CIS：导航、设置与网关控件契约

适用基线：Magpie Shell Demo **v0.1.192**（2026-10-16）。本页记录已接线的组件和验收条件，不代表全应用 1:1 已完成。当前范围仍是复刻、沉淀 CIS 与可复用组件。

## 1. 同源配方，按用途选变体

| 场景 | 组件 / DOM | 约束 |
| --- | --- | --- |
| 设置行 | `PrefRow` → `.row.pref > .who + .val` | 原生 50px 最小行高、14px 间距；控件区保留 60% 宽度约束；长说明用 `.sub.wraps` |
| 分段选择 | `Segs` → `.segs > .opt + .thumb` | 22px 选项、2px 轨道内边距；值变化滑动，布局变化直接重新定位 |
| 语言等菜单 | `PrefPick variant="menu"` → `.sess-pick.pref-pick` | 若加 React 锚点，45% 上限不能重复作用在已经收缩的父子两层 |
| 字体 / 字重菜单 | `PrefPick variant="protocol"` → `.proto.pick` | 不附加 `.pref-pick`；`.font-controls` 始终使用原生两列 grid，预览独占下一行 |
| 设置分区 | `SidebarTabs` → `.nav-sub > .nav-s + .nav-hl` | 与页内 tabs 共用同一份受控状态；上/下、Home/End 可切换；侧栏收起后仍保留当前分区 |
| 网关接入字段 | `ConnectionField` → `label + div[role=group]` | 使用既有 `.connect` 两列网格；标签、值、hint 固定层级；窄屏由原生规则堆叠 |
| 复制 | `CopyButton` → `.copy` / `.copy.done` | 设置、网关共用 22px 按钮和 12px 图标；复制成功反馈 1200ms；失败不假报成功；卸载清理定时器 |

视觉统一来自同源语义配方，不是把所有不同用途的控件强塞进一种 class。颜色、字体、圆角和控件几何继续由 `app.css` 的原生规则负责；Web 框兼容规则放在 `shell-patch.css`，不得再覆盖 `.font-controls` 的布局方式。

## 2. 导航时序与动效

1. 在 layout effect 中提交 `body.side-nav`、平台外观和字号。
2. `fitTop` 确认最终顶栏压缩等级；不要把会被它改尺寸的 nav 再作为它自己的 ResizeObserver 触发源。
3. 最后测量选中按钮的 `offsetLeft/offsetWidth`；滑块的目标必须等于该按钮。新挂载的条不能继承旧条坐标。
4. `useSegThumb` 观察条和各选项，覆盖字体、语言、宽度变化；尺寸变化原地对齐，选择变化才执行 280ms 滑动。
5. 切换布局使用固定参考版本的 `.nav-morph`：`--morph-t: .32s`、`--morph-ease: cubic-bezier(.42, 0, .58, 1)`，React 在快照更新内同步提交。连续切换以最后一次意图为准；1500ms watchdog 清理未结束的过渡。系统减少动态效果或不支持 View Transition 时直接切换。v0.1.191 仍沿用了旧 CSS 的 500ms 参数，v0.1.192 已纠正。
6. `SIDE_AT=1024`、752×652 的顶栏 Web 框保持原值；本修复不降低断点来强塞侧栏。

**尚未对齐的边界：** 原生窗口点击折叠时外框尺寸不变；当前 Web demo 仍在顶栏 752×652 与侧栏最大 1100×720 两种框尺寸间切换。这是 demo 兼容层带来的额外几何变化，不属于原生 `navMorph`，也不能通过修正时长就宣称整个动效 1:1。后续须单独定义、验证预览窗口尺寸契约，避免绕过已有 chrome 约束。

## 3. 设置与网关边界

- 侧栏展开时，设置分区显示在“设置”下方；搜索锚定预览框内的标题栏，不能使用浏览器视口 `fixed top:0` 把它裁到框外。
- 字体两个菜单必须同排且右缘对齐；语言名称不能只剩一个字；说明不能挤进控件区。
- 网关状态地址、接入地址与示例使用同一个端口配置；模型列表为空时显示 `provider/model` 占位，不假装已有云模型。
- 网关连接卡保留 API、地址、密钥、模型、示例五个字段组；复制按钮共用组件，代码块只在自身滚动。
- 本轮仍是假数据壳；不声称启停真实网关、真实 Key 落盘或新增 Mac Appearance 点录。

## 4. 来源与验收

本轮固定源码：[yetone/magpie @ 63be477](https://github.com/yetone/magpie/tree/63be47717a9ca91fc89102078a1f1fff3e03e0ce/internal/gui/assets)。

- `app.js:8524–8599`：thumbTo / thumbFit / slide；`22691–22739`：fitTop；`22925–23030`：navMorph / navSubs。
- `app.js:7318–7337`：field；`6261+`：copyBtn；`index.html:153–183`：语言、字体两种配方。
- `app.css:385–407`：nav-sub；`458–485`：导航过渡；`2207–2220`：Connect；`3176–3205`：设置行、字体 grid、菜单边界。
- `plugins/gateway/client.js:364–481`：renderConnect、空模型占位与示例。

验收必须分开记录“已构建”“已浏览器检查”“已人工确认顺滑”，不得用截图或 chrome-guard 代替动效主观验收。具体结果见 [本轮验收记录](../interactions/web-cis-0.1.191/NOTES.md)。
