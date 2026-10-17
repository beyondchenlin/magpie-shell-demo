// Exercises the real Tauri WebView + public application commands. No mock Tauri bridge.
// The caller supplies an exclusively owned temporary config directory and dev-server URL.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { writeFile, readFile, access, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const fixture = process.env.TAGMA_TEST_CONFIG_DIR;
const appearanceOnly=process.env.TAGMA_NATIVE_SMOKE_MODE==='appearance';
const recoveryMode=process.env.TAGMA_NATIVE_SMOKE_MODE==='recovery';
const profilesMode=process.env.TAGMA_NATIVE_SMOKE_MODE==='profiles';
const gatewayMode=process.env.TAGMA_NATIVE_SMOKE_MODE==='gateway';
const workspaceMode=process.env.TAGMA_NATIVE_SMOKE_MODE==='workspace';
assert(fixture, 'Caller must supply an isolated TAGMA_TEST_CONFIG_DIR');
const executable=resolve(process.env.TAGMA_NATIVE_EXE || 'target/debug/tagma-desktop.exe');
await access(executable);
const server = createServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let port = server.address().port;
await new Promise(resolve => server.close(resolve));
const gatewayReservation=createServer();
await new Promise(resolve=>gatewayReservation.listen(0,'127.0.0.1',resolve));
const gatewayPort=gatewayReservation.address().port;
await new Promise(resolve=>gatewayReservation.close(resolve));
let child = spawn(executable, [], {
  env: { ...process.env, TAGMA_TEST_GATEWAY_PORT:String(gatewayPort), ...(gatewayMode?{TAGMA_TEST_INITIALIZE_TOKEN:'1'}:{}), WEBVIEW2_USER_DATA_FOLDER:resolve(fixture,'webview'), WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1` },
  // Do not hide a console to make this test pass. Both executables must be GUI-subsystem binaries.
  stdio: 'ignore', windowsHide: false,
});
let spawnError;
child.on('error',error=>{ spawnError=error; });
let socket;
const pending = new Map();
let sequence = 0;
const pause = ms => new Promise(r => setTimeout(r, ms));
const deadline = Date.now() + 35_000;
async function until(test, message) {
  while (Date.now() < deadline) { if(spawnError) throw spawnError; try { const result = await test(); if (result) return result; } catch {} await pause(100); }
  throw new Error(message);
}
async function cdp(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 5000);
    pending.set(id, { resolve: result => { clearTimeout(timer); resolve(result); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const response = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error('Native WebView evaluation failed');
  return response.result.value;
}
async function text() { return evaluate('document.body.innerText'); }
async function capture(name) {
  if(appearanceOnly && !name.startsWith('05-') && !name.startsWith('06-')) return;
  const destination=process.env.TAGMA_NATIVE_EVIDENCE_DIR;
  if(!destination) return;
  await mkdir(destination,{recursive:true});
  const screenshot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile(resolve(destination,`${name}.png`),Buffer.from(screenshot.data,'base64'));
}
async function click(label) {
  const result = await evaluate(`(() => { const scope=document.querySelector('dialog[open]') ?? document; const b=[...scope.querySelectorAll('button')].find(b=>b.getClientRects().length && b.textContent.trim()===${JSON.stringify(label)}); if(!b || b.disabled) return false; b.click(); return true; })()`);
  assert(result, `Enabled UI action missing: ${label}`);
  await pause(100);
}
async function connectPage() {
  const page = await until(async () => {
    const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
    return pages.find(p => p.type === 'page' && p.url.includes('tagma.html'));
  }, 'Native WebView debug endpoint unavailable');
  const connection = new WebSocket(page.webSocketDebuggerUrl); socket=connection;
  await new Promise((r,j) => { connection.addEventListener('open',r,{once:true}); connection.addEventListener('error',j,{once:true}); });
  connection.addEventListener('message', event => {
    if(socket!==connection)return;
    const value = JSON.parse(event.data); const request = pending.get(value.id);
    if (request) { pending.delete(value.id); value.error ? request.reject(new Error(value.error.message)) : request.resolve(value.result); }
  });
  connection.addEventListener('close',()=>{ if(socket!==connection)return; for(const request of pending.values()) request.reject(new Error('Native WebView closed')); pending.clear(); });
  return page;
}
try {
  let page=await connectPage();
  if(workspaceMode) {
    await until(async()=>(await text()).includes('接入你的模型，开始组织工作流'),'Workspace home not rendered');
    assert((await text()).includes('还没有配置模型'));assert((await text()).includes('真实对话仍待接入'));
    await capture('10-workspace-empty');await click('添加供应商');
    assert(await evaluate(`document.querySelector('form')?.getAttribute('aria-label')==='添加供应商'`));
    await evaluate(`(()=>{const fields=document.querySelectorAll('input.words');const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;['UI workflow provider','https://example.invalid/v1'].forEach((value,index)=>{setter.call(fields[index],value);fields[index].dispatchEvent(new Event('input',{bubbles:true}));});const models=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(models,'ui-workflow-model');models.dispatchEvent(new Event('input',{bubbles:true}));})()`);await click('保存');
    await until(async()=>(await text()).includes('已保存版本: 1'),'Workspace provider save not committed');await click('对话');
    await until(async()=>(await text()).includes('ui-workflow-model'),'Saved model missing from workspace');
    assert((await text()).includes('UI workflow provider'));assert((await text()).includes('手动配置'));assert((await text()).includes('尚未检测上游可用性'));
    await until(async()=>(await text()).includes('网关正在使用已保存的配置'),'Workspace effective status not confirmed');
    assert(!(await text()).includes('已保存，待应用到网关'),'Applied configuration still claims to be pending');
    await capture('11-workspace-configured');await click('查看网关');assert((await text()).includes('网关配置'));
    await click('设置');await click('深色');await click('150%');await click('对话');
    assert(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`),'Workspace overflows at 150 percent');
    await capture('12-workspace-dark-150');
    const view=await evaluate(`window.__TAURI_INTERNALS__.invoke('application_view',{protocolVersion:1})`);assert.equal(view.config.providers.length,1);assert.equal(view.runtime.effective_revision,1);
    await evaluate(`window.__TAURI_INTERNALS__.invoke('quit_application',{protocolVersion:1})`).catch(()=>{});await until(async()=>child.exitCode!==null,'Workspace native host did not quit');
    await writeFile(resolve(fixture,'native-result.json'),JSON.stringify({platform:process.platform,productVersion:view.product_version,schemaVersion:view.config.schema_version,executable,nativeHost:true,mockBridge:false,tests:['workspace-real-empty-state','direct-provider-form-entry','real-provider-model-save','configured-model-source-label','effective-revision-on-home','gateway-navigation','dark-150-percent-no-horizontal-overflow','native-graceful-quit'],result:'passed'},null,2));
    console.log('Native workspace: 8 checks passed (visible onboarding, real save, model directory and runtime status).');
  } else if(gatewayMode) {
    await until(async()=>(await text()).includes('已保存版本: 1'),'Default native token initialization not committed');
    await click('设置');await click('网关');
    let view=await until(async()=>{const v=await evaluate(`window.__TAURI_INTERNALS__.invoke('application_view',{protocolVersion:1})`);return v.runtime.effective_revision===1?v:null;},'Default token gateway not ready');
    assert.equal(view.config.gateway.auth_enabled,true);assert.equal(view.config.gateway.has_access_token,true);assert.equal(await evaluate(`!!document.querySelector('.tagma-secret')`),false);
    assert.equal((await fetch(`http://127.0.0.1:${gatewayPort}/v1/models`)).status,401);
    await click('显示令牌');const token=await evaluate(`document.querySelector('.tagma-secret').textContent`);assert.equal(token.length,64);
    await click('隐藏令牌');assert.equal(await evaluate(`!!document.querySelector('.tagma-secret')`),false);
    assert.equal((await fetch(`http://127.0.0.1:${gatewayPort}/v1/models`,{headers:{Authorization:`Bearer ${token}`}})).status,503);
    assert.equal((await fetch(`http://127.0.0.1:${gatewayPort}/v1/models`,{headers:{Authorization:'Bearer incorrect'}})).status,401);
    const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const savedPort=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
    await click('修改网关配置');
    await evaluate(`(()=>{const input=document.querySelector('form input.words');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(String(savedPort))});input.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('form input[type=checkbox]').click();})()`);await pause(100);
    assert((await text()).includes('关闭鉴权表示明确允许'));await click('保存');
    view=await until(async()=>{const v=await evaluate(`window.__TAURI_INTERNALS__.invoke('application_view',{protocolVersion:1})`);return v.config.desired_revision===2&&v.runtime.error?.code==='RESTART_REQUIRED'?v:null;},'Saved port did not require explicit restart');
    assert.equal(view.runtime.effective_revision,1);assert(view.runtime.address.includes(String(gatewayPort)));assert.equal(view.config.gateway.port,savedPort);
    assert.equal((await fetch(`http://127.0.0.1:${gatewayPort}/v1/models`)).status,401);
    await until(async()=>await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='停止网关'&&!b.disabled)`),'Native UI did not confirm owned gateway');
    await capture('09-native-gateway-settings');await click('停止网关');await until(async()=>(await text()).includes('已停止'),'Degraded owned gateway did not stop');
    await evaluate(`window.__TAURI_INTERNALS__.invoke('quit_application',{protocolVersion:1})`).catch(()=>{});await until(async()=>child.exitCode!==null,'Gateway host did not quit');socket?.close();
    const cdpReservation=createServer();await new Promise(resolve=>cdpReservation.listen(0,'127.0.0.1',resolve));port=cdpReservation.address().port;await new Promise(resolve=>cdpReservation.close(resolve));
    const relaunchEnvironment={...process.env,WEBVIEW2_USER_DATA_FOLDER:resolve(fixture,'gateway-relaunch-webview'),WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:`--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1`};delete relaunchEnvironment.TAGMA_TEST_GATEWAY_PORT;
    child=spawn(executable,[],{env:relaunchEnvironment,stdio:'ignore',windowsHide:false});child.on('error',error=>{spawnError=error;});page=await connectPage();
    view=await until(async()=>{const v=await evaluate(`window.__TAURI_INTERNALS__.invoke('application_view',{protocolVersion:1})`);return v.runtime.effective_revision===2?v:null;},'Saved port was not loaded by native relaunch');
    assert(view.runtime.address.includes(String(savedPort)));assert.equal(view.config.gateway.auth_enabled,false);assert.equal(view.config.gateway.has_access_token,true);
    assert.equal((await fetch(`http://127.0.0.1:${savedPort}/v1/models`)).status,503);
    const diagnostics=await evaluate(`window.__TAURI_INTERNALS__.invoke('diagnostics_view',{protocolVersion:1})`);assert(!JSON.stringify(view).includes(token));assert(!JSON.stringify(diagnostics).includes(token));
    await evaluate(`window.__TAURI_INTERNALS__.invoke('quit_application',{protocolVersion:1})`).catch(()=>{});await until(async()=>child.exitCode!==null,'Relaunched gateway host did not quit');
    for(const name of ['config.sqlite3','config.sqlite3-wal','logs/tagma.0.jsonl']) {const bytes=await readFile(resolve(fixture,name)).catch(()=>Buffer.alloc(0));assert(!bytes.includes(Buffer.from(token)));}
    await writeFile(resolve(fixture,'native-result.json'),JSON.stringify({platform:process.platform,architecture:process.arch,productVersion:view.product_version,schemaVersion:view.config.schema_version,executable,embeddedAssets:!page.url.startsWith('http://localhost:'),nativeHost:true,mockBridge:false,windowsHide:false,tests:['default-token-in-system-store','explicit-reveal-and-hide','missing-and-wrong-token-401','valid-token-unsupported-503','port-and-auth-form-save','old-effective-address-until-restart','degraded-owned-stop','saved-port-on-native-relaunch-without-override','explicit-compatibility-mode-loopback','no-token-in-dto-diagnostics-sqlite-wal-log'],result:'passed'},null,2));
    console.log('Native gateway settings: 10 checks passed (system token, HTTP authentication, explicit port restart and real relaunch).');
  } else if(profilesMode) {
    await until(async()=>(await text()).includes('已保存版本: 0'),'Native profile fixture not initialized');
    const invoke=(command,input)=>evaluate(`window.__TAURI_INTERNALS__.invoke(${JSON.stringify(command)},{input:${JSON.stringify(input)}})`);
    for(let revision=0;revision<2;revision++) await invoke('save_provider',{protocol_version:1,expected_revision:revision,id:null,name:`Profile provider ${revision+1}`,protocol:'openai_chat_completions',base_url:'https://example.invalid/v1',enabled:true,models:[],credential:null});
    await click('供应商');await click('刷新');await click('添加 App 档案');
    await evaluate(`(()=>{const fields=document.querySelector('form').querySelectorAll('input.words');const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;['Native App profile','Cursor'].forEach((value,index)=>{setter.call(fields[index],value);fields[index].dispatchEvent(new Event('input',{bubbles:true}));});})()`);
    await evaluate(`document.querySelector('form input[type=checkbox]').click()`);await pause(100);
    await evaluate(`document.querySelector('form button[aria-label="上移: Profile provider 2"]').click()`);await pause(100);await click('保存');
    await until(async()=>(await text()).includes('已保存版本: 3'),'Native App profile not saved');
    let view=await evaluate(`window.__TAURI_INTERNALS__.invoke('application_view',{protocolVersion:1})`);
    const ids=view.config.providers.map(p=>p.id);const profile=view.config.profiles[1];
    assert.deepEqual(view.config.profiles[0].provider_ids,ids);assert.deepEqual(profile.provider_ids,[...ids].reverse());
    assert.equal(profile.target_app,'Cursor');assert.equal(view.config.providers.every(p=>!p.has_credential),true);
    await evaluate(`[...document.querySelectorAll('.tagma-provider')].find(row=>row.querySelector('.name')?.textContent==='Profile provider 1').querySelector('button:last-child').click()`);await pause(100);
    assert((await text()).includes('被以下 App 档案引用'));assert(await evaluate(`document.querySelector('dialog[open] button:last-child').disabled`));await click('取消');
    assert(await evaluate(`!document.querySelector('dialog[open]')`),'Provider reference dialog did not close');
    assert.equal(await evaluate(`window.__TAURI_INTERNALS__.invoke('delete_provider',{input:${JSON.stringify({protocol_version:1,expected_revision:3,id:ids[0]})}}).then(()=>null,e=>e.code)`),'PROVIDER_REFERENCED');
    await evaluate(`document.querySelector('button[aria-label="编辑 App 档案: Native App profile"]').click()`);await pause(100);
    await invoke('reorder_providers',{protocol_version:1,expected_revision:3,ids:[...ids].reverse()});await click('保存');
    await until(async()=>(await text()).includes('配置已由其他入口修改'),'Stale App editor was not protected');
    assert(await evaluate(`document.querySelector('form input.words').value==='Native App profile'`));await click('取消');await click('刷新');
    await invoke('reorder_providers',{protocol_version:1,expected_revision:4,ids});await click('刷新');
    view=await evaluate(`window.__TAURI_INTERNALS__.invoke('application_view',{protocolVersion:1})`);assert.deepEqual(view.config.profiles[1].provider_ids,[...ids].reverse());
    await evaluate(`document.querySelector('button[aria-label="编辑 App 档案: Native App profile"]').click()`);await pause(100);
    await evaluate(`document.querySelector('form input[type=checkbox]').click()`);await pause(100);await click('保存');
    await until(async()=>(await text()).includes('已保存版本: 6'),'Inherited App ordering not saved');
    view=await evaluate(`window.__TAURI_INTERNALS__.invoke('application_view',{protocolVersion:1})`);assert.deepEqual(view.config.profiles[1].provider_ids,ids);
    assert(await evaluate(`!document.querySelector('dialog[open]') && !document.querySelector('form')`),'Profile editor did not close');
    await capture('08-native-app-profiles');
    await evaluate(`document.querySelector('button[aria-label="删除 App 档案: Native App profile"]').click()`);await pause(100);
    await evaluate(`document.querySelector('dialog[open] button:last-child').click()`);await until(async()=>(await text()).includes('已保存版本: 7'),'Profile deletion not saved');
    await invoke('delete_provider',{protocol_version:1,expected_revision:7,id:ids[0]});
    await until(async()=>{const current=await evaluate(`window.__TAURI_INTERNALS__.invoke('application_view',{protocolVersion:1})`);return current.runtime.effective_revision===8;},'Profile changes did not reach effective revision');
    await evaluate(`window.__TAURI_INTERNALS__.invoke('quit_application',{protocolVersion:1})`).catch(()=>{});await until(async()=>child.exitCode!==null,'Profile host did not quit');
    await writeFile(resolve(fixture,'native-result.json'),JSON.stringify({platform:process.platform,architecture:process.arch,productVersion:view.product_version,schemaVersion:view.config.schema_version,executable,embeddedAssets:!page.url.startsWith('http://localhost:'),nativeHost:true,mockBridge:false,windowsHide:false,tests:['profile-form-save','global-override-independence','shared-credential-references','provider-reference-list-and-block','backend-reference-protection','stale-profile-retains-edits','inherit-global-order','profile-delete-unblocks-provider-and-effective-apply'],result:'passed'},null,2));
    console.log('Native App profiles: 8 checks passed (real form, IPC, SQLite and gateway).');
  } else if(recoveryMode) {
    await until(async()=>(await text()).includes('初始化记录损坏'),'Damaged committed intent was not reported');
    await click('设置'); await click('诊断');
    await until(async()=>await evaluate(`!!document.querySelector('.tagma-diagnostics pre')`),'Recovery diagnostics missing');
    // Validate the concrete plan shown to the user, not a newly generated preview UUID.
    const damaged=await evaluate(`JSON.parse(document.querySelector('.tagma-diagnostics pre').textContent)`);
    assert(damaged.initialization_recovery); assert.equal(damaged.config_schema_version,null);
    await click('保留损坏记录并恢复'); await capture('07-initialization-recovery'); await click('归档记录');
    await until(async()=>(await text()).includes('记录已保留'),'Record archive not confirmed');
    assert.equal(await readFile(damaged.initialization_recovery.archive_path,'utf8'),'{tagma-corrupt-fixture');
    assert.equal(await readFile(resolve(fixture,'unrelated-output'),'utf8'),'keep-test-output');
    assert.equal(await access(resolve(fixture,'config.sqlite3')).then(()=>true,()=>false),false,'Recovery must wait for restart before initializing');
    await evaluate(`window.__TAURI_INTERNALS__.invoke('quit_application',{protocolVersion:1})`).catch(()=>{});
    await until(async()=>child.exitCode!==null,'Damaged-config host did not quit'); socket?.close();
    const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
    child=spawn(executable,[],{env:{...process.env,TAGMA_TEST_GATEWAY_PORT:String(gatewayPort),WEBVIEW2_USER_DATA_FOLDER:resolve(fixture,'recovered-webview'),WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:`--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1`},stdio:'ignore',windowsHide:false});
    child.on('error',error=>{spawnError=error;});
    page=await connectPage();
    await until(async()=>(await text()).includes('已保存版本: 0'),'Native relaunch did not initialize fresh config');
    const recovered=await until(async()=>{const value=await evaluate(`window.__TAURI_INTERNALS__.invoke('diagnostics_view',{protocolVersion:1})`);return value.runtime.state==='running'?value:null;},'Recovered gateway did not become ready');
    assert.equal(recovered.runtime.effective_revision,0);assert.equal(recovered.console_attached,false);assert.equal(recovered.sidecar_console_attached,false);
    assert.equal(await readFile(damaged.initialization_recovery.archive_path,'utf8'),'{tagma-corrupt-fixture');
    await evaluate(`window.__TAURI_INTERNALS__.invoke('quit_application',{protocolVersion:1})`).catch(()=>{});await until(async()=>child.exitCode!==null,'Recovered host did not quit');
    await writeFile(resolve(fixture,'native-result.json'),JSON.stringify({platform:process.platform,architecture:process.arch,productVersion:recovered.product_version,executable,embeddedAssets:!page.url.startsWith('http://localhost:'),nativeHost:true,mockBridge:false,windowsHide:false,tests:['damaged-intent-visible','explicit-archive-confirmation','archive-bytes-preserved','unrelated-output-retained','wait-for-restart','real-native-relaunch','recovered-sidecar-ready','console-free-and-quit'],result:'passed'},null,2));
    console.log('Native initialization recovery: 8 checks passed (real host, confirmation, archive, relaunch and sidecar).');
  } else {
  await until(async () => (await text()).includes('已保存版本: 0'), 'Native IPC did not load revision zero');
  assert(!(await text()).includes('Web 预览'));
  const result = await evaluate(`window.__TAURI_INTERNALS__.invoke('application_view',{protocolVersion:1})`);
  if(!appearanceOnly) {
  await capture('01-native-chat');
  await click('供应商'); await click('添加供应商');
  await evaluate(`(() => { const fields=document.querySelectorAll('input.words'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(fields[0],'Native smoke provider'); fields[0].dispatchEvent(new Event('input',{bubbles:true})); setter.call(fields[1],'https://example.invalid/v1'); fields[1].dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await click('保存');
  await until(async () => (await text()).includes('已保存版本: 1'), 'Native form did not commit revision one');
  assert((await text()).includes('Native smoke provider'));
  await capture('02-native-provider');
  // Verify redacted service DTO and protocol rejection through the actual authorized IPC boundary.
  const configured = await evaluate(`window.__TAURI_INTERNALS__.invoke('application_view',{protocolVersion:1})`);
  assert.equal(configured.config.providers.length, 1); assert.equal(configured.config.providers[0].has_credential, false);
  await until(async()=>{
    const current=await evaluate(`window.__TAURI_INTERNALS__.invoke('application_view',{protocolVersion:1})`);
    return current.runtime.state==='running' && current.runtime.effective_revision===1;
  },'Native managed gateway did not confirm desired revision');
  const rejected = await evaluate(`window.__TAURI_INTERNALS__.invoke('application_view',{protocolVersion:999}).then(()=>null,e=>e.code)`);
  assert.equal(rejected, 'INCOMPATIBLE_VERSION');
  // A stale edit must retain UI edits and fail rather than overwrite a newer revision.
  await click('编辑');
  await evaluate(`window.__TAURI_INTERNALS__.invoke('save_provider',{input:{protocol_version:1,expected_revision:1,id:null,name:'Concurrent editor',protocol:'openai_chat_completions',base_url:'https://example.invalid/v1',enabled:true,models:[],credential:null}})`);
  await click('保存');
  await until(async () => (await text()).includes('配置已由其他入口修改'), 'Native stale editor conflict not surfaced');
  assert(await evaluate(`!!document.querySelector('form')`));
  await click('取消'); await click('刷新');
  await until(async () => (await text()).includes('已保存版本: 2'), 'Native refresh lost committed revision');
  await click('网关');
  await until(async()=> (await text()).includes('由本桌面拥有'),'Native gateway ownership not visible');
  await capture('03-native-gateway');
  await click('停止网关');
  await until(async()=> (await text()).includes('已停止'),'Native managed gateway did not stop');
  await click('启动网关');
  await until(async()=> (await text()).includes('运行中'),'Native managed gateway did not restart');
  }
  await click('设置'); await click('深色'); await click('125%');
  await capture('04-native-dark-125');
  await click('简体中文');
  assert(await evaluate(`(()=>{const r=document.querySelector('[role=menu]').getBoundingClientRect();return r.top>=0&&r.left>=0&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1})()`),'Language menu escaped native viewport');
  await capture('05-native-language'); await click('English');
  assert((await text()).includes('Text size'));
  await click('150%'); await capture('06-native-dark-150-en');
  const diagnostics=await until(async()=>{
    const value=await evaluate(`window.__TAURI_INTERNALS__.invoke('diagnostics_view',{protocolVersion:1})`);
    return value.runtime.state==='running' ? value : null;
  },'Native diagnostics did not observe a running sidecar');
  assert.equal(diagnostics.console_attached,false,'Desktop allocated a console (driver hiding must not mask it)');
  assert.equal(diagnostics.sidecar_console_attached,false,'Sidecar allocated a console');
  assert.equal(diagnostics.max_log_bytes,20*1024*1024); assert.equal(diagnostics.max_log_files,5);
  assert.equal(diagnostics.telemetry_enabled,false); assert(diagnostics.recent_events.length>0); assert(!('providers' in diagnostics));
  await click('Diagnostics');
  await until(async()=>await evaluate(`!!document.querySelector('.tagma-diagnostics pre')`),'Diagnostic preview unavailable');
  await evaluate(`window.__TAURI_INTERNALS__.invoke('quit_application',{protocolVersion:1})`).catch(()=>{});
  await until(async()=>child.exitCode!==null,'Native application did not finish graceful quit');
  assert.equal(await access(resolve(fixture,'runtime.json')).then(()=>true,()=>false),false,'Owned sidecar manifest survived native quit');
  await writeFile(resolve(fixture, 'native-result.json'), JSON.stringify({
    platform: process.platform, architecture: process.arch, productVersion: result.product_version,
    executable, embeddedAssets:!page.url.startsWith('http://localhost:'), installed:!!process.env.TAGMA_NATIVE_EXE,
    nativeHost: true, mockBridge: false, windowsHide:false,consoleAttached:diagnostics.console_attached,sidecarConsoleAttached:diagnostics.sidecar_console_attached,
    tests: [...(appearanceOnly ? ['native-language-menu-bounds','native-language-change','native-dark-125-150','native-graceful-quit'] : ['native-empty-config','provider-form-commit','redacted-dto','protocol-rejection','concurrent-editor-conflict','editor-retained-on-error','snapshot-refresh','gateway-effective-revision','gateway-ownership','gateway-stop','gateway-start','native-language-and-scale','native-graceful-quit']), 'desktop-no-console','sidecar-no-console','bounded-diagnostic-preview'], result:'passed',
    limitations: ['OS graphics capture unavailable; WebView screenshots do not prove pixel equivalence','debug internal test build; release signatures and macOS/Linux unverified'],
  },null,2));
  console.log(`Native Tauri smoke: ${appearanceOnly?7:16} checks passed (real WebView + IPC + SQLite + sidecar; isolated synthetic configuration).`);
  }
} finally {
  socket?.close();
  for (const p of pending.values()) p.reject(new Error('Native test closing'));
  if (child.exitCode === null) child.kill();
  await Promise.race([new Promise(r=>child.once('exit',r)),pause(3000)]);
}
