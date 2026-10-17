# P0-S05 CIS 外观纠偏：dev.8 / schema3

用户指出“用了CIS但很丑、和前期一比一模仿不一样”。已暂停小队的新界面工作，优先修正外观，保留已实现的真实配置/聊天/取消。dev.6工作台及dev.7聊天的功能验收不构成整页外观通过；六CSS guard也不能证明页面正确使用CIS。

## 偏差与修正

先前只复用了部分token/控件，却自行编排了大标题、双栏卡片、固定底栏，并把顶栏换成页内Segs；产品入口还漏载了原复刻入口的共享CSS，供应商LibSwitch因此不可见。这属于实现偏离，不修改既有CIS规则来适应它。

dev.8恢复前期`.top / #nav.seg / .sidebar / .view`结构，复用NavIcon、useSegThumb及morphNavigation。三页IA保留，设置与网关放原有运维位置。撤销大标题/双栏工作台/固定底栏，首次引导复用原`.ag-lead / .guide / .guide-step`，列表与设置复用`.list / .row.pref`、PrefRow、TextBtn、WordsField、Tick、LibSwitch；模型选择改为PrefPick/PopoverPortal/useProtocolMenu及`.pm-name/.pm-note`，不再使用原生HTML select另造样式。

产品入口按原复刻入口同序加载app/routing/shell-patch/library/sessions/plugins/context样式；未修改这些公共CSS或继承脏稿。删除产品对通用行和focus-visible的覆盖，长说明使用原`sub.wraps`变体。字体缩放复用applyDocumentTextSize，明暗切换复用applyDocumentTheme，默认新偏好为浅色110%，已有用户显式偏好继续保留。原生初始客户区660×600；原生标题栏不叠加Web模拟标题栏。仅主窗口新增两项Tauri自身theme读写权限，让原生窗口实际跟随外观，未放开shell/fs或其他管理能力。

## 两轮自查及独立参照

第一轮按前期验收截图和docs/CIS-CONTROLS.md检查，恢复壳、引导、列表及控件。随后在同一个真实Tauri WebView中，以相同660×600客户视口、Windows UA变体、浅色、110%，分别加载新产品和前期src/App.tsx复刻页。参照通过本任务localhost1420服务只读提供，不改原源码；UA仅附Electron标识选择原复刻已有的原生Windows分支，避免拿Web模拟框与原生客户区混比。原版复刻参照截图为21-original-replica-native-settings-110.png，未冒充直接运行上游Go版Magpie。

第二轮实际看图发现App档案h2过大，修正为同源行级排版；再发现遗漏共享CSS导致开关不可见，补齐样式并增加可见尺寸及真实off/on持久化验收。模型菜单检查打开、边界和Escape关闭；聊天真实流式、取消、错误回归保留。

几何验证同时使用独立shadow中的原CIS样式探针及实际原复刻页，与产品的computed值直接相等比较。没有恢复统一1CSSpx容差。110%下Chromium会把46px/212px等报告为45.9943/211.989px；早期两次驱动硬编码整数串的失败保留，之后以同引擎/同缩放的独立原样式结果比较，没有为通过测试改产品尺寸或放宽容差。CIS规则和原版CSS未改。

只读参照dev服务结束时保留到工具输出的既有MagpieIcon `/public/icons/*.svg?raw`警告。该加载写法也存在原Vite配置，不是产品新入口引入；当前参照只验已实际渲染的设置/CSS几何，不以此宣称图标资产或整套旧复刻运行通过。本批未修改原组件，未将约50k tokens的重复警告另存为全量日志。

## 结果与证据

- 最终原生CIS14项：P0-S05-cis-dev8-complete.json，含同源几何、相同原生视口复刻比较、32×19开关及thumb对应计算尺寸、真实off/on、212侧栏、唯一选中、明暗150%及原生theme确认、退出。该JSON含7份样式hash、原复刻App.tsx hash、实际样式与参照值。
- 聊天14项及模型菜单检查：P0-S05-dev8-final-chat.json；主路径16、网关10分别为P0-S05-dev8-main-regression.json、P0-S05-dev8-gateway-regression.json。只访问独占loopback可控上游，无真实付费调用。
- 产品TypeScript/Vite、oxlint、四Rust包all-targets Clippy -D warnings、DTO检查、六公共CSS guard通过。
- 最终图为P0-S05-cis-dev8-complete/的6张必要状态；前轮图/失败JSON均保留并明确限界。全部S05图片共981,503逻辑字节，低于2MiB证据容量计划，没有复制完整基线或删除旧证据。

业务差异：产品沿用三页IA而非旧复刻完整六页导航；设置只显示已实现项目，不复制尚无业务的色盲/代理等开关；不放假OAuth、订阅和供应商成功；旧复刻没有内置基础文本对话，对话用现有CIS行、卡片、菜单组合。以上不作为“所有原版页面逐像素相同”或全R01–R25通过声明。宽图为真实原生WebView的viewport emulation，不能冒充实际OS窗口被拉宽。OS截图helper仍不可用；native theme属性已验证，不宣称标题栏逐像素验收。

## 保全与继续执行

用户dev.6宿主57532/网关45736仍运行，未关闭、改写表单、复制真实data或WebView资料。dev.8将按独立版本目录发布，入口继续保护运行中的旧窗口，不把“已准备”写成“已实际打开”。本机电脑控制会话保留；图像/坐标通道故障如实记录，不用测试CDP接管用户预览。

10个本批独占fixture均在finally核验路径边界/重解析点/进程/锁后回收，5个合成凭据引用按收据删除；事后只读确认10路径均不存在。详见P0-S05-cis-dev8.json。没有新worktree/环境；复用target/node_modules/Cargo缓存，保留dist-tagma和必要证据。旧被自动审批拒绝的六合成目录继续保留，未绕过或重试。临时1420参照服务仅属于本任务，验收后结束，不影响用户预览或其他417x服务。

发行仍blocked，P0整体、真实服务预算、签名、干净机器和其他平台未完成。此项交付后继续已授权的小队配置/不可变发布/执行，后续界面必须沿用这次恢复的CIS骨架，不再自行另造风格。
