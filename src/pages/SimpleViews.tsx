import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActionConfirm } from "../components/ActionConfirm";
import { LedChart, LedRank } from "../components/LedChart";
import { LedHeat } from "../components/LedHeat";
import { LibSwitch } from "../components/LibSwitch";
import { PrefRow } from "../components/PrefRow";
import { Segs } from "../components/Segs";
import { useSegThumb } from "../components/SegThumb";
import { TextBtn } from "../components/TextBtn";
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

/** Magpie app.js L2676 EYE_OFF — Usage Agents openRowMenu hide act. */
const EYE_OFF =
  "M6.6 3.7A6.9 6.9 0 0 1 8 3.5c3.75 0 6.25 4.5 6.25 4.5a11 11 0 0 1-1.5 2M4.4 4.4C2.7 5.55 1.75 8 1.75 8S4.25 12.5 8 12.5c1.2 0 2.25-.45 3.1-1.05M6.75 6.75a1.75 1.75 0 0 0 2.5 2.5M2 2l12 12";

/** Magpie LED_COLS (app.js L18561–64): third flag = lc-opt collapsed by ledFit. */
const LED_COLS: [string, string?, boolean?][] = [
  ["Time"],
  ["Agent"],
  ["Requested"],
  ["Provider · account"],
  ["Sent", "", true],
  ["Served"],
  ["Effort", "", true],
  ["In", "n"],
  ["Out", "n"],
  ["Cache write", "n", true],
  ["Cache read", "n", true],
  ["Cost", "n"],
  ["Duration", "n"],
  ["Speed", "n"],
  ["Status"],
];

/** Magpie openRowMenu (app.js L3497–3518 / L17375–17379): .pop.row-menu + .rm-item. */
function UsageAgentMenu({
  anchor,
  onHide,
  onClose,
}: {
  anchor: HTMLElement;
  onHide: () => void;
  onClose: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const r = anchor.getBoundingClientRect();
    const pad = 8;
    const w = box.offsetWidth || 176;
    const h = box.offsetHeight || 40;
    let y = r.bottom + 5;
    if (y + h > window.innerHeight - pad && r.top - 5 - h >= pad) {
      y = r.top - 5 - h;
      box.classList.add("up");
    }
    // Magpie placeMenu(box, anchor, "left", -4) — app.js L13784–13797 / L3518
    const left = Math.max(pad, Math.min(r.left - 4, window.innerWidth - w - pad));
    box.style.left = `${left}px`;
    box.style.top = `${Math.max(pad, y)}px`;
    anchor.classList.add("open");
    const outside = (e: MouseEvent) => {
      if (!box.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose();
    };
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        anchor.focus({ preventScroll: true });
      } else if (e.key === "Tab") onClose();
    };
    document.addEventListener("mousedown", outside, true);
    document.addEventListener("keydown", keys, true);
    const first = box.querySelector<HTMLButtonElement>("button.rm-item:not(:disabled)");
    first?.focus({ preventScroll: true });
    return () => {
      anchor.classList.remove("open");
      document.removeEventListener("mousedown", outside, true);
      document.removeEventListener("keydown", keys, true);
    };
  }, [anchor, onClose]);

  return (
    <div className="pop row-menu fixed" role="menu" ref={boxRef}>
      <button
        type="button"
        className="rm-item"
        role="menuitem"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
          onHide();
        }}>
        <svg viewBox="0 0 16 16" width={13} height={13} aria-hidden>
          <path
            d={EYE_OFF}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="rm-name">{t("Hide from this list")}</span>
      </button>
    </div>
  );
}

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

/** Magpie SESS_RANGES days (app.js L19020): today=1 … all=0. */
const SESS_RANGE_DAYS: Record<(typeof SESS_RANGES)[number][0], number> = {
  today: 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: 0,
};

