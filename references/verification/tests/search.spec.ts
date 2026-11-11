import { expect, test, type Page } from '@playwright/test';

function searchControls(page: Page) {
  const field = page.getByRole('combobox', { name: 'Поиск по каталогу' });
  const dropdown = page.getByRole('dialog', { name: 'Поиск по каталогу' });
  const rows = (group: string) => dropdown.getByRole('rowgroup', { name: group, exact: true })
    .getByRole('row').filter({ has: page.getByRole('gridcell') });
  const match = page.locator('main [data-catalog-search-match]');
  return { field, dropdown, rows, match };
}

test('Navigator appends results in batches of fifteen and starts over when search conditions change', async ({ page }) => {
  await page.goto('/preview/navigation');
  const { field, dropdown, rows } = searchControls(page);
  const shown = rows('Источники');
  const more = dropdown.getByRole('button', { name: /^Показать ещё/ });
  const results = dropdown.getByRole('grid', { name: 'Результаты поиска' });
  const thumb = page.locator('[data-list-scroll-thumb]');

  await field.fill('date');
  await expect(shown).toHaveCount(15);
  const remaining = Number((await more.innerText()).match(/\d+$/)?.[0]);
  expect(remaining).toBeGreaterThan(0);
  expect(remaining).toBeLessThanOrEqual(15);
  const total = 15 + remaining;
  await expect(dropdown.getByText(`Показано 15 из ${total} результатов`)).toBeVisible();
  await results.evaluate(element => { element.scrollTop = 48; });
  await expect(thumb).toHaveAttribute('data-visible', 'true');
  await expect(thumb).toHaveCSS('opacity', '0');
  const firstBatch = await shown.allTextContents();
  await more.press('Enter');
  await expect(shown).toHaveCount(total);
  expect((await shown.allTextContents()).slice(0, 15)).toEqual(firstBatch);
  await expect(shown.nth(15).getByRole('button').first()).toBeFocused();
  await expect(shown.nth(15)).toBeInViewport();
  await expect(more).toHaveCount(0);
  await expect(dropdown.getByText(`Показано ${total} результатов`)).toBeVisible();

  await dropdown.getByRole('button', { name: 'Источники', exact: true }).click();
  await expect(shown).toHaveCount(15);
  await expect(more).toHaveText(`Показать ещё ${remaining}`);

  await field.fill('a');
  await expect(shown).toHaveCount(15);
  await expect(more).toHaveText('Показать ещё 15');
  await more.click();
  await expect(shown).toHaveCount(30);
  await expect(more).toBeFocused();
  await more.click();
  await expect.poll(() => shown.count()).toBeGreaterThan(30);

  await field.fill('date');
  await expect(shown).toHaveCount(15);
  await expect(more).toHaveText(`Показать ещё ${remaining}`);
});

test('Navigator aligns result highlights with the text of their group heading', async ({ page }) => {
  await page.goto('/preview/navigation');
  const { field, dropdown, rows } = searchControls(page);
  await field.fill('ОТЧЁТ');

  for (const label of ['Отчёты', 'Источники']) {
    const heading = dropdown.getByRole('rowgroup', { name: label, exact: true })
      .getByRole('columnheader').getByText(label, { exact: true });
    const row = rows(label).first();
    await row.hover();
    expect((await row.boundingBox())!.x).toBe((await heading.boundingBox())!.x);
  }

  await field.hover();
  await field.press('ArrowDown');
  const selected = rows('Отчёты').first();
  await expect(selected).toHaveAttribute('aria-selected', 'true');
  await expect(selected).toHaveCSS('background-color', 'rgb(229, 242, 255)');
});

