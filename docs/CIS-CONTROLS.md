# CIS：导航、设置与网关控件契约

适用基线：Magpie Shell Demo **v0.1.194**（2026-10-16）。本页记录已接线的组件和验收条件，不代表全应用 1:1 已完成。当前范围仍是复刻、沉淀 CIS 与可复用组件。历史完整 CIS 在交接 PR #2；本页与同源清单记录当前生效的修正。

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
| 图标 | `MagpieIcon` → `.ic[data-icon]` | 单色 SVG 用 currentColor mask；彩色 SVG / PNG 用图片；generic 用原生立方体；不使用菱形字符代替 logo |
| 插件图标 | `PluginLogo` → `.pm-logo` | 有品牌图则复用 MagpieIcon；无品牌图按类型使用原生 puzzle / pipe / terminal / tools / page glyph |
| 信息提示 | `InfoTip` → `.rt-info` | 22px、原生 INFO_I、焦点可达；说明来自 title / aria-label，不再额外堆一段重复正文 |
| 请求归档 | `RequestArchive` → `.led-arch > .led-arch-sw` | label 与 28×16 的原生开关为同一个可点击目标；空态和有数据态使用同一组件 |

视觉统一来自同源语义配方，不是把所有不同用途的控件强塞进一种 class。颜色、字体、圆角和控件几何继续由 `app.css` 的原生规则负责；Web 框兼容规则放在 `shell-patch.css`，不得再覆盖 `.font-controls` 的布局方式。

## 2. 导航时序与动效

1. 在 layout effect 中提交 `body.side-nav`、平台外观和字号。
2. `fitTop` 确认最终顶栏压缩等级；不要把会被它改尺寸的 nav 再作为它自己的 ResizeObserver 触发源。
3. 最后测量选中按钮的 `offsetLeft/offsetWidth`；滑块的目标必须等于该按钮。新挂载的条不能继承旧条坐标。
4. `useSegThumb` 观察条和各选项，覆盖字体、语言、宽度变化；尺寸变化原地对齐，选择变化才执行 280ms 滑动。
5. 切换布局使用固定参考版本的 `.nav-morph`：`--morph-t: .32s`、`--morph-ease: cubic-bezier(.42, 0, .58, 1)`，React 在快照更新内同步提交。连续切换以最后一次意图为准；1500ms watchdog 清理未结束的过渡。系统减少动态效果或不支持 View Transition 时直接切换。v0.1.191 仍沿用了旧 CSS 的 500ms 参数，v0.1.192 已纠正。
6. `SIDE_AT=1024` 保持原值。预览窗口尺寸只跟随视口：桌面小于 1024px 使用最大 752×652 CSS px；不小于 1024px 使用最大 1100×720 CSS px，两者均按字号和可用视口收敛；不随导航展开/折叠改变。手机仍全幅。
7. 预览框在侧栏状态下为内容预留宽度，模拟系统标题栏补回这段宽度，始终横贯同一个窗口；标题、窗口按钮的坐标不参与侧栏位移。

**v0.1.193 窗口契约：** 用户明确要求继续 1:1 后，撤掉由 `.side-nav` 决定外框尺寸的兼容规则，同步修正 chrome-guard 和 TIP-CYCLE。九组页面/宽度共十八次切换均验证外框与标题栏矩形不变，九次收起后的滑块对齐；125% 字号与 390px 手机也已检查。这修复了明确的几何差异，仍未进行逐帧 FPS 或用户主观顺滑度验收。证据见 [窗口验收](../interactions/web-frame-0.1.193/NOTES.md)。

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

## 5. 同源样式与窗口内菜单

- app / routing / library / plugins / sessions / context 六份基础 CSS 使用同一固定提交，归一化 LF 后的 SHA-256 见 [同源清单](cis/source-manifest.json)。运行 `npm run cis-guard`；不要在基础文件尾部追加二次控件样式。React/预览几何兼容放在 shell-patch，并说明原因。
- `PopoverPortal` 将浮层挂到同一窗口根节点；`useAnchoredPopover` / `placePopover` 将锚点的视口坐标换算成窗口内部 CSS 坐标，保留缩放、描边、上下空间与设计尺寸上限。不得把浏览器坐标直接写给嵌套 absolute 子元素。
- 首次打开先挂载，再在 layout effect 定位。禁止同时“没有位置就不渲染”和“没有 DOM 就不定位”，否则菜单永远不出现。
- 协议/语言菜单按原生 closeProtoMenu 立即移除；模型浮层使用 220ms `.leaving`。菜单方向键、Home/End、Escape 回焦跟随原生用途；非 live 多选关闭时一次提交，live 逐项提交。
- 行菜单（Agents / Providers / Routing / Usage）、字体、LAN 地址、托盘用量、搜索 API 选项共用窗口定位；模型选择与 Agent 模型列表同样适用。
- 手机 Web 按原生 applyZoom 使用 100% 浏览器内容尺度；回到桌面恢复用户保存的文字大小，不叠加 110% 到触摸控件。

## 6. 路由、语言与验收入口

- 路由规则使用原生 `.rt-rule` 四列、`.rt-line.rt-when` / `.rt-then`、`.rt-c` / `.rt-cx`、`.rt-addc`、`.icon.rt-rmore`。条件移除后独立更新，不能把其余条件一起隐藏；pause 仅接受原生允许的条件。
- mock 分组保存完整表单，重新编辑保留规则、模式与成员状态，不再根据“规则数量”造一条替代规则。
- 语言菜单不被自己的外部点击监听抢先卸载；简体、繁体、日语、德语、英语与系统语言均接线。翻译取自固定参考版本；繁体/日语/德语分块加载，不扩大默认中文入口包。
- “演示图”“演示数据”“stale copies UI”不出现在应用控件中。测试数据由明确的 URL fixture 启用，默认原生空态不被演示开关污染；不代表连接真实服务。
- `npm run cis-guard` 仅证明基础样式同源；浏览器几何、状态机与人工原生对照仍分别记录，不把其中一项当成全量 PASS。
