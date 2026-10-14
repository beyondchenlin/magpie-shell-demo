import { useState } from "react";
import { useSegThumb } from "../components/SegThumb";
import { demoCopy, t, type Lang } from "../i18n";

const USAGE_TABS = [
  "Overview",
  "Requests",
  "Sessions",
  "Context",
] as const;

const USAGE_PERIODS = [
  ["today", "Today"],
  ["7d", "7 days"],
  ["30d", "30 days"],
  ["all", "All"],
  ["custom", "Custom"],
] as const;

/** Empty Overview shell (official 05-usage). Tabs/period segs only — no ledger. */
export function UsageView() {
  const [tab, setTab] = useState<(typeof USAGE_TABS)[number]>("Overview");
  const [period, setPeriod] = useState<string>("today");
  const periodBox = useSegThumb(period);

  return (
    <main className="view" id="view-usage">
      <div className="usage-head" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <div className="segs" ref={periodBox} data-kind="usage-period">
          {USAGE_PERIODS.map(([id, en]) => (
            <button
              key={id}
              type="button"
              className={`opt${period === id ? " on" : ""}`}
              aria-pressed={period === id}
              onClick={() => setPeriod(id)}
            >
              {t(en)}
            </button>
          ))}
        </div>
        <span className="grow" />
        <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          ≈$0.000{" "}
          <span style={{ fontWeight: 500, color: "var(--muted)", fontSize: 12 }}>
            {t("effective prices")}
          </span>
        </span>
      </div>
      <p className="usage-note" id="usageScope">
        {t(
          "Gateway calls only; session-log calls are in Requests. Local rejections are excluded from totals.",
        )}
      </p>
      {/* Magpie put Overview/Requests/… in side-nav under Usage; demo keeps a compact segs for web/top */}
      <div className="row-head" style={{ marginTop: 4 }}>
        <div className="segs">
          {USAGE_TABS.map((en) => (
            <button
              key={en}
              type="button"
              className={`opt${tab === en ? " on" : ""}`}
              aria-pressed={tab === en}
              onClick={() => setTab(en)}
            >
              {t(en)}
            </button>
          ))}
        </div>
      </div>
      <div className="list">
        <div className="empty-state" style={{ padding: "28px 18px" }}>
          {tab === "Overview"
            ? (
              <>
                {t("No calls today.")}{" "}
                {t(
                  "Point an agent at a catalog model and use it; every call through the gateway is counted here.",
                )}
              </>
            )
            : (
              demoCopy(
                `${t(tab)} — 分区壳层（尚未接线）`,
                `${t(tab)} — section shell only (not wired yet)`,
              )
            )}
        </div>
      </div>
    </main>
  );
}

export function PluginsView() {
  return (
    <main className="view" id="view-plugins">
      <div className="row-head">
        <span className="label">{t("Discover")}</span>
      </div>
      <p className="note" style={{ padding: "12px 4px", color: "var(--muted)" }}>
        {demoCopy(
          "订阅与网关中间件 — 演示市场未接线。",
          "Subscriptions and gateway middleware — demo market not wired.",
        )}
      </p>
    </main>
  );
}

const SET_TABS = [
  { id: "general", en: "General" },
  { id: "usage", en: "Allowances" },
  { id: "network", en: "Network and sharing" },
  { id: "models", en: "Models" },
  { id: "privacy", en: "Privacy" },
  { id: "sync", en: "Sync and backup" },
  { id: "about", en: "About" },
] as const;

type SetTabId = (typeof SET_TABS)[number]["id"];

type SettingsProps = {
  theme: "system" | "light" | "dark";
  setTheme: (t: "system" | "light" | "dark") => void;
  lang: Lang;
  setLang: (l: Lang) => void;
};

export function SettingsView({ theme, setTheme, lang, setLang }: SettingsProps) {
  const [tab, setTab] = useState<SetTabId>("general");
  const setTabsBox = useSegThumb(tab);

  return (
    <main className="view" id="view-settings">
      <div className="row-head set-head">
        <div
          className="warm-tabs set-tabs"
          id="setTabs"
          role="tablist"
          aria-label={t("Settings")}
          ref={setTabsBox}
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
          className="set-q words"
          type="search"
          placeholder={t("Find a setting")}
          aria-label={t("Find a setting")}
        />
      </div>

      {tab === "general" && (
        <div className="set-page" id="setPage-general" data-part="General">
          <div className="list prefs">
            <div className="row pref" id="themeRow">
              <div className="who">
                <div className="name">{t("Appearance")}</div>
              </div>
              <div className="val">
                <span className="segs">
                  {(
                    [
                      ["system", "System"],
                      ["light", "Light"],
                      ["dark", "Dark"],
                    ] as const
                  ).map(([id, en]) => (
                    <button
                      key={id}
                      type="button"
                      className={theme === id ? "on" : ""}
                      onClick={() => setTheme(id)}
                    >
                      {t(en)}
                    </button>
                  ))}
                </span>
              </div>
            </div>
            <div className="row pref">
              <div className="who">
                <div className="name">{t("Language")}</div>
              </div>
              <div className="val">
                <select
                  className="pref-pick"
                  value={lang}
                  aria-label={t("Language")}
                  onChange={(e) => setLang(e.target.value as Lang)}
                >
                  <option value="zh">简体中文</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
            <div className="row pref">
              <div className="who">
                <div className="name">{t("Text size")}</div>
              </div>
              <div className="val">
                <span className="segs">
                  {["100%", "110%", "125%", "150%"].map((s, i) => (
                    <button
                      key={s}
                      type="button"
                      className={i === 1 ? "on" : ""}
                    >
                      {s}
                    </button>
                  ))}
                </span>
              </div>
            </div>
            <div className="row pref">
              <div className="who">
                <div className="name">{t("About")}</div>
                <div className="sub">
                  {demoCopy(
                    "magpie-shell-demo · 非官方 Magpie",
                    "magpie-shell-demo · not official Magpie",
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab !== "general" && (
        <div className="set-page" data-part={tab}>
          <p
            className="set-none"
            style={{ padding: "18px 4px", color: "var(--muted)" }}
          >
            {t(SET_TABS.find((x) => x.id === tab)!.en)}
            {" — "}
            {demoCopy("分区壳层（尚未接线）", "section shell only (not wired yet)")}
          </p>
        </div>
      )}
    </main>
  );
}
