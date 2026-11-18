// Hash router and page shell. No network calls anywhere in this app.
import { h, select, closeSheet, confirmSheet, toast } from './ui.js';
import { THEMES, currentTheme, setTheme, initTheme, themeStepArt, themeBrand } from './theme.js';
import { initFeedbackControls } from './feedback-controls.js';
import { STAFF, MANAGERS, staffName } from './config.js';
import * as store from './store.js';
import { otherView } from './views/other.js';
import { homeView } from './views/home.js';
import { requestView, dropDraft } from './views/request.js';
import { sentView } from './views/sent.js';
import { statusView } from './views/status.js';
import { staffQueue } from './views/staff-queue.js';
import { staffRequest } from './views/staff-request.js';
import { calendarView } from './views/calendar.js';

import { activitiesView, managerView } from './views/activities.js';
import { dropActivityDraft } from './views/activity-edit.js';

let scrollTimer;
window.addEventListener('scroll', () => {
  document.documentElement.classList.add('scrolling');
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    document.documentElement.classList.remove('scrolling');
    window.dispatchEvent(new Event('scrollidle'));
  }, 150);
}, { passive: true });

const VIEWS = {
  '': homeView, other: otherView, request: requestView, sent: sentView, status: statusView,
  activities: activitiesView, manager: managerView,
  about: ctx => import('./lazy/about.js').then(m => m.aboutView(ctx)),
  staff: ctx => {
    if (ctx.manager) return h('div',{class:'card',id:'role-blocked'},h('h1',{tabindex:-1},'This page is for Marketing'),h('button',{class:'btn',id:'role-to-marketing',onclick:()=>{store.pref('role','marketing');render();}},'Switch to Marketing'));
    switch (ctx.parts[1]) {
      case 'feedback': return import('./lazy/feedback-staff.js').then(m => m.staffFeedback(ctx));
      case 'notifications': return import('./lazy/notices.js').then(m => m.noticesView(ctx));
      case 'emails': return import('./lazy/notices.js').then(m => m.emailsView(ctx));
      case 'reports': return import('./lazy/reports.js').then(m => m.reportsView(ctx));
      default: return ctx.parts[1] ? staffRequest(ctx) : staffQueue(ctx);
    }
  },
  calendar: calendarView,
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
  confirmSheet('Clear everything you added in this browser?', 'Yes, reset the demo', async () => {
    await store.withFeedbackLock(() => store.reset()); dropDraft(); dropActivityDraft();
    toast('Demo data is back to the samples.');
    if (location.hash === '#/about' || location.hash.startsWith('#/staff?') || location.hash === '#/staff') render(); else go('#/');
  }, from);
}

