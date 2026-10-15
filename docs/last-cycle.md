## v0.1.123 CIS_NESTEDBLOCKS_PREFROW
- WHY: NestedBlocks LAN/OTel/CLI/Font/Redact/Mirror/Disable/Search → PrefRow/TextBtn/WordsField/PrefPick.
- CAUSE: v0.1.122 left specialized raw `.row.pref`.
- Gold: app.js LAN 23630–23657; OTel 23212–23220; CLI 20883–20914; index.html font-row 285–298; mirror 20940–20978.
- WHAT kept: SIDE_AT=1024 / no WEB_SIDE_AT / Field grids / AutoResetOwn / AboutVersionRow / FontRow style={{ pop.
- WHAT changed: PrefRow wrapVal/subClassName/dataPattern; TextBtn forwardRef; NestedBlocks PrefRow migrations.
- Guard: chrome-guard. Push/PR. No portable / Vercel.
- Date: 2026-10-15 Asia/Shanghai

## v0.1.122 CIS_PROVIDERS_SEGS_PREFROW
- WHY: Providers local Segs → shared Segs+thumb; NestedBlocks Proxy/DailyWarm → PrefRow/TextBtn.
- CAUSE: Page-local Segs skipped Magpie slide(); raw .row.pref duplicated CIS PrefRow.
- Gold: app.js 6174–6202 segs+slide; 7410 proxy; 8827 key header; 8983 regions; 10611 api.
- WHAT kept: SIDE_AT=1024 / no WEB_SIDE_AT / Providers Field grid / specialized NestedBlocks rows.
- WHAT changed: ProvidersView Segs; PrefRow.afterWho; NestedBlocks PrefRow+TextBtn.
- Guard: chrome-guard. Push/PR. No portable / Vercel.
- Date: 2026-10-15 Asia/Shanghai
