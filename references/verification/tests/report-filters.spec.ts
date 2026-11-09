import { expect, test } from '@playwright/test';

test('every table column menu gives its footer actions equal space on one row', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  for (const query of ['section=reports', 'section=home&segment=favorites', 'section=sources']) {
    await page.goto('/preview/navigation?' + query);
    const triggers = page.getByRole('columnheader').getByRole('button', { name: /^Фильтр(?: «|: )/ });
    await expect(triggers).not.toHaveCount(0);

    const count = await triggers.count();
    for (let index = 0; index < count; index += 1) {
      const trigger = triggers.nth(index);
      await test.step(`${query} — ${await trigger.getAttribute('aria-label')}`, async () => {
        await trigger.click();
        const menu = page.getByRole('dialog');
        const reset = menu.getByRole('button', { name: 'Сбросить', exact: true });
        const apply = menu.getByRole('button', { name: 'Применить', exact: true });
        await expect(reset).toBeVisible();
        await expect(apply).toBeVisible();
        const geometry = await apply.evaluate(button => {
          const footer = button.parentElement!;
          const footerBox = footer.getBoundingClientRect();
          const applyBox = button.getBoundingClientRect();
          const resetBox = footer.firstElementChild!.getBoundingClientRect();
          const style = getComputedStyle(footer);
          return {
            leftInset: resetBox.left - footerBox.left - parseFloat(style.borderLeftWidth),
            rightInset: footerBox.right - applyBox.right - parseFloat(style.borderRightWidth),
            topInset: resetBox.top - footerBox.top - parseFloat(style.borderTopWidth),
            bottomInset: footerBox.bottom - applyBox.bottom - parseFloat(style.borderBottomWidth),
            sameTop: resetBox.top === applyBox.top,
            sameWidth: resetBox.width === applyBox.width,
            gap: applyBox.left - resetBox.right,
          };
        });
        expect(geometry).toEqual({
          leftInset: 12, rightInset: 12, topInset: 12, bottomInset: 12, sameTop: true, sameWidth: true, gap: 8,
        });
        await page.keyboard.press('Escape');
        await expect(menu).toHaveCount(0);
      });
    }
  }
});

