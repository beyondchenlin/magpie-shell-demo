# last-cycle · 2026-10-15 Asia/Shanghai

## v0.1.99 CHROME_GOLD_RESTORE

Appearance regression audit (nest/consume still PAUSED):
- Reverted v0.1.98 `WEB_SIDE_AT=800` (forced side-nav ~900px — worse than Magpie gold).
- Restored `wantSide` → `SIDE_AT=1024` only; shell-patch side-nav expand behind `@media (min-width: 1024px)`.
- Kept v0.1.91 web frame 752×652 + 110% zoom (nest responsive intentional).
- Added `docs/TIP-CYCLE.md`, `docs/TIP-CHANGELOG.md`, `npm run chrome-guard`.

Widths check: 390 top-tabs phoneWeb; 752/900 top-tabs framed; ≥1024 side-nav OK.
No portable. Push for Vercel.
