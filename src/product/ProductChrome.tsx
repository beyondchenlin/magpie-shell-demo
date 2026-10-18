import { Fragment, useEffect, useLayoutEffect, useState } from "react";
import { NavIcon } from "../components/NavIcons";
import { useSegThumb } from "../components/SegThumb";
import { flushSync } from "react-dom";
import { morphNavigation } from "../lib/navMorph";
import type { ApplicationView } from "./contract";
import type { ProductLanguage } from "./preferences";
import { copy } from "./copy";

export type ProductPage = "chat" | "providers" | "market" | "usage" | "gateway" | "settings";
export function ProductChrome({page,onPage,onRefresh,disabled,view,language}: {
  page:ProductPage;onPage:(page:ProductPage)=>void;onRefresh:()=>void;disabled:boolean;view:ApplicationView|null;language:ProductLanguage;
}) {
  const c=copy(language);
  const [layout,setLayout]=useState<"auto"|"side"|"top">(()=>{try {const saved=localStorage.getItem("tagma.nav.v1");return saved==="side"||saved==="top"?saved:"auto";}catch{return "auto";}});
  const [wide,setWide]=useState(()=>matchMedia("(min-width:1024px)").matches);
  const side=layout==="side"||(layout==="auto"&&wide);
  const thumb=useSegThumb(side?null:page);
  useEffect(()=>{const query=matchMedia("(min-width:1024px)");const change=()=>setWide(query.matches);query.addEventListener("change",change);return()=>query.removeEventListener("change",change);},[]);
  useLayoutEffect(()=>{document.body.classList.toggle("side-nav",side);return()=>document.body.classList.remove("side-nav");},[side]);
  const items=[{id:"chat" as const,label:c.chat,icon:"agents",group:language==="zh"?"工作":"Work"},{id:"providers" as const,label:c.providers,icon:"providers",group:language==="zh"?"模型":"Models"},{id:"market" as const,label:c.market,icon:"plugins",group:language==="zh"?"扩展":"Extend"},{id:"usage" as const,label:c.usage,icon:"usage",group:language==="zh"?"观测":"Observe"}];
  const navigation=<nav className="seg" id="nav" aria-label="Tagma" ref={side?undefined:thumb}>{items.map(item=><Fragment key={item.id}>{side&&<span className="nav-gl">{item.group}</span>}<button type="button" data-view={item.id} className={page===item.id?"on":""} aria-current={page===item.id?"page":undefined} disabled={disabled} onClick={()=>onPage(item.id)}>{side&&<NavIcon name={item.icon}/>}<span>{item.label}</span></button></Fragment>)}</nav>;
  const settings=<button id="prefs" type="button" className={`icon${page==="settings"?" on":""}`} disabled={disabled} title={c.settings} aria-label={c.settings} aria-current={page==="settings"?"page":undefined} onClick={()=>onPage("settings")}><svg viewBox="0 0 24 24" width={14} height={14} aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></g></svg><span className="side-l">{c.settings}</span></button>;
  return <>
    {side&&<aside id="side" className="sidebar"><div className="side-top" data-tauri-drag-region="deep"><div className="brand">Tagma</div></div><div className="side-scroll">{navigation}</div><div className="side-foot">{settings}<button type="button" className={`side-gw${view?.runtime.state==="running"?"":" off"}`} disabled={disabled} onClick={()=>onPage("gateway")}><i/><span>{c.gateway} {view?.runtime.address?.replace("http://","")??(view?c[view.runtime.state]:c.unknown)}</span></button></div></aside>}
    <header className="top" data-tauri-drag-region="deep"><div className="brand">Tagma</div><button type="button" className="icon side-toggle" id="sideToggle" aria-label={language==="zh"?"切换导航布局":"Toggle navigation layout"} aria-pressed={side} onClick={()=>{const next=side?"top":"side";morphNavigation(()=>flushSync(()=>setLayout(next)));try{localStorage.setItem("tagma.nav.v1",next);}catch{/* Optional layout preference only. */}}}><svg viewBox="0 0 16 16" width={15} height={15} aria-hidden="true"><rect className="st-pane" x="2.5" y="3.5" width="4" height="9" rx="1"/><g fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"><rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2.25"/><path d="M6.75 2.75v10.5"/></g></svg></button>
      {side?<div className="crumb"><span>{language==="zh"?"工作区":"Workspace"}</span><i>/</i><b>{c[page]}</b></div>:navigation}
      <div className="actions"><button type="button" className="icon" id="sync" disabled={disabled} title={c.refresh} aria-label={c.refresh} onClick={onRefresh}><svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3h-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg><span className="sr-only">{c.refresh}</span></button>{!side&&settings}</div>
    </header>
  </>;
}
