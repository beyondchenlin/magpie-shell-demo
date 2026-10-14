# Agents — computerUse 视觉录制队列

> Executor 无浏览器：本队列给 **computerUse** 按序实机点击 + 截图。  
> 源码 Spec 已写在 [`SPEC.md`](./SPEC.md)；此处只补 **before/after（及 mid）** 像素证据。  
> 官方 URL：`http://127.0.0.1:17890/?k=magpie-shell-review-key1`  
> 挂了则：`MAGPIE_WEB_KEY=magpie-shell-review-key1 /home/box/.local/bin/magpie web --addr 127.0.0.1:17890 --no-open`  
> 截图保存到：`/workspace/magpie-shell-demo/interactions/pages/agents/shots/`（文件名见下）  
> 空态基准可对照：`/workspace/magpie-official/shots/01-agents.png`

## 全局准备（每次开录）

1. 打开上述 URL（window 壳）。  
2. 确认侧栏 **Agents** 选中；主区为 Agents 空态（有「快速上手」、Cursor 行、「管理」、「安装其他 Agent」、「＋ 保存当前」）。  
3. 若 guide 已被隐藏：Settings 或清 `settings/guide` 后刷新，或重装 prefs——**A-01/A-02 需要 guide 可见**。  
4. 语言：简体中文（与现网截图一致）。  
5. 等页面静止后再截（modal spring ~570ms；spin 至少拍到转动中）。

---

## 队列（严格顺序）

| # | Spec | 动作 | 截图文件 | 验收要点 |
|---|------|------|----------|----------|
| 1 | A-01 | **准备**：guide 可见。截 before。 | `A-01-before.png` | ✅ 已有（EN Get started）；含 × |
| 2 | A-01 | 点 guide 右上 **×**（`.guide-x`）。等列表重绘。截 after。 | `A-01-after.png` | guide 消失；Cursor/管理/安装仍在 |
| 3 | — | **恢复 guide**（否则 A-02 无按钮）：改回 guide 未隐藏并刷新，或重启 magpie 清 prefs。确认「添加供应商」可见。 | — | — |
| 4 | A-02 | 截 before（Agents+guide）。 | `A-02-before.png` | 步骤1「添加供应商」可见 |
| 5 | A-02 | 点 **添加供应商**（`.guide-go`）。等跳到 Providers；若自动弹出 Add sheet 一并纳入。截 after。 | `A-02-after.png` | ✅ 已有（ADD YOUR FIRST PROVIDER）；可重拍中文版 |
| 6 | — | 侧栏点回 **Agents**。确认 guide 仍在（若 A-01 已永久隐藏则先恢复）。 | — | — |
| 7 | A-05 | 截 before。 | `A-05-before.png` | 「管理」按钮在列表底栏 |
| 8 | A-05 | 点 **管理**。等 modal spring 结束（~600ms）。截 after。可选再截 mid（打开约 200ms 时）。 | `A-05-after.png` · 可选 `A-05-mid.png` | 标题 Manage agents/批量管理；搜索框；Done |
| 9 | A-05 关 | 点 **Done** 或 Escape 关 modal（勿在 saving）。 | — | 回到 Agents |
| 10 | A-06 | 确认安装头 **收起**（`aria-expanded` 视觉上 chev 朝下/未转）。截 before。 | `A-06-before.png` | 「安装其他 Agent（N）」单行 |
| 11 | A-06 | 点 **安装其他 Agent**。等 chev 转完（.3s）+ 行出现。截 after。 | `A-06-after.png` | note + ≥2 个 `.ag-install-row` |
| 12 | A-06 可选 | 再点 head 收起，确认可逆（不必另存文件）。 | — | — |
| 13 | A-08 | 滚动到 **方案** 行。截 before。 | `A-08-before.png` | 「＋ 保存当前」+ hint |
| 14 | A-08 | 点 **＋ 保存当前**。截 after（出现方案名称输入、按钮变 Save）。 | `A-08-after.png` | `.chip-input` focus；**不要 Enter 保存** |
| 15 | A-08 关 | 按 **Escape** 取消命名。 | — | 回到「＋ 保存当前」 |
| 16 | A-09 | 截 before（顶栏 `#sync` 静止）。 | `A-09-before.png` | 无旋转 |
| 17 | A-09 | 点 **#sync**。立即再截 mid（旋转中）。 | `A-09-mid.png` | icon 在转 |
| 18 | A-09 | 等 spin 停 + status「已重新检测 Agent」。截 after。 | `A-09-after.png` | 无 spin；footer ok 文案 |

---

## 下一批（本轮不做，占位）

| 批次 | 依赖 | ids |
|------|------|-----|
| B | A-06 expanded | A-11, A-12, A-13(copy+toast), A-14 |
| C | A-05 modal 开 | A-15…A-24（搜索/多选/Hide/Done） |
| D | A-08 naming / 有 profile | A-25…A-29 |
| E+ | 需第二可接入 agent | A-30…A-52 |

---

## 录制备注

- **不要猜测动效**：若实机与 SPEC 源码时长不符，在 SPEC 该行追加「实机观察」一句并改时长。  
- A-02 实机确认：**无**整页 View Transition（仅内容/侧栏选中切换）。  
- A-06 实机确认：列表是 **瞬间出现**，只有箭头旋转是动画。  
- A-05 实机确认：dialog 从按钮位置或下方 scale 弹入（spring）。  
- 截图视口尽量固定（同窗口大小），便于 P4 对照。

## 队列长度

- **本轮必做视觉步：18 行表中的拍摄步 = 11 张主图**（A-01×2, A-02×2, A-05×1–2, A-06×2, A-08×2, A-09×3）→ **计 12 张若含 A-05-mid，否则 11**。  
- **已有像素：2**（`A-01-before`、`A-02-after`）· **仍欠：9–10 张**。  
- **队列条目数（含恢复/导航）：18**。  
- Blocker：guide 被 A-01 隐藏后需手动恢复才能录 A-02；无第二 agent 时 E 组无法录；executor 无 computerUse，视觉步必须父代理跑队列。
