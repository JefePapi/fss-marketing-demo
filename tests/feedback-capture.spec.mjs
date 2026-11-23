import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const themes = ['a', 'a-light', 'b', 'c', 'current'];
const maskColor = '#68788a';
const banner = '[data-test=feedback-banner]';
const privateContent = '#theme-select, #app input:not(#f-website), #app select, #app textarea, [data-test=file-item], #capture-fixture-unknown';

test.use({reducedMotion:'reduce'});

test.beforeEach(async ({page}) => {
  await page.route('https://challenges.cloudflare.com/**', route => route.abort());
});

async function openCapture(page) {
  await page.locator(banner).evaluate(button => button.click());
  await expect(page.locator('#feedback-message')).toBeFocused();
  return page.evaluate(async () => {
    const {capture} = await import('./js/lazy/feedback-capture.js');
    const {canvas, ...result} = capture();
    return {...result, png:canvas?.toDataURL('image/png')};
  });
}

for (const theme of themes) {
  test(`Scrolled ${theme} capture matches the masked other-request page`, async ({page}, testInfo) => {
    await page.goto('./?theme=' + theme + '#/other');
    await page.locator('#o-new').fill('SAMPLE FORM TEXT');
    await page.locator('#o-files').setInputFiles({
      name:'sample-capture-filename.txt', mimeType:'text/plain', buffer:Buffer.from('Sample file only'),
    });
    await expect(page.locator('[data-test=file-item]')).toContainText('sample-capture-filename.txt');
    await page.evaluate(async () => {
      const {h} = await import('./js/ui.js');
      // A label-shaped value in an unapproved slot must still get masked.
      document.querySelector('#o-send').before(h('p', {id:'capture-fixture-unknown'}, 'Your name'));
      document.activeElement.blur();
      const field = document.querySelector('#o-new').closest('.field');
      const bannerBottom = document.querySelector('#demo-banner').getBoundingClientRect().bottom;
      scrollTo(0, scrollY + field.getBoundingClientRect().top - bannerBottom - 4);
    });
    const before = await page.evaluate(() => ({
      scrollX, scrollY, width:visualViewport.width, height:visualViewport.height,
    }));
    expect(before.scrollY).toBeGreaterThan(100);
    await expect(page.locator('#o-new')).toBeInViewport({ratio:0.5});
    await expect(page.locator('#o-files')).toBeInViewport();
    await expect(page.locator('[data-test=file-item]')).toBeInViewport();
    await expect(page.locator('#capture-fixture-unknown')).toBeInViewport();

    // This reference is the actual page before opening Feedback, with
    // Playwright masking the sensitive slots independently of the renderer.
    const reference = `capture-${theme}.png`;
    await expect(page).toHaveScreenshot(reference, {
      mask: [page.locator(privateContent)], maskColor, scale:'css', maxDiffPixelRatio:.004,
    });

    const geometry = await page.evaluate(selectors => {
      const bounds = el => {
        const {x,y,width,height} = el.getBoundingClientRect();
        return {x,y,width,height};
      };
      const bannerBottom = document.querySelector('#demo-banner').getBoundingClientRect().bottom;
      const masks = [...document.querySelectorAll(selectors)].map(el => {
        const b = bounds(el);
        const x = Math.max(0, b.x), y = Math.max(el.id === 'theme-select' ? 0 : bannerBottom, b.y);
        return {id:el.id || el.dataset.test, x, y,
          width:Math.min(visualViewport.width, b.x + b.width) - x,
          height:Math.min(visualViewport.height, b.y + b.height) - y};
      }).filter(b => b.width > 4 && b.height > 4);
      const range = document.createRange();
      range.selectNodeContents(document.querySelector('#file-limits'));
      return {masks, lines:[...range.getClientRects()].map(({x,y,width,height}) => ({x,y,width,height}))};
    }, privateContent);
    expect(geometry.masks.map(mask => mask.id)).toEqual(expect.arrayContaining([
      'o-new', 'o-files', 'file-item', 'capture-fixture-unknown',
    ]));
    if (before.width === 390) expect(geometry.lines.length).toBeGreaterThanOrEqual(3);

    const result = await openCapture(page);
    expect(result).toMatchObject({ok:true, viewport:{...before, page:'other', theme}});
    const referencePng = await readFile(testInfo.snapshotPath(reference, {kind:'screenshot'}));
    const fidelity = await page.evaluate(async ({png, referencePng, geometry}) => {
      const pixels = async src => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, img.width, img.height);
      };
      const actual = await pixels(png);
      const expected = await pixels('data:image/png;base64,' + referencePng);
      const delta = (a, b, i) => Math.max(...[0,1,2].map(j => Math.abs(a[i+j] - b[i+j])));
      let different = 0;
      for (let i = 0; i < actual.data.length; i += 4) if (delta(actual.data, expected.data, i) > 45) different++;
      const badMasks = geometry.masks.flatMap(({id,x,y,width,height}) => {
        for (let py = Math.ceil(y + 1); py < y + height - 1; py++) {
          for (let px = Math.ceil(x + 1); px < x + width - 1; px++) {
            const at = (py * actual.width + px) * 4;
            if (actual.data[at] !== 104 || actual.data[at+1] !== 120 ||
                actual.data[at+2] !== 138 || actual.data[at+3] !== 255) return [{id, px, py, color:[...actual.data.slice(at, at+4)]}];
          }
        }
        return [];
      });
      // Check the position and width of each wrapped line independently.
      // Match ink pixels within a two-pixel rasterization tolerance.
      const lines = geometry.lines.map(({x,y,width,height}) => {
        let ink = 0, matched = 0;
        for (let py = Math.ceil(y); py < y + height; py++) {
          for (let px = Math.ceil(x); px < x + width; px++) {
            const i = (py * actual.width + px) * 4;
            const luminance = (data, at) => (data[at] + data[at+1] + data[at+2]) / 3;
            const background = luminance(expected.data, (Math.floor(y) * actual.width + px) * 4);
            if (Math.abs(luminance(expected.data, i) - background) < 60) continue;
            ink++;
            for (let dy = -2; dy <= 2; dy++) {
              const candidate = ((py + dy) * actual.width + px) * 4;
              if (Math.abs(luminance(actual.data, candidate) - background) >= 60) {
                matched++;
                break;
              }
            }
          }
        }
        return ink ? matched / ink : 0;
      });
      return {different: different / (actual.width * actual.height), badMasks, lines};
    }, {png:result.png, referencePng:referencePng.toString('base64'), geometry});

    if (fidelity.badMasks.length || fidelity.different >= .045 || fidelity.lines.some(match => match <= .8)) {
      await testInfo.attach('reconstruction', {
        body:Buffer.from(result.png.split(',')[1], 'base64'), contentType:'image/png',
      });
    }
    expect(fidelity.badMasks).toEqual([]);
    expect(fidelity.different).toBeLessThan(.045);
    for (const match of fidelity.lines) expect(match).toBeGreaterThan(.8);
  });
}

