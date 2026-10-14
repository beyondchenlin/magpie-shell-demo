import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSegThumb } from "../components/SegThumb";
import { GATEWAY_ADDR } from "../data/mock";
import { demoCopy, t, useLang } from "../i18n";

/** Magpie flashCopied: 1200ms; copy-pop .36s --ease */
const COPY_FLASH_MS = 1200;

const GW_URL = `http://${GATEWAY_ADDR}`;

type DemoGwModel = { id: string; name: string; provider: string; icon?: string };
type DemoCall = { id: string; time: number; agent: string; model: string; from: string; to: string; status: number; ms: number; ttft?: number; error?: string };

const DEMO_MODELS: DemoGwModel[] = [
  { id: "codex/gpt-5.4", name: "gpt-5.4", provider: "OpenAI" },
  { id: "codex/gpt-5.4-mini", name: "gpt-5.4-mini", provider: "OpenAI" },
  { id: "anthropic/claude-sonnet-4-5", name: "claude-sonnet-4-5", provider: "Anthropic" },
  { id: "google/gemini-2.5-pro", name: "gemini-2.5-pro", provider: "Google" },
];

const DEMO_CALLS: DemoCall[] = [
  { id: "1042", time: Date.now() - 120000, agent: "Codex", model: "codex/gpt-5.4", from: "openai", to: "openai", status: 200, ms: 1840, ttft: 320 },
  { id: "1041", time: Date.now() - 300000, agent: "Claude Code", model: "anthropic/claude-sonnet-4-5", from: "anthropic", to: "anthropic", status: 200, ms: 2560 },
  { id: "1040", time: Date.now() - 600000, agent: "curl", model: "codex/gpt-5.4-mini", from: "openai", to: "openai", status: 429, ms: 210, error: "rate limited" },
];

function readDemoPrefs(): { lan: boolean; showGwDemo: boolean; port: string } {
  try {
    const raw = localStorage.getItem("magpie.demoPrefs");
    if (!raw) return { lan: false, showGwDemo: false, port: "3425" };
    const j = JSON.parse(raw);
    return { lan: !!j.lan, showGwDemo: j.showGwDemo !== false, port: String(j.port || "3425") };
  } catch {
    return { lan: false, showGwDemo: false, port: "3425" };
  }
}

/** Magpie gateway status chip: on (default) · off · older (take-over). `?gw=` or localStorage magpie.demoGw */
type GwMode = "on" | "off" | "older";
function readGwMode(): GwMode {
  try {
    const q = new URLSearchParams(location.search).get("gw");
    if (q === "off" || q === "older" || q === "on") return q;
    const v = localStorage.getItem("magpie.demoGw") || "on";
    return v === "off" || v === "older" ? v : "on";
  } catch {
    return "on";
  }
}

type FlavorId = "openai" | "responses" | "anthropic" | "gemini" | "systemone";
type SnipLang = "shell" | "curl" | "python" | "node";
type SnipOS = "windows" | "unix";

type Flavor = {
  id: FlavorId;
  name: string;
  note: string;
  base: (u: string) => string;
  baseEnv?: string;
  keyEnv?: string;
  decide?: boolean;
};

