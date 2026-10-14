import { useCallback, useEffect, useRef, useState } from "react";
import { Bird } from "./components/Bird";
import { NavIcon } from "./components/NavIcons";
import { useSegThumb } from "./components/SegThumb";
import { GATEWAY_ADDR, NAV, type ViewId } from "./data/mock";
import { ZH, setLang, t, useLang, type Lang } from "./i18n";
import { AgentsView } from "./pages/AgentsView";
import { ProvidersView } from "./pages/ProvidersView";
import { RoutingView } from "./pages/RoutingView";
import { GatewayView } from "./pages/GatewayView";
import { PluginsView, UsageView } from "./pages/SimpleViews";
import { SettingsView } from "./pages/SettingsView";

const SIDE_AT = 1024;
const NAV_LS = "magpie.navLayout";

const TOP_IDS: ViewId[] = [
  "agents",
  "providers",
  "routing",
  "gateway",
  "usage",
  "plugins",
];

const VIEW_EN: Record<ViewId, string> = {
  agents: "Agents",
  providers: "Providers",
  routing: "Routing",
  gateway: "Gateway",
  usage: "Usage",
  plugins: "Plugins",
  settings: "Settings",
};

const VIEWS = new Set<string>([...TOP_IDS, "settings"]);

function viewFromHash(): ViewId {
  const h = location.hash.replace(/^#\/?/, "");
  return (VIEWS.has(h) ? h : "agents") as ViewId;
}

function isElectron(): boolean {
  return /\bElectron\b/i.test(navigator.userAgent);
}

function readNavPick(): "" | "side" | "top" {
  try {
    const v = localStorage.getItem(NAV_LS) || "";
    return v === "side" || v === "top" ? v : "";
  } catch {
    return "";
  }
}

function wantSide(navPick: "" | "side" | "top"): boolean {
  if (navPick === "side") return true;
  if (navPick === "top") return false;
  return window.matchMedia(`(min-width: ${SIDE_AT}px)`).matches;
}

export default function App() {
  const lang = useLang();
  const [view, setView] = useState<ViewId>(() => viewFromHash());
  const [theme, setTheme] = useState<"system" | "light" | "dark">("light");
  const [status, setStatus] = useState<{ msg: string; kind: string } | null>(
    null,
  );
  const [spinning, setSpinning] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [sideOn, setSideOn] = useState(() => wantSide(readNavPick()));
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncRef = useRef<HTMLButtonElement>(null);
  const setNavBox = useSegThumb(sideOn || view === "settings" ? null : view);

  const showStatus = (msg: string, kind = "ok", ms = 3500) => {
    setStatus({ msg, kind });
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(null), ms);
  };

  const applyChrome = useCallback(() => {
    const electron = isElectron();
    document.body.classList.add("window");
    document.body.classList.remove("linux", "mac");
    document.body.classList.toggle("side-nav", sideOn);
    if (electron) document.body.classList.remove("web");
    else document.body.classList.add("web");
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [sideOn, theme]);

  useEffect(() => {
    applyChrome();
  }, [applyChrome]);

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${SIDE_AT}px)`);
    const onChange = () => {
      if (readNavPick()) return;
      setSideOn(mq.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggleSideNav = useCallback(() => {
    setSideOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(NAV_LS, next ? "side" : "top");
      } catch {
        /* this time only */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = /^Mac/i.test(navigator.platform);
      const mod = isMac
        ? e.metaKey && e.ctrlKey && !e.shiftKey
        : e.ctrlKey && e.shiftKey && !e.metaKey;
      if (!mod || e.altKey || e.repeat || e.code !== "KeyS") return;
      e.preventDefault();
      toggleSideNav();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [toggleSideNav]);

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
        const timing = a.effect!.getComputedTiming();
        a.effect!.updateTiming({
          iterations: (timing.currentIteration || 0) + 1,
        });
      }
      Promise.all(spins.map((a) => a.finished)).then(stop, stop);
    } else stop();
  };

  const sideToggleLabel = sideOn ? t("Hide sidebar") : t("Show sidebar");
  const isMac =
    typeof navigator !== "undefined" && /^Mac/i.test(navigator.platform);
  const sideTitle = `${sideToggleLabel} (${isMac ? "⌃⌘S" : "Ctrl+Shift+S"})`;

  const crumbParts: string[] = [];
  if (sideOn) {
    if (view === "settings") crumbParts.push(t("Settings"));
    else {
      const group = NAV.find((g) => g.items.some((i) => i.id === view));
      if (group) crumbParts.push(lang === "en" ? group.groupEn : group.group);
      crumbParts.push(t(VIEW_EN[view]));
    }
  }

  const brand = (
    <div className="brand">
      <span className="logo" aria-hidden>
        <Bird size={18} />
      </span>
      <span>magpie</span>
    </div>
  );

  const prefsBtn = (
    <button
      className={`icon${view === "settings" ? " on" : ""}`}
      id="prefs"
      type="button"
      title={`${t("Settings")} (Ctrl+,)`}
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
      <span className="side-l">{t("Settings")}</span>
    </button>
  );

  const sideNavItems = NAV.flatMap((g) => [
    <span key={`gl-${g.groupEn}`} className="nav-gl">
      {lang === "en" ? g.groupEn : g.group}
    </span>,
    ...g.items.map((item) => (
      <button
        key={item.id}
        type="button"
        data-view={item.id}
        className={view === item.id ? "on" : ""}
        aria-current={view === item.id ? "page" : undefined}
        onClick={() => go(item.id)}
      >
        <NavIcon name={item.icon} />
        <span>{t(VIEW_EN[item.id])}</span>
      </button>
    )),
  ]);

  const sideNav = (
    <nav className="seg" id="nav" aria-label={t("Agents")}>
      {sideNavItems}
    </nav>
  );

  return (
    <>
      <aside className="sidebar" id="side" hidden={!sideOn}>
        <div className="side-top">{sideOn ? brand : null}</div>
        <div className="side-scroll">{sideOn ? sideNav : null}</div>
        <div className="side-foot">
          {sideOn ? prefsBtn : null}
          <button
            type="button"
            className="side-gw"
            id="sideGw"
            onClick={() => go("gateway")}
          >
            <i />
            <span>
              {t("Gateway")} {GATEWAY_ADDR}
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

      <header className={`top${sideOn ? "" : " inrow tight"}`}>
        {!sideOn ? brand : null}
        <h1 className="sr-only" id="pageTitle">
          {t(VIEW_EN[view])}
        </h1>
        <button
          type="button"
          className="icon side-toggle"
          id="sideToggle"
          title={sideTitle}
          aria-label={sideToggleLabel}
          aria-pressed={sideOn}
          onClick={toggleSideNav}
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
        <div className="crumb" id="crumb" hidden={!sideOn} aria-hidden={!sideOn}>
          {crumbParts.map((p, i) =>
            i === 0 ? (
              crumbParts.length === 1 ? (
                <b key={i}>{p}</b>
              ) : (
                <span key={i}>{p}</span>
              )
            ) : (
              <span key={`c-${i}`} style={{ display: "contents" }}>
                <i>/</i>
                {i === crumbParts.length - 1 ? <b>{p}</b> : <span>{p}</span>}
              </span>
            ),
          )}
        </div>
        {!sideOn ? (
          <nav
            className="seg"
            id="nav"
            aria-label="Main navigation"
            ref={setNavBox}
          >
            {TOP_IDS.map((id) => (
              <button
                key={id}
                type="button"
                data-view={id}
                className={view === id ? "on" : ""}
                aria-current={view === id ? "page" : undefined}
                onClick={() => go(id)}
              >
                <span>{t(VIEW_EN[id])}</span>
              </button>
            ))}
          </nav>
        ) : null}
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
          {!sideOn ? prefsBtn : null}
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
      {view === "gateway" && (
        <GatewayView
          onStatus={showStatus}
          onGoNetwork={() => {
            try {
              sessionStorage.setItem("magpie.setTab", "network");
            } catch { /* ignore */ }
            go("settings");
          }}
        />
      )}
      {view === "usage" && <UsageView />}
      {view === "plugins" && <PluginsView />}
      {view === "settings" && (
        <SettingsView
          theme={theme}
          setTheme={setTheme}
          lang={lang}
          setLang={(v: Lang) => setLang(v)}
          onStatus={showStatus}
        />
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
