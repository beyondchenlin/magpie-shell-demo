# interactions/ — 交互录制目录

对照官方 Magpie 逐控件记录，再按 Spec 回写 demo。

2026-10-16证据口径：本目录各版本、native-linux、win-mac及pages/*/SPEC均为带时间/平台/候选背景的历史材料，不是并列生效标准。当前唯一规则候选入口为 [CIS-CONTROLS](../docs/CIS-CONTROLS.md)，冻结状态见 [EXECUTION-STATUS](../docs/cis/EXECUTION-STATUS.md)。原始截图、失败记录、NOTES全部保留；旧Done、差<1px、已构建、未测FPS等结论不可自动映射到新候选。缺候选SHA或同环境金标必须明确记录。

## 结构

```
interactions/
  README.md                 ← 本说明
  pages/
    <page>/                 ← agents | providers | routing | gateway | usage | plugins | settings | sidebar
      CONTROLS.md           ← P1：可点目标 checklist（id 预分配）
      SPEC.md               ← P2+：Interaction Spec 表（模板见 INTERACTION-PLAN.md）
      RECORDING-QUEUE.md    ← computerUse 实机点击截图顺序（源码 Spec 已填后补像素）
      shots/                ← 截图：{id}-before.png / {id}-after.png / {id}-mid.png（可选）
```

## 命名

- 控件 id：页面字母前缀 + 序号，如 Agents=`A-01`，Providers=`P-01`，侧栏=`S-01`
- 截图文件名与 id 对齐：`A-03-before.png`
- 条件出现（非空态）控件仍进 CONTROLS，标注「条件」；录制时再补 shots

## 流程

1. CONTROLS 勾选「已盘点」  
2. 官方上点一遍 → 写 SPEC 一行 + shots  
3. demo 实现 → SPEC `demo状态=已实现`  
4. 官方 vs demo 同路径对照 → `已对照`

一页 CONTROLS/SPEC 未完成前，不宣称该页交互 1:1。
