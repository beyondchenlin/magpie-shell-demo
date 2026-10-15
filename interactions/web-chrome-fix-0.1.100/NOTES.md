# Web chrome verify · v0.1.100

Local `dist` via Playwright + system Chrome. `--zoom: 1.1`. Nest/routing not touched.

| viewport | body | root (visual getBoundingClientRect) | overflow |
|---|---|---|---|
| 752 Agents | web phone-web | x=24 w=704 | no |
| 752 Settings | web phone-web | x=24 w=704; brand "magpie" x≈38; labels 外观/文字大小 x≈57 | no |
| 900 Agents | web (top tabs) | x≈36 w≈827 | no |
| 1100 Agents | web side-nav | x=24 w=1052 | no |
| 1280 Agents | web side-nav | x=35 w=1210 | no |

Fix: `#root` width/height `min(…, calc((100vw|vh - 48px) / var(--zoom, 1.1)))`.
