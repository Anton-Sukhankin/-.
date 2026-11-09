import { previewContributors } from './previewFixture';
import type { ContributionListItem } from './ContributionContent';

// Synthetic profiles for the integrated demo. Preserve the original reference fixture separately.
const demoProfiles = [
  ['Аналитик', 'Аналитик данных', 'Команда качества данных', 'Управление данными', '42', '50', '8', '84%'],
  ['Self-service', 'Аналитик продукта', 'Команда продуктовой аналитики', 'Продуктовая аналитика', '36', '45', '9', '80%'],
  ['Аналитик', 'Бизнес-аналитик', 'Финансовая дирекция', 'Финансы', '28', '35', '7', '80%'],
  ['Аналитик', 'Аналитик отчётности', 'Команда коммерческой аналитики', 'Продажи и маркетинг', '24', '30', '6', '80%'],
  ['Self-service', 'Аналитик операций', 'Операционный блок', 'Гостеприимство', '18', '24', '6', '75%'],
  ['Аналитик', 'Аналитик процессов', 'Команда операционной эффективности', 'Операции', '15', '20', '5', '75%'],
  ['Self-service', 'Аналитик персонала', 'Дирекция по работе с персоналом', 'Персонал', '12', '16', '4', '75%'],
] as const;

export const contributionContentFixture: readonly ContributionListItem[] = [
  { ...previewContributors[0], domain: 'Продажи и маркетинг' },
  { ...previewContributors[1], domain: 'Гостеприимство' },
  ...demoProfiles.map(([roleLabel, jobTitle, department, domain, checked, total, pending, verified], index): ContributionListItem => {
    const rank = index + 3;
    return {
      id: `demo-contributor-${rank}`,
      rankLabel: String(rank),
      name: `Участник примера ${String(rank).padStart(2, '0')}`,
      roleLabel, jobTitle, department, domain,
      metrics: [
        { label: 'Проверок', value: checked }, { label: 'Всего', value: total },
        { label: 'К проверке', value: pending }, { label: 'Проверено (назначенных)', value: verified },
      ],
    };
  }),
];
