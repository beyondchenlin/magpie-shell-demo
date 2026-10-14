# Settings — native Linux (magpie 0.1.1233)

Opened from the gear on the top tab strip. Tooltip: `Settings (Ctrl+,)`. Top tabs stay, **none selected**. Section nav is a wrapping row under the tabs (not a sidebar).

Window still **712×652**. `textSize` was exercised at 125% then restored to **110**. `theme` left **system**. `lang` left **system**. No export, import, port apply, share toggle, or token save.

Observability (`setTab-otel`, feature `otel`) is **not in the tab row**.

## Tab row

Wraps. On this width, row 1: GENERAL, ALLOWANCES, NETWORK AND SHARING, MODELS, PRIVACY, SYNC AND BACKUP. Row 2: ABOUT. Selected label is darker/heavier. Find a setting sits under the row, right-aligned search.

## GENERAL (top → bottom)

| row | control | seen state |
|---|---|---|
| Appearance | System / Light / Dark | System. Clicked Light (page stays light, cards white). Clicked Dark: page ~`rgb(35,35,39)`, chrome ~`rgb(26,26,30)`. Restored System. Thumb 280ms `--ease`. |
| Language | menu `System ▾` | Opens a card menu, chevron flips up. Items: **System** (check), English, 简体中文, 繁體中文, 日本語, Deutsch. Hover fills the row (繁體中文). Esc closed. Not changed. |
| Text size | 100 / 110 / 125 / 150 | Was 110. Tooltip: everything in magpie's windows, larger; Ctrl+ / Ctrl− / Ctrl+0. Clicked **125** (layout reflow, persisted). Restored **110**. |
| Interface font | two `System default` menus + preview `Aa 0123 · 中文` | Menus not opened. |
| Code font | same pair + same preview | Menus not opened. |
| Click the tray icon to | Open the quick panel (on) / Open the main window | Matches `tray=panel`. Not toggled. |
| Provider in model names | Off / Not on names I set / **On** | Not toggled. |
| Codex subagents on any model | Off / On | Off. Sub: a GPT lead spawns subagents on magpie's other models. New threads only. |
| Long conversations | Compact at 272K (on) / Full window / 272k | Not toggled. |
| Codex thread titles | chip `Codex's own (ChatGPT)` | Picker not opened. |
| Codex thread descriptions | same chip | Picker not opened. |
| Codex composer predictions | same chip | Picker not opened. |
| Codex auto-review model | `Codex's own pick` | Picker not opened. |
| Open at login | Off / On | Off. |
| Lightweight mode | Off / On | Off. Sub: a closed panel frees about 100 MB after a minute. |
| Prevent sleep | Off (on) / On / Screen on too | Off. Sub: keeps this computer awake while magpie runs tasks. |

Not on this Linux window (present in HTML, hidden): Gateway mode, Bar icon, Show in Dock, Detect agents in WSL, Session terminal, Codex memories model.

## ALLOWANCES

- Allowances in the menu bar: **Off ▾** (dropdown not opened). Sub about subscriptions or tokens/cost today or 7 days.
- Allowance display: **Used** / Left.
- Allowance reads: **Automatic** / When I ask.
- Currency: **$ USD** / ¥ CNY.
- Allowance alert: Off / On.
- Low balance alert: Off / On.
- Reset reminder: **Off** / 12 h before / 24 h before / 48 h before.
- Task done alert: **Off** / 1 min / 3 min / 10 min. Sub names Claude Code, Codex, OpenCode.

Lower rows from the HTML (menu bar refresh, logos, magpie icon, pace, warm-up, daily check-in) were **below this scroll** and not captured as their own shot. Scroll file shows through Task done alert.

### Deep allowances pass (shots 19–39)

Exercised and left restored where noted:

- Menu bar pill **Off ▾** → menu: Off / Tokens and cost today / Tokens and cost, last 7 days (hover 7d) → set **Today** → closed showing Today → restored Off.
- Menu bar refresh → **1 min** (when shown).
- Pace **On**; Allowance display **Left**; Reads **When I ask**; Currency **¥ CNY**; Allowance alert **On** then **81%** style threshold; Low balance **On** / amount **6** / back **Off**.
- Reset reminder **12 h before**; Task done **1 min**.
- Scrolled to warm-up / bottom; restored lower rows (38–39).
- Network top re-checked (`40-network-top.png`).

