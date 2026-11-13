import { expect, test } from '@playwright/test';

const report='/preview/navigation?section=reports&report=demo-report-summary&reportTab=';

test('accordion expands and collapses through intermediate heights without exposing closed controls',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(report+'sources');
  const button=page.getByRole('button',{name:/^demo.requests/});
  const body=page.locator(`[id="${await button.getAttribute('aria-controls')}"]`);
  const reveal=body.locator('..').locator('..');
  const openHeight=(await reveal.boundingBox())!.height;
  await button.click();
  await expect(reveal).toHaveAttribute('inert','');
  const closing=await reveal.evaluate(el=>new Promise<number[]>(resolve=>{
    const heights:number[]=[];const start=performance.now();
    function frame(){heights.push(el.getBoundingClientRect().height);if(performance.now()-start<400)requestAnimationFrame(frame);else resolve(heights);}
    requestAnimationFrame(frame);
  }));
  expect(closing.some(h=>h>1&&h<openHeight-1)).toBe(true);
  expect(closing.at(-1)).toBe(0);
  await expect(body).not.toBeVisible();
  await button.press('Space');
  const opening=await reveal.evaluate(el=>new Promise<number[]>(resolve=>{
    const heights:number[]=[];const start=performance.now();
    function frame(){heights.push(el.getBoundingClientRect().height);if(performance.now()-start<400)requestAnimationFrame(frame);else resolve(heights);}
    requestAnimationFrame(frame);
  }));
  expect(opening.some(h=>h>1&&h<openHeight-1)).toBe(true);
  expect(opening.at(-1)).toBeCloseTo(openHeight,0);
  await expect(reveal).not.toHaveAttribute('inert');
  await button.press('Enter');await button.press('Enter');await button.press('Enter');
  await expect(button).toHaveAttribute('aria-expanded','false');
  await expect(body).not.toBeVisible();
});

test('shared consumers retain keyboard state and reduced motion settles immediately',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const tab of ['overview','slides','sources','usage']){
    await page.goto(report+tab);
    const button=page.locator('section[data-collapsible="true"] button[aria-expanded]').first();
    const body=page.locator(`[id="${await button.getAttribute('aria-controls')}"]`);
    if(await button.getAttribute('aria-expanded')==='false')await button.click();
    await expect(body).toBeVisible();
    await button.press('Space');await expect(body).not.toBeVisible();
    await expect(body.locator('..').locator('..')).toHaveCSS('transition-duration','0s');
    await button.press('Enter');await expect(body).toBeVisible();
  }
  await page.goto('/preview/navigation?section=metrics&metric=4');
  const metric=page.locator('[data-metric-detail-id] section[data-collapsible="true"] button[aria-expanded]').first();
  await expect(metric).toHaveAttribute('aria-expanded','true');
  await metric.press('Space');await expect(metric).toHaveAttribute('aria-expanded','false');
  await metric.press('Enter');await expect(metric).toHaveAttribute('aria-expanded','true');
});
