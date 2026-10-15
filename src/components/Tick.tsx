import type { InputHTMLAttributes, ReactNode } from "react";

type Props = {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: InputHTMLAttributes<HTMLInputElement>["onChange"];
  disabled?: boolean;
  title?: string;
  className?: string;
  children: ReactNode;
  /** Forwarded to the checkbox for a11y. */
  "aria-label"?: string;
};

/**
 * Magpie `label.tick` + styled `input[type=checkbox]` (app.css — not OS chrome).
 * CIS: add-model / Sync / Export ticks. Do not inline flex/gap/font on the label.
 */
export function Tick({
  checked,
  defaultChecked,
  onChange,
  disabled,
  title,
  className,
  children,
  "aria-label": ariaLabel,
}: Props) {
  return (
    <label className={`tick${className ? ` ${className}` : ""}`} title={title}>
      <input
        type="checkbox"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel}
      />
      {children}
    </label>
  );
}
