import { useCallback, useEffect, useRef, useState } from "react";
import { Bird, useLogoWag } from "./components/Bird";
import { NavIcon } from "./components/NavIcons";
import { useSegThumb } from "./components/SegThumb";
import { GATEWAY_ADDR, NAV, type ViewId } from "./data/mock";
import { ZH, demoCopy, setLang, t, useLang, type Lang } from "./i18n";
import { AgentsView } from "./pages/AgentsView";
import { ProvidersView } from "./pages/ProvidersView";
import { RoutingView } from "./pages/RoutingView";
import { GatewayView } from "./pages/GatewayView";
import { PluginsView, UsageView } from "./pages/SimpleViews";
import { LibraryView } from "./pages/LibraryView";
import { SettingsView, applyColorblind } from "./pages/SettingsView";
import { TrayPanel, wantPanelMode } from "./pages/TrayPanel";
import { StatusToast } from "./components/StatusToast";
import { WinCaption } from "./components/WinCaption";
import { applyDocumentTheme, readDemoTheme } from "./applyTheme";

const SIDE_AT = 1024;
const NAV_LS = "magpie.navLayout";
const SIDE_W_LS = "magpie.sideWidth";
const SIDE_MIN = 168;
const SIDE_MAX = 320;

function sideFit(w: number) {
  return Math.round(Math.max(SIDE_MIN, Math.min(w, SIDE_MAX, window.innerWidth * 0.36)));
}

function readSideW(): number {
  try {
    return Math.round(+localStorage.getItem(SIDE_W_LS)!) || 0;
  } catch {
    return 0;
  }
}

function libraryOn(): boolean {
  try {
    return localStorage.getItem("magpie.feature.library") === "1";
  } catch {
    return false;
  }
}

function topIds(): ViewId[] {
  const base: ViewId[] = ["agents", "providers", "routing", "gateway", "usage", "plugins"];
  if (libraryOn()) base.splice(1, 0, "library");
  return base;
}

const VIEW_EN: Record<ViewId, string> = {
  agents: "Agents",
  library: "Library",
  providers: "Providers",
  routing: "Routing",
  gateway: "Gateway",
  usage: "Usage",
  plugins: "Plugins",
  settings: "Settings",
};

const VIEWS = new Set<string>(["agents", "library", "providers", "routing", "gateway", "usage", "plugins", "settings"]);

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

/** Magpie phoneWeb(): web + narrow (or coarse tablet ≤1024). Forces top tabs. */
const PHONE_WEB_MQ = "(max-width: 760px), (pointer: coarse) and (max-width: 1024px)";

function isPhoneWebViewport(): boolean {
  return window.matchMedia(PHONE_WEB_MQ).matches;
}

function phoneWeb(): boolean {
  return !isElectron() && isPhoneWebViewport();
}

function wantSide(navPick: "" | "side" | "top"): boolean {
  if (phoneWeb()) return false;
  if (navPick === "side") return true;
  if (navPick === "top") return false;
  // Magpie gold: SIDE_AT 1024 — under that = top tabs (Win/Mac / nest 752).
  return window.matchMedia(`(min-width: ${SIDE_AT}px)`).matches;
}

