import { AttributeValue } from '../../../components/AttributeValue/AttributeValue';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { DescriptionText } from '../../../components/DescriptionText/DescriptionText';
import { EmptyState } from '../../../components/EmptyState/EmptyState';
import { Accordion } from '../../../components/Accordion/Accordion';
import { RoundIconButton } from '../../../components/RoundIconButton/RoundIconButton';
import { SearchTargetText } from '../../../components/Search/SearchMatch';
import { OverflowText } from '../../../components/OverflowText/OverflowText';
import { DetailSecondary } from '../../../components/DetailHeader/DetailSecondary';
import chrome from '../../../components/DetailHeader/DetailHeader.module.css';
import { useDetailScroll } from '../../../components/DetailHeader/useDetailScroll';
import { searchId } from '../../../data/catalogSearch';
import type { SourceSummary } from '../../../data/sources';
import type { SourceDetailData, SourceField } from '../../../data/sourceDetails';
import s from './SourceDetail.module.css';

const tabs = [ ['fields','Описание полей'], ['reports','Связанные отчёты'], ['metrics','Метрики'], ['lineage','Lineage'], ['mcp','MCP-инструменты'], ['similar','Похожие источники'] ] as const;
const columnPlural = new Intl.PluralRules('ru');
function columnLabel(count:number) { const form=columnPlural.select(count);return `${count} ${form==='one'?'колонка':form==='few'?'колонки':'колонок'}`; }
type Tone = 'blue'|'purple'|'red'|'yellow'|'green'|'neutral';
function Tag({text,tone}:{text:string;tone:Tone}) {return <span className={s.tag} data-tone={tone}>{text}</span>;}
function FieldAccordion({field, sourceId}: {field:SourceField; sourceId:string}) {
  const generic = <Tag text={field.genericType} tone="purple"/>;
  const key = <Tag text={field.key?'Key':'Not key'} tone={field.key?'green':'neutral'}/>;
  const metrics = field.relatedMetrics;
  const metricCount = metrics?.length ?? 0;
  return <Accordion defaultOpen={false}
    title={<OverflowText className={s.fieldName} fullText={field.name}>
      <SearchTargetText id={searchId('field', sourceId, field.name)} field="title" text={field.name}/>
    </OverflowText>}
    inlineMetadata={<span className={s.fieldMetadata}>
      <span className={s.fieldTags}>
        <OverflowText className={`${s.tag} ${s.sqlType}`} fullText={field.sqlType} data-tone="blue">{field.sqlType}</OverflowText>
        <span className={s.secondaryTag}>{generic}</span>
        <Tag text={field.nullable?'Nullable':'Required'} tone={field.nullable?'yellow':'red'}/>
        <span className={s.secondaryTag}>{key}</span>
      </span>
      {metricCount > 0 && <span className={s.fieldCount}>Метрики <span className={`${s.counter} ${s.activeCounter}`}>{metricCount}</span></span>}
    </span>}>
    <div className={s.compactFieldTags}>{generic}{key}</div>
    {metrics?.length ? <ul className={s.fieldMetricList} aria-label="Связанные метрики">
      {metrics.map(metric => <li key={metric}>{metric}</li>)}
    </ul> : <p>{metrics || field.metricCount === 0 ? 'Связанные метрики не найдены' : 'Сведения о связанных метриках не предоставлены'}</p>}
  </Accordion>;
}
function Person({role,name}:{role:string;name?:string}) {return <div className={s.person}>
  <img src="/images/favorites/avatar-placeholder.svg" width="32" height="32" alt=""/>
  <div><small>{role}</small><span><AttributeValue value={name} /></span></div>
</div>;}
export type SourceDetailSummary = Pick<SourceSummary, 'id' | 'technicalName'> &
  Partial<Pick<SourceSummary, 'description' | 'platform' | 'layer' | 'storageContext' | 'objectType' | 'columns' | 'domain' | 'masterSystem' | 'analyst' | 'reports' | 'metrics' | 'mcp'>> &
  { technicalStatus?: string; urn?: string };

