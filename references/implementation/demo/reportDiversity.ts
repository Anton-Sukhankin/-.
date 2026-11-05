// User-approved demo enrichment, 4 November 2026. These names are fictional,
// not an inventory of deployed systems or a change to the source Figma fixtures.
export const demoReportPlatforms: Readonly<Partial<Record<string, string>>> = {
  'demo-report-summary':'Visiology',
  'demo-report-motivation':'Спектр BI · демо',
  'demo-report-debt':'Горизонт BI · демо',
  'demo-report-management':'Вектор BI · демо',
  'demo-report-occupancy':'Пульс BI · демо',
  'demo-report-client-service':'Орбита BI · демо',
  'demo-report-sales-funnel':'Фокус BI · демо',
  'demo-report-construction':'Маяк BI · демо',
  'demo-report-team-workload':'Атлас BI · демо',
  'demo-report-finance-plan':'Ритм BI · демо',
  'demo-report-sales-plan':'Сфера BI · демо',
};

// Negative shapes reuse the existing exported descending source charts.
// Current MAU values and unknown values remain unchanged.
export const demoReportUsage: Readonly<Partial<Record<string, { delta:string; chartSrc:string }>>> = {
  'demo-report-motivation':{delta:'−18%',chartSrc:'/images/report-table/chart-sales-plan.svg'},
  'demo-report-management':{delta:'−9%',chartSrc:'/images/report-table/chart-sales-funnel.svg'},
};
