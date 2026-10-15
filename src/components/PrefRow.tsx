import type { ReactNode } from "react";

/**
 * Magpie Settings row: `.row.pref` + `.who` / `.name` / `.sub` + `.val`.
 * CIS: consume this for Settings / add-model pref lines — do not invent one-off row layouts.
 */
export function PrefRow({
  name,
  sub,
  subTitle,
  children,
  id,
  hidden,
  className,
  valClassName,
}: {
  name: string;
  sub?: ReactNode;
  subTitle?: string;
  children?: ReactNode;
  id?: string;
  hidden?: boolean;
  className?: string;
  valClassName?: string;
}) {
  if (hidden) return null;
  return (
    <div className={`row pref${className ? ` ${className}` : ""}`} id={id}>
      <div className="who">
        <div className="name" title={name}>
          {name}
        </div>
        {sub ? (
          <div className="sub" title={subTitle ?? (typeof sub === "string" ? sub : undefined)}>
            {sub}
          </div>
        ) : null}
      </div>
      {children != null ? (
        <div className={`val${valClassName ? ` ${valClassName}` : ""}`}>{children}</div>
      ) : null}
    </div>
  );
}
