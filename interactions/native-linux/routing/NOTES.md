# Routing (native Linux, magpie 0.1.1240)

Frameless window **752×652 at +610+300**. Shots are `ffmpeg` x11grab of that rect. Top tabs stay: Agents, Providers, Routing, Gateway, Usage, Plugins, plus refresh, gear, close. Routing is a view, not a modal.

The window that owns the gateway is the one that draws this page. While another process served the gateway, this view was only the line "Another magpie serves the gateway; its routing plays live in that magpie's window." and the history chrome was not mounted. These shots are from the window that listens on `127.0.0.1:3425`.

**Groups** was off (`plugin preset essentials`, `groups` source preset). It was turned on with `magpie plugin builtin on groups` so New group, the editor, and the templates exist, then turned back off after the shots. Nothing was saved: no Add, no Import of text, no Find-groups flip, no API key. The name `haiku` and member `opus:high` were a draft only; Discard dropped them.

## Empty live stage (01, 28–30)

Header row, left to right: label ROUTING, green live dot, "live, as the gateway decides", then **+ New group** (`#rtNewGroup`) and the eye **Accounts hidden** / **Hide accounts** (`#rtMask`).

The stage card:

- Title **Waiting for a request**.
- Body: "Send one from any agent routed through magpie and it plays here as it happens: who routing put first and why, each try, and what each answered."
- Three nodes: **your agent** (cube) — line — **magpie** `127.0.0.1:3425` — dashed **No request yet**.
- Foot: "Every request an agent sends to magpie shows up here, routed for real." and **0** requests, **0** rerouted, **0** errors your agent saw.

The live dot pulses (CSS `rtlive`, about 1.8s, linear; `prefers-reduced-motion` stops it). Opening a menu or the model list is a pop (`#pop`), not a page morph. The view scrolls; the card does not morph.

With no kept requests there is **no** day bar, **no** By request / By session, **no** Purpose menu, **no** Metrics menu, and **no** Replay bar. Those sit in the history under the stage once the gateway has requests (`Live` pill, day pills, Earlier days overflow, By request | By session, `#rtPurpose`, `#rtMetrics`). Replay (clock, speed, Stop, Back to live) only exists while a replay is playing. None of that was reachable here.

## Accounts mask (28–30)

| shot | state |
|---|---|
| 28 | Mask on. Label **Accounts hidden**, struck eye. Tip: "Accounts are masked for a screenshot — click to show them." |
| 29 | Click. Label **Hide accounts**, open eye. No rows changed (no account names on the empty page). |
| 30 | Click again, restored. Tip while off: "Mask the accounts on this page — email addresses and account names — for a screenshot to share." |

Swap is instant (icon path + label). Restored to masked, which is how the page was found.

## Routing groups (23–27)

Under the stage, after a short scroll. Head: **ROUTING GROUPS**, note "models agents pick as one", **Import**, **+ New group**.

- **Find groups on their own** — switch, found **on**. Copy: a model two or more providers serve becomes `auto-…`. Not toggled. Off would write immediately and reseat agents; there is no confirm.
- **Names in agents' lists** — segments **Off** / **Not on names I set** / **On** (On selected). Copy: whether "· routing group" follows every group's name, and the provider after each model's name, as on Settings. Not changed (a click writes at once).
- Templates, only while there is no group of your own. Head: "Start from a template: made of your own models, added in a click." Three cards, all disabled, each ending **Add a provider first** (no Add / Edit first):
  - Hard to strong, easy to cheap
  - Cheap first
  - Never stuck

No group rows, no filter, no Select (those appear once there is more than one group).

### Import (25–27)

Tooltip on Import: "Add a routing group someone shared from their magpie." Opens a box, not a file dialog:

- "Paste a routing group someone shared from their magpie: its models, routing and rules come with it, never a key."
- Textarea placeholder "Paste a group copied with Copy to share."
- Blue **Import** (disabled in spirit until there is text; it was not clicked) and **Cancel**.

27 is the pointer on Cancel. The next click closed the box. Nothing was pasted.

## New group editor (02–22)

Header **+ New group** tooltip (02): "Make a routing group of any models you like — agents pick it as one model." The same button in the groups head opens the same editor. The editor is inline under the templates, title **New group**, and the page scrolls to it. It is a draft until **Add**. **Cancel** on a dirty draft raises **Discard**.

Top (04, 10, 15, 16):

| control | notes |
|---|---|
| Name | Placeholder "e.g. Opus anywhere". Focus ring blue. Hint "Agents pick it as group/{slug}". Typing `haiku` (15) rewrote the hint to `group/haiku` and the lists line to "haiku · routing group". |
| In agents' lists | Not a control here. Text only: lists show "{name} · routing group", and that suffix is the setting above the list. |
| Models | Empty: dashed **+ Add a model**. Hint: "The first answers for what the model can do. In order, they are tried top first." |
| Patterns | Field "e.g. openrouter/*:free or re:…" and **Add pattern**. Hint about `*` and `re:`. Not submitted. |
| Model lists | **Its models too** (selected) / **The group alone**. Hint about `/v1/models`. |
| Routing | **Smart** (selected), In order, In turn, Least used, Weekly pace, By weight, Manual. Smart's hint is the long quota/week paragraph, plus the nested-group sentence. |

