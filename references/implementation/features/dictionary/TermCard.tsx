import { useId } from 'react';
import { RoundIconButton } from '../../components/RoundIconButton/RoundIconButton';
import type { DictionaryTerm } from '../../data/dictionary';
import s from './Dictionary.module.css';
import { SearchTargetText } from '../../components/Search/SearchMatch';
import { searchId } from '../../data/catalogSearch';

export function TermCard({ term, onEdit }: { term: DictionaryTerm; onEdit: (term: DictionaryTerm) => void }) {
  const titleId = useId();
  const target = searchId('term', term.id);
  return <article className={s.term} aria-labelledby={titleId} data-dictionary-term={term.id}>
    <header className={s.termHeader}>
      <h3 id={titleId}><SearchTargetText id={target} field="title" text={term.name} /></h3>
      <div className={s.termTools}>
        <span className={`${s.tag} ${s.typeTag}`}>{term.type}</span>
        <span className={`${s.tag} ${s.statusTag}`} data-approved={term.status === 'Утверждён'}>{term.status}</span>
        <RoundIconButton icon="edit" aria-label={`Редактировать термин «${term.name}»`} onClick={() => onEdit(term)} />
      </div>
    </header>
    <dl className={s.attributes}>
      <div className={s.description} data-description-complete={term.descriptionComplete}>
        <dt>Описание</dt><dd><SearchTargetText id={target} field="description" text={term.description} /></dd>
      </div>
      <div><dt>Домен</dt><dd>{term.domain ?? 'Без домена'}</dd></div>
      <div><dt>Владелец</dt><dd>{term.owner ?? 'Не указан'}</dd></div>
    </dl>
  </article>;
}
