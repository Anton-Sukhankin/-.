import { expect, test } from '@playwright/test';

const faqEntry = '/preview/navigation?section=questions';
const mineEntry = faqEntry + '&questions.tab=mine';
const addedNotice = 'Вопрос добавлен в демонстрационный список';

test('the dialog validates both fields and each dismissal restores focus and discards the draft', async ({ page }) => {
  await page.goto(faqEntry);
  const trigger = page.getByRole('button', { name: 'Задать вопрос', exact: true });
  const modal = page.getByRole('dialog', { name: 'Задать вопрос' });
  const subject = modal.getByRole('textbox', { name: 'Тема', exact: true });
  const message = modal.getByRole('textbox', { name: 'Ваш вопрос', exact: true });
  const send = modal.getByRole('button', { name: 'Отправить вопрос' });

  await trigger.press('Enter');
  await expect(subject).toBeFocused();
  await expect(subject).toHaveValue('');
  await expect(message).toHaveValue('');
  await expect(subject).toHaveAttribute('required', '');
  await expect(message).toHaveAttribute('required', '');
  await expect(send).toBeEnabled();
  await modal.getByRole('heading', { name: 'Задать вопрос' }).click();
  await expect(modal.getByRole('alert')).toHaveCount(0);
  await subject.fill('   ');
  await subject.press('Tab');
  await expect(message).toBeFocused();
  await expect(modal.getByRole('alert')).toHaveCount(0);
  await message.fill('  ');
  await message.press('Tab');
  const attach = modal.getByRole('button', { name: 'Прикрепить файл', exact: true });
  await expect(attach).toBeFocused();
  await attach.press('Tab');
  await expect(modal.getByRole('button', { name: 'Отмена', exact: true })).toBeFocused();
  await expect(modal.getByRole('alert')).toHaveCount(0);
  await send.click();
  await expect(subject).toBeFocused();
  await expect(subject).toHaveAccessibleDescription('Поле «Тема» обязательно для заполнения.');
  await expect(message).toHaveAccessibleDescription('Введите текст вопроса, чтобы отправить его.');
  await expect(send).toBeEnabled();
  await subject.fill('Проверочная тема');
  await expect(subject).not.toHaveAttribute('aria-invalid', 'true');
  await send.click();
  await expect(message).toBeFocused();
  await expect(modal.getByRole('alert')).toHaveCount(1);
  await message.fill('Черновик, который нужно отменить');
  await expect(modal.getByRole('alert')).toHaveCount(0);
  await expect(send).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(trigger).toBeFocused();

  for (const name of ['Закрыть форму вопроса', 'Отмена']) {
    await trigger.click();
    await expect(subject).toBeFocused();
    await expect(subject).toHaveValue('');
    await expect(message).toHaveValue('');
    await expect(modal.getByRole('alert')).toHaveCount(0);
    await subject.fill('Новый черновик');
    await modal.getByRole('button', { name, exact: true }).click();
    await expect(modal).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
  await expect(page.getByRole('tab', { name: 'Мои вопросы 6', exact: true })).toBeVisible();
  await expect(page.getByText(addedNotice, { exact: true })).toHaveCount(0);
});

test('submits once from FAQ and keeps the expanded answer and both tab contexts', async ({ page }) => {
  await page.goto(mineEntry);
  const tabs = page.getByRole('tablist', { name: 'Вопросы и ответы' });
  const newChip = page.getByRole('button', { name: /^Новый \d+$/ });
  const mineSearch = page.getByRole('searchbox', { name: 'Поиск по темам и сообщениям' });
  await newChip.click();
  await mineSearch.fill('проверочный отчёт');

  await tabs.getByRole('tab', { name: /^FAQ/ }).click();
  const faqSearch = page.getByRole('searchbox', { name: 'Поиск в FAQ' });
  await faqSearch.fill('как получить доступ');
  const answer = page.getByRole('button', { name: 'Как получить доступ к отчёту?', exact: true });
  await answer.click();
  const trigger = page.getByRole('button', { name: 'Задать вопрос', exact: true });
  await trigger.click();
  const modal = page.getByRole('dialog', { name: 'Задать вопрос' });
  await modal.getByRole('textbox', { name: 'Тема', exact: true }).fill('  Проверочный отчёт  ');
  await modal.getByRole('textbox', { name: 'Ваш вопрос', exact: true }).fill('  Уточните порядок доступа.  ');
  await modal.locator('form').evaluate((form: HTMLFormElement) => {
    form.requestSubmit();
    form.requestSubmit();
  });

  await expect(modal).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(/section=questions$/);
  await expect(faqSearch).toHaveValue('как получить доступ');
  await expect(answer).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText(addedNotice, { exact: true })).toBeVisible();
  await tabs.getByRole('tab', { name: 'Мои вопросы 7', exact: true }).click();
  await expect(mineSearch).toHaveValue('проверочный отчёт');
  await expect(newChip).toHaveAttribute('aria-pressed', 'true');
  const list = page.getByRole('list', { name: 'Список обращений' });
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list.getByRole('heading')).toHaveText('Проверочный отчёт');
  await expect(list.getByText('Новый', { exact: true })).toBeVisible();
  await expect(list.locator('time')).toHaveAttribute('datetime', /^\d{4}-\d\d-\d\dT/);
  await mineSearch.fill('порядок доступа');
  await expect(list.getByRole('heading')).toHaveText('Проверочный отчёт');
  await mineSearch.fill('');
  await expect(newChip).toHaveAccessibleName('Новый 3');
  await expect(page.getByRole('button', { name: 'Все 7', exact: true })).toBeVisible();
});

