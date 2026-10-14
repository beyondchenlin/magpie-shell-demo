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
