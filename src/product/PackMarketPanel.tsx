import {ReachFlowForm} from "./ReachFlowForm";
import {PackResult} from "./PackResult";
import {useEffect,useRef,useState} from "react";
import {PrefRow} from "../components/PrefRow";
import {TextBtn} from "../components/TextBtn";
import {desktop,protocolVersion,service} from "./service";
import type {ConfigView,PackMarketView,PackReviewView,PackTaskEvent,PackUserOperation,UsageRequestView,UsageAttemptView} from "./contract";
import {referencedPackVersions,executedPackVersions} from "./taskReferences";
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
    PACK_BUSY:["网关或队员仍在运行，请先停止网关并等待本机任务结束，再刷新状态。","The gateway or a pack is running. Stop the gateway, wait for local calls, then refresh status."],
    PACK_REMOVAL_PENDING:["上次卸载尚未完成，请在运行与卸载区域继续清理。成果不会删除。","An uninstall is pending. Continue cleanup below; saved results are retained."],
    PACK_CLEANUP_PENDING:["队员已从可调用配置移除，但运行文件清理失败。请解除文件占用或检查权限，再点继续清理；成果保留。","The pack is unregistered but runtime cleanup failed. Release file locks or check permissions, then continue cleanup. Results are retained."],
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
export function PackMarketPanel({config,busy,active,language,runtimeOwned,onRefresh,onEditingChange}:{config:ConfigView,busy:boolean,active:boolean,language:ProductLanguage,runtimeOwned:boolean,onRefresh:()=>Promise<void>,onEditingChange:(value:boolean)=>void}){
  const zh=language==="zh";
  const [releaseReady,setReleaseReady]=useState<boolean|null>(null);
  const [internalManifest,setInternalManifest]=useState<string|null>(null);
  const [review,setReview]=useState<PackReviewView|null>(null);
  const [task,setTask]=useState<PackTaskEvent|null>(null);
  const [working,setWorking]=useState(false);
  const [error,setError]=useState<unknown>(null);
  const [taskId,setTaskId]=useState("");
  const [maintenance,setMaintenance]=useState<PackMarketView|null>(null);
  const [inFlight,setInFlight]=useState<Array<{request:UsageRequestView,attempts:UsageAttemptView[]}>|null>(null);
  const [inFlightMore,setInFlightMore]=useState(false);
  const [inFlightError,setInFlightError]=useState(false);
  const [removeReview,setRemoveReview]=useState(false);
  const removeDialog=useRef<HTMLDialogElement>(null),removeButton=useRef<HTMLButtonElement>(null);
  const internalButton=useRef<HTMLButtonElement>(null);
  const file=useRef<HTMLInputElement>(null),alert=useRef<HTMLParagraphElement>(null),sample=useRef<HTMLButtonElement>(null);
  const mounted=useRef(true),runningId=useRef<string|null>(null),returnTo=useRef<HTMLElement|null>(null);
  const reachflow=config.installed_packs.find(pack=>pack.id==="reachflow");
  const installed=!!reachflow?.active_version;
  const internalOnly=reachflow?.versions.find(v=>v.version===reachflow.active_version)?.display_name==="ReachFlow 内部本地试跑";
  // This is only presentation. The host verifies the signed record on review.
  let internalVersion:string|null=null;
  if(internalManifest){try{const record=JSON.parse(internalManifest);const manifest=JSON.parse(record.manifest_utf8);if(typeof manifest.version==="string")internalVersion=manifest.version;}catch{/* Invalid catalogue remains subject to host verification. */}}
  const internalPresent=!!internalVersion&&reachflow?.versions.some(v=>v.version===internalVersion);
  const references=config.teams.flatMap(({team})=>{
    const describe=(recipe:typeof team.draft,suffix:string)=>{
      const pins=referencedPackVersions(recipe,"reachflow");
      return pins.length?[`${recipe.display_name} · ${suffix} · ${pins.join(" / ")}`]:[];
    };
    return [...describe(team.draft,zh?"草稿":"draft"),...team.versions.flatMap(version=>describe(version.recipe,version.public_id))];
  });
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{let live=true;if(active&&desktop)void service.packMarket().then(value=>{if(live){setMaintenance(value);setReleaseReady(value.release_ready);setInternalManifest(value.internal_manifest);setTask(previous=>previous?.text?previous:value.task);}},failure=>{if(live)setError(failure);});return()=>{live=false;};},[active,config.desired_revision]);
  useEffect(()=>{
    if(!active||!desktop){setInFlight(null);setInFlightError(false);return;}
    let live=true,querying=false;
    const refresh=async()=>{
      if(querying)return;
      querying=true;
      try{
        const end=Date.now()+1000;
        const found=await service.usageRequests({
          protocol_version:protocolVersion,
          range:{start_ms:Math.max(0,end-365*86400000),end_ms:end},
          filter:{provider_id:null,model:null,config_revision:null,team_revision:null,state:"running",error_code:null},
          cursor:null,limit:16,
        });
        const detailed=await Promise.all(found.records.map(async request=>{
          const value=await service.usageDetails({protocol_version:protocolVersion,request_id:request.request_id});
          return {request,attempts:value.attempts};
        }));
        if(live){setInFlight(detailed);setInFlightMore(found.next_cursor!==null);setInFlightError(false);}
      }catch{
        if(live){setInFlight(null);setInFlightError(true);}
      }finally{querying=false;}
    };
    void refresh();
    const timer=setInterval(()=>void refresh(),5000);
    return()=>{live=false;clearInterval(timer);};
  },[active,config.desired_revision]);
  useEffect(()=>{onEditingChange(working||!!review||removeReview);return()=>onEditingChange(false);},[working,review,removeReview,onEditingChange]);
  useEffect(()=>{if(removeReview)removeDialog.current?.showModal();else if(removeDialog.current?.open){removeDialog.current.close();removeButton.current?.focus();}},[removeReview]);
  useEffect(()=>{if(error)alert.current?.focus();},[error]);
  const locked=busy||working||!!maintenance?.pending_removal;
  const cannotRemove=busy||working||!!review||installed||!maintenance||maintenance.gateway_running||maintenance.pack_call_running;
  async function refreshMaintenance(){try{const value=await service.packMarket();if(mounted.current)setMaintenance(value);}catch(failure){if(mounted.current){setMaintenance(null);setError(failure);}}}
  async function stopForRemoval(){if(busy||working||!runtimeOwned)return;setWorking(true);setError(null);try{await service.stopGateway();}catch(failure){setError(failure);}finally{setWorking(false);await onRefresh();await refreshMaintenance();}}
  async function uninstall(){
    if(cannotRemove||runningId.current)return;
    setRemoveReview(false);setWorking(true);setError(null);
    const id=crypto.randomUUID();runningId.current=id;
    try{await service.uninstallPack({protocol_version:protocolVersion,task_id:id,expected_revision:config.desired_revision,pack_id:"reachflow"},receive);}
    catch(failure){if(mounted.current)setError(failure);}
    finally{runningId.current=null;if(mounted.current){setWorking(false);await onRefresh();await refreshMaintenance();}}
  }
  useEffect(()=>{if(!locked&&!review&&returnTo.current){if(returnTo.current instanceof HTMLButtonElement&&returnTo.current.disabled)return;if(!error&&returnTo.current.isConnected)returnTo.current.focus();returnTo.current=null;}},[locked,review,error,installed]);
  function receive(event:PackTaskEvent){if(!mounted.current||event.task_id!==runningId.current)return;setTask(event);if(event.text){try{const value=JSON.parse(event.text);if(value.mode==="reachflow_service"&&typeof value.task_id==="string")setTaskId(value.task_id);}catch{/* Result remains plain escaped text. */}}}
  async function choose(selected:File|undefined){if(!selected||locked)return;setWorking(true);setReview(null);setError(null);try{if(selected.size>395264)throw {code:"PACK_INVALID_MANIFEST"};const next=await service.reviewPack(await selected.text());if(mounted.current)setReview(next);}catch(failure){if(mounted.current)setError(failure);}finally{if(mounted.current)setWorking(false);if(file.current)file.current.value="";}}
  async function reviewInternal(){if(!internalManifest||locked)return;setWorking(true);setError(null);try{setReview(await service.reviewPack(internalManifest));}catch(failure){setError(failure);}finally{setWorking(false);}}
  async function install(){if(!review||locked)return;const selected=review;setWorking(true);setError(null);const id=crypto.randomUUID();runningId.current=id;setTask({task_id:id,phase:"starting",state:"running",text:null,error:null,pack_id:null,pack_version:null,preparation_id:null});try{await service.installPack({protocol_version:protocolVersion,task_id:id,review_id:selected.review_id,manifest_sha256:selected.manifest_sha256},receive);}catch(failure){if(mounted.current)setError(failure);}finally{runningId.current=null;if(mounted.current){returnTo.current=selected.publisher==="tagma-internal"?sample.current:file.current;setWorking(false);setReview(null);await onRefresh();}}}
  async function call(operation:PackUserOperation){if(locked||!installed)return;setWorking(true);setError(null);const id=crypto.randomUUID();runningId.current=id;setTask({task_id:id,phase:"calling",state:"running",text:null,error:null,pack_id:null,pack_version:null,preparation_id:null});try{await service.invokePack({protocol_version:protocolVersion,task_id:id,pack_id:"reachflow",operation},receive);}catch(failure){if(mounted.current)setError(failure);}finally{runningId.current=null;if(mounted.current){returnTo.current=sample.current;setWorking(false);}}}
  async function manage(version:string|null){
    if(locked||runningId.current||!reachflow)return;
    const id=crypto.randomUUID();runningId.current=id;setWorking(true);setError(null);
    try{await service.managePack({protocol_version:protocolVersion,task_id:id,expected_revision:config.desired_revision,pack_id:reachflow.id,version},receive);}
    catch(failure){if(mounted.current)setError(failure);}
    finally{runningId.current=null;if(mounted.current){setWorking(false);await onRefresh();}}
  }
  const phase:Record<string,string>=zh?{starting:"准备中",download:"下载中",verify:"校验与准备",health:"健康检查",deactivating:"保存停用",removing:"卸载运行文件",activated:"已登记版本",calling:"调用中",finished:"已结束"}:{};
  const state:Record<string,string>=zh?{running:"进行中",succeeded:"完成",failed:"失败",cancelled:"已取消",interrupted:"已中断"}:{};
  return <section aria-label={zh?"队员安装与调用":"Pack installation and calls"}>
    <div className="list prefs"><PrefRow name="ReachFlow" sub={zh?"本地固定素材试跑，以及已授权服务任务的调用与取消。":"Local fixed sample, authorized service calls and task cancellation."}><span>{maintenance?.pending_removal?(zh?"卸载未完成 · 待清理":"Uninstall incomplete · cleanup pending"):installed?`${zh?"已登记版本":"Registered version"} ${reachflow.active_version}`:reachflow?(zh?"已停用 · 保留版本":"Inactive · versions retained"):zh?"未安装":"Not installed"}</span></PrefRow></div>
    {releaseReady===false&&<p role="status" className="tagma-footnote">{zh?"当前发行版尚未配置正式队员发行公钥。可核验清单，但未受信任的发行包不能安装；本地试跑需要先安装有效队员。":"This release has no official pack signing roots. Untrusted manifests cannot be installed; a valid installed pack is required for the local sample."}</p>}
    {internalManifest&&<div className="tagma-editor"><p>{zh?"隔离开发候选提供已签名的内部测试包，仅用于本地固定素材试跑，不代表正式发行或真实采集服务。离线安装仍校验签名、内容和健康状态。":"This isolated development build includes a signed internal package for local samples only. It is not a production release or a research service. Offline installation verifies signature, content and health."}</p><TextBtn ref={internalButton} disabled={locked||!!review||internalPresent} onClick={()=>void reviewInternal()}>{internalPresent?(zh?"内部测试包已安装":"Internal package installed"):(reachflow?(zh?`更新 ReachFlow 内部测试包至 ${internalVersion}`:`Update internal ReachFlow package to ${internalVersion}`):(zh?"安装 ReachFlow 内部测试包":"Install internal ReachFlow package"))}</TextBtn></div>}
    {reachflow&&<details className="tagma-chat-setup"><summary>{zh?"已安装版本与小队引用":"Installed versions and team references"}</summary><p className="tagma-footnote">{zh?"停用保留运行文件和成果；网关应用新配置后不再接收该队员的新调用，已在途任务继续使用固定版本。这不是紧急撤销或卸载。重新启用会核验签名、文件及健康状态，失败不切换版本。":"Deactivation retains files and results. Once the gateway applies the revision, new calls are unavailable; in-flight tasks keep their pinned version. This is not emergency revocation or uninstall. Activation rechecks signature, files and health before switching."}</p>
      <ul>{reachflow.versions.map(version=><li key={version.version}><span>{version.version} · {version.display_name} </span><TextBtn disabled={locked||!!review||reachflow.active_version===version.version} onClick={()=>void manage(version.version)}>{reachflow.active_version===version.version?(zh?"当前活动版本":"Current active version"):(zh?"检查并启用 ":"Check and activate ")+version.version}</TextBtn></li>)}</ul>
      {references.length>0?<><p>{zh?"以下小队依赖此队员；停用后将暂时不可调用：":"These teams depend on this pack and become unavailable while it is inactive:"}</p><ul>{references.map((name,index)=><li key={index}>{name}</li>)}</ul></>:<p>{zh?"当前没有小队引用。":"No team references."}</p>}
      <TextBtn variant="danger" disabled={locked||!!review||!installed} onClick={()=>void manage(null)}>{zh?"停用 ReachFlow（保留文件）":"Deactivate ReachFlow (retain files)"}</TextBtn>
    </details>}
    {(reachflow||maintenance?.pending_removal)&&<details className="tagma-chat-setup" open={!!maintenance?.pending_removal}><summary>{zh?"运行状态与卸载":"Runtime status and uninstall"}</summary>
      <section aria-label={zh?"运行中的网关请求与版本引用":"Running gateway requests and version references"}>
        {inFlightError?<p role="alert">{zh?"用量账本读取失败，无法列出在途请求；卸载仍由网关和调用锁阻止。":"Usage ledger unavailable; task list is unverified, and process leases still block removal."}</p>:inFlight===null?<p>{zh?"正在核对在途任务……":"Checking in-flight tasks…"}</p>:inFlight.length===0?<p>{zh?"当前账本没有运行中请求。只要网关仍在运行，仍会阻止卸载以防新请求并发进入。":"No running requests in the ledger. A running gateway still blocks removal to prevent new admissions."}</p>:<>
          <p role="status">{zh?`当前记录 ${inFlight.length} 个运行中请求`:`${inFlight.length} running requests recorded`}{inFlightMore?(zh?"（还有更多，请到用量页查看）":" (more in Usage)"):null}</p>
          <ul>{inFlight.map(({request,attempts})=>{
            const versions=executedPackVersions(attempts);
            return <li key={request.request_id}><span>{zh?"请求":"Request"} {request.request_id}</span> · <span>{request.model}</span>
              {request.team_revision!==null&&<span> · {zh?"固定小队版本":"Pinned team revision"} {request.team_revision}</span>}
              <span> · {versions.length?(`${zh?"实际队员尝试":"Actual pack attempts"}: ${versions.join(", ")}`):(zh?"尚无已登记的队员执行版本":"No pack execution version registered yet")}</span>
            </li>;
          })}</ul>
        </>}
      </section>
      <p role="status">{!maintenance?(zh?"运行状态未确认，暂不能卸载。":"Runtime state unconfirmed; uninstall unavailable."):maintenance.gateway_running?(zh?"网关正在运行，可能仍有在途小队任务。卸载前请停止网关。":"The gateway is running and may have in-flight team tasks. Stop it before uninstalling."):maintenance.pack_call_running?(zh?"本机队员调用或健康检查进行中，请等待结束。":"A local pack call or health check is in progress. Wait for completion."):(zh?"网关已停止，当前未发现执行中的队员调用。卸载时会再次检查并阻止新调用。":"Gateway stopped; no pack call is currently executing. Uninstall rechecks and excludes new calls.")}</p>
      <p>{zh?"先停用队员，再停止本机网关。停止会中止本机活动请求，不会取消已提交的远端服务任务。卸载只移除队员运行文件，保留小队配方、用量和保存到成果目录的文件。依赖小队将不可调用，重新安装相同固定版本后恢复。":"Deactivate the pack, then stop the local gateway. Stopping interrupts local requests, not submitted remote tasks. Uninstall removes runtime files only; team recipes, usage and saved results remain. Dependent teams resume after reinstalling their pinned version."}</p>
      {references.length>0&&<ul>{references.map((name,index)=><li key={index}>{name}</li>)}</ul>}
      {maintenance?.pending_removal&&<p role="alert">{zh?"上次卸载未完成。已移除的运行文件不会伪报为已安装；请继续清理。":"The previous uninstall is incomplete. Removed runtime files are not reported as installed. Continue cleanup."}</p>}
      <div className="tagma-actions"><TextBtn disabled={busy||working} onClick={()=>void refreshMaintenance()}>{zh?"刷新运行状态":"Refresh runtime status"}</TextBtn><TextBtn disabled={busy||working||!runtimeOwned} onClick={()=>void stopForRemoval()}>{zh?"停止本机网关以维护队员":"Stop local gateway for maintenance"}</TextBtn><TextBtn ref={removeButton} variant="danger" disabled={cannotRemove} onClick={()=>setRemoveReview(true)}>{maintenance?.pending_removal?(zh?"继续清理运行文件":"Continue runtime cleanup"):(zh?"卸载 ReachFlow":"Uninstall ReachFlow")}</TextBtn></div>
    </details>}
    <dialog ref={removeDialog} className="tagma-confirm" onKeyDown={event=>{if(event.key!=="Tab")return;event.preventDefault();const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));if(!buttons.length)return;const index=buttons.findIndex(button=>button===document.activeElement);buttons[index<0?(event.shiftKey?buttons.length-1:0):(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}} aria-labelledby="tagma-pack-remove-title" onCancel={event=>{event.preventDefault();setRemoveReview(false);}}><h2 id="tagma-pack-remove-title">{zh?"卸载 ReachFlow？":"Uninstall ReachFlow?"}</h2><p>{zh?"将移除已登记版本的运行文件。小队配方和用户成果保留；依赖小队会暂时不可用。":"Remove registered runtime files. Team recipes and user results remain; dependent teams will be unavailable."}</p><p>{zh?`保留的小队引用：${references.length}`:`Retained team references: ${references.length}`}</p><div className="tagma-actions"><TextBtn autoFocus onClick={()=>setRemoveReview(false)}>{zh?"取消":"Cancel"}</TextBtn><TextBtn variant="danger" disabled={cannotRemove} onClick={()=>void uninstall()}>{zh?"确认卸载，保留成果":"Uninstall and retain results"}</TextBtn></div></dialog>
    <label className="tagma-compose-label">{zh?"选择队员发行清单":"Choose a pack release manifest"}<input ref={file} type="file" accept=".json,application/json" disabled={!desktop||locked||!!review} onChange={event=>void choose(event.target.files?.[0])}/></label>
    {error!=null&&<p ref={alert} role="alert" tabIndex={-1} className="tagma-error">{packError(error,zh)}</p>}
    {review&&<section className="tagma-editor" aria-label={zh?"安装确认":"Installation review"}><h2>{review.pack_id} · {review.version}</h2>{reachflow&&review.pack_id===reachflow.id&&<p role="status">{zh?`健康检查成功后，新对话将使用 ${review.version}；现有版本和小队固定版本保留。更新失败不会切换活动版本。`:`After health checks, new chats use ${review.version}. Existing versions and pinned teams are retained. Failed updates leave the active version unchanged.`}</p>}<div className="list prefs">
      {review.publisher==="tagma-internal"&&<PrefRow name={zh?"发行通道":"Channel"}><span>{zh?"内部测试 · 本地包 · 无网络权限":"Internal test · offline package · no network permissions"}</span></PrefRow>}
      <PrefRow name={zh?"发行者 / 平台":"Publisher / platform"}><span>{review.publisher} / {review.platform}</span></PrefRow>
      <PrefRow name={zh?"网络访问":"Network access"}><span>{review.network_hosts.join(", ")||(zh?"无声明":"None declared")}</span></PrefRow>
      <PrefRow name={zh?"工作目录 / 浏览器 / 子进程":"Workspace / browser / subprocess"}><span>{review.workspace} / {String(review.browser)} / {String(review.subprocess)}</span></PrefRow>
      <PrefRow name={zh?"下载 / 解包 / 逻辑峰值":"Download / unpack / logical peak"}><span>{[review.download_bytes,review.unpack_bytes,review.peak_bytes].map(n=>`${(Number(n)/1048576).toFixed(1)} MiB`).join(" / ")}</span></PrefRow>
      <PrefRow name={zh?"目标盘 / 临时盘缺口":"Target / temporary shortfall"}><span>{review.target_shortfall_bytes} / {review.temp_shortfall_bytes} B</span></PrefRow>
      <PrefRow name={zh?"声明内存 / 调用超时":"Declared memory / call timeout"}><span>{review.memory_mib} MiB / {review.timeout_ms/1000}s</span></PrefRow>
    </div><p className="tagma-footnote">{zh?"权限与内存为发行声明，当前不提供操作系统沙箱保证。安装将启动发行者提供的程序进行健康检查。":"Permissions and memory are publisher declarations, not an OS sandbox. Installation runs the publisher executable for its health check."}</p><div className="tagma-actions"><TextBtn disabled={locked} onClick={()=>{returnTo.current=review.publisher==="tagma-internal"?internalButton.current:file.current;setReview(null);}}>{zh?"取消":"Cancel"}</TextBtn><TextBtn variant="action" disabled={locked||!review.fits} onClick={()=>void install()}>{zh?"同意权限并安装":"Approve permissions and install"}</TextBtn></div></section>}
    <div className="tagma-actions"><TextBtn ref={sample} disabled={!desktop||locked||!!review||!installed} onClick={()=>void call({kind:"local_sample"})}>{zh?"运行本地固定素材试跑":"Run local fixed sample"}</TextBtn></div>
    {task&&<section className="tagma-editor" aria-label={zh?"队员任务":"Pack task"}><p role="status">{phase[task.phase]??task.phase} · {state[task.state]??task.state}</p><p className="tagma-footnote">{task.task_id}</p>{task.pack_id&&task.pack_version&&<p role="status">{zh?"本次调用固定队员版本":"Pinned pack version"}: {task.pack_id}@{task.pack_version} · {zh?"安装准备标识":"Preparation"} {task.preparation_id}</p>}{task.error&&<p className="tagma-error">{packError({code:task.error},zh)}</p>}{task.text&&<PackResult raw={task.text} zh={zh}/>}{working&&task.state==="running"&&<TextBtn onClick={()=>void service.cancelPack(runningId.current!).catch(setError)}>{zh?"停止本机操作 / 等待":"Stop local operation / waiting"}</TextBtn>}<p className="tagma-footnote">{zh?"停止本机等待不会取消已提交的服务任务。取消服务任务请使用下方明确操作，并查询最终状态。":"Stopping local waiting does not cancel a submitted service task. Use the explicit service cancellation below and check its final state."}</p></section>}
    <ReachFlowForm zh={zh} locked={locked||!!review} taskIdHint={taskId} unavailable={!installed?(zh?"请先安装 ReachFlow 队员。":"Install ReachFlow first."):internalOnly?(zh?"当前内部包没有网络权限。请安装允许服务域名的受信任队员包。":"This internal package has no network permissions. Install a trusted package permitting the service domain."):undefined} onSubmit={request=>void call({kind:"reach_flow",request})}/>
  </section>;
}
