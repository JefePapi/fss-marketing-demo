import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const banner = '[data-test=feedback-banner]', footer = '[data-test=feedback-footer]';
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('mktdemo.feedback')));
const route = '#/staff?show=all';
const sample = 'Add <sample> & a second review?';
// These #12 cases exercise the public fallback without contacting the live relay.
test.beforeEach(async ({page}) => {
  await page.route('https://fss-demo-feedback.jefepapi.workers.dev/feedback',
    route => route.fulfill({status:503, json:{ok:false, error:'not configured'}}));
  // The live site key is configured; stand in for the Turnstile script so tests stay offline.
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', route => route.fulfill({
    contentType:'text/javascript',
    body:"window.turnstile={render(c,o){c.textContent='Sample check';o.callback('sample-token');return 1},remove(){}};"}));
});
const thanks = 'Thanks — your feedback is saved in this demo.';

test('Feedback entry points on visitor, staff, manager, shared and fallback pages', async ({page}) => {
  const desktop = page.viewportSize().width >= 900;
  await page.goto('./#/staff');
  await expect(page.locator('#queue-list')).toBeVisible();
  await expect(page.locator('#feedback-open')).toBeVisible({visible:desktop});
  await expect(page.locator(banner)).toBeVisible();
  await expect(page.locator(footer)).toBeVisible();
  await page.locator('#demo-role').selectOption('mgrA');
  await expect(page.locator('#my-activities')).toBeVisible();
  for (const path of ['#/manager', '#/staff/feedback', '#/', '#/request', '#/calendar?readonly=1', '#/about', '404.html#/unknown']) {
    await page.goto('./' + path);
    await expect(page.locator('#app h1').first()).toBeVisible();
    if (path === '#/staff/feedback') await expect(page.locator('#role-blocked')).toBeVisible();
    await expect(page.locator(banner)).toBeVisible();
    await expect(page.locator(footer)).toBeVisible();
    await expect(page.locator('#feedback-open')).toBeVisible({visible:desktop});
    const opener = page.locator(desktop ? '#feedback-open' : banner);
    await opener.click();
    await expect(page.locator('#feedback-message')).toBeFocused();
    await expect(page.locator('#feedback-open')).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(opener).toBeFocused();
    if (!desktop) {
      const box = await page.locator('#demo-banner').boundingBox();
      expect(box.height).toBeLessThanOrEqual(52);
      expect(await page.locator('#demo-banner').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
  }
});

test('Feedback is lazy, saves locally, and prepares a public issue only on request', async ({page}) => {
  const assets = new Set(), github = [];
  await page.route('https://github.com/**', r => { github.push(r.request().url()); return r.abort(); });
  page.on('request', r => assets.add(new URL(r.url()).pathname.split('/').pop()));
  await page.goto('./?theme=a-light' + route);
  await expect(page.locator('#queue-list')).toBeVisible();
  for (const file of ['feedback.js','feedback.css','feedback-model.js','feedback-staff.js','feedback-relay.js']) expect(assets.has(file)).toBe(false);
  await page.locator(banner).click();
  await expect(page.locator('#sheet')).toBeVisible();
  await expect.poll(() => assets.has('feedback.css')).toBe(true);
  expect(assets.has('feedback.js')).toBe(true);
  expect(assets.has('feedback-staff.js')).toBe(false);
  const field = page.getByLabel('Message', {exact:true});
  await page.getByRole('button', {name:'Save feedback'}).click();
  await expect(page.getByText('Enter a message.')).toBeVisible();
  await expect(field).toBeFocused();
  await page.locator('#sheet label').filter({hasText:'Suggestion'}).click();
  await field.fill(sample);
  await expect(page.locator('#feedback-length')).toHaveText(sample.length + ' / 2000');
  await page.getByLabel('Name (optional)').fill('Sample reviewer');
  await expect(page.getByLabel('Sent from')).toHaveValue('Queue · ' + route + ' · a-light');
  await page.getByRole('button', {name:'Save feedback'}).click();
  await expect(page.getByText(thanks)).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#sheet-close')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', {name:'Send another'})).toBeFocused();
  await expect(page.getByRole('link', {name:/GitHub/})).toHaveCount(0);
  const [entry] = await saved(page);
  expect(entry).toMatchObject({type:'Suggestion', message:sample, name:'Sample reviewer', page:'Queue', route, theme:'a-light', read:false});
  expect(Number.isFinite(Date.parse(entry.at))).toBe(true);
  await page.getByText('Send another', {exact:true}).click();
  await expect(field).toBeEmpty();
  await field.fill('Anonymous sample');
  await page.getByRole('button', {name:'Save feedback'}).click();
  await expect(page.getByText(thanks)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator(banner)).toBeFocused();
  expect((await saved(page))[0]).toMatchObject({type:'Feedback', name:'', message:'Anonymous sample'});
  expect(github).toEqual([]);
  await expect(page.locator('#feedback-count')).toHaveText('2');
  await page.locator('#go-feedback').click();
  const rows = page.locator('[data-test=feedback-entry]');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText('Anonymous');
  await page.locator('#theme-select').selectOption('current');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'current');
  await expect(rows.first()).toHaveCSS('display', 'grid');
  await page.getByLabel('Filter by type').selectOption('Suggestion');
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText(sample);
  await expect(rows.locator('sample')).toHaveCount(0);
  await expect(rows.getByRole('link', {name:/GitHub/})).toHaveCount(0);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {configurable:true,
    value:{writeText:async value => { window.feedbackClipboard = value; }}}));
  await rows.getByRole('button', {name:'Copy as text'}).click();
  const copied = await page.evaluate(() => window.feedbackClipboard);
  for (const value of ['Suggestion', sample, 'Sample reviewer', 'Queue', route, 'a-light', 'Sent from the FSS marketing demo'])
    expect(copied).toContain(value);
  await rows.getByText('Mark read', {exact:true}).click();
  await expect(page.locator('#feedback-unread')).toHaveText('1 unread');
  await rows.getByText('Mark unread', {exact:true}).click();
  await expect(page.locator('#feedback-unread')).toHaveText('2 unread');
  const download = page.waitForEvent('download');
  await page.getByText('Download feedback (CSV)').click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('feedback-demo.csv');
  const csv = await readFile(await file.path(), 'utf8');
  expect(csv).toContain('"Type","Message","Name","Page","Route","Design","Timestamp","Read"');
  expect(csv).toContain(sample);
  expect(csv).not.toContain('Anonymous sample');
  await rows.getByText('Delete', {exact:true}).click();
  await page.keyboard.press('Escape');
  await expect(rows).toHaveCount(1);
  await rows.getByText('Delete', {exact:true}).click();
  await page.getByRole('button', {name:'Delete feedback', exact:true}).click();
  await expect(page.getByText('No matching feedback')).toBeVisible();
  await page.getByText('Back to queue').click();
  await expect(page.locator('#feedback-count')).toHaveText('1');
  await page.locator('#reset-demo-staff').click();
  await page.locator('#confirm-yes').click();
  await expect(page.locator('#feedback-count')).toHaveText('0');
  expect(await saved(page)).toBeNull();
});

