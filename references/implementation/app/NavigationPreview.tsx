import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useCatalogTransition } from './useCatalogTransition';
import { detailTrailParam, readDetail, readDetailTrail, withoutDetail, type DetailKind } from './detailTrail';
import { transitionCatalog, type CatalogTransition } from '../components/catalogTransition';
import type { DetailCrumb } from '../components/DetailHeader/DetailBreadcrumbs';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { Header } from '../components/Header/Header';
import { EmptyState } from '../components/EmptyState/EmptyState';
import { CatalogSearch } from '../components/Search/CatalogSearch';
import { SearchLandingContext } from '../components/Search/SearchMatch';
import { isDescriptionMatchClipped } from '../components/Search/descriptionVisibility';
import { catalogSearchPage, findPageMatches, hasSearchDetail, isSearchGroup, normalizeSearch, searchId, type SearchDestination, type SearchEntry, type SearchHit } from '../data/catalogSearch';
import { metricCatalogPage, readMetricCatalogState } from '../data/metrics';
import { sourceCatalogPage } from '../data/sources';
import { demoMetricsGateway } from '../demo/metrics';
import { demoSourcesGateway } from '../demo/sources';
import { demoAdditionalSearchEntries, demoAiSearchEntries, demoQuestionSearchEntries, demoReferenceSearchEntries, demoReportSearchEntries } from '../demo/catalogSearch';
import type { ReportSummary } from '../data/reports';
import { demoReportsGateway } from '../demo/reports';
import { ReportCardGroups } from '../components/ReportCard/ReportCardGroups';
import { ReportTable } from '../components/ReportTable/ReportTable';
import { readDemoReportRows } from '../demo/reportTable';
import { reportTablePage, type ReportTableRow } from '../data/reportTable';
import { filterReportRows, reportFilterLabels, reportFilterOptions, searchReportFilterOptions } from '../data/reportFilters';
import { ColumnFilterMenu } from '../components/ColumnFilterMenu/ColumnFilterMenu';
import { useReportFilters } from './useReportFilters';
import { useReportFilterPanel } from './useReportFilterPanel';
import { ReportFilterOverlay } from './ReportFilterOverlay';
import { DEFAULT_VIEW_MODE, HomeControls, ViewPicker, type HomeViewMode } from '../components/HomeControls/HomeControls';
import { FilterButton } from '../components/FilterButton/FilterButton';
import { ListPagination } from '../components/ListPagination/ListPagination';
import { listPageSize } from '../data/pagination';
import { ListScrollIndicator } from '../components/ListScrollIndicator/ListScrollIndicator';
import { readDemoFavoriteRows } from '../demo/favorites';
import { homeTabs, homeReportSegments, homeContributionTypes, homeNewsCategories } from '../demo/homeNavigation';
import { isReportNumericAttribute, reportRangeScale, reportFilterCount } from '../data/reportFilters';
import type { ReportCardData } from '../components/ReportCard/ReportCard';
import { navigationFixture } from '../demo/navigation';
import styles from './NavigationPreview.module.css';
import { sortReportRows } from '../data/reportSort';
import { NewsContent, demoNewsArticles, filterNewsByCategory, type NewsCategoryId } from '../features/news';
import { SubscriptionsContent, subscriptionContentFixture, type SubscriptionsIntent } from '../features/subscriptions';
import { ContributionContent, contributionContentFixture } from '../features/contributors';
import { EmptyFavorites } from './EmptyFavorites';
import { demoReportDetailSources } from '../features/report-detail/demoSource';
import { ReportDetail } from '../features/report-detail/ReportDetail';
import { MetricWorkspace } from '../features/metrics/MetricWorkspace';
import { SourcesWorkspace } from '../features/sources/SourcesWorkspace';
import { DictionaryWorkspace } from '../features/dictionary/DictionaryWorkspace';
import { demoDictionaryGateway } from '../demo/dictionary';
import { AiHubCatalog } from '../features/ai-hub/AiHubCatalog';
import { SystemReferencesWorkspace } from '../features/system-references/SystemReferencesWorkspace';
import { demoSystemReferencesGateway } from '../demo/systemReferences';
import { QuestionsWorkspace } from '../features/questions/QuestionsWorkspace';
import { demoAppeals, demoFaq } from '../demo/questions';
import type { QuestionAppeal, QuestionDraft } from '../data/questions';
import { demoAiSolutions } from '../demo/aiHub';
import { dictionaryFilterOptions, dictionaryTermsPage, readDictionaryFilters } from '../data/dictionary';
import { paginationDemoParam, paginationExampleCount, paginationExamples, paginationExampleLabel, paginationReportRows, readPaginationReport, paginationReportDetails,
  paginationMetricsGateway, paginationSourcesGateway, paginationSourceDetailsGateway, paginationDictionaryGateway, paginationReferencesGateway } from '../demo/paginationExamples';

type SearchSelection = {
  hit: SearchHit;
  action: 'location' | 'detail';
  highlightToken: string;
  descriptionOrigin?: string;
  highlightDescription?: true;
};
type DetailOriginState = { searchSelection?: SearchSelection; restoreCatalogSearch?: boolean; report?: ReportSummary; returnTo?: string };
type NavigationState = DetailOriginState & { detailHistoryDepth?: number; detailOrigin?: DetailOriginState | null };

const defaultHomeViews = { favorites: DEFAULT_VIEW_MODE, subscriptions: DEFAULT_VIEW_MODE, contribution: DEFAULT_VIEW_MODE };
const demoCaseParams = ['tableCase', 'favoriteCase', 'homeCase', 'questionsCase', paginationDemoParam];
const paginatedNews = paginationExamples(demoNewsArticles, (item, number) => ({ title: paginationExampleLabel(item.title, number), contentSource: 'demo' as const }));
const paginatedSubscriptions = paginationExamples(subscriptionContentFixture, (item, number) => ({ title: paginationExampleLabel(item.title, number) }));
const paginatedContributors = paginationExamples(contributionContentFixture, (item, number) => ({ name: paginationExampleLabel(item.name, number), rankLabel: String(number) }));
const paginatedAi = paginationExamples(demoAiSolutions, (item, number) => ({
  title: paginationExampleLabel(item.title, number), status: 'Демо', actions: {},
}));
const paginatedFaq = paginationExamples(demoFaq, (item, number) => ({ question: paginationExampleLabel(item.question, number) }));
const paginatedAppeals = paginationExamples(demoAppeals, (item, number) => ({ subject: paginationExampleLabel(item.subject, number) }));
const paginatedNavigation = navigationFixture.map(item => item.count === undefined ? item : {
  ...item, count: String(item.id === 'dictionary' ? paginationExampleCount + paginationDictionaryGateway.read().domains.length : paginationExampleCount),
});
const reportPaginationNavigation = navigationFixture.map(item => item.id === 'reports' ? { ...item, count: String(paginationExampleCount) } : item);
const searchSections = navigationFixture.flatMap(({ id, label }) => isSearchGroup(id) ? [{ id, label }] : []);
const aiSearchEntries = demoAiSearchEntries(demoAiSolutions);
const paginatedAiSearchEntries = demoAiSearchEntries(paginatedAi);
const referenceSearchEntries = demoReferenceSearchEntries(demoSystemReferencesGateway.list());
const paginatedReferenceSearchEntries = demoReferenceSearchEntries(paginationReferencesGateway.list());

