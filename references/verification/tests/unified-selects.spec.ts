import { test,expect,type Locator } from '@playwright/test';

const chevronUp = 'matrix(-1, 0, 0, -1, 0, 0)';

test('single select uses one DS check, shared hover and keyboard commit without changing on focus',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/preview/navigation?section=metrics');
  const trigger=page.locator('[data-single-select][aria-label="Тип метрики"]');
  const chevron=trigger.locator('img');
  await expect(chevron).toHaveCSS('transform','none');
  await trigger.click();
  const popup=page.getByRole('listbox',{name:'Тип метрики',exact:true});
  await expect(chevron).toHaveCSS('transform',chevronUp);
  await expect(popup.locator('[data-selection-check]')).toHaveCount(1);
  const check=popup.locator('[data-selection-check]');
  await expect(check).toHaveAttribute('src','/images/dropdown/check.svg');
  expect(await check.evaluate(image=>({width:image.getBoundingClientRect().width,height:image.getBoundingClientRect().height,loaded:(image as HTMLImageElement).naturalWidth}))).toEqual({width:24,height:24,loaded:24});
  const option=popup.getByRole('option',{name:'Метрика',exact:true});
  await option.hover();
  await expect(option).toHaveCSS('background-color','rgb(243, 244, 249)');
  await expect(trigger).toHaveText('Все типы');
  await expect(page.locator('[data-metric-id]')).toHaveCount(9);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(chevron).toHaveCSS('transform','none');
  await trigger.press('ArrowDown');
  await expect(popup).toBeVisible();
  await expect(chevron).toHaveCSS('transform',chevronUp);
  await page.keyboard.press('End');
  await expect(trigger).toHaveText('Все типы');
  await expect(popup.locator('[data-selection-check]')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveText('Показатель');
  await expect(chevron).toHaveCSS('transform','none');
  await expect(page.locator('[data-metric-id]')).toHaveCount(7);
  await trigger.click();
  await expect(popup.getByRole('option',{name:'Показатель',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(popup.locator('[data-selection-check]')).toHaveCount(1);
  await popup.getByRole('option',{name:'Все типы',exact:true}).click();
  await expect(page.locator('[data-metric-id]')).toHaveCount(9);
  await expect(trigger).toBeFocused();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('one click switches the open filter select without committing the previous option', async ({ page }) => {
  await page.goto('/preview/navigation?section=metrics');
  const type = page.locator('[data-single-select][aria-label="Тип метрики"]');
  const status = page.locator('[data-single-select][aria-label="Статус метрики"]');
  await type.click();
  await page.keyboard.press('End');
  await status.click();
  await expect(type).toHaveAttribute('aria-expanded', 'false');
  await expect(type).toHaveText('Все типы');
  await expect(status).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-single-select-popup]')).toHaveCount(1);
  const statusList = page.getByRole('listbox', { name: 'Статус метрики', exact: true });
  await expect(statusList.getByRole('option', { name: 'Все статусы', exact: true })).toBeFocused();
  const lastStatus = statusList.getByRole('option').last();
  const expectedStatus = (await lastStatus.innerText()).trim();
  await page.keyboard.press('End');
  await expect(lastStatus).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(status).toHaveText(expectedStatus);
  await expect(status).toBeFocused();

  await status.click();
  await type.click();
  await expect(status).toHaveAttribute('aria-expanded', 'false');
  await expect(type).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(type).toBeFocused();
  await expect(page.locator('[data-single-select-popup]')).toHaveCount(0);
});

test('closed metric filters clear independently without reopening the list', async ({ page }) => {
  await page.goto('/preview/navigation?section=metrics&metricType=Метрика&metricStatus=Проверена');
  const type = page.getByRole('combobox', { name: 'Тип метрики', exact: true });
  const clearType = page.getByRole('button', { name: 'Очистить выбор: Тип метрики', exact: true });
  const clearStatus = page.getByRole('button', { name: 'Очистить выбор: Статус метрики', exact: true });
  await expect(clearType).toBeVisible();
  await expect(clearType).toHaveCSS('border-radius', '50%');
  await expect(clearType).toHaveCSS('width', '20px');
  await expect(clearType).toHaveCSS('height', '20px');
  const badge = clearType.locator('svg').locator('..');
  await expect(badge).toHaveCSS('width', '18px');
  await expect(badge).toHaveCSS('height', '18px');
  await expect(badge).toHaveCSS('background-color', 'rgb(129, 134, 142)');
  await expect(badge).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(clearType.locator('svg')).toHaveCSS('width', '12px');
  await expect(clearType.locator('svg')).toHaveCSS('height', '12px');
  await expect(clearType.locator('svg')).toHaveAttribute('stroke-width', '2');
  const badgeBox = (await badge.boundingBox())!;
  const crossBox = (await clearType.locator('svg').boundingBox())!;
  expect(crossBox.x + crossBox.width / 2).toBe(badgeBox.x + badgeBox.width / 2);
  expect(crossBox.y + crossBox.height / 2).toBe(badgeBox.y + badgeBox.height / 2);
  const clearBox = (await clearType.boundingBox())!;
  const arrowBox = (await type.locator('img').boundingBox())!;
  expect(clearBox.x + clearBox.width).toBeLessThan(arrowBox.x);
  await type.click();
  await expect(page.getByRole('listbox', { name: 'Тип метрики', exact: true })).toBeVisible();
  await expect(type.locator('..').locator('[data-select-clear]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await clearType.press('Enter');
  await expect(type).toHaveText('Все типы');
  await expect(type).toBeFocused();
  await expect(type).toHaveAttribute('aria-expanded', 'false');
  await expect(clearType).toHaveCount(0);
  await expect(clearStatus).toBeVisible();
  await expect(page).toHaveURL(/metricStatus=/);
  await expect(page).not.toHaveURL(/metricType=/);
});

test('dictionary resets a selected missing value without clearing another filter', async ({ page }) => {
  const filters = new URLSearchParams({ 'dictionary.all.owner': 'missing', 'dictionary.all.status': 'value:Утверждён' });
  await page.goto(`/preview/navigation?section=dictionary&${filters}`);
  await page.getByRole('button', { name: 'Очистить выбор: Владелец', exact: true }).click();
  const owner = page.getByRole('button', { name: 'Владелец Все владельцы', exact: true });
  await expect(owner).toBeFocused();
  await expect(owner).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Очистить выбор: Статус', exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/dictionary\.all\.owner=/);
});

for (const { section, opener, fieldId, label, option, defaultLabel } of [
  { section: 'reports', opener: 'Открыть фильтры отчётов', fieldId: 'status', label: 'Статус проверки', option: 'Проверено', defaultLabel: 'Все' },
  { section: 'sources', opener: 'Открыть фильтры источников', fieldId: 'analytics', label: 'В аналитике', option: 'Используется в аналитике', defaultLabel: 'Не важно' },
]) {
  test(`${section}: single select reset changes only its draft value`, async ({ page }) => {
    await page.goto(`/preview/navigation?section=${section}`);
    await page.getByRole('button', { name: opener, exact: true }).click();
    const panel = page.getByRole('dialog', { name: 'Фильтры', exact: true });
    const field = panel.locator(`[data-panel-field="${fieldId}"]`);
    const domain = panel.locator('[data-panel-field="domain"]');
    await domain.click();
    await page.getByRole('checkbox', { name: 'Гостеприимство', exact: true }).check();
    await field.click();
    await page.getByRole('radio', { name: option, exact: true }).check();
    await panel.getByRole('heading', { name: 'Фильтры', exact: true }).click();
    await expect(panel.locator('[data-panel-count]')).toHaveText('2');
    await panel.getByRole('button', { name: `Очистить выбор: ${label}`, exact: true }).click();
    await expect(field).toHaveAccessibleName(`${label} ${defaultLabel}`);
    await expect(field).toBeFocused();
    await expect(field).toHaveAttribute('aria-expanded', 'false');
    await expect(panel.locator('[data-panel-count]')).toHaveText('1');
    await expect(domain).toHaveAccessibleName('Домен Гостеприимство');
    await expect(page).toHaveURL(new RegExp(`section=${section}$`));
  });
}

test('only header search has a pill shape and all search surfaces share the blue focus border', async ({ page }) => {
  const blue = 'rgb(0, 123, 252)';
  const checkField = async (input: Locator, radius: string) => {
    const surface = input.locator('..');
    await expect(surface).toHaveCSS('border-top-left-radius', radius);
    await input.click();
    await expect(input).toBeFocused();
    await expect(surface).toHaveCSS('border-top-color', blue);
    await expect(surface).toHaveCSS('box-shadow', `${blue} 0px 0px 0px 1px inset`);
    await input.blur();
    await expect(surface).not.toHaveCSS('border-top-color', blue);
  };

  await page.goto('/preview/navigation?section=ai');
  await checkField(page.getByRole('combobox', { name: 'Поиск по каталогу' }), '24px');
  await page.goto('/preview/navigation?section=ai');
  await checkField(page.getByRole('searchbox', { name: 'Поиск по решениям AI Hub' }), '8px');
  await page.goto('/preview/navigation?section=reports');
  await page.getByRole('button', { name: 'Фильтр «Отчёт»', exact: true }).click();
  await checkField(page.getByRole('searchbox', { name: 'Поиск значений' }), '8px');
});

test('single filter checks follow the draft and never turn into multiple choice',async({page})=>{
  await page.goto('/preview/navigation?section=sources');
  await page.getByRole('button',{name:'Фильтр: Описание',exact:true}).click();
  const group=page.getByRole('radiogroup',{name:'Описание',exact:true});
  await expect(group.locator('[data-selection-check]')).toHaveCount(1);
  await group.getByRole('radio',{name:'С описанием',exact:true}).check();
  await expect(group.locator('[data-selection-check]')).toHaveCount(1);
  await group.getByRole('radio',{name:'Без описания',exact:true}).check();
  await expect(group.locator('input:checked')).toHaveCount(1);
  await expect(group.locator('[data-selection-check]')).toHaveCount(1);
  await expect(group.getByRole('radio',{name:'С описанием',exact:true})).not.toBeChecked();
  await expect(page.locator('[data-source-id]')).toHaveCount(9);
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Фильтр: Описание',exact:true}).click();
  await expect(group.getByRole('radio',{name:'Все',exact:true})).toBeChecked();
  await expect(group.locator('[data-selection-check]')).toHaveCount(1);
});

test('sorting marks only the selected direction and retains the shared hover',async({page})=>{
  await page.goto('/preview/navigation?section=reports');
  await page.getByRole('button',{name:'Фильтр «Домен»',exact:true}).click();
  const sort=page.locator('[data-filter-sort]');
  await sort.getByRole('button',{name:'А → Я',exact:true}).click();
  await expect(sort.locator('[data-selection-check]')).toHaveCount(1);
  await sort.getByRole('button',{name:'Я → А',exact:true}).click();
  await expect(sort.locator('[data-selection-check]')).toHaveCount(1);
  await expect(sort.getByRole('button',{name:'А → Я',exact:true})).toHaveAttribute('aria-pressed','false');
  await sort.getByRole('button',{name:'Я → А',exact:true}).hover();
  await expect(sort.getByRole('button',{name:'Я → А',exact:true})).toHaveCSS('background-color','rgb(243, 244, 249)');
});

test('all standalone preview selectors use the same single selection surface',async({page})=>{
  for(const [url,label] of [
    ['/previews/home-controls.html','Источник'],
    ['/previews/column-filters.html','Пример фильтра'],
    ['/previews/news.html','Пример новостей'],
    ['/previews/news.html?case=reading','Категория'],
  ]) {
    await page.goto(url);
    const trigger=page.getByRole('combobox',{name:label,exact:true});
    await trigger.click();
    const popup=page.getByRole('listbox',{name:label,exact:true});
    await expect(popup.locator('[data-selection-check]')).toHaveCount(1);
    const next=popup.getByRole('option').last();
    const text=(await next.innerText()).trim();
    await next.hover();
    await expect(next).toHaveCSS('background-color','rgb(243, 244, 249)');
    await next.click();
    await expect(trigger).toHaveText(text);
    await trigger.click();
    await expect(popup.locator('[data-selection-check]')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  }
});
