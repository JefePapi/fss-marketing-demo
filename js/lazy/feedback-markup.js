import { field, h } from '../ui.js';
import { drawMarkup } from './feedback-markup-draw.js';

const JPEG_PREFIX = 'data:image/jpeg;base64,';
const MAX_JPEG = 256 * 1024;
const MAX_EDGE = 1280;

// Canvas can write a color profile. Keep its ordinary JFIF header and pixels.
function stripCanvasMetadata(encoded) {
  const bytes = atob(encoded);
  const at = offset => bytes.charCodeAt(offset);
  let kept = '', start = 0;
  for (let offset = 2; at(offset) === 0xff;) {
    const marker = at(offset + 1);
    if (marker === 0xda) return start ? btoa(kept + bytes.slice(start)) : encoded;
    const length = at(offset + 2) * 256 + at(offset + 3);
    const end = offset + length + 2;
    if (!(length >= 2 && end <= bytes.length)) break;
    if ((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe) {
      kept += bytes.slice(start, offset);
      start = end;
    }
    offset = end;
  }
  throw new Error('JPEG scan unavailable');
}

export function editScreenshot(source, form, opener, onSave, onUnavailable) {
  const {width, height} = source;
  const canvas = h('canvas', {width, height, 'aria-hidden':'true'});
  const ctx = canvas.getContext('2d', {alpha:false});
  if (!ctx) throw new Error('Canvas unavailable');
  const marks = [];
  const cursor = {x:width / 2, y:height / 2};
  let tool = 'Highlight';
  let drag, activeNote;
  const status = h('p', {class:'hint', role:'status'});
  const input = h('input', {id:'screenshot-note', type:'text', maxlength:80,
    oninput:() => { activeNote.text = input.value; render(); }});
  const noteField = field(input.id, 'Note (sample details only)', input);
  noteField.hidden = true;

  function render(editing = true) {
    ctx.drawImage(source, 0, 0);
    drawMarkup(ctx, marks, editing ? drag : null, editing && document.activeElement === surface &&
      surface.matches(':focus-visible') ? cursor : null, editing);
  }

  function closeNote() {
    if (activeNote && !activeNote.text.trim()) marks.pop();
    activeNote = undefined;
    noteField.hidden = true;
  }

  function addMark(start, end) {
    closeNote();
    if (tool === 'Note') {
      activeNote = {tool, start, text:''};
      marks.push(activeNote);
      input.value = '';
      noteField.hidden = false;
    } else {
      marks.push({tool, start, end});
      status.textContent = tool + ' added.';
    }
    undo.disabled = false;
    render();
    if (activeNote) input.focus();
  }

  function point(event) {
    const box = canvas.getBoundingClientRect();
    return {x:clamp((event.clientX - box.left) * width / box.width, width),
      y:clamp((event.clientY - box.top) * height / box.height, height)};
  }

  const surface = h('button', {type:'button', class:'feedback-markup-surface', 'aria-label':'Mark the screenshot',
    'aria-describedby':'screenshot-help', onfocus:() => render(), onblur:() => render(),
    onclick:event => {
      if (event.detail === 0) addMark({...cursor}, {...cursor});
      // Touch click can focus the button after pointerup.
      if (activeNote) input.focus();
    },
    onkeydown:event => {
      const direction = {ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1]}[event.key];
      if (!direction) return;
      event.preventDefault();
      cursor.x = clamp(cursor.x + direction[0] * width / 25, width);
      cursor.y = clamp(cursor.y + direction[1] * height / 25, height);
      render();
    },
    onpointerdown:event => {
      if (drag || event.button !== 0) return;
      const start = point(event);
      surface.setPointerCapture(event.pointerId);
      drag = {tool, start, end:start, pointerId:event.pointerId};
    },
    onpointermove:event => {
      if (drag?.pointerId !== event.pointerId || tool === 'Note') return;
      drag.end = point(event);
      render();
    },
    onpointerup:event => {
      if (drag?.pointerId !== event.pointerId) return;
      const {start} = drag;
      drag = undefined;
      addMark(start, point(event));
    },
    onlostpointercapture:event => {
      if (drag?.pointerId !== event.pointerId) return;
      drag = undefined;
      render();
    },
  }, canvas);

  const tools = ['Highlight', 'Circle', 'Note'].map(label => h('button', {type:'button', class:'btn',
    'aria-pressed':String(label === tool), onclick:() => {
      closeNote();
      drag = undefined;
      tool = label;
      for (const button of tools) button.setAttribute('aria-pressed', String(button.textContent === tool));
      undo.disabled = !marks.length;
      render();
    }}, label));
  const undo = h('button', {type:'button', class:'btn', disabled:true, onclick:() => {
    activeNote = undefined;
    noteField.hidden = true;
    marks.pop();
    if (!marks.length) {
      tools.find(button => button.textContent === tool).focus({preventScroll:true});
      undo.disabled = true;
    }
    status.textContent = 'Last mark removed.';
    render();
  }}, 'Undo');
  const remove = h('button', {type:'button', class:'btn feedback-markup-remove', onclick:() => {
    if (window.confirm('Remove this screenshot and all its marks?')) finish();
  }}, 'Remove');
  const save = h('button', {type:'button', class:'btn primary', onclick:async () => {
    if (!panel.isConnected || save.disabled) return;
    save.disabled = true;
    try {
      render(false);
      const jpeg = canvas.toDataURL('image/jpeg', .9);
      if (!jpeg.startsWith(JPEG_PREFIX)) throw new Error('JPEG unavailable');
      const encoded = jpeg.slice(JPEG_PREFIX.length);
      const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
      if (encoded.length / 4 * 3 - padding > MAX_JPEG || Math.max(width, height) > MAX_EDGE) {
        if (panel.isConnected) {
          finish();
          onUnavailable('This screenshot is too large.');
        }
        return;
      }
      const cleaned = stripCanvasMetadata(encoded);
      const img = h('img', {src:JPEG_PREFIX + cleaned, width, height, alt:'Marked-up page screenshot preview'});
      await img.decode();
      if (img.naturalWidth !== width || img.naturalHeight !== height) throw new Error('JPEG dimensions changed');
      if (panel.isConnected) {
        finish();
        onSave(img, cleaned);
      }
    } catch {
      if (panel.isConnected) {
        finish();
        onUnavailable('Could not read this screenshot.');
      }
    }
  }}, 'Save screenshot');
  const panel = h('section', {class:'feedback-markup', 'aria-labelledby':'screenshot-title'},
    h('h3', {id:'screenshot-title'}, 'Mark up your screenshot'),
    h('div', {class:'feedback-markup-tools', role:'group', 'aria-label':'Screenshot tools'}, tools, undo),
    h('p', {class:'hint', id:'screenshot-help'}, 'Tap or drag to mark. With a keyboard, use arrow keys to move and Enter to mark.'),
    surface, noteField, status,
    h('div', {class:'feedback-markup-actions'}, save, h('button', {type:'button', class:'btn', onclick:finish}, 'Cancel'), remove));
  const wrap = form.closest('.sheet-wrap');
  const events = new AbortController();

  function finish() {
    events.abort();
    panel.remove();
    form.hidden = false;
    opener.focus();
  }

  const options = {capture:true, signal:events.signal};
  wrap.addEventListener('click', event => {
    if (event.target === wrap) event.stopPropagation();
    else if (event.target.closest('#sheet-close')) {
      event.stopPropagation();
      finish();
    }
  }, options);
  // Catch Escape even when focus has left the sheet.
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    if (event.isComposing || event.repeat || !wrap.contains(event.target)) return;
    if (activeNote) {
      closeNote();
      undo.disabled = !marks.length;
      surface.focus();
      render();
    } else finish();
  }, options);
  render();
  form.hidden = true;
  form.after(panel);
  tools[0].focus();
  return events.abort.bind(events);
}

const clamp = (value, size) => Math.max(0, Math.min(size, value));
