import { useEffect, useId, useRef, useState } from "react";
import { PrefRow } from "../components/PrefRow";
import { WordsField } from "../components/WordsField";
import { Segs } from "../components/Segs";
import { TextBtn } from "../components/TextBtn";
import { LibSwitch } from "../components/LibSwitch";
import { ModelPick } from "./ModelPick";
import { protocolVersion, service } from "./service";
import type { ConfigView, TeamPublishIssue, TeamRecipe, TeamRecord, TeamStep, CloudTarget, CloudSelection, SaveTeam } from "./contract";
import type { ProductLanguage } from "./preferences";

const issueLabels:Record<TeamPublishIssue,[string,string]>={revoked_dependency:["步骤引用的连接已撤销","A step connection was revoked"],no_available_brain:["没有近期确认可用的云模型，请先手动试调用","No recently confirmed cloud model; make a manual test call first"],missing_steps:["添加至少一个步骤","Add a step"],unsupported_routing:["当前策略尚不可发布","Routing is not ready"],unsupported_brain:["请选择明确的最终回答模型","Choose an explicit answering model"],missing_brain:["最终回答模型不可用","Answering model is unavailable"],missing_dependency:["步骤引用的模型不可用","A step model is unavailable"],pack_not_available:["队员依赖未启用或不可用","Required pack is inactive or unavailable"],invalid_step_flow:["请检查输入来源和最终回答步骤","Check step inputs and final answer"],invalid_side_effect:["步骤副作用声明不匹配","Step side effects do not match"],budget_exceeded:["步骤预算合计超过整队预算","Step budgets exceed the team budget"]};
function issuesText(issues:TeamPublishIssue[],zh:boolean){return issues.map(issue=>issueLabels[issue][zh?0:1]).join(zh?"；":"; ");}
const brainKey="brain";
function explicit(target:CloudSelection):target is CloudTarget{return "provider_id" in target;}
function targetKey(target:CloudSelection){return explicit(target)?JSON.stringify([target.provider_id,target.model_id]):brainKey;}
function normalized(recipe:TeamRecipe):TeamRecipe{
  const last=recipe.steps.at(-1)?.target;
  const automatic=recipe.brain.kind==="first_cloud";
  const brain=!automatic&&last?.kind==="cloud_model"&&explicit(last.target)?{kind:"explicit" as const,target:last.target}:recipe.brain;
  return {...recipe,brain,steps:recipe.steps.map((step,index)=>({...step,...(automatic&&index+1===recipe.steps.length?{target:{kind:"cloud_model" as const,target:{kind:"brain" as const}}}:{}),input:index===0?"original_messages":step.input,output:index+1===recipe.steps.length?"final_answer":"intermediate_text"}))};
}

