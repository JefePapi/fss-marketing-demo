import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeeds, holidayMap } from '../js/seed.js';
import { calWindow, overallStatus, teamsOf, ymd } from '../js/model.js';

// Several "todays": mid-month, first of the month, last day, a year end, a leap day.
const DAYS = [new Date(2026, 10, 17), new Date(2026, 11, 1), new Date(2027, 0, 31), new Date(2026, 11, 31), new Date(2028, 1, 29)];

for (const now of DAYS) {
  test(`seeds on ${ymd(now)}`, () => {
    const seeds = buildSeeds(now), win = calWindow(now), text = JSON.stringify(seeds);
    assert.equal(seeds.length, 36);
    assert.equal(new Set(seeds.map(s => s.id)).size, 36);
    const nums = seeds.map(s => +s.id.slice(-4));
    assert.equal(Math.min(...nums), 106); assert.equal(Math.max(...nums), 141);
    for (const s of seeds) {
      assert.ok(s.event.date >= win.start && s.event.date <= win.end, `${s.id} date in window`);
      if (s.event.endDate) assert.ok(s.event.endDate > s.event.date && s.event.endDate <= win.end);
      assert.ok(s.requester.email.endsWith('@example.com'));
      assert.equal(s.requester.phone, undefined);
      assert.ok(new Date(s.submittedAt) < now, `${s.id} sent before today`);
    }
    assert.ok(!/phone/i.test(text));
    assert.ok(!/\d{3}[-.\s]\d{4}/.test(text), 'nothing shaped like a phone number');

    const teams = n => seeds.filter(s => teamsOf(s).length === n).length;
    assert.deepEqual([teams(0), teams(1), teams(2), teams(3)], [10, 12, 9, 5]);
    assert.equal(seeds.filter(s => s.late).length, 4);
    const cancelled = seeds.filter(s => s.calendar.status === 'cancelled');
    assert.equal(cancelled.length, 3); assert.ok(cancelled.every(s => s.calendar.cancelReason));
    assert.equal(seeds.filter(s => s.event.endDate).length, 2);
    assert.equal(seeds.filter(s => s.event.title === 'Storytime').length, 5);

    const lanes = seeds.flatMap(s => s.jobs);
    for (const st of ['new', 'inprogress', 'waiting', 'done', 'declined']) assert.ok(lanes.filter(j => j.status === st).length >= 3, st);
    assert.ok(lanes.filter(j => !j.owner).length >= 3);
    assert.ok(lanes.filter(j => j.status === 'declined').every(j => j.declineReason));
    const waiting = seeds.filter(s => overallStatus(s) === 'waiting');
    assert.ok(waiting.length >= 2);
    assert.ok(waiting.every(s => s.thread.some(t => t.role === 'staff' && t.kind === 'reply')));

    const f = seeds[0];
    assert.equal(f.event.title, 'Fall Fest 5K'); assert.equal(f.requester.name, 'Jordan Hale');
    assert.deepEqual(f.jobs.map(j => `${j.service}:${j.status}`), ['print:inprogress', 'social:inprogress', 'sponsorship:new', 'flash:waiting']);
  });
}

test('store: first new number after seeding is MKT-26-0142; Reset puts it back', async () => {
  const store = await import('../js/store.js');
  const now = new Date(2026, 10, 17);
  store.reset(now);
  assert.equal(store.requests().length, 36);
  assert.equal(store.peekId(now), 'MKT-26-0142');
  const made = store.add({ event: {}, jobs: [] }, now);
  assert.equal(made.id, 'MKT-26-0142');
  assert.equal(store.peekId(now), 'MKT-26-0143');
  assert.equal(store.find('MKT-26-0142'), made);
  store.reset(now);
  assert.equal(store.requests().length, 36);
  assert.equal(store.peekId(now), 'MKT-26-0142');
});

test('holidays: about a dozen named days plus three sample Family Days in the window', () => {
  const h = Object.values(holidayMap(calWindow(new Date(2026, 10, 17))));
  assert.equal(h.filter(n => n === 'Family Day (sample)').length, 3);
  assert.equal(h.length, 14);
  const map = holidayMap(calWindow(new Date(2026, 10, 17)));
  assert.equal(map['2026-11-26'], 'Thanksgiving'); assert.equal(map['2027-01-18'], 'MLK Day'); assert.equal(map['2027-05-31'], 'Memorial Day');
});
