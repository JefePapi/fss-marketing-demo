// One JSON blob in localStorage. If storage is blocked (private mode, a Teams frame),
// everything still works from memory for this page view.
import { clearFiles } from './files.js';
import { VERSION, STORE_KEY, STAFF, MANAGERS, setActivities, eventArea } from './config.js';
import { buildSeeds, buildActivities, FIRST_SEED, slugify } from './seed.js';
import { normalize, validatePart, applyEdit, canEdit, areaInfo } from './hours.js';
import { makeId } from './model.js';

const PREFS_KEY = 'mktdemo.prefs', DRAFT_KEY = 'mktdemo.draft';
let state = null, memOnly = false, prefs = null, draftMem = null;

const feedbackKey = 'mktdemo.feedback';
let feedbackMemory = null;
export async function withFeedbackLock(change) {
  let acquired = false;
  try {
    if (globalThis.navigator?.locks) return await navigator.locks.request(feedbackKey, () => {
      acquired = true;
      return change();
    });
  } catch (error) {
    if (acquired) throw error;
    // Embedded browsers may deny Web Locks along with persistent storage.
  }
  return change();
}
export function feedbackEntries() {
  const entries = feedbackMemory ?? readJson('localStorage', feedbackKey);
  return Array.isArray(entries) ? entries.filter(entry => entry && typeof entry.message === 'string') : [];
}
export function writeFeedback(entries) {
  const persisted = writeJson('localStorage', feedbackKey, entries);
  feedbackMemory = persisted ? null : (entries || []);
  globalThis.window?.dispatchEvent(new Event('feedbackchange'));
  return persisted;
}
export const feedbackTemporary = () => feedbackMemory !== null;

const box = name => { try { return globalThis[name] || null; } catch { return null; } };
function readJson(storeName, key) {
  try { const s = box(storeName); if (!s) throw 0; const raw = s.getItem(key); return raw ? JSON.parse(raw) : null; }
  catch { if (storeName === 'localStorage') memOnly = true; return null; }
}
function writeJson(storeName, key, value) {
  try { const s = box(storeName); if (!s) throw 0; value === null ? s.removeItem(key) : s.setItem(key, JSON.stringify(value)); return true; }
  catch { if (storeName === 'localStorage') memOnly = true; return false; }
}

export function upgrade(saved, now = new Date()) {
  const n=structuredClone(saved);
  const seeds=buildActivities(now);
  if(!Array.isArray(n.activities)) {n.activities=seeds.map(a=>({...a,history:[]}));n.notices=[];n.mail=[];n.seq=1;}
  n.activities=n.activities.map(a=>normalize({...a,areas:Array.isArray(a.areas)?a.areas:seeds.find(s=>s.id===a.id)?.areas || []}));n.notices=(n.notices || []).slice(-100);n.mail=(n.mail || []).slice(-100);n.seq=Number.isInteger(n.seq)?n.seq:1;
  return n;
}
const fresh = now => {
  const requests=buildSeeds(now), activities=buildActivities(now), a=activities.find(a=>a.id==='bowling'), entry=a.history[0];
  return {version:VERSION,counter:FIRST_SEED+requests.length,requests,activities,seq:2,
    notices:[{id:'n1',at:entry.at,activityId:a.id,activityName:a.name,by:entry.by,changes:entry.changes,read:false}],
    mail:[{at:entry.at,trigger:'activity-updated',activityId:a.id,to:STAFF.map(s=>s.id+'@example.com'),cc:[],subject:`${a.name}: updated by ${entry.by} — would email marketing`,lines:entry.changes}]};
};
export function init(now = new Date()) {
  const saved=readJson('localStorage',STORE_KEY);
  state=saved && saved.version===VERSION && Array.isArray(saved.requests) && Number.isInteger(saved.counter)?upgrade(saved,now):fresh(now);
  setActivities(state.activities);save();
}
export const save = () => writeJson('localStorage', STORE_KEY, state);
export function reset(now = new Date()) { state = fresh(now); setActivities(state.activities); save(); clearDraft(); clearFiles(); writeFeedback(null); }
export const memoryOnly = () => memOnly;
export const requests = () => state.requests;
export const find = id => state.requests.find(r => r.id === id);
export const exampleId = () => state.requests[0].id;
export const peekId = (now = new Date()) => makeId(state.counter, now);
export function add(req, now = new Date()) {
  const area=eventArea(req.event);
  req.event.areaId=area?.id || '';
  req.event.areaName=area?.name || '';
  req.id = makeId(state.counter++, now); state.requests.push(req); save(); return req; }

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

