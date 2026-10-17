# Tagma 本地运行与验证

保留原Electron演示入口；产品独立使用tagma.html、dist-tagma和com.tagmaai.desktop配置身份。不要用旧npm electron/dist:win作为产品验收。

## 开发/构建

```powershell
npm run tauri -- dev
npm run tauri -- build --debug --bundles nsis
```

Tauri hook先编译/暂存相同版本sidecar再启动Vite或打包。勿在产品版本改变后只编译宿主而使用旧binaries输入。debug和正式桌面/sidecar在Windows默认均为GUI子系统，不自动分配控制台；开发诊断用设置中的脱敏预览与应用有界日志。

独立Web预览：npm run dev:tagma，打开http://localhost:1420/tagma.html；预览不读取桌面配置，不运行本机进程。检查结束关闭本任务watch。

## 范围检查

```powershell
cargo test -p tagma-core
cargo test -p tagma-gateway
npm run contract:check
npm exec -- oxlint src/product
node scripts/tagma-pe-report.mjs target/debug/tagma-desktop.exe target/debug/tagma-gateway.exe
```

OS凭据显式合成测试只运行指定项，不用--ignored批量触发child-only崩溃fixture。真实上游需要用户授权资源和预算，不能拿这些确定性测试冒充真实推理。

原生测试（先按当前构建hook准备同版本宿主和sidecar）：

```powershell
pwsh -NoProfile -File scripts/test-tagma-native.ps1 -ResultPath .cache/tagma-test-results/unique-result.json -Mode full
pwsh -NoProfile -File scripts/test-tagma-native.ps1 -ResultPath .cache/tagma-test-results/unique-recovery.json -Mode recovery
cargo build -p tagma-core --example cleanup_native_fixture --locked
pwsh -NoProfile -File scripts/test-tagma-native.ps1 -ResultPath .cache/tagma-test-results/unique-gateway.json -Mode gateway
```

结果和截图目标必须用新路径；不会覆盖旧证据。驱动只创建自身UUID目录，真实native WebView/IPC/SQLite/sidecar，Windows不隐藏控制台来凑通过。finally先保全结果，再检查并清理本次fixture；发现引用/重解析点/锁则保留报告。debug-only测试配置目录不作为正式用户配置导入。

gateway模式在独占fixture显式测试正常默认令牌创建（TAGMA_TEST_INITIALIZE_TOKEN仅debug生效），finally调用同版本cleanup_native_fixture开发辅助程序，仅删除receipt匹配的Temp库中明确引用的合成系统凭据，不扫描凭据库或处理默认用户目录；辅助程序失败时保留fixture。普通合成模式不默认创建系统令牌，避免无关回归产生凭据垃圾。正式版忽略所有测试路径/端口覆盖。

## 证据边界

执行状态以EXECUTION-STATUS.md为准。当前仍是Windows内部未签名候选，macOS优先首发、Linux独立验收及签名条件未改变。AppProfile配置、持久端口/鉴权已有局部验证；令牌撤销/轮换、P1真实上游、小队、用量、ReachFlow和多入口按台账推进，不能把壳与空网关算成产品全完成。
