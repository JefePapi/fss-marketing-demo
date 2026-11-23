// Canvas paints the CSS gradient layers used by the demo surfaces. Unsupported
// visible effects count against the capture's fidelity budget in the caller.
const number = value => parseFloat(value) || 0;
const transparent = value => !value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)';
const sides = ['Top', 'Right', 'Bottom', 'Left'];
const corners = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'];
const extent = (value, size) => value.endsWith('%') ? number(value) * size / 100 : number(value);

function rounded(ctx, box, style) {
  const {x, y, width, height} = box;
  const radii = corners.map(corner => {
    const [rx = '0', ry = rx] = style['border' + corner + 'Radius']?.split(' ') || [];
    return {x:extent(rx, width), y:extent(ry, height)};
  });
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radii);
}

function stops(gradient, layers, length) {
  const colors = layers.map(layer => {
    const match = layer.match(/^(rgba?\([^)]+\)|#[\da-f]+|[a-z]+)(?:\s+(-?[\d.]+(?:%|px)))?$/i);
    if (!match) throw new Error('Unsupported color stop');
    return {color:match[1], at:match[2] ? extent(match[2], length) / length : undefined};
  });
  colors[0].at ??= 0;
  colors.at(-1).at ??= 1;
  let i = 0;
  while (i < colors.length - 1) {
    let end = i + 1;
    while (colors[end].at === undefined) end++;
    const from = colors[i].at;
    const to = Math.max(from, colors[end].at);
    for (let j = i + 1; j <= end; j++) colors[j].at = from + (to - from) * (j - i) / (end - i);
    i = end;
  }
  for (const {color, at} of colors) gradient.addColorStop(Math.max(0, Math.min(at, 1)), color);
}

function linear(ctx, box, parts, direction) {
  const angle = ({'to top':0, 'to right':90, 'to bottom':180, 'to left':270})[direction] ??
    (direction?.endsWith('deg') ? number(direction) : NaN);
  if (direction && !Number.isFinite(angle)) throw new Error('Unsupported gradient direction');
  const rad = (direction ? angle : 180) * Math.PI / 180;
  const dx = Math.sin(rad), dy = -Math.cos(rad);
  const {x, y, width, height} = box;
  const cx = x + width / 2, cy = y + height / 2;
  const radius = (Math.abs(dx) * width + Math.abs(dy) * height) / 2;
  const gradient = ctx.createLinearGradient(cx - radius * dx, cy - radius * dy, cx + radius * dx, cy + radius * dy);
  stops(gradient, parts, radius * 2);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
}

function radial(ctx, box, parts, direction) {
  const position = direction?.match(/^(?:(?:ellipse )?([\d.]+(?:px|vmax)) ([\d.]+(?:px|vmax))|ellipse) at (.+)$/);
  if (!position) return false;
  const xy = position[3].match(/calc\([^)]+\)|[^ ]+/g);
  if (xy?.length !== 2) return false;
  const vmax = Math.max(window.innerWidth, window.innerHeight) / 100;
  const coordinate = (value, size) => {
    if (value.endsWith('vmax')) return number(value) * vmax;
    const calc = value.match(/^calc\(([\d.]+)% ([+-]) ([\d.]+)px\)$/);
    return calc ? extent(calc[1] + '%', size) + number(calc[3]) * (calc[2] === '+' ? 1 : -1) : extent(value, size);
  };
  const x = coordinate(xy[0], box.width), y = coordinate(xy[1], box.height);
  const rx = position[1] ? coordinate(position[1], box.width) : Math.SQRT2 * Math.max(x, box.width - x);
  const ry = position[2] ? coordinate(position[2], box.height) : Math.SQRT2 * Math.max(y, box.height - y);
  ctx.save();
  try {
    ctx.translate(box.x + x, box.y + y);
    ctx.scale(rx, ry);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    stops(gradient, parts, rx);
    ctx.fillStyle = gradient;
    ctx.fillRect(-x / rx, -y / ry, box.width / rx, box.height / ry);
  } finally { ctx.restore(); }
  return true;
}

