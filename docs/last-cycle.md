## v0.1.118 SETTINGS_LEFT_CLIP_THUMB
- WHY: Settings left clip at nest 752 / 110% (常规 + PrefRow labels).
- CAUSE: useSegThumb on warm-tabs/set-tabs → orphan .thumb vs #root.
- FIX: remove SegThumb from SettingsView; Magpie .on pill only.
- SIDE_AT=1024. chrome-guard. No portable / Vercel.

# Last tip cycle · v0.1.117

- **WHY:** CIS AgentsView + NestedBlocks (+ GroupEditor/ModelPop leftovers) layout chrome
- **Chrome:** SIDE_AT=1024 / no WEB_SIDE_AT / 752 frame unchanged
- **Guard:** chrome-guard OK
- **Cut:** Agents 29→6 · Nested 24→2 · GroupEditor 4→0 · LedHeat 4→3 · ModelPop/AMPop 2→1
- **Date:** 2026-10-15 Asia/Shanghai
