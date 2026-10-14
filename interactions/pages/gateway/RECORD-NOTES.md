# Gateway — recording notes (parent / next pass)

Executor could not drive the official Magpie browser for this page in this turn.
Parent (or a follow-up) should click through Magpie Gateway and fill `shots/CLICK-LOG.md` before implementing.

## Suggested click script (mirror Routing R-*)

1. **G-00** Open Gateway from sidebar (and from side-foot `#sideGw`). Capture empty/default card.
2. **G-01** Every header / toolbar button (Start / Stop / Restart / Copy address / Open / … — whatever Magpie shows).
3. **G-02** Address / port / bind fields: focus, edit, blur, Save if present.
4. **G-03** Status indicators / pills / logs: click each; note whether panels open.
5. **G-04** Any nested tabs or accordions on the page.
6. **G-05** Top-bar `#sync` while on Gateway — toast kind + copy (likely models: “Model lists refreshed”).
7. **G-06** Esc / Cancel / outside-click for any dialogs.

## Capture rules

- Before/after PNG per control under `interactions/pages/gateway/shots/`
- Log: selector, aria, title, toast text (zh + en), CSS duration if animated
- Source anchors: `app.js` gateway render + related CSS
- Do **not** invent Start/Stop if Magpie’s empty state differs — record first

## Demo status

Not started. Keep GatewayView as skeleton until CLICK-LOG exists.
