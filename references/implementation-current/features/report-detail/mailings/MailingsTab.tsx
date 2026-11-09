import { useId, useState } from 'react';
import { EmptyDetail } from '../EmptyDetail';
import s from './MailingsTab.module.css';
import { demoMailingsSource } from './source';
import type { MailingsSource, ReportMailing } from './source';

type Segment = 'list' | 'create' | 'manual';
interface MailingForm {
  segment: Segment;
  subscribed: Record<string, boolean>;
  channels: string[];
  days: number[];
  time: string;
  profileQueries: Record<string, string>;
  latest: string[];
}
const segments: readonly { id: Segment; label: string }[] = [
  { id: 'list', label: 'Доступные рассылки' },
  { id: 'create', label: 'Создать рассылку' },
  { id: 'manual', label: 'Ручная отправка' },
];
const channels = ['Почта, себе', 'Толк, себе'];
const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const fields = [
  { id: 'rgp-project', label: 'РГП (ПРОЕКТ)', searchable: true },
  { id: 'rgp-manager', label: 'Профайлы менеджер РГП', searchable: true },
  { id: 'excluded-projects', label: 'Исключенные тех проекты Потенциал', searchable: true },
  { id: 'projects', label: 'Проекты РГП', searchable: false },
] as const;
function initialForm(mailings: readonly ReportMailing[]): MailingForm {
  return { segment: 'list', subscribed: Object.fromEntries(mailings.map(item => [item.id, item.subscribed])), channels: [...channels], days: [0, 1, 2, 3, 4], time: '09:00', profileQueries: {}, latest: [] };
}
function toggle<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter(item => item !== value) : [...values, value];
}

