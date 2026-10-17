# C1/C2/C4 第二个候选记录

UI d1f3e03c06543c7ce3763f437951edb829c7470f /0.1.198，4176，1364×941与390×844。与faea794的产品差异仅ModelPop选中状态及popover实际边框原点；C4未变组件的深层状态有依据复用。

- 模型搜索首项gpt-5、方向后gpt-5-mini、回车实际提交及未知ID均正确。一次locator.press(ArrowDown)意外改成gptgptf，其记录保留为无效输入尝试；改用文档支持的tab.pressKey(Down/Return)后查询仍gpt、候选正确，未再为该输入接口改变产品。
- 稳定模型left与anchor.left同为377.510437；六族桌面/手机首开、普通有注释372和无有效注释300记录在menu-candidate-2。font-code采样处于动画尾部，不将其BCR当稳定值；相同定位配方的UI family/style采样稳定。
- C2日期键盘跨月、未来禁用、先start再按升序提交10月8–16日、回焦/resize/外点；行菜单禁用跳过/循环/Tab；协议语言当前选中初焦/上下/回焦/resize；字体内部滚动保持和搜索焦点均已观察。一次行外部scroll后即时count仍1，事件后来到达；尚未据此关闭该用例，最终需按状态条件等关闭，而非固定等待。
- 原先模型与AgentModels的即时关闭交互层子用例按未变pickerGhost函数复用。批量data-armed两次变更150494.6→154506.6ms，4012ms复位（声明4000ms+调度）。
- **C2新增实证缺陷：** GroupEditor keepOpen鼠标选已列模型后active为BODY；输入haiku选已列模型后query变空。固定app.js commit:5184–5196保持查询并恢复搜索焦点，仅任意ID清查询。最小补丁待下个候选复验，不宣布完整ID通过。
- 31键偏好已显式恢复，current/initial相等。源码、证据、旧用户页面/产物均保留，无真实后端调用。
- 汇总另定位C1的同类取整：plain向上pop的底边475.427108与锚顶481.15625，相差5.729142（应5×1.1），对应root.clientHeight719与实际padding-box718.787878的差；1048视口root computedWidth909.091而offsetWidth909，语言菜单right981.104187与anchor.right981.208374偏0.104187。须把转换的缩放与内边界也统一为实际浮点尺寸；不更改来源offset测量算法，不放宽验收误差。
