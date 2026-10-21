import {useEffect,useRef,useState} from "react";
import {WordsField} from "../components/WordsField";
import {TextBtn} from "../components/TextBtn";
import {PackResult} from "./PackResult";
import {desktop,service} from "./service";
import type {SavedPackResult} from "./contract";

export function ResultBrowser({zh}:{zh:boolean}){
  const [directory,setDirectory]=useState(()=>{try{return localStorage.getItem("tagma.results.directory.v1")??"";}catch{return "";}});
  const [loaded,setLoaded]=useState("");
  const [items,setItems]=useState<SavedPackResult[]>([]);
  const [selected,setSelected]=useState<{name:string;raw:string}|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const mounted=useRef(true),pending=useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  async function run(name?:string){
    if(pending.current||!directory.trim())return;
    pending.current=true;setBusy(true);setError("");
    try{
      if(name){const raw=await service.readPackResult(loaded,name);if(mounted.current)setSelected({name,raw});}
      else {const path=directory.trim(),found=await service.listPackResults(path);if(mounted.current){setItems(found);setLoaded(path);setSelected(null);try{localStorage.setItem("tagma.results.directory.v1",path);}catch{/* Directory can be entered again. */}}}
    }catch(value){if(mounted.current){setSelected(null);setError(value&&typeof value==="object"&&"code" in value?String(value.code):"RESULT_READ_FAILED");}}
    finally{pending.current=false;if(mounted.current)setBusy(false);}
  }
  return <section aria-label={zh?"已保存成果":"Saved results"}><h1>{zh?"已保存成果":"Saved results"}</h1>
    <p className="tagma-footnote">{zh?"选择曾经保存成果的目录，点击读取。最多列出当前目录中的100份成果，不扫描子目录；文件中的文字只用于展示。":"Select a directory where you saved results, then read it. Lists up to 100 results without scanning subdirectories. File text is displayed only."}</p>
    <label>{zh?"成果目录":"Results directory"}<WordsField aria-label={zh?"读取成果目录":"Directory to read results"} value={directory} disabled={busy} maxLength={4096} onChange={event=>{setDirectory(event.target.value);setLoaded("");setItems([]);setSelected(null);setError("");}}/></label>
    <TextBtn variant="action" busy={busy} disabled={!desktop||!directory.trim()} onClick={()=>void run()}>{zh?"读取成果目录":"Read results directory"}</TextBtn>
    {error&&<p role="alert">{error==="RESULT_DIRECTORY_INVALID"?(zh?"目录无效或包含目录链接。请改用真实目录的完整路径；不要使用 junction/符号链接。":"The directory is invalid or contains a directory link. Enter the canonical full path; do not use a junction or symbolic link."):zh?"无法读取。请核对目录和文件是否存在、可读，且为 Tagma 保存的成果。":"Cannot read. Check directory access and that this is a saved Tagma result."} ({error})</p>}
    {loaded&&!items.length&&<p role="status">{zh?"该目录未找到可读取的成果文件。":"No readable results were found in this directory."}</p>}
    <ul>{items.map(item=><li key={item.name}><TextBtn disabled={busy} onClick={()=>void run(item.name)}>{item.name}</TextBtn><span className="tagma-footnote">{item.bytes} B</span></li>)}</ul>
    {selected&&<section aria-label={zh?"选中成果":"Selected result"}><h2>{selected.name}</h2><PackResult key={selected.name} raw={selected.raw} zh={zh}/></section>}
  </section>;
}
