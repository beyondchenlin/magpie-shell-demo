import {DatabaseSync,backup} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
const root='C:/Users/ai/AppData/Local/Temp/tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88';
const evidence='D:/demo1/tagmaai/.cache/p0-s15-closure';
if(readFileSync(root+'/owner.txt','utf8')!=='tagma-p0-s09/native/v1'||readFileSync(evidence+'/owner.txt','utf8')!=='tagma-p0-s15/closure/v1')throw Error('Owner mismatch');
const source=root+'/p0s14-faults/empty';
if(readFileSync(source+'/owner.txt','utf8')!=='tagma-p0-s14/synthetic-only/v1'||lstatSync(source).isSymbolicLink())throw Error('Source ownership');
const target=root+'/p0s15-missing-credential';
if(existsSync(target))throw Error('Refuse overwrite');
const original=new DatabaseSync(source+'/config.sqlite3',{readOnly:true});
try{
  for(const {snapshot} of original.prepare('SELECT snapshot FROM revisions').all()){
    const s=JSON.parse(snapshot);if(s.gateway?.credential_ref||s.providers.some(p=>p.credential_ref))throw Error('Refuse copying credential references');
  }
  if(original.prepare('SELECT count(*) AS n FROM credential_journal').get().n!==0)throw Error('Credential operation pending');
  mkdirSync(target);writeFileSync(target+'/owner.txt','tagma-p0-s15/missing-credential/v1');
  // SQLite's online backup includes committed WAL without changing the source.
  await backup(original,target+'/config.sqlite3');
}finally{original.close();}
const configId=randomUUID(),providerId=randomUUID(),reference='provider/'+randomUUID();
const db=new DatabaseSync(target+'/config.sqlite3');
try{
  const head=db.prepare('SELECT revision FROM config_head WHERE singleton=1').get().revision;
  const snapshot=JSON.parse(db.prepare('SELECT snapshot FROM revisions WHERE revision=?').get(head).snapshot);
  snapshot.providers=[{provider:{id:providerId,name:'P0 Missing Credential',protocol:'openai_chat_completions',base_url:'http://127.0.0.1:9/v1',enabled:true,models:['p0-missing-model'],has_credential:true},credential_ref:reference}];
  snapshot.gateway={port:49697,auth_enabled:false,credential_ref:null};snapshot.profiles=[];snapshot.teams=[];snapshot.budgets=[];snapshot.first_cloud_order={kind:'global'};
  // This is a synthetic fault fixture, never an application save or migration claim.
  db.exec('BEGIN');
  db.prepare('UPDATE config_metadata SET config_uuid=? WHERE singleton=1').run(configId);
  db.prepare('UPDATE revisions SET snapshot=? WHERE revision=?').run(JSON.stringify(snapshot),head);
  db.exec('COMMIT; PRAGMA wal_checkpoint(TRUNCATE)');
  writeFileSync(evidence+'/credential-fault-created.json',JSON.stringify({utc:new Date().toISOString(),target,source,configId,providerId,reference,head,synthetic:true,secretCreated:false,sourceHash:createHash('sha256').update(readFileSync(source+'/config.sqlite3')).digest('hex'),scope:'Missing random Windows credential entry; not a locked credential facility'},null,2));
  console.log(JSON.stringify({target,head,reference,synthetic:true}));
}finally{db.close();}
