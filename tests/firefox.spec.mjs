import { test, expect } from '@playwright/test';

for (const route of ['./#/staff?show=all', './#/', './#/calendar', './#/activities/bowling']) {
  test(`Firefox skips shadow and rear lens painting on ${route}`, async ({ page }) => {
    await page.goto(route);
    const lens = page.locator('.glass.lens');
    await expect(lens.first()).toBeVisible();
    expect(await lens.evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node, '::before');
      return [style.display, style.clipPath];
    }))).toEqual(Array.from({ length: await lens.count() }, () => ['none', 'none']));

    const shadows = await page.locator('*').evaluateAll(nodes => nodes.flatMap(node =>
      [null, '::before', '::after'].flatMap(pseudo => {
        const shadow = getComputedStyle(node, pseudo).boxShadow;
        return shadow === 'none' ? [] : [{ element: node.tagName, id: node.id, pseudo, shadow }];
      })));
    expect(shadows).toEqual([]);
  });
}

test('Firefox shows navigation and selected calendar day markers', async ({ page }) => {
  await page.goto('./#/calendar');
  const current = page.locator('#nav a[aria-current]');
  await expect(current).toBeVisible();
  expect(await current.evaluate(node => {
    const style = getComputedStyle(node);
    return parseFloat(style.borderBottomWidth) >= 2 || style.backgroundImage !== 'none';
  })).toBe(true);
  await page.locator('.cell:not(.out):not(.today) .daybtn').first().click();
  const selected = page.locator('.cell.sel');
  await expect(selected).toBeVisible();
  await expect(selected).toHaveCSS('outline-style', 'solid');
  await expect(selected).toHaveCSS('outline-width', '2px');
});

test('Firefox shows text input focus and a selected request choice', async ({ page }) => {
  await page.goto('./#/request');
  const name = page.locator('#f-name');
  await name.focus();
  await expect(name).toBeFocused();
  await expect(name).not.toHaveCSS('outline-style', 'none');
  await page.locator('#fill-sample').click();
  await page.locator('#btn-next').click();
  await page.locator('#btn-next').click();
  await page.locator('#svc-calonly').check();
  const selected = page.locator('.choicebox.on').filter({ has: page.locator('#svc-calonly') });
  await expect(selected).toBeVisible();
  await expect(selected).toHaveCSS('outline-style', 'solid');
  await expect(selected).toHaveCSS('outline-width', '2px');
});
