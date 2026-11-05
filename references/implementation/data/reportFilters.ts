import type { ReportTableRow } from './reportTable';

export const reportFilterColumns = ['title', 'mau', 'platform', 'domain', 'masterSystem', 'owner', 'lastViewed'] as const;
export type ReportFilterColumn = typeof reportFilterColumns[number];
export const reportFilterAttributes = [...reportFilterColumns, 'status'] as const;
export type ReportFilterAttribute = typeof reportFilterAttributes[number];
export type ReportNumericAttribute = 'mau' | 'lastViewed';
export type ReportDiscreteAttribute = Exclude<ReportFilterAttribute, ReportNumericAttribute>;
export interface ReportNumberRange { min?: number; max?: number }
export type ReportFilters = Partial<Record<ReportDiscreteAttribute, readonly string[]>> & Partial<Record<ReportNumericAttribute, ReportNumberRange>>;
export const mauThresholds = [10, 50, 100, 500] as const;
export function isReportNumericAttribute(attribute: ReportFilterAttribute): attribute is ReportNumericAttribute {
  return attribute === 'mau' || attribute === 'lastViewed';
}
export function hasReportRange(range?: ReportNumberRange) { return range?.min !== undefined || range?.max !== undefined; }
export function isReportRangeValid(range?: ReportNumberRange) {
  return !range || [range.min, range.max].every(value => value === undefined || Number.isSafeInteger(value) && value >= 0)
    && (range.min === undefined || range.max === undefined || range.min <= range.max);
}
export function reportFiltersValid(filters: ReportFilters) { return isReportRangeValid(filters.mau) && isReportRangeValid(filters.lastViewed); }
export function reportFilterActive(filters: ReportFilters, attribute: ReportFilterAttribute) {
  return isReportNumericAttribute(attribute) ? hasReportRange(filters[attribute]) : Boolean(filters[attribute]?.length);
}
export function reportFilterValues(filters: ReportFilters, attribute: ReportFilterAttribute): readonly string[] {
  return isReportNumericAttribute(attribute) ? [] : filters[attribute] ?? [];
}
export function reportNumericValue(value: string, attribute: ReportNumericAttribute) {
  if (!value.trim() || value.trim() === '—') return undefined;
  const number = attribute === 'mau' ? Number(value.replace(/\s/g, '')) : Number.parseInt(value, 10);
  return Number.isSafeInteger(number) && number >= 0 ? number : undefined;
}
export function reportRangeScale(rows: readonly ReportTableRow[], attribute: ReportNumericAttribute, range?: ReportNumberRange) {
  const minimumScale = attribute === 'mau' ? 500 : 30;
  return Math.max(minimumScale, ...rows.map(row => reportNumericValue(row[attribute], attribute) ?? 0), range?.min ?? 0, range?.max ?? 0);
}
export function applyReportRangeDraft(applied: ReportFilters, attribute: ReportNumericAttribute, range?: ReportNumberRange): ReportFilters {
  const next = { ...applied };
  if (hasReportRange(range)) next[attribute] = { ...range }; else delete next[attribute];
  return next;
}
export interface ReportFilterOption { value: string; label: string }
export const reportFilterLabels: Record<ReportFilterAttribute, string> = {
  title: 'Отчёт', mau: 'MAU', platform: 'Платформа', domain: 'Домен',
  masterSystem: 'Мастер-система', owner: 'Владелец', lastViewed: 'Просмотр', status: 'Статус проверки',
};

export function filterReportRows(rows: readonly ReportTableRow[], filters: ReportFilters) {
  return rows.filter(row => reportFilterAttributes.every(column => {
    if (isReportNumericAttribute(column)) {
      const range = filters[column];
      if (!hasReportRange(range)) return true;
      const value = reportNumericValue(row[column], column);
      return value !== undefined && isReportRangeValid(range) && (range?.min === undefined || value >= range.min) && (range?.max === undefined || value <= range.max);
    }
    const selected = filters[column];
    const value = column === 'status' ? (row.verifiedIndicator ? 'verified' : 'unverified') : row[column];
    return !selected?.length || selected.includes(value);
  }));
}

export function reportFilterOptions(rows: readonly ReportTableRow[], column: ReportFilterAttribute): ReportFilterOption[] {
  if (column === 'status') return [{ value: 'all', label: 'Все' }, { value: 'verified', label: 'Проверено' }, { value: 'unverified', label: 'Не проверено' }];
  return [...new Set(rows.map(row => row[column]))].map(value => ({ value, label: value }));
}

export function searchReportFilterOptions(options: readonly ReportFilterOption[], query: string) {
  const needle = query.toLocaleLowerCase('ru');
  return options.filter(option => option.label.toLocaleLowerCase('ru').includes(needle));
}

export function applyReportColumnDraft(applied: ReportFilters, column: ReportDiscreteAttribute, draft: readonly string[]): ReportFilters {
  const next = { ...applied };
  if (draft.length) next[column] = [...new Set(draft)];
  else delete next[column];
  return next;
}

export function reportFilterCount(filters: ReportFilters) {
  return reportFilterAttributes.filter(attribute => reportFilterActive(filters, attribute)).length;
}

export function reportFiltersEqual(first: ReportFilters, second: ReportFilters) {
  return reportFilterAttributes.every(attribute => {
    if (isReportNumericAttribute(attribute)) return first[attribute]?.min === second[attribute]?.min && first[attribute]?.max === second[attribute]?.max;
    const left = new Set(first[attribute] ?? []);
    const right = new Set(second[attribute] ?? []);
    return left.size === right.size && [...left].every(value => right.has(value));
  });
}

export function copyReportFilters(filters: ReportFilters): ReportFilters {
  return Object.fromEntries(reportFilterAttributes.filter(attribute => reportFilterActive(filters, attribute))
    .map(attribute => [attribute, isReportNumericAttribute(attribute) ? { ...filters[attribute] } : [...filters[attribute]!]])) as ReportFilters;
}
