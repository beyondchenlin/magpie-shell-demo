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


## Segments and the rest of a rule (55–98)

Same window, pid 560329, **752×652 at +200+40**, magpie 0.1.1240. Groups was off; the Built-in **Routing groups** switch was turned on for the editor and off again at the end. Two typed ids, `opus` and `haiku`. Nothing was saved: **Cancel** on the dirty draft raised **Discard** (98, same box as 22) and Discard was clicked. `providers.json` is still `{"providers": null}`. Find-groups and the names segments were not clicked. No request was sent. P1 bird hop: **N/A**.

Walk is top to bottom. A pill writes only the draft. Hints under the row are what was on screen.

### Rate limited (55–56)

| shot | selected | hint |
|---|---|---|
| 55 | **Keeps its place** | One rate limited while it still has quota rests as long as the vendor asks, then takes its place in the order again. |
| 56 | **Goes to the back** | One rate limited (429) while it still has quota goes to the back of the order, behind every one not rate limited since, and comes round again once those ahead of it are rate limited in turn — so the load goes round rather than back to the first each time. Out of quota, it rests as usual. Kept until magpie restarts. |

### Slow to start (57–62)

Pills **Wait**, **30 s**, **1 min**, **2 min**, **Custom**. The hint counts seconds, not the pill's label.

| shot | selected | hint starts |
|---|---|---|
| 57 | Wait | Every member is waited for, however long it takes to begin answering. |
| 58 | 30 s | A member that hasn't begun answering after **30 s** — no text, reasoning or tool call yet — is let go and the next one asked, before any of it reaches the agent. It doesn't rest; the last one left is always waited for. Only for streamed requests. |
| 59 | 1 min | same, after **60 s** |
| 60 | 2 min | same, after **120 s** |
| 61 | Custom | Field appears, prefilled **2** from the 2 min pill, unit **min**. Hint still 120 s. |
| 62 | Custom, typed 5 | Hint after **300 s**. |

### Every member busy (63–66)

Sits between Slow and Context. Was still the default **1 min** in 57–62.

| shot | selected | hint |
|---|---|---|
| 63 | Off | When every member has failed, the agent gets the last one's error at once. |
| 64 | 2 min | When every member has failed with an error that may pass — overloaded, unavailable, rate limited for a moment — and nothing of the reply has reached the agent, each is asked again after a pause, longer each time and never shorter than the vendor asks, for up to **2 min** more. A streaming agent is kept waiting meanwhile. |
| 65 | 4 min | same, up to **4 min** more |
| 66 | 1 min | same, up to **1 min** more |

### Context (67–69)

Typed ids have no known window, so the hints stay general. Custom's field came up **200k** on its own.

| shot | selected | hint |
|---|---|---|
| 67 | Largest model's | Agents are told its largest model's window; a conversation too long for one member goes on to one with room for it. |
| 68 | Smallest model's | Agents are told its smallest model's window, so they compact before any member would turn the conversation away. |
| 69 | Custom | Agents are told the group takes **200,000** tokens; a longer conversation still goes on to a member with room for it. |

### Stays (70–74)

| shot | selected | hint |
|---|---|---|
| 70 | Auto | A conversation stays with the account or key that answered it while what the vendor cached of it is worth keeping — within a turn always, across turns while it's fresh. |
| 71 | Session | …for the whole session, while it can answer. |
| 72 | Within a turn | A conversation stays put within a turn, while the agent sends tool results back; when you speak again, routing decides afresh. |
| 73 | Off | Every request is routed afresh, whoever answered its conversation before. |
| 74 | Strict | …and never moves to another, even past its usage cap: when that one is rate limited or out of quota, the error goes to the agent. New conversations are routed as usual. |

### Intent, choose a model (75–79)

**+ Add a rule** (75) opens row **1** with **asks for** (placeholder "what it asks for, e.g. writing tests"), a **+**, and **→ haiku**. Under Effort, **Intent told by** and a dashed **choose a model**.

| shot | what |
|---|---|
| 76 | choose a model. Pop: **Filter, or type any model id…** and **No matches.** |
| 77 | Typed `opus`. One row **Opus · use as typed**. |
| 78 | That row picked. The chip is **opus**. No provider model was in the list. |
| 79 | Info dot beside it. Tip is clipped on the window's left edge. Visible: "…a turn begins, this model is asked which of the intents the message is — once; a small, …st one without reasoning is best. If it fails or can't say, no intent matches. Its calls show in …e usage as magpie's own." |

### Other conditions (80–91)

The **+** tip is **Add a condition**. A condition already on the rule leaves the menu. Reasoning, Agents, and Hours and days were already shot (36–48); they were still in the menu and were not added again.

| shot | what |
|---|---|
| 80 | Pointer on **+**, menu open. |
| 81 | Menu: Conversation length, has an image, Reasoning level, compacting, Agents, in folder. Lower rows cut off. |
| 82 | **Conversation length**. Chip **≥** and an empty **tokens** field, focused. |
| 83 | Menu again, upward: has an image, Reasoning level, compacting, Agents, in folder, **not in folder**. |
| 84 | **has an image** chip. |
| 85 | Menu to the side, through **Hours and days**. |
| 86 | **compacting** chip. |
| 87 | **in folder**, placeholder **~/work/acme, ~/oss**. |
| 88 | **not in folder**, placeholder **~/big-task**. |
| 89 | Hover compacting. Tip: "The agent summarizes the conversation to go on in less room (Claude Code's /compact, Codex, OpenCode…): a cheaper, faster model can do it". |
| 90 | Hover the in-folder label. No long tip. The placeholder is the copy on screen. |
| 91 | Hover not in folder. Only a short tip, the words **not in folder**. |

