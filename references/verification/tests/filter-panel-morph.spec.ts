import { expect, test } from '@playwright/test';

for (const section of ['reports', 'home', 'sources']) {
  test(`${section}: filter panel morphs from the round opener and keeps its final layout`, async ({ page }) => {
    const viewport = { width: 1440, height: 900 };
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (...args: Parameters<Element['animate']>) {
        const animation = animate.apply(this, args);
        if (this.hasAttribute('data-filter-panel-morph')) animation.pause();
        return animation;
      };
    });
    await page.goto(`/preview/navigation?section=${section}`);
    const trigger = page.locator('main [data-control-action="filter"]');
    const opener = (await trigger.boundingBox())!;
    await trigger.click();
    const dialog = page.locator('[data-report-filter-panel]');
    const surface = page.locator('[data-filter-panel-morph]');
    const panel = (await dialog.boundingBox())!;
    const clip = (box: typeof opener, radius: number) =>
      `inset(${box.y}px ${viewport.width - box.x - box.width}px ${viewport.height - box.y - box.height}px ${box.x}px round ${radius}px)`;
    const motion = await surface.evaluate(element => {
      const animation = element.getAnimations()[0];
      const effect = animation.effect as KeyframeEffect;
      animation.currentTime = 150;
      return {
        clips: effect.getKeyframes().map(frame => frame.clipPath),
        duration: effect.getTiming().duration,
        midpoint: getComputedStyle(element).clipPath,
      };
    });
    const clips = [clip(opener, 20), clip(panel, 28)];
    expect(motion.clips).toEqual(clips);
    expect(motion.duration).toBe(300);
    expect(motion.midpoint).toMatch(/^inset\(/);
    expect(clips).not.toContain(motion.midpoint);
    await surface.evaluate(element => element.getAnimations()[0].finish());
    await expect(surface).toHaveCSS('clip-path', 'none');
    expect(await dialog.boundingBox()).toEqual(panel);
    const domain = dialog.locator('[data-panel-field="domain"]');
    await domain.click();
    await expect(page.getByRole('dialog', { name: 'Значения: Домен', exact: true })).toBeVisible();
  });
}

for (const { section, dismiss } of [
  { section: 'reports', dismiss: 'footer' },
  { section: 'home', dismiss: 'escape' },
  { section: 'sources', dismiss: 'backdrop' },
]) {
  test(`${section}: ${dismiss} morphs the filter panel back to its opener`, async ({ page }) => {
    await page.addInitScript(() => {
      const reverse = Animation.prototype.reverse;
      Animation.prototype.reverse = function () {
        reverse.call(this);
        if ((this.effect as KeyframeEffect).target?.hasAttribute('data-filter-panel-morph')) {
          void this.ready.then(() => this.pause());
        }
      };
    });
    await page.goto(`/preview/navigation?section=${section}`);
    const trigger = page.locator('main [data-control-action="filter"]');
    const opener = (await trigger.boundingBox())!;
    await trigger.click();
    const surface = page.locator('[data-filter-panel-morph]');
    const dialog = page.locator('[data-report-filter-panel]');
    await expect(surface).toHaveCSS('clip-path', 'none');

    if (dismiss === 'escape') await page.keyboard.press('Escape');
    else if (dismiss === 'footer') await dialog.getByRole('button', { name: 'Закрыть', exact: true }).click();
    else await page.locator('[data-panel-backdrop]').click({ position: { x: 10, y: 10 } });

    await expect(surface).toHaveAttribute('data-closing', 'true');
    await expect(dialog).toHaveAttribute('inert', '');
    const motion = await surface.evaluate(async element => {
      const animation = element.getAnimations()[0];
      await animation.ready;
      const bounds = element.getBoundingClientRect();
      animation.currentTime = 150;
      const midpoint = getComputedStyle(element).clipPath;
      animation.currentTime = 0;
      const end = getComputedStyle(element).clipPath;
      return { midpoint, end, width: bounds.width, height: bounds.height, rate: animation.playbackRate };
    });
    expect(motion.rate).toBe(-1.4);
    expect(motion.midpoint).toMatch(/^inset\(/);
    expect(motion.end).toBe(`inset(${opener.y}px ${motion.width - opener.x - opener.width}px ${motion.height - opener.y - opener.height}px ${opener.x}px round 20px)`);
    expect(motion.midpoint).not.toBe(motion.end);
    await surface.evaluate(element => element.getAnimations()[0].finish());
    await expect(surface).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}

test('reduced motion opens and closes the filter panel directly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/preview/navigation?section=reports');
  const trigger = page.getByRole('button', { name: 'Открыть фильтры отчётов', exact: true });
  await trigger.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Фильтры отчётов', exact: true });
  await expect(dialog).toBeVisible();
  await expect(page.locator('[data-filter-panel-morph]')).toHaveCSS('clip-path', 'none');
  await expect(dialog).toHaveCSS('opacity', '1');
  expect(await page.locator('[data-filter-panel-morph]').evaluate(element => element.getAnimations().length)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-filter-panel-morph]')).toHaveCount(0);
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
