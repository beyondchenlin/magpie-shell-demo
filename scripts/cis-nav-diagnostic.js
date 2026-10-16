/* Task-only passive observation. No animation, DOM layout or preference changes. */
(() => {
  const output=document.createElement('script'); output.type='application/json';output.id='cis-nav-diagnostic';document.body.append(output);
  const runs=[];
  const style=(node,pseudo)=>{const s=getComputedStyle(node,pseudo);return{viewTransitionName:s.viewTransitionName,display:s.display,opacity:s.opacity,animationName:s.animationName,animationDuration:s.animationDuration,animationTimingFunction:s.animationTimingFunction,transform:s.transform,clipPath:s.clipPath,width:s.width,height:s.height}};
  document.addEventListener('click',event=>{
    if(!event.target.closest?.('#sideToggle'))return;
    const start=performance.now(),run={start,source:document.querySelector('meta[name="magpie-source-commit"]')?.content,frames:[]};runs.push(run);
    let n=0;
    const frame=t=>{
      const html=document.documentElement, main=[...document.querySelectorAll('main.view')].find(e=>!e.hidden&&getComputedStyle(e).display!=='none');
      const animations=document.getAnimations({subtree:true}).map(a=>({name:a.animationName||a.id||a.constructor.name,state:a.playState,pseudo:a.effect?.pseudoElement||null,target:a.effect?.target?.id||a.effect?.target?.tagName||null,time:a.currentTime,timing:a.effect?.getComputedTiming(),keyframes:a.effect?.getKeyframes()}));
      run.frames.push({t:t-start,morph:html.classList.contains('nav-morph'),visibility:document.visibilityState,main:main?{id:main.id,style:style(main)}:null,layer:style(html,'::view-transition'),pageOld:style(html,'::view-transition-old(page)'),pageNew:style(html,'::view-transition-new(page)'),rootOld:style(html,'::view-transition-old(root)'),rootNew:style(html,'::view-transition-new(root)'),animations});
      output.textContent=JSON.stringify({source:run.source,runs});
      if(++n<65&&(html.classList.contains('nav-morph')||t-start<600))requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },true);
  output.textContent=JSON.stringify({runs});
})();
