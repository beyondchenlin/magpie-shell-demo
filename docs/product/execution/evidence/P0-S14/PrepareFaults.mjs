import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdirSync,existsSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='C:/Users/ai/AppData/Local/Temp/tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88';
if(readFileSync(root+'/owner.txt','utf8')!=='tagma-p0-s09/native/v1')throw Error('Wrong owner');
const parent=root+'/p0s14-faults';
if(existsSync(parent))throw Error('Refuse reuse or overwrite of unknown synthetic data');
mkdirSync(parent);
const cases=[];
for(const name of ['future','unknown','empty']){
 const dir=parent+'/'+name;mkdirSync(dir);writeFileSync(dir+'/owner.txt','tagma-p0-s14/synthetic-only/v1');
 const file=dir+'/config.sqlite3';
 if(name==='future'){const db=new DatabaseSync(file);try{db.exec('PRAGMA user_version=999; PRAGMA application_id=1413564237; CREATE TABLE synthetic_marker(value TEXT); INSERT INTO synthetic_marker VALUES (\'owned future schema; preserve unchanged\');');}finally{db.close();}}
 if(name==='unknown')writeFileSync(file,'tagma-p0-s14-owned-synthetic-unknown-database\nDo not reset or migrate.\n');
 cases.push({name,dir,bytes:existsSync(file)?statSync(file).size:0,sha256:existsSync(file)?createHash('sha256').update(readFileSync(file)).digest('hex'):null});
}
writeFileSync('D:/demo1/tagmaai/.cache/p0-s14-closure/faults-created.json',JSON.stringify(cases,null,2));
console.log(JSON.stringify(cases));
