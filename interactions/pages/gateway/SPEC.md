# Gateway — Interaction Spec

> 依据：官方空态 `magpie-official/shots/04-gateway.png` + `shots/G-*.png` + 源码 `plugins/gateway/client.js` / `app.css` Gateway 段。  
> Demo **v0.1.9**：空态结构 + Connect/Models fold + API/Shell/OS segs（thumb 280ms）+ copy（copy-pop .36s / 1200ms）+ Restart busy + URL toast。  
> **不是**全应用 PASS；LAN keys / 真实 restart / 有模型列表 / 有调用行未做。  
> 本机无 computerUse 时：G-* PNG 为既有录制；控件语义以源码为准。

## 总表

| id | 控件 | 操作 | 后态（官方） | 动效 | 录制 | demo |
|----|------|------|--------------|------|------|------|
| G-00 | 进入 Gateway | 导航 | 绿 dot.on；Gateway **running**；0 models · no agent… · five APIs；Restart；url pill；keys 说明；Connect 展开 OpenAI；Models 空态；Recent none | `view-in` .24s | 已有 G-00.png | **已对齐空态** |
| G-01 | `.gw .url` | 点击 | toast `{what} copied`（Gateway URL）；clipboard | toast 胶囊 | G-01-after | **已实现** |
| G-02 | `.gw-fix` Restart | 点击 | busy 文案 Restarting… → 恢复；真机调 API | button .12s | G-02-after | **已实现（mock busy+demo toast）** |
| G-03 | `#foldConnect` | 点击 | `aria-expanded` 翻转；`#connect` hidden；note 变 brief+base+copy；LS `magpie.gwConnectFolded` | chevron .15s | G-03-after | **已实现** |
| G-04 | API `.segs` | 点 Responses/… | `.on` 滑动；note/hint/base 随 flavor；LS `magpie.flavor` | thumb **280ms** | G-04-after | **已实现** |
| G-05 | Base/Key/Model/Snippet `.copy` | 点击 | `.done` + ✓ 1200ms；toast `{what} copied` | **copy-pop .36s** | G-05-after | **已实现** |
| G-06 | Shell/curl/Python/Node + OS segs | 点击 | snippet 重绘；OS 仅 shell/curl；LS `magpie.snipLang`（demo）/`magpie.snipOS` | thumb 280ms | G-06-after | **已实现** |
| G-07 | `#foldModels` | 点击 | 空目录下列表仍可见（源码：`hidden = folded && n>0`）；LS `magpie.gwModelsFolded` | chevron .15s | G-07-after | **已实现** |
| G-08 | `#openLanSettings` | 点击 | 进 Settings → Network | — | 源码 | **已实现（进 Settings）** |
| G-09 | `#sync` on Gateway | 点击 | models toast「模型列表已刷新」 | sync spin | — | **壳层已有** |
| G-10 | Gateway keys / 模型行 / 调用展开 | — | lan 关时 keys 块 hidden；空态无模型行/调用 | — | — | **跳过（空态）** |

## 源码锚点

- 页面 HTML：`plugins/gateway/client.js` `html:` + `renderGateway*`  
- CSS：`app.css` «gateway page»（`.gwcard` `.connect` `.copy.done` `copy-pop` `.fold` `.snip*` `.activity`）  
- Copy：`app.js` `copy` / `flashCopied`（1200ms）  
- Segs thumb：`slide` 280ms ≡ demo `useSegThumb`

## 判定

**`GATEWAY_SHELL_LOGIC_PARTIAL`** — 空态壳 + 主控件动效已接线；LAN keys / 真网关 / 调用详情未做。
