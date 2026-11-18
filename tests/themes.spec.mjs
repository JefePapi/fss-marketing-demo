import { test, expect } from '@playwright/test';

const ids = ['a', 'a-light', 'b', 'c', 'current'];
const key = 'mktdemo.theme';
const saved = page => page.evaluate(key => localStorage.getItem(key), key);
const option = (page, id) => page.locator(`[data-test=theme-option][data-theme="${id}"]`);
const selected = (page, id) => expect(page.locator('html')).toHaveAttribute('data-theme', id);

test.describe('Theme resolution', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('A fresh visitor sees Night Wall', async ({ page }) => {
    await page.goto('./');
    await selected(page, 'a');
    await expect(option(page, 'a')).toHaveAttribute('aria-pressed', 'true');
  });

  test('A URL choice persists on a later visit without a parameter', async ({ page }) => {
    await page.goto('./?theme=b#/request');
    await selected(page, 'b');
    expect(await saved(page)).toBe('b');
    await page.goto('./#/activities');
    await selected(page, 'b');
    await expect(page.locator('#theme-select')).toHaveValue('b');
  });

  test('An invalid parameter falls through to the default or saved design', async ({ page }) => {
    await page.goto('./?theme=unknown');
    await selected(page, 'a');
    await page.goto('./?theme=c');
    await selected(page, 'c');
    await page.goto('./?theme=constructor');
    await selected(page, 'c');
    expect(await saved(page)).toBe('c');
  });
});

test('Home picker switches by keyboard without a reload and keeps the address shareable', async ({ page }) => {
  await page.goto('./?demo=1&theme=a#/');
  await expect(page.locator('[data-test=theme-picker] [data-test=theme-option]')).toHaveCount(5);
  await page.evaluate(() => { window.themeSwitchMarker = 'same document'; });
  const card = option(page, 'a-light');
  await card.focus();
  await card.press('Enter');
  await selected(page, 'a-light');
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  expect(await card.evaluate(button => button.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => window.themeSwitchMarker)).toBe('same document');
  expect(await saved(page)).toBe('a-light');
  const url = new URL(page.url());
  expect(url.searchParams.get('theme')).toBe('a-light');
  expect(url.searchParams.get('demo')).toBe('1');
  expect(url.hash).toBe('#/');
  await expect(page.locator('#theme-select')).toHaveValue('a-light');
});

test('The Pages fallback keeps a shared design and read-only route', async ({ page }) => {
  await page.goto('./404.html?theme=mission#/calendar?readonly=1');
  await selected(page, 'b');
  await expect(page.locator('#readonly-tag')).toBeVisible();
  await expect(page.locator('#theme-select')).toHaveValue('b');
  expect(new URL(page.url()).pathname).not.toMatch(/404\.html$/);
});

test('Banner changes design on the queue and on a read-only calendar', async ({ page }) => {
  for (const [route, from, to] of [
    ['#/staff?show=all', 'a-light', 'b'],
    ['#/calendar?readonly=1&view=month', 'current', 'c'],
  ]) {
    await page.goto('./?theme=' + from + route);
    const control = page.locator('#demo-banner select#theme-select[data-test=theme-select]');
    await expect(control).toBeVisible();
    await expect(control).toHaveAccessibleName(/Design/i);
    await control.selectOption(to);
    await selected(page, to);
    expect(new URL(page.url()).hash).toBe(route);
    await expect(control).toHaveValue(to);
    await expect(page.locator('#site-footer')).toBeVisible();
    if (route.includes('readonly')) {
      await expect(page.locator('html')).toHaveClass(/readonly/);
      await expect(page.locator('#staff-toggle')).toHaveCount(0);
    }
  }
});

test('A delayed stylesheet keeps the current design visible and preserves the request draft', async ({ page }) => {
  await page.goto('./?theme=current#/request');
  await page.locator('#f-name').fill('Sample Planner');
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const pending = page.waitForRequest(request => new URL(request.url()).pathname.endsWith('/css/theme-b.css'));
  await page.route('**/css/theme-b.css', async route => {
    await gate;
    await route.fallback();
  });
  await page.locator('#theme-select').selectOption('b');
  await pending;
  try {
    await selected(page, 'current');
    await expect(page.locator('#f-name')).toBeVisible();
    expect(await page.evaluate(() => [...document.styleSheets].some(sheet =>
      sheet.href?.endsWith('/theme-current.css') && !sheet.disabled))).toBe(true);
  } finally { release(); }
  await selected(page, 'b');
  await expect(page.locator('#f-name')).toHaveValue('Sample Planner');
});

test('A manager can change designs without losing the selected role', async ({ page }) => {
  await page.goto('./?theme=a#/staff');
  await page.locator('#demo-role').selectOption('mgrA');
  await expect(page.locator('#my-activities')).toBeVisible();
  await page.locator('#theme-select').selectOption('c');
  await selected(page, 'c');
  await expect(page.locator('#demo-role')).toHaveValue('mgrA');
  await expect(page.locator('#my-activities')).toBeVisible();
  expect(new URL(page.url()).hash).toBe('#/manager');
});

for (const theme of ids) {
  test(`${theme} loads only its artwork and styles across all main routes`, async ({ page }) => {
    const css = new Set(), modules = new Set(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('request', request => {
      const path = new URL(request.url()).pathname;
      if (path.includes('/js/themes/')) modules.add(path.split('/').pop());
      if (/\/css\/theme-.*\.css$/.test(path)) css.add(path.split('/').pop());
    });

    const family = theme === 'a-light' ? 'a' : theme;
    await page.goto('./?theme=' + theme + '#/');
    await selected(page, theme);
    await expect(option(page, theme)).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => [...modules]).toEqual([family + '.js']);
    for (const [route, target] of [
      ['/', '#start-request'],
      ['/request', '#step-1'],
      ['/staff', '[data-test=queue-card]'],
      ['/activities', '[data-test=list-area]'],
      ['/activities/bowling', '[data-test=area] .area-hours'],
    ]) {
      await page.evaluate(route => { location.hash = route; }, route);
      await expect(page.locator(target).first()).toBeVisible();
      await expect(page.locator('#theme-select')).toHaveValue(theme);
      await expect(page.locator('#demo-banner')).toBeVisible();
      await expect(page.locator('#site-footer')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    const expectedCSS = theme === 'a-light' ? ['theme-a-light.css', 'theme-a.css'] : ['theme-' + theme + '.css'];
    expect([...css].sort()).toEqual(expectedCSS);
    expect([...modules]).toEqual([family + '.js']);
    const activeCSS = await page.evaluate(() => [...document.styleSheets]
      .map(sheet => sheet.href?.split('/').pop()).filter(name => name?.startsWith('theme-')).sort());
    expect(activeCSS).toEqual(expectedCSS);
    expect(errors).toEqual([]);
  });
}
