/** Demo ledger / sessions / context — Magpie DOM shapes, fake numbers. */

export type LedRow = {
  id: string;
  t: number;
  agent: string;
  agentName: string;
  icon: string;
  req: string;
  /** Magpie Sent column (outbound model). */
  model?: string;
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
  /** Magpie cost cell price-reference line (hidden under .led.tighter). */
  pricing_model?: string;
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
    model: "claude-sonnet-4-5",
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
    pricing_model: "claude-sonnet-4-5",
    source: "gateway",
  },
  {
    id: "r2",
    t: Date.now() - 22 * 60_000,
    agent: "codex",
    agentName: "Codex",
    icon: "codex",
    req: "gpt-5",
    model: "gpt-5",
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
    pricing_model: "gpt-5",
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
    model: "gemini-2.5-pro",
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
    pricing_model: "gemini-2.5-pro",
    source: "log",
  },
  {
    id: "r5",
    t: Date.now() - 8 * 3600_000,
    agent: "codex",
    agentName: "Codex",
    icon: "codex",
    req: "o4-mini",
    model: "o4-mini",
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
    pricing_model: "o4-mini",
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

/** Heat day — Magpie /api/usage/heatmap shape (demo). */
export type HeatDay = { date: string; calls: number; tokens: number; cost: number };

/** ISO date local YYYY-MM-DD */
export function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Last 53 weeks Mon→Sun grid ending this week (Magpie #1369). */
export function buildDemoHeat(): { from: string; to: string; days: HeatDay[] } {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  // end = end of current week (Sunday), Magpie uses gateway TZ; demo local
  const dow = (today.getDay() + 6) % 7; // Mon=0
  const end = new Date(today);
  end.setDate(today.getDate() + (6 - dow));
  const start = new Date(end);
  start.setDate(end.getDate() - 53 * 7 + 1); // 53 weeks inclusive of end week
  // align start to Monday
  const sd = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - sd);

  const days: HeatDay[] = [];
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = isoDay(d);
    // deterministic pseudo activity — denser recent weeks
    const age = Math.floor((end.getTime() - d.getTime()) / 86400000);
    const seed = (d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) % 97;
    const active = seed % 5 !== 0 && (age < 40 || seed % 3 === 0);
    if (!active) {
      days.push({ date, calls: 0, tokens: 0, cost: 0 });
      continue;
    }
    const calls = 1 + (seed % 12) + (age < 14 ? seed % 8 : 0);
    const tokens = calls * (800 + (seed % 40) * 120);
    const cost = Math.round(tokens * 0.0000032 * 10000) / 10000;
    days.push({ date, calls, tokens, cost });
  }
  return { from: isoDay(start), to: isoDay(end), days };
}

/** Quartile / share levels — Magpie sessLevels */
export function heatLevels(values: number[]): (v: number) => number {
  const nz = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (!nz.length) return () => 0;
  if (nz.length < 8) {
    const most = nz[nz.length - 1];
    return (v) => (v <= 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((4 * v) / most - 1e-9))));
  }
  const q = (p: number) => nz[Math.min(nz.length - 1, Math.floor(p * nz.length))];
  const [a, b, c, top] = [q(0.25), q(0.5), q(0.75), nz[nz.length - 1]];
  return (v) => (v <= 0 ? 0 : v >= top ? 4 : v <= a ? 1 : v <= b ? 2 : v <= c ? 3 : 4);
}

export type SessDetail = {
  id: string;
  start: number;
  last: number;
  cwd: string;
  resume: string;
  path: string;
  models: { model: string; input: number; output: number; cache_read: number; cost: number; priced: boolean }[];
  via: { provider: string; model: string; effort?: string; calls: number; tokens: number }[];
};

export function demoSessDetail(s: (typeof DEMO_SESSIONS)[number]): SessDetail {
  return {
    id: `sess_${s.id}_demo`,
    start: s.last - 45 * 60_000,
    last: s.last,
    cwd: s.cwd.startsWith("~") ? s.cwd : `/home/demo/${s.cwd}`,
    resume: s.agent === "claude" ? `claude --resume ${s.id}` : `codex resume ${s.id}`,
    path: `~/.${s.agent === "claude" ? "claude" : s.agent}/projects/${s.id}.jsonl`,
    models: [
      {
        model: s.models.split("→")[0].trim(),
        input: s.input,
        output: s.output,
        cache_read: s.cache_read,
        cost: s.cost,
        priced: true,
      },
    ],
    via: [
      {
        provider: s.agent === "codex" ? "openai" : "anthropic",
        model: s.models.split("→").pop()!.trim(),
        effort: s.agent === "claude" ? "high" : undefined,
        calls: 3 + (s.id.charCodeAt(1) % 5),
        tokens: s.input + s.output,
      },
    ],
  };
}

