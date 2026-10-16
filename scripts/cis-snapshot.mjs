/** Build an immutable source commit into an owned preview directory without
 * replacing the user's dist, installing dependencies, or making a worktree.
 * Run from the repository root: node scripts/cis-snapshot.mjs <commit> <label>
 */
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd();
const source=execFileSync('git',['rev-parse',(process.argv[2]||'HEAD')+'^{commit}'],{encoding:'utf8'}).trim();
const label=process.argv[3]||source.slice(0,7);
if(!/^[a-z0-9-]{1,70}$/.test(label))throw Error('Use a bounded alphanumeric task label');
const base=resolve(root,'.cache/cis-navigation-20261016',label);
if(existsSync(base))throw Error('Snapshot label already exists; reuse or inspect instead of overwriting');
const src=join(base,'source');mkdirSync(src,{recursive:true});
const paths=['src','public','index.html','package.json','package-lock.json','vite.config.ts','tsconfig.json','tsconfig.app.json','tsconfig.node.json','scripts/chrome-guard.mjs','scripts/cis-guard.mjs','docs/cis/source-manifest.json'];
const links=execFileSync('git',['ls-tree','-r',source,'--','src','public'],{encoding:'utf8'}).split('\n').filter(line=>line.startsWith('120000'));
if(links.length)throw Error('Inspect source symbolic links before making a snapshot');
execFileSync('git',['archive','--format=tar','--output='+join(base,'source.tar'),source,...paths]);
execFileSync('tar',['-xf',join(base,'source.tar'),'-C',src]);
const node=process.execPath;
execFileSync(node,[join(root,'node_modules/typescript/bin/tsc'),'-b'],{cwd:src,stdio:'inherit'});
execFileSync(node,[join(root,'node_modules/vite/bin/vite.js'),'build'],{cwd:src,stdio:'inherit'});
const dist=join(src,'dist'),pkg=JSON.parse(readFileSync(join(src,'package.json'),'utf8'));
const probe=readFileSync(join(root,'scripts/cis-motion-probe.js'));
writeFileSync(join(dist,'cis-motion-probe.js'),probe);
writeFileSync(join(dist,'cis-copy-fixture.js'),readFileSync(join(root,'scripts/cis-copy-fixture.js')));
const html=readFileSync(join(dist,'index.html'),'utf8').replace('<head>','<head><script src="./cis-copy-fixture.js"></script><meta name="magpie-source-commit" content="'+source+'"><meta name="magpie-ui-version" content="'+pkg.version+'">').replace('</body>','<script type="module" src="./cis-motion-probe.js"></script></body>');
writeFileSync(join(dist,'index.html'),html);
const artifacts=[];
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())walk(p);else{const b=readFileSync(p);artifacts.push({path:relative(dist,p).replaceAll('\\','/'),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}}}
walk(dist);
const info={sourceCommit:source,sourceTree:execFileSync('git',['rev-parse',source+':src'],{encoding:'utf8'}).trim(),version:pkg.version,builtAt:new Date().toISOString(),method:'git archive source + existing ancestor dependencies + tsc/vite; nonvisual measurement probe injected after build, restoring task navigation preference on pagehide',probeSha256:createHash('sha256').update(probe).digest('hex'),artifacts};
writeFileSync(join(dist,'build-info.json'),JSON.stringify(info,null,2)+'\n');
console.log(JSON.stringify({source,version:pkg.version,base,dist,probeSha256:info.probeSha256}));
