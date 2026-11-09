import { test,expect } from '@playwright/test';

test('wheel input at the detail scroll boundaries keeps the shell and detail header fixed', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [query, cardSelector, scrollSelector] of [
    ['section=metrics&metric=metric-ebitda', '[data-metric-detail-id]', '[data-detail-scroll]'],
    ['section=reports&report=demo-report-summary&reportTab=sources', '[data-report-id]', '[data-detail-scroll]'],
    ['section=reports&report=demo-report-summary&reportTab=metrics', '[data-report-id]', '[data-detail-scroll-source]'],
    ['section=sources&source=source-reportcrm-date', '[data-source-detail-id]', '[data-detail-scroll]'],
  ]) {
    await page.goto('/preview/navigation?' + query);
    const card = page.locator(cardSelector);
    const scroll = card.locator(scrollSelector);
    const banner = page.getByRole('banner');
    const shell = banner.locator('..');
    const sidebar = page.locator('aside[data-collapsed]');
    const header = card.locator(':scope > header');
    await expect(shell).toHaveCSS('overflow-y', 'clip');
    await expect(page.locator('html')).toHaveCSS('overscroll-behavior-y', 'none');
    await expect(scroll).toHaveCSS('overscroll-behavior-y', 'none');
    await expect.poll(() => scroll.evaluate(el => el.scrollHeight - el.clientHeight)).toBeGreaterThan(0);

    await scroll.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await expect(card).toHaveAttribute('data-detail-compact', 'true');
    await scroll.evaluate(el => { el.scrollTop = el.scrollHeight; });
    for (const delta of [700, -700]) {
      if (delta < 0) {
        await scroll.evaluate(el => { el.scrollTop = 0; });
        await expect(card).toHaveAttribute('data-detail-compact', 'false');
      }
      const readPositions = async () => Promise.all([banner, sidebar, header].map(async item => (await item.boundingBox())!.y));
      const fixedPositions = await readPositions();
      const box = (await scroll.boundingBox())!;
      await page.mouse.move(box.x + 12, box.y + 20);
      await scroll.evaluate(el => {
        el.removeAttribute('data-wheel-checked');
        el.addEventListener('wheel', () => el.setAttribute('data-wheel-checked', 'true'), { once: true, passive: true });
      });
      await page.mouse.wheel(0, delta);
      await expect(scroll).toHaveAttribute('data-wheel-checked', 'true');
      expect(await readPositions()).toEqual(fixedPositions);
      expect(await shell.evaluate(el => el.scrollTop)).toBe(0);
      expect(await page.getByRole('main').evaluate(el => el.scrollTop)).toBe(0);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    }
  }
});

test('detail tabs animate content without fading the header', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      if (this.matches('[data-detail-tab-content]')) document.documentElement.dataset.testTabAnimation = 'content';
      if (this.matches('main, header, [role="tablist"]')) document.documentElement.dataset.testTabAnimation = 'chrome';
      return animate.apply(this, args);
    };
    const start = document.startViewTransition?.bind(document);
    if (start) document.startViewTransition = (...args) => {
      document.documentElement.dataset.testTabSnapshot = 'captured';
      return start(...args);
    };
  });

  for (const [query, cardSelector, nextTab] of [
    ['section=reports&report=demo-report-summary', '[data-report-id]', /^Слайды/],
    ['section=sources&source=source-reportcrm-date', '[data-source-detail-id]', /^Связанные отчёты/],
  ] as const) {
    await page.goto('/preview/navigation?' + query);
    const card = page.locator(cardSelector);
    const header = card.locator(':scope > header');
    const tabs = header.getByRole('tablist');
    await expect(tabs).toHaveCSS('margin-block-start', '8px');
    await expect(tabs.getByRole('tab').first()).toHaveCSS('padding-bottom', '16px');
    const next = tabs.getByRole('tab', { name: nextTab });
    const bounds = await tabs.boundingBox();
    await tabs.locator('[aria-selected="true"]').press('ArrowRight');
    await expect(next).toHaveAttribute('aria-selected', 'true');
    await expect(next).toBeFocused();
    expect(await next.evaluate(el => {
      const underline = getComputedStyle(el, '::after');
      return [underline.height, underline.backgroundColor];
    })).toEqual(['4px', 'rgb(0, 123, 252)']);
    await expect(page.locator('html')).toHaveAttribute('data-test-tab-animation', 'content');
    await expect(page.locator('html')).not.toHaveAttribute('data-test-tab-snapshot');
    await expect(header).toHaveCSS('opacity', '1');
    expect(await tabs.boundingBox()).toEqual(bounds);
  }
});

