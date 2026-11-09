import { expect, test } from '@playwright/test';
import { demoReportsGateway } from '../src/demo/reports';
const entry = '/preview/navigation?section=reports&report=demo-report-summary';

test('opening a report starts on Overview even when the list URL retains another report tab', async ({ page }) => {
  await page.goto('/preview/navigation?section=reports&reportTab=slides');
  await page.getByRole('combobox', { name: 'Поиск по каталогу' }).fill('Сводный');
  await page.getByRole('button', { name: 'Открыть паспорт «Сводный отчёт Гостеприимства»', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Обзор', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/reportTab=overview/);
  await page.getByRole('tab', { name: 'Слайды 4', exact: true }).click();
  await expect(page).toHaveURL(/reportTab=slides/);
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Слайды 4', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('navigation',{name:'Хлебные крошки',exact:true}).getByRole('button',{name:'Отчёты',exact:true}).click();
  await expect(page).toHaveURL(/section=reports&reportTab=slides$/);
});

test('report tabs keep the selected object, keyboard selection and return to the originating list', async ({ page }) => {
  await page.goto('/preview/navigation?section=reports');
  const search = page.getByRole('combobox', { name:'Поиск по каталогу' });
  await search.fill('Сводный');
  await page.getByRole('button', { name: 'Открыть паспорт «Сводный отчёт Гостеприимства»', exact: true }).click();
  const card = page.locator('article[data-report-id]');
  await expect(card).toHaveAttribute('data-report-id','demo-report-summary');
  await page.getByRole('tab', { name:'Слайды 4', exact:true }).click();
  await page.getByRole('tab', { name:'Слайды 4', exact:true }).press('ArrowRight');
  await expect(page.getByRole('tab', { name:'Метрики и показатели 10', exact:true })).toBeFocused();
  await page.reload();
  await expect(page.getByRole('tab', { name:'Метрики и показатели 10', exact:true })).toHaveAttribute('aria-selected','true');
  await page.getByRole('navigation',{name:'Хлебные крошки',exact:true}).getByRole('button',{name:'Отчёты',exact:true}).click();
  await expect(card).toHaveCount(0);
  await expect(page).toHaveURL(/section=reports$/);
});

test('overview accordions, question form and responsive content work without server claims', async ({ page }) => {
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({ width:1440,height:900 }); await page.goto(entry);
  const accordion=page.getByRole('button',{name:/Об отчёте Назначение/});
  const initial=await accordion.boundingBox();
  await accordion.click(); await expect(accordion).toHaveAttribute('aria-expanded','false');
  await accordion.press('Space'); await expect(accordion).toHaveAttribute('aria-expanded','true');
  await page.setViewportSize({width:1920,height:1080});
  expect((await accordion.boundingBox())!.width-initial!.width).toBe(480);
  const ask = page.getByRole('button',{name:'Задать вопрос',exact:true});
  await expect(ask.locator('img')).toHaveAttribute('src', '/icons/sidebar/questions.svg');
  await ask.click();
  const dialog=page.getByRole('dialog',{name:'Задать вопрос'});
  await expect(dialog).toBeVisible();
  const subject = dialog.getByRole('textbox', { name: 'Тема', exact: true });
  await expect(subject).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(ask).toBeFocused();
  await ask.click();
  const submit = dialog.getByRole('button',{name:'Отправить вопрос',exact:true});
  await expect(submit).toBeEnabled();
  await dialog.getByRole('textbox',{name:'Ваш вопрос'}).fill('Как рассчитывается показатель?');
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  await submit.click();
  await expect(subject).toBeFocused();
  await expect(dialog.getByRole('alert')).toHaveText('Поле «Тема» обязательно для заполнения.');
  await subject.fill('Расчёт показателя');
  await submit.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Серверная доставка не подключена');
  const myQuestions = page.getByRole('tab', { name: 'Мои вопросы 0', exact: true });
  const count = myQuestions.locator('span');
  await expect(count).toHaveText('0');
  await expect(count).toHaveCSS('background-color', 'rgb(226, 228, 234)');
  await myQuestions.click();
  await expect(myQuestions).toHaveAttribute('aria-selected', 'true');
  await expect(count).toHaveCSS('background-color', 'rgb(0, 123, 252)');
  await expect(page.getByText('Вопросов пока нет', { exact: true })).toBeVisible();
  await page.setViewportSize({width:1024,height:768});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Свернуть панель',exact:true}).click();
  await expect(page.locator('article[data-report-id]')).toHaveAttribute('data-report-id','demo-report-summary');
  expect(errors).toEqual([]);
});

test('metrics filter and presentation, source list and mailings form have visible results', async ({ page }) => {
  await page.goto(entry+'&reportTab=metrics');
  const input=page.getByRole('textbox',{name:'Поиск метрик по названию, домену или формуле'});
  await input.fill('без сертификатов'); await expect(page.locator('[data-metric-id]')).toHaveCount(1);
  await page.getByRole('button',{name:'Табличный вид',exact:true}).click();
  await expect(page.getByRole('table',{name:'Связанные показатели'})).toBeVisible();
  await page.getByRole('tab',{name:'Источники данных 5',exact:true}).click();
  const headingCount = page.getByRole('heading',{name:'Источники отчёта 5',exact:true}).locator('span');
  const inactiveCount = page.getByRole('tab',{name:'Слайды 4',exact:true}).locator('span');
  for (const property of ['background-color','color','height','min-width','padding','border-radius','font-size','font-weight','line-height','letter-spacing']) {
    const reference = await inactiveCount.evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);
    await expect(headingCount).toHaveCSS(property, reference);
  }
  const first=page.getByRole('button',{name:/^demo.requests/});
  const sourceCards=page.locator('[data-report-sources] > section');
  const a=await sourceCards.nth(0).boundingBox(); const b=await sourceCards.nth(1).boundingBox();
  expect(b!.y).toBeGreaterThan(a!.y+a!.height); expect(a!.width).toBe(b!.width);
  await expect(first).toHaveAttribute('aria-expanded','true');
  await first.click(); await expect(first).toHaveAttribute('aria-expanded','false');
  await page.getByRole('tab',{name:'Рассылки',exact:true}).click();
  await page.getByRole('button',{name:'Отписаться: Мои продажи сегодня',exact:true}).click();
  await expect(page.getByRole('button',{name:'Подписаться: Мои продажи сегодня',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Создать рассылку',exact:true}).click();
  await page.getByLabel('Время отправки · МСК',{exact:true}).fill('14:30');
  await page.setViewportSize({width:1024,height:768});
  await expect(page.getByLabel('Время отправки · МСК',{exact:true})).toHaveValue('14:30');
  await page.getByRole('button',{name:'Отправить заявку в SD',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Заявка не отправлена');
});

test('every demo report has content in all seven passport tabs', async ({ page }) => {
  test.setTimeout(75_000);
  const reports = await demoReportsGateway.list();
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const report of reports) {
    await test.step(report.title, async () => {
      await page.goto(`/preview/navigation?section=reports&report=${report.id}`);
      const card = page.locator('article[data-report-id]');
      const tabs = card.getByRole('tablist', { name: 'Вкладки паспорта отчёта' });
      const panel = card.getByRole('tabpanel');
      await expect(card.getByRole('heading', { level: 1, name: report.title, exact: true })).toBeVisible();
      await expect(panel.getByText('Описание', { exact: true })).toBeVisible();
      if (report.id !== 'demo-report-summary') {
        await expect(card.getByText('Демонстрационные данные', { exact: true })).toBeVisible();
        await expect(card.getByText('ID 562', { exact: true })).toHaveCount(0);
      }

      await tabs.getByRole('tab', { name: /^Слайды \d+$/ }).click();
      if (report.id === 'demo-report-summary') await panel.getByRole('button').first().click();
      await expect(panel.getByLabel('Демонстрационные значения слайда').filter({ visible: true }).locator('dd')).toHaveCount(2);
      if (report.id === 'demo-report-debt') {
        const secondSlide = panel.getByRole('button', { name: /^Сроки погашения/ });
        await expect(secondSlide).toHaveAttribute('aria-expanded', 'false');
        await secondSlide.press('Enter');
        await expect(panel.getByText('260 тыс. ₽', { exact: true })).toBeVisible();
        await expect(panel.getByText('2,4 млн ₽', { exact: true })).toBeVisible();
      }

      await tabs.getByRole('tab', { name: /^Метрики и показатели \d+$/ }).click();
      await expect(panel.locator('[data-metric-id]').first()).toBeVisible();

      await tabs.getByRole('tab', { name: /^Источники данных \d+$/ }).click();
      await expect(panel.locator('[data-lineage]')).toBeVisible();
      const sourceCards = panel.locator('[data-report-sources] > section');
      const sourceCount = report.id === 'demo-report-summary' ? 5 : 2;
      await expect(sourceCards).toHaveCount(sourceCount);
      const urns = new Set<string>();
      for (const sourceCard of await sourceCards.all()) {
        const toggle = sourceCard.getByRole('button', { expanded: false });
        if (await toggle.count()) await toggle.click();
        const values = sourceCard.locator('dd');
        await expect(values).toHaveCount(7);
        await expect(values.last()).toBeVisible();
        for (const value of await values.allTextContents()) expect(value.trim()).toMatch(/^(?!—$).+/);
        urns.add(await values.last().innerText());
      }
      expect(urns.size).toBe(sourceCount);

      await tabs.getByRole('tab', { name: 'Использование', exact: true }).click();
      await expect(panel.getByRole('img', { name: /^MAU:/ })).toBeVisible();

      await tabs.getByRole('tab', { name: 'Рассылки', exact: true }).click();
      await expect(panel.locator('[data-mailing-id]')).toHaveCount(2);
      if (report.id === 'demo-report-debt') {
        await expect(panel.getByRole('heading', { name: 'Дебиторская задолженность за неделю', exact: true })).toBeVisible();
        await expect(panel.getByText('Мои продажи сегодня', { exact: true })).toHaveCount(0);
        await panel.getByRole('button', { name: 'Отписаться: Дебиторская задолженность за неделю', exact: true }).click();
        await expect(panel.getByRole('button', { name: 'Подписаться: Дебиторская задолженность за неделю', exact: true })).toBeVisible();
        await expect(panel.getByRole('button', { name: 'Подписаться: Просрочка и предстоящие платежи', exact: true })).toBeVisible();
        await expect(panel.getByRole('status')).toContainText('только в демонстрации');
      }

      await tabs.getByRole('tab', { name: 'Техническая информация', exact: true }).click();
      await expect(panel.getByRole('region', { name: 'Карточка каталога', exact: true })).toContainText(report.domainGroup ?? report.domain);
      await expect(panel.getByRole('region', { name: 'Дашборд', exact: true })).toContainText(report.title);
      await expect(card).toHaveAttribute('data-report-id', report.id);
    });
  }
});
