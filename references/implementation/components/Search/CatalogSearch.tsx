import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { findCatalogHits, hasSearchDetail, normalizeSearch, searchGroups, type SearchEntry, type SearchHit, type SearchKind } from '../../data/catalogSearch';
import { DropdownItem } from '../DropdownItem/DropdownItem';
import { RoundIconButton } from '../RoundIconButton/RoundIconButton';
import { SearchField } from './SearchField';
import { MatchedText } from './SearchMatch';
import styles from './CatalogSearch.module.css';

const plurals = new Intl.PluralRules('ru');

function resultCount(count: number, reportsOnly: boolean) {
  if (count === 1) return 'Показано 1 из 1 результата';
  const form = plurals.select(count);
  const noun = reportsOnly ? (form === 'few' ? 'отчёта' : 'отчётов') : (form === 'few' ? 'результата' : 'результатов');
  return 'Показано ' + count + ' ' + noun;
}

function snippet(hit: SearchHit) {
  const text = hit.value.text;
  const index = normalizeSearch(text).indexOf(hit.query);
  const start = Math.max(0, index - 42);
  const end = index + hit.query.length + 72;
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

interface Props {
  entries: readonly SearchEntry[];
  loading: boolean;
  error: boolean;
  routeKey: string;
  restoreOnReturn: boolean;
  stepper?: { query: string; index: number; total: number; onStep: (index: number) => void };
  onChoose: (hit: SearchHit, action: 'location' | 'detail') => boolean;
}

export function CatalogSearch({ entries, loading, error, routeKey, restoreOnReturn, stepper, onChoose }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<SearchKind>();
  const [active, setActive] = useState(-1);
  const [notice, setNotice] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const returnTo = useRef<{ key: string; index: number; scrollTop: number } | undefined>(undefined);
  const restoreScroll = useRef<number | undefined>(undefined);
  const previousKey = useRef(routeKey);
  const listId = useId();
  const dialogId = listId + '-dialog';
  const gridId = listId + '-grid';
  const hasQuery = query.trim().length > 0;
  const allMatches = useMemo(() => findCatalogHits(entries, query), [entries, query]);
  const groups = searchGroups.map(([id, title]) => ({
    id, title, matches: kind && kind !== id ? [] : allMatches.filter(hit => hit.entry.kind === id),
  })).filter(group => group.matches.length);
  const matches = groups.flatMap(group => group.matches);
  const positions = new Map(matches.map((hit, index) => [hit.entry.id, index]));
  const activeHit = matches[active];
  const rowId = (index: number) => listId + '-' + index;
  const pageStepper = !open && stepper?.query === normalizeSearch(query.trim()) ? stepper : undefined;

  useEffect(() => {
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);

  function openResults() {
    const saved = returnTo.current;
    restoreScroll.current = saved?.scrollTop;
    setActive(saved?.index ?? -1);
    setOpen(true);
  }

  useLayoutEffect(() => {
    if (previousKey.current === routeKey) return;
    previousKey.current = routeKey;
    if (returnTo.current?.key === routeKey || (restoreOnReturn && returnTo.current)) {
      input.current?.focus({ preventScroll: true });
      openResults();
    }
    else { setOpen(false); setActive(-1); }
  }, [routeKey, restoreOnReturn]);

  useLayoutEffect(() => {
    if (open && results.current && restoreScroll.current !== undefined) {
      results.current.scrollTop = restoreScroll.current;
      restoreScroll.current = undefined;
    }
  }, [open]);

  function choose(hit: SearchHit, index: number, action: 'location' | 'detail') {
    const saved = { key: routeKey, index, scrollTop: results.current?.scrollTop ?? 0 };
    if (!onChoose(hit, action)) { setNotice(true); return; }
    returnTo.current = saved;
    setOpen(false);
    setActive(-1);
    setNotice(false);
  }

  function resetSelection() {
    returnTo.current = undefined;
    setActive(-1);
    setNotice(false);
  }

  function move(direction: number) {
    const next = Math.max(0, Math.min(matches.length - 1, active + direction));
    setOpen(true);
    setActive(next);
    document.getElementById(rowId(next))?.scrollIntoView({ block: 'nearest' });
  }

  return (
    <div ref={container} className={styles.container} onKeyDown={event => {
      if (open && event.key === 'Escape') {
        event.preventDefault();
        input.current?.focus({ preventScroll: true });
        setOpen(false);
        setActive(-1);
      }
    }}>
      <SearchField value={query} inputRef={input}
        role="combobox" aria-expanded={open} aria-haspopup="grid"
        aria-controls={open && matches.length ? gridId : undefined}
        aria-activedescendant={open && activeHit ? rowId(active) : undefined}
        onFocus={openResults}
        onClick={() => { if (!open) openResults(); }}
        onValueChange={value => { setQuery(value); setOpen(true); resetSelection(); }}
        onKeyDown={event => {
          if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && matches.length) {
            event.preventDefault();
            move(event.key === 'ArrowDown' ? 1 : -1);
          } else if (event.key === 'Enter' && open && activeHit?.entry.destination) {
            event.preventDefault();
            choose(activeHit, active, 'location');
          } else if (event.key === 'Tab' && !event.shiftKey && open && activeHit?.entry.destination) {
            const primary = document.getElementById(rowId(active))?.querySelector('button');
            if (primary) { event.preventDefault(); primary.focus(); }
          }
        }}
        trailing={query ? <>
          {pageStepper && <div className={styles.stepper} role="group" aria-label="Совпадения на странице">
            <button type="button" aria-label="Предыдущее совпадение" title="Предыдущее совпадение"
              aria-disabled={pageStepper.index === 0} onClick={() => { if (pageStepper.index > 0) pageStepper.onStep(pageStepper.index - 1); }}>
              <span className={styles.previous} aria-hidden="true" />
            </button>
            <span className={styles.stepCount} role="status" aria-live="polite" aria-atomic="true">
              {pageStepper.index + 1} / {pageStepper.total}
            </span>
            <button type="button" aria-label="Следующее совпадение" title="Следующее совпадение"
              aria-disabled={pageStepper.index === pageStepper.total - 1} onClick={() => { if (pageStepper.index < pageStepper.total - 1) pageStepper.onStep(pageStepper.index + 1); }}>
              <span className={styles.next} aria-hidden="true" />
            </button>
          </div>}
          <button className={styles.clear} type="button" aria-label="Очистить запрос"
            onClick={() => { input.current?.focus(); setQuery(''); resetSelection(); setOpen(false); }}>
            <img src="/icons/search/clear.svg" width="16" height="16" alt="" aria-hidden="true" />
          </button>
        </> : undefined} />
      {open && (
        <section id={dialogId} className={styles.dropdown} role="dialog" aria-label="Поиск по каталогу" data-dropdown-surface="true">
          <div className={styles.types}>
            {searchGroups.map(([id, title]) => <button key={id} type="button" className={styles.chip} aria-pressed={kind === id}
              onClick={() => { setKind(kind === id ? undefined : id); resetSelection(); }}>{title}</button>)}
            {kind && <button type="button" className={styles.resetTypes} aria-label="Сбросить выбор типов"
              onClick={() => { setKind(undefined); resetSelection(); }}>
              <img src="/icons/search/reset-types.svg" width="16" height="16" alt="" aria-hidden="true" />
            </button>}
          </div>
          {notice && <p className={styles.notice} role="status">Место совпадения пока недоступно. Выберите другой результат.</p>}
          {error && hasQuery && (!kind || kind === 'report') && !matches.length ? <div className={styles.empty} role="alert"><h2>Не удалось получить данные</h2><p>Демонстрационный источник отчётов недоступен.</p></div>
            : loading && (!kind || kind === 'report') && !matches.length && hasQuery ? <div className={styles.empty} role="status">Загрузка примера…</div>
            : !hasQuery || matches.length === 0 ? (
              <div className={styles.empty}>
                <img src={'/images/search/' + (hasQuery ? 'illustration-no-results' : 'illustration-before-input') + '.png'} width="190" height="142" alt="" aria-hidden="true" />
                <h2>{hasQuery ? 'Ничего не найдено' : 'Начните поиск по каталогу'}</h2>
                <p>{hasQuery ? 'Попробуйте изменить запрос.' : <>Введите название или часть слова.<br />Можно заранее выбрать разделы поиска.</>}</p>
              </div>
            ) : (
              <>
                <div ref={results} id={gridId} className={styles.results} role="grid" aria-label="Результаты поиска">
                  {groups.map(group => (
                    <section key={group.id} role="rowgroup" aria-label={group.title}>
                      <div role="row">
                        <div className={styles.groupHeading} role="columnheader" aria-colspan={group.matches.some(hit => hasSearchDetail(hit.entry.destination)) ? 2 : undefined}>
                          {group.id === 'report' && <img src="/icons/search/group-report.svg" width="16" height="16" alt="" aria-hidden="true" />}
                          <span>{group.title}</span><span className={styles.badge}>{group.matches.length}</span>
                        </div>
                      </div>
                        {group.matches.map(hit => {
                          const index = positions.get(hit.entry.id)!;
                          const { entry, value } = hit;
                          const title = value.field === 'title' ? value.text : entry.title;
                          const contents = <>
                            <span className={styles.title}><MatchedText text={title} query={hit.query} /></span>
                            {entry.context.length > 0 && <span className={styles.metadata}>{entry.context.map((item, i) =>
                              <span key={i}>{i > 0 && <i aria-hidden="true" />}<MatchedText text={item} query={hit.query} /></span>)}</span>}
                            {value.field !== 'title' && entry.kind !== 'report' && <span className={styles.excerpt}>
                              {value.label && <>{value.label} · </>}<MatchedText text={snippet(hit)} query={hit.query} />
                            </span>}
                            {value.field === 'title' && entry.hint && <span className={styles.excerpt}>{entry.hint}</span>}
                          </>;
                          return <DropdownItem as="div" role="row" key={entry.id} aria-selected={active === index}
                            data-actionable={Boolean(entry.destination)} className={styles.result}
                            onFocus={() => setActive(index)} onKeyDown={event => {
                              const direction = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
                              if (direction) {
                                event.preventDefault();
                                document.getElementById(rowId(index + direction))?.querySelector('button')?.focus();
                              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                                const action = event.currentTarget.querySelectorAll('button')[event.key === 'ArrowLeft' ? 0 : 1];
                                if (action) { event.preventDefault(); action.focus(); }
                              }
                            }}>
                            <div role="gridcell" id={rowId(index)} className={styles.primaryCell}>
                              {entry.destination ? <button type="button" className={styles.primary} onClick={() => choose(hit, index, 'location')}>{contents}</button>
                                : <div className={styles.primary}>{contents}</div>}
                            </div>
                            {hasSearchDetail(entry.destination) && <div role="gridcell" className={styles.action}>
                              <RoundIconButton icon="open" aria-label={'Открыть паспорт «' + entry.title + '»'} title="Открыть паспорт"
                                onClick={() => choose(hit, index, 'detail')} />
                            </div>}
                          </DropdownItem>;
                        })}
                    </section>
                  ))}
                </div>
                <div className={styles.footer}>{resultCount(matches.length, groups.length === 1 && groups[0].id === 'report')}</div>
              </>
            )}
        </section>
      )}
    </div>
  );
}
