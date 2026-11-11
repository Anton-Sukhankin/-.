import type { DictionaryCatalog, DictionaryGateway, DictionaryTerm } from '../data/dictionary';

function exampleTerm(id: string, name: string, description: string): DictionaryTerm {
  return { id, name, description, type: 'Бизнес-термин', status: 'Демонстрационный', descriptionComplete: true };
}

const bcrDescription = 'Внутренний термин ГК «Самолет», обозначающий отклик или обратную связь клиента на продукт, услугу или этап взаимодействия с компанией.';

/** SRC-11 (03:15/03:20/03:25), BCR details from SRC-13/14, and labeled catalog examples. */
const dictionary: DictionaryCatalog = {
  terms: [
    { id: 'term-bcr', name: 'Business Client Response (BCR)', type: 'Бизнес-термин', status: 'Утверждён',
      description: bcrDescription, descriptionComplete: true, details: {
        fullDescription: `${bcrDescription}\n\nВ рамках процессов девелопмента и продаж недвижимости BCR используется для сбора и анализа данных о восприятии клиентом предлагаемых решений (например, планировочных решений, условий сделки, качества обслуживания). Методология сбора BCR часто включает проведение целевых опросов (в том числе после личных встреч с клиентами) для оценки удовлетворенности, выявления потребностей и уточнения портрета целевой аудитории. Результаты BCR применяются для корректировки маркетинговых стратегий, улучшения клиентского опыта и оптимизации продуктовой линейки девелопера.`,
        responsible: null, synonyms: ['BCR'], relations: [], created: '03.09.2026, 00:31:32', updated: '03.09.2026, 00:31:32', changeAuthor: 'import:glossary-terms',
        demoPeople: {
          owner: { name: 'Зорин Андрей Павлович', position: 'Руководитель клиентского сервиса', avatar: '/images/ai-hub/owner.jpg' },
          responsible: { name: 'Миронова Дарья Алексеевна', position: 'Бизнес-аналитик' },
        },
      } },
    { id: 'term-cf', name: 'Cash Flow (Денежный поток) (CF)', type: 'Бизнес-термин', status: 'Утверждён',
      description: 'Финансовый показатель, отражающий движение денежных средств (поступления и выплаты) компании или конкретного инвестиционного проекта за определённый период времени.', descriptionComplete: true },
    { id: 'term-hr', name: 'Human Resources (HR)', type: 'Бизнес-термин', status: 'Утверждён',
      description: 'Направление управления персоналом, отвечающее за полный цикл взаимодействия с сотрудниками компании: от привлечения и адаптации до развития, мотивации и увольнения.', descriptionComplete: true },
    { id: 'term-ssa', name: 'Self Service Analytics (SSA)', type: 'Бизнес-термин', status: 'Утверждён',
      description: 'Подход к аналитике, при котором бизнес-пользователи (менеджеры, руководители) самостоятельно создают отчёты и дашборды…', descriptionComplete: false },
    exampleTerm('term-conversion', 'Конверсия', 'Доля пользователей, совершивших целевое действие, среди пользователей, которым было доступно это действие.'),
    exampleTerm('term-customer-segment', 'Клиентский сегмент', 'Группа клиентов с общими признаками или потребностями, выделенная для анализа и планирования.'),
    exampleTerm('term-sales-funnel', 'Воронка продаж', 'Последовательность этапов, через которые потенциальный клиент проходит от первого контакта до покупки.'),
    exampleTerm('term-average-order-value', 'Средний чек', 'Средняя сумма покупки за выбранный период. Рассчитывается делением выручки по покупкам на их количество.'),
    exampleTerm('term-repeat-purchase', 'Повторная покупка', 'Покупка, которую совершает клиент, уже покупавший товар или услугу у компании.'),
    exampleTerm('term-data-quality', 'Качество данных', 'Степень пригодности данных для заданной задачи с учётом точности, полноты, согласованности и актуальности.'),
    exampleTerm('term-data-dictionary', 'Словарь данных', 'Описание полей и структур набора данных, включая их значения, типы и допустимые форматы.'),
    exampleTerm('term-sla', 'Соглашение об уровне сервиса (SLA)', 'Договорённость о показателях работы услуги, например о доступности, времени реакции и сроках устранения сбоев.'),
  ],
  domains: [
    { id: 'domain-10d-ssa', name: '10D SSA' },
    { id: 'domain-ai-agents', name: 'AI-агенты' },
    { id: 'domain-bim', name: 'BIM - моделирование' },
    { id: 'domain-bi-sup', name: 'BI-sup' },
    { id: 'domain-data-governance', name: 'Data Governance' },
    { id: 'domain-data-team', name: 'DATA Team' },
    { id: 'domain-dev-bi', name: 'DEV_BI' },
    { id: 'domain-esg', name: 'ESG' },
  ],
  // SRC-38 shows only these collapsed groups. Totals describe the original catalog.
  businessProcesses: {
    reportedProcessCount: 47,
    reportedGroupCount: 13,
    groups: [
      { id: 'partner-sales', name: 'Агентские и партнерские продажи', processCount: 5 },
      { id: 'market-analysis', name: 'Анализ рынка и клиентских потребностей', processCount: 3 },
      { id: 'mortgage-sales', name: 'Ипотечные продажи', processCount: 3 },
      { id: 'quality-and-trends', name: 'Обеспечение качества и анализ трендов', processCount: 1 },
      { id: 'deal-support', name: 'Оформление и сопровождение сделок', processCount: 3 },
      { id: 'additional-services', name: 'Продажа дополнительных опций и услуг', processCount: 1 },
      { id: 'trade-in', name: 'Продажи по программам трейд-ин', processCount: 1 },
      { id: 'market-sales', name: 'Рыночные продажи', processCount: 11 },
      { id: 'sales-management', name: 'Управление воронкой продаж и эффективностью сотрудников', processCount: 4 },
    ],
  },
  provenance: { kind: 'demo', reference: 'SRC-11 03:15/03:20/03:25; SRC-13/14; Paper 3P0-0, 3VM-0, 42R-0 (2026-11-04); SRC-38' },
};

export const demoDictionaryGateway: DictionaryGateway = { read: () => dictionary };
