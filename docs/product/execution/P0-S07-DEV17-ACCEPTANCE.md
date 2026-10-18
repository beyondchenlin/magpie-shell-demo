# dev.17 保存与恢复补验（2026-10-18）

P0 仍未通过。核心保存和真实进程恢复获得新证据；原生表单保存、宿主重启和自由拖动没有新增通过证据。用户要求保持电脑控制连接，本批保留了原会话及隔离 Tagma 窗口，没有重置控制器、关闭窗口或要求用户继续代点。

## 原生实际操作

仅绑定 `C:/Users/ai/AppData/Local/Temp/tagma-hotfix-s01-d01972fd-b495-478e-8b54-af7eedbbfe47/tagma-desktop.exe`，窗口 id 69124，标题“Tagma 隔离测试 dev17 升级恢复 d01972fd”。当前读到供应商列表为空、已保存/运行中版本均0；标题中的“升级恢复”不能证明迁移或保存通过。

在用户报告手动点击之后，自行重读、调用已观察到的 Raise、检查系统菜单快捷键、重新绑定观察画面，再对当前索引66的“添加供应商”执行点击。Raise 返回但焦点仍是 Tagma 窗格；Alt+Space 后瞬时 accessibility 为 null，随后仍为原列表。截图报 `window capture timed out: timed out waiting on channel`，点击报 `coordinate input geometry is unavailable`。刷新未看到名称/Base URL/模型编辑框。没有猜坐标、改用自制 Windows 输入器或把读到界面当成操作成功。

原始按钮操作及完整后置文字状态：[P0-S07-native-attempt.json](evidence/P0-S07-native-attempt.json)。这是控制通道阻塞，尚不能判断产品点击回调本身失败。遵循 [Computer Use guidance](C:/Users/ai/.codex/plugins/cache/openai-bundled/computer-use/26.1013.40934/docs/guidance.md) 的有界恢复规则：“Refresh the app/window selection and retry once; report the exact error if recovery fails.” 不无限重连，控制会话仍保留。用户资料、安装器和默认应用配置没有参与测试。

## 新增验证

| 验证 | 真实边界 | 结果 |
| --- | --- | --- |
| fresh_save_survives_process_exit_and_second_restart | 新库：保存两供应商、排序、编辑模型顺序/启停；确认保存后直接 exit93，不执行析构；新进程读回并拒绝旧版本编辑、删除；第三进程验证删除持久化 | 通过 |
| legacy_upgrade_save_survives_process_exit_and_second_restart | 精确早期 schema1/application_id0 合成库走同一链路；历史供应商和 revision1 原始 JSON 均保留 | 通过 |
| save_while_stopped_is_durable_and_applied_only_after_restart | 独占真实 sidecar：effective0 → 停止 → desired1 保存且 effective未知 → 新实例启动并加载 effective1 | 通过 |

共 **3个独立用例通过**；child worker 的重复输出不累计，1个忽略 worker 入口不算通过。测试不访问真实上游，不生成系统密钥。跨进程用例使用不写凭据的测试存储；网关用例不给供应商密钥、不初始化访问令牌。所有路径、端口均独占；正常/异常路径等待子进程退出，并由 TempDir 回收。成功路径显式 close 确认没有遗留锁。

命令及日志：

```powershell
cargo test --offline --locked -p tagma-core --test save_restart -- --nocapture
cargo test --offline --locked -p tagma-gateway --test process_lifecycle save_while_stopped_is_durable_and_applied_only_after_restart -- --exact --nocapture
cargo clippy --offline --locked -p tagma-core --test save_restart -p tagma-gateway --test process_lifecycle -- -D warnings
```

[跨进程日志](evidence/P0-S07-save-restart.txt)、[sidecar最终日志](evidence/P0-S07-stopped-save-final.txt)、[Clippy](evidence/P0-S07-clippy.txt)。新增 sidecar 测试初次误用 assert_eq 比较未实现 PartialEq 的 RuntimeState，编译失败；改为现有模式的 matches 后通过，[失败日志](evidence/P0-S07-stopped-save.txt)保留。产品实现未因此修改。原有 ts-rs deny_unknown_fields 解析提示仍存在，Clippy 返回0。

