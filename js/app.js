// Hash router and page shell. No network calls anywhere in this app.
import { h, select, closeSheet, confirmSheet, toast } from './ui.js';
import { STAFF, MANAGERS, staffName } from './config.js';
import * as store from './store.js';
import { otherView } from './views/other.js';
import { reportsView } from './views/reports.js';
import { homeView } from './views/home.js';
import { requestView, dropDraft } from './views/request.js';
import { sentView } from './views/sent.js';
import { statusView } from './views/status.js';
import { staffQueue } from './views/staff-queue.js';
import { staffRequest } from './views/staff-request.js';
import { calendarView } from './views/calendar.js';
import { aboutView } from './views/about.js';

import { activitiesView, managerView } from './views/activities.js';
import { dropActivityDraft } from './views/activity-edit.js';
import { noticesView, emailsView } from './views/notices.js';

let scrollTimer;
window.addEventListener('scroll', () => {
  document.documentElement.classList.add('scrolling');
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => document.documentElement.classList.remove('scrolling'), 150);
}, { passive: true });

const VIEWS = {
  '': homeView, other: otherView, request: requestView, sent: sentView, status: statusView,
  activities: activitiesView, manager: managerView,
  staff: ctx => ctx.manager ? h('div',{class:'card',id:'role-blocked'},h('h1',{tabindex:-1},'This page is for Marketing'),h('button',{class:'btn',id:'role-to-marketing',onclick:()=>{store.pref('role','marketing');render();}},'Switch to Marketing')) : ctx.parts[1] === 'notifications' ? noticesView(ctx) : ctx.parts[1] === 'emails' ? emailsView(ctx) : ctx.parts[1] === 'reports' ? reportsView(ctx) : ctx.parts[1] ? staffRequest(ctx) : staffQueue(ctx), calendar: calendarView, about: aboutView,
};
const $ = id => document.getElementById(id);
const root = document.documentElement;
let lastPath = null;

