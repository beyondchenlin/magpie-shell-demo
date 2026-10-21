// Component regression only: synthetic configuration and service, not native acceptance.
// Reuses the installed Electron binary and Vite; never installs a browser or calls a model.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const electron=path.join(root,'node_modules/electron/dist',process.platform==='win32'?'electron.exe':process.platform==='darwin'?'Electron.app/Contents/MacOS/Electron':'electron');
await fs.access(electron); // Do not require electron: its loader can auto-download.
await fs.mkdir(path.join(root,'.cache'),{recursive:true});
const temporary=await fs.mkdtemp(path.join(root,'.cache','tagma-chat-selection-'));
let server,child,timer;
try {
  const entry=path.join(temporary,'fixture.tsx');
  await fs.writeFile(entry,`
import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {ChatView} from '../../src/product/ChatView';
import {service} from '../../src/product/service';
const root=createRoot(document.getElementById('root')!);
let selected='tagma/reachflow',active=true,busy=false;
let view:any={product_version:'component-test',config:{desired_revision:1,providers:[{id:'synthetic-cloud',name:'Controlled cloud',enabled:true,models:['cloud-a','cloud-b']}],security:{revoked_provider_ids:[]},teams:[],profiles:[],installed_packs:[{id:'reachflow',active_version:'1.0.0',versions:[{version:'1.0.0',display_name:'ReachFlow 内部本地试跑'}]}]},runtime:{state:'running',effective_revision:1,address:'http://127.0.0.1:1',error:null}};
function render(){flushSync(()=>root.render(<div hidden={!active}><ChatView view={view} busy={busy} language="zh" active={active} selectedModel={selected} onModelChange={value=>{selected=value;render();}} onAddProvider={()=>{throw Error('unexpected navigation')}} onProviders={()=>{throw Error('unexpected navigation')}} onGateway={()=>{throw Error('unexpected navigation')}} onMarket={()=>{throw Error('unexpected navigation')}}/></div>));}
const tick=()=>new Promise(resolve=>setTimeout(resolve,30));
const check=(condition:any,name:string)=>{if(!condition)throw Error(name);passed.push(name);};
const passed:string[]=[];
const pick=()=>document.querySelector<HTMLButtonElement>('[aria-label="选择模型"]')!;
const draft=()=>document.querySelector<HTMLTextAreaElement>('#tagma-message')!;
function type(text:string){Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(draft(),text);draft().dispatchEvent(new Event('input',{bubbles:true}));}
function submit(){document.querySelector<HTMLFormElement>('.tagma-composer')!.requestSubmit();}
async function choose(id:string){pick().click();await tick();const button=[...document.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')].find(item=>item.querySelector('.pm-name')?.textContent===id);if(!button)throw Error('missing choice '+id);button.click();await tick();}
(window as any).__tagmaRegression=(async()=>{
 render();await tick();type('retained private draft');await tick();
 view.config.installed_packs[0].active_version=null;render();await tick();
 check(pick().textContent?.includes('tagma/reachflow'),'removed pack selection stays visible');
 check(draft().value==='retained private draft','removal retains the draft');
 check(document.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled,'removed target disables send');
 submit();draft().dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await tick();
 check((service as any).calls.length===0,'unavailable target blocks submit and Enter without fallback');
 await choose('cloud-a');submit();await tick();
 check((service as any).calls[0]?.model==='cloud-a','explicit reselection is the actual request target');
 check(selected==='cloud-a','first send fixes the selection');
 view.config.providers[0].enabled=false;render();await tick();
 check(!!document.querySelector('.tagma-chat')&&pick().textContent?.includes('cloud-a'),'empty catalogue preserves chat rather than navigating to setup');
 view.config.providers[0].enabled=true;render();await tick();
 pick().click();await tick();check(!!document.querySelector('[role="menu"]'),'picker opens');
 active=false;render();await tick();check(!document.querySelector('[role="menu"]'),'inactive page removes portal');
 active=true;render();await tick();check(!document.querySelector('[role="menu"]'),'returning does not resurrect portal');
 pick().click();await tick();busy=true;render();await tick();check(!document.querySelector('[role="menu"]'),'busy transition removes menu');
 busy=false;render();await tick();check(!document.querySelector('[role="menu"]'),'unlocking does not resurrect menu');
 pick().click();await tick();const beforeFocus=document.activeElement?.outerHTML;draft().focus();await tick();check(!document.querySelector('[role="menu"]'),'focus leaving menu closes it without stealing focus: '+JSON.stringify({before:beforeFocus,after:document.activeElement?.outerHTML,documentFocused:document.hasFocus()}));
 check(document.activeElement===draft(),'outside focus is preserved');
 (service as any).failNext=true;type('retry original target');await tick();submit();await tick();
 await choose('cloud-b');view.config.providers[0].models=['cloud-b'];render();await tick();
 const retry=[...document.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent==='编辑后重试');check(!!retry,'failed call exposes explicit retry');retry!.click();await tick();
 check(selected==='cloud-a'&&draft().value==='retry original target','retry preserves unavailable original model and prompt');
 const calls=(service as any).calls.length;submit();await tick();check((service as any).calls.length===calls,'retry cannot silently send to another model');
 return {passed};
})().catch(error=>({error:String(error),passed}));
`,'utf8');
  const mock=`export const desktop=true,protocolVersion=1;export const service={calls:[],failNext:false,async sendChat(input,receive){this.calls.push(input);if(this.failNext){this.failNext=false;receive({kind:'failed',code:'UPSTREAM_CONNECTION_FAILED'});}else{receive({kind:'delta',text:'controlled response'});receive({kind:'finished',reason:'stop'});}},async cancelChat(){}};`;
  const result=await build({root,configFile:false,define:{'process.env.NODE_ENV':JSON.stringify('production')},logLevel:'warn',plugins:[react(),{name:'synthetic-chat-service',enforce:'pre',resolveId(source,importer){if(importer&&source.endsWith('/service')&&importer.replaceAll('\\','/').includes('/src/product/'))return '\0chat-service';if(importer&&importer.replaceAll('\\','/')===entry.replaceAll('\\','/')&&source.endsWith('/service'))return '\0chat-service';},load(id){if(id==='\0chat-service')return mock;}}],build:{write:false,minify:false,lib:{entry,formats:['iife'],name:'TagmaChatRegression'}}});
  const output=(Array.isArray(result)?result[0]:result).output;
  const bundle=output.filter(item=>item.type==='chunk').map(item=>item.code).join('\n');
  server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?bundle:'<!doctype html><meta charset="utf-8"><style>[hidden]{display:none!important}</style><div id="root"></div><script>window.onerror=(message)=>{window.__fixtureError=String(message);};</script><script src="/bundle.js"></script>');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}`;
  const report=path.join(temporary,'report.json');
  const main=path.join(temporary,'main.cjs');
  await fs.writeFile(main,`const {app,BrowserWindow,session}=require('electron');const fs=require('node:fs');app.setPath('userData',${JSON.stringify(path.join(temporary,'profile'))});app.whenReady().then(async()=>{session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!details.url.startsWith(${JSON.stringify(url+'/')})}));const window=new BrowserWindow({show:false,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});try{await window.loadURL(${JSON.stringify(url)});const result=await window.webContents.executeJavaScript('window.__tagmaRegression || {error:window.__fixtureError || "fixture not initialized"}');if(!result)throw Error('Component fixture did not initialize; inspect renderer errors');fs.writeFileSync(${JSON.stringify(report)},JSON.stringify(result));app.exit(result?.error||!result?.passed?.length?1:0);}catch(error){fs.writeFileSync(${JSON.stringify(report)},JSON.stringify({error:String(error)}));app.exit(1);}});`);
  const environment={...process.env};delete environment.ELECTRON_RUN_AS_NODE;
  child=spawn(electron,[main],{cwd:root,env:environment,stdio:'ignore',windowsHide:true});
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);timer=setTimeout(()=>{child.kill();reject(Error('Component regression timed out'));},45000);});
  clearTimeout(timer);
  const evidence=JSON.parse(await fs.readFile(report,'utf8'));
  console.log(JSON.stringify({scope:'synthetic React component regression; not native or service acceptance',...evidence},null,2));
  if(code!==0||evidence.error)throw Error(evidence.error||`Electron exited ${code}`);
} finally {
  clearTimeout(timer);
  if(child&&child.exitCode===null)child.kill();
  if(server)await new Promise(resolve=>server.close(resolve));
  // Only this invocation's small synthetic fixture, never product user data.
  if(path.dirname(temporary)===path.join(root,'.cache')&&!((await fs.lstat(temporary)).isSymbolicLink()))await fs.rm(temporary,{recursive:true,force:true,maxRetries:3,retryDelay:200});
}
