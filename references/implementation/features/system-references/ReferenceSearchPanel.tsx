import { useId, useRef } from 'react';
import motion from '../../components/Accordion/Accordion.module.css';
import { SelectionCheck } from '../../components/DropdownItem/SelectionCheck';
import { SearchField } from '../../components/Search/SearchField';
import type { ReferenceFilters } from '../../data/systemReferences';
import { ReferenceCriteriaChips } from './ReferenceCriteriaChips';
import { referenceChevron, referenceCriteria } from './referenceCriteria';
import s from './ReferenceSearchPanel.module.css';

export function ReferenceSearchPanel({ id, visible, expanded, draft, onChange, onToggle, onReset, onApply }: {
  id: string;
  visible: boolean;
  expanded: boolean;
  draft: ReferenceFilters;
  onChange: (patch: Partial<ReferenceFilters>) => void;
  onToggle: () => void;
  onReset: () => void;
  onApply: () => void;
}) {
  const criteriaId = useId();
  const disclosure = useRef<HTMLButtonElement>(null);
  const actions = <div className={s.actions}>
    <button type="button" className={`${s.action} ${s.reset}`} onClick={onReset}>Сбросить</button>
    <button type="button" className={`${s.action} ${s.apply}`} onClick={onApply}>Применить</button>
  </div>;
  const switches = <div className={s.switches} role="group" aria-label="Условия поиска">
    <button type="button" className={s.toggleChip} aria-pressed={draft.exactEntity}
      onClick={() => onChange({ exactEntity: !draft.exactEntity })}>
      {draft.exactEntity && <SelectionCheck selected />}Точное совпадение по коду сущности
    </button>
    <button type="button" className={s.toggleChip} aria-pressed={draft.primaryKey}
      onClick={() => onChange({ primaryKey: !draft.primaryKey })}>
      {draft.primaryKey && <SelectionCheck selected />}Только PK
    </button>
  </div>;

  return <div className={`${motion.reveal} ${s.panelReveal}`} data-open={visible} aria-hidden={!visible} inert={!visible}>
    <div className={motion.clip}>
      <section id={id} className={s.panel} aria-label="Панель поиска CRM" data-search-layout={expanded ? 'expanded' : 'compact'}>
        <div className={s.top}>
          <button ref={disclosure} type="button" className={s.disclosure} aria-expanded={expanded}
            aria-controls={criteriaId}
            aria-label={expanded ? 'Свернуть параметры поиска' : 'Развернуть параметры поиска'} onClick={onToggle}>
            <img className={motion.chevronIcon} data-open={expanded} src={referenceChevron} width="16" height="16" alt="" />
          </button>
          <div className={s.search}>
            <SearchField aria-label="Поиск в справочнике CRM" placeholder="Поиск в справочнике CRM"
              value={draft.query} onValueChange={query => onChange({ query })} />
          </div>
          <div className={s.topActions} data-visible={!expanded} aria-hidden={expanded} inert={expanded}>
            <div className={s.topActionsClip}>{actions}</div>
          </div>
        </div>
        <div id={criteriaId} className={motion.reveal} data-open={expanded} aria-hidden={!expanded} inert={!expanded}>
          <div className={motion.clip}>
            <div className={s.criteria}>
              {referenceCriteria.map(({ key, label, placeholder }) => <label key={key} className={s.field}>
                <input type="text" value={draft[key]} placeholder={placeholder}
                  onChange={event => onChange({ [key]: event.target.value })} />
                <span>{label}</span>
              </label>)}
            </div>
            <div className={s.footer}>{switches}{actions}</div>
          </div>
        </div>
        <div className={motion.reveal} data-open={!expanded} aria-hidden={expanded} inert={expanded}>
          <div className={motion.clip}>
            <div className={s.compactRow}>
              {switches}
              <div className={s.chipArea}>
                <ReferenceCriteriaChips enabled={visible && !expanded} draft={draft} onChange={onChange}
                  onEmptyFocus={() => disclosure.current?.focus()} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>;
}

