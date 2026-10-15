# last-cycle · 2026-10-15 Asia/Shanghai

## v0.1.100 WEB_FRAME_ZOOM_FIT

Chrome audit overflow fix (nest/consume still PAUSED):
- CAUSE: html zoom 1.1 × #root CSS width > viewport → left shift / right clip at 752–1100.
- FIX: zoom-aware `calc((100vw - 48px) / var(--zoom, 1.1))` on web #root + side-nav card; body.web overflow-x hidden; phone nav scroll padding.
- KEPT: SIDE_AT=1024, no WEB_SIDE_AT, 752 nest footprint, 1024 side-nav gate.
- chrome-guard: now also requires zoom-aware width. Passed.
- No portable. Push + one Vercel try.
