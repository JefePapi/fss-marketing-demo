import { approvedLabel, captureRoute, DESIGNS, messages } from './feedback-capture-policy.js';
import { snapshotBoxStyle, paintBox, prepareVector } from './feedback-capture-style.js';
import { themeHero, themeHomeArt, themeIcon, themeStepArt } from '../theme.js';

const MASK = '#68788a';
const MAX_EDGE = 1280;
const MAX_ELEMENTS = 2500;
const MAX_UNSUPPORTED = .12;
const MAX_MASKED = .50;
const SHELL = '.atmo,#demo-banner,.site-head,#app,#toast,#site-footer,#feedback-open';
const PRIVATE = 'input,textarea,select,[contenteditable]:not([contenteditable=false]),' +
  '[data-test=file-item],[data-test=attachment],[data-test=my-request],' +
  '.facts dd,.metric dd,#email-suggest,#reminder,#activity-info';
const STRUCTURE = new Set('A ARTICLE ASIDE B BUTTON DD DETAILS DIV DL DT EM FIELDSET FOOTER FORM H1 H2 H3 HEADER I LABEL LEGEND LI MAIN NAV OL P SECTION SMALL SPAN STRONG SUMMARY TABLE TBODY TD TH THEAD TIME TR UL'.split(' '));
const CLIPS = /^(hidden|clip|auto|scroll)$/;

const rejected = reason => ({ok:false, reason, message:messages[reason]});
let opening;

function invalidateOpening() {
  if (opening) opening.invalidated = true;
}
window.addEventListener('hashchange', invalidateOpening);
window.addEventListener('designchange', invalidateOpening);

// Measure before the sheet or its focus can move the page. Defer raster work.
export function rememberCapture() {
  const snapshot = opening = {
    route:location.hash, view:document.querySelector('#app > .glass'),
    theme:document.documentElement.dataset.theme,
  };
  try { snapshot.scene = measureOpening(); }
  catch { snapshot.scene = rejected('misleading-preview'); }
  return () => { if (opening === snapshot) opening = undefined; };
}

export function capture() {
  if (!opening) return rejected('no-snapshot');
  const {theme, route, view, scene, invalidated} = opening;
  if (invalidated || location.hash !== route || (view && !view.isConnected) ||
      document.documentElement.dataset.theme !== theme) {
    opening = undefined;
    return rejected('misleading-preview');
  }
  if (!scene.ok) return scene;
  if (document.querySelector('#staff-toggle[aria-pressed=true],.route-staff,.route-manager'))
    return rejected('staff-view');
  if (document.querySelector('#event-detail,.route-sent')) return rejected('record-detail');
  try {
    if (opening.result) return opening.result;
    const result = scene.render();
    if (result.ok) opening.result = result;
    return result;
  } catch { return rejected('misleading-preview'); }
}

function readViewport() {
  const root = document.documentElement, visual = window.visualViewport;
  return {
    scrollX:window.scrollX, scrollY:window.scrollY,
    width:Math.round(visual?.width ?? root.clientWidth), height:Math.round(visual?.height ?? root.clientHeight),
    offsetX:visual?.offsetLeft ?? 0, offsetY:visual?.offsetTop ?? 0,
    scale:visual?.scale ?? 1, theme:root.dataset.theme,
  };
}

function boxOf({x, y, width, height}, viewport) {
  return {x:x - viewport.offsetX, y:y - viewport.offsetY, width, height};
}

function intersection(a, b) {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  return {x, y, width:Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x),
    height:Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y)};
}