function createHighlightToken() {
  return crypto.getRandomValues(new Uint32Array(2)).join('-');
}

function entriesOnSearchPage(entries: readonly SearchEntry[], destination: SearchDestination, rows: ReportTableRow[] | undefined, query: string, params: URLSearchParams) {
  const paginationDemo = params.get(paginationDemoParam) === '1';
  if (destination.kind === 'source' || destination.kind === 'metric') {
    const metricItems = (paginationDemo ? paginationMetricsGateway : demoMetricsGateway).list();
    const catalog = destination.kind === 'source'
      ? sourceCatalogPage((paginationDemo ? paginationSourcesGateway : demoSourcesGateway).list(), params, destination.id).rows
      : metricCatalogPage(metricItems, readMetricCatalogState(metricItems, params), Number(params.get('metricPage')), destination.id).rows;
    const keys = new Set(catalog.map(item => searchId(destination.kind, item.id)));
    return entries.filter(entry => keys.has(entry.id));
  }
  if (destination.kind === 'term') {
    const { terms } = (paginationDemo ? paginationDictionaryGateway : demoDictionaryGateway).read();
    const filters = readDictionaryFilters(params, 'terms', dictionaryFilterOptions(terms, []));
    const ids = new Set(dictionaryTermsPage(terms, filters, params, destination.termId).rows.map(term => term.id));
    return entries.filter(entry => entry.destination?.kind === 'term' && ids.has(entry.destination.termId));
  }
  if (destination.kind === 'field') return entries.filter(entry => entry.destination?.kind === 'field' && entry.destination.sourceId === destination.sourceId);
  if (destination.kind === 'metric-block') return entries.filter(entry => entry.destination?.kind === 'metric-block' && entry.destination.metricId === destination.metricId);
  if (destination.kind !== 'report') return [];

  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const groups = new Map<string, SearchEntry[]>();
  for (const row of rows ?? []) {
    const entry = byId.get(searchId('report', row.id));
    if (!entry) continue;
    const visible: Record<string, string> = { title: row.title, platform: row.platform, domain: row.domain, masterSystem: row.masterSystem };
    const values = entry.values.map(value => ({
      ...value,
      text: normalizeSearch(visible[value.field] ?? '').includes(query) ? visible[value.field] : value.text,
    }));
    const group = groups.get(row.domain) ?? [];
    group.push({ ...entry, values });
    groups.set(row.domain, group);
  }
  return [...groups.values()].flat();
}

