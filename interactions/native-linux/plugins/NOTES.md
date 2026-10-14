# Plugins (native Linux) — partial

View `#view-plugins` is filled in JS. Sticky head: tabs Built-in / Discover / Installed (`magpie.pluginTab`), search (hidden on Built-in), switch "Mirrors in China" (hidden on Built-in).

## Discover (default here)

Intro card "Subscriptions and gateway middleware", link "Write a middleware" (opens `https://usemagpie.ai/docs/plugins#middleware` via `api("open")` — not clicked), trust line. Then sections: Subscriptions, Gateway middleware, Agents, GitHub unofficial cards, and a manual row.

Cards (`role=button`) open a detail modal; the Install button stops propagation and would install — not clicked. Detail (shots `03`, `04`, and an accidental second card): icon, name, publisher, Install, version/stars/license/updated, GitHub link, unofficial warning, README markdown, footer "Plugins are other people's code…" and Close. Escape does not close; Close does. Two details were opened and closed. Nothing installed.

Manual row at the bottom (`09`): "Have one in mind?", field placeholder "npm package, GitHub repo (github:owner/repo) or a folder", folder button (`plugins/choose`), primary Install. A click meant for the field hit a card instead, so the field was not typed. Install was not submitted.

## Built-in

Copy: parts not everyone needs; off removes them from the sidebar, pages and Settings. Rows:

| row | state | nested |
|---|---|---|
| Gateway page | On, locked. Tooltip "In use, so it stays on" | Recent calls at a time: enum 10, 20, 50, 100. Menu opens under the pill (options paint very faint). Clicking the first row set 10; second row restored 20. |
| Routing groups | Off | none while off |
| Library | Off. Toggled On (`15`) — no extra rows — then Off (`16`) | |
| Observability | Off | |
| Sessions | Off | |
| Warm-up and check-in | Off | |

List fits; scrolling does not reveal more (`17`).

## Installed

Empty: logo, "No plugins yet", "Install a subscription or a middleware from Discover…", button "Discover plugins" (`18`). Clicking it returns to Discover (`19`).

## Search, mirror, manual row (shots 20–34)

Sticky search sits under the Built-in / Discover / Installed tabs. Typing focuses Discover (already selected). Placeholder `Search plugins and npm…`. A clear control appears once there is text.

| shot | what |
|---|---|
| 20 | Query `opencode`. Intro card leaves. Heading **Suggested**, then cards (OpenCode Zen Free first, also ZCode, Qoder, Devin, Zed, Factory…). Field shows a clear button. Install not clicked. |
| 21 | Scrolled Suggested (Zed, Factory, Grok, Command Code, Xiaomi MiMo, Cursor). |
| 22–23 | Further down, **npm / GitHub** hits whose names contain opencode (`opencode-models-discovery`, `@opencode/plugin`, `opencode-plugin-browser`, …). Publisher line under the name (GitHub Actions, ranjithraj). Unofficial house icon. Still no section title captured between Suggested and these cards; scrollbar not quite at the end in 22. |
| 24 | Replaced the query with `zzzzqq` (select-all, then type). Local **Suggested** section disappears. An **On npm** block remains, with the standing line "OpenCode plugins and pi packages anyone published — read what one does before you install it", and cards that are still OpenCode-related (ai-sdk-provider, opencode-poe-auth, …). Skeletons showed while it loaded. Not a clean empty state — the npm list did not go blank. |
| 25 | **Mirrors in China** switched On (knob moves to the right, track goes dark). List under the same `zzzzqq` query refreshed to a wider set (Plannotator, `@brendonovich/vite`, `opencode-pty`, `@mastra/opencode`, …). |
| 26 | Hover tooltip, switch still On: "Download the plugin list, plugins and Bun from mirrors in China first (npmmirror, jsDelivr), their official addresses after. Each is a copy of the very file, checked as the original is". |
| 27 | Search cleared. Discover top returns (intro + Subscriptions: OpenCode Zen Free, ZCode) with the switch still On. |
| 28 | Scrolled to the manual row, mirror still On. |
| 29 | Field focused (purple ring) and typed `github:magpie/example`. **Install not clicked.** |
| 30 | Folder button opens a GTK dialog titled **Choose a plugin folder** (1100×680). Sidebar: Recent (selected, empty list), Home, Desktop, settings, Other Locations. Columns Name / Location / Size / Type / Accessed. Cancel and Open. |
| 31 | Home: breadcrumb `box`, folders agent-data, chrome-profile, cli-config, reference, sand-data. Modified column. Back/forward and a new-folder icon (not used). |
| 32 | Other Locations: **On This Computer**, row Computer, "107.4 GB / 134.2 GB available", path `/`. |
| 33 | Cancel. Dialog gone. Manual field still `github:magpie/example` — choosing a folder was not confirmed, so the path was not replaced. |
| 34 | Field cleared back to the placeholder. **Mirrors in China switched Off** (knob left, gray track). |

