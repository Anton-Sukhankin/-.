import { DetailInformationHeading, DetailInformationPerson } from '../../components/DetailHeader/DetailInformation';
import type { ReportSummary } from '../../data/reports';
import type { ReportOverviewContent } from './source';
import s from './Detail.module.css';

export function ReportInformation({ report, content, sourceCount, missingAsDash = false }: {
  report: ReportSummary;
  content?: ReportOverviewContent;
  sourceCount?: number;
  missingAsDash?: boolean;
}) {
  const attributes = [
    ['Обновление', content?.refreshSchedule || undefined, 'Не указано'],
    ['Платформа', report.platform, 'Не указана'],
    ['Мастер-системы', report.masterSystem, 'Не указаны'],
    ['Источники', sourceCount, 'Не указаны'],
  ];

  return <aside className={`${s.info} ${s.information}`} aria-label="Сведения об отчёте">
    <DetailInformationHeading description="Обновление, источники и ответственные за отчёт" />
    <dl>{attributes.map(([label, value, fallback]) => <div key={label}><dt>{label}</dt><dd>{value ?? (missingAsDash ? '—' : fallback)}</dd></div>)}</dl>
    {content?.people?.map(({ name, description, role, avatar }) => (
      <DetailInformationPerson key={role} name={name} description={description} role={role} avatar={avatar} />
    ))}
  </aside>;
}
