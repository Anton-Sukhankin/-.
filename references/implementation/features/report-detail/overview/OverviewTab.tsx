import { useEffect, useRef, useState } from 'react';
import { Accordion } from '../../../components/Accordion/Accordion';
import type { ReportOverviewContent } from '../source';
import s from '../Detail.module.css';
import type { ReportSummary } from '../../../data/reports';

export function EmptyDetail({ title, description }: {title:string;description:string}) {
  return <div className={s.empty}><img src="/images/report-detail/empty.png" alt="" /><strong>{title}</strong><span>{description}</span></div>;
}

export function OverviewTab({ report, content, empty = false }: {report:ReportSummary;content?:ReportOverviewContent;empty?:boolean}) {
  const available = content !== undefined && !empty;
  const {businessQuestions = [], terms = [], questions = []} = content ?? {};
  const [questionTab, setQuestionTab] = useState('published');
  const [modal, setModal] = useState(false);
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const questionTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if(modal && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [modal]);
  return <div className={s.overview}>
    <div className={s.column}>
      <Accordion icon={<img src="/images/report-detail/ai-hint.svg" alt="" />} title="Об отчёте" description="Назначение и содержание отчёта">
        <p><strong>Описание</strong></p><p>{available ? content!.description : 'Описание этого отчёта не предоставлено в демонстрационном наборе.'}</p>
      </Accordion>
      <Accordion icon={<img src="/images/report-detail/ai-hint.svg" alt="" />} title="На какие вопросы отвечает отчёт" description="Задачи, которые помогает решить" count={available ? businessQuestions.length : 0}>
        {available ? <ol className={s.rows}>{businessQuestions.map((q,i)=><li key={q}><span>{String(i+1).padStart(2,'0')}</span><span>{q}</span></li>)}</ol> : <p>Вопросы для этого отчёта не указаны.</p>}
      </Accordion>
      <Accordion title="Методология" description="Правила и подход к расчёту" count={available ? undefined : 'Не добавлена'}>
        {available ? <>{content!.methodology.map((paragraph,index)=><p key={index}>{paragraph}</p>)}<p><strong>Дополнительный функционал</strong></p><p>{content!.additional}</p></> : <EmptyDetail title="Методология пока не добавлена" description="Здесь появятся правила расчётов и пояснения к отчёту." />}
      </Accordion>
      <Accordion title="Бизнес-контексты" description="Сценарии использования данных" count={available ? 1 : 'Не добавлены'}>
        {available ? <span className={s.chip}>{content!.context}</span> : <EmptyDetail title="Бизнес-контексты не добавлены" description="Здесь появятся связанные с отчётом бизнес-контексты." />}
      </Accordion>
      <Accordion title="Бизнес-термины" description="Понятия и их определения" count={available ? terms.length : 'Не добавлены'}>
        {available ? <div className={s.chips}>{terms.map(t=><span className={s.chip} key={t}>{t}</span>)}</div> : <EmptyDetail title="Бизнес-термины не добавлены" description="Здесь появятся связанные с отчётом бизнес-термины." />}
      </Accordion>
      <Accordion title="Вопросы пользователей" description="Уточнения и ответы по отчёту" count={available ? questions.length : 'Пока нет'} action={<button ref={questionTrigger} className={s.button} type="button" onClick={()=>setModal(true)}>Задать вопрос</button>}>
        <div className={s.questionTabs} role="tablist" aria-label="Вопросы пользователей">{[['published','Опубликованные'],['mine','Мои вопросы 0']].map(([id,title])=><button type="button" role="tab" key={id} aria-selected={questionTab===id} onClick={()=>setQuestionTab(id)}>{title}</button>)}</div>
        {available && questionTab==='published' ? questions.map(q=><div className={s.question} key={q.title}><strong>{q.title}</strong><span>{q.answer}</span></div>) : <EmptyDetail title="Вопросов пока нет" description="Здесь появятся опубликованные вопросы об отчёте и ответы на них." />}
      </Accordion>
    </div>
    <aside className={s.info} aria-label="Сведения об отчёте">
      <h2>Сведения<small>Обновление, источники и ответственные за отчёт</small></h2>
      <dl>{[['Обновление',available?'Ежедневно, в 5:00':'Не указано'],['Платформа',report.platform??'Не указана'],['Мастер-системы',report.masterSystem??'Не указаны'],['Источники',available?'Нет':'Не указаны']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {available && [['Губина Екатерина Игоревна','24.07.2026, 15:02 · Бизнес-аналитик','Проверил','/images/report-table/avatar-sales-plan.png'],['Ручнов Константин Михайлович','Директор по клиентскому сервису','Владелец','/images/report-table/avatar-summary.png'],['Губина Екатерина Игоревна','Бизнес-аналитик','Аналитик','/images/favorites/avatar-placeholder.svg']].map(([name,description,role,avatar])=><div className={s.person} key={role}><img src={avatar} alt="" /><div>{name}<small>{description}</small></div><span className={s.chip}>{role}</span></div>)}
    </aside>
    {modal && <dialog ref={dialog} className={s.modal} aria-labelledby="question-heading" onCancel={event=>{event.preventDefault();dialog.current?.close();}} onClose={()=>{setModal(false);questionTrigger.current?.focus();}}>
      <button type="button" className={s.button} style={{float:'right'}} aria-label="Закрыть форму вопроса" onClick={()=>dialog.current?.close()}>×</button>
      <h2 id="question-heading">Задать вопрос</h2><form onSubmit={e=>{e.preventDefault();if(!draft.trim())return;setSent(true);setDraft('');dialog.current?.close();}}>
        <label>Ваш вопрос <span aria-hidden="true" style={{color:'#d94242'}}>*</span><textarea autoFocus required value={draft} placeholder="Введите вопрос об отчёте" onChange={e=>setDraft(e.target.value)} /></label>
        <footer><button type="button" className={s.button} onClick={()=>dialog.current?.close()}>Отмена</button><button className={`${s.button} ${s.primary}`} disabled={!draft.trim()}>Отправить</button></footer>
      </form>
    </dialog>}
    {sent && <div role="status" className={s.notice}><button type="button" aria-label="Закрыть уведомление" onClick={()=>setSent(false)}>×</button><strong>Вопрос отправлен</strong><div>Ваш вопрос успешно отправлен.</div><small className={s.muted}>Демонстрация. Серверная доставка не подключена.</small></div>}
  </div>;
}
