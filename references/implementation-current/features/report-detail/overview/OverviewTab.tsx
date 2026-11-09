import { useRef, useState } from 'react';
import { DescriptionText } from '../../../components/DescriptionText/DescriptionText';
import { Accordion } from '../../../components/Accordion/Accordion';
import { EmptyDetail } from '../EmptyDetail';
import type { ReportOverviewContent } from '../source';
import s from '../Detail.module.css';
import type { ReportSummary } from '../../../data/reports';
import { AskQuestionButton } from '../../questions/AskQuestionButton';
import { AskQuestionDialog } from '../../questions/AskQuestionDialog';
import { QuestionSentNotice } from '../../questions/QuestionSentNotice';

export function OverviewTab({ report, content, sourceCount, empty = false }: {report:ReportSummary;content?:ReportOverviewContent;sourceCount?:number;empty?:boolean}) {
  const available = content !== undefined && !empty;
  const {businessQuestions = [], terms = [], questions = []} = content ?? {};
  const [questionTab, setQuestionTab] = useState('published');
  const [modal, setModal] = useState(false);
  const [sent, setSent] = useState(false);
  const questionTrigger = useRef<HTMLButtonElement>(null);
  return <div className={s.overview}>
    <div className={s.column}>
      <Accordion icon={<img src="/images/report-detail/ai-hint.svg" alt="" />} title="Об отчёте" description="Назначение и содержание отчёта">
        {available && content!.description.trim() ? <><p><strong>Описание</strong></p><p>{content!.description}</p></>
          : <EmptyDetail title="Описание отчёта недоступно" description="Описание этого отчёта не предоставлено в демонстрационном наборе." />}
      </Accordion>
      <Accordion icon={<img src="/images/report-detail/ai-hint.svg" alt="" />} title="На какие вопросы отвечает отчёт" description="Задачи, которые помогает решить" count={available ? businessQuestions.length : undefined}>
        {available && businessQuestions.length ? <ol className={s.rows}>{businessQuestions.map((q,i)=><li key={q}><span>{String(i+1).padStart(2,'0')}</span><span>{q}</span></li>)}</ol>
          : <EmptyDetail title={available ? 'Вопросы для отчёта не указаны' : 'Сведения о назначении недоступны'} description="Здесь отображаются вопросы, на которые помогает ответить отчёт." />}
      </Accordion>
      <Accordion title="Методология" description="Правила и подход к расчёту">
        {available && (content!.methodology.length > 0 || content!.additional.trim()) ? <>{content!.methodology.map((paragraph,index)=><p key={index}>{paragraph}</p>)}{content!.additional.trim() && <><p><strong>Дополнительный функционал</strong></p><p>{content!.additional}</p></>}</>
          : <EmptyDetail title={available ? 'Методология пока не добавлена' : 'Сведения о методологии недоступны'} description="Здесь отображаются правила расчётов и пояснения к отчёту." />}
      </Accordion>
      <Accordion title="Бизнес-контексты" description="Сценарии использования данных" count={available ? Number(Boolean(content!.context.trim())) : undefined}>
        {available && content!.context.trim() ? <span className={s.chip}>{content!.context}</span>
          : <EmptyDetail title={available ? 'Бизнес-контексты не добавлены' : 'Сведения о бизнес-контекстах недоступны'} description="Здесь отображаются связанные с отчётом бизнес-контексты." />}
      </Accordion>
      <Accordion title="Бизнес-термины" description="Понятия и их определения" count={available ? terms.length : undefined}>
        {available && terms.length ? <div className={s.chips}>{terms.map(t=><span className={s.chip} key={t}>{t}</span>)}</div>
          : <EmptyDetail title={available ? 'Бизнес-термины не добавлены' : 'Сведения о бизнес-терминах недоступны'} description="Здесь отображаются связанные с отчётом бизнес-термины." />}
      </Accordion>
      <Accordion title="Вопросы пользователей" description="Уточнения и ответы по отчёту" count={available ? questions.length : undefined} action={
        <AskQuestionButton ref={questionTrigger} onClick={() => { setSent(false); setModal(true); }} />
      }>
        <div className={s.questionTabs} role="tablist" aria-label="Вопросы пользователей">
          <button type="button" role="tab" aria-selected={questionTab==='published'} onClick={()=>setQuestionTab('published')}>Опубликованные</button>
          <button type="button" role="tab" aria-selected={questionTab==='mine'} onClick={()=>setQuestionTab('mine')}>
            Мои вопросы <span className={s.tabCount}>0</span>
          </button>
        </div>
        {questionTab === 'mine' ? <EmptyDetail title="Вопросов пока нет" description="Здесь будут отображаться ваши вопросы по отчёту." />
          : available && questions.length ? questions.map(q=><div className={s.question} key={q.title}><strong>{q.title}</strong><span>{q.answer}</span></div>)
          : <EmptyDetail title={available ? 'Опубликованных вопросов пока нет' : 'Опубликованные вопросы недоступны'} description="Здесь отображаются опубликованные вопросы об отчёте и ответы на них." />}
      </Accordion>
    </div>
    <aside className={`${s.info} ${s.overviewInfo}`} aria-label="Сведения об отчёте">
      <h2>Сведения<small>Обновление, источники и ответственные за отчёт</small></h2>
      <dl>{[['Обновление',(!empty && content?.refreshSchedule) || 'Не указано'],['Платформа',report.platform??'Не указана'],['Мастер-системы',report.masterSystem??'Не указаны'],['Источники',!empty && sourceCount !== undefined ? sourceCount : 'Не указаны']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {!empty && content?.people?.map(({ name, description, role, avatar }) => <div className={s.person} key={role}><img src={avatar} alt="" /><div>{name}<small><DescriptionText text={description} /></small></div><span className={s.chip}>{role}</span></div>)}
    </aside>
    {modal && <AskQuestionDialog onClose={() => {
      setModal(false);
      questionTrigger.current?.focus();
    }} onSubmit={() => setSent(true)} />}
    {sent && <QuestionSentNotice onClose={() => setSent(false)} />}
  </div>;
}
