import { useEffect, useMemo, useRef, useState } from "react";
import { ModelPop, type PopOption } from "./ModelPop";
import { ProtoMultiMenu } from "./ProtoMultiMenu";
import { Segs } from "./Segs";
import { t } from "../i18n";
import { dragRows } from "../lib/dragRows";

/** Magpie routing.js GROUP_ROUTE_OPTS / LIST_OPTS / SINK / FIRST / PATIENCE / CTX / AFF / EFFORT / LEVELS */

const LIST_OPTS = [
  { id: "" as const, label: "Its models too" },
  { id: "unlists" as const, label: "The group alone" },
];
const LIST_HINT: Record<string, string> = {
  "": "Agents' model lists and the gateway's /v1/models show the group and each of its models.",
  unlists:
    "Agents' model lists and the gateway's /v1/models show the group, not the models it names or its patterns match: they are used through it. A request naming one is still answered.",
};

const GROUP_ROUTE_OPTS = [
  { id: "" as const, label: "Smart" },
  { id: "order" as const, label: "In order" },
  { id: "rotate" as const, label: "In turn" },
  { id: "usage" as const, label: "Least used" },
  { id: "pace" as const, label: "Weekly pace" },
  { id: "weight" as const, label: "By weight" },
  { id: "manual" as const, label: "Manual" },
];
const GROUP_HINT: Record<string, string> = {
  "": "Smart, over the members' accounts and keys together: of the subscriptions with quota to spare, the one whose allowance renews soonest goes first — the week decides, and an account with five hours and no week (Claude Enterprise) goes by its five hours, so ahead of every week renewing later; one resting after a failure goes last.",
  order: "In order: the first model until it can't answer, then the next — each over its own accounts or keys as its provider routes them.",
  rotate: "In turn: each conversation's next turn goes to the next member's account or key, spreading the load.",
  usage: "Least used first: the account or key with the most of its allowance left goes first.",
  pace: "Weekly pace: the account with the most of its week left per hour until it renews goes first, so less of each member's week is lost at its reset — an account with five hours and no week (Claude Enterprise) by what its five hours have left per hour until they renew, so almost always first; a key by the tokens magpie sent it lately.",
  weight:
    "By weight: each member takes requests in proportion to its weight (set beside it). A model weighing 3 takes three for every one a model weighing 1 takes.",
  manual:
    "Manual: every request goes to the model you pick on the group's card, over its own accounts or keys; the others, and the rules, wait until you pick another — none takes over when it fails.",
};
const GROUP_NEST =
  "A group among the models, and a model whose provider routes its accounts or keys other than Smart, keeps its own routing: this group only picks between it and the others, weighing it by the account or key it would try first, then tries it whole in its own order.";

const SINK_OPTS = [
  { id: "" as const, label: "Keeps its place" },
  { id: "sink" as const, label: "Goes to the back" },
];
const SINK_HINT: Record<string, string> = {
  "": "One rate limited while it still has quota rests as long as the vendor asks, then takes its place in the order again.",
  sink: "One rate limited (429) while it still has quota goes to the back of the order, behind every one not rate limited since, and comes round again once those ahead of it are rate limited in turn — so the load goes round rather than back to the first each time. Out of quota, it rests as usual. Kept until magpie restarts.",
};

const FIRST_OPTS = [
  { id: 0 as const, label: "Wait" },
  { id: 30 as const, label: "30 s" },
  { id: 60 as const, label: "1 min" },
  { id: 120 as const, label: "2 min" },
  { id: "custom" as const, label: "Custom" },
];

const PATIENCE_OPTS = [
  { id: -1 as const, label: "Off" },
  { id: 0 as const, label: "1 min" },
  { id: 120 as const, label: "2 min" },
  { id: 240 as const, label: "4 min" },
];

const CTX_OPTS = [
  { id: "largest" as const, label: "Largest model's" },
  { id: "smallest" as const, label: "Smallest model's" },
  { id: "custom" as const, label: "Custom" },
];

const AFF_OPTS = [
  { id: "" as const, label: "Auto" },
  { id: "session" as const, label: "Session" },
  { id: "turn" as const, label: "Within a turn" },
  { id: "off" as const, label: "Off" },
  { id: "strict" as const, label: "Strict" },
];
const AFF_HINT: Record<string, string> = {
  "": "A conversation stays with the account or key that answered it while what the vendor cached of it is worth keeping — within a turn always, across turns while it's fresh.",
  session: "A conversation stays with the account or key that answered it for the whole session, while it can answer.",
  turn: "A conversation stays put within a turn, while the agent sends tool results back; when you speak again, routing decides afresh.",
  off: "Every request is routed afresh, whoever answered its conversation before.",
  strict:
    "A conversation stays with the account or key that answered it and never moves to another, even past its usage cap: when that one is rate limited or out of quota, the error goes to the agent. New conversations are routed as usual.",
};