test('detail titles share report typography and compact text breadcrumbs',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  const headers=[];
  for(const query of ['section=reports&report=demo-report-summary','section=sources&source=source-reportcrm-date','section=metrics&metric=4']) {
    await page.goto('/preview/navigation?'+query);
    await page.evaluate(()=>document.fonts.ready);
    const title=page.getByRole('heading',{level:1});
    const crumbs=page.getByRole('navigation',{name:'Хлебные крошки',exact:true}).locator('..');
    const titleBox=(await title.boundingBox())!,crumbBox=(await crumbs.boundingBox())!;
    const mainBox=(await page.getByRole('main').boundingBox())!;
    expect(crumbBox.y-mainBox.y).toBe(query.startsWith('section=sources') ? 20 : 16);
    expect(titleBox.y-crumbBox.y-crumbBox.height).toBe(8);
    const typography=await title.evaluate(element=>{
      const style=getComputedStyle(element);
      return{family:style.fontFamily,size:style.fontSize,weight:style.fontWeight,lineHeight:style.lineHeight,tracking:style.letterSpacing,color:style.color};
    });
    expect(typography).toEqual({family:'"CoFo Sans", sans-serif',size:'20px',weight:'500',lineHeight:'28px',tracking:'normal',color:'rgb(16, 29, 59)'});
    const description=title.locator('..').locator('xpath=following-sibling::*[1]');
    expect((await description.boundingBox())!.y-titleBox.y-titleBox.height).toBe(0);
    const separators = description.locator('img[src$="/dot.svg"], [data-description-separator]');
    expect(await separators.count()).toBeGreaterThan(0);
    for (const separator of await separators.all()) {
      const gaps = await separator.evaluate(dot => {
        function bounds(node: Node) {
          if (node instanceof Element) return node.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(node);
          return range.getBoundingClientRect();
        }
        const box = dot.getBoundingClientRect();
        return [box.left - bounds(dot.previousSibling!).right, bounds(dot.nextSibling!).left - box.right];
      });
      expect(gaps[0]).toBeCloseTo(5, 1);
      expect(gaps[1]).toBeCloseTo(5, 1);
    }
    headers.push(typography);
    await expect(crumbs.getByRole('button')).toHaveCount(1);
    await expect(crumbs.locator('img')).toHaveCSS('width','16px');
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  }
  expect(headers[1]).toEqual(headers[0]);
  await page.goto('/preview/navigation?section=sources&source=source-reportcrm-date');
  const description=page.locator('[data-source-description]');
  await expect(description).toContainText('Table · 34 колонки');
  await expect(description).toContainText('SQL Server · Без слоя · Reportcrm20');
  await expect(description).toHaveCSS('color','rgb(82, 105, 140)');
  await page.goto('/preview/navigation?section=reports');
  const reportFont=await page.getByRole('heading',{level:1}).evaluate(element=>getComputedStyle(element).font);
  await page.goto('/preview/navigation?section=sources');
  expect(await page.getByRole('heading',{level:1}).evaluate(element=>getComputedStyle(element).font)).toBe(reportFont);
});

