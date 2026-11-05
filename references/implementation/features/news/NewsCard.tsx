import { OverflowText } from '../../components/OverflowText/OverflowText';
import type { NewsCardProps } from './types';
import styles from './News.module.css';

const labelStyles = {
  Новое: styles.newLabel,
  Важно: styles.importantLabel,
  Изменение: styles.changeLabel,
};

export function NewsCard({ news, onRead }: NewsCardProps) {
  return (
    <article className={styles.card} data-news-id={news.id} onClick={event => { if (!(event.target as Element).closest('button')) onRead(news.id); }}>
      <img className={styles.cover} src={news.imageSrc} width="358" height="156" alt="" />
      <div className={styles.content}>
        <span className={`${styles.label} ${labelStyles[news.label]}`}>{news.label}</span>
        <div className={styles.text}>
          <OverflowText as="h3" className={styles.title} fullText={news.title}>{news.title}</OverflowText>
          <OverflowText as="p" className={styles.summary} fullText={news.summary}>{news.summary}</OverflowText>
        </div>
        <div className={styles.footer}>
          <button type="button" className={styles.read} aria-label={`Читать «${news.title}»`} onClick={() => onRead(news.id)}>Читать</button>
          <time className={styles.date} dateTime={news.dateTime}>{news.dateLabel}</time>
        </div>
      </div>
      <button type="button" className={styles.openCard} aria-label={`Открыть новость «${news.title}»`} onClick={() => onRead(news.id)} />
    </article>
  );
}
