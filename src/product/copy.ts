import type { ErrorCode } from "./contract";
import type { ProductLanguage } from "./preferences";

const en = {
  workspaceTitle:"Connect your models. Make them yours.",localWorkspace:"LOCAL WORKSPACE",workspaceIntro:"Add a provider, organize models for your apps, and manage your local gateway in one place.",setupTitle:"Set up your workspace",connectProvider:"Connect a provider",connectProviderHint:"Save your provider address and credential securely on this device.",providerCount:"providers",manageProviders:"Manage providers",configureModels:"Configure model IDs",configureModelsHint:"Add the model IDs you want to use in your provider settings.",configuredModels:"models configured",openModelConfiguration:"Open model settings",confirmGateway:"Confirm configuration is applied",configurationApplied:"The gateway is using your saved configuration.",configurationPending:"Saved settings and the running gateway are not yet in sync.",openGateway:"Open gateway",localStatus:"Live local status",details:"Details",workspaceApps:"One provider. Your app preferences.",workspaceAppsHint:"App profiles share stored credentials and can use their own provider order. Teammates have a separate home in the market.",modelDirectory:"Your model directory",modelDirectoryHint:"A list of your configuration. Availability has not been tested upstream.",manuallyConfigured:"Configured",noConfiguredModels:"No models configured yet",noConfiguredModelsHint:"Connect your first provider, then add its model IDs.",chatBoundaryTitle:"Connect a model to start chatting",chatBoundaryHint:"Text chat streams through your local gateway. Configure an enabled provider and model to start.",
  chat: "Chat", providers: "Providers", market: "Teammate market", usage: "Usage", gateway: "Gateway", settings: "Settings", back: "Back",
  configurationUnavailable: "Local configuration could not be loaded. Open Settings for diagnostics.",
  refreshStatus: "Refresh status",
  startupRecovery: "If initialization failed at startup, refresh only reads that failure; it cannot reopen configuration. Resolve the cause above, choose Quit Tagma, then reopen the app. Closing the window may only hide it in the tray. Your data is retained; restarting cannot repair an incompatible or damaged database.",
  loading: "Loading local configuration…", refresh: "Refresh", add: "Add provider", edit: "Edit", remove: "Delete", up: "Move up", down: "Move down",
  empty: "No providers configured", emptyHint: "Add your own provider. Configuration is stored locally; API keys use the system credential store.",
  name: "Name", url: "Base URL (including /v1)", models: "Model IDs (one per line)", key: "API key", keyHint: "Leave blank to retain the existing credential. It is never returned to this window.",
  protocol: "Protocol", protocolName: "OpenAI Chat Completions", enabled: "Enabled", save: "Save", saving: "Saving…", cancel: "Cancel", saved: "Saved; awaiting gateway application.",
  credentialPresent: "Credential configured · Access not verified", noCredential: "No credential", deleteTitle: "Delete provider?", deleteHint: "This removes the provider from new configuration. Previously used credentials are retained until safe reclamation is possible.", confirm: "Delete provider",
  notConnected: "Chat is not connected yet", chatHint: "Configure a provider first. Real chat will use the local gateway when its protocol slice is ready.", goProviders: "Configure providers",
  reachflow: "ReachFlow", reachflowHint: "Research teammate. Installation and execution are not available in this P0 slice.", notInstalled: "Not installed", teams: "Teams", teamsHint: "Cloud model recipes will be available in P1.",
  desired: "Saved revision", effective: "Running revision", unknown: "Not confirmed", stopped: "Stopped", native: "Native desktop", preview: "Web preview — local services unavailable",
  previewHint: "Open Tagma desktop to manage real providers and credentials. The preview does not read desktop configuration.",
  notAvailable: "Unavailable in this slice", runtimeHint: "Independent local process; text Chat Completions subset.",
  start: "Start gateway", stop: "Stop gateway", apply: "Apply saved configuration", running: "Running", starting: "Starting", stopping: "Stopping", degraded: "Degraded", failed: "Failed", owned: "Owned by this desktop", external: "Owned by another entrypoint", quit: "Quit Tagma",
  language: "Language", theme: "Appearance", system: "System", light: "Light", dark: "Dark", size: "Text size", coverage: "This language is retained; new product text currently uses English fallback.",
  cleanup: "Credential cleanup is pending; retry after unlocking the credential store.", retry: "Retry", invalid: "Check the name, URL and model IDs. HTTPS is required except for localhost. Reserved tagma/ IDs are not allowed.",
  error: "Operation failed", timeout: "Confirmation timed out. The operation may still finish; refresh before retrying.", preferencesError: "Appearance changed for this session, but could not be saved.",
  cancelHint: "Cancel discards this unsaved form.", diagnostics: "Diagnostics", version: "Version", schema: "Schema", noInference: "Text chat · OpenAI-compatible subset",
  diagnosticHint: "Preview redacted diagnostics before copying. No credentials, request bodies or databases are included.", copyDiagnostics:"Copy diagnostics", copied:"Copied", logsUnavailable:"The last diagnostic write was not confirmed. Check local storage and permissions.",
  recover:"Preserve damaged record and recover",recoverHint:"Archive only the damaged initialization record shown below. Other files are retained. Restart afterward to create a fresh configuration. An existing database will never be replaced.",recoverConfirm:"Archive record",recovered:"Record preserved. Quit and reopen Tagma to retry initialization.",
  profiles:"App profiles",globalProfile:"Global default order",profileHint:"Profiles reference providers and share their stored credentials. Independent ordering does not change the global order.",addProfile:"Add App profile",editProfile:"Edit App profile",targetApp:"Target App",inheritOrder:"Follow global order",providerSelection:"Referenced providers",profileEmpty:"No providers selected",profileDelete:"Delete App profile",referencedBy:"Referenced by these App profiles",referenceHint:"Edit or delete these profiles before removing the provider.",
  gatewaySettings:"Gateway settings",port:"Saved port",auth:"Require local access token",authOn:"Token required",authOff:"Compatibility mode: no authentication",authHint:"Disabling authentication explicitly allows local programs to call the data API. Binding stays on loopback.",portHint:"A port change takes effect after stopping and starting the owned gateway. The running address stays unchanged until then.",token:"Local access token",initializeToken:"Create access token",showToken:"Show token",hideToken:"Hide token",copyToken:"Copy token",tokenMissing:"Not created; authenticated requests are denied",tokenHint:"Shown only on explicit request; hidden after 30 seconds. Rotation requires updating client tokens.",editGateway:"Edit gateway settings",copyFailed:"Clipboard copy was not confirmed.",
};

