import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { t } from "../i18n";

export type PopOption = {
  value: string;
  label: string;
  note?: string;
  icon?: string;
  reset?: boolean;
  group?: string;
  ref?: string;
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

const FAV_KEY = "magpie.modelFavorites";

function loadFavs(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw.map(String) : []);
  } catch {
    return new Set();
  }
}

function favKey(o: PopOption) {
  return o.ref || o.value;
}

/** Magpie #pop: pop-fade .18s + pop-in .42s; leaving pop-out .22s; model-picker left rail. */
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
  const railRef = useRef<HTMLElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const [q, setQ] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [groupFilter, setGroupFilter] = useState<"all" | "favorites" | string>("all");
  const [favs, setFavs] = useState<Set<string>>(() => loadFavs());
  const [pos, setPos] = useState<{ top: number; left: number; ox: number; up: boolean; w: number; h: number } | null>(null);
  const shown = open || leaving;

  useEffect(() => {
    if (open) {
      setLeaving(false);
      setQ("");
      setGroupFilter("all");
      setFavs(loadFavs());
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

  useLayoutEffect(() => {
    if (!shown || !modelPicker || !railRef.current || !thumbRef.current) return;
    const rail = railRef.current;
    const active = rail.querySelector(`.rail-item[data-group="${CSS.escape(groupFilter)}"]`) as HTMLElement | null;
    const thumb = thumbRef.current;
    if (!active) {
      thumb.style.opacity = "0";
      return;
    }
    const top = active.offsetTop;
    thumb.style.transform = `translateY(${top}px)`;
    thumb.style.opacity = "1";
  }, [shown, modelPicker, groupFilter, options.length]);

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

  const toggleFav = (o: PopOption) => {
    const key = favKey(o);
    const next = new Set(favs);
    if (next.has(key) || next.has(o.value)) {
      next.delete(key);
      next.delete(o.value);
    } else {
      next.add(key);
    }
    setFavs(next);
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  };

  const isFav = (o: PopOption) => favs.has(favKey(o)) || favs.has(o.value);

  if (!shown || !pos) return null;

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let source = options;
  if (modelPicker && groupFilter === "favorites") {
    source = source.filter((o) => isFav(o));
  } else if (modelPicker && groupFilter !== "all") {
    source = source.filter((o) => (o.group || "") === groupFilter);
  }
  const filtered = source.filter((o) => {
    if (!words.length) return true;
    const hay = `${o.label} ${o.note || ""} ${o.value} ${o.group || ""}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });

  const groups: { title?: string; items: PopOption[] }[] = [];
  let cur: { title?: string; items: PopOption[] } | null = null;
  for (const o of filtered) {
    const g = o.reset || words.length ? undefined : o.group;
    if (!cur || cur.title !== g) {
      cur = { title: g, items: [] };
      groups.push(cur);
    }
    cur.items.push(o);
  }

  const railGroups = [...new Set(options.map((o) => o.group).filter(Boolean))] as string[];

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
        {modelPicker ? (
          <nav id="pickerRail" ref={railRef} aria-label={t("Model providers")}>
            <span className="rail-thumb" ref={thumbRef} aria-hidden />
            <button
              type="button"
              className={`rail-item${groupFilter === "all" ? " on" : ""}`}
              data-group="all"
              aria-label={t("All models")}
              onClick={() => setGroupFilter("all")}
            >
              <svg className="ic" viewBox="0 0 15 15" width={15} height={15} aria-hidden>
                <path d="M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z" fill="none" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
            <button
              type="button"
              className={`rail-item${groupFilter === "favorites" ? " on" : ""}`}
              data-group="favorites"
              aria-label={t("Favorites")}
              onClick={() => setGroupFilter("favorites")}
            >
              <svg className="ic" viewBox="0 0 16 16" width={16} height={16} aria-hidden>
                <path
                  d="m8 2 1.8 3.7 4.1.6-3 2.9.7 4.1L8 11.4l-3.6 1.9.7-4.1-3-2.9 4.1-.6z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {railGroups.length ? <span className="rail-sep" aria-hidden /> : null}
            {railGroups.map((g) => (
              <button
                type="button"
                key={g}
                className={`rail-item${groupFilter === g ? " on" : ""}`}
                data-group={g}
                aria-label={g}
                onClick={() => setGroupFilter(g)}
              >
                <span className="ic" aria-hidden style={{ fontSize: 11, lineHeight: 1 }}>
                  ◆
                </span>
              </button>
            ))}
          </nav>
        ) : null}
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
                  {modelPicker && o.value && !o.reset ? (
                    <button
                      type="button"
                      className={`favorite${isFav(o) ? " on" : ""}`}
                      title={isFav(o) ? t("Remove from favorites") : t("Add to favorites")}
                      aria-pressed={isFav(o)}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        toggleFav(o);
                      }}
                    >
                      <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden>
                        <path
                          d="m8 2 1.8 3.7 4.1.6-3 2.9.7 4.1L8 11.4l-3.6 1.9.7-4.1-3-2.9 4.1-.6z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  ) : null}
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
            q.trim() ? (
              <li
                className="custom"
                role="option"
                aria-selected={false}
                title={t("use as typed")}
                onClick={() => {
                  onPick(q.trim());
                  dismiss();
                }}
              >
                <span className="ic" aria-hidden>✦</span>
                <span className="name">{q.trim()}</span>
                <span className="note">{t("use as typed")}</span>
              </li>
            ) : (
              <div className="none">{t("No matches.")}</div>
            )
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
