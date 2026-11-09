import { expect, test } from '@playwright/test';
import { chooseSingle } from './helpers/chooseSingle';

const entry = '/preview/navigation?section=metrics';

test('metric and indicator icons follow report spacing and change color with the title', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const view of ['cards', 'list']) {
    await page.goto(entry + '&metricView=' + view);
    for (const kind of ['metric', 'indicator']) {
      const icon = page.locator(`[data-catalog-entity-icon="${kind}"]`).first();
      const item = icon.locator('xpath=ancestor::*[@data-metric-id][1]');
      const title = item.getByRole('button').first();
      await expect(icon).toHaveCSS('background-color', 'rgb(238, 242, 246)');
      await expect(icon).toHaveCSS('color', 'rgb(113, 134, 165)');
      await expect.poll(() => icon.evaluate(element => getComputedStyle(element, '::before').maskImage))
        .toContain(kind === 'metric' ? '/icons/sidebar/metrics.svg' : '/icons/metrics/indicator.svg');
      const box = (await icon.boundingBox())!;
      const itemBox = (await item.boundingBox())!;
      expect(box.width).toBe(40);
      expect(box.height).toBe(40);
      expect(box.x - itemBox.x).toBe(view === 'cards' ? 25 : 20);
      expect((await title.boundingBox())!.x - box.x - box.width).toBe(view === 'cards' ? 16 : 12);

      await item.hover({ position: { x: 4, y: 12 } });
      await expect(icon).toHaveCSS('background-color', 'rgb(231, 242, 255)');
      await expect(icon).toHaveCSS('color', 'rgb(0, 103, 220)');
      await expect(title).toHaveCSS('color', 'rgb(0, 103, 220)');
      if (kind === 'indicator') await item.screenshot({ path: testInfo.outputPath(`indicator-${view}-hover.png`) });
      await page.getByRole('heading', { level: 1, name: 'Метрики и показатели' }).hover();
      await expect(title).toHaveCSS('color', 'rgb(16, 29, 59)');
    }
  }
});

