import { useEffect, useRef, useState } from "react";
import { Bird } from "./components/Bird";
import { useSegThumb } from "./components/SegThumb";
import { GATEWAY_ADDR, TITLES, ZH, type ViewId } from "./data/mock";
import { AgentsView } from "./pages/AgentsView";
import { ProvidersView } from "./pages/ProvidersView";
import { RoutingView } from "./pages/RoutingView";
import {
  GatewayView,
  PluginsView,
  SettingsView,
  UsageView,
} from "./pages/SimpleViews";

/** Win/Mac desktop gold: top tabs at default 660×600 (SIDE_AT=1024). Not side-nav. */
const TOP_TABS: { id: ViewId; label: string }[] = [
  { id: "agents", label: "Agents" },
  { id: "providers", label: "Providers" },
  { id: "routing", label: "Routing" },
  { id: "gateway", label: "Gateway" },
  { id: "usage", label: "Usage" },
  { id: "plugins", label: "Plugins" },
];

const VIEWS = new Set<string>([...TOP_TABS.map((t) => t.id), "settings"]);

function viewFromHash(): ViewId {
  const h = location.hash.replace(/^#\/?/, "");
  return (VIEWS.has(h) ? h : "agents") as ViewId;
}

function isElectron(): boolean {
  return /\bElectron\b/i.test(navigator.userAgent);
}

export default function App() {
  const [view, setView] = useState<ViewId>(() => viewFromHash());
  const [theme, setTheme] = useState<"system" | "light" | "dark">("light");
  const [status, setStatus] = useState<{ msg: string; kind: string } | null>(
    null,
  );
  const [spinning, setSpinning] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncRef = useRef<HTMLButtonElement>(null);
  const setNavBox = useSegThumb(view === "settings" ? null : view);

  const showStatus = (msg: string, kind = "ok", ms = 3500) => {
    setStatus({ msg, kind });
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(null), ms);
  };

  useEffect(() => {
    const electron = isElectron();
    // Gold: Win/Mac compact window = top tabs. Never force body.linux (that adds in-page X).
    document.body.classList.remove("side-nav", "linux", "mac");
    document.body.classList.add("window");
    if (electron) {
      // Windows exe: OS title bar; Magpie hides .brand when not mac/linux/web
      document.body.classList.remove("web");
    } else {
      // Browser preview: keep brand (marketing / agents-light.png)
      document.body.classList.add("web");
    }
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (id: ViewId) => {
    setView(id);
    if (location.hash.replace(/^#\/?/, "") !== id) location.hash = id;
  };

  const syncKind =
    view === "agents" ? "agents" : view === "usage" ? "usage" : "models";
  const syncTitle =
    syncKind === "agents" ? ZH.syncAgentsTitle : ZH.syncModelsTitle;
  const syncToast =
    syncKind === "agents" ? ZH.agentsLookedAgain : ZH.modelListsRefreshed;

  const onSync = async () => {
    const b = syncRef.current;
    if (!b || spinning) return;
    setSpinning(true);
    b.classList.add("spin");
    await new Promise((r) => setTimeout(r, 280));
    setRefreshNonce((n) => n + 1);
    showStatus(syncToast, "ok");
    b.blur();
    const spins = b.querySelector("svg")?.getAnimations({ subtree: true }) ?? [];
    const stop = () => {
      b.classList.remove("spin");
      setSpinning(false);
    };
    if (
      spins.length &&
      spins.every((a) => a.effect && "updateTiming" in a.effect)
    ) {
      for (const a of spins) {
        const t = a.effect!.getComputedTiming();
        a.effect!.updateTiming({
          iterations: (t.currentIteration || 0) + 1,
        });
      }
      Promise.all(spins.map((a) => a.finished)).then(stop, stop);
    } else stop();
  };


  return (
    <>
      {/* Magpie starts #side[hidden]; desktop gold is top tabs — do not mount sidebar */}
      <aside className="sidebar" id="side" hidden />

      <header className="top inrow tight">
        <div className="brand">
          <span className="logo" aria-hidden>
            <Bird size={18} />
          </span>
          <span>magpie</span>
        </div>
        <h1 className="sr-only" id="pageTitle">
          {TITLES[view]}
        </h1>
        <button
          type="button"
          className="icon side-toggle"
          id="sideToggle"
          title="Show sidebar"
          aria-label="Show sidebar"
          onClick={() =>
            showStatus(
              "Win/Mac gold is top tabs at 660×600. Side-nav only if width≥1024 or user picks it — not default desktop.",
              "ok",
              4500,
            )
          }
        >
          <svg viewBox="0 0 16 16" width={15} height={15} aria-hidden="true">
            <rect className="st-pane" x="2.5" y="3.5" width="4" height="9" rx="1" />
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            >
              <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2.25" />
              <path d="M6.75 2.75v10.5" />
            </g>
          </svg>
        </button>
        <div className="crumb" id="crumb" aria-hidden hidden />
        <nav
          className="seg"
          id="nav"
          aria-label="Main navigation"
          ref={setNavBox}
        >
          {TOP_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              data-view={t.id}
              className={view === t.id ? "on" : ""}
              aria-current={view === t.id ? "page" : undefined}
              onClick={() => go(t.id)}
            >
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="actions">
          <button
            className="icon"
            id="sync"
            type="button"
            ref={syncRef}
            title={syncTitle}
            aria-label={syncTitle}
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
            className={`icon${view === "settings" ? " on" : ""}`}
            id="prefs"
            type="button"
            title="Settings (Ctrl+,)"
            aria-current={view === "settings" ? "page" : undefined}
            onClick={() => go("settings")}
          >
            <svg viewBox="0 0 24 24" width={14} height={14}>
              <g
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </g>
            </svg>
            <span className="side-l">{ZH.settings}</span>
          </button>
        </div>
      </header>

      {view === "agents" && (
        <AgentsView
          onAddProvider={() => go("providers")}
          refreshNonce={refreshNonce}
          onStatus={showStatus}
        />
      )}
      {view === "providers" && (
        <ProvidersView
          onStatus={showStatus}
          onGoPlugins={() => go("plugins")}
        />
      )}
      {view === "routing" && <RoutingView />}
      {view === "gateway" && <GatewayView />}
      {view === "usage" && <UsageView />}
      {view === "plugins" && <PluginsView />}
      {view === "settings" && (
        <SettingsView theme={theme} setTheme={setTheme} />
      )}

      <footer className="foot">
        <span
          id="status"
          className={`status${status ? ` ${status.kind}` : ""}`}
          role={status?.kind === "err" ? "alert" : "status"}
          aria-atomic="true"
          title={status?.msg || undefined}
        >
          {status?.msg || ""}
        </span>
        <span className="grow" />
        <span className="sr-only">{GATEWAY_ADDR}</span>
      </footer>
    </>
  );
}
