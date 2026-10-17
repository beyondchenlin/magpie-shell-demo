/* Test-only observer for the pinned CIS navigation checks. Never imported by the app.
 * An isolated snapshot builder injects it into its own preview. It observes UI clicks,
 * rAF cadence, long tasks and geometry without changing UI/motion values during a run.
 * Preference restoration is explicit through the task fixture, never a pagehide write. */
(() => {
  const report = document.createElement("script");
  report.id = "cis-motion-evidence";
  report.type = "application/json";
  document.body.append(report);
  const entries = [], longTasks = [];
  const initialNavPreference = localStorage.getItem("magpie.navLayout");
  const rect = node => node ? Object.fromEntries(["x", "y", "width", "height"].map(k => [k, node.getBoundingClientRect()[k]])) : null;
  const state = () => {
    const nav = document.getElementById("nav");
    const on = nav?.querySelector("button.on");
    const thumb = nav?.querySelector(":scope > .thumb");
    const style = thumb && getComputedStyle(thumb);
    const view = [...document.querySelectorAll("main.view")].find(n => !n.hidden);
    return {
      page: view?.id, selected: on?.dataset.view || (document.getElementById("prefs")?.classList.contains("on") ? "settings" : null),
      selectedCount: nav?.querySelectorAll("button.on").length || 0,
      side: document.body.classList.contains("side-nav"), morph: document.documentElement.classList.contains("nav-morph"),
      root: rect(document.getElementById("root")), caption: rect(document.querySelector(".win-caption")),
      on: on ? {x:on.offsetLeft,width:on.offsetWidth,rect:rect(on),background:getComputedStyle(on).backgroundColor} : null,
      thumb: thumb ? {display:style.display,x:style.transform,width:style.width,inlineWidth:thumb.style.width,rect:rect(thumb)} : null,
      overflow: view ? {scrollWidth:view.scrollWidth,clientWidth:view.clientWidth} : null,
      visibility:document.visibilityState,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
      zoom:getComputedStyle(document.documentElement).zoom,
    };
  };
  const publish = () => { report.textContent = JSON.stringify({schema:1,source:document.querySelector('meta[name="magpie-source-commit"]')?.content,probe:"cis-motion-probe-v1",initialNavPreference,entries}); report.dataset.count=String(entries.length); };
  let observer;
  try {
    observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) longTasks.push({start:entry.startTime,duration:entry.duration,name:entry.name});
      if (longTasks.length > 1000) longTasks.splice(0,longTasks.length-1000);
    });
    observer.observe({type:"longtask",buffered:true});
  } catch { /* Report unsupported below; never manufacture a zero count. */ }
  let active = null, serial = 0;
  document.addEventListener("click", event => {
    if (!event.target.closest?.("#sideToggle")) return;
    if (active) { active.overlap = true; return; }
    const before = state(), start = performance.now();
    const entry = {id:++serial,start,before,frames:[],longTasks:[],overlap:false,
      longTaskSupported:PerformanceObserver.supportedEntryTypes.includes("longtask"),
      reduced:matchMedia("(prefers-reduced-motion: reduce)").matches,
      declared:{duration:getComputedStyle(document.documentElement).getPropertyValue("--morph-t").trim(),easing:getComputedStyle(document.documentElement).getPropertyValue("--morph-ease").trim()}};
    active = entry;
    let last, sawMorph = false, stable = 0;
    const frame = timestamp => {
      const now = performance.now(), morph = document.documentElement.classList.contains("nav-morph");
      sawMorph ||= morph;
      entry.frames.push({t:timestamp-start,dt:last == null ? null : timestamp-last,morph,visibility:document.visibilityState,root:rect(document.getElementById("root")),caption:rect(document.querySelector(".win-caption"))});
      last = timestamp;
      stable = !morph && now-start > 100 ? stable+1 : 0;
      if ((sawMorph && stable >= 3) || now-start > 2000 || (!sawMorph && now-start > 600)) {
        entry.end = now; entry.sawMorph = sawMorph; entry.after = state();
        entry.longTasks = longTasks.filter(task => task.start+task.duration >= start && task.start <= now);
        entry.timedOut = now-start > 2000; entry.frameBudgetReached = entry.frames.length >= 180;
        entries.push(entry); active = null; publish();
      } else if (entry.frames.length < 180) requestAnimationFrame(frame);
      else { entry.end=now;entry.frameBudgetReached=true;entry.after=state();entries.push(entry);active=null;publish(); }
    };
    requestAnimationFrame(frame);
  },true);
  publish();
  addEventListener("pagehide",() => {
    observer?.disconnect();
  },{once:true});
})();
