/**
 * Magpie tray / menu-bar panel (body.panel) — Agents tab from native-linux/tray/01-agents.png.
 * Open with ?panel=1 or #panel. Allowances tab hidden when no quotas (Magpie renderPanelQuota).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Bird } from "../components/Bird";
import { useSegThumb } from "../components/SegThumb";
import { iconSrc } from "../data/mock";
import { t } from "../i18n";

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

type Props = {
  onOpenMain: () => void;
  onQuit: () => void;
  onPrefs: () => void;
  onStatus: (msg: string, kind?: string) => void;
};

export function TrayPanel({ onOpenMain, onQuit, onPrefs, onStatus }: Props) {
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
  const syncRef = useRef<HTMLButtonElement>(null);
  const hasAllowances = false; // demo: no quotas → Allowances tab hidden (shot 01)
  const setTabs = useSegThumb(tab);

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

  const goTab = useCallback(
    (next: PTab) => {
      if (next === "usage" && !hasAllowances) return;
      setTab(next);
      setOpenId(null);
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

  return (
    <>
      <header className="top inrow tight">
        <div className="brand">
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
            title={t("Look for agents on this computer again: one just installed or removed, or its settings changed")}
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
            onClick={onOpenMain}
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
            title={t("Settings")}
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
            onClick={() => setOpenId(agentOpen ? null : "cursor")}
          >
            <span className="ag-handle" aria-hidden>
              <img className="ic" src={iconSrc("cursor")} alt="" />
            </span>
            <div className="who">
              <div className="name">Cursor</div>
            </div>
            <div className="ag-sum">
              <div className="v">
                <span className="vt">default</span>
              </div>
              <span className="eff" data-l="3" title={t("Effort")} aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <span className="chev">{CHEV}</span>
            </div>
            <div className="ag-open" onClick={(e) => e.stopPropagation()}>
              <div className="ag-in">
                <div className="ag-body">
                  <button type="button" className="field solo">
                    <span className="k">{t("Model")}</span>
                    <span className="v">default</span>
                    <span className="chev">{CHEV}</span>
                  </button>
                  <button type="button" className="field solo">
                    <span className="k">{t("Effort")}</span>
                    <span className="v">{t("Follow the model")}</span>
                    <span className="chev">{CHEV}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="panel-quota" id="panelQuota" hidden={tab !== "usage" || !hasAllowances}>
          <p className="pq-anote" style={{ padding: "8px 4px", color: "var(--muted)", fontSize: 12 }}>
            {t("No allowances to show")}
          </p>
        </section>

        <section className="panel-usage" id="panelUsage" hidden={tab !== "stats"}>
          <p style={{ padding: "12px 4px", color: "var(--muted)", fontSize: 12.5, textAlign: "center" }}>
            {t("No usage yet")}
          </p>
        </section>

        <section className="panel-routing" id="panelRouting" hidden={tab !== "routing"}>
          <div className="rt-panel-idle" style={{ padding: "16px 8px", textAlign: "center" }}>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 12.5 }}>{t("Waiting for a request")}</p>
            <p style={{ margin: "6px 0 0", color: "var(--faint)", fontSize: 11.5 }}>
              {t("Send one through the gateway to see it here")}
            </p>
          </div>
        </section>
      </main>

      <footer className="foot">
        <button
          type="button"
          className="text prof-btn"
          id="profBtn"
          aria-haspopup="dialog"
          aria-expanded="false"
          onClick={() => onStatus(t("No profiles yet"), "ok")}
        >
          <span>{t("Profiles")}</span>
        </button>
        <span className="grow" />
        <button className="text" id="openMain" type="button" onClick={onOpenMain}>
          {t("Open magpie")}
        </button>
        <button className="text" id="quit" type="button" onClick={onQuit}>
          {t("Quit")}
        </button>
      </footer>
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
