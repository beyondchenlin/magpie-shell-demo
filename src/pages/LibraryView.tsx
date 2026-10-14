import { useEffect, useRef, useState } from "react";
import { t } from "../i18n";

/**
 * Magpie Library plugin page (native-linux/library shots 01–03).
 * Feature-gated: Plugins › Built-in › Library. Instructions tab only for now.
 * Motion: view-in; set open chevron; lib-switch .18s; Ctrl/Cmd+S mock save.
 */

const LIB_TABS = [
  ["instructions", "Instructions"],
  ["mcp", "MCP servers"],
  ["skills", "Skills"],
  ["hooks", "Hooks"],
  ["rtk", "RTK"],
] as const;

type InstSet = { id: string; name: string; body: string; inUse: boolean };

const DOC =
  "M4 2.5h5.5L12 5v8.5H4z M9.5 2.5V5H12";
const FOLDER = "M2.5 4.5h4l1.2 1.3h5.8v6.7h-11z";
const BACKUP = "M3.2 8a4.8 4.8 0 1 0 1.4-3.4 M2.8 2.6v2.4h2.4 M8 5.3V8l1.9 1.2";

export function LibraryView({ onStatus }: { onStatus?: (msg: string, kind?: string) => void }) {
  const [tab, setTab] = useState<string>(() => {
    try {
      return localStorage.getItem("magpie.libTab") || "instructions";
    } catch {
      return "instructions";
    }
  });
  const [sets, setSets] = useState<InstSet[]>([
    { id: "default", name: "Default", body: "", inUse: true },
  ]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem("magpie.libTab", tab);
    } catch {
      /* */
    }
  }, [tab]);

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

  return (
    <main className="view" id="view-library" style={{ animation: "view-in .24s var(--ease)" }}>
      <div className="lib-head row-head" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="lib-tabs segs" role="tablist" aria-label={t("Library")} style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
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
        <button
          type="button"
          className="text"
          title={t("Show the library folder")}
          onClick={() => onStatus?.(t("Demo: open library folder"), "ok")}
        >
          <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden style={{ marginRight: 4, verticalAlign: -2 }}>
            <path d={FOLDER} />
          </svg>
          {t("Library folder")}
        </button>
        <button
          type="button"
          className="text"
          title={t("Backups")}
          onClick={() => onStatus?.(t("Demo: library backups"), "ok")}
        >
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
                        <small style={{ color: "var(--muted)" }}>{s.body.trim() ? t("{n} characters", { n: s.body.length }) : t("Empty")}</small>
                      </span>
                      {s.inUse ? (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 560,
                            padding: "1px 8px",
                            borderRadius: 999,
                            border: "1px solid var(--line)",
                            color: "var(--fg-2)",
                          }}
                        >
                          {t("In use")}
                        </span>
                      ) : null}
                      <svg
                        viewBox="0 0 12 12"
                        width={11}
                        height={11}
                        aria-hidden
                        style={{
                          transform: open ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform .15s var(--ease)",
                          color: "var(--muted)",
                        }}
                      >
                        <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                    {open ? (
                      <div style={{ marginTop: 8, display: "grid", gap: 8, animation: "fade-in .18s var(--ease)" }}>
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
                          ref={taRef}
                          rows={6}
                          value={s.body}
                          placeholder={t(
                            "What every agent should know — how you like code written, the stack you work in, the commands that run your tests…",
                          )}
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

              <button
                type="button"
                className="rt-gadd"
                style={{ marginTop: 8 }}
                onClick={() => {
                  const id = `set-${Date.now()}`;
                  setSets((list) => [...list, { id, name: t("New set"), body: "", inUse: false }]);
                  setOpenId(id);
                  setDirty(true);
                }}
              >
                <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <path d="M8 3.5v9M3.5 8h9" />
                </svg>
                <span>{t("New set")}</span>
              </button>
            </div>

            <div style={{ marginTop: 22 }}>
              <div className="row-head" style={{ marginBottom: 6 }}>
                <span className="label" style={{ letterSpacing: ".04em", fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                  {t("AGENTS")}
                </span>
              </div>
              <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
                {t(
                  openSet
                    ? "They read {name} · magpie writes its part between two marker lines — the rest of each file stays yours."
                    : "They read Default · magpie writes its part between two marker lines — the rest of each file stays yours.",
                  { name: openSet?.name || "Default" },
                )}
              </p>
              <div
                className="card"
                style={{
                  padding: "14px 16px",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  background: "var(--card-2, var(--bg))",
                  color: "var(--muted)",
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                {t("None of your agents reads a user-wide instructions file magpie knows.")}
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--faint, var(--muted))" }}>
                {t("Cursor keeps no user-wide instructions file.")}
              </p>
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
