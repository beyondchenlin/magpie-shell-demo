# CIS 执行进度

更新时间：2026-10-16 22:17 Asia/Shanghai

- 当前阶段：phase2_menus_c1_c2_c4_reproducing。唯一执行者本聊天01a14465-ad94-73e0-a0ad-991539957fa0；监督01a143c3-8101-75e1-b638-c39ad15d55ed；无子代理。
- **29项：通过10、失败2（C1/C2）、待验17。** C2/F01关闭事件层的子用例在faea794已修复，监督独立抽查支持；搜索gpt回车与C1边框误差已在d1f3e03定向复验正确。完整C1矩阵还需汇总校算，C2还有新复现的keepOpen焦点/查询问题待补丁复验，不能提前关闭失败。Agent初焦正常，不把旧静态风险当成已复现缺陷。
- 通过项：N1/N2=2660400/v194；S2/S3=90099b9/v195；G1/G2/G3=874268b/v196；S1/N4/G4=0a2a014/v197的有限核验/有依据复用。0a2a014六主页面12次受影响导航回归通过；最终候选仍需受影响回归。N3保留独立动态复核，不重录三轮。
- 当前实际受测UI：d1f3e03c06543c7ce3763f437951edb829c7470f /0.1.198；4176受管预览session53036、menus-candidate-2 Git archive隔离产物，build-info绑定源码/版本/资源hash。模型gpt搜索首项/方向/回车及任意ID已正确，稳定模型左边与锚点一致；C1/C2/C4完整ID均未报通过。另复现GroupEditor keepOpen鼠标选择后BODY获焦、选已列模型清空搜索，正在同一批最小修复；继承其余草稿不整体提交。
- 规则：唯一入口docs/CIS-CONTROLS.md。冻结028dab5保留，监督已明确批准R01的window级联勘误并独立提交3c2d6de；S1完成原有限核验后才通过。其他冻结条款与29项范围不变，不再写S1待裁定。
- 监督已支持S2/S3及G3/G4有限结论、确认4176为0a2a014；最新要求明确C2失败计数并继续C1/C2/C4最多3ID，不需等常规批次批准。C3与Providers/Plugins后续一起核验。
- 检查：d1f3e03 build/TypeScript/两guard通过，候选55 TS/TSX lint55 warnings/0 errors。此前工作树基线59/0。一次locator.press(ArrowDown)意外改变输入内容，已保留无效尝试；文档支持的tab.pressKey(Down/Return)实际保持gpt、选中并提交gpt-5-mini。没有因这个输入接口异常再修改产品。
- Git：分支tip/0.1.121-cis-appearance-shell，PR #1。最近已确认推送e19fd5a；本地HEAD faea794（含0a2a014、R01勘误及弹层首个补丁），上次push遇408/sideband断开，后续读远端也TLS EOF，是否已落远端未确认。PR标题/正文更新经连接器、gh GraphQL与REST失败，未报更新成功；停止同路径无信息重试，本地工作继续保全。
- 现场：用户4173/PID21080与dist未动；本任务4174/PID98524、4175/PID76536保留；受管4176按批次Ctrl+C切换。早前自动审核拒绝OS stop/restart4174（仅blocked by policy），没有绕过停止该进程。自有tab18现已恢复31键，current与initial逐键相同；此前文字误计30键已更正，实际fixture/JSON一直为31键。沿用该页sessionStorage保全初始快照，用户4173偏好未触及。
- 证据：interactions/cis-nav-2660400、cis-settings-90099b9、cis-gateway-874268b、cis-layout-0a2a014；当前C2失败证据cis-menus-before-0a2a014。源码调用索引现绑定0a2a014快照19文件/459调用/34裸DOM候选，数量不代表通过。四原问题图已找回保全，含个人界面的原图不公开。
- 空间/保全：唯一工作树D:/demo1/tagmaai；不安装/复制依赖环境。D低于20GiB已提示，下一构建预计<30MiB且保留>10GiB；C24.94/D18.82GiB附近。已先列清单并核验边界/重解析/进程引用/独占锁/近期写入，回收7份本任务source.tar运输文件34232320逻辑bytes，解压源码/构建/历史证据均保留；D前20203614208、后20237852672bytes，含并发写入，不把逻辑大小冒称物理净释放。清单及结果.cache/cis-navigation-20261016/tar-cleanup-*.json。接管.cache补丁/hash/原图仍保留。
- 下一步：六族1364/390首开已采，普通Model有注释372/无有效注释300均从真实GroupEditor调用打开；日期跨月、两次升序提交、未来禁用、关闭回焦正确。C4仍补Alt向上；4秒probe实测4012ms复位，其余有限状态见faea794记录并按未变组件复用。C2补keepOpen焦点/搜索和协议非live多选/NUL公共契约，后两分支当前没有页面调用，使用独立测试入口，不添加产品控件或扩业务。d1f3e03证据interactions/cis-menus-d1f3e03。D最新36.26/C24.89GiB；空间外部回升不能归因于本任务32.7MiB tar回收，下一构建仍预计<30MiB、复用依赖。

