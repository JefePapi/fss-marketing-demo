// The one request form: four short steps.
import { h, field, input, textarea, select, chips, facts, page } from '../ui.js';
import { activities, facility, eventArea, eventFacilityName, SERVICES, svc, TEAMS, SIZES, SOCIAL_KINDS, AF_CONNECT, OLD_FORMS } from '../config.js';
import { leadTime, ymd, fmtDM, fmtDate, dateText, timeText, newJob, diffDays, isYmd } from '../model.js';
import * as store from '../store.js';

import { requestActivityInfo, hoursCheck, eventActivity } from './activities.js';
import { filePicker, filesPending } from '../files.js';
import { ccList, ccError, received, defaultFlash } from '../actions.js';
import { staffName } from '../config.js';

export const botTrap = (value, change) => h('div', { class: 'bot-trap', 'aria-hidden':'true' }, h('label',{for:'f-website'},'Leave this empty'), input('f-website','text',value,change,{name:'website',tabindex:-1,autocomplete:'off','aria-hidden':'true'}));

const STEPS = ['About you', 'About the event', 'What do you need from Marketing?', 'Check and send'];
const blank = () => ({
  step: 1, name: '', email: '', phone: '', cc: '', remember: false, bystaff: false, website: '', files: [],
  facilityId: '', areaId: '', title: '', description: '', date: '', multi: false, endDate: '', allDay: false, start: '', end: '',
  where: '', cost: '', est: '', joint: '', signup: '', afConnect: '',
  services: [], calOnly: false, sizes: [], qty: {}, inHand: '', kinds: [], breakEven: '', cash: '', items: '', page: '',
});
let d = null, errs = {}, sending = false;

const YESNO = [['yes', 'Yes'], ['no', 'No']];

export function leadNote(date, today) {
  if (!isYmd(date)) return null;
  const lt = leadTime(date, today);
  if (lt.past) return h('p', { class: 'note warn', id: 'lead-note-text', 'data-test': 'lead-note' }, 'That day has already passed. Choose today or later.');
  const by = ['For full service, events should be sent in by ', h('strong', null, fmtDM(lt.sendBy)), '. '];
  return h('p', { class: 'note' + (lt.late ? ' warn' : ''), id: 'lead-note-text', 'data-test': 'lead-note', 'data-late': lt.late ? '1' : '0' },
    by, lt.late ? 'This one is inside that window. You can still send it; Marketing will tell you what is possible.' : 'You are in good time.',
    h('span', { class: 'sub' }, ' (Sample rule for this demo.)'));
}

