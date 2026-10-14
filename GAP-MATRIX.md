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
| 7 | `.rt-sky` 飞鸟依赖 gateway trace | mock「演示飞鸟」可选 | P1 | 默认空态无飞；非官方拍翅 timing |
| 8 | 账号行 `.dot`/`.bar` 在有请求时 | 空态为 `li.idle` | — | 空态正确 |
| 9 | Provider 完整行控件 | **v0.1.34** 有账号列表行+accts 编辑器 | P1 | 真 key/OAuth/arrange 落盘仍 mock |
| 10 | Gateway 空态壳+主交互 | **v0.1.9**；filled demo **v0.1.12** | P1 | Gateway 仍可再抠 |
| 14 | Settings 全 tab 深页 | **v0.1.21** Privacy 63–70 字符串/嵌套齐；Disable 左轨 + Models `#pop` | P1 | Usage/Plugins 继续抠；Privacy 基本对齐 |
| 11 | `#sideEdge` 拖宽 | 仅视觉 | P2 | |
| 12 | 业务后端 / 真网关 | 无 | P2 | 范围外 |
| 13 | 先前 PASS_WITH_GAPS | **已撤销**；现以截图空态对齐为准 | — | |
| 15 | Antigravity risk/import | **v0.1.27** 独立卡（非 Claude 共用） | — | Sign in anyway = mock waiting；无真 Google OAuth |
| 16 | Copilot Proxy proto-menu | **v0.1.27** ProtoMultiMenu + Custom… form | — | 对齐 `signInProxyLink`/`signInProxyChoices` |

## 仍开放的有意差距

1. 无真实 provider 添加 / agent 接线 / gateway / OAuth  
2. 飞鸟仅为 Demo 开关 mock（非官方拍翅 timing · GAP #7 P1）  
3. Tray 仅 Agents 空配额态（01）；Allowances/Usage/Routing 托盘嵌套待点录  
4. Provider 列表已有账号态壳；真 key 轮转 / arrange drag 落盘仍 mock  
5. 未做原生 Tauri；Electron 系统标题栏（Windows 上游亦然）

*Sessions / Library 不是顶栏缺口：官方默认不展示。*
