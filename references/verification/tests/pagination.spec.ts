import { expect, test } from '@playwright/test';

const catalogs = [
  ['segment=favorites', 'Страницы избранных отчётов', '[data-table-report-id]', '[data-card-report-id]'],
  ['segment=subscriptions', 'Страницы подписок', '[data-subscription-row-id]', '[data-subscription-id]'],
  ['segment=contribution', 'Страницы вклада в каталог', '[data-contributor-row-id]', '[data-contributor-id]'],
  ['section=reports', 'Страницы отчётов', '[data-table-report-id]', '[data-card-report-id]'],
  ['section=metrics', 'Страницы метрик и показателей', '[data-metric-id]', '[data-metric-id]'],
  ['section=sources', 'Страницы источников', '[data-source-id]', '[data-source-id]'],
  ['section=systems&systems.view=list', 'Страницы каталога справочников', 'tbody tr', 'a[aria-label^="Открыть справочник"]'],
  ['section=systems&systems.reference=crm', 'Страницы справочника CRM', 'tbody tr'],
  ['section=ai', 'Страницы решений AI Hub', '[data-ai-solution]'],
  ['tab=news', 'Страницы новостей', '[data-news-id]'],
  ['section=dictionary&dictionaryTab=terms', 'Страницы терминов', '[data-dictionary-term]'],
  ['section=questions', 'Страницы FAQ', '[role="tabpanel"]:visible > section'],
  ['section=questions&questions.tab=mine', 'Страницы обращений', 'ul[aria-label="Список обращений"] > li'],
] as const;

for (const [query, label, rows, cards] of catalogs) {
  test(`${label} показывают 15 + 15 + 5 записей`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 850 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const usesDefaultData = query.startsWith('segment=') || query === 'section=reports';
    await page.goto(`/preview/navigation?${usesDefaultData ? '' : 'paginationDemo=1&'}${query}`);
    const pager = page.getByRole('navigation', { name: label, exact: true });
    const entries = page.locator(rows);
    await expect(entries).toHaveCount(15);
    await expect(pager).toContainText('1–15 из 35 · 15 на странице');
    await expect(pager).toBeInViewport({ ratio: 1 });
    await expect(pager.getByRole('button', { name: 'Предыдущая страница' })).toBeDisabled();
    await pager.getByRole('button', { name: 'Следующая страница' }).click();
    await expect(pager).toContainText('16–30 из 35');
    await expect(entries).toHaveCount(15);
    if (cards) {
      const ids = await entries.evaluateAll(nodes => nodes.map(node =>
        Array.from(node.attributes).find(attribute => attribute.name.endsWith('-id'))?.value ?? node.textContent?.trim()));
      await page.getByRole('button', { name: 'Карточный вид', exact: true }).click();
      await expect(pager).toContainText('16–30 из 35');
      const cardEntries = page.locator(cards);
      await expect(cardEntries).toHaveCount(15);
      if (!query.startsWith('section=systems')) {
        const cardIds = await cardEntries.evaluateAll(nodes => nodes.map(node =>
          Array.from(node.attributes).find(attribute => attribute.name.endsWith('-id'))?.value ?? node.textContent?.trim()));
        expect(cardIds.sort()).toEqual(ids.sort());
      }
      await page.getByRole('button', { name: 'Табличный вид', exact: true }).click();
    }
    await pager.getByRole('button', { name: '3', exact: true }).click();
    await expect(pager).toContainText('31–35 из 35');
    await expect(entries).toHaveCount(5);
    await expect(pager.getByRole('button', { name: 'Следующая страница' })).toBeDisabled();
  });
}

test('reports hide pagination for a short filtered result and restore it after clearing', async ({ page }) => {
  await page.goto('/preview/navigation?section=reports');
  const pager = page.getByRole('navigation', { name: 'Страницы отчётов', exact: true });
  await expect(pager).toContainText('1–15 из 35');
  await pager.getByRole('button', { name: '3', exact: true }).click();
  await page.getByRole('button', { name: 'Фильтр «Домен»', exact: true }).click();
  const filter = page.getByRole('dialog', { name: 'Фильтр: Домен', exact: true });
  await filter.getByRole('checkbox', { name: 'Финансы', exact: true }).check();
  await filter.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(page.locator('[data-table-report-id]').first()).toBeVisible();
  await expect(pager).toHaveCount(0);
  await page.getByRole('button', { name: 'Сбросить фильтр «Домен»', exact: true }).click();
  await expect(pager).toContainText('1–15 из 35');
});
