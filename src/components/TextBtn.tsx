import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

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
export const TextBtn = forwardRef<HTMLButtonElement, Props>(function TextBtn(
  {
    variant = "text",
    busy,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref,
) {
  const mods = [
    "text",
    variant !== "text" ? variant : "",
    busy ? "busy" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={mods} disabled={disabled || busy} ref={ref} {...rest}>
      {children}
    </button>
  );
});
