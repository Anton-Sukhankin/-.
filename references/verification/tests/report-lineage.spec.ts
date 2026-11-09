import { expect, test } from '@playwright/test';

const entry='/preview/navigation?section=reports&report=demo-report-summary&reportTab=sources';

test('Paper source fixture, compact alternative block and trailing actions stay consistent', async({page})=>{
  await page.goto(entry);
  await expect(page.getByRole('tab',{name:'Источники данных 5',exact:true})).toHaveAttribute('aria-selected','true');
  const sources=page.locator('[data-report-sources]');
  const names=['demo.requests','demo.events','demo.teams','demo.services','demo.locations'];
  await expect(sources.locator(':scope>section strong')).toHaveText(names);
  await expect(page.locator('[data-lineage-node]')).toHaveCount(5);
  await expect(page.locator('[data-category="datahub"]')).toHaveCount(3);
  await expect(page.locator('[data-category="catalog"]')).toHaveCount(2);
  const legend=page.getByRole('list',{name:'Категории происхождения данных'});
  await expect(legend.locator('li')).toHaveText(['Отчёт','Источник DataHub','Источник (каталог)','Reports','CDM','Clean','BClean']);
  const alternative=page.getByRole('region',{name:'Альтернативные источники',exact:true});
  expect((await alternative.boundingBox())!.height).toBeLessThan(100);
  await expect(alternative.getByRole('button')).toHaveCount(0);
  const link=sources.getByRole('button',{name:'Карточка источника demo.requests',exact:true});
  const tag=link.locator('..').getByText('Демо SQL',{exact:true});
  expect((await link.boundingBox())!.x).toBeGreaterThan((await tag.boundingBox())!.x);
  expect((await link.boundingBox())!.height).toBeLessThanOrEqual((await tag.boundingBox())!.height);
  await expect(link.locator('svg,img,button')).toHaveCount(0);
  await expect(sources.getByRole('button',{name:/^demo.requests/})).toHaveAttribute('aria-expanded','true');
  await sources.getByRole('button',{name:/^demo.events/}).click();
  await expect(sources.locator('section').nth(1).locator('dd')).toHaveText([
    'Демо PostgreSQL', 'demo_catalog', 'demo', 'TEST', 'Активен', '18',
    'urn:li:dataset:(urn:li:dataPlatform:postgres,demo_catalog.demo.events,TEST)',
  ]);
});

test('lineage zoom, pointer and keyboard pan, ports and native fullscreen work', async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:900});
  await page.goto(entry);
  const canvas=page.getByRole('group',{name:'Граф происхождения данных',exact:true});
  const scene=page.locator('[data-lineage-scene]');
  await expect(canvas).toHaveCSS('background-color','rgb(230, 236, 245)');
  await expect(canvas).toHaveCSS('border-radius','0px');
  expect(await canvas.evaluate(node=>{
    const frame=node.closest('[data-lineage]')!;
    const bounds=frame.getBoundingClientRect();
    const header=frame.querySelector('header')!.getBoundingClientRect();
    const view=node.getBoundingClientRect();
    return {
      top:view.top-header.bottom,
      left:view.left-bounds.left-frame.clientLeft,
      right:bounds.right-frame.clientLeft-view.right,
      footer:bounds.bottom-frame.clientTop-view.bottom,
    };
  })).toEqual({top:0,left:4,right:4,footer:20});
  await page.getByRole('button',{name:'Увеличить граф',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-zoom','1.20');
  const transform=await scene.evaluate(e=>getComputedStyle(e).transform);
  await canvas.focus();await canvas.press('ArrowRight');
  expect(await scene.evaluate(e=>getComputedStyle(e).transform)).not.toBe(transform);
  await canvas.press('Home');await expect(canvas).toHaveAttribute('data-zoom','1.00');
  const box=(await canvas.boundingBox())!;
  await page.mouse.move(box.x+60,box.y+50);await page.mouse.down();await page.mouse.move(box.x+105,box.y+80);await page.mouse.up();
  expect(await scene.evaluate(e=>getComputedStyle(e).transform)).not.toBe(transform);
  await page.getByRole('button',{name:'Уменьшить граф',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-zoom','0.80');
  for(const [width,height] of [[1280,900],[1440,900],[1920,1080],[1024,768],[1440,700]]){
    await page.setViewportSize({width,height});
    await expect.poll(async()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    // Read a node and its port in one layout frame while ResizeObserver settles.
    await expect.poll(()=>page.locator('[data-lineage-scene]').evaluate(scene=>
      [...scene.querySelectorAll('[data-lineage-node]')].every(node=>{
        const id=node.getAttribute('data-lineage-node');
        const n=node.getBoundingClientRect();
        const port=scene.querySelector(`[data-source-port="${id}"]`)!.getBoundingClientRect();
        return Math.abs(n.x+n.width/2-port.x-port.width/2)<1&&Math.abs(n.y-port.y-port.height/2)<1;
      })
    )).toBe(true);
  }
  const fullscreen=page.getByRole('button',{name:'Граф на полный экран',exact:true});
  await expect(page.getByRole('button',{name:'Свернуть',exact:true})).toHaveCount(0);
  await fullscreen.click();
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.hasAttribute('data-lineage'))).toBe(true);
  const collapse=page.getByRole('button',{name:'Свернуть',exact:true});
  await expect(collapse).toBeVisible();
  await expect(canvas).toHaveCSS('background-color','rgb(230, 236, 245)');
  await expect(canvas).toHaveCSS('border-radius','0px');
  await expect.poll(()=>canvas.evaluate(node=>{
    const box=node.getBoundingClientRect();
    const header=document.querySelector('[data-lineage] > header')!.getBoundingClientRect();
    return Math.abs(box.left)<1&&Math.abs(box.right-innerWidth)<1&&Math.abs(box.bottom-innerHeight)<1&&Math.abs(box.top-header.bottom)<1;
  })).toBe(true);
  const legend=page.getByRole('list',{name:'Категории происхождения данных',exact:true});
  const legendBox=(await legend.boundingBox())!,collapseBox=(await collapse.boundingBox())!;
  expect(collapseBox.x-legendBox.x-legendBox.width).toBeCloseTo(24);
  expect(collapseBox.height).toBe(32);
  await collapse.press('Enter');
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===null)).toBe(true);
  await expect(page.getByRole('button',{name:'Граф на полный экран',exact:true})).toBeFocused();
  await expect(collapse).toHaveCount(0);
  await expect(canvas).toHaveCSS('border-radius','0px');
  await page.getByRole('button',{name:'Граф на полный экран',exact:true}).click();
  await expect(collapse).toBeVisible();
  await page.getByRole('button',{name:'Выйти из полного экрана',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===null)).toBe(true);
  await expect(page.getByRole('button',{name:'Граф на полный экран',exact:true})).toBeFocused();
  expect(errors).toEqual([]);
});

