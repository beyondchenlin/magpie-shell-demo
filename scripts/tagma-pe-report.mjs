import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const result=[];
for(const argument of process.argv.slice(2)) {
  const path=resolve(argument); const bytes=await readFile(path);
  if(bytes.readUInt16LE(0)!==0x5a4d) throw new Error('Not a PE binary');
  const pe=bytes.readUInt32LE(0x3c); if(bytes.readUInt32LE(pe)!==0x4550) throw new Error('Invalid PE header');
  const subsystem=bytes.readUInt16LE(pe+4+20+68);
  result.push({path,subsystem,kind:subsystem===2?'Windows GUI':subsystem===3?'Windows Console':'Other'});
}
console.log(JSON.stringify(result,null,2));
if(result.some(binary=>binary.subsystem!==2)) process.exitCode=1;
