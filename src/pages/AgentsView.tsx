import { CopyButton } from "../components/CopyButton";
import { MagpieIcon } from "../components/MagpieIcon";
import { PopoverPortal } from "../components/PopoverPortal";
import { useRowMenu } from "../lib/useRowMenu";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AgentModelsPop, type AmModel, type AmPreferences } from "../components/AgentModelsPop";
import { FieldPill } from "../components/FieldPill";
import { LibSwitch } from "../components/LibSwitch";
import { TextBtn } from "../components/TextBtn";
import { ModelPop, type PopOption } from "../components/ModelPop";
import installsData from "../data/installs.json";
import { VIA_LABEL } from "../data/mock";
import { COMPARISON_AGENTS, isAgentComparison } from "../data/agentComparison";
import { ZH, demoCopy, t } from "../i18n";

type InstallCmd = { via: string; command: string; node?: string };
type Install = {
  id: string;
  name: string;
  icon?: string;
  commands: InstallCmd[];
};

const INSTALLS = installsData as Install[];

/** Native empty Agents list is Cursor only (NOTES 01 / 18). Extra connectable
 *  agents (Connect / stale / ModelPop) gate behind ?demoAgents=1 or
 *  localStorage magpie.demoAgents=1 — not invented on the default empty path. */
const CURSOR_AGENT = { id: "cursor", name: "Cursor", icon: "cursor", connectable: false } as const;
const DEMO_CONNECTABLES = [
  { id: "claude", name: "Claude Code", icon: "claude-color", connectable: true },
  { id: "codex", name: "Codex", icon: "codex-color", connectable: true },
  { id: "opencode", name: "OpenCode", icon: "openai", connectable: true },
  { id: "pi", name: "Pi", icon: "openai", connectable: true },
] as const;
type AgentDef = {
  id: string; name: string; icon: string; connectable: boolean;
  version?: string; missing?: boolean;
};
function readDemoAgents(): boolean {
  try {
    const q = new URLSearchParams(location.search);
    if (q.get("demoAgents") === "1" || q.get("agents") === "demo") return true;
    return localStorage.getItem("magpie.demoAgents") === "1";
  } catch {
    return false;
  }
}

const DEMO_POP_OPTS: PopOption[] = [
  { value: "claude-opus-4", label: "claude-opus-4", group: "Anthropic", note: "Opus" },
  { value: "claude-sonnet-4-5", label: "claude-sonnet-4-5", group: "Anthropic", note: "Sonnet" },
  { value: "claude-haiku-4", label: "claude-haiku-4", group: "Anthropic", note: "Haiku" },
  { value: "gpt-5", label: "gpt-5", group: "OpenAI" },
  { value: "gpt-5-mini", label: "gpt-5-mini", group: "OpenAI" },
  { value: "o4-mini", label: "o4-mini", group: "OpenAI" },
  { value: "gemini-2.5-pro", label: "gemini-2.5-pro", group: "Google" },
  { value: "magpie/fast", label: "magpie/fast", group: "Routing groups", note: "group" },
];

const DEMO_AM_MODELS: AmModel[] = [
  { id: "claude-opus-4", name: "claude-opus-4", group: "Anthropic", icon: "anthropic", logo: "anthropic", on: true },
  { id: "claude-sonnet-4-5", name: "claude-sonnet-4-5", group: "Anthropic", icon: "anthropic", logo: "anthropic", on: true },
  { id: "claude-haiku-4", name: "claude-haiku-4", group: "Anthropic", icon: "anthropic", logo: "anthropic", on: true },
  { id: "claude-3-5-haiku", name: "claude-3-5-haiku", group: "Anthropic", icon: "anthropic", logo: "anthropic", on: false },
  { id: "gpt-5", name: "gpt-5", group: "OpenAI", icon: "openai", logo: "openai", on: true },
  { id: "gpt-5-mini", name: "gpt-5-mini", group: "OpenAI", icon: "openai", logo: "openai", on: true },
  { id: "o4-mini", name: "o4-mini", group: "OpenAI", icon: "openai", logo: "openai", on: false },
  { id: "gemini-2.5-pro", name: "gemini-2.5-pro", group: "Google", icon: "gemini-color", logo: "gemini-color", on: true },
  { id: "magpie/fast", name: "magpie/fast", group: "Routing groups", on: true },
];

// Explicit test-only depth for the frozen >8-model fold and own-order cases.
// The normal mock catalog stays unchanged; these are labels, never API models.
const DEEP_AM_MODELS: AmModel[] = [
  ...DEMO_AM_MODELS,
  ...Array.from({ length: 9 }, (_, i) => ({ id: `mock/openai-${i + 1}`, name: `Mock OpenAI ${i + 1}`, group: "OpenAI", icon: "openai", on: true })),
  { id: "mock/own-model", name: "Mock own model", group: "ChatGPT", icon: "openai", own: true, on: true },
];

function readAmModels(): Record<string, AmModel[]> {
  try {
    const data = JSON.parse(localStorage.getItem("magpie.demoAmModels") || "{}");
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    return Object.fromEntries(Object.entries(data).filter(([, rows]) => Array.isArray(rows) && rows.every(m => m && [m.id, m.name, m.group].every(s => typeof s === "string") && typeof m.on === "boolean"))) as Record<string, AmModel[]>;
  } catch { return {}; }
}

function readAmPreferences(): Record<string, AmPreferences> {
  try {
    const data = JSON.parse(localStorage.getItem("magpie.demoAmPrefs") || "{}");
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    return Object.fromEntries(Object.entries(data).filter(([, value]) => value && typeof value === "object" && "only" in value && "ordered" in value && typeof value.only === "boolean" && typeof value.ordered === "boolean")) as Record<string, AmPreferences>;
  } catch { return {}; }
}

type StaleCopy = { kind: "app" | "ide" | "daemon" | "embedded" | "cli"; since: number; app?: string };
const STALE_HOW: Record<string, [string, string?]> = {
  app: ["The {agent} app, started {when}: closing its window keeps it running. Quit it with {cmd} and open it again.", "⌘Q"],
  ide: ["{agent} in an editor (VS Code, Cursor…), started {when}: reload that editor's window."],
  daemon: ["{agent}'s background app-server, started {when}: restart it with {cmd}.", "codex app-server daemon restart"],
  embedded: ["{app}'s own {agent}, started {when}: quit {app} and open it again."],
  cli: ["A {agent} in a terminal, started {when}: quit it and start it again."],
};
const STALE_SHORT: Record<string, string> = {
  app: "Connected · quit and reopen the {agent} app",
  ide: "Connected · reload the editor's window",
  daemon: "Connected · restart {agent}'s app-server",
  embedded: "Connected · reopen {app}",
  cli: "Connected · restart {agent} in the terminal",
};
function ago(ms: number) {
  const s = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return t("{n}s ago", { n: s });
  const m = Math.round(s / 60);
  if (m < 60) return t("{n}m ago", { n: m });
  return t("{n}h ago", { n: Math.round(m / 60) });
}
function staleSaid(name: string, copies: StaleCopy[]) {
  if (!copies.length || copies.some((c) => !STALE_HOW[c.kind]))
    return { text: t("Connected · takes effect once {agent} is reopened", { agent: name }), title: "" };
  const title = copies
    .map((c) =>
      t(STALE_HOW[c.kind][0], { agent: name, when: ago(c.since), app: c.app || "" }).replace(
        "{cmd}",
        STALE_HOW[c.kind][1] || "",
      ),
    )
    .join("\n");
  const kinds = new Set(copies.map((c) => c.kind + "\0" + (c.app || "")));
  if (kinds.size > 1) return { text: t("Connected · {n} copies of {agent} to reopen", { n: copies.length, agent: name }), title };
  return { text: t(STALE_SHORT[copies[0].kind], { agent: name, app: copies[0].app || "" }), title };
}

