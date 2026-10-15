/** Magpie applyPrefs theme crossfade — app.js ~20581–20590 + app.css html.theming ~3233–3236.
 *  Crossfade .35s via html.theming; clear class at 450ms. Skip animate on first paint. */

export type DemoTheme = "system" | "light" | "dark";

const flash: { t?: number; ready: boolean } = { ready: false };

/** Apply data-theme synchronously (Magpie dataset.theme). Animate only after first paint. */
export function applyDocumentTheme(
  theme: DemoTheme,
  opts?: { animate?: boolean },
): void {
  const root = document.documentElement;
  const want = !theme || theme === "system" ? undefined : theme;
  const cur = root.dataset.theme || undefined;
  if (cur === want) {
    flash.ready = true;
    return;
  }
  const animate = opts?.animate !== false && flash.ready;
  if (animate) {
    root.classList.add("theming");
    window.clearTimeout(flash.t);
    flash.t = window.setTimeout(() => root.classList.remove("theming"), 450);
  }
  if (want) root.dataset.theme = want;
  else delete root.dataset.theme;
  flash.ready = true;
}
