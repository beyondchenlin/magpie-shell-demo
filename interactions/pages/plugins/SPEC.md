# Plugins — Interaction Spec（深页）

> 对照：`plugins.js` Built-in / Discover / Installed + `plugins.css`。  
> Demo **v0.1.13**：三 tab + 国内镜像开关 + 搜索 + Discover 分区卡 Install + Installed Options/Disable/Remove 确认。

## Tabs

| id | 壳层 |
|----|------|
| builtin | feat-say + Sessions/Library/Gateway keys/Observability Off·On |
| discover | intro · Subscriptions/Middleware/Agents 卡 · Install · Add from path 壳 |
| installed | 空态 Discover plugins · 或行内 Options 折叠 / Disable / Remove 确认 · Check for updates |

## 动效

| 控件 | Magpie | demo |
|------|--------|------|
| lib-tabs segs | thumb **280ms** | `Segs` |
| pm-card hover | border/shadow **.16s** | shell-patch |
| pm-act active | scale **.96** | shell-patch |
| lib-switch | thumb **.18s** | shell-patch |
| Install busy | 420ms 后跳 Installed | 本地 state |

## 判定

**`USAGE_PLUGINS_PARTIAL`** — 安装/启用/配置折叠演示接线；无 npm/git 真安装。
