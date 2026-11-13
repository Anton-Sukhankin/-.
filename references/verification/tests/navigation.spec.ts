import { expect, test } from '@playwright/test';

test('tab and segment changes animate only the incoming content below the controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      if (this.closest('main')) {
        document.documentElement.dataset.tabAnimation = this.matches('[data-detail-tab-content]') ? 'content' : 'other';
      }
      return animate.apply(this, args);
    };
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = (...args) => {
      document.documentElement.dataset.tabScreenSnapshot = 'true';
      return start(...args);
    };
  });
  const html = page.locator('html');
  const cases = [
    ['section=home', 'Тип содержимого', /^Новости/],
    ['section=home&tab=news', 'Категории новостей', /^Важное/],
    ['section=home', 'Раздел отчётов', /^Мои подписки/],
    ['section=dictionary', 'Содержимое бизнес-словаря', /^Термины/],
    ['section=questions', 'Вопросы и ответы', /^Мои вопросы/],
    ['section=reports&report=demo-report-summary', 'Вкладки паспорта отчёта', /^Слайды/],
    ['section=sources&source=source-reportcrm-date', 'Вкладки карточки источника', /^Связанные отчёты/],
  ] as const;
  for (const [query, label, option] of cases) {
    await test.step(label, async () => {
      await page.goto('/preview/navigation?' + query);
      const strip = page.getByRole('tablist', { name: label, exact: true });
      const tab = strip.getByRole('tab', { name: option });
      const stripBox = await strip.boundingBox();
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(html).toHaveAttribute('data-tab-animation', 'content');
      await expect(html).not.toHaveAttribute('data-tab-screen-snapshot');
      expect(await strip.boundingBox()).toEqual(stripBox);
      if (label === 'Тип содержимого' || label === 'Содержимое бизнес-словаря') {
        const underline = tab.locator(':scope > [aria-hidden="true"]');
        await expect(underline).toHaveCSS('height', '4px');
        await expect(underline).toHaveCSS('background-color', 'rgb(0, 123, 252)');
      }
    });
  }
});

test('sidebar opens section starts and leaves explicit detail routes in browser history', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'Разделы каталога' });
  const sections = [
    ['home', 'Главная', 'tab=news&category=important&news=demo-news-4', '[data-home-controls] [aria-selected="true"]', 'Отчёты'],
    ['metrics', 'Метрики и показатели', 'metric=4&metricView=cards', '[data-metrics-catalog][data-view="list"]', ''],
    ['dictionary', 'Бизнес-словарь', 'dictionaryTab=domains', '[role="tab"][aria-selected="true"]', 'Все'],
    ['ai', 'AI Hub', 'ai.solution=failik&ai.query=файл', '[data-ai-view="catalog"]', ''],
    ['systems', 'Справочники ИС', 'systems.reference=crm&systems.view=list', '[data-catalog-view-results][data-view="cards"]', ''],
    ['questions', 'Вопросы и ответы', 'questions.tab=mine', '[role="tab"][aria-selected="true"]', 'FAQ'],
  ] as const;
  for (const [section, label, state, startSelector, text] of sections) {
    await test.step(label, async () => {
      await page.goto(`/preview/navigation?section=${section}&${state}`);
      const previous = page.url();
      await nav.getByRole('button', { name: 'Задачи', exact: true }).click();
      await expect(page).toHaveURL(/section=tasks$/);
      await nav.getByRole('button', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`section=${section}$`));
      const start = page.getByRole('main').locator(startSelector).first();
      await expect(start).toBeVisible();
      if (text) await expect(start).toContainText(text);
      await page.goBack();
      await expect(page).toHaveURL(/section=tasks$/);
      await page.goBack();
      await expect(page).toHaveURL(previous);
    });
  }
});

