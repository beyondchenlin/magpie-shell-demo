## v0.1.57 HOOKS_NEST_DONE
- Native `library/39–46` consumed: New hook → When menu → After a tool → For which tools (Any/Shell/File) → Shell pick → Cursor · afterShellExecution **Matcher** (`every tool`).
- Find an event: shared events **always** visible (Magpie `always:true`); Cursor events filter/scroll.
- Demo: event menu title; tool pick title tip; Cursor Matcher + For which tools chev (from 0.1.56) verified against shots.
- Still mock: hook Add persist / write-to-agent. Allowances **N/A**. Skip Vercel 402.

## v0.1.56 EACH_MODEL_DONE + HOOKS_NEST_PARTIAL + DETAIL_INSTALL
- **System One Each (NOTES 07):** decide path warn `A decision API is asked with one model…` kept; Each no longer folds tryModel into picks (Magpie `picked()`); model ids split on `,`/`\n` only (#1976).
- **Each-picked grid (source):** with URL+key+Models picks → Magpie `detect-grid` (Model × API cells) + API `.ep` rows + Use these / truncated hint (shell mock; no real probe).
- **Hooks nest (source, no library/39+ yet):** Cursor-own event → free-text **Matcher** (`every tool` / agent matcher hint); After/Before tool → **For which tools** menu + chevron (NOTES said matcher never opened).
- **Plugins detail Install path (source-clear):** `pm-dhead` / `pm-dact` / `pm-dbody` / `pm-links` (npm·GitHub/Source); Install `stopPropagation` → Getting Bun… → Installed in-modal (same `install`/`installAct` as card). Escape still does not close.
- No library/39+ on disk. Still mock: true detect/list HTTP, OAuth, hook write. Allowances **N/A**. Skip Vercel 402.

## v0.1.55 FETCH_MODELS_DONE
- Native `providers/54–60` consumed: Custom Models+Fetch only (Gemini sheet has no Fetch); idle Optional hint (54); hover title (55); empty URL → amber lift toast **Type the base URL first** (56, URL not key); `http://127.0.0.1:9/v1` → red `no model list: Get "…/models": dial tcp … refused — type its model ids…` no chips (57–58); Discard (59); catalog foot Custom focused (60).
- Field order chip: Context window → Max output → Compact at → Models (Magpie add form).
- Still mock: true list HTTP / Add persist / OAuth. Allowances **N/A**. Skip Vercel 402.

## v0.1.54 IMPORT_CLAUDE_DONE
- Chip Import Claude / file sheets from Magpie source + native NOTES **20–24** (Fetch models 54+ not on disk yet → PARTIAL wait).
- **Import from other apps (20–21):** paths `~/.config/alma/chat_threads.db` · `~/.cc-switch/cc-switch.db` · `~/.claude/settings.json` · `~/.codex/config.toml`; tabs all **Not found on this computer** / count `–` / Import disabled; copy via `t()`; Import… tooltip **Bring over providers set up in other apps**.
- **Claude risk → Import (22–23):** already Magpie `importSay` + risk note; Escape does **not** dismiss import sheet (Cancel only).
- **Choose files GTK (24):** Select Files title; sidebar Recent · Home · Desktop · settings · + Other Locations; empty folder; Cancel / Open disabled; demo sample link only (no real file). Magpie itself uses OS `<input type=file>`.
- Still mock: true file read / Import persist / OAuth. Allowances quota **N/A**. Skip Vercel 402. **FETCH_MODELS:** waiting native providers/54+.

## v0.1.53 DETECT_APIS_DONE
- Native `providers/44–53` consumed: Detect hover long title (44); empty click amber **Type the base URL first** under button (45); URL type keeps amber (46); Asking each API… (47/49); no-model four rows + keyless none (48); model `demo` → dial tcp refused truncated + hover full (50–51); dirty Discard (52); catalog foot Custom only (53).
- Also: Custom More endpoints + Web search; vendor Endpoints Test shell (from Magpie source).
- No Use these when none answer. Still mock: true HTTP probe / Add persist / OAuth. Allowances **N/A**. Skip Vercel 402.

## v0.1.52 DETECT_FETCH_DONE
- Custom **Detect APIs** shell states from Magpie `detectAPIs` + NOTES 06/07: empty URL → `detect-say warn` "Type the base URL first"; System One Each → decision warn; no picks → Pick models first; busy "Asking each API…"; keyless → None answered (paste key); with key → mock `.ep` rows + **Use these** → Taken · save to keep (no real probe).
- Custom **Models** + **Fetch models** (`addFormModels`): no URL → err; busy "Asking the vendor…"; mock chip list + Pick all/none / `{n} of {all}` (nothing saved).
- KindLocal Headers: `+ Add header` as `.text` (shot 35: no empty row) — already no empty row for non-custom.
- Gateway status modes: `?gw=off|older` / `localStorage magpie.demoGw` → not running · Start / take-over Quit magpie {v} copy (shell only).
- Still mock: true detect/list HTTP, Add/Save persist, OAuth/keys. Allowances quota **N/A**. Skip Vercel 402.

## v0.1.51 PROVIDERS_LOCAL_DONE
- Native `providers/35–43` consumed: Ollama nest (address / scroll / Key header / User-Agent / Redaction / Context·Max·Compact) + oMLX / LM Studio / MLX-Serve editors.
- Demo KindLocal: User-Agent tick, Compact at chips, richer Context/Max placeholders; Redaction after UA (Magpie order); MLX-Serve site host `github.com`.
- Custom chip remains from v0.1.50. Still mock: true local probe / Add persist / OAuth. Allowances quota **N/A**. Skip Vercel 402.

## v0.1.50 PROVIDERS_CUSTOM_DONE
- Custom provider sheet (NOTES **03–18** + Magpie `app.js`): protocol segs use **title tooltips** (API_HINTS); URL placeholder per proto (`https://…` / `…/v1beta` / `…/v1`); Extra body **empty + placeholder** (not prefilled); Headers **Edit as JSON** ↔ Collapse + custom hint; Key header when custom Anthropic.
- On-this-machine editors → consumed in **v0.1.51** (35–43).
- Still mock: Detect APIs probe, favicon fetch, Choose a picture GTK, Add/Save persist, OAuth/keys. Allowances quota **N/A**. Skip Vercel 402.

## v0.1.49 PLUGINS_OFF_DONE
- Native `plugins/41–54` consumed: Switch off → Off/Switch on; Sign in + not-signed-in (mock); Remove tip/confirm (Cancel focused)/Cancel keep; Check tip → Checking… → Up to date chip + toast; Removing… → removed toast → empty Installed (no Check footer).
- Still mock: true npm off/remove/update, plugin OAuth. Allowances quota **N/A**. Skip Vercel 402.

## v0.1.48 PLUGINS_OFF_DONE
- Native `plugins/41–46`: Switch off (no confirm when no moved) → sub **Off** + Switch on; Switch on restores **{name}: not signed in** + purple Sign in; Provider chip stays while Off; Remove tip + `confirmRemoval` Cancel (45–46).
- Check for updates nest shot still pending recorder — busy **Checking…** + toast `Every plugin is up to date` already from Magpie source (v0.1.46).
- Still mock: true npm off/remove/update, plugin OAuth Sign in. Allowances quota **N/A**. Skip Vercel 402.

## v0.1.47 PROVIDERS_LOCAL_PARTIAL
- Magpie `KindLocal` editors (NOTES: Ollama/LM Studio/oMLX/MLX-Serve tiles on 33, editors never opened — chip from `presets.go` + `app.js`): all four open **local** form.
- **Server address** fold (Address + Magpie listen hint) with per-preset defaults `11434` / `1234` / `8000` / `11234`; dirty when address ≠ default.
- API key placeholder **optional for local servers**; no Get a key ↗; **Redaction** · Send requests unmasked (LAN tick from Magpie).
- Sheet: **On this machine** / **Another computer's magpie** titles; Remote Endpoint hint = Magpie `EndpointHint` (shot 34).
- Custom / vendor editors unchanged (03–18 / 26–32 already nested).
- Plugins **41+** (Switch off / Remove / Check updates nest) **not on disk yet** — Switch off·Remove·Check already source-aligned in v0.1.46; consume frames when recorder lands → v0.1.48.
- Still mock: true local probe / OAuth / key persist. Allowances quota **N/A**. Skip Vercel 402.

## v0.1.46 PLUGINS_REMOVE_CONFIRM
- Magpie `confirmRemoval` for Installed **Remove** when no moved accounts: dialog `Remove {name}?` + consequence + Cancel / danger Remove; toast `{name} removed`.
- **Check for updates** → Checking… → toast `Every plugin is up to date` (demo mock; no npm).
- Switch off / Remove with moved still in-row ask (shot 40 didn't click; nest pending recorder).
- Allowances quota **N/A**. Skip Vercel 402.

## v0.1.45 PLUGINS_INSTALL
- Native `plugins/35–40` + NOTES: per-card Install on Suggested (OpenCode Zen Free).
- Pale Install → hover solid indigo/white; busy **Getting Bun…** (widened gray + spinner; no Installing…); green check **Installed**; stay on Discover; tab **Installed · 1**; toast `{name} is installed`.
- Installed row (shot 40): icon · name · v0.1.1 · Provider kind chip · Switch off · Remove; footer Bun **1.4.2** + Check for updates (not clicked).
- Still mock: true Bun download / npm install. Confirm removal → **v0.1.46**. Switch-off·Remove-with-moved nest still pending recorder.
- Allowances quota body: **N/A** (unchanged). Skip Vercel 402.

## v0.1.44 MOTION_GAP
- Diff Magpie CSS/JS transition tokens vs demo: Magpie-only keyframes were `pm-pulse`, `lib-bob`, `lib-rise`, `lib-skel-in`/`lib-skel-shift`, `mk-spin`, `lib-health-pulse` — now ported into `shell-patch.css`.
- Wired: Plugins askNPM **ghost** cards (6 pre-debounce · 2 On-npm while `hits.loading`) + detail **pm-rskel** README pulse; Library Find skills **lib-bob** + probe **lib-probe** / content-in.
- Shared control motions already matched (view-in, segs 280ms, folds, menus pop-in, toasts `.status`, modal, rtflap, agent-fold, theming) — no invent UI.
- Plugins Install still **not** auto-clicked (NOTES: leave for recorder).
- **GAP honesty:** tray Routing nested + `#sideEdge` closed since **v0.1.36** (stale PARTIAL lines retired). True remaining **P1**: live gateway bird (#7), true OAuth/provider persist (#9), Allowances quota body (N/A until signed-in capture).

## v0.1.43 AGENTS_MOTION
- Native Agents **01–18** empty path: default list **Cursor only** (Can't connect); Manage Select unconnected = Magpie `!onMagpie` (checks Cursor); guide `{n} of {m} done`.
- Connect / stale / ModelPop / Not set up fold: gated `?demoAgents=1` or `localStorage magpie.demoAgents=1` — Show more · agent-fold spring · Connect from fold.
- Motion chips: `.guide-x` .12s; agent-fold / agent-more / install chev reduced-motion; `#providers.sorting` sibling slide + reduce.
- Providers: arrange drag / true OAuth / key save still **mock** (NOTES incomplete by design — no sign-in/key typed).
- Allowances quota body still **N/A**.

## v0.1.42 ROUTING_NEST
- Native routing **02–30** fidelity close-out: templates disabled **Add a provider first** (shots 23–24) unless `magpie.demoProviders=1`; Accounts hidden default (28–30); Import paste disabled until text (25–27). Editor nest already in v0.1.29–30.
- Still mock: live gateway history / day pills / Replay; true Find-groups write; OS providers for template Add.

## v0.1.41 FONTS_MENU + MOTION
## v0.1.41 FONTS_MENU + MOTION
- Interface / Code font: Magpie `renderFonts` menus — System default · demo catalogue · Search fonts… · Refresh fonts; style pick disabled until family chosen; preview `Aa 0123 · 中文`; `applyDemoFonts` → `--ui-*` / `--code-*` + `data-fonts`.
- Appearance: Magpie `html.theming` crossfade **.35s** / clear **450ms** (NOTES 30fps missed it; Magpie source keeps theming).
- Still mock: true desktop font enumeration (OS API); catalogue is demo list.
- Allowances quota body still **N/A**.

## v0.1.40 SETTINGS_NEST
- Native `settings/10–70` + NOTES consumed into `SettingsView` / NestedBlocks (frames stop at 70; no 71–85 on disk).
- **Allowances:** TrayUsage pick Off/Today/7d; Menu bar refresh **1/3/5/10/30** (was wrong 15); pace nested when tray on; Linux hides Menu bar logos/bird (Mac-only in Magpie); Allowance display Used/Left; reads Automatic/When I ask; Currency USD/CNY; **Allowance alert** = number field % + Off/On (shots 29–30, editable e.g. 81); **Low balance** = amount field + Off/On (shots 32–33); reset 12/24/48 h; task done 1/3/10 min; warm-up / auto-reset structure. **Quota body cards still N/A** — not invented.
- **Network:** Proxy Auto/Off/Custom + Test; GitHub token Create one ↗ + Save (placeholder ghp_/github_pat_); Gateway port Apply; bare ids; LAN Share + Address OpenAI/Anthropic + Allowed + Web pages (stays when Share Off).
- **Models / Privacy / Sync / About:** deep controls from prior + About Version Check/ready mock; Sync Set up / Export / Import copy includes agents' models + library.
- **Observability (OTel):** tab **hidden** by default (`magpie.feature.otel=1` to show) — matches native tab row.
- Still mock: true OAuth / github-token API / port Apply restart / sync bytes / update install / Allowances with live quotas.

## v0.1.39 SETTINGS_NEST_PARTIAL
- Native settings General (NOTES + shots 01–09 path): Provider in model names = Off / Not on names I set / On; Text size Magpie tip + status; Interface font / Code font System-default shell (font menus still mock); Lightweight / Prevent sleep copy.
- Remaining settings 10–85 (Allowances deep, Network, Models, Privacy nest already partial, Sync, About): continue next bumps.
- Allowances quota body still **N/A**.

## v0.1.38 PLUGINS_NEST
- Native `plugins/01–34` + NOTES consumed into `PluginsView`.
- Discover intro (Subscriptions and gateway middleware + trust + pm-art), market sections (Subscriptions / Gateway middleware / Agents / Unofficial on GitHub), Suggested + On npm search (debounce 350ms), Mirrors tip, manual row + folder picker Cancel leaves field, Built-in copy from builtins.test.cjs + Recent calls enum, Installed empty (shot 18) + Discover plugins.
- Detail: Version/Stars/License/Updated facts + unofficial warn; Escape does not close.
- Still mock: true npm/git install, `plugins/choose` OS picker bytes, live listings/search API, Bun runtime.
- Allowances quota UI: **N/A** (unchanged).

## v0.1.37 USAGE_NEST
- Native `usage/01–50` consumed: calendar nest, refresh menu ticks, empty Overview/Requests/Sessions/Context copy & controls from NOTES.
- Allowances quota body: **N/A** (no native shots with quotas) — not invented.
- Still mock: true ledger/API refresh, CSV export bytes, session file scan, context tune scoring, filled-data toggle.

## v0.1.36 also GATEWAY_NATIVE (01–26 empty path)
- Native `interactions/native-linux/gateway/01–26` consumed against `GatewayView`: default empty catalog matches shots; System One `provider/jev_latest`; Restart busy copy; folds/copy/API segs already from earlier passes.
- Still mock: real `POST gateway/restart`, LAN key mint, non-running / take-over states.

## v0.1.36 TRAY_CONSUME
- Consumed **all** native tray frames **01–14** into `TrayPanel` (`?panel=1`).
- Routing **07**: green `rt-livedot` + today 0 calls · 0 tokens + Open Routing + gateway-not-running empty copy.
- Agents nested **08–10, 14**: row-spring open · ModelPop Default/auto · Profiles empty popover · handle tip path.
- Usage **02–06**: period empty copy (today vs here) + Refresh now tip title.
- Tips **11–13**: sync / open-as-window / Settings (Ctrl+,) titles.
- **Allowances:** documented **N/A** (Magpie hides entire tab with no subscription/balance) — not a missing control.
- Bird: logo wag parts + `.9s` flap; Routing demo flier uses Magpie FLIER paths + `rtflap .42s` (still mock hops, not live gateway).
- `#sideEdge` drag width (SIDE_MIN 168 · SIDE_MAX 320 · `magpie.sideWidth`) — GAP #11 closed for demo.
- Still open: true gateway bird / OAuth / Allowances body when quotas exist (needs signed-in native capture).

## v0.1.35 TRAY_USAGE_EMPTY
- Consumed tray/02-usage-today: panel Usage (stats) empty — period segs + Open Usage + pu-none
- Still PARTIAL: tray Routing nested; Allowances with quotas; Bird gateway (P1)

## v0.1.34 GAP_CHIP_PARTIAL → PROVIDERS_LIST + TRAY_AGENTS
- **#9 Provider list-with-accounts (P1):** Magpie row = pv-handle · who(signed in · N models) · uses · key.acct/on · lib-switch.pswitch · chev; click → modal `.accts`/`.acc` (dot tick · plan · using · Remove · Add); Turned off fold + off list. Motion: `.provider` bg **.16s**; chev **.15s**; switch thumb **.18s**; modal pop-in **.42s**; `.acc .text.quiet` opacity **.15s**; `.acc.new` sub-in.
- **Tray panel Agents (native tray/01):** `?panel=1` / `#panel` → `body.panel` + ptabs (Allowances hidden when no quotas) + Cursor row ag-sum (default · eff bars · chev spring) + Profiles / Open magpie / Quit. Nested open uses `.ag-open` row-spring **.48s**.
- Still PARTIAL: tray Usage/Routing nested shots (only 01 landed); Bird rt-sky real gateway (P1); true OAuth/provider save; `#sideEdge` drag (P2).

## v0.1.33 LIBRARY_DONE
- Native library **01–13, 15–38** fully captured & consumed (no 14)
- Instructions / MCP New+Discover+Image / Skills probe+Discover / Hooks events+Cursor own / RTK off+install.sh
- Remaining intentional mocks: true probe API, OAuth, RTK binary, agent file writes

## v0.1.33
- Library native **29–33** consumed: probe list/Filter/Install 0; Discover 8 cards; Hooks 32–33
- Still mock: true `library/skills/probe`, skills.sh API, RTK binary, hook write-to-agent

## v0.1.32
- **LIBRARY_SKILLS_PARTIAL**: MCP New server 15–21 + Magpie Image sheet; Skills Find/Install mock; Hooks empty+editor; RTK install mock + switches
- Rules members dragRows (shared `src/lib/dragRows.ts`) — sibling slide .22s cubic-bezier(.22,1,.36,1)
- Chip: Agents Arrange already had dragRows; members now match

## v0.1.31
- **RULES_EFFORT**: GroupEditor Rules deep conditions + Effort classifier + By-weight in-place (no weight-drag in Magpie) + mock Save/Import/template Add
- Library native 01–03 → LibraryView (Plugins › Library feature)

## v0.1.28
- Routing native **01-empty-live** consumed: header New group, Routing groups foot (Import / found switch / names segs / empty copy)
- Continues ANTIGRAVITY_ROUTING_PARTIAL → closer on Routing empty
- Native routing shots **02–18** landed (New group editor nested); next consume

## v0.1.27
- Providers **Antigravity** independent risk card (Google riskNote) → Sign in anyway (mock waiting) / Import instead… (Cockpit·Manager·CLIProxyAPI copy + Google check) — from Magpie `SUBS`/`renderSigning`/`importSay`
- Copilot **Proxy** uses Magpie `openProtoMenu` / `signInProxyChoices` via `ProtoMultiMenu` (Global / Direct / Custom… + `proxy-ask` form); no more cycle-toggle
- Routing `interactions/native-linux/routing/` still empty (poll continues)

## v0.1.26
- Providers Copilot device-code card (mock) + GHE form
- Vendors pairTile (Kimi dual preset tip) closer to Magpie
- Routing native-linux folder still empty (watch)

## v0.1.25
## v0.1.24
- Providers Claude risk/import nested 22–24
- Agents Arrange sibling slide (dragRows)
- Privacy micro-pass + Plugins Install spin

# Magpie 壳 vs magpie-shell-demo 差距矩阵（重写后）

对照：官方截图 `magpie-official/shots/` + `MAGPIE-TEARDOWN.md` + 本仓库 `src/`（v0.1.1 空态重写）。

等级：**P0** 一眼不像 · **P1** 明显偏离 · **P2** 有意 Demo 简化

| # | Magpie 事实 | demo | 等级 | 说明 |
|---|-------------|------|------|------|
| 1 | 侧栏无 Sessions/Library（`data-feature` 插件默认关） | **已改**：NAV 仅 Agent + Models/Insights/Extend | — | 纠正先前错误 IA |
| 2 | Agents 空态：Get started + Cursor 不能接入 | **已改**：`.guide` + Cursor `ag-cant` | — | 对齐 `01-agents.png` |
| 3 | Providers 空态：首供货商分区网格 | **已改**：`.sheet` tiles from presets | P2 | preset 子集/无编辑器 |
| 4 | Routing 空态：等待请求三列舞台 | **已改**：idle 舞台 + 0 统计 | — | 对齐 `03-routing.png` |
| 5 | Brand 在 `.side-top`；无 DEMO 徽章 | **已改** | — | |
| 6 | Web 预览 660×600（非 1100×760） | **已改**；侧栏 absolute 于 `#root` | — | |
| 7 | `.rt-sky` 飞鸟依赖 gateway trace | mock「演示飞鸟」+ FLIER/`rtflap .42s` | **P1** | 动效对齐；真 gateway hop 仍缺 |
| 8 | 账号行 `.dot`/`.bar` 在有请求时 | 空态为 `li.idle` | — | 空态正确 |
| 9 | Provider 完整行控件 | **v0.1.34** 有账号列表行+accts 编辑器 | **P1** | 真 key/OAuth/arrange 落盘仍 mock（NOTES 未点） |
| 10 | Gateway 空态壳+主交互 | **v0.1.9**；filled demo **v0.1.12** | P1 | Gateway 仍可再抠 |
| 14 | Settings 全 tab 深页 | Settings **v0.1.41** fonts menus + nest 10–70 | P1 | 真 OS 字体枚举/真 Apply/OTel/有配额 Allowances 仍 mock |
| 11 | `#sideEdge` 拖宽 | **v0.1.36** sideDrag · **CLOSED** | — | localStorage `magpie.sideWidth` |
| 12 | 业务后端 / 真网关 | 无 | P2 | 范围外 |
| 13 | 先前 PASS_WITH_GAPS | **已撤销**；现以截图空态对齐为准 | — | |
| 15 | Antigravity risk/import | **v0.1.27** 独立卡（非 Claude 共用） | — | Sign in anyway = mock waiting；无真 Google OAuth |
| 16 | Copilot Proxy proto-menu | **v0.1.27** ProtoMultiMenu + Custom… form | — | 对齐 `signInProxyLink`/`signInProxyChoices` |

## 仍开放的有意差距（诚实 P1 only）

| # | 项 | 等级 | 说明 |
|---|-----|------|------|
| 7 | 真网关飞鸟 | **P1** | FLIER/`rtflap .42s` 已对齐；hop 仍 mock，非 live gateway trace |
| 9 | 真 OAuth / key 落盘 / arrange persist | **P1** | 列表+accts 壳已在；NOTES 未点 Sign-in/key |
| — | Allowances 配额正文 | **P1 / N/A** | 无订阅时整段隐藏属原生；有配额 UI 需 signed-in 点录，**不编造** |

**已关闭（勿再标 PARTIAL）：** Tray Routing 嵌套（v0.1.36）· `#sideEdge` 拖宽（v0.1.36）· Tray 01–14 · Usage 01–50 · Plugins 01–34 · Settings 10–70 · Agents empty motion（v0.1.43）· 控件动效 token 对齐（v0.1.44，Install 点击仍留给 recorder）。

有意 Demo 简化（非 P1）：无真后端；Electron 标题栏；Usage filled 演示开关；OS 字体枚举 mock；OTel 默认隐藏。

*Sessions / Library 不是顶栏缺口：官方默认不展示。*
