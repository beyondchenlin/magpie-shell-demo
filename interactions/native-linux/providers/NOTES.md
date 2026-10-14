# Providers (native Linux)

View is the Providers tab of the frameless window (752×652). With no providers and no file error the add sheet opens by itself (`adding` when `providers.length == 0`). There is no provider row, so there is no account fold, model list, or turned-off fold to open. `settings.json` has no `providers` key. `~/.config/magpie/providers.json` was not created. No key was typed, no Add / Save / Import / Sign in anyway / Open was clicked.

Shots are `ffmpeg` x11grab of the window rect at +610+300 (the card sits inside that frame; the dark corners are the desktop, same as Agents and Plugins).

## Sheet (empty)

Sticky bits at the top of the sheet, then a scrolling catalog, left-to-right pairs, top to bottom.

| shot | what |
|---|---|
| 01 | Default. Search "Find a vendor…", Import…. Subscriptions (sign in, no key): Claude, ChatGPT, ChatGPT API, Copilot, Gemini CLI, Antigravity, More in Plugins. Vendors: Anthropic, OpenAI, Google Gemini, Vertex AI, DeepSeek, xAI, Kimi, Kimi Code, Zhipu GLM, Z.ai, and the start of the next row. |
| 02 | Query with no hit. "Nothing called …". Links **Add it as a custom provider** and **look for a plugin**. Escape in the field clears the query; it does not close the sheet while there are no providers. |
| 25 | Scrolled. Same subscriptions, then MiniMax, Xiaomi MiMo, Tencent Cloud, StepFun, Baidu Qianfan, Huawei Cloud, and the top of the next pair. |
| 29 | Row hover. A host tooltip sits under the pointer (xAI → `api.x.ai`). The clicked row keeps a purple focus ring. |
| 31 | Kimi hover (pair tile). Tooltip is two lines: Global `api.moonshot.ai`, China `api.moonshot.cn`. Section title "Subscriptions · sign in, no key" is in view. |
| 33 | Foot of the catalog. Relays still on screen: Together AI, Fireworks, SiliconFlow, NVIDIA NIM, ModelScope, AiHubMix, PipeLLM, 302.AI, CherryIN, 鱼鱼连线, Jev · Vercel AI Gateway, Cloudflare Workers AI · Jev, Clef. Then **On this machine** (Ollama, LM Studio, oMLX, MLX-Serve), **Another computer's magpie** (Remote magpie), and **+ Custom provider**. |

Wheel on the list scrolls it. A focused row moves with the arrow keys; Return activates that row (it opened Zhipu when focus was still on Zhipu, not the hovered Kimi).

Pair tiles (Kimi, Kimi Code, MiniMax, StepFun, Qwen, and the China twins) are one row. The editor, not the tile, holds the Global / China switch.

## Custom provider (03–18)

Opened from the empty-search link. Nothing was added.

| shot | control |
|---|---|
| 03 | Name, Base URL protocol segments (OpenAI compatible selected), URL, model-to-try, API key + Show, Icon, Headers, Extra body. Footer Cancel and Add. |
| 04 | OpenAI Responses on. Tooltip: `…/v1 — for a vendor that serves only the Responses API, not chat completions`. |
| 05 | System One on. URL placeholder `https://…/v1`. Anthropic compatible and Gemini compatible were selected between 04 and 05; Gemini's tooltip was not a separate frame. |
| 06 | Detect APIs with an empty URL. Tooltip "Type the base URL first". |
| 07 | Each picked model. On System One: "A decision API is asked with one model: type it and press Detect APIs". |
| 08 | Show toggled to Hide on an empty key. |
| 09 | Built-in icons grid and "Find an icon…". |
| 10 | Icon filter `aws` leaves one aws icon. A click on the tiny icon missed; the grid stayed open and no icon was applied. |
| 11 | Header value expanded to JSON (`{ }` / "Edit as JSON"). |
| 12 | Scrolled form: JSON header, + Add header, extra-body placeholder `prompt_cache_key ${sessionId}`, Cancel / Add. |
| 13 | + Add header grew a second row (draft only). |
| 14 | Choose a picture… opens a GTK dialog **Select File** (1100×680). Recent, empty. Cancelled. Open was not clicked. |
| 15 | Same dialog, Home: agent-data, chrome-profile, cli-config, reference, sand-data. Nothing opened. |
| 16 | Other Locations: On This Computer, Computer, free-space line, path `/`. |
| 17 | From the website, with no URL. Tooltip plus red "type the provider's base URL first…". |
| 18 | Escape on the dirty draft raises **Discard unsaved changes? Your changes will be lost.** Cancel stays. Red Discard closes the editor. Discard was clicked. Search text was still in the sheet until cleared later. |

Add was never clicked. The icon file input would write `~/.config/magpie/icons`; the chooser was cancelled.

## Import from other apps (20–21)

Import… tooltip "Bring over providers set up in other apps". Tabs, all **Not found**, count "–", Import disabled:

| tab | path |
|---|---|
| Alma (20) | `~/.config/alma/chat_threads.db` |
| CC Switch | `~/.cc-switch/cc-switch.db` (seen, no separate frame) |
| Claude Code | `~/.claude/settings.json` (seen, no separate frame) |
| Codex (21) | `~/.codex/config.toml` |

Escape closed the dialog. Import was not clicked. Those apps' files were not written.

## Subscriptions

