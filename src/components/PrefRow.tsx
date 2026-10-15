import type { ReactNode } from "react";

/**
 * Magpie Settings row: `.row.pref` + `.who` / `.name` / `.sub` + `.val`.
 * CIS: consume this for Settings / add-model pref lines — do not invent one-off row layouts.
 */
export function PrefRow({
  name,
  sub,
  subTitle,
  subClassName,
  afterWho,
  children,
  id,
  hidden,
  className,
  valClassName,
  wrapVal = true,
  dataPattern,
  dataUser,
}: {
  name: string;
  sub?: ReactNode;
  subTitle?: string;
  /** Extra class on `.sub` (Magpie `.sub.wraps` / `.sub.err` / `.sub.revealed`). */
  subClassName?: string;
  /** Extra sibling nodes under `.who` (e.g. Magpie `#proxyCheck` / CLI shells). */
  afterWho?: ReactNode;
  children?: ReactNode;
  id?: string;
  hidden?: boolean;
  className?: string;
  valClassName?: string;
  /**
   * Magpie default: children in `.val`.
   * Set false for Magpie font-row (`.font-controls` sibling of `.who`, no `.val`).
   */
  wrapVal?: boolean;
  /** Magpie `data-pattern` on disabled-model rows. */
  dataPattern?: string;
  /** Magpie AutoResetOwn `dataset.user` on `.ar-own` rows (app.js ~22250). */
  dataUser?: string;
}) {
  if (hidden) return null;
  const body =
    children == null ? null : wrapVal ? (
      <div className={`val${valClassName ? ` ${valClassName}` : ""}`}>{children}</div>
    ) : (
      children
    );
  return (
    <div
      className={`row pref${className ? ` ${className}` : ""}`}
      id={id}
      data-pattern={dataPattern}
      data-user={dataUser}
    >
      <div className="who">
        <div className="name" title={name}>
          {name}
        </div>
        {sub ? (
          <div
            className={`sub${subClassName ? ` ${subClassName}` : ""}`}
            title={subTitle ?? (typeof sub === "string" ? sub : undefined)}
          >
            {sub}
          </div>
        ) : null}
        {afterWho}
      </div>
      {body}
    </div>
  );
}
