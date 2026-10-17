// Exercises the real Tauri WebView + public application commands. No mock Tauri bridge.
// The caller supplies an exclusively owned temporary config directory and dev-server URL.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const fixture = process.env.TAGMA_TEST_CONFIG_DIR;
assert(fixture, 'Caller must supply an isolated TAGMA_TEST_CONFIG_DIR');
const server = createServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
await new Promise(resolve => server.close(resolve));
const child = spawn(resolve('target/debug/tagma-desktop.exe'), [], {
  env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1` },
  stdio: 'ignore', windowsHide: true,
});
let socket;
const pending = new Map();
let sequence = 0;
const pause = ms => new Promise(r => setTimeout(r, ms));
const deadline = Date.now() + 35_000;
async function until(test, message) {
  while (Date.now() < deadline) { try { const result = await test(); if (result) return result; } catch {} await pause(100); }
  throw new Error(message);
}
async function cdp(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 5000);
    pending.set(id, { resolve: result => { clearTimeout(timer); resolve(result); }, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const response = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error('Native WebView evaluation failed');
  return response.result.value;
}
async function text() { return evaluate('document.body.innerText'); }
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
  await until(async () => (await text()).includes('已保存版本: 0'), 'Native IPC did not load revision zero');
  assert(!(await text()).includes('Web 预览'));
  await click('供应商'); await click('添加供应商');
  await evaluate(`(() => { const fields=document.querySelectorAll('input.words'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(fields[0],'Native smoke provider'); fields[0].dispatchEvent(new Event('input',{bubbles:true})); setter.call(fields[1],'https://example.invalid/v1'); fields[1].dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await click('保存');
  await until(async () => (await text()).includes('已保存版本: 1'), 'Native form did not commit revision one');
  assert((await text()).includes('Native smoke provider'));
  // Verify redacted service DTO and protocol rejection through the actual authorized IPC boundary.
  const result = await evaluate(`window.__TAURI_INTERNALS__.invoke('application_view',{protocolVersion:1})`);
  assert.equal(result.config.providers.length, 1); assert.equal(result.config.providers[0].has_credential, false);
  assert.equal(result.runtime.effective_revision, null);
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
  await writeFile(resolve(fixture, 'native-result.json'), JSON.stringify({
    platform: process.platform, architecture: process.arch, productVersion: result.product_version,
    nativeHost: true, mockBridge: false, tests: ['native-empty-config','provider-form-commit','redacted-dto','protocol-rejection','concurrent-editor-conflict','editor-retained-on-error','snapshot-refresh'], result:'passed',
    limitations: ['graphics capture unavailable; no pixel equivalence claim','development host; installer and release signatures unverified'],
  },null,2));
  console.log('Native Tauri smoke: 7 checks passed (real WebView + IPC + SQLite; isolated synthetic configuration).');
} finally {
  socket?.close();
  for (const p of pending.values()) p.reject(new Error('Native test closing'));
  if (child.exitCode === null) child.kill();
  await Promise.race([new Promise(r=>child.once('exit',r)),pause(3000)]);
}
