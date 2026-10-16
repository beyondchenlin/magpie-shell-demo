import { iconSrc } from "../data/mock";

/** Magpie icon(name): .ic[data-icon] with the existing SVG/PNG asset. */
export function MagpieIcon({ name = "generic" }: { name?: string }) {
  const generic = !name || name === "generic";
  const src = iconSrc(name);
  return <span className={`ic${generic ? " generic" : ""}`} data-icon={name} aria-hidden="true">
    {generic ? <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2.2 13.2 5.1v5.8L8 13.8 2.8 10.9V5.1Z M8 8v5.8 M2.8 5.1 8 8l5.2-2.9" />
    </svg> : name.endsWith("-color") || src.endsWith(".png") ? <img src={src} alt="" draggable={false} />
      : <span className="mask" style={{ ["--i" as string]: `url("${src}")` }} />}
  </span>;
}
