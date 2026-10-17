import { applyDocumentTheme, applyDocumentTextSize } from "../applyTheme";
export type ProductLanguage = "zh" | "en" | "zh-TW" | "ja" | "de";
export type ProductTheme = "system" | "light" | "dark";
export type Preferences = { language: ProductLanguage; theme: ProductTheme; textSize: 100 | 110 | 125 | 150 };
const defaults: Preferences = { language: "zh", theme: "light", textSize: 110 };
const key = "tagma.ui.v1";

export function readPreferences(): Preferences {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key) || "null");
    if (!raw || typeof raw !== "object") return defaults;
    const p = raw as Partial<Preferences>;
    return {
      language: ["zh", "en", "zh-TW", "ja", "de"].includes(p.language || "") ? p.language! : defaults.language,
      theme: ["system", "light", "dark"].includes(p.theme || "") ? p.theme! : defaults.theme,
      textSize: [100, 110, 125, 150].includes(p.textSize || 0) ? p.textSize! : defaults.textSize,
    };
  } catch { return defaults; }
}

export function applyPreferences(p: Preferences) {
  document.documentElement.lang = p.language;
  applyDocumentTheme(p.theme);
  applyDocumentTextSize(p.textSize);
}

export function savePreferences(p: Preferences): boolean {
  try { localStorage.setItem(key, JSON.stringify(p)); return true; } catch { return false; }
}
