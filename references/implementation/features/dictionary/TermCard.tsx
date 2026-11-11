import { useId, type MouseEventHandler } from 'react';
import { Link } from 'react-router';
import { RoundIconButton } from '../../components/RoundIconButton/RoundIconButton';
import type { DictionaryTerm } from '../../data/dictionary';
import s from './Dictionary.module.css';
import { SearchTargetText } from '../../components/Search/SearchMatch';
import { searchId } from '../../data/catalogSearch';

export function TermTags({ term }: { term: DictionaryTerm }) {
  return <>
    <span className={`${s.tag} ${s.typeTag}`}>{term.type}</span>
    <span className={`${s.tag} ${s.statusTag}`} data-approved={term.status === 'Утверждён'}>{term.status}</span>
  </>;
}

export function TermCard({ term, search, originKey, onOpen, onEdit }: {
  term: DictionaryTerm;
  search: string;
  originKey: string;
  onOpen: MouseEventHandler<HTMLAnchorElement>;
  onEdit: (term: DictionaryTerm) => void;
}) {
  const titleId = useId();
  const target = searchId('term', term.id);
  return <article className={s.term} aria-labelledby={titleId} data-dictionary-term={term.id}>
    <header className={s.termHeader}>
      <h3 id={titleId}><Link className={s.termLink} to={{ search }} state={{ dictionaryTermOrigin: originKey }} onClick={onOpen}>
        <SearchTargetText id={target} field="title" text={term.name} />
      </Link></h3>
      <div className={s.termTools}>
        <TermTags term={term} />
        <RoundIconButton className={s.termEdit} icon="edit" aria-label={`Редактировать термин «${term.name}»`} onClick={() => onEdit(term)} />
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
