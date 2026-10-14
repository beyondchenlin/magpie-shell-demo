# Providers — Interaction Spec

> 依据 [`shots/CLICK-LOG.md`](./shots/CLICK-LOG.md) + PNGs（P-00…P-C1）。  
> Demo **v0.1.4**：目录检索 / Import 空态 / 已录 6 类表单壳已接线。  
> **不是**全供应商 1:1；Routing / Gateway 等仍未做。

## 总表

| id | 控件 | 操作 | 后态（官方） | 录制 | demo 状态 |
|----|------|------|--------------|------|-----------|
| P-00 | Providers 空目录 | 加载 | 「添加第一个供应商」+ Find + Import + 分区网格 | 已录 | **已对齐空态** |
| P-01 | `input.find`「查找供应商…」 | 输入 `open` | 过滤到匹配 Vendors/Relays；其它分区隐藏 | 已录 | **已实现** |
| P-02 | Escape（无独立清除按钮） | Esc | 清空查询，目录恢复 | 已录 | **已实现** |
| P-03 | Import… | 点击 | 「从其他应用导入」对话框；Alma/CC Switch/Claude Code/Codex 均为 – / Not found；Import disabled；Cancel 关 | 已录 | **已实现**（演示空态） |
| P-S1 | 订阅 Claude | 点击 | 行内 risk 警告（非 OAuth 窗）：Cancel / 改为导入… / 仍然登录 | 已录 | **已实现**（登录为 demo toast，无 OAuth） |
| P-S2 | Anthropic | 点击 | 添加表单：API key / Headers / Extra body / Proxy / 限额 / Context / Max output；Cancel / Add | 已录 | **已实现壳**（Cancel 回目录；Add 仅 toast，无网络） |
| P-S3 | OpenRouter | 点击 | 表单 + Key header Both / x-api-key / Bearer | 已录 | **已实现壳** |
| P-S4 | Ollama | 点击 | 表单 + optional key + 折叠 Server address | 已录 | **已实现壳** |
| P-S5 | Remote magpie | 点击 | Endpoint + API key + 其余限额字段 | 已录 | **已实现壳** |
| P-C1 | Custom provider | 点击 | Name + Base URL 协议 chips + key + … | 已录 | **已实现壳** |

## 未在本轮验收

- 每个厂商瓦片的完整字段差异（仅采样 1 块/区）
- 真实 Import / Sign-in / Add（无网关）
- Providers 已添加列表行、Arrange、账户切换

## 源码锚点

- 目录：`app.js` `renderAdd` / `drawTiles`
- Claude risk：`renderSigning` `state==="risk"`
- 编辑器：`drawEditor` / `frame` → `#modal`
- Import：`renderImportApps`


## v0.1.16
- `#providers` 演示行：Accounts / Models **fold**（chevron `.15s`）+ Edit / + Account / + Model。
