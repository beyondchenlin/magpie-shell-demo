# Web chrome audit 2026-10-15

URL: https://magpie-shell-demo.vercel.app/ with `?_vercel_share=…` (page loaded; hard refresh Ctrl+Shift+R).
Viewport shots are CSS px, height 800, origin at the page (browser toolbar cropped off).
`html` zoom is 1.1 (text size 110%, 浅色). UI language 简体中文. No routing edits. No Duplicate/Filter opened.

## Widths (Agents, unless noted)

| file | viewport | body class | chrome |
|---|---|---|---|
| w390-agents.png | 390×800 | `window web phone-web` | Full-bleed, no side nav. Row 1: logo, refresh, gear. Row 2 tabs wrap; **Agent** white pill. Last tab clipped (`插` of 插件). |
| w752-agents.png | 752×800 | `window web phone-web` | Still top tabs (phone-web ≤760) but **framed** card on `#e8e8ec` (full-bleed only ≤520). All six tabs fit. **Agent** pill. |
| w900-agents.png | 900×800 | `window web side-nav` | Sidebar (graphite). **Agent** white row. Crumb `使用 / Agent`. Zoomed frame (~964) wider than viewport: **right edge clipped** (不能接入 / 管理 / ＋保存当前 cut off). |
| w1100-agents.png | 1100×800 | `window web side-nav` | Same sidebar. Frame still overflows (root box ~1184, stuck left): **right edge still clipped** (＋保存当前 → bare `+`). |
| w1280-agents.png | 1280×800 | `window web side-nav` | Frame fits (root x≈35, width 1210) with gray canvas. Right-side actions fully visible. **Agent** white row. |

## Selected state (clicked, nothing else)

Side-nav at 1280: exactly one `.on`.

- Agents — `#nav [data-view=agents].on` white pill. `w1280-agents.png`
- Providers — `[data-view=providers].on`, crumb `模型 / 供应商`. `w1280-providers.png`
- Routing — `[data-view=routing].on`, crumb `模型 / 路由`. Live empty stage, not edited. `w1280-routing.png`
- Settings — `#prefs.icon.on` at sidebar foot; nav buttons lose `.on`. Crumb `设置`. Segment thumbs: 浅色, 110% (not changed). `w1280-settings.png`

Top tabs at 752 (same clicks): white pill moves Agent → 供应商 → 路由 (`w752-*.png`). Settings is the header gear `#prefs.icon.on` and **no tab stays `.on`** (`w752-settings.png`). That frame is shifted left (`html` box x≈-8, root wider than 752): logo and settings section labels are clipped on the left. Gear shows a gray selected square.

## Native

`native-magpie-752.png` — existing window id 85983247, 752×652 at +200+40, left open (not closed). Routing tab pill selected. Groups filter list was **already open**; not clicked, not nested further. Chrome was minimized to uncover it.
