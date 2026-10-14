# Usage (native Linux, magpie ~0.1.1233)

Top tabs stay: Agents, Providers, Routing, Gateway, Usage, Plugins, plus refresh, gear, window close. Usage is a view (`#view-usage`), not a modal. Segment thumb uses the app glide (~280ms, cubic-bezier(.2,.8,.2,1)); opening a menu is a pop, no page morph.

## Head (every tab)

- Sub-tabs `#usageTab`: Overview, Requests, Sessions, Context. Persisted `magpie.usageTab`.
- Period `#period` on Overview and Requests: Today, 7 days, 30 days, All, plus a calendar opt (Custom). A picked range replaces the calendar label (`Oct 13`, `Oct 1 – Oct 11`, `Jul 17 – Oct 14`, `Sep 1 – Sep 30`) and wraps onto a second row when the label is long.
- Sessions replaces that with `#sessRange`: Today, 7 days, 30 days (default), 90 days, All. No calendar.
- Context replaces it with `#ctxRange`: Today, 7 days (default, `magpie.ctxDays`), 30 days.
- Refresh icon `#usageReload` and interval `#usageEvery`: Off, 5 s (default), 10 s, 30 s, 1 min. Menu title "Refresh every". Persisted `magpie.usageEvery`. Restored to 5 s.
- Cost `#usageCost`: `≈$0.000` plus tooltip "effective prices" / unpriced note. Not a button.

## Overview (`usage` tab)

Empty when `calls == 0`: chart, Agents, Models, Accounts, Gateway keys heads are hidden. Card copy:

- Today: "No calls today."
- 7 days: "No calls in the last 7 days."
- 30 days: "No calls in the last 30 days."
- All: "No calls yet."
- Custom days: "No calls on the days picked."

Plus "Point an agent at a catalog model and use it; every call through the gateway is counted here." Scope line: "Gateway calls only; session-log calls are in Requests. Local rejections are excluded from totals."

With data (not present here): KPI tiles (tokens, cache read, reasoning, calls), bar chart, agent/model/account/key rows, Hide accounts (`#usageMask`), quota trend.

### Calendar (`openRangeMenu`)

Dialog "Pick days". Quick: Yesterday, This month, Last month, 90 days. Month nav (prev/next; next disabled on the current month). Hint "Pick the first day, then the last" then "Now the last day". Ends are filled pills, days between shaded, today is blue. Hover on a day is a light rounded square. Tooltip on the period pill: "Days picked: …". Restored to Today.

## Requests (`#ledgerPane`)

- Status segs `#ledStatus`: All, Failed, Retried. Retried tooltip: "Show only the requests answered on a retry." Thumb slides. Empty still says "No calls today." and "0 requests".
- Scope: "Gateway and session-log calls; local rejections excluded from totals."
- Search `#ledQ` placeholder "Search models, providers, sessions". Focus ring blue. Typed `opus` shows a clear × inside the field. Escape or the × clears. Restored empty.
- Export CSV `#ledExport` is disabled when `total == 0` (click does nothing, no dialog).
- Hidden until the period has rows: computer/agent/purpose/provider/account/key picks, route chip, KPI strip, metric + Split by, heatmap (53 weeks), table, pager, via tiles (through / direct / reported).

## Sessions

Empty card: "No sessions yet. Claude Code's, Codex's, OpenCode's and Pi's sessions on this computer show up here, with what each cost and the command that resumes it." Note: "Totals count native sessions and gateway requests with a session ID · 0 sessions · ~/.claude ~/.codex ~/.cursor". Agent/model/folder picks, chart, project grid, list search and All sessions stay hidden with no sessions. Range clicks only change the selected pill; the empty copy does not name the range. Restored to 30 days.

## Context

- TUNED FOR YOU: replay note, then "Not enough calls in this range to tune on".
- THROUGH MAGPIE: prompt note, dashed empty "No prompts read yet" / "Requests your agents send through magpie show here."
- With data (not present): agent cards (score ring, score bars), tune cards ("Up to N% fewer"), session list. No extra controls in the empty state. Page does not scroll. Left on 7 days.

## Shots

`02`–`19` overview periods and the range dialog (yesterday, Sep/Oct nav, first-day then last-day, Oct 1–11 highlight, 90 days, this month, last month). `20`–`27` refresh menu and intervals, restored 5 s. `28`–`35` Requests status, search, disabled export. `36`, `46`–`50` Sessions ranges. `42`–`45` Context (7 days, today, 30 days). `37`–`41` are the same Context page from mis-aimed range clicks; prefer `42`–`45`.

## Left state

Usage on Sessions, range 30 days, refresh every 5 s. No plugin installed. No export file. Gateway page still on.
