import { RoundIconButton } from '../../../components/RoundIconButton/RoundIconButton';
import { DescriptionText } from '../../../components/DescriptionText/DescriptionText';
import { useContext, useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import { useLocation } from 'react-router';
import type { MetricSummary, MetricDetailProfile, MetricDetailSection, MetricPerson } from '../../../data/metrics';
import { Accordion } from '../../../components/Accordion/Accordion';
import { EmptyState } from '../../../components/EmptyState/EmptyState';
import { DetailSecondary } from '../../../components/DetailHeader/DetailSecondary';
import { DetailBreadcrumbs, type DetailCrumb } from '../../../components/DetailHeader/DetailBreadcrumbs';
import chrome from '../../../components/DetailHeader/DetailHeader.module.css';
import { useDetailScroll } from '../../../components/DetailHeader/useDetailScroll';
import { SearchLandingContext, SearchTargetText } from '../../../components/Search/SearchMatch';
import { searchId, searchOffsets, type SearchHit } from '../../../data/catalogSearch';
import type { QuestionDraft } from '../../../data/questions';
import { QuestionSentNotice } from '../../questions/QuestionSentNotice';
import s from './MetricDetail.module.css';

export interface MetricDetailProps {
  metric: MetricSummary;
  profile: MetricDetailProfile;
  onOpenMetric?: (id: string) => void;
  onBack: () => void;
  breadcrumbs?: readonly DetailCrumb[];
  onOpenReport?: (id: string) => void;
  onSubmitQuestion: (draft: QuestionDraft) => void;
}

const asset = (name: string) => `/images/metrics/detail/${name}`;
const unavailable = 'Действие недоступно: исходный результат и сохранение не определены.';

function DefinitionTooltip({ text }: { text: string }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const dismissed = useRef(false);
  const root = useRef<HTMLSpanElement>(null);
  const hovered = useRef(false);
  useEffect(() => {
    if (!visible) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { dismissed.current = true; setVisible(false); }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [visible]);
  return <span ref={root} className={s.info} onPointerEnter={() => { hovered.current = true; if (!dismissed.current) setVisible(true); }}
    onPointerLeave={() => { hovered.current = false; dismissed.current = false; if (!root.current?.contains(document.activeElement)) setVisible(false); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { dismissed.current = false; if (!hovered.current) setVisible(false); } }}>
    <button type="button" aria-label="Определение показателя" aria-describedby={visible ? id : undefined}
      onFocus={() => { dismissed.current = false; setVisible(true); }}><img src={asset('info.svg')} alt="" /></button>
    {visible && <span id={id} role="tooltip" className={s.tooltip}>{text}</span>}
  </span>;
}

function Passport({ profile }: { profile: MetricDetailProfile }) {
  return <aside className={s.passport} aria-label="Сведения о показателе">
    <header><strong>Сведения</strong><small>Параметры, проверка и ответственные за показатель</small></header>
    <div className={s.fields}>
      <div><small>Единица измерения</small><span>{profile.unitLabel}</span></div>
      <div className={s.dates}><div><small>Создана</small><span>{profile.created}</span></div><div><small>Изменена</small><span>{profile.updated}</span></div></div>
    </div>
    {profile.people.map(person => <div key={person.role} className={person.role === 'Проверил' ? s.checker : s.person}><Person {...person} /></div>)}
  </aside>;
}

function Person({ name, role, description, placeholder = false }: MetricPerson) {
  return <div className={s.personRow}><img className={s.avatar} src={asset(placeholder ? 'unknown-avatar.svg' : 'person.png')} alt="" />
    <div className={s.personText}><div><span>{name}</span><span className={s.role}>{role}</span></div><small><DescriptionText text={description} /></small></div></div>;
}

function MetricQuestionForm({ onSubmit }: { onSubmit: (message: string) => void }) {
  const [draft, setDraft] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);
  const message = draft.trim();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message) return;
    onSubmit(message);
    setDraft('');
    field.current?.focus();
  }

  return <form className={s.question} onSubmit={submit}>
    <label>Ваш вопрос <span aria-hidden="true">*</span>
      <textarea ref={field} value={draft} onChange={event => setDraft(event.target.value)} required placeholder="Что нужно уточнить по этой карточке?" />
    </label>
    <button type="submit" disabled={!message}><Send size={16} strokeWidth={1.5} aria-hidden="true" />Отправить вопрос</button>
  </form>;
}

