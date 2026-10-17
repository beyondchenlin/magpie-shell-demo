# C1/C2/C4 有限验收通过

最终UI源码396c11cb266f9e832c1cb9dfd0e1d75fc1c469a2 /0.1.198，4176，Git archive隔离构建，manifest见build-info.json。TypeScript/Vite、chrome-guard、cis-guard均通过；55产品TS/TSX lint55 warnings/0 errors，见lint.txt。最终浏览器warn/error为空。所有测试是本地mock，无模型/供应商API请求。

## C1：六族、两宽度及普通变体

| 族 | 有界证据及来源配方 |
| --- | --- |
| Model | d1f3e03记录1364与390首开：490模型配方、声明420高判向，手机宽374且up；普通有注释372/无有效注释300均从真实GroupEditor调用打开，声明340高判向。862789f补实际浮点frame后，稳定模型left=anchor.left，底边806.53125保留8CSS内边；不是用自然短列表高度改成placeMenu |
| 协议/语言 | d1f3e03的1364/390 sess-menu变体340px对齐右边；862789f补1048实际909.091逻辑宽，稳定right=anchor.right=981.208374，gap5.5000095屏幕px=5CSS×1.1及绘制量化。曾在原版view-in .24s移动中打开的采样保留，稳定transform=none后重开核对，没有继续调数学 |
| AgentModels | 580桌面/380手机（手机被边界限374），gap8/dx−10/最多560，顶部避标题栏；862789f正确处理相反边界。396c11c补分段重绘布局依赖：All→Order→Shown→All每次class含up且bottom定位一致，箭头下沿朝锚，截图agent-final-396c11c.png |
| 行 | d1f3e03两宽度实际首开，min176、left dx−4，按较多空间配方；对应样本没有触发窗口左右限位，后续浮点内边界修正不改变该分支结果 |
| 字体 | d1f3e03两宽度family首开，桌面style当前项与code变体；UI family/style稳定样本用于定位，code处在动画尾部样本只保留、不冒称稳定。与90099b9的FontRow差异仅四个hover处理，关闭/提交核心未变，已补查询焦点及Home/End |
| 日期 | d1f3e03两宽度首开，桌面left=anchor.left、手机right=382限位；独立252宽日历，gap5，无旧父segs内148px覆盖 |

390样本的root border为0、实际width390/height844为整数，d1f3e03→862789f的浮点转换在这些输入下数学相同；未重复六份手机记录。1364的语言/行/字体/日期样本未使用受变化影响的相反边界限位，按明确分支复用；模型、Agent与1048小数宽的变化路径已重测。396c11c仅改变Agent分段重绘时机；产品差异见last-layout-delta.txt，没有变CSS、坐标参数或验收容差。

## C2：按用途，不统一关闭状态机

| 族 | 完成事件与证据 |
| --- | --- |
| Model | 搜索gpt首候选/上下/回车、任意ID；单选关，keepOpen鼠标opus/键盘sonnet保留过滤和INPUT焦点，typed ID才清过滤。Escape立即无交互层，inert/aria-hidden ghost可退场；不强造协议scroll/resize和回锚要求。faea794关闭逐帧记录及862789f keepOpen记录，加396c11c外点与立即开另一入口 |
| 协议 | 当前zh初焦/方向键/Escape回锚、外点、外部用户scroll、resize；独立组件入口验证未接线的非live多选与NUL：无提前提交，关闭按目录顺序一次提交，未变不重复，NUL不提交不关；live逐项即时一次提交，清除一次提交并关，见862789f protocol-contract及独立manifest |
| AgentModels | 搜索初焦；Escape回挑选、外点、内部scroll保持、用户外部scroll/resize关，退出ghost不能继续拦截。396c11c在分段重绘后再次验证Escape与立即打开模型入口 |
| 行 | 首个可用项、上下循环跳禁用、Tab关闭正常移焦、Escape回锚、外点、实际外部scroll/resize均已测。事件异步到达时按hidden条件等待，未将一次即时count=1冒称失败或通过 |
| 字体 | S2有依据复用family/style、无结果Refresh与禁用态；d1f3e03补内部scroll、搜索焦点。396c11c：搜索中Home仍为sc-q且selectionStart=0，项聚焦后End到Refresh、Home到第一匹配DejaVu Sans；Escape/外点立即关。没有强加无搜索协议Home/End |
| 日期 | 初焦今天/当前边界；左右±1、上下±7与跨月焦点、未来禁用；先start保持开，第二次升序提交10月8–16日后关；Escape回锚、外点、resize。862789f的程序DOM.scrollIntoViewIfNeeded实际滚至301.818而菜单保持；用户滚轮回0则关闭 |

真实coarse指针设备未冒称实测；源码仍按Web/coarse条件避免模型强唤键盘，390矩阵是浏览器宽度验证。工具曾对locator.press(ArrowDown)输入异常，原记录保留为无效输入，改用文档支持的tab.pressKey后正确，没有因此修改产品。

## C4与最终收尾

C4深层mock矩阵和未变业务来源见[862789f](../cis-menus-862789f/NOTES.md)、[faea794](../cis-menus-faea794/NOTES.md)：All/Shown/Order、>8折叠、跨组搜索、Shown保留/清除、Current锁、批量二次/4012ms复位/撤回、Only逐agent和重载、连续Alt上下/实际拖拽/默认恢复、内外滚动与resize。396c11c对Agent只加seg布局依赖，四个分段方向及Escape回归通过，不重新宣称整个文件blob未变。

31项任务偏好已显式恢复且current/initial逐键相同，见candidate-5-restored.json；viewport reset后关闭tab18。用户4173/dist未动，无新worktree或依赖环境。4176留作后续批次，受管session16586。仅回收过7份本任务可重建source.tar运输文件，清单/逻辑量/空间前后已在执行账本记录，历史证据与源快照仍保留。

下一批新tab19开始时，补充核对同一矩阵的成对方向键，见direction-pairs.json：Model Down→Up仍gpt-5且query不变，行菜单Up循环跳禁用到隐藏，协议Up到English，日期Up7/Down7回今天；随后在该页新snapshot下显式恢复31键再开始C3。不是新的产品变体。
