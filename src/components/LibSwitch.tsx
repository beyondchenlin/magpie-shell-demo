import type { ButtonHTMLAttributes } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "role"> & {
  on: boolean;
  /** Extra Magpie class (e.g. `pswitch`, `ag-conn`, `use-credits`). */
  kind?: string;
};

/**
 * Magpie `.lib-switch` — track + thumb `i`, `.on` = `--fg` (not accent).
 * CIS: Providers / Agents / Features toggles. Motion: bg + thumb .18s `--ease`.
 */
export function LibSwitch({ on, kind, className, title, ...rest }: Props) {
  const cls = ["lib-switch", kind || "", on ? "on" : "", className || ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type="button"
      className={cls}
      role="switch"
      aria-checked={on}
      title={title}
      {...rest}
    >
      <i />
    </button>
  );
}