Per-card Install is shots 35–40 (OpenCode Zen Free). The detail modal's Install was still not clicked. Sort handle on Installed is still absent: only one plugin, and the header shows only when there is more than one.

## Per-card Install (shots 35–40)

Discover was not the visible tab (Built-in was). Opened Discover, then typed `opencode` in **Search plugins and npm…** so the intro leaves and **Suggested** is the list (Suggested only when the query hits). First card is OpenCode Zen Free.

Clicking its Install does not open a confirm or cancel dialog, and no second window appears. The control changes in place, then a toast, then the Installed row.

| shot | what |
|---|---|
| 35 | Query `opencode`, clear control in the field. Heading **Suggested**. Cards OpenCode Zen Free, ZCode, Qoder, Devin… each with a pale Install pill (purple label). Mirror **Off**. |
| 36 | Pointer on OpenCode Zen Free's Install. Hover fills that pill solid indigo and the label turns white. No tooltip. Neighbouring Install pills stay pale. |
| 37 | Click. Same control widens to the left, goes pale gray and disabled: spinner, then **Getting Bun…**. No dialog. Other Install pills unchanged. An **Installing…** label was not seen; the busy text stayed Getting Bun… until it finished. |
| 38 | Control becomes a green check and **Installed** (no pill). Tab label gains a count: **Installed · 1**. Green toast, lower left, drawn over the Zed card, no buttons: **OpenCode Zen Free is installed**. Not the "sign in to use it" line. No account or key prompt. |
| 39 | Toast gone by itself. Card stays check + Installed. Search still `opencode`. |
| 40 | Installed tab (white pill **Installed · 1**). One row, no sort header. Left to right: icon, **OpenCode Zen Free**, `v0.1.1`, fork mark **Provider**, then **Switch off** and **Remove**. Footer, left **Plugins run on Bun 1.4.2**, right **Check for updates**. Switch off, Remove, and Check for updates were not clicked. Search still shows `opencode` on this tab. Mirror still **Off**. |

## Installed row (shots 41–54)

OpenCode Zen Free v0.1.1 was still the only Installed row (shot 40). Controls, left to right then the footer: **Switch off**, **Remove**, then **Check for updates**. **Check for updates** was used after Cancel and before the confirming Remove: the footer is only there while a plugin is installed, and the empty state has no such button. **Sign in** was not clicked. No key or account was entered.

Switch off does not ask. The row goes Off at once (name dims, subtitle **Off**, the same control now reads **Switch on**). Clicking **Switch on** turns it back on. That is when a blue **Sign in** pill appears, with **OpenCode Zen Free: not signed in** under the name. It was not on the row before the off/on cycle. Sign in was left alone.

