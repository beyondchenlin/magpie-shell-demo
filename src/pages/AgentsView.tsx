import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import installsData from "../data/installs.json";
import { VIA_LABEL, ZH, iconSrc } from "../data/mock";

type InstallCmd = { via: string; command: string; node?: string };
type Install = {
  id: string;
  name: string;
  icon?: string;
  commands: InstallCmd[];
};

const INSTALLS = installsData as Install[];

const ALL_AGENTS = [{ id: "cursor", name: "Cursor", icon: "cursor", connected: false }] as const;

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
        onStatus(ZH.installCmdCopied.replace("{agent}", agentName), "ok");
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
                      matching.filter((a) => !a.connected).map((a) => a.id),
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

export function AgentsView({
  onAddProvider,
  refreshNonce,
  onStatus,
}: Props) {
  const [guideHidden, setGuideHidden] = useState(false);
  const [installsOpen, setInstallsOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [showHiddenFold, setShowHiddenFold] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

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
                <span className="guide-n">{ZH.ofDone}</span>
                <button
                  type="button"
                  className="guide-x"
                  title={ZH.hideGetStarted}
                  aria-label={ZH.hideGetStarted}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Not recorded this pass — stub only (CLICK-LOG NOTE)
                    setGuideHidden(true);
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
              <button type="button" className="ag-handle" aria-label={a.name}>
                <span className="ic">
                  <img src={iconSrc(a.icon)} alt="" />
                </span>
              </button>
              <div className="who">
                <div className="name">{a.name}</div>
                <div className="ag-native-note">
                  <span className="sq" aria-hidden />
                  <span className="sq" aria-hidden />
                  <span>{ZH.onlyCursorOwn}</span>
                </div>
              </div>
              <span className="ag-cant">{ZH.cantConnect}</span>
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
                          {VIA_LABEL[c.via] || c.via}
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
    </>
  );
}
