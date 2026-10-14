# Win / Mac Magpie chrome (desktop gold)

**Gold for Windows `.exe` / Mac-like marketing:** compact **top tabs**, not web side-nav, not Linux in-page close.

## Research (source + shots)

### Default nav: top tabs on Win AND Mac

| Fact | Evidence |
|------|----------|
| Default window size | `internal/gui/window_rule.go`: `windowW, windowH = 660, 600` |
| Side-nav breakpoint | `app.js` `SIDE_AT = 1024`; `layoutNav()` turns `side-nav` on only if `navPick==="side"` **or** (no pick and `min-width: 1024`) |
| Default 660×600 | **660 &lt; 1024 → top tabs** on every platform |
| Side-nav when | User widens/maximizes past 1024, or toggles sidebar and saves `magpie.navLayout=side`, or **web** at a wide browser viewport |

So: **Win/Mac default chrome is top tabs**, same IA as Linux’s narrow window. The earlier Linux native shots (N-00…) are still valid for *page content*; they are *not* wrong for “top vs side.” What differs is **title bar**, not the tab strip vs sidebar.

### Title bar differences (the real platform split)

| | Windows | Mac | Linux |
|---|---|---|---|
| System title bar | **Kept** (`titlebar_other.go`: `plainTitlebar` no-op) | Hidden inset + traffic lights (`MacTitleBarHiddenInset` + `plainTitlebar`) | Client-decorated (`plainTitlebar` GTK) |
| In-page brand | **Hidden** (`body.window:not(.mac):not(.linux):not(.web) .brand`) | Shown (padding for traffic lights) | Shown |
| In-page `#winclose` | **Hidden** | Hidden | **Shown** (round X) |
| Actions | refresh + gear | refresh + gear | refresh + gear + close |

### Marketing vs web shots

| Shot | Chrome |
|------|--------|
| `site/public/img/agents-light.png` / `agents-zh-light.png` | **Top tabs** + brand + refresh/gear (Mac/marketing look; Sessions/Library on when plugins enabled) |
| `/workspace/magpie-official/shots/*` (`magpie web` wide) | **Left side-nav** + breadcrumb — wide viewport / web, **not** Win/Mac default window |

## Demo policy (v0.1.7+)

- **Electron Windows exe:** `body.window` (no `linux`/`mac`/`web`) → OS title bar, brand hidden, no winclose; size **660×600**
- **Web preview:** `body.window.web` → framed 660×600 card, brand visible (marketing-like)
- **Do not** force `body.linux` or in-page X
- **Do not** treat side-nav as Win/Mac default gold
- Linux native folder kept as content reference only: `interactions/native-linux/`

## Verdict

`WIN_MAC_CHROME_PARTIAL` — top-tab shell aligned to Win/Mac default + Windows titlebar for exe; full page interactions still partial.
