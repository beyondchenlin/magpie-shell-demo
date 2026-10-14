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

## Left state

Plugins, **Installed · 1**, OpenCode Zen Free v0.1.1 on the Installed row. Search still `opencode`. Mirror **Off**. Switch off / Remove / Check for updates not used. Magpie left running (front window 752×652 at +610+300, pid 560329). Close was not used.


Demo v0.1.22: Suggested only when hits; On npm standing + Mirror set; folder dialog Cancel leaves field (shots 20–34).

Demo v0.1.38: PLUGINS_NEST — 01–34 consumed (intro/market/GitHub/search/mirror/manual/builtin/installed/detail).

Demo v0.1.38: per-card Install — 35–40 Suggested hover, Getting Bun…, toast, Installed row. No confirm dialog.

Demo v0.1.45: PLUGINS_INSTALL — 35–40 Getting Bun… / toast / Installed row Bun 1.4.2.