export const activity = id => state.activities.find(a=>a.id===id);
export const notices = () => state.notices;
export const mail = () => state.mail;
export function readNotice(id) {state.notices.forEach(n=>{if(!id || n.id===id)n.read=true;});save();}
// Re-check the current demo role at the write boundary, never trust a URL or actor.
export function saveActivity(id, part, draft, actor, now = new Date()) {
  const a=activity(id), role=pref('role') || 'marketing', manager=MANAGERS.find(m=>m.id===role);
  const ctx={staff:!!pref('staff') && !manager,staffSide:!!pref('staff'),manager};
  if(!['hours','closures','specials','details','admin','areas'].includes(part) || !canEdit(ctx,a,part) || (!a && (id!=='new' || part!=='admin')))return {blocked:true};
  let edit = draft;
  if(part==='areas') {
    const {areaId,name='',remove}=draft, existing=a.areas.find(x=>x.id===areaId);
    const info=draft.info || existing?.info || areaInfo(a.info,true);
    if(areaId && !existing || remove && !existing)return {blocked:true};
    const label=String(name).trim();
    if(!remove) {
      const error=!label || label.length>60 ? 'Enter an area name with 1 to 60 characters.'
        : a.areas.some(x=>x!==existing && x.name.toLowerCase()===label.toLowerCase()) ? 'That area name is already used.'
        : !existing && a.areas.length>=30 ? 'An activity can have up to 30 areas.' : '';
      if(error)return {errors:{'area-name':error}};
      const errors={...validatePart('hours',info),...validatePart('closures',info)};
      if(Object.keys(errors).length)return {errors};
    }
    let areaKey=existing?.id;
    if(!areaKey) {
      const base=slugify(label) || 'area';
      const used=new Set([...a.areas.map(x=>x.id),...state.requests.filter(r=>r.event.facilityId===id).map(r=>r.event.areaId)]);
      areaKey=base;
      for(let k=2;areaKey==='new' || used.has(areaKey);k++)areaKey=base+'-'+k;
    }
    const area={id:areaKey,name:label,info};
    edit={areaId:areaKey,areas:existing?a.areas.flatMap(x=>x!==existing?[x]:remove?[]:[area]):[...a.areas,area]};
  }
  const errors=validatePart(part,{...draft,id:a?.id || ''},state.activities);
  if(Object.keys(errors).length)return {errors};
  const actual={name:manager?manager.name:actor.name,role:manager?'manager':'marketing'};
  let target=a;
  if(!target) {
    const base=draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'activity';
    let slug=base,k=2;while(slug==='new' || activity(slug))slug=base+'-'+k++;
    target=normalize({id:slug,...draft});target.id=slug;
    const entry={at:now.toISOString(),by:actual.name,role:'marketing',hours:false,changes:['Activity added']};
    target.updated={at:entry.at,by:actual.name};target.history=[entry];state.activities.push(target);
  } else {
    const result=applyEdit(target,part,edit,actual,now.toISOString(),STAFF.map(s=>s.id));
    if(!result)return {unchanged:true};
    if(result.notice) {result.notice.id='n'+state.seq++;state.notices.push(result.notice);state.mail.push(result.mail);}
  }
  // New row ids are allocated only after a successful save.
  for(const [key,prefix] of [['closures','c'],['specials','p']])for(const row of target.info[key])if(String(row.id).startsWith('draft-')){let next;do {next=prefix+state.seq++;} while(target.info[key].some(x=>x.id===next));row.id=next;}
  state.notices=state.notices.slice(-100);state.mail=state.mail.slice(-100);setActivities(state.activities);save();return {activity:target};
}