Member row after picking a typed id (09–12), still a draft:

- Switch (on), order handle **1**, generic icon, name `opus` then `opus:high`.
- **Group's reasoning** chip. Click opens `#pop` (11): filter "Filter reasoning…", **Follow the group** (checked, "as the group's effort says"), low / medium / high / xhigh / max reasoning ("whatever the agent asks"). Choosing **high reasoning** (12) renames the chip and the id to `opus:high`. Button tip: "Reasons as the group's effort says."
- **Remove**.
- The add button becomes **+ Add another model**.

### Model pop `#pop` (05–09, 14)

Anchored on Add a model. Search "Filter, or type any model id…". With no providers: **No matches.** Left rail: grid icon and a star (06 is the pointer on the star; tip "use as typed"). Typing `opus` (07) leaves one row **opus · use as typed** (highlighted). Clicking that row adds it to the draft and keeps the pop open for another (09); the star tip reads "use as typed". Escape closes the pop and leaves the editor. A click outside also closes it (08, 13). No model from a provider was available, so no icon grid of real models.

### Lower editor (17–21)

| row | segments | selected | hint seen |
|---|---|---|---|
| Rate limited | Keeps its place / Goes to the back | Keeps its place | rests as long as the vendor asks, then takes its place again |
| Slow to start | Wait / 30 s / 1 min / 2 min / Custom | Wait | every member is waited for |
| Every member busy | Off / 1 min / 2 min / 4 min | 1 min | asks again for up to 1 min when every member failed with a passing error |
| Context | Largest model's / Smallest model's / Custom | Largest model's | agents are told the largest window |
| Stays | Auto / Session / Within a turn / Off / Strict | Auto | stays with the account or key while the vendor cache is worth keeping |
| Rules | none until two models | — | "With two models or more, a rule can send some turns to one of them first." No When / conditions row, because only one member was in the draft. |
| Effort | Agent's / Picked per turn | Agent's | info dot beside the row |
| Levels | Its models' shared / Named | Its models' shared | "Agents are offered the levels every model has." |

Clicks on those pills in 19–20 missed (pointer landed on the hint text); the selected values above are the defaults actually on screen. Footer (21): **Cancel** and blue **Add**. Add was not clicked.

### Discard (22–23)

Cancel on the dirty draft (name `haiku`, member `opus:high`) opens a modal over a dimmed page:

- Title **Discard**
- "Discard unsaved changes? Your changes will be lost."
- **Cancel** (stay) and red **Discard**

Discard was clicked. 23 is the groups list again: templates, no editor, no group row. `group/haiku` was not created.

## Not reached

- Day pills, Earlier days, By request / By session, Purpose, Metrics, request rows, account fold, allowance refresh, Replay. They need gateway history. This gateway had no requests.
- Rule conditions (When ≥ tokens, has an image, reasoning, agent, asks for, compacting, folders, hours, days, send to / pause). The rules line stays a sentence until the draft has two models.
- Find-groups switch and the names segments. Both write immediately. Left as found: found **on**, names **On**.
- Template Add. Cards said Add a provider first; there is no provider, so no Edit first either.

## Left state

Routing tab on the 752×652 window at +610+300. Editor closed, import closed, accounts mask on again (Accounts hidden). Groups plugin turned back off to match essentials. No group and no key were written.

## demo 对齐
- **v0.1.29**: New group editor 02–22（segs / pop / reasoning / discard）
- **v0.1.30**: 23–30 templates + Import paste box + Accounts mask tip；空态 Waiting / Send one… / Every request… 英文源键；ModelPop multi keepOpen + use as typed

Demo v0.1.42: ROUTING_NEST — templates **Add a provider first** (empty providers; `magpie.demoProviders=1` enables Add); Accounts hidden default; Import disabled until paste; editor 02–22 already from v0.1.29–30.


## Rules with two models (31–54)

Groups was off in the running window (the CLI file said on; the Plugins switch was still off). The Built-in **Routing groups** switch was turned on so the editor exists, and turned off again at the end. Shots are the same **752×652 at +200+40**, pid 560329. No provider was added. P1 live bird hop: **N/A** (the header bird did not hop on Add or Remove).

Two typed ids, `opus` and `haiku` (`use as typed`). Escape closed the model pop. With two members the Rules line is no longer the one-model sentence. It is **+ Add a rule** plus an info dot.

