# C1/C2/C4 最终补充候选

UI 862789fc81599c9f70c966f53fed1386e3f74fae /0.1.198，4176受管预览。build/TS/两guard通过；55个产品TS/TSX lint55 warnings/0 errors。协议公开契约独立入口严格TS编译，fixture与产品manifest分开，所有既有生产资源hash不变。

## C4通过 / 来源复用

- AgentModelsPop blob在faea794与862789f均为7bfb066abab947d37860639107966657b6346ef5；AgentsView均为43a3c3db275a5c72a1bf5ed64d21aa2578089177。All/Shown/Order、>8分组折叠、跨组mock搜索、保留新关闭行/视图切换清除、3 Current锁、组内/全局保护、二次点击/其他动作撤回、Only逐agent/重载、连续Alt↓/实际拖拽/默认恢复和内外滚动，复用[faea794有限记录](../cis-menus-faea794/NOTES.md)。
- d1f3e03的data-armed时间差4012ms，声明4000ms加调度；resize关闭与Escape回焦已验证。候选4补齐两次Alt↑：haiku从4→3→2，focusedOrder均claude-haiku-4，之后恢复默认顺序，见menu-candidate-4。
- 一次长列表点击意外关闭的空状态保留为不完整测试尝试，没有据此报产品缺陷，也没有无信息重复。过滤到同一Gemini行后，Shown保留/清除的规定路径完整验证。

## C1/C2仍在收尾

protocol-contract记录非live：改变不提前提交，Escape按目录顺序一次提交，未变关闭不重复；NUL不提交不关闭；清除一次提交并关闭。live逐次即时提交，清除无重复。该入口覆盖当前无页面调用的公开分支，不扩大产品控件。

menu-candidate-4中heading外点命中邻近侧栏按钮，关闭行菜单并切换本任务导航，不冒称无其他副作用的空白点击；candidate-4-restored记录31键显式恢复且逐键相等。

- keepOpen修复已在真实GroupEditor复验：鼠标opus/键盘sonnet后查询保留且INPUT初焦，typed ID后查询清空且保持INPUT，三次选择实际产生三个成员。
- 日期CDP DOM.scrollIntoViewIfNeeded把已存在的usageNote滚入视野，正文scrollTop301.818176，下一次观察菜单仍开；随后Cua用户向上滚轮把正文回到0，菜单按条件等待确认关闭。这是本任务页面的临时滚动，偏好随后恢复。
- C1稳定1048语言菜单right与anchor.right同为981.208374；gap273.6770935−268.177084=5.5000095屏幕px（5CSS×1.1）。此前一次早开顶部偏差时父页面有原版view-in .24s位移，重新在transform=none的页面首开核对，没有再次改变数学。Model最终下边806.53125符合窗口内边界8CSS留白；Agent右边1277.53125及底边相对锚8CSS正确。普通372/300也在真实GroupEditor观察，均保持来源“按声明340最大高判向/钳制”的配方，不能拿自然短列表高度改成placeMenu。
- **C1未关闭的最后实证问题：** Agent after Order→All时style仍bottom定位，但React className抹掉了up，箭头方向丢失（agent-1364-opposite-edge-final）。已定位为React类名重绘的hook失效依赖，下一候选只增加seg布局依赖并复验All/Shown/Order及Escape，不再微调坐标/容差。C2子矩阵已完成，最后hook变更后回归前仍保留失败状态。