const DEMO_STALE: Record<string, { stale: number; copies: StaleCopy[] }> = {
  claude: {
    stale: 2,
    copies: [
      { kind: "ide", since: Date.now() - 12 * 60_000 },
      { kind: "cli", since: Date.now() - 3 * 60_000 },
    ],
  },
  codex: {
    stale: 1,
    copies: [{ kind: "daemon", since: Date.now() - 25 * 60_000 }],
  },
};

const SPRING = (() => {
  try {
    return CSS.supports("animation-timing-function", "linear(0, 1)")
      ? "linear(0, 0.0203, 0.0723, 0.1448, 0.2292, 0.3188, 0.4086, 0.4951, 0.576, 0.6498, 0.7157, 0.7735, 0.8232, 0.8654, 0.9005, 0.9293, 0.9525, 0.9708, 0.9849, 0.9956, 1.0033, 1.0087, 1.0122, 1.0142, 1.015, 1.0151, 1.0146, 1.0136, 1.0124, 1.0111, 1.0097, 1.0084, 1.0071, 1.0059, 1.0049, 1.0039, 1.0031, 1.0024, 1.0018, 1.0013, 1)"
      : "cubic-bezier(.2, .9, .25, 1.02)";
  } catch {
    return "cubic-bezier(.2, .9, .25, 1.02)";
  }
})();
const IOS_EASE = "cubic-bezier(.32, .72, 0, 1)";
const calm = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

type Props = {
  onAddProvider: () => void;
  /** Magpie app.js L1611–1615 guide-open → show("routing") */
  onGoRouting: () => void;
  /** Incremented by App on #sync — closes naming like Magpie renderProfiles. */
  refreshNonce: number;
  onStatus: (msg: string, kind?: string) => void;
};

function CopyBtn({
  text,
  agentName,
  onStatus,
}: {
  text: string;
  agentName: string;
  onStatus: (msg: string, kind?: string) => void;
}) {
  return <CopyButton text={text} what={t("{agent}'s install command", { agent: agentName })} onStatus={onStatus} />;
}

type ManageProps = {
  agents: readonly AgentDef[];
  /** Magpie onMagpie — wired / added / drift. Select unconnected = !onMagpie. */
  wired: Record<string, boolean>;
  hiddenIds: Set<string>;
  onHiddenChange: (next: Set<string>) => void;
  onClose: () => void;
};

function ManageAgentsModal({
  agents,
  wired,
  hiddenIds,
  onHiddenChange,
  onClose,
}: ManageProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [result, setResult] = useState("");
  const closing = useRef(false);

  const matching = useMemo(
    () =>
      agents.filter((a) =>
        (a.name + " " + a.id)
          .toLocaleLowerCase()
          .includes(q.trim().toLocaleLowerCase()),
      ),
    [agents, q],
  );

  const canHide = [...selected].some((id) => !hiddenIds.has(id));
  const canUnhide = [...selected].some((id) => hiddenIds.has(id));

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const m = modalRef.current;
    const d = dialogRef.current;
    if (!m || !d) {
      onClose();
      return;
    }
    m.classList.add("out");
    for (const a of [...m.getAnimations(), ...d.getAnimations()]) {
      a.commitStyles?.();
      a.cancel();
    }
    const shape = { duration: 260, easing: IOS_EASE, fill: "forwards" as const };
    const moves = [
      m.animate([{ opacity: 0 }], { ...shape, easing: "ease-out" }),
      calm()
        ? d.animate([{ opacity: 0 }], { duration: 140, fill: "forwards" })
        : d.animate([{ transform: "translateY(14px) scale(.95)" }], shape),
    ];
    if (!calm()) {
      moves.push(
        d.animate(
          [
            { offset: 0.2, opacity: getComputedStyle(d).opacity },
            { opacity: 0 },
          ],
          shape,
        ),
      );
    }
    Promise.all(moves.map((a) => a.finished)).then(
      () => onClose(),
      () => onClose(),
    );
  };

  useEffect(() => {
    const m = modalRef.current;
    const d = dialogRef.current;
    if (!m || !d) return;
    for (const a of [...m.getAnimations(), ...d.getAnimations()]) a.cancel();
    d.style.opacity = d.style.transform = m.style.opacity = "";
    m.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 280,
      easing: "ease-out",
    });
    if (calm()) {
      d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
    } else {
      d.animate(
        [
          { transform: "translateY(24px) scale(.94)" },
          { transform: "none" },
        ],
        { duration: 570, easing: SPRING },
      );
      d.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 240,
        easing: "ease-out",
      });
    }
    const first = d.querySelector<HTMLElement>(
      "input:not([disabled]), button:not([disabled])",
    );
    first?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: string, on: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  };

  /** Magpie save(true|false): only ids whose visibility actually changes. */
  const applyVisibility = (hide: boolean) => {
    const ids = [...selected].filter((id) => hiddenIds.has(id) !== hide);
    if (!ids.length) return;
    const next = new Set(hiddenIds);
    for (const id of ids) {
      if (hide) next.add(id);
      else next.delete(id);
    }
    onHiddenChange(next);
    setSelected(new Set());
    setResult(
      hide
        ? t(ids.length === 1 ? "{n} agent hidden" : "{n} agents hidden", { n: ids.length })
        : t(ids.length === 1 ? "{n} agent unhidden" : "{n} agents unhidden", { n: ids.length }),
    );
  };

  return (
    <div
      className="modal lib"
      id="modal"
      ref={modalRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}>
      <div
        className="dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
        tabIndex={-1}>
        <div className="editor ag-manager framed">
          <div className="ehead">
            <b id="modalTitle">{ZH.manageAgents}</b>
          </div>
          <div className="ebody">
            <p className="lib-confirm">{ZH.manageNote}</p>
            <input
              className="words ag-manage-search"
              type="search"
              placeholder={ZH.searchAgents}
              aria-label={ZH.searchAgents}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="ag-manage-actions">
              <TextBtn
                onClick={() =>
                  setSelected(new Set(matching.map((a) => a.id)))
                }>
                {t("Select search results")}
              </TextBtn>
              <TextBtn
                onClick={() => {
                  setSelected((prev) => {
                    const n = new Set(prev);
                    for (const a of matching) {
                      if (n.has(a.id)) n.delete(a.id);
                      else n.add(a.id);
                    }
                    return n;
                  });
                }}>
                {t("Invert search selection")}
              </TextBtn>
              <TextBtn
                onClick={() => {
                  // Magpie: clear then add matching !onMagpie(a)
                  setSelected(
                    new Set(
                      matching.filter((a) => !wired[a.id]).map((a) => a.id),
                    ),
                  );
                }}>
                {t("Select unconnected agents")}
              </TextBtn>
              <TextBtn
                onClick={() => setSelected(new Set())}>
                {t("Clear selection")}
              </TextBtn>
            </div>
            <span className="ag-manage-count">
              {ZH.agentsSelected.replace("{n}", String(selected.size))}
            </span>
            <div className="ag-manage-rows">
              {matching.length === 0 ? (
                <p className="lib-confirm">{ZH.noMatchingAgents}</p>
              ) : (
                matching.map((a) => (
                  <label
                    key={a.id}
                    className="ag-manage-row"
                    data-id={a.id}
                    title={hiddenIds.has(a.id) ? t("Hidden") : t("Not hidden")}>
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      aria-label={a.name}
                      onChange={(e) => toggle(a.id, e.target.checked)}
                    />
                    <MagpieIcon name={a.icon} />
                    <span className="ag-manage-name">{a.name}</span>
                    <span className="ag-manage-state">
                      {hiddenIds.has(a.id) ? t("Hidden") : t("Not hidden")}
                    </span>
                  </label>
                ))
              )}
            </div>
            <p className="ag-manage-result" role="status">
              {result}
            </p>
          </div>
          <div className="bar">
            <TextBtn
              disabled={!canHide}
              onClick={() => applyVisibility(true)}>
              {ZH.hideSelected}
            </TextBtn>
            <TextBtn
              disabled={!canUnhide}
              onClick={() => applyVisibility(false)}>
              {ZH.unhideSelected}
            </TextBtn>
            <span className="grow" />
            <TextBtn onClick={close}>
              {ZH.done}
            </TextBtn>
          </div>
        </div>
      </div>
    </div>
  );
}


