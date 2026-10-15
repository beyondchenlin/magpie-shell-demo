/**
 * Magpie tray / quick panel (body.panel) — native-linux/tray/01–27.
 * Open: ?panel=1 | #panel | localStorage magpie.demoPanel=1
 * Allowances tab: Magpie hides entire [data-ptab=usage] when no subscription/balance — N/A here (not a missing UI).
 * Escape: HideOnEscape unmaps panel (shot 21). Save current naming: blur discards (22–24); Escape is not discard.
 * Open Usage → Requests/Today; Open Routing → peer-serves card.
 * tray/25–27 effort bars (Cursor has no effort field): three faint unlit bars = one control;
 *   hover shows row path tip (~/.cursor/cli-config.json, clipped at panel edge) — NOT an effort name;
 *   click toggles row open with model line only — NO slider / levels invented.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Bird, useLogoWag } from "../components/Bird";
import { ModelPop, type PopOption } from "../components/ModelPop";
import { useSegThumb } from "../components/SegThumb";
import { iconSrc } from "../data/mock";
import { t } from "../i18n";
import { FieldPill } from "../components/FieldPill";

type PTab = "agents" | "usage" | "stats" | "routing";

const CHEV = (
  <svg viewBox="0 0 12 12" width={10} height={10} aria-hidden>
    <path
      d="M4.5 2.5 8 6l-3.5 3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const CURSOR_MODELS: PopOption[] = [
  {
    value: "default",
    label: "Default",
    note: "what Cursor ships with",
    icon: "cursor",
    reset: true,
  },
  {
    value: "auto",
    label: "auto",
    note: "let Cursor pick",
    icon: "cursor",
  },
];

type Props = {
  /** Leave panel into main window; optional hash view id (usage / routing / agents…). */
  onOpenMain: (dest?: string) => void;
  /** Escape / HideOnEscape — unmap panel without opening main (shot 21). */
  onHide: () => void;
  onQuit: () => void;
  onPrefs: () => void;
  onStatus: (msg: string, kind?: string) => void;
};

