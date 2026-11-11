import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const entry = '/preview/navigation?section=reports&report=demo-report-summary&reportTab=usage';

test('monthly hover moves a blue guide and shows the exact month and value', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(entry);
  const chart = page.locator('[data-usage-chart="mau"]');
  const plot = chart.getByRole('img');
  const tooltip = chart.getByRole('tooltip');
  const guide = chart.locator('[data-usage-guide]');
  const january = chart.locator('[data-usage-month="2026-01"]');
  const february = chart.locator('[data-usage-month="2026-02"]');

  await expect(guide).toHaveCount(0);
  await january.hover();
  await expect(tooltip.locator('span')).toHaveText('Январь 2026');
  await expect(tooltip.locator('strong')).toHaveText('66');
  await expect(tooltip).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(tooltip).toHaveCSS('border-top-left-radius', '8px');
  await expect(tooltip).not.toHaveCSS('box-shadow', 'none');
  await expect(guide).toHaveCSS('stroke', 'rgb(0, 123, 252)');
  await expect(guide).toHaveCSS('transition-duration', '0.18s');
  await february.hover();
  await expect(tooltip.locator('span')).toHaveText('Февраль 2026');
  await expect(tooltip.locator('strong')).toHaveText('110');
  await expect.poll(() => plot.evaluate(svg => {
    const guideX = svg.querySelector('[data-usage-guide]')!.getBoundingClientRect().left;
    const marker = svg.querySelectorAll('circle')[1].getBoundingClientRect();
    return Math.abs(guideX - marker.left - marker.width / 2);
  })).toBeLessThan(0.5);
  await chart.screenshot({ path: testInfo.outputPath('monthly-guide.png') });

  await page.getByRole('heading', { level: 1 }).hover();
  await expect(tooltip).toHaveCount(0);
  await plot.focus();
  await plot.press('ArrowRight');
  await expect(tooltip.locator('span')).toHaveText('Февраль 2026');
  await plot.press('Escape');
  await expect(tooltip).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await january.hover();
  await expect(guide).toHaveCSS('transition-duration', '0s');
  await expect(tooltip).toHaveCSS('animation-name', 'none');
});

