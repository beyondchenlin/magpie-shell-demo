import { useEffect, useRef, useState } from "react";
import { GATEWAY_ADDR, ZH } from "../data/mock";

type Wire = { d: string; live?: boolean };

/** Empty routing stage matching official Magpie shot 03-routing.png. */
export function RoutingView() {
  const stageRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const srcRef = useRef<HTMLDivElement>(null);
  const idleRef = useRef<HTMLLIElement>(null);
  const [wires, setWires] = useState<Wire[]>([]);
  const [demoLive, setDemoLive] = useState(false);
  const [flier, setFlier] = useState<{ x: number; y: number; rot: number } | null>(
    null,
  );

  useEffect(() => {
    const draw = () => {
      const stage = stageRef.current;
      const hub = hubRef.current;
      const src = srcRef.current;
      const idle = idleRef.current;
      if (!stage || !hub) return;
      const sr = stage.getBoundingClientRect();
      const hr = hub.getBoundingClientRect();
      const hx = hr.left + hr.width / 2 - sr.left;
      const hy = hr.top + hr.height / 2 - sr.top;
      const next: Wire[] = [];
      if (src) {
        const r = src.getBoundingClientRect();
        const x = r.right - sr.left;
        const y = r.top + r.height / 2 - sr.top;
        next.push({
          d: `M ${x} ${y} C ${x + 36} ${y}, ${hx - 36} ${hy}, ${hx} ${hy}`,
          live: demoLive,
        });
      }
      if (idle) {
        const r = idle.getBoundingClientRect();
        const x = r.left - sr.left;
        const y = r.top + r.height / 2 - sr.top;
        next.push({
          d: `M ${hx} ${hy} C ${hx + 40} ${hy}, ${x - 40} ${y}, ${x} ${y}`,
          live: false,
        });
      }
      setWires(next);
    };
    draw();
    const ro = new ResizeObserver(draw);
    if (stageRef.current) ro.observe(stageRef.current);
    window.addEventListener("resize", draw);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", draw);
    };
  }, [demoLive]);

  // Optional mock flier along first wire when demo live is on
  useEffect(() => {
    if (!demoLive || wires.length === 0) {
      setFlier(null);
      return;
    }
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", wires[0].d);
    const len = path.getTotalLength();
    let t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const u = ((now - t0) / 2200) % 1;
      const pt = path.getPointAtLength(u * len);
      const pt2 = path.getPointAtLength(Math.min(len, u * len + 2));
      const rot = (Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180) / Math.PI;
      setFlier({ x: pt.x, y: pt.y, rot });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [demoLive, wires]);

  return (
    <main className="view" id="view-routing">
      <div className="row-head">
        <span className="label">{ZH.routing}</span>
        <span className="rt-livedot" aria-hidden="true" />
        <span className="note">{ZH.liveAsGateway}</span>
        <span className="grow" />
        <button
          className="text"
          type="button"
          aria-pressed={demoLive}
          title="Demo：模拟飞鸟沿线路移动（非官方网关）"
          onClick={() => setDemoLive((v) => !v)}
        >
          {demoLive ? "停止演示" : "演示飞鸟"}
        </button>
        <button className="text rt-mask" id="rtMask" type="button" aria-pressed="false">
          <span>{ZH.hideAccounts}</span>
        </button>
      </div>

      <section className="rt" id="rt">
        <div className="rt-main">
          <div className="rt-top">
            <div className="rt-what">
              <b>{ZH.waitingRequest}</b>
            </div>
            <p className="rt-mode">{ZH.waitingSay}</p>
          </div>

          <div className="rt-stage" ref={stageRef}>
            <svg className="rt-wires" aria-hidden="true">
              {wires.map((w, i) => (
                <path key={i} d={w.d} className={w.live ? "live" : "rest"} />
              ))}
            </svg>

            <div className="rt-srcs">
              <div
                className="rt-node rt-src"
                ref={srcRef}
                style={{ ["--agent" as string]: "#7c3aed" }}
              >
                <span className="rt-ic">
                  <span className="ic" aria-hidden>
                    <svg viewBox="0 0 20 20" width={22} height={22}>
                      <circle cx="10" cy="10" r="8" fill="var(--accent-soft)" />
                      <circle cx="10" cy="10" r="3.5" fill="var(--accent)" />
                    </svg>
                  </span>
                </span>
                <b>
                  <span style={{ ["--agent" as string]: "#7c3aed" }} />
                  {ZH.yourAgent}
                </b>
                <small />
              </div>
            </div>

            <div className="rt-node rt-hub" ref={hubRef}>
              <svg className="rt-bird" viewBox="0 0 44 44" width={26} height={26} aria-hidden>
                <use href="#bird" />
              </svg>
              <b>magpie</b>
              <small>{GATEWAY_ADDR}</small>
            </div>

            <ol className="rt-accts">
              <li className="idle" ref={idleRef}>
                {ZH.noRequestYet}
              </li>
            </ol>

            <svg className="rt-sky" aria-hidden="true">
              {flier && (
                <g
                  className="rt-flier rt-flier-demo"
                  transform={`translate(${flier.x} ${flier.y}) rotate(${flier.rot})`}
                >
                  <g className="rt-flap">
                    <use href="#bird" width="18" height="18" x="-9" y="-9" />
                  </g>
                </g>
              )}
            </svg>
          </div>

          <div className="rt-foot">
            <p className="rt-cap">{ZH.everyRequest}</p>
            <div className="rt-stats">
              <span>
                <b>0</b>
                <span>{ZH.requests}</span>
              </span>
              <span>
                <b>0</b>
                <span>{ZH.rerouted}</span>
              </span>
              <span className="rt-errs">
                <b>0</b>
                <span>{ZH.errorsAgentSaw}</span>
              </span>
            </div>
          </div>
        </div>
      </section>
      <div className="rt-more" id="rtMore" />
    </main>
  );
}
