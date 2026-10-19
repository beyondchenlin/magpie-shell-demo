import {useEffect,useRef,useState} from "react";
import {WordsField} from "../components/WordsField";
import {TextBtn} from "../components/TextBtn";
import {desktop,service} from "./service";

function ResultExport({raw,zh}:{raw:string;zh:boolean}){
  const [directory,setDirectory]=useState("");
  const [busy,setBusy]=useState(false);
  const [saved,setSaved]=useState("");
  const [error,setError]=useState("");
  const mounted=useRef(true),pending=useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  async function save(){
    if(pending.current||!directory.trim())return;
    pending.current=true;setBusy(true);setError("");setSaved("");
    try{const path=await service.savePackResult(directory.trim(),raw);if(mounted.current)setSaved(path);}
    catch(value){if(mounted.current)setError(value&&typeof value==="object"&&"code" in value?String(value.code):"RESULT_SAVE_FAILED");}
    finally{pending.current=false;if(mounted.current)setBusy(false);}
  }
  const messages:Record<string,[string,string]>={
    RESULT_DIRECTORY_INVALID:["请选择已存在的绝对目录，不使用目录链接。","Choose an existing absolute directory without directory links."],
    RESULT_DIRECTORY_PROTECTED:["请将成果保存在安装目录和配置目录之外。","Choose a directory outside the installation and configuration directories."],
    RESULT_LIMIT:["成果内容或目录路径超过保存限制。","The result or directory exceeds the save limit."],
    RESULT_INVALID:["该返回内容不是可保存的 ReachFlow 成果。","This response is not a supported ReachFlow result."],
    CONFIRMATION_TIMEOUT:["保存状态尚未确认，请先检查所选目录，不要立即重复保存。","Save status is unconfirmed. Check the selected directory before saving again."],
  };
  return <div className="tagma-chat-setup">
    <WordsField aria-label={zh?"成果目录（已有绝对路径）":"Result directory (existing absolute path)"} placeholder={zh?"输入已有成果目录的完整路径":"Enter the full path to an existing results directory"} value={directory} maxLength={4096} disabled={busy||!desktop} onChange={event=>{setDirectory(event.target.value);setError("");}}/>
    <TextBtn variant="action" busy={busy} disabled={!desktop||!directory.trim()} onClick={()=>void save()}>{zh?"保存到成果目录":"Save to results directory"}</TextBtn>
    <p className="tagma-footnote">{zh?"保存本次返回内容为新 JSON 文件，不覆盖已有文件。报告预览仍为预览，完整报告请在 ReachFlow 查看。":"Save the returned content as a new JSON file without overwriting existing files. Report previews remain previews; view full reports in ReachFlow."}</p>
    {saved&&<p role="status" className="tagma-pack-result">{zh?"已保存：":"Saved: "}{saved}</p>}
    {error&&<p role="alert">{messages[error]?.[zh?0:1]??(zh?"保存未完成，请检查目录是否可写。":"Save failed. Check directory write access.")} ({error})</p>}
  </div>;
}

function resultView(raw:string,zh:boolean){
  let result:Record<string,unknown>;
  try{const value:unknown=JSON.parse(raw);if(!value||typeof value!=="object"||Array.isArray(value))throw Error();result=value as Record<string,unknown>;}catch{return <pre className="tagma-pack-result">{raw}</pre>;}
  const field=(key:string)=>typeof result[key]==="string"?String(result[key]):"";
  const count=(key:string)=>typeof result[key]==="number"&&Number.isSafeInteger(result[key])?String(result[key]):"—";
  if(result.mode==="local_fixed_sample")return <div className="tagma-pack-result"><strong>{zh?"本地试跑完成":"Local sample complete"}</strong><p>{zh?"仅检验队员协议；没有联网或生成研究成果。":"Pack protocol checked locally. No research service or model was called."}</p><ul>{Array.isArray(result.sources)&&result.sources.slice(0,100).map((source:unknown,index:number)=>{const item=source&&typeof source==="object"?source as Record<string,unknown>:{};return <li key={index}>{typeof item.title==="string"?item.title:"—"} · {typeof item.id==="string"?item.id:""}</li>;})}</ul></div>;
  if(result.mode==="reachflow_service")return <div className="tagma-pack-result"><strong>{zh?"ReachFlow 任务状态":"ReachFlow task status"}: {field("state")}</strong><p>{zh?"任务":"Task"} {field("task_id")}</p><p>{zh?"位置":"Location"}: {field("location")}</p><p>{zh?"候选 / 最终 / 失败":"Candidates / final / failed"}: {count("candidate_count")} / {count("final_count")} / {count("failed_count")}</p>{result.cancellation_requested===true&&<p>{zh?"已请求取消；请再次查询确认最终状态。":"Cancellation requested. Query again to confirm the final state."}</p>}</div>;
  if(result.mode==="reachflow_report")return <div className="tagma-pack-result"><strong>{zh?"ReachFlow 报告":"ReachFlow report"}</strong><p>{zh?"位置":"Location"}: {field("location")}</p><p>{zh?"报告 ID":"Report ID"}: {field("report_id")}</p><pre>{field("document_preview")}</pre>{result.preview_truncated===true&&<p>{zh?"仅显示前 8 KiB；完整报告请在 ReachFlow 查看。":"Preview limited to 8 KiB. Open ReachFlow for the full report."}</p>}</div>;
  return <pre className="tagma-pack-result">{raw}</pre>;
}

export function PackResult({raw,zh}:{raw:string;zh:boolean}){return <details className="tagma-chat-setup"><summary>{zh?"查看成果 / 试跑结果":"View results / sample output"}</summary>{resultView(raw,zh)}<ResultExport key={raw} raw={raw} zh={zh}/><details><summary>{zh?"原始返回内容":"Raw response"}</summary><pre className="tagma-pack-result">{raw}</pre></details></details>;}
