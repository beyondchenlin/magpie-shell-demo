## v0.1.125 CIS_GATEWAY_LIBRARY_ROUTING_AGENTS
- WHY: CIS outside Settings — Gateway/Library/Routing/Agents Magpie-mapped chrome → Segs/TextBtn/LibSwitch/PrefRow.
- CAUSE: Settings PrefRow wave closed 0.1.122–124; scan found clear wins elsewhere.
- Gold: gateway/client.js 97/418/452–460/661–669; keys.js 180 text quiet; app.js 6174 segs; library lib-switch; Routing Conditions PrefRow; Agents manage .text.
- WHAT kept: SIDE_AT=1024 / no WEB_SIDE_AT / Gateway keys not PrefRow (Magpie .acc) / skillHow busy / agent rows / rt-gfound .txt / style={{ geometry.
- WHAT changed: Gateway Segs+TextBtn; Library Segs+LibSwitch+TextBtn toolbar; Routing PrefRow Conditions + LibSwitch + names Segs; Agents Manage TextBtn; CIS PrefRow API note.
- Guard: chrome-guard. Push/PR. No portable / Vercel.
- Date: 2026-10-15 Asia/Shanghai
