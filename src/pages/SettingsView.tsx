import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Segs } from "../components/Segs";
import { useSegThumb } from "../components/SegThumb";
import { GATEWAY_ADDR } from "../data/mock";
import { demoCopy, t, type Lang } from "../i18n";

const SET_TABS = [
  { id: "general", en: "General" },
  { id: "usage", en: "Allowances" },
  { id: "network", en: "Network and sharing" },
  { id: "models", en: "Models" },
  { id: "privacy", en: "Privacy" },
  { id: "otel", en: "Observability" },
  { id: "sync", en: "Sync and backup" },
  { id: "about", en: "About" },
] as const;

type SetTabId = (typeof SET_TABS)[number]["id"];

const LOCALES = [
  { id: "system", nameKey: "System", literal: false },
  { id: "en", nameKey: "English", literal: true },
  { id: "zh", nameKey: "简体中文", literal: true },
  { id: "zh-TW", nameKey: "繁體中文", literal: true },
  { id: "ja", nameKey: "日本語", literal: true },
  { id: "de", nameKey: "Deutsch", literal: true },
] as const;

const TEXT_SIZES = [100, 110, 125, 150] as const;
const PREFS_LS = "magpie.demoPrefs";
const COPY_FLASH_MS = 1200;

type Theme = "system" | "light" | "dark";

type DemoPrefs = {
  colorblind: boolean;
  textSize: number;
  tray: "panel" | "window";
  plainNames: "show" | "hide";
  codexAgentsV1: boolean;
  fullContext: boolean;
  compactAt: string;
  login: boolean;
  keepAwake: "off" | "on" | "display";
  lightweight: boolean;
  quotaLeft: boolean;
  quotaReads: "" | "asked";
  currency: "usd" | "cny";
  chineseUnits: boolean;
  usageAlert: "off" | "80" | "90" | "100";
  balanceAlert: "off" | "on";
  resetReminder: "off" | "1h" | "6h" | "1d";
  turnDone: "off" | "on";
  codexWarmup: "off" | "week" | "all";
  claudeWarmup: "off" | "week" | "all";
  proxy: "auto" | "off" | "custom";
  proxyUrl: string;
  bareModelIDs: boolean;
  lan: boolean;
  port: string;
  corsOrigins: string[];
  corsDraft: string;
  githubToken: string;
  redactKeys: boolean;
  redactBodies: boolean;
  discovery: "ask" | "allow" | "deny";
  otel: boolean;
  otelEndpoint: string;
  noUpdatePill: boolean;
  noAutoUpdate: boolean;
  updateEvery: number;
  autoRestart: boolean;
  syncOpen: "" | "dav" | "export" | "import";
  syncOn: boolean;
  syncAuto: number;
  trayUsage: boolean;
  trayEvery: "1" | "3" | "5" | "15";
  trayLogos: boolean;
  trayBird: boolean;
  trayPace: boolean;
  vision: "auto" | "off";
  imageGen: "auto" | "off";
  webSearch: "auto" | "off";
  replies: "auto" | "off";
  codexTitles: "auto" | "off" | "model";
  codexDescriptions: "auto" | "off";
  codexPredictions: "auto" | "off";
  codexAutoReview: "auto" | "off";
  allowIPs: string[];
  allowDraft: string;
};

const DEFAULTS: DemoPrefs = {
  colorblind: false,
  textSize: 110,
  tray: "panel",
  plainNames: "show",
  codexAgentsV1: false,
  fullContext: false,
  compactAt: "272k",
  login: false,
  keepAwake: "off",
  lightweight: false,
  quotaLeft: false,
  quotaReads: "",
  currency: "usd",
  chineseUnits: true,
  usageAlert: "off",
  balanceAlert: "off",
  resetReminder: "off",
  turnDone: "off",
  codexWarmup: "off",
  claudeWarmup: "off",
  proxy: "auto",
  proxyUrl: "",
  bareModelIDs: false,
  lan: false,
  port: "3425",
  corsOrigins: [],
  corsDraft: "",
  githubToken: "",
  redactKeys: true,
  redactBodies: false,
  discovery: "ask",
  otel: false,
  otelEndpoint: "",
  noUpdatePill: false,
  noAutoUpdate: false,
  updateEvery: 360,
  autoRestart: false,
  syncOpen: "",
  syncOn: false,
  syncAuto: 3,
  trayUsage: false,
  trayEvery: "3",
  trayLogos: true,
  trayBird: true,
  trayPace: false,
  vision: "auto",
  imageGen: "auto",
  webSearch: "auto",
  replies: "auto",
  codexTitles: "auto",
  codexDescriptions: "auto",
  codexPredictions: "auto",
  codexAutoReview: "auto",
  allowIPs: [],
  allowDraft: "",
};

