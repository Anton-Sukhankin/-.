import {test,expect} from '@playwright/test';
const id='source-demo-rewedo-versions';
const name='rewedo_crm_production.public.versions';
const entry='/preview/navigation?section=sources';
const detail=entry+'&source='+id;
const reportCrmDate = entry + '&source=source-reportcrm-date&sourceTab=fields';

test('sidebar opens the source catalog instead of reopening the last source', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'Разделы каталога' });
  const sourceSection = nav.getByRole('button', { name: 'Источники', exact: true });
  const card = page.locator('[data-source-detail-id]');
  for (const view of ['default', 'cards']) {
    await page.goto(view === 'cards' ? entry + '&sourceView=cards' : entry);
    await page.locator('[data-source-id]').getByRole('button', { name, exact: true }).click();
    await expect(card).toHaveAttribute('data-source-detail-id', id);
    await nav.getByRole('button', { name: 'Главная', exact: true }).click();
    await expect(page).toHaveURL(/[?&]section=home/);
    await expect(page).not.toHaveURL(/[?&]source(?:Tab|Report)?=/);
    await sourceSection.click();
    await expect(page).toHaveURL(new URL(entry, page.url()).toString());
    await expect(card).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Табличный вид', exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
});

test('both source catalog views open the matching detail and retain conditions through history and return',async({page})=>{
  for(const view of ['list','cards']) {
    await page.goto(entry+'&sourceView='+view+'&source.platform=PostgreSQL&sourcePage=0');
    const origin=page.url();
    await expect(page.locator('[data-source-id]')).toHaveCount(1);
    await page.locator('[data-source-id]').getByRole('button',{name,exact:true}).click();
    await expect(page.locator('[data-source-detail-id]')).toHaveAttribute('data-source-detail-id',id);
    await expect(page.getByRole('heading',{level:1,name,exact:true})).toBeVisible();
    await page.getByRole('tab',{name:'Связанные отчёты 0',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Связанные отчёты не найдены',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:/^Об источнике/})).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('tab',{name:'Связанные отчёты 0',exact:true})).toHaveAttribute('aria-selected','true');
    await page.goBack();
    await expect(page).toHaveURL(origin);
    await page.goForward();
    await expect(page.locator('[data-source-detail-id]')).toHaveAttribute('data-source-detail-id',id);
    await page.locator('[data-source-detail-id] nav').getByRole('button',{name:'Источники',exact:true}).click();
    await expect(page).toHaveURL(origin);
    await expect(page.getByRole('button',{name:view==='cards'?'Карточный вид':'Табличный вид',exact:true})).toHaveAttribute('aria-pressed','true');
  }
});

test('source fields preserve known metadata in a complete schema, unknown counts and independent disclosure',async({page})=>{
  await page.goto(detail);
  const root=page.locator('[data-source-detail-id]');
  const fields=page.getByRole('region',{name:'Описание полей источника',exact:true});
  await expect(fields.locator('section')).toHaveCount(8);
  await expect(page.getByRole('tab',{name:'Описание полей 8',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(fields.getByRole('heading', { name: /^Описание полей/ })).toHaveCount(0);
  const first=fields.locator('section').nth(0),second=fields.locator('section').nth(1),unknown=fields.locator('section').nth(3);
  await expect(first.getByRole('button')).toHaveAttribute('aria-expanded','false');
  await first.getByRole('button').press('Enter');
  await expect(first.getByText('Связанные метрики не найдены', {exact:true})).toBeVisible();
  await second.getByRole('button').press('Space');
  await expect(first.getByRole('button')).toHaveAttribute('aria-expanded','true');
  await expect(second.getByRole('button')).toHaveAttribute('aria-expanded','true');
  await unknown.getByRole('button').click();
  await expect(unknown.getByText('Сведения о связанных метриках не предоставлены',{exact:true})).toBeVisible();
  await expect(unknown.getByText('Метрики', {exact:true})).toHaveCount(0);
  await expect(first.getByText('Метрики', {exact:true})).toHaveCount(0);
  await expect(root.locator('[data-tone=red]').first()).toHaveCSS('background-color','rgb(255, 234, 231)');
  await expect(root.locator('[data-tone=purple]').first()).toHaveCSS('color','rgb(89, 50, 169)');
  await expect(root.locator('[data-tone=yellow]').first()).toHaveCSS('background-color','rgb(255, 249, 229)');
  await expect(root.getByRole('button',{name:/^Об источнике/})).toHaveAttribute('aria-expanded','true');
  await page.emulateMedia({reducedMotion:'reduce'});
  await first.getByRole('button').click();
  await expect(first.getByRole('button')).toHaveAttribute('aria-expanded','false');
});

test('source field tags follow each field name by eight pixels', async ({ page }) => {
  await page.goto(reportCrmDate);
  const rows = page.getByRole('region', { name: 'Описание полей источника' }).locator('section');
  await expect(rows).toHaveCount(34);
  await page.evaluate(() => document.fonts.ready);

  for (const width of [1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await rows.evaluateAll(sections => sections.map(section => {
      const [name, firstTag] = section.querySelectorAll<HTMLElement>('button [data-overflow-text]');
      const text = document.createRange();
      text.selectNodeContents(name);
      return {
        gap: firstTag.getBoundingClientRect().left - name.getBoundingClientRect().right,
        nameWidth: name.clientWidth,
        extraSpace: name.getBoundingClientRect().right - text.getBoundingClientRect().right,
      };
    }));
    for (const row of geometry) {
      expect(row.gap).toBeCloseTo(8);
      expect(row.nameWidth).toBeGreaterThan(0);
      expect(row.extraSpace).toBeLessThan(1);
    }
  }
});

test('source about tags and heading follow the approved order and spacing below the tabs', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(reportCrmDate);
  const card = page.locator('[data-source-detail-id]');
  const aboutButton = card.getByRole('button', { name: /^Об источнике/ });
  const about = card.locator('section[data-collapsible]').filter({ has: page.getByRole('button', { name: /^Об источнике/ }) });
  const aboutBody = about.locator('[data-accordion-body]');
  const tags = aboutBody.locator('[data-tone]');
  const fields = card.getByRole('region', { name: 'Описание полей источника' });
  const heading = fields.getByRole('heading', { name: 'Поля источника', exact: true });
  const firstField = fields.locator('section').first();
  await expect(tags).toHaveText(['Table', 'Active', '34 колонки', 'Используется в аналитике', '10 похожих источников']);
  await expect(card.getByRole('tab', { name: 'Похожие источники 10', exact: true })).toBeVisible();
  await expect(card.locator('header [data-tone]')).toHaveCount(0);
  await expect(heading).toHaveCSS('font-size', '14px');
  await expect(heading).toHaveCSS('line-height', '20px');
  await expect(heading).toHaveCSS('color', 'rgb(82, 105, 140)');

  for (const width of [1440, 900]) {
    await page.setViewportSize({ width, height: 900 });
    const [cardBox, bodyBox, lastTag, firstTag, description, title, first] = await Promise.all([
      about.boundingBox(), aboutBody.boundingBox(), tags.last().boundingBox(), tags.first().boundingBox(),
      aboutBody.locator('p').boundingBox(), heading.boundingBox(), firstField.boundingBox(),
    ]);
    expect(firstTag!.y - bodyBox!.y).toBeCloseTo(17);
    expect(description!.y - lastTag!.y - lastTag!.height).toBeCloseTo(16);
    expect(title!.y - cardBox!.y - cardBox!.height).toBeCloseTo(16);
    expect(first!.y - title!.y - title!.height).toBeCloseTo(8);
    expect(await aboutBody.evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(await aboutBody.evaluate(element => element.clientWidth));
  }

  await aboutButton.click();
  await expect(tags.first()).toBeHidden();
  await expect(heading).toBeVisible();
  await page.goto(detail);
  await expect(tags).toHaveText(['Table', 'Active', '8 колонок']);
});

test('similar sources show the observed rows, label business metric counts and distinguish empty from unknown', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(reportCrmDate);
  const tab = page.getByRole('tab', { name: 'Похожие источники 10', exact: true });
  const chevron = page.getByRole('button', { name: /^Об источнике/ }).locator('[aria-hidden=true]').first();
  const referenceIconSize = await chevron.evaluate(element => getComputedStyle(element).width);
  await tab.click();
  await expect(page).toHaveURL(/sourceTab=similar$/);
  await expect(tab).toHaveAttribute('aria-selected', 'true');

  const list = page.getByRole('list', { name: 'Похожие источники', exact: true });
  const rows = list.getByRole('listitem');
  await expect(rows.locator('strong')).toHaveText([
    'dwh2crm.material.visiology_инструменты_оценщика_показатели',
    'dwh2crm.visiology.онлайн_продажи',
    'dwh2crm.dbo.отчет_планфакт_долякорпусов_vi_до_этапа',
    'dwh2crm.tableau.договор',
    'reportcrm20.model.продажи',
    'dwh2crm.tableau.v_task',
    'dwh2crm.tableau.объект недвижимости',
    'reportcrm20.calculate.deadlines_rpt',
  ]);
  await expect(rows.getByText('Бизнес-метрики', { exact: true })).toHaveCount(8);
  await expect(rows.getByText(/^\d$/)).toHaveText(['5', '4', '2', '2', '2', '1', '1', '1']);
  await expect(list.getByRole('link')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Сведения', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Похожие источники', exact: true })).toHaveCount(0);

  const first = rows.first();
  const icon = first.locator('[data-catalog-entity-icon=source]');
  const name = first.locator('strong');
  const metricLabel = first.getByText('Бизнес-метрики', { exact: true });
  const count = first.getByText('5', { exact: true });
  await expect(icon).toHaveCSS('width', referenceIconSize);
  await expect(icon).toHaveCSS('height', referenceIconSize);
  expect(await icon.evaluate(element => getComputedStyle(element, '::before').width)).toBe('16px');
  await expect(first).toHaveCSS('border-color', 'rgb(214, 230, 251)');
  await first.hover();
  await expect(first).toHaveCSS('border-color', 'rgb(64, 143, 231)');
  await expect(name).toHaveCSS('color', 'rgb(0, 103, 220)');
  await expect(icon).toHaveCSS('color', 'rgb(0, 123, 252)');
  await expect(icon).toHaveCSS('background-color', 'rgb(231, 242, 255)');
  await expect(count).toHaveCSS('background-color', 'rgb(226, 228, 234)');
  await expect(count).toHaveCSS('height', '16px');
  for (const width of [1440, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    const [labelBox, countBox, rowBox] = await Promise.all([metricLabel.boundingBox(), count.boundingBox(), first.boundingBox()]);
    expect(countBox!.x - labelBox!.x - labelBox!.width).toBeCloseTo(4);
    expect(countBox!.x + countBox!.width).toBeLessThan(rowBox!.x + rowBox!.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  }

  await page.reload();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(rows).toHaveCount(8);
  await page.getByRole('tab', { name: /^Описание полей/ }).click();
  await expect(page.getByRole('heading', { name: 'Поля источника', exact: true })).toBeVisible();

  await page.goto(detail + '&sourceTab=similar');
  await expect(page.getByRole('tab', { name: 'Похожие источники 0', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Похожие источники не найдены', exact: true })).toBeVisible();
  await page.goto(entry + '&source=source-dwh-date&sourceTab=similar');
  await expect(page.getByRole('tab', { name: 'Похожие источники', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Список похожих источников недоступен', exact: true })).toBeVisible();
});

test('source title keeps its own view count and a local follow toggle beside the existing actions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(reportCrmDate);
  const card = page.locator('[data-source-detail-id]');
  const title = card.getByRole('heading', { level: 1 });
  const views = card.getByRole('group', { name: 'Просмотры источника' });
  const help = card.getByRole('button', { name: 'Что означает счётчик просмотров' });
  const follow = card.getByRole('button', { name: 'Следить за источником' });
  await expect(views).toHaveText('22');
  await expect(views.locator('img')).toHaveCSS('width', '16px');
  await expect(help.locator('svg')).toHaveCSS('width', '16px');
  await expect(help.locator('svg')).toHaveCSS('color', 'rgb(0, 107, 219)');
  await expect(follow).toHaveCSS('height', '32px');
  await expect(follow.locator('svg')).toHaveCSS('width', '16px');
  const [titleBox, viewBox, helpBox, bookmarkBox, followBox, downloadBox] = await Promise.all([
    title.boundingBox(), views.boundingBox(), help.boundingBox(),
    card.getByRole('button', { name: 'Закладка источника' }).boundingBox(),
    follow.boundingBox(), card.getByRole('button', { name: 'Скачать метаданные' }).boundingBox(),
  ]);
  expect(helpBox!.x - titleBox!.x - titleBox!.width).toBeCloseTo(8);
  expect(viewBox!.x - helpBox!.x - helpBox!.width).toBeCloseTo(8);
  expect(bookmarkBox!.x).toBeLessThan(followBox!.x);
  expect(followBox!.x).toBeLessThan(downloadBox!.x);
  await help.focus();
  await expect(page.getByRole('tooltip')).toHaveText('Количество просмотров источника');
  await expect(follow).toHaveAttribute('aria-pressed', 'false');
  await follow.click();
  await expect(follow).toHaveAttribute('aria-pressed', 'true');
  await expect(follow).toHaveText('Вы следите');
  await expect(page.getByRole('status')).toContainText('Уведомления не отправляются.');
  await follow.click();
  await expect(follow).toHaveAttribute('aria-pressed', 'false');
  await expect(page).toHaveURL(reportCrmDate);
  await page.setViewportSize({ width: 900, height: 900 });
  const [narrowViews, narrowFollow] = await Promise.all([views.boundingBox(), follow.boundingBox()]);
  expect(narrowFollow!.y).toBeGreaterThanOrEqual(narrowViews!.y + narrowViews!.height);
  await page.goto(detail);
  await expect(views.getByRole('img', { name: 'Нет значения' })).toBeVisible();
  await page.goto(entry + '&source=source-demo-clients');
  await expect(views).toHaveText('0');
});

test('known synchronization appears once under Сведения and follows the information panel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const card = page.locator('[data-source-detail-id]');
  const breadcrumbs = card.getByRole('navigation', { name: 'Хлебные крошки', exact: true });
  const passport = card.getByRole('complementary', { name: 'Сведения об источнике', exact: true });
  const passportDescription = passport.locator('header p');
  const synchronization = card.getByText(/^Синхронизация с DataHub:/);
  for (const [url, label] of [[reportCrmDate, 'вчера, 00:00'], [detail, 'вчера, 23:48']]) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url);
    await expect(passportDescription).toHaveText(`Синхронизация с DataHub: ${label}`);
    await expect(synchronization).toHaveCount(1);
    await expect(passportDescription).toHaveCSS('color', 'rgb(109, 132, 166)');
    await expect(passportDescription).toBeInViewport();
    await card.locator('[data-detail-scroll]').evaluate(element => { element.scrollTop = 200; });
    await expect(card).toHaveAttribute('data-detail-compact', 'true');
    await expect(breadcrumbs).toBeHidden();
    await expect(passportDescription).toBeInViewport();
    await page.setViewportSize({ width: 900, height: 900 });
    await expect(passport).toHaveCSS('position', 'static');
    await passportDescription.scrollIntoViewIfNeeded();
    await expect(passportDescription).toBeInViewport();
  }
  await page.goto(entry + '&source=source-demo-clients');
  await expect(synchronization).toHaveCount(0);
  await expect(passportDescription).toHaveText('Домен, мастер-система и ответственные за источник');
});

test('source actions have honest boundaries and the unselected bookmark is an enabled local toggle',async({page})=>{
  await page.goto(detail);
  const bookmark=page.getByRole('button',{name:'Закладка источника',exact:true});
  await expect(bookmark).toHaveAttribute('aria-pressed','false');
  await expect(bookmark).toBeEnabled();
  await expect(bookmark).toHaveCSS('background-color','rgb(255, 255, 255)');
  await bookmark.click();await expect(bookmark).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Скачать метаданные',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Файл не создан');
  await page.getByRole('button',{name:'Получить доступ',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Заявка не отправлена');
  await page.getByRole('tab',{name:'MCP-инструменты 0',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Содержимое этой вкладки не предоставлено');
  await expect(page.getByRole('tab',{name:'Описание полей 8',exact:true})).toHaveAttribute('aria-selected','true');
  await page.reload();await expect(bookmark).toHaveAttribute('aria-pressed','false');
});

test('source Lineage opens a framed canvas with grid, complete legend and fullscreen controls', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto(reportCrmDate);
  const tab=page.getByRole('tab',{name:'Lineage',exact:true});
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected','true');
  await expect(page).toHaveURL(/sourceTab=lineage$/);

  const panel=page.getByRole('tabpanel',{name:'Lineage'});
  const frame=panel.locator('[data-lineage]');
  const canvas=panel.getByRole('group',{name:'Граф происхождения данных',exact:true});
  const grid=canvas.locator('[data-lineage-grid]');
  const information=panel.getByRole('complementary',{name:'Сведения об источнике'});
  await expect(panel.locator('[data-collapsible]')).toHaveCount(0);
  await expect(information).toContainText('ReportCRM');
  await expect(information).toHaveCSS('position','sticky');
  const wideFrame=(await frame.boundingBox())!;
  const wideInformation=(await information.boundingBox())!;
  expect(wideInformation.x-wideFrame.x-wideFrame.width).toBeCloseTo(8,0);
  expect(wideInformation.y).toBeCloseTo(wideFrame.y,0);
  await expect(canvas.locator('[data-lineage-report]')).toContainText('reportcrm20.dbo.dimdate');
  await expect(canvas.locator('[data-lineage-report]')).toHaveCSS('width','230px');
  await expect(canvas.locator('[data-lineage-report]')).toHaveCSS('height','52px');
  await expect(canvas.locator('[data-lineage-node] strong')).toHaveText([
    'Ипотечные заявки','Итоги месяца','Калькулятор мотивации РИЦ','Ключевые метрики КЦ','Ключевые показатели КЦ',
  ]);
  await expect(canvas.locator('[data-lineage-edge]')).toHaveCount(5);
  expect(await canvas.locator('[data-lineage-node]').evaluateAll(nodes =>
    new Set(nodes.map(node => node.getBoundingClientRect().top)).size
  )).toBe(1);
  await expect(canvas.getByRole('list',{name:'Категории происхождения данных'}).locator('li')).toHaveText([
    'Отчёт','Источник DataHub','Источник (каталог)','Reports','CDM','Clean','BClean',
  ]);
  await expect.poll(()=>frame.evaluate(element=>{
    const outer=element.getBoundingClientRect();
    const inner=element.querySelector('[data-zoom]')!.getBoundingClientRect();
    return {top:inner.top-outer.top-element.clientTop,bottom:outer.bottom-inner.bottom-element.clientTop};
  })).toEqual({top:20,bottom:20});

  await expect(canvas.getByRole('radio',{name:'С сеткой'})).toBeChecked();
  await expect(grid).toHaveCSS('background-image',/linear-gradient.*linear-gradient/);
  const spacing=await grid.evaluate(element=>parseFloat(getComputedStyle(element).backgroundSize));
  await canvas.getByRole('button',{name:'Увеличить граф'}).click();
  expect(await grid.evaluate(element=>parseFloat(getComputedStyle(element).backgroundSize))).toBeGreaterThan(spacing);
  await canvas.getByRole('radio',{name:'Без сетки'}).check();
  await expect(grid).toHaveCount(0);
  await canvas.getByRole('button',{name:'Граф на полный экран'}).click();
  const exit=canvas.getByRole('button',{name:'Выйти из полного экрана'});
  await expect(exit).toBeFocused();
  await expect(panel.getByRole('button',{name:'Свернуть',exact:true})).toHaveCount(0);
  await expect(grid).toHaveCount(0);
  await exit.click();
  await expect(canvas.getByRole('button',{name:'Граф на полный экран'})).toBeFocused();

  await page.reload();
  await expect(tab).toHaveAttribute('aria-selected','true');
  await expect(grid).toBeVisible();
  await page.setViewportSize({width:1024,height:768});
  await expect(information).toHaveCSS('position','static');
  const narrowFrame=(await frame.boundingBox())!;
  const narrowInformation=(await information.boundingBox())!;
  expect(narrowInformation.y-narrowFrame.y-narrowFrame.height).toBeCloseTo(8,0);
  expect(narrowInformation.width).toBeCloseTo(narrowFrame.width,0);
  await page.getByRole('tab',{name:/Описание полей/}).click();
  await expect(page.getByRole('button',{name:/^Об источнике/})).toBeVisible();
  await page.goto(detail+'&sourceTab=lineage');
  await expect(tab).toHaveAttribute('aria-selected','true');
  await expect(page.getByRole('heading',{name:'Граф Lineage недоступен'})).toBeVisible();
  await expect(information).toBeVisible();
});

test('direct, missing and other source IDs never inherit the reference passport',async({page})=>{
  await page.goto(detail+'&sourceTab=reports');
  await page.locator('[data-source-detail-id] nav').getByRole('button',{name:'Источники',exact:true}).click();
  await expect(page.locator('[data-source-id]')).toHaveCount(9);
  await page.goto(entry+'&source=unknown');
  await expect(page.getByRole('heading',{name:'Источник не найден',exact:true})).toBeVisible();
  await page.goto(entry+'&source=source-reportcrm-date');
  await expect(page.getByRole('heading',{level:1,name:'reportcrm20.dbo.dimdate',exact:true})).toBeVisible();
  await expect(page.getByText('Ручнов Константин Михайлович',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('region',{name:'Описание полей источника',exact:true}).locator('section')).toHaveCount(34);
  const rows = page.getByRole('region',{name:'Описание полей источника',exact:true}).locator('section');
  const summaries = await rows.evaluateAll(sections => sections.map(section => {
    const name = section.querySelector('button [data-overflow-text]')?.textContent;
    const badge = section.querySelector('button')?.textContent?.match(/Метрики\s*(\d+)/)?.[1];
    const count = section.querySelectorAll('ul[aria-label="Связанные метрики"] > li').length;
    return { name, badge, count };
  }));
  expect(summaries.filter(({badge}) => !badge).map(({name}) => name)).toEqual(['DateKey', 'FullDate']);
  for (const {name, badge, count} of summaries) {
    if (badge === undefined) {
      expect(count).toBe(0);
    } else {
      expect(Number(badge)).toBe(count);
      if (name === 'Date') {
        expect(count).toBe(12);
      } else {
        expect(count).toBeGreaterThanOrEqual(3);
        expect(count).toBeLessThanOrEqual(7);
      }
    }
  }
  const dateKey = rows.filter({ has: page.getByText('DateKey', { exact: true }) });
  await expect(dateKey.getByText('Метрики', { exact: true })).toHaveCount(0);
  await dateKey.getByRole('button').press('Enter');
  await expect(dateKey.getByText('Связанные метрики не найдены')).toBeVisible();
  const fullDate = rows.filter({ has: page.getByText('FullDate', { exact: true }) });
  await fullDate.getByRole('button').press('Enter');
  await expect(fullDate.getByText('Связанные метрики не найдены')).toBeVisible();
  await fullDate.getByRole('button').press('Enter');
  const date = rows.filter({ has: page.getByText('Date', { exact: true }) });
  await expect(date.getByRole('button')).toContainText(/Метрики\s*12/);
  await date.getByRole('button').press('Enter');
  await expect(date.getByText('Метрики, использующие поле')).toHaveCount(0);
  const metrics = date.getByRole('list', { name: 'Связанные метрики' }).getByRole('listitem');
  await expect(metrics).toHaveCount(12);
  await expect(metrics.first()).toHaveText('Количество задач оформления и регистрации');
  await expect(metrics.last()).toHaveText('Площадь онлайн-продаж, м²');
  for (const metric of await metrics.all()) {
    await expect(metric).toHaveCSS('border-bottom-width', '0px');
    await expect(metric).toHaveCSS('min-height', '32px');
    await expect(metric).toHaveCSS('color', 'rgb(0, 107, 219)');
    await expect(metric.locator('svg[aria-hidden=true]')).toHaveCount(1);
  }
  const firstMetric = metrics.first();
  const [icon, chevron] = await Promise.all([
    firstMetric.locator('svg').boundingBox(), date.getByRole('button').locator(':scope > [aria-hidden=true]').first().boundingBox(),
  ]);
  expect(icon!.x + icon!.width / 2).toBeCloseTo(chevron!.x + chevron!.width / 2);
  await firstMetric.hover();
  await expect(firstMetric).toHaveCSS('background-color', 'rgb(243, 244, 249)');
  await expect(firstMetric).toHaveCSS('border-radius', '8px');
  await expect(date.getByRole('list', { name: 'Связанные метрики' }).getByRole('link')).toHaveCount(0);
  const fieldsUrl = page.url();
  await metrics.first().getByText('Количество задач оформления и регистрации', { exact: true }).click();
  await expect(page).toHaveURL(fieldsUrl);
  await expect(date.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  await expect(dateKey.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Сведения о полях этого источника не предоставлены.',{exact:true})).toHaveCount(0);
});

test('dimdate shows the observed report cards in order without changing the tab count or repeating the heading',async({page})=>{
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(reportCrmDate);
  const tab = page.getByRole('tab',{name:'Связанные отчёты 84',exact:true});
  const list = page.getByRole('list',{name:'Связанные отчёты',exact:true});
  const about = page.getByRole('button',{name:/^Об источнике/});
  const passport = page.getByRole('complementary',{name:'Сведения об источнике',exact:true});
  await expect(about).toBeVisible();
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected','true');
  await expect(about).toHaveCount(0);
  await expect(passport).toBeInViewport();
  await expect(page.getByRole('heading',{name:'Связанные отчёты',exact:true})).toHaveCount(0);
  await expect(list.getByRole('heading',{level:2})).toHaveText([
    '00. Агентское вознаграждение в реестре продаж',
    '00. Отчет ЦК v3',
    '00. Отчет ЦК v3 для ММ и кладовых (Тест)',
    '00. Отчет ЦК v8 для ММ и кладовых (Тест)',
    '00. ПР-01-Шахматка- для Агентств',
  ]);
  await expect(list.getByRole('listitem').locator('p')).toHaveText([
    'Проверка и расчёт выплат агентам за отчётный период. Отдельно показаны активные и неактивные вознаграждения по данным CRM.',
    'Подготовка к заседанию Ценового комитета. Контроль плановых показателей и расчёт приведённых цен с учётом отделки.',
    'Контроль плана для Ценового комитета, анализ структуры вымываемости и прогноз плановых показателей на следующий месяц.',
    'Подготовка к Ценовому комитету. Автоматический сбор данных, контроль плановых показателей и прогноз на следующий месяц.',
    'Описание целиком не видно в источнике.',
  ]);
  const first = list.getByRole('listitem').first();
  const firstLink = first.getByRole('link');
  const icon = firstLink.locator('[aria-hidden=true]');
  const title = firstLink.getByRole('heading');
  const firstDescription = firstLink.locator('p');
  const lastDescription = list.getByRole('listitem').last().locator('p');
  const tooltip = page.getByRole('tooltip');
  await expect(firstDescription).toHaveCSS('text-overflow','ellipsis');
  await expect(firstDescription).toHaveCSS('white-space','nowrap');
  await expect(firstDescription).toHaveCSS('height','20px');
  await expect(firstDescription).toHaveAttribute('data-overflow-clipped','true');
  await expect(firstLink).toHaveAccessibleDescription(await firstDescription.innerText());
  await firstDescription.hover();
  await expect(tooltip).toHaveText(await firstDescription.innerText());
  await page.keyboard.press('Escape');
  await expect(tooltip).toHaveCount(0);
  await lastDescription.hover();
  await expect(lastDescription).not.toHaveAttribute('data-overflow-clipped');
  await expect(tooltip).toHaveCount(0);
  await page.mouse.move(0,0);
  await expect(first).toHaveCSS('background-color','rgb(255, 255, 255)');
  await expect(first).toHaveCSS('border-radius','12px');
  await expect(first).toHaveCSS('border-color','rgb(214, 230, 251)');
  await expect(icon).toHaveCSS('width','32px');
  await expect(icon).toHaveCSS('height','32px');
  expect(await icon.evaluate(element => {
    const glyph = getComputedStyle(element,'::before');
    return {width:glyph.width,height:glyph.height,mask:glyph.maskImage};
  })).toEqual({width:'16px',height:'16px',mask:expect.stringContaining('/icons/reports/report-document.svg')});
  for (const width of [1440,900]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(async () => {
      const [row, badge] = await Promise.all([first.boundingBox(),icon.boundingBox()]);
      return row && badge ? Math.abs(row.y + row.height / 2 - badge.y - badge.height / 2) : Infinity;
    }).toBeLessThan(0.5);
    const [rowBox, badgeBox] = await Promise.all([first.boundingBox(),icon.boundingBox()]);
    expect(badgeBox!.x - rowBox!.x).toBeCloseTo(17);
    await firstLink.locator('p').hover();
    await expect(first).toHaveCSS('border-color','rgb(64, 143, 231)');
    await expect(title).toHaveCSS('color','rgb(0, 103, 220)');
    await expect(icon).toHaveCSS('background-color','rgb(231, 242, 255)');
    await expect(icon).toHaveCSS('color','rgb(0, 123, 252)');
    await page.mouse.move(0,0);
    await expect(first).toHaveCSS('border-color','rgb(214, 230, 251)');
  }
  await page.keyboard.press('Tab');
  await firstLink.focus();
  await expect(firstLink).toHaveCSS('outline-width','2px');
  await expect(firstLink).toHaveCSS('outline-style','solid');
  await expect(first).toHaveCSS('border-color','rgb(64, 143, 231)');
  await expect(list.getByRole('link')).toHaveCount(5);
  await expect(list.getByRole('listitem').last()).toBeInViewport();
  const [listBox, passportBox] = await Promise.all([list.boundingBox(), passport.boundingBox()]);
  expect(listBox!.width).toBeCloseTo(passportBox!.width);
  expect(passportBox!.y - listBox!.y - listBox!.height).toBeCloseTo(8);
  await page.getByRole('tab',{name:'Описание полей 34',exact:true}).click();
  await expect(about).toBeVisible();
  await expect(list).toHaveCount(0);
});

test('each related report opens its own passport and source breadcrumbs restore the catalog context',async({page})=>{
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reports = entry + '&sourceView=cards&source.platform=SQL+Server&source=source-reportcrm-date&sourceTab=reports';
  await page.goto(reports);
  const list = page.getByRole('list',{name:'Связанные отчёты',exact:true});
  const links = list.getByRole('link');
  await expect(links).toHaveCount(5);
  const titles = await links.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')!));
  const crumb = page.getByRole('navigation',{name:'Хлебные крошки'});
  const reportIds = new Set<string>();
  for (const [index,title] of titles.entries()) {
    const link = links.nth(index);
    if (index === 0) {
      await link.focus();
      await link.press('Enter');
    } else await link.click();
    await expect(page.getByRole('heading',{name:title,exact:true,level:1})).toBeVisible();
    await expect(page.getByRole('tab',{name:/^Источники данных/})).toHaveAttribute('aria-selected','true');
    await expect(crumb.locator('[aria-current=page]')).toHaveText(title);
    reportIds.add(new URL(page.url()).searchParams.get('report')!);
    if (index === 0) {
      await page.reload();
      await expect(page.getByRole('heading',{name:title,exact:true,level:1})).toBeVisible();
    }
    await crumb.getByRole('button',{name:'reportcrm20.dbo.dimdate',exact:true}).click();
    await expect(list).toBeVisible();
    await expect(page).toHaveURL(/[?&]sourceTab=reports/);
  }
  expect(reportIds.size).toBe(5);
  await links.first().click();
  await crumb.getByRole('button',{name:'Источники',exact:true}).click();
  await expect(page.getByRole('button',{name:'Карточный вид',exact:true})).toHaveAttribute('aria-pressed','true');
  expect(new URL(page.url()).searchParams.get('source.platform')).toBe('SQL Server');
});

test('source cards put views and analytics on the context row and share the detail actions',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto(entry+'&sourceView=cards');
  const card = page.locator('article[data-source-id="source-reportcrm-date"]');
  const title = card.getByRole('heading',{name:'reportcrm20.dbo.dimdate'});
  const context = card.getByText(/SQL Server.*Без слоя.*Reportcrm20/);
  const analytics = card.getByText('Используется в аналитике',{exact:true});
  const views = card.locator('[aria-label="Счётчик просмотров: 22"]');
  const footer = card.locator('footer');
  const [a,b,c,heading] = await Promise.all([context.boundingBox(),analytics.boundingBox(),views.boundingBox(),title.boundingBox()]);
  expect(b!.x).toBeGreaterThanOrEqual(a!.x + a!.width);
  expect(b!.y + b!.height / 2).toBeCloseTo(a!.y + a!.height / 2);
  expect(c!.y + c!.height / 2).toBeCloseTo(a!.y + a!.height / 2);
  expect(heading!.y).toBeGreaterThan(b!.y + b!.height);
  await expect(footer.getByText('Используется в аналитике')).toHaveCount(0);
  const origin = page.url();
  await footer.getByRole('button',{name:'Скачать метаданные'}).click();
  await expect(page.getByText('Выгрузка метаданных не подключена. Файл не создан.')).toBeVisible();
  await footer.getByRole('button',{name:'Получить доступ'}).click();
  await expect(page.getByText('Получение доступа не подключено. Заявка не отправлена.')).toBeVisible();
  await expect(page).toHaveURL(origin);
});

test('source table action column is pinned and its divider clears only at the right edge',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto(entry);
  const scroller = page.getByLabel('Прокрутка таблицы источников');
  const tableFrame = page.locator('[data-source-table-at-end]');
  const row = page.locator('tr[data-source-id="source-reportcrm-date"]');
  const download = row.getByRole('button',{name:'Скачать метаданные'});
  const access = row.getByRole('button',{name:'Получить доступ'});
  await expect(download).toHaveCSS('width','32px');
  await expect(access).toHaveCSS('height','32px');
  await expect(access).toHaveCSS('background-color','rgb(0, 123, 252)');
  const start = (await access.boundingBox())!.x;
  const divider = () => access.locator('xpath=ancestor::td').evaluate(cell=>getComputedStyle(cell,'::before').boxShadow);
  await expect(tableFrame).toHaveAttribute('data-source-table-at-end','false');
  expect(await divider()).toContain('rgb(226, 228, 234)');
  await scroller.evaluate(element=>{element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2;});
  await expect.poll(async()=>(await access.boundingBox())!.x).toBeCloseTo(start);
  await expect(tableFrame).toHaveAttribute('data-source-table-at-end','false');
  await scroller.evaluate(element=>{element.scrollLeft = element.scrollWidth;});
  await expect(tableFrame).toHaveAttribute('data-source-table-at-end','true');
  expect(await divider()).not.toContain('rgb(226, 228, 234)');
  await expect.poll(async()=>(await access.boundingBox())!.x).toBeCloseTo(start);
  await download.click();
  await expect(page.getByText('Выгрузка метаданных не подключена. Файл не создан.')).toBeVisible();
  await expect(page.locator('[data-source-detail-id]')).toHaveCount(0);
});

test('a known nonzero report count without the list stays distinct from an empty list',async({page})=>{
  await page.goto(entry+'&source=source-dwh-date&sourceTab=reports');
  await expect(page.getByRole('tab',{name:'Связанные отчёты 47',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.getByRole('heading',{name:'Список связанных отчётов недоступен',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Связанные отчёты не найдены',exact:true})).toHaveCount(0);
  await expect(page.getByRole('list',{name:'Связанные отчёты',exact:true})).toHaveCount(0);
});

const sourceSchemas = [
  ['source-reportcrm-date','reportcrm20.dbo.dimdate',34,'DateKey','created_at'],
  ['source-dwh-date','dwh2crm.ref.dimdate',33,'date_key','source_system'],
  ['source-dwh-project','dwh2crm.tableau.проект',20,'project_id','etl_loaded_at'],
  ['source-demo-clients','demo.crm.clients',12,'client_id','updated_at'],
  ['source-demo-contracts','demo.crm.contracts',18,'contract_id','updated_at'],
  ['source-demo-sales','demo.crm.sales',24,'sale_id','updated_at'],
  ['source-demo-requests','demo.service.requests',15,'request_id','sla_breached'],
  ['source-demo-feedback','demo.service.feedback',10,'feedback_id','processed_at'],
  [id,name,8,'id','object_changes'],
] as const;
for(const view of ['list','cards']) test(`every source opens its own full accordion schema from ${view} and returns to the same list`,async({page})=>{
  test.setTimeout(60000);
  const failures:string[]=[];page.on('pageerror',error=>failures.push(error.message));
  await page.goto(entry+'&sourceView='+view);
  for(const [sourceId,title,count,firstField,lastField] of sourceSchemas) {
    await page.locator(`[data-source-id="${sourceId}"]`).getByRole('button',{name:title,exact:true}).click();
    await expect(page.getByRole('heading',{level:1,name:title,exact:true})).toBeVisible();
    const passport=page.getByRole('complementary',{name:'Сведения об источнике',exact:true});
    await expect(passport).not.toContainText('—');
    await expect(passport).not.toContainText('Не указан');
    await expect(page.getByText('Описание отсутствует',{exact:true})).toHaveCount(0);
    const fields=page.getByRole('region',{name:'Описание полей источника',exact:true});
    await expect(fields.locator('section')).toHaveCount(count);
    await expect(page.getByRole('tab',{name:`Описание полей ${count}`,exact:true})).toHaveAttribute('aria-selected','true');
    await expect(fields.locator('section').first().getByRole('button')).toContainText(firstField);
    const last=fields.locator('section').last();
    await expect(last.getByRole('button')).toContainText(lastField);
    await last.getByRole('button').click();
    await expect(last.getByRole('button')).toHaveAttribute('aria-expanded','true');
    await expect(fields.getByText('Сведения о полях этого источника не предоставлены.',{exact:true})).toHaveCount(0);
    await page.locator('[data-source-detail-id] [data-detail-scroll]').evaluate(el => { el.scrollTop = 0; });
    await page.locator('[data-source-detail-id] nav').getByRole('button',{name:'Источники',exact:true}).click();
    await expect(page).toHaveURL(entry+'&sourceView='+view);
  }
  expect(failures).toEqual([]);
});
