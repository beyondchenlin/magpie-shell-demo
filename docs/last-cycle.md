# last-cycle · 2026-10-15 Asia/Shanghai

## v0.1.144 · PLUGINS_ASK_INLINE_OPTS_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.143 — delete tip invent Plugins ask card + shell-patch pm-opts/pm-chip/pv-add invents that covered Magpie OSS.
- **CAUSE:** Demo painted remove/off/move confirm as invent bordered `pm-ask` card under the row instead of Magpie asked-in-row `.sub.ask` + `.val` buttons only (plugins.js early return); shell-patch re-owned Magpie `pm-opts`/`pm-act`/`pm-chip` (pill999, wrong .sub.ask colors) and left dead `.pv-add-steps`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Agents/WhatsNew (0.1.143); CIS PrefRow/Segs/TextBtn; Magpie `plugins.css` import after shell-patch.
- **Cite:**
  - Magpie `plugins.js` **1025–1108** ask → `.sub.ask` text + `val` Not now/Cancel + primary Move/Remove/Switch off
  - Magpie `plugins.js` **1057–1059** mwLine before optionsEditor; **1145–1189** optionsEditor; **1223–1241** mwLine
  - Magpie `plugins.css` **88** `.pm-row .sub.ask`; **79–87** `.pm-chip`; **114–132** `.pm-act*`; **173–182** `.pm-opts*`; **135–140** ghost
- **WHAT changed:** `SimpleViews.tsx` Plugins ask/mw/opts; `shell-patch.css` drop invents above.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.
