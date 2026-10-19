import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
if(fs.readFileSync(root+'/owner.txt','utf8').trim()!=='tagma-p2-s12/routing/v1')throw Error('owner');
let count=0;const sockets=new Set();
function log(data){const p=root+'/upstream-events.jsonl';if(fs.existsSync(p)&&fs.statSync(p).size>1024*1024)throw Error('log budget');fs.appendFileSync(p,JSON.stringify({utc:new Date().toISOString(),...data})+'\n')}
const server=http.createServer(async(req,res)=>{
 if(req.method==='GET'&&req.url==='/v1/models'){log({event:'catalog'});res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({object:'list',data:[{id:'p1-s33-local-model',object:'model',owned_by:'controlled-local-fixture'}]}));return;}
 if(req.method!=='POST'||req.url!=='/v1/chat/completions'){res.writeHead(404);res.end();return;}
 let body='';for await(const chunk of req){body+=chunk;if(body.length>128*1024){res.writeHead(413);res.end();return;}}
 const parsed=JSON.parse(body);const mode=fs.readFileSync(root+'/upstream-mode.txt','utf8').trim();const id=++count;
 log({event:'request',id,mode,model:parsed.model,messages:parsed.messages?.length,stream:parsed.stream,previousText:parsed.messages?.length===1 && parsed.messages[0]?.content?.includes('local_fixed_sample')});
 res.on('close',()=>log({event:'closed',id,mode,finished:res.writableFinished}));
 if(mode==='auth'){res.writeHead(401,{'content-type':'application/json'});res.end(JSON.stringify({error:{message:'owned fixture refusal',type:'invalid_api_key'}}));return;}
 if(!parsed.stream){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({id:'p1-s33-'+id,object:'chat.completion',model:parsed.model,choices:[{index:0,message:{role:'assistant',content:'这是本机受控小队中间结果。'},finish_reason:'stop'}],usage:{prompt_tokens:8,completion_tokens:4,total_tokens:12}}));log({event:'completed',id,nonstream:true});return;}
 res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache'});res.flushHeaders();
 const frame=(delta,finish=null,usage=undefined)=>res.write('data: '+JSON.stringify({id:'p1-s33-'+id,object:'chat.completion.chunk',model:parsed.model,choices:[{index:0,delta,finish_reason:finish}],...(usage?{usage}:{})})+'\n\n');
 let step=0;const timer=setInterval(()=>{if(res.destroyed){clearInterval(timer);return;}step++;
 if(mode==='slow'){frame({content:'受控流片段 '+step+'。'});if(step===90){clearInterval(timer);res.end();}return;}
 if(step===1)frame({content:'这是本机受控云模型的合成回复，'});
 if(step===2)frame({content:'已收到 ReachFlow 固定素材；用于验证小队顺序调用。'});
 if(step===3){clearInterval(timer);frame({},'stop',{prompt_tokens:8,completion_tokens:4,total_tokens:12});res.end('data: [DONE]\n\n');log({event:'completed',id});}
 },mode==='slow'?600:350);res.on('close',()=>clearInterval(timer));
});
server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});
server.listen(55324,'127.0.0.1',()=>{fs.writeFileSync(root+'/upstream-identity.json',JSON.stringify({pid:process.pid,port:server.address().port,owner:'tagma-p2-s12/routing/v1',started:new Date().toISOString()}));});
const end=()=>{for(const s of sockets)s.destroy();server.close(()=>process.exit(0));};
const poll=setInterval(()=>{if(fs.existsSync(root+'/stop-upstream-team')){clearInterval(poll);end();}},500);
setTimeout(()=>{clearInterval(poll);end();},20*60*1000).unref();