for (const theme of ['a','a-light','b','c','current']) {
  test('Submit from the request form in ' + theme, async ({page}) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('./?theme=' + theme + '#/request');
    await expect(page.locator('#step-1')).toBeVisible();
    if (page.viewportSize().width >= 900) {
      const pill = await page.locator('#feedback-open').boundingBox();
      const tray = await page.locator('.tray').boundingBox();
      expect(pill.y + pill.height <= tray.y || tray.y + tray.height <= pill.y ||
        pill.x + pill.width <= tray.x || tray.x + tray.width <= pill.x).toBe(true);
    }
    await page.locator(footer).click();
    await page.locator('#feedback-message').fill('Sample note');
    await page.getByRole('button', {name:'Save feedback'}).click();
    await expect(page.getByText(thanks)).toBeVisible();
    await page.locator('#sheet-close').click();
    await expect(page.locator(footer)).toBeFocused();
    expect((await saved(page))[0].theme).toBe(theme);
    expect(errors).toEqual([]);
  });
}

test('A storage write failure keeps the inbox usable for the open page', async ({page}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'locks', {get() { throw new DOMException('Unavailable', 'SecurityError'); }});
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'mktdemo.feedback') throw new DOMException('Unavailable', 'QuotaExceededError');
      return write.call(this, key, value);
    };
  });
  await page.goto('./#/staff');
  await page.locator(banner).click();
  await page.locator('#feedback-message').fill('Sample temporary note');
  await page.getByRole('button', {name:'Save feedback'}).click();
  await expect(page.getByText(/Feedback changes last only/)).toBeVisible();
  await page.locator('#sheet-close').click();
  await page.locator('#go-feedback').click();
  await expect(page.locator('[data-test=feedback-entry]')).toContainText('Sample temporary note');
  await expect(page.locator('#app')).toContainText('Feedback changes last only');
});

test('Desktop Feedback clears page controls as the page scrolls', async ({page}) => {
  test.skip(page.viewportSize().width < 900, 'Desktop control');
  for (const path of ['#/', '#/request', '#/staff?show=all', '#/calendar', '#/activities']) {
    await page.goto('./' + path);
    await expect(page.locator('#app h1').first()).toBeVisible();
    for (const fraction of [0, 0.35, 1]) {
      await page.evaluate(f => scrollTo(0, document.documentElement.scrollHeight * f), fraction);
      await expect.poll(() => page.locator('#feedback-open').evaluate(pill => {
        const r = pill.getBoundingClientRect();
        const banner = document.getElementById('demo-banner');
        const bounds = banner.getBoundingClientRect();
        // Scrolled content behind the opaque sticky banner is already occluded.
        const inBanner = r.top >= bounds.top && r.bottom <= bounds.bottom && r.left >= bounds.left && r.right <= bounds.right;
        return [...document.querySelectorAll('a,button,input,select,textarea,summary,label,.tray')].some(el => {
          if (inBanner && !banner.contains(el)) return false;
          const b = el.getBoundingClientRect();
          return el !== pill && b.width > 0 && b.height > 0 && b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top;
        });
      })).toBe(false);
    }
  }
});
