// Browser-only bytes. Metadata alone lives in the request JSON.
import { h } from './ui.js';
import { download } from './export.js';
const memory = new Map();
let unavailable = false, opening, pending = 0;
export const filesPending = () => pending > 0;
const TYPES = 'jpg jpeg png gif pdf doc docx xls xlsx ppt pptx txt ai psd eps svg zip'.split(' ');
export const limits = 'Max 25 files, 15 MB each. Types: ' + TYPES.join(', ') + '. Nothing is uploaded anywhere.';
function db() {
  if (!opening) opening = new Promise((resolve, reject) => {
    const r = indexedDB.open('mktdemo-files', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('Storage blocked'));
  });
  return opening;
}
async function write(id, blob) {
  memory.set(id, blob);
  try { const d = await db(); await new Promise((resolve,reject) => {
    const t = d.transaction('files', 'readwrite'); t.objectStore('files').put(blob,id);
    t.oncomplete = resolve; t.onerror = () => reject(t.error); t.onabort = () => reject(t.error);
  }); memory.delete(id); } catch { unavailable = true; }
}
async function read(id) {
  try { const d = await db(); const result = await new Promise((resolve,reject) => {
    const r = d.transaction('files').objectStore('files').get(id); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  }); return result || memory.get(id); } catch { return memory.get(id); }
}
async function removeFile(id) {
  memory.delete(id);
  try { const d = await db(); d.transaction('files','readwrite').objectStore('files').delete(id); } catch { /* Memory-only pick already removed. */ }
}
export async function clearFiles() {
  memory.clear();
  try { const d = await db(); d.transaction('files','readwrite').objectStore('files').clear(); } catch { unavailable = true; }
}
export function filePicker(id, files, changed = () => {}) {
  const list = h('div', { class: 'stack' }), err = h('p', { class: 'err', id: id + '-err', role: 'status' });
  const note = h('p', { class: 'hint' });
  const draw = () => {
    note.textContent = unavailable ? 'File storage unavailable: bytes stay in memory for this page view only.' : 'Files stay in this browser only.';
    list.replaceChildren(...files.map(f => h('div', { 'data-test': 'file-item', class: 'row wrap' }, f.name,
      h('button', { type:'button', class:'btn', onclick: () => { files.splice(files.indexOf(f),1); removeFile(f.id); changed(); draw(); } }, 'Remove'))));
  };
  draw();
  const control = h('input', { id, type:'file', multiple:true, accept:TYPES.map(t => '.'+t).join(','), onchange: async ev => {
    control.disabled = true; pending++; note.textContent = 'Saving files in this browser…'; const errors = [];
    for (const f of ev.target.files) {
      const ext = f.name.split('.').pop().toLowerCase();
      if (files.length >= 25) { errors.push(f.name + ': max 25 files.'); continue; }
      if (f.size > 15*1024*1024) { errors.push(f.name + ': exceeds 15 MB.'); continue; }
      if (!TYPES.includes(ext)) { errors.push(f.name + ': file type not allowed.'); continue; }
      const id = crypto.randomUUID(); await write(id,f);
      files.push({id,name:f.name,size:f.size,type:f.type});
    }
    err.textContent = errors.join(' '); control.value = ''; control.disabled = false; pending--; changed(); draw();
  }});
  return h('div', { class:'field' }, h('label', { for:id }, 'Add pictures or files (optional)'),
    h('p', { class:'hint', id: id === 'f-files' || id === 'o-files' ? 'file-limits' : id+'-limits' },limits), control, err, note, list);
}
export function attachments(files = []) {
  return h('div', { class:'stack' }, files.map(f => h('div', { 'data-test':'attachment', class:'row wrap' },f.name,
    h('button', { type:'button', class:'btn', 'data-test':'attachment-download', onclick: async () => {
      const blob = await read(f.id);
      if (blob) download(f.name, f.type || 'application/octet-stream', blob);
      else alert('These file bytes are no longer available in this browser.');
    }},'Download'))));
}