test('search types can be combined before typing and keep their own badge states', async ({ page }) => {
  await page.goto('/preview/navigation');
  const { field, dropdown, rows } = searchControls(page);
  await field.click();
  const reports = dropdown.getByRole('button', { name: 'Отчёты', exact: true });
  const sources = dropdown.getByRole('button', { name: 'Источники', exact: true });
  const dictionary = dropdown.getByRole('button', { name: 'Бизнес-словарь', exact: true });
  const reset = dropdown.getByRole('button', { name: 'Сбросить выбор типов', exact: true });

  await reports.click();
  await sources.press('Space');
  await expect(reports).toHaveAttribute('aria-pressed', 'true');
  await expect(sources).toHaveAttribute('aria-pressed', 'true');
  await expect(reset).toHaveCount(0);
  await field.fill('   ');
  await expect(reset).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Очистить запрос', exact: true })).toHaveCount(0);

  await field.fill('ОТЧЁТ');
  await expect(rows('Отчёты')).toHaveCount(4);
  await expect(rows('Источники')).toHaveCount(2);
  await expect(dictionary.locator('span')).toHaveCSS('background-color', 'rgb(226, 230, 236)');
  await expect(reports.locator('span')).toHaveCSS('background-color', 'rgb(0, 123, 252)');
  await expect(sources.locator('span')).toHaveCSS('background-color', 'rgb(0, 123, 252)');
  await field.fill('created_at');
  await expect(reports.locator('span')).toHaveText('0');
  await expect(reports.locator('span')).toHaveCSS('background-color', 'rgb(0, 123, 252)');
  await expect(reports.locator('span')).toHaveCSS('color', 'rgb(255, 255, 255)');

  await field.fill('ОТЧЁТ');
  await reports.click();
  await expect(rows('Отчёты')).toHaveCount(0);
  await expect(rows('Источники')).toHaveCount(2);
  await reset.click();
  await expect(dropdown.getByRole('button', { pressed: true })).toHaveCount(0);
  await expect(field).toHaveValue('ОТЧЁТ');
  await expect(rows('Отчёты')).toHaveCount(4);
});

