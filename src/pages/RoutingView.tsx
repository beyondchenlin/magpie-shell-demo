import { useEffect, useRef, useState, type ReactNode } from "react";
import { ModelPop } from "../components/ModelPop";
import { GATEWAY_ADDR } from "../data/mock";
import { ZH, t } from "../i18n";

type Wire = { d: string; live?: boolean };

const EYE =
  "M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8-10-8-10-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z";
const EYE_OFF =
  "M9.9 4.2A10.4 10.4 0 0 1 12 4c6.5 0 10 8 10 8a17.6 17.6 0 0 1-2.2 3.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20";

const MASK_KEY = "magpie.maskEmails";

function readMasked(): boolean {
  try {
    return localStorage.getItem(MASK_KEY) === "1";
  } catch {
    return false;
  }
}

/** Empty routing stage matching official Magpie R-00…R-09. */
export function RoutingView() {
  const stageRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const srcRef = useRef<HTMLDivElement>(null);
  const idleRef = useRef<HTMLLIElement>(null);
  const maskTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [wires, setWires] = useState<Wire[]>([]);
  /** Explicit demo-only control (not Magpie Live UI on empty). */
  const [demoLive, setDemoLive] = useState(false);
  const [demoTurn, setDemoTurn] = useState(0);
  const [flier, setFlier] = useState<{ x: number; y: number; rot: number } | null>(
    null,
  );
  const [masked, setMasked] = useState(readMasked);
  const [masking, setMasking] = useState(false);
  const [demoGroups, setDemoGroups] = useState(true);
  const [groupModel, setGroupModel] = useState("claude-sonnet-4-5");
  const [popOpen, setPopOpen] = useState(false);
  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const [condOpen, setCondOpen] = useState(false);
  const [bySession, setBySession] = useState(() => {
    try {
      return localStorage.getItem("magpie.routingBySession") === "1";
    } catch {
      return false;
    }
  });
  const [closedSessions, setClosedSessions] = useState<Set<string>>(() => new Set());
  const [pickedReq, setPickedReq] = useState<string | null>(null);

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

  useEffect(() => {
    return () => {
      if (maskTimer.current) clearTimeout(maskTimer.current);
    };
  }, []);

  const toggleMask = () => {
    const next = !masked;
    setMasked(next);
    try {
      localStorage.setItem(MASK_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    setMasking(true);
    if (maskTimer.current) clearTimeout(maskTimer.current);
    maskTimer.current = setTimeout(() => setMasking(false), 450);
  };

  const viewClass = [
    "view",
    masked ? "masked" : "",
    masking ? "masking" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={viewClass} id="view-routing">
      <div className="row-head">
        <span className="label">{ZH.routing}</span>
        <span className="rt-livedot" aria-hidden="true" />
        <span className="note">{ZH.liveAsGateway}</span>
        <span className="grow" />
        <button
          className="text"
          type="button"
          aria-pressed={demoLive}
          title={ZH.demoFlierTitle}
          onClick={() => {
            setDemoLive((v) => {
              const next = !v;
              if (next) setDemoTurn((n) => n + 1);
              return next;
            });
          }}
        >
          {demoLive ? ZH.demoFlierOn : ZH.demoFlierOff}
        </button>
        <button
          className="text rt-mask"
          id="rtMask"
          type="button"
          aria-pressed={masked}
          title={masked ? ZH.unmaskAccountsTitle : ZH.maskAccountsTitle}
          onClick={toggleMask}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={masked ? EYE_OFF : EYE} />
          </svg>
          <span data-t>{masked ? ZH.accountsHidden : ZH.hideAccounts}</span>
        </button>
      </div>

      <section className="rt" id="rt">
        <div className="rt-main">
          <div className="rt-top">
            <div className="rt-what">
              <b>{demoLive ? t("Demo request · affinity kept") : ZH.waitingRequest}</b>
              {demoLive ? <span className="rt-livedot on" aria-hidden="true" style={{ marginLeft: 8 }} /> : null}
            </div>
            <p className="rt-mode">
              {demoLive
                ? t("Tried Anthropic first · then OpenAI") +
                  (demoTurn ? ` · turn ${demoTurn}` : "")
                : ZH.waitingSay}
            </p>
            {demoLive ? (
              <p className="rt-req-head note" style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--muted)" }}>
                {t("A live request would fly here")}
                {" · "}
                claude-sonnet-4-5 → Anthropic
              </p>
            ) : null}
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
              {demoLive ? (
                <>
                  <li className="on" ref={idleRef} style={{ ["--agent" as string]: "#d97706" }}>
                    <span className="dot" />
                    <span className="nm">Anthropic · work@…</span>
                    <span className="bar" style={{ width: "72%" }} />
                  </li>
                  <li style={{ ["--agent" as string]: "#10a37f" }}>
                    <span className="dot" />
                    <span className="nm">OpenAI · sk-…demo</span>
                    <span className="bar" style={{ width: "28%" }} />
                  </li>
                </>
              ) : (
                <li className="idle" ref={idleRef}>
                  {ZH.noRequestYet}
                </li>
              )}
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
                <b>{demoLive ? String(Math.max(1, demoTurn)) : "0"}</b>
                <span>{ZH.requests}</span>
              </span>
              <span>
                <b>{demoLive ? "1" : "0"}</b>
                <span>{ZH.rerouted}</span>
              </span>
              <span
                className="rt-errs"
                aria-disabled={!demoLive}
                title={ZH.noFailedRequest}
              >
                <b>0</b>
                <span>{ZH.errorsAgentSaw}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Magpie gateway trace list — By request / By session */}
      <div className="rt-hist" style={{ marginTop: 10 }}>
        <div className="row-head rt-req-head">
          <span className="label">{t("Requests")}</span>
          <span className="note" style={{ marginLeft: 8 }}>
            {demoLive ? t("A live request would fly here") : t("Waiting for a request")}
          </span>
          <span className="grow" />
          <div className="rt-group-by" style={{ display: demoLive ? "inline-flex" : "none", gap: 4 }}>
            <button
              type="button"
              className={`rt-day${!bySession ? " on" : ""}`}
              aria-pressed={!bySession}
              onClick={() => {
                setBySession(false);
                try { localStorage.setItem("magpie.routingBySession", "0"); } catch { /* ignore */ }
              }}
            >
              {t("By request")}
            </button>
            <button
              type="button"
              className={`rt-day${bySession ? " on" : ""}`}
              aria-pressed={bySession}
              onClick={() => {
                setBySession(true);
                try { localStorage.setItem("magpie.routingBySession", "1"); } catch { /* ignore */ }
              }}
            >
              {t("By session")}
            </button>
          </div>
        </div>
        <div className={`list rt-reqs${demoLive ? "" : " none"}`} id="rtReqs">
          {(() => {
            type Req = {
              id: string;
              at: string;
              agent: string;
              model: string;
              to: string;
              tokens: string;
              ms: string;
              ok: boolean;
              moved: boolean;
              wait: boolean;
              session: string;
              folder?: string;
              title?: string;
            };
            const rows: Req[] = demoLive
              ? [
                  { id: "q1", at: "12:18:04", agent: "Claude Code", model: "claude-sonnet-4-5", to: "Anthropic", tokens: "14.2K", ms: "4.1s", ok: true, moved: false, wait: false, session: "sess-claude-a", folder: "~/code/magpie", title: "Wire Agents #pop" },
                  { id: "q1b", at: "12:17:40", agent: "Claude Code", model: "claude-haiku-4", to: "Anthropic", tokens: "2.0K", ms: "0.9s", ok: true, moved: false, wait: false, session: "sess-claude-a", folder: "~/code/magpie", title: "Wire Agents #pop" },
                  { id: "q2", at: "12:14:22", agent: "Codex", model: "gpt-5", to: "OpenAI", tokens: "6.8K", ms: "2.4s", ok: true, moved: true, wait: false, session: "sess-codex-b", folder: "~/code/demo", title: "Replay failover" },
                  { id: "q3", at: "12:09:51", agent: "Claude Code", model: "claude-haiku-4", to: "Anthropic", tokens: "1.1K", ms: "0.8s", ok: false, moved: false, wait: false, session: "sess-claude-c", title: "Quick ask" },
                  { id: "q4", at: "12:02:10", agent: "OpenCode", model: "claude-sonnet-4-5", to: "…", tokens: "—", ms: "…", ok: true, moved: false, wait: true, session: "sess-oc-d", folder: "/tmp" },
                ]
              : [];

            const renderReq = (r: Req) => (
              <button
                key={r.id}
                type="button"
                className={`rt-req${r.ok === false ? " bad" : ""}${r.moved ? " moved" : ""}${r.wait ? " wait" : ""}`}
                aria-pressed={pickedReq === r.id}
                style={{ animation: "fade-in .2s var(--ease)" }}
                onClick={() => {
                  setPickedReq(r.id);
                  setDemoTurn((n) => n + 1);
                }}
              >
                <span className="at">{r.at}</span>
                <span className="asked">
                  <i className="ag" aria-hidden />
                  <span className="m">{r.agent}</span>
                  <code className="mdl">{r.model}</code>
                </span>
                <span className="to">
                  <i aria-hidden />
                  <span className="said">
                    <span className="who">{r.to}</span>
                  </span>
                  {r.moved ? <span className="swap">{t("failover")}</span> : null}
                </span>
                <span className="meta">
                  <span className="tokens">{r.tokens}</span>
                  <span>·</span>
                  <span>{r.ms}</span>
                </span>
              </button>
            );

            if (!demoLive) {
              return (
                <div className="empty-state" style={{ padding: "14px 8px", color: "var(--muted)", fontSize: 12.5 }}>
                  <b style={{ display: "block", marginBottom: 4, color: "var(--fg-2)" }}>
                    {t("No requests since magpie started")}
                  </b>
                  {t("Each request an agent sends through magpie shows up here: who answered it, why, and each try.")}
                </div>
              );
            }

            if (!bySession) return rows.map(renderReq);

            const groups = new Map<string, Req[]>();
            for (const r of rows) {
              const k = r.session || "";
              if (!groups.has(k)) groups.set(k, []);
              groups.get(k)!.push(r);
            }
            const out: ReactNode[] = [];
            for (const [key, g] of groups) {
              const open = !closedSessions.has(key);
              const head = g[0];
              const nm = [head.agent, head.folder, head.title || key].filter(Boolean).join(" · ");
              out.push(
                <button
                  key={"s-" + key}
                  type="button"
                  className="rt-session"
                  aria-expanded={open}
                  onClick={() => {
                    setClosedSessions((prev) => {
                      const n = new Set(prev);
                      if (n.has(key)) n.delete(key);
                      else n.add(key);
                      return n;
                    });
                  }}
                  style={{ animation: "fade-in .18s var(--ease)" }}
                >
                  <span className="arrow" aria-hidden>
                    {open ? "▾" : "▸"}
                  </span>
                  <span className="nm" title={`${t("Session id")}: ${key}`}>
                    {nm}
                  </span>
                  <span className="summary">
                    <span className="session-count">
                      {t(g.length === 1 ? "{n} request" : "{n} requests", { n: g.length })}
                    </span>
                    {g.some((x) => x.wait) ? (
                      <span> · {t("{n} in progress", { n: g.filter((x) => x.wait).length })}</span>
                    ) : null}
                  </span>
                </button>,
              );
              if (open) out.push(...g.map(renderReq));
            }
            return out;
          })()}
        </div>
      </div>

      {/* Magpie #rtMore — demo groups / model pick / conditions (v0.1.16) */}
      <div className="rt-more" id="rtMore">
        <div className="row-head" style={{ marginTop: 8 }}>
          <span className="label">{t("Routing groups")}</span>
          <span className="grow" />
          <button type="button" className="text" aria-pressed={demoGroups} onClick={() => setDemoGroups((d) => !d)}>
            {demoGroups ? t("Hide demo") : t("Show demo")}
          </button>
        </div>
        {demoGroups ? (
          <div className="rt-groups">
            <div className="rt-group card">
              <div className="rt-ghead">
                <b>{t("Default")}</b>
                <span className="grow" />
                <button
                  type="button"
                  className="sess-pick set"
                  ref={modelBtnRef}
                  aria-haspopup="listbox"
                  aria-expanded={popOpen}
                  onClick={() => setPopOpen((o) => !o)}
                >
                  <span>{groupModel}</span>
                  <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden>
                    <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
                <ModelPop
                  open={popOpen}
                  anchor={modelBtnRef.current}
                  value={groupModel}
                  modelPicker
                  options={[
                    { value: "claude-sonnet-4-5", label: "claude-sonnet-4-5", group: "Anthropic" },
                    { value: "claude-haiku-4-5", label: "claude-haiku-4-5", group: "Anthropic" },
                    { value: "gpt-5", label: "gpt-5", group: "OpenAI" },
                    { value: "gemini-2.5-pro", label: "gemini-2.5-pro", group: "Google" },
                  ]}
                  onPick={(v) => {
                    setGroupModel(v);
                    setPopOpen(false);
                  }}
                  onClose={() => setPopOpen(false)}
                />
              </div>
              <button
                type="button"
                className={`fold text${condOpen ? " open" : ""}`}
                aria-expanded={condOpen}
                onClick={() => setCondOpen((o) => !o)}
              >
                <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden>
                  <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                {t("Conditions")}
              </button>
              {condOpen ? (
                <div className="rt-conds" style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="row pref" style={{ padding: "6px 8px" }}>
                    <div className="who">
                      <div className="name">{t("When agent is")}</div>
                      <div className="sub">Claude Code · Codex</div>
                    </div>
                    <button type="button" className="text">{t("Edit")}</button>
                  </div>
                  <div className="row pref" style={{ padding: "6px 8px" }}>
                    <div className="who">
                      <div className="name">{t("When model matches")}</div>
                      <div className="sub">*sonnet* · gpt-*</div>
                    </div>
                    <button type="button" className="text">{t("Edit")}</button>
                  </div>
                  <button type="button" className="text" style={{ alignSelf: "flex-start" }}>
                    + {t("Condition")}
                  </button>
                </div>
              ) : null}
            </div>
            <div className="rt-group card muted">
              <div className="rt-ghead">
                <b>{t("Fallback")}</b>
                <span className="grow" />
                <span style={{ fontSize: 12, color: "var(--muted)" }}>ollama / llama3.2</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
