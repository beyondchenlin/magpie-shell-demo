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

## demo 对齐（v0.1.47）
- On this machine：Ollama / LM Studio / oMLX / MLX-Serve 均开 local 编辑器（Server address + optional key + Redaction）；NOTES 未点开，对齐 Magpie source
- Remote EndpointHint 文案对齐 presets.go；分区标题 On this machine / Another computer's magpie

## demo 对齐（v0.1.50）
- Custom：协议 segs title tooltip；urlHint anthropic/`v1beta`/`v1`；Extra body 空+placeholder；Headers Edit as JSON / Collapse；自定义 Headers hint；custom+Anthropic 出 Key header
- On this machine 编辑器仍等 35+ 点录（源码对齐见 v0.1.47）

## On this machine editors (35–43)

Opened from the catalog foot (33). Add was never clicked. No key typed.

| shot | what |
|---|---|
| 35 | Ollama editor. Note "your local models", site ollama.com. API key optional for local servers + Show. Server address folded. Headers is + Add header only (no empty row).  Extra body placeholder `prompt_cache_key`. Proxy Global. Concurrency No limit. Cancel / Add. |
| 36 | Server address opened: Address `http://localhost:11434`, hint "Where the server listens…". |
| 37 | Scrolled: Extra body, Proxy, Concurrency, Requests per minute, Queue size, Queue wait. |
| 38 | Further: Queue wait, Price rate, **Key header** Both / x-api-key / Authorization: Bearer (Ollama has Anthropic URL → third-party both-headers), User-Agent tick. |
| 39 | Redaction · Send requests unmasked; Context window chips 128K–1M; Max output 8K–128K; Compact at 128K–1M. |
| 40 | Cancel returned to catalog foot (On this machine / Remote / Custom). No provider added. |
| 41 | oMLX editor. Note "local server, port 8000 by default", site omlx.ai. Headers only + Add header (clean). Same local shape. |
| 42 | LM Studio editor. Note port 1234, site lmstudio.ai. |
| 43 | MLX-Serve editor. Note port 11234, site github.com (host of Website URL). |

## demo 对齐（v0.1.51）
- KindLocal 四编辑器：Server address / optional key / Redaction / Key header / User-Agent / Context·Max·Compact chips；MLX-Serve site `github.com`

## demo 对齐（v0.1.52）
- Detect APIs：空 URL warn / System One Each / Asking… / keyless None answered / mock ep+Use these（无真探测）
- Custom Models + Fetch models：Asking the vendor… / chip Pick all·none（无真 list）
- Gateway `?gw=off|older` 未运行 / 接管文案

## demo 对齐（v0.1.53）
- DETECT_APIS_DONE：原生 44–53 全消费；More endpoints + Web search；厂商 Endpoints Test 壳

## Custom provider Detect APIs (44–53)

Opened from **+ Custom provider** at the catalog foot (the Ollama editor that was still up closed with Escape; it was clean, no Discard). Default protocol is **OpenAI compatible**, URL placeholder `https://…/v1`. No API key was typed. Add was not clicked. Nothing was saved: `providers.json` was not created.

06 quoted a hover tooltip "Type the base URL first". On this build that string is not the hover title. Hover (44) is the button title, clipped at the left of the window the same way 06 was: "…smallest request to each API (OpenAI chat completions, Responses, Anthropic messages, Gemini generateContent) at this URL, to see which answer". A click with an empty URL paints the amber line under the buttons (45).

| shot | what |
|---|---|
| 44 | Hover Detect APIs, URL empty. Native title tooltip, left edge cut off by the window. |
| 45 | Click Detect APIs, URL empty. Amber **Type the base URL first** under the button. API key still the placeholder. |
| 46 | Base URL typed `http://127.0.0.1:9`. The amber line stays; typing does not clear it. |
| 47 | Detect with that URL and no model. One frame of **Asking each API…** (the line replaces the amber tip). Port 9 refuses at once, so loading is a single frame. |
| 48 | Fail, no model. Rows OpenAI, Responses, Anthropic, Gemini, each `http://127.0.0…` and **no model to try: type one the vendor serves**. Under them: **None answered, and no API key is typed: paste the key under API key and detect again**. No Use these. |
| 49 | Model field `demo` (not a key), Detect again. **Asking each API…** and the previous rows are gone while it asks. |
| 50 | Fail, model `demo`. Same four rows, each **dial tcp 127.0.0.1:9: connect: connection refu…** (ellipsis in the row). Same no-key line. No Use these. |
| 51 | Hover a refused row. Title shows the full `dial tcp 127.0.0.1:9: connect: connection refused`. |
| 52 | Cancel on the dirty draft. **Discard** / "Discard unsaved changes? Your changes will be lost." Dialog Cancel stays (it had focus). Red Discard was clicked. |
| 53 | Catalog foot again. Custom provider is only the add row (focus ring). No provider added. |

