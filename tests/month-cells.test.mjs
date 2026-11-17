import test from 'node:test';
import assert from 'node:assert/strict';
import { monthCells, parseYmd, daysInMonth, addDays } from '../js/model.js';

test('monthCells returns complete Sunday–Saturday weeks across month boundaries', () => {
  // Sunday start, Saturday end, leap day, year rollover and DST months.
  for (const ym of ['2026-11', '2026-10', '2028-02', '2026-12', '2027-03', '2027-10']) {
    const dates = monthCells(ym);
    assert.equal(parseYmd(dates[0]).getDay(), 0);
    assert.equal(parseYmd(dates.at(-1)).getDay(), 6);
    assert.equal(dates.length % 7, 0);
    assert.ok(dates.includes(ym + '-01'));
    assert.ok(dates.includes(`${ym}-${daysInMonth(ym)}`));
    assert.equal(dates.filter(d => d.startsWith(ym)).length, daysInMonth(ym));
    dates.slice(1).forEach((d, i) => assert.equal(d, addDays(dates[i], 1)));
  }
  assert.equal(monthCells('2026-11')[0], '2026-11-01');
  assert.equal(monthCells('2026-10').at(-1), '2026-10-31');
});
