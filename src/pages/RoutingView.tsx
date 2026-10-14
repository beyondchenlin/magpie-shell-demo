import { useEffect, useRef, useState } from "react";
import { AGENTS, PROVIDERS, ROUTING_STATS } from "../data/mock";
import { Bird } from "../components/Bird";

type Wire = { d: string; live?: boolean };

export function RoutingView() {
  const stageRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const srcRefs = useRef<(HTMLDivElement | null)[]>([]);
  const acctRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [activeAgent, setActiveAgent] = useState(AGENTS[0]?.id ?? "");
  const [activeAcct, setActiveAcct] = useState(PROVIDERS.filter((p) => p.on)[0]?.id ?? "");
  const [mask, setMask] = useState(false);
  const [strategy, setStrategy] = useState<"smart" | "order" | "weight">("smart");

  const onProviders = PROVIDERS.filter((p) => p.on);

  const strategyText =
    strategy === "smart"
      ? "智能：按能力与可用性选账号，失败时改道。"
      : strategy === "order"
        ? "顺序：按列表从上到下尝试，直到有人接住。"
        : "权重：按权重抽选，失败时改道。";

  useEffect(() => {
    const draw = () => {
      const stage = stageRef.current;
      const hub = hubRef.current;
      if (!stage || !hub) return;
      const sr = stage.getBoundingClientRect();
      const hr = hub.getBoundingClientRect();
      const hx = hr.left + hr.width / 2 - sr.left;
      const hy = hr.top + hr.height / 2 - sr.top;
      const next: Wire[] = [];
      srcRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = r.right - sr.left;
        const y = r.top + r.height / 2 - sr.top;
        const live = AGENTS[i]?.id === activeAgent;
        next.push({
          d: `M ${x} ${y} C ${x + 28} ${y}, ${hx - 28} ${hy}, ${hx} ${hy}`,
          live,
        });
      });
      acctRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = r.left - sr.left;
        const y = r.top + r.height / 2 - sr.top;
        const live = onProviders[i]?.id === activeAcct;
        next.push({
          d: `M ${hx} ${hy} C ${hx + 36} ${hy}, ${x - 36} ${y}, ${x} ${y}`,
          live,
        });
      });
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
  }, [activeAgent, activeAcct, onProviders.length, mask]);

  return (
    <main className="view" id="view-routing">
      <div className="row-head">
        <span className="label">路由</span>
        <span className="rt-livedot" aria-hidden="true" />
        <span className="note">实时 · 网关正在做的决定</span>
        <span className="grow" />
        <button className="text rt-newgroup" id="rtNewGroup" type="button">
          <svg viewBox="0 0 16 16" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M8 3.5v9M3.5 8h9" />
          </svg>
          <span>新建组</span>
        </button>
        <button
          className="text rt-mask"
          id="rtMask"
          type="button"
          aria-pressed={mask}
          onClick={() => setMask((v) => !v)}
        >
          <span>账号打码</span>
        </button>
      </div>

      <section className="rt" id="rt">
        <div className="rt-main">
          <div className="rt-top">
            <div className="rt-what">
              当前策略：
              <b>
                {strategy === "smart" ? "智能" : strategy === "order" ? "顺序" : "权重"}
              </b>
              <span className="segs" style={{ display: "inline-flex", marginLeft: 10 }}>
                {(
                  [
                    ["smart", "智能"],
                    ["order", "顺序"],
                    ["weight", "权重"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={strategy === id ? "on" : ""}
                    onClick={() => setStrategy(id)}
                  >
                    {label}
                  </button>
                ))}
              </span>
            </div>
            <p className="rt-mode">{strategyText}</p>
          </div>

          <div className="rt-stage" ref={stageRef}>
            <svg className="rt-wires" aria-hidden="true">
              {wires.map((w, i) => (
                <path key={i} d={w.d} className={w.live ? "live" : "rest"} />
              ))}
            </svg>

            <div className="rt-srcs">
              {AGENTS.map((a, i) => (
                <div
                  key={a.id}
                  className={`rt-node rt-src${activeAgent === a.id ? " tick" : ""}`}
                  ref={(el) => {
                    srcRefs.current[i] = el;
                  }}
                  style={{ ["--agent" as string]: a.color, cursor: "pointer" }}
                  onClick={() => setActiveAgent(a.id)}
                >
                  <span className="rt-ic">
                    <span className="ic">
                      <img src={a.icon} alt="" />
                    </span>
                  </span>
                  <b>
                    <span style={{ ["--agent" as string]: a.color }} />
                    {a.name}
                  </b>
                  <small>{a.model}</small>
                </div>
              ))}
            </div>

            <div className="rt-node rt-hub" ref={hubRef}>
              <span className="rt-bird" style={{ color: "var(--fg)" }}>
                <Bird size={26} />
              </span>
              <b>magpie</b>
              <small>本地网关</small>
              <i>live</i>
            </div>

            <ol className="rt-accts">
              {onProviders.map((p, i) => (
                <li
                  key={p.id}
                  className={activeAcct === p.id ? "on" : ""}
                  ref={(el) => {
                    acctRefs.current[i] = el;
                  }}
                  onClick={() => setActiveAcct(p.id)}
                  style={{ cursor: "pointer" }}
                >
                  <span className="dot" style={{ width: 8, height: 8, borderRadius: 99, background: activeAcct === p.id ? "var(--accent)" : "var(--line)" }} />
                  <b>
                    <span className="ic">
                      <img src={p.icon} alt="" />
                    </span>
                    <span className="who">{p.name}</span>
                    <span>
                      {" "}
                      · {mask ? "••••••" : p.account}
                    </span>
                  </b>
                  <i className="fb" style={{ fontStyle: "normal" }}>
                    {p.models} 模型
                  </i>
                </li>
              ))}
            </ol>
          </div>

          <div className="rt-foot">
            <p className="rt-cap">
              从任一经 magpie 的 Agent 发一条请求，这里会按网关决定播放：谁被排在第一、为何、每次尝试与回答。
            </p>
            <div className="rt-stats">
              <span>
                <b>{ROUTING_STATS.requests}</b>
                <span>请求</span>
              </span>
              <span>
                <b>{ROUTING_STATS.rerouted}</b>
                <span>改道</span>
              </span>
              <span className="rt-errs">
                <b>{ROUTING_STATS.errors}</b>
                <span>Agent 收到的错误</span>
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
