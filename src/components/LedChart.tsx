import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildDemoLedTrend,
  fmtCost,
  fmtN,
  type LedTrend,
  type LedTrendCat,
  type LedTrendPart,
  type LedTrendPoint,
} from "../data/usage-demo";
import { t } from "../i18n";

/** Magpie app.js LED_SHOWN L17864 — top categories in chart; rest → Other. */
const LED_SHOWN = 7;

type Metric = "calls" | "tokens" | "cost" | "speed";

function ledValue(m: Metric, x: { calls?: number; tokens?: number; cost?: number }): number {
  if (m === "cost") return +x.cost! || 0;
  if (m === "calls") return +x.calls! || 0;
  return +x.tokens! || 0;
}

function ledPart(m: Metric, x: LedTrendPart | undefined): number {
  if (!x) return 0;
  if (m === "cost") return +x.cost || 0;
  if (m === "calls") return +x.calls || 0;
  return +x.tokens || 0;
}

/** Magpie app.js ledAxis L17923–17928 */
function ledAxis(max: number): number {
  if (!(max > 0)) return 4;
  const e = 10 ** Math.floor(Math.log10(max / 4));
  for (const mul of [1, 2, 2.5, 5, 10]) if (mul * e * 4 >= max) return mul * e * 4;
  return 10 * e * 4;
}

function ledFormat(m: Metric, v: number): string {
  if (m === "cost") return v ? "≈$" + (v >= 1 ? v.toFixed(2) : v.toFixed(4)) : "0";
  if (m === "calls") return String(Math.round(v));
  return fmtN(Math.round(v));
}

function ledFormatLong(m: Metric, v: number): string {
  if (m === "cost") return fmtCost(v) || "—";
  if (m === "calls") return String(Math.round(v));
  return fmtN(Math.round(v));
}

