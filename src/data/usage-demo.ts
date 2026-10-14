/** Demo ledger / sessions / context — Magpie DOM shapes, fake numbers. */

export type LedRow = {
  id: string;
  t: number;
  agent: string;
  agentName: string;
  icon: string;
  req: string;
  providerName: string;
  host?: string;
  in: number;
  out: number;
  cache_write: number;
  cache_read: number;
  cost: number;
  ms: number;
  speed?: number;
  status: "ok" | "err" | "rej";
  effort?: string;
  served?: string;
  source?: "gateway" | "log";
};

export const DEMO_LEDGER: LedRow[] = [
  {
    id: "r1",
    t: Date.now() - 4 * 60_000,
    agent: "claude",
    agentName: "Claude Code",
    icon: "claude",
    req: "claude-sonnet-4-5",
    providerName: "Anthropic",
    host: "api.anthropic.com",
    in: 12_400,
    out: 1_820,
    cache_write: 0,
    cache_read: 8_200,
    cost: 0.0482,
    ms: 4_120,
    speed: 86,
    status: "ok",
    effort: "high",
    served: "claude-sonnet-4-5",
    source: "gateway",
  },
  {
    id: "r2",
    t: Date.now() - 22 * 60_000,
    agent: "codex",
    agentName: "Codex",
    icon: "codex",
    req: "gpt-5",
    providerName: "OpenAI",
    host: "api.openai.com",
    in: 6_100,
    out: 940,
    cache_write: 1_200,
    cache_read: 0,
    cost: 0.031,
    ms: 2_880,
    speed: 72,
    status: "ok",
    served: "gpt-5",
    source: "gateway",
  },
  {
    id: "r3",
    t: Date.now() - 55 * 60_000,
    agent: "claude",
    agentName: "Claude Code",
    icon: "claude",
    req: "claude-haiku-4-5",
    providerName: "Anthropic",
    host: "api.anthropic.com",
    in: 3_200,
    out: 0,
    cache_write: 0,
    cache_read: 0,
    cost: 0,
    ms: 890,
    status: "err",
    source: "gateway",
  },
  {
    id: "r4",
    t: Date.now() - 3 * 3600_000,
    agent: "opencode",
    agentName: "OpenCode",
    icon: "generic",
    req: "gemini-2.5-pro",
    providerName: "Google",
    in: 18_900,
    out: 2_400,
    cache_write: 0,
    cache_read: 4_100,
    cost: 0.062,
    ms: 6_540,
    speed: 54,
    status: "ok",
    served: "gemini-2.5-pro",
    source: "log",
  },
  {
    id: "r5",
    t: Date.now() - 8 * 3600_000,
    agent: "codex",
    agentName: "Codex",
    icon: "codex",
    req: "o4-mini",
    providerName: "OpenAI",
    in: 2_100,
    out: 410,
    cache_write: 0,
    cache_read: 0,
    cost: 0.0044,
    ms: 1_450,
    speed: 98,
    status: "ok",
    served: "o4-mini",
    source: "gateway",
  },
];

export const DEMO_SESS_KPIS = [
  { label: "Sessions", value: "12", sub: "4 agents" },
  { label: "Active time", value: "6.4", unit: "h", sub: "median 28 min" },
  { label: "Tokens", value: "1.84M", sub: "1.12M in · 720K out" },
  { label: "Cost", value: "≈$4.82", sub: "effective prices" },
  { label: "Messages", value: "186", sub: "avg 15 / session" },
  { label: "Compactions", value: "3", sub: "2 sessions" },
] as const;

export type SessRow = {
  id: string;
  title: string;
  agent: string;
  icon: string;
  cwd: string;
  models: string;
  last: number;
  input: number;
  output: number;
  cache_read: number;
  cost: number;
};