/** Extra sessions for Show more paging demo */
export const DEMO_SESSIONS_MORE: typeof DEMO_SESSIONS = [
  {
    id: "s5",
    title: "Heatmap scroll keep-end",
    agent: "claude",
    icon: "claude",
    cwd: "internal/usage",
    models: "claude-sonnet-4-5",
    last: Date.now() - 5 * 86400_000,
    input: 33_000,
    output: 7_100,
    cache_read: 4_000,
    cost: 0.08,
  },
  {
    id: "s6",
    title: "Routing stage wire",
    agent: "codex",
    icon: "codex",
    cwd: "assets",
    models: "gpt-5",
    last: Date.now() - 8 * 86400_000,
    input: 21_000,
    output: 4_400,
    cache_read: 0,
    cost: 0.05,
  },
  {
    id: "s7",
    title: "Providers fold persist",
    agent: "claude",
    icon: "claude",
    cwd: "src/pages",
    models: "claude-haiku-4-5",
    last: Date.now() - 11 * 86400_000,
    input: 15_000,
    output: 3_200,
    cache_read: 2_100,
    cost: 0.03,
  },
  {
    id: "s8",
    title: "(no prompt)",
    agent: "pi",
    icon: "generic",
    cwd: "~",
    models: "llama3.2",
    last: Date.now() - 14 * 86400_000,
    input: 8_000,
    output: 1_100,
    cache_read: 0,
    cost: 0,
  },
];

/** Overview summary — Magpie renderUsage tile/chart/list shapes (demo filled). */
export type OverviewPoint = { label: string; time?: number; input: number; output: number; calls: number; cost: number };
export type OverviewGroup = {
  id: string;
  name: string;
  icon: string;
  input: number;
  output: number;
  cache_read: number;
  cache_write?: number;
  calls: number;
  errors?: number;
  retried?: number;
  cost: number;
  sub?: string;
};

export type OverviewSummary = {
  input: number;
  output: number;
  cache_read: number;
  cache_write: number;
  reasoning: number;
  calls: number;
  errors: number;
  retried: number;
  unpriced: number;
  cost: number;
  bucket: "hour" | "day" | "week";
  series: OverviewPoint[];
  agents: OverviewGroup[];
  models: OverviewGroup[];
  accounts: OverviewGroup[];
  path: string;
};

const tokensOfRow = (r: { input: number; output: number }) => r.input + r.output;

/** Build Magpie-shaped Overview from DEMO_LEDGER (+ synthetic series). */
export function buildDemoOverview(period = "today"): OverviewSummary {
  const rows = DEMO_LEDGER.filter((r) => r.status !== "rej");
  const input = rows.reduce((n, r) => n + r.in, 0);
  const output = rows.reduce((n, r) => n + r.out, 0);
  const cache_read = rows.reduce((n, r) => n + r.cache_read, 0);
  const cache_write = rows.reduce((n, r) => n + r.cache_write, 0);
  const cost = rows.reduce((n, r) => n + r.cost, 0);
  const errors = DEMO_LEDGER.filter((r) => r.status === "err").length;
  const calls = rows.length;

  // Hourly bars for today / day bars otherwise — Magpie u.series
  const series: OverviewPoint[] = [];
  if (period === "today" || period === "yesterday") {
    for (let h = 0; h < 24; h++) {
      const hit = rows.filter((r) => new Date(r.t).getHours() === h);
      const inp = hit.reduce((n, r) => n + r.in, 0) || (h >= 9 && h <= 18 && h % 3 === 0 ? 1200 + h * 40 : 0);
      const out = hit.reduce((n, r) => n + r.out, 0) || (inp ? Math.round(inp * 0.14) : 0);
      series.push({
        label: String(h).padStart(2, "0"),
        input: inp,
        output: out,
        calls: hit.length || (inp ? 1 : 0),
        cost: hit.reduce((n, r) => n + r.cost, 0),
      });
    }
  } else {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 14;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(12, 0, 0, 0);
      const seed = (d.getDate() * 17 + d.getMonth() * 3) % 11;
      const scale = i < 3 ? 1.4 : 0.7 + (seed % 5) * 0.12;
      const inp = Math.round((input / Math.max(3, days / 4)) * scale * (0.4 + (seed % 7) * 0.1));
      const out = Math.round(inp * 0.15);
      series.push({
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        time: d.getTime(),
        input: inp,
        output: out,
        calls: Math.max(1, Math.round(calls * scale * 0.3)),
        cost: Math.round(cost * scale * 0.2 * 10000) / 10000,
      });
    }
  }

  const byAgent = new Map<string, OverviewGroup>();
  for (const r of rows) {
    const g = byAgent.get(r.agent) || {
      id: r.agent,
      name: r.agentName,
      icon: r.icon,
      input: 0,
      output: 0,
      cache_read: 0,
      cache_write: 0,
      calls: 0,
      errors: 0,
      cost: 0,
    };
    g.input += r.in;
    g.output += r.out;
    g.cache_read += r.cache_read;
    g.cache_write = (g.cache_write || 0) + r.cache_write;
    g.calls += 1;
    g.cost += r.cost;
    if (r.status === "err") g.errors = (g.errors || 0) + 1;
    byAgent.set(r.agent, g);
  }

  const byModel = new Map<string, OverviewGroup>();
  for (const r of rows) {
    const id = r.served || r.req;
    const g = byModel.get(id) || {
      id,
      name: id,
      icon: "generic",
      input: 0,
      output: 0,
      cache_read: 0,
      cache_write: 0,
      calls: 0,
      cost: 0,
      sub: r.providerName,
    };
    g.input += r.in;
    g.output += r.out;
    g.cache_read += r.cache_read;
    g.cache_write = (g.cache_write || 0) + r.cache_write;
    g.calls += 1;
    g.cost += r.cost;
    byModel.set(id, g);
  }

  const agents = [...byAgent.values()].sort((a, b) => tokensOfRow(b) - tokensOfRow(a));
  const models = [...byModel.values()].sort((a, b) => tokensOfRow(b) - tokensOfRow(a));

  return {
    input,
    output,
    cache_read,
    cache_write,
    reasoning: Math.round(output * 0.22),
    calls,
    errors,
    retried: 1,
    unpriced: 0,
    cost,
    bucket: period === "today" || period === "yesterday" ? "hour" : "day",
    series,
    agents,
    models,
    accounts: [
      {
        id: "acct-demo",
        name: "demo@example.com",
        icon: "anthropic",
        input: Math.round(input * 0.62),
        output: Math.round(output * 0.55),
        cache_read: Math.round(cache_read * 0.7),
        calls: Math.max(1, Math.round(calls * 0.6)),
        cost: Math.round(cost * 0.58 * 10000) / 10000,
        sub: "Anthropic",
      },
    ],
    path: "~/.magpie/usage",
  };
}

