# Settings — Interaction Spec（深页）

> 对照：`index.html` `#view-settings` + `app.js` `renderSettings` / `renderPort` / `renderLAN` / `renderCORS` / `renderProxy` / `renderSync` / About 行。  
> Demo **v0.1.15**：8 tab + Models `#pop`（含 Disable 左轨 grid/star +「No matches.」）+ Privacy 个人数据嵌套 / Regex 样本 / Subscription accounts；状态存 `magpie.demoPrefs`。

## Tabs（与官方同序）

| id | 英文 | 壳层 |
|----|------|------|
| general | General | Appearance / Colorblind / Language pick / Text size / Tray / Plain names / Codex subagents / Long conversations / Login / Lightweight / Prevent sleep |
| usage | Allowances | Menu bar 系列 / Used·Left / Reads / Currency / Units(zh) / Alerts / Warm tabs Codex·Claude |
| network | Network and sharing | Proxy Auto·Off·Custom / GitHub token / Port+Apply / Bare ids / LAN share+address copy / CORS add·remove |
| models | Models | Image recognition `#pop` / Image gen `#pop`+Library link / Vision MCP / Searches `#pop` / Search APIs 壳 / Replies 真三行 / Disable… |
| privacy | Privacy | Mask secrets·personal（嵌套 REDACT_KINDS）/ Hide accounts / Masked words / Prefix·Regex rules / Count·Share / Subscription accounts Off·On |
| otel | Observability | OTel on/off + endpoint |
| sync | Sync and backup | WebDAV setup fold / Sync now / Auto interval / Export·Import |
| about | About | Version·Check / What's new / Update pill·auto·every(含30min)·restart / **Download source** GitHub·mirror / Config·CLI·Gateway / Community |

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

- Image/Search `#pop` **已接**（demo 模型列表）；真 visionModels / searchChoices 未接后端
- Search APIs 本地 Add/Show/Copy/Remove 已接；真 vendor 后端未接
- Disable… `#pop` 已接左轨（All models / Favorites）+ 空态「No matches.」；真 catalog 未接后端
- Warm-up 账号级 check-in；Proxy/LAN/Sync 深层已大部分接线
- What's new 为演示 modal；无真 release notes

## 判定

**`PRIVACY_NESTED_PARTIAL` → Privacy 63–70 + Disable 左轨** — REDACT_KINDS 嵌套 / Regex 样本交换 / Subscription accounts；Disable `#pop` grid·star +「No matches.」。
