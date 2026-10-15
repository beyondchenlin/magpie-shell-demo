import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Segs } from "../components/Segs";
import { useSegThumb } from "../components/SegThumb";
import { GATEWAY_ADDR } from "../data/mock";
import { demoCopy, t, type Lang } from "../i18n";
import {
  AlertNumField,
  AboutVersionRow,
  FontRow,
  applyDemoFonts,
  type FontFace,
  AutoResetOwn,
  CliRow,
  CodexModelPick,
  DailyWarmRow,
  LanAddressRow,
  OtelFull,
  ProxyBlock,
  RedactRulesBlock,
  RestoreModal,
  SideModelPick,
  SyncForms,
  TrayUsagePick,
  UpdateMirrorRow,
  WhatsNewModal,
  DisableModelsBlock,
  SearchApisBlock,
  type AutoResetMap,
  type OtelConfig,
  type RedactRule,
  type SearchApiEntry,
} from "./settings/NestedBlocks";

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

/** Magpie data-feature=otel — off by default (native Linux tab row has no Observability). */
function otelFeatureOn(): boolean {
  try {
    return localStorage.getItem("magpie.feature.otel") === "1";
  } catch {
    return false;
  }
}

const DEMO_APP_VERSION = "0.1.1240";
const applyThemeFlash: { t?: number } = {};
const IS_MAC = /\bMac\b|Macintosh/i.test(navigator.platform || navigator.userAgent);

/** Magpie REDACT_KINDS — nested under Mask personal data (shots 64–66). */
const REDACT_KINDS: [string, string, string, boolean][] = [
  ["ssn", "Social Security numbers", "US SSNs, in the ranges that are given out", true],
  ["passport", "Passport numbers", "After the word passport, 护照 or パスポート", true],
  ["iban", "IBANs", "Bank account numbers whose checksum adds up", true],
  ["birthday", "Birthdays", "A date after birthday, DOB, born or 生日; a date alone stays", true],
  ["mac", "MAC addresses", "A network card's hardware address", true],
  ["serial", "Serial numbers", "After S/N, Serial or 序列号", true],
  ["home", "User name in home folders", "The name in /Users/name, /home/name and C:\\Users\\name. Off by default: agents send their folder with every request", false],
  ["userhost", "User and computer names", "user@host in a shell prompt or an ssh command, and hostname or user lines", false],
  ["ip", "Public IP addresses", "Private, local and documentation addresses stay. Off by default: logs and configs are full of them", false],
  ["bucket", "Cloud storage buckets", "The bucket in s3://, gs://, oss://, cos:// and storage URLs; the path in it stays", false],
];

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
  plainNames: "off" | "own" | "on";
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
  usageAlert: number; // 0 = off, else 1–100 share used
  balanceAlert: number; // 0 = off, else amount in vendor currency
  resetReminder: "off" | "12h" | "24h" | "48h";
  turnDone: "off" | "1" | "3" | "10";
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
  discovery: "on" | "off";
  redactKinds: Record<string, boolean>;
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
  trayUsageMode: string; // "" | usage:today | usage:7d
  trayEvery: "1" | "3" | "5" | "10" | "30";
  trayLogos: boolean;
  trayBird: boolean;
  trayPace: boolean;
  vision: string; // "" auto | "off" | model id
  imageGen: string;
  webSearch: string; // searcher
  memberModel: boolean;
  noLoopGuard: boolean;
  refusalRetries: string; // "" = All
  updateMirror: string;
  codexTitles: string;
  codexDescriptions: string;
  codexPredictions: string;
  codexAutoReview: string;
  allowIPs: string[];
  allowDraft: string;
  codexWarmAts: string[];
  claudeWarmAts: string[];
  proxyUser: string;
  proxyPass: string;
  lanProtocol: "openai" | "anthropic";
  lanSelectedURL: string;
  redactPersonal: boolean;
  redactWords: string;
  redactRules: RedactRule[];
  noStats: boolean;
  noUsageStats: boolean;
  hideAccounts: boolean;
  otelCfg: OtelConfig;
  syncKind: "webdav" | "s3" | "github";
  autoReset: AutoResetMap;
  autoResetUsers: string[];
  showGwDemo: boolean;
  disabledModels: string[];
  searchAPIs: SearchApiEntry[];
  uiFont: FontFace | null;
  codeFont: FontFace | null;
};

const DEFAULTS: DemoPrefs = {
  colorblind: false,
  textSize: 110,
  tray: "panel",
  plainNames: "on",
  codexAgentsV1: false,
  fullContext: false,
  compactAt: "",
  login: false,
  keepAwake: "off",
  lightweight: false,
  quotaLeft: false,
  quotaReads: "",
  currency: "usd",
  chineseUnits: true,
  usageAlert: 0,
  balanceAlert: 0,
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
  discovery: "on",
  redactKinds: {},
  otel: false,
  otelEndpoint: "",
  noUpdatePill: true,  // Off — NOTES 89/97
  noAutoUpdate: false,
  updateEvery: 360,
  autoRestart: false,
  syncOpen: "",
  syncOn: false,
  syncAuto: 3,
  trayUsage: false,
  trayUsageMode: "",
  trayEvery: "3",
  trayLogos: true,
  trayBird: true,
  trayPace: false,
  vision: "",
  imageGen: "",
  webSearch: "",
  memberModel: false,
  noLoopGuard: false,
  refusalRetries: "",
  updateMirror: "",
  codexTitles: "",
  codexDescriptions: "",
  codexPredictions: "",
  codexAutoReview: "",
  allowIPs: [],
  allowDraft: "",
  codexWarmAts: [],
  claudeWarmAts: [],
  proxyUser: "",
  proxyPass: "",
  lanProtocol: "openai",
  lanSelectedURL: "http://172.30.0.2:3425",
  redactPersonal: false,
  redactWords: "",
  redactRules: [{ kind: "API_KEY", prefix: "oc_sk_" }],
  noStats: false,
  noUsageStats: true,
  hideAccounts: false,
  otelCfg: {
    enabled: false,
    endpoint: "",
    headers: "",
    metrics: false,
    sessions: false,
    bodies: false,
    bodiesWhole: false,
  },
  syncKind: "webdav",
  autoReset: { "demo@openai.com": { week: false, expiring: false } },
  autoResetUsers: ["demo@openai.com"],
  showGwDemo: true,
  disabledModels: [],
  searchAPIs: [],
  uiFont: null,
  codeFont: null,
};

