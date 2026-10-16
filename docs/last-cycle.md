# last-cycle
- tip: v0.1.192 NAV_MORPH_REFERENCE_TIMING
- WHY: 用户反馈侧栏切换卡顿、顶栏滑块错位，设置/网关控件不一致。
- WHAT changed: Magpie navMorph + layout-before-thumb；PrefPick 两种同源配方；字体恢复 grid；设置共用分区状态与标题栏搜索；ConnectionField + CopyButton。
- WHAT kept: SIDE_AT=1024; nest 752; skip oauth; Magpie .ag-install-* CSS already vendored
- Cite: Magpie 63be477 app.js L8524–8599 / L22691–22739 / L22925–23030；app.css L3176–3205；plugins/gateway/client.js L364–481。详见 docs/CIS-CONTROLS.md。
- Remaining invent (intentional skip): oauth; rt-flier-demo; win-caption; lib-hook*/pref-anchor
- Deferred: routing tip extras (GroupEditor rewrite); led-tools-extra
- Checks: chrome-guard/build pass；lint pass with repository warnings；九组导航坐标、设置分区、390px 网关/设置已浏览器检查，见 interactions/web-cis-0.1.191/NOTES.md。用户顺滑度验收仍待确认。
- Ship: 更新 PR#1 → 分支临时预览；不合并 main、不打 portable/exe、不强制生产部署。

- v0.1.192: 逐项核对参考后，将旧 500ms CSS 更新为 320ms / cubic-bezier(.42,0,.58,1)。Web 外框变尺寸仍是明确差异，见 docs/CIS-CONTROLS.md。
