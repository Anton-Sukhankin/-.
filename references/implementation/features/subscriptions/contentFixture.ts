import type { SubscriptionListItem } from './SubscriptionsContent';

// Exact ten objects shared by cards471:1644 and table814:16158.
// Local IDs only. External report routing and action results belong to the caller.
export const subscriptionContentFixture: readonly SubscriptionListItem[] = [
  {
    "id": "subscription-receivables",
    "title": "Дебиторская задолженность",
    "typeLabel": "Отчёты",
    "statusLabel": "Включена",
    "report": {
      "id": "demo-report-debt",
      "title": "Отчёт по дебиторской задолженности"
    },
    "nextDeliveryText": "10.10.2026, 10:00:00",
    "channelLabel": "Контур.Толк",
    "botActionLabel": "Напишите боту",
    "domain": "Гостеприимство"
  },
  {
    "id": "subscription-occupancy",
    "title": "Заселение объектов",
    "typeLabel": "Отчёты",
    "statusLabel": "Включена",
    "report": {
      "id": "demo-report-occupancy",
      "title": "Динамика заселения"
    },
    "nextDeliveryText": "11.10.2026, 09:00:00",
    "channelLabel": "Контур.Толк",
    "botActionLabel": "Напишите боту",
    "domain": "Гостеприимство"
  },
  {
    "id": "subscription-quarter-summary",
    "title": "Сводка за квартал",
    "typeLabel": "Отчёты",
    "statusLabel": "Включена",
    "report": {
      "id": "demo-report-summary",
      "title": "Сводный отчёт Гостеприимства"
    },
    "nextDeliveryText": "16.10.2026, 10:00:00",
    "channelLabel": "Контур.Толк",
    "botActionLabel": "Напишите боту",
    "domain": "Гостеприимство"
  },
  {
    "id": "subscription-client-service",
    "title": "Клиентский сервис",
    "typeLabel": "Отчёты",
    "statusLabel": "Включена",
    "report": {
      "id": "demo-report-client-service",
      "title": "Качество клиентского сервиса"
    },
    "nextDeliveryText": "12.10.2026, 10:00:00",
    "channelLabel": "Контур.Толк",
    "botActionLabel": "Напишите боту",
    "domain": "Клиентский сервис"
  },
  {
    "id": "subscription-sales-funnel",
    "title": "Воронка продаж",
    "typeLabel": "Отчёты",
    "statusLabel": "Включена",
    "report": {
      "id": "demo-report-sales-funnel",
      "title": "Воронка продаж"
    },
    "nextDeliveryText": "13.10.2026, 09:00:00",
    "channelLabel": "Контур.Толк",
    "botActionLabel": "Напишите боту",
    "domain": "Продажи и маркетинг"
  },
  {
    "id": "subscription-monthly-receipts",
    "title": "Поступления за месяц",
    "typeLabel": "Отчёты",
    "statusLabel": "Включена",
    "report": {
      "id": "demo-report-finance-plan",
      "title": "Выполнение плана поступлений"
    },
    "nextDeliveryText": "09.10.2026, 09:00:00",
    "channelLabel": "Контур.Толк",
    "botActionLabel": "Напишите боту",
    "domain": "Финансы"
  },
  {
    "id": "subscription-receipts-plan",
    "title": "План поступлений",
    "typeLabel": "Отчёты",
    "statusLabel": "Включена",
    "report": {
      "id": "demo-report-finance-plan",
      "title": "Выполнение плана поступлений"
    },
    "nextDeliveryText": "15.10.2026, 09:00:00",
    "channelLabel": "Контур.Толк",
    "botActionLabel": "Напишите боту",
    "domain": "Финансы"
  },
  {
    "id": "subscription-sales-today",
    "title": "Мои продажи сегодня",
    "typeLabel": "Отчёты",
    "statusLabel": "Включена",
    "report": {
      "id": "demo-report-mop-profile",
      "title": "Профайл МОП"
    },
    "nextDeliveryText": "06.10.2026, 09:00:00",
    "channelLabel": "Контур.Толк",
    "botActionLabel": "Напишите боту",
    "domain": "Домен не указан"
  },
  {
    "id": "subscription-sales-week",
    "title": "Продажи за неделю",
    "typeLabel": "Отчёты",
    "statusLabel": "Включена",
    "report": {
      "id": "demo-report-mop-profile",
      "title": "Профайл МОП"
    },
    "nextDeliveryText": "08.10.2026, 10:00:00",
    "channelLabel": "Контур.Толк",
    "botActionLabel": "Напишите боту",
    "domain": "Домен не указан"
  },
  {
    "id": "subscription-sales-projects",
    "title": "Продажи по проектам",
    "typeLabel": "Отчёты",
    "statusLabel": "Включена",
    "report": {
      "id": "demo-report-mop-profile",
      "title": "Профайл МОП"
    },
    "nextDeliveryText": "14.10.2026, 10:00:00",
    "channelLabel": "Контур.Толк",
    "botActionLabel": "Напишите боту",
    "domain": "Домен не указан"
  }
];
