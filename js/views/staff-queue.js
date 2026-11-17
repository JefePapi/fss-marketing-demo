// Staff queue: one card per request, never one per lane.
import { h, page, field, input, pill } from '../ui.js';
import { TEAMS, OVERALL, facility } from '../config.js';
import { overallStatus, teamsOf, fmtDay } from '../model.js';
import * as store from '../store.js';

const SHOWS = { open: 'Open', mine: 'Mine', unassigned: 'Unassigned', all: 'Everything' };
const OPEN = ['new', 'inprogress', 'waiting'];
const laneOpen = j => j.status !== 'done' && j.status !== 'declined';
let q = '';

export function staffQueue(ctx) {
  const team = TEAMS[ctx.params.get('team')] ? ctx.params.get('team') : 'all';
  const show = SHOWS[ctx.params.get('show')] ? ctx.params.get('show') : 'open';
  const href = (t, s) => `#/staff?team=${t}&show=${s}`;
  const lanes = (r, t) => r.jobs.filter(j => t === 'all' || j.team === t);

  const inShow = (r, t) => {
    const mine = lanes(r, t);
    if (t !== 'all' && !mine.length) return false;
    if (show === 'all') return true;
    if (show === 'mine') return mine.some(j => j.owner === ctx.actingAs);
    if (show === 'unassigned') return mine.some(j => !j.owner && laneOpen(j));
    return OPEN.includes(overallStatus(r));
  };
  // Late or untouched requests first (newest on top), then by event date.
  const urgent = r => { const o = overallStatus(r); return (r.late && OPEN.includes(o)) || o === 'new'; };
  const sorted = t => store.requests().filter(r => inShow(r, t)).sort((a, b) =>
    urgent(b) - urgent(a) || (urgent(a) ? b.submittedAt.localeCompare(a.submittedAt) : a.event.date.localeCompare(b.event.date)));

  const card = r => {
    const overall = overallStatus(r), teams = teamsOf(r).sort((a, b) => (b === team) - (a === team));
    return h('a', { class: 'card qcard', href: '#/staff/' + r.id, 'data-test': 'queue-card', 'data-request': r.id },
      h('div', { class: 'qmain' }, h('span', { class: 'eyebrow' }, r.id), h('strong', null, r.event.title), h('span', { class: 'sub' }, facility(r.event.facilityId).name)),
      h('div', { class: 'qmeta' }, h('span', null, 'Event: ' + fmtDay(r.event.date)), h('span', { class: 'sub' }, 'From: ' + r.requester.name)),
      h('div', { class: 'qstatus' }, pill(overall, OVERALL[overall]), r.late && pill('late', 'Late request'),
        r.calendar.status === 'cancelled' && pill('cancelled', 'Cancelled')),
      h('div', { class: 'qlanes' }, teams.map(t => {
        const s = overallStatus({ jobs: r.jobs.filter(j => j.team === t) });
        return h('span', { class: 'dot s-' + s }, `${TEAMS[t]}: ${OVERALL[s]}`);
      })));
  };

  const list = h('div', { class: 'stack', id: 'queue-list', 'data-test': 'queue-list' });
  const draw = () => {
    const needle = q.trim().toLowerCase();
    const rows = sorted(team).filter(r => !needle || r.id.toLowerCase().includes(needle) || r.event.title.toLowerCase().includes(needle));
    list.replaceChildren(...(rows.length ? rows.map(card) : [h('p', { class: 'surface' }, 'Nothing here. Try "Everything".')]));
  };
  draw();

  const tab = (id, label, active, to, count) => h('a', { class: 'tab', href: to, id, 'aria-current': active ? 'true' : null },
    label, count !== undefined && h('span', { class: 'count' }, String(count)));

  return page(
    h('div', { class: 'surface stack' },
      h('h1', { tabindex: '-1' }, team === 'all' ? 'Queue' : TEAMS[team] + ' queue'),
      h('nav', { class: 'tabs', 'aria-label': 'Team' }, [['all', 'All'], ...Object.entries(TEAMS)].map(([t, l]) => tab('team-' + t, l, t === team, href(t, show), sorted(t).length))),
      h('nav', { class: 'tabs small', 'aria-label': 'Show' }, Object.entries(SHOWS).map(([s, l]) => tab('show-' + s, l, s === show, href(team, s)))),
      field('queue-search', 'Search by request number or title', input('queue-search', 'search', q, e => { q = e.target.value; draw(); }, { autocomplete: 'off' }))),
    list,
    h('div', { class: 'row end' }, h('button', { class: 'btn', type: 'button', id: 'reset-demo-staff', onclick: e => ctx.resetDemo(e.target) }, 'Reset demo data')));
}
