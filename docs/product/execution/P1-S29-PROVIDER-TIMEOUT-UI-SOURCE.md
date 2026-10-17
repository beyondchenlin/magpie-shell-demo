# CIS超时编辑与main限定保存源码

2026-10-18，接续9874a44；候选仍dev.16/config10/usage2。已接源码和类型/静态渲染检查，**没有原生点击/实际IPC调用/安装更新或视觉验收**。用户仍dev.9，禁止电脑控制、真实资料保护及拖动未通过保持；A10/P1不整体通过。

供应商目录区沿用PrefRow/TextBtn增加“已保存的推理超时（毫秒）”与编辑入口，避免把desired配置当effective状态。编辑器沿用原WordsField/fieldset/按钮及editor样式，无新CSS/组件库；四项标签说明连接/TLS、首HTTP响应头、响应体idle（含首段）和总预算。明确保存后须应用到网关、新请求才用新值、在途保留原值、配方预算仍钳制及目录检测独立。没有首token独立计时或收费封顶承诺。

草稿保留打开时provider/id及base revision，poll不覆盖用户输入。便利校验与核心同范围/关系，不用宽松parseInt或接受前导零/小数；核心仍最终校验。独立TimeoutSaver每次只允许一个保存，失败保持未保存/不自动apply或重试，成功在卸载前也不能重发；dispose后晚成功不触发关闭其他编辑器。React回调更新保留同一个owner，StrictMode只建/清理对象不自动写配置。编辑态保护导航、供应商操作/目录/权限与App档案，失败表单保留供明确核对。

native只新增save_provider_timeouts：main窗口精确permission，经既有local config guard与共享ConfigService，输入为严格SaveProviderTimeouts；路径固定在Application，不接任意文件/SQL/URL，不碰凭据或HTTP上游。service桥接传递同一DTO。权限静态检查与cargo check通过不当作实际native保存已验。

第一轮自查：fieldset直接复用原两列布局及响应式样式，所有输入有具名label/ms提示，首项焦点/明确取消、busy禁用；名称由React转义。保存与应用分开呈现，已有全局错误提示可刷新核对，超时不假报回滚。原CIS/shared CSS和ProductChrome拖动属性未修改，不能据此通过用户的自由拖动反馈。

第二轮检查：重复提交/失败后明确重试固定相同id/revision、成功后防重发、错误及dispose晚回复；无effect写入或自动派发/探测。源模型及静态HTML25通过（原21+新4），TS/Vite、六文件116规则JSON lint零诊断、native源码编译/单permission-main检查及六CSS/chrome guard通过。沿用已读React检查规则，未用Tailwind/shadcn改CIS。核心91/实际超时HTTP3与回归引用S27/S28，不重复Rust二进制全量链接或假称DOM点击通过。

证据evidence/P1-S29-{source-first,source-final,frontend-first,frontend-final,lint-first,lint-final,native-check,native-source,cis,chrome}.txt与manifest。新检查均为内存fixture/SSR，未访问真实Storage、WebView或用户安装。D低于10GiB，计划缓存增量0.02GiB，C42.45/D9.78→C42.43/D9.77GiB，包含并发变化不当净释放；预计>1GiB操作保持暂停。只复用node_modules/Cargo检查缓存，无新环境/worktree/TempDir、无安装包/全量重建、无人工删除旧产物/证据/审批拒绝文件；dist/target供后续继续保留。
