import { test, expect, type Locator } from '@playwright/test';

const catalog = '/preview/navigation?section=sources';
const treeRoute = catalog + '&sourceView=tree';
const sourceIds = (container: Locator) => container.locator('[data-source-id]').evaluateAll(nodes =>
  nodes.map(node=>node.getAttribute('data-source-id')).sort());
const group = (tree: Locator, label: string) => tree.locator(`[data-source-tree-branch="${label}"] > button`);

test('tree matches the same multi-attribute result as table and cards and prunes unmatched branches', async ({page}) => {
  await page.emulateMedia({ reducedMotion:'reduce' });
  const filters = new URLSearchParams({'source.domain':'Гостеприимство','source.description':'yes'});
  await page.goto(catalog + '&' + filters);
  const workspace = page.getByRole('region',{name:'Каталог источников'});
  const picker = workspace.getByRole('group',{name:'Вид представления'});
  expect(await picker.getByRole('button').evaluateAll(buttons=>buttons.map(button=>button.getAttribute('aria-label'))))
    .toEqual(['Табличный вид','Карточный вид','Дерево']);
  const expected = await sourceIds(workspace);
  expect(expected).toEqual(['source-demo-feedback','source-demo-requests']);
  await picker.getByRole('button',{name:'Карточный вид'}).click();
  await expect(workspace.locator('article[data-source-id]')).toHaveCount(2);
  expect(await sourceIds(workspace)).toEqual(expected);

  const switchToTree = picker.getByRole('button',{name:'Дерево'});
  await switchToTree.click();
  await expect(switchToTree).toHaveAttribute('aria-pressed','true');
  const tree = workspace.getByRole('region',{name:'Дерево источников'});
  await expect(tree).toBeVisible();
  expect(await sourceIds(tree)).toEqual(expected);
  expect(await tree.locator('[data-source-tree-branch]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-source-tree-branch'))))
    .toEqual(['SQL Server','Demo','service']);
  for (const branch of ['SQL Server','Demo','service']) {
    await expect(group(tree,branch)).toHaveAttribute('aria-expanded','true');
    await expect(group(tree,branch).locator('[data-source-tree-count]')).toHaveText('2');
  }
  await expect(tree.locator('[data-source-id] [data-source-tree-count]')).toHaveText(['15 кол.','10 кол.']);

  await group(tree,'service').click();
  await expect(tree.locator('[data-source-id]:visible')).toHaveCount(0);
  await workspace.getByRole('button',{name:'Открыть фильтры источников'}).click();
  const panel = page.getByRole('dialog',{name:'Фильтры',exact:true});
  await panel.getByRole('button',{name:/^ПДн/}).click();
  await panel.getByRole('radio',{name:'С ПДн',exact:true}).check();
  await panel.getByRole('button',{name:'Применить',exact:true}).click();
  await expect(tree.locator('[data-source-id]:visible')).toHaveCount(1);
  await expect(group(tree,'service')).toHaveAttribute('aria-expanded','true');
  await expect(group(tree,'SQL Server').locator('[data-source-tree-count]')).toHaveText('1');
  expect(await sourceIds(tree)).toEqual(['source-demo-requests']);

  await page.goto(treeRoute + '&source.analytics=yes&source.description=no');
  await expect(workspace.getByRole('heading',{name:'Источники не найдены'})).toBeVisible();
  await workspace.getByRole('button',{name:'Сбросить фильтры',exact:true}).click();
  await expect(tree.locator('[data-source-id]')).toHaveCount(9);
  await expect(switchToTree).toHaveAttribute('aria-pressed','true');
});

test('tree includes the entire catalog while retaining the flat-view page', async ({page}) => {
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.goto(catalog + '&paginationDemo=1&sourcePage=1');
  const workspace = page.getByRole('region',{name:'Каталог источников'});
  const pager = workspace.getByRole('navigation',{name:'Страницы источников'});
  await expect(pager).toContainText('16–30 из 35');
  const secondPage = await sourceIds(workspace);
  await workspace.getByRole('button',{name:'Дерево',exact:true}).click();
  const tree = workspace.getByRole('region',{name:'Дерево источников'});
  await expect(tree.locator('[data-source-id]')).toHaveCount(35);
  await expect(pager).toHaveCount(0);
  await expect(group(tree,'SQL Server').locator('[data-source-tree-count]')).toHaveText('32');
  await expect(group(tree,'PostgreSQL').locator('[data-source-tree-count]')).toHaveText('3');
  expect(await sourceIds(tree)).toEqual(expect.arrayContaining(secondPage));
  await workspace.getByRole('button',{name:'Карточный вид'}).click();
  await expect(pager).toContainText('16–30 из 35');
  await expect(workspace.locator('article[data-source-id]')).toHaveCount(15);
  expect(await sourceIds(workspace)).toEqual(secondPage);
});

