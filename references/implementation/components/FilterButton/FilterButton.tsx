import type { MouseEventHandler } from 'react';
import styles from './FilterButton.module.css';

export function FilterButton({ count = 0, label = 'Открыть фильтры отчётов', onOpen, onClear }: {
  count?: number;
  label?: string;
  onOpen: MouseEventHandler<HTMLButtonElement>;
  onClear?: () => void;
}) {
  return <div className={styles.trigger}>
    <button type="button" className={styles.open} aria-label={label} aria-haspopup="dialog" onClick={onOpen} data-control-action="filter">
      <img src={`/images/filter-trigger/${count > 0 ? 'applied' : 'default'}.svg`} width="16" height="16" alt="" aria-hidden="true" />
    </button>
    {count > 0 && <button type="button" className={styles.count} aria-label={`Сбросить все фильтры: ${count} ${count === 1 ? 'атрибут' : count < 5 ? 'атрибута' : 'атрибутов'}`} onClick={onClear}>
      <span>{count}</span><img src="/images/filter-trigger/reset-hover.svg" width="14" height="14" alt="" aria-hidden="true" />
    </button>}
  </div>;
}
