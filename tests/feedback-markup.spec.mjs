import { expect, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';

const relay = 'https://fss-demo-feedback.jefepapi.workers.dev/feedback';
const widget = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const draft = 'Sample: add a <label> & keep the colors.';
// Raw POST captured from main d2813fb on the same page with the same draft and blocked widget.
const expectedHomePayload = readFileSync(new URL('./fixtures/main-feedback-post.json', import.meta.url));
const opener = page => page.locator('[data-test=feedback-banner]');
const message = page => page.locator('#feedback-message');
const add = page => page.getByRole('button', {name:'Add page screenshot'});
const button = (page, name) => page.getByRole('button', {name, exact:true});
const surface = page => button(page, 'Mark the screenshot');
const preview = page => page.getByRole('img', {name:'Marked-up page screenshot preview'});
const pixels = page => surface(page).locator('canvas').evaluate(canvas => canvas.toDataURL());

test.use({reducedMotion:'reduce'});
test.beforeEach(async ({page}) => {
  await page.route(widget, route => route.abort());
  await page.route(relay, route => route.fulfill({status:201, json:{ok:true, number:12}}));
});

const previewQuery = '?theme=a&feedback-markup=1';
async function openFeedback(page, path = './' + previewQuery + '#/') {
  await page.goto(path);
  await opener(page).click();
  await expect(message(page)).toBeFocused();
  await message(page).fill(draft);
  await expect.poll(() => page.locator('#feedback-css').evaluate(link => Boolean(link.sheet))).toBe(true);
}

// Use a flat image to isolate the editor pixels and exercise actual pointer input.
async function withFixedCapture(page) {
  await page.route('**/js/lazy/feedback-capture.js', route => route.fulfill({
    contentType:'text/javascript',
    body:`export const rememberCapture = () => () => {};
      export function capture() {
        const canvas = document.createElement('canvas');
        canvas.width = 400; canvas.height = 500;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#385372';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return {ok:true, canvas};
      }`,
  }));
}

async function withFeedbackCheck(page) {
  await page.route(widget, route => route.fulfill({
    contentType:'text/javascript',
    body:`window.sampleCheckResets = 0;
      window.turnstile = {
        render(container, options) {
          window.completeSampleCheck = () => options.callback('sample-text-check');
          window.failSampleCheck = options['error-callback'];
          options.callback('sample-image-check');
          container.textContent = 'Sample check ready';
          return 1;
        },
        reset() { window.sampleCheckResets++; },
        remove() {},
      };`,
  }));
}

async function addScreenshot(page) {
  await add(page).click();
  await button(page, 'Save screenshot').click();
  await expect(preview(page)).toBeVisible();
}

async function tap(page, x, y, touch) {
  const canvas = surface(page).locator('canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  const position = {x:box.width * x, y:box.height * y};
  await (touch ? canvas.tap({position}) : canvas.click({position}));
}

async function samplePixels(image, points) {
  return image.evaluate(async (element, points) => {
    await element.decode();
    const canvas = document.createElement('canvas');
    canvas.width = element.naturalWidth;
    canvas.height = element.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(element, 0, 0);
    return points.map(([x,y]) => [...ctx.getImageData(x,y,1,1).data].slice(0, 3));
  }, points);
}

function runRelay(request) {
  // Use the relay's Node loader in its own process, outside Playwright's loader.
  const stubs = `
    import { readFileSync } from 'node:fs';
    import worker from './relay/worker.js';
    import { checkUrl, githubStub, stubLimiter } from './relay/test-support.mjs';
    const github = githubStub(12);
    globalThis.fetch = async (url, options) => url === checkUrl
      ? Response.json({success:true, hostname:'jefepapi.github.io'}) : github(url, options);
    const env = {GITHUB_TOKEN:'sample-issue-key', TURNSTILE_SECRET:'sample-check-key'};
    env.LIMITER = stubLimiter(env);
    const result = await worker.fetch(new Request('https://sample.workers.dev/feedback', {
      method:'POST', body:readFileSync(0), headers:{
        Origin:'https://jefepapi.github.io', 'Content-Type':process.argv[1],
      },
    }), env);
    console.log(JSON.stringify({status:result.status, json:await result.json()}));
  `;
  return new Promise((resolve, reject) => {
    const child = execFile(process.execPath, ['--import', './relay/register.mjs', '--input-type=module',
      '--eval', stubs, request.headers()['content-type']], (error, output) => {
      if (error) reject(error);
      else resolve(output);
    });
    child.stdin.end(request.postDataBuffer());
  });
}

test('drag Highlight, tap Circle, pin Note, undo and save the exact JPEG once', async ({page, context}, {project}) => {
  const touch = project.name === 'phone-390';
  await page.route(widget, route => route.fulfill({contentType:'text/javascript',
    body:`window.turnstile = { render(_, options) { options.callback('sample-check'); return 1; }, remove() {} };`}));
  await page.route(relay, async route => route.fulfill(JSON.parse(await runRelay(route.request()))));
  await page.addInitScript(() => {
    window.screenshotWrites = [];
    window.objectURLs = 0;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      window.screenshotWrites.push(String(value));
      return setItem.call(this, key, value);
    };
    const createObjectURL = URL.createObjectURL;
    URL.createObjectURL = function(object) {
      window.objectURLs++;
      return createObjectURL.call(this, object);
    };
  });
  await withFixedCapture(page);
  await openFeedback(page);
  await expect(page.getByText('You can add a screenshot for the marketing team.')).toBeVisible();
  const assets = [];
  page.on('request', request => assets.push(new URL(request.url()).pathname));
  await add(page).click();
  await expect(button(page, 'Highlight')).toHaveAttribute('aria-pressed', 'true');
  expect(assets.some(url => url.endsWith('/feedback-markup.js'))).toBe(true);
  await expect(message(page)).toBeHidden();
  await expect(button(page, 'Save feedback')).toHaveCount(0);
  await expect(button(page, 'Undo')).toBeDisabled();
  for (const name of ['Highlight', 'Circle', 'Note', 'Undo', 'Remove', 'Save screenshot', 'Cancel']) {
    const {width,height} = await button(page, name).boundingBox();
    expect(Math.min(width, height), name).toBeGreaterThanOrEqual(48);
  }
  expect(await page.locator('#sheet').evaluate(sheet => sheet.scrollWidth <= sheet.clientWidth)).toBe(true);
  if (touch) await expect(button(page, 'Save screenshot')).toBeInViewport({ratio:1});

  const clean = await pixels(page);
  const canvas = surface(page).locator('canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  const at = (x, y) => ({x:Math.round(box.x + box.width * x), y:Math.round(box.y + box.height * y)});
  const from = at(.15, .16), to = at(.4, .25);
  if (touch) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[from]});
    await cdp.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[to]});
    await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    await cdp.detach();
  } else {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, {steps:5});
    await page.mouse.up();
  }
  await expect(button(page, 'Undo')).toBeEnabled();
  const highlighted = await pixels(page);
  expect(highlighted).not.toBe(clean);

  await button(page, 'Circle').click();
  await tap(page, .65, .48, touch);
  const circled = await pixels(page);
  expect(circled).not.toBe(highlighted);

  await button(page, 'Note').click();
  await canvas.evaluate(el => {
    el.ownerDocument.addEventListener('pointerup', () => {
      window.focusAtPointerUp = document.activeElement.id;
    }, {once:true});
  });
  await tap(page, .25, .72, touch);
  const note = page.getByRole('textbox', {name:'Note (sample details only)'});
  expect(await page.evaluate(() => window.focusAtPointerUp)).toBe('screenshot-note');
  await expect(note).toBeFocused();
  const pinned = await pixels(page);
  await note.fill('<b>Sample note</b>');
  expect(await pixels(page)).not.toBe(pinned);
  await expect(page.locator('.feedback-markup b')).toHaveCount(0);
  await button(page, 'Undo').click();
  expect(await pixels(page)).toBe(circled);
  await tap(page, .25, .72, touch);
  await note.fill('<b>Sample note</b>');
  const jpegSaves = await button(page, 'Save screenshot').evaluate(el => {
    const canvas = document.querySelector('.feedback-markup canvas');
    const toDataURL = canvas.toDataURL.bind(canvas);
    let saves = 0;
    canvas.toDataURL = (...options) => {
      saves++;
      const [prefix, encoded] = toDataURL(...options).split(',');
      const binary = atob(encoded);
      const sampleMetadata = '\xff\xe1\0\x0aExif\0\0ab';
      return prefix + ',' + btoa(binary.slice(0, 20) + sampleMetadata + binary.slice(20));
    };
    el.click();
    el.click();
    return saves;
  });
  expect(jpegSaves).toBe(1);
  await expect(message(page)).toHaveValue(draft);
  await expect(preview(page)).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
  const jpeg = await preview(page).getAttribute('src');
  await expect(preview(page)).toBeInViewport({ratio:.98});
  await expect(page.getByText('Your screenshot will be sent privately to the marketing team.')).toBeVisible();
  await expect(button(page, 'Remove')).toBeFocused();
  await expect(button(page, 'Save feedback')).toHaveCount(1);
  const decoded = Buffer.from(jpeg.split(',')[1], 'base64');
  expect([...decoded.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  expect([...decoded.subarray(-2)]).toEqual([0xff, 0xd9]);
  expect(decoded.includes(Buffer.from('Exif\0\0'))).toBe(false);
  expect(decoded.includes(Buffer.from('ICC_PROFILE\0'))).toBe(false);
  // A scaled click can round to a neighboring image pixel across browsers.
  const circleEdge = Array.from({length:7}, (_, i) => [260,217 + i]);
  const [highlight, noteBackground, untouched, ...circle] = await samplePixels(preview(page),
    [[100,100],[116,360],[20,20],...circleEdge]);
  expect(highlight[0]).toBeGreaterThan(untouched[0] + 50);
  expect(Math.max(...circle.map(([red]) => red))).toBeGreaterThan(untouched[0] + 70);
  expect(noteBackground[2]).toBeLessThan(untouched[2] - 25);

  const posted = page.waitForRequest(relay);
  await button(page, 'Save feedback').click();
  const request = await posted;
  expect(request.headers()['content-type']).toBe('application/json; screenshot=jpeg');
  const saved = await page.evaluate(() => localStorage.getItem('mktdemo.feedback'));
  expect(request.postDataJSON()).toEqual({
    ...JSON.parse(expectedHomePayload), turnstileToken:'sample-check',
    id:JSON.parse(saved)[0].id, screenshot:jpeg.split(',')[1],
  });
  await expect(page.getByText('Your feedback and screenshot were sent to the marketing team.')).toBeVisible();
  const {writes, objectURLs} = await page.evaluate(() => ({
    writes:[...window.screenshotWrites, ...Object.values(localStorage), ...Object.values(sessionStorage)],
    objectURLs:window.objectURLs,
  }));
  expect(writes.some(value => value.includes('data:image/') || value.includes(jpeg.split(',')[1]))).toBe(false);
  expect(objectURLs).toBe(0);
  expect(JSON.parse(saved)).toHaveLength(1);
  expect(saved).not.toContain('data:image/');
  expect(saved).not.toContain('Sample note');
  await expect(preview(page)).toHaveCount(0);
});