function measureOpening() {
  const root = document.documentElement;
  const app = document.getElementById('app');
  const path = location.hash.replace(/^#\/?/, '').split('?')[0];
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const refusal = captureRoute(parts, {
    staff:!!document.querySelector('#staff-toggle[aria-pressed=true],.route-staff,.route-manager'),
    detail:!!document.querySelector('#event-detail,.route-sent'),
  });
  if (refusal) return rejected(refusal);
  const page = parts[0] || '';
  const viewport = Object.freeze({...readViewport(), page:page || 'home'});
  const {width, height, theme} = viewport;
  if (!DESIGNS.has(theme) || !app?.classList.contains('route-' + viewport.page) ||
      !opening.view || document.querySelector('.sheet-wrap,dialog[open]') ||
      root.querySelector('link[data-staged]') || viewport.scale !== 1 || width < 1 || height < 1)
    return rejected('misleading-preview');

  const scale = Math.min(window.devicePixelRatio || 1, MAX_EDGE / Math.max(width, height));
  const vmax = Math.max(window.innerWidth, window.innerHeight) / 100;
  const bounds = {x:0, y:0, width, height};
  const commands = [];
  const paint = draw => commands.push(draw);
  const clipPath = box => {
    const path = new Path2D();
    path.rect(box.x, box.y, box.width, box.height);
    return path;
  };
  let missing = 0, masked = 0, visited = 0;
  let projection;
  const area = box => box.width * box.height;
  const flag = (box, clip) => { missing += area(intersection(box, clip)); };
  const mask = (box, clip) => {
    const x = Math.floor(box.x), y = Math.floor(box.y);
    const width = Math.ceil(box.x + box.width) - x, height = Math.ceil(box.y + box.height) - y;
    const visible = intersection({x, y, width, height}, clip);
    if (!area(visible)) return;
    masked += area(visible);
    paint((ctx, color) => {
      ctx.save();
      // Privacy masks stay opaque inside translucent controls and panels.
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, width, height);
      ctx.restore();
    });
  };
  const measuredBox = rect => {
    const box = boxOf(rect, viewport);
    return projection ? projection.box(box) : box;
  };

  const isNightWall = theme === 'a' || theme === 'a-light';
  const heroArtSelector = {b:'.hero.hud > .survey > svg.terrain', c:'.hero > .hero-art > svg.ribbon'}[theme];
  // Import only the active theme, and take the trusted SVG from its generator.
  const heroArt = page === '' && heroArtSelector && app.querySelector(heroArtSelector);
  const posters = new Map();
  const wall = isNightWall && app.querySelector('.route-home > .glass > .hero > .poster-wall');
  if (wall) {
    const originals = themeHero().querySelector('.poster-wall').children;
    [...wall.children].forEach((poster, index) => {
      if (poster.matches('.poster') && originals[index]?.matches('.poster'))
        posters.set(poster, originals[index]);
    });
  }

  const range = document.createRange();
  function drawText(node, parent, style, clip) {
    const text = node.data;
    if (!text.trim()) return;
    const posterTitle = parent.matches('.poster > b') && posters.get(parent.parentElement)?.lastChild.textContent;
    if (posterTitle !== text.trim() && !approvedLabel(parent, page, text.trim())) {
      const box = measuredBox(parent.getBoundingClientRect());
      if (parent.childNodes.length === 1 && area(box)) mask(box, clip);
      else {
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) mask(measuredBox(rect), clip);
      }
      return;
    }
    const {fontStyle, fontWeight, fontSize, fontFamily, color, letterSpacing, wordSpacing,
      textTransform, textDecorationLine, textDecorationThickness, textUnderlineOffset} = style;
    // Measure browser line breaks, including words split within a narrow line.
    // Draw a whole line fragment at once to retain the font's kerning.
    const lines = [];
    for (let i = 0; i < text.length; i++) {
      if (/\s/.test(text[i])) continue;
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const rect = range.getBoundingClientRect();
      const box = measuredBox(rect);
      const last = lines.at(-1);
      if (last && Math.abs(last.y - box.y) < .25) {
        last.end = i + 1;
        last.width = box.x + box.width - last.x;
      } else lines.push({...box, start:i, end:i + 1});
    }
    paint(ctx => {
      ctx.font = [fontStyle, fontWeight, fontSize, fontFamily].join(' ');
      ctx.fillStyle = color;
      ctx.letterSpacing = letterSpacing === 'normal' ? '0px' : letterSpacing;
      ctx.wordSpacing = wordSpacing === 'normal' ? '0px' : wordSpacing;
      const metrics = ctx.measureText('M');
      for (const line of lines) {
        if (!area(intersection(line, clip))) continue;
        let value = text.slice(line.start, line.end).replace(/\s+/g, ' ');
        if (textTransform === 'uppercase') value = value.toUpperCase();
        if (textTransform === 'lowercase') value = value.toLowerCase();
        const sizing = ctx.measureText(value);
        const baseline = line.y + (line.height + metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2;
        if (!Number.isFinite(baseline) || Math.abs(sizing.width - line.width) > Math.max(3, line.width * .09)) {
          flag(line, clip);
          if (!Number.isFinite(baseline)) continue;
        }
        ctx.fillText(value, line.x, baseline);
        if (textDecorationLine.includes('underline')) {
          const thickness = parseFloat(textDecorationThickness) || 1;
          const offset = parseFloat(textUnderlineOffset) || 2;
          ctx.fillRect(line.x, Math.round(baseline + offset), line.width, thickness);
        }
      }
    });
  }

  function artwork(el, box, clip, style) {
    if (el.matches('#feedback-open > svg, #brand > svg')) {
      const feedback = el.parentElement.id === 'feedback-open';
      const side = feedback ? 24 : 32;
      const scale = Math.min(box.width, box.height) / side;
      const color = style.color;
      paint(ctx => {
        ctx.save();
        ctx.translate(box.x + (box.width - side * scale) / 2, box.y + (box.height - side * scale) / 2);
        ctx.scale(scale, scale);
        ctx.fillStyle = ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        if (feedback) ctx.stroke(new Path2D('M21 11a8 8 0 0 1-8 8H9l-6 3 1.5-6A8 8 0 1 1 21 11Z M8 10h8m-8 4h5'));
        else if (theme === 'a' || theme === 'a-light') {
          ctx.fill(new Path2D('M2 23 12 5h6L8 23z M12 27 22 9h6L18 27z M22 27l7-12v12z'));
        } else if (theme === 'c') {
          for (const [path, ink] of [['M1 23 10 7h7L8 23Z','#82abff'], ['m10 7 8 18h7L17 7Z','#eef9ff'],
            ['m18 25 9-17h5l-7 17Z','#57dedb']]) {
            ctx.fillStyle = ink;
            ctx.fill(new Path2D(path));
          }
        } else {
          ctx.beginPath();
          ctx.arc(16, 16, 13, 0, Math.PI * 2);
          ctx.stroke();
          const needle = new Path2D('M22 10 18 18 10 22 14 14Z');
          if (theme === 'b') ctx.fill(needle);
          else ctx.stroke(needle);
        }
        ctx.restore();
      });
      return;
    }

    let original;
    if (el === heroArt) original = themeHomeArt();
    else if (el.matches('.route-request .step-head > :is(.step-print,.step-art) > svg'))
      original = themeStepArt(Number(el.closest('.step-head').dataset.step))?.firstChild;
    else if (el.matches('.poster > svg')) original = posters.get(el.parentElement)?.firstChild;
    else if (isNightWall && el.matches('.route-home .shortcut-icon > svg')) {
      const route = { 'start-other':'other', 'go-activities':'activities', 'go-calendar':'calendar' }[el.closest('.shortcut')?.id];
      if (route) original = themeIcon(route);
    }
    if (original?.isEqualNode(el)) {
      const screen = el.getScreenCTM();
      if (screen) {
        const matrix = new DOMMatrix().translate(-viewport.offsetX, -viewport.offsetY).multiply(screen);
        const draw = prepareVector(el, projection ? projection.inverse.multiply(matrix) : matrix);
        if (draw) {
          const opacity = +style.opacity;
          const path = clipPath(box);
          const terrain = theme === 'b' && el === heroArt;
          const clipArt = el === heroArt;
          paint(ctx => {
            ctx.save();
            if (clipArt) ctx.clip(path);
            if (terrain) paintTerrain(ctx, box, opacity, draw);
            else draw(ctx);
            ctx.restore();
          });
          return;
        }
      }
    }
    // Only loaded demo thumbnails can contribute image pixels. Their URLs
    // are fixed filenames under the app directory; no source is requested here.
    if (el instanceof HTMLImageElement && el.parentElement.matches('.design-swatch') &&
        el.closest('.route-home') && el.complete && el.naturalWidth && el.naturalHeight &&
        [...DESIGNS].some(id => el.currentSrc === new URL('./img/themes/' + id + '.webp', location.href).href)) {
      const {currentSrc, naturalWidth, naturalHeight} = el;
      const scale = Math.max(box.width / naturalWidth, box.height / naturalHeight);
      const w = naturalWidth * scale, h = naturalHeight * scale;
      const path = clipPath(box);
      paint(ctx => {
        if (!el.complete || el.currentSrc !== currentSrc || el.naturalWidth !== naturalWidth ||
            el.naturalHeight !== naturalHeight) throw new Error('Capture thumbnail changed');
        ctx.save();
        ctx.clip(path);
        ctx.drawImage(el, box.x + (box.width - w) * .5, box.y + (box.height - h) * .36, w, h);
        ctx.restore();
      });
      return;
    }
    mask(box, clip);
    flag(box, clip);
  }

  function paintTransformed(el, box, clip, matrix) {
    // A uniform scale/rotation projects a local rectangle to a larger bounding box.
    // Undo that projection for layout measurement while applying the same transform to the paint.
    const forward = new DOMMatrix([matrix.a,matrix.b,matrix.c,matrix.d,box.x + box.width/2,box.y + box.height/2]);
    const inverse = forward.inverse();
    const a = Math.abs(matrix.a), b = Math.abs(matrix.b), determinant = a*a - b*b;
    projection = {inverse, box(rect) {
      const center = inverse.transformPoint({x:rect.x + rect.width/2, y:rect.y + rect.height/2});
      const width = Math.max(0, (a*rect.width - b*rect.height) / determinant);
      const height = Math.max(0, (a*rect.height - b*rect.width) / determinant);
      return {x:center.x - width/2,y:center.y - height/2,width,height};
    }};
    const local = new Path2D();
    local.rect(clip.x, clip.y, clip.width, clip.height);
    const transformed = new Path2D();
    transformed.addPath(local, inverse);
    const extent = projection.box(box);
    const {a:xx,b:yx,c:xy,d:yy,e,f} = forward;
    paint(ctx => {
      ctx.save();
      ctx.transform(xx,yx,xy,yy,e,f);
      ctx.clip(transformed);
    });
    visit(el, extent, {transformed:true});
    paint(ctx => ctx.restore());
    projection = undefined;
  }

  function pseudo(el, box, name, inset = 0) {
    const style = getComputedStyle(el, name);
    if (style.content === 'none') return;
    const opacity = +style.opacity, poster = el.matches('.poster');
    const pseudoBox = {x:box.x+inset,y:box.y+inset,width:box.width-2*inset,height:box.height-2*inset};
    if (el.matches('.hero-art')) pseudoBox.width = parseFloat(style.width) || 0;
    const appearance = snapshotBoxStyle(style);
    paint(ctx => {
      ctx.save();
      ctx.globalAlpha *= opacity;
      paintBox(ctx, pseudoBox, appearance, {poster, vmax});
      ctx.restore();
    });
  }

  function visit(el, clip, {transformed = false} = {}) {
    if (++visited > MAX_ELEMENTS) throw new Error('Capture is too complex');
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility !== 'visible' || style.opacity === '0' ||
        el.matches('[hidden],br,script,style,noscript')) return;
    const box = measuredBox(el.getBoundingClientRect());
    const visible = intersection(box, clip);
    if (style.display !== 'contents' && !area(visible)) return;
    if (el.matches(PRIVATE)) { mask(box, clip); return; }
    if (el.matches('svg,img')) { artwork(el, box, clip, style); return; }
    if (!STRUCTURE.has(el.tagName)) { mask(box, clip); return; }

    const matrix = style.transform === 'none' ? null : new DOMMatrixReadOnly(style.transform);
    if (matrix?.is2D && !projection && (el === wall || el.id === 'feedback-open') &&
        matrix.a === matrix.d && matrix.b === -matrix.c && matrix.a > Math.abs(matrix.b))
      return paintTransformed(el, box, clip, matrix);
    const unsupported = (!transformed && matrix && (!matrix.is2D || matrix.a !== 1 || matrix.d !== 1 || matrix.b || matrix.c)) ||
      style.clipPath !== 'none' || style.filter !== 'none' || style.mixBlendMode !== 'normal' ||
      (style.backdropFilter && style.backdropFilter !== 'none');
    if (unsupported) {
      flag(box, clip);
      mask(box, clip);
      return;
    }
    const opacity = +style.opacity;
    paint(ctx => {
      ctx.save();
      ctx.globalAlpha *= opacity;
    });
    // Current's decorative rear pane sits behind the measured glass panel.
    if (theme === 'current' && el.matches('.glass.lens')) {
      const rear = getComputedStyle(el, '::before');
      if (rear.display !== 'none' && rear.content !== 'none') {
        const pane = {...box, x:box.x + parseFloat(rear.left), y:box.y + parseFloat(rear.top)};
        const right = pane.x + pane.width, bottom = pane.y + pane.height;
        const path = new Path2D();
        path.moveTo(right - 11, pane.y);
        path.lineTo(right, pane.y);
        path.lineTo(right, bottom);
        path.lineTo(pane.x, bottom);
        path.lineTo(pane.x, bottom - 11);
        path.lineTo(right - 11, bottom - 11);
        path.closePath();
        const appearance = snapshotBoxStyle(rear);
        paint(ctx => {
          ctx.save();
          ctx.clip(path);
          paintBox(ctx, pane, appearance, {vmax});
          ctx.restore();
        });
      }
    }
    const swatch = el.matches('.design-swatch') && el.firstElementChild?.naturalWidth;
    if (area(visible) && !swatch) {
      const appearance = snapshotBoxStyle(style);
      const art = el.matches('.step-print,.step-art,.survey,.hero-art');
      paint(ctx => {
        if (!paintBox(ctx, box, appearance, {art, vmax})) flag(box, clip);
      });
    }
    const childClip = {
      x:CLIPS.test(style.overflowX) ? visible.x : clip.x,
      y:CLIPS.test(style.overflowY) ? visible.y : clip.y,
      width:CLIPS.test(style.overflowX) ? visible.width : clip.width,
      height:CLIPS.test(style.overflowY) ? visible.height : clip.height,
    };
    const path = clipPath(childClip);
    paint(ctx => ctx.clip(path));
    if (wall?.parentElement === el) {
      visit(wall, childClip);
      pseudo(el, box, '::before');
    }
    if (posters.has(el)) pseudo(el, box, '::before');
    if (el.matches('details:not([open])')) {
      const summary = el.querySelector(':scope > summary');
      if (summary) visit(summary, childClip);
    } else {
      // Paint normal flow before sticky/fixed controls in the same container.
      const positioned = [];
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) drawText(node, el, style, childClip);
        if (node.nodeType !== Node.ELEMENT_NODE || node === wall) continue;
        const z = +getComputedStyle(node).zIndex || 0;
        if (z > 0) positioned.push([node, z]);
        else visit(node, childClip);
      }
      for (const [node] of positioned.sort((a, b) => a[1] - b[1])) visit(node, childClip);
    }
    if (posters.has(el)) pseudo(el, box, '::after', 6);
    if (theme === 'c' && el.matches('.hero > .hero-art')) pseudo(el, box, '::before');
    paint(ctx => ctx.restore());
  }

  const rootStyle = snapshotBoxStyle(getComputedStyle(root));
  const bodyStyle = snapshotBoxStyle(getComputedStyle(document.body));
  const dots = theme === 'b' ? {x:-viewport.scrollX - viewport.offsetX, y:-viewport.scrollY - viewport.offsetY} : undefined;
  paint(ctx => {
    paintBox(ctx, bounds, rootStyle, {vmax});
    if (!paintBox(ctx, bounds, bodyStyle, {dots, vmax})) throw new Error('Unsupported page background');
  });

  // Sheet overlays and browser chrome are outside these roots.
  const regions = [...document.body.children].filter(el => !el.matches('.sheet-wrap,script,style,noscript'))
    .map(el => [el, +getComputedStyle(el).zIndex || 0]).sort((a, b) => a[1] - b[1]);
  for (const [el] of regions) {
    if (el.matches(SHELL)) visit(el, bounds);
    else if (getComputedStyle(el).visibility === 'visible') mask(boxOf(el.getBoundingClientRect(), viewport), bounds);
  }
  const layoutMissing = missing;
  function rasterize(maskColor) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d', {alpha:false});
    if (!ctx) throw new Error('Canvas context unavailable');
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(canvas.width / width, canvas.height / height);
    missing = layoutMissing;
    for (const draw of commands) draw(ctx, maskColor);
    return ctx;
  }
  function render() {
    const ctx = rasterize(MASK);
    if (missing > width * height * MAX_UNSUPPORTED) return rejected('misleading-preview');
    // Changing the mask color also changes masks tinted by translucent overlays.
    // Masked pixels covered by opaque content stay the same.
    if (masked > width * height * MAX_MASKED && masksDominate(ctx, rasterize('#000')))
      return rejected('misleading-preview');
    return {ok:true, canvas:ctx.canvas, viewport};
  }
  return {ok:true, render};
}

