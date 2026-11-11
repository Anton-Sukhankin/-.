import { expect, test } from '@playwright/test';

const sources = '/preview/navigation?section=sources';
const masterSystems = sources + '&sourceSection=master';
const catalog = '[data-master-systems]';
const card = '[data-master-system]';
const description = 'Информационные системы из CMDB с привязанными источниками данных';

test.use({ reducedMotion: 'reduce', viewport: { width: 1440, height: 940 } });

test('master systems match the Paper grouping, geometry and shared card feedback', async ({ page }) => {
  await page.goto(sources);
  await page.getByRole('tab', { name: 'Мастер-системы', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Мастер-системы', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(catalog)).toHaveCSS('background-color', 'rgb(243, 244, 249)');
  await expect(page.locator(catalog)).toHaveCSS('border-top-left-radius', '16px');
  await expect(page.locator(catalog).getByRole('heading')).toHaveText(['1С3', 'A–C5', 'E–N7'].map((name, index) => index === 0 ? name + description : name));
  await expect(page.locator(card).locator('[data-master-count]')).toHaveText([
    'Источников: 554', 'Источников: 166', 'Источников: 230', 'Источников: 2', 'Источников: 133',
    'Источников: 9', 'Источников: 3 823', 'Источников: 2 322', 'Источников: 1', 'Источников: 6',
    'Источников: 14', 'Источников: 21', 'Источников: 37', 'Источников: 168', 'Источников: 158',
  ]);
  const search = page.getByRole('searchbox', { name: 'Поиск по мастер-системам' });
  const searchField = page.locator('[data-master-toolbar] [data-appearance="local"]');
  const segments = page.getByRole('tablist', { name: 'Тип каталога источников' });
  const searchBox = (await searchField.boundingBox())!;
  const segmentBox = (await segments.boundingBox())!;
  expect(searchBox.x - segmentBox.x - segmentBox.width).toBeCloseTo(40);
  expect(searchBox.y).toBeCloseTo(segmentBox.y);
  expect(searchBox.width).toBe(516);
  expect(searchBox.height).toBe(40);
  await search.focus();
  await expect(searchField).toHaveCSS('border-top-color', 'rgb(0, 123, 252)');

  const first = page.locator(card).first();
  const second = page.locator(card).nth(1);
  const firstBox = (await first.boundingBox())!;
  const secondBox = (await second.boundingBox())!;
  expect(secondBox.x - firstBox.x - firstBox.width).toBeCloseTo(12);
  expect(firstBox.height).toBe(72);
  const icon = first.locator('[data-catalog-entity-icon="source"]');
  await expect(icon).toHaveCSS('width', '40px');
  expect(await icon.evaluate(element => getComputedStyle(element, '::before').width)).toBe('16px');
  await first.hover();
  await expect(first).toHaveCSS('border-top-color', 'rgb(64, 143, 231)');
  await expect(first.locator('[data-master-name]')).toHaveCSS('color', 'rgb(0, 103, 220)');
  await expect(first.locator('[data-master-count]')).toHaveCSS('color', 'rgb(82, 105, 140)');
  await expect(icon).toHaveCSS('background-color', 'rgb(231, 242, 255)');
  await expect(icon).toHaveCSS('color', 'rgb(0, 103, 220)');
  expect(await first.boundingBox()).toEqual(firstBox);
  await page.getByRole('button', { name: '1С 3', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(first).toBeFocused();
  await expect(first).toHaveCSS('outline-style', 'solid');

  await page.setViewportSize({ width: 820, height: 760 });
  await expect(search).toBeVisible();
  const narrowSearch = (await searchField.boundingBox())!;
  const toolbar = (await page.locator('[data-master-toolbar]').boundingBox())!;
  expect(narrowSearch.x + narrowSearch.width).toBeLessThanOrEqual(toolbar.x + toolbar.width);
  const narrowFirst = (await first.boundingBox())!;
  const narrowSecond = (await second.boundingBox())!;
  expect(narrowFirst.x).toBeCloseTo(narrowSecond.x);
  expect(narrowSecond.y - narrowFirst.y - narrowFirst.height).toBeCloseTo(8);
  expect(await page.locator(catalog).evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(
    await page.locator(catalog).evaluate(element => element.clientWidth),
  );
});

test('accordion headers toggle from either edge and preserve independent and searched states', async ({ page }) => {
  await page.goto(masterSystems);
  const first = page.getByRole('button', { name: '1С 3', exact: true });
  const second = page.getByRole('button', { name: 'A–C 5', exact: true });
  const firstGroup = page.locator('[data-master-group="1С"]');
  const summary = first.getByText(description, { exact: true });
  const summaryBox = await summary.boundingBox();
  expect(summaryBox).not.toBeNull();
  await summary.click();
  await expect(first).toHaveAttribute('aria-expanded', 'false');
  await expect(firstGroup.locator('[inert]')).toHaveCount(1);
  await expect(firstGroup.getByRole('button', { name: /Открыть источники/ })).toHaveCount(0);
  await expect(second).toHaveAttribute('aria-expanded', 'true');
  expect(await summary.boundingBox()).toEqual(summaryBox);
  await expect(summary).toHaveCSS('color', 'rgb(94, 112, 138)');

  await first.press('Enter');
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  await first.press('Space');
  await expect(first).toHaveAttribute('aria-expanded', 'false');
  await expect(first).toBeFocused();
  const search = page.getByRole('searchbox', { name: 'Поиск по мастер-системам' });
  await search.fill('  зуп  ');
  await expect(page.getByRole('button', { name: '1С 1', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Открыть источники «1С ЗУП»' })).toBeVisible();
  await expect(page.locator(card)).toHaveCount(1);
  await search.fill('такой системы нет');
  await expect(page.getByRole('status').getByText('Мастер-системы не найдены')).toBeVisible();
  await page.getByRole('button', { name: 'Очистить поиск', exact: true }).click();
  await expect(search).toBeFocused();
  await expect(first).toHaveAttribute('aria-expanded', 'false');
  await expect(second).toHaveAttribute('aria-expanded', 'true');
});

test('whole master cards open a scoped source list, retain state on return and handle missing local links', async ({ page }) => {
  await page.goto(masterSystems + '&source.platform=SQL+Server');
  const first = page.getByRole('button', { name: '1С 3', exact: true });
  await first.click();
  const search = page.getByRole('searchbox', { name: 'Поиск по мастер-системам' });
  await search.fill('dynamics');
  const crm = page.getByRole('button', { name: 'Открыть источники «CRM (CRM Dynamics)»' });
  await crm.press('Enter');
  await expect(page.getByText('Мастер-система:').getByText('CRM (CRM Dynamics)')).toBeVisible();
  await expect(page.locator('[data-source-id]')).toHaveCount(1);
  await expect(page.locator('[data-source-id]')).toContainText('rewedo_crm_production.public.versions');
  await page.goBack();
  await expect(search).toHaveValue('dynamics');
  await page.goForward();
  await expect(page.locator('[data-source-id]')).toHaveCount(1);
  await page.getByRole('button', { name: 'К мастер-системам', exact: true }).click();
  await expect(page).toHaveURL(/source\.platform=SQL\+Server/);
  await expect(search).toHaveValue('dynamics');
  await page.getByRole('button', { name: 'Очистить поиск по мастер-системам' }).click();
  await expect(first).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: 'Открыть источники «Atlassian Jira»' }).click();
  await expect(page.getByRole('heading', { name: 'Источников пока нет' })).toBeVisible();
  await expect(page.getByText('В наборе прототипа нет источников, связанных с этой мастер-системой.')).toBeVisible();
  await page.getByRole('button', { name: 'К мастер-системам', exact: true }).click();
  await page.getByRole('tab', { name: 'Источники', exact: true }).click();
  await expect(page.locator('[data-source-id]')).toHaveCount(8);
});

test('a source selected in Navigator leaves the master scope when switching views', async ({ page }) => {
  await page.goto(sources + '&sourceMaster=crm-dynamics');
  const navigatorSearch = page.getByRole('combobox', { name: 'Поиск по каталогу' });
  await navigatorSearch.fill('reportcrm20.dbo.dimdate');
  const result = page.getByRole('dialog', { name: 'Поиск по каталогу' })
    .getByRole('rowgroup', { name: 'Источники', exact: true })
    .getByRole('row').filter({ hasText: 'reportcrm20.dbo.dimdate' });
  await result.getByRole('gridcell').first().getByRole('button').click();
  await expect(page).not.toHaveURL(/sourceMaster=|sourceSection=/);

  await page.getByRole('button', { name: 'Карточный вид' }).click();
  await expect(page.locator('[data-source-id="source-reportcrm-date"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'К мастер-системам' })).toHaveCount(0);
});