// Split commas only between CSS functions (colors and calc() have their own).
function layers(value) {
  let depth = 0, start = 0;
  const result = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    if (value[i] === ')') depth--;
    if (value[i] === ',' && depth === 0) {
      result.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  result.push(value.slice(start).trim());
  return result;
}

export function paintBox(ctx, box, style, options = {}) {
  const {x, y, width, height} = box;
  let supported = true;
  ctx.save();
  rounded(ctx, box, style);
  ctx.clip();
  if (!transparent(style.backgroundColor)) {
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(x, y, width, height);
  }
  const sizes = layers(style.backgroundSize || 'auto');
  const backgrounds = layers(style.backgroundImage || 'none');
  for (let i = backgrounds.length - 1; i >= 0; i--) {
    const layer = backgrounds[i], size = sizes[i % sizes.length];
    if (layer === 'none') continue;
    const match = layer.match(/^(linear|radial)-gradient\((.*)\)$/);
    if (!match) { supported = false; continue; }
    const parts = layers(match[2]);
    const direction = /^(?:[\d.]+(?:deg|px|vmax)|to |ellipse )/.test(parts[0]) ? parts.shift() : undefined;
    try {
      if (match[1] === 'linear' && size === 'auto') linear(ctx, box, parts, direction);
      else if (match[1] === 'linear' && options.art && size === '36px 36px') {
        ctx.fillStyle = parts[0].replace(/ 1px$/, '');
        const vertical = direction === '90deg';
        for (let n = 0; n < (vertical ? width : height); n += 36) {
          if (vertical) ctx.fillRect(x + n, y, 1, height);
          else ctx.fillRect(x, y + n, width, 1);
        }
      } else if (match[1] === 'radial' && ((options.dots && size === '20px 20px') ||
          (options.art && size === '5px 5px') || (options.poster && size === '4px 4px'))) {
        ctx.fillStyle = parts[0].replace(/\s+[\d.]+px$/, '').replace('currentcolor', style.color);
        const step = number(size);
        const start = value => ((value + step / 2) % step + step) % step;
        for (let py = y + start(options.dots?.y || 0); py < y + height; py += step) {
          for (let px = x + start(options.dots?.x || 0); px < x + width; px += step) {
            ctx.beginPath();
            ctx.arc(px, py, options.poster ? .65 : .85, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      } else if (!radial(ctx, box, parts, direction)) supported = false;
    } catch { supported = false; }
  }
  const borders = sides.map(side => number(style['border' + side + 'Width']));
  const [t, r, b, l] = borders;
  const edges = [[x, y, width, t], [x + width - r, y, r, height],
    [x, y + height - b, width, b], [x, y, l, height]];
  if (t && t === r && r === b && b === l && sides.every(side =>
    style['border' + side + 'Color'] === style.borderTopColor)) {
    ctx.strokeStyle = style.borderTopColor;
    ctx.lineWidth = t * 2;
    rounded(ctx, box, style);
    ctx.stroke();
  } else for (let i = 0; i < edges.length; i++) {
    if (!borders[i]) continue;
    ctx.fillStyle = style['border' + sides[i] + 'Color'];
    ctx.fillRect(...edges[i]);
  }
  ctx.restore();
  return supported;
}

// The caller verifies the complete SVG against the theme's original artwork.
export function paintVector(ctx, svg, matrix) {
  const definitions = new Map([...svg.querySelectorAll('defs [id]')].map(el => [el.id, el]));
  const color = (value, fallback) => {
    const paint = !value || value === 'currentColor' ? fallback : value;
    if (!/^(?:none|#[\da-f]+|rgba?\([\d., %]+\))$/i.test(paint)) throw new Error('Unsupported vector color');
    return paint;
  };
  const referenced = value => definitions.get(value?.match(/^url\(#([\w-]+)\)$/)?.[1]);
  const fraction = value => extent(value || '0', 1);
  const draw = (node, depth = 0) => {
    if (depth > 8) throw new Error('Unsupported vector nesting');
    if (node.localName === 'defs') return;
    ctx.save();
    try {
      const transforms = node.transform.baseVal;
      for (let i = 0; i < transforms.numberOfItems; i++) {
        const {a,b,c,d,e,f} = transforms.getItem(i).matrix;
        ctx.transform(a,b,c,d,e,f);
      }
      if (node.hasAttribute('opacity')) ctx.globalAlpha *= number(node.getAttribute('opacity'));
      const clip = referenced(node.getAttribute('clip-path'));
      if (clip?.firstElementChild?.localName === 'path') ctx.clip(new Path2D(clip.firstElementChild.getAttribute('d')));
      if (node.localName === 'g') {
        for (const child of node.children) draw(child, depth + 1);
      } else if (node.localName === 'use') {
        const shape = definitions.get(node.getAttribute('href')?.match(/^#([\w-]+)$/)?.[1]);
        if (shape?.localName !== 'g') throw new Error('Unsupported vector reference');
        draw(shape, depth + 1);
      } else if (node.localName === 'path') {
        const path = new Path2D(node.getAttribute('d'));
        const ink = getComputedStyle(node).color;
        for (const channel of ['fill', 'stroke']) {
          const value = node.getAttribute(channel) || 'none';
          if (value === 'none') continue;
          const definition = referenced(value);
          let paint;
          if (definition?.localName === 'linearGradient') {
            const box = node.getBBox();
            if (!box.width || !box.height) continue;
            // Convert the SVG's object-bounding-box gradient into user units.
            const x = fraction(definition.getAttribute('x2')), y = fraction(definition.getAttribute('y2'));
            const dx = x / box.width, dy = y / box.height;
            const length = (x*x + y*y) / (dx*dx + dy*dy);
            paint = ctx.createLinearGradient(box.x, box.y, box.x + dx*length, box.y + dy*length);
            for (const stop of definition.children) {
              const ink = color(stop.getAttribute('stop-color'));
              const opacity = stop.getAttribute('stop-opacity') || '1';
              paint.addColorStop(number(stop.getAttribute('offset')), `color-mix(in srgb, ${ink} ${number(opacity)*100}%, transparent)`);
            }
          } else paint = color(value, ink);
          if (channel === 'fill') {
            ctx.fillStyle = paint;
            ctx.fill(path, node.getAttribute('fill-rule') === 'evenodd' ? 'evenodd' : 'nonzero');
          } else {
            ctx.strokeStyle = paint;
            ctx.lineWidth = number(node.getAttribute('stroke-width')) || 1;
            ctx.stroke(path);
          }
        }
      } else throw new Error('Unsupported vector shape');
    } finally { ctx.restore(); }
  };
  ctx.save();
  try {
    const {a,b,c,d,e,f} = matrix;
    ctx.transform(a,b,c,d,e,f);
    for (const child of svg.children) draw(child);
    return true;
  } catch { return false; }
  finally { ctx.restore(); }
}