function masksDominate(preview, comparison) {
  const {width, height} = preview.canvas;
  const actual = preview.getImageData(0, 0, width, height).data;
  const alternate = comparison.getImageData(0, 0, width, height).data;
  let visible = 0;
  for (let i = 0; i < actual.length; i += 4) {
    if (Math.abs(actual[i] - alternate[i]) > 8 || Math.abs(actual[i+1] - alternate[i+1]) > 8 ||
        Math.abs(actual[i+2] - alternate[i+2]) > 8) visible++;
  }
  return visible > width * height * MAX_MASKED;
}

function paintTerrain(ctx, box, opacity, draw) {
  // Fade the completed terrain as one layer so ridges still occlude each other.
  const layer = document.createElement('canvas');
  layer.width = ctx.canvas.width;
  layer.height = ctx.canvas.height;
  const surface = layer.getContext('2d');
  if (!surface) throw new Error('Terrain layer unavailable');
  surface.setTransform(ctx.getTransform());
  draw(surface);
  const fade = surface.createLinearGradient(box.x, 0, box.x + box.width * .16, 0);
  fade.addColorStop(0, 'transparent');
  fade.addColorStop(1, '#000');
  surface.globalCompositeOperation = 'destination-in';
  surface.fillStyle = fade;
  surface.fillRect(box.x, box.y, box.width, box.height);
  ctx.resetTransform();
  ctx.globalAlpha *= opacity;
  ctx.drawImage(layer, 0, 0);
}
