import type { SourceSummary, SourcesGateway } from '../data/sources';
import { demoSourceContent } from './sourceContent';
import { reportCrmDateMetricCount } from './sourceMetrics';
export const rewedoSourceId = 'source-demo-rewedo-versions';
const base = { platform: 'SQL Server', layer: 'Без слоя', objectType: 'Table', domain: 'Продажи и маркетинг', metrics: 0, mcp: 0 };
/** First three metadata examples are from source00:52; unknown flags stay unknown. */
const reference: readonly SourceSummary[] = [
  { ...base, id:'source-reportcrm-date', technicalName:'reportcrm20.dbo.dimdate', storageContext:'Reportcrm20', columns:34, analyst:'Лапова Юлия Владимировна', usedInAnalytics:true, reports:84, metrics:reportCrmDateMetricCount, lineage:0, views:22, provenance:'reference' },
  { ...base, id:'source-dwh-date', technicalName:'dwh2crm.ref.dimdate', storageContext:'Dwh2Crm', columns:33, analyst:'Лапова Юлия Владимировна', usedInAnalytics:true, reports:47, lineage:8, views:3, provenance:'reference' },
  { ...base, id:'source-dwh-project', technicalName:'dwh2crm.tableau.проект', storageContext:'Dwh2Crm', columns:20, analyst:'Лапова Юлия Владимировна', usedInAnalytics:true, reports:36, lineage:53, views:6, provenance:'reference' },
];
/** Figma's five demo rows. Supplemental flags/master labels are authored examples for exercising the agreed filters, not production facts. */
const demo: readonly SourceSummary[] = [
  { ...base, id:'source-demo-clients', technicalName:'demo.crm.clients', storageContext:'Demo', description:'Демонстрационный источник для проверки макета', columns:12, reports:0, lineage:0, views:0, usedInAnalytics:false, masterSystem:'Демо CRM', personalData:true, similarSources:true, provenance:'demo' },
  { ...base, id:'source-demo-contracts', technicalName:'demo.crm.contracts', storageContext:'Demo', description:'Демонстрационный источник для проверки макета', columns:18, reports:0, lineage:0, views:0, usedInAnalytics:false, masterSystem:'Демо CRM', personalData:true, similarSources:false, provenance:'demo' },
  { ...base, id:'source-demo-sales', technicalName:'demo.crm.sales', storageContext:'Demo', description:'Демонстрационный источник для проверки макета', columns:24, reports:0, lineage:0, views:0, usedInAnalytics:false, masterSystem:'Демо CRM', personalData:false, similarSources:true, provenance:'demo' },
  { ...base, id:'source-demo-requests', technicalName:'demo.service.requests', storageContext:'Demo', description:'Демонстрационный источник для проверки макета', domain:'Гостеприимство', columns:15, reports:0, lineage:0, views:0, usedInAnalytics:false, masterSystem:'Демо сервис', personalData:true, similarSources:false, provenance:'demo' },
  { ...base, id:'source-demo-feedback', technicalName:'demo.service.feedback', storageContext:'Demo', description:'Демонстрационный источник для проверки макета', domain:'Гостеприимство', columns:10, reports:0, lineage:0, views:0, usedInAnalytics:false, masterSystem:'Демо сервис', personalData:false, similarSources:false, provenance:'demo' },
];
const rewedo:SourceSummary = { id:rewedoSourceId,technicalName:'rewedo_crm_production.public.versions',platform:'PostgreSQL',layer:'Без слоя',storageContext:'Amocrm Rerooms',objectType:'Table',columns:8,domain:'Продажи и маркетинг',masterSystem:'CRM (CRM Dynamics)',analyst:'Лапова Юлия Владимировна',reports:0,metrics:0,mcp:0,similarSources:false,provenance:'demo' };
// Demonstration hierarchy for existing catalog IDs. It is independent of the technical-name format.
const treePaths: Record<string, readonly string[]> = {
  'source-reportcrm-date': ['Reportcrm20', 'dbo'],
  'source-dwh-date': ['Dwh2Crm', 'ref'],
  'source-dwh-project': ['Dwh2Crm', 'tableau'],
  'source-demo-clients': ['Demo', 'crm'],
  'source-demo-contracts': ['Demo', 'crm'],
  'source-demo-sales': ['Demo', 'crm'],
  'source-demo-requests': ['Demo', 'service'],
  'source-demo-feedback': ['Demo', 'service'],
  [rewedoSourceId]: ['Amocrm Rerooms', 'rewedo_crm_production', 'public'],
};
const records:readonly SourceSummary[] = [...reference, ...demo, rewedo].map(source=>{
  const content=demoSourceContent[source.id];
  const treePath=treePaths[source.id];
  if(!content)return {...source,treePath};
  const demoAttributes:NonNullable<SourceSummary['demoAttributes']>[number][]=['description'];
  if(!source.masterSystem)demoAttributes.push('masterSystem');
  if(!source.analyst)demoAttributes.push('analyst');
  return {...source,description:content.description,masterSystem:source.masterSystem??content.masterSystem,analyst:source.analyst??content.analyst,demoAttributes,treePath};
});
export const demoSourcesGateway: SourcesGateway = { list: () => records };
