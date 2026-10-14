export type ViewId =
  | "agents"
  | "sessions"
  | "library"
  | "providers"
  | "routing"
  | "gateway"
  | "usage"
  | "plugins"
  | "settings";

export const NAV: {
  group: string;
  items: { id: ViewId; label: string; icon: string }[];
}[] = [
  {
    group: "使用",
    items: [
      { id: "agents", label: "Agent", icon: "agents" },
      { id: "sessions", label: "会话", icon: "sessions" },
      { id: "library", label: "资源库", icon: "library" },
    ],
  },
  {
    group: "模型",
    items: [
      { id: "providers", label: "供应商", icon: "providers" },
      { id: "routing", label: "路由", icon: "routing" },
      { id: "gateway", label: "网关", icon: "gateway" },
    ],
  },
  {
    group: "观测",
    items: [{ id: "usage", label: "用量", icon: "usage" }],
  },
  {
    group: "扩展",
    items: [{ id: "plugins", label: "插件", icon: "plugins" }],
  },
];

export type Agent = {
  id: string;
  name: string;
  icon: string;
  model: string;
  modelIcon?: string;
  effort: string;
  color: string;
};

export const AGENTS: Agent[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    icon: "/icons/claudecode-color.svg",
    model: "claude-sonnet-4",
    modelIcon: "/icons/claude-color.svg",
    effort: "高",
    color: "#d97706",
  },
  {
    id: "codex",
    name: "Codex",
    icon: "/icons/codex-color.svg",
    model: "gpt-5",
    modelIcon: "/icons/openai.svg",
    effort: "中",
    color: "#0ea5e9",
  },
  {
    id: "cursor",
    name: "Cursor",
    icon: "/icons/cursor.svg",
    model: "composer",
    modelIcon: "/icons/cursor.svg",
    effort: "默认",
    color: "#8b5cf6",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    icon: "/icons/geminicli-color.svg",
    model: "gemini-2.5-pro",
    modelIcon: "/icons/gemini-color.svg",
    effort: "低",
    color: "#4285f4",
  },
];

export type Provider = {
  id: string;
  name: string;
  icon: string;
  account: string;
  models: number;
  on: boolean;
};

export const PROVIDERS: Provider[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    icon: "/icons/anthropic.svg",
    account: "you@example.com",
    models: 6,
    on: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: "/icons/openai.svg",
    account: "sk-…7a2f",
    models: 8,
    on: true,
  },
  {
    id: "google",
    name: "Google",
    icon: "/icons/gemini-color.svg",
    account: "workspace",
    models: 4,
    on: true,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: "/icons/deepseek-color.svg",
    account: "api",
    models: 3,
    on: false,
  },
];

export const PROFILES = ["默认", "省钱", "最强"];

export const ROUTING_STATS = { requests: 1284, rerouted: 47, errors: 3 };
