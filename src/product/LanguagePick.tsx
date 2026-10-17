import { useCallback, useRef, useState } from "react";
import { PrefPick } from "../components/PrefPick";
import { PopoverPortal } from "../components/PopoverPortal";
import { useProtocolMenu } from "../lib/useProtocolMenu";
import type { ProductLanguage } from "./preferences";

const languages: { id: ProductLanguage; label: string }[] = [
  { id: "zh", label: "简体中文" }, { id: "en", label: "English" },
  { id: "zh-TW", label: "繁體中文（English fallback）" },
  { id: "ja", label: "日本語（English fallback）" }, { id: "de", label: "Deutsch (English fallback)" },
];

export function LanguagePick({ value, label, onChange }: { value: ProductLanguage; label: string; onChange: (language: ProductLanguage) => void }) {
  const [open,setOpen]=useState(false);
  const anchor=useRef<HTMLButtonElement>(null);
  const popup=useRef<HTMLDivElement>(null);
  const close=useCallback(()=>setOpen(false),[]);
  useProtocolMenu(popup,anchor,open,close,{ align:"right" });
  return <>
    <PrefPick ref={anchor} label={languages.find(language=>language.id===value)?.label} open={open} aria-label={label} aria-haspopup="menu" onClick={()=>setOpen(!open)} />
    {open && <PopoverPortal><div ref={popup} className="pop proto-menu tagma-language" role="menu" aria-label={label}>
      {languages.map(language=><button key={language.id} className={`pm-item${language.id===value ? " on" : ""}`} role="menuitemradio" aria-checked={language.id===value} onClick={()=>{ onChange(language.id); close(); anchor.current?.focus(); }}><span className="pm-tick" aria-hidden>{language.id===value ? "✓" : ""}</span><span className="pm-words"><span className="pm-name">{language.label}</span></span></button>)}
    </div></PopoverPortal>}
  </>;
}
