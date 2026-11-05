import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Accordion } from '../../../components/Accordion/Accordion';
import { RoundIconButton } from '../../../components/RoundIconButton/RoundIconButton';
import { SearchTargetText } from '../../../components/Search/SearchMatch';
import { searchId } from '../../../data/catalogSearch';
import type { SourceSummary } from '../../../data/sources';
import type { SourceDetailData, SourceField } from '../../../data/sourceDetails';
import s from './SourceDetail.module.css';

const tabs = [ ['fields','Описание полей'], ['reports','Связанные отчёты'], ['metrics','Метрики'], ['lineage','Lineage'], ['mcp','MCP-инструменты'], ['similar','Похожие источники'] ] as const;
const columnPlural = new Intl.PluralRules('ru');
function columnLabel(count:number) { const form=columnPlural.select(count);return `${count} ${form==='one'?'колонка':form==='few'?'колонки':'колонок'}`; }
const paths:Record<string,string> = {
  fields:'M5 4h14v16H5ZM9 8h6M9 12h6M9 16h4', reports:'M6 3h8l4 4v14H6ZM14 3v5h4M9 12h6M9 16h6',
  metrics:'M4 20V11M10 20V4M16 20v-9M22 20H2', lineage:'M12 5v6M5 19v-8h14v8M5 15h0M19 15h0',
  mcp:'M8 8 4 12l4 4M16 8l4 4-4 4M14 5l-4 14', similar:'M4 4h7v7H4ZM14 4h7v7h-7ZM4 14h7v7H4ZM14 14h7v7h-7Z',
};
function TabIcon({id}:{id:string}) {return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={paths[id]} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;}
type Tone = 'blue'|'purple'|'red'|'yellow'|'green'|'neutral';
function Tag({text,tone}:{text:string;tone:Tone}) {return <span className={s.tag} data-tone={tone}>{text}</span>;}
function FieldTags({field}:{field:SourceField}) {return <>
  <Tag text={field.sqlType} tone="blue"/><Tag text={field.genericType} tone="purple"/>
  <Tag text={field.nullable?'Nullable':'Required'} tone={field.nullable?'yellow':'red'}/><Tag text={field.key?'Key':'Not key'} tone={field.key?'green':'neutral'}/>
</>;}
function Person({role,name}:{role:string;name?:string}) {return <div className={s.person}>
  <img src="/images/favorites/avatar-placeholder.svg" width="32" height="32" alt=""/>
  <div><small>{role}</small><span>{name ?? '—'}</span></div>
</div>;}
function Passport({source,detail}:{source:SourceSummary;detail?:SourceDetailData}) {return <aside className={s.passport} aria-label="Сведения об источнике">
  <header><h2>Сведения</h2><p>Домен, мастер-система и ответственные за источник</p></header>
  <div className={s.passportBody}>
    <div className={s.attribute}><small>Домен</small><span>{detail?.domain ?? source.domain}</span></div>
    <div className={s.attribute}><small>Мастер-система</small><span>{detail?.masterSystem ?? source.masterSystem ?? '—'}</span></div>
    <Person role="Ответственный аналитик" name={detail?.analyst ?? source.analyst}/><Person role="Технический владелец" name={detail?.technicalOwner}/>
  </div>
</aside>;}

