import { useEffect, useMemo, useRef, useState } from "react";
import { ModelPop, type PopOption } from "./ModelPop";
import { Segs } from "./Segs";
import { t } from "../i18n";

/** Magpie routing.js GROUP_ROUTE_OPTS / LIST_OPTS / SINK / FIRST / PATIENCE / CTX / AFF / EFFORT / LEVELS */

const LIST_OPTS = [
  { id: "" as const, label: "Its models too" },
  { id: "unlists" as const, label: "The group alone" },
];
const LIST_HINT: Record<string, string> = {
  "": "Agents' model lists and the gateway's /v1/models show the group and each of its models.",
  unlists:
    "Agents' model lists and the gateway's /v1/models show the group, not the models it names or its patterns match: they are used through it. A request naming one is still answered.",
};

const GROUP_ROUTE_OPTS = [
  { id: "" as const, label: "Smart" },
  { id: "order" as const, label: "In order" },
  { id: "rotate" as const, label: "In turn" },
  { id: "usage" as const, label: "Least used" },
  { id: "pace" as const, label: "Weekly pace" },
  { id: "weight" as const, label: "By weight" },
  { id: "manual" as const, label: "Manual" },
];
const GROUP_HINT: Record<string, string> = {
  "": "Smart, over the members' accounts and keys together: of the subscriptions with quota to spare, the one whose allowance renews soonest goes first — the week decides, and an account with five hours and no week (Claude Enterprise) goes by its five hours, so ahead of every week renewing later; one resting after a failure goes last.",
  order: "In order: the first model until it can't answer, then the next — each over its own accounts or keys as its provider routes them.",
  rotate: "In turn: each conversation's next turn goes to the next member's account or key, spreading the load.",
  usage: "Least used first: the account or key with the most of its allowance left goes first.",
  pace: "Weekly pace: the account with the most of its week left per hour until it renews goes first, so less of each member's week is lost at its reset — an account with five hours and no week (Claude Enterprise) by what its five hours have left per hour until they renew, so almost always first; a key by the tokens magpie sent it lately.",
  weight:
    "By weight: each member takes requests in proportion to its weight (set beside it). A model weighing 3 takes three for every one a model weighing 1 takes.",
  manual:
    "Manual: every request goes to the model you pick on the group's card, over its own accounts or keys; the others, and the rules, wait until you pick another — none takes over when it fails.",
};
const GROUP_NEST =
  "A group among the models, and a model whose provider routes its accounts or keys other than Smart, keeps its own routing: this group only picks between it and the others, weighing it by the account or key it would try first, then tries it whole in its own order.";

const SINK_OPTS = [
  { id: "" as const, label: "Keeps its place" },
  { id: "sink" as const, label: "Goes to the back" },
];
const SINK_HINT: Record<string, string> = {
  "": "One rate limited while it still has quota rests as long as the vendor asks, then takes its place in the order again.",
  sink: "One rate limited (429) while it still has quota goes to the back of the order, behind every one not rate limited since, and comes round again once those ahead of it are rate limited in turn — so the load goes round rather than back to the first each time. Out of quota, it rests as usual. Kept until magpie restarts.",
};

const FIRST_OPTS = [
  { id: 0 as const, label: "Wait" },
  { id: 30 as const, label: "30 s" },
  { id: 60 as const, label: "1 min" },
  { id: 120 as const, label: "2 min" },
  { id: "custom" as const, label: "Custom" },
];

const PATIENCE_OPTS = [
  { id: -1 as const, label: "Off" },
  { id: 0 as const, label: "1 min" },
  { id: 120 as const, label: "2 min" },
  { id: 240 as const, label: "4 min" },
];

const CTX_OPTS = [
  { id: "largest" as const, label: "Largest model's" },
  { id: "smallest" as const, label: "Smallest model's" },
  { id: "custom" as const, label: "Custom" },
];

