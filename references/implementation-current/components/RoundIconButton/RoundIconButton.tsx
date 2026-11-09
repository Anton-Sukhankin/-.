import type { ComponentPropsWithoutRef } from 'react';
import s from './RoundIconButton.module.css';

const icons = {
  edit: '/images/report-detail/chrome/edit.svg',
  bookmark: '/images/report-detail/chrome/bookmark.svg',
  back: '/images/news/reading-back.svg',
  open: '/images/report-table/chevron-right.svg',
  chevron: '/images/metrics/catalog/chevron-down.svg',
  close: '/images/filter-panel/close-catalog.svg',
} as const;

type Props = Omit<ComponentPropsWithoutRef<'button'>, 'children'> & { icon: keyof typeof icons };

/** Shared outlined action, with a compact size for back; the caller owns behavior and accessible name. */
export function RoundIconButton({ icon, className = '', type = 'button', ...props }: Props) {
  return <button {...props} type={type} className={`${s.button} ${className}`} data-round-action={icon}>
    <span className={s.glyph} aria-hidden="true" style={{ maskImage: `url("${icons[icon]}")` }} />
  </button>;
}
