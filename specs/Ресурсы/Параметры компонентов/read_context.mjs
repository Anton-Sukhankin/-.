import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

const args=process.argv.slice(2);
function option(name){const i=args.indexOf(name);if(i<0)return undefined;if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Missing value for '+name);return args[i+1];}
const file=option('--file');if(!file)throw Error('Pass --file and a selected YAML variant or JSON pointer.');
const text=await fs.readFile(file,'utf8');
const identity={file:path.basename(file),sha256:createHash('sha256').update(text).digest('hex')};
function pointer(value,p){
 if(p==='')return value;
 if(!p.startsWith('/'))throw Error('JSON pointer must start with /.');
 for(const raw of p.slice(1).split('/')){
  const key=raw.replaceAll('~1','/').replaceAll('~0','~');
  if(value===null||typeof value!=='object'||!Object.hasOwn(value,key))throw Error('Pointer not found: '+p);
  value=value[key];
 }
 return value;
}
let output;
if(path.extname(file).toLowerCase()==='.json'){
 const p=option('--pointer');if(p===undefined)throw Error('Pass --pointer for JSON; whole-file output is not the default.');
 let value=pointer(JSON.parse(text),p);
 const field=option('--field'),equals=option('--equals');
 if(field!==undefined||equals!==undefined){
  if(!field||equals===undefined||!Array.isArray(value))throw Error('--field and --equals require an array selected by --pointer.');
  const matches=value.filter(x=>x!==null&&typeof x==='object'&&Object.hasOwn(x,field)&&String(x[field])===equals);
  if(matches.length!==1)throw Error('Expected one matching record, got '+matches.length+'. Narrow the pointer or choose an exact ID.');
  value=matches[0];
 }
 output={source:identity,pointer:p,...(field?{selection:{field,equals}}:{}),value};
}else if(['.yaml','.yml'].includes(path.extname(file).toLowerCase())){
 const runtime=option('--runtime');if(!runtime)throw Error('Pass --runtime with the existing yaml library.');
 const require=createRequire(path.resolve(runtime,'package.json'));
 const doc=require('yaml').parseDocument(text,{version:'1.2',schema:'core',uniqueKeys:true,strict:true});
 if(doc.errors.length||doc.warnings.length)throw Error([...doc.errors,...doc.warnings].map(x=>x.message).join('; '));
 const model=doc.toJS({maxAliasCount:100}),variant=option('--variant'),state=option('--state');
 if(!model.base?.parameters||!variant||!Object.hasOwn(model.variants||{},variant))throw Error('Choose an existing --variant from the component contract.');
 const v=model.variants[variant];
 if(state&&!Object.hasOwn(v.states||{},state))throw Error('Unknown state for selected variant: '+state);
 const layers=[['base',model.base],['variant:'+variant,v],...(state?[['state:'+state,v.states[state]]]:[])];
 const parameters={},parameterOrigins={},sources=new Set();
 for(const [name,layer]of layers){
  for(const ref of layer.sourceRefs||[])sources.add(ref);
  for(const [key,value]of Object.entries(layer.parameters||{})){
   parameters[key]=value;parameterOrigins[key]={layer:name,sourceRefs:value.sourceRefs||layer.sourceRefs||[]};
  }
 }
 const keys=option('--keys')?.split(',');
 if(keys)for(const key of keys)if(!Object.hasOwn(parameters,key))throw Error('Unknown selected parameter: '+key);
 const selected=keys?Object.fromEntries(keys.map(k=>[k,parameters[k]])):parameters;
 const tokens={};
 for(const [key,value]of Object.entries(selected)){
  for(const ref of parameterOrigins[key].sourceRefs)sources.add(ref);
  if(value.type==='token'){
   const token=model.tokens?.[value.ref];if(!token)throw Error('Missing token definition: '+value.ref);
   tokens[value.ref]=token;sources.add(token.sourceRef);
  }
 }
 const definitions={};for(const ref of sources){if(!Object.hasOwn(model.sources||{},ref))throw Error('Missing source: '+ref);definitions[ref]=model.sources[ref];}
 output={source:identity,schemaVersion:model.schemaVersion,component:model.component,
  selection:{variant,...(state?{state}:{}),...(keys?{keys}:{}),description:v.description},
  parameters:selected,parameterOrigins:Object.fromEntries(Object.keys(selected).map(k=>[k,parameterOrigins[k]])),
  tokens,sources:definitions,dependencies:model.dependencies||[],
  limits:'Read the Markdown contract for applicability, behavior and combined states. Token locators remain links to canonical definitions; this projection does not invent unresolved values or replace schema validation.'};
}else throw Error('Supported inputs: JSON and YAML.');
process.stdout.write(JSON.stringify(output,null,2)+'\n');
