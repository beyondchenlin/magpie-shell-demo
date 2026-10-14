import { useEffect, useRef, useState, type ReactNode } from "react";
import { Segs } from "../components/Segs";
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
              <div className="pop proto-menu range-menu" role="dialog" aria-label={t("Pick days")} style={{ position: "absolute", top: "100%", right: 0, zIndex: 30, padding: 10, minWidth: 220 }}>
                <div className="rm-quick" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    ["Yesterday", "yesterday"],
                    ["This month", "month"],
                    ["Last month", "last"],
                    ["90 days", "90"],
                  ].map(([name, id]) => (
                    <button
                      key={id}
                      type="button"
                      className="rm-span text"
                      onClick={() => {
                        const label =
                          id === "yesterday"
                            ? demoCopy("昨天", "Yesterday")
                            : id === "month"
                              ? demoCopy("本月", "This month")
                              : id === "last"
                                ? demoCopy("上月", "Last month")
                                : t("90 days");
                        setCustomLabel(label);
                        setPeriod(id);
                        setCustomOpen(false);
                      }}
                    >
                      {t(name)}
                    </button>
                  ))}
                </div>
                <p className="usage-note" style={{ margin: "8px 0 0", fontSize: 11 }}>
                  {demoCopy("演示：日历点选未接线；快捷区间已可点。", "Demo: calendar not wired; quick spans work.")}
                </p>
              </div>
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
          <span className="ctx-range" style={{ fontSize: 12, color: "var(--muted)" }}>
            {demoCopy("上下文窗口 · 演示壳", "Context window · demo shell")}
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
            onChange={setLedStatus}
            items={LED_STATUS.map(([id, en]) => ({ id, label: t(en) }))}
          />
          <span className="grow" />
          <input
            className="sess-filter"
            id="ledQ"
            type="search"
            spellCheck={false}
            autoComplete="off"
            placeholder={t("Search models, providers, sessions")}
            value={ledQ}
            onChange={(e) => setLedQ(e.target.value)}
          />
          <button
            type="button"
            className="text"
            id="ledExport"
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
        <div className="led-dash" id="ledDash">
          <div className="led-strip" id="ledKpi" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
            {[
              ["Calls", "0"],
              ["Tokens", "0"],
              ["Cost", "≈$0"],
            ].map(([k, v]) => (
              <div key={k} className="kpi" style={{ padding: "8px 12px", borderRadius: 10, background: "var(--card)", border: "1px solid var(--line)", minWidth: 88 }}>
                <div style={{ fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>{v}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{t(k)}</div>
              </div>
            ))}
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
            <div className="led-body empty-state" style={{ padding: "28px 16px", borderRadius: 12, border: "1px dashed var(--line)" }}>
              {demoCopy("尚无请求趋势（空态）。切换上方筛选项可看到分段动效。", "No request trend yet (empty). Switch filters above to see segment motion.")}
            </div>
          </section>
        </div>
        <div className="led-head" style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
          <p className="led-sum" id="ledSum" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
            {ledQ.trim()
              ? demoCopy(`无匹配「${ledQ.trim()}」的请求`, `No requests match “${ledQ.trim()}”`)
              : noCallsIn(periodValue)}
          </p>
        </div>
        <div className="led-wrap" id="ledWrap" />
        <p className="usage-note" id="ledNote" />
      </div>

      {/* Sessions */}
      <div className="usage-pane sess-pane" id="sessionsPane" hidden={tab !== "sessions"}>
        <div className="sess-tools" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <Segs
            value={sessAgent}
            onChange={setSessAgent}
            items={[
              { id: "all", label: t("All agents") },
              { id: "codex", label: "Codex" },
              { id: "claude", label: "Claude Code" },
            ]}
          />
        </div>
        <section className="stats six" id="sessStats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[
            ["Sessions", "0"],
            ["Tokens", "0"],
            ["Cost", "≈$0"],
            ["Messages", "0"],
            ["Active", "0"],
            ["Median", "—"],
          ].map(([k, v]) => (
            <div key={k} className="kpi" style={{ padding: "10px 12px", borderRadius: 10, background: "var(--card)", border: "1px solid var(--line)" }}>
              <span style={{ fontWeight: 650, fontVariantNumeric: "tabular-nums", display: "block" }}>{v}</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{t(k)}</span>
            </div>
          ))}
        </section>
        <div className="row-head" id="sessListHead" style={{ marginTop: 12 }}>
          <span className="label">{t("Latest sessions")}</span>
          <span className="grow" />
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
          <div className="empty-state" style={{ padding: "22px 16px" }}>
            {demoCopy(
              `此区间（${sessRange}）尚无会话文件。${sessAgent !== "all" ? `筛选：${sessAgent}。` : ""}`,
              `No session files in this range (${sessRange}).${sessAgent !== "all" ? ` Filter: ${sessAgent}.` : ""}`,
            )}
          </div>
        </div>
        <p className="usage-note" id="sessNote" />
      </div>

      {/* Context */}
      <div className="usage-pane ctx-pane" id="contextPane" hidden={tab !== "context"}>
        <div className="empty-state" style={{ padding: "28px 16px" }}>
          {demoCopy(
            "Context 页：对照官方 plugins/sessions 上下文表；演示空态壳，分段与刷新已接线。",
            "Context tab: aligns with Magpie context pane; empty demo shell — tabs and refresh wired.",
          )}
        </div>
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
  const [installed, setInstalled] = useState<{ pkg: string; name: string; off?: boolean; optsOpen?: boolean; opts?: string }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [asking, setAsking] = useState<{ pkg: string; op: "remove" | "off" } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("magpie.pluginTab", tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  const install = (pkg: string, name: string) => {
    setBusy(pkg);
    window.setTimeout(() => {
      setInstalled((list) => (list.some((x) => x.pkg === pkg) ? list : [...list, { pkg, name, opts: "" }]));
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
                        <div className="pm-card" key={c.pkg} tabIndex={0}>
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
                      <div className="name">{e.name}</div>
                      <div className="sub">
                        {e.pkg}
                        {e.off ? ` · ${t("Off")}` : ""}
                      </div>
                      {e.optsOpen ? (
                        <textarea
                          className="words"
                          rows={3}
                          style={{ width: "100%", marginTop: 8, fontFamily: "inherit" }}
                          placeholder={demoCopy("中间件选项 JSON（演示）", "Middleware options JSON (demo)")}
                          value={e.opts || ""}
                          onChange={(ev) =>
                            setInstalled((list) =>
                              list.map((x) => (x.pkg === e.pkg ? { ...x, opts: ev.target.value } : x)),
                            )
                          }
                        />
                      ) : null}
                      {asking?.pkg === e.pkg ? (
                        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12 }}>
                            {asking.op === "remove" ? t("Remove this plugin?") : t("Switch this plugin off?")}
                          </span>
                          <button
                            type="button"
                            className="text"
                            onClick={() => {
                              if (asking.op === "remove") setInstalled((list) => list.filter((x) => x.pkg !== e.pkg));
                              else setInstalled((list) => list.map((x) => (x.pkg === e.pkg ? { ...x, off: true } : x)));
                              setAsking(null);
                            }}
                          >
                            {t("Yes")}
                          </button>
                          <button type="button" className="text" onClick={() => setAsking(null)}>
                            {t("Cancel")}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <div className="val" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                        onClick={() =>
                          setInstalled((list) =>
                            list.map((x) => (x.pkg === e.pkg ? { ...x, off: !x.off } : x)),
                          )
                        }
                      >
                        {e.off ? t("Enable") : t("Disable")}
                      </button>
                      <button type="button" className="text" onClick={() => setAsking({ pkg: e.pkg, op: "remove" })}>
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
