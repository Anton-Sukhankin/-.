import type { DictionaryDomain } from '../../data/dictionary';
import { searchId } from '../../data/catalogSearch';
import { SearchTargetText } from '../../components/Search/SearchMatch';
import s from './Dictionary.module.css';

export function DomainRow({ domain }: { domain: DictionaryDomain }) {
  return <li className={s.domain} data-dictionary-domain={domain.id}>
    <span className={s.domainIcon}><img src="/icons/reports/domain-group.svg" width="16" height="16" alt="" /></span>
    <span><SearchTargetText id={searchId('dictionary-domain', domain.id)} field="title" text={domain.name} /></span>
  </li>;
}
