import { useState } from 'react';
import { OverflowText } from '../../components/OverflowText/OverflowText';
import { SearchTargetText } from '../../components/Search/SearchMatch';
import { searchId } from '../../data/catalogSearch';
import { sourceColumns, type SourceAttribute, type SourceFilters, type SourceSummary } from '../../data/sources';
import s from './Sources.module.css';
const context = (row: SourceSummary) => [row.platform,row.layer,row.storageContext].join(' · ');
function Identity({row,card=false,onOpen}:{row:SourceSummary;card?:boolean;onOpen:(row:SourceSummary)=>void}) {
  const title = <OverflowText fullText={row.technicalName}><SearchTargetText id={searchId('source', row.id)} field="title" text={row.technicalName}/></OverflowText>;
  return <div className={card ? s.identityCard : s.identity}>
    {card && <OverflowText className={s.context} fullText={context(row)}>{context(row)}</OverflowText>}
    {card ? <h2 className={s.name}><button type="button" className={s.sourceLink} onClick={()=>onOpen(row)}>{title}</button></h2> : <button type="button" className={`${s.name} ${s.sourceLink}`} onClick={()=>onOpen(row)}>{title}</button>}
    {!card && <OverflowText className={s.context} fullText={context(row)}>{context(row)}</OverflowText>}
    {card && <SourceDescription row={row} card />}
  </div>;
}
function SourceDescription({row,card=false}:{row:SourceSummary;card?:boolean}) {
  const text = row.description ?? 'Описание отсутствует';
  return <OverflowText as={card ? 'p' : 'span'} className={card ? s.description : s.tableDescription} fullText={text}>
    <SearchTargetText id={searchId('source', row.id)} field="description" text={text}/>
  </OverflowText>;
}
function Attribute({label,value}:{label:string;value:string|number}) { return <div className={s.attribute}><small>{label}</small><OverflowText fullText={String(value)}>{value}</OverflowText></div>; }
export function SourceCards({rows,onOpen}:{rows:readonly SourceSummary[];onOpen:(row:SourceSummary)=>void}) {
  return <div className={s.cards} aria-label="Карточки источников">{rows.map(row => <article key={row.id} className={s.card} data-source-id={row.id} onClick={event=>{if(!(event.target as Element).closest('button'))onOpen(row);}}>
    <div className={s.cardTop}><Identity row={row} card onOpen={onOpen}/><div className={s.attributes}>
      <Attribute label="Тип объекта" value={row.objectType}/><Attribute label="Колонки" value={row.columns}/>
      <Attribute label="Домен" value={row.domain}/><Attribute label="Ответственный аналитик" value={row.analyst ?? 'Не указан'}/>
    </div></div>
    <footer className={s.cardFooter}><div className={s.counts}>{(['reports','metrics','lineage','mcp'] as const).map((id,index)=><span key={id}>{['Отчёты','Метрики','Lineage','MCP'][index]} <b>{row[id] ?? '—'}</b></span>)}</div>
      <div className={s.usage}>{row.usedInAnalytics && <span className={s.tag}>Используется в аналитике</span>}<span className={s.views} aria-label={`Счётчик просмотров: ${row.views ?? 'не предоставлен'}`}><span className={s.eye}><img src="/images/source-catalog/eye.svg" width="20" height="20" alt="" /></span>{row.views ?? '—'}</span></div>
    </footer>
  </article>)}</div>;
}
export function SourceTable({rows,filters,onColumn,onClear,activeColumn,onOpen}:{ rows:readonly SourceSummary[];filters:SourceFilters;activeColumn?:string;onOpen:(row:SourceSummary)=>void;
  onColumn:(label:string,attributes:readonly SourceAttribute[],anchor:HTMLElement)=>void;onClear:(attributes:readonly SourceAttribute[])=>void }) {
  const [scrolled,setScrolled] = useState(false);
  return <div className={s.tableFrame} data-source-table-scrolled={scrolled}><div className={s.tableScroll} tabIndex={0} aria-label="Прокрутка таблицы источников" onScroll={event=>setScrolled(event.currentTarget.scrollLeft>0)}><table className={s.table} aria-label="Источники">
    <colgroup>{[340,240,110,96,180,220,130,100,100,100,90,120].map((width,i)=><col key={i} style={{width}} />)}</colgroup>
    <thead><tr>{sourceColumns.map(column => { const applied = column.attributes.some(id => filters[id]?.length); const open = activeColumn === column.label;
      return <th key={column.label} scope="col" data-source-heading={column.label}>{column.attributes.length ? <div className={s.filterHeading} data-open={open} data-applied={applied}>
        <button type="button" className={s.headingButton} aria-haspopup="dialog" aria-expanded={open} aria-label={`Фильтр: ${column.label}`} onClick={event=>onColumn(column.label,column.attributes,event.currentTarget)}>
          <span>{column.label}</span><img src={`/images/report-table/${open||applied?'filter-active':'filter'}.svg`} width="16" height="16" alt="" />
        </button>
        {applied && <button className={s.clearHeading} type="button" aria-label={`Сбросить фильтр: ${column.label}`} onClick={()=>onClear(column.attributes)}><img src="/images/report-table/filter-minus.svg" width="10" height="10" alt="" /></button>}
      </div> : <span className={s.plainHeading}>{column.label}</span>}</th>;
    })}</tr></thead>
    <tbody>{rows.map(row=><tr key={row.id} data-source-id={row.id} onClick={event=>{if(!(event.target as Element).closest('button'))onOpen(row);}}>
      <td><Identity row={row} onOpen={onOpen}/></td><td><SourceDescription row={row}/></td>
      <td>{row.objectType}</td><td>{row.columns}</td><td><OverflowText className={s.clamp} fullText={row.domain}>{row.domain}</OverflowText></td>
      <td><OverflowText className={s.clamp} fullText={row.analyst ?? 'Не указан'}>{row.analyst ?? 'Не указан'}</OverflowText></td><td>{row.usedInAnalytics === undefined ? 'Не указано' : row.usedInAnalytics ? 'Да' : 'Нет'}</td>
      <td>{row.reports}</td><td>{row.metrics}</td><td>{row.lineage ?? '—'}</td><td>{row.mcp}</td><td>{row.views ?? '—'}</td>
    </tr>)}</tbody>
  </table></div></div>;
}
