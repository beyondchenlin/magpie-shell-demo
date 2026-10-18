import http from 'node:http';
import {readFileSync,writeFileSync,appendFileSync,existsSync} from 'node:fs';
const dir='D:/demo1/tagmaai/.cache/p0-s14-closure';
if(readFileSync(dir+'/owner.txt','utf8')!=='tagma-p0-s14/closure/v1')throw Error('Owner mismatch');
let requests=0;const sockets=new Set();
const log=e=>appendFileSync(dir+'/repeat-upstream-events.jsonl',JSON.stringify({utc:new Date().toISOString(),...e})+'\n');
const server=http.createServer(async(req,res)=>{
 if(req.url==='/v1/models'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({data:[{id:'p0-exit-model',object:'model'}]}));return;}
 if(req.url!=='/v1/chat/completions'||req.method!=='POST'||++requests>12){res.writeHead(404).end();return;}
 let data='';for await(const b of req){data+=b;if(data.length>8192){req.destroy();return;}}
 const body=JSON.parse(data);if(body.model!=='p0-exit-model'||body.stream!==true){res.writeHead(400).end();return;}
 const mode=existsSync(dir+'/repeat-upstream-mode.json')?JSON.parse(readFileSync(dir+'/repeat-upstream-mode.json','utf8')):{durationMs:45000};
 if(!Number.isInteger(mode.durationMs)||mode.durationMs<500||mode.durationMs>60000)throw Error('Invalid bounded duration');
 const id=requests;const start=Date.now();log({event:'accepted',id,durationMs:mode.durationMs});
 res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'});
 const chunk=(delta,finish_reason=null)=>'data: '+JSON.stringify({id:'p0-synthetic-'+id,object:'chat.completion.chunk',model:'p0-exit-model',choices:[{index:0,delta,finish_reason}]})+'\n\n';
 res.write(chunk({role:'assistant',content:'P0 synthetic stream. '}));
 const tick=setInterval(()=>res.write(chunk({content:'. '})),1000);
 const end=setTimeout(()=>{res.write(chunk({},'stop'));res.end('data: [DONE]\n\n');},mode.durationMs);
 res.on('close',()=>{clearInterval(tick);clearTimeout(end);log({event:'closed',id,elapsedMs:Date.now()-start,finished:res.writableFinished});});
});
server.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});
server.listen(50911,'127.0.0.1',()=>writeFileSync(dir+'/repeat-upstream-ready.json',JSON.stringify({pid:process.pid,port:server.address().port,host:'127.0.0.1',synthetic:true,utc:new Date().toISOString()})));
const timer=setInterval(()=>{if(existsSync(dir+'/repeat-upstream-release'))stop();},250);
const lifetime=setTimeout(stop,30*60*1000);
function stop(){clearInterval(timer);clearTimeout(lifetime);for(const socket of sockets)socket.destroy();server.close();}
