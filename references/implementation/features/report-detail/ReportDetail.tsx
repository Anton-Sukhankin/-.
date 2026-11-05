import { RoundIconButton } from '../../components/RoundIconButton/RoundIconButton';
import { useLayoutEffect, useRef, useState } from 'react';
import type { ReportSummary } from '../../data/reports';
import { Accordion } from '../../components/Accordion/Accordion';
import { OverviewTab } from './overview/OverviewTab';
import { MetricsTab } from './metrics/MetricsTab';
import { MailingsTab } from './mailings/MailingsTab';
import { UsageTab } from './usage/UsageTab';
import { SourcesTab } from './sources/SourcesTab';
import s from './Detail.module.css';
import type { ReportDetailSources } from './source';

const tabs = [ ['overview','Обзор'], ['slides','Слайды'], ['metrics','Метрики и показатели'], ['sources','Источники данных'], ['usage','Использование'], ['mailings','Рассылки'], ['technical','Техническая информация'] ] as const;
const chromeAsset = (name: string) => `/images/report-detail/chrome/${name}.svg`;

function TabIcon({ id, active }: { id: string; active: boolean }) {
  if (id === 'overview' || id === 'slides') {
    const name = id === 'overview' ? active ? 'tab-overview' : 'tab-overview-inactive' : active ? 'tab-slides-active' : 'tab-slides';
    return <img className={s.tabIcon} src={chromeAsset(name)} width="16" height="16" alt="" aria-hidden="true" />;
  }
  return <span className={`${s.tabIcon} ${s.monochromeIcon}`} style={{ maskImage: `url("${chromeAsset(`tab-${id}`)}")` }} aria-hidden="true" />;
}

export function ReportDetail({report,tab,onTabChange,onBack,source,onOpenMetric,empty=false}:{report:ReportSummary;tab:string;onTabChange:(tab:string)=>void;onBack:()=>void;source:ReportDetailSources;onOpenMetric?:(id:string)=>void;empty?:boolean}) {
  const current=tabs.some(t=>t[0]===tab)?tab:'overview';
  const [notice,setNotice]=useState<string>();
  const [bookmark,setBookmark]=useState(false);
  const buttons=useRef<Array<HTMLButtonElement|null>>([]);
  const tabStrip=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const strip=tabStrip.current;
    if(!strip)return;
    function revealActiveTab(){
      const button=buttons.current[tabs.findIndex(item=>item[0]===current)];
      if(!button||!strip)return;
      const bounds=strip.getBoundingClientRect();
      const selected=button.getBoundingClientRect();
      if(selected.left<bounds.left)strip.scrollLeft+=selected.left-bounds.left;
      else if(selected.right>bounds.right)strip.scrollLeft+=selected.right-bounds.right;
    }
    revealActiveTab();
    const observer=new ResizeObserver(revealActiveTab);
    observer.observe(strip);
    return()=>observer.disconnect();
  },[current]);
  const detail=source.read(report.id);
  const known=detail!==undefined;
  const slides=detail?.slides??[];
  const sources=detail?.sources??[];
  const counts:Record<string,number>={slides:known?slides.length:0,metrics:source.metrics.read(report.id)?.length??0,sources:known?sources.length:0};
  return <article className={s.detail} data-report-id={report.id} data-report-tab={current}>
    <header className={s.panel} data-report-chrome>
    <div className={s.breadcrumbRow}><nav className={s.crumbs} aria-label="Хлебные крошки"><button type="button" onClick={onBack}>Отчёты</button><img src={chromeAsset('breadcrumb-chevron')} width="16" height="16" alt="" /><span>Паспорт отчёта</span></nav></div>
    <div className={s.headingBlock}>
    <div className={s.titleRow}><h1 className={s.title}>{report.title}</h1><div className={s.headerActions}>
      <RoundIconButton icon="edit" className={s.iconAction} aria-label="Редактировать отчёт" onClick={()=>setNotice('Редактор отчёта не описан в выбранных экранах.')} />
      <RoundIconButton icon="bookmark" className={s.iconAction} aria-label="Закладка отчёта" aria-pressed={bookmark} onClick={()=>setBookmark(v=>!v)} />
      <button type="button" className={s.openAction} onClick={()=>setNotice('Внешний адрес отчёта не предоставлен. Переход в BI не выполнен.')}><img src={chromeAsset('open-report')} width="16" height="16" alt="" /><span>Открыть отчёт</span></button>
    </div></div>
    <div className={s.meta}><span>{report.verification?.status==='verified'&&<img src={chromeAsset('verified')} width="16" height="16" alt="" />}{report.verification?.status==='verified'?'Карточка проверена':'Не проверено'}</span><img src={chromeAsset('dot')} width="3" height="3" alt="" /><span>{report.domainGroup??report.domain}</span>{known&&<><img src={chromeAsset('dot')} width="3" height="3" alt="" /><span>ID 562</span><img src={chromeAsset('dot')} width="3" height="3" alt="" /><span>Стабильный отчёт&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;Отчет по заявкам Домиленда</span></>}</div>
    </div>
    <div ref={tabStrip} className={s.tabs} role="tablist" aria-label="Вкладки паспорта отчёта">{tabs.map(([id,label],index)=><button ref={node=>{buttons.current[index]=node;}} type="button" role="tab" id={`report-tab-${id}`} aria-controls="report-tabpanel" aria-selected={current===id} tabIndex={current===id?0:-1} className={s.tab} key={id} onClick={e=>{onTabChange(id);e.currentTarget.scrollIntoView({block:'nearest',inline:'nearest'});}}
      onKeyDown={e=>{const step=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(step||e.key==='Home'||e.key==='End'){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+step+tabs.length)%tabs.length;onTabChange(tabs[next][0]);buttons.current[next]?.focus();buttons.current[next]?.scrollIntoView({block:'nearest',inline:'nearest'});}}}>
      <TabIcon id={id} active={current===id} />{label}{counts[id]!==undefined&&<span className={s.tabCount}>{counts[id]}</span>}
    </button>)}</div>
    </header>
    <div id="report-tabpanel" role="tabpanel" aria-labelledby={`report-tab-${current}`}>
      {current==='overview'&&<OverviewTab key={report.id} report={report} content={detail?.overview} empty={empty} />}
      {current==='metrics'&&<MetricsTab reportId={report.id} source={source.metrics} onOpenMetric={onOpenMetric} />}
      {current==='mailings'&&<MailingsTab reportId={report.id} source={source.mailings} />}
      {current==='slides'&&<div className={s.column}>{known?slides.map(title=><Accordion key={title} title={title} description="Сценарии использования данных" defaultOpen={false}><p>Содержимое раскрытого слайда отсутствует в предоставленном макете.</p></Accordion>):<div className={s.limited}>Слайды этого отчёта не предоставлены.</div>}</div>}
      {current==='sources'&&<SourcesTab key={report.id} reportTitle={report.title} content={detail} onNotice={setNotice} />}
      {current==='usage'&&<UsageTab key={report.id} reportId={report.id} source={source.usage} />}
      {current==='technical'&&<div className={s.limited}><h2>Техническая информация</h2><p>Рабочий экран этой вкладки отсутствует в выбранной секции. Содержимое не реализовано.</p></div>}
    </div>
    {notice&&<div role="status" className={s.notice}><button type="button" aria-label="Закрыть уведомление" onClick={()=>setNotice(undefined)}>×</button>{notice}</div>}
  </article>;
}