Demo v0.1.13 aligns: TrayUsagePick Off/Today/7d; Used/Left; Automatic/When I ask; $ USD / ¥ CNY; reset 12/24/48 h; task done 1/3/10 min; refresh 1/3/5/15 min.

## NETWORK AND SHARING

- Proxy: **Auto** / Off / Custom. Sub: no system proxy found.
- GITHUB — GitHub token field placeholder `ghp_… / github_pat_…`, **Create one ↗**, Save. Not edited.
- GATEWAY — port field **3425**, Apply. Sub: agents move with it. Now `http://127.0.0.1:3425`. **Apply not clicked.**
- Model ids without the provider: Off / On.
- LOCAL NETWORK — Share on local network: **Off** / On. Not turned on.

## MODELS

- IMAGES — Image recognition: `Automatic · no model that sees` (picker not opened).
- Image generation: `Automatic · no model that draws`. Link **Turn on the Library** (Plugins). Not clicked.
- Image recognition MCP server: `http://127.0.0.1:3425/mcp/magpie/vision` + copy.
- WEB SEARCH — Searches for other models: `Automatic · no provider that searches`.
- Search APIs row starts at the bottom of the shot (order of search APIs). Rest not scrolled in a dedicated frame (`12-models-scroll.png`).

## PRIVACY

- Mask secrets Off/On. Mask personal data Off/On. Hide accounts Off/On.
- Masked words field placeholder `names, codenames, hosts`.
- Masking rules: API_KEY chip, **Prefix** / Regex, value `oc_sk_`, **Add**.
- Count me as a user Off/On.
- Share the agents, providers and models I use — row clipped.

## SYNC AND BACKUP

- WebDAV, S3 or GitHub sync — **Set up** (not opened; click landed on the description tooltip).
- **Export…** expands inline (not a separate window). Close on the row. Fields: Passphrase, again. Checks on: With the providers' API keys; With the library. Cancel / **Export**. Cancelled. Nothing exported.
- **Import…** expands inline. Close. File: No file chosen, Choose…. Passphrase. Checks on: Set the agents' models too; Bring in the library too (copy explains providers with the same id are replaced; library replaces the local one and keeps backups). Cancel / **Import**. Closed without choosing a file.

## ABOUT

- Version: running **0.1.1233**, `0.1.12335 is downloaded`, **Restart to update** (not clicked).
- What's new — Open.
- Update button Off/On (header arrow is On; the purple update chip is showing).
- Automatic updates Off/On.
- Check every: 30 min / 1 h / **6 h** / 24 h.
- Restart automatically Off/On.
- Download source: **GitHub** / Use a mirror…
- Config folder `~/.config/magpie` copy + **Open**. Hover tooltip shows the path.
- Command line: green dot, **bash**, `runs this app`.
- Gateway URL `http://127.0.0.1:3425` copy.
- Community: **Join Discord**, **GitHub**.

## Motion

Same tokens as Gateway: segment thumb **280ms** `cubic-bezier(.2,.8,.2,1)`; buttons **.16s** `--ease`, active scale .96. Language menu chevron flips immediately; row hover is a gray fill. Inline Export/Import panels expand in place (no scrim). Dark appearance is an instant repaint of the page (no cross-fade caught at 30fps).

## Left state

Settings, Sync and backup, export/import panels closed. theme system, lang system, textSize 110, tray panel. Gateway still running. Top tabs visible, settings section still showing (no app tab selected).

## NETWORK deep pass (shots 41–50)

Exercised on native Linux (magpie 0.1.1233), then share restored Off:

| shot | control | seen |
|---|---|---|
| 41 | Proxy → Custom | Input `http://127.0.0.1:7890` appears left of segs |
| 42 | Proxy → Auto | Restored; "No system proxy found…" |
| 43 | Proxy → Off | Sub: Off · go direct |
| 44 | Model ids without the provider → On | Bare ids On |
| 45 | Share on local network → On | Address / Allowed / Web pages appear |
| 46 | scrolled with Share On | Address OpenAI + URL pill + Allowed Add + WEB PAGES header |
| 47–48 | Address OpenAI / Anthropic + interface menu | URLs `http://172.30.0.2:3425/v1` and `http://172.17.0.1:3425/v1` (OpenAI adds `/v1`; Anthropic root). Menu checkmark on selected. Copy beside pick. |
| 49 | Web pages that may call magpie | Placeholder `http://localhost:3000` + Add |
| 50 | Share → Off | Address + Allowed collapse (height .28s); Web pages stays |

