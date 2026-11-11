import { expect, test } from '@playwright/test';

const entry='/preview/navigation?section=reports&report=demo-report-summary&reportTab=sources';

test('Paper source fixture, compact alternative block and trailing actions stay consistent', async({page})=>{
  await page.goto(entry);
  await expect(page.getByRole('tab',{name:'Источники данных 5',exact:true})).toHaveAttribute('aria-selected','true');
  const sources=page.locator('[data-report-sources]');
  const names=['demo.requests','demo.events','demo.teams','demo.services','demo.locations'];
  await expect(sources.locator(':scope>section strong')).toHaveText(names);
  await expect(page.locator('[data-lineage-node]')).toHaveCount(5);
  expect(await page.locator('[data-lineage-node]').evaluateAll(nodes =>
    new Set(nodes.map(node => node.getBoundingClientRect().top)).size
  )).toBe(1);
  await expect(page.locator('[data-category="datahub"]')).toHaveCount(3);
  await expect(page.locator('[data-category="catalog"]')).toHaveCount(2);
  await expect(page.locator('[data-lineage-report]')).toHaveText('Сводный отчёт Гостеприимства');
  await expect(page.locator('[data-lineage-node] [data-overflow-text]')).toHaveText([
    'demo.requests','SQL Server','demo.events','PostgreSQL','demo.teams','SQL Server',
    'demo.services','SQL Server','demo.locations','PostgreSQL',
  ]);
  const legend=page.getByRole('list',{name:'Категории происхождения данных'});
  await expect(legend.locator('li')).toHaveText(['Отчёт','Источник DataHub','Источник (каталог)','Reports','CDM','Clean','BClean']);
  const alternative=page.getByRole('region',{name:'Альтернативные источники',exact:true});
  expect((await alternative.boundingBox())!.height).toBeLessThan(100);
  await expect(alternative.getByRole('button')).toHaveCount(0);
  const link=sources.getByRole('button',{name:'Карточка источника demo.requests',exact:true});
  const tag=link.locator('..').getByText('SQL Server',{exact:true});
  expect((await link.boundingBox())!.x).toBeGreaterThan((await tag.boundingBox())!.x);
  expect((await link.boundingBox())!.height).toBeLessThanOrEqual((await tag.boundingBox())!.height);
  await expect(link.locator('svg,img,button')).toHaveCount(0);
  await expect(sources.getByRole('button',{name:/^demo.requests/})).toHaveAttribute('aria-expanded','true');
  await sources.getByRole('button',{name:/^demo.events/}).click();
  await expect(sources.locator('section').nth(1).locator('dd')).toHaveText([
    'PostgreSQL', 'demo_catalog', 'demo', 'TEST', 'Активен', '18',
    'urn:li:dataset:(urn:li:dataPlatform:postgres,demo_catalog.demo.events,TEST)',
  ]);
});

