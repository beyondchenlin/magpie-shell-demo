import { useEffect, useRef, useState } from "react";
import { Bird } from "./components/Bird";
import { NavIcon } from "./components/NavIcons";
import {
  GATEWAY_ADDR,
  GROUP_OF,
  NAV,
  TITLES,
  ZH,
  type ViewId,
} from "./data/mock";
import { AgentsView } from "./pages/AgentsView";
import { ProvidersView } from "./pages/ProvidersView";
import { RoutingView } from "./pages/RoutingView";
import {
  GatewayView,
  PluginsView,
  SettingsView,
  UsageView,
} from "./pages/SimpleViews";

const VIEWS = new Set<string>(Object.keys(TITLES));

function viewFromHash(): ViewId {
  const h = location.hash.replace(/^#\/?/, "");
  return (VIEWS.has(h) ? h : "agents") as ViewId;
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

  const showStatus = (msg: string, kind = "ok", ms = 3500) => {
    setStatus({ msg, kind });
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(null), ms);
  };

  useEffect(() => {
    document.body.classList.add("side-nav", "window", "web");
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

  const onSync = async () => {
    const b = syncRef.current;
    if (!b || spinning) return;
    setSpinning(true);
    b.classList.add("spin");
    // Demo: no agents/rescan API — brief delay then toast (A-09)
    await new Promise((r) => setTimeout(r, 280));
    setRefreshNonce((n) => n + 1);
    if (view === "agents") showStatus(ZH.agentsLookedAgain, "ok");
    else showStatus(ZH.agentsLookedAgain, "ok");
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

  const group = GROUP_OF[view];

  return (
    <>
      <aside className="sidebar" id="side">
        <div className="side-top">
          <div className="brand">
            <span className="logo" aria-hidden>
              <Bird size={18} />
            </span>
            <span>magpie</span>
          </div>
        </div>
        <div className="side-scroll">
          <nav className="seg" id="nav" aria-label="主导航">
            {NAV.map((g) => (
              <span key={g.group} style={{ display: "contents" }}>
                <span className="nav-gl">{g.group}</span>
                {g.items.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    data-view={it.id}
                    className={view === it.id ? "on" : ""}
                    aria-current={view === it.id ? "page" : undefined}
                    onClick={() => go(it.id)}
                  >
                    <NavIcon name={it.icon} />
                    <span>{it.label}</span>
                  </button>
                ))}
              </span>
            ))}
          </nav>
        </div>
        <div className="side-foot">
          <button
            type="button"
            className={`icon${view === "settings" ? " on" : ""}`}
            id="prefs"
            title={ZH.settings}
            onClick={() => go("settings")}
          >
            <NavIcon name="settings" />
            <span className="side-l">{ZH.settings}</span>
          </button>
          <button
            type="button"
            className="side-gw"
            id="sideGw"
            onClick={() => go("gateway")}
            title={`${ZH.gateway} ${GATEWAY_ADDR}`}
          >
            <i />
            <span>
              {ZH.gateway} {GATEWAY_ADDR}
            </span>
          </button>
        </div>
        <div
          className="side-edge"
          id="sideEdge"
          role="separator"
          aria-orientation="vertical"
          tabIndex={0}
        />
      </aside>

      <header className="top">
        <h1 className="sr-only" id="pageTitle">
          {TITLES[view]}
        </h1>
        <div className="crumb" id="crumb" aria-hidden={false}>
          {view === "settings" ? (
            <b>{ZH.settings}</b>
          ) : (
            <>
              {group ? <span>{group}</span> : null}
              {group ? <i>/</i> : null}
              <b>{TITLES[view]}</b>
            </>
          )}
        </div>
        <div className="grow" />
        <div className="actions">
          <button
            className="icon"
            id="sync"
            type="button"
            ref={syncRef}
            title={ZH.syncAgentsTitle}
            aria-label={ZH.syncAgentsTitle}
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
      </footer>
    </>
  );
}
