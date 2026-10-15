## v0.1.128 RT_ACCTS_BAR_GUIDE_X_FIDELITY
- WHY: 1:1 Magpie fidelity — Routing live rt-accts bar track+i + Agents guide-x snap hover (drop tip invents).
- CAUSE: tip invent bar-as-fill (--bar/agent color-mix/shell-patch); invent guide-x .12s transition; idle tip override.
- Gold: routing.css L84–90 + routing.js ~1315/1587; app.css L3728–3729; routing.css L74 idle.
- WHAT kept: SIDE_AT=1024 / no WEB_SIDE_AT / nest-752 / CIS / livedot+guide-hide 0.1.127.
- WHAT changed: RoutingView makeRow DOM; shell-patch drop bar/idle/guide-x invents.
- Guard: chrome-guard. Push/PR. No portable / Vercel.
- Date: 2026-10-15 Asia/Shanghai
