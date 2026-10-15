import { useEffect, useRef, useState, type ReactNode } from "react";
import { GroupEditor, type SavedGroupDraft } from "../components/GroupEditor";
import { Segs } from "../components/Segs";
import { LibSwitch } from "../components/LibSwitch";
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

const ALT = typeof navigator !== "undefined" && /^Mac/.test(navigator.platform) ? "⌥" : "Alt+";
const MOVE_UP = "M8 12.5v-9M4 7.25l4-3.75 4 3.75";
const MOVE_DOWN = "M8 3.5v9M4 8.75l4 3.75 4-3.75";
const DUP_ICON = "M5.5 3.5h6.5v6.5H5.5zM3.5 5.5H3v7.5h7.5v-.5";
const SHARE_ICON = "M8 2.5v7M5.25 5l2.75-2.75L10.75 5M3.5 9v3.5h9V9";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "group";
}

/** Magpie: name taken → "share 2", "share 3", … */
function uniqueGroupName(base: string, existing: SavedGroupDraft[]): { name: string; slug: string } {
  const takenSlug = new Set(existing.map((g) => g.slug));
  const takenName = new Set(existing.map((g) => g.name.toLowerCase()));
  let name = base.trim() || "group";
  let slug = slugify(name);
  let n = 2;
  while (takenSlug.has(slug) || takenName.has(name.toLowerCase())) {
    name = `${base.trim() || "group"} ${n}`;
    slug = slugify(name);
    n += 1;
  }
  return { name, slug };
}

/** Demo has no providers: typed ids are not "in this magpie". */
function memberInMagpie(_id: string): boolean {
  return demoHasProviders();
}


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

/** Same key as GatewayView — this magpie holds the listener when "on". */
function readGwModeForRouting(): "on" | "off" | "older" | "other" {
  try {
    const q = new URLSearchParams(location.search).get("gw");
    if (q === "off" || q === "older" || q === "on" || q === "other") return q;
    const v = localStorage.getItem("magpie.demoGw") || "on";
    return v === "off" || v === "older" || v === "other" ? v : "on";
  } catch {
    return "on";
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
    // Live empty stage when this magpie holds the gateway (routing 116 / responsive 11).
    // Peer card when older/other still serves (responsive 05/09).
    const gw = readGwModeForRouting();
    return gw === "older" || gw === "other";
  } catch {
    return false;
  }
}

/** Built-in Routing groups plugin — off in these live shots (no + New group). */
function readGroupsOn(): boolean {
  try {
    const q = new URLSearchParams(location.search).get("rtGroups");
    if (q === "1") return true;
    if (q === "0") return false;
    return localStorage.getItem("magpie.feature.groups") === "1";
  } catch {
    return false;
  }
}

/** Magpie groups/found → providers.json noAutoGroups (routing 172–175). Default on. */
function readFoundOn(): boolean {
  try {
    const q = new URLSearchParams(location.search).get("rtFound");
    if (q === "0") return false;
    if (q === "1") return true;
    return localStorage.getItem("magpie.noAutoGroups") !== "1";
  } catch {
    return true;
  }
}

function persistFoundOn(on: boolean) {
  try {
    if (on) localStorage.removeItem("magpie.noAutoGroups");
    else localStorage.setItem("magpie.noAutoGroups", "1");
  } catch { /* */ }
}

/** Magpie settings/plain-names: On omits both; skip → plainOwnNames; off → plainNames. */
function readNameSuffix(): "off" | "skip" | "on" {
  try {
    const q = new URLSearchParams(location.search).get("rtNames");
    if (q === "off" || q === "skip" || q === "on") return q;
    if (localStorage.getItem("magpie.plainNames") === "1") return "off";
    if (localStorage.getItem("magpie.plainOwnNames") === "1") return "skip";
    return "on";
  } catch {
    return "on";
  }
}

function persistNameSuffix(v: "off" | "skip" | "on") {
  try {
    if (v === "off") {
      localStorage.setItem("magpie.plainNames", "1");
      localStorage.removeItem("magpie.plainOwnNames");
    } else if (v === "skip") {
      localStorage.setItem("magpie.plainOwnNames", "1");
      localStorage.removeItem("magpie.plainNames");
    } else {
      localStorage.removeItem("magpie.plainNames");
      localStorage.removeItem("magpie.plainOwnNames");
    }
  } catch { /* */ }
}

type GroupRowMenuProps = {
  anchor: HTMLElement;
  canMove: boolean;
  index: number;
  count: number;
  group: SavedGroupDraft;
  onClose: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onCopyShare: () => void;
};

