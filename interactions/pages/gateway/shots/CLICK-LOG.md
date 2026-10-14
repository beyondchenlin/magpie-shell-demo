# Gateway CLICK-LOG

对照：`magpie-official/shots/04-gateway.png` + 本目录 G-*.png + `plugins/gateway/client.js`。

| id | 选择器 | 操作 | toast / 后态 | CSS |
|----|--------|------|--------------|-----|
| G-00 | `#view-gateway` | 进入 | 空态四段：status / Connect / Models empty / Recent none | view-in .24s |
| G-01 | `.gw .url` | click | 已复制网关地址 / Gateway URL copied | url hover .12s |
| G-02 | `.gw-fix` | click | Restarting… →（demo）演示壳 toast | action .12s |
| G-03 | `#foldConnect` | click | connect hidden；note.brief | fold svg .15s |
| G-04 | `.connect .segs .opt` | click flavors | thumb 滑；hint 变 | thumb 280ms |
| G-05 | `.copy` | click | copy-pop；✓ 1.2s；`{what} copied` | copy-pop .36s |
| G-06 | snip + snip-os segs | click | 代码块更新 | thumb 280ms |
| G-07 | `#foldModels` | click | 空列表仍显示 empty-state | fold .15s |
| G-08 | `#openLanSettings` | click | Settings | text .12s |

注：本 executor 无 desktop computerUse；PNG 为仓库既有录制，语义以源码补全。