| shot | what |
|---|---|
| 41 | Pointer on **Switch off**. Hover fills a pale pill behind the words. No tooltip. |
| 42 | After the click. Subtitle **Off**, name dimmed. Control reads **Switch on** (pale pill, pointer still on it). No confirm. |
| 43 | **Switch on** clicked. Name is dark again, control reads **Switch off**. New blue **Sign in** and the line **OpenCode Zen Free: not signed in**. Not clicked. |
| 44 | Pointer on **Remove** (pale pill). Dark tooltip, clipped by the window's right edge. The tooltip window continues: **Removes the plugin and what it installed; its sign-ins are kept until you sign out**. |
| 45 | Click opens an in-window confirm (page dimmed, not a second window). Title **Remove OpenCode Zen Free?** Body is the same sentence as the tooltip. **Cancel** (focus ring) and a red **Remove**. |
| 46 | **Cancel**. Dialog gone. Plugin still installed. **Remove** keeps a blue focus ring. |
| 47 | Pointer on **Check for updates** (pale pill). Tooltip clipped at the right edge. Full line: **Ask npm now for each plugin's newest version**. |
| 48 | Click. The control swaps to a spinner and **Checking…**. No dialog. Row unchanged (still no Up to date chip). |
| 49 | Spinner gone, label back to **Check for updates**. Pale chip **Up to date** sits after `v0.1.1`. Green toast, lower left, no buttons: **Every plugin is up to date**. |
| 50 | Toast gone by itself. Chip **Up to date** stays. |
| 51 | Remove opened again. Pointer on the red **Remove**. **Cancel** still has the focus ring. Same title and body. |
| 52 | Confirm. Dialog closes. The row control reads **Removing…** (Sign in and Switch off stay). Tab still **Installed · 1**. |
| 53 | Row gone. Tab is **Installed** with no count. Empty state: tray icon, **No plugins yet**, **Install a subscription or a middleware from Discover; a subscription signs in from here.**, pill **Discover plugins** (not clicked). Green toast **OpenCode Zen Free removed**. Search still `opencode`. Mirror still **Off**. |
| 54 | Toast gone. Empty state remains. **Check for updates** is not on this empty page. |

## Left state

Plugins, **Installed** with no count. Empty: No plugins yet / Discover plugins. Search still `opencode`. Mirror **Off**. OpenCode Zen Free was removed (demo plugin). Sign in was never used. Magpie left running (front window 752×652 at +610+300, pid 560329). Close was not used.

Demo v0.1.22: Suggested only when hits; On npm standing + Mirror set; folder dialog Cancel leaves field (shots 20–34).

Demo v0.1.38: PLUGINS_NEST — 01–34 consumed (intro/market/GitHub/search/mirror/manual/builtin/installed/detail).

Demo v0.1.38: per-card Install — 35–40 Suggested hover, Getting Bun…, toast, Installed row. No confirm dialog.

Demo v0.1.45: PLUGINS_INSTALL — 35–40 Getting Bun… / toast / Installed row Bun 1.4.2.

Native Installed row — 41–54 Switch off/on (Sign in appears, not used), Remove Cancel then confirm (Removing…, removed toast, empty), Check for updates (Checking…, Up to date chip + toast).

## Check for updates + Remove commit (shots 47–54)

| shot | what |
|---|---|
| 47 | Hover **Check for updates**: tip "Ask npm now for each plugin's newest version". |
| 48 | Click → spinner + **Checking…** (button busy). |
| 49 | Done: soft chip **Up to date** on the row; green toast **Every plugin is up to date**; Check label restored. |
| 50 | Toast dismissed; Up to date chip remains. |
| 51 | Remove confirm again (red Remove click path). |
| 52 | Confirm → row **Removing…** (brief). |
| 53 | Toast **{name} removed**; Installed empties. |
| 54 | Empty: logo · **No plugins yet** · Discover copy · **Discover plugins**. No Bun/Check footer while empty. Search may still hold `opencode`. |

Demo v0.1.49: PLUGINS_OFF_DONE — 41–54 full Switch/Remove/Check nest.

## demo 对齐（v0.1.56 DETAIL_INSTALL）
- 详情模态 Install 路径：pm-dhead/pm-dact/pm-links；Getting Bun… → Installed（与卡片同 install）；Escape 不关
- 详情 Install 仍无原生点录帧（NOTES：未点）


## Detail Install (shots 55–60)

Recorded against live Magpie web (top-nav, same `plugins.js`; Bun already present so busy was brief). Native window xdotool clicks did not land this cycle.

| shot | what |
|---|---|
| 55-detail-before-open | Discover + search `opencode` Suggested list (before opening card). |
| 55-detail-open | Card body open → `.editor.pm-detail`: icon · name · magpie community · **Install** (purple get) · Version v0.1.1 · Downloads 3.0k/week · License MIT · Updated Oct 10, 2026 · **Signs in to** opencode-zen-free · npm · Source · README (Install CLI + Sign in `public`) · foot note · Close. Escape does not close. |
| 56-detail-install-hover | Pointer on detail Install (solid indigo/white). |
| 57-detail-getting-bun | After click: toast **OpenCode Zen Free is installed — sign in to use it** (Provider has subs). Busy Installing…/Getting Bun… was too brief to freeze with Bun already on disk. |
| 58-detail-installed | Detail **pm-dact** is blue **Sign in** (`.pm-act.go`), not green Installed — Magpie `actionFor` when unsigned provider. |
| 59-detail-installed-settled | Same Sign in settled (toast gone). |
| 60-after-detail-close | Close → back on Discover Suggested; plugin remains installed until Remove. |

