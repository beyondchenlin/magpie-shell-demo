# 用户自行安装的 dev.16 安装包

2026-10-18，用户经监督聊天明确要求“我想看最新的效果 请帮我生成一个exe文件 我安装查看 同时你自己删除这三个旧的”，图示为桌面Tagma dev.5预览/Tagma最新预览/Tagma三图标。本批优先交付当前完整候选安装包，不等待P2激活开发；禁止电脑控制继续，未运行安装器、桌面宿主或关闭/升级用户应用。

交付文件：[Tagma_0.2.0-dev.16_x64-setup.exe](D:/demo1/tagmaai-deliveries/0.2.0-dev.16/Tagma_0.2.0-dev.16_x64-setup.exe)，6614234字节（6.31MiB），SHA256 2987fcb829182878f2ce62d6878043c898697c052b3538b5e538981f3ab75c72。原构建位于target/debug/bundle/nsis同名文件；固化副本哈希相同，附BUILD-MANIFEST.json和安装说明.txt。内部未签名debug、Windows x64 NSIS，不冒充正式发行；PE版本资源为0.2.0-dev.16，config10/usage2。真实窗口/物理拖动未验，用户自行安装查看，拖动仍未通过。

来源e876320b8f2bf66540b6838591f662d60cf9f5b5，加原有未提交工作区（没有commit/reset继承修改）；构建前299源文件完整hash清单、dirty状态及聚合SHA已记录，打包后299逐项重核无变化。复用原Rust1.98/MSVC、锁文件、node_modules、Cargo/NSIS缓存，CARGO_NET_OFFLINE=true。执行tauri build --debug --bundles nsis --ci -- --locked --offline，真实新构建Exit0，不改名冒充旧dev9包；TS/Vite通过，源模型/SSR25通过，chrome与六CIS样式guard通过，没有扩大IPC/UI/真实云服务矩阵。P2原始签名/准备/只读发现只在核心内，无安装/健康/激活或队员运行UI，不把Prepared显示成Installed。

包内静态核验：7-Zip流到内存、不落解包目录、不执行EXE。tagma-desktop.exe 20165632字节、tagma-gateway.exe 10099712字节，均AMD64/GUI subsystem；后者与本批独立Rust sidecar逐字节hash相同。NSIS脚本File输入也对应主宿主及src-tauri/binaries本轮sidecar，验证不是仅网页/演示shell。

最初核对宿主与构建目录原EXE hash不同，原结果保留。定位完整文件差异只在偏移15311400的3字节UNK→NSS；这是Tauri NSIS打包将__TAURI_BUNDLE_TYPE_VAR_UNK改为__TAURI_BUNDLE_TYPE_VAR_NSS，打包后恢复未打包原文件。依据[官方打包源码](https://github.com/tauri-apps/tauri/blob/dev/crates/tauri-bundler/src/bundle.rs)及真实构建日志，用原宿主内存副本仅做唯一标记替换，再与包内原始字节完整hash核对一致，没有放宽成忽略任意差异或重新制作包。包内宿主hash1eeaefd4fb684249f2b3454a01666d860387fbf0ee5c9a1b994542f0e2619319；sidecar hash5fcd62356c55877b2917eaa2ec1513fef966765db625ced1a6cbaa18aa57bb8d。未签名检查只读，PowerShell泛化StatusMessage不是实际启动错误，因为没有运行包。

三个桌面.lnk已由监督聊天按用户此次直接授权，在2026-10-18T02:23:35.3252418Z完成精确非递归删除并记录SUPERVISION-LOG。执行者本批只读复查C:/Users/ai/Desktop/Tagma dev.5 预览.lnk、Tagma 最新预览.lnk、Tagma.lnk均不存在，没有再次删除/重建。只删除快捷方式，不卸载/删应用二进制、预览data/webview、数据库或凭据。此授权不覆盖之前拒绝的250个target文件；本批仍250存在/250身份大小mtime保持，不重试被拒清理。

空间计划峰值新增2.0GiB、C临时0.3GiB，复用现有目录且预留10GiB。前C46.82/D37.68→后C46.77/D36.2GiB；差额包含并发写入，非精确任务峰值/净释放。保留新安装包与清单约6.4MiB、既有target/dist/cache/全部旧证据，无新worktree/环境/解包目录，没有运行后fixture待清。用户安装仍保持此前dev.9事实，本执行者不能声称dev.16已安装或已看到新效果。其余PRD出口未过；交付后继续独立非UI安装事务工作。
