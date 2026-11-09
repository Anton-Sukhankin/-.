import type { MetricDetailProfile, MetricDetailSection, MetricSummary } from '../data/metrics';
import { metricDetailSections } from '../features/metrics/detail/source';

type Example = {
  definition: string; formula: string; question: string; source: string; fields: string;
  rule: string; process: string; owner: string; created: string; unit?: string;
};

/** Authored demonstration examples, not approved business definitions or a live API. */
const examples: Readonly<Record<string, Example>> = {
  'metric-ebitda': {
    definition: 'EBITDA показывает финансовый результат до расходов по процентам, налога на прибыль и амортизации. Значения сопоставляются по одному периоду и периметру консолидации. В примере исключены внутригрупповые обороты; разовые корректировки рассматриваются отдельно.',
    formula: 'EBITDA = Операционная прибыль + Амортизация', question: 'Как изменилась операционная прибыльность без влияния амортизации?',
    source: 'finance_demo.monthly_results', fields: 'operating_profit, depreciation, period', rule: 'Суммировать операционную прибыль и начисленную амортизацию за закрытый месяц; не включать проценты и налог.',
    process: 'Управленческое финансовое планирование', owner: 'Финансовая аналитика', created: '02.06.2026',
  },
  'indicator-request-quality': {
    definition: 'Доля обращений с корректно выбранной категорией в проверенной аудитором выборке. В знаменатель входят только завершённые проверки, повторная проверка одной заявки не увеличивает объём выборки. При отсутствии проверок значение не рассчитывается.',
    formula: 'Качество = Корректно классифицированные обращения / Проверенные обращения × 100%', question: 'Какие категории чаще требуют исправления классификации?',
    source: 'service_demo.request_audit', fields: 'request_id, classification_correct, audited_at', rule: 'Использовать последнюю завершённую оценку каждой заявки; деление на ноль возвращает отсутствие значения.',
    process: 'Контроль качества обработки обращений', owner: 'Аналитика корпоративных сервисов', created: '01.09.2026',
  },
  'indicator-revenue-1': {
    definition: 'Выручка по переданным покупателям объектам за отчётный месяц. Признание в этом примере привязано к дате передачи; авансовые платежи до передачи не входят в показатель. Это отдельная сущность от одноимённой выручки по оплатам.',
    formula: 'Выручка по передаче = SUM(Признанная стоимость) − SUM(Возвраты)', question: 'Какова выручка по переданным объектам в каждом проекте?',
    source: 'sales_demo.recognized_revenue', fields: 'transfer_date, recognized_amount, returned_amount', rule: 'Группировать по месяцу передачи; возвраты признавать в периоде корректировки.',
    process: 'Признание выручки по передаче', owner: 'Команда учёта продаж', created: '15.07.2026', unit: 'Рубли',
  },
  'indicator-revenue-2': {
    definition: 'Выручка по фактически полученным оплатам за отчётный период. Учитываются поступления за объекты за вычетом возвратов покупателям; внутренние перемещения денежных средств исключаются. Дата оплаты и состав данных отличаются от выручки по передаче.',
    formula: 'Выручка по оплатам = SUM(Поступления покупателей) − SUM(Возвраты покупателям)', question: 'Какой объём денежных поступлений получен за период?',
    source: 'sales_demo.customer_payments', fields: 'payment_date, received_amount, refund_amount', rule: 'Учитывать проведённые платежи по дате поступления; сторно исключать.',
    process: 'Учёт денежных поступлений', owner: 'Казначейская аналитика', created: '21.07.2026', unit: 'Рубли',
  },
  'indicator-csat': {
    definition: 'Доля клиентов, поставивших менеджеру оценку 4 или 5 после передачи квартиры. Для одного события передачи учитывается один последний ответ; неотвеченные анкеты не входят в знаменатель. Результат рассматривается вместе с числом полученных ответов.',
    formula: 'CSAT = Ответы с оценкой 4–5 / Все валидные ответы × 100%', question: 'Насколько клиенты удовлетворены работой менеджера при передаче?',
    source: 'hospitality_demo.handover_surveys', fields: 'handover_id, manager_rating, answered_at', rule: 'Отбирать оценки от 1 до 5; выводить отсутствие значения при нулевом числе ответов.',
    process: 'Оценка клиентского опыта при заселении', owner: 'Команда клиентского опыта', created: '05.06.2026', unit: '%',
  },
  'indicator-conversion-demo': {
    definition: 'Доля квалифицированных обращений, завершившихся сделкой в пределах выбранной когорты. Каждое обращение учитывается один раз, отменённые сделки исключаются. Когорту фиксируют по месяцу квалификации.',
    formula: 'Конверсия = Обращения со сделкой / Квалифицированные обращения × 100%', question: 'Какая доля квалифицированных обращений становится продажей?',
    source: 'sales_demo.lead_conversion', fields: 'lead_id, qualified_at, completed_sale', rule: 'Считать уникальные обращения одной когорты и одинаковое окно наблюдения.',
    process: 'Управление воронкой продаж', owner: 'Команда аналитики воронки', created: '02.10.2026',
  },
  'metric-average-check-demo': {
    definition: 'Средняя стоимость одной завершённой продажи после скидок. Отменённые договоры и возвраты полной стоимости исключаются. Показатель не взвешивается по площади объекта.',
    formula: 'Средний чек = SUM(Стоимость завершённых продаж) / COUNT(DISTINCT Договор)', question: 'Как меняется средняя стоимость завершённой сделки?',
    source: 'sales_demo.completed_contracts', fields: 'contract_id, net_contract_amount, completed_at', rule: 'Делить сумму стоимости после скидок на число уникальных завершённых договоров.',
    process: 'Анализ стоимости сделок', owner: 'Команда коммерческой аналитики', created: '08.10.2026',
  },
  'indicator-repeat-demo': {
    definition: 'Доля первичных обращений, по которым клиент повторно обратился с той же темой в течение 7 дней после закрытия. Переоткрытие и новый контакт объединяются по исходному обращению, чтобы не дублировать результат.',
    formula: 'Повторные обращения = Первичные обращения с повтором / Закрытые первичные обращения × 100%', question: 'Какие темы чаще приводят к повторному обращению?',
    source: 'hospitality_demo.repeat_contacts', fields: 'initial_request_id, closed_at, repeated_within_7d', rule: 'Учитывать только обращения с полным семидневным окном наблюдения.',
    process: 'Контроль качества решения обращений', owner: 'Команда качества сервиса', created: '12.10.2026',
  },
  'sales-volume-plan': {
    definition: 'Утверждённый план продаваемой площади на выбранный месяц. Используется последняя утверждённая версия плана до начала периода; черновые версии и дубли по проекту исключаются.',
    formula: 'План объёма = SUM(Утверждённая плановая площадь)', question: 'Какой объём продаж запланирован на месяц?', source: 'sales_demo.approved_area_plan', fields: 'project_id, plan_month, approved_area',
    rule: 'Суммировать утверждённые строки одной версии плана.', process: 'Планирование продаж', owner: 'Команда планирования продаж', created: '01.07.2026',
  },
  'sales-volume-base': {
    definition: 'Площадь проданных объектов по договорам без дополнительной наценки. В примере отбираются действующие предметы договора с нулевой суммой наценки; расторжения уменьшают объём в периоде расторжения.',
    formula: 'Объём без наценки = SUM(Площадь WHERE Наценка = 0)', question: 'Сколько площади продано без дополнительной наценки?', source: 'sales_demo.contract_surcharges', fields: 'contract_id, area_m2, surcharge_amount',
    rule: 'Фильтровать нулевую наценку, затем суммировать площадь действующих продаж.', process: 'Анализ ценовых условий', owner: 'Команда ценовой аналитики', created: '04.07.2026',
  },
  'sales-volume-no-certificates': {
    definition: 'Площадь продаж без участия жилищных сертификатов. Признак сертификата определяется на уровне договора; договоры с любой долей оплаты сертификатом исключаются целиком.',
    formula: 'Объём без сертификатов = SUM(Площадь WHERE Сертификат = false)', question: 'Каков объём продаж без использования сертификатов?', source: 'sales_demo.contract_certificates', fields: 'contract_id, area_m2, has_certificate',
    rule: 'Исключить договоры с подтверждённым сертификатом до агрегации площади.', process: 'Анализ программ оплаты', owner: 'Команда программ продаж', created: '07.07.2026',
  },
  'sales-volume-projects': {
    definition: 'Фактическая проданная площадь в разрезе проектов. Каждый объект принадлежит одному проекту на дату продажи; суммы проектов дают итог по выбранному периметру.',
    formula: 'Объём по проекту = SUM(Площадь) GROUP BY Проект', question: 'Какие проекты формируют основной объём продаж?', source: 'sales_demo.project_area_sales', fields: 'project_id, sale_date, net_area_m2',
    rule: 'Сопоставить объект с проектом по справочнику на дату продажи.', process: 'Управление портфелем проектов', owner: 'Команда аналитики проектов', created: '10.07.2026',
  },
  'sales-plan-projects': {
    definition: 'Плановая продаваемая площадь по проектам за выбранный период. Строки берутся из утверждённого плана проекта и не распределяются повторно на уровне общего итога.',
    formula: 'План по проекту = SUM(Плановая площадь) GROUP BY Проект', question: 'Как распределён план продаж между проектами?', source: 'sales_demo.project_area_plan', fields: 'project_id, plan_month, planned_area_m2',
    rule: 'Использовать утверждённую версию плана каждого проекта одного месяца.', process: 'Бюджетирование проектов', owner: 'Команда бюджетирования проектов', created: '13.07.2026',
  },
  'sales-volume-phases': {
    definition: 'Площадь продаж в разрезе очередей строительства. Объект относится к одной очереди по справочнику корпусов; нераспределённые объекты выделяются в отдельную группу.',
    formula: 'Объём по очереди = SUM(Площадь) GROUP BY Очередь', question: 'Какие очереди обеспечивают фактические продажи?', source: 'sales_demo.phase_area_sales', fields: 'phase_id, building_id, sold_area_m2',
    rule: 'Связать корпус с очередью, сохранив объекты без заполненной очереди.', process: 'Мониторинг продаж очередей', owner: 'Команда аналитики строительства', created: '16.07.2026',
  },
  'sales-plan-phases': {
    definition: 'Плановая площадь продаж по очередям строительства. Общий план проекта распределён на очереди единой утверждённой версией; сумма очередей сверяется с планом проекта.',
    formula: 'План по очереди = SUM(Распределённая плановая площадь) GROUP BY Очередь', question: 'Соответствует ли план очередей плану проекта?', source: 'sales_demo.phase_area_plan', fields: 'phase_id, plan_month, allocated_area_m2',
    rule: 'Проверять равенство суммы очередей плану проекта до публикации версии.', process: 'Распределение плана по очередям', owner: 'Команда планирования очередей', created: '19.07.2026',
  },
  'sales-volume-stages': {
    definition: 'Проданная площадь по этапам реализации проекта на дату сделки. Изменение текущего этапа не переносит прошлые продажи между группами.',
    formula: 'Объём по этапу = SUM(Площадь) GROUP BY Этап на дату продажи', question: 'На каких этапах реализации формируются продажи?', source: 'sales_demo.stage_area_sales', fields: 'stage_at_sale, sale_date, area_m2',
    rule: 'Использовать исторический этап на дату сделки, а не текущий статус проекта.', process: 'Анализ этапов реализации', owner: 'Команда проектного мониторинга', created: '22.07.2026',
  },
  'sales-volume-cumulative': {
    definition: 'Нарастающий итог проданной площади с начала выбранного периода. Каждый день включает фактические продажи предыдущих дней и корректировки; начало периода сбрасывает накопление.',
    formula: 'Накопленный объём(t) = SUM(Дневная чистая площадь от начала периода до t)', question: 'Как накапливается объём продаж относительно начала периода?', source: 'sales_demo.daily_net_area', fields: 'sale_day, net_area_m2, period_start',
    rule: 'Применять накопительную сумму в пределах одного периода и периметра.', process: 'Мониторинг накопленных продаж', owner: 'Команда оперативной аналитики', created: '25.07.2026',
  },
};

