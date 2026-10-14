export function SessionsView() {
  return (
    <main className="view" id="view-sessions">
      <div className="row-head">
        <span className="label">会话</span>
        <span className="note">Demo 占位 · 非真实 session 扫描</span>
      </div>
      <div className="list">
        {["claude-code · 今早重构", "codex · PR review", "cursor · PackGate PRD"].map((t) => (
          <div className="row" key={t}>
            <div className="who">
              <div className="name">{t}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>mock</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export function LibraryView() {
  return (
    <main className="view" id="view-library">
      <div className="row-head">
        <span className="label">资源库</span>
        <span className="note">Demo 占位</span>
      </div>
      <p className="usage-note">提示词、片段与共享资源会列在这里（本壳未接后端）。</p>
    </main>
  );
}

export function GatewayView() {
  return (
    <main className="view" id="view-gateway">
      <div className="row-head">
        <span className="label">网关</span>
        <span className="rt-livedot" aria-hidden="true" />
        <span className="note">OpenAI 兼容 · mock</span>
      </div>
      <section className="rt" style={{ padding: 16 }}>
        <div className="rt-top">
          <div className="rt-what">
            本地入口：<b>http://127.0.0.1:8787/v1</b>
          </div>
          <p className="rt-mode">Agent 把 Base URL 指到这里；路由页决定落到哪个供应商账号。本 Demo 不监听端口。</p>
        </div>
        <div className="list" style={{ marginTop: 12 }}>
          <div className="row">
            <div className="who" style={{ flex: 1 }}>
              <div className="name">状态</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>演示模式 · 未启动进程</div>
            </div>
            <span className="chip on">idle</span>
          </div>
          <div className="row">
            <div className="who" style={{ flex: 1 }}>
              <div className="name">网关密钥</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>局域网共享关闭时本机 Agent 不需要密钥</div>
            </div>
            <button type="button" className="text">
              ＋ 添加
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export function UsageView() {
  return (
    <main className="view" id="view-usage">
      <div className="usage-head">
        <div className="segs" id="usageTab">
          <button type="button" className="on">
            概览
          </button>
          <button type="button">请求</button>
          <button type="button">额度</button>
        </div>
        <div className="segs" id="period">
          <button type="button" className="on">
            7 天
          </button>
          <button type="button">30 天</button>
        </div>
        <span className="grow" />
        <span className="usage-cost" id="usageCost">
          ≈ $12.40
        </span>
      </div>
      <div className="usage-pane" id="usagePane">
        <section className="stats" id="stats">
          {[
            ["请求", "1,284"],
            ["改道", "47"],
            ["错误", "3"],
            ["Token", "4.2M"],
          ].map(([k, v]) => (
            <div key={k} style={{ background: "var(--card)", padding: "14px 16px" }}>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{k}</div>
              <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </section>
        <p className="usage-note">仅网关调用；会话日志中的调用在「请求」。本地拒绝不计入合计。（Demo 数字）</p>
        <div className="row-head">
          <span className="label">Agent</span>
        </div>
        <div className="list" id="usageAgents">
          {["Claude Code", "Codex", "Cursor"].map((n) => (
            <div className="row" key={n}>
              <div className="who" style={{ flex: 1 }}>
                <div className="name">{n}</div>
              </div>
              <span className="note">mock</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export function PluginsView() {
  return (
    <main className="view" id="view-plugins">
      <div className="row-head">
        <span className="label">插件</span>
        <span className="note">Demo 占位</span>
      </div>
      <div className="list">
        {["Sessions", "Library"].map((n) => (
          <div className="row" key={n}>
            <div className="who" style={{ flex: 1 }}>
              <div className="name">{n}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>内置插件壳</div>
            </div>
            <span className="chip on">已装</span>
          </div>
        ))}
      </div>
    </main>
  );
}

export function SettingsView({
  theme,
  setTheme,
}: {
  theme: "system" | "light" | "dark";
  setTheme: (t: "system" | "light" | "dark") => void;
}) {
  return (
    <main className="view" id="view-settings">
      <div className="row-head">
        <span className="label">设置</span>
      </div>
      <div className="list">
        <div className="row">
          <div className="who" style={{ flex: 1 }}>
            <div className="name">主题</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>与 Magpie data-theme 一致</div>
          </div>
          <div className="segs">
            {(
              [
                ["system", "跟随"],
                ["light", "浅色"],
                ["dark", "深色"],
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
          </div>
        </div>
        <div className="row">
          <div className="who" style={{ flex: 1 }}>
            <div className="name">语言</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>本 Demo 固定中文（对照 i18n.js zh）</div>
          </div>
        </div>
        <div className="row">
          <div className="who" style={{ flex: 1 }}>
            <div className="name">关于</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
              Magpie 视觉壳 Demo · 非官方 · CSS 源自 yetone/magpie（MIT）
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
