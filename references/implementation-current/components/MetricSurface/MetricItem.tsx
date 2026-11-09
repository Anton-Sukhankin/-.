import { RoundIconButton } from '../RoundIconButton/RoundIconButton';
import type { MouseEvent } from 'react';
import { OverflowText } from '../OverflowText/OverflowText';
import { SearchTargetText } from '../Search/SearchMatch';
import s from './MetricSurface.module.css';

export function MetricTitle({ title, onOpen, searchKey }: { title: string; onOpen: () => void; searchKey?: string }) {
  return <OverflowText as="button" type="button" className={s.title} fullText={title} onClick={onOpen}>
    {searchKey ? <SearchTargetText id={searchKey} field="title" text={title} /> : title}
  </OverflowText>;
}

export function MetricDescription({ text, lines = 1, searchKey }: { text: string; lines?: 1 | 2; searchKey?: string }) {
  const description = text || 'Описание не заполнено.';
  return <OverflowText as="p" className={`${s.description} ${lines === 2 ? s.tableDescription : ''}`} fullText={description} data-search-description={searchKey}>
    {searchKey ? <SearchTargetText id={searchKey} field="description" text={description} /> : description}
  </OverflowText>;
}

/** Same independent demo actions in every metric list. No successful save is implied. */
export function MetricActions({ title, onNotice }: { title: string; onNotice: (text: string) => void }) {
  return <div className={s.actions}>
    <RoundIconButton icon="edit" aria-label={`Редактировать «${title}»`} onClick={() => onNotice(`Редактирование «${title}» пока не реализовано.`)} />
    <RoundIconButton icon="bookmark" aria-label={`Добавить «${title}» в избранное`} onClick={() => onNotice(`Закладка «${title}» не сохранена: серверное действие не подключено.`)} />
  </div>;
}

export function openMetricFromSurface(event: MouseEvent<HTMLElement>, onOpen: () => void) {
  if (!(event.target as Element).closest('button')) onOpen();
}