function loadPrefs(): DemoPrefs {
  try {
    const raw = localStorage.getItem(PREFS_LS);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function savePrefs(p: DemoPrefs) {
  try {
    localStorage.setItem(PREFS_LS, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

function applyTextSize(n: number) {
  document.documentElement.style.setProperty("--zoom", String(n / 100));
  document.documentElement.style.zoom = String(n / 100);
}

function PrefRow({
  name,
  sub,
  children,
  id,
  hidden,
  className,
  valClassName,
}: {
  name: string;
  sub?: ReactNode;
  children?: ReactNode;
  id?: string;
  hidden?: boolean;
  className?: string;
  valClassName?: string;
}) {
  if (hidden) return null;
  return (
    <div className={`row pref${className ? ` ${className}` : ""}`} id={id}>
      <div className="who">
        <div className="name">{name}</div>
        {sub ? <div className="sub">{sub}</div> : null}
      </div>
      {children != null ? (
        <div className={`val${valClassName ? ` ${valClassName}` : ""}`}>{children}</div>
      ) : null}
    </div>
  );
}

function Label({ en }: { en: string }) {
  return (
    <div className="row-head">
      <span className="label">{t(en)}</span>
    </div>
  );
}

function CopyBtn({ text, what, onStatus }: { text: string; what: string; onStatus?: (m: string, k?: string) => void }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <button
      type="button"
      className={`copy${done ? " done" : ""}`}
      title={t("Copy")}
      aria-label={`${t("Copy")} ${what}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setDone(true);
        onStatus?.(t("{what} copied", { what }), "ok");
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setDone(false), COPY_FLASH_MS);
      }}
    >
      {done ? (
        <svg viewBox="0 0 16 16" width={13} height={13}>
          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" width={13} height={13}>
          <rect x="5.5" y="5.5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3.5 10.5V3.5h7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

const CHEV = (
  <svg viewBox="0 0 16 16" width={11} height={11} aria-hidden>
    <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type SettingsProps = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  onStatus?: (msg: string, kind?: string, ms?: number) => void;
};

export function SettingsView({ theme, setTheme, lang, setLang, onStatus }: SettingsProps) {
  const [tab, setTab] = useState<SetTabId>(() => {
    try {
      const v = sessionStorage.getItem("magpie.setTab") || "";
      sessionStorage.removeItem("magpie.setTab");
      if (SET_TABS.some((x) => x.id === v)) return v as SetTabId;
    } catch { /* ignore */ }
    return "general";
  });
  const [q, setQ] = useState("");
  const [prefs, setPrefsState] = useState<DemoPrefs>(() => loadPrefs());
  const [langOpen, setLangOpen] = useState(false);
  const [localePick, setLocalePick] = useState<string>(() => (lang === "zh" ? "zh" : lang === "en" ? "en" : "system"));
  const [warmTab, setWarmTab] = useState<"codex" | "claude">("codex");
  const setTabsBox = useSegThumb(tab);
  const warmBox = useSegThumb(warmTab);
  const langBtn = useRef<HTMLButtonElement>(null);
  const searching = q.trim().length > 0;

  const setPrefs = useCallback(
    (patch: Partial<DemoPrefs>, toast?: string) => {
      setPrefsState((prev) => {
        const next = { ...prev, ...patch };
        savePrefs(next);
        return next;
      });
      if (toast) onStatus?.(toast, "ok", 1500);
      else onStatus?.(t("Saved"), "ok", 1500);
    },
    [onStatus],
  );

  useEffect(() => {
    applyTextSize(prefs.textSize);
  }, [prefs.textSize]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!langBtn.current?.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const localeLabel = (id: string) => {
    const row = LOCALES.find((x) => x.id === id);
    if (!row) return id;
    return row.literal ? row.nameKey : t(row.nameKey);
  };

  const pickLocale = (id: string) => {
    setLocalePick(id);
    setLangOpen(false);
    if (id === "zh" || id === "en") setLang(id);
    else if (id === "system") {
      const sys = navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
      setLang(sys);
    } else {
      onStatus?.(demoCopy(`演示：${localeLabel(id)} 界面尚未接线`, `Demo: ${localeLabel(id)} UI not wired`), "warn", 2500);
    }
  };

  const matchQ = (en: string, ...extra: string[]) => {
    if (!searching) return true;
    const needle = q.trim().toLowerCase();
    const hay = [en, t(en), ...extra].join(" ").toLowerCase();
    return hay.includes(needle);
  };

  const pageHidden = (id: SetTabId, hasVisible: boolean) => {
    if (searching) return !hasVisible;
    return tab !== id;
  };

  // --- General rows visibility under search ---
  const gRows = {
    appearance: matchQ("Appearance"),
    colorblind: matchQ("Colorblind mode"),
    language: matchQ("Language"),
    textSize: matchQ("Text size"),
    tray: matchQ("Click the tray icon to"),
    plainNames: matchQ("Provider in model names"),
    codexAgents: matchQ("Codex subagents on any model"),
    longConv: matchQ("Long conversations"),
    login: matchQ("Open at login"),
    lightweight: matchQ("Lightweight mode"),
    keepAwake: matchQ("Prevent sleep"),
    codexTitles: matchQ("Codex thread titles"),
    codexDesc: matchQ("Codex thread descriptions"),
    codexPred: matchQ("Codex composer predictions"),
    codexReview: matchQ("Codex auto-review model"),
  };
  const gAny = Object.values(gRows).some(Boolean);

  const uRows = {
    trayUsage: matchQ("Allowances in the menu bar"),
    trayEvery: matchQ("Menu bar refresh"),
    trayLogos: matchQ("Menu bar logos"),
    trayBird: matchQ("Menu bar magpie icon"),
    trayPace: matchQ("Menu bar pace"),
    display: matchQ("Allowance display"),
    reads: matchQ("Allowance reads"),
    currency: matchQ("Currency"),
    units: matchQ("Number units"),
    alert: matchQ("Allowance alert"),
    bal: matchQ("Low balance alert"),
    reset: matchQ("Reset reminder"),
    turn: matchQ("Task done alert"),
    warm: matchQ("Warm up on reset") || matchQ("Daily warm-up"),
  };
  const uAny = Object.values(uRows).some(Boolean);

  const nRows = {
    proxy: matchQ("Proxy"),
    github: matchQ("GitHub") || matchQ("Token"),
    port: matchQ("Gateway port") || matchQ("Gateway"),
    bare: matchQ("Model ids without the provider"),
    lan: matchQ("Share on local network") || matchQ("Local network"),
    cors: matchQ("Web pages") || matchQ("Web pages that may call magpie"),
    allow: matchQ("Allowed addresses") || matchQ("Local network"),
  };
  const nAny = Object.values(nRows).some(Boolean);

  const mAny =
    matchQ("Images") ||
    matchQ("Image recognition") ||
    matchQ("Web search") ||
    matchQ("Replies") ||
    matchQ("Disabled models");
  const pAny = matchQ("Privacy") || matchQ("Agents' sign-ins") || matchQ("Redact");
  const oAny = matchQ("Observability") || matchQ("OpenTelemetry");
  const sAny = matchQ("Sync and backup") || matchQ("Export") || matchQ("Import") || matchQ("WebDAV");
  const aAny =
    matchQ("About") ||
    matchQ("Version") ||
    matchQ("What's new") ||
    matchQ("Automatic updates") ||
    matchQ("Config folder") ||
    matchQ("Community") ||
    matchQ("Gateway URL");

  return (
    <main className={`view${searching ? " set-searching" : ""}`} id="view-settings">
      <div className="row-head set-head">
        <div
          className="warm-tabs set-tabs"
          id="setTabs"
          role="tablist"
          aria-label={t("Settings")}
          ref={setTabsBox}
          hidden={searching}
        >
          {SET_TABS.map((x) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              id={`setTab-${x.id}`}
              data-set={x.id}
              className={tab === x.id ? "on" : ""}
              aria-selected={tab === x.id}
              onClick={() => setTab(x.id)}
            >
              {t(x.en)}
            </button>
          ))}
        </div>
        <input
          className="sess-filter set-q"
          id="setQ"
          type="search"
          spellCheck={false}
          autoComplete="off"
          placeholder={t("Find a setting")}
          aria-label={t("Find a setting")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {searching && !gAny && !uAny && !nAny && !mAny && !pAny && !oAny && !sAny && !aAny ? (
        <p className="set-none" id="setNone" role="status">
          {t("No settings match")}
        </p>
      ) : null}

      {/* GENERAL */}
      <section
        className="set-page"
        id="setPage-general"
        role="tabpanel"
        aria-labelledby="setTab-general"
        data-part={t("General")}
        hidden={pageHidden("general", gAny)}
      >
        <div className="list prefs">
          {gRows.appearance && (
            <PrefRow name={t("Appearance")}>
              <Segs
                value={theme}
                onChange={(v) => {
                  setTheme(v);
                  onStatus?.(t("Saved"), "ok", 1500);
                }}
                items={[
                  { id: "system" as Theme, label: t("System") },
                  { id: "light" as Theme, label: t("Light") },
                  { id: "dark" as Theme, label: t("Dark") },
                ]}
              />
            </PrefRow>
          )}
          {gRows.colorblind && (
            <PrefRow name={t("Colorblind mode")} id="colorblindRow">
              <Segs
                value={prefs.colorblind ? "on" : "off"}
                onChange={(v) => setPrefs({ colorblind: v === "on" })}
                items={[
                  { id: "off", label: t("Off") },
                  { id: "on", label: t("On") },
                ]}
                title={t("Colorblind-safe chart colors, and each allowance window's line in a dash of its own")}
              />
            </PrefRow>
          )}
          {gRows.language && (
            <PrefRow name={t("Language")}>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  id="langPick"
                  className={`sess-pick pref-pick${langOpen ? " open" : ""}`}
                  aria-label={t("Language")}
                  aria-haspopup="menu"
                  aria-expanded={langOpen}
                  ref={langBtn}
                  onClick={() => setLangOpen((o) => !o)}
                >
                  <span>{localeLabel(localePick)}</span>
                  {CHEV}
                </button>
                {langOpen ? (
                  <ul className="sess-menu" role="menu" style={{ position: "absolute", right: 0, top: "100%", zIndex: 20, marginTop: 4 }}>
                    {LOCALES.map((x) => (
                      <li key={x.id} role="none">
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={localePick === x.id}
                          className={localePick === x.id ? "on" : ""}
                          onClick={() => pickLocale(x.id)}
                        >
                          {localeLabel(x.id)}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </PrefRow>
          )}
          {gRows.textSize && (
            <PrefRow name={t("Text size")} id="textSizeRow" sub={demoCopy("演示壳内缩放", "Demo in-shell zoom")}>
              <Segs
                value={prefs.textSize}
                onChange={(n) => setPrefs({ textSize: Number(n) })}
                items={TEXT_SIZES.map((n) => ({ id: n, label: `${n}%` }))}
              />
            </PrefRow>
          )}
          {gRows.tray && (
            <PrefRow name={t("Click the tray icon to")}>
              <Segs
                value={prefs.tray}
                onChange={(v) => setPrefs({ tray: v as DemoPrefs["tray"] })}
                items={[
                  { id: "panel", label: t("Open the quick panel") },
                  { id: "window", label: t("Open the main window") },
                ]}
              />
            </PrefRow>
          )}
          {gRows.plainNames && (
            <PrefRow name={t("Provider in model names")}>
              <Segs
                value={prefs.plainNames}
                onChange={(v) => setPrefs({ plainNames: v as DemoPrefs["plainNames"] })}
                items={[
                  { id: "show", label: t("Show") },
                  { id: "hide", label: t("Hide") },
                ]}
              />
            </PrefRow>
          )}
          {gRows.codexAgents && (
            <PrefRow
              name={t("Codex subagents on any model")}
              sub={t("A GPT lead spawns subagents on magpie’s other models. New threads only; Codex’s own multi_agent_v2 still wins")}
            >
              <Segs
                value={prefs.codexAgentsV1 ? "on" : "off"}
                onChange={(v) => setPrefs({ codexAgentsV1: v === "on" })}
                items={[
                  { id: "off", label: t("Off") },
                  { id: "on", label: t("On") },
                ]}
              />
            </PrefRow>
          )}
          {gRows.longConv && (
            <PrefRow
              name={t("Long conversations")}
              sub={t("Codex and Claude Code compact at 272K or the size typed; a full window makes turns slower and costlier")}
            >
              <div className="compact-at" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Segs
                  value={prefs.fullContext ? "on" : "off"}
                  onChange={(v) => setPrefs({ fullContext: v === "on" })}
                  items={[
                    { id: "off", label: t("Compact at {n}", { n: prefs.compactAt.toUpperCase() }) },
                    { id: "on", label: t("Full window") },
                  ]}
                />
                {!prefs.fullContext ? (
                  <input
                    className="words compact-num"
                    value={prefs.compactAt}
                    aria-label={t("Compact at")}
                    title={t("Compact at")}
                    onChange={(e) => setPrefsState((p) => ({ ...p, compactAt: e.target.value }))}
                    onBlur={() => setPrefs({ compactAt: prefs.compactAt })}
                  />
                ) : null}
              </div>
            </PrefRow>
          )}
          {gRows.codexTitles && (
            <PrefRow name={t("Codex thread titles")} id="codexTitlesRow">
              <Segs
                value={prefs.codexTitles}
                onChange={(v) => setPrefs({ codexTitles: v as DemoPrefs["codexTitles"] })}
                items={[
                  { id: "auto", label: t("Automatic") },
                  { id: "off", label: t("Off") },
                  { id: "model", label: demoCopy("选模型…", "Pick model…") },
                ]}
              />
            </PrefRow>
          )}
          {gRows.codexDesc && (
            <PrefRow name={t("Codex thread descriptions")} id="codexDescriptionsRow">
              <Segs
                value={prefs.codexDescriptions}
                onChange={(v) => setPrefs({ codexDescriptions: v as DemoPrefs["codexDescriptions"] })}
                items={[
                  { id: "auto", label: t("Automatic") },
                  { id: "off", label: t("Off") },
                ]}
              />
            </PrefRow>
          )}
          {gRows.codexPred && (
            <PrefRow name={t("Codex composer predictions")} id="codexPredictionsRow">
              <Segs
                value={prefs.codexPredictions}
                onChange={(v) => setPrefs({ codexPredictions: v as DemoPrefs["codexPredictions"] })}
                items={[
                  { id: "auto", label: t("Automatic") },
                  { id: "off", label: t("Off") },
                ]}
              />
            </PrefRow>
          )}
          {gRows.codexReview && (
            <PrefRow name={t("Codex auto-review model")} id="codexAutoReviewRow">
              <Segs
                value={prefs.codexAutoReview}
                onChange={(v) => setPrefs({ codexAutoReview: v as DemoPrefs["codexAutoReview"] })}
                items={[
                  { id: "auto", label: t("Automatic") },
                  { id: "off", label: t("Off") },
                ]}
              />
            </PrefRow>
          )}
          {gRows.login && (
            <PrefRow name={t("Open at login")}>
              <Segs
                value={prefs.login ? "on" : "off"}
                onChange={(v) => setPrefs({ login: v === "on" })}
                items={[
                  { id: "off", label: t("Off") },
                  { id: "on", label: t("On") },
                ]}
              />
            </PrefRow>
          )}
          {gRows.lightweight && (
            <PrefRow
              name={t("Lightweight mode")}
              sub={t("A closed panel or window frees about 100 MB after a minute; opening it loads it again")}
              id="lightweightRow"
            >
              <Segs
                value={prefs.lightweight ? "on" : "off"}
                onChange={(v) => setPrefs({ lightweight: v === "on" })}
                items={[
                  { id: "off", label: t("Off") },
                  { id: "on", label: t("On") },
                ]}
              />
            </PrefRow>
          )}
          {gRows.keepAwake && (
            <PrefRow
              name={t("Prevent sleep")}
              sub={
                prefs.keepAwake === "display"
                  ? t("Keeps this computer and its screen awake while magpie runs tasks")
                  : t("Keeps this computer awake while magpie runs tasks")
              }
              id="keepAwakeRow"
            >
              <Segs
                value={prefs.keepAwake}
                onChange={(v) => setPrefs({ keepAwake: v as DemoPrefs["keepAwake"] })}
                items={[
                  { id: "off", label: t("Off") },
                  { id: "on", label: t("On") },
                  { id: "display", label: t("Screen on too") },
                ]}
              />
            </PrefRow>
          )}
        </div>
      </section>

      {/* ALLOWANCES */}
      <section
        className="set-page"
        id="setPage-usage"
        role="tabpanel"
        aria-labelledby="setTab-usage"
        data-part={t("Allowances")}
        hidden={pageHidden("usage", uAny)}
      >
        <div className="list prefs">
          {uRows.trayUsage && (
            <PrefRow
              name={t("Allowances in the menu bar")}
              sub={t("Show your subscriptions' allowances, or the tokens and cost of today or the last 7 days, when pointing at magpie's tray icon, refreshed every few minutes")}
              id="trayUsageRow"
            >
              <Segs
                value={prefs.trayUsage ? "on" : "off"}
                onChange={(v) => setPrefs({ trayUsage: v === "on" })}
                items={[
                  { id: "off", label: t("Off") },
                  { id: "on", label: t("On") },
                ]}
              />
            </PrefRow>
          )}
          {uRows.trayEvery && prefs.trayUsage && (
            <PrefRow name={t("Menu bar refresh")} sub={t("How often the allowances beside the icon are asked for again")} id="trayEveryRow">
              <Segs
                value={prefs.trayEvery}
                onChange={(v) => setPrefs({ trayEvery: v as DemoPrefs["trayEvery"] })}
                items={[
                  { id: "1", label: t("{n} min", { n: 1 }) },
                  { id: "3", label: t("{n} min", { n: 3 }) },
                  { id: "5", label: t("{n} min", { n: 5 }) },
                  { id: "15", label: t("{n} min", { n: 15 }) },
                ]}
              />
            </PrefRow>
          )}
          {uRows.trayLogos && prefs.trayUsage && (
            <PrefRow
              name={t("Menu bar logos")}
              sub={t("Each subscription's logo before its numbers; off, the numbers alone with a thin line between subscriptions")}
              id="trayLogosRow"
            >
              <Segs
                value={prefs.trayLogos ? "on" : "off"}
                onChange={(v) => setPrefs({ trayLogos: v === "on" })}
                items={[
                  { id: "off", label: t("Off") },
                  { id: "on", label: t("On") },
                ]}
              />
            </PrefRow>
          )}
          {uRows.trayBird && prefs.trayUsage && (
            <PrefRow
              name={t("Menu bar magpie icon")}
              sub={t("magpie's icon before the allowances; off, the allowances alone, and a click on one still opens the panel")}
              id="trayBirdRow"
            >
              <Segs
                value={prefs.trayBird ? "on" : "off"}
                onChange={(v) => setPrefs({ trayBird: v === "on" })}
                items={[
                  { id: "off", label: t("Off") },
                  { id: "on", label: t("On") },
                ]}
              />
            </PrefRow>
          )}
          {uRows.trayPace && prefs.trayUsage && (
            <PrefRow
              name={t("Menu bar pace")}
              sub={t("Each window's Pace number beside its figure, as on the Usage page: +12% is 12% more of the window used than an even pace would have used by now, −8% that much less")}
              id="trayPaceRow"
            >
              <Segs
                value={prefs.trayPace ? "on" : "off"}
                onChange={(v) => setPrefs({ trayPace: v === "on" })}
                items={[
                  { id: "off", label: t("Off") },
                  { id: "on", label: t("On") },
                ]}
              />
            </PrefRow>
          )}
          {uRows.display && (
            <PrefRow
              name={t("Allowance display")}
              sub={t("How much of each window is used, or how much is left, on the Usage page, the panel and the menu bar")}
            >
              <Segs
                value={prefs.quotaLeft ? "left" : "used"}
                onChange={(v) => setPrefs({ quotaLeft: v === "left" })}
                items={[
                  { id: "used", label: t("Used") },
                  { id: "left", label: t("Left") },
                ]}
              />
            </PrefRow>
          )}
          {uRows.reads && (
            <PrefRow
              name={t("Allowance reads")}
              sub={t("When I ask: opening or refreshing the Usage page, a card's refresh, and magpie quota or accounts read them; routing, the menu bar and alerts go by the last reading till then. An account a vendor turns away for its quota is still read.")}
              id="quotaReadsRow"
            >
              <Segs
                value={prefs.quotaReads || "auto"}
                onChange={(v) => setPrefs({ quotaReads: v === "asked" ? "asked" : "" })}
                items={[
                  { id: "auto", label: t("Automatic") },
                  { id: "asked", label: t("When I ask") },
                ]}
              />
            </PrefRow>
          )}
          {uRows.currency && (
            <PrefRow
              name={t("Currency")}
              sub={t("What a cost — the Usage page's, the tray panel's, the TUI's and the CLI's — is shown as; a vendor's own balance, already in its own currency, is never converted")}
            >
              <Segs
                value={prefs.currency}
                onChange={(v) => setPrefs({ currency: v as DemoPrefs["currency"] })}
                items={[
                  { id: "usd", label: "USD" },
                  { id: "cny", label: "CNY" },
                ]}
              />
            </PrefRow>
          )}
          {uRows.units && lang === "zh" && (
            <PrefRow
              name={t("Number units")}
              sub={t("How a large count of tokens or requests is shortened on the Usage page and the panel")}
              id="unitsRow"
            >
              <Segs
                value={prefs.chineseUnits ? "zh" : "en"}
                onChange={(v) => setPrefs({ chineseUnits: v === "zh" })}
                items={[
                  { id: "en", label: t("K / M / B") },
                  { id: "zh", label: t("万 / 亿") },
                ]}
              />
            </PrefRow>
          )}
          {uRows.alert && (
            <PrefRow name={t("Allowance alert")} sub={t("Notify when an allowance window crosses a threshold")} id="usageAlertRow">
              <Segs
                className="warm-at"
                value={prefs.usageAlert}
                onChange={(v) => setPrefs({ usageAlert: v as DemoPrefs["usageAlert"] })}
                items={[
                  { id: "off", label: t("Off") },
                  { id: "80", label: "80%" },
                  { id: "90", label: "90%" },
                  { id: "100", label: "100%" },
                ]}
              />
            </PrefRow>
          )}
          {uRows.bal && (
            <PrefRow name={t("Low balance alert")} sub={t("Notify when a prepaid balance is low")} id="balanceAlertRow">
              <Segs
                className="warm-at"
                value={prefs.balanceAlert}
                onChange={(v) => setPrefs({ balanceAlert: v as DemoPrefs["balanceAlert"] })}
                items={[
                  { id: "off", label: t("Off") },
                  { id: "on", label: t("On") },
                ]}
              />
            </PrefRow>
          )}
          {uRows.reset && (
            <PrefRow name={t("Reset reminder")} sub={t("Remind before an allowance window resets")} id="resetReminderRow">
              <Segs
                value={prefs.resetReminder}
                onChange={(v) => setPrefs({ resetReminder: v as DemoPrefs["resetReminder"] })}
                items={[
                  { id: "off", label: t("Off") },
                  { id: "1h", label: t("{n} h", { n: 1 }) },
                  { id: "6h", label: t("{n} h", { n: 6 }) },
                  { id: "1d", label: t("{n} d", { n: 1 }) },
                ]}
              />
            </PrefRow>
          )}
          {uRows.turn && (
            <PrefRow name={t("Task done alert")} sub={t("Notify when an agent finishes a long-running turn")} id="turnDoneRow">
              <Segs
                value={prefs.turnDone}
                onChange={(v) => setPrefs({ turnDone: v as DemoPrefs["turnDone"] })}
                items={[
                  { id: "off", label: t("Off") },
                  { id: "on", label: t("On") },
                ]}
              />
            </PrefRow>
          )}
        </div>

        {uRows.warm && (
          <>
            <div className="row-head warm-head" data-feature="warmups">
              <div className="warm-tabs" id="warmTabs" role="tablist" aria-label={t("Warm-up and check-in")} ref={warmBox}>
                <button type="button" role="tab" id="warmTab-codex" data-warm="codex" className={warmTab === "codex" ? "on" : ""} aria-selected={warmTab === "codex"} onClick={() => setWarmTab("codex")}>
                  Codex
                </button>
                <button type="button" role="tab" id="warmTab-claude" data-warm="claude" className={warmTab === "claude" ? "on" : ""} aria-selected={warmTab === "claude"} onClick={() => setWarmTab("claude")}>
                  Claude Code
                </button>
              </div>
            </div>
            <div className="warm-panes" data-feature="warmups">
              {warmTab === "codex" && (
                <div className="list prefs" id="codexWarmList" role="tabpanel">
                  <PrefRow name={t("Warm up on reset")} sub={t("One tiny request starts the next window at once")}>
                    <Segs
                      value={prefs.codexWarmup}
                      onChange={(v) => setPrefs({ codexWarmup: v as DemoPrefs["codexWarmup"] })}
                      items={[
                        { id: "off", label: t("Off") },
                        { id: "week", label: t("Weekly") },
                        { id: "all", label: t("Weekly and 5-hour") },
                      ]}
                    />
                  </PrefRow>
                  <PrefRow name={t("Daily warm-up")} sub={t("At times of day so 5-hour windows line up")}>
                    <Segs
                      className="warm-at"
                      value={prefs.codexWarmup === "off" ? "off" : "on"}
                      onChange={(v) => {
                        if (v === "off") setPrefs({ codexWarmup: "off" });
                        else if (prefs.codexWarmup === "off") setPrefs({ codexWarmup: "week" });
                      }}
                      items={[
                        { id: "off", label: t("Off") },
                        { id: "on", label: t("On") },
                      ]}
                    />
                  </PrefRow>
                </div>
              )}
              {warmTab === "claude" && (
                <div className="list prefs" id="claudeWarmList" role="tabpanel">
                  <PrefRow name={t("Warm up on reset")} sub={t("One tiny request through Claude Code (Haiku) starts the next window at once")}>
                    <Segs
                      value={prefs.claudeWarmup}
                      onChange={(v) => setPrefs({ claudeWarmup: v as DemoPrefs["claudeWarmup"] })}
                      items={[
                        { id: "off", label: t("Off") },
                        { id: "week", label: t("Weekly") },
                        { id: "all", label: t("Weekly and 5-hour") },
                      ]}
                    />
                  </PrefRow>
                  <PrefRow name={t("Daily warm-up")} sub={t("Sent through Claude Code.")}>
                    <Segs
                      className="warm-at"
                      value={prefs.claudeWarmup === "off" ? "off" : "on"}
                      onChange={(v) => {
                        if (v === "off") setPrefs({ claudeWarmup: "off" });
                        else if (prefs.claudeWarmup === "off") setPrefs({ claudeWarmup: "week" });
                      }}
                      items={[
                        { id: "off", label: t("Off") },
                        { id: "on", label: t("On") },
                      ]}
                    />
                  </PrefRow>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* NETWORK */}
      <section
        className="set-page"
        id="setPage-network"
        role="tabpanel"
        aria-labelledby="setTab-network"
        data-part={t("Network and sharing")}
        hidden={pageHidden("network", nAny)}
      >
        <div className="list prefs">
          {nRows.proxy && (
            <PrefRow
              name={t("Proxy")}
              sub={
                prefs.proxy === "off"
                  ? t("Off: requests to vendors without a proxy of their own, and update checks, go direct")
                  : prefs.proxy === "custom" && prefs.proxyUrl
                    ? t("Requests to vendors without a proxy of their own, and update checks, go through {proxy}", { proxy: prefs.proxyUrl })
                    : t("No system proxy found; requests to vendors without a proxy of their own, and update checks, go direct")
              }
            >
              <div className="proxy-segs" id="proxySegs">
                <div className="proxy-controls" style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {prefs.proxy === "custom" ? (
                    <input
                      className="proxy"
                      value={prefs.proxyUrl}
                      placeholder="http://127.0.0.1:7890"
                      aria-label={t("Proxy address")}
                      onChange={(e) => setPrefsState((p) => ({ ...p, proxyUrl: e.target.value }))}
                      onBlur={() => setPrefs({ proxyUrl: prefs.proxyUrl })}
                    />
                  ) : null}
                  <Segs
                    value={prefs.proxy}
                    onChange={(v) => setPrefs({ proxy: v as DemoPrefs["proxy"] })}
                    items={[
                      { id: "auto", label: t("Auto") },
                      { id: "off", label: t("Off") },
                      { id: "custom", label: t("Custom") },
                    ]}
                  />
                </div>
              </div>
            </PrefRow>
          )}
        </div>
        {nRows.github && (
          <>
            <Label en="GitHub" />
            <div className="list prefs" id="githubList">
              <PrefRow name={t("Token")} sub={demoCopy("演示：未接线真 token", "Demo: token not wired")}>
                <input
                  className="words"
                  type="password"
                  value={prefs.githubToken}
                  placeholder="ghp_…"
                  aria-label={t("Token")}
                  onChange={(e) => setPrefsState((p) => ({ ...p, githubToken: e.target.value }))}
                  onBlur={() => setPrefs({ githubToken: prefs.githubToken })}
                  style={{ width: 160 }}
                />
              </PrefRow>
            </div>
          </>
        )}
        {(nRows.port || nRows.bare) && <Label en="Gateway" />}
        {nRows.port && (
          <div className="list prefs" id="portList">
            <PrefRow
              name={t("Gateway port")}
              sub={t("Agents magpie connected move with it. Now {url}", { url: `http://127.0.0.1:${prefs.port}` })}
              className="port-row"
            >
              <input
                className="words gateway-port"
                inputMode="numeric"
                value={prefs.port}
                aria-label={t("Gateway port")}
                onChange={(e) => setPrefsState((p) => ({ ...p, port: e.target.value }))}
              />
              <button
                type="button"
                className="text"
                onClick={() => {
                  const p = Number(prefs.port.trim());
                  if (!Number.isInteger(p) || p < 1024 || p > 65535) {
                    onStatus?.(t("A port is a number from 1024 to 65535"), "err");
                    return;
                  }
                  setPrefs({ port: String(p) }, t("Gateway on port {p}", { p }));
                }}
              >
                {t("Apply")}
              </button>
            </PrefRow>
          </div>
        )}
        {nRows.bare && (
          <div className="list prefs">
            <PrefRow
              name={t("Model ids without the provider")}
              sub={t("The gateway’s model list also names each model by its own id, as gpt-5.6-sol beside codex/gpt-5.6-sol, for apps moved from another proxy. One that several providers serve goes to them in the Providers order")}
              id="bareIdsRow"
            >
              <Segs
                value={prefs.bareModelIDs ? "on" : "off"}
                onChange={(v) => setPrefs({ bareModelIDs: v === "on" })}
                items={[
                  { id: "off", label: t("Off") },
                  { id: "on", label: t("On") },
                ]}
              />
            </PrefRow>
          </div>
        )}
        {nRows.lan && (
          <>
            <Label en="Local network" />
            <div className="list prefs" id="lanList">
              <PrefRow
                name={t("Share on local network")}
                sub={t("Agents on other computers on this network, or through a tunnel to this one such as Cloudflare Tunnel, can use magpie’s models with a gateway key from Gateway")}
              >
                <Segs
                  value={prefs.lan ? "on" : "off"}
                  onChange={(v) => setPrefs({ lan: v === "on" })}
                  items={[
                    { id: "off", label: t("Off") },
                    { id: "on", label: t("On") },
                  ]}
                />
              </PrefRow>
              {prefs.lan ? (
                <PrefRow name={t("Address")} sub={demoCopy("演示局域网地址", "Demo LAN address")}>
                  <code>{`http://192.168.1.10:${prefs.port}/v1`}</code>
                  <CopyBtn text={`http://192.168.1.10:${prefs.port}/v1`} what={t("Address")} onStatus={onStatus} />
                </PrefRow>
              ) : null}
            </div>
            {prefs.lan ? (
              <div className="list prefs" id="allowList">
                <PrefRow
                  name={t("Allowed addresses")}
                  sub={t("Other computers reach magpie only from these addresses or ranges (CIDR), even with a gateway key; this computer always can. None listed lets every address in")}
                  className="rule-row"
                  valClassName="rule-add"
                >
                  <input
                    className="words rule-match allow-ip"
                    value={prefs.allowDraft}
                    placeholder="203.0.113.7, 10.0.0.0/8"
                    aria-label={t("IP address or range")}
                    onChange={(e) => setPrefsState((p) => ({ ...p, allowDraft: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      const parts = prefs.allowDraft.split(/[\s,;]+/).filter(Boolean);
                      if (!parts.length) return;
                      setPrefs({ allowIPs: [...prefs.allowIPs, ...parts], allowDraft: "" });
                    }}
                  />
                  <button
                    type="button"
                    className="text"
                    onClick={() => {
                      const parts = prefs.allowDraft.split(/[\s,;]+/).filter(Boolean);
                      if (!parts.length) return;
                      setPrefs({ allowIPs: [...prefs.allowIPs, ...parts], allowDraft: "" });
                    }}
                  >
                    {t("Add")}
                  </button>
                </PrefRow>
                {prefs.allowIPs.map((a) => (
                  <PrefRow key={a} name={a} className="allow-ip-row">
                    <button
                      type="button"
                      className="text"
                      onClick={() => setPrefs({ allowIPs: prefs.allowIPs.filter((x) => x !== a) })}
                    >
                      {t("Remove")}
                    </button>
                  </PrefRow>
                ))}
              </div>
            ) : null}
          </>
        )}
        {nRows.cors && (
          <>
            <Label en="Web pages" />
            <div className="list prefs" id="corsList">
              <PrefRow
                name={t("Web pages that may call magpie")}
                sub={t("Scripts on these origins can call the gateway from a browser, each request with a gateway key from Gateway. A page from any other site is refused; pages on this computer are not")}
                className="rule-row"
              >
                <div className="val rule-add" style={{ display: "inline-flex", gap: 6 }}>
                  <input
                    className="words rule-match"
                    value={prefs.corsDraft}
                    placeholder="http://localhost:3000"
                    aria-label={t("Web page origin")}
                    onChange={(e) => setPrefsState((p) => ({ ...p, corsDraft: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const v = prefs.corsDraft.trim();
                        if (!v) return;
                        setPrefs({ corsOrigins: [...prefs.corsOrigins, v], corsDraft: "" });
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="text"
                    onClick={() => {
                      const v = prefs.corsDraft.trim();
                      if (!v) return;
                      setPrefs({ corsOrigins: [...prefs.corsOrigins, v], corsDraft: "" });
                    }}
                  >
                    {t("Add")}
                  </button>
                </div>
              </PrefRow>
              {prefs.corsOrigins.map((o) => (
                <PrefRow key={o} name={o} className="cors-origin">
                  <button
                    type="button"
                    className="text"
                    onClick={() => setPrefs({ corsOrigins: prefs.corsOrigins.filter((x) => x !== o) })}
                  >
                    {t("Remove")}
                  </button>
                </PrefRow>
              ))}
            </div>
          </>
        )}
      </section>

      {/* MODELS */}
      <section
        className="set-page"
        id="setPage-models"
        role="tabpanel"
        aria-labelledby="setTab-models"
        data-part={t("Models")}
        hidden={pageHidden("models", mAny)}
      >
        <Label en="Images" />
        <div className="list prefs" id="imagesList">
          <PrefRow
            name={t("Image recognition")}
            sub={
              prefs.vision === "off"
                ? t("A model that can't see images is sent none: a request with one in its latest message is turned away")
                : t("When the model in use can't see images, this one describes them to it, once for each image")
            }
          >
            <Segs
              value={prefs.vision}
              onChange={(v) => setPrefs({ vision: v as DemoPrefs["vision"] })}
              items={[
                { id: "auto", label: t("Automatic") },
                { id: "off", label: t("Off") },
              ]}
            />
          </PrefRow>
          <PrefRow name={t("Image generation")} sub={demoCopy("演示：生成图模型选择器壳", "Demo: image-gen picker shell")}>
            <Segs
              value={prefs.imageGen}
              onChange={(v) => setPrefs({ imageGen: v as DemoPrefs["imageGen"] })}
              items={[
                { id: "auto", label: t("Automatic") },
                { id: "off", label: t("Off") },
              ]}
            />
          </PrefRow>
          <PrefRow name={t("Image recognition MCP server")} sub={t("Agents can add image recognition as an MCP server (Streamable HTTP) with one analyze_image tool, which reads an image with the Image recognition model from a file path, a URL or a data URL. From another computer, send a gateway key as Authorization: Bearer <key> and the image as a URL or data URL.")}>
            <code>{`http://${GATEWAY_ADDR}/mcp/magpie/vision`}</code>
            <CopyBtn text={`http://${GATEWAY_ADDR}/mcp/magpie/vision`} what={t("Address")} onStatus={onStatus} />
          </PrefRow>
        </div>
        <Label en="Web search" />
        <div className="list prefs" id="searchList">
          <PrefRow name={t("Web search")} sub={demoCopy("演示：联网搜索模型", "Demo: web-search model")}>
            <Segs
              value={prefs.webSearch}
              onChange={(v) => setPrefs({ webSearch: v as DemoPrefs["webSearch"] })}
              items={[
                { id: "auto", label: t("Automatic") },
                { id: "off", label: t("Off") },
              ]}
            />
          </PrefRow>
        </div>
        <Label en="Replies" />
        <div className="list prefs" id="replyList">
          <PrefRow name={t("Replies")} sub={demoCopy("演示：回复模型", "Demo: replies model")}>
            <Segs
              value={prefs.replies}
              onChange={(v) => setPrefs({ replies: v as DemoPrefs["replies"] })}
              items={[
                { id: "auto", label: t("Automatic") },
                { id: "off", label: t("Off") },
              ]}
            />
          </PrefRow>
        </div>
        <Label en="Disabled models" />
        <div className="list prefs" id="disabledModelsList">
          <div className="empty-state" style={{ padding: "18px 12px" }}>
            {t("No disabled models")}
          </div>
        </div>
      </section>

      {/* PRIVACY */}
      <section
        className="set-page"
        id="setPage-privacy"
        role="tabpanel"
        aria-labelledby="setTab-privacy"
        data-part={t("Privacy")}
        hidden={pageHidden("privacy", pAny)}
      >
        <div className="list prefs" id="redactList">
          <PrefRow name={t("Redact secrets in logs")} sub={demoCopy("演示：日志脱敏", "Demo: redact secrets in logs")}>
            <Segs
              value={prefs.redactKeys ? "on" : "off"}
              onChange={(v) => setPrefs({ redactKeys: v === "on" })}
              items={[
                { id: "off", label: t("Off") },
                { id: "on", label: t("On") },
              ]}
            />
          </PrefRow>
          <PrefRow name={t("Redact request bodies")} sub={demoCopy("演示：请求体脱敏", "Demo: redact bodies")}>
            <Segs
              value={prefs.redactBodies ? "on" : "off"}
              onChange={(v) => setPrefs({ redactBodies: v === "on" })}
              items={[
                { id: "off", label: t("Off") },
                { id: "on", label: t("On") },
              ]}
            />
          </PrefRow>
        </div>
        <Label en="Agents' sign-ins" />
        <div className="list prefs" id="discoveryList">
          <PrefRow name={t("Discover agent sign-ins")} sub={demoCopy("演示：代理登录发现", "Demo: agent sign-in discovery")}>
            <Segs
              value={prefs.discovery}
              onChange={(v) => setPrefs({ discovery: v as DemoPrefs["discovery"] })}
              items={[
                { id: "ask", label: t("Ask") },
                { id: "allow", label: t("Allow") },
                { id: "deny", label: t("Deny") },
              ]}
            />
          </PrefRow>
        </div>
      </section>

      {/* OTEL */}
      <section
        className="set-page"
        id="setPage-otel"
        role="tabpanel"
        aria-labelledby="setTab-otel"
        data-part={t("Observability")}
        data-feature="otel"
        hidden={pageHidden("otel", oAny)}
      >
        <div id="otelList" className="list prefs">
          <PrefRow name={t("OpenTelemetry")} sub={demoCopy("演示：OTLP 导出壳", "Demo: OTLP export shell")}>
            <Segs
              value={prefs.otel ? "on" : "off"}
              onChange={(v) => setPrefs({ otel: v === "on" })}
              items={[
                { id: "off", label: t("Off") },
                { id: "on", label: t("On") },
              ]}
            />
          </PrefRow>
          {prefs.otel ? (
            <PrefRow name={t("OTLP endpoint")}>
              <input
                className="words set-field"
                style={{ width: 220 }}
                value={prefs.otelEndpoint}
                placeholder="http://127.0.0.1:4318"
                onChange={(e) => setPrefsState((p) => ({ ...p, otelEndpoint: e.target.value }))}
                onBlur={() => setPrefs({ otelEndpoint: prefs.otelEndpoint })}
              />
            </PrefRow>
          ) : null}
        </div>
      </section>

      {/* SYNC */}
      <section
        className="set-page"
        id="setPage-sync"
        role="tabpanel"
        aria-labelledby="setTab-sync"
        data-part={t("Sync and backup")}
        hidden={pageHidden("sync", sAny)}
      >
        <div className="list prefs" id="syncList">
          <PrefRow
            name={t(prefs.syncOn ? "WebDAV sync" : "WebDAV, S3 or GitHub sync")}
            sub={
              prefs.syncOn
                ? t("Not synced yet · {host}", { host: "demo.example.com" })
                : t("Keeps {parts} the same on every computer", {
                    parts: t("providers with their API keys") + t(", ") + t("settings") + t(", ") + t("profiles"),
                  })
            }
          >
            {prefs.syncOn ? (
              <>
                <button type="button" className="text" onClick={() => onStatus?.(demoCopy("演示：已触发同步", "Demo: sync triggered"), "ok")}>
                  {t("Sync now")}
                </button>
                <button
                  type="button"
                  className="text"
                  onClick={() => setPrefs({ syncOpen: prefs.syncOpen === "dav" ? "" : "dav" }, " ")}
                >
                  {t(prefs.syncOpen === "dav" ? "Close" : "Edit")}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="text"
                onClick={() => setPrefs({ syncOpen: prefs.syncOpen === "dav" ? "" : "dav", syncOn: prefs.syncOpen !== "dav" }, " ")}
              >
                {t(prefs.syncOpen === "dav" ? "Close" : "Set up")}
              </button>
            )}
          </PrefRow>
          {prefs.syncOpen === "dav" && (
            <div className="row pref" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
              <input className="words" placeholder="https://dav.example.com/magpie" defaultValue="" aria-label="URL" />
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button type="button" className="text action" onClick={() => setPrefs({ syncOn: true, syncOpen: "" }, t("Saved"))}>
                  {t("Save")}
                </button>
                <button type="button" className="text" onClick={() => setPrefs({ syncOn: false, syncOpen: "" }, " ")}>
                  {t("Off")}
                </button>
              </div>
            </div>
          )}
          {prefs.syncOn && (
            <PrefRow
              name={t("Sync by itself")}
              sub={prefs.syncAuto ? t("Every {n} minutes while magpie runs", { n: prefs.syncAuto }) : t("Off: only Sync now syncs")}
            >
              <Segs
                value={prefs.syncAuto}
                onChange={(m) => setPrefs({ syncAuto: Number(m) })}
                items={[
                  { id: 0, label: t("Off") },
                  { id: 3, label: t("3 min") },
                  { id: 15, label: t("15 min") },
                  { id: 30, label: t("30 min") },
                  { id: 60, label: t("1 hour") },
                ]}
              />
            </PrefRow>
          )}
          <PrefRow name={t("Export")} sub={t("Everything above in one file, sealed with a passphrase, to carry to another computer")}>
            <button
              type="button"
              className="text"
              onClick={() => {
                setPrefs({ syncOpen: prefs.syncOpen === "export" ? "" : "export" }, " ");
                onStatus?.(demoCopy("演示：导出表单壳", "Demo: export form shell"), "ok");
              }}
            >
              {t(prefs.syncOpen === "export" ? "Close" : "Export…")}
            </button>
          </PrefRow>
          <PrefRow name={t("Import")} sub={t("Bring in a file exported from magpie")}>
            <button
              type="button"
              className="text"
              onClick={() => {
                setPrefs({ syncOpen: prefs.syncOpen === "import" ? "" : "import" }, " ");
                onStatus?.(demoCopy("演示：导入表单壳", "Demo: import form shell"), "ok");
              }}
            >
              {t(prefs.syncOpen === "import" ? "Close" : "Import…")}
            </button>
          </PrefRow>
        </div>
      </section>

      {/* ABOUT */}
      <section
        className="set-page"
        id="setPage-about"
        role="tabpanel"
        aria-labelledby="setTab-about"
        data-part={t("About")}
        hidden={pageHidden("about", aAny)}
      >
        <div className="list prefs" id="about">
          <PrefRow name={t("Version")}>
            <code>0.1.11-demo</code>
            <button type="button" className="text" onClick={() => onStatus?.(demoCopy("演示：已是最新", "Demo: up to date"), "ok")}>
              {t("Check")}
            </button>
          </PrefRow>
          <PrefRow name={t("What's new")} sub={t("The release notes since the last update")} className="whatsnew-row">
            <button type="button" className="text" onClick={() => onStatus?.(demoCopy("演示：更新说明壳", "Demo: release notes shell"), "ok")}>
              {t("Open")}
            </button>
          </PrefRow>
          <PrefRow name={t("Update button")} sub={t("Shows in the header when a newer magpie is out")} className="update-pill-row">
            <Segs
              value={prefs.noUpdatePill ? "off" : "on"}
              onChange={(v) => setPrefs({ noUpdatePill: v === "off" })}
              items={[
                { id: "off", label: t("Off") },
                { id: "on", label: t("On") },
              ]}
            />
          </PrefRow>
          <PrefRow name={t("Automatic updates")} sub={t("Checks for a newer magpie and downloads it")} className="update-auto-row">
            <Segs
              value={prefs.noAutoUpdate ? "off" : "on"}
              onChange={(v) => setPrefs({ noAutoUpdate: v === "off" })}
              items={[
                { id: "off", label: t("Off") },
                { id: "on", label: t("On") },
              ]}
            />
          </PrefRow>
          <PrefRow
            name={t("Check every")}
            sub={prefs.noAutoUpdate ? t("While automatic updates are on") : t("How often magpie looks for a newer version")}
            className={`update-every-row${prefs.noAutoUpdate ? " off" : ""}`}
          >
            <Segs
              value={prefs.updateEvery}
              onChange={(m) => setPrefs({ updateEvery: Number(m) })}
              items={[
                { id: 60, label: t("{n} h", { n: 1 }) },
                { id: 360, label: t("{n} h", { n: 6 }) },
                { id: 1440, label: t("{n} h", { n: 24 }) },
              ]}
            />
          </PrefRow>
          <PrefRow
            name={t("Restart automatically")}
            sub={
              prefs.noAutoUpdate
                ? t("While automatic updates are on")
                : t("Once an update is downloaded, restarts into it when no agent request is in flight")
            }
            className={`update-restart-row${prefs.noAutoUpdate ? " off" : ""}`}
          >
            <Segs
              value={prefs.autoRestart ? "on" : "off"}
              onChange={(v) => setPrefs({ autoRestart: v === "on" })}
              items={[
                { id: "off", label: t("Off") },
                { id: "on", label: t("On") },
              ]}
            />
          </PrefRow>
          <PrefRow name={t("Config folder")} sub={t("providers, profiles and these settings")}>
            <code>~/.magpie</code>
            <CopyBtn text="~/.magpie" what={t("Path")} onStatus={onStatus} />
            <button type="button" className="text" onClick={() => onStatus?.(demoCopy("演示：无法打开目录", "Demo: cannot reveal folder"), "warn")}>
              {t("Open")}
            </button>
          </PrefRow>
          <PrefRow name={t("Gateway URL")} sub={t("the address every agent is pointed at")}>
            <code>{`http://${GATEWAY_ADDR}`}</code>
            <CopyBtn text={`http://${GATEWAY_ADDR}`} what={t("Gateway URL")} onStatus={onStatus} />
          </PrefRow>
          <PrefRow name={t("Community")} sub={t("questions, ideas and feedback, on Discord or GitHub")}>
            <button
              type="button"
              className="discord"
              title="discord.gg/vGSnD3ZKQF"
              onClick={() => window.open("https://discord.gg/vGSnD3ZKQF", "_blank", "noopener")}
            >
              <span>{t("Join Discord")}</span>
            </button>
            <button
              type="button"
              className="github"
              title="github.com/yetone/magpie"
              onClick={() => window.open("https://github.com/yetone/magpie", "_blank", "noopener")}
            >
              <span>GitHub</span>
            </button>
          </PrefRow>
          <PrefRow name={t("About")} sub={demoCopy("magpie-shell-demo · 非官方 Magpie 壳", "magpie-shell-demo · not official Magpie")} />
        </div>
      </section>
    </main>
  );
}
