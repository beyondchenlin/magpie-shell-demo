import http from 'node:http';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const dir='D:/demo1/tagmaai/.cache/p0-s14-closure';
if(readFileSync(dir+'/owner.txt','utf8')!=='tagma-p0-s14/closure/v1')throw Error('Owner');
let requests=0;const sockets=new Set();const began=new Date().toISOString();
const server=http.createServer(async(req,res)=>{
 if(req.method==='GET'&&req.url==='/v1/models'){res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({object:'list',data:[{id:'p0-exit-model',object:'model'}]}));return;}
 if(req.method!=='POST'||req.url!=='/v1/chat/completions'||++requests>10000){res.writeHead(404).end();return;}
 let body='';try{for await(const chunk of req){body+=chunk;if(body.length>8192){req.destroy();return;}}const parsed=JSON.parse(body);if(parsed.model!=='p0-exit-model'||parsed.stream!==true){res.writeHead(400).end();return;}}catch{res.writeHead(400).end();return;}
 res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'});
 res.end('data: '+JSON.stringify({id:'p0-perf-'+requests,object:'chat.completion.chunk',model:'p0-exit-model',choices:[{index:0,delta:{role:'assistant',content:'fixture'},finish_reason:null}]})+'\n\ndata: '+JSON.stringify({id:'p0-perf-'+requests,object:'chat.completion.chunk',model:'p0-exit-model',choices:[{index:0,delta:{},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n');
});
server.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});
server.listen(50911,'127.0.0.1',()=>writeFileSync(dir+'/perf-upstream-ready.json',JSON.stringify({pid:process.pid,port:50911,began,synthetic:true,maxRequests:10000,lifetimeMinutes:60})));
const interval=setInterval(()=>{if(existsSync(dir+'/perf-upstream26-release'))stop();},500);
const lifetime=setTimeout(stop,60*60*1000);
function stop(){clearInterval(interval);clearTimeout(lifetime);for(const s of sockets)s.destroy();server.close();writeFileSync(dir+'/perf-upstream-closed.json',JSON.stringify({pid:process.pid,began,ended:new Date().toISOString(),requests}));}
