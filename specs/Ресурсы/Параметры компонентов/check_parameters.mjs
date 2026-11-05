import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const dir=path.dirname(fileURLToPath(import.meta.url));
const argv=process.argv.slice(2),option=(key,fallback)=>{const i=argv.indexOf(key);return i<0?fallback:argv[i+1];};
if(!option('--root'))throw Error('Pass --root for the project or standalone package being checked.');
const root=path.resolve(option('--root'));
const runtime=option('--runtime',dir);
const require=createRequire(path.resolve(runtime,'package.json'));
const {parseDocument}=require('yaml'),Ajv=require('ajv');
const schema=JSON.parse(await fs.readFile(option('--schema',path.join(dir,'schemas/component-parameters.schema.json')),'utf8'));
const ajv=new Ajv({strict:true,allErrors:true,strictNumbers:true}),checkSchema=ajv.compile(schema);
function localFile(value){
 const full=path.resolve(root,value);
 if(full!==root&&!full.startsWith(root+path.sep))throw Error('Path leaves document root: '+value);
 return fs.stat(full).then(s=>{if(!s.isFile())throw Error('Expected file: '+value);}).catch(()=>{throw Error('Local document/resource unavailable: '+value);});
}
function refs(values,sources,where){for(const ref of values||[])if(!Object.hasOwn(sources,ref))throw Error('Unknown source '+ref+' at '+where);}
function effectiveType(v){return v.type==='token'?v.expectedType:v.type;}
export async function validateText(text){
 const doc=parseDocument(text,{version:'1.2',schema:'core',uniqueKeys:true,strict:true});
 if(doc.errors.length||doc.warnings.length)throw Error('YAML parse: '+[...doc.errors,...doc.warnings].map(e=>e.message).join('; '));
 const model=doc.toJS({maxAliasCount:100});
 if(!checkSchema(model))throw Error('Schema: '+ajv.errorsText(checkSchema.errors));
 await localFile(model.component.contract);
 for(const [id,source] of Object.entries(model.sources)){
  if(source.kind==='figma'){
   const url=new URL(source.uri),node=url.searchParams.get('node-id');
   if(!node||decodeURIComponent(node).replaceAll('-',':')!==source.nodeId.replaceAll('-',':'))throw Error('Figma node mismatch: '+id);
  }else await localFile(source.uri);
 }
 for(const [name,token] of Object.entries(model.tokens||{}))refs([token.sourceRef],model.sources,'token '+name);
 function layer(value,where,inherited={}){
  refs(value.sourceRefs,model.sources,where);
  const result={...inherited};
  for(const [name,param] of Object.entries(value.parameters||{})){
   refs(param.sourceRefs,model.sources,where+'.'+name);
   if(param.type==='token'){
    const token=model.tokens?.[param.ref];
    if(!token)throw Error('Unknown token '+param.ref);
    if(token.type!==param.expectedType)throw Error('Token type mismatch '+param.ref);
   }
   if(result[name]&&effectiveType(result[name])!==effectiveType(param))throw Error('Parameter type changed at '+where+'.'+name);
   result[name]=param;
  }
  return result;
 }
 const base=layer(model.base,'base');
 for(const [id,v] of Object.entries(model.variants)){
  const applied=layer(v,'variant '+id,base);
  for(const [state,values] of Object.entries(v.states||{}))layer(values,'variant '+id+'.state '+state,applied);
 }
 const ids=new Set();for(const dep of model.dependencies||[]){
  if(dep.id===model.component.id||ids.has(dep.id))throw Error('Duplicate or self dependency: '+dep.id);
  ids.add(dep.id);await localFile(dep.document);
 }
 return model;
}
const file=path.resolve(option('--file',path.join(dir,'examples/select-parameters.yaml')));
const original=await fs.readFile(file,'utf8');
await validateText(original);
if(argv.includes('--self-test')){
 const cases=[];
 const record=(name,passed,detail)=>cases.push({name,passed,detail});
 record('Positive example parsed with types and local source paths',true);
 const parsed=await validateText(original);
 record('Dimensions retain numeric value and px',parsed.base.parameters['control-height'].value===40&&parsed.base.parameters['control-height'].unit==='px');
 record('State booleans retain type',parsed.variants.wide.states.opened.parameters['dropdown-visible'].value===true);
 record('Literal Figma URL unchanged by validation',parsed.sources['source-field'].uri==='https://www.figma.com/design/lnOcWh4ElGkhppWe6Kn5AA?node-id=1310-38277');
 // Semantic transformations are generated through the real YAML serializer.
 const {stringify}=require('yaml');
 const changed=fn=>{const x=structuredClone(parsed);fn(x);return stringify(x);};
 const negatives={
  'numeric value encoded as string':changed(x=>x.base.parameters['control-height'].value='40'),
  'missing dimension unit':changed(x=>delete x.base.parameters['control-height'].unit),
  'unknown root property':changed(x=>x.hiddenCopyOfValues={height:40}),
  'unknown typed value property':changed(x=>x.base.parameters['control-height'].height=40),
  'unknown token':changed(x=>x.base.parameters['border-color'].ref='absent'),
  'wrong token kind':changed(x=>x.base.parameters['border-color'].expectedType='integer'),
  'unknown source reference':changed(x=>x.base.sourceRefs.push('absent')),
  'missing layer provenance':changed(x=>delete x.variants.narrow.sourceRefs),
  'Figma node mismatch':changed(x=>x.sources['source-field'].nodeId='999:999'),
  'missing contract file':changed(x=>x.component.contract='not-created/Contract.md'),
  'absolute local path':changed(x=>x.component.contract='C:/not-a-portable-path.md'),
  'path traversal':changed(x=>x.component.contract='../outside.md'),
  'non-finite number':changed(x=>x.base.parameters['control-height'].value=NaN),
  'wrong boolean type':changed(x=>x.variants.wide.states.opened.parameters['dropdown-visible'].value='true'),
  'state changes parameter type':changed(x=>x.variants.wide.states.opened.parameters['control-height']={type:'string',value:'40'}),
  'invalid color hex':changed(x=>x.base.parameters['text-color']={type:'color',format:'hex',value:'#xyz'}),
  'opacity outside range':changed(x=>x.base.parameters.opacity={type:'opacity',value:1.2}),
  'token duplicates canonical literal':changed(x=>x.tokens['field-border'].value='#D7E6F5'),
  'duplicate dependency':changed(x=>x.dependencies=[{id:'shared-source',document:x.component.contract,role:'external-owner'},{id:'shared-source',document:x.component.contract,role:'external-owner'}]),
  'duplicate YAML key':original.replace('schemaVersion: 1','schemaVersion: 1\nschemaVersion: 2'),
  'malformed indentation':original.replace('  title:','    title:'),
  'unquoted hex becomes null':original+'\n# mutation uses parsed fixture below\n'
 };
 negatives['unquoted hex becomes null']=changed(x=>x.base.parameters['text-color']={type:'color',format:'hex',value:'#AABBCC'}).replace(/value: ['"]?#AABBCC['"]?/, 'value: #AABBCC');
 for(const [name,text] of Object.entries(negatives)){
  if(text===original){record('Reject '+name,false,'Mutation did not change input');continue;}
  let rejected=false;try{await validateText(text);}catch{rejected=true;}
  record('Reject '+name,rejected);
 }
 const positives={
  'Exact sRGB preserves source decimals':changed(x=>x.base.parameters['source-rgb']={type:'color',format:'srgb',value:{r:.12,g:.13,b:.15,a:1}}),
  'Negative dimension allowed for documented offsets':changed(x=>x.base.parameters['overlap']={type:'dimension',value:-24,unit:'px'}),
  'Typed angle and relative unit':changed(x=>{x.base.parameters.rotation={type:'angle',value:180,unit:'deg'};x.base.parameters['relative-width']={type:'dimension',value:100,unit:'%'};})};
 for(const [name,text] of Object.entries(positives)){try{await validateText(text);record(name,true);}catch(e){record(name,false,e.message);}}
 const report={passed:cases.every(x=>x.passed),scope:'P2 schema syntax, type and reference checks only; no UI behavior or live Figma acceptance',
  libraries:{yaml:require('yaml/package.json').version,ajv:require('ajv/package.json').version},cases};
 const reportPath=option('--report');
 if(reportPath)await fs.writeFile(path.resolve(reportPath),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,checks:cases.length,failures:cases.filter(x=>!x.passed)},null,2));
 process.exitCode=report.passed?0:1;
}else console.log('YAML, schema and local/source references passed. Product/visual fidelity is not established by this check.');
