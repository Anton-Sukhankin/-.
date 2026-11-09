export interface SystemReference {
  id: string;
  title: string;
  label: string;
  system: { name: string; code?: string };
}

export interface ReferenceOption {
  code: string;
  label: string;
}

export interface ReferenceRow {
  id: string;
  entity: { name: string; logicalName: string };
  attribute: { name: string; logicalName: string };
  relationships: readonly string[];
  options: readonly ReferenceOption[];
  isPrimaryKey?: boolean;
}

export interface SystemReferencesGateway {
  list(): readonly SystemReference[];
  rows(referenceId: string): readonly ReferenceRow[];
}

export const emptyReferenceFilters = {
  query: '',
  entityName: '',
  attributeName: '',
  entityLogicalName: '',
  attributeLogicalName: '',
  relationship: '',
  option: '',
  exactEntity: false,
  primaryKey: false,
};

export type ReferenceFilters = typeof emptyReferenceFilters;
const referenceFilterKeys = Object.keys(emptyReferenceFilters) as (keyof ReferenceFilters)[];

export function referenceFiltersEqual(first: ReferenceFilters, second: ReferenceFilters) {
  return referenceFilterKeys.every(key => first[key] === second[key]);
}

export function referenceFilterCount(draft: ReferenceFilters, applied: ReferenceFilters) {
  const isActive = (value: string | boolean) => typeof value === 'string' ? value.trim() !== '' : value;
  return referenceFilterKeys.filter(key => isActive(draft[key]) || isActive(applied[key])).length;
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('ru');
}

export function filterReferenceRows(rows: readonly ReferenceRow[], filters: ReferenceFilters) {
  const query = normalize(filters.query);
  const entityName = normalize(filters.entityName);
  const attributeName = normalize(filters.attributeName);
  const entityLogicalName = normalize(filters.entityLogicalName);
  const attributeLogicalName = normalize(filters.attributeLogicalName);
  const relationship = normalize(filters.relationship);
  const option = normalize(filters.option);
  return rows.filter(row => {
    const matches = (value: string, criterion: string) => normalize(value).includes(criterion);
    const optionValues = row.options.flatMap(({ code, label }) => [code, label]);
    if (filters.primaryKey && row.isPrimaryKey !== true) return false;
    if (!matches(row.entity.name, entityName) || !matches(row.attribute.name, attributeName)) return false;
    if (entityLogicalName && (filters.exactEntity
      ? normalize(row.entity.logicalName) !== entityLogicalName
      : !matches(row.entity.logicalName, entityLogicalName))) return false;
    if (!matches(row.attribute.logicalName, attributeLogicalName)) return false;
    if (relationship && !row.relationships.some(value => matches(value, relationship))) return false;
    if (option && !optionValues.some(value => matches(value, option))) return false;
    return !query || [
      row.entity.name, row.entity.logicalName, row.attribute.name, row.attribute.logicalName,
      ...row.relationships, ...optionValues,
    ].some(value => matches(value, query));
  });
}