export function tokensOf(u: { input: number; output: number }): number {
  return u.input + u.output;
}

/** Magpie ledger trend series point — app.js drawLedColumns `l.series` shape (demo). */
export type LedTrendPart = {
  calls: number;
  tokens: number;
  cost: number;
  name?: string;
  /** Magpie usage.Totals.Speed fields — ledSpeed (app.js L17884). */
  decode_out?: number;
  decode_ms?: number;
  timed?: number;
  ttft_ms?: number;
};
export type LedTrendPoint = {
  time: string; // ISO day or hour
  calls: number;
  tokens: number;
  cost: number;
  decode_out?: number;
  decode_ms?: number;
  timed?: number;
  ttft_ms?: number;
  by: Record<string, Record<string, LedTrendPart>>;
};
export type LedTrendCat = {
  id: string;
  name: string;
  calls: number;
  tokens: number;
  cost: number;
  decode_out?: number;
  decode_ms?: number;
};
export type LedTrend = {
  bucket: "hour" | "day";
  series: LedTrendPoint[];
  by: Record<string, LedTrendCat[]>;
};

/** Magpie app.js ledSpeed L17884 — tok/s after first token; 0 if none timed. */
export function ledSpeed(x: { decode_ms?: number; decode_out?: number } | undefined): number {
  return x && x.decode_ms && x.decode_ms > 0 ? (1000 * (x.decode_out || 0)) / x.decode_ms : 0;
}

/** Magpie app.js ledTTFT L17910 */
export function ledTTFT(x: { timed?: number; ttft_ms?: number } | undefined): number {
  return x && x.timed && x.timed > 0 ? (x.ttft_ms || 0) / x.timed : 0;
}

const emptyPart = (): LedTrendPart => ({ calls: 0, tokens: 0, cost: 0 });

