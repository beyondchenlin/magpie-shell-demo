import {ReachFlowForm} from "./ReachFlowForm";
import {PackResult} from "./PackResult";
import {useEffect,useRef,useState} from "react";
import {PrefRow} from "../components/PrefRow";
import {TextBtn} from "../components/TextBtn";
import {desktop,protocolVersion,service} from "./service";
import type {ConfigView,PackReviewView,PackTaskEvent,PackUserOperation} from "./contract";
import type {ProductLanguage} from "./preferences";

function packError(value:unknown,zh:boolean){
  const code=typeof value==="object"&&value&&"code" in value?String(value.code):"PACK_UNAVAILABLE";
  const labels:Record<string,[string,string]>={
    PACK_UNTRUSTED_PUBLISHER:["发行者尚未受信任。请使用包含该发行者公钥的正式 Tagma 发行版；不会跳过签名。","Publisher is not trusted by this release. Signature verification cannot be skipped."],
    PACK_INVALID_SIGNATURE:["发行清单签名无效，请重新获取官方发行包。","The manifest signature is invalid. Obtain the official release again."],
    PACK_INVALID_MANIFEST:["安装清单或调用参数格式无效。","Invalid manifest or request fields."],
    PACK_REVIEW_EXPIRED:["安装确认已过期或已使用，请重新选择清单核验。","Review expired or was consumed. Select the manifest again."],
    CONFIG_CONFLICT:["配置已变化，请刷新后重新核验清单。","Configuration changed. Refresh and review again."],
    PACK_CANCELLED:["本机操作已取消。","Local operation cancelled."],
    PACK_NETWORK_NOT_ALLOWED:["队员清单未允许该服务域名，未发送网络请求。","The package does not permit this service domain. No network request was sent."],
    PACK_INVALID_INPUT:["请核对服务地址、工作区和调用参数。","Check the service URL, workspace and request fields."],
    PACK_INTERRUPTED:["上次本机操作被中断，尚未确认完成；不会自动重试。请核对安装状态或服务任务。","The previous operation was interrupted. Check installation or service state; it will not replay automatically."],
    PACK_SPACE_UNAVAILABLE:["可用空间不足，安装未切换活动版本。","Insufficient free space; the active version was not changed."],
    PACK_DOWNLOAD_FAILED:["发行包下载失败。检查网络和官方发行地址后重新核验。","Download failed. Check the network and release source, then review again."],
    REACHFLOW_AUTH_REQUIRED:["服务拒绝授权，请检查工作区和访问令牌。","The service rejected authorization. Check the workspace and access token."],
    REACHFLOW_CONFIRMATION_REQUIRED:["服务要求重新核对计划、预算或授权，请先在 ReachFlow 完成确认。","Review the plan, budget and authorization in ReachFlow first."],
    REACHFLOW_RESULT_UNCONFIRMED:["服务操作结果未确认，可能已经提交。请查询原任务或在服务端按幂等标识核对，不要直接重复启动。","The service outcome is unconfirmed and may have been submitted. Check the task or original idempotency key before starting again."],
    REACHFLOW_REPORT_UNAVAILABLE:["该任务尚无可查看的报告。请先查询任务状态，或在 ReachFlow 检查成果。","This task has no available report yet. Check its status or view results in ReachFlow."],
  };
  return `${labels[code]?.[zh?0:1]??(zh?"操作未完成，请检查安装状态与服务条件。":"Operation did not complete. Check installation and service requirements.")} (${code})`;
}
export function PackMarketPanel({config,busy,active,language,onRefresh,onEditingChange}:{config:ConfigView,busy:boolean,active:boolean,language:ProductLanguage,onRefresh:()=>Promise<void>,onEditingChange:(value:boolean)=>void}){
  const zh=language==="zh";
  const [releaseReady,setReleaseReady]=useState<boolean|null>(null);
  const [internalManifest,setInternalManifest]=useState<string|null>(null);
  const [review,setReview]=useState<PackReviewView|null>(null);
  const [task,setTask]=useState<PackTaskEvent|null>(null);
  const [working,setWorking]=useState(false);
  const [error,setError]=useState<unknown>(null);
  const [taskId,setTaskId]=useState("");
  const internalButton=useRef<HTMLButtonElement>(null);
  const file=useRef<HTMLInputElement>(null),alert=useRef<HTMLParagraphElement>(null),sample=useRef<HTMLButtonElement>(null);
  const mounted=useRef(true),runningId=useRef<string|null>(null),returnTo=useRef<HTMLElement|null>(null);
  const reachflow=config.installed_packs.find(pack=>pack.id==="reachflow");
  const installed=!!reachflow?.active_version;
  const internalOnly=reachflow?.versions.find(v=>v.version===reachflow.active_version)?.display_name==="ReachFlow 内部本地试跑";
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{let live=true;if(active&&desktop)void service.packMarket().then(value=>{if(live){setReleaseReady(value.release_ready);setInternalManifest(value.internal_manifest);setTask(previous=>previous?.text?previous:value.task);}},failure=>{if(live)setError(failure);});return()=>{live=false;};},[active]);
  useEffect(()=>{onEditingChange(working||!!review);return()=>onEditingChange(false);},[working,review,onEditingChange]);
  useEffect(()=>{if(error)alert.current?.focus();},[error]);
  const locked=busy||working;
  useEffect(()=>{if(!locked&&!review&&returnTo.current){if(returnTo.current instanceof HTMLButtonElement&&returnTo.current.disabled)return;if(!error&&returnTo.current.isConnected)returnTo.current.focus();returnTo.current=null;}},[locked,review,error,installed]);
  function receive(event:PackTaskEvent){if(!mounted.current||event.task_id!==runningId.current)return;setTask(event);if(event.text){try{const value=JSON.parse(event.text);if(value.mode==="reachflow_service"&&typeof value.task_id==="string")setTaskId(value.task_id);}catch{/* Result remains plain escaped text. */}}}
  async function choose(selected:File|undefined){if(!selected||locked)return;setWorking(true);setReview(null);setError(null);try{if(selected.size>395264)throw {code:"PACK_INVALID_MANIFEST"};const next=await service.reviewPack(await selected.text());if(mounted.current)setReview(next);}catch(failure){if(mounted.current)setError(failure);}finally{if(mounted.current)setWorking(false);if(file.current)file.current.value="";}}
  async function reviewInternal(){if(!internalManifest||locked)return;setWorking(true);setError(null);try{setReview(await service.reviewPack(internalManifest));}catch(failure){setError(failure);}finally{setWorking(false);}}
  async function install(){if(!review||locked)return;const selected=review;setWorking(true);setError(null);const id=crypto.randomUUID();runningId.current=id;setTask({task_id:id,phase:"starting",state:"running",text:null,error:null});try{await service.installPack({protocol_version:protocolVersion,task_id:id,review_id:selected.review_id,manifest_sha256:selected.manifest_sha256},receive);}catch(failure){if(mounted.current)setError(failure);}finally{runningId.current=null;if(mounted.current){returnTo.current=selected.publisher==="tagma-internal"?sample.current:file.current;setWorking(false);setReview(null);await onRefresh();}}}
  async function call(operation:PackUserOperation){if(locked||!installed)return;setWorking(true);setError(null);const id=crypto.randomUUID();runningId.current=id;setTask({task_id:id,phase:"calling",state:"running",text:null,error:null});try{await service.invokePack({protocol_version:protocolVersion,task_id:id,pack_id:"reachflow",operation},receive);}catch(failure){if(mounted.current)setError(failure);}finally{runningId.current=null;if(mounted.current){returnTo.current=sample.current;setWorking(false);}}}
  const phase:Record<string,string>=zh?{starting:"准备中",download:"下载中",verify:"校验与准备",health:"健康检查",activated:"已登记版本",calling:"调用中",finished:"已结束"}:{};
  const state:Record<string,string>=zh?{running:"进行中",succeeded:"完成",failed:"失败",cancelled:"已取消",interrupted:"已中断"}:{};
  return <section aria-label={zh?"队员安装与调用":"Pack installation and calls"}>
    <div className="list prefs"><PrefRow name="ReachFlow" sub={zh?"本地固定素材试跑，以及已授权服务任务的调用与取消。":"Local fixed sample, authorized service calls and task cancellation."}><span>{installed?`${zh?"已登记版本":"Registered version"} ${reachflow.active_version}`:zh?"未安装":"Not installed"}</span></PrefRow></div>
    {releaseReady===false&&<p role="status" className="tagma-footnote">{zh?"当前发行版尚未配置正式队员发行公钥。可核验清单，但未受信任的发行包不能安装；本地试跑需要先安装有效队员。":"This release has no official pack signing roots. Untrusted manifests cannot be installed; a valid installed pack is required for the local sample."}</p>}
    {internalManifest&&<div className="tagma-editor"><p>{zh?"隔离开发候选提供已签名的内部测试包，仅用于本地固定素材试跑，不代表正式发行或真实采集服务。离线安装仍校验签名、内容和健康状态。":"This isolated development build includes a signed internal package for local samples only. It is not a production release or a research service. Offline installation verifies signature, content and health."}</p><TextBtn ref={internalButton} disabled={locked||!!review||internalOnly} onClick={()=>void reviewInternal()}>{internalOnly?(zh?"内部测试包已安装":"Internal package installed"):(zh?"安装 ReachFlow 内部测试包":"Install internal ReachFlow package")}</TextBtn></div>}
    <label className="tagma-compose-label">{zh?"选择队员发行清单":"Choose a pack release manifest"}<input ref={file} type="file" accept=".json,application/json" disabled={!desktop||locked||!!review} onChange={event=>void choose(event.target.files?.[0])}/></label>
    {error!=null&&<p ref={alert} role="alert" tabIndex={-1} className="tagma-error">{packError(error,zh)}</p>}
    {review&&<section className="tagma-editor" aria-label={zh?"安装确认":"Installation review"}><h2>{review.pack_id} · {review.version}</h2><div className="list prefs">
      {review.publisher==="tagma-internal"&&<PrefRow name={zh?"发行通道":"Channel"}><span>{zh?"内部测试 · 本地包 · 无网络权限":"Internal test · offline package · no network permissions"}</span></PrefRow>}
      <PrefRow name={zh?"发行者 / 平台":"Publisher / platform"}><span>{review.publisher} / {review.platform}</span></PrefRow>
      <PrefRow name={zh?"网络访问":"Network access"}><span>{review.network_hosts.join(", ")||(zh?"无声明":"None declared")}</span></PrefRow>
      <PrefRow name={zh?"工作目录 / 浏览器 / 子进程":"Workspace / browser / subprocess"}><span>{review.workspace} / {String(review.browser)} / {String(review.subprocess)}</span></PrefRow>
      <PrefRow name={zh?"下载 / 解包 / 逻辑峰值":"Download / unpack / logical peak"}><span>{[review.download_bytes,review.unpack_bytes,review.peak_bytes].map(n=>`${(Number(n)/1048576).toFixed(1)} MiB`).join(" / ")}</span></PrefRow>
      <PrefRow name={zh?"目标盘 / 临时盘缺口":"Target / temporary shortfall"}><span>{review.target_shortfall_bytes} / {review.temp_shortfall_bytes} B</span></PrefRow>
      <PrefRow name={zh?"声明内存 / 调用超时":"Declared memory / call timeout"}><span>{review.memory_mib} MiB / {review.timeout_ms/1000}s</span></PrefRow>
    </div><p className="tagma-footnote">{zh?"权限与内存为发行声明，当前不提供操作系统沙箱保证。安装将启动发行者提供的程序进行健康检查。":"Permissions and memory are publisher declarations, not an OS sandbox. Installation runs the publisher executable for its health check."}</p><div className="tagma-actions"><TextBtn disabled={locked} onClick={()=>{returnTo.current=review.publisher==="tagma-internal"?internalButton.current:file.current;setReview(null);}}>{zh?"取消":"Cancel"}</TextBtn><TextBtn variant="action" disabled={locked||!review.fits} onClick={()=>void install()}>{zh?"同意权限并安装":"Approve permissions and install"}</TextBtn></div></section>}
    <div className="tagma-actions"><TextBtn ref={sample} disabled={!desktop||locked||!!review||!installed} onClick={()=>void call({kind:"local_sample"})}>{zh?"运行本地固定素材试跑":"Run local fixed sample"}</TextBtn></div>
    {task&&<section className="tagma-editor" aria-label={zh?"队员任务":"Pack task"}><p role="status">{phase[task.phase]??task.phase} · {state[task.state]??task.state}</p><p className="tagma-footnote">{task.task_id}</p>{task.error&&<p className="tagma-error">{packError({code:task.error},zh)}</p>}{task.text&&<PackResult raw={task.text} zh={zh}/>}{working&&task.state==="running"&&<TextBtn onClick={()=>void service.cancelPack(runningId.current!).catch(setError)}>{zh?"停止本机操作 / 等待":"Stop local operation / waiting"}</TextBtn>}<p className="tagma-footnote">{zh?"停止本机等待不会取消已提交的服务任务。取消服务任务请使用下方明确操作，并查询最终状态。":"Stopping local waiting does not cancel a submitted service task. Use the explicit service cancellation below and check its final state."}</p></section>}
    <ReachFlowForm zh={zh} locked={locked||!!review} taskIdHint={taskId} unavailable={!installed?(zh?"请先安装 ReachFlow 队员。":"Install ReachFlow first."):internalOnly?(zh?"当前内部包没有网络权限。请安装允许服务域名的受信任队员包。":"This internal package has no network permissions. Install a trusted package permitting the service domain."):undefined} onSubmit={request=>void call({kind:"reach_flow",request})}/>
  </section>;
}