test('report, source and metric details keep their controls above the scroll surface', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const [query, selector, action, hasTabs] of [
    ['section=reports&report=demo-report-summary&reportTab=usage', '[data-report-id]', 'Открыть отчёт', true],
    ['section=sources&source=source-reportcrm-date', '[data-source-detail-id]', 'Получить доступ', true],
    ['section=metrics&metric=4', '[data-metric-detail-id]', 'Редактировать показатель', false],
  ] as const) {
    await page.goto('/preview/navigation?' + query);
    const card = page.locator(selector);
    const header = card.locator(':scope > header');
    const scroll = card.locator('[data-detail-scroll]');
    const title = header.getByRole('heading', { level: 1 });
    const crumbs = header.getByRole('navigation', { name: 'Хлебные крошки' });
    const description = title.locator('..').locator('xpath=following-sibling::*[1]');
    await expect(description).toBeVisible();
    const descriptionText = (await description.textContent())!;
    const expandedDescriptionBox = (await description.boundingBox())!;
    const tabs = hasTabs ? header.getByRole('tablist') : undefined;
    await expect(crumbs).toBeVisible();
    if (!hasTabs) await expect(header).toHaveCSS('box-shadow', /rgba\(0, 0, 0, 0\)/);
    const expanded = (await header.boundingBox())!;
    const expandedTabGap = tabs ? await tabs.evaluate(el => parseFloat(getComputedStyle(el).marginBlockStart)) : 0;
    const titleName = await title.textContent();
    const frames = await scroll.evaluate(el => new Promise<{ height: number; tabGap: number }[]>(resolve => {
      const header = el.parentElement!.querySelector('header')!;
      const tablist = header.querySelector('[role="tablist"]');
      const frames: { height: number; tabGap: number }[] = [];
      const start = performance.now();
      function measure(now: number) {
        frames.push({
          height: header.getBoundingClientRect().height,
          tabGap: tablist ? parseFloat(getComputedStyle(tablist).marginBlockStart) : 0,
        });
        if (now - start < 450) requestAnimationFrame(measure);
        else resolve(frames);
      }
      el.scrollTop = 220;
      requestAnimationFrame(measure);
    }));
    await expect(card).toHaveAttribute('data-detail-compact', 'true');
    await expect(crumbs).toHaveCount(0);
    for (const secondary of await header.locator('[data-detail-secondary]').all()) {
      await expect(secondary).toBeHidden();
    }
    await expect(title).toHaveText(titleName!);
    await expect(title).toBeInViewport();
    await expect(header.getByRole('button', { name: action, exact: true })).toBeInViewport();
    const compact = (await header.boundingBox())!;
    expect(compact.y).toBe(expanded.y);
    expect(compact.height).toBeLessThan(expanded.height);
    expect(frames.some(({ height }) => height > compact.height && height < expanded.height)).toBe(true);
    if (tabs) {
      await expect(description).toBeHidden();
      const compactTabGap = expandedTabGap - 8;
      await expect(tabs).toHaveCSS('margin-block-start', `${compactTabGap}px`);
      expect(frames.some(({ tabGap }) => tabGap > compactTabGap && tabGap < expandedTabGap)).toBe(true);
    } else {
      await expect(description).toHaveText(descriptionText);
      await expect(description).toBeInViewport();
      expect((await description.boundingBox())!.height).toBe(expandedDescriptionBox.height);
      const titleBox = (await title.boundingBox())!;
      expect((await description.boundingBox())!.y - titleBox.y - titleBox.height).toBe(0);
      await expect(header).toHaveCSS('padding-block-end', '16px');
      await expect(header).toHaveCSS('box-shadow', /rgb\(220, 226, 234\)/);
    }
    const boundary = tabs ? (await tabs.boundingBox())! : compact;
    expect((await scroll.boundingBox())!.y).toBeCloseTo(boundary.y + boundary.height, 0);
    const content = scroll.locator(':scope > div').first();
    await expect(content).toHaveCSS('padding-top', '0px');
    expect((await content.boundingBox())!.y).toBeLessThan((await scroll.boundingBox())!.y);
    await scroll.evaluate(el => { el.scrollTop += 100; });
    expect((await header.boundingBox())!.y).toBe(compact.y);
    await scroll.evaluate(el => { el.scrollTop = 0; });
    await expect(crumbs).toBeVisible();
    await expect(description).toBeVisible();
    await expect.poll(async () => (await header.boundingBox())!.height).toBe(expanded.height);
    if (tabs) await expect(tabs).toHaveCSS('margin-block-start', `${expandedTabGap}px`);
    else await expect(header).toHaveCSS('box-shadow', /rgba\(0, 0, 0, 0\)/);
  }
});

test('report overview pins the information beside the scrolling accordions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/preview/navigation?section=reports&report=demo-report-summary&reportTab=overview');
  const card = page.locator('[data-report-id]');
  const scroll = card.locator('[data-detail-scroll]');
  const information = scroll.getByRole('complementary', { name: 'Сведения об отчёте' });
  const accordion = scroll.getByRole('button', { name: /^Об отчёте/ });
  const distanceFromTabs = async () => (await information.boundingBox())!.y - (await scroll.boundingBox())!.y;
  await expect.poll(distanceFromTabs).toBeCloseTo(16, 0);
  const firstPosition = (await accordion.boundingBox())!.y;

  await scroll.evaluate(el => { el.scrollTop = 260; });
  await expect(card).toHaveAttribute('data-detail-compact', 'true');
  await expect.poll(distanceFromTabs).toBeCloseTo(16, 0);
  expect((await accordion.boundingBox())!.y).toBeLessThan(firstPosition);
  await scroll.evaluate(el => { el.scrollTop += 200; });
  await expect.poll(distanceFromTabs).toBeCloseTo(16, 0);
  await scroll.evaluate(el => { el.scrollTop = 0; });
  await expect(card).toHaveAttribute('data-detail-compact', 'false');
  await expect.poll(distanceFromTabs).toBeCloseTo(16, 0);

  await page.setViewportSize({ width: 1440, height: 500 });
  await scroll.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect(card).toHaveAttribute('data-detail-compact', 'true');
  await expect.poll(distanceFromTabs).toBeCloseTo(16, 0);
  await expect.poll(() => information.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  await information.press('End');
  await expect.poll(() => information.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await expect(information.getByText('Аналитик', { exact: true })).toBeInViewport();

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(information).toHaveCSS('position', 'static');
  await scroll.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect(information).toBeInViewport();
});