const zh: typeof en = {
  workspaceTitle:"接入你的模型，开始组织工作流",localWorkspace:"本机工作台",workspaceIntro:"连接供应商，为不同 App 配置模型，并在这里管理本机网关。",setupTitle:"开始接入",connectProvider:"连接一个供应商",connectProviderHint:"填写服务地址与凭据，安全保存在这台设备上。",providerCount:"个供应商",manageProviders:"管理供应商",configureModels:"配置模型 ID",configureModelsHint:"在供应商设置中，填写你希望使用的模型 ID。",configuredModels:"个已配置模型",openModelConfiguration:"打开模型配置",confirmGateway:"确认配置已经生效",configurationApplied:"网关正在使用已保存的配置。",configurationPending:"已保存配置与网关运行状态尚未同步。",openGateway:"查看网关",localStatus:"本机实时状态",details:"详情",workspaceApps:"同一个供应商，适配不同 App",workspaceAppsHint:"App 档案共用已存凭据，也可设置独立的供应商顺序。队员在市场单独管理。",modelDirectory:"你的模型清单",modelDirectoryHint:"这里列出已保存的配置，尚未检测上游可用性。",manuallyConfigured:"手动配置",noConfiguredModels:"还没有配置模型",noConfiguredModelsHint:"先连接第一个供应商，再添加它提供的模型 ID。",chatBoundaryTitle:"配置模型后开始对话",chatBoundaryHint:"文本对话通过本机网关流式回复，先配置已启用的供应商与模型。",
  chat: "对话", providers: "供应商", market: "队员市场", usage: "用量", gateway: "网关", settings: "设置", back: "返回",
  configurationUnavailable: "本机配置读取失败。可在设置中查看诊断。",
  refreshStatus: "刷新状态",
  startupRecovery: "若启动时初始化失败，刷新只读取该失败状态，不会重新打开配置库。请先处理上方原因，再选择“退出 Tagma”并重新打开应用。关闭窗口可能仅隐藏到托盘。原数据会保留；重启不能修复不兼容或损坏的数据库。",
  loading: "正在读取本机配置…", refresh: "刷新", add: "添加供应商", edit: "编辑", remove: "删除", up: "上移", down: "下移",
  empty: "尚未配置供应商", emptyHint: "添加自己的供应商。配置保存在本机，API Key 使用系统凭据库。",
  name: "名称", url: "Base URL（包含 /v1）", models: "模型 ID（每行一个）", key: "API Key", keyHint: "留空保留现有凭据。窗口不会回读密钥。",
  protocol: "协议", protocolName: "OpenAI Chat Completions", enabled: "启用", save: "保存", saving: "正在保存…", cancel: "取消", saved: "已保存，待应用到网关。",
  credentialPresent: "已配置凭据 · 可访问性未确认", noCredential: "未配置凭据", deleteTitle: "删除供应商？", deleteHint: "从新配置中移除此供应商。已使用的凭据保留到能够安全回收时，不会提前删除。", confirm: "删除供应商",
  notConnected: "对话尚未接入", chatHint: "请先配置供应商。真实对话将在协议切片完成后经本机网关调用。", goProviders: "配置供应商",
  reachflow: "ReachFlow", reachflowHint: "研究队员。此 P0 切片尚不支持安装和执行。", notInstalled: "未安装", teams: "组合小队", teamsHint: "云模型配方将在 P1 接入。",
  desired: "已保存版本", effective: "运行中版本", unknown: "未确认", stopped: "已停止", native: "原生桌面", preview: "Web 预览 — 本机服务不可用",
  previewHint: "在 Tagma 桌面管理真实供应商和凭据。预览不读取桌面配置。",
  notAvailable: "本切片尚未开放", runtimeHint: "本机独立进程；支持文本 Chat Completions 子集。",
  start: "启动网关", stop: "停止网关", apply: "应用已保存配置", running: "运行中", starting: "正在启动", stopping: "正在停止", degraded: "降级运行", failed: "失败", owned: "由本桌面拥有", external: "由其他入口拥有", quit: "退出 Tagma",
  language: "语言", theme: "外观", system: "跟随系统", light: "浅色", dark: "深色", size: "文字大小", coverage: "已保留此语言选项；新增产品文案暂以英文显示。",
  cleanup: "有凭据清理待处理；请解锁凭据库后重试。", retry: "重试", invalid: "请检查名称、地址和模型 ID。除 localhost 外必须使用 HTTPS，不允许保留的 tagma/ 模型 ID。",
  error: "操作失败", timeout: "确认超时。操作可能仍会完成，请先刷新再重试。", preferencesError: "外观已在本次会话应用，但未能保存。",
  cancelHint: "取消将丢弃此表单中尚未保存的修改。", diagnostics: "诊断", version: "版本", schema: "配置结构", noInference: "文本对话 · OpenAI 兼容子集",
  diagnosticHint: "先预览脱敏诊断，再复制。内容不含凭据、请求正文或数据库。", copyDiagnostics:"复制诊断", copied:"已复制", logsUnavailable:"最近一次诊断写入未确认，请检查本机存储和权限。",
  recover:"保留损坏记录并恢复",recoverHint:"仅归档下列损坏的初始化记录，其他文件保留。退出并重新打开后将创建新配置；不会替换已有数据库。",recoverConfirm:"归档记录",recovered:"记录已保留。请退出并重新打开 Tagma，重试初始化。",
  profiles:"App 配置档案",globalProfile:"全局默认顺序",profileHint:"档案引用供应商并共用已存凭据。独立排序不会修改全局顺序。",addProfile:"添加 App 档案",editProfile:"编辑 App 档案",targetApp:"目标 App",inheritOrder:"跟随全局顺序",providerSelection:"引用的供应商",profileEmpty:"未选择供应商",profileDelete:"删除 App 档案",referencedBy:"被以下 App 档案引用",referenceHint:"请先编辑或删除这些档案，再移除此供应商。",
  gatewaySettings:"网关配置",port:"已保存端口",auth:"要求本机访问令牌",authOn:"需要访问令牌",authOff:"兼容模式：不鉴权",authHint:"关闭鉴权表示明确允许本机程序调用数据 API，仍只绑定 loopback。",portHint:"端口修改在停止并启动有所有权的网关后生效。在此之前，运行中地址保持不变。",token:"本机访问令牌",initializeToken:"创建访问令牌",showToken:"显示令牌",hideToken:"隐藏令牌",copyToken:"复制令牌",tokenMissing:"尚未创建；鉴权请求会被拒绝",tokenHint:"仅在明确操作后显示，30秒后隐藏。轮换后需要更新客户端令牌。",editGateway:"修改网关配置",copyFailed:"剪贴板复制未确认成功。",
};

