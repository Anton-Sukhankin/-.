import { useLayoutEffect, useRef } from 'react';
import { ListPagination } from '../../components/ListPagination/ListPagination';
import { OverflowText } from '../../components/OverflowText/OverflowText';
import { ContributorCard, type ContributorCardData } from './ContributorCard';
import styles from './ContributionContent.module.css';

export interface ContributionListItem extends ContributorCardData {
  domain: string;
}
export interface ContributionPage { index: number; size: number; total: number }
export type ContributionIntent = { kind: 'page-change'; pageIndex: number };
export interface ContributionContentProps {
  view: 'cards' | 'list';
  /** Current page; identity, rank, metrics and pagination are supplied by the caller. */
  items: readonly ContributionListItem[];
  page: ContributionPage;
  onIntent: (intent: ContributionIntent) => void;
  viewportOffset?: number;
}
const headings = ['Номер', 'Участник', 'Домен', 'Роль', 'Проверок', 'Всего', 'К проверке', 'Проверено'];

export function ContributionContent({ view, items, page, onIntent, viewportOffset = 210 }: ContributionContentProps) {
  const scroll = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (scroll.current) scroll.current.scrollTop = 0; }, [page.index, view]);
  const hasPages = page.total > page.size;
  return <section className={styles.surface} style={{ height: `calc(100vh - ${viewportOffset}px)` }}
    data-contribution-content data-view={view} data-empty={items.length === 0} role={view === 'list' && items.length ? 'table' : undefined} aria-label="Вклад в каталог">
    {items.length === 0 ? <div className={styles.empty}>
      <img src="/images/contributors/empty.png" width="190" height="142" alt="" />
      <h2>Вклад в каталог пока не отображается</h2>
      <p>Здесь появятся участники, которые помогают проверять<br />и поддерживать качество данных.</p>
    </div> : <>
      {view === 'list' && <div role="rowgroup" className={styles.tableHeader}>
        <div role="row" className={styles.grid}>
          {headings.map((label, index) => <div role="columnheader" className={styles.heading} key={label}><span className={index >= 4 && index <= 6 ? styles.metricHeading : undefined}>{label}</span></div>)}
        </div>
      </div>}
      <div className={styles.body}>
        <div ref={scroll} className={styles.scroll} tabIndex={0} aria-label="Прокрутка вклада" data-contribution-scroll data-list-scroll>
          <div className={styles.content} style={{ paddingBottom: hasPages ? 80 : 16 }}>
            {view === 'cards' ? <div className={styles.cardGroup}>
              {items.map(contributor => <ContributorCard key={contributor.id} contributor={contributor} />)}
            </div> : <div className={styles.tableGroup} role="rowgroup">
              {items.map(contributor => <div role="row" className={`${styles.grid} ${styles.tableRow}`} key={contributor.id} data-contributor-row-id={contributor.id}>
                <div role="cell" className={`${styles.cell} ${styles.rankCell}`}><span className={styles.rank} aria-label={`Место ${contributor.rankLabel}`}>{contributor.rankLabel}</span></div>
                <div role="cell" className={styles.cell}><div className={styles.person}>
                  <span>{contributor.name}</span>
                  <OverflowText className={styles.description} fullText={contributor.department}>{contributor.department}</OverflowText>
                </div></div>
                <div role="cell" className={`${styles.cell} ${styles.domain}`}>{contributor.domain}</div>
                <div role="cell" className={styles.cell}><span className={styles.role}>{contributor.roleLabel}</span></div>
                {contributor.metrics.map((metric, index) => <div role="cell" className={styles.cell} key={index}>{metric.value}</div>)}
              </div>)}
            </div>}
          </div>
        </div>
      </div>
      <ListPagination total={page.total} pageIndex={page.index} pageSize={page.size}
        onPageChange={pageIndex => onIntent({ kind: 'page-change', pageIndex })} label="Страницы вклада в каталог" />
    </>}
  </section>;
}
