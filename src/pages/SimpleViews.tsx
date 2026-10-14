import { useState } from "react";
import { useSegThumb } from "../components/SegThumb";
import { ZH } from "../data/mock";

export function GatewayView() {
  return (
    <main className="view" id="view-gateway">
      <div className="row-head">
        <span className="label">{ZH.gateway}</span>
      </div>
      <div className="list">
        <div className="row pref">
          <div className="who">
            <div className="name">Gateway running</div>
            <div className="sub">
              0 models · no agent routed through it yet · five APIs, one URL
            </div>
          </div>
          <div className="val">
            <code>http://127.0.0.1:3425</code>
          </div>
        </div>
        <div className="row pref">
          <div className="who">
            <div className="name">Restart gateway</div>
            <div className="sub">Demo shell · no real gateway process</div>
          </div>
          <div className="val">
            <button type="button" className="text" disabled>
              Restart
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export function UsageView() {
  return (
    <main className="view" id="view-usage">
      <div className="usage-head">
        <div className="segs">
          <button type="button" className="on">
            Overview
          </button>
          <button type="button">Requests</button>
          <button type="button">Sessions</button>
          <button type="button">Context</button>
        </div>
      </div>
      <div className="usage-pane">
        <p className="note" style={{ padding: "12px 4px", color: "var(--muted)" }}>
          No calls today. Point an agent at a catalog model and use it…
        </p>
      </div>
    </main>
  );
}

export function PluginsView() {
  return (
    <main className="view" id="view-plugins">
      <div className="row-head">
        <span className="label">Discover</span>
      </div>
      <p className="note" style={{ padding: "12px 4px", color: "var(--muted)" }}>
        Subscriptions and gateway middleware — demo market not wired. Native
        gold: interactions/native-linux/shots/N-05-plugins.png
      </p>
    </main>
  );
}

const SET_TABS = [
  { id: "general", label: "General" },
  { id: "usage", label: "Allowances" },
  { id: "network", label: "Network and sharing" },
  { id: "models", label: "Models" },
  { id: "privacy", label: "Privacy" },
  { id: "sync", label: "Sync and backup" },
  { id: "about", label: "About" },
] as const;

type SetTabId = (typeof SET_TABS)[number]["id"];

type SettingsProps = {
  theme: "system" | "light" | "dark";
  setTheme: (t: "system" | "light" | "dark") => void;
};

export function SettingsView({ theme, setTheme }: SettingsProps) {
  const [tab, setTab] = useState<SetTabId>("general");
  const setTabsBox = useSegThumb(tab);

  return (
    <main className="view" id="view-settings">
      <div className="row-head set-head">
        <div
          className="warm-tabs set-tabs"
          id="setTabs"
          role="tablist"
          aria-label="Settings"
          ref={setTabsBox}
        >
          {SET_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`setTab-${t.id}`}
              data-set={t.id}
              className={tab === t.id ? "on" : ""}
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          className="set-q words"
          type="search"
          placeholder="Find a setting"
          aria-label="Find a setting"
        />
      </div>

      {tab === "general" && (
        <div className="set-page" id="setPage-general" data-part="General">
          <div className="list prefs">
            <div className="row pref" id="themeRow">
              <div className="who">
                <div className="name">Appearance</div>
              </div>
              <div className="val">
                <span className="segs">
                  {(
                    [
                      ["system", "System"],
                      ["light", "Light"],
                      ["dark", "Dark"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={theme === id ? "on" : ""}
                      onClick={() => setTheme(id)}
                    >
                      {label}
                    </button>
                  ))}
                </span>
              </div>
            </div>
            <div className="row pref">
              <div className="who">
                <div className="name">Language</div>
              </div>
              <div className="val">
                <select className="pref-pick" defaultValue="system" disabled>
                  <option value="system">System</option>
                </select>
              </div>
            </div>
            <div className="row pref">
              <div className="who">
                <div className="name">Text size</div>
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
                <div className="name">About</div>
                <div className="sub">magpie-shell-demo · not official Magpie</div>
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
            {SET_TABS.find((t) => t.id === tab)?.label} — section shell only
            (native gold: N-06). Full prefs not wired yet.
          </p>
        </div>
      )}
    </main>
  );
}
