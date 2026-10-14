# Agents (native Linux)

Front window kept (752×652 at +610+300, pid 270034). Not quit. A second Magpie (pid 37090) stays behind it and owns `127.0.0.1:3425`.

On arrival the page had no Get started card. `settings.json` had `guideHidden: true` (only that flag was read). It was set false, the window refresh was clicked, the card was recorded, then the card's own × (`Hide Get started`) set `guideHidden` back to true. File compared to the pre-change copy: same keys, no value diffs.

## Get started (shots 02–03)

Card title **Get started**, counter **0 of 2 done**, × to hide. Only the two required steps render. The optional third step in the app ("Set up routing") is not on the card while Routing groups is off; the counter is "of 2", not of 3.

| step | copy | nested |
|---|---|---|
| 1 | **Add a model source.** "A subscription you already pay for, a provider, or an API key." | Button **Add a provider** switches to the Providers tab (`03`). Lands on **ADD YOUR FIRST PROVIDER**: search "Find a vendor…", Import…, Subscriptions (Claude, ChatGPT API, Gemini CLI, More in Plugins, ChatGPT, Copilot, Antigravity), Vendors (Anthropic, Google Gemini, DeepSeek, Kimi, Zhipu GLM, OpenAI, Vertex AI, xAI, Kimi Code, Z.ai). No vendor clicked, no key entered. |
| 2 | **Connect an agent.** "Install Claude Code, Codex, Gemini CLI, OpenCode… and magpie will list them here." | No agent chips. Cursor is detected but not connectable, so it is not offered as a one-click connect. |

Refresh toast while the card was loading: **Agents looked for again**.

## The one agent row

**Cursor.** Subtitle "Only Cursor's own models" (hover shows `~/.cursor/cli-config.json`). Right side **Can't connect** — hover and click do nothing; it is a status, not a button, and the row does not expand. **Manage** under the row opens the modal (tooltip "Manage agents").

## Manage agents (04–11)

Note: "Hiding only changes this list, not an agent's connection or settings. Unhidden agents may stay under Not set up."

Search `Search agents…`. Actions: Select search results, Invert search selection, Select unconnected agents, Clear selection. Footer: Hide selected, Unhide selected, Done. Row: checkbox, Cursor icon, name, state.

| shot | state |
|---|---|
| 04 | Open. 0 selected. Hover on the row: **Not hidden**. |
| 05 | Checkbox on. **1 agent selected.** Still Not hidden. |
| 06 | Hide selected. Checkbox clears. Label **Hidden**. **1 agent hidden.** |
| 07 | Checkbox on again, Unhide selected. **Not hidden.** **1 agent unhidden.** |
| 08 | Search `zzz`. **No matching agents.** |
| 09 | Search `cur`. Cursor row returns. |
| 10 | Select search results checks Cursor. 1 selected. |
| 11 | Invert search selection clears that check. Select unconnected agents checks Cursor again (it is unconnected). Clear selection returns to 0. Done closes the modal. |

Cursor was left **not hidden**.

## Install another agent (14) (12–16)

Chevron expands. Copy: run a command in a terminal, then come back; npm commands need Node.js. Each row has an installer label and a copyable command. **No command was copied or run.**

| order | agent | installers seen |
|---|---|---|
| 1 | Claude Code | curl claude.ai/install.sh · npm `@anthropic-ai/claude-code` |
| 2 | Codex | curl chatgpt.com/codex · npm `@openai/codex` |
| 3 | Gemini CLI | Homebrew `brew install gemini-cli` · npm `@google/gemini-cli` |
| 4 | OpenCode | curl opencode.ai · npm `opencode-ai` |
| 5 | Pi | npm `@earendil-works/pi-coding-agent` |
| 6 | OmO | npm `omo-ai` |
| 7 | Copilot CLI | npm `@github/copilot` |
| 8 | Crush | npm `@charmland/crush` |
| 9 | DeepSeek Harness | npm `@deepseek-ai/dsh` |
| 10 | omp | npm `@oh-my-pi/pi-coding-agent` |
| 11 | Cline | npm `cline` |
| 12 | CodeBuddy Code | npm `@tencent-ai/codebuddy-code` |
| 13 | AtomCode | npm `@atomgit.com/atomcode` |
| 14 | Snow CLI | npm `snow-ai` |

