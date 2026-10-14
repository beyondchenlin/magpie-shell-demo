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
import { ProtoMultiMenu } from "../components/ProtoMultiMenu";

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

/** Magpie extraBodyEditor placeholder (NOTES 12) — draft starts empty. */
const EXTRA_BODY_PLACEHOLDER = '{\n  "prompt_cache_key": "${sessionId}"\n}';

const CTX_CHIPS = ["128K", "200K", "256K", "400K", "512K", "1M"];
const OUT_CHIPS = ["8K", "16K", "32K", "64K", "128K"];

const IMPORT_APPS = [
  {
    id: "alma",
    name: "Alma",
    icon: "app-alma.png",
    /** Magpie importapps.go almaPath + NOTES 20 */
    path: "~/.config/alma/chat_threads.db",
  },
  {
    id: "cc-switch",
    name: "CC Switch",
    icon: "app-cc-switch.png",
    /** Magpie ccSwitchPath default when missing */
    path: "~/.cc-switch/cc-switch.db",
  },
  {
    id: "claude-code",
    name: "Claude Code",
    icon: "claudecode-color.svg",
    /** Magpie claudeSettingsPath */
    path: "~/.claude/settings.json",
  },
  {
    id: "codex",
    name: "Codex",
    icon: "codex-color.svg",
    /** Magpie codexConfigPath + NOTES 21 */
    path: "~/.codex/config.toml",
  },
] as const;

/** Magpie tile titles: host(s) on hover (shots 29, 31). */
const VENDOR_HOST: Record<string, string> = {
  anthropic: "api.anthropic.com",
  openai: "api.openai.com",
  google: "generativelanguage.googleapis.com",
  vertex: "aiplatform.googleapis.com",
  deepseek: "api.deepseek.com",
  xai: "api.x.ai",
  moonshot: "Global api.moonshot.ai\nChina api.moonshot.cn",
  "kimi-code": "Global api.moonshot.ai\nChina api.moonshot.cn",
  zhipu: "open.bigmodel.cn",
  zai: "api.z.ai",
  minimax: "api.minimax.io",
  stepfun: "api.stepfun.com",
  "xiaomi-mimo": "api.xiaomimimo.com",
  qianfan: "Token Plan · pay as you go\nqianfan.baidubce.com",
  tencent: "api.lkeap.cloud.tencent.com",
  huawei: "api.modelarts.huaweicloud.com",
};

const REGION_VENDORS = new Set(["moonshot", "moonshot-cn", "kimi-code", "kimi-code-cn"]);

/** Magpie KindLocal presets (presets.go) — editors not opened in NOTES; chip from source. */
const LOCAL_PRESETS: Record<
  string,
  { address: string; note: string; site: string }
> = {
  ollama: {
    address: "http://localhost:11434",
    note: "your local models",
    site: "ollama.com",
  },
  lmstudio: {
    address: "http://localhost:1234",
    note: "local server, port 1234 by default",
    site: "lmstudio.ai",
  },
  omlx: {
    address: "http://localhost:8000",
    note: "local server, port 8000 by default",
    site: "omlx.ai",
  },
  "mlx-serve": {
    address: "http://localhost:11234",
    note: "local server, port 11234 by default",
    site: "github.com",
  },
};


type EditorForm =
  | "anthropic"
  | "openrouter"
  | "ollama" /* legacy alias → local */
  | "local"
  | "remote"
  | "vertex"
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
  tip,
}: {
  id: string;
  name: string;
  icon: string;
  onPick: (id: string) => void;
  on?: boolean;
  tip?: string;
}) {
  return (
    <button
      type="button"
      className={`tile${on ? " on" : ""}`}
      data-pick={id}
      title={tip || name}
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

/** Magpie copyBtn beside .devcode / .signlink — flash .done ~1.2s */
function SignCopy({
  text,
  what,
  onStatus,
}: {
  text: string;
  what: string;
  onStatus: (msg: string, kind?: string) => void;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`copy${done ? " done" : ""}`}
      title={t("Copy")}
      aria-label={t("Copy")}
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard?.writeText(text).catch(() => {});
        setDone(true);
        window.setTimeout(() => setDone(false), 1200);
        onStatus(t("{what} copied", { what }), "ok");
      }}
    >
      <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden>
        <rect x="5.5" y="5.5" width="7" height="7" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3.5 10.5v-7A1.5 1.5 0 0 1 5 2h7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}

const GHE_HOST = /^(https?:\/\/)?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.ghe\.com\/?$/i;

/** Magpie pairTile tooltip: Global/China hosts on two lines (shot 31). */
function pairHostTip(pr: Preset, cn: Preset | undefined): string {
  if (!cn) return VENDOR_HOST[pr.id] || pr.name;
  const PAIR_HOST: Record<string, [string, string]> = {
    moonshot: ["api.moonshot.ai", "api.moonshot.cn"],
    "kimi-code": ["api.moonshot.ai", "api.moonshot.cn"],
    minimax: ["api.minimax.io", "api.minimaxi.com"],
    stepfun: ["api.stepfun.com", "api.stepfun.cn"],
    qwen: ["dashscope-intl.aliyuncs.com", "dashscope.aliyuncs.com"],
  };
  const hosts = PAIR_HOST[pr.id];
  if (hosts) return t("Global") + " " + hosts[0] + "\n" + t("China") + " " + hosts[1];
  const g =
    (VENDOR_HOST[pr.id] || pr.name).split("\n")[0]?.replace(/^Global |^China /, "") || pr.name;
  const c =
    (VENDOR_HOST[cn.id] || cn.name).split("\n")[0]?.replace(/^Global |^China /, "") || cn.name;
  return t("Global") + " " + g + "\n" + t("China") + " " + c;
}