export function copy(language: ProductLanguage) { return language === "zh" ? zh : en; }
const errors: Record<ErrorCode, [string, string]> = {
  USAGE_CLEAR_UNCONFIRMED:["本次清除结果未确认。请核实同一次清除，不要重新提交新的范围。","This clear is unconfirmed. Verify the same operation before submitting a new scope."],
  USAGE_CLEAR_BUSY:["存在在途请求或待恢复用量，暂不能清除。","Usage cannot be cleared while requests or pending recovery results exist."],
  USAGE_CLEAR_CHANGED:["用量数据已变化，旧查询或清除预览已失效，请重新读取。","Usage changed. Read again before continuing the query or clear preview."],
  USAGE_QUERY_UNAVAILABLE:["用量读取未确认，请稍后手动刷新。运行记账状态请查看网关。","Usage reading is unconfirmed. Refresh manually; see the gateway for accounting status."],
  USAGE_QUERY_CANCELLED:["已取消这次用量读取。","Usage reading was cancelled."],
  USAGE_STORAGE_UNAVAILABLE:["用量记录未确认，已暂停新的派发。请检查存储并明确恢复网关记账。","Usage storage is unconfirmed; new dispatch is paused. Check storage and explicitly recover accounting."],
  ACCESS_REVOKED:["本机访问权限已撤销，请检查访问令牌或供应商连接。","Local access was revoked. Check the access token or provider connection."],
  SECURITY_STATE_UNCONFIRMED:["安全状态尚未确认，已阻止后续派发。请检查本机存储和网关。","Security state is unconfirmed; further dispatch is blocked. Check local storage and the gateway."],
  PROBE_BACKOFF:["检测仍在冷却或退避中，请按显示的时间重试。","Detection is cooling down or backing off. Retry after the displayed time."],
  PROBE_BUSY:["已有检测任务正在运行，请等待或取消后重试。","Detection jobs are already running. Wait or cancel before retrying."],
  NO_AVAILABLE_BRAIN:["没有近期确认可用的云模型。请检查健康状态，并按你的预算手动试调用。","No recently confirmed cloud model is available. Check health and make a manual test call within your budget."],
  TEAM_SLUG_CONFLICT: ["此小队标识已被使用，请选择其他标识。", "This team slug is already in use. Choose another slug."],
  TEAM_PUBLISHED: ["已发布版本不能改名或删除。可以修改草稿、发布新修订，或停用旧版本。", "Published recipes cannot be renamed or deleted. Edit the draft, publish a new revision, or disable an old version."],
  TEAM_RECIPE_UNAVAILABLE: ["小队依赖、步骤或执行预算尚未就绪，草稿已保留。", "Team dependencies, steps or execution budget are not ready. The draft is retained."],
  INVALID_INPUT: [zh.invalid, en.invalid],
  CONFIG_CONFLICT: ["配置已由其他入口修改，本次修改未写入，草稿仍保留。若正在编辑，请先记下需要保留的非敏感修改，取消编辑后刷新，再核对最新配置并重新编辑。", "Configuration changed elsewhere; this change was not saved and the draft is retained. If editing, note any non-sensitive changes you want to keep, cancel editing, then refresh and review the latest configuration before editing again."],
  STORAGE_UNAVAILABLE: ["本机配置存储不可用，未确认保存成功。请检查磁盘空间与权限。", "Local configuration storage is unavailable. Check disk space and permissions; save is not confirmed."],
  CREDENTIAL_STORE_UNAVAILABLE: ["凭据缺失或系统凭据库不可用。请检查密钥及系统凭据设施后重试，不会改用明文保存。", "The credential is missing or the system credential store is unavailable. Check the configured key and system credential store, then retry. No plaintext fallback is used."],
  INCOMPATIBLE_VERSION: ["程序、协议或配置结构版本不兼容。更新中断时，请退出所有 Tagma 入口，重新安装同一完整版本；较新配置需使用支持它的版本，勿强制降级。", "Incompatible application, protocol or schema version. After an interrupted update, quit all Tagma instances and reinstall the same complete version. Newer configuration requires a compatible version; do not force a downgrade."],
  MAINTENANCE_IN_PROGRESS: ["配置正在维护或迁移，请完成维护后重试。", "Configuration maintenance is in progress. Complete it before retrying."],
  DESKTOP_REQUIRED: [zh.previewHint, en.previewHint],
  INTERNAL_ERROR: ["本机操作失败，请刷新并检查诊断。", "The local operation failed. Refresh and check diagnostics."],
  PORT_IN_USE: ["配置端口已被占用。请处理已知程序或显式修改端口；不会终止占用程序或自动换端口。", "The configured port is in use. Resolve the known owner or explicitly change the port."],
  ALREADY_RUNNING: ["同一配置目录已有网关正在启动，请刷新状态。", "A gateway is already starting for this configuration. Refresh its status."],
  GATEWAY_UNAVAILABLE: ["网关或私有管理通道不可用，请检查安装及运行状态。", "The gateway or private management channel is unavailable. Check the installation and status."],
  CONFIG_APPLY_FAILED: ["配置已保存，运行中尚未应用。请修复错误后重试。", "Configuration is saved but not applied. Resolve the error and retry."],
  OWNERSHIP_REQUIRED: ["此实例由外部入口拥有，本窗口不能停止它。", "This window does not own the gateway and cannot stop it."],
  STARTUP_TIMEOUT: ["网关启动超过10秒，已回收本次启动的子进程。请检查诊断后重试。", "Gateway startup exceeded 10 seconds. The owned child was reclaimed. Check diagnostics before retrying."],
  INITIALIZATION_RECOVERY_REQUIRED:["初始化记录损坏，原记录与数据已保护。请到设置查看诊断及可用恢复操作。","The initialization record is damaged and has been preserved. Open Settings for diagnostics and available recovery actions."],
  PROFILE_REFERENCED:["此 App 档案正用于自动选脑。请先修改顺序来源，再删除档案。","This App profile supplies automatic brain ordering. Change the order source before deleting it."],
  PROVIDER_REFERENCED:[zh.referenceHint,en.referenceHint],
  RESTART_REQUIRED:[zh.portHint,en.portHint],
};
export function errorCopy(error: unknown, language: ProductLanguage): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String(error.code);
    if (code === "CONFIRMATION_TIMEOUT") return copy(language).timeout;
    if (code === "USAGE_CLEAR_STATE_UNAVAILABLE") return language === "zh" ? "本地核实记录不可读或不可保存。请检查存储后重新进入用量页；已发送请求的结果仍可能未确认。" : "Local verification state cannot be read or saved. Check storage, then reopen Usage; an already sent operation may remain unconfirmed.";
    if (code === "NATIVE_THEME_UNCONFIRMED") return language === "zh" ? "页面外观已设置，原生窗口外观尚未确认。请重试或检查诊断。" : "Page appearance changed; native window appearance is not confirmed. Retry or check diagnostics.";
    if (code in errors) return errors[code as ErrorCode][language === "zh" ? 0 : 1];
  }
  return errors.INTERNAL_ERROR[language === "zh" ? 0 : 1];
}
