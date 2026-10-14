import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "../i18n";

/**
 * Magpie Library plugin (native-linux/library 01–13).
 * Feature-gated: Plugins › Built-in › Library.
 * Motion: view-in .24s; set chevron .15s; lib-switch; Discover cards fade-in.
 */

const LIB_TABS = [
  ["instructions", "Instructions"],
  ["mcp", "MCP servers"],
  ["skills", "Skills"],
  ["hooks", "Hooks"],
  ["rtk", "RTK"],
] as const;

type InstSet = { id: string; name: string; body: string; inUse: boolean; file?: string };

const DOC = "M4 2.5h5.5L12 5v8.5H4z M9.5 2.5V5H12";
const FOLDER = "M2.5 4.5h4l1.2 1.3h5.8v6.7h-11z";
const BACKUP = "M3.2 8a4.8 4.8 0 1 0 1.4-3.4 M2.8 2.6v2.4h2.4 M8 5.3V8l1.9 1.2";
const SEARCH = "M7 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M10 10l3 3";

const DEMO_MCP = [
  { id: "magpie-image", name: "Magpie Image", by: "Magpie", tag: "magpie", desc: "Generate and edit images with the image model set in Magpie (Settings → Images)…", addDots: true },
  { id: "context7", name: "Context7", by: "Upstash", tag: "Remote", desc: "Up-to-date documentation and code examples for any library, straight into the…" },
  { id: "playwright", name: "Playwright", by: "Microsoft", tag: "npx", desc: "Drive a real browser: open pages, click, type and read them through the accessibility tree." },
  { id: "chrome-devtools", name: "Chrome DevTools", by: "Google", tag: "npx", desc: "Control and inspect a live Chrome: console, network, performance traces…" },
  { id: "github", name: "GitHub", by: "GitHub", tag: "Remote", desc: "Repositories, issues, pull requests, Actions and code search on GitHub.", addDots: true },
  { id: "deepwiki", name: "DeepWiki", by: "Cognition", tag: "Remote", desc: "Ask questions about any public GitHub repository and read its generated wiki." },
  { id: "exa", name: "Exa", by: "Exa", tag: "Remote", desc: "Web search and contents for agents via Exa." },
  { id: "fetch", name: "Fetch", by: "Model Context Protocol", tag: "npx", desc: "Fetch URL contents as markdown for the model." },
  { id: "sentry", name: "Sentry", by: "Sentry", tag: "Remote", desc: "Issues and performance from your Sentry projects." },
  { id: "stripe", name: "Stripe", by: "Stripe", tag: "Remote", desc: "Payments, customers and products through Stripe." },
  { id: "neon", name: "Neon", by: "Neon", tag: "Remote", desc: "Serverless Postgres: branches, SQL and connection strings." },
  { id: "brave", name: "Brave Search", by: "Brave", tag: "Remote", desc: "Web search with the Brave Search API." },
];