// The shared event facts. Used by the form (step 2) and by staff "Edit facts".
export function eventFields(d, o) {
  // Boxes that show or hide other boxes do it in place, so the ticked box itself is never replaced.
  const set = (k, show) => e => {
    d[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if(k==='facilityId') {d.areaId='';d.areaName='';drawAreas();}
    o.changed(); if (show) show(); if(['areaId','facilityId','endDate','start','end','multi','allDay'].includes(k))drawInfo();
  };
  const areas=h('div');
  function drawAreas() {
    const choices=(facility(d.facilityId).areas || []).map(a=>[a.id,a.name]);
    if(!o.info && d.areaId && !eventArea(d))choices.push([d.areaId,d.areaName || 'Removed area']);
    areas.replaceChildren(...(choices.length?[field('f-areaId','Which area? (optional)',
      select('f-areaId',[['','Whole activity'],...choices],d.areaId || '',set('areaId')))]:[]));
    areas.hidden=!choices.length;
  }
  drawAreas();
  const info=h('div',{id:'activity-info-wrap','aria-live':'polite'});
  const drawInfo=()=>{if(o.info)info.replaceChildren(...requestActivityInfo(eventActivity(d),{...d,endDate:d.multi?d.endDate:''},o.today));};
  drawInfo();
  const e0 = o.errs;
  const endField = field('f-endDate', 'Ends on', input('f-endDate', 'date', d.endDate, set('endDate')), e0.endDate);
  const times = h('div', { class: 'two' },
    field('f-start', 'Starts', input('f-start', 'time', d.start, set('start')), e0.start),
    field('f-end', 'Ends (optional)', input('f-end', 'time', d.end, set('end')), e0.end));
  const show = () => { endField.hidden = !d.multi; times.hidden = !!d.allDay; };
  show();
  const note = h('div', { id: 'lead-note', 'aria-live': 'polite' });
  const drawNote = () => note.replaceChildren(...[o.lead && d.date ? leadNote(d.date, o.today) : null].filter(Boolean));
  drawNote();
  const e = o.errs;
  return [
    field('f-facilityId', 'Which facility or activity?', select('f-facilityId',[['', 'Choose one'], ...activities().filter(f=>!f.archived || f.id===d.facilityId).map(f => [f.id, f.name+(f.archived?' (archived)':'')])], d.facilityId, set('facilityId')), e.facilityId),
    areas, o.info && info,
    field('f-title', 'What is it called?', input('f-title', 'text', d.title, set('title'), { maxlength: 80, autocomplete: 'off' }), e.title),
    field('f-description', 'What is happening?', textarea('f-description', d.description, set('description'), { maxlength: 600 }), e.description, 'A few sentences is plenty.'),
    field('f-date', 'What day is it?', input('f-date', 'date', d.date, ev => { d.date = ev.target.value; o.changed(); drawNote(); drawInfo(); }), e.date),
    note,
    h('label', { class: 'choice small' }, h('input', { type: 'checkbox', id: 'f-multi', checked: d.multi, onchange: set('multi', show) }), h('span', null, 'It lasts more than one day')),
    endField,
    h('fieldset', { class: 'chips' }, h('legend', null, 'What time?'),
      times,
      h('label', { class: 'choice small' }, h('input', { type: 'checkbox', id: 'f-allDay', checked: d.allDay, onchange: set('allDay', show) }), h('span', null, 'All day / time not set yet'))),
    field('f-where', 'Where exactly?', input('f-where', 'text', d.where, set('where'), { maxlength: 80 }), e.where),
    field('f-cost', 'What does it cost the customer?', input('f-cost', 'text', d.cost, set('cost'), { maxlength: 40 }), e.cost, '"Free" is fine.'),
    field('f-est', 'How many people do you expect? (optional)', input('f-est', 'number', d.est, set('est'), { min: 0, max: 100000, inputmode: 'numeric' }), e.est),
    chips('joint', 'Is it a joint event?', YESNO, d.joint, v => { d.joint = v; o.changed(); }, { err: e.joint }),
    chips('signup', 'Do people have to sign up?', YESNO, d.signup, v => { d.signup = v; o.changed(); }, { err: e.signup }),
    chips('afConnect', 'Is it on the AF Connect app?', Object.entries(AF_CONNECT), d.afConnect, v => { d.afConnect = v; o.changed(); }, { err: e.afConnect }),
  ];
}

export function validateEvent(d, today, allowPast) {
  const e = {};
  if (!d.facilityId) e.facilityId = 'Choose a facility.';
  if (!d.title.trim()) e.title = 'Give it a name.';
  if (!d.description.trim()) e.description = 'Tell us what is happening.';
  if (!isYmd(d.date)) e.date = 'Choose the day.';
  else if (!allowPast && d.date < today) e.date = 'That day has already passed. Choose today or later.';
  if (d.multi && !e.date) {
    if (!isYmd(d.endDate)) e.endDate = 'Choose the last day.';
    else if (d.endDate <= d.date) e.endDate = 'The last day must be after the first day.';
    else if (diffDays(d.endDate, d.date) > 30) e.endDate = 'Keep it to 31 days or fewer in this demo.';
  }
  if (!d.allDay && !d.start) e.start = 'Add a start time, or tick the box below.';
  if (!d.allDay && d.start && d.end && d.end <= d.start) e.end = 'The end time must be after the start.';
  if (!d.where.trim()) e.where = 'Tell us where.';
  if (!d.cost.trim()) e.cost = 'Tell us the cost. "Free" is fine.';
  if (d.est !== '' && !(Number(d.est) >= 0)) e.est = 'Use a number.';
  for (const k of ['joint', 'signup', 'afConnect']) if (!d[k]) e[k] = 'Pick one.';
  return e;
}

export const eventFromDraft = d => ({
  facilityId: d.facilityId, areaId: eventArea(d)?.id || '', areaName: eventArea(d)?.name || '', section: facility(d.facilityId).section, title: d.title.trim(), description: d.description.trim(),
  date: d.date, endDate: d.multi && d.endDate > d.date ? d.endDate : '', allDay: !!d.allDay,
  start: d.allDay ? '' : d.start, end: d.allDay ? '' : d.end, where: d.where.trim(), cost: d.cost.trim(),
  estAttendance: d.est === '' ? null : Number(d.est), actualAttendance: null,
  joint: d.joint === 'yes', signup: d.signup === 'yes', afConnect: d.afConnect,
});
export const draftFromEvent = e => ({
  facilityId: e.facilityId, areaId: e.areaId || '', areaName: e.areaName || '', title: e.title, description: e.description, date: e.date, multi: !!e.endDate, endDate: e.endDate || '',
  allDay: !!e.allDay, start: e.start || '', end: e.end || '', where: e.where, cost: e.cost,
  est: e.estAttendance == null ? '' : String(e.estAttendance), joint: e.joint ? 'yes' : 'no', signup: e.signup ? 'yes' : 'no', afConnect: e.afConnect,
});

// Service answers from the draft, shaped for a lane.
export function jobDetails(service, d) {
  if (service === 'print') return { sizes: [...d.sizes], qty: Object.fromEntries(d.sizes.filter(s => d.qty[s] !== '').map(s => [s, Number(d.qty[s] || 0)])), inHand: d.inHand };
  if (service === 'social') return { kinds: [...d.kinds] };
  if (service === 'sponsorship') return { breakEven: d.breakEven, cash: d.cash.trim(), items: d.items.trim() };
  if (service === 'web') return { page: d.page.trim() };
  if (service === 'flash') return { flashSection: defaultFlash(d.facilityId) };
  return {};
}

function validate(step, today) {
  if (step === 1) {
    const e = {};
    if (!d.name.trim()) e.name = 'Tell us your name.';
    if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) e.email = 'Add an email like name@example.com.';
    if (ccError(d.cc)) e.cc = ccError(d.cc);
    return e;
  }
  if (step === 2) return validateEvent(d, today, false);
  if (step === 3 && !d.calOnly && !d.services.length) return { services: 'Tick at least one, or "Just put it on the calendar".' };
  return {};
}

