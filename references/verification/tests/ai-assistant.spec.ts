import { expect, test, type Locator, type Page } from '@playwright/test';

const viewport = { width: 1440, height: 900 };
const assistant = (page: Page) => page.getByRole('region', { name: 'AI-ассистент', exact: true });
const launcher = (page: Page) => page.getByRole('button', { name: 'Открыть AI-ассистента', exact: true });
const message = (page: Page) => assistant(page).getByRole('textbox', { name: 'Сообщение', exact: true });
const close = (page: Page) => assistant(page).getByRole('button', { name: 'Закрыть AI-ассистента', exact: true });
const mode = (page: Page, label = 'Ассистент') => assistant(page).getByRole('button', { name: label, exact: true });

async function expectSideInsets(page: Page, inset: number) {
  const size = page.viewportSize()!;
  await expect.poll(async () => {
    const header = (await page.getByRole('banner').boundingBox())!;
    const panel = (await assistant(page).boundingBox())!;
    return [panel.y - header.y - header.height, size.width - panel.x - panel.width, size.height - panel.y - panel.height];
  }).toEqual([inset, inset, inset]);
}

async function sampleWidthTransition(surface: Locator) {
  return surface.evaluate(node => {
    const transition = node.getAnimations().find(animation =>
      animation instanceof CSSTransition && animation.transitionProperty === 'width');
    if (!transition) return null;
    transition.pause();
    const duration = transition.effect?.getTiming().duration;
    transition.currentTime = 96;
    const width = node.getBoundingClientRect().width;
    transition.finish();
    return { duration, width };
  });
}

async function send(page: Page, text: string) {
  await message(page).fill(text);
  await assistant(page).getByRole('button', { name: 'Отправить сообщение', exact: true }).click();
  await expect(assistant(page).getByText(text, { exact: true }).last()).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(viewport);
});

test('assistant launcher stays visually stable during section transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = (...args) => {
      const transition = start(...args);
      void transition.ready.then(() => {
        for (const animation of document.getAnimations()) {
          if (!(animation instanceof CSSAnimation) || !animation.animationName.startsWith('catalog-content-')) continue;
          animation.pause();
          animation.currentTime = Number(animation.effect?.getTiming().duration) * 0.45;
        }
        document.documentElement.dataset.testTransitionPaused = 'true';
      }, () => {});
      return transition;
    };
  });
  await page.goto('/preview/navigation?section=home');
  const button = launcher(page);
  await expect(button).toBeVisible({ timeout: 25_000 });
  const bounds = (await button.boundingBox())!;
  const clip = { x: bounds.x + 8, y: bounds.y + 8, width: bounds.width - 16, height: bounds.height - 16 };
  const nav = page.getByRole('navigation', { name: 'Разделы каталога' });
  for (const [label, section] of [['Отчёты', 'reports'], ['Источники', 'sources'], ['AI Hub', 'ai'], ['Главная', 'home']]) {
    const before = await page.screenshot({ clip });
    await nav.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-test-transition-paused', 'true');
    await expect(page).toHaveURL(new RegExp(`section=${section}`));
    for (const progress of [0, 0.25, 0.45, 0.75, 0.95]) {
      await page.evaluate(progress => {
        for (const animation of document.getAnimations()) {
          if (animation instanceof CSSAnimation && animation.animationName.startsWith('catalog-content-')) {
            animation.currentTime = Number(animation.effect?.getTiming().duration) * progress;
          }
        }
      }, progress);
      expect(await button.boundingBox()).toEqual(bounds);
      expect((await page.screenshot({ clip })).equals(before), `${section} at ${progress}`).toBe(true);
    }
    await page.evaluate(() => {
      for (const animation of document.getAnimations()) {
        if (animation instanceof CSSAnimation && animation.animationName.startsWith('catalog-content-')) animation.finish();
      }
      delete document.documentElement.dataset.testTransitionPaused;
    });
    await expect(page.locator('html')).not.toHaveAttribute('data-catalog-transition');
  }
});

