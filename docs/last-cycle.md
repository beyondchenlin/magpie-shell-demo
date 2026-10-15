## v0.1.119 APPEARANCE_THEMING_TOP_SEG
- WHY: Magpie Appearance `html.theming` .35s/450ms + top `#nav.seg` selected `--seg-thumb` at nest (SIDE_AT=1024 top tabs).
- CAUSE: theme DOM was React-effect delayed vs Magpie sync applyPrefs; shell-patch thumb selectors clarified.
- WHAT kept: SIDE_AT=1024 / no WEB_SIDE_AT / 752 frame / Win chrome.
- WHAT changed: applyTheme.ts; App theme effect; Settings onChange; shell-patch/app.css cites.
- Guard: chrome-guard OK. No portable / Vercel.
- Date: 2026-10-15 Asia/Shanghai
