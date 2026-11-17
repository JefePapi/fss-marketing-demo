import test from 'node:test';
import assert from 'node:assert/strict';
import { exportRows, toCSV, toXLS, toICS, safeCell } from '../js/export.js';
import { calWindow } from '../js/model.js';
import { buildSeeds, holidayMap } from '../js/seed.js';

const now = new Date(2026, 10, 17), win = calWindow(now);
const SIXTEEN = ['DATE', 'DAY ', 'TIME OF EVENT', 'DATE OF TICKET SUBMISSION', 'LATE REQUEST', 'EVENT OR PROGRAM', 'LOCATION', 'SECTION',
  'POC (Name, Phone)', 'JOINT EVENT?', 'EST. ATTENDANCE', 'ACTUAL ATTENDANCE', 'SIGNED UP REQUIRED?', 'ON AF CONNCET APP?', 'SPONSORSHIP REQUESTED', 'Notes'];

const one = over => ({
  id: 'MKT-26-0999', submittedAt: new Date(2026, 9, 1, 10).toISOString(), late: true,
  requester: { name: 'Test Person', email: 'test.person@example.com' },
  event: { facilityId: 'club', section: 'FSWC', title: 'Plain', description: 'd', date: '2026-12-05', endDate: '', allDay: false, start: '18:00', end: '20:00', where: 'Club', cost: 'Free', estAttendance: 50, actualAttendance: null, joint: false, signup: true, afConnect: 'notyet' },
  calendar: { status: 'good', cancelReason: '', type: 'Wing', notes: '' }, jobs: [{ id: 'j1', service: 'sponsorship', team: 'sponsorship', status: 'new' }], thread: [], log: [], ...over,
});

test('CSV: BOM, title row, the 16 headers byte for byte, then 3 extras', () => {
  const csv = toCSV(exportRows([one()], win, {}));
  assert.equal(csv.charCodeAt(0), 0xFEFF);
  const lines = csv.slice(1).split('\r\n');
  assert.ok(lines[0].startsWith('"52d FSS Calendar of Events — DEMO SAMPLE DATA"'));
  assert.equal(lines[1], [...SIXTEEN, 'STATUS', 'TYPE', 'REQUEST #'].map(s => `"${s}"`).join(','));
  assert.ok(lines[1].includes('"DAY ",'));
});

test('CSV: event row is filled by the column rules', () => {
  const rows = exportRows([one()], win, {});
  const ev = rows.find(r => r.kind === 'event');
  assert.deepEqual(ev.cells, ['05-Dec-26', 'Saturday', '1800-2000', '01-Oct-26', 'Late', 'Plain', 'Club', 'FSWC', 'Test Person', 'No', '50', '', 'Yes', 'Not yet', 'Yes', '', 'Good to go', 'Wing', 'MKT-26-0999']);
});

test('CSV: month banners, empty days kept, holidays named in DAY; events-only drops them', () => {
  const hol = holidayMap(win);
  const full = exportRows([one()], win, hol);
  assert.equal(full.filter(r => r.kind === 'banner').length, 12);
  assert.equal(full.filter(r => r.kind === 'banner')[0].cells[0], 'NOVEMBER 2026');
  assert.equal(full.filter(r => r.kind !== 'title' && r.kind !== 'head' && r.kind !== 'banner').length, 365); // 364 other days + the event's day
  const xmas = full.find(r => r.cells[0] === '25-Dec-26');
  assert.equal(xmas.cells[1], 'Christmas Day');
  const only = exportRows([one()], win, hol, true);
  assert.deepEqual(only.map(r => r.kind), ['title', 'head', 'event']);
});

test('CSV: commas, quotes and line breaks are escaped; formulas are neutralized', () => {
  const tricky = one(); tricky.event.title = 'Big "Fun", day\nTwo';
  const evil = one({ id: 'MKT-26-0998' }); evil.event.title = '=HYPERLINK("http://x")'; evil.event.where = '@home'; evil.event.cost = '-5';
  const csv = toCSV(exportRows([tricky, evil], win, {}, true));
  assert.ok(csv.includes('"Big ""Fun"", day\nTwo"'));
  assert.ok(csv.includes('"\'=HYPERLINK(""http://x"")"'));
  assert.ok(csv.includes('"\'@home"'));
  for (const s of ['=1', '+1', '-1', '@a']) assert.equal(safeCell(s), "'" + s);
  assert.equal(safeCell('20-Mar-27'), '20-Mar-27');
});

test('CSV: cancelled request keeps its reason in Notes and Cancelled in STATUS; two events on a day make two rows', () => {
  const c = one({ calendar: { status: 'cancelled', cancelReason: 'Not enough sign-ups', type: '', notes: '' } });
  const rows = exportRows([c, one({ id: 'MKT-26-0997' })], win, {}, true).filter(r => r.kind === 'event');
  assert.equal(rows.length, 2);
  const row = rows.find(r => r.cells[18] === 'MKT-26-0999');
  assert.equal(row.cells[15], 'Not enough sign-ups'); assert.equal(row.cells[16], 'Cancelled');
});

test('XLS: html table, escaped, coloured status', () => {
  const x = one(); x.event.title = '<b>bold</b>';
  const xls = toXLS(exportRows([x], win, {}, true));
  assert.ok(xls.includes('&lt;b&gt;bold&lt;/b&gt;')); assert.ok(!xls.includes('<b>bold'));
  assert.ok(xls.includes('background:#c9ecd0')); assert.ok(xls.includes('<th'));
});

test('ICS: one VEVENT per request, all-day and cancelled handled', () => {
  const seeds = buildSeeds(now);
  const ics = toICS(seeds, win, now);
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, 36);
  assert.equal(ics.match(/STATUS:CANCELLED/g).length, 3);
  assert.ok(/DTSTART;VALUE=DATE:\d{8}\r\n/.test(ics));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n')); assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(ics.split('\r\n').every(l => l.length <= 75));
});
