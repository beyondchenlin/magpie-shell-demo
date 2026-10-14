# Gateway — native Linux (magpie 0.1.1233)

Window: frameless card, class `magpie`, **712×652 at +630+300** on 1920×1200. Shots are native window pixels (shadow included), not the 1280×800 desktop scale. Chrome for these shots is **top tabs** (Agents, Providers, Routing, Gateway, Usage, Plugins). The process had `localStorage magpie.navLayout=side` (left sidebar). Side-toggle (`#sideToggle`, tooltip `Hide sidebar (Ctrl+Shift+S)`) switched it to top tabs. CSS wants a 0.5s view-transition (`cubic-bezier(.32,.72,0,1)`): sidebar slides, each tab flies. On this WebKit the X11 grab showed a **single-frame snap** (≤16ms at 60fps); do not assume painted intermediates.

`settings.json` `textSize` is **110** (not 100). Page is light.

## Chrome (this page)

Left → right: bird mark, side-toggle (sidebar glyph, left pane filled while sidebar is on), tabs as a segment with a white **thumb**, then refresh (up arrow), gear, close X. Selected tab is the thumb under the label. Gateway tab sits between Routing and Usage.

Thumb glide (shared by API tabs, example language, OS, settings segments): **280ms**, easing `cubic-bezier(.2,.8,.2,1)` (`--ease`). Animates `translateX` + `width` via WAAPI id `thumb`. Opacity fade on the thumb is 0.15s. `.thumb.still` disables transition when jumping.

## Page, top to bottom

1. **Status card** (`#gateway`)
   - Green dot + **Gateway** + green **running**.
   - Sub: `0 models · no agent routed through it yet · five APIs, one URL`.
   - URL chip `http://127.0.0.1:3425` (click copies).
   - Button **Restart gateway** (`.text.action.gw-fix`).
2. Note (`#gatewayKeysOff`, because LAN share is off): gateway keys are for other computers / a tunnel (Cloudflare Tunnel); added once Share on local network is on; agents on this computer need none.
3. Text button **Network and sharing** (`#openLanSettings`) → Settings, tab Network and sharing. Top tabs stay, none selected. Second row: GENERAL, ALLOWANCES, NETWORK AND SHARING (current), MODELS, PRIVACY, then wrap SYNC AND BACKUP, ABOUT. Find a setting. Did not change Proxy / port / share.
4. **CONNECT** fold (`#foldConnect`).
5. **MODELS** fold (`#foldModels`).
6. **RECENT CALLS** (not a fold).

Gateway keys block (`#gatewayKeysBlock`) is **hidden** while `providers.gateway.lan` is false. **Copy all ids** hidden when there are no models. **Find a model…** hidden when fewer than 5 models.

## State machine

Status button (`gatewayFixButton`):

| gateway | label | busy label |
|---|---|---|
| running, this magpie | Restart gateway | Restarting the gateway… |
| not running | Start gateway | Starting the gateway… |
| older magpie on the port | Quit magpie {v} and take over | Quitting magpie {v}… |
| another magpie, this version or newer | no button | — |

Click sets `busy`, re-renders, `POST gateway/restart` (or `gateway/take-over`), then reloads providers. Observed: label widens to **Restarting the gateway...** for **one 30fps frame (~33ms)**, then **Restart gateway** and still **running**. No error pill. Dot stays green through the flash.

CONNECT fold (`magpie.gwConnectFolded`):

- Expanded: chevron down, body visible, head note `Loopback only · the key can be anything`, title `Fold Connect away`.
- Folded: chevron right, **body hidden**, head keeps the address `http://127.0.0.1:3425/v1` plus a copy icon, title `Show how to connect`.
- Chevron: `transform .15s ease-out`; expanded `rotate(90deg)`, collapsed `none`.

MODELS fold (`magpie.gwModelsFolded`):

- Same chevron motion. Titles: `Fold the models away` / `Show the models`.
- List hides only when folded **and** `all.length > 0`. With **zero models the empty card stays**. Observed: chevron goes right, tooltip flips to `Show the models`, card **No models exposed yet** does not leave.

## CONNECT body (API thumb)

Order: **OpenAI** (default), **Responses**, **Anthropic**, **Gemini**, **System One**. Thumb 280ms.