test('assistant preserves the open chat and draft through sections, a report passport and breadcrumbs', async ({ page }, info) => {
  await page.addInitScript(() => {
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = (...args) => {
      document.documentElement.dataset.documentTransitionStarted = 'true';
      return start(...args);
    };
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args: Parameters<Element['animate']>) {
      const animation = animate.apply(this, args);
      if (this.hasAttribute('data-catalog-screen')) {
        animation.pause();
        animation.currentTime = 120;
      }
      return animation;
    };
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/preview/navigation');
  const startUrl = page.url();
  const button = launcher(page);
  await expect(button).toBeVisible();
  await expect(button).toHaveCSS('background-color', 'rgb(120, 85, 207)');
  const launchBox = (await button.boundingBox())!;
  expect(launchBox).toEqual({ x: 1364, y: 800, width: 52, height: 52 });
  await page.screenshot({ path: info.outputPath('01-launcher.png'), animations: 'disabled' });
  await button.click();
  await expect(assistant(page)).toBeVisible();
  await expectSideInsets(page, 24);
  await expect(button).toHaveCount(0);
  expect(page.url()).toBe(startUrl);
  const history = assistant(page).locator('[data-assistant-history]');
  const historyTitle = history.getByRole('heading', { name: 'Чаты', exact: true });
  const chatRows = history.getByRole('listitem');
  await expect(historyTitle).toHaveCount(0);
  await expect(history.getByText('Пока нет чатов', { exact: true })).toHaveCount(0);
  await expect(chatRows).toHaveCount(0);
  await expect(assistant(page).getByText('Начните чат', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('02-empty.png'), animations: 'disabled' });

  await message(page).fill('   ');
  await message(page).press('Enter');
  await expect(historyTitle).toHaveCount(0);

  await history.getByRole('button', { name: 'Новая беседа', exact: true }).click();
  await expect(historyTitle).toBeVisible();
  await expect(chatRows).toHaveCount(1);
  await expect(chatRows.getByRole('button', { name: 'Новая беседа', exact: true })).toHaveAttribute('aria-current', 'true');
  const newChatActions = chatRows.getByRole('button', { name: 'Действия чата «Новая беседа»' });
  await newChatActions.focus();
  await newChatActions.click();
  await page.getByRole('menuitem', { name: 'Удалить', exact: true }).click();
  await expect(historyTitle).toHaveCount(0);
  await expect(chatRows).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Удалить чат?' })).toHaveCount(0);
  await expect(message(page)).toBeFocused();

  const prompt = 'Где найти отчёт по выручке?';
  await send(page, prompt);
  await expect(historyTitle).toBeVisible();
  await expect(chatRows).toHaveCount(1);
  await expect(chatRows.getByRole('button', { name: prompt, exact: true })).toHaveAttribute('aria-current', 'true');
  const reply = assistant(page).getByText(/название|домен/i).last();
  await expect(reply).toBeVisible();
  await message(page).fill('Покажи разбивку по месяцам');
  await page.screenshot({ path: info.outputPath('03-dialogue.png'), animations: 'disabled' });

  const search = page.getByRole('combobox', { name: 'Поиск по каталогу' });
  const dropdown = page.getByRole('dialog', { name: 'Поиск по каталогу' });
  await search.fill('отчёт');
  await expect(dropdown.getByRole('grid', { name: 'Результаты поиска' })).toBeVisible();
  const popupBox = (await dropdown.boundingBox())!;
  const panelBox = (await assistant(page).boundingBox())!;
  const overlap = {
    left: Math.max(popupBox.x, panelBox.x),
    right: Math.min(popupBox.x + popupBox.width, panelBox.x + panelBox.width),
    top: Math.max(popupBox.y, panelBox.y),
    bottom: Math.min(popupBox.y + popupBox.height, panelBox.y + panelBox.height),
  };
  expect(overlap.right).toBeGreaterThan(overlap.left);
  expect(overlap.bottom).toBeGreaterThan(overlap.top);
  const point = { x: (overlap.left + overlap.right) / 2, y: (overlap.top + overlap.bottom) / 2 };
  await expect.poll(() => dropdown.evaluate((menu, { x, y }) => menu.contains(document.elementFromPoint(x, y)), point)).toBe(true);
  await search.press('Escape');
  await expect(dropdown).toHaveCount(0);
  await expect(message(page)).toHaveValue('Покажи разбивку по месяцам');

  const nav = page.getByRole('navigation', { name: 'Разделы каталога' });
  const initialPanel = await assistant(page).elementHandle();
  const initialBounds = await assistant(page).boundingBox();
  await nav.getByRole('button', { name: 'Отчёты', exact: true }).click();
  await expect(page).toHaveURL(/section=reports/);
  await expect(assistant(page)).toBeVisible();
  expect(await page.getByRole('main').evaluate(node => Number(getComputedStyle(node).opacity))).toBeLessThan(1);
  expect(await assistant(page).evaluate(node => {
    const box = node.getBoundingClientRect();
    return getComputedStyle(node).opacity === '1' && node.contains(document.elementFromPoint(box.right - 16, box.top + 96));
  })).toBe(true);
  await expect(message(page)).toHaveValue('Покажи разбивку по месяцам');
  const report = page.locator('[data-table-report-id="demo-report-sales-plan"]');
  await expect(report).toBeVisible();
  await report.getByRole('button', { name: 'Открыть отчёт «План-Факт продажи»', exact: true }).click({ position: { x: 10, y: 10 } });
  await expect(page).toHaveURL(/report=demo-report-sales-plan/);
  await expect(reply).toBeVisible();
  await expect(message(page)).toHaveValue('Покажи разбивку по месяцам');
  await page.getByRole('navigation', { name: 'Хлебные крошки' }).getByRole('button', { name: 'Отчёты', exact: true }).click();
  await expect(page).not.toHaveURL(/report=/);
  await expect(reply).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-document-transition-started');
  expect(await initialPanel?.evaluate(node => node.isConnected)).toBe(true);
  expect(await assistant(page).boundingBox()).toEqual(initialBounds);
  const returnUrl = page.url();
  await close(page).click();
  await expect(button).toBeFocused();
  expect(page.url()).toBe(returnUrl);
  await button.click();
  await expect(message(page)).toHaveValue('Покажи разбивку по месяцам');
  expect(errors).toEqual([]);
});

test('mode menu stays open across the gap and the three reply branches work', async ({ page }, info) => {
  await page.goto('/preview/navigation?section=reports');
  await launcher(page).click();
  const trigger = mode(page);
  await trigger.click();
  const list = page.getByRole('listbox');
  const options = list.getByRole('option');
  await expect(options).toHaveCount(2);
  await expect(list.getByRole('option', { name: /Ассистент/ })).toHaveAttribute('aria-selected', 'true');
  await expect(list.locator('[data-selection-check]')).toHaveCount(1);
  const controlBox = (await trigger.boundingBox())!;
  const listBox = (await list.boundingBox())!;
  expect(listBox.width).toBe(238);
  await expect(list).toHaveCSS('transition-property', 'opacity, visibility');
  await expect(list).toHaveCSS('transition-duration', '0.18s, 0s');
  expect(Math.abs(controlBox.y - listBox.y - listBox.height - 8)).toBeLessThan(1);
  expect(Math.abs(controlBox.x + controlBox.width - listBox.x - listBox.width)).toBeLessThan(1);
  await page.mouse.move(controlBox.x + 12, controlBox.y + 10);
  await page.mouse.move(controlBox.x + 12, controlBox.y - 4);
  await expect(list).toBeVisible();
  await page.screenshot({ path: info.outputPath('04-modes.png'), animations: 'disabled' });
  await list.getByRole('option', { name: /Подобрать решение/ }).click();
  await expect(list).toHaveCount(0);
  const solution = mode(page, 'Подобрать решение');
  await solution.click();
  await expect(list.getByRole('option', { name: /Подобрать решение/ })).toHaveAttribute('aria-selected', 'true');
  await solution.click();
  await expect(list).toHaveCount(0);
  await send(page, 'Как автоматизировать сверку?');
  await expect(assistant(page).getByText(/входные данные/i)).toBeVisible();

  await solution.click();
  await list.getByRole('option', { name: /Ассистент/ }).click();
  await send(page, 'Где найти показатель выручки?');
  await expect(assistant(page).getByText(/Метрики и показатели/i).last()).toBeVisible();
  await send(page, 'Добрый день!');
  await expect(assistant(page).getByText(/какой результат вы хотите получить/i)).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 600 });
  await trigger.click();
  await expect(list).toHaveCSS('transition-duration', '0s, 0s');
  const narrowListBox = (await list.boundingBox())!;
  expect(narrowListBox.x).toBeGreaterThanOrEqual((await assistant(page).boundingBox())!.x);
  await list.getByRole('option', { name: 'Подобрать решение' }).click();
  await expect(solution.locator('span')).toHaveCSS('white-space', 'nowrap');
  await expect(solution).toBeInViewport();
});

