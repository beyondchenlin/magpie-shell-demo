# CIS 执行进度

更新时间：2026-10-16 20:52 Asia/Shanghai

- 阶段：0/1已完成；2已完成导航与Settings有限批次；S1/N4/G4及Gateway G1/G2/G3完成；下一批C1/C2/C3；3未开始。
- 状态：**phase2_responsive_popover_reproducing**。冻结028dab5保留；R01 window勘误获监督批准并登记3c2d6de，S1有限核验后通过；其他规则未变。N3仍待独立复核；其余工作继续。
- 唯一执行者：本聊天01a14465-ad94-73e0-a0ad-991539957fa0；监督聊天01a143c3-8101-75e1-b638-c39ad15d55ed；未派生代理。
- 分支：tip/0.1.121-cis-appearance-shell，PR #1。接管基底e94edc6713da405285854e7d6548f3f8364bf84f；规格冻结提交028dab55a3877656c115439835d1d0d14465e4ee；导航受测26604006a932b564ed6468a100c37a15f5bc4644；Settings候选90099b9532fc7e95036fa05b7848e61e11342b72；Gateway候选874268b83c40d3b1a621b152d54aeaed51732334；当前布局候选0a2a014ff881e37a636d05605849f246485888ff/v197。不要把后续证据提交当成新UI候选。
- package/锁文件的195纯版本行经复核已随FontRow修复提交；其余继承v195脏稿逐文件保全，未整体发布。新候选90099b9仅含FontRow最小修复与一个Settings翻译键；隔离快照排除其余脏稿。
- 验收计数：**通过10（N1/N2/N4/S1/S2/S3/G1/G2/G3/G4）、失败0、待验19（含N3待复核）**。各项分别绑定2660400/v194、90099b9/v195、874268b/v196，另S1/N4/G4绑定0a2a014/v197的有依据复用与回归；详见清单，不代表继承v195或最终全量通过；最后仍须受影响回归。B1构建身份子条件已满足，B1整项保留待最终候选收口。F04已按S2复现修复；F03字体部分已处理，其余风险仍待对应批次。
- 规格交付：已冻结的唯一规则入口docs/CIS-CONTROLS.md；R01–R15覆盖15类控件，R16–R25覆盖导航、复合控件与页面；旧条款/固定原版来源/判定/具体变体/组件调用/验法已落表。29ID逐项必要性、有限状态与终点见CIS-AUDIT；验收清单只管组织和证据。
- 追溯：固定15个源码文件Git blob身份均比对相同；六CSS LF SHA-256 guard通过。冻结时混合工作树索引20文件/465调用；现已改为90099b9提交源码快照索引19文件/459调用/34裸DOM候选，排除继承脏稿；数量不是通过数量。
- 原图：四张用户问题附件已从监督聊天找回、逐张查看并保全必要私有副本，索引USER-REFERENCE。它们是旧demo问题图，不是原生正确金标；未公开上传含浏览器个人界面的原图。
- 基线检查：两guard通过；lint59 warnings/0 errors/exit0；只读文档/JSON/来源一致性检查另记提交前结果。阶段1未build，未改变UI/字典/package/锁文件；继承的26个非文档文件均保全，25项初次哈希未变，context为Git内容无差异的换行状态并单独保存字节。
- 预览现场：4173监听PID21080未动；HTTP200，Cua新建后台页实际加载index-gzRBpZxd.js。dist时间18:39:38，无源码SHA/壳版本可核验标记，故记录为继承dist，不确认v194/v195运行身份。未独立核验云部署。
- 产物指纹：JS SHA256 3099158208260f67d03f8d9de363a84e6075b6ee13c62fc53015be1c2bbb4ed1；CSS 64181a0435e81323f04d45b24fcaaa49171fc971a412f785fc992a60dc350b2d。preview.json仍滞后，未以其作版本凭据。
- 浏览器收尾：首批自己的测试页均已关闭；仅在4174测试origin修改导航偏好，已显式恢复初始unset，viewport恢复1280×720；用户4173原页/偏好未动。Cua采样已实际完成，不报渲染FPS。恢复失败首检与最终成功均保留。
- 保全目录：.cache/cis-takeover-20261016/，补丁/28路径inventory/8份未跟踪副本/4原图副本/换行原字节/18KB lint日志/只读索引脚本与恢复说明，约1.00MB逻辑大小；负责人本任务、复查2026-10-23，整体验收前保留。未复制node_modules/dist/运行环境，未删除旧证据。
- 其他保留：既有node_modules、dist、参考缓存、191/193/194/195历史证据、唯一工作树D:/demo1/tagmaai；参考缓存只补缺失的固定Usage page.js约162KB。未安装、未建额外worktree、未停止服务、未清理其他目录。
- 空间：接管C/Temp27.14GiB、D38.22GiB；19:30测得C26.43GiB、D27.91GiB。本任务新增只约1MB恢复资料及小文档/162KB参考文件，期间磁盘大幅变化未归因于本任务，不将其当作任务占用或净释放量。没有释放空间操作；后续大操作须重测。逻辑大小不冒称物理占用。
- 导航旧候选：26604006a932b564ed6468a100c37a15f5bc4644 / v0.1.194，已推PR分支，4174独立预览；Settings现候选90099b9 / v0.1.195已本机构建/浏览器验证，待本检查点统一推PR。产物/build-info记录源SHA、src树、probe与各文件hash；监督已独立读4174 build-info并复核hash。4173及其dist未改。
- 当前门禁：N3三轮30次、559帧画面与rAF/longtask已采齐，全部document visible、0长任务、0watchdog超时；录制时峰值33–66.7ms不能自动归因或放行，两次无录制对照为16.9/17ms，仅提示观测开销可能影响。保留待独立复核，不报渲染FPS/原生Mac观感。首轮55.935s中有采集建立阶段约50.682s静态间隔，原片/真实折叠时间索引已随072b858推PR，不重录整批。
- 下一步：Settings检查点证据/索引推PR，Gateway G1/G2/G3继续复现；S1等监督裁定原版window变体。N3不阻塞独立工作，不反复调320ms/曲线。常规批次不重等批准；规格冲突、同修复两轮失败或不可代理条件才停相应动作。

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

构建/TypeScript/两guard通过，候选52文件lint55/0；证据interactions/cis-layout-0a2a014，App/Gateway/styles未变的前矩阵按哈希/差异依据复用，变化分支已重测。13项偏好恢复null、全部测试页关闭、viewport reset。4176现在0a2a014，受管session60331；旧53434正常Ctrl+C结束。PR源码/证据e19fd5a已推；PR标题正文更新遇连接器transport及gh GraphQL/REST EOF，目前未报更新成功，不阻塞UI工作。下一批C1/C2/C3最多3项，先复现再最小修复。