import { useEffect, useState } from "react";
import { Bird } from "./components/Bird";
import { NavIcon } from "./components/NavIcons";
import { NAV, type ViewId } from "./data/mock";
import { AgentsView } from "./pages/AgentsView";
import { ProvidersView } from "./pages/ProvidersView";
import { RoutingView } from "./pages/RoutingView";
import {
  GatewayView,
  LibraryView,
  PluginsView,
  SessionsView,
  SettingsView,
  UsageView,
} from "./pages/SimpleViews";

const TITLES: Record<ViewId, string> = {
  agents: "Agent",
  sessions: "会话",
  library: "资源库",
  providers: "供应商",
  routing: "路由",
  gateway: "网关",
  usage: "用量",
  plugins: "插件",
  settings: "设置",
};

const VIEWS = new Set<string>([
  "agents","sessions","library","providers","routing","gateway","usage","plugins","settings",
]);

function viewFromHash(): ViewId {
  const h = location.hash.replace(/^#\/?/, "");
  return (VIEWS.has(h) ? h : "routing") as ViewId;
}

export default function App() {
  const [view, setView] = useState<ViewId>(() => viewFromHash());
  const [theme, setTheme] = useState<"system" | "light" | "dark">("light");

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

  return (
    <>
      <aside className="sidebar" id="side">
        <div className="side-top" />
        <div className="side-scroll">
          <div className="brand" style={{ padding: "10px 8px 6px", gap: 6 }}>
            <span className="logo" aria-hidden>
              <Bird size={18} />
            </span>
            <span>magpie</span>
            <span className="demo-badge">DEMO</span>
          </div>
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
            title="设置"
            onClick={() => go("settings")}
          >
            <NavIcon name="settings" />
            <span className="side-l">设置</span>
          </button>
        </div>
        <div className="side-edge" id="sideEdge" role="separator" aria-orientation="vertical" tabIndex={0} />
      </aside>

      <header className="top">
        <h1 className="sr-only" id="pageTitle">
          {TITLES[view]}
        </h1>
        <div className="crumb" id="crumb" aria-hidden={false}>
          <span>{TITLES[view]}</span>
        </div>
        <div className="grow" />
        <div className="actions">
          <button className="icon" id="sync" type="button" title="重新检测本机 Agent（Demo 无操作）">
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

      {view === "agents" && <AgentsView />}
      {view === "sessions" && <SessionsView />}
      {view === "library" && <LibraryView />}
      {view === "providers" && <ProvidersView />}
      {view === "routing" && <RoutingView />}
      {view === "gateway" && <GatewayView />}
      {view === "usage" && <UsageView />}
      {view === "plugins" && <PluginsView />}
      {view === "settings" && <SettingsView theme={theme} setTheme={setTheme} />}
    </>
  );
}