test('messages appear smoothly with a visible thinking state before the reply', async ({ page }, info) => {
  const start = new Date('2026-11-12T12:00:00Z');
  await page.clock.install({ time: start });
  await page.goto('/preview/navigation?section=reports');
  await launcher(page).click();
  const log = assistant(page).getByRole('log', { name: 'Сообщения чата' });
  const pending = log.locator('[data-assistant-message="pending"]');
  const dots = pending.locator('[aria-hidden="true"] > i');
  const question = log.locator('[data-assistant-message="question"]').last();
  const replies = log.locator('[data-assistant-message="answer"]');
  await message(page).fill('Где найти отчёт?');
  await page.clock.pauseAt(start.getTime() + 60_000);
  await message(page).press('Enter');
  await expect(question).toHaveText('Где найти отчёт?');
  await expect(question).toHaveCSS('animation-duration', '0.18s');
  await expect(pending.getByText('Готовлю ответ', { exact: true })).toBeVisible();
  await expect(dots).toHaveCount(3);
  await expect(dots.last()).toHaveCSS('animation-iteration-count', 'infinite');
  await page.clock.runFor(700);
  await expect(pending).toBeVisible();
  await expect(replies).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('assistant-thinking.png'), animations: 'disabled' });
  await page.clock.runFor(700);
  await expect(pending).toHaveCount(0);
  await expect(replies).toContainText('Проверьте раздел «Отчёты»');
  await expect(replies.locator('p')).toHaveCSS('animation-duration', '0.18s');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await message(page).fill('Подскажи, пожалуйста');
  await message(page).press('Enter');
  await expect(question).toHaveCSS('animation-name', 'none');
  await expect(pending.getByText('Готовлю ответ', { exact: true })).toBeVisible();
  await expect(dots.last()).toHaveCSS('animation-name', 'none');
  await page.clock.runFor(1400);
  await expect(replies).toHaveCount(2);
});

