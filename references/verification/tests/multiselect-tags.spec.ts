import { expect, test, type Locator } from '@playwright/test';

async function expectHiddenValues(field: Locator, popup: Locator, selected: string[]) {
  const visible = await field.locator('[data-selected-tag]').evaluateAll(tags => tags.map(tag => tag.getAttribute('data-selected-tag')));
  const hidden = selected.filter(value => !visible.includes(value));
  await expect(field.locator('[data-multi-select-counter]')).toHaveText(`+${hidden.length}`);
  await expect(popup.getByRole('listitem')).toHaveText(hidden);
  return hidden;
}

for (const context of ['reports', 'favorites'] as const) {
  test(`${context}: the counter shows only hidden draft values and Escape stays in the panel`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/preview/navigation?section=${context === 'reports' ? 'reports' : 'home'}`);
    const openPanel = page.getByRole('button', { name: 'Открыть фильтры отчётов', exact: true });
    await openPanel.click();
    const panel = page.getByRole('dialog', { name: context === 'reports' ? 'Фильтры отчётов' : 'Фильтры избранных отчётов', exact: true });
    const field = panel.locator('[data-multi-select="owner"]');
    const trigger = field.locator('[data-panel-field]');
    await trigger.press('Enter');
    const values = page.locator('[data-panel-value-list="owner"]');
    const choices = values.getByRole('checkbox');
    const names: string[] = [];
    for (let index = 0; index < Math.min(3, await choices.count()); index++) {
      names.push(await choices.nth(index).getAttribute('value') ?? '');
      await choices.nth(index).check();
    }
    expect(names.length).toBeGreaterThan(1);
    await panel.getByRole('heading', { name: /Фильтры/ }).click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    const counter = field.locator('[data-multi-select-counter]');
    await expect(counter).toBeEnabled();
    await expect(counter).toHaveCSS('border-radius', '8px');
    await expect(field.locator('[data-selected-tag]').first()).toHaveCSS('border-radius', '8px');
    const geometry = await field.evaluate(element => {
      const tags = Array.from(element.querySelectorAll('[data-selected-tag], [data-multi-select-counter]'));
      const bounds = element.getBoundingClientRect();
      return { tags: tags.map(node => { const rect = node.getBoundingClientRect(); return { left: rect.left, right: rect.right, color: getComputedStyle(node).color, background: getComputedStyle(node).backgroundColor }; }), right: bounds.right, clipped: Array.from(element.querySelectorAll('[data-selected-tag] > span')).some(node => node.scrollWidth > node.clientWidth) };
    });
    for (let index = 1; index < geometry.tags.length; index++) expect(geometry.tags[index].left - geometry.tags[index - 1].right).toBe(4);
    expect(geometry.tags.at(-1)!.right).toBeLessThan(geometry.right);
    expect(geometry.clipped).toBe(true);
    for (const tag of geometry.tags) { expect(tag.color).toBe('rgb(255, 255, 255)'); expect(tag.background).toBe('rgb(96, 100, 108)'); }
    await counter.hover();
    const selected = panel.getByRole('dialog', { name: 'Скрытые выбранные значения: Владелец', exact: true });
    await expect(selected).toBeVisible();
    const hidden = await expectHiddenValues(field, selected, names);
    await counter.click();
    await expect(selected).toBeVisible();
    expect(hidden.length).toBeLessThan(names.length);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await page.screenshot({ path: testInfo.outputPath('hidden-tags.png'), animations: 'disabled' });
    await page.keyboard.press('Escape');
    await expect(selected).toHaveCount(0);
    await expect(panel).toBeVisible();
    await expect(counter).toBeFocused();
    await counter.press('ArrowDown');
    await expect(selected.getByRole('button').first()).toBeFocused();
    const removed = hidden[0];
    const remaining = names.find(name => !hidden.includes(name))!;
    const remove = selected.getByRole('button', { name: `Удалить Владелец: ${removed}`, exact: true });
    await expect(remove).toHaveCSS('opacity', '1');
    await remove.click();
    await expect(trigger).not.toHaveAccessibleName(new RegExp(removed));
    expect(new URL(page.url()).search).not.toContain('owner');
    if (await counter.count()) {
      await expectHiddenValues(field, selected, names.filter(name => name !== removed));
      await page.keyboard.press('Escape');
    } else {
      await expect(selected).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }
    await trigger.press('Enter');
    await expect(values.getByRole('checkbox', { name: removed, exact: true })).not.toBeChecked();
    await expect(values.getByRole('checkbox', { name: remaining, exact: true })).toBeChecked();
    await panel.getByRole('heading', { name: /Фильтры/ }).click();
    await panel.getByRole('button', { name: 'Применить', exact: true }).click();
    await expect(panel).toHaveCount(0);
    await openPanel.click();
    await trigger.press('Enter');
    await expect(values.getByRole('checkbox', { name: removed, exact: true })).not.toBeChecked();
    await expect(values.getByRole('checkbox', { name: remaining, exact: true })).toBeChecked();
    await panel.getByRole('button', { name: 'Закрыть', exact: true }).click();
    expect(errors).toEqual([]);
  });
}

test('source multi-selects and all single-select fields keep their selection modes', async ({ page }) => {
  await page.goto('/preview/navigation?section=sources');
  await page.getByRole('button', { name: 'Открыть фильтры источников', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Фильтры источников', exact: true });
  await expect(panel.locator('[data-multi-select]')).toHaveCount(4);
  await panel.locator('[data-panel-field="platform"]').click();
  const values = page.locator('[data-source-values="platform"]');
  const choices = values.getByRole('checkbox');
  const count = Math.min(4, await choices.count());
  const names: string[] = [];
  for (let index = 0; index < count; index++) {
    names.push(await choices.nth(index).inputValue());
    await choices.nth(index).check();
  }
  await panel.getByRole('heading', { name: 'Фильтры источников', exact: true }).click();
  const field = panel.locator('[data-multi-select="platform"]');
  await expect(field.locator('[data-selected-tag]')).not.toHaveCount(0);
  await field.evaluate(element => { element.style.width = '160px'; });
  const counter = field.locator('[data-multi-select-counter]');
  await counter.hover();
  const selected = panel.getByRole('dialog', { name: 'Скрытые выбранные значения: Платформа', exact: true });
  await expectHiddenValues(field, selected, names);
  await selected.getByRole('listitem').first().hover();
  await selected.getByRole('button').first().click();
  expect(new URL(page.url()).search).not.toContain('source.platform');
  if (await counter.count()) await page.keyboard.press('Escape');
  else await expect(selected).toHaveCount(0);
  await panel.locator('[data-panel-field="personalData"]').click();
  const single = page.locator('[data-source-values="personalData"]');
  await expect(single.getByRole('radio')).not.toHaveCount(0);
  await expect(single.getByRole('checkbox')).toHaveCount(0);
});

test('wide tags repack on resize and long values do not overflow the field or page', async ({ page }) => {
  await page.goto('/previews/filter-panel.html?context=catalog&case=default');
  const panel = page.getByRole('dialog', { name: 'Фильтры отчётов', exact: true });
  await panel.locator('[data-panel-field="domain"]').click();
  const choices = page.locator('[data-panel-popup]').getByRole('checkbox');
  const names: string[] = [];
  for (let index = 0; index < 6; index++) {
    names.push(await choices.nth(index).inputValue());
    await choices.nth(index).check();
  }
  await panel.locator('[data-panel-field="domain"]').press('Enter');
  const field = panel.locator('[data-multi-select="domain"]');
  const initial = await field.locator('[data-selected-tag]').count();
  await panel.evaluate(element => { element.style.width = '360px'; });
  await expect.poll(() => field.locator('[data-selected-tag]').count()).toBeLessThan(initial);
  const counter = field.locator('[data-multi-select-counter]');
  await expect(counter).toBeVisible();
  await counter.hover();
  await expectHiddenValues(field, panel.getByRole('dialog', { name: 'Скрытые выбранные значения: Домен', exact: true }), names);
  await page.setViewportSize({ width: 1024, height: 768 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const context of ['reports', 'sources'] as const) {
  test(`${context}: tag deletion and clear all affect only the selected field and keep its list open`, async ({ page }, testInfo) => {
    await page.goto(`/preview/navigation?section=${context}`);
    await page.getByRole('button', { name: context === 'reports' ? 'Открыть фильтры отчётов' : 'Открыть фильтры источников', exact: true }).click();
    const panel = page.getByRole('dialog', { name: context === 'reports' ? 'Фильтры отчётов' : 'Фильтры источников', exact: true });
    const fieldId = context === 'reports' ? 'owner' : 'platform';
    const field = panel.locator(`[data-multi-select="${fieldId}"]`);
    const trigger = field.locator('[data-panel-field]');
    await expect(field.locator('[data-multi-select-clear]')).toHaveCount(0);
    await trigger.press('Enter');
    const values = page.locator(context === 'reports' ? `[data-panel-value-list="${fieldId}"]` : `[data-source-values="${fieldId}"]`);
    const choices = values.getByRole('checkbox');
    const count = await choices.count();
    await expect(values.getByRole('searchbox')).toHaveCount(count < 7 ? 0 : 1);
    await choices.first().check();
    const clear = field.locator('[data-multi-select-clear]');
    await expect(clear).toBeVisible();
    const cross = clear.locator('svg');
    await expect(cross.locator('..')).toHaveCSS('width', '18px');
    await expect(cross.locator('..')).toHaveCSS('height', '18px');
    await expect(cross).toHaveCSS('width', '12px');
    await expect(cross).toHaveCSS('height', '12px');
    await expect(field.locator('[data-selected-tag-remove]')).toHaveCount(1);
    await field.locator('[data-selected-tag-remove]').click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(choices.first()).not.toBeChecked();
    await expect(field.locator('[data-multi-select-clear]')).toHaveCount(0);
    await choices.nth(0).check();
    await choices.nth(1).check();
    await field.locator('[data-multi-select-clear]').click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(values.getByRole('checkbox', { checked: true })).toHaveCount(0);
    await expect(field.locator('[data-selected-tag]')).toHaveCount(0);
    await expect(field.locator('[data-multi-select-counter]')).toHaveCount(0);
    await expect(trigger).toHaveAccessibleName(context === 'reports' ? 'Владелец Все' : 'Платформа Все');
    await expect(trigger).toBeFocused();
    await choices.first().check();
    await panel.getByRole('heading', { name: /Фильтры/ }).click();
    await panel.locator('[data-panel-field="domain"]').click();
    const domainValues = page.locator(context === 'reports' ? '[data-panel-value-list="domain"]' : '[data-source-values="domain"]');
    await domainValues.getByRole('checkbox').first().check();
    await panel.getByRole('heading', { name: /Фильтры/ }).click();
    await field.locator('[data-multi-select-clear]').click();
    await expect(panel.locator('[data-multi-select="domain"] [data-selected-tag]')).toHaveCount(1);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(panel.locator('[data-panel-count]')).toHaveText('1');
    await page.screenshot({ path: testInfo.outputPath('clear-field.png'), animations: 'disabled' });
    expect(new URL(page.url()).search).not.toContain('domain');
  });
}

test('search remains visible when a long multiple-choice list is narrowed to one result', async ({ page }) => {
  await page.goto('/previews/filter-panel.html?case=wide-list');
  const search = page.getByRole('searchbox', { name: 'Поиск значений' });
  await expect(search).toBeVisible();
  await search.fill('Финансы');
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await expect(search).toBeVisible();
  await search.fill('нет такого значения');
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(search).toBeVisible();
  await search.fill('');
  await expect(page.getByRole('checkbox')).toHaveCount(8);
});