### Pause, separate from the member chip (92–97)

The **→** before **haiku** is not the pause control. Clicking it (92, pointer on the arrow; 93 after moving off) opened nothing. The member chip is still the filter from 49 (opus / haiku).

Pause is on the rule's **⋯**, hidden until the row is hovered, at the top right of the rule.

| shot | what |
|---|---|
| 94 | ⋯ clicked. |
| 95 | Menu: **Move up** (gray, this is rule 1), **Move down**, **Pause the model instead**, **Remove rule**. |
| 96 | Pause the model instead. asks for, tokens, has an image, and compacting are gone, and **Intent told by** with them. **in folder** and **not in folder** stay. A **pause** chip sits in front of **haiku**. Orange line: "left out of the group then: not tried, not a fallback". |
| 97 | The pause chip opens **Filter action…**. **send to** — goes first; the others stay behind it. **pause** — left out of the group: not tried, not a fallback (checked). Not the member list. |

Remove rule was not clicked. Escape closed the picker. Cancel, then Discard (98).

### Day pills

**N/A.** The stage is still **Waiting for a request**, 0 / 0 / 0. No day bar, no By request / By session, no Replay. No request was sent to make them appear.

## Left state

Routing tab, empty live stage, **Accounts hidden**. Groups plugin **off** (Plugins switch and `plugins.yml`). Gateway and Library still on, as found. No group, no key. Magpie still running, pid 560329, window 752×652 at +200+40. Close was not used.

Not in this slice: routing-mode hints other than Smart (the row was on screen in 55–56; Smart stayed selected). Day pills and replay still need gateway history. P1 N/A.

Next: those routing-mode hints, still Routing, not tray.

## demo 对齐
- **v0.1.74**: Segments + rest of a rule 55–98（Rate limited · Slow s-hints/Custom · Busy · Context 200,000 · Stays · choose a model No matches/typed · other conditions · ⋯ Pause · Discard 98；Day pills N/A；P1 N/A）
- **v0.1.75**: Modes 99–114（In order / In turn / Least used / Weekly pace / By weight / Manual hints；Rate limited stays/gone；Weight chips 1·50%→3·75%/25%；Manual rules wait + card picks toast；Remove；Day pills N/A；P1 N/A）


## Routing modes other than Smart (99–114)

Same window, pid 560329, **752×652 at +200+40**, magpie 0.1.1240. Groups was off; the Built-in **Routing groups** switch was turned on for the editor and off again at the end. Two typed ids, `opus` and `haiku`. Find-groups and the names segments were not clicked (still **on** and **On**). P1 bird hop: **N/A**.

The mode row, left to right: **Smart**, **In order**, **In turn**, **Least used**, **Weekly pace**, **By weight**, **Manual**. Smart was already recorded. Under every pill, the same second sentence stays:

> A group among the models, and a model whose provider routes its accounts or keys other than Smart, keeps its own routing: this group only picks between it and the others, weighing it by the account or key it would try first, then tries it whole in its own order.

**Rate limited** is on screen for In order, Least used, and Weekly pace (still **Keeps its place**). It is not on screen for **In turn**, **By weight**, or **Manual**; the next row is **Slow to start**.

| shot | selected | hint |
|---|---|---|
| 99 | **In order** | In order: the first model until it can't answer, then the next — each over its own accounts or keys as its provider routes them. |
| 100 | **In turn** | In turn: each conversation's next turn goes to the next member's account or key, spreading the load. |
| 101 | **Least used** | Least used first: the account or key with the most of its allowance left goes first. |
| 102 | **Weekly pace** | Weekly pace: the account with the most of its week left per hour until it renews goes first, so less of each member's week is lost at its reset — an account with five hours and no week (Claude Enterprise) by what its five hours have left per hour until they renew, so almost always first; a key by the tokens magpie sent it lately. |
| 103 | **By weight** | By weight: each model takes its share of the requests by the weight set beside it — one weighing 3 three for every one a model weighing 1 takes, spread out rather than in bursts. One resting after a failure leaves the round and the others share its requests; the next model is the fallback when one fails. |
| 107 | **Manual** | Manual: every request goes to the model you pick on the group's card, over its own accounts or keys; the others, and the rules, wait until you pick another — none takes over when it fails. |

### By weight, on the member rows (104–106)

Each member grows a chip. Both started **Weight 1 · 50%** (dashed).

| shot | what |
|---|---|
| 104 | Pointer on opus's chip. Tip, clipped at the window's right edge: "Its share of the requests: a model weighing 3 takes three for every one a model weighi…" and a wrapped "takes". |
| 105 | Click. The chip becomes a number field, prefilled **1**, selected, blue ring. haiku stays **Weight 1 · 50%**. |
| 106 | Typed **3**, left the field. opus **Weight 3 · 75%** (solid). haiku **Weight 1 · 25%** (dashed). |

