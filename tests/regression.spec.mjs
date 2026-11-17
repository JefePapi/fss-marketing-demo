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