function ledWhen(p: LedTrendPoint, bucket: LedTrend["bucket"]): string {
  const d = new Date(p.time);
  if (bucket === "hour") {
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
}

function ledTick(p: LedTrendPoint, bucket: LedTrend["bucket"]): string {
  const d = new Date(p.time);
  if (bucket === "hour") return String(d.getHours()).padStart(2, "0") + ":00";
  return d.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
}

/** Magpie app.js ledCategories L17932–17936 */
function ledCategories(l: LedTrend, split: string, metric: Metric): { top: (LedTrendCat & { color: string })[] } {
  if (split === "none" || !l.by[split]) {
    return { top: [] };
  }
  const list = (l.by[split] || []).slice().sort((a, b) => ledValue(metric, b) - ledValue(metric, a));
  const top = list.slice(0, LED_SHOWN).map((x, i) => ({ ...x, color: `var(--c${i + 1})` }));
  return { top };
}

type Seg = { key: string; color: string; x: number; y: number; w: number; h: number };
type TipRow = { name: string; color: string; v: number };

/**
 * Magpie Usage `#ledChart` — partial of app.js drawLedColumns L17962–18118.
 * Structure/classes: .led-chart > .plot > svg (.grid/.axis/.hot/.col) + .tip
 * Skipped this tip: day pick (.led-day), speed marks/stems, rank emphasize.
 */
export function LedChart({ metric, split }: { metric: string; split: string }) {
  const l = useMemo(() => buildDemoLedTrend(), []);
  const plotRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<{
    i: number;
    left: number;
    rows: TipRow[];
    total: number;
    when: string;
  } | null>(null);

  const m = (metric === "cost" || metric === "calls" || metric === "tokens" ? metric : "tokens") as Metric;

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const drawn = useMemo(() => {
    const W = size.w;
    const H = size.h;
    const pts = l.series;
    const n = pts.length;
    if (W < 100 || !n || H < 40) return null;

    const { top } = ledCategories(l, split, m);
    const totals = pts.map((p) => ledValue(m, p));
    const max = Math.max(0, ...totals);
    if (!(max > 0)) {
      return { empty: true as const, msg: m === "cost" ? t("No known price for these requests") : t("Nothing in this period") };
    }

    // Magpie measures axis label width via getComputedTextLength; demo approximates.
    const topV = ledAxis(max);
    const sample = ledFormat(m, topV);
    const widest = Math.min(56, Math.max(28, sample.length * 6.2));
    const M = { l: Math.ceil(widest) + 6, r: 6, t: 8, b: 22 };
    const pw = W - M.l - M.r;
    const ph = H - M.t - M.b;
    const slot = pw / n;
    const bw = Math.max(2, Math.min(30, slot * 0.68));
    const Y = (v: number) => M.t + ph - (ph * v) / topV;

    const grids = [0, 1, 2, 3, 4].map((i) => {
      const y = M.t + (ph * i) / 4;
      return { y, lab: ledFormat(m, topV * (1 - i / 4)), labY: y + 3.5 };
    });

    const room = Math.max(2, Math.floor(pw / 62));
    const every = Math.ceil(n / room);
    const ticks = pts
      .map((p, i) => ({ i, p }))
      .filter(({ i }) => i % every === 0)
      .map(({ i, p }) => ({
        x: M.l + slot * (i + 0.5),
        text: ledTick(p, l.bucket),
      }));

    const segs: Seg[] = [];
    pts.forEach((p, i) => {
      const x = M.l + slot * (i + 0.5) - bw / 2;
      let y0 = 0;
      const draw = (key: string, color: string, v: number) => {
        if (!(v > 0)) return;
        const h = Math.max(0.5, Y(y0) - Y(y0 + v));
        segs.push({ key, color, x, y: Y(y0 + v), w: bw, h });
        y0 += v;
      };
      const by = p.by?.[split] || {};
      let stacked = 0;
      for (const c of top) {
        const v = ledPart(m, by[c.id]);
        stacked += v;
        draw(c.id, c.color, v);
      }
      // Magpie: remaining total as Other (var(--faint)). When split=none, whole column is Other;
      // demo uses --c1 so unsplit columns stay readable (Magpie always has a split default).
      const rest = Math.max(0, totals[i] - stacked);
      draw("\0other", top.length ? "var(--faint)" : "var(--c1)", rest);
    });

    return {
      empty: false as const,
      W,
      H,
      M,
      ph,
      slot,
      n,
      grids,
      ticks,
      segs,
      top,
      totals,
      pts,
    };
  }, [size, l, split, m]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawn || drawn.empty) return;
    const g = e.currentTarget;
    const r = g.getBoundingClientRect();
    const { W, M, slot, n, top, totals, pts } = drawn;
    const i = Math.max(0, Math.min(n - 1, Math.floor((((e.clientX - r.left) / r.width) * W - M.l) / slot)));
    const p = pts[i];
    const by = p.by?.[split] || {};
    const rows: TipRow[] = top
      .map((c) => ({ name: c.name || c.id, color: c.color, v: ledPart(m, by[c.id]) }))
      .filter((x) => x.v > 0);
    if (!top.length) {
      rows.push({ name: t("Total"), color: "var(--c1)", v: totals[i] });
    } else {
      const other = Math.max(0, totals[i] - rows.reduce((a, x) => a + x.v, 0));
      if (other > 0) rows.push({ name: t("Other"), color: "var(--faint)", v: other });
    }
    rows.sort((a, b) => b.v - a.v);
    const x = M.l + slot * (i + 0.5);
    const tipW = 180;
    const left = Math.max(0, x + 14 + tipW > W ? x - tipW - 14 : x + 14);
    setHover({ i, left, rows, total: totals[i], when: ledWhen(p, l.bucket) });
  };

  return (
    <div className="led-chart" id="ledChart">
      <div className="plot" ref={plotRef}>
        {drawn?.empty ? (
          <div className="none">{drawn.msg}</div>
        ) : drawn ? (
          <>
            <svg
              viewBox={`0 0 ${drawn.W} ${drawn.H}`}
              role="img"
              aria-label={t("Usage trend")}
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            >
              {drawn.grids.map((g, i) => (
                <g key={i}>
                  <line x1={drawn.M.l} x2={drawn.W - drawn.M.r} y1={g.y} y2={g.y} className="grid" />
                  <text x={drawn.M.l - 6} y={g.labY} textAnchor="end" className="axis">
                    {g.lab}
                  </text>
                </g>
              ))}
              {drawn.ticks.map((tk, i) => (
                <text key={i} x={tk.x} y={drawn.H - 6} textAnchor="middle" className="axis">
                  {tk.text}
                </text>
              ))}
              {hover ? (
                <rect
                  className="hot"
                  x={drawn.M.l + drawn.slot * hover.i}
                  y={drawn.M.t}
                  height={drawn.ph}
                  rx={3}
                  width={drawn.slot}
                />
              ) : null}
              {drawn.segs.map((s, i) => (
                <rect
                  key={i}
                  x={s.x}
                  y={s.y}
                  width={s.w}
                  height={s.h}
                  rx={1}
                  className="col"
                  data-k={s.key}
                  style={{ fill: s.color }}
                />
              ))}
            </svg>
            <div className="tip" hidden={!hover} style={hover ? { left: hover.left } : undefined}>
              {hover ? (
                <>
                  <b>{hover.when}</b>
                  {hover.rows.map((row) => (
                    <div key={row.name + row.color}>
                      <i style={{ background: row.color }} />
                      <span>{row.name}</span>
                      <em>{ledFormatLong(m, row.v)}</em>
                    </div>
                  ))}
                  <div className="sum">
                    <span>{t("Total")}</span>
                    <em>
                      {ledFormatLong(m, hover.total)}
                      {m !== "calls" && drawn.pts[hover.i].calls
                        ? " · " +
                          t(drawn.pts[hover.i].calls === 1 ? "{n} request" : "{n} requests", {
                            n: String(drawn.pts[hover.i].calls),
                          })
                        : ""}
                    </em>
                  </div>
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