const AFF_OPTS = [
  { id: "" as const, label: "Auto" },
  { id: "session" as const, label: "Session" },
  { id: "turn" as const, label: "Within a turn" },
  { id: "off" as const, label: "Off" },
  { id: "strict" as const, label: "Strict" },
];
const AFF_HINT: Record<string, string> = {
  "": "A conversation stays with the account or key that answered it while what the vendor cached of it is worth keeping — within a turn always, across turns while it's fresh.",
  session: "A conversation stays with the account or key that answered it for the whole session, while it can answer.",
  turn: "A conversation stays put within a turn, while the agent sends tool results back; when you speak again, routing decides afresh.",
  off: "Every request is routed afresh, whoever answered its conversation before.",
  strict:
    "A conversation stays with the account or key that answered it and never moves to another, even past its usage cap: when that one is rate limited or out of quota, the error goes to the agent. New conversations are routed as usual.",
};

const LEVELS = ["none", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
const REASON_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;

const DEMO_MODELS: PopOption[] = [
  { value: "claude-opus-4-1", label: "opus", group: "Anthropic", note: "claude-opus-4-1", ref: "claude-opus-4-1" },
  { value: "claude-sonnet-4-5", label: "sonnet", group: "Anthropic", note: "claude-sonnet-4-5", ref: "claude-sonnet-4-5" },
  { value: "claude-haiku-4-5", label: "haiku", group: "Anthropic", note: "claude-haiku-4-5", ref: "claude-haiku-4-5" },
  { value: "gpt-5", label: "gpt-5", group: "OpenAI", note: "gpt-5", ref: "gpt-5" },
  { value: "gemini-2.5-pro", label: "gemini-2.5-pro", group: "Google", note: "gemini-2.5-pro", ref: "gemini-2.5-pro" },
];

type Member = {
  id: string;
  name: string;
  on: boolean;
  fixed: string; // "" = Follow the group
};

type Draft = {
  name: string;
  members: Member[];
  patterns: string[];
  unlists: "" | "unlists";
  routing: string;
  sink: "" | "sink";
  firstToken: number; // seconds; 0 = Wait
  firstCustom: boolean;
  patience: number; // -1 Off, 0 → 1 min, …
  context: "largest" | "smallest" | "custom";
  contextTokens: string;
  affinity: string;
  effort: "" | "auto";
  levelsOwn: boolean;
  levels: string[];
};

function slug(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "group";
}

function fixedWords(level: string) {
  return t("{level} reasoning", { level });
}

function splitMember(id: string): [string, string] {
  const i = id.lastIndexOf(":");
  if (i < 0) return [id, ""];
  const base = id.slice(0, i);
  const fixed = id.slice(i + 1);
  if (REASON_LEVELS.includes(fixed as (typeof REASON_LEVELS)[number])) return [base, fixed];
  return [id, ""];
}

function memberDisplay(m: Member) {
  const [, fixed] = splitMember(m.id);
  return fixed ? `${m.name}:${fixed}` : m.name;
}

function emptyDraft(): Draft {
  return {
    name: "",
    members: [],
    patterns: [],
    unlists: "",
    routing: "",
    sink: "",
    firstToken: 0,
    firstCustom: false,
    patience: 0,
    context: "largest",
    contextTokens: "",
    affinity: "",
    effort: "",
    levelsOwn: false,
    levels: ["low", "medium", "high"],
  };
}

function draftSnapshot(d: Draft) {
  return JSON.stringify(d);
}

type Props = {
  open: boolean;
  nameSuffixOn: boolean;
  onClose: () => void;
  onSaved: (name: string) => void;
};

/**
 * Magpie New group editor (routing.js renderGroupEditor / shots 03–22).
 * Motion: segs thumb 280ms; #pop pop-fade .18s + pop-in .42s; discard dialog pop-in .28s;
 * member sort .22s cubic-bezier(.22,1,.36,1); rt-gadd hover .15s.
 */
export function GroupEditor({ open, nameSuffixOn, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [was, setWas] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [reasonFor, setReasonFor] = useState<number | null>(null);
  const [patIn, setPatIn] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false);
  const [firstErr, setFirstErr] = useState("");
  const [ctxErr, setCtxErr] = useState("");
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const reasonBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const d = emptyDraft();
    setDraft(d);
    setWas(draftSnapshot(d));
    setAddOpen(false);
    setReasonFor(null);
    setPatIn("");
    setDiscardOpen(false);
    setFirstErr("");
    setCtxErr("");
    const tmr = window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 0);
    return () => clearTimeout(tmr);
  }, [open]);

  const dirty = useMemo(() => open && was !== "" && draftSnapshot(draft) !== was, [open, draft, was]);

  if (!open) return null;

  const idOf = () => slug(draft.name);
  const sinkable = draft.routing !== "rotate" && draft.routing !== "weight" && draft.routing !== "manual";

  const firstMode = draft.firstCustom
    ? "custom"
    : ([0, 30, 60, 120] as const).includes(draft.firstToken as 0 | 30 | 60 | 120)
      ? draft.firstToken
      : "custom";

  const askClose = () => {
    if (dirty) setDiscardOpen(true);
    else onClose();
  };

  const doDiscard = () => {
    setDiscardOpen(false);
    onClose();
  };

  const addMember = (raw: string) => {
    const id = raw.trim();
    if (!id) return;
    const known = DEMO_MODELS.find((m) => m.value === id || m.label === id || m.ref === id);
    const name = known?.label || id.split("/").pop() || id;
    const value = known?.value || id;
    setDraft((d) => {
      if (d.members.some((m) => splitMember(m.id)[0] === splitMember(value)[0] && !m.id.includes(":"))) {
        return d;
      }
      if (d.members.some((m) => m.id === value)) return d;
      return {
        ...d,
        members: [...d.members, { id: value, name, on: true, fixed: "" }],
      };
    });
    setAddOpen(false);
  };

  const setMemberFixed = (i: number, fixed: string) => {
    setDraft((d) => {
      const next = d.members.map((m, j) => {
        if (j !== i) return m;
        const [base] = splitMember(m.id);
        const id = fixed ? `${base}:${fixed}` : base;
        return { ...m, id, fixed };
      });
      return { ...d, members: next };
    });
    setReasonFor(null);
  };

  const moveMember = (from: number, to: number) => {
    if (to < 0 || to >= draft.members.length || to === from) return;
    setDraft((d) => {
      const members = [...d.members];
      members.splice(to, 0, members.splice(from, 1)[0]);
      return { ...d, members };
    });
  };

  const addPattern = () => {
    const p = patIn.trim();
    if (!p) return;
    if (!p.includes("*") && !p.startsWith("re:")) return;
    setDraft((d) => (d.patterns.includes(p) ? d : { ...d, patterns: [...d.patterns, p] }));
    setPatIn("");
  };

  const patienceWord = (n: number) => {
    const o = PATIENCE_OPTS.find((x) => x.id === n);
    return o ? t(o.label) : `${n}s`;
  };

  const firstHint = firstErr
    ? firstErr
    : draft.firstToken
      ? t(
          "A member that hasn't begun answering after {n} — no text, reasoning or tool call yet — is let go and the next one asked, before any of it reaches the agent. It doesn't rest; the last one left is always waited for. Only for streamed requests.",
          { n: draft.firstToken >= 60 ? `${Math.round(draft.firstToken / 60)} min` : `${draft.firstToken} s` },
        )
      : t("Every member is waited for, however long it takes to begin answering.");

  const patienceHint =
    draft.patience < 0
      ? t("When every member has failed, the agent gets the last one's error at once.")
      : t(
          "When every member has failed with an error that may pass — overloaded, unavailable, rate limited for a moment — and nothing of the reply has reached the agent, each is asked again after a pause, longer each time and never shorter than the vendor asks, for up to {n} more. A streaming agent is kept waiting meanwhile.",
          { n: patienceWord(draft.patience) },
        );

  const ctxHint = ctxErr
    ? ctxErr
    : draft.context === "custom"
      ? t("Agents are told the group takes {n} tokens; a longer conversation still goes on to a member with room for it.", {
          n: draft.contextTokens || "…",
        })
      : draft.context === "smallest"
        ? t("Agents are told its smallest model's window, so they compact before any member would turn the conversation away.")
        : t("Agents are told its largest model's window; a conversation too long for one member goes on to one with room for it.");

  const save = () => {
    if (!draft.members.length && !draft.patterns.length) {
      addBtnRef.current?.focus({ preventScroll: true });
      return;
    }
    onSaved(draft.name.trim() || idOf());
    onClose();
  };

  const reasonOpts: PopOption[] = [
    { value: "", label: t("Follow the group"), note: t("as the group's effort says") },
    ...REASON_LEVELS.map((v) => ({
      value: v,
      label: fixedWords(v),
      note: t("whatever the agent asks"),
    })),
  ];

  return (
    <>
      <div className="editor rt-gedit card" style={{ marginTop: 8, animation: "pop-in .42s cubic-bezier(.16,1,.3,1)" }}>
        <div className="ehead">
          <b>{t("New group")}</b>
        </div>

        <label>{t("Name")}</label>
        <div>
          <input
            ref={nameRef}
            type="text"
            value={draft.name}
            placeholder={t("e.g. Opus anywhere")}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Escape") askClose();
              if (e.key === "Enter") save();
            }}
          />
          <div className="hint">{t("Agents pick it as {id}", { id: `group/${idOf()}` })}</div>
        </div>

        <label>{t("In agents’ lists")}</label>
        <div className="gsuffix">
          <span className="hint">
            {t("Agents’ lists show “{label}”", {
              label: (draft.name.trim() || t("New group")) + (nameSuffixOn ? " · routing group" : ""),
            })}
            {" · "}
            {t("“· routing group” is set for every group above")}
          </span>
        </div>

        <label>{t("Models")}</label>
        <div>
          <div className="fallback">
            <div className="fbl">
              {draft.members.map((m, i) => (
                <div key={`${m.id}-${i}`} className={`fbrow${m.on ? "" : " muted"}`}>
                  <button
                    type="button"
                    className={`lib-switch rt-mon${m.on ? " on" : ""}`}
                    role="switch"
                    aria-checked={m.on}
                    aria-label={m.name}
                    title={
                      m.on
                        ? t("On: requests may go to it. Click to switch it off and keep its place")
                        : t("Off: kept in its place, sent nothing. Click to switch it on")
                    }
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        members: d.members.map((x, j) => (j === i ? { ...x, on: !x.on } : x)),
                      }))
                    }
                  >
                    <i />
                  </button>
                  <button type="button" className="i ag-handle rt-mhandle" data-at={i} title={t("Drag to reorder · Alt+↑/↓ to move")} aria-label={t("Move {name}", { name: m.name })}>
                    {i + 1}
                  </button>
                  <svg className="ic" viewBox="0 0 16 16" width={14} height={14} aria-hidden>
                    <path d="M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z" fill="none" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                  <span className="n">
                    <span style={m.on ? undefined : { textDecoration: "line-through", color: "var(--muted)" }}>{memberDisplay(m)}</span>
                  </span>
                  <span className="grow" />
                  <button
                    type="button"
                    className={`rt-cond rt-fixed${m.fixed ? " on" : ""}`}
                    ref={(el) => {
                      reasonBtnRefs.current[i] = el;
                    }}
                    title={
                      m.fixed
                        ? t("Sent at {level} reasoning whatever the agent asks, at the model's nearest level", { level: m.fixed })
                        : t("Reasons as the group's effort says")
                    }
                    onClick={() => setReasonFor((cur) => (cur === i ? null : i))}
                  >
                    {m.fixed ? fixedWords(m.fixed) : t("Group's reasoning")}
                  </button>
                  {i > 0 ? (
                    <button type="button" className="text" onClick={() => moveMember(i, i - 1)}>
                      {t("Up")}
                    </button>
                  ) : null}
                  {i < draft.members.length - 1 ? (
                    <button type="button" className="text" onClick={() => moveMember(i, i + 1)}>
                      {t("Down")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="text"
                    onClick={() => setDraft((d) => ({ ...d, members: d.members.filter((_, j) => j !== i) }))}
                  >
                    {t("Remove")}
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={`rt-gadd${addOpen ? " open" : ""}`}
              ref={addBtnRef}
              onClick={() => setAddOpen((o) => !o)}
            >
              <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M8 3.5v9M3.5 8h9" />
              </svg>
              <span>{t(draft.members.length ? "Add another model" : "Add a model")}</span>
            </button>
            <ModelPop
              open={addOpen}
              anchor={addBtnRef.current}
              value=""
              modelPicker
              options={DEMO_MODELS}
              onPick={addMember}
              onClose={() => setAddOpen(false)}
            />
            {reasonFor != null ? (
              <ModelPop
                open
                anchor={reasonBtnRefs.current[reasonFor] || null}
                value={draft.members[reasonFor]?.fixed || ""}
                modelPicker={false}
                placeholder={t("Filter reasoning…")}
                options={reasonOpts}
                onPick={(v) => setMemberFixed(reasonFor, v)}
                onClose={() => setReasonFor(null)}
              />
            ) : null}
          </div>
          <div className="hint">{t("The first answers for what the model can do. In order, they are tried top first.")}</div>
        </div>

        <label>{t("Patterns")}</label>
        <div>
          <div className="fallback rt-pats">
            <div className="fbl">
              {draft.patterns.map((p) => (
                <div key={p} className="fbrow">
                  <span className="n">
                    <code>{p}</code>
                  </span>
                  <span className="grow" />
                  <button
                    type="button"
                    className="text"
                    onClick={() => setDraft((d) => ({ ...d, patterns: d.patterns.filter((x) => x !== p) }))}
                  >
                    {t("Remove")}
                  </button>
                </div>
              ))}
            </div>
            <div className="rt-patadd">
              <input
                type="text"
                value={patIn}
                placeholder={t("e.g. openrouter/*:free or re:…")}
                onChange={(e) => setPatIn(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") addPattern();
                  if (e.key === "Escape") askClose();
                }}
              />
              <button type="button" className="text" onClick={addPattern}>
                {t("Add pattern")}
              </button>
            </div>
          </div>
          <div className="hint">
            {t(
              "Every model a pattern matches is in the group, now and as providers list new ones, after the models above: * is any run of characters in provider/model, re: starts a regular expression.",
            )}
          </div>
        </div>

        <label>{t("Model lists")}</label>
        <div>
          <Segs
            className="list-pick"
            value={draft.unlists}
            items={LIST_OPTS.map((o) => ({ id: o.id, label: t(o.label) }))}
            onChange={(v) => setDraft((d) => ({ ...d, unlists: v }))}
            aria-label={t("Model lists")}
          />
          <div className="hint">{t(LIST_HINT[draft.unlists])}</div>
        </div>

        <label>{t("Routing")}</label>
        <div>
          <Segs
            value={draft.routing}
            items={GROUP_ROUTE_OPTS.map((o) => ({ id: o.id, label: t(o.label) }))}
            onChange={(v) => setDraft((d) => ({ ...d, routing: v }))}
            aria-label={t("Routing")}
          />
          <div className="hint">{t(GROUP_HINT[draft.routing] || GROUP_HINT[""])}</div>
          <div className="hint">{t(GROUP_NEST)}</div>
        </div>

        {sinkable ? (
          <>
            <label>{t("Rate limited")}</label>
            <div className="sink-wrap">
              <Segs
                className="sink-pick"
                value={draft.sink}
                items={SINK_OPTS.map((o) => ({ id: o.id, label: t(o.label) }))}
                onChange={(v) => setDraft((d) => ({ ...d, sink: v }))}
                aria-label={t("Rate limited")}
              />
              <div className="hint">{t(SINK_HINT[draft.sink])}</div>
            </div>
          </>
        ) : null}

        <label>{t("Slow to start")}</label>
        <div className="ctx-wrap first-wrap">
          <Segs
            value={firstMode as 0 | 30 | 60 | 120 | "custom"}
            items={FIRST_OPTS.map((o) => ({ id: o.id, label: t(o.label) }))}
            onChange={(v) => {
              setFirstErr("");
              if (v === "custom") {
                setDraft((d) => ({
                  ...d,
                  firstCustom: true,
                  firstToken: d.firstToken > 0 ? d.firstToken : 300,
                }));
              } else {
                setDraft((d) => ({ ...d, firstCustom: false, firstToken: v as number }));
              }
            }}
            aria-label={t("Slow to start")}
          />
          {draft.firstCustom ? (
            <>
              <input
                className="ctx-in first-in"
                type="text"
                inputMode="decimal"
                aria-label={t("Minutes")}
                value={draft.firstToken > 0 ? String(+(draft.firstToken / 60).toFixed(2)) : ""}
                placeholder={t("e.g. 5")}
                onChange={(e) => {
                  const v = e.target.value.trim().replace(",", ".");
                  const n = /^\d+(?:\.\d+)?$/.test(v) ? Math.round(+v * 60) : 0;
                  setFirstErr(n > 0 ? "" : t("{v} is not a number of minutes", { v: e.target.value.trim() }));
                  if (n > 0) setDraft((d) => ({ ...d, firstToken: n }));
                }}
              />
              <span className="first-unit">{t("min")}</span>
            </>
          ) : null}
          <div className="hint">{firstHint}</div>
        </div>

        <label>{t("Every member busy")}</label>
        <div>
          <Segs
            value={draft.patience}
            items={PATIENCE_OPTS.map((o) => ({ id: o.id, label: t(o.label) }))}
            onChange={(v) => setDraft((d) => ({ ...d, patience: v }))}
            aria-label={t("Every member busy")}
          />
          <div className="hint">{patienceHint}</div>
        </div>

        <label>{t("Context")}</label>
        <div className="ctx-wrap">
          <Segs
            value={draft.context}
            items={CTX_OPTS.map((o) => ({ id: o.id, label: t(o.label) }))}
            onChange={(v) => {
              setCtxErr("");
              setDraft((d) => ({
                ...d,
                context: v,
                contextTokens: v === "custom" ? d.contextTokens || "200k" : d.contextTokens,
              }));
            }}
            aria-label={t("Context")}
          />
          {draft.context === "custom" ? (
            <input
              className="ctx-in"
              type="text"
              aria-label={t("Context")}
              value={draft.contextTokens}
              placeholder={t("e.g. 200k")}
              onChange={(e) => {
                const raw = e.target.value;
                const m = raw
                  .trim()
                  .toLowerCase()
                  .replace(/_/g, "")
                  .match(/^(\d+(?:\.\d+)?)\s*([km]?)$/);
                setCtxErr(m ? "" : t("{v} is not a length of tokens like 200k or 1m", { v: raw.trim() }));
                setDraft((d) => ({ ...d, contextTokens: raw }));
              }}
            />
          ) : null}
          <div className="hint">{ctxHint}</div>
        </div>

        <label>{t("Stays")}</label>
        <div>
          <Segs
            value={draft.affinity}
            items={AFF_OPTS.map((o) => ({ id: o.id, label: t(o.label) }))}
            onChange={(v) => setDraft((d) => ({ ...d, affinity: v }))}
            aria-label={t("Stays")}
          />
          <div className="hint">{t(AFF_HINT[draft.affinity] || AFF_HINT[""])}</div>
        </div>

        <label>{t("Rules")}</label>
        <div>
          <div className="fallback rt-rules">
            <div className="fbl" />
            {draft.members.length >= 2 ? (
              <div className="rt-gadds">
                <button type="button" className="rt-gadd">
                  <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                    <path d="M8 3.5v9M3.5 8h9" />
                  </svg>
                  <span>{t("Add a rule")}</span>
                </button>
                <button type="button" className="rt-gadd">
                  <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                    <path d="M8 3.5v9M3.5 8h9" />
                  </svg>
                  <span>{t("Route by what it asks for")}</span>
                </button>
              </div>
            ) : null}
          </div>
          <div className="hint">
            {t(
              draft.members.length < 2
                ? "With two models or more, a rule can send some turns to one of them first."
                : draft.routing === "manual"
                  ? "The rules wait while you pick the model by hand."
                  : "Checked top first when you send a message: the first that matches sends that turn to its model first; the rest stay behind it if it fails. A turn under way is never moved.",
            )}
          </div>
        </div>

        <label>{t("Effort")}</label>
        <div>
          <Segs
            value={draft.effort}
            items={[
              { id: "" as const, label: t("Agent's") },
              { id: "auto" as const, label: t("Picked per turn") },
            ]}
            onChange={(v) => setDraft((d) => ({ ...d, effort: v }))}
            aria-label={t("Effort")}
          />
          <div className="hint">
            {t(
              draft.effort === "auto"
                ? "As a turn begins, the classifier rates how hard it is and the turn's requests ask their model for low, medium, high or xhigh reasoning — the level each model has nearest. Only where the agent asked for reasoning: a request without any (a session title) stays without."
                : "Each request reasons as much as the agent asked.",
            )}
          </div>
        </div>

        <label>{t("Levels")}</label>
        <div>
          <Segs
            value={draft.levelsOwn ? "own" : ""}
            items={[
              { id: "" as const, label: t("Its models' shared") },
              { id: "own" as const, label: t("Named") },
            ]}
            onChange={(v) => setDraft((d) => ({ ...d, levelsOwn: v === "own" }))}
            aria-label={t("Levels")}
          />
          {draft.levelsOwn ? (
            <div className="rt-levels">
              {LEVELS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`rt-cond${draft.levels.includes(v) ? " on" : ""}`}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      levels: d.levels.includes(v) ? d.levels.filter((x) => x !== v) : LEVELS.filter((x) => x === v || d.levels.includes(x)),
                    }))
                  }
                >
                  {v}
                </button>
              ))}
            </div>
          ) : null}
          <div className="hint">
            {t(
              draft.levelsOwn
                ? "Agents are offered these. A model without the level asked is sent the one it has nearest."
                : "Agents are offered the levels every model has.",
            )}
          </div>
        </div>

        <div className="bar" style={{ gridColumn: "1 / -1" }}>
          <span className="grow" />
          <button type="button" className="text" onClick={askClose}>
            {t("Cancel")}
          </button>
          <button type="button" className="text primary" onClick={save}>
            {t("Add")}
          </button>
        </div>
      </div>

      {discardOpen ? (
        <div
          className="modal"
          style={{ zIndex: 40, background: "rgba(20,22,30,.35)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDiscardOpen(false);
          }}
        >
          <div className="dialog sm" role="alertdialog" aria-labelledby="rtDiscardTitle" style={{ animation: "pop-in .28s var(--ease)", maxWidth: 360 }}>
            <div className="ehead" style={{ padding: "14px 16px 0" }}>
              <b id="rtDiscardTitle">{t("Discard")}</b>
            </div>
            <p style={{ margin: "10px 16px 0", fontSize: 13, color: "var(--fg-2)", lineHeight: 1.45 }}>
              {t("Discard unsaved changes? Your changes will be lost.")}
            </p>
            <div className="bar" style={{ padding: "14px 16px" }}>
              <span className="grow" />
              <button type="button" className="text" onClick={() => setDiscardOpen(false)}>
                {t("Cancel")}
              </button>
              <button
                type="button"
                className="text"
                style={{ background: "var(--red)", color: "#fff", borderColor: "var(--red)" }}
                onClick={doDiscard}
              >
                {t("Discard")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
