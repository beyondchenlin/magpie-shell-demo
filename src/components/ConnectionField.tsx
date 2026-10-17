import type { ReactNode } from "react";

/** Magpie gateway field(): label + content + hint, in the shared Connect grid. */
export function ConnectionField({ id, label, hint, children }: {
  id: string;
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return <>
    <label id={`${id}-label`}>{label}</label>
    <div role="group" aria-labelledby={`${id}-label`}>
      {children}
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  </>;
}
