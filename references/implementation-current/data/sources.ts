import { catalogSearchPage } from './catalogSearch';
import { listPageSize } from './pagination';

/** Catalog metadata, separate from DataHub entries in a report's Sources tab. */
export interface SourceSummary {
  id: string; technicalName: string; platform: string; layer: string; storageContext: string;
  description?: string; objectType: string; columns: number; domain: string; analyst?: string;
  usedInAnalytics?: boolean; masterSystem?: string; personalData?: boolean; similarSources?: boolean;
  reports: number; metrics: number; lineage?: number; mcp: number; views?: number;
  provenance: 'reference' | 'demo';
  /** Explicit ancestor labels below the platform in the catalog tree. */
  treePath?: readonly string[];
  /** Authored additions to an otherwise historical metadata example. */
  demoAttributes?:readonly ('description'|'masterSystem'|'analyst')[];
}
export interface SourcesGateway { list(): readonly SourceSummary[] }

export type SourceCatalogView = 'list' | 'cards' | 'tree';

export function readSourceCatalogView(value: string | null): SourceCatalogView {
  return value === 'cards' || value === 'tree' ? value : 'list';
}

export function sourceCatalogPage(records: readonly SourceSummary[], params: URLSearchParams, searchTarget?: string) {
  const applied = readSourceFilters(params, records);
  const requested = Number(params.get('sourcePage') ?? 0);
  const pageSize = listPageSize;
  const filteredRows = filterSources(records, applied);
  return { ...catalogSearchPage(filteredRows, records, Number.isSafeInteger(requested) ? requested : 0, pageSize, searchTarget), applied, filteredRows };
}
export const sourceAttributes = ['platform', 'domain', 'masterSystem', 'layer', 'personalData', 'description', 'analytics', 'similar'] as const;
export type SourceAttribute = typeof sourceAttributes[number];
export type SourceFilters = Partial<Record<SourceAttribute, readonly string[]>>;
export const sourceLabels: Record<SourceAttribute, string> = {
  platform: 'Платформа', domain: 'Домен', masterSystem: 'Мастер-система', layer: 'Слой данных',
  personalData: 'ПДн', description: 'Описание', analytics: 'В аналитике', similar: 'Похожие источники',
};
export const sourceColumns = [
  { label: 'Источник', attributes: ['platform', 'layer'] }, { label: 'Описание', attributes: ['description'] },
  { label: 'Тип объекта', attributes: [] }, { label: 'Колонки', attributes: [] }, { label: 'Домен', attributes: ['domain'] },
  { label: 'Ответственный аналитик', attributes: [] }, { label: 'В аналитике', attributes: ['analytics'] },
  { label: 'Отчёты', attributes: [] }, { label: 'Метрики', attributes: [] }, { label: 'Lineage', attributes: [] },
  { label: 'MCP', attributes: [] }, { label: 'Просмотры', attributes: [] },
] as const satisfies readonly { label: string; attributes: readonly SourceAttribute[] }[];
export function sourceValue(row: SourceSummary, attribute: SourceAttribute): string | undefined {
  if (attribute === 'personalData') return row.personalData === undefined ? undefined : row.personalData ? 'yes' : 'no';
  if (attribute === 'description') return row.description?.trim() ? 'yes' : 'no';
  if (attribute === 'analytics') return row.usedInAnalytics === undefined ? undefined : row.usedInAnalytics ? 'yes' : 'no';
  if (attribute === 'similar') return row.similarSources === undefined ? undefined : row.similarSources ? 'yes' : 'no';
  return row[attribute];
}
export function sourceOptions(rows: readonly SourceSummary[], attribute: SourceAttribute) {
  if (attribute === 'personalData') return [{ value: 'yes', label: 'С ПДн' }, { value: 'no', label: 'Без ПДн' }];
  if (attribute === 'description') return [{ value: 'yes', label: 'С описанием' }, { value: 'no', label: 'Без описания' }];
  // The reference provides a positive toggle/button, not an inverse condition.
  if (attribute === 'analytics') return [{ value: 'yes', label: 'Используется в аналитике' }];
  if (attribute === 'similar') return [{ value: 'yes', label: 'Есть похожие источники' }];
  return [...new Set(rows.map(row => sourceValue(row, attribute)).filter((value): value is string => Boolean(value)))].sort((a,b) => a.localeCompare(b, 'ru')).map(value => ({ value, label: value }));
}
export const isSingleSourceAttribute = (id: SourceAttribute) => ['personalData', 'description', 'analytics', 'similar'].includes(id);
export function filterSources(rows: readonly SourceSummary[], filters: SourceFilters) {
  return rows.filter(row => sourceAttributes.every(id => !filters[id]?.length || filters[id]!.includes(sourceValue(row, id) ?? '\u0000')));
}
export const sourceFilterCount = (filters: SourceFilters) => sourceAttributes.filter(id => filters[id]?.length).length;
export function sourceFiltersEqual(a: SourceFilters, b: SourceFilters) {
  return sourceAttributes.every(id => (a[id]?.length ?? 0) === (b[id]?.length ?? 0) && (a[id] ?? []).every(value => b[id]?.includes(value)));
}
export function toggleSourceFilter(filters: SourceFilters, id: SourceAttribute, value: string): SourceFilters {
  const current = filters[id] ?? [];
  const next = current.includes(value) ? current.filter(item => item !== value) : isSingleSourceAttribute(id) ? [value] : [...current, value];
  return { ...filters, [id]: next.length ? next : undefined };
}
export function readSourceFilters(params: URLSearchParams, rows: readonly SourceSummary[]): SourceFilters {
  const filters: SourceFilters = {};
  for (const id of sourceAttributes) {
    const allowed = new Set(sourceOptions(rows, id).map(option => option.value));
    const values = [...new Set(params.getAll(`source.${id}`))].filter(value => allowed.has(value));
    if (values.length) filters[id] = isSingleSourceAttribute(id) ? values.slice(0,1) : values;
  }
  return filters;
}
export function writeSourceFilters(params: URLSearchParams, filters: SourceFilters) {
  const next = new URLSearchParams(params);
  for (const id of sourceAttributes) { next.delete(`source.${id}`); for (const value of filters[id] ?? []) next.append(`source.${id}`, value); }
  next.delete('sourcePage');
  return next;
}

