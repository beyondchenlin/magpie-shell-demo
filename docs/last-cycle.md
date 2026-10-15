# last-cycle · 2026-10-15 Asia/Shanghai

## v0.1.146 · ROUTING_REQ_MIN1150_SETTINGS_DEAD_INVENT_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.145 — delete tip invent Routing selected-req / min1150-on-cols + dead Settings invent chrome that covered Magpie OSS.
- **CAUSE:** Demo painted picked request as invent `.rt-req.on` (pill/fg-2) instead of Magpie `[aria-pressed=true]` (card-2/line); put invent `min1150` on `.rt-cols` and re-owned purpose/metric open chevrons against Magpie `.rt-more.min1150` + routing.css; shell-patch still held dead invent Settings selectors after TrayUsage/Search/About/Sync already used Magpie DOM.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Library OAuth/signing (0.1.145); CIS PrefRow/Segs/TextBtn; Magpie `routing.css` import.
- **Cite:**
  - Magpie `routing.css` **251** `.rt-req[aria-pressed="true"]`; **237–239** `:where(.rt-more.min1150) .rt-cols*`; **324–335** purpose/metric open + purpose-menu
  - Magpie `routing.js` **260** `byWidth(more, { min1150 })`; **2340** hist `solo`
  - Magpie `app.js` **20952** update-mirror-row; **21812+** TrayUsage; **21118** About Version
  - Magpie `app.css` **3117** `.search-api`; **3063–3065** `.font-preview`; **3456+** sync-form
- **WHAT changed:** `RoutingView.tsx` drop invent req `.on` + cols `min1150`; `shell-patch.css` drop invents above.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.