/** Magpie group row menu (shots 195–198): Move up/down · Duplicate · Copy to share. */
function GroupRowMenu({
  anchor,
  canMove,
  index,
  count,
  group,
  onClose,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onCopyShare,
}: GroupRowMenuProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const r = anchor.getBoundingClientRect();
    const pad = 8;
    const w = box.offsetWidth || 200;
    const h = box.offsetHeight || 120;
    let y = r.bottom + 5;
    if (y + h > window.innerHeight - pad && r.top - 5 - h >= pad) {
      y = r.top - 5 - h;
      box.classList.add("up");
    }
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

  const items: {
    name: string;
    icon: string;
    key?: string;
    off?: boolean;
    title?: string;
    run: () => void;
  }[] = [
    {
      name: t("Move up"),
      icon: MOVE_UP,
      key: ALT + "↑",
      off: !canMove || index <= 0,
      run: onMoveUp,
    },
    {
      name: t("Move down"),
      icon: MOVE_DOWN,
      key: ALT + "↓",
      off: !canMove || index < 0 || index >= count - 1,
      run: onMoveDown,
    },
    {
      name: t("Duplicate"),
      icon: DUP_ICON,
      title: t("A copy of {name} with its models, routing and rules, listed after it", {
        name: group.name,
      }),
      run: onDuplicate,
    },
    {
      name: t("Copy to share"),
      icon: SHARE_ICON,
      title: t("{name} as text to paste into another magpie: its models, routing and rules, no key", {
        name: group.name,
      }),
      run: onCopyShare,
    },
  ];

  return (
    <div className="pop row-menu fixed" role="menu" ref={boxRef}>
      {items.map((o) => (
        <button
          type="button"
          key={o.name}
          className="rm-item"
          role="menuitem"
          disabled={!!o.off}
          title={o.title}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            o.run();
          }}>
          <svg viewBox="0 0 16 16" width={13} height={13} aria-hidden>
            <path
              d={o.icon}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="rm-name">{o.name}</span>
          {o.key ? <span className="rm-key">{o.key}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** Empty routing stage matching official Magpie R-00…R-09. */
export function RoutingView({ onStatus }: { onStatus?: (msg: string, kind?: string) => void } = {}) {
  /** tray/20 + responsive 05/09: peer card when another magpie holds the gateway. */
  const [peerServes, setPeerServes] = useState(readPeerServes);
  /** Plugins → Routing groups; off in live 115–117 / responsive 11–12. */
  const [groupsOn, setGroupsOn] = useState(readGroupsOn);
  const mainRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const [mainNarrow, setMainNarrow] = useState(false);
  const [moreNarrow, setMoreNarrow] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const srcRef = useRef<HTMLDivElement>(null);
  const idleRef = useRef<HTMLLIElement>(null);
  const maskTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [wires, setWires] = useState<Wire[]>([]);
  /** Explicit demo-only control (not Magpie Live UI on empty). */
  const [demoLive] = useState(false);
  const [demoTurn, setDemoTurn] = useState(0);
  const [flier, setFlier] = useState<{ x: number; y: number; rot: number } | null>(
    null,
  );
  const [masked, setMasked] = useState(readMasked);
  const [masking, setMasking] = useState(false);
  const [demoGroups, setDemoGroups] = useState(() => readGroupsOn());
  /** Magpie groups.found / noAutoGroups (routing 172–175). Default on. */
  const [foundOn, setFoundOn] = useState(readFoundOn);
  /** Magpie plain-names segments: Off | Not on names I set | On (176–178). */
  const [nameSuffix, setNameSuffix] = useState(readNameSuffix);
  const [groupEditorOpen, setGroupEditorOpen] = useState(false);
  const [savedGroups, setSavedGroups] = useState<SavedGroupDraft[]>([]);
  const [gImportOpen, setGImportOpen] = useState(false);
  const [importPaste, setImportPaste] = useState("");
  const [importResult, setImportResult] = useState<null | {
    name: string;
    leftOut: string[];
    instead: string[];
    rulesLeft: number;
  }>(null);
  const importTextRef = useRef<HTMLTextAreaElement>(null);
  const [templateSeed, setTemplateSeed] = useState<{ name: string; memberIds: string[] } | null>(null);
  const [editGroup, setEditGroup] = useState<SavedGroupDraft | null>(null);
  const [tplMenuOpen, setTplMenuOpen] = useState(false);
  const tplBtnRef = useRef<HTMLButtonElement>(null);
  const [groupFilter, setGroupFilter] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [pickedSlugs, setPickedSlugs] = useState<Set<string>>(() => new Set());
  const [removeAsk, setRemoveAsk] = useState<SavedGroupDraft[] | null>(null);
  const [rowMenu, setRowMenu] = useState<{ slug: string; el: HTMLElement } | null>(null);

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

  // Sync peer / groups with Gateway take-over and Plugins toggle
  useEffect(() => {
    const sync = () => {
      setPeerServes(readPeerServes());
      const g = readGroupsOn();
      setGroupsOn(g);
      setDemoGroups(g);
    };
    window.addEventListener("storage", sync);
    window.addEventListener("magpie-feature", sync);
    window.addEventListener("magpie-gw-mode", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("magpie-feature", sync);
      window.removeEventListener("magpie-gw-mode", sync);
    };
  }, []);

  // Magpie routing.js: max560 on rt-main when ≤560 CSS px (616 window at 110%)
  useEffect(() => {
    if (peerServes) return;
    const el = mainRef.current;
    if (!el) return;
    const apply = () => setMainNarrow(el.clientWidth <= 560);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [peerServes]);

  // Magpie: max520 on #rtMore — hide groups head note at ~616 (shot 143)
  useEffect(() => {
    if (peerServes || !groupsOn) {
      setMoreNarrow(false);
      return;
    }
    const el = moreRef.current;
    if (!el) return;
    const apply = () => setMoreNarrow(el.clientWidth <= 520);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [peerServes, groupsOn, savedGroups.length, groupEditorOpen]);

  // Magpie Import box: focus the textarea when it opens (routing 181)
  useEffect(() => {
    if (!gImportOpen || importResult) return;
    const tmr = window.setTimeout(() => importTextRef.current?.focus({ preventScroll: true }), 0);
    return () => clearTimeout(tmr);
  }, [gImportOpen, importResult]);


  // Magpie routing.js layout(): side wires when nodes are beside hub;
  // when accounts sit under (max560), a lane down the left from hub bottom.
  useEffect(() => {
    const draw = () => {
      const stage = stageRef.current;
      const hub = hubRef.current;
      const src = srcRef.current;
      const idle = idleRef.current;
      if (!stage || !hub) return;
      const sr = stage.getBoundingClientRect();
      if (!sr.width) return;
      const box = (e: HTMLElement) => {
        const x = e.getBoundingClientRect();
        return {
          l: x.left - sr.left,
          r: x.right - sr.left,
          t: x.top - sr.top,
          b: x.bottom - sr.top,
          cx: (x.left + x.right) / 2 - sr.left,
          cy: (x.top + x.bottom) / 2 - sr.top,
        };
      };
      const h = box(hub);
      const next: Wire[] = [];
      let low = h.b;
      if (src) {
        const s = box(src);
        low = s.b;
        if (h.l > s.r) {
          const mx = (s.r + h.l) / 2;
          next.push({
            d: `M${s.r} ${s.cy} C${mx} ${s.cy} ${mx} ${h.cy} ${h.l} ${h.cy}`,
            live: demoLive,
          });
        } else {
          next.push({
            d: `M${s.cx} ${s.b} L${h.cx} ${h.t}`,
            live: demoLive,
          });
        }
      }
      if (idle) {
        const a = box(idle);
        if (a.l > h.r) {
          const mx = (h.r + a.l) / 2;
          next.push({
            d: `M${h.r} ${h.cy} C${mx} ${h.cy} ${mx} ${a.cy} ${a.l} ${a.cy}`,
            live: false,
          });
        } else {
          // under hub (max560 / nest 117): Magpie fromHub vertical lane
          const x = a.l - 12;
          const y = Math.max(h.b, low - 8);
          next.push({
            d: `M${h.cx} ${h.b} L${h.cx} ${y} C${h.cx} ${y + 22} ${x} ${y + 2} ${x} ${y + 24} L${x} ${a.cy - 10} Q${x} ${a.cy} ${a.l} ${a.cy}`,
            live: false,
          });
        }
      }
      const svg = stage.querySelector(".rt-wires") as SVGSVGElement | null;
      const sky = stage.querySelector(".rt-sky") as SVGSVGElement | null;
      for (const el of [svg, sky]) {
        if (el) el.setAttribute("viewBox", `0 0 ${sr.width} ${sr.height}`);
      }
      setWires(next);
    };
    // after max560 class toggles, wait a frame so grid reflow is measured
    const kick = () => requestAnimationFrame(draw);
    kick();
    const ro = new ResizeObserver(kick);
    if (stageRef.current) ro.observe(stageRef.current);
    if (mainRef.current) ro.observe(mainRef.current);
    window.addEventListener("resize", kick);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", kick);
    };
  }, [demoLive, mainNarrow]);

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
          <span className="rt-livedot" aria-hidden="true" />
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
            onClick={toggleMask}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true">
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
        <span className="note">{t("live, as the gateway decides")}</span>
        <span className="grow" />
        {groupsOn ? (
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
            }}>
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true">
              <path d="M8 3.5v9M3.5 8h9" />
            </svg>
            <span data-t>{t("New group")}</span>
          </button>
        ) : null}
        <button
          className="text rt-mask"
          id="rtMask"
          type="button"
          aria-pressed={masked}
          title={masked
            ? t("Accounts are masked for a screenshot — click to show them")
            : t("Mask the accounts on this page — email addresses and account names — for a screenshot to share")}
          onClick={toggleMask}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true">
            <path d={masked ? EYE_OFF : EYE} />
          </svg>
          <span data-t>{masked ? t("Accounts hidden") : t("Hide accounts")}</span>
        </button>
      </div>

      <section className="rt" id="rt">
        <div className={`rt-main${mainNarrow ? " max560" : ""}`} ref={mainRef}>
          <div className="rt-top">
            <div className="rt-what">
              <b>{demoLive ? t("Demo request · affinity kept") : t("Waiting for a request")}</b>
              {demoLive ? <span className="rt-livedot" aria-hidden="true" /> : null}
            </div>
            <p className="rt-mode">
              {demoLive
                ? t("Tried Anthropic first · then OpenAI") +
                  (demoTurn ? ` · turn ${demoTurn}` : "")
                : t(
                  "Send one from any agent routed through magpie and it plays here as it happens: who routing put first and why, each try, and what each answered.",
                )}
            </p>
          </div>

          {replaying && demoLive ? (
            <div className="rt-replay rt-fade" id="rtReplay">
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
                  onClick={() => setReplaySpeed((s) => (s >= 8 ? 1 : s * 2))}>
                  {t("{n}× speed", { n: replaySpeed })}
                </button>
                <button
                  type="button"
                  className="text"
                  onClick={() => {
                    setReplaying(false);
                    setReplayFrac(0);
                  }}>
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
                }}>
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
                style={{ ["--agent" as string]: "#7c3aed" }}>
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
                  {t("your agent")}
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
                  {/* Magpie makeRow: i.dot + b + em + div.bar>i width (routing.js ~1315–1317, 1587) */}
                  <li className="on" ref={idleRef} style={{ ["--agent" as string]: "#d97706" }}>
                    <i className="dot" />
                    <b>
                      <span className="who">Anthropic · work@…</span>
                    </b>
                    <em>{t("answering…")}</em>
                    <div className="bar">
                      <i style={{ width: "72%" }} />
                    </div>
                  </li>
                  <li style={{ ["--agent" as string]: "#10a37f" }}>
                    <i className="dot" />
                    <b>
                      <span className="who">OpenAI · sk-…demo</span>
                    </b>
                    <em>{t("API key")}</em>
                    <div className="bar">
                      <i style={{ width: "28%" }} />
                    </div>
                  </li>
                </>
              ) : (
                <li className="idle" ref={idleRef}>
                  {t("No request yet")}
                </li>
              )}
            </ol>

            <svg className="rt-sky" aria-hidden="true">
              {flier && (
                <g
                  className="rt-flier rt-flier-demo req"
                  transform={`translate(${flier.x} ${flier.y}) rotate(${flier.rot})`}>
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
                <span>{t("requests")}</span>
              </span>
              <span>
                <b>{demoLive ? "1" : "0"}</b>
                <span>{t("rerouted")}</span>
              </span>
              <span
                className="rt-errs"
                aria-disabled={!demoLive}
                title={ZH.noFailedRequest}>
                <b>0</b>
                <span>{t("errors your agent saw")}</span>
              </span>
            </div>
          </div>

          {/* Gateway trace story — Magpie .rt-log / .rt-steps */}
          {demoLive && (pickedReq || replaying) ? (
            <div className="rt-log rt-fade" id="rtLog">
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
                      }}>
                      {t("Replay")}
                    </button>
                    <button
                      type="button"
                      className="text"
                      onClick={() => {
                        setPickedReq(null);
                        setHistDay("");
                      }}>
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
      <div className={`rt-cols${!demoLive ? " solo" : ""}`} id="rtHist">
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
                }}>
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
                }}>
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
              }}>
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
             
              onClick={() => {
                if (!demoLive) return;
                setReplayFrac(0);
                setReplaying(true);
              }}>
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

          <div className="rt-filters" hidden={!demoLive}>
            <div className="rt-days">
              <button
                type="button"
                className={`rt-day${!histDay ? " on" : ""}`}
                aria-pressed={!histDay}
                onClick={() => {
                  setHistDay("");
                  setReplaying(false);
                }}>
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
                  }}>
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
                }}>
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
            <div className="rt-group-by">
              <button
                type="button"
                className={`rt-day${!bySession ? " on" : ""}`}
                aria-pressed={!bySession}
                onClick={() => {
                  setBySession(false);
                  try { localStorage.setItem("magpie.routingBySession", "0"); } catch { /* */ }
                }}>
                {t("By request")}
              </button>
              <button
                type="button"
                className={`rt-day${bySession ? " on" : ""}`}
                aria-pressed={bySession}
                onClick={() => {
                  setBySession(true);
                  try { localStorage.setItem("magpie.routingBySession", "1"); } catch { /* */ }
                }}>
                {t("By session")}
              </button>
            </div>
          </div>

          <div
            className={`list rt-reqs${
              !demoLive ||
              (purposes.length > 0 &&
                !["unmarked", "kind:compact", "kind:thread_title", "kind:web_search"].some((p) =>
                  purposes.includes(p),
                ))
                ? " none"
                : ""
            }`}
            id="rtReqs"
          >
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
                  className={`rt-req${r.ok === false ? " bad" : ""}${r.moved ? " moved" : ""}${r.wait ? " wait" : ""}`}
                  aria-pressed={pickedReq === r.id}
                 
                  onClick={() => {
                    setPickedReq(r.id);
                    setDemoTurn((n) => n + 1);
                  }}>
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
                  <div className="empty-state">
                    <b>
                      {t("No requests since magpie started")}
                    </b>
                    {t("Each request an agent sends through magpie shows up here: who answered it, why, and each try.")}
                  </div>
                );
              }

              if (!filtered.length) {
                return (
                  <div className="empty-state">
                    <b>
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
        <div className="rt-col" id="rtColB" hidden={!demoLive}>
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
              }}>
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
                <div className="rt-act" title="anthropic/ada">
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
                  <div className="bar"><i style={{ ["--bar" as string]: "38%" }} /></div>
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
                  }}>
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
                  <div className="rt-act" title="openai/sk-demo">
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
        <div className="rt-pools">
          <div className="row-head">
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

      {/* Magpie #rtMore — only when Routing groups plugin is on */}
      {groupsOn ? (
      <div className={`rt-more${moreNarrow ? " max520" : ""}`} id="rtMore" ref={moreRef}>
        <div className="rt-gsec">
          <div className="row-head">
            <span className="label">{t("Routing groups")}</span>
            <span className="grow" />
            <span className="note">{t("models agents pick as one")}</span>
            {savedGroups.length >= 2 || groupFilter ? (
              <input
                type="search"
                className="rt-gfilter"
                value={groupFilter}
                placeholder={t("Filter groups and models")}
                spellCheck={false}
                autoComplete="off"
                aria-label={t("Filter groups and models")}
                onChange={(e) => setGroupFilter(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Escape" && groupFilter) {
                    e.preventDefault();
                    setGroupFilter("");
                  }
                }}
              />
            ) : null}
            {!selecting ? (
              <>
            {savedGroups.length ? (
              <button
                type="button"
                className="text rt-gtplbtn"
                ref={tplBtnRef}
                aria-expanded={tplMenuOpen}
                onClick={() => setTplMenuOpen((o) => !o)}>
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
                  // 186 / 189: closing drops the text; opening starts empty
                  setImportPaste("");
                  setImportResult(null);
                  return next;
                });
              }}>
              {t("Import")}
            </button>
            {savedGroups.length >= 2 ? (
              <button
                type="button"
                className="text"
                aria-pressed={selecting}
                onClick={() => {
                  setSelecting((s) => {
                    if (s) setPickedSlugs(new Set());
                    return !s;
                  });
                }}>
                {t("Select")}
              </button>
            ) : null}
            <button
              type="button"
              className="text rt-gnew"
              title={t("Make a routing group of any models you like — agents pick it as one model")}
              onClick={() => {
                setTemplateSeed(null);
                setEditGroup(null);
                setGroupEditorOpen(true);
                setDemoGroups(true);
              }}>
              <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M8 3.5v9M3.5 8h9" />
              </svg>
              <span>{t("New group")}</span>
            </button>
              </>
            ) : null}
          </div>
          <div className="rt-gfound row pref">
            <div className="txt">
              <b>{t("Find groups on their own")}</b>
              <small>
                {foundOn
                  ? t(
                      "A model two or more of your providers serve becomes a group of them (auto-…). Switch it off to list and serve only the groups you made or changed.",
                    )
                  : t(
                      "Off: only the groups you made or changed are listed and served. An agent set to a found group is moved to its model from one provider, and a request still naming one goes there too.",
                    )}
              </small>
            </div>
            <LibSwitch
              on={foundOn}
              aria-label={t("Find groups on their own")}
              onClick={() => {
                const next = !foundOn;
                persistFoundOn(next);
                setFoundOn(next);
                // Magpie: sentence is the tip; toast confirms write (173 / 175)
                onStatus?.(
                  next
                    ? t("Found groups are on")
                    : t("Found groups are off: only yours are listed and served"),
                  "ok",
                );
              }}
            />
          </div>
          <div className="rt-gnames row pref">
            <div className="txt">
              <b>{t("Names in agents’ lists")}</b>
              <small>
                {t(
                  "Whether “· routing group” follows a group’s name in the agents’ lists: one setting for every group, and for the provider after each model’s name, as on Settings.",
                )}
              </small>
            </div>
            <Segs
              value={nameSuffix}
              onChange={(v) => {
                setNameSuffix(v);
                persistNameSuffix(v);
                // Magpie settings/plain-names: write at once, no toast (176–178)
              }}
              items={[
                { id: "off" as const, label: t("Off") },
                { id: "skip" as const, label: t("Not on names I set") },
                { id: "on" as const, label: t("On") },
              ]}
              aria-label={t("Names in agents’ lists")}
            />
          </div>
          {/* Magpie templateCards — only while user has no own group (shots 23–24) */}
          {!savedGroups.length ? (
            <div className="rt-gtpl">
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
                            }}>
                            {t("Add")}
                          </button>
                        ) : (
                          <span className="text quiet">
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
              {importResult ? (
                <>
                  <div className="rt-gimport-done">{t("Added {name}", { name: importResult.name })}</div>
                  {importResult.leftOut.length ? (
                    <div className="rt-gimport-missing">
                      {t("Not in your magpie, left out: {models}", {
                        models: importResult.leftOut.join(", "),
                      })}
                    </div>
                  ) : null}
                  {importResult.instead.length ? (
                    <div className="rt-gimport-note">
                      {t("The same model from your own provider: {models}", {
                        models: importResult.instead.join(", "),
                      })}
                    </div>
                  ) : null}
                  {importResult.rulesLeft > 0 ? (
                    <div className="rt-gimport-note">
                      {t(
                        importResult.rulesLeft === 1
                          ? "1 rule left out with them"
                          : "{n} rules left out with them",
                        { n: importResult.rulesLeft },
                      )}
                    </div>
                  ) : null}
                  <div className="acts">
                    <button
                      type="button"
                      className="text primary"
                      onClick={() => {
                        setGImportOpen(false);
                        setImportPaste("");
                        setImportResult(null);
                      }}>
                      {t("Done")}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rt-gtpl-head">
                    {t(
                      "Paste a routing group someone shared from their magpie: its models, routing and rules come with it, never a key",
                    )}
                  </div>
                  <textarea
                    ref={importTextRef}
                    className="rt-gimport-text"
                    rows={3}
                    value={importPaste}
                    placeholder={t("Paste a group copied with Copy to share")}
                    onChange={(e) => setImportPaste(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      // 187: Escape in the field closes and drops text
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setGImportOpen(false);
                        setImportPaste("");
                        setImportResult(null);
                      }
                    }}
                  />
                  <div className="acts">
                    <button
                      type="button"
                      className="text primary"
                      onClick={() => {
                        const raw = importPaste.trim();
                        // 188: empty Import only refocuses — no toast
                        if (!raw) {
                          importTextRef.current?.focus({ preventScroll: true });
                          return;
                        }
                        const refuse = () => {
                          onStatus?.(
                            t(
                              "This is not a routing group shared from magpie: copy one with Copy to share in a group's menu",
                            ),
                            "err",
                          );
                        };
                        let blob: {
                          magpie?: string;
                          version?: number;
                          group?: {
                            id?: string;
                            name?: string;
                            members?: unknown;
                            match?: unknown;
                            rules?: unknown[];
                          };
                          name?: string;
                          members?: unknown;
                          match?: unknown;
                          rules?: unknown[];
                        };
                        try {
                          blob = JSON.parse(raw);
                        } catch {
                          refuse();
                          return;
                        }
                        if (!blob || typeof blob !== "object") {
                          refuse();
                          return;
                        }
                        if (blob.magpie !== "routing-group") {
                          refuse();
                          return;
                        }
                        if (blob.version == null) {
                          onStatus?.(
                            t("This shared group says no format it is in: copy it again with Copy to share"),
                            "err",
                          );
                          return;
                        }
                        if (typeof blob.version === "number" && blob.version > 1) {
                          onStatus?.(
                            t("This group was shared from a newer magpie (format {n}): update magpie to import it", {
                              n: blob.version,
                            }),
                            "err",
                          );
                          return;
                        }
                        const g =
                          blob.group && typeof blob.group === "object" ? blob.group : blob;
                        const rawMembers = Array.isArray(g.members) ? g.members.map(String) : [];
                        const rawMatch = Array.isArray(g.match)
                          ? g.match.map(String)
                          : Array.isArray((blob as { match?: unknown }).match)
                            ? ((blob as { match: unknown[] }).match).map(String)
                            : [];
                        const rawRules = Array.isArray(g.rules)
                          ? g.rules
                          : Array.isArray(blob.rules)
                            ? blob.rules
                            : [];
                        if (!rawMembers.length && !rawMatch.length) {
                          refuse();
                          return;
                        }
                        const kept: string[] = [];
                        const leftOut: string[] = [];
                        for (const m of rawMembers) {
                          if (memberInMagpie(m)) kept.push(m);
                          else leftOut.push(m);
                        }
                        // Patterns always travel; with no provider they match nothing now.
                        const patterns = [...rawMatch];
                        if (!kept.length && !patterns.length) {
                          onStatus?.(
                            t("None of the group's models is in your magpie: {models}", {
                              models: leftOut.join(", ") || "—",
                            }),
                            "err",
                          );
                          return;
                        }
                        const gRec = g as { id?: string; name?: string };
                        const baseName =
                          (typeof gRec.name === "string" && gRec.name.trim()) ||
                          (typeof gRec.id === "string" && gRec.id.trim()) ||
                          (typeof blob.name === "string" && blob.name.trim()) ||
                          t("Imported group");
                        const { name, slug } = uniqueGroupName(baseName, savedGroups);
                        let rulesLeft = 0;
                        if (rawRules.length && kept.length < 2) {
                          rulesLeft = rawRules.length;
                        }
                        setSavedGroups((gs) => [
                          ...gs,
                          {
                            name,
                            slug,
                            members: kept,
                            memberNames: kept,
                            patterns,
                            routing: "",
                            pick: "",
                            weights: {},
                            rules: 0,
                            levels: ["low", "medium", "high"],
                            on: true,
                          },
                        ]);
                        setDemoGroups(true);
                        setImportPaste("");
                        setImportResult({
                          name,
                          leftOut,
                          instead: [],
                          rulesLeft,
                        });
                        onStatus?.(t("Added {name}", { name }), "ok");
                      }}>
                      {t("Import")}
                    </button>
                    <button
                      type="button"
                      className="text"
                      onClick={() => {
                        setGImportOpen(false);
                        setImportPaste("");
                        setImportResult(null);
                      }}>
                      {t("Cancel")}
                    </button>
                  </div>
                </>
              )}
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

          {selecting && savedGroups.length >= 2 ? (
            <div className="rt-gsel">
              <input
                type="checkbox"
                aria-label={t("Select every group")}
                checked={pickedSlugs.size > 0 && pickedSlugs.size === savedGroups.length}
                ref={(el) => {
                  if (el) el.indeterminate = pickedSlugs.size > 0 && pickedSlugs.size < savedGroups.length;
                }}
                onChange={(e) => {
                  setPickedSlugs(
                    e.target.checked ? new Set(savedGroups.map((g) => g.slug)) : new Set(),
                  );
                }}
              />
              <span className="note">
                {pickedSlugs.size
                  ? t("{n} selected", { n: pickedSlugs.size })
                  : t("Pick the groups to remove")}
              </span>
              <span className="grow" />
              <button
                type="button"
                className="text danger rt-gremove"
                disabled={!pickedSlugs.size}
                onClick={() => {
                  const list = savedGroups.filter((g) => pickedSlugs.has(g.slug));
                  if (!list.length) return;
                  setRemoveAsk(list);
                }}>
                {t("Remove")}
              </button>
              <button
                type="button"
                className="text"
                onClick={() => {
                  setSelecting(false);
                  setPickedSlugs(new Set());
                }}>
                {t("Done")}
              </button>
            </div>
          ) : null}

          {savedGroups.length ? (
            <div className="list rt-groups">
              {(() => {
                const words = groupFilter.trim().toLowerCase().split(/\s+/).filter(Boolean);
                const filtered = words.length
                  ? savedGroups.filter((g) => {
                      const hay = [
                        g.name,
                        g.slug,
                        "group/" + g.slug,
                        ...g.members,
                        ...g.memberNames,
                        ...(g.patterns || []),
                      ]
                        .join("\n")
                        .toLowerCase();
                      return words.every((w) => hay.includes(w));
                    })
                  : savedGroups;
                if (!filtered.length && words.length) {
                  return (
                    <div className="none rt-gnone">
                      {t("No group or model matches “{q}”", { q: groupFilter.trim() })}
                    </div>
                  );
                }
                return filtered.map((g) => {
                  const picked = pickedSlugs.has(g.slug);
                  return (
                <div
                  key={g.slug}
                  className={`rt-group${g.on ? "" : " disabled"}${selecting ? " rt-gpick" : ""}${selecting && picked ? " on" : ""}`}
                 
                  onContextMenu={(e) => {
                    if (selecting) return;
                    e.preventDefault();
                    const handle = (e.currentTarget as HTMLElement).querySelector(".rt-ghandle") as HTMLElement | null;
                    if (handle) setRowMenu({ slug: g.slug, el: handle });
                  }}
                  onClick={() => {
                    if (!selecting) return;
                    setPickedSlugs((set) => {
                      const next = new Set(set);
                      if (next.has(g.slug)) next.delete(g.slug);
                      else next.add(g.slug);
                      return next;
                    });
                  }}>
                  {selecting ? (
                    <input
                      type="checkbox"
                      checked={picked}
                      onChange={() => {
                        setPickedSlugs((set) => {
                          const next = new Set(set);
                          if (next.has(g.slug)) next.delete(g.slug);
                          else next.add(g.slug);
                          return next;
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                     
                      aria-label={g.name}
                    />
                  ) : (
                  <button
                    type="button"
                    className={`ics rt-ghandle ag-handle${rowMenu?.slug === g.slug ? " open" : ""}`}
                    aria-label={t("Arrange {agent}", { agent: g.name })}
                    aria-haspopup="menu"
                    aria-expanded={rowMenu?.slug === g.slug}
                    title={t("Drag to reorder — agents' model lists show the groups in this order · Alt+↑/↓ to move")}
                    onClick={(e) => {
                      e.stopPropagation();
                      const el = e.currentTarget;
                      setRowMenu((m) => (m?.slug === g.slug ? null : { slug: g.slug, el }));
                    }}
                    onKeyDown={(e) => {
                      if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const i = savedGroups.findIndex((x) => x.slug === g.slug);
                      if (i < 0) return;
                      const to = e.key === "ArrowUp" ? i - 1 : i + 1;
                      if (to < 0 || to >= savedGroups.length) return;
                      setSavedGroups((gs) => {
                        const next = [...gs];
                        const [row] = next.splice(i, 1);
                        next.splice(to, 0, row);
                        return next;
                      });
                      onStatus?.(t("Group order saved"), "ok");
                    }}>
                    <svg className="ic" viewBox="0 0 16 16" width={16} height={16} aria-hidden>
                      <rect x="3" y="3" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M6 8h4M8 6v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </button>
                  )}
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
                              }}>
                              <i className="dot" aria-hidden />
                              <span className="n">{short}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : g.memberNames.length || g.members.length ? (
                      <div className="mem">
                        {(g.memberNames.length ? g.memberNames : g.members).join(" · ")}
                      </div>
                    ) : null}
                    {(g.patterns || []).map((pat) => (
                      <div key={pat} className="mem pat none">
                        <code>{pat}</code>
                        {" · "}
                        {t("matches nothing now")}
                      </div>
                    ))}
                  </div>
                  <div className="tags">
                    <span className="tag">{t(g.routing === "" || g.routing === "smart" ? "Smart" : g.routing === "order" ? "In order" : g.routing === "rotate" ? "In turn" : g.routing === "usage" ? "Least used" : g.routing === "pace" ? "Weekly pace" : g.routing === "weight" ? "By weight" : g.routing === "manual" ? "Manual" : "Smart")}</span>
                    {g.rules > 0 ? (
                      <span className="tag">{t(g.rules === 1 ? "1 rule" : "{n} rules", { n: g.rules })}</span>
                    ) : null}
                    <span className="tag bad">{t("no member ready")}</span>
                  </div>
                  {!selecting ? (
                  <button
                    type="button"
                    className="text"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditGroup(g);
                      setTemplateSeed(null);
                      setGroupEditorOpen(true);
                    }}>
                    {t("Edit")}
                  </button>
                  ) : null}
                  {!selecting ? (
                  <button
                    type="button"
                    className={`lib-switch rt-gon${g.on ? " on" : ""}`}
                    role="switch"
                    aria-checked={g.on}
                    aria-label={g.name}
                    title={
                      g.on
                        ? t("On: agents may pick {name}. Click to switch it off.", {
                            name: g.name || g.slug,
                          })
                        : t("Off: agents aren't offered {name} and a request to it is turned away. Click to switch it on.", {
                            name: g.name || g.slug,
                          })
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      setSavedGroups((gs) => gs.map((x) => (x.slug === g.slug ? { ...x, on: !x.on } : x)));
                    }}>
                    <i />
                  </button>
                  ) : null}
                </div>
                  );
                });
              })()}
            </div>
          ) : null}

          {rowMenu ? (
            <GroupRowMenu
              anchor={rowMenu.el}
              canMove={savedGroups.length > 1}
              index={savedGroups.findIndex((x) => x.slug === rowMenu.slug)}
              count={savedGroups.length}
              group={savedGroups.find((x) => x.slug === rowMenu.slug)!}
              onClose={() => setRowMenu(null)}
              onMoveUp={() => {
                const i = savedGroups.findIndex((x) => x.slug === rowMenu.slug);
                if (i <= 0) return;
                setSavedGroups((gs) => {
                  const next = [...gs];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  return next;
                });
                onStatus?.(t("Group order saved"), "ok");
              }}
              onMoveDown={() => {
                const i = savedGroups.findIndex((x) => x.slug === rowMenu.slug);
                if (i < 0 || i >= savedGroups.length - 1) return;
                setSavedGroups((gs) => {
                  const next = [...gs];
                  [next[i], next[i + 1]] = [next[i + 1], next[i]];
                  return next;
                });
                onStatus?.(t("Group order saved"), "ok");
              }}
              onDuplicate={() => {
                const src = savedGroups.find((x) => x.slug === rowMenu.slug);
                if (!src) return;
                const { name, slug } = uniqueGroupName(t("{name} copy", { name: src.name }), savedGroups);
                setSavedGroups((gs) => {
                  const i = gs.findIndex((x) => x.slug === src.slug);
                  const copy: SavedGroupDraft = {
                    ...src,
                    name,
                    slug,
                    members: [...src.members],
                    memberNames: [...src.memberNames],
                    patterns: [...(src.patterns || [])],
                    weights: { ...src.weights },
                    levels: [...src.levels],
                  };
                  const next = [...gs];
                  next.splice(i + 1, 0, copy);
                  return next;
                });
                onStatus?.(t("Duplicated {name}", { name: src.name }), "ok");
              }}
              onCopyShare={() => {
                const src = savedGroups.find((x) => x.slug === rowMenu.slug);
                if (!src) return;
                const payload = {
                  magpie: "routing-group",
                  version: 1,
                  group: {
                    id: src.slug,
                    name: src.name,
                    members: src.members,
                    match: src.patterns || [],
                  },
                };
                const textBlob = JSON.stringify(payload);
                const done = () =>
                  onStatus?.(
                    t("{name} copied: paste it into Import on another magpie's Routing page", {
                      name: src.name,
                    }),
                    "ok",
                  );
                if (navigator.clipboard?.writeText) {
                  navigator.clipboard.writeText(textBlob).then(done, done);
                } else {
                  done();
                }
              }}
            />
          ) : null}

          {removeAsk ? (
            <div
              className="modal"
             
              onClick={(e) => {
                if (e.target === e.currentTarget) setRemoveAsk(null);
              }}>
              <div
                className="dialog sm"
                role="alertdialog"
                aria-labelledby="rtRemoveGroupsTitle"
               
              >
                <div className="ehead">
                  <b id="rtRemoveGroupsTitle">
                    {t("Remove {name}?", {
                      name: removeAsk.map((g) => g.name).join(", "),
                    })}
                  </b>
                </div>
                <p>
                  {removeAsk.length === 1
                    ? t("This routing group will no longer be available to agents.")
                    : t("These routing groups will no longer be available to agents.")}
                </p>
                <div className="bar">
                  <span className="grow" />
                  <button type="button" className="text" onClick={() => setRemoveAsk(null)}>
                    {t("Cancel")}
                  </button>
                  <button
                    type="button"
                    className="text"
                   
                    onClick={() => {
                      const n = removeAsk.length;
                      const slugs = new Set(removeAsk.map((g) => g.slug));
                      setSavedGroups((gs) => gs.filter((g) => !slugs.has(g.slug)));
                      setRemoveAsk(null);
                      setSelecting(false);
                      setPickedSlugs(new Set());
                      onStatus?.(
                        n === 1
                          ? t("{name} removed", { name: removeAsk[0].name })
                          : t("{n} groups removed", { n }),
                        "ok",
                      );
                    }}>
                    {t("Remove")}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {demoGroups && !savedGroups.length && !groupEditorOpen ? (
            <div className="list rt-groups">
              <div className="none rt-gnone">
                {foundOn
                  ? t(
                      "No group yet. A model two of your providers serve becomes one on its own; New group makes one of any models you like.",
                    )
                  : t("No group yet. New group makes one of any models you like.")}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      ) : null}
    </main>
  );
}
