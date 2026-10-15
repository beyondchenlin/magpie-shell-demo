import { useEffect, useRef, useState, type ReactNode } from "react";
import { GroupEditor, type SavedGroupDraft } from "../components/GroupEditor";
import { ModelPop } from "../components/ModelPop";
import { Segs } from "../components/Segs";
import { ProtoMultiMenu } from "../components/ProtoMultiMenu";
import { GATEWAY_ADDR } from "../data/mock";
import { ZH, t } from "../i18n";

type Wire = { d: string; live?: boolean };

const EYE =
  "M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8-10-8-10-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z";
const EYE_OFF =
  "M9.9 4.2A10.4 10.4 0 0 1 12 4c6.5 0 10 8 10 8a17.6 17.6 0 0 1-2.2 3.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20";

const MASK_KEY = "magpie.maskEmails";
const METRICS_KEY = "magpie.routingMetrics";

const METRIC_OPTS: [string, string][] = [
  ["duration", "Duration"],
  ["ttft", "First token"],
  ["tokens", "Tokens"],
  ["cache", "Cache hit rate"],
  ["speed", "Output speed"],
  ["cost", "Cost"],
];

const DEMO_DAYS: { day: string; label: string; requests: number }[] = [
  { day: "2026-10-14", label: "Tue", requests: 28 },
  { day: "2026-10-13", label: "Mon", requests: 41 },
  { day: "2026-10-12", label: "Sun", requests: 9 },
  { day: "2026-10-11", label: "Sat", requests: 3 },
  { day: "2026-10-10", label: "Fri", requests: 52 },
  { day: "2026-10-09", label: "Thu", requests: 17 },
];

/** Mock gateway-trace steps per demo request id (routing.js renderSteps shape). */
const TRACE_STEPS: Record<string, { cls: string; text: string }[]> = {
  q1: [
    { cls: "why", text: "Claude Code asked for claude-sonnet-4-5" },
    { cls: "aside", text: "affinity kept · Anthropic first" },
    { cls: "ok", text: "Anthropic · ada@… answered in 4.1 s · 14.2K tokens" },
  ],
  q1b: [
    { cls: "why", text: "Compaction · Claude Code" },
    { cls: "ok", text: "Anthropic · ada@… answered in 0.9 s" },
  ],
  q2: [
    { cls: "why", text: "Codex asked for gpt-5" },
    { cls: "bad", text: "Anthropic · 429 · rate limited" },
    { cls: "swap", text: "failover → OpenAI · sk-…7a" },
    { cls: "ok", text: "OpenAI answered in 2.4 s · 6.8K tokens" },
  ],
  q3: [
    { cls: "why", text: "Thread title · Claude Code" },
    { cls: "bad", text: "Anthropic · 500 · passed error to agent" },
  ],
  q4: [
    { cls: "why", text: "Web search · OpenCode" },
    { cls: "wait", text: "answering…" },
  ],
};

/** Demo purpose ids → Magpie purposeOptions labels */
const PURPOSE_NAMES: Record<string, string> = {
  unmarked: "Unmarked",
  "kind:compact": "Compaction",
  "kind:thread_title": "Thread title",
  "kind:web_search": "Web search",
  "kind:guardian": "Guardian",
  "kind:memory_consolidation": "Memory",
  "kind:collab_spawn": "Subagent",
};

function loadMetrics(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(METRICS_KEY) || "null");
    if (Array.isArray(saved)) {
      const keys = METRIC_OPTS.map(([k]) => k);
      const filtered = keys.filter((k) => saved.includes(k));
      return filtered.length ? filtered : keys;
    }
  } catch { /* */ }
  return METRIC_OPTS.map(([k]) => k);
}


const GROUP_TEMPLATES: { title: string; desc: string }[] = [
  {
    title: "Hard to strong, easy to cheap",
    desc: "A hard task goes to the strongest model, an easy one and compaction to a cheap one.",
  },
  {
    title: "Cheap first",
    desc: "A cheap model first; the strongest for high reasoning, or when the cheap ones fail.",
  },
  {
    title: "Never stuck",
    desc: "The strongest model of each provider, each behind the other: one down doesn't stop the agent.",
  },
];

const CHEV = "M3 4.5 6 7.5 9 4.5";
const CROSS = "M3.5 3.5 8.5 8.5M8.5 3.5 3.5 8.5";


function readMasked(): boolean {
  try {
    const v = localStorage.getItem(MASK_KEY);
    if (v === null) return true; // Magpie default / native left: Accounts hidden
    return v === "1";
  } catch {
    return true;
  }
}

/** Demo: templates need a provider (native shots 23–24 = Add a provider first). */
function demoHasProviders(): boolean {
  try {
    return localStorage.getItem("magpie.demoProviders") === "1";
  } catch {
    return false;
  }
}

function readPeerServes(): boolean {
  try {
    const q = new URLSearchParams(location.search).get("rtPeer");
    if (q === "0") return false;
    if (q === "1") return true;
    const ls = localStorage.getItem("magpie.routingPeerServes");
    if (ls === "0") return false;
    if (ls === "1") return true;
    // NOTES responsive 05/09: another magpie serves the gateway (take-over not clicked)
    return true;
  } catch {
    return true;
  }
}