function SectionBody({ section, target, descriptionHit, onOpenReport, onOpenMetric, onAsk }: {
  section: MetricDetailSection; target: string; descriptionHit?: SearchHit;
  onOpenReport?: MetricDetailProps['onOpenReport']; onOpenMetric?: MetricDetailProps['onOpenMetric'];
  onAsk: (message: string) => void;
}) {
  const body = section.body;
  if (body.kind === 'method') return <table className={s.method}><thead><tr>{body.columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>
    {body.rows.map(([label, rule], index) => <tr key={label}><td>{label}</td><td><SearchTargetText id={target} field={String(index)} text={rule} /></td></tr>)}
  </tbody></table>;
  if (body.kind === 'question') return <MetricQuestionForm onSubmit={onAsk} />;
  if (body.kind === 'prose') {
    const descriptionInBody = descriptionHit && searchOffsets(body.text, descriptionHit.query)[descriptionHit.occurrence ?? 0] !== undefined;
    return <div className={s.prose}>
      {descriptionHit && !descriptionInBody && <p><SearchTargetText id={descriptionHit.entry.id} field="description" text={descriptionHit.value.text} /></p>}
      {descriptionInBody
        ? <SearchTargetText id={descriptionHit.entry.id} field="description" text={body.text} />
        : <SearchTargetText id={target} field="body" text={body.text} />}
    </div>;
  }
  if (!body.items.length) return <EmptyState compact title={body.emptyText} description={section.description} />;
  return <div>{body.items.map((item, i) => <div className={s.relation} key={item.text}>
    {item.reportId && onOpenReport ? <button type="button" className={s.reportLink} onClick={() => onOpenReport(item.reportId!)} title={'Открыть отчёт «' + item.text.split('\n')[0] + '»'}>{item.text}</button>
      : item.metricId && onOpenMetric ? <button type="button" className={s.reportLink} onClick={() => onOpenMetric(item.metricId!)}>{item.text}</button>
      : <span className={s.prose}>{item.text}</span>}
    {body.detachable && <button className={i === 0 ? s.outline : s.neutral} type="button" aria-disabled="true" title={unavailable}>Отвязать</button>}
  </div>)}</div>;
}

export function MetricDetail({ metric, profile, onBack, breadcrumbs, onOpenReport, onOpenMetric, onSubmitQuestion }: MetricDetailProps) {
  const { compact, scroll, onScroll } = useDetailScroll();
  const [open, setOpen] = useState<readonly boolean[]>(() => profile.sections.map(() => true));
  const [questionSent, setQuestionSent] = useState(false);
  const hit = useContext(SearchLandingContext);
  const destination = hit?.entry.destination;
  const targetBlock = destination?.kind === 'metric-block' && destination.metricId === metric.id ? destination.blockId : undefined;
  const descriptionHit = destination?.kind === 'metric' && destination.id === metric.id && hit?.value.field === 'description' ? hit : undefined;
  const routeKey = useLocation().key;
  function submitQuestion(message: string) {
    onSubmitQuestion({ subject: `Вопрос по показателю «${metric.title}»`, message });
    setQuestionSent(true);
  }
  useLayoutEffect(() => {
    const index = profile.sections.findIndex(section => section.id === targetBlock);
    if (index >= 0) setOpen(previous => previous[index] ? previous : previous.map((value, i) => i === index || value));
  }, [profile.sections, routeKey, targetBlock]);
  return <article className={`${chrome.frame} ${s.detail}`} data-metric-detail-id={metric.id} data-detail-compact={compact}>
    <header className={`${chrome.chrome} ${s.header}`}>
      <DetailSecondary compact={compact}>
      <div className={chrome.breadcrumbRow}><DetailBreadcrumbs ancestors={breadcrumbs ?? [{label:'Метрики и показатели',onSelect:onBack}]} current="Паспорт показателя" /></div>
      </DetailSecondary>
      <div className={s.heading}><h1 className={s.title}>{metric.title}</h1><DefinitionTooltip key={metric.id} text={metric.description} />
        <div className={s.actions}><RoundIconButton icon="edit" aria-label="Редактировать показатель" aria-disabled="true" title={unavailable}></RoundIconButton><RoundIconButton icon="bookmark" aria-label="Добавить показатель в избранное" aria-disabled="true" title={unavailable}></RoundIconButton></div>
      </div>
      <div className={s.attributes}><span>{metric.status === 'Проверена' && <img src={asset('verified.svg')} alt="" />}{metric.status === 'Проверена' ? 'Карточка проверена' : metric.status}</span><img className={s.dot} src={asset('dot.svg')} alt="" /><span>{metric.type}</span><img className={s.dot} src={asset('dot.svg')} alt="" /><span>{metric.domain}</span>{profile.displayId && <><img className={s.dot} src={asset('dot.svg')} alt="" /><span>ID {profile.displayId}</span></>}</div>
    </header>
    <div ref={scroll} className={`${chrome.scroll} ${s.scroll}`} data-detail-scroll data-metric-detail-scroll data-list-scroll
      onScrollCapture={onScroll} tabIndex={0} role="region" aria-label="Содержимое паспорта показателя">
      <div className={`${chrome.scrollContent} ${s.columns}`}><div className={s.sections}>{profile.sections.map((section, index) => <Accordion key={section.id}
        variant="metric" chevronSize={index === 0 || index === 2 || index === 3 ? 40 : 32}
        title={section.title} description={section.description} count={section.body.kind === 'relations' ? section.body.items.length : undefined}
        open={open[index]} onOpenChange={value => setOpen(previous => previous.map((item, i) => i === index ? value : item))}>
        <SectionBody section={section} target={searchId('metric-block', metric.id, section.id)} descriptionHit={index === 0 ? descriptionHit : undefined}
          onOpenReport={onOpenReport} onOpenMetric={onOpenMetric} onAsk={submitQuestion} />
      </Accordion>)}</div><Passport profile={profile} /></div>
    </div>
    {questionSent && <QuestionSentNotice onClose={() => setQuestionSent(false)} />}
  </article>;
}
