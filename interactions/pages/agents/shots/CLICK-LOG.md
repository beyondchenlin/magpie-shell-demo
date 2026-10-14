A-01 | Add a provider (Get started primary) | navigated to Providers view (?view=providers), catalog of subscriptions/vendors/relays, no modal | A-01-before.png, A-01-after.png
A-02 | Connect an agent step row (no button or link on the step) | stayed on Agents; no new page, modal, or expand | A-02-before.png, A-02-after.png
A-05 | Manage button (aria-label Manage agents) on the Cursor row | opened Manage agents modal (search, select/hide, Done); dismissed with Escape afterward | A-05-before.png, A-05-after.png
A-06 | Install another agent (14) fold | expanded (aria-expanded=true) showing installer commands for 14 agents | A-06-before.png, A-06-after.png
A-08 | ＋ Save current | inline Profile name field and Save button appeared; no profile name submitted | A-08-before.png, A-08-after.png
A-09 | top-right refresh (Look for agents on this computer again) | status toast "Agents looked for again"; profile editor closed; refresh icon still spinning in mid frame | A-09-before.png, A-09-mid.png, A-09-after.png
A-11-before | Manage agents modal open (baseline; A-05 already recorded the open) | dialog title "Manage agents"; note "Hiding only changes this list, not an agent's connection or settings. Unhidden agents may stay under Not set up."; searchbox placeholder "Search agents…"; actions "Select search results", "Invert search selection", "Select unconnected agents", "Clear selection"; "0 agents selected"; row checkbox "Cursor" unchecked, state "Not hidden"; "Hide selected" and "Unhide selected" disabled; "Done" enabled. No tabs and no links inside the modal. | A-11-before.png
A-M01 | searchbox "Search agents…" | clicked; it was already focused when the modal opened, so the frame did not change (same pixels as A-11-before). No query typed. | A-M01-after.png
A-M02 | checkbox "Cursor" (row Cursor / Not hidden) | checked; count "1 agent selected"; "Hide selected" enabled; "Unhide selected" stayed disabled | A-M02-after.png
A-M03 | Hide selected | status "1 agent hidden"; row state "Hidden"; selection cleared ("0 agents selected"); Hide and Unhide disabled again. Saved with agents/arrange. | A-M03-after.png
A-M04 | Select search results | Cursor checked while state stayed "Hidden"; "1 agent selected"; "Unhide selected" enabled; "Hide selected" disabled | A-M04-after.png
A-M05 | Unhide selected | status "1 agent unhidden"; row state "Not hidden"; selection cleared; Hide and Unhide disabled. Cursor restored on the Agents list. | A-M05-after.png
A-M06 | Invert search selection | empty selection inverted to the only match: Cursor checked, "1 agent selected", "Not hidden"; "Hide selected" enabled | A-M06-after.png
A-M07 | Clear selection | "0 agents selected"; Cursor unchecked; Hide and Unhide disabled. Status line still "1 agent unhidden". | A-M07-after.png
A-M08 | Select unconnected agents | "1 agent selected"; Cursor checked, "Not hidden"; "Hide selected" enabled. PNG is a retake: the first Done closed the modal before that script could return its image; the retake matched (Cursor selected, not hidden). | A-M08-after.png
A-M09 | Done | modal closed. Agents page shows Cursor "Can't connect" (not hidden). "Install another agent (14)" was still expanded. | A-M09-after.png
A-I01 | Copy · Claude Code · Installer · curl -fsSL https://claude.ai/install.sh \| bash | toast "Claude Code's install command copied". Command copied only; not run. | A-I01-after.png
A-I02 | Copy · Claude Code · npm · npm install -g @anthropic-ai/claude-code | toast "Claude Code's install command copied". Not run. | A-I02-after.png
A-I03 | Copy · Codex · Installer · curl -fsSL https://chatgpt.com/codex/install.sh \| sh | toast "Codex's install command copied". Not run. | A-I03-after.png
A-I04 | Copy · Codex · npm · npm install -g @openai/codex | toast "Codex's install command copied". Not run. | A-I04-after.png
A-I05 | Copy · Gemini CLI · Homebrew · brew install gemini-cli | toast "Gemini CLI's install command copied". Not run. | A-I05-after.png
A-I06 | Copy · Gemini CLI · npm · npm install -g @google/gemini-cli | toast "Gemini CLI's install command copied". Not run. | A-I06-after.png
A-I07 | Copy · OpenCode · Installer · curl -fsSL https://opencode.ai/install \| bash | toast "OpenCode's install command copied". Not run. | A-I07-after.png
A-I08 | Copy · OpenCode · npm · npm install -g opencode-ai | toast "OpenCode's install command copied". Not run. | A-I08-after.png
A-I09 | Copy · Pi · npm · npm install -g @earendil-works/pi-coding-agent | toast "Pi's install command copied". Not run. | A-I09-after.png
A-I10 | Copy · OmO · npm · npm install -g omo-ai | toast "OmO's install command copied". Not run. | A-I10-after.png
A-I11 | Copy · Copilot CLI · npm · npm install -g @github/copilot | toast "Copilot CLI's install command copied". Not run. | A-I11-after.png
A-I12 | Copy · Crush · npm · npm install -g @charmland/crush | toast "Crush's install command copied" (check on the Crush row). Not run. | A-I12-after.png
A-I13 | Copy · DeepSeek Harness · npm · npm install -g @deepseek-ai/dsh | toast "DeepSeek Harness's install command copied". Not run. | A-I13-after.png
A-I14 | Copy · omp · npm · npm install -g @oh-my-pi/pi-coding-agent | toast "omp's install command copied". Not run. | A-I14-after.png
A-I15 | Copy · Cline · npm · npm install -g cline | toast "Cline's install command copied". Not run. | A-I15-after.png
A-I16 | Copy · CodeBuddy Code · npm · npm install -g @tencent-ai/codebuddy-code | toast "CodeBuddy Code's install command copied". Not run. | A-I16-after.png
A-I17 | Copy · AtomCode · npm · npm install -g @atomgit.com/atomcode | toast "AtomCode's install command copied". Not run. | A-I17-after.png
A-I18 | Copy · Snow CLI · npm · npm install -g snow-ai | toast "Snow CLI's install command copied". Not run. | A-I18-after.png
NOTE | Install another agent (14) | already expanded (aria-expanded=true) on arrival, so the head was not clicked (a click would collapse it). Install section has 18 Copy buttons and 0 links; "nodejs.org" in the note is plain text, not a link. No API-key or provider form appeared; none invented. Hide selected was undone by Unhide selected; Cursor row remains "Can't connect". Not in this pass: "Hide Get started", "Arrange Cursor" (row menu). | —