for (const problem of ['unreadable', 'oversized']) {
  test(`offers Send text only when the screenshot is ${problem}`, async ({page}) => {
    await withFixedCapture(page);
    await withFeedbackCheck(page);
    const requests = [];
    page.on('request', request => { if (request.url() === relay) requests.push(request); });
    await openFeedback(page);
    await expect(page.getByText('Sample check ready')).toBeVisible();
    await add(page).click();
    await surface(page).locator('canvas').evaluate((canvas, problem) => {
      canvas.toDataURL = () => 'data:image/jpeg;base64,' + (problem === 'unreadable'
        ? '/9j/2Q==' : 'A'.repeat(349527) + '=');
    }, problem);
    await button(page, 'Save screenshot').click();
    await expect(page.getByRole('status')).toContainText(problem === 'unreadable'
      ? 'Could not read this screenshot.' : 'This screenshot is too large.');
    await expect(message(page)).toHaveValue(draft);
    await expect(preview(page)).toHaveCount(0);
    expect(requests).toHaveLength(0);
    const posted = page.waitForRequest(relay);
    await button(page, 'Send text only').click();
    expect((await posted).postDataJSON()).toEqual({...JSON.parse(expectedHomePayload), turnstileToken:'sample-image-check'});
    expect(await page.evaluate(() => window.sampleCheckResets)).toBe(0);
    await expect(page.getByText('Sent to the marketing team.')).toBeVisible();
    expect(requests).toHaveLength(1);
  });
}