Demo v0.1.58: DETAIL_INSTALL_DONE — 55–60 consumed; Provider toast + Sign in in detail/card; Signs in to fact; Escape swallow on detail.


## Detail modal Install — native window (shots 61–65)

Shots 55–60 above were the web demo (`live Magpie web`), not this native window. The native detail Install is 61–65.

Discover, search `think` (replaced the leftover `opencode` query). **Think Tags** is the small free middleware card (magpie community, v0.1.0, 159/week). The card body was clicked, not its Install pill. OpenCode Zen Free was not used: after a list refresh its card showed Install again, and a middleware ends on **Installed** rather than Sign in.

Detail (`.editor` over the dimmed page, not a second window): icon, **Think Tags**, magpie community, pale **Install**, summary, Version v0.1.0 / Downloads 159/week / License MIT / Updated Oct 6, 2026, npm and Source, README, Options `{ "mode": "strip" }`, footer "Plugins are other people's code…", **Close**.

The cached Bun binary was not at hand, so the busy control is **Getting Bun…** while Magpie downloaded Bun again (back at `~/.cache/magpie/bun/1.4.2/magpie-bun`), then the plugin. No confirm dialog. No second window. Escape was not pressed. Close was not pressed. Nothing was typed into Options.

| shot | what |
|---|---|
| 61 | Detail open, pointer off the links (no tooltip). Install is a pale pill, purple label. |
| 62 | Pointer on that Install. Hover fills the pill solid indigo and the label turns white. No tooltip. |
| 63 | Click. The control goes pale gray and disabled: spinner, then **Getting Bun…**. No dialog. Modal stays open. |
| 64 | Spinner gone. Green check and **Installed** (no pill). Green toast, no buttons, over the footer: **Think Tags is installed**. Not a sign-in line. |
| 65 | Toast gone by itself. Check + Installed stays. Modal still open. Search underneath still `think`. Mirror still **Off**. |

## Left state

After shots 61–65, **Close** was used. Modal gone. Discover, search `think`, Think Tags card shows a green check **Installed**, tab **Installed · 1**. Mirror **Off**. Think Tags stays installed (middleware, no sign-in). No credential folder was opened. Magpie still running (752×652 at +610+300, pid 560329).


## Detail Install middleware (shots 61–65) — Think Tags

Second detail Install path (non-Provider). Confirms Magpie `actionFor` / toast split:

| shot | what |
|---|---|
| 61 | Think Tags detail open: Install get; Version v0.1.0 · 159/week · MIT · Updated Oct 6, 2026; **no** Signs in to; npm · Source; README Options `{ "mode": "strip" }`. |
| 62 | Install hover solid. |
| 63 | Busy **Getting Bun…** (spinner) on pm-dact — Bun not cached for this package path / first busy freeze. |
| 64 | Green check **Installed** + toast **Think Tags is installed** (no "sign in to use it" — middleware has no subs). |
| 65 | Settled Installed in detail. |

Demo v0.1.60: DETAIL_INSTALL_MW — middleware → Installed toast/check; Provider path remains Sign in (55–60).


## demo 对齐（v0.1.65 MANUAL_GITHUB_INSTALL → superseded by 0.1.66）
- NOTES 29 typed-only path superseded by native **66–72** (Install clicked; bun 404 err).
- 真 npm/git install 仍 mock；Allowances N/A

## demo 对齐（v0.1.66 MANUAL_INSTALL_DONE · CU 66–70）
- Installing… = primary purple pill **no spinner** (Bun on disk)
- Field cleared on busy draw (spec only in toast)
- Fail → `.status.err` ~8s, clipped one-line + title full; no Cancel (<1s)
- Folder browse kept (native `mine.picker`); web Magpie has none
- Sort handle N/A (Installed · 1 Think Tags only)


## Manual-row Install (shots 66–70)

Discover was not showing the manual row: the leftover search was `think` (Suggested + Unofficial on GitHub). Cleared it (Discover intro returns; **Mirrors in China** still Off, tab **Installed · 1**). Scrolled to the bottom manual row. Spec `github:magpie/example`. Install clicked. No confirm dialog, no second window, no folder picker. Bun was already on disk, so the busy label is **Installing…**, not Getting Bun…. It failed in well under a second (not a >60s hang — nothing to Cancel). Think Tags stays the only installed plugin, so the Installed sort handle is still absent (header only when there is more than one). Installed tab was not opened.