| shot | what |
|---|---|
| 31 | Rules head after two members. **+ Add a rule**. Footer **Cancel** / **Add** still there. Defaults unchanged: busy **1 min**, context **Largest model's**, stays **Auto**, effort **Agent's**, levels **Its models' shared**. |
| 32 | Pointer on the rules info dot. Tip: "Checked top first when you send a message: the first that matches sends that turn to its model first; the rest stay behind it if it fails. A turn under way is never moved." |
| 33 | Add a rule. Row **1**, an **asks for** field (placeholder "what it asks for, e.g. writing tests", focused), a **+**, and **→ haiku**. **Intent told by** / **choose a model** appears under Effort. |
| 34 | Pointer on that **+**. Tip **Add a condition**. Menu open under it, first row covered by the tip. |
| 35 | Same menu, tip gone. **Conversation length**, **has an image**, **Reasoning level** (hover), **compacting**, **Agents**, **in folder**. |
| 36 | Reasoning level opens **Filter reasoning…**. **any reasoning** checked, note "not a condition". **reasoning on** "thinking or any effort level". Then **reasoning ≥ low / medium / high / xhigh / max**. |
| 37 | **reasoning ≥ high** picked. Chip on the rule. Menu closes. The **+** wraps under the chips. |
| 38 | **+** again. Menu opens **upward** with a scrollbar. **Reasoning level** is gone (already on the rule). Visible: Conversation length, has an image, compacting, Agents, in folder, **not in folder**. Tip **Add a condition** on the +. |
| 39 | Menu opens downward and fits: those, plus **Hours and days** at the bottom. |
| 40 | **Agents**. **Filter agent…**. **any agent** checked, "not a condition". Then Claude Code, Claude Desktop, Claude Science, Codex, Gemini CLI, Antigravity CLI, OpenCode, OpenChamber, MiMo Code. Scrollbar. |
| 41 | Further down: Prime Agent, Goose, Cursor, Cursor Private Inference, Zed, VS Code, VS Code Insiders, VSCodium, Copilot (JetBrains), JetBrains Air. |
| 42 | Mister Morph, Kimi Code, Qwen Code, Muse Code, Empryo, Ante, AstrBot, jcode, MiniMax Code, Droid. Between 41 and 42 the list also passed Reasonix Studio, Command Code, fx, omp, Devin, Hermes Agent. |
| 43 | End of the list (thumb at the bottom): Pencil, T3 Code, OpenHanako, AtomCode, Snow CLI, Alma, Cindy, magpie, curl, **PI-Desktop**. Between 42 and 43: Cline, Qoder, Qoder CN, Grok Build, Grok App, ZCode, WorkBuddy. |
| 44 | Filter `grok`. Two rows: **Grok Build**, **Grok App**. |
| 45 | Filter `zzzz`. **No matches.** |
| 46 | **Escape** closes the agent menu. Nothing was picked. A dashed **any agent** chip is now on the rule (still "not a condition"). |
| 47 | **Hours and days** added. Fields **from** `09:00` **to** `18:00` (placeholders, focused) and a dashed **every day**. |
| 48 | Second click on **every day**. **Filter days…**. **every day** "not a condition", **weekdays** Mon–Fri, **weekends** Sat, Sun, then Mon Tue Wed Thu Fri Sat Sun. Escape closed it; every day stayed dashed. |
| 49 | The **haiku** target chip. **Filter member…** with **opus** and **haiku**. Not a pause menu. Left on haiku (Escape). |
| 50 | Effort info dot, while **Agent's** is selected. Tip: "Each request reasons as much as the agent asked." |
| 51 | **Named**. Chips, all looking unselected: **none, minimal, low, medium, high, xhigh, max**. Hint: "Agents are offered these. A model without the level asked is sent the one it has nearest." |
| 52 | **Add** did save (the empty-looking Named chips did not block it). Green toast **group added**. Row: **group** `group/group`, `opus · haiku`, **Smart**, **1 rule**, red **no member ready**, **Edit**, switch on. Templates collapse to a **Templates** menu while a group of your own exists. Find-groups still on. Names still **On**. |
| 53 | Edit → footer is **Remove**, **Cancel**, blue **Save** (not Add). Remove opens **Remove group?** "This routing group will no longer be available to agents." **Cancel** and red **Remove**. |
| 54 | Red Remove. Green toast **group removed**. Templates cards return (**Add a provider first**). No group row. |

The written group, before it was removed, was id `group`, members `opus` and `haiku`, one rule `{use: haiku, effort: high}`, levels `low`, `medium`, `high`. Placeholders (asks for, 09:00–18:00, any agent, every day) were not stored. It is not in `providers.json` now (`{"providers": null}`). A `.bak` that still held that group was stripped so a restore does not bring it back.

## Left state

Routing tab, empty live stage, **Accounts hidden**. Groups plugin **off** again (Plugins switch and `plugins.yml`). No group, no key. Find-groups and the names segments were not clicked. Magpie still running, pid 560329, window 752×652 at +200+40. Close was not used.

Not in this slice: rate-limit / slow-to-start / context / stays segment clicks (19–20 still missed), Conversation length, has an image, compacting, in folder, not in folder, the intent **choose a model** pop, a pause control (the target chip is a member filter), routing-mode hints other than Smart, day pills and replay (still no gateway requests). P1 N/A.

Next: those remaining Routing nests, not tray.

## demo 对齐
- **v0.1.73**: Rules with two models 31–54（+ Add a rule · condition menu · agents through PI-Desktop · Hours and days · Named · group added/removed · no member ready）