function sourcedProfile(): MetricDetailProfile {
  const sections: MetricDetailSection[] = metricDetailSections.map((section, index) => {
    const texts: readonly string[] = section.texts;
    let body: MetricDetailSection['body'];
    if (index === 1) body = { kind: 'method', columns: [texts[0], texts[1]], rows: [2, 4, 6, 8, 10].map(i => [texts[i], texts[i + 1]]) };
    else if (index === 11) body = { kind: 'question' };
    else if ([0, 2, 3].includes(index)) body = { kind: 'prose', text: texts[0] };
    else body = { kind: 'relations', detachable: index === 4, emptyText: 'Связи не заданы',
      items: (index === 4 ? [texts[1], texts[3]] : texts.slice(1)).map((text, i) => ({ text, ...(index === 6 && i === 0 ? { reportId: 'demo-report-sales-plan' } : {}) })) };
    return { id: section.node, title: section.title, description: section.description, body };
  });
  return { metricId: '4', displayId: '4', provenance: { kind: 'figma', reference: '1167:28009' }, unitLabel: 'квадратный метр', created: '08.07.2026', updated: '11.08.2026', sections,
    people: [
      { name: 'Лапова Юлия Владимировна', role: 'Проверил', description: '11.08.2026 · Бизнес-аналитик' },
      { name: 'Горбунь Анастасия Юрьевна', role: 'Бизнес-владелец', description: 'Управляющий директор · contact-1@example.invalid' },
      { name: 'Лапова Юлия Владимировна', role: 'Аналитик', description: 'Бизнес-аналитик · contact-2@example.invalid', placeholder: true },
    ] };
}