test('returning to Reports via the sidebar resets its local filters, sort and view', async ({ page }) => {
  await page.goto('/preview/navigation?section=reports&paginationDemo=0');
  const nav = page.getByRole('navigation', { name: 'Разделы каталога' });
  await page.getByRole('button', { name: 'Фильтр «Домен»', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'Фильтр: Домен', exact: true });
  await menu.getByRole('checkbox', { name: 'Гостеприимство', exact: true }).check();
  await menu.getByRole('button', { name: 'А → Я', exact: true }).click();
  await menu.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(page.locator('[data-sort-indicator]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Карточный вид', exact: true }).click();
  await expect(page.locator('[data-card-report-id]')).toHaveCount(5);
  await nav.getByRole('button', { name: 'Главная', exact: true }).click();
  await expect(page).toHaveURL(/section=home&paginationDemo=0$/);
  await nav.getByRole('button', { name: 'Отчёты', exact: true }).click();
  await expect(page.locator('[data-table-report-id]')).toHaveCount(9);
  await expect(page.locator('[data-sort-indicator]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Сбросить фильтр «Домен»' })).toHaveCount(0);
});

test('every main section uses the same spacing above and below its heading block', async ({ page }) => {
  const sections = [
    ['home', 'h1', '[data-home-controls]'],
    ['reports', 'h1', '[data-catalog-view-results]'],
    ['tasks', 'header p', '[aria-label="Прокрутка задач"]'],
    ['metrics', 'h1', '[data-metrics-toolbar]'],
    ['sources', 'h1', '[data-source-toolbar]'],
    ['dictionary', 'header p', '[role="tablist"]'],
    ['ai', 'header p', '[aria-label="Фильтры AI Hub"]'],
    ['systems', 'header p', '[data-catalog-view-results]'],
    ['questions', 'header p', '[aria-label="Прокрутка вопросов и ответов"]'],
  ] as const;
  for (const [section, heading, next] of sections) {
    await test.step(section, async () => {
      await page.goto('/preview/navigation?section=' + section);
      const main = page.getByRole('main');
      const header = main.locator(heading).first();
      await expect(header).toBeVisible();
      const first = main.locator(next).first();
      await expect(first).toBeVisible();
      const headingTop = await main.locator('h1').first().evaluate((element, useRow) =>
        (useRow ? element.parentElement! : element).getBoundingClientRect().top, section === 'reports');
      const bottom = await header.evaluate((element, useRow) =>
        (useRow ? element.parentElement! : element).getBoundingClientRect().bottom, section === 'reports');
      const top = await first.evaluate((element, useWorkspace) =>
        (useWorkspace ? element.parentElement! : element).getBoundingClientRect().top, section === 'questions' || section === 'tasks');
      const topInset = headingTop - (await main.boundingBox())!.y;
      expect(topInset).toBe(16);
      expect(top - bottom).toBe(topInset);
    });
  }
});

test('card lists keep the gray top inset while their contents scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 540 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const views = [
    ['section=reports', '[data-catalog-view-results] > div', '[data-report-card-scroll]', '[data-card-report-id]'],
    ['section=home', 'section[data-layout="home"]', '[data-report-card-scroll]', '[data-card-report-id]'],
    ['section=sources', '[data-catalog-view-results]', '[data-source-card-scroll]', 'article[data-source-id]'],
    ['section=metrics', '[data-metrics-results]', '[data-metrics-scroll]', 'article[data-metric-id]'],
    ['section=home&segment=subscriptions', '[data-subscriptions-content]', '[data-subscriptions-scroll]', '[data-subscription-id]'],
    ['section=home&segment=contribution', '[data-contribution-content]', '[data-contribution-scroll]', '[data-contributor-id]'],
    ['section=home&tab=news', '[aria-label="Список новостей"]', '[data-news-list-scroll]', '[data-news-id]'],
  ] as const;
  for (const [query, frameSelector, scrollSelector, cardSelector] of views) {
    await test.step(query, async () => {
      await page.goto('/preview/navigation?' + query);
      if (!query.endsWith('tab=news')) await page.getByRole('button', { name: 'Карточный вид', exact: true }).click();
      const frame = page.locator(frameSelector);
      const scroll = frame.locator(scrollSelector);
      const card = scroll.locator(cardSelector).first();
      await expect(frame).toHaveCSS('background-color', 'rgb(243, 244, 249)');
      const top = (await scroll.boundingBox())!.y;
      const start = (await card.boundingBox())!;
      expect(top - (await frame.boundingBox())!.y).toBe(16);
      await scroll.evaluate(element => { element.scrollTop = 64; });
      await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBe(64);
      expect((await scroll.boundingBox())!.y).toBe(top);
      const moved = (await card.boundingBox())!;
      expect(moved.y).toBe(start.y - 64);
      expect(moved.y).toBeLessThan(top - 4);
      expect(moved.y + moved.height).toBeGreaterThan(top);
      expect(await page.evaluate(({ x, y, selector }) => Boolean(document.elementFromPoint(x, y)?.closest(selector)),
        { x: moved.x + 20, y: top - 4, selector: cardSelector })).toBe(false);
    });
  }
});

