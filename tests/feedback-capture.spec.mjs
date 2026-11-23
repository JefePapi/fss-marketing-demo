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
  return readCapture(page);
}

async function readCapture(page) {
  return page.evaluate(async () => {
    const {capture} = await import('./js/lazy/feedback-capture.js');
    const {canvas, ...result} = capture();
    return {...result, png:canvas?.toDataURL('image/png')};
  });
}

async function imageComparison(page, png, reference, {box, ink, geometry} = {}) {
  return page.evaluate(async ({png, reference, box, ink, geometry}) => {
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
    const expected = await pixels('data:image/png;base64,' + reference);
    if (actual.width !== expected.width || actual.height !== expected.height) throw new Error('Reference size differs');
    const {width,height} = actual;
    const region = box || {x:0,y:0,width,height};
    const left = Math.max(0, Math.ceil(region.x));
    const top = Math.max(0, Math.ceil(region.y));
    const right = Math.min(width, Math.floor(region.x + region.width));
    const bottom = Math.min(height, Math.floor(region.y + region.height));
    let different = 0, referenceInk = 0, matchedInk = 0;
    const luminance = (data, at) => (data[at] + data[at+1] + data[at+2]) / 3;
    const closeColor = (a, b, at, threshold, other = at) =>
      Math.abs(a[at] - b[other]) <= threshold && Math.abs(a[at+1] - b[other+1]) <= threshold &&
      Math.abs(a[at+2] - b[other+2]) <= threshold;
    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        const at = (y * width + x) * 4;
        if (!closeColor(actual.data, expected.data, at, 40)) different++;
        if (ink && closeColor(expected.data, ink, at, 22, 0)) {
          referenceInk++;
          if (closeColor(actual.data, expected.data, at, 38)) matchedInk++;
        }
      }
    }
    const badMasks = (geometry?.masks || []).flatMap(({id,x,y,width:maskWidth,height:maskHeight}) => {
      for (let py = Math.ceil(y + 1); py < y + maskHeight - 1; py++) {
        for (let px = Math.ceil(x + 1); px < x + maskWidth - 1; px++) {
          const at = (py * width + px) * 4;
          if (actual.data[at] !== 104 || actual.data[at+1] !== 120 ||
              actual.data[at+2] !== 138 || actual.data[at+3] !== 255) return [{id, px, py}];
        }
      }
      return [];
    });
    // Independently check the position and width of each line.
    const lines = (geometry?.lines || []).map(({label,x,y,width:lineWidth,height:lineHeight}) => {
      let count = 0, matched = 0;
      for (let py = Math.max(2, Math.ceil(y)); py < Math.min(height-2, y + lineHeight); py++) {
        for (let px = Math.max(0, Math.ceil(x)); px < Math.min(width, x + lineWidth); px++) {
          const at = (py * width + px) * 4;
          const background = luminance(expected.data, (Math.max(0, Math.floor(y)) * width + px) * 4);
          const contrast = luminance(expected.data, at) - background;
          if (Math.abs(contrast) < 60) continue;
          count++;
          for (let dy = -2; dy <= 2; dy++) {
            const candidate = ((py + dy) * width + px) * 4;
            if ((luminance(actual.data, candidate) - background) * Math.sign(contrast) >= 60) {
              matched++;
              break;
            }
          }
        }
      }
      return {label, referenceInk:count, match:count ? matched / count : 0};
    });
    return {different: different / ((right-left) * (bottom-top)), badMasks, lines,
      referenceInk, matchedInk:referenceInk ? matchedInk / referenceInk : 0};
  }, {png, reference:reference.toString('base64'), box, ink, geometry});
}

async function referenceScreenshot(page, testInfo, name, mask) {
  await expect(page).toHaveScreenshot(name, {
    mask: [page.locator(mask)], maskColor, scale:'css', maxDiffPixelRatio:.004,
  });
  return readFile(testInfo.snapshotPath(name, {kind:'screenshot'}));
}

