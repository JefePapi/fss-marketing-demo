// Confirmation: one number, the teams it went to, and proof it is on the calendar.
import { h, page, copyText, toast } from '../ui.js';
import { TEAMS, svc } from '../config.js';
import { dateText, teamsOf } from '../model.js';
import * as store from '../store.js';
import { notFound } from './home.js';

export function sentView(ctx) {
  const req = store.find(ctx.parts[1]);
  if (!req) return notFound(ctx.parts[1], '#/status/' + store.exampleId());
  const teams = teamsOf(req);
  return page(
    h('div', { class: 'surface receipt' },
      h('h1', { tabindex: '-1' }, 'Your request is saved'),
      h('p', { class: 'eyebrow' }, 'Your request number'),
      h('p', { class: 'bignum', id: 'confirmation-number', 'data-test': 'confirmation-number' }, req.id),
      h('button', { class: 'btn', type: 'button', id: 'copy-number', onclick: async () => toast(await copyText(req.id) ? 'Number copied.' : 'Could not copy. Please write it down.') }, 'Copy number'),
      h('p', { class: 'sub' }, 'One number for everything you asked for. We may contact you for details.')),
    h('div', { class: 'surface stack' },
      h('h2', null, 'Teams handling this request'),
      teams.length
        ? h('div', { class: 'lanes' }, teams.map(t => h('div', { class: 'card', 'data-test': 'sent-team' },
          h('h3', null, TEAMS[t]), h('p', null, req.jobs.filter(j => j.team === t).map(j => svc(j.service).short).join(' and ') + '.'))))
        : h('p', null, 'No team work was asked for. Your event goes straight on the calendar.')),
    h('div',{class:'surface',id:'email-preview'},h('h2',null,'Demo: nothing is sent'),(req.outbox || []).filter(x=>['received','opened-for-you'].includes(x.trigger)).map(x=>h('p',null,'To: '+x.to.join(', ')+' · Cc: '+x.cc.join(', ')+' · Subject: '+x.subject))),
    req.kind !== 'other' && h('div', { class: 'surface stack' },
      h('p', null, 'It is on the calendar: ', h('strong', null, dateText(req.event)), '. ',
        h('a', { href: '#/calendar?m=' + req.event.date.slice(0, 7), id: 'sent-calendar' }, 'Open the calendar on that month')),
      h('p', { class: 'note' }, 'Receipt does not promise funding or a magazine slot.'),
      h('p', { class: 'sub' }, 'In the real system you would get one email copy. This demo sends no email.')),
    h('div', { class: 'row wrap' },
      h('a', { class: 'btn primary', href: '#/status/' + req.id, id: 'sent-status' }, 'Check status'),
      h('button', { class: 'btn', type: 'button', id: 'sent-staff', 'data-test': 'see-as-staff', onclick: () => { ctx.setStaff(true); ctx.go('#/staff/' + req.id); } }, 'See it as staff (demo)'),
      h('a', { class: 'btn', href: '#/request', id: 'sent-another' }, 'Send another')));
}
