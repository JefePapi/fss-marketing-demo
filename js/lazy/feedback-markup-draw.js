// Marks use image pixels so the preview and saved JPEG share the same geometry.
export function markBox(start, end, width, height) {
  const unit = Math.min(width, height) / 400;
  const dx = Math.abs(start.x - end.x), dy = Math.abs(start.y - end.y);
  const tap = Math.max(dx, dy) < 5 * unit;
  const w = tap ? 68 * unit : Math.max(dx, 14 * unit);
  const h = tap ? 40 * unit : Math.max(dy, 14 * unit);
  return {x:inside((start.x + end.x - w) / 2, width - w),
    y:inside((start.y + end.y - h) / 2, height - h), width:w, height:h};
}

const inside = (value, max) => Math.max(0, Math.min(value, max));

export function drawMarkup(ctx, marks, draft, cursor, editing) {
  const {width, height} = ctx.canvas;
  const unit = Math.min(width, height) / 400;
  ctx.save();
  if (draft && draft.tool !== 'Note') marks = [...marks, draft];
  for (const mark of marks) {
    if (mark.tool === 'Note') {
      if (editing || mark.text.trim()) drawNote(ctx, mark, unit);
      continue;
    }
    const box = markBox(mark.start, mark.end, width, height);
    const {x, y, width:w, height:h} = box;
    ctx.beginPath();
    if (mark.tool === 'Circle') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else {
      ctx.rect(x, y, w, h);
      ctx.fillStyle = '#ffdf4877';
      ctx.fill();
    }
    outline(ctx, mark.tool === 'Circle' ? '#ff574a' : '#ffe16b', unit);
  }
  if (cursor) {
    const {x, y} = cursor;
    const r = 10 * unit;
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.lineTo(x + r, y);
    ctx.moveTo(x, y - r);
    ctx.lineTo(x, y + r);
    outline(ctx, '#fff', unit);
  }
  ctx.restore();
}

function outline(ctx, color, unit) {
  ctx.lineWidth = 5 * unit;
  ctx.strokeStyle = '#182230';
  ctx.stroke();
  ctx.lineWidth = 3 * unit;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function drawNote(ctx, {start, text}, unit) {
  const {width, height} = ctx.canvas;
  const r = 6 * unit;
  const x = Math.max(r, inside(start.x, width - r));
  const y = Math.max(r, inside(start.y, height - r));
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  outline(ctx, '#fff', unit);

  if (!text.trim()) return;
  ctx.font = `600 ${20 * unit}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  const max = 210 * unit;
  const lines = wrapNote(text.trim(), max, line => ctx.measureText(line).width);
  const padding = 8 * unit;
  const lineHeight = 23 * unit;
  const w = Math.max(...lines.map(line => ctx.measureText(line).width)) + padding * 2;
  const h = lineHeight * lines.length + padding * 2;
  const left = inside(x + r * 2 < width - w ? x + r * 2 : x - r * 2 - w, width - w);
  const top = inside(y - h / 2, height - h);
  ctx.fillStyle = '#182230';
  ctx.fillRect(left, top, w, h);
  ctx.fillStyle = '#fff';
  lines.forEach((line, index) => ctx.fillText(line, left + padding, top + padding + (index + .5) * lineHeight));
}

export function wrapNote(text, maxWidth, measure) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && measure(line + ' ' + word) > maxWidth) {
      lines.push(line);
      line = '';
    }
    if (line) line += ' ';
    for (const glyph of word) {
      if (line && measure(line + glyph) > maxWidth) {
        lines.push(line);
        line = '';
      }
      line += glyph;
    }
  }
  if (line) lines.push(line);
  return lines;
}
