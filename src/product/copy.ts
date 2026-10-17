import type { ErrorCode } from "./contract";
import type { ProductLanguage } from "./preferences";

const en = {
  chat: "Chat", providers: "Providers", market: "Teammate market", gateway: "Gateway", settings: "Settings", back: "Back",
  loading: "Loading local configuration…", refresh: "Refresh", add: "Add provider", edit: "Edit", remove: "Delete", up: "Move up", down: "Move down",
  empty: "No providers configured", emptyHint: "Add your own provider. Configuration is stored locally; API keys use the system credential store.",
  name: "Name", url: "Base URL (including /v1)", models: "Model IDs (one per line)", key: "API key", keyHint: "Leave blank to retain the existing credential. It is never returned to this window.",
  protocol: "Protocol", protocolName: "OpenAI Chat Completions", enabled: "Enabled", save: "Save", saving: "Saving…", cancel: "Cancel", saved: "Saved; awaiting gateway application.",
  credentialPresent: "Credential stored", noCredential: "No credential", deleteTitle: "Delete provider?", deleteHint: "This removes the provider from new configuration. Previously used credentials are retained until safe reclamation is possible.", confirm: "Delete provider",
  notConnected: "Chat is not connected yet", chatHint: "Configure a provider first. Real chat will use the local gateway when its protocol slice is ready.", goProviders: "Configure providers",
  reachflow: "ReachFlow", reachflowHint: "Research teammate. Installation and execution are not available in this P0 slice.", notInstalled: "Not installed", teams: "Teams", teamsHint: "Cloud model recipes will be available in P1.",
  desired: "Saved revision", effective: "Running revision", unknown: "Not confirmed", stopped: "Stopped", native: "Native desktop", preview: "Web preview — local services unavailable",
  previewHint: "Open Tagma desktop to manage real providers and credentials. The preview does not read desktop configuration.",
  notAvailable: "Unavailable in this slice", runtimeHint: "Independent local process; model inference is not connected yet.",
  start: "Start gateway", stop: "Stop gateway", apply: "Apply saved configuration", running: "Running", starting: "Starting", stopping: "Stopping", degraded: "Degraded", failed: "Failed", owned: "Owned by this desktop", external: "Owned by another entrypoint", quit: "Quit Tagma",
  language: "Language", theme: "Theme", system: "System", light: "Light", dark: "Dark", size: "Text size", coverage: "This language is retained; new product text currently uses English fallback.",
  cleanup: "Credential cleanup is pending; retry after unlocking the credential store.", retry: "Retry", invalid: "Check the name, URL and model IDs. HTTPS is required except for localhost. Reserved tagma/ IDs are not allowed.",
  error: "Operation failed", timeout: "Confirmation timed out. The operation may still finish; refresh before retrying.", preferencesError: "Appearance changed for this session, but could not be saved.",
  cancelHint: "Cancel discards this unsaved form.", diagnostics: "Diagnostics", version: "Version", schema: "Schema", noInference: "Model inference not connected",
  diagnosticHint: "Preview redacted diagnostics before copying. No credentials, request bodies or databases are included.", copyDiagnostics:"Copy diagnostics", copied:"Copied", logsUnavailable:"The last diagnostic write was not confirmed. Check local storage and permissions.",
  recover:"Preserve damaged record and recover",recoverHint:"Archive only the damaged initialization record shown below. Other files are retained. Restart afterward to create a fresh configuration. An existing database will never be replaced.",recoverConfirm:"Archive record",recovered:"Record preserved. Quit and reopen Tagma to retry initialization.",
  profiles:"App profiles",globalProfile:"Global default order",profileHint:"Profiles reference providers and share their stored credentials. Independent ordering does not change the global order.",addProfile:"Add App profile",editProfile:"Edit App profile",targetApp:"Target App",inheritOrder:"Follow global order",providerSelection:"Referenced providers",profileEmpty:"No providers selected",profileDelete:"Delete App profile",referencedBy:"Referenced by these App profiles",referenceHint:"Edit or delete these profiles before removing the provider.",
};

