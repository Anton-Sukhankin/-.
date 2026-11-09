import type { ReferenceOption, ReferenceRow, SystemReference, SystemReferencesGateway } from '../data/systemReferences';

const crm: SystemReference = {
  id: 'crm',
  title: 'Справочник CRM',
  label: 'CRM',
  system: { name: 'CRM (CRM Dynamics)', code: 'TZ-22328' },
};

function demoReference(id: string, title: string, systemName: string): SystemReference {
  return { id, title, label: title, system: { name: systemName } };
}

// Only the CRM entry represents the confirmed system and code. Other entries are local examples.
const references = [
  crm,
  demoReference('demo-finance', 'Справочник финансов', 'Управление финансами'),
  demoReference('demo-hr', 'Справочник кадров', 'Кадровая система'),
  demoReference('demo-documents', 'Справочник документов', 'Электронный документооборот'),
  demoReference('demo-contracts', 'Справочник договоров', 'Корпоративная система управления инвестиционными программами, долгосрочными договорами и обязательствами подрядчиков'),
  demoReference('demo-procurement', 'Справочник закупок', 'Управление закупками'),
  demoReference('demo-projects', 'Справочник проектов', 'Управление проектами'),
  demoReference('demo-warehouse', 'Складской справочник', 'Складская система'),
  demoReference('demo-service-desk', 'Справочник обращений', 'Service Desk'),
  demoReference('demo-properties', 'Справочник объектов', 'Управление недвижимостью'),
  demoReference('demo-services', 'Справочник услуг', 'Каталог услуг'),
  demoReference('demo-equipment', 'Справочник оборудования', 'Учёт оборудования'),
  demoReference('demo-suppliers', 'Справочник поставщиков', 'Управление поставщиками'),
  demoReference('demo-requests', 'Справочник заявок', 'Управление заявками'),
  demoReference('demo-units', 'Справочник подразделений', 'Организационная структура'),
] as const;

const account = { name: 'Организация', logicalName: 'Account' };
const contact = { name: 'Контакт', logicalName: 'Contact' };
const options = (...entries: [code: string, label: string][]): ReferenceOption[] =>
  entries.map(([code, label]) => ({ code, label }));

function row(
  entity: ReferenceRow['entity'], name: string, logicalName: string,
  values: Partial<Pick<ReferenceRow, 'options' | 'relationships' | 'isPrimaryKey'>> = {},
): ReferenceRow {
  return {
    id: `${entity.logicalName}.${logicalName}`,
    entity,
    attribute: { name, logicalName },
    relationships: [],
    options: [],
    ...values,
  };
}

const crmRows: readonly ReferenceRow[] = [
  // The first category and its option set are visible in the source recording.
  row(account, 'Категория', 'accountcategorycode', { options: options(
    ['1', 'Продавец'], ['2', 'Стандартный'], ['3', 'Банк'], ['4', 'Агент'],
    ['5', 'Регистратор'], ['6', 'СК'], ['100000000', 'Лидген'], ['100000001', 'ЗПИФ застройщик'],
  ) }),
  row(account, 'Классификация', 'accountclassificationcode', { options: options(['1', 'Значение по умолчанию']) }),
  row(account, 'Статус', 'statecode', { options: options(['0', 'Активная'], ['1', 'Неактивная']) }),
  row(account, 'Состояние', 'statuscode', { options: options(['1', 'Действующая']) }),
  // Additional values and relationships are fixtures for testing the UI.
  row(account, 'Способ связи', 'preferredcontactmethodcode', { options: options(
    ['1', 'Любой'], ['2', 'Электронная почта'], ['3', 'Телефон'], ['4', 'Факс'], ['5', 'Почта'],
  ) }),
  row(account, 'Отрасль', 'industrycode', { options: options(
    ['1', 'Бухгалтерские услуги'], ['2', 'Строительство'], ['3', 'Финансы'],
    ['4', 'Розничная торговля'], ['5', 'Образование'], ['6', 'Транспорт'],
  ) }),
  row(account, 'Идентификатор организации', 'accountid', { isPrimaryKey: true }),
  row(account, 'Название', 'name', { isPrimaryKey: false }),
  row(account, 'Основной контакт', 'primarycontactid', { relationships: ['Контакт · contactid'], isPrimaryKey: false }),
  row(account, 'Родительская организация', 'parentaccountid', { relationships: ['Организация · accountid'] }),
  row(account, 'Номер организации', 'accountnumber'),
  row(account, 'Дата создания', 'createdon'),
  row(contact, 'Идентификатор контакта', 'contactid', { isPrimaryKey: true }),
  row(contact, 'Имя', 'firstname', { isPrimaryKey: false }),
  row(contact, 'Фамилия', 'lastname', { isPrimaryKey: false }),
  row(contact, 'Организация', 'parentcustomerid', { relationships: ['Организация · accountid'] }),
  row(contact, 'Способ связи', 'preferredcontactmethodcode', { options: options(
    ['1', 'Любой'], ['2', 'Электронная почта'], ['3', 'Телефон'],
  ) }),
  row(contact, 'Электронная почта', 'emailaddress1'),
];

export const demoSystemReferencesGateway: SystemReferencesGateway = {
  list: () => references,
  rows: referenceId => referenceId === crm.id ? crmRows : [],
};
