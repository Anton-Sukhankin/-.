import { expect, test } from '@playwright/test';

for (const { section, view } of [
  { section: 'reports', view: 'table' }, { section: 'home', view: 'table' },
  { section: 'reports', view: 'cards' }, { section: 'home', view: 'cards' },
]) {
  test(`${section} ${view}: domain groups toggle independently and draw a full-width divider`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/preview/navigation?section=${section}`);
    if (view === 'cards') await page.getByRole('button', { name: 'Карточный вид', exact: true }).click();
    const surface = view === 'table' ? page.getByRole('table', { name: 'Список отчётов' })
      : page.getByRole('region', { name: 'Примеры карточек отчётов' });
    const row = view === 'table' ? '[data-table-report-id]' : '[data-card-report-id]';
    const groups = surface.locator('[data-collapsed]');
    const group = groups.first();
    const toggle = group.getByRole('button', { expanded: true }).first();
    const id = await toggle.getAttribute('aria-controls');
    const content = group.locator(`[id="${id}"]`);
    const badge = toggle.locator('span:not([data-group-chevron])').last();
    const chevron = group.locator('[data-group-chevron]');
    const neighbor = groups.nth(1);
    const initialCount = await badge.innerText();
    await expect(content.locator(row).first()).toBeVisible();
    await expect(chevron).toHaveCSS('width', '12px');
    await expect(chevron).toHaveCSS('transform', 'matrix(-1, 0, 0, -1, 0, 0)');
    await expect(badge).toHaveCSS('background-color', 'rgb(226, 228, 234)');
    await toggle.click();

    const collapsedToggle = group.getByRole('button', { expanded: false });
    await expect(collapsedToggle).toBeFocused();
    await expect(content).toHaveAttribute('inert', '');
    await expect(content).toBeHidden();
    await expect(collapsedToggle.locator('span:not([data-group-chevron])').last()).toHaveText(initialCount);
    await expect(collapsedToggle.locator('span:not([data-group-chevron])').last()).toHaveCSS('background-color', 'rgb(0, 123, 252)');
    await expect(chevron).toHaveCSS('transform', 'none');
    await expect(group).toHaveCSS('border-bottom', '1px solid rgb(226, 228, 234)');
    await expect(neighbor.locator(row).first()).toBeVisible();
    const divider = (await group.boundingBox())!;
    const scrollArea = view === 'table' ? surface.getByLabel('Прокрутка таблицы отчётов') : surface.locator('[data-report-card-scroll]');
    const scroll = (await scrollArea.boundingBox())!;
    expect(divider.x).toBe(scroll.x);
    expect(divider.width).toBe(scroll.width);

    await collapsedToggle.press('Enter');
    await expect(toggle).toBeFocused();
    await expect(content.locator(row).first()).toBeVisible();
    await expect(chevron).toHaveCSS('transform', 'matrix(-1, 0, 0, -1, 0, 0)');
    await expect(badge).toHaveCSS('background-color', 'rgb(226, 228, 234)');
    await expect(group).toHaveCSS('border-bottom-width', '0px');
  });
}

test('Navigator opens the collapsed domain that contains the selected report', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 820 });
  await page.goto('/preview/navigation?section=reports');
  const report = page.locator('[data-table-report-id="demo-report-debt"]');
  const group = report.locator('xpath=ancestor::*[@data-collapsed]');
  await group.getByRole('button', { expanded: true }).first().click();
  await expect(report).toBeHidden();
  const field = page.getByRole('combobox', { name: 'Поиск по каталогу' });
  await field.fill('1С ЖКХ');
  const results = page.getByRole('grid', { name: 'Результаты поиска' });
  await results.getByRole('rowgroup', { name: 'Отчёты', exact: true }).getByRole('gridcell').first().getByRole('button').click();
  await expect(group).toHaveAttribute('data-collapsed', 'false');
  await expect(report.locator('[data-catalog-search-match]')).toHaveText('1С ЖКХ');
  await expect(report.locator('[data-catalog-search-match]')).toBeInViewport({ ratio: 1 });
});