test('Navigator follows sidebar order and opens results from the additional sections', async ({ page }) => {
  await page.goto('/preview/navigation');
  const { field, dropdown, rows, match } = searchControls(page);
  const sections = ['Отчёты', 'Метрики и показатели', 'Источники', 'Бизнес-словарь', 'AI Hub', 'Справочники ИС', 'Вопросы и ответы'];
  await field.click();
  const types = dropdown.getByRole('group', { name: 'Типы результатов' });
  await expect(types.getByRole('button')).toHaveCount(sections.length);
  const sidebar = page.getByRole('navigation', { name: 'Разделы каталога' });
  expect((await sidebar.getByRole('button').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label'))))
    .filter(label => label !== null && sections.includes(label))).toEqual(sections);
  for (const [index, section] of sections.entries()) {
    await expect(types.getByRole('button').nth(index)).toHaveAccessibleName(section);
  }
  for (const section of sections.slice(-3)) {
    await types.getByRole('button', { name: section, exact: true }).click();
  }
  await expect(types.getByRole('button', { pressed: true })).toHaveCount(3);

  await field.fill('еженедельную сводку');
  await expect(types.getByRole('button', { name: 'Справочники ИС', exact: true })).toHaveAccessibleDescription('0');
  await rows('AI Hub').getByRole('button', { name: /Файловый ассистент/ }).click();
  await expect(page).toHaveURL(/ai\.solution=failik/);
  await expect(match).toHaveText('еженедельную сводку');
  await page.goBack();
  await expect(types.getByRole('button', { pressed: true })).toHaveCount(3);

  await field.fill('TZ-22328');
  await rows('Справочники ИС').getByRole('button', { name: /Справочник CRM/ }).click();
  await expect(page).toHaveURL(/systems\.reference=crm/);
  await expect(match).toHaveText('TZ-22328');
  await page.goBack();

  await field.fill('недостаточных правах');
  await rows('Вопросы и ответы').getByRole('button', { name: /Как получить доступ к отчёту/ }).click();
  await expect(page.getByRole('button', { name: 'Как получить доступ к отчёту?' })).toHaveAttribute('aria-expanded', 'true');
  await expect(match).toHaveText('недостаточных правах');
  await page.goBack();

  await field.fill('План-Факт продажи');
  await rows('Вопросы и ответы').getByRole('button', { name: /Доступ к отчёту/ }).click();
  await expect(page.getByRole('tab', { name: /Мои вопросы/ })).toHaveAttribute('aria-selected', 'true');
  await expect(match).toHaveText('План-Факт продажи');
  await page.goBack();

  await types.getByRole('button', { name: 'Бизнес-словарь', exact: true }).click();
  await field.fill('Data Governance');
  await rows('Бизнес-словарь').getByRole('button', { name: /Data Governance/ }).click();
  await expect(page.getByRole('tab', { name: /Домены/ })).toHaveAttribute('aria-selected', 'true');
  await expect(match).toHaveText('Data Governance');
});

test('separates report location from passport and preserves the original search controls', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text()); });
  await page.goto('/preview/navigation');
  const { field, dropdown, rows, match } = searchControls(page);
  await field.click();
  await expect(page.getByRole('heading', { name: 'Начните поиск по каталогу' })).toBeVisible();
  const reports = dropdown.getByRole('button', { name: 'Отчёты', exact: true });
  const sources = dropdown.getByRole('button', { name: 'Источники', exact: true });
  await expect(reports).not.toHaveAttribute('aria-describedby');
  expect(await dropdown.boundingBox()).toEqual({ x: 295, y: 44, width: 847, height: 446 });
  await field.fill('ОТЧЁТ');
  await expect(rows('Отчёты')).toHaveCount(4);
  await expect(reports).toHaveAccessibleDescription('4');
  await expect(sources).toHaveAccessibleDescription('2');
  await reports.click();
  await expect(reports).toHaveAttribute('aria-pressed', 'true');
  await expect(dropdown.getByRole('rowgroup')).toHaveCount(1);
  await expect(sources).toHaveAccessibleDescription('2');
  await expect(dropdown.getByRole('group', { name: 'Типы результатов' })).toHaveCSS('height', '104px');
  await dropdown.getByRole('button', { name: 'Сбросить выбор типов' }).click();
  await expect(field).toHaveValue('ОТЧЁТ');

  await field.fill('Сводный');
  const reportRow = rows('Отчёты').filter({ hasText: 'Сводный отчёт Гостеприимства' });
  await expect(reportRow).toHaveCount(1);
  await expect(reportRow.getByRole('button', { name: 'Открыть паспорт «Сводный отчёт Гостеприимства»' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('search-actions.png') });
  await reportRow.getByRole('gridcell').first().getByRole('button').click();
  await expect(dropdown).toHaveCount(0);
  await expect(page.locator('[data-report-id]')).toHaveCount(0);
  await expect(page.locator('[data-table-report-id="demo-report-summary"]')).toContainText('Сводный');
  await expect(match).toHaveText('Сводный');
  await expect(match.locator('..').locator('..')).toBeFocused();

  await field.click();
  await expect(field).toHaveValue('Сводный');
  await expect(reportRow).toHaveAttribute('aria-selected', 'true');
  const locationButton = reportRow.getByRole('gridcell').first().getByRole('button');
  await page.keyboard.press('Tab');
  await expect(locationButton).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(reportRow.getByRole('button', { name: 'Открыть паспорт «Сводный отчёт Гостеприимства»' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dropdown).toHaveCount(0);
  await expect(page.locator('[data-report-id]')).toHaveAttribute('data-report-id', 'demo-report-summary');

  await field.click();
  await field.fill('1с жкх');
  await expect(rows('Отчёты')).toHaveCount(1);
  await rows('Отчёты').getByRole('button', { name: 'Открыть паспорт «Отчёт по дебиторской задолженности»' }).click();
  await expect(page.locator('[data-report-id]')).toHaveAttribute('data-report-id', 'demo-report-debt');
  await expect(page.locator('dl')).toContainText('1С ЖКХ');
  await expect(page.getByText('Отчёт показывает остаток дебиторской задолженности, просроченные суммы и поступившие платежи по объектам.', { exact: true })).toBeVisible();

  await field.click();
  await field.fill('Visiology');
  await expect(rows('Отчёты')).toHaveCount(1);
  await field.press('Escape');
  await expect(dropdown).toHaveCount(0);
  await expect(field).toHaveValue('Visiology');
  await field.click();
  await page.mouse.click(1250, 750);
  await expect(dropdown).toHaveCount(0);
  await expect(field).toHaveValue('Visiology');
  await field.click();
  await field.fill('нет-такого-отчёта');
  await expect(page.getByRole('heading', { name: 'Ничего не найдено' })).toBeVisible();
  await expect(dropdown.locator('button[aria-pressed] span')).toHaveText(Array(7).fill('0'));
  await expect(page.getByRole('button', { name: 'Очистить запрос' }).locator('img')).toHaveCSS('filter', 'grayscale(1)');
  await page.getByRole('button', { name: 'Очистить запрос' }).click();
  await expect(field).toHaveValue('');
  await expect(dropdown).toHaveCount(0);
  await expect(field).toBeFocused();
  expect(errors).toEqual([]);
});

test('finds identical field names in separate sources and reveals the selected field', async ({ page }) => {
  await page.goto('/preview/navigation');
  const { field, dropdown, rows, match } = searchControls(page);
  const sourceFilter = dropdown.getByRole('button', { name: 'Источники', exact: true });
  await field.fill('date');
  await sourceFilter.click();
  const sourceRows = rows('Источники');
  await expect(dropdown.getByRole('rowgroup')).toHaveCount(1);
  await expect(dropdown.getByRole('button', { name: 'Поля источников', exact: true })).toHaveCount(0);
  await expect(sourceRows.getByText('Источник', { exact: true }).first()).toBeVisible();
  await expect(sourceRows.getByText('Поле источника', { exact: true }).first()).toBeVisible();
  await expect(sourceFilter).toHaveAccessibleDescription('19');
  await dropdown.getByRole('button', { name: 'Показать ещё 4' }).click();
  await expect(sourceRows).toHaveCount(19);
  await expect(sourceFilter).toHaveAccessibleDescription(String(await sourceRows.count()));

  await field.fill('created_at');
  const fields = sourceRows.filter({ hasText: 'created_at' });
  await expect(fields.nth(1)).toBeVisible();
  const chosen = fields.filter({ hasText: 'rewedo_crm_production.public.versions' });
  await expect(chosen).toHaveCount(1);
  await expect(chosen.getByRole('button')).toHaveCount(1);
  await chosen.getByRole('button').click();
  await expect(dropdown).toHaveCount(0);
  await expect(page).toHaveURL(/source=source-demo-rewedo-versions/);
  await expect(match).toHaveText('created_at');
  await expect(match).toBeInViewport();
  await expect(match.locator('xpath=ancestor::button')).toBeFocused();
  await page.goBack();
  await expect(dropdown).toBeVisible();
  await expect(field).toHaveValue('created_at');
  await expect(chosen).toHaveAttribute('aria-selected', 'true');
});

test('clearing the Navigator query removes the page highlight without leaving the result', async ({ page }) => {
  await page.goto('/preview/navigation');
  const { field, rows, match } = searchControls(page);
  const result = rows('Источники').filter({ hasText: 'rewedo_crm_production.public.versions' }).getByRole('button');
  await field.fill('created_at');
  await result.click();
  await expect(match).toHaveText('created_at');
  const destination = page.url();
  const fieldRow = page.getByRole('button', { name: /^created_at/ });

  await field.click();
  await field.press('ControlOrMeta+a');
  await field.press('Backspace');
  await expect(field).toHaveValue('');
  await expect(match).toHaveCount(0);
  await expect(page).toHaveURL(destination);
  await expect(fieldRow).toBeVisible();

  await field.fill('created_at');
  await expect(match).toHaveCount(0);
  await result.click();
  await expect(match).toHaveText('created_at');
  await page.getByRole('button', { name: 'Очистить запрос' }).click();
  await expect(field).toBeFocused();
  await expect(match).toHaveCount(0);
  await expect(page).toHaveURL(destination);
  await expect(fieldRow).toBeVisible();

  await page.goBack();
  await expect(match).toHaveCount(0);
  await page.reload();
  await expect(fieldRow).toBeVisible();
  await expect(match).toHaveCount(0);
});

test('shows only the matching words in the glossary definition at two desktop widths', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/preview/navigation');
  const { field, dropdown, rows, match } = searchControls(page);
  await field.fill('денежных средств');
  const term = rows('Бизнес-словарь').filter({ hasText: 'Cash Flow' });
  await expect(term.getByRole('button')).toHaveCount(1);
  await expect(term).toContainText('Определение');
  await term.getByRole('button').click();
  await expect(dropdown).toHaveCount(0);
  await expect(page).toHaveURL(/dictionaryTab=terms/);
  await expect(match).toHaveCount(1);
  await expect(match).toHaveText('денежных средств');
  await expect(match).toBeFocused();
  await expect(match).toBeInViewport();
  await expect(match).toHaveCSS('background-color', 'rgb(0, 107, 207)');
  await expect(match).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(page.getByRole('group', { name: 'Совпадения на странице' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Бизнес-словарь' })).toBeInViewport();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath('highlight-1440.png') });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(match).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('highlight-1920.png') });
});

test('reveals a closed method block and highlights the exact rule', async ({ page }) => {
  await page.goto('/preview/navigation?section=metrics&metric=metric-ebitda');
  const disclosure = page.getByRole('button', { name: /Методика/ }).first();
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  await disclosure.click();
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  const { field, dropdown, rows, match } = searchControls(page);
  await field.fill('начисленную амортизацию');
  const metrics = dropdown.getByRole('button', { name: 'Метрики и показатели', exact: true });
  await metrics.click();
  await expect(metrics).toHaveAccessibleDescription('1');
  await expect(rows('Метрики и показатели')).toHaveCount(1);
  await expect(rows('Метрики и показатели')).toContainText('Блок показателя');
  await rows('Метрики и показатели').getByRole('button').click();
  await expect(dropdown).toHaveCount(0);
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  await expect(match).toHaveText('начисленную амортизацию');
  await expect(match).toBeInViewport();
  await expect(match).toBeFocused();
});

test('routes keyboard selection to the correct report page and handles missing locations', async ({ page }) => {
  await page.goto('/preview/navigation?homeCase=empty-favorites');
  const { field, dropdown, rows, match } = searchControls(page);
  await field.fill('Выполнение плана поступлений');
  await field.press('Enter');
  await expect(dropdown).toBeVisible();
  await field.press('ArrowDown');
  await field.press('Enter');
  await expect(dropdown).toHaveCount(0);
  await expect(match).toHaveText('Выполнение плана поступлений');
  await expect(match).toBeInViewport();
  await field.fill('Статус строительных проектов');
  await rows('Отчёты').getByRole('gridcell').first().getByRole('button').click();
  await expect(dropdown).toBeVisible();
  await expect(dropdown.getByRole('status')).toContainText('Место совпадения пока недоступно');
  await expect(field).toHaveValue('Статус строительных проектов');
  await rows('Отчёты').getByRole('button', { name: 'Открыть паспорт «Статус строительных проектов»' }).click();
  await expect(page.locator('[data-report-id]')).toHaveAttribute('data-report-id', 'demo-report-construction');
});

test('scrolls a matched report attribute past the frozen table columns', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 820 });
  await page.goto('/preview/navigation');
  const { field, dropdown, rows, match } = searchControls(page);
  await field.fill('1С ЖКХ');
  await rows('Отчёты').getByRole('gridcell').first().getByRole('button').click();
  await expect(dropdown).toHaveCount(0);
  await expect(match).toHaveText('1С ЖКХ');
  await expect(match).toBeInViewport({ ratio: 1 });
});

