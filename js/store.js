// One JSON blob in localStorage. If storage is blocked (private mode, a Teams frame),
// everything still works from memory for this page view.
import { clearFiles } from './files.js';
import { VERSION, STORE_KEY } from './config.js';
import { buildSeeds, FIRST_SEED } from './seed.js';
import { makeId } from './model.js';

const PREFS_KEY = 'mktdemo.prefs', DRAFT_KEY = 'mktdemo.draft';
let state = null, memOnly = false, prefs = null, draftMem = null;

const box = name => { try { return globalThis[name] || null; } catch { return null; } };
function readJson(storeName, key) {
  try { const s = box(storeName); if (!s) throw 0; const raw = s.getItem(key); return raw ? JSON.parse(raw) : null; }
  catch { if (storeName === 'localStorage') memOnly = true; return null; }
}
function writeJson(storeName, key, value) {
  try { const s = box(storeName); if (!s) throw 0; value === null ? s.removeItem(key) : s.setItem(key, JSON.stringify(value)); return true; }
  catch { if (storeName === 'localStorage') memOnly = true; return false; }
}

const fresh = now => { const requests = buildSeeds(now); return { version: VERSION, counter: FIRST_SEED + requests.length, requests }; };

export function init(now = new Date()) {
  const saved = readJson('localStorage', STORE_KEY);
  if (saved && saved.version === VERSION && Array.isArray(saved.requests) && Number.isInteger(saved.counter)) state = saved;
  else { state = fresh(now); save(); }
}
export const save = () => writeJson('localStorage', STORE_KEY, state);
export function reset(now = new Date()) { state = fresh(now); save(); clearDraft(); clearFiles(); }
export const memoryOnly = () => memOnly;
export const requests = () => state.requests;
export const find = id => state.requests.find(r => r.id === id);
export const exampleId = () => state.requests[0].id;
export const peekId = (now = new Date()) => makeId(state.counter, now);
export function add(req, now = new Date()) { req.id = makeId(state.counter++, now); state.requests.push(req); save(); return req; }

// Small display preferences (staff view on/off, acting as, motion paused).
export function pref(key, value) {
  if (!prefs) prefs = readJson('localStorage', PREFS_KEY) || {};
  if (value === undefined) return prefs[key];
  prefs[key] = value; writeJson('localStorage', PREFS_KEY, prefs);
}

// The half-typed form, so Back or a reload never loses typing.
export const getDraft = () => readJson('sessionStorage', DRAFT_KEY) || draftMem;
export const setDraft = d => { draftMem = d; writeJson('sessionStorage', DRAFT_KEY, d); };
export const clearDraft = () => { draftMem = null; writeJson('sessionStorage', DRAFT_KEY, null); };
