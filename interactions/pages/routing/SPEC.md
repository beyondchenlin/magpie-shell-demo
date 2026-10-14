# Routing — Interaction Spec

> 依据 [`shots/CLICK-LOG.md`](./shots/CLICK-LOG.md) + PNGs（R-00…R-09）。  
> Demo **v0.1.5**：空态 Hide accounts 切换 + 顶栏 Refresh toast（models）已接线。  
> **不是**全应用 PASS；Gateway / Usage / Plugins / Settings 交互未录/未做。  
> 空态无请求时 **不** 露出 Live / By request / Replay（Magpie `#rtMore` 隐藏）——不要发明假 live 模式。

## 总表

| id | 控件 | 操作 | 后态（官方） | 录制 | demo 状态 |
|----|------|------|--------------|------|-----------|
| R-00 | Routing 空态加载 | 进入 `?view=routing` / `#/routing` | 白卡 Waiting；绿 live 点装饰；Hide accounts `aria-pressed=false` 睁眼；0/0/0；无 dialog；无 New group（groups off） | 已录 `R-00-page-load.png` | **已对齐空态** |
| R-01 | `#rtMask` Hide accounts | 点击 | 文案 → **Accounts hidden**（非 “Show accounts”）；`aria-pressed=true`；眼划掉；title 截图打码提示；view `.masked` + 短暂 `.masking`；空卡无邮箱故舞台字不变 | 已录 `R-01-accounts-hidden.png` | **已实现**（`localStorage` `magpie.maskEmails`） |
| R-02 | `#rtMask` 再点 | 点击 | 回 Hide accounts；`aria-pressed=false`；睁眼；去 `.masked` | 已录 `R-02-accounts-shown.png` | **已实现** |
| R-03 | Demo / Live / By request / Replay | — | 空卡 **不可见**；`#rtMore` 内控件隐藏；绿点非控件 | 已录（无控件） | **已对齐（不发明）**；可选「演示飞鸟」为 demo 显式开关，非 Magpie live UI |
| R-04 | 顶栏 `#sync` | 点击 | icon spin；footer `status ok` toast **Model lists refreshed**（zh：模型列表已刷新）；卡仍空 0/0/0 | 已录 `R-03-refresh-toast.png` | **已实现**（routing 走 models kind） |
| R-05 | `.rt-src` your agent | 点击 | **非按钮**；无 panel / dialog / URL 变 | 已录 `R-04-nodes-no-panel.png` | **已对齐** |
| R-06 | `.rt-hub` magpie | 点击 | 静态 hub 鸟标，非 flier；无 panel | 同上 | **已对齐** |
| R-07 | `li.idle` No request yet | 点击 | idle 占位非账号行；无 panel | 同上 | **已对齐** |
| R-08 | Footer stats / `.rt-errs` | 点击 | 统计非链接；errors `aria-disabled=true`，title「No failed request…」 | 同上 | **已实现** `aria-disabled` |
| R-09 | Account row | — | 空态无账号行；`#rtMore` Import/New group/segments 不可见 | — | **已对齐空态** |

## 飞鸟（NOTE）

空卡 `.rt-sky` 无 `.rt-flier`。源码仅在请求播放时 `bird()` 注入；`prefers-reduced-motion` / view 隐藏则跳过。  
Demo 可保留显式「演示飞鸟」开关（非官方空态控件）；**不要**加 Live day / By request / Replay。

## 源码锚点

- Mask：`app.js` `hideAccounts` / `#rtMask`（`localStorage` `magpie.maskEmails`；`.masking` 450ms）
- Refresh：`app.js` `refreshKind()` → routing 为 `models`；toast `Model lists refreshed`；`#sync` spin
- 舞台 / 空态：`routing.js` / `routing.css`；errors `aria-disabled` when no failed

## 本文件状态

R-00…R-09 录制=已录 · demo=空态交互已实现（web/exe **v0.1.5**）· 全应用仍非 PASS · 判定 **`ROUTING_EMPTY_PARTIAL`**。


## v0.1.16
- `#rtMore`：Routing groups 卡 · model **#pop**（ModelPop）· Conditions fold。


## v0.1.23
- `#rtMore` filters：`Live` + day pills + `Earlier days` menu；`Replay them all`
- `.rt-replay` 重放条（时钟 / 倍速 / Stop / track）
- `.rt-log` / `.rt-steps` 网关轨迹故事（点选请求）

## v0.1.29 — New group editor (native 02–22)

| id | 控件 | 操作 | 后态 | demo |
|----|------|------|------|------|
| R-10 | `+ New group` | 点击 | `.rt-gedit` 打开；Name 聚焦 | **已实现** |
| R-11 | `+ Add a model` | 点击 | `#pop`；No matches / use as typed | **已实现** |
| R-12 | `Group's reasoning` | 点击 | Follow…max | **已实现** |
| R-13 | segs 全层 | 切换 | hints 随选 | **已实现** |
| R-14 | Cancel dirty | Discard modal | **已实现** |
| R-15 | Add | mock 组卡 | **已实现**（无 API） |
| R-16 | Rules 深条件 | — | **PARTIAL** |
| R-17 | Bird hop | ~1400ms | **已对齐** |
| R-18 | Pools | demoLive | **mock** |

判定：**ROUTING_EDITOR_PARTIAL**（Rules 深层 / classifier / weight 拖拽 / 真 Save 仍缺）。
