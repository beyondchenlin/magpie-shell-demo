import {Fragment,useEffect,useId,useRef,useState} from "react";
import {TextBtn} from "../components/TextBtn";
import {WordsField} from "../components/WordsField";
import type {Provider,SaveProviderTimeouts} from "./contract";
import type {ProductLanguage} from "./preferences";
import {errorCopy} from "./copy";
import {timeoutDraft,TimeoutSaver,type TimeoutDraft,type TimeoutSaveState} from "./providerTimeoutModel";

const fields:[keyof TimeoutDraft,string,string][]=[
  ["connect_ms","连接与 TLS 握手","Connection and TLS handshake"],
  ["first_response_ms","首个 HTTP 响应头","First HTTP response headers"],
  ["idle_ms","响应体空闲（含首段）","Response body idle (including first chunk)"],
  ["total_ms","总预算","Total budget"],
];
export function ProviderTimeoutForm({provider,revision,busy,language,onSave,onCancel}:{provider:Provider;revision:number;busy:boolean;language:ProductLanguage;onSave:(input:SaveProviderTimeouts)=>Promise<boolean>;onCancel:()=>void}){
  const zh=language==="zh",id=useId();
  const [fixed]=useState(()=>({id:provider.id,revision}));
  const [draft,setDraft]=useState(()=>timeoutDraft(provider.timeouts));
  const [state,setState]=useState<TimeoutSaveState>({busy:false,error:null,saved:false});
  const callbacks=useRef({onSave,onCancel});
  const saver=useRef<TimeoutSaver|null>(null);
  useEffect(()=>{callbacks.current={onSave,onCancel};},[onSave,onCancel]);
  useEffect(()=>{
    const current=new TimeoutSaver(fixed.id,fixed.revision,input=>callbacks.current.onSave(input),next=>{setState(next);if(next.saved)callbacks.current.onCancel();});saver.current=current;
    return()=>{current.dispose();if(saver.current===current)saver.current=null;};
  },[fixed]);
  const disabled=busy||state.busy;
  const invalid=state.error&&typeof state.error==="object"&&"code"in state.error&&state.error.code==="INVALID_INPUT";
  function change(key:keyof TimeoutDraft,value:string){setDraft(old=>({...old,[key]:value}));setState(old=>({...old,error:null}));}
  return <form className="editor tagma-editor" aria-label={zh?"编辑供应商超时":"Edit provider timeouts"} onSubmit={event=>{event.preventDefault();if(!disabled)void saver.current?.submit(draft);}}>
    <h2>{provider.name} · {zh?"推理超时":"Inference timeouts"}</h2>
    <p className="sub">{zh?"所有值均为毫秒。连接 100–60,000，其他 100–120,000；连接 ≤ 响应头 ≤ 总预算，空闲 ≤ 总预算。":"All values are milliseconds. Connection: 100–60,000; others: 100–120,000. Connection ≤ headers ≤ total; idle ≤ total."}</p>
    <fieldset disabled={disabled}>{fields.map(([key,chinese,english])=><Fragment key={key}><label htmlFor={`${id}-${key}`}>{zh?chinese:english}</label><WordsField id={`${id}-${key}`} autoFocus={key==="connect_ms"} aria-label={`${zh?chinese:english} (${zh?"毫秒":"ms"})`} inputMode="numeric" pattern="[1-9][0-9]{2,5}" required maxLength={6} value={draft[key]} onChange={event=>change(key,event.target.value)}/></Fragment>)}</fieldset>
    {state.error!=null&&<p role="alert" className="tagma-error">{invalid?(zh?"请检查整数、范围及超时关系；不接受小数或前导零。":"Check integer values, ranges and timeout relationships; no fractions or leading zeros."):errorCopy(state.error,language)}</p>}
    <p className="sub">{zh?"保存后需要在网关应用配置，新请求才使用新值；在途请求保留原值。总预算含登记和响应读取，小队还受配方预算限制。目录检测使用独立策略。":"Save, then apply configuration in Gateway for new requests to use these values. In-flight requests retain the previous values. The total includes accounting and response reading; team recipe budgets also apply. Catalog checks have a separate policy."}</p>
    <p className="sub">{zh?"保存未确认时请刷新核对；不会自动重试。":"If saving is unconfirmed, refresh and verify. There is no automatic retry."}</p>
    <div className="tagma-actions"><TextBtn disabled={disabled} onClick={onCancel}>{zh?"取消":"Cancel"}</TextBtn><TextBtn type="submit" variant="primary" disabled={busy} busy={state.busy}>{zh?"保存":"Save"}</TextBtn></div>
  </form>;
}
