import { PopoverPortal } from "./PopoverPortal";
import { useAnchoredPopover } from "../lib/useAnchoredPopover";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { menuKeyNavigation } from "../lib/popover";
import { t } from "../i18n";

export type ProtoOpt = {
  v: string;
  name: string;
  note?: string;
  literalName?: boolean;
  title?: string;
};

type Props = {
  open: boolean;
  anchor: HTMLElement | null;
  options: ProtoOpt[];
  /** Multi = array (live tick). Single = string. Empty v clears multi. */
  value: string[] | string;
  onChange: (next: string[] | string) => void;
  onClose: () => void;
  head?: string;
  menuClass?: string;
  align?: "left" | "right";
  /** Magpie live=true: choose on every tick, keep menu open */
  live?: boolean;
  hideHead?: boolean;
};

const CHECK =
  "M3.2 8.2 6.4 11.4 12.8 4.2";

/**
 * Magpie openProtoMenu (multi + live): checkbox ticks, All (v="") clears,
 * Escape / outside closes. Motions: pop-fade .18s + pop-in .42s.
 */
export function ProtoMultiMenu({
  open,
  anchor,
  options,
  value,
  onChange,
  onClose,
  head,
  menuClass = "",
  align = "right",
  live = true,
  hideHead = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const multi = Array.isArray(value);
  const [staged, setStaged] = useState<string[]>(() => multi ? value : []);
  const picked = multi ? (live ? value : staged) : [];
  const stagedRef = useRef(staged);
  const shown = open;

  const isOn = (v: string) =>
    !multi
      ? v === value
      : v === ""
        ? !picked!.length
        : picked!.includes(v);

  useLayoutEffect(() => {
    if (open && Array.isArray(value)) {
      stagedRef.current = [...value];
      setStaged([...value]);
    }
  }, [open, value]);

  useAnchoredPopover(ref, anchor, shown, { align });
  useLayoutEffect(() => {
    if (!open) return;
    ref.current?.querySelector<HTMLElement>(".pm-item.on, .pm-item")?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
        anchor?.focus({ preventScroll: true });
      } else if (ref.current) menuKeyNavigation(ref.current, e);
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor?.contains(t)) return;
      close();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onDown, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onDown, true);
    };
    // close reads the staged ref so outside/Escape commit the latest ticks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, anchor, live, value, onChange, onClose]);

  const close = () => {
    if (multi && !live) {
      const next = options.map(o => o.v).filter(v => stagedRef.current.includes(v));
      if (next.length !== value.length || next.some(v => !value.includes(v))) onChange(next);
    }
    // Native closeProtoMenu removes app menus immediately; model pickers
    // use the separate 220ms .leaving recipe.
    onClose();
  };

  if (!shown) return null;

  const pick = (v: string) => {
    if (v === "\x00") return;
    if (!multi) {
      onChange(v);
      close();
      return;
    }
    if (!v) {
      stagedRef.current = [];
      setStaged([]);
      if (live) onChange([]);
      close();
      return;
    }
    const next = picked!.includes(v)
      ? picked!.filter((x) => x !== v)
      : [...picked!, v];
    stagedRef.current = next;
    setStaged(next);
    if (live) onChange(options.map(o => o.v).filter(v => next.includes(v)));
  };

  return (
    <PopoverPortal><div
      data-anchored
      ref={ref}
      className={`pop proto-menu${menuClass ? " " + menuClass : ""}`}
      role="menu"
    >
      {!hideHead && head ? <div className="pm-head">{t(head)}</div> : null}
      {options.map((o) => {
        const on = isOn(o.v);
        return (
          <button
            type="button"
            key={o.v || "__all__"}
            className={`pm-item${on ? " on" : ""}`}
            role={multi && o.v ? "menuitemcheckbox" : "menuitemradio"}
            aria-checked={on}
            title={o.title || o.note || undefined}
            onClick={(e) => {
              e.stopPropagation();
              pick(o.v);
            }}
          >
            <span className="pm-tick" aria-hidden>
              {on ? (
                <svg viewBox="0 0 16 16" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d={CHECK} />
                </svg>
              ) : null}
            </span>
            <span className="pm-words">
              <span className="pm-name">{o.literalName ? o.name : t(o.name)}</span>
              {o.note ? <span className="pm-note">{t(o.note)}</span> : null}
            </span>
          </button>
        );
      })}
    </div></PopoverPortal>
  );
}