for (const [failure, refresh, reason = 'Could not send this screenshot.'] of [
  [413, false, 'This screenshot is too large.'],
  [422, false, 'Could not read this screenshot.'],
  ['pre-check 429', false, 'Screenshots are busy right now.'],
  [429, true, 'Screenshots are busy right now.'],
  [403, true],
  [500, true],
  [502, true],
  ['Worker CPU error', true],
  ['network error', true],
  ['timeout', true],
]) {
  test(`relay ${failure} lets the visitor send the same draft as text only`, async ({page}, {project}) => {
    await withFixedCapture(page);
    await withFeedbackCheck(page);
    const requests = [];
    await page.route(relay, route => {
      const request = route.request();
      requests.push(request);
      if (!request.postDataJSON().screenshot) return route.fulfill({status:201, json:{ok:true, number:12}});
      if (failure === 'pre-check 429') return route.fulfill({status:429, json:{ok:false, checkUsed:false}});
      if (failure === 'network error') return route.abort('failed');
      if (failure === 'timeout') return; // Leave the image POST pending for the client's AbortController.
      if (failure === 'Worker CPU error') return route.fulfill({status:503, contentType:'text/html', body:'Error 1102'});
      return route.fulfill({status:failure, json:{ok:false}});
    });
    await openFeedback(page);
    await expect(page.getByText('Sample check ready')).toBeVisible();
    await addScreenshot(page);
    if (failure === 'timeout') await page.clock.install();
    const imagePost = page.waitForRequest(relay);
    await button(page, 'Save feedback').click();
    await imagePost;
    if (failure === 'timeout') await page.clock.fastForward(20_000);
    await expect(page.getByRole('status')).toContainText(reason);
    expect(await page.evaluate(() => window.sampleCheckResets)).toBe(refresh ? 1 : 0);
    if (refresh) {
      const waiting = button(page, 'Getting ready...');
      await expect(waiting).toBeDisabled();
      if (failure === 500) {
        if (project.name === 'phone-390') await waiting.tap({force:true});
        else await waiting.click({force:true});
        await page.locator('#feedback-name').press('Enter');
        expect(requests).toHaveLength(1);
      }
      await page.evaluate(() => window.completeSampleCheck());
    }
    const fallback = button(page, 'Send text only');
    await expect(fallback).toBeFocused();
    await expect(message(page)).toHaveValue(draft);
    await expect(preview(page)).toHaveCount(0);
    expect(requests).toHaveLength(1);
    const originalId = requests[0].postDataJSON().id;
    expect(requests[0].postDataJSON().turnstileToken).toBe('sample-image-check');
    const updatedDraft = draft + ' Sample follow-up.';
    await message(page).fill(updatedDraft);
    await fallback.click();
    await expect(page.getByText('Sent to the marketing team.')).toBeVisible();
    expect(requests).toHaveLength(2);
    expect(requests[1].headers()['content-type']).toBe(`application/json; submission=${originalId}`);
    expect(requests[1].postDataJSON()).toEqual({...JSON.parse(expectedHomePayload), message:updatedDraft,
      turnstileToken:refresh ? 'sample-text-check' : 'sample-image-check'});
    const entries = await page.evaluate(() => JSON.parse(localStorage.getItem('mktdemo.feedback')));
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({id:originalId, message:updatedDraft, delivery:'sent', issue:12});
    expect(entries[0]).not.toHaveProperty('screenshot');
  });
}

