import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const [leaving, setLeaving] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const multi = Array.isArray(value);
  const picked = multi ? value : null;
  const shown = open || leaving;

  const isOn = (v: string) =>
    !multi
      ? v === value
      : v === ""
        ? !picked!.length
        : picked!.includes(v);

  useEffect(() => {
    if (open) setLeaving(false);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !anchor || !ref.current) return;
    const r = anchor.getBoundingClientRect();
    const w = Math.min(190, window.innerWidth - 16);
    const h = Math.min(320, window.innerHeight - 16);
    let left =
      align === "right"
        ? Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8)
        : Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
    let top = r.bottom + 6;
    let up = false;
    if (top + Math.min(h, 200) > window.innerHeight - 8) {
      top = Math.max(8, r.top - 6);
      up = true;
    }
    setPos({ top, left, up });
  }, [open, anchor, align, options.length]);

  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
        anchor?.focus({ preventScroll: true });
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, anchor]);

  const close = () => {
    if (leaving) return;
    setLeaving(true);
    const box = ref.current;
    if (!box) {
      onClose();
      return;
    }
    const a = box.animate(
      [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.96)" }],
      { duration: 180, easing: "cubic-bezier(.4,0,.7,.2)", fill: "forwards" },
    );
    a.finished.then(() => onClose(), () => onClose());
  };

  if (!shown || !pos) return null;

  const pick = (v: string) => {
    if (!multi) {
      onChange(v);
      close();
      return;
    }
    if (!v) {
      onChange([]);
      if (live) {
        /* keep open until outside; Magpie closes All */
        close();
      }
      return;
    }
    const next = picked!.includes(v)
      ? picked!.filter((x) => x !== v)
      : [...picked!, v];
    onChange(next);
    if (!live) {
      /* wait until close */
    }
  };

  return (
    <div
      ref={ref}
      className={`pop proto-menu${menuClass ? " " + menuClass : ""}${leaving ? " leaving" : ""}`}
      role="menu"
      style={{
        position: "fixed",
        top: pos.up ? undefined : pos.top,
        bottom: pos.up ? window.innerHeight - pos.top : undefined,
        left: pos.left,
        zIndex: 80,
        animation: leaving
          ? undefined
          : "pop-fade .18s ease-out, pop-in .42s cubic-bezier(.16,1,.3,1)",
      }}
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
    </div>
  );
}
