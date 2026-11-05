import type { SourceDetailData, SourceDetailsGateway } from '../data/sourceDetails';
import { demoSourcesGateway, rewedoSourceId } from './sources';
import { demoSourceFields } from './sourceFields';
import { demoSourceContent } from './sourceContent';
export { rewedoSourceId } from './sources';
/** Approved Paper composition: historical technical metadata, six visible fields, and explicitly demo responsibility assignments. */
const rewedo:SourceDetailData = {
  sourceId:rewedoSourceId,technicalStatus:'Active',synchronizedLabel:'вчера, 23:48',
  domain:'Продажи и маркетинг',masterSystem:'CRM (CRM Dynamics)',analyst:'Лапова Юлия Владимировна',technicalOwner:'Ручнов Константин Михайлович',
  counts:{reports:0,metrics:0,mcp:0,similar:0},relatedReports:[],
  fields:[
    {name:'id',sqlType:'INTEGER',genericType:'NumberType',nullable:false,key:true,metricCount:0},
    {name:'item_type',sqlType:'VARCHAR',genericType:'StringType',nullable:false,key:false,metricCount:0},
    {name:'item_id',sqlType:'BIGINT',genericType:'NumberType',nullable:false,key:false,metricCount:0},
    {name:'event',sqlType:'VARCHAR',genericType:'StringType',nullable:false,key:false},
    {name:'whodunnit',sqlType:'VARCHAR',genericType:'StringType',nullable:true,key:false},
    {name:'object',sqlType:'TEXT',genericType:'StringType',nullable:true,key:false},
    {name:'created_at',sqlType:'TIMESTAMP',genericType:'DateTimeType',nullable:false,key:false},
    {name:'object_changes',sqlType:'TEXT',genericType:'StringType',nullable:true,key:false},
  ],
  provenance:{kind:'demo',reference:'Paper source detail approved 2026-11-04; completed demo schema by user request',fieldsPartial:false,demoFieldNames:['created_at','object_changes']},
};

const details = new Map<string,SourceDetailData>([[rewedoSourceId,rewedo]]);
for(const source of demoSourcesGateway.list()) {
  const fields=demoSourceFields[source.id];
  if(!fields)continue;
  details.set(source.id,{
    sourceId:source.id,domain:source.domain,masterSystem:source.masterSystem,analyst:source.analyst,technicalOwner:demoSourceContent[source.id]?.technicalOwner,
    fields,counts:{reports:source.reports,metrics:source.metrics,mcp:source.mcp,similar:source.similarSources===false?0:undefined},
    relatedReports:source.reports===0?[]:undefined,
    provenance:{kind:'demo',reference:'Source-specific demonstration schema approved for prototype 2026-11-04',fieldsPartial:false,demoFieldNames:fields.map(field=>field.name)},
  });
}
export const demoSourceDetailsGateway:SourceDetailsGateway = {read:id=>details.get(id)};
