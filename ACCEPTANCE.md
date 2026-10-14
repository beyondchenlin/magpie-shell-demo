# Acceptance — magpie-shell-demo

**Status: `HEATMAP_ROUTING_PARTIAL`** — **v0.1.17**

## 本批

| 区 | 内容 |
|----|------|
| Usage heatmap | Magpie `#ledHeat` 53 周网格 · Tokens/Requests/Cost segs · tip · Less/More · scroll keep-end |
| Sessions | 行展开 `sess-detail`（Time/Folder/ID/Resume/models/via/File）· Show more / Show less 分页 |
| Plugins movable | Serves chip · Move here 长确认文案 · Disable/Remove 带回内置长文案（演示） |
| Routing | demo live 请求舞台文案 · 账号行 + bar · stats 随 turn |
| Providers | `localStorage` 持久 folds/账号 · 嵌套 Add account 三步向导 |
| Agents | Get started Connect 嵌套 · Connect/Disconnect · Claude Relocate 嵌套 |

## 链接

- [Release v0.1.17](https://github.com/beyondchenlin/magpie-shell-demo/releases/tag/v0.1.17)（打包后填）
- [Portable 0.1.17](https://github.com/beyondchenlin/magpie-shell-demo/releases/download/v0.1.17/Magpie-Shell-Demo-0.1.17-portable.exe)
- 在线预览：尝试 Vercel；若 402 则用 portable / `npm run preview`

## 仍缺

- 真 ledger/heatmap API；Sessions 跳转 Sessions 插件页
- Plugins 真 npm / Bun 安装；movable 真 provider/move API
- Routing 真 gateway trace / 飞鸟 timing 全对齐
- Providers 真保存；Agents 真接线 / relocate-claude API
- Setup.exe wine；Privacy 等见既有 PARTIAL
