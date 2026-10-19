import {useState} from "react";
import {WordsField} from "../components/WordsField";
import {TextBtn} from "../components/TextBtn";
import type {ReachFlowAction,ReachFlowRequest} from "./contract";

export function ReachFlowForm({zh,locked,unavailable,taskIdHint="",onSubmit}:{zh:boolean;locked:boolean;unavailable?:string;taskIdHint?:string;onSubmit:(request:ReachFlowRequest)=>void}){
  const [connection,setConnection]=useState({service_url:"",workspace_id:"",access_token:""});
  const [action,setAction]=useState<"task_status"|"task_report"|"start_collection"|"cancel_task">("task_status");
  const [taskInput,setTaskInput]=useState({hint:taskIdHint,value:taskIdHint});
  const taskId=taskInput.hint===taskIdHint?taskInput.value:taskIdHint;
  function setTaskId(value:string){setTaskInput({hint:taskIdHint,value});}
  const [plan,setPlan]=useState({draft_id:"",confirmation_id:"",plan_digest:"",engine_selection_revision:"1",idempotency_key:""});
  function submitService(){
    if(locked||unavailable)return;
    let requestAction:ReachFlowAction;
    if(action==="start_collection")requestAction={kind:action,...plan,engine_selection_revision:Number(plan.engine_selection_revision)};
    else requestAction={kind:action,task_id:taskId};
    onSubmit({...connection,action:requestAction});
    setConnection(previous=>({...previous,access_token:""}));
  }
  return (    <details className="tagma-chat-setup"><summary>{zh?"连接 ReachFlow 服务并调用":"Connect to ReachFlow and call"}</summary><p className="tagma-footnote">{zh?"真实采集需要已在 ReachFlow 确认的计划、预算与授权；这里不会代为确认。连接和令牌仅保留在当前窗口内存，不写入配置。":"Real collection requires a plan, budget and authorization already confirmed in ReachFlow. Connection credentials remain in this window's memory."}</p>
      {unavailable&&<p role="status" className="tagma-footnote">{unavailable}</p>}
      <form className="tagma-editor tagma-pack-service" onSubmit={event=>{event.preventDefault();submitService();}}><fieldset disabled={locked||!!unavailable}>
      {([["service_url",zh?"服务地址（HTTPS）":"Service URL (HTTPS)"],["workspace_id",zh?"工作区":"Workspace"],["access_token",zh?"访问令牌":"Access token"]] as const).map(([key,label])=><label key={key}>{label}<WordsField required aria-label={label} type={key==="access_token"?"password":"text"} autoComplete="off" value={connection[key]} maxLength={key==="access_token"?8192:2048} onChange={e=>setConnection({...connection,[key]:e.target.value})}/></label>)}
      <label>{zh?"服务操作":"Service action"}<select className="words" value={action} onChange={e=>setAction(e.target.value as typeof action)}><option value="task_status">{zh?"查询任务":"Query task"}</option><option value="task_report">{zh?"查看任务报告":"View task report"}</option><option value="start_collection">{zh?"启动已确认的采集计划":"Start confirmed collection"}</option><option value="cancel_task">{zh?"请求取消服务任务":"Request service cancellation"}</option></select></label>
      {action==="start_collection"?([["draft_id",zh?"已确认计划 ID":"Confirmed draft ID"],["confirmation_id",zh?"确认记录 ID":"Confirmation ID"],["plan_digest",zh?"计划摘要":"Plan digest"],["engine_selection_revision",zh?"引擎选择版本":"Engine selection revision"],["idempotency_key",zh?"本次调用唯一标识":"Idempotency key"]] as const).map(([key,label])=><label key={key}>{label}<WordsField required aria-label={label} value={plan[key]} maxLength={160} onChange={e=>setPlan({...plan,[key]:e.target.value})}/></label>):<label>{zh?"服务任务 ID":"Service task ID"}<WordsField required value={taskId} maxLength={128} onChange={e=>setTaskId(e.target.value)}/></label>}
      <TextBtn type="submit" variant={action==="cancel_task"?"danger":"action"}>{action==="start_collection"?(zh?"明确启动采集":"Start collection"):action==="cancel_task"?(zh?"请求取消此服务任务":"Request cancellation"):action==="task_report"?(zh?"查看任务报告":"View task report"):(zh?"查询服务任务":"Query service task")}</TextBtn>
      </fieldset><TextBtn disabled={locked} onClick={()=>setConnection({service_url:"",workspace_id:"",access_token:""})}>{zh?"清除连接与令牌":"Clear connection and token"}</TextBtn></form>
    </details>);
}
