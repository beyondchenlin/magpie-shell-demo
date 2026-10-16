import { MagpieIcon } from "./MagpieIcon";
import { PopoverPortal } from "./PopoverPortal";
import { useAnchoredPopover } from "../lib/useAnchoredPopover";
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { t } from "../i18n";
import { usePickerDismiss } from "../lib/pickerGhost";

export type PopOption = {
  value: string;
  label: string;
  note?: string;
  icon?: string;
  reset?: boolean;
  group?: string;
  ref?: string;
  custom?: boolean;
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
  /** Magpie multi member picker: stay open after pick */
  keepOpen?: boolean;
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
  keepOpen = false,
}: Props) {
  const popRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState<"all" | "favorites" | string>("all");
  const [favs, setFavs] = useState<Set<string>>(() => loadFavs());
  const shown = open;
  const dismiss = usePickerDismiss(popRef, open, anchor, onClose);
  const requestedWidth = modelPicker ? 490 : options.some(o => o.note && o.note !== o.value) ? 372 : 300;

  useEffect(() => {
    if (open) {
      setQ("");
      setGroupFilter("all");
      setFavs(loadFavs());
    }
  }, [open, anchor]);

  useAnchoredPopover(popRef, anchor, shown, { recipe: "model", requestedWidth, maxHeight: modelPicker ? 420 : 340 });

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
        e.stopPropagation();
        dismiss();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const items = [...(popRef.current?.querySelectorAll<HTMLElement>("li[role=option]") || [])];
        if (!items.length) return;
        e.preventDefault();
        e.stopPropagation();
        const at = items.findIndex(item => item.classList.contains("sel"));
        const from = at < 0 ? (e.key === "ArrowDown" ? items.length - 1 : 0) : at;
        const next = items[(from + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length];
        items.forEach(item => item.classList.toggle("sel", item === next));
        next.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter" && popRef.current?.contains(document.activeElement)) {
        const selected = popRef.current.querySelector<HTMLElement>("li.sel[role=option]");
        if (!selected) return;
        e.preventDefault();
        e.stopPropagation();
        selected.click();
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
  }, [shown, anchor, dismiss]);

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

  if (!shown) return null;

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
    <PopoverPortal><div
      data-anchored
      id="pop"
      ref={popRef}
      className={`pop${modelPicker ? " model-picker" : ""}`}
      style={{
        width: requestedWidth,
      }}
      role="listbox">
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
          autoFocus={!document.body.classList.contains("web") || !window.matchMedia("(pointer: coarse)").matches}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q.trim() && !filtered.some((o) => o.value === q.trim())) {
              onPick(q.trim());
              if (!keepOpen) dismiss();
              else setQ("");
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
              title={t("All models")}
              aria-label={t("All models")}
              onClick={() => setGroupFilter("all")}>
              <svg className="ic" viewBox="0 0 15 15" width={15} height={15} aria-hidden>
                <path d="M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z" fill="none" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
            <button
              type="button"
              className={`rail-item${groupFilter === "favorites" ? " on" : ""}`}
              data-group="favorites"
              title={t("Favorites")}
              aria-label={t("Favorites")}
              onClick={() => setGroupFilter("favorites")}>
              <svg className="ic" viewBox="0 0 16 16" width={16} height={16} aria-hidden>
                <path
                  d="m8 2 1.8 3.7 4.1.6-3 2.9.7 4.1L8 11.4l-3.6 1.9.7-4.1-3-2.9 4.1-.6z"
                  fill={groupFilter === "favorites" ? "currentColor" : "none"}
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
                onClick={() => setGroupFilter(g)}>
                <MagpieIcon name={options.find(o => o.group === g)?.icon || "generic"} />
              </button>
            ))}
          </nav>
        ) : null}
        <ul id="list">
          {groups.map((g, gi) => (
            <Fragment key={gi}>
              {g.title ? <li className="group">{g.title}</li> : null}
              {g.items.map((o) => (
                <li
                  key={o.value || o.label}
                  className={`${o.reset ? "reset " : ""}${o.value === value ? "cur sel" : ""}`.trim()}
                  role="option"
                  aria-selected={o.value === value}
                  onClick={() => {
                    onPick(o.value);
                    if (!keepOpen) dismiss();
                    else setQ("");
                  }}>
                  <MagpieIcon name={o.icon || "generic"} />
                  <span className="option-words">
                    <span className="v">{o.label}</span>
                    {o.note ? <span className="n">{o.note}</span> : null}
                  </span>
                  {modelPicker && o.value && !o.custom ? (
                    <button
                      type="button"
                      className={`favorite${isFav(o) ? " on" : ""}`}
                      title={isFav(o) ? t("Remove from favorites") : t("Add to favorites")}
                      aria-pressed={isFav(o)}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        toggleFav(o);
                      }}>
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
            </Fragment>
          ))}
          {!filtered.length ? (
            q.trim() ? (
              <li
                className="custom sel"
                role="option"
                aria-selected={true}
                title={t("use as typed")}
                onClick={() => {
                  onPick(q.trim());
                  if (!keepOpen) dismiss();
                  else setQ("");
                }}>
                <span className="ic" aria-hidden>✦</span>
                <span className="option-words">
                  <span className="v">{q.trim()}</span>
                  <span className="n">{t("use as typed")}</span>
                </span>
              </li>
            ) : (
              <div className="none">{t("No matches.")}</div>
            )
          ) : null}
        </ul>
      </div>
    </div></PopoverPortal>
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
      onClick={(e) => onToggle(e.currentTarget)}>
      {display}
    </button>
  );
}
