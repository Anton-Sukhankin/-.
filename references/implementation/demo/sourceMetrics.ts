import type { MetricDetailIdentity, MetricDetailProfile } from '../data/metrics';

// SRC-31 and SRC-34 provide the total and the first six entries, but no business IDs or full passports.
export const reportCrmDateMetricCount = 16;
export const reportCrmDateMetrics: readonly MetricDetailIdentity[] = [
  {
    id: 'dimdate-additional-income-plan',
    title: 'Выполнение плана дополнительных доходов, %',
    description: 'Накопленный с начала года дополнительный доход относительно годовой цели',
  },
  {
    id: 'dimdate-online-sales-area-share',
    title: 'Доля онлайн-продаж по площади, %',
    description: 'Доля площади онлайн-продаж в общей площади продаж за период',
  },
  {
    id: 'dimdate-online-deals-share',
    title: 'Доля онлайн сделок, %',
    description: 'Показывает долю онлайн-сделок от общего количества фактических сделок',
  },
  {
    id: 'dimdate-online-deals-count',
    title: 'Кол-во онлайн сделок, шт',
    description: 'Показывает количество онлайн-сделок за выбранный период',
  },
  {
    id: 'dimdate-registration-task-count',
    title: 'Количество задач оформления и регистрации',
    description: 'Объем задач по оформлению документов, передаче на регистрацию и подготовке полного пакета',
  },
  {
    id: 'dimdate-paid-reservation-converted',
    title: 'Платный резерв, перешедший в продажу',
    description: 'Объем платного резерва, перешедшего в продажу',
  },
];

export const sourceMetricProfiles: ReadonlyMap<string, MetricDetailProfile> = new Map(reportCrmDateMetrics.map(identity => [
  identity.id,
  {
    metricId: identity.id,
    identity,
    provenance: { kind: 'demo', reference: 'SRC-31, SRC-34' },
    unitLabel: '—',
    created: '—',
    updated: '—',
    people: [],
    sections: [{
      id: 'description',
      title: 'Описание',
      description: 'Краткое описание из списка метрик источника',
      body: { kind: 'prose', text: identity.description },
    }],
  },
]));
