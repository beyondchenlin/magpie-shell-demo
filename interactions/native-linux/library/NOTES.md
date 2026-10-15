# Library (native Linux, magpie 0.1.1240)

Frameless window **752×652 at +610+300** (id 27262991, DISPLAY=:6). Shots are `ffmpeg` x11grab of that rect. Do not resize. Close (X) was not clicked.

Library is a builtin (`library`), off in the essentials preset, so it was **not** in the top chrome at the start. It was turned on from this window: Plugins → Built-in → Library. The tab then sits between Agents and Providers. At 752px the chrome is cramped: the refresh glyph overlaps the Plugins pill. After the shots the same switch was turned **Off** again (Saved pill). `magpie plugin builtin` shows library off; gateway stays on and locked; groups, otel, sessions, warmups stay off.

Sub-tabs (localStorage `magpie.libTab`), left to right: **Instructions**, **MCP servers**, **Skills**, **Hooks**, **RTK**. Head actions on the right: **Discover** (MCP and Skills only; jumps to the market), **Library folder**, **Backups**. No shot 14.

Nothing was installed, added, or saved. `magpie library` afterwards: Instructions none, MCP servers none, Skills none. The directory `~/.config/magpie/library` does not exist.

## Instructions (01–05)

Empty library. One set **Default**, empty, **In use** (radio on). Opening the row shows the name field `Default` and a textarea (placeholder about code, stack, tests). Default cannot be removed. Nothing was typed.

Agents block is empty. Aside: Cursor keeps no user-wide instructions file. Truncated notes: "They read Default · Empty" and that magpie writes its part between two marker lines.

**+ New set** opens a draft: Name (e.g. Work), **Keep in a file…** (fills name `AGENTS.md` and path `~/.agents/AGENTS.md`), Cancel, Add. Enter in the name field would also create. Add was not clicked. Cancel dropped the draft. Because the in-use set is empty, Add would have switched agents onto the new set.

## MCP servers (06–13, 15–26)

Empty: "No servers in the library yet." Discover under the list, search "Search MCP servers — GitHub, Postgres, Figma…", note "Featured, and the official MCP Registry".

Featured, LTR/TTB, through the end of the list at Tavily:

- 06 Magpie Image (opt-in, Add…), Context7 (Remote, plain Add), Playwright, Chrome DevTools
- 07–08 GitHub (key, Add…), DeepWiki, Exa, Filesystem (key, Add…), Fetch, Memory
- 09–11 Sequential Thinking, Git, Time, Sentry, Linear, Notion, Atlassian, Supabase (Remote · sign-in), Stripe, Vercel
- 12–13 Neon, Cloudflare Docs, Microsoft Learn, Hugging Face, Brave Search (key, Add…), Firecrawl (key, Add…), Tavily (key, Add…)

Plain **Add** installs immediately. **Add…** and a card click open a sheet (Cancel / Add to the library). Neither install path was used.

**New MCP server** (15–20), not added:

- Command: name, command line, Environment pairs (`${NAME}`), agent chip Cursor. Cancel / Add.
- HTTP: URL, Headers, "Use your own OAuth app", **Save and sign in** (would save — not clicked).
- OAuth fields (17): Client ID, Client secret (password), Callback port, remove. Hint names GitHub OAuth Apps and `http://localhost/callback`. No values typed.
- SSE (18): URL + Headers only, no OAuth.
- An empty header row dirties the form. Cancel then asks **Discard unsaved changes?** Cancel / red Discard. Discard was clicked. Still no servers.

**Magpie Image** sheet (21–23): opt-in copy, agents start off, chip tip "Give it to Cursor", then on "Cursor has it — click to take it away". Homepage not opened. Cancel. Nothing installed.

Search `figma` (24–25): "26 results". Cards seen: figma-mcp (npx, key, Add…), Figma (Remote, plain Add), Figma MCP Server (npx, Add…), Figma MCP (npx, Add…). Search `zzzzqq` (26): featured cards linger, then **0 results** / Nothing matches. Cleared afterward.

## Skills (27–31)

Intro about SKILL.md. Find row: "owner/repo, a GitHub link, or a folder on this computer" + **Find skills**. Discover "Popular on skills.sh".

Cards seen: magpie-quota (official), find-skills (vercel-labs/skills, 3.9M), grill-me (1.4M), grill-with-docs (1.2M), then agent-browser (1.1M), improve-codebase-architecture, tdd, hyperframes-cli. Card **Add** installs immediately — not clicked. skills.sh / GitHub / Homepage links not opened.

**grill-me** sheet (28): 1.4M, skills.sh link, "From github.com/mattpocock/skills", Agents Cursor chip on by default. Cancel / Add to the library. Cancel used.

**Find skills** of `mattpocock/skills` (29–30): "38 skills in github.com/mattpocock/skills", Select all, Filter…, checkboxes (ask-matt, chief-of-staff, …). Footer: **for** + Cursor chip, Cancel, purple **Install 0 skills** (disabled, nothing checked). Checkboxes were not ticked. Install was not clicked. Cancel closed the probe. The probe is local until Install.

## Hooks (32–37)

Empty. Intro: a command an agent runs at a point of its turn; add it once and magpie writes it into each agent you pick. Dashed card: "No hooks in the library yet" and **+ Add a hook**. Discover is not in the head on this tab.

**New hook** (33), not added. Fields, all left at placeholders:

- Name `e.g. notify` (letters, digits, - and _)
- Description `e.g. Tell me when a turn ends` — optional, only the library keeps it
- When it runs: **When a turn ends**
- Command `curl -s https://api.day.app/KEY/done` — the agent's shell, in the session folder; the agent passes what happened as JSON. Placeholder only; nothing typed.
- Timeout (seconds): the agent's own
- Agents: Cursor chip
- Footer Cancel / Add. Add not clicked.

**When it runs** menu (34–37). Shared events, each noted "every agent, in its own name for it": When a turn ends (checked), After a tool runs, Before a tool runs, When a prompt is sent, When a session starts. Then Cursor's own events ("Cursor's own event"), scrolled to the end:

beforeShellExecution, afterShellExecution, beforeMCPExecution, afterMCPExecution, beforeReadFile, afterFileEdit, beforeSubmitPrompt, stop, afterAgentResponse, afterAgentThought, sessionEnd, preToolUse, postToolUse, postToolUseFailure, subagentStart, subagentStop, preCompact.

preCompact is the last row (scrollbar at the end). A few rows between afterAgentThought and sessionEnd were only partly in frame. No event was chosen; the select stayed "When a turn ends". Escape did not close this menu; Cancel on the dialog did.

The tool matcher and the Cursor-own Matcher were opened later, still as a draft (39–46). Add was not clicked.

## RTK (38)

