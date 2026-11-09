import { expect, test } from '@playwright/test';

const entry = '/preview/navigation?section=dictionary';
const tablist = (page: import('@playwright/test').Page) => page.getByRole('tablist', { name: 'Содержимое бизнес-словаря' });

test('dictionary counters follow available results without changing object identity', async ({ page }) => {
  await page.setViewportSize({ width:1440, height:900 });
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error') errors.push(message.text());});
  await page.goto(entry);
  const workspace=page.locator('[data-dictionary-workspace]');
  await expect(page.getByRole('heading',{name:'Бизнес-словарь',exact:true})).toHaveCount(1);
  await expect(page.getByRole('banner')).toHaveCount(1);
  await expect(page.locator('aside')).toHaveCount(1);
  await expect(workspace.locator('[data-dictionary-total]')).toHaveText('20');
  await expect(workspace.locator('[data-dictionary-domain]')).toHaveCount(8);
  await expect(workspace.locator('[data-dictionary-term]')).toHaveCount(7);
  for (const name of ['Все 20', 'Термины 12', 'Бизнес-процессы', 'Домены 8']) {
    await expect(tablist(page).getByRole('tab', { name, exact: true })).toBeVisible();
  }
  await expect(workspace.getByRole('heading',{name:/Домены\s*8/})).toBeVisible();
  await expect(workspace.getByRole('heading',{name:/Термины\s*12/})).toBeVisible();
  const groups = workspace.locator('[data-dictionary-results] > section[data-collapsed]');
  const domains = groups.nth(0);
  const terms = groups.nth(1);
  const domainToggle = domains.getByRole('button', { name:/Домены\s*8/ });
  const termToggle = terms.getByRole('button', { name:/Термины\s*12/ });
  const domainBody = domains.locator(':scope > [data-open]');
  const termBody = terms.locator(':scope > [data-open]');
  const backdrop = workspace.getByRole('region', { name:'Содержимое выбранной вкладки словаря' }).locator('..');
  const backdropBox = await backdrop.boundingBox();
  await expect(domainToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(termToggle).toHaveAttribute('aria-expanded', 'true');
  await domainToggle.click();
  await expect(domainToggle).toBeFocused();
  await expect(domainBody).toHaveAttribute('inert', '');
  await expect(domainBody).toBeHidden();
  await expect(termBody).toBeVisible();
  await expect(domainToggle.locator('span')).toHaveCSS('background-color', 'rgb(0, 123, 252)');
  await expect(domains).toHaveCSS('border-bottom', '1px solid rgb(226, 228, 234)');
  await expect(workspace.locator('[data-dictionary-total]')).toHaveText('20');
  await expect(page).toHaveURL(entry);
  await termToggle.press('Space');
  await expect(termBody).toBeHidden();
  expect(await backdrop.boundingBox()).toEqual(backdropBox);
  await expect(backdrop).toHaveCSS('background-color', 'rgb(243, 244, 249)');
  await expect(backdrop).toHaveCSS('border-bottom-left-radius', '16px');
  await expect(backdrop).toHaveCSS('border-bottom-right-radius', '16px');
  await expect(terms).toHaveCSS('border-bottom-width', '0px');
  await domainToggle.press('Enter');
  await expect(domainBody).toBeVisible();
  await expect(termBody).toBeHidden();
  await expect(domains).toHaveCSS('border-bottom-width', '0px');
  await termToggle.press('Enter');
  await expect(termBody).toBeVisible();
  expect(await backdrop.boundingBox()).toEqual(backdropBox);
  const bcr=workspace.locator('[data-dictionary-term="term-bcr"]');
  const identity=await bcr.locator('dl').textContent();
  const geometry=await bcr.locator('dl>div').evaluateAll(cells=>cells.map(cell=>({width:cell.getBoundingClientRect().width,gap:getComputedStyle(cell).gap,padding:getComputedStyle(cell).padding})));
  expect(geometry.map(cell=>cell.width)).toEqual([623,231.5,231.5]);
  expect(geometry.every(cell=>cell.gap==='4px'&&cell.padding==='16px')).toBe(true);
  await tablist(page).getByRole('tab',{name:'Термины 12',exact:true}).click();
  await expect(workspace.locator('[data-dictionary-total]')).toHaveText('12');
  await expect(workspace.locator('[data-dictionary-term]')).toHaveCount(12);
  await expect(workspace.getByRole('button',{name:'Тип термина Все типы',exact:true})).toBeVisible();
  await expect(workspace.getByRole('button',{name:'Домен Все домены',exact:true})).toBeVisible();
  await expect(workspace.getByRole('button',{name:'Статус Все статусы',exact:true})).toBeVisible();
  await expect(workspace.getByRole('button',{name:'Владелец Все владельцы',exact:true})).toBeVisible();
  await expect(workspace.locator('[data-dictionary-filters]')).toHaveCSS('height','40px');
  expect(await bcr.locator('dl').textContent()).toBe(identity);
  await expect(workspace.locator('[data-description-complete="false"]')).toHaveText(/дашборды…$/);
  await tablist(page).getByRole('tab',{name:'Домены 8',exact:true}).click();
  await expect(workspace.locator('[data-dictionary-total]')).toHaveText('8');
  await expect(workspace.locator('[data-dictionary-domain]')).toHaveCount(8);
  await expect(workspace.locator('[data-dictionary-filters]')).toHaveCount(0);
  for(const row of await workspace.locator('[data-dictionary-domain]').all()){
    expect((await row.boundingBox())?.height).toBe(40);
    await expect(row.locator('img')).toHaveAttribute('src','/icons/reports/domain-group.svg');
    await expect(row.locator('img')).toHaveCSS('width','16px');
    await expect(row.locator('span').first()).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
    const spacing = await row.evaluate(element => {
      const icon = element.querySelector('img')!.getBoundingClientRect();
      const label = element.lastElementChild!.getBoundingClientRect();
      return {
        left: icon.left - element.getBoundingClientRect().left - element.clientLeft,
        right: label.left - icon.right,
      };
    });
    expect(spacing).toEqual({ left: 8, right: 8 });
  }
  expect(errors).toEqual([]);
});

test('dictionary keyboard, history and honest action boundaries preserve catalog data',async({page})=>{
  await page.goto(entry);
  const tabs=tablist(page);
  await tabs.getByRole('tab',{name:'Все 20',exact:true}).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab',{name:'Термины 12',exact:true})).toBeFocused();
  await expect(tabs.getByRole('tab',{name:'Термины 12',exact:true})).toHaveAttribute('aria-selected','true');
  await page.reload();
  await expect(page.locator('[data-dictionary-term]')).toHaveCount(12);
  await page.getByRole('button',{name:'Редактировать термин «Human Resources (HR)»',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Human Resources (HR)');
  await expect(page.getByRole('status')).toContainText('пока не подключено');
  await page.getByRole('button',{name:'Закрыть уведомление'}).click();
  const status = page.getByRole('button', { name: 'Статус Все статусы', exact: true });
  await status.press('Enter');
  await expect(page.getByRole('radio', { name: 'Утверждён', exact: true })).toBeVisible();
  await expect(page.getByRole('searchbox', { name: 'Поиск значений' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(status).toHaveAttribute('aria-expanded', 'false');
  await expect(status).toBeFocused();
  await expect(page.locator('[data-dictionary-term]')).toHaveCount(12);
  await tabs.getByRole('tab',{name:'Термины 12',exact:true}).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab',{name:'Бизнес-процессы',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.getByRole('heading',{name:'Бизнес-процессы недоступны',exact:true})).toBeVisible();
  await expect(page.locator('[data-dictionary-total]')).toHaveCount(0);
  await page.keyboard.press('End');
  await expect(tabs.getByRole('tab',{name:'Домены 8',exact:true})).toBeFocused();
  await expect(page.locator('[data-dictionary-domain]')).toHaveCount(8);
  await page.goBack();
  await expect(tabs.getByRole('tab',{name:'Бизнес-процессы',exact:true})).toHaveAttribute('aria-selected','true');
  await page.goForward();
  await expect(page.locator('[data-dictionary-domain]')).toHaveCount(8);
  await tabs.getByRole('tab',{name:'Домены 8',exact:true}).press('Home');
  await expect(page.locator('[data-dictionary-term]')).toHaveCount(7);
  await expect(page).not.toHaveURL(/dictionaryTab=/);
});

test('dictionary filters its known objects by type, domain, status and owner', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(entry);
  const workspace = page.locator('[data-dictionary-workspace]');
  const domains = workspace.locator('[data-dictionary-domain]');
  const terms = workspace.locator('[data-dictionary-term]');
  const field = (id: string) => workspace.locator(`[data-multi-select="${id}"]`);
  const toggle = (id: string) => field(id).locator('[data-panel-field]');
  const apply = (name: string) => page.getByRole('checkbox', { name, exact: true });
  const button = (name: string) => workspace.getByRole('button', { name, exact: true });
  const radio = (name: string) => page.getByRole('radio', { name, exact: true });
  const expectPopupWidth = async (label: string, trigger: ReturnType<typeof button>) => {
    const popup = page.getByRole('dialog', { name: `Значения фильтра: ${label}`, exact: true });
    const width = await trigger.evaluate(element => getComputedStyle(element).width);
    await expect(popup).toHaveCSS('width', width);
    await expect(popup.locator('[data-dropdown-surface]')).toHaveCSS('width', width);
  };
  await button('Тип Все типы').click();
  await expectPopupWidth('Тип', button('Тип Все типы'));
  await expect(page.getByRole('searchbox', { name: 'Поиск значений' })).toHaveCount(0);
  await expect(page.getByRole('radio')).toHaveCount(3);
  await expect(radio('Все')).toBeChecked();
  await page.screenshot({ path: testInfo.outputPath('dictionary-type-options.png'), animations: 'disabled' });
  await radio('Домен').click();
  await expect(domains).toHaveCount(8);
  await expect(terms).toHaveCount(0);
  await expect(tablist(page).getByRole('tab', { name: 'Все 8', exact: true })).toBeVisible();
  await expect(tablist(page).getByRole('tab', { name: 'Термины 12', exact: true })).toBeVisible();
  await button('Тип Домен').click();
  await expect(radio('Домен')).toBeChecked();
  await radio('Бизнес-термин').click();
  await expect(terms).toHaveCount(12);
  await expect(domains).toHaveCount(0);
  await button('Тип Бизнес-термин').click();
  await expect(radio('Бизнес-термин')).toBeChecked();
  await expect(radio('Домен')).not.toBeChecked();
  await radio('Все').click();
  await expect(domains).toHaveCount(8);
  await expect(terms).toHaveCount(7);
  await toggle('domain').click();
  await expectPopupWidth('Домен', toggle('domain'));
  await page.setViewportSize({ width: 1920, height: 900 });
  await expectPopupWidth('Домен', toggle('domain'));
  await page.setViewportSize({ width: 1440, height: 900 });
  await expectPopupWidth('Домен', toggle('domain'));
  await apply('10D SSA').click();
  await expect(domains).toHaveCount(1);
  await expect(terms).toHaveCount(0);
  await apply('Без домена').click();
  await expect(terms).toHaveCount(12);
  await expect(workspace.locator('[data-dictionary-total]')).toHaveText('13');
  await page.screenshot({ path: testInfo.outputPath('dictionary-all-filter.png'), animations: 'disabled' });
  for (const label of ['AI-агенты', 'BIM - моделирование', 'BI-sup']) {
    await apply(label).click();
    await expect(apply(label)).toBeChecked();
  }
  await page.keyboard.press('Escape');
  const counter = field('domain').locator('[data-multi-select-counter]');
  await counter.hover();
  const preview = page.getByRole('dialog', { name: 'Скрытые выбранные значения: Домен', exact: true });
  const displayed = await field('domain').locator('[data-selected-tag]').count();
  await expect(counter).toHaveText(`+${5 - displayed}`);
  await expect(preview.getByRole('listitem')).toHaveText(['10D SSA', 'Без домена', 'AI-агенты', 'BIM - моделирование', 'BI-sup'].slice(displayed));
  await page.keyboard.press('Escape');
  await expect(preview).toHaveCount(0);
  await field('domain').getByRole('button', { name: 'Очистить выбор: Домен' }).click();
  await expect(domains).toHaveCount(8);
  await expect(workspace.locator('[data-dictionary-total]')).toHaveText('20');

  await button('Владелец Все владельцы').click();
  await expect(page.getByRole('radio')).toHaveCount(2);
  await radio('Не указан').click();
  await expect(terms).toHaveCount(7);
  await expect(domains).toHaveCount(8);
  await button('Владелец Не указан').click();
  await radio('Все').click();
  await expect(domains).toHaveCount(8);

  await tablist(page).getByRole('tab', { name: 'Термины 12', exact: true }).click();
  await button('Тип термина Все типы').click();
  await radio('Бизнес-термин').click();
  await expect(button('Тип термина Бизнес-термин')).toBeVisible();
  await toggle('domain').click();
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await apply('Без домена').click();
  await expect(apply('Без домена')).toBeChecked();
  await page.keyboard.press('Escape');
  await button('Владелец Все владельцы').click();
  await expect(page.getByRole('radio')).toHaveCount(2);
  await radio('Не указан').click();
  await expect(button('Владелец Не указан')).toBeVisible();
  await button('Статус Все статусы').click();
  await expectPopupWidth('Статус', button('Статус Все статусы'));
  await radio('Утверждён').click();
  await expect(terms).toHaveCount(4);
  await expect(workspace.locator('[data-dictionary-total]')).toHaveText('4');
  await page.screenshot({ path: testInfo.outputPath('dictionary-terms-filter.png'), animations: 'disabled' });
  const search = page.getByRole('combobox', { name: 'Поиск по каталогу' });
  await search.fill('денежных средств');
  await page.getByRole('rowgroup', { name: 'Бизнес-словарь' }).getByRole('button').click();
  await expect(workspace.locator('mark')).toHaveText('денежных средств');
  await expect(field('domain')).toContainText('Без домена');
  await tablist(page).getByRole('tab', { name: 'Домены 8', exact: true }).click();
  await expect(workspace.locator('[data-dictionary-filters]')).toHaveCount(0);
  await expect(domains).toHaveCount(8);
  await expect(tablist(page).getByRole('tab', { name: 'Термины 4', exact: true })).toHaveAttribute('aria-selected', 'false');

  await page.goto(entry + '&dictionary.all.status=' + encodeURIComponent('value:Утверждён'));
  await expect(tablist(page).getByRole('tab', { name: 'Все 12', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(tablist(page).getByRole('tab', { name: 'Термины 12', exact: true })).toBeVisible();
  await expect(tablist(page).getByRole('tab', { name: 'Домены 8', exact: true })).toBeVisible();
  await expect(workspace.locator('[data-dictionary-total]')).toHaveText('12');
  await expect(workspace.locator('[data-dictionary-results] h2')).toHaveText([/Домены\s*8/, /Термины\s*4/]);
  await expect(terms).toHaveCount(4);
  await expect(domains).toHaveCount(8);
  await expect(page.getByRole('navigation', { name: 'Разделы каталога' }).getByRole('button', { name: 'Бизнес-словарь' })).toHaveText('Бизнес-словарь20');
});

test('dictionary filter row narrows its selects and resets all filters of the active tab', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const params = new URLSearchParams({ 'dictionary.terms.status': 'value:Утверждён' });
  await page.goto(entry + '&' + params);
  const row = page.locator('[data-dictionary-filters]');
  const reset = row.getByRole('button', { name: 'Сбросить', exact: true });
  const type = row.getByRole('button', { name: 'Тип Все типы', exact: true });
  await expect(reset).toHaveCount(0);
  const rowWidth = (await row.boundingBox())!.width;
  const boxes = await Promise.all((await row.locator('button[aria-haspopup="dialog"]').all()).map(button => button.boundingBox()));
  expect(boxes).toHaveLength(4);
  for (const [index, box] of boxes.entries()) {
    expect(box!.width).toBeCloseTo((rowWidth - 48) / 5, 1);
    if (index > 0) expect(box!.x - boxes[index - 1]!.x - boxes[index - 1]!.width).toBe(8);
  }
  await type.click();
  await page.getByRole('radio', { name: 'Бизнес-термин', exact: true }).click();
  await expect(reset).toBeVisible();
  const resetBox = (await reset.boundingBox())!;
  expect(resetBox.height).toBe(boxes[3]!.height);
  expect(resetBox.x - boxes[3]!.x - boxes[3]!.width).toBe(12);
  await reset.click();
  await expect(reset).toHaveCount(0);
  await expect(type).toBeFocused();
  await expect(tablist(page).getByRole('tab', { name: 'Все 20', exact: true })).toHaveAttribute('aria-selected', 'true');

  params.set('dictionary.all.type', 'value:Бизнес-термин');
  params.set('dictionary.all.domain', 'missing');
  params.set('dictionary.all.status', 'value:Утверждён');
  params.set('dictionary.all.owner', 'missing');
  await page.goto(entry + '&' + params);
  await expect(tablist(page).getByRole('tab', { name: 'Все 4', exact: true })).toHaveAttribute('aria-selected', 'true');
  await reset.press('Enter');
  await expect(reset).toHaveCount(0);
  await expect(page).not.toHaveURL(/dictionary\.all\./);
  await expect(page).toHaveURL(/dictionary\.terms\.status=/);
  await expect(tablist(page).getByRole('tab', { name: 'Все 20', exact: true })).toHaveAttribute('aria-selected', 'true');
  await tablist(page).getByRole('tab', { name: 'Термины 4', exact: true }).click();
  await expect(reset).toBeVisible();
  await page.setViewportSize({ width: 800, height: 900 });
  const compactRow = (await row.boundingBox())!;
  const compactReset = (await reset.boundingBox())!;
  const compactFields = await Promise.all((await row.locator('button[aria-haspopup="dialog"]').all()).map(button => button.boundingBox()));
  expect(compactFields[0]!.width).toBeCloseTo((compactRow.width - 16) * .4, 1);
  expect(compactFields[1]!.x - compactFields[0]!.x - compactFields[0]!.width).toBe(8);
  expect(compactReset.y).toBeGreaterThan(compactFields[3]!.y + compactFields[3]!.height);
  expect(compactReset.x + compactReset.width).toBe(compactRow.x + compactRow.width);
  await reset.click();
  await expect(reset).toHaveCount(0);
  await expect(tablist(page).getByRole('tab', { name: 'Термины 12', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('dictionary remains scrollable at 1024/1440/1920 with either navigation width',async({page})=>{
  await page.goto(entry+'&dictionaryTab=terms');
  for(const width of [1024,1440,1920]){
    await page.setViewportSize({width,height:width===1024?768:900});
    for(const collapsed of [false,true]){
      if(collapsed){
        await page.getByRole('button',{name:'Свернуть панель',exact:true}).focus();
        await page.getByRole('button',{name:'Свернуть панель',exact:true}).press('Enter');
        await expect.poll(async()=>Math.round((await page.locator('aside').boundingBox())!.width)).toBe(64);
      }
      const last=page.locator('[data-dictionary-term="term-ssa"]');
      await last.scrollIntoViewIfNeeded();
      await expect(last.getByRole('button')).toBeInViewport();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      expect(await page.locator('[data-dictionary-workspace]').evaluate(root=>root.scrollWidth<=root.clientWidth)).toBe(true);
      if(collapsed){
        await page.getByRole('button',{name:'Развернуть панель',exact:true}).focus();
        await page.getByRole('button',{name:'Развернуть панель',exact:true}).press('Enter');
        await expect.poll(async()=>Math.round((await page.locator('aside').boundingBox())!.width)).toBe(280);
      }
    }
  }
});

test('pins the dictionary header and paginates terms without losing search or filters', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto(entry + '&dictionaryTab=terms&paginationDemo=1');
  const workspace = page.locator('[data-dictionary-workspace]');
  const chrome = workspace.locator('[data-dictionary-chrome]');
  const scroll = workspace.getByRole('region', { name: 'Содержимое выбранной вкладки словаря' });
  const frame = scroll.locator('..');
  const pager = workspace.getByRole('navigation', { name: 'Страницы терминов' });
  const cards = workspace.locator('[data-dictionary-term]');
  const top = (await chrome.boundingBox())!.y;
  const tabsTop = (await tablist(page).boundingBox())!.y;
  const titleRow = chrome.getByRole('heading', { name: 'Бизнес-словарь', exact: true }).locator('..');
  const description = chrome.locator('[data-detail-secondary]');
  const footer = (await pager.boundingBox())!;
  const footerTop = footer.y;
  expect(footerTop + footer.height).toBe(page.viewportSize()!.height);

  await expect(chrome).toHaveCSS('box-shadow', 'none');
  await expect(frame).toHaveCSS('padding-top', '16px');
  await expect(pager).toContainText('1–15 из 35');
  await pager.getByRole('button', { name: 'Следующая страница' }).click();
  await expect(pager).toContainText('16–30 из 35');
  await expect(cards).toHaveCount(15);
  await pager.getByRole('button', { name: '3', exact: true }).click();
  await expect(pager).toContainText('31–35 из 35');
  await expect(tablist(page).getByRole('tab', { name: 'Термины 35', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(pager.getByRole('button', { name: 'Следующая страница' })).toBeDisabled();
  await expect(cards).toHaveCount(5);
  await scroll.evaluate(el => { el.scrollTop = el.scrollHeight; });
  expect(await scroll.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await expect(workspace).toHaveAttribute('data-detail-compact', 'true');
  await expect(description).toBeHidden();
  await expect(chrome).toHaveCSS('box-shadow', 'none');
  expect((await chrome.boundingBox())!.y).toBe(top);
  const frameBox = (await frame.boundingBox())!;
  const chromeBox = (await chrome.boundingBox())!;
  expect(frameBox.y - chromeBox.y - chromeBox.height).toBe(0);
  expect((await scroll.boundingBox())!.y - frameBox.y).toBe(16);
  const titleBox = (await titleRow.boundingBox())!;
  expect((await tablist(page).boundingBox())!.y - titleBox.y - titleBox.height).toBe(16);
  expect((await pager.boundingBox())!.y).toBe(footerTop);
  const last = (await cards.last().boundingBox())!;
  expect(last.y + last.height).toBeLessThanOrEqual(footerTop);

  await scroll.press('Home');
  await expect.poll(() => scroll.evaluate(el => el.scrollTop)).toBe(0);
  await expect(chrome).toHaveCSS('box-shadow', 'none');
  await scroll.evaluate(el => { el.scrollTop = 32; });
  await expect(workspace).toHaveAttribute('data-detail-compact', 'true');
  await expect(chrome).toHaveCSS('box-shadow', 'none');

  await workspace.getByRole('button', { name: 'Статус Все статусы', exact: true }).click();
  await page.getByRole('radio', { name: 'Утверждён', exact: true }).click();
  await expect(pager).toHaveCount(0);
  expect(await scroll.evaluate(el => el.scrollTop)).toBe(0);
  await expect(description).toBeVisible();
  await expect(chrome).toHaveCSS('box-shadow', 'none');
  await expect.poll(async () => (await tablist(page).boundingBox())!.y).toBe(tabsTop);
  await workspace.getByRole('button', { name: 'Статус Утверждён', exact: true }).click();
  await page.getByRole('radio', { name: 'Все', exact: true }).click();

  await page.getByRole('combobox', { name: 'Поиск по каталогу' }).fill('Соглашение об уровне сервиса');
  await page.getByRole('rowgroup', { name: 'Бизнес-словарь' }).getByRole('button').click();
  await expect(pager.getByRole('button', { name: '1', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(workspace.locator('mark')).toHaveText('Соглашение об уровне сервиса');
  await expect(workspace.locator('mark')).toBeInViewport();
  await pager.getByRole('button', { name: '3', exact: true }).click();
  await expect(pager).toContainText('31–35 из 35');
  await expect(workspace.locator('mark')).toHaveCount(0);
});

test('keeps the top gray edge outside the scroll area in mixed results and domains', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 480 });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const tab of ['all', 'domains']) {
    await test.step(tab, async () => {
      await page.goto(entry + '&dictionaryTab=' + tab);
      const workspace = page.locator('[data-dictionary-workspace]');
      const chrome = workspace.locator('[data-dictionary-chrome]');
      const scroll = workspace.getByRole('region', { name: 'Содержимое выбранной вкладки словаря' });
      const frame = scroll.locator('..');
      await scroll.evaluate(element => { element.scrollTop = 64; });
      await expect(workspace).toHaveAttribute('data-detail-compact', 'true');
      await expect(chrome).toHaveCSS('box-shadow', 'none');
      await expect(chrome).toHaveCSS('padding-bottom', '16px');
      const surface = (await frame.boundingBox())!;
      expect((await scroll.boundingBox())!.y - surface.y).toBe(16);
      expect(await frame.evaluate(element => {
        const { x, y, width } = element.getBoundingClientRect();
        return document.elementFromPoint(x + width / 2, y + 8) === element;
      })).toBe(true);
    });
  }
});

test('dictionary entry returns through existing sidebar without duplicate shell or stale placeholder',async({page})=>{
  await page.goto('/preview/navigation?section=sources');
  const nav=page.getByRole('navigation',{name:'Разделы каталога'});
  await nav.getByRole('button',{name:'Бизнес-словарь',exact:true}).click();
  await tablist(page).getByRole('tab',{name:'Домены 8',exact:true}).click();
  await nav.getByRole('button',{name:'Источники',exact:true}).click();
  await expect(page.locator('[data-source-id]')).toHaveCount(9);
  await nav.getByRole('button',{name:'Бизнес-словарь',exact:true}).click();
  await expect(tablist(page).getByRole('tab',{name:/^Все/})).toHaveAttribute('aria-selected','true');
  await expect(page.locator('[data-dictionary-term]')).toHaveCount(7);
  await expect(page.getByRole('region',{name:'Содержимое раздела'})).toHaveCount(0);
  await expect(page.locator('[data-dictionary-workspace]')).toHaveCount(1);
});
