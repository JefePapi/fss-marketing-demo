// Staff view of one request: shared facts once, one lane per service, calendar card, thread, history.
import { h, page, field, input, textarea, select, pill, facts } from '../ui.js';
import { TEAMS, SERVICES, svc, STAFF, staffName, JOB_STATUS, OVERALL, CAL_STATUS, EVENT_TYPES, AF_CONNECT, facility } from '../config.js';
import { overallStatus, heskTicketCount, teamsOf, dateText, militaryTimeText as timeText, fmtDate, fmtStamp, detailLines, newJob, ymd } from '../model.js';
import * as store from '../store.js';
import { notFound } from './home.js';
import { eventFields, validateEvent, eventFromDraft, draftFromEvent, oldWayText } from './request.js';

let ui = {};

export function staffRequest(ctx) {
  const req = store.find(ctx.parts[1]);
  if (!req) return notFound(ctx.parts[1], '#/staff/' + store.exampleId());
  if (ui.id !== req.id) ui = { id: req.id, editing: false, draft: null, errs: {}, chip: false, cancel: null, msg: '', about: '', add: '' };
  const who = staffName(ctx.actingAs), today = ymd(ctx.now), e = req.event, cal = req.calendar;
  const log = text => req.log.push({ at: new Date().toISOString(), who, text });
  const commit = () => { store.save(); ctx.refresh(); };
  const overall = overallStatus(req), n = heskTicketCount(req);

  // Facts: typed once by the requester, shown once here.
  const FIELD_NAMES = { facilityId: 'Facility', title: 'Title', description: 'Description', date: 'Date', endDate: 'End date', start: 'Start time', end: 'End time', allDay: 'All day', where: 'Location', cost: 'Cost', estAttendance: 'Expected attendance', joint: 'Joint event', signup: 'Sign-up', afConnect: 'AF Connect' };
  const show = (k, v) => k === 'date' || k === 'endDate' ? (v ? fmtDate(v) : 'none') : k === 'facilityId' ? facility(v).name : v === true ? 'Yes' : v === false ? 'No' : v === '' || v == null ? 'blank' : String(v);
  const saveFacts = () => {
    ui.errs = validateEvent(ui.draft, today, true);
    if (Object.keys(ui.errs).length) return ctx.refresh();
    const next = eventFromDraft(ui.draft);
    next.actualAttendance = e.actualAttendance;
    if (next.facilityId === e.facilityId) next.section = e.section; // keep a hand-edited section code
    for (const k of Object.keys(FIELD_NAMES)) if (next[k] !== e[k]) log(`${FIELD_NAMES[k]} changed from ${show(k, e[k])} to ${show(k, next[k])}`);
    req.event = next; ui.editing = false; ui.draft = null;
    commit();
  };
  const factsCard = ui.editing
    ? h('form', { class: 'surface stack', id: 'facts-form', novalidate: true, onsubmit: ev => ev.preventDefault() },
      h('h2', null, 'Edit facts'),
      eventFields(ui.draft, { errs: ui.errs, today, lead: false, changed: () => {}, refresh: () => ctx.refresh() }),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn primary', type: 'button', id: 'facts-save', 'data-test': 'facts-save', onclick: saveFacts }, 'Save facts'),
        h('button', { class: 'btn', type: 'button', id: 'facts-cancel', onclick: () => { ui.editing = false; ui.draft = null; ctx.refresh(); } }, 'Cancel')))
    : h('section', { class: 'surface stack', id: 'facts' },
      h('div', { class: 'row between' }, h('h2', null, 'Facts'),
        h('button', { class: 'btn', type: 'button', id: 'facts-edit', 'data-test': 'facts-edit', onclick: () => { ui.editing = true; ui.draft = draftFromEvent(e); ui.errs = {}; ctx.refresh(); } }, 'Edit facts')),
      facts([
        ['Facility', `${facility(e.facilityId).name} (${e.section})`], ['Day', dateText(e)], ['Time', timeText(e)], ['Where', e.where],
        ['What', e.description], ['Cost', e.cost], ['Expected', e.estAttendance], ['Joint event', e.joint ? 'Yes' : 'No'],
        ['Sign-up needed', e.signup ? 'Yes' : 'No'], ['On AF Connect', AF_CONNECT[e.afConnect]],
        ['Requester', `${req.requester.name} — ${req.requester.email}${req.requester.phone ? ' — ' + req.requester.phone : ''}`],
        ['Sent in', fmtStamp(req.submittedAt)],
      ]));

  // Lanes: one per service, each with its own status, owner and due date.
  const lane = j => {
    const s = svc(j.service), details = detailLines(j, req);
    return h('section', { class: 'card stack lane', id: 'lane-' + j.id, 'data-test': 'lane', 'data-service': j.service },
      h('div', null, h('h3', null, s.short), h('p', { class: 'sub' }, TEAMS[j.team] + ' team'), pill(j.status, JOB_STATUS[j.status])),
      field('lane-status-' + j.id, 'Status', select('lane-status-' + j.id, Object.entries(JOB_STATUS), j.status, ev => {
        log(`${s.short}: status changed from ${JOB_STATUS[j.status]} to ${JOB_STATUS[ev.target.value]}`);
        j.status = ev.target.value; commit();
      }, { 'data-test': 'lane-status', 'data-service': j.service })),
      j.status === 'declined' && field('lane-reason-' + j.id, 'Why declined? (short reason)', input('lane-reason-' + j.id, 'text', j.declineReason || '', null, {
        maxlength: 120, 'data-test': 'lane-reason', onchange: ev => { j.declineReason = ev.target.value.trim(); log(`${s.short}: decline reason set`); store.save(); },
      })),
      field('lane-owner-' + j.id, 'Owner', select('lane-owner-' + j.id, [['', 'Unassigned'], ...STAFF.filter(p => p.team === j.team).map(p => [p.id, p.name])], j.owner || '', ev => {
        log(`${s.short}: owner changed from ${staffName(j.owner)} to ${staffName(ev.target.value)}`);
        j.owner = ev.target.value || null; commit();
      }, { 'data-test': 'lane-owner', 'data-service': j.service })),
      field('lane-due-' + j.id, 'Due', input('lane-due-' + j.id, 'date', j.due || '', null, {
        'data-test': 'lane-due', onchange: ev => { j.due = ev.target.value; log(`${s.short}: due date set to ${j.due ? fmtDate(j.due) : 'none'}`); store.save(); },
      })),
      details.length ? facts(details) : h('p', { class: 'sub' }, s.note || 'No extra answers for this part.'));
  };
  const missing = SERVICES.filter(s => !req.jobs.some(j => j.service === s.id));
  const addPart = missing.length > 0 && h('div', { class: 'row wrap endalign' },
    field('add-part', 'Add a part', select('add-part', [['', 'Choose a service'], ...missing.map(s => [s.id, s.short])], ui.add, ev => { ui.add = ev.target.value; })),
    h('button', {
      class: 'btn', type: 'button', id: 'btn-add-part', 'data-test': 'add-part', onclick: () => {
        if (!ui.add) return;
        const num = Math.max(0, ...req.jobs.map(j => +j.id.slice(1))) + 1;
        req.jobs.push(newJob(ui.add, num));
        log(`Part added: ${svc(ui.add).short}`); ui.add = ''; commit();
      },
    }, 'Add'));

  // Calendar card. Cancelling needs a reason before it takes effect.
  const canceling = ui.cancel !== null;
  const calCard = h('section', { class: 'surface stack', id: 'calendar-card' },
    h('h2', null, 'Calendar'),
    h('p', { class: 'sub' }, 'The calendar entry is made from this request. Nobody types it twice. ',
      h('a', { href: '#/calendar?view=month&m=' + e.date.slice(0, 7), id: 'open-calendar' }, 'See it on the calendar')),
    h('div', { class: 'two' },
      field('cal-status', 'Calendar status', select('cal-status', Object.entries(CAL_STATUS), canceling ? 'cancelled' : cal.status, ev => {
        const v = ev.target.value;
        if (v === 'cancelled') { ui.cancel = cal.cancelReason || ''; return ctx.refresh(); }
        ui.cancel = null;
        if (v !== cal.status) { log(`Calendar status changed from ${CAL_STATUS[cal.status]} to ${CAL_STATUS[v]}`); cal.status = v; cal.cancelReason = ''; }
        commit();
      }, { 'data-test': 'cal-status' })),
      field('cal-type', 'Event type', select('cal-type', EVENT_TYPES.map(t => [t, t || 'None']), cal.type || '', ev => { cal.type = ev.target.value; log(`Event type set to ${cal.type || 'none'}`); commit(); })),
      field('cal-section', 'Section code', input('cal-section', 'text', e.section, null, { maxlength: 8, onchange: ev => { const v = ev.target.value.trim().toUpperCase(); log(`Section changed from ${e.section} to ${v}`); e.section = v; store.save(); } })),
      field('cal-actual', 'Actual attendance', input('cal-actual', 'number', e.actualAttendance ?? '', null, {
        min: 0, disabled: e.date >= today, onchange: ev => { e.actualAttendance = ev.target.value === '' ? null : Number(ev.target.value); log('Actual attendance recorded'); store.save(); },
      }), null, e.date >= today ? 'Opens after the event day.' : null)),
    canceling && h('div', { class: 'callout stack' },
      field('cal-reason', 'Why is it cancelled? (required)', input('cal-reason', 'text', ui.cancel, ev => { ui.cancel = ev.target.value; }, { maxlength: 120, 'data-test': 'cal-reason' }), ui.errs.cancel),
      h('div', { class: 'row wrap' },
        h('button', {
          class: 'btn primary', type: 'button', id: 'cal-cancel-confirm', 'data-test': 'cal-cancel-confirm', onclick: () => {
            if (!ui.cancel.trim()) { ui.errs = { cancel: 'Add a short reason.' }; return ctx.refresh(); }
            if (cal.status !== 'cancelled') log(`Calendar status changed from ${CAL_STATUS[cal.status]} to Cancelled`);
            log('Cancel reason: ' + ui.cancel.trim());
            cal.status = 'cancelled'; cal.cancelReason = ui.cancel.trim(); ui.cancel = null; ui.errs = {}; commit();
          },
        }, 'Confirm cancel'),
        h('button', { class: 'btn', type: 'button', id: 'cal-cancel-back', onclick: () => { ui.cancel = null; ui.errs = {}; ctx.refresh(); } }, 'Never mind'))),
    !canceling && cal.status === 'cancelled' && h('p', null, h('strong', null, 'Cancelled: '), cal.cancelReason,
      ' ', h('button', { class: 'link', type: 'button', id: 'cal-reason-edit', onclick: () => { ui.cancel = cal.cancelReason; ctx.refresh(); } }, 'Change reason')),
    field('cal-notes', 'Calendar notes (optional)', input('cal-notes', 'text', cal.notes || '', null, { maxlength: 160, onchange: ev => { cal.notes = ev.target.value.trim(); log('Calendar notes changed'); store.save(); } })));

  // Thread: replies go to the requester; private notes stay with staff.
  const post = kind => () => {
    if (!ui.msg.trim()) return;
    req.thread.push({ at: new Date().toISOString(), author: who, role: 'staff', kind, ...(ui.about ? { jobId: ui.about } : {}), text: ui.msg.trim() });
    ui.msg = ''; commit();
  };
  const jobLabel = id => { const j = req.jobs.find(x => x.id === id); return j ? svc(j.service).short : ''; };
  const thread = h('section', { class: 'surface stack', id: 'thread' },
    h('h2', null, 'Thread'),
    req.thread.length ? h('ul', { class: 'thread' }, req.thread.map(t => h('li', { class: t.kind === 'note' ? 'private' : t.role === 'staff' ? 'from-staff' : 'from-you', 'data-test': 'thread-' + t.kind },
      h('p', { class: 'sub' }, t.kind === 'note' ? h('strong', null, 'Private note (staff only) · ') : t.role === 'staff' ? 'Reply to requester · ' : 'From requester · ',
        `${t.author} · ${fmtStamp(t.at)}`, t.jobId && jobLabel(t.jobId) && ` · About: ${jobLabel(t.jobId)}`),
      h('p', null, t.text)))) : h('p', { class: 'sub' }, 'Nothing yet.'),
    field('thread-text', 'Write a reply or a note', textarea('thread-text', ui.msg, ev => { ui.msg = ev.target.value; }, { rows: 3, maxlength: 1000 })),
    req.jobs.length > 0 && field('thread-about', 'About', select('thread-about', [['', 'The whole request'], ...req.jobs.map(j => [j.id, svc(j.service).short])], ui.about, ev => { ui.about = ev.target.value; })),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn primary', type: 'button', id: 'btn-reply', 'data-test': 'reply-send', onclick: post('reply') }, 'Reply to requester'),
      h('button', { class: 'btn', type: 'button', id: 'btn-note', 'data-test': 'note-save', onclick: post('note') }, 'Save private note')));

  return page(
    h('div', { class: 'surface' },
      h('p', { class: 'eyebrow' }, h('a', { href: '#/staff' }, 'Queue'), ' / ', h('span', { id: 'staff-request-id' }, req.id)),
      h('h1', { tabindex: '-1' }, e.title),
      h('p', { class: 'row wrap' },
        h('span', { id: 'overall-status', 'data-test': 'overall-status' }, pill(overall, OVERALL[overall])),
        req.late && pill('late', 'Late request'), cal.status === 'cancelled' && pill('cancelled', 'Cancelled'),
        n > 1 && h('button', { class: 'chipbtn', type: 'button', id: 'old-way', 'data-test': 'old-way', 'aria-expanded': String(!!ui.chip), onclick: () => { ui.chip = !ui.chip; ctx.refresh(); } },
          `Old way: ${n} separate tickets`)),
      n > 1 && ui.chip && h('p', { class: 'note', id: 'old-way-detail' }, oldWayText(teamsOf(req))),
      h('p', { class: 'sub' }, h('a', { href: '#/status/' + req.id, id: 'see-as-requester' }, 'See what the requester sees'))),
    factsCard,
    h('section', { class: 'surface stack', id: 'lanes' },
      h('h2', null, req.jobs.length ? `Lanes (${req.jobs.length})` : 'Calendar only: no lanes'),
      h('div', { class: 'lanes' }, req.jobs.map(lane)), addPart),
    calCard, thread,
    h('details', { class: 'surface', id: 'history' }, h('summary', null, `History (${req.log.length})`),
      h('ul', { class: 'plain log' }, [...req.log].reverse().map(l => h('li', null, h('span', { class: 'sub' }, `${fmtStamp(l.at)} · ${l.who} — `), l.text)))));
}
