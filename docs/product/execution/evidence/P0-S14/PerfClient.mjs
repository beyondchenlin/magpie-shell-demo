import {readFileSync,writeFileSync} from 'node:fs';
import {setTimeout as pause} from 'node:timers/promises';
const dir='D:/demo1/tagmaai/.cache/p0-s14-closure';
if(readFileSync(dir+'/owner.txt','utf8')!=='tagma-p0-s14/closure/v1')throw Error('Owner');
const synthetic=JSON.stringify({model:'p0-exit-model',stream:true,messages:[{role:'user',content:'Owned loopback performance fixture.'}]});
async function request(port){const start=performance.now();let first=null;let result='';try{const r=await fetch(`http://127.0.0.1:${port}/v1/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json'},body:synthetic,signal:AbortSignal.timeout(10000)});for await(const chunk of r.body){if(first===null)first=performance.now()-start;result+=Buffer.from(chunk).toString();if(result.length>8192)throw Error('Unexpected oversized fixture response');}return{status:r.status,firstMs:first,totalMs:performance.now()-start,ok:r.status===200&&result.includes('[DONE]')&&!result.includes('"error"')};}catch(error){return{ok:false,error:error.message,firstMs:first,totalMs:performance.now()-start};}}
const percentile=(items,p)=>[...items].sort((a,b)=>a-b)[Math.ceil(items.length*p)-1];
const mode=process.argv[2];
if(mode==='latency'){
 const started=new Date().toISOString();const pairs=[];let next=0;
 await Promise.all(Array.from({length:10},async()=>{for(;;){const index=next++;if(index>=1000)return;let direct,gateway;if(index%2===0){direct=await request(50911);gateway=await request(49697);}else{gateway=await request(49697);direct=await request(50911);}pairs.push({index,direct,gateway,deltaMs:direct.ok&&gateway.ok?gateway.firstMs-direct.firstMs:null});}}));
 const good=pairs.filter(p=>p.direct.ok&&p.gateway.ok);const gateway=good.map(p=>p.gateway.firstMs),direct=good.map(p=>p.direct.firstMs),delta=good.map(p=>p.deltaMs);
 const result={started,ended:new Date().toISOString(),build:'Windows x64 debug dev26',layer:'Real gateway HTTP benchmark against synthetic loopback upstream; not a native UI test or real supplier',concurrency:10,gatewayRequests:1000,directRequests:1000,method:'10 workers; direct and gateway requests paired per worker in alternating order; first response-body chunk observed, pooled fetch connections; no warmup excluded',failures:pairs.length-good.length,cancellations:0,gatewayFirstP95Ms:percentile(gateway,.95),directFirstP95Ms:percentile(direct,.95),pairedOverheadP95Ms:percentile(delta,.95),differenceOfP95Ms:percentile(gateway,.95)-percentile(direct,.95),budgetMs:30,withinLocalDebugBudget:good.length===1000&&percentile(delta,.95)<=30,pairs:pairs.sort((a,b)=>a.index-b.index)};
 writeFileSync(dir+'/gateway-latency-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,pairs:undefined}));if(!result.withinLocalDebugBudget)process.exitCode=1;
}else if(mode==='steady'){
 const start=performance.now(),started=new Date().toISOString();let total=0,failed=0,firstError=null;const windows=[];
 writeFileSync(dir+'/steady-started.json',JSON.stringify({pid:process.pid,started,durationMs:1800000,requestsPerSecond:1,concurrency:1}));
 for(let n=0;n<1800;n++){await pause(Math.max(0,start+n*1000-performance.now()));const r=await request(49697);total++;if(!r.ok){failed++;firstError??=r;if(failed>=5)break;}if(total%60===0){windows.push({minute:total/60,utc:new Date().toISOString(),total,failed});writeFileSync(dir+'/steady-progress.json',JSON.stringify({started,total,failed,windows}));}}
 if(total===1800)await pause(Math.max(0,start+1800000-performance.now()));
 const result={started,ended:new Date().toISOString(),elapsedMs:performance.now()-start,total,failed,firstError,windows,layer:'Synthetic loopback steady HTTP load, not native UI or real supplier'};writeFileSync(dir+'/steady-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(failed||total!==1800)process.exitCode=1;
}else throw Error('Choose latency or steady');
