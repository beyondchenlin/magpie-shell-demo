// Synthetic browser regression only. Never connects to Tagma or a native bridge.
import {build} from 'vite';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {createServer as netServer} from 'node:net';
import {readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const base=resolve('.cache/p0-s13-lifecycle');
const out=resolve(base,'motion-dist');
await build({configFile:false,root:base,base:'/',build:{outDir:out,emptyOutDir:false,rollupOptions:{input:resolve(base,'motion-test.html')}}});
const server=createServer((req,res)=>{const path=resolve(out,'.'+(req.url==='/'?'/motion-test.html':req.url));if(!path.startsWith(out+'/')&&!path.startsWith(out+'\\')||!existsSync(path)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',extname(path)==='.js'?'application/javascript':extname(path)==='.css'?'text/css':'text/html');res.end(readFileSync(path));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const reservation=netServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
const profile=resolve(base,'motion-browser-profile');mkdirSync(profile,{recursive:true});writeFileSync(resolve(profile,'owner.txt'),'p0-s13-synthetic-motion-only');
const browser=spawn('C:/Users/ai/AppData/Local/ms-playwright/chromium_headless_shell-1187/chrome-win/headless_shell.exe',[`--user-data-dir=${profile}`,`--remote-debugging-port=${port}`,'--remote-debugging-address=127.0.0.1','--no-first-run','--disable-background-networking','about:blank'],{windowsHide:true,stdio:'ignore'});
let socket,seq=0;const pending=new Map(),results=[];const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function cdp(method,params={}){return new Promise((yes,no)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);no(Error(method+' timeout'));},5000);pending.set(id,{yes:r=>{clearTimeout(timer);yes(r)},no});socket.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;}
const state=`(()=>{const box=document.querySelector('#product'),th=box.querySelector('.thumb'),on=box.querySelector('.on'),r=th.getBoundingClientRect(),o=on.getBoundingClientRect();return {animations:th.getAnimations().filter(a=>a.playState==='running').length,x:r.x,targetX:o.x,width:r.width,targetWidth:o.width}})()`;
try{
 let page;for(let i=0;i<60;i++){try{page=(await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json())).find(p=>p.type==='page');if(page)break;}catch{}await pause(100);}assert(page);
 socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true});});socket.addEventListener('message',e=>{const v=JSON.parse(e.data),p=pending.get(v.id);if(p){pending.delete(v.id);v.error?p.no(Error(v.error.message)):p.yes(v.result);}});
 await cdp('Page.enable');
 await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`window.motionListeners=new Set();const add=MediaQueryList.prototype.addEventListener,remove=MediaQueryList.prototype.removeEventListener;MediaQueryList.prototype.addEventListener=function(type,fn,...rest){if(this.media.includes('prefers-reduced-motion')&&type==='change')motionListeners.add(fn);return add.call(this,type,fn,...rest)};MediaQueryList.prototype.removeEventListener=function(type,fn,...rest){if(this.media.includes('prefers-reduced-motion')&&type==='change')motionListeners.delete(fn);return remove.call(this,type,fn,...rest)};`});
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await cdp('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});
 for(let n=0;n<50;n++){if(await evaluate(`!!document.querySelector('#product .thumb')`))break;await pause(50);}await pause(100);
 await evaluate(`document.querySelector('#product button:nth-of-type(2)').click()`);await pause(40);
 let r=await evaluate(state);assert(r.animations>0,'normal motion should remain');results.push({case:'normal motion preserved',...r});
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await pause(35);
 r=await evaluate(state);assert.equal(r.animations,0);assert(Math.abs(r.x-r.targetX)<1&&Math.abs(r.width-r.targetWidth)<1);results.push({case:'mid-glide preference change snaps to selected target',...r});
 await evaluate(`document.querySelector('#product button:nth-of-type(1)').click()`);await pause(35);
 r=await evaluate(state);assert.equal(r.animations,0);assert(Math.abs(r.x-r.targetX)<1);results.push({case:'reduced motion subsequent selection has no WAAPI',...r});
 await evaluate(`document.querySelector('#reference button:nth-of-type(2)').click()`);await pause(35);
 const legacy=await evaluate(`document.querySelector('#reference .thumb').getAnimations().filter(a=>a.playState==='running').length`);assert(legacy>0);results.push({case:'pinned CIS reference behavior preserved',animations:legacy});
 assert.equal(await evaluate('motionListeners.size'),1);await evaluate('unmountFixture()');assert.equal(await evaluate('motionListeners.size'),0);results.push({case:'media subscription removed on unmount',listeners:0});
 writeFileSync(resolve(base,'motion-browser-result.json'),JSON.stringify({kind:'synthetic-browser-not-native',results},null,2));console.log(JSON.stringify({passed:results.length,results}));
}finally{if(socket?.readyState===1){await cdp('Browser.close').catch(()=>{});socket.close();}if(browser.exitCode===null)await Promise.race([new Promise(r=>browser.once('exit',r)),pause(3000)]);if(browser.exitCode===null)browser.kill();await new Promise(r=>server.close(r));}
