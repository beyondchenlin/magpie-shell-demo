# interactions/ — 交互录制目录

对照官方 Magpie 逐控件记录，再按 Spec 回写 demo。

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
