import { approvedLabel, captureRoute, DESIGNS, messages } from './feedback-capture-policy.js';
import { paintBox, paintVector } from './feedback-capture-style.js';
import { themeHero, themeIcon, themeStepArt } from '../theme.js';

const MASK = '#68788a';
const MAX_EDGE = 1280;
const MAX_ELEMENTS = 2500;
const MAX_UNSUPPORTED = .12;
const MAX_MASKED = .65;
const SHELL = '.atmo,#demo-banner,.site-head,#app,#toast,#site-footer,#feedback-open';
const PRIVATE = 'input,textarea,select,[contenteditable]:not([contenteditable=false]),' +
  '[data-test=file-item],[data-test=attachment],[data-test=my-request],' +
  '.facts dd,.metric dd,#email-suggest,#reminder,#activity-info';
const STRUCTURE = new Set('A ARTICLE ASIDE B BUTTON DD DETAILS DIV DL DT EM FIELDSET FOOTER FORM H1 H2 H3 HEADER I LABEL LEGEND LI MAIN NAV OL P SECTION SMALL SPAN STRONG SUMMARY TABLE TBODY TD TH THEAD TIME TR UL'.split(' '));
const CLIPS = /^(hidden|clip|auto|scroll)$/;

const rejected = reason => ({ok:false, reason, message:messages[reason]});
let opening;

// Record the opening position before the sheet or its focus can move it.
export function rememberCapture() {
  const snapshot = opening = {
    route:location.hash, view:document.querySelector('#app > .glass'),
    viewport:readViewport(), covered:!!document.querySelector('.sheet-wrap,dialog[open]'),
    detail:!!document.querySelector('#event-detail'),
  };
  return () => { if (opening === snapshot) opening = undefined; };
}