async function textLines(page, selectors) {
  return page.evaluate(selectors => selectors.flatMap(label => {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector(label));
    return [...range.getClientRects()].filter(rect => rect.width > 1)
      .map(({x,y,width,height}) => ({label,x,y,width,height}));
  }), selectors);
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
    const reference = await referenceScreenshot(page, testInfo, `capture-${theme}.png`, privateContent);

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
      const lines = ['#file-limits','label[for=o-new]','label[for=o-files]'].flatMap(label => {
        range.selectNodeContents(document.querySelector(label));
        return [...range.getClientRects()].map(({x,y,width,height}) => ({label,x,y,width,height}));
      });
      return {masks, lines, bannerBottom};
    }, privateContent);
    expect(geometry.masks.map(mask => mask.id)).toEqual(expect.arrayContaining([
      'o-new', 'o-files', 'file-item', 'capture-fixture-unknown',
    ]));
    const limitLines = geometry.lines.filter(line => line.label === '#file-limits');
    expect(limitLines.length).toBeGreaterThanOrEqual(before.width === 390 ? 3 : 1);
    expect(geometry.lines.map(line => line.label)).toEqual(expect.arrayContaining([
      'label[for=o-new]', 'label[for=o-files]',
    ]));

    const result = await openCapture(page);
    expect(result).toMatchObject({ok:true, viewport:{...before, page:'other', theme}});
    // Playwright's masks overlay even the sticky banner. Compare the form
    // below it, where the browser reference and the reconstruction agree on stacking.
    const box = {x:0,y:geometry.bannerBottom,width:before.width,height:before.height-geometry.bannerBottom};
    const fidelity = await imageComparison(page, result.png, reference, {box,geometry});
    expect(fidelity.badMasks).toEqual([]);
    expect(fidelity.different).toBeLessThan(.03);
    for (const {label, referenceInk, match} of fidelity.lines) {
      expect(referenceInk, label).toBeGreaterThan(15);
      expect(match, label).toBeGreaterThan(.85);
    }
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

for (const theme of ['a', 'a-light']) {
  test(`Night Wall Home artwork and title match at scroll zero in ${theme}`, async ({page}, testInfo) => {
    await page.goto('./?theme=' + theme + '#/');
    await expect(page.locator('.poster-wall svg').first()).toBeAttached();
    const hero = await page.locator('.hero').boundingBox();
    const phone = page.viewportSize().width === 390;
    const box = phone ? {...hero,height:100} :
      {x:hero.width*.6,y:hero.y,width:hero.width*.4,height:hero.height};
    const lines = await textLines(page, ['.hero h1']);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    const reference = await referenceScreenshot(page, testInfo, `capture-home-${theme}.png`, '#theme-select');
    await page.locator(phone ? banner : '#feedback-open').click();
    await expect(page.locator('#feedback-message')).toBeFocused();
    const result = await readCapture(page);
    expect(result).toMatchObject({ok:true,viewport:{page:'home',theme,scrollY:0}});
    const fidelity = await imageComparison(page, result.png, reference, {box,geometry:{lines}});
    expect(fidelity.different).toBeLessThan(.18);
    for (const {referenceInk, match} of fidelity.lines) {
      expect(referenceInk).toBeGreaterThan(100);
      expect(match).toBeGreaterThan(.80);
    }
  });
}

for (const [theme, artSelector] of [['a','.step-print'],['c','.step-art']]) {
  test(`The ${theme} wizard illustration matches a browser reference`, async ({page}, testInfo) => {
    test.skip(theme === 'a' && testInfo.project.name === 'phone-390', 'Night Wall hides the step art on phones');
    await page.goto('./?theme=' + theme + '#/request');
    const art = page.locator(artSelector);
    await expect(art).toBeInViewport({ratio:.95});
    const box = await art.boundingBox();
    const ink = theme === 'a' ? [51,35,27] : [72,123,255];
    const reference = await referenceScreenshot(page, testInfo, `capture-wizard-${theme}.png`, '#theme-select,#app input');
    const result = await openCapture(page);
    expect(result).toMatchObject({ok:true,viewport:{theme,page:'request',scrollY:0}});
    const fidelity = await imageComparison(page, result.png, reference, {box,ink});
    expect(fidelity.different).toBeLessThan(.25);
    expect(fidelity.referenceInk).toBeGreaterThan(100);
    expect(fidelity.matchedInk).toBeGreaterThan(theme === 'a' ? .90 : .60);
  });
}

