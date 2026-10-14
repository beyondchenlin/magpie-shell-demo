# Usage — Interaction Spec（深页）

> 对照：`index.html` `#view-usage` + `app.js` `renderUsageTab` / `renderPeriod` / `renderUsageEvery` / ledger / sessions。  
> Demo **v0.1.15**：四 tab；Requests 空态藏 ledDash（可切演示图）；Sessions 对齐 `#sessionsPane` DOM；Context 对齐 context.js 空态。

## Tabs

| id | 英文 | 壳层 |
|----|------|------|
| usage | Overview | Scope note · Agents/Models 空态 · cost ≈$0 · refresh |
| requests | Requests | Status segs · Search · Export CSV · 空态（ledDash hidden）· 演示图开关 |
| sessions | Sessions | Range segs · Agent segs · stats.empty「No sessions yet…」· sessChart/Grid hidden · Search |
| context | Context | ctxRange 天数 segs · Through magpie ·「No prompts read yet」 |

## 动效

| 控件 | Magpie | demo |
|------|--------|------|
| usageTab / period / sessRange | thumb **280ms** | `Segs` |
| usageEvery sess-pick | chevron **.15s**；menu | `SessPick` + `ProtoMenu` |
| usageReload busy | spin **.8s** | `RefreshSpin` |
| Custom range menu | pop | 快捷 Yesterday/This month/… |

## 判定

**`USAGE_PLUGINS_PARTIAL`** — 深层分段/筛选/空态已接；无真 ledger/heatmap/会话文件。
