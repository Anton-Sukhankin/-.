import styles from './SelectionCheck.module.css';

/** Original DS-03 Check; the reserved slot keeps selected and unselected labels aligned. */
export function SelectionCheck({selected}:{selected:boolean}) {
  return <span className={styles.slot} aria-hidden="true">{selected && <img src="/images/dropdown/check.svg" width="24" height="24" alt="" data-selection-check />}</span>;
}
