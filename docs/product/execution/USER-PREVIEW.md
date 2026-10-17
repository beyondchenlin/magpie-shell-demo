# 用户保留预览：不要当测试产物清理

用户询问“怎么删除了，还可以看看最新效果吗”后，2026-10-17已实际打开最新可体验窗口。原安装副本此前因明确的卸载验收移除，P0-S02-uninstall.json确认配置保留；现在提供独立且持久的预览，禁止再次以测试收尾为由卸载/删除/关闭。

- 可点击入口：[打开Tagma预览](D:/demo1/tagmaai-preview/打开Tagma预览.lnk)。桌面另有[C盘快捷方式](<C:/Users/ai/Desktop/Tagma dev.5 预览.lnk>)。
- 根目录D:\demo1\tagmaai-preview；仅复制两份运行EXE到versions\0.2.0-dev.5，合计21,170,176逻辑字节（约20.2MiB），没有环境、编译缓存或源码副本。
- 持久用户预览配置data\，WebView资料webview\；与默认安装配置、Temp测试fixture、可覆盖target完全分开。这里可能由用户加入真实配置，不能视为合成数据或执行fixture清理。
- 入口经GUI的wscript设置该预览进程环境，再直接启动GUI子系统宿主。宿主解析同目录tagma-gateway.exe；资源已嵌入，不依赖Vite/npm/cargo在后台运行。启动器不配置远程调试端口。勿直接双击版本目录内EXE绕开独立数据入口。
- 实际0.2.0-dev.5，IPC1/schema3，source36001a5；哈希及保留约定见根目录PREVIEW-MANIFEST.json及evidence/P0-S04-retained-preview.json。两EXE复制后逐字节hash一致；PE均GUI(2)。
- 已观察真实窗口Tagma（returned window991310，预览路径app），无mock，显示原生桌面、已保存1/运行中1；独立网关manifest确认dev.5/schema3、loopback9168、console_attached=false。首次默认令牌在该预览自己的系统凭据引用中，未回读或写进文档。

用户查看期间保留进程和目录。后续测试不得按进程名批量关闭Tagma，不覆盖运行中的版本文件，不为解除构建锁结束预览。需要升级时先与用户协调当前使用状态，保存配置，再发布新的版本目录并更新入口；不移动/复制真实data去可清理fixture，不静默恢复旧数据库。台账中的PID只作当时诊断，不能作为以后终止权。

当前可看三页、供应商CRUD/App档案、网关设置和诊断；真实上游推理、令牌轮换/撤销、ReachFlow尚未接入。内部未签名debug预览，不冒充正式发行安装包。

关于“旧setup只有1字节”的提示，已确认是先前混合格式输出误判，原核验方已撤回。本执行器只读确认dev.2为4,598,907字节、dev.3为4,630,772字节，均MZ头，dev.3 hash与原S02证据一致；没有重建/修改旧包。它们仍是历史版本，不作为最新体验入口或dev.5安装验收。

后续一次只读检查观察到预览进程已退出，日志为正常stop_requested/stopped；本执行器未发出关闭/停止命令，不推测或覆盖用户可能的退出动作。目录、数据和快捷方式继续保留，可由用户再次打开；窗口/PID记录指初次实际打开时的观察，不保证用户之后始终保持进程运行。
