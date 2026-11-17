// Export builders. Row building and the CSV/XLS/ICS strings are pure; only download() touches the page.
import { HEADERS, EXTRA_HEADERS, SHEET_TITLE, CAL_STATUS, AF_CONNECT, TEAMS, OVERALL, staffName, facility } from './config.js';
import { calendarEvents, parseYmd, ymd, addDays, daysInMonth, MONTHS, DAYS, overallStatus } from './model.js';

const COLS = HEADERS.length + EXTRA_HEADERS.length;
const pad = n => String(n).padStart(2, '0');
const dmy = s => { const d = parseYmd(s); return `${pad(d.getDate())}-${MONTHS[d.getMonth()].slice(0, 3)}-${String(d.getFullYear()).slice(2)}`; };
const hhmm = t => t.replace(':', '');
const yn = b => b ? 'Yes' : 'No';
const blank = v => v === null || v === undefined ? '' : String(v);
const row = (kind, cells, status) => ({ kind, status, cells: cells.concat(Array(COLS - cells.length).fill('')) });

function eventCells(ev) {
  const r = ev.req, e = r.event;
  return [
    dmy(ev.date), DAYS[parseYmd(ev.date).getDay()],
    e.allDay ? 'All Day' : e.start ? hhmm(e.start) + (e.end ? '-' + hhmm(e.end) : '') : 'TBD',
    r.submittedAt ? dmy(ymd(new Date(r.submittedAt))) : '',
    r.late ? 'Late' : 'On Time',
    e.title, e.where, e.section,
    r.requester.name + (r.requester.phone ? ', ' + r.requester.phone : ''),
    yn(e.joint), blank(e.estAttendance), blank(e.actualAttendance), yn(e.signup), AF_CONNECT[e.afConnect] || '',
    yn(r.jobs.some(j => j.service === 'sponsorship')),
    [r.calendar.status === 'cancelled' && r.calendar.cancelReason, r.calendar.notes].filter(Boolean).join(' — '),
    CAL_STATUS[r.calendar.status], r.calendar.type || '', r.id,
  ];
}

// The sheet's layout: title, headers, then a banner per month and a row per day.
export function exportRows(requests, win, holidays = {}, eventsOnly = false) {
  const byDate = {};
  for (const ev of calendarEvents(requests, win)) (byDate[ev.date] ||= []).push(ev);
  const rows = [row('title', [SHEET_TITLE]), row('head', [...HEADERS, ...EXTRA_HEADERS])];
  for (const ym of win.months) {
    const [y, m] = ym.split('-').map(Number);
    if (!eventsOnly) rows.push(row('banner', [`${MONTHS[m - 1].toUpperCase()} ${y}`]));
    for (let d = 1; d <= daysInMonth(ym); d++) {
      const date = `${ym}-${pad(d)}`, list = byDate[date] || [], hol = holidays[date];
      if (!eventsOnly && hol) rows.push(row('holiday', [dmy(date), hol]));
      if (!eventsOnly && !hol && !list.length) rows.push(row('day', [dmy(date), DAYS[parseYmd(date).getDay()]]));
      for (const ev of list) rows.push(row('event', eventCells(ev), ev.status));
    }
  }
  return rows;
}

// A typed title must never run as a spreadsheet formula.
export const safeCell = v => /^[=+\-@\t\r]/.test(v) ? "'" + v : v;

export function toCSV(rows) {
  return '\uFEFF' + rows.map(r => r.cells.map(c => '"' + safeCell(String(c)).replace(/"/g, '""') + '"').join(',')).join('\r\n') + '\r\n';
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const XLS_STATUS = { good: 'background:#c9ecd0', notconfirmed: 'background:#ffe3a3', cancelled: 'background:#dcdfe3;color:#55606a;text-decoration:line-through' };

// An HTML table Excel opens under an .xls name (it shows a one-time format prompt).
export function toXLS(rows) {
  const text = 'mso-number-format:"\\@";';
  const body = rows.map(r => {
    if (r.kind === 'title' || r.kind === 'banner') return `<tr><td colspan="${COLS}" style="font-weight:bold;background:#133e5e;color:#fff">${esc(r.cells[0])}</td></tr>`;
    const tag = r.kind === 'head' ? 'th' : 'td';
    return '<tr>' + r.cells.map((c, i) => {
      const st = text + (r.kind === 'event' && i === HEADERS.length ? XLS_STATUS[r.status] || '' : r.kind === 'holiday' ? 'background:#e3eefb' : '');
      return `<${tag} style='${st}'>${esc(safeCell(String(c)))}</${tag}>`;
    }).join('') + '</tr>';
  }).join('\n');
  return `<html><head><meta charset="utf-8"><title>Rolling Calendar demo</title></head><body><table border="1">\n${body}\n</table></body></html>`;
}

const icsText = s => String(s).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
const fold = line => { const out = []; while (line.length > 73) { out.push(line.slice(0, 73)); line = ' ' + line.slice(73); } out.push(line); return out.join('\r\n'); };

// One VEVENT per request (multi-day trips are one event). Times are local "floating" times.
export function toICS(requests, win, now = new Date()) {
  const day = s => s.replace(/-/g, ''), stamp = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Marketing request demo//Sample data//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Rolling Calendar (demo sample data)'];
  for (const r of requests) {
    if (r.kind === 'other' || r.mergedInto) continue;
    const e = r.event, last = e.endDate && e.endDate > e.date ? e.endDate : e.date;
    if (last < win.start || e.date > win.end) continue;
    lines.push('BEGIN:VEVENT', `UID:${r.id}@marketing-demo.example`, `DTSTAMP:${stamp}`);
    if (e.allDay || !e.start) lines.push(`DTSTART;VALUE=DATE:${day(e.date)}`, `DTEND;VALUE=DATE:${day(addDays(last, 1))}`);
    else {
      lines.push(`DTSTART:${day(e.date)}T${hhmm(e.start)}00`);
      if (e.end || last > e.date) lines.push(`DTEND:${day(last)}T${hhmm(e.end || e.start)}00`);
    }
    lines.push(`SUMMARY:${icsText(e.title)}`, `LOCATION:${icsText(e.where)}`,
      `DESCRIPTION:${icsText(`${r.id} · ${CAL_STATUS[r.calendar.status]} · Demo sample data`)}`,
      `STATUS:${r.calendar.status === 'cancelled' ? 'CANCELLED' : r.calendar.status === 'good' ? 'CONFIRMED' : 'TENTATIVE'}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

// Hand a file to the browser. Built in memory; nothing is sent anywhere.
export function download(name, mime, text) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.setAttribute('href', url); a.setAttribute('download', name.replace(/[\\/\x00-\x1f]/g, '_'));
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function requestRows(requests) {
  const headers=['Request #','Title','Kind','Facility','Event date','Requester','Email','Cc','Priority','Overall status',...Object.values(TEAMS).flatMap(t=>[t+' status',t+' owner',t+' due'])];
  return [{cells:headers},...requests.map(r=>({cells:[r.id,r.event.title,r.kind || 'event',r.kind==='other'?'':facility(r.event.facilityId).name,r.event.date,r.requester.name,r.requester.email,(r.cc || []).join(', '),r.priority || 'medium',OVERALL[overallStatus(r)],...Object.keys(TEAMS).flatMap(t=>{const jobs=r.jobs.filter(j=>j.team===t);return [jobs.map(j=>j.status).join('; '),jobs.map(j=>staffName(j.owner)).join('; '),jobs.map(j=>j.due || '').join('; ')];})]}))];
}
