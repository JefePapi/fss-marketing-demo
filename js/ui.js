// Small DOM helpers. Typed text always goes in as text nodes, never as HTML.
const PROPS = ['checked', 'disabled', 'selected', 'open', 'hidden'];

function add(parent, kid) {
  if (kid === null || kid === undefined || kid === false || kid === true || kid === '') return;
  if (Array.isArray(kid)) kid.forEach(k => add(parent, k));
  else parent.append(typeof kid === 'object' ? kid : document.createTextNode(String(kid)));
}

export function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  let value;
  for (const k in props || {}) {
    const v = props[k];
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'value') value = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (PROPS.includes(k)) e[k] = true;
    else e.setAttribute(k, v === true ? '' : v);
  }
  add(e, kids);
  if (value !== undefined) e.value = value; // after the options exist, so selects keep their value
  return e;
}

export function field(id, label, control, err, hint) {
  if (err) { control.setAttribute('aria-invalid', 'true'); control.setAttribute('aria-describedby', id + '-err'); }
  return h('div', { class: 'field' + (err ? ' bad' : '') },
    h('label', { for: id }, label), hint && h('p', { class: 'hint' }, hint), control,
    err && h('p', { class: 'err', id: id + '-err' }, err));
}
export const input = (id, type, value, oninput, attrs) => h('input', { id, type, value: value ?? '', oninput, ...attrs });
export const textarea = (id, value, oninput, attrs) => h('textarea', { id, rows: 4, value: value ?? '', oninput, ...attrs });
export const select = (id, opts, value, onchange, attrs) =>
  h('select', { id, value: value ?? '', onchange, ...attrs }, opts.map(([v, l]) => h('option', { value: v }, l)));

// Tap chips. Single choice (radio) calls onchange(value); multi mutates the array, then calls onchange().
export function chips(name, legend, opts, value, onchange, o = {}) {
  return h('fieldset', { class: 'chips' + (o.err ? ' bad' : ''), id: 'f-' + name },
    h('legend', null, legend),
    h('div', { class: 'chiprow' }, opts.map(([v, l]) => h('label', { class: 'chip' },
      h('input', {
        type: o.multi ? 'checkbox' : 'radio', name, id: `f-${name}-${v.replace(/\W+/g, '-')}`, value: v,
        checked: o.multi ? value.includes(v) : value === v,
        onchange: e => {
          if (!o.multi) return onchange(v);
          const at = value.indexOf(v);
          if (e.target.checked && at < 0) value.push(v);
          if (!e.target.checked && at >= 0) value.splice(at, 1);
          onchange();
        },
      }),
      h('span', null, l)))),
    o.err && h('p', { class: 'err' }, o.err));
}

export const pill = (key, label) => h('span', { class: 'pill s-' + key }, label);
export const facts = pairs => h('dl', { class: 'facts' }, pairs.filter(p => p && p[1] !== '' && p[1] != null).map(([k, v]) => [h('dt', null, k), h('dd', null, v)]));
export const page = (...kids) => h('div', { class: 'glass lens stack' }, kids);

let toastTimer;
export function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 4000);
}

// Popover on desktop, bottom sheet on phone (CSS decides). Esc, outside tap and Close all close it.
let closeCurrent = null;
export const closeSheet = () => { if (closeCurrent) closeCurrent(); };
export function openSheet(title, body, returnTo) {
  closeSheet();
  const close = () => {
    wrap.remove(); document.removeEventListener('keydown', key); closeCurrent = null;
    if (returnTo && returnTo.focus) returnTo.focus();
  };
  const key = e => {
    if (e.key === 'Escape') return close();
    if (e.key !== 'Tab') return;
    const f = [...sheet.querySelectorAll('a[href],button,input,select,textarea')]
      .filter(el => !el.disabled && el.getClientRects().length && (el.type !== 'radio' || el.checked));
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !f.includes(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const btn = h('button', { class: 'btn', id: 'sheet-close', type: 'button', onclick: close }, 'Close');
  const sheet = h('div', { class: 'sheet glass', id: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sheet-title' },
    h('div', { class: 'surface stack' }, h('h2', { id: 'sheet-title' }, title), body, h('div', { class: 'row end' }, btn)));
  const wrap = h('div', { class: 'sheet-wrap', onclick: e => { if (e.target === wrap) close(); } }, sheet);
  document.body.append(wrap);
  document.addEventListener('keydown', key);
  closeCurrent = close;
  btn.focus();
  return close;
}

export function confirmSheet(question, yesLabel, onYes, returnTo) {
  const close = openSheet(question, h('div', { class: 'row' },
    h('button', { class: 'btn primary', id: 'confirm-yes', type: 'button', onclick: () => { close(); onYes(); } }, yesLabel)), returnTo);
}

// Clipboard can be blocked (frames, old browsers); callers always show the text in a box too.
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    try {
      const t = h('textarea', { class: 'offscreen', value: text });
      document.body.append(t); t.select();
      const ok = document.execCommand('copy'); t.remove(); return ok;
    } catch { return false; }
  }
}
