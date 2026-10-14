import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import presets from "../data/presets.json";
import { SUB_TILES, iconSrc } from "../data/mock";
import { ZH, t, demoCopy } from "../i18n";

type Preset = { id: string; name: string; icon: string; kind: string };
const PRESETS = presets as Preset[];

const SPRING = (() => {
  try {
    return CSS.supports("animation-timing-function", "linear(0, 1)")
      ? "linear(0, 0.0203, 0.0723, 0.1448, 0.2292, 0.3188, 0.4086, 0.4951, 0.576, 0.6498, 0.7157, 0.7735, 0.8232, 0.8654, 0.9005, 0.9293, 0.9525, 0.9708, 0.9849, 0.9956, 1.0033, 1.0087, 1.0122, 1.0142, 1.015, 1.0151, 1.0146, 1.0136, 1.0124, 1.0111, 1.0097, 1.0084, 1.0071, 1.0059, 1.0049, 1.0039, 1.0031, 1.0024, 1.0018, 1.0013, 1)"
      : "cubic-bezier(.2, .9, .25, 1.02)";
  } catch {
    return "cubic-bezier(.2, .9, .25, 1.02)";
  }
})();
const IOS_EASE = "cubic-bezier(.32, .72, 0, 1)";
const calm = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const EXTRA_BODY_DEFAULT = '{\n  "prompt_cache_key": "${sessionId}"\n}';

const CTX_CHIPS = ["128K", "200K", "256K", "400K", "512K", "1M"];
const OUT_CHIPS = ["8K", "16K", "32K", "64K", "128K"];

const IMPORT_APPS = [
  {
    id: "alma",
    name: "Alma",
    icon: "app-alma.png",
    path: "~/.config/alma/chat_threads.db",
  },
  {
    id: "cc-switch",
    name: "CC Switch",
    icon: "app-cc-switch.png",
    path: "~/.cc-switch",
  },
  {
    id: "claude-code",
    name: "Claude Code",
    icon: "claudecode-color.svg",
    path: "~/.claude",
  },
  {
    id: "codex",
    name: "Codex",
    icon: "codex-color.svg",
    path: "~/.codex",
  },
] as const;

type EditorForm =
  | "anthropic"
  | "openrouter"
  | "ollama"
  | "remote"
  | "custom"
  | "generic";

type EditorState = {
  form: EditorForm;
  id: string;
  name: string;
  icon: string;
  site?: string;
  note?: string;
} | null;

type Props = {
  onStatus: (msg: string, kind?: string) => void;
  onGoPlugins?: () => void;
};

function Tile({
  id,
  name,
  icon,
  onPick,
  on,
}: {
  id: string;
  name: string;
  icon: string;
  onPick: (id: string) => void;
  on?: boolean;
}) {
  return (
    <button
      type="button"
      className={`tile${on ? " on" : ""}`}
      data-pick={id}
      title={name}
      onClick={() => onPick(id)}
    >
      <img
        className="ic-img ic"
        src={iconSrc(icon)}
        alt=""
        onError={(e) => {
          const el = e.currentTarget;
          if (!el.dataset.fallback) {
            el.dataset.fallback = "1";
            el.src = `/icons/${icon}.png`;
          }
        }}
      />
      <span className="nm">
        <span className="n">{name}</span>
      </span>
    </button>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="kind">
        <b>{title}</b>
        {hint ? <span>{hint}</span> : null}
      </div>
      <div className="grid">{children}</div>
    </>
  );
}

function Segs({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { v: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="segs">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          className={`opt${value === o.v ? " on" : ""}`}
          onClick={() => onChange(o.v)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <>
      <label>{label}</label>
      <div>
        {children}
        {hint ? <div className="hint">{hint}</div> : null}
      </div>
    </>
  );
}

function useModalAnim(open: boolean, onGone: () => void) {
  const modalRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const m = modalRef.current;
    const d = dialogRef.current;
    if (!m || !d) {
      onGone();
      return;
    }
    m.classList.add("out");
    for (const a of [...m.getAnimations(), ...d.getAnimations()]) {
      a.commitStyles?.();
      a.cancel();
    }
    const shape = { duration: 260, easing: IOS_EASE, fill: "forwards" as const };
    const moves = [
      m.animate([{ opacity: 0 }], { ...shape, easing: "ease-out" }),
      calm()
        ? d.animate([{ opacity: 0 }], { duration: 140, fill: "forwards" })
        : d.animate([{ transform: "translateY(14px) scale(.95)" }], shape),
    ];
    if (!calm()) {
      moves.push(
        d.animate(
          [
            { offset: 0.2, opacity: getComputedStyle(d).opacity },
            { opacity: 0 },
          ],
          shape,
        ),
      );
    }
    Promise.all(moves.map((a) => a.finished)).then(onGone, onGone);
  };

  useEffect(() => {
    if (!open) return;
    closing.current = false;
    const m = modalRef.current;
    const d = dialogRef.current;
    if (!m || !d) return;
    for (const a of [...m.getAnimations(), ...d.getAnimations()]) a.cancel();
    d.style.opacity = d.style.transform = m.style.opacity = "";
    m.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 280,
      easing: "ease-out",
    });
    if (calm()) {
      d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
    } else {
      d.animate(
        [
          { transform: "translateY(24px) scale(.94)" },
          { transform: "none" },
        ],
        { duration: 570, easing: SPRING },
      );
      d.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 240,
        easing: "ease-out",
      });
    }
    const first = d.querySelector<HTMLElement>(
      "input:not([disabled]), textarea, button:not([disabled])",
    );
    first?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return { modalRef, dialogRef, close };
}

function ImportAppsModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<string>(IMPORT_APPS[0].id);
  const { modalRef, dialogRef, close } = useModalAnim(true, onClose);
  const cur = IMPORT_APPS.find((a) => a.id === tab) || IMPORT_APPS[0];

  return (
    <div
      className="modal"
      id="modal"
      ref={modalRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
        tabIndex={-1}
      >
        <div className="editor new importapps framed">
          <div className="ehead">
            <b id="modalTitle">{ZH.importApps}</b>
          </div>
          <div className="ebody">
            <div className="appnote">{ZH.importAppsNote}</div>
            <div className="apptabs" role="tablist">
              {IMPORT_APPS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="tab"
                  className={`apptab missing${tab === a.id ? " on" : ""}`}
                  aria-selected={tab === a.id}
                  title={ZH.notFound}
                  onClick={() => setTab(a.id)}
                >
                  <img className="applogo" src={iconSrc(a.icon)} alt="" />
                  <span>{a.name}</span>
                  <span className="count">–</span>
                </button>
              ))}
            </div>
            <div className="applist">
              <div className="appsrc">
                <div className="apphead">
                  <img className="applogo" src={iconSrc(cur.icon)} alt="" />
                  <b>{cur.name}</b>
                  <code>{cur.path}</code>
                </div>
                <div className="appempty">{ZH.notFound}</div>
              </div>
            </div>
          </div>
          <div className="bar">
            <span className="note grow" />
            <button type="button" className="text" onClick={close}>
              {ZH.cancel}
            </button>
            <button type="button" className="text primary" disabled>
              {ZH.importAction}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type EditorProps = {
  state: NonNullable<EditorState>;
  onClose: () => void;
  onAdd: () => void;
};

