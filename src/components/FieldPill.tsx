import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

const CHEV = (
  <svg viewBox="0 0 12 12" width={10} height={10} aria-hidden>
    <path
      d="M3 4.5 6 7.5 9 4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  /** Magpie `.k` — faint key label (e.g. Model). */
  k?: ReactNode;
  /** Magpie `.v` — value text. */
  v?: ReactNode;
  /** Extra content before chevron (icons, ic-stack). */
  leading?: ReactNode;
  trailing?: ReactNode;
  open?: boolean;
  /** `main` | `solo` | `extra` Magpie field modifiers. */
  kind?: "main" | "solo" | "extra" | "";
  showChevron?: boolean;
  className?: string;
};

/**
 * Magpie model/row pill: `button.field` with `.k` / `.v` / `.chev`.
 * CIS: Agents / tray / Providers model rows — no one-off border/height styles.
 */
export const FieldPill = forwardRef<HTMLButtonElement, Props>(function FieldPill(
  {
    k,
    v,
    leading,
    trailing,
    open,
    kind = "",
    showChevron = true,
    className,
    type = "button",
    ...rest
  },
  ref,
) {
  const cls = ["field", kind, open ? "open" : "", className || ""].filter(Boolean).join(" ");
  return (
    <button type={type} className={cls} aria-expanded={open} ref={ref} {...rest}>
      {leading}
      {k != null ? <span className="k">{k}</span> : null}
      {v != null ? <span className="v">{v}</span> : null}
      {trailing}
      {showChevron ? <span className="chev">{CHEV}</span> : null}
    </button>
  );
});