### Manual, rules line and the card (108–114)

Under **Rules** the line is no longer the checked-top-first sentence. It reads **The rules wait while you pick the model by hand.** The row under it is **+ Add a rule** and the info dot. No second add button was on that row.

| shot | what |
|---|---|
| 108 | That rules line, pointer off the words. |
| 109 | Info dot. Tip is the old sentence, clipped on the left: "…op first when you send a message: the first that matches sends that turn to its …; the rest stay behind it if it fails. A turn under way is never moved." Same words as 32, not the "rules wait" line. |
| 110 | **Add** did save. Green toast **group added**. Card: **group** `group/group`, picks **opus** (on) and **haiku**, tag **Manual**, red **no member ready**, **Edit**, switch on. Templates collapse to a **Templates** menu. Stage still **Waiting for a request**, **0 / 0 / 0**. |
| 111 | Same card, pointer off the switch so its tip is gone. opus still the filled pick. |
| 112 | haiku clicked. The fill moves to **haiku**. Green toast **group: every request to haiku**. |
| 113 | Edit → **Remove**. **Remove group?** "This routing group will no longer be available to agents." **Cancel** and red **Remove**. |
| 114 | Red Remove. Green toast **group removed**. Template cards return (**Add a provider first**). No group row. |

The written group, before it was removed, was id `group`, members `opus` and `haiku`, routing `manual`, pick `haiku` (it had been `opus`), and a weight `opus: 3` left over from 106. It is not in `providers.json` now (`{"providers": null}`). The `.bak` that still held it was stripped so a restore does not bring it back.

### Day pills

**N/A.** 110 and 112, and the page after 114, are still **Waiting for a request**, 0 requests, 0 rerouted, 0 errors. No day bar, no By request / By session, no Replay. No request was sent.

## Left state

Routing tab, empty live stage, **Accounts hidden**. Groups plugin **off** (Plugins switch and `plugins.yml`; the yml bak was set back to off with it). Gateway and Library still on, as found. No group, no key. Magpie still running, pid 560329, window 752×652 at +200+40. Close was not used.

Routing mode hints other than Smart are recorded, including the weight chips and the manual pick on the card. Day pills and replay still need gateway history.

Next: **tray**.


## Live stage after take-over (115–117)

Same window, pid **1871993**, magpie **0.1.1247**, **752×652 at +200+40** (id 85983247). Shots are ffmpeg x11grab of that rect (`-framerate 25`). Close was not used. Restart was not clicked. No request was sent. No OAuth. Groups stayed **off**. `providers.json`, `settings.json` (`window` still `[700, 600]`), and `plugins.yml` were not rewritten.

Before this slice Routing was only the line "Another magpie serves the gateway…" (responsive 05 and 09). The listener on `127.0.0.1:3425` was pid **1632377**, the panel of the deleted 0.1.1240 binary (`/proc/560329/exe panel`, version **0.1.1240**, 0 models). Gateway was orange **running · served by magpie 0.1.1240, older than this one**, with **Quit magpie 0.1.1240 and take over**. That button was clicked. 1632377 quit. This process now listens. `/v1` reports `0.1.1247`, models 0. The old panel window is gone. `magpie web` on 17890 was not touched.

| shot | what |
|---|---|
| 115 | Gateway, this magpie. Green dot, **running**, `0 models · no agent routed through it yet · five APIs, one URL`, URL `http://127.0.0.1:3425`, **Restart gateway**. Connect still expanded on **System One**. |
| 116 | Routing at **752×652**. Header **ROUTING**, green live dot, "live, as the gateway decides", **Accounts hidden**. No **+ New group** (Groups is off). Stage **Waiting for a request**. Three nodes in one row: **your agent** — **magpie** `127.0.0.1:3425` — dashed **No request yet**. Foot on one row: "Every request an agent sends to magpie shows up here, routed for real." and **0** requests, **0** rerouted, **0** errors your agent saw. |
| 117 | Same page after a 390-wide request, clamped to **616×652**. Bird mark gives way to the side toggle; tabs stay one row, Routing pill selected. The sentence wraps. Nodes reflow: **your agent** and **magpie** on the first row, **No request yet** full width under them. The **0 / 0 / 0** counts drop under the sentence. |

The page does not scroll. No routing-groups block, no mode pills, no rules row: those mount in the New group editor, and Groups is off, so they were not turned on. No day bar, no By request / By session, no Replay (still 0 requests).

Window put back to **752×652 at +200+40** after 117. Still the live empty stage.

## Left state

Routing tab, empty live stage, **Accounts hidden**. Groups plugin **off**. Gateway **running** on this pid, **Restart gateway**, 0 models. Magpie still running, pid 1871993, window 752×652 at +200+40. Close was not used. The 0.1.1240 panel process is gone and was not restarted.

## demo 对齐
- **v0.1.92**: Live stage after take-over 115–117（this magpie green **running** + Restart · Waiting / three nodes at 752 · 616 wrap: No request yet under the pair, counts under the sentence；Groups off so no + New group / mode/rules chrome；day pills N/A；peer card still when gw older/other）. No portable / Vercel.


## Groups on, New group (118–144)

