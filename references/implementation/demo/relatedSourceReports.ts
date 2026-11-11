import type { SourceDetailData } from '../data/sourceDetails';
import type { ReportSummary } from '../data/reports';

export const reportCrmDateSourceId = 'source-reportcrm-date';

// Partial list from SRC-29/30 in the order and with the short descriptions accepted in Paper.
export const reportCrmDateReports: NonNullable<SourceDetailData['relatedReports']> = [
  {
    id:'agent-rewards', title:'00. Агентское вознаграждение в реестре продаж',
    description:'Проверка и расчёт выплат агентам за отчётный период. Отдельно показаны активные и неактивные вознаграждения по данным CRM.',
  },
  {
    id:'pricing-committee-v3', title:'00. Отчет ЦК v3',
    description:'Подготовка к заседанию Ценового комитета. Контроль плановых показателей и расчёт приведённых цен с учётом отделки.',
  },
  {
    id:'pricing-committee-mm-v3', title:'00. Отчет ЦК v3 для ММ и кладовых (Тест)',
    description:'Контроль плана для Ценового комитета, анализ структуры вымываемости и прогноз плановых показателей на следующий месяц.',
  },
  {
    id:'pricing-committee-mm-v8', title:'00. Отчет ЦК v8 для ММ и кладовых (Тест)',
    description:'Подготовка к Ценовому комитету. Автоматический сбор данных, контроль плановых показателей и прогноз на следующий месяц.',
  },
  {
    id:'agency-availability', title:'00. ПР-01-Шахматка- для Агентств',
    descriptionUnavailable:'Описание целиком не видно в источнике.',
  },
];

export function readRelatedSourceReport(id: string) {
  return reportCrmDateReports.find(report => report.id === id);
}

export function readRelatedSourceReportSummary(id: string): ReportSummary | undefined {
  const report = readRelatedSourceReport(id);
  return report && { id: report.id, title: report.title, type: 'report', domain: 'Домен не указан' };
}

