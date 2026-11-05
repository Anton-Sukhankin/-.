import { useSearchParams, useLocation } from 'react-router';
import { OverflowText } from '../../../components/OverflowText/OverflowText';
import { MetricActions, MetricDescription, MetricTitle, openMetricFromSurface } from '../../../components/MetricSurface/MetricItem';
import { useLayoutEffect, useRef, useState } from 'react';
import { DEFAULT_VIEW_MODE, ViewPicker } from '../../../components/HomeControls/HomeControls';
import { ListPagination } from '../../../components/ListPagination/ListPagination';
import { SingleSelect } from '../../../components/SingleSelect/SingleSelect';
import { demoMetricsSource } from './demoSource';
import { filterMetrics, metricPage } from './model';
import type { MetricsSource, RelatedMetric } from './model';
import styles from './MetricsTab.module.css';

/** Data boundary: a real source can be supplied without changing the view. */
export function MetricsTab({ reportId, source = demoMetricsSource, onOpenMetric }: { reportId: string; source?: MetricsSource; onOpenMetric?: (id: string) => void }) {
  return <MetricsView key={reportId} items={source.read(reportId)} onOpenMetric={onOpenMetric} />;
}

function MetricsView({ items, onOpenMetric }: { items: readonly RelatedMetric[] | undefined; onOpenMetric?: (id: string) => void }) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const view = params.get('relatedMetricView') === 'cards' ? 'cards' : DEFAULT_VIEW_MODE;
  const query = params.get('relatedMetricQuery') ?? '';
  const type = params.get('relatedMetricType') ?? '';
  const status = params.get('relatedMetricStatus') ?? '';
  const pageIndex = Math.max(0, Number(params.get('relatedMetricPage')) || 0);
  function update(values: Record<string, string>) {
    setParams(previous => { const next = new URLSearchParams(previous); for (const [key, value] of Object.entries(values)) {
      if (value) next.set('relatedMetric' + key, value); else next.delete('relatedMetric' + key);
    } return next; }, { replace: true, state: location.state });
  }
  const setView = (value: 'cards' | 'list') => update({ View: value });
  const setQuery = (value: string) => update({ Query: value, Page: '' });
  const setType = (value: string) => update({ Type: value, Page: '' });
  const setStatus = (value: string) => update({ Status: value, Page: '' });
  const setPageIndex = (value: number) => update({ Page: String(value) });
  const [notice, setNotice] = useState<string>();
  const scroll = useRef<HTMLDivElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const [availableHeight,setAvailableHeight] = useState<number>();
  const types = [...new Set(items?.map(item => item.type) ?? [])];
  const statuses = [...new Set(items?.map(item => item.status) ?? [])];
  const page = metricPage(filterMetrics(items ?? [], { query, type, status }), pageIndex);
  const hasPages = page.total > page.pageSize;
  useLayoutEffect(() => { if (scroll.current) scroll.current.scrollTop = 0; }, [page.pageIndex, query, type, status, view]);
  useLayoutEffect(()=>{
    const frame=results.current;
    if(!frame)return;
    let active=true;
    const measure=()=>{if(active)setAvailableHeight(Math.max(0,window.innerHeight-frame.getBoundingClientRect().top-8));};
    measure();
    const observer=new ResizeObserver(measure);
    if(frame.parentElement)observer.observe(frame.parentElement);
    window.addEventListener('resize',measure);
    document.fonts.addEventListener('loadingdone',measure);
    void document.fonts.ready.then(measure);
    return()=>{active=false;observer.disconnect();window.removeEventListener('resize',measure);document.fonts.removeEventListener('loadingdone',measure);};
  },[]);

  const actions = (item: RelatedMetric) => <MetricActions title={item.title} onNotice={setNotice} />;
  const title = (item: RelatedMetric) => <MetricTitle title={item.title} onOpen={() => onOpenMetric?.(item.metricId)} />;

  return <section className={styles.metrics} aria-label="Метрики и показатели отчёта" data-report-metrics>
    <div className={styles.toolbar}>
      <label className={styles.search}><img src="/icons/search/search.svg" width="16" height="16" alt="" />
        <input aria-label="Поиск метрик по названию, домену или формуле" placeholder="Поиск по названию, домену или формуле" value={query}
          onChange={event => { setQuery(event.target.value); }} />
        {query && <button type="button" aria-label="Очистить поиск метрик" onClick={() => { setQuery(''); }}>×</button>}
      </label>
      <SingleSelect label="Тип метрики" className={styles.select} value={type} onValueChange={setType} options={[{value:'',label:'Все типы'},...types.map(value=>({value,label:value}))]}/>
      <SingleSelect label="Статус метрики" className={styles.select} value={status} onValueChange={setStatus} options={[{value:'',label:'Все статусы'},...statuses.map(value=>({value,label:value}))]}/>
      <ViewPicker selection={{ value: view, onChange: setView, ariaLabel: 'Представление метрик' }} />
    </div>
    <div ref={results} className={styles.results} style={availableHeight===undefined?undefined:{height:availableHeight}}>
      <div ref={scroll} className={styles.scroll} data-has-pages={hasPages}>
        {items === undefined ? <p className={styles.empty} role="status">Для этого отчёта связанные показатели в демонстрационном наборе не определены.</p>
          : page.total === 0 ? <p className={styles.empty} role="status">По заданным условиям показатели не найдены.</p>
          : view === 'cards' ? <div className={styles.cards}>{page.items.map(item => <article key={item.id} className={styles.card} data-metric-id={item.id} data-canonical-metric-id={item.metricId} onClick={event => openMetricFromSurface(event, () => onOpenMetric?.(item.metricId))}>
            <div className={styles.cardHeading}><div>{title(item)}<MetricDescription text={item.description} /></div>{actions(item)}</div>
            <div className={styles.cardFooter}><div className={styles.tags}><span className={styles.type}>{item.type}</span><span>{item.status}</span><OverflowText className={styles.domainTag} fullText={item.domain}>{item.domain}</OverflowText><span>Ед. изм.: {item.unit}</span></div>
              <div className={styles.updated}><span>Обновлено</span><span>{item.updated}</span></div></div>
          </article>)}</div>
          : <table className={styles.table} aria-label="Связанные показатели"><colgroup>{Array.from({length:7},(_,index)=><col key={index}/>)}</colgroup><thead><tr>{['Наименование', 'Тип', 'Статус', 'Домен', 'Ед. изм.', 'Обновлено', 'Действия'].map(label => <th scope="col" key={label}>{label === 'Действия' ? <span className={styles.srOnly}>{label}</span> : label}</th>)}</tr></thead>
            <tbody>{page.items.map(item => <tr key={item.id} data-metric-id={item.id} data-canonical-metric-id={item.metricId} onClick={event => openMetricFromSurface(event, () => onOpenMetric?.(item.metricId))}>
              <td>{title(item)}<MetricDescription text={item.description} lines={2} /></td><td><span className={styles.type}>{item.type}</span></td><td><OverflowText className={styles.cellText} fullText={item.status}>{item.status}</OverflowText></td><td><OverflowText className={styles.cellText} fullText={item.domain}>{item.domain}</OverflowText></td><td><OverflowText className={styles.cellText} fullText={item.unit}>{item.unit}</OverflowText></td><td>{item.updated}</td><td>{actions(item)}</td>
            </tr>)}</tbody>
          </table>}
      </div>
      <ListPagination total={page.total} pageIndex={page.pageIndex} pageSize={page.pageSize} onPageChange={setPageIndex} label="Страницы метрик отчёта" />
    </div>
    {notice && <div className={styles.notice} role="status"><span>{notice}</span><button type="button" aria-label="Закрыть уведомление метрик" onClick={() => setNotice(undefined)}>×</button></div>}
  </section>;
}
