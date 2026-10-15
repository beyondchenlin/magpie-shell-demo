/** Magpie applyPrefs theme crossfade — app.js ~20581–20590 + app.css html.theming ~3233–3236.
 *  Crossfade .35s via html.theming; clear class at 450ms. Skip animate on first paint.
 *
 *  Persist: Magpie saves theme via savePrefs → settings JSON (app.js ~20999, prefsKeep ~23926).
 *  Demo has no backend — store theme on magpie.demoPrefs (same key as colorblind/textSize).
 *  Early paint: Magpie theme.js L5–10 reads bootPrefs.theme before CSS; demo bootDemoTheme mirrors that. */

export type DemoTheme = "system" | "light" | "dark";

export const DEMO_PREFS_LS = "magpie.demoPrefs";

const flash: { t?: number; ready: boolean } = { ready: false };

function isTheme(v: unknown): v is DemoTheme {
  return v === "system" || v === "light" || v === "dark";
}

/** Read Appearance theme from magpie.demoPrefs (Magpie prefs.theme). Default light. */
export function readDemoTheme(): DemoTheme {
  try {
    const raw = localStorage.getItem(DEMO_PREFS_LS);
    if (!raw) return "light";
    const p = JSON.parse(raw) as { theme?: unknown };
    return isTheme(p.theme) ? p.theme : "light";
  } catch {
    return "light";
  }
}

/** Persist theme into magpie.demoPrefs without clobbering other prefs keys. */
export function persistDemoTheme(theme: DemoTheme): void {
  try {
    const raw = localStorage.getItem(DEMO_PREFS_LS);
    const p = (raw ? JSON.parse(raw) : {}) as Record<string, unknown>;
    p.theme = theme;
    localStorage.setItem(DEMO_PREFS_LS, JSON.stringify(p));
  } catch {
    /* ignore quota / private mode */
  }
}

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

/** Magpie theme.js L5–10: apply saved theme before first paint (no html.theming). */
export function bootDemoTheme(): DemoTheme {
  const theme = readDemoTheme();
  const root = document.documentElement;
  const want = !theme || theme === "system" ? undefined : theme;
  if (want) root.dataset.theme = want;
  else delete root.dataset.theme;
  // leave flash.ready false — first applyDocumentTheme (React mount) is still first paint
  return theme;
}