test('screen and view transitions leave navigation and controls interactive', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = (...args) => {
      const kind = document.documentElement.dataset.catalogTransition;
      const transition = start(...args);
      void transition.ready.then(() => {
        const animations = document.getAnimations().filter(animation =>
          animation instanceof CSSAnimation && animation.animationName.startsWith('catalog-content-'));
        const duration = kind === 'view' ? 200 : 240;
        if (animations.length !== 2 || animations.some(animation => animation.effect?.getTiming().duration !== duration)) return;
        const root = document.documentElement;
        const sample = (progress: number) => {
          for (const animation of animations) animation.currentTime = duration * progress;
          return {
            outgoing: Number(getComputedStyle(root, '::view-transition-old(catalog-content)').opacity),
            incoming: Number(getComputedStyle(root, '::view-transition-new(catalog-content)').opacity),
          };
        };
        const before = sample(0.25);
        const after = sample(0.65);
        const noOverlap = [0.1, 0.44, 0.45, 0.46, 0.9].every(progress => {
          const { outgoing, incoming } = sample(progress);
          return outgoing === 0 || incoming === 0;
        });
        for (const animation of animations) animation.currentTime = 0;
        if (noOverlap && before.outgoing > 0 && before.outgoing < 1 && before.incoming === 0
          && after.incoming > 0 && after.incoming < 1 && after.outgoing === 0) {
          root.dataset.catalogMotion = kind;
        }
      }, () => {});
      return transition;
    };
  });
  await page.goto('/preview/navigation?section=sources&source=source-reportcrm-date');
  const motion = page.locator('html');
  await expect(motion).not.toHaveAttribute('data-catalog-motion');

  const nav = page.getByRole('navigation', { name: 'Разделы каталога' });
  const clearMotion = () => motion.evaluate(node => node.removeAttribute('data-catalog-motion'));
  const reports = nav.getByRole('button', { name: 'Отчёты', exact: true });
  const report = page.getByText('Сводный отчёт Гостеприимства', { exact: true });
  await reports.click();
  await expect(motion).toHaveAttribute('data-catalog-motion', 'screen');

  for (const view of ['Табличный вид', 'Карточный вид']) {
    const button = page.getByRole('button', { name: view, exact: true });
    if (view === 'Карточный вид') {
      await clearMotion();
      await button.press('Enter');
      await expect(motion).toHaveAttribute('data-catalog-motion', 'view');
      await expect(button).toBeFocused();
    }
    await clearMotion();
    await report.click();
    const passport = page.locator('[data-report-id]');
    await expect(passport).toBeVisible();
    await expect(motion).toHaveAttribute('data-catalog-motion', 'screen');
    await clearMotion();
    await passport.getByRole('button', { name: 'Отчёты', exact: true }).click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(motion).toHaveAttribute('data-catalog-motion', 'screen');
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await clearMotion();
  await page.getByRole('button', { name: 'Табличный вид', exact: true }).click();
  await nav.getByRole('button', { name: 'Метрики и показатели', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Метрики и показатели', exact: true })).toBeVisible();
  await expect(motion).not.toHaveAttribute('data-catalog-motion');
});

test('sidebar resizes from its edge and restores the default width', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/preview/navigation?section=reports&report=demo-report-summary&reportTab=overview');
  const initialUrl = page.url();
  const sidebar = page.locator('aside[data-collapsed]');
  const handle = sidebar.getByRole('separator', { name: 'Ширина боковой панели' });
  const collapse = sidebar.getByRole('button', { name: 'Свернуть панель' });
  await expect(handle).toHaveCSS('cursor', 'col-resize');
  await collapse.hover();
  await expect(collapse).toHaveCSS('cursor', 'pointer');
  const current = sidebar.getByRole('button', { name: 'Отчёты', exact: true });
  const expectWidth = (width: number) => expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(width);
  const moveToEdge = async () => {
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 160);
  };
  await expectWidth(280);
  await moveToEdge();
  expect(await handle.evaluate(node => node.matches(':hover'))).toBe(true);
  await page.mouse.down();
  await page.mouse.move(344, 208);
  await expectWidth(344);
  await expect(sidebar).toHaveAttribute('data-resizing', 'true');
  await expect(handle).toHaveAttribute('aria-valuenow', '344');
  await expect.poll(async () => (await page.getByRole('main').boundingBox())?.x).toBe(344);
  await page.mouse.move(800, 208);
  await expectWidth(400);
  await page.mouse.move(120, 208);
  await expectWidth(200);
  await page.mouse.up();
  await expect(sidebar).toHaveAttribute('data-resizing', 'false');

  await handle.dblclick({ position: { x: 12, y: 160 } });
  await expectWidth(280);
  await handle.press('ArrowRight');
  await expectWidth(296);
  await handle.press('Enter');
  await expectWidth(280);
  await moveToEdge();
  await page.mouse.down();
  await page.mouse.move(240, 208);
  await page.mouse.up();
  await expectWidth(240);

  await collapse.click();
  await expectWidth(64);
  await expect(handle).toHaveCount(0);
  await sidebar.getByRole('button', { name: 'Развернуть панель' }).click();
  await expectWidth(280);
  await expect(current).toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveURL(initialUrl);
});

