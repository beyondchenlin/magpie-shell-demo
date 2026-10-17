// Exercises the real Tauri WebView + public application commands. No mock Tauri bridge.
// The caller supplies an exclusively owned temporary config directory and dev-server URL.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { writeFile, access, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const fixture = process.env.TAGMA_TEST_CONFIG_DIR;
const appearanceOnly=process.env.TAGMA_NATIVE_SMOKE_MODE==='appearance';
assert(fixture, 'Caller must supply an isolated TAGMA_TEST_CONFIG_DIR');
const executable=resolve(process.env.TAGMA_NATIVE_EXE || 'target/debug/tagma-desktop.exe');
await access(executable);
const server = createServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
await new Promise(resolve => server.close(resolve));
const gatewayReservation=createServer();
await new Promise(resolve=>gatewayReservation.listen(0,'127.0.0.1',resolve));
const gatewayPort=gatewayReservation.address().port;
await new Promise(resolve=>gatewayReservation.close(resolve));
const child = spawn(executable, [], {
  env: { ...process.env, TAGMA_TEST_GATEWAY_PORT:String(gatewayPort), WEBVIEW2_USER_DATA_FOLDER:resolve(fixture,'webview'), WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1` },
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
  const result = await evaluate(`(() => { const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}); if(!b || b.disabled) return false; b.click(); return true; })()`);
  assert(result, `Enabled UI action missing: ${label}`);
  await pause(100);
}
try {
  const page = await until(async () => {
    const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
    return pages.find(p => p.type === 'page' && p.url.includes('tagma.html'));
  }, 'Native WebView debug endpoint unavailable');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r,j) => { socket.addEventListener('open',r,{once:true}); socket.addEventListener('error',j,{once:true}); });
  socket.addEventListener('message', event => {
    const value = JSON.parse(event.data); const request = pending.get(value.id);
    if (request) { pending.delete(value.id); value.error ? request.reject(new Error(value.error.message)) : request.resolve(value.result); }
  });
  socket.addEventListener('close',()=>{ for(const request of pending.values()) request.reject(new Error('Native WebView closed')); pending.clear(); });
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
} finally {
  socket?.close();
  for (const p of pending.values()) p.reject(new Error('Native test closing'));
  if (child.exitCode === null) child.kill();
  await Promise.race([new Promise(r=>child.once('exit',r)),pause(3000)]);
}
