## v0.1.140 PROJECT_REMOVE_LIBKEEP_AGENTS_SMASK_OSS_FIDELITY
- Library project remove: drop invent ActionConfirm.extra / Tick.keep / Discard-on-cancel — restore Magpie confirmRemoveProject openLib `.editor.lib-editor` + `label.lib-pick.lib-keep` (plugins/library/client.js L3668–3703; library.css L345).
- Agents relocate: drop invent inline `ag-relocate` / ag-settings / ag-quiet bar — restore Magpie askRelocate `.modal.lib` > `.editor.sm-ask` (plugins/sessions/client.js L901–959; sessions.css sm-ask-*).
- shell-patch: drop invent `.action-confirm .extra` + `#view-agents .ag-relocate*`.
- SIDE_AT=1024. No portable / Vercel.

## v0.1.139 LIB_MODAL_EDITOR_AG_CONFIRM_OSS_FIDELITY
- Library sheets: drop invent `.dialog.lib-editor` (+ unused `.sm`) — restore Magpie openLib `.modal.lib` > `.dialog` > `.editor.lib-editor` (plugins/library/client.js L4944; app.js openModal L8062+; `.editor` app.css L2693–2706 / L2847).
- shell-patch: drop invent `.lib-confirm` (wrong line-height 1.5) — Magpie library.css L346; drop invent pill `button.lib-ag` — Magpie library.css L187–217.
- SIDE_AT=1024. No portable / Vercel.

## v0.1.138 USAGE_AGENT_ROW_MENU_HID_OSS_FIDELITY
- Usage Agents ⋯ menu: drop invent `proto-menu open` + `proto-item` — restore Magpie `openRowMenu` `.pop.row-menu` + `.rm-item` + EYE_OFF (app.js L3497–3518 / L17375–17379; app.css L694–704).
- Usage hidden block: restore Magpie `.us-hid` + `.list` (index.html usageAgentsHid; app.css L1065–1072).
- shell-patch: drop invent `.us-more-pop` + invent `#view-usage .us-hidline` geometry fighting Magpie L1067–1070.
- SIDE_AT=1024. No portable / Vercel.
