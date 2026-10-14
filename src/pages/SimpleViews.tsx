import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LedHeat } from "../components/LedHeat";
import { Segs } from "../components/Segs";
import { useSegThumb } from "../components/SegThumb";
import { iconSrc } from "../data/mock";
import {
  DEMO_CTX_AGENTS,
  DEMO_LEDGER,
  DEMO_SESSIONS,
  DEMO_SESSIONS_MORE,
  DEMO_SESS_KPIS,
  ago,
  buildDemoOverview,
  demoSessDetail,
  fmtCost,
  fmtN,
  ledTime,
  tokensOf,
  type LedRow,
} from "../data/usage-demo";
import { demoCopy, t } from "../i18n";

const USAGE_TABS = [
  ["usage", "Overview"],
  ["requests", "Requests"],
  ["sessions", "Sessions"],
  ["context", "Context"],
] as const;

const PERIODS = [
  ["today", "Today"],
  ["7d", "7 days"],
  ["30d", "30 days"],
  ["all", "All"],
] as const;

const SESS_RANGES = [
  ["today", "Today"],
  ["7d", "7 days"],
  ["30d", "30 days"],
  ["90d", "90 days"],
  ["all", "All"],
] as const;

const USAGE_EVERY = [
  [0, "Off"],
  [5, "5 s"],
  [10, "10 s"],
  [30, "30 s"],
  [60, "1 min"],
] as const;

const LED_STATUS = [
  ["", "All"],
  ["failed", "Failed"],
  ["retried", "Retried"],
] as const;

const LED_METRIC = [
  ["calls", "Calls"],
  ["tokens", "Tokens"],
  ["cost", "Cost"],
] as const;

const LED_SPLIT = [
  ["none", "None"],
  ["agent", "Agent"],
  ["model", "Model"],
  ["provider", "Provider"],
] as const;

function noCallsIn(p: string) {
  if (p.includes("..")) return t("No calls on the days picked.");
  return t(
    (
      {
        today: "No calls today.",
        "7d": "No calls in the last 7 days.",
        "30d": "No calls in the last 30 days.",
        all: "No calls yet.",
      } as Record<string, string>
    )[p] || "No calls yet.",
  );
}

function RefreshSpin({ busy }: { busy: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={13}
      height={13}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={busy ? { animation: "spin .8s linear infinite" } : undefined}
    >
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" />
    </svg>
  );
}

function SessPick({
  label,
  open,
  onToggle,
  children,
  set,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children?: ReactNode;
  set?: boolean;
}) {
  return (
    <button
      type="button"
      className={`sess-pick${set ? " set" : ""}${open ? " open" : ""}`}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={label}
      onClick={onToggle}
    >
      <span>{label}</span>
      <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden>
        <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {children}
    </button>
  );
}

