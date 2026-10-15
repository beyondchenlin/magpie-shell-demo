import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "text" | "action" | "primary" | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  busy?: boolean;
  children?: ReactNode;
};

/**
 * Magpie text button: `.text` (+ `.action` / `.primary` / `.danger`).
 * CIS: use for footers, Restart-style bordered actions, accent CTAs — not Ant/shadcn Button.
 */
export function TextBtn({
  variant = "text",
  busy,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: Props) {
  const mods = [
    "text",
    variant !== "text" ? variant : "",
    busy ? "busy" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={mods} disabled={disabled || busy} {...rest}>
      {children}
    </button>
  );
}