test('steps between matches on the open page without reopening the dropdown', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/preview/navigation');
  const { field, dropdown, rows, match } = searchControls(page);
  await field.fill('компани');
  await rows('Бизнес-словарь').filter({ hasText: 'Cash Flow' }).getByRole('button').click();
  const stepper = page.getByRole('group', { name: 'Совпадения на странице' });
  const previous = stepper.getByRole('button', { name: 'Предыдущее совпадение' });
  const next = stepper.getByRole('button', { name: 'Следующее совпадение' });
  await expect(stepper.getByRole('status')).toHaveText('2 / 4');
  const url = page.url();
  await expect(page.locator('[data-dictionary-term="term-cf"]').locator('mark')).toHaveText('компани');
  await page.screenshot({ path: testInfo.outputPath('page-match-stepper.png') });
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(stepper.getByRole('status')).toHaveText('3 / 4');
  await expect(page.locator('[data-dictionary-term="term-hr"]').locator('mark')).toHaveText('компани');
  await expect(match).toHaveCount(1);
  await next.click();
  await expect(stepper.getByRole('status')).toHaveText('4 / 4');
  await expect(next).toBeDisabled();
  await expect(next).toBeFocused();
  await expect(dropdown).toHaveCount(0);
  await expect(page).toHaveURL(url);
  await previous.click();
  await previous.click();
  await previous.click();
  await expect(stepper.getByRole('status')).toHaveText('1 / 4');
  await expect(page.locator('[data-dictionary-term="term-bcr"]').locator('mark')).toHaveText('компани');
  await expect(previous).toBeDisabled();
  await field.click();
  await expect(dropdown).toBeVisible();
  await expect(stepper).toHaveCount(0);
  await expect(field).toHaveValue('компани');
  await field.press('Escape');
  await expect(stepper.getByRole('status')).toHaveText('1 / 4');
  await page.getByRole('button', { name: 'Очистить запрос' }).click();
  await expect(stepper).toHaveCount(0);
  await expect(match).toHaveCount(0);
  await expect(page).toHaveURL(url);
});

