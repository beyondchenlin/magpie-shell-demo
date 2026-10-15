import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ModelPop, PrefPickChip, type PopOption } from "../../components/ModelPop";
import { PrefPick } from "../../components/PrefPick";
import { Segs } from "../../components/Segs";
import { Tick } from "../../components/Tick";
import { WordsField } from "../../components/WordsField";
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
    <span className="ic openai-mark" aria-hidden>
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

  // settings/154–168: empty catalog on this machine — reset rows only (no DEMO_MODELS).
  const isReview = field === "codexAutoReview";
  const isPred = field === "codexPredictions";
  const isTitles = field === "codexTitles";
  const ownLabel = isReview ? t("Codex’s own pick") : t("Codex’s own (ChatGPT)");
  const ownNote = isReview ? t("as Codex picks it") : t("as Codex sends them");
  // Descriptions: no Off. Predictions Off note ≠ titles Off note.
  const hasOff = isTitles || isPred;
  const offNote = isPred ? t("no prediction, nothing sent") : t("no title, nothing sent");

  let options: PopOption[] = [
    { value: "", label: ownLabel, note: ownNote, icon: "openai", reset: true },
    ...(hasOff ? [{ value: "off", label: t("Off"), note: offNote, reset: true } as PopOption] : []),
  ];
  // Current value sorted first (titles Off → Off checked on top).
  const i = options.findIndex((o) => o.value === value);
  if (i > 0) {
    const [cur] = options.splice(i, 1);
    options = [cur, ...options];
  } else if (i < 0 && value) {
    options = [{ value, label: value, note: t("use as typed"), reset: true }, ...options];
  }

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
        preferUp
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

