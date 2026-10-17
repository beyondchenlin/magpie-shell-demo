# S4 / B3 / B4 bounded verification

Final UI source: `a8976e0db339d520a290cbdd548c290be760797b`, package `0.1.204`, own preview `http://127.0.0.1:4176`, Windows / Codex in-app Chromium. Frozen scope is `028dab55a3877656c115439835d1d0d14465e4ee`; fixed native assets remain `yetone/magpie@63be47717a9ca91fc89102078a1f1fff3e03e0ce`. This is source/browser verification, not a paired native Windows pixel comparison or cloud deployment verification.

## Capture identity and reuse

Read [capture-bindings.json](capture-bindings.json) before interpreting observations. S4's original 13-element array has no embedded SHA. It is bound to `1100d15` by the continuous collection interval, preceding observed source, immutable build manifest and preview-switch history; it is not relabelled as a later capture. Its exact per-case viewport was not independently stored. All six recorded defaults contain `disabled: []`.

The five fixed-operation PrefRow nodes and complete SyncForms function are byte-identical between S4's source and final. SettingsView's only later change is an unrelated full native search-provider description key. [reuse-certificate.json](reuse-certificate.json) records exact AST node text hashes, source lines and Git blobs. It also proves the six unaffected Settings branches and Library Hooks render branch unchanged for B4 reuse.

Canonical B4 has **76** records: **16 actually observed on a8976e0**, **8 on 8431291**, and **52 on f896ebd**. Every record retains its source, environment, DOM/AX data and original PNG. Only LibraryView and SettingsView differ from f896 to final; changed default branches were re-observed. There is no claim that 76 captures all came from final. The later final-candidate main flow is a separate delivery check.

## Findings and corrections

- B3 baseline: missing mono icon stayed an empty mask; `file:` icon was incorrectly mapped beneath `/icons/`. bb1a250 restored native one-time mask probing, image handling and cube fallback. Valid/missing SVG, PNG and file fixtures were checked in explicit light/dark entries; no real service API was called.
- B3 baseline: specialized Library and Settings protocol menus had independent incomplete keyboard/lifecycle handling. They now use `useProtocolMenu` (six calls, seven content purposes; MCP editor and selection bar share one controller). LAN's missing Down navigation was independently reproduced on bb1a250 and corrected/retested on f896ebd. Existing ProtoMultiMenu and row-menu controller were retained.
- Removed the unsupported generic `.lib-switch:disabled { opacity: .5 }` override. Native concrete disabled variants retain their own rules. rt-gon/rt-mon retain `.85` compound scale; smaller credits/reset/archive/tool/mirror variants retain native sizes.
- B4 source comparison found two bare OS search fields in MCP/Skills Discover; 8431291 restored native `.mk-find`, icon/input/spinner structure. Search and Escape clear were verified.
- B4 source comparison found incorrect default Instructions/MCP/Skills markup/copy and a truncated Models search-provider description key. a8976e0 restores fixed-source default branches and existing translations. 54690da failed TypeScript because of an obsolete unused lookup; it was never served or claimed as a tested UI candidate.
- Eight original Route/Gateway captures were taken during the native `.24s` view-in. Their original frames remain; bounded read-only polling of actual opacity/transform produced stable replacement frames. Product animation CSS was not changed. Retake history has 32 captures because eight Library records were corrected twice; this does not add acceptance items.

## R01–R15 trace

All current calls and attributes: [component-call-sites.json](../../docs/cis/component-call-sites.json), candidate a8976e0, 473 calls in 21 files. All 34 raw candidates have individual purpose, rules, source blob and evidence in [raw-recipe-classification.json](raw-recipe-classification.json); unknown count is zero. Counts are coverage indexes, not acceptance counts. Frozen rule values and native line references remain in [CIS-CONTROLS](../../docs/CIS-CONTROLS.md).