第一轮自查核对断言：必须比较新进程读取值/顺序、原始历史 JSON、精确 revision，不能仅检查服务可打开。第二轮自查核对清理/隔离：子进程超时有 kill+wait，sidecar 即便断言失败也尝试 stop，原生现有 fixture 与测试路径不同，没有批量结束同名程序。测试不会把新值直接写回用于证明自己的预期。

## 来源保全与构建入口

原包保持 `D:/demo1/tagmaai-deliveries/0.2.0-dev.17/Tagma_0.2.0-dev.17_x64-setup.exe`，SHA256 `155c0f26ff3d5617867ca6ddcc6c1d1fcbf316ab33a241184c597dbcf022cc0c`。本批未重新生成或安装。包的冻结来源仍是 HEAD `7485c244e1b59a14531fadab3c0ca5564d482822` 加原 dirty 源码，不能把后续提交冒充它的构建前 clean commit。

修改前完整复核冻结304文件均匹配。保存了 `D:/demo1/tagmaai-deliveries/0.2.0-dev.17/source-overlay.json.gz`，SHA256 `56bd917d9328944f56daf3ec6f7314822dbd89f3c393526722e5e1e43d1d53ef`，1,938,697字节，解压源码差异4,728,356字节。格式 `tagma-candidate-source-overlay/v1`：159项可直接由基准 Git blob 取回，145项保存精确 base64 字节（含换行差异和35个已存在移动端资源）。解压后的 files 给出304项完整校验信息，overlay 可逐项覆盖一个**另行准备的干净基准 checkout**；恢复后应逐项校验全部SHA256。不要直接恢复到当前工作区或覆盖未提交工作。

这是小型源码差异保全，不含依赖、target、安装文件、数据库或凭据。分类只表示源码家族，不宣称继承 CIS 内容是本批修改。原有继承 CIS 文件和生成移动端图标不纳入本批产品提交，仍留在原位置。证据：[来源清单](evidence/P0-S07-source-overlay.json)、[原冻结清单](evidence/HOTFIX-S01-source-frozen.json)。本批新增测试/CI/说明不属于原安装包冻结304输入；运行产品源未因本批测试而改变。

根 README 已区分正式 Tauri 与历史 Electron。新增 `.github/workflows/build-tagma-windows.yml` 仅 workflow_dispatch、contents:read，使用锁文件、Rust1.98.1，调用真实 Tauri+sidecar debug NSIS 路径；只上传7天内部产物与hash，不发布 Release。旧 Electron workflow 仅更名。已用本地 CLI help 核对参数，用已有 js-yaml 解析工作流并检查触发器/权限；未触发远程CI。第一次选择本地不存在的 yaml 包失败，随后复用已有 js-yaml，没有安装依赖。

tagma-prd 和 magpie-cis 实际状态均 PAUSED。原执行/监督聊天均 idle 后只校正 RUN-BINDING 状态，未恢复调度。A18 更新为 prepared 发布/发现局部完成，不能称P2未开始或已通过。旧版本安装记录均作为历史；用户当前实际安装版本未知。

## 仍需完成的出口

1. 控制通道能提供有效截图/输入后，在当前隔离实例完成供应商表单、排序、停止期间保存、宿主退出/重启后恢复；按用户要求维持控制会话。
2. 原生顶部和侧栏空白区真实鼠标位移、按钮不误拖、最大化/还原与不同位置拖动。已有 Tauri deep 拖动区和 capability 不能替代物理验收。
3. 错误实例的可见提示/恢复、重复启动、托盘/完全退出，以及A06焦点/主题/语言/长文本/缩放/减弱动效。源码中初始 ConfigService 错误保存在 Application 中，刷新不会重新执行 open；修复外部启动条件后的同进程恢复需要单独复现设计，当前不宣称刷新可完成启动恢复。
4. 干净机器安装、签名、其他发行平台和A24测量仍未完成。P0未过不扩展P2。

## 空间与保留

复用唯一现有工作区、node_modules 和 Cargo target；没有新 worktree、依赖下载或全量构建。开始C/D约41.63/33.59GiB，本批为小范围编译及约1.85MiB源码保全。测试自动临时目录已清除；没有人工删除既有证据或预览。原生 fixture 因窗口仍运行且用户要求保留连接而保留。交付包和 source-overlay 的用途为本批dev.17回溯，责任为当前项目执行者，复查日期2026-10-25；P0验收结束前保留，不创建定时清理。最终空间/产物统计见本批收尾证据，盘差不能当作净释放。