/** Demo state is isolated per report and exists only for this mounted tab. */
export function MailingsTab({ reportId, source = demoMailingsSource }: { reportId: string; source?: MailingsSource }) {
  const [byReport, setByReport] = useState<Record<string, MailingForm>>({});
  const [notice, setNotice] = useState<{ reportId: string; message: string }>();
  const controlId = useId();
  const providedMailings = source.list(reportId);
  const mailings = providedMailings ?? [];
  const current = byReport[reportId] ?? initialForm(mailings);
  function update(change: (previous: MailingForm) => MailingForm) {
    setByReport(previous => ({ ...previous, [reportId]: change(previous[reportId] ?? initialForm(mailings)) }));
  }
  function limit(message: string) { setNotice({ reportId, message }); }
  function selectSegment(segment: Segment) {
    setNotice(undefined);
    update(previous => ({ ...previous, segment }));
  }
  return <section className={s.root} aria-label="Рассылки отчёта" data-mailings-report={reportId}>
    <div className={s.panel}>
      <div className={s.segmentBar}>
        <div className={s.segments} role="group" aria-label="Раздел рассылок">
          {segments.map(item => <button type="button" key={item.id} aria-pressed={current.segment === item.id}
            onClick={() => selectSegment(item.id)}>{item.label}</button>)}
        </div>
      </div>
      {current.segment === 'create' && <>
        <div className={s.introduction}>
          <div><h2>Новая рассылка</h2><p>Если нужной рассылки нет, оставьте заявку. Укажите дни, время и способ получения.</p></div>
          <button type="button" className={s.primary} onClick={() => limit('Заявка не отправлена: адрес и обработчик Service Desk пока не определены.')}>Отправить заявку в SD</button>
        </div>
        <section className={s.schedule} aria-labelledby={`${controlId}-schedule`}>
          <h2 id={`${controlId}-schedule`}>Расписание</h2>
          <p>Выберите дни и время регулярной отправки отчёта.</p>
          <div className={s.scheduleFields}>
            <fieldset><legend>Способ получения</legend><div className={s.pills}>
              {channels.map(channel => <button type="button" key={channel} aria-pressed={current.channels.includes(channel)}
                onClick={() => update(previous => ({ ...previous, channels: toggle(previous.channels, channel) }))}>{channel}</button>)}
            </div></fieldset>
            <fieldset><legend>Дни недели</legend><div className={s.pills}>
              {days.map((day, index) => <button type="button" key={day} className={s.day} aria-pressed={current.days.includes(index)}
                onClick={() => update(previous => ({ ...previous, days: toggle(previous.days, index) }))}>{day}</button>)}
            </div></fieldset>
            <label className={s.time}>Время отправки · МСК
              <input type="time" aria-label="Время отправки · МСК" value={current.time}
                onChange={event => update(previous => ({ ...previous, time: event.target.value }))} />
            </label>
          </div>
        </section>
        <section className={s.profile} aria-labelledby={`${controlId}-profile`}>
          <div className={s.profileHeading}>
            <div><h2 id={`${controlId}-profile`}>Профиль РГП</h2><p>Задайте параметры данных, которые нужно включить в отчёт при отправке.</p></div>
            <button type="button" className={s.profileButton} onClick={() => limit('Профиль не применён: варианты значений и обработчик применения пока не определены.')}>Применять профиль</button>
          </div>
          <div className={s.profileFields}>
            {fields.map(field => <div key={field.id} className={s.profileField}>
              <label htmlFor={field.searchable ? `${controlId}-${field.id}` : undefined}>{field.label}</label>
              {field.searchable && <div className={s.search}>
                <svg aria-hidden="true" viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></svg>
                <input id={`${controlId}-${field.id}`} placeholder="Поиск значения" value={current.profileQueries[field.id] ?? ''}
                  aria-describedby={`${controlId}-profile-limit`}
                  onChange={event => update(previous => ({ ...previous, profileQueries: { ...previous.profileQueries, [field.id]: event.target.value } }))} />
              </div>}
              <label className={s.checkbox}><input type="checkbox" checked={current.latest.includes(field.id)}
                onChange={() => update(previous => ({ ...previous, latest: toggle(previous.latest, field.id) }))} />Последнее значение</label>
            </div>)}
          </div>
          <p className={s.hint}>«Последнее значение» подставляет актуальное значение перед каждой отправкой.</p>
          <span className={s.screenReader} id={`${controlId}-profile-limit`}>В прототипе сохраняется только введённый текст. Списки значений и серверное вычисление ещё не определены.</span>
        </section>
      </>}
    </div>
    {current.segment === 'list' && (mailings.length === 0
      ? <EmptyDetail viewport title={providedMailings ? 'Нет доступных рассылок' : 'Список рассылок недоступен'} description="Здесь отображаются рассылки, на которые можно подписаться для этого отчёта." />
      : <div className={s.list}>
      {mailings.map(mailing => {
        const subscribed = Boolean(current.subscribed[mailing.id]);
        return <article className={s.row} key={mailing.id} data-mailing-id={mailing.id}>
          <span className={s.icon} aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M2.5 4h11v8h-11zM3 4.5l5 4 5-4"/></svg></span>
          <h3>{mailing.name}</h3>
          <span className={s.statusCell}><span className={subscribed ? s.subscribed : s.unsubscribed}>{subscribed ? 'Вы подписаны' : 'Нет подписки'}</span></span>
          <time dateTime={mailing.dateTime}>{mailing.displayDate}</time>
          <button type="button" className={subscribed ? s.secondary : s.primary} aria-label={`${subscribed ? 'Отписаться' : 'Подписаться'}: ${mailing.name}`}
            onClick={() => {
              update(previous => ({ ...previous, subscribed: { ...previous.subscribed, [mailing.id]: !previous.subscribed[mailing.id] } }));
              limit('Статус изменён только в демонстрации. Реальная подписка и отправка сообщений не выполняются.');
            }}>{subscribed ? 'Отписаться' : 'Подписаться'}</button>
        </article>;
      })}
    </div>)}
    {current.segment === 'manual' && <section className={s.limited}>
      <h2>Ручная отправка</h2><p>Экран ручной отправки ещё не определён. Отправка отчёта из прототипа недоступна.</p>
    </section>}
    {notice?.reportId === reportId && <div className={s.notice} role="status">
      <span>{notice.message}</span><button type="button" aria-label="Закрыть уведомление рассылок" onClick={() => setNotice(undefined)}>×</button>
    </div>}
  </section>;
}