"RTK isn't installed." Copy: magpie can install it, or get it from its site, plus the `curl … rtk-ai/rtk … install.sh` line. Buttons **Install RTK**, **Get RTK**, **Check again** — none clicked. Agents: Cursor, switch **off**. Note: restart an agent after switching it. The switch was not toggled (it would run RTK's installer). The page does not scroll further.

## Library folder and Backups

Tooltip on Library folder: `~/.config/magpie/library`. That directory is not on disk (nothing has been kept). The click still raised Thunar on the **parent** config directory. It was closed without opening a file. The shot was **not** kept: that parent lists credential files. Backups was not clicked; it reveals `lib.backups` the same way, and that path is not on disk either.

## Hooks nested (39–46)

Same **New hook** draft (39). Placeholders only; Name focused; Add not clicked. **When it runs** (40) matches 34: header "When it runs", **Find an event**, shared events with When a turn ends checked. Nothing was typed in the search on that shot. Escape still does not close this menu.

**After a tool runs** (41) is what adds the nested tool matcher. **For which tools** appears under it, default **Any tool**, hint "Each agent's own names for them". **Before a tool runs** uses the same control; that row was not selected again. Menu (42): Any tool (checked, hover tip "Any tool"), Shell commands, File edits. No per-row notes. **Shell commands** chosen (43); the button label changes and the hint stays. File edits stayed in the menu only. Command, timeout, and the Cursor chip were not edited. Add not clicked.

Event menu again with After a tool runs still checked (44). **Find an event** `beforeShell` (45): shared events stay in the list (they are always shown) and the list is scrolled to Cursor's own events — afterShellExecution, beforeMCPExecution (row lit), afterMCPExecution, beforeReadFile, afterFileEdit.

**Cursor · afterShellExecution** (46) drops For which tools and shows a **Matcher** text field. Placeholder `every tool`. Hint: "The agent's own matcher, as its hooks file has it; empty for all". Left empty — no pattern typed. An agent's own event is for that agent alone; the chip stays Cursor. Add was not clicked.

The draft was cancelled (Discard on the dirty dialog, not Add). `magpie library` afterwards: Instructions none, MCP servers none, Skills none. `~/.config/magpie/library` still does not exist. No hook file was written.

## Left state

Plugins → Built-in, Library **Off** (restored after 39–46). Top chrome is Agents, Providers, Routing, Gateway, Usage, Plugins — no Library. Gateway on, other builtins off. No instruction set, MCP server, skill, or hook was created. RTK switch left off. Window still 752×652 at +610+300. Close was not used. Library folder and Backups were not opened.

## demo 对齐（v0.1.57 HOOKS_NEST_DONE）
- 原生 library/39–46 全消费：When menu Find + always 共享事件；After/Before → For which tools（Any/Shell/File）；Cursor · afterShellExecution → Matcher `every tool`
- 未 Add；Discard；Library Off 已由点录恢复


## Skills probe pick (shots 47–51)

Web top-nav Magpie (same library.js). Built-in Library On → Library → Skills → Find `mattpocock/skills`.

| shot | what |
|---|---|
| 47-skills-tab | Skills tab: intro + Find field + Discover. |
| 48-skills-probe-open | Probe: **38 skills in github.com/mattpocock/skills**, Select all, Filter…, unchecked list (ask-matt…). Foot **for** Cursor · Cancel · **Install 0 skills** may sit below fold on 652 web. |
| 49-skills-probe-one-checked | First box **ask-matt** checked. Magpie enables **Install 1 skill** (demo already: `Install 1 skill` / `Install {n} skills`). Install not clicked. |
| 51-skills-probe-cancelled | Cancel → probe closed; no skills written. Library Off restored after session. |

Demo v0.1.59: SKILLS_PROBE_PICK — 47–51 consumed (checked → Install 1 skill already in LibraryView since earlier; NOTES nest closed).

## RTK nest (shots 52–56) — recording DONE

Same not-installed card as 38. **Install was not clicked** (would run RTK installer). Cursor switch not toggled. Get RTK opens external browser (document only). Library Off restored after session.

| shot | what |
|---|---|
| 52-rtk-page | Not-installed: logo · curl · Install RTK / Get RTK / Check again · Cursor switch off |
| 53-rtk-install-hover | Install RTK `.text.action` border hover |
| 54-rtk-get-hover | Get RTK pale hover |
| 55-rtk-check-hover | Check again pale hover |
| 56-rtk-check-again | Check again click → still not-installed (Magpie skeleton too brief to freeze) |

## demo 对齐（v0.1.61 RTK_NEST_DONE）
- 原生 library/52–56 全消费；Magpie Install/Get/Check 壳态（Installing… 不自动点 Install；Check skeleton 过短；未装 switch 禁用）
- Get RTK → 外链文档；**不**伪造已安装 path/version/gain/upgrade
- Skills probe Install：勾选后 → Installing… → 装入列表


## RTK nest — native window (shots 52–56)

Library was switched **On** under Plugins › Built-in (it had been Off), then Library → **RTK**. Same card as shot 38: not installed. Agent row **Cursor**, switch **off** — not toggled (that runs RTK's installer for the agent). Library folder and Backups were not opened.

No confirm dialog exists on these buttons. **Install RTK** was hovered only. Its click calls `library/rtk/install` immediately (label **Installing…**, copy "Installing RTK… this can take a minute.", then the curl install.sh line). There is no Cancel, so it was not clicked and the install was not started.

| shot | what |
|---|---|
| 52 | RTK tab. "RTK isn't installed." curl install line. **Install RTK**, **Get RTK**, **Check again**. Cursor switch off. |
| 53 | Pointer on **Install RTK**. Hover draws a border on that pill. No tooltip. Not clicked. |
| 54 | Pointer on **Get RTK**. Hover fills a pale pill behind the words. No tooltip. |
| 55 | Pointer on **Check again**. Same pale hover pill. No tooltip. |
| 56 | **Check again** clicked. The card comes back the same: still not installed, same three buttons, Cursor still off. The skeleton while `rtk` is cleared did not stay on screen long enough to freeze (15–30 fps). No dialog. |

**Get RTK** was clicked after 54. It opens the system browser (`api("open")`) to the public RTK site. Chrome came up fullscreen, title **RTK — Rust Token Killer**, and was closed without using the page. No library shot of that browser: it covered the magpie window, and it is not the nest. Nothing was installed from the site.

Library builtin was switched **Off** again afterwards. Top nav is Agents, Providers, Routing, Gateway, Usage, Plugins — no Library. Plugins › Built-in. RTK still not installed. Cursor switch was never turned on. Window 752×652 at +610+300. Magpie pid 560329 still running.

## demo 对齐（v0.1.63 SKILLS_INSTALL_PARTIAL）
- 原生 library/57+ Skills Install **尚未点录**（47–51 未点 Install；Installing… / toast 按 Magpie `probeResult`/`report` 源码回写）
- 勾选 → Installing… → `1 skill installed` / `{n} skills installed`；再 Find 时已装行 dim + **in the library**；Select all 仅 fresh
- 不伪造 too-big 帧；Allowances N/A

## Skills Install nest (shots 57–62) — recording DONE

Library On → Skills → Find `mattpocock/skills` (probe already open from prior). Window resized to 752×900 so the probe foot fit, then restored to 752×652.

| shot | what |
|---|---|
| 57-skills-probe-ready | Probe open: 38 skills · Select all · Filter · unchecked list |
| 58-skills-one-checked | **git-guardrails-claude-code** checked → foot **Install 1 skill** (for Cursor · Cancel) |
| 59-skills-probe-foot | Tall window: foot visible with Install 0/1 under list; Discover below |
| 60-skills-install-hover | Pointer on **Install 1 skill** (primary) |
| 61-skills-installed-toast | After click: probe closed; green toast **1 skill installed**; tab **Skills · 1**; In the library row; Give skills as Links; In projects; Discover |
| 62-skills-in-library | Same settled state (toast may have faded) |

**Installing…** on the button was too brief to freeze (install finished within ~1 frame). Magpie `probeResult` still labels the button Installing… until `skills/install` returns — demo keeps that busy state.

No credential folder opened. Library left On (skill remains). Window restored 752×652 at +610+300.

## demo 对齐（v0.1.64 SKILLS_INSTALL_DONE）
- 原生 library/57–62 全消费；Installing… 过短同 RTK skeleton
- 装后：Skills · N、In the library + Check for updates、Give skills as、In projects、Discover 顺序对齐 Magpie



## Skills post-install nest (shots 63–69) — recording DONE

| shot | what |
|---|---|
| 63-skills-check-hover | Pointer on **Check for updates** (tip Ask GitHub…); row-head also **By agent** |
| 64-skills-checking | Button **Checking…** busy/disabled |
| 65-skills-up-to-date | Settled; green toast **Every skill is up to date** |
| 66-skills-how-by-agent | Give skills as › By agent → **How each agent gets its skills** (Cursor · Library's way/Links/Copies · Done) |
| 67-skills-add-project | **Add a project** → folder field · Choose… · Add · Cancel (not submitted) |
| 68-skills-remove-hover | Row trash icon hover (↑ update + trash + Cursor chip) |
| 69-skills-remove-confirm | **Remove ask-matt?** + backups line · Cancel / danger Remove |

## demo 对齐（v0.1.65 SKILLS_POST_DONE）
- 原生 library/63–69 全消费；toast `Every skill is up to date`；双 By agent（row-head Skills by agent / how-bar How each agent）
- Add a project 内联卡；Remove 确认对齐 Magpie confirmRemoveSkill
- Plugins manual github Installing…（NOTES 29）同发

## Post-install nest (shots 63–71)

Same window, 752×652 at +610+300, Library still On, Skills tab. The live library row for this pass is **ask-matt** (github.com/mattpocock/skills, path `skills/engineering/ask-matt`), not the git-guardrails row in 61–62. git-guardrails had been removed before these shots; 57–62 are unchanged. One skill, so the head is only **By agent** and **Check for updates** (no Group again, Update all, or Turn all on/off).

| shot | what |
|---|---|
| 63-skills-check-hover | Pointer on **Check for updates**. Dark tip, clipped at the right edge: "Ask GitHub which skills changed since they were" (full title continues "installed"). |
| 64-skills-checking | Click. The control's label becomes **Checking…**. No dialog. No spinner froze in the frame. |
| 65-skills-up-to-date | Label back to **Check for updates**. Green toast, lower left, no buttons: **Every skill is up to date**. No Up to date chip on the row. |
| 66-skills-how-by-agent | **Give skills as** → **By agent** opens a sheet (page dimmed): **How each agent gets its skills**. Body: an agent can have its own way; the others get links. Row **Cursor**, sub **Gets links**, segments **Library's way** (on) / **Links** / **Copies**. Footer **Done**. Nothing was switched. Done closed it. |
| 67-skills-add-project | **In projects** → **Add a project**. Field placeholder "The project's folder, like ~/code/app", then **Choose…**, **Add**, **Cancel**. Choose… was not clicked (it opens the system folder picker). Nothing typed. Cancel put the aside back. |
| 68-skills-remove-hover | Row hover shows an update arrow and a trash icon left of the Cursor chip. Pointer on the trash; it turns red. No tooltip stayed on screen (title is Remove). |
| 69-skills-remove-confirm | Click opens **Remove ask-matt?** Body: "It is taken out of every agent it was given to, and its folder is moved to magpie's backups." **Cancel** and red **Remove** (pointer on Remove). Cancel. Skill stayed. |
| 70-skills-chip-on-tip | Pointer on the Cursor chip, still on. Tip clipped at the right edge: "Cursor has it — click to take it" (full: "click to take it away"). |
| 71-skills-off-cursor | Click. Chip draws unfilled. Green toast **Removed from Cursor**. Skill stays in the library. |

`magpie library` afterwards: **ask-matt → no agent**. Give skills as still **Links** (Library's way was not changed). No project added. Library folder, Backups, and Choose… were not opened. Window still 752×652 at +610+300. Magpie pid 560329 still running. Close was not used.

## demo 对齐（63–71 已落盘）
- Check for updates：Checking… → toast **Every skill is up to date**（单行无 Up to date chip）
- Give skills as → By agent 表：Cursor · Library's way / Links / Copies · Done（未改 how）
- In projects：Add a project 空卡 + Cancel；未点 Choose…
- 行 Remove 确认后 Cancel；芯片 off → toast **Removed from Cursor**；技能仍在库


## Skills chip on + how (shots 72–87)

Window was partly outside a 1280×800 box at +610+300 (right 1362, bottom 952). Moved fully on-screen to **752×652 at +200+40** (id 27262991, DISPLAY=:6). Not resized. Shots are ffmpeg x11grab of that rect, except **86** which is **860×652** from the same origin so the update tip is not cut off at the window's right edge. Close was not clicked. Choose… was not opened. Remove was not submitted. Still one skill (**ask-matt**), so Group again, Update all, and the head Turn all on/off are not on the page.

Cursor chip started off (shot 71). Give skills as started on **Links**.

| shot | what |
|---|---|
| 72-skills-chip-off-tip | Pointer on the off Cursor chip. Tip **Give it to Cursor**. Row hover also shows the update arrow and trash. |
| 73-skills-written-toast | Click. Chip draws on (icon full color). Green toast **Written to Cursor**. No Saving… on a chip (it paints on at once). |
| 74-skills-chip-on | Toast gone. Chip stays on. |
| 75-skills-how-copies-hover | **Give skills as** is a segment, not a menu: **Links** (on) / **Copies** / **By agent**. Pointer on Copies. Library's way is not on this bar. Note: links follow the library. |
| 76-skills-how-saving | Click Copies. The segment label becomes **Saving…** (spinner). |
| 77-skills-how-copies-toast | Copies is the selected pill. Note switches to each agent getting its own folder, remade when the library skill changes. Toast **The agents get copies of their skills now**. No confirm dialog. |
| 78-skills-how-links-toast | Click Links. Selected pill back on Links. Note back to links follow the library. Toast **The agents get links to their skills now**. Saving… on the way back did not last a frame. |
| 79-skills-how-sheet-tip | Give skills as › **By agent** opens **How each agent gets its skills**. Tip from the button, under the sheet: **Give an agent its skills its own way**. |
| 80-skills-how-sheet-libway | Same sheet, tip gone. Cursor · **Gets links** · **Library's way** on, Links and Copies beside it. Done. |
| 81-skills-cursor-links-toast | Click the Cursor row's **Links** (not Library's way). Links pill on. Sub still Gets links. Toast **Cursor gets links to its skills now**. |
| 82-skills-cursor-copies-toast | Click **Copies**. Sub **Gets copies**. Copies pill on. Body still says the others get links (library how is Links). Toast **Cursor gets copies of its skills now**. |
| 83-skills-cursor-libway-restored | Click **Library's way** again so Cursor is not left on its own how. Sub **Gets links**. Toast **Cursor gets links to its skills now**. |
| 84-skills-rowhead-byagent-tip | The other By agent, on the **In the library** head (not the how bar). Tip **Turn every skill on or off for one agent**. |
| 85-skills-byagent-sheet | Opens **Skills by agent**. Cursor · **1 of 1 skills** · **Turn all on** / **Turn all off**. Not clicked (one skill; Turn all off would take ask-matt out of Cursor). Done. |
| 86-skills-update-tip | Pointer on the row update arrow. Tip, four lines: **Update from GitHub** / **Up to date with GitHub** / **ask-matt: read a skill's SKILL.md before asserting or skipping its steps** / **10/7/2026 · 954ee7f**. Not clicked (would fetch GitHub). Frame is 860px wide; a 752px grab clips "skipping its steps". |
| 87-skills-remove-tip | Pointer on the row trash. It turns red. Tip **Remove** (shot 68 hovered it but the tip did not stay). Not clicked. |

No project added. Give skills as left on **Links**. Cursor chip left **on** (ask-matt given to Cursor). By agent is not "By agent (1)" — Cursor's own how was put back to Library's way before Done. Header Group again / Update all / Turn all were not invented. Library still On. Window 752×652 at +200+40. Magpie pid 560329 still running.

## demo 对齐（72–87）· v0.1.67 SKILLS_HOW_DONE
- 芯片 off 提示 **Give it to Cursor** → 点亮 toast **Written to Cursor**（无 Saving…）
- Give skills as 是分段不是菜单：Links / Copies；Copies 有 **Saving…** 与 toast **The agents get copies of their skills now**；回到 Links toast **The agents get links to their skills now**（回程 Saving… 未定格）
- How each agent：Cursor 段 Links ↔ Copies（不是只停在 Library's way）；toast **Cursor gets links/copies of its skills now**；录完拨回 Library's way 再 Done
- 行首 By agent 是另一张 **Skills by agent**（Turn all on/off，1 of 1，未点）
- 行内更新箭头 tip 四行（Up to date + check 行）；未点更新。Remove tip 定格，未提交

## Library folder and Backups (shots 88–100)

Running magpie **0.1.1247**, pid 560329. Window still **752×652 at +200+40** (id 27262991, DISPLAY=:6). Not resized. Close (X) on magpie was not clicked. Library was already On (top chrome includes Library). This pass started on Settings; Library in the top chrome was clicked, which landed on **Skills · 1** (ask-matt still the row). Nothing in the library was added, removed, or saved.

Head, second row, LTR: **Discover**, **Library folder**, **Backups**. Tabs above them, LTR: Instructions, MCP servers, Skills · 1, Hooks, RTK. Right-click on Backups opened no menu.

| shot | what |
|---|---|
| 88-library-head | Skills tab. Both head buttons visible. No tip. |
| 89-library-folder-tip | Pointer on **Library folder**. Dark tip, one line: `~/.config/magpie/library`. Inside the 752px frame. |
| 90-backups-tip | Pointer on **Backups**. Tip, two lines: `magpie keeps a copy of every file before it writes it.` / `~/.config/magpie/backups`. The tip runs past the window's right edge, so this grab is **900×652** from the same origin (a 752px grab cuts the path). |
| 91-library-folder-thunar | Click **Library folder**. Thunar, title **library - Thunar**, client 640×480. Not the parent config directory. |
| 92-library-folder-escape | Escape. Window stays **library - Thunar**. Frame is the same picture as 91. |
| 93-backups-thunar | Click **Backups**. Thunar, title **backups - Thunar**. |
| 94-backups-escape | Escape. Stays **backups - Thunar**. Same picture as 93. |
| 95-backups-file-menu | Alt+F. File menu. No **Cancel**. |
| 96-backups-nested | Opened the left-hand backup folder. |
| 97-backups-skill-folder | Opened **skills** inside it. |
| 98-backups-nested-escape | Escape there. Title stays **skills - Thunar**. Same picture as 97. Does not go up and does not close. |
| 99-backups-nested-second | The right-hand backup folder. |
| 100-backups-second-skill | **skills** inside that one. |

**Library folder** (91). Location field `/home/box/.config/magpie/library/`. Title-bar buttons, right: minimize, maximize, close. Menu bar LTR: File, Edit, View, Go, Bookmarks, Help. Toolbar LTR: left arrow, right arrow (both pale at this folder), up arrow, house, location field (folder glyph + path), magnifying glass at the right of the field. Sidebar TTB: **Places** / **box**, **Devices** / **File System**. Content: one folder, **skills**. Status: `1 folder | Free space: 104.5 GiB`. No Cancel button. Places and File System were not clicked. Up was not clicked (the parent of this folder is `~/.config/magpie`).

**Backups** (93). Same chrome. Location `/home/box/.config/magpie/backups/`. At this folder the left and right arrows are pale; the up arrow and the house are dark. Content, LTR, labels wrap under the icon:

- `2026-10-15_06-08-5` / `0.641`
- `2026-10-15_06-12-1` / `6.936`

Status: `2 folders | Free space: 104.5 GiB`.

Opening the left one (96) puts the full name in the title and the location field: **2026-10-15_06-08-50.641 - Thunar**, path `/home/box/.config/magpie/backups/2026-10-15_06-08-50.641/`. The left arrow is dark (right arrow still pale). One folder, **skills**. Status `1 folder | Free space: 104.5 GiB`.

**skills** (97): title **skills - Thunar**. The location field is scrolled, so the left of the path is cut (`…e/box/.config/magpie/backups/2026-10-15_06-08-50.641/skills/`). One folder, label wraps: `git-guardrails-claude-` / `code`. That folder was not opened.

96 is the Thunar opened by the Backups click. That process exited before the next level; 97–100 are the same backups folder opened again and walked the same way.

The right-hand backup (99): title **2026-10-15_06-12-16.936 - Thunar**, path `/home/box/.config/magpie/backups/2026-10-15_06-12-16.936/`, one folder **skills**. Inside it (100), title **skills - Thunar**, location tail `…/2026-10-15_06-12-16.936/skills/`, one folder **ask-matt**. Not opened.

**File** menu (95), top to bottom. **New Tab** is lit (Ctrl+T); the status line starts `Open a new tab for the displayed lo` and is cut off at the right of this grab. Then New Window (Ctrl+N), Create Folder… (Shift+Ctrl+N), Create Document (submenu arrow; not opened), Open Terminal Here, Properties… (Alt+Return), Detach Tab, Close All Windows (Shift+Ctrl+W), Close Tab (Ctrl+W), Close Window (Ctrl+Q). No Cancel. Escape closed the menu and left the window up.

Escape never closed Thunar and never moved up a folder. Alt+Left did move up one folder (titles changed skills → the dated folder → backups). Up, Places, and File System were not used. Thunar was then closed with the window close (no Cancel). Magpie was still Library → Skills · 1, Discover / Library folder / Backups, window 752×652 at +200+40. pid 560329 still running.

The path on the Backups tip is `~/.config/magpie/backups`, not `~/.config/magpie/library/backups`. P1 not exercised. Allowances not on this page.

## demo 对齐（88–100）· v0.1.83 LIBRARY_FOLDER_BACKUPS_DONE
- Head LTR：Discover（MCP/Skills）· Library folder · Backups；idle 无 tip
- Library folder tip 一行 `~/.config/magpie/library`；Backups tip 两行（说明 + `~/.config/magpie/backups`，非 library/backups）；752px 下 tip 可贴边裁切（title）
- 点击 → 演示 Thunar 叠层（640×480）：library 仅 `skills`；backups 两日期夹 → skills → `git-guardrails-claude-code` / `ask-matt`
- Escape **不**关窗、**不**上翻（仅关 File 菜单）；关窗用标题 × 或 File → Close Window；无 Cancel；Backups 右键无菜单
- 真 Magpie 外抛 Thunar 时 Escape N/A；本演示叠层对齐 NOTES Escape 行为
- 未做：Observability / Allowances / Codex memories / P1 / In projects → Choose…

## In projects → Choose… (shots 101–119)

Running magpie pid **560329**. Window still **752×652 at +200+40** (id 27262991, DISPLAY=:6). Not resized. Close (X) was not clicked. Library stayed on **Skills · 1** (ask-matt, given to Cursor). **Add was not submitted.** `magpie library` afterwards: Skills **ask-matt → cursor**; no project listed. No skill removed.

The system picker is not Thunar. It is a GTK dialog owned by magpie, title **Choose a project**. Client 1100×680 at +31+55; the title sits in the window-manager bar, so the dialog grabs are the frame **1110×714 at +26+26** (a client-only 1100×680 grab cuts the title off). 109 is wider and starts at x=0 so a tip that hangs off the left of the dialog is not cut. Shot 119 is the Enter that follows 114; the file was written after 118.

| shot | what |
|---|---|
| 101-in-projects | Skills · 1. **IN PROJECTS** and **Add a project**. Aside: give a project's agents some of these skills as the project's own; magpie links them into `.claude/skills` and `.agents/skills` and keeps them out of git. No project row. |
| 102-add-project-hover | Pointer on **Add a project**. The button draws a border. No tooltip. |
| 103-add-project-sheet | **Add a project** replaces the aside with one row: folder glyph, placeholder **The project's folder, like ~/code/app**, **Choose…**, **Add**, **Cancel**. Nothing typed. |
| 104-choose-hover | Pointer on **Choose…**. Pale pill behind the words. No tooltip. |
| 105-add-hover | Pointer on **Add**. Border (it is the action button). No tooltip. |
| 106-cancel-hover | Pointer on **Cancel**. Pale pill. No tooltip. |
| 107-choose-project-dialog | **Choose…** opens **Choose a project**. Title bar: magpie mark, title, minimize, maximize, close. Sidebar, top to bottom: **Recent** (selected), **Home**, **Desktop**, **workspace**, **Other Locations**. Recent list is empty. Columns: Name, Location, Size, Type, Accessed. Footer **Cancel** and **Open** (Open's label is dark, not a greyed disabled control). No breadcrumb on Recent. |
| 108-choose-home | **Home** selected. Breadcrumb: back, home glyph, **box**, forward. A create-folder button (folder with a plus) at the top right; not clicked. Columns: Name (sort mark), Size, Type, Modified. Folders: agent-data, chrome-profile, cli-config, reference, sand-data. None opened. |
| 109-choose-location-tip | **Ctrl+L** opens a location field under the title. On this open it was empty, blue focus ring, not prefilled with the current folder. Pointer on the sidebar **Desktop** row. Tip, one line, hanging off the dialog's left edge: **Open the contents of your desktop in a folder**. Grab is **1140×714 from +0+26**. Desktop was not opened (`~/Desktop` is not on disk). |
| 110-choose-other-locations | **Other Locations**. Heading **On This Computer**. One row, **Computer**, **112.2 GB**. No breadcrumb. |
| 111-choose-escape-sheet | Escape with the location field closed. Dialog closes. The magpie sheet stays. Field still the placeholder. Path not filled. |
| 112-add-empty-noop | **Add** with the field empty. Sheet stays. Placeholder stays. No error. No project. |
| 113-choose-cancel-sheet | Chooser opened again. **Cancel** on the dialog. Same as Escape: dialog gone, sheet still empty. |
| 114-choose-path-typed | Chooser again. Ctrl+L, typed **/usr**. Field shows `/usr`. Recent columns still behind it. Enter not yet pressed. |
| 119-choose-path-complete | Enter after 114. Field shows `/usr/` and a completion list: bin/, games/, i686-w64-mingw32/, include/, lib/, lib64/, libexec/, local/, sbin/, share/, src/, x86_64-w64-mingw32/, x86_64-w64-mingw32ucrt/. Dialog still open. Cancel and Open still in the footer. |
| 115-project-path-filled | **Open** while Home is the current place (no location field). Dialog closes. The sheet field is **/home/box**. Choose…, Add, and Cancel still there. **Add was not clicked.** |
| 116-sheet-cancel | **Cancel** on the magpie sheet. Card gone. **Add a project** and the aside are back. No project row. |
| 117-sheet-escape-unfocused | Sheet opened again. Escape while the path field is not focused. Sheet stays. |
| 118-sheet-escape-focused | Click in the path field, then Escape. Sheet closes. Same settled In projects aside as 116. |

**Escape and Cancel.** On the dialog, Escape first dismisses the location field (and a completion list, if one is open) and does not close the window. A second Escape, with no location field, closes the dialog and does not change the sheet. **Cancel** closes the dialog in one click and also leaves the sheet empty. Neither one writes a project. On the magpie sheet, **Cancel** always drops the card. **Escape** drops it only when the path field has focus (the field's own key handler). Escape elsewhere on the sheet does nothing. **Add** with an empty field does nothing. **Add** was not clicked once a path was in the field, so `/home/box` was never kept.

**Open** accepts the folder currently shown. From Home it returned `/home/box` and only filled the field. Clicks on Open while the location field still had `/usr` did not dismiss the dialog; the pointer in those checks sat on the button's left edge, so that is not a claim that a typed path cannot be accepted.

Not opened: Desktop, workspace, Computer under Other Locations, the create-folder button, the dialog's minimize / maximize / close. No project row was left on the page, so the per-project skill list, copy-vs-link switch, and remove-project confirm are still unshot. Instructions, MCP servers, Hooks, and RTK were not part of this pass.

## demo 对齐（101–119）· v0.1.84 IN_PROJECTS_CHOOSE_DONE
- In projects → Add a project 卡：placeholder `The project's folder, like ~/code/app` · Choose… / Add / Cancel；无 tip
- Choose… → GTK **Choose a project** 叠层（非 Thunar）：Recent 空 · Home（box 面包屑 + Home 夹列表）· Desktop tip · workspace · Other Locations（On This Computer / Computer 112.2 GB）
- Ctrl+L 空 location 栏；Enter `/usr` → `/usr/` + 补全列表；Escape 先关 location/补全，再关对话框；对话框 Cancel 同 Escape（表单仍空）
- Sheet：空 Add no-op；Cancel 关卡；Escape 仅 path 聚焦时关卡；Open@Home → 填 `/home/box`，不 Add
- 未做：项目行 skill 勾选 / copy-vs-link / remove-project（仍未点录）

## In projects → real row (shots 120–147)

Running magpie pid **560329**. Window still **752×652 at +200+40** (id 27262991, DISPLAY=:6). Not resized. Close (X) was not clicked. Library stayed on **Skills · 1**. **ask-matt** was not removed. Give skills as stayed **Links**. The project added here was removed before the end. `~/.config/magpie` has no `magpie-probe` string afterwards (backups not searched). The disposable folder `/workspace/magpie-probe-project` (a README.txt only) is still on disk; it is not a magpie project.

The folder was an empty directory made for this pass, not an existing repo. Magpie's own writes into it (a symlink and a `.gitignore` block) were removed by turning the skill off, before the project row was removed.

Dialog grabs are the frame **1110×714 at +26+26**, same as 107–119. Tips that leave the magpie window: **132** and **137** and **145** are **900×652** from +200+40 (right). **133** and **144** are **980×652 from +40+40** (left). **139** is **980×652** from +200+40 (right).

| shot | what |
|---|---|
| 120-add-project-sheet | **Add a project**. Same sheet as 103: placeholder, **Choose…**, **Add**, **Cancel**. |
| 121-choose-hover | Pointer on **Choose…**. |
| 122-choose-project-again | **Choose a project** again. Recent / Home / Desktop / workspace / Other Locations. |
| 123-choose-workspace | Sidebar **workspace** (skipped in 101–119). Breadcrumb **workspace**. List is `/workspace` (DrawMotion, agent-ui, …, magpie-probe-project, …). Create-folder button at the top right was not clicked. Desktop was not opened. |
| 124-choose-other-locations | **Other Locations**. **On This Computer**. One row, **Computer**, **112.2 GB**. |
| 125-choose-computer | Double-click **Computer**. The list is `/` (bin, boot, dev, etc, home, proc, …). The path button still reads **workspace**. `bin` is selected. Not opened further. |
| 126-choose-probe-selected | Back on **workspace**. **magpie-probe-project** selected (blue). Ctrl+L did not open a location field on this dialog (tried with the list focused and with the path button clicked; 114 is still the location-field shot). |
| 127-project-path-filled | **Open**. Dialog closes. Sheet field is **/workspace/magpie-probe-project**. |
| 128-add-filled-hover | Pointer on **Add** with the path filled. |
| 129-project-added-toast | **Add**. Row appears, already open. Green toast **magpie-probe-project added — pick the skills it gets**. |
| 130-project-row-open | Open card. Toggle off: **Copy files instead of linking**. Note: **Links follow the library's skill: an update reaches the project at once.** Skill **ask-matt**, Cursor chip off. Foot: **Placed in .agents/skills of the project and listed in its .gitignore. A folder there that isn't magpie's is left as it is.** No "reads no project skills folder" line. |
| 131-project-head-tip | Pointer on the name. Tip is the name **magpie-probe-project** (the name/path title, not the head's hide/pick tip). Trash and chevron show on the row. |
| 132-project-remove-tip | Pointer on the trash. Icon turns red. Tip **Remove the project**, past the window's right edge. |
| 133-project-hide-skills-tip | Pointer on the folder glyph, row open. Tip **Hide its skills**, past the window's left edge. |
| 134-project-copy-off | Pointer on the switch. No extra tip. Switch off. |
| 135-project-copies-toast | Click the switch. It draws on. Name gains a **Copies** tag. Note: **Copies are made again whenever the library's skill changes; edits made to them are replaced.** Toast **magpie-probe-project gets copies now**. |
| 136-project-links-toast | Click again. Switch off. Copies tag gone. Links note restored. Toast **magpie-probe-project gets links now**. Left on links. |
| 137-project-skill-off-tip | Cursor chip off. Tip **Give it to Cursor**, past the right edge. Only one chip (Cursor). |
| 138-project-skill-on-toast | Click the chip. It fills in. Toast **ask-matt is in magpie-probe-project for Cursor**. The "has it" tip is cut off in this 752px frame. |
| 139-project-skill-on-tip | Same chip, on. Tip **Cursor has it — click to take it away**. |
| 140-project-remove-dialog | Trash, while the skill is on. **Remove magpie-probe-project?** Body: skills and MCP servers magpie put in are taken away, with their `.gitignore` lines; nothing else is touched. Checkbox **Keep its skills and MCP servers** / **Remove the project from magpie only, leaving what magpie wrote into it**. Unchecked. **Cancel** and red **Remove**. |
| 141-project-remove-keep | Checkbox on. Body switches to: magpie forgets the project; what it wrote stays, with the `.gitignore` lines, and is yours; a linked skill still follows the library's. |
| 142-project-remove-discard | **Cancel** with that box checked does not close. **Discard** / **Discard unsaved changes? Your changes will be lost.** Cancel and red **Discard**. The keep checkbox dirties the sheet, so leaving it asks. Escape was sent once and did not close this sheet (the key may not have reached the page). |
| 143-project-row-folded | **Discard** closes the sheet and does not remove the project. Click the name to fold. Pill **ask-matt** (the skill that is on). Trash and a right-pointing chevron. Name tip again **magpie-probe-project**. |
| 144-project-pick-skills-tip | Folder glyph, folded. Tip **Pick the skills it gets**, off the left edge. |
| 145-project-skill-off-toast | Row opened again. Chip clicked off. Toast **ask-matt is out of magpie-probe-project**. Chip pale. Magpie deleted `.agents/skills/ask-matt` (it had been a symlink to `~/.config/magpie/library/skills/ask-matt`) and the `.gitignore` block. Folder is README.txt only. |
| 146-project-remove-plain | Trash again, nothing placed. Same title and the "taken away" body. **No keep checkbox.** Cancel / Remove. |
| 147-project-removed-toast | **Remove**. Row gone. Aside and **Add a project** are back. Toast **magpie-probe-project removed**. |

Right-click on the open card's footer opened no menu. No second agent chip. Instructions, MCP servers, Hooks, and RTK were not opened. Chooser minimize / maximize / close and the create-folder button were not clicked. Desktop was not opened (`~/Desktop` still not the target). Copy was put back to links before remove. Final page: Skills · 1, ask-matt still in the library, In projects empty.

## demo 对齐（120–147）· v0.1.85 IN_PROJECTS_ROW_DONE
- Choose… 补了上次跳过的 **workspace**（`/workspace` 列表）和 **Computer**（Other Locations → 双击进 `/`；路径钮仍显示 workspace）。未点新建文件夹，未开 Desktop。本轮 Ctrl+L 未弹出路径框（114 仍是路径框）。
- Open `/workspace/magpie-probe-project` → Add。Toast **{name} added — pick the skills it gets**。行默认展开。
- 复制/链接是开关不是菜单：**Copy files instead of linking**。开 → 名称 **Copies** 标 + 说明「副本会在库技能变化时重做」+ toast **{name} gets copies now**。关 → 链接说明 + toast **{name} gets links now**。录完停在关（链接）。
- 技能行只有 **Cursor** 一颗芯片。关 tip **Give it to Cursor**；开 toast **ask-matt is in {name} for Cursor**，tip **Cursor has it — click to take it away**；关 toast **ask-matt is out of {name}**。开时写入 `.agents/skills/ask-matt` 符号链接（指向库里的 ask-matt）和 `.gitignore` 的 magpie 块；关掉后这两样被 magpie 删掉。
- 行头文件夹图：展开 **Hide its skills**，折起 **Pick the skills it gets**（tip 向左出窗）。名字悬停 tip 是项目名本身。折起且技能开着时药丸 **ask-matt**。垃圾桶悬停变红，tip **Remove the project**（向右出窗）。右键无菜单。
- 移除：有已放入的技能时才有 **Keep its skills and MCP servers**。勾上后正文改为「只忘记项目、留下写入」。勾过再 Cancel 会先问 **Discard unsaved changes?**；Discard 不删除项目。技能已关掉、没有 placed 时对话框没有保留勾选，只有「带走技能和 gitignore 行」。Remove toast **{name} removed**。ask-matt 仍在库里。
- demo 消费（v0.1.85）：行默认展开；Copy files 开关 + Copies 标 + toast；Cursor 芯片 tip/toast；Hide/Pick/Remove tips；有 placed 才 Keep 勾选；勾脏 Cancel → Discard（Discard 不删项目）；无 placed 无勾选；Remove toast；默认空列表可交互增删

## Instructions nested (shots 148–183)

Running magpie pid **560329**. Window still **752×652 at +200+40** (id 27262991, DISPLAY=:6). Not resized. Close (X) was not clicked. Library stayed on **Instructions**. **ask-matt** was not touched. RTK Install was not clicked. No Vercel or package action.

01–05 already had the closed Default row, the open editor, the agents empty card, **+ New set**, and **Keep in a file…** filling `AGENTS.md` / `~/.agents/AGENTS.md`. This pass is the rest: tips, the unsaved bar, Discard, Ctrl+S, Escape, and a set that was added and then removed. Cursor still has no user-wide instructions file, so there is still no agent row to assign.

Tips that leave the window: **148** is **880×652 from +90+40** (left). **149** is **1200×652 from +80+40** (right). **174** is **1100×720 from +40+20** (below-left). **175** is **1000×652 from +40+40** (left). The rest are the window rect.

| shot | what |
|---|---|
| 148-default-radio-tip | Pointer on Default's filled radio, set open. Tip **The agents switched on below read this set**, past the left edge. |
| 149-in-use-tip | Pointer on the **In use** tag (lower half of the pill; the upper half did not raise it). Same sentence, past the right edge. |
| 150-name-typed | Name field focused, **DefaultX**. Purple ring. Not blurred, so nothing was renamed. |
| 151-name-escape | Escape in the name field puts **Default** back and blurs. No rename. |
| 152-text-dirty | Textarea **Prefer short functions.** Sticky bar: dot **Not saved yet**, **Discard**, purple **Save**. The row still says **Empty** — typing only shows the bar. |
| 153-textarea-escape | Escape in the textarea does not clear it. Bar stays. |
| 154-discard-hover | Pointer on **Discard**. Pale pill. No tip. |
| 155-save-hover | Pointer on **Save**. No tip. |
| 156-dirty-closed | Row closed while dirty. Subtitle is the first line. Amber **Not saved yet** beside **In use**. Pointer on the name raises a tip **Default** and covers part of the subtitle. Agents card is in frame: **None of your agents reads a user-wide instructions file magpie knows.** Aside: **Cursor keeps no user-wide instructions file.** |
| 157-dirty-row | Same row, pointer off the name. Subtitle reads **Prefer short functions.** in full. Bar still up. |
| 158-discard-dialog | **Discard** on the bar. Dialog **Discard** / **Discard unsaved changes? Your changes will be lost.** **Cancel** (focused) and red **Discard**. Backdrop blurs the page. |
| 159-discard-cancel | **Cancel**. Text stays. Focus returns to the bar's **Discard** (blue ring). |
| 160-discard-escape | Dialog opened again. Escape keeps the text, same as Cancel. |
| 161-discarded | Red **Discard**. Subtitle **Empty**. Bar and the amber tag are gone. Nothing written. |
| 162-saved-toast | Typed again, **Ctrl+S**. Green toast **Saved — the agents already had it** (no agent file to write). Bar gone. Subtitle is the saved line. `library/instructions.md` appeared. |
| 163-cleared-toast | Select all, delete, **Ctrl+S**. Same toast. Placeholder back, subtitle **Empty**. `instructions.md` is gone. |
| 164-keep-file-hover | **+ New set** draft (same fields as 04). Pointer on **Keep in a file…**. Border. No tip. |
| 165-add-hover | Pointer on purple **Add**. No tip. |
| 166-cancel-hover | Pointer on **Cancel**. Pale pill. No tip. |
| 167-add-empty-noop | **Add** with the name empty. Draft stays. Placeholder **Name, e.g. Work**. |
| 168-new-set-escape | Name field focused, Escape. Draft gone. **+ New set** is back. |
| 169-file-path-edited | **Keep in a file…** fills the name **AGENTS.md** and a path field (not a file chooser; 05 is the default `~/.agents/AGENTS.md`). Path replaced with **/tmp/magpie-probe-AGENTS.md**. Add was not clicked. |
| 170-file-escape | Escape in the path field drops the whole draft. Neither that path nor `~/.agents/AGENTS.md` was created. |
| 171-new-set-cancel | A new draft. **Cancel** drops it, same as Escape. |
| 172-probe-name | Name **probe-set**. |
| 173-probe-added-toast | **Add**. Because Default is empty, the new set is the one in use and it opens. Toast **probe-set added — the agents read it**. Default's radio is off. **Remove** sits under the editor. |
| 174-remove-disabled-tip | Pointer on **Remove** while probe-set is in use. The button goes pink and does nothing. Tip **Switch the agents to another set before removing this one**, past the bottom-left. |
| 175-default-switch-tip | Default's empty radio. Tip **Switch the agents to this set**, past the left edge. |
| 176-default-switch-button | Default opened. Button **Switch the agents to this set**. Default has no Remove. probe-set is folded, still **In use**. |
| 177-switch-hover | Pointer on that button. Border. No extra tip. |
| 178-switched-toast | Click. Default is **In use** and stays open. probe-set folds, radio off. Toast **The agents read Default now**. |
| 179-probe-not-in-use | probe-set opened. **Switch the agents to this set** and **Remove** (now allowed). |
| 180-remove-ask | Click landed under **Remove**, not on it. Label stayed **Remove**. |
| 181-remove-sure | Click on **Remove**. It becomes red **Remove probe-set and its text**, with **Cancel** beside it. The switch button stays. |
| 182-remove-cancel | **Cancel**. Back to **Remove**. The set stays. |
| 183-probe-removed-toast | **Remove**, then the red label. Set gone. Only Default, **Empty**, **In use**. Toast **probe-set removed**. Agents empty card is back. |

**Save and Discard.** Typing does not retitle the row. Closing it does: the subtitle becomes the first line, and an amber **Not saved yet** sits by **In use**. The bar is sticky at the bottom of the page. **Discard** asks; **Cancel** and Escape keep the text; the red **Discard** throws it away and writes nothing. Escape in the textarea does not discard. Escape in the name field reverts an uncommitted edit. **Ctrl+S** saves. With no agent instructions file the toast is **Saved — the agents already had it**, and the text is `~/.config/magpie/library/instructions.md`. Clearing the textarea and saving again deletes that file.

**Sets.** **Add** with an empty name does nothing. Escape (name or path focused) and **Cancel** both drop a draft. **Keep in a file…** is an inline path, not a picker. A set added while the set in use is empty becomes the one agents read, and it opens. **Remove** on that set is disabled until another set is in use. The switch is the empty radio (tip **Switch the agents to this set**) or the button of the same words on the open set. Toast **The agents read {name} now**. **Remove** is two clicks, not a dialog: the second label is **Remove {name} and its text** (red) plus **Cancel**. **Cancel** leaves the set. The red label removes it. Toast **{name} removed**. Default has no Remove.

`library.json` instructions afterwards is `{"agents": []}` — no sets. No `instructions.md`. `magpie library` still says Instructions none yet. Skills still **ask-matt → cursor**. No `~/.agents/AGENTS.md`.

Not shown, because Cursor has no instructions file: an agent row, its switch, the per-agent extra textarea, "lines of its own", or **Move its own into the shared text**. Also not done: a set actually kept in a file (the **Your file** tag), a rename that is committed (Enter or blur), Enter creating a set, and a backdrop click on the Discard dialog. MCP, Hooks, and RTK were not opened.

## demo 对齐（148–183）· v0.1.86 INSTRUCTIONS_NEST_DONE
- 在用 radio tip **The agents switched on below read this set**（向左出窗）；**In use** 药丸同一句（向下半才出，向右出窗）。未在用 radio tip **Switch the agents to this set**。
- 名字框 Escape 撤回未提交的改名（DefaultX → Default），不保存。正文 Escape **不**丢弃。
- 输入只出底栏 **Not saved yet / Discard / Save**；折起行才把副标题换成首行，并出琥珀色 **Not saved yet**。Discard 对话框：**Discard unsaved changes? Your changes will be lost.** Cancel 与 Escape 都留下文字；红色 Discard 丢掉且不写盘。Ctrl+S toast **Saved — the agents already had it**（没有 agent 指令文件）；写 `library/instructions.md`，清空再 Ctrl+S 则删掉该文件。
- 新套：空 Add 无操作；名字或路径聚焦时 Escape、以及 Cancel，都丢掉草稿。**Keep in a file…** 不是文件选择器，填名字 `AGENTS.md` 和路径；改成 `/tmp/…` 后 Escape，不创建文件。
- 在用套为空时 Add：**{name} added — the agents read it**，新套在用并展开。在用时 Remove 禁用，变粉，tip **Switch the agents to another set before removing this one**。打开另一套有按钮 **Switch the agents to this set**；点后 toast **The agents read Default now**。Default 没有 Remove。
- 非在用套的 Remove 是两次点击，不是对话框：第二次红字 **Remove {name} and its text** + **Cancel**。Cancel 不删。红字删除，toast **{name} removed**。180 点在按钮下方，未进入确认。
- 仍无 agent 行（Cursor 没有 magpie 认识的用户级指令文件）。未做：真正保存在文件里的套（Your file）、提交改名、Enter 创建、Discard 点遮罩。ask-matt 仍在。MCP / Hooks / RTK 未打开。
- demo 消费（v0.1.86）：sticky **Not saved yet / Discard / Save**；名字 Escape 撤回；正文 Escape 不丢；折起才改副标题+琥珀标；Discard Cancel/Escape 留字；Ctrl+S toast **Saved — the agents already had it**；空 Add no-op；Keep in a file 内联路径；空在用时 Add 接管；Remove 两步红字；未做 agent 行 / Your file / Enter 创建 / Discard 遮罩

## MCP servers deeper (shots 184–219)

Running magpie pid **560329**. Window still **752×652 at +200+40** (id 27262991, DISPLAY=:6). Not resized. Close (X) was not clicked. **ask-matt** was not touched. RTK Install was not clicked. No Vercel or package action.

06–26 already had the empty list, Discover, new Command/HTTP/SSE, the OAuth-app fields, search, and Discard. This pass is an installed row, health, the tool list, chips, In projects for servers, and a sign-in that is stopped on the vendor wall. Two probe servers were added and then removed. `magpie library` afterwards: MCP servers **none yet**, Skills **ask-matt → cursor**.

The local server was a stdio stub (`/usr/bin/python3` plus a script that answered `initialize` and `tools/list` with `echo_note` and `noop`). Magpie reads one JSON object per line, not `Content-Length`. The first check used the wrong framing and timed out; the script was switched to a line and checked again. The script is not on disk now. The remote probe was `https://mcp.linear.app/mcp`. Linear's **Approve** was not clicked. `~/.cursor/mcp.json` did not exist before this pass; magpie created it, then left `{"mcpServers":{}}` after the last removal, and that empty file was deleted.

Tips that leave the window: **196** is **900×700 from +120+20**. **197** is **980×652 from +200+40**. **202** and **205** are **1000×652 from +180+40**. **213** is **980×700 from +80+20**. **209** is the Linear card only, **640×780 from +680+220** (Chrome was fullscreen; the address bar is not in the shot). **210** is the callback sentence only, **560×80**, with the URL cropped off.

| shot | what |
|---|---|
| 184-mcp-empty-paste | MCP tab, still empty. Copy is newer than 06: **Paste a server's JSON from its README, or fill it in.** and **＋ Add a server** inside the dashed card. |
| 185-mcp-new-paste-hint | **New MCP server**. Head note **or paste its JSON anywhere here** (not in 15). Name placeholder **e.g. github**. Cursor chip starts on. |
| 186-mcp-chip-off-tip | Chip clicked off before Add. Tip **Give it to Cursor**. |
| 187-mcp-checking-toast | Add still wrote it to Cursor (chip was on again by Add). Tab **MCP servers · 1**. Row **probe-mcp** **checking…**. Toast **Written to Cursor**. **IN PROJECTS** aside names **.cursor/mcp.json**. |
| 188-mcp-health-timeout | Health **no answer to initialize** (red). The stub had answered with `Content-Length`, which this check does not read. |
| 189-mcp-health-timeout-tip | Tip **No answer to initialize in 30 seconds** / **Click to check again**. |
| 191-mcp-two-tools | After the stub answered one JSON line per message: green **2 tools** and a chevron. |
| 190-mcp-tool-list | Click opens the list. **echo_note** / **noop**, each with its description and a switch on. Note **Cursor can't turn off single tools: they get every tool of the server.** Foot **Check again**. |
| 192-mcp-tool-off-toast | echo_note switch off (row grey). Toast **Tools of probe-mcp saved**. |
| 193-mcp-tool-on-toast | Switch back on. Same toast. `disabledTools` empty afterwards. |
| 194-mcp-tools-hide-tip | Tip **It started and listed its tools** / **Click to hide them**. |
| 195-mcp-by-agent | **By agent**. Sheet **MCP servers by agent**. **Every server on or off for one agent…** Cursor **1 of 1 servers**. **Turn all on** is pale (nothing left to give). **Turn all off** and **Done**. |
| 196-mcp-by-agent-off-tip | Tip **Take every server from Cursor**, past the window's right edge. Not clicked. |
| 197-mcp-chip-on-tip | Row chip on. Tip **Cursor has it — click to take it away**, past the right edge. |
| 198-mcp-chip-off-toast | Click. Chip pale. Tip **Give it to Cursor**. Toast **Removed from Cursor**. The "can't turn off single tools" line goes away with the chip. `~/.cursor/mcp.json` became `{"mcpServers":{}}`. |
| 199-mcp-in-projects-sheet | **Add a project** on the MCP tab. Same path row as Skills: placeholder, **Choose…**, **Add**, **Cancel**. Choose… was not opened. |
| 200-mcp-project-added-toast | Path typed **/workspace/magpie-probe-project**, **Add**. Toast **magpie-probe-project added — pick the servers it gets**. |
| 201-mcp-project-row | Open card. Server **probe-mcp**, chip off. Foot: **Written into .cursor/mcp.json of the project…** and **Claude Code asks before it starts a project's servers; Codex reads .codex/config.toml, and Pi .pi/mcp.json, only in a project you trust.** |
| 202-mcp-project-chip-off-tip | Tip **Give it to Cursor**, past the right edge. |
| 203-mcp-project-placed-toast | Click. Toast **probe-mcp is in magpie-probe-project for Cursor**. Wrote `.cursor/mcp.json` and a `.gitignore` block. |
| 205-mcp-project-chip-on-tip | Tip **Cursor has it — click to take it away**. |
| 204-mcp-project-out-toast | Click off. Toast **probe-mcp is out of magpie-probe-project**. Magpie deleted `.cursor/mcp.json` and the `.gitignore`. Folder is README.txt only. |
| 206-mcp-project-remove | Trash. **Remove magpie-probe-project?** Same "taken away" body. **No keep checkbox** (nothing placed). |
| 207-mcp-project-removed-toast | **Remove**. Toast **magpie-probe-project removed**. |
| 208-mcp-signin-waiting | New HTTP server **probe-oauth**, URL `https://mcp.linear.app/mcp`, **Save and sign in**. Line becomes **Finish signing in in your browser…** and **Cancel**. Toast **Written to Cursor** (chip was still on). Button under the dialog is **Save**, not Add. |
| 209-mcp-oauth-linear-wall | Chrome, Linear. **Magpie is requesting access.** Name Magpie, website usemagpie.ai, redirect `http://127.0.0.1:41671/callback`, access Read, Write. **Cancel** and **Approve**. Approve was not clicked. |
| 210-mcp-signin-refused | Linear **Cancel**. Callback page: **The sign-in was refused: access_denied**. Address bar cropped (it carries the state). |
| 211-mcp-signin-refused-dialog | Dialog still open. **Sign in** again, red **the sign-in was refused (access_denied)**. |
| 212-mcp-two-servers | Both rows. Head, because there are two: **A→Z**, **Z→A**, **Select**, **Turn all on**, **Turn all off**, **By agent**, and red **Remove all**. probe-oauth health **needs sign-in**. |
| 213-mcp-needs-signin-tip | Hover on **needs sign-in** shows that phrase only, not the longer "open it to sign in once" sentence. |
| 214-mcp-turn-all-off-ask | **Turn off all 2 servers?** **Every server is taken out of Cursor. They stay in the library, to turn on again.** Cancel and red **Turn all off**. Escape closed it; nothing was turned off. |
| 215-mcp-edit-oauth | Row opens the saved server, not "New MCP server". Linear mark, **Sign in**, the refused line, **Remove from the library**, **Copy config…**. |
| 216-mcp-remove-one-ask | **Remove probe-oauth?** **It will be removed from the library and the agents it was given to.** Cancel and red **Remove**. |
| 217-mcp-oauth-removed-toast | **Remove**. Toast **probe-oauth is out of the library and the agents it was given to**. |
| 218-mcp-edit-stdio | probe-mcp's editor. Command line, chip off, **Remove from the library**, **Copy config…**. A tip **Edit probe-mcp** sat on the command label. |
| 219-mcp-empty-again-toast | Same remove confirm, then **Remove**. Empty card is back. Toast **probe-mcp is out of the library and the agents it was given to**. |

**Health.** A server given to an agent is checked on its own (**checking…**, tip while it runs was not caught; 187 is the word). Failure: **no answer to initialize**, tip **No answer to initialize in 30 seconds** / **Click to check again**. Success: **2 tools**, tip **It started and listed its tools** / **Click to see them** or **Click to hide them**. A remote 401: **needs sign-in**. **Check again** under the list re-ran the check; it finished before a second **checking…** frame. The idle **not checked** / **Click to check it** state was not seen: the first server was on for Cursor, so magpie checked it without a click.

**Tools.** Switches have no hover tip (aria-label only). Off greys the row and toasts **Tools of {name} saved**. Cursor, while it has the server, is told it gets every tool anyway.

**Chips and By agent.** On tip **{agent} has it — click to take it away**. Off tip **Give it to {agent}**. Toasts **Written to Cursor** and **Removed from Cursor**. **By agent** lists **{n} of {m} servers**, **Turn all on** / **Turn all off** (off tip **Take every server from Cursor**). **Turn all off** asks; Escape leaves the servers on for the agent.

**In projects.** The aside is the server one, naming **.cursor/mcp.json**, once any server exists. Add by a typed path (Choose… already shot on Skills). Open row lists each library server and a chip. On writes `.cursor/mcp.json` and a `.gitignore` block; off deletes both. Toasts **{server} is in {name} for {agents}** and **{server} is out of {name}**. Remove with nothing placed has no keep checkbox. Toast **{name} removed**.

**Sign-in.** Deeper than 17: **Finish signing in in your browser…** / **Cancel**, then the vendor wall (Cancel / Approve), then **the sign-in was refused (access_denied)** on the dialog. No account was used. The saved server was removed. Not seen: **Signed in** tag, **Sign out**, **Opening the sign-in…**, or the "couldn't open your browser" link.

`library.json` mcp afterwards is `[]`. Applied cursor is skills **ask-matt** only. No project. Probe folder is README.txt only. No `~/.cursor/mcp.json`. Window still 752×652 at +200+40.

Not opened: **Select**, a sort that changes order, **Remove all**, **Copy config…** (no tip in the hover that was tried), paste-JSON fill, a `${NAME}` that is unset, an SSE row, and the idle **not checked** chip. Hooks and Agents were not opened. Hooks already have 32–46. Agents is still outside this library nest.

## demo 对齐（184–219）· v0.1.87 MCP_NEST_DONE
- 空列表文案比 06 多一句 **Paste a server's JSON…** 和卡内 **＋ Add a server**。新服务器头注 **or paste its JSON anywhere here**。芯片默认开。
- 已装行：健康 **checking…** / **no answer to initialize**（tip 30 秒 + Click to check again）/ **2 tools**（tip It started and listed its tools，Click to see/hide them）/ **needs sign-in**。点 **2 tools** 出工具列表、开关、**Check again**。Cursor 在用时注 **can't turn off single tools**。关开关 toast **Tools of {name} saved**。
- 行芯片：开 tip **Cursor has it — click to take it away**，关 **Give it to Cursor**。toast **Written to Cursor** / **Removed from Cursor**。
- **By agent**：MCP servers by agent，**1 of 1 servers**，Turn all on 灰、Turn all off tip **Take every server from Cursor**。Turn all off 会问 **Turn off all {n} servers?**；Escape 不关服务器。
- In projects（MCP）：aside 写 **.cursor/mcp.json**。行展开列出库里的服务器和芯片。开 toast **{server} is in {name} for Cursor**，写入项目 `.cursor/mcp.json` 和 `.gitignore`；关 toast **is out of**，两样都删。未放入时移除无 Keep 勾选。
- 登录比 17 深：HTTP **Save and sign in** → **Finish signing in in your browser…** + Cancel。Linear 墙 **Magpie is requesting access**（Cancel / Approve）。点了 Linear 的 Cancel，没有点 Approve。对话框红字 **the sign-in was refused (access_denied)**。随后从库里移除。
- 两个探针服务器都已移除。ask-matt 仍在。`~/.cursor/mcp.json` 本轮之前不存在，空文件已删。未做：Select、排序、Remove all、Copy config 菜单、粘贴 JSON、未检查的 not checked、签到成功。Hooks / Agents 本轮未打开。
- demo 消费（v0.1.87）：健康 checking/timeout/2 tools/needs-signin；工具开关 toast；By agent + Turn all off Escape 取消；MCP In projects 芯片 place/out；OAuth Finish signing… + Linear 墙 Cancel → access_denied；默认空列表可交互。未做 Select/排序/Remove all/Copy config/not checked/签到成功

## MCP chrome left thin (shots 220–237)

The window from 184–219 was gone at the start of this pass (pid 560329, id 27262991). Relaunched `/home/box/.local/bin/magpie`, now pid **1871993**. It came up **752×652 at +610+300**; moved, not resized, to **752×652 at +200+40** (DISPLAY=:6). Close (X) was not clicked. A **What's new in v0.1.1247** sheet was in front; **Close** only. **Don't show again today** was not checked.

**ask-matt** was not touched. RTK Install was not clicked. No Vercel or package action. Hooks and Agents were not opened. No OAuth was started, and **Approve** was not clicked.

Two probe servers were added with no agent (`aaa-paste` and `zzz-unset`, command `/bin/true`), then removed. `zzz-unset` had environment `TOKEN` = `${MAGPIE_PROBE_UNSET}`, which is not set in magpie's environment. A third name, `probe-json`, was only pasted into **New MCP server** and discarded. `magpie library` afterwards: MCP servers **none yet**, Skills **ask-matt → cursor**. `library.json` `mcp` is `[]`. `~/.cursor/mcp.json` is not there.

Tips that leave the window: **221**, **222**, and **224** are **1000×720 from +120+20**. **227** is **1100×720 from +80+20**. **231** and **233** are **1100×740 from +80+10**. The rest are the window rect.

| shot | what |
|---|---|
| 220-mcp-two-idle-not-checked | Two rows, neither given to an agent. Both **not checked**. Head, because there are two: **A→Z** (on), **Z→A**, **Select**, **Turn all on**, **Turn all off**, **By agent**, and red **Remove all**. |
| 221-mcp-not-checked-tip | Pointer on aaa-paste's **not checked**. Tip **No agent has it, so it isn't checked on its own** / **Click to check it**. |
| 222-mcp-az-tip | Pointer on **A→Z**. No tip in this frame. |
| 223-mcp-za-order | **Z→A**. **zzz-unset** is above **aaa-paste**. |
| 224-mcp-za-tip | Pointer on **Z→A**. No tip in this frame. **A→Z** was clicked again after this, before Select. |
| 225-mcp-select-mode | **Select**. The button reads **Done**. Rows gain a checkbox. Tip **Pick some servers and turn them on or off together**. Bar: **All 2**, **Pick servers to turn them on or off together**, **Done**. |
| 226-mcp-select-all | **All 2** checked. Both rows checked. Bar: **2 selected**, the Cursor chip, **Copy config…**, red **Remove…**, **Clear**, **Done**. |
| 227-mcp-copy-config-tip | Tip **Copy these servers as an agent's project file has them, to paste into a project yourself**. |
| 228-mcp-copy-config-menu | Menu head **Copy as an agent's project file**. One row, **Cursor**. |
| 229-mcp-copied-toast | **Cursor**. Green toast **Copied for Cursor, to paste into .cursor/mcp.json in your project**. The **Copy config…** control draws a check. Nothing was written into a project. |
| 230-mcp-unset-check | Select closed (**Done**). Click zzz-unset's **not checked**. It becomes red **MAGPIE_PROBE_UNSET not set**. aaa-paste stays **not checked**. |
| 231-mcp-unset-tip | Tip **magpie can't check it: MAGPIE_PROBE_UNSET isn't set where magpie runs. An agent started where it is set still gets it** / **Click to check again**. |
| 232-mcp-unset-editor | The row opens the saved server. Environment row **TOKEN** / **${MAGPIE_PROBE_UNSET}**. Hint **A value can name a variable, as ${NAME}: each agent is given it in its own way, so the token stays out of its settings**. **Remove from the library**, **Copy config…**, **Cancel**, **Save**. Save was not clicked. |
| 233-mcp-editor-copy-tip | Tip **Copy zzz-unset as an agent's project file has it, to paste into a project yourself**. |
| 234-mcp-paste-json | **+ Add server**, then a paste of `{"mcpServers":{"probe-json":{"command":"/bin/true","args":["--from-paste"]}}}`. Name **probe-json**, command **/bin/true --from-paste**. Toast **Filled in from what you pasted**. **Add** was not clicked. |
| 235-mcp-paste-discard | Escape. **Discard** / **Discard unsaved changes? Your changes will be lost.** **Cancel** and red **Discard**. |
| 236-mcp-remove-all-ask | Red **Discard** drops the draft. **Remove all**. **Remove all 2 servers?** Body: **They are taken out of the library; no agent has any of them.** Then **Servers your agents have that aren't in the library stay as they are.** **Cancel** and red **Remove all 2**. The pointer was still on **Remove all**, so its tip **Take all 2 servers out of the library** sits on the sheet. |
| 237-mcp-empty-after-remove-all | **Remove all 2**. Empty card is back (**No servers in the library yet** / **+ Add a server**). The **2 servers removed** toast was not in this frame. |

**not checked.** A server no agent has stays idle: **not checked**, tip **No agent has it, so it isn't checked on its own** / **Click to check it**. Clicking it runs the check. With `${MAGPIE_PROBE_UNSET}` in the environment and that name unset where magpie runs, the badge is **MAGPIE_PROBE_UNSET not set** and the tip is **magpie can't check it: MAGPIE_PROBE_UNSET isn't set where magpie runs. An agent started where it is set still gets it** / **Click to check again**. The editor's hint for any value is **A value can name a variable, as ${NAME}…**.

**Sort and Select.** **Z→A** puts zzz-unset above aaa-paste; **A→Z** is the other way. Hovering the segments did not raise **Names from A to Z** / **Names from Z to A** in 222 or 224. **Select** is **Done** while it is on, and asks before anything is picked. With both picked the bar can copy, remove, or clear them. **Done** leaves the servers in the library.

**Copy config…** On the pick bar (several) and on the open server (one). The menu is **Copy as an agent's project file**, here only **Cursor**. Toast **Copied for Cursor, to paste into .cursor/mcp.json in your project**. No project file was written.

**Paste.** JSON pasted in **New MCP server** fills the form and toasts **Filled in from what you pasted**. Escape asks **Discard unsaved changes?** Discard does not add the server.

**Remove all.** **Remove all 2 servers?** with **Remove all 2**. Afterwards the empty card is back.

**Signed in / Sign out.** Not on this page. Those show on an HTTP server only after a sign-in has completed. This pass did not open a sign-in, and did not reach a vendor **Approve**.

Window still **752×652 at +200+40**. Pid **1871993**.

## demo 对齐（220–237）· v0.1.88 MCP_CHROME_DONE
- 空闲健康：**not checked**。tip **No agent has it, so it isn't checked on its own** / **Click to check it**。点一下才检查。
- **unset `${NAME}`**：徽章 **{name} not set**；tip magpie can't check where name isn't set；编辑器 `TOKEN` / `${MAGPIE_PROBE_UNSET}` + `${NAME}` 提示。
- 排序：**Z→A** / **A→Z**（段悬停 tip 222/224 无，不发明）。
- **Select**：Done、勾选、**N selected**、Copy config…、Remove…、Clear。
- **Copy config…**：菜单 **Copy as an agent's project file** → Cursor；toast 粘贴进 `.cursor/mcp.json`（不写文件）。
- paste-JSON：填 name/command；toast **Filled in from what you pasted**；Escape → Discard（不添加）。
- **Remove all**：**Remove all N servers?** / 红 **Remove all N**；空卡。成功 toast 可按 NOTES 有；237 帧可缺。
- **Signed in / Sign out** 仍缺（需完成 OAuth）— 不发明。
- demo 消费（v0.1.88）：LibraryView MCP 选择/排序/复制/粘贴-JSON/全部移除/unset；无 portable、无 Vercel。
