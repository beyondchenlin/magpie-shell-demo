# Tip cycle · 循环检测（consume 前必过）

**目的：** 每个 tip 只能 **改进 nest 切片**，不能 silently 冲掉壳 chrome。  
金标（CIS / SHELL-APPEARANCE-LOGIC）：**桌面默认 = 顶栏 tabs**（`SIDE_AT=1024` 以下）；宽窗 / 用户强制才侧栏。Web 框 **752×652** 对齐 nest responsive，不是把侧栏硬塞进窄窗。

**反面教材：**
- **v0.1.91** 把 Web `#root` 锁到 752×652（对齐 nest，**故意**）；窄/中宽仍顶栏 = 金标。
- **v0.1.98** 误加 `WEB_SIDE_AT=800`，在 ~900 宽强行侧栏 → 比 nest/Win-Mac 金标差。**v0.1.99 已撤。**

**硬规则：** 改 UI 的 tip / consume **必须**走完下面循环，再 `git push`。`npm run chrome-guard` 不过 = 不许 tip。

---

## 循环（每次 tip 一遍）

### 1. Why change?（为什么改）

一行：**本 tip 吃进哪条 nest 切片**（例如 `routing/190–204 Copy to share`）。

- 切片内的 DOM/文案/交互 → 可以改。
- **切片外**的壳 layout / nav / breakpoints / `#root` 画布 → **默认禁止**。若必须动，见 §2。

写入：`docs/TIP-CHANGELOG.md` 该版本的 **WHY**；并同步 `docs/last-cycle.md`。

### 2. Why delete/alter?（为什么删 / 扩）

禁止把 nest 回写 **扩成壳重构**。若 tip 必须动壳：

| 区域 | 默认 | 例外条件 |
|------|------|----------|
| `SIDE_AT`（金标 **1024**） | 不动 | nest NOTES 明文要求 native 断点 |
| `wantSide` / 顶栏↔侧栏门槛 | 不动 | 修复**已证明**的回归，且 changelog 写 CAUSE；**禁止**为「Vercel 看起来要侧栏」降门槛 |
| Web `#root` 752×652 框 | 不动 | nest responsive NOTES 明文改尺寸 |
| 侧栏 / 顶栏 `.on`（白卡 + `seg-edge`） | 不动 | 同上 |
| Routing / Agents / … 页内 | 可改 | 限本 tip nest 切片 |

例外必须写：**CAUSE / WHAT kept / WHAT changed**。没有这三行 = 不算合法 chrome 改动。

### 3. Did we regress?（有没有退步）

```bash
npm run chrome-guard
```

失败则停。通过后再 build / push。

**人工清单（对照 nest `responsive/01–10` + CIS）：**

- [ ] **~752 / ~900 宽：** 默认 **顶栏 tabs**（白 pill `.on`），**不是**自动侧栏；卡框不横向溢出 / 不裁右缘按钮
- [ ] **≥1024 宽：** 可侧栏；选中行白底 + `seg-edge`（非 accent）；110% 下卡仍完整入视口
- [ ] **~390 窄屏：** phoneWeb 顶栏 tabs，全幅（无卡框）
- [ ] 侧栏开关（`#sideToggle` / `magpie.navLayout`）仍可用
- [ ] 本 tip **没有**改无关页的壳 chrome

### 4. Ship

1. `npm run chrome-guard`
2. Bump `package.json`；`ACCEPTANCE.md` 顶条；`docs/TIP-CHANGELOG.md`；`docs/last-cycle.md`
3. Commit：`v0.1.xx: <slice> (no portable)` 或 chrome 修复说明
4. `git push origin main`（**不要**打 portable，除非用户明文要求）

---

## chrome-guard 管什么

见 `scripts/chrome-guard.mjs`：

1. `SIDE_AT === 1024`；**不得**存在 `WEB_SIDE_AT`（已证明会破坏金标）
2. `wantSide` 只用 `SIDE_AT`
3. App 仍渲染 `aside.sidebar` / `#side`
4. `app.css` 仍有 `body.side-nav … .on` + `seg-edge` / `--card`
5. `shell-patch`：非 side-nav 时 `#root` 仍有 **752** 框；`@media (min-width: 1024px)` 才扩 side-nav 卡
6. Web `#root` 宽高必须对 `--zoom` 敏感（`calc((100vw|vh - …) / var(--zoom, …))`），禁止再用裸 `100vw` 把 110% 卡撑出视口