function loadPrefs(): DemoPrefs {
  try {
    const raw = localStorage.getItem(PREFS_LS);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<DemoPrefs> & { replies?: string };
    const next: DemoPrefs = { ...DEFAULTS, ...parsed };
    // migrate old Segs values ("auto") → Magpie empty-string Automatic
    if (next.vision === "auto") next.vision = "";
    if (next.imageGen === "auto") next.imageGen = "";
    if (next.webSearch === "auto") next.webSearch = "";
    if (parsed.trayUsage && !parsed.trayUsageMode) next.trayUsageMode = "usage:today";
    if ((parsed as { plainNames?: string }).plainNames === "show") next.plainNames = "on";
    if ((parsed as { plainNames?: string }).plainNames === "hide") next.plainNames = "off";
    if ((parsed as { turnDone?: string }).turnDone === "on") next.turnDone = "1";
    const oldDisc = (parsed as { discovery?: string }).discovery;
    if (oldDisc === "ask" || oldDisc === "allow") next.discovery = "on";
    if (oldDisc === "deny") next.discovery = "off";
    if (!next.redactKinds || typeof next.redactKinds !== "object") next.redactKinds = {};
    // v0.1.40: Magpie alert fields are numbers (0=off), not segs Off/80/90/100
    const ua = (parsed as { usageAlert?: unknown }).usageAlert;
    if (typeof ua === "string") {
      if (ua === "off" || ua === "") next.usageAlert = 0;
      else if (ua === "on") next.usageAlert = 80;
      else {
        const n = Number(ua);
        next.usageAlert = Number.isFinite(n) && n > 0 ? n : 0;
      }
    } else if (typeof ua !== "number") next.usageAlert = 0;
    const ba = (parsed as { balanceAlert?: unknown }).balanceAlert;
    if (typeof ba === "string") {
      if (ba === "off" || ba === "") next.balanceAlert = 0;
      else if (ba === "on") next.balanceAlert = 5;
      else {
        const n = Number(ba);
        next.balanceAlert = Number.isFinite(n) && n > 0 ? n : 0;
      }
    } else if (typeof ba !== "number") next.balanceAlert = 0;
    const te = String((parsed as { trayEvery?: string }).trayEvery || "");
    if (te === "15") next.trayEvery = "10";
    else if (!["1", "3", "5", "10", "30"].includes(te)) next.trayEvery = "3";
    // v0.1.81: unset compactAt is empty (placeholder 272k); old demo wrote "272k"
    if (next.compactAt === "272k" || next.compactAt === "272K") next.compactAt = "";
    return next;
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
  subTitle,
  children,
  id,
  hidden,
  className,
  valClassName,
}: {
  name: string;
  sub?: ReactNode;
  subTitle?: string;
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
        {sub ? <div className="sub" title={subTitle ?? (typeof sub === "string" ? sub : undefined)}>{sub}</div> : null}
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
  onHeaderUpdate?: (show: boolean) => void;
};


/** Magpie parseContexts for a single * size (settings Compact at). */
function parseCompactTokens(text: string): number | null {
  const v = text.trim().toLowerCase().replace(/_/g, "");
  if (!v) return 0;
  const m = /^(\d+(?:\.\d+)?)([km]?)$/.exec(v);
  if (!m) return null;
  const n = Math.round(parseFloat(m[1]) * (m[2] === "m" ? 1e6 : m[2] === "k" ? 1e3 : 1));
  return n > 0 ? n : null;
}

function formatCompactTokens(n: number): string {
  if (n % 1e6 === 0) return `${n / 1e6}m`;
  if (n % 1e3 === 0) return `${n / 1e3}k`;
  return String(n);
}

const AUTOSTART_LS = "magpie.demoAutostart";

export function SettingsView({ theme, setTheme, lang, setLang, onStatus, onHeaderUpdate }: SettingsProps) {
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
  /** Compact field draft: invalid "nope" stays typed; null = show prefs.compactAt / placeholder. */
  const [compactDraft, setCompactDraft] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [localePick, setLocalePick] = useState<string>(() => (lang === "zh" ? "zh" : lang === "en" ? "en" : "system"));
  const [warmTab, setWarmTab] = useState<"codex" | "claude">("codex");
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [proxyTest, setProxyTest] = useState("");
  useEffect(() => {
    if (tab === "otel" && !otelFeatureOn()) setTab("general");
  }, [tab]);
  useEffect(() => {
    applyDemoFonts(prefs.uiFont, prefs.codeFont);
  }, [prefs.uiFont, prefs.codeFont]);
  const setTabsBox = useSegThumb(tab);
  const warmBox = useSegThumb(warmTab);
  const langBtn = useRef<HTMLButtonElement>(null);
  const searching = q.trim().length > 0;

  const setPrefs = useCallback(
    (patch: Partial<DemoPrefs>, toast?: string | false) => {
      setPrefsState((prev) => {
        const next = { ...prev, ...patch };
        savePrefs(next);
        return next;
      });
      // NOTES 135–177: Saved only on savePrefs rows (tray / lightweight / prevent sleep…).
      // Dedicated endpoints (plain names, subagents, compact, Codex pickers, login) stay silent.
      if (toast === false) return;
      if (typeof toast === "string") onStatus?.(toast, "ok", 1500);
      else onStatus?.(t("Saved"), "ok", 1500);
    },
    [onStatus],
  );

  useEffect(() => {
    applyTextSize(prefs.textSize);
  }, [prefs.textSize]);

  useEffect(() => {
    onHeaderUpdate?.(!prefs.noUpdatePill);
  }, [prefs.noUpdatePill, onHeaderUpdate]);

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
    uiFont: matchQ("Interface font"),
    codeFont: matchQ("Code font"),
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
    matchQ("Searches for other") || matchQ("Search APIs") || matchQ("Web search") ||
    matchQ("Name the member") || matchQ("Stop looping") || matchQ("Ask again") || matchQ("Replies") ||
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
    <>
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
          {SET_TABS.filter((x) => x.id !== "otel" || otelFeatureOn()).map((x) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              id={`setTab-${x.id}`}
              data-set={x.id}
              data-feature={x.id === "otel" ? "otel" : undefined}
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
                  const root = document.documentElement;
                  root.classList.add("theming");
                  window.clearTimeout((applyThemeFlash as { t?: number }).t);
                  (applyThemeFlash as { t?: number }).t = window.setTimeout(() => root.classList.remove("theming"), 450);
                  setTheme(v as Theme);
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
            <PrefRow
              name={t("Text size")}
              id="textSizeRow"
              sub={t("Everything in magpie's windows, larger; {keys} too", { keys: "Ctrl+ / Ctrl− / Ctrl+0" })}
            >
              <Segs
                value={prefs.textSize}
                onChange={(n) => {
                  setPrefs({ textSize: Number(n) });
                  onStatus?.(t("Text size {n}%", { n: Number(n) }), "ok", 1200);
                }}
                items={TEXT_SIZES.map((n) => ({ id: n, label: `${n}%` }))}
                title={t("Everything in magpie's windows, larger; {keys} too", { keys: "Ctrl+ / Ctrl− / Ctrl+0" })}
              />
            </PrefRow>
          )}
          {gRows.uiFont && (
            <FontRow
              kind="ui"
              value={prefs.uiFont}
              onChange={(uiFont) => setPrefs({ uiFont })}
              onStatus={onStatus}
            />
          )}
          {gRows.codeFont && (
            <FontRow
              kind="code"
              value={prefs.codeFont}
              onChange={(codeFont) => setPrefs({ codeFont })}
              onStatus={onStatus}
            />
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
            <PrefRow name={t("Provider in model names")} id="plainNamesRow">
              <Segs
                value={prefs.plainNames}
                onChange={(v) => setPrefs({ plainNames: v as DemoPrefs["plainNames"] }, false)}
                items={[
                  { id: "off", label: t("Off") },
                  { id: "own", label: t("Not on names I set") },
                  { id: "on", label: t("On") },
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
                onChange={(v) => setPrefs({ codexAgentsV1: v === "on" }, false)}
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
                  onChange={(v) => {
                    setCompactDraft(null);
                    setPrefs({ fullContext: v === "on" }, false);
                  }}
                  items={[
                    { id: "off", label: t("Compact at {n}", { n: (prefs.compactAt || "272k").toUpperCase() }) },
                    { id: "on", label: t("Full window") },
                  ]}
                />
                {!prefs.fullContext ? (
                  <input
                    className="words compact-num"
                    value={compactDraft !== null ? compactDraft : prefs.compactAt}
                    placeholder="272k"
                    aria-label={t("Compact at")}
                    title={t("Compact at")}
                    onChange={(e) => setCompactDraft(e.target.value)}
                    onBlur={() => {
                      const raw = (compactDraft !== null ? compactDraft : prefs.compactAt) ?? "";
                      const trimmed = raw.trim();
                      if (!trimmed) {
                        setCompactDraft(null);
                        setPrefs({ compactAt: "", fullContext: false }, false);
                        return;
                      }
                      const n = parseCompactTokens(trimmed);
                      if (n === null) {
                        onStatus?.(t("Compact at: {v} is not a number of tokens like 272k", { v: trimmed }), "err");
                        return;
                      }
                      if (n === 0) {
                        setCompactDraft(null);
                        setPrefs({ compactAt: "", fullContext: false }, false);
                        return;
                      }
                      setCompactDraft(null);
                      setPrefs({ compactAt: formatCompactTokens(n), fullContext: false }, false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                  />
                ) : null}
              </div>
            </PrefRow>
          )}
          {gRows.codexTitles && (
            <PrefRow name={t("Codex thread titles")} id="codexTitlesRow">
              <CodexModelPick field="codexTitles" value={prefs.codexTitles} label={t("Codex thread titles")} onChange={(v) => setPrefs({ codexTitles: v }, false)} />
            </PrefRow>
          )}
          {gRows.codexDesc && (
            <PrefRow name={t("Codex thread descriptions")} id="codexDescriptionsRow">
              <CodexModelPick field="codexDescriptions" value={prefs.codexDescriptions} label={t("Codex thread descriptions")} onChange={(v) => setPrefs({ codexDescriptions: v }, false)} />
            </PrefRow>
          )}
          {gRows.codexPred && (
            <PrefRow name={t("Codex composer predictions")} id="codexPredictionsRow">
              <CodexModelPick field="codexPredictions" value={prefs.codexPredictions} label={t("Codex composer predictions")} onChange={(v) => setPrefs({ codexPredictions: v }, false)} />
            </PrefRow>
          )}
          {gRows.codexReview && (
            <PrefRow name={t("Codex auto-review model")} id="codexAutoReviewRow">
              <CodexModelPick field="codexAutoReview" value={prefs.codexAutoReview} label={t("Codex auto-review model")} onChange={(v) => setPrefs({ codexAutoReview: v }, false)} />
            </PrefRow>
          )}
          {gRows.login && (
            <PrefRow name={t("Open at login")}>
              <Segs
                value={prefs.login ? "on" : "off"}
                onChange={(v) => {
                  const on = v === "on";
                  try {
                    if (on) {
                      localStorage.setItem(
                        AUTOSTART_LS,
                        JSON.stringify({
                          Type: "Application",
                          Name: "magpie",
                          Exec: "magpie tray",
                          path: "~/.config/autostart/magpie.desktop",
                        }),
                      );
                    } else {
                      localStorage.removeItem(AUTOSTART_LS);
                    }
                  } catch {
                    /* ignore */
                  }
                  setPrefs({ login: on }, false);
                }}
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
              sub={t("A closed window frees about 100 MB after a minute; the gateway and tasks keep running, only the page reloads")}
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
              <TrayUsagePick
                value={prefs.trayUsageMode}
                onChange={(trayUsageMode) => setPrefs({ trayUsageMode, trayUsage: !!trayUsageMode })}
              />
            </PrefRow>
          )}
          {uRows.trayEvery && !!prefs.trayUsageMode && (
            <PrefRow name={t("Menu bar refresh")} sub={t("How often the allowances beside the icon are asked for again")} id="trayEveryRow">
              <Segs
                value={prefs.trayEvery}
                onChange={(v) => setPrefs({ trayEvery: v as DemoPrefs["trayEvery"] })}
                items={[
                  { id: "1", label: t("{n} min", { n: 1 }) },
                  { id: "3", label: t("{n} min", { n: 3 }) },
                  { id: "5", label: t("{n} min", { n: 5 }) },
                  { id: "10", label: t("{n} min", { n: 10 }) },
                  { id: "30", label: t("{n} min", { n: 30 }) },
                ]}
              />
            </PrefRow>
          )}
          {uRows.trayLogos && !!prefs.trayUsageMode && IS_MAC && (
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
          {uRows.trayBird && !!prefs.trayUsageMode && IS_MAC && (
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
          {uRows.trayPace && !!prefs.trayUsageMode && (
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
                  { id: "usd", label: "$ USD" },
                  { id: "cny", label: "¥ CNY" },
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
            <PrefRow
              name={t("Allowance alert")}
              sub={t("A notification when a 5-hour, weekly or monthly window reaches this share used, once each time it runs")}
              id="usageAlertRow"
            >
              <AlertNumField
                value={prefs.usageAlert}
                unit="%"
                ariaLabel={t("Share used")}
                defaultOn={80}
                ok={(n) => Number.isInteger(n) && n >= 1 && n <= 100}
                onChange={(usageAlert) => setPrefs({ usageAlert })}
              />
            </PrefRow>
          )}
          {uRows.bal && (
            <PrefRow
              name={t("Low balance alert")}
              sub={t("A notification when a balance falls to this amount, in its own currency or credits, once until it is topped up")}
              id="balanceAlertRow"
            >
              <AlertNumField
                value={prefs.balanceAlert}
                ariaLabel={t("Amount")}
                defaultOn={5}
                ok={(n) => Number.isFinite(n) && n > 0}
                onChange={(balanceAlert) => setPrefs({ balanceAlert })}
              />
            </PrefRow>
          )}
          {uRows.reset && (
            <PrefRow
              name={t("Reset reminder")}
              sub={t("A notification this long before a weekly or monthly window renews with under 85% of it used, or before unused resets expire")}
              id="resetReminderRow"
            >
              <Segs
                value={prefs.resetReminder}
                onChange={(v) => setPrefs({ resetReminder: v as DemoPrefs["resetReminder"] })}
                items={[
                  { id: "off", label: t("Off") },
                  { id: "12h", label: t("{n} h before", { n: 12 }) },
                  { id: "24h", label: t("{n} h before", { n: 24 }) },
                  { id: "48h", label: t("{n} h before", { n: 48 }) },
                ]}
              />
            </PrefRow>
          )}
          {uRows.turn && (
            <PrefRow name={t("Task done alert")} sub={t("A notification when Claude Code, Codex, OpenCode or another agent going through magpie finishes a task that ran at least this long")} id="turnDoneRow">
              <Segs
                value={prefs.turnDone}
                onChange={(v) => setPrefs({ turnDone: v as DemoPrefs["turnDone"] })}
                items={[
                  { id: "off", label: t("Off") },
                  { id: "1", label: t("{n} min", { n: 1 }) },
                  { id: "3", label: t("{n} min", { n: 3 }) },
                  { id: "10", label: t("{n} min", { n: 10 }) },
                ]}
              />
            </PrefRow>
          )}
          <PrefRow
            name={t("Codex: auto-use resets")}
            sub={t("A ChatGPT account uses one of its resets by itself when its week is used up and no other account can answer, or before one expires unused. Off until turned on, account by account; each account's card on the Usage page has the same switch.")}
            id="codexAutoResetRow"
            className="wraps"
          />
          <AutoResetOwn
            users={prefs.autoResetUsers}
            map={prefs.autoReset}
            onChange={(autoReset) => setPrefs({ autoReset })}
          />
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
                  <DailyWarmRow
                    ats={prefs.codexWarmAts}
                    onChange={(codexWarmAts) => setPrefs({ codexWarmAts })}
                    sub={
                      prefs.codexWarmAts.length > 1
                        ? t("Starts each account's 5-hour window at each of these times every day")
                        : t("Starts each account's 5-hour window at this time every day")
                    }
                  />
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
                  <DailyWarmRow
                    ats={prefs.claudeWarmAts}
                    onChange={(claudeWarmAts) => setPrefs({ claudeWarmAts })}
                    sub={t("Sent through Claude Code.")}
                  />
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
            <ProxyBlock
              mode={prefs.proxy}
              url={prefs.proxyUrl}
              user={prefs.proxyUser}
              pass={prefs.proxyPass}
              testLine={proxyTest}
              onMode={(proxy) => setPrefs({ proxy })}
              onUrl={(proxyUrl) => setPrefsState((p) => ({ ...p, proxyUrl }))}
              onUser={(proxyUser) => setPrefsState((p) => ({ ...p, proxyUser }))}
              onPass={(proxyPass) => setPrefsState((p) => ({ ...p, proxyPass }))}
              onSave={() => setPrefs({ proxyUrl: prefs.proxyUrl, proxyUser: prefs.proxyUser, proxyPass: prefs.proxyPass })}
              onTest={() => setProxyTest(demoCopy("演示：直连与代理出口相同 · 127.0.0.1", "Demo: direct and proxy egress match · 127.0.0.1"))}
            />
          )}
        </div>
        {nRows.github && (
          <>
            <Label en="GitHub" />
            <div className="list prefs" id="githubList">
              <PrefRow
                name={t("GitHub token")}
                sub={t("The library checks skills for updates with it: GitHub allows 5,000 requests an hour with a token, 60 without. It also installs skills from private repositories it can read; for public ones it needs no scopes.")}
                className="github-token"
              >
                <input
                  className="words github-token-input"
                  type="password"
                  value={prefs.githubToken}
                  placeholder="ghp_… / github_pat_…"
                  aria-label={t("GitHub token")}
                  onChange={(e) => setPrefsState((p) => ({ ...p, githubToken: e.target.value }))}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") setPrefs({ githubToken: prefs.githubToken.trim() });
                  }}
                  style={{ width: 160 }}
                />
                <button
                  type="button"
                  className="link"
                  onClick={() => window.open("https://github.com/settings/tokens/new?description=magpie", "_blank", "noopener")}
                >
                  {t("Create one ↗")}
                </button>
                <button
                  type="button"
                  className="text"
                  onClick={() => {
                    const v = prefs.githubToken.trim();
                    if (!v) return;
                    setPrefs({ githubToken: v }, t("Saved"));
                  }}
                >
                  {t("Save")}
                </button>
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
                <LanAddressRow
                  port={prefs.port}
                  protocol={prefs.lanProtocol}
                  selected={prefs.lanSelectedURL}
                  onProtocol={(lanProtocol) => setPrefs({ lanProtocol })}
                  onSelect={(lanSelectedURL) => setPrefs({ lanSelectedURL })}
                  onStatus={onStatus}
                />
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
            <SideModelPick
              value={prefs.vision}
              onChange={(vision) => setPrefs({ vision })}
              autoNote={t("no model that sees")}
              offNote={t("images turned away")}
            />
          </PrefRow>
          <PrefRow
            name={t("Image generation")}
            sub={
              prefs.imageGen === "off"
                ? t("Agents given Magpie Image can't generate images or videos: the tool says it is off")
                : t("The model Magpie Image draws with. Agents get the Magpie Image tool from the Library; images are saved in their project")
            }
          >
            <SideModelPick
              value={prefs.imageGen}
              onChange={(imageGen) => setPrefs({ imageGen })}
              autoNote={t("no model that draws")}
              offNote={t("tool says it is off")}
            />
          </PrefRow>
          {prefs.imageGen !== "off" ? (
            <div className="row pref">
              <div className="who">
                <div className="sub image-gen-how">
                  <button type="button" className="link image-gen-tool" onClick={() => onStatus?.(demoCopy("演示：打开 Plugins › Built-in › Library", "Demo: open Plugins › Built-in › Library"), "ok")}>
                    {t("Turn on the Library")}
                  </button>
                </div>
              </div>
              <div className="val" />
            </div>
          ) : null}
          <PrefRow name={t("Image recognition MCP server")} sub={t("Agents can add image recognition as an MCP server (Streamable HTTP) with one analyze_image tool, which reads an image with the Image recognition model from a file path, a URL or a data URL. From another computer, send a gateway key as Authorization: Bearer <key> and the image as a URL or data URL.")}>
            <code>{`http://${GATEWAY_ADDR}/mcp/magpie/vision`}</code>
            <CopyBtn text={`http://${GATEWAY_ADDR}/mcp/magpie/vision`} what={t("Address")} onStatus={onStatus} />
          </PrefRow>
        </div>
        <Label en="Web search" />
        <div className="list prefs" id="searchList">
          <PrefRow
            name={t("Searches for other models")}
            sub={
              prefs.webSearch === "off"
                ? t("When provider search is off, only configured Search APIs are used. Without a Search API, magpie does not add a search tool. Providers' native web search is unchanged.")
                : t("When a model can't search the web directly, the selected provider searches for it and returns the results.")
            }
          >
            <SideModelPick
              value={prefs.webSearch}
              onChange={(webSearch) => setPrefs({ webSearch })}
              autoNote={t("no provider that searches")}
              offNote={t("Search APIs")}
            />
          </PrefRow>
          <SearchApisBlock
            apis={prefs.searchAPIs}
            onChange={(searchAPIs) => setPrefs({ searchAPIs })}
            onStatus={onStatus}
          />
          <PrefRow name={t("MCP server")} sub={t("Cursor, Claude Desktop and other agents can add this search as an MCP server (Streamable HTTP) with one web_search tool. From another computer, send a gateway key as Authorization: Bearer <key>.")}>
            <code>{`http://${GATEWAY_ADDR}/mcp/magpie/web-search`}</code>
            <CopyBtn text={`http://${GATEWAY_ADDR}/mcp/magpie/web-search`} what={t("Address")} onStatus={onStatus} />
          </PrefRow>
        </div>
        <Label en="Replies" />
        <div className="list prefs" id="replyList">
          <PrefRow
            name={t("Name the member in replies")}
            sub={t("A reply's model says magpie's provider/model that answered (workbuddy/glm-5.3-flash), not the vendor's own name, for agents that count usage by it. Claude Code, Claude Desktop and Codex keep the vendor's; the X-Magpie-Model header says it to every agent")}
            id="memberModelRow"
          >
            <Segs
              value={prefs.memberModel ? "on" : "off"}
              onChange={(v) => setPrefs({ memberModel: v === "on" })}
              items={[{ id: "off", label: t("Off") }, { id: "on", label: t("On") }]}
            />
          </PrefRow>
          <PrefRow
            name={t("Stop looping replies")}
            sub={t("A reply whose reasoning or text goes round the same few lines is ended with an error the agent can retry, not left to run to its output limit")}
            id="loopGuardRow"
            className="wraps"
          >
            <Segs
              value={prefs.noLoopGuard ? "off" : "on"}
              onChange={(v) => setPrefs({ noLoopGuard: v === "off" })}
              items={[{ id: "off", label: t("Off") }, { id: "on", label: t("On") }]}
            />
          </PrefRow>
          <PrefRow
            name={t("Ask again after a refusal")}
            sub={t("When a vendor's safety filter refuses a request before anything is said, how many more accounts or routing group members are asked. Never ask again hands the refusal straight back: Claude Code then switches to its own fallback model, as it does on Anthropic's API")}
            id="refusalRetriesRow"
            className="wraps"
          >
            <Segs
              value={prefs.refusalRetries}
              onChange={(v) => setPrefs({ refusalRetries: v })}
              items={[
                { id: "0", label: t("Never ask again") },
                { id: "1", label: "1" },
                { id: "2", label: "2" },
                { id: "3", label: "3" },
                { id: "", label: t("All") },
              ]}
            />
          </PrefRow>
        </div>
        <Label en="Disabled models" />
        <div className="list prefs" id="disabledModelsList">
          <DisableModelsBlock
            models={prefs.disabledModels}
            onChange={(disabledModels) => setPrefs({ disabledModels })}
          />
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
          <PrefRow name={t("Mask secrets")} sub={t("API keys, private keys, tokens and passwords go to vendors as placeholders, and come back as they were")}>
            <Segs value={prefs.redactKeys ? "on" : "off"} onChange={(v) => setPrefs({ redactKeys: v === "on" })} items={[{ id: "off", label: t("Off") }, { id: "on", label: t("On") }]} />
          </PrefRow>
          <PrefRow name={t("Mask personal data")} sub={t("Emails, phone numbers, ID and bank card numbers too")}>
            <Segs
              value={prefs.redactPersonal ? "on" : "off"}
              onChange={(v) =>
                setPrefs({
                  redactPersonal: v === "on",
                  hideAccounts: v === "on" ? true : prefs.hideAccounts,
                })
              }
              items={[{ id: "off", label: t("Off") }, { id: "on", label: t("On") }]}
            />
          </PrefRow>
          {prefs.redactPersonal
            ? REDACT_KINDS.map(([id, name, sub, defOn]) => {
                const on = prefs.redactKinds[id] ?? defOn;
                return (
                  <div className="row pref redact-kind" key={id} data-redact={id} style={{ animation: "fade-in .2s var(--ease)" }}>
                    <div className="who">
                      <div className="name">{t(name)}</div>
                      <div className="sub">{t(sub)}</div>
                    </div>
                    <div className="val">
                      <Segs
                        value={on ? "on" : "off"}
                        onChange={(v) =>
                          setPrefs({
                            redactKinds: { ...prefs.redactKinds, [id]: v === "on" },
                          })
                        }
                        items={[{ id: "off", label: t("Off") }, { id: "on", label: t("On") }]}
                      />
                    </div>
                  </div>
                );
              })
            : null}
          <PrefRow name={t("Hide accounts")} sub={t("Email addresses and account names on Usage and Routing are blurred, for a screenshot to share")}>
            <Segs value={prefs.hideAccounts ? "on" : "off"} onChange={(v) => setPrefs({ hideAccounts: v === "on" })} items={[{ id: "off", label: t("Off") }, { id: "on", label: t("On") }]} />
          </PrefRow>
          <PrefRow name={t("Masked words")} sub={t("Your own words to keep from vendors, separated by commas")}>
            <input
              className="words"
              value={prefs.redactWords}
              placeholder={t("names, codenames, hosts")}
              aria-label={t("Masked words")}
              onChange={(e) => setPrefsState((p) => ({ ...p, redactWords: e.target.value }))}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  const v = (e.target as HTMLInputElement).value
                    .split(/[,，\n]/)
                    .map((w) => w.trim())
                    .filter(Boolean)
                    .join(", ");
                  setPrefs({ redactWords: v });
                  (e.target as HTMLInputElement).blur();
                } else if (e.key === "Escape") {
                  (e.target as HTMLInputElement).value = prefs.redactWords;
                  setPrefsState((p) => ({ ...p, redactWords: prefs.redactWords }));
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onBlur={(e) => {
                const v = e.target.value
                  .split(/[,，\n]/)
                  .map((w) => w.trim())
                  .filter(Boolean)
                  .join(", ");
                if (v !== prefs.redactWords) setPrefs({ redactWords: v });
                else setPrefs({ redactWords: prefs.redactWords });
              }}
            />
          </PrefRow>
          <RedactRulesBlock rules={prefs.redactRules} onChange={(redactRules) => setPrefs({ redactRules })} />
          <PrefRow name={t("Count me as a user")} sub={t("Once a day, a random id for this computer with magpie's version and system")}>
            <Segs value={prefs.noStats ? "off" : "on"} onChange={(v) => setPrefs({ noStats: v === "off" })} items={[{ id: "off", label: t("Off") }, { id: "on", label: t("On") }]} />
          </PrefRow>
          {!prefs.noStats ? (
            <PrefRow name={t("Share the agents, providers and models I use")} sub={t("Sent with that event, by magpie's own ids, with how many of each, and how often each partner was shown, opened and added; a provider you added yourself is only “custom”. No names, addresses, accounts, keys or usage")}>
              <Segs value={prefs.noUsageStats ? "off" : "on"} onChange={(v) => setPrefs({ noUsageStats: v === "off" })} items={[{ id: "off", label: t("Off") }, { id: "on", label: t("On") }]} />
            </PrefRow>
          ) : null}
        </div>
        <Label en="Agents' sign-ins" />
        <div className="list prefs" id="discoveryList">
          <PrefRow
            name={t("Subscription accounts")}
            sub={t("Read the accounts your agents are signed in to (Claude Code, Codex, Copilot, Cursor and others: their files and the Keychain) and serve them. Off, magpie reads none of them; API-key providers work as before")}
          >
            <Segs
              value={prefs.discovery === "off" ? "off" : "on"}
              onChange={(v) => {
                if (v === "off" && prefs.discovery !== "off") {
                  const ok = window.confirm(
                    t("Turn off subscription accounts?") +
                      "\n\n" +
                      t("Every subscription stops working in magpie until this is on again: magpie reads none of the sign-ins they come from. API-key providers work as before."),
                  );
                  if (!ok) return;
                }
                setPrefs({ discovery: v as DemoPrefs["discovery"] });
              }}
              items={[{ id: "off", label: t("Off") }, { id: "on", label: t("On") }]}
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
        hidden={!otelFeatureOn() || pageHidden("otel", oAny)}
      >
        <OtelFull
          config={{ ...prefs.otelCfg, enabled: prefs.otel || prefs.otelCfg.enabled, endpoint: prefs.otelEndpoint || prefs.otelCfg.endpoint }}
          onChange={(otelCfg) => setPrefs({ otelCfg, otel: otelCfg.enabled, otelEndpoint: otelCfg.endpoint })}
        />
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
            name={t(prefs.syncOn ? (prefs.syncKind === "s3" ? "S3 sync" : prefs.syncKind === "github" ? "GitHub sync" : "WebDAV sync") : "WebDAV, S3 or GitHub sync")}
            sub={
              prefs.syncOn
                ? t("Not synced yet · {host}", { host: "demo.example.com" })
                : t("Keeps {parts} the same on every computer", {
                    parts:
                      t("providers with their API keys") +
                      t(", ") +
                      t("settings") +
                      t(", ") +
                      t("profiles") +
                      t(", ") +
                      t("agents' models") +
                      t(", ") +
                      t("library"),
                  })
            }
            subTitle={t("Keeps providers with their API keys, settings, profiles, agents' models, library the same on every computer")}
          >
            {prefs.syncOn ? (
              <>
                <button type="button" className="text" onClick={() => onStatus?.(demoCopy("演示：已触发同步", "Demo: sync triggered"), "ok")}>{t("Sync now")}</button>
                <button type="button" className="text" onClick={() => setPrefs({ syncOpen: prefs.syncOpen === "dav" ? "" : "dav" }, " ")}>{t(prefs.syncOpen === "dav" ? "Close" : "Edit")}</button>
              </>
            ) : (
              <button type="button" className="text" onClick={() => setPrefs({ syncOpen: prefs.syncOpen === "dav" ? "" : "dav" }, " ")}>{t(prefs.syncOpen === "dav" ? "Close" : "Set up")}</button>
            )}
          </PrefRow>
          {prefs.syncOpen === "dav" ? (
            <SyncForms
              open="dav"
              kind={prefs.syncKind}
              onKind={(syncKind) => setPrefs({ syncKind })}
              onClose={() => setPrefs({ syncOpen: "" }, " ")}
              onSave={() => setPrefs({ syncOn: true, syncOpen: "" })}
              onOff={prefs.syncOn ? () => setPrefs({ syncOn: false, syncOpen: "" }) : undefined}
              onStatus={onStatus}
            />
          ) : null}
          {prefs.syncOn ? (
            <>
              <PrefRow name={t("Sync by itself")} sub={prefs.syncAuto ? t("Every {n} minutes while magpie runs", { n: prefs.syncAuto }) : t("Off: only Sync now syncs")}>
                <Segs value={prefs.syncAuto} onChange={(m) => setPrefs({ syncAuto: Number(m) })} items={[{ id: 0, label: t("Off") }, { id: 3, label: t("3 min") }, { id: 15, label: t("15 min") }, { id: 30, label: t("30 min") }, { id: 60, label: t("1 hour") }]} />
              </PrefRow>
              <PrefRow name={t("Restore from the server")} sub={t("This computer's setup becomes the one on the server. What is here now is kept first, to undo.")}>
                <button type="button" className="text" onClick={() => setRestoreOpen(true)}>{t("Restore…")}</button>
              </PrefRow>
            </>
          ) : null}
          <PrefRow name={t("Export")} sub={t("Everything above in one file, sealed with a passphrase, to carry to another computer")}>
            <button type="button" className="text" onClick={() => setPrefs({ syncOpen: prefs.syncOpen === "export" ? "" : "export" }, " ")}>{t(prefs.syncOpen === "export" ? "Close" : "Export…")}</button>
          </PrefRow>
          {prefs.syncOpen === "export" ? (
            <SyncForms open="export" kind={prefs.syncKind} onKind={(syncKind) => setPrefs({ syncKind })} onClose={() => setPrefs({ syncOpen: "" }, " ")} onSave={() => {}} onStatus={onStatus} />
          ) : null}
          <PrefRow name={t("Import")} sub={t("Bring in a file exported from magpie")}>
            <button type="button" className="text" onClick={() => setPrefs({ syncOpen: prefs.syncOpen === "import" ? "" : "import" }, " ")}>{t(prefs.syncOpen === "import" ? "Close" : "Import…")}</button>
          </PrefRow>
          {prefs.syncOpen === "import" ? (
            <SyncForms open="import" kind={prefs.syncKind} onKind={(syncKind) => setPrefs({ syncKind })} onClose={() => setPrefs({ syncOpen: "" }, " ")} onSave={() => {}} onStatus={onStatus} />
          ) : null}
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
          <AboutVersionRow current={DEMO_APP_VERSION} downloaded="0.1.1244" onStatus={onStatus} />
          <PrefRow name={t("What's new")} sub={t("The release notes since the last update")} className="whatsnew-row">
            <button type="button" className="text" onClick={() => setWhatsNewOpen(true)}>
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
                { id: 30, label: t("{n} min", { n: 30 }) },
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
          <UpdateMirrorRow
            mirror={prefs.updateMirror}
            onChange={(updateMirror) => setPrefs({ updateMirror })}
            onStatus={onStatus}
          />
          <PrefRow name={t("Config folder")} sub={t("providers, profiles and these settings")}>
            <code title="~/.config/magpie">~/.config/magpie</code>
            <CopyBtn text="~/.config/magpie" what={t("Path")} onStatus={onStatus} />
            <button type="button" className="text" onClick={() => onStatus?.(demoCopy("演示：未点 Open", "Demo: Open not clicked"), "warn")}>
              {t("Open")}
            </button>
          </PrefRow>
          <CliRow />
          <PrefRow name={t("Gateway URL")} sub={t("the address every agent is pointed at")}>
            <code>{`http://${GATEWAY_ADDR}`}</code>
            <CopyBtn text={`http://${GATEWAY_ADDR}`} what={t("Gateway URL")} onStatus={onStatus} />
          </PrefRow>
          <PrefRow name={t("Community")} sub={t("questions, ideas and feedback, on Discord or GitHub")}>
            <button
              type="button"
              className="discord"
              title="discord.gg/vGSnD3ZKQF"
              onClick={(e) => {
                // NOTES 104: tip only — not opened
                e.preventDefault();
              }}
            >
              <span>{t("Join Discord")}</span>
            </button>
            <button
              type="button"
              className="github"
              title="github.com/yetone/magpie"
              onClick={(e) => {
                // NOTES 106: tip only — not opened
                e.preventDefault();
              }}
            >
              <span>GitHub</span>
            </button>
          </PrefRow>
          <PrefRow name={t("About")} sub={demoCopy("magpie-shell-demo · 非官方 Magpie 壳", "magpie-shell-demo · not official Magpie")} />
        </div>
      </section>
    </main>
      {restoreOpen ? (
        <RestoreModal
          onClose={() => setRestoreOpen(false)}
          onConfirm={() => {
            setRestoreOpen(false);
            onStatus?.(demoCopy("演示：已从服务器恢复", "Demo: restored from server"), "ok");
          }}
        />
      ) : null}
      {whatsNewOpen ? <WhatsNewModal onClose={() => setWhatsNewOpen(false)} /> : null}
    </>
  );
}