test('steps between separate occurrences inside the same definition', async ({ page }) => {
  await page.goto('/preview/navigation');
  const { field, rows } = searchControls(page);
  await field.fill('или');
  await rows('Бизнес-словарь').filter({ hasText: 'Business Client Response' }).getByRole('button').click();
  const mark = page.locator('[data-dictionary-term="term-bcr"] mark');
  await expect(mark).toHaveText('или');
  expect(await mark.evaluate(node => node.previousSibling?.textContent)).toMatch(/отклик $/);
  await page.getByRole('button', { name: 'Следующее совпадение' }).click();
  await expect(mark).toHaveText('или');
  expect(await mark.evaluate(node => node.previousSibling?.textContent)).toMatch(/услугу $/);
});

test('reveals a clipped source description match in its table row and keeps visible matches compact', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/preview/navigation?section=sources&source.domain=Гостеприимство');
  const { field, dropdown, rows, match } = searchControls(page);
  await field.fill('сравнения результатов');
  const source = rows('Источники').filter({ hasText: 'reportcrm20.dbo.dimdate' });
  await expect(source).toHaveCount(1);
  await expect(source).toContainText('Описание');
  await expect(source).toContainText('SQL Server');
  await source.getByRole('gridcell').first().getByRole('button').click();
  await expect(dropdown).toHaveCount(0);
  const row = page.locator('tr[data-source-id="source-reportcrm-date"]');
  const reveal = row.locator('[data-source-description-expanded]');
  await expect(reveal).toHaveAttribute('data-source-description-expanded', 'true');
  await expect(reveal).toHaveCSS('transition-duration', '0.2s');
  await expect(row.locator('mark')).toHaveText('сравнения результатов');
  await expect(page.locator('[data-source-detail-id]')).toHaveCount(0);
  for (const cell of await row.getByRole('cell').all()) await expect(cell).toHaveCSS('vertical-align', 'top');
  await expect(match).toBeInViewport({ ratio: 1 });
  await expect(match).toBeFocused();
  expect(new URL(page.url()).searchParams.get('source.domain')).toBe('Гостеприимство');
  await page.screenshot({ path: testInfo.outputPath('source-description.png'), animations: 'disabled' });
  await page.goBack();
  await expect(dropdown).toBeVisible();
  await expect(field).toHaveValue('сравнения результатов');

  await field.fill('Календарный');
  await source.getByRole('gridcell').first().getByRole('button').click();
  await expect(page.locator('[data-source-detail-id]')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Найденный источник показан вне текущих фильтров');
  await expect(page.locator('[data-source-id="source-reportcrm-date"]').locator('mark')).toHaveText('Календарный');
  await expect(reveal).toHaveAttribute('data-source-description-expanded', 'false');
  await expect(match).toBeInViewport({ ratio: 1 });
  expect(new URL(page.url()).searchParams.get('source.domain')).toBe('Гостеприимство');
  await field.fill('reportcrm20.dbo.dimdate');
  await source.getByRole('button', { name: 'Открыть паспорт «reportcrm20.dbo.dimdate»' }).click();
  await expect(page.locator('[data-source-detail-id]')).toHaveAttribute('data-source-detail-id', 'source-reportcrm-date');
  await expect(page.getByRole('heading', { name: 'reportcrm20.dbo.dimdate' })).toBeFocused();
  await page.goBack();
  await expect(dropdown).toBeVisible();
  await expect(field).toHaveValue('reportcrm20.dbo.dimdate');
});