/** Magpie sessDate(st.from) floor for list filter (app.js L19564 / L19401). */
function sessRangeStartMs(range: string): number | null {
  const days = SESS_RANGE_DAYS[range as keyof typeof SESS_RANGE_DAYS] ?? 0;
  if (!days) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (days > 1) start.setDate(start.getDate() - (days - 1));
  return start.getTime();
}

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
  // Magpie LED_TREND app.js L17866–68 — window chart includes Speed (#860)
  ["speed", "Speed"],
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
      style={busy ? { animation: "spin .8s linear infinite" } : undefined}>
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
      onClick={onToggle}>
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
            }}>
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
        }}>
        {dayNum}
      </button>,
    );
  }

  const nextMonthStart = dayKeyOf(new Date(shown.getFullYear(), shown.getMonth() + 1, 1, 12));

  return (
    <div className="pop proto-menu range-menu" ref={ref} role="dialog" aria-label={t("Pick days")}>
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
            }}>
            {t(name)}
          </button>
        ))}
      </div>
      <div className="rm-nav">
        <button
          type="button"
          className="rm-step"
          aria-label={t("Previous month")}
          onClick={() => setShown(new Date(shown.getFullYear(), shown.getMonth() - 1, 1, 12))}>
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
          onClick={() => setShown(new Date(shown.getFullYear(), shown.getMonth() + 1, 1, 12))}>
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
  const [period, setPeriod] = useState(() => {
    try {
      const p = localStorage.getItem("magpie.usagePeriod");
      if (p === "today" || p === "7d" || p === "30d" || p === "all") return p;
    } catch {
      /* ignore */
    }
    return "today";
  });
  const [reqArchive, setReqArchive] = useState(false);
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
  /** Magpie ledSplit default "model" (app.js L17490). */
  const [ledSplit, setLedSplit] = useState("model");
  /** Magpie ledDay — chart column pick filters the Requests list (app.js L18318–21). */
  const [ledDay, setLedDay] = useState("");
  /** Magpie drawLedRank picked — provider/agent/model filter from rank click (app.js L18327–39). */
  const [ledRankPick, setLedRankPick] = useState("");
  /** Magpie box.emphasize from rank hover (app.js L18174–75). */
  const [ledEmph, setLedEmph] = useState<string | null>(null);
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
  /** Magpie #ledWrap / #ledHScroll — sticky table h-scrollbar (app.js ledHScroll). */
  const ledWrapRef = useRef<HTMLDivElement>(null);
  const ledHScrollRef = useRef<HTMLDivElement>(null);


  // Magpie ledFit (app.js L18629–48) + ledHScroll (L18513–37 / L18521–22).
  // tight → hide .lc-opt columns; still over → .tighter (price-reference + shorter names).
  // #ledTight hint after #ledSum. Sticky #ledHScroll stands in for height:0 native bar.
  useEffect(() => {
    const wrap = ledWrapRef.current;
    const bar = ledHScrollRef.current;
    if (!wrap || !bar || tab !== "usage") return;

    const ledFit = () => {
      const table = wrap.querySelector("table.led");
      const hint = document.getElementById("ledTight") as HTMLElement | null;
      if (!table) {
        if (hint) hint.hidden = true;
        return;
      }
      table.classList.remove("tight", "tighter");
      const over = () => wrap.scrollWidth > wrap.clientWidth + 1;
      const tight = over();
      table.classList.toggle("tight", tight);
      // still too wide (#860): price reference goes; names cut shorter
      if (tight && over()) table.classList.add("tighter");
      if (hint) {
        const msg = t("Sent, Effort and the cache are in each row's details");
        hint.textContent = msg;
        hint.title = msg;
        hint.hidden = !tight;
      }
    };

    const sync = () => {
      ledFit();
      const over = !!wrap.querySelector("table") && wrap.scrollWidth > wrap.clientWidth + 1;
      bar.hidden = !over;
      wrap.style.setProperty("--ledw", `${wrap.clientWidth}px`);
      if (!over) return;
      const inner = bar.firstElementChild as HTMLElement | null;
      if (inner) {
        inner.style.width = `${wrap.scrollWidth - wrap.clientWidth + bar.clientWidth}px`;
      }
      if (bar.scrollLeft !== wrap.scrollLeft) bar.scrollLeft = wrap.scrollLeft;
    };

    const onWrapScroll = () => {
      if (bar.scrollLeft !== wrap.scrollLeft) bar.scrollLeft = wrap.scrollLeft;
    };
    const onBarScroll = () => {
      if (wrap.scrollLeft !== bar.scrollLeft) wrap.scrollLeft = bar.scrollLeft;
    };
    wrap.addEventListener("scroll", onWrapScroll, { passive: true });
    bar.addEventListener("scroll", onBarScroll, { passive: true });

    let fitW = 0;
    let frame = 0;
    const ro = new ResizeObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (wrap.clientWidth !== fitW) {
          fitW = wrap.clientWidth;
          ledFit();
        }
        // Magpie ledGrow: table grew past wrap without width change → fit again
        const table = wrap.querySelector("table.led");
        if (
          table &&
          !table.classList.contains("tighter") &&
          wrap.clientWidth &&
          wrap.scrollWidth > wrap.clientWidth + 1
        ) {
          ledFit();
        }
        sync();
      });
    });
    ro.observe(wrap);
    const table = wrap.querySelector("table.led");
    if (table) ro.observe(table);
    sync();

    return () => {
      wrap.removeEventListener("scroll", onWrapScroll);
      bar.removeEventListener("scroll", onBarScroll);
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [tab, demoFilled, ledPage, ledDay, ledRankPick, ledQ, ledStatus, period]);

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

  // Magpie L14414: changing period clears the chart day pick
  useEffect(() => {
    setLedDay("");
    setLedPage(0);
  }, [period]);

  // Magpie: changing split redraws rank; clear pick + emphasize
  useEffect(() => {
    setLedRankPick("");
    setLedEmph(null);
  }, [ledSplit]);

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
    // Magpie /api/usage?day=… — demo filters ledger by local calendar day
    if (ledDay) {
      rows = rows.filter((r) => {
        const d = new Date(r.t);
        const iso =
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return iso === ledDay;
      });
    }
    // Magpie drawLedRank choose — filter Requests by split category (app.js L18327–39)
    if (ledRankPick) {
      if (ledSplit === "agent") rows = rows.filter((r) => r.agent === ledRankPick);
      else if (ledSplit === "model") rows = rows.filter((r) => (r.served || r.req) === ledRankPick);
      else if (ledSplit === "provider") rows = rows.filter((r) => r.providerName === ledRankPick);
    }
    const q = ledQ.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        `${r.req} ${r.providerName} ${r.agentName} ${r.host || ""}`.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [demoFilled, ledStatus, ledQ, ledDay, ledRankPick, ledSplit]);

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

  /** Magpie renderSessions list filters (app.js L19560–70) + empty-range history (L19607–18). */
  const sessMatchNonRange = (s: (typeof DEMO_SESSIONS)[number]) => {
    if (sessAgent !== "all" && s.agent !== sessAgent) return false;
    const q = sessQ.trim().toLowerCase();
    if (q && !`${s.title} ${s.cwd} ${s.models} ${s.agent}`.toLowerCase().includes(q)) return false;
    return true;
  };
  const sessInRange = (s: (typeof DEMO_SESSIONS)[number]) => {
    const from = sessRangeStartMs(sessRange);
    return from == null || s.last >= from;
  };
  const sessRows = useMemo(() => {
    if (!demoFilled) return [];
    const pool = sessMore ? [...DEMO_SESSIONS, ...DEMO_SESSIONS_MORE] : [...DEMO_SESSIONS];
    return pool.filter((s) => sessMatchNonRange(s) && sessInRange(s));
  }, [demoFilled, sessAgent, sessQ, sessMore, sessRange]);
  const sessHidden = useMemo(() => {
    if (!demoFilled || sessMore) return 0;
    return DEMO_SESSIONS_MORE.filter((s) => sessMatchNonRange(s) && sessInRange(s)).length;
  }, [demoFilled, sessMore, sessAgent, sessQ, sessRange]);
  /** Magpie: from && all.some(byAgent/folder/model/q) → empty-range sess-show-history (app.js L19607–18). */
  const sessHasHistory = useMemo(() => {
    if (!demoFilled || sessRange === "all") return false;
    return [...DEMO_SESSIONS, ...DEMO_SESSIONS_MORE].some((s) => sessMatchNonRange(s));
  }, [demoFilled, sessRange, sessAgent, sessQ]);

  const ctxAgents = demoFilled ? DEMO_CTX_AGENTS : [];
  const overview = useMemo(
    () => (demoFilled ? buildDemoOverview(period) : null),
    [demoFilled, period],
  );
  const [agentMenuFor, setAgentMenuFor] = useState<{ id: string; el: HTMLElement } | null>(null);
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
          <div className="segs period-wrap" id="period" ref={setPeriodBox}>
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
                }}>
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
              onClick={() => setCustomOpen((o) => !o)}>
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
        <span className="usage-refresh" id="usageRefresh">
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
            onClick={refresh}>
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
          <TextBtn
            className="rt-mask"
            id="usageMask"
            aria-pressed={mask}
            title={t("Mask the accounts on this page — email addresses and account names — for a screenshot to share")}
            onClick={() => setMask((m) => !m)}>
            <span>{t("Hide accounts")}</span>
          </TextBtn>
        </div>
        <section className="subscription-usage" id="subscriptionUsage" />
        <p className="usage-note" id="usageScope">
          {t("Gateway calls only; session-log calls are in Requests. Local rejections are excluded from totals.")}
        </p>
        {!demoFilled || !overview ? (
          /* Magpie Usage empty: #stats.stats.empty > .none (app.js renderUsage L17250–55;
             app.css L1020–21). Drop invent card.empty-state.us-empty + shell-patch pad. */
          <section className="stats empty" id="stats">
            <div className="none">
              {`${noCallsIn(period)} ${t("Point an agent at a catalog model and use it; every call through the gateway is counted here.")}`}
            </div>
            <TextBtn variant="primary" onClick={() => setDemoFilled(true)}>
              {demoCopy("显示演示有数据", "Show demo with data")}
            </TextBtn>
          </section>
        ) : (
          <>
            <section className="stats" id="stats">
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
            <section className="chart" id="chart">
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
                      <i className="out" style={{ height: `${((100 * p.output) / peak).toFixed(1)}%` }} />
                      <i className="in" style={{ height: `${((100 * p.input) / peak).toFixed(1)}%` }} />
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
                    <div className="row stat acts" key={g.id} data-id={g.id}>
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
                        <i style={{ width: `${Math.max(1.5, (100 * tokensOf(g)) / total).toFixed(1)}%` }} />
                      </div>
                      <button
                        type="button"
                        className={`icon us-more${agentMenuFor?.id === g.id ? " open" : ""}`}
                        aria-haspopup="menu"
                        aria-label={t("Actions for {name}", { name: g.name })}
                        onClick={(e) => {
                          e.stopPropagation();
                          const el = e.currentTarget;
                          setAgentMenuFor((cur) => (cur?.id === g.id ? null : { id: g.id, el }));
                        }}>
                        <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden>
                          <circle cx="3.5" cy="8" r="1.2" fill="currentColor" />
                          <circle cx="8" cy="8" r="1.2" fill="currentColor" />
                          <circle cx="12.5" cy="8" r="1.2" fill="currentColor" />
                        </svg>
                      </button>
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
              <div className="us-hid" id="usageAgentsHid">
                <TextBtn
                  className="us-hidline"
                  aria-expanded={usageHidOpen}
                  title={t("Hidden from this list only: their calls still count in the totals and the chart. Click to see them.")}
                  onClick={() => setUsageHidOpen((o) => !o)}
                >
                  <span>{t("{n} hidden", { n: String([...hiddenUsageAgents].filter((id) => overview.agents.some((g) => g.id === id)).length) })}</span>
                  <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden >
                    <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </TextBtn>
                <div className="list" hidden={!usageHidOpen}>
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
                            <TextBtn
                              className="us-unhide"
                              onClick={() =>
                                setHiddenUsageAgents((s) => {
                                  const n = new Set(s);
                                  n.delete(g.id);
                                  return n;
                                })
                              }>
                              {t("Unhide")}
                            </TextBtn>
                          </div>
                        ))
                    : null}
                </div>
              </div>
            ) : null}
            {agentMenuFor ? (
              <UsageAgentMenu
                anchor={agentMenuFor.el}
                onClose={() => setAgentMenuFor(null)}
                onHide={() => {
                  setHiddenUsageAgents((s) => new Set(s).add(agentMenuFor.id));
                }}
              />
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
            <div>
              <TextBtn
                aria-pressed={demoFilled}
                onClick={() => setDemoFilled(false)}
                title={demoCopy("关演示数据看真空态", "Turn off demo data for Magpie empty")}>
                {demoCopy("演示数据开 · 点此关", "Demo data on · click to clear")}
              </TextBtn>
            </div>
          </>
        )}
        <p className="usage-note" id="usageNote" />
      </div>

      {/* Requests / Ledger */}
      <div className="usage-pane" id="ledgerPane" hidden={tab !== "requests"}>
        <div className="sess-tools">
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
          <TextBtn
            aria-pressed={demoFilled}
            title={demoCopy("切换演示 ledger 数据", "Toggle demo ledger data")}
            onClick={() => {
              setDemoFilled((d) => !d);
              setLedPage(0);
              setDemoChart(false);
            }}>
            {demoFilled ? demoCopy("演示数据开", "Demo data on") : demoCopy("演示数据关", "Demo data off")}
          </TextBtn>
          <span className="led-q-wrap">
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
               
                onClick={() => {
                  setLedQ("");
                  setLedPage(0);
                }}>
                <svg viewBox="0 0 12 12" width={10} height={10} aria-hidden>
                  <path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            ) : null}
          </span>
          <TextBtn
            id="ledExport"
            disabled={!ledRows.length}
            title={t("Save every request listed, all pages, as a CSV file in Downloads")}
            onClick={() => {
              /* demo: no export when empty — Magpie click does nothing */
            }}>
            <span>{t("Export CSV")}</span>
          </TextBtn>
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
                        onClick={() => setLedStatus(ledStatus === "failed" ? "" : "failed")}>
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
                <div className="led-bar">
                  <Segs value={ledMetric} onChange={setLedMetric} items={LED_METRIC.map(([id, en]) => ({ id, label: t(en) }))} />
                  <span className="grow" />
                  <span className="led-split">
                    <span className="led-by">
                      {t("Split by")}
                    </span>
                    <Segs value={ledSplit} onChange={setLedSplit} items={LED_SPLIT.map(([id, en]) => ({ id, label: t(en) }))} />
                  </span>
                </div>
                <div className="led-body">
                  <LedChart
                    metric={ledMetric}
                    split={ledSplit}
                    day={ledDay}
                    emphasizeKey={ledEmph}
                    onChooseDay={(d) => {
                      // Magpie L18318–21: toggle day, reset pager
                      setLedDay((cur) => (cur === d ? "" : d));
                      setLedPage(0);
                    }}
                  />
                  <LedRank
                    metric={ledMetric}
                    split={ledSplit}
                    picked={ledRankPick}
                    onEmphasize={setLedEmph}
                    onChoose={(id) => {
                      // Magpie L18327–39: toggle category filter, reset pager
                      setLedRankPick((cur) => (cur === id ? "" : id));
                      setLedPage(0);
                    }}
                  />
                </div>
              </section>
            </div>
            {heatMetricRemember ? <LedHeat show={demoFilled && ledRows.length > 0} /> : null}
            <div className="led-head">
              <p className="led-sum" id="ledSum">
                {t(ledTotals.calls === 1 ? "{n} request" : "{n} requests", { n: String(ledTotals.calls) })}
                {" · "}
                {t("{n} in", { n: fmtN(ledTotals.input) })}
                {" · "}
                {t("{n} out", { n: fmtN(ledTotals.output) })}
                {ledTotals.errors ? ` · ${t("{n} failed", { n: String(ledTotals.errors) })}` : ""}
              </p>
              {/* Magpie #ledTight after #ledSum (app.js ledFit L18641–47) */}
              <span className="led-tight" id="ledTight" hidden />
              <span className="grow" />
            </div>
            <div className="led-wrap" id="ledWrap" ref={ledWrapRef}>
              <table className="led">
                <thead>
                  <tr>
                    {LED_COLS.map(([name, cls, opt]) => (
                      <th key={name} className={[cls || "", opt ? "lc-opt" : ""].filter(Boolean).join(" ") || undefined}>
                        {t(name)}
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
                          }}>
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
                          <td className={`model lc-opt${r.model ? "" : " faint"}`} title={r.model || t("Not kept for requests before this version")}>
                            {r.model || "—"}
                          </td>
                          <td className="model">{r.served || "—"}</td>
                          <td className={`lc-opt${r.effort ? "" : " faint"}`}>{r.effort || "—"}</td>
                          <td className="n">{fmtN(r.in)}</td>
                          <td className="n">{fmtN(r.out)}</td>
                          <td className={`n lc-opt${r.cache_write ? "" : " faint"}`}>{fmtN(r.cache_write)}</td>
                          <td className={`n lc-opt${r.cache_read ? "" : " faint"}`}>{fmtN(r.cache_read)}</td>
                          <td className={`n cost${r.cost ? "" : " faint"}`}>
                            {fmtCost(r.cost)}
                            {r.cost && r.pricing_model ? (
                              <div className="price-reference" title={t("API price reference") + ": " + r.pricing_model}>
                                {t("Price reference: {model}", { model: r.pricing_model })}
                              </div>
                            ) : null}
                          </td>
                          <td className="n">{(r.ms / 1000).toFixed(1)}s</td>
                          <td className={`n${r.speed ? "" : " faint"}`}>
                            {r.speed ? t("{n} tok/s", { n: String(r.speed) }) : "—"}
                          </td>
                          <td>
                            <span className="st">
                              <i className="dot" />
                              {bad ? t("Error") : t("OK")}
                            </span>
                          </td>
                        </tr>
                        {open ? (
                          <tr className="led-detail">
                            <td colSpan={LED_COLS.length}>
                              <div className="led-box">
                                <dl className="led-dl">
                                  {/* Magpie ledDetail opt() — lc-opt shown only while .led.tight (app.js L17673–80) */}
                                  {r.model ? (
                                    <>
                                      <dt className="lc-opt">{t("Sent")}</dt>
                                      <dd className="lc-opt">{r.model}</dd>
                                    </>
                                  ) : null}
                                  {r.effort ? (
                                    <>
                                      <dt className="lc-opt">{t("Effort")}</dt>
                                      <dd className="lc-opt">{r.effort}</dd>
                                    </>
                                  ) : null}
                                  <dt className="lc-opt">{t("Cache write")}</dt>
                                  <dd className="lc-opt">{fmtN(r.cache_write)}</dd>
                                  <dt className="lc-opt">{t("Cache read")}</dt>
                                  <dd className="lc-opt">{fmtN(r.cache_read)}</dd>
                                  {r.speed ? (
                                    <>
                                      <dt>{t("Speed")}</dt>
                                      <dd>{t("{n} tok/s", { n: String(r.speed) })}</dd>
                                    </>
                                  ) : null}
                                  <dt>{t("Data source")}</dt>
                                  <dd className="muted">
                                    {demoCopy("演示行展开（Magpie led-box / led-dl）", "Demo row expand (Magpie led-box / led-dl)")}
                                  </dd>
                                </dl>
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
            {/* Magpie index.html L214 + app.js ledHScroll L18513–22 */}
            <div className="led-hscroll" id="ledHScroll" ref={ledHScrollRef} hidden>
              <div />
            </div>
            <div className="led-pager" id="ledPager" hidden={ledRows.length <= pageSize}>
              <TextBtn disabled={ledPage <= 0} onClick={() => setLedPage((p) => Math.max(0, p - 1))}>
                {t("Previous")}
              </TextBtn>
              <span>
                {ledPage + 1} / {ledPages}
              </span>
              <TextBtn
                disabled={ledPage + 1 >= ledPages}
                onClick={() => setLedPage((p) => p + 1)}>
                {t("Next")}
              </TextBtn>
            </div>
          </>
        ) : (
          <>
            <div className="led-tools-extra">
              <TextBtn
                aria-pressed={demoChart}
                onClick={() => setDemoChart((d) => !d)}
                title={demoCopy("官方空态隐藏 ledDash；点此预览演示柱图壳", "Magpie hides ledDash when empty; preview demo chart shell")}>
                {demoChart ? demoCopy("隐藏演示图", "Hide demo chart") : demoCopy("显示演示图", "Show demo chart")}
              </TextBtn>
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
            <div
              className="led-head"
            >
              <p className="led-sum">
                {t("{n} requests", { n: "0" })}
              </p>
              <span className="grow" />
              <label
                className="led-archive"
               
                title={t("The request archive goes to the S3 bucket sync keeps its backup in, and sync isn't set up with one")}>
                <span>{t("Request archive")}</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={reqArchive}
                  aria-checked={reqArchive}
                  onChange={(e) => setReqArchive(e.target.checked)}
                 
                />
              </label>
            </div>
            <div className={`led-wrap${!demoChart ? " none" : ""}`} id="ledWrap">
              <div className="led-none">
                <b>
                  {ledQ.trim() || ledStatus
                    ? t("No requests match these filters.")
                    : noCallsIn(period)}
                </b>
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
          <TextBtn
            aria-pressed={demoFilled}
            onClick={() => setDemoFilled((d) => !d)}>
            {demoFilled ? demoCopy("演示数据开", "Demo data on") : demoCopy("演示数据关", "Demo data off")}
          </TextBtn>
        </div>
        {!demoFilled ? (
          <div>
            <TextBtn aria-pressed={false} onClick={() => setDemoFilled(true)}>
              {demoCopy("演示数据关 · 点此填充", "Demo data off · fill")}
            </TextBtn>
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
              <TextBtn className="sess-all" id="sessAll" data-feature="sessions">
                {t("All sessions")}
              </TextBtn>
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
                      }}>
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
                            }}>
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
                            }}>
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
              {/* Magpie app.js L19681–83 / sessions/client.js L656: text sess-page-more + Show {n} more (no invent Show less) */}
              {sessHidden > 0 ? (
                <TextBtn
                  className="sess-page-more"
                  onClick={() => setSessMore(true)}>
                  {t("Show {n} more", { n: String(sessHidden) })}
                </TextBtn>
              ) : null}
            </div>
          </>
        ) : (
          <>
            {/* Magpie app.js L19602–18: stats.empty + .none; empty-range → sess-show-history */}
            <section className="stats empty" id="sessStats">
              <div className="none">
                {!demoFilled
                  ? t(
                      "No sessions yet. Claude Code's, Codex's, OpenCode's and Pi's sessions on this computer show up here, with what each cost and the command that resumes it.",
                    )
                  : sessHasHistory
                    ? t("No sessions in this range")
                    : sessAgent !== "all" || sessQ.trim()
                      ? t("No session matches.")
                      : t("Nothing in this range.")}
              </div>
              {demoFilled && sessHasHistory ? (
                <TextBtn
                  className="sess-show-history"
                  onClick={() => setSessRange("all")}>
                  {t("All sessions")}
                </TextBtn>
              ) : null}
              <p className="usage-note">
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
          <TextBtn
            aria-pressed={demoFilled}
            onClick={() => setDemoFilled((d) => !d)}>
            {demoFilled ? demoCopy("演示数据开", "Demo data on") : demoCopy("演示数据关", "Demo data off")}
          </TextBtn>
        </div>
        <p className="usage-note ctx-tune-note">
          {t(
            "Your own calls of the range, replayed setting by setting from your agents' session files: the settings that would have spent the fewest tokens, for how you work. Tokens are weighed as the vendor charges them: a cache read is a tenth of one.",
          )}
        </p>
        {!demoFilled ? (
          <div className="ctx-none">
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
                    <TextBtn>
                      {t("Latest request")}
                    </TextBtn>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ctx-none ctx-empty-dash">
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
    id: "routing-strategies",
    name: "Routing strategies",
    sub: "The routings besides Smart: In order, In turn, Least used first, Weekly pace, By weight, and Manual",
    on: true,
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
      { pkg: "@magpie-community/opencode-zen-free", name: "OpenCode Zen Free", summary: "OpenCode Zen's free models with the public credential, automatic discovery and native streaming protocols.", downloads: "3.0k/week", ver: "v0.1.1", community: true, kind: "Provider", signsIn: "opencode-zen-free", updated: "Oct 10, 2026", readme: "OpenCode Zen's free models in magpie and OpenCode.\nProvider id: `opencode-zen-free`.\n\n## Install\n```\nmagpie plugin add @magpie-community/opencode-zen-free-auth\nmagpie plugin login opencode-zen-free\n```\n\n## Sign in\nEnter `public` in the key field. No personal API key is needed. The credential is kept in OpenCode's `auth.json` or magpie's `plugin-auth.json`." },
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
      { pkg: "@magpie-community/middleware-think-tags", name: "Think Tags", summary: "Take a model's <think>...</think> out of its reply's text, or put a Chat reply's reasoning into it.", downloads: "159/week", ver: "v0.1.0", community: true, kind: "Middleware", updated: "Oct 6, 2026", readme: "Magpie gateway middleware for <think> tags.\n\n## Install\n```\nmagpie plugin add @magpie-community/middleware-think-tags\n```\n\n## Options\n```\n{ \"mode\": \"strip\" }\n```" },
      { pkg: "@magpie-community/middleware-word-guard", name: "Word Guard", summary: "Block or rewrite words in what every agent sends and gets back.", downloads: "403/week", ver: "v0.1.1", community: true, kind: "Middleware", updated: "Oct 8, 2026", readme: "Magpie gateway middleware word guard.\n\n## Install\n```\nmagpie plugin add @magpie-community/middleware-word-guard\n```" },
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
      { pkg: "github:mu-zi-lee/magpie-our-free-models", name: "magpie-our-free-models", summary: "Our Free Model 的 Magpie 适配插件：整合免费模型池、EAC 授权与多账号渠道，支持自动服务…", downloads: "225★", ver: "v0.9.0", unofficial: true, owner: "mu-zi-lee", stars: 225, kind: "Provider", updated: "Oct 14, 2026", github: "https://github.com/mu-zi-lee/magpie-our-free-models" },
      { pkg: "github:mu-zi-lee/magpie-intelligence", name: "magpie-intelligence", summary: "Magpie 模型质量检测插件：对指定主力模型进行自动探针、请求门禁和人工确认，支持本地与…", downloads: "50★", ver: "v0.3.0", unofficial: true, owner: "mu-zi-lee", stars: 50, kind: "Provider", updated: "Oct 13, 2026", github: "https://github.com/mu-zi-lee/magpie-intelligence" },
      { pkg: "github:BUKOWSKIREAL/magpie-gemini-web", name: "magpie-gemini-web", summary: "Gemini Web provider for Magpie with a local backend and experimental Argon support.", downloads: "12★", ver: "v0.2.0", unofficial: true, owner: "BUKOWSKIREAL", stars: 12, kind: "Provider", updated: "Oct 12, 2026", github: "https://github.com/BUKOWSKIREAL/magpie-gemini-web" },
      { pkg: "github:JohnWangggg/magpie-muse-web", name: "magpie-muse-web", summary: "Magpie plugin for muse.ai: sign in to each account in a browser, use Muse Spark with…", downloads: "8★", ver: "v0.1.4", unofficial: true, owner: "JohnWangggg", stars: 8, kind: "Provider", updated: "Oct 11, 2026", github: "https://github.com/JohnWangggg/magpie-muse-web" },
      { pkg: "github:euanguo/magpie-middleware-image-keep", name: "magpie-middleware-image-keep", summary: "magpie gateway middleware: keep the newest images and replace older inline images with…", downloads: "2★", ver: "v0.2.0", unofficial: true, owner: "euanguo", stars: 2, kind: "Middleware", updated: "Oct 12, 2026", github: "https://github.com/euanguo/magpie-middleware-image-keep" },
      { pkg: "github:shiyang1026/magpie-claude-science", name: "magpie-claude-science", summary: "Use Magpie models in Claude Science with the original macOS app.", downloads: "4★", ver: "v0.1.3", unofficial: true, owner: "shiyang1026", stars: 4, kind: "Middleware", updated: "Oct 10, 2026", github: "https://github.com/shiyang1026/magpie-claude-science" },
      { pkg: "github:ezdemo/magpie-haiku55-think", name: "magpie-haiku55-think", summary: "Magpie Haiku 5.5 thinking middleware with a verified OpenDesign compatibility workaround", downloads: "1★", ver: "v0.1.0", unofficial: true, owner: "ezdemo", stars: 1, kind: "Middleware", updated: "Oct 9, 2026", github: "https://github.com/ezdemo/magpie-haiku55-think" },
      { pkg: "github:Lixsp11/claude-api-billing", name: "claude-api-billing", summary: "Claude API billing middleware for Magpie gateway traces.", downloads: "0★", ver: "v0.1.0", unofficial: true, owner: "Lixsp11", stars: 0, kind: "Middleware", updated: "Oct 8, 2026", github: "https://github.com/Lixsp11/claude-api-billing" },
      { pkg: "github:nodlles/magpie-agent-cursor", name: "magpie-agent-cursor", summary: "Use Magpie models in Cursor through a local protocol bridge (Apple Silicon macOS)", downloads: "0★", ver: "v0.2.1", unofficial: true, owner: "nodlles", stars: 0, kind: "Agent", updated: "Oct 7, 2026", github: "https://github.com/nodlles/magpie-agent-cursor" },
      { pkg: "github:SadWood/magpie-gaccode", name: "magpie-gaccode", summary: "Unofficial GACCode provider for magpie and OpenCode, with quota reporting and optiona…", downloads: "1★", ver: "v0.1.2", unofficial: true, owner: "SadWood", stars: 1, kind: "Provider", updated: "Oct 5, 2026", github: "https://github.com/SadWood/magpie-gaccode" },
      { pkg: "github:mu-zi-lee/magpie-chatgptweb", name: "magpie-chatgptweb", summary: "Magpie 的实验性 ChatGPT 网页接入插件：基于 Playwright 和独立浏览器配置，支持匿名聊天…", downloads: "1★", ver: "v0.1.0", unofficial: true, owner: "mu-zi-lee", stars: 1, kind: "Provider", updated: "Oct 1, 2026", github: "https://github.com/mu-zi-lee/magpie-chatgptweb" },
      { pkg: "github:demo/magpie-agent-bridge-gh", name: "magpie-agent-bridge-gh", summary: "Third-party agent bridge tagged magpie-plugin on GitHub.", downloads: "0★", ver: "v0.0.3", unofficial: true, owner: "demo", stars: 0, kind: "Agent", updated: "Sep 28, 2026", github: "https://github.com/demo/magpie-agent-bridge-gh" },
    ],
  },
];