function ProtoMenu({
  open,
  onClose,
  items,
  value,
  onPick,
  title,
}: {
  open: boolean;
  onClose: () => void;
  items: { v: string; name: string; note?: string }[];
  value: string;
  onPick: (v: string) => void;
  title?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onDown, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onDown, true);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="pop proto-menu sess-menu"
      ref={ref}
      role="menu"
      aria-label={title}
      style={{ position: "absolute", top: "100%", right: 0, zIndex: 40, minWidth: 160 }}
    >
      {title ? <div className="pm-head">{t(title)}</div> : null}
      {items.map((it) => {
        const on = it.v === value;
        return (
          <button
            type="button"
            key={it.v}
            className={`pm-item${on ? " on" : ""}`}
            role="menuitemradio"
            aria-checked={on}
            onClick={() => {
              onPick(it.v);
              onClose();
            }}
          >
            <span className="pm-tick" aria-hidden>
              {on ? (
                <svg viewBox="0 0 16 16" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.2 8.2 6.4 11.4 12.8 4.2" />
                </svg>
              ) : null}
            </span>
            <span className="pm-words">
              <span className="pm-name">{t(it.name)}</span>
              {it.note ? <span className="pm-note">{t(it.note)}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function dayKeyOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dayOfKey(k: string) {
  return new Date(k + "T12:00:00");
}
function rangeName(from: string, to: string) {
  const year = new Date().getFullYear();
  const name = (k: string) =>
    dayOfKey(k).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      ...(dayOfKey(k).getFullYear() !== year ? { year: "numeric" as const } : {}),
    });
  return from === to ? name(from) : `${name(from)} – ${name(to)}`;
}

/** Magpie openRangeMenu: quick spans + month grid (first day then last). */
function RangeCalendar({
  current,
  onChoose,
  onClose,
}: {
  current: { from: string; to: string } | null;
  onChoose: (from: string, to: string) => void;
  onClose: () => void;
}) {
  const today = dayKeyOf(new Date());
  const [start, setStart] = useState<string | null>(null);
  const [shown, setShown] = useState(() => {
    const base = dayOfKey(current?.to || today);
    return new Date(base.getFullYear(), base.getMonth(), 1, 12);
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      const at = (document.activeElement as HTMLElement | null)?.dataset?.day;
      const by = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[e.key];
      if (!at || !by || !ref.current?.contains(document.activeElement)) return;
      e.preventDefault();
      e.stopPropagation();
      const d = dayOfKey(at);
      d.setDate(d.getDate() + by);
      const k = dayKeyOf(d);
      if (k > today) return;
      if (d.getMonth() !== shown.getMonth() || d.getFullYear() !== shown.getFullYear()) {
        setShown(new Date(d.getFullYear(), d.getMonth(), 1, 12));
      }
      requestAnimationFrame(() => {
        (ref.current?.querySelector(`[data-day="${k}"]`) as HTMLElement | null)?.focus({ preventScroll: true });
      });
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      // Magpie outside ignores the range-opt anchor
      if ((e.target as HTMLElement | null)?.closest?.(".range-opt")) return;
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onDown, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onDown, true);
    };
  }, [onClose, shown, today]);

  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const back = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d;
  };
  const span = (from: Date, to: Date) => ({ from: dayKeyOf(from), to: dayKeyOf(to) });
  const quicks: [string, { from: string; to: string }][] = [
    ["Yesterday", span(back(1), back(1))],
    ["This month", span(new Date(now.getFullYear(), now.getMonth(), 1, 12), now)],
    [
      "Last month",
      span(new Date(now.getFullYear(), now.getMonth() - 1, 1, 12), new Date(now.getFullYear(), now.getMonth(), 0, 12)),
    ],
    ["90 days", span(back(89), now)],
  ];

  const lo = start || current?.from || null;
  const hi = start ? null : current?.to || null;
  const cells: ReactNode[] = [];
  for (let i = 0; i < 7; i++) {
    cells.push(
      <span className="rm-wd" key={`wd${i}`}>
        {new Date(2024, 0, 1 + i, 12).toLocaleDateString(undefined, { weekday: "narrow" })}
      </span>,
    );
  }
  const first = new Date(shown);
  const lead = (first.getDay() + 6) % 7;
  for (let i = 0; i < lead; i++) cells.push(<span className="rm-pad" key={`pad${i}`} />);
  for (let d = new Date(first); d.getMonth() === shown.getMonth(); d.setDate(d.getDate() + 1)) {
    const k = dayKeyOf(d);
    const dayNum = d.getDate();
    const cls = [
      "rm-day",
      k === today ? "today" : "",
      lo && (k === lo || k === hi) ? "end" : "",
      lo && hi && k > lo && k < hi ? "in" : "",
    ]
      .filter(Boolean)
      .join(" ");
    cells.push(
      <button
        type="button"
        key={k}
        className={cls}
        data-day={k}
        disabled={k > today}
        aria-label={d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
        onClick={() => {
          if (!start) {
            setStart(k);
            return;
          }
          const [from, to] = start <= k ? [start, k] : [k, start];
          onChoose(from, to);
          onClose();
        }}
      >
        {dayNum}
      </button>,
    );
  }

  const nextMonthStart = dayKeyOf(new Date(shown.getFullYear(), shown.getMonth() + 1, 1, 12));

  return (
    <div className="pop proto-menu range-menu" ref={ref} role="dialog" aria-label={t("Pick days")} style={{ position: "absolute", top: "100%", right: 0, zIndex: 40 }}>
      <div className="pm-head">{start ? t("Now the last day") : t("Pick the first day, then the last")}</div>
      <div className="rm-quick">
        {quicks.map(([name, r]) => (
          <button
            key={name}
            type="button"
            className={`rm-span${current && current.from === r.from && current.to === r.to ? " on" : ""}`}
            title={rangeName(r.from, r.to)}
            onClick={() => {
              onChoose(r.from, r.to);
              onClose();
            }}
          >
            {t(name)}
          </button>
        ))}
      </div>
      <div className="rm-nav">
        <button
          type="button"
          className="rm-step"
          aria-label={t("Previous month")}
          onClick={() => setShown(new Date(shown.getFullYear(), shown.getMonth() - 1, 1, 12))}
        >
          <svg viewBox="0 0 12 12" width={12} height={12} aria-hidden>
            <path d="M10 4 6 8l4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <span className="rm-month">{shown.toLocaleDateString(undefined, { year: "numeric", month: "long" })}</span>
        <button
          type="button"
          className="rm-step"
          aria-label={t("Next month")}
          disabled={nextMonthStart > today}
          onClick={() => setShown(new Date(shown.getFullYear(), shown.getMonth() + 1, 1, 12))}
        >
          <svg viewBox="0 0 12 12" width={12} height={12} aria-hidden>
            <path d="m6 4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="rm-grid" role="grid">
        {cells}
      </div>
    </div>
  );
}

/** Magpie Usage: Overview / Requests / Sessions / Context + period + refresh. */
export function UsageView() {
  const [tab, setTab] = useState<string>(() => {
    try {
      return localStorage.getItem("magpie.usageTab") || "usage";
    } catch {
      return "usage";
    }
  });
  const [period, setPeriod] = useState("today");
  const [sessRange, setSessRange] = useState(() => {
    try {
      const r = localStorage.getItem("magpie.sessRange");
      if (SESS_RANGES.some(([id]) => id === r)) return r!;
    } catch { /* ignore */ }
    return "30d";
  });
  const [every, setEvery] = useState(() => {
    try {
      const n = Number(localStorage.getItem("magpie.usageEvery"));
      if ([0, 5, 10, 30, 60].includes(n)) return n;
    } catch { /* ignore */ }
    return 5;
  });
  const [everyOpen, setEveryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [ledStatus, setLedStatus] = useState("");
  const [ledMetric, setLedMetric] = useState("calls");
  const [ledSplit, setLedSplit] = useState("none");
  const [ledQ, setLedQ] = useState("");
  const [sessAgent, setSessAgent] = useState("all");
  const [sessQ, setSessQ] = useState("");
  const [mask, setMask] = useState(false);
  /** Magpie ledDash stays hidden with no ledger; demo can show a chart shell. */
  const [demoChart, setDemoChart] = useState(false);
  const [ctxDays, setCtxDays] = useState(() => {
    try {
      const d = localStorage.getItem("magpie.ctxDays");
      if (["1", "7", "30"].includes(d || "")) return d!;
    } catch { /* ignore */ }
    return "7";
  });
  /** Magpie empty vs filled demo. Native usage/01–50 are empty — default off; toggle fills mock data. */
  const [demoFilled, setDemoFilled] = useState(false);
  const [ledOpen, setLedOpen] = useState<Set<string>>(() => new Set());
  const [ledPage, setLedPage] = useState(0);
  const [sessOpen, setSessOpen] = useState<string | null>(null);
  const [sessMore, setSessMore] = useState(false);
  const [heatMetricRemember] = useState(true); // heatmap mounts with Magpie localStorage metric


  const everyLabel = USAGE_EVERY.find(([n]) => n === every)?.[1] || "5 s";

  const refresh = () => {
    setBusy(true);
    window.setTimeout(() => setBusy(false), 600);
  };

  useEffect(() => {
    try {
      localStorage.setItem("magpie.usageTab", tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  useEffect(() => {
    try {
      localStorage.setItem("magpie.usageEvery", String(every));
    } catch {
      /* ignore */
    }
  }, [every]);

  useEffect(() => {
    try {
      localStorage.setItem("magpie.sessRange", sessRange);
    } catch {
      /* ignore */
    }
  }, [sessRange]);

  useEffect(() => {
    try {
      localStorage.setItem("magpie.ctxDays", ctxDays);
    } catch {
      /* ignore */
    }
  }, [ctxDays]);

  useEffect(() => {
    if (!every) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      refresh();
    }, every * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [every, tab]);

  const periodIsCustom = period.includes("..");
  const periodSegOn = periodIsCustom ? "__custom__" : period;
  const setPeriodBox = useSegThumb(periodSegOn + (customLabel || ""));

  const ledRows = useMemo(() => {
    if (!demoFilled) return [] as LedRow[];
    let rows = DEMO_LEDGER;
    if (ledStatus === "failed") rows = rows.filter((r) => r.status === "err");
    else if (ledStatus === "retried") rows = rows.filter((r) => r.id === "r3" || r.status === "err"); // demo: r3 + errors as retried set
    const q = ledQ.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        `${r.req} ${r.providerName} ${r.agentName} ${r.host || ""}`.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [demoFilled, ledStatus, ledQ]);

  const ledTotals = useMemo(() => {
    const rows = ledRows;
    const tokens = rows.reduce((n, r) => n + r.in + r.out + r.cache_read + r.cache_write, 0);
    const cost = rows.reduce((n, r) => n + r.cost, 0);
    const errors = rows.filter((r) => r.status === "err").length;
    const cacheRead = rows.reduce((n, r) => n + r.cache_read, 0);
    const prompt = rows.reduce((n, r) => n + r.in + r.cache_write + r.cache_read, 0);
    return {
      calls: rows.length,
      tokens,
      cost,
      errors,
      input: rows.reduce((n, r) => n + r.in, 0),
      output: rows.reduce((n, r) => n + r.out, 0),
      cache_read: cacheRead,
      cache_write: rows.reduce((n, r) => n + r.cache_write, 0),
      hit: prompt ? cacheRead / prompt : 0,
    };
  }, [ledRows]);

  const pageSize = 5;
  const ledPageRows = ledRows.slice(ledPage * pageSize, ledPage * pageSize + pageSize);
  const ledPages = Math.max(1, Math.ceil(ledRows.length / pageSize) || 1);

  const sessRows = useMemo(() => {
    if (!demoFilled) return [];
    let rows = sessMore ? [...DEMO_SESSIONS, ...DEMO_SESSIONS_MORE] : [...DEMO_SESSIONS];
    if (sessAgent !== "all") rows = rows.filter((s) => s.agent === sessAgent);
    const q = sessQ.trim().toLowerCase();
    if (q) {
      rows = rows.filter((s) =>
        `${s.title} ${s.cwd} ${s.models} ${s.agent}`.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [demoFilled, sessAgent, sessQ, sessMore]);
  const sessHidden = demoFilled && !sessMore ? DEMO_SESSIONS_MORE.length : 0;

  const ctxAgents = demoFilled ? DEMO_CTX_AGENTS : [];
  const overview = useMemo(
    () => (demoFilled ? buildDemoOverview(period) : null),
    [demoFilled, period],
  );
  const [agentMenuFor, setAgentMenuFor] = useState<string | null>(null);
  const [hiddenUsageAgents, setHiddenUsageAgents] = useState<Set<string>>(() => new Set());
  const [usageHidOpen, setUsageHidOpen] = useState(false);


  const toggleLed = (id: string) => {
    setLedOpen((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  return (
    <main className="view" id="view-usage">
      <div className="usage-head">
        <Segs
          value={tab}
          onChange={setTab}
          items={USAGE_TABS.map(([id, en]) => ({ id, label: t(en) }))}
        />
        {tab !== "sessions" && tab !== "context" ? (
          <div className="segs period-wrap" id="period" ref={setPeriodBox} style={{ position: "relative" }}>
            {PERIODS.map(([id, en]) => (
              <button
                key={id}
                type="button"
                className={`opt${periodSegOn === id ? " on" : ""}`}
                aria-pressed={periodSegOn === id}
                onClick={() => {
                  setCustomLabel("");
                  setPeriod(id);
                  setCustomOpen(false);
                }}
              >
                {t(en)}
              </button>
            ))}
            <button
              type="button"
              className={`opt range-opt${periodIsCustom ? " on" : ""}${customOpen ? " open" : ""}`}
              aria-haspopup="dialog"
              aria-expanded={customOpen}
              aria-label={customLabel ? t("Days picked: {days}", { days: customLabel }) : t("Pick days")}
              title={customLabel ? t("Days picked: {days}", { days: customLabel }) : undefined}
              onClick={() => setCustomOpen((o) => !o)}
            >
              <svg viewBox="0 0 16 16" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 4.5h10v8.5H3zM3 7h10M5.5 3v3M10.5 3v3" />
              </svg>
              <span>{customLabel || t("Custom")}</span>
            </button>
            {customOpen ? (
              <RangeCalendar
                current={
                  periodIsCustom
                    ? { from: period.split("..")[0], to: period.split("..")[1] }
                    : null
                }
                onChoose={(from, to) => {
                  setPeriod(`${from}..${to}`);
                  setCustomLabel(rangeName(from, to));
                }}
                onClose={() => setCustomOpen(false)}
              />
            ) : null}
          </div>
        ) : null}
        {tab === "sessions" ? (
          <Segs
            value={sessRange}
            onChange={setSessRange}
            items={SESS_RANGES.map(([id, en]) => ({ id, label: t(en) }))}
          />
        ) : null}
        {tab === "context" ? (
          <span className="ctx-range" id="ctxRange">
            <Segs
              value={ctxDays}
              onChange={setCtxDays}
              items={[
                { id: "1", label: t("Today") },
                { id: "7", label: t("7 days") },
                { id: "30", label: t("30 days") },
              ]}
            />
          </span>
        ) : null}
        <span className="grow" />
        <span className="usage-refresh" id="usageRefresh" style={{ position: "relative" }}>
          <button
            className={`icon${busy ? " busy" : ""}`}
            id="usageReload"
            type="button"
            aria-label={t("Refresh now")}
            title={
              tab === "usage"
                ? t("Refresh now, the allowances too; a Claude account's is read by running Claude Code's own /usage")
                : t("Refresh now")
            }
            onClick={refresh}
          >
            <RefreshSpin busy={busy} />
          </button>
          <SessPick
            label={t(everyLabel)}
            open={everyOpen}
            set={every > 0}
            onToggle={() => setEveryOpen((o) => !o)}
          />
          <ProtoMenu
            open={everyOpen}
            onClose={() => setEveryOpen(false)}
            value={String(every)}
            title={t("Refresh every")}
            items={USAGE_EVERY.map(([n, name]) => ({ v: String(n), name }))}
            onPick={(v) => setEvery(Number(v))}
          />
        </span>
        <span className="usage-cost" id="usageCost">
          <b>{demoFilled && overview ? (overview.cost ? "≈$" + overview.cost.toFixed(overview.cost >= 1 ? 2 : 4) : "≈$0.000") : "≈$0.000"}</b>
          <span>{t("effective prices")}</span>
        </span>
      </div>

      {/* Overview — Magpie empty: hide chart/Agents/Models/Accounts heads when calls==0 */}
      <div className="usage-pane" id="usagePane" hidden={tab !== "usage"}>
        {/* Allowances / quotas: Magpie hides quotaHead when empty; native usage shots have none — do not invent. */}
        <div className="row-head quota-head" id="quotaHead" hidden>
          <span className="label">{t("Allowances")}</span>
          <span className="grow" />
          <button
            type="button"
            className="text rt-mask"
            id="usageMask"
            aria-pressed={mask}
            title={t("Mask the accounts on this page — email addresses and account names — for a screenshot to share")}
            onClick={() => setMask((m) => !m)}
          >
            <span>{t("Hide accounts")}</span>
          </button>
        </div>
        <section className="subscription-usage" id="subscriptionUsage" />
        <p className="usage-note" id="usageScope">
          {t("Gateway calls only; session-log calls are in Requests. Local rejections are excluded from totals.")}
        </p>
        {!demoFilled || !overview ? (
          <div className="card empty-state us-empty" style={{ padding: "22px 16px", marginTop: 8 }}>
            <b style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>{noCallsIn(period)}</b>
            <span style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.45 }}>
              {t("Point an agent at a catalog model and use it; every call through the gateway is counted here.")}
            </span>
            <div style={{ marginTop: 12 }}>
              <button type="button" className="text primary" onClick={() => setDemoFilled(true)}>
                {demoCopy("显示演示有数据", "Show demo with data")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <section className="stats" id="stats" style={{ animation: "fade-in .28s var(--ease)" }}>
              <div className="kpi" title="">
                <b>{fmtN(tokensOf(overview))}</b>
                <span>{t("tokens")}</span>
                <small>{t("{a} in · {b} out", { a: fmtN(overview.input), b: fmtN(overview.output) })}</small>
              </div>
              <div className="kpi" title={overview.cache_write ? t("{n} written", { n: fmtN(overview.cache_write) }) : undefined}>
                <b>{fmtN(overview.cache_read)}</b>
                <span>{t("cache read")}</span>
                <small>
                  {overview.cache_read && overview.input + overview.cache_read + overview.cache_write
                    ? t("hit rate {p}", {
                        p:
                          Math.round(
                            (100 * overview.cache_read) /
                              (overview.input + overview.cache_read + overview.cache_write),
                          ) + "%",
                      })
                    : ""}
                </small>
              </div>
              <div className="kpi">
                <b>{fmtN(overview.reasoning)}</b>
                <span>{t("reasoning")}</span>
                <small>{t("inside output")}</small>
              </div>
              <div className="kpi">
                <b>{String(overview.calls)}</b>
                <span>{t(overview.calls === 1 ? "call" : "calls")}</span>
                <small>
                  {[
                    overview.errors ? t("{n} failed", { n: String(overview.errors) }) : "",
                    overview.retried ? t("{n} answered on a retry", { n: String(overview.retried) }) : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </div>
            </section>
            <section className="chart" id="chart" style={{ animation: "fade-in .32s var(--ease)" }}>
              <div className="peak">
                {fmtN(Math.max(1, ...overview.series.map((p) => tokensOf(p))))}
              </div>
              <div className="bars">
                {overview.series.map((p, i) => {
                  const peak = Math.max(1, ...overview.series.map((x) => tokensOf(x)));
                  const when =
                    overview.bucket === "hour"
                      ? `${p.label}:00`
                      : p.label;
                  const tip = p.calls
                    ? t(p.calls === 1 ? "{when} · {tokens} tokens · {n} call" : "{when} · {tokens} tokens · {n} calls", {
                        when,
                        tokens: fmtN(tokensOf(p)),
                        n: String(p.calls),
                      }) + (p.cost ? ` · ≈${fmtCost(p.cost)}` : "")
                    : t("{when} · nothing", { when });
                  return (
                    <div className="bar" key={`${p.label}-${i}`} title={tip}>
                      <i className="out" style={{ height: `${((100 * p.output) / peak).toFixed(1)}%`, transition: "height .28s var(--ease)" }} />
                      <i className="in" style={{ height: `${((100 * p.input) / peak).toFixed(1)}%`, transition: "height .28s var(--ease)" }} />
                    </div>
                  );
                })}
              </div>
              <div className="labels">
                {overview.series.map((p, i) => {
                  const n = overview.series.length;
                  const every = n <= 8 ? 1 : n <= 31 ? Math.ceil(n / 6) : Math.ceil(n / 5);
                  const last = i === n - 1 && (n - 1) % every >= every / 2;
                  const show = i % every === 0 || last;
                  return <span key={`${p.label}-l-${i}`}>{show ? (overview.bucket === "hour" ? p.label : p.label) : ""}</span>;
                })}
              </div>
            </section>
            <div className="row-head">
              <span className="label">{t("Agents")}</span>
            </div>
            <div className="list" id="usageAgents">
              {overview.agents
                .filter((g) => !hiddenUsageAgents.has(g.id))
                .map((g) => {
                  const total = Math.max(1, tokensOf(overview));
                  const prompt = g.input + g.cache_read + (g.cache_write || 0);
                  const hit =
                    g.cache_read && prompt
                      ? " · " + t("hit rate {p}", { p: Math.round((100 * g.cache_read) / prompt) + "%" })
                      : "";
                  return (
                    <div className="row stat acts" key={g.id} data-id={g.id} style={{ position: "relative" }}>
                      <span className="ic">
                        <img src={iconSrc(g.icon)} alt="" />
                      </span>
                      <div className="who">
                        <div className="name">{g.name}</div>
                        <div className="sub">
                          {[
                            t(g.calls === 1 ? "{n} call" : "{n} calls", { n: String(g.calls) }),
                            g.errors ? t("{n} failed", { n: String(g.errors) }) : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                      <div className="share" title={t("{n}% of tokens", { n: String(Math.round((100 * tokensOf(g)) / total)) })}>
                        <i style={{ width: `${Math.max(1.5, (100 * tokensOf(g)) / total).toFixed(1)}%`, transition: "width .28s var(--ease)" }} />
                      </div>
                      <button
                        type="button"
                        className={`icon us-more${agentMenuFor === g.id ? " open" : ""}`}
                        aria-haspopup="menu"
                        aria-label={t("Actions for {name}", { name: g.name })}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAgentMenuFor((cur) => (cur === g.id ? null : g.id));
                        }}
                      >
                        <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden>
                          <circle cx="3.5" cy="8" r="1.2" fill="currentColor" />
                          <circle cx="8" cy="8" r="1.2" fill="currentColor" />
                          <circle cx="12.5" cy="8" r="1.2" fill="currentColor" />
                        </svg>
                      </button>
                      {agentMenuFor === g.id ? (
                        <div className="proto-menu open" role="menu" style={{ position: "absolute", right: 8, top: 36, zIndex: 20, minWidth: 180, animation: "fade-in .15s var(--ease)" }}>
                          <button
                            type="button"
                            className="proto-item"
                            role="menuitem"
                            onClick={() => {
                              setHiddenUsageAgents((s) => new Set(s).add(g.id));
                              setAgentMenuFor(null);
                            }}
                          >
                            {t("Hide from this list")}
                          </button>
                        </div>
                      ) : null}
                      <div className="num">
                        <b>{fmtN(tokensOf(g))}</b>
                        <small>
                          {t("{a} in · {b} out", { a: fmtN(g.input), b: fmtN(g.output) })}
                          {g.cache_read ? ` · ${t("{n} cached", { n: fmtN(g.cache_read) })}` : ""}
                          {hit}
                        </small>
                      </div>
                      <div className="cost">{g.cost ? "≈" + fmtCost(g.cost).replace(/^≈/, "") : ""}</div>
                    </div>
                  );
                })}
            </div>
            {overview.agents.some((g) => hiddenUsageAgents.has(g.id)) ? (
              <div id="usageAgentsHid">
                <button
                  type="button"
                  className="us-hidline text"
                  aria-expanded={usageHidOpen}
                  title={t("Hidden from this list only: their calls still count in the totals and the chart. Click to see them.")}
                  onClick={() => setUsageHidOpen((o) => !o)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, margin: "6px 0", fontSize: 12 }}
                >
                  <span>{t("{n} hidden", { n: String([...hiddenUsageAgents].filter((id) => overview.agents.some((g) => g.id === id)).length) })}</span>
                  <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden style={{ transform: usageHidOpen ? "rotate(180deg)" : undefined, transition: "transform .15s ease-out" }}>
                    <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
                {usageHidOpen
                  ? overview.agents
                      .filter((g) => hiddenUsageAgents.has(g.id))
                      .map((g) => (
                        <div className="row stat hid acts" key={`hid-${g.id}`} data-id={g.id}>
                          <span className="ic">
                            <img src={iconSrc(g.icon)} alt="" />
                          </span>
                          <div className="who">
                            <div className="name">{g.name}</div>
                            <div className="sub">{t(g.calls === 1 ? "{n} call" : "{n} calls", { n: String(g.calls) })}</div>
                          </div>
                          <button
                            type="button"
                            className="text us-unhide"
                            onClick={() =>
                              setHiddenUsageAgents((s) => {
                                const n = new Set(s);
                                n.delete(g.id);
                                return n;
                              })
                            }
                          >
                            {t("Unhide")}
                          </button>
                        </div>
                      ))
                  : null}
              </div>
            ) : null}
            <div className="row-head">
              <span className="label">{t("Models")}</span>
            </div>
            <div className="list" id="usageModels">
              {overview.models.map((g) => {
                const total = Math.max(1, tokensOf(overview));
                return (
                  <div className="row stat" key={g.id} data-id={g.id}>
                    <span className="ic" aria-hidden>◆</span>
                    <div className="who">
                      <div className="name">{g.name}</div>
                      <div className="sub">
                        {[g.sub, t(g.calls === 1 ? "{n} call" : "{n} calls", { n: String(g.calls) })].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className="share" title={t("{n}% of tokens", { n: String(Math.round((100 * tokensOf(g)) / total)) })}>
                      <i style={{ width: `${Math.max(1.5, (100 * tokensOf(g)) / total).toFixed(1)}%`, transition: "width .28s var(--ease)" }} />
                    </div>
                    <div className="num">
                      <b>{fmtN(tokensOf(g))}</b>
                      <small>{t("{a} in · {b} out", { a: fmtN(g.input), b: fmtN(g.output) })}</small>
                    </div>
                    <div className="cost">{g.cost ? "≈" + fmtCost(g.cost).replace(/^≈/, "") : ""}</div>
                  </div>
                );
              })}
            </div>
            {overview.accounts.length ? (
              <>
                <div className="row-head" id="usageAccountsHead">
                  <span className="label">{t("Accounts")}</span>
                </div>
                <div className="list" id="usageAccounts">
                  {overview.accounts.map((g) => {
                    const total = Math.max(1, tokensOf(overview));
                    return (
                      <div className="row stat" key={g.id} data-id={g.id}>
                        <span className="ic">
                          <img src={iconSrc(g.icon)} alt="" />
                        </span>
                        <div className="who">
                          <div className={`name${mask ? " faint" : ""}`}>{mask ? "••••@••••.com" : g.name}</div>
                          <div className="sub">
                            {[g.sub, t(g.calls === 1 ? "{n} call" : "{n} calls", { n: String(g.calls) })].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <div className="share">
                          <i style={{ width: `${Math.max(1.5, (100 * tokensOf(g)) / total).toFixed(1)}%` }} />
                        </div>
                        <div className="num">
                          <b>{fmtN(tokensOf(g))}</b>
                          <small>{t("{a} in · {b} out", { a: fmtN(g.input), b: fmtN(g.output) })}</small>
                        </div>
                        <div className="cost">{g.cost ? "≈" + fmtCost(g.cost).replace(/^≈/, "") : ""}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="text"
                aria-pressed={demoFilled}
                onClick={() => setDemoFilled(false)}
                title={demoCopy("关演示数据看真空态", "Turn off demo data for Magpie empty")}
              >
                {demoCopy("演示数据开 · 点此关", "Demo data on · click to clear")}
              </button>
            </div>
          </>
        )}
        <p className="usage-note" id="usageNote" />
      </div>

      {/* Requests / Ledger */}
      <div className="usage-pane" id="ledgerPane" hidden={tab !== "requests"}>
        <div className="sess-tools" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <Segs
            value={ledStatus}
            onChange={(v) => {
              setLedStatus(v);
              setLedPage(0);
            }}
            items={LED_STATUS.map(([id, en]) => ({
              id,
              label: t(en),
              title: id === "retried" ? t("Show only the requests answered on a retry.") : undefined,
            }))}
          />
          <span className="grow" />
          <button
            type="button"
            className="text"
            aria-pressed={demoFilled}
            title={demoCopy("切换演示 ledger 数据", "Toggle demo ledger data")}
            onClick={() => {
              setDemoFilled((d) => !d);
              setLedPage(0);
              setDemoChart(false);
            }}
          >
            {demoFilled ? demoCopy("演示数据开", "Demo data on") : demoCopy("演示数据关", "Demo data off")}
          </button>
          <span className="led-q-wrap" style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <input
              className="sess-filter"
              id="ledQ"
              type="search"
              spellCheck={false}
              autoComplete="off"
              placeholder={t("Search models, providers, sessions")}
              value={ledQ}
              onChange={(e) => {
                setLedQ(e.target.value);
                setLedPage(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape" && ledQ) {
                  e.preventDefault();
                  setLedQ("");
                  setLedPage(0);
                }
              }}
              style={ledQ ? { paddingRight: 28 } : undefined}
            />
            {ledQ ? (
              <button
                type="button"
                className="icon led-q-clear"
                aria-label={t("Clear")}
                title={t("Clear")}
                style={{ position: "absolute", right: 4, width: 22, height: 22, border: 0, background: "none", cursor: "pointer", color: "var(--muted)", display: "grid", placeItems: "center" }}
                onClick={() => {
                  setLedQ("");
                  setLedPage(0);
                }}
              >
                <svg viewBox="0 0 12 12" width={10} height={10} aria-hidden>
                  <path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            ) : null}
          </span>
          <button
            type="button"
            className="text"
            id="ledExport"
            disabled={!ledRows.length}
            title={t("Save every request listed, all pages, as a CSV file in Downloads")}
            onClick={() => {
              /* demo: no export when empty — Magpie click does nothing */
            }}
          >
            <span>{t("Export CSV")}</span>
          </button>
        </div>
        <p className="usage-note" id="ledScope">
          {t("Gateway and session-log calls; local rejections excluded from totals.")}
        </p>
        {demoFilled && ledRows.length ? (
          <>
            <div className="led-dash" id="ledDash">
              <div className="led-strip" id="ledKpi">
                <div className="blk">
                  <span className="k">{t("Tokens")}</span>
                  <span className="v">{fmtN(ledTotals.tokens)}</span>
                  <span className="sub">
                    {t("{a} in · {b} out", { a: fmtN(ledTotals.input), b: fmtN(ledTotals.output) })}
                    {" · "}
                    {t("{a} cache", { a: fmtN(ledTotals.cache_read + ledTotals.cache_write) })}
                  </span>
                </div>
                <div className="blk">
                  <span className="k">{t("Requests")}</span>
                  <span className="v">{ledTotals.calls}</span>
                  <span className="sub jumps">
                    {ledTotals.errors ? (
                      <button
                        type="button"
                        className={`led-jump bad${ledStatus === "failed" ? " on" : ""}`}
                        onClick={() => setLedStatus(ledStatus === "failed" ? "" : "failed")}
                      >
                        {t("{n} failed", { n: String(ledTotals.errors) })}
                      </button>
                    ) : (
                      t("none failed")
                    )}
                  </span>
                </div>
                <div className="blk">
                  <span className="k">{t("Cost")}</span>
                  <span className="v cost">{fmtCost(ledTotals.cost)}</span>
                  <span className="sub">{t("effective prices")}</span>
                </div>
                <div className="blk">
                  <span className="k">{t("Cache hit rate")}</span>
                  <span className="v">{(100 * ledTotals.hit).toFixed(1)}%</span>
                  <div className="meter">
                    <i style={{ width: `${(100 * ledTotals.hit).toFixed(1)}%` }} />
                  </div>
                </div>
                <div className="blk">
                  <span className="k">{t("Output speed")}</span>
                  <span className="v parts">
                    <span>72</span>
                    <span> tok/s</span>
                  </span>
                  <span className="sub ttft">{t("first token in {ms} on average", { ms: "420ms" })}</span>
                </div>
              </div>
              <section className="led-trend">
                <div className="led-bar" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <Segs value={ledMetric} onChange={setLedMetric} items={LED_METRIC.map(([id, en]) => ({ id, label: t(en) }))} />
                  <span className="grow" />
                  <span className="led-split" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span className="led-by" style={{ fontSize: 12, color: "var(--muted)" }}>
                      {t("Split by")}
                    </span>
                    <Segs value={ledSplit} onChange={setLedSplit} items={LED_SPLIT.map(([id, en]) => ({ id, label: t(en) }))} />
                  </span>
                </div>
                <div className="led-body">
                  <div
                    className="led-chart"
                    id="ledChart"
                    aria-hidden
                    style={{
                      height: 120,
                      borderRadius: 12,
                      border: "1px solid var(--line)",
                      background: "var(--card)",
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 3,
                      padding: "12px 10px 8px",
                    }}
                  >
                    {[28, 44, 36, 62, 48, 22, 55, 40, 50, 34, 58, 42].map((h, i) => (
                      <div
                        key={i}
                        title={`${ledMetric} · ${ledSplit}`}
                        style={{
                          flex: 1,
                          height: `${h}%`,
                          borderRadius: "4px 4px 2px 2px",
                          background: "color-mix(in srgb, var(--accent) 55%, var(--pill))",
                          opacity: 0.55 + (i % 3) * 0.1,
                          transition: "height .28s var(--ease), opacity .12s",
                        }}
                      />
                    ))}
                  </div>
                  <div className="led-rank" id="ledRank" />
                </div>
              </section>
            </div>
            {heatMetricRemember ? <LedHeat show={demoFilled && ledRows.length > 0} /> : null}
            <div className="led-head" style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
              <p className="led-sum" id="ledSum" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                {t(ledTotals.calls === 1 ? "{n} request" : "{n} requests", { n: String(ledTotals.calls) })}
                {" · "}
                {t("{n} in", { n: fmtN(ledTotals.input) })}
                {" · "}
                {t("{n} out", { n: fmtN(ledTotals.output) })}
                {ledTotals.errors ? ` · ${t("{n} failed", { n: String(ledTotals.errors) })}` : ""}
              </p>
              <span className="grow" />
            </div>
            <div className="led-wrap" id="ledWrap">
              <table className="led">
                <thead>
                  <tr>
                    {[
                      "Time",
                      "Agent",
                      "Requested",
                      "Provider · account",
                      "Served",
                      "In",
                      "Out",
                      "Cost",
                      "Duration",
                      "Status",
                    ].map((h) => (
                      <th key={h} className={["In", "Out", "Cost", "Duration"].includes(h) ? "n" : undefined}>
                        {t(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledPageRows.map((r) => {
                    const open = ledOpen.has(r.id);
                    const bad = r.status === "err";
                    return (
                      <Fragment key={r.id}>
                        <tr
                          className={`led-row${bad ? " bad" : ""}${open ? " open" : ""}`}
                          tabIndex={0}
                          aria-expanded={open}
                          onClick={() => toggleLed(r.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleLed(r.id);
                            }
                          }}
                        >
                          <td className="when" title={new Date(r.t).toLocaleString()}>
                            {ledTime(r.t)}
                          </td>
                          <td>
                            <span className="who">
                              <span className="ic">
                                <img
                                  src={iconSrc(
                                    r.icon === "claude"
                                      ? "claude-color"
                                      : r.icon === "codex"
                                        ? "codex-color"
                                        : "openai",
                                  )}
                                  alt=""
                                  width={14}
                                  height={14}
                                />
                              </span>
                              <span>{r.agentName}</span>
                            </span>
                          </td>
                          <td className="model">{r.req}</td>
                          <td className="where">
                            <div className="where-name">
                              {t(r.providerName)}
                              {r.host ? ` · ${r.host}` : ""}
                            </div>
                            {r.source === "log" ? (
                              <div className="source-badges">
                                <span className="src">{t("Local session")}</span>
                              </div>
                            ) : null}
                          </td>
                          <td className="model">{r.served || "—"}</td>
                          <td className="n">{fmtN(r.in)}</td>
                          <td className="n">{fmtN(r.out)}</td>
                          <td className={`n cost${r.cost ? "" : " faint"}`}>{fmtCost(r.cost)}</td>
                          <td className="n">{(r.ms / 1000).toFixed(1)}s</td>
                          <td>
                            <span className="st">
                              <i className="dot" />
                              {bad ? t("Error") : t("OK")}
                            </span>
                          </td>
                        </tr>
                        {open ? (
                          <tr className="led-detail">
                            <td colSpan={10}>
                              <div className="led-detail-inner" style={{ padding: "8px 12px 12px", fontSize: 12, color: "var(--fg-2)", display: "grid", gap: 4 }}>
                                <div>
                                  <b>{t("Cache write")}</b>: {fmtN(r.cache_write)} · <b>{t("Cache read")}</b>: {fmtN(r.cache_read)}
                                  {r.speed ? ` · ${t("Speed")}: ${r.speed} tok/s` : ""}
                                  {r.effort ? ` · ${t("Effort")}: ${r.effort}` : ""}
                                </div>
                                <div style={{ color: "var(--muted)" }}>
                                  {demoCopy("演示行展开（Magpie led-row details）", "Demo row expand (Magpie led-row details)")}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="led-pager" id="ledPager" hidden={ledRows.length <= pageSize}>
              <button type="button" className="text" disabled={ledPage <= 0} onClick={() => setLedPage((p) => Math.max(0, p - 1))}>
                {t("Previous")}
              </button>
              <span>
                {ledPage + 1} / {ledPages}
              </span>
              <button
                type="button"
                className="text"
                disabled={ledPage + 1 >= ledPages}
                onClick={() => setLedPage((p) => p + 1)}
              >
                {t("Next")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="led-tools-extra" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
              <button
                type="button"
                className="text"
                aria-pressed={demoChart}
                onClick={() => setDemoChart((d) => !d)}
                title={demoCopy("官方空态隐藏 ledDash；点此预览演示柱图壳", "Magpie hides ledDash when empty; preview demo chart shell")}
              >
                {demoChart ? demoCopy("隐藏演示图", "Hide demo chart") : demoCopy("显示演示图", "Show demo chart")}
              </button>
            </div>
            <div className="led-dash" id="ledDash" hidden={!demoChart}>
              <div className="led-strip" id="ledKpi">
                {[
                  ["Calls", "0", ""],
                  ["Tokens", "0", ""],
                  ["Cost", "≈$0", "cost"],
                  ["OK", "0", ""],
                  ["Errors", "0", ""],
                ].map(([k, v, vc]) => (
                  <div key={k} className="blk">
                    <span className="k">{t(k)}</span>
                    <span className={`v${vc ? ` ${vc}` : ""}`}>{v}</span>
                    <span className="sub">{t("All")}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`led-wrap${!demoChart ? " none" : ""}`} id="ledWrap">
              <div className="led-none" style={{ padding: "22px 16px", textAlign: "center", color: "var(--muted)", lineHeight: 1.5 }}>
                {ledQ.trim() || ledStatus
                  ? t("No requests match these filters.")
                  : noCallsIn(period)}
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  {ledQ.trim() || ledStatus
                    ? null
                    : t("Every request an agent sends to magpie, and every call the agents' own session files record, is counted here.")}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: "var(--faint)" }}>0 {t("requests")}</div>
              </div>
            </div>
          </>
        )}
        <p className="usage-note" id="ledNote" />
      </div>

      {/* Sessions — Magpie #sessionsPane with 6 KPIs + list (demo filled) */}
      <div className="usage-pane sess-pane" id="sessionsPane" hidden={tab !== "sessions"}>
        {/* Magpie: agent/model/folder picks hidden with no sessions */}
        <div className="sess-tools" hidden={!demoFilled}>
          <div className="segs" id="sessAgent">
            <Segs
              value={sessAgent}
              onChange={setSessAgent}
              items={[
                { id: "all", label: t("All agents") },
                { id: "claude", label: "Claude Code" },
                { id: "codex", label: "Codex" },
                { id: "opencode", label: "OpenCode" },
              ]}
            />
          </div>
          <button className="sess-pick" id="sessModel" type="button" hidden />
          <button className="sess-pick" id="sessFolder" type="button" hidden />
          <span className="grow" />
          <button
            type="button"
            className="text"
            aria-pressed={demoFilled}
            onClick={() => setDemoFilled((d) => !d)}
          >
            {demoFilled ? demoCopy("演示数据开", "Demo data on") : demoCopy("演示数据关", "Demo data off")}
          </button>
        </div>
        {!demoFilled ? (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
            <button type="button" className="text" aria-pressed={false} onClick={() => setDemoFilled(true)}>
              {demoCopy("演示数据关 · 点此填充", "Demo data off · fill")}
            </button>
          </div>
        ) : null}
        {demoFilled && sessRows.length ? (
          <>
            <section className="stats six" id="sessStats">
              {DEMO_SESS_KPIS.map((k) => (
                <div className="kpi" key={k.label}>
                  <b>
                    {k.value}
                    {"unit" in k && k.unit ? <i className="u">{k.unit}</i> : null}
                  </b>
                  <span>{t(k.label)}</span>
                  <small>{t(k.sub)}</small>
                </div>
              ))}
            </section>
            <section className="chart sess-chart" id="sessChart" hidden />
            <div className="sess-grid" id="sessGrid" hidden>
              <section className="sess-card" id="sessProjects" />
              <section className="sess-card" id="sessModels" />
              <section className="sess-card" id="sessHours" />
              <section className="sess-card" id="sessTop" />
              <section className="sess-card" id="sessShape" />
              <section className="sess-card" id="sessSkills" />
              <section className="sess-card wide" id="sessTools" />
            </div>
            <div className="row-head" id="sessListHead">
              <span className="label">{t("Latest sessions")}</span>
              <span className="grow" />
              <button className="text sess-all" id="sessAll" type="button" data-feature="sessions">
                {t("All sessions")}
              </button>
              <input
                className="sess-filter"
                id="sessQ"
                type="search"
                spellCheck={false}
                autoComplete="off"
                placeholder={t("Search sessions")}
                value={sessQ}
                onChange={(e) => setSessQ(e.target.value)}
              />
            </div>
            <div className="list sess-list" id="sessList">
              {sessRows.map((s) => {
                const tokens = s.input + s.output + s.cache_read;
                const open = sessOpen === s.id;
                const detail = open ? demoSessDetail(s) : null;
                return (
                  <div className={`sess-item${open ? " open" : ""}`} key={s.id}>
                    <div
                      className="row sess sess-top"
                      tabIndex={0}
                      role="button"
                      aria-expanded={open}
                      title={t("Session details")}
                      onClick={() => setSessOpen(open ? null : s.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSessOpen(open ? null : s.id);
                        }
                      }}
                    >
                      <span className="ic">
                        <img
                          src={iconSrc(
                            s.icon === "claude" ? "claude-color" : s.icon === "codex" ? "codex-color" : "openai",
                          )}
                          alt=""
                        />
                      </span>
                      <div className="who">
                        <div className="name">{s.title === "(no prompt)" ? t("(no prompt)") : s.title}</div>
                        <div className="sub">
                          {[s.cwd, s.models, ago(s.last)].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <div className={`num${tokens ? "" : " none"}`}>
                        <b>{tokens ? fmtN(tokens) : "—"}</b>
                        {tokens ? (
                          <small>
                            {t("{a} in · {b} out", { a: fmtN(s.input), b: fmtN(s.output) })}
                            {s.cache_read ? ` · ${t("{n} cached", { n: fmtN(s.cache_read) })}` : ""}
                          </small>
                        ) : null}
                      </div>
                      <div className={`cost${s.cost ? "" : " none"}`}>{fmtCost(s.cost)}</div>
                      <span className={`sess-go${open ? " open" : ""}`} aria-hidden>
                        <svg viewBox="0 0 12 12" width={12} height={12}>
                          <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      </span>
                    </div>
                    {detail ? (
                      <div className="sess-detail">
                        <div className="sess-line">
                          <span className="k">{t("Time")}</span>
                          <span className="v">
                            {new Date(detail.start).toLocaleString()} – {new Date(detail.last).toLocaleString()}
                          </span>
                        </div>
                        <div className="sess-line">
                          <span className="k">{t("Folder")}</span>
                          <span className="v">{detail.cwd}</span>
                        </div>
                        <div className="sess-line">
                          <span className="k">{t("Session ID")}</span>
                          <span className="v">{detail.id}</span>
                          <button
                            type="button"
                            className="copy"
                            title={t("Session id")}
                            onClick={(e) => {
                              e.stopPropagation();
                              void navigator.clipboard?.writeText(detail.id);
                            }}
                          >
                            <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden>
                              <rect x="5.5" y="5.5" width="7" height="7" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                              <path d="M3.5 10.5v-7A1.5 1.5 0 0 1 5 2h7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                        <div className="sess-line">
                          <span className="k">{t("Resume")}</span>
                          <code>{detail.resume}</code>
                          <button
                            type="button"
                            className="copy"
                            title={t("Resume command")}
                            onClick={(e) => {
                              e.stopPropagation();
                              void navigator.clipboard?.writeText(detail.resume);
                            }}
                          >
                            <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden>
                              <rect x="5.5" y="5.5" width="7" height="7" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                              <path d="M3.5 10.5v-7A1.5 1.5 0 0 1 5 2h7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                        <div className="sess-models">
                          {detail.models.map((m) => (
                            <Fragment key={m.model}>
                              <span className="model">{m.model}</span>
                              <span className="n">
                                {t("{a} in · {b} out", { a: fmtN(m.input), b: fmtN(m.output) })}
                                {m.cache_read ? ` · ${t("{n} cached", { n: fmtN(m.cache_read) })}` : ""}
                              </span>
                              <span className={`c${m.priced ? "" : " none"}`}>{m.priced ? fmtCost(m.cost) : "—"}</span>
                            </Fragment>
                          ))}
                        </div>
                        {detail.via.map((v, i) => (
                          <div className="sess-line" key={i}>
                            <span className="k">{i ? "" : t("Routed")}</span>
                            <span className="v">
                              {`${v.provider}/${v.model}`}
                              {v.effort ? ` · ${v.effort}` : ""}
                              {" · "}
                              {t("{n} calls", { n: String(v.calls) })}
                              {" · "}
                              {t("{n} tokens", { n: fmtN(v.tokens) })}
                            </span>
                          </div>
                        ))}
                        <div className="sess-line">
                          <span className="k">{t("File")}</span>
                          <span className="v">{detail.path}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {sessHidden > 0 ? (
                <button
                  type="button"
                  className="text sess-show-more"
                  style={{ margin: "8px 12px 4px", alignSelf: "flex-start" }}
                  onClick={() => setSessMore(true)}
                >
                  {t("Show more · {n} left", { n: String(sessHidden) })}
                </button>
              ) : sessMore && DEMO_SESSIONS_MORE.length ? (
                <button
                  type="button"
                  className="text sess-show-more"
                  style={{ margin: "8px 12px 4px", alignSelf: "flex-start" }}
                  onClick={() => {
                    setSessMore(false);
                    setSessOpen(null);
                  }}
                >
                  {t("Show less")}
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <section className="stats empty" id="sessStats">
              <div className="none">
                {sessAgent !== "all" || sessQ.trim()
                  ? t("No session matches.")
                  : t(
                      "No sessions yet. Claude Code's, Codex's, OpenCode's and Pi's sessions on this computer show up here, with what each cost and the command that resumes it.",
                    )}
              </div>
              <p className="usage-note" style={{ marginTop: 10, fontSize: 11.5 }}>
                {t("Totals count native sessions and gateway requests with a session ID")}
                {" · 0 "}
                {t("sessions")}
                {" · ~/.claude · ~/.codex · ~/.cursor"}
              </p>
            </section>
            {/* Magpie: search / list hidden with no sessions */}
          </>
        )}
        <p className="usage-note" id="sessNote" />
      </div>

      {/* Context — Magpie context.js agent cards (demo filled) */}
      <div className="usage-pane ctx-pane" id="contextPane" hidden={tab !== "context"}>
        <div className="row-head">
          <span className="label">{t("Tuned for you")}</span>
          <span className="grow" />
          <button
            type="button"
            className="text"
            aria-pressed={demoFilled}
            onClick={() => setDemoFilled((d) => !d)}
          >
            {demoFilled ? demoCopy("演示数据开", "Demo data on") : demoCopy("演示数据关", "Demo data off")}
          </button>
        </div>
        <p className="usage-note ctx-tune-note">
          {t(
            "Your own calls of the range, replayed setting by setting from your agents' session files: the settings that would have spent the fewest tokens, for how you work. Tokens are weighed as the vendor charges them: a cache read is a tenth of one.",
          )}
        </p>
        {!demoFilled ? (
          <div className="ctx-none" style={{ marginBottom: 14 }}>
            <span>{t("Not enough calls in this range to tune on")}</span>
          </div>
        ) : null}
        <div className="row-head ctx-sess-head">
          <span className="label">{t("Through magpie")}</span>
          <span className="grow" />
        </div>
        <p className="usage-note">
          {t("What each agent's prompts hold, as magpie's gateway read them: the score and tags are worked out from the requests of the range.")}
        </p>
        {ctxAgents.length ? (
          <div className="ctx-agents">
            {ctxAgents.map((a) => {
              const grade =
                a.score >= 85 ? "great" : a.score >= 70 ? "good" : a.score >= 50 ? "fair" : "poor";
              const word =
                a.score >= 85 ? "Excellent" : a.score >= 70 ? "Good" : a.score >= 50 ? "Fair" : "Needs care";
              const r = 26;
              const c = 2 * Math.PI * r;
              const to = (c * (1 - a.score / 100)).toFixed(2);
              return (
                <div className="ctx-agent" key={a.agent}>
                  <div className="ctx-agent-head">
                    <div className="ctx-who-box">
                      <div className="ctx-who">
                        <span className="ic">
                          <img
                            src={iconSrc(
                              a.icon === "claude" ? "claude-color" : a.icon === "codex" ? "codex-color" : "openai",
                            )}
                            alt=""
                          />
                        </span>
                        <b>{a.name}</b>
                      </div>
                      <div className="ctx-who-sub">
                        {t(a.requests === 1 ? "1 request" : "{n} requests", { n: String(a.requests) })}
                        {" · "}
                        {t(a.sessions === 1 ? "1 session" : "{n} sessions", { n: String(a.sessions) })}
                      </div>
                    </div>
                    <span className="grow" />
                    <div className="ctx-grade">
                      <div className={`ctx-ring ${grade}`}>
                        <svg viewBox="0 0 64 64" aria-hidden>
                          <circle cx="32" cy="32" r={r} className="track" />
                          <circle
                            cx="32"
                            cy="32"
                            r={r}
                            className="arc"
                            strokeDasharray={c.toFixed(2)}
                            style={{ ["--to" as string]: to }}
                          />
                        </svg>
                        <b>{a.score}</b>
                      </div>
                      <span className={`ctx-grade-word ${grade}`}>{t(word)}</span>
                    </div>
                  </div>
                  <div className="ctx-scores">
                    {a.scores.map((s) => {
                      const ratio = s.most ? s.points / s.most : 0;
                      const tone = ratio >= 0.8 ? "ok" : ratio >= 0.5 ? "warn" : "bad";
                      return (
                        <div className={`ctx-score ${tone}`} key={s.key}>
                          <span className="n">{t(s.name)}</span>
                          <span className="ctx-bar">
                            <i style={{ width: `${(ratio * 100).toFixed(1)}%` }} />
                          </span>
                          <span className="v">
                            {s.points}/{s.most}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="ctx-tags">
                    {a.tags.map((tg) => (
                      <span className={`ctx-chip ${tg.tone}`} key={tg.key}>
                        <i />
                        {t(tg.label)}
                      </span>
                    ))}
                  </div>
                  <div className="ctx-facts">
                    {[
                      ["Typical prompt", a.median],
                      ["Largest", a.p90],
                      ["Starts with", a.baseline],
                      ["Grows by", a.growth],
                      ["Cache hit", a.cache],
                      ["Window size", a.window],
                    ].map(([label, value]) => (
                      <div className="ctx-fact" key={label}>
                        <span className="ctx-k">{t(label)}</span>
                        <b>{value}</b>
                      </div>
                    ))}
                  </div>
                  <div className="ctx-mix">
                    <span className="ctx-k">{t("What its prompts hold")}</span>
                    <div className="ctx-share">
                      {a.shares.map((sh) => (
                        <i key={sh.k} className={`k-${sh.k}`} style={{ flexGrow: sh.v }} title={`${sh.name} · ${Math.round(sh.v * 100)}%`} />
                      ))}
                    </div>
                    <div className="ctx-mix-keys">
                      {a.shares
                        .filter((sh) => sh.v >= 0.01)
                        .map((sh) => (
                          <span key={sh.k}>
                            <i className={`dot k-${sh.k}`} />
                            {t(sh.name)} {Math.round(sh.v * 100)}%
                          </span>
                        ))}
                    </div>
                  </div>
                  <div className="ctx-agent-foot">
                    <span className="ctx-models">
                      {a.models.map((m) => (
                        <code key={m} title={m}>
                          {m.split("/").pop()}
                        </code>
                      ))}
                    </span>
                    <span className="grow" />
                    <button type="button" className="text">
                      {t("Latest request")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ctx-none ctx-empty-dash" style={{ border: "1px dashed var(--line)", borderRadius: 12, padding: "28px 16px", textAlign: "center", display: "grid", gap: 6, justifyContent: "center" }}>
            <b>{t("No prompts read yet")}</b>
            <span style={{ color: "var(--muted)", fontSize: 12.5 }}>{t("Requests your agents send through magpie show here.")}</span>
          </div>
        )}
      </div>
    </main>
  );
}

/* ---------- Plugins ---------- */

const PLUGIN_TABS = [
  ["builtin", "Built-in"],
  ["discover", "Discover"],
  ["installed", "Installed"],
] as const;

type Builtin = {
  id: string;
  name: string;
  sub: string;
  on: boolean;
  feature?: string;
  locked?: boolean;
  /** nested config when on — Magpie schema form (demo: gateway recent calls) */
  callsPage?: number;
};

const BUILTINS_DEFAULT: Builtin[] = [
  {
    id: "gateway",
    name: "Gateway page",
    sub: "The gateway's state and keys, how to connect a client, its models and recent calls",
    on: true,
    locked: true,
    callsPage: 20,
  },
  {
    id: "routing-groups",
    name: "Routing groups",
    sub: "Several models agents pick as one: each request goes to the right one, and to the next when one fails",
    on: false,
  },
  {
    id: "library",
    name: "Library",
    sub: "Instructions, MCP servers, skills and hooks, kept once and given to every agent",
    on: false,
    feature: "library",
  },
  {
    id: "otel",
    name: "Observability",
    sub: "Send each request's traces and metrics to an OpenTelemetry collector, such as Langfuse",
    on: false,
    feature: "otel",
  },
  {
    id: "sessions",
    name: "Sessions",
    sub: "Your agents' past conversations: read, search, resume and export them",
    on: false,
    feature: "sessions",
  },
  {
    id: "warmups",
    name: "Warm-up and check-in",
    sub: "Start a subscription's usage window at a time you pick, and claim vendors' daily check-in credits",
    on: false,
  },
];

const DEMO_MARKET = [
  {
    kind: "pv" as const,
    section: "Subscriptions",
    note: "written for magpie, checked against its own sign-ins",
    cards: [
      { pkg: "@magpie-community/opencode-zen-free", name: "OpenCode Zen Free", summary: "OpenCode Zen's free models with the public credential, automatic discovery and native…", downloads: "3.0k/week", ver: "v0.1.1", community: true, kind: "Provider" },
      { pkg: "@magpie-community/opencode-zcode-auth", name: "ZCode", summary: "Z.ai and BigModel GLM Coding Plan, team seats and ZCode's free Start Plan.", downloads: "9.0k/week", ver: "v0.1.18", community: true, alsoBuiltin: true, kind: "Provider" },
      { pkg: "@magpie-community/opencode-qoder-auth", name: "Qoder", summary: "Your Qoder subscription, international (qoder.com) or Qoder CN (qoder.cn).", downloads: "5.6k/week", ver: "v0.2.15", community: true, alsoBuiltin: true, kind: "Provider" },
      { pkg: "@magpie-community/opencode-devin-auth", name: "Devin", summary: "Devin's models with your Devin account — a browser sign-in or the devin CLI's.", downloads: "2.9k/week", ver: "v0.1.16", community: true, alsoBuiltin: true, kind: "Provider" },
    ],
  },
  {
    kind: "mw" as const,
    section: "Gateway middleware",
    note: "runs in magpie's gateway on what every agent sends and gets back, whichever provider serves it",
    cards: [
      { pkg: "@magpie-community/demo-request-log", name: "Request logger", summary: "Logs each gateway call's request and reply — demo fold for options JSON.", downloads: "1.4k/week", ver: "v0.1.0", community: true, kind: "Middleware" },
    ],
  },
  {
    kind: "ag" as const,
    section: "Agents",
    note: "agents magpie has no setup of its own for",
    cards: [
      { pkg: "@magpie-community/demo-agent-bridge", name: "Demo agent bridge", summary: "Connect a third-party agent the way Magpie wires its own.", downloads: "620/week", ver: "v0.0.9", community: true, kind: "Agent" },
    ],
  },
  {
    kind: "gh" as const,
    section: "Unofficial, on GitHub",
    note: "repositories their authors tagged magpie-plugin — nobody has reviewed them; read the code before you install one",
    cards: [
      { pkg: "github:euanguo/magpie-middleware-image-keep", name: "magpie-middleware-image-keep", summary: "magpie gateway middleware: keep the newest images and replace older inline images with…", downloads: "2★", ver: "v0.2.0", unofficial: true, owner: "euanguo", stars: 2, kind: "Middleware", updated: "Oct 12, 2026", github: "https://github.com/euanguo/magpie-middleware-image-keep" },
      { pkg: "github:bingqilinweimaotai/magpie-github-sync", name: "magpie-github-sync", summary: "Encrypted GitHub sync bridge for Magpie WebDAV sync", downloads: "2★", ver: "v0.2.3", unofficial: true, owner: "bingqilinweimaotai", stars: 2, kind: "Provider", updated: "Oct 10, 2026", github: "https://github.com/bingqilinweimaotai/magpie-github-sync" },
      { pkg: "github:Hu9956/DSH-model-controls", name: "DSH-model-controls", summary: "切换供应商、模型与思考强度，每个模型各自记住档位。", downloads: "1★", ver: "v0.2.8", unofficial: true, owner: "Hu9956", stars: 1, kind: "Provider", updated: "Oct 14, 2026", github: "https://github.com/Hu9956/DSH-model-controls", readme: "DSH 模型控制器 — DeepSeek Harness for models and thinking intensity." },
      { pkg: "github:XcodeFish/opencode-cn-ai-auth", name: "opencode-cn-ai-auth", summary: "Magpie provider plugin for Loomy (iFlytek) and Raccoon (SenseTime) coding…", downloads: "1★", ver: "v0.2.1", unofficial: true, owner: "XcodeFish", stars: 1, kind: "Provider", updated: "Oct 8, 2026", github: "https://github.com/XcodeFish/opencode-cn-ai-auth" },
      { pkg: "github:SadWood/magpie-gaccode", name: "magpie-gaccode", summary: "Unofficial GACCode provider for magpie and OpenCode, with quota reporting and optiona…", downloads: "1★", ver: "v0.1.2", unofficial: true, owner: "SadWood", stars: 1, kind: "Provider", updated: "Oct 5, 2026", github: "https://github.com/SadWood/magpie-gaccode" },
      { pkg: "github:mu-zi-lee/magpie-chatgptweb", name: "magpie-chatgptweb", summary: "Magpie 的实验性 ChatGPT 网页接入插件：基于 Playwright 和独立浏览器配置，支持匿名聊天…", downloads: "1★", ver: "v0.1.0", unofficial: true, owner: "mu-zi-lee", stars: 1, kind: "Provider", updated: "Oct 1, 2026", github: "https://github.com/mu-zi-lee/magpie-chatgptweb" },
      { pkg: "github:broven/magpie-sub2api", name: "magpie-sub2api", summary: "magpie plugin for sub2api sites: models, and subscription/quota usage windows for routing", downloads: "0★", ver: "v0.2.1", unofficial: true, owner: "broven", stars: 0, kind: "Provider", updated: "Sep 28, 2026", github: "https://github.com/broven/magpie-sub2api" },
      { pkg: "github:ChenstarMr/opencode-dumate-auth", name: "opencode-dumate-auth", summary: "OpenCode / magpie provider plugin for Baidu DuMate (百度搭子)", downloads: "0★", ver: "v0.1.0", unofficial: true, owner: "ChenstarMr", stars: 0, kind: "Provider", updated: "Sep 20, 2026", github: "https://github.com/ChenstarMr/opencode-dumate-auth" },
    ],
  },
];


/** Magpie searchNPM Suggested hits (shots 20–24) — demo filter, 350ms debounce. */
const DEMO_NPM = [
  { pkg: "@magpie-community/opencode-zen-free", name: "OpenCode Zen Free", summary: "OpenCode Zen's free models with the public credential, automatic discovery and native…", downloads: "3.0k/week", ver: "v0.1.1", kind: "Provider", q: "opencode" },
  { pkg: "@magpie-community/opencode-zcode-auth", name: "ZCode", summary: "Z.ai and BigModel GLM Coding Plan, team seats and ZCode's free Start Plan.", downloads: "9.0k/week", ver: "v0.1.18", kind: "Provider", builtin: true, q: "opencode zcode" },
  { pkg: "@magpie-community/opencode-qoder-auth", name: "Qoder", summary: "Your Qoder subscription, international (qoder.com) or Qoder CN (qoder.cn).", downloads: "5.6k/week", ver: "v0.2.15", kind: "Provider", builtin: true, q: "opencode qoder" },
  { pkg: "@magpie-community/opencode-devin-auth", name: "Devin", summary: "Devin's models with your Devin account — a browser sign-in or the devin CLI's.", downloads: "2.9k/week", ver: "v0.1.16", kind: "Provider", builtin: true, q: "opencode" },
  { pkg: "opencode-pty", name: "opencode-pty", summary: "OpenCode plugin for interactive PTY management — run background processes.", downloads: "4.3k/week", ver: "v0.4.0", kind: "Provider", q: "opencode pty" },
  { pkg: "@mastra/opencode", name: "@mastra/opencode", summary: "OpenCode plugin for Mastra Observational Memory", downloads: "6.3k/week", ver: "v0.1.36", kind: "Provider", q: "opencode" },
  { pkg: "@brendonovich/vite-annotate", name: "@brendonovich/vite…", summary: "Select UI elements in a Vite app and send contextual feedback to OpenCode.", downloads: "8.8k/week", ver: "v0.1.4", kind: "Provider", q: "opencode vite" },
];

/** Magpie On npm standing hits when Suggested is empty (shot 24 zzzzqq) */
const DEMO_ON_NPM = [
  { pkg: "ai-sdk-provider-opencode", name: "ai-sdk-provider-opencode", summary: "Vercel AI SDK provider bridge for OpenCode models.", downloads: "1.2k/week", ver: "v0.3.0" },
  { pkg: "opencode-poe-auth", name: "opencode-poe-auth", summary: "Poe auth helper for OpenCode plugin hosts.", downloads: "840/week", ver: "v0.1.4" },
  { pkg: "opencode-models-discovery", name: "opencode-models-discovery", summary: "Discover model ids from an OpenCode host.", downloads: "2.1k/week", ver: "v0.2.0" },
];

/** Extra On npm cards when Mirrors in China is On (shot 25) */
const DEMO_ON_NPM_MIRROR = [
  { pkg: "plannotator", name: "Plannotator", summary: "Plan annotator middleware for gateway traces.", downloads: "320/week", ver: "v0.0.8" },
  { pkg: "@brendonovich/vite-annotate", name: "@brendonovich/vite…", summary: "Select UI elements in a Vite app and send contextual feedback to OpenCode.", downloads: "8.8k/week", ver: "v0.1.4" },
  { pkg: "opencode-pty", name: "opencode-pty", summary: "OpenCode plugin for interactive PTY management.", downloads: "4.3k/week", ver: "v0.4.0" },
  { pkg: "@mastra/opencode", name: "@mastra/opencode", summary: "OpenCode plugin for Mastra Observational Memory", downloads: "6.3k/week", ver: "v0.1.36" },
];


export function PluginsView({
  onStatus,
}: {
  onStatus?: (msg: string, kind?: string, ms?: number) => void;
} = {}) {
  const [tab, setTab] = useState<string>(() => {
    try {
      return localStorage.getItem("magpie.pluginTab") || "discover";
    } catch {
      return "discover";
    }
  });
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [manualSpec, setManualSpec] = useState("");
  const [folderHint, setFolderHint] = useState("");
  const [folderPicker, setFolderPicker] = useState(false);
  const [folderLoc, setFolderLoc] = useState<"recent" | "home" | "other">("recent");
  const [mirror, setMirror] = useState(false);
  const [mirrorTip, setMirrorTip] = useState(false);
  const [builtins, setBuiltins] = useState(() => {
    try {
      const on = localStorage.getItem("magpie.feature.library") === "1";
      return BUILTINS_DEFAULT.map((b) => (b.id === "library" ? { ...b, on } : b));
    } catch {
      return BUILTINS_DEFAULT;
    }
  });
  const [installed, setInstalled] = useState<
    {
      pkg: string;
      name: string;
      ver?: string;
      kind?: string;
      off?: boolean;
      optsOpen?: boolean;
      opts?: string;
      optsErr?: string;
      optsSaved?: boolean;
      /** Magpie movable: built-in subscription names this plugin can/does serve */
      movable?: string[];
      moved?: string[];
    }[]
  >([]); /* native empty Installed (shot 18); Install demos fill it */
  const [busy, setBusy] = useState<string | null>(null);
  const [pluginsSort, setPluginsSort] = useState<"az" | "za">(() => {
    try {
      const v = localStorage.getItem("magpie.sort.plugins");
      return v === "za" ? "za" : "az";
    } catch {
      return "az";
    }
  });
    const [asking, setAsking] = useState<{ pkg: string; op: "remove" | "off" | "move" } | null>(null);
  /** Magpie confirmRemoval when Remove with no moved accounts (shot 40 not clicked; Magpie source) */
  const [removeConfirm, setRemoveConfirm] = useState<{ pkg: string; name: string } | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [pluginDetail, setPluginDetail] = useState<(typeof DEMO_MARKET)[number]["cards"][number] | null>(null);
  /** Magpie detail: pm-rskel until README resolves */
  const [detailReadmeReady, setDetailReadmeReady] = useState(false);
  const [gwCallsOpen, setGwCallsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("magpie.pluginTab", tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  useEffect(() => {
    if (!pluginDetail) {
      setDetailReadmeReady(false);
      return;
    }
    setDetailReadmeReady(false);
    const id = window.setTimeout(() => setDetailReadmeReady(true), 180);
    return () => clearTimeout(id);
  }, [pluginDetail]);

  // Magpie askNPM: 350ms debounce, then brief plugins/search loading (hits.loading → skeleton)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setDebouncedQ("");
      setSearchBusy(false);
      return;
    }
    setSearchBusy(true);
    let round: number | undefined;
    const id = window.setTimeout(() => {
      setDebouncedQ(q.toLowerCase());
      // Magpie On npm stays on skeleton while searchNPM resolves
      round = window.setTimeout(() => setSearchBusy(false), 220);
    }, 350);
    return () => {
      clearTimeout(id);
      if (round !== undefined) clearTimeout(round);
    };
  }, [query]);

  const npmHits = useMemo(() => {
    if (!debouncedQ) return [] as typeof DEMO_NPM;
    return DEMO_NPM.filter((c) => `${c.name} ${c.pkg} ${c.q}`.toLowerCase().includes(debouncedQ));
  }, [debouncedQ]);

  const lookupPluginMeta = (pkg: string) => {
    const fromNpm = DEMO_NPM.find((x) => x.pkg === pkg);
    if (fromNpm) return { ver: fromNpm.ver, kind: fromNpm.kind || "Provider" };
    for (const sec of DEMO_MARKET) {
      const c = sec.cards.find((x) => x.pkg === pkg);
      if (c) return { ver: (c as { ver?: string }).ver, kind: (c as { kind?: string }).kind || "Provider" };
    }
    return { ver: undefined as string | undefined, kind: "Provider" as string };
  };

  const install = (pkg: string, name: string) => {
    if (busy) return;
    setBusy(pkg);
    // Magpie: no Bun yet → "Getting Bun…" then stay on Discover + toast (shots 37–39)
    window.setTimeout(() => {
      const meta = lookupPluginMeta(pkg);
      setInstalled((list) =>
        list.some((x) => x.pkg === pkg)
          ? list
          : [...list, { pkg, name, ver: meta.ver, kind: meta.kind, opts: "", optsOpen: false }],
      );
      setBusy(null);
      onStatus?.(t("{name} is installed", { name }), "ok", 3500);
    }, 1100);
  };

  const installAct = (pkg: string, has: boolean) => {
    if (busy === pkg) {
      return (
        <>
          <span className="spin" aria-hidden />
          <span>{t("Getting Bun…")}</span>
        </>
      );
    }
    if (has) {
      return (
        <>
          <svg
            viewBox="0 0 16 16"
            width={11}
            height={11}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3.2 8.2 6.4 11.4 12.8 4.2" />
          </svg>
          <span>{t("Installed")}</span>
        </>
      );
    }
    return t("Install");
  };

  const n = installed.length;

  return (
    <main className="view" id="view-plugins">
      <div className="lib-head pm-head row-head" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Segs
          value={tab}
          onChange={setTab}
          items={PLUGIN_TABS.map(([id, en]) => ({
            id,
            label: id === "installed" && n ? `${t(en)} · ${n}` : t(en),
          }))}
        />
        <span className="grow" />
        {tab !== "builtin" ? (
          <button
            type="button"
            className={`pm-mirror${mirror ? " on" : ""}`}
            style={{ position: "relative" }}
            role="switch"
            aria-checked={mirror}
            title={t("Download the plugin list, plugins and Bun from mirrors in China first (npmmirror, jsDelivr), their official addresses after. Each is a copy of the very file, checked as the original is")}
            onMouseEnter={() => setMirrorTip(true)}
            onMouseLeave={() => setMirrorTip(false)}
            onFocus={() => setMirrorTip(true)}
            onBlur={() => setMirrorTip(false)}
            onClick={() => {
              setMirror((m) => !m);
              setSearchBusy(true);
              window.setTimeout(() => setSearchBusy(false), 420);
            }}
          >
            <span>{t("Mirrors in China")}</span>
            <span className={`lib-switch${mirror ? " on" : ""}`}>
              <i />
            </span>
            {mirrorTip ? (
              <span className="pm-mirror-tip" role="tooltip" style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, zIndex: 30, maxWidth: 280, padding: "8px 10px", borderRadius: 8, background: "var(--fg)", color: "var(--card)", fontSize: 11.5, lineHeight: 1.4, boxShadow: "0 8px 24px color-mix(in srgb, var(--fg) 25%, transparent)", animation: "fade-in .12s var(--ease)", pointerEvents: "none" }}>
                {t("Download the plugin list, plugins and Bun from mirrors in China first (npmmirror, jsDelivr), their official addresses after. Each is a copy of the very file, checked as the original is")}
              </span>
            ) : null}
          </button>
        ) : null}
        {tab !== "builtin" ? (
          <label className="pm-find">
            <svg viewBox="0 0 16 16" width={13} height={13} aria-hidden>
              <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              spellCheck={false}
              autoComplete="off"
              placeholder={t("Search plugins and npm…")}
              aria-label={t("Search plugins")}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (tab !== "discover") setTab("discover");
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape" && query) setQuery("");
              }}
            />
          </label>
        ) : null}
      </div>

      <div className="lib-body pm-body">
        {tab === "builtin" ? (
          <>
            <p className="feat-say">
              {t("Parts of magpie not everyone needs. Switched off, a part leaves the sidebar, its pages and Settings; magpie works the same either way.")}
            </p>
            <div className="list prefs" id="builtinList">
              {builtins.map((b) => (
                <div key={b.id}>
                  <div className="row pref feat-row" data-feature={b.feature} data-id={b.id}>
                    <div className="who">
                      <div className="name">{t(b.name)}</div>
                      <div className="sub">{t(b.sub)}</div>
                      {b.on && b.id === "gateway" ? (
                        <div className="sub feat-use">{t("1 gateway key")}</div>
                      ) : null}
                      {b.locked ? (
                        <div className="sub feat-why">{t("In use, so it stays on")}</div>
                      ) : null}
                    </div>
                    <div className="val">
                      <button
                        type="button"
                        className={`lib-switch use-credits${b.on ? " on" : ""}`}
                        role="switch"
                        aria-checked={b.on}
                        aria-label={t(b.name)}
                        disabled={!!b.locked}
                        title={b.locked ? t("In use, so it stays on") : undefined}
                        onClick={() => {
                          if (b.locked) return;
                          setBuiltins((list) => {
                            const next = list.map((x) => (x.id === b.id ? { ...x, on: !x.on } : x));
                            const lib = next.find((x) => x.id === "library");
                            try {
                              localStorage.setItem("magpie.feature.library", lib?.on ? "1" : "0");
                              window.dispatchEvent(new Event("magpie-feature"));
                            } catch { /* */ }
                            return next;
                          });
                        }}
                      >
                        <i />
                      </button>
                    </div>
                  </div>
                  {b.on && b.id === "gateway" ? (
                    <div className="row pref feat-set" data-of="gateway" style={{ position: "relative" }}>
                      <div className="who">
                        <div className="name">{t("Recent calls at a time")}</div>
                        <div className="sub">
                          {t("How many of the gateway's recent calls the page shows, and how many more each Show more adds")}
                        </div>
                      </div>
                      <div className="val">
                        <button
                          type="button"
                          className={`sess-pick set${gwCallsOpen ? " open" : ""}`}
                          aria-haspopup="menu"
                          aria-expanded={gwCallsOpen}
                          onClick={() => setGwCallsOpen((o) => !o)}
                        >
                          <span>{b.callsPage ?? 20}</span>
                          <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden>
                            <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                          </svg>
                        </button>
                        <ProtoMenu
                          open={gwCallsOpen}
                          onClose={() => setGwCallsOpen(false)}
                          value={String(b.callsPage ?? 20)}
                          title={t("Recent calls at a time")}
                          items={[10, 20, 50, 100].map((n) => ({ v: String(n), name: String(n) }))}
                          onPick={(v) =>
                            setBuiltins((list) =>
                              list.map((x) => (x.id === "gateway" ? { ...x, callsPage: Number(v) } : x)),
                            )
                          }
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : null}

        {tab === "discover" ? (
          <>
            {!query.trim() ? (
              <div className="pm-intro">
                <div className="pm-introtext">
                  <h2>{t("Subscriptions and gateway middleware")}</h2>
                  <p>
                    {t(
                      "Plugins sign in to coding plans and make their requests; the models then work in every agent, like any provider's. They're OpenCode's provider plugins or pi's packages, run on Bun.",
                    )}
                  </p>
                  <p>
                    {t(
                      "A plugin can also be middleware in magpie's gateway: it reads and rewrites what agents send and get back, for every provider.",
                    )}{" "}
                    <button
                      type="button"
                      className="pm-link"
                      onClick={() => window.open("https://usemagpie.ai/docs/plugins#middleware", "_blank", "noopener")}
                    >
                      {t("Write a middleware")}
                      <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden>
                        <path d="M3.5 2.5h6v6M9.5 2.5 3 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </button>
                  </p>
                  <div className="pm-trust">
                    <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden>
                      <path d="M8 2.3 13 4v3.8c0 3-2.1 5.1-5 5.9-2.9-.8-5-2.9-5-5.9V4z" fill="none" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M5.8 8l1.6 1.6 2.9-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span>{t("A plugin is someone else's code with your sign-in or your requests: install the ones you trust.")}</span>
                  </div>
                </div>
                <div className="pm-art" aria-hidden>
                  {["Z", "✦", "G", "◇", "◈"].map((lab, i) => (
                    <div className="pm-logo" key={i}>{lab}</div>
                  ))}
                </div>
              </div>
            ) : null}
            {/* Magpie: market sections only when search empty; search → Suggested + On npm */}
            {!query.trim()
              ? DEMO_MARKET.map((sec) => {
              const cards = sec.cards;
              if (!cards.length) return null;
              return (
                <div className="pm-sec" key={sec.kind}>
                  <div className="pm-sechead">
                    <h3>{t(sec.section)}</h3>
                    <span>{t(sec.note)}</span>
                  </div>
                  <div className="pm-grid">
                    {cards.map((c) => {
                      const has = installed.some((x) => x.pkg === c.pkg);
                      return (
                        <div
                          className={`pm-card${busy === c.pkg ? " installing" : ""}${has ? " has" : ""}`}
                          key={c.pkg}
                          tabIndex={0}
                          role="button"
                          onClick={() => setPluginDetail(c)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setPluginDetail(c);
                            }
                          }}
                        >
                          <div className="pm-logo" aria-hidden>
                            ◆
                          </div>
                          <div className="pm-words" style={{ flex: 1, minWidth: 0 }}>
                            <div className="pm-name" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <b style={{ fontSize: 13 }}>{c.name}</b>
                              {"alsoBuiltin" in c && (c as { alsoBuiltin?: boolean }).alsoBuiltin ? (
                                <span className="pm-chip">{t("Also built in")}</span>
                              ) : null}
                            </div>
                            {"community" in c && (c as { community?: boolean }).community ? (
                              <div className="pm-by" style={{ fontSize: 11, color: "var(--green)", marginTop: 2 }}>
                                {t("magpie community")}
                              </div>
                            ) : "owner" in c && (c as { owner?: string }).owner ? (
                              <div className="pm-by" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                                {(c as { owner?: string }).owner}
                              </div>
                            ) : null}
                            <p className="pm-sum" style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>{c.summary}</p>
                            <div className="pm-meta" style={{ marginTop: 6, fontSize: 11, color: "var(--faint)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              {"kind" in c && (c as { kind?: string }).kind ? <span className="pm-chip">{t((c as { kind: string }).kind)}</span> : null}
                              {"unofficial" in c && (c as { unofficial?: boolean }).unofficial ? (
                                <span className="pm-chip warn"><span className="dot" />{t("Unofficial")}</span>
                              ) : null}
                              {"stars" in c && (c as { stars?: number }).stars != null ? <span>★ {(c as { stars: number }).stars}</span> : null}
                              <span>{c.downloads}</span>
                              {"ver" in c && (c as { ver?: string }).ver ? <span className="pm-ver">{(c as { ver: string }).ver}</span> : null}
                              {mirror ? <span>{t("via China mirrors")}</span> : null}
                            </div>
                          </div>
                          <button
                            type="button"
                            className={`pm-act${busy === c.pkg ? " busy" : has ? " done" : " get"}`}
                            title={busy === c.pkg ? t("Plugins run on Bun {v}, downloaded once", { v: "1.4.2" }) : undefined}
                            disabled={busy === c.pkg || has}
                            onClick={(e) => {
                              e.stopPropagation();
                              install(c.pkg, c.name);
                            }}
                          >
                            {installAct(c.pkg, has)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
              : null}
            {/* Magpie: Suggested only when listings match; On npm always while searching (shots 20–25) */}
            {debouncedQ && npmHits.length ? (
              <div className="pm-sec" style={{ animation: "fade-in .2s var(--ease)" }}>
                <div className="pm-sechead">
                  <h3>{t("Suggested")}</h3>
                  <span>{searchBusy ? t("Searching…") : mirror ? t("via China mirrors") : ""}</span>
                </div>
                <div className="pm-grid">
                  {npmHits.map((c) => {
                    const has = installed.some((x) => x.pkg === c.pkg);
                    return (
                      <div className={`pm-card${busy === c.pkg ? " installing" : ""}${has ? " has" : ""}`} key={c.pkg} tabIndex={0} role="button">
                        <div className="pm-logo" aria-hidden>◆</div>
                        <div className="pm-words" style={{ flex: 1, minWidth: 0 }}>
                          <b style={{ fontSize: 13 }}>{c.name}</b>
                          {c.builtin ? <span className="pm-chip" style={{ marginLeft: 6, fontSize: 10.5 }}>{t("Also built in")}</span> : null}
                          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>{c.summary}</p>
                          <div style={{ marginTop: 6, fontSize: 11, color: "var(--faint)" }}>
                            {c.kind} · {c.downloads} · {c.ver}
                            {mirror ? ` · ${t("via China mirrors")}` : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`pm-act${busy === c.pkg ? " busy" : has ? " done" : " get"}`}
                          title={busy === c.pkg ? t("Plugins run on Bun {v}, downloaded once", { v: "1.4.2" }) : undefined}
                            disabled={busy === c.pkg || has}
                          onClick={(e) => {
                            e.stopPropagation();
                            install(c.pkg, c.name);
                          }}
                        >
                          {installAct(c.pkg, has)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {debouncedQ ? (
              <div className="pm-sec" style={{ animation: "fade-in .2s var(--ease)", marginTop: 10 }}>
                <div className="pm-sechead">
                  <h3>{t("On npm")}</h3>
                  <span>{t("OpenCode plugins and pi packages anyone published — read what one does before you install it")}</span>
                </div>
                {searchBusy ? (
                  <div className="pm-grid" aria-busy="true" aria-label={t("Searching…")}>
                    {Array.from({ length: 2 }, (_, i) => (
                      <div className="pm-card ghost" key={i} aria-hidden>
                        <div className="g1" />
                        <div className="g2" />
                        <div className="g3" />
                      </div>
                    ))}
                  </div>
                ) : (() => {
                  const known = new Set(npmHits.map((c) => c.pkg));
                  const base = mirror ? DEMO_ON_NPM_MIRROR : DEMO_ON_NPM;
                  const list = base.filter((x) => !known.has(x.pkg));
                  if (!list.length) {
                    return <p className="pm-note">{npmHits.length ? t("Nothing else on npm") : t("No plugin called “{q}”", { q: query.trim() })}</p>;
                  }
                  return (
                    <div className="pm-grid">
                      {list.map((c) => {
                        const has = installed.some((x) => x.pkg === c.pkg);
                        return (
                          <div className={`pm-card${busy === c.pkg ? " installing" : ""}${has ? " has" : ""}`} key={c.pkg} tabIndex={0} role="button">
                            <div className="pm-logo" aria-hidden>◆</div>
                            <div className="pm-words" style={{ flex: 1, minWidth: 0 }}>
                              <b style={{ fontSize: 13 }}>{c.name}</b>
                              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>{c.summary}</p>
                              <div style={{ marginTop: 6, fontSize: 11, color: "var(--faint)" }}>
                                {c.pkg} · {c.downloads} · {c.ver}
                                {mirror ? ` · ${t("via China mirrors")}` : ""}
                              </div>
                            </div>
                            <button
                              type="button"
                              className={`pm-act${busy === c.pkg ? " busy" : has ? " done" : " get"}`}
                              title={busy === c.pkg ? t("Plugins run on Bun {v}, downloaded once", { v: "1.4.2" }) : undefined}
                            disabled={busy === c.pkg || has}
                              onClick={(e) => {
                                e.stopPropagation();
                                install(c.pkg, c.name);
                              }}
                            >
                              {installAct(c.pkg, has)}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            ) : null}
            {query.trim().length >= 2 && !debouncedQ && searchBusy ? (
              <div className="pm-sec" style={{ animation: "fade-in .16s var(--ease)" }} aria-busy="true" aria-label={t("Searching…")}>
                <div className="pm-grid">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div className="pm-card ghost" key={i} aria-hidden>
                      <div className="g1" />
                      <div className="g2" />
                      <div className="g3" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="pm-sec" style={{ marginTop: 8 }}>
              <div className="pm-manual">
                <span className="pm-mlabel">{t("Have one in mind?")}</span>
                <input
                  className="pm-minput"
                  placeholder={t("npm package, GitHub repo (github:owner/repo) or a folder")}
                  aria-label={t("Plugin")}
                  value={manualSpec}
                  onChange={(e) => setManualSpec(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  className="pm-browse"
                  title={t("Choose a folder on this computer")}
                  aria-label={t("Choose a folder")}
                  onClick={() => {
                    setFolderLoc("recent");
                    setFolderPicker(true);
                  }}
                >
                  <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden>
                    <path d="M2 4.5h4l1.2 1.5H14v7H2z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="text primary"
                  disabled={!manualSpec.trim() || busy === "__manual__"}
                  onClick={() => {
                    const spec = manualSpec.trim();
                    if (!spec || busy) return;
                    setBusy("__manual__");
                    window.setTimeout(() => {
                      const name = spec.split("/").pop() || spec;
                      setInstalled((list) =>
                        list.some((x) => x.pkg === spec)
                          ? list
                          : [...list, { pkg: spec, name, ver: undefined, kind: "Provider", opts: "", optsOpen: false }],
                      );
                      setBusy(null);
                      setManualSpec("");
                      onStatus?.(t("{name} is installed", { name }), "ok", 3500);
                    }, 1100);
                  }}
                >
                  {busy === "__manual__" ? (
                    <>
                      <span className="spin" aria-hidden style={{ display: "inline-block", width: 10, height: 10, marginRight: 6, verticalAlign: -1 }} />
                      {t("Getting Bun…")}
                    </>
                  ) : (
                    t("Install")
                  )}
                </button>
                {folderHint ? <span style={{ flexBasis: "100%", fontSize: 11.5, color: "var(--muted)", animation: "fade-in .15s var(--ease)" }}>{folderHint}</span> : null}
              </div>
            </div>
          </>
        ) : null}

        {tab === "installed" ? (
          !installed.length ? (
            <div className="pm-none">
              <div className="pm-logo big" aria-hidden>
                ◆
              </div>
              <b>{t("No plugins yet")}</b>
              <p>{t("Install a subscription or a middleware from Discover; a subscription signs in from here.")}</p>
              <button type="button" className="pm-act get" onClick={() => setTab("discover")}>
                {t("Discover plugins")}
              </button>
            </div>
          ) : (
            <>
              {installed.length > 1 ? (
                <div className="row-head pm-listhead" style={{ marginBottom: 6 }}>
                  <span className="grow" />
                  <div className="segs sortby" data-sort="plugins" role="group" aria-label={t("Names from A to Z")}>
                    {([["az", "A→Z"], ["za", "Z→A"]] as const).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={`opt${pluginsSort === id ? " on" : ""}`}
                        title={id === "az" ? t("Names from A to Z") : t("Names from Z to A")}
                        onClick={() => {
                          setPluginsSort(id);
                          try { localStorage.setItem("magpie.sort.plugins", id); } catch { /* */ }
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="list pm-list">
                {[...installed]
                  .sort((a, b) => (pluginsSort === "za" ? -1 : 1) * a.name.localeCompare(b.name))
                  .map((e) => (
                  <div className={`row pref pm-row${e.off ? " off" : ""}`} key={e.pkg}>
                    <div className="pm-logo" aria-hidden style={{ width: 32, height: 32, flex: "none" }}>
                      ◆
                    </div>
                    <div className="who">
                      <div className="name" style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span>{e.name}</span>
                        {e.ver ? <span className="pm-ver">{e.ver.startsWith("v") ? e.ver : `v${e.ver}`}</span> : null}
                        {e.kind && !e.off ? (
                          <span
                            className={`pm-chip kind${e.kind === "Provider" ? " pv" : e.kind === "Middleware" ? " mw" : e.kind === "Agent" ? " ag" : ""}`}
                            title={
                              e.kind === "Provider"
                                ? t("Signs in to a subscription and serves its models")
                                : e.kind === "Middleware"
                                  ? t("Runs in magpie's gateway on what every agent sends and gets back")
                                  : undefined
                            }
                          >
                            {e.kind === "Provider" ? (
                              <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
                                <path d="M6 2v3 M10 2v3 M4.5 5h7v2.5a3.5 3.5 0 0 1-7 0z M8 11v3" />
                              </svg>
                            ) : null}
                            <span>{t(e.kind)}</span>
                          </span>
                        ) : null}
                        {e.moved?.length && !e.off ? (
                          <span className="pm-chip moved" title={t("{names} runs on this plugin in place of the built-in", { names: e.moved.join(t(", ")) })}>
                            <span className="dot" />
                            <span>{t("Serves {names}", { names: e.moved.join(t(", ")) })}</span>
                          </span>
                        ) : null}
                      </div>
                      <div className={`sub${asking?.pkg === e.pkg ? " ask" : ""}`}>
                        {asking?.pkg === e.pkg
                          ? null
                          : e.off
                            ? t("Off")
                            : null}
                      </div>
                      {e.optsOpen ? (
                        <div className="pm-opts">
                          <textarea
                            aria-label={t("Options")}
                            rows={Math.min(10, Math.max(4, (e.opts || "").split("\n").length + 1))}
                            placeholder='{\n  "hooks": ["request", "response"],\n  "onEvent": ["error"]\n}'
                            value={e.opts || '{\n  "hooks": ["request", "response"],\n  "onEvent": ["error"]\n}'}
                            onChange={(ev) =>
                              setInstalled((list) =>
                                list.map((x) => (x.pkg === e.pkg ? { ...x, opts: ev.target.value, optsErr: "" } : x)),
                              )
                            }
                            onKeyDown={(ev) => {
                              if (ev.key === "Escape") {
                                setInstalled((list) => list.map((x) => (x.pkg === e.pkg ? { ...x, optsOpen: false } : x)));
                              }
                            }}
                          />
                          {e.optsErr ? (
                            <div className="pm-opts-err" role="alert">
                              {e.optsErr}
                            </div>
                          ) : null}
                          <div className="pm-opts-bar">
                            <span>{e.optsSaved ? t("Applied to the next request") : t("Not set: these are its package's example")}</span>
                            <button
                              type="button"
                              className="text quiet"
                              onClick={() =>
                                setInstalled((list) =>
                                  list.map((x) => (x.pkg === e.pkg ? { ...x, opts: "", optsSaved: false, optsErr: "" } : x)),
                                )
                              }
                            >
                              {t("Clear")}
                            </button>
                            <button
                              type="button"
                              className="text"
                              onClick={() =>
                                setInstalled((list) => list.map((x) => (x.pkg === e.pkg ? { ...x, optsOpen: false } : x)))
                              }
                            >
                              {t("Cancel")}
                            </button>
                            <button
                              type="button"
                              className="text primary"
                              onClick={() => {
                                try {
                                  const raw = e.opts || "{}";
                                  const v = JSON.parse(raw);
                                  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error(t("Options are a JSON object"));
                                  setInstalled((list) =>
                                    list.map((x) =>
                                      x.pkg === e.pkg ? { ...x, optsSaved: true, optsErr: "", optsOpen: false } : x,
                                    ),
                                  );
                                } catch (err) {
                                  const msg = err instanceof Error ? err.message : String(err);
                                  setInstalled((list) =>
                                    list.map((x) =>
                                      x.pkg === e.pkg ? { ...x, optsErr: t("Not JSON: {error}", { error: msg }) } : x,
                                    ),
                                  );
                                }
                              }}
                            >
                              {t("Save")}
                            </button>
                          </div>
                          <div className="sub pm-mw" style={{ marginTop: 2 }}>
                            {t("Gateway middleware: {hooks}", { hooks: "request, response" })}
                            {" · "}
                            {t("{n} calls, {us} µs each", { n: "0", us: "0" })}
                          </div>
                        </div>
                      ) : null}
                      {asking?.pkg === e.pkg ? (
                        <div
                          className="pm-ask"
                          role="group"
                          aria-label={
                            asking.op === "remove"
                              ? t("Remove this plugin?")
                              : asking.op === "move"
                                ? t("Move {name} here", { name: (e.movable || e.moved || ["…"])[0] })
                                : t("Switch this plugin off?")
                          }
                        >
                          <p className="pm-ask-say">
                            {asking.op === "remove"
                              ? t("Remove this plugin?")
                              : asking.op === "move"
                                ? t("Move {name} here", { name: (e.movable || ["Kimi Code"])[0] })
                                : t("Switch this plugin off?")}
                          </p>
                          <p className="pm-ask-sub">
                            {asking.op === "move"
                              ? t("{names} can run on it again, with the same accounts.", {
                                  names: (e.movable || ["Kimi Code"]).join(t(", ")),
                                })
                              : asking.op === "remove"
                                ? e.moved?.length
                                  ? t(
                                      "{names} goes back to the built-in, with its accounts, before the plugin is removed.",
                                      { names: e.moved.join(t(", ")) },
                                    )
                                  : demoCopy(
                                      "演示：移除只从本页列表删掉，不碰磁盘。",
                                      "Demo: remove only clears this page list — nothing on disk.",
                                    )
                                : e.moved?.length
                                  ? t(
                                      "{names} goes back to the built-in, with its accounts, before the plugin is switched off.",
                                      { names: e.moved.join(t(", ")) },
                                    )
                                  : demoCopy(
                                      "关掉后订阅账户会回到内置；演示仅本地标记 Off。",
                                      "Off sends subscription accounts back to built-ins; demo only marks Off locally.",
                                    )}
                          </p>
                          <div className="pm-ask-acts">
                            <button
                              type="button"
                              className="text primary"
                              onClick={() => {
                                if (asking.op === "remove") setInstalled((list) => list.filter((x) => x.pkg !== e.pkg));
                                else if (asking.op === "move")
                                  setInstalled((list) =>
                                    list.map((x) =>
                                      x.pkg === e.pkg
                                        ? { ...x, moved: x.movable || x.moved || ["Kimi Code"], off: false }
                                        : x,
                                    ),
                                  );
                                else setInstalled((list) => list.map((x) => (x.pkg === e.pkg ? { ...x, off: true, moved: [] } : x)));
                                setAsking(null);
                              }}
                            >
                              {asking.op === "move" ? t("Move") : t("Yes")}
                            </button>
                            <button type="button" className="text" onClick={() => setAsking(null)}>
                              {asking.op === "move" ? t("Not now") : t("Cancel")}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="val" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {e.movable?.length && !e.off && !(e.moved && e.moved.length) && asking?.pkg !== e.pkg ? (
                        <button
                          type="button"
                          className="text primary"
                          title={t(
                            "Runs {name} on this plugin in place of the built-in, with the same accounts; nothing changes if one doesn't work through it",
                            { name: e.movable[0] },
                          )}
                          onClick={() => setAsking({ pkg: e.pkg, op: "move" })}
                        >
                          {busy === e.pkg ? t("Moving…") : t("Move {name} here", { name: e.movable[0] })}
                        </button>
                      ) : null}
                      {e.kind === "Middleware" && !e.off ? (
                        <button
                          type="button"
                          className="text"
                          onClick={() =>
                            setInstalled((list) =>
                              list.map((x) => (x.pkg === e.pkg ? { ...x, optsOpen: !x.optsOpen } : x)),
                            )
                          }
                        >
                          {e.optsOpen ? t("Close") : t("Options")}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="text"
                        onClick={() => {
                          if (e.off) {
                            setInstalled((list) =>
                              list.map((x) => (x.pkg === e.pkg ? { ...x, off: false } : x)),
                            );
                            // Magpie again(): offer movable after switch-on
                            if (e.movable?.length) setAsking({ pkg: e.pkg, op: "move" });
                            else setAsking(null);
                          } else if (e.moved?.length) {
                            setAsking({ pkg: e.pkg, op: "off" });
                          } else {
                            // Magpie: no moved → off immediately (shot 40 not clicked)
                            setInstalled((list) => list.map((x) => (x.pkg === e.pkg ? { ...x, off: true, moved: [] } : x)));
                            setAsking(null);
                          }
                        }}
                      >
                        {e.off ? t("Switch on") : t("Switch off")}
                      </button>
                      <button
                        type="button"
                        className="text quiet"
                        title={
                          e.moved?.length
                            ? t("{names} goes back to the built-in first, then the plugin is removed", {
                                names: e.moved.join(t(", ")),
                              })
                            : t("Removes the plugin and what it installed; its sign-ins are kept until you sign out")
                        }
                        onClick={() => {
                          if (e.moved?.length) setAsking({ pkg: e.pkg, op: "remove" });
                          else setRemoveConfirm({ pkg: e.pkg, name: e.name });
                        }}
                      >
                        {t("Remove")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pm-foot" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("Plugins run on Bun {v}", { v: "1.4.2" })}</span>
                <span className="grow" />
                <button
                  type="button"
                  className={`text pm-check${checkingUpdates ? " busy" : ""}`}
                  disabled={checkingUpdates || !!busy}
                  title={t("Ask npm now for each plugin's newest version")}
                  onClick={() => {
                    if (checkingUpdates || busy) return;
                    setCheckingUpdates(true);
                    window.setTimeout(() => {
                      setCheckingUpdates(false);
                      onStatus?.(t("Every plugin is up to date"), "ok", 2500);
                    }, 900);
                  }}
                >
                  {checkingUpdates ? (
                    <>
                      <span className="spin" aria-hidden style={{ display: "inline-block", width: 10, height: 10, marginRight: 6, verticalAlign: -1 }} />
                      {t("Checking…")}
                    </>
                  ) : (
                    t("Check for updates")
                  )}
                </button>
              </div>
            </>
          )
        ) : null}
      </div>

      {removeConfirm ? (
        <dialog
          className="action-confirm"
          open
          role="alertdialog"
          aria-labelledby="pluginRemoveTitle"
          aria-describedby="pluginRemoveMsg"
          style={{ zIndex: 50 }}
          onCancel={(e) => {
            e.preventDefault();
            setRemoveConfirm(null);
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setRemoveConfirm(null);
          }}
        >
          <h2 id="pluginRemoveTitle">{t("Remove {name}?", { name: removeConfirm.name })}</h2>
          <p id="pluginRemoveMsg">
            {t("Removes the plugin and what it installed; its sign-ins are kept until you sign out")}
          </p>
          <div className="bar">
            <span className="grow" />
            <button type="button" className="text" onClick={() => setRemoveConfirm(null)}>
              {t("Cancel")}
            </button>
            <button
              type="button"
              className="text primary danger-fill"
              onClick={() => {
                const pkg = removeConfirm.pkg;
                const name = removeConfirm.name;
                setInstalled((list) => list.filter((x) => x.pkg !== pkg));
                setRemoveConfirm(null);
                onStatus?.(t("{name} removed", { name }), "ok", 2500);
              }}
            >
              {t("Remove")}
            </button>
          </div>
        </dialog>
      ) : null}

      {folderPicker ? (
        <div
          className="modal open"
          role="dialog"
          aria-modal="true"
          aria-label={t("Choose a plugin folder")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setFolderPicker(false);
          }}
        >
          <div
            className="dialog"
            style={{
              width: "min(640px, 92vw)",
              maxHeight: "min(520px, 85vh)",
              display: "flex",
              flexDirection: "column",
              animation: "pop-in .42s cubic-bezier(.16,1,.3,1)",
            }}
          >
            <div className="ehead" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <b id="folderTitle">{t("Choose a plugin folder")}</b>
            </div>
            <div className="ebody" style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 0, minHeight: 280, padding: 0 }}>
              <nav style={{ borderRight: "1px solid var(--line)", padding: "8px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
                {(
                  [
                    ["recent", t("Recent")],
                    ["home", t("Home")],
                    ["other", t("Other Locations")],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`text${folderLoc === id ? " on" : ""}`}
                    style={{
                      justifyContent: "flex-start",
                      padding: "6px 8px",
                      borderRadius: 6,
                      background: folderLoc === id ? "var(--pill)" : "transparent",
                      color: folderLoc === id ? "var(--fg)" : "var(--muted)",
                    }}
                    onClick={() => setFolderLoc(id)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              <div style={{ padding: "10px 12px", overflow: "auto" }}>
                {folderLoc === "recent" ? (
                  <p style={{ color: "var(--muted)", fontSize: 12.5, padding: "24px 8px", textAlign: "center" }}>
                    {demoCopy("最近为空", "Recent is empty")}
                  </p>
                ) : null}
                {folderLoc === "home" ? (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 12.5 }}>
                    {["agent-data", "chrome-profile", "cli-config", "reference", "sand-data", "plugins"].map((name) => (
                      <li
                        key={name}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 80px",
                          gap: 8,
                          padding: "6px 8px",
                          borderRadius: 6,
                          cursor: "pointer",
                        }}
                        className="pm-folder-row"
                        onDoubleClick={() => {
                          setManualSpec(`/home/box/${name}`);
                          setFolderPicker(false);
                          setFolderHint("");
                        }}
                      >
                        <span>📁 {name}</span>
                        <span style={{ color: "var(--muted)", textAlign: "right" }}>—</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {folderLoc === "other" ? (
                  <div style={{ padding: 8 }}>
                    <b style={{ fontSize: 12.5 }}>{t("On This Computer")}</b>
                    <div
                      style={{
                        marginTop: 8,
                        padding: "8px 10px",
                        border: "1px solid var(--line)",
                        borderRadius: 8,
                        fontSize: 12.5,
                        cursor: "pointer",
                      }}
                      onDoubleClick={() => {
                        setManualSpec("/");
                        setFolderPicker(false);
                      }}
                    >
                      <div>Computer</div>
                      <div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 2 }}>
                        107.4 GB / 134.2 GB available · /
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="bar" style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "10px 12px" }}>
              <button
                type="button"
                className="text"
                onClick={() => {
                  /* Magpie Cancel: field unchanged (shot 33) */
                  setFolderPicker(false);
                  setFolderHint("");
                }}
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                className="text primary"
                disabled={folderLoc === "recent"}
                onClick={() => {
                  const path =
                    folderLoc === "home"
                      ? "/home/box/plugins"
                      : folderLoc === "other"
                        ? "/"
                        : "";
                  if (!path) return;
                  setManualSpec(path);
                  setFolderPicker(false);
                  setFolderHint("");
                }}
              >
                {t("Open")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pluginDetail ? (
        <div className="modal open" role="dialog" aria-modal="true" aria-label={pluginDetail.name}>
          <div className="backdrop" onClick={() => setPluginDetail(null)} />
          <div className="dialog pm-detail" style={{ maxWidth: 520, width: "min(520px, 94vw)", maxHeight: "86vh", overflow: "auto" }}>
            <div className="bar" style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div className="pm-logo" aria-hidden>◆</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 15 }}>{pluginDetail.name}</b>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {"community" in pluginDetail && (pluginDetail as { community?: boolean }).community
                    ? `${t("magpie community")} · ${pluginDetail.pkg}`
                    : "owner" in pluginDetail && (pluginDetail as { owner?: string }).owner
                      ? `${(pluginDetail as { owner: string }).owner} · ${pluginDetail.pkg}`
                      : pluginDetail.pkg}
                </div>
              </div>
              <button
                type="button"
                className={`pm-act${busy === pluginDetail.pkg ? " busy" : installed.some((x) => x.pkg === pluginDetail.pkg) ? " done" : " get"}`}
                title={busy === pluginDetail.pkg ? t("Plugins run on Bun {v}, downloaded once", { v: "1.4.2" }) : undefined}
                disabled={busy === pluginDetail.pkg || installed.some((x) => x.pkg === pluginDetail.pkg)}
                onClick={() => install(pluginDetail.pkg, pluginDetail.name)}
              >
                {installAct(pluginDetail.pkg, installed.some((x) => x.pkg === pluginDetail.pkg))}
              </button>
            </div>
            <p className="pm-dsum" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5 }}>{pluginDetail.summary}</p>
            <div className="pm-facts" style={{ marginTop: 10 }}>
              <div className="pm-fact"><span className="k">{t("Version")}</span><span className="v">{"ver" in pluginDetail && (pluginDetail as { ver?: string }).ver ? (pluginDetail as { ver: string }).ver : "v0.1.0-demo"}</span></div>
              <div className="pm-fact"><span className="k">{"stars" in pluginDetail && (pluginDetail as { stars?: number }).stars != null ? t("Stars") : t("Downloads")}</span><span className="v">{"stars" in pluginDetail && (pluginDetail as { stars?: number }).stars != null ? (pluginDetail as { stars: number }).stars : pluginDetail.downloads}</span></div>
              <div className="pm-fact"><span className="k">{t("License")}</span><span className="v">MIT</span></div>
              <div className="pm-fact"><span className="k">{t("Updated")}</span><span className="v">{"updated" in pluginDetail && (pluginDetail as { updated?: string }).updated ? (pluginDetail as { updated: string }).updated : "—"}</span></div>
            </div>
            {"unofficial" in pluginDetail && (pluginDetail as { unofficial?: boolean }).unofficial && "owner" in pluginDetail ? (
              <p className="pm-note warn" style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "flex-start", padding: "8px 10px", borderRadius: 8, background: "color-mix(in srgb, var(--amber, #d97706) 12%, var(--pill))", fontSize: 12, lineHeight: 1.45 }}>
                <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden style={{ flex: "none", marginTop: 2 }}>
                  <path d="M8 2.3 13 4v3.8c0 3-2.1 5.1-5 5.9-2.9-.8-5-2.9-5-5.9V4z" fill="none" stroke="currentColor" strokeWidth="1.4" />
                </svg>
                <span>
                  {t(
                    "Unofficial: {owner} tagged it {topic} on GitHub, and nobody at magpie has reviewed it. It is installed from the repository as it stands, and runs with your sign-in or your requests.",
                    { owner: (pluginDetail as { owner: string }).owner, topic: "magpie-plugin" },
                  )}
                </span>
              </p>
            ) : null}
            <div className="pm-readme" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)", fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-2)" }}>
              {!detailReadmeReady ? (
                <>
                  <div className="pm-rskel" aria-hidden />
                  <div className="pm-rskel short" aria-hidden />
                  <div className="pm-rskel" aria-hidden />
                </>
              ) : "readme" in pluginDetail && (pluginDetail as { readme?: string }).readme ? (
                <div className="pm-md"><h3>{(pluginDetail as { readme: string }).readme.split("\n")[0]}</h3><p>{(pluginDetail as { readme: string }).readme}</p></div>
              ) : (
                <p>
                  {demoCopy(
                    "演示详情模态（对照 Magpie Discover 卡片）。Escape 不关闭；点 Close 或遮罩关闭。",
                    "Demo detail modal (Magpie Discover card). Escape does not close; Close or backdrop does.",
                  )}
                </p>
              )}
            </div>
            <div className="bar" style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="note" style={{ fontSize: 11.5, color: "var(--muted)", flex: 1 }}>
                {t("Plugins are other people's code: they sign in and make the requests, or see them as middleware.")}
              </span>
              <button type="button" className="text" onClick={() => setPluginDetail(null)}>
                {t("Close")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
