export const SETTINGS_TABS = [
  { id: "general", en: "General" },
  { id: "usage", en: "Allowances" },
  { id: "network", en: "Network and sharing" },
  { id: "models", en: "Models" },
  { id: "privacy", en: "Privacy" },
  { id: "otel", en: "Observability" },
  { id: "sync", en: "Sync and backup" },
  { id: "about", en: "About" },
] as const;
export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

export function settingsTabs() {
  let otel = false;
  try { otel = localStorage.getItem("magpie.feature.otel") === "1"; } catch { /* default off */ }
  return SETTINGS_TABS.filter((tab) => tab.id !== "otel" || otel);
}

export function readSettingsTab(): SettingsTabId {
  try {
    const value = sessionStorage.getItem("magpie.setTab");
    sessionStorage.removeItem("magpie.setTab");
    return settingsTabs().find((tab) => tab.id === value)?.id || "general";
  } catch { return "general"; }
}
