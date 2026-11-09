import type { ReportOverviewContent, ReportSlide } from '../features/report-detail/source';
import { demoReportSource } from '../features/report-detail/sources/demoSource';
import type { ReportDataSource } from '../features/report-detail/sources/model';
import { reportMetricIds } from './metrics';

interface ReportPassportExample {
  overview: ReportOverviewContent;
  slides: readonly ReportSlide[];
  metricIds: readonly string[];
  sources: readonly [ReportDataSource, ReportDataSource];
  mailingNames: readonly [string, string];
  monthlyUsers: readonly [number, number, number, number, number, number];
}

// Authored examples keyed by report identity. Relationships and usage are local demo data.
export const reportPassportExamples: ReadonlyMap<string, ReportPassportExample> = new Map<string, ReportPassportExample>([
  ['demo-report-motivation', {
    overview: {
      description: 'Отчёт помогает сопоставить результаты сотрудников с целями команды и понять, где нужна поддержка руководителя.',
      businessQuestions: ['Какие команды достигли целей за месяц?', 'Где изменилось качество обслуживания?'],
      methodology: ['План и факт сравниваются за один период. Результаты сотрудников группируются по командам.'],
      additional: '', context: 'Оценка результатов команды', terms: ['План', 'Факт', 'Оценка сервиса'],
      questions: [{ title: 'Включает ли пример суммы премий?', answer: 'Пример показывает результаты команды. Суммы выплат не представлены.' }],
      refreshSchedule: 'По будням, 07:00 МСК',
    },
    slides: [
      { title: 'План и факт по командам', description: 'Сопоставление целей и результатов каждой команды за месяц.', example: [['Цель команды', '120 заявок'], ['Выполнено', '114 заявок']] },
      { title: 'Качество обслуживания', description: 'Оценки менеджеров по командам и периодам.', example: [['Оценка за сентябрь', '4,5 из 5'], ['Оценка за октябрь', '4,7 из 5']] },
    ],
    metricIds: ['indicator-csat', '4'],
    sources: [demoReportSource('demo.hr.team_targets', 'postgres', 12), demoReportSource('demo.hr.team_results', 'mssql', 26, 'TEST')],
    mailingNames: ['Результаты команд за неделю', 'Итоги по мотивации за месяц'], monthlyUsers: [73, 82, 76, 104, 111, 91],
  }],
  ['demo-report-debt', {
    overview: {
      description: 'Отчёт показывает остаток дебиторской задолженности, просроченные суммы и поступившие платежи по объектам.',
      businessQuestions: ['По каким объектам накопилась просрочка?', 'Как изменилась задолженность после поступления платежей?'],
      methodology: ['Остаток показывается на дату среза. Просроченной считается непогашенная сумма по обязательствам с истёкшим сроком оплаты.'],
      additional: '', context: 'Контроль задолженности и платежей', terms: ['Дебиторская задолженность', 'Просрочка', 'Дата оплаты'],
      questions: [{ title: 'Где смотреть предстоящие платежи?', answer: 'В примере они вынесены на слайд «Сроки погашения» и сгруппированы по сроку оплаты.' }],
      refreshSchedule: 'Ежедневно, 06:30 МСК',
    },
    slides: [
      { title: 'Структура задолженности', description: 'Остаток и просроченная сумма по объектам на дату среза.', example: [['Общий остаток', '2,4 млн ₽'], ['Просрочено', '480 тыс. ₽']] },
      { title: 'Сроки погашения', description: 'Просроченные и предстоящие обязательства по срокам оплаты.', example: [['Просрочка до 30 дней', '310 тыс. ₽'], ['К оплате в ближайшие 7 дней', '260 тыс. ₽']] },
    ],
    metricIds: ['indicator-revenue-2', 'indicator-revenue-1'],
    sources: [demoReportSource('demo.finance.receivables', 'mssql', 31), demoReportSource('demo.finance.payments', 'postgres', 19)],
    mailingNames: ['Дебиторская задолженность за неделю', 'Просрочка и предстоящие платежи'], monthlyUsers: [16, 19, 22, 24, 27, 31],
  }],
  ['demo-report-management', {
    overview: {
      description: 'Отчёт объединяет обращения жителей по объектам управляющей компании Москвы и Санкт-Петербурга.',
      businessQuestions: ['Какие категории обращений встречаются чаще?', 'В каких объектах больше повторных заявок?'],
      methodology: ['Обращения группируются по городу, объекту и категории. Повторные обращения показаны отдельно.'],
      additional: '', context: 'Работа управляющей компании', terms: ['Объект', 'Обращение', 'Категория заявки'],
      questions: [{ title: 'Можно ли сравнить города?', answer: 'На слайде «Обращения по объектам» для этого предусмотрена группировка по городу.' }],
      refreshSchedule: 'Ежедневно, 07:30 МСК',
    },
    slides: [
      { title: 'Обращения по объектам', description: 'Сравнение числа заявок по городу и объекту за месяц.', example: [['Москва', '138 обращений'], ['Санкт-Петербург', '94 обращения']] },
      { title: 'Повторные обращения', description: 'Категории заявок, по которым жители обращались повторно.', example: [['Эксплуатация', '12 обращений'], ['Начисления', '7 обращений']] },
    ],
    metricIds: ['indicator-request-quality', 'indicator-repeat-demo'],
    sources: [demoReportSource('demo.management.requests', 'postgres', 23, 'TEST'), demoReportSource('demo.management.properties', 'mssql', 14)],
    mailingNames: ['Сводка обращений по объектам', 'Повторные обращения за неделю'], monthlyUsers: [18, 21, 25, 29, 33, 30],
  }],
  ['demo-report-occupancy', {
    overview: {
      description: 'Отчёт помогает сравнить динамику заселения и коммерческие показатели объектов гостеприимства.',
      businessQuestions: ['В какие периоды меняется темп заселения?', 'Как различаются объекты по загрузке и среднему чеку?'],
      methodology: ['Заселения группируются по дате заезда и объекту. Коммерческие показатели рассматриваются за тот же период.'],
      additional: '', context: 'Планирование загрузки объектов', terms: ['Заселение', 'Дата заезда', 'Загрузка'],
      questions: [{ title: 'Какая дата используется для сравнения?', answer: 'Заселение относится к дате заезда. Дата оформления бронирования учитывается отдельно.' }],
      refreshSchedule: 'Ежедневно, 08:00 МСК',
    },
    slides: [
      { title: 'Динамика заселения', description: 'Заезды по неделям и объектам.', example: [['Предыдущая неделя', '183 заезда'], ['Текущая неделя', '216 заездов']] },
      { title: 'Загрузка по объектам', description: 'Загрузка и коммерческие показатели за один период.', example: [['Загрузка', '78%'], ['Средний чек', '6 400 ₽']] },
    ],
    metricIds: ['metric-average-check-demo', 'indicator-revenue-1'],
    sources: [demoReportSource('demo.hospitality.arrivals', 'mssql', 17), demoReportSource('demo.hospitality.bookings', 'postgres', 28, 'TEST')],
    mailingNames: ['Сводка заселения за неделю', 'Загрузка объектов на ближайший период'], monthlyUsers: [76, 88, 103, 96, 111, 124],
  }],
  ['demo-report-client-service', {
    overview: {
      description: 'Отчёт показывает обратную связь клиентов и помогает понять, где чаще возникают повторные обращения.',
      businessQuestions: ['Какие группы обращений получают низкие оценки?', 'Где увеличилась доля повторных обращений?'],
      methodology: ['Клиентские оценки и повторные обращения сравниваются по команде, каналу и периоду.'],
      additional: '', context: 'Контроль качества клиентского сервиса', terms: ['CSAT', 'Обратная связь', 'Повторное обращение'],
      questions: [{ title: 'За какой период сравниваются оценки?', answer: 'На первом слайде оценки разбиты по месяцам, второй слайд показывает повторные обращения за тот же период.' }],
      refreshSchedule: 'По будням, 08:30 МСК',
    },
    slides: [
      { title: 'Оценки клиентов', description: 'Оценки по месяцам, каналам и командам.', example: [['Чат', '4,6 из 5'], ['Телефон', '4,4 из 5']] },
      { title: 'Повторные обращения', description: 'Повторные обращения с группировкой по категории и каналу.', example: [['За сентябрь', '32 обращения'], ['За октябрь', '26 обращений']] },
    ],
    metricIds: ['indicator-csat', 'indicator-repeat-demo'],
    sources: [demoReportSource('demo.service.feedback', 'postgres', 11), demoReportSource('demo.service.requests', 'mssql', 22)],
    mailingNames: ['Оценки сервиса за неделю', 'Сводка повторных обращений'], monthlyUsers: [35, 42, 48, 44, 52, 58],
  }],
  ['demo-report-sales-funnel', {
    overview: {
      description: 'Отчёт показывает движение заявок по этапам продаж и помогает находить участки, где теряются сделки.',
      businessQuestions: ['На каком этапе снижается конверсия?', 'Как различается результат продаж по каналам?'],
      methodology: ['Для сравнения этапов берётся одна группа заявок. Сделки группируются по каналу и месяцу начала.'],
      additional: '', context: 'Управление воронкой продаж', terms: ['Лид', 'Этап сделки', 'Конверсия'],
      questions: [{ title: 'Как сравнивать конверсию каналов?', answer: 'Выбирайте одинаковый период и сопоставляйте переход между теми же этапами.' }],
      refreshSchedule: 'По будням, 07:00 МСК',
    },
    slides: [
      { title: 'Переходы между этапами', description: 'Заявки и квалифицированные лиды за один период.', example: [['Входящие заявки', '320'], ['Квалифицированные лиды', '186']] },
      { title: 'Конверсия по каналам', description: 'Доля заявок, которые завершились сделкой, по каналам.', example: [['Прямой канал', '18%'], ['Партнёрский канал', '24%']] },
    ],
    metricIds: ['indicator-conversion-demo', '4'],
    sources: [demoReportSource('demo.sales.leads', 'mssql', 29, 'TEST'), demoReportSource('demo.sales.deal_stages', 'postgres', 13)],
    mailingNames: ['Воронка продаж за неделю', 'Конверсия по каналам'], monthlyUsers: [51, 62, 68, 73, 86, 76],
  }],
  ['demo-report-construction', {
    overview: {
      description: 'Отчёт показывает ход строительных проектов, контрольные даты и отклонения по очередям.',
      businessQuestions: ['У каких проектов сдвинулись контрольные даты?', 'Какие очереди требуют внимания на ближайшем совещании?'],
      methodology: ['Плановые и фактические даты сопоставляются на одной контрольной точке. Очередь и этап показаны отдельно.'],
      additional: '', context: 'Мониторинг строительных проектов', terms: ['Проект', 'Очередь', 'Контрольная дата'],
      questions: [{ title: 'Где видны ближайшие вехи?', answer: 'На слайде «Контрольные даты» вехи сгруппированы по проектам и очередям.' }],
      refreshSchedule: 'По будням, 09:00 МСК',
    },
    slides: [
      { title: 'Статус проектов', description: 'Этапы строительства и отклонения по проектам.', example: [['По графику', '5 проектов'], ['С отклонениями', '2 проекта']] },
      { title: 'Контрольные даты', description: 'Плановые и фактические даты ключевых вех.', example: [['Плановое завершение этапа', '12.10.2026'], ['Фактическое завершение', '16.10.2026']] },
    ],
    metricIds: ['sales-volume-projects', 'sales-plan-phases'],
    sources: [demoReportSource('demo.construction.projects', 'postgres', 25), demoReportSource('demo.construction.milestones', 'mssql', 16, 'TEST')],
    mailingNames: ['Статус строительных проектов', 'Ближайшие контрольные даты'], monthlyUsers: [19, 23, 21, 28, 25, 31],
  }],
  ['demo-report-team-workload', {
    overview: {
      description: 'Отчёт помогает оценить нагрузку команд обслуживания и распределить открытые обращения.',
      businessQuestions: ['Где выросло число открытых обращений?', 'Как распределяется работа между командами?'],
      methodology: ['Открытые обращения показываются на дату среза. Новые и закрытые обращения сравниваются за один период.'],
      additional: '', context: 'Планирование загрузки команды', terms: ['Назначение', 'Открытое обращение', 'Нагрузка'],
      questions: [{ title: 'Как учитываются повторные обращения?', answer: 'Они входят в объём работы и доступны как отдельный связанный показатель.' }],
      refreshSchedule: 'По будням, 08:00 МСК',
    },
    slides: [
      { title: 'Загрузка по командам', description: 'Открытые и назначенные обращения на дату среза.', example: [['Открыто', '46 обращений'], ['Назначено исполнителям', '39 обращений']] },
      { title: 'Поступление и закрытие', description: 'Динамика новых и закрытых обращений за неделю.', example: [['Поступило', '118 обращений'], ['Закрыто', '105 обращений']] },
    ],
    metricIds: ['indicator-request-quality', 'indicator-repeat-demo'],
    sources: [demoReportSource('demo.workload.assignments', 'mssql', 20), demoReportSource('demo.workload.queue', 'postgres', 10)],
    mailingNames: ['Загрузка команд на неделю', 'Сводка открытых обращений'], monthlyUsers: [22, 26, 35, 31, 34, 38],
  }],
  ['demo-report-finance-plan', {
    overview: {
      description: 'Отчёт сопоставляет план поступлений с фактом оплат и показывает отклонения по месяцам.',
      businessQuestions: ['Какой объём поступлений отстаёт от плана?', 'Какие платежи повлияли на результат месяца?'],
      methodology: ['Факт относится к периоду получения оплаты. Отклонение читается относительно плана за тот же период.'],
      additional: '', context: 'Контроль плана поступлений', terms: ['План поступлений', 'Факт оплаты', 'Отклонение'],
      questions: [{ title: 'Где посмотреть накопленный результат?', answer: 'На слайде «Поступления накопительно» суммы сопоставляются с начала выбранного периода.' }],
      refreshSchedule: 'Ежедневно, 07:00 МСК',
    },
    slides: [
      { title: 'План и факт поступлений', description: 'Помесячное сравнение плановых и полученных сумм.', example: [['План за месяц', '12 млн ₽'], ['Получено за месяц', '11,4 млн ₽']] },
      { title: 'Поступления накопительно', description: 'Накопленный результат с начала периода.', example: [['Накопленный план', '54 млн ₽'], ['Накопленный факт', '52,8 млн ₽']] },
    ],
    metricIds: ['indicator-revenue-2', 'metric-ebitda'],
    sources: [demoReportSource('demo.finance.receipt_plan', 'postgres', 15, 'TEST'), demoReportSource('demo.finance.receipts', 'mssql', 27)],
    mailingNames: ['Выполнение плана поступлений', 'Отклонения по оплатам за неделю'], monthlyUsers: [129, 152, 142, 164, 182, 203],
  }],
  ['demo-report-sales-plan', {
    overview: {
      description: 'Отчёт сравнивает план и фактический объём продаж по проектам, очередям и этапам.',
      businessQuestions: ['Какие проекты выполнили план?', 'На каких этапах отклонение от плана наиболее заметно?'],
      methodology: ['План и факт сравниваются за один период. По проектам, очередям и этапам используются соответствующие связанные показатели.'],
      additional: '', context: 'Контроль выполнения плана продаж', terms: ['План продаж', 'Объём продаж', 'Проект'],
      questions: [{ title: 'Можно ли отдельно посмотреть продажи без наценки?', answer: 'Да, во вкладке «Метрики и показатели» есть отдельная метрика для этого варианта.' }],
      refreshSchedule: 'По будням, 06:00 МСК',
    },
    slides: [
      { title: 'План и факт по проектам', description: 'Плановые и фактические продажи по проектам.', example: [['План продаж', '94 сделки'], ['Факт продаж', '87 сделок']] },
      { title: 'Продажи по очередям и этапам', description: 'Отклонение от плана и фактические продажи по очередям.', example: [['Первая очередь', '48 сделок'], ['Вторая очередь', '39 сделок']] },
    ],
    metricIds: reportMetricIds,
    sources: [demoReportSource('demo.sales.sales_plan', 'mssql', 18), demoReportSource('demo.sales.sales_actual', 'postgres', 32, 'TEST')],
    mailingNames: ['План и факт продаж за неделю', 'Выполнение плана по проектам'], monthlyUsers: [67, 72, 80, 87, 104, 98],
  }],
]);