Same window, pid **1871993**, magpie **0.1.1247**, **752×652 at +200+40** (id 85983247). Shots are ffmpeg x11grab of that rect (`-framerate 25`). Close was not used. Gateway was not restarted. No request was sent. No OAuth. Find-groups was not toggled (still **on**). The names segments were not clicked (still **On**). P1 bird hop: **N/A**.

There is no Groups switch on the Routing page. `+ New group` is `data-feature="groups"` and stays out of the header while the plugin is off. The control is **Plugins → Built-in → Routing groups** (a separate row, **Routing strategies**, was already on and was not touched). The switch writes at once. It was left **on**.

| shot | what |
|---|---|
| 118 | Built-in, pointer on **Routing groups**, switch off. |
| 119 | Click. Switch on. Green toast **Saved**. `plugins.yml` `groups.enabled: true`. |
| 120 | Routing. Header gains **+ New group** beside **Accounts hidden**. Under the stage: **ROUTING GROUPS**, "models agents pick as one", **Import**, **+ New group**, **Find groups on their own** (on), **Names in agents' lists** (**On**). |
| 121 | Header **+ New group**. Tip: "Make a routing group of any models you like — agents pick it as one model." |
| 122 | Empty editor, mid. **Model lists** **Its models too**. **Routing** **Smart** and the long quota sentence plus the nested-group sentence. **Rate limited** **Keeps its place**. **Slow to start** **Wait**. **Every member busy** **1 min**. **Context** starts **Largest model's**. |
| 123 | Empty editor, top. **New group**. Name placeholder "e.g. Opus anywhere", hint "Agents pick it as group/group". **+ Add a model**. Patterns field and **Add pattern**. |
| 124 | Templates above the editor. "Start from a template…". **Hard to strong, easy to cheap**, **Cheap first**, **Never stuck**. Each ends **Add a provider first**. |
| 125 | Empty editor, foot. **Stays** **Auto**. Rules is only the sentence "With two models or more, a rule can send some turns to one of them first." **Effort** **Agent's**. **Levels** **Its models' shared**. **Cancel** and blue **Add**. |
| 126 | Effort info dot. Tip: "Each request reasons as much as the agent asked." |
| 127 | **+ Add a model**. Pop: "Filter, or type any model id…", grid, star, **No matches.** |
| 128 | Typed `opus`. Row **opus · use as typed**. |
| 129 | Star. Tip is **Favorites** (not the old "use as typed"). |
| 130 | Row added. Switch on, **1**, `opus`, **Group's reasoning**, **Remove**, **+ Add another model**. Pop stayed open and was closed by a click outside. |
| 131 | Chip tip: "Reasons as the group's effort says." |
| 132 | Chip click. Pop: "Filter reasoning…", **Follow the group** checked ("as the group's effort says"), then low / medium / high / xhigh / max, each "whatever the agent asks". Escape closes the pop and leaves the editor. Not changed. |
| 133 | Second member `haiku`. Rows grow **Down** / **Up**. |
| 134 | Name `nest`. Hint **group/nest**. Lists line: "nest · routing group". |
| 135 | With two members, Rules is **+ Add a rule** and the info dot. **Cancel** and **Add** still the footer. The rule editor was not opened. |
| 136 | **Cancel** on the dirty draft. **Discard** — "Discard unsaved changes? Your changes will be lost." **Cancel** and red **Discard**. Dialog **Cancel** stays in the editor. |
| 137 | Escape in the name field raises the same **Discard**. Dialog **Cancel** again. |
| 138 | **Add** saved. Green toast **nest added**. Card: **nest** `group/nest`, `opus · haiku`, **Smart**, red **no member ready**, **Edit**, switch on. Tip on the switch: "On: agents may pick nest. Click to switch it off." Templates collapse to a **Templates** menu. |
| 139 | **Edit**. Footer of a saved group is **Remove**, **Cancel**, blue **Save** (not Add). |
| 140 | **Remove**. **Remove nest?** "This routing group will no longer be available to agents." **Cancel** and red **Remove**. |
| 141 | Red Remove. Green toast **nest removed**. Template cards return. No group row. |
| 142 | **Import** tip: "Add a routing group someone shared from their magpie." The box was not opened. Nothing pasted. |
| 143 | A 390-wide request clamps to **616×652**. Bird mark gives way to the side toggle; tabs stay one row, Routing selected. Groups head is **ROUTING GROUPS**, **Import**, **+ New group** — the note "models agents pick as one" is not on that row. Find-groups copy wraps to three lines, switch stays on the right. Names copy wraps; **Off / Not on names I set / On** stay one row. Template cards stay two-up and wrap inside. |
| 144 | Put back to **752×652**. Same groups list: note returns on the head row, templates, no group. |

`providers.json` is `{"providers": []}` again. The `.bak` still held `nest` after the remove; it was rewritten to the same empty file so a restore does not bring the group back. `settings.json` `window` is still `[700, 600]`. `plugins.yml.bak` is still the pre-switch file (`groups.enabled: false`); the live file is `true`.

### Not in this slice

