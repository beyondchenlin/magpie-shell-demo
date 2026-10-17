/* Run with the existing Electron runtime, never a user's installed app/profile:
 * electron scripts/review-desktop.cjs <dist/index.html> <owned-report-dir>
 * All tested browser storage is in-memory; profiles are task-owned.
 */
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const entry=path.resolve(process.argv[2]);
const output=path.resolve(process.argv[3]);
fs.mkdirSync(output,{recursive:true});
app.setPath('userData',path.join(output,'profile'));
app.disableHardwareAcceleration();
const results=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const runJS=(win,code)=>win.webContents.executeJavaScript(code);
async function until(win,code){for(let i=0;i<40;i++){if(await runJS(win,code))return;await delay(50);}throw Error('Timed out: '+code);}
async function test(name,body){
  const win=new BrowserWindow({show:false,width:1000,height:1000,webPreferences:{partition:`review-${results.length}`,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  const session=win.webContents.session;
  try{
    await win.loadFile(entry,{query:{comparison:'2026-10-17'}});
    await until(win,`document.querySelectorAll('#agents > .agent').length===5`);
    // Navigation is separately tested by the chrome smoke. These checks target
    // state lifetime, so bypass animated transitions in this test renderer only.
    await runJS(win,`document.startViewTransition=undefined`);
    await body(win);
    results.push({name,passed:true});
  }catch(error){results.push({name,passed:false,error:error.message});}
  finally{
    win.destroy();
    await session.clearStorageData();
    await session.clearCache();
  }
}
const switchAt=id=>`document.querySelector('#agents [data-id="${id}"] .ag-conn')`;
app.whenReady().then(async()=>{
  for(const value of ['null','[]','{"codex":"false","pi":true}','broken-json']){
    await test(`R1 invalid cached Agent state: ${value}`,async win=>{
      await runJS(win,`localStorage.setItem('magpie.demoAgentWired',${JSON.stringify(value)})`);
      await win.loadFile(entry,{query:{comparison:'2026-10-17'}});
      await until(win,`document.querySelectorAll('#agents > .agent').length===5`);
      assert.equal(await runJS(win,`${switchAt('codex')}.getAttribute('aria-checked')`),'false');
    });
  }
  for(const [id,expected] of [['codex','gpt-6.1-sol'],['deepseek','默认'],['workbuddy','默认']]){
    await test(`R1 ${id} details use its own comparison catalog`,async win=>{
      // Old demo catalog must not leak into the screenshot fixture.
      await runJS(win,`localStorage.setItem('magpie.demoAmModels',JSON.stringify({${id}:[{id:'claude-old',name:'claude-old',group:'Anthropic',on:true}]}))`);
      await win.loadFile(entry,{query:{comparison:'2026-10-17'}});
      await until(win,`!!${switchAt(id)}`);
      await runJS(win,`${switchAt(id)}.click()`);
      await until(win,`${switchAt(id)}.getAttribute('aria-checked')==='true'`);
      assert.equal(await runJS(win,`!!document.querySelector('#agents [data-id="${id}"] .ag-st.wait')`),false);
      await runJS(win,`document.querySelector('#agents [data-id="${id}"] .ag-quiet[aria-haspopup="dialog"]').click()`);
      await until(win,`!!document.querySelector('.am-pop')`);
      const labels=await runJS(win,`Array.from(document.querySelectorAll('.am-pop .am-mr .n'),e=>e.firstChild.textContent)`);
      assert.deepEqual(labels,[expected]);
      assert.equal(await runJS(win,`document.querySelector('.am-pop .am-mr').getAttribute('aria-disabled')`),'true');
    });
  }
  await test('R2 two pending Agent connects keep both switches disabled',async win=>{
    await runJS(win,`${switchAt('codex')}.click();${switchAt('deepseek')}.click()`);
    await delay(50);
    assert.equal(await runJS(win,`${switchAt('codex')}.disabled && ${switchAt('deepseek')}.disabled`),true);
    await until(win,`${switchAt('codex')}.getAttribute('aria-checked')==='true' && ${switchAt('deepseek')}.getAttribute('aria-checked')==='true'`);
    assert.equal(await runJS(win,`${switchAt('codex')}.disabled || ${switchAt('deepseek')}.disabled`),false);
  });
  await test('R2 leaving Agents cancels its pending connection notification',async win=>{
    await runJS(win,`${switchAt('codex')}.click();location.hash='#/providers'`);
    await until(win,`!!document.querySelector('#view-providers')`);
    await delay(500);
    const notice=await runJS(win,`document.querySelector('.foot')?.textContent || ''`);
    assert(!/已接入|Connected/.test(notice),notice);
    await runJS(win,`location.hash='#/agents'`);
    await until(win,`!!${switchAt('codex')}`);
    assert.equal(await runJS(win,`${switchAt('codex')}.getAttribute('aria-checked')`),'false');
  });
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({entry,at:new Date().toISOString(),results},null,2));
  app.exit(results.some(r=>!r.passed)?1:0);
}).catch(error=>{fs.writeFileSync(path.join(output,'fatal.txt'),error.stack);app.exit(1);});
