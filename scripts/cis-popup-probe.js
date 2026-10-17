/** Read-only event/DOM evidence for isolated popup tests, not product code. */
(() => {
  const selector='.pop:not([aria-hidden="true"]), dialog.action-confirm';
  const data={probe:'cis-popup-v2',events:[],scrolls:[],arming:[]};let output;
  const snapshot=()=>({
    active:{tag:document.activeElement?.tagName,text:document.activeElement?.textContent?.slice(0,100),class:document.activeElement?.className},
    layers:[...document.querySelectorAll('.pop, dialog.action-confirm')].map(el=>({class:el.className,id:el.id,role:el.getAttribute('role'),hidden:el.hidden,ariaHidden:el.getAttribute('aria-hidden'),inert:el.inert,pointerEvents:getComputedStyle(el).pointerEvents,rect:el.getBoundingClientRect().toJSON()})),
  });
  const save=()=>{if(output)output.textContent=JSON.stringify(data);};
  const record=e=>{
    if(data.events.length>=120)return;
    const layers=[...document.querySelectorAll(selector)];
    if(!layers.length||e.type==='keydown'&&e.key!=='Escape')return;
    const entry={type:e.type,key:e.key,target:e.target?.tagName,targetClass:e.target?.className,targetText:e.target?.textContent?.slice(0,80),at:performance.now(),before:snapshot(),samples:[]};data.events.push(entry);
    const sample=phase=>{entry.samples.push({phase,at:performance.now(),...snapshot()});save();};
    queueMicrotask(()=>sample('microtask'));
    requestAnimationFrame(()=>sample('next-frame'));
    for(const ms of [50,230,430])setTimeout(()=>sample(ms+'ms'),ms);
  };
  document.addEventListener('keydown',record,true);document.addEventListener('mousedown',record,true);
  document.addEventListener('scroll',e=>{
    if(data.scrolls.length>=120||!document.querySelector(selector))return;
    data.scrolls.push({at:performance.now(),target:e.target?.tagName,class:e.target?.className,top:e.target?.scrollTop,...snapshot()});save();
  },true);
  addEventListener('DOMContentLoaded',()=>{
    output=document.createElement('script');output.id='cis-popup-evidence';output.type='application/json';document.body.append(output);save();
    const observer=new MutationObserver(records=>{
      for(const mutation of records){
        if(data.arming.length>=80)break;
        const el=mutation.target;
        if(mutation.attributeName!=='data-armed')continue;
        data.arming.push({at:performance.now(),class:el.className,armed:el.getAttribute('data-armed'),text:el.textContent});
      }
      save();
    });
    observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['data-armed']});
    addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  });
})();