test('hovering a column indicator reveals only its own reset button', async ({ page }, testInfo) => {
  await page.goto('/preview/navigation?section=reports&tableCase=single-page');
  const filter = page.getByRole('button', { name: 'Фильтр «Домен»', exact: true });
  const column = page.getByRole('columnheader').filter({ has: filter });
  const dialog = page.getByRole('dialog', { name: 'Фильтр: Домен', exact: true });
  const clearFilter = column.getByRole('button', { name: 'Сбросить фильтр «Домен»' });
  const clearSort = column.getByRole('button', { name: 'Сбросить сортировку «Домен»' });
  const apply = dialog.getByRole('button', { name: 'Применить', exact: true });

  await filter.click();
  await dialog.getByRole('checkbox', { name: 'Гостеприимство', exact: true }).check();
  await dialog.getByRole('button', { name: 'А → Я', exact: true }).click();
  await apply.click();
  await expect(column).toHaveAttribute('aria-sort', 'ascending');
  await page.getByRole('heading', { name: 'Отчёты', exact: true }).hover();
  await expect(clearSort.locator('img')).toBeVisible();
  await expect(clearFilter.locator('svg')).toBeHidden();

  await filter.hover();
  await expect(clearFilter.locator('svg')).toBeHidden();
  await expect(clearSort.locator('svg')).toBeHidden();
  const resetBadge = clearFilter.locator('svg').locator('..');
  await expect(resetBadge).toHaveCSS('transition-property', 'opacity, visibility');
  await expect(resetBadge).toHaveCSS('transition-duration', '0.16s, 0s');
  await expect(resetBadge).toHaveCSS('opacity', '0');

  await clearFilter.hover();
  await expect(clearFilter.locator('svg')).toBeVisible();
  await expect(resetBadge).toHaveCSS('opacity', '1');
  await expect(resetBadge).toHaveCSS('background-color', 'rgb(129, 134, 142)');
  await expect(clearSort.locator('svg')).toBeHidden();
  await expect(clearSort.locator('img')).toBeVisible();

  const badgeAppearance = (svg: ReturnType<typeof clearFilter.locator>) => svg.evaluate(icon => {
    const circle = icon.parentElement!;
    const badge = getComputedStyle(circle);
    const outer = circle.getBoundingClientRect();
    const inner = icon.getBoundingClientRect();
    const centered = inner.x + inner.width / 2 === outer.x + outer.width / 2
      && inner.y + inner.height / 2 === outer.y + outer.height / 2;
    return [badge.backgroundColor, badge.color, badge.borderRadius, badge.width, badge.height, icon.getAttribute('width'), icon.getAttribute('stroke-width'), centered];
  });
  const columnBadge = await badgeAppearance(clearFilter.locator('svg'));
  const clearAll = page.getByRole('button', { name: 'Сбросить все фильтры: 1 атрибут', exact: true });
  await expect(clearAll).toHaveText('1');
  await clearAll.hover();
  await expect(clearAll.locator('svg')).toBeVisible();
  expect(columnBadge).toEqual(['rgb(129, 134, 142)', 'rgb(255, 255, 255)', '50%', '16px', '16px', '10', '2', true]);
  expect(await badgeAppearance(clearAll.locator('svg'))).toEqual([...columnBadge.slice(0, 3), '20px', '20px', '14', '2', true]);

  await clearSort.hover();
  await expect(clearSort.locator('svg')).toBeVisible();
  expect(await badgeAppearance(clearSort.locator('svg'))).toEqual(columnBadge);
  await expect(clearSort.locator('img')).toBeHidden();
  await expect(clearFilter.locator('svg')).toBeHidden();
  await expect(resetBadge).toHaveCSS('opacity', '0');
  await expect(clearFilter.locator('img')).toBeVisible();
  await column.screenshot({ path: testInfo.outputPath('column-reset-hover.png') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(resetBadge).toHaveCSS('transition-property', 'none');
  await clearSort.click();
  await expect(column).toHaveAttribute('aria-sort', 'none');
  await expect(clearFilter).toBeAttached();
  await expect(dialog).toHaveCount(0);

  await filter.click();
  await expect(dialog.getByRole('checkbox', { name: 'Гостеприимство', exact: true })).toBeChecked();
  await dialog.getByRole('button', { name: 'Я → А', exact: true }).click();
  await apply.click();
  await clearFilter.click();
  await expect(column).toHaveAttribute('aria-sort', 'descending');
  await expect(clearFilter).toHaveCount(0);
  await expect(dialog).toHaveCount(0);
  await expect(filter).toBeFocused();
});

test('dropdown items share the sidebar hover for single choice, checkboxes, sorting and search',async({page})=>{
  await page.goto('/preview/navigation?section=sources');
  const background=await page.locator('aside').evaluate(element=>getComputedStyle(element).backgroundColor);
  await page.getByRole('button',{name:'Фильтр: Описание',exact:true}).click();
  const single=page.getByRole('radio',{name:'С описанием',exact:true});
  const singleItem=single.locator('xpath=ancestor::*[@data-dropdown-item]');
  await singleItem.hover();
  await expect(singleItem).toHaveCSS('background-color',background);
  await single.check();
  await expect(single).toBeChecked();
  await expect(page.locator('[data-source-id]')).toHaveCount(9);
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Фильтр: Источник',exact:true}).click();
  const multiple=page.getByRole('checkbox',{name:'SQL Server',exact:true});
  const multipleItem=multiple.locator('xpath=ancestor::*[@data-dropdown-item]');
  await multipleItem.hover();
  await expect(multipleItem).toHaveCSS('background-color',background);
  await multiple.check();
  await expect(multiple).toBeChecked();
  await page.keyboard.press('Escape');
  await page.goto('/preview/navigation?section=reports');
  await page.getByRole('button',{name:'Фильтр «Домен»',exact:true}).click();
  const sort=page.getByRole('button',{name:'А → Я',exact:true});
  await sort.hover();
  await expect(sort).toHaveCSS('background-color',background);
  await sort.click();
  await expect(sort).toHaveAttribute('aria-pressed','true');
  await page.keyboard.press('Escape');
  const field=page.getByRole('combobox',{name:'Поиск по каталогу',exact:true});
  await field.fill('отчёт');
  const result=page.getByRole('grid',{name:'Результаты поиска'}).getByRole('row')
    .filter({has:page.getByRole('gridcell')}).first();
  await result.hover();
  await expect(result).toHaveCSS('background-color',background);
  await field.press('ArrowDown');
  await expect(result).toHaveAttribute('aria-selected','true');
  await expect(result).toHaveCSS('background-color',background);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(result).toHaveCSS('transition-duration','0s');
});

test('column filters keep draft changes separate, combine conditions, and preserve the selected object', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text()); });
  await page.goto('/preview/navigation?tableCase=legacy-two-pages');
  const reports = page.getByRole('navigation', { name: 'Разделы каталога' }).getByRole('button', { name: 'Отчёты', exact: true });
  await reports.click();
  const table = page.getByRole('region', { name: 'Таблица отчётов', exact: true });
  const domain = table.getByRole('button', { name: 'Фильтр «Домен»', exact: true });
  const dialog = page.getByRole('dialog');
  const row = (id: string) => table.locator(`[data-table-report-id="${id}"]`);
  const rows = table.locator('[data-table-report-id]');
  const check = (label: string) => dialog.getByRole('checkbox', { name: label, exact: true });
  await domain.click();
  await expect(dialog).toHaveAccessibleName('Фильтр: Домен');
  const anchor = await domain.locator('xpath=ancestor::*[@role="columnheader"]').boundingBox();
  const bounds = await dialog.boundingBox();
  expect(bounds?.x).toBe(anchor?.x);
  expect(bounds?.y).toBe(anchor!.y + anchor!.height + 8);
  expect(bounds?.width).toBe(320);
  await check('Гостеприимство').check();
  await check('Финансы').check();
  await expect(rows).toHaveCount(8);
  await dialog.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(rows).toHaveCount(6);
  await expect(table.getByRole('button', { name: 'Сбросить фильтр «Домен»' })).toBeVisible();
  await domain.click();
  await check('Финансы').uncheck();
  await page.getByRole('heading', { name: 'Отчёты', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(rows).toHaveCount(6);
  await domain.click();
  await expect(check('Финансы')).toBeChecked();
  await dialog.getByRole('button', { name: 'Сбросить', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(rows).toHaveCount(8);
  await expect(domain).toBeFocused();
  await domain.click();
  await expect(check('Гостеприимство')).not.toBeChecked();
  await expect(check('Финансы')).not.toBeChecked();
  await check('Гостеприимство').check();
  await check('Финансы').check();
  await dialog.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(rows).toHaveCount(6);
  await domain.click();
  await expect(check('Финансы')).toBeChecked();
  await domain.click();
  await expect(dialog).toHaveCount(0);
  await domain.click();
  await check('Финансы').uncheck();
  await dialog.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(rows).toHaveCount(5);
  await table.getByRole('button', { name: 'Фильтр «Мастер-система»', exact: true }).click();
  await check('1С ЖКХ').check();
  await dialog.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(row('demo-report-debt')).toBeVisible();
  await table.getByRole('button', { name: 'Сбросить фильтр «Мастер-система»' }).click();
  await expect(rows).toHaveCount(5);
  await table.getByRole('button', { name: 'Фильтр «Мастер-система»', exact: true }).click();
  await check('1С ERP').check();
  await dialog.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Отчёты не найдены', exact: true })).toBeVisible();
  await expect(table).toHaveCount(0);
  await page.getByRole('button', { name: 'Открыть фильтры отчётов', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Фильтры отчётов', exact: true });
  await panel.locator('[data-multi-select="masterSystem"] [data-multi-select-clear]').click();
  await panel.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(rows).toHaveCount(5);
  await domain.click();
  await dialog.getByRole('button', { name: 'Сбросить', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(rows).toHaveCount(8);
  await expect(table.getByRole('button', { name: 'Сбросить фильтр «Домен»' })).toHaveCount(0);
  await table.getByRole('button', { name: 'Следующая страница', exact: true }).click();
  await expect(row('demo-report-finance-plan')).toBeVisible();
  await table.getByRole('button', { name: 'Фильтр «Отчёт»', exact: true }).click();
  await dialog.getByRole('searchbox', { name: 'Поиск значений' }).fill('ВЫПОЛНЕНИЕ');
  await expect(dialog.getByRole('checkbox')).toHaveCount(1);
  await check('Выполнение плана поступлений').check();
  await dialog.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(row('demo-report-finance-plan')).toBeVisible();
  await expect(table.getByRole('navigation', { name: 'Страницы отчётов' })).toHaveCount(0);
  await row('demo-report-finance-plan').getByRole('cell').nth(2).click();
  await expect(page.locator('[data-report-id]')).toHaveAttribute('data-report-id', 'demo-report-finance-plan');
  await expect(page.locator('dl')).toContainText('1С ERP');
  await page.getByRole('navigation', { name: 'Хлебные крошки' }).getByRole('button', { name: 'Отчёты', exact: true }).click();
  await expect(rows).toHaveCount(1);
  await table.getByRole('button', { name: 'Сбросить фильтр «Отчёт»' }).click();
  await expect(rows).toHaveCount(8);
  await page.screenshot({ path: 'verification/current/filters/reset.png', fullPage: false });
  await domain.click();
  await check('Гостеприимство').check();
  await page.screenshot({ path: 'verification/current/filters/draft.png', fullPage: false });
  await dialog.getByRole('button', { name: 'Применить', exact: true }).click();
  await page.mouse.move(300, 100);
  await page.screenshot({ path: 'verification/current/filters/applied.png', fullPage: false });
  expect(errors).toEqual([]);
});

test('column menus follow horizontal scrolling and stay within the right viewport edge', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/preview/navigation');
  await page.getByRole('navigation', { name: 'Разделы каталога' }).getByRole('button', { name: 'Отчёты', exact: true }).click();
  const table = page.getByRole('region', { name: 'Таблица отчётов', exact: true });
  const body = table.getByLabel('Прокрутка таблицы отчётов', { exact: true });
  const domain = table.getByRole('button', { name: 'Фильтр «Домен»', exact: true });
  const dialog = page.getByRole('dialog');
  await domain.click();
  await dialog.getByRole('checkbox', { name: 'Финансы', exact: true }).check();
  await body.evaluate(element => { element.scrollLeft = 288; });
  await expect.poll(async () => (await dialog.boundingBox())!.x).toBe(656);
  await expect(dialog).toBeVisible();
  const views = table.getByRole('button', { name: 'Фильтр «Просмотр»', exact: true });
  await views.click();
  await expect(dialog).toHaveAccessibleName('Фильтр: Просмотр');
  const headerBottom = await views.evaluate(button => button.closest('[role="columnheader"]')!.getBoundingClientRect().bottom);
  expect(await dialog.boundingBox()).toMatchObject({ x: 1120, y: headerBottom + 8, width: 320 });
  await expect(dialog.getByRole('spinbutton', { name: 'Последний просмотр: от', exact: true })).toHaveValue('');
  await dialog.getByRole('spinbutton', { name: 'Последний просмотр: от', exact: true }).fill('1');
  await dialog.getByRole('spinbutton', { name: 'Последний просмотр: до', exact: true }).fill('1');
  await dialog.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(table.locator('[data-table-report-id]')).toHaveCount(5);
  await expect(table.getByRole('button', { name: 'Сбросить фильтр «Домен»' })).toHaveCount(0);
  await table.getByRole('button', { name: 'Сбросить фильтр «Просмотр»' }).click();
  await table.getByRole('button', { name: 'Фильтр «Просмотр»', exact: true }).click();
  await page.screenshot({ path: 'verification/current/filters/edge-narrow.png', fullPage: false });
  await page.setViewportSize({ width: 1920, height: 900 });
  await expect.poll(async () => (await dialog.boundingBox())!.x).toBe(1600);
  expect((await dialog.boundingBox())!.x + (await dialog.boundingBox())!.width).toBe(1920);
  await page.screenshot({ path: 'verification/current/filters/edge-wide.png', fullPage: false });
});
