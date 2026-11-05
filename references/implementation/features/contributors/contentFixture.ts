import { previewContributors } from './previewFixture';
import type { ContributionListItem } from './ContributionContent';

// User chose the five accepted card participants for both views (3 November2026).
// Table-only people3–10 are not substituted. Missing table attributes stay literal —.
export const contributionContentFixture: readonly ContributionListItem[] = previewContributors.map((contributor, index) => ({
  ...contributor,
  domain: index === 0 ? 'Продажи и маркетинг' : index === 1 ? 'Гостеприимство' : '—',
  tableAffiliation: index === 0 ? 'Дирекция развития ИИ-платформы…' : index === 1 ? 'Операционный блок' : '—',
}));
