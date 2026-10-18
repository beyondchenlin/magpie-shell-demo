// Own synthetic real-binary lifecycle fixture. Tokens remain in memory only.
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createConnection} from 'node:net';
const fixture='C:/Users/ai/AppData/Local/Temp/tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88';
const records='D:/demo1/tagmaai/.cache/p0-s13-lifecycle';
const exe=join(fixture,'candidate-dev22/tagma-gateway.exe');
if(readFileSync(join(fixture,'owner.txt'),'utf8')!=='tagma-p0-s09/native/v1')throw Error('Wrong fixture');
if(createHash('sha256').update(readFileSync(exe)).digest('hex')!=='9bfda9c7d6d45cb7ff7c84a7d0607610ecab5c5e4dfcb22409d07711a3773f4a')throw Error('Wrong binary');
const release=join(records,'independent-release');if(existsSync(release))throw Error('Stale release');
const instance=randomUUID(),token=randomUUID();
const child=spawn(exe,['--config-dir',join(fixture,'data'),'--port','49697','--test-port-override'],{windowsHide:true,stdio:['pipe','ignore','ignore']});
child.stdin.end(JSON.stringify({instance_id:instance,owner_token:token})+'\n');
let manifest;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function call(command){const challenge=randomUUID();const body=Buffer.from(JSON.stringify({protocol_version:manifest.protocol_version,product_version:manifest.product_version,config_id:manifest.config_id,instance_id:manifest.instance_id,challenge,command}));const header=Buffer.alloc(4);header.writeUInt32BE(body.length);return new Promise((yes,no)=>{let buf=Buffer.alloc(0);const socket=createConnection('\\\\.\\pipe\\'+manifest.endpoint);socket.setTimeout(3000,()=>socket.destroy(Error('IPC timeout')));socket.on('error',no);socket.on('connect',()=>socket.write(Buffer.concat([header,body])));socket.on('data',chunk=>{buf=Buffer.concat([buf,chunk]);if(buf.length>=4&&buf.length>=4+buf.readUInt32BE(0)){const result=JSON.parse(buf.subarray(4,4+buf.readUInt32BE(0)));socket.end();if(result.challenge!==challenge||result.instance_id!==instance)no(Error('Wrong handshake'));else yes(result);}});});}
try{
 for(let n=0;n<80;n++){try{const value=JSON.parse(readFileSync(join(fixture,'data/runtime.json'),'utf8'));if(value.instance_id===instance){manifest=value;break;}}catch{}if(child.exitCode!==null)throw Error('Independent fixture exited '+child.exitCode);await pause(100);}if(!manifest)throw Error('No owned independent manifest');
 const response=await call({kind:'status'});
 writeFileSync(join(records,'15-independent-ready.json'),JSON.stringify({utc:new Date().toISOString(),pid:child.pid,parent:process.pid,instance,port:manifest.port,consoleAttached:manifest.console_attached,state:response.status.state,effective:response.status.effective_revision},null,2));
 const start=Date.now();while(!existsSync(release)&&Date.now()-start<240000&&child.exitCode===null)await pause(200);
}finally{
 let graceful=false;
 try{if(manifest&&child.exitCode===null){await call({kind:'stop',owner_token:token});await Promise.race([new Promise(r=>child.once('exit',r)),pause(12000)]);graceful=child.exitCode===0;}}catch{}
 if(child.exitCode===null)child.kill();
 writeFileSync(join(records,'15-independent-cleanup.json'),JSON.stringify({utc:new Date().toISOString(),pid:child.pid,gracefulStop:graceful,exitCode:child.exitCode,kind:'fixture owner cleanup, not native UI acceptance'},null,2));
}