Each picked model was not clicked (07 is that empty-list warning, on System One). The key field was not filled, so the "paste the key" line was left as the hint. Get a key was not clicked.

## demo 对齐（Detect nest · v0.1.53 DETECT_APIS_DONE）
- 空 URL：hover 长 title（左缘裁切，同 06）；点击后行下琥珀色 Type the base URL first，输入 URL 不清除
- `http://127.0.0.1:9`：Asking each API… → 无模型四行 no model to try；填 demo 后四行 dial connection refused；无 key 提示；无 Use these
- 脏草稿 Cancel → Discard；未 Add；providers.json 未创建

## Left state (after 53)

Providers tab, add sheet, foot of the catalog (relays, On this machine, Remote magpie, + Custom provider focused). Search empty. No provider added, no key stored, no file chosen. Magpie still running: window 752×652 at +610+300 (id 27262991). Not quit.


## demo 对齐（Import Claude / apps · v0.1.54 IMPORT_CLAUDE_DONE）
- Import from other apps：四路径与 NOTES 20–21 / Magpie `importapps.go` 一致；全 Not found；Import 禁用；Import… title tip。
- Claude 22–24：risk / Import sheet / GTK Select Files（Recent 侧栏）；Escape 不关 Import（仅 Cancel）；无真选文件。
- Fetch models 54–60：已落盘（Custom Models 行；见下节）。

## Fetch models (54–60)

A new key-vendor sheet does not have Fetch models. Google Gemini was opened and scrolled from API key through Endpoints (OpenAI `https://generativelanguage.googleapis.com/v1beta/op…`). No Models field, no Fetch models button. Escape closed it clean (nothing typed, no Discard). OpenAI is the same add shape. Fetch models before a provider exists is on **+ Custom provider** (OpenAI compatible by default), which is the catalog's OpenAI-style sheet.

No API key was typed. Add was not clicked. `~/.config/magpie/providers.json` was not created.

| shot | what |
|---|---|
| 54 | Models row, idle. Placeholder `model ids, comma separated · e.g. gpt-5.5, claude-sonnet…`. Button **Fetch models**. Standing hint: "Optional: Fetch models to pick from the vendor's list, or type ids; none picked, magpie asks for the list after saving." API key still the placeholder. |
| 55 | Hover the button. Native title, clipped on the right and across the footer: "Ask the vendor for its model list with the URL and key typed, to pick f…" (the title is "…to pick from; nothing is saved"). |
| 56 | Click with an empty URL and an empty key. Amber toast **Type the base URL first**. Nothing is asked. The click checks the URL, not the key. |
| 57 | Base URL `http://127.0.0.1:9/v1` (not a key). API key still "paste an API key". |
| 58 | Fetch models with that URL and no key. Red under the button: `no model list: Get "http://127.0.0.1:9/v1/models": dial tcp 127.0.0.1:9: connect: connection refused — type its model ids in by hand, or give the URL its list is at`. No chips, no Pick all. **Asking the vendor…** did not survive a frame at 30 fps (port 9 refuses at once). An empty key does not block the ask once a URL is typed; there is no "paste a key" tip on this path. |
| 59 | Cancel on the dirty draft. **Discard** / "Discard unsaved changes? Your changes will be lost." Dialog Cancel had focus. Red Discard was clicked. |
| 60 | Catalog foot again. + Custom provider focused. No provider added. |

## demo 对齐（Fetch models nest · v0.1.55 FETCH_MODELS_DONE）
- 新 key 厂商表（Gemini）无 Fetch models；未保存时按钮只在 Custom Models 行
- 空 URL：琥珀色 Type the base URL first（status.lift），不请求
- `http://127.0.0.1:9/v1` 且无 key：红字 no model list + dial connection refused；无 chip；Asking… 40ms 壳
- Context→Max→Compact→Models 字段序对齐 Magpie
- 脏草稿 Cancel → Discard；未 Add；providers.json 未创建

## Left state (after 60)

