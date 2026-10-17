import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  buildDemoLedTrend,
  fmtCost,
  fmtN,
  ledSpeed,
  ledTTFT,
  type LedTrend,
  type LedTrendCat,
  type LedTrendPart,
  type LedTrendPoint,
} from "../data/usage-demo";
import { t } from "../i18n";

/** Magpie app.js LED_SHOWN L17864 — top categories in chart; rest → Other. */
const LED_SHOWN = 7;

type Metric = "calls" | "tokens" | "cost" | "speed";

function ledValue(m: Metric, x: { calls?: number; tokens?: number; cost?: number; decode_ms?: number; decode_out?: number }): number {
  // Magpie app.js ledValue L17915 — speed uses ledSpeed, not tokens
  if (m === "speed") return ledSpeed(x);
  if (m === "cost") return +x.cost! || 0;
  if (m === "calls") return +x.calls! || 0;
  return +x.tokens! || 0;
}

function ledPart(m: Metric, x: LedTrendPart | undefined): number {
  // Magpie app.js ledPart L17918
  if (!x) return 0;
  if (m === "speed") return ledSpeed(x);
  if (m === "cost") return +x.cost || 0;
  if (m === "calls") return +x.calls || 0;
  return +x.tokens || 0;
}

/** Magpie app.js ledTook L17587 — tip TTFT */
function ledTook(ms = 0): string {
  ms = Math.round(ms) || 0;
  return ms < 1000 ? t("{n} ms", { n: ms }) : t("{n} s", { n: (ms / 1000).toFixed(ms < 10e3 ? 1 : 0) });
}

/** Magpie app.js ledAxis L17923–17928 */
function ledAxis(max: number): number {
  if (!(max > 0)) return 4;
  const e = 10 ** Math.floor(Math.log10(max / 4));
  for (const mul of [1, 2, 2.5, 5, 10]) if (mul * e * 4 >= max) return mul * e * 4;
  return 10 * e * 4;
}

function ledFormat(m: Metric, v: number): string {
  // Magpie app.js ledFormat L17919 — speed axis is bare tok/s number
  if (m === "cost") return v ? "≈$" + (v >= 1 ? v.toFixed(2) : v.toFixed(4)) : "0";
  if (m === "calls" || m === "speed") return String(Math.round(v));
  return fmtN(Math.round(v));
}

