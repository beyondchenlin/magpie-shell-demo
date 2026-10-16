import { iconSrc } from "../data/mock";
import { useEffect, useState } from "react";

const iconLoads = new Map<string, Promise<boolean>>();
function loadIcon(src: string) {
  let result = iconLoads.get(src);
  if (!result) {
    result = new Promise<boolean>(resolve => {
      const probe = new Image();
      probe.onload = () => resolve(true);
      probe.onerror = () => resolve(false);
      probe.src = src;
    });
    iconLoads.set(src, result);
  }
  return result;
}

/** Magpie icon(name): .ic[data-icon] with the existing SVG/PNG asset. */
export function MagpieIcon({ name = "generic", className = "" }: { name?: string; className?: string }) {
  const src = iconSrc(name);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const generic = !name || name === "generic" || failedSrc === src;
  const image = name.endsWith("-color") || src.endsWith(".png") || name.startsWith("file:");
  useEffect(() => {
    if (!name || name === "generic" || image) return;
    let current = true;
    void loadIcon(src).then(ok => { if (current && !ok) setFailedSrc(src); });
    return () => { current = false; };
  }, [name, src, image]);
  return <span className={`ic${generic ? " generic" : ""}${className ? " " + className : ""}`} data-icon={name} aria-hidden="true">
    {generic ? <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2.2 13.2 5.1v5.8L8 13.8 2.8 10.9V5.1Z M8 8v5.8 M2.8 5.1 8 8l5.2-2.9" />
    </svg> : image ? <img src={src} alt="" draggable={false} onError={() => setFailedSrc(src)} />
      : <span className="mask" style={{ ["--i" as string]: `url("${src}")` }} />}
  </span>;
}
