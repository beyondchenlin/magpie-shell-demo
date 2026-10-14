import { useEffect, useRef, useState, type ReactNode } from "react";
import { ModelPop, PrefPickChip, type PopOption } from "../../components/ModelPop";
import { Segs } from "../../components/Segs";
import { WarmAt } from "../../components/WarmAt";
import { demoCopy, t } from "../../i18n";

export const DEMO_MODELS: PopOption[] = [
  { value: "codex/gpt-5.4", label: "gpt-5.4", note: "OpenAI", group: "OpenAI", icon: "openai" },
  { value: "codex/gpt-5.4-mini", label: "gpt-5.4-mini", note: "OpenAI", group: "OpenAI", icon: "openai" },
  { value: "anthropic/claude-sonnet-4-5", label: "claude-sonnet-4-5", note: "Anthropic", group: "Anthropic", icon: "anthropic" },
  { value: "google/gemini-2.5-pro", label: "gemini-2.5-pro", note: "Google", group: "Google", icon: "google" },
];

const AUTO_RESET_CASES = [
  {
    id: "week" as const,
    say: "when its week runs out",
    on: "On: a reset is used by itself when this account's week is used up and no other account can answer, one a week at most. The five hours running out never uses one. Click to turn it off.",
    off: "Off: a used-up week is waited out, and the vendor may start it again sooner; requests go to your other accounts, or are refused with why. Click to turn it on.",
  },
  {
    id: "expiring" as const,
    say: "before one expires",
    on: "On: the reset that runs out first is used about half an hour before it does, if this account's windows have been used, or at once when the account is held up until after then. Click to turn it off.",
    off: "Off: a reset that runs out unused is lost. Click to turn it on.",
  },
];

export type AutoResetMap = Record<string, { week: boolean; expiring: boolean }>;

function OpenAIIcon() {
  return (
    <span className="ic" aria-hidden style={{ display: "inline-flex", width: 14, height: 14, alignItems: "center", justifyContent: "center", fontSize: 11 }}>
      ◉
    </span>
  );
}

function named(id: string) {
  const m = DEMO_MODELS.find((x) => x.value === id);
  return m ? `${m.label} · ${m.note}` : id;
}

type CodexPickProps = {
  field: "codexTitles" | "codexDescriptions" | "codexPredictions" | "codexAutoReview";
  value: string;
  label: string;
  onChange: (v: string) => void;
};