function demoProfile(metric: MetricSummary, example: Example): MetricDetailProfile {
  const bodies: MetricDetailSection['body'][] = [
    { kind: 'prose', text: example.definition },
    { kind: 'method', columns: ['Параметр', 'Правило'], rows: [['Расчёт', example.rule], ['Период и детализация', `Расчёт для «${metric.title}» за выбранный период; домен «${metric.domain}».`], ['Единица', example.unit ?? metric.unit]] },
    { kind: 'prose', text: example.formula },
    { kind: 'prose', text: example.question },
    { kind: 'relations', items: [{ text: `${metric.title} · расчётная мера\nЕдиница: ${example.unit ?? metric.unit}` }], emptyText: 'Технические меры не заданы', detachable: true },
    { kind: 'relations', items: [{ text: `${example.source}\nПоля: ${example.fields}` }], emptyText: 'Источники не заданы' },
    { kind: 'relations', items: metric.id.startsWith('sales-') ? [{ text: 'План-Факт продажи\nПродажи и маркетинг', reportId: 'demo-report-sales-plan' }] : [], emptyText: 'Связанные отчёты не заданы' },
    { kind: 'relations', items: [], emptyText: 'MCP-инструменты не привязаны' },
    { kind: 'relations', items: [], emptyText: 'ИИ-помощники не привязаны' },
    { kind: 'relations', items: metric.id.startsWith('sales-') || metric.id === 'metric-average-check-demo' || metric.id === 'indicator-conversion-demo' ? [{ text: 'Объём продаж · связан с', metricId: '4' }] : [], emptyText: 'Связанные метрики не заданы' },
    { kind: 'relations', items: [{ text: example.process }], emptyText: 'Бизнес-процессы не заданы' },
    { kind: 'question' },
  ];
  return { metricId: metric.id, provenance: { kind: 'demo', reference: 'user-approved-examples-2026-11-04' }, unitLabel: example.unit ?? metric.unit,
    created: example.created, updated: metric.updated === '—' ? example.created : metric.updated,
    people: [
      { name: example.owner, role: 'Бизнес-владелец', description: `Направление: ${metric.domain}`, placeholder: true },
      { name: `Аналитик · ${metric.title}`, role: 'Аналитик', description: 'Контакт не указан', placeholder: true },
    ],
    sections: metricDetailSections.map((section, index) => ({ id: section.node, title: section.title, description: section.description, body: bodies[index] })),
  };
}

/** A replacement gateway can provide authoritative profiles without changing the renderer. */
export function createDemoMetricProfiles(items: readonly MetricSummary[]): ReadonlyMap<string, MetricDetailProfile> {
  return new Map(items.map(metric => {
    if (metric.id === '4') return [metric.id, sourcedProfile()];
    const example = examples[metric.id];
    if (!example) throw new Error(`Missing demo metric profile: ${metric.id}`);
    return [metric.id, demoProfile(metric, example)];
  }));
}
