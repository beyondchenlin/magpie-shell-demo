import { useSegThumb } from "./SegThumb";

export type SegItem<T extends string | number | boolean = string> = {
  id: T;
  label: string;
  title?: string;
};

type Props<T extends string | number | boolean> = {
  value: T;
  items: SegItem<T>[];
  onChange: (id: T) => void;
  className?: string;
  title?: string;
  "aria-label"?: string;
  /** Magpie sortBy `dataset.sort` (e.g. plugins / mcp). */
  dataSort?: string;
  /** Magpie segs id (e.g. ledHeatMetric). */
  id?: string;
};

/** Magpie segs(): .opt + sliding .thumb (280ms). */
export function Segs<T extends string | number | boolean>({
  value,
  items,
  onChange,
  className,
  title,
  "aria-label": ariaLabel,
  dataSort,
  id,
}: Props<T>) {
  const kind = items.map((x) => String(x.id)).join("|");
  const setBox = useSegThumb(`${String(value)}:${kind}:${items.map((item) => item.label).join("|")}`);

  return (
    <div
      id={id}
      className={`segs${className ? ` ${className}` : ""}`}
      ref={setBox}
      data-kind={kind}
      title={title}
      aria-label={ariaLabel}
      data-sort={dataSort}
    >
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button
            key={String(it.id)}
            type="button"
            className={`opt${on ? " on" : ""}`}
            aria-pressed={on}
            title={it.title}
            onClick={() => onChange(it.id)}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
