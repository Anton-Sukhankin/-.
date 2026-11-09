import type { ReactNode } from 'react';
import { ResetBadge } from '../ResetBadge/ResetBadge';
import styles from './ColumnReset.module.css';

export function ColumnReset({ label, onReset, children }: { label: string; onReset: () => void; children: ReactNode }) {
  return <button type="button" className={styles.button} aria-label={label} onClick={event => {
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')?.focus();
    onReset();
  }}>
    <span className={styles.indicator} aria-hidden="true">{children}</span>
    <ResetBadge className={styles.cross} compact />
  </button>;
}
