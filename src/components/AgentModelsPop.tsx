import { PopoverPortal } from "./PopoverPortal";
import { useAnchoredPopover } from "../lib/useAnchoredPopover";
import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "../i18n";

export type AmModel = {
  id: string;
  name: string;
  group: string;
  on: boolean;
};

type Props = {
  open: boolean;
  anchor: HTMLElement | null;
  agentName: string;
  models: AmModel[];
  onChange: (next: AmModel[]) => void;
  onClose: () => void;
};

/** Magpie `.pop.am-pop` — agent model list (Pick), not `#pop` field picker. */
export function AgentModelsPop({
  open,
  anchor,
  agentName,
  models,
  onChange,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<"all" | "shown" | "order">("all");
  const [group, setGroup] = useState("all");
  const [leaving, setLeaving] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const shown = open || leaving;
  const railed = new Set(models.map(model => model.group)).size > 1;

  useEffect(() => {
    if (open) {
      clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
      setLeaving(false);
      setQ("");
      setSeg("all");
      setGroup("all");
    }
  }, [open]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useAnchoredPopover(ref, anchor, shown, { maxHeight: 560, gap: 8, dx: -10, arrowMaxWidth: 60, arrowInset: 18 });

  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
        anchor?.focus({ preventScroll: true });
      }
    };
    const onDown = (e: MouseEvent) => {
      const p = ref.current;
      if (!p) return;
      if (p.contains(e.target as Node) || anchor?.contains(e.target as Node)) return;
      dismiss();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onDown, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onDown, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, anchor]);

  const dismiss = () => {
    if (closeTimer.current) return;
    setLeaving(true);
    closeTimer.current = setTimeout(() => {
      closeTimer.current = undefined;
      setLeaving(false);
      onClose();
    }, 220);
  };

  const groups = useMemo(() => {
    const g = new Map<string, number>();
    for (const m of models) g.set(m.group, (g.get(m.group) || 0) + 1);
    return [...g.entries()];
  }, [models]);

  const filtered = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return models.filter((m) => {
      if (seg === "shown" && !m.on) return false;
      if (group !== "all" && m.group !== group) return false;
      if (!words.length) return true;
      const hay = `${m.name} ${m.id} ${m.group}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [models, q, seg, group]);

  const byGroup = useMemo(() => {
    const map = new Map<string, AmModel[]>();
    for (const m of filtered) {
      if (!map.has(m.group)) map.set(m.group, []);
      map.get(m.group)!.push(m);
    }
    return [...map.entries()];
  }, [filtered]);

  if (!shown) return null;

  const toggle = (id: string) => {
    onChange(models.map((m) => (m.id === id ? { ...m, on: !m.on } : m)));
  };

  const setGroupAll = (g: string, on: boolean) => {
    onChange(models.map((m) => (m.group === g ? { ...m, on } : m)));
  };

  return (
    <PopoverPortal><div
      data-anchored
      className={`pop am-pop${leaving ? " leaving" : ""}${seg === "order" ? " ordering" : ""}`}
      ref={ref}
      role="dialog"
      aria-label={t("{agent}'s model list", { agent: agentName })}
      style={{
        width: railed ? 580 : 380,
      }}>
      <div className="am-head">
        <div className="am-t">{t("{agent}'s model list", { agent: agentName })}</div>
        <div className="am-d">
          {t("Models turned off don't show in {agent}'s model picker; other agents can still use them.", {
            agent: agentName,
          })}
        </div>
      </div>
      <div className="am-tools">
        <label className="am-search">
          <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden>
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            spellCheck={false}
            autoComplete="off"
            placeholder={t("Search models")}
            value={q}
            autoFocus
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div className="am-seg" role="group">
          {(
            [
              ["all", t("All")],
              ["shown", t("Shown")],
              ["order", t("Order")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={seg === id ? "on" : ""}
              onClick={() => setSeg(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="am-body">
        {railed ? <nav className="am-rail" aria-label={t("Model providers")}>
          <button
            type="button"
            className={`am-ri${group === "all" ? " on" : ""}`}
            onClick={() => setGroup("all")}>
            <span className="rn">{t("All models")}</span>
            <span className="c">{models.length}</span>
          </button>
          {groups.map(([g, n]) => (
            <button
              key={g}
              type="button"
              className={`am-ri${group === g ? " on" : ""}`}
              onClick={() => setGroup(g)}>
              <span className="rn">{g}</span>
              <span className="c">{n}</span>
            </button>
          ))}
        </nav> : null}
        <div className="am-list">
          {byGroup.map(([g, rows]) => (
            <div className="am-g" key={g}>
              <div className="am-gh">
                <button type="button" className="am-fold" tabIndex={-1}>
                  <span className="tw" aria-hidden>
                    <svg viewBox="0 0 12 12" width={10} height={10}>
                      <path
                        d="M4.5 2.5 8 6l-3.5 3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <span className="gn">{g}</span>
                  <span className="c">{rows.length}</span>
                </button>
                <button
                  type="button"
                  className="am-all"
                  onClick={() => setGroupAll(g, !rows.every((m) => m.on))}>
                  {rows.every((m) => m.on) ? t("Hide all") : t("Show all")}
                </button>
              </div>
              <div className="am-rows">
                {rows.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`am-mr${m.on ? "" : " off"}${seg === "order" ? " am-or" : ""}`}
                    role="menuitemcheckbox"
                    aria-checked={m.on}
                    onClick={() => toggle(m.id)}
                    style={
                      seg === "order"
                        ? { cursor: "grab" }
                        : undefined
                    }
                    draggable={seg === "order"}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", m.id);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = e.dataTransfer.getData("text/plain");
                      if (!from || from === m.id) return;
                      const next = models.slice();
                      const fi = next.findIndex((x) => x.id === from);
                      const ti = next.findIndex((x) => x.id === m.id);
                      if (fi < 0 || ti < 0) return;
                      const [item] = next.splice(fi, 1);
                      next.splice(ti, 0, item);
                      onChange(next);
                    }}>
                    {seg === "order" ? (
                      <span className="ix" aria-hidden>
                        {i + 1}
                      </span>
                    ) : null}
                    <span className="n">{m.name}</span>
                    {seg !== "order" ? (
                      <span className="ck" aria-hidden>
                        {m.on ? (
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                            <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : null}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!filtered.length ? (
            <div className="none">
              {t("No matches.")}
            </div>
          ) : null}
        </div>
      </div>
    </div></PopoverPortal>
  );
}