Fold collapsed again at the end (`18`).

## Profiles

**PROFILES** "none yet · save the setup to switch back in one click". **+ Save current** opens an inline **Profile name** field and **Save** (`17`). Escape dismisses it. No name typed, no profile saved. Still none yet.

## Left state

Agents tab. Get started hidden again (`guideHidden` true, file matches the pre-change copy). Cursor visible, Can't connect, not hidden. Install list collapsed. No profile. No provider added. Magpie not quit.

## Not done

Providers was only the landing from Add a provider (`03`), not a nested pass of its own. No sign-in, no API key, no install command.

Demo v0.1.22: guide `{n} of {total} done` starts 0; Connect step no chips; Manage hide/unhide Magpie strings; Install `{n}` + Escape on Profile (shots 01–18).

## Agents nest re-pass (shots 19–42)

Same Magpie window (moved on-screen). Get started stays hidden. One agent: **Cursor** (Can't connect). No OAuth, no keys, no install commands run.

| shot | what |
|---|---|
| 19 | Agents landing: Cursor row, Install collapsed (14), Profiles none yet · + Save current. |
| 20 | Cursor row hover (handle + models path). |
| 21 | Pointer on **Can't connect** — status text, not a button; row does not expand. |
| 22 | Click Can't connect — still no expand / no action. |
| 23 | Handle hover (grip). |
| 24 | Arrange menu open: **Move up** Alt+↑ (off), **Move down** Alt+↓ (off), sep, **Hide**. Only one visible agent → both moves disabled. |
| 25 | Hover Move up (still disabled). |
| 26 | Hover Move down (still disabled). |
| 27 | Hover **Hide**. |
| 28 | Menu dismissed (outside click / Escape). |
| 29 | Handle tip **Drag to reorder · click to move or hide** (may clip left). |
| 30 | Manage agents open (same strings as 04). |
| 31 | Row hover state **Not hidden**. |
| 32 | Search `zzz` → **No matching agents.** |
| 33 | Search `cur` → Cursor returns. |
| 34 | Checkbox on · **1 agent selected.** |
| 35 | Hide selected → **Hidden** · toast/count **1 agent hidden.** |
| 36 | Recheck while Hidden. |
| 37 | Unhide selected → **Not hidden** · **1 agent unhidden.** |
| 38 | Done closes modal; Cursor not hidden. |
| 39 | Install another agent (14) expanded; curl/npm/Homebrew rows; no command run. |
| 40 | Copy control hover tip **Copy** on Claude installer line (not clicked commit — copy may toast). |
| 41 | Install fold collapsed again. |
| 42 | **+ Save current** → inline **Profile name** field + Save (Escape dismisses; no name typed). |

## demo 对齐（v0.1.68 AGENTS_NEST_DONE）
- Arrange menu Move up/down off with 1 agent; Hide; handle tip Magpie string
- Can't connect = status span (not button)
- Manage re-pass 30–38 parity with 04–11 strings
- Install fold + Copy tip; Profiles Escape already from 0.1.22
- No OAuth/keys/real installs. Allowances N/A

## Shots 19–54 (Library still on)

Same window, still **752×652 at +200+40**, not quit. Chrome now includes **Library** between Agents and Providers (left on from the Library pass; ask-matt still in the library). Guide stays hidden (`guideHidden` true). No API key, no OAuth, no install command run, no profile file written.

### Landing (19)

Agents tab with the Library pill in the strip. Otherwise the same as `18`: Cursor, **Can't connect**, **Manage**, **Install another agent (14)** collapsed, **PROFILES** none yet, **+ Save current**.

### Cursor row (20–23, 29)

| shot | state |
|---|---|
| 20 | Hover the subtitle. Dark tip **`~/.cursor/cli-config.json`** (the row's path). Grip dots show in the row's left margin. |
| 21–22 | **Can't connect** is a status, not a button. Hover and click: no tip, no menu, no sheet. |
| 23 | Pointer on the logo (the arrange handle). Grip shows. The title tip is not up yet. |
| 29 | Same hover, held longer. Tip draws off the **left edge** of the window. In frame: **to reorder · click to move or hide**. The leading **Drag** is clipped. |

### Arrange menu (24–28, 45)

Click the logo. Menu: **Move up** `Alt+↑`, **Move down** `Alt+↓`, separator, **Hide**. Only one agent, so Move up and Move down are disabled (gray). Neither was clicked. **Hide** was not clicked (it would hide Cursor).

| shot | state |
|---|---|
| 24 | Menu open. Hide is the focused row. |
| 25 | Pointer on Move up. Stays gray. |
| 26 | Pointer on Move down. Stays gray. |
| 27 | Pointer sat **below** the menu, not on Hide. Superseded by 45. |
| 28 | Escape. Menu gone. Cursor still listed. |
| 45 | Pointer on **Hide** (row highlighted). Not clicked. Escape. |

### Manage agents (30–38, 46–53)

Opened again with the Library chrome behind it. Search, hide, and unhide still work. Cursor was hidden and then unhidden; `settings.json` has no `agentsHidden` afterwards. No profile, no install.

| shot | state |
|---|---|
| 30 | Open. Search focused. **0 agents selected.** Cursor **Not hidden**. Hide selected and Unhide selected are disabled. |
| 31 | Pointer on **Not hidden**. No extra tip. |
| 32 | Search `zzz`. **No matching agents.** |
| 33 | Search `cur`. Cursor row returns. Still 0 selected. |
| 34 | **Select unconnected agents** (search still `cur`). **1 agent selected.** Checkbox on. Not hidden. |
| 35 | **Hide selected.** Checkbox clears. Label **Hidden**. **1 agent hidden.** |
| 36 | Checkbox on again while it is hidden. **1 agent selected.** Still Hidden. |
| 37 | **Unhide selected.** **Not hidden.** **1 agent unhidden.** 0 selected. |
| 38 | **Done.** Back on Agents. Cursor visible. |
| 46 | Sheet opened again, empty search, 0 selected, Not hidden. |
| 47 | Pointer on **Invert search selection** (hover). 0 selected — the toggle itself is 50→51. |
| 48 | Pointer on **Clear selection** (hover). 0 selected — the toggle itself is 52→53. |
| 50 | **Select unconnected agents.** **1 agent selected.** Purple check. Not hidden. Hide selected is enabled; Unhide selected stays disabled. |
| 51 | **Invert search selection.** Check clears. **0 agents selected.** |
| 52 | **Select search results** (empty search, so the one row). **1 agent selected** again. |
| 53 | **Clear selection.** **0 agents selected.** Not hidden. |
| 49, 54 | **Done.** Agents tab. Install collapsed. Profiles none yet. |

### Install list (39–41)

| shot | state |
|---|---|
| 39 | Chevron expanded. Note: run a command in a terminal, then come back; npm commands need Node.js. Top of the list: Claude Code, Codex, Gemini CLI, OpenCode (npm line cut off). |
| 40 | Pointer on Claude Code's **Installer** copy button. Tip **Copy**. Not clicked (a click only copies the command; it was not copied and not run). |
| 41 | Chevron collapsed again. **Install another agent (14)**. |

The other copy buttons are the same **Copy** control. The fourteen commands are already in shots 12–16. They were not clicked.

### Profiles (42–44)

**+ Save current** opens an inline **Profile name** field and the button becomes **Save** (`42`). Typed `demo-nest` (`43`). The caret sits on the final **t**, so the glyph reads like `demo-nes` plus the beam. Escape dismisses (`44`): field gone, button is **+ Save current** again, hint still **none yet**. `profiles.json` was not created. Save was not clicked.

### Left state

Agents tab. Library pill still in the strip. Cursor visible, Can't connect, not hidden. Install list collapsed. No profile. Guide still hidden. Magpie not quit. Window still 752×652 at +200+40.

### Not frozen / skipped

- Handle tip: the word **Drag** is outside the window (29).
- Can't connect: no tip to freeze (21–22).
- Install copy buttons after Claude's installer: same **Copy** tip; not clicked.
- **Add a provider** not reopened. Get started is hidden, and with no providers the add sheet has no Cancel (Close only appears once a provider exists; Escape does not close that empty sheet). Shot `03` is still the landing.
- Move up, Move down, and Hide were not activated. Hide would hide Cursor; the moves are disabled with one row.
