import {useEffect,useId,useRef,useState,type FormEvent} from "react";
import {PrefRow} from "../components/PrefRow";
import {TextBtn} from "../components/TextBtn";
import {WordsField} from "../components/WordsField";
import {Segs} from "../components/Segs";
import type {BudgetObservation,BudgetObservations,BudgetRule,ConfigView,SaveBudget} from "./contract";
import {BudgetLoader,budgetDraft,budgetSpec,type BudgetDraft,type BudgetReadState} from "./budgetModel";
import {errorCopy} from "./copy";
import type {ProductLanguage} from "./preferences";
import {desktop,protocolVersion,service} from "./service";
import type {UsageClearSession} from "./usageClearModel";
import {usageNumber,usageUtc} from "./usageModel";

function scopeText(rule:BudgetRule,config:ConfigView,zh:boolean){
  const scope=rule.spec.scope;
  if(scope.kind==="all_attempts")return zh?"全部上游尝试":"All upstream attempts";
  if(scope.kind==="team")return scope.public_id;
  const provider=config.providers.find(provider=>provider.id===scope.provider_id)?.name;
  const label=provider?`${provider} · ${scope.provider_id}`:scope.provider_id;
  return scope.kind==="model"?`${label} / ${scope.model_id}`:label;
}
function BudgetProgress({label,value,limit,bps,reached,zh}:{label:string;value:string|null;limit:string|null;bps:number|null;reached:boolean|null;zh:boolean}){
  const unknown=zh?"未知":"Unknown";
  return <PrefRow name={label} sub={reached===true?(zh?"已达到自设软目标；继续记录用量。":"Self-defined soft target reached; usage continues to be recorded."):undefined} subClassName="wraps"><div className="tagma-budget-value"><span>{usageNumber(value,unknown)}{limit===null?"":` / ${usageNumber(limit,unknown)}`}</span>{limit!==null&&bps!==null&&<progress max={10000} value={bps} aria-label={label} aria-valuetext={`${usageNumber(value,unknown)} / ${usageNumber(limit,unknown)}`}/>}</div></PrefRow>;
}
export function BudgetFacts({rule,record,zh}:{rule:BudgetRule;record:BudgetObservation;zh:boolean}){
  const unknown=zh?"未知":"Unknown";
  return <><p className="tagma-footnote">{usageUtc(record.range.start_ms)} ≤ {zh?"开始时间":"start"} &lt; {usageUtc(record.range.end_ms)}</p><div className="list prefs">
    <BudgetProgress label={record.kind==="request"?(zh?"保留逻辑请求数":"Retained logical requests"):(zh?"保留上游尝试数":"Retained upstream attempts")} value={record.recorded_count} limit={rule.spec.request_limit} bps={record.request_progress_bps} reached={record.request_reached} zh={zh}/>
    <BudgetProgress label={zh?"输入 + 输出 token":"Input + output tokens"} value={record.token_total} limit={rule.spec.token_limit} bps={record.token_progress_bps} reached={record.token_reached} zh={zh}/>
    <PrefRow name={zh?"已知输入 / 输出 token":"Known input / output tokens"}><span>{usageNumber(record.known_input_tokens,unknown)} / {usageNumber(record.known_output_tokens,unknown)}</span></PrefRow>
    <PrefRow name={zh?"输入 / 输出未知记录数":"Records with unknown input / output"}><span>{usageNumber(record.unknown_input_records,unknown)} / {usageNumber(record.unknown_output_records,unknown)}</span></PrefRow>
  </div></>;
}
export function BudgetReport({data,rules,zh}:{data:BudgetObservations;rules:BudgetRule[];zh:boolean}){
  return <div><p className="tagma-footnote">{zh?"读取于":"Read at"} {usageUtc(data.info.observed_ms)} · config {data.config_revision} · UTC</p>
    {data.info.availability==="not_created"&&<p role="status">{zh?"本机用量库尚未创建，周期用量未知。":"The local usage store has not been created. Period usage is unknown."}</p>}
    {data.info.generation!==null&&BigInt(data.info.generation)>0n&&<p role="status">{zh?"本机历史曾清除；以下只含保留记录，不能代表完整周期账单。":"Local history has been cleared. These retained records do not represent a complete period bill."}</p>}
    {rules.map((rule,index)=><section key={rule.id} aria-label={rule.spec.name}><h3>{rule.spec.name}</h3><BudgetFacts rule={rule} record={data.records[index]} zh={zh}/></section>)}
  </div>;
}
function BudgetRead({revision,rules,session,busy,language,onBusy}:{revision:number;rules:BudgetRule[];session:UsageClearSession;busy:boolean;language:ProductLanguage;onBusy:(busy:boolean)=>void}){
  const zh=language==="zh";
  const [fixed]=useState(()=>({revision,rules}));
  const [state,setState]=useState<BudgetReadState>({busy:false,data:null,error:null});
  const loader=useRef<BudgetLoader|null>(null);
  useEffect(()=>{
    const current=new BudgetLoader(service,fixed.revision,fixed.rules,()=>session.barrier(),next=>{setState(next);onBusy(next.busy);});loader.current=current;
    return()=>{current.dispose();if(loader.current===current)loader.current=null;onBusy(false);};
  },[fixed,session,onBusy]);
  return <><TextBtn variant="action" disabled={!desktop||busy||rules.length===0} busy={state.busy} onClick={()=>void loader.current?.load()}>{zh?"读取周期用量":"Read period usage"}</TextBtn>
    {state.error!=null&&<p className="tagma-error" role="alert">{errorCopy(state.error,language)}</p>}
    {state.data&&<BudgetReport data={state.data} rules={fixed.rules} zh={zh}/>}
  </>;
}
export function BudgetEditor({rule,config,busy,language,onSave,onCancel}:{rule?:BudgetRule;config:ConfigView;busy:boolean;language:ProductLanguage;onSave:(input:SaveBudget)=>Promise<boolean>;onCancel:()=>void}){
  const zh=language==="zh",id=useId();
  const [revision]=useState(config.desired_revision);
  const [draft,setDraft]=useState(()=>budgetDraft(rule));
  const [invalid,setInvalid]=useState(false);
  function change(key:keyof BudgetDraft,value:string){setDraft(old=>({...old,[key]:value}));setInvalid(false);}
  async function save(event:FormEvent){event.preventDefault();let input:SaveBudget;try{input={protocol_version:protocolVersion,expected_revision:revision,id:rule?.id??null,spec:budgetSpec(draft)};}catch{setInvalid(true);return;}if(await onSave(input))onCancel();}
  return <form className="editor tagma-editor" aria-label={zh?"编辑软预算":"Edit soft budget"} onSubmit={event=>void save(event)}>
    <fieldset disabled={busy}><label htmlFor={`${id}-name`}>{zh?"名称":"Name"}</label><WordsField id={`${id}-name`} autoFocus required maxLength={120} value={draft.name} onChange={event=>change("name",event.target.value)}/>
      <label htmlFor={`${id}-scope`}>{zh?"统计范围":"Scope"}</label><select className="words" id={`${id}-scope`} value={draft.scope} onChange={event=>change("scope",event.target.value)}>{(["all_attempts","provider","model","team"] as const).map((kind,index)=><option key={kind} value={kind}>{(zh?["全部上游尝试","供应商","实际模型","精确小队版本"]:["All attempts","Provider","Actual model","Exact team version"])[index]}</option>)}</select>
      {(draft.scope==="provider"||draft.scope==="model")&&<><label htmlFor={`${id}-provider`}>{zh?"供应商 UUID":"Provider UUID"}</label><div><WordsField id={`${id}-provider`} list={`${id}-providers`} required maxLength={36} value={draft.provider} onChange={event=>change("provider",event.target.value)}/><datalist id={`${id}-providers`}>{config.providers.map(provider=><option key={provider.id} value={provider.id}>{provider.name}</option>)}</datalist></div></>}
      {(draft.scope==="model"||draft.scope==="team")&&<><label htmlFor={`${id}-model`}>{draft.scope==="team"?(zh?"公开小队 ID":"Public team ID"):(zh?"实际模型 ID":"Actual model ID")}</label><WordsField id={`${id}-model`} required maxLength={256} placeholder={draft.scope==="team"?"tagma/team@2":undefined} value={draft.model} onChange={event=>change("model",event.target.value)}/></>}
      <span>{zh?"UTC 周期":"UTC period"}</span><Segs aria-label={zh?"UTC 周期":"UTC period"} value={draft.period} items={[{id:"utc_day",label:zh?"日":"Day"},{id:"utc_month",label:zh?"自然月":"Calendar month"}]} onChange={value=>change("period",value)}/>
      <label htmlFor={`${id}-requests`}>{draft.scope==="team"?(zh?"逻辑请求软目标":"Logical request target"):(zh?"上游尝试软目标":"Upstream attempt target")}</label><WordsField id={`${id}-requests`} inputMode="numeric" pattern="[1-9][0-9]*" maxLength={19} value={draft.requests} onChange={event=>change("requests",event.target.value)}/>
      <label htmlFor={`${id}-tokens`}>{zh?"总 token 软目标":"Total token target"}</label><WordsField id={`${id}-tokens`} inputMode="numeric" pattern="[1-9][0-9]*" maxLength={19} value={draft.tokens} onChange={event=>change("tokens",event.target.value)}/>
    </fieldset>
    <p className="sub">{zh?"至少填写一个正整数软目标，最多 9223372036854775807；不会阻止请求或限制收费。历史供应商 UUID 和精确公开 ID 可保留。":"Set at least one positive integer target, up to 9223372036854775807. This does not block requests or cap charges. Historical provider UUIDs and exact public IDs can be retained."}</p>
    {invalid&&<p role="alert" className="tagma-error">{zh?"请检查名称、供应商 UUID、模型 / 小队 ID 和软目标；整数不可带前导零，小队须填写精确公开版本。":"Check the name, provider UUID, model / team ID and targets. Integers cannot have leading zeros; use an exact public team version."}</p>}
    <div className="tagma-actions"><TextBtn disabled={busy} onClick={onCancel}>{zh?"取消":"Cancel"}</TextBtn><TextBtn type="submit" variant="primary" busy={busy}>{zh?"保存":"Save"}</TextBtn></div>
  </form>;
}
export type BudgetPanelProps={config:ConfigView;busy:boolean;language:ProductLanguage;session:UsageClearSession;readEpoch:number;onBusy:(busy:boolean)=>void;onMutate:(operation:()=>Promise<ConfigView>)=>Promise<boolean>;onEditingChange:(editing:boolean)=>void};
export function BudgetPanel({config,busy,language,session,readEpoch,onBusy,onMutate,onEditingChange}:BudgetPanelProps){
  const zh=language==="zh";
  const [editor,setEditor]=useState<BudgetRule|"new"|null>(null);
  const [deleting,setDeleting]=useState<{rule:BudgetRule;revision:number}|null>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>()=>onEditingChange(false),[onEditingChange]);
  useEffect(()=>{if(!deleting)return;const previous=document.activeElement as HTMLElement|null;const element=dialog.current;element?.showModal();return()=>{element?.close();previous?.focus();};},[deleting]);
  function edit(rule:BudgetRule|"new"|null){setEditor(rule);onEditingChange(rule!==null);}
  function remove(rule:BudgetRule|null){setDeleting(rule?{rule,revision:config.desired_revision}:null);onEditingChange(rule!==null);}
  return <section aria-label={zh?"自设软预算":"Self-defined soft budgets"}><h2>{zh?"自设软预算":"Self-defined soft budgets"}</h2>
    <p className="tagma-footnote">{zh?"平台真实余额 / 账单：未知。以下是保留登记与自设软目标的比较，非计费调用数；规则可重叠，请勿相加。清除历史会减少可见统计。":"Actual provider balance / bill: unknown. These compare retained registrations with self-defined soft targets, not billed calls. Rules may overlap; do not add them. Clearing history reduces visible totals."}</p>
    <div className="list prefs">{config.budgets.map(rule=><PrefRow key={rule.id} name={rule.spec.name} sub={`${scopeText(rule,config,zh)} · ${rule.spec.period==="utc_day"?"UTC day":"UTC month"}`} subClassName="wraps"><TextBtn disabled={busy||!!editor||!!deleting} onClick={()=>edit(rule)}>{zh?"编辑":"Edit"}</TextBtn><TextBtn variant="danger" disabled={busy||!!editor||!!deleting} onClick={()=>remove(rule)}>{zh?"删除":"Delete"}</TextBtn></PrefRow>)}</div>
    {config.budgets.length===0&&<p>{zh?"尚未设置软目标。用量仍可在上方读取。":"No soft targets are set. Usage can still be read above."}</p>}
    <TextBtn variant="action" disabled={busy||!!editor||!!deleting||config.budgets.length>=32} onClick={()=>edit("new")}>{zh?"新增软目标":"Add soft target"}</TextBtn>
    {editor&&<BudgetEditor key={editor==="new"?"new":editor.id} rule={editor==="new"?undefined:editor} config={config} busy={busy} language={language} onSave={input=>onMutate(()=>service.saveBudget(input))} onCancel={()=>edit(null)}/>}
    <BudgetRead key={`${config.desired_revision}:${readEpoch}`} revision={config.desired_revision} rules={config.budgets} session={session} busy={busy||!!editor||!!deleting} language={language} onBusy={onBusy}/>
    <dialog ref={dialog} className="tagma-confirm" aria-label={zh?"删除软目标":"Delete soft target"} onCancel={event=>{if(busy)event.preventDefault();else remove(null);}}><h2>{zh?"删除软目标":"Delete soft target"}</h2><p>{deleting?.rule.spec.name} · {zh?"保留已有用量记录。":"Recorded usage is retained."}</p><div className="tagma-actions"><TextBtn autoFocus disabled={busy} onClick={()=>remove(null)}>{zh?"取消":"Cancel"}</TextBtn><TextBtn variant="danger" busy={busy} onClick={()=>{if(deleting)void onMutate(()=>service.deleteBudget({protocol_version:protocolVersion,expected_revision:deleting.revision,id:deleting.rule.id})).then(saved=>{if(saved)remove(null);});}}>{zh?"确认删除":"Delete"}</TextBtn></div></dialog>
  </section>;
}