export function LibraryView({ onStatus }: { onStatus?: (msg: string, kind?: string) => void }) {
  const [tab, setTab] = useState<string>(() => {
    try {
      return localStorage.getItem("magpie.libTab") || "instructions";
    } catch {
      return "instructions";
    }
  });
  const [sets, setSets] = useState<InstSet[]>([{ id: "default", name: "Default", body: "", inUse: true }]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [addingSet, setAddingSet] = useState(false);
  const [newName, setNewName] = useState("");
  const [fileMode, setFileMode] = useState(false);
  const [filePath, setFilePath] = useState("~/.agents/AGENTS.md");
  const [mcpServers, setMcpServers] = useState<{ id: string; name: string }[]>([]);
  const [mcpQ, setMcpQ] = useState("");
  const [addingServer, setAddingServer] = useState(false);
  const [serverJson, setServerJson] = useState("");
  const newNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem("magpie.libTab", tab);
    } catch {
      /* */
    }
  }, [tab]);

  useEffect(() => {
    if (addingSet) newNameRef.current?.focus({ preventScroll: true });
  }, [addingSet]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty) {
          setDirty(false);
          onStatus?.(t("Instructions saved"), "ok");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, onStatus]);

  const openSet = sets.find((s) => s.id === openId);
  const mcpHits = useMemo(() => {
    const q = mcpQ.trim().toLowerCase();
    if (!q) return DEMO_MCP;
    return DEMO_MCP.filter((c) => `${c.name} ${c.by} ${c.tag} ${c.desc}`.toLowerCase().includes(q));
  }, [mcpQ]);

  const addSet = () => {
    const name = newName.trim() || t("New set");
    const id = `set-${Date.now()}`;
    setSets((list) => [...list, { id, name, body: "", inUse: false, file: fileMode ? filePath.trim() || undefined : undefined }]);
    setOpenId(id);
    setAddingSet(false);
    setNewName("");
    setFileMode(false);
    setFilePath("~/.agents/AGENTS.md");
    setDirty(true);
    onStatus?.(t("{name} added", { name }), "ok");
  };

  return (
    <main className="view" id="view-library" style={{ animation: "view-in .24s var(--ease)" }}>
      <div className="lib-head row-head" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="lib-tabs" role="tablist" aria-label={t("Library")} style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {LIB_TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`opt${tab === id ? " on" : ""}`}
              onClick={() => setTab(id)}
              style={{
                height: 28,
                padding: "0 12px",
                borderRadius: 999,
                border: "1px solid var(--line)",
                background: tab === id ? "var(--card)" : "transparent",
                color: tab === id ? "var(--fg)" : "var(--muted)",
                font: "inherit",
                fontSize: 12.5,
                cursor: "pointer",
                transition: "color .15s, background .15s, border-color .15s",
              }}
            >
              {t(label)}
            </button>
          ))}
        </div>
        <span className="grow" />
        {tab === "mcp" ? (
          <button
            type="button"
            className="text"
            title={t("Go to the MCP servers you can add, under the list")}
            onClick={() => document.getElementById("libDiscover")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden style={{ marginRight: 4, verticalAlign: -2 }}>
              <path d={SEARCH} />
            </svg>
            {t("Discover")}
          </button>
        ) : null}
        <button type="button" className="text" onClick={() => onStatus?.(t("Demo: open library folder"), "ok")}>
          <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden style={{ marginRight: 4, verticalAlign: -2 }}>
            <path d={FOLDER} />
          </svg>
          {t("Library folder")}
        </button>
        <button type="button" className="text" onClick={() => onStatus?.(t("Demo: library backups"), "ok")}>
          <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden style={{ marginRight: 4, verticalAlign: -2 }}>
            <path d={BACKUP} />
          </svg>
          {t("Backups")}
        </button>
      </div>

      <div className="lib-body" style={{ padding: "8px 4px 24px" }}>
        {tab === "instructions" ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <b style={{ display: "block", fontSize: 14 }}>{t("Instructions")}</b>
              <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
                {t("Write it once: every agent switched on below reads it before each conversation, in its own instructions file.")}
              </p>
            </div>

            <div className="card" style={{ padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 12 }}>
              <div className="row-head" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
                  <path d={DOC} />
                </svg>
                <b style={{ fontSize: 13 }}>{t("Shared instructions")}</b>
                <span className="grow" />
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("Markdown · Ctrl+S")}</span>
              </div>

              {sets.map((s) => {
                const open = openId === s.id;
                return (
                  <div key={s.id} style={{ borderTop: "1px solid var(--line)", padding: "10px 0" }}>
                    <button
                      type="button"
                      className="text"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        textAlign: "left",
                        padding: "4px 2px",
                        background: "transparent",
                        border: 0,
                        cursor: "pointer",
                        font: "inherit",
                      }}
                      onClick={() => setOpenId(open ? null : s.id)}
                      aria-expanded={open}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          border: `2px solid ${s.inUse ? "var(--accent)" : "var(--line)"}`,
                          boxShadow: s.inUse ? "inset 0 0 0 3px var(--card)" : undefined,
                          background: s.inUse ? "var(--accent)" : "transparent",
                          flex: "none",
                        }}
                      />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ display: "block", fontSize: 13, fontWeight: 560 }}>{s.name}</b>
                        <small style={{ color: "var(--muted)" }}>
                          {s.file ? t("Your file") : s.body.trim() ? t("{n} characters", { n: s.body.length }) : t("Empty")}
                        </small>
                      </span>
                      {s.inUse ? (
                        <span style={{ fontSize: 11, fontWeight: 560, padding: "1px 8px", borderRadius: 999, border: "1px solid var(--line)", color: "var(--fg-2)" }}>
                          {t("In use")}
                        </span>
                      ) : null}
                      <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s var(--ease)", color: "var(--muted)" }}>
                        <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                    {open ? (
                      <div style={{ marginTop: 8, display: "grid", gap: 8, animation: "fade-in .18s var(--ease)" }}>
                        {s.file ? (
                          <div className="note" style={{ fontSize: 12, color: "var(--muted)" }}>
                            {t("Kept in")} <code>{s.file}</code>
                          </div>
                        ) : null}
                        <input
                          type="text"
                          value={s.name}
                          aria-label={t("Set name")}
                          onChange={(e) => {
                            const name = e.target.value;
                            setSets((list) => list.map((x) => (x.id === s.id ? { ...x, name } : x)));
                            setDirty(true);
                          }}
                          style={{ maxWidth: 220 }}
                        />
                        <textarea
                          rows={6}
                          value={s.body}
                          placeholder={t("What every agent should know — how you like code written, the stack you work in, the commands that run your tests…")}
                          onChange={(e) => {
                            const body = e.target.value;
                            setSets((list) => list.map((x) => (x.id === s.id ? { ...x, body } : x)));
                            setDirty(true);
                          }}
                          style={{
                            width: "100%",
                            resize: "vertical",
                            minHeight: 120,
                            font: "inherit",
                            fontSize: 13,
                            lineHeight: 1.45,
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid var(--line)",
                            background: "var(--bg)",
                            color: "var(--fg)",
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {addingSet ? (
                <div style={{ marginTop: 10, display: "grid", gap: 8, animation: "pop-in .28s var(--ease)" }}>
                  <input
                    ref={newNameRef}
                    type="text"
                    value={newName}
                    placeholder={t("Name, e.g. Work")}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") addSet();
                      if (e.key === "Escape") {
                        setAddingSet(false);
                        setFileMode(false);
                      }
                    }}
                  />
                  {fileMode ? (
                    <input
                      type="text"
                      value={filePath}
                      placeholder={t("Full path of a Markdown file")}
                      onChange={(e) => setFilePath(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  ) : null}
                  <div className="bar" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button type="button" className="text" onClick={() => setFileMode((v) => !v)}>
                      {t("Keep in a file…")}
                    </button>
                    <span className="grow" />
                    <button
                      type="button"
                      className="text"
                      onClick={() => {
                        setAddingSet(false);
                        setFileMode(false);
                        setNewName("");
                      }}
                    >
                      {t("Cancel")}
                    </button>
                    <button type="button" className="text primary" onClick={addSet}>
                      {t("Add")}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="rt-gadd" style={{ marginTop: 8 }} onClick={() => setAddingSet(true)}>
                  <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                    <path d="M8 3.5v9M3.5 8h9" />
                  </svg>
                  <span>{t("New set")}</span>
                </button>
              )}
            </div>

            <div style={{ marginTop: 22 }}>
              <div className="row-head" style={{ marginBottom: 6 }}>
                <span className="label" style={{ letterSpacing: ".04em", fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                  {t("AGENTS")}
                </span>
              </div>
              <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
                {t("They read {name} · magpie writes its part between two marker lines — the rest of each file stays yours.", {
                  name: openSet?.name || "Default",
                })}
              </p>
              <div className="card" style={{ padding: "14px 16px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--card-2, var(--bg))", color: "var(--muted)", fontSize: 13, lineHeight: 1.45 }}>
                {t("None of your agents reads a user-wide instructions file magpie knows.")}
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--faint, var(--muted))" }}>{t("Cursor keeps no user-wide instructions file.")}</p>
            </div>
          </>
        ) : tab === "mcp" ? (
          <>
            {mcpServers.length === 0 && !addingServer ? (
              <div
                style={{
                  border: "1px dashed var(--line)",
                  borderRadius: 12,
                  padding: "28px 16px",
                  textAlign: "center",
                  color: "var(--muted)",
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                <p style={{ margin: "0 0 12px" }}>{t("No servers in the library yet. Paste a server's JSON from its README, or fill it in.")}</p>
                <button type="button" className="rt-gadd" style={{ margin: "0 auto" }} onClick={() => setAddingServer(true)}>
                  <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                    <path d="M8 3.5v9M3.5 8h9" />
                  </svg>
                  <span>{t("Add a server")}</span>
                </button>
              </div>
            ) : null}
            {addingServer ? (
              <div className="card" style={{ padding: 14, border: "1px solid var(--line)", borderRadius: 12, marginBottom: 16, animation: "pop-in .28s var(--ease)" }}>
                <textarea
                  rows={5}
                  value={serverJson}
                  placeholder={t('Paste a server\'s JSON, e.g. { "mcpServers": { … } }')}
                  onChange={(e) => setServerJson(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  style={{ width: "100%", font: "inherit", fontSize: 12.5, padding: 10, borderRadius: 8, border: "1px solid var(--line)" }}
                />
                <div className="bar" style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <span className="grow" />
                  <button type="button" className="text" onClick={() => { setAddingServer(false); setServerJson(""); }}>
                    {t("Cancel")}
                  </button>
                  <button
                    type="button"
                    className="text primary"
                    disabled={!serverJson.trim()}
                    onClick={() => {
                      const name = "custom-server";
                      setMcpServers((s) => [...s, { id: `mcp-${Date.now()}`, name }]);
                      setAddingServer(false);
                      setServerJson("");
                      onStatus?.(t("{name} added", { name }), "ok");
                    }}
                  >
                    {t("Add")}
                  </button>
                </div>
              </div>
            ) : null}
            {mcpServers.length > 0 ? (
              <div style={{ marginBottom: 16 }}>
                {mcpServers.map((s) => (
                  <div key={s.id} className="row" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 4px", borderBottom: "1px solid var(--line)" }}>
                    <b style={{ fontSize: 13 }}>{s.name}</b>
                    <span className="grow" />
                    <button type="button" className="text" onClick={() => setMcpServers((list) => list.filter((x) => x.id !== s.id))}>
                      {t("Remove")}
                    </button>
                  </div>
                ))}
                <button type="button" className="rt-gadd" style={{ marginTop: 8 }} onClick={() => setAddingServer(true)}>
                  <span>{t("Add a server")}</span>
                </button>
              </div>
            ) : null}

            <div id="libDiscover" style={{ marginTop: 18 }}>
              <div className="row-head" style={{ marginBottom: 8 }}>
                <span className="label" style={{ letterSpacing: ".04em", fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                  {t("DISCOVER")}
                </span>
              </div>
              <input
                type="search"
                value={mcpQ}
                placeholder={t("Search MCP servers — GitHub, Postgres, Figma…")}
                onChange={(e) => setMcpQ(e.target.value)}
                style={{ width: "100%", maxWidth: 420, marginBottom: 12 }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {mcpHits.map((c) => (
                  <div key={c.id} className="card" style={{ padding: "12px 12px 10px", border: "1px solid var(--line)", borderRadius: 12, animation: "fade-in .18s var(--ease)", display: "flex", flexDirection: "column", gap: 6, minHeight: 128 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <b style={{ fontSize: 13 }}>{c.name}</b>
                      <span className="grow" />
                      <span style={{ fontSize: 10.5, padding: "1px 7px", borderRadius: 999, border: "1px solid var(--line)", color: "var(--muted)" }}>{c.tag}</span>
                    </div>
                    <small style={{ color: "var(--muted)", fontSize: 11.5 }}>By {c.by}</small>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--fg-2)", lineHeight: 1.4, flex: 1 }}>{c.desc}</p>
                    <div>
                      <button
                        type="button"
                        className="text primary"
                        style={{ height: 26, fontSize: 12 }}
                        onClick={() => {
                          if (mcpServers.some((s) => s.id === c.id)) {
                            onStatus?.(t("Already in the library"), "warn");
                            return;
                          }
                          setMcpServers((s) => [...s, { id: c.id, name: c.name }]);
                          onStatus?.(t("{name} added", { name: c.name }), "ok");
                        }}
                      >
                        {c.addDots ? t("Add…") : t("Add")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="none" style={{ padding: "28px 8px", color: "var(--muted)", fontSize: 13 }}>
            {t("Demo: {tab} — nested capture continues", { tab: t(LIB_TABS.find(([id]) => id === tab)?.[1] || tab) })}
          </div>
        )}
      </div>
    </main>
  );
}
