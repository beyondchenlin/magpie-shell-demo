import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import installsData from "../data/installs.json";
import { VIA_LABEL, iconSrc } from "../data/mock";
import { ZH, demoCopy, t } from "../i18n";

type InstallCmd = { via: string; command: string; node?: string };
type Install = {
  id: string;
  name: string;
  icon?: string;
  commands: InstallCmd[];
};

const INSTALLS = installsData as Install[];

const ALL_AGENTS = [
  { id: "cursor", name: "Cursor", icon: "cursor", connectable: false },
  { id: "claude", name: "Claude Code", icon: "claude-color", connectable: true },
  { id: "codex", name: "Codex", icon: "codex-color", connectable: true },
  { id: "opencode", name: "OpenCode", icon: "openai", connectable: true },
  { id: "pi", name: "Pi", icon: "openai", connectable: true },
] as const;

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
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`copy${done ? " done" : ""}`}
      title={ZH.copy}
      aria-label={ZH.copy}
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard?.writeText(text).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 900);
        // Magpie: status(t("{what} copied", { what: t("{agent}'s install command", …) }))
        onStatus(t("{what} copied", { what: t("{agent}'s install command", { agent: agentName }) }), "ok");
      }}
    >
      <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden>
        <rect
          x="5.5"
          y="5.5"
          width="7"
          height="7"
          rx="1.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M3.5 10.5v-7A1.5 1.5 0 0 1 5 2h7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

type ManageProps = {
  hiddenIds: Set<string>;
  onHiddenChange: (next: Set<string>) => void;
  onClose: () => void;
};

