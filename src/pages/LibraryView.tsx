import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { t } from "../i18n";

/**
 * Magpie Library plugin (native-linux/library 01–21 + Skills/Hooks/RTK from source).
 * Feature-gated: Plugins › Built-in › Library.
 * Motion: view-in .24s; modal pop-in .42s; Discard .28s; segs .18s; lib-switch.
 */

const LIB_TABS = [
  ["instructions", "Instructions"],
  ["mcp", "MCP servers"],
  ["skills", "Skills"],
  ["hooks", "Hooks"],
  ["rtk", "RTK"],
] as const;

type InstSet = { id: string; name: string; body: string; inUse: boolean; file?: string };
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

function LibChip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`lib-ag${on ? " on" : ""}`}
      aria-pressed={on}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 26,
        padding: "0 10px 0 8px",
        borderRadius: 999,
        border: `1px solid ${on ? "var(--line)" : "transparent"}`,
        background: on ? "var(--card)" : "transparent",
        color: on ? "var(--fg)" : "var(--muted)",
        font: "inherit",
        fontSize: 12,
        cursor: "pointer",
        transition: "background .14s, border-color .14s, color .14s",
      }}
    >
      {label}
    </button>
  );
}

function LibModal({ onBg, children, sm }: { onBg: () => void; children: ReactNode; sm?: boolean }) {
  return (
    <div
      className="modal"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onBg();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "grid",
        placeItems: "center",
        background: "rgba(20,22,30,.42)",
        backdropFilter: "blur(2px)",
        animation: "fade-in .18s var(--ease)",
      }}
    >
      <div
        className={`dialog${sm ? " sm" : ""} lib-editor`}
        role="dialog"
        aria-modal
        style={{
          animation: sm ? "pop-in .28s var(--ease)" : "pop-in .42s cubic-bezier(.16,1,.3,1)",
          maxWidth: sm ? 360 : 520,
          width: "min(520px, calc(100vw - 32px))",
          maxHeight: "min(90vh, 720px)",
          overflow: "auto",
          background: "var(--card)",
          borderRadius: 14,
          border: "1px solid var(--line)",
          boxShadow: "0 18px 48px rgba(20,22,30,.22)",
          padding: "16px 18px 14px",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
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
    mock?: { path: string; name: string; desc: string }[];
  } | null>(null);
  const [skillPick, setSkillPick] = useState<Set<string>>(new Set());
  const [probeFilter, setProbeFilter] = useState("");
  const [skills, setSkills] = useState<{ id: string; name: string; desc: string }[]>([]);
  const [hooks, setHooks] = useState<
    { id: string; name: string; description: string; event: string; matcher: string; command: string; agents: string[] }[]
  >([]);
  const [hookEditor, setHookEditor] = useState<HookDraft | null>(null);
  const [hookSnap, setHookSnap] = useState("");
  const [eventMenu, setEventMenu] = useState(false);
  const [eventFilter, setEventFilter] = useState("");
  const [toolMenu, setToolMenu] = useState(false);
  const [rtkOn, setRtkOn] = useState<Record<string, boolean>>({ cursor: false });
  const [rtkBusy, setRtkBusy] = useState(false);
  const newNameRef = useRef<HTMLInputElement>(null);
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
    setDiscardOpen(false);
  };
  const tryCloseMcp = () => {
    if (mcpDirty) setDiscardOpen(true);
    else setMcpEditor(null);
  };
  const saveMcp = () => {
    if (!mcpEditor) return;
    const name = mcpEditor.name.trim() || "custom-server";
    setMcpServers((s) => [...s, { id: `mcp-${Date.now()}`, name }]);
    setMcpEditor(null);
    onStatus?.(t("{name} added", { name }), "ok");
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
        const mock = DEMO_PROBE_SKILLS.map((x) => ({ ...x }));
        const displaySrc = /mattpocock/i.test(src)
          ? "github.com/mattpocock/skills"
          : src.replace(/^https?:\/\//, "");
        setSkillProbe({ source: displaySrc, mock });
        // Magpie: auto-pick when few; many → none selected (Install 0)
        setSkillPick(mock.length <= 3 ? new Set(mock.map((x) => x.path)) : new Set());
      } else {
        setSkillProbe({ source: src, empty: true });
        setSkillPick(new Set());
        onStatus?.(t("No SKILL.md found there"), "warn");
      }
    }, 480);
  };
  const installSkills = () => {
    if (!skillProbe?.mock?.length || !skillPick.size) return;
    const picked = skillProbe.mock.filter((m) => skillPick.has(m.path));
    setSkills((list) => [
      ...list,
      ...picked.map((m) => ({ id: `sk-${Date.now()}-${m.path}`, name: m.name, desc: m.desc })),
    ]);
    const n = picked.length;
    onStatus?.(n === 1 ? t("1 skill installed") : t("{n} skills installed", { n }), "ok");
    setSkillProbe(null);
    setSkillPick(new Set());
    setSkillSource("");
  };

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
        {tab === "mcp" || tab === "skills" ? (
          <button
            type="button"
            className="text"
            title={t("Go to the MCP servers you can add, under the list")}
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
                <p style={{ margin: "0 0 12px" }}>{t("No servers in the library yet. Paste a server's JSON from its README, or fill it in.")}</p>
                <button type="button" className="rt-gadd" style={{ margin: "0 auto" }} onClick={openMcpEditor}>
                  <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                    <path d="M8 3.5v9M3.5 8h9" />
                  </svg>
                  <span>{t("＋ Add a server")}</span>
                </button>
              </div>
            ) : (
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
                <button type="button" className="rt-gadd" style={{ marginTop: 8 }} onClick={openMcpEditor}>
                  <span>{t("＋ Add server")}</span>
                </button>
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

        ) : tab === "skills" ? (
          <>
            <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
              {t("A skill is a folder with a SKILL.md an agent loads when it's needed. The library keeps each one once and links it into the agents you pick.")}
            </p>
            <div className="card lib-install" style={{ padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
                  <path d={SEARCH} />
                </svg>
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
                <button type="button" className="text action" disabled={skillLooking || !skillSource.trim()} onClick={findSkills}>
                  {skillLooking ? t("Looking…") : t("Find skills")}
                </button>
              </div>
              {skillProbe?.empty ? (
                <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--muted)" }}>
                  {t("No skills there — a skill is a folder with a SKILL.md in it.")}
                </div>
              ) : null}
              {skillProbe?.mock ? (
                <div style={{ marginTop: 12, animation: "fade-in .18s var(--ease)" }}>
                  <div className="row-head" style={{ marginBottom: 8, fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>
                      {skillProbe.mock.length === 1
                        ? t("1 skill in {src}", { src: skillProbe.source })
                        : t("{n} skills in {src}", { n: skillProbe.mock.length, src: skillProbe.source })}
                    </span>
                    <span className="grow" />
                    {skillProbe.mock.length > 1 ? (
                      <button
                        type="button"
                        className="text"
                        onClick={() => {
                          const vis = skillProbe.mock!.filter((m) => {
                            const q = probeFilter.trim().toLowerCase();
                            if (!q) return true;
                            return `${m.name} ${m.desc}`.toLowerCase().includes(q);
                          });
                          const all = vis.length > 0 && vis.every((m) => skillPick.has(m.path));
                          setSkillPick((prev) => {
                            const next = new Set(prev);
                            if (all) vis.forEach((m) => next.delete(m.path));
                            else vis.forEach((m) => next.add(m.path));
                            return next;
                          });
                        }}
                      >
                        {(() => {
                          const vis = skillProbe.mock!.filter((m) => {
                            const q = probeFilter.trim().toLowerCase();
                            if (!q) return true;
                            return `${m.name} ${m.desc}`.toLowerCase().includes(q);
                          });
                          return vis.length > 0 && vis.every((m) => skillPick.has(m.path)) ? t("Select none") : t("Select all");
                        })()}
                      </button>
                    ) : null}
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
                  <div style={{ maxHeight: 220, overflow: "auto" }}>
                    {skillProbe.mock
                      .filter((m) => {
                        const q = probeFilter.trim().toLowerCase();
                        if (!q) return true;
                        return `${m.name} ${m.desc}`.toLowerCase().includes(q);
                      })
                      .map((m) => (
                        <label key={m.path} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderTop: "1px solid var(--line)", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={skillPick.has(m.path)}
                            onChange={(e) => {
                              setSkillPick((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(m.path);
                                else next.delete(m.path);
                                return next;
                              });
                            }}
                          />
                          <span>
                            <b style={{ display: "block", fontSize: 13 }}>{m.name}</b>
                            <small style={{ color: "var(--muted)" }}>{m.desc}</small>
                          </span>
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
                      onClick={() => {
                        setSkillProbe(null);
                        setSkillPick(new Set());
                        setProbeFilter("");
                      }}
                    >
                      {t("Cancel")}
                    </button>
                    <button type="button" className="text primary" disabled={!skillPick.size} onClick={installSkills}>
                      {skillPick.size === 0
                        ? t("Install 0 skills")
                        : skillPick.size === 1
                          ? t("Install 1 skill")
                          : t("Install {n} skills", { n: skillPick.size })}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

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
                            setSkills((list) => (list.some((x) => x.id === c.id) ? list : [...list, { id: c.id, name: c.name, desc: c.desc }]));
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

            {skills.length === 0 ? (
              <div style={{ padding: "8px 2px", color: "var(--muted)", fontSize: 13 }}>{t("No skills in the library yet — find some above.")}</div>
            ) : (
              <div>
                <div className="row-head" style={{ marginBottom: 6 }}>
                  <span className="label" style={{ letterSpacing: ".04em", fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{t("In the library")}</span>
                </div>
                {skills.map((s) => (
                  <div key={s.id} className="row" style={{ display: "flex", gap: 8, padding: "10px 4px", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: 13 }}>{s.name}</b>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.desc}</div>
                    </div>
                    <LibChip on label="Cursor" onClick={() => {}} />
                    <button type="button" className="text" onClick={() => setSkills((list) => list.filter((x) => x.id !== s.id))}>{t("Remove")}</button>
                  </div>
                ))}
              </div>
            )}
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
            <div className="card" style={{ padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 12, marginBottom: 16 }}>
              <div className="row-head" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <b style={{ fontSize: 14 }}>RTK</b>
                <span className="grow" />
              </div>
              <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>
                {rtkBusy ? t("Installing RTK… this can take a minute.") : t("RTK isn't installed. magpie can install it for you, or get it from its site.")}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="text action"
                  disabled={rtkBusy}
                  onClick={() => {
                    setRtkBusy(true);
                    window.setTimeout(() => {
                      setRtkBusy(false);
                      onStatus?.(t("RTK is installed — switch it on for your agents below"), "ok");
                    }, 900);
                  }}
                >
                  {rtkBusy ? t("Installing…") : t("Install RTK")}
                </button>
                <button type="button" className="text" onClick={() => window.open("https://rtk-ai.app", "_blank", "noopener,noreferrer")}>{t("Get RTK")}</button>
                <button type="button" className="text" onClick={() => onStatus?.(t("Demo: checked again"), "ok")}>{t("Check again")}</button>
              </div>
            </div>
            <div className="row-head" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="label" style={{ letterSpacing: ".04em", fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{t("Agents")}</span>
              <span className="grow" />
              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("restart an agent after switching it")}</span>
            </div>
            <div className="list">
              {DEMO_AGENTS.map((a) => (
                <div key={a.id} className="row" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 4px", borderBottom: "1px solid var(--line)" }}>
                  <b style={{ fontSize: 13 }}>{a.name}</b>
                  <span className="grow" />
                  <button
                    type="button"
                    className={`lib-switch${rtkOn[a.id] ? " on" : ""}`}
                    role="switch"
                    aria-checked={!!rtkOn[a.id]}
                    aria-label={t("{agent} runs its commands through RTK", { agent: a.name })}
                    disabled={rtkBusy}
                    onClick={() => {
                      const on = !rtkOn[a.id];
                      setRtkOn((m) => ({ ...m, [a.id]: on }));
                      onStatus?.(
                        on ? t("RTK is on for {agent} — restart it to use it", { agent: a.name }) : t("RTK is off for {agent} — restart it to see it", { agent: a.name }),
                        "ok",
                      );
                    }}
                  >
                    <i />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>

      {mcpEditor ? (
        <LibModal onBg={tryCloseMcp}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
              <path d={mcpEditor.transport === "stdio" ? CMD_PATH : WEB_PATH} />
            </svg>
            <b style={{ fontSize: 14 }}>{t("New MCP server")}</b>
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
                    <input placeholder="GITHUB_TOKEN" value={row[0]} onChange={(e) => { const envRows = mcpEditor.envRows.map((r, j) => (j === i ? [e.target.value, r[1]] as [string, string] : r)); setMcpEditor({ ...mcpEditor, envRows }); }} onKeyDown={(e) => e.stopPropagation()} />
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
                    <button type="button" className="text action" onClick={() => onStatus?.(t("Demo: sign-in was not started"), "ok")}>{t("Save and sign in")}</button>
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
                  onClick={() => {
                    const agents = mcpEditor.agents.includes(a.id) ? mcpEditor.agents.filter((x) => x !== a.id) : [...mcpEditor.agents, a.id];
                    setMcpEditor({ ...mcpEditor, agents });
                  }}
                />
              ))}
            </div>
          </div>
          <div className="bar" style={{ display: "flex", gap: 8 }}>
            <span className="grow" />
            <button type="button" className="text" onClick={tryCloseMcp}>{t("Cancel")}</button>
            <button type="button" className="text primary" onClick={saveMcp}>{t("Add")}</button>
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
          <div className="bar" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>magpie-image</span>
            <span className="grow" />
            <button type="button" className="text" onClick={() => setImageSheet(false)}>{t("Cancel")}</button>
            <button
              type="button"
              className="text primary"
              onClick={() => {
                if (!mcpServers.some((s) => s.id === "magpie-image")) setMcpServers((s) => [...s, { id: "magpie-image", name: "Magpie Image" }]);
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
          <div className="bar" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="grow" />
            <button type="button" className="text" onClick={() => setSkillSheet(null)}>{t("Cancel")}</button>
            <button
              type="button"
              className="text primary"
              onClick={() => {
                const c = skillSheet;
                setSkills((list) => (list.some((x) => x.id === c.id) ? list : [...list, { id: c.id, name: c.name, desc: c.desc }]));
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
                <input
                  type="search"
                  value={eventFilter}
                  placeholder={t("Find an event")}
                  onChange={(e) => setEventFilter(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  style={{ width: "100%", marginBottom: 4, height: 28, fontSize: 12.5 }}
                  autoFocus
                />
                {HOOK_EVENTS.filter(([, n]) => {
                  const q = eventFilter.trim().toLowerCase();
                  if (!q) return true;
                  return n.toLowerCase().includes(q);
                }).map(([v, n]) => (
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
          {toolEvent(hookEditor.event) ? (
            <div style={{ marginBottom: 10, position: "relative" }}>
              <span style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>{t("For which tools")}</span>
              <button type="button" className="sess-pick" onClick={() => { setToolMenu((v) => !v); setEventMenu(false); }}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--card)", font: "inherit", fontSize: 12.5, cursor: "pointer" }}>
                {t(HOOK_TOOLS.find(([v]) => v === hookEditor.matcher)?.[1] || "Any tool")}
              </button>
              {toolMenu ? (
                <div role="menu" style={{ position: "absolute", zIndex: 2, top: "100%", left: 0, marginTop: 4, minWidth: 180, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 10px 28px rgba(20,22,30,.16)", padding: 4, animation: "pop-in .28s var(--ease)" }}>
                  {HOOK_TOOLS.map(([v, n]) => (
                    <button key={v || "any"} type="button" role="menuitem" className="text" style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 7 }}
                      onClick={() => { setHookEditor({ ...hookEditor, matcher: v }); setToolMenu(false); }}>
                      {t(n)}
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
          <div className="bar" style={{ display: "flex", gap: 8 }}>
            <span className="grow" />
            <button type="button" className="text" onClick={tryCloseHook}>{t("Cancel")}</button>
            <button type="button" className="text primary" onClick={saveHook}>{t("Add")}</button>
          </div>
        </LibModal>
      ) : null}

      {discardOpen ? (
        <LibModal onBg={() => setDiscardOpen(false)} sm>
          <b style={{ display: "block", fontSize: 15, marginBottom: 8 }}>{t("Discard")}</b>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--fg-2)", lineHeight: 1.45 }}>{t("Discard unsaved changes? Your changes will be lost.")}</p>
          <div className="bar" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="text" onClick={() => setDiscardOpen(false)}>{t("Cancel")}</button>
            <button
              type="button"
              className="text"
              style={{ background: "var(--red)", color: "#fff", borderColor: "transparent" }}
              onClick={() => {
                setDiscardOpen(false);
                if (mcpEditor) setMcpEditor(null);
                if (hookEditor) setHookEditor(null);
              }}
            >
              {t("Discard")}
            </button>
          </div>
        </LibModal>
      ) : null}

    </main>
  );
}

