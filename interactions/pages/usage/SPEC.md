# Usage — Interaction Spec（深页）

> 对照：`index.html` `#view-usage` + `app.js` `renderUsageTab` / `renderPeriod` / `renderUsageEvery` / ledger / sessions。  
> Demo **v0.1.13**：四 tab + period/Custom 快捷 + refresh every 菜单 + 空态 Overview/Requests/Sessions/Context。

## Tabs

| id | 英文 | 壳层 |
|----|------|------|
| usage | Overview | Scope note · Agents/Models 空态 · cost ≈$0 · refresh |
| requests | Requests | Status segs · Search · Export CSV · KPI · Metric/Split · 空列表 |
| sessions | Sessions | Range segs · Agent segs · 6 KPI · Latest sessions 空 · Search |
| context | Context | 空态说明壳 |

## 动效

| 控件 | Magpie | demo |
|------|--------|------|
| usageTab / period / sessRange | thumb **280ms** | `Segs` |
| usageEvery sess-pick | chevron **.15s**；menu | `SessPick` + `ProtoMenu` |
| usageReload busy | spin **.8s** | `RefreshSpin` |
| Custom range menu | pop | 快捷 Yesterday/This month/… |

## 判定

**`USAGE_PLUGINS_PARTIAL`** — 深层分段/筛选/空态已接；无真 ledger/heatmap/会话文件。
