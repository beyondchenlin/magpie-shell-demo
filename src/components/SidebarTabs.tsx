import { useLayoutEffect, useRef, useState } from "react";

/** Magpie navSubs: the page's own section tabs, under its sidebar entry. */
export function SidebarTabs<T extends string>({ items, value, onChange, label }: {
  items: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const layoutKey = items.map((item) => `${item.id}:${item.label}`).join("|");
  const [position, setPosition] = useState({ y: 0, height: 26 });
  useLayoutEffect(() => {
    const node = box.current;
    const active = node?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!node || !active) return;
    const fit = () => {
      const next = { y: active.offsetTop, height: active.offsetHeight };
      setPosition((prev) => prev.y === next.y && prev.height === next.height ? prev : next);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    observer.observe(active);
    return () => observer.disconnect();
  }, [value, layoutKey]);

  return <div ref={box} className="nav-sub" role="tablist" aria-label={label} aria-orientation="vertical">
    <i className="nav-hl" aria-hidden="true" style={{ transform: `translateY(${position.y}px)`, height: position.height }} />
    {items.map((item) => <button key={item.id} type="button" role="tab"
      className={`nav-s${item.id === value ? " cur" : ""}`} aria-selected={item.id === value}
      tabIndex={item.id === value ? 0 : -1} onClick={() => onChange(item.id)}
      onKeyDown={(event) => {
        const index = items.findIndex((entry) => entry.id === item.id);
        const next = ({ ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 } as Record<string, number>)[event.key];
        if (next === undefined) return;
        event.preventDefault();
        const to = (next + items.length) % items.length;
        onChange(items[to].id);
        box.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[to]?.focus();
      }}><span>{item.label}</span></button>)}
  </div>;
}