function ManageAgentsModal({
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

  const agents = ALL_AGENTS;
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
        ? ZH.agentHiddenN.replace("{n}", String(ids.length))
        : ZH.agentUnhiddenN.replace("{n}", String(ids.length)),
    );
  };

  return (
    <div
      className="modal lib"
      id="modal"
      ref={modalRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
        tabIndex={-1}
      >
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
              <button
                type="button"
                className="text"
                onClick={() =>
                  setSelected(new Set(matching.map((a) => a.id)))
                }
              >
                {ZH.selectSearchResults}
              </button>
              <button
                type="button"
                className="text"
                onClick={() => {
                  setSelected((prev) => {
                    const n = new Set(prev);
                    for (const a of matching) {
                      if (n.has(a.id)) n.delete(a.id);
                      else n.add(a.id);
                    }
                    return n;
                  });
                }}
              >
                {ZH.invertSearchSelection}
              </button>
              <button
                type="button"
                className="text"
                onClick={() => {
                  // Magpie: clear then add matching !onMagpie
                  setSelected(
                    new Set(
                      matching.filter((a) => a.connectable).map((a) => a.id),
                    ),
                  );
                }}
              >
                {ZH.selectUnconnected}
              </button>
              <button
                type="button"
                className="text"
                onClick={() => setSelected(new Set())}
              >
                {ZH.clearSelection}
              </button>
            </div>
            <span className="ag-manage-count">
              {ZH.agentsSelected.replace("{n}", String(selected.size))}
            </span>
            <div className="ag-manage-rows">
              {matching.length === 0 ? (
                <p className="lib-confirm">{ZH.noMatchingAgents}</p>
              ) : (
                matching.map((a) => (
                  <label key={a.id} className="ag-manage-row" data-id={a.id}>
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      aria-label={a.name}
                      onChange={(e) => toggle(a.id, e.target.checked)}
                    />
                    <span className="ic">
                      <img src={iconSrc(a.icon)} alt="" />
                    </span>
                    <span className="ag-manage-name">{a.name}</span>
                    <span className="ag-manage-state">
                      {hiddenIds.has(a.id) ? ZH.hidden : ZH.notHidden}
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
            <button
              type="button"
              className="text"
              disabled={!canHide}
              onClick={() => applyVisibility(true)}
            >
              {ZH.hideSelected}
            </button>
            <button
              type="button"
              className="text"
              disabled={!canUnhide}
              onClick={() => applyVisibility(false)}
            >
              {ZH.unhideSelected}
            </button>
            <span className="grow" />
            <button type="button" className="text" onClick={close}>
              {ZH.done}
            </button>
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
  onClose: () => void;
};

function ArrangeMenu({
  anchor,
  canMove,
  index,
  count,
  onHide,
  onClose,
}: ArrangeProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const r = anchor.getBoundingClientRect();
    const pad = 8;
    const w = box.offsetWidth || 176;
    const h = box.offsetHeight || 100;
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
      if (!box.contains(e.target as Node) && !anchor.contains(e.target as Node))
        onClose();
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
    const first = box.querySelector<HTMLButtonElement>(
      "button.rm-item:not(:disabled)",
    );
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
    sep?: boolean;
    run: () => void;
  }[] = [
    {
      name: ZH.moveUp,
      icon: MOVE_UP,
      key: ALT + "↑",
      off: !canMove || index <= 0,
      run: () => {},
    },
    {
      name: ZH.moveDown,
      icon: MOVE_DOWN,
      key: ALT + "↓",
      off: !canMove || index < 0 || index >= count - 1,
      run: () => {},
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
    <div className="pop row-menu" role="menu" ref={boxRef}>
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
    </div>
  );
}


export function AgentsView({
  onAddProvider,
  refreshNonce,
  onStatus,
}: Props) {
  const [guideHidden, setGuideHidden] = useState(() => {
    try {
      return localStorage.getItem(GUIDE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [arrangeFor, setArrangeFor] = useState<{
    id: string;
    el: HTMLElement;
  } | null>(null);
  const [installsOpen, setInstallsOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
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
  const [expandOpen, setExpandOpen] = useState<string | null>(null);
  const [connectBusy, setConnectBusy] = useState<string | null>(null);
  const [diffOpen, setDiffOpen] = useState<string | null>(null);
  const [relFrom, setRelFrom] = useState("~/.claude/projects/old");
  const [relTo, setRelTo] = useState("~/.claude/projects/new");
  const [relBusy, setRelBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

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

  const visible = ALL_AGENTS.filter((a) => !hiddenIds.has(a.id));
  const hidden = ALL_AGENTS.filter((a) => hiddenIds.has(a.id));

  return (
    <>
      <main className="view" id="view-agents">
        {!guideHidden ? (
          <div className="ag-lead guiding" id="agentsLead">
            <section className="guide" aria-label={ZH.getStarted}>
              <div className="guide-head">
                <b className="guide-h">{ZH.getStarted}</b>
                <span className="guide-n">
                  {demoCopy(
                    `已完成 ${1 + (Object.values(wired).some(Boolean) ? 1 : 0)}/2`,
                    `${1 + (Object.values(wired).some(Boolean) ? 1 : 0)} of 2 done`,
                  )}
                </span>
                <button
                  type="button"
                  className="guide-x"
                  title={ZH.hideGetStarted}
                  aria-label={ZH.hideGetStarted}
                  onClick={(e) => {
                    e.stopPropagation();
                    const lead = document.getElementById("agentsLead");
                    if (lead && !calm()) {
                      lead.style.transition = "opacity .22s var(--ease), transform .22s var(--ease)";
                      lead.style.opacity = "0";
                      lead.style.transform = "translateY(-6px)";
                      window.setTimeout(() => {
                        setGuideHidden(true);
                        try { localStorage.setItem(GUIDE_KEY, "1"); } catch { /* ignore */ }
                      }, 220);
                    } else {
                      setGuideHidden(true);
                      try { localStorage.setItem(GUIDE_KEY, "1"); } catch { /* ignore */ }
                    }
                  }}
                >
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
                        onClick={onAddProvider}
                      >
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
                    <span className="guide-say">{ZH.connectAgentSay}</span>
                    <div className="guide-acts" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {ALL_AGENTS.filter((a) => a.connectable).map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          className={`text${wired[a.id] ? "" : " primary"} guide-go`}
                          onClick={() => {
                            if (wired[a.id]) {
                              setExpandOpen(a.id);
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
                        >
                          {connectBusy === a.id
                            ? "…"
                            : wired[a.id]
                              ? t("Connected · new sessions take it")
                              : t("Connect {agent}", { agent: a.name })}
                        </button>
                      ))}
                    </div>
                  </div>
                </li>
              </ol>
            </section>
          </div>
        ) : null}

        <div className="list" id="agents">
          {visible.map((a) => (
            <div
              key={a.id}
              className="row agent conn"
              data-id={a.id}
              title={a.name}
            >
              <button
                type="button"
                className="ag-handle"
                aria-label={ZH.arrangeAria.replace("{agent}", a.name)}
                aria-haspopup="menu"
                title={ZH.arrangeTitle}
                onClick={(e) => {
                  const el = e.currentTarget;
                  setArrangeFor((cur) =>
                    cur?.id === a.id ? null : { id: a.id, el },
                  );
                }}
              >
                <span className="ic">
                  <img src={iconSrc(a.icon)} alt="" />
                </span>
              </button>
              <div className="who">
                <div className="name">{a.name}</div>
                {a.id === "cursor" ? (
                  <div className="ag-native-note">
                    <span className="sq" aria-hidden />
                    <span className="sq" aria-hidden />
                    <span>{ZH.onlyCursorOwn}</span>
                  </div>
                ) : wired[a.id] ? (
                  <div className="sub" style={{ fontSize: 12, color: "var(--muted)" }}>
                    {t("Connected · new sessions take it")}
                  </div>
                ) : (
                  <div className="sub" style={{ fontSize: 12, color: "var(--faint)" }}>
                    {demoCopy("演示：可接入 Magpie 模型列表", "Demo: can connect Magpie models")}
                  </div>
                )}
              </div>
              {a.id === "cursor" || !a.connectable ? (
                <span className="ag-cant">{ZH.cantConnect}</span>
              ) : (
                <div className="val" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {a.id === "claude" ? (
                    <button
                      type="button"
                      className="text"
                      aria-expanded={relocateFor === a.id}
                      onClick={() => setRelocateFor((cur) => (cur === a.id ? null : a.id))}
                    >
                      {t("Relocate")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`text${wired[a.id] ? "" : " primary"}${connectBusy === a.id ? " busy" : ""}`}
                    aria-pressed={!!wired[a.id]}
                    aria-expanded={expandOpen === a.id}
                    aria-label={t("Connect {agent} to magpie", { agent: a.name })}
                    title={
                      wired[a.id]
                        ? t("Connected · new sessions take it")
                        : t("Connect {agent}", { agent: a.name })
                    }
                    disabled={connectBusy === a.id}
                    onClick={() => {
                      if (wired[a.id]) {
                        setExpandOpen((cur) => (cur === a.id ? null : a.id));
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
                  >
                    {connectBusy === a.id
                      ? "…"
                      : wired[a.id]
                        ? expandOpen === a.id
                          ? t("Connected · new sessions take it")
                          : t("Connected · new sessions take it")
                        : demoCopy("接入", "Connect")}
                  </button>
                </div>
              )}
              {relocateFor === a.id ? (
                <div
                  className="ag-relocate ag-exp"
                  style={{ animation: "fade-in .18s var(--ease)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="ag-settings">
                    <div className="ag-kv">
                      <div className="ag-k">{t("Relocate Claude Code project")}</div>
                      <div className="ag-v">
                        <div className="ag-vl" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                          <label style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 8, alignItems: "center", fontSize: 12 }}>
                            <span style={{ color: "var(--muted)" }}>{t("From folder")}</span>
                            <input className="words" value={relFrom} onChange={(e) => setRelFrom(e.target.value)} />
                          </label>
                          <label style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 8, alignItems: "center", fontSize: 12 }}>
                            <span style={{ color: "var(--muted)" }}>{t("To folder")}</span>
                            <input className="words" value={relTo} onChange={(e) => setRelTo(e.target.value)} />
                          </label>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button type="button" className="ag-quiet" onClick={() => setRelocateFor(null)}>{t("Cancel")}</button>
                            <span className="grow" />
                            <button
                              type="button"
                              className="ag-quiet accent"
                              disabled={relBusy}
                              onClick={() => {
                                setRelBusy(true);
                                window.setTimeout(() => {
                                  setRelBusy(false);
                                  setRelocateFor(null);
                                  onStatus(demoCopy("演示：会话路径已迁移（本地）", "Demo: sessions relocated (local)"), "ok");
                                }, 480);
                              }}
                            >
                              {relBusy ? "…" : t("Relocate")}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              {wired[a.id] && expandOpen === a.id && a.connectable ? (
                <div className="ag-exp" onClick={(e) => e.stopPropagation()} style={{ animation: "fade-in .22s var(--ease)" }}>
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
                            <span>{t("Reopen {agent}, then pick any model in {cmd}.", { agent: a.name, cmd: "/model" }).replace("{cmd}", "")}<code className="ag-code">/model</code></span>
                          )}
                        </div>
                      </div>
                    </div>
                    {a.id === "claude" ? (
                      <div className="ag-kv">
                        <div className="ag-k">{t("Tiers")}</div>
                        <div className="ag-v">
                          {(["opus", "sonnet", "haiku"] as const).map((tier) => (
                            <div className="ag-vl" key={tier}>
                              <span className="ag-tier">{tier[0].toUpperCase() + tier.slice(1)}</span>
                              <button type="button" className="field ag-pick" style={{ height: 28, padding: "0 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--card)" }}>
                                <span className="v">{tier === "sonnet" ? "claude-sonnet-4-5" : tier === "opus" ? "claude-opus-4" : "claude-haiku-4"}</span>
                              </button>
                              <span className="ag-hint">/model {tier}{tier === "sonnet" ? ` · ${t("the default tier")}` : tier === "haiku" ? ` · ${t("also for small background tasks")}` : ""}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="ag-kv">
                      <div className="ag-k">{t("Model list")}</div>
                      <div className="ag-v">
                        <div className="ag-vl ag-chips">
                          <span className="ag-chip"><span>Anthropic</span><span className="n">4</span></span>
                          <span className="ag-chip"><span>OpenAI</span><span className="n">3</span></span>
                          <span className="ag-chip"><span>{t("Routing groups")}</span><span className="n">1</span></span>
                          <button type="button" className="ag-quiet" onClick={() => onStatus(demoCopy("演示：打开模型挑选", "Demo: open model picker"), "ok")}>
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
                          <div className="fields" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button type="button" className="field main" style={{ height: 28, minWidth: 170, padding: "0 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--card)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <span className="k" style={{ fontSize: 11, color: "var(--muted)" }}>{t("Model")}</span>
                              <span className="v">claude-sonnet-4-5</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ag-foot">
                    <span className="ag-files">
                      {t("Changed ")}
                      <span className="ag-path">~/.{a.id === "claude" ? "claude" : a.id}/settings.json</span>
                    </span>
                    <button
                      type="button"
                      className={`ag-quiet${diffOpen === a.id ? " open" : ""}`}
                      onClick={() => setDiffOpen((cur) => (cur === a.id ? null : a.id))}
                    >
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
                        onStatus(demoCopy("演示：已断开并还原", "Demo: disconnected and restored"), "ok");
                      }}
                    >
                      {t("Disconnect and restore")}
                    </button>
                  </div>
                  {diffOpen === a.id ? (
                    <div className="ag-diff-box" style={{ marginTop: 8, animation: "fade-in .15s var(--ease)" }}>
                      <div className="ag-diff">
                        <div className="ag-diff-file">
                          <div className="ag-diff-path">~/.{a.id === "claude" ? "claude" : a.id}/settings.json</div>
                          <pre className="ag-diff-body" style={{ margin: "6px 0 0", padding: 10, borderRadius: 8, background: "var(--pill)", fontSize: 11.5, lineHeight: 1.45, overflow: "auto" }}>
{`+ "model": "claude-sonnet-4-5"
+ "env": { "ANTHROPIC_BASE_URL": "http://127.0.0.1:3425" }`}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}

          {hidden.length > 0 ? (
            <>
              <button
                type="button"
                className="agent-fold-cap agent-hid-line"
                aria-expanded={showHiddenFold}
                title={ZH.showHidden}
                onClick={() => setShowHiddenFold((o) => !o)}
              >
                <span>
                  {ZH.hiddenFold.replace("{n}", String(hidden.length))}
                </span>
              </button>
              {showHiddenFold
                ? hidden.map((a) => (
                    <div
                      key={a.id}
                      className="row agent conn hid"
                      data-id={a.id}
                      title={a.name}
                    >
                      <button
                        type="button"
                        className="ag-handle"
                        aria-label={a.name}
                      >
                        <span className="ic">
                          <img src={iconSrc(a.icon)} alt="" />
                        </span>
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
                        }}
                      >
                        <span>{ZH.showAgain}</span>
                      </button>
                    </div>
                  ))
                : null}
            </>
          ) : null}

          <div className="ag-manage-bar" id="agentsManage">
            <button
              type="button"
              className="ag-manage-button"
              title={ZH.manageAgentsAria}
              aria-label={ZH.manageAgentsAria}
              onClick={() => setManageOpen(true)}
            >
              <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden>
                <g
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
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
            }}
          >
            <span>{ZH.installAnother}</span>
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
                    <span className="ic">
                      <img
                        src={iconSrc(x.icon || x.id)}
                        alt=""
                        onError={(e) => {
                          const el = e.currentTarget;
                          if (!el.dataset.fallback) {
                            el.dataset.fallback = "1";
                            el.src = `/icons/${x.icon || x.id}.png`;
                          }
                        }}
                      />
                    </span>
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
            onClick={onSaveClick}
          >
            {naming ? ZH.save : ZH.saveCurrent}
          </button>
        </section>
      </main>

      {manageOpen ? (
        <ManageAgentsModal
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
          onClose={() => setArrangeFor(null)}
        />
      ) : null}
    </>
  );
}
