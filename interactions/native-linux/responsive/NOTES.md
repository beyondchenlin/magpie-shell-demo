# Responsive / appearance (native Linux)

Reference shots for theme, fonts, selected chrome, and a narrower window. The nest window started and ended at **752×652 at +200+40** (id 85983247, pid 1871993). A second Magpie window is not available: a new launch hands over to this process. Narrow shots resized this window, then it was put back. `settings.json` `window` is still `[700, 600]`, `theme` system, `textSize` 110. `providers.json` is `{ "providers": [] }`. No setting was changed. Gateway take-over was not clicked.

Magpie's least size at text size 110% is **616** wide (`windowMinW` 560 CSS px × 1.10). A request for 390×652 was clamped to **616×652**. Phone width is not reachable without going under that minimum.

| shot | what |
|---|---|
| 01 | Settings → General at 752×652. Top tabs stay, none selected. Appearance **System** / Light / Dark. Colorblind **Off**. Language **System**. Text size **110%**. Interface font and Code font **System default**, preview `Aa 0123 · 中文`. Tray: **Open the quick panel**. |
| 02 | Agents selected (pill). |
| 03 | Library selected. |
| 04 | Providers selected. Empty catalog, **ADD YOUR FIRST PROVIDER**. |
| 05 | Routing selected, 752×652. Header ROUTING, live dot, Accounts hidden. Body is only "Another magpie serves the gateway; its routing plays live in that magpie's window." The live stage is in the other process. |
| 06 | Gateway selected. Older magpie 0.1.1240 serves the gateway. Take over was not clicked. |
| 07 | Usage selected. |
| 08 | Plugins selected (Built-in). |
| 09 | Routing again at **616×652**. Same "another magpie" line, wrapped. Tabs stay one row; the bird mark gives way to the side toggle. Routing pill selected. |
| 10 | Settings appearance at **616×652**. Same selected chrome as 01. Section nav wraps: GENERAL through PRIVACY, then SYNC AND BACKUP and ABOUT. |

## Left state

Providers tab, empty add sheet. Window **752×652 at +200+40**. Not quit.

## demo 对齐（responsive 01–10）· v0.1.91 APPEARANCE_TOPBAR_CLAMP
- Settings Appearance：System / text 110% / fonts System default / tray Open the quick panel；segs 选中白底+阴影。
- Top-bar 选中 pill：Agents…Plugins（02–08）。
- Routing 空网关文案 **Another magpie serves the gateway…**（05/09）；616 换行仍可读。
- Web 框 752×652；min CSS 560（110% 视约 616）；顶栏/Appearance 不破。
- 无 portable、无 Vercel。