test('metric filters intersect and reset in both representations', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(entry);
  const heading = page.getByRole('heading', { level: 1, name: 'Метрики и показатели' });
  await expect(heading).toBeVisible();
  const headingBottom = await heading.evaluate(element => element.getBoundingClientRect().bottom);
  const toolbar = page.locator('[data-metrics-toolbar]');
  await expect(toolbar).toBeVisible();
  expect(await toolbar.evaluate(element => element.getBoundingClientRect().top) - headingBottom).toBe(16);
  const type = toolbar.getByRole('combobox', { name: 'Тип метрики', exact: true });
  const status = toolbar.getByRole('combobox', { name: 'Статус метрики', exact: true });
  const reset = toolbar.getByRole('button', { name: 'Сбросить', exact: true });
  await expect(reset).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Табличный вид', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Карточный вид', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Метрики и показатели' })).toBeVisible();
  await expect(page.locator('[data-metric-id]')).toHaveCount(9);
  const ids = await page.locator('[data-metric-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-metric-id')));
  await chooseSingle(page, type, 'Метрика');
  await expect(page.locator('[data-metric-id]')).toHaveCount(2);
  await expect(reset).toBeVisible();
  await reset.click();
  await expect(reset).toHaveCount(0);
  await expect(type).toBeFocused();
  await expect(page.locator('article[data-metric-id]')).toHaveCount(9);
  await chooseSingle(page, type, 'Метрика');
  await chooseSingle(page, status, 'Проверена');
  await expect(page.locator('[data-metric-id]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Метрики и показатели не найдены' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Табличный вид', exact: true })).toHaveCount(0);
  await expect(reset).toBeVisible();
  await expect(page.getByRole('button', { name: 'Сбросить фильтры', exact: true })).toBeVisible();
  await expect(type).toHaveText('Метрика');
  await chooseSingle(page, type, 'Показатель');
  await expect(page.locator('[data-metric-id]')).toHaveCount(1);
  await expect(page.locator('[data-metric-id]')).toHaveAttribute('data-metric-id', '4');
  await expect(page.getByRole('button', { name: 'Карточный вид', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Табличный вид', exact: true }).click();
  await page.setViewportSize({ width: 1024, height: 900 });
  const resetBox = (await reset.boundingBox())!;
  const statusBox = (await status.boundingBox())!;
  const typeBox = (await type.boundingBox())!;
  expect(resetBox.height).toBe(40);
  expect(resetBox.height).toBe(typeBox.height);
  expect(statusBox.x - typeBox.x - typeBox.width).toBe(8);
  expect(resetBox.height).toBe(statusBox.height);
  expect(resetBox.y).toBe(statusBox.y);
  expect(resetBox.x - statusBox.x - statusBox.width).toBe(12);
  await toolbar.screenshot({ path: testInfo.outputPath('metric-filter-reset.png'), animations: 'disabled' });
  await reset.press('Enter');
  await expect(reset).toHaveCount(0);
  await expect(type).toHaveText('Все типы');
  await expect(status).toHaveText('Все статусы');
  await expect(page).not.toHaveURL(/metric(?:Type|Status)=/);
  await expect(page.getByRole('button', { name: 'Табличный вид', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-metric-id]')).toHaveCount(9);
  expect(await page.locator('[data-metric-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-metric-id')))).toEqual(ids);
  await expect(page.getByRole('button', { name: 'Выручка', exact: true })).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('metric detail preserves object, controlled accordions, tooltip and return context', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(entry + '&metricView=list&metricType=Показатель&metricStatus=Проверена');
  await page.getByRole('button', { name: 'Объём продаж', exact: true }).click();
  await expect(page).toHaveURL(/metric=4/);
  await expect(page.locator('[data-metric-detail-id]')).toHaveAttribute('data-metric-detail-id', '4');
  await expect(page.getByRole('heading', { level: 1, name: 'Объём продаж' })).toBeVisible();
  const definition = page.getByRole('button', { name: 'Определение показателя', exact: true });
  await definition.hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toHaveText('Продажи на конечного клиента по предметам договоров с учетом расторжений');
  await tooltip.hover();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tooltip).toHaveCount(0);
  await definition.focus();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press('Escape');
  const description = page.getByRole('button', { name: /^Полное описание/ });
  const method = page.getByRole('button', { name: /^Методика расчёта/ });
  await expect(description).toHaveAttribute('aria-expanded', 'true');
  await description.click();
  await expect(description).toHaveAttribute('aria-expanded', 'false');
  await expect(method).toHaveAttribute('aria-expanded', 'true');
  await description.press('Space');
  await expect(description).toHaveAttribute('aria-expanded', 'true');
  const box = await description.boundingBox();
  await page.setViewportSize({ width: 1920, height: 1080 });
  expect((await description.boundingBox())!.width).toBeGreaterThan(box!.width);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Объём продаж' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('combobox', { name: 'Тип метрики', exact: true })).toHaveText('Показатель');
  await expect(page.getByRole('combobox', { name: 'Статус метрики', exact: true })).toHaveText('Проверена');
  await expect(page.getByRole('button', { name: 'Табличный вид', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-metric-id]')).toHaveAttribute('data-metric-id', '4');
});

test('metric accordion draws separators only between related items', async ({ page }) => {
  for (const [id, count] of [['sales-volume-plan', 1], ['4', 2]] as const) {
    await page.goto(entry + '&metric=' + id);
    const accordion = page.getByRole('button', { name: /^Связанные технические меры/ });
    const bodyId = await accordion.getAttribute('aria-controls');
    const items = page.locator(`[id="${bodyId}"] > div > div`);
    await expect(items).toHaveCount(count);
    await expect(items.last()).toHaveCSS('border-bottom-width', '0px');
    if (count > 1) await expect(items.first()).toHaveCSS('border-bottom-width', '1px');
  }
});

test('metric questions enable sending, show confirmation and enter the demo appeals list', async ({ page }) => {
  await page.goto(entry + '&metric=metric-ebitda');
  await expect(page.getByText('Уточните определение, методику или источники «EBITDA».', { exact: true })).toHaveCount(0);
  const field = page.getByRole('textbox', { name: 'Ваш вопрос' });
  const send = page.getByRole('button', { name: 'Отправить вопрос', exact: true });
  await expect(send).toBeDisabled();
  await expect(send.locator('svg[aria-hidden="true"]')).toBeVisible();
  await field.fill('   ');
  await expect(send).toBeDisabled();
  await field.fill('Как рассчитывается EBITDA?');
  await expect(send).toBeEnabled();
  await send.click();
  const notice = page.getByRole('status').filter({ hasText: 'Вопрос отправлен' });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('Серверная доставка не подключена');
  await expect(field).toHaveValue('');
  await expect(send).toBeDisabled();
  await notice.getByRole('button', { name: 'Закрыть уведомление' }).click();
  await expect(notice).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Разделы каталога' }).getByRole('button', { name: 'Вопросы и ответы' }).click();
  await page.getByRole('tab', { name: /^Мои вопросы/ }).click();
  await expect(page.getByRole('heading', { name: 'Вопрос по показателю «EBITDA»' })).toBeVisible();
});

test('other metric has its own complete profile and unknown ID remains unavailable', async ({ page }) => {
  await page.goto(entry + '&metric=metric-ebitda');
  await expect(page.getByRole('heading', { level: 1, name: 'EBITDA' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Полное описание/ })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('EBITDA = Операционная прибыль + Амортизация', { exact: true })).toBeAttached();
  await expect(page.getByText('Финансовая аналитика', { exact: true })).toBeVisible();
  await expect(page.getByText('Горбунь Анастасия Юрьевна', { exact: true })).toHaveCount(0);
  await page.goto(entry + '&metric=unknown');
  await expect(page.getByRole('heading', { name: 'Показатель не найден' })).toBeVisible();
  await page.getByRole('button', { name: 'К списку метрик и показателей', exact: true }).click();
  await expect(page.locator('[data-metric-id]')).toHaveCount(9);
});


test('metric cards use two readable columns and the table gives extra width to the name', async ({page}) => {
  await page.goto(entry);
  const measurements=[];
  for (const width of [1024,1440,1639,1640,1920,2560]) {
    await page.setViewportSize({width,height:900});
    await page.getByRole('button',{name:'Карточный вид',exact:true}).click();
    const cards=page.locator('article[data-metric-id]');
    await expect(cards).toHaveCount(9);
    const first=(await cards.nth(0).boundingBox())!,second=(await cards.nth(1).boundingBox())!;
    const container=await page.locator('[data-metrics-scroll]').evaluate(n=>n.clientWidth);
    expect(Math.abs(first.y-second.y)<1).toBe(container>=1288);
    if(container>=1288) { expect(first.width).toBeGreaterThanOrEqual(640); expect(second.x-first.x-first.width).toBeCloseTo(8); }
    const description=cards.filter({has:page.getByRole('button',{name:'Качество классификации обращений',exact:true})}).locator('p');
    await expect.poll(()=>description.evaluate(n=>n.hasAttribute('data-overflow-clipped')===(n.scrollWidth>n.clientWidth||(parseInt(getComputedStyle(n).webkitLineClamp)>0&&n.scrollHeight>n.clientHeight+1)))).toBe(true);
    await expect(description).toHaveCSS('text-overflow','ellipsis');
    if(width===1640) expect(await description.evaluate(n=>n.scrollWidth>n.clientWidth)).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(width===1920) await page.screenshot({path:'verification/metrics-responsive/cards-1920.png'});
    await page.getByRole('button',{name:'Табличный вид',exact:true}).click();
    const table=page.getByRole('table',{name:'Метрики и показатели',exact:true});
    await expect(table.getByRole('columnheader')).toHaveCount(7);
    const columns=await table.getByRole('columnheader').evaluateAll(nodes=>nodes.map(n=>Math.round(n.getBoundingClientRect().width)));
    const row=await table.getByRole('row').nth(1).getByRole('cell').evaluateAll(nodes=>nodes.map(n=>Math.round(n.getBoundingClientRect().width)));
    expect(row).toEqual(columns);
    if(width===1440) expect(columns).toEqual([360,120,104,202,90,116,96]);
    if(width===1920) { expect(columns).toEqual([744,120,104,298,90,116,96]); await page.screenshot({path:'verification/metrics-responsive/table-1920.png'}); }
    if(width===2560) expect(columns).toEqual([1256,120,104,426,90,116,96]);
    measurements.push({viewport:width,container,card:first.width,columns});
  }
  await page.setViewportSize({width:1440,height:900});
  await page.getByRole('button',{name:'Карточный вид',exact:true}).click();
  await page.getByRole('button',{name:'Свернуть панель',exact:true}).click();
  const collapsedCards=page.locator('article[data-metric-id]');
  await expect.poll(async()=>Math.abs((await collapsedCards.nth(0).boundingBox())!.y-(await collapsedCards.nth(1).boundingBox())!.y)<1).toBe(true);
  await chooseSingle(page,page.getByRole('combobox',{name:'Тип метрики',exact:true}),'Метрика');
  await expect(collapsedCards).toHaveCount(2);
  await page.getByRole('button',{name:'Табличный вид',exact:true}).click();
  await expect(page.locator('[data-metric-id]')).toHaveCount(2);
  await test.info().attach('responsive-measurements',{body:JSON.stringify(measurements,null,2),contentType:'application/json'});
});


test('every catalog card and row opens its own complete passport', async ({ page }) => {
  test.setTimeout(60000);
  for (const view of ['cards', 'list']) {
    await page.goto(entry + '&metricView=' + view);
    const items = page.locator('[data-metric-id]');
    await expect(items).toHaveCount(9);
    const records = await items.evaluateAll(nodes => nodes.map(node => ({ id: node.getAttribute('data-metric-id')!, title: node.querySelector('button')!.textContent! })));
    for (const record of records) {
      const item = page.locator('[data-metric-id="' + record.id + '"]');
      await item.locator('p').click();
      await expect(page.locator('[data-metric-detail-id]')).toHaveAttribute('data-metric-detail-id', record.id);
      await expect(page.getByRole('heading', { level: 1, name: record.title, exact: true })).toBeVisible();
      await expect(page.locator('[data-metric-detail-id] button[aria-expanded]')).toHaveCount(12);
      await expect(page.getByRole('complementary', { name: 'Сведения о показателе' })).toBeVisible();
      await expect(page.getByText('Полное исходное содержание паспорта для этого объекта пока не предоставлено.')).toHaveCount(0);
      if (record.id !== '4') await expect(page.getByText('Горбунь Анастасия Юрьевна', { exact: true })).toHaveCount(0);
      await page.locator('[data-metric-detail-id] nav').getByRole('button', { name: 'Метрики и показатели', exact: true }).click();
      await expect(page.locator('[data-metric-id]')).toHaveCount(9);
      await expect(page.getByRole('button', { name: view === 'cards' ? 'Карточный вид' : 'Табличный вид', exact: true })).toHaveAttribute('aria-pressed', 'true');
    }
  }
});

test('report metrics map to canonical passports and return with search, filters and view after reload', async ({ page }) => {
  test.setTimeout(60000);
  const reportEntry = '/preview/navigation?section=reports&report=demo-report-summary&reportTab=metrics';
  for (const view of ['cards', 'list']) {
    await page.goto(reportEntry + '&relatedMetricView=' + view);
    const root = page.locator('[data-report-metrics]');
    await expect(root.locator('[data-metric-id]')).toHaveCount(10);
    const records = await root.locator('[data-metric-id]').evaluateAll(nodes => nodes.map(node => ({ id: node.getAttribute('data-canonical-metric-id')!, title: node.querySelector('button')!.textContent! })));
    for (const record of records) {
      await root.locator('[data-canonical-metric-id="' + record.id + '"] p').click();
      await expect(page.locator('[data-metric-detail-id]')).toHaveAttribute('data-metric-detail-id', record.id);
      await expect(page.getByRole('navigation', { name: 'Разделы каталога' }).getByRole('button', { name: 'Отчёты', exact: true })).toHaveAttribute('aria-current', 'page');
      await expect(page.getByRole('heading', { level: 1, name: record.title, exact: true })).toBeVisible();
      await expect(page.locator('[data-metric-detail-id] button[aria-expanded]')).toHaveCount(12);
      if (record.id === '4') await expect(page.getByText('Горбунь Анастасия Юрьевна', { exact: true })).toBeVisible();
      await page.locator('[data-metric-detail-id] nav').getByRole('button', { name: 'Сводный отчёт Гостеприимства', exact: true }).click();
      await expect(root.locator('[data-metric-id]')).toHaveCount(10);
    }
    await root.getByRole('textbox').fill('без сертификатов');
    await chooseSingle(page,root.getByRole('combobox', { name: 'Тип метрики', exact: true }),'Показатель');
    await chooseSingle(page,root.getByRole('combobox', { name: 'Статус метрики', exact: true }),'Проверена');
    const origin = page.url();
    const item = root.locator('[data-metric-id]');
    await expect(item).toHaveCount(1);
    await item.getByRole('button', { name: /Редактировать/ }).click();
    await expect(page).toHaveURL(origin);
    await item.getByRole('button', { name: /Добавить.*избранное/ }).click();
    await expect(page).toHaveURL(origin);
    await item.getByRole('button', { name: 'Объём продаж без сертификатов', exact: true }).press('Enter');
    await expect(page.locator('[data-metric-detail-id]')).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-metric-detail-id] button[aria-expanded]')).toHaveCount(12);
    await page.locator('[data-metric-detail-id] nav').getByRole('button', { name: 'Сводный отчёт Гостеприимства', exact: true }).click();
    await expect(page).toHaveURL(origin);
    await expect(root.getByRole('textbox')).toHaveValue('без сертификатов');
    await expect(root.getByRole('combobox', { name: 'Тип метрики', exact: true })).toHaveText('Показатель');
    await expect(root.getByRole('combobox', { name: 'Статус метрики', exact: true })).toHaveText('Проверена');
    await expect(root.getByRole('button', { name: view === 'cards' ? 'Карточный вид' : 'Табличный вид', exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
  await page.goto(entry + '&metric=sales-volume-no-certificates');
  await expect(page.getByText('Объём без сертификатов = SUM(Площадь WHERE Сертификат = false)', { exact: true })).toBeAttached();
  await page.reload();
  await expect(page.locator('[data-metric-detail-id] button[aria-expanded]')).toHaveCount(12);
});

test('related cards keep the originating section and can jump to any breadcrumb', async ({ page }) => {
  await page.goto('/preview/navigation?section=reports');
  await page.getByRole('button', { name: 'Открыть отчёт «Сводный отчёт Гостеприимства»' }).click();
  await page.getByRole('tab', { name: /^Метрики и показатели/ }).click();
  await expect(page).toHaveURL(/reportTab=metrics/);
  const reportRoute = page.url();
  await page.getByRole('button', { name: 'План объёма продаж', exact: true }).click();
  await expect(page).toHaveURL(/metric=sales-volume-plan/);
  const metricRoute = page.url();
  await page.getByRole('button', { name: 'Объём продаж · связан с', exact: true }).click();
  const breadcrumbs = page.getByRole('navigation', { name: 'Хлебные крошки' });
  await expect(breadcrumbs.getByRole('button')).toHaveText(['Отчёты', 'Сводный отчёт Гостеприимства', 'План объёма продаж']);
  await expect(breadcrumbs.locator('[aria-current="page"]')).toHaveText('Паспорт показателя');
  await page.goBack();
  await expect(page).toHaveURL(metricRoute);
  await page.getByRole('button', { name: /^План-Факт продажи/ }).click();
  await expect(page.locator('[data-report-id]')).toHaveAttribute('data-report-id', 'demo-report-sales-plan');
  await expect(breadcrumbs.getByRole('button')).toHaveText(['Отчёты', 'Сводный отчёт Гостеприимства', 'План объёма продаж']);
  await expect(page.getByRole('navigation', { name: 'Разделы каталога' }).getByRole('button', { name: 'Отчёты', exact: true })).toHaveAttribute('aria-current', 'page');
  const copiedRoute = page.url();
  await breadcrumbs.getByRole('button', { name: 'Сводный отчёт Гостеприимства' }).click();
  await expect(page).toHaveURL(reportRoute);
  await expect(page.getByRole('tab', { name: /^Метрики и показатели/ })).toHaveAttribute('aria-selected', 'true');
  await page.goto(copiedRoute);
  await breadcrumbs.getByRole('button', { name: 'План объёма продаж' }).click();
  await expect(page).toHaveURL(metricRoute);
  await breadcrumbs.getByRole('button', { name: 'Отчёты', exact: true }).click();
  await expect(page).toHaveURL(/section=reports$/);
  await expect(page.getByRole('table', { name: 'Список отчётов' })).toBeVisible();
});


test('report metrics share catalog item behavior and container-based card and table growth', async ({page}) => {
  await page.goto('/preview/navigation?section=reports&report=demo-report-summary&reportTab=metrics');
  const root=page.locator('[data-report-metrics]');
  const sizes=[];
  for(const width of [1024,1440,1920,2560]){
    await page.setViewportSize({width,height:900});
    await root.getByRole('button',{name:'Карточный вид',exact:true}).click();
    const cards=root.locator('article[data-metric-id]');await expect(cards).toHaveCount(10);
    const a=(await cards.nth(0).boundingBox())!,b=(await cards.nth(1).boundingBox())!;
    const container=await cards.locator('..').evaluate(n=>n.clientWidth);
    expect(Math.abs(a.y-b.y)<1).toBe(container>=1288);
    if(container>=1288)expect(a.width).toBeGreaterThanOrEqual(640);
    await expect(cards.first().locator('p')).toHaveCSS('white-space','nowrap');
    await expect(cards.first().getByRole('button',{name:'Объём продаж',exact:true})).toHaveCSS('text-overflow','ellipsis');
    await root.getByRole('button',{name:'Табличный вид',exact:true}).click();
    const table=root.getByRole('table',{name:'Связанные показатели',exact:true});
    await expect(table.getByRole('columnheader')).toHaveCount(7);
    const columns=await table.getByRole('columnheader').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));
    const tableWidth=(await table.boundingBox())!.width;
    expect(columns[0]).toBeCloseTo(tableWidth>=1088?360+.8*(tableWidth-1088):360,0);
    for(const [i,value] of [[1,120],[2,104],[4,90],[5,116],[6,96]])expect(columns[i]).toBeCloseTo(value,0);
    sizes.push(columns[0]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  expect(sizes[3]).toBeGreaterThan(sizes[2]);expect(sizes[2]).toBeGreaterThan(sizes[1]);
  for(const view of ['cards','list']){
    const picker=root.getByRole('button',{name:view==='cards'?'Карточный вид':'Табличный вид',exact:true});
    await picker.click();
    await expect(picker).toHaveAttribute('aria-pressed','true');
    const item=root.locator('[data-metric-id]').first(),url=page.url();
    await item.getByRole('button',{name:'Редактировать «Объём продаж»',exact:true}).click();
    await expect(page.getByRole('status')).toContainText('пока не реализовано');await expect(page).toHaveURL(url);
    await item.getByRole('button',{name:'Добавить «Объём продаж» в избранное',exact:true}).click();
    await expect(page.getByRole('status')).toContainText('не сохранена: серверное действие не подключено');await expect(page).toHaveURL(url);
    expect(await item.getByRole('button',{name:'Добавить «Объём продаж» в избранное',exact:true}).getAttribute('aria-pressed')).toBeNull();
  }
});
