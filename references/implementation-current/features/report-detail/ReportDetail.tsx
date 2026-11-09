import { RoundIconButton } from '../../components/RoundIconButton/RoundIconButton';
import { useLayoutEffect, useRef, useState } from 'react';
import type { ReportSummary } from '../../data/reports';
import { Accordion } from '../../components/Accordion/Accordion';
import { EmptyDetail } from './EmptyDetail';
import { OverviewTab } from './overview/OverviewTab';
import { MetricsTab } from './metrics/MetricsTab';
import { MailingsTab } from './mailings/MailingsTab';
import { UsageTab } from './usage/UsageTab';
import { SourcesTab } from './sources/SourcesTab';
import { TechnicalTab } from './technical/TechnicalTab';
import { DetailSecondary } from '../../components/DetailHeader/DetailSecondary';
import { DetailBreadcrumbs, type DetailCrumb } from '../../components/DetailHeader/DetailBreadcrumbs';
import chrome from '../../components/DetailHeader/DetailHeader.module.css';
import { useDetailScroll } from '../../components/DetailHeader/useDetailScroll';
import s from './Detail.module.css';
import type { ReportDetailSources } from './source';

const tabs = [ ['overview','Обзор'], ['slides','Слайды'], ['metrics','Метрики и показатели'], ['sources','Источники данных'], ['usage','Использование'], ['mailings','Рассылки'], ['technical','Техническая информация'] ] as const;
const chromeAsset = (name: string) => `/images/report-detail/chrome/${name}.svg`;

export function ReportDetail({report,tab,onTabChange,onBack,breadcrumbs,source,onOpenMetric,onOpenSource,empty=false}:{report:ReportSummary;tab:string;onTabChange:(tab:string)=>void;onBack:()=>void;breadcrumbs?:readonly DetailCrumb[];source:ReportDetailSources;onOpenMetric?:(id:string)=>void;onOpenSource:(id:string)=>void;empty?:boolean}) {
  const current=tabs.some(t=>t[0]===tab)?tab:'overview';
  const { compact, scroll, onScroll } = useDetailScroll(current);
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
  const counts:Partial<Record<string,number>>={
    slides:detail?.slides.length,
    metrics:source.metrics.read(report.id)?.length,
    sources:detail?.sources.length,
  };
  return <article className={`${chrome.frame} ${s.detail}`} data-report-id={report.id} data-report-tab={current} data-detail-compact={compact}>
    <header className={`${chrome.chrome} ${s.panel}`} data-report-chrome>
    <DetailSecondary compact={compact}>
    <div className={chrome.breadcrumbRow}><DetailBreadcrumbs ancestors={breadcrumbs ?? [{label:'Отчёты',onSelect:onBack}]} current="Паспорт отчёта" /></div>
    </DetailSecondary>
    <div className={s.headingBlock}>
    <div className={s.titleRow}><h1 className={s.title}>{report.title}</h1><div className={s.headerActions}>
      <RoundIconButton icon="edit" className={s.iconAction} aria-label="Редактировать отчёт" onClick={()=>setNotice('Редактор отчёта не описан в выбранных экранах.')} />
      <RoundIconButton icon="bookmark" className={s.iconAction} aria-label="Закладка отчёта" aria-pressed={bookmark} onClick={()=>setBookmark(v=>!v)} />
      <button type="button" className={s.openAction} onClick={()=>setNotice('Внешний адрес отчёта не предоставлен. Переход в BI не выполнен.')}><img src={chromeAsset('open-report')} width="16" height="16" alt="" /><span>Открыть отчёт</span></button>
    </div></div>
    <DetailSecondary compact={compact}>
    <div className={s.meta}>
      <span>{report.verification?.status==='verified'&&<img src={chromeAsset('verified')} width="16" height="16" alt="" />}{report.verification?.status==='verified'?'Карточка проверена':'Не проверено'}</span>
      <img src={chromeAsset('dot')} width="3" height="3" alt="" /><span>{report.domainGroup??report.domain}</span>
      {detail?.catalogId && <><img src={chromeAsset('dot')} width="3" height="3" alt="" /><span>ID {detail.catalogId}</span></>}
      {detail?.headingNote && <><img src={chromeAsset('dot')} width="3" height="3" alt="" /><span>{detail.headingNote}</span></>}
      {detail?.demonstration && <><img src={chromeAsset('dot')} width="3" height="3" alt="" /><span>Демонстрационные данные</span></>}
    </div>
    </DetailSecondary>
    </div>
    <div ref={tabStrip} className={s.tabs} role="tablist" aria-label="Вкладки паспорта отчёта">{tabs.map(([id,label],index)=><button ref={node=>{buttons.current[index]=node;}} type="button" role="tab" id={`report-tab-${id}`} aria-controls="report-tabpanel" aria-selected={current===id} tabIndex={current===id?0:-1} className={s.tab} key={id} onClick={e=>{onTabChange(id);e.currentTarget.scrollIntoView({block:'nearest',inline:'nearest'});}}
      onKeyDown={e=>{const step=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(step||e.key==='Home'||e.key==='End'){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+step+tabs.length)%tabs.length;onTabChange(tabs[next][0]);buttons.current[next]?.focus();buttons.current[next]?.scrollIntoView({block:'nearest',inline:'nearest'});}}}>
      {label}{counts[id]!==undefined&&<span className={s.tabCount}>{counts[id]}</span>}
    </button>)}</div>
    </header>
    <div ref={scroll} className={current === 'metrics' ? s.metricsViewport : chrome.scroll} data-detail-scroll data-detail-tab-content data-list-scroll={current === 'metrics' ? undefined : ''}
      onScrollCapture={onScroll} tabIndex={current === 'metrics' ? undefined : 0}
      id="report-tabpanel" role="tabpanel" aria-labelledby={`report-tab-${current}`}>
      <div className={`${chrome.scrollContent} ${s.tabContent}`}>
      {current==='overview'&&<OverviewTab key={report.id} report={report} content={detail?.overview} sourceCount={detail?.sources.length} empty={empty} />}
      {current==='metrics'&&<MetricsTab reportId={report.id} source={source.metrics} onOpenMetric={onOpenMetric} />}
      {current==='mailings'&&<MailingsTab reportId={report.id} source={source.mailings} />}
      {current==='slides'&&(slides.length > 0
        ? <div className={s.column}>{slides.map((slide, index) => <Accordion key={slide.title} title={slide.title}
          description="Сценарии использования данных" defaultOpen={detail?.demonstration === true && index === 0}>
          <p>{slide.description}</p>
          {!detail?.demonstration && <p className={s.muted}>Демонстрационные значения</p>}
          <dl className={s.slideExample} aria-label="Демонстрационные значения слайда">
            {slide.example.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        </Accordion>)}</div>
        : <EmptyDetail viewport title={known ? 'У отчёта пока нет слайдов' : 'Слайды отчёта недоступны'} description="В этой вкладке отображаются слайды, связанные с отчётом." />)}
      {current==='sources'&&<SourcesTab key={report.id} reportTitle={report.title} content={detail} onOpenSource={onOpenSource} />}
      {current==='usage'&&<UsageTab key={report.id} reportId={report.id} source={source.usage} />}
      {current==='technical'&&<TechnicalTab report={report} detail={detail} />}
      </div>
    </div>
    {notice&&<div role="status" className={s.notice}><button type="button" aria-label="Закрыть уведомление" onClick={()=>setNotice(undefined)}>×</button>{notice}</div>}
  </article>;
}