function drawNav(ctx) {
  const active = ctx.parts[0] === 'staff' && ctx.parts[1] === 'notifications' ? 'staff/notifications' : ctx.parts[0] || '';
  const cur = name => active === name ? 'page' : null;
  const a = (id, label, href, name) => h('a', { id, href, 'aria-current': cur(name) }, label);
  const nav = $('nav');
  $('brand').setAttribute('href',ctx.readonly?location.hash:ctx.manager?'#/manager':ctx.staff?'#/staff':'#/');
  if(ctx.readonly)return nav.replaceChildren(h('span',{class:'navnote'},'Calendar · read-only'));
  const toggle=h('button',{type:'button',class:'staff-toggle',id:'staff-toggle','data-test':'staff-toggle','aria-pressed':String(ctx.staffSide),onclick:()=>{setStaff(!ctx.staffSide);go(ctx.staffSide?'#/':'#/staff');}},'Staff view (demo)');
  const activityLink=a('nav-activities','Activities','#/activities','activities');
  const role=ctx.staffSide && h('label',{class:'acting',for:'demo-role'},'Role:',select('demo-role',[['marketing','Marketing'],...MANAGERS.filter(m=>m.demo).map(m=>[m.id,m.label+' — '+m.name])],ctx.role,e=>{store.pref('role',e.target.value);dropActivityDraft();go(e.target.value==='marketing'?'#/staff':'#/manager');},{'data-test':'demo-role'}));
  const unread=store.notices().filter(n=>!n.read).length;
  const notices=a('nav-notices','Notifications','#/staff/notifications','staff/notifications');
  if(unread)notices.append(h('span',{id:'notice-count',class:'count','data-test':'notice-count'},unread));
  const items = ctx.manager?[a('nav-my','My activities','#/manager','manager'),a('nav-calendar','Calendar','#/calendar','calendar'),role,toggle]:ctx.staff?
    [a('nav-queue','Queue','#/staff','staff'),activityLink,notices,a('nav-calendar','Calendar','#/calendar','calendar'),
      h('label',{class:'acting',for:'acting-as'},'Acting as:',select('acting-as',STAFF.map(s=>[s.id,s.name]),ctx.actingAs,e=>{store.pref('actingAs',e.target.value);render();},{'data-test':'acting-as'})),role,toggle]:
    [a('nav-home','Home','#/',''),a('nav-request','Request','#/request','request'),activityLink,a('nav-calendar','Calendar','#/calendar','calendar'),toggle];
  const links = items.filter(el => el.tagName === 'A');
  const settings = items.filter(el => el.tagName === 'LABEL');
  nav.replaceChildren(h('div', {class:'nav-links'}, links),
    ...(settings.length ? [h('div', {class:'identity-controls'}, settings)] : []), toggle);
}

async function render(opts = {}) {
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
  activeContext = ctx;
  const app = $('app');
  app.className = 'route-' + (name || 'home');
  let view = VIEWS[name](ctx);
  if (view instanceof Promise) {
    app.replaceChildren(h('p', {role:'status'}, 'Loading page…'));
    try { view = await view; }
    catch { view = h('button', {class:'btn', onclick:() => render()}, 'Page could not load. Try again'); }
    if (activeContext !== ctx) return;
  }
  app.replaceChildren(view);

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
let activeContext;

// Motion: frozen when the visitor asks, here or in their system settings (CSS handles the latter).
function drawMotion() {
  const still = !!store.pref('still');
  root.classList.toggle('still', still);
  const b = $('pause-motion');
  b.textContent = still ? 'Play motion' : 'Pause motion';
  b.setAttribute('aria-pressed', String(still));
}

const designSelect = $('theme-select');
designSelect.replaceChildren(...THEMES.map(({id, label}) => h('option', {value:id}, label)));
designSelect.value = currentTheme();
designSelect.parentElement.hidden = false;
designSelect.addEventListener('change', () => setTheme(designSelect.value));
const originalBrand = [...$('brand').childNodes];
window.addEventListener('designchange', () => {
  designSelect.value = currentTheme();
  $('brand').replaceChildren(...(themeBrand() || originalBrand));
  // Only the home content and wizard illustration depend on the art module.
  // Keep live form controls, their selection, draft values, and open dialogs.
  if (!activeContext.parts.length) {
    const focus = $('app').contains(document.activeElement) && document.activeElement.id;
    $('app').replaceChildren(homeView(activeContext));
    if (focus) $(focus)?.focus({preventScroll:true});
  } else {
    const head = document.querySelector('.step-head');
    if (head) {
      head.querySelector('.step-print, .step-art')?.remove();
      const art = themeStepArt(Number(head.dataset.step));
      if (art) head.prepend(art);
    }
  }
});
window.addEventListener('designerror', () => {
  designSelect.value = currentTheme();
  toast('This design could not load. Please try again.');
});

store.init();
initFeedbackControls();
$('pause-motion').addEventListener('click', () => { store.pref('still', !store.pref('still')); drawMotion(); });
drawMotion();
window.addEventListener('hashchange', () => render());
render();
initTheme();
