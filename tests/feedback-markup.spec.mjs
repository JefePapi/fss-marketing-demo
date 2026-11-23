import { expect, test } from '@playwright/test';

const relay = 'https://fss-demo-feedback.jefepapi.workers.dev/feedback';
const widget = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const draft = 'Sample: add a <label> & keep the colors.';
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

async function openFeedback(page, route = '#/') {
  await page.goto('./?theme=a' + route);
  await opener(page).click();
  await expect(message(page)).toBeFocused();
  await message(page).fill(draft);
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

test('drag Highlight, tap Circle, pin Note, undo and save the exact JPEG once', async ({page, context}, {project}) => {
  const touch = project.name === 'phone-390';
  await withFixedCapture(page);
  await openFeedback(page);
  const assets = [];
  page.on('request', request => assets.push(new URL(request.url()).pathname));
  await add(page).click();
  await expect(button(page, 'Highlight')).toHaveAttribute('aria-pressed', 'true');
  expect(assets.some(url => url.endsWith('/feedback-markup.js'))).toBe(true);
  await expect(message(page)).toBeHidden();
  await expect(button(page, 'Save feedback')).toHaveCount(0);
  await expect(button(page, 'Undo')).toBeDisabled();
  for (const name of ['Highlight', 'Circle', 'Note', 'Undo', 'Remove']) {
    const {width,height} = await button(page, name).boundingBox();
    expect(Math.min(width, height), name).toBeGreaterThanOrEqual(48);
  }
  expect(await page.locator('#sheet').evaluate(sheet => sheet.scrollWidth <= sheet.clientWidth)).toBe(true);

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
  await tap(page, .25, .72, touch);
  const note = page.getByRole('textbox', {name:'Note (sample details only)'});
  await expect(note).toBeFocused();
  const pinned = await pixels(page);
  await note.fill('<b>Sample note</b>');
  expect(await pixels(page)).not.toBe(pinned);
  await expect(page.locator('.feedback-markup b')).toHaveCount(0);
  await button(page, 'Undo').click();
  expect(await pixels(page)).toBe(circled);
  await tap(page, .25, .72, touch);
  await note.fill('<b>Sample note</b>');
  const jpeg = await canvas.evaluate(el => el.toDataURL('image/jpeg', .9));
  await button(page, 'Save screenshot').evaluate(el => { el.click(); el.click(); });
  await expect(message(page)).toHaveValue(draft);
  await expect(preview(page)).toHaveAttribute('src', jpeg);
  await expect(preview(page)).toHaveCount(1);
  await expect(preview(page)).toBeInViewport({ratio:.98});
  await expect(button(page, 'Remove')).toBeFocused();
  await expect(button(page, 'Save feedback')).toHaveCount(1);
  const decoded = Buffer.from(jpeg.split(',')[1], 'base64');
  expect([...decoded.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  expect([...decoded.subarray(-2)]).toEqual([0xff, 0xd9]);
  // A scaled click can round to a neighboring image pixel across browsers.
  const circleEdge = Array.from({length:7}, (_, i) => [260,217 + i]);
  const [highlight, noteBackground, untouched, ...circle] = await samplePixels(preview(page),
    [[100,100],[116,360],[20,20],...circleEdge]);
  expect(highlight[0]).toBeGreaterThan(untouched[0] + 50);
  expect(Math.max(...circle.map(([red]) => red))).toBeGreaterThan(untouched[0] + 70);
  expect(noteBackground[2]).toBeLessThan(untouched[2] - 25);

  const posted = page.waitForRequest(relay);
  await button(page, 'Save feedback').click();
  expect((await posted).postData()).toBe(expectedHomePayload);
  await expect(page.getByText('Sent to the marketing team.')).toBeVisible();
  const saved = await page.evaluate(() => localStorage.getItem('mktdemo.feedback'));
  expect(JSON.parse(saved)).toHaveLength(1);
  expect(saved).not.toContain('data:image/');
  expect(saved).not.toContain('Sample note');
  await expect(preview(page)).toHaveCount(0);
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
  for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
  await expect(surface(page)).toBeFocused();
  const center = await pixels(page);
  await page.keyboard.press('ArrowLeft');
  expect(await pixels(page)).not.toBe(center);
  await page.keyboard.press('Enter');
  await expect(button(page, 'Undo')).toBeEnabled();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(button(page, 'Undo')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(button(page, 'Circle')).toBeFocused();
  await expect(button(page, 'Undo')).toBeDisabled();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('#screenshot-note')).toBeFocused();
  await page.keyboard.type('Sample keyboard note');
  await page.keyboard.press('Escape');
  await expect(add(page)).toBeFocused();
  await expect(message(page)).toHaveValue(draft);
  await page.keyboard.press('Escape');
  await expect(opener(page)).toBeFocused();
});

test('Cancel, Close and Remove return to the same unsent form', async ({page}) => {
  await withFixedCapture(page);
  await openFeedback(page);
  await page.locator('#feedback-name').fill('Sample reviewer');
  for (const action of ['Cancel', 'Close', 'Remove']) {
    await add(page).click();
    await surface(page).press('Enter');
    await button(page, action).click();
    await expect(add(page)).toBeFocused();
    await expect(message(page)).toHaveValue(draft);
    await expect(page.locator('#feedback-name')).toHaveValue('Sample reviewer');
    await expect(preview(page)).toHaveCount(0);
  }
  await add(page).click();
  await button(page, 'Save screenshot').click();
  await expect(preview(page)).toBeVisible();
  await button(page, 'Remove').click();
  await expect(add(page)).toBeFocused();
  await expect(preview(page)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('mktdemo.feedback'))).toBeNull();
});

test('shows the masked opening page after typing and scrolling', async ({page}) => {
  await page.goto('./?theme=a#/other');
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
  await button(page, 'Save screenshot').click();
  const size = await preview(page).evaluate(async el => { await el.decode(); return [el.naturalWidth, el.naturalHeight]; });
  expect(size[0] / size[1]).toBeCloseTo(width / height, 2);
  const x = Math.round((original.x + original.width / 2) * size[0] / width);
  const y = Math.round((original.y + original.height / 2) * size[1] / height);
  const [mask] = await samplePixels(preview(page), [[x, y]]);
  for (const [index, value] of [104,120,138].entries()) expect(Math.abs(mask[index] - value)).toBeLessThan(12);
});

test('a refused staff capture leaves text feedback available and loads no editor', async ({page}) => {
  const assets = [];
  page.on('request', request => assets.push(request.url()));
  await openFeedback(page, '#/staff?show=all');
  await add(page).click();
  await expect(page.getByRole('status')).toContainText('You can still send text feedback.');
  await expect(add(page)).toBeFocused();
  await expect(message(page)).toHaveValue(draft);
  expect(assets.some(url => url.endsWith('/feedback-markup.js'))).toBe(false);
  await expect(preview(page)).toHaveCount(0);
  await button(page, 'Save feedback').click();
  await expect(page.getByText('Sent to the marketing team.')).toBeVisible();
});

const expectedHomePayload = '{"type":"feedback","message":"Sample: add a <label> & keep the colors.","name":"","page":"“What do you need?”","route":"#/","theme":"a"}';

test('text-only feedback matches main byte for byte', async ({page}) => {
  const requests = [];
  page.on('request', request => requests.push(request));
  await openFeedback(page);
  const posted = page.waitForRequest(relay);
  await button(page, 'Save feedback').click();
  expect((await posted).postData()).toBe(expectedHomePayload);
  await expect(page.getByText('Sent to the marketing team.')).toBeVisible();
  expect(requests.filter(request => request.url() === relay)).toHaveLength(1);
  expect(requests.some(request => request.url().endsWith('/feedback-markup.js'))).toBe(false);
});