test('tree preserves disclosures and breadcrumb path around detail navigation, and rows fit both widths', async ({page}) => {
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.goto(treeRoute);
  const tree = page.getByRole('region',{name:'Дерево источников'});
  const crumbs = tree.getByRole('group',{name:'Путь ветки'});
  const current = crumbs.locator('[aria-current=location]');
  const header = tree.locator('[data-source-tree-header]');
  await expect(current).toHaveText('Источники');
  await expect(header).toHaveCSS('height','48px');
  await expect(header).toHaveCSS('border-bottom-color','rgb(226, 228, 234)');
  await expect(header.getByRole('button')).toHaveCount(0);
  const sql = group(tree,'SQL Server');
  await sql.focus();
  await sql.press('Space');
  await expect(sql).toHaveAttribute('aria-expanded','false');
  await expect(group(tree,'PostgreSQL')).toHaveAttribute('aria-expanded','true');
  await expect(tree.locator('[data-source-id]:visible')).toHaveCount(1);
  await expect(current).toHaveText('SQL Server');

  const name = 'rewedo_crm_production.public.versions';
  const entry = tree.locator('[data-source-id=source-demo-rewedo-versions]');
  const leaf = entry.getByRole('button',{name,exact:true});
  const bookmark = entry.getByRole('button',{name:'Закладка '+name,exact:true});
  const leafRow = entry.locator(':scope > div');
  for (const width of [1440,1024]) {
    await page.setViewportSize({width,height:900});
    await leafRow.hover();
    await expect(leafRow).toHaveCSS('background-color','rgb(243, 244, 249)');
    await expect(leafRow).toHaveCSS('border-radius','8px');
    await expect(leafRow).toHaveCSS('border-bottom-width','0px');
    await expect(leaf).toHaveCSS('color','rgb(0, 103, 220)');
    const [leafCount,groupCount] = await Promise.all([
      leafRow.locator('[data-source-tree-count]').boundingBox(),sql.locator('[data-source-tree-count]').boundingBox(),
    ]);
    expect(leafCount!.x + leafCount!.width).toBeCloseTo(groupCount!.x + groupCount!.width);
    const [bookmarkBox,parentIcon] = await Promise.all([
      bookmark.boundingBox(),group(tree,'public').locator('[data-source-tree-group-icon]').boundingBox(),
    ]);
    expect(bookmarkBox!.x + bookmarkBox!.width/2).toBeCloseTo(parentIcon!.x + parentIcon!.width/2);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  }
  await bookmark.click();
  await expect(bookmark).toHaveAttribute('aria-pressed','true');
  await expect(tree).toBeVisible();
  await leaf.focus();
  await leaf.press('Enter');
  await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  await page.locator('[data-source-detail-id]').getByRole('navigation',{name:'Хлебные крошки'})
    .getByRole('button',{name:'Источники',exact:true}).click();
  await expect(tree).toBeVisible();
  await expect(sql).toHaveAttribute('aria-expanded','false');
  await expect(bookmark).toHaveAttribute('aria-pressed','true');
  await expect(current).toHaveText('public');
  await expect(crumbs.getByRole('button').or(crumbs.getByRole('link'))).toHaveCount(0);
  await expect(crumbs.locator('span')).toHaveText(['Источники','PostgreSQL','Amocrm Rerooms','rewedo_crm_production','public']);
  const selectedPath = page.url();
  await crumbs.getByText('PostgreSQL',{exact:true}).click();
  await crumbs.getByText('Источники',{exact:true}).click();
  await expect(page).toHaveURL(selectedPath);
  await expect(current).toHaveText('public');
  const postgres = group(tree,'PostgreSQL');
  await postgres.press('Enter');
  await expect(postgres).toHaveAttribute('aria-expanded','false');
  await expect(current).toHaveText('PostgreSQL');
  await expect(sql).toHaveAttribute('aria-expanded','false');
});

test('tree disclosures animate while closing descendants become inaccessible immediately', async ({page}) => {
  await page.goto(treeRoute);
  const tree = page.getByRole('region',{name:'Дерево источников'});
  const branch = tree.locator('[data-source-tree-branch="public"]');
  const reveal = branch.locator(':scope > [data-source-tree-reveal]');
  const disclosure = group(tree,'public');
  const leaf = 'rewedo_crm_production.public.versions';
  const expandedHeight = (await reveal.boundingBox())!.height;
  await disclosure.press('Space');
  await expect(reveal).toHaveAttribute('inert','');
  await expect(branch.getByRole('button',{name:leaf,exact:true})).toHaveCount(0);
  await expect.poll(()=>reveal.evaluate(el=>el.getBoundingClientRect().height)).toBe(0);
  await disclosure.press('Space');
  await expect(reveal).not.toHaveAttribute('inert','');
  const transition = await reveal.evaluate(el=>{
    const animation = el.getAnimations().find(a=>a instanceof CSSTransition && a.transitionProperty==='grid-template-rows');
    return animation?.effect?.getTiming().duration;
  });
  expect(transition).toBe(320);
  await expect.poll(()=>reveal.evaluate(el=>el.getBoundingClientRect().height)).toBe(expandedHeight);
  await expect(branch.getByRole('button',{name:leaf,exact:true})).toBeVisible();
});

test('Navigator opens an excluded source in detail and returns to the filtered tree', async ({page}) => {
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.goto(treeRoute + '&' + new URLSearchParams({'source.domain':'Гостеприимство'}));
  const tree = page.getByRole('region',{name:'Дерево источников'});
  const expected = await sourceIds(tree);
  expect(expected).toEqual(['source-demo-feedback','source-demo-requests']);
  await page.getByRole('combobox',{name:'Поиск по каталогу'}).fill('Календарный');
  const result = page.getByRole('dialog',{name:'Поиск по каталогу'})
    .getByRole('rowgroup',{name:'Источники',exact:true}).getByRole('row')
    .filter({hasText:'reportcrm20.dbo.dimdate'});
  await result.getByRole('gridcell').first().getByRole('button').click();
  const detail = page.locator('[data-source-detail-id=source-reportcrm-date]');
  await expect(detail).toBeVisible();
  await expect(detail.locator('mark')).toHaveText('Календарный');
  await detail.getByRole('navigation',{name:'Хлебные крошки'}).getByRole('button',{name:'Источники',exact:true}).click();
  await expect(tree).toBeVisible();
  expect(await sourceIds(tree)).toEqual(expected);
});
