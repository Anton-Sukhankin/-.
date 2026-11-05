import { OverflowText } from '../../components/OverflowText/OverflowText';
import { useLayoutEffect, useRef } from 'react';
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

function NewsListSurface({ items, onRead, scrollTop, onScroll, viewportOffset }: {
  items: readonly NewsArticle[];
  onRead: (id: string) => void;
  scrollTop: number;
  onScroll?: (top: number) => void;
  viewportOffset: number;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (scroll.current) scroll.current.scrollTop = scrollTop; }, [scrollTop]);
  return <section className={`${styles.listSurface} ${items.length === 0 ? styles.emptyListSurface : ''}`} style={{ height: `calc(100vh - ${viewportOffset}px)` }} aria-label="Список новостей">
    <div ref={scroll} className={styles.listScroll} data-news-list-scroll onScroll={event => onScroll?.(event.currentTarget.scrollTop)}>
      <NewsList items={items} onRead={onRead} />
    </div>
  </section>;
}

function NewsReading({ news, items, onBack, onChangeArticle, viewportOffset }: {
  news: NewsArticle;
  items: readonly NewsArticle[];
  onBack: () => void;
  onChangeArticle: (id: string) => void;
  viewportOffset: number;
}) {
  const index = items.findIndex(item => item.id === news.id);
  const previous = items[index - 1];
  const next = items[index + 1];
  return <section className={styles.reading} style={{ height: `calc(100vh - ${viewportOffset}px)` }} aria-label="Чтение новости" data-news-reading={news.id}>
    <nav className={styles.navigation} aria-label="Навигация по новостям" data-news-navigation>
      <div className={styles.back}><button className={styles.backLabel} type="button" title="Вернуться к списку новостей" onClick={onBack}>Все новости</button></div>
      <div className={styles.position}>
        <span className={styles.counter} data-news-position>Новость {index + 1} из {items.length}</span>
        <button type="button" className={styles.arrow} aria-label="Предыдущая новость" disabled={!previous} onClick={() => previous && onChangeArticle(previous.id)}>
          <img src="/images/news/reading-previous.svg" alt="" aria-hidden="true" />
        </button>
        <button type="button" className={styles.arrow} aria-label="Следующая новость" disabled={!next} onClick={() => next && onChangeArticle(next.id)}>
          <img src="/images/news/reading-next.svg" alt="" aria-hidden="true" />
        </button>
      </div>
    </nav>
    <div className={styles.columns} data-news-columns>
      {/* A new selected ID mounts a fresh native scroll container at the article top. */}
      <article className={styles.article} key={news.id} tabIndex={0} aria-labelledby={`news-title-${news.id}`} data-news-article-scroll>
        <div className={styles.fullArticle} data-news-full-article>
          <img className={styles.hero} src={news.heroSrc} width="680" height="250" alt="" />
          <div className={styles.articleText}>
            <div className={styles.articleMeta}>
              <span className={styles.articleTag}>{news.label}</span>
              <time dateTime={news.dateTime}>{news.dateLabel}</time>
            </div>
            <h2 id={`news-title-${news.id}`}>{news.title}</h2>
            {news.blocks.map((block, blockIndex) => block.kind === 'heading'
              ? <h3 key={blockIndex} data-news-block>{block.text}</h3>
              : <p key={blockIndex} data-news-block>{block.text}</p>)}
            <footer className={styles.articleFooter}>
              <button type="button" onClick={onBack}>← Все новости</button>
              <button type="button" disabled={!next} onClick={() => next && onChangeArticle(next.id)}>Следующая новость →</button>
            </footer>
          </div>
        </div>
      </article>
      <aside className={styles.sidebar} aria-label="Новости текущей категории" data-news-sidebar>
        {items.map(item => <button type="button" key={item.id} className={styles.navCard} data-news-nav-id={item.id} aria-current={item.id === news.id ? 'page' : undefined}
          onClick={() => onChangeArticle(item.id)}>
          <span className={styles.navMeta}>
            <span className={`${styles.navTag} ${item.label === 'Новое' ? styles.newTag : item.label === 'Важно' ? styles.importantTag : styles.changeTag}`}>{item.label}</span>
            <time dateTime={item.dateTime}>{item.navigationDateLabel}</time>
          </span>
          <OverflowText className={styles.navTitle} fullText={item.title}>{item.title}</OverflowText>
        </button>)}
      </aside>
    </div>
  </section>;
}

/** Controlled Home surface. The caller owns category, routing/history and list scroll memory. */
export function NewsContent({ category, items, currentNewsId, onRead, onBack, onChangeArticle, listScrollTop = 0, onListScroll, listViewportOffset = 210, readingViewportOffset = 154 }: NewsContentProps) {
  const current = items.find(item => item.id === currentNewsId);
  return <div className={styles.content} data-news-category={category}>
    {current
      ? <NewsReading news={current} items={items} onBack={onBack} onChangeArticle={onChangeArticle} viewportOffset={readingViewportOffset} />
      : <NewsListSurface items={items} onRead={onRead} scrollTop={listScrollTop} onScroll={onListScroll} viewportOffset={listViewportOffset} />}
  </div>;
}