test('The public request wizard can capture all five designs', async ({page}) => {
  for (const theme of themes) {
    await page.goto('./?theme=' + theme + '#/request');
    await expect(page.locator('#step-1')).toBeVisible();
    await page.evaluate(() => scrollTo(0, 100));
    const result = await openCapture(page);
    expect(result).toMatchObject({ok:true,viewport:{theme,page:'request'}});
    await page.locator('#sheet-close').click();
  }
});

test('Sheet focus, scrolling and a keyboard-sized resize leave the remembered capture alone', async ({page}) => {
  await page.goto('./?theme=a#/other');
  await page.locator('#o-text').evaluate(el => window.scrollTo(0, el.offsetTop - 40));
  const {width, height} = page.viewportSize();
  const original = await openCapture(page);
  expect(original).toMatchObject({ok:true, viewport:{width,height}});
  expect(original.viewport.scrollY).toBeGreaterThan(0);

  await page.locator('#feedback-message').fill('SAMPLE SHEET TEXT');
  await page.setViewportSize({width,height:height - 300});
  await page.evaluate(() => scrollTo(0, 0));
  const after = await page.evaluate(async () => {
    const {capture} = await import('./js/lazy/feedback-capture.js');
    const result = capture();
    return {viewport:result.viewport, png:result.canvas.toDataURL('image/png')};
  });
  expect(after).toEqual({viewport:original.viewport, png:original.png});
});

test('Staff, manager and record details cannot produce a capture', async ({page}) => {
  const routes = [
    ['staff','staff-view'], ['staff/notifications','staff-view'], ['staff/feedback','staff-view'],
    ['staff/sample','staff-view'], ['manager','staff-view'], ['status/sample','record-detail'],
    ['sent/sample','record-detail'], ['activities/bowling','record-detail'],
  ];
  for (const [route,reason] of routes) {
    // Reload between routes so the staff demo preference cannot contaminate a visitor case.
    await page.goto('./?theme=a#/' + route);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#app h1')).toBeVisible();
    const result = await openCapture(page);
    expect(result).toMatchObject({ok:false, reason, message:expect.any(String)});
    expect(result.png).toBeUndefined();
  }
  await page.goto('./?theme=a#/staff');
  await page.goto('./?theme=a#/request');
  await expect(page.locator('#staff-toggle')).toHaveAttribute('aria-pressed', 'true');
  expect(await openCapture(page)).toMatchObject({ok:false, reason:'staff-view', png:undefined});

  await page.goto('./?theme=a#/calendar?view=list');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('[data-test=cal-event]').first().click();
  await expect(page.locator('#event-detail')).toBeVisible();
  expect(await openCapture(page)).toMatchObject({ok:false,reason:'record-detail',png:undefined});
});

test('A dominant unsupported effect rejects the preview', async ({page}) => {
  await page.goto('./?theme=a#/other');
  await expect(page.locator('#app h1')).toBeVisible();
  await page.locator('#app form').evaluate(form => { form.style.filter = 'blur(12px)'; });
  const result = await openCapture(page);
  expect(result).toMatchObject({ok:false, reason:'misleading-preview', message:expect.any(String)});
  expect(result.png).toBeUndefined();
});
