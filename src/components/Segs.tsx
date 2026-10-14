import { useSegThumb } from "./SegThumb";

export type SegItem<T extends string | number | boolean = string> = {
  id: T;
  label: string;
};

type Props<T extends string | number | boolean> = {
  value: T;
  items: SegItem<T>[];
  onChange: (id: T) => void;
  className?: string;
  title?: string;
  "aria-label"?: string;
};

/** Magpie segs(): .opt + sliding .thumb (280ms). */
export function Segs<T extends string | number | boolean>({
  value,
  items,
  onChange,
  className,
  title,
  "aria-label": ariaLabel,
}: Props<T>) {
  const dep = String(value);
  const setBox = useSegThumb(dep);
  const kind = items.map((x) => String(x.id)).join("|");

  return (
    <div
      className={`segs${className ? ` ${className}` : ""}`}
      ref={setBox}
      data-kind={kind}
      title={title}
      aria-label={ariaLabel}
    >
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button
            key={String(it.id)}
            type="button"
            className={`opt${on ? " on" : ""}`}
            aria-pressed={on}
            onClick={() => onChange(it.id)}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
