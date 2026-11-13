import { expect, test } from '@playwright/test';

const entry = '/preview/navigation';
const queue = 'Очередь заявок на рассылку';

test('mailing requests open their existing report passports and return to Tasks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(entry);
  const sidebar = page.getByRole('navigation', { name: 'Разделы каталога' });
  const tasks = sidebar.getByRole('button', { name: 'Задачи', exact: true });
  await tasks.click();
  await expect(tasks).toHaveAttribute('aria-current', 'page');
  await expect(tasks.getByText('6', { exact: true })).toBeVisible();
  const list = page.getByRole('list', { name: queue });
  const requests = list.getByRole('button');
  await expect(requests).toHaveCount(6);
  await expect(list.getByText('Аналитик не назначен')).toHaveCount(2);

  const reportIds = ['sales-plan', 'sales-plan', 'sales-plan', 'canopy', 'canopy', 'summary'];
  const reportTitles = ['План-Факт продажи', 'План-Факт продажи', 'План-Факт продажи', 'Навес свод и детализация',
    'Навес свод и детализация', 'Сводный отчёт Гостеприимства'];
  for (const [index, id] of reportIds.entries()) {
    const card = requests.nth(index);
    if (index === 0) {
      await page.getByRole('region', { name: 'Прокрутка задач' }).focus();
      await page.keyboard.press('Tab');
      await expect(card).toBeFocused();
      await expect(card).toHaveCSS('outline-style', 'solid');
      await card.press('Enter');
    } else await card.click();
    await expect(page).toHaveURL(new RegExp(`section=reports&report=demo-report-${id}&reportTab=overview$`));
    await expect(page.getByRole('heading', { level: 1, name: reportTitles[index] })).toBeVisible();
    const breadcrumbs = page.getByRole('navigation', { name: 'Хлебные крошки' });
    await breadcrumbs.getByRole('button', { name: 'Задачи', exact: true }).click();
    await expect(page).toHaveURL(/section=tasks$/);
    await expect(requests).toHaveCount(6);
  }

  await page.goto(`${entry}?section=reports&report=demo-report-sales-plan`);
  await expect(page.getByRole('navigation', { name: 'Хлебные крошки' })
    .getByRole('button', { name: 'Отчёты', exact: true })).toBeVisible();
});

test('task cards use the Paper geometry and keep metadata readable when narrow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${entry}?section=tasks&paginationDemo=1`);
  const sidebar = page.getByRole('navigation', { name: 'Разделы каталога' });
  await expect(sidebar.getByRole('button', { name: 'Задачи', exact: true }).getByText('6', { exact: true })).toBeVisible();
  const cards = page.getByRole('list', { name: queue }).getByRole('button');
  const first = cards.first();
  await expect(cards).toHaveCount(6);
  const dot = first.locator('[data-description-separator]').first();
  await expect(first.locator('[data-description-separator]')).toHaveCount(3);
  await expect(dot).toHaveCSS('width', '3px');
  await expect(dot).toHaveCSS('height', '3px');
  await expect(dot).toHaveCSS('margin-inline-start', '4px');
  await expect(dot).toHaveCSS('margin-inline-end', '4px');
  const icon = first.locator('[data-catalog-entity-icon="task"]');
  await expect(icon).toHaveCSS('width', '40px');
  await expect(icon).toHaveCSS('height', '40px');
  await expect.poll(() => icon.evaluate(node => getComputedStyle(node, '::before').width)).toBe('16px');
  await expect(first.getByText('План-Факт продажи')).toHaveCSS('line-height', '18px');

  await page.setViewportSize({ width: 620, height: 700 });
  await expect(first.getByText('Аналитик: Алексей Волков')).toBeVisible();
  await expect(first.getByText('05.10.2026, 18:55:25')).toBeVisible();
  expect(await first.evaluate(node => node.scrollWidth - node.clientWidth)).toBe(0);
  await expect(cards.last().getByText('Аналитик не назначен')).toBeVisible();
});