const LEVELS = ["none", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
const REASON_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;

const DEMO_MODELS: PopOption[] = [
  { value: "claude-opus-4-1", label: "opus", group: "Anthropic", note: "claude-opus-4-1", ref: "claude-opus-4-1" },
  { value: "claude-sonnet-4-5", label: "sonnet", group: "Anthropic", note: "claude-sonnet-4-5", ref: "claude-sonnet-4-5" },
  { value: "claude-haiku-4-5", label: "haiku", group: "Anthropic", note: "claude-haiku-4-5", ref: "claude-haiku-4-5" },
  { value: "gpt-5", label: "gpt-5", group: "OpenAI", note: "gpt-5", ref: "gpt-5" },
  { value: "gemini-2.5-pro", label: "gemini-2.5-pro", group: "Google", note: "gemini-2.5-pro", ref: "gemini-2.5-pro" },
];

const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
const WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_NAMES: Record<(typeof WEEK)[number], string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const DEMO_AGENTS = [
  { id: "claude-code", name: "Claude Code" },
  { id: "claude-desktop", name: "Claude Desktop" },
  { id: "claude-science", name: "Claude Science" },
  { id: "codex", name: "Codex" },
  { id: "gemini-cli", name: "Gemini CLI" },
  { id: "antigravity-cli", name: "Antigravity CLI" },
  { id: "opencode", name: "OpenCode" },
  { id: "openchamber", name: "OpenChamber" },
  { id: "mimo-code", name: "MiMo Code" },
  { id: "prime-agent", name: "Prime Agent" },
  { id: "goose", name: "Goose" },
  { id: "cursor", name: "Cursor" },
  { id: "cursor-private", name: "Cursor Private Inference" },
  { id: "zed", name: "Zed" },
  { id: "vscode", name: "VS Code" },
  { id: "vscode-insiders", name: "VS Code Insiders" },
  { id: "vscodium", name: "VSCodium" },
  { id: "copilot-jetbrains", name: "Copilot (JetBrains)" },
  { id: "jetbrains-air", name: "JetBrains Air" },
  { id: "reasonix-studio", name: "Reasonix Studio" },
  { id: "command-code", name: "Command Code" },
  { id: "fx", name: "fx" },
  { id: "omp", name: "omp" },
  { id: "devin", name: "Devin" },
  { id: "hermes-agent", name: "Hermes Agent" },
  { id: "mister-morph", name: "Mister Morph" },
  { id: "kimi-code", name: "Kimi Code" },
  { id: "qwen-code", name: "Qwen Code" },
  { id: "muse-code", name: "Muse Code" },
  { id: "empryo", name: "Empryo" },
  { id: "ante", name: "Ante" },
  { id: "astrbot", name: "AstrBot" },
  { id: "jcode", name: "jcode" },
  { id: "minimax-code", name: "MiniMax Code" },
  { id: "droid", name: "Droid" },
  { id: "cline", name: "Cline" },
  { id: "qoder", name: "Qoder" },
  { id: "qoder-cn", name: "Qoder CN" },
  { id: "grok-build", name: "Grok Build" },
  { id: "grok-app", name: "Grok App" },
  { id: "zcode", name: "ZCode" },
  { id: "workbuddy", name: "WorkBuddy" },
  { id: "pencil", name: "Pencil" },
  { id: "t3-code", name: "T3 Code" },
  { id: "openhanako", name: "OpenHanako" },
  { id: "atomcode", name: "AtomCode" },
  { id: "snow-cli", name: "Snow CLI" },
  { id: "alma", name: "Alma" },
  { id: "cindy", name: "Cindy" },
  { id: "magpie", name: "magpie" },
  { id: "curl", name: "curl" },
  { id: "pi-desktop", name: "PI-Desktop" },
];

/** Demo classifier / decision models (Magpie groups.deciders + models). */
const DEMO_CLASSIFIERS: PopOption[] = [
  { value: "jev/jev", label: "Jev", group: "Decision", note: "jev", ref: "jev/jev" },
  { value: "claude-haiku-4-5", label: "haiku", group: "Anthropic", note: "claude-haiku-4-5", ref: "claude-haiku-4-5" },
  { value: "gpt-5-mini", label: "gpt-5-mini", group: "OpenAI", note: "gpt-5-mini", ref: "gpt-5-mini" },
];

type RuleTime = { from: string; to: string; days: string[] };

type Rule = {
  use: string;
  pause: boolean;
  tokens: number;
  images: boolean;
  effort: string;
  agents: string[];
  intent: string;
  compact: boolean;
  folders: string[];
  exceptFolders: string[];
  time: RuleTime | null;
  /** Conditions pinned via + Add a condition (may still be empty / dashed). */
  pins: string[];
};

type Member = {
  id: string;
  name: string;
  on: boolean;
  fixed: string; // "" = Follow the group
};

type Draft = {
  name: string;
  members: Member[];
  patterns: string[];
  unlists: "" | "unlists";
  routing: string;
  sink: "" | "sink";
  firstToken: number; // seconds; 0 = Wait
  firstCustom: boolean;
  patience: number; // -1 Off, 0 → 1 min, …
  context: "largest" | "smallest" | "custom";
  contextTokens: string;
  affinity: string;
  effort: "" | "auto";
  classifier: string;
  weights: Record<string, number>;
  levelsOwn: boolean;
  levels: string[];
  rules: Rule[];
};

function clockOf(v: string): string {
  const m = String(v || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return "";
  const h = +m[1],
    min = +m[2];
  if (h > 23 || min > 59) return "";
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function daysText(days: string[] | undefined): string {
  const on = WEEK.map((d) => (days || []).includes(d));
  const out: string[] = [];
  let i = 0;
  while (i < 7) {
    if (!on[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < 7 && on[j + 1]) j++;
    if (j - i >= 2) out.push(`${t(DAY_NAMES[WEEK[i]])}–${t(DAY_NAMES[WEEK[j]])}`);
    else for (let k = i; k <= j; k++) out.push(t(DAY_NAMES[WEEK[k]]));
    i = j + 1;
  }
  return out.join(", ");
}

function emptyRule(use: string): Rule {
  return {
    use,
    pause: false,
    tokens: 0,
    images: false,
    effort: "",
    agents: [],
    intent: "",
    compact: false,
    folders: [],
    exceptFolders: [],
    time: null,
    pins: [],
  };
}

function pinRule(r: Rule, pin: string): Rule {
  return r.pins.includes(pin) ? r : { ...r, pins: [...r.pins, pin] };
}

function unpinRule(r: Rule, pin: string): Rule {
  const pins = r.pins.filter((p) => p !== pin);
  const next: Rule = { ...r, pins };
  if (pin === "tokens") next.tokens = 0;
  if (pin === "images") next.images = false;
  if (pin === "effort") next.effort = "";
  if (pin === "agents") next.agents = [];
  if (pin === "compact") next.compact = false;
  if (pin === "folders") next.folders = [];
  if (pin === "exceptFolders") next.exceptFolders = [];
  if (pin === "time") next.time = null;
  return next;
}

function ruleHasPin(r: Rule, pin: string): boolean {
  if (r.pins.includes(pin)) return true;
  if (pin === "tokens") return !!r.tokens;
  if (pin === "images") return !!r.images;
  if (pin === "effort") return !!r.effort;
  if (pin === "agents") return r.agents.length > 0;
  if (pin === "compact") return !!r.compact;
  if (pin === "folders") return r.folders.length > 0;
  if (pin === "exceptFolders") return r.exceptFolders.length > 0;
  if (pin === "time") return !!r.time;
  return false;
}

function slug(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "group";
}

function fixedWords(level: string) {
  return t("{level} reasoning", { level });
}

function splitMember(id: string): [string, string] {
  const i = id.lastIndexOf(":");
  if (i < 0) return [id, ""];
  const base = id.slice(0, i);
  const fixed = id.slice(i + 1);
  if (REASON_LEVELS.includes(fixed as (typeof REASON_LEVELS)[number])) return [base, fixed];
  return [id, ""];
}

function memberDisplay(m: Member) {
  const [, fixed] = splitMember(m.id);
  return fixed ? `${m.name}:${fixed}` : m.name;
}

function emptyDraft(): Draft {
  return {
    name: "",
    members: [],
    patterns: [],
    unlists: "",
    routing: "",
    sink: "",
    firstToken: 0,
    firstCustom: false,
    patience: 0,
    context: "largest",
    contextTokens: "",
    affinity: "",
    effort: "",
    classifier: "",
    weights: {},
    levelsOwn: false,
    levels: ["low", "medium", "high"],
    rules: [],
  };
}

function draftSnapshot(d: Draft) {
  return JSON.stringify(d);
}


/** Magpie rule ⋯ menu (shots 94–95): Move up/down, Pause the model instead, Remove rule */
function RuleMoreMenu({
  anchor,
  index,
  count,
  onMove,
  onPause,
  onRemove,
  onClose,
}: {
  anchor: HTMLElement;
  index: number;
  count: number;
  onMove: (to: number) => void;
  onPause: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
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
    const left = Math.max(pad, Math.min(r.right - w, window.innerWidth - w - pad));
    box.style.left = `${left}px`;
    box.style.top = `${Math.max(pad, y)}px`;
    const outside = (e: MouseEvent) => {
      if (!box.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose();
    };
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        anchor.focus({ preventScroll: true });
      }
    };
    document.addEventListener("mousedown", outside, true);
    document.addEventListener("keydown", keys, true);
    return () => {
      document.removeEventListener("mousedown", outside, true);
      document.removeEventListener("keydown", keys, true);
    };
  }, [anchor, onClose]);

  const items: { name: string; icon: string; off?: boolean; sep?: boolean; run: () => void }[] = [
    {
      name: t("Move up"),
      icon: "M8 12V4M5 7l3-3 3 3",
      off: index <= 0,
      run: () => onMove(index - 1),
    },
    {
      name: t("Move down"),
      icon: "M8 4v8M5 9l3 3 3-3",
      off: index >= count - 1,
      run: () => onMove(index + 1),
    },
    {
      name: t("Pause the model instead"),
      icon: "M5 3.5h2.2v9H5zM8.8 3.5H11v9H8.8z",
      sep: true,
      run: () => onPause(),
    },
    {
      name: t("Remove rule"),
      icon: "M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5",
      run: () => onRemove(),
    },
  ];

  return (
    <div className="pop row-menu" role="menu" ref={boxRef} style={{ position: "fixed", zIndex: 50 }}>
      {items.map((o) => (
        <span key={o.name} style={{ display: "contents" }}>
          {o.sep ? <div className="rm-sep" /> : null}
          <button
            type="button"
            className="rm-item"
            role="menuitem"
            disabled={!!o.off}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              o.run();
            }}
          >
            <svg viewBox="0 0 16 16" width={13} height={13} aria-hidden>
              <path d={o.icon} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="rm-name">{o.name}</span>
          </button>
        </span>
      ))}
    </div>
  );
}

export type SavedGroupDraft = {
  name: string;
  slug: string;
  members: string[];
  memberNames: string[];
  routing: string;
  rules: number;
  levels: string[];
  on: boolean;
};

type Props = {
  open: boolean;
  nameSuffixOn: boolean;
  onClose: () => void;
  onSaved: (group: SavedGroupDraft) => void;
  onRemoved?: () => void;
  onStatus?: (msg: string, kind?: string) => void;
  /** Prefill when starting from a Magpie template card (mock). */
  templateSeed?: { name: string; memberIds: string[] } | null;
  /** Edit an existing saved group (footer Remove / Cancel / Save). */
  editGroup?: SavedGroupDraft | null;
};

/**
 * Magpie New group editor (routing.js renderGroupEditor / shots 03–22).
 * Motion: segs thumb 280ms; #pop pop-fade .18s + pop-in .42s; discard dialog pop-in .28s;
 * member sort .22s cubic-bezier(.22,1,.36,1); rt-gadd hover .15s.
 */