test('source detail pins information beside the scrolling fields', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/preview/navigation?section=sources&source=source-reportcrm-date');
  const card = page.locator('[data-source-detail-id]');
  const scroll = card.locator('[data-detail-scroll]');
  const information = scroll.getByRole('complementary', { name: 'Сведения об источнике' });
  const about = scroll.getByRole('button', { name: /^Об источнике/ });
  const gap = async () => (await information.boundingBox())!.y - (await scroll.boundingBox())!.y;

  await expect(information).toHaveCSS('position', 'sticky');
  await expect.poll(gap).toBe(16);
  const originalTop = (await about.boundingBox())!.y;
  await scroll.evaluate(element => { element.scrollTop = 260; });
  await expect(card).toHaveAttribute('data-detail-compact', 'true');
  await expect.poll(gap).toBe(16);
  expect((await about.boundingBox())!.y).toBeLessThan(originalTop);
  await scroll.evaluate(element => { element.scrollTop = 0; });
  await expect(card).toHaveAttribute('data-detail-compact', 'false');
  await expect.poll(gap).toBe(16);

  await page.setViewportSize({ width: 1440, height: 440 });
  await expect.poll(() => information.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  await information.press('End');
  await expect.poll(() => information.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  expect(await scroll.evaluate(element => element.scrollTop)).toBe(0);

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(information).toHaveCSS('position', 'static');
  await scroll.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(information).toBeInViewport();
});

test('metric detail keeps information below the header while its sections scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/preview/navigation?section=metrics&metric=4');
  const card = page.locator('[data-metric-detail-id]');
  const scroll = card.getByRole('region', { name: 'Содержимое паспорта показателя' });
  const information = scroll.getByRole('complementary', { name: 'Сведения о показателе' });
  const firstSection = scroll.getByRole('button', { name: /^Полное описание/ });
  const distanceFromHeader = async () => (await information.boundingBox())!.y - (await scroll.boundingBox())!.y;
  await expect.poll(distanceFromHeader).toBeCloseTo(20, 0);
  const initialSectionTop = (await firstSection.boundingBox())!.y;

  await scroll.evaluate(el => { el.scrollTop = 260; });
  await expect(card).toHaveAttribute('data-detail-compact', 'true');
  await expect.poll(distanceFromHeader).toBeCloseTo(20, 0);
  const scrolledSectionTop = (await firstSection.boundingBox())!.y;
  expect(scrolledSectionTop).toBeLessThan(initialSectionTop);
  await scroll.evaluate(el => { el.scrollTop += 300; });
  await expect.poll(distanceFromHeader).toBeCloseTo(20, 0);
  expect((await firstSection.boundingBox())!.y).toBeLessThan(scrolledSectionTop);

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect.poll(distanceFromHeader).toBeCloseTo(20, 0);
  await scroll.evaluate(el => { el.scrollTop = 0; });
  await expect(card).toHaveAttribute('data-detail-compact', 'false');
  await expect.poll(distanceFromHeader).toBeCloseTo(20, 0);

  await page.setViewportSize({ width: 1440, height: 500 });
  await scroll.evaluate(el => { el.scrollTop = 260; });
  await expect.poll(distanceFromHeader).toBeCloseTo(20, 0);
  await expect.poll(() => information.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  await information.press('End');
  await expect.poll(() => information.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await expect(information.getByText('Аналитик', { exact: true })).toBeInViewport();
});

test('scrolling report metrics collapses the report chrome and keeps the results fitted', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/preview/navigation?section=reports&report=demo-report-summary&reportTab=metrics');
  const card = page.locator('[data-report-id]');
  const results = page.getByRole('region', { name: 'Результаты поиска метрик отчёта' });
  await results.evaluate(el => { el.scrollTop = 120; });
  await expect(card).toHaveAttribute('data-detail-compact', 'true');
  const tabs = card.getByRole('tablist', { name: 'Вкладки паспорта отчёта' });
  const toolbar = card.locator('[data-report-metrics] > :first-child');
  await expect.poll(async () => {
    const tabsBox = (await tabs.boundingBox())!;
    return (await toolbar.boundingBox())!.y - tabsBox.y - tabsBox.height;
  }).toBeCloseTo(0, 0);
  const box = (await results.boundingBox())!;
  expect(box.y + box.height).toBe(892);
  await card.getByRole('tab', { name: 'Использование', exact: true }).click();
  await expect(card).toHaveAttribute('data-detail-compact', 'false');
  await expect(card.getByRole('navigation', { name: 'Хлебные крошки' })).toBeVisible();
});