test('widget error while getting ready saves the draft without a text POST', async ({page}) => {
  await withFixedCapture(page);
  await withFeedbackCheck(page);
  const requests = [];
  await page.route(relay, route => {
    requests.push(route.request());
    return route.fulfill({status:500, json:{ok:false}});
  });
  await openFeedback(page);
  await expect(page.getByText('Sample check ready')).toBeVisible();
  await addScreenshot(page);
  await button(page, 'Save feedback').click();
  await expect(button(page, 'Getting ready...')).toBeDisabled();
  await expect(message(page)).toHaveValue(draft);
  const updatedDraft = draft + ' Sample edit while waiting.';
  await message(page).fill(updatedDraft);
  await page.evaluate(() => window.failSampleCheck());
  await expect(page.getByText("Saved in this browser. We couldn't send it right now.")).toBeVisible();
  expect(requests).toHaveLength(1);
  const entries = await page.evaluate(() => JSON.parse(localStorage.getItem('mktdemo.feedback')));
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({id:requests[0].postDataJSON().id, message:updatedDraft, delivery:'local'});
  expect(entries[0]).not.toHaveProperty('screenshot');
});

for (const screenshot of ['failed', undefined]) {
  test(`${screenshot ?? 'legacy'} screenshot response confirms only text and hides staff retry`, async ({page}) => {
    await withFixedCapture(page);
    await withFeedbackCheck(page);
    const requests = [];
    await page.route(relay, route => {
      requests.push(route.request());
      return route.fulfill({status:201, json:{ok:true, number:12, screenshot}});
    });
    await openFeedback(page);
    await addScreenshot(page);
    await button(page, 'Save feedback').click();
    await expect(page.locator('#feedback-delivery')).toHaveText(
      'Your written feedback was sent to the marketing team. We could not confirm your screenshot.');
    await expect(button(page, 'Send text only')).toHaveCount(0);
    await page.goto('./#/staff');
    await page.locator('#go-feedback').click();
    const row = page.locator('[data-test=feedback-entry]');
    await expect(row).toContainText('Sent · #12');
    await expect(button(page, 'Try sending again')).toHaveCount(0);
    expect(requests).toHaveLength(1);
  });
}