Add a rule's When / conditions (the row is there in 135; it was not opened). Mode pills other than the Smart default on screen (recorded on 0.1.1240 in 99–114). Import box. Find-groups and the names segments (both write immediately). Template Add (still **Add a provider first**). Day pills, By request / By session, Replay (still **Waiting for a request**, 0 / 0 / 0).

## Left state

Routing, scrolled to **ROUTING GROUPS**, no group row, templates showing, **Accounts** not on this scroll. Groups plugin **on** (Plugins switch and `plugins.yml`). Find-groups **on**. Names **On**. Gateway **running** on this pid, 0 models. No group, no key. Magpie still running, pid 1871993, window 752×652 at +200+40. Close was not used.

## demo 对齐（118–144）· v0.1.93 ROUTING_GROUPS_DONE
- Plugins Built-in **Routing groups** toggle → toast **Saved**; `+ New group` / groups chrome only when on (`data-feature="groups"`).
- New group editor: empty top/mid/foot · templates · Effort tip · model pop (No matches / use as typed / Favorites) · reasoning Follow the group · Down/Up · name `group/{name}` · two members → **+ Add a rule** (body not opened).
- Cancel/Escape dirty → **Discard**; Add → **{name} added** card (Smart · no member ready · switch tip); Edit footer Remove/Cancel/Save; **Remove {name}?** → removed toast; Import tip; 616 head note hidden · templates two-up.
- Find-groups / names segments write not nested this tip. Day pills N/A. No portable / Vercel.

## Add a rule (145–171)

Same window, pid **1871993**, magpie **0.1.1247**, **752×652 at +200+40** (id 85983247). Shots are ffmpeg x11grab of that rect (`-framerate 25`). Close was not used. Gateway was not restarted. No request was sent. No OAuth. Find-groups was not toggled (still **on**). The names segments were not clicked (still **On**). P1 bird hop: **N/A**.

**+ New group** in the groups head opens the editor under the templates and does not scroll to it (145 is the editor top after a scroll). Two typed members, `opus` and `haiku`, make **+ Add a rule** and the info dot. The dot's tip (147): "Checked top first when you send a message: the first that matches sends that turn to its model first; the rest stay behind it if it fails. A turn under way is never moved."

The rule is not a When row of every chip. **+ Add a rule** inserts rule **1** already on **asks for** (placeholder "what it asks for, e.g. writing tests") and shows **Intent told by** / **choose a model** under Effort. A **+** on the rule opens **Add a condition**. A condition already on the rule leaves that menu. The arrow under the conditions is the member it sends to (haiku, the last member).

| shot | what |
|---|---|
| 145 | Editor open under the templates. Name placeholder, **+ Add a model**. |
| 146 | Two members. Rules is **+ Add a rule** and the info dot. Footer **Cancel** and blue **Add**. |
| 147 | Info tip, the "checked top first…" sentence. |
| 148 | Rule 1 opened: **asks for** field, **+**, arrow **haiku**. **Intent told by** / **choose a model**. |
| 149 | **+** menu, clipped at the window foot: Conversation length, has an image, Reasoning level, compacting, Agents, in folder. |
| 150 | Same menu with room: also **not in folder** and **Hours and days**. Tip on **+** is **Add a condition**. |
| 151 | **Conversation length** becomes **≥** [field] **tokens**, with an ×. |
| 152 | Menu again. Conversation length has left it. |
| 153 | Arrow opens **Filter member…** with **opus** and **haiku**. Escape closes it and leaves the rule. |
| 154 | **Reasoning level** opens at once: **Filter reasoning…**, **any reasoning** checked ("not a condition"), **reasoning on** ("thinking or any effort level"), then **reasoning ≥** low / medium / high / xhigh / max. |
| 155 | Chip **reasoning ≥ high**. |
| 156 | **compacting** tip: "The agent summarizes the conversation to go on in less room (Claude Code's /compact, Codex, OpenCode…): a cheaper, faster model can do it." |
| 157 | **Agents**. **Filter agent…**, **any agent** ("not a condition"), then Claude Code, Claude Desktop, Claude Science, Codex, Gemini CLI, Antigravity CLI, OpenCode, OpenChamber, MiMo Code. The list scrolls. |
| 158 | Foot of that list: Mister Morph, Kimi Code, Qwen Code, Muse Code, Empyro, Ante, AstrBot, jcode, MiniMax Code, **Droid**. Between 157 and 158, also DevEco Code, Pi, StepCode, Aside, OmO, Prime Agent, Goose, Cursor, Cursor Private Inference, Zed, VS Code, VS Code Insiders, VSCodium, Copilot (JetBrains), JetBrains Air, Copilot CLI, Crush, DeepSeek Harness, Reasonix Studio, Command Code, fx, omp, Devin, Hermes Agent. Picking **Droid** renames the chip. |
| 159 | **in folder**, placeholder `~/work/acme, ~/oss`. |
| 160 | **not in folder**, placeholder `~/big-task`. The label truncates ("not in folde…"); hover says **not in folder**. |
| 161 | **Hours and days**: **from** `09:00` **to** `18:00` (placeholders) and **every day**. |
| 162 | **every day** menu: **Filter days…**, **every day** ("not a condition"), **weekdays** (Mon–Fri), **weekends** (Sat, Sun), then Mon Tue Wed Thu Fri Sat Sun. |
| 163 | **weekdays** renames the chip **Mon–Fri**. |
| 164 | Whole rule above **Cancel** / **Add**. Escape here, focus not in the name field, does nothing: no Discard. |
| 165 | **Cancel** on the dirty draft. **Discard** — "Discard unsaved changes? Your changes will be lost." **Cancel** and red **Discard**. Dialog **Cancel** stays. |
| 166 | **Add** with the name left empty. Toast **group added**. Card **group** `group/group`, `opus · haiku`, **Smart**, **1 rule**, red **no member ready**, **Edit**, switch on. Templates become a **Templates** menu. |
| 167 | **…** on the rule. Tip **Actions for rule 1**. Menu: **Move up** and **Move down** (both disabled; one rule, already first), **Pause the model instead**, **Remove rule**. |
| 168 | Pause. Request chips (asks for, image, reasoning, compacting, tokens) hide. Left: **Droid**, **from 00:00 to 00:00**, **Mon–Fri**. The arrow reads **pause** **haiku**. Orange: "left out of the group then: not tried, not a fallback." |
| 169 | Saved-group footer: **Remove**, **Cancel**, blue **Save**. |
| 170 | **Remove group?** "This routing group will no longer be available to agents." **Cancel** and red **Remove**. |
| 171 | Red Remove. Toast **group removed**. Template cards return. No group row. Find-groups still **on**, names still **On**. |

