/** Package bounded S4/B3/B4 observations; never relabel a historical capture. */
import { readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import ts from 'typescript';
const final='a8976e0db339d520a290cbdd548c290be760797b';
const pages='1100d152bcf6ff4f6ba170824249844a3496ce9a';
const menus='bb1a250c18ec99817d7ab63270758e3bed4ab8aa';
const matrix='f896ebdff21d3e9aad5ec0355709c16df3e0650a';
const search='843129145444a214a60c05b4a592620ce43e00d6';
const raw='.cache/cis-controls-20261017', out='interactions/cis-controls-a8976e0';
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const source=(ref,path)=>execFileSync('git',['show',`${ref}:${path}`],{encoding:'utf8'});
mkdirSync(out,{recursive:true});
const save=(name,value)=>writeFileSync(join(out,name),JSON.stringify(value,null,2)+'\n');
for(const name of ['s4.json','b3-before.json','controls-after.json','b4-search-before.json','icons-before.png','icons-after.png','controls-light.png','controls-dark.png','hook-phone.png','lint-final.txt','toast-runtime.json','preferences-final.json','preferences-before-switch.json','preferences-before-last-switch.json','preferences-before-final-switch.json']) cpSync(join(raw,name),join(out,name));
cpSync(join(raw,'b4'),join(out,'b4'),{recursive:true});
const index=json('docs/cis/component-call-sites.json');
if(index.candidate!==final||index.rawRecipeCandidates.length!==34)throw Error('Unexpected callsite identity');
const classifications=[
 ['definition','R11','ActionConfirm native dialog component','C3','cis-confirm-7880135'],
 ['native-compound','R05/R20','Only switch belongs to model management compound; use-credits CSS','C4','cis-menus-396c11c'],
 ['shared-controller','R13/R18','Group row menu uses useRowMenu','P2','cis-pages-1100d15'],
 ['native-compound','R05/R24','Group member switch rt-mon, retains scale(.85)','P2/B3','controls-after.json'],
 ['definition','R01','PrefRow component definition','S1/B3','controls-after.json'],
 ['definition','R13/R18','ProtoMultiMenu component definition','C1/C2','cis-menus-862789f'],
 ['native-compound','R05','Archive visual span within native archive label','P3/B3','cis-pages-1100d15'],
 ['definition','R02','Segs uses shared useSegThumb','N2/S3','cis-layout-0a2a014'],
 ['definition','R06','Tick checkbox component','B3/C3','controls-after.json'],
 ['definition','R04','WordsField input component','B3/P1','controls-after.json'],
 ['native-compound','R04/R23','Agent manage search words plus native ag-manage-search','C4','cis-menus-396c11c'],
 ['shared-controller','R13/R18','Agent row menu uses useRowMenu','C1/C2','cis-menus-862789f'],
 ['different-control','R06/R22','Gateway .dot.tick is radio-dot for allowed agents, not Tick checkbox','G1/B3','cis-gateway-874268b'],
 ['shared-controller','R13/R18','MCP selection copy menu uses useProtocolMenu','B3/P5','controls-after.json'],
 ['native-compound','R02/R25','Skill install-method segs uses useSegThumb, includes busy option; no new install business','B3/P5','source/LibraryView.tsx'],
 ['shared-controller','R13/R18','MCP editor copy menu shares same useProtocolMenu with selection bar','B3/P5','controls-after.json'],
 ['shared-controller','R13/R18','Hook event searchable menu uses useProtocolMenu','B3/P5','controls-after.json'],
 ['shared-controller','R13/R18','Hook tools menu uses useProtocolMenu','B3/P5','controls-after.json'],
 ['shared-controller','R13/R18','Provider row menu uses useRowMenu','C1/P1','cis-confirm-7880135'],
 ['shared-controller','R13/R18','Routing row menu uses useRowMenu','C1/P2','cis-menus-862789f'],
 ['native-compound','R01/R24','Global fallback composite row rt-gfound; keep native detail structure','P2/B4','b4/records-final.json'],
 ['native-compound','R01/R24','Routing group names composite row rt-gnames','P2/B4','b4/records-final.json'],
 ['native-compound','R05/R24','Routing group switch rt-gon retains native scale(.85)','P2/B3','controls-after.json'],
 ['shared-controller','R13/R18','LAN address menu uses useProtocolMenu; final Down/Enter/Escape test on f896','S4/B3','controls-after.json'],
 ['shared-controller','R13/R18','Tray usage menu uses useProtocolMenu','B3','controls-after.json'],
 ['shared-controller','R13/R18','Search API menu uses useProtocolMenu','B3','controls-after.json'],
 ['native-controller','R07/R13/R18','Font menu retains font search/style controller, selected focus and native scroll lifecycle','S2/C2','cis-settings-90099b9'],
 ['native-compound','R01/R21','Image generation setting native row with two-part content, not generic .val','S4/B4','b4/records-final.json'],
 ['shared-controller','R13/R18','Usage row menu uses useRowMenu','C1/P3','cis-pages-1100d15'],
 ['native-controller','R13/R18','Usage date range uses distinct RangeMenu/date controller','C1/C2/P3','cis-menus-862789f'],
 ['native-compound','R02','Usage tab segs uses useSegThumb','P3/B4','cis-pages-1100d15'],
 ['native-compound','R02','Session period segs uses useSegThumb','P3/B4','cis-pages-1100d15'],
 ['native-compound','R05/R25','Plugin mirror visual switch within native pm-mirror label','P4/B3','cis-confirm-7880135'],
 ['native-compound-scope-boundary','R02/R08','Tray panel native smaller compound, shared useSegThumb; full tray matrix excluded by frozen R08','B3','source/TrayPanel.tsx'],
];
if(classifications.length!==34)throw Error('Classification coverage');
save('raw-recipe-classification.json',{candidate:final,unknown:0,meaning:'Raw native markup is not automatically a defect or a second implementation. Definition, compound, distinct control, shared controller and bounded tray purpose reviewed individually.',entries:index.rawRecipeCandidates.map((e,i)=>({...e,classification:classifications[i][0],rules:classifications[i][1],purpose:classifications[i][2],acceptance:classifications[i][3],evidence:classifications[i][4],gitBlob:git('rev-parse',`${final}:${e.file}`)}))});
// Bind unchanged branches, not whole files after local changes.
function parse(ref,path){return ts.createSourceFile(path,source(ref,path),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);}
function find(sf,predicate){const a=[];function visit(n){if(predicate(n,sf))a.push(n);ts.forEachChild(n,visit);}visit(sf);if(a.length!==1)throw Error(`Expected one AST branch; found ${a.length}`);return a[0];}
function attribute(n,name){const o=ts.isJsxElement(n)?n.openingElement:ts.isJsxSelfClosingElement(n)?n:null;return o?.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.getText()===name)?.initializer?.getText();}
const comparisons=[];
function sameNode(label,path,from,predicate){const a=parse(from,path),b=parse(final,path);const an=find(a,predicate),bn=find(b,predicate);const at=an.getText(a),bt=bn.getText(b);const proof={label,path,from,to:final,fromLine:a.getLineAndCharacterOfPosition(an.getStart(a)).line+1,toLine:b.getLineAndCharacterOfPosition(bn.getStart(b)).line+1,fromSha256:sha(at),toSha256:sha(bt),equal:at===bt};comparisons.push(proof);if(!proof.equal)throw Error(`Changed reuse branch ${label}`);}
const settings='src/pages/SettingsView.tsx', nested='src/pages/settings/NestedBlocks.tsx';
for(const name of ['Allowance display','Gateway port','Stop looping replies','Mask secrets','Update button']) sameNode(`S4 fixed operation: ${name}`,settings,pages,n=>ts.isJsxElement(n)&&n.openingElement.tagName.getText()==='PrefRow'&&attribute(n,'name')===`{t("${name}")}`);
sameNode('S4 SyncForms export/cancel function',nested,pages,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='SyncForms');
for(const name of ['General','Allowances','Network and sharing','Privacy','Sync and backup','About'])sameNode(`B4 unchanged Settings ${name}`,settings,matrix,n=>ts.isJsxElement(n)&&attribute(n,'data-part')===`{t("${name}")}`);
sameNode('B4 unchanged Library Hooks render branch','src/pages/LibraryView.tsx',matrix,(n,sf)=>ts.isConditionalExpression(n)&&n.condition.getText(sf)==='tab === "hooks"');
for(const condition of ['mcpCopyMenu === "bar"','mcpCopyMenu === "editor"','eventMenu','toolMenu'])sameNode(`B3 specialized menu: ${condition}`,'src/pages/LibraryView.tsx',menus,(n,sf)=>ts.isConditionalExpression(n)&&n.condition.getText(sf)===condition&&n.whenTrue.getText(sf).includes('className="pop proto-menu"'));
for(const name of ['TrayUsagePick','SearchApisBlock'])sameNode(`B3 unchanged ${name}`,nested,menus,n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);
// The entire Hooks conditional includes the final fallback. It is unchanged;
// affected Instructions/MCP/Skills and Models were separately observed on final.
const diffFiles=git('diff','--name-only',matrix,final,'--','src').split('\n').filter(Boolean);
const srcFiles=git('ls-tree','-r','--name-only',matrix,'--','src').split('\n');
const sameFiles=srcFiles.filter(p=>!diffFiles.includes(p)).map(path=>({path,blob:git('rev-parse',`${matrix}:${path}`),finalBlob:git('rev-parse',`${final}:${path}`)}));
if(sameFiles.some(x=>x.blob!==x.finalBlob))throw Error('File reuse mismatch');
save('reuse-certificate.json',{candidate:final,method:'Git blobs for unchanged files; exact AST node text SHA256 for changed-file branches; changed branches re-observed, not inferred.',b4ChangedFiles:diffFiles,b4UnchangedFiles:sameFiles,branches:comparisons,scope:'Cross-source bounded reuse only; no claim that all 76 observations were made on final.'});
save('capture-bindings.json',{candidate:final,version:'0.1.204',origin:'http://127.0.0.1:4176',platform:'Windows / Codex in-app Chromium',localOnly:true,pinnedUpstream:'63be47717a9ca91fc89102078a1f1fff3e03e0ce',specification:'028dab55a3877656c115439835d1d0d14465e4ee',s4:{raw:'s4.json',rawFormat:'Original bare 13-element array; no embedded SHA/environment. Original retained unchanged.',source:pages,binding:'Collection interval in executor tool history: immutable pages-candidate-1 / preview session49044 served 4176 before S4; preceding interactions/cis-pages-1100d15/after.json independently observed actualSource=1100d15; controlsChecks source=1100d15 created before 13 cases; no preview switch until all 13 cases completed. Subsequent controls-candidate-1 switch has separate source. This is an interval/manifest binding, not retroactive embedded metadata.',environment:'same task tab19/origin4176, Windows IAB, Chinese, light theme; no separate per-case viewport record in bare array, so do not assert exact per-case dimensions',disabled:'All six recorded defaults have disabled:[]; no new disabled feature invented',reuse:'Five identical fixed-operation PrefRow AST nodes plus entire SyncForms function; Settings diff pages→final consists only of unrelated search-provider description key.'},b3:{defaultSource:menus,sourceExceptions:'controls-after.b3[40] LAN before remains bb1a250; [41..44] after preview switch f896; [0..4] theme inherited system dark, not evidence of light; explicit [5..10] themed entry records light/dark; toast-runtime explicitly final a897.',fixture:'Actual shared components and native six CSS; extra test-only entry built without changing original production asset hashes; file valid PNG served from own /api/icons fixture, no service API.'},b4:{raw:'b4/records-first-pass.json',canonical:'b4/records-final.json',sources:Object.fromEntries([...new Set(json(join(raw,'b4/records-final.json')).map(x=>x.source))].map(s=>[s,json(join(raw,'b4/records-final.json')).filter(x=>x.source===s).length])),firstPassSource:matrix,searchCorrectionSource:search,finalAffectedSource:final,note:'76 bounded states, 19×4 configurations. 8 route/gateway first captures caught native .24s view-in; corrected only those and changed Library/Models branches. 32 retake history includes 8 Library records retaken twice. All previous PNGs retained. No paired native Windows pixel gold; source/browser review only.'},restoration:'preferences-final.json current and initial exactly match all 39 listed task keys; viewport reset. Previous restoration files retained.',remote:'No confirmed push after e19fd5a; cloud SHA unverified and externally blocked.'});
const b4=json(join(raw,'b4/records-final.json')), s4=json(join(raw,'s4.json')), restored=json(join(raw,'preferences-final.json'));
const assertions={candidate:final,s4Records:s4.length,s4Defaults:s4.filter(x=>x.case.endsWith('-default')).length,s4ExistingDisabled:s4.filter(x=>x.case.endsWith('-default')).map(x=>({case:x.case,disabled:x.disabled})),b4Records:b4.length,b4UniqueStates:new Set(b4.map(x=>x.key)).size,b4PerConfiguration:Object.fromEntries([...new Set(b4.map(x=>x.config.id))].map(k=>[k,b4.filter(x=>x.config.id===k).length])),b4NoBrokenImages:b4.every(x=>!x.brokenImages.length),b4NoInvalidNesting:b4.every(x=>x.invalidNesting===0),b4NoUncontainedOverflow:b4.every(x=>!x.overflows.length),b4DocumentFits:b4.every(x=>x.document.clientWidth===x.document.scrollWidth),rawClassified:34,rawUnknown:0,reuseBranches:comparisons.length,reuseBranchesEqual:comparisons.every(x=>x.equal),restoredKeys:Object.keys(restored.current).length,exactRestore:JSON.stringify(restored.current)===JSON.stringify(restored.initial),lintErrors:0,lintWarnings:55};
if(assertions.s4Records!==13||assertions.b4Records!==76||!assertions.exactRestore||Object.entries(assertions).some(([k,v])=>k.startsWith('b4No')&&v!==true))throw Error('Observation assertions failed');
save('assertions.json',assertions);
for(const [label,ref] of [['pages',pages],['controls',menus],['matrix',matrix],['search',search],['final',final]]){
 const dirs={pages:'pages-candidate-1',controls:'controls-candidate-1',matrix:'controls-candidate-2',search:'static-candidate-1',final:'static-candidate-3'};
 const p=`.cache/cis-navigation-20261016/${dirs[label]}/source/dist/build-info.json`;
 const info=json(p);if(info.sourceCommit!==ref)throw Error(`Build identity ${label}`);save(`build-info-${label}.json`,info);
}
const inventory=[];function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name!=='evidence-manifest.json')inventory.push({path:p.slice(out.length+1).replaceAll('\\','/'),bytes:statSync(p).size,sha256:sha(readFileSync(p))});}}walk(out);save('evidence-manifest.json',{files:inventory,bytes:inventory.reduce((s,x)=>s+x.bytes,0),note:'Logical file bytes; not physical disk allocation. Review sheets are contact sheets only; original captures retained.'});
console.log(JSON.stringify({out,...assertions,bytes:inventory.reduce((s,x)=>s+x.bytes,0)}));
