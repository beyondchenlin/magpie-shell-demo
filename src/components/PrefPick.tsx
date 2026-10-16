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
  /** Magpie font controls use `.proto.pick`, without the menu pick's 45% cap. */
  variant?: "menu" | "protocol";
  /** Extra classes, e.g. font-family. `variant` selects the base DOM recipe. */
  className?: string;
  chevron?: ReactNode;
};

/**
 * Magpie Settings/menu pick: `.sess-pick.pref-pick` (+ `.open` / `.set`).
 * CIS: Language, font family/style, Usage refresh — not Ant Select.
 */
export const PrefPick = forwardRef<HTMLButtonElement, Props>(function PrefPick(
  { label, open, set, variant = "menu", className, chevron = CHEV, type = "button", ...rest },
  ref,
) {
  const cls = [
    variant === "protocol" ? "proto pick" : "sess-pick pref-pick",
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