const zh: typeof en = {
  chat: "对话", providers: "供应商", market: "队员市场", gateway: "网关", settings: "设置", back: "返回",
  loading: "正在读取本机配置…", refresh: "刷新", add: "添加供应商", edit: "编辑", remove: "删除", up: "上移", down: "下移",
  empty: "尚未配置供应商", emptyHint: "添加自己的供应商。配置保存在本机，API Key 使用系统凭据库。",
  name: "名称", url: "Base URL（包含 /v1）", models: "模型 ID（每行一个）", key: "API Key", keyHint: "留空保留现有凭据。窗口不会回读密钥。",
  protocol: "协议", protocolName: "OpenAI Chat Completions", enabled: "启用", save: "保存", saving: "正在保存…", cancel: "取消", saved: "已保存，待应用到网关。",
  credentialPresent: "凭据已存储", noCredential: "未配置凭据", deleteTitle: "删除供应商？", deleteHint: "从新配置中移除此供应商。已使用的凭据保留到能够安全回收时，不会提前删除。", confirm: "删除供应商",
  notConnected: "对话尚未接入", chatHint: "请先配置供应商。真实对话将在协议切片完成后经本机网关调用。", goProviders: "配置供应商",
  reachflow: "ReachFlow", reachflowHint: "研究队员。此 P0 切片尚不支持安装和执行。", notInstalled: "未安装", teams: "组合小队", teamsHint: "云模型配方将在 P1 接入。",
  desired: "已保存版本", effective: "运行中版本", unknown: "未确认", stopped: "已停止", native: "原生桌面", preview: "Web 预览 — 本机服务不可用",
  previewHint: "在 Tagma 桌面管理真实供应商和凭据。预览不读取桌面配置。",
  notAvailable: "本切片尚未开放", runtimeHint: "本机独立进程；模型推理尚未接入。",
  start: "启动网关", stop: "停止网关", apply: "应用已保存配置", running: "运行中", starting: "正在启动", stopping: "正在停止", degraded: "降级运行", failed: "失败", owned: "由本桌面拥有", external: "由其他入口拥有", quit: "退出 Tagma",
  language: "语言", theme: "主题", system: "跟随系统", light: "浅色", dark: "深色", size: "文字大小", coverage: "已保留此语言选项；新增产品文案暂以英文显示。",
  cleanup: "有凭据清理待处理；请解锁凭据库后重试。", retry: "重试", invalid: "请检查名称、地址和模型 ID。除 localhost 外必须使用 HTTPS，不允许保留的 tagma/ 模型 ID。",
  error: "操作失败", timeout: "确认超时。操作可能仍会完成，请先刷新再重试。", preferencesError: "外观已在本次会话应用，但未能保存。",
  cancelHint: "取消将丢弃此表单中尚未保存的修改。", diagnostics: "诊断", version: "版本", schema: "配置结构", noInference: "模型推理尚未接入",
  diagnosticHint: "先预览脱敏诊断，再复制。内容不含凭据、请求正文或数据库。", copyDiagnostics:"复制诊断", copied:"已复制", logsUnavailable:"最近一次诊断写入未确认，请检查本机存储和权限。",
  recover:"保留损坏记录并恢复",recoverHint:"仅归档下列损坏的初始化记录，其他文件保留。退出并重新打开后将创建新配置；不会替换已有数据库。",recoverConfirm:"归档记录",recovered:"记录已保留。请退出并重新打开 Tagma，重试初始化。",
  profiles:"App 配置档案",globalProfile:"全局默认顺序",profileHint:"档案引用供应商并共用已存凭据。独立排序不会修改全局顺序。",addProfile:"添加 App 档案",editProfile:"编辑 App 档案",targetApp:"目标 App",inheritOrder:"跟随全局顺序",providerSelection:"引用的供应商",profileEmpty:"未选择供应商",profileDelete:"删除 App 档案",referencedBy:"被以下 App 档案引用",referenceHint:"请先编辑或删除这些档案，再移除此供应商。",
};

export function copy(language: ProductLanguage) { return language === "zh" ? zh : en; }
const errors: Record<ErrorCode, [string, string]> = {
  INVALID_INPUT: [zh.invalid, en.invalid],
  CONFIG_CONFLICT: ["配置已由其他入口修改，编辑内容已保留。刷新后重新确认。", "Configuration changed elsewhere. Your edits are retained; refresh and review before saving."],
  STORAGE_UNAVAILABLE: ["本机配置存储不可用，未确认保存成功。请检查磁盘空间与权限。", "Local configuration storage is unavailable. Check disk space and permissions; save is not confirmed."],
  CREDENTIAL_STORE_UNAVAILABLE: ["系统凭据库不可用。请解锁或修复后重试，不会改用明文保存。", "Unlock or repair the system credential store, then retry. No plaintext fallback is used."],
  INCOMPATIBLE_VERSION: ["程序、协议或配置结构版本不兼容。请使用兼容版本，不要强制降级写入。", "Incompatible application, protocol or schema version. Use a compatible version; do not force a downgrade."],
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
  PROVIDER_REFERENCED:[zh.referenceHint,en.referenceHint],
};
export function errorCopy(error: unknown, language: ProductLanguage): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String(error.code);
    if (code === "CONFIRMATION_TIMEOUT") return copy(language).timeout;
    if (code in errors) return errors[code as ErrorCode][language === "zh" ? 0 : 1];
  }
  return errors.INTERNAL_ERROR[language === "zh" ? 0 : 1];
}