export function TrayPanel({ onOpenMain, onHide, onQuit, onPrefs, onStatus }: Props) {
  const [tab, setTab] = useState<PTab>(() => {
    try {
      const v = localStorage.getItem("magpie.panelTab") || "agents";
      if (v === "usage" || v === "stats" || v === "routing" || v === "agents") return v;
    } catch {
      /* */
    }
    return "agents";
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [model, setModel] = useState("default");
  const [modelPop, setModelPop] = useState(false);
  const [profilesOpen, setProfilesOpen] = useState(false);
  /** tray/22–24: ＋ Save current → name field; blur discards (Escape is HideOnEscape) */
  const [naming, setNaming] = useState(false);
  const [profileName, setProfileName] = useState("");
  const syncRef = useRef<HTMLButtonElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const modelFieldRef = useRef<HTMLButtonElement>(null);
  const profBtnRef = useRef<HTMLButtonElement>(null);
  const profBoxRef = useRef<HTMLElement | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  /** Native: no subscription/balance → Allowances tab omitted from DOM (tray NOTES). */
  const hasAllowances = false;
  const setTabs = useSegThumb(tab);
  const [usePeriod, setUsePeriod] = useState<"today" | "7d" | "30d" | "all">("today");
  const setPeriodThumb = useSegThumb(usePeriod);

  useLogoWag(brandRef);

  useEffect(() => {
    document.body.classList.add("panel", "linux", "window");
    document.body.classList.remove("side-nav", "web");
    document.body.dataset.ptab = tab;
    try {
      localStorage.setItem("magpie.panelTab", tab);
    } catch {
      /* */
    }
    return () => {
      document.body.classList.remove("panel", "linux");
      delete document.body.dataset.ptab;
    };
  }, [tab]);

  useEffect(() => {
    if (!profilesOpen) return;
    const away = (e: MouseEvent) => {
      const n = e.target as Node;
      if (profBoxRef.current?.contains(n) || profBtnRef.current?.contains(n)) return;
      setNaming(false);
      setProfileName("");
      setProfilesOpen(false);
    };
    document.addEventListener("mousedown", away, true);
    return () => document.removeEventListener("mousedown", away, true);
  }, [profilesOpen]);

  useEffect(() => {
    if (naming) nameRef.current?.focus({ preventScroll: true });
  }, [naming]);

  const discardNaming = useCallback(() => {
    setNaming(false);
    setProfileName("");
  }, []);

  // tray/21 HideOnEscape — unmap panel.
  // tray/24: Escape is NOT naming discard (field does not preventDefault); blur is.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (modelPop) return; // ModelPop dismisses itself (capture + stopPropagation)
      if (naming) {
        // Native HideOnEscape unmaps whole panel; do not leave idle Profiles popover
        e.preventDefault();
        discardNaming();
        setProfilesOpen(false);
        onHide();
        return;
      }
      if (profilesOpen) {
        e.preventDefault();
        setProfilesOpen(false);
        return;
      }
      e.preventDefault();
      onHide();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modelPop, profilesOpen, naming, onHide, discardNaming]);

  // Magpie placeProfiles: float above Profiles btn, under ptabs
  useLayoutEffect(() => {
    const box = profBoxRef.current;
    const btn = profBtnRef.current;
    if (!box || !profilesOpen || !btn) return;
    const place = () => {
      const r = btn.getBoundingClientRect();
      const top = document.getElementById("ptabs")?.getBoundingClientRect().bottom ?? 0;
      box.style.bottom = Math.round(window.innerHeight - r.top + 6) + "px";
      box.style.maxHeight = Math.max(120, Math.round(r.top - 6 - top - 4)) + "px";
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [profilesOpen, naming]);

  const goTab = useCallback(
    (next: PTab) => {
      if (next === "usage" && !hasAllowances) return;
      setTab(next);
      setOpenId(null);
      setModelPop(false);
      setNaming(false);
      setProfileName("");
      setProfilesOpen(false);
    },
    [hasAllowances],
  );

  const onSync = async () => {
    const b = syncRef.current;
    if (!b || spinning) return;
    setSpinning(true);
    b.classList.add("spin");
    await new Promise((r) => setTimeout(r, 280));
    onStatus(t("Looked again"), "ok");
    b.classList.remove("spin");
    setSpinning(false);
  };

  const agentOpen = openId === "cursor";
  const modelLabel = model === "default" ? "default" : model;

  const emptyUsageTitle =
    usePeriod === "today" ? t("No requests today") : t("No requests here");

  return (
    <>
      <header className="top inrow tight">
        <div className="brand" ref={brandRef}>
          <span className="logo" aria-hidden>
            <Bird size={18} />
          </span>
          <span>magpie</span>
        </div>
        <h1 className="sr-only">{t("Agents")}</h1>
        <div className="actions">
          <button
            className="icon"
            id="sync"
            type="button"
            ref={syncRef}
            title={t(
              "Look for agents on this computer again: one just installed or removed, or its settings changed",
            )}
            onClick={() => void onSync()}
          >
            <svg viewBox="0 0 16 16" width={14} height={14}>
              <path
                d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3h-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            className="icon"
            id="open"
            type="button"
            title={t("Open as a window")}
            onClick={() => {
              try {
                localStorage.removeItem("magpie.routingPeerServes");
              } catch {
                /* */
              }
              onOpenMain("agents");
            }}
          >
            <svg viewBox="0 0 16 16" width={14} height={14}>
              <path
                d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10M9 2h5v5M14 2 8 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            className="icon"
            id="prefs"
            type="button"
            title={`${t("Settings")} (Ctrl+,)`}
            onClick={onPrefs}
          >
            <svg viewBox="0 0 24 24" width={14} height={14}>
              <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </g>
            </svg>
          </button>
        </div>
      </header>

      <nav className="ptabs" id="ptabs" ref={setTabs} role="tablist" aria-label={t("Agents")}>
        <button
          type="button"
          data-ptab="agents"
          className={tab === "agents" ? "on" : ""}
          aria-selected={tab === "agents"}
          onClick={() => goTab("agents")}
        >
          <span>{t("Agents")}</span>
          <em id="ptabN">1</em>
        </button>
        <button
          type="button"
          data-ptab="usage"
          className={tab === "usage" ? "on" : ""}
          aria-selected={tab === "usage"}
          hidden={!hasAllowances}
          onClick={() => goTab("usage")}
        >
          <span>{t("Allowances")}</span>
        </button>
        <button
          type="button"
          data-ptab="stats"
          className={tab === "stats" ? "on" : ""}
          aria-selected={tab === "stats"}
          onClick={() => goTab("stats")}
        >
          <span>{t("Usage")}</span>
        </button>
        <button
          type="button"
          data-ptab="routing"
          className={tab === "routing" ? "on" : ""}
          aria-selected={tab === "routing"}
          onClick={() => goTab("routing")}
        >
          <span>{t("Routing")}</span>
        </button>
      </nav>

      <main className="view" id="view-agents">
        <div className="list" id="agents" hidden={tab !== "agents"}>
          <div
            className={`row agent${agentOpen ? " open" : ""}`}
            data-id="cursor"
            aria-expanded={agentOpen}
            title="~/.cursor/cli-config.json"
            onClick={(ev) => {
              /* tray/25–27: bars are one control on the row; click toggles open (model only). */
              if ((ev.target as HTMLElement).closest(".ag-open, .ag-handle")) return;
              setOpenId(agentOpen ? null : "cursor");
              setModelPop(false);
            }}
          >
            <span
              className="ag-handle"
              aria-hidden
              title="~/.cursor/cli-config.json"
            >
              <span className="ic" data-icon="cursor" aria-hidden>
                <img src={iconSrc("cursor")} alt="" draggable={false} />
              </span>
            </span>
            <div className="who">
              <div className="name">Cursor</div>
            </div>
            <div className="ag-sum">
              <div className="v">
                <span className="vt">{modelLabel}</span>
              </div>
              {/* Cursor: no effort field — bars unlit (data-l=0), no effort title; tip is row.path */}
              <span className="eff" data-l="0" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <span className="chev">{CHEV}</span>
            </div>
            <div className="ag-open" onClick={(e) => e.stopPropagation()}>
              <div className="ag-in">
                <div className="ag-body">
                  <FieldPill
                    kind="solo"
                    open={modelPop}
                    k={t("Model")}
                    v={modelLabel}
                    trailing={
                      <span className="ic" data-icon="cursor" aria-hidden>
                        <img src={iconSrc("cursor")} alt="" draggable={false} />
                      </span>
                    }
                    ref={modelFieldRef}
                    onClick={() => setModelPop((v) => !v)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Allowances: hidden when hasAllowances=false — Magpie N/A, not a gap */}
        <section className="panel-quota" id="panelQuota" hidden={tab !== "usage" || !hasAllowances} />

        <section className="panel-usage" id="panelUsage" hidden={tab !== "stats"}>
          <div className="pu-bar">
            <div className="segs" ref={setPeriodThumb}>
              {(
                [
                  ["today", "Today"],
                  ["7d", "7 days"],
                  ["30d", "30 days"],
                  ["all", "All"],
                ] as const
              ).map(([id, name]) => (
                <button
                  key={id}
                  type="button"
                  className={`opt${usePeriod === id ? " on" : ""}`}
                  onClick={() => setUsePeriod(id)}
                >
                  {t(name)}
                </button>
              ))}
            </div>
            <span className="grow" />
            <button
              type="button"
              className="icon pu-again"
              title={t("Refresh now")}
              aria-label={t("Refresh now")}
              onClick={(e) => {
                const b = e.currentTarget;
                b.classList.add("spin");
                onStatus(t("Usage refreshed"), "ok");
                setTimeout(() => b.classList.remove("spin"), 400);
              }}
            >
              <svg viewBox="0 0 16 16" width={13} height={13}>
                <path
                  d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="text"
              onClick={() => {
                try {
                  localStorage.setItem("magpie.usageTab", "requests");
                  localStorage.setItem("magpie.usagePeriod", "today");
                } catch {
                  /* */
                }
                onOpenMain("usage");
              }}
            >
              {t("Open Usage")}
            </button>
          </div>
          <p className="usage-note">
            {t("Gateway and session-log calls; local rejections excluded from totals.")}
          </p>
          <div className="pu-none">
            <b>{emptyUsageTitle}</b>
            {t(
              "Every request an agent sends to magpie, and every call the agents' own session files record, is counted here.",
            )}
          </div>
        </section>

        {/* 07-routing: green today 0 · Open Routing · gateway-not-running */}
        <section className="panel-routing" id="panelRouting" hidden={tab !== "routing"}>
          <div className="pr-head">
            <span className="rt-livedot on" aria-hidden="true" />
            <span className="pr-today">
              <span>{t("today")}</span> <b>0</b> {t("calls")} · <b>0</b> {t("tokens")}
            </span>
            <span className="grow" />
            <button
              type="button"
              className="text"
              onClick={() => {
                try {
                  /* Panel process does not hold the gateway — main window shows peer-serves card (shot 20). */
                  localStorage.setItem("magpie.routingPeerServes", "1");
                } catch {
                  /* */
                }
                onOpenMain("routing");
              }}
            >
              {t("Open Routing")}
            </button>
          </div>
          <p className="pr-none">{t("The gateway isn't running, so nothing is routed.")}</p>
        </section>

        {/* 10-profiles + tray/22–24 Save current naming */}
        <section
          className={`profiles${profilesOpen ? " open" : ""}${naming ? " naming" : ""}`}
          ref={profBoxRef}
          aria-hidden={!profilesOpen}
        >
          <span
            className="label"
            onMouseDown={(e: ReactMouseEvent) => {
              /* tray/24: click PROFILES label → blur discards field; hint returns */
              if (naming) {
                e.preventDefault();
                discardNaming();
              }
            }}
          >
            {t("Profiles")}
          </span>
          <div id="profiles" className="chips">
            {!naming ? (
              <span className="hint">{t("none yet · save the setup to switch back in one click")}</span>
            ) : null}
          </div>
          {naming ? (
            <input
              ref={nameRef}
              className="chip-input"
              placeholder={t("Profile name")}
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              onKeyDown={(e) => {
                /* tray/24: Escape must NOT discard here — HideOnEscape unmaps panel */
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!profileName.trim()) return;
                  /* Demo: no profiles.json write — exit naming, no chip */
                  discardNaming();
                }
                /* Escape: do not preventDefault / stopPropagation */
              }}
              onBlur={() => {
                /* blur (incl. PROFILES label) discards draft; popover stays */
                window.setTimeout(() => discardNaming(), 100);
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
            onClick={() => {
              if (!naming) {
                setNaming(true);
                return;
              }
              if (!profileName.trim()) {
                nameRef.current?.focus({ preventScroll: true });
                return;
              }
              /* Demo mock — no chip / no profiles.json (NOTES: draft not kept) */
              discardNaming();
            }}
          >
            {naming ? t("Save") : t("＋ Save current")}
          </button>
        </section>
      </main>

      <footer className="foot">
        <button
          type="button"
          className="text prof-btn"
          id="profBtn"
          ref={profBtnRef}
          aria-haspopup="dialog"
          aria-expanded={profilesOpen}
          onClick={() =>
            setProfilesOpen((v) => {
              if (v) {
                setNaming(false);
                setProfileName("");
              }
              return !v;
            })
          }
        >
          <span>{t("Profiles")}</span>
        </button>
        <span className="grow" />
        <button
          className="text"
          id="openMain"
          type="button"
          onClick={() => {
            try {
              localStorage.removeItem("magpie.routingPeerServes");
            } catch {
              /* */
            }
            onOpenMain("agents");
          }}
        >
          {t("Open magpie")}
        </button>
        <button className="text" id="quit" type="button" onClick={onQuit}>
          {t("Quit")}
        </button>
      </footer>

      {/* 09-model-menu */}
      <ModelPop
        open={modelPop}
        anchor={modelFieldRef.current}
        options={CURSOR_MODELS}
        value={model}
        modelPicker
        placeholder={t("Filter, or type any model id…")}
        onPick={(v) => {
          setModel(v);
          setModelPop(false);
        }}
        onClose={() => setModelPop(false)}
      />
    </>
  );
}

export function wantPanelMode(): boolean {
  try {
    if (new URLSearchParams(location.search).get("panel") === "1") return true;
    if (location.hash.replace(/^#\/?/, "") === "panel") return true;
    if (localStorage.getItem("magpie.demoPanel") === "1") return true;
  } catch {
    /* */
  }
  return false;
}
