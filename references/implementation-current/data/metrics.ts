import { catalogSearchItems } from './catalogSearch';
import { listPageSize, paginate } from './pagination';

/** UI-facing metric data; local demo keys are not inferred business IDs. */
export interface MetricSummary {
  id: string;
  title: string;
  description: string;
  type: 'Метрика' | 'Показатель';
  status: 'Черновик' | 'Проверена';
  domain: string;
  unit: string;
  updated: string;
}
export interface MetricPerson {
  name: string;
  role: string;
  description: string;
  placeholder?: boolean;
}
export interface MetricRelation {
  text: string;
  reportId?: string;
  metricId?: string;
}
export type MetricSectionBody =
  | { kind: 'prose'; text: string }
  | { kind: 'method'; columns: readonly [string, string]; rows: readonly (readonly [string, string])[] }
  | { kind: 'relations'; items: readonly MetricRelation[]; emptyText: string; detachable?: boolean }
  | { kind: 'question' };
export interface MetricDetailSection {
  id: string;
  title: string;
  description: string;
  body: MetricSectionBody;
}
export interface MetricDetailProfile {
  metricId: string;
  /** Visible identity from the content source; never substitute the routing key. */
  displayId?: string;
  provenance: { kind: 'figma' | 'demo'; reference: string };
  unitLabel: string;
  created: string;
  updated: string;
  people: readonly MetricPerson[];
  sections: readonly MetricDetailSection[];
}
export interface MetricsGateway {
  list(): readonly MetricSummary[];
  read(id: string): MetricSummary | undefined;
  readDetail(id: string): MetricDetailProfile | undefined;
}
export interface MetricCatalogState {
  view: 'cards' | 'list';
  type: string;
  status: string;
}
export function readMetricCatalogState(items: readonly MetricSummary[], params: URLSearchParams): MetricCatalogState {
  const type = params.get('metricType') ?? '';
  const status = params.get('metricStatus') ?? '';
  return {
    view: params.get('metricView') === 'cards' ? 'cards' : 'list',
    type: items.some(item => item.type === type) ? type : '',
    status: items.some(item => item.status === status) ? status : '',
  };
}

export function metricCatalogItems(items: readonly MetricSummary[], filters: MetricCatalogState, searchTarget?: string) {
  return catalogSearchItems(items, filterMetricCatalog(items, filters), searchTarget);
}

export function metricCatalogPage(items: readonly MetricSummary[], filters: MetricCatalogState, pageIndex: number, searchTarget?: string) {
  const { items: matching, outside } = metricCatalogItems(items, filters, searchTarget);
  const targetIndex = matching.findIndex(item => item.id === searchTarget);
  return { ...paginate(matching, targetIndex >= 0 ? Math.floor(targetIndex / listPageSize) : pageIndex), outside };
}
export function filterMetricCatalog(items: readonly MetricSummary[], filters: Pick<MetricCatalogState, 'type' | 'status'>): readonly MetricSummary[] {
  return items.filter(item => (!filters.type || item.type === filters.type) && (!filters.status || item.status === filters.status));
}


