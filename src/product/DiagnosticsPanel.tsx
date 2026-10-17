import { useEffect, useRef, useState } from "react";
import { TextBtn } from "../components/TextBtn";
import { copyText } from "../lib/copyText";
import { copy, errorCopy } from "./copy";
import type { DiagnosticBundle } from "./contract";
import type { ProductLanguage } from "./preferences";
import { desktop,protocolVersion, service } from "./service";

export function DiagnosticsPanel({ language }:{language:ProductLanguage}) {
  const c=copy(language);
  const [bundle,setBundle]=useState<DiagnosticBundle|null>(null);
  const [error,setError]=useState<unknown>(null);
  const [busy,setBusy]=useState(false);
  const [copied,setCopied]=useState(false);
  const [confirmRecovery,setConfirmRecovery]=useState(false);
  const [recovered,setRecovered]=useState(false);
  const confirmation=useRef<HTMLDialogElement>(null);
  const mounted=useRef(true);
  useEffect(()=>{ mounted.current=true; return()=>{mounted.current=false;}; },[]);
  useEffect(()=>{
    if(!confirmRecovery)return;
    const dialog=confirmation.current; const previous=document.activeElement as HTMLElement|null;
    dialog?.showModal();return()=>{dialog?.close();previous?.focus();};
  },[confirmRecovery]);
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
  async function recover() {
    const plan=bundle?.initialization_recovery;if(!plan)return;
    setBusy(true);setError(null);
    try {
      await service.recoverInitialization({protocol_version:protocolVersion,operation_id:plan.operation_id,expected_sha256:plan.expected_sha256});
      if(mounted.current){setRecovered(true);setConfirmRecovery(false);}
    }catch(err){if(mounted.current)setError(err);}
    finally{if(mounted.current)setBusy(false);}
  }
  return <div className="tagma-diagnostics"><TextBtn disabled={!desktop} busy={busy} onClick={()=>void load()}>{c.diagnostics}</TextBtn>
    {error!=null&&<p role="alert" className="tagma-error">{errorCopy(error,language)}</p>}
    {bundle&&<><p className="sub">{c.diagnosticHint}</p>{!bundle.logging_available&&<p role="alert">{c.logsUnavailable}</p>}
      <pre aria-label={c.diagnostics}>{JSON.stringify(bundle,null,2)}</pre>
      <TextBtn onClick={() => void copyBundle()}>{copied?c.copied:c.copyDiagnostics}</TextBtn></>}
    {bundle?.initialization_recovery&&!recovered&&<TextBtn disabled={busy} onClick={()=>setConfirmRecovery(true)}>{c.recover}</TextBtn>}
    {recovered&&<p role="status">{c.recovered}</p>}
    <dialog ref={confirmation} className="tagma-confirm" aria-labelledby="recovery-title" onCancel={event=>{if(busy)event.preventDefault();else setConfirmRecovery(false);}}>
      <h2 id="recovery-title">{c.recover}</h2><p>{c.recoverHint}</p><p>{bundle?.initialization_recovery?.record_path}</p><p>→ {bundle?.initialization_recovery?.archive_path}</p>
      {error!=null&&<p role="alert">{errorCopy(error,language)}</p>}
      <div className="tagma-actions"><TextBtn autoFocus disabled={busy} onClick={()=>setConfirmRecovery(false)}>{c.cancel}</TextBtn><TextBtn variant="action" busy={busy} onClick={()=>void recover()}>{c.recoverConfirm}</TextBtn></div>
    </dialog>
  </div>;
}