test('AI Hub pins both headers and isolates body and side navigation scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 720 });
  await page.goto('/preview/navigation?section=ai&ai.solution=failik');
  const main = page.getByRole('main');
  const title = main.getByRole('heading', { name:'AI Hub', exact:true });
  const description = main.getByText('Корпоративный каталог ИИ-решений', { exact:true });
  const header = main.locator('[data-ai-detail] > header');
  const filters = main.getByRole('group', { name:'Фильтры AI Hub' });
  const body = main.getByRole('region', { name:'Содержимое решения' });
  const list = main.getByRole('navigation', { name:'Решения в текущей выдаче' });
  const scrollTop = (locator: typeof body) => locator.evaluate(element => element.scrollTop);
  const headerBoxes = () => Promise.all([title, description, filters, header].map(locator => locator.boundingBox()));
  await expect(description).toBeInViewport();
  await page.evaluate(() => document.fonts.ready);
  const before = await headerBoxes();

  await body.hover();
  await page.mouse.wheel(0, 2000);
  await expect.poll(() => scrollTop(body)).toBeGreaterThan(0);
  await expect(body.getByRole('heading', { name:'Пример запроса' })).toBeInViewport();
  const bodyEnd = await scrollTop(body);
  expect(await scrollTop(list)).toBe(0);
  await page.mouse.wheel(0, 2000);

  await list.hover();
  await page.mouse.wheel(0, 2000);
  await expect.poll(() => scrollTop(list)).toBeGreaterThan(0);
  await expect(list.getByRole('button').last()).toBeInViewport();
  expect(await scrollTop(body)).toBe(bodyEnd);
  expect(await scrollTop(main)).toBe(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await headerBoxes()).toEqual(before);

  const listEnd = await scrollTop(list);
  await list.getByRole('button').last().click();
  await expect.poll(() => scrollTop(body)).toBe(0);
  expect(await scrollTop(list)).toBe(listEnd);
  expect(await Promise.all([title, description, filters].map(locator => locator.boundingBox()))).toEqual(before.slice(0, 3));

  await page.setViewportSize({ width: 600, height: 750 });
  await page.goto('/preview/navigation?section=ai&ai.solution=failik');
  await expect(header).toBeInViewport();
  await page.evaluate(() => document.fonts.ready);
  const bodyBox = (await body.boundingBox())!;
  const listBox = (await list.boundingBox())!;
  expect(bodyBox.height).toBeGreaterThan(0);
  expect(bodyBox.y + bodyBox.height).toBeLessThan(listBox.y);
  expect(listBox.y + listBox.height).toBeLessThanOrEqual(750);
});

test('report metric list fits the remaining viewport after the compact header wraps',async({page})=>{
  await page.goto('/preview/navigation?section=reports&report=demo-report-summary&reportTab=metrics');
  for(const [width,height] of [[1440,900],[1024,768],[1024,600],[1920,900]]) {
    await page.setViewportSize({width,height});
    const results=page.locator('[data-report-metrics] > div').nth(1);
    await expect.poll(async()=>Math.round((await results.boundingBox())!.y+(await results.boundingBox())!.height)).toBe(height-8);
    expect((await results.boundingBox())!.height).toBeGreaterThan(0);
    // The demo has exactly one page: no empty pagination overlay should appear.
    await expect(page.getByRole('navigation',{name:'Страницы метрик отчёта',exact:true})).toHaveCount(0);
  }
});