The form is rebuilt on each draw, so the field does not keep the spec while busy or after the error. The toast is the only place the spec remains. It is a red alert, no buttons, along the bottom edge, and it leaves by itself (error toasts are about 8s). The pill is one line and clips with an ellipsis; the visible text is below.

| shot | what |
|---|---|
| 66 | Manual row in view. Label **Have one in mind?**, empty field (placeholder `npm package, GitHub repo (github:owner/repo) or a folder`), folder button, purple **Install**. Search is empty; its focus ring is still on from clearing `think`. Mirror **Off**. |
| 67 | Field focused (purple ring) and typed `github:magpie/example`. Install not yet clicked. |
| 68 | Click. The button label becomes **Installing…** (still the purple primary pill, not a spinner). Field is disabled and shows the placeholder again, not the spec. No dialog. |
| 69 | Button back to **Install**. Red toast, lower edge, no buttons: **bun add github:magpie/example: exit status 1: bun add v1.4.2 (744846f84) Resolving dependen…** (clipped). Not a green installed toast. |
| 70 | Toast gone. Field empty, Install enabled. Tab still **Installed · 1**. Nothing new installed. |

## Left state

Plugins, **Discover**, scrolled to the manual row, field empty. Search empty. Mirror **Off**. Think Tags still installed (middleware from 61–65). `github:magpie/example` was not installed. No credential was entered. Sort handle not shown. Magpie left running (752×652 at +610+300, pid 560329). Close was not used.

Demo v0.1.66: MANUAL_INSTALL_DONE — CU 66–70 typed spec, Installing… (no spinner), bun add exit 1 toast, settled. Not a success install. Sort handle still N/A (one plugin).

## Mirror On/Off re-pass (shots 71–75)

Discover landing (intro + Subscriptions). No search. Think Tags still **Installed · 1**. Install not clicked.

| shot | what |
|---|---|
| 71 | Discover top. **Mirrors in China** Off (gray track, knob left). Search empty. |
| 72 | Hover switch (still Off). Dark tip (native title / clipped): full Magpie string about npmmirror, jsDelivr — may clip at window edge. |
| 73 | Click → On. Track **var(--fg)** (black), knob right. Tip dismissed. List unchanged at Discover top (no query). |
| 74 | Settled On. Same Subscriptions cards. |
| 75 | Click Off → restored gray track. Same Discover top. |

No fake installs. Sort handle still N/A (one plugin).

## demo 对齐（v0.1.69 MIRROR_TOGGLE_DONE · CU 71–75）
- Mirror tip Magpie string; On track = `--fg` (not accent)
- Brief `mirrorSaving` disabled while toggle settles
- On/Off at Discover landing; search+mirror npm refresh kept from 25–34
- No invent success install / OAuth / keys. P1 N/A

## Mirror and remaining Discover nests (shots 71–90)

Last numbered frame before this pass was **70** (no 71). Native window stayed **752×652 at +200+40**, pid 560329. Started on Agents, switched to Plugins. Think Tags was already the only install. Nothing new was installed. No credential was entered. Switch off was not clicked (covered in 41–54). Remove was not clicked.

Label on the control is **Mirrors in China** (role switch). Off: white knob on the left, light gray track. On: knob on the right, track near-black. No confirm dialog and no toast either way. Clicking again put it back Off. Discover's top (Subscriptions: OpenCode Zen Free, ZCode) did not visibly change.

| shot | what |
|---|---|
| 71 | Plugins, **Discover** at the top. Intro "Subscriptions and gateway middleware". Mirror **Off**. Tab **Installed · 1**. Search empty. |
| 72 | Pointer on the switch. Tooltip, clipped at the window's right edge: **Download the plugin list, plugins and Bun from mirrors** / **their official addresses after. Each is a copy of the very f…**. Full title (same as shot 26): "Download the plugin list, plugins and Bun from mirrors in China first (npmmirror, jsDelivr), their official addresses after. Each is a copy of the very file, checked as the original is". |
| 73 | Click. Track goes dark immediately. Pointer still on the knob. No dialog. |
| 74 | Pointer moved off. Knob right, dark track. Still **Mirrors in China**. No toast. |
| 75 | Clicked again. Knob left, gray track. **Off** restored. |

