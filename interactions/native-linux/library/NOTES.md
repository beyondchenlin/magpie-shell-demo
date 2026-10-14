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

