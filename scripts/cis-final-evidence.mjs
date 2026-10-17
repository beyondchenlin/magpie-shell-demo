import {readFileSync,writeFileSync,mkdirSync,cpSync,readdirSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import postcss from 'postcss';
const candidate='5f7f9bc0b7da8efaacbb6ae0b5e15587538a240c';
const previous='a8976e0db339d520a290cbdd548c290be760797b';
const dir='.cache/cis-navigation-20261016/final-candidate-1/source';
const raw='.cache/cis-final-20261017',out='interactions/cis-final-5f7f9bc';
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const save=(name,v)=>writeFileSync(join(out,name),JSON.stringify(v,null,2)+'\n');
mkdirSync(out,{recursive:true});
for(const name of readdirSync(raw))if(/\.(json|png|txt)$/.test(name))cpSync(join(raw,name),join(out,name));
cpSync('.cache/cis-controls-20261017/bridge-before.json',join(out,'bridge-before.json'));
cpSync('.cache/cis-controls-20261017/preferences-before-205.json',join(out,'preferences-before-205.json'));
const build=json(join(dir,'dist/build-info.json'));
if(build.sourceCommit!==candidate)throw Error('Wrong build');
save('build-info.json',build);
const artifacts=build.artifacts.map(a=>({...a,actualSha256:sha(readFileSync(join(dir,'dist',a.path)))}));
if(artifacts.some(a=>a.actualSha256!==a.sha256))throw Error('Production artifacts changed');
save('artifact-check.json',{candidate,checkedAt:new Date().toISOString(),artifacts,extra:'Explicit preference-restoration HTML added after build; production artifacts above unchanged.'});
const manifest=json('docs/cis/source-manifest.json');
const css=manifest.files.map(f=>({...f,actual:sha(readFileSync(join(dir,f.file),'utf8').replace(/\r\n/g,'\n'))}));
if(css.some(f=>f.actual!==f.sha256))throw Error('Native stylesheet changed');
save('native-css-check.json',{candidate,pinned:manifest.commit,normalization:manifest.normalization,files:css});
const groups={
 frame:{CAUSE:'Native owns an OS window; Web preview needs an explicit bounded root canvas.',kept:'R17 approved 752×652 / 1100×720, zoom and phone variants; size independent of side state.',changed:'Only Web canvas/root/foot positioning and outer background.',source:'CIS R17/R19; explicit user window contract',evidence:'main-flow.json; cis-nav-2660400; cis-layout-0a2a014'},
 windows:{CAUSE:'Browser has no native Windows caption and native selectors exclude body.web.',kept:'Native Windows font/chrome/brand rules.',changed:'32px simulated OS caption, mirrored Windows selectors, sidebar offset under caption.',source:'layout.js:16; app.css:108–111/184/187/347; CIS R17',evidence:'main-flow.json three equal caption/root pairs; agents-side/settings-side/gateway-side PNGs'},
 nav:{CAUSE:'Native fixed header/sidebar uses window coordinates; Web root is framed.',kept:'SIDE_AT1024, native thumb tokens and native 320ms controller.',changed:'Root-relative sidebar/header/tool positioning and overflow/wrapping.',source:'CIS R16/R17/R19; app.js fitTop/layoutNav',evidence:'main-flow.json; cis-layout-0a2a014; cis-nav-2660400'},
 settings:{CAUSE:'React anchor and framed header add wrappers to native Settings DOM.',kept:'Native PrefRow/font/word and language recipes, no double 45% cap.',changed:'min-width bridges, header positioning, anchor max-width and tab wrapping.',source:'CIS R01/R07/R21; app.css:3176–3205',evidence:'cis-settings-90099b9; cis-layout-0a2a014; main-flow.json'},
 gateway:{CAUSE:'Long mock identifiers and code live in a framed Web window.',kept:'Native Connect columns and field geometry.',changed:'Hint word breaking and snippet-tab alignment only.',source:'CIS R22/R19',evidence:'cis-layout-0a2a014; gateway-side.png; gateway-390.png'},
 overlays:{CAUSE:'Native appends overlays to window body; React portals target framed root.',kept:'Native menu/dialog visual CSS and distinct lifecycle per R11–R13.',changed:'Root positioning/stacking, framed top-layer dialog scrim; old nonmatching anchor descendant selectors retained dormant.',source:'CIS R11–R13/R18; app.js placeMenu/placePop/confirmAction',evidence:'cis-confirm-7880135; cis-menus-862789f; cis-controls-a8976e0'},
 thumbs:{CAUSE:'Shared React thumb nodes must receive native selected surfaces.',kept:'Native card/seg-thumb/seg-edge values, useSegThumb positioning.',changed:'Duplicate native selected-surface declarations under Web wrapper.',source:'app.css:227–238/2878–2900; CIS R02/R17',evidence:'cis-nav-2660400; cis-layout-0a2a014; main-flow.json'},
 mobile:{CAUSE:'Web phone viewport must keep existing mock controls usable.',kept:'Native phoneWeb media gate and R19 touch sizes; not native desktop gold.',changed:'Viewport-specific wrapping, local horizontal scrolling, one-column cards and editor bounds.',source:'CIS R19 frozen Web compatibility scope',evidence:'cis-controls-a8976e0 B4; 390-light-network/context; gateway-390.png'},
 motion:{CAUSE:'Shared wrappers need native sort/chevron/reduced-motion behavior.',kept:'Native transition values and user reduced-motion suppression.',changed:'Duplicate motion declarations and suppression selectors for React compounds.',source:'app.css:651/697/709/3653 and global reduce block; CIS R02/R03/R19',evidence:'cis-confirm-7880135 provider sort; cis-menus-396c11c; source comparison'},
 images:{CAUSE:'Native icon wrapper sizes an image supplied by React.',kept:'Original image resources and native contextual sizes.',changed:'Image fills its existing icon box; no replacement glyph or palette.',source:'app.css .ic and specific icon contexts; CIS R15',evidence:'cis-controls-a8976e0 explicit light/dark icon fixture; B4'},
 tick:{CAUSE:'Native Tick is used outside .editor in the React mock.',kept:'Native checkbox rendering and 7px label layout.',changed:'Extends native label layout to shared Tick callers; no checkbox re-paint.',source:'app.css:3613–3614/4064–4081; CIS R06',evidence:'cis-controls-a8976e0 Tick states/focus; C3'},
 helpers:{CAUSE:'Native imperative DOM/inline styles need bounded React equivalents.',kept:'Native grid, form, hidden-state and text semantics.',changed:'Detect columns custom property; sheet hidden/display; full-width form input; wrapper display:contents; contextual error color.',source:'app.js detect-grid/field; native editor/sync form recipes; CIS R01/R04/R23–R25',evidence:'cis-confirm-7880135; cis-pages-1100d15; S4 Export cancel; raw recipe classification'},
 boundedDemo:{CAUSE:'Mock reuses panel/profile UI or shows an illustrative routing graphic.',kept:'Frozen mock-only behavior and native source recipe.',changed:'Unmapped panel canvas; hide redundant naming hint in main-window profile reuse; decorative graphic does not intercept pointer.',source:'app.css:1738; App panel visibility and mock routing view; R08 bounded tray scope',evidence:'source only for excluded tray; default main B4 and frozen scope boundary'},
};
function classify(r){const s=r.selector;let p=r.parent;const ats=[];while(p&&p.type!=='root'){if(p.type==='atrule')ats.push(`@${p.name} ${p.params}`);p=p.parent;}const media=ats.join(' ');
 if(/win-caption|win-cap|data-sim-platform|\.side-top/.test(s))return 'windows';
 if(/action-confirm|pref-anchor|data-anchored|pop\.row-menu|body\.web \.pop|body\.web \.modal/.test(s))return 'overlays';
 if(/^(html|body$|#root$|:root)|^body\.web(?: #root|$)/.test(s))return 'frame';
 if(/max-width|pointer: coarse/.test(media))return 'mobile';
 if(/prefers-reduced-motion/.test(media)||/sorting|ag-install-head/.test(s))return 'motion';
 if(/#view-settings/.test(s))return 'settings';
 if(/connect/.test(s))return 'gateway';
 if(/sideToggle|side-toggle|sidebar|side-nav|\.top/.test(s))return 'nav';
 if(/thumb/.test(s))return 'thumbs';
 if(/\.ic img/.test(s))return 'images';
 if(/label\.tick/.test(s))return 'tick';
 if(/detect-grid|sheet|words\.full|hint\.err|disabled-model|search-vendor|display-contents|\[hidden\]/.test(s))return 'helpers';
 if(/panel-unmapped|profiles\.naming|rt-flier-demo/.test(s))return 'boundedDemo';
 if(/body\.web \.foot/.test(s))return 'frame';
 return 'unclassified';
}
const patch=readFileSync(join(dir,'src/styles/shell-patch.css'),'utf8'),rules=[];
postcss.parse(patch).walkRules(r=>rules.push({line:r.source.start.line,selector:r.selector,atRule:r.parent.type==='atrule'?`@${r.parent.name} ${r.parent.params}`:null,group:classify(r),declarations:r.nodes.filter(n=>n.type==='decl').map(n=>({property:n.prop,value:n.value,important:!!n.important}))}));
if(rules.some(r=>r.group==='unclassified'))throw Error('Unclassified bridge selectors: '+rules.filter(r=>r.group==='unclassified').map(r=>r.selector).join(' | '));
save('compatibility-inventory.json',{candidate,file:'src/styles/shell-patch.css',blob:git('rev-parse',`${candidate}:src/styles/shell-patch.css`),sha256:sha(patch),groups,rules,unclassified:0,removed:[{selector:'.range-menu .pm-head',native:'app.css:2581; padding6 8 5/font11',proof:'bridge-before.json / bridge-after.json'},{selector:'.ctx-tune-note',native:'app.css reset margin0 + context.css:298 padding; fixed context.js:1142 creates p',sourceUrl:'https://raw.githubusercontent.com/yetone/magpie/63be47717a9ca91fc89102078a1f1fff3e03e0ce/internal/gui/assets/context.js',proof:'bridge-before.json / bridge-after.json; eight affected B4 defaults'},{selector:'.github-token-input / .update-mirror-input',native:'app.js:18898/20112 uses plain words class sizing, no arbitrary160/180',proof:'bridge-after.json 240px/min0'},{selector:'.row.pref.redact-kind / .hint.fade / #view-routing .rt-act.enter',native:'No extra fade/rtin recipe in pinned source; rtin has no native keyframe',proof:'Source removal; ten redaction rows animation none/opacity1. No runtime claim for inactive hint/rtin.'}]});
const flow=json(join(raw,'main-flow.json')), restored=json(join(raw,'preferences-restored.json'));
const info={candidate,sourceTree:build.sourceTree,version:build.version,origin:'http://127.0.0.1:4176',previewSession:70571,localOnly:true,browser:'Windows / Codex in-app Chromium, DPR1, Chinese; desktop110%, phone100%; dimensions and theme per record',build:'tsc -b + Vite succeeded before build-info was written; no subsequent source change. Existing >500kB bundle warning retained.',lint:{errors:0,warnings:(readFileSync(join(raw,'lint.txt'),'utf8').match(/: warning /g)||[]).length,files:56,baselineWarnings:59},guards:{chrome:true,cis:true},mainRecords:flow.main.length,threeTogglePairs:flow.pairs,allSourcesMatch:flow.main.every(x=>x.source===candidate),allDocumentFits:flow.main.every(x=>x.documentWidth.client===x.documentWidth.scroll),noBrokenImages:flow.main.every(x=>!x.brokenImages.length),noInvalidNesting:flow.main.every(x=>x.invalidNesting===0),consoleWarningsErrors:flow.logs,restoredKeys:Object.keys(restored.current).length,exactRestore:JSON.stringify(restored.current)===JSON.stringify(restored.initial),nativeStyleMatches:6,compatibilityRules:rules.length,compatibilityUnknown:0};
if(!info.allSourcesMatch||!info.allDocumentFits||!info.noBrokenImages||!info.noInvalidNesting||!info.exactRestore||info.lint.warnings>59||flow.logs.length)throw Error('Final assertion failure');
save('assertions.json',info);
const changed=git('diff','--name-only',previous,candidate,'--','src').split('\n').filter(Boolean);
save('reuse-to-final.json',{previous,candidate,changedSourceFiles:changed,meaning:'Only shell-patch CSS changes after a897; all TS/TSX and six native CSS blobs identical. Removed selectors affect eight B4 default states and date/input/redaction deep entries only. Those were observed on final. No claim old screenshots were captured on final.',unchangedSourceFiles:git('ls-tree','-r','--name-only',candidate,'--','src').split('\n').filter(p=>!changed.includes(p)).map(path=>({path,previousBlob:git('rev-parse',`${previous}:${path}`),finalBlob:git('rev-parse',`${candidate}:${path}`)})),b4Supplement:flow.context.map(x=>({config:x.config,key:x.key,source:x.source,evidence:`${x.config.id}-${x.key==='context'?'context':'network'}.png`})),baseB4:'../cis-controls-a8976e0/b4/records-final.json',combinedB4:76});
const inventory=[];function walk(d){for(const e of readdirSync(d,{withFileTypes:true})){const p=join(d,e.name);if(e.isDirectory())walk(p);else if(e.name!=='evidence-manifest.json')inventory.push({path:p.slice(out.length+1).replaceAll('\\','/'),bytes:statSync(p).size,sha256:sha(readFileSync(p))});}}walk(out);save('evidence-manifest.json',{files:inventory,bytes:inventory.reduce((a,b)=>a+b.bytes,0)});
console.log(JSON.stringify(info));