## 实质进展记录

### 19:10 阶段0接管

确认唯一工作树、20个修改路径/8个未跟踪文件；保全patch/hash及必要副本；确认4173进程及dist，揭示preview.json不可信。原Linux启动/旧自动化材料只作历史，没有执行。无UI项关闭。

### 19:33 阶段1首轮校核

完成15类控件/25条规则与29ID的有界校核；独立验证nav320、开关32×19与变体、CSS最终级联、模型交互层即时关闭而ghost退场、协议/日期/字体生命周期等；找回四张问题原图。F01–F08列出可复验风险，未动UI。网络失败换到成功连接器后停止原失败路径，无反复调值、无版本堆积、无同问题相反修改。等待监督冻结。

### 监督消息19:43 冻结批准 / 首批启动

监督独立抽查closePicker/popGhost与Usage日期菜单、源码blob，批准028dab5规格基线。当前0通过/0失败/29待验。拟从已提交UI源码93b4b74生成有界源码快照，复用仓库依赖、独立产物与4174任务origin，保留4173/dist和继承v195脏稿；预计新增<100MiB。开工空间C26.33/D23.25GiB。先诊断N3/N1/N2，不把静态F01–F08全部当本批修改范围。

### 20:12 首批结果 / 监督抽查反馈

候选2660400源码已实际构建、两guard通过、lint59 warnings/0 errors并推送。N1九组宽度/页面矩形全程保持，N2六页60次身份及offset算法目标准确；30次N3必测与2次无录制对照已完成，总记录96次（复用重叠验收，没有重复跑整套）。实际录制559帧、3个WebP，原始采样保留在任务.cache。监督已抽查entry1/34/85/86/95/96及4174 manifest，支持该候选N1/N2结果。N3仍待验，首轮55s含静态采集排队，不把它冒称折叠卡住。

收尾发现直接关页未触发环境中的pagehide清理，首次恢复检查仍为side，失败证据已保留；已通过仅限4174的显式恢复入口将magpie.navLayout恢复原始unset，独立新页验证initialNavPreference=null、1280×720、浅色。所有本批测试页已关、viewport已reset；4173用户页/偏好未动。下一批不继续在N3同一无归因现象上停留。

### 20:30 Settings结果 / R01规格冲突待监督裁定

候选f198b24先修复经浏览器复现的FontRow样式初焦、窗口resize和正文读者滚动关闭；90099b9再将常规页长对话说明换成固定index.html:199的既有翻译键，纠正德语英文fallback。都只提交自身文件（package纯版本行已复核），保留其他继承脏稿。构建/TypeScript/两guard通过；90099b9候选50个TS/TSX显式lint55 warnings/0 errors，全工作树59/0；console错误为空。完整字体有限状态在f198b24，90099b9复测初焦及resize/滚动；同一FontRow字节复用。五语言+System均在90099b9核验译文/导航/heading；四字号及125%导航/网关矩阵在只有一译文键差异的f198b24复用。S2/S3通过，29项累计4/0/25；不冒称全量通过。

**监督待裁定：S1/R01固定源码变体遗漏。** 原版app.css:533 `body.window .row` specificity(0,2,1)，覆盖3176 `.row.pref`(0,2,0)的min-height/padding/gap；候选body.window实测48px / 7px 12px 7px 14px / 12px。字体行gap因更具体规则仍8px 14px；字体grid310/5×6/min100/72正确。R01当前只写50/8/14，不能按这个不完整规格修改原版CSS。提议补记window变体，保留原base及phone变体；**本执行者未改冻结规则、未调CSS凑数，S1保持待验**。完整CSS/DOM/截图在interactions/cis-settings-90099b9/，唯一规则仍CIS-CONTROLS；这不是另建标准。

