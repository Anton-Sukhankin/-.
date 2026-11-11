import { expect, test } from '@playwright/test';

test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

test('list thumb appears after a vertical wheel scroll and follows the position', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/preview/navigation?section=dictionary');
  const list = page.locator('[data-dictionary-workspace] [data-list-scroll]');
  const thumb = page.locator('[data-list-scroll-thumb]');
  await expect(thumb).toHaveCSS('opacity', '0');
  await expect(thumb).toHaveCSS('transition-property', 'opacity');
  expect(await list.evaluate(element => Math.round(element.getBoundingClientRect().width) - element.clientWidth)).toBe(0);

  const box = (await list.boundingBox())!;
  await page.mouse.move(box.x + 80, box.y + 60);
  await page.mouse.wheel(0, 280);
  await expect.poll(() => list.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await expect(thumb).toHaveAttribute('data-visible', 'true');
  const scrolled = (await thumb.boundingBox())!;
  expect(scrolled.x).toBeGreaterThanOrEqual(box.x + box.width);
  expect(scrolled.x + scrolled.width).toBeLessThan(1440);
  expect(scrolled.width).toBe(3);
  expect(scrolled.y).toBeGreaterThan(box.y);
  await expect(thumb).toHaveCSS('opacity', '0');

  await page.mouse.move(box.x + box.width + 8, box.y + 30);
  await expect(thumb).toHaveCSS('opacity', '0');
  await list.evaluate(element => { element.scrollTop = 0; });
  await expect(thumb).toHaveAttribute('data-visible', 'true');
  await expect.poll(async () => {
    const [line, viewport] = await Promise.all([thumb.boundingBox(), list.boundingBox()]);
    return Math.abs(line!.y - viewport!.y);
  }).toBeLessThan(1);
  await expect(thumb).toHaveCSS('opacity', '0');
  await list.evaluate(element => { element.scrollTop = 120; });
  await expect(thumb).toHaveAttribute('data-visible', 'true');
  await expect(thumb).toHaveCSS('opacity', '0');
});

test('the right gutter stays clear when the results fit', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/preview/navigation?section=dictionary&dictionaryTab=domains');
  const list = page.locator('[data-dictionary-workspace] [data-list-scroll]');
  const thumb = page.locator('[data-list-scroll-thumb]');
  const box = (await list.boundingBox())!;
  expect(await list.evaluate(element => element.scrollHeight)).toBeLessThanOrEqual(box.height);
  await page.mouse.move(box.x + box.width + 8, box.y + 30);
  await expect(thumb).not.toHaveAttribute('data-visible', 'true');
  await expect(thumb).toHaveCSS('opacity', '0');
});

test('report detail keeps only the thin indicator and can still scroll its pinned information', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 650 });
  await page.goto('/preview/navigation?section=reports&report=demo-report-summary');
  const body = page.locator('[data-detail-scroll]');
  const info = page.getByRole('complementary', { name: 'Сведения об отчёте' });
  const thumb = page.locator('[data-list-scroll-thumb]');
  for (const region of [body, info]) {
    const dimensions = await region.evaluate(element => ({
      overflow: element.scrollHeight - element.clientHeight,
      scrollbarWidth: Math.round(element.getBoundingClientRect().width) - element.clientWidth
        - parseFloat(getComputedStyle(element).borderLeftWidth) - parseFloat(getComputedStyle(element).borderRightWidth),
    }));
    expect(dimensions.overflow).toBeGreaterThan(0);
    expect(dimensions.scrollbarWidth).toBe(0);
  }
  await info.evaluate(element => { element.scrollTop = 20; });
  expect(await info.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await expect(thumb).toHaveAttribute('data-visible', 'true');
  const infoBox = (await info.boundingBox())!;
  expect((await thumb.boundingBox())!.x).toBeLessThan(infoBox.x + infoBox.width);
  const box = (await body.boundingBox())!;
  await body.evaluate(element => { element.scrollTop = 120; });
  await expect.poll(async () => (await thumb.boundingBox())!.x).toBeGreaterThan(box.x + box.width);
});