export default function App() {
  const lang = useLang();
  const [view, setView] = useState<ViewId>(() => viewFromHash());
  const [theme, setTheme] = useState<"system" | "light" | "dark">(() => readDemoTheme());
  const [status, setStatus] = useState<{ msg: string; kind: string } | null>(
    null,
  );
  const [headerUpdateOn, setHeaderUpdateOn] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [sideOn, setSideOn] = useState(() => wantSide(readNavPick()));
  const [phone, setPhone] = useState(() => phoneWeb());
  /** Magpie fitTop classes: tight → cramped → inrow → crowded → packed */
  const [topFit, setTopFit] = useState("inrow tight");
  const [libFeat, setLibFeat] = useState(libraryOn);
  const topRef = useRef<HTMLElement | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncRef = useRef<HTMLButtonElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const sideEdgeRef = useRef<HTMLDivElement>(null);
  useLogoWag(brandRef);
  const setNavBox = useSegThumb(sideOn || view === "settings" ? null : view);

  const showStatus = (msg: string, kind = "ok", ms = 3500) => {
    setStatus({ msg, kind });
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(null), ms);
  };

  const applyChrome = useCallback(() => {
    const electron = isElectron();
    const onPhone = !electron && isPhoneWebViewport();
    // Magpie layout.js:16 — :root.win Segoe stack (app.css L108–111)
    document.documentElement.classList.add("win");
    document.body.classList.add("window");
    // Default gold = Windows desktop chrome, not Linux in-page title bar
    // (titlebar_other.go: Windows keeps its own title bar; no body.linux).
    document.body.classList.remove("linux", "mac");
    document.body.classList.toggle("side-nav", sideOn && !onPhone);
    document.body.classList.toggle("phone-web", onPhone);
    if (electron) document.body.classList.remove("web");
    else document.body.classList.add("web");
    // Phone Magpie web has no OS caption; desktop preview simulates Win.
    if (onPhone) delete document.body.dataset.simPlatform;
    else document.body.dataset.simPlatform = "win";
    // Theme: Magpie applyPrefs — applyDocumentTheme (separate effect; sync theming)
  }, [sideOn]);

  useEffect(() => {
    applyChrome();
  }, [applyChrome]);

  // Magpie applyPrefs theme: html.theming .35s / clear 450ms (app.js ~20581–20590)
  useEffect(() => {
    applyDocumentTheme(theme);
  }, [theme]);

  // NOTES 178–183: colorblind chart palette survives leaving Settings
  // NOTES responsive: textSize 110% is Magpie default — apply before Settings mounts
  useEffect(() => {
    try {
      const raw = localStorage.getItem("magpie.demoPrefs");
      const p = raw ? (JSON.parse(raw) as { colorblind?: boolean; textSize?: number }) : {};
      applyColorblind(!!p.colorblind);
      const n = typeof p.textSize === "number" ? p.textSize : 110;
      document.documentElement.style.setProperty("--zoom", String(n / 100));
      document.documentElement.style.zoom = String(n / 100);
    } catch {
      applyColorblind(false);
      document.documentElement.style.setProperty("--zoom", "1.1");
      document.documentElement.style.zoom = "1.1";
    }
  }, []);

  useEffect(() => {
    const sync = () => setLibFeat(libraryOn());
    window.addEventListener("storage", sync);
    window.addEventListener("magpie-feature", sync);
    const id = window.setInterval(sync, 1500);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("magpie-feature", sync);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (view === "library" && !libFeat) {
      location.hash = "#/agents";
    }
  }, [view, libFeat]);

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const sideMq = window.matchMedia(`(min-width: ${SIDE_AT}px)`);
    const phoneMq = window.matchMedia(PHONE_WEB_MQ);
    const sync = () => {
      const onPhone = phoneWeb();
      setPhone(onPhone);
      if (onPhone) {
        setSideOn(false);
        return;
      }
      setSideOn(wantSide(readNavPick()));
    };
    sync();
    sideMq.addEventListener("change", sync);
    phoneMq.addEventListener("change", sync);
    return () => {
      sideMq.removeEventListener("change", sync);
      phoneMq.removeEventListener("change", sync);
    };
  }, []);

  // Magpie fitTop — progressive header compression for desktop chrome (not phoneWeb / side-nav)
  useEffect(() => {
    if (sideOn || phone) {
      setTopFit("");
      return;
    }
    const top = topRef.current || document.querySelector<HTMLElement>("header.top");
    const nav = document.getElementById("nav");
    const brand = document.querySelector<HTMLElement>(".brand");
    const actions = document.querySelector<HTMLElement>(".actions");
    if (!top || !actions) return;

    const fits = () => {
      const a = actions.getBoundingClientRect();
      const padR = parseFloat(getComputedStyle(top).paddingRight) || 0;
      if (a.right > top.getBoundingClientRect().right - padR + 0.5) return false;
      const toggle = document.getElementById("sideToggle");
      const lead =
        toggle && toggle.offsetParent ? toggle : brand;
      const left = lead?.offsetParent
        ? lead.getBoundingClientRect().right
        : top.getBoundingClientRect().left + (parseFloat(getComputedStyle(top).paddingLeft) || 0);
      if (!nav?.offsetParent) return left + 8 <= a.left;
      const n = nav.getBoundingClientRect();
      return left + 8 <= n.left && n.right + 8 <= a.left;
    };

    const run = () => {
      const steps = ["", "tight", "tight cramped", "tight cramped inrow", "tight cramped inrow crowded", "tight cramped inrow crowded packed"];
      let chosen = steps[steps.length - 1];
      for (const cls of steps) {
        top.className = `top${cls ? ` ${cls}` : ""}`;
        if (fits()) {
          chosen = cls;
          break;
        }
      }
      setTopFit(chosen);
      // Magpie navInSight: keep active tab visible when packed / scrollable
      const on = nav?.querySelector<HTMLElement>("button.on");
      if (nav && on && nav.scrollWidth > nav.clientWidth + 1) {
        const l = on.offsetLeft - 16;
        const r = on.offsetLeft + on.offsetWidth + 16 - nav.clientWidth;
        if (nav.scrollLeft > l) nav.scrollLeft = l;
        else if (nav.scrollLeft < r) nav.scrollLeft = r;
      }
    };

    run();
    const ro = new ResizeObserver(() => run());
    ro.observe(top);
    if (brand) ro.observe(brand);
    ro.observe(actions);
    if (nav) ro.observe(nav);
    document.fonts?.ready.then(run);
    window.addEventListener("resize", run);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", run);
    };
  }, [sideOn, phone, view, libFeat]);

  const toggleSideNav = useCallback(() => {
    if (phoneWeb()) return;
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

  // Magpie sideDrag (#sideEdge): persist magpie.sideWidth; fold past SIDE_MIN-64
  useEffect(() => {
    if (!sideOn) {
      document.body.style.removeProperty("--side-w");
      return;
    }
    const w = readSideW();
    if (w) document.body.style.setProperty("--side-w", sideFit(w) + "px");
    else document.body.style.removeProperty("--side-w");
  }, [sideOn]);

  useEffect(() => {
    const edge = sideEdgeRef.current;
    if (!edge || !sideOn) return;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      edge.setPointerCapture(e.pointerId);
      const side = document.getElementById("side");
      if (!side) return;
      const from = side.getBoundingClientRect().width - e.clientX;
      document.body.classList.add("side-drag");
      let w = 0;
      const move = (m: PointerEvent) => {
        const want = from + m.clientX;
        if (want < SIDE_MIN - 64) {
          w = 0;
          end();
          document.body.style.removeProperty("--side-w");
          toggleSideNav();
          return;
        }
        w = sideFit(want);
        document.body.style.setProperty("--side-w", w + "px");
      };
      const end = () => {
        edge.removeEventListener("pointermove", move);
        edge.removeEventListener("pointerup", end);
        edge.removeEventListener("pointercancel", end);
        if (edge.hasPointerCapture(e.pointerId)) edge.releasePointerCapture(e.pointerId);
        document.body.classList.remove("side-drag");
        if (w) {
          try {
            localStorage.setItem(SIDE_W_LS, String(w));
          } catch {
            /* */
          }
        }
      };
      edge.addEventListener("pointermove", move);
      edge.addEventListener("pointerup", end);
      edge.addEventListener("pointercancel", end);
    };
    const onKey = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 32 : 8;
      const d = ({ ArrowLeft: -step, ArrowRight: step } as Record<string, number>)[e.key];
      if (!d) return;
      e.preventDefault();
      const side = document.getElementById("side");
      if (!side) return;
      const next = sideFit(side.getBoundingClientRect().width + d);
      document.body.style.setProperty("--side-w", next + "px");
      try {
        localStorage.setItem(SIDE_W_LS, String(next));
      } catch {
        /* */
      }
      edge.setAttribute("aria-valuenow", String(next));
    };
    const syncAria = () => {
      const side = document.getElementById("side");
      if (!side) return;
      const w = Math.round(side.getBoundingClientRect().width);
      edge.setAttribute("aria-valuenow", String(w));
      edge.setAttribute("aria-valuemin", String(SIDE_MIN));
      edge.setAttribute("aria-valuemax", String(sideFit(SIDE_MAX)));
      edge.setAttribute("aria-label", t("Sidebar width"));
    };
    syncAria();
    edge.addEventListener("pointerdown", onDown);
    edge.addEventListener("keydown", onKey);
    window.addEventListener("resize", syncAria);
    return () => {
      edge.removeEventListener("pointerdown", onDown);
      edge.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", syncAria);
    };
  }, [sideOn, toggleSideNav]);

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
      const group =
        view === "library"
          ? NAV.find((g) => g.groupEn === "Work")
          : NAV.find((g) => g.items.some((i) => i.id === view));
      if (group) crumbParts.push(lang === "en" ? group.groupEn : group.group);
      crumbParts.push(t(VIEW_EN[view]));
    }
  }

  const brand = (
    <div className="brand" ref={brandRef}>
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

  const sideNavItems = NAV.flatMap((g) => {
    const items = [...g.items];
    if (g.groupEn === "Work" && libFeat) {
      items.push({ id: "library" as ViewId, label: "Library", icon: "library" });
    }
    return [
      <span key={`gl-${g.groupEn}`} className="nav-gl">
        {lang === "en" ? g.groupEn : g.group}
      </span>,
      ...items.map((item) => (
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
    ];
  });

  const sideNav = (
    <nav className="seg" id="nav" aria-label={t("Agents")}>
      {sideNavItems}
    </nav>
  );

  const [panelMode, setPanelMode] = useState(wantPanelMode);

  useEffect(() => {
    const sync = () => setPanelMode(wantPanelMode());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const [panelUnmapped, setPanelUnmapped] = useState(false);

  if (panelUnmapped) {
    /* tray/21 Escape: panel window unmapped — desktop only */
    return <div className="panel-unmapped" aria-hidden="true" />;
  }

  if (panelMode) {
    const leavePanel = (dest?: string) => {
      try {
        localStorage.removeItem("magpie.demoPanel");
      } catch {
        /* */
      }
      const u = new URL(location.href);
      u.searchParams.delete("panel");
      const id = dest && VIEWS.has(dest) ? dest : "agents";
      u.hash = `#/${id}`;
      history.replaceState(null, "", u.pathname + u.search + u.hash);
      setPanelMode(false);
      setPanelUnmapped(false);
      document.body.classList.remove("panel", "linux");
      delete document.body.dataset.ptab;
      setView(id as ViewId);
      applyChrome();
    };
    return (
      <TrayPanel
        onOpenMain={(dest) => leavePanel(dest)}
        onHide={() => {
          try {
            localStorage.removeItem("magpie.demoPanel");
          } catch {
            /* */
          }
          const u = new URL(location.href);
          u.searchParams.delete("panel");
          if (u.hash === "#panel" || u.hash === "#/panel") u.hash = "";
          history.replaceState(null, "", u.pathname + u.search + (u.hash || ""));
          document.body.classList.remove("panel", "linux", "window");
          delete document.body.dataset.ptab;
          setPanelMode(false);
          setPanelUnmapped(true);
        }}
        onQuit={() => {
          showStatus(t("Quit is demo-only"), "ok");
        }}
        onPrefs={() => {
          leavePanel("settings");
        }}
        onStatus={showStatus}
      />
    );
  }

  return (
    <>
      {!phone ? <WinCaption /> : null}
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
          ref={sideEdgeRef}
          role="separator"
          aria-orientation="vertical"
          aria-valuemin={SIDE_MIN}
          aria-valuemax={SIDE_MAX}
          tabIndex={0}
        />
      </aside>

      <header
        ref={(el) => {
          topRef.current = el;
        }}
        className={`top${sideOn || phone ? "" : topFit ? ` ${topFit}` : ""}`}
      >
        {!sideOn ? brand : null}
        <h1 className="sr-only" id="pageTitle">
          {t(VIEW_EN[view])}
        </h1>
        <button
          type="button"
          className="icon side-toggle"
          id="sideToggle"
          hidden={phone}
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
            {topIds().map((id) => (
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
          {headerUpdateOn ? (
            <div className="update-wrap">
              <button
                type="button"
                className="update"
                id="headerUpdate"
                title={t("Restart to update")}
                aria-label={t("Restart to update")}
                onClick={() => showStatus(demoCopy("演示：重启以更新（未接线）", "Demo: Restart to update (not wired)"), "ok")}
              >
                <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden>
                  <path
                    d="M8 12V4M5 7l3-3 3 3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{t("Update")}</span>
              </button>
            </div>
          ) : null}
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

      {view === "library" && libFeat && <LibraryView onStatus={showStatus} />}
      {view === "agents" && (
        <AgentsView
          onAddProvider={() => {
            try { sessionStorage.setItem("magpie-demo-providerAdded", "1"); } catch { /* */ }
            go("providers");
          }}
          onGoRouting={() => go("routing")}
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
      {view === "routing" && <RoutingView onStatus={showStatus} />}
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
      {view === "plugins" && <PluginsView onStatus={showStatus} />}
      {view === "settings" && (
        <SettingsView
          theme={theme}
          setTheme={setTheme}
          lang={lang}
          setLang={(v: Lang) => setLang(v)}
          onStatus={showStatus}
          onHeaderUpdate={setHeaderUpdateOn}
        />
      )}

      <footer className="foot">
        <StatusToast
          msg={status?.msg}
          kind={status?.kind}
          lift={
            !!status &&
            typeof document !== "undefined" &&
            !!document.querySelector(".modal:not(.out)")
          }
        />
        <span className="grow" />
        <span className="sr-only">{GATEWAY_ADDR}</span>
      </footer>
    </>
  );
}
