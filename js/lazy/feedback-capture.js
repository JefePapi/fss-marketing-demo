import { approvedLabel, captureRoute, DESIGNS, messages } from './feedback-capture-policy.js';
import { paintBox, paintStepArt } from './feedback-capture-style.js';

const MASK = '#68788a';
const MAX_PIXELS = 6_000_000;
const MAX_ELEMENTS = 2500;
const MAX_UNSUPPORTED = .12;
const SHELL = '.atmo,#demo-banner,.site-head,#app,#toast,#site-footer,#feedback-open';
const PRIVATE = 'input,textarea,select,[contenteditable]:not([contenteditable=false]),' +
  '[data-test=file-item],[data-test=attachment],[data-test=my-request],[data-test=activity-card],' +
  '[data-test=cal-event],.facts dd,.metric dd,#email-suggest,#reminder,#activity-info';
const STRUCTURE = new Set('A ARTICLE ASIDE B BUTTON DD DETAILS DIV DL DT EM FIELDSET FOOTER FORM H1 H2 H3 HEADER I LABEL LEGEND LI MAIN NAV OL P SECTION SMALL SPAN STRONG SUMMARY TABLE TBODY TD TH THEAD TIME TR UL'.split(' '));
const CLIPS = /^(hidden|clip|auto|scroll)$/;

const rejected = reason => ({ok:false, reason, message:messages[reason]});
let result = rejected('no-snapshot');

// Called before the sheet mounts or focuses its message field. Retain only
// the sanitized canvas and small viewport metadata, with no live DOM handles.
export function rememberCapture() {
  try { result = reconstruct(); }
  catch { result = rejected('misleading-preview'); }
}

export function capture() {
  return result;
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
    detail:!!document.querySelector('#event-detail,.route-sent'),
  });
  if (refusal) return rejected(refusal);
  const page = parts[0] || '';
  const visual = window.visualViewport;
  const viewport = Object.freeze({
    scrollX:window.scrollX, scrollY:window.scrollY,
    width:Math.round(visual?.width ?? root.clientWidth), height:Math.round(visual?.height ?? root.clientHeight),
    offsetX:visual?.offsetLeft ?? 0, offsetY:visual?.offsetTop ?? 0,
    page:page || 'home', theme:root.dataset.theme,
  });
  const {width, height, theme} = viewport;
  if (!DESIGNS.has(theme) || !app?.classList.contains('route-' + viewport.page) ||
      !app.firstElementChild?.matches('.glass') || document.querySelector('.sheet-wrap') ||
      root.querySelector('link[data-staged]') || (visual && visual.scale !== 1) ||
      width < 1 || height < 1 || width * height > MAX_PIXELS)
    return rejected('misleading-preview');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', {alpha:false});
  if (!ctx) return rejected('misleading-preview');
  const bounds = {x:0, y:0, width, height};
  const clipPath = box => {
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.width, box.height);
    ctx.clip();
  };
  let missing = 0, visited = 0;
  const area = box => box.width * box.height;
  const flag = (box, clip) => { missing += area(intersection(box, clip)); };
  const mask = (box, clip) => {
    if (!area(intersection(box, clip))) return;
    ctx.save();
    // Privacy masks stay opaque inside translucent controls and panels.
    ctx.globalAlpha = 1;
    ctx.fillStyle = MASK;
    ctx.fillRect(Math.floor(box.x), Math.floor(box.y),
      Math.ceil(box.x + box.width) - Math.floor(box.x), Math.ceil(box.y + box.height) - Math.floor(box.y));
    ctx.restore();
  };

  const range = document.createRange();
  function drawText(node, parent, style, clip) {
    const text = node.data;
    if (!text.trim()) return;
    if (!approvedLabel(parent, page, text.trim())) {
      const box = boxOf(parent.getBoundingClientRect(), viewport);
      if (area(box)) mask(box, clip);
      else {
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) mask(boxOf(rect, viewport), clip);
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
      const box = boxOf(rect, viewport);
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

    if (el.matches('.route-request .step-head > :is(.step-print,.step-art) > svg') && paintStepArt(ctx, el, viewport)) return;
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

  function visit(el, clip) {
    if (++visited > MAX_ELEMENTS) throw new Error('Capture is too complex');
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility !== 'visible' || style.opacity === '0' ||
        el.matches('[hidden],script,style,noscript')) return;
    const box = boxOf(el.getBoundingClientRect(), viewport);
    const visible = intersection(box, clip);
    if (style.display !== 'contents' && !area(visible)) return;
    if (el.matches(PRIVATE)) { mask(box, clip); return; }
    if (el.matches('svg,img')) { artwork(el, box, clip); return; }
    if (!STRUCTURE.has(el.tagName)) { mask(box, clip); return; }

    ctx.save();
    ctx.globalAlpha *= +style.opacity;
    const matrix = style.transform === 'none' ? null : new DOMMatrixReadOnly(style.transform);
    const unsupported = (matrix && (!matrix.is2D || matrix.a !== 1 || matrix.d !== 1 || matrix.b || matrix.c)) ||
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
    if (el.matches('details:not([open])')) {
      const summary = el.querySelector(':scope > summary');
      if (summary) visit(summary, childClip);
    } else {
      // Paint normal flow before sticky/fixed controls in the same container.
      const positioned = [];
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) drawText(node, el, style, childClip);
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const z = +getComputedStyle(node).zIndex || 0;
        if (z > 0) positioned.push([node, z]);
        else visit(node, childClip);
      }
      for (const [node] of positioned.sort((a, b) => a[1] - b[1])) visit(node, childClip);
    }
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
  return {ok:true, canvas, viewport};
}
