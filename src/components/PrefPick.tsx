import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

const CHEV = (
  <svg viewBox="0 0 16 16" width={11} height={11} aria-hidden>
    <path
      d="M4 6l4 4 4-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  /** Visible label inside the pick. */
  label: ReactNode;
  open?: boolean;
  /** Magpie `.set` when a non-default value is chosen. */
  set?: boolean;
  /** Extra classes e.g. `font-family`, `proto pick`. Base is always `sess-pick pref-pick`. */
  className?: string;
  chevron?: ReactNode;
};

/**
 * Magpie Settings/menu pick: `.sess-pick.pref-pick` (+ `.open` / `.set`).
 * CIS: Language, font family/style, Usage refresh — not Ant Select.
 */
export const PrefPick = forwardRef<HTMLButtonElement, Props>(function PrefPick(
  { label, open, set, className, chevron = CHEV, type = "button", ...rest },
  ref,
) {
  const cls = [
    "sess-pick",
    "pref-pick",
    set ? "set" : "",
    open ? "open" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={cls} aria-expanded={open} ref={ref} {...rest}>
      <span>{label}</span>
      {chevron}
    </button>
  );
});
