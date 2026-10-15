## v0.1.121 SEG_THUMB_SLIDE_FIDELITY
- WHY: Magpie-faithful Appearance `.segs` + top `#nav.seg` thumb motion (close SHELL motion re-scan on this path).
- CAUSE: useSegThumb lacked Magpie slide() mid-glide / .still / ResizeObserver.
- Gold: app.js 8168–8267 / 8185; app.css thumb + still + global prefers-reduced-motion ~3305–3308 (theming); slide() no calm().
- WHAT kept: SIDE_AT=1024 / no WEB_SIDE_AT / theme .35s/450ms / warm-tabs no SegThumb.
- WHAT changed: SegThumb.tsx fidelity; cites; SHELL re-scan closed for Appearance/nav.
- Guard: chrome-guard. No portable / Vercel.
- Date: 2026-10-15 Asia/Shanghai