## Unofficial GitHub filters (shots 76–80)

Not in 01–70. The section sits under Agents. Heading **Unofficial, on GitHub**. Subtitle: "repositories their authors tagged magpie-plugin — nobody has reviewed them; read the code before you install one". Kind group (aria "Kind of plugin"): **All · 47** (selected), **Provider · 39**, **Middleware · 5**, **Agent · 3**. Field placeholder **Filter by name, author or description** (aria "Filter the plugins on GitHub"). Counts are of the text query, not of the selected kind. No Install was clicked.

| shot | what |
|---|---|
| 76 | Default. **All · 47** selected (white pill). Filter empty. First cards are providers (magpie-our-free-mo…, magpie-intelligence-…). |
| 77 | **Middleware · 5** selected. Grid is only middleware: magpie-claude-scie… (Claude Science), magpie-middleware-… (newest images), magpie-haiku55-thi… (Haiku 5.5 thinking), claude-api-billing. Counts unchanged. |
| 78 | Same kind, field typed `claude` (purple ring, clear ×). Counts become **All · 5**, **Provider · 3**, **Middleware · 2**, **Agent · 0**. Two middleware cards remain. Manual row is in view under them. |
| 79 | **Agent · 0** with `claude` still in the field. Dashed empty: **No plugin on GitHub matches** and **Show all**. |
| 80 | **Show all**. Kind back to **All · 47**, field cleared, provider cards return. (The field's clear × was not used.) |

## Installed — Think Tags (shots 81–90)

One row, so there is still **no sort header**. There is **no overflow (⋯) menu**. Controls are inline: **Options**, **Switch off**, **Remove**. Footer: **Plugins run on Bun 1.4.2** and **Check for updates**. Subtitle **Gateway middleware: onEvent, onResponse**. Chip **Middleware**. Switch off was left alone (41–54). Remove was not opened.

| shot | what |
|---|---|
| 81 | Installed · 1. Row as above. Mirror still **Off**. |
| 82 | Right-click on the name. No app menu. A native tooltip shows the row text run together: **Think Tagsv0.1.0Middleware**. |
| 83 | **Options**. Editor (not a dialog): JSON `{ "mode": "strip" }`, note **Not set: these are its package's example**, **Cancel** and purple **Save**. No Clear (nothing saved yet). Switch off and Remove stay beside it. |
| 84 | **Cancel**. Editor gone. **Options** is back. No toast. Options were not saved. |
| 85 | Pointer on **Options**. Hover pill. Tooltip: **It runs with no options; its package suggests some**. |
| 86 | Pointer on **Check for updates** (pale hover pill). Tooltip had not appeared yet. |
| 87 | Click. **Checking…** was already over before the frame. Pale chip **Up to date** after v0.1.0. Green toast, no buttons: **Every plugin is up to date**. Label back to **Check for updates**. |
| 88 | Same toast still up, pointer still on the button. |
| 89 | Hover again. Tooltip, clipped on the right: **Ask npm now for each plugin's newest ver…** and **Last checked 07:13 AM**. Full first line is "Ask npm now for each plugin's newest version". |
| 90 | Toast gone. Chip **Up to date** stays. Row unchanged. |

## Left state

Plugins, **Installed · 1**. Think Tags v0.1.0 still installed (middleware, on). Chip **Up to date**. Options not saved. Switch off not used. Mirror **Off**. GitHub filter cleared (Show all). Search empty. No new package. Magpie left running (752×652 at +200+40, pid 560329).

Skipped: Switch off/on (41–54), Remove, sort handle (only one plugin), row overflow menu (none), Checking… spinner (too brief), main search / Suggested (20–40), Provider kind as its own click (counts only), Mirror confirm (none), `github:magpie/example` (not retried), credentials.

## demo 对齐（v0.1.69 PLUGINS_71_90）
- Mirror Off→On→Off; tip clipped; On track `--fg`; mirrorSaving
- GitHub kinds All/Provider/Middleware/Agent + Filter + empty Show all
- Think Tags seeded; Options strip example Cancel (no Clear unsaved); Options tip
- Check → brief Checking… → Up to date chip + toast Every plugin is up to date; Last checked tip
- P1 N/A. No invent install/OAuth/keys.
