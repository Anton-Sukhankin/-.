import { expect, test } from '@playwright/test';
import { demoReportsGateway } from '../src/demo/reports';
const entry = '/preview/navigation?section=reports&report=demo-report-summary';

test('the technical reference passport shows sourced rows and independent related counts', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/preview/navigation?section=reports&report=demo-report-canopy&reportTab=technical');

  const report = page.locator('article[data-report-id="demo-report-canopy"]');
  await expect(report.getByRole('heading', { level: 1 })).toHaveText('Навес свод и детализация');
  const tabs = report.getByRole('tablist');
  const technicalTab = tabs.getByRole('tab', { name: 'Техническая информация', exact: true });
  await expect(technicalTab).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.getByRole('tab', { name: 'Слайды 5', exact: true })).toHaveCount(1);
  await expect(tabs.getByRole('tab', { name: 'Метрики и показатели 23', exact: true })).toHaveCount(1);
  const sourcesTab = tabs.getByRole('tab', { name: 'Источники данных 7', exact: true });
  const panel = report.getByRole('tabpanel');
  const groups = panel.locator('[data-report-technical]');
  await expect(groups.getByRole('button').locator('strong')).toHaveText([
    'Карточка каталога', 'Дашборд Visiology', 'Рабочая область', 'Датасеты и источники',
  ]);
  await expect(groups.getByRole('button', { expanded: true })).toHaveCount(4);
  const [catalog, dashboard, workspace, datasets] = await groups.locator(':scope > section').all();
  await expect(catalog.locator('dd')).toHaveText([
    '07.09.2026, 11:37:29', '09.11.2026, 12:01:24', '09.11.2026, 12:01:24',
    'Проверена', 'Автоматически создано из Visiology', '44', 'Автоматически из Visiology', 'Да', 'visiology',
  ]);

  const dashboardToggle = groups.getByRole('button', { name: /^Дашборд Visiology/ });
  await expect(dashboard.locator('dt')).toHaveText([
    'GUID дашборда', 'Название дашборда в Visiology', 'Последний редактор дашборда',
    'Дата создания отчёта', 'Дата изменения дашборда', 'Портальный дашборд', 'Дашборд с публичной ссылкой',
  ]);
  await expect(dashboard.locator('dd')).toHaveText([
    '9609591d4baf423a8f048655b3744d83', 'Навес свод и детализация', 'admin',
    '—', '30.10.2026, 16:54:29', 'Да', 'Нет',
  ]);
  await expect(workspace.locator('dd')).toHaveText(['2716a879-958a-4552-8742-b1f8a5222852', 'Строительство']);
  await expect(datasets.locator('dd:not(:has(ul))')).toHaveText([
    '062e9c29-b0dc-4d7f-9345-58910bc8e552', '—', '64a17810-33b0-4800-a437-6d3fd7103d72', 'db',
  ]);
  expect(await groups.locator('dt').evaluateAll(elements => [...new Set(elements.map(el => getComputedStyle(el).fontSize))])).toEqual(['12px']);
  expect(await groups.locator('dd, dd span, dd li').evaluateAll(elements => [...new Set(elements.map(el => getComputedStyle(el).fontSize))])).toEqual(['16px']);
  const emptyValues = groups.locator('dd > span');
  await expect(emptyValues).toHaveText(['—', '—']);
  for (const value of await emptyValues.all()) await expect(value).toHaveCSS('color', 'rgb(82, 98, 124)');
  const information = panel.getByRole('complementary', { name: 'Сведения об отчёте' });
  await expect(information.locator('dt').first()).toHaveCSS('font-size', '12px');
  await expect(information.locator('dd').first()).toHaveCSS('font-size', '16px');
  await expect(information.locator('dd')).toHaveText(['—', 'Visiology', '—', '7']);

  await dashboardToggle.focus();
  await dashboardToggle.press('Enter');
  await expect(dashboardToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(dashboard.getByText('admin', { exact: true })).toBeHidden();
  await dashboardToggle.press('Space');
  await expect(dashboardToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(dashboard.getByText('admin', { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 768 });
  const tables = groups.getByRole('listitem');
  await expect(tables).toHaveText([
    'cdm_live_house_accepted_status', 'cdm_ovp_app_daily_statistics', 'cdm_placement_agg_current',
    'cdm_section_overhang_daily', 'cdm_weekly_plan_ovp_appointments_by_section', 'reports_canopy_plan', 'zrds_dz',
  ]);
  await tables.last().scrollIntoViewIfNeeded();
  await expect(tables.last()).toBeInViewport();
  expect(await groups.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(await groups.evaluate((element) => element.clientWidth));

  await sourcesTab.click();
  await expect(panel.getByText('Сведения об источниках недоступны', { exact: true })).toBeVisible();
  await technicalTab.click();
  await expect(groups.getByRole('button', { expanded: true })).toHaveCount(4);
});

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

test('all report tabs share the pinned information panel', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/preview/navigation?section=reports');
  await page.getByRole('button', { name: 'Открыть отчёт «Сводный отчёт Гостеприимства»', exact: true }).click();
  const report = page.locator('article[data-report-id]');
  const tabs = report.getByRole('tablist', { name: 'Вкладки паспорта отчёта', exact: true });
  const content = report.locator('[data-detail-tab-content]');
  const information = report.getByRole('complementary', { name: 'Сведения об отчёте' });
  await expect(information).toHaveCount(1);
  const initialPanel = await information.elementHandle();
  const initialText = await information.innerText();
  for (const tab of await tabs.getByRole('tab').all()) {
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(information).toHaveCount(1);
    await expect(information).toHaveText(initialText, { useInnerText: true });
    await expect(information).toHaveCSS('position', 'sticky');
    expect(await initialPanel!.evaluate(panel => panel.isConnected)).toBe(true);
    const main = (await content.boundingBox())!;
    const side = (await information.boundingBox())!;
    expect(side.x - main.x - main.width).toBeCloseTo(8, 0);
    expect(side.width).toBe(380);
  }
  const technical = content.locator('[data-report-technical]');
  await expect(technical.getByRole('button', { expanded: true }).locator('strong')).toHaveText([
    'Карточка каталога', 'Дашборд Visiology', 'Рабочая область', 'Датасеты и источники',
  ]);
  const guid = technical.getByText('GUID дашборда', { exact: true }).locator('..').locator('dd');
  await expect(guid).toHaveText('—');
  await expect(guid).toHaveCSS('font-size', '16px');
  await expect(technical.getByText('Таблицы', { exact: true }).locator('..').locator('dd')).toHaveText('—');
  await expect(technical.getByText('Название отчёта', { exact: true }).locator('..').locator('dd')).toHaveText('Сводный отчёт Гостеприимства');

  await page.setViewportSize({ width: 1024, height: 768 });
  await tabs.getByRole('tab', { name: /^Метрики и показатели/ }).click();
  await expect(information).toHaveCSS('position', 'static');
  await information.scrollIntoViewIfNeeded();
  await expect(information.getByRole('heading', { name: /^Сведения/ })).toBeInViewport();
  await expect.poll(async () => {
    const [main, side] = await Promise.all([content.boundingBox(), information.boundingBox()]);
    return [Math.round(side!.x - main!.x), Math.round(side!.y - main!.y - main!.height)];
  }).toEqual([0, 8]);
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

test('mailing modes stay below the tabs and gain a shadow only after vertical scrolling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(entry + '&reportTab=mailings');
  const scroll = page.getByRole('tabpanel');
  const tabs = page.getByRole('tablist', { name: 'Вкладки паспорта отчёта' });
  const segment = page.getByRole('group', { name: 'Раздел рассылок' }).locator('..');
  const information = page.getByRole('complementary', { name: 'Сведения об отчёте' });
  const create = page.getByRole('button', { name: 'Создать рассылку', exact: true });
  const available = page.getByRole('button', { name: 'Доступные рассылки', exact: true });
  const manual = page.getByRole('button', { name: 'Ручная отправка', exact: true });
  const shadowOpacity = () => segment.evaluate(element => getComputedStyle(element, '::after').opacity);
  const topGap = async () => {
    const [segmentBox, tabsBox] = await Promise.all([segment.boundingBox(), tabs.boundingBox()]);
    return Math.round(segmentBox!.y - tabsBox!.y - tabsBox!.height);
  };
  const scrollToEnd = () => scroll.evaluate(element => { element.scrollTop = element.scrollHeight; });
  const scrollRange = () => scroll.evaluate(element => element.scrollHeight - element.clientHeight);

  await expect.poll(scrollRange).toBe(0);
  await expect.poll(shadowOpacity).toBe('0');
  await expect(segment).toHaveCSS('padding', '16px');
  await create.click();
  await expect(segment).toHaveCSS('padding', '16px');
  await expect.poll(topGap).toBe(16);
  await expect.poll(shadowOpacity).toBe('0');

  await scrollToEnd();
  await expect.poll(shadowOpacity).toBe('1');
  await expect.poll(topGap).toBe(16);
  const [wideSegment, wideInformation] = await Promise.all([segment.boundingBox(), information.boundingBox()]);
  expect(wideSegment!.y).toBeCloseTo(wideInformation!.y, 0);

  await available.click();
  await expect.poll(scrollRange).toBe(0);
  await expect.poll(shadowOpacity).toBe('0');

  await page.setViewportSize({ width: 1024, height: 620 });
  await create.click();
  const profile = page.getByRole('region', { name: 'Профиль РГП' });
  const [narrowSegment, narrowInformation, narrowProfile] = await Promise.all([
    segment.boundingBox(), information.boundingBox(), profile.boundingBox(),
  ]);
  expect(narrowSegment!.x).toBeCloseTo(narrowInformation!.x, 0);
  expect(narrowInformation!.y - narrowProfile!.y - narrowProfile!.height).toBeCloseTo(8, 0);
  await scrollToEnd();
  await expect.poll(topGap).toBe(16);
  await expect.poll(shadowOpacity).toBe('1');
  await scroll.evaluate(element => { element.scrollTop = 0; });
  await expect.poll(shadowOpacity).toBe('0');
  await manual.click();
  await expect(segment).toHaveCSS('padding', '16px');
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
      const technical = panel.locator('[data-report-technical]');
      await expect(technical.getByRole('button', { expanded: true })).toHaveCount(4);
      await expect(technical.getByText('Домен', { exact: true }).locator('..').locator('dd')).toHaveText(report.domainGroup ?? report.domain);
      await expect(technical.getByText('Название отчёта', { exact: true }).locator('..').locator('dd')).toHaveText(report.title);
      await expect(card).toHaveAttribute('data-report-id', report.id);
    });
  }
});
