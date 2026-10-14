import { useEffect, useState } from "react";
import { ZH as ZH_ZH } from "./data/mock";
import zhTable from "./data/zh.json";

/** Magpie i18n: English source keys, zh map from i18n.js. Default zh-CN. */
export type Lang = "zh" | "en";

const LANG_KEY = "magpie.lang";
const table = zhTable as Record<string, string>;

const EN_EXTRA: Record<string, string> = {
  ofDone: "0 of 2 done",
  installAnother: "Install another agent ({n})",
  demoFlierOn: "Stop demo",
  demoFlierOff: "Demo flier",
  demoFlierTitle:
    "Demo: move a bird along the route (not the real gateway; empty Magpie shows no Live/Replay)",
  installCmdCopied: "Copied {agent}'s install command",
  claudeRiskTitle: "Claude accounts can be suspended",
  remoteHint:
    "The address and API key shown on the other computer under Settings → Share on the network. Its models and routing groups are listed here; requests are forwarded as the agent's own API.",
  ollamaNote: "your local models",
  providerAddedDemo: "Demo: provider was not saved (no network)",
  signInSkipped: "Demo: sign-in was not started",
  arrangeAria: "Arrange {agent}",
};

const rev = new Map<string, string>();
{
  const n = new Map<string, number>();
  for (const z of Object.values(table)) n.set(z, (n.get(z) || 0) + 1);
  for (const [en, z] of Object.entries(table)) {
    if (n.get(z) === 1) rev.set(z, en);
  }
}

let lang: Lang = "zh";
try {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === "en" || saved === "zh") lang = saved;
} catch {
  /* default zh */
}

const listeners = new Set<() => void>();

export function getLang(): Lang {
  return lang;
}

export function setLang(next: Lang) {
  lang = next;
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {
    /* this time only */
  }
  document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
  for (const fn of listeners) fn();
}

export function t(en: string, vars?: Record<string, string | number>): string {
  let out = lang === "zh" ? (table[en] ?? en) : en;
  if (vars) {
    for (const k of Object.keys(vars)) out = out.split("{" + k + "}").join(String(vars[k]));
  }
  return out;
}

/** Demo-only lines that are not Magpie copy. */
export function demoCopy(zh: string, en: string): string {
  return lang === "en" ? en : zh;
}

function fieldText(prop: string): string {
  const zhVal = ZH_ZH[prop as keyof typeof ZH_ZH];
  if (typeof zhVal !== "string") return String(zhVal ?? "");
  const en = EN_EXTRA[prop] || rev.get(zhVal);
  if (lang === "en") return en || zhVal;
  if (en && table[en]) return table[en];
  return zhVal;
}

export const ZH: typeof ZH_ZH = new Proxy(ZH_ZH, {
  get(target, prop, receiver) {
    if (typeof prop !== "string") return Reflect.get(target, prop, receiver);
    if (!(prop in target)) return undefined;
    return fieldText(prop);
  },
});

export function useLang(): Lang {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return lang;
}

if (typeof document !== "undefined") {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
}
