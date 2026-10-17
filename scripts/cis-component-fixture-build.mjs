/** Add a separate test-only entry to an immutable candidate's owned dist.
 * Existing production artifacts must retain their bytes. Reuses root dependencies.
 */
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, existsSync, readdirSync, lstatSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root=process.cwd(), src=resolve(process.argv[2]||'');
const boundary=resolve(root,'.cache/cis-navigation-20261016')+'\\';
if(!src.startsWith(boundary)||!src.endsWith('\\source')||lstatSync(src).isSymbolicLink())throw Error('Use an owned immutable snapshot source');
const dist=join(src,'dist'), entry='cis-component-fixture.html';
if(existsSync(join(dist,entry)))throw Error('Fixture already exists; reuse it');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const before=new Map();
function walk(dir,visit){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())walk(p,visit);else visit(p);}}
walk(dist,p=>before.set(p,sha(readFileSync(p))));
const fixture=readFileSync(join(root,'scripts/cis-component-fixture.tsx'));
writeFileSync(join(src,'cis-component-fixture.tsx'),fixture);
writeFileSync(join(src,entry),'<!doctype html><html class="win"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CIS isolated component contract</title><body class="window web"><div id="root"></div><script type="module" src="./cis-component-fixture.tsx"></script></body></html>');
writeFileSync(join(src,'tsconfig.cis-component.json'),JSON.stringify({extends:'./tsconfig.app.json',compilerOptions:{tsBuildInfoFile:'./.cis-component.tsbuildinfo'},include:['src','cis-component-fixture.tsx']}));
execFileSync(process.execPath,[join(root,'node_modules/typescript/bin/tsc'),'-p',join(src,'tsconfig.cis-component.json')],{cwd:src,stdio:'inherit'});
await build({root:src,configFile:false,plugins:[react()],build:{outDir:dist,emptyOutDir:false,assetsDir:'cis-component-assets',rollupOptions:{input:join(src,entry)}}});
for(const [path,hash] of before)if(sha(readFileSync(path))!==hash)throw Error('Existing production artifact changed: '+path);
const artifacts=[];walk(dist,p=>{if(!before.has(p)){const bytes=readFileSync(p);artifacts.push({path:relative(dist,p).replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)});}});
const binding=JSON.parse(readFileSync(join(dist,'build-info.json'),'utf8'));
const report={sourceCommit:binding.sourceCommit,fixtureSha256:sha(fixture),componentSha256:sha(readFileSync(join(src,'src/components/ProtoMultiMenu.tsx'))),method:'separate test-only entry; every existing production artifact hash unchanged',artifacts};
writeFileSync(join(dist,'cis-component-fixture-info.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
