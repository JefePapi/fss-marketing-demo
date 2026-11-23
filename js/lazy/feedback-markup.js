import { field, h } from '../ui.js';
import { drawMarkup } from './feedback-markup-draw.js';

export function editScreenshot(source, form, opener, onSave) {
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
  const remove = h('button', {type:'button', class:'btn', onclick:finish}, 'Remove');
  const save = h('button', {type:'button', class:'btn primary', onclick:() => {
    if (!panel.isConnected) return;
    let jpeg;
    try {
      render(false);
      jpeg = canvas.toDataURL('image/jpeg', .9);
      if (!jpeg.startsWith('data:image/jpeg;base64,')) throw new Error('JPEG unavailable');
    } catch {
      render();
      status.textContent = 'Could not save the screenshot. Try again or choose Remove.';
      return;
    }
    finish();
    onSave(jpeg, width, height);
  }}, 'Save screenshot');
  const panel = h('section', {class:'feedback-markup', 'aria-labelledby':'screenshot-title'},
    h('h3', {id:'screenshot-title'}, 'Mark up your screenshot'),
    h('div', {class:'feedback-markup-tools', role:'group', 'aria-label':'Screenshot tools'}, tools, undo, remove),
    h('p', {class:'hint', id:'screenshot-help'}, 'Tap or drag to mark. With a keyboard, use arrow keys to move and Enter to mark.'),
    surface, noteField, status,
    h('div', {class:'feedback-markup-tools'}, save, h('button', {type:'button', class:'btn', onclick:finish}, 'Cancel')));
  const wrap = form.closest('.sheet-wrap');
  const events = new AbortController();

  function finish() {
    events.abort();
    panel.remove();
    form.hidden = false;
    opener.focus();
  }

  // Dismiss the editor first through the sheet's Close button, backdrop or Escape.
  function dismiss(event) {
    event.stopPropagation();
    finish();
  }
  const options = {capture:true, signal:events.signal};
  wrap.addEventListener('click', event => {
    if (event.target === wrap || event.target.closest('#sheet-close')) dismiss(event);
  }, options);
  wrap.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (event.isComposing) event.stopPropagation();
    else dismiss(event);
  }, options);
  render();
  form.hidden = true;
  form.after(panel);
  tools[0].focus();
}

const clamp = (value, size) => Math.max(0, Math.min(size, value));