| tab | blurb | base URL | key note | model chip |
|---|---|---|---|---|
| OpenAI | Chat Completions, the API most tools speak. Anything with an OpenAI base-URL setting works. | `http://127.0.0.1:3425/v1` · What OPENAI_BASE_URL takes. | OPENAI_API_KEY=magpie. Trusts everything on loopback. | `provider/model` · No models yet. Add a provider, or sign in to Codex or Copilot. |
| Responses | OpenAI's newer API: reasoning, built-in tool items, encrypted reasoning. Codex speaks this. | `/v1` | same key line | same |
| Anthropic | Messages API. Claude Code reads ANTHROPIC_AUTH_TOKEN instead of the key; the Agents tab sets that for you. | `http://127.0.0.1:3425` (no `/v1`) · What ANTHROPIC_BASE_URL takes. | ANTHROPIC_API_KEY=magpie… | `provider/model` |
| Gemini | Google's generateContent API, v1beta. Gemini CLI and the google-genai SDKs speak this. | no `/v1` · GOOGLE_GEMINI_BASE_URL | GEMINI_API_KEY=magpie… | `provider/model` |
| System One | TypeSafe's decision API: a Jev or Clef model answers typed questions… Clef also reads images: add `"images": ["data:image/png;base64,..."]`. | `http://127.0.0.1:3425/v1` · Requests go to POST `…/v1/systemone`. | Sent as Authorization: Bearer… | `provider/jev_latest` · No decision models yet. Add a System One, Jev or W… |

Key chip value is **magpie** on every tab. Each value chip has a copy icon (right).

## Example row (under Model)

Language segment: **Shell** (default), **curl**, **Python**, **Node**. OS segment (**Windows** / **macOS · Linux**) is **only on Shell**. Tooltip on the OS segment: `Where the snippet runs`.

- Shell + macOS · Linux: `export OPENAI_BASE_URL=…` / `export OPENAI_API_KEY=magpie` plus “Put these in the shell…”.
- Shell + Windows: PowerShell `$env:OPENAI_BASE_URL="…"`.
- curl / Python / Node: a fenced snippet for that client; OS segment unmounts. Snippet block grows and pushes Recent calls down.

Snippet copy icon (top-right of `.snip`): swaps to a green check **1200ms**, class `done`, animation `copy-pop` **.36s** `--ease` (scale .55 → 1.16 → 1), green on green-soft. Footer pill **Snippet copied**.

## Copy outcomes (footer `#status`)

Pill: 12.5px/500 weight, padding 3px 10px, radius 999, green text, `background: color-mix(currentColor 16%, bg)`, inset 1px ring. Opacity transition **.3s** (a later rule says **.2s var(--ease)**). Clears in **3500ms** (errors 8000ms). Sits in the footer, bottom-left of the card; does not shrink the page.

| control | pill |
|---|---|
| Snippet copy | Snippet copied |
| Base URL copy | Base URL copied |
| API key copy | Key copied |
| Model copy | Model id copied |
| Status URL chip | Gateway URL copied |

`flashCopied` also sets the icon `title` to `Copied` for 1.2s, then `Copy`.

## Empty states

- Models card: **No models exposed yet** / Add a provider, or sign in to Codex or Copilot; their models show up here for every agent.
- Recent calls: **No requests yet.** Point an agent at a model, or run the example above; every call shows up here as it happens.
- System One model line: **No decision models yet…**

## Other motion

- `.text, .icon, .tile, .achip, .mchip, .use, .link`: background/color/border/shadow/filter/opacity/transform **.16s** `--ease`.
- `:active` scale **.96** (icons **.9**). Restart hover is a light fill on the same bordered button; no layout change.
- Loading skeleton exists (`renderGatewayLoading`) but this session opened already rendered. Not captured.
- Nav side↔top: specified 0.5s; observed snap (see top).

## Visual

- Page fill ~`rgb(244,244,246)`. Cards ~white `rgb(252,252,252)` with hairline `~rgb(224,224,232)`.
- Restart button white, 1px gray border, radius ~8, height ~29px (y 134–163 in the default shot), label ~12px.
- Status card inset ~x 55–645, y 80–172.
- Section labels (CONNECT, MODELS, RECENT CALLS) small, tracking, muted, weight 500.
- Green running / dot / copied pill share the green token.
- URL and value chips: gray-blue fill `~rgb(241,241,244)`, radius pill, copy glyph at the end.
- Scrollbar on the right of the card (~x 678). Content scrolls inside the card; window does not grow.
- Footer status is inside the card, above the bottom shadow.

## Click log (this pass)

Side-toggle was used only to reach top-tab chrome. Gateway controls, reading order:

default → scroll to examples/models/calls → Shell/curl/Python/Node → Windows (PowerShell snippet) + tooltip → snippet copy → Models fold (empty card stays) → expand → API Responses, Anthropic, Gemini, System One → copy base / key / model → status URL copy → Restart hover → Network and sharing (settings, then Gateway tab back) → Connect fold (address stays in the head) → expand → Restart (busy frame).

Left on Gateway, Connect expanded, gateway **running**. API tab may still be System One (in-memory). Models fold expanded. Example language may still be Shell/Windows. No port, share, proxy, or key was edited.
