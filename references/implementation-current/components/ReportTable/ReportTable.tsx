import { AttributeValue } from '../AttributeValue/AttributeValue';
import { RoundIconButton } from '../RoundIconButton/RoundIconButton';
import { ColumnReset } from '../ColumnReset/ColumnReset';
import { OverflowText } from '../OverflowText/OverflowText';
import { useContext, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import type { ReportSummary } from '../../data/reports';
import { reportTableLayout, type ReportTableRow } from '../../data/reportTable';
import styles from './ReportTable.module.css';
import { ListPagination } from '../ListPagination/ListPagination';
import { SearchLandingContext, SearchTargetText } from '../Search/SearchMatch';
import { searchId } from '../../data/catalogSearch';
import motion from '../Accordion/Accordion.module.css';

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, ReportTableRow>();
const columns = helper.columns([
  helper.accessor('title', { header: 'Отчёт' }), helper.accessor('mau', { header: 'MAU' }),
  helper.accessor('platform', { header: 'Платформа' }), helper.accessor('domain', { header: 'Домен' }),
  helper.accessor('masterSystem', { header: 'Мастер-система' }), helper.accessor('owner', { header: 'Владелец' }),
  helper.accessor('lastViewed', { header: 'Просмотр' }), helper.accessor('id', { header: '' }),
]);
const middleLabels = ['MAU', 'Платформа', 'Домен', 'Мастер-система', 'Владелец', 'Просмотр'];
const asset = (name: string) => `/images/report-table/${name}`;
const minimumLayout = reportTableLayout(0);
const tableSizing = {
  '--table-start-column': `${minimumLayout.report}px`,
  '--table-end-column': `${minimumLayout.edit}px`,
  '--table-middle-minimum': `${minimumLayout.middleWidth}px`,
  '--table-middle-count': minimumLayout.middle.length,
  '--table-middle-columns': minimumLayout.middle.map(width => `calc(${width}px + var(--table-column-growth))`).join(' '),
};

function revealInTable(target: Element, mask: Element, viewport: HTMLDivElement) {
  const bounds = target.getBoundingClientRect();
  const visible = mask.getBoundingClientRect();
  if (bounds.right > visible.right - 8) viewport.scrollLeft += bounds.right - visible.right + 8;
  else if (bounds.left < visible.left + 8) viewport.scrollLeft -= visible.left - bounds.left + 8;
}

export function ReportTable({ rows, total, pageIndex, pageSize, onPageChange, onOpen, onEdit, onColumnIntent, activeColumn, appliedColumns = [], onClearColumn, onClearSort, onHeaderLayoutChange, viewportOffset = 120, paginationLabel, sort, searchLandingKey }: {
  rows: ReportTableRow[]; total: number; pageIndex: number; pageSize: number;
  onPageChange: (page: number) => void;
  onOpen: (report: ReportSummary) => void;
  onEdit: (report: ReportSummary) => void;
  onColumnIntent: (column: string, anchor: HTMLElement) => void;
  activeColumn?: string;
  appliedColumns?: readonly string[];
  onClearColumn?: (column: string) => void;
  onClearSort: (column: string) => void;
  onHeaderLayoutChange?: () => void;
  viewportOffset?: number;
  paginationLabel?: string;
  sort?: { columnLabel: string; direction: 'asc' | 'desc' };
  searchLandingKey?: string;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const groupId = useId();
  const [offset, setOffset] = useState(0);
  const [collapsedDomains, setCollapsedDomains] = useState<ReadonlySet<string>>(() => new Set());
  const searchHit = useContext(SearchLandingContext);
  const destination = searchHit?.entry.destination;
  const searchReportId = destination?.kind === 'report' ? destination.report.id : undefined;
  const searchDomain = rows.find(row => row.id === searchReportId)?.domain;
  const searchDomainCollapsed = searchDomain !== undefined && collapsedDomains.has(searchDomain);
  useLayoutEffect(() => { if (scroll.current) scroll.current.scrollTop = 0; }, [pageIndex]);
  useLayoutEffect(() => {
    if (searchDomain === undefined) return;
    setCollapsedDomains(previous => {
      if (!previous.has(searchDomain)) return previous;
      const next = new Set(previous);
      next.delete(searchDomain);
      return next;
    });
  }, [searchDomain, searchLandingKey, searchReportId, searchHit?.query, searchHit?.value.field, searchHit?.occurrence]);
  useLayoutEffect(() => {
    const element = scroll.current;
    if (!element) return;
    function revealMatch(viewport: HTMLDivElement) {
      const match = viewport.querySelector('[data-catalog-search-match]');
      const middle = match?.closest('.' + styles.middleMask);
      if (!match || !middle || match.closest('[inert]')) return;
      revealInTable(match, middle, viewport);
      setOffset(viewport.scrollLeft);
    }
    revealMatch(element);
    const observer = new ResizeObserver(() => {
      revealMatch(element);
      onHeaderLayoutChange?.();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [searchHit, searchDomainCollapsed, pageIndex, onHeaderLayoutChange]);
  // The anchored menu must read coordinates after the header transform commits.
  useLayoutEffect(() => { onHeaderLayoutChange?.(); }, [offset, onHeaderLayoutChange]);
  const table = useTable({ features, columns, data: rows, getRowId: (row) => row.id });
  const groups = new Map<string, ReportTableRow[]>();
  for (const row of table.getRowModel().rows) {
    const current = groups.get(row.original.domain);
    if (current) current.push(row.original);
    else groups.set(row.original.domain, [row.original]);
  }
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const visibleRowCount = Array.from(groups).reduce((count, [domain, items]) => count + (collapsedDomains.has(domain) ? 0 : items.length), 0);
  const showPagination = pageCount > 1;
  const tableStyle = { ...tableSizing, '--table-offset': `${offset}px` } as CSSProperties;
  function toggleDomain(domain: string) {
    setCollapsedDomains(previous => {
      const next = new Set(previous);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }
  function heading(label: string, first = false) {
    const applied = appliedColumns.includes(label);
    const active = activeColumn === label;
    const direction = sort?.columnLabel === label ? sort.direction : undefined;
    return <div role="columnheader" className={styles.headerCell} aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}>
      <div className={`${styles.headerButton} ${first ? styles.firstHeading : ''}`} data-open={active} data-sort={direction}>
        <button type="button" className={styles.openHeading} aria-label={`Фильтр «${label}»`}
          aria-haspopup="dialog" aria-expanded={active} onClick={(event) => onColumnIntent(label, event.currentTarget)}><span className={styles.headingText}>{label}</span></button>
        {applied ? <ColumnReset label={`Сбросить фильтр «${label}»`} onReset={() => onClearColumn?.(label)}>
          <img src={asset('filter-active.svg')} width="16" height="16" alt="" />
        </ColumnReset>
          : <img src={asset(active ? 'filter-active.svg' : 'filter.svg')} width="16" height="16" alt="" aria-hidden="true" />}
        {direction && <ColumnReset label={`Сбросить сортировку «${label}»`} onReset={() => onClearSort(label)}>
          <img className={styles.sortIndicator} data-sort-indicator={direction} src={asset('sort-applied.svg')} width="16" height="16" alt=""/>
        </ColumnReset>}
      </div>
    </div>;
  }
  return (
    <section className={styles.surface} data-list-scroll-boundary style={{ height: `calc(100vh - ${viewportOffset}px)` }} aria-label="Таблица отчётов" data-table-scrolled={offset > 0} data-pagination-visible={showPagination}>
      <div role="table" aria-label="Список отчётов" aria-colcount={8} aria-rowcount={visibleRowCount + groups.size + 1} className={styles.table} style={tableStyle}>
        <div role="rowgroup" className={styles.header}>
          <div role="row" className={styles.headerRow}>
            <div className={styles.fixedReport}>{heading('Отчёт', true)}</div>
            <div className={styles.middleMask} onFocus={event => {
              if (!scroll.current || !event.target.matches(':focus-visible')) return;
              revealInTable(event.target, event.currentTarget, scroll.current);
              setOffset(scroll.current.scrollLeft);
            }}><div className={styles.middleGrid}>{middleLabels.map((label) => <div key={label}>{heading(label)}</div>)}</div></div>
            <div role="columnheader" aria-label="Действия" className={styles.fixedEdit} />
          </div>
        </div>
        <div className={styles.bodyFrame}>
          <div ref={scroll} className={styles.scroll} data-list-scroll tabIndex={0} aria-label="Прокрутка таблицы отчётов"
            onScroll={(event) => setOffset(event.currentTarget.scrollLeft)}>
            <div className={styles.scrollCanvas}>
              <div className={styles.pinnedRows} style={{ paddingBottom: showPagination ? 80 : 16 }}>
                {Array.from(groups, ([domain, items]) => {
                  const collapsed = collapsedDomains.has(domain);
                  const contentId = `${groupId}-${encodeURIComponent(domain)}`;
                  return <div role="rowgroup" className={styles.group} key={domain} data-collapsed={collapsed}>
                    <div role="row"><div role="cell" aria-colspan={8}>
                      <button type="button" className={styles.groupHeading} aria-expanded={!collapsed} aria-controls={contentId} onClick={() => toggleDomain(domain)}>
                        <img src="/icons/reports/domain-group.svg" width="16" height="16" alt="" aria-hidden="true" />
                        <span>{domain}</span><span className={styles.count}>{items.length}</span>
                      </button>
                    </div></div>
                    <div id={contentId} className={`${motion.reveal} ${styles.groupReveal}`} data-open={!collapsed}
                      data-search-target={domain === searchDomain} inert={collapsed}>
                      <div className={`${motion.clip} ${styles.groupRows}`}>
                        {items.map((row) => {
                          const target = searchId('report', row.id);
                          return <div role="row" key={row.id} className={styles.row} data-table-report-id={row.id}
                            onClick={(event) => { if (!(event.target as Element).closest('button')) onOpen(row.report); }}>
                            <div role="cell" className={styles.fixedReport}>
                              <button type="button" className={styles.reportButton} onClick={() => onOpen(row.report)} aria-label={`Открыть отчёт «${row.report.title}»`}>
                                <span className={styles.document}>
                                  <img className={styles.defaultDocument} src={asset('document-default.svg')} width="40" height="40" alt="" aria-hidden="true" />
                                  <img className={styles.hoverDocument} src={asset('document-hover.svg')} width="40" height="40" alt="" aria-hidden="true" />
                                </span>
                                <OverflowText className={styles.reportTitle} fullText={row.report.title}><SearchTargetText id={target} field="title" text={row.title} useMatchedValue /></OverflowText>
                                <span className={styles.indicators}>
                                  {row.verifiedIndicator && <img src={asset('status-verified.svg')} width="17" height="17" alt="Проверен" />}
                                  {row.warningIndicator && <img src={asset('status-warning.svg')} width="16" height="16" alt="Индикатор отчёта" />}
                                </span>
                              </button>
                            </div>
                            <div className={styles.middleMask}>
                              <div className={styles.middleGrid}>
                                <div role="cell" className={`${styles.cell} ${styles.mauCell}`}><div className={styles.metric} data-mau-trend={row.delta.startsWith('−') || row.delta.startsWith('-') ? 'down' : row.delta.startsWith('+') ? 'up' : 'unknown'}>
                                  <span className={styles.metricValues}><strong><AttributeValue value={row.mau} /></strong><span><AttributeValue value={row.delta} /></span></span>
                                  {row.mau !== '—' && <span className={styles.chartSlot}><img src={row.chartSrc} height="32" alt="" aria-hidden="true" /></span>}
                                </div></div>
                                <div role="cell" className={styles.cell}><span className={styles.singleLine}><AttributeValue value={row.platform}><SearchTargetText id={target} field="platform" text={row.platform} useMatchedValue /></AttributeValue></span></div>
                                <div role="cell" className={styles.cell}><span className={styles.twoLines}><AttributeValue value={row.domain}><SearchTargetText id={target} field="domain" text={row.domain} useMatchedValue /></AttributeValue></span></div>
                                <div role="cell" className={styles.cell}><span className={styles.twoLines}><AttributeValue value={row.masterSystem}><SearchTargetText id={target} field="masterSystem" text={row.masterSystem} useMatchedValue /></AttributeValue></span></div>
                                <div role="cell" className={`${styles.cell} ${styles.owner}`}><img src={row.avatarSrc} width="40" height="40" alt="" /><OverflowText className={styles.singleLine} fullText={row.owner}><AttributeValue value={row.owner} /></OverflowText></div>
                                <div role="cell" className={`${styles.cell} ${styles.lastViewed}`}><AttributeValue value={row.lastViewed} /></div>
                              </div>
                            </div>
                            <div role="cell" className={styles.fixedEdit}>
                              <RoundIconButton icon="edit" className={styles.edit} aria-label={`Редактировать отчёт «${row.report.title}»`} onClick={() => onEdit(row.report)} />
                            </div>
                          </div>;
                        })}
                      </div>
                    </div>
                  </div>;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ListPagination total={total} pageIndex={pageIndex} pageSize={pageSize} onPageChange={onPageChange} label={paginationLabel} />
    </section>
  );
}