/** Empty routing stage matching official Magpie R-00…R-09. */
export function RoutingView({ onStatus }: { onStatus?: (msg: string, kind?: string) => void } = {}) {
  /** tray/20: panel's Open Routing opens a window that does not hold the gateway. */
  const [peerServes] = useState(readPeerServes);
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
  /** Magpie groups.found (shot 01-empty-live): Find groups on their own */
  const [foundOn, setFoundOn] = useState(true);
  /** Magpie suffixSegs: Off | Not on names I set | On */
  const [nameSuffix, setNameSuffix] = useState<"off" | "skip" | "on">("on");
  const [groupEditorOpen, setGroupEditorOpen] = useState(false);
  const [savedGroups, setSavedGroups] = useState<SavedGroupDraft[]>([]);
  const [gImportOpen, setGImportOpen] = useState(false);
  const [importPaste, setImportPaste] = useState("");
  const [importNote, setImportNote] = useState("");
  const [templateSeed, setTemplateSeed] = useState<{ name: string; memberIds: string[] } | null>(null);
  const [editGroup, setEditGroup] = useState<SavedGroupDraft | null>(null);
  const [tplMenuOpen, setTplMenuOpen] = useState(false);
  const tplBtnRef = useRef<HTMLButtonElement>(null);

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
  const [purposes, setPurposes] = useState<string[]>([]);
  const [purposeOpen, setPurposeOpen] = useState(false);
  const purposeBtnRef = useRef<HTMLButtonElement>(null);
  const [visibleMetrics, setVisibleMetrics] = useState<string[]>(loadMetrics);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const metricsBtnRef = useRef<HTMLButtonElement>(null);
  const [actBusy, setActBusy] = useState(false);
  const [foldedKeys, setFoldedKeys] = useState<Set<string>>(() => new Set());
  /** "" = Live (gateway now); else YYYY-MM-DD from day bar */
  const [histDay, setHistDay] = useState("");
  const [earlierOpen, setEarlierOpen] = useState(false);
  const earlierBtnRef = useRef<HTMLButtonElement>(null);
  const [replaying, setReplaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [replayFrac, setReplayFrac] = useState(0);
  const [replayClock, setReplayClock] = useState("12:02:10.0");
  const replayRaf = useRef(0);

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
      const u = ((now - t0) / 1400) % 1; // Magpie fly() outbound hop ~1400ms
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

  // Replay mock clock — Magpie rp-clock / rp-head (routing.js step/replayBar)
  useEffect(() => {
    if (!replaying || !demoLive) {
      if (replayRaf.current) cancelAnimationFrame(replayRaf.current);
      return;
    }
    let t0 = performance.now();
    let last = t0;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 250) * replaySpeed;
      last = now;
      setReplayFrac((f) => {
        const next = f + dt / 8000;
        if (next >= 1) {
          setReplaying(false);
          return 1;
        }
        return next;
      });
      const base = new Date("2026-10-15T12:02:10");
      base.setMilliseconds(base.getMilliseconds() + (now - t0) * replaySpeed);
      const hh = String(base.getHours()).padStart(2, "0");
      const mm = String(base.getMinutes()).padStart(2, "0");
      const ss = String(base.getSeconds()).padStart(2, "0");
      const tenths = Math.floor(base.getMilliseconds() / 100);
      setReplayClock(`${hh}:${mm}:${ss}.${tenths}`);
      replayRaf.current = requestAnimationFrame(tick);
    };
    replayRaf.current = requestAnimationFrame(tick);
    return () => {
      if (replayRaf.current) cancelAnimationFrame(replayRaf.current);
    };
  }, [replaying, replaySpeed, demoLive]);

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

  // tray/20 + routing NOTES: another process holds the gateway — only the peer card
  if (peerServes) {
    return (
      <main className={viewClass} id="view-routing">
        <div className="row-head">
          <span className="label">{ZH.routing}</span>
          <span className="rt-livedot on" aria-hidden="true" />
          <span className="note">{t("live, as the gateway decides")}</span>
          <span className="grow" />
          <button
            className="text rt-mask"
            id="rtMask"
            type="button"
            aria-pressed={masked}
            title={masked
              ? t("Accounts are masked for a screenshot — click to show them")
              : t("Mask the accounts on this page — email addresses and account names — for a screenshot to share")}
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
            <span data-t>{masked ? t("Accounts hidden") : t("Hide accounts")}</span>
          </button>
        </div>
        <section className="rt" id="rt">
          <p className="pr-none rt-peer">
            {t("Another magpie serves the gateway; its routing plays live in that magpie's window.")}
          </p>
        </section>
      </main>
    );
  }

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
          className="text rt-newgroup"
          id="rtNewGroup"
          type="button"
          data-feature="groups"
          title={t("Make a routing group of any models you like — agents pick it as one model")}
          onClick={() => {
            setFoundOn(true);
            setGroupEditorOpen(true);
            setDemoGroups(true);
          }}
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M8 3.5v9M3.5 8h9" />
          </svg>
          <span data-t>{t("New group")}</span>
        </button>
        <button
          className="text rt-mask"
          id="rtMask"
          type="button"
          aria-pressed={masked}
          title={masked
            ? t("Accounts are masked for a screenshot — click to show them")
            : t("Mask the accounts on this page — email addresses and account names — for a screenshot to share")}
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
          <span data-t>{masked ? t("Accounts hidden") : t("Hide accounts")}</span>
        </button>
      </div>

      <section className="rt" id="rt">
        <div className="rt-main">
          <div className="rt-top">
            <div className="rt-what">
              <b>{demoLive ? t("Demo request · affinity kept") : t("Waiting for a request")}</b>
              {demoLive ? <span className="rt-livedot on" aria-hidden="true" style={{ marginLeft: 8 }} /> : null}
            </div>
            <p className="rt-mode">
              {demoLive
                ? t("Tried Anthropic first · then OpenAI") +
                  (demoTurn ? ` · turn ${demoTurn}` : "")
                : t(
                  "Send one from any agent routed through magpie and it plays here as it happens: who routing put first and why, each try, and what each answered.",
                )}
            </p>
            {demoLive ? (
              <p className="rt-req-head note" style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--muted)" }}>
                {t("A live request would fly here")}
                {" · "}
                claude-sonnet-4-5 → Anthropic
              </p>
            ) : null}
          </div>

          {replaying && demoLive ? (
            <div className="rt-replay" id="rtReplay" style={{ animation: "fade-in .2s var(--ease)" }}>
              <div className="rp-top">
                <span className="rp-tag">{t("Replaying")}</span>
                <b className="rp-clock">{replayClock}</b>
                <small className="rp-day">{histDay ? histDay : t("today")}</small>
                <span className="rp-skip">
                  {replaySpeed > 2 ? t("skipping a quiet stretch · clock {n}×", { n: replaySpeed }) : ""}
                </span>
                <span className="grow" />
                <button
                  type="button"
                  className="text"
                  onClick={() => setReplaySpeed((s) => (s >= 8 ? 1 : s * 2))}
                >
                  {t("{n}× speed", { n: replaySpeed })}
                </button>
                <button
                  type="button"
                  className="text"
                  onClick={() => {
                    setReplaying(false);
                    setReplayFrac(0);
                  }}
                >
                  {t("Stop replay")}
                </button>
              </div>
              <div className="rp-what">
                <div className={`rp-req${replayFrac > 0.05 ? " on" : ""}`}>
                  <span className="rp-n">{t("request {i} of {n}", { i: Math.min(5, Math.max(1, Math.ceil(replayFrac * 5))), n: 5 })}</span>
                  <i className="ag" style={{ ["--agent" as string]: "#7c3aed" }} />
                  <b>Claude Code</b>
                  <code className="mdl">claude-sonnet-4-5</code>
                  <span className="rp-to">→ Anthropic · ada@…</span>
                  <span className="rp-at">{t("sent {time}", { time: "12:18:04" })}</span>
                </div>
              </div>
              <div
                className="rp-track"
                role="slider"
                aria-valuenow={Math.round(replayFrac * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                onClick={(e) => {
                  const b = e.currentTarget.getBoundingClientRect();
                  setReplayFrac(Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)));
                }}
              >
                {[0.12, 0.28, 0.45, 0.7, 0.88].map((m, i) => (
                  <i
                    key={i}
                    className={`rp-mark${Math.abs(replayFrac - m) < 0.08 || (replayFrac >= m && replayFrac < m + 0.12) ? " on" : ""}`}
                    style={{ left: `${m * 100}%`, ["--agent" as string]: i % 2 ? "#10a37f" : "#7c3aed" }}
                  />
                ))}
                <i className="rp-head" style={{ left: `${replayFrac * 100}%` }} />
              </div>
            </div>
          ) : null}

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
                  className="rt-flier rt-flier-demo req"
                  transform={`translate(${flier.x} ${flier.y}) rotate(${flier.rot})`}
                >
                  {/* Magpie FLIER (routing.js): wings beat rtflap .42s from shoulder */}
                  <g className="rt-lift">
                    <g transform="scale(1.2) translate(-6.5 3.2)">
                      <path
                        className="wing far"
                        d="M-14.5 -3.4C-16.5 -9.5 -14.2 -15 -8.6 -18.6C-9.4 -12.6 -9.6 -7.4 -9.2 -3.2Z"
                      />
                      <path className="tail" d="M-31.5 3.1L-18.6 -1.8L-17.4 1.2L-30.8 4.6Z" />
                      <ellipse className="body" cx="-12.2" cy="-1.4" rx="7.6" ry="3.9" />
                      <ellipse className="belly" cx="-12.8" cy="0.4" rx="4.3" ry="1.6" />
                      <circle className="body" cx="-4.9" cy="-3.7" r="3.1" />
                      <path className="body" d="M-2.3 -4.8L1.4 -3.3L-2.3 -2.2Z" />
                      <g className="wing near">
                        <path d="M-15.6 -3.2C-17.8 -10.2 -15.2 -16.4 -8.4 -20.4C-9.3 -13.6 -9.4 -7.8 -8.8 -2.8Z" />
                        <path className="bar" d="M-14.6 -5.6C-15.4 -10.4 -13.8 -14.4 -10.4 -17.2" />
                      </g>
                    </g>
                  </g>
                </g>
              )}
            </svg>
          </div>

          <div className="rt-foot">
            <p className="rt-cap">{t("Every request an agent sends to magpie shows up here, routed for real.")}</p>
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

          {/* Gateway trace story — Magpie .rt-log / .rt-steps */}
          {demoLive && (pickedReq || replaying) ? (
            <div className="rt-log" id="rtLog" style={{ animation: "fade-in .2s var(--ease)" }}>
              <div className="rt-log-head">
                <span>
                  {t("How the request at {time} was routed", {
                    time: pickedReq === "q2" ? "12:14:22" : pickedReq === "q3" ? "12:09:51" : pickedReq === "q4" ? "12:02:10" : pickedReq === "q1b" ? "12:17:40" : "12:18:04",
                  })}
                </span>
                <span className="grow" />
                {!replaying && pickedReq ? (
                  <>
                    <button type="button" className="text" title={t("View usage")}>
                      {t("View usage")}
                    </button>
                    <button
                      type="button"
                      className="text"
                      onClick={() => {
                        setReplayFrac(0);
                        setReplaying(true);
                      }}
                    >
                      {t("Replay")}
                    </button>
                    <button
                      type="button"
                      className="text"
                      onClick={() => {
                        setPickedReq(null);
                        setHistDay("");
                      }}
                    >
                      {t("Back to live")}
                    </button>
                  </>
                ) : null}
              </div>
              <ol className="rt-steps">
                {(TRACE_STEPS[pickedReq || "q1"] || TRACE_STEPS.q1).map((s, i) => (
                  <li key={i} className={s.cls}>{s.text}</li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      </section>

      {/* Magpie gateway trace — Purpose/Metrics menus + Accounts column (v0.1.21) */}
      <div className={`rt-cols${demoLive ? " min1150" : " solo"}`} id="rtHist" style={{ marginTop: 10 }}>
        <div className="rt-col" id="rtColA">
          <div className="row-head rt-req-head">
            <span className="label">{t("Requests")}</span>
            <span className="grow" />
            <span className="note" hidden={!demoLive}>
              {demoLive ? (histDay ? t("kept for {day}", { day: histDay }) : t("the last {n} the gateway keeps", { n: 5 })) : null}
            </span>
            <div className={`rt-purpose-tools${purposes.length ? " set" : ""}`} hidden={!demoLive}>
              <button
                type="button"
                className={`text rt-purpose${purposeOpen ? " open" : ""}`}
                id="rtPurpose"
                ref={purposeBtnRef}
                aria-haspopup="menu"
                aria-expanded={purposeOpen}
                title={
                  t("Filter routing by purpose") +
                  (purposes.length
                    ? "\n" + t("Purpose: {name}", { name: purposes.map((p) => t(PURPOSE_NAMES[p] || p)).join(", ") })
                    : "")
                }
                aria-label={
                  purposes.length
                    ? t("Purpose: {name}", { name: purposes.map((p) => t(PURPOSE_NAMES[p] || p)).join(", ") })
                    : t("Purpose filter")
                }
                onClick={(e) => {
                  e.stopPropagation();
                  setMetricsOpen(false);
                  setPurposeOpen((o) => !o);
                }}
              >
                <span>
                  {purposes.length
                    ? t("Purpose: {name}", { name: purposes.map((p) => t(PURPOSE_NAMES[p] || p)).join(", ") })
                    : t("Purpose filter")}
                </span>
                <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden>
                  <path d={CHEV} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                className="text rt-purpose-clear"
                id="rtPurposeClear"
                hidden={!purposes.length}
                title={t("Clear filter")}
                aria-label={t("Clear filter")}
                onClick={() => {
                  setPurposes([]);
                  setPurposeOpen(false);
                  purposeBtnRef.current?.focus({ preventScroll: true });
                }}
              >
                <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden>
                  <path d={CROSS} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              className={`text rt-metric-pick${metricsOpen ? " open" : ""}`}
              id="rtMetrics"
              ref={metricsBtnRef}
              hidden={!demoLive}
              aria-haspopup="menu"
              aria-expanded={metricsOpen}
              title={t("Metrics to show")}
              onClick={(e) => {
                e.stopPropagation();
                setPurposeOpen(false);
                setMetricsOpen((o) => !o);
              }}
            >
              <span>{t("Metrics")}</span>
              <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden>
                <path d={CHEV} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              className="text"
              id="rtReplayAll"
              hidden={!demoLive}
              style={{ display: demoLive ? undefined : "none" }}
              onClick={() => {
                if (!demoLive) return;
                setReplayFrac(0);
                setReplaying(true);
              }}
            >
              {t("Replay them all")}
            </button>
            {purposeOpen ? (
              <ProtoMultiMenu
                open
                anchor={purposeBtnRef.current}
                value={purposes}
                live
                hideHead
                menuClass="rt-purpose-menu"
                head="Purpose"
                options={[
                  { v: "", name: t("All purposes"), literalName: true, note: "" },
                  ...Object.keys(PURPOSE_NAMES).map((id) => ({
                    v: id,
                    name: t(PURPOSE_NAMES[id]),
                    literalName: true,
                    note: id === "unmarked"
                      ? t("No purpose was recorded; this may be a conversation turn or an older record.")
                      : "",
                    title: id,
                  })),
                ]}
                onChange={(keys) => setPurposes(Array.isArray(keys) ? keys : [])}
                onClose={() => setPurposeOpen(false)}
              />
            ) : null}
            {metricsOpen ? (
              <ProtoMultiMenu
                open
                anchor={metricsBtnRef.current}
                value={visibleMetrics}
                live
                menuClass="rt-metric-menu"
                head="Metrics to show"
                options={METRIC_OPTS.map(([v, name]) => ({ v, name, note: "" }))}
                onChange={(keys) => {
                  const next = Array.isArray(keys) ? keys : [];
                  setVisibleMetrics(next);
                  try { localStorage.setItem(METRICS_KEY, JSON.stringify(next)); } catch { /* */ }
                }}
                onClose={() => setMetricsOpen(false)}
              />
            ) : null}
          </div>

          <div className="rt-filters" hidden={!demoLive} style={{ display: demoLive ? "flex" : "none", marginBottom: 6, alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div className="rt-days" style={{ flex: 1, minWidth: 0 }}>
              <button
                type="button"
                className={`rt-day${!histDay ? " on" : ""}`}
                aria-pressed={!histDay}
                onClick={() => {
                  setHistDay("");
                  setReplaying(false);
                }}
              >
                <span>{t("Live")}</span>
              </button>
              {DEMO_DAYS.slice(0, 4).map((d) => (
                <button
                  key={d.day}
                  type="button"
                  className={`rt-day${histDay === d.day ? " on" : ""}`}
                  aria-pressed={histDay === d.day}
                  onClick={() => {
                    setHistDay(d.day);
                    setReplaying(false);
                    setPickedReq(null);
                  }}
                >
                  <span>{d.label}</span>
                  <small>{d.requests}</small>
                </button>
              ))}
              <button
                type="button"
                className={`rt-day rt-day-more${earlierOpen ? " open" : ""}${DEMO_DAYS.slice(4).some((d) => d.day === histDay) ? " on" : ""}`}
                ref={earlierBtnRef}
                aria-haspopup="menu"
                aria-expanded={earlierOpen}
                aria-pressed={DEMO_DAYS.slice(4).some((d) => d.day === histDay)}
                onClick={(e) => {
                  e.stopPropagation();
                  setEarlierOpen((o) => !o);
                }}
              >
                <span>
                  {DEMO_DAYS.slice(4).find((d) => d.day === histDay)?.label || t("Earlier days")}
                </span>
                {DEMO_DAYS.slice(4).find((d) => d.day === histDay) ? (
                  <small>{DEMO_DAYS.slice(4).find((d) => d.day === histDay)!.requests}</small>
                ) : null}
                <svg viewBox="0 0 12 12" width={10} height={10} aria-hidden>
                  <path d={CHEV} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
              {earlierOpen ? (
                <ProtoMultiMenu
                  open
                  anchor={earlierBtnRef.current}
                  value={histDay}
                  live={false}
                  hideHead
                  menuClass="rt-days-menu"
                  head="Earlier days"
                  options={DEMO_DAYS.slice(4).map((d) => ({
                    v: d.day,
                    name: d.label,
                    literalName: true,
                    note: String(d.requests),
                  }))}
                  onChange={(v) => {
                    const day = typeof v === "string" ? v : (v[0] || "");
                    setHistDay(day);
                    setEarlierOpen(false);
                    setReplaying(false);
                  }}
                  onClose={() => setEarlierOpen(false)}
                />
              ) : null}
            </div>
            <div className="rt-group-by" style={{ display: "inline-flex", gap: 4 }}>
              <button
                type="button"
                className={`rt-day${!bySession ? " on" : ""}`}
                aria-pressed={!bySession}
                onClick={() => {
                  setBySession(false);
                  try { localStorage.setItem("magpie.routingBySession", "0"); } catch { /* */ }
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
                  try { localStorage.setItem("magpie.routingBySession", "1"); } catch { /* */ }
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
                ttft?: string;
                cache?: string;
                speed?: string;
                cost?: string;
                ok: boolean;
                moved: boolean;
                wait: boolean;
                session: string;
                purpose: string;
                folder?: string;
                title?: string;
              };
              const rows: Req[] = demoLive
                ? [
                    { id: "q1", at: "12:18:04", agent: "Claude Code", model: "claude-sonnet-4-5", to: "Anthropic · ada@…", tokens: "14.2K", ms: "4.1s", ttft: "380 ms", cache: "72%", speed: "42 tok/s", cost: "$0.042", ok: true, moved: false, wait: false, session: "sess-claude-a", purpose: "unmarked", folder: "~/code/magpie", title: "Wire Agents #pop" },
                    { id: "q1b", at: "12:17:40", agent: "Claude Code", model: "claude-haiku-4", to: "Anthropic · ada@…", tokens: "2.0K", ms: "0.9s", ttft: "120 ms", cache: "91%", speed: "88 tok/s", cost: "$0.003", ok: true, moved: false, wait: false, session: "sess-claude-a", purpose: "kind:compact", folder: "~/code/magpie", title: "Wire Agents #pop" },
                    { id: "q2", at: "12:14:22", agent: "Codex", model: "gpt-5", to: "OpenAI · sk-…7a", tokens: "6.8K", ms: "2.4s", ttft: "510 ms", cache: "40%", speed: "55 tok/s", cost: "$0.018", ok: true, moved: true, wait: false, session: "sess-codex-b", purpose: "unmarked", folder: "~/code/demo", title: "Replay failover" },
                    { id: "q3", at: "12:09:51", agent: "Claude Code", model: "claude-haiku-4", to: "Anthropic · ada@…", tokens: "1.1K", ms: "0.8s", ttft: "90 ms", ok: false, moved: false, wait: false, session: "sess-claude-c", purpose: "kind:thread_title", title: "Quick ask" },
                    { id: "q4", at: "12:02:10", agent: "OpenCode", model: "claude-sonnet-4-5", to: "…", tokens: "—", ms: "…", ok: true, moved: false, wait: true, session: "sess-oc-d", purpose: "kind:web_search", folder: "/tmp" },
                  ]
                : [];

              const filtered = purposes.length
                ? rows.filter((r) => purposes.includes(r.purpose))
                : rows;

              const metricBits = (r: Req) => {
                const bits: ReactNode[] = [];
                if (visibleMetrics.includes("duration") && r.ms && r.ms !== "…") {
                  bits.push(
                    <span key="duration" className="rt-metric duration" title={t("Duration")}>
                      <span className="v">{r.ms}</span>
                    </span>,
                  );
                }
                if (visibleMetrics.includes("ttft") && r.ttft) {
                  bits.push(
                    <span key="ttft" className="rt-metric ttft" title={t("First token")}>
                      <span className="k">{t("First token")}</span>
                      <span className="v">{r.ttft}</span>
                    </span>,
                  );
                }
                if (visibleMetrics.includes("tokens") && r.tokens && r.tokens !== "—") {
                  bits.push(
                    <span key="tokens" className="rt-metric tokens" title={t("Tokens")}>
                      <span className="v">{r.tokens}</span>
                      <span className="k">{t("tokens")}</span>
                    </span>,
                  );
                }
                if (visibleMetrics.includes("cache") && r.cache) {
                  bits.push(
                    <span key="cache" className="rt-metric cache-hit" title={t("Cache hit rate")}>
                      <span className="k">{t("Cache")}</span>
                      <span className="v">{r.cache}</span>
                    </span>,
                  );
                }
                if (visibleMetrics.includes("speed") && r.speed) {
                  bits.push(
                    <span key="speed" className="rt-metric speed" title={t("Output speed")}>
                      <span className="v">{r.speed}</span>
                    </span>,
                  );
                }
                if (visibleMetrics.includes("cost") && r.cost) {
                  bits.push(
                    <span key="cost" className="rt-metric cost-metric" title={t("Cost")}>
                      <span className="v cost">{r.cost}</span>
                    </span>,
                  );
                }
                return bits;
              };

              const renderReq = (r: Req) => (
                <button
                  key={r.id}
                  type="button"
                  className={`rt-req${r.ok === false ? " bad" : ""}${r.moved ? " moved" : ""}${r.wait ? " wait" : ""}${pickedReq === r.id ? " on" : ""}`}
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
                    {r.purpose !== "unmarked" ? (
                      <span className="kind" title={r.purpose}>{t(PURPOSE_NAMES[r.purpose] || r.purpose)}</span>
                    ) : null}
                  </span>
                  <span className="to">
                    <i aria-hidden />
                    <span className="said">
                      <span className="who">{r.to}</span>
                    </span>
                    {r.moved ? <span className="swap">{t("failover")}</span> : null}
                  </span>
                  <span className="meta">{metricBits(r)}</span>
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

              if (!filtered.length) {
                return (
                  <div className="empty-state" style={{ padding: "14px 8px", color: "var(--muted)", fontSize: 12.5 }}>
                    <b style={{ display: "block", marginBottom: 4, color: "var(--fg-2)" }}>
                      {purposes.length ? t("No requests match these filters.") : t("No requests since magpie started")}
                    </b>
                    {t("Each request an agent sends through magpie shows up here: who answered it, why, and each try.")}
                  </div>
                );
              }

              if (!bySession) return filtered.map(renderReq);

              const groups = new Map<string, Req[]>();
              for (const r of filtered) {
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

        {/* Accounts and keys column — Magpie colB / renderActs */}
        <div className="rt-col" id="rtColB" hidden={!demoLive} style={{ display: demoLive ? "flex" : "none", flexDirection: "column" }}>
          <div className="row-head">
            <span className="label">{t("Accounts and keys")}</span>
            <button
              type="button"
              className={`rt-read${actBusy ? " busy" : ""}`}
              id="rtReadAllowances"
              title={t("Read the accounts' allowances again")}
              aria-label={t("Refresh now")}
              aria-busy={actBusy}
              onClick={() => {
                if (actBusy) return;
                setActBusy(true);
                window.setTimeout(() => setActBusy(false), 700);
              }}
            >
              <svg viewBox="0 0 16 16" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" />
              </svg>
            </button>
            <span className="grow" />
            <span className="note">{t("over those requests")}</span>
          </div>
          <div className="list rt-acts" id="rtActs">
            {demoLive ? (
              <>
                <div className="rt-prov">
                  <span className="ic" aria-hidden>◆</span>
                  <b>Anthropic</b>
                  <span className="rt-go">{t("Smart")}</span>
                </div>
                <div className="rt-act" title="anthropic/ada" style={{ animation: "rtin .4s ease-out" }}>
                  <div className="nm">
                    <b>ada@example.com</b>
                    <span>Pro</span>
                  </div>
                  <div className="st">{t("{n} used · renews in {d}", { n: "38%", d: t("{n} h", { n: 4 }) })} · {t("as of {time}", { time: "12:18" })}</div>
                  <div className="wins">
                    <span>5h · 38%</span>
                    <span>weekly · 22%</span>
                  </div>
                  <div className="tally">
                    <span>{t("tried {n}", { n: 3 })}</span>
                    <span className="ok">{t("answered {n}", { n: 2 })}</span>
                    <span className="bad">1 {t("error")}</span>
                    <span>{t("last answered {time}", { time: "12:18" })}</span>
                  </div>
                  <div className="mdls">
                    <code className="mdl">claude-sonnet-4-5</code>
                    <code className="mdl">claude-haiku-4</code>
                  </div>
                  <div className="bar"><i style={{ width: "38%" }} /></div>
                </div>
                <div className="rt-prov">
                  <span className="ic" aria-hidden>◇</span>
                  <b>OpenAI</b>
                  <span>{t("Smart")}</span>
                </div>
                <div
                  className={`rt-act rt-keys${foldedKeys.has("openai/*") ? " open" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-expanded={foldedKeys.has("openai/*")}
                  onClick={() => {
                    setFoldedKeys((prev) => {
                      const n = new Set(prev);
                      if (n.has("openai/*")) n.delete("openai/*");
                      else n.add("openai/*");
                      return n;
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).click();
                    }
                  }}
                >
                  <div className="nm">
                    <b>{t("{n} keys", { n: 2 })}</b>
                    <span>{t("API key")}</span>
                    <span className="chev" aria-hidden>▾</span>
                  </div>
                  <div className="tally">
                    <span>{t("tried {n}", { n: 1 })}</span>
                    <span className="ok">{t("answered {n}", { n: 1 })}</span>
                  </div>
                </div>
                {foldedKeys.has("openai/*") ? (
                  <div className="rt-act" title="openai/sk-demo" style={{ animation: "fade-in .18s var(--ease)" }}>
                    <div className="nm">
                      <b>sk-…7a</b>
                      <span>{t("API key")}</span>
                    </div>
                    <div className="st">{t("what's left not known yet")}</div>
                    <div className="tally">
                      <span>{t("tried {n}", { n: 1 })}</span>
                      <span className="ok">{t("answered {n}", { n: 1 })}</span>
                    </div>
                    <div className="mdls">
                      <code className="mdl">gpt-5</code>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Magpie renderPools — Several accounts or keys (when pools exist) */}
      {demoLive ? (
        <div className="rt-pools" style={{ margin: "8px 0 4px" }}>
          <div className="row-head" style={{ padding: "4px 4px 8px" }}>
            <span className="label">{t("Several accounts or keys")}</span>
            <span className="grow" />
            <span className="note">{t("each provider routes over its own")}</span>
          </div>
          <div className="rt-pool card">
            <div className="nm">
              <b>Anthropic</b>
              <span>{t("{n} accounts", { n: 2 })}</span>
            </div>
            <div className="ctl">
              <span className="lab">
                <small>{t("Routing")}</small>
                <Segs
                  value={""}
                  items={[
                    { id: "", label: t("Smart") },
                    { id: "order", label: t("In order") },
                    { id: "rotate", label: t("In turn") },
                    { id: "usage", label: t("Least used") },
                    { id: "pace", label: t("Weekly pace") },
                  ]}
                  onChange={() => {}}
                  aria-label={t("Routing")}
                />
              </span>
              <span className="lab">
                <small>{t("Stays")}</small>
                <Segs
                  value={""}
                  items={[
                    { id: "", label: t("Auto") },
                    { id: "session", label: t("Session") },
                    { id: "turn", label: t("Within a turn") },
                    { id: "off", label: t("Off") },
                    { id: "strict", label: t("Strict") },
                  ]}
                  onChange={() => {}}
                  aria-label={t("Stays")}
                />
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Magpie #rtMore — Routing groups empty (native 01-empty-live) */}
      <div className="rt-more" id="rtMore">
        <div className="rt-gsec">
          <div className="row-head">
            <span className="label">{t("Routing groups")}</span>
            <span className="grow" />
            <span className="note">{t("models agents pick as one")}</span>
            {savedGroups.length ? (
              <button
                type="button"
                className="text rt-gtplbtn"
                ref={tplBtnRef}
                aria-expanded={tplMenuOpen}
                onClick={() => setTplMenuOpen((o) => !o)}
              >
                <span>{t("Templates")}</span>
                <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden>
                  <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            ) : null}
            <button
              type="button"
              className="text rt-gimportbtn"
              title={t("Add a routing group someone shared from their magpie")}
              aria-expanded={gImportOpen}
              onClick={() => {
                setGImportOpen((o) => {
                  const next = !o;
                  if (next) setImportPaste("");
                  return next;
                });
              }}
            >
              {t("Import")}
            </button>
            <button
              type="button"
              className="text rt-gnew"
              onClick={() => {
                setTemplateSeed(null);
                setEditGroup(null);
                setGroupEditorOpen(true);
                setDemoGroups(true);
              }}
            >
              <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M8 3.5v9M3.5 8h9" />
              </svg>
              <span>{t("New group")}</span>
            </button>
          </div>
          <div className="rt-gfound row pref" style={{ alignItems: "flex-start", gap: 12, padding: "10px 4px" }}>
            <div className="txt" style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: "block", fontSize: 13 }}>{t("Find groups on their own")}</b>
              <small style={{ display: "block", color: "var(--muted)", lineHeight: 1.4, marginTop: 2 }}>
                {foundOn
                  ? t(
                      "A model two or more of your providers serve becomes a group of them (auto-…). Switch it off to list and serve only the groups you made or changed.",
                    )
                  : t(
                      "Off: only the groups you made or changed are listed and served. An agent set to a found group is moved to its model from one provider, and a request still naming one goes there too.",
                    )}
              </small>
            </div>
            <button
              type="button"
              className={`lib-switch${foundOn ? " on" : ""}`}
              role="switch"
              aria-checked={foundOn}
              aria-label={t("Find groups on their own")}
              onClick={() => setFoundOn((v) => !v)}
            >
              <i />
            </button>
          </div>
          <div className="rt-gnames row pref" style={{ alignItems: "flex-start", gap: 12, padding: "10px 4px" }}>
            <div className="txt" style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: "block", fontSize: 13 }}>{t("Names in agents’ lists")}</b>
              <small style={{ display: "block", color: "var(--muted)", lineHeight: 1.4, marginTop: 2 }}>
                {t(
                  "Whether “· routing group” follows a group’s name in the agents’ lists: one setting for every group, and for the provider after each model’s name, as on Settings.",
                )}
              </small>
            </div>
            <div className="segs" role="radiogroup" aria-label={t("Names in agents’ lists")}>
              {(
                [
                  ["off", "Off"],
                  ["skip", "Not on names I set"],
                  ["on", "On"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  className={`opt${nameSuffix === v ? " on" : ""}`}
                  role="radio"
                  aria-checked={nameSuffix === v}
                  onClick={() => setNameSuffix(v)}
                >
                  {t(label)}
                </button>
              ))}
            </div>
          </div>
          {/* Magpie templateCards — only while user has no own group (shots 23–24) */}
          {!savedGroups.length ? (
            <div className="rt-gtpl" style={{ animation: "fade-in .18s var(--ease)" }}>
              <div className="rt-gtpl-head">
                {t("Start from a template: made of your own models, added in a click")}
              </div>
              <div className="rt-gtpl-cards">
                {GROUP_TEMPLATES.map((tp, ti) => {
                  const seedMembers =
                    ti === 0
                      ? ["claude-opus-4-1", "claude-haiku-4-5"]
                      : ti === 1
                        ? ["claude-haiku-4-5", "claude-sonnet-4-5", "claude-opus-4-1"]
                        : ["claude-opus-4-1", "gpt-5", "gemini-2.5-pro"];
                  const canAdd = demoHasProviders();
                  return (
                    <div key={tp.title} className={`rt-gtpl-card${canAdd ? "" : " off"}`}>
                      <div className="hd">
                        <b>{t(tp.title)}</b>
                      </div>
                      <div className="desc">{t(tp.desc)}</div>
                      <div className="acts">
                        {canAdd ? (
                          <button
                            type="button"
                            className="text primary"
                            onClick={() => {
                              setTemplateSeed({ name: t(tp.title), memberIds: seedMembers });
                              setGroupEditorOpen(true);
                              setDemoGroups(true);
                            }}
                          >
                            {t("Add")}
                          </button>
                        ) : (
                          <span className="text quiet" style={{ opacity: 0.55, pointerEvents: "none" }}>
                            {t("Add a provider first")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {gImportOpen ? (
            <div className="rt-gimport">
              <div className="rt-gtpl-head">
                {t(
                  "Paste a routing group someone shared from their magpie: its models, routing and rules come with it, never a key",
                )}
              </div>
              <textarea
                className="rt-gimport-text"
                rows={3}
                value={importPaste}
                placeholder={t("Paste a group copied with Copy to share")}
                onChange={(e) => setImportPaste(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <div className="acts">
                <button
                  type="button"
                  className="text"
                  onClick={() => {
                    setGImportOpen(false);
                    setImportPaste("");
                  }}
                >
                  {t("Cancel")}
                </button>
                <button
                  type="button"
                  className="text primary"
                  disabled={!importPaste.trim()}
                  onClick={() => {
                    const raw = importPaste.trim();
                    if (!raw) return;
                    let name = "";
                    let members: string[] = [];
                    let rulesLeft = 0;
                    try {
                      const j = JSON.parse(raw) as {
                        name?: string;
                        members?: string[];
                        rules?: unknown[];
                      };
                      name = (j.name || "").trim() || t("Imported group");
                      members = Array.isArray(j.members) ? j.members.map(String) : [];
                      // Magpie may leave out rules that reference missing models
                      if (Array.isArray(j.rules) && j.rules.length && members.length < 2) {
                        rulesLeft = j.rules.length;
                      }
                    } catch {
                      // Magpie share blob is often opaque; demo accepts a name line
                      name = raw.split("\n")[0].slice(0, 64) || t("Imported group");
                      members = ["claude-sonnet-4-5", "claude-haiku-4-5"];
                    }
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "group";
                    setSavedGroups((gs) => [
                      ...gs,
                      {
                        name,
                        slug,
                        members,
                        memberNames: members,
                        routing: "",
                        pick: "",
                        weights: {},
                        rules: 0,
                        levels: ["low", "medium", "high"],
                        on: true,
                      },
                    ]);
                    setDemoGroups(true);
                    setGImportOpen(false);
                    setImportPaste("");
                    setImportNote(
                      rulesLeft
                        ? t(rulesLeft === 1 ? "1 rule left out with them" : "{n} rules left out with them", {
                            n: rulesLeft,
                          })
                        : "",
                    );
                    onStatus?.(t("{name} imported", { name }), "ok");
                  }}
                >
                  {t("Import")}
                </button>
              </div>
            </div>
          ) : null}
          {importNote ? (
            <div className="rt-gimport-note" style={{ marginTop: 6, fontSize: 12.5, color: "var(--muted)" }}>
              {importNote}
            </div>
          ) : null}
          <GroupEditor
            open={groupEditorOpen}
            nameSuffixOn={nameSuffix === "on"}
            templateSeed={templateSeed}
            editGroup={editGroup}
            onStatus={onStatus}
            onClose={() => {
              setGroupEditorOpen(false);
              setTemplateSeed(null);
              setEditGroup(null);
            }}
            onSaved={(g) => {
              setSavedGroups((gs) => {
                if (editGroup) {
                  return gs.map((x) => (x.slug === editGroup.slug ? g : x));
                }
                return [...gs, g];
              });
              setDemoGroups(true);
              setTemplateSeed(null);
              setEditGroup(null);
            }}
            onRemoved={() => {
              if (!editGroup) return;
              setSavedGroups((gs) => gs.filter((x) => x.slug !== editGroup.slug));
              setEditGroup(null);
            }}
          />
          {tplMenuOpen ? (
            <ProtoMultiMenu
              open
              anchor={tplBtnRef.current}
              head="Start from a template"
              live={false}
              value=""
              align="right"
              options={GROUP_TEMPLATES.map((tp, ti) => ({
                v: String(ti),
                name: tp.title,
                note: demoHasProviders() ? tp.desc : "Add a provider first",
              }))}
              onChange={(v) => {
                const ti = parseInt(String(v), 10);
                if (Number.isNaN(ti)) return;
                setTplMenuOpen(false);
                if (!demoHasProviders()) {
                  onStatus?.(t("Add a provider first"), "warn");
                  return;
                }
                const seedMembers =
                  ti === 0
                    ? ["claude-opus-4-1", "claude-haiku-4-5"]
                    : ti === 1
                      ? ["claude-haiku-4-5", "claude-sonnet-4-5", "claude-opus-4-1"]
                      : ["claude-opus-4-1", "gpt-5", "gemini-2.5-pro"];
                setEditGroup(null);
                setTemplateSeed({ name: t(GROUP_TEMPLATES[ti].title), memberIds: seedMembers });
                setGroupEditorOpen(true);
                setDemoGroups(true);
              }}
              onClose={() => setTplMenuOpen(false)}
            />
          ) : null}

          {false ? (
            <div className="none rt-gnone" style={{ padding: "16px 4px", color: "var(--muted)", fontSize: 13 }}>
              {foundOn
                ? t(
                    "No group yet. A model two of your providers serve becomes one on its own; New group makes one of any models you like.",
                  )
                : t("No group yet. New group makes one of any models you like.")}
            </div>
          ) : null}
          {savedGroups.length ? (
            <div className="rt-groups" style={{ marginTop: 8 }}>
              {savedGroups.map((g) => (
                <div
                  key={g.slug}
                  className={`rt-group${g.on ? "" : " disabled"}`}
                  style={{ animation: "fade-in .18s var(--ease)" }}
                >
                  <div className="ics rt-ghandle ag-handle" aria-hidden>
                    <svg className="ic" viewBox="0 0 16 16" width={16} height={16}>
                      <rect x="3" y="3" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M6 8h4M8 6v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="main">
                    <div className="nm">
                      <b>{g.name}</b>
                      <code className="mdl">{`group/${g.slug}`}</code>
                    </div>
                    {g.routing === "manual" && g.members.length ? (
                      <div className="rt-picks" onClick={(e) => e.stopPropagation()}>
                        {g.members.map((id, i) => {
                          const label = g.memberNames[i] || id;
                          const short = (label.includes(":") ? label.split(":")[0] : label).split("/").pop() || label;
                          const on = (g.pick || g.members[0]) === id;
                          return (
                            <button
                              type="button"
                              key={id}
                              className={`rt-pick${on ? " on" : ""}`}
                              title={on ? undefined : t("Send every request to {name}", { name: short })}
                              onClick={() => {
                                if (on) return;
                                setSavedGroups((gs) =>
                                  gs.map((x) => (x.slug === g.slug ? { ...x, pick: id } : x)),
                                );
                                onStatus?.(
                                  t("{name}: every request to {model}", {
                                    name: g.name || g.slug,
                                    model: short,
                                  }),
                                  "ok",
                                );
                              }}
                            >
                              <i className="dot" aria-hidden />
                              <span className="n">{short}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mem">
                        {(g.memberNames.length ? g.memberNames : g.members).join(" · ") || t("no models")}
                      </div>
                    )}
                  </div>
                  <div className="tags">
                    <span className="tag">{t(g.routing === "" || g.routing === "smart" ? "Smart" : g.routing === "order" ? "In order" : g.routing === "rotate" ? "In turn" : g.routing === "usage" ? "Least used" : g.routing === "pace" ? "Weekly pace" : g.routing === "weight" ? "By weight" : g.routing === "manual" ? "Manual" : "Smart")}</span>
                    {g.rules > 0 ? (
                      <span className="tag">{t(g.rules === 1 ? "1 rule" : "{n} rules", { n: g.rules })}</span>
                    ) : null}
                    <span className="tag bad">{t("no member ready")}</span>
                  </div>
                  <button
                    type="button"
                    className="text"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditGroup(g);
                      setTemplateSeed(null);
                      setGroupEditorOpen(true);
                    }}
                  >
                    {t("Edit")}
                  </button>
                  <button
                    type="button"
                    className={`lib-switch rt-gon${g.on ? " on" : ""}`}
                    role="switch"
                    aria-checked={g.on}
                    aria-label={g.name}
                    title={
                      g.on
                        ? t("On: agents may pick {name}. Click to switch it off and keep it as it is", {
                            name: g.name || g.slug,
                          })
                        : t("Off: agents aren't offered {name} and a request to it is turned away. Click to switch it on", {
                            name: g.name || g.slug,
                          })
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      setSavedGroups((gs) => gs.map((x) => (x.slug === g.slug ? { ...x, on: !x.on } : x)));
                    }}
                  >
                    <i />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {demoGroups && !savedGroups.length && !groupEditorOpen ? (
            <div className="rt-groups" style={{ marginTop: 8 }}>
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
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