function parse() {
  const raw = location.hash.replace(/^#\/?/, ''), cut = raw.indexOf('?');
  const path = cut < 0 ? raw : raw.slice(0, cut);
  let parts;
  try { parts = path.split('/').filter(Boolean).map(decodeURIComponent); } catch { parts = []; }
  return { parts, params: new URLSearchParams(cut < 0 ? '' : raw.slice(cut + 1)) };
}

function go(hash, replace) {
  if (replace) { history.replaceState(null, '', hash); render(); }
  else if (location.hash === hash) render();
  else location.hash = hash;
}

function setStaff(on) { store.pref('staff', !!on); if(!on)store.pref('role','marketing'); }

function resetDemo(from) {
  confirmSheet('Clear everything you added in this browser?', 'Yes, reset the demo', () => {
    store.reset(); dropDraft(); dropActivityDraft();
    toast('Demo data is back to the samples.');
    if (location.hash === '#/about' || location.hash.startsWith('#/staff?') || location.hash === '#/staff') render(); else go('#/');
  }, from);
}

function drawNav(ctx) {
  const cur = name => ctx.parts[0] === name || (!ctx.parts[0] && name === '') ? 'page' : null;
  const a = (id, label, href, name) => h('a', { id, href, 'aria-current': cur(name) }, label);
  const nav = $('nav');
  $('brand').setAttribute('href',ctx.readonly?location.hash:ctx.manager?'#/manager':ctx.staff?'#/staff':'#/');
  if(ctx.readonly)return nav.replaceChildren(h('span',{class:'navnote'},'Calendar · read-only'));
  const toggle=h('button',{type:'button',class:'staff-toggle',id:'staff-toggle','data-test':'staff-toggle','aria-pressed':String(ctx.staffSide),onclick:()=>{setStaff(!ctx.staffSide);go(ctx.staffSide?'#/':'#/staff');}},'Staff view (demo)');
  const activityLink=a('nav-activities','Activities','#/activities','activities');
  const role=ctx.staffSide && h('label',{class:'acting',for:'demo-role'},'Role:',select('demo-role',[['marketing','Marketing'],...MANAGERS.filter(m=>m.demo).map(m=>[m.id,m.label+' — '+m.name])],ctx.role,e=>{store.pref('role',e.target.value);dropActivityDraft();go(e.target.value==='marketing'?'#/staff':'#/manager');},{'data-test':'demo-role'}));
  const unread=store.notices().filter(n=>!n.read).length;
  const notices=a('nav-notices','Notifications','#/staff/notifications','staff');
  if(unread)notices.append(h('span',{id:'notice-count',class:'count','data-test':'notice-count'},unread));
  nav.replaceChildren(...(ctx.manager?[a('nav-my','My activities','#/manager','manager'),a('nav-calendar','Calendar','#/calendar','calendar'),role,toggle]:ctx.staff?
    [a('nav-queue','Queue','#/staff','staff'),activityLink,notices,a('nav-calendar','Calendar','#/calendar','calendar'),
      h('label',{class:'acting',for:'acting-as'},'Acting as:',select('acting-as',STAFF.map(s=>[s.id,s.name]),ctx.actingAs,e=>{store.pref('actingAs',e.target.value);render();},{'data-test':'acting-as'})),role,toggle]:
    [a('nav-home','Home','#/',''),a('nav-request','Request','#/request','request'),activityLink,a('nav-calendar','Calendar','#/calendar','calendar'),toggle]));
}

function render(opts = {}) {
  const { parts, params } = parse();
  const name = Object.hasOwn(VIEWS, parts[0] || '') ? parts[0] || '' : ''; // unknown route -> Home
  const readonly = name === 'calendar' && params.get('readonly') === '1'; // read from the URL on every render
  if (name === 'staff' && !store.pref('staff')) setStaff(true);
  const staffSide=!readonly && !!store.pref('staff'), role=store.pref('role') || 'marketing';
  const manager=staffSide ? MANAGERS.find(m=>m.demo && m.id===role) || null : null;
  const ctx = {
    parts: name ? parts : [], params, now: new Date(), readonly,
    staffSide, role, manager, staff:staffSide && !manager,
    actingAs: STAFF.some(s => s.id === store.pref('actingAs')) ? store.pref('actingAs') : STAFF[0].id,
    go, setStaff, resetDemo, refresh: o => render(o),
  };
  ctx.actor={name:manager?.name || staffName(ctx.actingAs),role:manager?'manager':'marketing'};
  const path = ctx.parts.join('/'), same = path === lastPath;
  const focusId = same && document.activeElement ? document.activeElement.id : '';
  if (!same) closeSheet();
  const areaEditor = name === 'activities' && parts[2] === 'areas' &&
    (parts[3] === 'new' || parts[4] === 'edit');
  if (!path.includes('/edit/') && path !== 'activities/new' && !areaEditor) dropActivityDraft();
  lastPath = path;

  root.classList.toggle('readonly', readonly);
  $('about-link').hidden = readonly;
  $('store-note').hidden = !store.memoryOnly();
  drawNav(ctx);
  const app = $('app');
  app.replaceChildren(VIEWS[name](ctx));

  if (!same || opts.top) {
    window.scrollTo(0, 0);
    const h1 = app.querySelector('h1');
    if (h1 && (opts.top || started)) h1.focus(); // not on first load: do not steal focus
  } else if (focusId) {
    const el = $(focusId);
    if (el) el.focus();
  }
  started = true;
}
let started = false;

// Motion: frozen when the visitor asks, here or in their system settings (CSS handles the latter).
function drawMotion() {
  const still = !!store.pref('still');
  root.classList.toggle('still', still);
  const b = $('pause-motion');
  b.textContent = still ? 'Play motion' : 'Pause motion';
  b.setAttribute('aria-pressed', String(still));
}

store.init();
$('pause-motion').addEventListener('click', () => { store.pref('still', !store.pref('still')); drawMotion(); });
drawMotion();
window.addEventListener('hashchange', () => render());
render();
