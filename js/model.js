// Pure functions only: no DOM, no storage. Tested with `node --test tests/*.test.mjs`.
import { LEAD_DAYS, svc, TEAMS, STAFF, FACILITIES } from './config.js';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = n => String(n).padStart(2, '0');
export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const isYmd = s => /^\d{4}-\d\d-\d\d$/.test(s || '');
export const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
export const diffDays = (a, b) => {
  const A = parseYmd(a), B = parseYmd(b);
  return Math.round((Date.UTC(A.getFullYear(), A.getMonth(), A.getDate()) - Date.UTC(B.getFullYear(), B.getMonth(), B.getDate())) / 864e5);
};

// Display formats.
export const fmtDate = s => { const d = parseYmd(s); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
export const fmtDay = s => { const d = parseYmd(s); return `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`; };
export const fmtDM = s => { const d = parseYmd(s); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const fmtMonth = ym => { const [y, m] = ym.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
export const fmtTime = t => { const [hh, mm] = t.split(':').map(Number); return `${hh % 12 || 12}:${pad(mm)} ${hh < 12 ? 'AM' : 'PM'}`; };
export const timeText = e => e.allDay ? 'All day' : e.start ? fmtTime(e.start) + (e.end ? ' – ' + fmtTime(e.end) : '') : 'Time not set';
// Display only: stored HH:mm values and spreadsheet/ICS exports stay unchanged.
export const militaryTimeText = e => e.allDay ? 'All day' : e.start
  ? e.start.replace(':', '') + (e.end ? '–' + e.end.replace(':', '') : '') : 'Time not set';
export const dateText = e => e.endDate && e.endDate > e.date ? `${fmtDate(e.date)} to ${fmtDate(e.endDate)}` : fmtDate(e.date);
export const fmtStamp = iso => { const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}, ${fmtTime(pad(d.getHours()) + ':' + pad(d.getMinutes()))}`; };

// Overall request status. Derived on every render, never stored. Order matters.
export function overallStatus(req) {
  if (req.withdrawn) return 'withdrawn';
  const s = (req.jobs || []).map(j => j.status);
  if (!s.length) return 'calonly';
  if (s.every(x => x === 'declined')) return 'declined';
  if (s.every(x => x === 'done' || x === 'declined')) return 'complete';
  if (s.filter(x => x !== 'done' && x !== 'declined').every(x => x === 'onhold')) return 'onhold';
  if (s.includes('waiting')) return 'waiting';
  if (s.includes('inprogress') || (s.includes('done') && s.includes('new'))) return 'inprogress';
  return 'new';
}

export const teamsOf = req => [...new Set((req.jobs || []).map(j => j.team))];

// How many separate forms today's site would need: one per distinct team.
export const heskTicketCount = req => teamsOf(req).length;

// Lead-time note. Warns and flags, never blocks (only a past date blocks).
export function leadTime(eventDate, today, days = LEAD_DAYS) {
  const diff = diffDays(eventDate, today);
  return { past: diff < 0, late: diff >= 0 && diff < days, sendBy: addDays(eventDate, -days) };
}

// Rolling window: first day of this month through the last day of the 11th month after it.
export function calWindow(now) {
  const y = now.getFullYear(), m = now.getMonth(), months = [];
  for (let i = 0; i < 12; i++) { const d = new Date(y, m + i, 1); months.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); }
  return { start: ymd(new Date(y, m, 1)), end: ymd(new Date(y, m + 12, 0)), months };
}
export const daysInMonth = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };

// Calendar entries are derived from requests, so the calendar cannot drift from the request.
// One entry per request per day covered.
export function calendarEvents(requests, win) {
  const out = [];
  for (const req of requests) {
    if (req.kind === 'other' || req.mergedInto) continue;
    const e = req.event, end = e.endDate && e.endDate > e.date ? e.endDate : e.date;
    const days = Math.min(diffDays(end, e.date) + 1, 62);
    for (let i = 0; i < days; i++) {
      const date = addDays(e.date, i);
      if (date < win.start || date > win.end) continue;
      out.push({
        date, day: i + 1, days, req, id: req.id, title: e.title, time: timeText(e), where: e.where,
        section: e.section, status: req.calendar.status, services: req.jobs.map(j => j.service), late: !!req.late,
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date)
    || (a.req.event.start || '').localeCompare(b.req.event.start || '') || a.id.localeCompare(b.id));
}

export const makeId = (counter, now) => `MKT-${String(now.getFullYear()).slice(2)}-${String(counter).padStart(4, '0')}`;

export const newJob = (service, n, details = {}, due = '') =>
  ({ id: 'j' + n, service, team: svc(service).team, status: 'new', owner: null, due, details });

// Lane answers as label/value pairs for display.
export function detailLines(job, req) {
  const d = job.details || {}, out = [];
  const add = (l, v) => { if (v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)) out.push([l, Array.isArray(v) ? v.join(', ') : String(v)]); };
  add('Sizes', d.sizes); add('How many', d.qty && typeof d.qty === 'object' ? Object.entries(d.qty).map(([s,n]) => `${s}: ${n}`).join(', ') : d.qty); add('Needed in hand', d.inHand && fmtDate(d.inHand));
  add('Which', d.kinds); add('Break-even number', d.breakEven); add('Cash asked for', d.cash); add('Items asked for', d.items);
  if (job.service === 'sponsorship') add('Expected attendance', req.event.estAttendance);
  add('Which page', d.page); add('Page address', d.url); add('Old text', d.old); add('New text', d.new); add('Flash section', d.flashSection);
  return out;
}

// Reports count surviving requests, with no stored counters to drift.
export function reports(requests, now = new Date()) {
  const rows=requests.filter(r=>!r.mergedInto), jobs=rows.flatMap(r=>r.jobs);
  const months=Array.from({length:12},(_,i)=>ymd(new Date(now.getFullYear(),now.getMonth()-11+i,1)).slice(0,7));
  return {
    month:months.map(m=>[m,rows.filter(r=>r.submittedAt.slice(0,7)===m).length]),
    team:Object.entries(TEAMS).map(([id,name])=>[name,...['new','inprogress','waiting','onhold','done','declined'].map(s=>jobs.filter(j=>j.team===id && j.status===s).length)]),
    staff:STAFF.map(p=>[p.name,jobs.filter(j=>j.owner===p.id && !['done','declined'].includes(j.status)).length,jobs.filter(j=>j.owner===p.id && j.status==='done').length]),
    facility:[...FACILITIES.map(f=>[f.name,rows.filter(r=>r.event.facilityId===f.id).length]),['Non-event requests',rows.filter(r=>r.kind==='other').length]],
  };
}