const GUIDE_KEY = "magpie-demo-guideHidden";
const MOVE_UP = "M8 12.5v-9M4 7.25l4-3.75 4 3.75";
const MOVE_DOWN = "M8 3.5v9M4 8.75l4 3.75 4-3.75";
const EYE_OFF =
  "M6.6 3.7A6.9 6.9 0 0 1 8 3.5c3.75 0 6.25 4.5 6.25 4.5a11 11 0 0 1-1.5 2M4.4 4.4C2.7 5.55 1.75 8 1.75 8S4.25 12.5 8 12.5c1.2 0 2.25-.45 3.1-1.05M6.75 6.75a1.75 1.75 0 0 0 2.5 2.5M2 2l12 12";
const ALT = typeof navigator !== "undefined" && /^Mac/.test(navigator.platform) ? "⌥" : "Alt+";

type ArrangeProps = {
  anchor: HTMLElement;
  canMove: boolean; // more than one visible agent
  index: number;
  count: number;
  onHide: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onClose: () => void;
};

function ArrangeMenu({
  anchor,
  canMove,
  index,
  count,
  onHide,
  onMoveUp,
  onMoveDown,
  onClose,
}: ArrangeProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  useRowMenu(boxRef, anchor, onClose);

  const items: {
    name: string;
    icon: string;
    key?: string;
    off?: boolean;
    sep?: boolean;
    run: () => void;
  }[] = [
    {
      name: ZH.moveUp,
      icon: MOVE_UP,
      key: ALT + "↑",
      off: !canMove || index <= 0,
      run: () => { onMoveUp(); },
    },
    {
      name: ZH.moveDown,
      icon: MOVE_DOWN,
      key: ALT + "↓",
      off: !canMove || index < 0 || index >= count - 1,
      run: () => { onMoveDown(); },
    },
    {
      name: ZH.hide,
      icon: EYE_OFF,
      sep: true,
      run: () => {
        onHide();
      },
    },
  ];

  return (
    <PopoverPortal><div data-anchored className="pop row-menu" role="menu" ref={boxRef}>
      {items.map((o) => (
        <span key={o.name} className="display-contents">
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
        </span>
      ))}
    </div></PopoverPortal>
  );
}


