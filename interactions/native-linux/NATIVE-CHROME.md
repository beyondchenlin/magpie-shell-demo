# Native Linux Magpie chrome vs web side-nav

**Gold for desktop 1:1:** `interactions/native-linux/shots/` (CLICK-LOG.md + N-00…N-09).  
**Wrong target for desktop 1:1:** Magpie **web / wide-window side-nav** (`body.side-nav`).

## Two Magpie shells (same app)

| | Native Linux window (gold) | Web / side-nav |
|---|---|---|
| Frame | Frameless floating card; app draws close X on the tab strip | Browser chrome around full-viewport page |
| Nav | **Top tabs:** Agents, Providers, Routing, Gateway, Usage, Plugins | **Left sidebar** groups: Work / Models / Insights / Extend |
| Models | Not a top tab | Sidebar item under Work |
| Settings | Gear on the **right of the tab strip**. Opens in place; top tabs stay, **none selected**. Section nav = **second horizontal row** (GENERAL, ALLOWANCES, …) | Gear at **sidebar foot**. Sections = **vertical list** + breadcrumb |
| Other | Bird mark + side-toggle square; refresh + gear + close on the strip. No breadcrumb. No gateway status in a sidebar foot. | Breadcrumb; refresh in content header; sidebar footer gateway dot |
| Size | Measured **712×652** at +630+300 on 1920×1200 (~37%×54% of desktop). Magpie default window_rule ~660×600. Compact panel, not maximized. | Fills browser viewport |

## Source

- `body.window` without `side-nav` → `#nav` stays in `.top` (centered / inrow tabs)
- `layout.js` adds `body.linux` on Linux desktop
- `app.js` `sideNav()` / `layoutNav()`: at ≥1024px (or saved pick) moves nav into sidebar; narrow / `navPick=top` keeps header tabs
- `body:not(.window.linux) #winclose { display: none }` — close control is Linux titlebar chrome

## Demo policy (v0.1.6+)

- Default chrome = **native top tabs** (`body.window.linux`, no `side-nav`)
- Web preview frames `#root` at **712×652**
- Electron default window **712×652**
- Side-toggle is visible but does **not** switch to side-nav (toast explains gold)
- Side-nav remains documented as web/wide layout only — **not** acceptance gold for desktop exe

## Verdict

`NATIVE_CHROME_PARTIAL` — outer chrome + empty tab pages aligned to native shots; full per-control interaction still follows INTERACTION-PLAN.
