# last-cycle · 2026-10-15 Asia/Shanghai

## v0.1.142 · ROUTING_EMPTY_GSEL_LANPOP_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.141 — delete tip invent Routing empty/filters/gsel chrome + dead LAN lan-pop that covered Magpie OSS.
- **CAUSE:** Demo painted live-stage fly copy as invent `p.rt-req-head.note` under `.rt-top` (Magpie top is what+mode only); gsel Remove used invent `rt-pick-clear` muted/red instead of Magpie `text danger rt-gremove`; shell-patch re-owned `.empty-state` / `.rt-filters` (+ invent margin-bottom) / `.rt-days` / `.rt-cols` margin-top / dead `.rt-add-stack` against Magpie routing.css; leftover `.lan-pop*` after 0.1.137 proto-menu.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Gateway/StatusToast (0.1.141); CIS PrefRow/Segs/TextBtn; demo rt-fade / rt-col-live bridges.
- **Cite:**
  - Magpie `routing.js` **26–29** `rt-top` = what + mode; **115** `row-head rt-req-head` + child `span.note`
  - Magpie `routing.js` **2338–2346** `rt-reqs.none` + `empty-state`; **3773–3814** `selectBar` → checkbox + `note` + `text danger rt-gremove` + Done
  - Magpie `routing.css` **314–315** `.rt-filters` / `.rt-days`; **340** `.rt-req-head .note`; **352–353** `.rt-reqs.none .empty-state`; **483** `.rt-gsel`
  - Magpie `app.css` **521–522** `.empty-state`; **1842** `.text.danger:hover`
  - Magpie `app.js` **23639–23640** LAN `openProtoMenu` / `lan-address-menu`
- **WHAT changed:** `RoutingView.tsx` drop invent fly note; gsel → Magpie selectBar; `shell-patch.css` drop invents above.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.

