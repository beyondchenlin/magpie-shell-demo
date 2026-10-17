import { useEffect, useRef, useState } from "react";
import { TextBtn } from "../components/TextBtn";
import { copyText } from "../lib/copyText";
import { copy, errorCopy } from "./copy";
import type { DiagnosticBundle } from "./contract";
import type { ProductLanguage } from "./preferences";
import { desktop, service } from "./service";

export function DiagnosticsPanel({ language }:{language:ProductLanguage}) {
  const c=copy(language);
  const [bundle,setBundle]=useState<DiagnosticBundle|null>(null);
  const [error,setError]=useState<unknown>(null);
  const [busy,setBusy]=useState(false);
  const [copied,setCopied]=useState(false);
  const mounted=useRef(true);
  useEffect(()=>{ mounted.current=true; return()=>{mounted.current=false;}; },[]);
  async function load() {
    setBusy(true);setError(null);setCopied(false);
    try {const next=await service.diagnostics();if(mounted.current)setBundle(next);}
    catch(err){if(mounted.current)setError(err);}
    finally {if(mounted.current)setBusy(false);}
  }
  async function copyBundle() {
    if (!bundle) return;
    try {
      if (!await copyText(JSON.stringify(bundle, null, 2))) throw { code: "INTERNAL_ERROR" };
      if (mounted.current) setCopied(true);
    } catch (err) {
      if (mounted.current) setError(err);
    }
  }
  return <div className="tagma-diagnostics"><TextBtn disabled={!desktop} busy={busy} onClick={()=>void load()}>{c.diagnostics}</TextBtn>
    {error!=null&&<p role="alert" className="tagma-error">{errorCopy(error,language)}</p>}
    {bundle&&<><p className="sub">{c.diagnosticHint}</p>{!bundle.logging_available&&<p role="alert">{c.logsUnavailable}</p>}
      <pre aria-label={c.diagnostics}>{JSON.stringify(bundle,null,2)}</pre>
      <TextBtn onClick={() => void copyBundle()}>{copied?c.copied:c.copyDiagnostics}</TextBtn></>}
  </div>;
}
