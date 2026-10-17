import { MagpieIcon } from "./MagpieIcon";

const PUZZLE = "M6.2 2.8h2.3a1.3 1.3 0 1 1 2.5 0h2.2V5a1.3 1.3 0 1 0 0 2.6v5.6H3V7.6a1.3 1.3 0 1 1 0-2.6V2.8z";
const GLYPHS: Record<string, string> = {
  middleware: "M1.5 8h3 M11.5 8h3 M4.5 4.5h7v7h-7z",
  agent: "M2 3.5h12v9H2z M4.5 6.5l2 1.5-2 1.5 M8 9.5h3",
  tools: "M10.6 2.4a3 3 0 0 0-3.4 4L2.6 11a1.2 1.2 0 0 0 1.7 1.7l4.6-4.6a3 3 0 0 0 4-3.4l-1.7 1.7-1.6-.3-.3-1.6z",
  page: "M2 3.5h12v9H2z M2 6h12 M4 4.75h.01",
};

/** Magpie plugins.js logo(): brand asset, otherwise its native kind glyph. */
export function PluginLogo({ icon, big, kind }: { icon?: string; big?: boolean; kind?: string }) {
  return <span className={`pm-logo${big ? " big" : ""}`} aria-hidden="true">
    {icon ? <MagpieIcon name={icon} /> : <svg viewBox="0 0 16 16" width={big ? 22 : 17} height={big ? 22 : 17}
      fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d={GLYPHS[kind?.toLowerCase() || ""] || PUZZLE} />
    </svg>}
  </span>;
}
