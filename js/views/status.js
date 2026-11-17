// Requester's view: look up a number, see each team's status, send a message.
import { h, page, field, input, textarea, pill, facts } from '../ui.js';
import { TEAMS, svc, JOB_STATUS_REQ, OVERALL_REQ, facility, CAL_STATUS } from '../config.js';
import { overallStatus, teamsOf, dateText, timeText, fmtStamp } from '../model.js';
import * as store from '../store.js';
import { notFound } from './home.js';

let msg = '';

function lookup(ctx) {
  let v = '';
  const go = () => { if (v.trim()) ctx.go('#/status/' + encodeURIComponent(v.trim().toUpperCase())); };
  return page(h('form', { class: 'surface stack', onsubmit: e => { e.preventDefault(); go(); } },
    h('h1', { tabindex: '-1' }, 'Check on a request'),
    field('status-number', 'Your request number', input('status-number', 'text', '', e => { v = e.target.value; }, { placeholder: store.exampleId(), autocomplete: 'off', maxlength: 20 }), null, 'It looks like ' + store.exampleId() + '.'),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn primary', type: 'submit', id: 'status-go' }, 'Check status'),
      h('a', { class: 'btn', href: '#/status/' + store.exampleId(), id: 'status-example' }, 'Try the sample request'))));
}

export function statusView(ctx) {
  const id = ctx.parts[1];
  if (!id) return lookup(ctx);
  const req = store.find(id);
  if (!req) return notFound(id, '#/status/' + store.exampleId());
  const e = req.event, overall = overallStatus(req);
  const replies = req.thread.filter(t => t.kind === 'reply'); // private notes never appear here
  const lastStaff = jobId => [...replies].reverse().find(t => t.role === 'staff' && (!jobId || t.jobId === jobId));
  const waiting = req.jobs.filter(j => j.status === 'waiting');

  return page(
    h('div', { class: 'surface' },
      h('p', { class: 'eyebrow' }, 'Request ', h('span', { id: 'status-id' }, req.id)),
      h('h1', { tabindex: '-1' }, e.title),
      h('p', null, pill(overall, OVERALL_REQ[overall]), req.calendar.status === 'cancelled' && pill('cancelled', 'Event cancelled'))),
    waiting.length > 0 && h('div', { class: 'surface callout stack', id: 'needs-you', 'data-test': 'needs-you' },
      h('h2', null, 'We need something from you'),
      waiting.map(j => {
        const q = lastStaff(j.id);
        return h('p', null, h('strong', null, svc(j.service).short + ': '), q ? q.text : 'The team will tell you what they need.', q && h('span', { class: 'sub' }, ` — ${q.author}`));
      }),
      h('p', { class: 'sub' }, 'Answer in the message box below.')),
    h('div', { class: 'surface' }, facts([
      ['Day', dateText(e)], ['Time', timeText(e)], ['Where', e.where], ['Facility', facility(e.facilityId).name], ['Cost', e.cost],
      ['Contact', `${req.requester.name} — ${req.requester.email}`], ['Calendar', CAL_STATUS[req.calendar.status]],
    ])),
    h('div', { class: 'surface stack' },
      h('h2', null, 'Teams handling this request'),
      req.jobs.length ? h('div', { class: 'lanes' }, teamsOf(req).map(t => h('div', { class: 'card stack', 'data-test': 'team-line', 'data-team': t },
        h('h3', null, TEAMS[t]),
        req.jobs.filter(j => j.team === t).map(j => {
          const r = lastStaff(j.id);
          return h('div', { class: 'laneline' },
            h('p', null, svc(j.service).short, ' ', pill(j.status, JOB_STATUS_REQ[j.status])),
            j.status === 'declined' && j.declineReason && h('p', { class: 'sub' }, 'Reason: ' + j.declineReason),
            r && h('p', { class: 'sub' }, `Latest from ${r.author}: `, r.text));
        }))))
        : h('p', null, 'No team work was asked for. It is on the calendar.')),
    h('div', { class: 'surface stack' },
      h('h2', null, 'Messages'),
      replies.length ? h('ul', { class: 'thread' }, replies.map(t => h('li', { class: t.role === 'staff' ? 'from-staff' : 'from-you' },
        h('p', { class: 'sub' }, `${t.role === 'staff' ? t.author + ' (Marketing)' : t.author} · ${fmtStamp(t.at)}`), h('p', null, t.text))))
        : h('p', { class: 'sub' }, 'No messages yet.'),
      field('status-message', 'Send a message', textarea('status-message', msg, ev => { msg = ev.target.value; }, { maxlength: 1000, rows: 3 })),
      h('button', {
        class: 'btn primary', type: 'button', id: 'status-send', onclick: () => {
          if (!msg.trim()) return;
          req.thread.push({ at: new Date().toISOString(), author: req.requester.name, role: 'requester', kind: 'reply', text: msg.trim() });
          msg = ''; store.save(); ctx.refresh();
        },
      }, 'Send message')),
    h('p', { class: 'note onglass' }, 'Receipt does not promise funding or a magazine slot.'));
}
