import test from 'node:test';
import assert from 'node:assert/strict';
import { overallStatus, heskTicketCount, leadTime, calWindow, calendarEvents, makeId, addDays } from '../js/model.js';

const jobs = (...s) => ({ jobs: s.map((x, i) => { const [service, status] = x.split(':'); return { id: 'j' + i, service, status, team: { print: 'design', social: 'design', flash: 'flash', sponsorship: 'sponsorship', web: 'web' }[service] }; }) });

test('overallStatus: the six rules, in order', () => {
  assert.equal(overallStatus({ jobs: [] }), 'calonly');
  assert.equal(overallStatus(jobs('print:declined', 'flash:declined')), 'declined');
  assert.equal(overallStatus(jobs('print:done', 'flash:declined')), 'complete');
  assert.equal(overallStatus(jobs('print:done', 'flash:waiting', 'web:inprogress')), 'waiting');
  assert.equal(overallStatus(jobs('print:inprogress', 'flash:new')), 'inprogress');
  assert.equal(overallStatus(jobs('print:done', 'flash:new')), 'inprogress');
  assert.equal(overallStatus(jobs('print:new', 'flash:new')), 'new');
  assert.equal(overallStatus(jobs('print:new', 'flash:declined')), 'new');
});

test('heskTicketCount: one old form per distinct team', () => {
  assert.equal(heskTicketCount(jobs('print:new', 'social:new')), 1);
  assert.equal(heskTicketCount(jobs('print:new', 'flash:new', 'sponsorship:new')), 3);
  assert.equal(heskTicketCount({ jobs: [] }), 0);
});

test('leadTime: 59 days late, 60 on time, past rejected', () => {
  const today = '2026-11-17';
  assert.deepEqual(leadTime(addDays(today, 59), today), { past: false, late: true, sendBy: addDays(today, -1) });
  assert.equal(leadTime(addDays(today, 60), today).late, false);
  assert.equal(leadTime(addDays(today, 60), today).sendBy, today);
  assert.equal(leadTime(addDays(today, -1), today).past, true);
  assert.equal(leadTime(today, today).past, false);
});

test('calWindow: 12 months, December rollover, leap February', () => {
  const w = calWindow(new Date(2026, 10, 17));
  assert.equal(w.start, '2026-11-01'); assert.equal(w.end, '2027-10-31');
  assert.equal(w.months.length, 12); assert.equal(w.months[1], '2026-12'); assert.equal(w.months[2], '2027-01');
  const leap = calWindow(new Date(2027, 2, 31));
  assert.equal(leap.start, '2027-03-01'); assert.equal(leap.end, '2028-02-29'); assert.equal(leap.months[11], '2028-02');
  assert.equal(calWindow(new Date(2026, 11, 31)).months[1], '2027-01');
});

test('calendarEvents: a 3-day trip gives 3 entries; cancelled stays', () => {
  const win = calWindow(new Date(2026, 10, 17));
  const req = (id, date, endDate, status) => ({ id, late: false, jobs: [], calendar: { status }, event: { title: id, date, endDate, where: 'x', section: 'S', start: '08:00' } });
  const evs = calendarEvents([req('A', '2026-12-30', '2027-01-01', 'good'), req('B', '2026-12-05', '', 'cancelled'), req('C', '2028-01-01', '', 'good')], win);
  assert.deepEqual(evs.filter(e => e.id === 'A').map(e => e.date), ['2026-12-30', '2026-12-31', '2027-01-01']);
  assert.equal(evs.filter(e => e.id === 'B')[0].status, 'cancelled');
  assert.equal(evs.filter(e => e.id === 'C').length, 0);
  assert.equal(evs[0].id, 'B'); // sorted by date
});

test('makeId format', () => {
  assert.equal(makeId(142, new Date(2026, 10, 17)), 'MKT-26-0142');
});
