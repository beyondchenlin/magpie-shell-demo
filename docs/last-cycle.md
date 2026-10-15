## v0.1.127 RT_LIVEDOT_GUIDE_HIDE_FIDELITY
- WHY: 1:1 Magpie fidelity after CIS chrome wave closed (0.1.126) — Routing livedot + Agents guide hide.
- CAUSE: tip invent `.rt-livedot` faint/`.on`/7px glow; invent guide-x `.22s` fade vs Magpie hideGuide.
- Gold: routing.css L405 always-green 6px+rtlive; app.js ~1682 hideGuide instant.
- WHAT kept: SIDE_AT=1024 / no WEB_SIDE_AT / nest-752 / CIS components / no PrefRow on .acc/pm-row.
- WHAT changed: Magpie livedot restore; drop shell-patch glow; RoutingView class; AgentsView instant hide; CIS recipe note.
- Guard: chrome-guard. Push/PR. No portable / Vercel.
- Date: 2026-10-15 Asia/Shanghai
