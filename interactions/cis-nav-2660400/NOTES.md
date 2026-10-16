# 首批 N3 / N1 / N2 · 2660400

2026-10-16，Asia/Shanghai。冻结规格：028dab55a3877656c115439835d1d0d14465e4ee中的R16/R17/R02及29项有限范围。结果：**N1通过、N2通过、N3待验**；不能扩成全量1:1或用户认可。监督已独立抽查部分帧、身份与4174 build-info，支持该候选N1/N2结论，最后仍须受影响回归。

## 候选和边界

- 实际源码候选26604006a932b564ed6468a100c37a15f5bc4644，UI版本0.1.194，PR工作分支已推送。其src树6430bd1bc473a3f587d471abfc83d7c51621693c与已提交93b4b74相同；新提交是独立构建/观测工具与冻结批准记录，没有虚增UI版本，也没有把继承v195整体发布。
- 从Git归档有限源码，复用现有依赖，独立tsc/Vite构建，两guard通过；lint59 warnings/0 errors。快照、probe及各产物hash见build-info.json；4174实际读取sourceCommit/version已由执行者和监督分别核对。观察probe不改变测量过程中的UI状态/动效参数。
- 任务预览http://127.0.0.1:4174，本机可访问。原4173及其dist保持不变。未声称云端预览已认证，D2仍待验。
- Windows，Codex In-app Browser/Chromium，DPR1，中文，resolved light（--bg #f4f4f6），110%文字；main字体栈为Segoe UI Variable Text/Segoe UI/雅黑/system-ui。该Cua接口不支持Browser.getVersion，未编造具体引擎版本。各采样含viewport、zoom、visibility；原生Mac未测。
- B1构建身份前置已满足；B1整项在最后候选统一收口，不把纯文档028dab5冒称运行代码已交付。无真实API/代理数据：故事路径是开关点击→React导航状态→布局与ViewTransition→最终正文/选中/几何，服务层仅静态资源。

## N1 / N2

- N1：1364/1048/900各Agents、Settings、Gateway展开/收起一对，共九组。1364 Agents/Gateway复用对应N2/N3相同条件记录；全过程每个rAF采样的root、caption与切换前严格相同，末态无横向溢出，未用像素容差。
- N2：六个主页各10次，共60次；Agents复用N3第一轮。正文ID/所选data-view/唯一选中身份始终对应。顶部thumb的写入宽度和transform精确等于该按钮offsetWidth/offsetLeft；侧栏使用原card背景。完整ID索引和分数测量见batch-result.json。
- 屏幕DOMRect与computed值另外保留。例如offsetWidth=57、inline width=57px，而zoom1.1下按钮rect宽62.984375、thumb rect宽62.6875；这不是“<1px就通过”的断言。通过的是规定的整数offset定位算法与正确身份；分数屏幕测量不被改成补偿整数，也不宣称跨平台像素一致。
- 旧图“Agent正文、供应商白thumb”的错误在受测提交未复现；现有layout effect、fitTop后测量及新挂载条不继承坐标的机制与冻结规则一致。本批未猜数值改导航代码；继承v195未据此自动通过。

## N3：三个证据层次分别记录

| 层次 | 已有证据 | 结果边界 |
| --- | --- | --- |
| 源规则 | 实际CSS .32s / cubic-bezier(.42,0,.58,1)，watchdog1500ms | 参数匹配，不证明观感 |
| 浏览器采样 | 三轮各10次；rAF间隔中位均约16.7ms，最大66.6/33.368/66.7ms；longtask支持且各轮0，document全visible，0watchdog超时/0采样超时 | 不设FPS门槛，也不把峰值自动放行 |
| 实际画面 | 184/195/180帧，共559帧；Cua Page screencast JPEG quality50、1000×690（原viewport1364×941），WebP保留原截图像素及timestamp间隔 | 这是实际Web候选画面，ack节奏采集，不是渲染FPS/原生Mac录制 |

另做**两次**无screencast对照（entry31/32），rAF最大16.9/17ms、0长任务。该结果提示录制开销可能影响峰值，样本不足以将全部33–66ms峰值归因录屏。原聚合性能计数保留在任务原始JSON，不能代替逐项longtask。N3继续待独立视觉/证据复核，不为凑通过改320ms或曲线，也不继续无限重复相同测试。

### 首轮55.935秒的真实时间索引

首轮录屏在采集泵开始前已启动，前两张静态截图在队列等待确认。原metadata显示frame1→frame2间隔**50681.794ms**；前三帧JPEG SHA-256完全相同。该时间是采集建立时的静态等待，**不包含导航操作**，不是页面折叠卡住50秒。

- round-1.webp保留原始时间，没有加速或删除画面；约 **50.696–55.909秒** 为采集建立后覆盖十次真实切换的画面段（尾帧编码显示到55.935秒）。第一、二张静态帧在0/0.014秒，frame2在50.696秒。
- 各折叠操作使用另一套明确的performance.now时钟：round-1-time-index.json列出entry1–10相对首点击的起点、观察总时长、逐帧见到nav-morph的起止和首次完成采样。观察总时长含快照建立及结束后三帧，不冒称CSS动画实际时长。
- 两套时钟没有伪造精确对齐；画面timestamp与probe时间分别保留，可按各自索引复查。round-2/3约5.04/5.057秒，可先查看这两轮的连续实际动效。

## 操作数量和收尾

总96条开关观测：N2六页60 + N3额外两轮20 + 无录屏归因对照2 + N1其他条件14。没有另跑一套重复全回归。all-navigation.json保存全96条；N1/N2复用关系见batch-result。

初始task navLayout为unset。直接关页未触发本环境pagehide清理，首次复查仍side，保留restoration-first-close.json；随后通过**仅限4174**的显式恢复入口恢复unset，独立新页验证initialNavPreference=null、1280×720、浅色，见restoration-check.json。未清空整站存储，未动4173用户偏好。全部本批测试页已关，viewport已reset；console error为空。

保留最小交付：三个WebP、两态关键截图、一次初态、全采样、来源manifest、结果与失败/恢复检查。原始JPEG、轮次性能计数和源码快照仍在本任务.cache（N3待验所需），不复制整个旧证据基线。下一批按冻结顺序处理Settings S1/S2/S3，N3单列待复核。
