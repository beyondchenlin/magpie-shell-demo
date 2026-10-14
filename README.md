# Magpie Shell Demo

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

目标栈仍是 Tauri 2；构建环境缺 `libwebkit2gtk` 时用 Electron 包替代。

## 技术

- Vite + React + TypeScript  
- 复用 Magpie `app.css` / `routing.css`（同名 class）  
- Electron 打包；中文对照 `i18n.js` zh  

## 范围

- **已对齐：** design tokens、侧栏 IA/中文顺序、部分页面骨架、Electron 默认尺寸  
- **P0 未齐（勿称 1:1）：** Routing 飞鸟 `.rt-sky`、舞台 DOM（log/more）、Hub/策略文案、账号行 DOM、Web 画布比例、Brand 位置等 — 见 `GAP-MATRIX.md` Top 5  
- **不做：** 真实 Agent 扫描、网关进程、Sessions/Library 内核、Wails 托盘 glide  