export function CodexModelPick({ field, value, label, onChange }: CodexPickProps) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const chipRef = useRef<HTMLButtonElement | null>(null);

  const isReview = field === "codexAutoReview";
  const ownLabel = isReview ? t("Codex’s own pick") : t("Codex’s own (ChatGPT)");
  const ownNote = isReview ? t("as Codex picks it") : t("as Codex sends them");

  const options: PopOption[] = [
    { value: "", label: ownLabel, note: ownNote, icon: "openai", reset: true },
    ...(isReview ? [] : [{ value: "off", label: t("Off"), note: t("no title, nothing sent"), icon: "openai", reset: true } as PopOption]),
    ...DEMO_MODELS,
  ];

  let display: ReactNode;
  if (value === "off") display = <span>{t("Off")}</span>;
  else if (value) display = (<><OpenAIIcon /><span>{named(value)}</span></>);
  else display = (<><OpenAIIcon /><span>{ownLabel}</span></>);

  return (
    <>
      <PrefPickChip
        label={label}
        display={display}
        open={open}
        chipRef={(el) => { chipRef.current = el; }}
        onToggle={(el) => {
          if (open) setOpen(false);
          else { setAnchor(el); setOpen(true); }
        }}
      />
      <ModelPop
        open={open}
        anchor={anchor || chipRef.current}
        options={options}
        value={value}
        modelPicker
        onPick={(v) => { onChange(v); setOpen(false); }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export function AutoResetOwn({
  users,
  map,
  onChange,
}: {
  users: string[];
  map: AutoResetMap;
  onChange: (next: AutoResetMap) => void;
}) {
  if (!users.length) return null;
  return (
    <>
      {users.map((user) => {
        const was = map[user.toLowerCase()] || { week: false, expiring: false };
        return (
          <div className="row pref ar-own" key={user} data-user={user}>
            <div className="who">
              <div className="name" title={user}>{user}</div>
            </div>
            <div className="ar-own-cases">
              {AUTO_RESET_CASES.map((c) => (
                <div className="ar-own-case" key={c.id} data-case={c.id}>
                  <span className="ar-own-say" title={t(was[c.id] ? c.on : c.off)}>{t(c.say)}</span>
                  <Segs
                    value={was[c.id] ? "on" : "off"}
                    onChange={(v) => {
                      const next = { ...map, [user.toLowerCase()]: { ...was, [c.id]: v === "on" } };
                      onChange(next);
                    }}
                    items={[
                      { id: "off", label: t("Off") },
                      { id: "on", label: t("On") },
                    ]}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

export function DailyWarmRow({
  ats,
  onChange,
  sub,
}: {
  ats: string[];
  onChange: (ats: string[]) => void;
  sub: string;
}) {
  return (
    <div className="row pref">
      <div className="who">
        <div className="name">{t("Daily warm-up")}</div>
        <div className="sub" title={sub}>{sub}</div>
      </div>
      <div className="val">
        <WarmAt ats={ats} onChange={onChange} />
      </div>
    </div>
  );
}

function isSocks(url: string) {
  return /^socks5h?:\/\//i.test(url.trim());
}

export function ProxyBlock({
  mode,
  url,
  user,
  pass,
  onMode,
  onUrl,
  onUser,
  onPass,
  onSave,
  onTest,
  testLine,
}: {
  mode: "auto" | "off" | "custom";
  url: string;
  user: string;
  pass: string;
  onMode: (m: "auto" | "off" | "custom") => void;
  onUrl: (v: string) => void;
  onUser: (v: string) => void;
  onPass: (v: string) => void;
  onSave: () => void;
  onTest: () => void;
  testLine?: string;
}) {
  const socks = mode === "custom" && isSocks(url);
  const sub =
    mode === "off"
      ? t("Off: requests to vendors without a proxy of their own, and update checks, go direct")
      : mode === "custom" && url
        ? t("Requests to vendors without a proxy of their own, and update checks, go through {proxy}", { proxy: url })
        : t("No system proxy found; requests to vendors without a proxy of their own, and update checks, go direct");

  return (
    <div className="row pref">
      <div className="who">
        <div className="name">{t("Proxy")}</div>
        <div className="sub">{sub}</div>
        {testLine ? <div className="sub" id="proxyCheck">{testLine}</div> : null}
      </div>
      <div className="val">
        <div className="proxy-segs" id="proxySegs">
          <div className="proxy-controls">
            <button type="button" className="text proxy-test" title={t("Ask Cloudflare through the proxy and direct, and compare the addresses the two leave from")} onClick={onTest}>
              {t("Test")}
            </button>
            {mode === "custom" ? (
              <input
                className="proxy"
                value={url}
                placeholder="http://127.0.0.1:7890"
                aria-label={t("Proxy address")}
                onChange={(e) => onUrl(e.target.value)}
                onBlur={onSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSave();
                }}
              />
            ) : null}
            <Segs
              value={mode}
              onChange={(v) => onMode(v as "auto" | "off" | "custom")}
              items={[
                { id: "auto", label: t("Auto") },
                { id: "off", label: t("Off") },
                { id: "custom", label: t("Custom") },
              ]}
            />
          </div>
          {socks ? (
            <div className="proxy-auth">
              <input
                className="proxy-credential"
                value={user}
                placeholder={t("Username (optional)")}
                aria-label={t("Username (optional)")}
                onChange={(e) => onUser(e.target.value)}
                onBlur={onSave}
              />
              <input
                className="proxy-credential"
                type="password"
                value={pass}
                placeholder={t("Password (optional)")}
                aria-label={t("Password (optional)")}
                onChange={(e) => onPass(e.target.value)}
                onBlur={onSave}
              />
              <button type="button" className="text" onClick={onSave}>{t("Save")}</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const DEMO_LAN_URLS = ["http://192.168.1.10:3425", "http://10.0.0.5:3425"];

export function LanAddressRow({
  port,
  protocol,
  selected,
  onProtocol,
  onSelect,
  onStatus,
}: {
  port: string;
  protocol: "openai" | "anthropic";
  selected: string;
  onProtocol: (p: "openai" | "anthropic") => void;
  onSelect: (u: string) => void;
  onStatus?: (m: string, k?: string) => void;
}) {
  const urls = DEMO_LAN_URLS.map((u) => u.replace(/:\d+$/, `:${port}`));
  const cur = urls.includes(selected.replace(/:\d+$/, `:${port}`)) ? selected.replace(/:\d+$/, `:${port}`) : urls[0];
  const suffix = protocol === "openai" ? "/v1" : "";
  const shown = cur + suffix;
  const [menu, setMenu] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  return (
    <div className={`row pref lan-address-row${urls.length > 1 ? " multi" : ""}`}>
      <div className="who">
        <div className="name">{t("Address")}</div>
      </div>
      <div className="val">
        <div className="lan-address-controls">
          <Segs
            value={protocol}
            onChange={(v) => onProtocol(v as "openai" | "anthropic")}
            items={[
              { id: "openai", label: "OpenAI" },
              { id: "anthropic", label: "Anthropic" },
            ]}
          />
          {urls.length === 1 ? (
            <code className="lan-address-text" title={shown}>{shown}</code>
          ) : (
            <button
              type="button"
              className={`proto pick lan-interface${menu ? " open" : ""}`}
              ref={btnRef}
              aria-label={t("Address")}
              onClick={() => setMenu((m) => !m)}
            >
              <span className="lan-url">{shown}</span>
              <svg viewBox="0 0 16 16" width={11} height={11} aria-hidden>
                <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <span className="lan-copy">
            <button
              type="button"
              className="copy"
              title={t("Copy")}
              aria-label={`${t("Copy")} ${t("{label} address", { label: protocol === "openai" ? "OpenAI" : "Anthropic" })}`}
              onClick={async () => {
                try { await navigator.clipboard.writeText(shown); } catch { /* */ }
                onStatus?.(t("{what} copied", { what: t("{label} address", { label: protocol === "openai" ? "OpenAI" : "Anthropic" }) }), "ok");
              }}
            >
              <svg viewBox="0 0 16 16" width={13} height={13}>
                <rect x="5.5" y="5.5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <path d="M3.5 10.5V3.5h7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </span>
          {menu ? (
            <div className="pop proto-menu lan-address-menu" style={{ position: "absolute", top: 44, right: 8, zIndex: 30 }} role="menu">
              <ul style={{ listStyle: "none", margin: 0, padding: 4 }}>
                {urls.map((u) => (
                  <li
                    key={u}
                    className={u === cur ? "sel" : ""}
                    role="menuitem"
                    style={{ padding: "6px 8px", borderRadius: 7, cursor: "pointer" }}
                    onClick={() => { onSelect(u); setMenu(false); }}
                  >
                    <span className="pm-name">{u}{suffix}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export type RedactRule = { kind: string; prefix?: string; regex?: string };

export function RedactRulesBlock({
  rules,
  onChange,
}: {
  rules: RedactRule[];
  onChange: (r: RedactRule[]) => void;
}) {
  const [kind, setKind] = useState("");
  const [by, setBy] = useState<"prefix" | "regex">("prefix");
  const [match, setMatch] = useState("");
  const [editAt, setEditAt] = useState<number | null>(null);
  const [ekind, setEkind] = useState("");
  const [eby, setEby] = useState<"prefix" | "regex">("prefix");
  const [ematch, setEmatch] = useState("");

  const add = () => {
    const m = match.trim();
    if (!m) return;
    const r: RedactRule = { kind: kind.trim(), ...(by === "prefix" ? { prefix: m } : { regex: m }) };
    onChange([...rules, r]);
    setKind("");
    setMatch("");
  };

  return (
    <>
      <div className="row pref rule-row">
        <div className="who">
          <div className="name">{t("Masking rules")}</div>
          <div className="sub">{t("Secrets magpie doesn't know, such as a gateway's own keys: what they start with, or a regular expression. Masked while Mask secrets is on")}</div>
        </div>
        <div className="val rule-add">
          <input className="words rule-kind" value={kind} placeholder="API_KEY" onChange={(e) => setKind(e.target.value)} />
          <Segs
            value={by}
            onChange={(v) => setBy(v as "prefix" | "regex")}
            items={[
              { id: "prefix", label: t("Prefix") },
              { id: "regex", label: t("Regex") },
            ]}
          />
          <input
            className="words rule-match"
            value={match}
            placeholder={by === "prefix" ? "oc_sk_" : "oc_sk_[A-Za-z0-9]{20,}"}
            onChange={(e) => setMatch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          />
          <button type="button" className="text" onClick={add}>{t("Add")}</button>
        </div>
      </div>
      {rules.map((r, n) =>
        editAt === n ? (
          <div className="row pref rule-row rule-editing" key={n}>
            <div className="who">
              <div className="name">{r.kind || t("Rule")}</div>
              <div className="sub">{r.prefix ? t("Starts with {p}", { p: r.prefix }) : t("Matches {re}", { re: r.regex || "" })}</div>
            </div>
            <div className="val rule-add">
              <input className="words rule-kind editing" value={ekind} onChange={(e) => setEkind(e.target.value)} aria-label={t("Name")} />
              <Segs value={eby} onChange={(v) => setEby(v as "prefix" | "regex")} items={[{ id: "prefix", label: t("Prefix") }, { id: "regex", label: t("Regex") }]} />
              <div className="rule-tail">
                <input className="words rule-match editing" value={ematch} onChange={(e) => setEmatch(e.target.value)} />
                <button type="button" className="text rule-save" onClick={() => {
                  const m = ematch.trim();
                  if (!m) return;
                  const next = rules.slice();
                  next[n] = { kind: ekind.trim(), ...(eby === "prefix" ? { prefix: m } : { regex: m }) };
                  onChange(next);
                  setEditAt(null);
                }}>{t("Save")}</button>
                <button type="button" className="text rule-cancel" onClick={() => setEditAt(null)}>{t("Cancel")}</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="row pref" key={n}>
            <div className="who">
              <div className="name">{r.kind || "—"}</div>
              <div className="sub">{r.prefix ? t("Starts with {p}", { p: r.prefix }) : t("Matches {re}", { re: r.regex || "" })}</div>
            </div>
            <div className="val">
              <button type="button" className="text rule-edit" onClick={() => {
                setEditAt(n);
                setEkind(r.kind || "");
                setEby(r.regex ? "regex" : "prefix");
                setEmatch(r.regex || r.prefix || "");
              }}>{t("Edit")}</button>
              <button type="button" className="text" onClick={() => onChange(rules.filter((_, i) => i !== n))}>{t("Remove")}</button>
            </div>
          </div>
        ),
      )}
    </>
  );
}

export type OtelConfig = {
  enabled: boolean;
  endpoint: string;
  headers: string;
  metrics: boolean;
  sessions: boolean;
  bodies: boolean;
  bodiesWhole: boolean;
};

export function OtelFull({ config, onChange }: { config: OtelConfig; onChange: (c: OtelConfig) => void }) {
  const mode = !config.bodies ? "metadata" : config.bodiesWhole ? "full" : "limited";
  const descriptions: Record<string, string> = {
    metadata: "Send model, token, status and timing metadata only. Prompts, replies and tool content stay local",
    limited: "Include requests and replies as trace input and output, with secrets masked. Each body is limited to 256 KB",
    full: "Include complete requests and replies, with secrets masked. Large content may be refused by your collector",
  };
  const save = (patch: Partial<OtelConfig>) => onChange({ ...config, ...patch });

  return (
    <div id="otelList">
      <div className="row-head"><span className="label">{t("Collector connection")}</span></div>
      <div className="list prefs">
        <div className="row pref" id="otelExportRow">
          <div className="who">
            <div className="name">{t("OTLP export")}</div>
            <div className="sub">{t("Send traces to your collector. Choose what to include below; account credentials stay local")}</div>
          </div>
          <div className="val">
            <Segs value={config.enabled ? "on" : "off"} onChange={(v) => save({ enabled: v === "on" })} items={[{ id: "off", label: t("Off") }, { id: "on", label: t("On") }]} />
          </div>
        </div>
        <div className="row pref otel-stacked" id="otelEndpointRow">
          <div className="who">
            <div className="name">{t("OTLP endpoint")}</div>
            <div className="sub">{t("Base URL of your collector, or Langfuse's /api/public/otel endpoint")}</div>
          </div>
          <div className="val">
            <input className="words" value={config.endpoint} placeholder="http://localhost:4318" aria-label={t("OTLP endpoint")} onChange={(e) => save({ endpoint: e.target.value })} />
          </div>
        </div>
        <div className="row pref otel-stacked" id="otelHeadersRow">
          <div className="who">
            <div className="name">{t("OTLP headers")}</div>
            <div className="sub">{t("Comma-separated name=value pairs; percent-encode spaces and commas in values")}</div>
          </div>
          <div className="val">
            <input className="words" type="password" autoComplete="off" value={config.headers} placeholder="Authorization=Bearer%20token" aria-label={t("OTLP headers")} onChange={(e) => save({ headers: e.target.value })} />
          </div>
        </div>
      </div>
      <div className="row-head"><span className="label">{t("Export scope")}</span></div>
      <div className="list prefs">
        <div className="row pref" id="otelMetricsRow">
          <div className="who">
            <div className="name">{t("Export metrics")}</div>
            <div className="sub">{t("Also send duration and token histograms. Leave off for a traces-only service such as Langfuse")}</div>
          </div>
          <div className="val">
            <Segs value={config.metrics ? "on" : "off"} onChange={(v) => save({ metrics: v === "on" })} items={[{ id: "off", label: t("Off") }, { id: "on", label: t("On") }]} />
          </div>
        </div>
        <div className="row pref" id="otelSessionsRow">
          <div className="who">
            <div className="name">{t("Trace agent conversations")}</div>
            <div className="sub">{t("Reads all local sessions from Codex, Pi, Oh My Pi, Claude Code, Cowork, OpenCode and Gemini CLI, including calls not routed through Magpie. When content is included below, exports prompts, replies, tool arguments and tool output (including file contents and command output), with secrets masked")}</div>
          </div>
          <div className="val">
            <Segs value={config.sessions ? "on" : "off"} onChange={(v) => save({ sessions: v === "on" })} items={[{ id: "off", label: t("Off") }, { id: "on", label: t("On") }]} />
          </div>
        </div>
      </div>
      <div className="row-head"><span className="label">{t("Trace content")}</span></div>
      <div className="list prefs">
        <div className="row pref otel-stacked" id="otelBodiesRow">
          <div className="who">
            <div className="name">{t("Request and response content")}</div>
            <div className="sub">{t(descriptions[mode])}</div>
          </div>
          <div className="val">
            <Segs
              value={mode}
              onChange={(v) => save({ bodies: v !== "metadata", bodiesWhole: v === "full" })}
              items={[
                { id: "metadata", label: t("Metadata only") },
                { id: "limited", label: t("Up to 256 KB") },
                { id: "full", label: t("Full content") },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SyncForms({
  open,
  kind,
  onKind,
  onClose,
  onSave,
  onOff,
  onStatus,
}: {
  open: "" | "dav" | "export" | "import";
  kind: "webdav" | "s3" | "github";
  onKind: (k: "webdav" | "s3" | "github") => void;
  onClose: () => void;
  onSave: () => void;
  onOff?: () => void;
  onStatus?: (m: string, k?: string) => void;
}) {
  const [url, setUrl] = useState("https://dav.jianguoyun.com/dav/");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [phrase, setPhrase] = useState("");
  const [keys, setKeys] = useState(true);
  const [agents, setAgents] = useState(true);
  const [lib, setLib] = useState(true);
  const [usage, setUsage] = useState(false);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [expKeys, setExpKeys] = useState(true);
  const [expLib, setExpLib] = useState(true);
  const [impAgents, setImpAgents] = useState(true);
  const [impLib, setImpLib] = useState(true);
  const [fname, setFname] = useState(t("No file chosen"));
  const [err, setErr] = useState("");

  if (open === "dav") {
    return (
      <div className="editor sync-form">
        <label>{t("Sync to")}</label>
        <div>
          <Segs
            value={kind}
            onChange={(v) => onKind(v as "webdav" | "s3" | "github")}
            items={[
              { id: "webdav", label: "WebDAV" },
              { id: "s3", label: "S3" },
              { id: "github", label: "GitHub" },
            ]}
          />
        </div>
        {kind === "webdav" ? (
          <>
            <label>{t("Address")}</label>
            <div>
              <input className="words" style={{ width: "100%" }} value={url} onChange={(e) => setUrl(e.target.value)} />
              <div className="hint">{t("A folder named magpie is made in it.")}</div>
            </div>
            <label>{t("User")}</label>
            <div><input className="words" style={{ width: "100%" }} value={user} placeholder={t("user name")} onChange={(e) => setUser(e.target.value)} /></div>
            <label>{t("Password")}</label>
            <div><input className="words" type="password" style={{ width: "100%" }} value={pass} placeholder={t("password, or an app password")} onChange={(e) => setPass(e.target.value)} /></div>
          </>
        ) : kind === "s3" ? (
          <>
            <label>{t("Endpoint")}</label>
            <div><input className="words" style={{ width: "100%" }} placeholder="https://<account>.r2.cloudflarestorage.com" /></div>
            <label>{t("Bucket")}</label>
            <div><input className="words" style={{ width: "100%" }} placeholder={t("bucket name")} /></div>
            <label>{t("Access key")}</label>
            <div><input className="words" style={{ width: "100%" }} placeholder="AKIA…" /></div>
            <label>{t("Secret")}</label>
            <div><input className="words" type="password" style={{ width: "100%" }} placeholder={t("secret access key")} /></div>
          </>
        ) : (
          <>
            <label>{t("Repository")}</label>
            <div><input className="words" style={{ width: "100%" }} placeholder="owner/repo" /></div>
            <label>{t("GitHub token")}</label>
            <div><input className="words" type="password" style={{ width: "100%" }} placeholder={t("GitHub token")} /></div>
          </>
        )}
        <label>{t("Passphrase")}</label>
        <div>
          <input className="words" type="password" style={{ width: "100%" }} value={phrase} placeholder={t("the same on every computer")} onChange={(e) => setPhrase(e.target.value)} />
          <div className="hint">{t("The file is sealed with it on this computer; the server only ever sees it sealed. Keep it: without it the file can't be opened.")}</div>
        </div>
        <label>{t("Also sync")}</label>
        <div className="stack">
          <label className="tick"><input type="checkbox" checked={keys} onChange={(e) => setKeys(e.target.checked)} />{t("Providers' API keys")}</label>
          <label className="tick"><input type="checkbox" checked={agents} onChange={(e) => setAgents(e.target.checked)} />{t("Agents' models")}</label>
          <label className="tick"><input type="checkbox" checked={lib} onChange={(e) => setLib(e.target.checked)} />{t("Library: instructions, MCP servers and skills")}</label>
          <label className="tick"><input type="checkbox" checked={usage} onChange={(e) => setUsage(e.target.checked)} />{t("Usage: this computer's calls, for the Usage page on the others")}</label>
        </div>
        {err ? <p className="editor-error">{err}</p> : null}
        <div className="bar">
          {onOff ? <button type="button" className="text danger" onClick={onOff}>{t("Turn off")}</button> : <span />}
          <span className="grow" />
          <button type="button" className="text" onClick={onClose}>{t("Cancel")}</button>
          <button
            type="button"
            className="text primary"
            onClick={() => {
              if (!phrase) { setErr(t("Pick a passphrase: the file is sealed with it")); return; }
              setErr("");
              onSave();
              onStatus?.(t("Saved"), "ok");
            }}
          >
            {t("Turn on")}
          </button>
        </div>
      </div>
    );
  }

  if (open === "export") {
    return (
      <div className="editor sync-form">
        <label>{t("Passphrase")}</label>
        <div>
          <input className="words" type="password" style={{ width: "100%" }} value={p1} placeholder={t("passphrase")} onChange={(e) => setP1(e.target.value)} />
          <div className="hint">{t("Needed to open the file. Subscriptions aren't in it: sign in to them on the other computer.")}</div>
        </div>
        <label />
        <div><input className="words" type="password" style={{ width: "100%" }} value={p2} placeholder={t("again")} onChange={(e) => setP2(e.target.value)} /></div>
        <label />
        <div className="stack">
          <label className="tick"><input type="checkbox" checked={expKeys} onChange={(e) => setExpKeys(e.target.checked)} />{t("With the providers' API keys")}</label>
          <label className="tick"><input type="checkbox" checked={expLib} onChange={(e) => setExpLib(e.target.checked)} />{t("With the library: instructions, MCP servers and skills")}</label>
        </div>
        {err ? <p className="editor-error">{err}</p> : null}
        <div className="bar">
          <span className="grow" />
          <button type="button" className="text" onClick={onClose}>{t("Cancel")}</button>
          <button
            type="button"
            className="text primary"
            onClick={() => {
              if (!p1) { setErr(t("Pick a passphrase: the file is sealed with it")); return; }
              if (p1 !== p2) { setErr(t("The two passphrases differ")); return; }
              setErr("");
              onStatus?.(demoCopy("演示：导出已模拟完成", "Demo: export simulated"), "ok");
              onClose();
            }}
          >
            {t("Export")}
          </button>
        </div>
      </div>
    );
  }

  if (open === "import") {
    return (
      <div className="editor sync-form">
        <label>{t("File")}</label>
        <div className="pair" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="fname">{fname}</span>
          <button type="button" className="text" onClick={() => setFname("demo.magpie-backup")}>{t("Choose…")}</button>
        </div>
        <label>{t("Passphrase")}</label>
        <div><input className="words" type="password" style={{ width: "100%" }} placeholder={t("passphrase")} /></div>
        <label />
        <div className="stack">
          <label className="tick"><input type="checkbox" checked={impAgents} onChange={(e) => setImpAgents(e.target.checked)} />{t("Set the agents' models too")}</label>
          <label className="tick"><input type="checkbox" checked={impLib} onChange={(e) => setImpLib(e.target.checked)} />{t("Bring in the library too: instructions, MCP servers and skills")}</label>
          <div className="hint">{t("Providers with the same id are replaced; one that came without a key keeps the key it has here. The library replaces the one here, which is kept with its backups.")}</div>
        </div>
        <div className="bar">
          <span className="grow" />
          <button type="button" className="text" onClick={onClose}>{t("Cancel")}</button>
          <button
            type="button"
            className="text primary"
            onClick={() => {
              if (fname === t("No file chosen")) { setErr(t("Choose a file first")); return; }
              onStatus?.(demoCopy("演示：导入已模拟完成", "Demo: import simulated"), "ok");
              onClose();
            }}
          >
            {t("Import")}
          </button>
        </div>
        {err ? <p className="editor-error">{err}</p> : null}
      </div>
    );
  }
  return null;
}

export function RestoreModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="modal lib" id="modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog">
        <div className="editor restore-ask">
          <div className="ehead"><b>{t("Restore from the server?")}</b></div>
          <p className="lib-confirm">{t("This computer's {parts} become the ones on the server, as your other computers last synced them. Whatever was changed here since is replaced.", { parts: t("providers") + t(", ") + t("settings") + t(", ") + t("profiles") })}</p>
          <p className="lib-confirm">{t("What is here now is sealed into the sync folder first, and Undo puts it back.")}</p>
          <div className="bar">
            <span className="grow" />
            <button type="button" className="text" onClick={onClose}>{t("Cancel")}</button>
            <button type="button" className="text primary danger-fill" onClick={onConfirm}>{t("Restore setup")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WhatsNewModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal lib" id="modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog">
        <div className="editor whatsnew framed">
          <div className="ehead"><b>{t("What's new")}</b></div>
          <div className="ebody" style={{ padding: "12px 18px", maxHeight: 360, overflow: "auto" }}>
            <div className="wn-sec">
              <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>0.1.12-demo</h3>
              <div className="wn-notes">
                <p>{demoCopy("演示：Settings 深层嵌套与 #pop 模型选择器、暖机时间片、SOCKS 认证、LAN 多网卡、Sync 全表单与 Restore、OTel / Privacy 规则。", "Demo: nested Settings, #pop model picker, warm-up chips, SOCKS auth, LAN multi-NIC, Sync forms + Restore, OTel / Privacy rules.")}</p>
              </div>
            </div>
          </div>
          <div className="bar">
            <span className="grow" />
            <button type="button" className="text primary" onClick={onClose}>{t("OK")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CliRow() {
  return (
    <div className="row pref cli-row">
      <div className="who">
        <div className="name">{t("Command line")}</div>
        <div className="sub">{t("In a new terminal, magpie runs this app: {path}", { path: "magpie" })}</div>
        <div className="cli-shells">
          <div className="cli-shell on" data-shell="bash">
            <span className="cli-dot" />
            <span className="cli-sh">bash · {t("default")}</span>
            <span className="cli-state">{t("runs this app")}</span>
          </div>
          <div className="cli-shell" data-shell="zsh">
            <span className="cli-dot" />
            <span className="cli-sh">zsh</span>
            <span className="cli-state">{t("runs this app")}</span>
          </div>
        </div>
        <div className="cli-note">{t("A change reaches terminals opened after it")}</div>
      </div>
      <div className="val" />
    </div>
  );
}

/** Settings › Models: Image / Search #pop chips (Magpie openPicker / #pop). */
export function SideModelPick({
  value,
  onChange,
  autoNote,
  offNote,
  options = DEMO_MODELS,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  autoNote: string;
  offNote: string;
  options?: PopOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const chipRef = useRef<HTMLButtonElement | null>(null);

  const popOptions: PopOption[] = [
    { value: "", label: t("Automatic"), note: autoNote, reset: true },
    { value: "off", label: t("Off"), note: offNote, reset: true },
    ...options,
  ];

  let display: ReactNode;
  if (value === "off") display = <span>{t("Off")}</span>;
  else if (value) {
    const m = options.find((x) => x.value === value);
    display = (
      <>
        <OpenAIIcon />
        <span>{m ? `${m.label} · ${m.note}` : value}</span>
      </>
    );
  } else {
    display = (
      <span>
        {t("Automatic")} · {autoNote}
      </span>
    );
  }

  return (
    <>
      <PrefPickChip
        label={t("Model")}
        display={display}
        open={open}
        chipRef={(el) => {
          chipRef.current = el;
        }}
        onToggle={(el) => {
          if (open) setOpen(false);
          else {
            setAnchor(el);
            setOpen(true);
          }
        }}
      />
      <ModelPop
        open={open}
        anchor={anchor || chipRef.current}
        options={popOptions}
        value={value}
        modelPicker
        placeholder={placeholder}
        onPick={(v) => {
          onChange(v);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

/** Settings › About › Download source (GitHub / mirror). */
export function UpdateMirrorRow({
  mirror,
  onChange,
  onStatus,
}: {
  mirror: string;
  onChange: (v: string) => void;
  onStatus?: (msg: string, kind?: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");

  const sub = err
    ? err
    : mirror
      ? t("Updates are downloaded through this mirror, each checked against usemagpie.ai's checksum")
      : t("Updates are downloaded from GitHub; a mirror can be used where GitHub is slow");

  return (
    <div className="row pref update-mirror-row">
      <div className="who">
        <div className="name">{t("Download source")}</div>
        <div className={`sub${err ? " err" : ""}`} title={t("The update and its checksum always come from usemagpie.ai; a file from the mirror that doesn't match it is not installed.")}>
          {sub}
        </div>
      </div>
      <div className="val" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {!editing ? (
          mirror ? (
            <>
              <code>{mirror}</code>
              <button
                type="button"
                className="text"
                onClick={() => {
                  setEditing(true);
                  setDraft(mirror);
                  setErr("");
                }}
              >
                {t("Change")}
              </button>
              <button
                type="button"
                className="text"
                onClick={() => {
                  onChange("");
                  onStatus?.(t("Saved"), "ok");
                }}
              >
                {t("Use GitHub")}
              </button>
            </>
          ) : (
            <>
              <code>GitHub</code>
              <button
                type="button"
                className="text"
                onClick={() => {
                  setEditing(true);
                  setDraft("");
                  setErr("");
                }}
              >
                {t("Use a mirror…")}
              </button>
            </>
          )
        ) : (
          <>
            <input
              className="words update-mirror-input"
              value={draft}
              placeholder="https://mirror.example/"
              aria-label={t("Mirror address")}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = draft.trim();
                  if (!v) return;
                  if (!/^https?:\/\//i.test(v)) {
                    setErr(t("Mirror address must start with http:// or https://"));
                    return;
                  }
                  onChange(v);
                  setEditing(false);
                  setErr("");
                  onStatus?.(t("Saved"), "ok");
                } else if (e.key === "Escape") {
                  setEditing(false);
                  setErr("");
                }
              }}
            />
            <button
              type="button"
              className="text"
              onClick={() => {
                setEditing(false);
                setErr("");
              }}
            >
              {t("Cancel")}
            </button>
            <button
              type="button"
              className="text"
              onClick={() => {
                const v = draft.trim();
                if (!v) return;
                if (!/^https?:\/\//i.test(v)) {
                  setErr(t("Mirror address must start with http:// or https://"));
                  return;
                }
                onChange(v);
                setEditing(false);
                setErr("");
                onStatus?.(t("Saved"), "ok");
              }}
            >
              {t("Save")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Allowances › menu bar: Off ▾ / Today / 7 days (NOTES 20–23). */
export function TrayUsagePick({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const opts = [
    { v: "", name: "Off" },
    { v: "usage:today", name: "Tokens and cost today" },
    { v: "usage:7d", name: "Tokens and cost, last 7 days" },
  ];
  const label =
    opts.find((o) => o.v === value)?.name ||
    (value ? value : "Off");

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div style={{ position: "relative" }} id="trayUsagePick">
      <button
        type="button"
        ref={ref}
        className={`sess-pick proto pick${value ? " set" : ""}${open ? " open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{t(label)}</span>
        <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden>
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <div className="pop proto-menu sess-menu" ref={menuRef} role="menu" style={{ position: "absolute", right: 0, top: "100%", zIndex: 40, minWidth: 220 }}>
          {opts.map((o) => (
            <button
              type="button"
              key={o.v || "off"}
              className={o.v === value ? "on" : ""}
              role="menuitem"
              onClick={() => {
                onChange(o.v);
                setOpen(false);
              }}
            >
              {t(o.name)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