test('usage keeps both periods, report identity and real control behavior', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(entry);
  const usage = page.locator('[data-report-usage]');
  await expect(usage).toBeVisible();
  await expect(usage).not.toContainText('Visiology');
  await expect(usage).not.toContainText('данные примера');
  await expect(usage.locator('dt')).toHaveCount(21);
  await expect(usage.getByRole('heading', { name: 'Статусы и аудитория', exact: true })).toBeVisible();
  await expect(usage.locator('[data-summary-classifications] dt')).toHaveCount(4);
  await expect(usage.getByText('Классификация отчёта по активности и охвату', { exact: true })).toHaveCount(0);
  await expect(usage.getByRole('heading', { name: 'Статусы и аудитория', exact: true }).locator('..').locator('p')).toHaveCount(0);
  await expect(usage.locator(':scope > dl')).toHaveCount(0);
  await expect(usage.getByText('258', { exact: true })).toBeVisible();
  const summary = page.getByRole('button', { name: /Сводная статистика Активность/ });
  await summary.click();
  await expect(summary).toHaveAttribute('aria-expanded', 'false');
  await expect(usage.getByText('258', { exact: true })).not.toBeVisible();
  await expect(usage.getByText('Популярный отчёт', { exact: true })).not.toBeVisible();
  await summary.press('Space');
  await expect(summary).toHaveAttribute('aria-expanded', 'true');
  const dynamics = usage.getByRole('button', { name: /^Динамика по месяцам/ });
  await expect(dynamics).toHaveAttribute('aria-expanded', 'true');
  const controls = usage.getByRole('tablist', { name: 'Показатель динамики' });
  await controls.getByRole('tab', { name: 'MAU', exact: true }).press('ArrowRight');
  await expect(controls.getByRole('tab', { name: 'События', exact: true })).toBeFocused();
  await expect(usage.locator('[data-usage-chart]')).toHaveAttribute('data-usage-chart', 'events');
  await dynamics.click();
  await expect(dynamics).toHaveAttribute('aria-expanded', 'false');
  await expect(controls).toHaveCount(0);
  await expect(usage.locator('[data-usage-chart]')).not.toBeVisible();
  await expect(summary).toHaveAttribute('aria-expanded', 'true');
  await dynamics.press('Space');
  await expect(dynamics).toHaveAttribute('aria-expanded', 'true');
  await expect(controls.getByRole('tab', { name: 'События', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(usage.locator('[data-usage-chart]')).toBeVisible();
  await controls.getByRole('tab', { name: 'События', exact: true }).press('End');
  await expect(usage.getByText('Нет помесячных данных', { exact: true })).toBeVisible();
  await controls.getByRole('tab', { name: 'Индекс значимости' }).press('Home');
  await expect(usage.locator('[data-usage-chart]')).toHaveAttribute('data-usage-chart', 'mau');
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Использование', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('article[data-report-id]')).toHaveAttribute('data-report-id', 'demo-report-summary');
  const history = usage.getByRole('table', { name: 'История по месяцам', exact: true });
  await expect(history.getByRole('row')).toHaveCount(11);
  await expect(history.getByRole('columnheader')).toHaveCount(10);
  await expect(history.getByRole('cell')).toHaveCount(100);
  await expect(history.getByRole('button')).toHaveCount(0);
  await expect(history.locator('svg, img')).toHaveCount(0);
  await expect(history).not.toContainText(/демо|пример/i);
  await expect(history.getByRole('cell', { name: 'Октябрь 2026', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('usage has no cross-report fixture leakage', async ({ page }) => {
  await page.goto('/preview/navigation?section=reports&report=demo-report-motivation&reportTab=usage');
  const usage = page.locator('[data-report-usage]');
  await expect(usage.getByRole('img', { name: 'MAU: Май 2026 — Октябрь 2026', exact: true })).toBeVisible();
  await expect(usage.getByRole('table', { name: 'История по месяцам' }).getByRole('row')).toHaveCount(7);
  await expect(usage.getByText('258', { exact: true })).toHaveCount(0);
});

test('monthly history keeps ten distinct columns and a sticky header during local scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(entry);
  const scroll = page.getByRole('region', { name: 'Прокрутка истории по месяцам' });
  const history = scroll.getByRole('table');
  const rows = history.getByRole('row');
  const header = history.getByRole('rowgroup').first();
  const frameEdges = () => scroll.evaluate(el => {
    const frame = el.parentElement!;
    const surface = frame.getBoundingClientRect();
    const viewport = el.getBoundingClientRect();
    return {
      left: viewport.left - surface.left,
      right: surface.right - viewport.right,
      bottom: Math.round(surface.bottom - viewport.top - el.clientHeight),
      color: getComputedStyle(frame).backgroundColor,
      corners: [getComputedStyle(frame).borderBottomLeftRadius, getComputedStyle(frame).borderBottomRightRadius],
    };
  });

  await expect(history.getByRole('columnheader')).toHaveCount(10);
  await expect(header).toHaveCSS('height', '48px');
  await expect(rows.nth(1)).toHaveCSS('height', '56px');
  const rowBounds = await rows.evaluateAll(([heading, first, second]) => {
    const row = first.getBoundingClientRect();
    return {
      headings: Array.from(heading.children, cell => cell.getBoundingClientRect().left),
      cells: Array.from(first.children, cell => cell.getBoundingClientRect().left),
      gap: second.getBoundingClientRect().top - row.bottom,
      left: row.left,
    };
  });
  expect(new Set(rowBounds.headings).size).toBe(10);
  expect(rowBounds.headings).toEqual(rowBounds.cells);
  expect(rowBounds.gap).toBe(4);
  expect(rowBounds.left).toBe(await scroll.evaluate(el => el.getBoundingClientRect().left));
  const grayInsets = { left: 16, right: 16, bottom: 16, color: 'rgb(243, 244, 249)', corners: ['16px', '16px'] };
  expect(await frameEdges()).toEqual(grayInsets);

  await scroll.press('End');
  await expect.poll(() => scroll.evaluate(el => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThan(1);
  await expect.poll(() => header.evaluate(el => el.getBoundingClientRect().top - el.closest('[data-list-scroll]')!.getBoundingClientRect().top)).toBe(0);
  await expect(rows.last().getByText('Октябрь 2026')).toBeInViewport();
  await expect(scroll).toBeFocused();
  await scroll.press('ArrowRight');
  await expect.poll(() => scroll.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  expect(await frameEdges()).toEqual(grayInsets);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1024);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect.poll(() => scroll.evaluate(el => el.scrollWidth - el.clientWidth)).toBe(0);
  expect(await frameEdges()).toEqual(grayInsets);
});

test('usage summary includes classifications in its grid and keeps local table scroll', async ({ page }) => {
  await page.goto(entry);
  await expect(page.locator('[data-report-usage]')).toBeVisible();
  const measurements = [];
  for (const [width, height] of [[1280, 900], [1440, 900], [1920, 1080], [1024, 768], [1440, 700]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('tab', { name: 'Использование', exact: true })).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const history = page.getByRole('table', { name: 'История по месяцам', exact: true });
    await expect(history.getByRole('row').nth(1)).toHaveCSS('height', '56px');
    const dimensions = await page.locator('[data-report-usage]').evaluate(root => {
      const classifications = Array.from(root.querySelectorAll('[data-summary-classifications] > div')).map(cell => ({ width: cell.getBoundingClientRect().width, height: cell.getBoundingClientRect().height, clipped: cell.scrollWidth > cell.clientWidth }));
      const chart = root.querySelector('[data-usage-chart] svg')!.getBoundingClientRect();
      const historyScroll = root.querySelector('[aria-label="Прокрутка истории по месяцам"]')!;
      const sectionHeaders = Array.from(root.querySelectorAll(':scope > section')).map(section => {
        const header = section.firstElementChild!;
        const body = section.querySelector('[data-accordion-body]')!;
        return { title: header.textContent, headerHeight: header.getBoundingClientRect().height, bodyBorder: getComputedStyle(body).borderTopWidth };
      });
      const pairs = Array.from(root.querySelectorAll('dl dt')).map(label => {
        const isClassification = label.closest('dl')!.hasAttribute('data-summary-classifications');
        const labelRect = label.getBoundingClientRect();
        const valueRect = label.nextElementSibling!.getBoundingClientRect();
        return { label: label.textContent, isClassification, gap: valueRect.top - labelRect.bottom };
      });
      const summaryBody = root.querySelector(':scope > section [data-accordion-body]')!;
      const summary = summaryBody.firstElementChild!;
      const groups = Array.from(summary.children);
      const bodyRect = summaryBody.getBoundingClientRect();
      const divider = groups[1].getBoundingClientRect();
      const summaryBorders = {
        bodyPadding: getComputedStyle(summaryBody).padding,
        bodyRadius: getComputedStyle(summaryBody).borderRadius,
        dividerLeft: divider.left - bodyRect.left,
        dividerRight: bodyRect.right - divider.right,
        dividerWidth: getComputedStyle(groups[1]).borderTopWidth,
        cellsHaveNoBottomBorder: groups.every(group => Array.from(group.querySelectorAll('dl > div')).every(cell => getComputedStyle(cell).borderBottomWidth === '0px')),
      };
      const headings = Array.from(root.querySelectorAll('[role="columnheader"]'));
      const firstRow = root.querySelectorAll('[role="row"]')[1];
      const historyColumns = headings.map((heading, index) => {
        const rect = heading.getBoundingClientRect();
        const style = getComputedStyle(heading);
        const range = document.createRange();
        range.selectNodeContents(heading);
        const text = range.getBoundingClientRect();
        const cell = firstRow.children[index].getBoundingClientRect();
        return { label: heading.textContent, width: rect.width, singleLine: text.height <= parseFloat(style.lineHeight), textFits: text.right <= rect.right - parseFloat(style.paddingRight) + .1, aligned: Math.abs(rect.left - cell.left) < .1 && Math.abs(rect.width - cell.width) < .1 };
      });
      return { contentWidth: root.getBoundingClientRect().width, classifications, summaryGroupCount: groups.length, chartHeight: chart.height, historyScrollsLocally: historyScroll.scrollWidth > historyScroll.clientWidth, sectionHeaders, pairs, summaryBorders, historyColumns };
    });
    expect(dimensions.chartHeight).toBe(328);
    expect(dimensions.summaryGroupCount).toBe(3);
    expect(dimensions.classifications).toHaveLength(4);
    for (const cell of dimensions.classifications) expect(cell.clipped).toBe(false);
    for (const pair of dimensions.pairs) expect(pair.gap).toBe(4);
    for (const header of dimensions.sectionHeaders) {
      expect(header.bodyBorder).toBe('1px');
      expect(header.headerHeight).toBeLessThanOrEqual(120);
    }
    expect(dimensions.summaryBorders).toEqual({ bodyPadding: '0px', bodyRadius: '0px', dividerLeft: 0, dividerRight: 0, dividerWidth: '1px', cellsHaveNoBottomBorder: true });
    for (const column of dimensions.historyColumns) {
      expect(column.singleLine, column.label ?? '').toBe(true);
      expect(column.textFits, column.label ?? '').toBe(true);
      expect(column.aligned, column.label ?? '').toBe(true);
    }
    measurements.push({ width, height, ...dimensions });
    await page.screenshot({ path: `verification/report-usage/usage-${width}x${height}.png`, fullPage: true, style: "#root > div, [data-report-detail='true'] { height:auto !important; overflow:visible !important; }" });
  }
  const standard = measurements.find(item => item.width === 1440)!;
  const wide = measurements.find(item => item.width === 1920)!;
  for (let index = 0; index < 10; index++) expect(wide.historyColumns[index].width).toBeGreaterThan(standard.historyColumns[index].width);
  await page.getByRole('button', { name: 'Свернуть панель', exact: true }).click();
  await expect(page.locator('[data-report-usage]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('cell', { name: 'Октябрь 2026', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('cell', { name: 'Октябрь 2026', exact: true })).toBeInViewport();
  writeFileSync('verification/report-usage/measurements.json', JSON.stringify(measurements, null, 2));
});