export function capture() {
  if (!opening) return rejected('no-snapshot');
  const {viewport, route, view} = opening;
  if (location.hash !== route || !view?.isConnected || document.documentElement.dataset.theme !== viewport.theme) {
    opening = undefined;
    return rejected('misleading-preview');
  }
  try { return opening.result ??= reconstruct(); }
  catch { return rejected('misleading-preview'); }
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

function reconstruct() {
  const root = document.documentElement;
  const app = document.getElementById('app');
  const path = location.hash.replace(/^#\/?/, '').split('?')[0];
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const refusal = captureRoute(parts, {
    staff:!!document.querySelector('#staff-toggle[aria-pressed=true],.route-staff,.route-manager'),
    detail:opening.detail || !!document.querySelector('#event-detail,.route-sent'),
  });
  if (refusal) return rejected(refusal);
  const page = parts[0] || '';
  const viewport = Object.freeze({...opening.viewport, page:page || 'home'});
  const {width, height, theme} = viewport;
  const current = readViewport();
  if (!DESIGNS.has(theme) || !app?.classList.contains('route-' + viewport.page) ||
      opening.covered || document.querySelector('.sheet-wrap:not(:has(.feedback-body)),dialog[open]') ||
      root.querySelector('link[data-staged]') || viewport.scale !== 1 || width < 1 || height < 1 ||
      Object.keys(current).some(key => current[key] !== viewport[key]))
    return rejected('misleading-preview');

  const scale = Math.min(window.devicePixelRatio || 1, MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d', {alpha:false});
  if (!ctx) return rejected('misleading-preview');
  // All measurements and paint operations use CSS pixels.
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.scale(canvas.width / width, canvas.height / height);
  const bounds = {x:0, y:0, width, height};
  const clipPath = box => {
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.width, box.height);
    ctx.clip();
  };
  let missing = 0, masked = 0, visited = 0;
  let projection;
  const area = box => box.width * box.height;
  const flag = (box, clip) => { missing += area(intersection(box, clip)); };
  const mask = (box, clip) => {
    const visible = intersection(box, clip);
    if (!area(visible)) return;
    masked += area(visible);
    ctx.save();
    // Privacy masks stay opaque inside translucent controls and panels.
    ctx.globalAlpha = 1;
    ctx.fillStyle = MASK;
    ctx.fillRect(Math.floor(box.x), Math.floor(box.y),
      Math.ceil(box.x + box.width) - Math.floor(box.x), Math.ceil(box.y + box.height) - Math.floor(box.y));
    ctx.restore();
  };
  const measuredBox = rect => {
    const box = boxOf(rect, viewport);
    return projection ? projection.box(box) : box;
  };

  const isNightWall = theme === 'a' || theme === 'a-light';
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
    ctx.font = [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].join(' ');
    ctx.fillStyle = style.color;
    ctx.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
    ctx.wordSpacing = style.wordSpacing === 'normal' ? '0px' : style.wordSpacing;
    const metrics = ctx.measureText('M');
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
    for (const line of lines) {
      if (!area(intersection(line, clip))) continue;
      let value = text.slice(line.start, line.end).replace(/\s+/g, ' ');
      if (style.textTransform === 'uppercase') value = value.toUpperCase();
      if (style.textTransform === 'lowercase') value = value.toLowerCase();
      const sizing = ctx.measureText(value);
      const baseline = line.y + (line.height + metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2;
      if (!Number.isFinite(baseline) || Math.abs(sizing.width - line.width) > Math.max(3, line.width * .09)) {
        flag(line, clip);
        if (!Number.isFinite(baseline)) continue;
      }
      ctx.fillText(value, line.x, baseline);
      if (style.textDecorationLine.includes('underline')) {
        const thickness = parseFloat(style.textDecorationThickness) || 1;
        const offset = parseFloat(style.textUnderlineOffset) || 2;
        ctx.fillRect(line.x, Math.round(baseline + offset), line.width, thickness);
      }
    }
  }

  function artwork(el, box, clip) {
    if (el.matches('#feedback-open > svg, #brand > svg')) {
      const feedback = el.parentElement.id === 'feedback-open';
      const side = feedback ? 24 : 32;
      const scale = Math.min(box.width, box.height) / side;
      const color = getComputedStyle(el).color;
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
      return;
    }

    let original;
    if (el.matches('.route-request .step-head > :is(.step-print,.step-art) > svg'))
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
        if (paintVector(ctx, el, projection ? projection.inverse.multiply(matrix) : matrix)) return;
      }
    }
    // Only loaded demo thumbnails can contribute image pixels. Their URLs
    // are fixed filenames under the app directory; no source is requested here.
    if (el instanceof HTMLImageElement && el.parentElement.matches('.design-swatch') &&
        el.closest('.route-home') && el.complete && el.naturalWidth && el.naturalHeight &&
        [...DESIGNS].some(id => el.currentSrc === new URL('./img/themes/' + id + '.webp', location.href).href)) {
      const scale = Math.max(box.width / el.naturalWidth, box.height / el.naturalHeight);
      const w = el.naturalWidth * scale, h = el.naturalHeight * scale;
      ctx.save();
      clipPath(box);
      ctx.drawImage(el, box.x + (box.width - w) * .5, box.y + (box.height - h) * .36, w, h);
      ctx.restore();
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
    ctx.save();
    const {a:xx,b:yx,c:xy,d:yy,e,f} = forward;
    ctx.transform(xx,yx,xy,yy,e,f);
    ctx.clip(transformed);
    visit(el, extent, {transformed:true});
    ctx.restore();
    projection = undefined;
  }

  function pseudo(el, box, name, inset = 0) {
    const style = getComputedStyle(el, name);
    if (style.content === 'none') return;
    ctx.save();
    ctx.globalAlpha *= +style.opacity;
    paintBox(ctx, {x:box.x+inset,y:box.y+inset,width:box.width-2*inset,height:box.height-2*inset},
      style, {poster:el.matches('.poster')});
    ctx.restore();
  }

  function visit(el, clip, {transformed = false} = {}) {
    if (++visited > MAX_ELEMENTS) throw new Error('Capture is too complex');
    const style = getComputedStyle(el);
    // The sheet hides the desktop Feedback pill after opening.
    const pill = el.closest('#feedback-open') && document.querySelector('.feedback-body');
    if (style.display === 'none' || (style.visibility !== 'visible' && !pill) || style.opacity === '0' ||
        el.matches('[hidden],br,script,style,noscript')) return;
    const box = measuredBox(el.getBoundingClientRect());
    const visible = intersection(box, clip);
    if (style.display !== 'contents' && !area(visible)) return;
    if (el.matches(PRIVATE)) { mask(box, clip); return; }
    if (el.matches('svg,img')) { artwork(el, box, clip); return; }
    if (!STRUCTURE.has(el.tagName)) { mask(box, clip); return; }

    const matrix = style.transform === 'none' ? null : new DOMMatrixReadOnly(style.transform);
    if (matrix?.is2D && !projection && (el === wall || el.id === 'feedback-open') &&
        matrix.a === matrix.d && matrix.b === -matrix.c && matrix.a > Math.abs(matrix.b))
      return paintTransformed(el, box, clip, matrix);
    ctx.save();
    ctx.globalAlpha *= +style.opacity;
    const unsupported = (!transformed && matrix && (!matrix.is2D || matrix.a !== 1 || matrix.d !== 1 || matrix.b || matrix.c)) ||
      style.clipPath !== 'none' || style.filter !== 'none' || style.mixBlendMode !== 'normal' ||
      (style.backdropFilter && style.backdropFilter !== 'none');
    if (unsupported) {
      flag(box, clip);
      mask(box, clip);
      ctx.restore();
      return;
    }
    // Current's decorative rear pane sits behind the measured glass panel.
    if (theme === 'current' && el.matches('.glass.lens')) {
      const rear = getComputedStyle(el, '::before');
      if (rear.display !== 'none' && rear.content !== 'none') {
        const pane = {...box, x:box.x + parseFloat(rear.left), y:box.y + parseFloat(rear.top)};
        const right = pane.x + pane.width, bottom = pane.y + pane.height;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(right - 11, pane.y);
        ctx.lineTo(right, pane.y);
        ctx.lineTo(right, bottom);
        ctx.lineTo(pane.x, bottom);
        ctx.lineTo(pane.x, bottom - 11);
        ctx.lineTo(right - 11, bottom - 11);
        ctx.closePath();
        ctx.clip();
        paintBox(ctx, pane, rear);
        ctx.restore();
      }
    }
    const swatch = el.matches('.design-swatch') && el.firstElementChild?.naturalWidth;
    if (area(visible) && !swatch && !paintBox(ctx, box, style, {art:el.matches('.step-print,.step-art')}))
      flag(box, clip);
    const childClip = {
      x:CLIPS.test(style.overflowX) ? visible.x : clip.x,
      y:CLIPS.test(style.overflowY) ? visible.y : clip.y,
      width:CLIPS.test(style.overflowX) ? visible.width : clip.width,
      height:CLIPS.test(style.overflowY) ? visible.height : clip.height,
    };
    clipPath(childClip);
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
    ctx.restore();
  }

  paintBox(ctx, bounds, getComputedStyle(root));
  const bodyStyle = getComputedStyle(document.body);
  if (!paintBox(ctx, bounds, bodyStyle, theme === 'b' ?
    {dots:{x:-viewport.scrollX - viewport.offsetX, y:-viewport.scrollY - viewport.offsetY}} : {})) return rejected('misleading-preview');

  // Sheet overlays and browser chrome are outside these roots.
  const regions = [...document.body.children].filter(el => !el.matches('.sheet-wrap,script,style,noscript'))
    .map(el => [el, +getComputedStyle(el).zIndex || 0]).sort((a, b) => a[1] - b[1]);
  for (const [el] of regions) {
    if (el.matches(SHELL)) visit(el, bounds);
    else if (getComputedStyle(el).visibility === 'visible') mask(boxOf(el.getBoundingClientRect(), viewport), bounds);
  }
  if (missing > width * height * MAX_UNSUPPORTED) return rejected('misleading-preview');
  // Count the final masks only when they could dominate. Overlapping masks and
  // masks subsequently covered by sticky UI should count once or not at all.
  if (masked > width * height * MAX_MASKED) {
    const {data} = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let opaque = 0;
    for (let i = 0; i < data.length; i += 4)
      if (data[i] === 104 && data[i+1] === 120 && data[i+2] === 138) opaque++;
    if (opaque * 4 > data.length * MAX_MASKED) return rejected('misleading-preview');
  }
  return {ok:true, canvas, viewport};
}
