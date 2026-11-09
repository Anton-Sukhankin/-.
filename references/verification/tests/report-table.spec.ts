import { expect, test } from '@playwright/test';

test('sidebar resizing keeps report actions aligned and MAU charts beside their values', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1760, height: 900 });
  await page.goto('/preview/navigation?section=reports&paginationDemo=0');
  const sidebar = page.getByRole('complementary');
  const handle = sidebar.getByRole('separator', { name: 'Ширина боковой панели' });
  const body = page.getByLabel('Прокрутка таблицы отчётов', { exact: true });
  const row = body.locator('[data-table-report-id="demo-report-summary"]');
  await expect(row).toBeVisible();

  const measure = () => body.evaluate(element => {
    const row = element.querySelector('[data-table-report-id="demo-report-summary"]')!;
    const action = row.lastElementChild!.getBoundingClientRect();
    const mau = row.querySelector('[data-mau-trend]')!;
    const values = mau.firstElementChild!.getBoundingClientRect();
    const chart = mau.lastElementChild!.getBoundingClientRect();
    return { rightInset: element.getBoundingClientRect().right - action.right, gap: chart.left - values.right };
  });
  const box = (await handle.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  const drag = [];
  for (const shift of [24, 48, 72, 96, 120]) {
    await page.mouse.move(x + shift, y);
    drag.push(await measure());
  }
  await page.mouse.up();
  await expect(handle).toHaveAttribute('aria-valuenow', '400');
  expect(drag.map(sample => sample.rightInset)).toEqual([0, 0, 0, 0, 0]);

  await body.evaluate(element => { element.scrollLeft = element.scrollWidth; });
  await expect.poll(() => body.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  for (const name of ['Свернуть панель', 'Развернуть панель']) {
    const frames = await sidebar.getByRole('button', { name, exact: true }).evaluate(async button => {
      const body = document.querySelector('[aria-label="Прокрутка таблицы отчётов"]')!;
      const row = body.querySelector('[data-table-report-id="demo-report-summary"]')!;
      const frames: { width: number; inset: number }[] = [];
      (button as HTMLButtonElement).click();
      const start = performance.now();
      while (performance.now() - start < 420) {
        await new Promise(requestAnimationFrame);
        const viewport = body.getBoundingClientRect();
        frames.push({ width: viewport.width, inset: viewport.right - row.lastElementChild!.getBoundingClientRect().right });
      }
      return frames;
    });
    expect(new Set(frames.map(frame => frame.width)).size).toBeGreaterThan(2);
    expect(Math.max(...frames.map(frame => Math.abs(frame.inset)))).toBeLessThanOrEqual(0.05);
  }
  expect([...drag.map(sample => sample.gap), (await measure()).gap]).toEqual([8, 8, 8, 8, 8, 8]);
  const mauCells = body.locator('[data-mau-trend]').filter({ has: page.locator('img') });
  const chartInsets = await mauCells.evaluateAll(cells => cells.map(cell =>
    cell.lastElementChild!.getBoundingClientRect().left - cell.getBoundingClientRect().left));
  expect(chartInsets.length).toBeGreaterThan(1);
  expect(chartInsets.every(inset => inset === 64)).toBe(true);
});

test('the report table header divider spans the full surface while scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 620 });
  await page.goto('/preview/navigation?section=reports');
  const surface = page.getByRole('region', { name: 'Таблица отчётов', exact: true });
  const header = surface.getByRole('rowgroup').filter({ has: page.getByRole('columnheader', { name: 'Действия' }) });
  const body = surface.getByLabel('Прокрутка таблицы отчётов', { exact: true });
  const divider = () => header.evaluate(element => {
    const line = getComputedStyle(element, '::after');
    return { width:parseFloat(line.width), border:line.borderBottom, bottom:line.bottom };
  });
  const box = (await surface.boundingBox())!;
  const expected = { width:box.width, border:'1px solid rgb(226, 228, 234)', bottom:'0px' };
  expect(await divider()).toEqual(expected);
  const firstGroup = body.getByRole('button', { name: /Гостеприимство/ }).first();
  const initialHeader = (await header.boundingBox())!;
  expect((await firstGroup.boundingBox())!.y - initialHeader.y - initialHeader.height).toBe(8);
  expect((await body.boundingBox())!.y).toBe(initialHeader.y + initialHeader.height);

  const position = await body.evaluate(element => {
    element.scrollTop = 100;
    element.scrollLeft = element.scrollWidth;
    return { x:element.scrollLeft, y:element.scrollTop };
  });
  expect(position.x).toBeGreaterThan(0);
  expect(position.y).toBeGreaterThan(0);
  await expect(surface).toHaveAttribute('data-table-scrolled', 'true');
  expect(await divider()).toEqual(expected);
});

