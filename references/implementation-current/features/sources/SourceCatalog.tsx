import { AttributeValue } from '../../components/AttributeValue/AttributeValue';
import { CatalogEntityIcon } from '../../components/CatalogEntityIcon/CatalogEntityIcon';
import { useContext, useLayoutEffect, useRef, useState } from 'react';
import { DescriptionText } from '../../components/DescriptionText/DescriptionText';
import { ColumnReset } from '../../components/ColumnReset/ColumnReset';
import { OverflowText } from '../../components/OverflowText/OverflowText';
import { SearchLandingContext, SearchTargetText } from '../../components/Search/SearchMatch';
import { isDescriptionMatchClipped } from '../../components/Search/descriptionVisibility';
import { searchId } from '../../data/catalogSearch';
import { sourceColumns, type SourceAttribute, type SourceFilters, type SourceSummary } from '../../data/sources';
import { SourceActions } from './SourceActions';
import s from './Sources.module.css';
const context = (row: SourceSummary) => [row.platform,row.layer,row.storageContext].join(' · ');
function Identity({row,card=false,onOpen}:{row:SourceSummary;card?:boolean;onOpen:(row:SourceSummary)=>void}) {
  const title = <OverflowText fullText={row.technicalName}><SearchTargetText id={searchId('source', row.id)} field="title" text={row.technicalName}/></OverflowText>;
  const metadata = <OverflowText className={s.context} fullText={context(row)}><DescriptionText text={context(row)} /></OverflowText>;
  const link = <button type="button" className={card ? s.sourceLink : `${s.name} ${s.sourceLink}`} onClick={()=>onOpen(row)}>{title}</button>;
  if (!card) return <div className={s.identity}>
    <CatalogEntityIcon kind="source" />
    <div className={s.identityText}>{link}{metadata}</div>
  </div>;
  return <div className={s.identityCard}>
    <div className={s.identityContextRow}>
      {metadata}
      <div className={s.usage}>
        {row.usedInAnalytics && <span className={s.tag}>Используется в аналитике</span>}
        <span className={s.views} aria-label={`Счётчик просмотров: ${row.views ?? 'не предоставлен'}`}>
          <span className={s.eye}><img src="/images/source-catalog/eye.svg" width="20" height="20" alt="" /></span>
          <AttributeValue value={row.views} />
        </span>
      </div>
    </div>
    <h2 className={s.name}>{link}</h2>
    <SourceDescription row={row} card />
  </div>;
}
function SourceDescription({row,card=false}:{row:SourceSummary;card?:boolean}) {
  const text = row.description ?? 'Описание отсутствует';
  const id = searchId('source', row.id);
  const hit = useContext(SearchLandingContext);
  const match = !card && hit?.entry.id === id && hit.value.field === 'description' ? hit : undefined;
  const reveal = useRef<HTMLSpanElement>(null);
  const [expandedHeight, setExpandedHeight] = useState<number>();
  useLayoutEffect(() => {
    const element = reveal.current?.firstElementChild;
    if (!match || !(element instanceof HTMLElement)) {
      setExpandedHeight(undefined);
      return;
    }
    const measure = () => setExpandedHeight(isDescriptionMatchClipped(element, match, 2) ? element.scrollHeight : undefined);
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    return () => resize.disconnect();
  }, [match, text]);

  const description = <OverflowText as={card ? 'p' : 'span'} className={card ? s.description : s.tableDescription} fullText={text} data-search-description={id}>
    <SearchTargetText id={id} field="description" text={text}/>
  </OverflowText>;
  if (card) return description;
  const height = match ? expandedHeight : undefined;
  return <span ref={reveal} className={s.descriptionReveal} data-source-description-expanded={height !== undefined}
    style={height === undefined ? undefined : { maxHeight: height }}
    onTransitionEnd={event => {
      if (event.target === event.currentTarget && event.propertyName === 'max-height' && height !== undefined) {
        event.currentTarget.querySelector('[data-catalog-search-match]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }}>
    {description}
  </span>;
}
function Attribute({label,value}:{label:string;value:string|number}) { return <div className={s.attribute}><small>{label}</small><OverflowText fullText={String(value)}>{value}</OverflowText></div>; }
export function SourceCards({rows,onOpen,onNotice}:{rows:readonly SourceSummary[];onOpen:(row:SourceSummary)=>void;onNotice:(message:string)=>void}) {
  return <div className={s.cards} aria-label="Карточки источников">{rows.map(row => <article key={row.id} className={s.card} data-source-id={row.id} onClick={event=>{if(!(event.target as Element).closest('button'))onOpen(row);}}>
    <div className={s.cardTop}><Identity row={row} card onOpen={onOpen}/><div className={s.attributes}>
      <Attribute label="Тип объекта" value={row.objectType}/><Attribute label="Колонки" value={row.columns}/>
      <Attribute label="Домен" value={row.domain}/><Attribute label="Ответственный аналитик" value={row.analyst ?? 'Не указан'}/>
    </div></div>
    <footer className={s.cardFooter}>
      <div className={s.counts}>{(['reports','metrics','lineage','mcp'] as const).map((id,index)=><span key={id}>{['Отчёты','Метрики','Lineage','MCP'][index]} <b><AttributeValue value={row[id]} /></b></span>)}</div>
      <div className={s.cardActions}><SourceActions onNotice={onNotice}/></div>
    </footer>
  </article>)}</div>;
}
export function SourceTable({rows,filters,onColumn,onClear,activeColumn,onOpen,onNotice}:{ rows:readonly SourceSummary[];filters:SourceFilters;activeColumn?:string;onOpen:(row:SourceSummary)=>void;onNotice:(message:string)=>void;
  onColumn:(label:string,attributes:readonly SourceAttribute[],anchor:HTMLElement)=>void;onClear:(attributes:readonly SourceAttribute[])=>void }) {
  const [scrolled,setScrolled] = useState(false);
  const [atEnd,setAtEnd] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  function updateEdges(element: HTMLDivElement) {
    setScrolled(element.scrollLeft > 0);
    setAtEnd(element.scrollWidth - element.clientWidth - element.scrollLeft <= 1);
  }
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const measure = () => updateEdges(element);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);
  return <div className={s.tableFrame} data-source-table-scrolled={scrolled} data-source-table-at-end={atEnd}><div ref={scroller} className={s.tableScroll} data-list-scroll tabIndex={0} aria-label="Прокрутка таблицы источников" onScroll={event=>updateEdges(event.currentTarget)}><table className={s.table} aria-label="Источники">
    <colgroup>{[340,240,110,96,180,220,130,100,100,100,90,120,104].map((width,i)=><col key={i} style={{width}} />)}</colgroup>
    <thead><tr>{sourceColumns.map(column => { const applied = column.attributes.some(id => filters[id]?.length); const open = activeColumn === column.label;
      return <th key={column.label} scope="col" data-source-heading={column.label}>{column.attributes.length ? <div className={s.filterHeading} data-open={open} data-applied={applied}>
        <button type="button" className={s.headingButton} aria-haspopup="dialog" aria-expanded={open} aria-label={`Фильтр: ${column.label}`} onClick={event=>onColumn(column.label,column.attributes,event.currentTarget)}>
          <span>{column.label}</span>
        </button>
        {applied && !open ? <ColumnReset label={`Сбросить фильтр: ${column.label}`} onReset={() => onClear(column.attributes)}>
          <img src="/images/report-table/filter-active.svg" width="16" height="16" alt="" />
        </ColumnReset> : <img src={`/images/report-table/${open?'filter-active':'filter'}.svg`} width="16" height="16" alt="" aria-hidden="true" />}
      </div> : <span className={s.plainHeading}>{column.label}</span>}</th>;
    })}<th className={s.actionsHeading} scope="col" aria-label="Действия" /></tr></thead>
    <tbody>{rows.map(row=><tr key={row.id} className={s.tableRow} data-source-id={row.id} onClick={event=>{if(!(event.target as Element).closest('button'))onOpen(row);}}>
      <td><Identity row={row} onOpen={onOpen}/></td><td><SourceDescription row={row}/></td>
      <td>{row.objectType}</td><td>{row.columns}</td><td><OverflowText className={s.clamp} fullText={row.domain}>{row.domain}</OverflowText></td>
      <td><OverflowText className={s.clamp} fullText={row.analyst ?? 'Не указан'}>{row.analyst ?? 'Не указан'}</OverflowText></td><td>{row.usedInAnalytics === undefined ? 'Не указано' : row.usedInAnalytics ? 'Да' : 'Нет'}</td>
      <td>{row.reports}</td><td>{row.metrics}</td><td><AttributeValue value={row.lineage} /></td><td>{row.mcp}</td><td><AttributeValue value={row.views} /></td>
      <td className={s.actionsCell}><div className={s.tableActions}><SourceActions onNotice={onNotice} iconsOnly/></div></td>
    </tr>)}</tbody>
  </table></div></div>;
}