export function GroupEditor({ open, nameSuffixOn, onClose, onSaved, onRemoved, onStatus, templateSeed, editGroup }: Props) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [was, setWas] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [reasonFor, setReasonFor] = useState<number | null>(null);
  const [patIn, setPatIn] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [condMenuFor, setCondMenuFor] = useState<number | null>(null);
  const [firstErr, setFirstErr] = useState("");
  const [ctxErr, setCtxErr] = useState("");
  const [weightEdit, setWeightEdit] = useState<string | null>(null);
  const [weightDraft, setWeightDraft] = useState("1");
  const [popKind, setPopKind] = useState<null | { kind: string; rule: number }>(null);
  const [clsOpen, setClsOpen] = useState(false);
  const [askingRule, setAskingRule] = useState<number | null>(null);
  const [ruleMenuFor, setRuleMenuFor] = useState<number | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const reasonBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const weightBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const condBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const clsBtnRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const intentFocusRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const d = emptyDraft();
    if (editGroup) {
      d.name = editGroup.name === editGroup.slug ? "" : editGroup.name;
      d.members = editGroup.members.map((id, i) => {
        const known = DEMO_MODELS.find((m) => m.value === id || m.label === id);
        const name = editGroup.memberNames[i] || known?.label || id.split("/").pop() || id;
        const [, fixed] = splitMember(id);
        return { id, name: name.includes(":") ? name.split(":")[0] : name, on: true, fixed };
      });
      d.routing = editGroup.routing;
      d.levelsOwn = true;
      d.levels = editGroup.levels.length ? [...editGroup.levels] : ["low", "medium", "high"];
      if (d.members.length >= 2 && editGroup.rules > 0) {
        const r = emptyRule(d.members[d.members.length - 1].id);
        r.effort = "high";
        r.pins = ["effort"];
        d.rules = [r];
      }
    } else if (templateSeed) {
      d.name = templateSeed.name;
      d.members = templateSeed.memberIds.map((id) => {
        const known = DEMO_MODELS.find((m) => m.value === id || m.label === id);
        return { id, name: known?.label || id.split("/").pop() || id, on: true, fixed: "" };
      });
      if (d.members.length >= 2) {
        d.rules = [emptyRule(d.members[d.members.length - 1].id)];
        d.effort = "auto";
        d.classifier = DEMO_CLASSIFIERS[0]?.value || "";
      }
    }
    setDraft(d);
    setWas(draftSnapshot(d));
    setAddOpen(false);
    setReasonFor(null);
    setPatIn("");
    setDiscardOpen(false);
    setRemoveOpen(false);
    setCondMenuFor(null);
    setFirstErr("");
    setCtxErr("");
    setWeightEdit(null);
    setPopKind(null);
    setClsOpen(false);
    setAskingRule(null);
    setRuleMenuFor(null);
    const tmr = window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 0);
    return () => clearTimeout(tmr);
  }, [open, templateSeed, editGroup]);

  const dirty = useMemo(() => open && was !== "" && draftSnapshot(draft) !== was, [open, draft, was]);

  if (!open) return null;

  const idOf = () => slug(draft.name);
  const sinkable = draft.routing !== "rotate" && draft.routing !== "weight" && draft.routing !== "manual";

  const firstMode = draft.firstCustom
    ? "custom"
    : ([0, 30, 60, 120] as const).includes(draft.firstToken as 0 | 30 | 60 | 120)
      ? draft.firstToken
      : "custom";

  const askClose = () => {
    if (dirty) setDiscardOpen(true);
    else onClose();
  };

  const doDiscard = () => {
    setDiscardOpen(false);
    onClose();
  };

  const addMember = (raw: string) => {
    const id = raw.trim();
    if (!id) return;
    const known = DEMO_MODELS.find((m) => m.value === id || m.label === id || m.ref === id);
    const name = known?.label || id.split("/").pop() || id;
    const value = known?.value || id;
    setDraft((d) => {
      if (d.members.some((m) => splitMember(m.id)[0] === splitMember(value)[0] && !m.id.includes(":"))) {
        return d;
      }
      if (d.members.some((m) => m.id === value)) return d;
      return {
        ...d,
        members: [...d.members, { id: value, name, on: true, fixed: "" }],
      };
    });
    /* Magpie multi: pop stays open for another */
  };

  const setMemberFixed = (i: number, fixed: string) => {
    setDraft((d) => {
      const next = d.members.map((m, j) => {
        if (j !== i) return m;
        const [base] = splitMember(m.id);
        const id = fixed ? `${base}:${fixed}` : base;
        return { ...m, id, fixed };
      });
      return { ...d, members: next };
    });
    setReasonFor(null);
  };

  const moveMember = (from: number, to: number) => {
    if (to < 0 || to >= draft.members.length || to === from) return;
    setDraft((d) => {
      const members = [...d.members];
      members.splice(to, 0, members.splice(from, 1)[0]);
      return { ...d, members };
    });
  };

  const addPattern = () => {
    const p = patIn.trim();
    if (!p) return;
    if (!p.includes("*") && !p.startsWith("re:")) return;
    setDraft((d) => (d.patterns.includes(p) ? d : { ...d, patterns: [...d.patterns, p] }));
    setPatIn("");
  };

  const patienceWord = (n: number) => {
    const o = PATIENCE_OPTS.find((x) => x.id === n);
    return o ? t(o.label) : `${n}s`;
  };

  const firstHint = firstErr
    ? firstErr
    : draft.firstToken
      ? t(
          "A member that hasn't begun answering after {n} — no text, reasoning or tool call yet — is let go and the next one asked, before any of it reaches the agent. It doesn't rest; the last one left is always waited for. Only for streamed requests.",
          { n: `${draft.firstToken} s` },
        )
      : t("Every member is waited for, however long it takes to begin answering.");

  const patienceHint =
    draft.patience < 0
      ? t("When every member has failed, the agent gets the last one's error at once.")
      : t(
          "When every member has failed with an error that may pass — overloaded, unavailable, rate limited for a moment — and nothing of the reply has reached the agent, each is asked again after a pause, longer each time and never shorter than the vendor asks, for up to {n} more. A streaming agent is kept waiting meanwhile.",
          { n: patienceWord(draft.patience) },
        );

  const formatCtxTokens = (raw: string) => {
    const m = String(raw || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, "")
      .match(/^(\d+(?:\.\d+)?)\s*([km]?)$/);
    if (!m) return raw.trim() || "…";
    let n = parseFloat(m[1]);
    if (m[2] === "k") n *= 1000;
    if (m[2] === "m") n *= 1_000_000;
    return Math.round(n).toLocaleString("en-US");
  };

  const ctxHint = ctxErr
    ? ctxErr
    : draft.context === "custom"
      ? t("Agents are told the group takes {n} tokens; a longer conversation still goes on to a member with room for it.", {
          n: formatCtxTokens(draft.contextTokens),
        })
      : draft.context === "smallest"
        ? t("Agents are told its smallest model's window, so they compact before any member would turn the conversation away.")
        : t("Agents are told its largest model's window; a conversation too long for one member goes on to one with room for it.");

  const warn = (msg: string) => onStatus?.(msg, "warn");

  const save = () => {
    if (!draft.members.length && !draft.patterns.length) {
      addBtnRef.current?.focus({ preventScroll: true });
      warn(t("A group needs a model in it"));
      return;
    }
    const rules = draft.rules.map((r) => ({ ...r, intent: (r.intent || "").trim() }));
    const bare = rules.findIndex(
      (r) =>
        !r.pause &&
        !r.tokens &&
        !r.images &&
        !r.effort &&
        !r.agents.length &&
        !r.intent &&
        !r.compact &&
        !r.time &&
        !r.folders.length &&
        !r.exceptFolders.length,
    );
    if (bare >= 0) {
      warn(t("Rule {n} needs a condition", { n: bare + 1 }));
      return;
    }
    const bareP = rules.findIndex(
      (r) => r.pause && !r.time && !r.agents.length && !r.folders.length && !r.exceptFolders.length,
    );
    if (bareP >= 0) {
      warn(t("Rule {n}: a pause needs hours, days, agents or folders", { n: bareP + 1 }));
      return;
    }
    if (rules.some((r) => r.intent) && !draft.classifier) {
      warn(t("Choose the model that tells which intent a message is"));
      return;
    }
    if (draft.effort === "auto" && !draft.classifier) {
      warn(t("Choose the model that rates how hard a turn is"));
      return;
    }
    if (draft.levelsOwn && !draft.levels.length) {
      warn(t("Pick a level to offer, or leave them to its models"));
      return;
    }
    const name = draft.name.trim() || idOf();
    const payload: SavedGroupDraft = {
      name,
      slug: idOf(),
      members: draft.members.map((m) => m.id),
      memberNames: draft.members.map((m) => memberDisplay(m)),
      routing: draft.routing,
      rules: rules.length,
      levels: draft.levelsOwn ? [...draft.levels] : ["low", "medium", "high"],
      on: true,
    };
    onStatus?.(t(editGroup ? "{name} saved" : "{name} added", { name }), "ok");
    onSaved(payload);
    onClose();
  };

  const reasonOpts: PopOption[] = [
    { value: "", label: t("Follow the group"), note: t("as the group's effort says") },
    ...REASON_LEVELS.map((v) => ({
      value: v,
      label: fixedWords(v),
      note: t("whatever the agent asks"),
    })),
  ];

  return (
    <>
      <div className="editor rt-gedit card" style={{ marginTop: 8, animation: "pop-in .42s cubic-bezier(.16,1,.3,1)" }}>
        <div className="ehead">
          <b>{t(editGroup ? "Edit group" : "New group")}</b>
        </div>

        <label>{t("Name")}</label>
        <div>
          <input
            ref={nameRef}
            type="text"
            value={draft.name}
            placeholder={t("e.g. Opus anywhere")}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Escape") askClose();
              if (e.key === "Enter") save();
            }}
          />
          <div className="hint">{t("Agents pick it as {id}", { id: `group/${idOf()}` })}</div>
        </div>

        <label>{t("In agents’ lists")}</label>
        <div className="gsuffix">
          <span className="hint">
            {t("Agents’ lists show “{label}”", {
              label: (draft.name.trim() || t("New group")) + (nameSuffixOn ? " · routing group" : ""),
            })}
            {" · "}
            {t("“· routing group” is set for every group above")}
          </span>
        </div>

        <label>{t("Models")}</label>
        <div>
          <div className="fallback">
            <div className="fbl">
              {draft.members.map((m, i) => (
                <div key={`${m.id}-${i}`} className={`fbrow${m.on ? "" : " muted"}`}>
                  <button
                    type="button"
                    className={`lib-switch rt-mon${m.on ? " on" : ""}`}
                    role="switch"
                    aria-checked={m.on}
                    aria-label={m.name}
                    title={
                      m.on
                        ? t("On: requests may go to it. Click to switch it off and keep its place")
                        : t("Off: kept in its place, sent nothing. Click to switch it on")
                    }
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        members: d.members.map((x, j) => (j === i ? { ...x, on: !x.on } : x)),
                      }))
                    }
                  >
                    <i />
                  </button>
                  <button
                    type="button"
                    className="i ag-handle rt-mhandle"
                    data-at={i}
                    title={t("Drag to reorder · Alt+↑/↓ to move")}
                    aria-label={t("Move {name}", { name: m.name })}
                    onPointerDown={(e) => {
                      if (e.button !== 0 || e.isPrimary === false || draft.members.length < 2) return;
                      const handle = e.currentTarget;
                      const row = handle.closest(".fbrow") as HTMLElement | null;
                      const list = handle.closest(".fbl") as HTMLElement | null;
                      if (!row || !list) return;
                      const rows = [...list.querySelectorAll<HTMLElement>(":scope > .fbrow")];
                      dragRows(e, {
                        handle,
                        row,
                        list,
                        rows,
                        pointerId: e.pointerId,
                        clientY: e.clientY,
                        onCommit: (to) => moveMember(i, to),
                      });
                    }}
                    onKeyDown={(e) => {
                      if (!e.altKey) return;
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        moveMember(i, i - 1);
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        moveMember(i, i + 1);
                      }
                    }}
                  >
                    {i + 1}
                  </button>
                  <svg className="ic" viewBox="0 0 16 16" width={14} height={14} aria-hidden>
                    <path d="M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z" fill="none" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                  <span className="n">
                    <span style={m.on ? undefined : { textDecoration: "line-through", color: "var(--muted)" }}>{memberDisplay(m)}</span>
                  </span>
                  <span className="grow" />
                  <button
                    type="button"
                    className={`rt-cond rt-fixed${m.fixed ? " on" : ""}`}
                    ref={(el) => {
                      reasonBtnRefs.current[i] = el;
                    }}
                    title={
                      m.fixed
                        ? t("Sent at {level} reasoning whatever the agent asks, at the model's nearest level", { level: m.fixed })
                        : t("Reasons as the group's effort says")
                    }
                    onClick={() => setReasonFor((cur) => (cur === i ? null : i))}
                  >
                    {m.fixed ? fixedWords(m.fixed) : t("Group's reasoning")}
                  </button>
                  {draft.routing === "weight" ? (
                    weightEdit === m.id ? (
                      <input
                        className="rt-weight-in"
                        type="number"
                        min={1}
                        max={1000}
                        aria-label={t("Weight of {name}", { name: m.name })}
                        title={t("Its share of the requests: a model weighing 3 takes three for every one a model weighing 1 takes")}
                        value={weightDraft}
                        autoFocus
                        onChange={(e) => setWeightDraft(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") {
                            const n = Math.round(Number(weightDraft));
                            if (n >= 1 && n <= 1000) {
                              setDraft((d) => {
                                const weights = { ...d.weights };
                                if (n > 1) weights[m.id] = n;
                                else delete weights[m.id];
                                return { ...d, weights };
                              });
                              setWeightEdit(null);
                            } else if (weightDraft.trim()) {
                              warn(t("A weight is 1 to 1000"));
                            } else setWeightEdit(null);
                          } else if (e.key === "Escape") setWeightEdit(null);
                        }}
                        onBlur={() => {
                          const n = Math.round(Number(weightDraft));
                          if (n >= 1 && n <= 1000) {
                            setDraft((d) => {
                              const weights = { ...d.weights };
                              if (n > 1) weights[m.id] = n;
                              else delete weights[m.id];
                              return { ...d, weights };
                            });
                          } else if (weightDraft.trim()) warn(t("A weight is 1 to 1000"));
                          setWeightEdit(null);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className={`rt-cond rt-fixed rt-weight${(draft.weights[m.id] || 1) > 1 ? " on" : ""}`}
                        ref={(el) => {
                          weightBtnRefs.current[m.id] = el;
                        }}
                        title={t("Its share of the requests: a model weighing 3 takes three for every one a model weighing 1 takes")}
                        onClick={() => {
                          const w = Math.max(draft.weights[m.id] || 0, 1);
                          setWeightDraft(String(w));
                          setWeightEdit(m.id);
                        }}
                      >
                        {(() => {
                          const w = Math.max(draft.weights[m.id] || 0, 1);
                          const total = draft.members.filter((x) => x.on).reduce((n, x) => n + Math.max(draft.weights[x.id] || 0, 1), 0);
                          return m.on
                            ? t("Weight {n} · {share}%", { n: w, share: Math.round((100 * w) / (total || 1)) })
                            : t("Weight {n}", { n: w });
                        })()}
                      </button>
                    )
                  ) : null}
                  <button
                    type="button"
                    className="text"
                    onClick={() =>
                      setDraft((d) => {
                        const removed = d.members[i]?.id;
                        const members = d.members.filter((_, j) => j !== i);
                        const weights = { ...d.weights };
                        if (removed) delete weights[removed];
                        const fallback = members[members.length - 1]?.id || "";
                        const rules = d.rules
                          .filter((r) => members.some((m) => m.id === r.use) || r.use === removed)
                          .map((r) => (r.use === removed ? { ...r, use: fallback } : r))
                          .filter((r) => members.some((m) => m.id === r.use));
                        return { ...d, members, weights, rules: members.length >= 2 ? rules : [] };
                      })
                    }
                  >
                    {t("Remove")}
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={`rt-gadd${addOpen ? " open" : ""}`}
              ref={addBtnRef}
              onClick={() => setAddOpen((o) => !o)}
            >
              <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M8 3.5v9M3.5 8h9" />
              </svg>
              <span>{t(draft.members.length ? "Add another model" : "Add a model")}</span>
            </button>
            <ModelPop
              open={addOpen}
              anchor={addBtnRef.current}
              value=""
              modelPicker
              keepOpen
              options={DEMO_MODELS}
              onPick={addMember}
              onClose={() => setAddOpen(false)}
            />
            {reasonFor != null ? (
              <ModelPop
                open
                anchor={reasonBtnRefs.current[reasonFor] || null}
                value={draft.members[reasonFor]?.fixed || ""}
                modelPicker={false}
                placeholder={t("Filter reasoning…")}
                options={reasonOpts}
                onPick={(v) => setMemberFixed(reasonFor, v)}
                onClose={() => setReasonFor(null)}
              />
            ) : null}
          </div>
          <div className="hint">{t("The first answers for what the model can do. In order, they are tried top first.")}</div>
        </div>

        <label>{t("Patterns")}</label>
        <div>
          <div className="fallback rt-pats">
            <div className="fbl">
              {draft.patterns.map((p) => (
                <div key={p} className="fbrow">
                  <span className="n">
                    <code>{p}</code>
                  </span>
                  <span className="grow" />
                  <button
                    type="button"
                    className="text"
                    onClick={() => setDraft((d) => ({ ...d, patterns: d.patterns.filter((x) => x !== p) }))}
                  >
                    {t("Remove")}
                  </button>
                </div>
              ))}
            </div>
            <div className="rt-patadd">
              <input
                type="text"
                value={patIn}
                placeholder={t("e.g. openrouter/*:free or re:…")}
                onChange={(e) => setPatIn(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") addPattern();
                  if (e.key === "Escape") askClose();
                }}
              />
              <button type="button" className="text" onClick={addPattern}>
                {t("Add pattern")}
              </button>
            </div>
          </div>
          <div className="hint">
            {t(
              "Every model a pattern matches is in the group, now and as providers list new ones, after the models above: * is any run of characters in provider/model, re: starts a regular expression.",
            )}
          </div>
        </div>

        <label>{t("Model lists")}</label>
        <div>
          <Segs
            className="list-pick"
            value={draft.unlists}
            items={LIST_OPTS.map((o) => ({ id: o.id, label: t(o.label) }))}
            onChange={(v) => setDraft((d) => ({ ...d, unlists: v }))}
            aria-label={t("Model lists")}
          />
          <div className="hint">{t(LIST_HINT[draft.unlists])}</div>
        </div>

        <label>{t("Routing")}</label>
        <div>
          <Segs
            value={draft.routing}
            items={GROUP_ROUTE_OPTS.map((o) => ({ id: o.id, label: t(o.label) }))}
            onChange={(v) => setDraft((d) => ({ ...d, routing: v }))}
            aria-label={t("Routing")}
          />
          <div className="hint">{t(GROUP_HINT[draft.routing] || GROUP_HINT[""])}</div>
          <div className="hint">{t(GROUP_NEST)}</div>
        </div>

        {sinkable ? (
          <>
            <label>{t("Rate limited")}</label>
            <div className="sink-wrap">
              <Segs
                className="sink-pick"
                value={draft.sink}
                items={SINK_OPTS.map((o) => ({ id: o.id, label: t(o.label) }))}
                onChange={(v) => setDraft((d) => ({ ...d, sink: v }))}
                aria-label={t("Rate limited")}
              />
              <div className="hint">{t(SINK_HINT[draft.sink])}</div>
            </div>
          </>
        ) : null}

        <label>{t("Slow to start")}</label>
        <div className="ctx-wrap first-wrap">
          <Segs
            value={firstMode as 0 | 30 | 60 | 120 | "custom"}
            items={FIRST_OPTS.map((o) => ({ id: o.id, label: t(o.label) }))}
            onChange={(v) => {
              setFirstErr("");
              if (v === "custom") {
                setDraft((d) => ({
                  ...d,
                  firstCustom: true,
                  // Magpie prefills from the last pill (shot 61: 2 from 2 min)
                  firstToken: d.firstToken > 0 ? d.firstToken : 120,
                }));
              } else {
                setDraft((d) => ({ ...d, firstCustom: false, firstToken: v as number }));
              }
            }}
            aria-label={t("Slow to start")}
          />
          {draft.firstCustom ? (
            <>
              <input
                className="ctx-in first-in"
                type="text"
                inputMode="decimal"
                aria-label={t("Minutes")}
                value={draft.firstToken > 0 ? String(+(draft.firstToken / 60).toFixed(2)) : ""}
                placeholder={t("e.g. 5")}
                onChange={(e) => {
                  const v = e.target.value.trim().replace(",", ".");
                  const n = /^\d+(?:\.\d+)?$/.test(v) ? Math.round(+v * 60) : 0;
                  setFirstErr(n > 0 ? "" : t("{v} is not a number of minutes", { v: e.target.value.trim() }));
                  if (n > 0) setDraft((d) => ({ ...d, firstToken: n }));
                }}
              />
              <span className="first-unit">{t("min")}</span>
            </>
          ) : null}
          <div className="hint">{firstHint}</div>
        </div>

        <label>{t("Every member busy")}</label>
        <div>
          <Segs
            value={draft.patience}
            items={PATIENCE_OPTS.map((o) => ({ id: o.id, label: t(o.label) }))}
            onChange={(v) => setDraft((d) => ({ ...d, patience: v }))}
            aria-label={t("Every member busy")}
          />
          <div className="hint">{patienceHint}</div>
        </div>

        <label>{t("Context")}</label>
        <div className="ctx-wrap">
          <Segs
            value={draft.context}
            items={CTX_OPTS.map((o) => ({ id: o.id, label: t(o.label) }))}
            onChange={(v) => {
              setCtxErr("");
              setDraft((d) => ({
                ...d,
                context: v,
                contextTokens: v === "custom" ? d.contextTokens || "200k" : d.contextTokens,
              }));
            }}
            aria-label={t("Context")}
          />
          {draft.context === "custom" ? (
            <input
              className="ctx-in"
              type="text"
              aria-label={t("Context")}
              value={draft.contextTokens}
              placeholder={t("e.g. 200k")}
              onChange={(e) => {
                const raw = e.target.value;
                const m = raw
                  .trim()
                  .toLowerCase()
                  .replace(/_/g, "")
                  .match(/^(\d+(?:\.\d+)?)\s*([km]?)$/);
                setCtxErr(m ? "" : t("{v} is not a length of tokens like 200k or 1m", { v: raw.trim() }));
                setDraft((d) => ({ ...d, contextTokens: raw }));
              }}
            />
          ) : null}
          <div className="hint">{ctxHint}</div>
        </div>

        <label>{t("Stays")}</label>
        <div>
          <Segs
            value={draft.affinity}
            items={AFF_OPTS.map((o) => ({ id: o.id, label: t(o.label) }))}
            onChange={(v) => setDraft((d) => ({ ...d, affinity: v }))}
            aria-label={t("Stays")}
          />
          <div className="hint">{t(AFF_HINT[draft.affinity] || AFF_HINT[""])}</div>
        </div>

        <label>{t("Rules")}</label>
        <div>
          <div className="fallback rt-rules">
            <div className="fbl">
              {draft.rules.map((r, ri) => {
                const effortName = (v: string) =>
                  v === "on" ? t("reasoning on") : v ? t("reasoning ≥ {level}", { level: v }) : t("any reasoning");
                const agentsName = () =>
                  r.agents.length
                    ? r.agents.map((id) => DEMO_AGENTS.find((a) => a.id === id)?.name || id).join(", ")
                    : t("any agent");
                const useMember = draft.members.find((m) => m.id === r.use) || draft.members[draft.members.length - 1];
                const from = clockOf(r.time?.from || "");
                const to = clockOf(r.time?.to || "");
                const showTokens = ruleHasPin(r, "tokens");
                const showImages = ruleHasPin(r, "images");
                const showEffort = ruleHasPin(r, "effort");
                const showAgents = ruleHasPin(r, "agents");
                const showCompact = ruleHasPin(r, "compact");
                const showFolders = ruleHasPin(r, "folders");
                const showExcept = ruleHasPin(r, "exceptFolders");
                const showTime = ruleHasPin(r, "time");
                return (
                  <div key={ri} className="rt-rule">
                    <span className="i">{ri + 1}</span>
                    <div className="when">
                      {!r.pause ? (
                        <>
                          <span
                            className={`rt-cond in${r.intent ? " on" : ""}`}
                            onClick={() => intentFocusRef.current?.focus()}
                          >
                            <span>{t("asks for")}</span>
                            <input
                              ref={(el) => {
                                if (askingRule === ri) intentFocusRef.current = el;
                              }}
                              type="text"
                              maxLength={200}
                              value={r.intent}
                              placeholder={t("what it asks for, e.g. writing tests")}
                              onChange={(e) => {
                                const intent = e.target.value;
                                setDraft((d) => ({
                                  ...d,
                                  rules: d.rules.map((x, j) => (j === ri ? { ...x, intent } : x)),
                                }));
                              }}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </span>
                          {showTokens ? (
                            <span className={`rt-cond tk${r.tokens ? " on" : ""}`}>
                              <span>≥</span>
                              <input
                                ref={(el) => {
                                  condBtnRefs.current[`tk${ri}`] = el as unknown as HTMLButtonElement;
                                }}
                                type="number"
                                min={0}
                                step={1000}
                                value={r.tokens || ""}
                                placeholder=""
                                onChange={(e) => {
                                  const tokens = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setDraft((d) => ({
                                    ...d,
                                    rules: d.rules.map((x, j) => (j === ri ? pinRule({ ...x, tokens }, "tokens") : x)),
                                  }));
                                }}
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                              <span>{t("tokens")}</span>
                              <button
                                type="button"
                                className="rt-cond-x"
                                aria-label={t("Remove")}
                                onClick={() =>
                                  setDraft((d) => ({
                                    ...d,
                                    rules: d.rules.map((x, j) => (j === ri ? unpinRule(x, "tokens") : x)),
                                  }))
                                }
                              >
                                ×
                              </button>
                            </span>
                          ) : null}
                          {showImages ? (
                            <button
                              type="button"
                              className={`rt-cond${r.images ? " on" : ""}`}
                              onClick={() =>
                                setDraft((d) => ({
                                  ...d,
                                  rules: d.rules.map((x, j) => (j === ri ? { ...x, images: !x.images } : x)),
                                }))
                              }
                            >
                              {t("has an image")}
                              <span
                                className="rt-cond-x"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDraft((d) => ({
                                    ...d,
                                    rules: d.rules.map((x, j) => (j === ri ? unpinRule(x, "images") : x)),
                                  }));
                                }}
                              >
                                ×
                              </span>
                            </button>
                          ) : null}
                          {showEffort ? (
                            <button
                              type="button"
                              className={`rt-cond${r.effort ? " on" : ""}`}
                              ref={(el) => {
                                condBtnRefs.current[`ef${ri}`] = el;
                              }}
                              onClick={() => setPopKind((cur) => (cur?.kind === "effort" && cur.rule === ri ? null : { kind: "effort", rule: ri }))}
                            >
                              {effortName(r.effort)}
                              <span
                                className="rt-cond-x"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDraft((d) => ({
                                    ...d,
                                    rules: d.rules.map((x, j) => (j === ri ? unpinRule(x, "effort") : x)),
                                  }));
                                }}
                              >
                                ×
                              </span>
                            </button>
                          ) : null}
                          {showCompact ? (
                            <button
                              type="button"
                              className={`rt-cond${r.compact ? " on" : ""}`}
                              title={t(
                                "The agent summarizes the conversation to go on in less room (Claude Code's /compact, Codex, OpenCode…): a cheaper, faster model can do it",
                              )}
                              onClick={() =>
                                setDraft((d) => ({
                                  ...d,
                                  rules: d.rules.map((x, j) => (j === ri ? { ...x, compact: !x.compact } : x)),
                                }))
                              }
                            >
                              {t("compacting")}
                              <span
                                className="rt-cond-x"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDraft((d) => ({
                                    ...d,
                                    rules: d.rules.map((x, j) => (j === ri ? unpinRule(x, "compact") : x)),
                                  }));
                                }}
                              >
                                ×
                              </span>
                            </button>
                          ) : null}
                        </>
                      ) : null}
                      {showAgents ? (
                        <button
                          type="button"
                          className={`rt-cond${r.agents.length ? " on" : ""}`}
                          ref={(el) => {
                            condBtnRefs.current[`ag${ri}`] = el;
                          }}
                          onClick={() => setPopKind((cur) => (cur?.kind === "agent" && cur.rule === ri ? null : { kind: "agent", rule: ri }))}
                        >
                          {agentsName()}
                          <span
                            className="rt-cond-x"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDraft((d) => ({
                                ...d,
                                rules: d.rules.map((x, j) => (j === ri ? unpinRule(x, "agents") : x)),
                              }));
                            }}
                          >
                            ×
                          </span>
                        </button>
                      ) : null}
                      {showFolders ? (
                        <span
                          className={`rt-cond fd${r.folders.length ? " on" : ""}`}
                        >
                          <span>{t("in folder")}</span>
                          <input
                            type="text"
                            value={r.folders.join(", ")}
                            placeholder="~/work/acme, ~/oss"
                            onChange={(e) => {
                              const folders = e.target.value
                                .split(",")
                                .map((x) => x.trim())
                                .filter(Boolean);
                              setDraft((d) => ({
                                ...d,
                                rules: d.rules.map((x, j) => (j === ri ? pinRule({ ...x, folders }, "folders") : x)),
                              }));
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                          <button
                            type="button"
                            className="rt-cond-x"
                            aria-label={t("Remove")}
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                rules: d.rules.map((x, j) => (j === ri ? unpinRule(x, "folders") : x)),
                              }))
                            }
                          >
                            ×
                          </button>
                        </span>
                      ) : null}
                      {showExcept ? (
                        <span
                          className={`rt-cond xf${r.exceptFolders.length ? " on" : ""}`}
                          title={t("not in folder")}
                        >
                          <span title={t("not in folder")}>{t("not in folder")}</span>
                          <input
                            type="text"
                            value={r.exceptFolders.join(", ")}
                            placeholder="~/big-task"
                            onChange={(e) => {
                              const exceptFolders = e.target.value
                                .split(",")
                                .map((x) => x.trim())
                                .filter(Boolean);
                              setDraft((d) => ({
                                ...d,
                                rules: d.rules.map((x, j) => (j === ri ? pinRule({ ...x, exceptFolders }, "exceptFolders") : x)),
                              }));
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                          <button
                            type="button"
                            className="rt-cond-x"
                            aria-label={t("Remove")}
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                rules: d.rules.map((x, j) => (j === ri ? unpinRule(x, "exceptFolders") : x)),
                              }))
                            }
                          >
                            ×
                          </button>
                        </span>
                      ) : null}
                      {showTime ? (
                        <>
                          <span
                            className={`rt-cond tm${from && to ? " on" : ""}${r.time && ((r.time.from && !from) || (r.time.to && !to)) ? " bad" : ""}`}
                            title={t(
                              "The turn begins within these hours, on this computer's clock — a provider's peak-price hours sent to another, say",
                            )}
                          >
                            <span>{t("from")}</span>
                            <input
                              className="clock"
                              type="text"
                              maxLength={5}
                              inputMode="numeric"
                              value={r.time?.from || ""}
                              placeholder="09:00"
                              onChange={(e) => {
                                const fromV = e.target.value.trim();
                                setDraft((d) => {
                                  const rules = d.rules.map((x, j) => {
                                    if (j !== ri) return x;
                                    const time = x.time || { from: "", to: "", days: [] };
                                    return pinRule({ ...x, time: { ...time, from: fromV } }, "time");
                                  });
                                  return { ...d, rules };
                                });
                              }}
                              onBlur={(e) => {
                                const v = clockOf(e.target.value);
                                if (!v) return;
                                setDraft((d) => {
                                  const rules = d.rules.map((x, j) => {
                                    if (j !== ri) return x;
                                    const time = x.time || { from: "", to: "", days: [] };
                                    return { ...x, time: { ...time, from: v } };
                                  });
                                  return { ...d, rules };
                                });
                              }}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                            <span>{t("to")}</span>
                            <input
                              className="clock"
                              type="text"
                              maxLength={5}
                              inputMode="numeric"
                              value={r.time?.to || ""}
                              placeholder="18:00"
                              onChange={(e) => {
                                const toV = e.target.value.trim();
                                setDraft((d) => {
                                  const rules = d.rules.map((x, j) => {
                                    if (j !== ri) return x;
                                    const time = x.time || { from: "", to: "", days: [] };
                                    return pinRule({ ...x, time: { ...time, to: toV } }, "time");
                                  });
                                  return { ...d, rules };
                                });
                              }}
                              onBlur={(e) => {
                                const v = clockOf(e.target.value);
                                if (!v) return;
                                setDraft((d) => {
                                  const rules = d.rules.map((x, j) => {
                                    if (j !== ri) return x;
                                    const time = x.time || { from: "", to: "", days: [] };
                                    return { ...x, time: { ...time, to: v } };
                                  });
                                  return { ...d, rules };
                                });
                              }}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </span>
                          <button
                            type="button"
                            className={`rt-cond${daysText(r.time?.days) ? " on" : ""}`}
                            ref={(el) => {
                              condBtnRefs.current[`day${ri}`] = el;
                            }}
                            onClick={() => setPopKind((cur) => (cur?.kind === "days" && cur.rule === ri ? null : { kind: "days", rule: ri }))}
                          >
                            {daysText(r.time?.days) || t("every day")}
                            <span
                              className="rt-cond-x"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDraft((d) => ({
                                  ...d,
                                  rules: d.rules.map((x, j) => (j === ri ? unpinRule(x, "time") : x)),
                                }));
                              }}
                            >
                              ×
                            </span>
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        className={`rt-cond rt-cond-plus${condMenuFor === ri ? " open" : ""}`}
                        ref={(el) => {
                          condBtnRefs.current[`plus${ri}`] = el;
                        }}
                        title={t("Add a condition")}
                        aria-label={t("Add a condition")}
                        onClick={() => setCondMenuFor((cur) => (cur === ri ? null : ri))}
                      >
                        <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                          <path d="M8 3.5v9M3.5 8h9" />
                        </svg>
                      </button>
                      <span className="rt-arrow" aria-hidden>
                        →
                      </span>
                      {r.pause ? (
                        <button
                          type="button"
                          className="rt-cond on rt-pause-chip"
                          ref={(el) => {
                            condBtnRefs.current[`act${ri}`] = el;
                          }}
                          onClick={() => setPopKind((cur) => (cur?.kind === "action" && cur.rule === ri ? null : { kind: "action", rule: ri }))}
                        >
                          {t("pause")}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="rt-cond on"
                        ref={(el) => {
                          condBtnRefs.current[`use${ri}`] = el;
                        }}
                        onClick={() => setPopKind((cur) => (cur?.kind === "use" && cur.rule === ri ? null : { kind: "use", rule: ri }))}
                      >
                        <svg className="ic" viewBox="0 0 16 16" width={14} height={14} aria-hidden>
                          <rect x="3" y="3" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
                          <path d="M6 8h4M8 6v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                        <span>{useMember ? memberDisplay(useMember) : r.use}</span>
                      </button>
                      {r.pause ? (
                        <div className="rt-pause-note">{t("left out of the group then: not tried, not a fallback")}</div>
                      ) : null}
                    </div>
                    <span className="ctl">
                      <button
                        type="button"
                        className={`text rt-rule-more${ruleMenuFor === ri ? " open" : ""}`}
                        ref={(el) => {
                          condBtnRefs.current[`more${ri}`] = el;
                        }}
                        aria-label={t("Rule actions")}
                        aria-haspopup="menu"
                        aria-expanded={ruleMenuFor === ri}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRuleMenuFor((cur) => (cur === ri ? null : ri));
                          setCondMenuFor(null);
                          setPopKind(null);
                        }}
                      >
                        ⋯
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
            {draft.members.length >= 2 ? (
              <div className="rt-gadds">
                <button
                  type="button"
                  className="rt-gadd"
                  onClick={() => {
                    const use = draft.members[draft.members.length - 1].id;
                    setDraft((d) => ({ ...d, rules: [...d.rules, emptyRule(use)] }));
                    setAskingRule(draft.rules.length);
                    window.setTimeout(() => intentFocusRef.current?.focus({ preventScroll: true }), 0);
                  }}
                >
                  <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                    <path d="M8 3.5v9M3.5 8h9" />
                  </svg>
                  <span>{t("Add a rule")}</span>
                </button>
                <button
                  type="button"
                  className="rt-info"
                  title={t(
                    "Checked top first when you send a message: the first that matches sends that turn to its model first; the rest stay behind it if it fails. A turn under way is never moved.",
                  )}
                  aria-label={t("About rules")}
                >
                  i
                </button>
              </div>
            ) : null}
          </div>
          {draft.members.length < 2 ? (
            <div className="hint">
              {t("With two models or more, a rule can send some turns to one of them first.")}
            </div>
          ) : draft.routing === "manual" ? (
            <div className="hint">{t("The rules wait while you pick the model by hand.")}</div>
          ) : null}
        </div>

        <label>{t("Effort")}</label>
        <div>
          <div className="rt-effort-row">
            <Segs
              value={draft.effort}
              items={[
                { id: "" as const, label: t("Agent's") },
                { id: "auto" as const, label: t("Picked per turn") },
              ]}
              onChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  effort: v,
                  classifier: v === "auto" && !d.classifier ? DEMO_CLASSIFIERS[0]?.value || "" : d.classifier,
                }))
              }
              aria-label={t("Effort")}
            />
            <button
              type="button"
              className="rt-info"
              title={t(
                draft.effort === "auto"
                  ? "As a turn begins, the classifier rates how hard it is and the turn's requests ask their model for low, medium, high or xhigh reasoning — the level each model has nearest. Only where the agent asked for reasoning: a request without any (a session title) stays without."
                  : "Each request reasons as much as the agent asked.",
              )}
              aria-label={t("About effort")}
            >
              i
            </button>
          </div>
        </div>

        {draft.effort === "auto" || draft.rules.some((r) => !r.pause) ? (
          <>
            <label>{t(draft.effort === "auto" && !draft.rules.some((r) => r.intent.trim()) ? "Decided by" : "Intent told by")}</label>
            <div>
              <div className="rt-classifier">
                <button
                  type="button"
                  className={`rt-cond${draft.classifier ? " on" : ""}`}
                  ref={clsBtnRef}
                  onClick={() => setClsOpen((o) => !o)}
                >
                  <span>
                    {draft.classifier
                      ? (() => {
                          const m = DEMO_CLASSIFIERS.find((x) => x.value === draft.classifier || x.label === draft.classifier);
                          // Shots 76–78: typed id shows as the id alone (opus)
                          return m ? m.label : draft.classifier;
                        })()
                      : t("choose a model")}
                  </span>
                </button>
                <button
                  type="button"
                  className="rt-info"
                  title={t(
                    "As a turn begins, this model is asked which of the intents the message is — once; a small, fast one without reasoning is best. If it fails or can't say, no intent matches. Its calls show in the usage as magpie’s own.",
                  )}
                  aria-label={t("About intent")}
                >
                  i
                </button>
                <ModelPop
                  open={clsOpen}
                  anchor={clsBtnRef.current}
                  value={draft.classifier}
                  modelPicker
                  options={[]}
                  onPick={(id) => {
                    if (id) setDraft((d) => ({ ...d, classifier: id }));
                    setClsOpen(false);
                  }}
                  onClose={() => setClsOpen(false)}
                />
                <div className="hint">
                  {t(
                    draft.classifier.startsWith("jev/")
                      ? draft.rules.some((r) => r.intent.trim())
                        ? "As a turn begins, Jev is asked once which of the intents the message is, and how hard the turn is when it picks the effort. An intent it isn't sure of matches no rule. Its calls show in the usage as magpie’s own."
                        : "Jev is asked once as each turn begins, with the message and what it said of the turn before. Its calls show in the usage as magpie’s own."
                      : draft.effort === "auto" && !draft.rules.some((r) => r.intent.trim())
                        ? "As a turn begins, this model is asked how hard the turn is — once; a small, fast one without reasoning is best. If it fails or can't say, the turn reasons as the agent asked. Its calls show in the usage as magpie’s own."
                        : draft.effort === "auto"
                          ? "As a turn begins, this model is asked which of the intents the message is and how hard the turn is, each once; a small, fast one without reasoning is best. If it can't say, no intent matches and the turn reasons as the agent asked. Its calls show in the usage as magpie’s own."
                          : "As a turn begins, this model is asked which of the intents the message is — once; a small, fast one without reasoning is best. If it fails or can't say, no intent matches. Its calls show in the usage as magpie’s own.",
                  )}
                </div>
                {draft.effort === "auto" && !draft.rules.some((r) => r.intent.trim()) && draft.members.length > 1 ? (
                  <button
                    type="button"
                    className="text rt-cls-more"
                    onClick={() => {
                      const use = draft.members[draft.members.length - 1].id;
                      setDraft((d) => ({
                        ...d,
                        rules: [...d.rules, emptyRule(use)],
                        classifier: d.classifier || DEMO_CLASSIFIERS[0]?.value || "",
                      }));
                      setAskingRule(draft.rules.length);
                      window.setTimeout(() => intentFocusRef.current?.focus({ preventScroll: true }), 0);
                    }}
                  >
                    {t("It can pick the model too: add a rule with an intent")}
                  </button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}

        <label>{t("Levels")}</label>
        <div>
          <Segs
            value={draft.levelsOwn ? "own" : ""}
            items={[
              { id: "" as const, label: t("Its models' shared") },
              { id: "own" as const, label: t("Named") },
            ]}
            onChange={(v) => setDraft((d) => ({ ...d, levelsOwn: v === "own" }))}
            aria-label={t("Levels")}
          />
          {draft.levelsOwn ? (
            <div className="rt-levels">
              {LEVELS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`rt-cond${draft.levels.includes(v) ? " on" : ""}`}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      levels: d.levels.includes(v) ? d.levels.filter((x) => x !== v) : LEVELS.filter((x) => x === v || d.levels.includes(x)),
                    }))
                  }
                >
                  {v}
                </button>
              ))}
            </div>
          ) : null}
          <div className="hint">
            {t(
              draft.levelsOwn
                ? "Agents are offered these. A model without the level asked is sent the one it has nearest."
                : "Agents are offered the levels every model has.",
            )}
          </div>
        </div>

        <div className="bar" style={{ gridColumn: "1 / -1" }}>
          {editGroup ? (
            <button type="button" className="text" onClick={() => setRemoveOpen(true)}>
              {t("Remove")}
            </button>
          ) : null}
          <span className="grow" />
          <button type="button" className="text" onClick={askClose}>
            {t("Cancel")}
          </button>
          <button type="button" className="text primary" onClick={save}>
            {t(editGroup ? "Save" : "Add")}
          </button>
        </div>
      </div>

      {popKind?.kind === "effort" ? (
        <ModelPop
          open
          anchor={condBtnRefs.current[`ef${popKind.rule}`] || null}
          value={draft.rules[popKind.rule]?.effort || ""}
          modelPicker={false}
          placeholder={t("Filter reasoning…")}
          options={[
            { value: "", label: t("any reasoning"), note: t("not a condition") },
            { value: "on", label: t("reasoning on"), note: t("thinking or any effort level") },
            ...EFFORTS.map((v) => ({ value: v, label: t("reasoning ≥ {level}", { level: v }) })),
          ]}
          onPick={(v) => {
            const ri = popKind.rule;
            setDraft((d) => ({
              ...d,
              rules: d.rules.map((x, j) => (j === ri ? pinRule({ ...x, effort: v }, "effort") : x)),
            }));
            setPopKind(null);
          }}
          onClose={() => setPopKind(null)}
        />
      ) : null}
      {popKind?.kind === "agent" ? (
        <ModelPop
          open
          anchor={condBtnRefs.current[`ag${popKind.rule}`] || null}
          value=""
          modelPicker={false}
          placeholder={t("Filter agent…")}
          options={[
            { value: "", label: t("any agent"), note: t("not a condition") },
            ...DEMO_AGENTS.map((a) => ({
              value: a.id,
              label: a.name,
              note: draft.rules[popKind.rule]?.agents.includes(a.id) ? "✓" : "",
            })),
          ]}
          onPick={(v) => {
            const ri = popKind.rule;
            setDraft((d) => {
              const rules = d.rules.map((x, j) => {
                if (j !== ri) return x;
                const agents = !v ? [] : x.agents.includes(v) ? x.agents.filter((id) => id !== v) : [...x.agents, v];
                return pinRule({ ...x, agents }, "agents");
              });
              return { ...d, rules };
            });
            /* multi-toggle: keep open unless clearing */
            if (!v) setPopKind(null);
          }}
          onClose={() => {
            /* Escape / outside: leave dashed any agent chip (NOTES 46) */
            const ri = popKind.rule;
            setDraft((d) => ({
              ...d,
              rules: d.rules.map((x, j) => (j === ri ? pinRule(x, "agents") : x)),
            }));
            setPopKind(null);
          }}
          keepOpen
        />
      ) : null}
      {popKind?.kind === "days" ? (
        <ModelPop
          open
          anchor={condBtnRefs.current[`day${popKind.rule}`] || null}
          value=""
          modelPicker={false}
          placeholder={t("Filter days…")}
          options={[
            { value: "=", label: t("every day"), note: t("not a condition") },
            { value: "=weekdays", label: t("weekdays"), note: daysText([...WEEK.slice(0, 5)]) },
            { value: "=weekends", label: t("weekends"), note: daysText([...WEEK.slice(5)]) },
            ...WEEK.map((d) => ({
              value: d,
              label: t(DAY_NAMES[d]),
              note: draft.rules[popKind.rule]?.time?.days?.includes(d) ? "✓" : "",
            })),
          ]}
          onPick={(v) => {
            const ri = popKind.rule;
            setDraft((d) => {
              const rules = d.rules.map((x, j) => {
                if (j !== ri) return x;
                const time = x.time || { from: "", to: "", days: [] };
                let days = [...(time.days || [])];
                if (v === "=") days = [];
                else if (v === "=weekdays") days = [...WEEK.slice(0, 5)];
                else if (v === "=weekends") days = [...WEEK.slice(5)];
                else {
                  days = days.includes(v) ? days.filter((x) => x !== v) : WEEK.filter((x) => x === v || days.includes(x));
                  if (days.length === 7) days = [];
                }
                return { ...x, time: { ...time, days } };
              });
              return { ...d, rules };
            });
            if (v.startsWith("=")) setPopKind(null);
          }}
          onClose={() => setPopKind(null)}
          keepOpen
        />
      ) : null}
      {popKind?.kind === "action" ? (
        <ModelPop
          open
          anchor={condBtnRefs.current[`act${popKind.rule}`] || null}
          value={draft.rules[popKind.rule]?.pause ? "pause" : "send"}
          modelPicker={false}
          placeholder={t("Filter action…")}
          options={[
            { value: "send", label: t("send to"), note: t("goes first; the others stay behind it") },
            { value: "pause", label: t("pause"), note: t("left out of the group: not tried, not a fallback") },
          ]}
          onPick={(v) => {
            const ri = popKind.rule;
            setDraft((d) => ({
              ...d,
              rules: d.rules.map((x, j) =>
                j === ri
                  ? v === "pause"
                    ? {
                        ...x,
                        pause: true,
                        tokens: 0,
                        images: false,
                        effort: "",
                        intent: "",
                        compact: false,
                        pins: x.pins.filter((p) => p === "folders" || p === "exceptFolders" || p === "agents" || p === "time"),
                      }
                    : { ...x, pause: false }
                  : x,
              ),
            }));
            setPopKind(null);
          }}
          onClose={() => setPopKind(null)}
        />
      ) : null}
      {popKind?.kind === "use" ? (
        <ModelPop
          open
          anchor={condBtnRefs.current[`use${popKind.rule}`] || null}
          value={draft.rules[popKind.rule]?.use || ""}
          modelPicker={false}
          placeholder={t("Filter member…")}
          options={draft.members.map((m) => ({ value: m.id, label: memberDisplay(m), note: m.name }))}
          onPick={(v) => {
            const ri = popKind.rule;
            if (v)
              setDraft((d) => ({
                ...d,
                rules: d.rules.map((x, j) => (j === ri ? { ...x, use: v } : x)),
              }));
            setPopKind(null);
          }}
          onClose={() => setPopKind(null)}
        />
      ) : null}

      {condMenuFor != null ? (
        <ProtoMultiMenu
          open
          anchor={condBtnRefs.current[`plus${condMenuFor}`] || null}
          head="Add a condition"
          hideHead={false}
          live={false}
          value=""
          align="left"
          options={(
            [
              ["tokens", "Conversation length"],
              ["images", "has an image"],
              ["effort", "Reasoning level"],
              ["compact", "compacting"],
              ["agents", "Agents"],
              ["folders", "in folder"],
              ["exceptFolders", "not in folder"],
              ["time", "Hours and days"],
            ] as const
          )
            .filter(([id]) => !ruleHasPin(draft.rules[condMenuFor] || emptyRule(""), id))
            .map(([id, label]) => ({ v: id, name: label }))}
          onChange={(v) => {
            const ri = condMenuFor;
            const id = typeof v === "string" ? v : "";
            if (!id) return;
            setCondMenuFor(null);
            setDraft((d) => {
              const rules = d.rules.map((x, j) => {
                if (j !== ri) return x;
                let next = pinRule(x, id);
                if (id === "images") next = { ...next, images: true };
                if (id === "compact") next = { ...next, compact: true };
                if (id === "time") next = { ...next, time: next.time || { from: "", to: "", days: [] } };
                return next;
              });
              return { ...d, rules };
            });
            if (id === "effort") setPopKind({ kind: "effort", rule: ri });
            if (id === "agents") setPopKind({ kind: "agent", rule: ri });
            if (id === "tokens") {
              window.setTimeout(() => (condBtnRefs.current[`tk${ri}`] as unknown as HTMLInputElement | null)?.focus?.(), 0);
            }
          }}
          onClose={() => setCondMenuFor(null)}
        />
      ) : null}

      {ruleMenuFor != null && condBtnRefs.current[`more${ruleMenuFor}`] ? (
        <RuleMoreMenu
          anchor={condBtnRefs.current[`more${ruleMenuFor}`]!}
          index={ruleMenuFor}
          count={draft.rules.length}
          onMove={(to) => {
            const from = ruleMenuFor;
            setDraft((d) => {
              if (to < 0 || to >= d.rules.length) return d;
              const rules = [...d.rules];
              rules.splice(to, 0, rules.splice(from, 1)[0]);
              return { ...d, rules };
            });
          }}
          onPause={() => {
            const ri = ruleMenuFor;
            setDraft((d) => ({
              ...d,
              rules: d.rules.map((x, j) =>
                j === ri
                  ? {
                      ...x,
                      pause: true,
                      tokens: 0,
                      images: false,
                      effort: "",
                      intent: "",
                      compact: false,
                      pins: x.pins.filter((p) => p === "folders" || p === "exceptFolders" || p === "agents" || p === "time"),
                    }
                  : x,
              ),
            }));
          }}
          onRemove={() => {
            const ri = ruleMenuFor;
            setDraft((d) => ({ ...d, rules: d.rules.filter((_, j) => j !== ri) }));
          }}
          onClose={() => setRuleMenuFor(null)}
        />
      ) : null}

      {discardOpen ? (
        <div
          className="modal"
          style={{ zIndex: 40, background: "rgba(20,22,30,.35)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDiscardOpen(false);
          }}
        >
          <div className="dialog sm" role="alertdialog" aria-labelledby="rtDiscardTitle" style={{ animation: "pop-in .28s var(--ease)", maxWidth: 360 }}>
            <div className="ehead" style={{ padding: "14px 16px 0" }}>
              <b id="rtDiscardTitle">{t("Discard")}</b>
            </div>
            <p style={{ margin: "10px 16px 0", fontSize: 13, color: "var(--fg-2)", lineHeight: 1.45 }}>
              {t("Discard unsaved changes? Your changes will be lost.")}
            </p>
            <div className="bar" style={{ padding: "14px 16px" }}>
              <span className="grow" />
              <button type="button" className="text" onClick={() => setDiscardOpen(false)}>
                {t("Cancel")}
              </button>
              <button
                type="button"
                className="text"
                style={{ background: "var(--red)", color: "#fff", borderColor: "var(--red)" }}
                onClick={doDiscard}
              >
                {t("Discard")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {removeOpen ? (
        <div
          className="modal"
          style={{ zIndex: 40, background: "rgba(20,22,30,.35)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setRemoveOpen(false);
          }}
        >
          <div className="dialog sm" role="alertdialog" aria-labelledby="rtRemoveGroupTitle" style={{ animation: "pop-in .28s var(--ease)", maxWidth: 360 }}>
            <div className="ehead" style={{ padding: "14px 16px 0" }}>
              <b id="rtRemoveGroupTitle">{t("Remove group?")}</b>
            </div>
            <p style={{ margin: "10px 16px 0", fontSize: 13, color: "var(--fg-2)", lineHeight: 1.45 }}>
              {t("This routing group will no longer be available to agents.")}
            </p>
            <div className="bar" style={{ padding: "14px 16px" }}>
              <span className="grow" />
              <button type="button" className="text" onClick={() => setRemoveOpen(false)}>
                {t("Cancel")}
              </button>
              <button
                type="button"
                className="text"
                style={{ background: "var(--red)", color: "#fff", borderColor: "var(--red)" }}
                onClick={() => {
                  const name = draft.name.trim() || idOf();
                  setRemoveOpen(false);
                  onStatus?.(t("{name} removed", { name }), "ok");
                  onRemoved?.();
                  onClose();
                }}
              >
                {t("Remove")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