export function AgentsView({
  onAddProvider,
  onGoRouting,
  refreshNonce,
  onStatus,
}: Props) {
  const [demoAgents] = useState(() => readDemoAgents());
  const [comparison] = useState(isAgentComparison);
  const ALL_AGENTS = useMemo<readonly AgentDef[]>(
    () => comparison ? COMPARISON_AGENTS : (demoAgents ? [CURSOR_AGENT, ...DEMO_CONNECTABLES] : [CURSOR_AGENT]),
    [demoAgents, comparison],
  );
  const [guideHidden, setGuideHidden] = useState(() => {
    try {
      return localStorage.getItem(GUIDE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [showAllAgents, setShowAllAgents] = useState(false);
  const [arrangeFor, setArrangeFor] = useState<{
    id: string;
    el: HTMLElement;
  } | null>(null);
  const [installsOpen, setInstallsOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [orderIds, setOrderIds] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("magpie.agentOrder") || "null");
      if (Array.isArray(saved) && saved.every((x) => typeof x === "string")) return saved;
    } catch { /* */ }
    return [];
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showHiddenFold, setShowHiddenFold] = useState(false);
  const [wired, setWired] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem("magpie.demoAgentWired");
      if (raw) return JSON.parse(raw) as Record<string, boolean>;
    } catch {
      /* ignore */
    }
    return {};
  });
  const [relocateFor, setRelocateFor] = useState<string | null>(null);
  const [relPreview, setRelPreview] = useState<string | null>(null);
  const [relPhase, setRelPhase] = useState<"edit" | "preview" | "done">("edit");
  const [expandOpen, setExpandOpen] = useState<string | null>(null);
  const [connectBusy, setConnectBusy] = useState<string | null>(null);
  const [diffOpen, setDiffOpen] = useState<string | null>(null);
  const [relFrom, setRelFrom] = useState("~/.claude/projects/old");
  const [relTo, setRelTo] = useState("~/.claude/projects/new");
  const [relBusy, setRelBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  /** Magpie #pop for tier / New sessions model fields */
  const [fieldPop, setFieldPop] = useState<{
    agentId: string;
    key: string;
    el: HTMLElement;
  } | null>(null);
  const [fieldVals, setFieldVals] = useState<Record<string, string>>(() => ({
    "claude:opus": "claude-opus-4",
    "claude:sonnet": "claude-sonnet-4-5",
    "claude:haiku": "claude-haiku-4",
    "claude:model": "claude-sonnet-4-5",
    "codex:model": comparison ? "gpt-6.1-sol" : "gpt-5",
    "deepseek:model": "default",
    "opencode:model": "claude-sonnet-4-5",
    "pi:model": "gpt-5-mini",
  }));
  /** Magpie am-pop (Pick on Model list) */
  const [amPop, setAmPop] = useState<{ agentId: string; el: HTMLElement } | null>(null);
  const [amCatalog] = useState(() => new URLSearchParams(location.search).get("amFixture") === "deep" ? DEEP_AM_MODELS : DEMO_AM_MODELS);
  const [amModels, setAmModels] = useState<Record<string, AmModel[]>>(readAmModels);
  const [amPreferences, setAmPreferences] = useState<Record<string, AmPreferences>>(readAmPreferences);
  useEffect(() => {
    if (Object.keys(amModels).length) try { localStorage.setItem("magpie.demoAmModels", JSON.stringify(amModels)); } catch { /* local mock only */ }
  }, [amModels]);
  useEffect(() => {
    if (Object.keys(amPreferences).length) try { localStorage.setItem("magpie.demoAmPrefs", JSON.stringify(amPreferences)); } catch { /* local mock only */ }
  }, [amPreferences]);
  /** Magpie staleSeen — dismiss "Got it" per agent */
  const [staleSeen, setStaleSeen] = useState<Record<string, number>>({});
  const [staleDemo] = useState(() => new URLSearchParams(location.search).get("stale") !== "0");

  useEffect(() => {
    try {
      localStorage.setItem("magpie.demoAgentWired", JSON.stringify(wired));
    } catch {
      /* ignore */
    }
  }, [wired]);

  useEffect(() => {
    // Magpie renderProfiles drops open chip-input on refresh
    setNaming(false);
    setProfileName("");
  }, [refreshNonce]);

  useEffect(() => {
    if (naming) nameRef.current?.focus({ preventScroll: true });
  }, [naming]);

  const closeSave = () => {
    setNaming(false);
    setProfileName("");
  };

  const onSaveClick = (e: FormEvent) => {
    e.preventDefault();
    if (!naming) {
      setNaming(true);
      return;
    }
    if (!profileName.trim()) {
      nameRef.current?.focus({ preventScroll: true });
      return;
    }
    // Demo: no backend save — just exit naming (mirrors cancel after look)
    closeSave();
  };

  const orderedAll = (() => {
    if (!orderIds.length) return [...ALL_AGENTS];
    const by = new Map<string, AgentDef>(ALL_AGENTS.map((a) => [a.id, a]));
    const out: AgentDef[] = [];
    for (const id of orderIds) {
      const a = by.get(id);
      if (a) { out.push(a); by.delete(id); }
    }
    for (const a of ALL_AGENTS) if (by.has(a.id)) out.push(a);
    return out;
  })();
  // Magpie agentUsed / onMagpie: Cursor stays up; connectable rows stay up once wired.
  const isUsed = (a: AgentDef) =>
    comparison || a.id === "cursor" || !a.connectable || !!wired[a.id];
  const visibleAll = orderedAll.filter((a) => !hiddenIds.has(a.id));
  const used = visibleAll.filter(isUsed);
  const unset = visibleAll.filter((a) => !isUsed(a));
  const visible = used; // top list = in-use (native: Cursor only)
  const hidden = orderedAll.filter((a) => hiddenIds.has(a.id));
  const persistOrder = (ids: string[]) => {
    setOrderIds(ids);
    try { localStorage.setItem("magpie.agentOrder", JSON.stringify(ids)); } catch { /* */ }
  };
  const moveVisible = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= visible.length || to >= visible.length) return;
    const visIds = visible.map((a) => a.id);
    const [item] = visIds.splice(from, 1);
    visIds.splice(to, 0, item);
    const rest = orderedAll.map((a) => a.id).filter((id) => !visIds.includes(id));
    persistOrder([...visIds, ...rest]);
  };

  return (
    <>
      <main className="view" id="view-agents">
        {!guideHidden ? (
          <div className="ag-lead guiding" id="agentsLead">
            <section className="guide" aria-label={ZH.getStarted}>
              <div className="guide-head">
                <b className="guide-h">{ZH.getStarted}</b>
                <span className="guide-n">
                  {(() => {
                    const done =
                      (typeof window !== "undefined" && sessionStorage.getItem("magpie-demo-providerAdded") === "1" ? 1 : 0) +
                      (Object.values(wired).some(Boolean) ? 1 : 0);
                    return t("{n} of {m} done", { n: done, m: 2 });
                  })()}
                </span>
                <button
                  type="button"
                  className="guide-x"
                  title={ZH.hideGetStarted}
                  aria-label={ZH.hideGetStarted}
                  onClick={(e) => {
                    e.stopPropagation();
                    /* Magpie hideGuide (app.js ~1682): instant prefs write, no fade invent */
                    setGuideHidden(true);
                    try { localStorage.setItem(GUIDE_KEY, "1"); } catch { /* ignore */ }
                  }}>
                  <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden>
                    <path
                      d="M4.5 4.5l7 7M11.5 4.5l-7 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <ol className="guide-steps">
                <li className="guide-step">
                  <span className="guide-tick" aria-hidden>
                    1
                  </span>
                  <div className="guide-body">
                    <b className="guide-title">{ZH.addModelSource}</b>
                    <span className="guide-say">{ZH.addModelSourceSay}</span>
                    <div className="guide-acts">
                      <button
                        type="button"
                        className="text primary guide-go"
                        onClick={onAddProvider}>
                        {ZH.addProvider}
                      </button>
                    </div>
                  </div>
                </li>
                <li className="guide-step">
                  <span className="guide-tick" aria-hidden>
                    2
                  </span>
                  <div className="guide-body">
                    <b className="guide-title">{ZH.connectAgent}</b>
                    <span className="guide-say">{comparison
                      ? demoCopy("对照样例中的 Agent，点一下即可演示接入：", "Agents in the comparison sample; click to preview connecting:")
                      : ZH.connectAgentSay}</span>
                    <div className="guide-agents">
                      {comparison ? ALL_AGENTS.filter(a => a.connectable).map(a => (
                        <button key={a.id} type="button" className="guide-agent" onClick={() => {
                          document.querySelector<HTMLButtonElement>(`#agents [data-id="${a.id}"] .ag-conn`)?.click();
                        }}><MagpieIcon name={a.icon} /><span>{a.name}</span></button>
                      )) : null}
                    </div>
                  </div>
                </li>
                {/* Magpie app.js L1591–1622: optional routing step (counter still 2 of source+agent) */}
                {!comparison ? <li
                  className="guide-step optional"
                  data-step="routing"
                  data-feature="groups"
                  aria-label={t("Set up routing (optional)")}
                >
                  <span className="guide-tick" aria-hidden>
                    3
                  </span>
                  <div className="guide-body">
                    <b className="guide-title">{t("Set up routing (optional)")}</b>
                    <span className="guide-say">
                      {t(
                        "A routing group sends each request to the right model, and to the next one when a model fails",
                      )}
                    </span>
                    {typeof window !== "undefined" &&
                    sessionStorage.getItem("magpie-demo-providerAdded") === "1" ? (
                      <div className="guide-acts">
                        <button
                          type="button"
                          className="text guide-open"
                          onClick={(e) => {
                            e.stopPropagation();
                            onGoRouting();
                          }}
                        >
                          {t("Open Routing")}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li> : null}
              </ol>
            </section>
          </div>
        ) : null}

        <div className="list" id="agents">
          {visible.map((a) => (
            <div
              key={a.id}
              className={`row agent conn${a.connectable && !wired[a.id] ? " unplugged" : ""}${draggingId === a.id ? " dragging" : ""}`}
              data-id={a.id}
              title={a.id === "cursor" ? "~/.cursor/cli-config.json" : a.name}
              style={draggingId === a.id ? { transition: "none" } : undefined}>
              <button
                type="button"
                className="ag-handle"
                aria-label={ZH.arrangeAria.replace("{agent}", a.name)}
                aria-haspopup="menu"
                title={t(
                  wired[a.id]
                    ? "Drag to reorder · click to move, hide or disconnect from magpie"
                    : "Drag to reorder · click to move or hide",
                )}
                onClick={(e) => {
                  const el = e.currentTarget;
                  if (el.dataset.dragged === "1") {
                    delete el.dataset.dragged;
                    return;
                  }
                  setArrangeFor((cur) =>
                    cur?.id === a.id ? null : { id: a.id, el },
                  );
                }}
                onPointerDown={(e) => {
                  /* Magpie dragRows: measure once, sibling translateY slide, commit on release */
                  if (e.button !== 0 || e.isPrimary === false || visible.length < 2) return;
                  const handle = e.currentTarget;
                  const list = document.getElementById("agents");
                  const row = handle.closest(".row.agent") as HTMLElement | null;
                  if (!list || !row) return;
                  const rows = [...list.querySelectorAll<HTMLElement>(":scope > .row.agent")];
                  const from = rows.indexOf(row);
                  if (from < 0) return;
                  const rects = rows.map((r) => r.getBoundingClientRect());
                  const tops = rects.map((r) => r.top);
                  const heights = rects.map((r) => r.height);
                  const h = heights[from];
                  let scroll: HTMLElement | Element | null = list.parentElement;
                  while (
                    scroll &&
                    scroll instanceof HTMLElement &&
                    !/(auto|scroll)/.test(getComputedStyle(scroll).overflowY)
                  ) {
                    scroll = scroll.parentElement;
                  }
                  scroll ||= document.scrollingElement;
                  if (!scroll) return;
                  const bounds = scroll.getBoundingClientRect();
                  const scroll0 = (scroll as HTMLElement).scrollTop ?? 0;
                  let dragging = false;
                  let ended = false;
                  let to = from;
                  let y = e.clientY;
                  let frame = 0;
                  let lastTime = 0;
                  const y0 = y;
                  const pointer = e.pointerId;
                  const paint = (time: number) => {
                    frame = 0;
                    if (!row.isConnected) return finish(false);
                    if (!dragging) return;
                    const dt = Math.min(32, lastTime ? time - lastTime : 16);
                    lastTime = time;
                    const edge = 36;
                    const speed =
                      y < bounds.top + edge
                        ? -Math.min(1, (bounds.top + edge - y) / edge)
                        : y > bounds.bottom - edge
                          ? Math.min(1, (y - bounds.bottom + edge) / edge)
                          : 0;
                    if (speed) (scroll as HTMLElement).scrollTop += speed * dt * 0.6;
                    const dy = y - y0 + ((scroll as HTMLElement).scrollTop ?? 0) - scroll0;
                    const lo = tops[0] - tops[from];
                    const hi = tops[tops.length - 1]! + heights[heights.length - 1]! - h - tops[from];
                    const d = Math.max(lo, Math.min(hi, dy));
                    row.style.transform = `translateY(${d}px)`;
                    const mid = tops[from] + d + h / 2;
                    to = from;
                    if (d > 0) {
                      while (to < rows.length - 1 && mid >= tops[to + 1]! + heights[to + 1]! / 2) to++;
                    } else {
                      while (to > 0 && mid <= tops[to - 1]! + heights[to - 1]! / 2) to--;
                    }
                    if (d <= lo && from > 0) to = 0;
                    else if (d >= hi && from < rows.length - 1) to = rows.length - 1;
                    rows.forEach((r, i) => {
                      if (i === from) return;
                      const shift =
                        i > from && i <= to ? -h : i < from && i >= to ? h : 0;
                      r.style.transform = shift ? `translateY(${shift}px)` : "";
                    });
                    if (speed) frame = requestAnimationFrame(paint);
                  };
                  const move = (ev: PointerEvent) => {
                    if (ev.pointerId !== pointer) return;
                    if (!row.isConnected || !handle.isConnected) return finish(false, ev);
                    y = ev.clientY;
                    if (!dragging) {
                      if (Math.abs(y - y0) < 4) return;
                      dragging = true;
                      handle.dataset.dragged = "1";
                      setDraggingId(a.id);
                      setArrangeFor(null);
                      list.classList.add("sorting");
                      row.classList.add("dragging");
                      window.getSelection()?.removeAllRanges();
                      try {
                        handle.setPointerCapture(pointer);
                      } catch {
                        /* */
                      }
                    }
                    ev.preventDefault();
                    if (!frame) frame = requestAnimationFrame(paint);
                  };
                  const finish = (save: boolean, ev?: PointerEvent) => {
                    if (ended || (ev?.pointerId != null && ev.pointerId !== pointer)) return;
                    if (save && dragging && ev) {
                      y = ev.clientY;
                      cancelAnimationFrame(frame);
                      paint(performance.now());
                    }
                    if (ended) return;
                    ended = true;
                    cancelAnimationFrame(frame);
                    document.removeEventListener("pointermove", move);
                    document.removeEventListener("pointerup", up);
                    document.removeEventListener("pointercancel", cancel);
                    document.removeEventListener("keydown", keys, true);
                    handle.removeEventListener("lostpointercapture", cancel);
                    window.removeEventListener("blur", cancel);
                    window.removeEventListener("resize", cancel);
                    try {
                      if (handle.hasPointerCapture(pointer)) handle.releasePointerCapture(pointer);
                    } catch {
                      /* */
                    }
                    list.classList.remove("sorting");
                    row.classList.remove("dragging");
                    rows.forEach((r) => {
                      r.style.transform = "";
                    });
                    setDraggingId(null);
                    if (save && dragging && to !== from) moveVisible(from, to);
                  };
                  const up = (ev: PointerEvent) => finish(true, ev);
                  const cancel = () => finish(false);
                  const keys = (ev: KeyboardEvent) => {
                    if (ev.key === "Escape") {
                      ev.preventDefault();
                      finish(false);
                    }
                  };
                  document.addEventListener("pointermove", move);
                  document.addEventListener("pointerup", up);
                  document.addEventListener("pointercancel", cancel);
                  document.addEventListener("keydown", keys, true);
                  handle.addEventListener("lostpointercapture", cancel);
                  window.addEventListener("blur", cancel);
                  window.addEventListener("resize", cancel);
                }}>
                <MagpieIcon name={a.icon} />
              </button>
              <div className="who">
                <div className="name">{a.name}</div>
                {a.version ? <span className="ag-cli"><span className="ag-ver">{a.version}</span></span> : null}
                {a.missing ? <span className="ag-cli ag-missing">{t("CLI not found")}</span> : null}
                {a.missing ? null : a.id === "cursor" ? (
                  <div className="ag-st">
                    <span className="ag-dot" />
                    <span className="ag-st-t">{t("Only Cursor's own models")}</span>
                  </div>
                ) : wired[a.id] ? (
                  <div
                    className={`ag-st${staleDemo && DEMO_STALE[a.id] && staleSeen[a.id] !== DEMO_STALE[a.id].stale ? " wait" : " on"}`}
                    title={
                      staleDemo && DEMO_STALE[a.id] && staleSeen[a.id] !== DEMO_STALE[a.id].stale
                        ? staleSaid(a.name, DEMO_STALE[a.id].copies).title
                        : undefined
                    }>
                    <span className="ag-dot" />
                    <span className="ag-st-t">
                      {staleDemo && DEMO_STALE[a.id] && staleSeen[a.id] !== DEMO_STALE[a.id].stale
                        ? staleSaid(a.name, DEMO_STALE[a.id].copies).text
                        : t("Connected · new sessions take it")}
                    </span>
                  </div>
                ) : (
                  <div className="ag-st">
                    <span className="ag-dot" aria-hidden />
                    <span className="ag-st-t">
                      {comparison && a.id === "codex"
                        ? t("Not connected · now signed in with ChatGPT · OpenAI's models stay available once connected")
                        : t("Not connected · {agent} uses its own settings", { agent: a.name })}
                    </span>
                  </div>
                )}
              </div>
              {a.missing ? null : a.id === "cursor" || !a.connectable ? (
                <span className="ag-cant">{t("Can't connect")}</span>
              ) : (
                <>
                  {comparison && (a.id === "codex" || a.id === "deepseek") ? (
                    <FieldPill kind="main" className="ag-start" leading={<MagpieIcon name={a.id === "codex" ? "openai" : a.icon} />}
                      v={fieldVals[`${a.id}:model`] === "default" ? t("Default") : fieldVals[`${a.id}:model`]}
                      aria-label={t("Model")} aria-haspopup="listbox" open={fieldPop?.agentId === a.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        const el = e.currentTarget;
                        setAmPop(null);
                        setFieldPop(cur => cur?.agentId === a.id ? null : { agentId: a.id, key: `${a.id}:model`, el });
                      }} />
                  ) : null}
                  {/* Magpie connectRow: expandLink + connectSwitch (app.js L1067–1094 / L1308–1344 / L1406–1423) — not invent .val.acts */}
                  {wired[a.id] ? (
                    <button
                      type="button"
                      className={`ag-link${expandOpen === a.id ? " open" : ""}`}
                      aria-expanded={expandOpen === a.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandOpen((cur) => (cur === a.id ? null : a.id));
                      }}>
                      <span>
                        {expandOpen === a.id
                          ? t("Collapse")
                          : a.id === "claude"
                            ? t("Tiers")
                            : t("Details")}
                      </span>
                      {expandOpen === a.id ? null : (
                        <span className="chev">
                          <svg viewBox="0 0 12 12" width={10} height={10} aria-hidden>
                            <path
                              d="M4.5 3 7.5 6 4.5 9"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                      )}
                    </button>
                  ) : null}
                  <LibSwitch
                    kind="ag-conn"
                    on={!!wired[a.id]}
                    disabled={connectBusy === a.id}
                    aria-label={t("Connect {agent} to magpie", { agent: a.name })}
                    title={
                      wired[a.id]
                        ? t("Connected · switch off to put back what {agent} had before magpie", {
                            agent: a.name,
                          })
                        : t("Switch on and {agent}'s model list gets magpie's models", {
                            agent: a.name,
                          })
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      if (wired[a.id]) {
                        /* Magpie connectSwitch → askDisconnect; demo: restore like foot */
                        setWired((w) => ({ ...w, [a.id]: false }));
                        setExpandOpen(null);
                        setDiffOpen(null);
                        setFieldPop(null);
                        setAmPop(null);
                        onStatus(demoCopy("演示：已断开并还原", "Demo: disconnected and restored"), "ok");
                        return;
                      }
                      setConnectBusy(a.id);
                      window.setTimeout(() => {
                        setWired((w) => ({ ...w, [a.id]: true }));
                        setExpandOpen(a.id);
                        setConnectBusy(null);
                        onStatus(t("Connected · new sessions take it"), "ok");
                      }, 380);
                    }}
                  />
                </>
              )}
              {wired[a.id] && expandOpen === a.id && a.connectable ? (
                <div className="ag-exp" onClick={(e) => e.stopPropagation()}>
                  <div className="ag-settings">
                    <div className="ag-kv">
                      <div className="ag-k">{t("In {agent}", { agent: a.name })}</div>
                      <div className="ag-v">
                        <div className="ag-vl">
                          {a.id === "claude" ? (
                            <>
                              <span>{t("New sessions take it; switch the tiers in {cmd}.", { cmd: "" }).split("{cmd}")[0]}</span>
                              <code className="ag-code">/model</code>
                            </>
                          ) : (
                            <span>
                              {t("Reopen {agent}, then pick any model in {cmd}.", { agent: a.name, cmd: "/model" }).replace("{cmd}", "")}
                              <code className="ag-code">/model</code>
                            </span>
                          )}
                        </div>
                        {staleDemo && DEMO_STALE[a.id] && staleSeen[a.id] !== DEMO_STALE[a.id].stale ? (
                          <>
                            <div className="ag-vl ag-warn">
                              <span className="ag-dot" />
                              <span>
                                {t(
                                  DEMO_STALE[a.id].stale === 1
                                    ? "1 running {agent} still has the old list"
                                    : "{n} running {agent} still have the old list",
                                  { n: DEMO_STALE[a.id].stale, agent: a.name },
                                )}
                              </span>
                              <button
                                type="button"
                                className="ag-quiet"
                                onClick={() =>
                                  setStaleSeen((s) => ({ ...s, [a.id]: DEMO_STALE[a.id].stale }))
                                }>
                                {t("Got it")}
                              </button>
                            </div>
                            {DEMO_STALE[a.id].copies.map((c, i) => {
                              const how = STALE_HOW[c.kind];
                              if (!how) return null;
                              const raw = t(how[0], {
                                agent: a.name,
                                when: ago(c.since),
                                app: c.app || "",
                              });
                              const [pre, post] = raw.split("{cmd}");
                              return (
                                <div className="ag-vl ag-stale-copy" key={i}>
                                  {pre}
                                  {how[1] ? <code className="ag-code">{how[1]}</code> : null}
                                  {post || ""}
                                  {c.kind === "daemon" && a.id === "codex" ? (
                                    <button
                                      type="button"
                                      className="ag-quiet"
                                      onClick={() =>
                                        onStatus(
                                          demoCopy("演示：已重启 app-server", "Demo: app-server restarted"),
                                          "ok",
                                        )
                                      }>
                                      {t("Restart")}
                                    </button>
                                  ) : null}
                                </div>
                              );
                            })}
                          </>
                        ) : null}
                      </div>
                    </div>
                    {a.id === "claude" ? (
                      <div className="ag-kv">
                        <div className="ag-k">{t("Tiers")}</div>
                        <div className="ag-v">
                          {(["opus", "sonnet", "haiku"] as const).map((tier) => {
                            const fk = `claude:${tier}`;
                            const val = fieldVals[fk] || (tier === "sonnet" ? "claude-sonnet-4-5" : tier === "opus" ? "claude-opus-4" : "claude-haiku-4");
                            const open = fieldPop?.agentId === a.id && fieldPop.key === fk;
                            return (
                              <div className="ag-vl" key={tier}>
                                <span className="ag-tier">{tier[0].toUpperCase() + tier.slice(1)}</span>
                                <FieldPill
                                  className="ag-pick"
                                  open={open}
                                  v={val}
                                  aria-haspopup="listbox"
                                  onClick={(e) => {
                                    const el = e.currentTarget;
                                    setAmPop(null);
                                    setFieldPop((cur) =>
                                      cur?.agentId === a.id && cur.key === fk
                                        ? null
                                        : { agentId: a.id, key: fk, el },
                                    );
                                  }}
                                />
                                <span className="ag-hint">
                                  /model {tier}
                                  {tier === "sonnet"
                                    ? ` · ${t("the default tier")}`
                                    : tier === "haiku"
                                      ? ` · ${t("also for small background tasks")}`
                                      : ""}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    <div className="ag-kv">
                      <div className="ag-k">{t("Model list")}</div>
                      <div className="ag-v">
                        <div className="ag-vl ag-chips">
                          {(() => {
                            const list = amModels[a.id] || amCatalog;
                            const by = new Map<string, number>();
                            for (const m of list.filter((x) => x.on)) by.set(m.group, (by.get(m.group) || 0) + 1);
                            const hidden = list.filter((x) => !x.on).length;
                            return (
                              <>
                                {[...by.entries()].map(([g, n]) => (
                                  <span className="ag-chip" key={g}>
                                    <span>{g === "Routing groups" ? t("Routing groups") : g}</span>
                                    <span className="n">{n}</span>
                                  </span>
                                ))}
                                {hidden > 0 ? (
                                  <span className="ag-hint">{t("{n} hidden", { n: hidden })}</span>
                                ) : null}
                              </>
                            );
                          })()}
                          <button
                            type="button"
                            className={`ag-quiet${amPop?.agentId === a.id ? " open" : ""}`}
                            aria-haspopup="dialog"
                            aria-expanded={amPop?.agentId === a.id}
                            onClick={(e) => {
                              const el = e.currentTarget;
                              setFieldPop(null);
                              setAmPop((cur) =>
                                cur?.agentId === a.id ? null : { agentId: a.id, el },
                              );
                              if (!amModels[a.id]) {
                                setAmModels((m) => ({ ...m, [a.id]: amCatalog.map((x) => ({ ...x })) }));
                              }
                            }}>
                            <span>{t("Pick")}</span>
                            <span className="chev">
                              <svg viewBox="0 0 12 12" width={10} height={10} aria-hidden>
                                <path d="M4.5 3 7.5 6 4.5 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                              </svg>
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="ag-kv">
                      <div className="ag-k">{t("New sessions")}</div>
                      <div className="ag-v">
                        <div className="ag-vl">
                          <div className="fields">
                            {(() => {
                              const fk = `${a.id}:model`;
                              const val = fieldVals[fk] || "claude-sonnet-4-5";
                              const open = fieldPop?.agentId === a.id && fieldPop.key === fk;
                              return (
                                <FieldPill
                                  kind="main"
                                  className="ag-pick"
                                  open={open}
                                  k={t("Model")}
                                  v={val}
                                  aria-haspopup="listbox"
                                  onClick={(e) => {
                                    const el = e.currentTarget;
                                    setAmPop(null);
                                    setFieldPop((cur) =>
                                      cur?.agentId === a.id && cur.key === fk
                                        ? null
                                        : { agentId: a.id, key: fk, el },
                                    );
                                  }}
                                />
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                  {a.id === "claude" ? (
                    <div className="ag-kv">
                      <div className="ag-k" />
                      <div className="ag-v">
                        <button
                          type="button"
                          className="text"
                          onClick={() => {
                            setRelPhase("edit");
                            setRelPreview(null);
                            if (!relFrom) setRelFrom("~/code/magpie");
                            if (!relTo) setRelTo("~/code/magpie-moved");
                            setRelocateFor(a.id);
                          }}>
                          {t("Relocate project")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div className="ag-foot">
                    <span className="ag-files">
                      {t("Changed ")}
                      <span className="ag-path">~/.{a.id === "claude" ? "claude" : a.id}/settings.json</span>
                    </span>
                    <button
                      type="button"
                      className={`ag-quiet${diffOpen === a.id ? " open" : ""}`}
                      onClick={() => setDiffOpen((cur) => (cur === a.id ? null : a.id))}>
                      <span>{diffOpen === a.id ? t("Hide changes") : t("View")}</span>
                      <span className="chev">
                        <svg viewBox="0 0 12 12" width={10} height={10} aria-hidden>
                          <path d="M4.5 3 7.5 6 4.5 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      </span>
                    </button>
                    <span className="grow" />
                    <button
                      type="button"
                      className="ag-quiet red"
                      onClick={() => {
                        setWired((w) => ({ ...w, [a.id]: false }));
                        setExpandOpen(null);
                        setDiffOpen(null);
                        setFieldPop(null);
                        setAmPop(null);
                        onStatus(demoCopy("演示：已断开并还原", "Demo: disconnected and restored"), "ok");
                      }}>
                      {t("Disconnect and restore")}
                    </button>
                  </div>
                  {diffOpen === a.id ? (
                    <div className="ag-diff-box">
                      <div className="ag-diff">
                        <div className="ag-diff-file">
                          <div className="ag-diff-path">~/.{a.id === "claude" ? "claude" : a.id}/settings.json</div>
                          <div className="ag-diff-line back">
                            <span className="op">↺</span>
                            <code>
                              <span className="ind" />
                              <span className="t">{`"model": "${fieldVals[a.id + ":model"] || "claude-sonnet-4-5"}"`}</span>
                            </code>
                            <span className="ag-tag">{t("value before connecting")}</span>
                          </div>
                          <div className="ag-diff-line back">
                            <span className="op">↺</span>
                            <code>
                              <span className="ind" />
                              <span className="t">{`"env": { "ANTHROPIC_BASE_URL": "http://127.0.0.1:3425" }`}</span>
                            </code>
                            <span className="ag-tag">{t("value before connecting")}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}

          {unset.length || hidden.length ? (
            <>
              <div
                className={`agent-fold${showAllAgents ? " open" : ""}`}
                style={{ ["--n" as string]: unset.length + (hidden.length && !unset.length ? hidden.length : 0) }}>
                <div className="agent-fold-inner" inert={!showAllAgents ? true : undefined}>
                  {unset.length ? (
                    <>
                      <div className="agent-fold-cap" style={{ ["--i" as string]: 0 }}>
                        {t("Not set up")}
                      </div>
                      {unset.map((a, i) => (
                        <div
                          key={a.id}
                          className="row agent conn put-away"
                          data-id={a.id}
                          title={a.name}
                          style={{ ["--i" as string]: i + 1 }}>
                          <button type="button" className="ag-handle" aria-label={a.name}>
                            <MagpieIcon name={a.icon} />
                          </button>
                          <div className="who">
                            <div className="name">{a.name}</div>
                            <div className="ag-st">
                              <span className="ag-dot" aria-hidden />
                              <span className="ag-st-t">
                                {t("Not connected · {agent} uses its own settings", { agent: a.name })}
                              </span>
                            </div>
                          </div>
                          <LibSwitch
                            kind="ag-conn"
                            on={false}
                            disabled={connectBusy === a.id}
                            aria-label={t("Connect {agent} to magpie", { agent: a.name })}
                            title={t("Switch on and {agent}'s model list gets magpie's models", {
                              agent: a.name,
                            })}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConnectBusy(a.id);
                              window.setTimeout(() => {
                                setWired((w) => ({ ...w, [a.id]: true }));
                                setExpandOpen(a.id);
                                setConnectBusy(null);
                                setShowAllAgents(false);
                                onStatus(t("Connected · new sessions take it"), "ok");
                              }, 380);
                            }}
                          />
                        </div>
                      ))}
                    </>
                  ) : null}
                  {hidden.length && !unset.length ? (
                    <>
                      <div className="agent-fold-cap" style={{ ["--i" as string]: 0 }}>
                        {t("Hidden")}
                      </div>
                      {hidden.map((a, i) => (
                        <div
                          key={a.id}
                          className="row agent conn hid put-away"
                          data-id={a.id}
                          title={a.name}
                          style={{ ["--i" as string]: i + 1 }}>
                          <button type="button" className="ag-handle" aria-label={a.name}>
                            <MagpieIcon name={a.icon} />
                          </button>
                          <div className="who">
                            <div className="name">{a.name}</div>
                          </div>
                          <button
                            type="button"
                            className="ag-show"
                            title={ZH.showAgainTitle}
                            onClick={() => {
                              const next = new Set(hiddenIds);
                              next.delete(a.id);
                              setHiddenIds(next);
                            }}>
                            <span>{ZH.showAgain}</span>
                          </button>
                        </div>
                      ))}
                    </>
                  ) : null}
                  {hidden.length && unset.length ? (
                    <>
                      <button
                        type="button"
                        className="agent-fold-cap agent-hid-line"
                        aria-expanded={showHiddenFold}
                        title={t("Hidden by you · click to see them")}
                        style={{ ["--i" as string]: unset.length + 1 }}
                        onClick={() => setShowHiddenFold((o) => !o)}>
                        <span>{t("Hidden ({n})", { n: hidden.length })}</span>
                        <span className="chev" aria-hidden>
                          <svg viewBox="0 0 16 16" width={9} height={9}>
                            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </button>
                      {showHiddenFold
                        ? hidden.map((a) => (
                            <div key={a.id} className="row agent conn hid put-away" data-id={a.id} title={a.name}>
                              <button type="button" className="ag-handle" aria-label={a.name}>
                                <MagpieIcon name={a.icon} />
                              </button>
                              <div className="who">
                                <div className="name">{a.name}</div>
                              </div>
                              <button
                                type="button"
                                className="ag-show"
                                title={ZH.showAgainTitle}
                                onClick={() => {
                                  const next = new Set(hiddenIds);
                                  next.delete(a.id);
                                  setHiddenIds(next);
                                }}>
                                <span>{ZH.showAgain}</span>
                              </button>
                            </div>
                          ))
                        : null}
                    </>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                className="agent-more"
                data-unrolls=""
                aria-expanded={showAllAgents}
                onClick={() => setShowAllAgents((o) => !o)}>
                <span>
                  {showAllAgents
                    ? t("Show less")
                    : !unset.length
                      ? t("{n} hidden agents", { n: hidden.length })
                      : t("Show {n} more", { n: unset.length })}
                </span>
                <span className="chev" aria-hidden>
                  <svg viewBox="0 0 16 16" width={10} height={10}>
                    <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            </>
          ) : null}

          <div className="ag-manage-bar" id="agentsManage">
            <button
              type="button"
              className="ag-manage-button"
              title={ZH.manageAgentsAria}
              aria-label={ZH.manageAgentsAria}
              onClick={() => setManageOpen(true)}>
              <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden>
                <g
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round">
                  <path d="M2 3.5h2M6 3.5h8M2 8h2M6 8h8M2 12.5h2M6 12.5h8" />
                </g>
              </svg>
              <span>{ZH.manage}</span>
            </button>
          </div>
        </div>

        <section className="ag-install" id="agentsInstall">
          <button
            type="button"
            className="ag-install-head"
            aria-expanded={installsOpen}
            data-unrolls=""
            onClick={(e) => {
              e.stopPropagation();
              setInstallsOpen((o) => !o);
            }}>
            <span>{t("Install another agent ({n})", { n: INSTALLS.length })}</span>
            <span className="chev" aria-hidden>
              <svg viewBox="0 0 16 16" width={11} height={11}>
                <path
                  d="M4 6l4 4 4-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
          {installsOpen ? (
            <>
              <p className="ag-install-note">{ZH.installNote}</p>
              {INSTALLS.map((x) => (
                <div key={x.id} className="ag-install-row" data-id={x.id}>
                  <div className="ag-install-who">
                    <MagpieIcon name={x.icon || x.id} />
                    <span className="ag-install-name">
                      <b>{x.name}</b>
                    </span>
                  </div>
                  <div className="ag-install-cmds">
                    {x.commands.map((c) => (
                      <div key={c.command} className="ag-install-cmd">
                        <span className="ag-install-via">
                          {c.via === "script" ? t("Installer") : VIA_LABEL[c.via] || c.via}
                        </span>
                        <code>{c.command}</code>
                        <CopyBtn
                          text={c.command}
                          agentName={x.name}
                          onStatus={onStatus}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : null}
        </section>

        <section className={`profiles${naming ? " naming" : ""}`}>
          <span className="label">{ZH.profiles}</span>
          <div id="profiles" className="chips">
            {!naming ? (
              <span className="hint">{ZH.profilesNone}</span>
            ) : null}
          </div>
          {naming ? (
            <input
              ref={nameRef}
              className="chip-input"
              placeholder={ZH.profileName}
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" && profileName.trim()) closeSave();
                else if (e.key === "Escape") closeSave();
              }}
              onBlur={() => {
                setTimeout(() => closeSave(), 100);
              }}
            />
          ) : null}
          <button
            className="text"
            id="save"
            type="button"
            onMouseDown={(e) => {
              if (naming) e.preventDefault();
            }}
            onClick={onSaveClick}>
            {naming ? ZH.save : ZH.saveCurrent}
          </button>
        </section>
      </main>

      {/* Magpie askRelocate: openModal editor.sm-ask + modal.lib
          (plugins/sessions/client.js L901–959; sessions.css sm-ask-*) —
          drop invent inline ag-relocate / ag-settings / ag-quiet bar */}
      {relocateFor ? (
        <div
          className="modal lib"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setRelocateFor(null);
              setRelPhase("edit");
              setRelPreview(null);
            }
          }}>
          <div className="dialog" role="dialog" aria-modal onMouseDown={(e) => e.stopPropagation()}>
            <div className="editor sm-ask">
              <div className="ehead">
                <MagpieIcon name={"claude-color"} />
                <b>{t("Relocate Claude Code project")}</b>
              </div>
              <p className="sub sm-ask-path">{relFrom || "~/code/magpie"}</p>
              <p className="lib-confirm">
                {t("Close Claude Code and its editor sessions first. This moves the entire project's sessions, not just filtered or selected rows. Existing target storage is never overwritten. Desktop-only sessions are not changed.")}
              </p>
              <label className="sm-ask-field">
                {t("New absolute project path")}
                <input
                  type="text"
                  spellCheck={false}
                  autoComplete="off"
                  value={relTo}
                  disabled={relPhase === "done"}
                  onChange={(e) => {
                    setRelTo(e.target.value);
                    setRelPhase("edit");
                    setRelPreview(null);
                  }}
                />
              </label>
              <p className="lib-confirm" aria-live="polite">
                {relPreview || ""}
              </p>
              <div className="bar">
                <span className="grow" />
                <button
                  type="button"
                  className="text"
                  onClick={() => {
                    setRelocateFor(null);
                    setRelPhase("edit");
                    setRelPreview(null);
                  }}>
                  {relPhase === "done" ? t("Close") : t("Cancel")}
                </button>
                {relPhase !== "done" ? (
                  <button
                    type="button"
                    className={`text primary${relBusy ? " busy" : ""}`}
                    disabled={relBusy || !relTo.trim()}
                    onClick={() => {
                      setRelBusy(true);
                      window.setTimeout(() => {
                        setRelBusy(false);
                        if (relPhase === "edit") {
                          setRelPhase("preview");
                          setRelPreview(
                            t("Move {n} sessions ({size}) from {from} to {to}. Originals are retained outside Claude's project list. Historical message text is unchanged.", {
                              n: 12,
                              size: "48 MB",
                              from: relFrom || "~/code/magpie",
                              to: relTo.trim(),
                            }),
                          );
                        } else {
                          setRelPhase("done");
                          setRelPreview(
                            t("Relocation complete. Original files and recovery manifest: {dir}", {
                              dir: "~/.config/magpie/relocate-demo",
                            }),
                          );
                          onStatus(demoCopy("演示：会话路径已迁移（本地）", "Demo: sessions relocated (local)"), "ok");
                        }
                      }, 420);
                    }}>
                    {relBusy ? "…" : relPhase === "preview" ? t("Confirm relocation") : t("Preview relocation")}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {fieldPop ? (
        <ModelPop
          key={`${fieldPop.agentId}:${fieldPop.key}`}
          open
          anchor={fieldPop.el}
          value={fieldVals[fieldPop.key] || ""}
          modelPicker
          options={(comparison && fieldPop.agentId === "codex"
            ? [{ value: "gpt-6.1-sol", label: "gpt-6.1-sol", group: "Codex" }]
            : comparison && fieldPop.agentId === "deepseek" ? [{ value: "default", label: t("Default") }]
            : DEMO_POP_OPTS).filter(option => amModels[fieldPop.agentId]?.find(model => model.id === option.value)?.on !== false || fieldVals[fieldPop.key] === option.value)}
          onPick={(v) => {
            setFieldVals((f) => ({ ...f, [fieldPop.key]: v }));
            setFieldPop(null);
            onStatus(t("Saved"), "ok");
          }}
          onClose={() => setFieldPop(null)}
        />
      ) : null}

      {amPop ? (
        <AgentModelsPop
          key={amPop.agentId}
          open
          anchor={amPop.el}
          agentName={ALL_AGENTS.find((x) => x.id === amPop.agentId)?.name || amPop.agentId}
          agentId={amPop.agentId}
          currentModels={Object.entries(fieldVals).filter(([key]) => key.startsWith(amPop.agentId + ":")).map(([, value]) => value)}
          defaultOrder={amCatalog.map(m => m.id)}
          preferences={amPreferences[amPop.agentId] || { only: false, ordered: false }}
          onPreferences={next => setAmPreferences(previous => ({ ...previous, [amPop.agentId]: next }))}
          models={amModels[amPop.agentId] || amCatalog}
          onChange={(next) => setAmModels((m) => ({ ...m, [amPop.agentId]: next }))}
          onClose={() => setAmPop(null)}
        />
      ) : null}

      {manageOpen ? (
        <ManageAgentsModal
          agents={ALL_AGENTS}
          wired={wired}
          hiddenIds={hiddenIds}
          onHiddenChange={setHiddenIds}
          onClose={() => setManageOpen(false)}
        />
      ) : null}

      {arrangeFor ? (
                <ArrangeMenu
          anchor={arrangeFor.el}
          canMove={visible.length > 1}
          index={visible.findIndex((x) => x.id === arrangeFor.id)}
          count={visible.length}
          onHide={() => {
            const next = new Set(hiddenIds);
            next.add(arrangeFor.id);
            setHiddenIds(next);
            setArrangeFor(null);
          }}
          onMoveUp={() => {
            const i = visible.findIndex((x) => x.id === arrangeFor.id);
            moveVisible(i, i - 1);
          }}
          onMoveDown={() => {
            const i = visible.findIndex((x) => x.id === arrangeFor.id);
            moveVisible(i, i + 1);
          }}
          onClose={() => setArrangeFor(null)}
        />
      ) : null}
    </>
  );
}
