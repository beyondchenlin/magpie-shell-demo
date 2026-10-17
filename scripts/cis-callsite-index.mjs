import ts from 'typescript';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = resolve(process.argv[2] || process.cwd());
const outputPath = resolve(process.argv[3] || 'docs/cis/component-call-sites.json');
const controls = new Set(['PrefRow','TextBtn','WordsField','LibSwitch','Tick','PrefPick','FieldPill','Fold','FoldChev','StatusToast','ActionConfirm','Segs','useSegThumb','CopyButton','MagpieIcon','PluginLogo','ModelPop','ProtoMultiMenu','AgentModelsPop','PopoverPortal','useAnchoredPopover','useRowMenu','useProtocolMenu','SidebarTabs','ConnectionField','RequestArchive','InfoTip']);
const files = [];
function walk(dir) {
  for (const e of readdirSync(dir, {withFileTypes:true})) {
    const path = join(dir,e.name);
    if (e.isDirectory()) walk(path);
    else if (/\.tsx?$/.test(e.name)) files.push(path);
  }
}
walk(join(root,'src'));
const entries=[];
const raw=[];
const hashes=[];
for(const path of files) {
  const text=readFileSync(path,'utf8');
  const file=relative(root,path).replaceAll('\\','/');
  const sf=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,path.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const imports=new Map();
  for(const s of sf.statements) if(ts.isImportDeclaration(s)) {
    const bind=s.importClause?.namedBindings;
    if(bind&&ts.isNamedImports(bind)) for(const e of bind.elements) imports.set(e.name.text, {name:e.propertyName?.text||e.name.text, module:s.moduleSpecifier.text});
  }
  let hasEntry=false;
  const visit=node=>{
    if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)) {
      const local=node.tagName.getText(sf);
      const imp=imports.get(local);
      const name=imp?.name||local;
      const line=sf.getLineAndCharacterOfPosition(node.getStart(sf)).line+1;
      const attrs=Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).filter(a=>/^(className|variant|kind|id|wrapVal|data.*|aria-.*|live|keepOpen|modelPicker|align|preferUp)$/.test(a.name.getText(sf))).map(a=>[a.name.getText(sf),(a.initializer?.getText(sf)||'true').slice(0,200)]));
      if(controls.has(name)) {entries.push({control:name,file,line,local,import:imp?.module,attributes:attrs});hasEntry=true;}
      if(/^[a-z]/.test(local)&&Object.entries(attrs).some(([k,v])=>k==='className'&&/(?:^|[\s"'`])(?:row pref|segs|lib-switch|tick|pref-pick|field|fold|copy|proto-menu|row-menu|words|action-confirm)(?=[\s"'`$}]|$)/.test(v))) raw.push({tag:local,file,line,className:attrs.className});
    }
    if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)) {
      const local=node.expression.text;
      const name=imports.get(local)?.name||local;
      if(controls.has(name)&&name.startsWith('use')) {entries.push({control:name,file,line:sf.getLineAndCharacterOfPosition(node.getStart(sf)).line+1,local,import:imports.get(local)?.module});hasEntry=true;}
    }
    ts.forEachChild(node,visit);
  };
  visit(sf);
  if(hasEntry) hashes.push({file,sha256:createHash('sha256').update(text.replace(/\r\n/g,'\n')).digest('hex')});
}
const output={purpose:'Audit index only; a call site is not proof of correct runtime behavior. Raw DOM is a review queue, not an automatic defect.',baseline:'e94edc6713da405285854e7d6548f3f8364bf84f',specification:'028dab55a3877656c115439835d1d0d14465e4ee',candidate:process.argv[4] || execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'committed source snapshot, excludes inherited working-tree draft',files:hashes,counts:Object.fromEntries([...controls].map(c=>[c,entries.filter(e=>e.control===c).length])),callSites:entries,rawRecipeCandidates:raw};
writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({files:hashes.length,callSites:entries.length,rawRecipeCandidates:raw.length,counts:output.counts}));