export function SourceDetail({source,detail,tab,onTabChange,onBack}:{source:SourceSummary;detail?:SourceDetailData;tab:'fields'|'reports';onTabChange:(tab:'fields'|'reports')=>void;onBack:()=>void}) {
  const id=useId();
  const [bookmark,setBookmark]=useState(false);
  const [notice,setNotice]=useState<string>();
  const strip=useRef<HTMLDivElement>(null);
  const buttons=useRef<(HTMLButtonElement|null)[]>([]);
  const counts:Record<string,number|undefined> = {fields:source.columns,reports:detail?.counts.reports ?? source.reports,metrics:detail?.counts.metrics ?? source.metrics,mcp:detail?.counts.mcp ?? source.mcp,similar:detail?.counts.similar};
  function select(value:typeof tabs[number][0]) {
    if(value==='fields'||value==='reports') {onTabChange(value);setNotice(undefined);}
    else setNotice('Содержимое этой вкладки не предоставлено. Текущий раздел сохранён.');
  }
  useLayoutEffect(()=>{
    function reveal(){const button=buttons.current[tabs.findIndex(item=>item[0]===tab)], container=strip.current;if(!button||!container)return;const a=button.getBoundingClientRect(),b=container.getBoundingClientRect();if(a.left<b.left)container.scrollLeft+=a.left-b.left;else if(a.right>b.right)container.scrollLeft+=a.right-b.right;}
    reveal();const observer=new ResizeObserver(reveal);if(strip.current)observer.observe(strip.current);return()=>observer.disconnect();
  },[tab]);
  return <article className={s.detail} data-source-detail-id={source.id}>
    <header className={s.hero}>
      <div className={s.breadcrumbRow}><nav className={s.crumbs} aria-label="Хлебные крошки"><button type="button" onClick={onBack}>Источники</button><img src="/images/report-detail/chrome/breadcrumb-chevron.svg" width="16" height="16" alt=""/><span aria-current="page">Карточка источника</span></nav></div>
      <div className={s.headingBlock}>
      <div className={s.titleRow}><h1 className={s.title}>{source.technicalName}</h1>
        <div className={s.actions}>
          <RoundIconButton icon="edit" aria-label="Редактировать источник" onClick={()=>setNotice('Редактор источника не подключён. Изменения не выполнены.')}/>
          <RoundIconButton icon="bookmark" aria-label="Закладка источника" aria-pressed={bookmark} onClick={()=>setBookmark(value=>!value)}/>
          <button type="button" className={s.download} onClick={()=>setNotice('Выгрузка метаданных не подключена. Файл не создан.')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>Скачать метаданные</button>
          <button type="button" className={s.access} onClick={()=>setNotice('Получение доступа не подключено. Заявка не отправлена.')}>Получить доступ</button>
        </div>
      </div>
      <div className={s.meta} data-source-description><span>{source.objectType} · {columnLabel(source.columns)}</span><span>{[source.platform,source.layer,source.storageContext].join(' · ')}</span>{detail?.technicalStatus&&<Tag text={detail.technicalStatus} tone={detail.technicalStatus==='Active'?'green':'neutral'}/>} {detail?.synchronizedLabel&&<span>Синхронизация с DataHub: {detail.synchronizedLabel}</span>}</div>
      </div>
    </header>
    <div ref={strip} role="tablist" aria-label="Вкладки карточки источника" className={s.tabs}>{tabs.map(([value,label],index)=><button key={value} ref={node=>{buttons.current[index]=node;}} type="button" role="tab" id={`${id}-${value}`} aria-controls={`${id}-content`} aria-selected={tab===value} tabIndex={tab===value?0:-1} onClick={()=>select(value)}
      onKeyDown={event=>{const step=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;if(step||event.key==='Home'||event.key==='End'){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+step+tabs.length)%tabs.length;select(tabs[next][0]);buttons.current[next]?.focus();buttons.current[next]?.scrollIntoView({block:'nearest',inline:'nearest'});}}}>
      <TabIcon id={value}/><span>{label}</span>{counts[value]!==undefined&&<span className={s.counter}>{counts[value]}</span>}
    </button>)}</div>
    <div id={`${id}-content`} role="tabpanel" aria-labelledby={`${id}-${tab}`} className={s.columns}>
      <div className={s.mainColumn}>
        <Accordion title="Об источнике" description="Назначение и содержание источника данных" defaultOpen bodyInset="flush"><p className={s.about}>{source.description ?? 'Описание отсутствует'}</p></Accordion>
        {tab==='fields' ? <section className={s.fields} aria-label="Описание полей источника"><h2>Описание полей <span className={s.counter}>{source.columns}</span></h2>
          {detail?.fields ? detail.fields.map(field=><Accordion key={field.name}
            title={<SearchTargetText id={searchId('field', source.id, field.name)} field="title" text={field.name} />} metadata={<FieldTags field={field}/>} defaultOpen={false}
            action={<span className={s.fieldCount}>Метрики <span className={s.counter}>{field.metricCount ?? '—'}</span></span>}>
            <p>{field.metricCount===0?'Связанные метрики не найдены':'Сведения о связанных метриках не предоставлены'}</p>
          </Accordion>) : <div className={s.limited}>Сведения о полях этого источника не предоставлены.</div>}
        </section> : counts.reports===0 ? <div className={s.empty}>
          <span className={s.folder}><img src="/images/report-detail/empty.png" width="90" height="60" alt=""/></span><h2>Связанные отчёты не найдены</h2><p>У этого источника нет связанных отчётов.</p>
        </div> : <div className={s.limited}>Сведения о связанных отчётах не предоставлены.</div>}
      </div>
      <Passport source={source} detail={detail}/>
    </div>
    {notice&&<div className={s.notice} role="status"><p>{notice}</p><button type="button" aria-label="Закрыть уведомление" onClick={()=>setNotice(undefined)}>×</button></div>}
  </article>;
}
