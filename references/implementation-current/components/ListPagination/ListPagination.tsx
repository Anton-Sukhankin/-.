import styles from './ListPagination.module.css';

export function ListPagination({ total, pageIndex, pageSize, onPageChange, label = 'Страницы отчётов', sticky = false }: {
  total: number; pageIndex: number; pageSize: number; onPageChange: (page: number) => void; label?: string; sticky?: boolean;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  return <nav className={styles.pagination} data-sticky={sticky || undefined} aria-label={label}>
    <div className={styles.pages}>
      <button type="button" aria-label="Предыдущая страница" disabled={pageIndex === 0} onClick={() => onPageChange(pageIndex - 1)}><img src="/images/report-table/chevron-left.svg" width="16" height="16" alt="" /></button>
      {Array.from({ length: pages }, (_, index) => <button type="button" key={index} aria-current={index === pageIndex ? 'page' : undefined} onClick={() => onPageChange(index)}>{index + 1}</button>)}
      <button type="button" aria-label="Следующая страница" disabled={pageIndex === pages - 1} onClick={() => onPageChange(pageIndex + 1)}><img src="/images/report-table/chevron-right.svg" width="16" height="16" alt="" /></button>
    </div>
    <span>{pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, total)} из {total} · {pageSize} на странице</span>
  </nav>;
}
