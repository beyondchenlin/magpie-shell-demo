import { useCallback, useEffect, useId, useRef, useState } from "react";
import { PrefPick } from "../components/PrefPick";
import { PopoverPortal } from "../components/PopoverPortal";
import { useProtocolMenu } from "../lib/useProtocolMenu";

export function ModelPick({value,models,labels,disabled,active=true,label,onChange}:{value:string;models:Map<string,string>;labels?:Map<string,string>;disabled:boolean;active?:boolean;label:string;onChange:(model:string)=>void}) {
  const [open,setOpen]=useState(false);
  const anchor=useRef<HTMLButtonElement>(null);
  const popup=useRef<HTMLDivElement>(null);
  const menuId=useId();
  const close=useCallback(()=>setOpen(false),[]);
  // Chat stays mounted when hidden. Its portal must not survive navigation or
  // retain document-level keyboard handlers while another page is active.
  const shown=open&&active&&!disabled;
  useEffect(()=>{if(!active||disabled)setOpen(false);},[active,disabled]);
  useProtocolMenu(popup,anchor,shown,close,{align:"right"});
  return <><PrefPick variant="protocol" ref={anchor} disabled={disabled||!active} aria-label={label} aria-haspopup="menu" aria-controls={shown?menuId:undefined} label={labels?.get(value)??(value||label)} open={shown} onClick={()=>setOpen(previous=>!previous)}/>{shown&&<PopoverPortal><div id={menuId} ref={popup} className="pop proto-menu tagma-model-menu" role="menu" aria-label={label} onBlur={event=>{const next=event.relatedTarget as Node|null;if(next&&!event.currentTarget.contains(next)&&!anchor.current?.contains(next))close();}}>{[...models].map(([model,source])=><button key={model} type="button" className={`pm-item${model===value?" on":""}`} role="menuitemradio" aria-checked={model===value} onClick={()=>{if(!active||disabled||!models.has(model))return;onChange(model);close();anchor.current?.focus({preventScroll:true});}}><span className="pm-tick" aria-hidden="true">{model===value?"✓":""}</span><span className="pm-words"><span className="pm-name">{labels?.get(model)??model}</span><span className="pm-note">{source}</span></span></button>)}</div></PopoverPortal>}</>;
}
