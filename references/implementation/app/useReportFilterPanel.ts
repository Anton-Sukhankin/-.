import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { applyReportColumnDraft, applyReportRangeDraft, copyReportFilters, isReportNumericAttribute, reportFilterActive, reportFilterValues, reportFiltersValid, reportRangeScale, reportFilterAttributes, reportFilterCount, reportFilterLabels, reportFilterOptions, reportFiltersEqual, searchReportFilterOptions, type ReportFilterAttribute, type ReportFilters, type ReportNumberRange, type ReportNumericAttribute } from '../data/reportFilters';
import type { ReportTableRow } from '../data/reportTable';
import type { ReportFilterField } from '../components/ReportFilterPanel';
import { filterValueListHeight, placePanelValueList } from './filterPanelPosition';
import { shouldShowFilterSearch } from '../components/FilterValueList/searchVisibility';

interface PanelState {
  opener: HTMLElement;
  draft: ReportFilters;
  field?: { id: ReportFilterAttribute; anchor: HTMLButtonElement; query: string; width: 212 | 292 | 440; left: number; top: number };
}

export function useReportFilterPanel({ context, rows, applied, onApply, onOpen }: {
  context: 'catalog' | 'favorites';
  rows: readonly ReportTableRow[];
  applied: ReportFilters;
  onApply: (filters: ReportFilters) => void;
  onOpen: () => void;
}) {
  const [state, setState] = useState<PanelState>();
  const panelRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const draft = state?.draft ?? applied;
  const showSearch = state?.field ? shouldShowFilterSearch(optionsFor(state.field.id).length, state.field.id === 'status' ? 'single' : 'multiple', state.field.id !== 'status' && !(context === 'favorites' && state.field.id === 'domain')) : false;
  function optionsFor(id: ReportFilterAttribute) {
    const options = reportFilterOptions(rows, id);
    return context === 'favorites' && id === 'domain' ? [{ value: 'all', label: 'Все домены' }, ...options] : options;
  }
  const options = state?.field ? searchReportFilterOptions(optionsFor(state.field.id), state.field.query) : [];
  const popupHeight = filterValueListHeight(options.length, showSearch);

  function open(opener: HTMLElement) {
    onOpen();
    setState({ opener, draft: copyReportFilters(applied) });
  }
  function close() {
    const opener = state?.opener;
    setState(undefined);
    if (opener) requestAnimationFrame(() => opener.focus());
  }
  function apply() {
    if (!state || !reportFiltersValid(state.draft)) return;
    onApply(state.draft);
    close();
  }
  function reset() { setState(previous => previous && { ...previous, draft: {}, field: undefined }); }
  function changeRange(id: ReportNumericAttribute, value: ReportNumberRange) {
    setState(previous => previous && { ...previous, field:undefined, draft:applyReportRangeDraft(previous.draft,id,value) });
  }
  function openField(id: ReportFilterAttribute, anchor: HTMLButtonElement) {
    if (isReportNumericAttribute(id)) return;
    if (state?.field?.id === id) { setState(previous => previous && { ...previous, field: undefined }); return; }
    const bounds = anchor.getBoundingClientRect();
    const width = id === 'owner' ? 292 : bounds.width > 320 ? 440 : 212;
    const searchable = shouldShowFilterSearch(optionsFor(id).length, id === 'status' ? 'single' : 'multiple', id !== 'status' && !(context === 'favorites' && id === 'domain'));
    const position = placePanelValueList(bounds, width, filterValueListHeight(optionsFor(id).length, searchable), { width: window.innerWidth, height: window.innerHeight }, id === 'owner' ? 'end' : 'start');
    setState(previous => previous && { ...previous, field: { id, anchor, query: '', width, ...position } });
  }
  function search(query: string) { setState(previous => previous?.field ? { ...previous, field: { ...previous.field, query } } : previous); }
  function toggle(value: string) {
    setState(previous => {
      if (!previous?.field) return previous;
      const id = previous.field.id;
      if (isReportNumericAttribute(id)) return previous;
      const values = reportFilterValues(previous.draft,id);
      const next = value === 'all' ? [] : id === 'status' ? [value]
        : values.includes(value) ? values.filter(item => item !== value) : [...values, value];
      return { ...previous, draft: applyReportColumnDraft(previous.draft, id, next) };
    });
  }
  function removeValue(id: ReportFilterAttribute, value: string) {
    if (id === 'status' || isReportNumericAttribute(id)) return;
    setState(previous => previous && { ...previous, draft: applyReportColumnDraft(previous.draft, id, reportFilterValues(previous.draft, id).filter(item => item !== value)) });
  }
  function clearValues(id: ReportFilterAttribute) {
    if (id === 'status' || isReportNumericAttribute(id)) return;
    setState(previous => previous && { ...previous, draft: applyReportColumnDraft(previous.draft, id, []) });
  }

  const reposition = useCallback(() => {
    if (!state?.field) return;
    const position = placePanelValueList(state.field.anchor.getBoundingClientRect(), state.field.width, popupHeight, { width: window.innerWidth, height: window.innerHeight }, state.field.id === 'owner' ? 'end' : 'start');
    setState(previous => previous?.field && (previous.field.left !== position.left || previous.field.top !== position.top)
      ? { ...previous, field: { ...previous.field, ...position } } : previous);
  }, [state?.field?.anchor, state?.field?.width, popupHeight]);
  useLayoutEffect(reposition, [reposition]);
  useEffect(() => {
    if (state?.field) popupRef.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, [state?.field?.anchor]);
  useEffect(() => {
    if (state?.opener) panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [state?.opener]);
  useEffect(() => {
    if (!state) return;
    let frame = 0;
    const opener = state.opener;
    const fieldAnchor = state.field?.anchor;
    function closeWithFocus() { setState(undefined); requestAnimationFrame(() => opener.focus()); }
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (document.querySelector('[data-multi-selected-popup]')) return;
        event.preventDefault(); event.stopPropagation(); closeWithFocus(); return;
      }
      if (event.key !== 'Tab') return;
      const selector = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const candidates = [...new Set([...(panelRef.current?.querySelectorAll<HTMLElement>(selector) ?? []), ...(popupRef.current?.querySelectorAll<HTMLElement>(selector) ?? [])])]
        .filter(element => element.offsetParent !== null);
      const first = candidates[0];
      const last = candidates[candidates.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    function outside(event: PointerEvent) {
      const fieldControl = fieldAnchor?.closest('[data-multi-select]') ?? fieldAnchor;
      if (event.target instanceof Node && !popupRef.current?.contains(event.target) && !fieldControl?.contains(event.target))
        setState(previous => previous && { ...previous, field: undefined });
    }
    function align() { cancelAnimationFrame(frame); frame = requestAnimationFrame(reposition); }
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('scroll', align, true);
    window.addEventListener('resize', align);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('scroll', align, true);
      window.removeEventListener('resize', align);
      cancelAnimationFrame(frame);
    };
  }, [state?.opener, state?.field?.anchor, reposition]);

  const fields: ReportFilterField[] = reportFilterAttributes.map(id => ({
    id,
    label: context === 'favorites' && id === 'lastViewed' ? 'Последний просмотр' : reportFilterLabels[id],
    value: reportFilterValues(draft,id).length ? reportFilterValues(draft,id).map(value => optionsFor(id).find(option => option.value === value)?.label ?? value).join(', ') : 'Все',
    selected: reportFilterActive(draft,id),
    selectionMode: id === 'status' || isReportNumericAttribute(id) ? 'single' : 'multiple',
    selectedOptions: reportFilterValues(draft,id).map(value => optionsFor(id).find(option => option.value === value) ?? { value, label: value }),
  }));
  const selectedValues = state?.field ? reportFilterValues(draft,state.field.id).length ? reportFilterValues(draft,state.field.id)
    : state.field.id === 'status' || context === 'favorites' && state.field.id === 'domain' ? ['all'] : [] : [];
  return { isOpen: Boolean(state), fields, field: state?.field, options, showSearch, selectedValues, panelRef, popupRef,
    rangeFields: {
      mau:{attribute:'mau' as const,value:draft.mau,scaleMax:reportRangeScale(rows,'mau',draft.mau),onChange:(value:ReportNumberRange)=>changeRange('mau',value)},
      lastViewed:{attribute:'lastViewed' as const,value:draft.lastViewed,scaleMax:reportRangeScale(rows,'lastViewed',draft.lastViewed),onChange:(value:ReportNumberRange)=>changeRange('lastViewed',value)},
    },
    count: reportFilterCount(draft), canApply: reportFiltersValid(draft) && !reportFiltersEqual(draft, applied),
    totalOptionsCount: state?.field ? optionsFor(state.field.id).length : 0,
    open, close, apply, reset, openField, search, toggle, removeValue, clearValues };
}