What **Add** actually kept, from the bak before it was cleared: members `opus`, `haiku`; one rule `use: haiku` with `images`, `effort: high`, `agents: ["droid"]`, `compact`, and `time` `00:00`–`00:00` on mon–fri. The token field, the asks-for text, and both folder fields were still placeholders, so they were not stored. Days with no typed hours became the whole day. The pause in 168 was not saved.

`providers.json` is `{"providers": []}` again. The `.bak` held this `group` after the remove; it was rewritten to the same empty file so a restore does not bring it back. `settings.json` `window` was not touched. `plugins.yml` `groups.enabled` is still `true`.

### Not in this slice

Find-groups and the names segments (both write immediately; left **on** / **On**). A second rule, so Move up / Move down never enabled. **Remove rule** was not clicked. The classifier was not picked (**choose a model** stayed). Import box. Template Add (still **Add a provider first**). Day pills, By request / By session, Replay (still **Waiting for a request**, 0 / 0 / 0).

## Left state

Routing, **ROUTING GROUPS**, no group row, templates showing. Groups plugin **on**. Find-groups **on**. Names **On**. Gateway **running** on this pid, 0 models. No group, no key. Magpie still running, pid 1871993, window 752×652 at +200+40. Close was not used.

## demo 对齐（145–171）· v0.1.94 ADD_A_RULE_DONE
- **+ Add a rule** → rule 1 on **asks for** (+ ×) · Intent told by / choose a model; **+** Add a condition (items leave once added).
- Conditions: tokens · member Filter · reasoning ≥ high · compacting tip · agents through Droid · in folder / not in folder · hours placeholders · weekdays → **Mon–Fri**.
- Cancel → Discard; Add empty name → **group** / `group/group` · 1 rule card; … Actions for rule 1 (Move up/down disabled) · Pause hides request chips · whole-day 00:00–00:00; Save footer; Remove group → templates.
- Find-groups/names not flipped; day pills N/A; P1 N/A. No portable / Vercel.


## Find-groups and names (172–179)

Same window, pid **1871993**, magpie **0.1.1247**, **752×652 at +200+40** (id 85983247). Shots are ffmpeg x11grab of that rect (`-framerate 25`, cursor drawn). Close was not used. Gateway was not restarted. No request was sent. No OAuth. No group was saved. P1 bird hop: **N/A**.

Both controls sit under the **ROUTING GROUPS** head and write on the click. Neither has a hover tip of its own. Find-groups is a switch; the sentence under the title is the tip, and it changes. Names is three segments, **Off** / **Not on names I set** / **On**; the sentence under that title does not change.

| shot | what |
|---|---|
| 172 | Pointer on the switch, **on**. "A model two or more of your providers serve becomes a group of them (auto-…). Switch it off to list and serve only the groups you made or changed." Names still **On**. |
| 173 | Click. Knob to the left. The sentence is now "Off: only the groups you made or changed are listed and served. An agent set to a found group is moved to its model from one provider, and a request still naming one goes there too." Green toast **Found groups are off: only yours are listed and served**. |
| 174 | Toast gone. Same off sentence. Names still **On**. No found-group row was here to leave (no providers). |
| 175 | Click. Switch **on** again, the 172 sentence back. Green toast **Found groups are on**. |
| 176 | **Not on names I set** lit. The sentence stays "Whether “· routing group” follows a group’s name in the agents’ lists: one setting for every group, and for the provider after each model’s name, as on Settings." No toast. |
| 177 | **Off** lit. Same sentence. No toast. |
| 178 | **On** lit again. Same sentence. No toast. |
| 179 | **Import** hover. Tip, clipped at the window's right edge: "Add a routing group someone shared from their magpie". The box was not opened. Nothing pasted. Find-groups still **on**, names still **On**. |

