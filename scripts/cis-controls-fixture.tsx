// Test-only native-component states. Never imported by the product.
import {useEffect, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import {MagpieIcon} from "./src/components/MagpieIcon";
import {LibSwitch} from "./src/components/LibSwitch";
import {Tick} from "./src/components/Tick";
import {TextBtn} from "./src/components/TextBtn";
import {WordsField} from "./src/components/WordsField";
import {PrefRow} from "./src/components/PrefRow";
import {StatusToast} from "./src/components/StatusToast";
import {RequestArchive} from "./src/components/RequestArchive";
import "./src/styles/app.css";
import "./src/styles/routing.css";
import "./src/styles/library.css";
import "./src/styles/plugins.css";
import "./src/styles/sessions.css";
import "./src/styles/context.css";
import "./src/styles/shell-patch.css";

const icons=["openai","claude-color","alma","generic","cis-missing","file:cis-valid.png","file:cis-missing.png"];
function Fixture(){
 const [page,setPage]=useState("icons");
 const [on,setOn]=useState(false);
 const [checked,setChecked]=useState(false);
 const mixed=useRef<HTMLDivElement>(null);
 useEffect(()=>{const input=mixed.current?.querySelector("input");if(input)input.indeterminate=true;},[page]);
 return <main style={{padding:20,overflow:"auto"}}>
  <h1>CIS component states</h1>
  <TextBtn onClick={()=>setPage("icons")}>Show icons</TextBtn>
  <TextBtn onClick={()=>setPage("controls")}>Show controls</TextBtn>
  {page==="icons"?<div className="list">{icons.map(name=><PrefRow key={name} name={name}><MagpieIcon name={name}/></PrefRow>)}</div>:<>
   <div className="list prefs">
    <PrefRow name="Text buttons"><TextBtn>Text</TextBtn><TextBtn variant="action">Action</TextBtn><TextBtn variant="primary">Primary</TextBtn><TextBtn variant="danger">Danger</TextBtn><TextBtn disabled>Disabled</TextBtn><TextBtn busy>Busy</TextBtn></PrefRow>
    <PrefRow name="Words"><WordsField aria-label="Words" placeholder="Words"/><WordsField aria-label="Disabled words" disabled value="disabled" readOnly/></PrefRow>
    <PrefRow name="Invalid set field"><WordsField className="set-field" aria-label="Invalid words" invalid value="bad" readOnly/></PrefRow>
    <PrefRow name="Switch variants"><div id="fixture-switches">{["","use-credits","auto-reset"].map(kind=><LibSwitch key={kind} kind={kind} on={on} aria-label={kind||"base"} onClick={()=>setOn(v=>!v)}/>)}<span className="rt-group"><LibSwitch kind="rt-gon" on={on} aria-label="rt-gon" onClick={()=>setOn(v=>!v)}/></span><span className="rt-gedit"><span className="fbrow"><LibSwitch kind="rt-mon" on={on} aria-label="rt-mon" onClick={()=>setOn(v=>!v)}/></span></span>{["lib-tool","pm-mirror"].map(kind=><span className={kind} key={kind}><LibSwitch on={on} aria-label={kind} onClick={()=>setOn(v=>!v)}/></span>)}<RequestArchive on={on} onChange={setOn}/><LibSwitch on={on} disabled aria-label="disabled switch"/><LibSwitch kind="use-credits" on={on} disabled aria-label="disabled credits"/></div></PrefRow>
    <PrefRow name="Ticks"><Tick checked={checked} onChange={e=>setChecked(e.target.checked)}>Toggle tick</Tick><Tick disabled checked>Disabled tick</Tick><div ref={mixed}><Tick defaultChecked={false}>Mixed tick</Tick></div></PrefRow>
   </div>
   <StatusToast msg="Fixture status" kind="ok"/>
  </>}
 </main>;
}
createRoot(document.getElementById("root")!).render(<Fixture/>);
