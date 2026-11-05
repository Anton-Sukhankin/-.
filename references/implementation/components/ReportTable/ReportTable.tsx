import { RoundIconButton } from '../RoundIconButton/RoundIconButton';
import { OverflowText } from '../OverflowText/OverflowText';
import { useContext, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import type { ReportSummary } from '../../data/reports';
import { reportTableLayout, type ReportTableRow } from '../../data/reportTable';
import styles from './ReportTable.module.css';
import { ListPagination } from '../ListPagination/ListPagination';
import { SearchLandingContext, SearchTargetText } from '../Search/SearchMatch';
import { searchId } from '../../data/catalogSearch';

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

export function ReportTable({ rows, total, pageIndex, pageSize, onPageChange, onOpen, onEdit, onColumnIntent, activeColumn, appliedColumns = [], onClearColumn, onHeaderLayoutChange, viewportOffset = 120, paginationLabel, sort }: {
  rows: ReportTableRow[]; total: number; pageIndex: number; pageSize: number;
  onPageChange: (page: number) => void;
  onOpen: (report: ReportSummary) => void;
  onEdit: (report: ReportSummary) => void;
  onColumnIntent: (column: string, anchor: HTMLElement) => void;
  activeColumn?: string;
  appliedColumns?: readonly string[];
  onClearColumn?: (column: string) => void;
  onHeaderLayoutChange?: () => void;
  viewportOffset?: number;
  paginationLabel?: string;
  sort?: { columnLabel: string; direction: 'asc' | 'desc' };
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1088);
  const [offset, setOffset] = useState(0);
  const searchHit = useContext(SearchLandingContext);
  useLayoutEffect(() => {
    const element = scroll.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    setWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => { if (scroll.current) scroll.current.scrollTop = 0; }, [pageIndex]);
  useLayoutEffect(() => {
    const element = scroll.current;
    const match = element?.querySelector('[data-catalog-search-match]');
    const middle = match?.closest('.' + styles.middleMask);
    if (!element || !match || !middle) return;
    const text = match.getBoundingClientRect();
    const viewport = middle.getBoundingClientRect();
    if (text.right > viewport.right - 8) element.scrollLeft += text.right - viewport.right + 8;
    else if (text.left < viewport.left + 8) element.scrollLeft -= viewport.left - text.left + 8;
    setOffset(element.scrollLeft);
  }, [searchHit, width, pageIndex]);
  // The anchored menu must read coordinates after the header transform commits.
  useLayoutEffect(() => { onHeaderLayoutChange?.(); }, [width, offset, onHeaderLayoutChange]);
  const layout = reportTableLayout(width);
  const table = useTable({ features, columns, data: rows, getRowId: (row) => row.id });
  const groups = new Map<string, ReportTableRow[]>();
  for (const row of table.getRowModel().rows) {
    const current = groups.get(row.original.domain);
    if (current) current.push(row.original);
    else groups.set(row.original.domain, [row.original]);
  }
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const showPagination = pageCount > 1;
  const gridStyle = {
    gridTemplateColumns: layout.middle.map((value) => `${value}px`).join(' '),
    width: layout.middleWidth,
    transform: `translateX(${-offset}px)`,
  } satisfies CSSProperties;
  const scrollStyle = { '--grid-width': `${width}px`, '--content-width': `${width + layout.overflow}px` } as CSSProperties;
  function heading(label: string, first = false) {
    const applied = appliedColumns.includes(label);
    const active = activeColumn === label;
    const direction = sort?.columnLabel === label ? sort.direction : undefined;
    return <div role="columnheader" className={styles.headerCell} aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}>
      <div className={`${styles.headerButton} ${first ? styles.firstHeading : ''}`} data-open={active} data-sort={direction}>
        <button type="button" className={styles.openHeading} aria-label={`Фильтр «${label}»`}
          aria-haspopup="dialog" aria-expanded={active} onClick={(event) => onColumnIntent(label, event.currentTarget)}><span className={styles.headingText}>{label}</span></button>
        {applied ? <button type="button" className={styles.clearFilter} aria-label={`Сбросить фильтр «${label}»`}
          onClick={() => onClearColumn?.(label)}><img className={styles.defaultMinus} src={asset('filter-minus.svg')} width="10" height="10" alt="" />
            <img className={styles.hoverMinus} src={asset('filter-minus-hover.svg')} width="10" height="10" alt="" /></button>
          : <img src={asset(active ? 'filter-active.svg' : 'filter.svg')} width="16" height="16" alt="" aria-hidden="true" />}
        {direction && <img className={styles.sortIndicator} data-sort-indicator={direction} src={asset('sort-applied.svg')} width="16" height="16" alt="" aria-hidden="true" />}
      </div>
    </div>;
  }
  return (
    <section className={styles.surface} style={{ height: `calc(100vh - ${viewportOffset}px)` }} aria-label="Таблица отчётов" data-table-scrolled={offset > 0} data-pagination-visible={showPagination}>
      <div role="table" aria-label="Список отчётов" aria-colcount={8} aria-rowcount={rows.length + 1} className={styles.table}>
        <div role="rowgroup" className={styles.header}>
          <div role="row" className={styles.headerRow}>
            <div className={styles.fixedReport}>{heading('Отчёт', true)}</div>
            <div className={styles.middleMask}><div className={styles.middleGrid} style={gridStyle}>{middleLabels.map((label) => <div key={label}>{heading(label)}</div>)}</div></div>
            <div role="columnheader" aria-label="Действия" className={styles.fixedEdit} />
          </div>
        </div>
        <div className={styles.bodyFrame}>
          <div ref={scroll} className={styles.scroll} style={scrollStyle} tabIndex={0} aria-label="Прокрутка таблицы отчётов"
            onScroll={(event) => setOffset(event.currentTarget.scrollLeft)}>
            <div className={styles.scrollCanvas}>
              <div className={styles.pinnedRows} style={{ paddingBottom: showPagination ? 80 : 16 }}>
                {Array.from(groups, ([domain, items]) => <div role="rowgroup" className={styles.group} key={domain}>
                  <div className={styles.groupHeading}>
                    <img src="/icons/reports/domain-group.svg" width="16" height="16" alt="" aria-hidden="true" />
                    <span>{domain}</span><span className={styles.count}>{items.length}</span>
                  </div>
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
                      <div className={styles.middleGrid} style={gridStyle}>
                        <div role="cell" className={styles.cell}><div className={styles.metric} data-mau-trend={row.delta.startsWith('−') || row.delta.startsWith('-') ? 'down' : row.delta.startsWith('+') ? 'up' : 'unknown'}>
                          <span className={styles.metricValues}><strong>{row.mau}</strong><span>{row.delta}</span></span>
                          {row.mau !== '—' && <span className={styles.chartSlot}><img src={row.chartSrc} height="32" alt="" aria-hidden="true" /></span>}
                        </div></div>
                        <div role="cell" className={styles.cell}><span className={styles.singleLine}><SearchTargetText id={target} field="platform" text={row.platform} useMatchedValue /></span></div>
                        <div role="cell" className={styles.cell}><span className={styles.twoLines}><SearchTargetText id={target} field="domain" text={row.domain} useMatchedValue /></span></div>
                        <div role="cell" className={styles.cell}><span className={styles.twoLines}><SearchTargetText id={target} field="masterSystem" text={row.masterSystem} useMatchedValue /></span></div>
                        <div role="cell" className={`${styles.cell} ${styles.owner}`}><img src={row.avatarSrc} width="40" height="40" alt="" /><OverflowText className={styles.singleLine} fullText={row.owner}>{row.owner}</OverflowText></div>
                        <div role="cell" className={`${styles.cell} ${styles.lastViewed}`}>{row.lastViewed}</div>
                      </div>
                    </div>
                    <div role="cell" className={styles.fixedEdit}>
                      <RoundIconButton icon="edit" className={styles.edit} aria-label={`Редактировать отчёт «${row.report.title}»`} onClick={() => onEdit(row.report)} />
                    </div>
                  </div>;
                  })}
                </div>)}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ListPagination total={total} pageIndex={pageIndex} pageSize={pageSize} onPageChange={onPageChange} label={paginationLabel} />
    </section>
  );
}
