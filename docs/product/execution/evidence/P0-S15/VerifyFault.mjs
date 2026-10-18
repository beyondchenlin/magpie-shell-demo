import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir='D:/demo1/tagmaai/.cache/p0-s15-closure';
const fixture=JSON.parse(readFileSync(dir+'/credential-fault-created.json','utf8').replace(/^\uFEFF/,''));
if(readFileSync(dir+'/owner.txt','utf8')!=='tagma-p0-s15/closure/v1'||readFileSync(fixture.target+'/owner.txt','utf8')!=='tagma-p0-s15/missing-credential/v1')throw Error('Owner');
const db=new DatabaseSync(fixture.target+'/config.sqlite3',{readOnly:true});
let revisions;
try{
  revisions=db.prepare('SELECT revision,snapshot FROM revisions WHERE revision>=2 ORDER BY revision').all().map(row=>{
    const s=JSON.parse(row.snapshot);if(s.providers.length!==1||s.providers[0].provider.id!==fixture.providerId||s.providers[0].credential_ref!==fixture.reference||s.gateway.credential_ref!==null)throw Error('Fixture credential reference changed');
    return {revision:row.revision,enabled:s.providers[0].provider.enabled,credentialReferenceUnchanged:true};
  });
  if(JSON.stringify(revisions.map(r=>[r.revision,r.enabled]))!==JSON.stringify([[2,true],[3,false],[4,true]]))throw Error('Unexpected revision history');
  if(db.prepare('SELECT count(*) AS n FROM credential_journal').get().n!==0)throw Error('Unexpected credential journal');
  if(db.prepare('SELECT config_uuid FROM config_metadata').get().config_uuid!==fixture.configId)throw Error('Unexpected fixture config identity');
}finally{db.close();}
const originalHash=createHash('sha256').update(readFileSync(fixture.source+'/config.sqlite3')).digest('hex');
if(originalHash!==fixture.sourceHash)throw Error('Source fixture changed');
const logs=readFileSync(fixture.target+'/logs/tagma.0.jsonl','utf8');
const events=logs.trim().split(/\r?\n/).map(JSON.parse);
if(!events.some(e=>e.event==='start_failed'&&e.code==='CREDENTIAL_STORE_UNAVAILABLE')||!events.some(e=>e.event==='ready'&&e.revision===3))throw Error('Missing expected runtime events');
if(events.some(e=>e.event==='ready'&&e.revision===4))throw Error('False revision4 success');
const files=readdirSync(fixture.target,{recursive:true,withFileTypes:true}).filter(e=>e.isFile()).map(e=>({name:e.name,bytes:statSync(e.parentPath+'/'+e.name).size}));
const result={utc:new Date().toISOString(),revisions,sourceFixtureUnchanged:true,noCredentialJournal:true,events,files,scope:'Synthetic missing reference plus real native UI and real Windows Credential Manager; no locked-facility claim'};
writeFileSync(dir+'/fault-verification.json',JSON.stringify(result,null,2));
writeFileSync(dir+'/fault-runtime.jsonl',logs);
console.log(JSON.stringify({revisions,sourceFixtureUnchanged:true,eventCount:events.length,bytes:files.reduce((n,f)=>n+f.bytes,0)}));