/** Demo device code — not from a live GitHub OAuth (mock only). */
const DEMO_COPILOT_CODE = "WXYZ-9K2M";
const DEMO_COPILOT_URL = "https://github.com/login/device";

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
  options: { v: string; label: string; title?: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="segs">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          className={`opt${value === o.v ? " on" : ""}`}
          title={o.title}
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
  /** Magpie renderImportApps: every tab Not found · count – · Import disabled (NOTES 20–21). */
  const miss = t("Not found on this computer");

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
            <b id="modalTitle">{t("Import from other apps")}</b>
          </div>
          <div className="ebody">
            <div className="appnote">
              {t(
                "magpie reads these apps' settings and changes nothing in them. Pick the providers to bring over.",
              )}
            </div>
            <div className="apptabs" role="tablist">
              {IMPORT_APPS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="tab"
                  className={`apptab missing${tab === a.id ? " on" : ""}`}
                  aria-selected={tab === a.id}
                  title={miss}
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
                <div className="appempty">{miss}</div>
              </div>
            </div>
          </div>
          <div className="bar">
            <span className="note grow" />
            <button type="button" className="text" onClick={close}>
              {t("Cancel")}
            </button>
            <button type="button" className="text primary" disabled>
              {t("Import")}
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
  onStatus?: (msg: string, kind?: string) => void;
};

function ProviderEditorModal({ state, onClose, onAdd, onStatus }: EditorProps) {
  const kind = state.form;
  const isLocal = kind === "local" || kind === "ollama" || !!LOCAL_PRESETS[state.id];
  const localMeta = LOCAL_PRESETS[state.id] || LOCAL_PRESETS.ollama;
  const { modalRef, dialogRef, close } = useModalAnim(true, onClose);
  const [showKey, setShowKey] = useState(false);
  const [tryModel, setTryModel] = useState("");
  const [detectHint, setDetectHint] = useState("");
  const [detectBusy, setDetectBusy] = useState(false);
  /** Magpie detect-out: say / asking / none / results (shell only — no real probe). */
  type DetectRow = {
    protocol: string;
    label: string;
    base: string;
    ok: boolean;
    ms?: number;
    error?: string;
    errorTitle?: string;
  };
  type DetectGridModel = {
    model: string;
    cells: { protocol: string; label: string; ok: boolean; ms?: number; error?: string }[];
  };
  type DetectView =
    | null
    | { mode: "say"; text: string; tone: "warn" | "err" }
    | { mode: "asking" }
    | { mode: "none"; keyless: boolean }
    | { mode: "results"; rows: DetectRow[]; taken: boolean; keyless?: boolean }
    /** Magpie Each-picked success: Model × API grid (NOTES 07 empty-warn is decide path). */
    | {
        mode: "grid";
        rows: DetectRow[];
        models: DetectGridModel[];
        asked: { protocol: string; label: string }[];
        taken: boolean;
        truncated?: { n: number; all: number };
        keyless?: boolean;
      };
  const [detectView, setDetectView] = useState<DetectView>(null);
  const [modelIds, setModelIds] = useState("");
  const [fetchBusy, setFetchBusy] = useState(false);
  type FetchView =
    | null
    | { mode: "asking" }
    | { mode: "empty" }
    | { mode: "err"; text: string }
    | { mode: "list"; models: { id: string; name?: string }[]; filter: string; picked: string[] };
  const [fetchView, setFetchView] = useState<FetchView>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [epChat, setEpChat] = useState("");
  const [epAnthropic, setEpAnthropic] = useState("");
  const [epResponses, setEpResponses] = useState("");
  const [epGemini, setEpGemini] = useState("");
  const [modelsURL, setModelsURL] = useState("");
  const [catalog, setCatalog] = useState("");
  const [balanceURL, setBalanceURL] = useState("");
  const [balancePath, setBalancePath] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  type EpTest = { protocol: string; label: string; url: string; status: "idle" | "wait" | "ok" | "bad"; text: string };
  const [epTests, setEpTests] = useState<EpTest[]>([]);
  const [epTestBusy, setEpTestBusy] = useState(false);
  const [iconsOpen, setIconsOpen] = useState(false);
  const [iconQ, setIconQ] = useState("");
  const [pickedIcon, setPickedIcon] = useState(state.icon || "aside");
  const [hdrs, setHdrs] = useState<{ name: string; value: string; json?: boolean }[]>([{ name: "", value: "" }]);
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
  const [extra, setExtra] = useState("");
  const [addrOpen, setAddrOpen] = useState(false);
  const [serverAddr, setServerAddr] = useState(localMeta.address);
  const [unmasked, setUnmasked] = useState(false);

  const [proxyUrl, setProxyUrl] = useState("http://127.0.0.1:7890");
  const [region, setRegion] = useState(
    state.id.endsWith("-cn") ? "china" : "global",
  );
  const [vxProject, setVxProject] = useState("");
  const [vxLoc, setVxLoc] = useState("global");
  const [vxCred, setVxCred] = useState("");
  const [vxImp, setVxImp] = useState("");
  const dirty =
    !!(
      name.trim() ||
      baseUrl.trim() ||
      key.trim() ||
      tryModel.trim() ||
      endpoint.trim() ||
      vxProject.trim() ||
      vxCred.trim() ||
      vxImp.trim() ||
      (isLocal && serverAddr.trim() !== localMeta.address) ||
      unmasked ||
      proxy === "direct" ||
      proxy === "custom" ||
      extra.trim() ||
      hdrs.some((h) => h.name || h.value)
    );
  /* Region switch alone is NOT dirty (native NOTES shot 32). */
  const requestClose = () => {
    /* Magpie: Cancel on dirty editor → Discard (shot 28 Gemini) */
    if (dirty) setDiscardOpen(true);
    else close();
  };

  const regionTitle =
    REGION_VENDORS.has(state.id) && region === "china"
      ? state.name.replace(/ \(China\)$/, "") + " (China)"
      : REGION_VENDORS.has(state.id)
        ? state.name.replace(/ \(China\)$/, "")
        : state.name;
  const regionSite =
    REGION_VENDORS.has(state.id) && region === "china"
      ? "platform.moonshot.cn"
      : REGION_VENDORS.has(state.id)
        ? "platform.moonshot.ai"
        : state.site || "";
  const meta = {
    title: kind === "vertex" ? "Google Vertex AI" : regionTitle,
    icon: state.icon,
    site:
      kind === "vertex"
        ? "docs.cloud.google.com"
        : kind === "remote"
          ? ""
          : regionSite || state.site || "",
    note:
      kind === "vertex"
        ? t("your Google Cloud project, with gcloud's sign-in")
        : kind === "remote"
          ? t("another computer's magpie, shared on its network")
          : isLocal
            ? t(localMeta.note)
            : state.note || (state.id === "google" ? "Gemini Developer API" : ""),
    keyPh: isLocal
      ? t("optional for local servers")
      : ZH.pasteKey,
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
            {REGION_VENDORS.has(state.id) ? (
              <Field
                label={t("Region")}
                hint={t("which endpoint {p} is reached through", {
                  p: state.name.replace(/ \(China\)$/, ""),
                })}
              >
                <Segs
                  value={region}
                  onChange={setRegion}
                  options={[
                    {
                      v: "global",
                      label: t("Global"),
                      title: "api.moonshot.ai",
                    },
                    {
                      v: "china",
                      label: t("China"),
                      title: "api.moonshot.cn",
                    },
                  ]}
                />
              </Field>
            ) : null}

            {kind === "vertex" ? (
              <>
                <Field
                  label={t("Project ID")}
                  hint={t(
                    "Your Google Cloud project, with the Agent Platform API (aiplatform.googleapis.com) enabled: requests are made, and billed, there",
                  )}
                >
                  <input
                    type="text"
                    placeholder="my-project-123"
                    value={vxProject}
                    onChange={(e) => setVxProject(e.target.value)}
                  />
                </Field>
                <Field
                  label={t("Location")}
                  hint={t(
                    "global, us, eu or a region such as us-central1. Each location serves its own models; global serves them all.",
                  )}
                >
                  <input
                    type="text"
                    placeholder="global"
                    value={vxLoc}
                    onChange={(e) => setVxLoc(e.target.value)}
                  />
                </Field>
                <Field
                  label={t("Credentials file")}
                  hint={t(
                    "Optional. Left empty, gcloud's Application Default Credentials are used (gcloud auth application-default login), or the file GOOGLE_APPLICATION_CREDENTIALS names. A service account's key file works too.",
                  )}
                >
                  <input
                    type="text"
                    placeholder="~/.config/gcloud/application_default_credentials.json"
                    value={vxCred}
                    onChange={(e) => setVxCred(e.target.value)}
                  />
                </Field>
                <Field
                  label={t("Service account")}
                  hint={t(
                    "Requests are then made as this service account, impersonated with the credentials above: their account needs roles/iam.serviceAccountTokenCreator on it.",
                  )}
                >
                  <input
                    type="text"
                    placeholder={t("optional · a service account's email")}
                    value={vxImp}
                    onChange={(e) => setVxImp(e.target.value)}
                  />
                </Field>
              </>
            ) : null}

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
                      setDetectView(null);
                    }}
                    options={[
                      { v: "openai", label: ZH.openaiCompat, title: t(API_HINTS.openai) },
                      { v: "responses", label: ZH.openaiResponses, title: t(API_HINTS.responses) },
                      { v: "anthropic", label: ZH.anthropicCompat, title: t(API_HINTS.anthropic) },
                      { v: "gemini", label: ZH.geminiCompat, title: t(API_HINTS.gemini) },
                      { v: "decide", label: ZH.systemOne, title: t(API_HINTS.decide) },
                    ]}
                  />
                  <input
                    className="base-url"
                    type="url"
                    placeholder={
                      api === "anthropic"
                        ? "https://…"
                        : api === "gemini"
                          ? "https://…/v1beta"
                          : "https://…/v1"
                    }
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    title={t(API_HINTS[api]) || API_HINTS[api] || ""}
                  />
                  <div className="detect">
                    <div className="detect-row">
                      <button
                        type="button"
                        className={`text action${detectBusy ? " busy" : ""}`}
                        title={t(
                          "Send the smallest request to each API (OpenAI chat completions, Responses, Anthropic messages, Gemini generateContent) at this URL, to see which answer",
                        )}
                        disabled={detectBusy}
                        onClick={() => {
                          const base = baseUrl.trim();
                          if (!base) {
                            // 45: amber under buttons — Magpie detect-say warn
                            setDetectView({
                              mode: "say",
                              text: t("Type the base URL first"),
                              tone: "warn",
                            });
                            setDetectHint("");
                            return;
                          }
                          // 47/49: Asking replaces prior tip/rows
                          setDetectBusy(true);
                          setDetectHint("");
                          setDetectView({ mode: "asking" });
                          const model = tryModel.trim();
                          window.setTimeout(() => {
                            setDetectBusy(false);
                            const root = base.replace(/\/+$/, "");
                            const hostPort = (() => {
                              try {
                                const u = new URL(root);
                                return u.host || root;
                              } catch {
                                return root.replace(/^https?:\/\//, "");
                              }
                            })();
                            // Magpie DetectBase per proto from typed URL (demo: same root shown truncated)
                            const bases = {
                              openai: root,
                              responses: root,
                              anthropic: root,
                              gemini: root,
                            };
                            const labels: { protocol: string; label: string }[] = [
                              { protocol: "openai", label: "OpenAI" },
                              { protocol: "responses", label: "Responses" },
                              { protocol: "anthropic", label: "Anthropic" },
                              { protocol: "gemini", label: "Gemini" },
                            ];
                            // 48: no model → each row "no model to try…"; 50: model set → dial tcp refused
                            const refusedFull = `dial tcp ${hostPort}: connect: connection refused`;
                            // native truncates mid-word: "connection refu…"
                            const refusedNative = `dial tcp ${hostPort}: connect: connection refu…`;
                            const errText = model
                              ? refusedNative
                              : t("no model to try: type one the vendor serves");
                            const errTitle = model ? refusedFull : errText;
                            const rows = labels.map((x) => ({
                              protocol: x.protocol,
                              label: x.label,
                              base: bases[x.protocol as keyof typeof bases],
                              ok: false,
                              error: errText,
                              errorTitle: errTitle,
                            }));
                            setDetectView({
                              mode: "results",
                              taken: false,
                              rows,
                              keyless: !key.trim(),
                            });
                          }, model ? 280 : 160);
                        }}
                      >
                        {detectBusy ? "…" : t("Detect APIs")}
                      </button>
                      <input
                        type="text"
                        className="detect-model"
                        placeholder={t("model to try · empty picks one from the vendor's list")}
                        value={tryModel}
                        onChange={(e) => setTryModel(e.target.value)}
                      />
                      <button
                        type="button"
                        className="text action detect-each"
                        title={t(
                          "Ask every model picked below on each API, to see which API serves which model (up to {n}, a few at a time)",
                          { n: 30 },
                        )}
                        disabled={detectBusy}
                        onClick={() => {
                          // Magpie each.onclick: System One first (NOTES 07)
                          if (api === "decide") {
                            setDetectView({
                              mode: "say",
                              text: t(
                                "A decision API is asked with one model: type it and press Detect APIs",
                              ),
                              tone: "warn",
                            });
                            return;
                          }
                          // Magpie picked(): Models field + fetch chips only (not model-to-try)
                          // typedIds: split at commas/newlines only (#1976 space in id)
                          const typed = modelIds
                            .split(/[,\n]/)
                            .map((s) => s.trim())
                            .filter(Boolean);
                          const ids = [
                            ...new Set([
                              ...typed,
                              ...(fetchView?.mode === "list" ? fetchView.picked : []),
                            ]),
                          ];
                          if (!ids.length) {
                            setDetectView({
                              mode: "say",
                              text: t("Pick models first, or type one and press Detect APIs"),
                              tone: "warn",
                            });
                            return;
                          }
                          const base = baseUrl.trim();
                          if (!base) {
                            setDetectView({
                              mode: "say",
                              text: t("Type the base URL first"),
                              tone: "warn",
                            });
                            return;
                          }
                          setDetectBusy(true);
                          setDetectView({ mode: "asking" });
                          window.setTimeout(() => {
                            setDetectBusy(false);
                            if (!key.trim()) {
                              setDetectView({ mode: "none", keyless: true });
                              return;
                            }
                            const asked = [
                              { protocol: "openai", label: "OpenAI" },
                              { protocol: "responses", label: "Responses" },
                            ];
                            const rows: DetectRow[] = asked.map((a, i) => ({
                              protocol: a.protocol,
                              label: a.label,
                              base,
                              ok: i === 0,
                              ms: i === 0 ? 38 : undefined,
                              error: i === 0 ? undefined : "404",
                            }));
                            const cap = 30;
                            const shown = ids.slice(0, cap);
                            const models = shown.map((model, mi) => ({
                              model,
                              cells: asked.map((a, ai) => ({
                                protocol: a.protocol,
                                label: a.label,
                                ok: ai === 0 && mi % 2 === 0,
                                ms: ai === 0 && mi % 2 === 0 ? 40 + mi : undefined,
                                error: ai === 0 && mi % 2 === 0 ? undefined : "404",
                              })),
                            }));
                            setDetectView({
                              mode: "grid",
                              rows,
                              models,
                              asked,
                              taken: false,
                              truncated:
                                ids.length > shown.length
                                  ? { n: shown.length, all: ids.length }
                                  : undefined,
                            });
                          }, 420);
                        }}
                      >
                        {t("Each picked model")}
                      </button>
                    </div>
                    {detectView ? (
                      <div className="eps detect-out">
                        {detectView.mode === "say" ? (
                          <span className={`hint detect-say ${detectView.tone}`}>{detectView.text}</span>
                        ) : null}
                        {detectView.mode === "asking" ? (
                          <span className="hint">{t("Asking each API…")}</span>
                        ) : null}
                        {detectView.mode === "none" ? (
                          <span className="hint">
                            {detectView.keyless
                              ? t(
                                  "None answered, and no API key is typed: paste the key under API key and detect again",
                                )
                              : t(
                                  "None answered: check the URL and the key, or type a model the vendor serves",
                                )}
                          </span>
                        ) : null}
                        {detectView.mode === "results" ? (
                          <>
                            {detectView.rows.map((r) => (
                              <div className="ep" key={r.protocol} data-api={r.protocol}>
                                <span className="pl" title={r.label}>
                                  {r.label}
                                </span>
                                <code>{r.base || "—"}</code>
                                <span
                                  className={`res ${r.ok ? "ok" : "bad"}`}
                                  title={
                                    r.ok
                                      ? r.ms != null
                                        ? `${r.ms} ms`
                                        : "ok"
                                      : r.errorTitle || r.error || ""
                                  }
                                >
                                  <svg viewBox="0 0 12 12" width={10} height={10} aria-hidden>
                                    {r.ok ? (
                                      <path
                                        d="M2.5 6.2 5 8.7 9.5 3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    ) : (
                                      <path
                                        d="M3.5 3.5 8.5 8.5M8.5 3.5 3.5 8.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                      />
                                    )}
                                  </svg>
                                  <span>
                                    {r.ok
                                      ? r.ms != null
                                        ? `${r.ms} ms`
                                        : "ok"
                                      : r.error || "—"}
                                  </span>
                                </span>
                              </div>
                            ))}
                            <div className="detect-acts">
                              {detectView.rows.some((r) => r.ok) ? (
                                <button
                                  type="button"
                                  className="text action"
                                  disabled={detectView.taken}
                                  title={t(
                                    "Set the URLs of the APIs that answered; one not found there is cleared",
                                  )}
                                  onClick={() => {
                                    const ok = detectView.rows.find((r) => r.ok);
                                    if (ok?.protocol === "responses") setApi("responses");
                                    else if (ok?.protocol === "anthropic") setApi("anthropic");
                                    else if (ok?.protocol === "gemini") setApi("gemini");
                                    else setApi("openai");
                                    setDetectView({ ...detectView, taken: true });
                                  }}
                                >
                                  {detectView.taken
                                    ? t("Taken · save to keep")
                                    : t("Use these")}
                                </button>
                              ) : (
                                <span className="hint">
                                  {detectView.keyless || !key.trim()
                                    ? t(
                                        "None answered, and no API key is typed: paste the key under API key and detect again",
                                      )
                                    : t(
                                        "None answered: check the URL and the key, or type a model the vendor serves",
                                      )}
                                </span>
                              )}
                            </div>
                          </>
                        ) : null}
                        {detectView.mode === "grid" ? (
                          <>
                            {detectView.rows.map((r) => (
                              <div className="ep" key={r.protocol} data-api={r.protocol}>
                                <span className="pl" title={r.label}>
                                  {r.label}
                                </span>
                                <code>{r.base || "—"}</code>
                                <span className={`res ${r.ok ? "ok" : "bad"}`}>
                                  <svg viewBox="0 0 12 12" width={10} height={10} aria-hidden>
                                    {r.ok ? (
                                      <path
                                        d="M2.5 6.2 5 8.7 9.5 3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    ) : (
                                      <path
                                        d="M3.5 3.5 8.5 8.5M8.5 3.5 3.5 8.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                      />
                                    )}
                                  </svg>
                                  <span>
                                    {r.ok ? (r.ms != null ? `${r.ms} ms` : "ok") : r.error || "—"}
                                  </span>
                                </span>
                              </div>
                            ))}
                            <div
                              className="detect-grid"
                              style={{
                                gridTemplateColumns: `minmax(0, 1.3fr) repeat(${detectView.asked.length}, minmax(0, 1fr))`,
                              }}
                            >
                              <span className="dg-head">{t("Model")}</span>
                              {detectView.asked.map((a) => (
                                <span className="dg-head" key={a.protocol}>
                                  {a.label}
                                </span>
                              ))}
                              {detectView.models.map((md) => (
                                <div key={md.model} style={{ display: "contents" }}>
                                  <code className="dg-model" title={md.model}>
                                    {md.model}
                                  </code>
                                  {md.cells.map((c) => (
                                    <span
                                      key={c.protocol}
                                      className={`dg-cell ${c.ok ? "ok" : "bad"}`}
                                      title={`${md.model} · ${c.label}\n${
                                        c.ok
                                          ? t("Answered in {took}", {
                                              took: c.ms != null ? `${c.ms} ms` : "ok",
                                            })
                                          : c.error || ""
                                      }`}
                                    >
                                      <svg viewBox="0 0 12 12" width={10} height={10} aria-hidden>
                                        {c.ok ? (
                                          <path
                                            d="M2.5 6.2 5 8.7 9.5 3.5"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        ) : (
                                          <path
                                            d="M3.5 3.5 8.5 8.5M8.5 3.5 3.5 8.5"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                          />
                                        )}
                                      </svg>
                                      <span>
                                        {c.ok
                                          ? c.ms != null
                                            ? `${c.ms} ms`
                                            : "ok"
                                          : c.error || "—"}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              ))}
                            </div>
                            {detectView.truncated ? (
                              <span className="hint">
                                {t("Only the first {n} of {all} models were asked", {
                                  n: detectView.truncated.n,
                                  all: detectView.truncated.all,
                                })}
                              </span>
                            ) : null}
                            <div className="detect-acts">
                              {detectView.rows.some((r) => r.ok) ? (
                                <button
                                  type="button"
                                  className="text action"
                                  disabled={detectView.taken}
                                  title={t(
                                    "Set the URLs of the APIs that answered; one not found there is cleared",
                                  )}
                                  onClick={() => {
                                    const ok = detectView.rows.find((r) => r.ok);
                                    if (ok?.protocol === "responses") setApi("responses");
                                    else if (ok?.protocol === "anthropic") setApi("anthropic");
                                    else if (ok?.protocol === "gemini") setApi("gemini");
                                    else setApi("openai");
                                    setDetectView({ ...detectView, taken: true });
                                  }}
                                >
                                  {detectView.taken
                                    ? t("Taken · save to keep")
                                    : t("Use these")}
                                </button>
                              ) : (
                                <span className="hint">
                                  {detectView.keyless || !key.trim()
                                    ? t(
                                        "None answered, and no API key is typed: paste the key under API key and detect again",
                                      )
                                    : t(
                                        "None answered: check the URL and the key, or type a model the vendor serves",
                                      )}
                                </span>
                              )}
                            </div>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                    {/* favicon / file-picker demo hints still use detectHint */}
                    {detectHint ? (
                      <div
                        className="hint"
                        style={{
                          color:
                            detectHint.includes("base URL first") ||
                            detectHint.includes("先填写") ||
                            detectHint.includes("type the provider")
                              ? "var(--red)"
                              : "var(--muted)",
                          fontSize: 11.5,
                          animation: "fade-in .15s var(--ease)",
                        }}
                      >
                        {detectHint}
                      </div>
                    ) : null}
                  </div>
                </div>
              </Field>
            ) : null}

            {kind === "remote" ? (
              <Field
                label={t("Endpoint")}
                hint={t(
                  "The address and API key the other computer's magpie shows in Settings, under Share on local network. Its models and routing groups are listed here; each request goes on in the API the agent spoke.",
                )}
              >
                <input
                  type="url"
                  placeholder="http://192.168.1.20:3425"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                />
              </Field>
            ) : null}

            {kind !== "vertex" ? (
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
                    {kind !== "remote" && !isLocal ? (
                      <button type="button" className="link" tabIndex={-1}>
                        {ZH.getKey}
                      </button>
                    ) : null}
                  </div>
                </div>
              </Field>
            ) : null}

            {isLocal ? (
              <details
                className="more"
                open={addrOpen || serverAddr.trim() !== localMeta.address}
                onToggle={(e) => setAddrOpen(e.currentTarget.open)}
              >
                <summary>{t("Server address")}</summary>
                <div className="inner">
                  <Field
                    label={t("Address")}
                    hint={t(
                      "Where the server listens; change the port, or give another computer's address",
                    )}
                  >
                    <input
                      className="address"
                      type="url"
                      inputMode="url"
                      placeholder={localMeta.address}
                      value={serverAddr}
                      onChange={(e) => setServerAddr(e.target.value)}
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

            <Field
              label={ZH.headers}
              hint={
                kind === "custom"
                  ? t(
                      "Extra HTTP headers sent to the vendor, applied after auth. For gateways that need a private scheme.",
                    )
                  : t("Optional headers sent with every request to {p}, applied after auth.", {
                      p: meta.title,
                    })
              }
            >
              {kind === "custom" ? (
                <div className="stack headers" style={{ gap: 6 }}>
                  {hdrs.map((h, i) => (
                    <div
                      key={i}
                      className={`pair${h.json ? " col" : ""}`}
                      style={
                        h.json
                          ? { gap: 6, flexDirection: "column", alignItems: "stretch" }
                          : { gap: 6 }
                      }
                    >
                      <div className="pair" style={{ gap: 6, width: "100%" }}>
                        <input
                          type="text"
                          placeholder={t("Header-Name")}
                          value={h.name}
                          onChange={(e) =>
                            setHdrs((rows) =>
                              rows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)),
                            )
                          }
                        />
                        {!h.json ? (
                          <input
                            type="text"
                            placeholder={t("value")}
                            value={h.value}
                            onChange={(e) =>
                              setHdrs((rows) =>
                                rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)),
                              )
                            }
                          />
                        ) : null}
                        <div className="side" style={{ display: "flex", gap: 4 }}>
                          <button
                            type="button"
                            className={`text${h.json ? " on" : ""}`}
                            title={h.json ? t("Collapse to one line") : t("Edit as JSON")}
                            onClick={() =>
                              setHdrs((rows) =>
                                rows.map((r, j) => {
                                  if (j !== i) return r;
                                  if (r.json) {
                                    /* minify: collapse whitespace like Magpie minifyJSON */
                                    let v = r.value;
                                    try {
                                      v = JSON.stringify(JSON.parse(r.value));
                                    } catch {
                                      v = r.value.replace(/\s+/g, " ").trim();
                                    }
                                    return { ...r, json: false, value: v };
                                  }
                                  let v = r.value;
                                  try {
                                    v = JSON.stringify(JSON.parse(r.value || "{}"), null, 2);
                                  } catch {
                                    /* keep as typed */
                                  }
                                  return { ...r, json: true, value: v };
                                }),
                              )
                            }
                          >
                            {"{ }"}
                          </button>
                          <button
                            type="button"
                            className="text danger"
                            title={t("Remove header")}
                            aria-label="Remove"
                            onClick={() =>
                              setHdrs((rows) =>
                                rows.length <= 1
                                  ? [{ name: "", value: "" }]
                                  : rows.filter((_, j) => j !== i),
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      {h.json ? (
                        <textarea
                          className="json"
                          rows={Math.min(16, Math.max(4, (h.value || "").split("\n").length))}
                          placeholder={t("value")}
                          value={h.value}
                          spellCheck={false}
                          wrap="off"
                          onChange={(e) =>
                            setHdrs((rows) =>
                              rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)),
                            )
                          }
                          style={{ width: "100%", fontFamily: "var(--code-font, ui-monospace, monospace)", fontSize: 12 }}
                        />
                      ) : null}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text"
                    onClick={() => setHdrs((rows) => [...rows, { name: "", value: "" }])}
                  >
                    {t("+ Add header")}
                  </button>
                </div>
              ) : (
                <div className="stack" style={{ gap: 4 }}>
                  <button type="button" className="text">
                    {t("+ Add header")}
                  </button>
                  {state.id === "vertex" ? (
                    <>
                      <button
                        type="button"
                        className="link"
                        onClick={() =>
                          setHdrs((rows) => [
                            ...rows.filter((r) => r.name || r.value),
                            { name: "X-Vertex-AI-LLM-Request-Type", value: "" },
                          ])
                        }
                      >
                        + X-Vertex-AI-LLM-Request-Type
                      </button>
                      <button
                        type="button"
                        className="link"
                        onClick={() =>
                          setHdrs((rows) => [
                            ...rows.filter((r) => r.name || r.value),
                            {
                              name: "X-Vertex-AI-LLM-Shared-Request-Type",
                              value: "",
                            },
                          ])
                        }
                      >
                        + X-Vertex-AI-LLM-Shared-Request-Type
                      </button>
                    </>
                  ) : null}
                </div>
              )}
            </Field>


                        <Field label={ZH.extraBody} hint={t("JSON fields added to the body of every request to the vendor. A field the request has already is kept; write '!name' to replace it. ${sessionId} is the conversation's id.")}>
              <div className="extra-body">
                <textarea
                  className="json"
                  rows={3}
                  value={extra}
                  placeholder={EXTRA_BODY_PLACEHOLDER}
                  onChange={(e) => setExtra(e.target.value)}
                  spellCheck={false}
                  wrap="off"
                />
              </div>
            </Field>

            <Field
              label={t("Proxy")}
              hint={
                proxy === "custom"
                  ? t(
                      "Requests to it go through this proxy: http://, https:// or socks5://",
                    )
                  : proxy === "direct"
                    ? t("Requests to it go direct, whatever the proxy in Settings")
                    : t("Follows the proxy in Settings")
              }
            >
              <div className="pair" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Segs
                  value={proxy}
                  onChange={setProxy}
                  options={[
                    { v: "", label: t("Global proxy") },
                    { v: "direct", label: t("Direct") },
                    { v: "custom", label: t("Custom") },
                  ]}
                />
                {proxy === "custom" ? (
                  <input
                    type="url"
                    placeholder="http://127.0.0.1:7890"
                    value={proxyUrl}
                    onChange={(e) => setProxyUrl(e.target.value)}
                    style={{ flex: 1, minWidth: 160, animation: "fade-in .2s var(--ease)" }}
                  />
                ) : null}
              </div>
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

            {kind === "openrouter" || isLocal || (kind === "custom" && api === "anthropic") ? (
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
            kind === "generic" ||
            isLocal ? (
              <>
                {isLocal || kind === "custom" || kind === "generic" || kind === "anthropic" || kind === "remote" ? (
                  <Field
                    label={t("User-Agent")}
                    hint={t(
                      "For a plan that serves only the coding agents it names: each request goes with the User-Agent the agent sent (pi, OpenCode, Claude Code…), not magpie's. Requests magpie makes itself, and ones the agent sent without one, still go as magpie. A User-Agent set in Headers above always wins.",
                    )}
                  >
                    <label className="tick" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <input type="checkbox" />
                      <span>{t("Send the agent's own User-Agent")}</span>
                    </label>
                  </Field>
                ) : null}
                {isLocal ? (
                  <Field
                    label={t("Redaction")}
                    hint={t(
                      "For a model running on this computer or your local network: secrets, personal data and your masked words go to it as written. Leave it off for a local relay or proxy that passes requests on to a vendor.",
                    )}
                  >
                    <label className="tick" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={unmasked}
                        onChange={(e) => setUnmasked(e.target.checked)}
                      />
                      <span>{t("Send requests unmasked")}</span>
                    </label>
                  </Field>
                ) : null}
                <Field
                  label={ZH.contextWindow}
                  hint={t(
                    "How long a request the models take, told to the agents; empty leaves it to the vendor and models.dev",
                  )}
                >
                  <input type="text" placeholder={t("e.g. 128k · or gpt-6=1m, comma separated")} />
                  <div className="chips" style={{ marginTop: 6 }}>
                    {CTX_CHIPS.map((c) => (
                      <button key={c} type="button" className="chip">
                        {c}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field
                  label={ZH.maxOutput}
                  hint={t(
                    "The most a reply may hold, told to the agents as their max tokens and sent as max_tokens on Anthropic's API when the agent names none; empty leaves it to the vendor and models.dev",
                  )}
                >
                  <input type="text" placeholder={t("e.g. 32k · or gpt-6=128k, comma separated")} />
                  <div className="chips" style={{ marginTop: 6 }}>
                    {OUT_CHIPS.map((c) => (
                      <button key={c} type="button" className="chip">
                        {c}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field
                  label={t("Compact at")}
                  hint={t(
                    "Where Codex and Claude Code compact a long conversation on these models; empty follows Settings → Long conversations, and a size at or above a model's window runs it to its whole window",
                  )}
                >
                  <input type="text" placeholder={t("e.g. 500k · or deepseek-v4-flash=272k, comma separated")} />
                  <div className="chips" style={{ marginTop: 6 }}>
                    {["128K", "200K", "272K", "500K", "1M"].map((c) => (
                      <button key={c} type="button" className="chip">
                        {c}
                      </button>
                    ))}
                  </div>
                </Field>

            {kind === "custom" ? (
              <Field
                label={t("Models")}
                hint={t(
                  "Optional: Fetch models to pick from the vendor's list, or type ids; none picked, magpie asks for the list after saving.",
                )}
              >
                <div className="stack add-models">
                  <div className="detect-row">
                    <input
                      type="text"
                      placeholder={t(
                        "model ids, comma separated · e.g. gpt-5.5, claude-sonnet-5",
                      )}
                      value={modelIds}
                      onChange={(e) => {
                        setModelIds(e.target.value);
                        if (fetchView?.mode === "list") {
                          /* keep chips; typed ids sync on fetch redraw */
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={`text action fetch-models${fetchBusy ? " busy" : ""}`}
                      title={t(
                        "Ask the vendor for its model list with the URL and key typed, to pick from; nothing is saved",
                      )}
                      disabled={fetchBusy}
                      onClick={() => {
                        if (!baseUrl.trim()) {
                          /* Magpie status(..., "warn") + .lift (shot 56): URL check, not key */
                          onStatus?.(t("Type the base URL first"), "warn");
                          return;
                        }
                        setFetchBusy(true);
                        setFetchView({ mode: "asking" });
                        const url = baseUrl.trim().replace(/\/+$/, "");
                        const listUrl = /\/models(?:\/|$)/i.test(url)
                          ? url
                          : `${url}/models`;
                        // Port-9 refuse matches native 57–58 (Asking… not visible at 30fps)
                        const refuse =
                          /127\.0\.0\.1:9\b/.test(url) ||
                          /localhost:9\b/.test(url);
                        window.setTimeout(() => {
                          setFetchBusy(false);
                          if (refuse) {
                            setFetchView({
                              mode: "err",
                              text: `no model list: Get "${listUrl}": dial tcp 127.0.0.1:9: connect: connection refused — type its model ids in by hand, or give the URL its list is at`,
                            });
                            return;
                          }
                          // Shell only when a reachable URL would list (no real vendor call)
                          const demo = [
                            { id: "gpt-4o-mini", name: "GPT-4o mini" },
                            { id: "gpt-4.1", name: "GPT-4.1" },
                            { id: "o4-mini", name: "o4-mini" },
                            { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
                          ];
                          const typed = modelIds
                            .split(/[,\s]+/)
                            .map((s) => s.trim())
                            .filter(Boolean);
                          setFetchView({
                            mode: "list",
                            models: demo,
                            filter: "",
                            picked: typed.filter((id) => demo.some((m) => m.id === id)),
                          });
                        }, refuse ? 40 : 520);
                      }}
                    >
                      {t("Fetch models")}
                    </button>
                  </div>
                  {fetchView ? (
                    <div className="models add-models-list">
                      {fetchView.mode === "asking" ? (
                        <span className="hint">{t("Asking the vendor…")}</span>
                      ) : null}
                      {fetchView.mode === "empty" ? (
                        <span className="hint">
                          {t("The vendor's list is empty. Type the model ids instead.")}
                        </span>
                      ) : null}
                      {fetchView.mode === "err" ? (
                        <span className="hint err">{fetchView.text}</span>
                      ) : null}
                      {fetchView.mode === "list" ? (
                        <>
                          {fetchView.models.length > 24 ? (
                            <input
                              className="add-models-filter"
                              type="text"
                              placeholder={t("filter {n} models…", {
                                n: fetchView.models.length,
                              })}
                              value={fetchView.filter}
                              onChange={(e) =>
                                setFetchView({ ...fetchView, filter: e.target.value })
                              }
                            />
                          ) : null}
                          <div className="detect-acts">
                            <span className="hint">
                              {t("{n} of {all} picked", {
                                n: fetchView.picked.length,
                                all: fetchView.models.length,
                              })}
                            </span>
                            <button
                              type="button"
                              className="text action"
                              onClick={() => {
                                const f = fetchView.filter.trim().toLowerCase();
                                const match = fetchView.models.filter(
                                  (m) =>
                                    !f ||
                                    m.id.toLowerCase().includes(f) ||
                                    (m.name || "").toLowerCase().includes(f),
                                );
                                const next = [
                                  ...new Set([
                                    ...fetchView.picked,
                                    ...match.map((m) => m.id),
                                  ]),
                                ];
                                setFetchView({ ...fetchView, picked: next });
                                setModelIds(next.join(", "));
                              }}
                            >
                              {t(fetchView.filter.trim() ? "Pick those shown" : "Pick all")}
                            </button>
                            <button
                              type="button"
                              className="text action"
                              onClick={() => {
                                setFetchView({ ...fetchView, picked: [] });
                                setModelIds("");
                              }}
                            >
                              {t("Pick none")}
                            </button>
                          </div>
                          <div className="mchips">
                            {(() => {
                              const f = fetchView.filter.trim().toLowerCase();
                              const match = fetchView.models.filter(
                                (m) =>
                                  !f ||
                                  m.id.toLowerCase().includes(f) ||
                                  (m.name || "").toLowerCase().includes(f),
                              );
                              if (f && !match.length) {
                                return (
                                  <span className="hint">
                                    {t('No model here matches “{q}”.', {
                                      q: fetchView.filter.trim(),
                                    })}
                                  </span>
                                );
                              }
                              return match.map((m) => {
                                const on = fetchView.picked.includes(m.id);
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    className={`mchip${on ? " on" : ""}`}
                                    title={m.name ? m.id : undefined}
                                    onClick={() => {
                                      const picked = on
                                        ? fetchView.picked.filter((x) => x !== m.id)
                                        : [...fetchView.picked, m.id];
                                      setFetchView({ ...fetchView, picked });
                                      setModelIds(picked.join(", "));
                                    }}
                                  >
                                    <span>{m.name || m.id}</span>
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </Field>
            ) : null}
              </>
            ) : null}
          </div>
            {kind === "custom" ? (
              <Field
                label={t("Web search")}
                hint={t(
                  "For a relay in front of Anthropic's or OpenAI's own API: Claude Code's WebSearch and Codex's web_search go to it as they were sent, not through magpie's search. magpie doesn't automatically search with it for other models, but you can name it as the searcher.",
                )}
              >
                <label className="tick" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={webSearch}
                    onChange={(e) => setWebSearch(e.target.checked)}
                  />
                  <span>{t("Searches the web by itself")}</span>
                </label>
              </Field>
            ) : null}

            {kind === "custom" ? (
              <details
                className="more"
                open={moreOpen}
                onToggle={(e) => setMoreOpen(e.currentTarget.open)}
              >
                <summary>{t("More endpoints")}</summary>
                <div className="inner" style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
                  {api !== "openai" ? (
                    <Field
                      label={t("OpenAI URL")}
                      hint={t("if the vendor also serves chat completions")}
                    >
                      <input
                        type="url"
                        placeholder="https://…/v1"
                        value={epChat}
                        onChange={(e) => setEpChat(e.target.value)}
                      />
                    </Field>
                  ) : null}
                  {api !== "anthropic" ? (
                    <Field
                      label={t("Anthropic URL")}
                      hint={t("if the vendor also serves Anthropic messages")}
                    >
                      <input
                        type="url"
                        placeholder="https://…"
                        value={epAnthropic}
                        onChange={(e) => setEpAnthropic(e.target.value)}
                      />
                    </Field>
                  ) : null}
                  {api !== "responses" ? (
                    <Field
                      label={t("Responses URL")}
                      hint={t(
                        "if the vendor serves the OpenAI Responses API (Codex uses it natively)",
                      )}
                    >
                      <input
                        type="url"
                        placeholder="https://…/v1"
                        value={epResponses}
                        onChange={(e) => setEpResponses(e.target.value)}
                      />
                    </Field>
                  ) : null}
                  {api !== "gemini" ? (
                    <Field
                      label={t("Gemini URL")}
                      hint={t(
                        "if the vendor serves Google's Gemini API (generateContent)",
                      )}
                    >
                      <input
                        type="url"
                        placeholder="https://…/v1beta"
                        value={epGemini}
                        onChange={(e) => setEpGemini(e.target.value)}
                      />
                    </Field>
                  ) : null}
                  <Field
                    label={t("Models URL")}
                    hint={t(
                      "Where the vendor lists its models, when that isn't under the base URL; asked with the key",
                    )}
                  >
                    <input
                      type="url"
                      placeholder="https://…/v1/models"
                      value={modelsURL}
                      onChange={(e) => setModelsURL(e.target.value)}
                    />
                  </Field>
                  <Field
                    label={t("Catalog")}
                    hint={t(
                      "Display names, reasoning levels and list prices for the models; for a gateway that serves several vendors, list them all, first match wins",
                    )}
                  >
                    <input
                      type="text"
                      placeholder={t("models.dev ids, e.g. openai, deepseek")}
                      value={catalog}
                      onChange={(e) => setCatalog(e.target.value)}
                    />
                  </Field>
                  <Field
                    label={t("Balance URL")}
                    hint={t(
                      "Where the vendor tells what is left on the key, asked with it like a chat request; {key} in it or in a header is each key's own, for a vendor that takes the key in the URL (…?key={key}); shown on the Usage page",
                    )}
                  >
                    <input
                      type="url"
                      placeholder="https://…/api/usage/token"
                      value={balanceURL}
                      onChange={(e) => setBalanceURL(e.target.value)}
                    />
                  </Field>
                  <Field label={t("Balance path")}>
                    <input
                      type="text"
                      placeholder={balanceURL.trim() ? "data.balance" : "data.quota_left"}
                      value={balancePath}
                      onChange={(e) => setBalancePath(e.target.value)}
                    />
                  </Field>
                </div>
              </details>
            ) : null}

            {!isLocal && kind !== "custom" && kind !== "vertex" ? (
              <Field label={t("Endpoints")}>
                <div className="eps">
                  {(epTests.length
                    ? epTests
                    : [
                        {
                          protocol: "openai",
                          label: "OpenAI",
                          url: state.site
                            ? `https://${state.site.replace(/^https?:\/\//, "").split("/")[0]}/v1`
                            : "https://…/v1",
                          status: "idle" as const,
                          text: "",
                        },
                      ]
                  ).map((r) => (
                    <div className="ep" key={r.protocol}>
                      <span className="pl">{r.label}</span>
                      <code>{r.url}</code>
                      {r.status !== "idle" ? (
                        <span
                          className={`res ${r.status === "wait" ? "wait" : r.status === "ok" ? "ok" : "bad"}`}
                        >
                          {r.status === "wait" ? "…" : r.text}
                        </span>
                      ) : null}
                    </div>
                  ))}
                  <button
                    type="button"
                    className={`text action${epTestBusy ? " busy" : ""}`}
                    title={t("Send a tiny request through each endpoint")}
                    disabled={epTestBusy}
                    onClick={() => {
                      const host =
                        (VENDOR_HOST[state.id] || "").split("\n")[0].replace(/^Global |^China /, "") ||
                        state.site ||
                        "api.example.com";
                      const rows: EpTest[] = [
                        {
                          protocol: "openai",
                          label: "OpenAI",
                          url: `https://${host.replace(/^https?:\/\//, "")}/v1`,
                          status: "wait",
                          text: "…",
                        },
                      ];
                      if (state.id === "openai" || state.id === "xai" || state.id === "deepseek") {
                        rows.push({
                          protocol: "responses",
                          label: "Responses",
                          url: `https://${host.replace(/^https?:\/\//, "")}/v1`,
                          status: "wait",
                          text: "…",
                        });
                      }
                      if (state.id === "anthropic") {
                        rows[0] = {
                          protocol: "anthropic",
                          label: "Anthropic",
                          url: `https://${host.replace(/^https?:\/\//, "")}`,
                          status: "wait",
                          text: "…",
                        };
                      }
                      setEpTests(rows);
                      setEpTestBusy(true);
                      window.setTimeout(() => {
                        setEpTestBusy(false);
                        setEpTests(
                          rows.map((r) =>
                            !key.trim()
                              ? {
                                  ...r,
                                  status: "bad" as const,
                                  text: demoCopy("演示：无密钥 · 未发请求", "Demo: no key · not sent"),
                                }
                              : {
                                  ...r,
                                  status: "ok" as const,
                                  text: "42 ms",
                                },
                          ),
                        );
                      }, 520);
                    }}
                  >
                    {epTestBusy ? "…" : t("Test")}
                  </button>
                </div>
              </Field>
            ) : null}

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
  const [claudeFileLoc, setClaudeFileLoc] = useState<"recent" | "home" | "desktop" | "settings" | "other">("recent");
  /** Magpie Antigravity: independent risk card (risk:true, importable) — Google riskNote + Cockpit/Manager/CLIProxyAPI import. Mock only. */
  type AgySign =
    | null
    | { state: "risk" }
    | { state: "waiting" }
    | {
        state: "import";
        text: string;
        files: { name: string; text: string }[];
        error?: string;
      }
    | { state: "importing" }
    | { state: "imported"; results: { user: string; status: string; error?: string }[] };
  const [agySign, setAgySign] = useState<AgySign>(null);
  const [filePickFor, setFilePickFor] = useState<"claude" | "antigravity" | null>(null);
  useEffect(() => {
    if (!claudeFilePick) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setClaudeFilePick(false);
      setFilePickFor(null);
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [claudeFilePick]);
  /** NOTES 23–24: Escape does not dismiss Claude/Antigravity import sheet — only Cancel. */
  useEffect(() => {
    const importing =
      claudeSign?.state === "import" ||
      claudeSign?.state === "importing" ||
      agySign?.state === "import" ||
      agySign?.state === "importing";
    if (!importing || claudeFilePick) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [claudeSign, agySign, claudeFilePick]);
  /** Magpie Copilot device-code (NOTES): mock only — no real GitHub OAuth. */
  type CopilotSign =
    | null
    | {
        state: "waiting";
        code: string;
        url: string;
        proxy: "" | "direct" | string;
        askProxy?: boolean;
        customProxy?: string;
        openError?: string;
        site?: string;
      }
    | { state: "ghe"; host: string }
    | { state: "failed"; error: string; proxy: "" | "direct" | string; site?: string; askProxy?: boolean; customProxy?: string };
  const [copilotSign, setCopilotSign] = useState<CopilotSign>(null);
  const [proxyMenuOpen, setProxyMenuOpen] = useState(false);
  const proxyBtnRef = useRef<HTMLButtonElement>(null);
  type DemoAcct = {
    id: string;
    label: string;
    plan?: string;
    on?: boolean;
    using?: string; // "In use" | "First" | "Paused" | …
  };
  type DemoProv = {
    id: string;
    name: string;
    icon: string;
    off?: boolean;
    /** Magpie sub: signed in as {user} · {n} models */
    user?: string;
    host?: string;
    keyKind: "acct" | "on" | "none" | "free";
    keyLabel: string;
    accounts: DemoAcct[];
    models: string[];
    agentsUsing?: { id: string; name: string; icon: string }[];
  };
  const normalizeProv = (raw: Record<string, unknown>): DemoProv => {
    const accounts = Array.isArray(raw.accounts)
      ? (raw.accounts as DemoAcct[]).map((a) => ({
          id: String(a.id),
          label: String(a.label || a.id),
          plan: a.plan,
          on: a.on !== false,
          using: a.using,
        }))
      : [];
    const models = Array.isArray(raw.models) ? (raw.models as string[]) : [];
    const keyKind = (raw.keyKind as DemoProv["keyKind"]) || (accounts.length ? "acct" : "on");
    return {
      id: String(raw.id),
      name: String(raw.name || raw.id),
      icon: String(raw.icon || "generic"),
      off: !!raw.off,
      user: raw.user ? String(raw.user) : accounts[0]?.label,
      host: raw.host ? String(raw.host) : undefined,
      keyKind,
      keyLabel: String(raw.keyLabel || (keyKind === "acct" ? "Pro" : accounts[0]?.label || "needs a key")),
      accounts: accounts.length
        ? accounts
        : [{ id: "a1", label: "default", plan: "Pro", on: true, using: "In use" }],
      models: models.length ? models : ["model-a"],
      agentsUsing: Array.isArray(raw.agentsUsing)
        ? (raw.agentsUsing as DemoProv["agentsUsing"])
        : [{ id: "cursor", name: "Cursor", icon: "cursor" }],
    };
  };
  const [demoProvs, setDemoProvs] = useState<DemoProv[]>(() => {
    try {
      const raw = localStorage.getItem("magpie.demoProviders");
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>[];
        if (Array.isArray(parsed) && parsed.length) return parsed.map(normalizeProv);
      }
    } catch {
      /* ignore */
    }
    return [
      normalizeProv({
        id: "anthropic",
        name: "Anthropic",
        icon: "claude-color",
        user: "work@example.com",
        keyKind: "acct",
        keyLabel: "Pro",
        accounts: [
          { id: "acct-1", label: "work@example.com", plan: "Pro", on: true, using: "In use" },
          { id: "acct-2", label: "api-key · sk-…demo", plan: "API", on: false },
        ],
        models: ["claude-sonnet-4-5", "claude-haiku-4-5", "claude-opus-4"],
        agentsUsing: [{ id: "cursor", name: "Cursor", icon: "cursor" }],
      }),
    ];
  });
  const [listEditId, setListEditId] = useState<string | null>(null);
  const [offFolded, setOffFolded] = useState(false);
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

  /** Magpie: china twin is pairTile with global — never a second grid cell (shot 31). */
  const vendorPairs = useMemo(() => {
    const all = byKind("vendor");
    const globals = all.filter((p) => !p.id.endsWith("-cn"));
    const rows: { pr: Preset; cn?: Preset }[] = [];
    for (const pr of globals) {
      const cn = PRESETS.find((x) => x.id === pr.id + "-cn" && x.kind === "vendor");
      const show = hit(pr.name, pr.id) || (cn ? hit(cn.name, cn.id) : false);
      if (show) rows.push({ pr, cn });
    }
    // Searching a China-only name still surfaces the pair via hit(cn) above.
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);
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
      setAgySign(null);
      setCopilotSign(null);
      setProxyMenuOpen(false);
      setEditor(null);
      return;
    }
    if (id === "copilot") {
      setClaudeSign(null);
      setAgySign(null);
      setEditor(null);
      setProxyMenuOpen(false);
      setCopilotSign({
        state: "waiting",
        code: DEMO_COPILOT_CODE,
        url: DEMO_COPILOT_URL,
        proxy: "",
      });
      return;
    }
    if (id === "antigravity") {
      setCopilotSign(null);
      setClaudeSign(null);
      setProxyMenuOpen(false);
      setEditor(null);
      setAgySign({ state: "risk" });
      return;
    }
    setClaudeSign(null);
    setAgySign(null);
    setCopilotSign(null);
    setProxyMenuOpen(false);
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
    else if (LOCAL_PRESETS[id]) {
      const loc = LOCAL_PRESETS[id];
      const prLoc = PRESETS.find((p) => p.id === id);
      setEditor({
        form: "local",
        id,
        name: prLoc?.name || id,
        icon: prLoc?.icon || id,
        site: loc.site,
        note: loc.note,
      });
    } else if (id === "remote")
      setEditor({
        form: "remote",
        id,
        name: "Remote magpie",
        icon: "magpie",
        note: t("another computer's magpie, shared on its network"),
      });
    else if (id === "vertex")
      setEditor({
        form: "vertex",
        id,
        name: "Vertex AI",
        icon: "vertexai-color",
        site: "docs.cloud.google.com",
        note: t("your Google Cloud project, with gcloud's sign-in"),
      });
    else if (id === "google")
      setEditor({
        form: "generic",
        id,
        name: "Google Gemini",
        icon: "gemini-color",
        site: "aistudio.google.com",
        note: "Gemini Developer API",
      });
    else if (id === "moonshot" || id === "moonshot-cn" || id === "kimi-code" || id === "kimi-code-cn")
      setEditor({
        form: "generic",
        id,
        name: name.replace(/ \(China\)$/, ""),
        icon,
        site: id.endsWith("-cn") ? "platform.moonshot.cn" : "platform.moonshot.ai",
      });
    else
      setEditor({
        form: "generic",
        id,
        name,
        icon,
        site: VENDOR_HOST[id]?.split("\n")[0]?.replace(/^Global |^China /, "") || undefined,
      });
  };

  const anySection =
    subs.length > 0 ||
    vendorPairs.length > 0 ||
    relays.length > 0 ||
    locals.length > 0 ||
    remotes.length > 0;

  return (
    <>
      <main className="view" id="view-providers">
        <div className="list" id="providers" hidden={!demoProvs.some((p) => !p.off)}>
          {demoProvs
            .filter((pv) => !pv.off)
            .map((pv) => {
              const n = pv.models.length;
              const modelsLabel =
                n === 1
                  ? t("{n} model", { n })
                  : n
                    ? t("{n} models", { n })
                    : t("no models exposed");
              const sub = pv.user
                ? t("signed in as {user}", { user: pv.user }) + " · " + modelsLabel
                : (pv.host || "") + (pv.host ? " · " : "") + modelsLabel;
              const selected = listEditId === pv.id;
              return (
                <div
                  className={`row provider${selected ? " selected" : ""}`}
                  key={pv.id}
                  data-id={pv.id}
                  onClick={() => setListEditId(selected ? null : pv.id)}
                >
                  <button
                    type="button"
                    className="ag-handle pv-handle"
                    aria-label={t("Arrange {agent}", { agent: pv.name })}
                    title={t("Drag to reorder — a model several providers serve goes to the higher one first · Alt+↑/↓ to move")}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img className="ic" src={iconSrc(pv.icon)} alt="" />
                  </button>
                  <div className="who">
                    <div className="name">{pv.name}</div>
                    <div className="sub">{sub}</div>
                  </div>
                  <div className="uses">
                    {(pv.agentsUsing || []).map((a) => (
                      <button
                        type="button"
                        className="use"
                        key={a.id}
                        title={a.name}
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatus(t("{name} · {model} — click to change", { name: a.name, model: "default" }), "ok");
                        }}
                      >
                        <img className="ic" src={iconSrc(a.icon)} alt="" />
                      </button>
                    ))}
                  </div>
                  <span
                    className={`key ${pv.keyKind}`}
                    title={
                      pv.keyKind === "acct"
                        ? t("{agent} is signed in; its models are here for every other agent", { agent: pv.name })
                        : pv.keyLabel
                    }
                  >
                    <span>{pv.keyLabel}</span>
                  </span>
                  <button
                    type="button"
                    className={`lib-switch pswitch${pv.off ? "" : " on"}`}
                    role="switch"
                    aria-checked={!pv.off}
                    aria-label={t("Use {name}", { name: pv.name })}
                    title={
                      pv.off
                        ? t("Off · switch it on and agents get its models again")
                        : t("On · switch it off and agents no longer get its models; its keys and settings are kept")
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      setDemoProvs((list) =>
                        list.map((x) => (x.id === pv.id ? { ...x, off: !x.off } : x)),
                      );
                      onStatus(
                        pv.off
                          ? t("{name} is on", { name: pv.name })
                          : t("{name} is off: agents no longer get its models", { name: pv.name }),
                        "ok",
                      );
                    }}
                  >
                    <i />
                  </button>
                  <span className="chev" aria-hidden>
                    <svg viewBox="0 0 12 12" width={11} height={11}>
                      <path
                        d="M4.5 2.5 8 6l-3.5 3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </div>
              );
            })}
        </div>
        <div className="row-head off-head" id="offHead" hidden={!demoProvs.some((p) => p.off)}>
          <button
            type="button"
            className="fold"
            id="foldOff"
            aria-expanded={!offFolded}
            aria-controls="offProviders"
            onClick={() => setOffFolded((f) => !f)}
          >
            <span className="label">{t("Turned off")}</span>
            <span className="note" id="offCount">
              {demoProvs.filter((p) => p.off).length || ""}
            </span>
          </button>
        </div>
        <div className="list" id="offProviders" hidden={!demoProvs.some((p) => p.off) || offFolded}>
          {demoProvs
            .filter((pv) => pv.off)
            .map((pv) => (
              <div className="row provider off" key={pv.id} data-id={pv.id} onClick={() => setListEditId(pv.id)}>
                <span className="ic">
                  <img src={iconSrc(pv.icon)} alt="" />
                </span>
                <div className="who">
                  <div className="name">
                    {pv.name}
                    <span className="badge off">{t("Switched off")}</span>
                  </div>
                  <div className="sub">{t("{n} models", { n: pv.models.length })}</div>
                </div>
                <span className={`key ${pv.keyKind}`}>
                  <span>{pv.keyLabel}</span>
                </span>
                <button
                  type="button"
                  className="lib-switch pswitch"
                  role="switch"
                  aria-checked={false}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDemoProvs((list) =>
                      list.map((x) => (x.id === pv.id ? { ...x, off: false } : x)),
                    );
                    onStatus(t("{name} is on", { name: pv.name }), "ok");
                  }}
                >
                  <i />
                </button>
                <span className="chev" aria-hidden>
                  <svg viewBox="0 0 12 12" width={11} height={11}>
                    <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                </span>
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
              title={t("Bring over providers set up in other apps")}
              onClick={() => setImportOpen(true)}
            >
              {t("Import…")}
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
                      on={
                        (!!claudeSign && s.id === "claude") ||
                        (!!agySign && s.id === "antigravity") ||
                        (!!copilotSign && s.id === "copilot")
                      }
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
                                setClaudeFileLoc("recent");
                                setFilePickFor("claude");
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
                {agySign?.state === "risk" ? (
                  <div className="signing">
                    <span className="mark">!</span>
                    <span className="tt">
                      <span className="n">
                        {t("{name} accounts can be suspended", { name: "Antigravity" })}
                      </span>
                      <span className="s">
                        {t(
                          "Google may suspend an Antigravity account it sees used outside Antigravity. Use one you can afford to lose.",
                        )}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="text"
                      onClick={() => setAgySign(null)}
                    >
                      {t("Cancel")}
                    </button>
                    <button
                      type="button"
                      className="text"
                      title={t(
                        "Bring in accounts exported from Antigravity Cockpit, Antigravity Manager or CLIProxyAPI",
                      )}
                      onClick={() =>
                        setAgySign({ state: "import", text: "", files: [] })
                      }
                    >
                      {t("Import instead…")}
                    </button>
                    <button
                      type="button"
                      className="text primary"
                      onClick={() => {
                        setAgySign({ state: "waiting" });
                        onStatus(
                          demoCopy(
                            "演示：Antigravity 登录未接真 OAuth（风险卡已确认）",
                            "Demo: Antigravity sign-in not wired to real OAuth (risk acknowledged)",
                          ),
                          "ok",
                        );
                      }}
                    >
                      {t("Sign in anyway")}
                    </button>
                  </div>
                ) : null}
                {agySign?.state === "waiting" ? (
                  <div className="signing">
                    <span className="spinner" aria-hidden />
                    <span className="tt">
                      <span className="n">
                        {t("Finish signing in to {name} in your browser", {
                          name: "Antigravity",
                        })}
                      </span>
                      <span className="s">
                        {t(
                          "magpie opened the sign-in page. The account shows up here as soon as you're done.",
                        )}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="text"
                      onClick={() => setAgySign(null)}
                    >
                      {t("Cancel")}
                    </button>
                  </div>
                ) : null}
                {agySign?.state === "import" ||
                agySign?.state === "importing" ||
                agySign?.state === "imported" ? (
                  <div className="signing import">
                    {agySign.state === "importing" ? (
                      <span className="spinner" aria-hidden />
                    ) : agySign.state === "imported" ? (
                      <span className="mark">✓</span>
                    ) : (
                      <span className="mark">↑</span>
                    )}
                    <span className="tt">
                      {agySign.state === "importing" ? (
                        <>
                          <span className="n">
                            {t("Checking the accounts with Google…")}
                          </span>
                          <span className="s">
                            {t(
                              "Each account's sign-in is refreshed and its project looked up, as signing in does.",
                            )}
                          </span>
                        </>
                      ) : agySign.state === "imported" ? (
                        <>
                          <span className="n">{t("Import finished")}</span>
                          <span className="results">
                            {agySign.results.map((r) => (
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
                            {t("Import {name} accounts", { name: "Antigravity" })}
                          </span>
                          <span className="s">
                            {t(
                              "Choose or paste an export from Antigravity Cockpit, Antigravity Manager or CLIProxyAPI — JSON, or refresh tokens one a line. Each account is checked with Google before it is added.",
                            )}
                          </span>
                          <span className="s">
                            {t(
                              "Google may suspend an Antigravity account it sees used outside Antigravity. Use one you can afford to lose.",
                            )}
                          </span>
                          <span className="acts">
                            <button
                              type="button"
                              className="link"
                              onClick={() => {
                                setClaudeFileLoc("recent");
                                setFilePickFor("antigravity");
                                setClaudeFilePick(true);
                              }}
                            >
                              {t("Choose files…")}
                            </button>
                            {agySign.files.length ? (
                              <span className="fname">
                                {agySign.files.map((f) => f.name).join(", ")}
                              </span>
                            ) : null}
                          </span>
                          <textarea
                            rows={3}
                            spellCheck={false}
                            autoComplete="off"
                            placeholder={t("…or paste it here")}
                            value={agySign.text}
                            onChange={(e) =>
                              setAgySign({
                                state: "import",
                                text: e.target.value,
                                files: agySign.files,
                              })
                            }
                          />
                          {agySign.error ? (
                            <span className="s why">{agySign.error}</span>
                          ) : null}
                        </>
                      )}
                    </span>
                    {agySign.state === "import" ? (
                      <>
                        <button
                          type="button"
                          className="text"
                          onClick={() => setAgySign(null)}
                        >
                          {t("Cancel")}
                        </button>
                        <button
                          type="button"
                          className="text primary"
                          disabled={
                            !(agySign.files.length || agySign.text.trim())
                          }
                          onClick={() => {
                            setAgySign({ state: "importing" });
                            window.setTimeout(() => {
                              setAgySign({
                                state: "imported",
                                results: [
                                  {
                                    user: "demo@antigravity.import",
                                    status: "added",
                                  },
                                ],
                              });
                              onStatus(
                                demoCopy(
                                  "演示：Antigravity 导入已本地标记（无真凭据）",
                                  "Demo: Antigravity import marked locally (no real credentials)",
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
                    {agySign.state === "imported" ? (
                      <>
                        <button
                          type="button"
                          className="text"
                          onClick={() => setAgySign(null)}
                        >
                          {t("Done")}
                        </button>
                        <button
                          type="button"
                          className="text primary"
                          onClick={() =>
                            setAgySign({
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
                {copilotSign?.state === "waiting" ? (
                  <div className="signing">
                    <span className="spinner" aria-hidden />
                    <span className="tt">
                      <span className="n">
                        {t("Finish signing in to {name} in your browser", { name: "Copilot" })}
                      </span>
                      <span className="s">
                        {copilotSign.openError
                          ? t(
                              "magpie couldn't open your browser: {error}. Open the sign-in link below in a browser yourself.",
                              { error: copilotSign.openError },
                            )
                          : t(
                              "magpie opened GitHub's device page. Enter this code there; the account shows up here as soon as you're done.",
                            )}
                      </span>
                      <span className="devcode">
                        <code>{copilotSign.code}</code>
                        <SignCopy
                          text={copilotSign.code}
                          what={t("Code")}
                          onStatus={onStatus}
                        />
                      </span>
                      <span className="signlink">
                        <code title={t("Open it in another browser or profile: copy it there")}>
                          {copilotSign.url}
                        </code>
                        <SignCopy
                          text={copilotSign.url}
                          what={t("Sign-in link")}
                          onStatus={onStatus}
                        />
                      </span>
                      <span className="acts">
                        <button
                          type="button"
                          className="link"
                          onClick={() => {
                            try {
                              window.open(copilotSign.url, "_blank", "noopener,noreferrer");
                              if (copilotSign.openError) {
                                setCopilotSign({ ...copilotSign, openError: undefined });
                              }
                            } catch (e) {
                              setCopilotSign({
                                ...copilotSign,
                                openError: e instanceof Error ? e.message : String(e),
                              });
                            }
                            onStatus(
                              demoCopy("演示：重新打开设备页（无真 OAuth）", "Demo: reopened device page (no real OAuth)"),
                              "ok",
                            );
                          }}
                        >
                          {t("Open again")}
                        </button>
                        <button
                          type="button"
                          className="link"
                          data-ghe="ghe"
                          title={t(
                            "An account of an enterprise on GitHub Enterprise Cloud with data residency signs in at its <name>.ghe.com",
                          )}
                          onClick={() => setCopilotSign({ state: "ghe", host: "" })}
                        >
                          {t("Account on GHE.com?")}
                        </button>
                        <button
                          type="button"
                          ref={proxyBtnRef}
                          className={`link via${proxyMenuOpen ? " open" : ""}`}
                          title={
                            (
                              !copilotSign.proxy
                                ? t("Global proxy")
                                : copilotSign.proxy === "direct"
                                  ? t("Direct")
                                  : copilotSign.proxy
                            ) +
                            "\n" +
                            t(
                              "The sign-in goes through this proxy, as the account's requests will. One picked here is kept as the account's.",
                            )
                          }
                          aria-haspopup="menu"
                          aria-expanded={proxyMenuOpen}
                          onClick={(e) => {
                            e.stopPropagation();
                            setProxyMenuOpen((o) => !o);
                          }}
                        >
                          {t("Proxy: {proxy}", {
                            proxy:
                              !copilotSign.proxy
                                ? t("Global proxy")
                                : copilotSign.proxy === "direct"
                                  ? t("Direct")
                                  : copilotSign.proxy,
                          })}
                        </button>
                      </span>
                      {copilotSign.askProxy ? (
                        <form
                          className="callback-form proxy-ask"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const v = (copilotSign.customProxy || "").trim();
                            if (!v) return;
                            setCopilotSign({
                              ...copilotSign,
                              proxy: v,
                              askProxy: false,
                            });
                            onStatus(
                              t("Proxy: {proxy}", { proxy: v }),
                              "ok",
                            );
                          }}
                        >
                          <input
                            aria-label={t("Proxy")}
                            placeholder="http://127.0.0.1:7890"
                            autoComplete="off"
                            value={copilotSign.customProxy || ""}
                            onChange={(e) =>
                              setCopilotSign({
                                ...copilotSign,
                                customProxy: e.target.value,
                              })
                            }
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                          <button
                            type="submit"
                            className="text primary"
                            disabled={!(copilotSign.customProxy || "").trim()}
                          >
                            {t("Sign in through it")}
                          </button>
                        </form>
                      ) : null}
                    </span>
                    <ProtoMultiMenu
                      open={proxyMenuOpen}
                      anchor={proxyBtnRef.current}
                      align="left"
                      live={false}
                      head="Sign in through"
                      value={copilotSign.askProxy ? "\x01" : copilotSign.proxy || ""}
                      options={[
                        {
                          v: "",
                          name: "Global proxy",
                          note: "Follows the proxy in Settings",
                        },
                        {
                          v: "direct",
                          name: "Direct",
                          note: "Through no proxy",
                        },
                        {
                          v: "\x01",
                          name: "Custom…",
                          note: "http://, https:// or socks5://",
                        },
                      ]}
                      onChange={(next) => {
                        const v = typeof next === "string" ? next : "";
                        if (v === "\x01") {
                          setCopilotSign({
                            ...copilotSign,
                            askProxy: true,
                            customProxy: copilotSign.customProxy || "",
                          });
                          setProxyMenuOpen(false);
                          return;
                        }
                        setCopilotSign({
                          ...copilotSign,
                          proxy: v as "" | "direct" | string,
                          askProxy: false,
                        });
                        setProxyMenuOpen(false);
                        onStatus(
                          t("Proxy: {proxy}", {
                            proxy:
                              !v
                                ? t("Global proxy")
                                : v === "direct"
                                  ? t("Direct")
                                  : v,
                          }),
                          "ok",
                        );
                      }}
                      onClose={() => setProxyMenuOpen(false)}
                    />
                    <button
                      type="button"
                      className="text"
                      onClick={() => {
                        setProxyMenuOpen(false);
                        setCopilotSign(null);
                      }}
                    >
                      {t("Cancel")}
                    </button>
                  </div>
                ) : null}
                {copilotSign?.state === "ghe" ? (
                  <div className="signing copilot-ghe">
                    <span className="tt">
                      <span className="n">{t("Your enterprise on GHE.com")}</span>
                      <span className="s">
                        {t(
                          "The address you sign in to GitHub at, like acme.ghe.com. An account on github.com doesn't need it.",
                        )}
                      </span>
                      <form
                        className="callback-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const host = copilotSign.host
                            .trim()
                            .replace(/^https?:\/\//i, "")
                            .replace(/\/$/, "")
                            .toLowerCase();
                          if (!GHE_HOST.test(host)) {
                            onStatus(t("Type your enterprise's <name>.ghe.com"), "err");
                            return;
                          }
                          // Mock: show waiting card with GHE device URL — no real OAuth
                          setCopilotSign({
                            state: "waiting",
                            code: DEMO_COPILOT_CODE,
                            url: `https://${host}/login/device`,
                            proxy: "",
                            site: host,
                          });
                          onStatus(
                            demoCopy(
                              "演示：GHE 设备码卡（无真 OAuth）",
                              "Demo: GHE device-code card (no real OAuth)",
                            ),
                            "ok",
                          );
                        }}
                      >
                        <input
                          value={copilotSign.host}
                          placeholder="acme.ghe.com"
                          aria-label={t("Your enterprise on GHE.com")}
                          autoComplete="off"
                          onChange={(e) =>
                            setCopilotSign({ state: "ghe", host: e.target.value })
                          }
                        />
                        <button
                          type="submit"
                          className="text primary"
                          disabled={!GHE_HOST.test(copilotSign.host.trim())}
                        >
                          {t("Sign in")}
                        </button>
                      </form>
                    </span>
                    <button
                      type="button"
                      className="text"
                      onClick={() => setCopilotSign(null)}
                    >
                      {t("Cancel")}
                    </button>
                    <button
                      type="button"
                      className="text"
                      title={t("Sign in on github.com instead")}
                      onClick={() =>
                        setCopilotSign({
                          state: "waiting",
                          code: DEMO_COPILOT_CODE,
                          url: DEMO_COPILOT_URL,
                          proxy: "",
                        })
                      }
                    >
                      github.com
                    </button>
                  </div>
                ) : null}
                {copilotSign?.state === "failed" ? (
                  <div className="signing failed">
                    <span className="mark">!</span>
                    <span className="tt">
                      <span className="n">{t("Sign-in didn't finish")}</span>
                      <span className="s">{copilotSign.error}</span>
                    </span>
                    <button
                      type="button"
                      className="text"
                      onClick={() => setCopilotSign(null)}
                    >
                      {t("Cancel")}
                    </button>
                    <button
                      type="button"
                      className="text primary"
                      onClick={() =>
                        setCopilotSign({
                          state: "waiting",
                          code: DEMO_COPILOT_CODE,
                          url: DEMO_COPILOT_URL,
                          proxy: copilotSign.proxy,
                          site: copilotSign.site,
                        })
                      }
                    >
                      {t("Try again")}
                    </button>
                  </div>
                ) : null}
              </>
            )}

            {vendorPairs.length > 0 && (
              <Section title={ZH.vendors} hint={ZH.makersApis}>
                {vendorPairs.map(({ pr, cn }) => (
                  <Tile
                    key={pr.id}
                    id={pr.id}
                    name={pr.name.replace(/ \(China\)$/, "")}
                    icon={pr.icon}
                    tip={pairHostTip(pr, cn)}
                    on={!!editor && (editor.id === pr.id || (!!cn && editor.id === cn.id))}
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
              <Section title={t("On this machine")}>
                {locals.map((p) => (
                  <Tile
                    key={p.id}
                    id={p.id}
                    name={p.name}
                    icon={p.icon}
                    tip={LOCAL_PRESETS[p.id]?.address || p.name}
                    on={!!editor && editor.id === p.id}
                    onPick={pickTile}
                  />
                ))}
              </Section>
            )}

            {remotes.length > 0 && (
              <Section
                title={t("Another computer's magpie")}
                hint={t("shared on its network")}
              >
                {remotes.map((p) => (
                  <Tile
                    key={p.id}
                    id={p.id}
                    name={p.name}
                    icon={p.icon}
                    tip="http://192.168.1.20:3425"
                    on={!!editor && editor.id === p.id}
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
                            keyKind: "on" as const,
                            keyLabel: "sk-…nested",
                            accounts: [{ id: "n1", label: "sk-…nested", on: true, using: "In use" }],
                            models: ["claude-sonnet-4-5", "claude-haiku-4-5"],
                            agentsUsing: [{ id: "cursor", name: "Cursor", icon: "cursor" }],
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
          aria-label={t("Select Files")}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setClaudeFilePick(false);
              setFilePickFor(null);
            }
          }}
        >
          {/* Magpie uses OS file input; NOTES 24 = GTK Select Files (Recent). Demo sheet mirrors that chrome. */}
          <div
            className="dialog gtk-select-files"
            style={{
              width: "min(560px, 92vw)",
              maxHeight: "min(480px, 82vh)",
              display: "flex",
              flexDirection: "column",
              animation: "pop-in .42s cubic-bezier(.16,1,.3,1)",
            }}
          >
            <div
              className="ehead"
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid var(--line)",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {t("Select Files")}
            </div>
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
                    ["recent", t("Recent")],
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
                    {id === "other" ? `+ ${label}` : label}
                  </button>
                ))}
              </nav>
              <div
                style={{
                  padding: 12,
                  overflow: "auto",
                  margin: 10,
                  borderRadius: 8,
                  minHeight: 220,
                  background: "var(--card)",
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
                <p style={{ textAlign: "center", margin: "0 0 8px" }}>
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      if (filePickFor === "antigravity" && agySign?.state === "import") {
                        setAgySign({
                          state: "import",
                          text: agySign.text,
                          files: [
                            {
                              name: "antigravity-export.json",
                              text: '{"demo":true,"refresh_tokens":[]}',
                            },
                          ],
                        });
                      } else if (claudeSign?.state === "import") {
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
                      setFilePickFor(null);
                    }}
                  >
                    {demoCopy("演示选用示例文件", "Demo: pick a sample file")}
                  </button>
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
                onClick={() => {
                  setClaudeFilePick(false);
                  setFilePickFor(null);
                }}
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                className="text primary"
                disabled
                title={demoCopy("未选文件时 Open 禁用", "Open disabled with no selection")}
              >
                {t("Open")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {listEditId ? (() => {
        const pv = demoProvs.find((x) => x.id === listEditId);
        if (!pv) return null;
        return (
          <div
            className="modal open"
            role="dialog"
            aria-modal="true"
            aria-label={pv.name}
            onClick={(e) => {
              if (e.target === e.currentTarget) setListEditId(null);
            }}
          >
            <div
              className="dialog editor"
              style={{
                width: "min(520px, 94vw)",
                maxHeight: "min(640px, 88vh)",
                display: "flex",
                flexDirection: "column",
                animation: "pop-in .42s cubic-bezier(.16,1,.3,1)",
              }}
            >
              <div className="ehead" style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 8px" }}>
                <img className="ic" src={iconSrc(pv.icon)} alt="" width={22} height={22} />
                <div className="who" style={{ flex: 1, minWidth: 0 }}>
                  <div className="name">{pv.name}</div>
                  <div className="sub">{pv.user ? t("signed in as {user}", { user: pv.user }) : pv.host || ""}</div>
                </div>
                <button type="button" className="text" onClick={() => setListEditId(null)}>{t("Done")}</button>
              </div>
              <div className="ebody" style={{ padding: "8px 16px 16px", overflow: "auto" }}>
                <div className="label" style={{ marginBottom: 6 }}>{t("Accounts")}</div>
                <div className="accts">
                  {pv.accounts.map((a) => (
                    <div
                      className={`acc${a.on !== false ? " in-use" : " off"}`}
                      key={a.id}
                      data-account-id={a.id}
                    >
                      <button
                        type="button"
                        className={`dot tick${a.on !== false ? "" : ""}`}
                        title={a.on !== false ? t("Stop using this account") : t("Use this account too")}
                        onClick={() => {
                          setDemoProvs((list) =>
                            list.map((x) =>
                              x.id !== pv.id
                                ? x
                                : {
                                    ...x,
                                    accounts: x.accounts.map((ac) =>
                                      ac.id === a.id ? { ...ac, on: !(ac.on !== false) } : ac,
                                    ),
                                  },
                            ),
                          );
                        }}
                      >
                        {a.on !== false ? (
                          <svg viewBox="0 0 12 12" width={10} height={10}>
                            <path d="M2.5 6.2 5 8.7 9.5 3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : null}
                      </button>
                      <span className="n">{a.label}</span>
                      {a.plan ? <span className="plan">{a.plan}</span> : null}
                      <span className="grow" />
                      {a.using ? <span className="using">{t(a.using)}</span> : null}
                      <button
                        type="button"
                        className="text quiet"
                        onClick={() => {
                          setDemoProvs((list) =>
                            list.map((x) =>
                              x.id !== pv.id
                                ? x
                                : { ...x, accounts: x.accounts.filter((ac) => ac.id !== a.id) },
                            ),
                          );
                          onStatus(t("{user} removed", { user: a.label }), "ok");
                        }}
                      >
                        {t("Remove")}
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="acc add"
                    onClick={() => {
                      const id = "acct-" + Date.now();
                      setDemoProvs((list) =>
                        list.map((x) =>
                          x.id !== pv.id
                            ? x
                            : {
                                ...x,
                                accounts: [
                                  ...x.accounts,
                                  { id, label: "demo+" + (x.accounts.length + 1) + "@example.com", plan: "Pro", on: true, using: "In use" },
                                ],
                              },
                        ),
                      );
                      onStatus(t("Account added"), "ok");
                    }}
                  >
                    <span className="dot" />
                    <span className="n">{t("Add an account")}</span>
                  </button>
                </div>
                <div className="label" style={{ margin: "14px 0 6px" }}>{t("Models")}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {pv.models.map((m) => (
                    <code key={m} style={{ fontSize: 11, padding: "3px 7px", borderRadius: 6, background: "var(--pill)" }}>
                      {m}
                    </code>
                  ))}
                </div>
                <div className="bar" style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="text"
                    onClick={() => {
                      setDemoProvs((list) => list.filter((x) => x.id !== pv.id));
                      setListEditId(null);
                      onStatus(t("{name} removed", { name: pv.name }), "ok");
                    }}
                  >
                    {t("Remove")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })() : null}
      {editor ? (
        <ProviderEditorModal
          state={editor}
          onClose={() => setEditor(null)}
          onStatus={onStatus}
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
                    keyKind: "on" as const,
                    keyLabel: "sk-…demo",
                    accounts: [{ id: "a1", label: "default", on: true, using: "In use" }],
                    models: ["model-a", "model-b"],
                    agentsUsing: [{ id: "cursor", name: "Cursor", icon: "cursor" }],
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