test('sidebar hover matches the selected background and keeps the collapsed highlight under the icon', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/preview/navigation?section=ai');
  const sidebar = page.locator('aside[data-collapsed]');
  const nav = sidebar.getByRole('navigation', { name: 'Разделы каталога' });
  const current = nav.getByRole('button', { name: 'AI Hub', exact: true });
  const reports = nav.getByRole('button', { name: 'Отчёты', exact: true });
  const highlight = 'rgb(226, 230, 236)';
  const transparent = 'rgba(0, 0, 0, 0)';
  await expect(current).toHaveAttribute('aria-current', 'page');
  await expect(current).toHaveCSS('background-color', highlight);
  await expect(reports).toHaveCSS('background-color', transparent);

  await reports.hover();
  await expect(reports).toHaveCSS('background-color', highlight);
  await expect(reports).not.toHaveAttribute('aria-current');
  await sidebar.screenshot({ path: testInfo.outputPath('sidebar-hover.png') });

  await current.hover();
  await expect(current).toHaveCSS('background-color', highlight);
  await expect(reports).toHaveCSS('background-color', transparent);

  await sidebar.getByRole('button', { name: 'Свернуть панель' }).click();
  await expect(sidebar).toHaveCSS('width', '64px');
  const iconHighlight = (button: typeof reports) =>
    button.evaluate(element => getComputedStyle(element, '::before').backgroundColor);
  await expect.poll(() => iconHighlight(current)).toBe(transparent);
  await reports.hover();
  await expect.poll(() => iconHighlight(reports)).toBe(highlight);
  await expect(reports).toHaveCSS('background-color', transparent);
  await current.hover();
  await expect.poll(() => iconHighlight(current)).toBe(highlight);
});

