import { useRef, useState } from 'react';
import { Accordion } from '../../../components/Accordion/Accordion';
import { EmptyDetail } from '../EmptyDetail';
import type { ReportOverviewContent } from '../source';
import s from '../Detail.module.css';
import { AskQuestionButton } from '../../questions/AskQuestionButton';
import { AskQuestionDialog } from '../../questions/AskQuestionDialog';
import { QuestionSentNotice } from '../../questions/QuestionSentNotice';

export function OverviewTab({ content }: { content?: ReportOverviewContent }) {
  const {description, businessQuestions, terms, methodology, additional, context, questions} = content ?? {};
  const [questionTab, setQuestionTab] = useState('published');
  const [modal, setModal] = useState(false);
  const [sent, setSent] = useState(false);
  const questionTrigger = useRef<HTMLButtonElement>(null);
  return <>
    <div className={s.column}>
      <Accordion icon={<img src="/images/report-detail/ai-hint.svg" alt="" />} title="Об отчёте" description="Назначение и содержание отчёта">
        {description?.trim() ? <><p><strong>Описание</strong></p><p>{description}</p></>
          : <EmptyDetail title="Описание отчёта недоступно" description="Описание этого отчёта не предоставлено в демонстрационном наборе." />}
      </Accordion>
      <Accordion icon={<img src="/images/report-detail/ai-hint.svg" alt="" />} title="На какие вопросы отвечает отчёт" description="Задачи, которые помогает решить" count={businessQuestions?.length}>
        {businessQuestions?.length ? <ol className={s.rows}>{businessQuestions.map((q,i)=><li key={q}><span>{String(i+1).padStart(2,'0')}</span><span>{q}</span></li>)}</ol>
          : <EmptyDetail title={businessQuestions ? 'Вопросы для отчёта не указаны' : 'Сведения о назначении недоступны'} description="Здесь отображаются вопросы, на которые помогает ответить отчёт." />}
      </Accordion>
      <Accordion title="Методология" description="Правила и подход к расчёту">
        {methodology?.length || additional?.trim() ? <>{methodology?.map((paragraph,index)=><p key={index}>{paragraph}</p>)}{additional?.trim() && <><p><strong>Дополнительный функционал</strong></p><p>{additional}</p></>}</>
          : <EmptyDetail title={methodology ? 'Методология пока не добавлена' : 'Сведения о методологии недоступны'} description="Здесь отображаются правила расчётов и пояснения к отчёту." />}
      </Accordion>
      <Accordion title="Бизнес-контексты" description="Сценарии использования данных" count={context === undefined ? undefined : Number(Boolean(context.trim()))}>
        {context?.trim() ? <span className={s.chip}>{context}</span>
          : <EmptyDetail title={context === undefined ? 'Сведения о бизнес-контекстах недоступны' : 'Бизнес-контексты не добавлены'} description="Здесь отображаются связанные с отчётом бизнес-контексты." />}
      </Accordion>
      <Accordion title="Бизнес-термины" description="Понятия и их определения" count={terms?.length}>
        {terms?.length ? <div className={s.chips}>{terms.map(t=><span className={s.chip} key={t}>{t}</span>)}</div>
          : <EmptyDetail title={terms ? 'Бизнес-термины не добавлены' : 'Сведения о бизнес-терминах недоступны'} description="Здесь отображаются связанные с отчётом бизнес-термины." />}
      </Accordion>
      <Accordion title="Вопросы пользователей" description="Уточнения и ответы по отчёту" count={questions?.length} action={
        <AskQuestionButton ref={questionTrigger} onClick={() => { setSent(false); setModal(true); }} />
      }>
        <div className={s.questionTabs} role="tablist" aria-label="Вопросы пользователей">
          <button type="button" role="tab" aria-selected={questionTab==='published'} onClick={()=>setQuestionTab('published')}>Опубликованные</button>
          <button type="button" role="tab" aria-selected={questionTab==='mine'} onClick={()=>setQuestionTab('mine')}>
            Мои вопросы <span className={s.tabCount}>0</span>
          </button>
        </div>
        {questionTab === 'mine' ? <EmptyDetail title="Вопросов пока нет" description="Здесь будут отображаться ваши вопросы по отчёту." />
          : questions?.length ? questions.map(q=><div className={s.question} key={q.title}><strong>{q.title}</strong><span>{q.answer}</span></div>)
          : <EmptyDetail title={questions ? 'Опубликованных вопросов пока нет' : 'Опубликованные вопросы недоступны'} description="Здесь отображаются опубликованные вопросы об отчёте и ответы на них." />}
      </Accordion>
    </div>
    {modal && <AskQuestionDialog onClose={() => {
      setModal(false);
      questionTrigger.current?.focus();
    }} onSubmit={() => setSent(true)} />}
    {sent && <QuestionSentNotice onClose={() => setSent(false)} />}
  </>;
}
