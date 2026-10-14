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


## demo 对齐（v0.1.65 MANUAL_GITHUB_INSTALL）
- NOTES 29：`github:magpie/example` 已键入但 **Install 未点** — demo 按 Magpie `manual()`：form submit、Installing…、toast 用完整 spec
- 真 npm/git install 仍 mock；Allowances N/A
