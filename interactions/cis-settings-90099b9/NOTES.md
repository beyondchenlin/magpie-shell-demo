# Settings S1/S2/S3 checkpoint

Candidate: `90099b9532fc7e95036fa05b7848e61e11342b72`, UI version 0.1.195. Frozen rules remain `028dab5`; no normative edits made in this batch. Only FontRow lifecycle/focus and one Settings translation key were changed. The inherited v195 draft files remain uncommitted and were excluded by building Git archive snapshots.

## Results

- **S1 pending: specification conflict.** Browser rows resolve to min-height 48px, padding 7px 12px 7px 14px, gap 12px (font rows retain their more-specific 8px 14px gap). Fixed upstream `app.css:533` has `body.window .row` with these values; it outranks `.row.pref` at 3176 because the selector has an additional type selector. Frozen R01 currently records only the latter's 50px / 8px / 14px. Do not change native CSS to force the incomplete rule to pass. Proposed clarification: document the window variant alongside the base recipe, pending supervisor ruling. Borders are **top** borders on adjacent rows, not bottom borders. Font controls resolve to width310, gap5px 6px, minmax100/72 columns, as specified; buttons have protocol styling, preview spans both columns. General page screenshot records Windows font stack, 110%, light, Chinese, 1364×941. User image3 is an old defect report, not a correct pixel gold.
- **S2 passed within its bounded state set.** Both UI/code font selectors open on first click; default styles disabled; family search initially focused; no-match query leaves only Refresh. Refresh closes with no added toast. Search Enter selects the first family. Selected family enables style; selected Regular and non-first Bold receive focus when opening style; Escape closes and returns to style button. Resize and reader scroll close the menu, while it stays within the frame. The initial 2660400 reproduction showed anchor focus plus menus surviving resize/scroll. Fix `f198b24` adds symmetric listener cleanup and selected-item initial focus, and restricts Home/End navigation to searchable family menus. Final 90099b9 repeats the focus/resize/reader-scroll cases; FontRow bytes are identical between f198b24 and 90099b9. The separate C1/C2 menu matrix remains pending.
- **S3 passed within the finite matrix.** English, zh, zh-TW, ja, de and System each selected; System resolved to zh-CN in this browser. Navigation and Settings heading followed the selection. At f198b24, German exposed an untranslated obsolete long-conversation key; 90099b9 uses the exact fixed `index.html:199` key, and final-language records confirm all five translations plus System. Four sizes100/110/125/150 selected on General; HTML zoom1/1.1/1.25/1.5, root bounds stay within viewport. At125%, Gateway and top navigation recorded with correct page identity and unchanged outer frame. Sizing evidence from f198b24 is reused: only that translation call changed in 90099b9; App/applyTheme/styles/font component are unchanged. No full language×size×page expansion.

## Identity and checks

`build-info.json` binds 90099b9, its source tree, version, probe hash and asset hashes. The source was compiled with existing root dependencies into an owned `.cache` snapshot; user4173/dist were not overwritten. Build/TypeScript and both guards pass. Candidate source lint was run with an explicit list of its50 TS/TSX files and the repository config:55 warnings,0 errors. Whole working-tree lint remains59 warnings,0 errors; neither count is a new all-project clean claim. Browser console errors: none captured. React review: no new dependencies, listeners exist only while a menu is open and are removed symmetrically; focus stays in the committed menu effect; selection remains React state. No backend/font enumeration.

The test-only preference fixture snapshots/restores exactly navLayout/lang/uiLocale/demoPrefs through visible buttons. Initial and final values were null on4174/4175/4176; task tabs closed, viewport reset. Direct close is not relied upon for restoration. Automatic approval review rejected the combined stop/restart4174 command with only “blocked by policy”; no process was stopped. Existing4174 stayed intact; own4175 and managed4176 previews were used instead. Their ownership/cleanup is tracked in execution status.

## Evidence index

- `reproduction.json`, `before-general.png`, `before-style-resize.png`:2660400 before fix.
- `menu-states.json`:f198b24 bounded font cases plus original records; each entry labels its source.
- `final-menu-states.json`:90099b9 focus/resize/reader-scroll regression.
- `languages.json`:initial f198b24 matrix, including obsolete English fallback.
- `final-languages.json`:90099b9 translation correction.
- `sizes.json`, `size-150.png`, `gateway-125.png`, `navigation-125.png`:f198b24 size matrix.
- `final-general-110.png`, `final-style-bold.png`, `final-appearance.json`:90099b9 final visible/control measurements; CSS values retained even where they contradict R01.
- `restored-4175.txt`, `restored-4176.txt`, `console-final.json`, `build-info.json`, `lint-summary.json`:identity, checks and restoration.

Raw task evidence remains `.cache/cis-settings-20261016/` (~1.3MiB before copies); no historical evidence removed. No original private browser screenshots are published here.
