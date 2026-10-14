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
| 9 | Provider 完整行控件 | 仅空态添加表 | P1 | 添加后无列表态 |
| 10 | Gateway 空态壳+主交互 | **v0.1.9**；filled demo **v0.1.12** | P1 | Gateway 仍可再抠 |
| 14 | Settings 全 tab 深页 | **v0.1.16** Privacy nested + Disable 左轨 + Models `#pop` | P1 | Privacy 63–70；Disable No matches；Usage/Plugins 继续抠 |
| 11 | `#sideEdge` 拖宽 | 仅视觉 | P2 | |
| 12 | 业务后端 / 真网关 | 无 | P2 | 范围外 |
| 13 | 先前 PASS_WITH_GAPS | **已撤销**；现以截图空态对齐为准 | — | |

## 仍开放的有意差距

1. 无真实 provider 添加 / agent 接线 / gateway  
2. 飞鸟仅为 Demo 开关 mock  
3. Usage/Plugins/Agents nested = **HEATMAP_ROUTING_PARTIAL**（v0.1.17 heatmap+Sessions detail+movable+routing live+providers LS）（Requests 空态藏 chart；Sessions/Context DOM；middleware hooks 文案）；Privacy **PRIVACY_NESTED_PARTIAL**；Gateway 空态+演示填充  
4. 未做原生 Tauri；Electron 系统标题栏（Windows 上游亦然）

*Sessions / Library 不是顶栏缺口：官方默认不展示。*
