import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LedHeat } from "../components/LedHeat";
import { Segs } from "../components/Segs";
import { iconSrc } from "../data/mock";
import {
  DEMO_CTX_AGENTS,
  DEMO_LEDGER,
  DEMO_SESSIONS,
  DEMO_SESSIONS_MORE,
  DEMO_SESS_KPIS,
  ago,
  demoSessDetail,
  fmtCost,
  fmtN,
  ledTime,
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
  ["ok", "OK"],
  ["err", "Errors"],
  ["rej", "Rejected"],
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
      if (e.key === "Escape") onClose();
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
    <div className="pop proto-menu sess-menu" ref={ref} role="menu" aria-label={title} style={{ position: "absolute", zIndex: 40, minWidth: 160 }}>
      {items.map((it) => (
        <button
          type="button"
          key={it.v}
          className={it.v === value ? "on" : ""}
          role="menuitem"
          onClick={() => {
            onPick(it.v);
            onClose();
          }}
        >
          <span className="pm-name">{t(it.name)}</span>
          {it.note ? <span className="pm-note">{t(it.note)}</span> : null}
        </button>
      ))}
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
  }, [onClose]);

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
  const [sessRange, setSessRange] = useState("30d");
  const [every, setEvery] = useState(5);
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
  const [hidOpen, setHidOpen] = useState(false);
  /** Magpie ledDash stays hidden with no ledger; demo can show a chart shell. */
  const [demoChart, setDemoChart] = useState(false);
  const [ctxDays, setCtxDays] = useState("7");
  /** Magpie empty vs filled demo (ledger / sessions / context). Default filled for 1:1 data shells. */
  const [demoFilled, setDemoFilled] = useState(true);
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
    if (!every) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      refresh();
    }, every * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [every, tab]);

  const periodValue = customLabel ? customLabel : period;

  const ledRows = useMemo(() => {
    if (!demoFilled) return [] as LedRow[];
    let rows = DEMO_LEDGER;
    if (ledStatus === "ok") rows = rows.filter((r) => r.status === "ok");
    else if (ledStatus === "err") rows = rows.filter((r) => r.status === "err");
    else if (ledStatus === "rej") rows = rows.filter((r) => r.status === "rej");
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
          <div className="segs period-wrap" style={{ position: "relative" }}>
            <Segs
              value={customLabel ? "__custom__" : period}
              onChange={(v) => {
                if (v === "__custom__") return;
                setCustomLabel("");
                setPeriod(v);
              }}
              items={[
                ...PERIODS.map(([id, en]) => ({ id, label: t(en) })),
                {
                  id: "__custom__",
                  label: customLabel || t("Custom"),
                },
              ]}
            />
            <button
              type="button"
              className={`opt range-opt${customLabel ? " on" : ""}`}
              aria-haspopup="dialog"
              aria-expanded={customOpen}
              aria-label={customLabel ? t("Days picked: {days}", { days: customLabel }) : t("Pick days")}
              style={{ position: "absolute", right: 0, top: 0, opacity: 0, width: 72, height: "100%", cursor: "pointer" }}
              onClick={() => setCustomOpen((o) => !o)}
            />
            {customOpen ? (
              <RangeCalendar
                current={
                  period.includes("..")
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
                { id: "90", label: t("90 days") },
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
            title={t("Refresh now")}
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
          <b>≈$0.000</b>
          <span>{t("effective prices")}</span>
        </span>
      </div>

      {/* Overview */}
      <div className="usage-pane" id="usagePane" hidden={tab !== "usage"}>
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
        <section className="stats" id="stats" />
        <section className="chart" id="chart" />
        <div className="row-head">
          <span className="label">{t("Agents")}</span>
        </div>
        <div className="list" id="usageAgents">
          <div className="empty-state" style={{ padding: "22px 16px" }}>
            {noCallsIn(periodValue)}{" "}
            {t("Point an agent at a catalog model and use it; every call through the gateway is counted here.")}
          </div>
        </div>
        <div className="us-hid" id="usageAgentsHid" hidden={!hidOpen && true}>
          <button
            type="button"
            className="text us-hidline"
            aria-expanded={hidOpen}
            onClick={() => setHidOpen((o) => !o)}
            hidden
          />
        </div>
        <div className="row-head">
          <span className="label">{t("Models")}</span>
        </div>
        <div className="list" id="usageModels">
          <div className="empty-state" style={{ padding: "14px 16px", opacity: 0.85 }}>
            {demoCopy("尚无模型用量行（空态）。", "No model usage rows (empty).")}
          </div>
        </div>
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
            items={LED_STATUS.map(([id, en]) => ({ id, label: t(en) }))}
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
          />
          <button
            type="button"
            className="text"
            id="ledExport"
            disabled={!ledRows.length}
            title={t("Save every request listed, all pages, as a CSV file in Downloads")}
            onClick={() => {
              /* demo: no export */
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
                        className={`led-jump bad${ledStatus === "err" ? " on" : ""}`}
                        onClick={() => setLedStatus(ledStatus === "err" ? "" : "err")}
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
                  : t(periodValue === "today" || period === "today" ? "No requests today" : "No requests here")}
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  {t("Every request an agent sends to magpie, and every call the agents' own session files record, is counted here.")}
                </div>
              </div>
            </div>
          </>
        )}
        <p className="usage-note" id="ledNote" />
      </div>

      {/* Sessions — Magpie #sessionsPane with 6 KPIs + list (demo filled) */}
      <div className="usage-pane sess-pane" id="sessionsPane" hidden={tab !== "sessions"}>
        <div className="sess-tools">
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
                {sessRange !== "all" && sessAgent === "all" && !sessQ.trim() && !demoFilled ? (
                  <div style={{ marginTop: 8 }}>
                    <button type="button" className="text sess-show-history" onClick={() => setSessRange("all")}>
                      {t("All sessions")}
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
            <div className="sess-tools" style={{ justifyContent: "flex-end", marginTop: 4 }}>
              <input
                className="sess-filter"
                type="search"
                spellCheck={false}
                autoComplete="off"
                placeholder={t("Search sessions")}
                value={sessQ}
                onChange={(e) => setSessQ(e.target.value)}
                aria-label={t("Search sessions")}
              />
            </div>
            <div className="list sess-list" id="sessList" hidden />
          </>
        )}
        <p className="usage-note" id="sessNote" />
      </div>

      {/* Context — Magpie context.js agent cards (demo filled) */}
      <div className="usage-pane ctx-pane" id="contextPane" hidden={tab !== "context"}>
        <div className="row-head ctx-sess-head">
          <span className="label">{t("Through magpie")}</span>
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
          <div className="ctx-none">
            <b>{t("No prompts read yet")}</b>
            <span>{t("Requests your agents send through magpie show here.")}</span>
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

type Builtin = { id: string; name: string; sub: string; on: boolean; feature?: string };

const BUILTINS_DEFAULT: Builtin[] = [
  { id: "sessions", name: "Sessions", sub: "Agents' session files on Usage › Sessions and the Sessions page", on: true, feature: "sessions" },
  { id: "library", name: "Library", sub: "Skills, MCP servers and Magpie Image for agents", on: true, feature: "library" },
  { id: "gateway-keys", name: "Gateway keys", sub: "Keys for other computers / tunnels on the Gateway page", on: true },
  { id: "otel", name: "Observability", sub: "OpenTelemetry export in Settings", on: false, feature: "otel" },
];

const DEMO_MARKET = [
  {
    kind: "pv" as const,
    section: "Subscriptions",
    note: "written for magpie, checked against its own sign-ins",
    cards: [
      { pkg: "@magpie/demo-kimi", name: "Kimi Code (demo)", summary: "Demo market card — Install is local-only", downloads: "12k" },
      { pkg: "@magpie/demo-glm", name: "GLM Coding (demo)", summary: "Demo market card — no real npm install", downloads: "8.4k" },
    ],
  },
  {
    kind: "mw" as const,
    section: "Gateway middleware",
    note: "runs in magpie's gateway on what every agent sends and gets back",
    cards: [
      { pkg: "@magpie/demo-log", name: "Request logger (demo)", summary: "Logs each gateway call — demo fold for options", downloads: "3.1k" },
    ],
  },
  {
    kind: "ag" as const,
    section: "Agents",
    note: "agents magpie has no setup of its own for",
    cards: [
      { pkg: "@magpie/demo-agent", name: "Demo agent bridge", summary: "Connect a third-party agent as Magpie does its own", downloads: "1.2k" },
    ],
  },
];

export function PluginsView() {
  const [tab, setTab] = useState<string>(() => {
    try {
      return localStorage.getItem("magpie.pluginTab") || "discover";
    } catch {
      return "discover";
    }
  });
  const [query, setQuery] = useState("");
  const [mirror, setMirror] = useState(false);
  const [builtins, setBuiltins] = useState(BUILTINS_DEFAULT);
  const [installed, setInstalled] = useState<
    {
      pkg: string;
      name: string;
      off?: boolean;
      optsOpen?: boolean;
      opts?: string;
      optsErr?: string;
      optsSaved?: boolean;
      /** Magpie movable: built-in subscription names this plugin can/does serve */
      movable?: string[];
      moved?: string[];
    }[]
  >([
    // Demo seed: installed subscription with movable long-confirm (Magpie plugins.js)
    {
      pkg: "@magpie/demo-kimi",
      name: "Kimi Code (demo)",
      opts: "",
      optsOpen: false,
      movable: ["Kimi Code"],
      moved: ["Kimi Code"],
    },
  ]);
  const [busy, setBusy] = useState<string | null>(null);
  const [asking, setAsking] = useState<{ pkg: string; op: "remove" | "off" | "move" } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("magpie.pluginTab", tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  const install = (pkg: string, name: string) => {
    setBusy(pkg);
    // Magpie install: busy on card → Installed tab; demo ~420ms then local list
    window.setTimeout(() => {
      setInstalled((list) => (list.some((x) => x.pkg === pkg) ? list : [...list, { pkg, name, opts: "", optsOpen: false }]));
      setBusy(null);
      setTab("installed");
    }, 420);
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
            role="switch"
            aria-checked={mirror}
            title={t("Download the plugin list, plugins and Bun from mirrors in China first (npmmirror, jsDelivr), their official addresses after. Each is a copy of the very file, checked as the original is")}
            onClick={() => setMirror((m) => !m)}
          >
            <span>{t("Mirrors in China")}</span>
            <span className={`lib-switch${mirror ? " on" : ""}`}>
              <i />
            </span>
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
            />
          </label>
        ) : null}
      </div>

      <div className="lib-body pm-body">
        {tab === "builtin" ? (
          <>
            <p className="feat-say" style={{ margin: "8px 2px 10px", fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.5 }}>
              {t("Parts of magpie not everyone needs. Switched off, a part leaves the sidebar, its pages and Settings; magpie works the same either way.")}
            </p>
            <div className="list prefs" id="builtinList">
              {builtins.map((b) => (
                <div className="row pref" key={b.id} data-feature={b.feature}>
                  <div className="who">
                    <div className="name">{t(b.name)}</div>
                    <div className="sub">{t(b.sub)}</div>
                  </div>
                  <div className="val">
                    <Segs
                      value={b.on ? "on" : "off"}
                      onChange={(v) =>
                        setBuiltins((list) => list.map((x) => (x.id === b.id ? { ...x, on: v === "on" } : x)))
                      }
                      items={[
                        { id: "off", label: t("Off") },
                        { id: "on", label: t("On") },
                      ]}
                    />
                  </div>
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
                  <h2>{t("Plugins for magpie")}</h2>
                  <p>
                    {demoCopy(
                      "订阅与网关中间件市场（演示）。安装只记在本页，不访问 npm。",
                      "Subscriptions and gateway middleware market (demo). Install stays on this page — no npm.",
                    )}
                  </p>
                  <div className="pm-trust">
                    <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden>
                      <path d="M8 2.3 13 4v3.8c0 3-2.1 5.1-5 5.9-2.9-.8-5-2.9-5-5.9V4z" fill="none" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M5.8 8l1.6 1.6 2.9-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span>{t("Checked against magpie's own sign-ins")}</span>
                  </div>
                </div>
              </div>
            ) : null}
            {DEMO_MARKET.map((sec) => {
              const cards = sec.cards.filter(
                (c) =>
                  !query.trim() ||
                  `${c.name} ${c.pkg} ${c.summary}`.toLowerCase().includes(query.trim().toLowerCase()),
              );
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
                        <div className={`pm-card${busy === c.pkg ? " installing" : ""}${has ? " has" : ""}`} key={c.pkg} tabIndex={0}>
                          <div className="pm-logo" aria-hidden>
                            ◆
                          </div>
                          <div className="pm-words" style={{ flex: 1, minWidth: 0 }}>
                            <b style={{ fontSize: 13 }}>{c.name}</b>
                            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>{c.summary}</p>
                            <div style={{ marginTop: 6, fontSize: 11, color: "var(--faint)" }}>
                              {c.pkg} · {c.downloads}
                              {mirror ? ` · ${t("via China mirrors")}` : ""}
                            </div>
                          </div>
                          <button
                            type="button"
                            className={`pm-act${has ? " get" : ""}`}
                            disabled={busy === c.pkg || has}
                            onClick={() => install(c.pkg, c.name)}
                          >
                            {busy === c.pkg ? t("Installing…") : has ? t("Installed") : t("Install")}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {query.trim() &&
            !DEMO_MARKET.some((s) =>
              s.cards.some((c) => `${c.name} ${c.pkg}`.toLowerCase().includes(query.trim().toLowerCase())),
            ) ? (
              <div className="pm-ghnone">
                <b>{demoCopy(`npm 演示无结果：「${query.trim()}」`, `No demo npm hits for “${query.trim()}”`)}</b>
                <p>{demoCopy("真站会查 npm；此处仅过滤演示卡片。", "Real Magpie queries npm; here only demo cards are filtered.")}</p>
              </div>
            ) : null}
            <div className="pm-sec" style={{ marginTop: 8 }}>
              <div className="pm-sechead">
                <h3>{t("Add from a path or git")}</h3>
                <span>{demoCopy("演示：粘贴路径不安装", "Demo: paste path — no install")}</span>
              </div>
              <div className="row pref">
                <div className="who">
                  <div className="name">{t("Folder or git URL")}</div>
                  <div className="sub">{t("file:…, github:owner/repo, or a path")}</div>
                </div>
                <div className="val" style={{ display: "flex", gap: 6 }}>
                  <input className="words" placeholder="github:owner/repo" style={{ minWidth: 160 }} />
                  <button type="button" className="text" disabled>
                    {t("Add")}
                  </button>
                </div>
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
              <div className="list pm-list">
                {installed.map((e) => (
                  <div className="row pref" key={e.pkg}>
                    <div className="who">
                      <div className="name" style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span>{e.name}</span>
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
                          : `${e.pkg}${e.off ? ` · ${t("Off")}` : ""}`}
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
                            setAsking({ pkg: e.pkg, op: "off" });
                          }
                        }}
                      >
                        {e.off ? t("Enable") : t("Disable")}
                      </button>
                      <button
                        type="button"
                        className="text quiet"
                        title={
                          e.moved?.length
                            ? t("{names} goes back to the built-in first, then the plugin is removed", {
                                names: e.moved.join(t(", ")),
                              })
                            : undefined
                        }
                        onClick={() => setAsking({ pkg: e.pkg, op: "remove" })}
                      >
                        {t("Remove")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pm-foot" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("Plugins run on Bun {v}", { v: "1.2 (demo)" })}</span>
                <span className="grow" />
                <button type="button" className="text pm-check">
                  {t("Check for updates")}
                </button>
              </div>
            </>
          )
        ) : null}
      </div>
    </main>
  );
}