test('report table preserves the documented fixed edges and scrolls real records', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text()); });
  await page.goto('/preview/navigation?tableCase=legacy-two-pages');
  const reports = page.getByRole('navigation', { name: 'Разделы каталога' }).getByRole('button', { name: 'Отчёты', exact: true });
  await reports.click();
  const surface = page.getByRole('region', { name: 'Таблица отчётов', exact: true });
  const body = surface.getByLabel('Прокрутка таблицы отчётов', { exact: true });
  const first = surface.locator('[data-table-report-id="demo-report-summary"]');
  const rowCells = first.getByRole('cell');
  await expect(first).toBeVisible();
  await expect(first.locator('img[src*="chart-summary"]')).toHaveJSProperty('width', 56);
  expect(await surface.boundingBox()).toEqual({ x: 296, y: 120, width: 1120, height: 780 });
  expect(await body.boundingBox()).toEqual({ x: 312, y: 168, width: 1088, height: 732 });
  expect(await first.boundingBox()).toEqual({ x: 312, y: 204, width: 1088, height: 80 });
  await expect(surface.locator('[data-table-report-id]')).toHaveCount(8);
  await expect(surface.getByRole('columnheader')).toHaveCount(8);
  const firstStart = await rowCells.first().boundingBox();
  const editStart = await rowCells.last().boundingBox();
  expect(firstStart?.width).toBe(360);
  expect(editStart?.width).toBe(64);
  expect((await first.getByRole('button', { name: 'Открыть отчёт «Сводный отчёт Гостеприимства»' }).boundingBox())?.width).toBe(359);
  await expect(surface).toHaveAttribute('data-table-scrolled', 'false');
  await expect(rowCells.first()).toHaveCSS('box-shadow', 'none');
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(1200, 100);
  await page.screenshot({ path: 'verification/current/table/start.png', fullPage: false });
  await first.screenshot({ path: 'verification/current/table/row-default.png' });
  await body.hover({ position: { x: 700, y: 300 } });
  await page.mouse.wheel(500, 0);
  await expect(surface).toHaveAttribute('data-table-scrolled', 'true');
  await expect.poll(() => body.evaluate((element) => element.scrollLeft)).toBe(288);
  expect(await rowCells.first().boundingBox()).toEqual(firstStart);
  expect(await rowCells.last().boundingBox()).toEqual(editStart);
  await expect(rowCells.first()).toHaveCSS('box-shadow', 'rgb(226, 228, 234) -1px 0px 0px 0px inset');
  await page.mouse.move(1200, 100);
  await page.screenshot({ path: 'verification/current/table/end.png', fullPage: false });
  await body.hover({ position: { x: 700, y: 300 } });
  await page.mouse.wheel(-500, 0);
  await expect.poll(() => body.evaluate((element) => element.scrollLeft)).toBe(0);
  await expect(surface).toHaveAttribute('data-table-scrolled', 'false');
  await expect(rowCells.first()).toHaveCSS('box-shadow', 'none');
  await first.hover();
  await expect.poll(() => first.evaluate(row => getComputedStyle(row, '::after').borderColor)).toBe('rgb(64, 143, 231)');
  await expect(first.getByText('Сводный отчёт Гостеприимства', { exact: true })).toHaveCSS('color', 'rgb(0, 103, 220)');
  await expect(first.locator('img[src$="document-hover.svg"]')).toBeVisible();
  await first.screenshot({ path: 'verification/current/table/row-hover.png' });
  await first.getByRole('button', { name: 'Редактировать отчёт «Сводный отчёт Гостеприимства»' }).click();
  await expect(page.getByRole('status')).toContainText('Редактирование отчёта');
  await expect(page.locator('[data-report-id]')).toHaveCount(0);
  await rowCells.nth(2).click();
  await expect(page.locator('[data-report-id]')).toHaveAttribute('data-report-id', 'demo-report-summary');
  await reports.click();
  await first.getByRole('button', { name: 'Открыть отчёт «Сводный отчёт Гостеприимства»' }).click();
  await expect(page.locator('[data-report-id]')).toHaveAttribute('data-report-id', 'demo-report-summary');
  await reports.click();
  await surface.getByRole('button', { name: 'Следующая страница', exact: true }).click();
  await expect(surface.locator('[data-table-report-id]')).toHaveCount(1);
  const finance = surface.locator('[data-table-report-id="demo-report-finance-plan"]');
  await expect(finance).toBeVisible();
  await expect(finance.locator('img[src*="chart-finance-plan"]')).toHaveJSProperty('width', 56);
  await expect(surface.getByRole('navigation', { name: 'Страницы отчётов' })).toContainText('9–9 из 9 · 8 на странице');
  await finance.getByRole('button', { name: 'Открыть отчёт «Выполнение плана поступлений»' }).click();
  await expect(page.locator('[data-report-id]')).toHaveAttribute('data-report-id', 'demo-report-finance-plan');
  await expect(page.locator('dl')).toContainText('1С ERP');
  await page.goto('/preview/navigation?tableCase=single-page');
  await reports.click();
  await expect(surface.locator('[data-table-report-id]')).toHaveCount(9);
  await expect(surface).toHaveAttribute('data-pagination-visible', 'false');
  await expect(surface.getByRole('navigation', { name: 'Страницы отчётов' })).toHaveCount(0);
  await surface.locator('[data-table-report-id="demo-report-finance-plan"]').scrollIntoViewIfNeeded();
  await expect(surface.locator('[data-table-report-id="demo-report-finance-plan"]')).toBeInViewport();
  await page.screenshot({ path: 'verification/current/table/single-page.png', fullPage: false });
  await page.setViewportSize({ width: 1920, height: 900 });
  await body.evaluate((element) => { element.scrollTop = 0; });
  const wideFirst = surface.locator('[data-table-report-id="demo-report-summary"]');
  await expect.poll(async () => (await wideFirst.boundingBox())?.width).toBe(1568);
  const widths = await wideFirst.getByRole('cell').evaluateAll((cells) => cells.map((cell) => cell.getBoundingClientRect().width));
  expect(widths).toEqual([360,164,172,212,212,232,152,64]);
  expect(await body.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
  await expect(surface).toHaveAttribute('data-table-scrolled', 'false');
  await page.mouse.move(1500, 100);
  await page.screenshot({ path: 'verification/current/table/wide.png', fullPage: false });
  for (const image of await surface.locator('img:visible').all()) {
    expect(await image.evaluate((element) => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
  }
  expect(errors).toEqual([]);
});