function ProviderEditorModal({ state, onClose, onAdd }: EditorProps) {
  const kind = state.form;
  const { modalRef, dialogRef, close } = useModalAnim(true, onClose);
  const [showKey, setShowKey] = useState(false);
  const [tryModel, setTryModel] = useState("");
  const [detectHint, setDetectHint] = useState("");
  const [detectBusy, setDetectBusy] = useState(false);
  const [iconsOpen, setIconsOpen] = useState(false);
  const [iconQ, setIconQ] = useState("");
  const [pickedIcon, setPickedIcon] = useState(state.icon || "aside");
  const [hdrs, setHdrs] = useState<{ name: string; value: string }[]>([{ name: "", value: "" }]);
  const [discardOpen, setDiscardOpen] = useState(false);
  const API_HINTS: Record<string, string> = {
    openai: "…/v1 — chat completions, and responses when the vendor has it",
    responses: "…/v1 — for a vendor that serves only the Responses API, not chat completions",
    anthropic: "the root URL, what ANTHROPIC_BASE_URL would take",
    gemini: "…/v1beta — Google's Gemini API (generateContent), or one that answers as it does; the key goes in x-goog-api-key",
    decide: "a decision API's root, POST …/systemone under it: its models are a routing group's classifier, never an agent's",
  };
  const BUILTIN_ICONS = [
    "ai21", "anthropic", "aws", "azure-color", "claude-color", "openai", "gemini-color",
    "deepseek-color", "xai", "kimi", "zhipu-color", "zai", "cohere-color", "mistral-color",
  ];
  const [key, setKey] = useState("");
  const [proxy, setProxy] = useState("");
  const [authHdr, setAuthHdr] = useState(""); // openrouter: "" both
  const [api, setApi] = useState("openai");
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [extra, setExtra] = useState(EXTRA_BODY_DEFAULT);
  const [addrOpen, setAddrOpen] = useState(false);

  const dirty =
    !!(name.trim() || baseUrl.trim() || key.trim() || tryModel.trim() || extra !== EXTRA_BODY_DEFAULT || hdrs.some((h) => h.name || h.value));
  const requestClose = () => {
    if (kind === "custom" && dirty) setDiscardOpen(true);
    else close();
  };

  const meta = {
    title: state.name,
    icon: state.icon,
    site: state.site || "",
    note: state.note || "",
    keyPh:
      kind === "ollama" || state.id === "ollama" ? ZH.optionalLocal : ZH.pasteKey,
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    onAdd();
    close();
  };

  return (
    <div
      className="modal"
      id="modal"
      ref={modalRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
        tabIndex={-1}
      >
        <form className="editor new framed" onSubmit={onSubmit}>
          <div className="ehead">
            <span className="ic">
              <img src={iconSrc(kind === "custom" ? pickedIcon : meta.icon)} alt="" />
            </span>
            <b id="modalTitle">{meta.title}</b>
            {meta.note ? <span className="note">{meta.note}</span> : null}
            <span className="grow" />
            {meta.site ? (
              <button type="button" className="link site" tabIndex={-1}>
                {meta.site} ↗
              </button>
            ) : null}
          </div>
          <div className="ebody">
            {kind === "custom" ? (
              <Field label={ZH.name}>
                <input
                  type="text"
                  placeholder={ZH.egRelay}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
            ) : null}

            {kind === "custom" ? (
              <Field label={ZH.baseUrl}>
                <div className="stack">
                  <Segs
                    value={api}
                    onChange={(v) => {
                      setApi(v);
                      setDetectHint("");
                    }}
                    options={[
                      { v: "openai", label: ZH.openaiCompat },
                      { v: "responses", label: ZH.openaiResponses },
                      { v: "anthropic", label: ZH.anthropicCompat },
                      { v: "gemini", label: ZH.geminiCompat },
                      { v: "decide", label: ZH.systemOne },
                    ]}
                  />
                  {API_HINTS[api] ? (
                    <div className="hint" style={{ marginTop: -2, color: "var(--muted)", fontSize: 11.5 }}>
                      {t(API_HINTS[api]) || API_HINTS[api]}
                    </div>
                  ) : null}
                  <input
                    className="base-url"
                    type="url"
                    placeholder="https://…/v1"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    title={API_HINTS[api] || ""}
                  />
                  <div className="pair detect-row" style={{ gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className={`text action${detectBusy ? " busy" : ""}`}
                      title={t("Type the base URL first. smallest request to each API (OpenAI chat completions, Responses, Anthropic, Gemini generateContent) at this URL, to see which answer")}
                      disabled={detectBusy}
                      onClick={() => {
                        if (!baseUrl.trim()) {
                          setDetectHint(t("Type the base URL first. smallest request to each API (OpenAI chat completions, Responses, Anthropic, Gemini generateContent) at this URL, to see which answer"));
                          return;
                        }
                        if (api === "decide" && !tryModel.trim()) {
                          setDetectHint(t("A decision API is asked with one model: type it and press Detect APIs"));
                          return;
                        }
                        setDetectBusy(true);
                        setDetectHint("");
                        window.setTimeout(() => {
                          setDetectBusy(false);
                          setDetectHint(
                            demoCopy(
                              "演示：未发探测请求。OpenAI chat · Responses 可能可用。",
                              "Demo: no probe sent. OpenAI chat · Responses may answer.",
                            ),
                          );
                        }, 480);
                      }}
                    >
                      {detectBusy ? "…" : t("Detect APIs")}
                    </button>
                    <input
                      type="text"
                      placeholder={t("model to try · empty picks one from list")}
                      value={tryModel}
                      onChange={(e) => setTryModel(e.target.value)}
                      style={{ flex: 1, minWidth: 140 }}
                    />
                    <button
                      type="button"
                      className="text action detect-each"
                      title={t("Pick models first, or type one and press Detect APIs")}
                      onClick={() => {
                        if (!tryModel.trim()) {
                          setDetectHint(t("Pick models first, or type one and press Detect APIs"));
                          return;
                        }
                        setDetectHint(
                          demoCopy(
                            `演示：对每个已选模型探测（${tryModel.trim()}）`,
                            `Demo: probe each picked model (${tryModel.trim()})`,
                          ),
                        );
                      }}
                    >
                      {t("Each picked model")}
                    </button>
                  </div>
                  {detectHint ? (
                    <div
                      className="hint"
                      style={{
                        color:
                          detectHint.includes("base URL first") || detectHint.includes("先填写") || detectHint.includes("type the provider")
                            ? "var(--red)"
                            : detectHint.includes("decision") || detectHint.includes("决策") || detectHint.includes("Type the") || detectHint.includes("Pick models") || detectHint.includes("先")
                              ? "var(--amber, #c47a00)"
                              : "var(--muted)",
                        fontSize: 11.5,
                        animation: "fade-in .15s var(--ease)",
                      }}
                    >
                      {detectHint}
                    </div>
                  ) : null}
                </div>
              </Field>
            ) : null}

            {kind === "remote" ? (
              <Field label={ZH.endpoint} hint={ZH.remoteHint}>
                <input
                  type="url"
                  placeholder="http://192.168.1.20:3425"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                />
              </Field>
            ) : null}

            <Field label={ZH.apiKey} hint={ZH.keyKept}>
              <div className="pair">
                <input
                  type={showKey ? "text" : "password"}
                  placeholder={meta.keyPh}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  autoComplete="off"
                />
                <div className="side">
                  <button
                    type="button"
                    className="text"
                    onClick={() => setShowKey((s) => !s)}
                  >
                    {showKey ? ZH.hide : ZH.show}
                  </button>
                  {kind === "anthropic" ? (
                    <button type="button" className="link" tabIndex={-1}>
                      {ZH.getKey}
                    </button>
                  ) : null}
                </div>
              </div>
            </Field>

            {kind === "ollama" ? (
              <details
                className="more"
                open={addrOpen}
                onToggle={(e) => setAddrOpen(e.currentTarget.open)}
              >
                <summary>{ZH.serverAddress}</summary>
                <div className="inner">
                  <Field label={ZH.address}>
                    <input
                      className="address"
                      type="url"
                      inputMode="url"
                      placeholder="http://localhost:11434"
                    />
                  </Field>
                </div>
              </details>
            ) : null}

            {kind === "custom" ? (
              <Field label={t("Icon")}>
                <div className="stack" style={{ gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className="ic" style={{ width: 36, height: 36, display: "inline-flex", border: "1px solid var(--line)", borderRadius: 8, alignItems: "center", justifyContent: "center" }}>
                      <img src={iconSrc(pickedIcon)} alt="" width={22} height={22} />
                    </span>
                    <button type="button" className="text" onClick={() => setDetectHint(demoCopy("演示：未打开文件选择器", "Demo: no file picker"))}>
                      {t("Choose a picture…")}
                    </button>
                    <button
                      type="button"
                      className="text"
                      title={t("Look for the icon of the site the base URL is on.")}
                      onClick={() => {
                        if (!baseUrl.trim()) {
                          setDetectHint(t("type the provider's base URL first: its site's icon is looked for there."));
                          return;
                        }
                        setDetectHint(demoCopy("演示：未从网站拉取图标", "Demo: fetched favicon skipped (local)"));
                      }}
                    >
                      {t("From the website")}
                    </button>
                    <button
                      type="button"
                      className={`text${iconsOpen ? " on" : ""}`}
                      aria-pressed={iconsOpen}
                      onClick={() => setIconsOpen((o) => !o)}
                    >
                      {t("Built-in icons")}
                    </button>
                  </div>
                  {iconsOpen ? (
                    <div className="icon-pick" style={{ animation: "fade-in .18s var(--ease)" }}>
                      <input
                        type="search"
                        placeholder={t("Find an icon…")}
                        value={iconQ}
                        onChange={(e) => setIconQ(e.target.value)}
                        style={{ width: "100%", marginBottom: 8 }}
                      />
                      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 6, maxHeight: 160, overflow: "auto" }}>
                        {BUILTIN_ICONS.filter((id) => !iconQ.trim() || id.toLowerCase().includes(iconQ.trim().toLowerCase())).map((id) => (
                          <button
                            key={id}
                            type="button"
                            className={`tile${pickedIcon === id ? " on" : ""}`}
                            title={id}
                            onClick={() => setPickedIcon(id)}
                            style={{ padding: 8 }}
                          >
                            <img className="ic-img ic" src={iconSrc(id)} alt="" />
                            <span className="nm"><span className="n" style={{ fontSize: 10 }}>{id.split("-")[0]}</span></span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </Field>
            ) : null}

            <Field label={ZH.headers} hint={kind === "custom" ? t("Extra HTTP headers sent to the vendor, applied after auth. For gateways that need a private scheme.") : undefined}>
              {kind === "custom" ? (
                <div className="stack" style={{ gap: 6 }}>
                  {hdrs.map((h, i) => (
                    <div key={i} className="pair" style={{ gap: 6 }}>
                      <input
                        type="text"
                        placeholder="Header-Name"
                        value={h.name}
                        onChange={(e) =>
                          setHdrs((rows) => rows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))
                        }
                      />
                      <input
                        type="text"
                        placeholder="value"
                        value={h.value}
                        onChange={(e) =>
                          setHdrs((rows) => rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))
                        }
                      />
                      <button
                        type="button"
                        className="text"
                        title="{ }"
                        onClick={() =>
                          setHdrs((rows) =>
                            rows.map((r, j) =>
                              j === i ? { ...r, value: r.value || '{"…":"…"}' } : r,
                            ),
                          )
                        }
                      >
                        {"{ }"}
                      </button>
                      <button
                        type="button"
                        className="text quiet"
                        aria-label="Remove"
                        onClick={() => setHdrs((rows) => (rows.length <= 1 ? [{ name: "", value: "" }] : rows.filter((_, j) => j !== i)))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="link"
                    onClick={() => setHdrs((rows) => [...rows, { name: "", value: "" }])}
                  >
                    {ZH.addHeader}
                  </button>
                </div>
              ) : (
                <button type="button" className="link">
                  {ZH.addHeader}
                </button>
              )}
            </Field>

            <Field label={ZH.extraBody}>
              <div className="extra-body">
                <textarea
                  className="json"
                  rows={3}
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  spellCheck={false}
                />
              </div>
            </Field>

            <Field label={t("Proxy")} hint={t("Follows the proxy in Settings")}>
              <Segs
                value={proxy}
                onChange={setProxy}
                options={[
                  { v: "", label: t("Global proxy") },
                  { v: "direct", label: t("Direct") },
                  { v: "custom", label: t("Custom") },
                ]}
              />
            </Field>

            <Field
              label={t("Concurrency")}
              hint={t("Over it, requests queue and go out in order; 0 or empty is no limit")}
            >
              <input type="text" placeholder={t("No limit")} />
            </Field>
            <Field
              label={t("Requests per minute")}
              hint={t(
                "How many requests each key or account sends in any minute, retries included; one more waits for room, up to 2 minutes. 0 or empty is no limit",
              )}
            >
              <input type="text" placeholder={t("No limit")} />
            </Field>
            <Field label={ZH.queueSize}>
              <input type="text" placeholder={ZH.noBound} />
            </Field>
            <Field label={ZH.queueWait}>
              <input type="text" placeholder={ZH.asLong} />
            </Field>
            <Field label={ZH.priceRate}>
              <input type="text" placeholder={ZH.priceOne} />
            </Field>

            {kind === "openrouter" || kind === "ollama" ? (
              <Field label={ZH.keyHeader}>
                <Segs
                  value={authHdr}
                  onChange={setAuthHdr}
                  options={[
                    { v: "", label: ZH.both },
                    { v: "x-api-key", label: "x-api-key" },
                    {
                      v: "bearer",
                      label: "Authorization: Bearer",
                    },
                  ]}
                />
              </Field>
            ) : null}

            {kind === "anthropic" ||
            kind === "remote" ||
            kind === "custom" ||
            kind === "generic" ? (
              <>
                <Field label={ZH.contextWindow}>
                  <input type="text" placeholder="e.g. 128k" />
                  <div className="chips" style={{ marginTop: 6 }}>
                    {CTX_CHIPS.map((c) => (
                      <button key={c} type="button" className="chip">
                        {c}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label={ZH.maxOutput}>
                  <input type="text" placeholder="" />
                  <div className="chips" style={{ marginTop: 6 }}>
                    {OUT_CHIPS.map((c) => (
                      <button key={c} type="button" className="chip">
                        {c}
                      </button>
                    ))}
                  </div>
                </Field>
              </>
            ) : null}
          </div>
          <div className="bar">
            <span className="grow" />
            <button type="button" className="text" onClick={requestClose}>
              {ZH.cancel}
            </button>
            <button type="submit" className="text primary">
              {ZH.add}
            </button>
          </div>
        </form>
      </div>
      {discardOpen ? (
        <div
          className="modal"
          style={{ zIndex: 40, background: "rgba(20,22,30,.35)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDiscardOpen(false);
          }}
        >
          <div className="dialog sm" role="alertdialog" aria-labelledby="discardTitle" style={{ animation: "pop-in .28s var(--ease)", maxWidth: 360 }}>
            <div className="ehead" style={{ padding: "14px 16px 0" }}>
              <b id="discardTitle">{t("Discard")}</b>
            </div>
            <p style={{ margin: "10px 16px 0", fontSize: 13, color: "var(--fg-2)", lineHeight: 1.45 }}>
              {t("Discard unsaved changes? Your changes will be lost.")}
            </p>
            <div className="bar" style={{ padding: "14px 16px" }}>
              <span className="grow" />
              <button type="button" className="text" onClick={() => setDiscardOpen(false)}>
                {ZH.cancel}
              </button>
              <button
                type="button"
                className="text"
                style={{ background: "var(--red)", color: "#fff", borderColor: "var(--red)" }}
                onClick={() => {
                  setDiscardOpen(false);
                  close();
                }}
              >
                {t("Discard")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ProvidersView({ onStatus, onGoPlugins }: Props) {
  const [q, setQ] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(null);
  /** Magpie signing flow for Claude (shots 22–24): risk → import → importing → imported */
  type ClaudeSign =
    | null
    | { state: "risk" }
    | {
        state: "import";
        text: string;
        files: { name: string; text: string }[];
        error?: string;
      }
    | { state: "importing" }
    | { state: "imported"; results: { user: string; status: string; error?: string }[] };
  const [claudeSign, setClaudeSign] = useState<ClaudeSign>(null);
  const [claudeFilePick, setClaudeFilePick] = useState(false);
  const [claudeFileLoc, setClaudeFileLoc] = useState<"home" | "desktop" | "settings" | "other">("home");
  type DemoProv = {
    id: string;
    name: string;
    icon: string;
    accountsOpen: boolean;
    modelsOpen: boolean;
    accounts: { id: string; label: string }[];
    models: string[];
  };
  const [demoProvs, setDemoProvs] = useState<DemoProv[]>(() => {
    try {
      const raw = localStorage.getItem("magpie.demoProviders");
      if (raw) {
        const parsed = JSON.parse(raw) as DemoProv[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch {
      /* ignore */
    }
    return [
      {
        id: "anthropic",
        name: "Anthropic",
        icon: "claude-color",
        accountsOpen: true,
        modelsOpen: false,
        accounts: [
          { id: "acct-1", label: "work@example.com" },
          { id: "acct-2", label: "api-key · sk-…demo" },
        ],
        models: ["claude-sonnet-4-5", "claude-haiku-4-5", "claude-opus-4"],
      },
    ];
  });
  const [addStep, setAddStep] = useState(0); // nested add-provider wizard on sheet foot
  useEffect(() => {
    try {
      localStorage.setItem("magpie.demoProviders", JSON.stringify(demoProvs));
    } catch {
      /* ignore */
    }
  }, [demoProvs]);
  const findRef = useRef<HTMLInputElement>(null);
  const f = q.trim().toLowerCase();

  const hit = (name: string, id: string) =>
    !f || name.toLowerCase().includes(f) || id.toLowerCase().includes(f);

  const subs = useMemo(
    () => SUB_TILES.filter((s) => hit(s.name, s.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [f],
  );
  const byKind = (kind: string) =>
    PRESETS.filter((p) => p.kind === kind && hit(p.name, p.id));

  const vendors = byKind("vendor").filter((p) => !p.id.endsWith("-cn") || f);
  const relays = byKind("relay");
  const locals = byKind("local");
  const remotes = byKind("remote");

  const pickTile = (id: string) => {
    if (id === "plugins") {
      onGoPlugins?.();
      return;
    }
    if (id === "claude") {
      setClaudeSign({ state: "risk" });
      setEditor(null);
      return;
    }
    setClaudeSign(null);
    if (id === "custom") {
      setEditor({
        form: "custom",
        id: "custom",
        name: ZH.customProvider,
        icon: "generic",
      });
      return;
    }
    const sub = SUB_TILES.find((s) => s.id === id);
    const pr = PRESETS.find((p) => p.id === id);
    const name = pr?.name || sub?.name || id;
    const icon = pr?.icon || sub?.icon || "generic";
    if (id === "anthropic")
      setEditor({
        form: "anthropic",
        id,
        name: "Anthropic",
        icon: "claude-color",
        site: "console.anthropic.com",
      });
    else if (id === "openrouter")
      setEditor({
        form: "openrouter",
        id,
        name: "OpenRouter",
        icon: "openrouter",
        site: "openrouter.ai",
      });
    else if (id === "ollama")
      setEditor({
        form: "ollama",
        id,
        name: "Ollama",
        icon: "ollama",
        site: "ollama.com",
        note: ZH.ollamaNote,
      });
    else if (id === "remote")
      setEditor({
        form: "remote",
        id,
        name: "Remote magpie",
        icon: "magpie",
        note: ZH.remoteNote,
      });
    else
      setEditor({
        form: "generic",
        id,
        name,
        icon,
      });
  };

  const anySection =
    subs.length > 0 ||
    vendors.length > 0 ||
    relays.length > 0 ||
    locals.length > 0 ||
    remotes.length > 0;

  return (
    <>
      <main className="view" id="view-providers">
        <div className="list" id="providers" hidden={!demoProvs.length}>
          {demoProvs.map((pv) => (
            <div className="row provider" key={pv.id} data-id={pv.id}>
              <span className="ic">
                <img src={iconSrc(pv.icon)} alt="" />
              </span>
              <div className="who">
                <div className="name">{pv.name}</div>
                <div className="sub">
                  {pv.accounts.length} accounts · {pv.models.length} models
                </div>
                <button
                  type="button"
                  className={`fold text${pv.accountsOpen ? " open" : ""}`}
                  aria-expanded={pv.accountsOpen}
                  onClick={() =>
                    setDemoProvs((list) =>
                      list.map((x) => (x.id === pv.id ? { ...x, accountsOpen: !x.accountsOpen } : x)),
                    )
                  }
                >
                  <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden>
                    <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  Accounts
                </button>
                {pv.accountsOpen ? (
                  <div className="pv-accounts" style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                    {pv.accounts.map((a) => (
                      <div className="row pref" key={a.id} style={{ padding: "6px 8px" }}>
                        <div className="who">
                          <div className="name" style={{ fontSize: 12.5 }}>{a.label}</div>
                          <div className="sub">{"Demo account fold row"}</div>
                        </div>
                        <div className="val">
                          <button type="button" className="text">Edit</button>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="text" style={{ alignSelf: "flex-start" }}>
                      + Account
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  className={`fold text${pv.modelsOpen ? " open" : ""}`}
                  aria-expanded={pv.modelsOpen}
                  style={{ marginTop: 6 }}
                  onClick={() =>
                    setDemoProvs((list) =>
                      list.map((x) => (x.id === pv.id ? { ...x, modelsOpen: !x.modelsOpen } : x)),
                    )
                  }
                >
                  <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden>
                    <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  Models
                </button>
                {pv.modelsOpen ? (
                  <div className="pv-models" style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {pv.models.map((m) => (
                      <code key={m} style={{ fontSize: 11, padding: "3px 7px", borderRadius: 6, background: "var(--pill)" }}>
                        {m}
                      </code>
                    ))}
                    <button type="button" className="text">+ Model</button>
                  </div>
                ) : null}
              </div>
              <div className="val">
                <button
                  type="button"
                  className="text"
                  onClick={() => setDemoProvs((list) => list.filter((x) => x.id !== pv.id))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <section className="sheet" id="addSheet">
          <div className="row-head">
            <span className="label">{ZH.addFirstProvider}</span>
            <span className="grow" />
            <input
              ref={findRef}
              className="find"
              type="search"
              spellCheck={false}
              autoComplete="off"
              placeholder={ZH.findVendor}
              aria-label={ZH.findVendor}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Escape") return;
                e.preventDefault();
                e.stopPropagation();
                if (q) setQ("");
              }}
            />
            <button
              type="button"
              className="text"
              onClick={() => setImportOpen(true)}
            >
              {ZH.import}
            </button>
          </div>
          <div className="tiles">
            {subs.length > 0 && (
              <>
                <Section title={ZH.subscriptions} hint={ZH.signInNoKey}>
                  {subs.map((s) => (
                    <Tile
                      key={s.id}
                      id={s.id}
                      name={s.name}
                      icon={s.icon}
                      on={!!claudeSign && s.id === "claude"}
                      onPick={pickTile}
                    />
                  ))}
                  <button
                    type="button"
                    className="tile more-plugins"
                    data-pick="plugins"
                    onClick={() => pickTile("plugins")}
                  >
                    <span className="puzzle" aria-hidden>
                      <svg viewBox="0 0 20 20" width={15} height={15}>
                        <path
                          d="M8 3.5h4v2.5a1.5 1.5 0 0 0 3 0V3.5h1.5v13H4v-4h2.5a1.5 1.5 0 0 0 0-3H4v-6z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="nm">
                      <span className="n">{ZH.moreInPlugins}</span>
                    </span>
                  </button>
                </Section>
                {claudeSign?.state === "risk" ? (
                  <div className="signing">
                    <span className="mark">!</span>
                    <span className="tt">
                      <span className="n">
                        {t("{name} accounts can be suspended", { name: "Claude" })}
                      </span>
                      <span className="s">
                        {t(
                          "Anthropic may suspend or ban a Claude account it sees used outside its own apps. magpie sends requests through Claude Code, but Anthropic may still act on them; you use it at your own risk. Use an account you can afford to lose.",
                        )}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="text"
                      onClick={() => setClaudeSign(null)}
                    >
                      {t("Cancel")}
                    </button>
                    <button
                      type="button"
                      className="text"
                      title={t(
                        "Bring in accounts from CLIProxyAPI's auth files or {own}",
                        { own: "Claude Code's .credentials.json" },
                      )}
                      onClick={() =>
                        setClaudeSign({ state: "import", text: "", files: [] })
                      }
                    >
                      {t("Import instead…")}
                    </button>
                    <button
                      type="button"
                      className="text primary"
                      onClick={() => {
                        setClaudeSign(null);
                        onStatus(ZH.signInSkipped, "ok");
                      }}
                    >
                      {t("Sign in anyway")}
                    </button>
                  </div>
                ) : null}
                {claudeSign?.state === "import" ||
                claudeSign?.state === "importing" ||
                claudeSign?.state === "imported" ? (
                  <div
                    className={`signing import${claudeSign.state === "importing" ? "" : ""}`}
                  >
                    {claudeSign.state === "importing" ? (
                      <span className="spinner" aria-hidden />
                    ) : claudeSign.state === "imported" ? (
                      <span className="mark">✓</span>
                    ) : (
                      <span className="mark">↑</span>
                    )}
                    <span className="tt">
                      {claudeSign.state === "importing" ? (
                        <>
                          <span className="n">{t("Adding the accounts…")}</span>
                          <span className="s">
                            {t(
                              "Each account is kept as the file has it; nothing is asked of Claude.",
                            )}
                          </span>
                        </>
                      ) : claudeSign.state === "imported" ? (
                        <>
                          <span className="n">{t("Import finished")}</span>
                          <span className="results">
                            {claudeSign.results.map((r) => (
                              <span
                                className={`res ${r.status}`}
                                key={r.user + r.status}
                              >
                                <span className="u">{r.user}</span>
                                <span className="st">
                                  {r.status === "added"
                                    ? t("Added")
                                    : r.status === "updated"
                                      ? t("Updated with this sign-in")
                                      : t("Not added")}
                                </span>
                                {r.error ? (
                                  <span className="why">{r.error}</span>
                                ) : null}
                              </span>
                            ))}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="n">
                            {t("Import {name} accounts", { name: "Claude" })}
                          </span>
                          <span className="s">
                            {t(
                              "Choose or paste CLIProxyAPI's auth files (JSON) or {own}. Each account is kept as the file has it.",
                              { own: "Claude Code's .credentials.json" },
                            )}
                          </span>
                          <span className="s">
                            {t(
                              "Claude Code renews the sign-in the first time it uses it, and the file's copy then stops working: the tool it came from has to sign in again.",
                            )}
                          </span>
                          <span className="s">
                            {t(
                              "Anthropic may suspend or ban a Claude account it sees used outside its own apps. magpie sends requests through Claude Code, but Anthropic may still act on them; you use it at your own risk. Use an account you can afford to lose.",
                            )}
                          </span>
                          <span className="acts">
                            <button
                              type="button"
                              className="link"
                              onClick={() => {
                                setClaudeFileLoc("home");
                                setClaudeFilePick(true);
                              }}
                            >
                              {t("Choose files…")}
                            </button>
                            {claudeSign.files.length ? (
                              <span className="fname">
                                {claudeSign.files.map((f) => f.name).join(", ")}
                              </span>
                            ) : null}
                          </span>
                          <textarea
                            rows={3}
                            spellCheck={false}
                            autoComplete="off"
                            placeholder={t("…or paste it here")}
                            value={claudeSign.text}
                            onChange={(e) =>
                              setClaudeSign({
                                state: "import",
                                text: e.target.value,
                                files: claudeSign.files,
                              })
                            }
                          />
                          {claudeSign.error ? (
                            <span className="s why">{claudeSign.error}</span>
                          ) : null}
                        </>
                      )}
                    </span>
                    {claudeSign.state === "import" ? (
                      <>
                        <button
                          type="button"
                          className="text"
                          onClick={() => setClaudeSign(null)}
                        >
                          {t("Cancel")}
                        </button>
                        <button
                          type="button"
                          className="text primary"
                          disabled={
                            !(
                              claudeSign.files.length ||
                              claudeSign.text.trim()
                            )
                          }
                          onClick={() => {
                            setClaudeSign({ state: "importing" });
                            window.setTimeout(() => {
                              setClaudeSign({
                                state: "imported",
                                results: [
                                  {
                                    user: "demo@claude.import",
                                    status: "added",
                                  },
                                ],
                              });
                              onStatus(
                                demoCopy(
                                  "演示：已本地标记导入（无真凭据）",
                                  "Demo: import marked locally (no real credentials)",
                                ),
                                "ok",
                              );
                            }, 720);
                          }}
                        >
                          {t("Import")}
                        </button>
                      </>
                    ) : null}
                    {claudeSign.state === "imported" ? (
                      <>
                        <button
                          type="button"
                          className="text"
                          onClick={() => setClaudeSign(null)}
                        >
                          {t("Done")}
                        </button>
                        <button
                          type="button"
                          className="text primary"
                          onClick={() =>
                            setClaudeSign({
                              state: "import",
                              text: "",
                              files: [],
                            })
                          }
                        >
                          {t("Import more…")}
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}

            {vendors.length > 0 && (
              <Section title={ZH.vendors} hint={ZH.makersApis}>
                {vendors.map((p) => (
                  <Tile
                    key={p.id}
                    id={p.id}
                    name={p.name}
                    icon={p.icon}
                    onPick={pickTile}
                  />
                ))}
              </Section>
            )}

            {relays.length > 0 && (
              <Section title={ZH.relays} hint={ZH.oneKeyMany}>
                {relays.map((p) => (
                  <Tile
                    key={p.id}
                    id={p.id}
                    name={p.name}
                    icon={p.icon}
                    onPick={pickTile}
                  />
                ))}
              </Section>
            )}

            {locals.length > 0 && (
              <Section title={ZH.onThisMachine}>
                {locals.map((p) => (
                  <Tile
                    key={p.id}
                    id={p.id}
                    name={p.name}
                    icon={p.icon}
                    onPick={pickTile}
                  />
                ))}
              </Section>
            )}

            {remotes.length > 0 && (
              <Section title={ZH.anotherComputer} hint={ZH.sharedNetwork}>
                {remotes.map((p) => (
                  <Tile
                    key={p.id}
                    id={p.id}
                    name={p.name}
                    icon={p.icon}
                    onPick={pickTile}
                  />
                ))}
              </Section>
            )}

            {!anySection && f ? (
              <div className="none">
                Nothing called “{q.trim()}”.{" "}
                <button
                  type="button"
                  className="link"
                  onClick={() =>
                    setEditor({
                      form: "custom",
                      id: "custom",
                      name: ZH.customProvider,
                      icon: "generic",
                    })
                  }
                >
                  Add it as a custom provider
                </button>
              </div>
            ) : null}

            {!f && (
              <div className="custom-foot">
                <button
                  type="button"
                  className={`custom${editor?.form === "custom" ? " on" : ""}`}
                  data-pick="custom"
                  onClick={() => pickTile("custom")}
                >
                  <svg viewBox="0 0 16 16" width={13} height={13} aria-hidden>
                    <path
                      d="M8 3.5v9M3.5 8h9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>{ZH.customProvider}</span>
                </button>
                <span className="hint">{ZH.anyCompatible}</span>
              </div>
            )}
            <div className="pv-add-steps card" style={{ marginTop: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--card)" }}>
              <div className="row-head" style={{ margin: 0 }}>
                <span className="label">{t("Add account step")}</span>
                <span className="grow" />
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  {addStep + 1} / 3
                </span>
              </div>
              <div className="pv-step-body" style={{ marginTop: 8, minHeight: 52 }}>
                {addStep === 0 ? (
                  <div className="row pref" style={{ padding: "6px 0" }}>
                    <div className="who">
                      <div className="name">{t("API key")}</div>
                      <div className="sub">sk-… · demo nested step 1</div>
                    </div>
                    <input className="words" placeholder="sk-…" style={{ minWidth: 140 }} />
                  </div>
                ) : null}
                {addStep === 1 ? (
                  <div className="row pref" style={{ padding: "6px 0" }}>
                    <div className="who">
                      <div className="name">{t("Base URL")}</div>
                      <div className="sub">https://api.example.com/v1</div>
                    </div>
                    <input className="words" defaultValue="https://api.anthropic.com" style={{ minWidth: 160 }} />
                  </div>
                ) : null}
                {addStep === 2 ? (
                  <div className="row pref" style={{ padding: "6px 0" }}>
                    <div className="who">
                      <div className="name">{t("Confirm models")}</div>
                      <div className="sub">claude-sonnet-4-5 · claude-haiku-4-5</div>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="bar" style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" className="text" disabled={addStep <= 0} onClick={() => setAddStep((s) => Math.max(0, s - 1))}>
                  {t("Back")}
                </button>
                <span className="grow" />
                {addStep < 2 ? (
                  <button type="button" className="text primary" onClick={() => setAddStep((s) => s + 1)}>
                    {t("Next step")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text primary"
                    onClick={() => {
                      setDemoProvs((list) => {
                        if (list.some((x) => x.id === "demo-nested")) return list;
                        return [
                          ...list,
                          {
                            id: "demo-nested",
                            name: "Nested demo",
                            icon: "generic",
                            accountsOpen: true,
                            modelsOpen: true,
                            accounts: [{ id: "n1", label: "sk-…nested" }],
                            models: ["claude-sonnet-4-5", "claude-haiku-4-5"],
                          },
                        ];
                      });
                      setAddStep(0);
                      onStatus(ZH.providerAddedDemo, "ok");
                    }}
                  >
                    {t("Save provider")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {importOpen ? (
        <ImportAppsModal onClose={() => setImportOpen(false)} />
      ) : null}
      {claudeFilePick ? (
        <div
          className="modal open"
          role="dialog"
          aria-modal="true"
          aria-label={t("Choose files…")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setClaudeFilePick(false);
          }}
        >
          <div
            className="dialog"
            style={{
              width: "min(560px, 92vw)",
              maxHeight: "min(480px, 82vh)",
              display: "flex",
              flexDirection: "column",
              animation: "pop-in .42s cubic-bezier(.16,1,.3,1)",
            }}
          >
            <div
              className="ebody"
              style={{
                display: "grid",
                gridTemplateColumns: "148px 1fr",
                gap: 0,
                minHeight: 300,
                padding: 0,
                flex: 1,
              }}
            >
              <nav
                style={{
                  borderRight: "1px solid var(--line)",
                  padding: "10px 8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {(
                  [
                    ["home", t("Home")],
                    ["desktop", t("Desktop")],
                    ["settings", "settings"],
                    ["other", t("Other Locations")],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className="text"
                    style={{
                      justifyContent: "flex-start",
                      padding: "7px 10px",
                      borderRadius: 8,
                      background:
                        claudeFileLoc === id ? "var(--accent-soft, #dbe4ff)" : "transparent",
                      color: claudeFileLoc === id ? "var(--accent)" : "var(--fg)",
                      fontWeight: claudeFileLoc === id ? 600 : 450,
                    }}
                    onClick={() => setClaudeFileLoc(id)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              <div
                style={{
                  padding: 12,
                  overflow: "auto",
                  border: "1px dashed color-mix(in srgb, var(--line) 80%, transparent)",
                  margin: 10,
                  borderRadius: 8,
                  minHeight: 220,
                }}
              >
                <p
                  style={{
                    color: "var(--muted)",
                    fontSize: 12.5,
                    textAlign: "center",
                    padding: "48px 12px",
                    margin: 0,
                  }}
                >
                  {demoCopy("此文件夹为空", "This folder is empty")}
                </p>
              </div>
            </div>
            <div
              className="bar"
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                padding: "10px 14px",
              }}
            >
              <button
                type="button"
                className="text"
                onClick={() => setClaudeFilePick(false)}
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                className="text primary"
                disabled
                title={demoCopy("演示：未选文件时 Open 禁用", "Demo: Open disabled with no selection")}
              >
                {t("Open")}
              </button>
              <button
                type="button"
                className="text"
                onClick={() => {
                  /* mock pick a credentials file for demo import ready */
                  if (claudeSign?.state === "import") {
                    setClaudeSign({
                      state: "import",
                      text: claudeSign.text,
                      files: [
                        {
                          name: ".credentials.json",
                          text: '{"demo":true}',
                        },
                      ],
                    });
                  }
                  setClaudeFilePick(false);
                }}
              >
                {demoCopy("演示选用示例", "Demo pick sample")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {editor ? (
        <ProviderEditorModal
          state={editor}
          onClose={() => setEditor(null)}
          onAdd={() => {
            if (editor) {
              setDemoProvs((list) => {
                if (list.some((x) => x.id === editor.id)) return list;
                return [
                  ...list,
                  {
                    id: editor.id,
                    name: editor.name,
                    icon: editor.icon,
                    accountsOpen: false,
                    modelsOpen: true,
                    accounts: [{ id: "a1", label: "default" }],
                    models: ["model-a", "model-b"],
                  },
                ];
              });
            }
            onStatus(ZH.providerAddedDemo, "ok");
          }}
        />
      ) : null}
    </>
  );
}