test('a stalled check saves the draft and staff can retry with the same submission ID', async ({page}) => {
  await withFixedCapture(page);
  await withFeedbackCheck(page);
  const requests = [];
  await page.route(relay, route => {
    const request = route.request();
    requests.push(request);
    if (request.postDataJSON().screenshot) return route.abort('failed');
    return route.fulfill({status:201, json:{ok:true, number:12, screenshot:'failed'}});
  });
  await openFeedback(page);
  await expect(page.getByText('Sample check ready')).toBeVisible();
  await addScreenshot(page);
  await page.clock.install();
  await button(page, 'Save feedback').click();
  await expect(button(page, 'Getting ready...')).toBeDisabled();
  await page.clock.fastForward(8000);
  await expect(page.locator('#feedback-delivery')).toContainText('Saved in this browser.');
  expect(requests).toHaveLength(1);
  const id = requests[0].postDataJSON().id;
  await page.goto('./#/staff');
  await page.locator('#go-feedback').click();
  await button(page, 'Try sending again').click();
  await expect(page.getByText('Sample check ready')).toBeVisible();
  await button(page, 'Send feedback').click();
  const row = page.locator('[data-test=feedback-entry]');
  await expect(row).toContainText('Sent · #12');
  await expect(button(page, 'Try sending again')).toHaveCount(0);
  expect(requests).toHaveLength(2);
  expect(requests[1].headers()['content-type']).toBe(`application/json; submission=${id}`);
  expect(requests[1].postDataJSON()).toEqual({...JSON.parse(expectedHomePayload), turnstileToken:'sample-image-check'});
});

test('replacing the markup sheet releases its Escape listener', async ({page}) => {
  await withFixedCapture(page);
  await openFeedback(page);
  await add(page).click();
  await expect(button(page, 'Highlight')).toBeFocused();
  await page.evaluate(async () => {
    const {h, openSheet} = await import('./js/ui.js');
    openSheet('Sample replacement', h('p', {}, 'Sample sheet body.'));
  });
  const replacement = page.getByRole('dialog', {name:'Sample replacement'});
  await expect(replacement).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(replacement).toHaveCount(0);
});

