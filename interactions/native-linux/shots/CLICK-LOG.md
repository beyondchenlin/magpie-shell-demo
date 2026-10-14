# Native Linux Magpie — click log

App: official Magpie desktop (`/home/box/.local/bin/magpie`, window class `magpie`, title `magpie`). Not the browser. Chrome was not opened. Window close (X) was not clicked. Process left running (pid 37090).

Shots are full desktop PNGs (1280×800, the Computer framebuffer). The X screen is 1920×1200; screenshot pixels are 2/3 of X pixels.

## Chrome: native top tabs ≠ web left sidebar

Confirmed on this window vs official web shots (`/workspace/magpie-official/shots/01-agents.png`, `09-settings.png`, URL `127.0.0.1:17890`).

| | Native Linux window | Web (browser) |
|---|---|---|
| Frame | Frameless floating card. No OS title bar. App draws its own close X on the tab strip. | Browser window (tabs, URL bar, browser window controls) around a full-viewport page. |
| Nav | **Top tabs** in the window chrome, one row: Agents, Providers, Routing, Gateway, Usage, Plugins. Selected tab is a white pill. | **Left sidebar**, grouped: Work (Agents, Models, Providers, Routing, Gateway), Insights (Usage), Extend (Plugins). |
| Models | Not a top tab. | Sidebar item under Work. |
| Settings | Gear on the right of the tab strip. Tooltip `Settings (Ctrl+,)`. Opens in place; top tabs stay but none is selected. Section nav is a **second horizontal row** under the tabs: GENERAL, ALLOWANCES, NETWORK AND SHARING, MODELS, PRIVACY, SYNC AND BACKUP, ABOUT (wraps). | Gear at the **bottom of the sidebar**. Sections are a **vertical list** in that sidebar (General, Allowances, …). Breadcrumb `Settings / General`. |
| Other chrome | Bird mark + a small unlabeled square icon at the left of the tab strip. Refresh and gear and close sit on the right of the same strip. No breadcrumb. | Breadcrumb (`Work / Agents`). Refresh is top-right of the content header, not in a tab strip. Sidebar footer shows gateway dot `127.0.0.1:3425`. |
| Size | See below. Content scrolls inside the card. | Page fills the browser viewport; lots of empty canvas under the cards. |

## Window size vs full screen

- X geometry (`xwininfo` on `0x1a0000f`): **712×652 at +630+300** on a **1920×1200** screen. Unchanged after the clicks.
- Share of the desktop: width 712/1920 ≈ **37%**, height 652/1200 ≈ **54%**, area ≈ **20%**. Not maximized, not snapped.
- Screenshot feel: white card about **439×399 px** (x 438–876, y 216–614). The X window is larger (~475×435 screenshot px) because of a transparent shadow around the card.
- Large dark wallpaper margin on all sides. Plank dock still visible. Reads as a compact panel, not a full-screen app. Settings General and the install list both clip and scroll; the web page shows the same settings blocks without that clip.

## Clicks

| id | control | result | shots |
|---|---|---|---|
| N-00 | Agents (already showing) | Cursor row, "Can't connect" / "Only Cursor's own models". No Get started card (web official shot still has it; this session does not). Install another agent (14) collapsed. PROFILES "none yet". + Save current. | N-00-agents.png |
| N-01 | Top tab Providers (x≈590,y≈232) | Pill moves to Providers. "ADD YOUR FIRST PROVIDER", + Add provider, Find a vendor…, Import…. Subscriptions (Claude, ChatGPT API, Gemini CLI, ChatGPT, Copilot, Antigravity, More in Plugins) and Vendors (Anthropic, Google Gemini, DeepSeek, Kimi, Zhipu GLM, OpenAI, Vertex AI, xAI, Kimi Code, Z.ai). No connected provider. | N-01-providers.png |
| N-02 | Top tab Routing (x≈638) | "Waiting for a request". your agent → magpie 127.0.0.1:3425. "No request yet". 0 requests, 0 rerouted, 0 errors. Hide accounts. | N-02-routing.png |
| N-03 | Top tab Gateway (x≈685) | Gateway **running**. "0 models · no agent routed through it yet · five APIs, one URL". URL `http://127.0.0.1:3425`. Restart gateway. Connect section, API tabs (OpenAI selected). "No models yet." | N-03-gateway.png |
| N-04 | Top tab Usage (x≈731) | Overview / Requests / Sessions / Context. Today selected. ≈$0.000. Empty: "No calls today. Point an agent at a catalog model and use it…" | N-04-usage.png |
| N-05 | Top tab Plugins | First click x≈770 missed (pointer sat in the gap just left of the word; Usage stayed selected). Retry x≈778 selected Plugins. Discover: search, "Subscriptions and gateway middleware", subscription cards (OpenCode Zen Free, ZCode, …) with Install. Not an empty page. | N-05-plugins.png |
| N-06 | Gear (x≈836). Tooltip `Settings (Ctrl+,)` | Settings replaces the page. Top tabs remain, none selected. Horizontal section nav (GENERAL current). Visible: Find a setting; Appearance System/Light/Dark; Language System; Text size 100% 110% 125% 150%; Interface font / Code font System default; "Click the tray icon to" Open the quick panel / Open the main window; Provider in model names Off / Not on names I set / On. Shorter than the web General page, so lower rows (Gateway mode, Codex, Prevent sleep) are below the fold. No setting was changed. | N-06-settings.png |
| N-07 | Back via Agents tab (x≈543), then Manage on the Cursor row (x≈836,y≈305) | Modal "Manage agents". Note: hiding only changes this list. Search "Search agents…". Select search results / Invert search selection / Select unconnected agents / Clear selection. "0 agents selected". Cursor checkbox unchecked, "Not hidden". Hide selected, Unhide selected, Done. Nothing toggled. Dismissed with Escape (not the window X, not Done). Cursor still on the list, still Can't connect. | N-07-manage-before.png, N-07-manage-after.png |
| N-08 | Install another agent (14) (x≈508,y≈336) | Fold expanded (chevron up). Note: run a command in a terminal, then come back; npm needs Node.js. Rows visible without scrolling: Claude Code, Codex, Gemini CLI, each with copyable install commands. Did not copy or run any command. | N-08-install-before.png, N-08-install-after.png |
| N-09 | Scrolled the expanded list to the bottom, then + Save current (x≈823,y≈576) | Before: PROFILES "none yet · save the setup to switch back in one click" and "+ Save current", with Snow CLI / AtomCode above. After: inline "Profile name" field + Save button. No name typed. Escape dismissed the editor (same as web A-29). "+ Save current" returned; still "none yet". | N-09-save-before.png, N-09-save-after.png |

## Left state

Agents tab. Install another agent (14) still expanded, scrolled to Profiles. No profile saved. Manage modal closed. Cursor not hidden. Magpie window still mapped at 712×652+630+300. Close X not used.
