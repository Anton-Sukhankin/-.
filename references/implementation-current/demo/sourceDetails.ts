import type { SourceDetailData, SourceDetailsGateway } from '../data/sourceDetails';
import { demoSourcesGateway, rewedoSourceId } from './sources';
import { demoSourceFields, reportCrmObservedFields } from './sourceFields';
import { demoSourceContent } from './sourceContent';
import { reportCrmDateReports, reportCrmDateSourceId } from './relatedSourceReports';
import { reportCrmDateMetrics } from './sourceMetrics';
export { rewedoSourceId } from './sources';

// SRC-32 shows these five report nodes linked to the calendar source.
const reportCrmDateLineageReports = [
  { id: 'mortgage-applications', title: 'Ипотечные заявки' },
  { id: 'month-results', title: 'Итоги месяца' },
  { id: 'ric-motivation', title: 'Калькулятор мотивации РИЦ' },
  { id: 'contact-center-metrics', title: 'Ключевые метрики КЦ' },
  { id: 'contact-center-indicators', title: 'Ключевые показатели КЦ' },
] satisfies NonNullable<SourceDetailData['lineageReports']>;

// SRC-33 shows eight complete rows out of ten similar sources.
const reportCrmDateSimilarSources = [
  { technicalName: 'dwh2crm.material.visiology_инструменты_оценщика_показатели', businessMetricCount: 5 },
  { technicalName: 'dwh2crm.visiology.онлайн_продажи', businessMetricCount: 4 },
  { technicalName: 'dwh2crm.dbo.отчет_планфакт_долякорпусов_vi_до_этапа', businessMetricCount: 2 },
  { technicalName: 'dwh2crm.tableau.договор', businessMetricCount: 2 },
  { technicalName: 'reportcrm20.model.продажи', businessMetricCount: 2 },
  { technicalName: 'dwh2crm.tableau.v_task', businessMetricCount: 1 },
  { technicalName: 'dwh2crm.tableau.объект недвижимости', businessMetricCount: 1 },
  { technicalName: 'reportcrm20.calculate.deadlines_rpt', businessMetricCount: 1 },
] satisfies NonNullable<SourceDetailData['similarSources']>;

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
  const isReportCrmDate = source.id === reportCrmDateSourceId;
  const demoFields = isReportCrmDate ? fields.slice(reportCrmObservedFields.length) : fields;
  details.set(source.id,{
    sourceId:source.id,domain:source.domain,masterSystem:source.masterSystem,analyst:source.analyst,technicalOwner:demoSourceContent[source.id]?.technicalOwner,
    aboutMetadata:isReportCrmDate ? {technicalStatus:'Active'} : undefined,
    synchronizedLabel:isReportCrmDate ? 'вчера, 00:00' : undefined,
    fields,counts:{reports:source.reports,metrics:source.metrics,mcp:source.mcp,similar:isReportCrmDate?10:source.similarSources===false?0:undefined},
    relatedReports:isReportCrmDate ? reportCrmDateReports : source.reports===0 ? [] : undefined,
    relatedMetrics:isReportCrmDate ? reportCrmDateMetrics : source.metrics===0 ? [] : undefined,
    lineageReports:isReportCrmDate ? reportCrmDateLineageReports : undefined,
    similarSources:isReportCrmDate ? reportCrmDateSimilarSources : undefined,
    provenance:{kind:'demo',reference:isReportCrmDate ? 'SRC-17, SRC-18, SRC-28, SRC-31 and SRC-34; remaining fields are prototype examples' : 'Source-specific demonstration schema approved for prototype 2026-11-04',fieldsPartial:false,demoFieldNames:demoFields.map(field=>field.name)},
  });
}
export const demoSourceDetailsGateway:SourceDetailsGateway = {read:id=>details.get(id)};