/** Magpie searchNPM Suggested hits (shots 20–24) — demo filter, 350ms debounce. */
const DEMO_NPM = [
  { pkg: "@magpie-community/middleware-think-tags", name: "Think Tags", summary: "Take a model's <think>...</think> out of its reply's text, or put a Chat reply's reasoning into it.", downloads: "159/week", ver: "v0.1.0", kind: "Middleware", q: "think tags", community: true, updated: "Oct 6, 2026" },
  { pkg: "@magpie-community/middleware-word-guard", name: "Word Guard", summary: "Block or rewrite words in what every agent sends and gets back.", downloads: "403/week", ver: "v0.1.1", kind: "Middleware", q: "word guard", community: true, updated: "Oct 8, 2026" },
  { pkg: "@magpie-community/opencode-zen-free", name: "OpenCode Zen Free", summary: "OpenCode Zen's free models with the public credential, automatic discovery and native streaming protocols.", downloads: "3.0k/week", ver: "v0.1.1", kind: "Provider", q: "opencode", signsIn: "opencode-zen-free", updated: "Oct 10, 2026" },
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


/** Magpie Installed footer after plugins/91–103 (was 1.4.2 in 81–90). */
const BUN_VER = "1.4.3";

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
  const [mirror, setMirror] = useState(false);
  const [mirrorSaving, setMirrorSaving] = useState(false);
  /** Magpie drawGh: kind segs + Filter by name (shots 76–80); only when GitHub list > 6 */
  const [ghKind, setGhKind] = useState<"" | "Provider" | "Middleware" | "Agent">("");
  const [ghFilter, setGhFilter] = useState("");
  const [builtins, setBuiltins] = useState(() => {
    try {
      const libOn = localStorage.getItem("magpie.feature.library") === "1";
      const groupsOn = localStorage.getItem("magpie.feature.groups") === "1";
      return BUILTINS_DEFAULT.map((b) => {
        if (b.id === "library") return { ...b, on: libOn };
        if (b.id === "routing-groups") return { ...b, on: groupsOn };
        return b;
      });
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
      /** Magpie subsOf: provider plugin not signed in → Sign in (shots 43–44) */
      signedIn?: boolean;
      /** Magpie checked.by after Check for updates (shots 49–50) */
      checkStatus?: "current" | "update" | "unknown";
      optsOpen?: boolean;
      opts?: string;
      /** Editor draft while Options open; Escape/Cancel discards (shots 125–128). */
      optsDraft?: string;
      optsErr?: string;
      optsSaved?: boolean;
      /** Magpie movable: built-in subscription names this plugin can/does serve */
      movable?: string[];
      moved?: string[];
    }[]>([
    /* plugins/104–138 left: Installed · 2, Think Tags options saved as example, Word Guard on, A→Z */
    {
      pkg: "@magpie-community/middleware-think-tags",
      name: "Think Tags",
      ver: "v0.1.0",
      kind: "Middleware",
      opts: '{\n  "mode": "strip"\n}',
      optsOpen: false,
      optsSaved: true,
      checkStatus: "current",
      optsDraft: undefined,
    },
    {
      pkg: "@magpie-community/middleware-word-guard",
      name: "Word Guard",
      ver: "v0.1.1",
      kind: "Middleware",
      opts: "",
      optsOpen: false,
      optsSaved: false,
    },
  ]);
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
  /** Magpie confirmAction: restore focus to the row Remove that opened it (shots 94/97/100). */
  const removeFocusRef = useRef<HTMLButtonElement | null>(null);
  /** Magpie plugins/134–137 Clear options confirm; Escape cancels, editor stays. */
  const [clearConfirm, setClearConfirm] = useState<{ pkg: string; name: string } | null>(null);
  const clearFocusRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  /** Bun on disk (footer 1.4.3); after first install → Installing… (104–113), not Getting Bun…. */
  const [bunReady, setBunReady] = useState(() => {
    try {
      if (localStorage.getItem("magpie.bunReady") === "1") return true;
    } catch { /* */ }
    /* Seeded Installed · 2 (104–138) ⇒ Bun already present */
    return true;
  });
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
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

  // Magpie: Escape does not close pm-detail (Close / backdrop only) — shots 03/55
  useEffect(() => {
    if (!pluginDetail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
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

  /** Magpie actionFor: Provider / signsIn → Sign in after install (shots 55–59 detail). */
  const pluginNeedsSignIn = (pkg: string) => {
    const meta = lookupPluginMeta(pkg);
    if (meta.kind === "Provider") return true;
    for (const sec of DEMO_MARKET) {
      const c = sec.cards.find((x) => x.pkg === pkg) as { signsIn?: string } | undefined;
      if (c?.signsIn) return true;
    }
    const n = DEMO_NPM.find((x) => x.pkg === pkg) as { signsIn?: string } | undefined;
    return Boolean(n?.signsIn);
  };
  const pluginSignsInId = (pkg: string) => {
    for (const sec of DEMO_MARKET) {
      const c = sec.cards.find((x) => x.pkg === pkg) as { signsIn?: string } | undefined;
      if (c?.signsIn) return c.signsIn;
    }
    const n = DEMO_NPM.find((x) => x.pkg === pkg) as { signsIn?: string } | undefined;
    return n?.signsIn || "";
  };

  const install = (pkg: string, name: string) => {
    if (busy) return;
    if (installed.some((x) => x.pkg === pkg)) {
      // Magpie actionFor Sign in (detail 58): mock only — no OAuth
      onStatus?.(t("Demo: sign-in was not started"), "ok", 2800);
      return;
    }
    setBusy(pkg);
    // Magpie: no Bun yet → "Getting Bun…" then stay on Discover + toast (shots 37–39 / 55–59)
    window.setTimeout(() => {
      const meta = lookupPluginMeta(pkg);
      setInstalled((list) =>
        list.some((x) => x.pkg === pkg)
          ? list
          : [...list, { pkg, name, ver: meta.ver, kind: meta.kind, opts: "", optsOpen: false }],
      );
      setBusy(null);
      setBunReady(true);
      try { localStorage.setItem("magpie.bunReady", "1"); } catch { /* */ }
      const signToast = pluginNeedsSignIn(pkg);
      onStatus?.(
        signToast ? t("{name} is installed — sign in to use it", { name }) : t("{name} is installed", { name }),
        "ok",
        3500,
      );
    }, 1100);
  };

  const installAct = (pkg: string, has: boolean) => {
    if (busy === pkg) {
      /* Magpie 104–113: Bun on disk → Installing… + spinner on card (not Getting Bun…). */
      return (
        <>
          <span className="spin" aria-hidden />
          <span>{bunReady ? t("Installing…") : t("Getting Bun…")}</span>
        </>
      );
    }
    if (has && pluginNeedsSignIn(pkg)) {
      return t("Sign in");
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
            aria-hidden>
            <path d="M3.2 8.2 6.4 11.4 12.8 4.2" />
          </svg>
          <span>{t("Installed")}</span>
        </>
      );
    }
    return t("Install");
  };

  const pmActClass = (pkg: string, has: boolean) => {
    if (busy === pkg) return "pm-act busy";
    if (has && pluginNeedsSignIn(pkg)) return "pm-act go";
    if (has) return "pm-act done";
    return "pm-act get";
  };

  const n = installed.length;

  return (
    <main className="view" id="view-plugins">
      <div className="lib-head pm-head row-head">
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
            disabled={mirrorSaving}
            title={t("Download the plugin list, plugins and Bun from mirrors in China first (npmmirror, jsDelivr), their official addresses after. Each is a copy of the very file, checked as the original is")}
            onClick={() => {
              if (mirrorSaving) return;
              setMirrorSaving(true);
              setMirror((m) => !m);
              setSearchBusy(true);
              // Magpie plugins/mirror then reload listings; brief busy then re-enable
              window.setTimeout(() => {
                setSearchBusy(false);
                setMirrorSaving(false);
              }, 420);
            }}>
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
              ref={searchInputRef}
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
                if (e.key === "Escape" && query) {
                  setQuery("");
                  setTab("discover");
                }
              }}
            />
            {query ? (
              <button
                type="button"
                className="pm-find-clear"
                aria-label={t("Clear")}
                title={t("Clear")}
                onClick={() => {
                  /* Magpie 116: clear × from Installed leftover query → Discover landing, search focused */
                  setQuery("");
                  setTab("discover");
                  requestAnimationFrame(() => searchInputRef.current?.focus({ preventScroll: true }));
                }}>
                ×
              </button>
            ) : null}
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
                  {/* Magpie renderBuiltins app.js ~24446–24473: row.pref.feat-row + lib-switch use-credits (no .val) */}
                  <PrefRow
                    name={t(b.name)}
                    sub={t(b.sub)}
                    className="feat-row"
                    dataFeature={b.feature}
                    dataId={b.id}
                    wrapVal={false}
                    afterWho={
                      <>
                        {b.on && b.id === "gateway" ? (
                          <div className="sub feat-use">{t("1 gateway key")}</div>
                        ) : null}
                        {b.locked ? (
                          <div className="sub feat-why">{t("In use, so it stays on")}</div>
                        ) : null}
                      </>
                    }>
                    <LibSwitch
                      on={!!b.on}
                      kind="use-credits"
                      aria-label={t(b.name)}
                      disabled={!!b.locked}
                      title={b.locked ? t("In use, so it stays on") : undefined}
                      onClick={() => {
                        if (b.locked) return;
                        setBuiltins((list) => {
                          const next = list.map((x) => (x.id === b.id ? { ...x, on: !x.on } : x));
                          const lib = next.find((x) => x.id === "library");
                          const groups = next.find((x) => x.id === "routing-groups");
                          try {
                            localStorage.setItem("magpie.feature.library", lib?.on ? "1" : "0");
                            localStorage.setItem("magpie.feature.groups", groups?.on ? "1" : "0");
                            window.dispatchEvent(new Event("magpie-feature"));
                          } catch { /* */ }
                          return next;
                        });
                        // Magpie plugins.yml write → toast Saved (routing 119)
                        onStatus?.(t("Saved"), "ok", 2200);
                      }}
                    />
                  </PrefRow>
                  {b.on && b.id === "gateway" ? (
                    /* Magpie feat-set under builtin (app.js ~24487–24489 dataset.of) */
                    <PrefRow
                      name={t("Recent calls at a time")}
                      sub={t("How many of the gateway's recent calls the page shows, and how many more each Show more adds")}
                      className="feat-set"
                      dataOf="gateway">
                      <button
                        type="button"
                        className={`sess-pick set${gwCallsOpen ? " open" : ""}`}
                        aria-haspopup="menu"
                        aria-expanded={gwCallsOpen}
                        onClick={() => setGwCallsOpen((o) => !o)}>
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
                    </PrefRow>
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
                      onClick={() => window.open("https://usemagpie.ai/docs/plugins#middleware", "_blank", "noopener")}>
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
              const isGh = sec.kind === "gh";
              const ghFound = isGh
                ? cards.filter((c) => {
                    const f = ghFilter.trim().toLowerCase();
                    if (!f) return true;
                    const owner = "owner" in c ? String((c as { owner?: string }).owner || "") : "";
                    return `${c.name} ${owner} ${c.summary} ${c.pkg}`.toLowerCase().includes(f);
                  })
                : cards;
              const kindsPresent = isGh
                ? (["Provider", "Middleware", "Agent"] as const).filter((k) =>
                    cards.some((c) => "kind" in c && (c as { kind?: string }).kind === k),
                  )
                : [];
              const nKind = (k: string) =>
                ghFound.filter((c) => !k || ("kind" in c && (c as { kind?: string }).kind === k)).length;
              const shown = isGh
                ? ghFound.filter((c) => !ghKind || ("kind" in c && (c as { kind?: string }).kind === ghKind))
                : cards;
              return (
                <div className="pm-sec" key={sec.kind}>
                  <div className="pm-sechead">
                    <h3>{t(sec.section)}</h3>
                    <span>{t(sec.note)}</span>
                  </div>
                  {isGh && cards.length > 6 && kindsPresent.length > 1 ? (
                    <div className="pm-ghbar">
                      {/* Magpie plugins.js L609: segs(...).classList.add("pm-ghkinds") */}
                      <Segs
                        className="pm-ghkinds"
                        aria-label={t("Kind of plugin")}
                        value={ghKind}
                        onChange={(id) => setGhKind(id as typeof ghKind)}
                        items={[
                          { id: "" as typeof ghKind, label: `${t("All")} · ${nKind("")}` },
                          ...kindsPresent.map((k) => ({
                            id: k as typeof ghKind,
                            label: `${t(k)} · ${nKind(k)}`,
                          })),
                        ]}
                      />
                      <span className="grow" />
                      <label className="pm-find pm-ghfind">
                        <svg viewBox="0 0 16 16" width={13} height={13} aria-hidden>
                          <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                          <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                        <input
                          type="search"
                          spellCheck={false}
                          autoComplete="off"
                          placeholder={t("Filter by name, author or description")}
                          aria-label={t("Filter the plugins on GitHub")}
                          value={ghFilter}
                          onChange={(e) => setGhFilter(e.target.value)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Escape" && ghFilter) setGhFilter("");
                          }}
                        />
                      </label>
                    </div>
                  ) : null}
                  {isGh && shown.length === 0 ? (
                    <div className="pm-ghnone">
                      <div>{t("No plugin on GitHub matches")}</div>
                      <TextBtn onClick={() => { setGhKind(""); setGhFilter(""); }}>
                        {t("Show all")}
                      </TextBtn>
                    </div>
                  ) : (
                  <div className="pm-grid">
                    {shown.map((c) => {
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
                          }}>
                          <div className="pm-logo" aria-hidden>
                            ◆
                          </div>
                          <div className="pm-words">
                            <div className="pm-name">
                              <b>{c.name}</b>
                              {"alsoBuiltin" in c && (c as { alsoBuiltin?: boolean }).alsoBuiltin ? (
                                <span className="pm-chip">{t("Also built in")}</span>
                              ) : null}
                            </div>
                            {"community" in c && (c as { community?: boolean }).community ? (
                              <div className="pm-by">
                                {t("magpie community")}
                              </div>
                            ) : "owner" in c && (c as { owner?: string }).owner ? (
                              <div className="pm-by">
                                {(c as { owner?: string }).owner}
                              </div>
                            ) : null}
                            <p className="pm-sum">{c.summary}</p>
                            <div className="pm-meta">
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
                            className={pmActClass(c.pkg, has)}
                            title={busy === c.pkg ? t("Plugins run on Bun {v}, downloaded once", { v: BUN_VER }) : undefined}
                            disabled={busy === c.pkg || (has && !pluginNeedsSignIn(c.pkg))}
                            onClick={(e) => {
                              e.stopPropagation();
                              install(c.pkg, c.name);
                            }}>
                            {installAct(c.pkg, has)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
              );
            })
              : null}
            {/* Magpie: Suggested only when listings match; On npm always while searching (shots 20–25) */}
            {debouncedQ && npmHits.length ? (
              <div className="pm-sec">
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
                        <div className="pm-words">
                          <b>{c.name}</b>
                          {c.builtin ? <span className="pm-chip">{t("Also built in")}</span> : null}
                          {"community" in c && (c as { community?: boolean }).community ? (
                            <div className="pm-by">
                              {t("magpie community")}
                            </div>
                          ) : null}
                          <p>{c.summary}</p>
                          <div>
                            {c.kind ? <span className="pm-chip">{t(c.kind)}</span> : null}
                            <span>{c.downloads}</span>
                            <span className="pm-ver">{c.ver}</span>
                            {mirror ? <span>{t("via China mirrors")}</span> : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={pmActClass(c.pkg, has)}
                          title={busy === c.pkg ? t("Plugins run on Bun {v}, downloaded once", { v: BUN_VER }) : undefined}
                            disabled={busy === c.pkg || (has && !pluginNeedsSignIn(c.pkg))}
                          onClick={(e) => {
                            e.stopPropagation();
                            install(c.pkg, c.name);
                          }}>
                          {installAct(c.pkg, has)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {debouncedQ ? (
              <div className="pm-sec">
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
                            <div className="pm-words">
                              <b>{c.name}</b>
                              <p>{c.summary}</p>
                              <div>
                                {c.pkg} · {c.downloads} · {c.ver}
                                {mirror ? ` · ${t("via China mirrors")}` : ""}
                              </div>
                            </div>
                            <button
                              type="button"
                              className={pmActClass(c.pkg, has)}
                              title={busy === c.pkg ? t("Plugins run on Bun {v}, downloaded once", { v: BUN_VER }) : undefined}
                            disabled={busy === c.pkg || (has && !pluginNeedsSignIn(c.pkg))}
                              onClick={(e) => {
                                e.stopPropagation();
                                install(c.pkg, c.name);
                              }}>
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
              <div className="pm-sec" aria-busy="true" aria-label={t("Searching…")}>
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

            <div className="pm-sec">
              {/* Magpie manual(): CU 66–70 — Installing… purple pill NO spinner; field cleared on draw; bun 404 err */}
              <form
                className="pm-manual"
                onSubmit={(e) => {
                  e.preventDefault();
                  const spec = manualSpec.trim();
                  if (!spec || busy) return;
                  // Magpie act: busy.set → draw() rebuilds form → field empty while Installing…
                  setManualSpec("");
                  setBusy("__manual__");
                  // Fail <1s on native (github:magpie/example); demo ~700ms
                  window.setTimeout(() => {
                    setBusy(null);
                    const failDemo =
                      /^github:magpie\/example$/i.test(spec) ||
                      /^github:owner\/repo$/i.test(spec);
                    if (failDemo) {
                      const err =
                        `bun add ${spec}: exit status 1: bun add v1.4.2 (744846f84) Resolving dependen` +
                        `cies\nResolved, downloaded and extracted [1]\n` +
                        `error: GET https://api.github.com/repos/${spec.replace(/^github:/i, "")}/tarball/ - 404\n` +
                        `error: Invalid dependency name "${spec}"\n` +
                        `error: ${spec} failed to resolve`;
                      onStatus?.(err, "err", 8000);
                      return;
                    }
                    const short =
                      spec
                        .replace(/^github:/i, "")
                        .replace(/^https?:\/\/(?:www\.)?github\.com\//i, "")
                        .split("/")
                        .pop()
                        ?.replace(/\.git$/i, "") || spec;
                    setInstalled((list) =>
                      list.some((x) => x.pkg === spec)
                        ? list
                        : [...list, { pkg: spec, name: short, ver: undefined, kind: "Provider", opts: "", optsOpen: false }],
                    );
                    onStatus?.(t("{name} is installed", { name: spec }), "ok", 3500);
                  }, 700);
                }}>
                <span className="pm-mlabel">{t("Have one in mind?")}</span>
                <input
                  className="pm-minput"
                  placeholder={t("npm package, GitHub repo (github:owner/repo) or a folder")}
                  aria-label={t("Plugin")}
                  spellCheck={false}
                  autoComplete="off"
                  value={manualSpec}
                  disabled={busy === "__manual__"}
                  onChange={(e) => setManualSpec(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  className="pm-browse"
                  title={t("Choose a folder on this computer")}
                  aria-label={t("Choose a folder")}
                  disabled={busy === "__manual__"}
                  onClick={async () => {
                    /* Magpie plugins.js L853–868 browse → api("plugins/choose"); fill pm-minput */
                    try {
                      const w = window as Window & {
                        showDirectoryPicker?: () => Promise<{ name: string }>;
                      };
                      if (typeof w.showDirectoryPicker === "function") {
                        const handle = await w.showDirectoryPicker();
                        setManualSpec(`/home/box/${handle.name}`);
                        return;
                      }
                    } catch {
                      return; /* cancel */
                    }
                    /* Magpie web has no picker (plugins.js L846–847); demo fills a path */
                    setManualSpec("/home/box/plugins");
                  }}>
                  <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden>
                    <path d="M2 4.5h4l1.2 1.5H14v7H2z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  </svg>
                </button>
                <TextBtn
                  type="submit"
                  variant="primary"
                  disabled={busy === "__manual__"}
                  aria-busy={busy === "__manual__" || undefined}>
                  {/* Magpie manual busy: text only — no spinner (Bun on disk; CU 68) */}
                  {busy === "__manual__" ? t("Installing…") : t("Install")}
                </TextBtn>
              </form>
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
                <div className="row-head pm-listhead">
                  <span className="grow" />
                  <Segs
                    className="sortby"
                    dataSort="plugins"
                    value={pluginsSort}
                    aria-label={t("Names from A to Z")}
                    items={[
                      { id: "az" as const, label: "A→Z", title: t("Names from A to Z") },
                      { id: "za" as const, label: "Z→A", title: t("Names from Z to A") },
                    ]}
                    onChange={(id) => {
                      setPluginsSort(id);
                      try { localStorage.setItem("magpie.sort.plugins", id); } catch { /* */ }
                    }}
                  />
                </div>
              ) : null}
              <div className="list pm-list">
                {[...installed]
                  .sort((a, b) => (pluginsSort === "za" ? -1 : 1) * a.name.localeCompare(b.name))
                  .map((e) => (
                  <div
                    className={`row pref pm-row${e.off ? " off" : ""}`}
                    key={e.pkg}
                    title={`${e.name}${e.ver || ""}${e.kind || ""}`}>
                    <div className="pm-logo" aria-hidden>
                      ◆
                    </div>
                    <div className="who">
                      <div className="name pm-name">
                        <span>{e.name}</span>
                        {e.ver ? <span className="pm-ver">{e.ver.startsWith("v") ? e.ver : `v${e.ver}`}</span> : null}
                        {e.checkStatus === "current" && e.ver ? (
                          <span
                            className="pm-chip soft"
                            title={t("v{v} is the newest on npm", { v: e.ver.replace(/^v/, "") }) + (lastCheckedAt ? "\n" + t("Last checked {time}", { time: lastCheckedAt }) : "")}>
                            {t("Up to date")}
                          </span>
                        ) : null}
                        {e.kind ? (
                          <span
                            className={`pm-chip kind${e.kind === "Provider" ? " pv" : e.kind === "Middleware" ? " mw" : e.kind === "Agent" ? " ag" : ""}`}
                            title={
                              e.kind === "Provider"
                                ? t("Signs in to a subscription and serves its models")
                                : e.kind === "Middleware"
                                  ? t("Runs in magpie's gateway on what every agent sends and gets back")
                                  : undefined
                            }>
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
                      {asking?.pkg === e.pkg ? (
                        <div className="sub ask">
                          {asking.op === "move"
                            ? t("{names} can run on it again, with the same accounts.", {
                                names: (e.movable || e.moved || ["Kimi Code"]).join(t(", ")),
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
                        </div>
                      ) : e.off || e.kind === "Provider" ? (
                        <div className="sub">
                          {e.off
                            ? t("Off")
                            : !e.signedIn
                              ? (
                                  <span className="pm-sub">
                                    <span className="dot" />
                                    <span>{t("{name}: not signed in", { name: e.name })}</span>
                                  </span>
                                )
                              : (
                                  <span className="pm-sub in">
                                    <span className="dot" />
                                    <span>{t("{name}: signed in", { name: e.name })}</span>
                                  </span>
                                )}
                        </div>
                      ) : null}
                      {e.kind === "Middleware" && !e.off && asking?.pkg !== e.pkg ? (
                        <div className="sub pm-mw">
                          {t("Gateway middleware: {hooks}", {
                            hooks: e.pkg.includes("word-guard")
                              ? "onRequest, onEvent, onResponse"
                              : "onEvent, onResponse",
                          })}
                          {" · "}
                          {t("{n} calls, {us} µs each", { n: "0", us: "0" })}
                        </div>
                      ) : null}
                      {e.optsOpen && asking?.pkg !== e.pkg ? (
                        <div className="pm-opts">
                          <textarea
                            aria-label={t("Options")}
                            rows={Math.min(10, Math.max(4, ((e.optsDraft ?? e.opts) || "").split("\n").length + 1))}
                            placeholder={e.pkg.includes("think-tags") ? '{\n  "mode": "strip"\n}' : '{\n  "hooks": ["request", "response"],\n  "onEvent": ["error"]\n}'}
                            value={
                              e.optsDraft ??
                              (e.opts ||
                                (e.pkg.includes("think-tags")
                                  ? '{\n  "mode": "strip"\n}'
                                  : '{\n  "hooks": ["request", "response"],\n  "onEvent": ["error"]\n}'))
                            }
                            onChange={(ev) =>
                              setInstalled((list) =>
                                list.map((x) => (x.pkg === e.pkg ? { ...x, optsDraft: ev.target.value, optsErr: "" } : x)),
                              )
                            }
                            onKeyDown={(ev) => {
                              if (ev.key === "Escape") {
                                /* Magpie 127: Escape discards draft; no toast; reopen shows example again */
                                if (clearConfirm) return;
                                setInstalled((list) =>
                                  list.map((x) =>
                                    x.pkg === e.pkg ? { ...x, optsOpen: false, optsDraft: undefined, optsErr: "" } : x,
                                  ),
                                );
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
                            {e.optsSaved ? (
                            <TextBtn
                              className="quiet"
                              title={t("Runs it with no options")}
                              onClick={(ev) => {
                                clearFocusRef.current = ev.currentTarget;
                                setClearConfirm({ pkg: e.pkg, name: e.name });
                              }}>
                              {t("Clear")}
                            </TextBtn>
                            ) : null}
                            <TextBtn
                              onClick={() =>
                                setInstalled((list) =>
                                  list.map((x) =>
                                    x.pkg === e.pkg ? { ...x, optsOpen: false, optsDraft: undefined, optsErr: "" } : x,
                                  ),
                                )
                              }>
                              {t("Cancel")}
                            </TextBtn>
                            <TextBtn
                              variant="primary"
                              onClick={() => {
                                try {
                                  const raw =
                                    e.optsDraft ??
                                    (e.opts ||
                                      (e.pkg.includes("think-tags") ? '{\n  "mode": "strip"\n}' : "{}"));
                                  const v = JSON.parse(raw);
                                  if (!v || typeof v !== "object" || Array.isArray(v)) {
                                    throw new Error("JSON Parse error: Expected '}'");
                                  }
                                  setInstalled((list) =>
                                    list.map((x) =>
                                      x.pkg === e.pkg
                                        ? {
                                            ...x,
                                            opts: raw,
                                            optsSaved: true,
                                            optsErr: "",
                                            optsOpen: false,
                                            optsDraft: undefined,
                                          }
                                        : x,
                                    ),
                                  );
                                  /* Magpie 129: editor gone same step; toast Think Tags's options saved */
                                  onStatus?.(t("{name}'s options saved", { name: e.name }), "ok", 3200);
                                } catch (err) {
                                  const msg = err instanceof Error ? err.message : String(err);
                                  /* Magpie 126: Not JSON: JSON Parse error: Expected '}' */
                                  let detail = msg;
                                  const draft = (e.optsDraft ?? e.opts ?? "").trim();
                                  if (!detail.startsWith("JSON Parse error:")) {
                                    if (msg.includes("Expected") || draft === "{") {
                                      detail = "JSON Parse error: Expected '}'";
                                    } else {
                                      detail = `JSON Parse error: ${msg}`;
                                    }
                                  }
                                  setInstalled((list) =>
                                    list.map((x) =>
                                      x.pkg === e.pkg ? { ...x, optsErr: t("Not JSON: {error}", { error: detail }) } : x,
                                    ),
                                  );
                                }
                              }}>
                              {t("Save")}
                            </TextBtn>
                          </div>
                        </div>
                      ) : null}


                    </div>
                    <div className="val">
                      {asking?.pkg === e.pkg ? (
                        <>
                          <TextBtn onClick={() => setAsking(null)}>
                            {asking.op === "move" ? t("Not now") : t("Cancel")}
                          </TextBtn>
                          <TextBtn
                            variant="primary"
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
                            }}>
                            {asking.op === "move" ? t("Move") : asking.op === "remove" ? t("Remove") : t("Switch off")}
                          </TextBtn>
                        </>
                      ) : (
                        <>
                          {!e.off && e.kind === "Provider" && !e.signedIn ? (
                            <TextBtn
                              variant="primary"
                              onClick={() =>
                                onStatus?.(
                                  demoCopy(
                                    "演示：未发起插件登录（无真 OAuth）",
                                    "Demo: plugin sign-in not started (no real OAuth)",
                                  ),
                                  "warn",
                                  2800,
                                )
                              }>
                              {t("Sign in")}
                            </TextBtn>
                          ) : null}
                          {e.movable?.length && !e.off && !(e.moved && e.moved.length) ? (
                            <TextBtn
                              variant="primary"
                              title={t(
                                "Runs {name} on this plugin in place of the built-in, with the same accounts; nothing changes if one doesn't work through it",
                                { name: e.movable[0] },
                              )}
                              onClick={() => setAsking({ pkg: e.pkg, op: "move" })}>
                              {busy === e.pkg ? t("Moving…") : t("Move {name} here", { name: e.movable[0] })}
                            </TextBtn>
                          ) : null}
                          {e.kind === "Middleware" && !e.off && !e.optsOpen ? (
                            <TextBtn
                              title={e.optsSaved ? t("The options it runs with") : t("It runs with no options; its package suggests some")}
                              onClick={() =>
                                setInstalled((list) =>
                                  list.map((x) => {
                                    if (x.pkg !== e.pkg) return x;
                                    const example = x.pkg.includes("think-tags")
                                      ? '{\n  "mode": "strip"\n}'
                                      : '{\n  "hooks": ["request", "response"],\n  "onEvent": ["error"]\n}';
                                    return {
                                      ...x,
                                      optsOpen: true,
                                      optsDraft: x.optsSaved && x.opts ? x.opts : example,
                                      optsErr: "",
                                    };
                                  }),
                                )
                              }>
                              {t("Options")}
                            </TextBtn>
                          ) : null}
                          <TextBtn
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
                            }}>
                            {e.off ? t("Switch on") : t("Switch off")}
                          </TextBtn>
                          <TextBtn
                            className="quiet"
                            disabled={busy === "remove:" + e.pkg || busy === e.pkg}
                            title={
                              e.moved?.length
                                ? t("{names} goes back to the built-in first, then the plugin is removed", {
                                    names: e.moved.join(t(", ")),
                                  })
                                : t("Removes the plugin and what it installed; its sign-ins are kept until you sign out")
                            }
                            onClick={(ev) => {
                              if (e.moved?.length) setAsking({ pkg: e.pkg, op: "remove" });
                              else {
                                removeFocusRef.current = ev.currentTarget;
                                setRemoveConfirm({ pkg: e.pkg, name: e.name });
                              }
                            }}>
                            {busy === "remove:" + e.pkg ? t("Removing…") : t("Remove")}
                          </TextBtn>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="pm-foot">
                <span>{t("Plugins run on Bun {v}", { v: BUN_VER })}</span>
                <span className="grow" />
                <TextBtn
                  className="pm-check"
                  busy={checkingUpdates}
                  disabled={!!busy}
                  title={
                    t("Ask npm now for each plugin's newest version") +
                    (lastCheckedAt ? "\n" + t("Last checked {time}", { time: lastCheckedAt }) : "")
                  }
                  onClick={() => {
                    if (checkingUpdates || busy) return;
                    setCheckingUpdates(true);
                    // Magpie Checking… often <1 frame (shot 87)
                    window.setTimeout(() => {
                      setCheckingUpdates(false);
                      const when = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                      setLastCheckedAt(when);
                      setInstalled((list) => list.map((x) => ({ ...x, checkStatus: "current" as const })));
                      onStatus?.(t("Every plugin is up to date"), "ok", 2800);
                    }, 180);
                  }}>
                  {checkingUpdates ? (
                    <>
                      <span className="spin" aria-hidden />
                      {t("Checking…")}
                    </>
                  ) : (
                    t("Check for updates")
                  )}
                </TextBtn>
              </div>
            </>
          )
        ) : null}
      </div>

      <ActionConfirm
        open={!!removeConfirm}
        titleId="pluginRemoveTitle"
        messageId="pluginRemoveMsg"
       
        title={removeConfirm ? t("Remove {name}?", { name: removeConfirm.name }) : ""}
        message={t("Removes the plugin and what it installed; its sign-ins are kept until you sign out")}
        cancelLabel={t("Cancel")}
        acceptLabel={t("Remove")}
        acceptDisabled={!!busy}
        onCancel={() => {
          /* Escape / Cancel / backdrop — Magpie finish(false); focus back on row Remove */
          const prev = removeFocusRef.current;
          setRemoveConfirm(null);
          requestAnimationFrame(() => {
            if (prev?.isConnected) prev.focus({ preventScroll: true });
            removeFocusRef.current = null;
          });
        }}
        onAccept={() => {
          if (!removeConfirm) return;
          const pkg = removeConfirm.pkg;
          const name = removeConfirm.name;
          setRemoveConfirm(null);
          removeFocusRef.current = null;
          // Magpie 91–103: Removing… under ~125ms / not frozen — empty + toast same step
          setInstalled((list) => list.filter((x) => x.pkg !== pkg));
          onStatus?.(t("{name} removed", { name }), "ok", 3200);
        }}
      />

      <ActionConfirm
        open={!!clearConfirm}
        titleId="pluginClearTitle"
        messageId="pluginClearMsg"
       
        title={t("Clear")}
        message={t("Saved middleware options will be removed. The plugin will run with no options.")}
        cancelLabel={t("Cancel")}
        acceptLabel={t("Clear")}
        onCancel={() => {
          /* Magpie 137: Escape — confirm gone; Options not cleared; editor still open; focus on Clear */
          const prev = clearFocusRef.current;
          setClearConfirm(null);
          requestAnimationFrame(() => {
            if (prev?.isConnected) prev.focus({ preventScroll: true });
          });
        }}
        onAccept={() => {
          if (!clearConfirm) return;
          const pkg = clearConfirm.pkg;
          const example = pkg.includes("think-tags")
            ? '{\n  "mode": "strip"\n}'
            : '{\n  "hooks": ["request", "response"],\n  "onEvent": ["error"]\n}';
          setClearConfirm(null);
          setInstalled((list) =>
            list.map((x) =>
              x.pkg === pkg
                ? { ...x, opts: "", optsSaved: false, optsDraft: example, optsErr: "", optsOpen: true }
                : x,
            ),
          );
        }}
      />

      {pluginDetail ? (
        <div className="modal open" role="dialog" aria-modal="true" aria-label={pluginDetail.name}>
          <div className="backdrop" onClick={() => setPluginDetail(null)} />
          <div className="dialog editor pm-detail">
            <div className="ehead pm-dhead">
              <div className="pm-logo" aria-hidden>◆</div>
              <div className="pm-who">
                <div className="pm-name"><b>{pluginDetail.name}</b></div>
                <div className="pm-by">
                  <span>
                    {"community" in pluginDetail && (pluginDetail as { community?: boolean }).community
                      ? `${t("magpie community")} · ${pluginDetail.pkg}`
                      : "owner" in pluginDetail && (pluginDetail as { owner?: string }).owner
                        ? `${(pluginDetail as { owner: string }).owner} · ${pluginDetail.pkg}`
                        : pluginDetail.pkg}
                  </span>
                </div>
              </div>
              <div className="pm-dact">
                <button
                  type="button"
                  className={pmActClass(pluginDetail.pkg, installed.some((x) => x.pkg === pluginDetail.pkg))}
                  title={
                    busy === pluginDetail.pkg
                      ? t("Plugins run on Bun {v}, downloaded once", { v: BUN_VER })
                      : installed.some((x) => x.pkg === pluginDetail.pkg) && pluginNeedsSignIn(pluginDetail.pkg)
                        ? undefined
                        : installed.some((x) => x.pkg === pluginDetail.pkg)
                          ? undefined
                          : t("Install")
                  }
                  disabled={
                    busy === pluginDetail.pkg ||
                    (installed.some((x) => x.pkg === pluginDetail.pkg) && !pluginNeedsSignIn(pluginDetail.pkg))
                  }
                  onClick={(ev) => {
                    ev.stopPropagation();
                    install(pluginDetail.pkg, pluginDetail.name);
                  }}>
                  {installAct(pluginDetail.pkg, installed.some((x) => x.pkg === pluginDetail.pkg))}
                </button>
              </div>
            </div>
            <div className="pm-dbody">
              <p className="pm-dsum">{pluginDetail.summary}</p>
              <div className="pm-facts">
                <div className="pm-fact"><span className="k">{t("Version")}</span><span className="v">{"ver" in pluginDetail && (pluginDetail as { ver?: string }).ver ? (pluginDetail as { ver: string }).ver : "v0.1.0-demo"}</span></div>
                <div className="pm-fact"><span className="k">{"stars" in pluginDetail && (pluginDetail as { stars?: number }).stars != null ? t("Stars") : t("Downloads")}</span><span className="v">{"stars" in pluginDetail && (pluginDetail as { stars?: number }).stars != null ? (pluginDetail as { stars: number }).stars : pluginDetail.downloads}</span></div>
                <div className="pm-fact"><span className="k">{t("License")}</span><span className="v">MIT</span></div>
                <div className="pm-fact"><span className="k">{t("Updated")}</span><span className="v">{"updated" in pluginDetail && (pluginDetail as { updated?: string }).updated ? (pluginDetail as { updated: string }).updated : "—"}</span></div>
                {pluginSignsInId(pluginDetail.pkg) ? (
                  <div className="pm-fact"><span className="k">{t("Signs in to")}</span><span className="v">{pluginSignsInId(pluginDetail.pkg)}</span></div>
                ) : null}
              </div>
              <div className="pm-links">
                <button
                  type="button"
                  className="pm-link"
                  onClick={() => window.open(`https://www.npmjs.com/package/${pluginDetail.pkg}`, "_blank", "noopener")}>
                  <span>npm</span>
                  <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden>
                    <path d="M9.5 3.5h3v3M12.5 3.5 7.5 8.5M11 9.5v3H3.5V5h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {"owner" in pluginDetail && (pluginDetail as { owner?: string }).owner ? (
                  <button
                    type="button"
                    className="pm-link"
                    onClick={() =>
                      window.open(
                        `https://github.com/${(pluginDetail as { owner: string }).owner}/${pluginDetail.pkg.split("/").pop() || pluginDetail.pkg}`,
                        "_blank",
                        "noopener",
                      )
                    }>
                    <span>GitHub</span>
                    <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden>
                      <path d="M9.5 3.5h3v3M12.5 3.5 7.5 8.5M11 9.5v3H3.5V5h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pm-link"
                    onClick={() => window.open(`https://www.npmjs.com/package/${pluginDetail.pkg}`, "_blank", "noopener")}>
                    <span>{t("Source")}</span>
                    <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden>
                      <path d="M9.5 3.5h3v3M12.5 3.5 7.5 8.5M11 9.5v3H3.5V5h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
              {"unofficial" in pluginDetail && (pluginDetail as { unofficial?: boolean }).unofficial && "owner" in pluginDetail ? (
                <p className="pm-note warn">
                  <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden>
                    <path d="M8 2.3 13 4v3.8c0 3-2.1 5.1-5 5.9-2.9-.8-5-2.9-5-5.9V4z" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                  <span>
                    {t(
                      "Unofficial: {owner} tagged it {topic} on GitHub, and nobody at magpie has reviewed it. It is installed from npm, as its author published it from the repository, and runs with your sign-in or your requests.",
                      { owner: (pluginDetail as { owner: string }).owner, topic: "magpie-plugin" },
                    )}
                  </span>
                </p>
              ) : null}
              <div className="pm-readme">
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
                      "演示详情模态（对照 Magpie Discover 卡片）。Escape 不关闭；点 Close 或遮罩关闭。详情 Install：Getting Bun… → 需登录 toast → Sign in（Provider）。",
                      "Demo detail modal (Magpie Discover card). Escape does not close; Close or backdrop does. Detail Install: Getting Bun… → toast sign-in → Sign in (Provider).",
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="bar">
              <span className="note">
                {t("Plugins are other people's code: they sign in and make the requests, or see them as middleware.")}
              </span>
              <TextBtn onClick={() => setPluginDetail(null)}>
                {t("Close")}
              </TextBtn>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