function TeamEditor({config,team,busy,zh,onSave,onCancel}:{config:ConfigView;team?:TeamRecord;busy:boolean;zh:boolean;onSave:(input:SaveTeam)=>Promise<boolean>;onCancel:()=>void}){
  const [revision]=useState(config.desired_revision);
  const [name,setName]=useState(team?.draft.display_name??"");const [slug,setSlug]=useState(team?.slug??"");
  const [recipe,setRecipe]=useState<TeamRecipe>(team?.draft??{display_name:"",brain:{kind:"first_cloud"},routing:"manual",steps:[],total_timeout_ms:30_000});
  const formId=useId();
  const options=new Map<string,string>();const labels=new Map<string,string>();const targets=new Map<string,CloudTarget>();
  for(const provider of config.providers)if(provider.enabled&&!config.security.revoked_provider_ids.includes(provider.id))for(const model of provider.models){const target={provider_id:provider.id,model_id:model};const key=targetKey(target);options.set(key,provider.name);labels.set(key,model);targets.set(key,target);}
  for(const step of recipe.steps)if(step.target.kind==="cloud_model"&&explicit(step.target.target)){
    const target=step.target.target;const key=targetKey(target);if(!targets.has(key)){options.set(key,zh?"已保存的目标 · 当前不可用":"Saved target · currently unavailable");labels.set(key,target.model_id);targets.set(key,target);}
  }
  const reachflow=config.installed_packs.find(pack=>pack.id==="reachflow"&&pack.active_version);
  const available=[...targets.values()].find(target=>config.providers.some(provider=>provider.id===target.provider_id&&provider.enabled&&provider.models.includes(target.model_id)));
  const automatic=recipe.brain.kind==="first_cloud";
  if(automatic||recipe.brain.kind==="explicit"){options.set(brainKey,zh?"小队的脑":"Team brain");labels.set(brainKey,automatic?(zh?"自动选择近期可用云模型":"Automatic recently confirmed cloud model"):(zh?"跟随最终回答模型":"Follow the answering model"));}
  function setBrainMode(mode:string){setRecipe(previous=>{if(mode==="first_cloud")return normalized({...previous,brain:{kind:"first_cloud"}});if(!available)return previous;return normalized({...previous,brain:{kind:"explicit",target:available},steps:previous.steps.map(step=>step.target.kind==="cloud_model"&&!explicit(step.target.target)?{...step,target:{kind:"cloud_model",target:available}}:step)});});}
  function updateStep(index:number,change:Partial<TeamStep>){setRecipe(previous=>normalized({...previous,steps:previous.steps.map((step,i)=>i===index?{...step,...change}:step)}));}
  function addStep(){if(!available&&!automatic)return;const step:TeamStep={target:{kind:"cloud_model",target:automatic?{kind:"brain"}:available!},input:recipe.steps.length?"previous_text":"original_messages",output:"final_answer",timeout_ms:10_000,failure:"abort",side_effect:"outbound_model_request"};setRecipe(previous=>normalized({...previous,steps:[...previous.steps,step]}));}
  function addReachflow(){if(!reachflow?.active_version)return;setRecipe(previous=>{const steps=[...previous.steps];if(!steps.length)steps.push({target:{kind:"cloud_model",target:automatic?{kind:"brain"}:available!},input:"previous_text",output:"final_answer",timeout_ms:10_000,failure:"abort",side_effect:"outbound_model_request"});steps.unshift({target:{kind:"pack",pack_id:"reachflow",version:reachflow.active_version!},input:"original_messages",output:"intermediate_text",timeout_ms:10_000,failure:"abort",side_effect:"pack_operation"});steps[1]={...steps[1],input:"previous_text"};return normalized({...previous,routing:"sequential",steps,total_timeout_ms:Math.max(previous.total_timeout_ms,steps.reduce((n,s)=>n+s.timeout_ms,0))});});}
  function move(index:number,direction:-1|1){setRecipe(previous=>{const steps=[...previous.steps];[steps[index],steps[index+direction]]=[steps[index+direction],steps[index]];return normalized({...previous,steps});});}
  return <form className="tagma-editor" aria-label={zh?"小队草稿":"Team draft"} aria-busy={busy} onSubmit={event=>{event.preventDefault();void onSave({protocol_version:protocolVersion,expected_revision:revision,id:team?.id??null,slug,recipe:normalized({...recipe,display_name:name.trim()})}).then(saved=>{if(saved)onCancel();});}}>
    <div className="list prefs">
      <PrefRow name={zh?"显示名":"Display name"}><WordsField id={`${formId}-name`} aria-label={zh?"显示名":"Display name"} value={name} disabled={busy} required maxLength={120} onChange={event=>setName(event.target.value)}/></PrefRow>
      <PrefRow name={zh?"公开标识":"Public slug"} subClassName="wraps" sub={zh?"tagma/ 前缀由系统添加；已发布后不能改名。":"The tagma/ prefix is added automatically. Publishing fixes this slug."}><WordsField id={`${formId}-slug`} aria-label={zh?"公开标识":"Public slug"} value={slug} disabled={busy||!!team?.versions.length} required minLength={2} maxLength={64} pattern="[a-z0-9]([a-z0-9]|-)*[a-z0-9]" onChange={event=>setSlug(event.target.value)}/></PrefRow>
      <PrefRow name={zh?"执行策略":"Routing"}><Segs value={recipe.routing} disabled={busy} items={[{id:"manual",label:zh?"固定模型":"Fixed model"},{id:"sequential",label:zh?"顺序步骤":"Sequential"}]} onChange={value=>setRecipe(previous=>normalized({...previous,routing:value as "manual"|"sequential",steps:value==="manual"?previous.steps.slice(-1):previous.steps}))}/></PrefRow>
      <PrefRow name={zh?"选脑方式":"Brain selection"} subClassName="wraps" sub={zh?"自动选择按设置中的有效顺序；需要五分钟内确认的推理成功，调用开始后目标保持不变。":"Automatic selection follows the configured order and requires inference success within five minutes. Each call pins its target."}><Segs value={automatic?"first_cloud":"explicit"} disabled={busy} items={[{id:"first_cloud",label:zh?"自动选择":"Automatic"},{id:"explicit",label:zh?"固定模型":"Explicit"}]} onChange={setBrainMode}/></PrefRow>
      <PrefRow name={zh?"整队时限（秒）":"Team deadline (seconds)"} subClassName="wraps" sub={zh?"到时中止；失败不自动重试或继续下一步。":"Stop at the deadline; failures are never replayed or continued."}><WordsField id={`${formId}-budget`} aria-label={zh?"整队时限（秒）":"Team deadline (seconds)"} type="number" min={1} max={120} required value={recipe.total_timeout_ms/1000||""} disabled={busy} onChange={event=>setRecipe(previous=>({...previous,total_timeout_ms:Number(event.target.value)*1000}))}/></PrefRow>
    </div>
    {recipe.steps.map((step,index)=><section key={`${formId}-step-${index}`} aria-label={`${zh?"步骤":"Step"} ${index+1}`}>
      <div className="tagma-section-label">{zh?"步骤":"Step"} {index+1}<span>{step.output==="final_answer"?(zh?"最终回答 · 脑":"Final answer · brain"):(zh?"中间文字":"Intermediate text")}</span><div className="tagma-actions"><TextBtn disabled={busy||index===0} aria-label={`${zh?"上移步骤":"Move step up"} ${index+1}`} onClick={()=>move(index,-1)}>↑</TextBtn><TextBtn disabled={busy||index+1===recipe.steps.length} aria-label={`${zh?"下移步骤":"Move step down"} ${index+1}`} onClick={()=>move(index,1)}>↓</TextBtn><TextBtn disabled={busy} onClick={()=>setRecipe(previous=>normalized({...previous,steps:previous.steps.filter((_,i)=>i!==index)}))}>{zh?"移除":"Remove"}</TextBtn></div></div>
      <div className="list prefs">
        <PrefRow name={zh?"模型与供应商":"Model and provider"} subClassName="wraps" sub={step.target.kind==="pack"?(zh?"运行已安装的固定队员版本；仅本地试跑，失败时中止。":"Run the pinned installed pack locally; stop on failure."):(zh?"内容将发送给此供应商；失败时中止。":"Content is sent to this provider; stop on failure.")}>{step.target.kind==="pack"?<span>ReachFlow · {step.target.version} · {zh?"本地固定素材试跑":"Local fixed sample"}</span>:<ModelPick value={step.target.kind==="cloud_model"?targetKey(step.target.target):""} models={options} labels={labels} disabled={busy||!options.size||(automatic&&index+1===recipe.steps.length)} label={zh?"选择云模型":"Choose cloud model"} onChange={value=>{const target:CloudSelection|undefined=value===brainKey?{kind:"brain"}:targets.get(value);if(target)updateStep(index,{target:{kind:"cloud_model",target},side_effect:"outbound_model_request"});}}/>}</PrefRow>
        <PrefRow name={zh?"输入来源":"Input source"}><Segs value={step.input} disabled={busy||index===0} items={[{id:"original_messages",label:zh?"原始消息":"Original messages"},{id:"previous_text",label:zh?"上步文字":"Previous text"}]} onChange={value=>updateStep(index,{input:value as TeamStep["input"]})}/></PrefRow>
        <PrefRow name={zh?"步骤时限（秒）":"Step deadline (seconds)"}><WordsField id={`${formId}-timeout-${index}`} aria-label={`${zh?"步骤时限（秒）":"Step deadline (seconds)"} ${index+1}`} type="number" min={1} max={120} required value={step.timeout_ms/1000||""} disabled={busy} onChange={event=>updateStep(index,{timeout_ms:Number(event.target.value)*1000})}/></PrefRow>
      </div>
    </section>)}
    <p className="tagma-footnote">{zh?"中间步骤只产生文字，只有最后一步对外回答。ReachFlow 步骤仅接受“本地试跑”命令，输出固定素材，不发起真实采集；后续云模型可能收费。":"Intermediate steps produce text; only the last step answers. ReachFlow accepts “local sample” only and produces fixed material without collection. Subsequent cloud models may incur charges."}</p>
    {!available&&<p className="tagma-footnote">{zh?"先配置一个已启用的供应商模型；当前仍可保存空草稿。":"Configure an enabled provider model first. An incomplete draft can still be saved."}</p>}
    <div className="tagma-actions"><TextBtn disabled={busy||!reachflow||(!available&&!automatic)||recipe.steps.length>=8} onClick={addReachflow}>{zh?"添加 ReachFlow 步骤":"Add ReachFlow step"}</TextBtn><TextBtn disabled={busy||(!available&&!automatic)||recipe.steps.length>=8||(recipe.routing==="manual"&&recipe.steps.length>0)} onClick={addStep}>{zh?"添加步骤":"Add step"}</TextBtn><TextBtn disabled={busy} onClick={onCancel}>{zh?"取消":"Cancel"}</TextBtn><TextBtn variant="action" type="submit" busy={busy}>{zh?"保存草稿":"Save draft"}</TextBtn></div>
  </form>;
}

