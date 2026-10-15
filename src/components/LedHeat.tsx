import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildDemoHeat,
  fmtCost,
  fmtN,
  heatLevels,
  isoDay,
  type HeatDay,
} from "../data/usage-demo";
import { Segs } from "./Segs";
import { t } from "../i18n";

const METRICS = [
  ["tokens", "Tokens"],
  ["calls", "Requests"],
  ["cost", "Cost"],
] as const;

type Metric = "tokens" | "calls" | "cost";

function weekdayNames(): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(undefined, { weekday: "short" }),
  );
}

function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function valueOf(x: HeatDay, m: Metric): number {
  return m === "cost" ? x.cost : m === "calls" ? x.calls : x.tokens;
}

/** Magpie #ledHeat — 53-week contribution grid (demo data). */
export function LedHeat({ show }: { show: boolean }) {
  const data = useMemo(() => buildDemoHeat(), []);
  const [metric, setMetric] = useState<Metric>(() => {
    try {
      const m = localStorage.getItem("magpie.ledHeatMetric");
      if (m === "tokens" || m === "calls" || m === "cost") return m;
    } catch {
      /* ignore */
    }
    return "tokens";
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLElement>(null);
  const [tip, setTip] = useState<{
    day: Date;
    x: HeatDay;
    left: number;
    top: number;
  } | null>(null);
  const atEnd = useRef(true);

  useEffect(() => {
    try {
      localStorage.setItem("magpie.ledHeatMetric", metric);
    } catch {
      /* ignore */
    }
  }, [metric]);

  const days = useMemo(() => {
    const at = new Map(data.days.map((d) => [d.date, d]));
    const first = parseISO(data.from);
    const last = parseISO(data.to);
    const out: { day: Date; x: HeatDay }[] = [];
    for (const d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      const date = isoDay(d);
      const x = at.get(date) || { date, calls: 0, tokens: 0, cost: 0 };
      out.push({ day: new Date(d), x });
    }
    return out;
  }, [data]);

  const lv = useMemo(
    () => heatLevels(days.map(({ x }) => valueOf(x, metric))),
    [days, metric],
  );

  const hasBusy = days.some(({ x }) => x.calls > 0);
  const names = useMemo(() => weekdayNames(), []);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll || !show || !hasBusy) return;
    const keep = () => {
      if (!atEnd.current || scroll.scrollWidth <= scroll.clientWidth) return;
      scroll.scrollLeft = scroll.scrollWidth;
    };
    keep();
    const ro = new ResizeObserver(keep);
    ro.observe(scroll);
    return () => ro.disconnect();
  }, [show, hasBusy, metric, days]);

  if (!show || !hasBusy) return null;

  const weeks = Math.ceil(days.length / 7);
  const labels: { w: number; label: string }[] = [];
  let month = -1;
  days.forEach(({ day }, i) => {
    const w = Math.floor(i / 7);
    const wd = i % 7;
    if (wd === 0 && day.getMonth() !== month) {
      month = day.getMonth();
      if (
        (!labels.length || w - labels[labels.length - 1].w >= 3) &&
        !(w === 0 && day.getDate() > 14) &&
        w < weeks - 1
      ) {
        labels.push({
          w,
          label: day.toLocaleDateString(undefined, { month: "short" }),
        });
      }
    }
  });

  const showTip = (cell: HTMLElement, day: Date, x: HeatDay) => {
    const box = boxRef.current;
    if (!box) return;
    const b = box.getBoundingClientRect();
    const c = cell.getBoundingClientRect();
    // provisional place; refine after paint
    let left = c.left - b.left + c.width / 2 - 60;
    let top = c.top - b.top - 48;
    setTip({ day, x, left: Math.max(6, left), top: Math.max(4, top) });
    requestAnimationFrame(() => {
      const tipEl = tipRef.current;
      if (!tipEl || !boxRef.current) return;
      const bb = boxRef.current.getBoundingClientRect();
      const w = tipEl.offsetWidth;
      const hgt = tipEl.offsetHeight;
      left = Math.max(6, Math.min(bb.width - w - 6, c.left - bb.left + c.width / 2 - w / 2));
      top = c.top - bb.top - hgt - 6;
      if (top < 4) top = c.bottom - bb.top + 6;
      setTip({ day, x, left, top });
    });
  };

  const tipParts = (x: HeatDay) => {
    if (!x.calls) return t("No requests");
    const parts = [
      t("{n} tokens", { n: fmtN(x.tokens) }),
      t(x.calls === 1 ? "{n} request" : "{n} requests", { n: String(x.calls) }),
    ];
    const c = fmtCost(x.cost);
    if (c !== "—") parts.push(c);
    const order = { tokens: 0, calls: 1, cost: 2 }[metric];
    if (order && parts[order]) parts.unshift(...parts.splice(order, 1));
    return parts.join(" · ");
  };

  return (
    <section className="led-heat" id="ledHeat" ref={boxRef}>
      <div className="led-bar">
        <div className="heat-title">
          <b>{t("Usage heatmap")}</b>
          <span>{t("Daily usage over the last 53 weeks")}</span>
        </div>
        <span className="grow" />
        <Segs
          value={metric}
          onChange={(v) => setMetric(v as Metric)}
          items={METRICS.map(([id, en]) => ({ id, label: t(en) }))}
        />
      </div>
      <div
        className="heat-scroll"
        id="ledHeatScroll"
        ref={scrollRef}
        onScroll={() => {
          setTip(null);
          const scroll = scrollRef.current;
          if (!scroll?.clientWidth) return;
          atEnd.current = scroll.scrollLeft >= scroll.scrollWidth - scroll.clientWidth - 2;
        }}>
        <div className="heat-grid" role="img" aria-label={t("Usage heatmap")}>
          {names.map((n, i) => (
            <span key={n + i} className="wd" style={{ gridArea: `${i + 2} / 1` }}>
              {i % 2 ? "" : n}
            </span>
          ))}
          {labels.map(({ w, label }, i) => (
            <span
              key={label + w}
              className="mo"
              style={{
                gridArea: `1 / ${w + 2} / 2 / ${(labels[i + 1]?.w ?? weeks) + 2}`,
              }}>
              {label}
            </span>
          ))}
          {days.map(({ day, x }, i) => {
            const w = Math.floor(i / 7);
            const wd = i % 7;
            const level = lv(valueOf(x, metric));
            return (
              <i
                key={x.date}
                className={`l${level}`}
                data-date={x.date}
                style={{ gridArea: `${wd + 2} / ${w + 2}` }}
                onPointerEnter={(e) => showTip(e.currentTarget, day, x)}
                onPointerLeave={() => setTip(null)}
              />
            );
          })}
        </div>
      </div>
      <div className="heat-foot">
        <span className="sess-legend">
          <span>{t("Less")}</span>
          {[0, 1, 2, 3, 4].map((i) => (
            <i key={i} className={`l${i}`} />
          ))}
          <span>{t("More")}</span>
        </span>
      </div>
      <div
        className="heat-tip"
        id="ledHeatTip"
        ref={tipRef}
        hidden={!tip}
        style={tip ? { left: tip.left, top: tip.top } : undefined}>
        {tip ? (
          <>
            <b>
              {tip.day.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                weekday: "short",
              })}
            </b>
            <span>{tipParts(tip.x)}</span>
          </>
        ) : null}
      </div>
    </section>
  );
}