const SERVICE_EXTRAS = {
  print: save => {
    const quantities = h('div', { class:'stack' });
    const draw = () => quantities.replaceChildren(...d.sizes.map(s => field('f-qty-'+s.toLowerCase(), 'How many '+s+'?', input('f-qty-'+s.toLowerCase(),'number',d.qty[s] || '',e => {d.qty[s]=e.target.value;save();},{min:1,max:5000,inputmode:'numeric'}))));
    draw();
    return [chips('sizes','Which sizes?',SIZES.map(s => [s,s]),d.sizes,() => {save();draw();},{multi:true}),quantities,
      field('f-inHand', 'When do you need it in hand?', input('f-inHand', 'date', d.inHand, e => { d.inHand = e.target.value; save(); }))];
  },
  social: save => [chips('kinds', 'Which one?', SOCIAL_KINDS.map(s => [s, s]), d.kinds, save, { multi: true })],
  sponsorship: save => [
    field('f-breakEven', 'Break-even number', input('f-breakEven', 'number', d.breakEven, e => { d.breakEven = e.target.value; save(); }, { min: 0, inputmode: 'numeric' }), null, 'How many people you need to cover costs.'),
    field('f-cash', 'Cash asked for (optional)', input('f-cash', 'text', d.cash, e => { d.cash = e.target.value; save(); }, { maxlength: 40 })),
    field('f-items', 'Items asked for (optional)', input('f-items', 'text', d.items, e => { d.items = e.target.value; save(); }, { maxlength: 120 })),
    h('p', { class: 'hint' }, 'Expected attendance: ', h('strong', null, d.est === '' ? 'not given' : d.est), ' (from the event step; not asked twice).'),
  ],
  web: save => [field('f-page', 'Which page? (optional)', input('f-page', 'text', d.page, e => { d.page = e.target.value; save(); }, { maxlength: 80 }))],
};