const FLAVORS: Flavor[] = [
  {
    id: "openai",
    name: "OpenAI",
    note: "Chat Completions, the API most tools speak. Anything with an OpenAI base-URL setting works.",
    base: (u) => u + "/v1",
    baseEnv: "OPENAI_BASE_URL",
    keyEnv: "OPENAI_API_KEY",
  },
  {
    id: "responses",
    name: "Responses",
    note: "OpenAI's newer API: reasoning, built-in tool items, encrypted reasoning. Codex speaks this.",
    base: (u) => u + "/v1",
    baseEnv: "OPENAI_BASE_URL",
    keyEnv: "OPENAI_API_KEY",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    note: "Messages API. Claude Code reads ANTHROPIC_AUTH_TOKEN instead of the key; the Agents tab sets that for you.",
    base: (u) => u,
    baseEnv: "ANTHROPIC_BASE_URL",
    keyEnv: "ANTHROPIC_API_KEY",
  },
  {
    id: "gemini",
    name: "Gemini",
    note: "Google's generateContent API, v1beta. Gemini CLI and the google-genai SDKs speak this.",
    base: (u) => u,
    baseEnv: "GOOGLE_GEMINI_BASE_URL",
    keyEnv: "GEMINI_API_KEY",
  },
  {
    id: "systemone",
    name: "System One",
    note: 'TypeSafe\'s decision API: a Jev or Clef model answers typed questions (choice, noul, score) about a state, with how sure it is. Clef also reads images: add "images": ["data:image/png;base64,…"].',
    base: (u) => u + "/v1",
    decide: true,
  },
];

function lsGet(k: string, fallback: string) {
  try {
    return localStorage.getItem(k) || fallback;
  } catch {
    return fallback;
  }
}
function lsSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}

function readFlavor(): FlavorId {
  const v = lsGet("magpie.flavor", "openai");
  return FLAVORS.some((f) => f.id === v) ? (v as FlavorId) : "openai";
}

/** Magpie stores snippet dialect in magpie.lang; demo uses magpie.snipLang so UI locale (magpie.lang=zh|en) is not clobbered. */
function readSnipLang(): SnipLang {
  const v = lsGet("magpie.snipLang", "") || lsGet("magpie.gwSnipLang", "shell");
  return (["shell", "curl", "python", "node"] as const).includes(v as SnipLang)
    ? (v as SnipLang)
    : "shell";
}

function readSnipOS(): SnipOS {
  const v = lsGet("magpie.snipOS", "");
  if (v === "windows" || v === "unix") return v;
  return /^Win/i.test(navigator.platform || "") ? "windows" : "unix";
}

