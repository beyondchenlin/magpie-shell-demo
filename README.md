# Magpie Shell Demo

**1:1 视觉复刻 Magpie 桌面壳**（假数据）。用于 PackGate 外观对标验收，**不是**官方 Magpie，也未接真实网关。

对照上游：[yetone/magpie](https://github.com/yetone/magpie)（MIT）。验收清单见 [`ACCEPTANCE.md`](./ACCEPTANCE.md)。

## 链接

- **Web 预览：** https://magpie-shell-demo.vercel.app （`#routing` `#agents` …）
- **源码：** https://github.com/beyondchenlin/magpie-shell-demo
- **下载（Release）：** https://github.com/beyondchenlin/magpie-shell-demo/releases/tag/v0.1.0
  - **Windows：** [Magpie-Shell-Demo-Setup-0.1.0.exe](https://github.com/beyondchenlin/magpie-shell-demo/releases/download/v0.1.0/Magpie-Shell-Demo-Setup-0.1.0.exe)（NSIS 安装包，推荐）+ [portable](https://github.com/beyondchenlin/magpie-shell-demo/releases/download/v0.1.0/Magpie-Shell-Demo-0.1.0-portable.exe)
  - **Linux：** `Magpie-Shell-Demo-0.1.0.AppImage`

## 快速打开（Web）

```bash
npm install
npm run dev
# 或预览构建产物
npm run build && npx vite preview
```

部署后打开对应 Vercel URL；哈希路由：`#routing` `#agents` `#providers` `#gateway` …

## 安装桌面版

### Windows（推荐）

从 [Release v0.1.0](https://github.com/beyondchenlin/magpie-shell-demo/releases/tag/v0.1.0) 下载：

| 文件 | 说明 |
|------|------|
| [`Magpie-Shell-Demo-Setup-0.1.0.exe`](https://github.com/beyondchenlin/magpie-shell-demo/releases/download/v0.1.0/Magpie-Shell-Demo-Setup-0.1.0.exe) | NSIS 安装包（可选路径、桌面快捷方式） |
| [`Magpie-Shell-Demo-0.1.0-portable.exe`](https://github.com/beyondchenlin/magpie-shell-demo/releases/download/v0.1.0/Magpie-Shell-Demo-0.1.0-portable.exe) | 免安装便携版 |

双击 Setup 安装即可。默认窗口 **660×600**，最小 **560×420**。

本地构建（需在 Windows，或 CI）：

```bash
npm ci
npm run dist:win
```

### Linux

```bash
chmod +x Magpie-Shell-Demo-0.1.0.AppImage
./Magpie-Shell-Demo-0.1.0.AppImage
```

```bash
npm run dist:linux
```

### macOS

```bash
npm run build
npx electron-builder --mac   # 需在 macOS
```

### Tauri 说明

目标栈仍是 Tauri 2；本机（box）缺少 `libwebkit2gtk-4.1-dev` 且无 sudo，**未能在此编出 Tauri 原生包**。Electron 包作为可安装替代物交付；UI 为同一套 Web 资源。

## 技术

- Vite + React + TypeScript
- 直接复用 Magpie `app.css` / `routing.css`（同名 class）
- Electron 打包桌面窗（Windows NSIS / portable + Linux AppImage）
- 中文文案对照 Magpie `i18n.js` zh

## 范围

已做：侧栏、Agent / 供应商 / 路由舞台 / 网关 / 用量等页、策略切换、账号打码、主题设置。  
未做：真实 Agent 扫描、网关进程、飞鸟完整时序动画、Sessions/Library 内核。
