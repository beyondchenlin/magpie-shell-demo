import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type ReactNode } from "react";
import { ActionConfirm } from "../components/ActionConfirm";
import { PrefPick } from "../components/PrefPick";
import { Segs } from "../components/Segs";
import { WordsField } from "../components/WordsField";
import { LibSwitch } from "../components/LibSwitch";
import { TextBtn } from "../components/TextBtn";
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
/** Magpie plugins/library/client.js GLYPH (L34–52) + CHEV_R (app.js L218) */
const DOC = "M4 2.5h5.5L12 5v8.5H4z M9.5 2.5V5H12";
const FOLDER = "M2.5 4.5h4l1.2 1.3h5.8v6.7h-11z";
const BACKUP = "M3.2 8a4.8 4.8 0 1 0 1.4-3.4 M2.8 2.6v2.4h2.4 M8 5.3V8l1.9 1.2";
const SEARCH = "M7 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M10 10l3 3";
/** Magpie openProtoMenu tick (app.js CHECK / NestedBlocks PM_CHECK) */
const PM_CHECK = "M3.2 8.2 6.4 11.4 12.8 4.2";
const HOOK_GLYPH = "M10.5 2.5v6.5a3 3 0 0 1-6 0V7.5 M3 9l1.5-1.5L6 9";
const TRASH_GLYPH = "M3.5 4.5h9 M6.5 4.5V3h3v1.5 M4.5 4.5l.6 8.5h5.8l.6-8.5";
const CHEV_R = "m6.5 4.5 3 3.5-3 3.5";
const SKILL_GLYPH = "M4 2.5h6.5L12 4v9.5H4z M6 6h4 M6 8.5h4 M6 11h2.5";
/** Magpie library/client.js GLYPH.out L44 — mk-ext external link. */
const OUT_GLYPH = "M9.5 3.5h3v3 M12.5 3.5 7.5 8.5 M11 9.5v3H3.5V5h3";
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
      className={`lib-ag${on ? " on" : ""}${iconOnly ? " icon" : ""}`}
      aria-pressed={on}
      aria-label={label}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}>
      {iconOnly ? "▦" : label}
    </button>
  );
}


/** Magpie app.js field() L7219–7238: bare <label> + wrap <div> as .editor 2-col grid children (not invent field-block / label.field). */
function LibField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <label>{label}</label>
      <div>
        {children}
        {hint != null && hint !== false ? (
          typeof hint === "string" ? <div className="hint">{hint}</div> : hint
        ) : null}
      </div>
    </>
  );
}

