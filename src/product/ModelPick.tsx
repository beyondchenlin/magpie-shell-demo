import { useCallback, useRef, useState } from "react";
import { PrefPick } from "../components/PrefPick";
import { PopoverPortal } from "../components/PopoverPortal";
import { useProtocolMenu } from "../lib/useProtocolMenu";

export function ModelPick({value,models,labels,disabled,label,onChange}:{value:string;models:Map<string,string>;labels?:Map<string,string>;disabled:boolean;label:string;onChange:(model:string)=>void}) {
  const [open,setOpen]=useState(false);
  const anchor=useRef<HTMLButtonElement>(null);
  const popup=useRef<HTMLDivElement>(null);
  const close=useCallback(()=>setOpen(false),[]);
  useProtocolMenu(popup,anchor,open,close,{align:"right"});
  return <><PrefPick variant="protocol" ref={anchor} disabled={disabled} aria-label={label} aria-haspopup="menu" label={labels?.get(value)??(value||label)} open={open} onClick={()=>setOpen(!open)}/>{open&&<PopoverPortal><div ref={popup} className="pop proto-menu tagma-model-menu" role="menu" aria-label={label}>{[...models].map(([model,source])=><button key={model} type="button" className={`pm-item${model===value?" on":""}`} role="menuitemradio" aria-checked={model===value} onClick={()=>{onChange(model);close();anchor.current?.focus();}}><span className="pm-tick" aria-hidden="true">{model===value?"✓":""}</span><span className="pm-words"><span className="pm-name">{labels?.get(model)??model}</span><span className="pm-note">{source}</span></span></button>)}</div></PopoverPortal>}</>;
}
