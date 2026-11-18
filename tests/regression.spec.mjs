import { test, expect } from '@playwright/test';

test('Calendar weeks run Sunday to Saturday', async ({ page }) => {
  await page.goto('./#/calendar?view=month');
  for (let month = 0; month < 4; month++) {
    await expect(page.locator('#month-head span')).toHaveText(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    const cells = page.locator('#month-grid > .cell');
    const dates = await cells.evaluateAll(nodes => nodes.map(n => n.dataset.date));
    expect(dates.length % 7).toBe(0);
    const weekday = date => new Date(date + 'T12:00:00Z').getUTCDay();
    expect(weekday(dates[0])).toBe(0);
    expect(weekday(dates.at(-1))).toBe(6);
    const outside = page.locator('#month-grid > .cell.out');
    for (let i = 0; i < await outside.count(); i++) {
      await expect(outside.nth(i)).toHaveAttribute('aria-hidden', 'true');
      await expect(outside.nth(i).locator('a, button')).toHaveCount(0);
    }
    if (month < 3) {
      const title = await page.locator('#month-title').textContent();
      await page.locator('#month-next').click();
      await expect(page.locator('#month-title')).not.toHaveText(title);
    }
  }
});

test('Atmosphere is static and big panels avoid backdrop blur', async ({ page }) => {
  await page.goto('./');
  const styles = await page.locator('.atmo, .atmo i, .glass, .site-head').evaluateAll(nodes => nodes.map(n => {
    const s = getComputedStyle(n);
    return { animation: s.animationName, filter: s.filter, backdrop: s.backdropFilter };
  }));
  expect(styles.length).toBeGreaterThan(2);
  for (const s of styles) {
    expect(s.animation).toBe('none');
    expect(s.filter).toBe('none');
    expect(s.backdrop).toBe('none');
  }
  await page.locator('#pause-motion').click();
  await expect(page.locator('#pause-motion')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#pause-motion').click();
  await expect(page.locator('#pause-motion')).toHaveAttribute('aria-pressed', 'false');
});

test('Staff scrolling pauses hover lifts without blocking clicks', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Desktop hover only');
  await page.goto('./#/staff?show=all');
  const root = page.locator('html');
  const app = page.locator('#app');
  await page.mouse.move(640, 700);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => app.evaluate(el => ({
    scrolling: document.documentElement.classList.contains('scrolling'),
    pointerEvents: getComputedStyle(el).pointerEvents,
  })), { intervals: [25] }).toEqual({ scrolling: true, pointerEvents: 'auto' });
  await expect(root).not.toHaveClass(/\bscrolling\b/, { timeout: 1000 });
  const card = page.locator('.qcard').first();
  await card.scrollIntoViewIfNeeded();
  await expect(root).not.toHaveClass(/\bscrolling\b/, { timeout: 1000 });
  await page.mouse.move(0, 0);
  const shadow = await card.evaluate(el => getComputedStyle(el).boxShadow);
  await card.hover();
  await expect(card).not.toHaveCSS('transform', 'none');
  await expect(card).toHaveCSS('box-shadow', shadow);
  await root.evaluate(el => el.classList.add('scrolling'));
  await expect(card).toHaveCSS('transform', 'none');
  await expect.poll(() => card.evaluate(el => el.matches(':hover'))).toBe(true);
  await expect(card).toHaveCSS('box-shadow', shadow);
});

test('Chromium keeps staff queue card shadows', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Desktop Chromium only');
  await page.goto('./#/staff?show=all');
  const card = page.locator('.qcard').first();
  await expect(card).toBeVisible();
  expect(await page.evaluate(() => [
    CSS.supports('(-moz-appearance: none)'),
    CSS.supports('selector(::-moz-range-thumb)'),
  ])).toEqual([false, false]);
  await expect(card).not.toHaveCSS('box-shadow', 'none');
});
