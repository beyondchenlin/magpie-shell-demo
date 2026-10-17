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
  notAvailable: "Unavailable in this slice", runtimeHint: "The process lifecycle is the next P0 slice. No model inference is connected.",
  language: "Language", theme: "Theme", system: "System", light: "Light", dark: "Dark", size: "Text size", coverage: "This language is retained; new product text currently uses English fallback.",
  cleanup: "Credential cleanup is pending; retry after unlocking the credential store.", retry: "Retry", invalid: "Check the name, URL and model IDs. HTTPS is required except for localhost. Reserved tagma/ IDs are not allowed.",
  error: "Operation failed", timeout: "Confirmation timed out. The operation may still finish; refresh before retrying.", preferencesError: "Appearance changed for this session, but could not be saved.",
  cancelHint: "Cancel discards this unsaved form.", diagnostics: "Diagnostics", version: "Version", schema: "Schema", noInference: "Model inference not connected",
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
  notAvailable: "本切片尚未开放", runtimeHint: "进程生命周期是下一条 P0 切片。模型推理尚未接入。",
  language: "语言", theme: "主题", system: "跟随系统", light: "浅色", dark: "深色", size: "文字大小", coverage: "已保留此语言选项；新增产品文案暂以英文显示。",
  cleanup: "有凭据清理待处理；请解锁凭据库后重试。", retry: "重试", invalid: "请检查名称、地址和模型 ID。除 localhost 外必须使用 HTTPS，不允许保留的 tagma/ 模型 ID。",
  error: "操作失败", timeout: "确认超时。操作可能仍会完成，请先刷新再重试。", preferencesError: "外观已在本次会话应用，但未能保存。",
  cancelHint: "取消将丢弃此表单中尚未保存的修改。", diagnostics: "诊断", version: "版本", schema: "配置结构", noInference: "模型推理尚未接入",
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
};
export function errorCopy(error: unknown, language: ProductLanguage): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String(error.code);
    if (code === "CONFIRMATION_TIMEOUT") return copy(language).timeout;
    if (code in errors) return errors[code as ErrorCode][language === "zh" ? 0 : 1];
  }
  return errors.INTERNAL_ERROR[language === "zh" ? 0 : 1];
}
