# Settings — Interaction Spec（深页）

> 对照：`index.html` `#view-settings` + `app.js` `renderSettings` / `renderPort` / `renderLAN` / `renderCORS` / `renderProxy` / `renderSync` / About 行。  
> Demo **v0.1.10**：8 个 tab 全量壳 + 主要 segs/输入/复制/搜索；状态存 `magpie.demoPrefs`（无真后端）。

## Tabs（与官方同序）

| id | 英文 | 壳层 |
|----|------|------|
| general | General | Appearance / Colorblind / Language pick / Text size / Tray / Plain names / Codex subagents / Long conversations / Login / Lightweight / Prevent sleep |
| usage | Allowances | Menu bar 系列 / Used·Left / Reads / Currency / Units(zh) / Alerts / Warm tabs Codex·Claude |
| network | Network and sharing | Proxy Auto·Off·Custom / GitHub token / Port+Apply / Bare ids / LAN share+address copy / CORS add·remove |
| models | Models | Images / Image gen / Vision MCP copy / Web search / Replies / Disabled empty |
| privacy | Privacy | Redact toggles / Agents' sign-ins Ask·Allow·Deny |
| otel | Observability | OTel on/off + endpoint |
| sync | Sync and backup | WebDAV setup fold / Sync now / Auto interval / Export·Import |
| about | About | Version·Check / What's new / Update pill·auto·every·restart / Config·Gateway URL copy / Community |

## 动效（须有）

| 控件 | Magpie | demo |
|------|--------|------|
| 进入页 | `view-in` .24s | `.view` 自带 |
| set-tabs / warm-tabs / segs | thumb **280ms** | `Segs` + `useSegThumb` |
| Language pref-pick chevron | transform **.15s** | shell-patch |
| `.copy.done` | copy-pop **.36s** / flash 1200ms | CopyBtn |
| `.text` hover | background/color **.12s** | app.css |
| toast Saved | footer `.status.ok` ~1.5–3.5s | `onStatus` |
| Find a setting | `.set-searching` 藏 tabs、页 `data-part` 标题 | `#view-settings.set-searching` |

## 嵌套未做 / 部分

- Codex titles/descriptions/predictions/auto-review/memories 的 **模型选择器 pop**（`.rt-cond` + `#pop`）
- Warm-up 具体时刻 chips、账号级 auto-reset 开关行
- Proxy SOCKS 认证字段、GitHub 完整表单
- LAN 多网卡 pick + OpenAI/Anthropic segs 地址
- Allowed addresses（allowIPs）整块
- Sync 真 WebDAV/S3/GitHub 表单字段全集、Restore 确认 modal
- About CLI / Download source / What's new 真 notes modal
- Observability 完整 OTel 字段集

## 判定

**`SETTINGS_DEEP_PARTIAL`** — 全部 tab 可点、主 segs/搜索/网络/同步/关于已接线；深层 picker/modal/账号行仍缺。
