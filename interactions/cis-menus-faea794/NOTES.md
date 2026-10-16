# C1/C2/C4 首个候选记录

UI绑定faea7942cd9cdc83e388e1a607176408312822f1 /0.1.198，4176隔离预览，1364×941，显式demoAgents=1&amFixture=deep，无真实模型请求。候选manifest在原快照dist/build-info.json；这一目录未宣布任一完整ID通过。

- C1：稳定模型弹层left610.270874，锚left610.708374；root实际border0.606061 CSS px、clientLeft=1、scale1.1。整数边框转换引入约0.4375屏幕px误差，与来源算法的上翻选择分别记录。
- C2：输入gpt后有gpt-5/gpt-5-mini，却没有选中候选，回车把Opus字段改为字面值gpt。固定app.js filter:4808–4828将cursor置0；需修复选中状态。此前即时关闭+inert ghost子用例已正确，不等于整个C2通过。
- C4：深层折叠/搜索/Shown保留、Current锁、组内及全局二次确认、其他操作撤回、Only逐agent/重载保持、连续Alt重排、实际tab.drag及默认恢复均留状态。第一次原始CDP短序列未改变顺序，后使用文档支持的tab.drag实际提交；不将前次无效输入当成产品错误。
- waitFor隐藏的后端约3秒截止，早于源码4000ms，后续状态已过期恢复。保留这个工具失败，不据此断言精确4秒时序；下一候选probe观察data-armed变更时间。
- c4-candidate-1中早期长列表深处点击意外关闭的空状态为不完整尝试；过滤到Gemini后相同行正确变更并保持弹层，未归因前不据此报产品缺陷。
- 30键偏好通过显式fixture恢复并逐键相等，见candidate-1-restored.json。源头nav为top、若干mock键已有值，不是全null。
