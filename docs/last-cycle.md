## v0.1.124 CIS_AROWN_ABOUT_SYNC_TEXTBTN
- WHY: AutoResetOwn/AboutVersionRow/SyncForms → PrefRow/TextBtn where Magpie-faithful.
- CAUSE: 0.1.123 left ar-own / About / SyncForms raw chrome.
- Gold: app.js 22249–22280 ar-own; 21118–21130+23730–23768 About; 21603–21695 Sync .text.
- WHAT kept: SIDE_AT=1024 / no WEB_SIDE_AT / FontRow style={{ / Providers Field grids / .ar-own-cases CSS.
- WHAT changed: PrefRow.dataUser; AutoResetOwn PrefRow wrapVal=false; AboutVersionRow PrefRow+TextBtn; Sync/Restore/WhatsNew TextBtn.
- Guard: chrome-guard. Push/PR. No portable / Vercel.
- Date: 2026-10-15 Asia/Shanghai