Find-groups posts `groups/found` at once. While off, `providers.json` had `noAutoGroups: true`; on again the field is omitted, and the file matches what it was before 172 (`{"providers": []}`). Names posts `settings/plain-names` at once: **Not on names I set** set `plainOwnNames`, **Off** set `plainNames`, **On** omits both. `settings.json` matches the pre-slice file. Each click's `.bak` kept the generation before it, so after the last click the baks still held the off flags; both were rewritten to the restored files so a fallback does not turn Find-groups or names off. `settings.json` `window` was not touched. `plugins.yml` `groups.enabled` is still `true`.

The group's editor was not opened, so the line "Agents’ lists show …" (it adds " · routing group" only while names is **On**) was not on screen. No agent is wired whose lists this setting cannot reach, so the extra "changes nothing in …" line was not shown.

### Not in this slice

Import box. The editor's "in agents' lists" line while the segments change. Template Add (still **Add a provider first**). Day pills, By request / By session, Replay (still **Waiting for a request**, 0 / 0 / 0).

## Left state

Routing, **ROUTING GROUPS**, no group row, templates showing. Groups plugin **on**. Find-groups **on**. Names **On**. Gateway **running** on this pid, 0 models. No group, no key. Magpie still running, pid 1871993, window 752×652 at +200+40. Close was not used.

## demo 对齐（172–179）· v0.1.95 FIND_GROUPS_NAMES_DONE
- Find-groups switch: sentence is the tip (on/off copy swaps); no hover tip; toasts **Found groups are off: only yours are listed and served** / **Found groups are on**; persists `noAutoGroups`.
- Names segments Off / Not on names I set / On: sentence stays; no toast; persists `plainNames` / `plainOwnNames`. Defaults: found on, names On.
- Import tip only (box not opened). Day pills N/A. No portable / Vercel.

## Import box (180–189)

Same window, pid **1871993**, magpie **0.1.1247**, **752×652 at +200+40** (id 85983247). Shots are ffmpeg x11grab of that rect (`-framerate 25`, cursor drawn). Close was not used. Gateway was not restarted. No request was sent. No OAuth. Find-groups was not toggled (still **on**). The names segments were not clicked (still **On**). No group was saved. P1 bird hop: **N/A**.

Import is not a sheet and not a file dialog. The header **Import** (tip already in 179) toggles an inline box under the template cards. At this height the box starts below the fold: 180 shows one clipped line, and a scroll brings the rest up. There is no path, no Choose, no drop target. The only field is a textarea.

| shot | what |
|---|---|
| 180 | Header **Import** clicked. The box opens under the templates. Only the first line is in the window: "Paste a routing group someone shared from their magpie: its models, routing and rules come with". |
| 181 | Scrolled. The sentence finishes "it, never a key". Textarea focused (accent ring, caret), placeholder **Paste a group copied with Copy to share**. Blue **Import** and **Cancel**. A resize grip is drawn on the field; it was not dragged. |
| 182 | Pointer on the blue **Import**. No hover tip. |
| 183 | Pointer on **Cancel**. No hover tip. |
| 184 | Typed `hello, not a shared group` into the field. Placeholder gone. Not submitted yet. |
| 185 | Blue **Import**. Red toast at the foot: "This is not a routing group shared from magpie: copy one with Copy to share in a group's menu". The text stays in the field. The box stays open. Nothing was added. |
| 186 | **Cancel**. Toast and text gone, box gone. Stage still **No request yet**, **0 / 0 / 0**. Find-groups **on**, names **On**. No group row. |
| 187 | Opened again, focus in the field, **Escape**. The box closes. Under **Never stuck** the list is empty. Names still **On**. |
| 188 | Opened again, field empty, blue **Import**. The box stays, the placeholder stays, the caret comes back, and there is no toast. |
| 189 | Header **Import** clicked while the box was open. It toggles shut. Stage still **0 / 0 / 0**, switch **on**, names **On**. |

`providers.json` is still `{"providers": []}`, same bytes as before 180, and so is the `.bak`. `settings.json` was not rewritten (`window` still `[700, 600]`; no `plainNames` / `plainOwnNames`). `plugins.yml` `groups.enabled` is still `true`.

### Not in this slice

A real shared-group paste (nothing valid was imported; the only submit was the refusal in 185). What a successful import says it left out (missing models, "the same model from your own provider", rules left out, **Done**). The textarea grip was not dragged. Template **Add a provider first** is still the line on each card; that tip was not hovered. Day pills, By request / By session, Replay (still **Waiting for a request**, 0 / 0 / 0).

## Left state

Routing, **ROUTING GROUPS**, no group row, templates showing, Import box closed. Groups plugin **on**. Find-groups **on**. Names **On**. Gateway **running** on this pid, 0 models. No group, no key. Magpie still running, pid 1871993, window 752×652 at +200+40. Close was not used.

## demo 对齐（180–189）· v0.1.96 IMPORT_BOX_DONE
- Header **Import** toggles inline box under templates (not a sheet; no path/file). Sentence + placeholder **Paste a group copied with Copy to share**; blue **Import** + **Cancel** (no tips).
- Cancel / Escape / header Import again close and drop text. Empty Import only refocuses. Invalid paste → red toast, box stays, nothing added.
- Successful shared paste out of scope. Day pills N/A. No portable / Vercel.

## Copy to share (190–204)