function CopyIcon({ check }: { check?: boolean }) {
  if (check) {
    return (
      <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden>
        <path
          d="m3.5 8.5 3 3 6-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden>
      <path
        d="M5.5 5.5V3.5h7v7h-2M3.5 5.5h7v7h-7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FoldChev() {
  return (
    <svg viewBox="0 0 16 16" width={11} height={11} aria-hidden>
      <path
        d="M6 3.5 10.5 8 6 12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyBtn({
  text,
  what,
  onStatus,
  className = "copy",
}: {
  text: string;
  what: string;
  onStatus: (msg: string, kind?: string) => void;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback(() => {
    setDone(false);
    // restart copy-pop: force reflow then add .done (Magpie void b.offsetWidth)
    requestAnimationFrame(() => {
      setDone(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), COPY_FLASH_MS);
    });
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <button
      type="button"
      className={`${className}${done ? " done" : ""}`}
      title={done ? t("Copied") : t("Copy")}
      aria-label={t("Copy")}
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard?.writeText(text).catch(() => {});
        flash();
        onStatus(t("{what} copied", { what }), "ok");
      }}
    >
      <CopyIcon check={done} />
    </button>
  );
}

function highlightShell(code: string): ReactNode[] {
  // Magpie highlight(): env vars before =, keywords export; strings after =
  const lines = code.split("\n");
  return lines.map((line, i) => {
    const m = /^(export\s+|\$env:)?([A-Z][A-Z0-9_]*)(=)(.*)$/.exec(line);
    if (!m) {
      return (
        <span key={i}>
          {line}
          {i < lines.length - 1 ? "\n" : ""}
        </span>
      );
    }
    const [, prefix, env, eq, val] = m;
    return (
      <span key={i}>
        {prefix?.startsWith("export") ? (
          <span className="tk-k">export</span>
        ) : prefix ? (
          <span className="tk-v">{prefix}</span>
        ) : null}
        {prefix?.startsWith("export") ? " " : null}
        <span className="tk-v">{env}</span>
        <span>{eq}</span>
        <span className="tk-s">{val}</span>
        {i < lines.length - 1 ? "\n" : ""}
      </span>
    );
  });
}

function envSnippet(baseEnv: string, base: string, keyEnv: string, secret: string, win: boolean) {
  if (win) {
    return `$env:${baseEnv}="${base}"\n$env:${keyEnv}="${secret}"`;
  }
  return `export ${baseEnv}=${base}\nexport ${keyEnv}=${secret}`;
}

type Props = {
  onStatus: (msg: string, kind?: string) => void;
  onGoNetwork: () => void;
};

export function GatewayView({ onStatus, onGoNetwork }: Props) {
  useLang(); // re-render on locale change
  const [flavor, setFlavor] = useState<FlavorId>(readFlavor);
  const [snipLang, setSnipLang] = useState<SnipLang>(readSnipLang);
  const [snipOS, setSnipOS] = useState<SnipOS>(readSnipOS);
  const [connectFolded, setConnectFolded] = useState(
    () => lsGet("magpie.gwConnectFolded", "") === "1",
  );
  const [modelsFolded, setModelsFolded] = useState(
    () => lsGet("magpie.gwModelsFolded", "") === "1",
  );
  const [restartBusy, setRestartBusy] = useState(false);
  const [demoPrefs, setDemoPrefs] = useState(readDemoPrefs);
  const [exampleModel, setExampleModel] = useState(() => lsGet("magpie.model", DEMO_MODELS[0].id));
  const [expandedCalls, setExpandedCalls] = useState<Set<string>>(() => new Set());
  const [gwKeys, setGwKeys] = useState<{ name: string; key: string }[]>([
    { name: "laptop", key: "mgk_demo_laptop_••••••••" },
    { name: "ci", key: "mgk_demo_ci_••••••••" },
  ]);
  useEffect(() => {
    const tick = () => setDemoPrefs(readDemoPrefs());
    window.addEventListener("storage", tick);
    const id = window.setInterval(tick, 1500);
    return () => { window.removeEventListener("storage", tick); window.clearInterval(id); };
  }, []);
  const [gwMode, setGwMode] = useState<GwMode>(() => readGwMode());
  const running = gwMode !== "off";
  const older = gwMode === "older";
  const showFilled = demoPrefs.showGwDemo && gwMode === "on";
  const lanOn = demoPrefs.lan;
  const catalog = showFilled ? DEMO_MODELS : [];
  const models = catalog.length;
  const calls = showFilled ? DEMO_CALLS : [];
  const f = FLAVORS.find((x) => x.id === flavor) || FLAVORS[0];
  const base = f.base(GW_URL);
  const modelPlaceholder = f.decide ? "provider/jev_latest" : (exampleModel || "provider/model");
  const secret = lanOn && gwKeys.length ? gwKeys[0].key.replace("••••••••", "x7k9m2p4") : "magpie";
  const win = snipOS === "windows";

  const flavorSeg = useSegThumb(flavor);
  const snipSeg = useSegThumb(snipLang);
  const osSeg = useSegThumb(snipOS);

  const langs: [SnipLang, string][] = f.baseEnv
    ? [
        ["shell", win ? "PowerShell" : "Shell"],
        ["curl", "curl"],
        ["python", "Python"],
        ["node", "Node"],
      ]
    : [
        ["curl", "curl"],
        ["python", "Python"],
        ["node", "Node"],
      ];
  const activeSnip: SnipLang = langs.some(([id]) => id === snipLang)
    ? snipLang
    : langs[0][0];

  let snippet = "";
  if (f.baseEnv && f.keyEnv && activeSnip === "shell") {
    snippet = envSnippet(f.baseEnv, base, f.keyEnv, secret, win);
  } else if (activeSnip === "curl" && f.id === "openai") {
    snippet = win
      ? `@'\n{"model": "${modelPlaceholder}",\n "messages": [{"role": "user", "content": "hi"}]}\n'@ | curl.exe ${base}/chat/completions \`\n  -H "Authorization: Bearer ${secret}" \`\n  -H "Content-Type: application/json" \`\n  --data-binary "@-"`
      : `curl ${base}/chat/completions \\\n  -H "Authorization: Bearer ${secret}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model": "${modelPlaceholder}",\n "messages": [{"role": "user", "content": "hi"}]}'`;
  } else if (activeSnip === "python" && f.baseEnv) {
    snippet =
      f.id === "anthropic"
        ? `import anthropic\n\nclient = anthropic.Anthropic(\n    base_url="${base}", api_key="${secret}",\n)\nm = client.messages.create(\n    model="${modelPlaceholder}",\n    max_tokens=1024,\n    messages=[{"role": "user", "content": "hi"}],\n)\nprint(m.content[0].text)`
        : f.id === "gemini"
          ? `from google import genai\n\nclient = genai.Client(api_key="${secret}", http_options={"base_url": "${base}"})\nr = client.models.generate_content(model="${modelPlaceholder}", contents="hi")\nprint(r.text)`
          : `from openai import OpenAI\n\nclient = OpenAI(base_url="${base}", api_key="${secret}")\nr = client.chat.completions.create(\n    model="${modelPlaceholder}",\n    messages=[{"role": "user", "content": "hi"}],\n)\nprint(r.choices[0].message.content)`;
  } else if (activeSnip === "node" && f.baseEnv) {
    snippet = `import OpenAI from "openai";\n\nconst client = new OpenAI({ baseURL: "${base}", apiKey: "${secret}" });\nconst r = await client.chat.completions.create({\n  model: "${modelPlaceholder}",\n  messages: [{ role: "user", content: "hi" }],\n});\nconsole.log(r.choices[0].message.content);`;
  } else if (f.decide) {
    snippet = `curl ${base}/systemone \\\n  -H "Authorization: Bearer ${secret}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model": "${modelPlaceholder}", "state": {}, "questions": {}}'`;
  }

  const sub = older
    ? t(
        "Agents' requests go through magpie {v} and are sent as it sends them, without this version's fixes. Quit it here and this one serves the gateway at once.",
        { v: "0.1.1000" },
      )
    : running
      ? [
          t("{n} models", { n: models }),
          t("no agent routed through it yet"),
          t("five APIs, one URL"),
        ].join(" · ")
      : t("start it with magpie serve, or open magpie at login");

  const onRestart = () => {
    if (restartBusy) return;
    setRestartBusy(true);
    // Magpie awaits gateway/restart or take-over; demo: brief busy then toast
    window.setTimeout(() => {
      setRestartBusy(false);
      if (older) {
        setGwMode("on");
        try {
          localStorage.setItem("magpie.demoGw", "on");
        } catch {
          /* ignore */
        }
        onStatus(
          demoCopy("演示：已接管网关（无真实进程）", "Demo: took over gateway (no real process)"),
          "ok",
        );
      } else if (!running) {
        setGwMode("on");
        try {
          localStorage.setItem("magpie.demoGw", "on");
        } catch {
          /* ignore */
        }
        onStatus(
          demoCopy("演示：已启动网关（无真实进程）", "Demo: started gateway (no real process)"),
          "ok",
        );
      } else {
        onStatus(
          demoCopy("演示壳 · 无真实网关进程", "Demo shell · no real gateway process"),
          "ok",
        );
      }
    }, 700);
  };

  const pickFlavor = (id: FlavorId) => {
    setFlavor(id);
    lsSet("magpie.flavor", id);
  };
  const pickSnip = (id: SnipLang) => {
    setSnipLang(id);
    lsSet("magpie.snipLang", id);
  };
  const pickOS = (id: SnipOS) => {
    setSnipOS(id);
    lsSet("magpie.snipOS", id);
  };

  return (
    <main className="view" id="view-gateway">
      <div className="list gwcard">
        <div className="row gw" id="gateway">
          <span className={`dot${older ? " old" : running ? " on" : ""}`} aria-hidden />
          <div className="who">
            <div className="name">
              {t("Gateway")}
              <span className="state">
                {older
                  ? t("running · served by magpie {v}, older than this one", { v: "0.1.1000" })
                  : t(running ? "running" : "not running")}
              </span>
            </div>
            <div className={`sub${older ? " old" : ""}`}>{sub}</div>
            <button
              type="button"
              className="text action gw-fix"
              disabled={restartBusy}
              onClick={onRestart}
            >
              {restartBusy
                ? older
                  ? t("Quitting magpie {v}…", { v: "0.1.1000" })
                  : t(running ? "Restarting the gateway…" : "Starting the gateway…")
                : older
                  ? t("Quit magpie {v} and take over", { v: "0.1.1000" })
                  : t(running ? "Restart gateway" : "Start gateway")}
            </button>
          </div>
          <button
            type="button"
            className="url"
            title={t("Copy the gateway URL")}
            onClick={() => {
              void navigator.clipboard?.writeText(GW_URL).catch(() => {});
              onStatus(t("{what} copied", { what: t("Gateway URL") }), "ok");
            }}
          >
            <code>{GW_URL}</code>
          </button>
        </div>
      </div>

      {lanOn ? (
        <section id="gatewayKeysBlock">
          <div className="row-head">
            <span className="label">{t("Gateway keys")}</span>
            <span className="grow" />
            <button
              type="button"
              className="text"
              id="addGatewayKey"
              onClick={() => {
                const n = `key-${gwKeys.length + 1}`;
                setGwKeys((ks) => [...ks, { name: n, key: `mgk_demo_${n}_••••••••` }]);
                onStatus(t("Saved"), "ok");
              }}
            >
              {t("Add gateway key")}
            </button>
          </div>
          <p className="usage-note">{t("Create a gateway key for each client. Usage is counted separately for each key.")}</p>
          <section id="gatewayKeys" className="list prefs">
            {gwKeys.map((k) => (
              <div className="row pref" key={k.name}>
                <div className="who">
                  <div className="name">{k.name}</div>
                  <div className="sub"><code>{k.key}</code></div>
                </div>
                <div className="val">
                  <CopyBtn text={k.key.replace("••••••••", "x7k9m2p4")} what={t("Key")} onStatus={onStatus} />
                  <button type="button" className="text" onClick={() => setGwKeys((ks) => ks.filter((x) => x.name !== k.name))}>{t("Remove")}</button>
                </div>
              </div>
            ))}
          </section>
        </section>
      ) : (
        <p className="usage-note gw-keys-off" id="gatewayKeysOff">
          <span>
            {t(
              "Gateway keys are for other computers, and for a tunnel to this one such as Cloudflare Tunnel: they are added here once Share on local network is on. Agents on this computer need none.",
            )}
          </span>{" "}
          <button type="button" className="text" id="openLanSettings" onClick={onGoNetwork}>
            {t("Network and sharing")}
          </button>
        </p>
      )}

      <div className="row-head">
        <button
          type="button"
          className="fold"
          id="foldConnect"
          aria-expanded={!connectFolded}
          aria-controls="connect"
          title={t(connectFolded ? "Show how to connect" : "Fold Connect away")}
          onClick={() => {
            const next = !connectFolded;
            setConnectFolded(next);
            lsSet("magpie.gwConnectFolded", next ? "1" : "0");
          }}
        >
          <FoldChev />
          <span className="label">{t("Connect")}</span>
        </button>
        <span className="grow" />
        <span className={`note${connectFolded ? " brief" : ""}`} id="connectNote">
          {connectFolded ? (
            <>
              <code>{base}</code>
              <CopyBtn text={base} what={t("Base URL")} onStatus={onStatus} />
            </>
          ) : (
            t(lanOn && gwKeys.length ? "Use a gateway key to track usage" : lanOn ? "Local network · an enabled gateway key is required" : "Loopback only · the key can be anything")
          )}
        </span>
      </div>

      <section className="list connect" id="connect" hidden={connectFolded}>
          <label>API</label>
          <div>
            <div className="segs" ref={flavorSeg} data-kind="flavor">
              {FLAVORS.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  className={`opt${flavor === x.id ? " on" : ""}`}
                  aria-pressed={flavor === x.id}
                  onClick={() => pickFlavor(x.id)}
                >
                  {x.name}
                </button>
              ))}
            </div>
            <div className="hint">{t(f.note)}</div>
          </div>

          <label>{t("Base URL")}</label>
          <div>
            <div className="val">
              <code>{base}</code>
              <CopyBtn text={base} what={t("Base URL")} onStatus={onStatus} />
            </div>
            <div className="hint">
              {f.baseEnv
                ? t("What {env} takes.", { env: f.baseEnv })
                : t("Requests go to POST {url}.", { url: base + "/systemone" })}
            </div>
          </div>

          <label>{t(f.baseEnv ? "API key" : "API key")}</label>
          <div>
            <div className="val">
              <code>{secret}</code>
              <CopyBtn text={secret} what={t("Key")} onStatus={onStatus} />
            </div>
            <div className="hint">
              {f.keyEnv
                ? t(
                    "{env}=magpie. The gateway trusts everything on loopback, so any value works.",
                    { env: f.keyEnv },
                  )
                : t(
                    "Sent as Authorization: Bearer. The gateway trusts everything on loopback, so any value works.",
                  )}
            </div>
          </div>

          <label>{t("Model")}</label>
          <div>
            <div className="val">
              <code>{modelPlaceholder}</code>
              <CopyBtn
                text={modelPlaceholder}
                what={t("Model id")}
                onStatus={onStatus}
              />
            </div>
            <div className="hint">
              {t(
                f.decide
                  ? "No decision models yet. Add a System One, Jev or Workers AI provider."
                  : "No models yet. Add a provider, or sign in to Codex or Copilot.",
              )}
            </div>
          </div>

          <label>{t("Example")}</label>
          <div>
            <div className="stack">
              <div className="snip-tabs">
                <div className="segs" ref={snipSeg} data-kind="snip">
                  {langs.map(([id, name]) => (
                    <button
                      key={id}
                      type="button"
                      className={`opt${activeSnip === id ? " on" : ""}`}
                      aria-pressed={activeSnip === id}
                      onClick={() => pickSnip(id)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                {(activeSnip === "shell" || activeSnip === "curl") && (
                  <div
                    className="segs snip-os"
                    ref={osSeg}
                    role="group"
                    aria-label={t("Where the snippet runs")}
                    title={t("Where the snippet runs")}
                    data-kind="os"
                  >
                    {(
                      [
                        ["windows", "Windows"],
                        ["unix", "macOS · Linux"],
                      ] as const
                    ).map(([id, name]) => (
                      <button
                        key={id}
                        type="button"
                        className={`opt${snipOS === id ? " on" : ""}`}
                        aria-pressed={snipOS === id}
                        onClick={() => pickOS(id)}
                      >
                        {t(name)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="snip-wrap">
                <pre className="snip">
                  <code>
                    {activeSnip === "shell"
                      ? highlightShell(snippet)
                      : snippet}
                  </code>
                </pre>
                {snippet ? (
                  <CopyBtn text={snippet} what={t("Snippet")} onStatus={onStatus} />
                ) : null}
              </div>
            </div>
            {activeSnip === "shell" ? (
              <div className="hint">
                {t(
                  "Put these in the shell (or the tool's settings) and the tool talks to magpie instead of the vendor.",
                )}
              </div>
            ) : null}
          </div>
        </section>

      <div className="row-head">
        <button
          type="button"
          className="fold"
          id="foldModels"
          aria-expanded={!modelsFolded}
          aria-controls="gwModels"
          title={t(modelsFolded ? "Show the models" : "Fold the models away")}
          onClick={() => {
            const next = !modelsFolded;
            setModelsFolded(next);
            lsSet("magpie.gwModelsFolded", next ? "1" : "0");
          }}
        >
          <FoldChev />
          <span className="label">{t("Models")}</span>
          <span className="note" id="modelsCount">{models ? String(models) : ""}</span>
        </button>
        <span className="grow" />
        <button
          type="button"
          className="text"
          id="copyModels"
          hidden={!models || modelsFolded}
          onClick={() => {
            void navigator.clipboard?.writeText(catalog.map((m) => m.id).join("\n"));
            onStatus(t("{what} copied", { what: t("Model ids") }), "ok");
          }}
        >
          {t("Copy all ids")}
        </button>
      </div>
      <div className="list" id="gwModels" hidden={!!(modelsFolded && models > 0)}>
        {!catalog.length ? (
          <div className="empty-state">
            <b>{t("No models exposed yet")}</b>
            {t("Add a provider, or sign in to Codex or Copilot; their models show up here for every agent.")}
          </div>
        ) : (
          catalog.map((m) => (
            <div
              key={m.id}
              className={`row model${m.id === exampleModel ? " selected" : ""}`}
              title={t("Use this model in the snippets")}
              onClick={() => {
                setExampleModel(m.id);
                lsSet("magpie.model", m.id);
              }}
            >
              <span className="ic" aria-hidden>◎</span>
              <div className="who">
                <div className="name">{m.id}</div>
                <div className="sub">{m.name !== m.id.split("/")[1] ? `${m.name} · ${m.provider}` : m.provider}</div>
              </div>
              <CopyBtn text={m.id} what={t("Model id")} onStatus={onStatus} />
            </div>
          ))
        )}
      </div>

      <div className="row-head">
        <span className="label">{t("Recent calls")}</span>
        <span className="grow" />
        <span className="note" id="callsNote" />
      </div>
      <div className="list activity" id="activity">
        {!calls.length ? (
          <div className="none">
            {t("No requests yet. Point an agent at a model, or run the example above; every call shows up here as it happens.")}
          </div>
        ) : (
          calls.map((c) => {
            const id = `#${c.id}`;
            const open = expandedCalls.has(id);
            return (
              <div key={id} className={`call-item${open ? " open" : ""}${c.status >= 400 ? " bad" : ""}`} data-id={id}>
                <div
                  className="call"
                  role="button"
                  tabIndex={0}
                  aria-expanded={open}
                  title={open ? t("Hide request and response bodies") : t("Show request and response bodies")}
                  onClick={() => {
                    setExpandedCalls((prev) => {
                      const n = new Set(prev);
                      if (n.has(id)) n.delete(id); else n.add(id);
                      return n;
                    });
                  }}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      (ev.currentTarget as HTMLElement).click();
                    }
                  }}
                >
                  <span className="call-chev"><FoldChev /></span>
                  <span className="when">{new Date(c.time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                  <span className="a">{c.agent}</span>
                  <span className="m">{c.model}</span>
                  <span className="p">{c.from === c.to ? c.from : `${c.from} → ${c.to}`}</span>
                  <span className="grow" />
                  <span className="st">{c.error ? `${c.status} ${c.error}` : `${c.status} · ${c.ms}ms`}{c.ttft ? ` · TTFT ${c.ttft}ms` : ""}</span>
                </div>
                {open ? (
                  <div className="call-body">
                    <pre className="snip"><code>{demoCopy("演示请求体（未接线真网关）", "Demo request body (no live gateway)")}</code></pre>
                    <pre className="snip"><code>{demoCopy("演示响应体", "Demo response body")}</code></pre>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
