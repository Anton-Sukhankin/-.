import { expect, test } from '@playwright/test';

const sourceUrl = '/preview/navigation?section=sources&source=source-reportcrm-date';
const metricsUrl = `${sourceUrl}&sourceTab=metrics`;
const metricTitles = [
  'Выполнение плана дополнительных доходов, %',
  'Доля онлайн-продаж по площади, %',
  'Доля онлайн сделок, %',
  'Кол-во онлайн сделок, шт',
  'Количество задач оформления и регистрации',
  'Платный резерв, перешедший в продажу',
];

test('source metrics show the observed fragment, shared hover and responsive information panel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(sourceUrl);
  const tab = page.getByRole('tab', { name: 'Метрики 16', exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/[?&]sourceTab=metrics/);

  const list = page.getByRole('list', { name: 'Метрики источника' });
  const rows = list.getByRole('listitem');
  await expect(list.getByRole('heading')).toHaveText(metricTitles);
  await expect(list.locator('p')).toHaveCount(6);
  await expect(list).toHaveCSS('row-gap', '4px');

  const first = rows.first();
  const card = first.getByRole('link');
  const title = first.getByRole('heading');
  const description = first.locator('p');
  const icon = first.locator('[data-catalog-entity-icon="metric"]');
  await expect(first).toHaveCSS('border-top-color', 'rgb(214, 230, 251)');
  await expect(first).toHaveCSS('border-radius', '12px');
  await expect(card).toHaveCSS('padding', '12px 16px');
  await expect(card).toHaveCSS('column-gap', '12px');
  await expect(title.locator('..')).toHaveCSS('row-gap', '4px');
  await expect(title).toHaveCSS('font-size', '16px');
  await expect(description).toHaveCSS('font-size', '14px');
  await expect(icon).toHaveCSS('width', '32px');
  await expect(icon).toHaveCSS('height', '32px');
  await expect(icon).toHaveCSS('background-color', 'rgb(240, 241, 244)');
  await expect(icon).toHaveCSS('color', 'rgb(113, 134, 165)');
  expect(await icon.evaluate(element => getComputedStyle(element, '::before').width)).toBe('16px');
  const [rowBox, iconBox] = await Promise.all([first.boundingBox(), icon.boundingBox()]);
  expect(iconBox!.y + iconBox!.height / 2).toBeCloseTo(rowBox!.y + rowBox!.height / 2);

  await card.hover();
  await expect(first).toHaveCSS('border-top-color', 'rgb(64, 143, 231)');
  await expect(title).toHaveCSS('color', 'rgb(0, 103, 220)');
  await expect(description).toHaveCSS('color', 'rgb(82, 102, 131)');
  await expect(icon).toHaveCSS('background-color', 'rgb(231, 242, 255)');
  await expect(icon).toHaveCSS('color', 'rgb(0, 123, 252)');

  const information = page.getByRole('complementary', { name: 'Сведения об источнике' });
  const [wideList, wideInformation] = await Promise.all([list.boundingBox(), information.boundingBox()]);
  expect(wideInformation!.x - wideList!.x - wideList!.width).toBeCloseTo(8);
  expect(wideInformation!.y).toBeCloseTo(wideList!.y);

  await page.setViewportSize({ width: 1024, height: 768 });
  const [narrowList, narrowInformation] = await Promise.all([list.boundingBox(), information.boundingBox()]);
  expect(narrowInformation!.x).toBeCloseTo(narrowList!.x);
  expect(narrowInformation!.y - narrowList!.y - narrowList!.height).toBeCloseTo(8);
  const scroll = page.getByRole('tabpanel');
  expect(await scroll.evaluate(element => element.scrollWidth)).toBe(await scroll.evaluate(element => element.clientWidth));
});

test('each source metric opens its own detail and returns to the tab with its scroll position', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(metricsUrl);
  const list = page.getByRole('list', { name: 'Метрики источника' });
  const links = list.getByRole('link');
  const crumb = page.getByRole('navigation', { name: 'Хлебные крошки' });
  const metricIds = new Set<string>();
  for (const [index, title] of metricTitles.entries()) {
    const link = links.nth(index);
    const description = await link.locator('p').innerText();
    if (index === 0) {
      await link.focus();
      await expect(link).toHaveCSS('outline-width', '2px');
      await link.press('Enter');
    } else await link.click();
    const id = new URL(page.url()).searchParams.get('metric');
    expect(id).toBeTruthy();
    metricIds.add(id!);
    await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
    await expect(page.getByText(description, { exact: true })).toBeVisible();
    await expect(page.getByText('Полные сведения о метрике не предоставлены')).toBeVisible();
    if (index === 0) {
      await page.reload();
      await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
    }
    await crumb.getByRole('button', { name: 'reportcrm20.dbo.dimdate', exact: true }).click();
    await expect(list).toBeVisible();
    await expect(page).toHaveURL(/[?&]sourceTab=metrics/);
  }
  expect(metricIds.size).toBe(6);

  await page.setViewportSize({ width: 1024, height: 620 });
  const panel = page.getByRole('tabpanel');
  const sourceDetail = page.locator('[data-source-detail-id]');
  for (const returnBy of ['history', 'breadcrumbs']) {
    await panel.evaluate(element => { element.scrollTop = 128; });
    await expect(sourceDetail).toHaveAttribute('data-detail-compact', 'true');
    const savedScrollTop = await panel.evaluate(element => element.scrollTop);
    expect(savedScrollTop).toBeGreaterThan(0);
    await links.nth(3).click();
    await expect(page.getByRole('heading', { level: 1, name: metricTitles[3], exact: true })).toBeVisible();
    if (returnBy === 'history') await page.goBack();
    else await crumb.getByRole('button', { name: 'reportcrm20.dbo.dimdate', exact: true }).click();
    await expect(page).toHaveURL(/[?&]sourceTab=metrics/);
    await expect.poll(() => panel.evaluate(element => element.scrollTop)).toBe(savedScrollTop);
    await expect(sourceDetail).toHaveAttribute('data-detail-compact', 'true');
  }
});

test('the source metrics tab distinguishes an empty list from unavailable data', async ({ page }) => {
  await page.goto('/preview/navigation?section=sources&source=source-demo-rewedo-versions&sourceTab=metrics');
  await expect(page.getByRole('tab', { name: 'Метрики 0', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Метрики не найдены' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Сведения об источнике' })).toBeVisible();

  await page.goto('/preview/navigation?section=sources&sourceReport=demo-report-debt&source=demo.finance.payments&sourceTab=metrics');
  await expect(page.getByRole('tab', { name: 'Метрики', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Список метрик недоступен' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Сведения об источнике' })).toBeVisible();
});
