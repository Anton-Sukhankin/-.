import { useCallback, useEffect, useRef, useState } from 'react';
import { applyReportColumnDraft, applyReportRangeDraft, copyReportFilters, isReportNumericAttribute, isReportRangeValid, reportFilterValues, reportFilterColumns, reportFilterLabels, type ReportFilterColumn, type ReportFilters, type ReportNumberRange } from '../data/reportFilters';
import type { ReportSort } from '../data/reportSort';

interface OpenColumn {
  column: ReportFilterColumn;
  anchor: HTMLElement;
  values: string[];
  range?: ReportNumberRange;
  search: string;
  left: number;
  top: number;
  sort?: ReportSort;
}

const menuLeft = (anchorLeft: number) => Math.max(0, Math.min(anchorLeft, window.innerWidth - 320));

export function useReportFilters(onAppliedChange: () => void) {
  const [applied, setApplied] = useState<ReportFilters>({});
  const [menu, setMenu] = useState<OpenColumn>();
  const [sort, setSort] = useState<ReportSort>();
  const popup = useRef<HTMLDivElement>(null);
  function close() { setMenu(undefined); }
  function open(label: string, anchor: HTMLElement) {
    const column = reportFilterColumns.find(column => reportFilterLabels[column] === label);
    if (!column) return;
    if (menu?.column === column) { close(); return; }
    const bounds = anchor.closest('[role="columnheader"]')!.getBoundingClientRect();
    setMenu({ column, anchor, values: [...reportFilterValues(applied,column)], range:isReportNumericAttribute(column) ? { ...applied[column] } : undefined, sort, search: '', left: menuLeft(bounds.left), top: bounds.bottom + 8 });
  }
  function clearColumn(label: string) {
    const column = reportFilterColumns.find(column => reportFilterLabels[column] === label);
    if (!column) return;
    setApplied(previous => isReportNumericAttribute(column) ? applyReportRangeDraft(previous,column) : applyReportColumnDraft(previous, column, []));
    close();
    onAppliedChange();
  }
  function apply() {
    if (!menu || !isReportRangeValid(menu.range)) return;
    setApplied(previous => isReportNumericAttribute(menu.column) ? applyReportRangeDraft(previous,menu.column,menu.range) : applyReportColumnDraft(previous, menu.column, menu.values));
    setSort(menu.sort);
    close();
    menu.anchor.focus();
    onAppliedChange();
  }
  function replaceApplied(next: ReportFilters) {
    setApplied(copyReportFilters(next));
    close();
    onAppliedChange();
  }
  function toggle(value: string) {
    setMenu(previous => previous && { ...previous, values: previous.values.includes(value)
      ? previous.values.filter(item => item !== value) : [...previous.values, value] });
  }
  function resetColumn() {
    if (!menu) return;
    const anchor = menu.anchor;
    clearColumn(reportFilterLabels[menu.column]);
    anchor.focus();
  }
  function changeRange(range: ReportNumberRange) { setMenu(previous => previous && { ...previous, range }); }
  function search(value: string) { setMenu(previous => previous && { ...previous, search: value }); }
  function changeSort(direction: 'asc' | 'desc') {
    setMenu(previous => previous && { ...previous, sort: previous.sort?.column === previous.column && previous.sort.direction === direction
      ? undefined : { column: previous.column, direction } });
  }
  const reposition = useCallback(() => {
    const bounds = menu?.anchor.closest('[role="columnheader"]')?.getBoundingClientRect();
    if (bounds) setMenu(previous => previous && (previous.left !== menuLeft(bounds.left) || previous.top !== bounds.bottom + 8)
      ? { ...previous, left: menuLeft(bounds.left), top: bounds.bottom + 8 } : previous);
  }, [menu?.anchor]);

  useEffect(() => {
    if (!menu) return;
    const anchor = menu.anchor;
    let frame = 0;
    popup.current?.querySelector('input')?.focus();
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !popup.current?.contains(event.target) && !anchor.closest('[role="columnheader"]')?.contains(event.target)) close();
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') { close(); anchor.focus(); }
    }
    function scheduleAlign() { cancelAnimationFrame(frame); frame = requestAnimationFrame(reposition); }
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escape);
    document.addEventListener('scroll', scheduleAlign, true);
    window.addEventListener('resize', scheduleAlign);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', escape);
      document.removeEventListener('scroll', scheduleAlign, true);
      window.removeEventListener('resize', scheduleAlign);
      cancelAnimationFrame(frame);
    };
  }, [menu?.anchor, reposition]);

  return { applied, sort, menu, popup, open, close, clearColumn, apply, replaceApplied, toggle, resetColumn, search, changeSort, changeRange, reposition };
}