function ledFormatLong(m: Metric, v: number): string {
  // Magpie app.js ledFormatLong L17920
  if (m === "speed") return v > 0 ? t("{n} tok/s", { n: fmtN(Math.round(v)) }) : "—";
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

/** Magpie app.js ledGroupSpeed L17890 — demo: measured tok/s only (no floor_n). */
function ledGroupSpeed(x: { decode_ms?: number; decode_out?: number } | undefined): { v: number; text: string; title: string } | null {
  const v = ledSpeed(x);
  if (!v) return null;
  return { v, text: t("{n} tok/s", { n: fmtN(Math.round(v)) }), title: "" };
}

/** Magpie app.js ledRankValue L17915 */
function ledRankValue(m: Metric, x: LedTrendCat): number {
  return m === "speed" ? ledGroupSpeed(x)?.v || 0 : ledValue(m, x);
}

type RankCat = LedTrendCat & { color: string };

/** Magpie app.js ledCategories L17932–17936 */
function ledCategories(l: LedTrend, split: string, metric: Metric): { top: RankCat[]; rest: LedTrendCat[]; list: LedTrendCat[] } {
  if (split === "none" || !l.by[split]) {
    return { top: [], rest: [], list: [] };
  }
  const list = (l.by[split] || []).slice().sort((a, b) => ledRankValue(metric, b) - ledRankValue(metric, a) || b.tokens - a.tokens);
  const top = list.slice(0, LED_SHOWN).map((x, i) => ({ ...x, color: `var(--c${i + 1})` }));
  return { top, rest: list.slice(LED_SHOWN), list };
}

type Seg = {
  kind: "col" | "mark" | "stem";
  key: string;
  color: string;
  day: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** stem second endpoint */
  y2?: number;
  all?: boolean;
};
type TipRow = { name: string; color: string; v: number; ttft?: number };

/**
 * Magpie Usage `#ledChart` — drawLedColumns L17962–18118
 * (+ day-pick L18013–14 / L18062–69 / L18107–18; speed marks/stems L18030–55;
 *  box.emphasize from drawLedRank L18107–17 / L18174–75).
 * Structure: .led-chart > .plot > svg (.grid/.axis/.hot/.col/.mark/.stem/.led-day) + .tip
 */
export function LedChart({
  metric,
  split,
  day = "",
  onChooseDay,
  emphasizeKey = null,
}: {
  metric: string;
  split: string;
  /** Magpie `l.day` / ledDay — YYYY-MM-DD when a column is picked. */
  day?: string;
  /** Magpie `box.chooseDay` — toggle day; omit → chart not selectable. */
  onChooseDay?: (day: string) => void;
  /** Magpie `box.emphasize(key)` from rank hover — dim non-matching `data-k` (app.js L18107–17). */
  emphasizeKey?: string | null;
}) {
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

  const m = (
    metric === "cost" || metric === "calls" || metric === "tokens" || metric === "speed" ? metric : "tokens"
  ) as Metric;
  const speed = m === "speed";
  // Magpie: selectable when bucket===day && chooseDay (app.js L17981)
  const selectable = l.bucket === "day" && !!onChooseDay;

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
    // Magpie L17974–76: speeds don't add; max includes category mark heights
    const max = Math.max(
      0,
      ...totals,
      ...(speed ? pts.flatMap((p) => top.map((c) => ledSpeed(p.by?.[split]?.[c.id]))) : []),
    );
    if (!(max > 0)) {
      return {
        empty: true as const,
        msg:
          m === "cost"
            ? t("No known price for these requests")
            : speed
              ? t("No streamed replies timed in this period")
              : t("Nothing in this period"),
      };
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
      const dayKey = p.time.slice(0, 10);
      const by = p.by?.[split] || {};
      if (speed) {
        // Magpie L18030–55: pill track at point speed + per-category marks (+ stems above track)
        let y0 = 0;
        if (totals[i] > 0) {
          const h = Math.max(0.5, Y(y0) - Y(y0 + totals[i]));
          segs.push({
            kind: "col",
            key: "\0all",
            color: "var(--pill)",
            day: dayKey,
            x,
            y: Y(y0 + totals[i]),
            w: bw,
            h,
            all: true,
          });
        }
        for (const c of top) {
          const v = ledSpeed(by[c.id]);
          if (!(v > 0)) continue;
          if (v > totals[i]) {
            const topY = Y(totals[i]);
            segs.push({
              kind: "stem",
              key: c.id,
              color: c.color,
              day: dayKey,
              x: x + bw / 2,
              y: topY,
              w: 0,
              h: 0,
              y2: Math.min(Y(v) + 1.5, topY),
            });
          }
          segs.push({
            kind: "mark",
            key: c.id,
            color: c.color,
            day: dayKey,
            x,
            y: Y(v) - 1.5,
            w: bw,
            h: 3,
          });
        }
        return;
      }
      let y0 = 0;
      const draw = (key: string, color: string, v: number) => {
        if (!(v > 0)) return;
        const h = Math.max(0.5, Y(y0) - Y(y0 + v));
        segs.push({ kind: "col", key, color, day: dayKey, x, y: Y(y0 + v), w: bw, h });
        y0 += v;
      };
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

    // Magpie L18013: selected day index for persistent .hot
    const selected = day ? pts.findIndex((p) => p.time.slice(0, 10) === day) : -1;

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
      selected,
      selectable,
      speed,
    };
  }, [size, l, split, m, day, selectable, speed]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawn || drawn.empty) return;
    const g = e.currentTarget;
    const r = g.getBoundingClientRect();
    const { W, M, slot, n, top, totals, pts, speed: isSpeed } = drawn;
    const i = Math.max(0, Math.min(n - 1, Math.floor((((e.clientX - r.left) / r.width) * W - M.l) / slot)));
    const p = pts[i];
    const by = p.by?.[split] || {};
    const rows: TipRow[] = top
      .map((c) => ({
        name: c.name || c.id,
        color: c.color,
        v: ledPart(m, by[c.id]),
        ttft: isSpeed ? ledTTFT(by[c.id]) : undefined,
      }))
      .filter((x) => x.v > 0);
    // Magpie L18084–85: speed tip has no "Other" stack remainder
    if (!isSpeed) {
      if (!top.length) {
        rows.push({ name: t("Total"), color: "var(--c1)", v: totals[i] });
      } else {
        const other = Math.max(0, totals[i] - rows.reduce((a, x) => a + x.v, 0));
        if (other > 0) rows.push({ name: t("Other"), color: "var(--faint)", v: other });
      }
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
              role={drawn.selectable ? "group" : "img"}
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
              {/* Magpie L18013–14: selected day keeps a .hot under the columns */}
              {drawn.selectable && drawn.selected >= 0 ? (
                <rect
                  className="hot"
                  x={drawn.M.l + drawn.slot * drawn.selected}
                  y={drawn.M.t}
                  height={drawn.ph}
                  rx={3}
                  width={drawn.slot}
                />
              ) : null}
              {drawn.segs.map((s, i) => {
                // Magpie box.emphasize L18107–17: dimDay → faint fill; day|key miss → opacity .22
                const dimDay = !!(day && s.day !== day);
                const dimKey = emphasizeKey != null && s.key !== emphasizeKey;
                const color = dimDay ? "var(--faint)" : s.color;
                const opacity = dimDay || dimKey ? 0.22 : undefined;
                if (s.kind === "stem") {
                  return (
                    <line
                      key={i}
                      x1={s.x}
                      x2={s.x}
                      y1={s.y}
                      y2={s.y2}
                      className="col stem"
                      data-k={s.key}
                      data-day={s.day}
                      data-color={s.color}
                      style={{ stroke: color, strokeWidth: 1, strokeOpacity: 0.45, opacity }}
                    />
                  );
                }
                return (
                  <rect
                    key={i}
                    x={s.x}
                    y={s.y}
                    width={s.w}
                    height={s.h}
                    rx={s.kind === "mark" ? 1.5 : 1}
                    className={s.all ? "col all" : s.kind === "mark" ? "col mark" : "col"}
                    data-k={s.key}
                    data-day={s.day}
                    data-color={s.color}
                    style={{ fill: color, opacity }}
                  />
                );
              })}
              {/* Magpie L18062–69: transparent .led-day hit targets */}
              {drawn.selectable
                ? drawn.pts.map((p, i) => {
                    const d = p.time.slice(0, 10);
                    return (
                      <rect
                        key={"day-" + d}
                        className="led-day"
                        x={drawn.M.l + drawn.slot * i}
                        y={drawn.M.t}
                        width={drawn.slot}
                        height={drawn.ph}
                        fill="transparent"
                        role="button"
                        tabIndex={0}
                        aria-label={ledWhen(p, l.bucket)}
                        aria-pressed={d === day}
                        data-day={d}
                        onClick={() => onChooseDay?.(d)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onChooseDay?.(d);
                          }
                        }}
                      />
                    );
                  })
                : null}
            </svg>
            <div className="tip" hidden={!hover} style={hover ? { left: hover.left } : undefined}>
              {hover ? (
                <>
                  <b>{hover.when}</b>
                  {hover.rows.map((row) => (
                    <div key={row.name + row.color}>
                      <i style={{ background: row.color }} />
                      <span>{row.name}</span>
                      <em>
                        {ledFormatLong(m, row.v)}
                        {speed && row.ttft
                          ? " · " + t("TTFT {ms}", { ms: ledTook(row.ttft) })
                          : ""}
                      </em>
                    </div>
                  ))}
                  <div className="sum">
                    <span>{t(speed ? "All" : "Total")}</span>
                    <em>
                      {ledFormatLong(m, hover.total)}
                      {speed && ledTTFT(drawn.pts[hover.i])
                        ? " · " + t("TTFT {ms}", { ms: ledTook(ledTTFT(drawn.pts[hover.i])) })
                        : ""}
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

/**
 * Magpie Usage `#ledRank` + `#ledRail` — drawLedRank L18126–18189,
 * ledRankEdges L18193–18206, ledRail L18209–18229
 * (+ hover → chart.emphasize L18174–75; click → choose filter L18327–39).
 * Structure: .led-rank > button.rk[.on|.plain] > .rk-a / .rk-bar / .rk-b
 *            + sibling .led-rail#ledRail > i (custom scrollbar)
 */
export function LedRank({
  metric,
  split,
  picked = "",
  onChoose,
  onEmphasize,
}: {
  metric: string;
  split: string;
  /** Magpie `picked` — filter id currently listed (provider / agent / model). */
  picked?: string;
  /** Magpie `choose(x)` — toggle that category in the Requests list. */
  onChoose?: (id: string) => void;
  /** Magpie `box.chart?.emphasize?.(id|null)` on rank pointer enter/leave. */
  onEmphasize?: (id: string | null) => void;
}) {
  const l = useMemo(() => buildDemoLedTrend(), []);
  const boxRef = useRef<HTMLDivElement>(null);
  const m = (
    metric === "cost" || metric === "calls" || metric === "tokens" || metric === "speed" ? metric : "tokens"
  ) as Metric;

  const { top, rest, list } = useMemo(() => ledCategories(l, split, m), [l, split, m]);

  const railRef = useRef<HTMLDivElement>(null);

  // Magpie ledRankEdges L18193–18206 + ledRail L18209–18229
  // — fade edges; custom #ledRail thumb tracks scroll / drag / rail click
  // useLayoutEffect: avoid paint flash; do not put `hidden` in JSX (React would
  // re-apply it on picked/metric re-renders and stick the rail closed).
  useLayoutEffect(() => {
    const box = boxRef.current;
    const rail = railRef.current;
    if (!box || !rail) return;

    const sync = () => {
      const end = box.scrollHeight - box.clientHeight;
      box.classList.toggle("more-above", end > 1 && box.scrollTop > 1);
      box.classList.toggle("more-below", end > 1 && box.scrollTop < end - 1);
      rail.hidden = !(end > 1) || !box.offsetParent;
      if (rail.hidden) return;
      const h = box.clientHeight;
      const thumb = Math.max(24, (h * h) / box.scrollHeight);
      const tip = rail.firstElementChild as HTMLElement | null;
      rail.style.top = box.offsetTop + "px";
      rail.style.height = h + "px";
      if (tip) {
        tip.style.height = thumb + "px";
        tip.style.transform = `translateY(${((h - thumb) * box.scrollTop) / end}px)`;
      }
    };

    // Magpie ledRail — thumb drag + click-on-rail jumps
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const end = box.scrollHeight - box.clientHeight;
      const thumbEl = rail.firstElementChild as HTMLElement | null;
      if (!thumbEl) return;
      const thumb = thumbEl.offsetHeight;
      const room = rail.clientHeight - thumb;
      if (end <= 0 || room <= 0) return;
      if (e.target !== thumbEl) {
        const y = e.clientY - rail.getBoundingClientRect().top - thumb / 2;
        box.scrollTop = (Math.max(0, Math.min(room, y)) / room) * end;
      }
      const y0 = e.clientY;
      const top0 = box.scrollTop;
      rail.setPointerCapture(e.pointerId);
      rail.classList.add("drag");
      const onMove = (m: PointerEvent) => {
        box.scrollTop = top0 + ((m.clientY - y0) / room) * end;
      };
      const onUp = () => {
        rail.classList.remove("drag");
        rail.removeEventListener("pointermove", onMove);
        rail.removeEventListener("pointerup", onUp);
        rail.removeEventListener("pointercancel", onUp);
      };
      rail.addEventListener("pointermove", onMove);
      rail.addEventListener("pointerup", onUp);
      rail.addEventListener("pointercancel", onUp);
    };
    rail.addEventListener("pointerdown", onPointerDown);

    sync();
    box.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(box);
    return () => {
      box.removeEventListener("scroll", sync);
      rail.removeEventListener("pointerdown", onPointerDown);
      ro.disconnect();
    };
  }, [top, rest, list.length]);

  const railEl = (
    <div className="led-rail" id="ledRail" ref={railRef}>
      <i />
    </div>
  );

  if (!list.length) {
    return (
      <Fragment>
        <div className="led-rank" id="ledRank" ref={boxRef} />
        {railEl}
      </Fragment>
    );
  }

  const sum = list.reduce((a, x) => a + ledValue(m, x), 0) || 1;
  const leader = Math.max(1, ledRankValue(m, top[0]));

  const one = (x: LedTrendCat & { color?: string }, color: string, plain: boolean) => {
    const v = ledRankValue(m, x);
    const gs = ledGroupSpeed(x);
    const on = !!(picked && picked === x.id);
    const more: ReactNode[] = [];
    if (m !== "calls") more.push(t(x.calls === 1 ? "{n} request" : "{n} requests", { n: fmtN(x.calls) }));
    if (m !== "tokens") more.push(t("{n} tokens", { n: fmtN(x.tokens) }));
    if (m !== "cost" && x.cost) more.push(fmtCost(x.cost));
    if (m !== "speed" && gs) {
      more.push(
        <span key="spd" className="rk-speed" title={gs.title || undefined}>
          {gs.text}
        </span>,
      );
    }
    if (m !== "speed") more.push(Math.round((100 * v) / sum) + "%");

    return (
      <button
        key={x.id}
        type="button"
        className={"rk" + (plain ? " plain" : "") + (on ? " on" : "")}
        onClick={plain ? undefined : () => onChoose?.(x.id)}
        onPointerEnter={plain ? undefined : () => onEmphasize?.(x.id)}
        onPointerLeave={plain ? undefined : () => onEmphasize?.(null)}
      >
        <div className="rk-a">
          <i className="rk-sw" style={{ background: color }} />
          <span className="rk-nm" title={t(x.name || x.id || "")}>
            {t(x.name || x.id || "—")}
          </span>
          <span className="rk-val" title={m === "speed" && gs?.title ? gs.title : undefined}>
            {m === "speed" ? gs?.text || "—" : ledFormatLong(m, v)}
          </span>
        </div>
        <div className="rk-bar">
          <i style={{ width: Math.max(1.5, (100 * v) / leader).toFixed(1) + "%", background: color }} />
        </div>
        <div className="rk-b">
          {more.map((part, i) => (
            <span key={i}>
              {i ? " · " : null}
              {part}
            </span>
          ))}
        </div>
      </button>
    );
  };

  let other: (LedTrendCat & { color?: string }) | null = null;
  if (rest.length) {
    const tot = rest.reduce(
      (acc, x) => {
        acc.calls += x.calls || 0;
        acc.tokens += x.tokens || 0;
        acc.cost += x.cost || 0;
        acc.decode_out = (acc.decode_out || 0) + (x.decode_out || 0);
        acc.decode_ms = (acc.decode_ms || 0) + (x.decode_ms || 0);
        return acc;
      },
      {
        id: "\0other",
        name: t("Other ({n})", { n: rest.length }),
        calls: 0,
        tokens: 0,
        cost: 0,
        decode_out: 0,
        decode_ms: 0,
      } as LedTrendCat,
    );
    other = tot;
  }

  return (
    <Fragment>
      <div className="led-rank" id="ledRank" ref={boxRef}>
        {top.map((x) => one(x, x.color, false))}
        {other ? one(other, "var(--faint)", true) : null}
      </div>
      {railEl}
    </Fragment>
  );
}