Same window, pid **1871993**, magpie **0.1.1247**, **752×652 at +200+40** (id 85983247). Shots are ffmpeg x11grab of that rect (`-framerate 25`, cursor drawn). **197** is widened to **900×720 from +70+20** so the title tip that draws past the window's left edge is whole. Close was not used. Gateway was not restarted. No request was sent. No OAuth. Find-groups was not toggled (still **on**). The names segments were not clicked (still **On**). P1 bird hop: **N/A**.

A group named **share** was added with one typed member **opus** and one pattern **probe/*** (matches nothing now). The pattern is what lets Import add the group: with no provider here, a members-only paste would be refused as none of the models being in this magpie. The handle (or a right-click on the card) opens the row menu. **Copy to share** is the last item. Its title tip is native and draws as a black bar that starts left of the window.

| shot | what |
|---|---|
| 190 | **+ New group**. Editor under the templates, name field focused, placeholder "e.g. Opus anywhere". |
| 191 | Model pop, typed `opus`. Row **opus · use as typed**. |
| 192 | Member in. Switch on, **1**, `opus`, **Group's reasoning**, **Remove**. Pop closed with Escape. |
| 193 | Pattern **probe/*** added. "matches nothing now", **Remove**. |
| 194 | **Add**. Green toast **share added**. Card **share** `group/share`, `opus`, `probe/* · matches nothing now` (orange), **Smart**, red **no member ready**, **Edit**, switch on. Templates collapse to a **Templates** menu. |
| 195 | Row menu. **Move up** (Alt+↑) and **Move down** (Alt+↓) disabled — one group, already first and last. **Duplicate**. **Copy to share** lit. |
| 196 | Pointer on **Copy to share**. Tip, clipped at the window's left edge: "paste into another magpie: its models, routing and rules, no key". |
| 197 | Same tip, whole: **share as text to paste into another magpie: its models, routing and rules, no key**. |
| 198 | Click. Menu closes. Green toast **share copied: paste it into Import on another magpie's Routing page**. The card is unchanged. |
| 199 | Header **Import**. Box open. Ctrl+V into the focused field. The clipboard held `{"magpie":"routing-group","version":1,"group":{"id":"share","name":"share","members":["opus"],"match":["probe/*"]}}`. |
| 200 | Blue **Import**. The box becomes the result: **Added share 2**, red **Not in your magpie, left out: opus**, **Done**. Green toast **Added share 2**. Two cards: **share** `group/share` still has `opus` and the pattern; **share 2** `group/share-2` has only `probe/* · matches nothing now` (opus left out). Both **Smart**, **no member ready**, switch on. Header gains **Filter groups and models** and **Select**. No "same model from your own provider" line and no rules line (nothing to substitute, no rules). |
| 201 | **Done**. The result box closes. Both cards stay. Find-groups **on**, names **On**. |
| 202 | **Select**, both checked (**2 selected**). **Remove**. **Remove share, share 2?** "These routing groups will no longer be available to agents." **Cancel** and red **Remove**. |
| 203 | Red Remove. Green toast **2 groups removed**. Template cards return. No group row. **Select** and the filter leave. Find-groups **on**, names **On**. |
| 204 | Pointer on the first template's **Add a provider first** (Hard to strong, easy to cheap). The line is the text itself. No further tip after a still hover. Cheap first and Never stuck say the same line. |

`providers.json` is `{"providers": []}` again. The `.bak` held `share 2` (`probe/*`, members null) after the remove; it was rewritten to the same empty file so a restore does not bring the group back. `settings.json` was not rewritten (`window` still `[700, 600]`; no `plainNames` / `plainOwnNames`). `plugins.yml` `groups.enabled` is still `true`.

### Not in this slice

Day pills, By request / By session, Replay (still **Waiting for a request**, 0 / 0 / 0). A paste where a member is kept, or swapped for the same model from a provider here ("The same model from your own provider"), or a rule left out with it — there is no provider, so the only kept piece was the pattern and the only left-out piece was **opus**. The textarea grip was not dragged. No OAuth. No Vercel, no package.

## Left state

Routing, **ROUTING GROUPS**, no group row, templates showing, Import box closed. Groups plugin **on**. Find-groups **on**. Names **On**. Gateway **running** on this pid, 0 models. No group, no key. Magpie still running, pid 1871993, window 752×652 at +200+40. Close was not used.

## demo 对齐（190–204）· v0.1.97 COPY_TO_SHARE_DONE
- Row menu: Move up/down disabled when one group · Duplicate · **Copy to share** native tip **{name} as text to paste into another magpie: its models, routing and rules, no key** (clips at left unless grab widened)
- Toast **{name} copied: paste it into Import on another magpie's Routing page** · clipboard routing-group JSON
- Import success: result box **Added {name}** · red **Not in your magpie, left out: …** · blue **Done** · toast **Added {name}** · kept patterns only when no provider; no instead/rules lines
- ≥2 groups: **Filter groups and models** + **Select** · multi-remove **Remove share, share 2?** · toast **{n} groups removed** · templates return
- Template **Add a provider first** is the line itself (no further tip)
- Day pills / Replay N/A · provider-kept / instead / rules-left-out paths N/A · P1 bird N/A · no portable / Vercel