/** Magpie library/client.js pairs() L1900–1919 → .lib-pairs / .lib-pair / .lib-addpair / .lib-x (not invent .pair / .hrow). */
function LibPairs({
  rows,
  keyHint,
  valHint,
  onChange,
}: {
  rows: [string, string][];
  keyHint: string;
  valHint: string;
  onChange: (rows: [string, string][]) => void;
}) {
  return (
    <div className="lib-pairs">
      {rows.map((row, i) => (
        <div key={i} className="lib-pair">
          <WordsField
            placeholder={keyHint}
            value={row[0]}
            onChange={(e) => {
              const next = rows.map((r, j) => (j === i ? [e.target.value, r[1]] as [string, string] : r));
              onChange(next);
            }}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <WordsField
            placeholder={valHint}
            value={row[1]}
            onChange={(e) => {
              const next = rows.map((r, j) => (j === i ? [r[0], e.target.value] as [string, string] : r));
              onChange(next);
            }}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="text lib-x"
            title={t("Remove")}
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text lib-addpair"
        onClick={() => onChange([...rows, ["", ""]])}
      >
        {t("＋ Add")}
      </button>
    </div>
  );
}

function LibModal({
  onBg,
  children,
  onPaste,
  editorClassName,
}: {
  onBg: () => void;
  children: ReactNode;
  onPaste?: (e: ClipboardEvent) => void;
  /** Magpie hook editor adds `lib-hookedit` (client.js L2270). */
  editorClassName?: string;
}) {
  /** Magpie openLib: `.modal.lib` > `.dialog` > `.editor.lib-editor` (client.js openLib / openModal). */
  return (
    <div
      className="modal lib" role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onBg();
      }}>
      <div
        className="dialog"
        role="dialog"
        aria-modal
        onMouseDown={(e) => e.stopPropagation()}>
        <div className={`editor lib-editor${editorClassName ? " " + editorClassName : ""}`} onPaste={onPaste}>
          {children}
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
  const [projectRemove, setProjectRemove] = useState<{ dir: string; name: string; keep: boolean } | null>(null);
  const [hooks, setHooks] = useState<
    { id: string; name: string; description: string; event: string; matcher: string; command: string; agents: string[] }[]>([]);
  const [hookEditor, setHookEditor] = useState<HookDraft | null>(null);
  const [hookSnap, setHookSnap] = useState("");
  const [eventMenu, setEventMenu] = useState(false);
  const [eventFilter, setEventFilter] = useState("");
  const [toolMenu, setToolMenu] = useState(false);
  /* Magpie openProtoMenu outside/Escape (app.js L13854–L13864) */
  useEffect(() => {
    if (!eventMenu && !toolMenu) return;
    const onDown = (e: MouseEvent) => {
      const n = e.target as Node | null;
      const host = n && (n as Element).closest?.(".lib-hookpick");
      if (host) return;
      setEventMenu(false);
      setToolMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEventMenu(false);
        setToolMenu(false);
        setEventFilter("");
      }
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [eventMenu, toolMenu]);
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
    <main className="view" id="view-library">
      <div className="lib-head">
        <Segs
          className="lib-tabs" aria-label={t("Library")}
          value={tab}
          onChange={(id) => setTab(id)}
          items={LIB_TABS.map(([id, label]) => {
            const n =
              id === "skills" ? skills.length : id === "mcp" ? mcpServers.length : id === "hooks" ? hooks.length : 0;
            return { id, label: n ? `${t(label)} · ${n}` : t(label) };
          })}
        />
        <div className="lib-headacts">
          {tab === "mcp" || tab === "skills" ? (
            <button
              type="button"
              className="text lib-discover" title={tab === "skills" ? t("Go to the skills you can add, under the list") : t("Go to the MCP servers you can add, under the list")}
              onClick={() =>
                document
                  .getElementById(tab === "skills" ? "libSkillDiscover" : "libDiscover")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }>
              <span className="lib-mini" aria-hidden>
                <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.3">
                <path d={SEARCH} />
                </svg>
              </span>
              {t("Discover")}
            </button>
          ) : null}
          <button
            type="button"
            className="text lib-more" title="~/.config/magpie/library"
            onClick={() => onStatus?.("~/.config/magpie/library", "ok")}>
            <span className="lib-mini" aria-hidden>
              <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d={FOLDER} />
              </svg>
            </span>
            {t("Library folder")}
          </button>
          <button
            type="button"
            className="text lib-backups" title={t("magpie keeps a copy of every file before it writes it.") + "\n~/.config/magpie/backups"}
            onClick={() => onStatus?.("~/.config/magpie/backups", "ok")}
            onContextMenu={(e) => {
              // NOTES 88–100: right-click on Backups opens no menu
              e.preventDefault();
            }}>
            <span className="lib-mini" aria-hidden>
              <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d={BACKUP} />
              </svg>
            </span>
            {t("Backups")}
          </button>
        </div>
      </div>

      <div className="lib-body">
        {tab === "instructions" ? (
          <>
            <p className="lib-intro">
              {t("Write it once: every agent switched on below reads it before each conversation, in its own instructions file.")}
            </p>

            <div className="list lib-list lib-sets">
              <div className="row-head lib-cardhead">
                <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
                  <path d={DOC} />
                </svg>
                <b>{t("Shared instructions")}</b>
                <span className="grow" />
                <span className="note">{t("Markdown · Ctrl+S")}</span>
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
                  <div key={s.id}>
                    <div
                      className={`row lib-row click lib-set${open ? " open" : ""}${s.inUse ? " on" : ""}`}
                      onClick={() => {
                        setOpenId(open ? null : s.id);
                        setInstRemoveAsk(null);
                      }}>
                      <button
                        type="button"
                        className={`lib-radio${s.inUse ? " on" : ""}`}
                        role="radio"
                        aria-checked={s.inUse}
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
                      />
                      <div className="who">
                        <div className="name">{s.name}</div>
                        <div className="sub">{rowSub}</div>
                      </div>
                      <div className="lib-tags">
                        {s.inUse ? (
                          <span className="lib-tag" title={t("The agents switched on below read this set")}>
                            {t("In use")}
                          </span>
                        ) : null}
                        {setDirtyLocal ? (
                          <span className="lib-tag warn">{t("Not saved yet")}</span>
                        ) : null}
                      </div>
                      <span className="chev" aria-hidden>
                        <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m6.5 4.5 3 3.5-3 3.5" />
                        </svg>
                      </span>
                    </div>
                    {open ? (
                      <div className="lib-detail" onClick={(e) => e.stopPropagation()}>
                        {s.file ? (
                          <div className="note lib-setfile">
                            {t("Kept in")} <code>{s.file}</code>
                          </div>
                        ) : null}
                        <input
                          type="text"
                          className="lib-setname"
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
                         
                        />
                        <textarea className="lib-text"
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
                          
                        />
                        <div className="lib-acts">
                          {!s.inUse ? (
                            <button
                              type="button"
                              className="text action lib-use" onClick={() => switchAgentsTo(s.id)}>
                              {t("Switch the agents to this set")}
                            </button>
                          ) : null}
                          {s.id !== "default" ? (
                            instRemoveAsk === s.id ? (
                              <>
                                <button
                                  type="button"
                                  className="text primary danger-fill" disabled={s.inUse}
                                  onClick={() => {
                                    if (s.inUse) return;
                                    setSets((list) => list.filter((x) => x.id !== s.id));
                                    setInstRemoveAsk(null);
                                    if (openId === s.id) setOpenId(null);
                                    onStatus?.(t("{name} removed", { name: s.name }), "ok");
                                  }}>
                                  {t("Remove {name} and its text", { name: s.name })}
                                </button>
                                <button type="button" className="text" onClick={() => setInstRemoveAsk(null)}>
                                  {t("Cancel")}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="text action danger" disabled={s.inUse}
                                title={
                                  s.inUse
                                    ? t("Switch the agents to another set before removing this one")
                                    : undefined
                                }
                                onClick={() => {
                                  if (s.inUse) return;
                                  setInstRemoveAsk(s.id);
                                }}>
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
                <div className="row lib-row lib-set lib-setnew">
                  <input
                    ref={newNameRef}
                    type="text"
                    className="lib-setname grow"
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
                      className="lib-setname lib-setfile-in grow"
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
                      className="text action lib-setlink" onClick={() => {
                        // Keep in a file… fills AGENTS.md + path (inline, not a picker)
                        setFileMode(true);
                        setNewName("AGENTS.md");
                        setFilePath("~/.agents/AGENTS.md");
                      }}>
                      {t("Keep in a file…")}
                    </button>
                    <span className="grow" />
                    <button
                      type="button"
                      className="text" onClick={() => {
                        setAddingSet(false);
                        setFileMode(false);
                        setNewName("");
                        setFilePath("~/.agents/AGENTS.md");
                      }}>
                      {t("Cancel")}
                    </button>
                    <button type="button" className="text primary" onClick={addSet}>
                      {t("Add")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="lib-acts lib-setadd">
                  <button type="button" className="text action" onClick={() => setAddingSet(true)}>
                    {t("New set")}
                  </button>
                </div>
              )}
            </div>

            {instDirty && tab === "instructions" ? (
              <div className="lib-savebar">
                <span className="note">{t("Not saved yet")}</span>
                <span className="grow" />
                <button type="button" className="text" onClick={() => setInstDiscardOpen(true)}>
                  {t("Discard")}
                </button>
                <button
                  type="button"
                  className="text primary" onClick={saveInstructions}>
                  {t("Save")}
                </button>
              </div>
            ) : null}

            <div>
              <div className="row-head lib-cardhead">
                <span className="label">
                  {t("AGENTS")}
                </span>
              </div>
              <p>
                {t("They read {name} · magpie writes its part between two marker lines — the rest of each file stays yours.", {
                  name: sets.find((x) => x.inUse)?.name || openSet?.name || "Default",
                })}
              </p>
              <div className="card lib-card">
                {t("None of your agents reads a user-wide instructions file magpie knows.")}
              </div>
              <p>{t("Cursor keeps no user-wide instructions file.")}</p>
            </div>
          </>
        ) : tab === "mcp" ? (
          <>
            {mcpServers.length === 0 ? (
              <div>
                <p>{t("No servers in the library yet")}</p>
                <p>{t("Paste a server's JSON from its README, or fill it in.")}</p>
                <button type="button" className="rt-gadd" onClick={openMcpEditor}>
                  <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                    <path d="M8 3.5v9M3.5 8h9" />
                  </svg>
                  <span>{t("＋ Add a server")}</span>
                </button>
              </div>
            ) : (
              <div className="list lib-list">
                <div className="row-head lib-cardhead">
                  <span className="label">{t("In the library")}</span>
                  <span className="grow" />
                  {mcpServers.length >= 2 ? (
                    <>
                      <Segs
                        value={mcpSort}
                        onChange={setMcpSort}
                        items={[
                          { id: "az" as const, label: "A→Z" },
                          { id: "za" as const, label: "Z→A" },
                        ]}
                        aria-label="A→Z"
                      />
                      <TextBtn
                        variant="action"
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
                        }}>
                        {mcpSelectMode ? t("Done") : t("Select")}
                      </TextBtn>
                      <TextBtn
                        variant="action"
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
                        }}>
                        {t("Turn all on")}
                      </TextBtn>
                      <TextBtn variant="action" onClick={() => setMcpTurnAllOffAsk(true)}>
                        {t("Turn all off")}
                      </TextBtn>
                    </>
                  ) : null}
                  <TextBtn variant="action" className="lib-updall" onClick={() => setMcpByAgentOpen(true)}>{t("By agent")}</TextBtn>
                  {mcpServers.length >= 2 ? (
                    <TextBtn
                      title={t("Take all {n} servers out of the library", { n: mcpServers.length })}
                      onClick={() => setMcpRemoveAllAsk(true)}>
                      {t("Remove all")}
                    </TextBtn>
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
                  // Magpie client.js paintHealth L1679–1698: idle|checking|ok|auth|err + has-list
                  const healthCls =
                    displayHealth === "checking"
                      ? "lib-health checking"
                      : displayHealth === "tools"
                        ? "lib-health ok has-list"
                        : displayHealth === "needs-signin"
                          ? "lib-health auth"
                          : displayHealth === "timeout" || displayHealth === "unset"
                            ? "lib-health err"
                            : "lib-health idle";
                  const openEditor = () => {
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
                  };
                  return (
                    <div
                      key={s.id}
                      className={`row lib-row click lib-server${mcpSelectMode && selected ? " selected" : ""}`}
                      title={mcpSelectMode ? undefined : t("Edit {name}", { name: s.name })}
                      onClick={() => openEditor()}>
                      {mcpSelectMode ? (
                        <input
                          type="checkbox"
                          className="lib-pickbox"
                          checked={selected}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => {
                            setMcpSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(s.id)) next.delete(s.id);
                              else next.add(s.id);
                              return next;
                            });
                          }}
                        />
                      ) : (
                        <span className="lib-glyph" aria-hidden>{s.transport === "stdio" ? ">_" : "🌐"}</span>
                      )}
                      <div className="who lib-srvwho">
                        <div className="name mono">{s.name}</div>
                        <button
                          type="button"
                          title={healthTitle}
                          className={healthCls}
                          aria-expanded={displayHealth === "tools" ? s.toolsOpen : undefined}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (displayHealth === "tools") {
                              setMcpServers((list) => list.map((x) => (x.id === s.id ? { ...x, toolsOpen: !x.toolsOpen } : x)));
                            } else {
                              runMcpHealth(s.id, displayHealth === "timeout" || displayHealth === "unset" || displayHealth === "idle");
                            }
                          }}>
                          <span>{healthLabel}</span>
                        </button>
                        <div className="sub mono" title={s.transport === "stdio" ? s.command || "—" : s.url || "—"}>
                          {s.transport === "stdio" ? s.command || "—" : s.url || "—"}
                        </div>
                      {s.toolsOpen && displayHealth === "tools" ? (
                        <div className="lib-tools" onClick={(e) => e.stopPropagation()}>
                          <ul className="lib-toollist">
                            {s.tools.map((tool) => (
                              <li
                                key={tool.id}
                                className={`lib-tool${tool.on ? "" : " off"}`}>
                                <div className="lib-tooltxt">
                                  <span className="lib-toolname mono">{tool.name}</span>
                                  {tool.desc ? <span className="lib-tooldesc">{tool.desc}</span> : null}
                                </div>
                                <LibSwitch
                                  on={tool.on}
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
                                />
                              </li>
                            ))}
                          </ul>
                          {hasCursor ? (
                            <p className="lib-toolcant">
                              {t("Cursor can't turn off single tools: they get every tool of the server.")}
                            </p>
                          ) : null}
                          <div className="lib-toolfoot">
                            <span className="grow" />
                            <button type="button" className="text" onClick={() => runMcpHealth(s.id, true)}>
                              {t("Check again")}
                            </button>
                          </div>
                        </div>
                      ) : null}
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
                  );
                })}
                {mcpSelectMode ? (
                  <div className="row lib-row lib-pickbar">
                    <label className="lib-pickall">
                      <input
                        type="checkbox"
                        checked={mcpSelected.size === mcpServers.length && mcpServers.length > 0}
                        onChange={() => {
                          if (mcpSelected.size === mcpServers.length) setMcpSelected(new Set());
                          else setMcpSelected(new Set(mcpServers.map((x) => x.id)));
                        }}
                      />
                      {mcpSelected.size === 0
                        ? t("All {n}", { n: mcpServers.length })
                        : t("{n} selected", { n: mcpSelected.size })}
                    </label>
                    {mcpSelected.size === 0 ? (
                      <span className="lib-pickn none">{t("Pick servers to turn them on or off together")}</span>
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
                        <span className="pref-anchor">
                          <button
                            type="button"
                            className="text action lib-updall lib-copyconfig"
                            title={t("Copy these servers as an agent's project file has them, to paste into a project yourself")}
                            aria-expanded={mcpCopyMenu === "bar"}
                            onClick={() => setMcpCopyMenu((m) => (m === "bar" ? null : "bar"))}>
                            {mcpCopyFlash && mcpCopyMenu === null ? "✓ " : ""}
                            {t("Copy config…")}
                          </button>
                          {mcpCopyMenu === "bar" ? (
                            <div className="pop proto-menu" role="menu" aria-label={t("Copy as an agent's project file")}>
                              <div className="pm-head">{t("Copy as an agent's project file")}</div>
                              <button
                                type="button"
                                className="pm-item"
                                role="menuitem"
                                onClick={() => copyMcpConfig([...mcpSelected])}>
                                <span className="pm-tick" aria-hidden />
                                <span className="pm-words">
                                  <span className="pm-name">Cursor</span>
                                  <span className="pm-note" />
                                </span>
                              </button>
                            </div>
                          ) : null}
                        </span>
                        <button
                          type="button"
                          className="text lib-pickrm" onClick={() => setMcpRemoveSelectedAsk(true)}>
                          {t("Remove…")}
                        </button>
                        <button
                          type="button"
                          className="text" onClick={() => setMcpSelected(new Set())}>
                          {t("Clear")}
                        </button>
                      </>
                    )}
                    <span className="grow" />
                    <button
                      type="button"
                      className="text" onClick={() => {
                        setMcpSelectMode(false);
                        setMcpSelected(new Set());
                        setMcpCopyMenu(null);
                      }}>
                      {t("Done")}
                    </button>
                  </div>
                ) : null}

                <button type="button" className="rt-gadd" onClick={openMcpEditor}>
                  <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                    <path d="M8 3.5v9M3.5 8h9" />
                  </svg>
                  <span>{t("＋ Add server")}</span>
                </button>

                {/* MCP In projects */}
                <div>
                  <div className="row-head lib-cardhead">
                    <span className="label">{t("In projects")}</span>
                    <span className="grow" />
                    {!mcpAddingProject ? (
                      <button type="button" className="text action lib-updall" onClick={() => setMcpAddingProject({ dir: "" })}>
                        {t("Add a project")}
                      </button>
                    ) : null}
                  </div>
                  {mcpAddingProject ? (
                    <div className="list lib-card lib-install">
                      <div className="lib-find">
                        <span className="lib-mini" aria-hidden>
                          <svg viewBox="0 0 16 16" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="1.3">
                            <path d={FOLDER} />
                          </svg>
                        </span>
                        <input
                          type="text"
                          spellCheck={false}
                          autoComplete="off"
                          placeholder={t("The project's folder, like ~/code/app")}
                          value={mcpAddingProject.dir}
                          disabled={!!mcpAddingProject.busy}
                          onChange={(e) => setMcpAddingProject({ ...mcpAddingProject, dir: e.target.value })}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Escape") setMcpAddingProject(null);
                          }}
                        />
                        <button
                          type="button"
                          className="text action" disabled={!!mcpAddingProject.busy}
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
                          }}>
                          {mcpAddingProject.busy ? t("Adding…") : t("Add")}
                        </button>
                        <button type="button" className="text" disabled={!!mcpAddingProject.busy} onClick={() => setMcpAddingProject(null)}>{t("Cancel")}</button>
                      </div>
                    </div>
                  ) : null}
                  {mcpProjects.length ? (
                    mcpProjects.map((pr) => {
                      const placedIds = Object.keys(pr.placed).filter((id) => (pr.placed[id] || []).length > 0);
                      const hasPlaced = placedIds.length > 0;
                      return (
                      <div key={pr.dir} className="list lib-card lib-project">
                        <div
                          className={`row lib-row click lib-projhead${pr.open ? " open" : ""}`}
                          title={pr.open ? t("Hide its servers") : t("Pick the servers it gets")}
                          onClick={() => setMcpProjects((list) => list.map((x) => (x.dir === pr.dir ? { ...x, open: !x.open } : x)))}>
                          <span className="lib-glyph" aria-hidden>
                            <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.3">
                              <path d={FOLDER} />
                            </svg>
                          </span>
                          <div className="who">
                            <div className="name">{pr.name}</div>
                            <div className="lib-src">
                              <button
                                type="button"
                                className="lib-path"
                                title={t("Show in {fm}", { fm: t("the file manager") })}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStatus?.(pr.dir, "ok");
                                }}>
                                {pr.dir}
                              </button>
                            </div>
                          </div>
                          {!pr.open ? (
                            <div className="lib-tags">
                              {hasPlaced
                                ? placedIds.slice(0, 4).map((sid) => {
                                    const srv = mcpServers.find((s) => s.id === sid);
                                    return srv ? (
                                      <span key={sid} className="lib-tag lib-dot">{srv.name}</span>
                                    ) : null;
                                  })
                                : (
                                  <span className="lib-tag lib-unchecked">{t("No servers yet")}</span>
                                )}
                              {placedIds.length > 4 ? (
                                <span className="lib-tag">+{placedIds.length - 4}</span>
                              ) : null}
                            </div>
                          ) : null}
                          <div className="lib-rowacts" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="text lib-icon danger"
                              title={t("Remove the project")}
                              aria-label={t("Remove the project")}
                              onClick={() => setMcpProjectRemove({ dir: pr.dir, name: pr.name })}>
                              <svg viewBox="0 0 16 16" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="1.4">
                                <path d={TRASH_GLYPH} />
                              </svg>
                            </button>
                          </div>
                          <span className="chev" aria-hidden>
                            <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d={CHEV_R} />
                            </svg>
                          </span>
                        </div>
                        {pr.open ? (
                          <>
                            {mcpServers.length === 0 ? (
                              <p className="lib-aside lib-projfoot">{t("No servers in the library yet")}</p>
                            ) : (
                              mcpServers.map((srv) => {
                                const on = (pr.placed[srv.id] || []).includes("cursor");
                                const line = srv.transport === "stdio" ? (srv.command || "") : (srv.url || "");
                                return (
                                  <div key={srv.id} className="row lib-row lib-projskill lib-projserver">
                                    <span className="lib-glyph" aria-hidden>
                                      <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.3">
                                        <path d={srv.transport === "stdio" ? CMD_PATH : WEB_PATH} />
                                      </svg>
                                    </span>
                                    <div className="who">
                                      <div className="name mono">{srv.name}</div>
                                      <div className="sub mono" title={line}>{line}</div>
                                    </div>
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
                              })
                            )}
                            <p className="lib-aside lib-projfoot">
                              {t("Written into .cursor/mcp.json of the project, leaving the rest of each file as it is. Claude Code asks before it starts a project's servers; Codex reads .codex/config.toml, and Pi .pi/mcp.json, only in a project you trust.")}
                            </p>
                          </>
                        ) : null}
                      </div>
                      );
                    })
                  ) : !mcpAddingProject ? (
                    <p>
                      {t("Give a project's agents some of these servers as the project's own: magpie writes them into its .cursor/mcp.json, leaving the rest of each file as it is.")}
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            <div id="libDiscover">
              <div className="row-head lib-cardhead">
                <span className="label">
                  {t("DISCOVER")}
                </span>
              </div>
              <input
                type="search"
                value={mcpQ}
                placeholder={t("Search MCP servers — GitHub, Postgres, Figma…")}
                onChange={(e) => setMcpQ(e.target.value)}
               
              />
              <div className="mk-grid">
                {mcpHits.map((c) => (
                  <div
                    key={c.id}
                    className="mk-card click"
                    title={t("About {name}", { name: c.name })}
                    onClick={() => {
                      if ((c as { sheet?: boolean }).sheet) setImageSheet(true);
                    }}>
                    <div className="mk-top">
                      <div className="mk-who">
                        <div className="mk-name">
                          <span className="mk-title">{c.name}</span>
                        </div>
                        <div className="mk-meta">
                          {c.by ? <span className="mk-pub">{c.by}</span> : null}
                          {c.tag ? <span className="mk-badge">{c.tag}</span> : null}
                        </div>
                      </div>
                    </div>
                    <p className="mk-desc" title={c.desc}>{c.desc}</p>
                    <div className="mk-foot">
                      <span className="mk-id mono">{c.id}</span>
                      <span className="grow" />
                      <button
                        type="button"
                        className="text action mk-add"
                        onClick={(e) => {
                          e.stopPropagation();
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
                        }}>
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
            <p className="lib-intro">
              {t("A skill is a folder with a SKILL.md an agent loads when it's needed. The library keeps each one once and links it into the agents you pick.")}
            </p>
            <div className="list lib-card lib-install">
              <div className="lib-find">
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
                 
                />
                <button type="button" className={`text action${skillLooking ? " busy" : ""}`} disabled={skillLooking || !skillSource.trim()} onClick={findSkills}>
                  {skillLooking ? t("Looking…") : t("Find skills")}
                </button>
              </div>
              {skillProbe?.empty ? (
                <div>
                  {t("No skills there — a skill is a folder with a SKILL.md in it.")}
                </div>
              ) : null}
              {skillProbe?.mock ? (
                <div className="lib-probe">
                  <div className="row-head lib-cardhead">
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
                          className="text" onClick={() => {
                            setSkillPick((prev) => {
                              const next = new Set(prev);
                              if (allOn) freshVis.forEach((m) => next.delete(m.path));
                              else freshVis.forEach((m) => next.add(m.path));
                              return next;
                            });
                          }}>
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
                     
                    />
                  ) : null}
                  {(skillProbe.left || []).map((x) => (
                    <div key={x.path} className="lib-none lib-left">
                      {t("{name} is too big to install: {size}, over the {limit} a skill may be", {
                        name: x.path.split("/").pop() || skillProbe.source,
                        size: `${Math.round(x.size / 1048576)} MB`,
                        limit: "200 MB",
                      })}
                    </div>
                  ))}
                  <div className="lib-picks">
                    {skillProbe.mock
                      .filter((m) => {
                        const q = probeFilter.trim().toLowerCase();
                        if (!q) return true;
                        return `${m.name} ${m.desc}`.toLowerCase().includes(q);
                      })
                      .map((m) => (
                        <label
                          key={m.path}
                          className={`lib-pick${m.have ? " dim" : ""}`}>
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
                          <span className="who">
                            <b className="name">{m.name}</b>
                            <small className="sub">{m.desc}</small>
                          </span>
                          {m.have ? (
                            <span className="tag">
                              {t("in the library")}
                            </span>
                          ) : null}
                        </label>
                      ))}
                  </div>
                  <div className="bar">
                    <span>{t("for")}</span>
                    <LibChip on label="Cursor" onClick={() => {}} />
                    <span className="grow" />
                    <button
                      type="button"
                      className="text" disabled={skillInstalling}
                      onClick={() => {
                        if (skillInstalling) return;
                        setSkillProbe(null);
                        setSkillPick(new Set());
                        setProbeFilter("");
                      }}>
                      {t("Cancel")}
                    </button>
                    <button
                      type="button"
                      className={`text primary${skillInstalling ? " busy" : ""}`}
                      disabled={!skillPick.size || skillInstalling}
                      onClick={installSkills}>
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
              <div>{t("No skills in the library yet — find some above.")}</div>
            ) : (
              <>
                <div>
                  <div className="row-head lib-cardhead">
                    <span className="label">{t("In the library")}</span>
                    <span className="grow" />
                    <button
                      type="button"
                      className="text action lib-updall lib-byagent" title={t("Turn every skill on or off for one agent")}
                      onClick={() => setSkillsByAgentOpen(true)}>
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
                      }}>
                      {skillChecking ? t("Checking…") : t("Check for updates")}
                    </button>
                    ) : null}
                  </div>
                  {skills.map((s) => (
                    <div key={s.id} className="row lib-row lib-skill">
                      <div className="who">
                        <b className="name">{s.name}</b>
                        <div className="sub">{s.desc}</div>
                        {s.kind === "github" ? (
                          <div className="lib-src">
                            <a
                              className="lib-srclink" href={`https://github.com/mattpocock/skills/tree/HEAD/skills/engineering/${s.name}`}
                              onClick={(e) => { e.preventDefault(); onStatus?.(t("Demo: open GitHub"), "ok"); }}>
                              {`mattpocock/skills/tree/HEAD/skills/engineering/${s.name}`}
                            </a>
                          </div>
                        ) : null}
                      </div>
                      <div className="lib-rowacts">
                        {s.kind === "github" ? (
                          <button
                            type="button"
                            className="lib-icon text" title={
                              t("Update from GitHub") +
                              "\n" +
                              t("Up to date with GitHub") +
                              "\n" +
                              "ask-matt: read a skill's SKILL.md before asserting or skipping its steps" +
                              "\n" +
                              "10/7/2026 · 954ee7f"
                            }
                            aria-label={t("Update from GitHub")}
                            onClick={() => onStatus?.(t("{name} is up to date", { name: s.name }), "ok")}>
                            ↑
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="lib-icon danger text" title={t("Remove")}
                          aria-label={t("Remove")}
                          onClick={() => setSkillRemoveConfirm({ id: s.id, name: s.name })}>
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
                <div className="lib-skillhow">
                  <span className="label">{t("Give skills as")}</span>
                  <div
                    className="segs" ref={setSkillHowSeg}>
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
                          }}>
                          {saving ? (
                            <>
                              {/* Magpie CLI_SPIN app.js L2094 + saving() L14058–14062 */}
                              <svg viewBox="0 0 16 16" width={11} height={11} fill="none" aria-hidden>
                                <path d="M13.5 8a5.5 5.5 0 1 1-5.5-5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                              </svg>
                              <span>{t("Saving…")}</span>
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
                  <span className="note lib-skillhow-note">
                    {skillHow === "copy"
                      ? t("Each agent gets a folder of its own, made again when the library's skill changes; edits made in a copy are replaced.")
                      : t("Links follow the library's skill: an update reaches the agents at once.")}
                  </span>
                </div>
                <div>
                  <div className="row-head lib-cardhead">
                    <span className="label">{t("In projects")}</span>
                    <span className="grow" />
                    {!addingProject ? (
                      <button type="button" className="text action lib-updall" onClick={() => setAddingProject({ dir: "" })}>{t("Add a project")}</button>
                    ) : null}
                  </div>
                  {addingProject ? (
                    <div className="list lib-card lib-install">
                      <div className="lib-find">
                        <span className="lib-mini" aria-hidden>
                          <svg viewBox="0 0 16 16" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="1.3">
                            <path d={FOLDER} />
                          </svg>
                        </span>
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
                            // Magpie addProjectCard: Escape clears addingProject (client.js L3498)
                            e.stopPropagation();
                            if (e.key === "Escape") {
                              setAddingProject(null);
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
                         
                        />
                        <button
                          type="button"
                          className="text action" disabled={!!addingProject.busy}
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
                          }}>
                          {addingProject.busy ? t("Adding…") : t("Add")}
                        </button>
                        <button
                          type="button"
                          className="text" disabled={!!addingProject.busy}
                          onClick={() => {
                            setAddingProject(null);
                          }}>
                          {t("Cancel")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {projects.length ? (
                    <div>
                      {projects.map((pr) => {
                        const placedIds = Object.keys(pr.placed).filter((id) => (pr.placed[id] || []).length > 0);
                        const hasPlaced = placedIds.length > 0;
                        return (
                          <div
                            key={pr.dir}
                            className={`list lib-card lib-project`}
                            onContextMenu={(e) => e.preventDefault()}>
                            <div
                              className={`row lib-row click lib-projhead${pr.open ? " open" : ""}`}
                              title={pr.open ? t("Hide its skills") : t("Pick the skills it gets")}
                              onClick={() =>
                                setProjects((list) => list.map((x) => (x.dir === pr.dir ? { ...x, open: !x.open } : x)))
                              }>
                              <span className="lib-glyph" aria-hidden>
                                <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.3">
                                  <path d={FOLDER} />
                                </svg>
                              </span>
                              <div className="who">
                                <div className="name">
                                  {pr.name}
                                  {pr.copy ? <span className="lib-tag">{t("Copies")}</span> : null}
                                </div>
                                <div className="lib-src">
                                  <button
                                    type="button"
                                    className="lib-path"
                                    title={t("Show in {fm}", { fm: t("the file manager") })}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onStatus?.(pr.dir, "ok");
                                    }}>
                                    {pr.dir}
                                  </button>
                                </div>
                              </div>
                              {!pr.open ? (
                                <div className="lib-tags">
                                  {hasPlaced
                                    ? placedIds.slice(0, 4).map((sid) => {
                                        const sk = skills.find((s) => s.id === sid);
                                        return sk ? (
                                          <span key={sid} className="lib-tag lib-dot">
                                            {sk.name}
                                          </span>
                                        ) : null;
                                      })
                                    : (
                                      <span className="lib-tag lib-unchecked">{t("No skills yet")}</span>
                                    )}
                                  {placedIds.length > 4 ? (
                                    <span className="lib-tag">+{placedIds.length - 4}</span>
                                  ) : null}
                                </div>
                              ) : null}
                              <div className="lib-rowacts" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="text lib-icon danger"
                                  title={t("Remove the project")}
                                  aria-label={t("Remove the project")}
                                  onClick={() => setProjectRemove({ dir: pr.dir, name: pr.name, keep: false })}>
                                  <svg viewBox="0 0 16 16" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="1.4">
                                    <path d={TRASH_GLYPH} />
                                  </svg>
                                </button>
                              </div>
                              <span className="chev" aria-hidden>
                                <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                  <path d={CHEV_R} />
                                </svg>
                              </span>
                            </div>

                            {pr.open ? (
                              <>
                                <div className="lib-projopts">
                                  <label className="lib-projcopy">
                                    <LibSwitch
                                      on={pr.copy}
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
                                    />
                                    <span
                                      onClick={(e) => {
                                        e.preventDefault();
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
                                      }}>
                                      {t("Copy files instead of linking")}
                                    </span>
                                  </label>
                                  <span className="note">
                                    {pr.copy
                                      ? t("Copies are made again whenever the library's skill changes; edits made to them are replaced.")
                                      : t("Links follow the library's skill: an update reaches the project at once.")}
                                  </span>
                                </div>

                                {skills.length === 0 ? (
                                  <p className="lib-aside lib-projfoot">{t("No skills in the library yet.")}</p>
                                ) : (
                                  skills.map((s) => {
                                    const on = (pr.placed[s.id] || []).includes("cursor");
                                    return (
                                      <div key={s.id} className="row lib-row lib-projskill">
                                        <span className="lib-glyph" aria-hidden>
                                          <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.3">
                                            <path d={SKILL_GLYPH} />
                                          </svg>
                                        </span>
                                        <div className="who">
                                          <div className="name">{s.name}</div>
                                          <div className="sub" title={s.desc}>{s.desc}</div>
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

                                <p className="lib-aside lib-projfoot">
                                  {t("Placed in .agents/skills of the project and listed in its .gitignore. A folder there that isn't magpie's is left as it is.")}
                                </p>
                              </>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : !addingProject ? (
                    <p>
                      {t("Give a project's agents some of these skills as the project's own: magpie links them into its .claude/skills and .agents/skills and keeps them out of git.")}
                    </p>
                  ) : null}
                </div>
              </>
            )}

            <div id="libSkillDiscover">
              <div className="row-head">
                <span className="label">{t("DISCOVER")}</span>
                <span className="grow" />
                <span>{t("Popular on skills.sh")}</span>
              </div>
              <input
                type="search"
                value={skillQ}
                placeholder={t("Search skills on skills.sh — react, pdf, testing…")}
                onChange={(e) => setSkillQ(e.target.value)}
               
              />
              <div className="mk-grid">
                {DEMO_SKILLS_MARKET.filter((c) => {
                  const q = skillQ.trim().toLowerCase();
                  if (!q) return true;
                  return `${c.name} ${c.by} ${c.desc}`.toLowerCase().includes(q);
                }).map((c) => (
                  <div
                    key={c.id}
                    className="mk-card click"
                    title={t("About {name}", { name: c.name })}
                    onClick={() => {
                      if ((c as { sheet?: boolean }).sheet) setSkillSheet(c);
                    }}>
                    <div className="mk-top">
                      <div className="mk-who">
                        <div className="mk-name">
                          <span className="mk-title">{c.name}</span>
                        </div>
                        <div className="mk-meta">
                          <span className="mk-pub">{c.by}</span>
                        </div>
                      </div>
                    </div>
                    <p className="mk-desc" title={c.desc}>{c.desc}</p>
                    <div className="mk-foot">
                      {c.installs ? (
                        <span className="mk-installs" title={t("{n} installs", { n: c.installs })}>
                          <span>{c.installs}</span>
                        </span>
                      ) : null}
                      <span className="grow" />
                      <button
                        type="button"
                        className="text action mk-add"
                        onClick={(e) => {
                          e.stopPropagation();
                          if ((c as { sheet?: boolean }).sheet) setSkillSheet(c);
                          else {
                            setSkills((list) => (list.some((x) => x.id === c.id) ? list : [...list, { id: c.id, name: c.name, desc: c.desc, agents: ["cursor"] }]));
                            onStatus?.(t("{name} added", { name: c.name }), "ok");
                          }
                        }}>
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
            <p className="lib-intro">
              {t("A hook is a command an agent runs at a point of its turn — a notification when it ends, a formatter after it edits a file. Add it once and magpie writes it into each agent you pick, in the shape that agent reads.")}
            </p>
            {hooks.length === 0 ? (
              <div className="lib-empty">
                <b>{t("No hooks in the library yet")}</b>
                <p>{t("Add one, and pick the agents that run it.")}</p>
                <button type="button" className="text action" onClick={openHookEditor}>{t("＋ Add a hook")}</button>
              </div>
            ) : (
              <>
                <div className="list lib-list">
                  {[...hooks].sort((a, b) => a.name.localeCompare(b.name)).map((h) => {
                    const ev =
                      t(HOOK_EVENTS.find(([v]) => v === h.event)?.[1] || h.event) +
                      (h.matcher ? ` · ${HOOK_TOOLS.find(([v]) => v === h.matcher)?.[1] || h.matcher}` : "");
                    return (
                      <div
                        key={h.id}
                        className="row lib-row click lib-hook"
                        title={t("Edit {name}", { name: h.name })}
                        onClick={() => {
                          const d = {
                            name: h.name,
                            description: h.description || "",
                            event: h.event,
                            matcher: h.matcher || "",
                            command: h.command,
                            timeout: "",
                            agents: [...h.agents],
                          };
                          setHookEditor(d);
                          setHookSnap(JSON.stringify(d));
                          setEventMenu(false);
                          setEventFilter("");
                          setToolMenu(false);
                        }}>
                        <span className="lib-glyph" aria-hidden>
                          <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.3">
                            <path d={HOOK_GLYPH} />
                          </svg>
                        </span>
                        <div className="who">
                          <div className="name mono">{h.name}</div>
                          {h.description ? <div className="lib-hookdesc">{h.description}</div> : null}
                          <div className="sub lib-hookev">{ev}</div>
                          <div className="sub mono lib-hookcmd" title={h.command}>{h.command}</div>
                        </div>
                        <LibChip on={h.agents.includes("cursor")} label="Cursor" onClick={() => {}} />
                      </div>
                    );
                  })}
                </div>
                <div className="after-list">
                  <button type="button" className="text" onClick={openHookEditor}>{t("＋ Add hook")}</button>
                </div>
              </>
            )}
          </>
        ) : tab === "rtk" ? (
          <>
            <p className="lib-intro">
              {t("RTK rewrites the shell commands an agent runs — git status, cargo test, ls… — to print only what the model needs, so they cost fewer tokens. Switch it on for an agent and magpie runs RTK's own installer for it.")}
            </p>
            {rtkPhase === "checking" ? (
              <div className="lib-skel">
                <div className="row skeleton" />
              </div>
            ) : (
              <div className="list lib-card">{/* Magpie renderRTK client.js L839–843 */}
                <div className="lib-cardhead">
                  <span
                    className="lib-glyph lib-rtk-logo"
                    aria-hidden
                    style={{ ["--i" as string]: "url(/icons/rtk.png)" }}>
                    <span className="mask" />
                  </span>
                  <b>RTK</b>
                  <span className="grow" />
                </div>
                <p className="lib-rtk-gain">
                  {rtkPhase === "installing"
                    ? t("Installing RTK… this can take a minute.")
                    : t("RTK isn't installed. magpie can install it for you, or get it from its site.")}
                </p>
                {rtkPhase !== "installing" ? (
                  <p className="lib-rtk-cmd mono">
                    curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
                  </p>
                ) : null}
                <div>
                  <button
                    type="button"
                    className="text action" disabled={rtkPhase === "installing"}
                    onClick={() => {
                      // Magpie installRTK busy → API; demo does not run the binary installer
                      setRtkPhase("installing");
                      window.setTimeout(() => {
                        setRtkPhase("missing");
                        onStatus?.(t("Demo shell: RTK installer not run — still not installed"), "warn");
                      }, 1100);
                    }}>
                    {rtkPhase === "installing" ? t("Installing…") : t("Install RTK")}
                  </button>
                  <button
                    type="button"
                    className="text" disabled={rtkPhase === "installing"}
                    onClick={() => window.open("https://rtk-ai.app", "_blank", "noopener,noreferrer")}>
                    {t("Get RTK")}
                  </button>
                  <button
                    type="button"
                    className="text" disabled={rtkPhase === "installing"}
                    onClick={() => {
                      // Magpie: rtk = null; render() → skeleton + loadRTK
                      setRtkPhase("checking");
                      window.setTimeout(() => setRtkPhase("missing"), 480);
                    }}>
                    {t("Check again")}
                  </button>
                </div>
              </div>
            )}
            <div className="row-head lib-cardhead">
              <span className="label">{t("Agents")}</span>
              <span className="grow" />
              <span>{t("restart an agent after switching it")}</span>
            </div>
            <div className="list">
              {DEMO_AGENTS.map((a) => {
                const on = !!rtkOn[a.id];
                // Magpie: (!rtk.path && !a.on) || rtkInstalling → disabled
                const disabled = rtkPhase === "installing" || rtkPhase === "checking" || !on;
                return (
                  <div key={a.id} className="row">
                    <img src="/icons/cursor.svg" alt="" width={18} height={18} />
                    <b>{a.name}</b>
                    <span className="grow" />
                    <LibSwitch
                      on={on}
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
                    />
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
          }}>
          <div className="ehead">
            <svg className="ic" viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
              <path d={mcpEditor.transport === "stdio" ? CMD_PATH : WEB_PATH} />
            </svg>
            <b>{mcpEditId ? t("Edit {name}", { name: mcpEditor.name || "server" }) : t("New MCP server")}</b>
            <span className="note">{t("or paste its JSON anywhere here")}</span>
          </div>
          <LibField label={t("Name")} hint={t("Letters, digits, - and _ — what the agents call it")}>
            <WordsField
              className="full" ref={mcpNameRef}
              value={mcpEditor.name}
              placeholder={t("e.g. github")}
              onChange={(e) => setMcpEditor({ ...mcpEditor, name: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </LibField>
          <LibField label={t("Runs as")}>
            <Segs
              value={mcpEditor.transport}
              items={[
                { id: "stdio" as const, label: t("Command") },
                { id: "http" as const, label: "HTTP" },
                { id: "sse" as const, label: "SSE" },
              ]}
              onChange={(id) => setMcpEditor({ ...mcpEditor, transport: id })}
            />
          </LibField>
          {/* Magpie editServer: lib-slot + lib-grid display:contents (client.js L2004–2038; library.css L332–333) */}
          <div className="lib-slot">
            <div className="lib-grid">
              {mcpEditor.transport === "stdio" ? (
                <>
                  <LibField label={t("Command")} hint={t("The command and its arguments, as you'd type them")}>
                    <WordsField
                      className="full mono" value={mcpEditor.command}
                      placeholder="npx -y @modelcontextprotocol/server-github"
                      onChange={(e) => setMcpEditor({ ...mcpEditor, command: e.target.value })}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </LibField>
                  <LibField
                    label={t("Environment")}
                    hint={t("A value can name a variable, as ${NAME}: each agent is given it in its own way, so the token stays out of its settings")}
                  >
                    <LibPairs
                      rows={mcpEditor.envRows}
                      keyHint="TOKEN"
                      valHint={t("value")}
                      onChange={(envRows) => setMcpEditor({ ...mcpEditor, envRows })}
                    />
                  </LibField>
                </>
              ) : (
                <>
                  <LibField label="URL">
                    <WordsField
                      className="full mono" value={mcpEditor.url}
                      placeholder="https://example.com/mcp"
                      onChange={(e) => setMcpEditor({ ...mcpEditor, url: e.target.value })}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </LibField>
                  <LibField
                    label={t("Headers")}
                    hint={t("A value can name a variable, as ${NAME}: each agent is given it in its own way, so the token stays out of its settings")}
                  >
                    <LibPairs
                      rows={mcpEditor.headerRows}
                      keyHint="Authorization"
                      valHint="Bearer …"
                      onChange={(headerRows) => setMcpEditor({ ...mcpEditor, headerRows })}
                    />
                  </LibField>
                  {mcpEditor.transport === "http" ? (
                    <>
                      <LibField
                        label={t("OAuth app")}
                        hint={
                          <div className="hint">
                            {!mcpEditor.oauthOpen
                              ? t("For a server whose sign-in doesn't let magpie register itself, as GitHub's")
                              : t("Made with its vendor (GitHub's under Settings › Developer settings › OAuth Apps), with {url} as its callback URL", {
                                  url: `http://localhost${mcpEditor.callbackPort ? ":" + mcpEditor.callbackPort : ""}/callback`,
                                })}
                          </div>
                        }
                      >
                        {/* Magpie drawApp: lib-app + field2 inputs + lib-x; closed = lib-addpair (client.js L1971–2031; library.css L133–135 / L341–343) */}
                        <div className="lib-app">
                          {!mcpEditor.oauthOpen ? (
                            <button type="button" className="text lib-addpair" onClick={() => setMcpEditor({ ...mcpEditor, oauthOpen: true })}>{t("Use your own OAuth app")}</button>
                          ) : (
                            <>
                              <input type="text" placeholder={t("Client ID")} aria-label={t("Client ID")} spellCheck={false} autoComplete="off" value={mcpEditor.clientId} onChange={(e) => setMcpEditor({ ...mcpEditor, clientId: e.target.value })} onKeyDown={(e) => e.stopPropagation()} />
                              <input type="password" placeholder={t("Client secret")} aria-label={t("Client secret")} spellCheck={false} autoComplete="off" value={mcpEditor.clientSecret} onChange={(e) => setMcpEditor({ ...mcpEditor, clientSecret: e.target.value })} onKeyDown={(e) => e.stopPropagation()} />
                              <input type="text" className="port" placeholder={t("Callback port")} aria-label={t("Callback port")} inputMode="numeric" spellCheck={false} autoComplete="off" value={mcpEditor.callbackPort} onChange={(e) => setMcpEditor({ ...mcpEditor, callbackPort: e.target.value.replace(/\D/g, "").slice(0, 5) })} onKeyDown={(e) => e.stopPropagation()} />
                              <button
                                type="button"
                                className="text lib-x"
                                title={t("Remove")}
                                onClick={() => setMcpEditor({ ...mcpEditor, oauthOpen: false, clientId: "", clientSecret: "", callbackPort: "" })}
                              >
                                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
                                  <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </LibField>
                      <LibField
                        label={t("Sign-in")}
                        hint={
                          <>
                            {mcpEditId && mcpServers.find((x) => x.id === mcpEditId)?.oauthRefused ? (
                              <div className="hint err">{t("the sign-in was refused (access_denied)")}</div>
                            ) : null}
                            <div className="hint">{t("For a server that asks you to sign in (OAuth): magpie signs in once, and every agent given it uses that sign-in")}</div>
                          </>
                        }
                      >
                        {/* Magpie signInBox → .lib-signin > .lib-signin-line + .note (client.js L1714–1733; library.css L131–132) */}
                        <div className="lib-signin">
                          <div className="lib-signin-line">
                            {mcpSignWaiting ? (
                              <>
                                <span className="note">{t("Finish signing in in your browser…")}</span>
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
                              </>
                            ) : (
                              <button type="button" className="text action" onClick={() => saveMcp({ signIn: true })}>
                                {t(mcpEditId ? "Sign in" : "Save and sign in")}
                              </button>
                            )}
                          </div>
                        </div>
                      </LibField>
                    </>
                  ) : null}
                </>
              )}
            </div>
          </div>
          <LibField label={t("Agents")}>
            <div className="lib-agents">
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
          </LibField>
          {/* Magpie editServer bar: Remove + copyConfigButton + grow + Cancel + Save/Add
              (library/client.js L2046–2091; button() → text+cls; .bar .danger margin-left:-7px app.css L2848).
              No invent .acts — Magpie puts Remove in .bar. */}
          <div className="bar">
            {mcpEditId ? (
              <>
                <button
                  type="button"
                  className="text danger"
                  onClick={() => {
                    const s = mcpServers.find((x) => x.id === mcpEditId);
                    if (s) setMcpRemoveAsk({ id: s.id, name: s.name });
                  }}
                >
                  {t("Remove from the library")}
                </button>
                <span className="pref-anchor">
                  <button
                    type="button"
                    className="text lib-updall lib-copyconfig"
                    title={t("Copy {name} as an agent's project file has it, to paste into a project yourself", {
                      name: mcpEditor.name || "server",
                    })}
                    aria-expanded={mcpCopyMenu === "editor"}
                    onClick={() => setMcpCopyMenu((m) => (m === "editor" ? null : "editor"))}
                  >
                    {mcpCopyFlash && mcpCopyMenu !== "editor" ? "✓ " : ""}
                    {t("Copy config…")}
                  </button>
                  {mcpCopyMenu === "editor" ? (
                    <div className="pop proto-menu" role="menu" aria-label={t("Copy as an agent's project file")}>
                      <div className="pm-head">{t("Copy as an agent's project file")}</div>
                      <button
                        type="button"
                        className="pm-item"
                        role="menuitem"
                        onClick={() => mcpEditId && copyMcpConfig([mcpEditId])}
                      >
                        <span className="pm-tick" aria-hidden />
                        <span className="pm-words">
                          <span className="pm-name">Cursor</span>
                          <span className="pm-note" />
                        </span>
                      </button>
                    </div>
                  ) : null}
                </span>
              </>
            ) : null}
            <span className="grow" />
            <button type="button" className="text" onClick={tryCloseMcp} disabled={mcpSignWaiting}>{t("Cancel")}</button>
            <button
              type="button"
              className="text primary" disabled={mcpSignWaiting}
              onClick={() => saveMcp()}>
              {t(mcpEditId || mcpSignWaiting ? "Save" : "Add")}
            </button>
          </div>
        </LibModal>
      ) : null}

      {imageSheet ? (
        <LibModal onBg={() => setImageSheet(false)} editorClassName="mk-sheet">
          {/* Magpie serverSheet: mk-sheethead / mk-about / mk-hint (library/client.js L4795–4849) */}
          <div className="mk-sheethead">
            <span className="mk-icon mono" aria-hidden>
              <span className="mk-mono">M</span>
            </span>
            <div className="mk-who">
              <div className="mk-name big">Magpie Image</div>
              <div className="mk-meta">
                <span className="mk-pub">Magpie</span>
                <span className="mk-badge">magpie</span>
              </div>
            </div>
            <a
              className="mk-ext"
              href="https://github.com/beyondchenlin/magpie-shell-demo"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open("https://github.com/beyondchenlin/magpie-shell-demo", "_blank", "noopener,noreferrer");
              }}>
              <span>{t("Homepage")}</span>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d={OUT_GLYPH} />
              </svg>
            </a>
          </div>
          <p className="mk-about">
            {t("Generate and edit images with the image model set in Magpie (Settings → Images), and make short videos with a video model set up in Magpie (Grok Imagine, Seedance), saved in the project.")}
          </p>
          <p className="mk-hint">
            {t("Pick the agents that may generate images: each image costs what the model set in Settings → Images charges.")}
          </p>
          <LibField label={t("Agents")}>
            <div className="lib-agents">
              <LibChip on={imageAgents.includes("cursor")} label="Cursor" onClick={() => setImageAgents((list) => (list.includes("cursor") ? list.filter((x) => x !== "cursor") : [...list, "cursor"]))} />
            </div>
          </LibField>
          <div className="bar">
            <span className="mk-id mono">magpie-image</span>
            <span className="grow" />
            <button type="button" className="text" onClick={() => setImageSheet(false)}>{t("Cancel")}</button>
            <button
              type="button"
              className="text primary" onClick={() => {
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
              }}>
              {t("Add to the library")}
            </button>
          </div>
        </LibModal>
      ) : null}


      {skillSheet ? (
        <LibModal onBg={() => setSkillSheet(null)} editorClassName="mk-sheet">
          {/* Magpie skillSheet: mk-sheethead / mk-about / mk-hint (library/client.js L4899–4939) */}
          <div className="mk-sheethead">
            <span className="mk-icon mono" aria-hidden>
              <span className="mk-mono">{(skillSheet.name.replace(/^[^a-z0-9]+/i, "").charAt(0) || "?").toUpperCase()}</span>
            </span>
            <div className="mk-who">
              <div className="mk-name big">{skillSheet.name}</div>
              <div className="mk-meta">
                <span className="mk-pub">{skillSheet.by}</span>
                {skillSheet.installs ? (
                  <span className="mk-badge">{t("{n} installs", { n: skillSheet.installs })}</span>
                ) : null}
              </div>
            </div>
            <a
              className="mk-ext"
              href={`https://skills.sh/${skillSheet.by}/${skillSheet.id}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(`https://skills.sh/${skillSheet.by}/${skillSheet.id}`, "_blank", "noopener,noreferrer");
              }}>
              <span>skills.sh</span>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d={OUT_GLYPH} />
              </svg>
            </a>
          </div>
          <p className="mk-about">{skillSheet.desc}</p>
          <div className="mk-hint">
            <span>{t("From")}</span>
            <a
              className="mk-ext"
              href={`https://github.com/${skillSheet.by}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(`https://github.com/${skillSheet.by}`, "_blank", "noopener,noreferrer");
              }}>
              <span>github.com/{skillSheet.by}</span>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d={OUT_GLYPH} />
              </svg>
            </a>
          </div>
          <LibField label={t("Agents")}>
            <div className="lib-agents">
              <LibChip on label="Cursor" onClick={() => {}} />
            </div>
          </LibField>
          <div className="bar">
            <span className="grow" />
            <button type="button" className="text" onClick={() => setSkillSheet(null)}>{t("Cancel")}</button>
            <button
              type="button"
              className="text primary" onClick={() => {
                const c = skillSheet;
                setSkills((list) => (list.some((x) => x.id === c.id) ? list : [...list, { id: c.id, name: c.name, desc: c.desc, agents: ["cursor"] }]));
                setSkillSheet(null);
                onStatus?.(t("{name} added", { name: c.name }), "ok");
              }}>
              {t("Add to the library")}
            </button>
          </div>
        </LibModal>
      ) : null}

      {hookEditor ? (
        <LibModal onBg={tryCloseHook} editorClassName="lib-hookedit">
          <div className="ehead">
            <b>{t("New hook")}</b>
          </div>
          <LibField label={t("Name")} hint={t("Letters, digits, - and _")}>
            <WordsField
              className="full" value={hookEditor.name}
              placeholder={t("e.g. notify")}
              onChange={(e) => setHookEditor({ ...hookEditor, name: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </LibField>
          <LibField label={t("Description")} hint={t("Optional: what it's for, in any language. Only the library keeps it")}>
            <textarea className="lib-text small lib-hookdescin" rows={3}
              maxLength={200}
              value={hookEditor.description}
              placeholder={t("e.g. Tell me when a turn ends")}
              onChange={(e) => setHookEditor({ ...hookEditor, description: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </LibField>
            {/* Magpie client.js L2291–2313: sess-pick.lib-menu + openProtoMenu(..., "When it runs", "", "left", false, "Find an event") */}
          <LibField label={t("When it runs")}>
            <span className="pref-anchor lib-hookpick">
              <PrefPick
                className="lib-menu lib-hookevent"
                label={
                  hookEditor.event.includes(":")
                    ? `Cursor · ${hookEditor.event.split(":")[1]}`
                    : t(HOOK_EVENTS.find(([v]) => v === hookEditor.event)?.[1] || hookEditor.event)
                }
                open={eventMenu}
                onClick={() => { setEventMenu((v) => !v); setToolMenu(false); }}
                aria-haspopup="menu"
              />
              {eventMenu ? (
                <div className="pop proto-menu" role="menu" aria-label={t("When it runs")}>
                  <div className="pm-head">{t("When it runs")}</div>
                  <div className="sc-top">
                    <input
                      className="sc-q"
                      type="search"
                      value={eventFilter}
                      placeholder={t("Find an event")}
                      aria-label={t("Find an event")}
                      autoFocus
                      onChange={(e) => setEventFilter(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  {HOOK_EVENTS.map(([v, n]) => {
                    const on = hookEditor.event === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        role="menuitemradio"
                        aria-checked={on}
                        className={`pm-item${on ? " on" : ""}`}
                        onClick={() => {
                          let matcher = hookEditor.matcher;
                          if (!toolEvent(v)) matcher = "";
                          if (!HOOK_TOOLS.some(([m]) => m === matcher)) matcher = "";
                          setHookEditor({
                            ...hookEditor,
                            event: v,
                            matcher,
                            agents: DEMO_AGENTS.map((a) => a.id),
                          });
                          setEventMenu(false);
                          setEventFilter("");
                        }}>
                        <span className="pm-tick" aria-hidden>
                          {on ? (
                            <svg viewBox="0 0 16 16" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                              <path d={PM_CHECK} />
                            </svg>
                          ) : null}
                        </span>
                        <span className="pm-words">
                          <span className="pm-name">{t(n)}</span>
                          <span className="pm-note">{t("every agent, in its own name for it")}</span>
                        </span>
                      </button>
                    );
                  })}
                  {CURSOR_HOOK_EVENTS.filter((ev) => {
                    const q = eventFilter.trim().toLocaleLowerCase();
                    if (!q) return true;
                    return (`Cursor · ${ev}`).toLocaleLowerCase().includes(q);
                  }).map((ev) => {
                    const v = `cursor:${ev}`;
                    const on = hookEditor.event === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        role="menuitemradio"
                        aria-checked={on}
                        className={`pm-item${on ? " on" : ""}`}
                        onClick={() => {
                          setHookEditor({ ...hookEditor, event: v, matcher: "", agents: ["cursor"] });
                          setEventMenu(false);
                          setEventFilter("");
                        }}>
                        <span className="pm-tick" aria-hidden>
                          {on ? (
                            <svg viewBox="0 0 16 16" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                              <path d={PM_CHECK} />
                            </svg>
                          ) : null}
                        </span>
                        <span className="pm-words">
                          <span className="pm-name">Cursor · {ev}</span>
                          <span className="pm-note">{t("{agent}'s own event", { agent: "Cursor" })}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </span>
          </LibField>
          <div className="lib-slot">
            <div className="lib-grid">
            {hookEditor.event.includes(":") ? (
              <LibField label={t("Matcher")} hint={t("The agent's own matcher, as its hooks file has it; empty for all")}>
                <WordsField
                  className="full mono lib-hookmatcher" value={hookEditor.matcher}
                  placeholder={t("every tool")}
                  onChange={(e) => setHookEditor({ ...hookEditor, matcher: e.target.value })}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </LibField>
            ) : toolEvent(hookEditor.event) ? (
              /* Magpie client.js L2337–2347: openProtoMenu(..., "For which tools") */
              <LibField label={t("For which tools")} hint={t("Each agent's own names for them")}>
              <span className="pref-anchor lib-hookpick">
                <PrefPick
                  className="lib-menu lib-hooktool"
                  label={t(HOOK_TOOLS.find(([v]) => v === hookEditor.matcher)?.[1] || "Any tool")}
                  open={toolMenu}
                  title={t(HOOK_TOOLS.find(([v]) => v === hookEditor.matcher)?.[1] || "Any tool")}
                  onClick={() => { setToolMenu((v) => !v); setEventMenu(false); }}
                  aria-haspopup="menu"
                />
                {toolMenu ? (
                  <div className="pop proto-menu" role="menu" aria-label={t("For which tools")}>
                    <div className="pm-head">{t("For which tools")}</div>
                    {HOOK_TOOLS.map(([v, n]) => {
                      const on = hookEditor.matcher === v;
                      return (
                        <button
                          key={v || "any"}
                          type="button"
                          role="menuitemradio"
                          aria-checked={on}
                          className={`pm-item${on ? " on" : ""}`}
                          onClick={() => { setHookEditor({ ...hookEditor, matcher: v }); setToolMenu(false); }}>
                          <span className="pm-tick" aria-hidden>
                            {on ? (
                              <svg viewBox="0 0 16 16" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                                <path d={PM_CHECK} />
                              </svg>
                            ) : null}
                          </span>
                          <span className="pm-words">
                            <span className="pm-name">{t(n)}</span>
                            <span className="pm-note" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </span>
              </LibField>
            ) : null}
            </div>
          </div>
          <LibField label={t("Command")} hint={t("Run by the agent's shell, in the session's folder; the agent passes what happened as JSON on its input")}>
            <WordsField
              className="full mono" value={hookEditor.command}
              placeholder="curl -s https://api.day.app/KEY/done"
              onChange={(e) => setHookEditor({ ...hookEditor, command: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </LibField>
          <LibField label={t("Timeout (seconds)")}>
            <WordsField
              className="lib-hooktimeout" inputMode="numeric"
              value={hookEditor.timeout}
              placeholder={t("the agent's own")}
              onChange={(e) => setHookEditor({ ...hookEditor, timeout: e.target.value.replace(/\D/g, "") })}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </LibField>
          <LibField label={t("Agents")}>
            <div className="lib-agents">
              <LibChip on={hookEditor.agents.includes("cursor")} label="Cursor" onClick={() => setHookEditor({ ...hookEditor, agents: hookEditor.agents.includes("cursor") ? hookEditor.agents.filter((x) => x !== "cursor") : [...hookEditor.agents, "cursor"] })} />
            </div>
          </LibField>
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

      {/* Magpie confirmRemoveProject: openLib editor.lib-editor + lib-pick.lib-keep
          (plugins/library/client.js L3668–3703) — not invent ActionConfirm.extra / Tick.keep */}
      {projectRemove ? (
        <LibModal
          onBg={() => {
            setProjectRemove(null);
          }}>
          <div className="ehead">
            <b>{t("Remove {name}?", { name: projectRemove.name })}</b>
          </div>
          <p className="lib-confirm">
            {projectRemove.keep
              ? t("magpie forgets the project. The skills and MCP servers it put in the folder stay there as they are, with their lines in its .gitignore, and are yours from then on; a linked skill still follows the library's.")
              : t("The skills and MCP servers magpie put in it are taken away, with their lines in its .gitignore. Nothing else in the folder is touched.")}
          </p>
          {(() => {
            const pr = projects.find((p) => p.dir === projectRemove.dir);
            const has = pr ? Object.values(pr.placed).some((a) => a.length > 0) : false;
            if (!has) return null;
            return (
              <label className="lib-pick lib-keep">
                <input
                  type="checkbox"
                  checked={projectRemove.keep}
                  onChange={(e) =>
                    setProjectRemove({ ...projectRemove, keep: e.target.checked })
                  }
                />
                <span className="who">
                  <span className="name">{t("Keep its skills and MCP servers")}</span>
                  <span className="sub">
                    {t("Remove the project from magpie only, leaving what magpie wrote into it")}
                  </span>
                </span>
              </label>
            );
          })()}
          <div className="bar">
            <span className="grow" />
            <button
              type="button"
              className="text"
              onClick={() => {
                setProjectRemove(null);
              }}>
              {t("Cancel")}
            </button>
            <button
              type="button"
              className="text primary danger-fill"
              onClick={() => {
                const { dir, name, keep } = projectRemove;
                setProjects((list) => list.filter((x) => x.dir !== dir));
                setProjectRemove(null);
                onStatus?.(
                  keep
                    ? t("{name} removed, its skills and servers kept", { name })
                    : t("{name} removed", { name }),
                  "ok",
                );
              }}>
              {t("Remove")}
            </button>
          </div>
        </LibModal>
      ) : null}


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
                className="text action lib-updall" disabled={mcpServers.every((s) => s.agents.includes("cursor"))}
                title={t("Give {agent} every server", { agent: "Cursor" })}
                onClick={() => {
                  setMcpServers((list) => list.map((x) => ({ ...x, agents: x.agents.includes("cursor") ? x.agents : [...x.agents, "cursor"] })));
                  onStatus?.(t("Written to Cursor"), "ok");
                }}>
                {t("Turn all on")}
              </button>
              <button
                type="button"
                className="text action lib-updall" title={t("Take every server from Cursor")}
                onClick={() => setMcpTurnAllOffAsk(true)}>
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
        /* Nest oauth is the system browser; demo wall uses Magpie modal/dialog/editor/bar only (app.css L3250+ / L2847) — no invent lib-oauth-* */
        <div className="modal open" role="dialog" aria-modal>
          <div className="dialog">
            <div className="editor">
              <div className="ehead">
                <b>{t("Magpie is requesting access")}</b>
              </div>
              <div className="note">
                <div><b>{t("Name")}</b> · Magpie</div>
                <div><b>{t("Website")}</b> · https://usemagpie.ai</div>
                <div><b>Redirect</b> · http://127.0.0.1:41671/callback</div>
                <div><b>{t("Access")}</b> · Read, Write</div>
              </div>
              <p>
                {t("This MCP client is requesting access to your Linear workspace. Approve was not used in the nest — Cancel refuses with access_denied.")}
              </p>
              <div className="bar">
                <span className="grow" />
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
                  }}>
                  {t("Cancel")}
                </button>
                <button
                  type="button"
                  className="text primary"
                  disabled
                  title={t("Approve was not clicked in the nest")}>
                  {t("Approve")}
                </button>
              </div>
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

    </main>
  );
}

