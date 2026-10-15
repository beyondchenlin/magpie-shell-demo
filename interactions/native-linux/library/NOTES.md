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
