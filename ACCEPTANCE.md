# Acceptance — magpie-shell-demo

**Status: `ROUTING_DAY_PARTIAL`** — **v0.1.23**

## 本批

| 区 | 内容 |
|----|------|
| Routing day bar | Live + 日 pills + Earlier days 菜单（fit 溢出）；`histDay` 过滤文案 |
| Routing Replay | `Replay them all` / 单请求 Replay · `.rt-replay` 时钟·倍速·Stop·轨道 marks/head |
| Routing trace | 点选请求后 `.rt-log` + `.rt-steps`（why/ok/bad/swap/wait） |
| Agents Arrange | Move up/down 真排序 + handle 拖拽 mock（`.dragging`）· order 持久化 |
| Agents Relocate | 对齐 sessions `askRelocate`：绝对路径 / Preview→Confirm / 完成文案 |
| Plugins Installed | A→Z / Z→A `.segs.sortby`（localStorage `magpie.sort.plugins`） |
| Providers | 消费 native `01–03` → `interactions/native-linux/providers/NOTES.md` |

## 链接

- [Release v0.1.23](https://github.com/beyondchenlin/magpie-shell-demo/releases/tag/v0.1.23)
- [Portable 0.1.23](https://github.com/beyondchenlin/magpie-shell-demo/releases/download/v0.1.23/Magpie-Shell-Demo-0.1.23-portable.exe)
- 在线：https://magpie-shell-demo.vercel.app

## 仍缺

- Routing 真 gateway hist / 真 replay 时间轴（现为 mock 日条+重放 UI）
- Agents 拖拽插入点动画（slide siblings）再抠
- Plugins Install 真 npm 流；Installed 行手柄若上游新增再对齐
- Privacy 字级微调；Providers 更多嵌套帧