/** Build Magpie-shaped ledger chart series from DEMO_LEDGER (+ synthetic days). */
export function buildDemoLedTrend(): LedTrend {
  const rows = DEMO_LEDGER.filter((r) => r.status !== "rej");
  const days = 12;
  const series: LedTrendPoint[] = [];
  const byAgent = new Map<string, LedTrendCat>();
  const byModel = new Map<string, LedTrendCat>();
  const byProvider = new Map<string, LedTrendCat>();

  const bump = (
    map: Map<string, LedTrendCat>,
    id: string,
    name: string,
    calls: number,
    tokens: number,
    cost: number,
    decode_out: number,
    decode_ms: number,
  ) => {
    const g = map.get(id) || { id, name, calls: 0, tokens: 0, cost: 0, decode_out: 0, decode_ms: 0 };
    g.calls += calls;
    g.tokens += tokens;
    g.cost += cost;
    g.decode_out = (g.decode_out || 0) + decode_out;
    g.decode_ms = (g.decode_ms || 0) + decode_ms;
    map.set(id, g);
  };

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const seed = (d.getDate() * 17 + d.getMonth() * 3 + i) % 11;
    const scale = i < 3 ? 1.35 : 0.55 + (seed % 5) * 0.14;
    // Seed from real ledger rows cycling, then scale
    const hit = rows.length ? rows[i % rows.length] : null;
    const agents: Record<string, LedTrendPart> = {};
    const models: Record<string, LedTrendPart> = {};
    const providers: Record<string, LedTrendPart> = {};

    const addPart = (
      bag: Record<string, LedTrendPart>,
      id: string,
      name: string,
      calls: number,
      tokens: number,
      cost: number,
      decode_out: number,
      decode_ms: number,
      ttft_ms: number,
      timed: number,
    ) => {
      const p = bag[id] || emptyPart();
      p.calls += calls;
      p.tokens += tokens;
      p.cost += cost;
      p.decode_out = (p.decode_out || 0) + decode_out;
      p.decode_ms = (p.decode_ms || 0) + decode_ms;
      p.ttft_ms = (p.ttft_ms || 0) + ttft_ms;
      p.timed = (p.timed || 0) + timed;
      p.name = name;
      bag[id] = p;
    };

    // 2–3 synthetic slices per day so stacked columns match Magpie split gold
    // speedTok: varied so some marks sit above the day's aggregate (stems, #860)
    const slices = [
      {
        agent: hit?.agent || "claude",
        agentName: hit?.agentName || "Claude Code",
        model: hit?.served || hit?.req || "claude-sonnet-4-5",
        provider: hit?.providerName || "Anthropic",
        w: 0.55 + (seed % 3) * 0.05,
        speedTok: 72 + (seed % 5) * 4,
      },
      {
        agent: "codex",
        agentName: "Codex",
        model: "gpt-5",
        provider: "OpenAI",
        w: 0.28 + (seed % 2) * 0.04,
        speedTok: 95 + (seed % 4) * 8,
      },
      {
        agent: "opencode",
        agentName: "OpenCode",
        model: "gemini-2.5-pro",
        provider: "Google",
        w: 0.12,
        speedTok: 130 + (seed % 3) * 18,
      },
    ];
    let calls = 0;
    let tokens = 0;
    let cost = 0;
    let decode_out = 0;
    let decode_ms = 0;
    let ttft_ms = 0;
    let timed = 0;
    const baseCalls = Math.max(1, Math.round((2 + (seed % 4)) * scale));
    const baseTok = Math.round((hit ? hit.in + hit.out : 8000) * scale * (0.5 + (seed % 5) * 0.1));
    const baseCost = (hit?.cost || 0.04) * scale * (0.6 + (seed % 4) * 0.12);
    for (const s of slices) {
      const c = Math.max(0, Math.round(baseCalls * s.w));
      const tok = Math.max(0, Math.round(baseTok * s.w));
      const $ = Math.round(baseCost * s.w * 10000) / 10000;
      if (!(c || tok || $)) continue;
      // Magpie decode_out ≈ streamed completion tokens; ms from target tok/s
      const dout = Math.max(1, Math.round(tok * 0.22));
      const dms = Math.max(1, Math.round((1000 * dout) / s.speedTok));
      const tms = Math.round((180 + (seed % 7) * 40) * c);
      const tn = Math.max(1, c);
      addPart(agents, s.agent, s.agentName, c, tok, $, dout, dms, tms, tn);
      addPart(models, s.model, s.model, c, tok, $, dout, dms, tms, tn);
      addPart(providers, s.provider, s.provider, c, tok, $, dout, dms, tms, tn);
      bump(byAgent, s.agent, s.agentName, c, tok, $, dout, dms);
      bump(byModel, s.model, s.model, c, tok, $, dout, dms);
      bump(byProvider, s.provider, s.provider, c, tok, $, dout, dms);
      calls += c;
      tokens += tok;
      cost += $;
      decode_out += dout;
      decode_ms += dms;
      ttft_ms += tms;
      timed += tn;
    }
    series.push({
      time: iso + "T12:00:00",
      calls,
      tokens,
      cost: Math.round(cost * 10000) / 10000,
      decode_out,
      decode_ms,
      ttft_ms,
      timed,
      by: { agent: agents, model: models, provider: providers },
    });
  }

  const sortCats = (m: Map<string, LedTrendCat>) =>
    [...m.values()].sort((a, b) => b.tokens - a.tokens || b.calls - a.calls);

  return {
    bucket: "day",
    series,
    by: {
      agent: sortCats(byAgent),
      model: sortCats(byModel),
      provider: sortCats(byProvider),
    },
  };
}
