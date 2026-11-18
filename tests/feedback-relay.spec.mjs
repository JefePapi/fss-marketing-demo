import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const relay = 'https://fss-demo-feedback.jefepapi.workers.dev/feedback';
const widget = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const entries = page => page.evaluate(() => JSON.parse(localStorage.getItem('mktdemo.feedback')));
const sender = page => page.getByRole('button', {name:'Save feedback'});
const open = page => page.locator('[data-test=feedback-banner]').click();
const fallback = "Saved in this browser. We couldn't send it right now.";
// Serve the relay module with a chosen site key so tests never reach Cloudflare.
async function withKey(page, key) {
  const source = await readFile(new URL('../js/lazy/feedback-relay.js', import.meta.url), 'utf8');
  await page.route('**/js/lazy/feedback-relay.js', route => route.fulfill({contentType:'text/javascript',
    body:source.replace(/TURNSTILE_SITE_KEY = '[^']*'/, `TURNSTILE_SITE_KEY = '${key}'`)}));
}

test('Live config carries the public Turnstile site key', async () => {
  const source = await readFile(new URL('../js/lazy/feedback-relay.js', import.meta.url), 'utf8');
  expect(source).toContain("TURNSTILE_SITE_KEY = '0x4AAAAAAGHZ9lCct43QwQB_'");
});

for (const [code, text] of [
  [201, 'Sent to the marketing team.'],
  [503, "Saved in this browser. Shared sending isn't switched on yet."],
  [429, 'Saved in this browser. Too many messages right now — try again in a minute.'],
  [0, fallback],
]) {
  test('Relay saves before POST and reports ' + (code || 'network failure'), async ({page, context}) => {
    await withKey(page, '');
    const external = [], requests = [];
    page.on('request', request => {
      if (/\.workers\.dev|challenges\.cloudflare\.com|github\.com/.test(new URL(request.url()).hostname))
        external.push(request.url());
    });
    await context.addCookies([{name:'sample', value:'demo', url:relay, sameSite:'None', secure:true}]);
    await page.addInitScript(() => {
      const fetch = window.fetch;
      window.fetch = function(url, init) {
        window.feedbackOptions = [init.mode, init.credentials, init.referrerPolicy];
        return fetch.call(this, url, init);
      };
    });
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route(relay, async route => {
      requests.push(route.request());
      await gate;
      if (!code) return route.abort();
      return route.fulfill({status:code, json:code === 201 ? {ok:true, number:12} : {ok:false}});
    });
    await page.goto('./#/staff?show=all');
    await expect(page.locator('#queue-list')).toBeVisible();
    await open(page);
    await page.locator('#sheet label').filter({hasText:'Suggestion'}).click();
    await page.locator('#feedback-message').fill(' Sample relay message ');
    await page.locator('#feedback-name').fill(' Reviewer ');
    expect(external).toEqual([]);
    await sender(page).click();
    try {
      await expect.poll(() => requests.length).toBe(1);
      await expect(sender(page)).toBeDisabled();
      const [entry] = await entries(page);
      expect(entry).toMatchObject({delivery:'local', message:'Sample relay message', name:'Reviewer'});
      const req = requests[0];
      expect(req.method()).toBe('POST');
      const headers = await req.allHeaders();
      expect(headers['content-type']).toBe('application/json');
      expect(headers.cookie).toBeUndefined();
      expect(headers.referer).toBeUndefined();
      expect(req.postDataJSON()).toEqual({type:'suggestion', message:entry.message, name:'Reviewer',
        page:'Queue', route:'#/staff?show=all', theme:entry.theme});
      expect(await page.evaluate(() => window.feedbackOptions)).toEqual(['cors','omit','no-referrer']);
    } finally { release(); }
    const done = page.locator('.feedback-done');
    await expect(done.locator('[aria-live=polite]')).toHaveText(text);
    if (code !== 201) {
      await expect(done).not.toContainText('Sent');
      await expect(done.getByRole('link', {name:'Also post to GitHub'})).toBeVisible();
    }
    const records = await entries(page);
    expect(records).toHaveLength(1);
    expect(records[0].delivery).toBe(code === 201 ? 'sent' : 'local');
    expect(records[0].issue).toBe(code === 201 ? 12 : undefined);
    expect(external).toEqual([relay]);
  });
}

test('Marketing retries a #12 entry once and keeps its read state', async ({page}) => {
  await withKey(page, '');
  let attempts = 0;
  await page.route(relay, route => {
    attempts++;
    return route.fulfill({status:201, json:{ok:true, number:12}});
  });
  await page.goto('./#/staff');
  await expect(page.locator('#queue-list')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('mktdemo.feedback', JSON.stringify([{
    type:'Bug', name:'', message:'Sample legacy entry', page:'Home', route:'#/', theme:'a',
    at:new Date().toISOString(), read:true, id:'legacy',
  }])));
  await page.locator('#go-feedback').click();
  const row = page.locator('[data-test=feedback-entry]');
  await expect(row).toContainText('Only in this browser');
  expect(attempts).toBe(0);
  const retry = row.getByRole('button', {name:'Try sending again'});
  await retry.click();
  await expect(row).toContainText('Sent · #12');
  await expect(retry).toHaveCount(0);
  expect(attempts).toBe(1);
  expect(await entries(page)).toMatchObject([{id:'legacy', delivery:'sent', issue:12, read:true}]);
});

test('Configured widget opens on demand and staff retry uses a fresh token', async ({page}) => {
  await withKey(page, 'sample-site-key');
  let loads = 0;
  await page.route(widget, route => {
    loads++;
    return route.fulfill({contentType:'text/javascript', body:`
      let sequence = 0;
      window.turnstile = {
        render(container, options) {
          container.dataset.widgetTheme = options.theme;
          container.textContent = 'Sample check';
          options.callback('sample-check-' + ++sequence);
          return sequence;
        },
        remove() {
          window.removedChecks = (window.removedChecks || 0) + 1;
          if (sequence === 1) throw new Error('Sample widget already removed');
        }
      };`});
  });
  const tokens = [];
  await page.route(relay, route => {
    tokens.push(route.request().postDataJSON().turnstileToken);
    return route.fulfill(tokens.length === 1 ? {status:503, json:{ok:false}} : {status:201, json:{ok:true, number:15}});
  });
  await page.goto('./#/staff');
  await page.locator('#go-feedback').click();
  await expect(page.getByText('No feedback yet')).toBeVisible();
  expect(loads).toBe(0);
  await open(page);
  await expect(page.locator('form .feedback-check')).toHaveText('Sample check');
  const design = await page.locator('html').getAttribute('data-theme');
  await expect(page.locator('.feedback-check')).toHaveAttribute('data-widget-theme',
    ['a', 'b'].includes(design) ? 'dark' : 'light');
  await page.locator('#feedback-message').fill('Sample check flow');
  await sender(page).click();
  await expect(page.locator('.feedback-done')).toBeVisible();
  await page.locator('#sheet-close').click();
  await page.getByRole('button', {name:'Try sending again'}).click();
  await expect(page.locator('form .feedback-check')).toHaveText('Sample check');
  await page.getByRole('button', {name:'Send feedback', exact:true}).click();
  await expect(page.locator('[data-test=feedback-entry]')).toContainText('Sent · #15');
  expect(await page.evaluate(() => window.removedChecks)).toBe(2);
  expect(loads).toBe(1);
  expect(tokens).toEqual(['sample-check-1', 'sample-check-2']);
  expect(JSON.stringify(await entries(page))).not.toContain('sample-check');
});

test('An inbox retry during the original send shares the attempt, even without Web Locks', async ({page}) => {
  await withKey(page, '');
  await page.addInitScript(() => Object.defineProperty(navigator, 'locks', {value:undefined}));
  let attempts = 0, release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route(relay, async route => {
    attempts++;
    await gate;
    return route.fulfill({status:201, json:{ok:true, number:19}});
  });
  await page.goto('./#/staff');
  await open(page);
  await page.locator('#feedback-message').fill('Sample slow relay');
  await sender(page).click();
  try {
    await expect.poll(() => attempts).toBe(1);
    await page.locator('#sheet-close').click();
    await page.locator('#go-feedback').click();
    const row = page.locator('[data-test=feedback-entry]');
    await row.getByText('Try sending again').click();
    await row.getByText('Mark read').click();
    await expect(row).toHaveAttribute('data-read', 'true');
    expect(attempts).toBe(1);
  } finally { release(); }
  await expect(page.locator('[data-test=feedback-entry]')).toContainText('Sent · #19');
  expect(await entries(page)).toMatchObject([{read:true, delivery:'sent', issue:19}]);
  expect(attempts).toBe(1);
});
