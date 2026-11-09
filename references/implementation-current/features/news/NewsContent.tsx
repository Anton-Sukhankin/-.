import { useLayoutEffect, useRef } from 'react';
import { RoundIconButton } from '../../components/RoundIconButton/RoundIconButton';
import { OverflowText } from '../../components/OverflowText/OverflowText';
import { ListPagination } from '../../components/ListPagination/ListPagination';
import { paginate } from '../../data/pagination';
import { NewsList } from './NewsList';
import type { NewsArticle, NewsCategoryId, NewsContentProps } from './types';
import styles from './NewsReading.module.css';

const categoryLabels: Record<Exclude<NewsCategoryId, 'all'>, NewsArticle['label']> = {
  new: 'Новое', important: 'Важно', changes: 'Изменение',
};

/** Accepted demo categorization: labels only, without read/unread changes. */
export function filterNewsByCategory<T extends { label: NewsArticle['label'] }>(items: readonly T[], category: NewsCategoryId): readonly T[] {
  return category === 'all' ? items : items.filter(item => item.label === categoryLabels[category]);
}

function NewsListSurface({ items, onRead, scrollTop, onScroll, viewportOffset, pageIndex, onPageChange }: {
  items: readonly NewsArticle[];
  onRead: (id: string) => void;
  scrollTop: number;
  onScroll?: (top: number) => void;
  viewportOffset: number;
  pageIndex: number;
  onPageChange: (index: number) => void;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const page = paginate(items, pageIndex);
  useLayoutEffect(() => { if (scroll.current) scroll.current.scrollTop = scrollTop; }, [scrollTop, page.pageIndex]);
  return <section className={`${styles.listSurface} ${items.length === 0 ? styles.emptyListSurface : ''}`} style={{ height: `calc(100vh - ${viewportOffset}px)` }} aria-label="Список новостей" data-detail-tab-content>
    <div ref={scroll} className={styles.listScroll} data-news-list-scroll data-list-scroll data-paginated={page.pageCount > 1} onScroll={event => onScroll?.(event.currentTarget.scrollTop)}>
      <NewsList items={page.rows} onRead={onRead} />
    </div>
    <ListPagination {...page} label="Страницы новостей" onPageChange={onPageChange} />
  </section>;
}

function NewsReading({ news, items, onBack, onChangeArticle, viewportOffset }: {
  news: NewsArticle;
  items: readonly NewsArticle[];
  onBack: () => void;
  onChangeArticle: (id: string) => void;
  viewportOffset: number;
}) {
  const article = useRef<HTMLElement>(null);
  const [intro, ...body] = news.blocks;
  useLayoutEffect(() => {
    const surface = article.current;
    if (!surface) return;
    surface.scrollTop = 0;
    surface.parentElement?.scrollTo(0, 0);
  }, [news.id]);

  return <section className={styles.reading} style={{ height: `calc(100vh - ${viewportOffset}px)` }} aria-label="Чтение новости" data-news-reading={news.id}>
    <div className={styles.columns} data-news-columns>
      <article className={styles.article} ref={article} tabIndex={0} aria-labelledby={`news-title-${news.id}`} data-news-article-scroll data-detail-tab-content>
        <div className={styles.fullArticle} data-news-full-article>
          <header className={styles.articleHeader}>
            <div className={styles.articleMeta}>
              <RoundIconButton icon="chevron" aria-label="Все новости" title="Вернуться к списку новостей" onClick={onBack} />
              <time dateTime={news.dateTime}>{news.dateLabel}</time>
              <span className={`${styles.navTag} ${styles.articleTag}`} data-tone={news.label}>{news.label}</span>
            </div>
            <h2 id={`news-title-${news.id}`}>{news.title}</h2>
            {intro?.kind === 'paragraph' && <p data-news-block>{intro.text}</p>}
          </header>
          <img className={styles.hero} src={news.heroSrc} width="680" height="304" alt="" />
          <div className={styles.articleBody}>
            {(intro?.kind === 'paragraph' ? body : news.blocks).map((block, blockIndex) => block.kind === 'heading'
              ? <h3 key={blockIndex} data-news-block>{block.text}</h3>
              : <p key={blockIndex} data-news-block>{block.text}</p>)}
          </div>
          <footer className={styles.articleFooter}>
            <button type="button" onClick={onBack}>Все новости</button>
          </footer>
        </div>
      </article>
      <aside className={styles.sidebar} aria-label="Новости текущей категории" data-news-sidebar data-list-scroll="local">
        {items.map(item => <button type="button" key={item.id} className={styles.navCard} data-news-nav-id={item.id}
          aria-current={item.id === news.id ? 'page' : undefined}
          onClick={() => {
            if (item.id === news.id) return;
            article.current?.focus({ preventScroll:true });
            onChangeArticle(item.id);
          }}>
          <span className={styles.navText}>
            <span className={styles.navMeta}>
              <span className={styles.navTag} data-tone={item.label}>{item.label}</span>
              <time dateTime={item.dateTime}>{item.navigationDateLabel}</time>
            </span>
            <OverflowText className={styles.navTitle} fullText={item.title}>{item.title}</OverflowText>
          </span>
          <img src={item.imageSrc} width="64" height="60" alt="" />
        </button>)}
      </aside>
    </div>
  </section>;
}

/** Controlled Home surface. The caller owns category, routing/history and list scroll memory. */
export function NewsContent({ category, items, currentNewsId, onRead, onBack, onChangeArticle, pageIndex = 0, onPageChange, listScrollTop = 0, onListScroll, listViewportOffset = 210, readingViewportOffset = 154 }: NewsContentProps) {
  const current = items.find(item => item.id === currentNewsId);
  return <div className={styles.content} data-news-category={category}>
    {current
      ? <NewsReading news={current} items={items} onBack={onBack} onChangeArticle={onChangeArticle} viewportOffset={readingViewportOffset} />
      : <NewsListSurface items={items} onRead={onRead} scrollTop={listScrollTop} onScroll={onListScroll} viewportOffset={listViewportOffset} pageIndex={pageIndex} onPageChange={onPageChange} />}
  </div>;
}
