# Usage — Interaction Spec（深页）

> 对照：`index.html` `#view-usage` + `app.js` `renderUsageTab` / ledger / sessions + `context.js`。  
> Demo **v0.1.16**：四 tab；**演示数据开** 默认：Requests ledger 行+KPI+展开详情；Sessions **6 KPI** + list rows；Context **ctx-agent** 卡片（ring/scores/tags/facts/mix）。可关回空态。

## Tabs

| id | 英文 | 壳层 |
|----|------|------|
| usage | Overview | Scope note · Agents/Models 空态 · cost ≈$0 · refresh |
| requests | Requests | Status segs · Search · Export · **ledDash KPI** · **table.led** 行展开 · pager |
| sessions | Sessions | Range · Agent segs · **stats.six** 6 KPI · Latest sessions 行 |
| context | Context | ctxRange · Through magpie · **ctx-agents** 卡片 |

## 动效

| 控件 | Magpie | demo |
|------|--------|------|
| usageTab / period / sessRange | thumb **280ms** | `Segs` |
| usageEvery sess-pick | chevron **.15s**；menu | `SessPick` + `ProtoMenu` |
| usageReload busy | spin **.8s** | `RefreshSpin` |
| led-row open | row hover + detail fade-in **.18s** | `ledOpen` |
| ctx-ring .arc | **ctx-arc .9s** | context.css |
| ctx-bar i | grow **.7s** | context.css |
| Custom range menu | pop | RangeCalendar |

## 判定

**`AGENTS_USAGE_PARTIAL`** — Usage 填充态 DOM/CSS/动效已接（演示数据）；无真 ledger API / heatmap / 会话文件。Plugins Disable 确认 + Install busy；Agents Manage 多 agent；Providers 账户/模型折叠；Routing 组卡 + ModelPop + Conditions。
