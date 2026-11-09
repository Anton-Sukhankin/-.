import { expect, test } from '@playwright/test';

const catalog = '/preview/navigation?section=systems';
const crm = catalog + '&systems.reference=crm';

test('opens the catalog, switches views and returns from the same reference', async ({ page }) => {
  await page.goto('/preview/navigation');
  const nav = page.getByRole('navigation', { name: 'Разделы каталога' });
  const systems = nav.getByRole('button', { name: 'Справочники ИС', exact: true });
  await systems.click();
  await expect(systems).toHaveAttribute('aria-current', 'page');
  const registry = page.getByRole('region', { name: 'Каталог справочников ИС' });
  const viewPicker = registry.getByRole('group', { name: 'Вид справочников' });
  await expect(viewPicker).toHaveAttribute('data-view-appearance', 'icons');
  await expect(viewPicker.getByRole('button', { name: 'Карточный вид' })).toHaveAttribute('aria-pressed', 'true');
  const results = registry.getByRole('region', { name: 'Доступные справочники' });
  await expect(results).toHaveAttribute('data-view', 'cards');
  await expect(results.getByText('15', { exact: true })).toBeVisible();
  await expect(results.getByText('Демонстрационные данные', { exact: true })).toHaveCount(0);
  await expect(results.locator('header')).toHaveCSS('border-bottom-width', '1px');
  const record = registry.getByRole('link', { name: 'Открыть справочник — Справочник CRM', exact: true });
  const cards = registry.getByRole('link', { name: /Открыть справочник/ });
  await expect(cards).toHaveCount(15);
  const [first, second, third] = await Promise.all([0, 1, 2].map(index => cards.nth(index).boundingBox()));
  expect(second!.x - (first!.x + first!.width)).toBe(8);
  expect(third!.y - (first!.y + first!.height)).toBe(8);
  await expect(registry.getByText(/DEMO-\d+/)).toHaveCount(0);
  await expect(registry.getByRole('link', { name: 'Открыть справочник — Справочник финансов' })).toHaveText('Справочник финансовУправление финансами');
  await expect(record).toHaveCount(1);
  await expect(record).toContainText('CRM (CRM Dynamics) · TZ-22328');
  const cardIcon = record.locator('[data-catalog-entity-icon="reference"]');
  await expect(cardIcon).toHaveCount(1);
  const groupHeader = (await results.locator('header').boundingBox())!;
  expect((await record.boundingBox())!.y - groupHeader.y - groupHeader.height).toBe(16);
  await record.hover({ position: { x: 4, y: 12 } });
  await expect(cardIcon).toHaveCSS('color', 'rgb(0, 103, 220)');
  await expect(cardIcon).toHaveCSS('background-color', 'rgb(231, 242, 255)');
  await expect(record.getByText('Справочник CRM', { exact: true })).toHaveCSS('color', 'rgb(0, 103, 220)');

  const list = viewPicker.getByRole('button', { name: 'Табличный вид' });
  await list.press('Enter');
  await expect(list).toHaveAttribute('aria-pressed', 'true');
  await expect(results).toHaveAttribute('data-view', 'list');
  await page.reload();
  await expect(list).toHaveAttribute('aria-pressed', 'true');
  const table = results.getByRole('table');
  await expect(table.getByRole('columnheader')).toHaveText(['Справочник', 'Информационная система', 'Код ИС']);
  await expect(table.locator('thead')).toHaveCSS('position', 'sticky');
  await expect(results.locator('header')).toHaveCSS('border-bottom-color', 'rgb(226, 228, 234)');
  const headerBottom = (await results.locator('header').boundingBox())!;
  const firstRow = (await table.locator('tbody tr').first().boundingBox())!;
  const headings = await table.getByRole('columnheader').evaluateAll(cells => cells.map(cell => {
    const text = document.createRange();
    text.selectNodeContents(cell);
    const { top, bottom } = text.getBoundingClientRect();
    return { top, bottom };
  }));
  for (const { top, bottom } of headings) {
    expect(top - (headerBottom.y + headerBottom.height)).toBeCloseTo(firstRow.y - bottom, 0);
  }
  await expect(record).toHaveText('CRM');
  await expect(table.getByRole('link', { name: 'Открыть справочник — Справочник финансов', exact: true })).toHaveText('Финансов');
  await expect(table.getByRole('link', { name: 'Открыть справочник — Складской справочник', exact: true })).toHaveText('Складской справочник');
  const icon = record.locator('[aria-hidden="true"]');
  await expect(icon).toHaveCSS('background-color', 'rgb(238, 242, 246)');
  await expect(icon).toHaveCSS('color', 'rgb(113, 134, 165)');
  const iconBox = (await icon.boundingBox())!;
  const labelBox = (await record.getByText('CRM', { exact: true }).boundingBox())!;
  expect(labelBox.x - (iconBox.x + iconBox.width)).toBe(8);
  await record.locator('xpath=ancestor::tr').hover();
  await expect(icon).toHaveCSS('color', 'rgb(0, 103, 220)');
  await expect(record.getByText('CRM', { exact: true })).toHaveCSS('color', 'rgb(0, 103, 220)');
  await expect(table.getByRole('cell', { name: 'CRM (CRM Dynamics)' })).toBeVisible();
  await expect(table.getByRole('cell', { name: 'Нет значения', exact: true })).toHaveCount(14);
  const code = table.getByRole('cell', { name: 'TZ-22328' });
  await expect(code).toBeVisible();
  await list.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(results.getByRole('region', { name: 'Прокрутка каталога справочников' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(record).toBeFocused();
  expect(await record.evaluate(link => getComputedStyle(link, '::after').outlineWidth)).toBe('2px');
  await record.press('Enter');
  await expect(page).toHaveURL(/systems\.view=list&systems\.reference=crm/);
  await expect(page.getByRole('heading', { name: 'Справочник CRM' })).toBeVisible();
  await expect(systems).toHaveAttribute('aria-current', 'page');
  await page.goBack();
  await expect(list).toHaveAttribute('aria-pressed', 'true');
  const { x, y, width, height } = (await code.boundingBox())!;
  await page.mouse.click(x + width / 2, y + height / 2);
  await expect(page).toHaveURL(/systems\.view=list&systems\.reference=crm/);
  await page.getByRole('link', { name: 'К справочникам' }).click();
  await expect(list).toHaveAttribute('aria-pressed', 'true');
  await expect(record).toHaveCount(1);
});

test('catalog preserves pagination through view, direct link, reload and returning from an empty demo reference', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  const paginatedCatalog = catalog + '&paginationDemo=1';
  await page.goto(paginatedCatalog);
  const registry = page.getByRole('region', { name: 'Каталог справочников ИС' });
  const scroll = registry.getByRole('region', { name: 'Прокрутка каталога справочников' });
  const pagination = registry.getByRole('navigation', { name: 'Страницы каталога справочников' });
  const records = scroll.getByRole('link', { name: /Открыть справочник/ });
  await expect(records).toHaveCount(15);
  await expect(pagination).toContainText('1–15 из 35');
  await expect(pagination).toHaveCSS('height', '64px');
  await expect(pagination).not.toHaveCSS('box-shadow', 'none');
  await scroll.evaluate(element => { element.scrollTop = element.scrollHeight; });
  expect(await scroll.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const last = (await records.last().boundingBox())!;
  expect(last.y + last.height).toBeLessThan((await pagination.boundingBox())!.y);
  expect((await pagination.boundingBox())!.y + 64).toBe(768);
  await page.setViewportSize({ width: 1024, height: 900 });
  expect((await pagination.boundingBox())!.y + 64).toBe(900);

  await pagination.getByRole('button', { name: '2', exact: true }).press('Enter');
  await expect(page).toHaveURL(/systems\.page=2/);
  await expect(pagination).toContainText('16–30 из 35');
  await expect(records).toHaveCount(15);
  await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBe(0);
  await expect(records.filter({ hasText: 'Справочник поставщиков · демо 28' })).toBeVisible();
  await registry.getByRole('button', { name: 'Табличный вид' }).click();
  await expect(registry.getByRole('table')).toBeVisible();
  await expect(pagination).toContainText('16–30 из 35');
  await page.reload();
  await expect(registry.getByRole('table')).toBeVisible();
  await expect(pagination).toContainText('16–30 из 35');
  await records.filter({ hasText: 'Поставщиков · демо 28' }).press('Enter');
  await expect(page).toHaveURL(/systems\.reference=demo-suppliers/);
  await expect(page.getByRole('heading', { name: 'Справочник поставщиков · демо 28', exact: true })).toBeVisible();
  await expect(page.getByText('Управление поставщиками', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'В справочнике пока нет записей' })).toBeVisible();
  await expect(page.getByRole('searchbox', { name: 'Поиск в справочнике CRM' })).toHaveCount(0);
  await expect(page.getByRole('table')).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Хлебные крошки' }).getByRole('link', { name: 'Справочники ИС' }).press('Enter');
  await expect(registry.getByRole('table')).toBeVisible();
  await expect(pagination).toContainText('16–30 из 35');
  await page.goto(paginatedCatalog + '&systems.view=list&systems.page=2');
  await expect(records).toHaveCount(15);
  await expect(pagination.getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-current', 'page');
  await pagination.getByRole('button', { name: 'Предыдущая страница' }).click();
  await expect(pagination).toContainText('1–15 из 35');
  await expect(registry.getByRole('cell', { name: 'TZ-22328' })).toBeVisible();
});

test('long system names use one line in cards and two in tables, with a keyboard tooltip only when clipped', async ({ page }) => {
  const systemName = 'Корпоративная система управления инвестиционными программами, долгосрочными договорами и обязательствами подрядчиков';
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(catalog);
  const registry = page.getByRole('region', { name: 'Каталог справочников ИС' });
  const links = registry.getByRole('link', { name: /Открыть справочник/ });
  await expect(links).toHaveCount(15);
  expect(await links.evaluateAll(items => [...new Set(items.map(item => item.getBoundingClientRect().height))])).toEqual([96]);
  const cardDescription = registry.getByText(systemName, { exact: true });
  await expect(cardDescription).toHaveCSS('white-space', 'nowrap');
  await expect(cardDescription).toHaveCSS('color', 'rgb(82, 105, 140)');
  await expect(cardDescription).toHaveAttribute('data-overflow-clipped', 'true');
  const contracts = registry.getByRole('link', { name: 'Открыть справочник — Справочник договоров' });
  await expect(contracts).toHaveAccessibleDescription(systemName);
  await contracts.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(contracts).toBeFocused();
  await expect(page.getByRole('tooltip')).toHaveText(systemName);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await expect(registry.getByText('Управление финансами', { exact: true })).not.toHaveAttribute('data-overflow-clipped');

  await registry.getByRole('button', { name: 'Табличный вид' }).click();
  const table = page.getByRole('table', { name: 'Доступные справочники' });
  const rows = table.locator('tbody tr');
  await expect(rows).toHaveCount(15);
  await page.evaluate(() => document.fonts.ready);
  const longRow = rows.filter({ has: page.getByRole('link', { name: 'Открыть справочник — Справочник договоров' }) });
  const systemCell = longRow.getByText(systemName, { exact: true });
  await expect(systemCell).toHaveCSS('-webkit-line-clamp', '2');
  await expect(systemCell).toHaveCSS('color', 'rgb(16, 29, 59)');
  await expect(systemCell).toHaveAttribute('data-overflow-clipped', 'true');
  await expect(longRow.getByRole('cell').nth(1)).toHaveCSS('padding-top', '12px');
  await expect(longRow.getByRole('cell').nth(1)).toHaveCSS('padding-bottom', '12px');
  await expect(longRow.getByRole('cell').nth(1)).toHaveCSS('padding-left', '12px');
  expect((await rows.first().boundingBox())!.height).toBe(64);
  expect((await longRow.boundingBox())!.height).toBe(66);
  await systemCell.hover();
  await expect(page.getByRole('tooltip')).toHaveText(systemName);
  await page.keyboard.press('Escape');
  await contracts.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tooltip')).toHaveText(systemName);
});

test('catalog keeps long names readable in both views without creating an action column', async ({ page }) => {
  const title = 'СправочникИнформационнойСистемы'.repeat(5);
  const system = 'Наименование информационной системы для проверки переноса длинного текста '.repeat(3).trim();
  const entries = [
    { id: 'long', title, system: { name: system, code: 'TZ-12345' } },
    { id: 'short', title: 'Короткое имя', system: { name: 'Система', code: 'TZ-23456' } },
  ];
  await page.route('**/src/demo/systemReferences.ts*', route => route.fulfill({
    contentType: 'application/javascript',
    body: `export const demoSystemReferencesGateway = { list: () => ${JSON.stringify(entries)}, rows: () => [] };`,
  }));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(catalog);
  const main = page.getByRole('main');
  const group = main.getByRole('region', { name: 'Доступные справочники' });
  const cards = group.getByRole('listitem');
  await expect(group.getByText('2', { exact: true })).toBeVisible();
  await expect(cards.first()).toContainText(title);
  await expect(cards.first()).toContainText(system);
  await expect(group.getByRole('navigation', { name: 'Страницы каталога справочников' })).toHaveCount(0);
  const [first, second] = await Promise.all([cards.first().boundingBox(), cards.last().boundingBox()]);
  expect(second!.x).toBe(first!.x);
  expect(second!.y - first!.y - first!.height).toBeCloseTo(8, 0);

  await main.getByRole('button', { name: 'Табличный вид' }).click();
  const table = group.getByRole('table');
  const rows = table.locator('tbody tr');
  await expect(rows.first()).toContainText(title);
  await expect(rows.first()).toContainText(system);
  await expect(rows.first().getByRole('cell')).toHaveCount(3);
  const [firstRow, secondRow] = await Promise.all([rows.first().boundingBox(), rows.last().boundingBox()]);
  expect(secondRow!.y - firstRow!.y - firstRow!.height).toBeCloseTo(4, 0);
  expect(await main.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  const firstWidth = async () => (await table.getByRole('columnheader').first().boundingBox())!.width;
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(firstWidth).toBeCloseTo(424, 0);
  await page.setViewportSize({ width: 1920, height: 900 });
  await expect.poll(firstWidth).toBeCloseTo(424, 0);
  expect(await rows.first().getByRole('cell').first().evaluate(cell => {
    const heading = cell.closest('table')!.querySelector('th')!;
    const textLeft = (element: Element) => element.getBoundingClientRect().left +
      parseFloat(getComputedStyle(element).paddingLeft) + parseFloat(getComputedStyle(element).borderLeftWidth);
    return textLeft(cell) - textLeft(heading);
  })).toBe(0);
});

test('catalog with no references retains the empty state without view controls', async ({ page }) => {
  await page.route('**/src/demo/systemReferences.ts*', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'export const demoSystemReferencesGateway = { list: () => [], rows: () => [] };',
  }));
  await page.goto(catalog + '&systems.view=list');
  const registry = page.getByRole('region', { name: 'Каталог справочников ИС' });
  await expect(registry.getByRole('heading', { name: 'Справочников пока нет' })).toBeVisible();
  await expect(registry.getByRole('group', { name: 'Вид справочников' })).toHaveCount(0);
  await expect(registry.getByRole('table')).toHaveCount(0);
});

test('shows four aligned metadata columns and reaches the last row above pagination at a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(crm);
  const section = page.getByRole('region', { name: 'Справочник CRM' });
  const scroll = section.getByRole('region', { name: 'Таблица метаданных CRM' });
  const table = scroll.getByRole('table');
  await expect(section.getByText('CRM (CRM Dynamics) · TZ-22328')).toBeVisible();
  await expect(section.getByText('Найдено 18 записей · демо')).toBeVisible();
  const fixedHeader = section.locator('[data-scrolled]');
  const frameBorder = () => fixedHeader.evaluate(element => getComputedStyle(element, '::before').border);
  const shadowOpacity = () => fixedHeader.evaluate(element => getComputedStyle(element, '::after').opacity);
  const resultBar = fixedHeader.getByRole('status').locator('..');
  const fixedBox = (await fixedHeader.boundingBox())!;
  const detailHeading = section.getByRole('heading', { name:'Справочник CRM', exact:true }).locator('xpath=ancestor::header');
  const detailHeadingBox = (await detailHeading.boundingBox())!;
  const breadcrumbs = detailHeading.getByRole('navigation', { name:'Хлебные крошки' });
  const breadcrumbRow = (await breadcrumbs.locator('..').boundingBox())!;
  expect(breadcrumbRow.y - (await page.getByRole('main').boundingBox())!.y).toBe(16);
  expect((await detailHeading.getByRole('heading').boundingBox())!.y - breadcrumbRow.y - breadcrumbRow.height).toBe(8);
  await expect(breadcrumbs.getByText('Карточка справочника')).toHaveAttribute('aria-current', 'page');
  await expect(detailHeading.getByRole('link', { name:'К справочникам' })).toBeVisible();
  expect(fixedBox.y - detailHeadingBox.y - detailHeadingBox.height).toBe(16);
  const resultBox = (await resultBar.boundingBox())!;
  const scrollBox = (await scroll.boundingBox())!;
  expect([resultBox.x, resultBox.width]).toEqual([fixedBox.x, fixedBox.width]);
  expect([scrollBox.x, scrollBox.width]).toEqual([fixedBox.x, fixedBox.width]);
  await expect(fixedHeader).toHaveCSS('border-top-width', '0px');
  expect(await frameBorder()).toMatch(/^0px/);
  await expect(fixedHeader).toHaveCSS('border-top-left-radius', '16px');
  await expect(fixedHeader).toHaveCSS('border-top-right-radius', '16px');
  await expect(resultBar).toHaveCSS('border-bottom-width', '1px');
  await expect.poll(shadowOpacity).toBe('0');
  await expect(table.getByRole('columnheader')).toHaveText([
    /Сущность.*Логическое имя/, /Атрибут.*Логическое имя/, 'Связи', 'Опции',
  ]);
  const rows = table.locator('tbody tr');
  await expect(rows).toHaveCount(15);
  const header = table.getByRole('columnheader', { name: 'Опции' });
  await expect(table.locator('thead')).toHaveCSS('position', 'static');
  await expect(header).toHaveCSS('box-shadow', 'none');
  const headerBox = (await header.boundingBox())!;
  expect((await rows.first().boundingBox())!.y - headerBox.y - headerBox.height).toBe(4);
  await expect(rows.first()).toContainText('1 — Продавец');
  await expect(rows.nth(1)).toContainText('Значение по умолчанию');
  await expect(rows.nth(2)).toContainText('1 — Неактивная');
  await expect(section.getByText('Классификация', { exact: true })).toHaveCount(1);
  await expect.poll(() => rows.evaluateAll(nodes =>
    [...new Set(nodes.map(node => Math.round(node.getBoundingClientRect().height)))],
  )).toEqual([76]);
  await expect.poll(() => rows.evaluateAll(nodes => {
    const first = nodes[0].getBoundingClientRect();
    const second = nodes[1].getBoundingClientRect();
    return second.top - first.bottom;
  })).toBe(4);
  await scroll.evaluate(node => { node.scrollTop = node.scrollHeight; node.scrollLeft = node.scrollWidth; });
  await expect(rows.last()).toBeInViewport();
  const scrollOffset = await scroll.evaluate(node => node.scrollTop);
  expect(scrollOffset).toBeGreaterThan(0);
  await expect(breadcrumbs).toBeHidden();
  await expect.poll(() => fixedHeader.boundingBox()).toEqual({ ...fixedBox, y:fixedBox.y - 32 });
  await expect(fixedHeader).toHaveCSS('border-bottom-left-radius', '16px');
  await expect(fixedHeader).toHaveCSS('border-bottom-right-radius', '16px');
  const rowBorder = await rows.first().getByRole('cell').first().evaluate(element => getComputedStyle(element).borderTop);
  await expect.poll(frameBorder).toBe(rowBorder);
  await expect.poll(shadowOpacity).toBe('1');
  expect(await fixedHeader.evaluate(element => getComputedStyle(element, '::after').boxShadow))
    .toBe('rgba(16, 29, 59, 0.24) 0px 10px 20px -7px');
  await expect.poll(async () => (await header.boundingBox())!.y - (await scroll.boundingBox())!.y).toBeLessThan(0);
  await expect(header).toHaveCSS('box-shadow', 'none');
  const pagination = section.getByRole('navigation', { name: 'Страницы справочника CRM' });
  const lastRow = (await rows.last().boundingBox())!;
  expect(lastRow.y + lastRow.height).toBeLessThan((await pagination.boundingBox())!.y);
  await section.getByRole('button', { name: 'Скрыть поиск', exact: true }).click();
  await expect(table.locator('thead')).toHaveCSS('position', 'sticky');
  await expect.poll(async () => (await header.boundingBox())!.y - (await scroll.boundingBox())!.y).toBeCloseTo(0, 0);
  await expect(header).toHaveCSS('box-shadow', 'rgb(226, 228, 234) 0px -1px 0px 0px inset');
  await expect(fixedHeader).toHaveAttribute('data-scrolled', 'true');
  await expect.poll(shadowOpacity).toBe('0');
  await expect.poll(frameBorder).toMatch(/^0px/);
  await expect(fixedHeader).toHaveCSS('border-radius', '16px 16px 0px 0px');
  await expect(resultBar).toHaveCSS('border-top-width', '0px');
  await expect(resultBar).toHaveCSS('border-bottom-width', '1px');
  await expect(resultBar).toHaveCSS('padding-block', '12px');
  expect(await resultBar.evaluate(element => getComputedStyle(element, '::before').content)).toBe('none');
  await scroll.evaluate(node => { node.scrollTop = 0; });
  await expect(header).toHaveCSS('box-shadow', 'none');
  await scroll.evaluate(node => { node.scrollTop = 20; });
  await expect(header).toHaveCSS('box-shadow', 'rgb(226, 228, 234) 0px -1px 0px 0px inset');
  await section.getByRole('button', { name: 'Показать поиск', exact: true }).click();
  await expect(table.locator('thead')).toHaveCSS('position', 'static');
  await expect(header).toHaveCSS('box-shadow', 'none');
  await scroll.evaluate(node => { node.scrollTop = 0; });
  await expect.poll(shadowOpacity).toBe('0');
  await expect.poll(frameBorder).toMatch(/^0px/);
  await expect(fixedHeader).toHaveCSS('border-bottom-left-radius', '0px');
  await expect(breadcrumbs).toBeVisible();
  await section.getByRole('link', { name: 'К справочникам' }).click();
  await expect(page).toHaveURL(catalog);
});

test('leaves adjacent sections and global search available', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(crm);
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  const query = page.getByRole('combobox', { name: 'Поиск по каталогу' });
  await query.click();
  const search = page.getByRole('dialog', { name: 'Поиск по каталогу' });
  await expect(search.getByRole('button', { name: 'Отчёты', exact: true })).toBeVisible();
  await expect(search.getByRole('button', { name: 'Источники', exact: true })).toBeVisible();
  await expect(search.getByRole('button', { name: 'Справочники ИС', exact: true })).toBeVisible();
  await query.press('Escape');

  const nav = page.getByRole('navigation', { name: 'Разделы каталога' });
  await nav.getByRole('button', { name: 'Отчёты', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Таблица отчётов', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Карточный вид', exact: true })).toBeVisible();
  await nav.getByRole('button', { name: 'Источники', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Каталог источников', exact: true })).toBeVisible();
  await nav.getByRole('button', { name: 'Справочники ИС', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Каталог справочников ИС' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('applies each CRM criterion with an empty local query and combines nonempty conditions', async ({ page }) => {
  await page.goto(crm);
  const workspace = page.getByRole('region', { name: 'Справочник CRM' });
  await workspace.getByRole('checkbox', { name: 'Без пагинации' }).check();
  const panel = workspace.getByRole('region', { name: 'Панель поиска CRM' });
  const rows = workspace.getByRole('table').locator('tbody tr');
  const status = workspace.getByRole('status');
  const apply = panel.getByRole('button', { name: 'Применить', exact: true });
  const reset = panel.getByRole('button', { name: 'Сбросить', exact: true });
  const query = panel.getByRole('searchbox', { name: 'Поиск в справочнике CRM' });
  const criteria = [
    ['Отображаемое имя сущности', '  КОНТАКТ ', 6],
    ['Отображаемое имя атрибута', 'Категория', 1],
    ['Логическое имя сущности', 'account', 12],
    ['Логическое имя атрибута', ' INDUSTRYCODE ', 1],
    ['Поиск по связям', 'contactid', 1],
    ['Поиск по опциям', '100000001', 1],
  ] as const;

  for (const [name, value, count] of criteria) {
    await panel.getByRole('textbox', { name, exact: true }).fill(value);
    await expect(query).toHaveValue('');
    await expect(rows).toHaveCount(18);
    await expect(status).toHaveText('Найдено 18 записей · до применения изменений');
    await apply.click();
    await expect(rows).toHaveCount(count);
    await expect(status).not.toContainText('до применения изменений');
    await reset.click();
    await expect(rows).toHaveCount(18);
  }

  await query.fill('Продавец');
  await panel.getByRole('textbox', { name: 'Отображаемое имя сущности' }).fill('Контакт');
  await apply.click();
  await expect(status).toContainText('Найдено 0 записей');
  await expect(workspace.getByText('По выбранным условиям ничего не найдено.')).toBeVisible();
  await panel.getByRole('textbox', { name: 'Отображаемое имя сущности' }).fill('Организация');
  await apply.click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Категория');

  await query.fill('zz-crm-no-match');
  await panel.getByRole('button', { name: 'Свернуть параметры поиска' }).click();
  await apply.click();
  const empty = workspace.getByText('По выбранным условиям ничего не найдено.');
  await expect(empty).toBeVisible();
  await reset.click();
  await expect(empty).toHaveCount(0);
  await expect(query).toHaveValue('');
  await expect(status).toHaveText('Найдено 18 записей · демо');
  await expect(rows).toHaveCount(18);
});

test('keeps the exact-code and PK switches independent and resets draft and applied values together', async ({ page }) => {
  await page.goto(crm);
  const workspace = page.getByRole('region', { name: 'Справочник CRM' });
  await workspace.getByRole('checkbox', { name: 'Без пагинации' }).check();
  const panel = workspace.getByRole('region', { name: 'Панель поиска CRM' });
  const rows = workspace.getByRole('table').locator('tbody tr');
  const status = workspace.getByRole('status');
  const apply = panel.getByRole('button', { name: 'Применить', exact: true });
  const exact = panel.getByRole('button', { name: 'Точное совпадение по коду сущности', exact: true });
  const pk = panel.getByRole('button', { name: 'Только PK', exact: true });
  const logicalName = panel.getByRole('textbox', { name: 'Логическое имя сущности', exact: true });

  await exact.click();
  await pk.click();
  await expect(exact).toHaveAttribute('aria-pressed', 'true');
  await expect(pk).toHaveAttribute('aria-pressed', 'true');
  await expect(exact.locator('[data-selection-check]')).toBeVisible();
  await expect(pk.locator('[data-selection-check]')).toBeVisible();
  await expect(rows).toHaveCount(18);
  await apply.click();
  await expect(rows).toHaveCount(2);
  await expect(rows).toContainText(['Идентификатор организации', 'Идентификатор контакта']);

  await logicalName.fill('acc');
  await apply.click();
  await expect(rows).toHaveCount(0);
  await exact.click();
  await expect(pk).toHaveAttribute('aria-pressed', 'true');
  await apply.click();
  await expect(rows).toHaveCount(1);

  await logicalName.fill('ACCOUNT');
  await exact.click();
  await panel.getByRole('searchbox').fill('accountid');
  await apply.click();
  await expect(rows).toHaveCount(1);
  await panel.getByRole('textbox', { name: 'Поиск по опциям' }).fill('Черновик');
  await panel.getByRole('button', { name: 'Сбросить', exact: true }).click();
  await expect(exact).toHaveAttribute('aria-pressed', 'false');
  await expect(pk).toHaveAttribute('aria-pressed', 'false');
  await expect(panel.locator('[data-selection-check]')).toHaveCount(0);
  await expect(panel.getByRole('searchbox')).toHaveValue('');
  for (const input of await panel.getByRole('textbox').all()) await expect(input).toHaveValue('');
  await expect(rows).toHaveCount(18);
  await expect(status).toHaveText('Найдено 18 записей · демо');
  await expect(workspace.getByRole('checkbox', { name: 'Без пагинации' })).toBeChecked();
});

test('restores expanded and compact search with unapplied values after hiding it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(crm);
  const workspace = page.getByRole('region', { name: 'Справочник CRM' });
  const panel = workspace.getByRole('region', { name: 'Панель поиска CRM' });
  const hide = workspace.getByRole('button', { name: 'Скрыть поиск', exact: true });
  const show = workspace.getByRole('button', { name: 'Показать поиск', exact: true });
  const collapse = panel.getByRole('button', { name: 'Свернуть параметры поиска' });
  const expand = panel.getByRole('button', { name: 'Развернуть параметры поиска' });
  const query = panel.getByRole('searchbox');
  const attribute = panel.getByRole('textbox', { name: 'Отображаемое имя атрибута', exact: true });
  const status = workspace.getByRole('status');

  await attribute.fill('Категория');
  await query.fill('Продавец');
  await hide.press('Enter');
  await expect(show).toBeFocused();
  await expect(panel).toHaveCount(0);
  await expect(status).toHaveText('Найдено 18 записей · до применения изменений');
  await expect(workspace.getByRole('button', { name: 'Сбросить все фильтры: 2 атрибута' })).toHaveText('2');
  const fixedHeader = workspace.locator('[data-search-hidden]');
  await expect(fixedHeader).toHaveCSS('border-radius', '16px 16px 0px 0px');
  await expect.poll(async () => (await show.boundingBox())!.y - (await fixedHeader.boundingBox())!.y)
    .toBeCloseTo(12, 0);

  await show.press('Enter');
  await expect(attribute).toHaveValue('Категория');
  await expect(query).toHaveValue('Продавец');
  const headerActions = panel.locator('[data-visible]');
  await expect(headerActions).toHaveCSS('width', '0px');
  await expect(headerActions).toHaveCSS('transition-property', 'grid-template-columns, opacity');
  await collapse.click();
  await expect(headerActions).toHaveCSS('opacity', '1');
  await expect(headerActions.getByRole('button', { name: 'Применить' })).toBeVisible();
  await expect(panel.getByRole('textbox')).toHaveCount(0);
  const summary = panel.getByRole('list', { name: 'Текстовые условия поиска' });
  await expect(summary.getByRole('listitem')).toHaveText('Атрибут: Категория');
  await expect(summary.getByRole('button', { name: 'Атрибут: Категория', exact: true })).toBeVisible();
  const switches = panel.getByRole('group', { name: 'Условия поиска' });
  const switchesBox = (await switches.boundingBox())!;
  expect(switchesBox.x + switchesBox.width).toBeLessThan((await summary.boundingBox())!.x);

  await hide.click();
  await expect(panel).toHaveCount(0);
  await show.click();
  await expect(expand).toBeVisible();
  await expect(summary).toContainText('Атрибут: Категория');
  await expect(query).toHaveValue('Продавец');
  await panel.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(status).toHaveText('Найдена 1 запись · демо');
  await expand.click();
  await expect(attribute).toHaveValue('Категория');
});

test('hidden CRM search counts applied and draft fields once and clears them without reopening', async ({ page }) => {
  await page.goto(crm);
  const workspace = page.getByRole('region', { name: 'Справочник CRM' });
  const panel = workspace.getByRole('region', { name: 'Панель поиска CRM' });
  const query = panel.getByRole('searchbox');
  const apply = panel.getByRole('button', { name: 'Применить', exact: true });
  const hide = workspace.getByRole('button', { name: 'Скрыть поиск', exact: true });
  const show = workspace.getByRole('button', { name: 'Показать поиск', exact: true });
  const clear = workspace.getByRole('button', { name: /^Сбросить все фильтры:/ });
  const status = workspace.getByRole('status');

  await query.fill('Продавец');
  await panel.getByRole('textbox', { name: 'Отображаемое имя атрибута', exact: true }).fill('Категория');
  await apply.click();
  await expect(status).toHaveText('Найдена 1 запись · демо');
  await expect(clear).toHaveCount(0);
  await panel.getByRole('button', { name: 'Свернуть параметры поиска' }).click();
  await query.fill('Организация');
  await panel.getByRole('button', { name: 'Только PK', exact: true }).click();
  await hide.click();
  await expect(show).toHaveAttribute('aria-expanded', 'false');
  await expect(clear).toHaveAccessibleName('Сбросить все фильтры: 3 атрибута');
  await expect(clear).toHaveText('3');
  await expect(clear).toHaveCSS('background-color', 'rgb(0, 123, 252)');
  await clear.hover();
  await expect(clear).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await clear.click();
  await expect(status).toHaveText('Найдено 18 записей · демо');
  await expect(clear).toHaveCount(0);
  await expect(show).toBeFocused();
  await expect(panel).toHaveCount(0);

  await show.press('Enter');
  await expect(query).toHaveValue('');
  await expect(panel.getByRole('button', { name: 'Только PK', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await query.fill('Продавец');
  await apply.click();
  await query.fill('');
  await hide.press('Enter');
  await expect(clear).toHaveAccessibleName('Сбросить все фильтры: 1 атрибут');
  await show.press('Tab');
  await expect(clear).toBeFocused();
  await expect(clear).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await clear.press('Enter');
  await expect(show).toBeFocused();
  await expect(clear).toHaveCount(0);
});

test('keeps one anchored chip editor through empty and long input, cancel and switching chips', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(crm);
  const panel = page.getByRole('region', { name: 'Панель поиска CRM' });
  const workspace = page.getByRole('region', { name: 'Справочник CRM' });
  const entity = 'Отображаемое имя сущности';
  const attribute = 'Отображаемое имя атрибута';
  await panel.getByRole('textbox', { name: entity, exact: true }).fill('Организация');
  await panel.getByRole('textbox', { name: attribute, exact: true }).fill('Название');
  await panel.getByRole('button', { name: 'Свернуть параметры поиска' }).click();
  const chip = (key: string) => panel.locator(`[data-crm-chip-action="${key}"]`);
  const editor = page.getByRole('dialog', { name: `Редактор условия «${entity}»` });
  const field = editor.getByRole('textbox', { name: entity, exact: true });

  await chip('entityName').press('Enter');
  await expect(field).toBeFocused();
  await field.fill('');
  await expect(field).toBeFocused();
  await expect(chip('entityName')).toHaveAttribute('aria-expanded', 'true');
  await page.setViewportSize({ width: 1024, height: 768 });
  await field.fill('Контакт '.repeat(40));
  await expect(field).toBeFocused();
  await expect(chip('entityName')).toHaveAttribute('aria-expanded', 'true');
  await field.press('Escape');
  await expect(editor).toHaveCount(0);
  await expect(chip('entityName')).toHaveText('Сущность: Организация');
  await expect(chip('entityName')).toBeFocused();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await chip('entityName').click();
  await field.fill('Контакт');
  await chip('attributeName').click();
  const second = page.getByRole('dialog', { name: `Редактор условия «${attribute}»` });
  await expect(second.getByRole('textbox')).toBeFocused();
  await expect(chip('entityName')).toHaveText('Сущность: Контакт');
  await second.getByRole('textbox').fill('Фамилия');
  await second.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(second).toHaveCount(0);
  await expect(chip('attributeName')).toHaveText('Атрибут: Название');

  await chip('attributeName').click();
  await second.getByRole('textbox').fill('Имя');
  await workspace.getByRole('heading', { name: 'Справочник CRM', exact: true }).click();
  await expect(second).toHaveCount(0);
  await expect(chip('attributeName')).toHaveText('Атрибут: Имя');
  await chip('attributeName').click();
  await second.getByRole('textbox').fill('Фамилия');
  await chip('attributeName').click();
  await expect(second).toHaveCount(0);
  await expect(chip('attributeName')).toHaveText('Атрибут: Фамилия');

  await chip('attributeName').click();
  await second.getByRole('textbox').fill('Имя');
  await expect(second.getByRole('button')).toHaveText(['Отмена']);
  await panel.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(second).toHaveCount(0);
  const rows = workspace.getByRole('table').locator('tbody tr');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('firstname');

  await panel.getByRole('button', { name: `Удалить условие «${attribute}»`, exact: true }).click();
  await expect(chip('attributeName')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(rows).toHaveCount(1);
  await panel.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(rows).toHaveCount(6);

  const value = 'Организация с полным наименованием для проверки отображения';
  const text = chip('entityName').locator('[data-overflow-text]');
  await expect(text).not.toHaveAttribute('data-overflow-clipped');
  await chip('entityName').click();
  await field.fill(value);
  await workspace.getByRole('heading', { name: 'Справочник CRM', exact: true }).click();
  await expect(panel.locator('[data-crm-chip="entityName"]')).toHaveCSS('width', '240px');
  await expect(text).toHaveCSS('text-overflow', 'ellipsis');
  await expect(text).toHaveAttribute('data-overflow-clipped', 'true');
  const switchChip = panel.getByRole('button', { name: 'Только PK', exact: true });
  const typography = (element: Element) => {
    const { fontFamily, fontSize, fontWeight, lineHeight } = getComputedStyle(element);
    return { fontFamily, fontSize, fontWeight, lineHeight };
  };
  expect(await text.evaluate(typography)).toEqual(await switchChip.evaluate(typography));
  await text.hover();
  await expect(page.getByRole('tooltip')).toHaveText(value);
  await page.screenshot({ path: testInfo.outputPath('compact-criteria-tooltip.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(panel.locator('[data-crm-chip="entityName"]')).toHaveCSS('width', '240px');
  await expect(text).toHaveAttribute('data-overflow-clipped', 'true');
});

test('measures overflow, anchors the direct editor correctly and edits within one overflow surface', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(crm);
  const panel = page.getByRole('region', { name: 'Панель поиска CRM' });
  const criteria = [
    ['Отображаемое имя сущности', 'Организация'],
    ['Отображаемое имя атрибута', 'Категория'],
    ['Логическое имя сущности', 'account'],
    ['Логическое имя атрибута', 'accountcategorycode'],
    ['Поиск по связям', 'Организация'],
    ['Поиск по опциям', 'Продавец'],
  ];
  for (const [name, value] of criteria) await panel.getByRole('textbox', { name, exact: true }).fill(value);
  await panel.getByRole('button', { name: 'Свернуть параметры поиска' }).click();
  const visible = panel.locator('[data-crm-chip]');
  const firstChip = panel.locator('[data-crm-chip-action="entityName"]');
  const counter = panel.locator('[data-crm-overflow]');
  await expect(counter).toHaveText('Ещё 4');
  const chipFont = await firstChip.evaluate(element => getComputedStyle(element).font);
  await expect(counter).toHaveCSS('font', chipFont);
  await expect(visible).toHaveCount(2);
  await expect(visible.nth(1)).toHaveAttribute('data-crm-chip', 'entityLogicalName');
  expect(await counter.innerText()).toBe(`Ещё ${6 - await visible.count()}`);

  await firstChip.click();
  const direct = page.getByRole('dialog', { name: /Редактор условия/ });
  await expect(direct).toBeVisible();
  const firstChipBox = (await firstChip.boundingBox())!;
  const directBox = (await direct.boundingBox())!;
  expect(directBox.x).toBeCloseTo(firstChipBox.x - 1, 0);
  expect(directBox.width).toBe(360);
  await direct.getByRole('textbox').press('Escape');

  await counter.press('Enter');
  const overflow = page.getByRole('dialog', { name: 'Скрытые условия поиска', exact: true });
  await expect(overflow).toBeVisible();
  await expect(overflow).toHaveCSS('width', '336px');
  const counterBox = (await counter.boundingBox())!;
  const overflowBox = (await overflow.boundingBox())!;
  expect(overflowBox.x + overflowBox.width).toBeCloseTo(counterBox.x + counterBox.width, 0);
  await expect(overflow.getByRole('listitem')).toHaveCount(6 - await visible.count());
  const item = overflow.locator('[data-crm-hidden-edit]').first();
  const row = overflow.getByRole('listitem').first();
  await item.hover();
  await expect(row).toHaveCSS('background-color', 'rgb(243, 244, 249)');
  await page.screenshot({ path: testInfo.outputPath('compact-criteria-overflow-hover.png'), animations: 'disabled' });
  await counter.hover();
  await expect(row).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const name = (await item.locator('span').first().innerText()).trim();
  const original = (await item.locator('span').last().innerText()).trim();
  await expect(item).toBeFocused();
  await item.press('Enter');
  const inline = overflow.getByRole('textbox', { name, exact: true });
  await expect(inline).toBeFocused();
  await inline.fill('');
  await page.setViewportSize({ width: 1920, height: 1000 });
  await expect(inline).toBeFocused();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(overflow.getByRole('button', { name: 'Отмена', exact: true })).toHaveCSS('height', '40px');
  await expect(inline).toHaveCSS('height', '40px');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await inline.press('Escape');
  await expect(overflow).toBeVisible();
  await expect(overflow.getByRole('button', { name: new RegExp(original) }).first()).toBeFocused();
  await expect(overflow).toContainText(original);
  await page.keyboard.press('Escape');
  await expect(overflow).toHaveCount(0);
  await expect(counter).toBeFocused();
});

test('removes a hidden condition and applies the current inline value with one click', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(crm);
  const workspace = page.getByRole('region', { name: 'Справочник CRM' });
  const panel = workspace.getByRole('region', { name: 'Панель поиска CRM' });
  const rows = workspace.getByRole('table').locator('tbody tr');
  await panel.getByRole('textbox', { name: 'Отображаемое имя сущности', exact: true }).fill('Организация');
  await panel.getByRole('textbox', { name: 'Отображаемое имя атрибута', exact: true }).fill('Категория');
  await panel.getByRole('textbox', { name: 'Логическое имя сущности', exact: true }).fill('account');
  await panel.getByRole('textbox', { name: 'Поиск по опциям', exact: true }).fill('неизвестное значение');
  await panel.getByRole('button', { name: 'Свернуть параметры поиска' }).click();
  const counter = panel.locator('[data-crm-overflow]');
  await counter.click();
  const overflow = page.getByRole('dialog', { name: 'Скрытые условия поиска', exact: true });
  const before = await overflow.getByRole('listitem').count();
  await overflow.getByRole('button', { name: 'Удалить условие «Отображаемое имя атрибута»', exact: true }).click();
  await expect(overflow.getByRole('listitem')).toHaveCount(before - 1);
  await expect(overflow.getByRole('textbox')).toHaveCount(0);
  await overflow.getByRole('button', { name: /Поиск по опциям.*неизвестное значение/ }).click();
  await overflow.getByRole('textbox', { name: 'Поиск по опциям', exact: true }).fill('Продавец');
  await expect(rows).toHaveCount(15);
  await panel.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(overflow).toHaveCount(0);
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('accountcategorycode');
});

test('expands complete option lists and toggles eligible rows only on the current page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(crm);
  const workspace = page.getByRole('region', { name: 'Справочник CRM' });
  const table = workspace.getByRole('table', { name: 'Метаданные CRM' });
  const rows = table.locator('tbody tr');
  const options = rows.first().getByRole('list', { name: 'Значения опций' });
  const expandAll = table.getByRole('button', { name: 'Раскрыть опции на странице' });
  const collapseAll = table.getByRole('button', { name: 'Свернуть опции на странице' });
  const pager = workspace.getByRole('navigation', { name: 'Страницы справочника CRM' });
  await expect(options.getByRole('listitem')).toHaveText(['1 — Продавец']);
  await expect(rows.nth(1).getByRole('listitem')).toHaveText(['1 — Значение по умолчанию']);
  await expect(rows.nth(2).getByRole('listitem')).toHaveText(['0 — Активная', '1 — Неактивная']);
  await expect(rows.nth(1).getByRole('button')).toHaveCount(0);
  await expect(rows.nth(2).getByRole('button')).toHaveCount(0);

  const header = table.getByRole('columnheader', { name: 'Опции' });
  await expect(header.locator('div')).toHaveCSS('gap', '12px');
  await rows.first().getByRole('button', { name: 'Ещё 7 значений' }).press('Enter');
  await expect(options.getByRole('listitem')).toHaveText([
    '1 — Продавец', '2 — Стандартный', '3 — Банк', '4 — Агент', '5 — Регистратор', '6 — СК',
    '100000000 — Лидген', '100000001 — ЗПИФ застройщик',
  ]);
  await expect.poll(async () => (await rows.first().boundingBox())!.height).toBeGreaterThan(76);
  await collapseAll.click();
  await expect(table.locator('tr[data-options-expanded="true"]')).toHaveCount(0);
  await expandAll.click();
  await expect(table.locator('tr[data-options-expanded="true"]')).toHaveCount(3);
  await rows.first().getByRole('button', { name: 'Свернуть', exact: true }).click();
  await expect(options.getByRole('listitem')).toHaveCount(1);
  await expect(collapseAll).toBeVisible();
  await pager.getByRole('button', { name: '2', exact: true }).click();
  await expect(table.locator('tr[data-options-expanded="true"]')).toHaveCount(0);
  await expect(expandAll).toBeEnabled();
  await expect(rows.first().getByRole('cell').last()).toHaveText('—');
  await expect(rows.first().getByRole('button')).toHaveCount(0);
  await expandAll.click();
  await expect(table.locator('tr[data-options-expanded="true"]')).toHaveCount(1);
  await expect(rows.nth(1).getByRole('listitem')).toHaveCount(3);
});

test('animates the option row height through either control and respects reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(crm);
  const table = page.getByRole('table', { name: 'Метаданные CRM' });
  const rowControl = 'tbody tr:first-child td:last-child button';
  const headerControl = 'thead th:last-child button';
  const sample = (control: string) => table.evaluate(async (node, selector) => {
    const row = node.querySelector('tbody tr')!;
    const height = () => row.getBoundingClientRect().height;
    const start = height();
    node.querySelector<HTMLButtonElement>(selector)!.click();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const animations = row.getAnimations({ subtree: true });
    const gridTransition = animations.find(animation =>
      animation instanceof CSSTransition && animation.transitionProperty === 'grid-template-rows');
    const duration = Number(gridTransition?.effect?.getComputedTiming().duration ?? 0);
    for (const animation of animations) {
      animation.pause();
      animation.currentTime = duration / 2;
    }
    const middle = height();
    for (const animation of animations) animation.finish();
    return { start, middle, end: height(), duration };
  }, control);

  for (const [open, close] of [[rowControl, headerControl], [headerControl, rowControl]]) {
    const expansion = await sample(open);
    expect(expansion.duration).toBe(320);
    expect(expansion.middle).toBeGreaterThan(expansion.start);
    expect(expansion.middle).toBeLessThan(expansion.end);
    const collapse = await sample(close);
    expect(collapse.duration).toBe(expansion.duration);
    expect(collapse.start).toBe(expansion.end);
    expect(collapse.middle).toBeLessThan(collapse.start);
    expect(collapse.middle).toBeGreaterThan(collapse.end);
    expect(collapse.end).toBe(expansion.start);
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await sample(rowControl);
  expect(reduced.duration).toBe(0);
  expect(reduced.end).toBeGreaterThan(reduced.start);
  expect(reduced.middle).toBe(reduced.end);
});

test('uses fifteen-row pages, resets presentation on Apply and removes the footer in all-records mode', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(crm);
  const workspace = page.getByRole('region', { name: 'Справочник CRM' });
  const panel = workspace.getByRole('region', { name: 'Панель поиска CRM' });
  const pager = workspace.getByRole('navigation', { name: 'Страницы справочника CRM' });
  const scroll = workspace.getByRole('region', { name: 'Таблица метаданных CRM' });
  const rows = workspace.getByRole('table').locator('tbody tr');
  const withoutPages = workspace.getByRole('checkbox', { name: 'Без пагинации' });
  await expect(rows).toHaveCount(15);
  await expect(pager).toContainText('1–15 из 18 · 15 на странице');
  await expect(pager.getByRole('button', { name: 'Предыдущая страница' })).toBeDisabled();
  await pager.getByRole('button', { name: 'Следующая страница' }).click();
  await expect(pager).toContainText('16–18 из 18 · 15 на странице');
  await expect(pager.getByRole('button', { name: 'Следующая страница' })).toBeDisabled();
  await expect(rows.last()).toContainText('emailaddress1');
  await rows.nth(1).getByRole('button', { name: 'Ещё 2 значения' }).click();
  await expect(scroll).toHaveCSS('padding-bottom', '80px');
  await expect.poll(() => rows.nth(1).evaluate(row => row.getAnimations({ subtree: true }).length)).toBe(0);
  await scroll.evaluate(node => { node.scrollTop = node.scrollHeight; });
  const last = (await rows.last().boundingBox())!;
  expect(last.y + last.height).toBeLessThan((await pager.boundingBox())!.y);

  await panel.getByRole('textbox', { name: 'Отображаемое имя сущности' }).fill('Организация');
  await expect(pager).toContainText('16–18 из 18');
  await panel.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(pager).toHaveCount(0);
  await expect(rows.locator('button[aria-expanded="true"]')).toHaveCount(0);
  await expect.poll(() => scroll.evaluate(node => node.scrollTop)).toBe(0);
  await rows.first().getByRole('button', { name: 'Ещё 7 значений' }).click();
  await withoutPages.check();
  await expect(rows).toHaveCount(12);
  await expect(pager).toHaveCount(0);
  await expect(scroll).toHaveCSS('padding-bottom', '0px');
  await expect(rows.locator('button[aria-expanded="true"]')).toHaveCount(0);
  await withoutPages.uncheck();
  await expect(rows).toHaveCount(12);
  await expect(pager).toHaveCount(0);
});
