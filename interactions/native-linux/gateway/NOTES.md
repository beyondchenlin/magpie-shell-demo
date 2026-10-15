
## Consumed in demo v0.1.72 (GATEWAY_STATUS_27_42)
Shots **27–42** status machine: Restarting… → orange not running / Start; Starting… clears red; port-in-use python red (Escape no-op); another magpie green · no button; older **0.1.550** take-over (+ hover no tip); take-over refused when Python (red, button stays); Quitting… → this magpie + Restart; Copy URL tip; models/recent empty; no confirm/Cancel; P1 bird **N/A**.
Demo: `?gw=on|off|older|other` · `?gwHold=python` (or `magpie.demoGwHold`) for fail paths.

## Consumed in demo v0.1.36+ (GATEWAY_NATIVE)
Default demo now matches native **empty** catalog (`showGwDemo` default false): status running · 0 models · Connect API tabs · Models empty card stays when folded · Recent empty · Restart busy label · copy pills · Network and sharing link.
Filled models/calls remain opt-in via `localStorage magpie.demoPrefs.showGwDemo=true` (or Settings demo toggle if present).
Shots **01–26** drive the empty-path interactions; true LAN keys / restart API still mock.

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

## Status button — not running, Start, take-over, Restart (shots 27–42)

Same window as the plugins pass: **752×652 at +200+40**, pid 560329, not relaunched. Close was not used. The binary on disk is `magpie 0.1.1241`; the gateway this process serves answers `"version":"0.1.1240"` (it was started before that file was replaced). Connect stayed expanded on **System One** (left from 01–26). Share on local network stayed off, so the keys block stayed the note. Port stayed **3425**. No provider was added. No confirm dialog exists on Start, Restart, or take-over, and there is no Cancel. Escape does not clear the red error (35 is the same pixels as 34; Escape on the not-magpie error also changed nothing, so it is not a second file).

The button's busy line is painted before the request returns. A restart that only stops and starts this process is one short frame (30). Holding the port open (a partial POST keeps shutdown from finishing at once, then something else binds 3425) leaves the busy line up long enough to read, and is what the card is built for: not running, another magpie, an older magpie. Those holders were quit. pid 560329 serves 3425 again.

P1 live bird hop: **N/A**. The header bird did not hop or play another animation on Start, Restart, or take-over.

| shot | what |
|---|---|
| 27 | Gateway, this magpie. Green dot, **running**, `0 models · no agent routed through it yet · five APIs, one URL`, URL `http://127.0.0.1:3425`, **Restart gateway**. |
| 28 | Pointer on the URL chip. Dark tip, inside the card: **Copy the gateway URL**. |
| 29 | Pointer on **Restart gateway**. Light fill. No tooltip. |
| 30 | **Restarting the gateway...** Green dot and **running** stay. The port was taken while it restarted. |
| 31 | After that. Orange dot, **not running** (orange), sub **start it with magpie serve, or open magpie at login**. Button **Start gateway**. URL still there. No red line: the failure was a different state, so the error is not kept. |
| 32 | Pointer on **Start gateway** (light fill, no tooltip) after a Start that failed. Red, under the button: **Port 3425 is in use by /usr/bin/python3.13 (pid 1477758): quit it, or move the gateway to another port in Settings.** |
| 33 | **Starting the gateway...** Orange **not running** stays. The red line is gone while it is busy. |
| 34 | Busy over. **Start gateway** again. Same red sentence, pid **1479377** (the holder that was listening then). |
| 35 | **Escape**. No dialog. Pixels match 34. The red line stays. |
| 36 | A magpie that is not older answered (stub said 0.1.1241, this process 0.1.1240). Green dot. **running · served by another magpie**. The counts line stays. **No button.** URL stays. |
| 37 | Older magpie, stub **0.1.550**. Orange dot. **running · served by magpie 0.1.550, older than this one**. Sub: **Agents' requests go through magpie 0.1.550 and are sent as it sends them, without this version's fixes. Quit it here and this one serves the gateway at once.** Button **Quit magpie 0.1.550 and take over**. |
| 38 | Pointer on that button. Light fill. No tooltip. |
| 39 | Take-over clicked while the listener was Python, not a magpie. Button stays **Quit magpie 0.1.550 and take over**. Red: **Port 3425 is held by /usr/bin/python3.13 (pid 1482438), which isn't magpie, so magpie leaves it alone. Quit it yourself, or move the gateway to another port in Settings.** Python was not killed. |
| 40 | Take-over of the 0.1.550 stub (a magpie, by its program name). **Quitting magpie 0.1.550...** The older line stays during the busy label. |
| 41 | Stub quit, this magpie serves. Green **running**, **Restart gateway**, 0 models. Same card as 27. |
| 42 | Scrolled. **MODELS** still **No models exposed yet**. **RECENT CALLS** still **No requests yet.** No filled list appeared. The probes did not leave a call row. |

## Left state

Gateway tab, top of the page. **running**, **Restart gateway**, 0 models, no agent, URL `http://127.0.0.1:3425`. Connect expanded, API **System One**. Models fold still expanded, empty card. Recent calls empty. LAN off, no gateway key added, port not edited. Magpie left running (752×652 at +200+40, pid 560329). Close was not used. No holder left on 3425.

Not in this slice: a filled models list or an opened call (nothing to list), Gateway keys (Share on local network still off), a confirm or Cancel (the card has neither). The not-magpie take-over's **Quitting…** line was gone inside one 80ms frame; the successful one is 40. P1 N/A.

Next: Routing (stops at 30) or tray (14). Gateway keys and call rows need a share or a real request; neither was turned on.