test('An extra live path inside the Night Wall wizard illustration is never painted', async ({page}, testInfo) => {
  test.skip(testInfo.project.name === 'phone-390', 'Night Wall hides the step art on phones');
  await page.goto('./?theme=a#/request');
  const art = page.locator('.step-print > svg');
  await expect(art).toBeVisible();
  await art.evaluate(svg => {
    const triangle = document.createElementNS(svg.namespaceURI, 'path');
    triangle.setAttribute('d', 'M10 10 L80 10 L45 72 Z');
    triangle.setAttribute('fill', '#ff00ff');
    svg.append(triangle);
  });
  await page.locator(banner).click();
  await expect(page.locator('#feedback-message')).toBeFocused();
  const outcome = await page.evaluate(async () => {
    const {capture} = await import('./js/lazy/feedback-capture.js');
    const {ok,reason,canvas} = capture();
    if (!ok) return {ok,reason};
    const data = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let trianglePixels = 0;
    for (let i = 0; i < data.length; i += 4)
      if (data[i] > 245 && data[i+1] < 15 && data[i+2] > 245) trianglePixels++;
    return {ok,trianglePixels};
  });
  expect(outcome).toEqual(outcome.ok ? {ok:true,trianglePixels:0} : {ok:false,reason:'misleading-preview'});
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

test('A fully obscured public preview is refused', async ({page}) => {
  await page.goto('./?theme=a#/other');
  await expect(page.locator('#app h1')).toBeVisible();
  await page.evaluate(() => {
    const panel = document.createElement('unknown-preview-panel');
    panel.style.cssText = 'position:fixed;inset:0;z-index:50;pointer-events:none';
    document.body.append(panel);
  });
  expect(await openCapture(page)).toMatchObject({ok:false,reason:'misleading-preview',png:undefined});
});

test('The public month keeps its heading, weekdays and day numbers', async ({page}) => {
  await page.goto('./?theme=a#/calendar?view=month');
  const title = page.locator('#month-title');
  await expect(title).toBeVisible();
  const month = await title.textContent();
  await title.evaluate(el => scrollTo(0, scrollY + el.getBoundingClientRect().top - 75));
  await page.locator('#month-grid > .cell').first().evaluate(cell => {
    const event = document.createElement('button');
    event.className = 'evchip';
    event.dataset.test = 'cal-event';
    event.textContent = 'private-example@example.com';
    cell.append(event);
  });
  const labels = await captureText(page);
  expect(labels).toEqual(expect.arrayContaining([month,'Sun','Mon','Tue','Wed','Thu','Fri','Sat','1','2','3','4','5','6','7']));
  expect(labels).not.toContain('private-example@example.com');
});

test('The public Activities list keeps sample titles and hours and masks unknown details', async ({page}) => {
  await page.goto('./?theme=a#/activities');
  const cards = page.locator('[data-test=activity-card]');
  await expect(cards.first()).toBeVisible();
  await cards.first().evaluate(el => {
    const privateDetail = document.createElement('span');
    privateDetail.textContent = 'private-example@example.com';
    el.append(privateDetail);
  });
  const labels = await captureText(page);
  expect(labels).toEqual(expect.arrayContaining(['Activities','Fitness Center · 2 areas',expect.stringMatching(/^Today: /)]));
  expect(labels).not.toContain('private-example@example.com');
});

async function captureText(page) {
  await page.evaluate(() => {
    const fill = CanvasRenderingContext2D.prototype.fillText;
    window.captureLabels = [];
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      window.captureLabels.push(text);
      return fill.call(this, text, ...args);
    };
  });
  expect(await openCapture(page)).toMatchObject({ok:true});
  return page.evaluate(() => window.captureLabels);
}

test.describe('High pixel density', () => {
  test.use({deviceScaleFactor:2});
  test('Feedback defers capture, sizes the raster and clears it on close or navigation', async ({page}) => {
    await page.goto('./?theme=a#/other');
    await expect(page.locator('#app h1')).toBeVisible();
    await page.evaluate(() => {
      const create = document.createElement.bind(document);
      window.captureCanvases = 0;
      document.createElement = (tag, ...args) => {
        if (tag === 'canvas') window.captureCanvases++;
        return create(tag, ...args);
      };
    });
    await page.locator(banner).click();
    await expect(page.locator('#feedback-message')).toBeFocused();
    expect(await page.evaluate(() => window.captureCanvases)).toBe(0);
    const size = await page.evaluate(async () => {
      const {capture} = await import('./js/lazy/feedback-capture.js');
      const {canvas} = capture();
      return {width:canvas.width,height:canvas.height,cssWidth:canvas.style.width,cssHeight:canvas.style.height};
    });
    const {width,height} = page.viewportSize();
    const scale = 1280 / Math.max(width,height);
    expect(size).toEqual({width:Math.round(width*scale),height:Math.round(height*scale),
      cssWidth:width + 'px',cssHeight:height + 'px'});
    await page.locator('#sheet-close').click();
    expect(await readCapture(page)).toMatchObject({ok:false,reason:'no-snapshot'});
    await page.locator(banner).click();
    await expect(page.locator('#feedback-message')).toBeFocused();
    expect(await readCapture(page)).toMatchObject({ok:true,viewport:{page:'other'}});
    await page.evaluate(() => { location.hash = '#/'; });
    await expect(page.locator('.hero h1')).toBeVisible();
    expect(await readCapture(page)).toMatchObject({ok:false,png:undefined});
  });
});
