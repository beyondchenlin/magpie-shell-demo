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

Demo v0.1.41: FONTS_MENU + Appearance theming .35s — Interface/Code font family+style menus (Search fonts… / Refresh / System default), CSS vars via applyDemoFonts; style pick disabled on System default.

## SYNC + ABOUT deep pass (shots 71–106)

Native Linux, magpie pid 560329, window **752×652**. Running **0.1.1240**; About says **0.1.1244 is downloaded**. Restart to update was hovered, not clicked. Sync was not turned on. Nothing exported or imported. Mirror was not saved. P1 N/A. Allowances quota body not touched. Observability still not in the tab row.

### SYNC AND BACKUP (71–88)

| shot | control | seen |
|---|---|---|
| 71 | Sync top | WebDAV, S3 or GitHub sync · Set up. Export… Import…. Sync is off. |
| 72 | truncated subtitle hover | Tooltip: "Keeps providers with their API keys, settings, profiles, agents' models, library the same on every computer". |
| 73–74 | Set up · WebDAV | Sync to WebDAV (selected) / S3 / GitHub. Address placeholder `https://dav.jianguoyun.com/dav/`. Hint: a folder named magpie is made in it. User, Password, Passphrase. Also sync: Providers' API keys, Agents' models, Library on; Usage off. Cancel / **Turn on** (not clicked). |
| 75 | Usage checkbox | Turned on locally (not saved). Hint: usage goes as a file a day — times, tokens, models and costs, never what was said. Turned back off before leaving WebDAV. |
| 76 | Sync to S3 | Endpoint `https://<account>.r2.cloudflarestorage.com`, Bucket, Prefix, Region `us-east-1, or auto for R2`, Access key `AKIA…`, Secret. |
| 77 | Path-style On | "the bucket in the path, not the host name". Hint: MinIO and most NAS servers need it. Turned back off. |
| 78 | S3 lower | Also sync defaults (Usage off). Cancel / Turn on. Not saved. |
| 79–80 | Sync to GitHub | Repository `owner/repo` (private, owner/repo). Branch empty = default; empty repos initialized by first sync. Folder optional; backup at `<folder>/magpie/magpie.magpie-backup`, each update a commit. Token: fine-grained, Contents read and write, kept on this computer, separate from the library token. Same passphrase + Also sync. Cancel / Turn on. |
| 81 | Cancel | Form closes. Row returns to **Set up**. Sync still off. |
| 82–83 | Export… | Passphrase / again. Both checks on, then Library unchecked. Hint: needed to open the file; subscriptions aren't in it. Cancel. **Export not clicked.** Nothing written. |
| 84–88 | Import… | File: No file chosen, Choose…. Passphrase. Agents' models unchecked; library stays on. Hint: providers with the same id are replaced; a provider without a key keeps the key here; library replaces the local one and keeps backups. Choose… opens the GTK **Select File** dialog (shot 86, 1100×680): Home / Desktop / workspace / Other Locations, Cancel / Open. List empty (accept `.magpie-backup`). Escape. Still "No file chosen". Cancel. **Import not clicked.** |

### ABOUT (89–106)

| shot | control | seen |
|---|---|---|
| 89 | About top | Version `0.1.1240`, sub `0.1.1244 is downloaded`, Restart to update. What's new · Open. Update button **Off** (no header arrow). Automatic updates **On**. Check every **6 h** (also 30 min / 1 h / 24 h). Restart automatically **Off**. Download source `GitHub` · Use a mirror… |
| 90–92 | What's new | Dialog "What's new in v0.1.1244". v0.1.1244 badge **NOT INSTALLED YET**, then v0.1.1240 changes. Scrolled. Close. No issue links opened. |
| 93 | Update button On | Header gets the purple update arrow. Green **Saved**. Restored Off in 97 (arrow gone). |
| 94 | Automatic updates Off | Check every and Restart automatically subs become "While automatic updates are on"; segments dim. Restored On before 95. |
| 95 | Check every 30 min | Selected, then restored **6 h**. 1 h and 24 h seen, not selected. |
| 96 | Restart automatically On | White thumb on On. Restored **Off**. |
| 97 | restored | Update button Off, automatic updates On, check every 6 h, restart automatically Off. |
| 98 | Download source hover | Tooltip: "The update and its checksum always come from usemagpie.ai; a file from the mirror that doesn't match it is not installed." |
| 99 | Use a mirror… | Inline editor, placeholder `https://mirror.example/`, Cancel / Save. **Cancel.** Still GitHub. |
| 100 | lower | Config folder, Command line, Gateway URL. |
| 101–102 | Config folder | Path tooltip `~/.config/magpie`. Copy → green check + toast **Path copied**. Open not clicked. |
| 100, 105 | Command line / copy tip | Sub: "A new terminal can't find the magpie command". Green dot **bash** · "runs this app". "A change reaches terminals opened after it". Copy button tooltip **Copy**. |
| 103 | Gateway + Community | Gateway `http://127.0.0.1:3425`, copy → **Gateway URL copied**. Join Discord, GitHub. |
| 104 | Discord hover | Tooltip `discord.gg/vGSnD3ZKQF`. Not opened. |
| 106 | GitHub hover | Tooltip `github.com/yetone/magpie`. Not opened. |

