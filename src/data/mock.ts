/** Magpie shell demo — IA + zh strings from Magpie i18n.js `zh` (not invented). */

export type ViewId =
  | "agents"
  | "providers"
  | "routing"
  | "gateway"
  | "usage"
  | "plugins"
  | "settings";

/** Official Magpie default nav: Sessions/Library are plugins (off) — not top-level. */
export const NAV: {
  group: string;
  groupEn: string;
  items: { id: ViewId; label: string; icon: string }[];
}[] = [
  {
    group: "使用",
    groupEn: "Work",
    items: [{ id: "agents", label: "Agent", icon: "agents" }],
  },
  {
    group: "模型",
    groupEn: "Models",
    items: [
      { id: "providers", label: "供应商", icon: "providers" },
      { id: "routing", label: "路由", icon: "routing" },
      { id: "gateway", label: "网关", icon: "gateway" },
    ],
  },
  {
    group: "观测",
    groupEn: "Insights",
    items: [{ id: "usage", label: "用量", icon: "usage" }],
  },
  {
    group: "扩展",
    groupEn: "Extend",
    items: [{ id: "plugins", label: "插件", icon: "plugins" }],
  },
];

export const TITLES: Record<ViewId, string> = {
  agents: "Agent",
  providers: "供应商",
  routing: "路由",
  gateway: "网关",
  usage: "用量",
  plugins: "插件",
  settings: "设置",
};

export const GROUP_OF: Partial<Record<ViewId, string>> = {
  agents: "使用",
  providers: "模型",
  routing: "模型",
  gateway: "模型",
  usage: "观测",
  plugins: "扩展",
};

/** Mock gateway listen — match official empty-state shots. */
export const GATEWAY_ADDR = "127.0.0.1:3425";

