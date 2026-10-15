# Tip changelog · 循环检测日志

每条 tip 必须有 **WHY**。动到壳 chrome 时再加 **CAUSE / WHAT kept / WHAT changed**。见 [`TIP-CYCLE.md`](./TIP-CYCLE.md)。

---

## v0.1.99 · CHROME_GOLD_RESTORE · 2026-10-15 Asia/Shanghai

- **WHY:** 外观回归审计：撤掉 v0.1.98 错误的 Web 侧栏门槛，恢复 Magpie 金标（窄/中宽 = 顶栏 tabs）。
- **CAUSE:** v0.1.98 加 `WEB_SIDE_AT=800`，把 ~900 宽 Vercel 预览强行改成侧栏；对照 nest `responsive/01–10` 与 CIS「`SIDE_AT=1024` 以下 = 顶栏」明显变差。
- **WHAT kept:** v0.1.91 起的 Web 框 **752×652** + text 110% zoom（nest 对齐）；Electron/`SIDE_AT=1024`；页内 routing feature 不动。
- **WHAT changed:** 删除 `WEB_SIDE_AT`；`wantSide` 只认 `SIDE_AT`；`shell-patch` side-nav 卡扩回 **≥1024** 媒体查询；落地正确的 TIP-CYCLE + chrome-guard。
- **Nest:** 无（纯 chrome；nest/consume 仍暂停）。

---

## v0.1.98 · WEB_SIDE_RESTORE · 2026-10-15 Asia/Shanghai

- **WHY:**（已证伪）以为 Vercel「侧栏没了」要降门槛。
- **CAUSE:** 误判 v0.1.91 的 752 框 + SIDE_AT=1024（其实是金标顶栏）。
- **Reverted in:** **v0.1.99**.

---

## v0.1.97 · ROUTING_COPY_SHARE_190_204 · 2026-10-15 Asia/Shanghai

- **WHY:** nest `routing/190–204` Copy to share / Import success / Select remove.
- **Chrome:** 无故意壳改动。
