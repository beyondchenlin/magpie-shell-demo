import { useEffect, useId, useRef, useState } from "react";
import { PrefRow } from "../components/PrefRow";
import { TextBtn } from "../components/TextBtn";
import { WordsField } from "../components/WordsField";
import type { UsageClearPlan } from "./contract";
import { errorCopy } from "./copy";
import { usageDefault, usageNumber, usageSelection, usageUtc } from "./usageModel";
import type { ProductLanguage } from "./preferences";
import type { ClearState, UsageClearSession } from "./usageClearModel";

export function UsageClearScope({plan,zh}:{plan:UsageClearPlan;zh:boolean}) {
  return <div className="list prefs">
    <PrefRow name={zh?"开始（含）":"Start (inclusive)"}><span>{usageUtc(plan.range.start_ms)}</span></PrefRow>
    <PrefRow name={zh?"结束（不含）":"End (exclusive)"}><span>{usageUtc(plan.range.end_ms)}</span></PrefRow>
    <PrefRow name={zh?"逻辑请求明细":"Logical request details"}><span>{usageNumber(plan.requests,"")}</span></PrefRow>
    <PrefRow name={zh?"级联尝试明细（含跨日）":"Cascading attempt details (including other days)"}><span>{usageNumber(plan.attempts,"")}</span></PrefRow>
    <PrefRow name={zh?"范围内日汇总桶":"Daily summary buckets within the range"}><span>{usageNumber(plan.summary_buckets,"")}</span></PrefRow>
    <PrefRow name={zh?"核实编号":"Verification ID"}><span className="tagma-instance">{plan.operation_id}</span></PrefRow>
  </div>;
}
export function UsageClearControls({session,state,busy,language}:{session:UsageClearSession;state:ClearState;busy:boolean;language:ProductLanguage}) {
  const zh=language==="zh";const [dates,setDates]=useState(()=>usageDefault(Date.now()-86_400_000));const [invalid,setInvalid]=useState(false);const [leave,setLeave]=useState(false);const confirmation=useRef<HTMLDialogElement>(null);const leaving=useRef<HTMLDialogElement>(null);const id=useId();
  const mounted=useRef(true);useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{if(!state.preview)return;const dialog=confirmation.current;const previous=document.activeElement as HTMLElement|null;dialog?.showModal();return()=>{dialog?.close();previous?.focus();};},[state.preview]);
  useEffect(()=>{if(!leave)return;const dialog=leaving.current;const previous=document.activeElement as HTMLElement|null;dialog?.showModal();return()=>{dialog?.close();previous?.focus();};},[leave]);
  const disabled=busy||state.busy;const formDisabled=disabled||!!state.pending||state.storageBlocked;
  const code=state.error&&typeof state.error==="object"&&"code"in state.error?String(state.error.code):null;
  const errorText=code==="INVALID_INPUT"?(zh?"清除范围或核实数据无效，请重新预览完整的 UTC 日范围。":"The clear scope or verification data is invalid. Preview complete UTC days again."):errorCopy(state.pending&&code==="CONFIRMATION_TIMEOUT"?{code:"USAGE_CLEAR_UNCONFIRMED"}:state.error,language);
  function preview(){try{const range=usageSelection(dates).range;if(range.end_ms>Date.now())throw Error("unfinished UTC day");setInvalid(false);void session.prepare(range);}catch{setInvalid(true);}}
  return <section aria-label={zh?"清除用量":"Clear usage"} aria-busy={state.busy}>
    <h2>{zh?"清除用量":"Clear usage"}</h2><p className="tagma-footnote">{zh?"按已结束的完整 UTC 日清除所有供应商、模型和小队的记录，查询筛选不缩小此范围。请先预览日期和数量。清除需本机网关管理通道可用。":"Clear records for all providers, models and teams within complete past UTC days. Query filters do not narrow this scope. Preview dates and counts first. The local gateway management channel must be available."}</p>
    <form onSubmit={event=>{event.preventDefault();preview();}}><fieldset disabled={formDisabled} className="tagma-usage-filters"><legend>{zh?"清除范围":"Clear range"}</legend><div className="list prefs">
      <PrefRow name={zh?"开始日期（UTC）":"Start date (UTC)"}><WordsField type="date" min="1970-01-01" max="9999-12-31" required aria-label={zh?"清除开始日期（UTC）":"Clear start date (UTC)"} value={dates.from} onChange={event=>{setDates(old=>({...old,from:event.target.value}));setInvalid(false);}}/></PrefRow>
      <PrefRow name={zh?"结束日期（含当日，UTC）":"Through date (inclusive, UTC)"}><WordsField type="date" min={dates.from} max="9999-12-31" required aria-label={zh?"清除结束日期（UTC）":"Clear through date (UTC)"} value={dates.through} onChange={event=>{setDates(old=>({...old,through:event.target.value}));setInvalid(false);}}/></PrefRow>
    </div></fieldset><TextBtn type="submit" disabled={formDisabled}>{zh?"预览清除范围与数量":"Preview clear range and counts"}</TextBtn></form>
    {invalid&&<p role="alert" className="tagma-error">{zh?"请选择最多 366 个已结束的 UTC 日，结束日期包含当日。":"Choose up to 366 complete past UTC days; the through date is included."}</p>}
    {state.error!=null&&<p role="alert" className="tagma-error">{errorText}</p>}
    {state.busy&&<p role="status">{zh?"正在等待本机确认…":"Waiting for local confirmation…"}</p>}
    {state.pending&&<><h3>{zh?"本次清除尚未确认":"This clear is unconfirmed"}</h3><UsageClearScope plan={state.pending} zh={zh}/><p>{zh?"核实会使用同一个请求编号。结束核实只恢复当前记录查询，已经发生的清除无法撤销。":"Verification reuses the same operation ID. Leaving verification resumes current-record queries; it does not undo a clear that already happened."}</p><div className="tagma-actions"><TextBtn disabled={disabled||state.storageBlocked} onClick={()=>void session.confirm(true)}>{zh?"核实同一次清除":"Verify the same clear"}</TextBtn><TextBtn disabled={disabled||state.storageBlocked} onClick={()=>setLeave(true)}>{zh?"结束核实，查看当前状态":"Leave verification, read current state"}</TextBtn></div></>}
    {state.unresolved&&!state.pending&&<><p role="status">{zh?"已结束核实，上次清除结果仍未确认：":"Verification ended; the previous clear remains unconfirmed: "}<span className="tagma-instance">{state.unresolved.operation_id}</span></p><details><summary>{zh?"查看未确认范围":"Inspect unconfirmed scope"}</summary><UsageClearScope plan={state.unresolved} zh={zh}/></details></>}
    {state.receipt&&<><p role="status">{zh?"清除已确认，请重新读取记录。":"Clear confirmed. Read the records again."} {usageUtc(state.receipt.committed_ms)}</p><details><summary>{zh?"查看已确认范围":"Inspect confirmed scope"}</summary><UsageClearScope plan={state.receipt.plan} zh={zh}/></details></>}
    <TextBtn disabled={disabled} onClick={()=>void session.recover()}>{zh?"核实并恢复用量记账":"Verify and recover usage accounting"}</TextBtn>
    {state.recovered&&<p role="status">{zh?"记账恢复已确认；请重新预览或核实原清除请求。":"Accounting recovery confirmed. Preview again or verify the original clear."}</p>}
    <dialog ref={confirmation} className="tagma-confirm" aria-labelledby={`${id}-title`} onCancel={event=>{if(state.busy)event.preventDefault();else session.cancelPreview();}}><h2 id={`${id}-title`}>{zh?"确认清除这些记录？":"Clear these records?"}</h2>{state.preview&&<UsageClearScope plan={state.preview} zh={zh}/>}<p>{zh?"逻辑请求按开始时间选择，其所有尝试明细一并清除；日汇总按各自开始日清除，范围外日汇总保留。":"Requests are selected by their start time and all their attempt details are removed. Daily summaries follow each metric's own start day; buckets outside the range remain."}</p><p>{zh?"这是逻辑删除。迁移备份和 WAL 可能保留历史元数据，不会自动恢复到用量页。配置、凭据和会话正文不属于本次范围。":"This is logical deletion. Migration backups and WAL may retain historical metadata; they are not automatically restored into Usage. Configuration, credentials and conversation bodies are outside this scope."}</p><div className="tagma-actions"><TextBtn autoFocus disabled={state.busy} onClick={()=>session.cancelPreview()}>{zh?"取消":"Cancel"}</TextBtn><TextBtn variant="danger" busy={state.busy} onClick={()=>void session.confirm()}>{zh?"确认清除":"Confirm clear"}</TextBtn></div></dialog>
    <dialog ref={leaving} className="tagma-confirm" aria-labelledby={`${id}-leave-title`} onCancel={event=>{if(state.busy)event.preventDefault();else setLeave(false);}}><h2 id={`${id}-leave-title`}>{zh?"结束核实并读取当前状态？":"Leave verification and read current state?"}</h2><p>{zh?"这不会撤销已提交的清除，也不会发送新的清除。原请求将继续标为结果未确认。":"This does not undo a committed clear or send a new one. The original operation remains marked unconfirmed."}</p><div className="tagma-actions"><TextBtn autoFocus disabled={state.busy} onClick={()=>setLeave(false)}>{zh?"继续核实":"Keep verifying"}</TextBtn><TextBtn busy={state.busy} onClick={()=>{void session.leaveUnconfirmed().then(()=>{if(mounted.current)setLeave(false);});}}>{zh?"读取当前状态":"Read current state"}</TextBtn></div></dialog>
  </section>;
}