| Rule | Implementation / native recipe | Browser evidence |
| --- | --- | --- |
| R01 | PrefRow; window/font/phone variants; native composite rows classified separately | controls-after PrefRow styles; cis-settings-90099b9 and cis-layout-0a2a014; B4 defaults |
| R02 | Segs/useSegThumb plus native compound segs; fold-height comparison retained | cis-nav-2660400 offsets/identity; cis-layout-0a2a014 wrapping/12 regression toggles; page matrix |
| R03 | TextBtn/icon native classes, busy/disabled props | controls-after text styles/default/hover/active/busy. Active sample is mid-transition transform .983177; source target .96 is not falsely claimed as measured settled value |
| R04 | WordsField; native .set-field invalid is distinct from generic words | controls-after normal/focus/invalid/disabled computed styles; P1 form evidence |
| R05 | LibSwitch and native archive/mirror/Only/group compounds | explicit light/dark off/on, base and seven concrete contexts, credits disabled .6/base1; compound wrappers retained |
| R06 | Tick; native checkbox CSS; Gateway .dot.tick is separate radio purpose | unchecked/checked/mixed/disabled, keyboard focus-visible 2px/offset1; C3 disabled accept |
| R07 | PrefPick language and native FontRow recipe | cis-settings-90099b9; cis-menus-862789f; selected focus/styles/empty query/Escape |
| R08 | FieldPill native desktop/panel variants | cis-menus-862789f model anchors and C1 390/1364; Tray full matrix remains outside frozen R08 scope |
| R09 | Fold/FoldChev retain native empty-model vs filled behavior | cis-gateway-874268b and cis-layout-0a2a014; P1 provider fold |
| R10 | StatusToast/App showStatus; native timing, explicit ms and replacement timer clearing | controls-after computed styles; toast-runtime final source observations; G3 explicit copy/reset. Browser backend caps selector waits around 3s: ordinary and error eventual-empty checks are bounds, not exact 3500/8000ms measurements. Exact scheduling/clearTimeout is source-verified |
| R11 | ActionConfirm native dialog plus framed-Web compatibility | cis-confirm-before-396c11c and cis-confirm-7880135, two entrances/focus/Tab/Escape/backdrop drag/disabled/three widths |
| R12 | ModelPop/AgentModelsPop immediate interactive close + inert ghost | cis-menus-faea794/d1f3e03/862789f/396c11c, full variants and model management |
| R13 | ProtoMultiMenu/useProtocolMenu/useRowMenu; date/font retain specialized controllers | controls-after seven specialized contents; original deferred/live/NUL/clear fixture and six-family C2 evidence in cis-menus-862789f |
| R14 | CopyButton and clipboard fallback helper | cis-gateway-874268b actual four clipboard texts, repeat/reset/unmount and controlled double failure; no real key used |
| R15 | MagpieIcon/native resources/PluginLogo glyphs | b3-before and explicit light/dark icons in controls-after; icons-before/after PNGs; P4 native plugin glyphs |

## Results and limits

S4's six fixed operations and restoration pass. B3's classified recipes and finite variants pass after reproduced fixes. B4's 19 states × four configurations pass the fixed source/layout and overflow scope: no broken images, document/view uncontained horizontal overflow or invalid interactive nesting. All 24 contact sheets were visually inspected, including the final four affected-state sheets. Source comparison, not a native Windows screenshot gold, supports copy and layout conclusions.

Saved setup feedback in Library captures is from explicitly enabling the mock Builtin feature; it is not asserted as the default idle footer. Immediate resize/wheel menu counts preceding native event delivery and successful checkbox-selection/changed-label locator timeouts remain in raw evidence; settled observations distinguish them from product failures. The earlier fixture with no explicit theme follows OS dark and is not used as light-theme evidence.

`preferences-final.json` proves exact restoration of 39 named task-origin keys; viewport override was reset. No real API/OAuth, plugin executable, command, export passphrase or font enumeration was used. Original asset hashes were preserved when adding test-only component entry pages. Public evidence is approximately 36.3 MiB total across CIS batches, within the 40 MiB plan; logical file size is not a physical allocation measurement. No pre-existing evidence was removed.

Remote synchronization and cloud preview identity remain externally blocked; last confirmed push is e19fd5a. N3 independent dynamic review and D4 user visual acceptance remain separate pending items. Passing this batch does not mean all 29 are complete.