export const ZH = {
  getStarted: "快速上手",
  ofDone: "已完成 0/2",
  addModelSource: "添加模型来源",
  addModelSourceSay: "你已经付费的订阅、一个供应商，或一个 API 密钥",
  addProvider: "添加供应商",
  connectAgent: "接入一个 agent",
  connectAgentSay: "安装 Claude Code、Codex、Gemini CLI、OpenCode 等之后，会列在这里。",
  hideGetStarted: "隐藏快速上手",
  cantConnect: "不能接入",
  onlyCursorOwn: "只能用 Cursor 自己的模型",
  manage: "管理",
  installAnother: "安装其他 Agent（14）",
  profiles: "方案",
  profilesNone: "还没有 · 保存当前设置，之后一键切回",
  saveCurrent: "＋ 保存当前",
  addFirstProvider: "添加第一个供应商",
  findVendor: "查找供应商…",
  import: "导入…",
  subscriptions: "订阅",
  signInNoKey: "登录即可，无需密钥",
  vendors: "供应商",
  makersApis: "模型厂商的 API",
  relays: "中转",
  oneKeyMany: "一个密钥，多家模型",
  onThisMachine: "本机",
  anotherComputer: "另一台电脑上的 magpie",
  sharedNetwork: "在它的局域网上共享",
  moreInPlugins: "插件中还有更多",
  customProvider: "自定义供应商",
  anyCompatible: "任意 OpenAI / Anthropic 兼容的 URL",
  routing: "路由",
  liveAsGateway: "实时 · 网关正在做的决定",
  hideAccounts: "账号打码",
  waitingRequest: "等待请求",
  waitingSay:
    "经 magpie 的 Agent 发出请求后，这里实时播放：路由把谁排第一及原因、每次尝试和各自的回应。",
  yourAgent: "你的 Agent",
  noRequestYet: "还没有请求",
  everyRequest:
    "Agent 发给 magpie 的每个请求都会在此显示，均为真实路由。",
  requests: "请求",
  rerouted: "改道",
  errorsAgentSaw: "Agent 收到的错误",
  gateway: "网关",
  settings: "设置",
  newGroup: "新建组",
  manageAgents: "批量管理",
  manageAgentsAria: "批量管理",
  manageNote:
    "隐藏只改变列表显示，不影响 Agent 的接入或设置。取消隐藏后，Agent 仍可能留在「未设置」中。",
  searchAgents: "搜索 Agent…",
  selectSearchResults: "全选搜索结果",
  invertSearchSelection: "反选搜索结果",
  selectUnconnected: "选择未接入项",
  clearSelection: "清空选择",
  hideSelected: "隐藏所选",
  unhideSelected: "取消隐藏所选",
  done: "完成",
  notHidden: "未隐藏",
  hidden: "已隐藏",
  agentsSelected: "已选择 {n} 个 Agent",
  profileName: "方案名称",
  save: "保存",
  agentsLookedAgain: "已重新检测 Agent",
  syncAgentsTitle:
    "重新检测本机的 Agent：刚安装或卸载的，或在别处改过配置的",
  installNote:
    "在终端运行任一命令，安装后会列在这里。npm 命令需要 Node.js（nodejs.org）。",
  viaInstaller: "安装脚本",
  viaHomebrew: "Homebrew",
  viaNpm: "npm",
  copy: "复制",
  noMatchingAgents: "没有匹配的 Agent",
  agentHiddenN: "已隐藏 {n} 个 Agent",
  agentUnhiddenN: "已取消隐藏 {n} 个 Agent",
  installCmdCopied: "已复制{agent} 的安装命令",
  hiddenFold: "已隐藏（{n}）",
  showHidden: "你隐藏的 Agent · 点击查看",
  showAgain: "显示",
  showAgainTitle: "你隐藏了它 · 点击放回列表",
  cancel: "取消",
  add: "添加",
  show: "显示",
  getKey: "获取密钥 ↗",
  headers: "请求头",
  extraBody: "额外请求体",
  proxy: "代理",
  globalProxy: "全局代理",
  direct: "直连",
  custom: "自定义",
  followsProxy: "跟随设置里的代理",
  apiKey: "API 密钥",
  pasteKey: "粘贴 API 密钥",
  optionalLocal: "本地服务可不填",
  keyKept:
    "保存在 ~/.config/magpie/providers.json，仅你本人可读。不读取 shell 中的任何内容。",
  addHeader: "＋ 添加请求头",
  concurrency: "并发上限",
  rpm: "每分钟请求数",
  queueSize: "排队上限",
  queueWait: "排队等待",
  priceRate: "价格倍率",
  noLimit: "不限制",
  noBound: "不限",
  asLong: "一直等",
  priceOne: "1，即官方价格",
  contextWindow: "上下文窗口",
  maxOutput: "最大输出",
  endpoint: "终结点",
  serverAddress: "服务器地址",
  address: "地址",
  name: "名称",
  baseUrl: "API 地址",
  openaiCompat: "OpenAI 兼容",
  openaiResponses: "OpenAI Responses",
  anthropicCompat: "Anthropic 兼容",
  geminiCompat: "Gemini 兼容",
  systemOne: "System One",
  egRelay: "例如 My Relay",
  keyHeader: "密钥请求头",
  both: "两者都发",
  importApps: "从其他应用导入",
  importAppsNote:
    "magpie 只读取这些应用的配置，不会改动它们。勾选要导入的供应商。",
  notFound: "这台电脑上没有找到",
  importAction: "导入",
  claudeRiskTitle: "Claude 账号可能被封禁",
  claudeRiskNote:
    "Anthropic 可能封禁在其官方应用之外使用的 Claude 账号。magpie 的请求经 Claude Code 发出，但 Anthropic 仍可能采取措施，风险自负。请用丢了也不心疼的账号。",
  importInstead: "改为导入…",
  signInAnyway: "仍然登录",
  remoteNote: "远程：另一台电脑上的 magpie，局域网共享",
  remoteHint:
    "另一台电脑的 magpie 在「设置 → 局域网共享」中显示的地址和 API 密钥。其模型和路由组会列在这里；请求按 Agent 所用的 API 原样转发。",
  ollamaNote: "your local models",
  moveUp: "上移",
  moveDown: "下移",
  hide: "隐藏",
  arrangeTitle: "拖动以调整顺序 · 点击可移动或隐藏",
  arrangeAria: "调整 {agent}",
  providerAddedDemo: "演示：未真正保存供应商（无网络）",
  signInSkipped: "演示：未发起登录",
} as const;

export const VIA_LABEL: Record<string, string> = {
  script: "安装脚本",
  powershell: "PowerShell",
  brew: "Homebrew",
  npm: "npm",
};


/** Subscriptions row on empty Providers — subset matching official first-run shot. */
export const SUB_TILES: { id: string; name: string; icon: string }[] = [
  { id: "claude", name: "Claude", icon: "claude-color" },
  { id: "codex", name: "ChatGPT", icon: "openai" },
  { id: "chatgpt-api", name: "ChatGPT API", icon: "openai" },
  { id: "copilot", name: "Copilot", icon: "githubcopilot" },
  { id: "gemini-cli", name: "Gemini CLI", icon: "geminicli-color" },
  { id: "antigravity", name: "Antigravity", icon: "antigravity-color" },
];

export function iconSrc(name: string): string {
  if (name.endsWith(".png") || name.endsWith(".svg")) return `/icons/${name}`;
  // Magpie: pngIcons set for some; try svg then png
  return `/icons/${name}.svg`;
}