test('keyboard can select, move, mark, undo and return focus', async ({page}) => {
  await withFixedCapture(page);
  await openFeedback(page);
  await add(page).focus();
  await page.keyboard.press('Enter');
  await expect(button(page, 'Highlight')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(button(page, 'Close')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(button(page, 'Highlight')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(button(page, 'Circle')).toBeFocused();
  await expect(button(page, 'Circle')).toHaveCSS('outline-style', 'solid');
  expect(await button(page, 'Circle').evaluate(el => el.matches(':focus-visible'))).toBe(true);
  await page.keyboard.press('Space');
  await expect(button(page, 'Circle')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(surface(page)).toBeFocused();
  const center = await pixels(page);
  await page.keyboard.press('ArrowLeft');
  expect(await pixels(page)).not.toBe(center);
  await page.keyboard.press('Enter');
  await expect(button(page, 'Undo')).toBeEnabled();
  await page.keyboard.press('Shift+Tab');
  await expect(button(page, 'Undo')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(button(page, 'Circle')).toBeFocused();
  await expect(button(page, 'Undo')).toBeDisabled();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('#screenshot-note')).toBeFocused();
  await page.keyboard.type('Sample keyboard note');
  await page.keyboard.press('Escape');
  await expect(page.locator('#screenshot-note')).toBeHidden();
  await expect(surface(page)).toBeFocused();
  await expect(button(page, 'Undo')).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(add(page)).toBeFocused();
  await expect(message(page)).toHaveValue(draft);
  await page.keyboard.press('Escape');
  await expect(opener(page)).toBeFocused();
});

test('Cancel, Close and confirmed Remove return to the same unsent form', async ({page}) => {
  await withFixedCapture(page);
  await openFeedback(page);
  await page.locator('#feedback-name').fill('Sample reviewer');
  for (const action of ['Cancel', 'Close']) {
    await add(page).click();
    await surface(page).press('Enter');
    await button(page, action).click();
    await expect(add(page)).toBeFocused();
    await expect(message(page)).toHaveValue(draft);
    await expect(page.locator('#feedback-name')).toHaveValue('Sample reviewer');
    await expect(preview(page)).toHaveCount(0);
  }
  await add(page).click();
  await surface(page).press('Enter');
  const remove = button(page, 'Remove');
  expect((await remove.boundingBox()).y).toBeGreaterThan((await button(page, 'Undo').boundingBox()).y + 48);
  page.once('dialog', dialog => dialog.dismiss());
  await remove.click();
  await expect(surface(page)).toBeVisible();
  await expect(button(page, 'Undo')).toBeEnabled();
  page.once('dialog', async dialog => {
    expect(dialog.message()).toBe('Remove this screenshot and all its marks?');
    await dialog.accept();
  });
  await remove.click();
  await expect(add(page)).toBeFocused();
  await expect(message(page)).toHaveValue(draft);
  await add(page).click();
  await button(page, 'Save screenshot').click();
  await expect(preview(page)).toBeVisible();
  await button(page, 'Remove').click();
  await expect(add(page)).toBeFocused();
  await expect(preview(page)).toHaveCount(0);
  await expect(page.getByText('You can add a screenshot for the marketing team.')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('mktdemo.feedback'))).toBeNull();
});

test('backdrop and body-focused Escape preserve marks and the draft', async ({page}) => {
  await withFixedCapture(page);
  await openFeedback(page);
  await add(page).click();
  await tap(page, .5, .5, page.viewportSize().width === 390);
  await page.evaluate(() => document.activeElement.blur());
  const marked = await pixels(page);
  await page.mouse.click(5, 5);
  await expect(page.locator('body')).toBeFocused();
  await page.keyboard.press('Escape');
  expect(await pixels(page)).toBe(marked);
  await expect(button(page, 'Undo')).toBeEnabled();
  await button(page, 'Cancel').click();
  await expect(message(page)).toHaveValue(draft);
});

test('shows the masked opening page after typing and scrolling', async ({page}) => {
  await page.goto('./' + previewQuery + '#/other');
  const field = page.locator('#o-new');
  await field.fill('PRIVATE SAMPLE FIELD');
  await field.evaluate(el => scrollTo(0, scrollY + el.getBoundingClientRect().top - 130));
  const original = await field.boundingBox();
  const {width, height} = page.viewportSize();
  await opener(page).evaluate(el => el.click());
  await expect(message(page)).toBeFocused();
  await message(page).fill(draft);
  await page.evaluate(() => scrollTo(0, 0));
  await add(page).click();
  await expect(surface(page)).toBeVisible();
  if (width === 390) expect((await surface(page).boundingBox()).width).toBeGreaterThanOrEqual(320);
  await button(page, 'Save screenshot').click();
  const size = await preview(page).evaluate(async el => { await el.decode(); return [el.naturalWidth, el.naturalHeight]; });
  expect(size[0] / size[1]).toBeCloseTo(width / height, 2);
  const x = Math.round((original.x + original.width / 2) * size[0] / width);
  const y = Math.round((original.y + original.height / 2) * size[1] / height);
  const [mask] = await samplePixels(preview(page), [[x, y]]);
  for (const [index, value] of [104,120,138].entries()) expect(Math.abs(mask[index] - value)).toBeLessThan(12);
});

test('a refused staff capture leaves text feedback available and loads no editor', async ({page}) => {
  await withFeedbackCheck(page);
  const assets = [];
  page.on('request', request => assets.push(request.url()));
  await openFeedback(page, './' + previewQuery + '#/staff?show=all');
  await expect(page.getByText('Sample check ready')).toBeVisible();
  await add(page).click();
  await expect(page.getByRole('status')).toContainText('You can still send text feedback.');
  await expect(add(page)).toBeFocused();
  await expect(message(page)).toHaveValue(draft);
  expect(assets.some(url => url.endsWith('/feedback-markup.js'))).toBe(false);
  await expect(preview(page)).toHaveCount(0);
  await button(page, 'Send text only').click();
  await expect(page.getByText('Sent to the marketing team.')).toBeVisible();
});

async function routeLocalCheckout(page, baseURL, origin) {
  // Serve this checkout under the test origin without reaching Pages or DNS.
  await page.route(`${origin}/**`, async route => {
    const {pathname, search} = new URL(route.request().url());
    const response = await route.fetch({url:new URL(pathname + search, baseURL).href});
    await route.fulfill({response});
  });
}

for (const [mode, publicQuery] of [['local default'], ['public host with flag off', '?theme=a'],
  ['public host with flag on', previewQuery]]) {
  test(`text-only feedback matches main byte for byte (${mode})`, async ({page, baseURL}) => {
    const requests = [];
    page.on('request', request => requests.push(request));
    let path = './?theme=a#/';
    if (publicQuery) {
      const origin = 'http://preview.invalid';
      await routeLocalCheckout(page, baseURL, origin);
      path = origin + '/' + publicQuery + '#/';
    }
    await openFeedback(page, path);
    await expect(page.getByLabel('What do you like? What would you change?', {exact:true})).toBeVisible();
    await expect(add(page)).toHaveCount(0);
    const posted = page.waitForRequest(relay);
    await button(page, 'Save feedback').click();
    expect((await posted).postDataBuffer()).toEqual(expectedHomePayload);
    await expect(page.getByText('Sent to the marketing team.')).toBeVisible();
    expect(requests.filter(request => request.url() === relay)).toHaveLength(1);
    expect(requests.some(request => request.url().endsWith('/feedback-markup.js'))).toBe(false);
  });
}

const blockedMarkupURLs = [
  'http://localhost.evil.com/?feedback-markup=1#/',
  'http://evil-localhost.com/?feedback-markup=1#/',
  'http://127.0.0.1.nip.io/?feedback-markup=1#/',
  'http://localhost./?feedback-markup=1#/',
  'http://preview.localhost/?feedback-markup=1#/',
  'http://localhost/#/?feedback-markup=1',
];

for (const url of blockedMarkupURLs) {
  test(`screenshot editor stays off at ${url}`, async ({page, baseURL}) => {
    const assets = [];
    page.on('request', request => assets.push(new URL(request.url()).pathname));
    await routeLocalCheckout(page, baseURL, new URL(url).origin);
    await openFeedback(page, url);
    await expect(add(page)).toHaveCount(0);
    expect(assets.some(path => path.endsWith('/feedback-markup.js'))).toBe(false);
  });
}

test('screenshot editor is available on localhost with the query flag', async ({page, baseURL}) => {
  const origin = 'http://localhost';
  await routeLocalCheckout(page, baseURL, origin);
  await openFeedback(page, `${origin}/?feedback-markup=1#/`);
  await expect(add(page)).toBeVisible();
});