test('navigation matches documented geometry and keeps selected identity across collapse/expand', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text());
  });
  await page.goto('/preview/navigation');
  const sidebar = page.locator('aside');
  const nav = page.getByRole('navigation', { name: 'Разделы каталога' });
  const home = nav.getByRole('button', { name: 'Главная', exact: true });
  const reports = nav.getByRole('button', { name: 'Отчёты', exact: true });
  await expect(nav.getByRole('button')).toHaveCount(9);
  await expect(home).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'Главная', exact: true })).toBeVisible();
  expect(await sidebar.boundingBox()).toEqual({ x: 0, y: 48, width: 280, height: 852 });
  const labels = await nav.getByRole('button').allTextContents();
  expect(labels).toEqual(['Главная', 'Отчёты35', 'Задачи6', 'Метрики и показатели9', 'Источники9', 'Бизнес-словарь20', 'AI Hub9', 'Справочники ИС15', 'Вопросы и ответы']);
  await page.evaluate(() => document.fonts.ready);
  expect(await home.evaluate((button) => ({ family: getComputedStyle(button).fontFamily, weight: getComputedStyle(button).fontWeight })))
    .toEqual({ family: '"CoFo Sans", sans-serif', weight: '500' });
  for (const image of await nav.locator('img').all()) {
    expect(await image.evaluate((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true);
    expect((await image.boundingBox())?.width).toBe(20);
  }
  await page.mouse.move(700, 700);
  await sidebar.screenshot({ path: 'verification/current/navigation/expanded-home.png' });
  await reports.click();
  await expect(reports).toHaveAttribute('aria-current', 'page');
  await expect(home).not.toHaveAttribute('aria-current');
  await page.mouse.move(700, 700);
  await expect(reports).toHaveCSS('background-color', 'rgb(226, 230, 236)');
  await sidebar.screenshot({ path: 'verification/current/navigation/expanded-reports.png' });
  const collapse = page.getByRole('button', { name: 'Свернуть панель', exact: true });
  const edgeColor = () => sidebar.evaluate(element => getComputedStyle(element, '::after').backgroundColor);
  await expect(collapse).toHaveCSS('opacity', '1');
  expect(await collapse.boundingBox()).toEqual({ x: 268, y: 80, width: 24, height: 24 });
  await expect.poll(edgeColor).toBe('rgb(220, 226, 234)');
  await expect(collapse).toHaveCSS('border-top-color', 'rgb(220, 226, 234)');
  await expect(collapse).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(collapse.locator('span')).toHaveCSS('background-color', 'rgb(104, 115, 132)');
  await reports.hover();
  await expect.poll(edgeColor).toBe('rgb(0, 122, 255)');
  await expect(collapse).toHaveCSS('border-top-color', 'rgb(0, 122, 255)');
  await expect(collapse.locator('span')).toHaveCSS('background-color', 'rgb(0, 122, 255)');
  await page.mouse.move(286, 400);
  await expect.poll(edgeColor).toBe('rgb(0, 122, 255)');
  await collapse.hover();
  await expect(collapse).toHaveCSS('background-color', 'rgb(229, 241, 255)');
  await collapse.click();
  await expect.poll(() => sidebar.boundingBox()).toEqual({ x: 0, y: 48, width: 64, height: 836 });
  await expect(reports).toHaveAttribute('aria-current', 'page');
  await expect(reports.locator('span[aria-hidden="true"]')).toHaveCSS('visibility', 'hidden');
  expect(await reports.innerText()).toBe('');
  await expect(reports).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  for (const image of await nav.locator('img').all()) {
    const box = (await image.boundingBox())!;
    expect(box.width).toBe(20);
    expect(box.x).toBe(20);
  }
  await page.mouse.move(63, 400);
  await sidebar.screenshot({ path: 'verification/current/navigation/collapsed.png' });
  await page.screenshot({ path: 'verification/current/navigation/context-collapsed.png', fullPage: true });
  const expand = page.getByRole('button', { name: 'Развернуть панель', exact: true });
  await page.mouse.move(700, 700);
  await expect.poll(edgeColor).toBe('rgb(220, 226, 234)');
  await expect(expand.locator('span')).toHaveCSS('background-color', 'rgb(104, 115, 132)');
  await expand.focus();
  await expect(expand).toHaveCSS('opacity', '1');
  await expand.press('Enter');
  await expect(reports).toHaveAttribute('aria-current', 'page');
  await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(280);
  await nav.getByRole('button', { name: 'Задачи', exact: true }).click();
  await expect(nav.getByRole('button', { name: 'Задачи', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'Задачи', exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Очередь заявок на рассылку' }).getByRole('listitem')).toHaveCount(6);
  for (const name of ['Главная', 'Отчёты', 'Задачи', 'Метрики и показатели', 'Источники', 'Бизнес-словарь', 'AI Hub', 'Справочники ИС', 'Вопросы и ответы']) {
    await nav.getByRole('button', { name, exact: true }).click();
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(nav.getByRole('button', { name, exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    if (name === 'Главная') {
      await expect(page.locator('[data-home-controls]')).toBeVisible();
      await expect(page.locator('[data-table-report-id]')).toHaveCount(15);
    } else if (name === 'Отчёты') {
      await expect(page.getByRole('region', { name: 'Таблица отчётов', exact: true })).toBeVisible();
    } else if (name === 'Метрики и показатели') {
      await expect(page.getByRole('region', { name: 'Каталог метрик и показателей', exact: true })).toBeVisible();
      await expect(page.locator('[data-metric-id]')).toHaveCount(9);
    } else if (name === 'Источники') {
      await expect(page.getByRole('region', { name: 'Каталог источников', exact: true })).toBeVisible();
      await expect(page.locator('[data-source-id]')).toHaveCount(9);
    } else if (name === 'Бизнес-словарь') {
      await expect(page.locator('[data-dictionary-workspace]')).toBeVisible();
      await expect(page.locator('[data-dictionary-domain]')).toHaveCount(8);
      await expect(page.locator('[data-dictionary-term]')).toHaveCount(7);
    } else if (name === 'AI Hub') {
      await expect(page.getByRole('region', { name: 'Каталог AI Hub' }).locator('article')).toHaveCount(9);
    } else if (name === 'Справочники ИС') {
      const catalog = page.getByRole('region', { name: 'Каталог справочников ИС' });
      await expect(catalog.getByRole('link', { name: /Открыть справочник/ })).toHaveCount(15);
    } else if (name === 'Вопросы и ответы') {
      await expect(page.getByRole('tabpanel', { name: /^FAQ/ })).toBeVisible();
    } else if (name === 'Задачи') {
      await expect(page.getByRole('list', { name: 'Очередь заявок на рассылку' }).getByRole('listitem')).toHaveCount(6);
    }
  }
  await page.mouse.move(279, 400);
  await page.getByRole('button', { name: 'Свернуть панель', exact: true }).click();
  await nav.getByRole('button', { name: 'Источники', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Источники', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Развернуть панель', exact: true }).focus();
  await page.getByRole('button', { name: 'Развернуть панель', exact: true }).press('Enter');
  await expect(nav.getByRole('button', { name: 'Источники', exact: true })).toHaveAttribute('aria-current', 'page');
  await home.click();
  await page.mouse.move(700, 700);
  await page.screenshot({ path: 'verification/current/navigation/context-expanded.png', fullPage: true });
  expect(errors).toEqual([]);
});
