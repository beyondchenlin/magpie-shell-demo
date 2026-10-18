// Synthetic write contention only: no SQL data reads or writes, always roll back.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const fixture='C:/Users/ai/AppData/Local/Temp/tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88';
const records='D:/demo1/tagmaai/.cache/p0-s13-lifecycle';
if(readFileSync(fixture+'/owner.txt','utf8')!=='tagma-p0-s09/native/v1')throw Error('Wrong fixture');
if(existsSync(records+'/write-lock-release'))throw Error('Stale release file');
const db=new DatabaseSync(fixture+'/data/config.sqlite3');let locked=false;
try{db.exec('BEGIN IMMEDIATE');locked=true;writeFileSync(records+'/16-write-lock-ready.json',JSON.stringify({utc:new Date().toISOString(),pid:process.pid,action:'BEGIN IMMEDIATE; no data read or changed'}));const start=Date.now();while(!existsSync(records+'/write-lock-release')&&Date.now()-start<90000)await new Promise(r=>setTimeout(r,100));}
finally{if(locked)db.exec('ROLLBACK');db.close();writeFileSync(records+'/16-write-lock-released.json',JSON.stringify({utc:new Date().toISOString(),pid:process.pid,rolledBack:true}));}
