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

Not opened: the tool matcher that appears only for After/Before a tool runs (Any tool / Shell commands / File edits). Selecting it would have stayed a draft, but Add was never the goal and the row was left on When a turn ends.

## RTK (38)

"RTK isn't installed." Copy: magpie can install it, or get it from its site, plus the `curl … rtk-ai/rtk … install.sh` line. Buttons **Install RTK**, **Get RTK**, **Check again** — none clicked. Agents: Cursor, switch **off**. Note: restart an agent after switching it. The switch was not toggled (it would run RTK's installer). The page does not scroll further.

## Library folder and Backups

Tooltip on Library folder: `~/.config/magpie/library`. That directory is not on disk (nothing has been kept). The click still raised Thunar on the **parent** config directory. It was closed without opening a file. The shot was **not** kept: that parent lists credential files. Backups was not clicked; it reveals `lib.backups` the same way, and that path is not on disk either.

## Left state

Plugins → Built-in, Library **Off** (restored). Top chrome is Agents, Providers, Routing, Gateway, Usage, Plugins — no Library. Gateway on, other builtins off. No instruction set, MCP server, skill, or hook was created. RTK switch left off. Window still 752×652 at +610+300. Close was not used.

## demo 对齐（v0.1.56 HOOKS_NEST_PARTIAL）
- 无 library/39+；源码对齐：Cursor 自有事件 Matcher 文本框；After/Before tool → For which tools + chev
- 仍未点录：tool matcher 原生帧、hook Add 落盘
