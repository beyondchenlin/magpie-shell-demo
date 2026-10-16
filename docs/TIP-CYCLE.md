# Tip cycle · 循环检测（consume 前必过）

**目的：** 每个 tip 只能 **改进 nest 切片**，不能 silently 冲掉壳 chrome。  
金标（CIS / SHELL-APPEARANCE-LOGIC + Magpie 开源）：**桌面默认 = Windows Magpie**（系统标题栏 + `html.win` Segoe；页内无 brand/winclose）+ **顶栏 tabs**（`SIDE_AT=1024` 以下）；宽窗 / 用户强制才侧栏。Web 紧凑框 **752×652** 对齐 nest responsive，宽视口框最大 **1100×720**；两者按视口选择，折叠导航不改变窗口尺寸。不以 Linux nest 截图当 Win 外观金标。

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
| Web `#root` 窗口尺寸契约 | 不动 | 用户 2026-10-16 明确要求 1:1：折叠时保持窗口大小；752×652 / 1100×720 只由视口选择，禁止由 `.side-nav` 选择 |
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

### 4. PR → 临时预览 → 查看验收

1. `npm run chrome-guard`
2. UI tip 更新 `package.json`、`ACCEPTANCE.md` 顶条、`docs/TIP-CHANGELOG.md`、`docs/last-cycle.md`；纯流程文档修改不虚增 UI 版本。
3. Commit：`v0.1.xx: <slice> (no portable)` 或对应文档修正说明。
4. 推送当前 tip 分支：`git push origin tip/0.1.121-cis-appearance-shell`，更新 [PR #1](https://github.com/beyondchenlin/magpie-shell-demo/pull/1) 的标题、范围与验证结果。后续若换 PR，以经确认的工作分支为准；不要直接推送或合并 `main`。
5. PR 更新后，同步该分支的临时预览；记录预览 URL、对应 commit SHA、UI 版本和检查结果。优先沿用已有分支预览；本机预览须注明仅本机可访问。
6. 打开预览查看受影响的切片与上述 chrome 清单。构建失败、部署限额或预览需登录时，明确说明实际状态；不得把旧预览称为当前版本。

**当前范围（2026-10-16 用户确认）：** 继续 Magpie 复刻，沉淀自有 CIS 与可复用组件，再开展其他产品功能。Appearance 交互金标沿用用户 Mac；没有新证据不编造点录。

**发布边界：** 仅更新工作分支与临时预览；不擅自发布生产环境、不强推 Vercel，不打 portable / exe。已有云预览不可用时，先提供标明版本的本机预览，不用升级套餐或反复部署绕过限额。

---

## chrome-guard 管什么

见 `scripts/chrome-guard.mjs`：

1. `SIDE_AT === 1024`；**不得**存在 `WEB_SIDE_AT`（已证明会破坏金标）
2. `wantSide` 只用 `SIDE_AT`
3. App 仍渲染 `aside.sidebar` / `#side`
4. `app.css` 仍有 `body.side-nav … .on` + `seg-edge` / `--card`
5. `shell-patch`：紧凑 `#root` 仍有 **752** 框；`@media (min-width: 1024px)` 才扩宽窗；`.side-nav #root` 不得覆盖宽高。浏览器还须验证折叠前后外框与标题栏矩形不变。
6. Web `#root` 宽高必须对 `--zoom` 敏感（`calc((100vw|vh - …) / var(--zoom, …))`），禁止再用裸 `100vw` 把 110% 卡撑出视口