export function TeamsPanel({config,busy,language,onMutate,onEditingChange}:{config:ConfigView;busy:boolean;language:ProductLanguage;onMutate:(operation:()=>Promise<ConfigView>)=>Promise<boolean>;onEditingChange:(editing:boolean)=>void}){
  const zh=language==="zh";const [editor,setEditor]=useState<TeamRecord|"new"|null>(null);const [deleting,setDeleting]=useState<TeamRecord|null>(null);const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{onEditingChange(!!editor||!!deleting);return()=>onEditingChange(false);},[editor,deleting,onEditingChange]);
  useEffect(()=>{if(!deleting)return;const previous=document.activeElement as HTMLElement|null;const currentDialog=dialog.current;currentDialog?.showModal();return()=>{currentDialog?.close();previous?.focus();};},[deleting]);
  const revision=config.desired_revision;
  return <section aria-label={zh?"组合小队":"Teams"}>
    <div className="tagma-heading"><h2>{zh?"组合小队":"Teams"}</h2><TextBtn variant="action" disabled={busy||!!editor||!!deleting} onClick={()=>setEditor("new")}>{zh?"新建小队":"New team"}</TextBtn></div>
    {!config.teams.length&&!editor&&<p className="tagma-footnote">{zh?"用已配置的云模型，组成固定目标或顺序步骤的小队。":"Compose a fixed model or sequential team from your configured cloud models."}</p>}
    {config.teams.map(view=>{const team=view.team;const next=team.versions.length+1;const publicId=`tagma/${team.slug}${next===1?"":`@${next}`}`;return <section key={team.id}>
      <div className="list prefs"><PrefRow name={team.draft.display_name} subClassName="wraps" sub={view.publish_issues.length?issuesText(view.publish_issues,zh):(zh?"草稿依赖已配置；发布前确认下方固定版本标识。":"Draft dependencies configured; review the fixed model ID before publishing.")}><TextBtn disabled={busy||!!editor||!!deleting} onClick={()=>setEditor(team)}>{zh?"编辑草稿":"Edit draft"}</TextBtn></PrefRow>
        <PrefRow name={zh?"下一发布版本":"Next published model"} subClassName="wraps" sub={zh?"发布固定此配方；修改草稿不会改变旧版本，调用可能产生供应商费用。":"Publishing fixes this recipe. Draft edits never change old versions. Calls may incur provider charges."}><span className="tagma-instance">{publicId}</span><TextBtn variant="action" disabled={busy||!!editor||!!deleting||view.publish_issues.length>0||next>16} onClick={()=>void onMutate(()=>service.publishTeam({protocol_version:protocolVersion,expected_revision:revision,id:team.id}))}>{zh?"发布此版本":"Publish revision"}</TextBtn></PrefRow>
        {view.published.map(version=><PrefRow key={version.revision} name={version.public_id} subClassName="wraps" sub={version.configured_ready?version.display_name:issuesText(version.issues,zh)}><LibSwitch on={version.enabled} disabled={busy||!!editor||!!deleting} aria-label={`${zh?"启用版本":"Enable revision"}: ${version.public_id}`} onClick={()=>void onMutate(()=>service.setTeamEnabled({protocol_version:protocolVersion,expected_revision:revision,id:team.id,team_revision:version.revision,enabled:!version.enabled}))}/></PrefRow>)}
      </div>
      {!team.versions.length&&<TextBtn variant="danger" disabled={busy||!!editor||!!deleting} onClick={()=>setDeleting(team)}>{zh?"删除草稿":"Delete draft"}</TextBtn>}
    </section>;})}
    {editor&&<TeamEditor key={editor==="new"?"new":editor.id} config={config} team={editor==="new"?undefined:editor} busy={busy} zh={zh} onSave={input=>onMutate(()=>service.saveTeam(input))} onCancel={()=>setEditor(null)}/>}
    <dialog ref={dialog} className="tagma-confirm" aria-label={zh?"删除小队草稿":"Delete team draft"} onCancel={event=>{if(busy)event.preventDefault();else setDeleting(null);}}><h2>{zh?"删除草稿":"Delete draft"}</h2><p>{deleting?.draft.display_name}</p><div className="tagma-actions"><TextBtn autoFocus disabled={busy} onClick={()=>setDeleting(null)}>{zh?"取消":"Cancel"}</TextBtn><TextBtn variant="danger" busy={busy} onClick={()=>{if(deleting)void onMutate(()=>service.deleteTeam({protocol_version:protocolVersion,expected_revision:revision,id:deleting.id})).then(saved=>{if(saved)setDeleting(null);});}}>{zh?"确认删除":"Delete"}</TextBtn></div></dialog>
  </section>;
}
