import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { t } from "../i18n";

export type PopOption = {
  value: string;
  label: string;
  note?: string;
  icon?: string;
  reset?: boolean;
  group?: string;
};

type Props = {
  open: boolean;
  anchor: HTMLElement | null;
  options: PopOption[];
  value: string;
  modelPicker?: boolean;
  placeholder?: string;
  onPick: (value: string) => void;
  onClose: () => void;
};

/** Magpie #pop: pop-fade .18s + pop-in .42s; leaving pop-out .22s */
export function ModelPop({
  open,
  anchor,
  options,
  value,
  modelPicker = true,
  placeholder,
  onPick,
  onClose,
}: Props) {
  const popRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; ox: number; up: boolean; w: number; h: number } | null>(null);
  const shown = open || leaving;

  useEffect(() => {
    if (open) {
      setLeaving(false);
      setQ("");
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !anchor || !popRef.current) return;
    const r = anchor.getBoundingClientRect();
    const w = modelPicker ? Math.min(490, window.innerWidth - 16) : 320;
    const h = modelPicker ? Math.min(420, window.innerHeight - 16) : 340;
    let left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
    let top = r.bottom + 6;
    let up = false;
    if (top + Math.min(h, 280) > window.innerHeight - 8) {
      top = Math.max(8, r.top - 6);
      up = true;
    }
    const ox = Math.min(Math.max(16, r.left + r.width / 2 - left), w - 16);
    setPos({ top: up ? top - h : top, left, ox, up, w, h });
  }, [open, anchor, modelPicker, options.length]);

  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      }
    };
    const onDown = (e: MouseEvent) => {
      const p = popRef.current;
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
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => {
      setLeaving(false);
      onClose();
    }, 220);
  };

  if (!shown || !pos) return null;

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = options.filter((o) => {
    if (!words.length) return true;
    const hay = `${o.label} ${o.note || ""} ${o.value} ${o.group || ""}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });

  const groups: { title?: string; items: PopOption[] }[] = [];
  let cur: { title?: string; items: PopOption[] } | null = null;
  for (const o of filtered) {
    const g = o.reset ? undefined : o.group;
    if (!cur || cur.title !== g) {
      cur = { title: g, items: [] };
      groups.push(cur);
    }
    cur.items.push(o);
  }

  return (
    <div
      id="pop"
      ref={popRef}
      className={`pop${modelPicker ? " model-picker" : ""}${pos.up ? " up" : ""}${leaving ? " leaving" : ""}`}
      style={{
        top: pos.up ? undefined : pos.top,
        bottom: pos.up ? window.innerHeight - pos.top : undefined,
        left: pos.left,
        width: pos.w,
        maxHeight: pos.h,
        ["--ox" as string]: `${pos.ox}px`,
      }}
      role="listbox"
    >
      <div className="search">
        <svg viewBox="0 0 16 16" width={13} height={13}>
          <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          spellCheck={false}
          autoComplete="off"
          placeholder={placeholder || t("Filter, or type any model id…")}
          value={q}
          autoFocus
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q.trim() && !filtered.some((o) => o.value === q.trim())) {
              onPick(q.trim());
              dismiss();
            }
          }}
        />
      </div>
      <div className="picker-body">
        <ul id="list">
          {groups.map((g, gi) => (
            <span key={gi}>
              {g.title ? <li className="group">{g.title}</li> : null}
              {g.items.map((o) => (
                <li
                  key={o.value || o.label}
                  className={`${o.reset ? "reset " : ""}${o.value === value ? "cur sel" : ""}`.trim()}
                  role="option"
                  aria-selected={o.value === value}
                  onClick={() => {
                    onPick(o.value);
                    dismiss();
                  }}
                >
                  <span className="ic" aria-hidden>
                    {o.icon === "openai" || !o.icon ? "◎" : "◆"}
                  </span>
                  <span className="option-words">
                    <span className="v">{o.label}</span>
                    {o.note ? <span className="n">{o.note}</span> : null}
                  </span>
                  {o.value === value ? (
                    <span className="check" aria-hidden>
                      ✓
                    </span>
                  ) : null}
                </li>
              ))}
            </span>
          ))}
          {!filtered.length ? (
            <li className="group" style={{ pointerEvents: "none" }}>
              {t("No models match “{q}”", { q: q.trim() })}
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

type ChipProps = {
  label: string;
  display: ReactNode;
  open: boolean;
  onToggle: (el: HTMLButtonElement) => void;
  chipRef?: (el: HTMLButtonElement | null) => void;
};

/** Magpie .rt-cond.on chip that opens #pop */
export function PrefPickChip({ label, display, open, onToggle, chipRef }: ChipProps) {
  return (
    <button
      type="button"
      className={`rt-cond on${open ? " open" : ""}`}
      aria-label={label}
      aria-haspopup="listbox"
      aria-expanded={open}
      ref={chipRef}
      onClick={(e) => onToggle(e.currentTarget)}
    >
      {display}
    </button>
  );
}
