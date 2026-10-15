import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type ReactNode } from "react";
import { ActionConfirm } from "../components/ActionConfirm";
import { Segs } from "../components/Segs";
import { Tick } from "../components/Tick";
import { Bird } from "../components/Bird";
import { useSegThumb } from "../components/SegThumb";
import { t } from "../i18n";

/**
 * Magpie Library plugin (native-linux/library nests through 184–219 MCP health/tools/OAuth + Instructions/projects).
 * Feature-gated: Plugins › Built-in › Library.
 * Motion: view-in .24s; modal pop-in .42s; Discard .28s; segs .18s; lib-switch; lib-bob/lib-probe/mk-spin (v0.1.44).
 */

const LIB_TABS = [
  ["instructions", "Instructions"],
  ["mcp", "MCP servers"],
  ["skills", "Skills"],
  ["hooks", "Hooks"],
  ["rtk", "RTK"],
] as const;

type InstSet = { id: string; name: string; body: string; savedBody: string; inUse: boolean; file?: string };
type Transport = "stdio" | "http" | "sse";
type McpDraft = {
  name: string;
  transport: Transport;
  command: string;
  url: string;
  envRows: [string, string][];
  headerRows: [string, string][];
  oauthOpen: boolean;
  clientId: string;
  clientSecret: string;
  callbackPort: string;
  agents: string[];
};
type HookDraft = {
  name: string;
  description: string;
  event: string;
  matcher: string;
  command: string;
  timeout: string;
  agents: string[];
};

const HOOK_EVENTS = [
  ["turn-end", "When a turn ends"],
  ["after-tool", "After a tool runs"],
  ["before-tool", "Before a tool runs"],
  ["prompt", "When a prompt is sent"],
  ["session-start", "When a session starts"],
] as const;
/** Magpie hookAgentOf("cursor").events — agent-own events in When-it-runs menu */
const CURSOR_HOOK_EVENTS = [
  "beforeShellExecution",
  "afterShellExecution",
  "beforeMCPExecution",
  "afterMCPExecution",
  "beforeReadFile",
  "afterFileEdit",
  "beforeSubmitPrompt",
  "stop",
  "afterAgentResponse",
  "afterAgentThought",
  "sessionEnd",
  "preToolUse",
  "postToolUse",
  "postToolUseFailure",
  "subagentStart",
  "subagentStop",
  "preCompact",
] as const;
const HOOK_TOOLS = [
  ["", "Any tool"],
  ["shell", "Shell commands"],
  ["edit", "File edits"],
] as const;
const DEMO_AGENTS = [{ id: "cursor", name: "Cursor" }];
const CMD_PATH = "M3 4.5 6.5 8 3 11.5 M8 12h5";
const WEB_PATH = "M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z M2.5 8h11";

const emptyMcp = (): McpDraft => ({
  name: "",
  transport: "stdio",
  command: "",
  url: "",
  envRows: [],
  headerRows: [],
  oauthOpen: false,
  clientId: "",
  clientSecret: "",
  callbackPort: "",
  agents: DEMO_AGENTS.map((a) => a.id),
});
const emptyHook = (): HookDraft => ({
  name: "",
  description: "",
  event: "turn-end",
  matcher: "",
  command: "",
  timeout: "",
  agents: DEMO_AGENTS.map((a) => a.id),
});

/** Magpie library serversIn — paste JSON into New MCP server fills the draft */
function serversIn(text: string): Array<{
  name: string;
  transport: Transport;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}> | null {
  let v: unknown;
  try {
    v = JSON.parse(text.trim().replace(/,\s*([}\]])/g, "$1"));
  } catch {
    try {
      v = JSON.parse("{" + text.trim().replace(/,\s*$/, "") + "}");
    } catch {
      return null;
    }
  }
  if (!v || typeof v !== "object") return null;
  const obj = v as Record<string, unknown>;
  const map = (obj.mcpServers || obj.servers || obj.mcp || obj.context_servers || null) as Record<string, unknown> | null;
  const one = (name: string, e: Record<string, unknown> | null) => {
    if (!e || typeof e !== "object") return null;
    const url = (e.url || e.serverUrl || e.httpUrl || e.uri) as string | undefined;
    const s: {
      name: string;
      transport: Transport;
      command?: string;
      args?: string[];
      env?: Record<string, string>;
      url?: string;
      headers?: Record<string, string>;
    } = {
      name: (name || "").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, ""),
      transport: "stdio",
      env: {},
      headers: {},
    };
    if (url) {
      s.transport = e.type === "sse" || e.transport === "sse" || /\/sse\/?$/.test(url) ? "sse" : "http";
      s.url = url;
      s.headers = { ...((e.headers || e.http_headers || {}) as Record<string, string>) };
    } else if (e.command) {
      s.transport = "stdio";
      const cmd = Array.isArray(e.command) ? e.command : [e.command];
      s.command = String(cmd[0]);
      s.args = [...cmd.slice(1), ...((e.args as unknown[]) || [])].map(String);
      s.env = { ...((e.env || e.environment || {}) as Record<string, string>) };
    } else return null;
    return s;
  };
  type S = NonNullable<ReturnType<typeof one>>;
  if (map && typeof map === "object") {
    return Object.entries(map)
      .map(([n, e]) => one(n, e as Record<string, unknown>))
      .filter((x): x is S => !!x);
  }
  if (obj.command || obj.url || obj.serverUrl || obj.httpUrl) {
    const s = one(String(obj.name || ""), obj);
    return s ? [s] : null;
  }
  const entries = Object.entries(obj).filter(
    ([, e]) => e && typeof e === "object" && ((e as Record<string, unknown>).command || (e as Record<string, unknown>).url || (e as Record<string, unknown>).serverUrl || (e as Record<string, unknown>).httpUrl),
  );
  return entries.length
    ? entries.map(([n, e]) => one(n, e as Record<string, unknown>)).filter((x): x is NonNullable<typeof x> => !!x)
    : null;
}

function LibChip({
  on,
  label,
  onClick,
  title,
  iconOnly,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
  title?: string;
  /** Magpie agentChips: icon-only cube (library/70–71) */
  iconOnly?: boolean;
}) {
  return (
    <button
      type="button"
      className={`lib-ag${on ? " on" : ""}`}
      aria-pressed={on}
      aria-label={label}
      title={title}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: iconOnly ? 0 : 5,
        height: iconOnly ? 28 : 26,
        width: iconOnly ? 28 : undefined,
        padding: iconOnly ? 0 : "0 10px 0 8px",
        borderRadius: iconOnly ? 8 : 999,
        border: `1px solid ${on ? "var(--line)" : "transparent"}`,
        background: on ? "var(--card)" : "transparent",
        color: on ? "var(--fg)" : "var(--muted)",
        opacity: on ? 1 : 0.45,
        font: "inherit",
        fontSize: iconOnly ? 14 : 12,
        cursor: "pointer",
        transition: "background .14s, border-color .14s, color .14s, opacity .14s",
      }}
    >
      {iconOnly ? "▦" : label}
    </button>
  );
}

function LibModal({
  onBg,
  children,
  sm,
  onPaste,
}: {
  onBg: () => void;
  children: ReactNode;
  sm?: boolean;
  onPaste?: (e: ClipboardEvent) => void;
}) {
  /** Magpie `.modal` > `.dialog` (+ `.lib-editor` / `.sm`) — chrome in app.css + shell-patch. */
  return (
    <div
      className="modal"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onBg();
      }}
    >
      <div
        className={`dialog lib-editor${sm ? " sm" : ""}`}
        role="dialog"
        aria-modal
        onMouseDown={(e) => e.stopPropagation()}
        onPaste={onPaste}
      >
        {children}
      </div>
    </div>
  );
}


/** Demo Thunar for Library folder / Backups (native-linux/library 88–100).
 * Escape does not close and does not go up (NOTES 92/94/98). Close via title X or File → Close Window.
 * Real Magpie shells out to the OS file manager; Escape N/A for external Thunar. */
type FmNode = { name: string; kids?: FmNode[] };

const LIB_FM_ROOT: FmNode = {
  name: "library",
  kids: [{ name: "skills" }],
};
const BACKUPS_FM_ROOT: FmNode = {
  name: "backups",
  kids: [
    {
      name: "2026-10-15_06-08-50.641",
      kids: [{ name: "skills", kids: [{ name: "git-guardrails-claude-code" }] }],
    },
    {
      name: "2026-10-15_06-12-16.936",
      kids: [{ name: "skills", kids: [{ name: "ask-matt" }] }],
    },
  ],
};

function fmAt(root: FmNode, segs: string[]): FmNode {
  let n = root;
  for (const s of segs) {
    const next = n.kids?.find((k) => k.name === s);
    if (!next) break;
    n = next;
  }
  return n;
}