自动审批审核拒绝combined stop/restart4174命令，仅返回blocked by policy，未执行停止；原4174/PID98524保持，4175/PID76536为本任务f198b24；90099b9以受管终端session18184在4176提供。4173用户页与dist未动。测试前后4174/4175/4176四个受测偏好均恢复null，测试tab已关闭、viewport reset。无新worktree、依赖或环境副本；新建仅有界源码构建快照。C25.80/D21.52GiB（12:26UTC附近测量）；任务Settings原始证据约1.3MiB，未删任何旧证据。开始Gateway G1/G2/G3独立复现，不等待常规批次批准；S1冲突分开保留。
### 20:40 Gateway结果 / 下一批N4/G4/C1

874268b/v196只修改Gateway API模板/复制共用函数及Settings的隐式filled默认，不含继承脏稿。复现并修复Responses curl为空、SystemOne Python却是curl及jev_latest拼写、其他API Node误用OpenAI；已核验固定gateway/client.js模板抽为纯展示函数，全部五API curl及六条原有错误分支通过。普通Settings保存不再偷偷启用五模型。

G1四状态、on重启/off启动/older接管、other无按钮、端口占用失败及保存普通设置仍空模型通过。on的80ms忙态在观测前已结束，未冒称直接见到；off/older720ms禁用忙态实见。G3四类复制已实际读剪贴板一致，重复复制反馈约1211ms复位（声明1200ms+调度），离开页面清理/console无新错误；受控双路径失败后顶部URL与共用按钮都显示错误，不报成功，剪贴板不变。旧顶部URL误报成功的复现保留。原剪贴板0items，最后恢复空文本并读回为空；13项测试偏好全回null，任务tab已关，viewport reset。

构建/TypeScript/两guard通过；候选52 TS/TSX按仓库config显式lint55 warnings/0 errors；无新依赖。受管终端session18184已正常Ctrl+C结束，新候选沿用4176，session53434；没有再次尝试被审核拒绝的OS停止4174动作。4174/PID98524、4175/PID76536及用户4173保持。Settings旧90099b9 dist临时增加受控copy fixture时记录了新index/fixture hash，旧Settings原始证据身份不追认这个后加HTML；新874 manifest已包含copy probe。Gateway证据在interactions/cis-gateway-874268b/。

磁盘C25.35/D21.26GiB；任务全部源码快照+导航raw77.49MiB逻辑、Settings raw1.29MiB、Gateway raw0.30MiB；不是物理净占用/释放量，没有清理行为或新worktree/依赖环境。公开导航证据20.11MiB，动态raw主要559帧而无重复WebP，证据仍按40MiB计划；源码tar/build不混作验收证据。S1/R01冲突和N3不变，继续独立N4/G4/C1，最多3ID一批。
### 20:52 监督R01勘误批准 / S1 N4 G4完成

监督续行批准R01补记window变体，已独立提交3c2d6de，其他冻结范围不变。S1重新按原有限范围核对用户旧问题图、固定CSS、实际计算样式及上下滚动：字体两列/310px与5×6gap、Windows字栈、48/7/12行级联、上边分隔线、七侧栏分区唯一选中、外框和标题栏滚动不变，之后才判通过。没有改CSS迎合旧表。N4默认900/1023/1024/1364、显式top新文档、显式side的900冷文档、390与返回均过；新tab默认1280的预检记录保留并重标，不冒称900。

G4四方言/两OS及1364/390代码滚动有限矩阵已做。手机pre横滚301→0，复制按钮在pre外且相对右/上inset6不动。截图发现折行thumb为88px而选项44px：x/y/w未变导致旧去重跳过高度更新。0a2a014/v197只把h纳入内部thumbSame比较（不改280ms/曲线/offset目标/验收容差），新候选API44px、Settings110/150跨行y44/h44、回桌面清height实测正确；该问题一次定向修复通过。共用hook受影响N1/N2在六页各一对12次回归，root/caption全程保持、身份/目标offset/白card均严格通过。N3不重录，仍待独立复核。

构建/TypeScript/两guard通过，候选52文件lint55/0；证据interactions/cis-layout-0a2a014，App/Gateway/styles未变的前矩阵按哈希/差异依据复用，变化分支已重测。13项偏好恢复null、全部测试页关闭、viewport reset。4176现在0a2a014，受管session60331；旧53434正常Ctrl+C结束。PR源码/证据e19fd5a已推；PR标题正文更新遇连接器transport及gh GraphQL/REST EOF，目前未报更新成功，不阻塞UI工作。下一批C1/C2/C4最多3项，先复现再最小修复。