test('source and lineage demonstration does not leak to another report',async({page})=>{
  await page.goto('/preview/navigation?section=reports&report=demo-report-motivation&reportTab=sources');
  const graph = page.locator('[data-lineage]');
  await expect(graph.locator('[data-lineage-node]')).toHaveCount(2);
  await expect(graph.locator('[data-lineage-node="demo.hr.team_targets"]')).toBeVisible();
  await expect(graph.locator('[data-lineage-node="requests"]')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Источники данных 2', exact: true })).toBeVisible();
});


async function expectAttachedEdges(page: import('@playwright/test').Page) {
  await expect.poll(() => page.locator('[data-lineage-scene]').evaluate(scene => {
    const parent = scene.querySelector('[data-report-port]')!.getBoundingClientRect();
    const report = scene.querySelector('[data-lineage-report]')!.getBoundingClientRect();
    if (Math.abs(parent.x + parent.width / 2 - report.x - report.width / 2) > 1 || Math.abs(parent.y + parent.height / 2 - report.bottom) > 1) return false;
    return [...scene.querySelectorAll<SVGPathElement>('[data-lineage-edge]')].every(path => {
      const id = path.dataset.lineageEdge;
      const source = scene.querySelector('[data-lineage-node="' + id + '"]')!.getBoundingClientRect();
      const port = scene.querySelector('[data-source-port="' + id + '"]')!.getBoundingClientRect();
      const start = path.getPointAtLength(0), end = path.getPointAtLength(path.getTotalLength()), matrix = path.getScreenCTM()!;
      const a = new DOMPoint(start.x, start.y).matrixTransform(matrix), b = new DOMPoint(end.x, end.y).matrixTransform(matrix);
      return Math.abs(a.x - port.x - port.width / 2) < 1 && Math.abs(a.y - port.y - port.height / 2) < 1
        && Math.abs(b.x - parent.x - parent.width / 2) < 1 && Math.abs(b.y - parent.y - parent.height / 2) < 1
        && Math.abs(source.x + source.width / 2 - a.x) < 1 && Math.abs(source.y - a.y) < 1;
    });
  })).toBe(true);
}

test('lineage tool modes drag individual nodes with attached curves and restore the default layout', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(entry);
  const canvas = page.getByRole('group',{name:'Граф происхождения данных',exact:true});
  const scene = page.locator('[data-lineage-scene]');
  const parent = page.locator('[data-lineage-report]');
  const child = page.locator('[data-lineage-node="requests"]');
  const panMode = page.getByRole('button',{name:'Перемещаться по холсту',exact:true});
  const nodesMode = page.getByRole('button',{name:'Перетаскивать блоки',exact:true});
  await expect(panMode).toHaveAttribute('aria-pressed','true');
  const initialEdges = await page.locator('[data-lineage-edge]').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')));
  await nodesMode.click();
  await expect(nodesMode).toHaveAttribute('aria-pressed','true');
  await expect(panMode).toHaveAttribute('aria-pressed','false');
  await page.getByRole('button',{name:'Увеличить граф',exact:true}).click();
  await expect(nodesMode).toHaveAttribute('aria-pressed','true');
  const transform = await scene.getAttribute('style');
  for (const node of [child,parent]) {
    await node.evaluate(element => {
      element.addEventListener('transitionend', event => {
        if (event instanceof TransitionEvent && event.propertyName === 'box-shadow') {
          element.dataset.shadowDuration = String(Math.round(event.elapsedTime * 1000));
        }
      });
    });
    const before=(await node.boundingBox())!;
    await page.mouse.move(before.x+before.width/2,before.y+before.height/2);await page.mouse.down();
    await expect(node).toHaveCSS('cursor','grabbing');
    await page.mouse.move(before.x+before.width/2+48,before.y+before.height/2+24,{steps:5});
    const during=(await node.boundingBox())!;
    expect(during.x-before.x).toBeCloseTo(48,0);expect(during.y-before.y).toBeCloseTo(24,0);
    await expectAttachedEdges(page);
    expect(await scene.getAttribute('style')).toBe(transform);
    await expect(node).toHaveAttribute('data-shadow-duration','160');
    await expect(node).toHaveCSS('box-shadow','rgba(16, 29, 59, 0.2) 0px 5px 10px 0px');
    await page.mouse.up();
    await expect(node).toHaveCSS('cursor','grab');
    await expect(node).toHaveAttribute('data-shadow-duration','120');
    await expect(node).toHaveCSS('box-shadow','none');
  }
  await child.focus();await child.press('ArrowRight');await expectAttachedEdges(page);
  // Empty canvas cannot pan while the node tool is selected.
  const box=(await canvas.boundingBox())!;
  await page.mouse.move(box.x+40,box.y+25);await page.mouse.down();await page.mouse.move(box.x+80,box.y+45);await page.mouse.up();
  expect(await scene.getAttribute('style')).toBe(transform);
  await panMode.click();
  const childPosition=await child.getAttribute('style');
  await page.mouse.move(box.x+40,box.y+25);await page.mouse.down();await page.mouse.move(box.x+80,box.y+45);await page.mouse.up();
  expect(await scene.getAttribute('style')).not.toBe(transform);
  expect(await child.getAttribute('style')).toBe(childPosition);
  await expectAttachedEdges(page);
  await page.getByRole('button',{name:'Группировка по умолчанию',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-zoom','1.00');
  await expect(child).toHaveCSS('left','24px');await expect(child).toHaveCSS('top','220px');
  await expect(parent).toHaveCSS('left','325px');await expect(parent).toHaveCSS('top','88px');
  expect(await page.locator('[data-lineage-edge]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('d')))).toEqual(initialEdges);
  await expectAttachedEdges(page);
});

test('lineage tools work in fullscreen and default zoom includes displaced nodes without resetting their positions', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});await page.goto(entry);
  const nodesMode=page.getByRole('button',{name:'Перетаскивать блоки',exact:true});
  await nodesMode.click();
  const parent=page.locator('[data-lineage-report]');
  await parent.focus();for(let i=0;i<14;i++)await parent.press('Shift+ArrowLeft');
  const position=await parent.getAttribute('style');
  await page.getByRole('button',{name:'Масштаб по умолчанию',exact:true}).click();
  expect(await parent.getAttribute('style')).toBe(position);
  const canvas=page.getByRole('group',{name:'Граф происхождения данных',exact:true});
  const bounds=(await canvas.boundingBox())!;
  for(const node of await page.locator('[data-lineage-node],[data-lineage-report]').all()){
    const b=(await node.boundingBox())!;expect(b.x).toBeGreaterThanOrEqual(bounds.x);expect(b.y).toBeGreaterThanOrEqual(bounds.y);
    expect(b.x+b.width).toBeLessThanOrEqual(bounds.x+bounds.width+1);expect(b.y+b.height).toBeLessThanOrEqual(bounds.y+bounds.height+1);
  }
  await page.getByRole('button',{name:'Граф на полный экран',exact:true}).click();
  await expect(page.getByRole('button',{name:'Свернуть',exact:true})).toBeVisible();
  await expect(nodesMode).toHaveAttribute('aria-pressed','true');
  const child=page.locator('[data-lineage-node="events"]'),before=(await child.boundingBox())!;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.move(before.x+60,before.y+40);await page.mouse.down();await page.mouse.move(before.x+90,before.y+65,{steps:3});
  await expect(child).toHaveCSS('transition-duration','0s');
  await expect(child).toHaveCSS('box-shadow','rgba(16, 29, 59, 0.2) 0px 5px 10px 0px');
  await expectAttachedEdges(page);await page.mouse.up();
  await expect(child).toHaveCSS('box-shadow','none');
  for(const name of ['Увеличить граф','Уменьшить граф','Масштаб по умолчанию','Группировка по умолчанию','Выйти из полного экрана'])
    expect(await page.getByRole('button',{name,exact:true}).getAttribute('aria-pressed')).toBeNull();
  await page.getByRole('button',{name:'Группировка по умолчанию',exact:true}).click();
  await expectAttachedEdges(page);
  await page.getByRole('button',{name:'Свернуть',exact:true}).click();
  await expect(nodesMode).toHaveAttribute('aria-pressed','true');
  await expectAttachedEdges(page);
});