Providers tab, add sheet, foot of the catalog (relays, On this machine, Remote magpie, + Custom provider focused). Search empty. No provider added, no key stored, no file chosen. Magpie still running: window 752×652 at +610+300 (id 27262991). Not quit.

## demo 对齐（v0.1.56 EACH_MODEL_DONE）
- System One Each（07）：decide warn；picks 不含 model-to-try；ids 仅按逗号/换行切
- Each 成功壳：detect-grid + ep 行 + Use these（无真探测）

## Deep nest (61–83)

Relaunched Magpie, pid **1871993**. Window **752×652 at +200+40** (id 85983247, DISPLAY=:6). Not resized. Started on Library → MCP servers (no What's new sheet; it had already been closed). Providers in the top chrome opens the empty add sheet. Shots are ffmpeg x11grab of that rect, except **75**, which is the Chrome login page. No key was typed. Sign in anyway, Finish sign-in, Open again, Choose files, and every purple Import were not clicked. `providers.json` stayed `{"providers": null}` through 81.

| shot | what |
|---|---|
| 61 | Landing. **ADD YOUR FIRST PROVIDER**, search "Find a vendor…", Import…. Subscriptions: Claude, ChatGPT, ChatGPT API, Copilot, Gemini CLI, Antigravity, More in Plugins. Vendors start: Anthropic, OpenAI, Google Gemini, Vertex AI, DeepSeek, xAI, Kimi, Kimi Code, Zhipu GLM, Z.ai. |
| 62 | Query **open**. Vendors: OpenAI, Zhipu GLM, Azure OpenAI. Relays: OpenRouter, OpenCode Go, ClinePass, OpenCode Zen, CherryIN. Subscriptions and On this machine drop out. (Keys sent with `xdotool --window` never reached the field; a normal type did.) |
| 63 | Hover OpenRouter. Tooltip **openrouter.ai**. |
| 64 | Hover Import… with the query still `open`. Tooltip **Bring over providers set up in ot…**, cut off at the window's right edge. A 1s hover did not paint it; about 2s did. |
| 65 | Import from other apps, Alma. `~/.config/alma/chat_threads.db`. **Not found on this computer**. Import not clicked. |
| 66 | CC Switch. `~/.cc-switch/cc-switch.db`. Not found. |
| 67 | Claude Code. `~/.claude/settings.json`. Not found. |
| 68 | Cancel. Back on the filtered catalog, query still `open`. |
| 69 | Escape in the search field clears `open` and restores the full catalog. It does not close the empty sheet. |
| 70 | Antigravity. Risk card, plus the tile tooltip **Antigravity** over the row. Sign in anyway not clicked. |
| 71 | Pointer moved onto the note. **Antigravity accounts can be suspended.** "Google may suspend an Antigravity account it sees used outside Antigravity. Use one you can afford to lose." Cancel, Import instead…, Sign in anyway. |
| 72 | Import instead…. **Import Antigravity accounts.** A hover tip covers the body: "Bring in accounts exported from Antigravity Cockpit, Antigravity Manager or CLIP…". |
| 73 | Tip gone. Choose or paste an export from Antigravity Cockpit, Antigravity Manager or CLIProxyAPI (JSON, or refresh tokens one a line; each account is checked with Google before it is added). Same Google risk line. Choose files…, empty "…or paste it here". Header Cancel and purple Import. Neither Choose files nor Import was used. Paste left empty. Cancel closed it (between 73 and 74). |
| 74-chatgpt-wall | ChatGPT tile starts sign-in at once (no risk card) and Chrome covers Magpie. This grab is the 752×652 rect while Chrome is fullscreen, so it is a sparse crop of the login page, not the Magpie card. |
| 74-chatgpt-signin-card | Login tab closed with Ctrl+W. Nothing typed, Continue not clicked. Card **Finish signing in to ChatGPT in your browser**, with the tile tip **ChatGPT subscription · Plus · Pro · Business**. |
| 75 | The Chrome page itself, **1280×800**, `auth.openai.com/log-in`. Welcome back, empty Email address, Continue, Sign up, Continue with Google / Apple / Microsoft / phone. Not submitted. Tab then closed. |
| 76 | Same card, tip gone. "magpie opened the sign-in page. The account shows up here as soon as you're done." Truncated `https://auth.openai.com/oauth/authorize?client_id=…`. Open again, Proxy: Global proxy, Import from a file instead…. Note for a server or Docker: copy the address the browser ends on. Empty Callback URL. Purple **Finish sign-in**. Cancel is the text button at the card's top right. Finish sign-in, Open again, and Import from a file were not clicked. |
| 77 | Cancel. Catalog back. A leftover title **Stop waiting for this sign-in** (the Cancel button's tip) sat over the vendors until the pointer moved. No provider saved. |
| 78 | ChatGPT API, same wall: **Finish signing in to ChatGPT API in your browser.** Link `auth.openai.com/api/accounts/authorize?agent_name_hint=magp…`. Open again, Proxy: Global proxy. Its Chrome login (Welcome back) was closed with Ctrl+W before this frame. No email, no Continue. |
| 79 | Gemini CLI. **Finish signing in to Gemini CLI in your browser.** Link `accounts.google.com/o/oauth2/v2/auth?…`. The Google login window (登录 - Google 账号) was closed with Ctrl+W before this frame. Cancel not yet clicked in the frame; it was clicked next, and the catalog returned. |
| 80 | After that Cancel, query **ollama**. Vendors: **Ollama Cloud**. On this machine: **Ollama**. Two tiles. |
| 81 | Local Ollama, not Ollama Cloud. API key empty, placeholder "optional for local servers", Show. "Kept in ~/.config/magpie/providers.json, readable by you alone." Server address folded. + Add header. Extra body shows `prompt_cache_key` / `${sessionId}`. Proxy Global proxy / Direct / Custom. Concurrency No limit. Cancel and Add. Hover tip **your local models**. No key typed. |
| 82 | Add, with the key still empty. The sheet gives way to the list. **Find a provider**. Row: Ollama, `localhost:11434 · no models exposed`, **no key**, switch on. **+ Add provider**. Toast **Ollama added**. `providers.json` has that one provider, `"key": ""`, chat `http://localhost:11434/v1`. Not a secret. |
| 83 | + Add provider. Sheet title is now **ADD A PROVIDER** (a provider exists), with **Close** beside Import…. Catalog top is the same subscriptions and the start of the vendors. Ollama stays saved under the sheet. Nothing else was added. |

ChatGPT, ChatGPT API, and Gemini CLI each opened a real login page and were cancelled. No account was approved. Antigravity never got past the risk card and the import sheet.

## Left state (after 83)

Providers tab, add sheet open (**ADD A PROVIDER**), catalog scrolled a little (a Claude subscription tip can show if the pointer rests on Claude). One local provider, Ollama, empty key. No OAuth finished. Magpie still pid 1871993, window 752×652 at +200+40 (id 85983247). Not quit.

## List, once a provider exists (84–93)

Ollama from 82 was still saved, key empty. The add sheet was closed. No second provider was added. Add another, Duplicate, and Save were not clicked. The switch was not toggled.

| shot | what |
|---|---|
| 84 | Sheet closed. List: **Find a provider**, one row Ollama `localhost:11434 · no models exposed`, **no key**, switch on, **+ Add provider**. The "Ollama added" toast is gone. |
| 85 | Hover the row handle. Tooltip cut off at the left: "…veral providers serve goes to the higher one first · Alt+↑/↓" and "…to the top or the bottom". Full title is drag-to-reorder, higher provider wins a shared model, Alt+↑/↓, right-click moves to top or bottom. |
| 86 | Pointer on the switch knob. The On tip had not painted yet. |
| 87 | Right-click the handle. Menu: **Move to top** Alt+Shift+↑, **Move up** Alt+↑, **Move down** Alt+↓, **Move to bottom** Alt+Shift+↓. None chosen. One row, so they would not reorder it. Escape dismissed the menu. |
| 88 | Pointer just left of the switch. Still no tip. |
| 89 | **Find a provider** query `zzz`. **No provider matches "zzz"**. The row hides. + Add provider stays. A clear control sits in the field. Escape then emptied it and the row came back. |
| 90 | Switch tip, clipped at the right: **On · switch it off and agents no longer get its models;** (the rest is "its keys and settings are kept"). Switch stayed on. |
| 91 | Row opens the saved editor, not the add form. ID `ollama`, hint "Agents pick its models as ollama/…". API key still the empty placeholder. Same local fields as 81. Footer: **Remove**, **Add another Ollama**, **Duplicate**, Cancel, **Save**. |
| 92 | Remove. **Remove Ollama?** "Its saved configuration will be removed. Agents using it may switch to another provider or their default model." Cancel (focus) and red Remove. |
| 93 | Red Remove. Toast **Ollama removed**. The page is only **+ Add provider**. The first-provider sheet does not open again. `providers.json` is `{"providers": []}`, not null. The key was `""` the whole time. |

## Left state (after 93)

Providers tab, empty list, + Add provider. No provider, no key, no OAuth finished. Magpie still pid **1871993**, window **752×652 at +200+40** (id 85983247). Not resized, not quit.

## demo 对齐（61–93）· v0.1.89 PROVIDERS_NEST_DONE
- Catalog search **open**：OpenAI、Zhipu、Azure OpenAI、Open* relays；Escape 清查询，不关空添加页。
- Import：CC Switch `~/.cc-switch/cc-switch.db`、Claude Code `~/.claude/settings.json` — Not found；Import 不必成功。
- Antigravity：risk 卡 + Import（Cockpit / Manager / CLIProxyAPI）；Sign in anyway / Import 不强制。
- ChatGPT / ChatGPT API / Gemini CLI：无 risk 卡，浏览器墙 + Cancel。
- 有供应商后：Find a provider、拖动手柄 title、右键 Move 菜单、On 开关 tip；本地 Ollama 空 key 添加再 Remove；默认空 `providers` OK。
- 跳过仍薄：Copilot device-code 加深、两行排序、Turned off fold — 留给后巢。
- demo 消费（v0.1.89）：ProvidersView；无 portable、无 Vercel。

## Copilot device code, sort, turned off (94–116)

Same Magpie, pid **1871993**. Window still **752×652 at +200+40** (id 85983247). Not resized, not quit. Shots are ffmpeg x11grab of that rect. **106**, **110**, and **112** are widened past the window so a tooltip that draws outside the frame is whole. No key was typed. GitHub Sign in, Continue, Finish sign-in, Sign in through it, and the GHE Sign in were not clicked. The device code is on the frames and is not copied into this note.

| shot | what |
|---|---|
| 94 | Copilot, no risk card. One frame of the card while the tile is still highlighted: spinner, **Finish signing in to Copilot in your browser**, "magpie opened GitHub's device page. Enter this code there…", a code box, `https://github.com/login/device`, Open again, Account on GHE.com?, Proxy: Global proxy, Cancel. |
| 95 | Chrome, **1280×800**, `github.com/login?return_to=…/login/device`. Sign in to GitHub. Username and password empty. Sign in, Google, Apple, passkey not used. Tab closed with Ctrl+W. |
| 96 | Chrome gone. Same card, code still waiting, pointer on the code. Copilot row stays highlighted. |
| 97 | Copy control on the code. Tip **Copy**. |
| 98 | Copy control on the link. Tip **Copy link**. |
| 99 | Account on GHE.com? Tip: "An account of an enterprise on GitHub Enterprise Cloud with data residency signs in at its \<name\>.ghe.com". |
| 100 | Proxy: Global proxy. Tip: **Global proxy** / "The sign-in goes through this proxy, as the account's requests will. One picked here is kept as the account's." |
| 101 | Menu **Sign in through**: Global proxy (checked, "Follows the proxy in Settings"), Direct ("Through no proxy"), Custom… ("http://, https:// or socks5://"). |
| 102 | Custom… Form placeholder `http://127.0.0.1:7890`, purple **Sign in through it** (disabled, empty). Not submitted. The code card stays above it. |
| 103 | Account on GHE.com? ends that device wait and asks **Your enterprise on GHE.com**. "The address you sign in to GitHub at, like acme.ghe.com." Empty field placeholder `acme.ghe.com`, Sign in disabled, Cancel, **github.com**. Nothing typed. |
| 104 | Cancel. Catalog again, **ADD YOUR FIRST PROVIDER**. No provider, no GitHub window. |
| 105 | Two local rows, keys still empty. Ollama `localhost:11434`, LM Studio `localhost:1234`, both **no key**, switches on. Toast **LM Studio added**. |
| 106 | Handle tip, widened to the left of the window: "Drag to reorder — a model several providers serve goes to the higher one first · Alt+↑/↓ to move · right-click to move it to the top or the bottom". |
| 107 | Right-click the handle. **Move to top** Alt+Shift+↑, **Move up** Alt+↑, **Move down** Alt+↓, **Move to bottom** Alt+Shift+↓. |
| 108 | Move down. LM Studio is first, Ollama second. Toast **Provider order saved**. `providers.json` keeps insertion order and adds `"order": ["lmstudio", "ollama"]`. |
| 109 | LM Studio's switch off. Ollama stays on. Fold **TURNED OFF 1**, collapsed. Toast **LM Studio is off: agents no longer get its models**. The On tip is cut at the window's right edge. |
| 110 | Same On tip, grab widened to the right: "On · switch it off and agents no longer get its models; its keys and settings are kept". |
| 111 | Fold opened. LM Studio row under it, badge **SWITCHED OFF**, switch off (knob left). |
| 112 | Off tip, widened past the right edge: "Off · switch it on and agents get its models again". |
| 113 | Fold tip, expanded: **Fold the providers turned off away**. |
| 114 | LM Studio editor. Note: "Switched off: agents aren't given its models and no request goes to it. Its keys and settings are kept; switch it on to use it again." ID `lmstudio`. Key still empty. Footer Remove / Add another / Duplicate / Cancel / Save. |
| 115 | Remove. **Remove LM Studio?** "Its saved configuration will be removed. Agents using it may switch to another provider or their default model." Red Remove. |
| 116 | Ollama removed the same way. Toast **Ollama removed**. Page is only **+ Add provider**. |

`lmstudio` is stored `"off": true` while it is off. Both keys were `""`. After the two Removes the file still held `"order": ["lmstudio", "ollama"]` with `"providers": []`. That leftover id list was deleted on disk so the file ends `{ "providers": [] }`. No `providers` key in `settings.json`. No OAuth finished.

## Left state (after 116)

Providers tab, empty list, + Add provider. No provider, no key, no GitHub window. Magpie still pid **1871993**, window **752×652 at +200+40** (id 85983247). Not resized, not quit.

## demo 对齐（94–116）· v0.1.90 COPILOT_SORT_OFF_DONE
- Copilot device-code：code 盒、`github.com/login/device`、Copy / Copy link、GHE tip、Proxy 菜单（Global / Direct / Custom… `http://127.0.0.1:7890` 表单未提交）。演示码占位，不写入 NOTES 里的真码。
- 两行：Ollama + LM Studio 空 key；手柄 tip；Move down → toast **Provider order saved**（`order` 数组）。
- Turned off：折叠 **TURNED OFF N**，展开 **SWITCHED OFF**；On/Off tip；fold tip **Fold the providers turned off away**；编辑器 note 密钥保留。
- 删光后默认空列表 + Add provider。
- 跳过仍薄：collapsed tip「Show the providers turned off」打磨、拖拽动效、需真登录的账号折层。
- demo 消费（v0.1.90）：无 portable、无 Vercel。

## Collapsed fold tip and drag (117–118)

Same Magpie, pid **1871993**. Window **752×652 at +200+40** (id 85983247). Shots are ffmpeg x11grab. **117** is widened to the left (980×690 from +120+10) so the tooltip that draws outside the frame is whole, same as 106 / 110 / 112. Probes were local Ollama and LM Studio, keys still `""`. No OAuth. Save, Add, and Sign in were not clicked.

The fold remembered open (`magpie.offProvidersOpen`), so turning LM Studio off showed the row under **TURNED OFF 1**. One click on the fold collapsed it (chevron points right, the row hides).

| shot | what |
|---|---|
| 117 | Collapsed fold, pointer on **TURNED OFF 1**. Tooltip **Show the providers turned off**. A 752×652 grab clips the leading S; this frame includes it. Ollama stays on above the fold. |
| 118 | Drag in motion. Pointer on LM Studio's handle, grip showing, that row lifted above Ollama. Escape cancelled the drop, so `providers.json` kept insertion order and no `"order"` key. The click that ends a drag opened the LM Studio editor once; nothing was typed. Escape closed it clean (no Discard). |

Both probes were then removed (`magpie provider rm`). The file ends `{ "providers": [] }`. No order leftover, no key.

## Left state (after 118)

Providers tab. Opening it again with nothing saved shows **ADD YOUR FIRST PROVIDER** (the empty add sheet). Search empty. No provider, no key, no sign-in. Magpie still pid **1871993**, window **752×652 at +200+40**. Not resized at the end, not quit.

## Still thin

Account fold (a signed-in subscription's accounts row) needs a finished sign-in. Approve / Finish sign-in was not clicked. Copilot device-code, ChatGPT, and Gemini CLI stay cancelled from 74–104.

## demo 对齐（117–118）· v0.1.91 FOLD_TIP_DRAG_DONE
- 收起 TURNED OFF tip：**Show the providers turned off**（752 左缘可裁）。
- 拖动中：手柄抬起、行间插入；Escape 取消落点（不改 order）。