test('chat actions, minimum width and full-width view preserve their state', async ({ page }, info) => {
  await page.goto('/preview/navigation?section=reports');
  await launcher(page).click();
  const panel = assistant(page);
  const log = panel.getByRole('log', { name: 'Сообщения чата' });
  const history = panel.locator('[data-assistant-history]');
  const grip = panel.getByRole('separator', { name: 'Ширина списка чатов' });
  const edgeColor = () => history.evaluate(node => getComputedStyle(node, '::before').backgroundColor);
  await expect.poll(edgeColor).toBe('rgb(215, 230, 245)');
  await grip.hover();
  await expect(grip).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(grip).toHaveCSS('cursor', 'col-resize');
  await expect(grip.locator('*')).toHaveCount(0);
  await expect.poll(edgeColor).toBe('rgb(0, 123, 252)');
  await panel.getByRole('heading', { name: 'AI-ассистент', exact: true }).hover();
  await expect.poll(edgeColor).toBe('rgb(215, 230, 245)');
  await expect(grip).toHaveAttribute('aria-valuenow', '240');
  expect((await panel.boundingBox())?.width).toBe(730);
  await expect.poll(async () => (await log.boundingBox())?.width).toBe(488);
  await page.setViewportSize({ width: 768, height: 600 });
  await expect(grip).toHaveAttribute('aria-valuenow', '230');
  await expect.poll(async () => (await panel.boundingBox())?.width).toBe(720);
  await expect.poll(async () => (await log.boundingBox())?.width).toBe(488);
  await page.setViewportSize(viewport);
  await expect(grip).toHaveAttribute('aria-valuenow', '240');
  await expect.poll(async () => (await log.boundingBox())?.width).toBe(488);
  const origin = (await grip.boundingBox())!;
  await page.mouse.move(origin.x + origin.width / 2, origin.y + origin.height / 2);
  await page.mouse.down();
  await page.mouse.move(origin.x - 120, origin.y + origin.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(grip).toHaveAttribute('aria-valuenow', '160');
  await send(page, 'Где отчёт по продажам?');
  await panel.getByRole('button', { name: 'Новая беседа', exact: true }).click();
  await expect(panel.getByText('Начните чат', { exact: true })).toBeVisible();
  const secondQuestion = 'Сравнение плана с фактическими продажами за несколько кварталов';
  await send(page, secondQuestion);
  await panel.getByRole('button', { name: 'Где отчёт по продажам?', exact: true }).click();
  await expect(log.getByText('Где отчёт по продажам?', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: secondQuestion, exact: true }).click();
  await expect(log.getByText(secondQuestion, { exact: true })).toBeVisible();
  const actions = panel.getByRole('button', { name: /^Действия чата.*Сравнение/ });
  await actions.focus();
  await expect(actions).toBeVisible();
  await expect.poll(async () => history.evaluate(node => {
    const viewport = node.firstElementChild!;
    return [viewport.scrollLeft, viewport.scrollWidth - viewport.clientWidth];
  })).toEqual([0, 0]);
  await actions.click();
  await page.getByText('Переименовать', { exact: true }).click();
  await panel.getByRole('textbox', { name: /название/i }).fill('Продажи по кварталам');
  await panel.getByRole('button', { name: 'Сохранить', exact: true }).click();
  const renamed = panel.getByRole('button', { name: /^Действия чата.*Продажи по кварталам/ });
  const renamedTitle = panel.getByRole('button', { name: 'Продажи по кварталам', exact: true });
  const renamedRow = renamedTitle.locator('..');
  await expect(renamed).toBeFocused();
  await expect(renamedTitle).toHaveAttribute('aria-current', 'true');
  await expect(renamedTitle).toHaveCSS('color', 'rgb(32, 32, 40)');
  await renamedTitle.hover();
  await expect(renamedRow).toHaveCSS('background-color', 'rgb(226, 232, 241)');
  await panel.getByRole('heading', { name: 'AI-ассистент', exact: true }).hover();
  await expect(renamedRow).toHaveCSS('background-color', 'rgb(240, 241, 244)');
  const renameInput = panel.getByRole('textbox', { name: 'Название чата' });
  await renamedRow.dblclick({ position: { x: 10, y: 18 } });
  await expect(renameInput).toBeFocused();
  await expect(renameInput).toHaveValue('Продажи по кварталам');
  await renameInput.fill('Черновик названия');
  await renameInput.press('Escape');
  await expect(renamedTitle).toBeVisible();
  await renamed.focus();
  await renamed.click();
  await page.getByText('Удалить', { exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: 'Удалить чат?' });
  await expect(confirmation).toBeVisible();
  await page.screenshot({ path: info.outputPath('05-delete.png'), animations: 'disabled' });
  await confirmation.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(confirmation).toHaveCount(0);
  await expect(renamed).toBeFocused();
  await renamed.click();
  await page.getByText('Удалить', { exact: true }).click();
  await confirmation.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(renamed).toHaveCount(0);

  await message(page).fill('Черновик после удаления');
  await panel.getByRole('button', { name: 'Развернуть панель', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Свернуть панель', exact: true })).toBeVisible();
  await expect.poll(async () => (await panel.boundingBox())?.width).toBe(viewport.width);
  await expect(message(page)).toHaveValue('Черновик после удаления');
  await page.screenshot({ path: info.outputPath('06-expanded.png'), animations: 'disabled' });
  await panel.getByRole('button', { name: 'Свернуть панель', exact: true }).click();
  await expect(grip).toHaveAttribute('aria-valuenow', '160');
  await expect(message(page)).toHaveValue('Черновик после удаления');
  await page.setViewportSize({ width: 768, height: 600 });
  await expectSideInsets(page, 24);
  await expect(close(page)).toBeInViewport();
  await expect(panel.getByRole('button', { name: 'Отправить сообщение' })).toBeInViewport();
  await page.screenshot({ path: info.outputPath('07-compact.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 600 });
  await expectSideInsets(page, 12);
  await expect(close(page)).toBeInViewport();
  await panel.getByRole('button', { name: 'Развернуть список чатов' }).click();
  await expect(panel.getByRole('button', { name: 'Новая беседа' })).toBeVisible();
  await panel.getByRole('button', { name: 'Где отчёт по продажам?', exact: true }).dblclick();
  await expect(renameInput).toBeFocused();
  await renameInput.fill('Поиск отчёта по продажам');
  await renameInput.press('Enter');
  const compactChat = panel.getByRole('button', { name: 'Поиск отчёта по продажам', exact: true });
  await expect(compactChat).toBeVisible();
  await compactChat.click();
  await expect(panel.getByRole('button', { name: 'Развернуть список чатов' })).toBeVisible();
  await close(page).click();
  await expect(launcher(page)).toBeVisible();
  expect(await launcher(page).boundingBox()).toEqual({ x: 326, y: 500, width: 52, height: 52 });
});

test('assistant confirms deletion for renamed chats, drafts and sent messages', async ({ page }) => {
  await page.goto('/preview/navigation?section=ai');
  await launcher(page).click();
  const panel = assistant(page);
  const history = panel.locator('[data-assistant-history]');
  const chat = history.getByRole('listitem');
  const confirmation = page.getByRole('dialog', { name: 'Удалить чат?' });
  const newChat = history.getByRole('button', { name: 'Новая беседа', exact: true }).first();

  async function chooseDelete() {
    const actions = chat.getByRole('button', { name: /^Действия чата/ });
    await actions.focus();
    await actions.click();
    await page.getByRole('menuitem', { name: 'Удалить', exact: true }).click();
  }

  await newChat.click();
  const rename = panel.getByRole('textbox', { name: 'Название чата' });
  await chat.getByRole('button', { name: 'Новая беседа', exact: true }).dblclick();
  await rename.fill('Рабочий чат');
  await rename.press('Enter');
  await chat.getByRole('button', { name: 'Рабочий чат', exact: true }).dblclick();
  await rename.fill('Новая беседа');
  await rename.press('Enter');
  await chooseDelete();
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(chat).toHaveCount(0);

  await newChat.click();
  await message(page).fill('Черновик вопроса');
  await chooseDelete();
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(message(page)).toHaveValue('Черновик вопроса');

  await send(page, 'Новая беседа');
  await expect(chat.getByRole('button', { name: 'Новая беседа', exact: true })).toBeVisible();
  await chooseDelete();
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(chat).toHaveCount(0);
  await expect(message(page)).toBeFocused();
});

test('assistant and chat history animate their widths and respect reduced motion', async ({ page }, info) => {
  await page.goto('/preview/navigation?section=reports');
  await launcher(page).click();
  const panel = assistant(page);
  const history = panel.locator('[data-assistant-history]');
  const historyIndicator = panel.getByRole('button', { name: 'История', exact: true });
  const compactButton = panel.getByRole('button', { name: 'Уменьшить высоту панели вдвое', exact: true });
  const expandButton = panel.getByRole('button', { name: 'Развернуть панель', exact: true });
  const closeButton = close(page);
  await expect(historyIndicator).toBeDisabled();
  await expect(historyIndicator.locator('svg')).toBeVisible();
  const tools = [historyIndicator, compactButton, expandButton];
  for (const tool of tools) {
    await expect(tool).toHaveCSS('border-top-width', '0px');
    await expect(tool).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await tool.hover();
    await expect(tool).toHaveCSS('background-color', 'rgb(246, 248, 251)');
  }
  const [historyBox, compactBox, expandBox, closeBox] = await Promise.all(
    [...tools, closeButton].map(button => button.boundingBox()),
  );
  expect(compactBox!.x - historyBox!.x - historyBox!.width).toBe(4);
  expect(expandBox!.x - compactBox!.x - compactBox!.width).toBe(4);
  expect(closeBox!.x - expandBox!.x - expandBox!.width).toBe(25);
  await expect(closeButton).toHaveCSS('border-top-width', '1px');
  await panel.getByRole('heading', { name: 'AI-ассистент', exact: true }).hover();
  await expect(expandButton).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.screenshot({ path: info.outputPath('assistant-header-actions.png'), animations: 'disabled' });
  const indicator = (await historyIndicator.boundingBox())!;
  await page.mouse.click(indicator.x + indicator.width / 2, indicator.y + indicator.height / 2);
  await expect(history).toHaveAttribute('data-collapsed', 'false');
  const collapseButton = panel.getByRole('button', { name: 'Свернуть список чатов' });
  await expect(collapseButton).toHaveCSS('background-color', 'rgb(238, 242, 246)');
  await expect(collapseButton).toHaveCSS('color', 'rgb(113, 134, 165)');
  await expect(collapseButton).toHaveCSS('width', '40px');
  await expect(collapseButton.locator('span').first()).toHaveCSS('opacity', '1');
  await collapseButton.hover();
  await expect(collapseButton).toHaveCSS('background-color', 'rgb(231, 242, 255)');
  await expect(collapseButton).toHaveCSS('color', 'rgb(0, 103, 220)');
  await expect(collapseButton.locator('span').last()).toHaveCSS('opacity', '1');
  await send(page, 'Где найти каталог?');
  const newChat = panel.getByRole('button', { name: 'Новая беседа' });
  const chat = panel.getByRole('button', { name: 'Где найти каталог?', exact: true });
  const rowStep = async () => (await chat.locator('..').boundingBox())!.y - (await newChat.boundingBox())!.y;
  const expandedStep = await rowStep();
  await message(page).fill('Черновик при сворачивании');
  await collapseButton.click();
  const collapse = await sampleWidthTransition(history);
  expect(collapse?.duration).toBe(320);
  expect(collapse?.width).toBeGreaterThan(64);
  expect(collapse?.width).toBeLessThan(240);
  await expect.poll(async () => (await history.boundingBox())?.width).toBe(64);
  await expect(newChat).toHaveCSS('border-radius', '50%');
  await expect(chat).toHaveCSS('border-radius', '50%');
  await expect(chat).toHaveAttribute('aria-current', 'true');
  await expect.poll(rowStep).toBe(expandedStep);
  await expect.poll(() => history.locator('h3').evaluate(node => getComputedStyle(node, '::after').opacity)).toBe('1');
  await page.screenshot({ path: info.outputPath('collapsed-chat-history.png'), animations: 'disabled' });
  await newChat.click();
  await expect(panel.getByRole('heading', { name: 'Начните чат' })).toBeVisible();
  await chat.click();
  await expect(message(page)).toHaveValue('Черновик при сворачивании');
  await chat.dblclick();
  const rename = panel.getByRole('textbox', { name: 'Название чата' });
  await expect(rename).toBeFocused();
  await expect.poll(async () => (await history.boundingBox())?.width).toBe(240);
  await rename.press('Escape');

  await panel.getByRole('button', { name: 'Развернуть панель' }).click();
  const expand = await sampleWidthTransition(panel);
  expect(expand?.duration).toBe(320);
  expect(expand?.width).toBeGreaterThan(730);
  expect(expand?.width).toBeLessThan(viewport.width);
  await expect(message(page)).toHaveValue('Черновик при сворачивании');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await panel.getByRole('button', { name: 'Свернуть панель' }).click();
  await expectSideInsets(page, 24);
  expect(await sampleWidthTransition(panel)).toBeNull();
  await collapseButton.click();
  expect(await sampleWidthTransition(history)).toBeNull();
});

test('floating assistant resizes from both edges, halves its height and moves by the header', async ({ page }, info) => {
  await page.goto('/preview/navigation?section=reports');
  await launcher(page).click();
  const panel = assistant(page);
  const top = panel.getByRole('separator', { name: 'Верхняя граница панели ассистента' });
  const bottom = panel.getByRole('separator', { name: 'Нижняя граница панели ассистента' });
  const header = panel.getByRole('group', { name: 'Переместить панель стрелками' });
  const compact = panel.getByRole('button', { name: 'Уменьшить высоту панели вдвое' });
  const reset = panel.getByRole('button', { name: 'Вернуть исходный размер и положение панели' });
  const historyGrip = panel.getByRole('separator', { name: 'Ширина списка чатов' });
  const expectBounds = (x: number, y: number, height: number) =>
    expect.poll(() => panel.boundingBox()).toEqual({ x, y, width: 730, height });
  const drag = async (target: Locator, dx: number, dy: number, gesture: string) => {
    const { x, y, width, height } = (await target.boundingBox())!;
    await page.mouse.move(x + width / 2, y + height / 2);
    await page.mouse.down();
    await page.mouse.move(x + width / 2 + dx, y + height / 2 + dy, { steps: 4 });
    await expect(panel).toHaveAttribute('data-gesture', gesture);
    await page.mouse.up();
    await expect(panel).not.toHaveAttribute('data-gesture');
  };

  await message(page).fill('Черновик при изменении размера');
  await expectBounds(686, 72, 804);
  const compactIcon = await compact.locator('svg').innerHTML();
  await page.screenshot({ path: info.outputPath('assistant-default-height.png'), animations: 'disabled' });
  await compact.click();
  await expectBounds(686, 474, 402);
  await expect(reset).toHaveCSS('border-top-width', '0px');
  await reset.hover();
  await expect(reset).toHaveCSS('background-color', 'rgb(246, 248, 251)');
  expect(await reset.locator('svg').innerHTML()).not.toBe(compactIcon);
  await page.screenshot({ path: info.outputPath('assistant-half-height.png'), animations: 'disabled' });
  await reset.click();
  await expectBounds(686, 72, 804);
  expect(await compact.locator('svg').innerHTML()).toBe(compactIcon);

  const gripBox = (await historyGrip.boundingBox())!;
  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(gripBox.x + gripBox.width / 2 - 60, gripBox.y + gripBox.height / 2, { steps: 4 });
  await expect(historyGrip).toHaveAttribute('aria-valuenow', '180');
  await expect(reset).toBeEnabled();
  await page.mouse.up();
  await reset.click();
  await expect(historyGrip).toHaveAttribute('aria-valuenow', '240');
  expect(await compact.locator('svg').innerHTML()).toBe(compactIcon);
  await expectBounds(686, 72, 804);

  await drag(header, -100, 0, 'move');
  await expectBounds(586, 72, 804);
  await expect(reset).toBeEnabled();
  await reset.click();
  await expectBounds(686, 72, 804);

  const panelBounds = (await panel.boundingBox())!;
  await page.mouse.move(panelBounds.x + panelBounds.width / 2, panelBounds.y + 0.5);
  expect(await top.evaluate(node => node.matches(':hover'))).toBe(true);
  await expect(top).toHaveCSS('cursor', 'row-resize');
  await expect(bottom).toHaveCSS('cursor', 'row-resize');
  await expect(top.locator('*')).toHaveCount(0);
  await expect(bottom.locator('*')).toHaveCount(0);
  await expect(panel).toHaveCSS('border-top-color', 'rgb(0, 123, 252)');
  await drag(top, 0, 120, 'top');
  await expectBounds(686, 192, 684);
  await expect(reset).toBeEnabled();
  await drag(bottom, 0, -100, 'bottom');
  await expectBounds(686, 192, 584);
  await drag(header, -200, -80, 'move');
  await expectBounds(486, 112, 584);
  await bottom.press('ArrowUp');
  await expectBounds(486, 112, 576);

  await panel.getByRole('button', { name: 'Развернуть панель' }).click();
  await expect.poll(async () => (await panel.boundingBox())?.width).toBe(viewport.width);
  await expect(top).toHaveCount(0);
  await expect(reset).toBeEnabled();
  await panel.getByRole('button', { name: 'Свернуть панель' }).click();
  await expectBounds(486, 112, 576);
  await expect(message(page)).toHaveValue('Черновик при изменении размера');
  await bottom.press('Home');
  await expectBounds(486, 112, 240);
  await expect(panel.getByRole('button', { name: 'Отправить сообщение' })).toBeInViewport();
  await historyGrip.press('Home');
  await expect(historyGrip).toHaveAttribute('aria-valuenow', '160');
  await panel.getByRole('button', { name: 'Развернуть панель' }).click();
  await expect.poll(async () => (await panel.boundingBox())?.width).toBe(viewport.width);
  await reset.click();
  await expectBounds(686, 72, 804);
  await expect(historyGrip).toHaveAttribute('aria-valuenow', '240');
  await expect(message(page)).toHaveValue('Черновик при изменении размера');
  await expect(compact).toBeEnabled();

  await historyGrip.press('Home');
  await expect(historyGrip).toHaveAttribute('aria-valuenow', '160');
  await top.press('Home');
  await expectBounds(686, 636, 240);
  await header.press('ArrowLeft');
  await expectBounds(678, 636, 240);
  await close(page).click();
  await launcher(page).click();
  await expectBounds(686, 72, 804);
  await expect(historyGrip).toHaveAttribute('aria-valuenow', '240');
  await expect(compact).toBeEnabled();
  await expect(message(page)).toHaveValue('Черновик при изменении размера');

  await panel.getByRole('button', { name: 'Развернуть панель' }).click();
  await expect.poll(async () => (await panel.boundingBox())?.width).toBe(viewport.width);
  await close(page).click();
  await launcher(page).click();
  await expectBounds(686, 72, 804);
  await expect(message(page)).toHaveValue('Черновик при изменении размера');
});

test('assistant width follows the left edge and restores its default width', async ({ page }, info) => {
  await page.setViewportSize(viewport);
  await page.goto('/preview/navigation?section=ai');
  await launcher(page).click();
  const panel = assistant(page);
  const edge = panel.getByRole('separator', { name: 'Ширина панели ассистента' });
  const reset = panel.getByRole('button', { name: 'Вернуть исходный размер и положение панели' });
  const history = panel.getByRole('separator', { name: 'Ширина списка чатов' });
  const expectWidth = (width: number) => expect.poll(async () => {
    const bounds = (await panel.boundingBox())!;
    return { right: bounds.x + bounds.width, width: bounds.width, height: bounds.height };
  }).toEqual({ right: 1416, width, height: 804 });
  const dragTo = async (dx: number) => {
    const bounds = (await panel.boundingBox())!;
    const x = bounds.x + 0.5;
    const y = bounds.y + bounds.height / 2;
    await page.mouse.move(x, y);
    await expect(panel).toHaveCSS('border-left-color', 'rgb(0, 123, 252)');
    await page.mouse.down();
    await page.mouse.move(x + dx, y, { steps: 4 });
    await expect(panel).toHaveAttribute('data-gesture', 'left');
    await page.mouse.up();
    await expect(panel).not.toHaveAttribute('data-gesture');
  };

  await expectWidth(730);
  await expect(edge).toHaveCSS('cursor', 'col-resize');
  await expect(edge.locator('*')).toHaveCount(0);
  await message(page).fill('Черновик при изменении ширины');
  await dragTo(-160);
  await expectWidth(890);
  await expect(history).toHaveAttribute('aria-valuenow', '240');
  await expect(reset).toBeEnabled();
  await page.screenshot({ path: info.outputPath('assistant-width-hover.png'), animations: 'disabled' });
  await page.mouse.move(600, 300);
  await expect(panel).toHaveCSS('border-left-color', 'rgb(215, 230, 245)');

  await dragTo(600);
  await expectWidth(520);
  await expect(message(page)).toBeInViewport();
  await expect(close(page)).toBeInViewport();
  await edge.press('ArrowLeft');
  await expectWidth(528);
  await edge.press('End');
  await expectWidth(1392);
  await edge.press('Home');
  await expectWidth(520);

  await panel.getByRole('button', { name: 'Развернуть панель' }).click();
  await expect(edge).toHaveCount(0);
  await panel.getByRole('button', { name: 'Свернуть панель' }).click();
  await expectWidth(520);
  await reset.click();
  await expectWidth(730);
  await edge.press('ArrowLeft');
  await expectWidth(738);
  await close(page).click();
  await launcher(page).click();
  await expectWidth(730);
  await expect(message(page)).toHaveValue('Черновик при изменении ширины');

  await page.setViewportSize({ width: 500, height: 700 });
  await expect(edge).toHaveCount(0);
  await expectSideInsets(page, 12);
});

test('assistant morph scales the opaque panel and its contents to the launcher', async ({ page }) => {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args: Parameters<Element['animate']>) {
      const animation = animate.apply(this, args);
      if (this.hasAttribute('data-assistant-expanded')) animation.pause();
      return animation;
    };
    const reverse = Animation.prototype.reverse;
    Animation.prototype.reverse = function () {
      reverse.call(this);
      if ((this.effect as KeyframeEffect).target?.hasAttribute('data-assistant-expanded')) {
        void this.ready.then(() => this.pause());
      }
    };
  });
  await page.goto('/preview/navigation?section=reports');
  const buttonBounds = (await launcher(page).boundingBox())!;
  await launcher(page).click();
  const surface = page.locator('[data-ai-assistant-morph]');
  const panel = surface.locator('[data-assistant-expanded]');
  const sample = (positions: number[]) => panel.evaluate(async (element, positions) => {
    const animation = element.getAnimations().find(item => item instanceof CSSAnimation === false && item instanceof CSSTransition === false)!;
    await animation.ready;
    const duration = Number(animation.effect?.getTiming().duration);
    const header = element.querySelector('h2')!;
    const frames = positions.map(progress => {
      animation.currentTime = duration * progress;
      const { x, y, width, height } = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { x, y, width, height, headingHeight: header.getBoundingClientRect().height,
        opacity: style.opacity, fill: style.backgroundColor };
    });
    const rate = animation.playbackRate;
    animation.finish();
    return { duration, rate, frames };
  }, positions);
  const opening = await sample([0, 0.25, 0.75]);
  expect(opening.duration).toBe(300);
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    expect(opening.frames[0][key]).toBeCloseTo(buttonBounds[key], 1);
  }
  expect(opening.frames[0].width).toBeLessThan(opening.frames[1].width);
  expect(opening.frames[1].height).toBeLessThan(opening.frames[2].height);
  expect(opening.frames[0].headingHeight).toBeLessThan(opening.frames[1].headingHeight);
  await expect(surface).toHaveCSS('clip-path', 'none');
  await expect(panel).toHaveCSS('transform', 'none');
  await assistant(page).getByRole('button', { name: 'Развернуть панель', exact: true }).click();
  await expect.poll(async () => (await panel.boundingBox())?.width).toBe(viewport.width);
  await close(page).click();
  await expect(launcher(page)).toHaveCount(0);
  const exit = await sample([1, 0.75, 0.25, 0]);
  expect(exit.rate).toBe(-1.4);
  expect(exit.duration).toBe(opening.duration);
  expect(exit.frames[0].width).toBe(viewport.width);
  expect(exit.frames[1].width).toBeLessThan(exit.frames[0].width);
  expect(exit.frames[2].height).toBeLessThan(exit.frames[1].height);
  expect(exit.frames[2].headingHeight).toBeLessThan(exit.frames[1].headingHeight);
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    expect(exit.frames[3][key]).toBeCloseTo(buttonBounds[key], 1);
  }
  for (const frame of [...opening.frames, ...exit.frames]) {
    expect(frame.fill).toBe('rgb(255, 255, 255)');
    expect(frame.opacity).toBe('1');
  }
  await expect(launcher(page)).toBeFocused();
  await expect(surface).toHaveCount(0);
  await expect(launcher(page)).toHaveCSS('background-color', 'rgb(120, 85, 207)');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await launcher(page).press('Enter');
  await expect(assistant(page)).toBeVisible();
  expect(await panel.evaluate(node => node.getAnimations().length)).toBe(0);
  await close(page).click();
  await expect(launcher(page)).toBeFocused();
});
