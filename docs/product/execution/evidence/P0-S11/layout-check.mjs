// Browser layout diagnostics only; never connects to Tagma, its database, or its native bridge.
import {spawn,execFileSync} from 'node:child_process';
import {readFileSync,existsSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {createServer} from 'node:net';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const require=createRequire(resolve('package.json'));
const React=require('react'), {renderToStaticMarkup}=require('react-dom/server'),ts=require('typescript');
const cache=new Map([[resolve('src/product/service.ts'),{protocolVersion:1}]]);
function load(file){file=resolve(file);if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;const localRequire=name=>{if(!name.startsWith('.'))return require(name);const base=resolve(dirname(file),name);return load([base,base+'.ts',base+'.tsx'].find(existsSync));};vm.runInThisContext(`(function(require,module,exports){${source}\n})`,{filename:file})(localRequire,module,module.exports);cache.set(file,module.exports);return module.exports;}
const {ProviderForm}=load('src/product/ProviderForm.tsx'),{PrefRow}=load('src/components/PrefRow.tsx'),{Segs}=load('src/components/Segs.tsx'),{copy}=load('src/product/copy.ts');
const h=React.createElement;
const out=resolve('.cache/p0-s11-native-control');
const profile=resolve(out,'layout-browser-profile');mkdirSync(profile,{recursive:true});
const reservation=createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
const browser=spawn('C:/Users/ai/AppData/Local/ms-playwright/chromium_headless_shell-1187/chrome-win/headless_shell.exe',[`--user-data-dir=${profile}`,`--remote-debugging-port=${port}`,'--remote-debugging-address=127.0.0.1','--no-first-run','--disable-background-networking','about:blank'],{windowsHide:true,stdio:'ignore'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));let socket;let seq=0;const pending=new Map();
async function cdp(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;const timeout=setTimeout(()=>{pending.delete(id);reject(Error(method+' timeout'));},5000);pending.set(id,{resolve:v=>{clearTimeout(timeout);resolve(v);},reject});socket.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;}
const common=['app','routing','shell-patch','library','sessions','plugins','context'].map(n=>readFileSync(`src/styles/${n}.css`,'utf8')).join('\n');
const old=execFileSync('git',['show','fdaf657834d24db2d876fc85413d98d02094dfac:src/product/product.css'],{encoding:'utf8'}),fixed=readFileSync('src/product/product.css','utf8');
const results=[];
try{
 let page;for(let i=0;i<60;i++){try{page=(await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json())).find(p=>p.type==='page');if(page)break;}catch{}await pause(100);}assert(page,'owned headless browser did not start');
 socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true});});socket.addEventListener('message',e=>{const v=JSON.parse(e.data),p=pending.get(v.id);if(p){pending.delete(v.id);v.error?p.reject(Error(v.error.message)):p.resolve(v.result);}});
 await cdp('Emulation.setDeviceMetricsOverride',{width:660,height:600,deviceScaleFactor:1,mobile:false});
 for(const phase of ['before','after'])for(const language of ['zh','en'])for(const side of [false,true])for(const zoom of [1.1,1.5]){
  const c=copy(language);
  const form=renderToStaticMarkup(h(ProviderForm,{revision:4,busy:false,language,onSave:async()=>false,onCancel:()=>{}}));
  const settings=renderToStaticMarkup(h('section',{className:'tagma-settings'},h('div',{className:'list prefs'},h(PrefRow,{name:c.theme},h(Segs,{value:'light',items:[{id:'system',label:c.system},{id:'light',label:c.light},{id:'dark',label:c.dark}],onChange:()=>{}})),h(PrefRow,{name:c.size},h(Segs,{value:150,items:[100,110,125,150].map(id=>({id,label:id+'%'})),onChange:()=>{}})))));
  const html=`<html class="win" data-theme="light" style="zoom:${zoom};--zoom:${zoom}"><head><style>${common}\n${phase==='before'?old:fixed}</style></head><body class="window tagma ${side?'side-nav':''}"><div id="root">${side?'<aside class="sidebar" id="side"></aside>':''}<header class="top"></header><main class="view tagma-main">${form}${settings}</main></div></body></html>`;
  const {frameTree}=await cdp('Page.getFrameTree');await cdp('Page.setDocumentContent',{frameId:frameTree.frame.id,html});await pause(80);
  const geometry=await evaluate(`(()=>{const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,top:r.top,bottom:r.bottom}};const form=document.querySelector('form'),fr=rect(form),field=rect(form.querySelector('fieldset'));const fields=[...form.querySelectorAll('input:not([type=checkbox]),textarea')].map(rect);const settings=document.querySelector('.tagma-settings'),sr=rect(settings);const choices=[...settings.querySelectorAll('button')].map(rect);return {form:fr,fieldset:field,fields,settings:sr,choices,formDisplay:getComputedStyle(form).display,settingsOverflow:choices.some(r=>r.left<sr.left-1||r.right>sr.right+1),squeezed:fields.some(r=>r.width<80||r.left<fr.left-1||r.right>fr.right+1)}})()`);
  results.push({phase,language,side,zoom,...geometry});
  if(language==='zh'&&side&&zoom===1.5){await evaluate(`document.querySelector('.tagma-settings').scrollIntoView()`);const shot=await cdp('Page.captureScreenshot',{format:'png'});writeFileSync(resolve(out,`layout-${phase}-settings.png`),Buffer.from(shot.data,'base64'));await evaluate('document.querySelector("form").scrollIntoView()');const shot2=await cdp('Page.captureScreenshot',{format:'png'});writeFileSync(resolve(out,`layout-${phase}-editor.png`),Buffer.from(shot2.data,'base64'));}
 }
 writeFileSync(resolve(out,'layout-result.json'),JSON.stringify({kind:'synthetic-browser-layout-not-native',results},null,2));
 assert(results.some(r=>r.phase==='before'&&r.squeezed),'old form defect not reproduced');assert(results.some(r=>r.phase==='before'&&r.settingsOverflow),'old zoom clipping not reproduced');
 assert(results.filter(r=>r.phase==='after').every(r=>!r.squeezed&&!r.settingsOverflow),'fixed layout still clipped; inspect results');
 console.log(JSON.stringify({before:results.filter(r=>r.phase==='before').map(({language,side,zoom,squeezed,settingsOverflow})=>({language,side,zoom,squeezed,settingsOverflow})),afterPassed:results.filter(r=>r.phase==='after').length}));
} finally {if(socket?.readyState===1){await cdp('Browser.close').catch(()=>{});socket.close();}if(browser.exitCode===null)await Promise.race([new Promise(r=>browser.once('exit',r)),pause(3000)]);if(browser.exitCode===null)browser.kill();}