## Left state after this pass

Settings on About (community row). Sync off (Set up). Export and import panels closed. No file chosen, nothing exported. Update button Off, automatic updates On, check every 6 h, restart automatically Off, download source GitHub. theme system, textSize 110. Gateway still `http://127.0.0.1:3425`. magpie pid 560329 still running. Restart to update not clicked.

Not in this window: Observability tab (still hidden). Allowances quota body still N/A. P1 N/A.

## GENERAL font menus (shots 107–134)

Native Linux, magpie pid 560329, window **752×652**. General was still on System default for both font rows (the earlier table's "menus not opened"). Menus opened, exercised, then both rows restored to **System default**. Green **Saved** toast on every committed change. Escape closes a menu without changing the value. No Cancel button. Observability still not in the tab row. Allowances quota not touched. textSize still 110, theme system, language system.

Each row is LTR: family menu (left) then style menu (right), preview `Aa 0123 · 中文` under the pair. Family menu is a card titled with the row name. Style menu is a smaller card titled **Font style**, and it does not open while the family is System default.

### Interface font (108–125)

| shot | control | seen |
|---|---|---|
| 107 | both rows closed | Family + style both `System default`. Preview `Aa 0123 · 中文`. |
| 108 | family menu | Title **Interface font**. Search field focused, placeholder `Search fonts…`, blue ring. **✓ System default**. List in each face, A–: ABeeZee, Abel, Abhaya Libre, Abhaya Libre ExtraBold, Medium, SemiBold. Chevron on the family button points up. Button tooltip `System default`. |
| 109 | hover System default | Gray row fill on the checked item. |
| 110–112 | search `Noto` | Substring filter. Hits include Monoton (contains "noto"), Noto Color Emoji, Noto Kufi Arabic, Noto Naskh Arabic, Noto Sans, Noto Sans Arabic, Noto Sans CJK HK/JP/KR/SC/TC, Devanagari, Malayalam, Mono + Mono CJK, Symbols, Serif + Serif CJK, Serif Devanagari, Serif Display, Ethiopic, Gujarati. Scrollbar. System default is not pinned once the query is set. |
| 112–113 | end of that list | Last rows then **Refresh fonts**. Hover fills the row under the pointer (Noto Serif Display, then Refresh fonts). |
| 114 | Refresh fonts click | Menu closes immediately. No loading line and no toast in the frame. Selection still System default. |
| 115–116 | style button while default | Hover shows no tooltip and no menu. Click is a no-op (same pixels). Style stays disabled on System default. |
| 117 | search `zzzznone` | No "no matches" copy. The list is only **Refresh fonts**. System default is filtered out. |
| 118 | Escape | Menu closes. Query discarded. Still System default. |
| 119–120 | search `Noto Sans CJK SC` → pick | Menu closes. Family button reads `Noto Sans CJK SC`, style button enables and reads **Regular**. Whole settings chrome takes that face. **Saved**. |
| 121–122 | style menu | Title **Font style**, opens **down**. ✓ Regular (hover fill), Bold. Button tooltip `Regular`. Hover fills Bold. |
| 123 | Bold | Style button **Bold**. Chrome and preview go bold. **Saved**. |
| 124 | family menu again | Opens at the top of the catalogue. **No check** on System default, and the selected family is not scrolled into view. |
| 125 | System default | Both interface buttons back to System default. Chrome weight back. **Saved**. |

### Code font (126–134)

Same menu chrome. Title **Code font**. Picking a code face does **not** restyle the settings chrome; only the code preview `Aa 0123 · 中文` changes.

| shot | control | seen |
|---|---|---|
| 126 | family menu | ✓ System default. Same A– list (through Aboreto in the first screen). Search focused. Menu sits **above** the row. |
| 127 | search `Deja` | DejaVu Sans, **DejaVu Sans Mono**, DejaVu Serif, then Refresh fonts. |
| 128 | DejaVu Sans Mono | Family `DejaVu Sans Mono`, style **Book**. Preview goes monospace. Interface row still System default. **Saved**. |
| 129–130 | style menu | Opens **up** (row is low). **Font style**: ✓ Book, Oblique, Bold, Bold Oblique. Tooltip `Book`. Hover fills Oblique. |
| 131 | Escape | Menu closes. Still Book. Style button keeps a blue focus ring. |
| 132 | Oblique | Style button **Oblique**. Preview italic. Chrome unchanged. **Saved**. |
| 133 | family menu while set | Title Code font, search focused, list at top with **no check** on System default (selection not scrolled in). Button tooltip `DejaVu Sans Mono`. |
| 134 | System default | Both code buttons System default. Preview proportional again. **Saved**. |

Family list is the installed desktop catalogue (hundreds of families; this machine has on the order of 900). Names draw in their own face. Refresh fonts is the last row, not a separate footer outside the scroll. There is no Cancel; Escape dismisses family and style menus.

## Left state after this pass

Settings on General, font rows in view. Interface font and Code font both **System default** (style menus disabled again). textSize **110**, appearance System, language System. Nothing else in General toggled. Gateway still `http://127.0.0.1:3425`. magpie pid 560329 still running.

Not in this window: Observability tab (still hidden). Allowances quota body still N/A.

Next General rows still unopened below the fonts: Provider in model names, Codex subagents, Long conversations, Codex thread titles / descriptions / composer predictions / auto-review pickers, Open at login, Lightweight mode, Prevent sleep. Tray row was on screen (`Open the quick panel`) and not toggled.

## GENERAL below the fonts (shots 135–177)

Native Linux, magpie pid 560329, window **752×652**. Continued from the font rows (both still **System default**). Every control exercised here was put back. textSize **110**, appearance System, language System. Observability still not in the tab row. Allowances quota not touched. No Codex memories row (hidden). Colorblind mode is above the fonts (Off) and was not part of this pass.

Green **Saved** only on `savePrefs` rows (tray, lightweight, prevent sleep). The dedicated endpoints — provider names, Codex subagents, long conversations, the four Codex pickers, open at login — change the control and do **not** toast.

### Tray (135–138)

Not nested. Two segments, no extra rows. Toggled and restored.

| shot | control | seen |
|---|---|---|
| 135 | rows under the fonts | Tray through Open at login. Code-font preview clipped at the top. Provider **On**. Subagents **Off**. Compact at **272K** with placeholder `272k`. Four Codex chips on Codex's own. Login **Off**. |
| 136 | hover Open the main window | Unselected label darkens. No row fill, no tooltip. |
| 137 | Open the main window | Thumb on that segment. **Saved**. |
| 138 | Open the quick panel | Restored. **Saved**. `tray` back to `panel`. |

### Provider in model names (139–142)

LTR: Off / Not on names I set / **On**. No nested line (no connected agent whose list ignores the setting). No toast.

| shot | seen |
|---|---|
| 139 | Pointer on Off before the click. |
| 140 | **Off** selected. |
| 141 | **Not on names I set** selected. |
| 142 | **On** restored. |

### Codex subagents (143–145)

| shot | seen |
|---|---|
| 143 | Truncated subtitle tooltip: "A GPT lead spawns subagents on magpie's other models. New threads only; Codex's own multi_agent_v2 still wins". |
| 144 | **On**. No warning line, no toast. |
| 145 | **Off** restored. |

### Long conversations (146–153)

LTR: segment **Compact at 272K** / Full window, then a number field (placeholder `272k`, tooltip **Compact at**). The subtitle is static (it keeps saying 272K even after a custom threshold). Full window hides the field and the subtitle column widens, so more of the line shows before the ellipsis.

| shot | seen |
|---|---|
| 146 | Subtitle tooltip, whole: "Codex and Claude Code compact at 272K or the size typed; a full window makes turns slower and costlier". |
| 147 | Field tooltip **Compact at**. |
| 148 | Typed `nope`, blurred. Field keeps `nope`. Red toast "Compact at: nope is not a number of tokens like 272k". Segment stays Compact at 272K. Not saved. |
| 149 | `180k` committed. Segment **Compact at 180K**, field `180k`. |
| 150 | Field focused: blue ring around `180k`. |
| 151 | Field cleared. Placeholder `272k`, segment **Compact at 272K**. |
| 152 | **Full window**. Number field gone. Subtitle reads through "or the size typed;". |
| 153 | **Compact at 272K** restored, field back. `fullContext` and `compactAt` absent again. |

### Codex pickers (154–168)

Empty catalog on this machine: no provider rail, no model rows. Each menu opens **up** (above the row) at this scroll. Search is focused, placeholder `Filter, or type any model id…`. Escape closes without saving. A typed id that matches nothing is offered as **use as typed**, not "No matches." That row was not clicked. A favorite star (Add to favorites) appears on hover of a row that has a value — Off has one, Codex's own (empty value) does not. The star was not clicked.

**Thread titles**

| shot | seen |
|---|---|
| 154 | Checked **Codex's own (ChatGPT)** · as Codex sends them. Then **Off** · no title, nothing sent. |
| 155 | Off row hover fill. Star on the right of Off. |
| 156 | Arrow Down from Off wraps the cursor back onto Codex's own. Star stays while the pointer is still on Off. |
| 157 | Search `zzzznone` → one row, `zzzznone` · use as typed. |
| 158 | Search `off` → only the Off row. |
| 159 | Escape. Chip still Codex's own (ChatGPT). |
| 160 | Hovering the Off note tooltips **no title, nothing sent**. |
| 162 | Off picked. Chip is the word **Off**, no icon. `codexTitles=off`. No toast. |
| 163 | Reopened: the current value is sorted first. **Off** checked, then Codex's own. |
| 165 | Codex's own picked again. Chip restored. Key absent. |

**The other three** (opened, Escape, not changed)

| shot | seen |
|---|---|
| 166 | Descriptions. Only **Codex's own (ChatGPT)** · as Codex sends them. No Off. |
| 167 | Predictions. Codex's own, then **Off** · no prediction, nothing sent. Star on the Off hover. |
| 168 | Auto-review. **Codex's own pick** · as Codex picks it. No Off. |

### Open at login (169–170)

Not nested. No Saved toast. On writes `~/.config/autostart/magpie.desktop` (Type=Application, Name=magpie, Exec this binary plus `tray`). Off deletes that file.

| shot | seen |
|---|---|
| 169 | **On**. Desktop file present. |
| 170 | **Off** restored. File gone. |

### Bottom (171–177)

| shot | seen |
|---|---|
| 171 | Scrolled to the end of General. Lightweight **Off**. Prevent sleep **Off** / On / Screen on too. Subtitle "Keeps this computer awake while magpie runs tasks" fits, not truncated. |
| 172 | Lightweight subtitle tooltip: "A closed window frees about 100 MB after a minute; the gateway and tasks keep running, only the page reloads". |
| 173 | Lightweight **On**. **Saved**. |
| 174 | Lightweight **Off**. **Saved**. |
| 175 | Prevent sleep **On**. Subtitle unchanged. **Saved**. |
| 176 | **Screen on too**. Subtitle becomes "Keeps this computer and its screen awake while magpie runs tasks". **Saved**. |
| 177 | Prevent sleep **Off**. Subtitle back. **Saved**. |

## Left state after this pass

Settings on General, scrolled to the bottom (lightweight and prevent sleep in view). Tray **Open the quick panel**. Provider in model names **On**. Codex subagents **Off**. Long conversations **Compact at 272K** (placeholder, not a saved threshold). All four Codex chips on Codex's own. Open at login **Off** (no autostart file). Lightweight **Off**. Prevent sleep **Off**. Fonts still System default. textSize 110, theme system, language system. Gateway still `http://127.0.0.1:3425`. magpie pid 560329 still running.

Not in this window: Observability tab (still hidden). Allowances quota body still N/A. Codex memories row still hidden. Colorblind mode (above the fonts) was on screen earlier and was not exercised.

Shots 161 and 164 were dropped (a missed favorite click and a duplicate of the Off-sorted picker). The favorite star was left alone.
Demo v0.1.81: SETTINGS_GENERAL_135_177 — tray Saved; silent dedicated endpoints; Compact nope/180k/Full window; Codex pickers empty catalog preferUp; Login autostart LS; Lightweight tip; Prevent sleep subtitle; Observability/Allowances/Codex memories skipped.
