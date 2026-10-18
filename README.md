# TagmaAI

正式产品使用 React/CIS + Tauri 2 + Rust 独立网关。当前内部候选为 **0.2.0-dev.17**；P0 的原生保存、重启和自由拖动仍需完成实际验收，不能把构建成功当成可用性通过。进度以 [执行状态](docs/product/execution/EXECUTION-STATUS.md) 为准。

## Tagma 开发与内部 Windows 构建

复用项目 Node/npm、Rust（最低 1.98）、MSVC 和 WebView2 环境，保持 package-lock.json/Cargo.lock。安装依赖或全量构建前按本机磁盘规则检查空间。

```powershell
# 已有依赖可复用；仅首次或锁文件变化时 npm ci
npm run tauri -- dev

# 内部未签名 debug 候选，自动构建正式前端和独立 Rust sidecar
npm run tauri -- build --debug --bundles nsis

# 保存与进程恢复的受控检查，不替代原生 UI 验收
cargo test --offline --locked -p tagma-core --test startup_upgrade --test save_restart
cargo test --offline --locked -p tagma-gateway --test process_lifecycle save_while_stopped_is_durable_and_applied_only_after_restart -- --exact
```

安装包输出在 `target/debug/bundle/nsis/`。默认桌面启动使用应用配置目录；验收必须使用独占数据/WebView/端口的隔离实例，不拿用户资料做测试。`npm run dev:tagma` 只提供 Web 预览，不能代替原生配置保存。

[Tagma Windows 工作流](.github/workflows/build-tagma-windows.yml) 仅手动运行，上传短期内部构建产物，不发布 GitHub Release；当前尚未在 CI 执行。项目定时任务保持暂停。旧 `dist:win` 和旧 Windows 工作流构建的是下面的 Electron 外观演示。

## 历史 Magpie Shell Demo

Magpie **桌面壳视觉复刻进行中**（假数据）。用于 PackGate 外观对标，**不是**官方 Magpie，也未接真实网关。

对照上游：[yetone/magpie](https://github.com/yetone/magpie)（MIT）。

**当前判定：`VISUAL_EMPTY_MATCH`**（Agents/Providers/Routing **空态**已按官方截图+源码重写；非整产品 1:1，不标 PASS_WITH_GAPS）。详见：

- [`MAGPIE-TEARDOWN.md`](./MAGPIE-TEARDOWN.md) — Magpie 壳源码拆解  
- [`GAP-MATRIX.md`](./GAP-MATRIX.md) — 与本 Demo 的差距矩阵（含 P0）  
- [`ACCEPTANCE.md`](./ACCEPTANCE.md) — 验收清单（已撤销虚假 PASS）

## 链接

- **Web 预览：** https://magpie-shell-demo.vercel.app （`#routing` `#agents` …）
- **源码：** https://github.com/beyondchenlin/magpie-shell-demo
- **下载（Release）：** https://github.com/beyondchenlin/magpie-shell-demo/releases/tag/v0.1.1
  - **Windows：** [Setup .exe](https://github.com/beyondchenlin/magpie-shell-demo/releases/download/v0.1.1/Magpie-Shell-Demo-Setup-0.1.1.exe) + [portable](https://github.com/beyondchenlin/magpie-shell-demo/releases/download/v0.1.1/Magpie-Shell-Demo-0.1.1-portable.exe)
  - **Linux：** `Magpie-Shell-Demo-0.1.1.AppImage`

> 安装包可跑，**不代表**视觉已 1:1。P0 清掉前请以 GAP-MATRIX 为准。

## 快速打开（Web）

```bash
npm install
npm run dev
# 或
npm run build && npx vite preview
```

哈希路由：`#routing` `#agents` `#providers` `#gateway` …

## 安装桌面版

### Windows

从 [Release v0.1.1](https://github.com/beyondchenlin/magpie-shell-demo/releases/tag/v0.1.1) 下载 Setup 或 portable。目标窗 **660×600** / 最小 **560×420**（与 Magpie `window_rule.go` / `textsize.go` 一致）。

```bash
npm ci && npm run dist:win
```

### Linux

```bash
chmod +x Magpie-Shell-Demo-0.1.1.AppImage
./Magpie-Shell-Demo-0.1.1.AppImage
```

### Tauri

这里的 Electron 包仅用于历史外观对标。正式 Tagma 构建使用上面的 Tauri 入口，缺少平台依赖时不能用 Electron 包代替交付。

## 技术

- Vite + React + TypeScript  
- 复用 Magpie `app.css` / `routing.css`（同名 class）  
- Electron 打包；中文对照 `i18n.js` zh  

## 范围

- **已对齐：** design tokens、侧栏 IA/中文顺序、部分页面骨架、Electron 默认尺寸  
- **P0 未齐（勿称 1:1）：** Routing 飞鸟 `.rt-sky`、舞台 DOM（log/more）、Hub/策略文案、账号行 DOM、Web 画布比例、Brand 位置等 — 见 `GAP-MATRIX.md` Top 5  
- **不做：** 真实 Agent 扫描、网关进程、Sessions/Library 内核、Wails 托盘 glide  