test('submits from My questions without resetting its active filter and retains the item until reload', async ({ page }) => {
  await page.goto(mineEntry);
  const work = page.getByRole('button', { name: /^В работе \d+$/ });
  await work.click();
  const trigger = page.getByRole('button', { name: 'Задать вопрос', exact: true });
  await trigger.click();
  const modal = page.getByRole('dialog', { name: 'Задать вопрос' });
  await modal.getByRole('textbox', { name: 'Тема', exact: true }).fill('Согласование новой метрики');
  await modal.getByRole('textbox', { name: 'Ваш вопрос', exact: true }).fill('Кто подтверждает описание показателя?');
  await modal.getByRole('button', { name: 'Отправить вопрос' }).click();
  await expect(page).toHaveURL(/questions\.tab=mine$/);
  await expect(work).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Согласование новой метрики' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Мои вопросы 7', exact: true })).toBeVisible();
  await expect(page.getByText(addedNotice, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Закрыть уведомление' }).click();
  await expect(trigger).toBeFocused();

  const nav = page.getByRole('navigation', { name: 'Разделы каталога' });
  await nav.getByRole('button', { name: 'Справочники ИС', exact: true }).click();
  await expect(page).toHaveURL(/section=systems/);
  await page.goBack();
  await expect(page.getByRole('tab', { name: 'Мои вопросы 7', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Новый \d+$/ }).click();
  await expect(page.getByRole('heading', { name: 'Согласование новой метрики' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Мои вопросы 6', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Согласование новой метрики' })).toHaveCount(0);
});

test('opens the file picker and shows, validates and removes optional attachments', async ({ page }, testInfo) => {
  await page.goto(mineEntry);
  const trigger = page.getByRole('button', { name: 'Задать вопрос', exact: true });
  await trigger.click();
  const modal = page.getByRole('dialog', { name: 'Задать вопрос' });
  const attach = modal.getByRole('button', { name: 'Прикрепить файл', exact: true });
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), attach.click()]);
  expect(chooser.isMultiple()).toBe(true);
  const input = modal.locator('input[type="file"]');
  const file = (name: string, mimeType: string) => ({ name, mimeType, buffer: Buffer.from('test') });
  await chooser.setFiles([
    file('Скриншот ошибки.PNG', 'image/png'),
    file('Диагностика.pdf', 'application/pdf'),
    file('script.exe', 'application/octet-stream'),
  ]);
  const list = modal.getByRole('list', { name: 'Прикреплённые файлы' });
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await expect(list.getByText('Скриншот ошибки.PNG', { exact: true })).toBeVisible();
  await expect(list.getByText('Диагностика.pdf', { exact: true })).toBeVisible();
  await expect(modal.getByRole('alert')).toHaveText('Файлы неподдерживаемого формата пропущены.');
  await list.getByRole('button', { name: 'Удалить файл Диагностика.pdf', exact: true }).click();
  await expect(attach).toBeFocused();
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await input.setInputFiles(file('Диагностика.pdf', 'application/pdf'));
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await expect(modal.getByRole('alert')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('ask-attachments.png') });
  await page.setViewportSize({ width: 400, height: 400 });
  const panel = modal.locator('[data-question-surface]');
  const box = (await panel.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(16);
  expect(box.y + box.height).toBeLessThanOrEqual(384);
  expect(await panel.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  await modal.getByRole('textbox', { name: 'Тема', exact: true }).fill('Вопрос с вложениями');
  await modal.getByRole('textbox', { name: 'Ваш вопрос', exact: true }).fill('Два файла с деталями.');
  await modal.getByRole('button', { name: 'Отправить вопрос' }).click();
  await expect(trigger).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Вопрос с вложениями', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await trigger.click();
  await expect(list).toHaveCount(0);
  await expect(modal.getByRole('alert')).toHaveCount(0);
});

