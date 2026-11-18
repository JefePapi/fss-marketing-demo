import { test, expect } from '@playwright/test';

for (const route of ['./?theme=current#/staff?show=all', './?theme=current#/', './?theme=current#/calendar', './?theme=current#/activities/bowling']) {
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
  await page.goto('./?theme=current#/calendar');
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
  await page.goto('./?theme=current#/request');
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

for (const theme of ['a', 'a-light', 'b', 'c']) {
  test(`Firefox renders Home, queue and area hours in ${theme}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const [route, selector] of [
      ['/', '[data-test=theme-picker]'],
      ['/staff', '[data-test=queue-card]'],
      ['/activities/bowling', '[data-test=area] .area-hours'],
    ]) {
      await page.goto('./?theme=' + theme + '#' + route);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.locator(selector).first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}

for (const theme of ['current', 'a', 'a-light', 'b', 'c']) {
  test(`Queue toolbar, filters and chips fit in ${theme}`, async ({ page }) => {
    await page.goto('./?theme=' + theme + '#/staff');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('.queue-tools a')).toHaveText(['Email log', 'Notifications', 'Reports', /^Feedback\d+$/]);
    await expect(page.locator('#export-requests')).toBeVisible();
    for (const width of [1024, 1280, 900, 1920, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      const layout = await page.evaluate(() => {
        const rect = el => el.getBoundingClientRect();
        const toolbar = document.querySelector('.queue-tools');
        const tools = ['go-emails', 'go-notices', 'go-reports', 'go-feedback', 'export-requests'].map(id => rect(document.getElementById(id)));
        const parent = rect(toolbar);
        const csv = tools.at(-1);
        const fields = ['queue-status', 'queue-priority', 'queue-search'].map(id => rect(document.getElementById(id)));
        const tabs = [...document.querySelectorAll('.queue-tabs, .queue-tabs .tabs')];
        const chipsFit = group => [...group.children].every((chip, i, chips) => {
          const a = rect(chip);
          const bounds = rect(group);
          if (a.left < bounds.left - 1 || a.right > bounds.right + 1) return false;
          return chips.slice(i + 1).every(next => {
            const b = rect(next);
            return Math.max(b.left - a.right, b.top - a.bottom) >= 5.9;
          });
        });
        return {
          gaps: tools.slice(1).map((box, i) => box.left - tools[i].right),
          centers: tools.map(box => box.top + box.height / 2),
          csvFits: csv.left >= Math.max(0, parent.left) - 0.1 && csv.top >= Math.max(0, parent.top) - 0.1
            && csv.right <= Math.min(innerWidth, parent.right) + 0.1 && csv.bottom <= Math.min(innerHeight, parent.bottom) + 0.1,
          tabOverflow: Math.max(...tabs.map(el => el.scrollWidth - el.clientWidth)),
          labelTops: [...document.querySelectorAll('.queue-fields label')].map(label => rect(label).top),
          fieldTops: fields.map(box => box.top),
          chipsFit: [...document.querySelectorAll('.qstatus, .qlanes')].every(chipsFit),
        };
      });
      const at = theme + ' at ' + width + 'px';
      expect(layout.csvFits, at).toBe(true);
      expect(layout.tabOverflow, at).toBeLessThanOrEqual(1);
      expect(layout.chipsFit, at).toBe(true);
      if (width >= 900) {
        expect(Math.min(...layout.gaps), at).toBeGreaterThanOrEqual(8);
        expect(Math.max(...layout.centers) - Math.min(...layout.centers), at).toBeLessThanOrEqual(1);
        expect(Math.max(...layout.labelTops) - Math.min(...layout.labelTops), at).toBeLessThanOrEqual(4);
        expect(Math.max(...layout.fieldTops) - Math.min(...layout.fieldTops), at).toBeLessThanOrEqual(4);
      } else {
        expect(layout.fieldTops[1], at).toBeGreaterThan(layout.fieldTops[0]);
        expect(layout.fieldTops[2], at).toBeGreaterThan(layout.fieldTops[1]);
      }
    }
  });
}