| path | what happened |
|---|---|
| Claude (22) | Risk card first: "Claude accounts can be suspended" plus the ban copy. Cancel, **Import instead…**, Sign in anyway. Sign in anyway was not clicked. |
| Import instead (23–24) | "Import Claude accounts". Choose files… opens GTK **Select Files** (Recent). Cancelled, no file. Paste box "…or paste it here" was left empty. Import was not clicked. Escape does not dismiss this panel; the header Cancel does (it sits just left of the blue Import pill). |
| Copilot | No risk gate. Click starts a GitHub device sign-in: a browser opens `github.com/login/device`, and the sheet shows a card (code, link, Open again, Account on GHE.com?, Proxy: Global proxy, Cancel). The browser was closed without signing in. Cancel on the card cleared it. The code is not recorded here. |
| ChatGPT, ChatGPT API, Gemini CLI | Not started. They call the sign-in API immediately (no risk card). Copilot is the live device-code path that was opened and cancelled. |
| Antigravity | Not opened. Same risk gate as Claude (`risk: true`); Sign in anyway would start sign-in. |
| More in Plugins (19) | "look for a plugin" from the search miss jumps to Plugins → Discover with the same query. Install was not clicked. Two accidental detail modals were Closed. The plugin search was cleared back to "Search plugins and npm…", Discover, Mirrors in China off. |

## Vendor editors

A preset opens a sheet titled with the vendor. Footer is Cancel and Add. Add was never clicked. Get a key ↗ was not clicked (it leaves the app). Fetch models was not clicked. A clean sheet closes with Escape. A dirty sheet (proxy or region changed) raises the same Discard dialog as 18.

Shared controls, seen on Google Gemini (26, 27), and the same shape on OpenAI, xAI, DeepSeek, Zhipu GLM:

- API key, placeholder "paste an API key", Show, Get a key ↗. Note: kept in `~/.config/magpie/providers.json`, readable by you alone.
- Headers: + Add header. "Optional headers sent with every request to {name}, applied after auth."
- Extra body JSON, placeholder `prompt_cache_key ${sessionId}`.
- Proxy segments: **Global proxy** (follows Settings), **Direct** ("Requests to it go direct…"), **Custom** (27) which reveals a URL field placeholder `http://127.0.0.1:7890` and "http://, https:// or socks5://".
- Concurrency, Requests per minute, both "No limit".
- The sheet's own scrollbar moves the form. The mouse wheel over the extra-body field does not.

Distinct:

| shot | vendor | difference |
|---|---|---|
| 30 | Google Vertex AI | No API key. Project ID (`my-project-123`), Location (`global`), Credentials file (`~/.config/gcloud/application_default_credentials.json`), Service account email. Header shortcuts `X-Vertex-AI-LLM-Request-Type` and `X-Vertex-AI-LLM-Shared-Request-Type`. Link `docs.cloud.google.com`. Escape closed it clean. |
| 32 | Kimi | Region **Global** / **China**. China retitles the sheet "Kimi (China)", host tooltip `api.moonshot.cn`, link `platform.moonshot.cn`. Cancel returned to the catalog without a Discard dialog (region switch alone, then Cancel). |
| 34 | Remote magpie | Endpoint placeholder `http://192.168.1.20:3425`. Copy: the address and API key the other computer shows in Settings; models and routing groups are listed here. API key, headers, extra body, proxy. Cancel closed it; Add was not clicked. |

Ollama, LM Studio, oMLX, and MLX-Serve are on 33 (local, no key in the preset list). Their editors were not opened — the click meant for Ollama hit Remote magpie. A standard key vendor (Gemini) stands in for Anthropic, OpenAI, xAI, DeepSeek, Zhipu, and the relays that were not each opened: the sheet is the same key / headers / extra body / proxy / limits form, with that vendor's host link.

## Motion

- Empty catalog: the sheet is the page. Search filters in place. A miss swaps the grid for two links.
- Opening a vendor or Custom provider covers the sheet with the editor. Escape or Cancel returns. Dirty → Discard dialog (18, 28) over a dimmed editor.
- Proxy Custom and Kimi China change the form in place (a field appears, the title and host change). No navigation.
- Choose a picture / Choose files open a separate GTK window (1100×680). Cancel returns. Open was not used.
- Copilot sign-in opens Chrome on top of Magpie and paints a card in the sheet. Closing Chrome leaves the card until Cancel.
- Hover tooltips (host, pair hosts, "Token Plan · pay as you go" on Baidu Qianfan) follow the pointer and do not stick.

## Left state

Providers tab, add sheet, scrolled to the foot (33: relays, On this machine, Remote magpie, Custom provider). Search empty. No provider added, no key stored, no sign-in completed, no file chosen. Plugins search left empty, Discover, mirror Off. Magpie still running: front window 752×652 at +610+300 (id 46137359). A second 752×652 window is at +630+300. Neither was quit. The window close was not used.


| 27 | gemini-proxy-custom | Proxy → Custom 出 URL `http://127.0.0.1:7890` · hint socks5 |
| 28 | gemini-discard | 脏编辑器 Cancel → Discard 确认（红 Discard）|
| 29 | vendor-hover-host | xAI hover title `api.x.ai`；Gemini 可 on |
| 30 | vertex-editor | Project ID / Location / Credentials / Service account · Vertex header 快捷链 |
| 31 | kimi-region-tooltip | Kimi tile title Global/China hosts |
| 32 | kimi-china | Region Global\|China segs · site platform.moonshot.cn · tooltip api.moonshot.cn |
| 33 | relays-local-remote | Relays / On this machine / Another computer's magpie 分区 |
| 34 | remote-magpie | Endpoint + key + Extra body + Proxy |

## demo 对齐（v0.1.25）
- Proxy Custom 输入框；Discard 对所有脏编辑器；VENDOR_HOST tip；Vertex 表单；Kimi Region；Remote 文案
