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
            <div className="name">监听地址</div>
            <div className="sub">Demo 壳 · 无真实网关进程</div>
          </div>
          <div className="val">
            <code>127.0.0.1:3425</code>
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
            概览
          </button>
          <button type="button">请求</button>
          <button type="button">会话</button>
          <button type="button">上下文</button>
        </div>
      </div>
      <div className="usage-pane">
        <p className="note" style={{ padding: "12px 4px", color: "var(--muted)" }}>
          Demo：无用量数据。结构对齐 Magpie Usage 页签。
        </p>
      </div>
    </main>
  );
}

export function PluginsView() {
  return (
    <main className="view" id="view-plugins">
      <div className="row-head">
        <span className="label">插件</span>
      </div>
      <p className="note" style={{ padding: "12px 4px", color: "var(--muted)" }}>
        Demo：插件市场未接入。官方默认关闭的 Sessions / Library 作为插件出现，故侧栏不展示它们。
      </p>
    </main>
  );
}

type SettingsProps = {
  theme: "system" | "light" | "dark";
  setTheme: (t: "system" | "light" | "dark") => void;
};

export function SettingsView({ theme, setTheme }: SettingsProps) {
  return (
    <main className="view" id="view-settings">
      <div className="row-head">
        <span className="label">{ZH.settings}</span>
      </div>
      <div className="list prefs">
        <div className="row pref" id="themeRow">
          <div className="who">
            <div className="name">外观</div>
            <div className="sub">Demo 仅切换浅色 / 深色 token</div>
          </div>
          <div className="val">
            <span className="segs">
              {(
                [
                  ["light", "浅色"],
                  ["dark", "深色"],
                  ["system", "系统"],
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
            <div className="name">关于</div>
            <div className="sub">magpie-shell-demo · 非官方 Magpie</div>
          </div>
        </div>
      </div>
    </main>
  );
}