test('morphs in both directions and uses the latest panel size on exit', async ({ page }) => {
  await page.addInitScript(() => {
    const reverse = Animation.prototype.reverse;
    Animation.prototype.reverse = function () {
      reverse.call(this);
      if ((this.effect as KeyframeEffect).target?.hasAttribute('data-question-morph')) {
        void this.ready.then(() => this.pause());
      }
    };
  });
  await page.goto(faqEntry);
  const trigger = page.getByRole('button', { name: 'Задать вопрос', exact: true });
  const opener = (await trigger.boundingBox())!;
  const viewport = page.viewportSize()!;
  await trigger.press('Enter');
  const surface = page.locator('[data-question-morph]');
  const panel = page.locator('[data-question-surface]');
  const readMask = () => surface.evaluate(async element => {
    const [animation] = element.getAnimations();
    await animation.ready;
    const effect = animation.effect as KeyframeEffect;
    return {
      frames: effect.getKeyframes().map(frame => frame.clipPath),
      duration: effect.getTiming().duration,
      rate: animation.playbackRate,
    };
  });
  function expectClip(frame: unknown, box: typeof opener, radius: number) {
    const match = typeof frame === 'string' ? frame.match(/^inset\((.*?) round (\d+)px\)$/) : null;
    expect(Number(match?.[2])).toBe(radius);
    const [top, right = top, bottom = top, left = right] = match![1].split(' ').map(Number.parseFloat);
    expect(top).toBeCloseTo(box.y, 1);
    expect(right).toBeCloseTo(viewport.width - box.x - box.width, 1);
    expect(bottom).toBeCloseTo(viewport.height - box.y - box.height, 1);
    expect(left).toBeCloseTo(box.x, 1);
  }
  const initialPanel = (await panel.boundingBox())!;
  const opening = await readMask();
  expect(opening.duration).toBe(300);
  expect(opening.rate).toBe(1);
  expectClip(opening.frames[0], opener, 20);
  expectClip(opening.frames[1], initialPanel, 16);
  await expect(surface).toHaveCSS('clip-path', 'none');
  await panel.locator('input[type="file"]').setInputFiles({
    name: 'details.txt', mimeType: 'text/plain', buffer: Buffer.from('details'),
  });
  const expandedPanel = (await panel.boundingBox())!;
  expect(expandedPanel.height).toBeGreaterThan(initialPanel.height);
  await page.keyboard.press('Escape');
  await expect(panel).toHaveAttribute('inert', '');
  const closing = await readMask();
  expect(closing.rate).toBe(-1.4);
  expectClip(closing.frames[0], opener, 20);
  expectClip(closing.frames[1], expandedPanel, 16);
  await surface.evaluate(element => element.getAnimations()[0].finish());
  await expect(surface).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

for (const [width, height] of [[1440, 900], [1024, 768]]) {
  test(`modal covers the workspace at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(width === 1440 ? faqEntry : mineEntry);
    if (width === 1440) await page.getByRole('button', { name: 'Как получить доступ к отчёту?', exact: true }).click();
    else await page.getByRole('button', { name: /^В работе \d+$/ }).click();
    await page.getByRole('button', { name: 'Задать вопрос', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Задать вопрос' });
    const subject = modal.getByRole('textbox', { name: 'Тема', exact: true });
    await expect(subject).toBeFocused();
    expect(await modal.evaluate(element => ({
      modal: element.matches(':modal'),
      backdrop: getComputedStyle(element.querySelector('[data-question-backdrop]')!).backgroundColor,
      topLeft: document.elementFromPoint(12, 12) === element.querySelector('[data-question-backdrop]'),
    }))).toEqual({ modal: true, backdrop: 'rgba(16, 29, 59, 0.36)', topLeft: true });
    expect(await modal.locator('[data-question-morph]').evaluate(element => element.getAnimations().length)).toBe(0);
    const box = (await modal.locator('[data-question-surface]').boundingBox())!;
    expect(box.width).toBe(560);
    expect(box.x + box.width / 2).toBeCloseTo(width / 2, 0);
    expect(box.y + box.height / 2).toBeCloseTo(height / 2, 0);
    await page.evaluate(() => document.fonts.ready);
    await subject.fill('Доступ к отчёту «План-Факт продажи»');
    await modal.getByRole('textbox', { name: 'Ваш вопрос', exact: true }).fill(
      'Карточка отчёта открывается, но при запуске вижу сообщение «Доступ запрещён». Подскажите, куда обратиться за доступом?',
    );
    await page.mouse.click(12, 12);
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Отправить вопрос' })).toBeEnabled();
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`ask-filled-${width}.png`) });
  });
}
