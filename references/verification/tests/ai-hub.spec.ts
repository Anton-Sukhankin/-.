import { expect, test } from '@playwright/test';

const entry = '/preview/navigation?section=ai';

test('the whole solution card opens its details and footer controls act independently', async ({ page }) => {
  await page.goto(entry);
  const catalog = page.getByRole('region', { name: 'Каталог AI Hub' });
  const card = catalog.locator('[data-ai-solution="failik"]');
  const detail = catalog.locator('[data-ai-detail]');
  const bookmark = card.getByRole('button', { name: /^Закладка/ });

  await card.getByText('ИИ-утилита', { exact: true }).hover();
  await expect(card.getByRole('heading').getByRole('button')).toHaveCSS('color', 'rgb(0, 103, 220)');
  await bookmark.click();
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');
  await expect(detail).toHaveCount(0);
  await card.getByRole('button', { name: /^Действия/ }).click();
  await page.getByRole('menuitem', { name: 'Открыть инструмент' }).click();
  await expect(catalog.getByText(/Адрес для .* не указан/)).toBeVisible();
  await expect(detail).toHaveCount(0);

  await card.getByText('ИИ-утилита', { exact: true }).click();
  await expect(detail).toHaveAttribute('data-ai-detail', 'failik');
  const passport = detail.getByRole('region', { name: 'Паспорт решения' });
  await expect(passport.getByText('Создано', { exact: true }).locator('..').locator('dd')).toHaveText('08.07.2026');
  await expect(passport.getByText('Обновлено', { exact: true }).locator('..').getByRole('img', { name: 'Нет значения' })).toBeVisible();
  await detail.getByRole('button', { name: 'Вернуться в каталог AI Hub' }).click();

  await card.locator('footer').click({ position: { x: 4, y: 12 } });
  await expect(detail).toHaveAttribute('data-ai-detail', 'failik');
});

test('AI Hub solution navigation animates only the changing content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      const root = document.documentElement;
      const target = this.matches('[data-ai-detail]') ? 'detail'
        : this.matches('[data-ai-results]') ? 'catalog'
        : this.matches('main') ? 'main' : 'other';
      root.dataset.testAiMotion = [root.dataset.testAiMotion, target].filter(Boolean).join(' ');
      return animate.apply(this, args);
    };
  });
  await page.goto(entry);
  const catalog = page.getByRole('region', { name: 'Каталог AI Hub' });
  const detail = catalog.locator('[data-ai-detail]');
  const open = catalog.getByRole('button', { name: 'fAIлик (Файловый ассистент)', exact: true });
  await open.click();
  await expect(detail).toHaveAttribute('data-ai-detail', 'failik');
  const list = catalog.getByRole('navigation', { name: 'Решения в текущей выдаче' });
  await list.getByRole('button', { name: /Помощник Комблок/ }).click();
  await expect(detail).toHaveAttribute('data-ai-detail', 'komblok');
  await detail.getByRole('button', { name: 'Вернуться в каталог AI Hub' }).click();
  await expect(open).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('data-test-ai-motion', 'detail detail catalog');
});

test('AI Hub detail collapses filters and keeps the search available', async ({ page }) => {
  const filters = new URLSearchParams({ 'ai.solution':'failik', 'ai.query':'файловый', 'ai.type':'ИИ-утилита', 'ai.ui':'1' });
  await page.goto(`${entry}&${filters}`);
  const panel = page.getByRole('group', { name:'Фильтры AI Hub' });
  const list = page.getByRole('navigation', { name:'Решения в текущей выдаче' });
  const hide = panel.getByRole('button', { name:'Свернуть', exact:true });
  const show = panel.getByRole('button', { name:'Развернуть', exact:true });
  const search = panel.getByRole('searchbox');
  const reset = panel.getByRole('button', { name:'Сбросить все фильтры: 2 атрибута', exact:true });
  await expect(list.getByRole('button')).toHaveCount(1);
  const expandedHeight = (await panel.boundingBox())!.height;
  await hide.press('Enter');
  await expect(show).toBeFocused();
  await expect(show).toHaveAttribute('aria-expanded', 'false');
  await expect(reset).toHaveText('2');
  await expect(search).toHaveValue('файловый');
  await expect(panel.getByRole('combobox')).toHaveCount(0);
  await expect.poll(async () => (await panel.boundingBox())!.height).toBeLessThan(expandedHeight);
  await expect(list.getByRole('button')).toHaveCount(1);

  await show.press('Enter');
  await expect(search).toHaveValue('файловый');
  await expect(panel.getByRole('combobox')).toHaveCount(0);
  await expect(panel.getByRole('button', { name:'Есть UI', exact:true })).toHaveAttribute('aria-pressed', 'true');

  await hide.press('Enter');
  await show.press('Tab');
  await expect(reset).toBeFocused();
  await reset.press('Enter');
  await expect(show).toBeFocused();
  await expect(reset).toHaveCount(0);
  await expect(search).toHaveValue('файловый');
  await expect(list.getByRole('button')).toHaveCount(1);
  await search.clear();
  await expect(list.getByRole('button')).toHaveCount(9);
  await expect(page.locator('[data-ai-detail]')).toHaveAttribute('data-ai-detail', 'failik');
  await show.press('Enter');
  await expect(search).toHaveValue('');
});