export function NavigationPreview({ tablePageSize = listPageSize, favoritePageSize = listPageSize, homePageSize = listPageSize, emptyHome }: { tablePageSize?: number; favoritePageSize?: number; homePageSize?: number; emptyHome?: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [sourcePanelOpen, setSourcePanelOpen] = useState(false);
  const [sidebarEntry, setSidebarEntry] = useState(0);
  const [params, setParams] = useSearchParams();
  const paginationMode = params.get(paginationDemoParam);
  const paginationDemo = paginationMode === '1';
  const expandReportCatalog = paginationMode !== '0' && !params.has('tableCase');
  const expandFavorites = paginationMode !== '0' && !params.has('favoriteCase') && !params.has('homeCase');
  const expandHomeLists = paginationMode !== '0' && !params.has('homeCase');
  const expandedReports = expandReportCatalog || expandFavorites;
  const reportDetails = expandedReports ? paginationReportDetails : demoReportDetailSources;
  const metricsGateway = paginationDemo ? paginationMetricsGateway : demoMetricsGateway;
  const sourcesGateway = paginationDemo ? paginationSourcesGateway : demoSourcesGateway;
  const location = useLocation();
  const navigate = useNavigate();
  const navigationState = location.state as NavigationState | null;
  const searchSelection = navigationState?.searchSelection;
  // Dismiss old marks across history entries while retaining their landing targets.
  const [highlightToken, setHighlightToken] = useState(createHighlightToken);
  const highlightDismissed = searchSelection?.highlightToken !== highlightToken;
  const onDifferentSourceTab = searchSelection?.hit.entry.kind === 'field' && params.get('sourceTab') === 'reports';
  const initialSearchHit = searchSelection?.action === 'location' && !onDifferentSourceTab ? searchSelection.hit : undefined;
  const searchDestination = initialSearchHit?.entry.destination;
  const reportDestination = searchDestination?.kind === 'report' ? searchDestination : undefined;
  const [checkedDescription, setCheckedDescription] = useState<SearchSelection>();
  const pendingDescription = searchSelection?.descriptionOrigin && searchSelection !== checkedDescription ? searchSelection : undefined;
  const [searchStep, setSearchStep] = useState<{ selection: SearchSelection; index: number }>();
  const main = useRef<HTMLElement>(null);
  const aiScrollPosition = useRef(0);
  const [aiBookmarks, setAiBookmarks] = useState<ReadonlySet<string>>(() => new Set());
  const [submittedAppeals, setSubmittedAppeals] = useState<readonly QuestionAppeal[]>([]);
  const activeId = navigationFixture.some(item => item.id === params.get('section')) ? params.get('section')! : 'home';
  const activeSection = navigationFixture.find(item => item.id === activeId)!;
  const selectedReportId = params.get('report');
  const detailTrail = readDetailTrail(params, activeId);
  const detail = readDetail(params);
  const isMetricDetail = detail?.kind === 'metric' && (activeId === 'metrics' || detailTrail.length > 0);
  const isSourceDetail = detail?.kind === 'source' && (activeId === 'sources' || detailTrail.length > 0);
  const hasDetail = Boolean(selectedReportId || isMetricDetail || isSourceDetail);
  const [editNotice, setEditNotice] = useState<string>();
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [catalogView, setCatalogView] = useState<HomeViewMode>(DEFAULT_VIEW_MODE);
  const filters = useReportFilters(() => { setTablePageIndex(0); clearSearchSelection(); });
  const [favoritePageIndex, setFavoritePageIndex] = useState(0);
  const favoriteFilters = useReportFilters(() => { setFavoritePageIndex(0); clearSearchSelection(); });
  const homeTab = homeTabs.some(item => item.id === params.get('tab')) ? params.get('tab')! : 'reports';
  const homeSegment = homeReportSegments.some(item => item.id === params.get('segment')) ? params.get('segment')! : 'favorites';
  const [homeViews, setHomeViews] = useState<Record<string, HomeViewMode>>(defaultHomeViews);
  const newsCategory: NewsCategoryId = homeNewsCategories.some(item => item.id === params.get('category')) ? params.get('category') as NewsCategoryId : 'all';
  const newsScroll = useRef<Partial<Record<NewsCategoryId, number>>>({});
  const newsRecords = emptyHome === 'news' ? [] : paginationDemo ? paginatedNews : demoNewsArticles;
  const newsItems = filterNewsByCategory(newsRecords, newsCategory);
  const selectedNewsId = params.get('news') ?? undefined;
  const isNews = activeId === 'home' && homeTab === 'news' && !selectedReportId;
  const isReadingNews = isNews && newsItems.some(item => item.id === selectedNewsId);
  const [contributionType, setContributionType] = useState('contributors');
  const [subscriptionPageIndex, setSubscriptionPageIndex] = useState(0);
  const [contributionPageIndex, setContributionPageIndex] = useState(0);
  const subscriptions = emptyHome === 'subscriptions' ? [] : expandHomeLists ? paginatedSubscriptions : subscriptionContentFixture;
  const contributors = emptyHome === 'contribution' ? [] : expandHomeLists ? paginatedContributors : contributionContentFixture;
  const subscriptionPage = reportTablePage(subscriptions, subscriptionPageIndex, homePageSize);
  const contributionPage = reportTablePage(contributors, contributionPageIndex, homePageSize);
  const favoriteRecords = useQuery({ queryKey: ['demo', 'favorite-rows'], queryFn: ({ signal }) => readDemoFavoriteRows(signal),
    enabled: activeId === 'home' && !selectedReportId });
  const favoriteRows = emptyHome === 'favorites' ? [] : favoriteRecords.data && (expandFavorites ? paginationReportRows(favoriteRecords.data) : favoriteRecords.data);
  const tableRecords = useQuery({ queryKey: ['demo', 'report-table-records'],
    queryFn: ({ signal }) => readDemoReportRows(signal), enabled: activeId === 'reports' });
  const reportRows = tableRecords.data && (expandReportCatalog ? paginationReportRows(tableRecords.data) : tableRecords.data);
  const summaries = useQuery({ queryKey: ['demo', 'report-summaries'], queryFn: ({ signal }) => demoReportsGateway.list(signal), retry: false });
  const faq = paginationDemo ? paginatedFaq : demoFaq;
  const demoQuestionAppeals = params.get('questionsCase') === 'empty' ? undefined : paginationDemo ? paginatedAppeals : demoAppeals;
  const appeals = useMemo(() => [...submittedAppeals, ...(demoQuestionAppeals ?? [])], [submittedAppeals, demoQuestionAppeals]);
  const searchEntries = useMemo(() => [
    ...demoReportSearchEntries(summaries.data ?? []), ...demoAdditionalSearchEntries,
    ...(paginationDemo ? paginatedAiSearchEntries : aiSearchEntries),
    ...(paginationDemo ? paginatedReferenceSearchEntries : referenceSearchEntries),
    ...demoQuestionSearchEntries(faq, appeals),
  ], [summaries.data, paginationDemo, faq, appeals]);
  const stateReport = navigationState?.report;
  const subscriptionReport = subscriptionContentFixture.find(item => item.report.id === selectedReportId);
  const selectedReport = selectedReportId ? (stateReport?.id === selectedReportId ? stateReport : undefined)
    ?? reportRows?.find(row => row.id === selectedReportId)?.report ?? favoriteRows?.find(row => row.id === selectedReportId)?.report
    ?? (expandedReports && summaries.data ? readPaginationReport(selectedReportId, summaries.data) : undefined)
    ?? summaries.data?.find(report => report.id === selectedReportId)
    ?? (subscriptionReport ? { ...subscriptionReport.report, type: 'report' as const, domain: subscriptionReport.domain } : undefined) : undefined;
  const catalogRows = reportRows && sortReportRows(filterReportRows(reportRows, filters.applied), filters.sort);
  const filteredFavorites = favoriteRows && sortReportRows(filterReportRows(favoriteRows, favoriteFilters.applied), favoriteFilters.sort);
  const tablePage = reportRows && catalogRows && catalogSearchPage(catalogRows, reportRows, tablePageIndex, tablePageSize, reportDestination?.section === 'reports' ? reportDestination.report.id : undefined);
  const favoritePage = favoriteRows && filteredFavorites && catalogSearchPage(filteredFavorites, favoriteRows, favoritePageIndex, favoritePageSize, reportDestination?.section === 'home' ? reportDestination.report.id : undefined);
  const pageMatches = initialSearchHit && searchDestination ? findPageMatches(entriesOnSearchPage(
    searchEntries, searchDestination, reportDestination?.section === 'home' ? favoritePage?.rows : tablePage?.rows, initialSearchHit.query, params,
  ), initialSearchHit.query) : [];
  const initialMatchIndex = pageMatches.findIndex(hit => hit.entry.id === initialSearchHit?.entry.id && hit.value.field === initialSearchHit.value.field);
  const currentStep = searchStep?.selection === searchSelection ? searchStep : undefined;
  const stepped = currentStep !== undefined;
  const matchIndex = currentStep?.index ?? initialMatchIndex;
  const searchHit = pageMatches[matchIndex] ?? initialSearchHit ?? (searchSelection?.highlightDescription ? searchSelection.hit : undefined);
  const landingHit = searchHit && highlightDismissed ? { ...searchHit, highlightDismissed } : searchHit;
  const outsideReportFilters = tablePage?.outside || favoritePage?.outside;
  const cards = favoritePage?.rows.map(row => row.report).filter((report): report is ReportCardData => report.verification !== undefined) ?? [];
  const homeContext = activeId === 'home';
  const activeFilters = homeContext ? favoriteFilters : filters;
  const activeRows = homeContext ? favoriteRows : reportRows;
  const panel = useReportFilterPanel({ context: homeContext ? 'favorites' : 'catalog', rows: activeRows ?? [],
    applied: activeFilters.applied, onApply: activeFilters.replaceApplied, onOpen: activeFilters.close });
  // Browser history is also a navigation boundary: drafts must not follow it
  // into another list. Applied conditions, views and page state survive.
  useLayoutEffect(() => { filters.close(); favoriteFilters.close(); panel.close(); setEditNotice(undefined); }, [location.key]);
  useLayoutEffect(() => { main.current?.scrollTo(0, 0); }, [sidebarEntry]);
  useLayoutEffect(() => {
    if (!pendingDescription) return;
    const { hit, descriptionOrigin } = pendingDescription;
    const destination = hit.entry.destination;
    if (destination?.kind !== 'source' && destination?.kind !== 'metric') return;
    const element = main.current?.querySelector<HTMLElement>(`[data-search-description="${CSS.escape(hit.entry.id)}"]`);
    // Measure the actual list layout before the highlight can expand the description.
    if (!element || !isDescriptionMatchClipped(element, hit)) {
      setCheckedDescription(pendingDescription);
      return;
    }
    const next = new URLSearchParams(location.search);
    const state = { searchSelection: { hit, action: 'detail', highlightDescription: true, highlightToken: pendingDescription.highlightToken } };
    if (destination.kind === 'source') {
      next.set('source', destination.id);
      next.set('sourceTab', 'fields');
      navigate({ search: next.toString() }, { replace: true, state: { ...state, sourceReturnTo: descriptionOrigin } });
    } else {
      next.set('metric', destination.id);
      navigate({ search: next.toString() }, { replace: true, state: { ...state, metricReturnTo: descriptionOrigin } });
    }
  }, [location.search, navigate, pendingDescription]);
  useEffect(() => {
    const root = main.current;
    if (!root || !searchSelection || highlightDismissed || pendingDescription || (searchSelection.action === 'location' && !searchHit)) return;
    const selector = searchSelection.action === 'detail' && !searchSelection.highlightDescription
      ? '[data-report-id] h1, [data-source-detail-id] h1, [data-metric-detail-id] h1'
      : '[data-catalog-search-match]';
    const observer = new MutationObserver(reveal);
    let frame = 0;
    function reveal() {
      const target = root?.querySelector<HTMLElement>(selector);
      if (!target || target.closest('[inert]')) return;
      observer.disconnect();
      frame = requestAnimationFrame(() => {
        if (!target.isConnected) return;
        // A tab or filter change can retain the original search destination.
        // Preserve focus when the user is already interacting with that card.
        if (searchSelection?.action === 'detail' && target.closest('article')?.contains(document.activeElement)) return;
        if (!stepped) {
          const focusTarget = target.closest<HTMLElement>('button, a[href]') ?? target;
          if (focusTarget === target) focusTarget.tabIndex = -1;
          focusTarget.focus({ preventScroll: true });
        }
        (target.closest('[data-table-report-id]') ?? target).scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    }
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['inert'] });
    reveal();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [location.key, searchSelection, highlightDismissed, pendingDescription, searchHit?.entry.id, searchHit?.value.field, searchHit?.occurrence, stepped]);
  function closeOverlays() { filters.close(); favoriteFilters.close(); panel.close(); }
  function openSectionStart(id: string) {
    const next = new URLSearchParams({ section: id });
    // Technical fixture selection changes the available data, not the user's route.
    for (const key of demoCaseParams) {
      const value = params.get(key);
      if (value !== null) next.set(key, value);
    }
    transitionCatalog(() => {
      closeOverlays();
      setEditNotice(undefined);
      if (id === 'reports') {
        filters.resetForNavigation();
        setCatalogView(DEFAULT_VIEW_MODE);
        setTablePageIndex(0);
      }
      if (id === 'home') {
        favoriteFilters.resetForNavigation();
        setHomeViews(defaultHomeViews);
        setFavoritePageIndex(0);
        setContributionType('contributors');
        setSubscriptionPageIndex(0);
        setContributionPageIndex(0);
        newsScroll.current = {};
      }
      if (id === 'ai') aiScrollPosition.current = 0;
      setSidebarEntry(previous => previous + 1);
      setParams(next, { replace: next.toString() === params.toString() && location.state == null });
    });
  }
  function updateLocation(values: Record<string, string | undefined>, options?: { replace?: boolean; state?: unknown }, motion: CatalogTransition = 'screen') {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) next.delete(key); else next.set(key, value);
    }
    transitionCatalog(() => setParams(next, options), motion, next.toString() !== params.toString());
  }
  function clearSearchSelection() {
    if (searchSelection) navigate(location.pathname + location.search, { replace: true });
  }
  function openReport(report: ReportSummary, selection?: SearchSelection) {
    closeOverlays(); setEditNotice(undefined);
    updateLocation({ section: 'reports', report: report.id, reportTab: 'overview', metric: undefined,
      source: undefined, sourceReport: undefined, sourceTab: undefined, [detailTrailParam]: undefined },
    { state: { report, returnTo: location.pathname + location.search, searchSelection: selection } });
  }
  function chooseSearch(hit: SearchHit, action: SearchSelection['action']) {
    const destination = hit.entry.destination;
    if (!destination) return false;
    const origin = location.pathname + location.search;
    const checkDescription = action === 'location' && hit.value.field === 'description' &&
      (destination.kind === 'metric' || destination.kind === 'source' && params.get('sourceView') === 'cards') && destination.hasDetail;
    const selection: SearchSelection = { hit, action, highlightToken, descriptionOrigin: checkDescription ? origin : undefined };
    if (action === 'detail' && !hasSearchDetail(destination)) return false;
    if (action === 'detail' && destination.kind === 'report') {
      openReport(destination.report, selection);
      return true;
    }
    const values: Record<string, string | undefined> = { report: undefined, metric: undefined, news: undefined, source: undefined, sourceReport: undefined, [detailTrailParam]: undefined };
    if (destination.kind === 'report') {
      if (destination.section === 'home' && emptyHome === 'favorites') return false;
      Object.assign(values, { section: destination.section, tab: 'reports', segment: 'favorites' });
    } else if (destination.kind === 'source') {
      Object.assign(values, { section: 'sources', source: action === 'detail' ? destination.id : undefined, sourceTab: action === 'detail' ? 'fields' : undefined });
    } else if (destination.kind === 'metric') {
      Object.assign(values, { section: 'metrics', metric: action === 'detail' ? destination.id : undefined });
    } else if (destination.kind === 'field') {
      Object.assign(values, { section: 'sources', source: destination.sourceId, sourceTab: 'fields' });
    } else if (destination.kind === 'term') {
      Object.assign(values, { section: 'dictionary', dictionaryTab: 'terms' });
    } else if (destination.kind === 'dictionary-domain') {
      Object.assign(values, { section: 'dictionary', dictionaryTab: 'domains' });
    } else if (destination.kind === 'ai-solution') {
      Object.assign(values, { section: 'ai', 'ai.solution': destination.id });
    } else if (destination.kind === 'system-reference') {
      Object.assign(values, { section: 'systems', 'systems.reference': destination.id });
    } else if (destination.kind === 'faq' || destination.kind === 'appeal') {
      Object.assign(values, { section: 'questions', 'questions.tab': destination.kind === 'appeal' ? 'mine' : undefined });
    } else {
      Object.assign(values, { section: 'metrics', metric: destination.metricId });
    }
    closeOverlays();
    updateLocation(values, { state: {
      searchSelection: selection,
      sourceReturnTo: action === 'detail' && destination.kind === 'source' ? origin : undefined,
      metricReturnTo: action === 'detail' && destination.kind === 'metric' ? origin : undefined,
    } });
    return true;
  }
  function returnFromReport() {
    const returnTo = navigationState?.returnTo;
    if (returnTo) transitionCatalog(() => navigate(returnTo, { replace: true, state: searchSelection ? { restoreCatalogSearch: true } : undefined }));
    else updateLocation({ report: undefined, section: 'reports' }, { replace: true });
  }
  function openRelatedDetail(kind: DetailKind, id: string) {
    if (!detail || (detail.kind === kind && detail.id === id)) return;
    closeOverlays();
    const step = new URLSearchParams(params);
    step.delete(detailTrailParam);
    step.set('section', activeId);
    const next = withoutDetail(step);
    next.set(kind, id);
    if (kind === 'report') next.set('reportTab', 'overview');
    if (kind === 'source' && detail.kind === 'report') {
      next.set('sourceReport', detail.id);
      next.set('sourceTab', 'fields');
    }
    for (const ancestor of [...detailTrail, step]) next.append(detailTrailParam, ancestor.toString());
    transitionCatalog(() => setParams(next, { state: {
      detailHistoryDepth: (navigationState?.detailHistoryDepth ?? 0) + 1,
      detailOrigin: detailTrail.length ? navigationState?.detailOrigin : navigationState,
    } satisfies NavigationState }));
  }
  function openDetailAncestor(index: number) {
    const distance = detailTrail.length - index;
    if (distance <= (navigationState?.detailHistoryDepth ?? 0)) {
      navigate(-distance);
      return;
    }
    const next = new URLSearchParams(detailTrail[index]);
    for (const step of detailTrail.slice(0, index)) next.append(detailTrailParam, step.toString());
    const state = index === 0 ? navigationState?.detailOrigin : { detailOrigin: navigationState?.detailOrigin };
    transitionCatalog(() => setParams(next, { replace: true, state }));
  }
  function detailLabel(step: URLSearchParams) {
    const ancestor = readDetail(step)!;
    if (ancestor.kind === 'metric') return metricsGateway.read(ancestor.id)?.title ?? 'Паспорт показателя';
    if (ancestor.kind === 'report') {
      const originReport = navigationState?.detailOrigin?.report;
      return (originReport?.id === ancestor.id ? originReport.title : undefined)
        ?? summaries.data?.find(report => report.id === ancestor.id)?.title
        ?? reportRows?.find(row => row.id === ancestor.id)?.title ?? favoriteRows?.find(row => row.id === ancestor.id)?.title
        ?? (expandedReports && summaries.data ? readPaginationReport(ancestor.id, summaries.data)?.title : undefined) ?? 'Паспорт отчёта';
    }
    const reportId = step.get('sourceReport');
    return (reportId ? reportDetails.read(reportId)?.sources.find(source => source.id === ancestor.id)?.name : undefined)
      ?? sourcesGateway.list().find(source => source.id === ancestor.id)?.technicalName ?? 'Карточка источника';
  }
  const detailBreadcrumbs: DetailCrumb[] | undefined = detailTrail.length ? [
    { label: activeSection.label, onSelect: () => transitionCatalog(() => setParams(withoutDetail(detailTrail[0]), { replace: true })) },
    ...detailTrail.map((step, index) => ({ label: detailLabel(step), onSelect: () => openDetailAncestor(index) })),
  ] : undefined;
  function changeHomeTab(id: string) { closeOverlays(); updateLocation({ tab: id, news: undefined }, undefined, 'tab'); setEditNotice(undefined); }
  function changeHomeSegment(id: string) { closeOverlays(); updateLocation({ segment: id }, undefined, 'tab'); setEditNotice(undefined); }
  function openNews(id: string) {
    updateLocation({ section: 'home', tab: 'news', news: id }, { state: { newsReturnTo: location.pathname + location.search } });
  }
  function backToNews() {
    if ((location.state as { newsReturnTo?: string } | null)?.newsReturnTo) navigate(-1);
    else updateLocation({ news: undefined }, { replace: true });
  }
  function subscriptionIntent(intent: SubscriptionsIntent) {
    if (intent.kind === 'page-change') { setSubscriptionPageIndex(intent.pageIndex); return; }
    if (intent.kind === 'open-report') {
      const report = summaries.data?.find(item => item.id === intent.report.id) ?? favoriteRecords.data?.find(row => row.id === intent.report.id)?.report;
      const sourceSubscription = subscriptions.find(item => item.report.id === intent.report.id);
      openReport(report ?? { id: intent.report.id, title: intent.report.title, type: 'report', domain: sourceSubscription?.domain ?? 'Домен не указан' });
      return;
    }
    setEditNotice(intent.kind === 'unsubscribe' ? 'Отписка не выполнена: серверные действия в демопрототип не подключены.' : 'Переход к боту не выполнен: внешний адрес в документации не определён.');
  }
  const isFavorites = activeId === 'home' && homeTab === 'reports' && homeSegment === 'favorites' && !selectedReportId;
  const isSubscriptions = activeId === 'home' && homeTab === 'reports' && homeSegment === 'subscriptions' && !selectedReportId;
  const isContribution = activeId === 'home' && homeTab === 'reports' && homeSegment === 'contribution' && contributionType === 'contributors' && !selectedReportId;
  const hasFavoriteRows = Boolean(favoriteRows?.length);
  const hasHomeResults = isFavorites && Boolean(favoritePage?.rows.length)
    || isSubscriptions && subscriptions.length > 0
    || isContribution && contributors.length > 0;
  const hasReportRows = Boolean(tableRecords.data?.length);
  const homeView = reportDestination?.section === 'home' ? 'list' : homeViews[homeSegment] ?? DEFAULT_VIEW_MODE;
  const reportsView = reportDestination?.section === 'reports' ? 'list' : catalogView;
  const contentTab = selectedReportId ? params.get('reportTab') || 'overview'
    : isSourceDetail ? params.get('sourceTab') === 'reports' ? 'reports' : 'fields'
    : activeId === 'questions' ? params.get('questions.tab') === 'mine' ? 'mine' : 'faq'
    : activeId === 'dictionary' ? params.get('dictionaryTab') ?? 'all'
    : activeId === 'ai' ? params.get('ai.solution')
    : activeId === 'home' ? JSON.stringify([homeTab, homeTab === 'news' ? selectedNewsId ?? newsCategory : homeSegment, homeSegment === 'contribution' ? contributionType : null])
    : null;
  const screen = hasDetail ? [activeId, detail?.kind, detail?.id]
    : [activeId, activeId === 'systems' ? params.get('systems.reference') : null];
  const view = selectedReportId
    ? params.get('reportTab') === 'metrics' ? params.get('relatedMetricView') === 'cards' ? 'cards' : 'list' : null
    : ({
      home: homeTab === 'reports' ? homeView : null,
      reports: reportsView,
      metrics: params.get('metricView') === 'cards' ? 'cards' : 'list',
      sources: params.get('sourceView') === 'cards' ? 'cards' : 'list',
      systems: params.get('systems.view') === 'list' ? 'list' : 'cards',
    } as Record<string, string | null>)[activeId] ?? null;
  useCatalogTransition(main, JSON.stringify(screen), view, contentTab);
  const onEdit = (report: ReportSummary) => setEditNotice(`Редактирование отчёта «${report.title}» пока не реализовано.`);
  const isAiCatalog = activeId === 'ai' && !selectedReportId;
  const isSystemReferences = activeId === 'systems' && !selectedReportId;
  const isQuestions = activeId === 'questions' && !selectedReportId;
  function submitQuestion(draft: QuestionDraft) {
    const lastMessageAt = new Date().toISOString();
    setSubmittedAppeals(previous => [{
      ...draft, id: `demo-question-${previous.length + 1}`, status: 'new', lastMessageAt,
    }, ...previous]);
  }
  function toggleAiBookmark(id:string) {
    setAiBookmarks(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  return (
    <div className={styles.preview} inert={panel.isOpen || sourcePanelOpen}>
      <Header productName="AI&Data Hub" brandMarkSrc="/images/header/brand-mark.svg"
        avatarSrc="/images/header/profile-avatar.png"
        search={<CatalogSearch entries={searchEntries} sections={searchSections} loading={summaries.isPending} error={summaries.isError}
          routeKey={location.key} restoreOnReturn={Boolean(navigationState?.restoreCatalogSearch)} onChoose={chooseSearch}
          onClearQuery={() => setHighlightToken(createHighlightToken())}
          stepper={searchSelection && !highlightDismissed && !pendingDescription && initialSearchHit && matchIndex >= 0 && pageMatches.length > 1 ? {
            query: initialSearchHit.query,
            index: matchIndex,
            total: pageMatches.length,
            onStep: index => setSearchStep({ selection: searchSelection, index }),
          } : undefined} />} />
      <div className={styles.surface}>
        <div className={styles.sidebarSlot} data-collapsed={collapsed}>
          <Sidebar items={paginationDemo ? paginatedNavigation : expandReportCatalog ? reportPaginationNavigation : navigationFixture} activeId={activeId} collapsed={collapsed}
            onSelect={openSectionStart} onCollapsedChange={setCollapsed} />
        </div>
        <main ref={main} className={styles.review} data-catalog-screen data-list-scroll={isAiCatalog || isSystemReferences ? '' : undefined} data-ai-catalog={isAiCatalog} data-dictionary={activeId === 'dictionary' && !selectedReportId} data-source-detail={isSourceDetail} data-source-catalog={activeId === 'sources' && !hasDetail} data-report-detail={Boolean(selectedReportId)} data-metric-catalog={activeId === 'metrics' && !hasDetail} data-metric-detail={isMetricDetail} data-table-preview={activeId === 'reports' && !hasDetail} data-home-preview={activeId === 'home' && !selectedReportId} data-news-reading={isReadingNews} data-system-references={isSystemReferences ? params.has('systems.reference') ? 'detail' : 'catalog' : undefined} data-questions={isQuestions}>
          <SearchLandingContext.Provider key={sidebarEntry} value={pendingDescription ? undefined : landingHit}>
          {!hasDetail && activeId !== 'metrics' && activeId !== 'sources' && activeId !== 'dictionary' && !isAiCatalog && !isSystemReferences && !isQuestions && <div className={styles.pageHeader}><h1>{activeSection.label}</h1>
            {activeId === 'reports' && !selectedReportId && tablePage && <span className={styles.reportTotal}>{tablePage.total}</span>}
            {activeId === 'reports' && !selectedReportId && hasReportRows && <div className={styles.catalogActions}>
              {Boolean(tablePage?.rows.length) && <ViewPicker selection={{ value: reportsView, onChange: value => { closeOverlays(); clearSearchSelection(); setCatalogView(value); }, inactiveSurface: reportsView === 'cards' ? 'neutral' : 'track' }} />}
              <FilterButton count={reportFilterCount(filters.applied)} onOpen={event => panel.open(event.currentTarget)} onClear={() => filters.replaceApplied({})} />
            </div>}
          </div>}
          {outsideReportFilters && <p className={styles.searchContextNote} role="status">Найденный отчёт показан вне текущих фильтров списка.</p>}
          {selectedReport && <ReportDetail source={reportDetails} key={selectedReport.id} report={selectedReport} tab={params.get('reportTab') ?? 'overview'} empty={params.get('detailEmpty')==='true'}
            onTabChange={id=>updateLocation({reportTab:id},{replace:detailTrail.length > 0,state:location.state},'tab')}
            breadcrumbs={detailBreadcrumbs} onBack={returnFromReport} onOpenSource={id=>openRelatedDetail('source',id)} onOpenMetric={id=>openRelatedDetail('metric',id)} />}
          {(isMetricDetail || activeId === 'metrics' && !hasDetail) && <MetricWorkspace gateway={metricsGateway} breadcrumbs={detailBreadcrumbs} onSubmitQuestion={submitQuestion}
            searchTarget={searchDestination?.kind === 'metric' ? searchDestination.id : undefined}
            onOpenRelatedMetric={id=>openRelatedDetail('metric',id)} onOpenReport={id=>openRelatedDetail('report',id)} />}
          {activeId === 'home' && !selectedReportId && (
            <HomeControls tabs={{ ariaLabel: 'Тип содержимого', items: homeTabs.map(item => ({
              ...item, count: item.id === 'news' ? newsRecords.length : item.id === 'reports' ? favoriteRows?.length : undefined,
            })), selectedId: homeTab, onChange: changeHomeTab }}
              segments={homeTab === 'reports' ? { ariaLabel: 'Раздел отчётов', items: homeReportSegments.map(item => ({...item,count:item.id === 'favorites' ? favoriteRows?.length : item.id === 'subscriptions' ? subscriptions.length : contributors.length})), selectedId: homeSegment, onChange: changeHomeSegment }
                : homeTab === 'news' && !isReadingNews && newsRecords.length > 0 ? { ariaLabel: 'Категории новостей', items: homeNewsCategories.map(item => ({...item,count:filterNewsByCategory(newsRecords,item.id as NewsCategoryId).length})), selectedId: newsCategory, onChange: id => updateLocation({ category: id, news: undefined, newsPage: undefined }, undefined, 'tab') } : undefined}
              contribution={homeTab === 'reports' && homeSegment === 'contribution' && contributors.length > 0 ? { ariaLabel: 'Тип вклада', items: homeContributionTypes, selectedId: contributionType, onChange: setContributionType } : undefined}
              view={hasHomeResults ? { value: homeView, onChange: value => { closeOverlays(); clearSearchSelection(); setHomeViews(previous => ({ ...previous, [homeSegment]: value })); } } : undefined}
              onFilter={isFavorites && hasFavoriteRows ? anchor => panel.open(anchor!) : undefined}
              filterCount={reportFilterCount(favoriteFilters.applied)} onClearFilters={() => favoriteFilters.replaceApplied({})} />
          )}
          {isSubscriptions && <div className={styles.homeResults} data-catalog-view-results data-detail-tab-content>
            <SubscriptionsContent view={homeView} items={subscriptionPage.rows} page={{index:subscriptionPage.pageIndex,size:subscriptionPage.pageSize,total:subscriptionPage.total}} onIntent={subscriptionIntent} viewportOffset={210} />
          </div>}
          {isContribution && <div className={styles.homeResults} data-catalog-view-results data-detail-tab-content>
            <ContributionContent view={homeView} items={contributionPage.rows} page={{index:contributionPage.pageIndex,size:contributionPage.pageSize,total:contributionPage.total}} onIntent={intent => setContributionPageIndex(intent.pageIndex)} viewportOffset={contributors.length ? 210 : 226} />
          </div>}
          {isNews && <div className={styles.newsResults}>
            <NewsContent category={newsCategory} items={newsItems} currentNewsId={selectedNewsId}
              onRead={openNews} onBack={backToNews}
              pageIndex={Number(params.get('newsPage'))} onPageChange={index => {
                newsScroll.current[newsCategory] = 0;
                updateLocation({ newsPage: index ? String(index) : undefined }, { replace: true }, 'tab');
              }}
              onChangeArticle={id => updateLocation({ news: id }, { replace: true, state: location.state }, 'tab')}
              listScrollTop={newsScroll.current[newsCategory] ?? 0} onListScroll={top => { newsScroll.current[newsCategory] = top; }}
              listViewportOffset={newsRecords.length ? 210 : 154} readingViewportOffset={162} />
          </div>}
          {isFavorites && <div className={styles.favoriteResults} data-catalog-view-results data-detail-tab-content>
            {!favoritePage ? favoriteRecords.isError
              ? <EmptyState className={styles.catalogEmpty} role="alert" title="Не удалось загрузить избранное" description="Попробуйте загрузить список ещё раз."
                action={{ label: 'Повторить', onClick: () => { void favoriteRecords.refetch(); } }} />
              : <p role="status">Загрузка избранного…</p>
            : !hasFavoriteRows ? <EmptyFavorites />
            : !favoritePage.rows.length ? <EmptyState className={styles.catalogEmpty} role="status" title="Отчёты не найдены" description="Измените условия или сбросьте фильтры, чтобы снова увидеть избранные отчёты."
              action={{ label: 'Сбросить фильтры', variant: 'filter-reset', onClick: () => favoriteFilters.replaceApplied({}) }} />
            : homeView === 'cards' ? <div className={styles.favoriteCards}>
              <ReportCardGroups key={favoritePage.pageIndex} reports={cards} onOpen={openReport} onEdit={onEdit} viewportOffset={210} bottomReserve={favoritePage.pageCount > 1 ? 80 : 16} />
              <ListPagination {...favoritePage} onPageChange={index => { clearSearchSelection(); setFavoritePageIndex(index); }} label="Страницы избранных отчётов" />
            </div> : <ReportTable {...favoritePage} viewportOffset={210} paginationLabel="Страницы избранных отчётов" searchLandingKey={location.key}
              sort={favoriteFilters.sort && { columnLabel: reportFilterLabels[favoriteFilters.sort.column], direction: favoriteFilters.sort.direction }}
              onPageChange={index => { clearSearchSelection(); setFavoritePageIndex(index); }} onOpen={openReport} onEdit={onEdit}
              activeColumn={favoriteFilters.menu && reportFilterLabels[favoriteFilters.menu.column]}
              appliedColumns={Object.keys(favoriteFilters.applied).map(column => reportFilterLabels[column as keyof typeof reportFilterLabels])}
              onClearColumn={favoriteFilters.clearColumn} onClearSort={favoriteFilters.clearSort} onHeaderLayoutChange={favoriteFilters.reposition}
              onColumnIntent={(column, anchor) => { setEditNotice(undefined); favoriteFilters.open(column, anchor); }} />}
          </div>}
          {activeId === 'reports' && !hasDetail && <div className={styles.reportTable} data-catalog-view-results>
            {!tablePage ? tableRecords.isError
              ? <EmptyState className={styles.catalogEmpty} role="alert" title="Не удалось загрузить отчёты" description="Попробуйте загрузить каталог ещё раз."
                action={{ label: 'Повторить', onClick: () => { void tableRecords.refetch(); } }} />
              : <p role="status">Загрузка отчётов…</p>
            : !hasReportRows ? <EmptyState className={styles.catalogEmpty} title="В каталоге пока нет отчётов" description="Здесь будут отображаться опубликованные отчёты." />
            : !tablePage.rows.length ? <EmptyState className={styles.catalogEmpty} role="status" title="Отчёты не найдены" description="Измените условия или сбросьте фильтры, чтобы вернуться ко всем отчётам."
              action={{ label: 'Сбросить фильтры', variant: 'filter-reset', onClick: () => filters.replaceApplied({}) }} />
            : reportsView === 'cards' ? <div className={styles.catalogCards} data-list-scroll-boundary>
              <ReportCardGroups key={tablePage.pageIndex} reports={tablePage.rows.map(row => row.report).filter((report): report is ReportCardData => report.verification !== undefined)}
                onOpen={openReport} onEdit={onEdit} layout="catalog" viewportOffset={tablePage.pageCount > 1 ? 136 : 226}
                bottomReserve={tablePage.pageCount > 1 ? 80 : 16} />
              <ListPagination {...tablePage} onPageChange={index => { clearSearchSelection(); setTablePageIndex(index); }} />
            </div> : <ReportTable {...tablePage} viewportOffset={120} searchLandingKey={location.key} onPageChange={index => { clearSearchSelection(); setTablePageIndex(index); }} onOpen={openReport}
              sort={filters.sort && { columnLabel: reportFilterLabels[filters.sort.column], direction: filters.sort.direction }}
              onEdit={onEdit}
              activeColumn={filters.menu && reportFilterLabels[filters.menu.column]}
              appliedColumns={Object.keys(filters.applied).map(column => reportFilterLabels[column as keyof typeof reportFilterLabels])}
              onClearColumn={filters.clearColumn} onClearSort={filters.clearSort}
              onHeaderLayoutChange={filters.reposition}
              onColumnIntent={(column, anchor) => { setEditNotice(undefined); filters.open(column, anchor); }} />}
          </div>}
          {editNotice && <div className={styles.notice}><p role="status">{editNotice}</p><button type="button" onClick={() => setEditNotice(undefined)} aria-label="Закрыть уведомление">×</button></div>}
          {(isSourceDetail || activeId === 'sources' && !hasDetail) && <SourcesWorkspace gateway={sourcesGateway} detailsGateway={paginationDemo ? paginationSourceDetailsGateway : undefined}
            breadcrumbs={detailBreadcrumbs} reportDetails={reportDetails} onModalChange={setSourcePanelOpen} searchTarget={searchDestination?.kind === 'source' ? searchDestination.id : undefined} />}
          {activeId === 'dictionary' && !selectedReportId && <DictionaryWorkspace gateway={paginationDemo ? paginationDictionaryGateway : demoDictionaryGateway} />}
          {isAiCatalog && <AiHubCatalog items={paginationDemo ? paginatedAi : demoAiSolutions} scrollPosition={aiScrollPosition} bookmarks={aiBookmarks} onBookmark={toggleAiBookmark}/>}
          {isSystemReferences && <SystemReferencesWorkspace gateway={paginationDemo ? paginationReferencesGateway : demoSystemReferencesGateway} />}
          {isQuestions && <QuestionsWorkspace key={sidebarEntry} faq={faq} appeals={appeals} onSubmitQuestion={submitQuestion}
            onClearSearch={clearSearchSelection} />}
          {selectedReportId && !selectedReport && <section aria-label="Содержимое раздела">
            {summaries.isPending ? <p role="status">Загрузка отчёта…</p> : summaries.isError
              ? <EmptyState className={styles.catalogEmpty} role="alert" title="Не удалось загрузить отчёт" description="Попробуйте ещё раз или выберите другой отчёт в каталоге."
                action={{ label: 'Повторить', onClick: () => { void summaries.refetch(); } }} />
              : <EmptyState className={styles.catalogEmpty} title="Отчёт не найден" description="Проверьте ссылку или выберите отчёт из каталога."
                action={{ label: 'К отчётам', onClick: returnFromReport }} />}
          </section>}
          {!selectedReportId && activeId === 'tasks' && <section aria-label="Содержимое раздела">
            <EmptyState className={styles.catalogEmpty} title="Раздел «Задачи» недоступен" description="В прототипе пока нельзя просматривать задачи." />
          </section>}
          {activeId === 'home' && !selectedReportId && !isFavorites && !isSubscriptions && !isContribution && !isNews &&
            <EmptyState className={styles.catalogEmpty} data-detail-tab-content title="Содержимое недоступно на главной"
              description={homeTab === 'sources' || homeTab === 'ai-hub' ? 'Откройте полный каталог в соответствующем разделе.' : 'Выберите другой раздел на главной.'}
              action={homeTab === 'sources' || homeTab === 'ai-hub' ? {
                label: homeTab === 'sources' ? 'К источникам' : 'В AI Hub',
                onClick: () => updateLocation({ section: homeTab === 'sources' ? 'sources' : 'ai', source: undefined }),
              } : undefined} />}
          </SearchLandingContext.Provider>
        </main>
        <ListScrollIndicator key={location.search} area={main} />
      </div>
      {activeFilters.menu && createPortal(<div ref={activeFilters.popup} className={styles.filterPopup}
        style={{ left: activeFilters.menu.left, top: activeFilters.menu.top }} data-report-column-filter={activeFilters.menu.column}>
        <ColumnFilterMenu label={reportFilterLabels[activeFilters.menu.column]}
          range={isReportNumericAttribute(activeFilters.menu.column) ? { attribute:activeFilters.menu.column,value:activeFilters.menu.range,scaleMax:reportRangeScale(activeRows ?? [],activeFilters.menu.column,activeFilters.menu.range),onChange:activeFilters.changeRange } : undefined}
          options={searchReportFilterOptions(reportFilterOptions(activeRows ?? [], activeFilters.menu.column), activeFilters.menu.search)}
          totalOptionsCount={reportFilterOptions(activeRows ?? [], activeFilters.menu.column).length}
          selectedValues={activeFilters.menu.values} searchValue={activeFilters.menu.search}
          onSearchChange={activeFilters.search} onToggleValue={activeFilters.toggle}
          onReset={activeFilters.resetColumn} onApply={activeFilters.apply}
          sortDirection={activeFilters.menu.sort?.column === activeFilters.menu.column ? activeFilters.menu.sort.direction : undefined}
          onSortChange={activeFilters.changeSort} />
      </div>, document.body)}
      <ReportFilterOverlay controller={panel} context={homeContext ? 'favorites' : 'catalog'} />
    </div>
  );
}
