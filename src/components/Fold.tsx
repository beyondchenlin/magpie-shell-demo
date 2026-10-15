import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

/** Magpie `.fold` chevron — rotate via CSS on `[aria-expanded]`. */
export function FoldChev({ size = 11 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden>
      <path
        d="M6 3.5 10.5 8 6 12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  /** Magpie `aria-expanded` — true = body shown. */
  expanded: boolean;
  /** Visible `.label` text. */
  label: ReactNode;
  /** Optional `.note` (count / brief). */
  note?: ReactNode;
  /** Id on the `.note` span (e.g. modelsCount / offCount). */
  noteId?: string;
  /** Extra after note (rare). */
  children?: ReactNode;
  className?: string;
};

/**
 * Magpie fold control: `button.fold` + chevron + `.label` (+ `.note`).
 * CIS §2.3 / §10 — Gateway Connect/Models, Providers Turned off.
 * Chevron motion is CSS (`.fold svg` .15s); do not invent mp-* fold styles.
 */
export const Fold = forwardRef<HTMLButtonElement, Props>(function Fold(
  {
    expanded,
    label,
    note,
    noteId,
    children,
    className,
    type = "button",
    ...rest
  },
  ref,
) {
  const cls = ["fold", className || ""].filter(Boolean).join(" ");
  return (
    <button
      type={type}
      className={cls}
      aria-expanded={expanded}
      ref={ref}
      {...rest}
    >
      <FoldChev />
      <span className="label">{label}</span>
      {note !== undefined || noteId ? <span className="note" id={noteId}>{note ?? ""}</span> : null}
      {children}
    </button>
  );
});
