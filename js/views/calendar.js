// Rolling 12-month calendar. Entries are derived from requests on every render.
import { h, page, pill, facts, select, field, openSheet, copyText, toast } from '../ui.js';
import { SERVICES, svc, CAL_STATUS, JOB_STATUS, AF_CONNECT, activities, eventFacilityName } from '../config.js';
import { calWindow, calendarEvents, ymd, fmtDate, fmtDay, fmtDM, fmtMonth, militaryTimeText as timeText, daysInMonth, monthCells, MONTHS } from '../model.js';
import { eventActivity } from './activities.js';
import { hoursOn, rangesText } from '../hours.js';
import { holidayMap } from '../seed.js';
import { exportRows, toCSV, toXLS, toICS, download } from '../export.js';
import * as store from '../store.js';

let eventsOnly = false, lastJump = '';
const list = s => (s || '').split(',').filter(Boolean);
const SVC_FILTERS = [...SERVICES.map(s => [s.id, s.short]), ['calonly', 'Calendar only']];

export function calendarView(ctx) {
  const win = calWindow(ctx.now), today = ymd(ctx.now), hol = holidayMap(win), p = ctx.params, ro = ctx.readonly;
  const phone = matchMedia('(max-width: 899px)').matches;
  const view = ['month', 'list'].includes(p.get('view')) ? p.get('view') : ro || phone ? 'list' : 'month';
  const mSet = win.months.includes(p.get('m'));
  const m = mSet ? p.get('m') : win.months[0];
  const f = { svc: list(p.get('svc')), status: list(p.get('status')), section: p.get('section') || '' };
  const sel = p.get('d');

  // Every in-calendar link carries the filters and the read-only flag.
  const link = (over = {}) => {
    const v = { view, m: mSet ? m : '', svc: f.svc.join(','), status: f.status.join(','), section: f.section, d: '', readonly: ro ? '1' : '', ...over };
    return '#/calendar?' + ['view', 'm', 'svc', 'status', 'section', 'd', 'readonly'].filter(k => v[k]).map(k => `${k}=${encodeURIComponent(v[k])}`).join('&');
  };
  const toggle = (arr, v) => (arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]).join(',');

  const match = ev => (!f.svc.length || f.svc.some(s => s === 'calonly' ? !ev.services.length : ev.services.includes(s)))
    && (!f.status.length || f.status.includes(ev.status)) && (!f.section || ev.section === f.section);
  const events = calendarEvents(store.requests(), win).filter(match);
  const byDate = {};
  for (const ev of events) (byDate[ev.date] ||= []).push(ev);

  const detail = (ev, from) => {
    const r = ev.req, e = r.event;
    openSheet(e.title, h('div', { class: 'stack', id: 'event-detail', 'data-test': 'event-detail' },
      h('p', { class: 'chiprow' }, pill(ev.status, CAL_STATUS[ev.status]), r.late && pill('late', 'Late request')),
      ev.status === 'cancelled' && r.calendar.cancelReason && h('p', null, 'Reason: ' + r.calendar.cancelReason),
      h('p',{id:'event-hours'},(()=>{const a=eventActivity(e);if(!a.info)return 'No hours listed';const on=hoursOn(a.info,ev.date);return on.closed?'Closed that day: '+(on.label || 'Closed'):'Open that day: '+rangesText(on.ranges);})()),
      facts([
        ['Day', fmtDate(ev.date) + (ev.days > 1 ? ` (day ${ev.day} of ${ev.days})` : '')], ['Time', timeText(e)], ['Where', e.where],
        ['Facility', `${eventFacilityName(e)} (${e.section})`], ['Contact', r.requester.name], ['Expected', e.estAttendance],
        ['Sign-up needed', e.signup ? 'Yes' : 'No'], ['On AF Connect', AF_CONNECT[e.afConnect]], ['Joint event', e.joint ? 'Yes' : 'No'],
        ['Asked for', r.jobs.length ? r.jobs.map(j => `${svc(j.service).short}: ${JOB_STATUS[j.status]}`).join(' · ') : 'Calendar only'],
        ['Request', r.id],
      ]),
      ctx.staff && !ro && h('a', { class: 'btn primary', href: '#/staff/' + r.id, id: 'open-request', 'data-test': 'open-request' }, 'Open request')), from);
  };
  const evButton = (ev, cls, prefix, kids) => {
    const b = h('button', {
      type: 'button', class: cls + (ev.status === 'cancelled' ? ' cancelled' : ''), id: `${prefix}-${ev.id}-${ev.date}`,
      'data-test': 'cal-event', 'data-request': ev.id, onclick: () => detail(ev, b),
    }, kids);
    return b;
  };
  const shortTime = ev => timeText(ev.req.event);
  const rowButton = (ev, prefix) => evButton(ev, 'evrow', prefix, [
    h('span', { class: 'when' }, h('strong', null, fmtDay(ev.date)), h('span', { class: 'sub' }, timeText(ev.req.event))),
    h('span', { class: 'what' }, h('strong', { class: 'title' }, ev.title), h('span', { class: 'sub' }, `${ev.where} · ${ev.section}`)),
    pill(ev.status, CAL_STATUS[ev.status])]);

  // Month grid: complete Sunday–Saturday weeks.
  const grid = () => {
    const cells = [];
    for (const date of monthCells(m)) {
      const d = Number(date.slice(8));
      if (!date.startsWith(m + '-')) {
        cells.push(h('div', { class: 'cell out', 'data-date': date, 'aria-hidden': 'true' }, h('span', { class: 'dnum' }, String(d))));
        continue;
      }
      const evs = byDate[date] || [];
      cells.push(h('div', { 'data-date': date, class: 'cell' + (date === today ? ' today' : '') + (hol[date] ? ' hol' : '') + (date === sel ? ' sel' : '') },
        h('a', {
          class: 'daybtn', id: 'day-' + date, href: link({ view: 'month', m, d: date }), 'data-test': 'cal-day', 'data-date': date,
          'aria-label': `${fmtDM(date)}${hol[date] ? ', ' + hol[date] : ''}, ${evs.length} event${evs.length === 1 ? '' : 's'}`, 'aria-current': date === sel ? 'date' : null,
        }, h('span', { class: 'dnum' }, String(d)), evs.length > 0 && h('span', { class: 'dots' }, String(evs.length))),
        hol[date] && h('span', { class: 'holname' }, hol[date]),
        evs.slice(0, 2).map(ev => evButton(ev, 'evchip', 'ev', [h('span', { class: 't' }, shortTime(ev)), ' ', ev.title])),
        evs.length > 2 && h('a', { class: 'more', href: link({ view: 'month', m, d: date }) }, `+${evs.length - 2} more`)));
    }
    const dayEvents = sel && sel.startsWith(m) ? byDate[sel] || [] : null;
    return [
      h('div', { class: 'grid7 head', id: 'month-head', 'data-test': 'month-head', 'aria-hidden': 'true' }, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => h('span', null, d))),
      h('div', { class: 'grid7', id: 'month-grid', 'data-test': 'month-grid' }, cells),
      dayEvents ? h('div', { class: 'stack', id: 'day-panel', 'data-test': 'day-panel' },
        h('h3', null, fmtDate(sel), hol[sel] && h('span', { class: 'holtag' }, hol[sel])),
        dayEvents.length ? dayEvents.map(ev => rowButton(ev, 'evd')) : h('p', { class: 'sub' }, 'Nothing on this day.'))
        : h('p', { class: 'sub tapnote' }, 'Tap a day to see its events.'),
    ];
  };

  // Agenda: the whole rolling window, grouped by month.
  const agenda = () => win.months.map(ym => {
    const rows = [];
    for (let d = 1; d <= daysInMonth(ym); d++) {
      const date = `${ym}-${String(d).padStart(2, '0')}`;
      if (hol[date]) rows.push(h('p', { class: 'holrow' }, h('strong', null, fmtDay(date)), ' ', hol[date]));
      for (const ev of byDate[date] || []) rows.push(rowButton(ev, 'ev'));
    }
    return h('section', { class: 'month-block stack', id: 'mon-' + ym, 'data-test': 'list-month' },
      h('h3', { class: 'month-banner' }, fmtMonth(ym)), rows.length ? rows : h('p', { class: 'sub' }, 'No events.'));
  });

  const at = win.months.indexOf(m);
  const share = () => location.href.split('#')[0] + link({ view: 'list', m: '', d: '', readonly: '1' });
  const shareBox = h('div', { class: 'stack sharebox', id: 'share-box', hidden: true },
    field('share-link', 'Read-only link (add it as a Website tab in Teams)', h('input', { id: 'share-link', 'data-test': 'share-link', type: 'text', readonly: true, value: share(), onfocus: e => e.target.select() })));
  const dl = (name, mime, build) => () => { download(name, mime, build(exportRows(store.requests(), win, hol, eventsOnly))); toast('Downloaded ' + name); };
  const chipBtn = (id, label, on, to) => h('button', { class: 'fchip', type: 'button', id, 'data-test': id, 'aria-pressed': String(on), onclick: () => ctx.go(to) }, label);

  const out = page(
    h('div', { class: 'surface stack' },
      h('h1', { tabindex: '-1' }, 'Rolling calendar', ro && h('span', { class: 'pill s-new', id: 'readonly-tag' }, 'Read-only')),
      h('p', { class: 'sub', id: 'calendar-note' }, 'Demo: this calendar shows sample events, plus anything added in this browser. In the real system, everyone would see the same live calendar.'),
      h('div', { class: 'row wrap between' },
        h('div', { class: 'tabs', role: 'group', 'aria-label': 'View' },
          h('a', { class: 'tab', id: 'view-month', 'data-test': 'view-month', href: link({ view: 'month', d: sel || '' }), 'aria-current': view === 'month' ? 'true' : null }, 'Month'),
          h('a', { class: 'tab', id: 'view-list', 'data-test': 'view-list', href: link({ view: 'list' }), 'aria-current': view === 'list' ? 'true' : null }, 'List')),
        h('div', { class: 'row wrap' },
          h('details', { class: 'menu', id: 'download-menu' },
            h('summary', { class: 'btn', id: 'download-toggle', 'data-test': 'download-toggle' }, 'Download'),
            h('div', { class: 'menu-body stack' },
              h('button', { class: 'btn primary', type: 'button', id: 'export-csv', 'data-test': 'export-csv', onclick: dl('rolling-calendar-demo.csv', 'text/csv;charset=utf-8', toCSV) }, 'Rolling Calendar (.csv)'),
              h('button', { class: 'btn', type: 'button', id: 'export-xls', 'data-test': 'export-xls', onclick: dl('rolling-calendar-demo.xls', 'application/vnd.ms-excel', toXLS) }, 'Excel (.xls)'),
              h('p', { class: 'hint' }, 'Excel asks once whether to open the .xls. Choose Yes.'),
              h('button', { class: 'btn', type: 'button', id: 'export-ics', 'data-test': 'export-ics', onclick: () => { download('rolling-calendar-demo.ics', 'text/calendar;charset=utf-8', toICS(store.requests(), win, ctx.now)); toast('Downloaded rolling-calendar-demo.ics'); } }, 'Calendar file (.ics)'),
              h('label', { class: 'choice small' }, h('input', { type: 'checkbox', id: 'export-events-only', 'data-test': 'export-events-only', checked: eventsOnly, onchange: e => { eventsOnly = e.target.checked; } }), h('span', null, 'Events only (no empty days)')),
              h('p', { class: 'hint' }, 'Files cover all 12 months, whatever the filters.'))),
          h('button', {
            class: 'btn', type: 'button', id: 'copy-link', 'data-test': 'copy-link', onclick: async () => {
              shareBox.hidden = false;
              const url = share();
              shareBox.querySelector('input').value = url;
              toast(await copyText(url) ? 'Link copied. Paste it into a Teams Website tab.' : 'Copy the link from the box.');
            },
          }, 'Copy link for Teams'))),
      shareBox),
    h('div', { class: 'surface stack', id: 'filters' },
      h('div', { class: 'chiprow', role: 'group', 'aria-label': 'Filter by service' }, h('span', { class: 'flabel' }, 'Service'),
        SVC_FILTERS.map(([id, l]) => chipBtn('filter-svc-' + id, l, f.svc.includes(id), link({ svc: toggle(f.svc, id) })))),
      h('div', { class: 'chiprow', role: 'group', 'aria-label': 'Filter by status' }, h('span', { class: 'flabel' }, 'Status'),
        Object.entries(CAL_STATUS).map(([id, l]) => chipBtn('filter-status-' + id, l, f.status.includes(id), link({ status: toggle(f.status, id) })))),
      field('filter-section', 'Section', select('filter-section', [['', 'All sections'], ...[...new Set(activities().map(x => x.section))].map(s => [s, s])], f.section, e => ctx.go(link({ section: e.target.value })))),
      !!(f.svc.length || f.status.length || f.section) && h('a', { href: link({ svc: '', status: '', section: '' }), id: 'filter-clear' }, 'Clear filters')),
    h('div', { class: 'surface stack', id: 'calendar-body', 'data-view': view },
      h('nav', { class: 'monthstrip', 'aria-label': 'Jump to a month' }, win.months.map((ym, i) => {
        const [y, mo] = ym.split('-').map(Number);
        return h('a', { class: 'mon', id: 'm-' + ym, href: link({ m: ym }), 'aria-current': view === 'month' && ym === m ? 'true' : null },
          MONTHS[mo - 1].slice(0, 3) + (i === 0 || mo === 1 ? ' ' + String(y).slice(2) : ''));
      })),
      view === 'month' ? [
        h('div', { class: 'row wrap between' },
          at > 0 ? h('a', { class: 'btn', id: 'month-prev', href: link({ m: win.months[at - 1] }) }, '‹ Prev') : h('span', { class: 'btn off', 'aria-hidden': 'true' }, '‹ Prev'),
          h('h2', { id: 'month-title', 'aria-live': 'polite' }, fmtMonth(m)),
          at < 11 ? h('a', { class: 'btn', id: 'month-next', href: link({ m: win.months[at + 1] }) }, 'Next ›') : h('span', { class: 'btn off', 'aria-hidden': 'true' }, 'Next ›')),
        grid(),
      ] : h('div', { class: 'stack', id: 'agenda', 'data-test': 'agenda' }, events.length ? agenda() : h('p', null, 'No events match these filters.'))));

  // In list view a month link jumps to that month's banner.
  const jump = view === 'list' && mSet ? m : '';
  if (jump && jump !== lastJump) setTimeout(() => { const el = document.getElementById('mon-' + m); if (el) el.scrollIntoView(); }, 0);
  lastJump = jump;
  return out;
}