Demo v0.1.14: LAN demo IPs match 172.30.0.2 / 172.17.0.1; protocol suffix; menu; Allowed + CORS Add; Proxy Custom fields.


## MODELS deep pass (shots 51–60)

| shot | control | seen |
|---|---|---|
| 51 | Models top | Image recognition/generation Automatic chips; Turn on the Library link; MCP vision URL; Searches Automatic; Search APIs row |
| 52–53 | Image recognition / generation #pop | Model picker menus opened (not changed) |
| 54 | MCP copy | Copy flash on vision MCP |
| 55 | Searches for other models #pop | Picker opened |
| 56 | scrolled | Search APIs + MCP web-search + Replies start |
| 57–58 | Search API vendor menu | Tavily (check), Brave Search, Exa, Firecrawl, You.com, SearXNG (your own); key + Get a key + Add; Base URL field |
| 59 | Name the member → On | then restored Off in later frames if noted |
| 60 | bottom | Stop looping On; Ask again = All; Disable…; Saved toast |

Demo v0.1.14: Disable… → #pop; Search APIs vendor list matches; Add/Show/Copy/Remove local.

## PRIVACY deep pass (shots 63–70)

| shot | control | seen |
|---|---|---|
| 63 | Privacy top | Mask secrets, Mask personal data, Hide accounts all Off. Masked words placeholder `names, codenames, hosts`. Masking rules: name `API_KEY`, Prefix selected, value `oc_sk_`, Add. |
| 64 | Mask secrets On + Mask personal data On | Nested rows appear under personal data (page grows). |
| 65–66 | nested rows, all Off | Social Security numbers; Passport numbers (after the word passport, 护照 or パスポート); IBANs; Birthdays; MAC addresses; Serial numbers (after S/N, Serial or 序列号); User name in home folders; User and computer names; Public IP addresses; Cloud storage buckets. |
| 67–68 | Masking rules | Prefix (value `oc_sk_`) / Regex. Regex swaps the sample to `oc_sk_[A-Za-z0-9]{20,}`. Add not clicked. Prefix restored. |
| 69 | lower rows | Count me as a user Off. Share the agents, providers and models I use Off. AGENTS' SIGN-INS: Subscription accounts (read Claude Code, Codex, Copilot, Cursor…) — On is the selected pill by default; not changed. |
| 70 | masks Off | Nested rows collapse. Hide accounts still Off. |

Not typed: masked words, rule name, Add. No key saved. Green Saved toast on toggle.

## Left state after this pass

Proxy Auto. Share on local network Off. Menu-bar allowances Off. Allowance display Used, reads Automatic, currency USD, alerts Off, reset Off, task-done Off. Mask secrets and personal data Off. theme system, textSize 110. Gateway still on port 3425.

## MODELS / PRIVACY follow-up (shots 61–70)

| shot | note |
|---|---|
| 61 | Replies toggled (Name member / Stop looping / Ask again) |
| 62 | Disable… #pop open — "Filter, or type any model id…" / No matches (empty catalog on this machine) |
| 63–70 | Privacy: masks on/nested, rules Prefix/Regex, sign-ins, restored |

Demo v0.1.15: Disable #pop left rail (grid/star) +「No matches.」; Privacy nested REDACT_KINDS / Regex sample / Subscription accounts Off·On (shots 63–70).

Demo v0.1.39: SETTINGS_NEST_PARTIAL — General Provider names / Text size / fonts shell.

Demo v0.1.40: SETTINGS_NEST — frames 10–70 consumed (Allowances alert num+%/balance amount, TRAY_EVERY 1/3/5/10/30, Linux no logos/bird, Network GitHub Create one↗, Models/Privacy/Sync/About; Observability tab hidden unless magpie.feature.otel=1). Allowances quota body still N/A.
