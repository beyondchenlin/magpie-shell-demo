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

## Not finished

- Search field (typing switches to Discover and queries npm after 350ms, min 2 chars) — not exercised.
- Mirrors in China toggle — seen Off, not flipped. It would call `plugins/mirror` and reload listings.
- Folder picker — not opened.
- Per-card Install / Switch on / sign-in — deliberately not clicked.
- Sort handle on Installed only appears with 2+ plugins.

## Left state

Plugins on Discover. Built-ins unchanged (Gateway on, calls page 20, Library off). No plugin installed. Mirror off.

## Search / Mirror / folder (shots 20–31) — computerUse follow-up

| shot | control | seen |
|---|---|---|
| 20–23 | Search `opencode` | Switches Discover; Suggested grid (OpenCode Zen Free, ZCode, Qoder…). 350ms debounce. |
| 24 | Search `zzzzqq` | No/odd npm hits; mirror still Off. |
| 25–27 | Mirrors in China On | Toggle On; tooltip long npmmirror/jsDelivr copy; Discover reloads via mirrors. |
| 28–29 | Manual row | Have one in mind? field typed. |
| 30–31 | Folder picker | `plugins/choose` dialog → home / folder selected into field. |

Demo v0.1.19: 350ms Suggested DEMO_NPM · mirror tip · folder fills manualSpec.
