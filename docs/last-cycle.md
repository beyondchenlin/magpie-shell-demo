# last-cycle · 2026-10-15 Asia/Shanghai

## v0.1.143 · AGENTS_NATIVE_WHATSNEW_OSS_FIDELITY · 2026-10-15 Asia/Shanghai

- **WHY:** Continue Magpie 1:1 after 0.1.142 — delete tip invent Agents Cursor native-only chrome + Settings What's new badge/body that covered Magpie OSS.
- **CAUSE:** Demo painted Cursor "Only Cursor's own models" as invent `ag-native-note` with square `.sq` chips instead of Magpie `connectLine("no")` `.ag-st`/`.ag-dot`/`.ag-st-t`; What's new used invent `whatsnew-body` padding + invent uppercase `wn-badge` / muted `wn-ref` instead of Magpie `span.badge` "Not installed yet" + `a.wn-link`. Dead shell-patch still owned invent `.ag-tick` / `.ag-json-preview` / `.mt6`/`.mt2` / `.ag-exp.enter`.
- **WHAT kept:** SIDE_AT=1024; nest 752×652; Routing empty/gsel (0.1.142); CIS PrefRow/Segs/TextBtn; Magpie `.ag-st.on`/`.wait` paths for wired agents.
- **Cite:**
  - Magpie `app.js` **1107** `NATIVE_ONLY.cursor`; **1234–1240** `connectLine` kind `"no"` → `.ag-st` + `.ag-dot` + `.ag-st-t`
  - Magpie `app.css` **3762–3765** `.ag-st` / `.ag-dot`
  - Magpie `app.js` **4144–4152** `showWhatsNew` / pending `span.badge` `Not installed yet`; **4240–4246** `noteLink` → `a.wn-link`; ISSUES L4076
  - Magpie `app.css` **3279** `.modal .editor.whatsnew > .ebody`; **3268+** `.editor.framed`
- **WHAT changed:** `AgentsView.tsx` native line → Magpie ag-st; `NestedBlocks.tsx` WhatsNew → Magpie badge/wn-link/ebody; `shell-patch.css` + `app.css` drop invents above.
- **chrome-guard:** pass. Push/PR #1. No portable/Vercel.
