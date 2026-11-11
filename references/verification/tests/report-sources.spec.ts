import { expect, test } from '@playwright/test';

test('DataHub sources stay in a vertical list and disclose the bordered attribute matrix', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/preview/navigation?section=reports&report=demo-report-summary&reportTab=sources');
  const sources = page.locator('[data-report-sources]');
  const rows = sources.locator(':scope > section');
  await expect(rows).toHaveCount(5);
  const first = rows.first().getByRole('button', { name: /^demo.requests/ });
  const second = rows.nth(1).getByRole('button', { name: /^demo.events/ });
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  await first.click();
  await expect(first).toHaveAttribute('aria-expanded', 'false');
  await first.press('Space');
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  // The dl keeps the label/value relationship without inventing a table schema.
  const attributes = rows.first().locator('dl');
  await expect(attributes.locator('dt')).toHaveText(['Платформа', 'База данных', 'Схема', 'Окружение', 'Статус', 'Поля', 'URN']);
  await expect(attributes.locator('dd')).toHaveText(['SQL Server', 'demo_catalog', 'demo', 'DEV', 'Активен', '24', 'urn:li:dataset:(urn:li:dataPlatform:mssql,demo_catalog.demo.requests,DEV)']);
  await expect(second).toHaveAttribute('aria-expanded', 'false');
  for (const [width, height] of [[1280, 900], [1440, 900], [1920, 1080], [1024, 768], [1440, 700]]) {
    await page.setViewportSize({ width, height });
    const bounds = await rows.evaluateAll(elements => elements.map(element => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    }));
    for (let i = 1; i < bounds.length; i++) {
      expect(bounds[i].x).toBe(bounds[0].x);
      expect(bounds[i].width).toBe(bounds[0].width);
      expect(bounds[i].y).toBeGreaterThan(bounds[i - 1].y + bounds[i - 1].height);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await first.press('Space');
  await expect(first).toHaveAttribute('aria-expanded', 'false');
  await expect(attributes).not.toBeVisible();
  await first.press('Enter');
  await expect(attributes).toBeVisible();
  expect(errors).toEqual([]);
});

test('report source actions open the selected source and return to the same report tab', async ({ page }) => {
  await page.goto('/preview/navigation?section=reports&report=demo-report-summary&reportTab=sources&source=source-dwh-project');
  const report = page.locator('[data-report-id="demo-report-summary"]');
  const sources = report.locator('[data-report-sources]');
  await expect(sources.getByRole('button', { name: /^demo.events/ })).toHaveAttribute('aria-expanded', 'false');
  await sources.getByRole('button', { name: 'Карточка источника demo.events', exact: true }).press('Enter');
  await expect(page.getByRole('heading', { name: 'demo.events', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Описание полей', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-source-description]')).toContainText('18 колонок');
  await expect(page.getByText('urn:li:dataset:(urn:li:dataPlatform:postgres,demo_catalog.demo.events,TEST)', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Связанные отчёты' }).click();
  const breadcrumbs = page.getByRole('navigation', { name: 'Хлебные крошки' });
  await expect(breadcrumbs.getByRole('button')).toHaveText(['Отчёты', 'Сводный отчёт Гостеприимства']);
  await breadcrumbs.getByRole('button', { name: 'Сводный отчёт Гостеприимства' }).click();
  await expect(report.getByRole('tab', { name: 'Источники данных 5', exact: true })).toHaveAttribute('aria-selected', 'true');

  await sources.getByRole('button', { name: 'Карточка источника demo.services', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'demo.services', exact: true })).toBeVisible();
  await page.goBack();
  await expect(report.getByRole('tab', { name: 'Источники данных 5', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('a direct report source URL keeps the originating report available', async ({ page }) => {
  await page.goto('/preview/navigation?section=sources&sourceReport=demo-report-debt&source=demo.finance.payments&sourceTab=fields');
  await expect(page.getByRole('heading', { name: 'demo.finance.payments', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Источники данных отчёта' }).click();
  await expect(page.locator('[data-report-id="demo-report-debt"]').getByRole('tab', {
    name: 'Источники данных 2', exact: true,
  })).toHaveAttribute('aria-selected', 'true');
});