function Passport({source,detail}:{source:SourceDetailSummary;detail?:SourceDetailData}) {return <aside className={s.passport} aria-label="Сведения об источнике">
  <header><h2>Сведения</h2><p>Домен, мастер-система и ответственные за источник</p></header>
  <div className={s.passportBody}>
    <div className={s.attribute}><small>Домен</small><span><AttributeValue value={detail?.domain ?? source.domain} /></span></div>
    <div className={s.attribute}><small>Мастер-система</small><span><AttributeValue value={detail?.masterSystem ?? source.masterSystem} /></span></div>
    <Person role="Ответственный аналитик" name={detail?.analyst ?? source.analyst}/><Person role="Технический владелец" name={detail?.technicalOwner}/>
  </div>
</aside>;}

export function SourceDetail({source,detail,tab,onTabChange,onBack,breadcrumbs,backLabel='Источники'}:{source:SourceDetailSummary;detail?:SourceDetailData;tab:'fields'|'reports';onTabChange:(tab:'fields'|'reports')=>void;onBack:()=>void;breadcrumbs?:readonly DetailCrumb[];backLabel?:string}) {
  const id=useId();
  const { compact, scroll, onScroll } = useDetailScroll(tab);
  const [bookmark,setBookmark]=useState(false);
  const [notice,setNotice]=useState<string>();
  const strip=useRef<HTMLDivElement>(null);
  const buttons=useRef<(HTMLButtonElement|null)[]>([]);
  const fieldCount = detail?.fields?.length;
  const counts:Record<string,number|undefined> = {fields:fieldCount,reports:detail?.counts.reports ?? source.reports,metrics:detail?.counts.metrics ?? source.metrics,mcp:detail?.counts.mcp ?? source.mcp,similar:detail?.counts.similar};
  const structure = [source.objectType, source.columns === undefined ? undefined : columnLabel(source.columns)].filter(Boolean).join(' · ');
  const platform = [source.platform, source.layer, source.storageContext].filter(Boolean).join(' · ');
  const status = detail?.technicalStatus ?? source.technicalStatus;
  function select(value:typeof tabs[number][0]) {
    if(value==='fields'||value==='reports') {onTabChange(value);setNotice(undefined);}
    else setNotice('Содержимое этой вкладки не предоставлено. Текущий раздел сохранён.');
  }
  useLayoutEffect(()=>{
    function reveal(){const button=buttons.current[tabs.findIndex(item=>item[0]===tab)], container=strip.current;if(!button||!container)return;const a=button.getBoundingClientRect(),b=container.getBoundingClientRect();if(a.left<b.left)container.scrollLeft+=a.left-b.left;else if(a.right>b.right)container.scrollLeft+=a.right-b.right;}
    reveal();const observer=new ResizeObserver(reveal);if(strip.current)observer.observe(strip.current);return()=>observer.disconnect();
  },[tab]);
  return <article className={`${chrome.frame} ${s.detail}`} data-source-detail-id={source.id} data-detail-compact={compact}>
    <header className={chrome.chrome}>
      <div className={s.hero}>
      <DetailSecondary compact={compact}>
      <div className={s.breadcrumbRow}><DetailBreadcrumbs ancestors={breadcrumbs ?? [{label:backLabel,onSelect:onBack}]} current="Карточка источника" /></div>
      </DetailSecondary>
      <div className={s.headingBlock}>
      <div className={s.titleRow}><h1 className={s.title}>{source.technicalName}</h1>
        <div className={s.actions}>
          <RoundIconButton icon="edit" aria-label="Редактировать источник" onClick={()=>setNotice('Редактор источника не подключён. Изменения не выполнены.')}/>
          <RoundIconButton icon="bookmark" aria-label="Закладка источника" aria-pressed={bookmark} onClick={()=>setBookmark(value=>!value)}/>
          <button type="button" className={s.download} onClick={()=>setNotice('Выгрузка метаданных не подключена. Файл не создан.')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>Скачать метаданные</button>
          <button type="button" className={s.access} onClick={()=>setNotice('Получение доступа не подключено. Заявка не отправлена.')}>Получить доступ</button>
        </div>
      </div>
      <DetailSecondary compact={compact}>
      <div className={s.meta} data-source-description>{structure&&<span><DescriptionText text={structure} /></span>}{platform&&<span><DescriptionText text={platform} /></span>}{status&&<Tag text={status} tone={status==='Active'||status==='Активен'?'green':'neutral'}/>} {detail?.synchronizedLabel&&<span>Синхронизация с DataHub: {detail.synchronizedLabel}</span>}</div>
      </DetailSecondary>
      </div>
      </div>
    <div ref={strip} role="tablist" aria-label="Вкладки карточки источника" className={s.tabs}>{tabs.map(([value,label],index)=><button key={value} ref={node=>{buttons.current[index]=node;}} type="button" role="tab" id={`${id}-${value}`} aria-controls={`${id}-content`} aria-selected={tab===value} tabIndex={tab===value?0:-1} onClick={()=>select(value)}
      onKeyDown={event=>{const step=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;if(step||event.key==='Home'||event.key==='End'){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+step+tabs.length)%tabs.length;select(tabs[next][0]);buttons.current[next]?.focus();buttons.current[next]?.scrollIntoView({block:'nearest',inline:'nearest'});}}}>
      <span>{label}</span>{counts[value]!==undefined&&<span className={s.counter}>{counts[value]}</span>}
    </button>)}</div>
    </header>
    <div ref={scroll} className={chrome.scroll} data-detail-scroll data-list-scroll onScrollCapture={onScroll} tabIndex={0}
      id={`${id}-content`} role="tabpanel" aria-labelledby={`${id}-${tab}`}>
    <div className={`${chrome.scrollContent} ${s.columns}`}>
      <div className={s.mainColumn}>
        <Accordion title="Об источнике" description="Назначение и содержание источника данных" defaultOpen bodyInset="flush">
          <p className={s.about}>{source.urn ? <>URN <span className={s.urn}>{source.urn}</span></>
            : <SearchTargetText id={searchId('source', source.id)} field="description" text={source.description ?? 'Описание отсутствует'}/>}</p>
        </Accordion>
        {tab==='fields' ? <section className={s.fields} data-detail-tab-content aria-label="Описание полей источника"><h2>Описание полей {fieldCount!==undefined&&<span className={s.headingCount}>{fieldCount}</span>}</h2>
          {detail?.fields?.length ? detail.fields.map(field=><FieldAccordion key={field.name} field={field} sourceId={source.id}/>)
            : <EmptyState className={s.empty} compact title={detail?.fields ? 'Поля источника не указаны' : 'Сведения о полях недоступны'}
              description={detail?.fields ? 'В этом источнике пока нет описанных полей.' : 'Сведения о полях этого источника не предоставлены.'} />}
        </section> : counts.reports===0
          ? <EmptyState className={s.empty} data-detail-tab-content title="Связанные отчёты не найдены" description="У этого источника нет связанных отчётов." />
          : <EmptyState className={s.empty} data-detail-tab-content title="Список связанных отчётов недоступен"
            description={counts.reports !== undefined ? 'Количество связей известно, но список отчётов не предоставлен.' : 'Сведения о связанных отчётах не предоставлены.'} />}
      </div>
      <Passport source={source} detail={detail}/>
    </div>
    </div>
    {notice&&<div className={s.notice} role="status"><p>{notice}</p><button type="button" aria-label="Закрыть уведомление" onClick={()=>setNotice(undefined)}>×</button></div>}
  </article>;
}
import { DetailBreadcrumbs, type DetailCrumb } from '../../../components/DetailHeader/DetailBreadcrumbs';
