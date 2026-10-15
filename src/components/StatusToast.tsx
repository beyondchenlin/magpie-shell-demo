import type { HTMLAttributes } from "react";

type Kind = "ok" | "err" | "warn" | string;

type Props = Omit<HTMLAttributes<HTMLSpanElement>, "children" | "id"> & {
  /** Toast text; empty = idle footer slot. */
  msg?: string | null;
  /** Magpie kind → `.ok` / `.err` / `.warn`. */
  kind?: Kind | null;
  /** Magpie `.lift` when a `.modal` is open over the foot. */
  lift?: boolean;
};

/**
 * Magpie foot toast: `span#status.status` (+ kind / `.lift`).
 * CIS §2.6 / §10 — shell owns show/hide timing; this only maps DOM.
 */
export function StatusToast({ msg, kind, lift, className, role, title, ...rest }: Props) {
  const text = msg || "";
  const cls = [
    "status",
    text && kind ? kind : "",
    text && lift ? "lift" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span
      id="status"
      className={cls}
      role={role ?? (kind === "err" ? "alert" : "status")}
      aria-atomic="true"
      title={title ?? (text || undefined)}
      {...rest}
    >
      {text}
    </span>
  );
}