function LibThunar({
  kind,
  onClose,
}: {
  kind: "library" | "backups";
  onClose: () => void;
}) {
  const root = kind === "library" ? LIB_FM_ROOT : BACKUPS_FM_ROOT;
  const base = kind === "library" ? "/home/box/.config/magpie/library" : "/home/box/.config/magpie/backups";
  const [segs, setSegs] = useState<string[]>([]);
  const [hist, setHist] = useState<string[][]>([[]]);
  const [histI, setHistI] = useState(0);
  const [fileMenu, setFileMenu] = useState(false);
  const node = fmAt(root, segs);
  const kids = node.kids || [];
  const titleName = segs.length ? segs[segs.length - 1] : root.name;
  const loc = segs.length ? `${base}/${segs.join("/")}/` : `${base}/`;
  const canBack = histI > 0;
  const canFwd = histI < hist.length - 1;
  const canUp = segs.length > 0;

  const go = (next: string[]) => {
    const cut = hist.slice(0, histI + 1);
    cut.push(next);
    setHist(cut);
    setHistI(cut.length - 1);
    setSegs(next);
    setFileMenu(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // NOTES 92/94/98: Escape never closes Thunar and never moves up.
        // Escape only dismisses an open File menu (NOTES 95).
        e.preventDefault();
        e.stopPropagation();
        setFileMenu(false);
        return;
      }
      if (e.altKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setFileMenu((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const folderIcon = (
    <svg viewBox="0 0 48 48" width={48} height={48} aria-hidden>
      <path fill="#e8b84a" d="M6 14h14l3 3h19v22H6z" />
      <path fill="#f5d57a" d="M6 17h36v19H6z" />
    </svg>
  );

  const FILE_ITEMS: { label: string; accel?: string; disabled?: boolean; sep?: boolean; close?: boolean }[] = [
    { label: "New Tab", accel: "Ctrl+T" },
    { label: "New Window", accel: "Ctrl+N" },
    { label: "Create Folder…", accel: "Shift+Ctrl+N" },
    { label: "Create Document", accel: "▸" },
    { sep: true, label: "" },
    { label: "Open Terminal Here" },
    { label: "Properties…", accel: "Alt+Return" },
    { sep: true, label: "" },
    { label: "Detach Tab", disabled: true },
    { label: "Close All Windows", accel: "Shift+Ctrl+W" },
    { label: "Close Tab", accel: "Ctrl+W" },
    { label: "Close Window", accel: "Ctrl+Q", close: true },
  ];

  return (
    <div
      className="modal open lib-thunar-scrim"
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "grid",
        placeItems: "center",
        background: "rgba(20,22,30,.38)",
        animation: "fade-in .18s var(--ease)",
      }}
      onMouseDown={(e) => {
        // Outside click does not close — Magpie leaves Thunar until window close.
        if (e.target === e.currentTarget) setFileMenu(false);
      }}
    >
      <div
        className="lib-thunar"
        role="dialog"
        aria-modal
        aria-label={`${titleName} - Thunar`}
        style={{
          width: 640,
          height: 480,
          maxWidth: "min(640px, 96vw)",
          maxHeight: "min(480px, 90vh)",
          display: "flex",
          flexDirection: "column",
          background: "#fafafa",
          color: "#1c1c1c",
          borderRadius: 6,
          border: "1px solid #b0b0b0",
          boxShadow: "0 14px 40px rgba(0,0,0,.28)",
          overflow: "hidden",
          fontFamily: "Cantarell, 'Noto Sans', system-ui, sans-serif",
          fontSize: 13,
          animation: "pop-in .42s cubic-bezier(.16,1,.3,1)",
          position: "relative",
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className="lib-thunar-title"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 32,
            padding: "0 8px 0 10px",
            background: "linear-gradient(#ebebeb, #dcdcdc)",
            borderBottom: "1px solid #b8b8b8",
            userSelect: "none",
          }}
        >
          <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden>
            <path fill="#5b9bd5" d="M2 3.5h5l1.2 1.2H14V13H2z" />
          </svg>
          <span style={{ flex: 1, textAlign: "center", fontWeight: 500, fontSize: 12.5 }}>{titleName} - Thunar</span>
          <button type="button" className="text" aria-label="Minimize" style={{ width: 24, height: 22, padding: 0, border: "1px solid #aaa", borderRadius: 3, background: "#eee", fontSize: 11, lineHeight: 1, color: "#444" }} title="Minimize">─</button>
          <button type="button" className="text" aria-label="Maximize" style={{ width: 24, height: 22, padding: 0, border: "1px solid #aaa", borderRadius: 3, background: "#eee", fontSize: 10, lineHeight: 1, color: "#444" }} title="Maximize">□</button>
          <button type="button" className="text" aria-label="Close" onClick={onClose} style={{ width: 24, height: 22, padding: 0, border: "1px solid #aaa", borderRadius: 3, background: "#eee", fontSize: 12, lineHeight: 1, color: "#444" }} title="Close">×</button>
        </div>

        <div className="lib-thunar-menubar" style={{ display: "flex", gap: 2, padding: "2px 6px", background: "#f6f6f6", borderBottom: "1px solid #ddd", position: "relative" }}>
          {(["File", "Edit", "View", "Go", "Bookmarks", "Help"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className="text"
              style={{
                height: 24,
                padding: "0 8px",
                border: 0,
                borderRadius: 3,
                background: m === "File" && fileMenu ? "#4a90d9" : "transparent",
                color: m === "File" && fileMenu ? "#fff" : "#222",
                font: "inherit",
                fontSize: 12.5,
                cursor: "default",
              }}
              onClick={() => (m === "File" ? setFileMenu((v) => !v) : setFileMenu(false))}
            >
              {m}
            </button>
          ))}
          {fileMenu ? (
            <div
              role="menu"
              style={{
                position: "absolute",
                top: 26,
                left: 6,
                zIndex: 5,
                minWidth: 220,
                background: "#fff",
                border: "1px solid #aaa",
                boxShadow: "0 4px 14px rgba(0,0,0,.18)",
                padding: "4px 0",
              }}
            >
              {FILE_ITEMS.map((it, i) =>
                it.sep ? (
                  <div key={`sep-${i}`} style={{ height: 1, background: "#ddd", margin: "4px 0" }} />
                ) : (
                  <button
                    key={it.label}
                    type="button"
                    role="menuitem"
                    disabled={it.disabled}
                    onClick={() => {
                      if (it.close) onClose();
                      else setFileMenu(false);
                    }}
                    style={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      gap: 12,
                      padding: "5px 14px 5px 28px",
                      border: 0,
                      background: "transparent",
                      font: "inherit",
                      fontSize: 12.5,
                      color: it.disabled ? "#aaa" : "#222",
                      cursor: it.disabled ? "default" : "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (!it.disabled) e.currentTarget.style.background = "#4a90d9";
                      if (!it.disabled) e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = it.disabled ? "#aaa" : "#222";
                    }}
                  >
                    <span style={{ flex: 1 }}>{it.label}</span>
                    {it.accel && it.accel !== "▸" ? (
                      <span style={{ opacity: 0.75, fontSize: 11.5 }}>{it.accel}</span>
                    ) : it.accel === "▸" ? (
                      <span style={{ opacity: 0.75 }}>▸</span>
                    ) : null}
                  </button>
                ),
              )}
            </div>
          ) : null}
        </div>

        <div
          className="lib-thunar-toolbar"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 8px",
            background: "#f0f0f0",
            borderBottom: "1px solid #ddd",
          }}
        >
          <button
            type="button"
            className="text"
            disabled={!canBack}
            aria-label="Back"
            onClick={() => {
              if (!canBack) return;
              const i = histI - 1;
              setHistI(i);
              setSegs(hist[i]);
            }}
            style={{ width: 28, height: 28, opacity: canBack ? 1 : 0.35, border: 0, background: "transparent", fontSize: 16, cursor: canBack ? "pointer" : "default" }}
          >
            ←
          </button>
          <button
            type="button"
            className="text"
            disabled={!canFwd}
            aria-label="Forward"
            onClick={() => {
              if (!canFwd) return;
              const i = histI + 1;
              setHistI(i);
              setSegs(hist[i]);
            }}
            style={{ width: 28, height: 28, opacity: canFwd ? 1 : 0.35, border: 0, background: "transparent", fontSize: 16, cursor: canFwd ? "pointer" : "default" }}
          >
            →
          </button>
          <button
            type="button"
            className="text"
            disabled={!canUp}
            aria-label="Up"
            onClick={() => {
              if (!canUp) return;
              go(segs.slice(0, -1));
            }}
            style={{ width: 28, height: 28, opacity: canUp ? 1 : 0.45, border: 0, background: "transparent", fontSize: 14, cursor: canUp ? "pointer" : "default", color: canUp ? "#222" : "#999" }}
          >
            ↑
          </button>
          <button type="button" className="text" aria-label="Home" onClick={() => go([])} style={{ width: 28, height: 28, border: 0, background: "transparent", fontSize: 14, cursor: "pointer", color: "#222" }}>⌂</button>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 28,
              padding: "0 8px",
              border: "1px solid #bbb",
              borderRadius: 4,
              background: "#fff",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden style={{ flex: "none" }}>
              <path fill="#5b9bd5" d="M2 3.5h5l1.2 1.2H14V13H2z" />
            </svg>
            <span style={{ overflow: "hidden", whiteSpace: "nowrap", direction: "rtl", textAlign: "left", fontSize: 12.5 }}>{loc}</span>
          </div>
          <button type="button" className="text" aria-label="Search" style={{ width: 28, height: 28, border: 0, background: "transparent", fontSize: 14 }}>⌕</button>
        </div>

        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <nav
            style={{
              width: 140,
              flex: "none",
              borderRight: "1px solid #ddd",
              background: "#f7f7f7",
              padding: "8px 6px",
              fontSize: 12,
              color: "#555",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 11, margin: "4px 6px 6px", color: "#777" }}>Places</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 6px", borderRadius: 4 }}>
              <span aria-hidden>🏠</span> box
            </div>
            <div style={{ fontWeight: 600, fontSize: 11, margin: "12px 6px 6px", color: "#777" }}>Devices</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 6px", borderRadius: 4 }}>
              <span aria-hidden>💾</span> File System
            </div>
          </nav>
          <div
            style={{
              flex: 1,
              padding: 16,
              background: "#fff",
              display: "flex",
              flexWrap: "wrap",
              alignContent: "flex-start",
              gap: 18,
              overflow: "auto",
            }}
          >
            {kids.map((k) => (
              <button
                key={k.name}
                type="button"
                onDoubleClick={() => go([...segs, k.name])}
                onClick={() => go([...segs, k.name])}
                style={{
                  width: 96,
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: 4,
                  borderRadius: 4,
                  font: "inherit",
                  color: "#222",
                }}
                title={k.name}
              >
                {folderIcon}
                <span
                  style={{
                    fontSize: 12,
                    lineHeight: 1.25,
                    textAlign: "center",
                    wordBreak: "break-all",
                    maxWidth: 90,
                  }}
                >
                  {k.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            height: 24,
            padding: "0 10px",
            display: "flex",
            alignItems: "center",
            borderTop: "1px solid #ddd",
            background: "#f0f0f0",
            fontSize: 11.5,
            color: "#444",
          }}
        >
          {kids.length} folder{kids.length === 1 ? "" : "s"} | Free space: 104.5 GiB
        </div>
      </div>
    </div>
  );
}

const DOC = "M4 2.5h5.5L12 5v8.5H4z M9.5 2.5V5H12";
const FOLDER = "M2.5 4.5h4l1.2 1.3h5.8v6.7h-11z";
const BACKUP = "M3.2 8a4.8 4.8 0 1 0 1.4-3.4 M2.8 2.6v2.4h2.4 M8 5.3V8l1.9 1.2";
const SEARCH = "M7 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M10 10l3 3";

const DEMO_MCP = [
  { id: "magpie-image", name: "Magpie Image", by: "Magpie", tag: "magpie", desc: "Generate and edit images with the image model set in Magpie (Settings → Images), and make short videos with a video model set up in Magpie (Grok Imagine, Seedance), saved in the project.", addDots: true, sheet: true as const },
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

const DEMO_SKILLS_MARKET = [
  { id: "magpie-quota", name: "magpie-quota", by: "magpie-community/plugins", installs: "", desc: "Check how much is left of the user's AI subscriptions, coding plans and API key…", verified: true },
  { id: "find-skills", name: "find-skills", by: "vercel-labs/skills", installs: "3.9M", desc: "Helps users discover and install agent skills when they ask questions like 'how do I do X…", verified: true },
  { id: "grill-me", name: "grill-me", by: "mattpocock/skills", installs: "1.4M", desc: "A relentless interview to sharpen a plan or design.", sheet: true },
  { id: "grill-with-docs", name: "grill-with-docs", by: "mattpocock/skills", installs: "1.2M", desc: "Grill a design with the docs open beside you.", sheet: true },
  { id: "agent-browser", name: "agent-browser", by: "vercel-labs/agent-browser", installs: "1.1M", desc: "Browser automation CLI for AI agents. Use when the user needs to interact with…" },
  { id: "improve-codebase-architecture", name: "improve-codebase-architecture", by: "mattpocock/skills", installs: "1.1M", desc: "Scan a codebase for deepening opportunities, present them as a visual HTML report, then…", sheet: true },
  { id: "tdd", name: "tdd", by: "mattpocock/skills", installs: "1.1M", desc: "Test-driven development. Use when the user wants to build features or fix bugs test-first,…", sheet: true },
  { id: "hyperframes-cli", name: "hyperframes-cli", by: "heygen-com/hyperframes", installs: "1M", desc: "Use the HyperFrames CLI development loop: init, add, catalog, capture, lint, check,…" },
];

/** Native probe list sample (mattpocock/skills) — Magpie library/skills/probe mock */
const DEMO_PROBE_SKILLS = [
  { path: "ask-matt", name: "ask-matt", desc: "Ask which skill or flow fits your situation. A router over the skills in this repo." },
  { path: "chief-of-staff", name: "chief-of-staff", desc: "Pursue a long-running goal in a single session by co-ordinating subagents." },
  { path: "claude-handoff", name: "claude-handoff", desc: "Hand the current conversation off to a fresh background agent that picks up the work immediately." },
  { path: "code-review", name: "code-review", desc: "Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes: Standards and Spec…" },
  { path: "domain-map", name: "domain-map", desc: "Map a domain and its bounded contexts before you code." },
  { path: "git-worktree", name: "git-worktree", desc: "Isolate work in a git worktree so experiments stay out of main." },
  { path: "migrate-to-effect", name: "migrate-to-effect", desc: "Migrate a codebase toward Effect with a clear plan." },
  { path: "mock-types", name: "mock-types", desc: "Use when someone mentions shoehorn, wants to replace `as` in tests, or needs partial test data." },
  { path: "pr", name: "pr", desc: "Use when writing a PR body." },
  { path: "grill-me", name: "grill-me", desc: "A relentless interview to sharpen a plan or design." },
];


/** Magpie library/projects/choose — GTK "Choose a project" (library 101–119). Not Thunar. */
type ChoosePlace = "recent" | "home" | "desktop" | "workspace" | "other";

const HOME_FOLDERS = [
  { name: "agent-data", modified: "13:35" },
  { name: "chrome-profile", modified: "Yesterday" },
  { name: "cli-config", modified: "Mon" },
  { name: "Reference", modified: "08:42" },
  { name: "sand-data", modified: "13:35" },
];

const USR_COMPLETE = [
  "bin/",
  "games/",
  "i686-w64-mingw32/",
  "include/",
  "lib/",
  "lib64/",
  "libexec/",
  "local/",
  "sbin/",
  "share/",
  "src/",
  "x86_64-w64-mingw32/",
  "x86_64-w64-mingw32ucrt/",
];

function LibChooseProject({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (path: string) => void;
}) {
  const [place, setPlace] = useState<ChoosePlace>("recent");
  const [locOpen, setLocOpen] = useState(false);
  const [locVal, setLocVal] = useState("");
  const [complete, setComplete] = useState<string[] | null>(null);
  const [deskTip, setDeskTip] = useState(false);
  /** workspace list / Computer root browse (120–126) */
  const [browse, setBrowse] = useState<"place" | "computer">("place");
  const [selected, setSelected] = useState<string | null>(null);
  const locRef = useRef<HTMLInputElement>(null);

  const WORKSPACE_FOLDERS = [
    "DrawMotion",
    "agent-ui",
    "magpie-probe-project",
    "magpie-shell-demo",
    "uploads",
  ];
  const ROOT_FOLDERS = ["bin", "boot", "dev", "etc", "home", "proc", "tmp", "usr", "var", "workspace"];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setLocOpen(true);
        setLocVal("");
        setComplete(null);
        window.setTimeout(() => locRef.current?.focus(), 0);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        // NOTES: Escape first dismisses location field (+ completion); second closes dialog.
        if (locOpen || complete) {
          setLocOpen(false);
          setComplete(null);
          setLocVal("");
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [locOpen, complete, onClose]);

  const openCurrent = () => {
    // NOTES 115: Open while Home is current place (no location field) → /home/box
    if (locOpen && locVal.trim()) {
      // Typed path still open: NOTES does not claim acceptance; keep dialog (pointer edge miss).
      return;
    }
    if (place === "workspace" && selected) {
      onOpen(`/workspace/${selected}`);
      return;
    }
    if (browse === "computer" && selected) {
      onOpen(`/${selected}`);
      return;
    }
    if (place === "home") {
      onOpen("/home/box");
      return;
    }
    if (place === "desktop") {
      onOpen("/home/box/Desktop");
      return;
    }
    if (place === "workspace") {
      onOpen("/workspace");
      return;
    }
    if (place === "other" || browse === "computer") {
      onOpen("/");
      return;
    }
    // Recent empty — Open still dark/clickable; no path to accept
  };

  const sideBtn = (id: ChoosePlace, label: string, tip?: string) => (
    <button
      key={id}
      type="button"
      className="text"
      onMouseEnter={() => setDeskTip(id === "desktop" && !!tip)}
      onMouseLeave={() => setDeskTip(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        justifyContent: "flex-start",
        width: "100%",
        padding: "8px 12px",
        borderRadius: 8,
        border: 0,
        background: place === id ? "#3584e4" : "transparent",
        color: place === id ? "#fff" : "var(--fg)",
        font: "inherit",
        fontSize: 13,
        cursor: "pointer",
        textAlign: "left",
        position: "relative",
      }}
      onClick={() => {
        setPlace(id);
        setBrowse("place");
        setSelected(null);
        setLocOpen(false);
        setComplete(null);
        setLocVal("");
      }}
    >
      {id === "recent" ? "◷" : id === "home" ? "⌂" : id === "other" ? "+" : "📁"}
      <span>{id === "other" ? `+ ${label}` : label}</span>
      {id === "desktop" && deskTip ? (
        <span
          style={{
            position: "absolute",
            left: -8,
            top: "50%",
            transform: "translate(-100%, -50%)",
            background: "#1c1c1c",
            color: "#fff",
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 6,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 4,
            boxShadow: "0 4px 12px rgba(0,0,0,.25)",
          }}
        >
          {t("Open the contents of your desktop in a folder")}
        </span>
      ) : null}
    </button>
  );

  return (
    <div
      className="modal open"
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 95,
        display: "grid",
        placeItems: "center",
        background: "rgba(20,22,30,.42)",
        animation: "fade-in .18s var(--ease)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          /* Magpie Escape/Cancel close; outside click not documented — leave open */
        }
      }}
    >
      <div
        className="dialog gtk-select-files lib-choose-project"
        role="dialog"
        aria-modal
        aria-label={t("Choose a project")}
        style={{
          width: "min(1100px, 96vw)",
          height: "min(680px, 90vh)",
          maxHeight: "min(680px, 90vh)",
          display: "flex",
          flexDirection: "column",
          animation: "pop-in .42s cubic-bezier(.16,1,.3,1)",
          background: "#fafafa",
          borderRadius: 10,
          border: "1px solid #c0c0c0",
          boxShadow: "0 18px 48px rgba(20,22,30,.28)",
          overflow: "hidden",
          position: "relative",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 40,
            padding: "0 10px 0 12px",
            background: "linear-gradient(#f0f0f0, #e6e6e6)",
            borderBottom: "1px solid #c8c8c8",
            userSelect: "none",
          }}
        >
          <span style={{ color: "var(--fg)", display: "inline-flex" }}>
            <Bird size={16} />
          </span>
          <span style={{ flex: 1, textAlign: "center", fontWeight: 600, fontSize: 13 }}>{t("Choose a project")}</span>
          <button type="button" aria-label="Minimize" style={{ width: 24, height: 22, border: "1px solid #aaa", borderRadius: 4, background: "#eee", fontSize: 11 }}>─</button>
          <button type="button" aria-label="Maximize" style={{ width: 24, height: 22, border: "1px solid #aaa", borderRadius: 4, background: "#eee", fontSize: 10 }}>□</button>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: 24, height: 22, border: "1px solid #aaa", borderRadius: 4, background: "#eee", fontSize: 12 }}>×</button>
        </div>

        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <nav
            style={{
              width: 188,
              flex: "none",
              borderRight: "1px solid #ddd",
              padding: "10px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              background: "#f3f3f3",
            }}
          >
            {sideBtn("recent", t("Recent"))}
            {sideBtn("home", t("Home"))}
            {sideBtn("desktop", t("Desktop"), t("Open the contents of your desktop in a folder"))}
            {sideBtn("workspace", "workspace")}
            <div style={{ height: 1, background: "#ddd", margin: "8px 6px" }} />
            {sideBtn("other", t("Other Locations"))}
          </nav>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "#fff" }}>
            {(place === "home" || place === "workspace" || browse === "computer") && !locOpen ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderBottom: "1px solid #e8e8e8",
                }}
              >
                <button type="button" className="text" disabled style={{ opacity: 0.35, border: 0, background: "transparent" }}>←</button>
                <button type="button" className="text" style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 10px", borderRadius: 999, border: "1px solid #ccc", background: "#f6f6f6", font: "inherit", fontSize: 12.5 }}>
                  {place === "home" ? "⌂ box" : place === "workspace" || browse === "computer" ? "📁 workspace" : "⌂"}
                </button>
                <button type="button" className="text" disabled style={{ opacity: 0.35, border: 0, background: "transparent" }}>→</button>
                <span className="grow" />
                <button type="button" className="text" title={t("Create Folder…")} aria-label={t("Create Folder…")} style={{ width: 32, height: 28, border: "1px solid #ccc", borderRadius: 6, background: "#f6f6f6" }}>📁+</button>
              </div>
            ) : null}

            {locOpen ? (
              <div style={{ padding: "8px 12px", borderBottom: "1px solid #e8e8e8" }}>
                <input
                  ref={locRef}
                  type="text"
                  value={locVal}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) => {
                    setLocVal(e.target.value);
                    setComplete(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = locVal.trim() || "/";
                      const norm = v.endsWith("/") ? v : `${v}/`;
                      setLocVal(norm);
                      if (norm === "/usr/" || locVal.trim() === "/usr") {
                        setComplete(USR_COMPLETE);
                      } else {
                        setComplete([]);
                      }
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      e.stopPropagation();
                      setLocOpen(false);
                      setComplete(null);
                      setLocVal("");
                    }
                  }}
                  style={{
                    width: "100%",
                    height: 34,
                    padding: "0 10px",
                    borderRadius: 8,
                    border: "2px solid #3584e4",
                    outline: "none",
                    font: "inherit",
                    fontSize: 13,
                    background: "#fff",
                  }}
                />
              </div>
            ) : null}

            <div style={{ flex: 1, overflow: "auto", padding: place === "other" ? 16 : 0 }}>
              {complete ? (
                <div style={{ padding: "8px 16px", fontSize: 13, lineHeight: 1.7 }}>
                  {complete.map((c) => (
                    <div key={c}>{c}</div>
                  ))}
                </div>
              ) : place === "recent" ? (
                <div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.4fr 1.2fr 0.6fr 0.7fr 0.8fr",
                      gap: 8,
                      padding: "8px 14px",
                      borderBottom: "1px solid #eee",
                      fontSize: 12,
                      color: "#666",
                      fontWeight: 500,
                    }}
                  >
                    <span>{t("Name")}</span>
                    <span>{t("Location")}</span>
                    <span>{t("Size")}</span>
                    <span>{t("Type")}</span>
                    <span>{t("Accessed")}</span>
                  </div>
                </div>
              ) : place === "home" ? (
                <div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.6fr 0.5fr 0.7fr 0.7fr",
                      gap: 8,
                      padding: "8px 14px",
                      borderBottom: "1px solid #eee",
                      fontSize: 12,
                      color: "#666",
                      fontWeight: 500,
                    }}
                  >
                    <span>{t("Name")} ↓</span>
                    <span>{t("Size")}</span>
                    <span>{t("Type")}</span>
                    <span>{t("Modified")}</span>
                  </div>
                  {HOME_FOLDERS.map((f) => (
                    <div
                      key={f.name}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.6fr 0.5fr 0.7fr 0.7fr",
                        gap: 8,
                        padding: "7px 14px",
                        fontSize: 13,
                        alignItems: "center",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span aria-hidden>📁</span>
                        {f.name}
                      </span>
                      <span style={{ color: "#888" }}>—</span>
                      <span style={{ color: "#666" }}>{t("Folder")}</span>
                      <span style={{ color: "#666" }}>{f.modified}</span>
                    </div>
                  ))}
                </div>
              ) : place === "workspace" && browse === "place" ? (
                <div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.6fr 0.5fr 0.7fr 0.7fr",
                      gap: 8,
                      padding: "8px 14px",
                      borderBottom: "1px solid #eee",
                      fontSize: 12,
                      color: "#666",
                      fontWeight: 500,
                    }}
                  >
                    <span>{t("Name")} ↓</span>
                    <span>{t("Size")}</span>
                    <span>{t("Type")}</span>
                    <span>{t("Modified")}</span>
                  </div>
                  {WORKSPACE_FOLDERS.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSelected(name)}
                      onDoubleClick={() => onOpen(`/workspace/${name}`)}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.6fr 0.5fr 0.7fr 0.7fr",
                        gap: 8,
                        padding: "7px 14px",
                        fontSize: 13,
                        alignItems: "center",
                        width: "100%",
                        border: 0,
                        textAlign: "left",
                        font: "inherit",
                        cursor: "pointer",
                        background: selected === name ? "#3584e4" : "transparent",
                        color: selected === name ? "#fff" : "#222",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span aria-hidden>📁</span>
                        {name}
                      </span>
                      <span style={{ opacity: 0.7 }}>—</span>
                      <span style={{ opacity: 0.85 }}>{t("Folder")}</span>
                      <span style={{ opacity: 0.85 }}>—</span>
                    </button>
                  ))}
                </div>
              ) : browse === "computer" ? (
                <div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.6fr 0.5fr 0.7fr 0.7fr",
                      gap: 8,
                      padding: "8px 14px",
                      borderBottom: "1px solid #eee",
                      fontSize: 12,
                      color: "#666",
                      fontWeight: 500,
                    }}
                  >
                    <span>{t("Name")} ↓</span>
                    <span>{t("Size")}</span>
                    <span>{t("Type")}</span>
                    <span>{t("Modified")}</span>
                  </div>
                  {ROOT_FOLDERS.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSelected(name)}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.6fr 0.5fr 0.7fr 0.7fr",
                        gap: 8,
                        padding: "7px 14px",
                        fontSize: 13,
                        alignItems: "center",
                        width: "100%",
                        border: 0,
                        textAlign: "left",
                        font: "inherit",
                        cursor: "pointer",
                        background: selected === name ? "#3584e4" : "transparent",
                        color: selected === name ? "#fff" : "#222",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span aria-hidden>📁</span>
                        {name}
                      </span>
                      <span style={{ opacity: 0.7 }}>—</span>
                      <span style={{ opacity: 0.85 }}>{t("Folder")}</span>
                      <span style={{ opacity: 0.85 }}>—</span>
                    </button>
                  ))}
                </div>
              ) : place === "other" ? (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>{t("On This Computer")}</div>
                  <button
                    type="button"
                    onDoubleClick={() => {
                      setBrowse("computer");
                      setSelected("bin");
                    }}
                    onClick={() => setSelected("Computer")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: selected === "Computer" ? "1px dashed #3584e4" : "1px dashed #bbb",
                      maxWidth: 520,
                      width: "100%",
                      background: "transparent",
                      font: "inherit",
                      cursor: "pointer",
                      textAlign: "left",
                      color: "inherit",
                    }}
                  >
                    <span aria-hidden style={{ fontSize: 22 }}>💾</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500 }}>{t("Computer")}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>112.2 GB / 134.2 GB available</div>
                    </div>
                    <span style={{ color: "#888" }}>/</span>
                  </button>
                </div>
              ) : (
                <p style={{ margin: 48, textAlign: "center", color: "#888", fontSize: 13 }}>{t("This folder is empty")}</p>
              )}
            </div>
          </div>
        </div>

        <div
          className="bar"
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            padding: "10px 14px",
            borderTop: "1px solid #ddd",
            background: "#f0f0f0",
          }}
        >
          <button type="button" className="text" onClick={onClose} style={{ height: 32, padding: "0 14px", border: "1px solid #bbb", borderRadius: 6, background: "#fff", font: "inherit" }}>
            {t("Cancel")}
          </button>
          <button
            type="button"
            className="text"
            onClick={openCurrent}
            style={{ height: 32, padding: "0 14px", border: "1px solid #bbb", borderRadius: 6, background: "#fff", font: "inherit", color: "#1c1c1c" }}
          >
            {t("Open")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LibraryView({ onStatus }: { onStatus?: (msg: string, kind?: string, ms?: number) => void }) {
  const [tab, setTab] = useState<string>(() => {
    try {
      return localStorage.getItem("magpie.libTab") || "instructions";
    } catch {
      return "instructions";
    }
  });
  const [sets, setSets] = useState<InstSet[]>([{ id: "default", name: "Default", body: "", savedBody: "", inUse: true }]);
  const [openId, setOpenId] = useState<string | null>(null);
  /** Magpie instructions Discard dialog (148–183) — separate from MCP/hook discard */
  const [instDiscardOpen, setInstDiscardOpen] = useState(false);
  /** Two-step Remove on a non–in-use set */
  const [instRemoveAsk, setInstRemoveAsk] = useState<string | null>(null);
  const [addingSet, setAddingSet] = useState(false);
  const [newName, setNewName] = useState("");
  const [fileMode, setFileMode] = useState(false);
  const [filePath, setFilePath] = useState("~/.agents/AGENTS.md");
  type McpHealth = "checking" | "timeout" | "tools" | "needs-signin" | "idle" | "unset";
  type McpTool = { id: string; name: string; desc: string; on: boolean };
  type McpServer = {
    id: string;
    name: string;
    transport: Transport;
    command?: string;
    url?: string;
    envRows?: [string, string][];
    agents: string[];
    health: McpHealth;
    toolsOpen: boolean;
    tools: McpTool[];
    /** first auto-check timed out; Check again → tools */
    checkedOnce?: boolean;
    oauthRefused?: string;
    /** last unset env var name shown on badge */
    unsetName?: string;
  };
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [mcpSort, setMcpSort] = useState<"az" | "za">("az");
  const [mcpSelectMode, setMcpSelectMode] = useState(false);
  const [mcpSelected, setMcpSelected] = useState<Set<string>>(new Set());
  const [mcpCopyMenu, setMcpCopyMenu] = useState<null | "bar" | "editor">(null);
  const [mcpCopyFlash, setMcpCopyFlash] = useState(false);
  const [mcpRemoveAllAsk, setMcpRemoveAllAsk] = useState(false);
  const [mcpRemoveSelectedAsk, setMcpRemoveSelectedAsk] = useState(false);
  const [mcpByAgentOpen, setMcpByAgentOpen] = useState(false);
  const [mcpTurnAllOffAsk, setMcpTurnAllOffAsk] = useState(false);
  const [mcpRemoveAsk, setMcpRemoveAsk] = useState<{ id: string; name: string } | null>(null);
  const [mcpOauthWall, setMcpOauthWall] = useState(false);
  const [mcpSignWaiting, setMcpSignWaiting] = useState(false);
  const [mcpEditId, setMcpEditId] = useState<string | null>(null);
  /** MCP In projects (separate from Skills projects) */
  type McpProject = { dir: string; name: string; open: boolean; placed: Record<string, string[]> };
  const [mcpProjects, setMcpProjects] = useState<McpProject[]>([]);
  const [mcpAddingProject, setMcpAddingProject] = useState<{ dir: string; busy?: boolean } | null>(null);
  const [mcpProjectRemove, setMcpProjectRemove] = useState<{ dir: string; name: string } | null>(null);
  const [mcpQ, setMcpQ] = useState("");
  const [mcpEditor, setMcpEditor] = useState<McpDraft | null>(null);
  const [mcpSnap, setMcpSnap] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false);
  const [imageSheet, setImageSheet] = useState(false);
  const [imageAgents, setImageAgents] = useState<string[]>(["cursor"]);
  const [skillSheet, setSkillSheet] = useState<(typeof DEMO_SKILLS_MARKET)[number] | null>(null);
  const [skillQ, setSkillQ] = useState("");
  const [skillSource, setSkillSource] = useState("");
  const [skillLooking, setSkillLooking] = useState(false);
  const [skillProbe, setSkillProbe] = useState<{
    source: string;
    empty?: boolean;
    mock?: { path: string; name: string; desc: string; have?: boolean }[];
    /** Magpie probe found.left — skills over 200 MB, listed but not installable */
    left?: { path: string; size: number }[];
  } | null>(null);
  const [skillPick, setSkillPick] = useState<Set<string>>(new Set());
  const [probeFilter, setProbeFilter] = useState("");
  const [skills, setSkills] = useState<{ id: string; name: string; desc: string; kind?: "github" | "folder"; agents?: string[] }[]>([]);
  /** Magpie confirmRemoveSkill — row trash (library/63+ nest not on disk yet) */
  const [skillRemoveConfirm, setSkillRemoveConfirm] = useState<{ id: string; name: string } | null>(null);
  /** Magpie openSkillHow — Give skills as › By agent */
  const [skillHowOpen, setSkillHowOpen] = useState(false);
  const [agentHow, setAgentHow] = useState<"" | "link" | "copy">("");
  /** Magpie openByAgent — In the library row-head By agent */
  const [skillsByAgentOpen, setSkillsByAgentOpen] = useState(false);
  /** Magpie addingProject — In projects inline card */
  const [addingProject, setAddingProject] = useState<{ dir: string; busy?: boolean } | null>(null);
  /** Magpie library project row (120–147): copy/link · skill chips · remove/keep */
  type LibProject = {
    dir: string;
    name: string;
    open: boolean;
    copy: boolean;
    /** skillId → agent ids that have it in this project */
    placed: Record<string, string[]>;
  };
  const [projects, setProjects] = useState<LibProject[]>([]);
  const [projectRemove, setProjectRemove] = useState<{ dir: string; name: string; keep: boolean; dirty: boolean } | null>(null);
  const [projectDiscard, setProjectDiscard] = useState(false);
  const [hooks, setHooks] = useState<
    { id: string; name: string; description: string; event: string; matcher: string; command: string; agents: string[] }[]
  >([]);
  const [hookEditor, setHookEditor] = useState<HookDraft | null>(null);
  const [hookSnap, setHookSnap] = useState("");
  const [eventMenu, setEventMenu] = useState(false);
  const [eventFilter, setEventFilter] = useState("");
  const [toolMenu, setToolMenu] = useState(false);
  const [rtkOn, setRtkOn] = useState<Record<string, boolean>>({ cursor: false });
  /** Magpie renderRTK: missing | installing | checking (skeleton) — no fake binary/path */
  const [rtkPhase, setRtkPhase] = useState<"missing" | "installing" | "checking">("missing");
  const [skillInstalling, setSkillInstalling] = useState(false);
  /** Magpie skillHowBar: link | copy */
  const [skillHow, setSkillHow] = useState<"link" | "copy">("link");
  /** Magpie change() saving on pressed seg (CU 76) */
  const [skillHowBusy, setSkillHowBusy] = useState<"link" | "copy" | null>(null);
  const setSkillHowSeg = useSegThumb(skillHowBusy ? `busy-${skillHowBusy}` : skillHow);
  const [skillChecking, setSkillChecking] = useState(false);
  /** Magpie Library folder / Backups → OS Thunar (library 88–100) */
  const [thunarKind, setThunarKind] = useState<"library" | "backups" | null>(null);
  /** Magpie library/projects/choose — GTK Choose a project (101–119) */
  const [chooseProjectOpen, setChooseProjectOpen] = useState(false);
  const newNameRef = useRef<HTMLInputElement>(null);
  const projectPathRef = useRef<HTMLInputElement>(null);
  const mcpNameRef = useRef<HTMLInputElement>(null);

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
    if (mcpEditor) mcpNameRef.current?.focus({ preventScroll: true });
  }, [mcpEditor]);

  const mcpDirty = mcpEditor != null && JSON.stringify(mcpEditor) !== mcpSnap;
  const hookDirty = hookEditor != null && JSON.stringify(hookEditor) !== hookSnap;
  const toolEvent = (ev: string) => ev === "after-tool" || ev === "before-tool";

  const openMcpEditor = () => {
    const d = emptyMcp();
    setMcpEditor(d);
    setMcpSnap(JSON.stringify(d));
    setMcpEditId(null);
    setMcpSignWaiting(false);
    setDiscardOpen(false);
  };
  const tryCloseMcp = () => {
    if (mcpSignWaiting) return; // finishing sign-in — Cancel on waiting line or wall
    if (mcpDirty) setDiscardOpen(true);
    else {
      setMcpEditor(null);
      setMcpEditId(null);
      setMcpSignWaiting(false);
    }
  };
  const PROBE_TOOLS: McpTool[] = [
    { id: "echo_note", name: "echo_note", desc: "Echo a short note. Probe only, not a real tool.", on: true },
    { id: "noop", name: "noop", desc: "Do nothing. Probe only.", on: true },
  ];

  const unsetEnvName = (env?: [string, string][]) => {
    for (const [, v] of env || []) {
      const m = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/.exec(v);
      if (m) return m[1]; // demo: any ${NAME} is unset where magpie runs
    }
    return null;
  };

  const runMcpHealth = (id: string, forceTools?: boolean) => {
    setMcpServers((list) =>
      list.map((x) => (x.id === id ? { ...x, health: "checking" as McpHealth, unsetName: undefined } : x)),
    );
    window.setTimeout(() => {
      setMcpServers((list) =>
        list.map((x) => {
          if (x.id !== id) return x;
          const unset = unsetEnvName(x.envRows);
          if (unset) {
            return { ...x, health: "unset" as McpHealth, unsetName: unset, checkedOnce: true };
          }
          if (x.transport === "http" || x.transport === "sse") {
            return { ...x, health: "needs-signin" as McpHealth, checkedOnce: true };
          }
          // stdio with agents: first check times out; Check again / force → 2 tools
          if (x.agents.length && !forceTools && !x.checkedOnce) {
            return { ...x, health: "timeout" as McpHealth, checkedOnce: true };
          }
          return {
            ...x,
            health: "tools" as McpHealth,
            tools: x.tools.length ? x.tools : PROBE_TOOLS.map((t) => ({ ...t })),
            checkedOnce: true,
          };
        }),
      );
    }, forceTools ? 480 : 900);
  };

  const copyMcpConfig = (ids: string[]) => {
    const servers: Record<string, { command?: string; args?: string[]; url?: string; env?: Record<string, string> }> = {};
    for (const s of mcpServers.filter((x) => ids.includes(x.id))) {
      const entry: { command?: string; args?: string[]; url?: string; env?: Record<string, string> } = {};
      if (s.transport === "stdio") {
        const parts = (s.command || "").split(/\s+/).filter(Boolean);
        entry.command = parts[0] || "/bin/true";
        if (parts.length > 1) entry.args = parts.slice(1);
      } else if (s.url) entry.url = s.url;
      if (s.envRows?.length) {
        entry.env = Object.fromEntries(s.envRows.filter(([k]) => k.trim()));
      }
      servers[s.name] = entry;
    }
    const json = JSON.stringify({ mcpServers: servers }, null, 2);
    try {
      void navigator.clipboard?.writeText(json);
    } catch {
      /* */
    }
    setMcpCopyMenu(null);
    setMcpCopyFlash(true);
    window.setTimeout(() => setMcpCopyFlash(false), 1600);
    onStatus?.(t("Copied for Cursor, to paste into .cursor/mcp.json in your project"), "ok");
  };

  const saveMcp = (opts?: { signIn?: boolean }) => {
    if (!mcpEditor) return;
    const name = mcpEditor.name.trim() || "custom-server";
    const agents = [...mcpEditor.agents];
    const id = mcpEditId || `mcp-${Date.now()}`;
    const next: McpServer = {
      id,
      name,
      transport: mcpEditor.transport,
      command: mcpEditor.transport === "stdio" ? mcpEditor.command.trim() || undefined : undefined,
      url: mcpEditor.transport !== "stdio" ? mcpEditor.url.trim() || undefined : undefined,
      envRows: mcpEditor.envRows.map((r) => [r[0], r[1]] as [string, string]),
      agents,
      health: agents.length ? "checking" : "idle",
      toolsOpen: false,
      tools: [],
      checkedOnce: false,
      oauthRefused: undefined,
    };
    if (mcpEditId) {
      setMcpServers((list) =>
        list.map((x) =>
          x.id === mcpEditId
            ? {
                ...next,
                tools: x.tools,
                health: agents.length ? next.health : ("idle" as McpHealth),
                checkedOnce: x.checkedOnce,
                oauthRefused: x.oauthRefused,
              }
            : x,
        ),
      );
    } else {
      setMcpServers((list) => [...list, next]);
    }
    if (agents.includes("cursor")) onStatus?.(t("Written to Cursor"), "ok");
    if (opts?.signIn) {
      setMcpEditId(id);
      setMcpSignWaiting(true);
      setMcpOauthWall(true);
      setMcpServers((list) =>
        list.map((x) => (x.id === id ? { ...x, health: "needs-signin" as McpHealth, checkedOnce: true } : x)),
      );
      return;
    }
    setMcpEditor(null);
    setMcpEditId(null);
    if (agents.length) runMcpHealth(id);
    // no agents → stays idle "not checked"
  };
  const openHookEditor = () => {
    const d = emptyHook();
    setHookEditor(d);
    setHookSnap(JSON.stringify(d));
    setEventMenu(false);
    setEventFilter("");
    setToolMenu(false);
  };
  const tryCloseHook = () => {
    if (hookDirty) setDiscardOpen(true);
    else setHookEditor(null);
  };
  const saveHook = () => {
    if (!hookEditor) return;
    const name = hookEditor.name.trim() || "notify";
    setHooks((list) => [
      ...list,
      {
        id: `hk-${Date.now()}`,
        name,
        description: hookEditor.description.trim(),
        event: hookEditor.event,
        matcher: hookEditor.matcher,
        command: hookEditor.command,
        agents: [...hookEditor.agents],
      },
    ]);
    setHookEditor(null);
    onStatus?.(t("{name} added", { name }), "ok");
  };
  const findSkills = () => {
    const src = skillSource.trim();
    if (!src || skillLooking) return;
    setSkillLooking(true);
    setSkillProbe({ source: src });
    setProbeFilter("");
    window.setTimeout(() => {
      setSkillLooking(false);
      if (/mattpocock|github\.com\/|owner\/|skills\.sh|\//i.test(src)) {
        // Magpie probeResult: mark x.have when name already in library
        const haveNames = new Set(skills.map((s) => s.name));
        const mock = DEMO_PROBE_SKILLS.map((x) => ({ ...x, have: haveNames.has(x.name) }));
        const displaySrc = /mattpocock/i.test(src)
          ? "github.com/mattpocock/skills"
          : src.replace(/^https?:\/\//, "");
        setSkillProbe({ source: displaySrc, mock });
        // Magpie: auto-pick when few fresh; many → none (Install 0); never pick have
        const fresh = mock.filter((m) => !m.have);
        setSkillPick(fresh.length <= 3 ? new Set(fresh.map((x) => x.path)) : new Set());
      } else {
        setSkillProbe({ source: src, empty: true });
        setSkillPick(new Set());
        onStatus?.(t("No SKILL.md found there"), "warn");
      }
    }, 480);
  };
  const installSkills = () => {
    if (!skillProbe?.mock?.length || !skillPick.size || skillInstalling) return;
    // Magpie: have rows are disabled; only fresh paths go to skills/install
    const picked = skillProbe.mock.filter((m) => skillPick.has(m.path) && !m.have);
    if (!picked.length) return;
    // Magpie probeResult go: button → Installing… then skills/install → toast
    setSkillInstalling(true);
    window.setTimeout(() => {
      const haveNames = new Set(skills.map((s) => s.name));
      const fresh = picked.filter((m) => !haveNames.has(m.name));
      const had = picked.filter((m) => haveNames.has(m.name)).map((m) => m.name);
      setSkills((list) => [
        ...list,
        ...fresh.map((m) => ({ id: `sk-${Date.now()}-${m.path}`, name: m.name, desc: m.desc, kind: "github" as const, agents: ["cursor"] })),
      ]);
      const n = fresh.length;
      // Magpie report(): installed · already in the library: {names}
      const parts: string[] = [];
      if (n) parts.push(n === 1 ? t("1 skill installed") : t("{n} skills installed", { n }));
      if (had.length) parts.push(t("already in the library: {names}", { names: had.join(", ") }));
      onStatus?.(parts.join(" · ") || t("1 skill installed"), n && !had.length ? "ok" : had.length && !n ? "warn" : "ok");
      setSkillProbe(null);
      setSkillPick(new Set());
      setSkillSource("");
      setSkillInstalling(false);
    }, 720);
  };

  const instDirty = useMemo(() => sets.some((s) => s.body !== s.savedBody), [sets]);

  const saveInstructions = () => {
    if (!instDirty) return;
    setSets((list) => list.map((x) => ({ ...x, savedBody: x.body })));
    // Magpie: no agent instructions file → this toast; empty body deletes instructions.md
    onStatus?.(t("Saved — the agents already had it"), "ok");
  };

  const discardInstructions = () => {
    setSets((list) => list.map((x) => ({ ...x, body: x.savedBody })));
    setInstDiscardOpen(false);
  };

  const switchAgentsTo = (id: string) => {
    const target = sets.find((s) => s.id === id);
    if (!target || target.inUse) return;
    setSets((list) => list.map((x) => ({ ...x, inUse: x.id === id })));
    setOpenId(id);
    setInstRemoveAsk(null);
    onStatus?.(t("The agents read {name} now", { name: target.name }), "ok");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (tab === "instructions" && instDirty) {
          setSets((list) => list.map((x) => ({ ...x, savedBody: x.body })));
          onStatus?.(t("Saved — the agents already had it"), "ok");
        }
      }
      if (e.key === "Escape" && mcpCopyMenu) {
        e.preventDefault();
        e.stopPropagation();
        setMcpCopyMenu(null);
        return;
      }
      if (e.key === "Escape" && mcpEditor && !mcpOauthWall && !mcpSignWaiting) {
        // NOTES 235: Escape → Discard unsaved changes (paste-JSON fill)
        e.preventDefault();
        e.stopPropagation();
        tryCloseMcp();
        return;
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [instDirty, tab, mcpCopyMenu, mcpEditor, mcpOauthWall, mcpSignWaiting, onStatus]);

  const openSet = sets.find((s) => s.id === openId);
  const mcpHits = useMemo(() => {
    const q = mcpQ.trim().toLowerCase();
    if (!q) return DEMO_MCP;
    return DEMO_MCP.filter((c) => `${c.name} ${c.by} ${c.tag} ${c.desc}`.toLowerCase().includes(q));
  }, [mcpQ]);

  const addSet = () => {
    // NOTES 167: empty Add = no-op
    const name = newName.trim();
    if (!name) return;
    const id = `set-${Date.now()}`;
    const inUseEmpty = sets.some((s) => s.inUse && !s.body.trim() && !s.savedBody.trim());
    setSets((list) => [
      ...list.map((x) => (inUseEmpty ? { ...x, inUse: false } : x)),
      {
        id,
        name,
        body: "",
        savedBody: "",
        inUse: inUseEmpty,
        file: fileMode ? filePath.trim() || undefined : undefined,
      },
    ]);
    setOpenId(id);
    setAddingSet(false);
    setNewName("");
    setFileMode(false);
    setFilePath("~/.agents/AGENTS.md");
    setInstRemoveAsk(null);
    onStatus?.(
      inUseEmpty ? t("{name} added — the agents read it", { name }) : t("{name} added", { name }),
      "ok",
    );
  };

  const firstLine = (body: string) => {
    const line = body.split(/\r?\n/).find((l) => l.trim()) || "";
    return line.trim() || t("Empty");
  };

  return (
    <main className="view" id="view-library" style={{ animation: "view-in .24s var(--ease)" }}>
      <div className="lib-head row-head" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 6 }}>
        <div className="lib-tabs" role="tablist" aria-label={t("Library")} style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {LIB_TABS.map(([id, label]) => {
            // Magpie libHead: Skills · N / MCP · N / Hooks · N when count > 0
            const n =
              id === "skills" ? skills.length : id === "mcp" ? mcpServers.length : id === "hooks" ? hooks.length : 0;
            const shown = n ? `${t(label)} · ${n}` : t(label);
            return (
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
              {shown}
            </button>
            );
          })}
        </div>
        <div className="lib-headacts" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, flexWrap: "wrap" }}>
          {tab === "mcp" || tab === "skills" ? (
            <button
              type="button"
              className="text"
              title={tab === "skills" ? t("Go to the skills you can add, under the list") : t("Go to the MCP servers you can add, under the list")}
              onClick={() =>
                document
                  .getElementById(tab === "skills" ? "libSkillDiscover" : "libDiscover")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden style={{ marginRight: 4, verticalAlign: -2 }}>
                <path d={SEARCH} />
              </svg>
              {t("Discover")}
            </button>
          ) : null}
          <button
            type="button"
            className="text"
            title="~/.config/magpie/library"
            onClick={() => setThunarKind("library")}
          >
            <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden style={{ marginRight: 4, verticalAlign: -2 }}>
              <path d={FOLDER} />
            </svg>
            {t("Library folder")}
          </button>
          <button
            type="button"
            className="text"
            title={t("magpie keeps a copy of every file before it writes it.") + "\n~/.config/magpie/backups"}
            onClick={() => setThunarKind("backups")}
            onContextMenu={(e) => {
              // NOTES 88–100: right-click on Backups opens no menu
              e.preventDefault();
            }}
          >
            <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden style={{ marginRight: 4, verticalAlign: -2 }}>
              <path d={BACKUP} />
            </svg>
            {t("Backups")}
          </button>
        </div>
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
                const setDirtyLocal = s.body !== s.savedBody;
                // NOTES 152: while open+typing, row still says Empty if saved was empty
                const rowSub =
                  open && setDirtyLocal && !s.savedBody.trim()
                    ? t("Empty")
                    : !open && setDirtyLocal
                      ? firstLine(s.body)
                      : s.savedBody.trim()
                        ? firstLine(s.savedBody)
                        : t("Empty");
                return (
                  <div key={s.id} style={{ borderTop: "1px solid var(--line)", padding: "10px 0" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "4px 2px",
                      }}
                    >
                      <button
                        type="button"
                        className="text"
                        title={
                          s.inUse
                            ? t("The agents switched on below read this set")
                            : t("Switch the agents to this set")
                        }
                        aria-label={s.inUse ? t("In use") : t("Switch the agents to this set")}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!s.inUse) switchAgentsTo(s.id);
                        }}
                        style={{
                          width: 18,
                          height: 18,
                          padding: 0,
                          border: 0,
                          background: "transparent",
                          cursor: s.inUse ? "default" : "pointer",
                          flex: "none",
                          display: "grid",
                          placeItems: "center",
                        }}
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
                            display: "block",
                          }}
                        />
                      </button>
                      <button
                        type="button"
                        className="text"
                        title={s.name}
                        onClick={() => {
                          setOpenId(open ? null : s.id);
                          setInstRemoveAsk(null);
                        }}
                        aria-expanded={open}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          textAlign: "left",
                          padding: 0,
                          background: "transparent",
                          border: 0,
                          cursor: "pointer",
                          font: "inherit",
                        }}
                      >
                        <b style={{ display: "block", fontSize: 13, fontWeight: 560 }}>{s.name}</b>
                        <small style={{ color: "var(--muted)" }}>{rowSub}</small>
                      </button>
                      {setDirtyLocal && !open ? (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 560,
                            padding: "1px 8px",
                            borderRadius: 999,
                            background: "var(--amber-soft, #fbf0df)",
                            color: "var(--amber, #b45309)",
                            flex: "none",
                          }}
                        >
                          {t("Not saved yet")}
                        </span>
                      ) : null}
                      {s.inUse ? (
                        <span
                          title={t("The agents switched on below read this set")}
                          style={{
                            fontSize: 11,
                            fontWeight: 560,
                            padding: "1px 8px",
                            borderRadius: 999,
                            border: "1px solid var(--line)",
                            color: "var(--fg-2)",
                            flex: "none",
                          }}
                        >
                          {t("In use")}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className="text"
                        aria-label={open ? t("Collapse") : t("Expand")}
                        onClick={() => {
                          setOpenId(open ? null : s.id);
                          setInstRemoveAsk(null);
                        }}
                        style={{ width: 24, height: 24, padding: 0, border: 0, background: "transparent", color: "var(--muted)", flex: "none" }}
                      >
                        <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s var(--ease)" }}>
                          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
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
                            // Name draft does not dirty the save bar (NOTES 150)
                            setSets((list) => list.map((x) => (x.id === s.id ? { ...x, name } : x)));
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Escape") {
                              e.preventDefault();
                              // Revert uncommitted rename — Magpie restores saved/display name from last committed
                              // Demo: Default stays Default; for other sets restore from id default pattern not available,
                              // so keep name only if it matches a prior snap via saved name held in data-name.
                              const el = e.currentTarget;
                              const prev = el.getAttribute("data-saved-name") || s.name;
                              setSets((list) => list.map((x) => (x.id === s.id ? { ...x, name: prev } : x)));
                              el.blur();
                            }
                          }}
                          onFocus={(e) => {
                            e.currentTarget.setAttribute("data-saved-name", s.name);
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
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            // NOTES 153: Escape in textarea does NOT discard
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
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          {!s.inUse ? (
                            <button
                              type="button"
                              className="text"
                              onClick={() => switchAgentsTo(s.id)}
                              style={{
                                height: 28,
                                padding: "0 12px",
                                borderRadius: 8,
                                border: "1px solid var(--line)",
                                background: "var(--card)",
                                font: "inherit",
                                fontSize: 12.5,
                              }}
                            >
                              {t("Switch the agents to this set")}
                            </button>
                          ) : null}
                          {s.id !== "default" ? (
                            instRemoveAsk === s.id ? (
                              <>
                                <button
                                  type="button"
                                  className="text"
                                  disabled={s.inUse}
                                  onClick={() => {
                                    if (s.inUse) return;
                                    setSets((list) => list.filter((x) => x.id !== s.id));
                                    setInstRemoveAsk(null);
                                    if (openId === s.id) setOpenId(null);
                                    onStatus?.(t("{name} removed", { name: s.name }), "ok");
                                  }}
                                  style={{
                                    height: 28,
                                    padding: "0 12px",
                                    borderRadius: 8,
                                    border: "1px solid transparent",
                                    background: "var(--red)",
                                    color: "#fff",
                                    font: "inherit",
                                    fontSize: 12.5,
                                  }}
                                >
                                  {t("Remove {name} and its text", { name: s.name })}
                                </button>
                                <button type="button" className="text" onClick={() => setInstRemoveAsk(null)}>
                                  {t("Cancel")}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="text"
                                disabled={s.inUse}
                                title={
                                  s.inUse
                                    ? t("Switch the agents to another set before removing this one")
                                    : undefined
                                }
                                onClick={() => {
                                  if (s.inUse) return;
                                  setInstRemoveAsk(s.id);
                                }}
                                style={{
                                  height: 28,
                                  padding: "0 12px",
                                  borderRadius: 8,
                                  border: "1px solid var(--line)",
                                  background: s.inUse ? "color-mix(in srgb, var(--red) 12%, var(--card))" : "var(--card)",
                                  color: s.inUse ? "color-mix(in srgb, var(--red) 70%, var(--fg))" : "var(--fg)",
                                  font: "inherit",
                                  fontSize: 12.5,
                                  cursor: s.inUse ? "default" : "pointer",
                                  opacity: s.inUse ? 0.85 : 1,
                                }}
                              >
                                {t("Remove")}
                              </button>
                            )
                          ) : null}
                        </div>
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
                        setNewName("");
                        setFilePath("~/.agents/AGENTS.md");
                      }
                    }}
                  />
                  {fileMode ? (
                    <input
                      type="text"
                      value={filePath}
                      placeholder={t("Full path of a Markdown file")}
                      onChange={(e) => setFilePath(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Escape") {
                          setAddingSet(false);
                          setFileMode(false);
                          setNewName("");
                          setFilePath("~/.agents/AGENTS.md");
                        }
                      }}
                    />
                  ) : null}
                  <div className="bar">
                    <button
                      type="button"
                      className="text"
                      onClick={() => {
                        // Keep in a file… fills AGENTS.md + path (inline, not a picker)
                        setFileMode(true);
                        setNewName("AGENTS.md");
                        setFilePath("~/.agents/AGENTS.md");
                      }}
                    >
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
                        setFilePath("~/.agents/AGENTS.md");
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

            {instDirty && tab === "instructions" ? (
              <div
                className="lib-inst-bar"
                style={{
                  position: "sticky",
                  bottom: 8,
                  zIndex: 5,
                  marginTop: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid var(--line)",
                  background: "var(--card)",
                  boxShadow: "0 6px 20px rgba(20,22,30,.12)",
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--fg)", flex: "none" }} />
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>{t("Not saved yet")}</span>
                <span className="grow" />
                <button type="button" className="text" onClick={() => setInstDiscardOpen(true)}>
                  {t("Discard")}
                </button>
                <button
                  type="button"
                  className="text primary"
                  onClick={saveInstructions}
                  style={{ background: "var(--accent)", color: "var(--accent-fg, #fff)", borderColor: "transparent", borderRadius: 999, padding: "0 14px", height: 28 }}
                >
                  {t("Save")}
                </button>
              </div>
            ) : null}

            <div style={{ marginTop: 22 }}>
              <div className="row-head" style={{ marginBottom: 6 }}>
                <span className="label" style={{ letterSpacing: ".04em", fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                  {t("AGENTS")}
                </span>
              </div>
              <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
                {t("They read {name} · magpie writes its part between two marker lines — the rest of each file stays yours.", {
                  name: sets.find((x) => x.inUse)?.name || openSet?.name || "Default",
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
            {mcpServers.length === 0 ? (
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
                <p style={{ margin: "0 0 6px", fontWeight: 500, color: "var(--fg)" }}>{t("No servers in the library yet")}</p>
                <p style={{ margin: "0 0 12px" }}>{t("Paste a server's JSON from its README, or fill it in.")}</p>
                <button type="button" className="rt-gadd" style={{ margin: "0 auto" }} onClick={openMcpEditor}>
                  <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                    <path d="M8 3.5v9M3.5 8h9" />
                  </svg>
                  <span>{t("＋ Add a server")}</span>
                </button>
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <div className="row-head" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="label" style={{ letterSpacing: ".04em", fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{t("In the library")}</span>
                  <span className="grow" />
                  {mcpServers.length >= 2 ? (
                    <>
                      <div className="segs" style={{ display: "inline-flex", gap: 2, padding: 2, borderRadius: 9, background: "var(--bg)", border: "1px solid var(--line)" }}>
                        {([["az", "A→Z"], ["za", "Z→A"]] as const).map(([id, lab]) => (
                          <button
                            key={id}
                            type="button"
                            className={`opt${mcpSort === id ? " on" : ""}`}
                            onClick={() => setMcpSort(id)}
                            style={{
                              height: 26,
                              padding: "0 10px",
                              borderRadius: 7,
                              border: mcpSort === id ? "1px solid var(--line)" : "1px solid transparent",
                              background: mcpSort === id ? "var(--card)" : "transparent",
                              font: "inherit",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            {lab}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="text action"
                        title={t("Pick some servers and turn them on or off together")}
                        onClick={() => {
                          if (mcpSelectMode) {
                            setMcpSelectMode(false);
                            setMcpSelected(new Set());
                            setMcpCopyMenu(null);
                          } else {
                            setMcpSelectMode(true);
                            setMcpSelected(new Set());
                          }
                        }}
                      >
                        {mcpSelectMode ? t("Done") : t("Select")}
                      </button>
                      <button
                        type="button"
                        className="text action"
                        onClick={() => {
                          setMcpServers((list) =>
                            list.map((x) => ({
                              ...x,
                              agents: x.agents.includes("cursor") ? x.agents : [...x.agents, "cursor"],
                            })),
                          );
                          onStatus?.(t("Written to Cursor"), "ok");
                          mcpServers.forEach((s) => {
                            if (!s.agents.includes("cursor")) runMcpHealth(s.id, true);
                          });
                        }}
                      >
                        {t("Turn all on")}
                      </button>
                      <button type="button" className="text action" onClick={() => setMcpTurnAllOffAsk(true)}>
                        {t("Turn all off")}
                      </button>
                    </>
                  ) : null}
                  <button type="button" className="text action lib-updall" onClick={() => setMcpByAgentOpen(true)}>{t("By agent")}</button>
                  {mcpServers.length >= 2 ? (
                    <button
                      type="button"
                      className="text"
                      title={t("Take all {n} servers out of the library", { n: mcpServers.length })}
                      onClick={() => setMcpRemoveAllAsk(true)}
                      style={{ color: "var(--red)" }}
                    >
                      {t("Remove all")}
                    </button>
                  ) : null}
                </div>
                {[...mcpServers]
                  .sort((a, b) => (mcpSort === "az" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)))
                  .map((s) => {
                  const hasCursor = s.agents.includes("cursor");
                  const selected = mcpSelected.has(s.id);
                  // When no agent has it, show idle "not checked" unless already unset/checking from a manual click
                  const displayHealth: McpHealth =
                    !hasCursor && s.health !== "checking" && s.health !== "unset"
                      ? "idle"
                      : s.health;
                  const healthTitle =
                    displayHealth === "timeout"
                      ? t("No answer to initialize in 30 seconds") + "\n" + t("Click to check again")
                      : displayHealth === "tools"
                        ? t("It started and listed its tools") + "\n" + (s.toolsOpen ? t("Click to hide them") : t("Click to see them"))
                        : displayHealth === "needs-signin"
                          ? t("needs sign-in")
                          : displayHealth === "unset"
                            ? t("magpie can't check it: {name} isn't set where magpie runs. An agent started where it is set still gets it", {
                                name: s.unsetName || "NAME",
                              }) +
                              "\n" +
                              t("Click to check again")
                            : t("No agent has it, so it isn't checked on its own") + "\n" + t("Click to check it");
                  const healthLabel =
                    displayHealth === "checking"
                      ? t("checking…")
                      : displayHealth === "timeout"
                        ? t("no answer to initialize")
                        : displayHealth === "tools"
                          ? t("{n} tools", { n: s.tools.filter((x) => x.on).length || s.tools.length })
                          : displayHealth === "needs-signin"
                            ? t("needs sign-in")
                            : displayHealth === "unset"
                              ? t("{name} not set", { name: s.unsetName || "NAME" })
                              : t("not checked");
                  const healthColor =
                    displayHealth === "timeout" || displayHealth === "needs-signin" || displayHealth === "unset"
                      ? "var(--red)"
                      : displayHealth === "tools"
                        ? "var(--green)"
                        : "var(--muted)";
                  return (
                    <div
                      key={s.id}
                      className="card"
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        marginBottom: 8,
                        background: mcpSelectMode && selected ? "color-mix(in srgb, var(--accent) 8%, var(--card))" : "var(--card)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {mcpSelectMode ? (
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              setMcpSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(s.id)) next.delete(s.id);
                                else next.add(s.id);
                                return next;
                              });
                            }}
                            style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
                          />
                        ) : null}
                        <span aria-hidden style={{ fontSize: 14, color: "var(--muted)" }}>{s.transport === "stdio" ? ">_ " : "🌐"}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <b
                              style={{ fontSize: 13, cursor: mcpSelectMode ? "default" : "pointer" }}
                              onClick={() => {
                                if (mcpSelectMode) return;
                                setMcpEditId(s.id);
                                const d = emptyMcp();
                                d.name = s.name;
                                d.transport = s.transport;
                                d.command = s.command || "";
                                d.url = s.url || "";
                                d.agents = [...s.agents];
                                d.envRows = (s.envRows || []).map((r) => [r[0], r[1]] as [string, string]);
                                setMcpEditor(d);
                                setMcpSnap(JSON.stringify(d));
                                setMcpSignWaiting(false);
                              }}
                            >
                              {s.name}
                            </b>
                            <button
                                type="button"
                                className="text"
                                title={healthTitle}
                                onClick={() => {
                                  if (displayHealth === "tools") {
                                    setMcpServers((list) => list.map((x) => (x.id === s.id ? { ...x, toolsOpen: !x.toolsOpen } : x)));
                                  } else {
                                    runMcpHealth(s.id, displayHealth === "timeout" || displayHealth === "unset" || displayHealth === "idle");
                                  }
                                }}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  height: 22,
                                  padding: "0 2px",
                                  border: 0,
                                  background: "transparent",
                                  color: healthColor,
                                  font: "inherit",
                                  fontSize: 12,
                                  cursor: "pointer",
                                }}
                              >
                                <span
                                  style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: "50%",
                                    background: healthColor,
                                    opacity: displayHealth === "checking" ? 0.55 : 1,
                                    animation: displayHealth === "checking" ? "pm-pulse 1s ease-in-out infinite" : undefined,
                                  }}
                                />
                                {healthLabel}
                                {displayHealth === "tools" ? (
                                  <span style={{ display: "inline-block", transform: s.toolsOpen ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform .15s" }}>›</span>
                                ) : null}
                              </button>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {s.transport === "stdio" ? s.command || "—" : s.url || "—"}
                          </div>
                        </div>
                        {!mcpSelectMode ? (
                        <LibChip
                          iconOnly
                          on={hasCursor}
                          label="Cursor"
                          title={
                            hasCursor
                              ? t("{agent} has it — click to take it away", { agent: "Cursor" })
                              : t("Give it to {agent}", { agent: "Cursor" })
                          }
                          onClick={() => {
                            setMcpServers((list) =>
                              list.map((x) => {
                                if (x.id !== s.id) return x;
                                const on = x.agents.includes("cursor");
                                const agents = on ? x.agents.filter((a) => a !== "cursor") : [...x.agents, "cursor"];
                                return {
                                  ...x,
                                  agents,
                                  toolsOpen: on ? false : x.toolsOpen,
                                  health: on && agents.length === 0 ? ("idle" as McpHealth) : x.health,
                                };
                              }),
                            );
                            onStatus?.(hasCursor ? t("Removed from Cursor") : t("Written to Cursor"), "ok");
                            if (!hasCursor) runMcpHealth(s.id, true);
                          }}
                        />
                        ) : null}
                      </div>
                      {s.toolsOpen && displayHealth === "tools" ? (
                        <div
                          style={{
                            marginTop: 10,
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid var(--line)",
                            background: "var(--card-2, var(--bg))",
                          }}
                        >
                          {s.tools.map((tool) => (
                            <div
                              key={tool.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "8px 0",
                                borderBottom: "1px solid var(--line)",
                                opacity: tool.on ? 1 : 0.55,
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <b style={{ fontSize: 13 }}>{tool.name}</b>
                                <div style={{ fontSize: 12, color: "var(--muted)" }}>{tool.desc}</div>
                              </div>
                              <button
                                type="button"
                                className={`lib-switch${tool.on ? " on" : ""}`}
                                role="switch"
                                aria-checked={tool.on}
                                aria-label={tool.name}
                                onClick={() => {
                                  setMcpServers((list) =>
                                    list.map((x) =>
                                      x.id !== s.id
                                        ? x
                                        : {
                                            ...x,
                                            tools: x.tools.map((tt) => (tt.id === tool.id ? { ...tt, on: !tt.on } : tt)),
                                          },
                                    ),
                                  );
                                  onStatus?.(t("Tools of {name} saved", { name: s.name }), "ok");
                                }}
                              >
                                <i />
                              </button>
                            </div>
                          ))}
                          {hasCursor ? (
                            <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
                              {t("Cursor can't turn off single tools: they get every tool of the server.")}
                            </p>
                          ) : null}
                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                            <button type="button" className="text" onClick={() => runMcpHealth(s.id, true)}>
                              {t("Check again")}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {mcpSelectMode ? (
                  <div
                    style={{
                      position: "sticky",
                      bottom: 8,
                      zIndex: 6,
                      marginTop: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                      padding: "8px 12px",
                      borderRadius: 999,
                      border: "1px solid var(--line)",
                      background: "var(--card)",
                      boxShadow: "0 6px 20px rgba(20,22,30,.12)",
                    }}
                  >
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={mcpSelected.size === mcpServers.length && mcpServers.length > 0}
                        onChange={() => {
                          if (mcpSelected.size === mcpServers.length) setMcpSelected(new Set());
                          else setMcpSelected(new Set(mcpServers.map((x) => x.id)));
                        }}
                        style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
                      />
                      {mcpSelected.size === 0
                        ? t("All {n}", { n: mcpServers.length })
                        : t("{n} selected", { n: mcpSelected.size })}
                    </label>
                    {mcpSelected.size === 0 ? (
                      <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("Pick servers to turn them on or off together")}</span>
                    ) : (
                      <>
                        <LibChip
                          iconOnly
                          on={false}
                          label="Cursor"
                          title={t("Give it to {agent}", { agent: "Cursor" })}
                          onClick={() => {
                            const ids = mcpSelected;
                            setMcpServers((list) =>
                              list.map((x) =>
                                ids.has(x.id)
                                  ? { ...x, agents: x.agents.includes("cursor") ? x.agents : [...x.agents, "cursor"] }
                                  : x,
                              ),
                            );
                            onStatus?.(t("Written to Cursor"), "ok");
                            ids.forEach((id) => runMcpHealth(id, true));
                          }}
                        />
                        <div style={{ position: "relative" }}>
                          <button
                            type="button"
                            className="text action"
                            title={t("Copy these servers as an agent's project file has them, to paste into a project yourself")}
                            onClick={() => setMcpCopyMenu((m) => (m === "bar" ? null : "bar"))}
                          >
                            {mcpCopyFlash && mcpCopyMenu === null ? "✓ " : ""}
                            {t("Copy config…")}
                          </button>
                          {mcpCopyMenu === "bar" ? (
                            <div
                              style={{
                                position: "absolute",
                                bottom: "100%",
                                left: 0,
                                marginBottom: 6,
                                minWidth: 220,
                                padding: "6px 0",
                                borderRadius: 10,
                                border: "1px solid var(--line)",
                                background: "var(--card)",
                                boxShadow: "0 10px 28px rgba(20,22,30,.16)",
                                zIndex: 8,
                              }}
                            >
                              <div style={{ padding: "4px 12px 6px", fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                                {t("Copy as an agent's project file")}
                              </div>
                              <button
                                type="button"
                                className="text"
                                style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: 0, background: "transparent", font: "inherit", fontSize: 13, cursor: "pointer" }}
                                onClick={() => copyMcpConfig([...mcpSelected])}
                              >
                                Cursor
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="text"
                          style={{ color: "var(--red)" }}
                          onClick={() => setMcpRemoveSelectedAsk(true)}
                        >
                          {t("Remove…")}
                        </button>
                        <button
                          type="button"
                          className="text"
                          onClick={() => setMcpSelected(new Set())}
                        >
                          {t("Clear")}
                        </button>
                      </>
                    )}
                    <span className="grow" />
                    <button
                      type="button"
                      className="text"
                      onClick={() => {
                        setMcpSelectMode(false);
                        setMcpSelected(new Set());
                        setMcpCopyMenu(null);
                      }}
                    >
                      {t("Done")}
                    </button>
                  </div>
                ) : null}

                <button type="button" className="rt-gadd" style={{ marginTop: 4 }} onClick={openMcpEditor}>
                  <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                    <path d="M8 3.5v9M3.5 8h9" />
                  </svg>
                  <span>{t("＋ Add server")}</span>
                </button>

                {/* MCP In projects */}
                <div style={{ marginTop: 18 }}>
                  <div className="row-head" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="label" style={{ letterSpacing: ".04em", fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{t("In projects")}</span>
                    <span className="grow" />
                    {!mcpAddingProject ? (
                      <button type="button" className="text action lib-updall" onClick={() => setMcpAddingProject({ dir: "" })}>
                        {t("Add a project")}
                      </button>
                    ) : null}
                  </div>
                  {mcpAddingProject ? (
                    <div className="list lib-card" style={{ padding: "10px 8px", border: "1px solid var(--line)", borderRadius: 12, marginBottom: 8 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                        <span aria-hidden>📁</span>
                        <input
                          type="text"
                          spellCheck={false}
                          placeholder={t("The project's folder, like ~/code/app")}
                          value={mcpAddingProject.dir}
                          disabled={!!mcpAddingProject.busy}
                          onChange={(e) => setMcpAddingProject({ ...mcpAddingProject, dir: e.target.value })}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Escape") setMcpAddingProject(null);
                          }}
                          style={{ flex: "1 1 180px", minWidth: 0 }}
                        />
                        <button type="button" className="text" disabled>{t("Choose…")}</button>
                        <button
                          type="button"
                          className="text action"
                          disabled={!!mcpAddingProject.busy}
                          onClick={() => {
                            const dir = mcpAddingProject.dir.trim();
                            if (!dir || mcpAddingProject.busy) return;
                            setMcpAddingProject({ ...mcpAddingProject, busy: true });
                            window.setTimeout(() => {
                              const name = dir.split("/").filter(Boolean).pop() || dir;
                              setMcpProjects((list) =>
                                list.some((x) => x.dir === dir)
                                  ? list.map((x) => (x.dir === dir ? { ...x, open: true } : x))
                                  : [...list, { dir, name, open: true, placed: {} }],
                              );
                              setMcpAddingProject(null);
                              onStatus?.(t("{name} added — pick the servers it gets", { name }), "ok");
                            }, 350);
                          }}
                        >
                          {t("Add")}
                        </button>
                        <button type="button" className="text" onClick={() => setMcpAddingProject(null)}>{t("Cancel")}</button>
                      </div>
                    </div>
                  ) : null}
                  {mcpProjects.length ? (
                    mcpProjects.map((pr) => (
                      <div key={pr.dir} className="card" style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button type="button" className="text" onClick={() => setMcpProjects((list) => list.map((x) => (x.dir === pr.dir ? { ...x, open: !x.open } : x)))} style={{ border: 0, background: "transparent", padding: 0, font: "inherit", textAlign: "left", flex: 1, cursor: "pointer" }}>
                            <b style={{ fontSize: 13 }}>{pr.name}</b>
                            <div style={{ fontSize: 12, color: "var(--muted)" }}>{pr.dir}</div>
                          </button>
                          <button
                            type="button"
                            className="text"
                            title={t("Remove the project")}
                            onClick={() => setMcpProjectRemove({ dir: pr.dir, name: pr.name })}
                            style={{ width: 28, height: 28, padding: 0 }}
                          >
                            🗑
                          </button>
                        </div>
                        {pr.open ? (
                          <div style={{ marginTop: 10 }}>
                            {mcpServers.map((srv) => {
                              const on = (pr.placed[srv.id] || []).includes("cursor");
                              return (
                                <div key={srv.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid var(--line)" }}>
                                  <b style={{ flex: 1, fontSize: 13 }}>{srv.name}</b>
                                  <LibChip
                                    iconOnly
                                    on={on}
                                    label="Cursor"
                                    title={on ? t("{agent} has it — click to take it away", { agent: "Cursor" }) : t("Give it to {agent}", { agent: "Cursor" })}
                                    onClick={() => {
                                      setMcpProjects((list) =>
                                        list.map((x) => {
                                          if (x.dir !== pr.dir) return x;
                                          const cur = x.placed[srv.id] || [];
                                          const has = cur.includes("cursor");
                                          const placed = { ...x.placed };
                                          if (has) delete placed[srv.id];
                                          else placed[srv.id] = ["cursor"];
                                          return { ...x, placed };
                                        }),
                                      );
                                      onStatus?.(
                                        on
                                          ? t("{server} is out of {name}", { server: srv.name, name: pr.name })
                                          : t("{server} is in {name} for {agent}", { server: srv.name, name: pr.name, agent: "Cursor" }),
                                        "ok",
                                      );
                                    }}
                                  />
                                </div>
                              );
                            })}
                            <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
                              {t("Written into .cursor/mcp.json of the project, leaving the rest of each file as it is. Claude Code asks before it starts a project's servers; Codex reads .codex/config.toml, and Pi .pi/mcp.json, only in a project you trust.")}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : !mcpAddingProject ? (
                    <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
                      {t("Give a project's agents some of these servers as the project's own: magpie writes them into its .cursor/mcp.json, leaving the rest of each file as it is.")}
                    </p>
                  ) : null}
                </div>
              </div>
            )}

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
                          if ((c as { sheet?: boolean }).sheet) {
                            setImageSheet(true);
                            return;
                          }
                          if (mcpServers.some((s) => s.id === c.id)) {
                            onStatus?.(t("Already in the library"), "warn");
                            return;
                          }
                          const id = c.id;
                          setMcpServers((s) => [
                            ...s,
                            {
                              id,
                              name: c.name,
                              transport: "stdio" as Transport,
                              command: `npx -y ${c.id}`,
                              agents: ["cursor"],
                              health: "checking" as McpHealth,
                              toolsOpen: false,
                              tools: [],
                            },
                          ]);
                          onStatus?.(t("Written to Cursor"), "ok");
                          window.setTimeout(() => runMcpHealth(id, true), 0);
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

        ) : tab === "skills" ? (
          <>
            <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
              {t("A skill is a folder with a SKILL.md an agent loads when it's needed. The library keeps each one once and links it into the agents you pick.")}
            </p>
            <div className="card lib-install" style={{ padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 12, marginBottom: 16 }}>
              <div className="lib-find" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`lib-icon${skillLooking ? " busy" : ""}`} aria-hidden>
                  <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.3">
                    <path d={SEARCH} />
                  </svg>
                </span>
                <input
                  type="text"
                  value={skillSource}
                  placeholder={t("owner/repo, a GitHub link, or a folder on this computer")}
                  onChange={(e) => setSkillSource(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") findSkills();
                    if (e.key === "Escape" && skillProbe) {
                      setSkillProbe(null);
                      setSkillPick(new Set());
                    }
                  }}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button type="button" className={`text action${skillLooking ? " busy" : ""}`} disabled={skillLooking || !skillSource.trim()} onClick={findSkills}>
                  {skillLooking ? t("Looking…") : t("Find skills")}
                </button>
              </div>
              {skillProbe?.empty ? (
                <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--muted)" }}>
                  {t("No skills there — a skill is a folder with a SKILL.md in it.")}
                </div>
              ) : null}
              {skillProbe?.mock ? (
                <div className="lib-probe" style={{ marginTop: 12 }}>
                  <div className="row-head" style={{ marginBottom: 8, fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>
                      {skillProbe.mock.length === 1
                        ? t("1 skill in {src}", { src: skillProbe.source })
                        : t("{n} skills in {src}", { n: skillProbe.mock.length, src: skillProbe.source })}
                    </span>
                    <span className="grow" />
                    {(() => {
                      // Magpie: Select all only when fresh.length > 1 (have excluded)
                      const freshVis = skillProbe.mock!.filter((m) => {
                        if (m.have) return false;
                        const q = probeFilter.trim().toLowerCase();
                        if (!q) return true;
                        return `${m.name} ${m.desc}`.toLowerCase().includes(q);
                      });
                      if (freshVis.length <= 1) return null;
                      const allOn = freshVis.every((m) => skillPick.has(m.path));
                      return (
                        <button
                          type="button"
                          className="text"
                          onClick={() => {
                            setSkillPick((prev) => {
                              const next = new Set(prev);
                              if (allOn) freshVis.forEach((m) => next.delete(m.path));
                              else freshVis.forEach((m) => next.add(m.path));
                              return next;
                            });
                          }}
                        >
                          {allOn ? t("Select none") : t("Select all")}
                        </button>
                      );
                    })()}
                  </div>
                  {skillProbe.mock.length > 8 ? (
                    <input
                      type="search"
                      value={probeFilter}
                      placeholder={t("Filter…")}
                      onChange={(e) => setProbeFilter(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      style={{ width: "100%", maxWidth: 320, marginBottom: 8 }}
                    />
                  ) : null}
                  {(skillProbe.left || []).map((x) => (
                    <div key={x.path} className="lib-none lib-left" style={{ marginBottom: 8, fontSize: 12.5, color: "var(--muted)" }}>
                      {t("{name} is too big to install: {size}, over the {limit} a skill may be", {
                        name: x.path.split("/").pop() || skillProbe.source,
                        size: `${Math.round(x.size / 1048576)} MB`,
                        limit: "200 MB",
                      })}
                    </div>
                  ))}
                  <div className="lib-picks" style={{ maxHeight: 220, overflow: "auto" }}>
                    {skillProbe.mock
                      .filter((m) => {
                        const q = probeFilter.trim().toLowerCase();
                        if (!q) return true;
                        return `${m.name} ${m.desc}`.toLowerCase().includes(q);
                      })
                      .map((m) => (
                        <label
                          key={m.path}
                          className={`lib-pick${m.have ? " dim" : ""}`}
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "flex-start",
                            padding: "6px 0",
                            borderTop: "1px solid var(--line)",
                            cursor: m.have ? "default" : "pointer",
                            opacity: m.have ? 0.55 : 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={skillPick.has(m.path)}
                            disabled={!!m.have || skillInstalling}
                            onChange={(e) => {
                              if (m.have) return;
                              setSkillPick((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(m.path);
                                else next.delete(m.path);
                                return next;
                              });
                            }}
                          />
                          <span className="who" style={{ flex: 1, minWidth: 0 }}>
                            <b className="name" style={{ display: "block", fontSize: 13 }}>{m.name}</b>
                            <small className="sub" style={{ color: "var(--muted)" }}>{m.desc}</small>
                          </span>
                          {m.have ? (
                            <span className="tag" style={{ fontSize: 10.5, color: "var(--muted)", whiteSpace: "nowrap", marginTop: 2 }}>
                              {t("in the library")}
                            </span>
                          ) : null}
                        </label>
                      ))}
                  </div>
                  <div className="bar" style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("for")}</span>
                    <LibChip on label="Cursor" onClick={() => {}} />
                    <span className="grow" />
                    <button
                      type="button"
                      className="text"
                      disabled={skillInstalling}
                      onClick={() => {
                        if (skillInstalling) return;
                        setSkillProbe(null);
                        setSkillPick(new Set());
                        setProbeFilter("");
                      }}
                    >
                      {t("Cancel")}
                    </button>
                    <button
                      type="button"
                      className={`text primary${skillInstalling ? " busy" : ""}`}
                      disabled={!skillPick.size || skillInstalling}
                      onClick={installSkills}
                    >
                      {skillInstalling
                        ? t("Installing…")
                        : skillPick.size === 0
                          ? t("Install 0 skills")
                          : skillPick.size === 1
                            ? t("Install 1 skill")
                            : t("Install {n} skills", { n: skillPick.size })}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {skills.length === 0 ? (
              <div style={{ padding: "8px 2px", color: "var(--muted)", fontSize: 13 }}>{t("No skills in the library yet — find some above.")}</div>
            ) : (
              <>
                <div style={{ marginTop: 14 }}>
                  <div className="row-head" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="label" style={{ letterSpacing: ".04em", fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{t("In the library")}</span>
                    <span className="grow" />
                    <button
                      type="button"
                      className="text action lib-updall lib-byagent"
                      title={t("Turn every skill on or off for one agent")}
                      onClick={() => setSkillsByAgentOpen(true)}
                    >
                      {t("By agent")}
                    </button>
                    {skills.some((s) => s.kind === "github") ? (
                    <button
                      type="button"
                      className={`text lib-updall${skillChecking ? " busy" : ""}`}
                      title={t("Ask GitHub which skills changed since they were installed")}
                      disabled={skillChecking}
                      onClick={() => {
                        setSkillChecking(true);
                        window.setTimeout(() => {
                          setSkillChecking(false);
                          onStatus?.(t("Every skill is up to date"), "ok");
                        }, 680);
                      }}
                    >
                      {skillChecking ? t("Checking…") : t("Check for updates")}
                    </button>
                    ) : null}
                  </div>
                  {skills.map((s) => (
                    <div key={s.id} className="row lib-row lib-skill" style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 4px", borderBottom: "1px solid var(--line)" }}>
                      <div className="who" style={{ flex: 1, minWidth: 0 }}>
                        <b className="name" style={{ fontSize: 13 }}>{s.name}</b>
                        <div className="sub" style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>{s.desc}</div>
                        {s.kind === "github" ? (
                          <div className="lib-src" style={{ fontSize: 11.5, marginTop: 2 }}>
                            <a
                              className="lib-srclink"
                              href={`https://github.com/mattpocock/skills/tree/HEAD/skills/engineering/${s.name}`}
                              onClick={(e) => { e.preventDefault(); onStatus?.(t("Demo: open GitHub"), "ok"); }}
                              style={{ color: "var(--accent)", textDecoration: "none" }}
                            >
                              {`mattpocock/skills/tree/HEAD/skills/engineering/${s.name}`}
                            </a>
                          </div>
                        ) : null}
                      </div>
                      <div className="lib-rowacts" style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                        {s.kind === "github" ? (
                          <button
                            type="button"
                            className="lib-icon text"
                            title={
                              t("Update from GitHub") +
                              "\n" +
                              t("Up to date with GitHub") +
                              "\n" +
                              "ask-matt: read a skill's SKILL.md before asserting or skipping its steps" +
                              "\n" +
                              "10/7/2026 · 954ee7f"
                            }
                            aria-label={t("Update from GitHub")}
                            onClick={() => onStatus?.(t("{name} is up to date", { name: s.name }), "ok")}
                            style={{ width: 28, height: 28, padding: 0, fontSize: 14, lineHeight: 1 }}
                          >
                            ↑
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="lib-icon danger text"
                          title={t("Remove")}
                          aria-label={t("Remove")}
                          onClick={() => setSkillRemoveConfirm({ id: s.id, name: s.name })}
                          style={{ width: 28, height: 28, padding: 0, fontSize: 14, lineHeight: 1, color: "var(--red)" }}
                        >
                          🗑
                        </button>
                        <LibChip
                          iconOnly
                          on={(s.agents ?? ["cursor"]).includes("cursor")}
                          label="Cursor"
                          title={
                            (s.agents ?? ["cursor"]).includes("cursor")
                              ? t("{agent} has it — click to take it away", { agent: "Cursor" })
                              : t("Give it to {agent}", { agent: "Cursor" })
                          }
                          onClick={() => {
                            const has = (s.agents ?? ["cursor"]).includes("cursor");
                            setSkills((list) =>
                              list.map((x) =>
                                x.id !== s.id
                                  ? x
                                  : {
                                      ...x,
                                      agents: has
                                        ? (x.agents ?? ["cursor"]).filter((a) => a !== "cursor")
                                        : [...(x.agents ?? []).filter((a) => a !== "cursor"), "cursor"],
                                    },
                              ),
                            );
                            onStatus?.(
                              has ? t("Removed from {agent}", { agent: "Cursor" }) : t("Written to {agent}", { agent: "Cursor" }),
                              "ok",
                            );
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Magpie skillHowBar — CU 75–78 Links↔Copies + Saving… */}
                <div className="lib-skillhow" style={{ marginTop: 14, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <span className="label" style={{ letterSpacing: ".04em", fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{t("Give skills as")}</span>
                  <div
                    className="segs"
                    ref={setSkillHowSeg}
                    style={{ display: "inline-flex", gap: 2, padding: 2, borderRadius: 999, border: "1px solid var(--line)", background: "var(--bg)", position: "relative" }}
                  >
                    {([["link", "Links"], ["copy", "Copies"]] as const).map(([id, lab]) => {
                      const saving = skillHowBusy === id;
                      const on = !skillHowBusy && skillHow === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`opt${on ? " on" : ""}${saving ? " busy saving" : ""}`}
                          disabled={!!skillHowBusy}
                          aria-busy={saving || undefined}
                          onClick={() => {
                            if (skillHow === id || skillHowBusy) return;
                            // Magpie change(): pressed opt → Saving… + footer Saving… then toast
                            setSkillHowBusy(id);
                            onStatus?.(t("Saving…"), "", 120000);
                            window.setTimeout(() => {
                              setSkillHow(id);
                              setSkillHowBusy(null);
                              onStatus?.(
                                id === "copy" ? t("The agents get copies of their skills now") : t("The agents get links to their skills now"),
                                "ok",
                              );
                            }, 450);
                          }}
                          style={{
                            height: 26,
                            padding: "0 10px",
                            borderRadius: 999,
                            border: 0,
                            background: on || saving ? "var(--card)" : "transparent",
                            color: on || saving ? "var(--fg)" : "var(--muted)",
                            font: "inherit",
                            fontSize: 12,
                            cursor: skillHowBusy ? "default" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            zIndex: 1,
                          }}
                        >
                          {saving ? (
                            <>
                              <span className="spin" aria-hidden style={{ width: 11, height: 11, display: "inline-block" }} />
                              {t("Saving…")}
                            </>
                          ) : (
                            t(lab)
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" className="text action lib-updall lib-howagent" title={t("Give an agent its skills its own way")} disabled={!!skillHowBusy} onClick={() => { setAgentHow(""); setSkillHowOpen(true); }}>
                    {t("By agent")}
                  </button>
                  <span style={{ fontSize: 12, color: "var(--muted)", flex: "1 1 220px" }}>
                    {skillHow === "copy"
                      ? t("Each agent gets a folder of its own, made again when the library's skill changes; edits made in a copy are replaced.")
                      : t("Links follow the library's skill: an update reaches the agents at once.")}
                  </span>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div className="row-head" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="label" style={{ letterSpacing: ".04em", fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{t("In projects")}</span>
                    <span className="grow" />
                    {!addingProject ? (
                      <button type="button" className="text action lib-updall" onClick={() => setAddingProject({ dir: "" })}>{t("Add a project")}</button>
                    ) : null}
                  </div>
                  {addingProject ? (
                    <div className="list lib-card lib-install" style={{ padding: "10px 8px", border: "1px solid var(--line)", borderRadius: 12, marginBottom: 8 }}>
                      <div className="lib-find" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                        <span aria-hidden style={{ fontSize: 14, color: "var(--muted)" }}>📁</span>
                        <input
                          ref={projectPathRef}
                          type="text"
                          spellCheck={false}
                          autoComplete="off"
                          placeholder={t("The project's folder, like ~/code/app")}
                          value={addingProject.dir}
                          disabled={!!addingProject.busy}
                          onChange={(e) => setAddingProject({ ...addingProject, dir: e.target.value })}
                          onKeyDown={(e) => {
                            // NOTES 117–118: Escape closes sheet only when path field focused
                            e.stopPropagation();
                            if (e.key === "Escape") {
                              setAddingProject(null);
                              setChooseProjectOpen(false);
                              return;
                            }
                            if (e.key === "Enter") {
                              const dir = addingProject.dir.trim();
                              if (!dir || addingProject.busy) return;
                              setAddingProject({ ...addingProject, busy: true });
                              window.setTimeout(() => {
                                const name = dir.split("/").filter(Boolean).pop() || dir;
                                setProjects((list) =>
                                  list.some((x) => x.dir === dir)
                                    ? list.map((x) => (x.dir === dir ? { ...x, open: true } : x))
                                    : [...list, { dir, name, open: true, copy: false, placed: {} }],
                                );
                                setAddingProject(null);
                                onStatus?.(t("{name} added — pick the skills it gets", { name }), "ok");
                              }, 400);
                            }
                          }}
                          style={{ flex: "1 1 180px", minWidth: 0 }}
                        />
                        <button
                          type="button"
                          className="text"
                          disabled={!!addingProject.busy}
                          onClick={() => setChooseProjectOpen(true)}
                        >
                          {t("Choose…")}
                        </button>
                        <button
                          type="button"
                          className="text action"
                          disabled={!!addingProject.busy}
                          onClick={() => {
                            const dir = addingProject.dir.trim();
                            // NOTES 112: empty Add = no-op
                            if (!dir || addingProject.busy) return;
                            setAddingProject({ ...addingProject, busy: true });
                            window.setTimeout(() => {
                              const name = dir.split("/").filter(Boolean).pop() || dir;
                              setProjects((list) =>
                                list.some((x) => x.dir === dir)
                                  ? list.map((x) => (x.dir === dir ? { ...x, open: true } : x))
                                  : [...list, { dir, name, open: true, copy: false, placed: {} }],
                              );
                              setAddingProject(null);
                              onStatus?.(t("{name} added — pick the skills it gets", { name }), "ok");
                            }, 400);
                          }}
                        >
                          {addingProject.busy ? t("Adding…") : t("Add")}
                        </button>
                        <button
                          type="button"
                          className="text"
                          disabled={!!addingProject.busy}
                          onClick={() => {
                            setAddingProject(null);
                            setChooseProjectOpen(false);
                          }}
                        >
                          {t("Cancel")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {projects.length ? (
                    <div style={{ marginBottom: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                      {projects.map((pr) => {
                        const placedIds = Object.keys(pr.placed).filter((id) => (pr.placed[id] || []).length > 0);
                        const hasPlaced = placedIds.length > 0;
                        return (
                          <div
                            key={pr.dir}
                            className="card lib-project"
                            onContextMenu={(e) => e.preventDefault()}
                            style={{
                              border: "1px solid var(--line)",
                              borderRadius: 12,
                              padding: pr.open ? "10px 12px 12px" : "8px 10px",
                              background: "var(--card)",
                            }}
                          >
                            <div
                              className="lib-project-head"
                              style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
                            >
                              <button
                                type="button"
                                className="text"
                                title={pr.open ? t("Hide its skills") : t("Pick the skills it gets")}
                                aria-label={pr.open ? t("Hide its skills") : t("Pick the skills it gets")}
                                onClick={() =>
                                  setProjects((list) => list.map((x) => (x.dir === pr.dir ? { ...x, open: !x.open } : x)))
                                }
                                style={{ width: 28, height: 28, padding: 0, flex: "none", border: 0, background: "transparent", fontSize: 14 }}
                              >
                                📁
                              </button>
                              <button
                                type="button"
                                className="text"
                                title={pr.name}
                                onClick={() =>
                                  setProjects((list) => list.map((x) => (x.dir === pr.dir ? { ...x, open: !x.open } : x)))
                                }
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  textAlign: "left",
                                  border: 0,
                                  background: "transparent",
                                  padding: 0,
                                  font: "inherit",
                                  cursor: "pointer",
                                }}
                              >
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  <b style={{ fontSize: 13, fontWeight: 560 }}>{pr.name}</b>
                                  {pr.copy ? (
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 560,
                                        padding: "1px 7px",
                                        borderRadius: 999,
                                        border: "1px solid var(--line)",
                                        color: "var(--fg-2)",
                                      }}
                                    >
                                      {t("Copies")}
                                    </span>
                                  ) : null}
                                </span>
                                <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {pr.dir}
                                </div>
                              </button>
                              {!pr.open && hasPlaced
                                ? placedIds.map((sid) => {
                                    const sk = skills.find((s) => s.id === sid);
                                    return sk ? (
                                      <span
                                        key={sid}
                                        style={{
                                          fontSize: 11.5,
                                          padding: "2px 8px",
                                          borderRadius: 999,
                                          border: "1px solid var(--line)",
                                          color: "var(--fg-2)",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 5,
                                          flex: "none",
                                        }}
                                      >
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--muted)" }} />
                                        {sk.name}
                                      </span>
                                    ) : null;
                                  })
                                : null}
                              <button
                                type="button"
                                className="text lib-icon"
                                title={t("Remove the project")}
                                aria-label={t("Remove the project")}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = "var(--red)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = "";
                                }}
                                onClick={() =>
                                  setProjectRemove({ dir: pr.dir, name: pr.name, keep: false, dirty: false })
                                }
                                style={{ width: 28, height: 28, padding: 0, flex: "none", fontSize: 14 }}
                              >
                                🗑
                              </button>
                              <button
                                type="button"
                                className="text"
                                aria-label={pr.open ? t("Hide its skills") : t("Pick the skills it gets")}
                                onClick={() =>
                                  setProjects((list) => list.map((x) => (x.dir === pr.dir ? { ...x, open: !x.open } : x)))
                                }
                                style={{ width: 24, height: 28, padding: 0, flex: "none", border: 0, background: "transparent", color: "var(--muted)" }}
                              >
                                <span style={{ display: "inline-block", transform: pr.open ? "rotate(90deg)" : "none", transition: "transform .15s var(--ease)" }}>›</span>
                              </button>
                            </div>

                            {pr.open ? (
                              <div style={{ marginTop: 10, animation: "fade-in .18s var(--ease)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                                  <button
                                    type="button"
                                    className={`lib-switch${pr.copy ? " on" : ""}`}
                                    role="switch"
                                    aria-checked={pr.copy}
                                    aria-label={t("Copy files instead of linking")}
                                    onClick={() => {
                                      const next = !pr.copy;
                                      setProjects((list) =>
                                        list.map((x) => (x.dir === pr.dir ? { ...x, copy: next } : x)),
                                      );
                                      onStatus?.(
                                        next
                                          ? t("{name} gets copies now", { name: pr.name })
                                          : t("{name} gets links now", { name: pr.name }),
                                        "ok",
                                      );
                                    }}
                                  >
                                    <i />
                                  </button>
                                  <span style={{ fontSize: 12.5, color: "var(--fg)" }}>{t("Copy files instead of linking")}</span>
                                  <span style={{ fontSize: 12, color: "var(--muted)", flex: "1 1 180px" }}>
                                    {pr.copy
                                      ? t("Copies are made again whenever the library's skill changes; edits made to them are replaced.")
                                      : t("Links follow the library's skill: an update reaches the project at once.")}
                                  </span>
                                </div>

                                <div className="list" style={{ marginBottom: 8 }}>
                                  {skills.length === 0 ? (
                                    <p style={{ margin: "4px 0", fontSize: 12.5, color: "var(--muted)" }}>
                                      {t("No skills in the library yet.")}
                                    </p>
                                  ) : (
                                    skills.map((s) => {
                                      const on = (pr.placed[s.id] || []).includes("cursor");
                                      return (
                                        <div
                                          key={s.id}
                                          className="row"
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                            padding: "8px 2px",
                                            borderBottom: "1px solid var(--line)",
                                          }}
                                        >
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <b style={{ fontSize: 13 }}>{s.name}</b>
                                            <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                              {s.desc}
                                            </div>
                                          </div>
                                          <LibChip
                                            iconOnly
                                            on={on}
                                            label="Cursor"
                                            title={
                                              on
                                                ? t("{agent} has it — click to take it away", { agent: "Cursor" })
                                                : t("Give it to {agent}", { agent: "Cursor" })
                                            }
                                            onClick={() => {
                                              setProjects((list) =>
                                                list.map((x) => {
                                                  if (x.dir !== pr.dir) return x;
                                                  const cur = x.placed[s.id] || [];
                                                  const has = cur.includes("cursor");
                                                  const nextAgents = has ? cur.filter((a) => a !== "cursor") : [...cur, "cursor"];
                                                  const placed = { ...x.placed };
                                                  if (nextAgents.length) placed[s.id] = nextAgents;
                                                  else delete placed[s.id];
                                                  return { ...x, placed };
                                                }),
                                              );
                                              onStatus?.(
                                                on
                                                  ? t("{skill} is out of {name}", { skill: s.name, name: pr.name })
                                                  : t("{skill} is in {name} for {agent}", {
                                                      skill: s.name,
                                                      name: pr.name,
                                                      agent: "Cursor",
                                                    }),
                                                "ok",
                                              );
                                            }}
                                          />
                                        </div>
                                      );
                                    })
                                  )}
                                </div>

                                <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
                                  {t("Placed in .agents/skills of the project and listed in its .gitignore. A folder there that isn't magpie's is left as it is.")}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : !addingProject ? (
                    <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
                      {t("Give a project's agents some of these skills as the project's own: magpie links them into its .claude/skills and .agents/skills and keeps them out of git.")}
                    </p>
                  ) : null}
                </div>
              </>
            )}

            <div id="libSkillDiscover" style={{ marginTop: 18 }}>
              <div className="row-head" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="label" style={{ letterSpacing: ".04em", fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{t("DISCOVER")}</span>
                <span className="grow" />
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("Popular on skills.sh")}</span>
              </div>
              <input
                type="search"
                value={skillQ}
                placeholder={t("Search skills on skills.sh — react, pdf, testing…")}
                onChange={(e) => setSkillQ(e.target.value)}
                style={{ width: "100%", maxWidth: 420, marginBottom: 12 }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {DEMO_SKILLS_MARKET.filter((c) => {
                  const q = skillQ.trim().toLowerCase();
                  if (!q) return true;
                  return `${c.name} ${c.by} ${c.desc}`.toLowerCase().includes(q);
                }).map((c) => (
                  <div key={c.id} className="card" style={{ padding: "12px 12px 10px", border: "1px solid var(--line)", borderRadius: 12, animation: "fade-in .18s var(--ease)", display: "flex", flexDirection: "column", gap: 6, minHeight: 120 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <b style={{ fontSize: 13 }}>{c.name}</b>
                      <span className="grow" />
                      {c.installs ? <span style={{ fontSize: 10.5, color: "var(--muted)" }}>{c.installs}</span> : null}
                    </div>
                    <small style={{ color: "var(--muted)", fontSize: 11.5 }}>{c.by}</small>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--fg-2)", lineHeight: 1.4, flex: 1 }}>{c.desc}</p>
                    <div>
                      <button
                        type="button"
                        className="text primary"
                        style={{ height: 26, fontSize: 12 }}
                        onClick={() => {
                          if ((c as { sheet?: boolean }).sheet) setSkillSheet(c);
                          else {
                            setSkills((list) => (list.some((x) => x.id === c.id) ? list : [...list, { id: c.id, name: c.name, desc: c.desc, agents: ["cursor"] }]));
                            onStatus?.(t("{name} added", { name: c.name }), "ok");
                          }
                        }}
                      >
                        {(c as { sheet?: boolean }).sheet ? t("Add…") : t("Add")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : tab === "hooks" ? (
          <>
            <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
              {t("A hook is a command an agent runs at a point of its turn — a notification when it ends, a formatter after it edits a file. Add it once and magpie writes it into each agent you pick, in the shape that agent reads.")}
            </p>
            {hooks.length === 0 ? (
              <div style={{ border: "1px dashed var(--line)", borderRadius: 12, padding: "28px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13, lineHeight: 1.45 }}>
                <b style={{ display: "block", color: "var(--fg)", fontWeight: 500, marginBottom: 4 }}>{t("No hooks in the library yet")}</b>
                <p style={{ margin: "0 0 12px" }}>{t("Add one, and pick the agents that run it.")}</p>
                <button type="button" className="rt-gadd" style={{ margin: "0 auto" }} onClick={openHookEditor}><span>{t("＋ Add a hook")}</span></button>
              </div>
            ) : (
              <div>
                {hooks.map((h) => (
                  <div key={h.id} className="row" style={{ display: "flex", gap: 8, padding: "10px 4px", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b className="mono" style={{ fontSize: 13 }}>{h.name}</b>
                      {h.description ? <div style={{ fontSize: 12, color: "var(--muted)" }}>{h.description}</div> : null}
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        {t(HOOK_EVENTS.find(([v]) => v === h.event)?.[1] || h.event)}
                        {h.matcher ? ` · ${HOOK_TOOLS.find(([v]) => v === h.matcher)?.[1] || h.matcher}` : ""}
                      </div>
                      <code style={{ fontSize: 11.5 }}>{h.command}</code>
                    </div>
                    <LibChip on label="Cursor" onClick={() => {}} />
                    <button type="button" className="text" onClick={() => setHooks((list) => list.filter((x) => x.id !== h.id))}>{t("Remove")}</button>
                  </div>
                ))}
                <button type="button" className="rt-gadd" style={{ marginTop: 10 }} onClick={openHookEditor}><span>{t("＋ Add hook")}</span></button>
              </div>
            )}
          </>
        ) : tab === "rtk" ? (
          <>
            <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
              {t("RTK rewrites the shell commands an agent runs — git status, cargo test, ls… — to print only what the model needs, so they cost fewer tokens. Switch it on for an agent and magpie runs RTK's own installer for it.")}
            </p>
            {rtkPhase === "checking" ? (
              <div className="lib-skel" style={{ marginBottom: 16 }}>
                <div className="row skeleton" style={{ height: 88, borderRadius: 12 }} />
              </div>
            ) : (
              <div className="card lib-rtk-card" style={{ padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 12, marginBottom: 16 }}>
                <div className="row-head lib-cardhead" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className="lib-glyph lib-rtk-logo" aria-hidden>
                    <img src="/icons/rtk.png" alt="" width={20} height={20} style={{ display: "block", objectFit: "contain" }} />
                  </span>
                  <b style={{ fontSize: 14 }}>RTK</b>
                  <span className="grow" />
                </div>
                <p className="lib-rtk-gain" style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>
                  {rtkPhase === "installing"
                    ? t("Installing RTK… this can take a minute.")
                    : t("RTK isn't installed. magpie can install it for you, or get it from its site.")}
                </p>
                {rtkPhase !== "installing" ? (
                  <p className="lib-rtk-cmd mono" style={{ margin: "0 0 10px", fontSize: 11.5, color: "var(--muted)", userSelect: "text", wordBreak: "break-all" }}>
                    curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
                  </p>
                ) : null}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="text action"
                    disabled={rtkPhase === "installing"}
                    onClick={() => {
                      // Magpie installRTK busy → API; demo does not run the binary installer
                      setRtkPhase("installing");
                      window.setTimeout(() => {
                        setRtkPhase("missing");
                        onStatus?.(t("Demo shell: RTK installer not run — still not installed"), "warn");
                      }, 1100);
                    }}
                  >
                    {rtkPhase === "installing" ? t("Installing…") : t("Install RTK")}
                  </button>
                  <button
                    type="button"
                    className="text"
                    disabled={rtkPhase === "installing"}
                    onClick={() => window.open("https://rtk-ai.app", "_blank", "noopener,noreferrer")}
                  >
                    {t("Get RTK")}
                  </button>
                  <button
                    type="button"
                    className="text"
                    disabled={rtkPhase === "installing"}
                    onClick={() => {
                      // Magpie: rtk = null; render() → skeleton + loadRTK
                      setRtkPhase("checking");
                      window.setTimeout(() => setRtkPhase("missing"), 480);
                    }}
                  >
                    {t("Check again")}
                  </button>
                </div>
              </div>
            )}
            <div className="row-head" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="label" style={{ letterSpacing: ".04em", fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{t("Agents")}</span>
              <span className="grow" />
              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("restart an agent after switching it")}</span>
            </div>
            <div className="list">
              {DEMO_AGENTS.map((a) => {
                const on = !!rtkOn[a.id];
                // Magpie: (!rtk.path && !a.on) || rtkInstalling → disabled
                const disabled = rtkPhase === "installing" || rtkPhase === "checking" || !on;
                return (
                  <div key={a.id} className="row" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 4px", borderBottom: "1px solid var(--line)" }}>
                    <img src="/icons/cursor.svg" alt="" width={18} height={18} style={{ flex: "none", borderRadius: 4 }} />
                    <b style={{ fontSize: 13 }}>{a.name}</b>
                    <span className="grow" />
                    <button
                      type="button"
                      className={`lib-switch${on ? " on" : ""}`}
                      role="switch"
                      aria-checked={on}
                      aria-label={t("{agent} runs its commands through RTK", { agent: a.name })}
                      disabled={disabled}
                      title={disabled && !on ? t("RTK isn't installed. magpie can install it for you, or get it from its site.") : undefined}
                      onClick={() => {
                        if (disabled) return;
                        const next = !on;
                        setRtkOn((m) => ({ ...m, [a.id]: next }));
                        onStatus?.(
                          next ? t("RTK is on for {agent} — restart it to use it", { agent: a.name }) : t("RTK is off for {agent} — restart it to see it", { agent: a.name }),
                          "ok",
                        );
                      }}
                    >
                      <i />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      {mcpEditor ? (
        <LibModal
          onBg={tryCloseMcp}
          onPaste={(e) => {
            const clip = e.clipboardData?.getData("text") || "";
            if (!/[{]/.test(clip)) return;
            const found = serversIn(clip);
            if (!found?.length) return;
            e.preventDefault();
            if (found.length === 1) {
              const f = found[0];
              const envRows = Object.entries(f.env || {}) as [string, string][];
              const headerRows = Object.entries(f.headers || {}) as [string, string][];
              const cmd = [f.command, ...(f.args || [])].filter(Boolean).join(" ");
              setMcpEditor({
                ...mcpEditor,
                name: f.name || mcpEditor.name,
                transport: f.transport,
                command: f.transport === "stdio" ? cmd : "",
                url: f.url || "",
                envRows,
                headerRows,
                oauthOpen: false,
              });
              onStatus?.(t("Filled in from what you pasted"), "ok");
            } else {
              // Magpie pasteMany — demo adds all named; toast count
              const names = found.filter((f) => f.name).map((f) => f.name);
              setMcpServers((s) => [
                ...s,
                ...names
                  .filter((n) => !s.some((x) => x.name === n))
                  .map((n) => ({
                    id: `mcp-${n}`,
                    name: n,
                    transport: "stdio" as Transport,
                    agents: ["cursor"] as string[],
                    health: "checking" as McpHealth,
                    toolsOpen: false,
                    tools: [] as McpTool[],
                  })),
              ]);
              setMcpEditor(null);
              onStatus?.(t("Added {n} servers", { n: names.length }), "ok");
            }
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
              <path d={mcpEditor.transport === "stdio" ? CMD_PATH : WEB_PATH} />
            </svg>
            <b style={{ fontSize: 14 }}>{mcpEditId ? t("Edit {name}", { name: mcpEditor.name || "server" }) : t("New MCP server")}</b>
            <span className="grow" />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("or paste its JSON anywhere here")}</span>
          </div>
          <label style={{ display: "grid", gap: 4, marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{t("Name")}</span>
            <input ref={mcpNameRef} type="text" value={mcpEditor.name} placeholder={t("e.g. github")} onChange={(e) => setMcpEditor({ ...mcpEditor, name: e.target.value })} onKeyDown={(e) => e.stopPropagation()} />
            <small style={{ color: "var(--muted)", fontSize: 11.5 }}>{t("Letters, digits, - and _ — what the agents call it")}</small>
          </label>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 6 }}>{t("Runs as")}</span>
            <div className="segs" style={{ display: "inline-flex", gap: 2, padding: 2, borderRadius: 9, background: "var(--bg)", border: "1px solid var(--line)" }}>
              {([["stdio", t("Command")], ["http", "HTTP"], ["sse", "SSE"]] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`opt${mcpEditor.transport === id ? " on" : ""}`}
                  onClick={() => setMcpEditor({ ...mcpEditor, transport: id })}
                  style={{
                    height: 28, padding: "0 12px", borderRadius: 7,
                    border: mcpEditor.transport === id ? "1px solid var(--line)" : "1px solid transparent",
                    background: mcpEditor.transport === id ? "var(--card)" : "transparent",
                    font: "inherit", fontSize: 12.5, cursor: "pointer",
                    transition: "color .18s, background .18s, border-color .18s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {mcpEditor.transport === "stdio" ? (
            <>
              <label style={{ display: "grid", gap: 4, marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{t("Command")}</span>
                <input className="mono" type="text" value={mcpEditor.command} placeholder="npx -y @modelcontextprotocol/server-github" onChange={(e) => setMcpEditor({ ...mcpEditor, command: e.target.value })} onKeyDown={(e) => e.stopPropagation()} />
                <small style={{ color: "var(--muted)", fontSize: 11.5 }}>{t("The command and its arguments, as you'd type them")}</small>
              </label>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{t("Environment")}</span>
                  <button type="button" className="text" onClick={() => setMcpEditor({ ...mcpEditor, envRows: [...mcpEditor.envRows, ["", ""]] })}>{t("＋ Add")}</button>
                </div>
                {mcpEditor.envRows.map((row, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <input placeholder="TOKEN" value={row[0]} onChange={(e) => { const envRows = mcpEditor.envRows.map((r, j) => (j === i ? [e.target.value, r[1]] as [string, string] : r)); setMcpEditor({ ...mcpEditor, envRows }); }} onKeyDown={(e) => e.stopPropagation()} />
                    <input placeholder={t("value")} value={row[1]} onChange={(e) => { const envRows = mcpEditor.envRows.map((r, j) => (j === i ? [r[0], e.target.value] as [string, string] : r)); setMcpEditor({ ...mcpEditor, envRows }); }} onKeyDown={(e) => e.stopPropagation()} />
                  </div>
                ))}
                <small style={{ color: "var(--muted)", fontSize: 11.5 }}>{t("A value can name a variable, as ${NAME}: each agent is given it in its own way, so the token stays out of its settings")}</small>
              </div>
            </>
          ) : (
            <>
              <label style={{ display: "grid", gap: 4, marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>URL</span>
                <input className="mono" type="text" value={mcpEditor.url} placeholder="https://example.com/mcp" onChange={(e) => setMcpEditor({ ...mcpEditor, url: e.target.value })} onKeyDown={(e) => e.stopPropagation()} />
              </label>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{t("Headers")}</span>
                  <button type="button" className="text" onClick={() => setMcpEditor({ ...mcpEditor, headerRows: [...mcpEditor.headerRows, ["", ""]] })}>{t("＋ Add")}</button>
                </div>
                {mcpEditor.headerRows.map((row, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <input placeholder="Authorization" value={row[0]} onChange={(e) => { const headerRows = mcpEditor.headerRows.map((r, j) => (j === i ? [e.target.value, r[1]] as [string, string] : r)); setMcpEditor({ ...mcpEditor, headerRows }); }} onKeyDown={(e) => e.stopPropagation()} />
                    <input placeholder="Bearer …" value={row[1]} onChange={(e) => { const headerRows = mcpEditor.headerRows.map((r, j) => (j === i ? [r[0], e.target.value] as [string, string] : r)); setMcpEditor({ ...mcpEditor, headerRows }); }} onKeyDown={(e) => e.stopPropagation()} />
                  </div>
                ))}
                <small style={{ color: "var(--muted)", fontSize: 11.5 }}>{t("A value can name a variable, as ${NAME}: each agent is given it in its own way, so the token stays out of its settings")}</small>
              </div>
              {mcpEditor.transport === "http" ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 6 }}>{t("OAuth app")}</span>
                    {!mcpEditor.oauthOpen ? (
                      <>
                        <button type="button" className="text" onClick={() => setMcpEditor({ ...mcpEditor, oauthOpen: true })}>{t("Use your own OAuth app")}</button>
                        <small style={{ display: "block", marginTop: 4, color: "var(--muted)", fontSize: 11.5 }}>{t("For a server whose sign-in doesn't let magpie register itself, as GitHub's")}</small>
                      </>
                    ) : (
                      <>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <input placeholder={t("Client ID")} aria-label={t("Client ID")} value={mcpEditor.clientId} onChange={(e) => setMcpEditor({ ...mcpEditor, clientId: e.target.value })} onKeyDown={(e) => e.stopPropagation()} style={{ flex: "1 1 120px" }} />
                          <input type="password" placeholder={t("Client secret")} aria-label={t("Client secret")} value={mcpEditor.clientSecret} onChange={(e) => setMcpEditor({ ...mcpEditor, clientSecret: e.target.value })} onKeyDown={(e) => e.stopPropagation()} style={{ flex: "1 1 120px" }} />
                          <input placeholder={t("Callback port")} aria-label={t("Callback port")} inputMode="numeric" value={mcpEditor.callbackPort} onChange={(e) => setMcpEditor({ ...mcpEditor, callbackPort: e.target.value.replace(/\D/g, "").slice(0, 5) })} onKeyDown={(e) => e.stopPropagation()} style={{ width: 110 }} />
                          <button type="button" className="text" title={t("Remove")} onClick={() => setMcpEditor({ ...mcpEditor, oauthOpen: false, clientId: "", clientSecret: "", callbackPort: "" })}>×</button>
                        </div>
                        <small style={{ display: "block", marginTop: 4, color: "var(--muted)", fontSize: 11.5 }}>
                          {t("Made with its vendor (GitHub's under Settings › Developer settings › OAuth Apps), with {url} as its callback URL", {
                            url: `http://localhost${mcpEditor.callbackPort ? ":" + mcpEditor.callbackPort : ""}/callback`,
                          })}
                        </small>
                      </>
                    )}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 6 }}>{t("Sign-in")}</span>
                    {mcpSignWaiting ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, color: "var(--fg-2)" }}>{t("Finish signing in in your browser…")}</span>
                        <button
                          type="button"
                          className="text"
                          onClick={() => {
                            setMcpSignWaiting(false);
                            setMcpOauthWall(false);
                          }}
                        >
                          {t("Cancel")}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="text action"
                        onClick={() => saveMcp({ signIn: true })}
                      >
                        {t(mcpEditId ? "Sign in" : "Save and sign in")}
                      </button>
                    )}
                    {mcpEditId && mcpServers.find((x) => x.id === mcpEditId)?.oauthRefused ? (
                      <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--red)" }}>
                        {t("the sign-in was refused (access_denied)")}
                      </div>
                    ) : null}
                    <small style={{ display: "block", marginTop: 4, color: "var(--muted)", fontSize: 11.5 }}>{t("For a server that asks you to sign in (OAuth): magpie signs in once, and every agent given it uses that sign-in")}</small>
                  </div>
                </>
              ) : null}
            </>
          )}
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 6 }}>{t("Agents")}</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DEMO_AGENTS.map((a) => (
                <LibChip
                  key={a.id}
                  on={mcpEditor.agents.includes(a.id)}
                  label={a.name}
                  title={
                    mcpEditor.agents.includes(a.id)
                      ? t("{agent} has it — click to take it away", { agent: a.name })
                      : t("Give it to {agent}", { agent: a.name })
                  }
                  onClick={() => {
                    const agents = mcpEditor.agents.includes(a.id) ? mcpEditor.agents.filter((x) => x !== a.id) : [...mcpEditor.agents, a.id];
                    setMcpEditor({ ...mcpEditor, agents });
                  }}
                />
              ))}
            </div>
          </div>
          {mcpEditId ? (
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                className="text"
                style={{ color: "var(--red)" }}
                onClick={() => {
                  const s = mcpServers.find((x) => x.id === mcpEditId);
                  if (s) setMcpRemoveAsk({ id: s.id, name: s.name });
                }}
              >
                {t("Remove from the library")}
              </button>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className="text action"
                  title={t("Copy {name} as an agent's project file has it, to paste into a project yourself", {
                    name: mcpEditor.name || "server",
                  })}
                  onClick={() => setMcpCopyMenu((m) => (m === "editor" ? null : "editor"))}
                >
                  {mcpCopyFlash && mcpCopyMenu !== "editor" ? "✓ " : ""}
                  {t("Copy config…")}
                </button>
                {mcpCopyMenu === "editor" ? (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: 0,
                      marginBottom: 6,
                      minWidth: 220,
                      padding: "6px 0",
                      borderRadius: 10,
                      border: "1px solid var(--line)",
                      background: "var(--card)",
                      boxShadow: "0 10px 28px rgba(20,22,30,.16)",
                      zIndex: 8,
                    }}
                  >
                    <div style={{ padding: "4px 12px 6px", fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                      {t("Copy as an agent's project file")}
                    </div>
                    <button
                      type="button"
                      className="text"
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: 0, background: "transparent", font: "inherit", fontSize: 13, cursor: "pointer" }}
                      onClick={() => mcpEditId && copyMcpConfig([mcpEditId])}
                    >
                      Cursor
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="bar">
            <span className="grow" />
            <button type="button" className="text" onClick={tryCloseMcp} disabled={mcpSignWaiting}>{t("Cancel")}</button>
            <button
              type="button"
              className="text primary"
              disabled={mcpSignWaiting}
              onClick={() => saveMcp()}
            >
              {t(mcpEditId || mcpSignWaiting ? "Save" : "Add")}
            </button>
          </div>
        </LibModal>
      ) : null}

      {imageSheet ? (
        <LibModal onBg={() => setImageSheet(false)}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
            <span aria-hidden style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--line)", display: "grid", placeItems: "center", flex: "none" }}>🐦</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: "block", fontSize: 15 }}>Magpie Image</b>
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Magpie <code style={{ fontSize: 11.5 }}>magpie</code></span>
            </div>
            <button type="button" className="text" onClick={() => window.open("https://github.com/beyondchenlin/magpie-shell-demo", "_blank", "noopener,noreferrer")}>{t("Homepage")} ↗</button>
          </div>
          <p style={{ margin: "0 0 8px", fontSize: 13, lineHeight: 1.45 }}>
            {t("Generate and edit images with the image model set in Magpie (Settings → Images), and make short videos with a video model set up in Magpie (Grok Imagine, Seedance), saved in the project.")}
          </p>
          <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
            {t("Pick the agents that may generate images: each image costs what the model set in Settings → Images charges.")}
          </p>
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 6 }}>{t("Agents")}</span>
            <LibChip on={imageAgents.includes("cursor")} label="Cursor" onClick={() => setImageAgents((list) => (list.includes("cursor") ? list.filter((x) => x !== "cursor") : [...list, "cursor"]))} />
          </div>
          <div className="bar">
            <span style={{ fontSize: 12, color: "var(--muted)" }}>magpie-image</span>
            <span className="grow" />
            <button type="button" className="text" onClick={() => setImageSheet(false)}>{t("Cancel")}</button>
            <button
              type="button"
              className="text primary"
              onClick={() => {
                if (!mcpServers.some((s) => s.id === "magpie-image"))
                  setMcpServers((s) => [
                    ...s,
                    {
                      id: "magpie-image",
                      name: "Magpie Image",
                      transport: "stdio",
                      command: "magpie-image",
                      agents: imageAgents.length ? [...imageAgents] : [],
                      health: imageAgents.length ? "checking" : "idle",
                      toolsOpen: false,
                      tools: [],
                    },
                  ]);
                setImageSheet(false);
                onStatus?.(t("{name} added", { name: "Magpie Image" }), "ok");
              }}
            >
              {t("Add to the library")}
            </button>
          </div>
        </LibModal>
      ) : null}


      {skillSheet ? (
        <LibModal onBg={() => setSkillSheet(null)}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: "block", fontSize: 15 }}>{skillSheet.name}</b>
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                {skillSheet.by}
                {skillSheet.installs ? (
                  <span style={{ marginLeft: 8, padding: "1px 7px", borderRadius: 999, border: "1px solid var(--line)", fontSize: 11 }}>{skillSheet.installs} installs</span>
                ) : null}
              </span>
            </div>
            <button type="button" className="text" onClick={() => window.open("https://skills.sh", "_blank", "noopener,noreferrer")}>skills.sh ↗</button>
          </div>
          <p style={{ margin: "0 0 6px", fontSize: 13, lineHeight: 1.45 }}>{skillSheet.desc}</p>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--muted)" }}>From github.com/{skillSheet.by}</p>
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 6 }}>{t("Agents")}</span>
            <LibChip on label="Cursor" onClick={() => {}} />
          </div>
          <div className="bar">
            <span className="grow" />
            <button type="button" className="text" onClick={() => setSkillSheet(null)}>{t("Cancel")}</button>
            <button
              type="button"
              className="text primary"
              onClick={() => {
                const c = skillSheet;
                setSkills((list) => (list.some((x) => x.id === c.id) ? list : [...list, { id: c.id, name: c.name, desc: c.desc, agents: ["cursor"] }]));
                setSkillSheet(null);
                onStatus?.(t("{name} added", { name: c.name }), "ok");
              }}
            >
              {t("Add to the library")}
            </button>
          </div>
        </LibModal>
      ) : null}

      {hookEditor ? (
        <LibModal onBg={tryCloseHook}>
          <div style={{ marginBottom: 12 }}><b style={{ fontSize: 14 }}>{t("New hook")}</b></div>
          <label style={{ display: "grid", gap: 4, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{t("Name")}</span>
            <input type="text" value={hookEditor.name} placeholder={t("e.g. notify")} onChange={(e) => setHookEditor({ ...hookEditor, name: e.target.value })} onKeyDown={(e) => e.stopPropagation()} />
            <small style={{ color: "var(--muted)", fontSize: 11.5 }}>{t("Letters, digits, - and _")}</small>
          </label>
          <label style={{ display: "grid", gap: 4, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{t("Description")}</span>
            <textarea rows={3} maxLength={200} value={hookEditor.description} placeholder={t("e.g. Tell me when a turn ends")} onChange={(e) => setHookEditor({ ...hookEditor, description: e.target.value })} onKeyDown={(e) => e.stopPropagation()} style={{ resize: "vertical", minHeight: 64 }} />
            <small style={{ color: "var(--muted)", fontSize: 11.5 }}>{t("Optional: what it's for, in any language. Only the library keeps it")}</small>
          </label>
          <div style={{ marginBottom: 10, position: "relative" }}>
            <span style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>{t("When it runs")}</span>
            <button type="button" className="sess-pick" aria-haspopup="menu" aria-expanded={eventMenu} onClick={() => { setEventMenu((v) => !v); setToolMenu(false); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--card)", font: "inherit", fontSize: 12.5, cursor: "pointer" }}>
              {hookEditor.event.includes(":")
                ? `Cursor · ${hookEditor.event.split(":")[1]}`
                : t(HOOK_EVENTS.find(([v]) => v === hookEditor.event)?.[1] || hookEditor.event)}
              <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden style={{ transform: eventMenu ? "rotate(180deg)" : undefined, transition: "transform .15s var(--ease)" }}>
                <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            {eventMenu ? (
              <div role="menu" style={{ position: "absolute", zIndex: 2, top: "100%", left: 0, marginTop: 4, minWidth: 280, maxHeight: 320, overflow: "auto", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 10px 28px rgba(20,22,30,.16)", padding: 4, animation: "pop-in .28s var(--ease)" }}>
                <div style={{ padding: "4px 8px 2px", fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>{t("When it runs")}</div>
                <input
                  type="search"
                  value={eventFilter}
                  placeholder={t("Find an event")}
                  onChange={(e) => setEventFilter(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  style={{ width: "100%", marginBottom: 4, height: 28, fontSize: 12.5 }}
                  autoFocus
                />
                {/* Magpie: shared events always:true — never hidden by Find an event */}
                {HOOK_EVENTS.map(([v, n]) => (
                  <button
                    key={v}
                    type="button"
                    role="menuitem"
                    className="text"
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 7 }}
                    onClick={() => {
                      setHookEditor({ ...hookEditor, event: v, matcher: toolEvent(v) ? hookEditor.matcher : "", agents: DEMO_AGENTS.map((a) => a.id) });
                      setEventMenu(false);
                      setEventFilter("");
                    }}
                  >
                    <span style={{ display: "block", fontSize: 12.5 }}>{t(n)}{hookEditor.event === v ? " ✓" : ""}</span>
                    <small style={{ color: "var(--muted)", fontSize: 11 }}>{t("every agent, in its own name for it")}</small>
                  </button>
                ))}
                {CURSOR_HOOK_EVENTS.filter((ev) => {
                  const q = eventFilter.trim().toLowerCase();
                  if (!q) return true;
                  return (`cursor ${ev}`).toLowerCase().includes(q);
                }).map((ev) => {
                  const v = `cursor:${ev}`;
                  return (
                    <button
                      key={v}
                      type="button"
                      role="menuitem"
                      className="text"
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 7 }}
                      onClick={() => {
                        setHookEditor({ ...hookEditor, event: v, matcher: "", agents: ["cursor"] });
                        setEventMenu(false);
                        setEventFilter("");
                      }}
                    >
                      <span style={{ display: "block", fontSize: 12.5 }}>Cursor · {ev}{hookEditor.event === v ? " ✓" : ""}</span>
                      <small style={{ color: "var(--muted)", fontSize: 11 }}>{t("{agent}'s own event", { agent: "Cursor" })}</small>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          {hookEditor.event.includes(":") ? (
            <label style={{ display: "grid", gap: 4, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 500 }}>{t("Matcher")}</span>
              <input
                className="mono lib-hookmatcher"
                type="text"
                value={hookEditor.matcher}
                placeholder={t("every tool")}
                onChange={(e) => setHookEditor({ ...hookEditor, matcher: e.target.value })}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <small style={{ color: "var(--muted)", fontSize: 11.5 }}>
                {t("The agent's own matcher, as its hooks file has it; empty for all")}
              </small>
            </label>
          ) : toolEvent(hookEditor.event) ? (
            <div style={{ marginBottom: 10, position: "relative" }}>
              <span style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>{t("For which tools")}</span>
              <button type="button" className="sess-pick lib-hooktool" aria-haspopup="menu" aria-expanded={toolMenu}
                title={t(HOOK_TOOLS.find(([v]) => v === hookEditor.matcher)?.[1] || "Any tool")}
                onClick={() => { setToolMenu((v) => !v); setEventMenu(false); }}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--card)", font: "inherit", fontSize: 12.5, cursor: "pointer" }}>
                <span>{t(HOOK_TOOLS.find(([v]) => v === hookEditor.matcher)?.[1] || "Any tool")}</span>
                <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden style={{ transform: toolMenu ? "rotate(180deg)" : undefined, transition: "transform .15s var(--ease)" }}>
                  <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
              {toolMenu ? (
                <div role="menu" style={{ position: "absolute", zIndex: 2, top: "100%", left: 0, marginTop: 4, minWidth: 180, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 10px 28px rgba(20,22,30,.16)", padding: 4, animation: "pop-in .28s var(--ease)" }}>
                  {HOOK_TOOLS.map(([v, n]) => (
                    <button key={v || "any"} type="button" role="menuitem" className="text" style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 7 }}
                      onClick={() => { setHookEditor({ ...hookEditor, matcher: v }); setToolMenu(false); }}>
                      {t(n)}{hookEditor.matcher === v ? " ✓" : ""}
                    </button>
                  ))}
                </div>
              ) : null}
              <small style={{ display: "block", marginTop: 4, color: "var(--muted)", fontSize: 11.5 }}>{t("Each agent's own names for them")}</small>
            </div>
          ) : null}
          <label style={{ display: "grid", gap: 4, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{t("Command")}</span>
            <input className="mono" type="text" value={hookEditor.command} placeholder="curl -s https://api.day.app/KEY/done" onChange={(e) => setHookEditor({ ...hookEditor, command: e.target.value })} onKeyDown={(e) => e.stopPropagation()} />
            <small style={{ color: "var(--muted)", fontSize: 11.5 }}>{t("Run by the agent's shell, in the session's folder; the agent passes what happened as JSON on its input")}</small>
          </label>
          <label style={{ display: "grid", gap: 4, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{t("Timeout (seconds)")}</span>
            <input type="text" inputMode="numeric" value={hookEditor.timeout} placeholder={t("the agent's own")} onChange={(e) => setHookEditor({ ...hookEditor, timeout: e.target.value.replace(/\D/g, "") })} onKeyDown={(e) => e.stopPropagation()} style={{ maxWidth: 160 }} />
          </label>
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 6 }}>{t("Agents")}</span>
            <LibChip on={hookEditor.agents.includes("cursor")} label="Cursor" onClick={() => setHookEditor({ ...hookEditor, agents: hookEditor.agents.includes("cursor") ? hookEditor.agents.filter((x) => x !== "cursor") : [...hookEditor.agents, "cursor"] })} />
          </div>
          <div className="bar">
            <span className="grow" />
            <button type="button" className="text" onClick={tryCloseHook}>{t("Cancel")}</button>
            <button type="button" className="text primary" onClick={saveHook}>{t("Add")}</button>
          </div>
        </LibModal>
      ) : null}


      <ActionConfirm
        open={!!skillRemoveConfirm}
        title={skillRemoveConfirm ? t("Remove {name}?", { name: skillRemoveConfirm.name }) : ""}
        message={t("It is taken out of every agent it was given to, and its folder is moved to magpie's backups.")}
        cancelLabel={t("Cancel")}
        acceptLabel={t("Remove")}
        onCancel={() => setSkillRemoveConfirm(null)}
        onAccept={() => {
          if (!skillRemoveConfirm) return;
          const { id, name } = skillRemoveConfirm;
          setSkills((list) => list.filter((x) => x.id !== id));
          setSkillRemoveConfirm(null);
          onStatus?.(t("{name} removed", { name }), "ok");
        }}
      />

      {skillHowOpen ? (
        <LibModal onBg={() => setSkillHowOpen(false)}>
          <div className="ehead">
            <b>{t("How each agent gets its skills")}</b>
          </div>
          <p className="lib-confirm">
            {skillHow === "copy"
              ? t("An agent can have its own way; the others get copies, as the library gives them.")
              : t("An agent can have its own way; the others get links, as the library gives them.")}
          </p>
          <div className="list lib-list lib-byagent-list">
            <div className="row lib-row lib-byagent-row lib-how-row">
              <div className="who">
                <div className="name">Cursor</div>
                <div className="sub">
                  {agentHow === "copy" ? t("Gets copies") : agentHow === "link" ? t("Gets links") : (skillHow === "copy" ? t("Gets copies") : t("Gets links"))}
                </div>
              </div>
              <Segs
                value={agentHow}
                items={[
                  { id: "" as const, label: t("Library's way") },
                  { id: "link" as const, label: t("Links") },
                  { id: "copy" as const, label: t("Copies") },
                ]}
                onChange={(id) => {
                  if (agentHow === id) return;
                  setAgentHow(id);
                  // Magpie report after skills/how (CU 81–83)
                  onStatus?.(
                    id === "copy" || (id === "" && skillHow === "copy")
                      ? t("{agent} gets copies of its skills now", { agent: "Cursor" })
                      : t("{agent} gets links to its skills now", { agent: "Cursor" }),
                    "ok",
                  );
                }}
              />
            </div>
          </div>
          <div className="bar">
            <span className="grow" />
            <button type="button" className="text primary" onClick={() => setSkillHowOpen(false)}>{t("Done")}</button>
          </div>
        </LibModal>
      ) : null}


      {skillsByAgentOpen ? (
        <LibModal onBg={() => setSkillsByAgentOpen(false)}>
          <div className="ehead">
            <b>{t("Skills by agent")}</b>
          </div>
          <p className="lib-confirm">
            {t("Every skill on or off for one agent; the others keep theirs. Turned off, they stay in the library.")}
          </p>
          <div className="list lib-list lib-byagent-list">
            <div className="row lib-row lib-byagent-row">
              <div className="who">
                <div className="name">Cursor</div>
                <div className="sub">
                  {t("{n} of {m} skills", { n: skills.length, m: skills.length })}
                </div>
              </div>
              <button type="button" className="text action lib-updall" disabled title={t("Give {agent} every skill", { agent: "Cursor" })} onClick={() => onStatus?.(t("{n} skills are on for {agent}", { n: skills.length, agent: "Cursor" }), "ok")}>{t("Turn all on")}</button>
              <button type="button" className="text action lib-updall" title={t("Take every skill from {agent}", { agent: "Cursor" })} onClick={() => onStatus?.(t("Every skill is off for {agent}", { agent: "Cursor" }), "ok")}>{t("Turn all off")}</button>
            </div>
          </div>
          <div className="bar">
            <span className="grow" />
            <button type="button" className="text primary" onClick={() => setSkillsByAgentOpen(false)}>{t("Done")}</button>
          </div>
        </LibModal>
      ) : null}

      <ActionConfirm
        open={discardOpen}
        title={t("Discard")}
        message={t("Discard unsaved changes? Your changes will be lost.")}
        cancelLabel={t("Cancel")}
        acceptLabel={t("Discard")}
        onCancel={() => setDiscardOpen(false)}
        onAccept={() => {
          setDiscardOpen(false);
          if (mcpEditor) {
            setMcpEditor(null);
            setMcpEditId(null);
            setMcpSignWaiting(false);
            setMcpCopyMenu(null);
          }
          if (hookEditor) setHookEditor(null);
        }}
      />

      <ActionConfirm
        open={instDiscardOpen}
        title={t("Discard")}
        message={t("Discard unsaved changes? Your changes will be lost.")}
        cancelLabel={t("Cancel")}
        acceptLabel={t("Discard")}
        onCancel={() => setInstDiscardOpen(false)}
        onAccept={discardInstructions}
      />

      <ActionConfirm
        open={!!projectRemove && !projectDiscard}
        title={projectRemove ? t("Remove {name}?", { name: projectRemove.name }) : ""}
        message={
          projectRemove?.keep
            ? t("magpie forgets the project. The skills and MCP servers it put in the folder stay there as they are, with their lines in its .gitignore, and are yours from then on; a linked skill still follows the library's.")
            : t("The skills and MCP servers magpie put in it are taken away, with their lines in its .gitignore. Nothing else in the folder is touched.")
        }
        cancelLabel={t("Cancel")}
        acceptLabel={t("Remove")}
        onCancel={() => {
          if (!projectRemove) return;
          if (projectRemove.dirty) setProjectDiscard(true);
          else setProjectRemove(null);
        }}
        onAccept={() => {
          if (!projectRemove) return;
          const { dir, name } = projectRemove;
          setProjects((list) => list.filter((x) => x.dir !== dir));
          setProjectRemove(null);
          setProjectDiscard(false);
          onStatus?.(t("{name} removed", { name }), "ok");
        }}
        extra={(() => {
          if (!projectRemove) return null;
          const pr = projects.find((p) => p.dir === projectRemove.dir);
          const hasPlaced = pr ? Object.values(pr.placed).some((a) => a.length > 0) : false;
          if (!hasPlaced) return null;
          return (
            <Tick
              className="keep"
              checked={projectRemove.keep}
              onChange={(e) =>
                setProjectRemove({ ...projectRemove, keep: e.target.checked, dirty: true })
              }
            >
              <span>
                <span className="name">{t("Keep its skills and MCP servers")}</span>
                <span className="sub">
                  {t("Remove the project from magpie only, leaving what magpie wrote into it")}
                </span>
              </span>
            </Tick>
          );
        })()}
      />

      

      <ActionConfirm
        open={!!(projectDiscard && projectRemove)}
        title={t("Discard")}
        message={t("Discard unsaved changes? Your changes will be lost.")}
        cancelLabel={t("Cancel")}
        acceptLabel={t("Discard")}
        onCancel={() => setProjectDiscard(false)}
        onAccept={() => {
          // NOTES 143: Discard closes remove sheet and does NOT remove the project
          setProjectDiscard(false);
          setProjectRemove(null);
        }}
      />


      {mcpByAgentOpen ? (
        <LibModal onBg={() => setMcpByAgentOpen(false)}>
          <div className="ehead">
            <b>{t("MCP servers by agent")}</b>
          </div>
          <p className="lib-confirm">
            {t("Every server on or off for one agent; the others keep theirs. Turned off, they stay in the library.")}
          </p>
          <div className="list lib-list lib-byagent-list">
            <div className="row lib-row lib-byagent-row">
              <div className="who">
                <div className="name">Cursor</div>
                <div className="sub">
                  {t("{n} of {m} servers", {
                    n: mcpServers.filter((s) => s.agents.includes("cursor")).length,
                    m: mcpServers.length,
                  })}
                </div>
              </div>
              <button
                type="button"
                className="text action lib-updall"
                disabled={mcpServers.every((s) => s.agents.includes("cursor"))}
                title={t("Give {agent} every server", { agent: "Cursor" })}
                onClick={() => {
                  setMcpServers((list) => list.map((x) => ({ ...x, agents: x.agents.includes("cursor") ? x.agents : [...x.agents, "cursor"] })));
                  onStatus?.(t("Written to Cursor"), "ok");
                }}
              >
                {t("Turn all on")}
              </button>
              <button
                type="button"
                className="text action lib-updall"
                title={t("Take every server from Cursor")}
                onClick={() => setMcpTurnAllOffAsk(true)}
              >
                {t("Turn all off")}
              </button>
            </div>
          </div>
          <div className="bar">
            <span className="grow" />
            <button type="button" className="text primary" onClick={() => setMcpByAgentOpen(false)}>{t("Done")}</button>
          </div>
        </LibModal>
      ) : null}

      <ActionConfirm
        open={mcpTurnAllOffAsk}
        title={t("Turn off all {n} servers?", { n: mcpServers.length })}
        message={t("Every server is taken out of Cursor. They stay in the library, to turn on again.")}
        cancelLabel={t("Cancel")}
        acceptLabel={t("Turn all off")}
        onCancel={() => setMcpTurnAllOffAsk(false)}
        onAccept={() => {
          setMcpServers((list) =>
            list.map((x) => ({
              ...x,
              agents: x.agents.filter((a) => a !== "cursor"),
              toolsOpen: false,
              health: "idle" as McpHealth,
            })),
          );
          setMcpTurnAllOffAsk(false);
          onStatus?.(t("Removed from Cursor"), "ok");
        }}
      />

      {mcpOauthWall ? (
        <div
          className="modal open"
          role="dialog"
          aria-modal
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            display: "grid",
            placeItems: "center",
            background: "rgba(20,22,30,.45)",
            animation: "fade-in .18s var(--ease)",
          }}
        >
          <div
            className="dialog"
            style={{
              width: "min(420px, 92vw)",
              background: "#fff",
              borderRadius: 12,
              padding: "20px 22px 16px",
              boxShadow: "0 18px 48px rgba(20,22,30,.28)",
              animation: "pop-in .42s cubic-bezier(.16,1,.3,1)",
            }}
          >
            <b style={{ display: "block", fontSize: 16, marginBottom: 12, textAlign: "center" }}>{t("Magpie is requesting access")}</b>
            <div style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: "10px 12px", fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
              <div><b>{t("Name")}</b> · Magpie</div>
              <div><b>{t("Website")}</b> · https://usemagpie.ai</div>
              <div><b>Redirect</b> · http://127.0.0.1:41671/callback</div>
              <div><b>{t("Access")}</b> · Read, Write</div>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#555", lineHeight: 1.45 }}>
              {t("This MCP client is requesting access to your Linear workspace. Approve was not used in the nest — Cancel refuses with access_denied.")}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="text"
                onClick={() => {
                  setMcpOauthWall(false);
                  setMcpSignWaiting(false);
                  const name = mcpEditor?.name.trim() || "";
                  const hit = mcpServers.find((x) => x.id === mcpEditId || x.name === name);
                  if (hit && !mcpEditId) setMcpEditId(hit.id);
                  setMcpServers((list) =>
                    list.map((x) =>
                      x.id === mcpEditId || x.name === name
                        ? { ...x, oauthRefused: "access_denied", health: "needs-signin" as McpHealth }
                        : x,
                    ),
                  );
                  onStatus?.(t("the sign-in was refused (access_denied)"), "err");
                }}
                style={{ height: 32, padding: "0 14px", border: "1px solid #ccc", borderRadius: 6, background: "#fff" }}
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                className="text"
                disabled
                title={t("Approve was not clicked in the nest")}
                style={{ height: 32, padding: "0 14px", borderRadius: 6, background: "#5b4cdb", color: "#fff", opacity: 0.55 }}
              >
                {t("Approve")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ActionConfirm
        open={mcpRemoveAllAsk}
        title={t("Remove all {n} servers?", { n: mcpServers.length })}
        message={
          t("They are taken out of the library; no agent has any of them.") +
          "\n\n" +
          t("Servers your agents have that aren't in the library stay as they are.")
        }
        cancelLabel={t("Cancel")}
        acceptLabel={t("Remove all {n}", { n: mcpServers.length })}
        onCancel={() => setMcpRemoveAllAsk(false)}
        onAccept={() => {
          const n = mcpServers.length;
          setMcpServers([]);
          setMcpRemoveAllAsk(false);
          setMcpSelectMode(false);
          setMcpSelected(new Set());
          onStatus?.(t("{n} servers removed", { n }), "ok");
        }}
      />

      <ActionConfirm
        open={mcpRemoveSelectedAsk}
        title={t("Remove {n} servers?", { n: mcpSelected.size })}
        message={t("They are taken out of the library and the agents they were given to.")}
        cancelLabel={t("Cancel")}
        acceptLabel={t("Remove")}
        onCancel={() => setMcpRemoveSelectedAsk(false)}
        onAccept={() => {
          const ids = mcpSelected;
          const n = ids.size;
          setMcpServers((list) => list.filter((x) => !ids.has(x.id)));
          setMcpRemoveSelectedAsk(false);
          setMcpSelected(new Set());
          setMcpSelectMode(false);
          onStatus?.(t("{n} servers removed", { n }), "ok");
        }}
      />

      <ActionConfirm
        open={!!mcpRemoveAsk}
        title={mcpRemoveAsk ? t("Remove {name}?", { name: mcpRemoveAsk.name }) : ""}
        message={t("It will be removed from the library and the agents it was given to.")}
        cancelLabel={t("Cancel")}
        acceptLabel={t("Remove")}
        onCancel={() => setMcpRemoveAsk(null)}
        onAccept={() => {
          if (!mcpRemoveAsk) return;
          const { id, name } = mcpRemoveAsk;
          setMcpServers((list) => list.filter((x) => x.id !== id));
          setMcpRemoveAsk(null);
          setMcpEditor(null);
          setMcpEditId(null);
          setMcpSignWaiting(false);
          onStatus?.(t("{name} is out of the library and the agents it was given to", { name }), "ok");
        }}
      />

      <ActionConfirm
        open={!!mcpProjectRemove}
        title={mcpProjectRemove ? t("Remove {name}?", { name: mcpProjectRemove.name }) : ""}
        message={t("The skills and MCP servers magpie put in it are taken away, with their lines in its .gitignore. Nothing else in the folder is touched.")}
        cancelLabel={t("Cancel")}
        acceptLabel={t("Remove")}
        onCancel={() => setMcpProjectRemove(null)}
        onAccept={() => {
          if (!mcpProjectRemove) return;
          const { dir, name } = mcpProjectRemove;
          setMcpProjects((list) => list.filter((x) => x.dir !== dir));
          setMcpProjectRemove(null);
          onStatus?.(t("{name} removed", { name }), "ok");
        }}
      />

      

      {thunarKind ? <LibThunar kind={thunarKind} onClose={() => setThunarKind(null)} /> : null}

      {chooseProjectOpen ? (
        <LibChooseProject
          onClose={() => setChooseProjectOpen(false)}
          onOpen={(p) => {
            setChooseProjectOpen(false);
            if (addingProject) setAddingProject({ ...addingProject, dir: p });
            else setAddingProject({ dir: p });
          }}
        />
      ) : null}

    </main>
  );
}

