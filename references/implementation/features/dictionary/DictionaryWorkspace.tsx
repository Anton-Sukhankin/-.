import { useContext, useId, useLayoutEffect, useRef, useState } from 'react';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import type { MouseEvent, ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import motion from '../../components/Accordion/Accordion.module.css';
import { DetailSecondary } from '../../components/DetailHeader/DetailSecondary';
import { useDetailScroll } from '../../components/DetailHeader/useDetailScroll';
import { TabControl } from '../../components/HomeControls/HomeControls';
import { transitionCatalog } from '../../components/catalogTransition';
import { ListPagination } from '../../components/ListPagination/ListPagination';
import { listPageSize, paginate } from '../../data/pagination';
import { ResetFiltersButton } from '../../components/ResetFiltersButton/ResetFiltersButton';
import { SearchLandingContext } from '../../components/Search/SearchMatch';
import groupStyles from '../../components/ReportCard/ReportCardGroups.module.css';
import {
  dictionaryFilterFields, dictionaryFilterKey, dictionaryFilterOptions, dictionaryPageParam, dictionaryTermsPage,
  filterDictionaryDomains, filterDictionaryTerms, isDictionarySingleFilter, readDictionaryFilters, readDictionaryView,
  type DictionaryFilterField, type DictionaryGateway, type DictionaryTerm, type DictionaryView,
} from '../../data/dictionary';
import { DictionaryFilter } from './DictionaryFilter';
import { BusinessProcessGroups } from './BusinessProcessGroups';
import { DomainRow } from './DomainRow';
import { TermCard } from './TermCard';
import { TermDetail } from './TermDetail';
import s from './Dictionary.module.css';

const tabs: readonly { id: DictionaryView; label: string }[] = [
  { id: 'all', label: 'Все' }, { id: 'terms', label: 'Термины' },
  { id: 'processes', label: 'Бизнес-процессы' }, { id: 'domains', label: 'Домены' },
];
const filterLabels = { type: 'Тип', domain: 'Домен', status: 'Статус', owner: 'Владелец' };
const processFilterFields = ['domain', 'status', 'owner'] as const;
const unavailableProcessOptions = dictionaryFilterOptions([], []);

function DictionaryGroup({ title, count, expanded, onToggle, children }: {
  title: string; count: number; expanded: boolean; onToggle: () => void; children: ReactNode;
}) {
  const titleId = useId();
  const contentId = useId();
  return <section className={s.group} aria-labelledby={titleId} data-collapsed={!expanded}>
    <h2 id={titleId} className={s.groupTitle}>
      <button type="button" className={`${groupStyles.heading} ${s.groupHeading}`} aria-expanded={expanded} aria-controls={contentId}
        onClick={onToggle}>
        {title}<span className={`${groupStyles.count} ${s.groupCount}`}>{count}</span>
        <span className={motion.groupChevron} data-group-chevron aria-hidden="true" />
      </button>
    </h2>
    <div id={contentId} className={motion.reveal} data-open={expanded} inert={!expanded}>
      <div className={motion.clip}>{children}</div>
    </div>
  </section>;
}

/** Each tab counts its own available results, before pagination. */
export function DictionaryWorkspace({ gateway }: { gateway: DictionaryGateway }) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [notice, setNotice] = useState<string>();
  const [openField, setOpenField] = useState<DictionaryFilterField>();
  const [domainsExpanded, setDomainsExpanded] = useState(true);
  const [termsExpanded, setTermsExpanded] = useState(true);
  const filterFields = useRef<HTMLDivElement>(null);
  const termReturn = useRef<{ key: string; termId: string; scrollTop: number }>(undefined);
  const view = readDictionaryView(params.get('dictionaryTab'));
  const catalog = gateway.read();
  const termId = params.get('dictionaryTerm');
  const processCatalog = view === 'processes' ? catalog.businessProcesses : undefined;
  const destination = useContext(SearchLandingContext)?.entry.destination;
  const target = destination?.kind === 'term' ? destination.termId : undefined;
  const domainTarget = view === 'domains' && destination?.kind === 'dictionary-domain'
    ? catalog.domains.findIndex(domain => domain.id === destination.domainId) : -1;

  const allOptions = dictionaryFilterOptions(catalog.terms, catalog.domains);
  const termOptions = dictionaryFilterOptions(catalog.terms, []);
  const allFilters = readDictionaryFilters(params, 'all', allOptions);
  const termFilters = readDictionaryFilters(params, 'terms', termOptions);
  const allTerms = filterDictionaryTerms(catalog.terms, allFilters).items;
  const allDomains = filterDictionaryDomains(catalog.domains, allFilters);
  const termPage = dictionaryTermsPage(catalog.terms, termFilters, params, view === 'terms' ? target : undefined);
  const counts: Partial<Record<DictionaryView, number>> = {
    all: allTerms.length + allDomains.length,
    terms: termPage.total,
    domains: catalog.domains.length,
  };
  const tabItems = tabs.map(tab => ({ ...tab, count: counts[tab.id] }));

  const filterView = view === 'all' || view === 'terms' ? view : undefined;
  const options = processCatalog ? unavailableProcessOptions : view === 'all' ? allOptions : termOptions;
  const filters = view === 'all' ? allFilters : view === 'terms' ? termFilters : undefined;
  const filtered = filters && dictionaryFilterFields.some(field => filters[field].length > 0);
  const hasSourceItems = view === 'all' ? catalog.terms.length + catalog.domains.length > 0
    : view === 'terms' ? catalog.terms.length > 0
    : view === 'domains' ? catalog.domains.length > 0 : Boolean(processCatalog?.groups.length);
  const pageKey = view === 'terms' ? dictionaryPageParam : `dictionaryPage.${view}`;
  const requestedPage = Number(params.get(pageKey));
  const domainPage = paginate(catalog.domains, domainTarget < 0 ? requestedPage : Math.floor(domainTarget / listPageSize));
  const allPage = paginate([
    ...allDomains.map(domain => ({ kind: 'domain' as const, domain })),
    ...allTerms.map(term => ({ kind: 'term' as const, term })),
  ], requestedPage);
  const page = view === 'all' ? allPage : view === 'domains' ? domainPage : termPage;
  const visibleTerms = view === 'terms' ? termPage.rows : allPage.rows.flatMap(row => row.kind === 'term' ? [row.term] : []);
  const domains = view === 'all' ? allPage.rows.flatMap(row => row.kind === 'domain' ? [row.domain] : []) : domainPage.rows;
  const resultCount = counts[view];
  const paginated = view !== 'processes' && page.pageCount > 1;
  const pageIndex = page.pageIndex;
  const { compact, scroll, onScroll } = useDetailScroll(`${params}:${pageIndex ?? ''}`);

  useLayoutEffect(() => {
    setDomainsExpanded(true);
    setTermsExpanded(true);
  }, [view]);

  useLayoutEffect(() => {
    const saved = termReturn.current;
    if (termId !== null || !scroll.current || saved?.key !== location.key) return;
    scroll.current.scrollTop = saved.scrollTop;
    scroll.current.querySelector<HTMLAnchorElement>(`[data-dictionary-term="${CSS.escape(saved.termId)}"] a`)?.focus({ preventScroll: true });
  }, [location.key, scroll, termId]);

  function termSearch(id: string) {
    const next = new URLSearchParams(params);
    next.set('dictionaryTerm', id);
    return next.toString();
  }

  function rememberTerm(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    termReturn.current = { key: location.key, termId: id, scrollTop: scroll.current?.scrollTop ?? 0 };
    setNotice(undefined);
    setOpenField(undefined);
  }

  function backToTerms() {
    if (typeof location.state?.dictionaryTermOrigin === 'string') {
      navigate(-1);
      return;
    }
    const next = new URLSearchParams(params);
    next.delete('dictionaryTerm');
    if (view !== 'all' && view !== 'terms') next.set('dictionaryTab', 'terms');
    setParams(next, { replace: true });
  }

  function changePage(index: number) {
    if (index === pageIndex) return;
    setOpenField(undefined);
    setNotice(undefined);
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (index === 0) next.delete(pageKey);
      else next.set(pageKey, String(index));
      return next;
    });
  }
  function changeTab(id: string) {
    if (id === view) return;
    setNotice(undefined);
    setOpenField(undefined);
    transitionCatalog(() => setParams(previous => {
      const next = new URLSearchParams(previous);
      if (id === 'all') next.delete('dictionaryTab'); else next.set('dictionaryTab', id);
      return next;
    }), 'tab');
  }
  function edit(term: DictionaryTerm) {
    setNotice(`Редактирование термина «${term.name}» пока не подключено: форма и правила сохранения не определены.`);
  }
  function updateFilter(field: DictionaryFilterField, selected: readonly string[]) {
    if (!filterView) return;
    const key = dictionaryFilterKey(filterView, field);
    setParams(previous => {
      const next = new URLSearchParams(previous);
      next.delete(key);
      next.delete(pageKey);
      selected.forEach(value => next.append(key, value));
      return next;
    }, { replace: true });
  }

  function resetFilters() {
    if (!filterView) return;
    setOpenField(undefined);
    filterFields.current?.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')?.focus();
    setParams(previous => {
      const next = new URLSearchParams(previous);
      dictionaryFilterFields.forEach(field => next.delete(dictionaryFilterKey(filterView, field)));
      next.delete(pageKey);
      return next;
    });
  }
  if (termId !== null) return <TermDetail key={termId} term={catalog.terms.find(term => term.id === termId)} onBack={backToTerms} />;

  const domainList = <ul className={s.domainList} aria-label="Список доменов">{domains.map(domain => <DomainRow key={domain.id} domain={domain} />)}</ul>;
  const termList = <div className={s.termList} aria-label="Список терминов">{visibleTerms.map(term => <TermCard key={term.id} term={term}
    search={termSearch(term.id)} originKey={location.key} onOpen={event => rememberTerm(event, term.id)} onEdit={edit} />)}</div>;
  return <section className={s.workspace} aria-label="Бизнес-словарь" data-dictionary-workspace
    data-dictionary-view={view} data-detail-compact={compact}>
    <div className={s.chrome} data-dictionary-chrome>
      <header className={s.header}>
        <div className={s.titleRow}><h1>Бизнес-словарь</h1>{resultCount !== undefined && <span className={s.total} data-dictionary-total>{resultCount}</span>}</div>
        <DetailSecondary compact={compact}>
          <p>Единое пространство бизнес-терминов, бизнес-процессов и доменов компании.</p>
        </DetailSecondary>
      </header>
      <TabControl appearance="registry" selection={{ ariaLabel: 'Содержимое бизнес-словаря', items: tabItems, selectedId: view, onChange: changeTab }} />
      {(filters || processCatalog) && hasSourceItems && <div className={s.filters} data-dictionary-filters>
        <div className={s.filterFields} data-process-filters={Boolean(processCatalog)} ref={filterFields}>
          {(processCatalog ? processFilterFields : dictionaryFilterFields).map(field => <DictionaryFilter key={view + field} field={field}
            label={view === 'terms' && field === 'type' ? 'Тип термина' : filterLabels[field]}
            options={options[field]} selected={filters?.[field] ?? []} single={isDictionarySingleFilter(field)} open={openField === field}
            unavailable={Boolean(processCatalog)}
            onOpenChange={open => setOpenField(previous => open ? field : previous === field ? undefined : previous)}
            onChange={values => updateFilter(field, values)} />)}
        </div>
        {filtered && <ResetFiltersButton className={s.filterReset} onClick={resetFilters} />}
      </div>}
    </div>
    <div className={s.resultsFrame} data-detail-tab-content>
      <div ref={scroll} className={s.scroll} data-list-scroll data-paginated={paginated} onScroll={onScroll}
        role="region" aria-label="Содержимое выбранной вкладки словаря" tabIndex={0}>
        {termPage.outside && <p className={s.searchNotice} role="status">Найденный термин показан вне текущих фильтров списка.</p>}
        <div className={s.results} data-dictionary-results data-fill={view === 'domains' || !hasSourceItems || resultCount === 0}>
          {!hasSourceItems ? <EmptyState className={s.emptyState} title="В этой вкладке пока нет записей" description="Здесь будут отображаться записи бизнес-словаря." />
            : processCatalog ? <BusinessProcessGroups catalog={processCatalog} />
            : filtered && resultCount === 0 ? <EmptyState className={s.emptyState} role="status" title="По выбранным фильтрам ничего не найдено." description="Измените условия или сбросьте фильтры."
              action={{ label: 'Сбросить фильтры', variant: 'filter-reset', onClick: resetFilters }} />
            : view === 'all' ? <>
            {domains.length > 0 && <DictionaryGroup title="Домены" count={allDomains.length}
              expanded={domainsExpanded} onToggle={() => setDomainsExpanded(previous => !previous)}>{domainList}</DictionaryGroup>}
            {visibleTerms.length > 0 && <DictionaryGroup title="Термины" count={allTerms.length}
              expanded={termsExpanded} onToggle={() => setTermsExpanded(previous => !previous)}>{termList}</DictionaryGroup>}
          </> : view === 'terms' ? termList : domainList}
        </div>
      </div>
      {paginated && <ListPagination {...page} onPageChange={changePage}
        label={view === 'terms' ? 'Страницы терминов' : view === 'domains' ? 'Страницы доменов' : 'Страницы бизнес-словаря'} />}
    </div>
    {notice && <div className={s.notice} role="status"><p>{notice}</p><button type="button" aria-label="Закрыть уведомление" onClick={() => setNotice(undefined)}>Закрыть</button></div>}
  </section>;
}
