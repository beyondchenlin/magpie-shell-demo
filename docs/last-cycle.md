## v0.1.126 CIS_SIMPLEVIEWS_FEAT_USAGE_PLUGINS
- WHY: CIS SimpleViews feat-row / Usage / Plugins hand-rolled chrome → PrefRow / LibSwitch / TextBtn / Segs (0.1.125 skip list).
- CAUSE: Settings + Gateway/Library/Routing/Agents CIS closed; SimpleViews builtins feat-row was deferred.
- Gold: app.js renderBuiltins ~24446–24473 feat-row + use-credits; ~24487–24489 feat-set dataset.of; plugins.js sortBy/segs; plugins.js text primary/quiet; app.js ~17400 text us-unhide.
- WHAT kept: SIDE_AT=1024 / no WEB_SIDE_AT / pm-mirror nested switch / pm-row not PrefRow / Gateway keys .acc / sess-pick form / style={{ geometry.
- WHAT changed: PrefRow dataId/dataFeature/dataOf; Segs dataSort; SimpleViews feat-row PrefRow+LibSwitch; Usage/Plugins TextBtn; Plugins sort Segs.
- Guard: chrome-guard. Push/PR. No portable / Vercel.
- Date: 2026-10-15 Asia/Shanghai