test('source cards keep descriptions within five lines even with a Navigator match', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/preview/navigation?section=sources&sourceView=cards');
  const description = page.locator('article[data-source-id="source-reportcrm-date"] [data-search-description]');
  await expect(description).toHaveCSS('-webkit-line-clamp', '5');
  await expect(description).toHaveAttribute('data-overflow-clipped', 'true');
  expect((await description.boundingBox())!.height).toBe(100);
  const { field, rows } = searchControls(page);
  await field.fill('Календарный');
  await rows('Источники').filter({ hasText: 'reportcrm20.dbo.dimdate' }).getByRole('gridcell').first().getByRole('button').click();
  await expect(description.locator('mark')).toHaveText('Календарный');
  expect((await description.boundingBox())!.height).toBe(100);
  await field.fill('сравнения результатов');
  await rows('Источники').filter({ hasText: 'reportcrm20.dbo.dimdate' }).getByRole('gridcell').first().getByRole('button').click();
  await expect(page.locator('[data-source-detail-id="source-reportcrm-date"] mark')).toHaveText('сравнения результатов');
});

test('finds metrics by description and distinguishes indicators with identical titles', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/preview/navigation?section=metrics&metricView=cards&metricStatus=Проверена');
  const { field, dropdown, rows, match } = searchControls(page);
  await field.fill('налогов и амортизации');
  const ebitda = rows('Метрики и показатели').filter({ hasText: 'EBITDA' });
  await expect(ebitda).toContainText('Описание');
  await ebitda.getByRole('gridcell').first().getByRole('button').click();
  await expect(dropdown).toHaveCount(0);
  await expect(page.locator('[data-metric-id="metric-ebitda"]').locator('mark')).toHaveText('налогов и амортизации');
  await expect(match).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('status')).toContainText('Найденный объект показан вне текущих фильтров');
  expect(new URL(page.url()).searchParams.get('metricStatus')).toBe('Проверена');
  await field.fill('Выручка');
  const group = rows('Метрики и показатели').filter({ hasText: 'Выручка' });
  await expect(group.filter({ hasText: 'Блок показателя' }).first()).toBeVisible();
  const results = group.filter({ has: page.getByRole('button', { name: 'Открыть паспорт «Выручка»' }) });
  const byTransfer = results.filter({ hasText: 'по переданным покупателям' });
  const byPayment = results.filter({ hasText: 'по фактически полученным оплатам' });
  await expect(byTransfer).toHaveCount(1);
  await expect(byPayment).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('metric-search-results.png'), animations: 'disabled' });
  await byPayment.getByRole('button', { name: 'Открыть паспорт «Выручка»' }).click();
  await expect(page.locator('[data-metric-detail-id]')).toHaveAttribute('data-metric-detail-id', 'indicator-revenue-2');
  await page.goBack();
  await expect(byTransfer).toBeVisible();
  await byTransfer.getByRole('gridcell').first().getByRole('button').click();
  await expect(page.locator('[data-metric-id="indicator-revenue-1"]').locator('mark')).toHaveText('Выручка');
});

test('opens the metric detail from a clipped list description by keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/preview/navigation?section=metrics&metricView=list');
  const { field, dropdown, rows, match } = searchControls(page);
  await field.fill('аудитом × 100%');
  await expect(rows('Метрики и показатели')).toContainText('Качество классификации обращений');
  await field.press('ArrowDown');
  await field.press('Enter');
  const detail = page.locator('[data-metric-detail-id="indicator-request-quality"]');
  await expect(detail.locator('mark')).toHaveText('аудитом × 100%');
  await expect(detail.getByText(/Доля обращений с корректно выбранной категорией/)).toBeVisible();
  await expect(match).toBeInViewport({ ratio: 1 });
  await page.goBack();
  await expect(dropdown).toBeVisible();
  await expect(field).toHaveValue('аудитом × 100%');
});
