// Staff queue: one card per request, never one per lane.
import { h, page, field, input, pill, select } from '../ui.js';
import { TEAMS, OVERALL, facility, JOB_STATUS } from '../config.js';
import { overallStatus, teamsOf, fmtDay, ymd, addDays } from '../model.js';
import * as store from '../store.js';

import { download, toCSV, requestRows } from '../export.js';
const SHOWS = { open: 'Open', mine: 'Mine', unassigned: 'Unassigned', all: 'Everything', overdue:'Overdue', duesoon:'Due in 7 days' };
const OPEN = ['new', 'inprogress', 'waiting', 'onhold'];
const laneOpen = j => j.status !== 'done' && j.status !== 'declined';
let q = '', status='any', priority='any';

export function staffQueue(ctx) {
  const today=ymd(ctx.now);
  const team = TEAMS[ctx.params.get('team')] ? ctx.params.get('team') : 'all';
  const show = SHOWS[ctx.params.get('show')] ? ctx.params.get('show') : 'open';
  const href = (t, s) => `#/staff?team=${t}&show=${s}`;
  const lanes = (r, t) => r.jobs.filter(j => t === 'all' || j.team === t);

  const inShow = (r, t) => {
    if(r.mergedInto) return false;
    const mine = lanes(r, t);
    if(status!=='any' && !mine.some(j=>j.status===status)) return false;
    if(priority!=='any' && (r.priority || 'medium')!==priority) return false;
    if (t !== 'all' && !mine.length) return false;
    if(show==='overdue') return mine.some(j=>laneOpen(j) && j.due && j.due<today);
    if(show==='duesoon') return mine.some(j=>laneOpen(j) && j.due>=today && j.due<=addDays(today,7));
    if (show === 'all') return true;
    if (show === 'mine') return mine.some(j => j.owner === ctx.actingAs);
    if (show === 'unassigned') return mine.some(j => !j.owner && laneOpen(j));
    return mine.some(laneOpen);
  };
  // Late or untouched requests first (newest on top), then by event date.
  const urgent = r => { const o = overallStatus(r); return (r.late && OPEN.includes(o)) || o === 'new'; };
  const sorted = t => store.requests().filter(r => inShow(r, t)).sort((a, b) =>
    (['critical','high','medium','low'].indexOf(a.priority || 'medium')-['critical','high','medium','low'].indexOf(b.priority || 'medium')) || urgent(b) - urgent(a) || (urgent(a) ? b.submittedAt.localeCompare(a.submittedAt) : a.event.date.localeCompare(b.event.date)));

  const card = r => {
    const overall = overallStatus(r), teams = teamsOf(r).sort((a, b) => (b === team) - (a === team));
    return h('a', { class: 'card qcard', href: '#/staff/' + r.id, 'data-test': 'queue-card', 'data-request': r.id },
      h('div', { class: 'qmain' }, h('span', { class: 'eyebrow' }, r.id), h('strong', null, r.event.title), h('span', { class: 'sub' }, r.kind === 'other' ? 'Non-event request' : facility(r.event.facilityId).name)),
      h('div', { class: 'qmeta' }, h('span', null, r.kind === 'other' ? 'Non-event request' : 'Event: ' + fmtDay(r.event.date)), h('span', { class: 'sub' }, 'From: ' + r.requester.name)),
      h('div', { class: 'qstatus' }, pill(overall, OVERALL[overall]), ['high','critical'].includes(r.priority) && pill(r.priority,r.priority[0].toUpperCase()+r.priority.slice(1)),
        r.newReply && h('span',{'data-test':'new-reply',class:'pill'},'New reply'),
        lanes(r,team).some(j=>laneOpen(j) && j.due && j.due<today) && h('span',{'data-test':'overdue',class:'pill'},'Overdue'), r.late && pill('late', 'Late request'),
        r.calendar.status === 'cancelled' && pill('cancelled', 'Cancelled')),
      h('div', { class: 'qlanes' }, teams.map(t => {
        const s = overallStatus({ jobs: r.jobs.filter(j => j.team === t) });
        return h('span', { class: 'dot s-' + s }, `${TEAMS[t]}: ${OVERALL[s]}`);
      })));
  };

  const list = h('div', { class: 'stack', id: 'queue-list', 'data-test': 'queue-list' });
  const filtered = () => {const needle=q.trim().toLowerCase();return sorted(team).filter(r=>!needle || (JSON.stringify([r.id,r.requester,r.cc,r.event,r.jobs.map(j=>j.details),r.thread.map(t=>t.text)])+' '+facility(r.event.facilityId).name).toLowerCase().includes(needle));};
  const draw = () => {
    const rows = filtered();
    list.replaceChildren(...(rows.length ? rows.map(card) : [h('p', { class: 'surface' }, 'Nothing here. Try "Everything".')]));
  };
  draw();

  const tab = (id, label, active, to, count) => h('a', { class: 'tab', href: to, id, 'aria-current': active ? 'true' : null },
    label, count !== undefined && h('span', { class: 'count' }, String(count)));

  return page(
    h('div', { class: 'surface stack' },
      h('a',{id:'go-emails',href:'#/staff/emails'},'Email log'), h('a',{id:'go-notices',href:'#/staff/notifications'},'Notifications'),
      h('a',{id:'go-reports',href:'#/staff/reports'},'Reports'),
      h('button',{id:'export-requests',class:'btn',type:'button',onclick:()=>download('requests-demo.csv','text/csv;charset=utf-8',toCSV(requestRows(filtered())))},'Download requests (CSV)'),
      h('h1', { tabindex: '-1' }, team === 'all' ? 'Queue' : TEAMS[team] + ' queue'),
      h('nav', { class: 'tabs', 'aria-label': 'Team' }, [['all', 'All'], ...Object.entries(TEAMS)].map(([t, l]) => tab('team-' + t, l, t === team, href(t, show), sorted(t).length))),
      h('nav', { class: 'tabs small', 'aria-label': 'Show' }, Object.entries(SHOWS).map(([s, l]) => tab('show-' + s, l, s === show, href(team, s)))),
      field('queue-status','Status',select('queue-status',[['any','Any status'],...Object.entries(JOB_STATUS)],status,e=>{status=e.target.value;draw();})),
      field('queue-priority','Priority',select('queue-priority',[['any','Any priority'],...['critical','high','medium','low'].map(x=>[x,x[0].toUpperCase()+x.slice(1)])],priority,e=>{priority=e.target.value;draw();})),
      field('queue-search', 'Search requests', input('queue-search', 'search', q, e => { q = e.target.value; draw(); }, { autocomplete: 'off' }))),
    list,
    h('div', { class: 'row end' }, h('button', { class: 'btn', type: 'button', id: 'reset-demo-staff', onclick: e => ctx.resetDemo(e.target) }, 'Reset demo data')));
}