export function requestView(ctx) {
  if (!d) { sending = false; const remembered = store.pref('contact'); d = { ...blank(), ...(remembered || {}), remember: !!remembered, ...(store.getDraft() || {}) }; if(typeof d.qty !== 'object') d.qty = {}; }
  const today = ymd(ctx.now), save = () => store.setDraft(d);
  const goStep = n => { d.step = n; errs = {}; save(); ctx.refresh({ top: true }); };
  const next = () => {
    if(filesPending()) return;
    errs = validate(d.step, today);
    const bad = Object.keys(errs)[0];
    if (!bad) return goStep(d.step + 1);
    ctx.refresh();
    const el = bad === 'services' ? document.getElementById('svc-print') : document.querySelector(`#f-${bad} input`) || document.getElementById('f-' + bad);
    if (el) el.focus();
  };
  const set = k => e => { d[k] = e.target.value; save(); };

  const rail = h('ol', { class: 'rail', 'aria-hidden': 'true' }, STEPS.map((_, i) =>
    h('li', { class: i + 1 < d.step ? 'done' : i + 1 === d.step ? 'now' : '' }, h('span', null, i + 1 < d.step ? '✓' : String(i + 1)))));
  const head = h('div', { class: 'surface' },
    h('p', { class: 'eyebrow', id: 'step-label', 'data-test': 'step-label' }, `Step ${d.step} of 4`), rail,
    h('h1', { tabindex: '-1' }, STEPS[d.step - 1]),
    d.step === 1 && h('p', { class: 'note' }, 'Demo: please use made-up details. Nothing you type leaves this browser.'));

  let body;
  if (d.step === 1) {
    const suggest = h('div');
    const drawSuggest = () => {
      const typos = {'gmial.com':'gmail.com','gmai.com':'gmail.com','gmail.co':'gmail.com','gamil.com':'gmail.com','hotmial.com':'hotmail.com','outlok.com':'outlook.com','yaho.com':'yahoo.com','yahooo.com':'yahoo.com','exmaple.com':'example.com','example.con':'example.com'};
      const [name,domain] = d.email.split('@'), fixed = typos[(domain || '').toLowerCase()];
      suggest.replaceChildren(...(fixed ? [h('button',{type:'button',class:'btn',id:'email-suggest',onclick:() => {d.email=name+'@'+fixed;save();ctx.refresh();}},'Did you mean '+name+'@'+fixed+'?')] : []));
    }; drawSuggest();
    body = [
      h('button', {
        class: 'btn', type: 'button', id: 'fill-sample', 'data-test': 'fill-sample', onclick: () => {
          Object.assign(d, {
            name: 'Jordan Hale', email: 'jordan.hale@example.com', phone: '', facilityId: 'fitness', areaId: '', title: 'Fall Fest 5K',
            description: 'A sample community 5K fun run.', date: ymd(new Date(ctx.now.getFullYear(), ctx.now.getMonth() + 4, 20)),
            multi: false, endDate: '', allDay: false, start: '08:00', end: '11:00', where: 'Fitness Center track', cost: 'Free',
            est: '250', joint: 'no', signup: 'yes', afConnect: 'notyet',
          });
          errs = {}; save(); ctx.refresh();
        },
      }, 'Fill with sample answers'),
      field('f-name', 'Your name', input('f-name', 'text', d.name, set('name'), { autocomplete: 'off', maxlength: 60 }), errs.name),
      field('f-email', 'Your email', input('f-email', 'email', d.email, e => { d.email=e.target.value;save();drawSuggest(); }, { autocomplete: 'off', maxlength: 80, placeholder: 'name@example.com' }), errs.email),
      suggest,
      field('f-cc','Also send updates to (optional)',input('f-cc','text',d.cc,set('cc')),errs.cc,'Comma-separated, up to 5 emails.'),
      h('label',{class:'choice'},h('input',{id:'f-remember',type:'checkbox',checked:d.remember,onchange:e => {d.remember=e.target.checked;save();}}),'Remember my details on this device'),
      ctx.staff && h('label',{class:'choice'},h('input',{id:'f-bystaff',type:'checkbox',checked:d.bystaff,onchange:e => {d.bystaff=e.target.checked;save();}}),'Sent in by staff for a caller'),
      field('f-phone', 'Your phone (optional)', input('f-phone', 'tel', d.phone, set('phone'), { autocomplete: 'off', maxlength: 30, placeholder: 'Leave blank in the demo' })),
    ];
  } else if (d.step === 2) {
    body = eventFields(d, { errs, today, lead: true, info: true, changed: save, refresh: () => ctx.refresh() });
  } else if (d.step === 3) {
    // Ticking a box shows or hides things in place; the ticked box itself is never replaced.
    const boxes = [];
    const calInput = h('input', {
      type: 'checkbox', id: 'svc-calonly', 'data-test': 'svc-calonly', checked: d.calOnly,
      onchange: e => { d.calOnly = e.target.checked; if (d.calOnly) d.services = []; sync(); },
    });
    const calBox = h('div', { class: 'choicebox' }, h('label', { class: 'choice' }, calInput,
      h('span', null, h('strong', null, 'Just put it on the calendar'), h('small', null, 'No work for Marketing. Unticks the others.'))));
    const errLine = h('p', { class: 'err', id: 'f-services-err' }, errs.services || '');
    const oldWay = h('p', { class: 'note good', id: 'old-way-line', 'data-test': 'old-way-line' });
    const draw = () => {
      for (const b of boxes) {
        const on = d.services.includes(b.id);
        b.input.checked = on; b.extras.hidden = !on; b.box.classList.toggle('on', on);
      }
      calInput.checked = d.calOnly; calBox.classList.toggle('on', d.calOnly);
      errLine.hidden = !errs.services;
      const n = new Set(d.services.map(s => svc(s).team)).size;
      oldWay.hidden = n < 2;
      oldWay.replaceChildren('You are sending ', h('strong', null, '1 request'), '. The old way: ', h('strong', null, `${n} separate forms`), '.');
    };
    const sync = () => { errs = {}; save(); draw(); };
    body = [
      h('p', { class: 'capsule', id: 'reminder' }, `${d.title} — ${eventFacilityName(d)}`),
      h('fieldset', { class: 'choices' + (errs.services ? ' bad' : ''), id: 'f-services' }, h('legend', null, 'Tap any that you need'),
        SERVICES.map(s => {
          const on = d.services.includes(s.id);
          const input = h('input', {
            type: 'checkbox', id: 'svc-' + s.id, 'data-test': 'svc-' + s.id, checked: on, onchange: e => {
              d.services = SERVICES.map(x => x.id).filter(id => id === s.id ? e.target.checked : d.services.includes(id));
              if (e.target.checked) d.calOnly = false;
              sync();
            },
          });
          const extras = h('div', { class: 'extras stack' }, s.note && h('p', { class: 'hint' }, s.note), SERVICE_EXTRAS[s.id] && SERVICE_EXTRAS[s.id](save));
          const box = h('div', { class: 'choicebox' }, h('label', { class: 'choice' }, input, h('span', null, s.label, h('small', null, TEAMS[s.team] + ' team'))), extras);
          boxes.push({ id: s.id, input, extras, box });
          return box;
        }),
        calBox, errLine),
      oldWay,
      filePicker('f-files',d.files,save),
    ];
    draw();
  } else {
    const ev = eventFromDraft(d), lt = leadTime(d.date, today);
    const card = (n, title, content) => h('section', { class: 'card' },
      h('div', { class: 'row between' }, h('h2', null, title), h('button', { class: 'link', type: 'button', id: 'edit-' + n, onclick: () => goStep(n) }, 'Edit')), content);
    body = [
      card(1, 'You', facts([['Name', d.name], ['Email', d.email], ['Phone', d.phone]])),
      card(2, 'Event', facts([
        ['Called', ev.title], ['Facility', eventFacilityName(ev)], ['What', ev.description], ['Day', dateText(ev)], ['Time', timeText(ev)],
        ['Where', ev.where], ['Cost', ev.cost], ['Expected', ev.estAttendance], ['Joint event', ev.joint ? 'Yes' : 'No'],
        ['Sign-up needed', ev.signup ? 'Yes' : 'No'], ['On AF Connect', AF_CONNECT[ev.afConnect]],
      ])),
      card(3, 'What you asked for', d.calOnly
        ? h('p', null, 'Just put it on the calendar. No work for Marketing.')
        : h('ul', { class: 'plain' }, d.services.map(id => {
          const lines = Object.entries({ Sizes: d.sizes.join(', '), 'How many': Object.entries(d.qty).map(([s,n]) => s+': '+n).join(', '), 'In hand by': d.inHand && fmtDate(d.inHand) });
          const extra = id === 'print' ? lines.filter(x => x[1]).map(x => x.join(': ')).join(' · ')
            : id === 'social' ? d.kinds.join(', ') : id === 'sponsorship' && d.breakEven ? 'Break-even: ' + d.breakEven : id === 'web' ? d.page : '';
          return h('li', null, h('strong', null, svc(id).short), ` — ${TEAMS[svc(id).team]} team`, extra && h('small', null, extra));
        }))),
      hoursCheck(eventActivity(ev),ev),
      lt.late && leadNote(d.date, today),
      h('p', { class: 'hint' }, 'One request. We send each part to the right team.'),
    ];
  }

  const send = e => {
    if (sending || filesPending()) return;
    if(d.website) { errs.refused=true; return ctx.refresh(); }
    for (const s of [1, 2, 3]) {
      const bad = validate(s, today);
      if (Object.keys(bad).length) { d.step = s; errs = bad; save(); return ctx.refresh({ top: true }); }
    }
    sending = true; e.target.disabled = true;
    const jobs = d.calOnly ? [] : SERVICES.filter(s => d.services.includes(s.id)).map((s, i) => newJob(s.id, i + 1, jobDetails(s.id, d), s.id === 'print' ? d.inHand : ''));
    const at = ctx.now.toISOString();
    const req = store.add({
      kind: 'event', cc: ccList(d.cc), files: [...d.files], priority:'medium', openedBy: d.bystaff && ctx.staff ? staffName(ctx.actingAs) : null, outbox: [],
      submittedAt: at, late: leadTime(d.date, today).late,
      requester: { name: d.name.trim(), email: d.email.trim(), ...(d.phone.trim() ? { phone: d.phone.trim() } : {}) },
      event: eventFromDraft(d), calendar: { status: 'notconfirmed', cancelReason: '', type: '', notes: '' },
      jobs, thread: [], log: [{ at, who: 'System', text: 'Request received' }],
    }, ctx.now);
    if(req.openedBy) req.log[0].text = 'Sent in by staff ('+req.openedBy+')';
    received(req); store.pref('contact',d.remember ? {name:d.name,email:d.email,phone:d.phone,cc:d.cc} : null); store.save();
    d = null; errs = {}; store.clearDraft();
    ctx.go('#/sent/' + req.id);
  };

  return page(head,
    h('form', { class: 'surface stack', id: 'step-' + d.step, 'data-test': 'step-' + d.step, novalidate: true, onsubmit: e => e.preventDefault() }, body, botTrap(d.website,e => {d.website=e.target.value;save();}), errs.refused && h('p',{id:'send-refused',class:'err'},'Something went wrong. Please try again.')),
    h('div', { class: 'tray' },
      d.step > 1 ? h('button', { class: 'btn', type: 'button', id: 'btn-back', 'data-test': 'back', onclick: () => goStep(d.step - 1) }, 'Back') : h('a', { class: 'btn', href: '#/' }, 'Cancel'),
      d.step < 4 ? h('button', { class: 'btn primary', type: 'button', id: 'btn-next', 'data-test': 'next', onclick: next }, 'Continue')
        : h('button', { class: 'btn primary', type: 'button', id: 'btn-send', 'data-test': 'send', onclick: send }, 'Send request')));
}

export const dropDraft = () => { d = null; errs = {}; };

// "Old way" contrast text, shared with the staff view.
export const oldWayText = teams => teams.map(t => OLD_FORMS[t]).join(' + ') + '. Here: 1 request.';
