import { expect, test } from '@playwright/test';

for (const section of ['reports', 'home']) {
  test(`${section}: domain groups toggle independently and draw a full-width divider`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/preview/navigation?section=${section}`);
    const table = page.getByRole('table', { name: 'Список отчётов' });
    const groups = table.locator('[data-collapsed]');
    const group = groups.first();
    const toggle = group.getByRole('button', { expanded: true }).first();
    const id = await toggle.getAttribute('aria-controls');
    const content = group.locator(`[id="${id}"]`);
    const badge = toggle.locator('span').last();
    const neighbor = groups.nth(1);
    const initialCount = await badge.innerText();
    await expect(content.locator('[data-table-report-id]').first()).toBeVisible();
    await expect(badge).toHaveCSS('background-color', 'rgb(226, 228, 234)');
    await toggle.click();

    const collapsedToggle = group.getByRole('button', { expanded: false });
    await expect(collapsedToggle).toBeFocused();
    await expect(content).toHaveAttribute('inert', '');
    await expect(content).toBeHidden();
    await expect(collapsedToggle.locator('span').last()).toHaveText(initialCount);
    await expect(collapsedToggle.locator('span').last()).toHaveCSS('background-color', 'rgb(0, 123, 252)');
    await expect(group).toHaveCSS('border-bottom', '1px solid rgb(226, 228, 234)');
    await expect(neighbor.locator('[data-table-report-id]').first()).toBeVisible();
    const divider = (await group.boundingBox())!;
    const scroll = (await table.getByLabel('Прокрутка таблицы отчётов').boundingBox())!;
    expect(divider.x).toBe(scroll.x);
    expect(divider.width).toBe(scroll.width);

    await collapsedToggle.press('Enter');
    await expect(toggle).toBeFocused();
    await expect(content.locator('[data-table-report-id]').first()).toBeVisible();
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