test('AI Hub details share filters and bookmarks and restore the catalog entry', async ({page},testInfo)=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto(entry);
  const catalog = page.getByRole('region',{name:'Каталог AI Hub'});
  await catalog.getByRole('button',{name:'Есть UI',exact:true}).click();
  await expect(catalog.locator('[data-ai-solution]')).toHaveCount(5);
  const sectionTitle = catalog.getByRole('heading',{name:'AI Hub',exact:true});
  const description = catalog.locator('[data-detail-secondary]');
  const filtersPanel = catalog.getByRole('group', { name:'Фильтры AI Hub' });
  const headerBoxes = () => Promise.all([sectionTitle.boundingBox(), description.boundingBox(), filtersPanel.boundingBox()]);
  const before = await headerBoxes();
  const open = catalog.getByRole('button',{name:'fAIлик (Файловый ассистент)',exact:true});
  await open.press('Enter');
  const detail = page.locator('[data-ai-detail]');
  await expect(detail).toHaveAttribute('data-ai-detail','failik');
  await expect(detail.getByRole('heading',{level:2})).toBeFocused();
  await expect(detail.getByText('Зяблов Сергей Александрович',{exact:true})).toBeVisible();
  await expect(detail.getByText('Осипов Алексей Юрьевич',{exact:true})).toBeVisible();
  await expect(detail.getByRole('listitem')).toHaveCount(4);
  await expect(detail.getByRole('heading',{name:'Пример запроса'})).toBeVisible();
  await expect(detail.getByText(/По завершении он присылает ссылку/)).toBeVisible();
  await expect(detail.getByText(/Просмотры/)).toHaveCount(0);
  const list = page.getByRole('navigation',{name:'Решения в текущей выдаче'});
  await expect(page.getByRole('navigation',{name:'Хлебные крошки'})).toHaveCount(0);
  expect(await headerBoxes()).toEqual(before);
  expect((await list.boundingBox())!.x - (await detail.boundingBox())!.x - (await detail.boundingBox())!.width).toBe(16);
  await expect(page.getByRole('button',{name:'К каталогу',exact:true})).toHaveCount(0);
  await expect(list.getByRole('button')).toHaveCount(5);
  await expect(list.locator('[aria-current="page"]')).toContainText('fAIлик');
  await detail.getByRole('button',{name:/^Закладка/}).click();
  await detail.getByRole('button',{name:'Инструкции',exact:true}).click();
  await expect(catalog.getByText(/Адрес для действия/)).toBeVisible();
  await expect(detail).toHaveAttribute('data-ai-detail','failik');
  const next = list.getByRole('button',{name:/Помощник Комблок/});
  await next.press('Space');
  await expect(detail).toHaveAttribute('data-ai-detail','komblok');
  await expect(next).toBeFocused();
  await expect(detail.getByRole('heading',{name:'Пример запроса'})).toBeVisible();
  await expect(detail.getByRole('region',{name:'Паспорт решения'}).getByText('Коммерческий блок',{exact:true})).toBeVisible();
  await catalog.getByRole('searchbox').fill('нет совпадений');
  await expect(list.getByRole('button')).toHaveCount(0);
  await expect(detail.getByRole('status')).toContainText('не входит');
  await expect(detail).toHaveAttribute('data-ai-detail','komblok');
  await detail.getByRole('button',{name:'Вернуться в каталог AI Hub',exact:true}).click();
  await expect(open).toBeFocused();
  await expect(catalog.getByRole('searchbox')).toHaveValue('');
  await expect(catalog.getByRole('button',{name:'Есть UI',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(catalog.locator('[data-ai-solution="failik"]').getByRole('button',{name:/^Закладка/})).toHaveAttribute('aria-pressed','true');
  await page.goForward();
  await expect(detail).toHaveAttribute('data-ai-detail','komblok');
  await page.goBack();
  await expect(open).toBeVisible();
  await page.goto(entry+'&ai.solution=missing');
  await expect(catalog.getByText('Решение не найдено. Показан каталог.')).toBeVisible();

  for(const width of [1440,1920,1050,900,600]){
    await page.setViewportSize({width,height:900});
    await page.goto(entry+'&ai.solution=failik');
    const passport = detail.getByRole('region',{name:'Паспорт решения'});
    await expect(passport.getByRole('heading',{name:'Паспорт решения'})).toBeVisible();
    await expect(passport.locator('dt')).toHaveText(['Тип','Статус','Домен','Платформа','Создано','Обновлено','Для кого','Что на выходе']);
    for (const label of ['Для кого','Что на выходе']) {
      await expect(passport.getByText(label,{exact:true}).locator('..')).toHaveCSS('grid-column','1 / -1');
    }
    await expect(detail.getByText('Осипов Алексей Юрьевич',{exact:true})).toBeVisible();
    expect(await page.getByRole('main').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    if(width===1440||width===1920||width===900) {
      await page.evaluate(()=>document.fonts.ready);
      await page.screenshot({path:testInfo.outputPath(`ai-detail-${width}.png`)});
    }
  }
  await page.goto(entry+'&ai.ui=1&ai.solution=failik');
  await detail.getByRole('button',{name:'Вернуться в каталог AI Hub',exact:true}).press('Enter');
  await expect(detail).toHaveCount(0);
  await expect(catalog.getByRole('button',{name:'Есть UI',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('all nine AI Hub solutions have a populated overview and aligned title actions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(entry);
  const cards = page.locator('[data-ai-solution]');
  await expect(cards).toHaveCount(9);
  const ids = await cards.evaluateAll(items => items.map(item => item.getAttribute('data-ai-solution')));
  for (const id of ids) {
    await page.goto(entry + '&ai.solution=' + id);
    const detail = page.locator('[data-ai-detail]');
    const passport = detail.getByRole('region', { name: 'Паспорт решения' });
    await expect(detail).toHaveAttribute('data-ai-detail', id!);
    await expect(detail.getByRole('heading', { name: 'Назначение' }).locator('..').locator('p').nth(1)).toBeVisible();
    await expect(detail.getByRole('listitem')).toHaveCount(4);
    await expect(detail.getByRole('heading', { name: 'Пример запроса' }).locator('..').locator('p')).not.toBeEmpty();
    for (const field of ['Для кого', 'Что на выходе']) {
      const value = passport.getByText(field, { exact: true }).locator('xpath=following-sibling::dd');
      await expect(value).not.toHaveText('—');
    }
    await expect(passport.getByText('Владелец', { exact: true })).toBeVisible();
    await expect(passport.getByText('Разработчик', { exact: true })).toBeVisible();
    const heading = (await detail.getByRole('heading', { level: 2 }).boundingBox())!;
    const back = detail.getByRole('button', { name:'Вернуться в каталог AI Hub' });
    const backBox = (await back.boundingBox())!;
    expect([backBox.width,backBox.height,heading.x-backBox.x-backBox.width]).toEqual([32,32,8]);
    await expect(back.locator('span')).toHaveCSS('transform', 'matrix(0, 1, -1, 0, 0, 0)');
    const bookmark = (await detail.getByRole('button', { name: /^Закладка/ }).boundingBox())!;
    expect(bookmark.x).toBeGreaterThanOrEqual(heading.x + heading.width);
    expect(bookmark.y + bookmark.height / 2).toBeCloseTo(heading.y + heading.height / 2, 0);
    const header = detail.locator('header');
    const actionName = /^(Открыть инструмент|Инструкции)$/;
    const actions = header.getByRole('button', { name: actionName }).or(header.getByRole('link', { name: actionName }));
    if (id === 'failik') await expect(actions).toHaveCount(2);
    for (const action of await actions.all()) {
      await expect(action).toHaveCSS('column-gap', '6px');
      await expect(action).toHaveCSS('height', '32px');
      await expect(action).toHaveCSS('border-radius', '999px');
      await expect(action).toHaveCSS('border-top-color', 'rgb(215, 230, 245)');
    }
  }
});

test('AI Hub reset follows the quick filters in the same wrapping row', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(entry);
  const panel = page.getByRole('group', { name: 'Фильтры AI Hub' });
  const firstChip = panel.getByRole('button', { name: 'Рекомендуются к переиспользованию', exact: true });
  const lastChip = panel.getByRole('button', { name: 'Есть UI', exact: true });
  const reset = panel.getByRole('button', { name: 'Сбросить фильтры', exact: true });
  await expect(reset).toHaveCount(0);
  await lastChip.click();
  await page.evaluate(() => document.fonts.ready);

  const alignment = async () => {
    const [first, last, button] = await Promise.all([firstChip.boundingBox(), lastChip.boundingBox(), reset.boundingBox()]);
    return {
      wrapped: last!.y > first!.y,
      offset: Math.round(button!.x - last!.x - last!.width),
      sameRow: button!.y === last!.y,
    };
  };
  await expect.poll(alignment).toEqual({ wrapped: false, offset: 8, sameRow: true });
  await page.setViewportSize({ width: 760, height: 820 });
  await expect.poll(alignment).toEqual({ wrapped: true, offset: 8, sameRow: true });

  await reset.click();
  await expect(reset).toHaveCount(0);
  await expect(lastChip).toHaveAttribute('aria-pressed', 'false');
});

test('AI Hub filters intersect, can be cleared, and preserve local catalog state', async ({page}) => {
  await page.goto(entry);
  const catalog = page.getByRole('region', {name:'Каталог AI Hub'});
  const cards = catalog.locator('article');
  const search = catalog.getByRole('searchbox');
  const filterButton = catalog.getByRole('button', { name:'Открыть фильтры AI Hub' });
  const dialog = page.getByRole('dialog', { name:'Фильтры', exact: true });
  const choose = async (field:string, option:string) => {
    await dialog.getByRole('button',{name:new RegExp(`^${field} `)}).click();
    const list = dialog.getByRole('dialog', {name:`Значения: ${field}`});
    await list.getByRole('checkbox',{name:option,exact:true}).check();
    await page.keyboard.press('Escape');
    await expect(list).toHaveCount(0);
  };
  await expect(cards).toHaveCount(9);
  const count = catalog.getByRole('status', { name:'Количество решений' });
  await expect(count).toHaveText('9');
  await expect(cards.getByText('Демо', { exact:true })).toHaveCount(3);
  for (const [query, title] of [['файловый','fAIлик'],['регламенты','Помощник Комблок'],['Зяблов Сергей','fAIлик'],['Команда Service Desk','SD Assistant']]) {
    await search.fill(query);
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText(title);
  }
  await search.clear();
  await expect(catalog.getByRole('combobox')).toHaveCount(0);
  await catalog.getByRole('button',{name:'Рекомендуются к переиспользованию'}).click();
  await filterButton.click();
  await expect(dialog.getByRole('button',{name:'Рекомендуются к переиспользованию'})).toHaveAttribute('aria-pressed','true');
  await choose('Тип','ИИ-помощник функций');
  await choose('Домен','Операции');
  await choose('Статус','Используется');
  await choose('Платформа','Assist');
  await dialog.getByRole('button',{name:'Есть UI'}).click();
  await expect(dialog.locator('[data-panel-count]')).toHaveText('6');
  await expect(page).not.toHaveURL(/ai\.type/);
  await dialog.getByRole('button',{name:'Применить',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(filterButton).toBeFocused();
  await expect(catalog.getByRole('button',{name:'Есть UI'})).toHaveAttribute('aria-pressed','true');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Помощник Комблок');
  await catalog.getByRole('button',{name:'Клуб талантов'}).click();
  await expect(catalog.getByRole('heading',{name:'Решения не найдены'})).toBeVisible();
  await expect(count).toHaveText('0');
  await catalog.getByRole('button',{name:'Сбросить фильтры'}).last().click();
  await expect(cards).toHaveCount(9);
  await catalog.getByRole('button',{name:'ИИ-пятница',exact:true}).click();
  await expect(cards).toHaveCount(2);
  const savedId = await cards.first().getAttribute('data-ai-solution');
  const favorite = cards.first().getByRole('button',{name:/^Закладка/});
  await favorite.focus();
  await expect(favorite).toBeFocused();
  await favorite.press('Space');
  await expect(favorite).toHaveAttribute('aria-pressed','true');
  await cards.first().getByRole('button',{name:/^Действия/}).click();
  await page.getByRole('menuitem',{name:'Открыть инструмент'}).click();
  await expect(catalog.getByText(/Адрес для .* не указан/)).toBeVisible();
  await expect(favorite).toHaveAttribute('aria-pressed','true');
  await expect(page).toHaveURL(/section=ai/);
  const nav = page.getByRole('navigation',{name:'Разделы каталога'});
  await nav.getByRole('button',{name:'Бизнес-словарь',exact:true}).click();
  await expect(page).toHaveURL(/section=dictionary$/);
  await nav.getByRole('button',{name:'AI Hub',exact:true}).click();
  await expect(cards).toHaveCount(9);
  await expect(catalog.locator(`[data-ai-solution="${savedId}"]`).getByRole('button',{name:/^Закладка/})).toHaveAttribute('aria-pressed','true');

  await page.setViewportSize({width:900,height:700});
  const main = page.getByRole('main');
  const title = catalog.getByRole('heading', { name: 'AI Hub', exact: true });
  const description = catalog.locator('[data-detail-secondary]');
  const filters = catalog.getByRole('group', { name: 'Фильтры AI Hub' });
  const shadowOpacity = () => filters.evaluate(element => getComputedStyle(element, '::after').opacity);
  await main.evaluate(element => { element.scrollTop = 0; });
  await expect(description).toBeVisible();
  await expect.poll(shadowOpacity).toBe('0');
  const titleTop = (await title.boundingBox())!.y;
  const position = await main.evaluate(element=>{
    element.scrollTop=160;
    return element.scrollTop;
  });
  expect(position).toBeGreaterThan(0);
  await expect(description).toBeHidden();
  await expect.poll(shadowOpacity).toBe('1');
  const shadow = await filters.evaluate(element => ({
    boxShadow: getComputedStyle(element, '::after').boxShadow,
    panelOverflow: getComputedStyle(element).overflowX,
    headerOverflow: getComputedStyle(element.parentElement!).overflowX,
  }));
  expect(shadow).toEqual({
    boxShadow: 'rgba(16, 29, 59, 0.24) 0px 10px 20px -7px',
    panelOverflow: 'visible',
    headerOverflow: 'visible',
  });
  const compactTitle = (await title.boundingBox())!;
  expect(compactTitle.y).toBe(titleTop);
  await expect.poll(async () => (await filters.boundingBox())!.y - compactTitle.y - compactTitle.height).toBe(16);
  await main.evaluate(element => { element.scrollTop = 0; });
  await expect.poll(shadowOpacity).toBe('0');
  await main.evaluate(element => { element.scrollTop = 160; });
  await expect.poll(shadowOpacity).toBe('1');
  const scrollBefore = await main.evaluate(element => element.scrollTop);
  await cards.first().locator('h2 button').press('Enter');
  await expect(catalog).toHaveAttribute('data-ai-view', 'detail');
  await expect(description).toBeVisible();
  expect(await main.evaluate(element => element.scrollTop)).toBe(0);
  await page.goBack();
  await expect(catalog).toHaveAttribute('data-ai-view', 'catalog');
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(scrollBefore);
  await nav.getByRole('button',{name:'Бизнес-словарь',exact:true}).click();
  await expect(page).toHaveURL(/section=dictionary$/);
  await nav.getByRole('button',{name:'AI Hub',exact:true}).click();
  await expect(page).toHaveURL(/section=ai$/);
  await expect.poll(()=>main.evaluate(element=>element.scrollTop)).toBe(0);
  await expect(description).toBeVisible();
});

test('AI Hub follows container widths, keeps long card actions on one row and has no horizontal overflow', async ({page},testInfo) => {
  const errors:string[] = [];
  page.on('pageerror',error=>errors.push(error.message));
  for (const [width,columns] of [[1440,2],[1920,3],[1911,2],[1912,3],[900,1],[600,1]]) {
    await page.setViewportSize({width,height:900});
    await page.goto(entry);
    const grid = page.locator('[data-ai-grid]');
    const cards = grid.locator('article');
    await expect(cards).toHaveCount(9);
    await page.evaluate(()=>document.fonts.ready);
    const layout = await grid.evaluate(node=>{
      const card = node.querySelectorAll('article')[1];
      return {
        columns: getComputedStyle(node).gridTemplateColumns.split(' ').length,
        overflow: [...document.querySelectorAll('main,[data-ai-grid],[data-ai-solution]')].some(element=>element.scrollWidth>element.clientWidth+1),
        footerRows: new Set([...card.querySelectorAll('footer button')].map(button=>Math.round(button.getBoundingClientRect().top))).size,
      };
    });
    expect(layout.columns).toBe(columns);
    expect(layout.overflow).toBe(false);
    if (width===1440||width===1920) {
      expect(layout.footerRows).toBe(1);
      await expect(cards.nth(1).getByText('Можно переиспользовать',{exact:true})).toBeVisible();
      await expect(cards.first().locator('[data-overflow-text]')).toHaveCSS('-webkit-line-clamp','2');
      await page.screenshot({path:testInfo.outputPath(`ai-hub-${width}.png`)});
    }
  }
  expect(errors).toEqual([]);
});

test('AI Hub switches views without losing filters, bookmarks, or the return target', async ({ page }) => {
  await page.goto(entry);
  const catalog = page.getByRole('region', { name:'Каталог AI Hub' });
  const table = catalog.getByRole('table', { name:'Решения AI Hub' });
  const cards = catalog.locator('[data-ai-grid]');
  const cardView = catalog.getByRole('button', { name:'Карточный вид' });
  const tableView = catalog.getByRole('button', { name:'Табличный вид' });
  const id = 'failik';
  const solution = catalog.locator(`[data-ai-solution="${id}"]`);
  const bookmark = solution.getByRole('button', { name:/^Закладка/ });

  await expect(cardView).toHaveAttribute('aria-pressed', 'true');
  await catalog.getByRole('button', { name:'Есть UI', exact:true }).click();
  const filtered = await cards.locator('article').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-ai-solution')));
  await bookmark.click();
  await tableView.click();
  await expect(tableView).toHaveAttribute('aria-pressed', 'true');
  await expect(table.locator('tbody tr')).toHaveCount(filtered.length);
  expect(await table.locator('tbody tr').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-ai-solution')))).toEqual(filtered);
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');

  const title = solution.getByRole('button', { name:'fAIлик (Файловый ассистент)', exact:true });
  await title.click();
  await expect(catalog.locator('[data-ai-detail]')).toHaveAttribute('data-ai-detail', id);
  await catalog.getByRole('button', { name:'Вернуться в каталог AI Hub' }).click();
  await expect(tableView).toHaveAttribute('aria-pressed', 'true');
  await expect(title).toBeFocused();
  await expect(catalog.getByRole('button', { name:'Есть UI', exact:true })).toHaveAttribute('aria-pressed', 'true');

  await catalog.getByRole('searchbox').fill('нет совпадений');
  await expect(catalog.getByText('Решения не найдены', { exact:true })).toBeVisible();
  await expect(table).toHaveCount(0);
  await catalog.getByRole('searchbox').clear();
  await expect(table).toBeVisible();
  await cardView.click();
  await expect(cards.locator('article')).toHaveCount(filtered.length);
});

test('AI Hub keeps the selected page while switching views', async ({ page }) => {
  await page.goto(entry + '&paginationDemo=1&ai.view=list');
  const catalog = page.getByRole('region', { name:'Каталог AI Hub' });
  const pages = catalog.getByRole('navigation', { name:'Страницы решений AI Hub' });
  await pages.getByRole('button', { name:'2', exact:true }).click();
  const results = catalog.locator('[data-ai-solution]');
  const ids = await results.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-ai-solution')));
  expect(ids).toHaveLength(15);
  for (const view of ['Карточный вид', 'Табличный вид']) {
    const switcher = catalog.getByRole('button', { name:view });
    await switcher.click();
    await expect(switcher).toHaveAttribute('aria-pressed', 'true');
    await expect(pages.getByRole('button', { name:'2', exact:true })).toHaveAttribute('aria-current', 'page');
    await expect(catalog.getByRole('status', { name:'Количество решений' })).toHaveText('35');
    expect(await results.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-ai-solution')))).toEqual(ids);
  }
});

test('AI Hub column filters share applied values with the dialog and reset independently of sorting', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto(entry + '&ai.view=list&ai.ui=1');
  const catalog = page.getByRole('region', { name: 'Каталог AI Hub' });
  const table = catalog.getByRole('table');
  const domain = table.getByRole('columnheader', { name: 'Домен' });
  const heading = domain.getByRole('button', { name: 'Фильтр «Домен»' });
  const menu = page.getByRole('dialog', { name: 'Фильтр: Домен' });
  const modal = page.getByRole('dialog', { name: 'Фильтры', exact: true });
  const values = () => new URL(page.url()).searchParams.getAll('ai.domain');

  await heading.click();
  await menu.getByRole('checkbox', { name: 'Операции', exact: true }).check();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  expect(values()).toEqual([]);

  await heading.click();
  await menu.getByRole('checkbox', { name: 'Операции', exact: true }).check();
  await menu.getByRole('checkbox', { name: 'Применимо ко всем доменам', exact: true }).check();
  await menu.getByRole('button', { name: 'Я → А' }).click();
  await menu.getByRole('button', { name: 'Применить' }).click();
  await expect(menu).toHaveCount(0);
  expect(values()).toEqual(['Операции', 'Все домены']);
  await expect(domain).toHaveAttribute('aria-sort', 'descending');
  const domains = await table.locator('tbody td:nth-child(3)').allTextContents();
  expect(domains).toContain('Операции');
  expect(domains).toContain('Все домены');
  expect(domains).toEqual([...domains].sort((a,b) => b.localeCompare(a,'ru')));

  await catalog.getByRole('button', { name: 'Открыть фильтры AI Hub' }).click();
  await expect(modal.locator('[data-panel-count]')).toHaveText('2');
  await expect(modal.getByRole('button', { name: 'Есть UI' })).toHaveAttribute('aria-pressed', 'true');
  await modal.getByRole('button', { name: 'Сбросить', exact: true }).click();
  await modal.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await expect(modal).toHaveCount(0);
  expect(values()).toHaveLength(2);
  await domain.getByRole('button', { name: 'Сбросить фильтр «Домен»' }).click();
  expect(values()).toEqual([]);
  await expect(domain).toHaveAttribute('aria-sort', 'descending');
  await expect(catalog.getByRole('button', { name: 'Есть UI' })).toHaveAttribute('aria-pressed', 'true');
  await domain.getByRole('button', { name: 'Сбросить сортировку «Домен»' }).click();
  await expect(domain).not.toHaveAttribute('aria-sort');
});

test('AI Hub tables pin the edges, keep the header aligned, and show overflow tips only when needed', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width:1920, height:900 });
  await page.goto(entry + '&ai.view=list');
  const scroller = page.getByRole('region', { name:'Прокрутка таблицы AI Hub' });
  const table = page.getByRole('table', { name:'Решения AI Hub' });
  const frame = scroller.locator('..');
  const title = table.getByRole('columnheader', { name:'Решение' });
  const actions = table.getByRole('columnheader', { name:'Действия' });
  const headers = table.getByRole('columnheader');
  const actionCell = table.locator('[data-ai-solution="failik"] td:last-child');
  const long = table.locator('[data-ai-solution="failik"] td:nth-child(2) [data-overflow-text]');
  const short = table.locator('[data-ai-solution="n8n"] td:nth-child(2) [data-overflow-text]');
  await expect(headers).toHaveCount(7);
  await expect(actions).toHaveText('');
  await page.evaluate(() => document.fonts.ready);
  expect(Math.abs((await headers.nth(1).boundingBox())!.width - 378)).toBeLessThan(1);
  expect(Math.abs((await headers.nth(2).boundingBox())!.width - 190)).toBeLessThan(1);
  expect((await title.boundingBox())!.width).toBe((await table.boundingBox())!.width - 1167);
  expect((await actions.boundingBox())!.width).toBe(96);
  expect(await actionCell.evaluate(cell => {
    const buttons = cell.querySelectorAll('button');
    const [first, second] = Array.from(buttons, button => button.getBoundingClientRect());
    const { left, right, width } = cell.getBoundingClientRect();
    return [width, first.width, second.width, second.left - first.right, first.left - left, right - second.right];
  })).toEqual([96, 32, 32, 8, 12, 12]);
  expect(await frame.evaluate(element => getComputedStyle(element, '::after').height)).toBe('1px');
  expect(await table.locator('th, td').evaluateAll(cells =>
    cells.every(cell => getComputedStyle(cell).borderBottomWidth === '0px'))).toBe(true);
  await expect(headers.first()).toHaveCSS('vertical-align', 'middle');
  await expect(table.getByRole('cell').first()).toHaveCSS('vertical-align', 'middle');
  await expect(long).toHaveCSS('-webkit-line-clamp', '2');
  await expect(long).toHaveAttribute('data-overflow-clipped', 'true');
  const fullText = (await long.textContent())!;
  await long.hover();
  await expect(page.getByRole('tooltip')).toHaveText(fullText);
  await short.hover();
  await expect(short).not.toHaveAttribute('data-overflow-clipped', 'true');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await scroller.evaluate(element => element.scrollTo(0, 0));
  await page.screenshot({ path:testInfo.outputPath('ai-table-1920.png') });

  for (const width of [1440, 600]) {
    await page.setViewportSize({ width, height:900 });
    await scroller.evaluate(element => element.scrollTo(0, 0));
    await expect(frame).toHaveAttribute('data-ai-table-start', 'true');
    await expect(frame).toHaveAttribute('data-ai-table-end', 'false');
    const left = (await title.boundingBox())!;
    const right = (await actions.boundingBox())!;
    expect(left.width).toBe(width === 1440 ? 290 : 104);
    expect((await table.getByRole('cell').first().boundingBox())!.width).toBe(left.width);
    expect(right.width).toBe(96);
    expect(right.x - left.x - left.width).toBeGreaterThan(16);
    const middle = (await headers.nth(2).boundingBox())!.x;
    await scroller.evaluate(element => element.scrollTo(element.scrollWidth / 3, 80));
    await expect(frame).toHaveAttribute('data-ai-table-start', 'false');
    expect((await headers.nth(2).boundingBox())!.x).toBeLessThan(middle);
    await scroller.evaluate(element => element.scrollTo(element.scrollWidth, 80));
    await expect(frame).toHaveAttribute('data-ai-table-end', 'true');
    const leftAfter = (await title.boundingBox())!;
    const rightAfter = (await actions.boundingBox())!;
    expect(Math.abs(leftAfter.x - left.x)).toBeLessThan(1);
    expect(Math.abs(rightAfter.x - right.x)).toBeLessThan(1);
    expect(Math.abs(leftAfter.y - left.y)).toBeLessThan(1);
    await page.screenshot({ path:testInfo.outputPath(`ai-table-right-${width}.png`) });
  }
  expect(errors).toEqual([]);
});

test('AI Hub exposes the same two and three menu items in cards and rows, and hides an empty menu', async ({ page }) => {
  await page.goto(entry);
  const catalog = page.getByRole('region', { name:'Каталог AI Hub' });
  const row = (id: string) => catalog.locator(`[data-ai-solution="${id}"]`);
  const menu = page.getByRole('menu');
  const names = [ ['failik', ['Инструкция', 'Открыть инструмент']],
    ['komblok', ['Инструкция', 'Открыть инструмент', 'Запись ИИ-пятницы']],
    ['sd-assistant', ['Открыть инструмент', 'Запись ИИ-пятницы']] ] as const;

  for (const view of ['Карточный вид', 'Табличный вид']) {
    const switcher = catalog.getByRole('button', { name:view });
    await switcher.click();
    await expect(switcher).toHaveAttribute('aria-pressed', 'true');
    const actions = row('demo-meeting-notes').locator('[data-ai-actions]');
    await expect(actions.getByRole('button')).toHaveCount(1);
    await expect(actions.getByRole('button', { name:/^Закладка/ })).toBeVisible();
    for (const [id, expected] of names) {
      const controls = row(id).locator('[data-ai-actions]').getByRole('button');
      const trigger = controls.first();
      await expect(controls.last()).toHaveAccessibleName(/^Закладка/);
      await trigger.click();
      await expect(menu.getByRole('menuitem')).toHaveText(expected);
      await expect(menu.getByRole('menuitem').locator('svg')).toHaveCount(expected.length);
      await page.keyboard.press('Escape');
      await expect(menu).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }
  }
});

test('AI Hub opens a single external link supplied by the catalog data', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name === 'production', 'Подмена демоданных использует исходный модуль Vite.');
  const url = 'https://example.test/tool';
  await context.route(url, route => route.fulfill({ contentType:'text/html', body:'Tool fixture' }));
  await page.route('**/src/demo/aiHub.ts*', async route => {
    const response = await route.fetch();
    const source = await response.text();
    await route.fulfill({ response, body:source + `\ndemoAiSolutions.find(item => item.id === 'demo-meeting-notes').actions = { tool: { url: '${url}' } };\n` });
  });
  await page.goto(entry + '&ai.view=list');
  const row = page.locator('[data-ai-solution="demo-meeting-notes"]');
  await row.getByRole('button', { name:/^Действия/ }).click();
  const items = page.getByRole('menuitem');
  await expect(items).toHaveCount(1);
  await expect(items).toHaveAttribute('href', url);
  await expect(items).toHaveAttribute('target', '_blank');
  const [tab] = await Promise.all([page.waitForEvent('popup'), items.click()]);
  await expect(tab).toHaveURL(url);
  await tab.close();
  await expect(page.getByRole('table', { name:'Решения AI Hub' })).toBeVisible();
});