const DEMO_LAN_URLS = ["http://172.30.0.2:3425", "http://172.17.0.1:3425"];

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
              onClick={() => setMenu((m) => !m)}>
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
              }}>
              <svg viewBox="0 0 16 16" width={13} height={13}>
                <rect x="5.5" y="5.5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <path d="M3.5 10.5V3.5h7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </span>
          {menu ? (
            <div className="pop proto-menu lan-address-menu" role="menu">
              <ul>
                {urls.map((u) => (
                  <li
                    key={u}
                    className={u === cur ? "sel" : ""}
                    role="menuitem"
                   
                    onClick={() => { onSelect(u); setMenu(false); }}>
                    <span className="pm-name">{u}{suffix}</span>
                    {u === cur ? <span aria-hidden>✓</span> : null}
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
  const [kind, setKind] = useState("API_KEY");
  const [by, setBy] = useState<"prefix" | "regex">("prefix");
  const [match, setMatch] = useState("oc_sk_");
  const [editAt, setEditAt] = useState<number | null>(null);
  const [ekind, setEkind] = useState("");
  const [eby, setEby] = useState<"prefix" | "regex">("prefix");
  const [ematch, setEmatch] = useState("");

  const add = () => {
    const m = match.trim();
    if (!m) return;
    const r: RedactRule = { kind: kind.trim(), ...(by === "prefix" ? { prefix: m } : { regex: m }) };
    onChange([...rules, r]);
    setKind("API_KEY");
    setMatch(by === "prefix" ? "oc_sk_" : "oc_sk_[A-Za-z0-9]{20,}");
  };

  return (
    <>
      <div className="row pref rule-row">
        <div className="who">
          <div className="name">{t("Masking rules")}</div>
          <div className="sub">{t("Secrets magpie doesn't know, such as a gateway's own keys: what they start with, or a regular expression. Masked while Mask secrets is on")}</div>
        </div>
        <div className="val rule-add">
          <WordsField className="rule-kind" value={kind} placeholder="API_KEY" onChange={(e) => setKind(e.target.value)} />
          <Segs
            value={by}
            onChange={(v) => {
              const next = v as "prefix" | "regex";
              const samples = { prefix: "oc_sk_", regex: "oc_sk_[A-Za-z0-9]{20,}" } as const;
              if (!match.trim() || match === samples[by]) setMatch(samples[next]);
              setBy(next);
            }}
            items={[
              { id: "prefix", label: t("Prefix") },
              { id: "regex", label: t("Regex") },
            ]}
          />
          <WordsField
            className="rule-match"
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
              <WordsField className="rule-kind editing" value={ekind} onChange={(e) => setEkind(e.target.value)} aria-label={t("Name")} />
              <Segs value={eby} onChange={(v) => {
                const next = v as "prefix" | "regex";
                const samples = { prefix: "oc_sk_", regex: "oc_sk_[A-Za-z0-9]{20,}" } as const;
                if (!ematch.trim() || ematch === samples[eby]) setEmatch(samples[next]);
                setEby(next);
              }} items={[{ id: "prefix", label: t("Prefix") }, { id: "regex", label: t("Regex") }]} />
              <div className="rule-tail">
                <WordsField
                  className="rule-match editing"
                  value={ematch}
                  onChange={(e) => setEmatch(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Escape") setEditAt(null);
                    else if (e.key === "Enter") {
                      const m = ematch.trim();
                      if (!m) return;
                      const next = rules.slice();
                      next[n] = { kind: ekind.trim(), ...(eby === "prefix" ? { prefix: m } : { regex: m }) };
                      onChange(next);
                      setEditAt(null);
                    }
                  }}
                />
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
            <WordsField className="full" value={config.endpoint} placeholder="http://localhost:4318" aria-label={t("OTLP endpoint")} onChange={(e) => save({ endpoint: e.target.value })} />
          </div>
        </div>
        <div className="row pref otel-stacked" id="otelHeadersRow">
          <div className="who">
            <div className="name">{t("OTLP headers")}</div>
            <div className="sub">{t("Comma-separated name=value pairs; percent-encode spaces and commas in values")}</div>
          </div>
          <div className="val">
            <WordsField className="full" type="password" autoComplete="off" value={config.headers} placeholder="Authorization=Bearer%20token" aria-label={t("OTLP headers")} onChange={(e) => save({ headers: e.target.value })} />
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
  const [endpoint, setEndpoint] = useState("");
  const [bucket, setBucket] = useState("");
  const [prefix, setPrefix] = useState("");
  const [region, setRegion] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [secret, setSecret] = useState("");
  const [pathStyle, setPathStyle] = useState(false);
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("");
  const [folder, setFolder] = useState("");
  const [ghToken, setGhToken] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [expKeys, setExpKeys] = useState(true);
  const [expLib, setExpLib] = useState(true);
  const [impAgents, setImpAgents] = useState(true);
  const [impLib, setImpLib] = useState(true);
  const [fname] = useState(t("No file chosen"));
  const [chooser, setChooser] = useState(false);
  const [chooserPlace, setChooserPlace] = useState<"home" | "desktop" | "workspace" | "other">("home");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!chooser) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setChooser(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [chooser]);

  const alsoSync = (
    <div className="stack">
      <Tick checked={keys} onChange={(e) => setKeys(e.target.checked)}>{t("Providers' API keys")}</Tick>
      <Tick checked={agents} onChange={(e) => setAgents(e.target.checked)}>{t("Agents' models")}</Tick>
      <Tick checked={lib} onChange={(e) => setLib(e.target.checked)}>{t("Library: instructions, MCP servers and skills")}</Tick>
      <Tick checked={usage} onChange={(e) => setUsage(e.target.checked)}>{t("Usage: this computer's calls, for the Usage page on the others")}</Tick>
      {usage ? (
        <div className="hint">{t("Usage goes as a file a day: times, tokens, models and costs, never what was said. Turn it on on each computer that shares its own.")}</div>
      ) : null}
    </div>
  );

  const formBar = (
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
        }}>
        {t("Turn on")}
      </button>
    </div>
  );

  const chooserModal = chooser ? (
    <div
      className="modal open"
      role="dialog"
      aria-modal="true"
      aria-label={t("Select File")}
      onClick={(e) => { if (e.target === e.currentTarget) setChooser(false); }}>
      <div
        className="dialog gtk-select-files">
        <div className="ebody">
          <nav className="places">
            {([
              ["home", t("Home")],
              ["desktop", t("Desktop")],
              ["workspace", "workspace"],
              ["other", t("Other Locations")],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`text${chooserPlace === id ? " on" : ""}`}
                onClick={() => setChooserPlace(id)}>
                {label}
              </button>
            ))}
          </nav>
          <div className="pane">
            <div className="empty">{/* empty list — accept .magpie-backup; NOTES 86 */}</div>
          </div>
        </div>
        <div className="bar">
          <span className="grow" />
          <button type="button" className="text" onClick={() => setChooser(false)}>{t("Cancel")}</button>
          <button type="button" className="text primary" disabled title={t("No file chosen")}>{t("Open")}</button>
        </div>
      </div>
    </div>
  ) : null;

  if (open === "dav") {
    return (
      <>
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
                <WordsField className="full" value={url} placeholder="https://dav.jianguoyun.com/dav/" onChange={(e) => setUrl(e.target.value)} />
                <div className="hint">{t("A folder named magpie is made in it.")}</div>
              </div>
              <label>{t("User")}</label>
              <div><WordsField className="full" value={user} placeholder={t("user name")} onChange={(e) => setUser(e.target.value)} /></div>
              <label>{t("Password")}</label>
              <div><WordsField className="full" type="password" value={pass} placeholder={t("password, or an app password")} onChange={(e) => setPass(e.target.value)} /></div>
            </>
          ) : kind === "s3" ? (
            <>
              <label>{t("Endpoint")}</label>
              <div>
                <WordsField className="full" value={endpoint} placeholder="https://<account>.r2.cloudflarestorage.com" onChange={(e) => setEndpoint(e.target.value)} />
                <div className="hint">{t("Empty for AWS S3; for R2, B2, MinIO and the like, their S3 API address.")}</div>
              </div>
              <label>{t("Bucket")}</label>
              <div><WordsField className="full" value={bucket} placeholder={t("bucket name")} onChange={(e) => setBucket(e.target.value)} /></div>
              <label>{t("Prefix")}</label>
              <div>
                <WordsField className="full" value={prefix} placeholder={t("optional")} onChange={(e) => setPrefix(e.target.value)} />
                <div className="hint">{t("The backup goes in a folder named magpie under it.")}</div>
              </div>
              <label>{t("Region")}</label>
              <div><WordsField className="full" value={region} placeholder="us-east-1, or auto for R2" onChange={(e) => setRegion(e.target.value)} /></div>
              <label>{t("Access key")}</label>
              <div><WordsField className="full" value={accessKey} placeholder="AKIA…" onChange={(e) => setAccessKey(e.target.value)} /></div>
              <label>{t("Secret")}</label>
              <div><WordsField className="full" type="password" value={secret} placeholder={t("secret access key")} onChange={(e) => setSecret(e.target.value)} /></div>
              <label />
              <div className="stack">
                <Tick checked={pathStyle} onChange={(e) => setPathStyle(e.target.checked)}>{t("Path-style: the bucket in the path, not the host name")}</Tick>
                {pathStyle ? <div className="hint">{t("MinIO and most NAS servers need it.")}</div> : null}
              </div>
            </>
          ) : (
            <>
              <label>{t("Repository")}</label>
              <div>
                <WordsField className="full" value={repo} placeholder="owner/repo" onChange={(e) => setRepo(e.target.value)} />
                <div className="hint">{t("An existing private GitHub repository, in owner/repo form.")}</div>
              </div>
              <label>{t("Branch")}</label>
              <div>
                <WordsField className="full" value={branch} placeholder={t("default branch")} onChange={(e) => setBranch(e.target.value)} />
                <div className="hint">{t("Empty uses the repository's default branch. Empty repositories are initialized by the first sync; other branches must already exist.")}</div>
              </div>
              <label>{t("Folder")}</label>
              <div>
                <WordsField className="full" value={folder} placeholder={t("optional")} onChange={(e) => setFolder(e.target.value)} />
                <div className="hint">{t("The encrypted backup goes in <folder>/magpie/magpie.magpie-backup. Each update creates a commit.")}</div>
              </div>
              <label>{t("GitHub token")}</label>
              <div>
                <WordsField className="full" type="password" value={ghToken} placeholder={t("GitHub token")} onChange={(e) => setGhToken(e.target.value)} />
                <div className="hint">{t("A fine-grained token for this repository with Contents: read and write. Kept on this computer, separately from the library's GitHub token.")}</div>
              </div>
            </>
          )}
          <label>{t("Passphrase")}</label>
          <div>
            <WordsField className="full" type="password" value={phrase} placeholder={t("the same on every computer")} onChange={(e) => setPhrase(e.target.value)} />
            <div className="hint">{t("The file is sealed with it on this computer; the server only ever sees it sealed. Keep it: without it the file can't be opened.")}</div>
          </div>
          <label>{t("Also sync")}</label>
          {alsoSync}
          {err ? <p className="editor-error">{err}</p> : null}
          {formBar}
        </div>
        {chooserModal}
      </>
    );
  }

  if (open === "export") {
    return (
      <div className="editor sync-form">
        <label>{t("Passphrase")}</label>
        <div>
          <WordsField className="full" type="password" value={p1} placeholder={t("passphrase")} onChange={(e) => setP1(e.target.value)} />
          <div className="hint">{t("Needed to open the file. Subscriptions aren't in it: sign in to them on the other computer.")}</div>
        </div>
        <label />
        <div><WordsField className="full" type="password" value={p2} placeholder={t("again")} onChange={(e) => setP2(e.target.value)} /></div>
        <label />
        <div className="stack">
          <Tick checked={expKeys} onChange={(e) => setExpKeys(e.target.checked)}>{t("With the providers' API keys")}</Tick>
          <Tick checked={expLib} onChange={(e) => setExpLib(e.target.checked)}>{t("With the library: instructions, MCP servers and skills")}</Tick>
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
            }}>
            {t("Export")}
          </button>
        </div>
      </div>
    );
  }

  if (open === "import") {
    return (
      <>
        <div className="editor sync-form">
          <label>{t("File")}</label>
          <div className="pair">
            <span className="fname">{fname}</span>
            <button type="button" className="text" onClick={() => { setChooserPlace("home"); setChooser(true); }}>{t("Choose…")}</button>
          </div>
          <label>{t("Passphrase")}</label>
          <div><WordsField className="full" type="password" placeholder={t("passphrase")} /></div>
          <label />
          <div className="stack">
            <Tick checked={impAgents} onChange={(e) => setImpAgents(e.target.checked)}>{t("Set the agents' models too")}</Tick>
            <Tick checked={impLib} onChange={(e) => setImpLib(e.target.checked)}>{t("Bring in the library too: instructions, MCP servers and skills")}</Tick>
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
              }}>
              {t("Import")}
            </button>
          </div>
          {err ? <p className="editor-error">{err}</p> : null}
        </div>
        {chooserModal}
      </>
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
          <div className="ehead"><b>{t("What's new in v{v}", { v: "0.1.1244" })}</b></div>
          <div className="ebody whatsnew-body">
            <div className="wn-rel">
              <div className="wn-ver">
                <b>v0.1.1244</b>
                <span className="wn-badge">{t("NOT INSTALLED YET")}</span>
              </div>
              <div className="wn-notes">
                <ul>
                  <li><b>sessions:</b> Each reply in a session's conversation names the model its own line in the agent's file names (<span className="wn-ref">#2253</span>, cnlove7777777-art).</li>
                  <li><b>library:</b> An agent whose CLI is gone (only its config folder left) is no Library write target, and nothing it already has is removed (<span className="wn-ref">#2254</span>, ggbdpq).</li>
                  <li><b>provider:</b> magpie://import links take gemini=, and its host is named before adding (<span className="wn-ref">#2251</span>, ggbdpq).</li>
                  <li><b>agent:</b> A Claude Code tier set to a model keeps it when the main model moves onto that model, not "Same as main model" (<span className="wn-ref">#2257</span>, luokinging).</li>
                  <li><b>provider:</b> TestCopilotSecretToolUsername's fake secret-tool answers a loaded Mac's suite, not 'token ""' after two 5s waits (<span className="wn-ref">#1627</span>).</li>
                </ul>
              </div>
            </div>
            <div className="wn-rel">
              <div className="wn-ver"><b>v0.1.1240</b></div>
              <div className="wn-notes">
                <ul>
                  <li><b>gui, cli:</b> Sync and backup say the synced settings use a subscription not signed in here, and that one not used here needs nothing (悠悠哥 on Discord).</li>
                  <li><b>proc, agent:</b> Asking Cline's version no longer starts an npm update of Cline (新v学员 on Discord).</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="bar">
            <span className="grow" />
            <button type="button" className="text primary" onClick={onClose}>{t("Close")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CliRow() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="row pref cli-row">
      <div className="who">
        <div className="name">{t("Command line")}</div>
        <div className="sub">{t("A new terminal can't find the magpie command")}</div>
        <div className="cli-shells">
          <div className="cli-shell on" data-shell="bash">
            <span className="cli-dot" />
            <span className="cli-sh">bash</span>
            <span className="cli-state">{t("runs this app")}</span>
          </div>
        </div>
        <div className="cli-note">{t("A change reaches terminals opened after it")}</div>
      </div>
      <div className="val">
        <button
          type="button"
          className={`copy${copied ? " done" : ""}`}
          title={t("Copy")}
          aria-label={t("Copy")}
          onClick={async () => {
            const tip = "magpie";
            try { await navigator.clipboard.writeText(tip); } catch { /* demo */ }
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          }}>
          {copied ? (
            <svg viewBox="0 0 16 16" width={13} height={13}>
              <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" width={13} height={13}>
              <rect x="5.5" y="5.5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M3.5 10.5V3.5h7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>
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
      <div className="val">
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
                }}>
                {t("Change")}
              </button>
              <button
                type="button"
                className="text"
                onClick={() => {
                  onChange("");
                  onStatus?.(t("Saved"), "ok");
                }}>
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
                }}>
                {t("Use a mirror…")}
              </button>
            </>
          )
        ) : (
          <>
            <WordsField
              className="update-mirror-input"
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
              }}>
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
              }}>
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
    <div id="trayUsagePick">
      <button
        type="button"
        ref={ref}
        className={`sess-pick proto pick${value ? " set" : ""}${open ? " open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}>
        <span>{t(label)}</span>
        <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden>
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <div className="pop proto-menu sess-menu" ref={menuRef} role="menu">
          {opts.map((o) => (
            <button
              type="button"
              key={o.v || "off"}
              className={o.v === value ? "on" : ""}
              role="menuitem"
              onClick={() => {
                onChange(o.v);
                setOpen(false);
              }}>
              {t(o.name)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}


/** Settings › Models › Disable… opens Magpie #pop (list + free pattern). */
export function DisableModelsBlock({
  models,
  onChange,
}: {
  models: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const options: PopOption[] = DEMO_MODELS.map((m) => ({ ...m }));

  const add = (id: string) => {
    const v = String(id || "").trim();
    if (!v) return;
    if (models.some((p) => p.toLowerCase() === v.toLowerCase())) return;
    onChange([...models, v]);
  };

  return (
    <>
      <div className="row pref wraps" id="disabledAddRow">
        <div className="who">
          <div className="name">{t("Disable a model")}</div>
          <div className="sub wraps">
            {t("A disabled model is refused on every route through magpie (a request, a session, a routing group, a fallback, a sub-agent, a decision model) and left out of magpie's lists and agents' pickers. Only requests through magpie are covered. Type a pattern such as *fable* to disable every model it matches")}
          </div>
        </div>
        <div className="val">
          <button
            type="button"
            className="text action"
            id="disabledAdd"
            ref={btnRef}
            onClick={(e) => {
              setAnchor(e.currentTarget);
              setOpen(true);
            }}>
            {t("Disable…")}
          </button>
        </div>
      </div>
      {models.map((pat) => (
        <div className="row pref disabled-model" key={pat} data-pattern={pat}>
          <div className="who">
            <div className="name">{pat}</div>
            <div className="sub wraps">
              {DEMO_MODELS.some((m) => m.value === pat || m.label === pat)
                ? t("Matches {n}: {list}", { n: 1, list: pat })
                : t("Matches no model now; it is refused if one appears")}
            </div>
          </div>
          <div className="val">
            <button
              type="button"
              className="text"
              aria-label={t("Enable {model}", { model: pat })}
              onClick={() => onChange(models.filter((p) => p !== pat))}>
              {t("Enable")}
            </button>
          </div>
        </div>
      ))}
      {!models.length ? (
        <div className="empty-state">
          {t("No disabled models")}
        </div>
      ) : null}
      <ModelPop
        open={open}
        anchor={anchor || btnRef.current}
        options={options}
        value=""
        modelPicker
        placeholder={t("Filter, or type any model id…")}
        onPick={(v) => {
          add(v);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const SEARCH_VENDORS = [
  { id: "tavily", name: "Tavily", keysURL: "https://app.tavily.com/home", base: "https://api.tavily.com", needURL: false, keyOptional: false },
  { id: "brave", name: "Brave Search", keysURL: "https://brave.com/search/api/", base: "https://api.search.brave.com", needURL: false, keyOptional: false },
  { id: "exa", name: "Exa", keysURL: "https://dashboard.exa.ai/api-keys", base: "https://api.exa.ai", needURL: false, keyOptional: false },
  { id: "firecrawl", name: "Firecrawl", keysURL: "https://www.firecrawl.dev/app/api-keys", base: "https://api.firecrawl.dev", needURL: false, keyOptional: false },
  { id: "you", name: "You.com", keysURL: "https://api.you.com/", base: "https://api.you.com", needURL: false, keyOptional: true },
  { id: "searxng", name: "SearXNG", keysURL: "", base: "", needURL: true, keyOptional: true },
] as const;

export type SearchApiEntry = { vendor: string; name: string; key: string; url: string };

/** Settings › Models › Search APIs add row + list (demo local). */
export function SearchApisBlock({
  apis,
  onChange,
  onStatus,
}: {
  apis: SearchApiEntry[];
  onChange: (next: SearchApiEntry[]) => void;
  onStatus?: (m: string, k?: string) => void;
}) {
  const [vendor, setVendor] = useState<string>("tavily");
  const [key, setKey] = useState("");
  const [url, setUrl] = useState("");
  const [menu, setMenu] = useState(false);
  const [err, setErr] = useState("");
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const pickRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (!pickRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  const v = SEARCH_VENDORS.find((x) => x.id === vendor) || SEARCH_VENDORS[0];
  const saved = apis.find((a) => a.vendor === vendor);

  const add = () => {
    const k = key.trim();
    const u = url.trim();
    if (v.needURL ? !u : !k && !saved?.key && !v.keyOptional) {
      setErr(v.needURL ? t("Address") : t("API key"));
      return;
    }
    setErr("");
    const next = apis.filter((a) => a.vendor !== vendor);
    next.push({ vendor, name: v.name, key: k || saved?.key || "", url: u });
    onChange(next);
    setKey("");
    setUrl("");
    onStatus?.(t("Saved"), "ok");
  };

  return (
    <>
      <div className={`row pref rule-row search-add${err ? " err" : ""}`}>
        <div className="who">
          <div className="name">{t("Search APIs")}</div>
          <div className={`sub${err ? " err" : ""}`}>
            {err ||
              t("When a model can't search the web, magpie searches for it with these, in this order, and gives it what they found") +
                " · " +
                t("No provider can search, so these are asked")}
          </div>
        </div>
        <div className="val rule-add">
          <button
            type="button"
            className={`proto pick search-vendor${menu ? " open" : ""}`}
            ref={pickRef}
            aria-label={t("Search API")}
            onClick={() => setMenu((m) => !m)}>
            <span>{v.name}</span>
            <svg viewBox="0 0 16 16" width={11} height={11} aria-hidden>
              <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <WordsField
            className="search-key"
            type="password"
            value={key}
            placeholder={
              v.needURL
                ? t("API key, if it needs one")
                : saved?.key
                  ? t("A new key, or empty to keep {key}", { key: saved.key.slice(0, 4) + "…" })
                  : v.keyOptional
                    ? t("API key, or empty for its free search")
                    : t("API key, or several split by commas")
            }
            aria-label={t("API key")}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
          />
          {v.keysURL ? (
            <button
              type="button"
              className="link"
              onClick={() => onStatus?.(demoCopy("演示：打开密钥页", "Demo: open keys page") + " · " + v.keysURL, "ok")}>
              {t("Get a key ↗")}
            </button>
          ) : null}
          <button type="button" className="text" onClick={add}>
            {t("Add")}
          </button>
          <WordsField
            className="search-url"
            value={url}
            placeholder={v.needURL ? "https://searx.example.com" : t("Base URL, empty for {url}", { url: v.base || "" })}
            aria-label={v.needURL ? t("Address") : t("Base URL")}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
          />
          {menu ? (
            <div className="pop proto-menu" role="menu">
              {SEARCH_VENDORS.map((x) => (
                <button
                  type="button"
                  key={x.id}
                  className={x.id === vendor ? "on" : ""}
                  role="menuitem"
                  onClick={() => {
                    setVendor(x.id);
                    setMenu(false);
                    setErr("");
                  }}>
                  <span className="pm-name">{x.name}</span>
                  {x.needURL ? <span className="pm-note">{t("your own")}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {apis.map((a, n) => (
        <div className="row pref search-api" key={a.vendor}>
          <div className="who">
            <div className="name">
              {n + 1}. {a.name}
            </div>
            <div className={`sub${showKey[a.vendor] ? " revealed" : ""}`}>
              {[showKey[a.vendor] ? a.key : a.key ? a.key.slice(0, 4) + "…" : "", a.url].filter(Boolean).join(" · ") || t("needs its key")}
            </div>
          </div>
          <div className="val">
            {a.key ? (
              <>
                <button
                  type="button"
                  className="text search-eye"
                  onClick={() => setShowKey((s) => ({ ...s, [a.vendor]: !s[a.vendor] }))}>
                  {showKey[a.vendor] ? t("Hide") : t("Show")}
                </button>
                <button
                  type="button"
                  className="text search-copy"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(a.key);
                    } catch {
                      /* */
                    }
                    onStatus?.(t("{what} copied", { what: t("API key") }), "ok");
                  }}>
                  {t("Copy")}
                </button>
              </>
            ) : null}
            <button type="button" className="text" onClick={() => onChange(apis.filter((x) => x.vendor !== a.vendor))}>
              {t("Remove")}
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

/** Magpie Settings › Allowances alert: number field (when On) + Off/On segs. Shots 29–33. */
export function AlertNumField({
  value,
  unit,
  ariaLabel,
  defaultOn,
  ok,
  onChange,
}: {
  value: number;
  unit?: string;
  ariaLabel: string;
  defaultOn: number;
  ok: (n: number) => boolean;
  onChange: (n: number) => void;
}) {
  const on = value > 0;
  const [draft, setDraft] = useState(String(on ? value : defaultOn));
  useEffect(() => {
    if (on) setDraft(String(value));
  }, [on, value]);
  return (
    <div className="warm-at" id={unit === "%" ? "usageAlertSegs" : "balanceAlertSegs"}>
      {on ? (
        <>
          <input
            className="at num"
            type="number"
            inputMode="decimal"
            aria-label={ariaLabel}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            onBlur={() => {
              const n = Number(draft);
              if (!ok(n)) {
                setDraft(String(value || defaultOn));
                return;
              }
              if (n !== value) onChange(n);
            }}
          />
          {unit ? <span className="unit">{unit}</span> : null}
        </>
      ) : null}
      <Segs
        value={on ? "on" : "off"}
        onChange={(v) => onChange(v === "on" ? value || defaultOn : 0)}
        items={[
          { id: "off", label: t("Off") },
          { id: "on", label: t("On") },
        ]}
      />
    </div>
  );
}

/** About › Version — Magpie update states (shots 15). Demo only; no real install. */
export function AboutVersionRow({
  current,
  downloaded = "0.1.1244",
  onStatus,
}: {
  current: string;
  downloaded?: string;
  onStatus?: (m: string, k?: string) => void;
}) {
  // NOTES 89–97 left state: running current, downloaded ready; Restart hovered not clicked.
  const [st] = useState<"ready">("ready");
  void st;
  void onStatus;

  return (
    <div className="row pref" id="aboutVersionRow">
      <div className="who">
        <div className="sub">{t("{v} is downloaded", { v: downloaded })}</div>
      </div>
      <div className="val">
        <code>{current}</code>
        <button
          type="button"
          className="text"
          title={t("Restart to update")}
          onClick={(e) => {
            // NOTES: Restart hovered only — demo keeps ready; no install.
            e.preventDefault();
          }}>
          {t("Restart to update")}
        </button>
      </div>
    </div>
  );
}

export type FontFace = {
  family: string;
  name: string;
  weight: number;
  style: "normal" | "italic" | "oblique";
  stretch: number;
};

type FontFamily = { name: string; styles: FontFace[] };

function face(
  family: string,
  name: string,
  weight: number,
  style: FontFace["style"] = "normal",
  stretch = 100,
): FontFace {
  return { family, name, weight, style, stretch };
}

function fam(name: string, styles: FontFace[]): FontFamily {
  return { name, styles };
}

/** Demo catalogue — Magpie reads desktop fonts; web/demo mirrors NOTES 107–134 faces. */
export const DEMO_FONT_LIST: FontFamily[] = [
  fam("ABeeZee", [face("ABeeZee", "Regular", 400)]),
  fam("Abel", [face("Abel", "Regular", 400)]),
  fam("Abhaya Libre", [
    face("Abhaya Libre", "Regular", 400),
    face("Abhaya Libre", "Medium", 500),
    face("Abhaya Libre", "SemiBold", 600),
    face("Abhaya Libre", "Bold", 700),
  ]),
  fam("Abhaya Libre ExtraBold", [face("Abhaya Libre ExtraBold", "Regular", 800)]),
  fam("Abhaya Libre Medium", [face("Abhaya Libre Medium", "Regular", 500)]),
  fam("Abhaya Libre SemiBold", [face("Abhaya Libre SemiBold", "Regular", 600)]),
  fam("Aboreto", [face("Aboreto", "Regular", 400)]),
  fam("DejaVu Sans", [
    face("DejaVu Sans", "Book", 400),
    face("DejaVu Sans", "Oblique", 400, "oblique"),
    face("DejaVu Sans", "Bold", 700),
    face("DejaVu Sans", "Bold Oblique", 700, "oblique"),
  ]),
  fam("DejaVu Sans Mono", [
    face("DejaVu Sans Mono", "Book", 400),
    face("DejaVu Sans Mono", "Oblique", 400, "oblique"),
    face("DejaVu Sans Mono", "Bold", 700),
    face("DejaVu Sans Mono", "Bold Oblique", 700, "oblique"),
  ]),
  fam("DejaVu Serif", [
    face("DejaVu Serif", "Book", 400),
    face("DejaVu Serif", "Italic", 400, "italic"),
    face("DejaVu Serif", "Bold", 700),
  ]),
  fam("Fira Code", [
    face("Fira Code", "Regular", 400),
    face("Fira Code", "Medium", 500),
  ]),
  fam("Inter", [
    face("Inter", "Regular", 400),
    face("Inter", "Medium", 500),
    face("Inter", "Bold", 700),
  ]),
  fam("JetBrains Mono", [
    face("JetBrains Mono", "Regular", 400),
    face("JetBrains Mono", "Bold", 700),
  ]),
  fam("Monoton", [face("Monoton", "Regular", 400)]),
  fam("Noto Color Emoji", [face("Noto Color Emoji", "Regular", 400)]),
  fam("Noto Kufi Arabic", [face("Noto Kufi Arabic", "Regular", 400)]),
  fam("Noto Naskh Arabic", [face("Noto Naskh Arabic", "Regular", 400)]),
  fam("Noto Sans", [
    face("Noto Sans", "Regular", 400),
    face("Noto Sans", "Bold", 700),
  ]),
  fam("Noto Sans Arabic", [face("Noto Sans Arabic", "Regular", 400)]),
  fam("Noto Sans CJK HK", [face("Noto Sans CJK HK", "Regular", 400), face("Noto Sans CJK HK", "Bold", 700)]),
  fam("Noto Sans CJK JP", [face("Noto Sans CJK JP", "Regular", 400), face("Noto Sans CJK JP", "Bold", 700)]),
  fam("Noto Sans CJK KR", [face("Noto Sans CJK KR", "Regular", 400), face("Noto Sans CJK KR", "Bold", 700)]),
  fam("Noto Sans CJK SC", [
    face("Noto Sans CJK SC", "Regular", 400),
    face("Noto Sans CJK SC", "Bold", 700),
  ]),
  fam("Noto Sans CJK TC", [face("Noto Sans CJK TC", "Regular", 400), face("Noto Sans CJK TC", "Bold", 700)]),
  fam("Noto Sans Devanagari", [face("Noto Sans Devanagari", "Regular", 400)]),
  fam("Noto Sans Gujarati", [face("Noto Sans Gujarati", "Regular", 400)]),
  fam("Noto Sans Malayalam", [face("Noto Sans Malayalam", "Regular", 400)]),
  fam("Noto Sans Mono", [face("Noto Sans Mono", "Regular", 400)]),
  fam("Noto Sans Mono CJK SC", [face("Noto Sans Mono CJK SC", "Regular", 400)]),
  fam("Noto Sans Symbols", [face("Noto Sans Symbols", "Regular", 400)]),
  fam("Noto Serif", [face("Noto Serif", "Regular", 400), face("Noto Serif", "Bold", 700)]),
  fam("Noto Serif CJK SC", [face("Noto Serif CJK SC", "Regular", 400)]),
  fam("Noto Serif Devanagari", [face("Noto Serif Devanagari", "Regular", 400)]),
  fam("Noto Serif Display", [face("Noto Serif Display", "Regular", 400)]),
  fam("Noto Serif Ethiopic", [face("Noto Serif Ethiopic", "Regular", 400)]),
  fam("Source Code Pro", [face("Source Code Pro", "Regular", 400)]),
];

function sameFace(a: FontFace | null | undefined, b: FontFace | null | undefined) {
  if (!a || !b) return false;
  return (["family", "name", "weight", "style", "stretch"] as const).every((k) => a[k] === b[k]);
}

function closestFont(styles: FontFace[], prev: FontFace | null): FontFace {
  if (!prev) {
    return [...styles].sort(
      (a, b) =>
        Number(a.style !== "normal") - Number(b.style !== "normal") ||
        Math.abs(a.weight - 400) - Math.abs(b.weight - 400) ||
        Math.abs(a.stretch - 100) - Math.abs(b.stretch - 100),
    )[0];
  }
  const exact = styles.find(
    (f) => f.name === prev.name && f.weight === prev.weight && f.style === prev.style && f.stretch === prev.stretch,
  );
  if (exact) return exact;
  const matching = styles.find((f) => f.weight === prev.weight && f.style === prev.style && f.stretch === prev.stretch);
  if (matching) return matching;
  return styles.find((s) => s.name === prev.name) || styles.find((s) => s.weight === prev.weight) || styles[0];
}

const CHEV_PATH = (
  <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden>
    <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const CHECK_PATH = "M3.2 8.2 6.4 11.4 12.8 4.2";

/** Apply Magpie desktopFonts CSS vars (fonts.js). */
export function applyDemoFonts(ui: FontFace | null, code: FontFace | null) {
  const root = document.documentElement;
  let active = false;
  for (const [face, prefix, fallback] of [
    [ui, "ui", "font"],
    [code, "code", "code"],
  ] as const) {
    const valid =
      face &&
      typeof face.family === "string" &&
      face.family &&
      ["normal", "italic", "oblique"].includes(face.style) &&
      Number.isFinite(face.weight) &&
      face.weight >= 1 &&
      face.weight <= 1000;
    const quoted = face?.family ? `"${face.family.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"` : "";
    const values = valid
      ? {
          font: `${quoted}, var(--${fallback})`,
          weight: String(face!.weight),
          style: face!.style,
          stretch: `${face!.stretch}%`,
        }
      : null;
    if (values) active = true;
    for (const part of ["font", "weight", "style", "stretch"] as const) {
      const name = `--${prefix}-${part}`;
      if (values?.[part] !== undefined) root.style.setProperty(name, values[part]);
      else root.style.removeProperty(name);
    }
  }
  if (active) root.setAttribute("data-fonts", "");
  else root.removeAttribute("data-fonts");
}

/** Settings › General › Interface/Code font — Magpie renderFonts (shots 107–134). */
export function FontRow({
  kind,
  value,
  onChange,
  onStatus: _onStatus,
}: {
  kind: "ui" | "code";
  value: FontFace | null;
  onChange: (next: FontFace | null) => void;
  onStatus?: (m: string, k?: string) => void;
}) {
  const [open, setOpen] = useState<"" | "family" | "style">("");
  const [q, setQ] = useState("");
  const [list, setList] = useState(DEMO_FONT_LIST);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean; maxH?: number } | null>(null);
  const famRef = useRef<HTMLButtonElement | null>(null);
  const styleRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const label = kind === "ui" ? "Interface font" : "Code font";
  const family = list.find((f) => f.name === value?.family);
  const styleEnabled = !!family?.styles.length;

  const closeMenu = () => {
    setOpen("");
    setQ("");
    setPos(null);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const n = e.target as Node;
      if (famRef.current?.contains(n) || styleRef.current?.contains(n) || menuRef.current?.contains(n)) return;
      closeMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
        (open === "style" ? styleRef.current : famRef.current)?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = open === "family" ? famRef.current : styleRef.current;
    const box = menuRef.current;
    if (!anchor || !box) return;
    const r = anchor.getBoundingClientRect();
    const pad = 8;
    const h = box.offsetHeight;
    const w = box.offsetWidth;
    let y = r.bottom + 5;
    const below = window.innerHeight - pad - y;
    const above = r.top - 5 - pad;
    let up = false;
    let maxH: number | undefined;
    if (h > below && above >= h) {
      y = r.top - 5 - h;
      up = true;
    } else if (h > below && above > below) {
      maxH = above;
      y = pad;
      up = true;
    } else if (h > below) {
      maxH = Math.max(below, 0);
    }
    const left = Math.max(pad, Math.min(r.right - w, window.innerWidth - w - pad));
    setPos({ top: Math.max(pad, y), left, up, maxH });
    box.scrollTop = 0;
    if (open === "family") searchRef.current?.focus({ preventScroll: true });
  }, [open, q, list.length]);

  const qLower = q.trim().toLocaleLowerCase();
  const defaultLabel = t("System default");
  const showDefault = !qLower || defaultLabel.toLocaleLowerCase().includes(qLower);
  const filtered = list.filter((f) => !qLower || f.name.toLocaleLowerCase().includes(qLower));

  const refresh = () => {
    // Magpie loadFonts(true): menu already closed; no toast (NOTES 114).
    closeMenu();
    setList([...DEMO_FONT_LIST]);
  };

  const menu = open ? (
    <div
      className={`pop proto-menu sess-menu font-menu${pos?.up ? " up" : ""}`}
      ref={menuRef}
      role="menu"
      style={{
        position: "fixed",
        top: pos ? pos.top : -9999,
        left: pos ? pos.left : 0,
        zIndex: 80,
        maxHeight: pos?.maxH,
        visibility: pos ? "visible" : "hidden",
      }}>
      <div className="pm-head">{open === "family" ? t(label) : t("Font style")}</div>
      {open === "family" ? (
        <>
          <div className="sc-top">
            <input
              ref={searchRef}
              className="sc-q"
              type="search"
              placeholder={t("Search fonts…")}
              value={q}
              aria-label={t("Search fonts…")}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          {showDefault ? (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={!value}
              className={`pm-item${!value ? " on" : ""}`}
              onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).focus({ preventScroll: true })}
              onClick={() => {
                onChange(null);
                closeMenu();
              }}>
              <span className="pm-tick" aria-hidden>
                {!value ? (
                  <svg viewBox="0 0 16 16" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d={CHECK_PATH} />
                  </svg>
                ) : null}
              </span>
              <span className="pm-words">
                <span className="pm-name">{defaultLabel}</span>
              </span>
            </button>
          ) : null}
          {filtered.map((f) => {
            const on = value?.family === f.name;
            return (
              <button
                type="button"
                key={f.name}
                role="menuitemradio"
                aria-checked={on}
                className={`pm-item${on ? " on" : ""}`}
                style={{ fontFamily: `"${f.name.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}", var(--font)` }}
                onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).focus({ preventScroll: true })}
                onClick={() => {
                  onChange(closestFont(f.styles, value));
                  closeMenu();
                }}>
                <span className="pm-tick" aria-hidden>
                  {on ? (
                    <svg viewBox="0 0 16 16" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <path d={CHECK_PATH} />
                    </svg>
                  ) : null}
                </span>
                <span className="pm-words">
                  <span className="pm-name">{f.name}</span>
                </span>
              </button>
            );
          })}
          <button
            type="button"
            role="menuitem"
            className="pm-item always"
            onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).focus({ preventScroll: true })}
            onClick={refresh}>
            <span className="pm-tick" aria-hidden />
            <span className="pm-words">
              <span className="pm-name">{t("Refresh fonts")}</span>
            </span>
          </button>
        </>
      ) : family ? (
        family.styles.map((s, i) => {
          const on = sameFace(s, value);
          return (
            <button
              type="button"
              key={s.name + i}
              role="menuitemradio"
              aria-checked={on}
              className={`pm-item${on ? " on" : ""}`}
              onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).focus({ preventScroll: true })}
              onClick={() => {
                onChange(s);
                closeMenu();
              }}>
              <span className="pm-tick" aria-hidden>
                {on ? (
                  <svg viewBox="0 0 16 16" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d={CHECK_PATH} />
                  </svg>
                ) : null}
              </span>
              <span className="pm-words">
                <span className="pm-name">{s.name}</span>
              </span>
            </button>
          );
        })
      ) : null}
    </div>
  ) : null;

  return (
    <div className="row pref font-row" id={`${kind}FontRow`}>
      <div className="who">
        <div className="name">{t(label)}</div>
      </div>
      <div className="font-controls">
        <PrefPick
          ref={famRef}
          className="proto pick font-family"
          label={value?.family || defaultLabel}
          open={open === "family"}
          aria-haspopup="menu"
          aria-label={`${t(label)}: ${t("Font family")}`}
          title={value?.family || defaultLabel}
          chevron={CHEV_PATH}
          onClick={(e) => {
            e.stopPropagation();
            if (open === "family") closeMenu();
            else {
              setQ("");
              setOpen("family");
            }
          }}
        />
        <PrefPick
          ref={styleRef}
          className="proto pick font-style"
          label={value?.name || defaultLabel}
          open={open === "style"}
          set={!!value}
          aria-haspopup="menu"
          aria-label={`${t(label)}: ${t("Font style")}`}
          title={styleEnabled ? value?.name || defaultLabel : undefined}
          disabled={!styleEnabled}
          chevron={CHEV_PATH}
          onClick={(e) => {
            e.stopPropagation();
            if (!styleEnabled) return;
            if (open === "style") closeMenu();
            else setOpen("style");
          }}
        />
        <div className="font-preview">{t("Aa 0123 · 中文")}</div>
        {menu && createPortal(menu, document.body)}
      </div>
    </div>
  );
}
