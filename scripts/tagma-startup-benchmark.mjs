// Twenty new native host processes; reuse one owned configuration and WebView profile.
// OS/disk caches are not flushed. Inspector transport is included in observed timing.
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { access, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { cpus, totalmem, release } from 'node:os';
import assert from 'node:assert/strict';

const fixture=process.env.TAGMA_TEST_CONFIG_DIR;
assert(fixture,'Caller must provide a receipt-owned isolated fixture');
const executable=resolve(process.env.TAGMA_NATIVE_EXE||'target/debug/tagma-desktop.exe');await access(executable);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function freePort() {const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));return port;}
let child;let socket;let sequence=0;const pending=new Map();const samples=[];let browserVersion;
async function until(check,message) {const end=performance.now()+15_000;while(performance.now()<end){try {const result=await check();if(result)return result;}catch{}await pause(20);}throw new Error(message);}
function cdp(method,params={}) {
  const id=++sequence;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Inspector timeout: ${method}`));},5000);
    pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});socket.send(JSON.stringify({id,method,params}));});
}
async function evaluate(expression) {const result=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error('Native evaluation failed');return result.result.value;}
async function connect(port) {
  const page=await until(async()=>{const pages=await fetch(`http://127.0.0.1:${port}/json/list`).then(response=>response.json());return pages.find(page=>page.type==='page'&&page.url.includes('tagma.html'));},'Native page did not become available');
  assert(!page.url.startsWith('http://localhost:'),'Performance requires embedded native assets');
  const connection=new WebSocket(page.webSocketDebuggerUrl);socket=connection;
  await new Promise((resolve,reject)=>{connection.addEventListener('open',resolve,{once:true});connection.addEventListener('error',reject,{once:true});});
  connection.addEventListener('message',event=>{if(socket!==connection)return;const value=JSON.parse(event.data);const request=pending.get(value.id);if(request){pending.delete(value.id);value.error?request.reject(new Error(value.error.message)):request.resolve(value.result);}});
  connection.addEventListener('close',()=>{if(socket!==connection)return;for(const request of pending.values())request.reject(new Error('Native window closed'));pending.clear();});
}
async function quit() {
  await evaluate(`window.__TAURI_INTERNALS__.invoke('quit_application',{protocolVersion:1})`).catch(()=>{});
  await until(async()=>child.exitCode!==null,'Native quit exceeded budget');assert.equal(child.exitCode,0);
  assert.equal(await access(resolve(fixture,'runtime.json')).then(()=>true,()=>false),false,'Owned gateway survived quit');
  socket?.close();socket=null;
}
try {
  const gatewayPort=await freePort();
  for(let run=1;run<=20;run++) {
    const port=await freePort();let spawnError;
    const started=performance.now();
    child=spawn(executable,[],{env:{...process.env,TAGMA_TEST_INITIALIZE_TOKEN:'1',TAGMA_TEST_GATEWAY_PORT:String(gatewayPort),WEBVIEW2_USER_DATA_FOLDER:resolve(fixture,'startup-webview'),WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:`--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1`},stdio:'ignore',windowsHide:false});
    child.on('error',error=>{spawnError=error;});
    await connect(port);if(spawnError)throw spawnError;
    const interactive=async()=>{
      await until(async()=>await evaluate(`document.readyState==='complete' && document.querySelector('.tagma-header button')?.disabled===false && document.querySelector('.tagma-footer')?.textContent.includes('已保存版本: 1')`),'Native configuration was not interactive');
      await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      assert(await evaluate(`document.activeElement?.matches('button,input,textarea,select,[tabindex]')`),'Native keyboard interaction did not acquire focus');
      return Math.round((performance.now()-started)*100)/100;
    };
    const ready=async()=>{
      const view=await until(async()=>{const view=await evaluate(`window.__TAURI_INTERNALS__.invoke('application_view',{protocolVersion:1})`);return view.runtime.state==='running'?view:null;},'Gateway not ready');
      assert.equal(view.config.desired_revision,1);assert.equal(view.runtime.effective_revision,1);assert.equal(view.config.gateway.has_access_token,true);
      return {elapsedMs:Math.round((performance.now()-started)*100)/100,version:view.product_version};
    };
    const [interactiveMs,gateway]=await Promise.all([interactive(),ready()]);
    if(!browserVersion)browserVersion=await cdp('Browser.getVersion');
    samples.push({run,pid:child.pid,interactiveObservedMs:interactiveMs,gatewayReadyObservedMs:gateway.elapsedMs,productVersion:gateway.version});
    await quit();await pause(200);
    if(run%5===0)console.log(`Native process cold starts completed: ${run}/20`);
  }
  assert.equal(new Set(samples.map(sample=>sample.pid)).size,20,'Each sample must use a new host process');
  const percentile=key=>{const sorted=samples.map(sample=>sample[key]).sort((a,b)=>a-b);return {p50Ms:sorted[Math.ceil(sorted.length*.5)-1],p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1)};};
  const interactive=percentile('interactiveObservedMs');const gateway=percentile('gatewayReadyObservedMs');
  const result={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),recordedAtUtc:new Date().toISOString(),executable,executableSha256:createHash('sha256').update(await readFile(executable)).digest('hex'),productVersion:samples[0].productVersion,platform:process.platform,architecture:process.arch,osRelease:release(),cpu:cpus()[0].model,ramGiB:Math.round(totalmem()/1024**3),logicalProcessors:cpus().length,browserVersion,buildMode:'debug, embedded assets, inspector enabled',method:'20 distinct host processes, same receipt-owned config and WebView profile; OS/disk caches retained; keyboard focus confirms interaction; gateway observation independent',percentileMethod:'nearest rank',interactive,gateway,interactiveBudgetMs:3000,withinLocalDebugBudget:interactive.p95Ms<=3000,samples,result:'measured',limitations:['Windows debug only; not a signed release or macOS result','Inspector discovery and input acknowledgement included; timings are conservative observations','Concurrent external workstation activity is not stopped','No filesystem cache flush; this is process cold start, not fresh installation per sample']};
  await writeFile(resolve(fixture,'native-result.json'),JSON.stringify(result,null,2));
  console.log(`Interactive p95 ${interactive.p95Ms}ms; gateway observed p95 ${gateway.p95Ms}ms; 20 distinct native starts.`);
  if(!result.withinLocalDebugBudget)process.exitCode=1;
} catch(error) {
  await writeFile(resolve(fixture,'native-result.json'),JSON.stringify({result:'failed',error:error.message,samples,buildMode:'debug, embedded assets'},null,2));throw error;
} finally {
  socket?.close();for(const request of pending.values())request.reject(new Error('Benchmark closing'));pending.clear();
  if(child?.exitCode===null){child.kill();await Promise.race([new Promise(resolve=>child.once('exit',resolve)),pause(3000)]);}
}