export const DEMO_SESSIONS: SessRow[] = [
  {
    id: "s1",
    title: "Refactor gateway auth",
    agent: "claude",
    icon: "claude",
    cwd: "magpie-shell-demo",
    models: "claude-sonnet-4-5",
    last: Date.now() - 12 * 60_000,
    input: 420_000,
    output: 88_000,
    cache_read: 210_000,
    cost: 1.24,
  },
  {
    id: "s2",
    title: "Usage ledger columns",
    agent: "codex",
    icon: "codex",
    cwd: "internal/gui",
    models: "gpt-5 → claude-sonnet-4-5",
    last: Date.now() - 2 * 3600_000,
    input: 190_000,
    output: 41_000,
    cache_read: 0,
    cost: 0.86,
  },
  {
    id: "s3",
    title: "(no prompt)",
    agent: "opencode",
    icon: "generic",
    cwd: "~",
    models: "gemini-2.5-pro",
    last: Date.now() - 26 * 3600_000,
    input: 62_000,
    output: 9_400,
    cache_read: 12_000,
    cost: 0.19,
  },
  {
    id: "s4",
    title: "Plugin install flow",
    agent: "claude",
    icon: "claude",
    cwd: "plugins",
    models: "claude-haiku-4-5",
    last: Date.now() - 3 * 86400_000,
    input: 48_000,
    output: 11_200,
    cache_read: 8_000,
    cost: 0.11,
  },
];

export type CtxAgent = {
  agent: string;
  name: string;
  icon: string;
  score: number;
  requests: number;
  sessions: number;
  scores: { key: string; name: string; points: number; most: number }[];
  tags: { key: string; label: string; tone: string }[];
  median: string;
  p90: string;
  baseline: string;
  growth: string;
  cache: string;
  window: string;
  shares: { k: string; name: string; v: number }[];
  models: string[];
};

export const DEMO_CTX_AGENTS: CtxAgent[] = [
  {
    agent: "claude",
    name: "Claude Code",
    icon: "claude",
    score: 82,
    requests: 48,
    sessions: 5,
    scores: [
      { key: "fill", name: "Headroom", points: 18, most: 20 },
      { key: "cache", name: "Cache", points: 16, most: 20 },
      { key: "mix", name: "Mix", points: 14, most: 20 },
      { key: "growth", name: "Growth", points: 12, most: 20 },
      { key: "tools", name: "Tools", points: 11, most: 20 },
      { key: "files", name: "Files", points: 11, most: 20 },
    ],
    tags: [
      { key: "cache-hot", label: "Cache-friendly", tone: "good" },
      { key: "tools-heavy", label: "Tool-heavy", tone: "info" },
    ],
    median: "48K",
    p90: "112K",
    baseline: "14K",
    growth: "+6.2K",
    cache: "64%",
    window: "200K",
    shares: [
      { k: "system", name: "System", v: 0.12 },
      { k: "tools", name: "Tools", v: 0.18 },
      { k: "memory", name: "Memory", v: 0.08 },
      { k: "files", name: "Files", v: 0.22 },
      { k: "results", name: "Tool results", v: 0.16 },
      { k: "chat", name: "Conversation", v: 0.24 },
    ],
    models: ["claude-sonnet-4-5", "claude-haiku-4-5"],
  },
  {
    agent: "codex",
    name: "Codex",
    icon: "codex",
    score: 68,
    requests: 31,
    sessions: 4,
    scores: [
      { key: "fill", name: "Headroom", points: 14, most: 20 },
      { key: "cache", name: "Cache", points: 9, most: 20 },
      { key: "mix", name: "Mix", points: 15, most: 20 },
      { key: "growth", name: "Growth", points: 10, most: 20 },
      { key: "tools", name: "Tools", points: 10, most: 20 },
      { key: "files", name: "Files", points: 10, most: 20 },
    ],
    tags: [
      { key: "filling", label: "Filling up", tone: "warn" },
      { key: "chatty", label: "Long chats", tone: "info" },
    ],
    median: "72K",
    p90: "168K",
    baseline: "9K",
    growth: "+11K",
    cache: "28%",
    window: "200K",
    shares: [
      { k: "system", name: "System", v: 0.08 },
      { k: "tools", name: "Tools", v: 0.14 },
      { k: "files", name: "Files", v: 0.2 },
      { k: "results", name: "Tool results", v: 0.18 },
      { k: "chat", name: "Conversation", v: 0.4 },
    ],
    models: ["gpt-5", "o4-mini"],
  },
];

export function fmtN(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.0+$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0+$/, "") + "K";
  return String(Math.round(n));
}

export function fmtCost(n: number): string {
  if (!n) return "—";
  return "≈$" + n.toFixed(n >= 1 ? 2 : 4);
}

export function ago(t: number): string {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export function ledTime(t: number): string {
  return new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
