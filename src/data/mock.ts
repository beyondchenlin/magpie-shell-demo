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
} as const;

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
