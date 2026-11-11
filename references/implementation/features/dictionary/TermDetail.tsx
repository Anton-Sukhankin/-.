import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Accordion } from '../../components/Accordion/Accordion';
import { AttributeValue } from '../../components/AttributeValue/AttributeValue';
import { DetailBreadcrumbs } from '../../components/DetailHeader/DetailBreadcrumbs';
import { DetailInformationHeading, DetailInformationPerson } from '../../components/DetailHeader/DetailInformation';
import { DetailSecondary } from '../../components/DetailHeader/DetailSecondary';
import { useDetailScroll } from '../../components/DetailHeader/useDetailScroll';
import chrome from '../../components/DetailHeader/DetailHeader.module.css';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import type { DictionaryTerm, DictionaryTermPerson } from '../../data/dictionary';
import { TermTags } from './TermCard';
import s from './TermDetail.module.css';

const relationGroups = [
  ['process', 'Связанные процессы'],
  ['term', 'Связанные термины'],
  ['report', 'Связанные отчёты'],
  ['source', 'Источники'],
  ['field', 'Поля'],
  ['metric', 'Бизнес-метрики'],
  ['indicator', 'Бизнес-показатели'],
] as const;

function TermAttribute({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <div className={className}><dt>{label}</dt><dd>{children}</dd></div>;
}

function TermPerson({ role, person, fallback }: { role: string; person?: DictionaryTermPerson; fallback?: string }) {
  return person
    ? <DetailInformationPerson role={role} name={person.name} description={person.position} avatar={person.avatar} />
    : <dl><TermAttribute label={role}><AttributeValue value={fallback} /></TermAttribute></dl>;
}

export function TermDetail({ term, onBack }: { term?: DictionaryTerm; onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const { compact, scroll, onScroll } = useDetailScroll();
  useLayoutEffect(() => heading.current?.focus({ preventScroll: true }), []);
  const details = term?.details;
  const people = details?.demoPeople;

  return <section className={`${chrome.frame} ${s.detail}`} data-dictionary-term-detail data-detail-compact={compact} aria-label="Карточка термина">
    <header className={`${chrome.chrome} ${s.heading}`}>
      <DetailSecondary compact={compact}>
        <div className={chrome.breadcrumbRow}><DetailBreadcrumbs
          ancestors={[{ label: 'Бизнес-словарь', onSelect: onBack }]} current="Карточка термина" /></div>
      </DetailSecondary>
      <h1 className={chrome.title} tabIndex={-1} ref={heading}>{term?.name ?? 'Термин не найден'}</h1>
    </header>
    <div ref={scroll} className={`${chrome.scroll} ${s.scroll}`} data-detail-scroll data-list-scroll
      onScrollCapture={onScroll} tabIndex={0} role="region" aria-label="Содержимое карточки термина">
      {term ? <div className={`${chrome.scrollContent} ${s.columns}`}>
        <div className={s.mainColumn}>
          <Accordion title="Краткое описание">
            <div className={s.tags}><TermTags term={term} /></div>
            <p><AttributeValue value={term.description} /></p>
          </Accordion>
          <Accordion title="Полное описание">
            {details?.fullDescription
              ? details.fullDescription.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)
              : <p><AttributeValue value={null} /></p>}
          </Accordion>
          <dl className={s.relations} aria-label="Синонимы и связи">
            <TermAttribute label="Синонимы"><AttributeValue value={details?.synonyms?.join(' · ')} /></TermAttribute>
            {relationGroups.map(([kind, label]) => {
              const names = details?.relations?.filter(relation => relation.kind === kind).map(relation => relation.name).join(' · ');
              return <TermAttribute key={kind} label={label}>
                {details?.relations && !names ? <span className={s.noRelations}>Связи не добавлены</span> : <AttributeValue value={names} />}
              </TermAttribute>;
            })}
          </dl>
        </div>
        <aside className={s.information} aria-label="Сведения">
          <DetailInformationHeading description={`Атрибуты и история изменений термина${people ? ' · Демо' : ''}`} />
          <dl><TermAttribute label="Домен">{term.domain ?? 'Без домена'}</TermAttribute></dl>
          <TermPerson role="Владелец" person={people?.owner} fallback={term.owner ?? 'Не указан'} />
          <TermPerson role="Ответственный" person={people?.responsible} fallback={details?.responsible === null ? 'Не указан' : details?.responsible} />
          <dl className={s.history}>
            <TermAttribute className={s.date} label="Создано"><AttributeValue value={details?.created} /></TermAttribute>
            <TermAttribute className={s.date} label="Обновлено"><AttributeValue value={details?.updated} /></TermAttribute>
            <TermAttribute label="Автор изменений"><AttributeValue value={details?.changeAuthor} /></TermAttribute>
          </dl>
        </aside>
      </div> : <div className={chrome.scrollContent}>
        <EmptyState title="Карточка недоступна" description="Проверьте ссылку или вернитесь в бизнес-словарь."
          action={{ label: 'К списку', onClick: onBack }} />
      </div>}
    </div>
  </section>;
}