for (const view of ['table', 'cards']) {
  test(`report, metric and source ${view} indicators share the same outer gutter`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 650 });
    await page.goto('/preview/navigation?section=reports');
    if (view === 'cards') {
      await page.getByRole('button', { name: 'Карточный вид', exact: true }).click();
      await expect(page.locator('[data-report-card-scroll]')).toBeVisible();
    }
    const surface = page.locator('[data-list-scroll-boundary]');
    const list = surface.locator('[data-list-scroll]');
    const thumb = page.locator('[data-list-scroll-thumb]');
    const box = (await surface.boundingBox())!;
    const listBox = (await list.boundingBox())!;
    expect(listBox.x + listBox.width).toBeLessThan(box.x + box.width);
    await page.mouse.move(box.x + box.width + 8, listBox.y + 50);
    await expect(thumb).toHaveCSS('opacity', '0');
    await list.evaluate(element => { element.scrollTop = 120; });
    await expect(thumb).toHaveAttribute('data-visible', 'true');
    const line = (await thumb.boundingBox())!;
    expect(line.x).toBeGreaterThanOrEqual(box.x + box.width);
    expect(line.x + line.width).toBeLessThan(1440);
    await page.mouse.move(box.x + box.width - 8, listBox.y + 50);
    await expect(thumb).toHaveCSS('opacity', '0');

    const catalogView = view === 'cards' ? 'cards' : 'list';
    for (const route of [`section=metrics&metricView=${catalogView}`, `section=sources&sourceView=${catalogView}`]) {
      await page.goto(`/preview/navigation?${route}`);
      const results = page.locator('[data-catalog-view-results]');
      const scroll = results.locator('[data-list-scroll]');
      await expect(scroll).toBeVisible();
      const resultsBox = (await results.boundingBox())!;
      const scrollBox = (await scroll.boundingBox())!;
      await page.mouse.move(resultsBox.x + resultsBox.width + 8, scrollBox.y + 50);
      await expect(thumb).toHaveCSS('opacity', '0');
      await scroll.evaluate(element => { element.scrollTop = 120; });
      await expect(thumb).toHaveAttribute('data-visible', 'true');
      expect((await thumb.boundingBox())!.x).toBeCloseTo(line.x, 1);
      await page.mouse.move(resultsBox.x + resultsBox.width - 8, scrollBox.y + 50);
      await expect(thumb).toHaveCSS('opacity', '0');
    }
  });
}

test('a scrollable column dropdown uses the same thin overlay without a layout gutter', async ({ page }) => {
  await page.goto('/preview/navigation?section=reports');
  await page.getByRole('button', { name: 'Фильтр «Отчёт»', exact: true }).click();
  const popup = page.getByRole('dialog', { name: 'Фильтр: Отчёт' });
  const options = popup.locator('[data-filter-viewport]');
  const thumb = page.locator('[data-list-scroll-thumb]');
  await expect(options).toBeVisible();
  const dimensions = await options.evaluate(element => ({
    overflow: element.scrollHeight - element.clientHeight,
    gutter: Math.round(element.getBoundingClientRect().width) - element.clientWidth,
  }));
  expect(dimensions.overflow).toBeGreaterThan(0);
  expect(dimensions.gutter).toBe(0);
  await expect(thumb).toHaveCSS('opacity', '0');
  const box = (await options.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 48);
  await page.mouse.wheel(0, 170);
  await expect.poll(() => options.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await expect(thumb).toHaveAttribute('data-visible', 'true');
  const line = (await thumb.boundingBox())!;
  expect(line.width).toBe(3);
  expect(line.x).toBeGreaterThanOrEqual(box.x + box.width);
  expect(line.x + line.width).toBeLessThanOrEqual((await popup.boundingBox())!.x + (await popup.boundingBox())!.width);
  await expect(thumb).toHaveCSS('opacity', '0');
});

test('keyboard scrolling shows the vertical indicator and horizontal scrolling alone leaves it hidden', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/preview/navigation?section=reports&report=demo-report-summary&reportTab=usage');
  const history = page.getByRole('region', { name: 'Прокрутка истории по месяцам' });
  const thumb = page.locator('[data-list-scroll-thumb]');
  await history.scrollIntoViewIfNeeded();
  await expect(thumb).toHaveCSS('opacity', '0');
  await history.evaluate(element => { element.scrollLeft = 80; });
  expect(await history.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  await expect(thumb).toHaveCSS('opacity', '0');
  await history.press('End');
  await expect.poll(() => history.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await expect(thumb).toHaveAttribute('data-visible', 'true');
  await expect(thumb).toHaveCSS('opacity', '0');
});
