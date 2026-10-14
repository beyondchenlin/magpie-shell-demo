import { useState } from "react";
import { Segs } from "../components/Segs";
import { demoCopy, t } from "../i18n";

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

  return (
    <main className="view" id="view-usage">
      <div className="usage-head" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <Segs
          value={period}
          onChange={setPeriod}
          items={USAGE_PERIODS.map(([id, en]) => ({ id, label: t(en) }))}
        />
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
        <Segs
          value={tab}
          onChange={(v) => setTab(v as (typeof USAGE_TABS)[number])}
          items={USAGE_TABS.map((en) => ({ id: en, label: t(en) }))}
        />
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

const PLUGIN_TABS = ["Discover", "Installed"] as const;

export function PluginsView() {
  const [tab, setTab] = useState<(typeof PLUGIN_TABS)[number]>("Discover");
  return (
    <main className="view" id="view-plugins">
      <div className="row-head pm-head">
        <Segs
          value={tab}
          onChange={(v) => setTab(v as (typeof PLUGIN_TABS)[number])}
          items={PLUGIN_TABS.map((en) => ({ id: en, label: t(en) }))}
        />
      </div>
      <div className="list">
        <div className="empty-state" style={{ padding: "28px 18px" }}>
          {tab === "Discover"
            ? demoCopy(
                "订阅与网关中间件 — 演示市场未接线。",
                "Subscriptions and gateway middleware — demo market not wired.",
              )
            : demoCopy("尚未安装插件（演示）。", "No plugins installed (demo).")}
        </div>
      </div>
    </main>
  );
}