test('lineage zoom, pointer and keyboard pan, ports and native fullscreen work', async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:900});
  await page.goto(entry);
  const canvas=page.getByRole('group',{name:'Граф происхождения данных',exact:true});
  const scene=page.locator('[data-lineage-scene]');
  const grid=canvas.locator('[data-lineage-grid]');
  const gridControl=canvas.getByRole('radiogroup',{name:'Фон холста'});
  const withGrid=gridControl.getByRole('radio',{name:'С сеткой',exact:true});
  const withoutGrid=gridControl.getByRole('radio',{name:'Без сетки',exact:true});
  await expect(withGrid).toBeChecked();
  await expect(grid).toBeVisible();
  await expect(grid).toHaveCSS('background-image',/linear-gradient.*linear-gradient/);
  await expect(gridControl).toHaveCSS('width','32px');
  const disclosure=page.getByRole('button',{name:/^Происхождение данных/});
  const sourceHeader=page.locator('[data-report-sources] button[aria-expanded]').first();
  const headerMetrics=(button:HTMLElement)=>{
    const styles=getComputedStyle(button), icon=getComputedStyle(button.firstElementChild!);
    const title=getComputedStyle(button.querySelector('strong')!), description=getComputedStyle(button.querySelector('small')!);
    return [styles.padding,styles.gap,icon.width,icon.height,icon.backgroundColor,title.lineHeight,description.lineHeight];
  };
  expect(await disclosure.evaluate(headerMetrics)).toEqual(await sourceHeader.evaluate(headerMetrics));
  await expect(disclosure).toHaveAttribute('aria-expanded','true');
  await disclosure.press('Enter');
  await expect(disclosure).toHaveAttribute('aria-expanded','false');
  await expect(canvas).toBeHidden();
  await disclosure.press('Space');
  await expect(disclosure).toHaveAttribute('aria-expanded','true');
  await expect(canvas).toHaveCSS('height','650px');
  await expect(scene.locator('[data-lineage-node]').first()).toHaveCSS('width','230px');
  await expect(scene.locator('[data-lineage-node]').first()).toHaveCSS('height','52px');
  await expect(scene.locator('[data-lineage-report]')).toHaveCSS('width','230px');
  await expect(scene.locator('[data-lineage-report]')).toHaveCSS('height','52px');
  const expectLegendPosition=async()=>await expect.poll(()=>canvas.evaluate(node=>{
    const frame=node.getBoundingClientRect();
    const legend=node.querySelector('[data-lineage-legend]')!.getBoundingClientRect();
    const controls=node.querySelector('button[aria-label="Увеличить граф"]')!.getBoundingClientRect();
    return Math.abs(legend.x-frame.x-16)<1&&Math.abs(legend.y-frame.y-16)<1&&legend.right<=controls.left-12;
  })).toBe(true);
  await expectLegendPosition();
  await expect(canvas).toHaveCSS('background-color','rgb(230, 236, 245)');
  await expect(canvas).toHaveCSS('border-radius','0px');
  await expect.poll(()=>canvas.evaluate(node=>{
    const frame=node.closest('[data-collapsible]')!;
    const bounds=frame.getBoundingClientRect();
    const body=node.closest('[data-accordion-body]')!;
    const view=node.getBoundingClientRect();
    return {
      top:view.top-body.getBoundingClientRect().top-body.clientTop,
      left:view.left-bounds.left-frame.clientLeft,
      right:bounds.right-frame.clientLeft-view.right,
      footer:bounds.bottom-frame.clientTop-view.bottom,
    };
  })).toEqual({top:0,left:4,right:4,footer:20});
  const gridSpacing=()=>grid.evaluate(node=>parseFloat(getComputedStyle(node).backgroundSize));
  const initialSpacing=await gridSpacing();
  await page.getByRole('button',{name:'Увеличить граф',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-zoom','1.20');
  expect(await gridSpacing()).toBeGreaterThan(initialSpacing);
  const gridOrigin=await grid.evaluate(node=>getComputedStyle(node).backgroundPosition);
  const transform=await scene.evaluate(e=>getComputedStyle(e).transform);
  await canvas.focus();await canvas.press('ArrowRight');
  expect(await scene.evaluate(e=>getComputedStyle(e).transform)).not.toBe(transform);
  expect(await grid.evaluate(e=>getComputedStyle(e).backgroundPosition)).not.toBe(gridOrigin);
  await canvas.press('Home');await expect(canvas).toHaveAttribute('data-zoom','1.00');
  const box=(await canvas.boundingBox())!;
  await page.mouse.move(box.x+60,box.y+50);await page.mouse.down();await page.mouse.move(box.x+105,box.y+80);await page.mouse.up();
  expect(await scene.evaluate(e=>getComputedStyle(e).transform)).not.toBe(transform);
  await page.getByRole('button',{name:'Уменьшить граф',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-zoom','0.80');
  for(const [width,height] of [[1280,900],[1440,900],[1920,1080],[1024,768],[1440,700]]){
    await page.setViewportSize({width,height});
    await expect.poll(async()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expectLegendPosition();
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
  await fullscreen.scrollIntoViewIfNeeded();
  await page.mouse.move(0,0);
  await fullscreen.hover();
  await expect(page.getByRole('tooltip')).toHaveText('Граф на полный экран');
  await fullscreen.click();
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.hasAttribute('data-lineage-fullscreen'))).toBe(true);
  const exit=canvas.getByRole('button',{name:'Выйти из полного экрана',exact:true});
  await expect(exit).toBeFocused();
  const toolbar=canvas.getByRole('group',{name:'Управление графом',exact:true});
  await expect(toolbar.getByRole('button')).toHaveCount(7);
  await expect(toolbar.locator(':scope > span[aria-hidden=true]')).toHaveCount(3);
  await expect(toolbar.getByRole('button').last()).toHaveAccessibleName('Выйти из полного экрана');
  await expect(toolbar.locator('[title]')).toHaveCount(0);
  await expect(disclosure).toBeHidden();
  await expect(page.getByRole('button',{name:'Свернуть',exact:true})).toHaveCount(0);
  await expect(canvas).toHaveCSS('background-color','rgb(230, 236, 245)');
  await expect(canvas).toHaveCSS('border-radius','0px');
  await expect.poll(()=>canvas.evaluate(node=>{
    const box=node.getBoundingClientRect();
    return Math.abs(box.left)<1&&Math.abs(box.right-innerWidth)<1&&Math.abs(box.bottom-innerHeight)<1&&Math.abs(box.top)<1;
  })).toBe(true);
  await expectLegendPosition();
  await exit.hover();
  const tooltip=page.locator('[data-lineage-fullscreen]').getByRole('tooltip');
  await expect(tooltip).toHaveText('Выйти из полного экрана');
  for(const name of ['Увеличить граф','Уменьшить граф']){
    await toolbar.getByRole('button',{name,exact:true}).hover();
    await expect(tooltip).toHaveText(name);
  }
  await withGrid.hover();
  await expect(tooltip).toHaveText('С сеткой');
  await withoutGrid.hover();
  await expect(tooltip).toHaveText('Без сетки');
  await withGrid.focus();
  await withGrid.press('ArrowDown');
  await expect(withoutGrid).toBeChecked();
  await expect(grid).toHaveCount(0);
  await exit.press('Enter');
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===null)).toBe(true);
  await expect(page.getByRole('button',{name:'Граф на полный экран',exact:true})).toBeFocused();
  await expect(toolbar.getByRole('button')).toHaveCount(7);
  await expect(toolbar.locator(':scope > span[aria-hidden=true]')).toHaveCount(3);
  await expect(withoutGrid).toBeChecked();
  await expect(grid).toHaveCount(0);
  await withGrid.check();
  await expect(grid).toBeVisible();
  await expect(exit).toHaveCount(0);
  await expect(disclosure).toBeVisible();
  await expect(canvas).toHaveCSS('border-radius','0px');
  await page.getByRole('button',{name:'Граф на полный экран',exact:true}).click();
  await expect(exit).toBeFocused();
  await page.evaluate(()=>document.exitFullscreen());
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

test('fullscreen lineage morphs between inline and screen geometry and recovers from stalled exit motion',async({page})=>{
  await page.addInitScript(()=>{
    const animate=Element.prototype.animate;
    Element.prototype.animate=function(...args:Parameters<Element['animate']>){
      const animation=animate.apply(this,args);
      if(this.hasAttribute('data-zoom'))animation.pause();
      return animation;
    };
  });
  await page.setViewportSize({width:1440,height:900});
  await page.goto(entry);
  const canvas=page.getByRole('group',{name:'Граф происхождения данных',exact:true});
  await canvas.getByRole('button',{name:'Граф на полный экран',exact:true}).click();
  const exit=canvas.getByRole('button',{name:'Выйти из полного экрана',exact:true});
  await expect(exit).toBeFocused();
  const motion=await canvas.evaluate(element=>{
    const animation=element.getAnimations()[0];
    const duration=Number(animation.effect!.getTiming().duration);
    animation.currentTime=0;
    const inline=element.getBoundingClientRect();
    animation.currentTime=duration/2;
    const midpoint=element.getBoundingClientRect();
    animation.finish();
    return {duration,startWidth:inline.width,midWidth:midpoint.width,fullWidth:innerWidth};
  });
  expect(motion.duration).toBeGreaterThan(150);
  expect(motion.duration).toBeLessThan(350);
  expect(motion.midWidth).toBeGreaterThan(motion.startWidth);
  expect(motion.midWidth).toBeLessThan(motion.fullWidth);
  await exit.press('Enter');
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement)).toBeNull();
  await expect(canvas.getByRole('button',{name:'Граф на полный экран',exact:true})).toBeFocused();
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
  const [initialChild,initialParent]=await Promise.all([child.getAttribute('style'),parent.getAttribute('style')]);
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
  await page.mouse.move(box.x+40,box.y+64);await page.mouse.down();await page.mouse.move(box.x+80,box.y+84);await page.mouse.up();
  expect(await scene.getAttribute('style')).toBe(transform);
  await panMode.click();
  const childPosition=await child.getAttribute('style');
  await page.mouse.move(box.x+40,box.y+25);await page.mouse.down();await page.mouse.move(box.x+80,box.y+45);await page.mouse.up();
  expect(await scene.getAttribute('style')).toBe(transform);
  await page.mouse.move(box.x+40,box.y+64);await page.mouse.down();await page.mouse.move(box.x+80,box.y+84);await page.mouse.up();
  expect(await scene.getAttribute('style')).not.toBe(transform);
  expect(await child.getAttribute('style')).toBe(childPosition);
  await expectAttachedEdges(page);
  await page.getByRole('button',{name:'Группировка по умолчанию',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-zoom','1.00');
  await expect(child).toHaveAttribute('style',initialChild!);
  await expect(parent).toHaveAttribute('style',initialParent!);
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
  const exit=page.getByRole('button',{name:'Выйти из полного экрана',exact:true});
  await expect(exit).toBeVisible();
  await expect(canvas).toHaveCSS('transform','none');
  await expect(nodesMode).toHaveAttribute('aria-pressed','true');
  const child=page.locator('[data-lineage-node="events"]'),before=(await child.boundingBox())!;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.move(before.x+60,before.y+40);await page.mouse.down();await page.mouse.move(before.x+90,before.y+65,{steps:3});
  await expect(child).toHaveCSS('transition-duration','0s');
  await expect(child).toHaveCSS('box-shadow','rgba(16, 29, 59, 0.2) 0px 5px 10px 0px');
  await expectAttachedEdges(page);await page.mouse.up();
  await expect(child).toHaveCSS('box-shadow','none');
  for(const name of ['Увеличить граф','Уменьшить граф','Масштаб по умолчанию','Группировка по умолчанию'])
    expect(await page.getByRole('button',{name,exact:true}).getAttribute('aria-pressed')).toBeNull();
  await page.getByRole('button',{name:'Группировка по умолчанию',exact:true}).click();
  await expectAttachedEdges(page);
  await exit.click();
  await expect(nodesMode).toHaveAttribute('aria-pressed','true');
  await expectAttachedEdges(page);
});
