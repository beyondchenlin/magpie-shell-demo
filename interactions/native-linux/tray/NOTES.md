# Tray / quick panel — native Linux (magpie 0.1.1240)

中文：这台机器没有 StatusNotifierWatcher，托盘图标注册失败（日志 `systray error: failed to register`）。快速面板用 `magpie panel` 打开（第二个进程；单实例交接没挂上正在跑的主窗口）。面板 484×572（字号 110%，即 440×520 CSS）。Allowances 标签在没有订阅/余额时整段隐藏，本机只有 Agents · Usage · Routing。没有保存密钥。Cursor 模型曾被误点成 auto，已把 `~/.cursor/cli-config.json` 和 `applied.json` 还原成 `{}`，行上仍显示 default。主窗口（pid 仍在，610,300 / 752×652）未关。Gateway 的 Restart busy 已在 `gateway/NOTES.md`（24–26），这次不重复。

Window is the frameless quick panel (`body.panel`), not the main card. Tabs: **Agents**, **Usage** (totals; `data-ptab=stats`), **Routing**. **Allowances** (`data-ptab=usage`) is omitted when there is no subscription or balance (`#ptabs [data-ptab=usage]` hidden). This machine has none, so the tab cannot be opened. Footer on Agents: Profiles · Open magpie · Quit. On other tabs Profiles is hidden. Escape hides the panel (`HideOnEscape`). Open magpie / gear / Quit were not clicked (they leave the panel or quit). No key was saved.

This panel process does not hold port 3425 (the already-running magpie does), so Routing says the gateway isn't running. That string is real for a panel whose process is not the listener; it is not the main window's gateway state.


## Consumed in demo v0.1.36 (TRAY_CONSUME)
- **01** Agents empty row · **02–06** Usage periods + Refresh now tip · **07** Routing gateway-not-running
- **08** Cursor row open (model field) · **09** ModelPop Default/auto · **10** Profiles empty popover
- **11–13** header tip titles · **14** handle tip `~/.cursor/cli-config.json`
- **Allowances:** N/A — Magpie hides the whole tab when there is no subscription/balance (not a missing UI)

## 01-agents.png (consumed v0.1.34 · reaffirm v0.1.36)
- body.panel · brand magpie · sync / open-window / prefs
- ptabs: Agents(1) · Usage · Routing — Allowances hidden (no quotas)
- Cursor row: icon · name · ag-sum "default" · eff[data-l=3] · chev
- foot: Profiles | Open magpie | Quit
- Demo: `?panel=1` or `#panel` or localStorage magpie.demoPanel=1

## 02-usage-today.png (consumed v0.1.35 · reaffirm v0.1.36)
- ptabs: Agents · Usage(on) · Routing (Allowances still hidden)
- pu-bar: Today|7 days|30 days|All segs + refresh + Open Usage
- usage-note: Gateway and session-log calls…
- pu-none: No requests today + Every request an agent…
- foot: Open magpie | Quit (no Profiles on non-agents tab)

## Usage periods (03–06) — consumed v0.1.36
Thumb moves inside the period segment. Empty copy changes with the period. No provider picker and no four-total/chart (no requests, no providers in the answer).

| shot | control | seen |
|---|---|---|
| 03-usage-7d | 7 days | **No requests here** (not "today") + same Every request… sentence |
| 04-usage-30d | 30 days | same **No requests here** |
| 05-usage-all | All | same **No requests here** |
| 06-usage-refresh-tip | hover the bar's refresh | tooltip **Refresh now** (covers the right of the empty card) |

Open Usage was not clicked.

## 07-routing.png — consumed v0.1.36
Routing tab selected (white thumb). Under the tabs, left: green dot + **today 0 calls · 0 tokens**. Right: **Open Routing** (not clicked; it would open the main window). Card: **The gateway isn't running, so nothing is routed.** No request rows, no stage of agents→magpie→providers (nothing has been routed). Allowances still absent.

## Agents nested (08–10, 14) — consumed v0.1.36
| shot | control | seen |
|---|---|---|
| 08-agents-open | click the Cursor row (not the handle) | row grows in place. Line: label **model**, value **default**, cursor cube, chevron. Summary on the right stays **default** + effort bars |
| 09-model-menu | click that field | menu: **Filter, or type any model id…**; left rail grid + star; **Default** (check) "what Cursor ships with"; **auto** "let Cursor pick". Left on Default. Did not keep another pick |
| 10-profiles | Profiles in the footer | popover upward: **PROFILES** / **none yet · save the setup to switch back in one click** / **+ Save current**. Save not clicked |
| 14-handle-tip | hover the row handle | tooltip `~/.cursor/cli-config.json` (path only, no secret) |

## Header tips (11–13) — consumed v0.1.36
Tooltips are clipped by the panel's right edge.

| shot | icon | tooltip |
|---|---|---|
| 11-tip-sync | refresh | Look for agents on this computer again: one just installed… (clipped; full string continues "or removed, or its settings changed") |
| 12-tip-open | open-in-window | **Open as a window** (clipped at the edge) |
| 13-tip-settings | gear | **Settings (C…** — Settings (Ctrl+,) clipped |

## Not recorded
- Allowances body (Arrange, rings, Used/Left, totals on that tab): tab not in the DOM while there are no quotas.
- Usage chart / Tokens·Requests·Cost·Cache totals: no requests, so the empty card stays.
- Filter-miss inside the model menu, star rail, Save current, Open Usage, Open Routing, Open magpie, Quit.
