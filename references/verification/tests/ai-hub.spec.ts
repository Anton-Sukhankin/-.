import { expect, test } from '@playwright/test';

const entry = '/preview/navigation?section=ai';

test('the whole solution card opens its details and footer controls act independently', async ({ page }) => {
  await page.goto(entry);
  const catalog = page.getByRole('region', { name: 'Каталог AI Hub' });
  const card = catalog.locator('[data-ai-solution="failik"]');
  const detail = catalog.locator('[data-ai-detail]');
  const bookmark = card.getByRole('button', { name: /^Закладка/ });
  const openTool = card.getByRole('button', { name: /^Открыть инструмент/ });

  await card.getByText('ИИ-утилита', { exact: true }).hover();
  await expect(card.getByRole('heading').getByRole('button')).toHaveCSS('color', 'rgb(0, 103, 220)');
  await bookmark.click();
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');
  await expect(detail).toHaveCount(0);
  await openTool.click();
  await expect(catalog.getByText(/Адрес для .* не указан/)).toBeVisible();
  await expect(detail).toHaveCount(0);

  await card.getByText('ИИ-утилита', { exact: true }).click();
  await expect(detail).toHaveAttribute('data-ai-detail', 'failik');
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
  await expect(panel.getByRole('combobox', { name:'Тип', exact:true })).toHaveText('ИИ-утилита');
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
    await expect(detail.getByRole('heading',{name:'Паспорт решения'})).toBeVisible();
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
  }
});

test('AI Hub filters intersect, can be cleared, and preserve local catalog state', async ({page}) => {
  await page.goto(entry);
  const catalog = page.getByRole('region', {name:'Каталог AI Hub'});
  const cards = catalog.locator('article');
  const search = catalog.getByRole('searchbox');
  const choose = async (field:string, option:string) => {
    await catalog.getByRole('combobox',{name:field,exact:true}).click();
    const list = page.getByRole('listbox', {name:field,exact:true});
    await list.getByRole('option',{name:option,exact:true}).click();
  };
  await expect(cards).toHaveCount(9);
  await expect(catalog.getByRole('status')).toHaveText('Найдено 9 решений');
  await expect(cards.getByText('Демо', { exact:true })).toHaveCount(3);
  for (const [query, title] of [['файловый','fAIлик'],['регламенты','Помощник Комблок'],['Зяблов Сергей','fAIлик'],['Команда Service Desk','SD Assistant']]) {
    await search.fill(query);
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText(title);
  }
  await search.clear();
  await choose('Тип','ИИ-помощник функций');
  await choose('Домен','Операции');
  await choose('Статус','Используется');
  await choose('Платформа','Assist');
  await catalog.getByRole('button',{name:'Рекомендуются к переиспользованию'}).click();
  await catalog.getByRole('button',{name:'Есть UI'}).click();
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Помощник Комблок');
  await catalog.getByRole('button',{name:'Клуб талантов'}).click();
  await expect(catalog.getByRole('heading',{name:'Решения не найдены'})).toBeVisible();
  await expect(catalog.getByRole('status')).toHaveText('Найдено 0 решений');
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
  await cards.first().getByRole('button',{name:/^Открыть инструмент/}).click();
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
