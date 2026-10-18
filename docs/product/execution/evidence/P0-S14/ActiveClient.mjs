import {writeFileSync,readFileSync} from 'node:fs';
const dir='D:/demo1/tagmaai/.cache/p0-s14-closure';
if(readFileSync(dir+'/owner.txt','utf8')!=='tagma-p0-s14/closure/v1')throw Error('Wrong owner');
const label=process.argv[2];if(!/^[a-z0-9-]{1,40}$/.test(label))throw Error('Bad label');
const record={label,started:new Date().toISOString(),pid:process.pid};let bytes=0,tail='';const parts=[];
try{
 const response=await fetch('http://127.0.0.1:49697/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'p0-exit-model',stream:true,messages:[{role:'user',content:'Owned P0 exit fixture only.'}]}),signal:AbortSignal.timeout(65000)});
 record.status=response.status;
 for await(const chunk of response.body){bytes+=chunk.length;const text=Buffer.from(chunk).toString('utf8');tail=(tail+text).slice(-4000);if(tail.includes('[DONE]'))record.sawDone=true;if(tail.includes('GATEWAY_STOPPING'))record.sawGatewayStopping=true;if(parts.length<4)parts.push(text);if(!record.firstChunk){record.firstChunk=new Date().toISOString();writeFileSync(dir+'/'+label+'-active.json',JSON.stringify(record));}}
 record.transportEnded=true;
}catch(error){record.error=error.message;}
finally{record.ended=new Date().toISOString();record.bytes=bytes;record.prefix=parts.join('').slice(0,4000);record.tail=tail;writeFileSync(dir+'/'+label+'-result.json',JSON.stringify(record,null,2));}
