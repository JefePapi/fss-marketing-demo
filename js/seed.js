// Seed generator. Everything is invented. Dates are relative to today so the demo never looks stale.
import { facility, staffName } from './config.js';
import { ymd, addDays, parseYmd, newJob, makeId } from './model.js';

export const REQUESTERS = ['Jordan Hale', 'Sam Ortiz', 'Alex Kim', 'Riley Brooks', 'Casey Morgan', 'Dana Whitfield'];
export const FIRST_SEED = 106;

// [title, facility, requester, when, time, lanes, options]
// when: a number = days from today (kept inside this month); [monthOffset, day, endDay?]; day 'ff' = first Friday.
// lanes: "service:status:owner" (owner blank = unassigned). No lanes = calendar only.
const ROWS = [
  // three teams
  ['Fall Fest 5K', 'fitness', 0, [4, 20], '08:00-11:00', 'print:inprogress:maya social:inprogress:maya sponsorship:new: flash:waiting:priya',
    { est: 250, type: 'Wing', signup: true, af: 'notyet', cost: 'Free', where: 'Fitness Center track', desc: 'A sample community 5K fun run.', good: true,
      ask: ['flash', 'priya', 'Can you send two sentences for the listing and one photo we may print?'], note: ['marcus', 'Two sample sponsors asked about this one last year.'] }],
  ['Spring Carnival Demo', 'outdoor', 1, [5, 17], '11:00-16:00', 'print:new: sponsorship:inprogress:marcus web:new:lena', { est: 600, joint: true, type: 'AFE' }],
  ['Holiday Market Trip', 'itt', 3, [1, 12, 13], '07:00-21:00', 'print:done:taylor flash:done:priya web:done:lena', { est: 45, signup: true, type: 'M3', good: true, cost: '$35' }],
  ['Summer Reading Kickoff', 'library', 5, [7, 5], '10:00-12:00', 'print:new: flash:new:priya sponsorship:waiting:marcus',
    { est: 120, ask: ['sponsorship', 'marcus', 'What is your break-even number for this event?'] }],
  ['Family Bowling Day', 'bowling', 4, [2, 16], '13:00-17:00', 'social:inprogress:taylor screen:inprogress:taylor flash:declined:priya sponsorship:done:marcus',
    { est: 90, decline: 'That issue is already full (sample).' }],
  // two teams
  ['Karaoke Night', 'club', 2, 5, '19:00-22:00', 'social:done:maya web:done:lena', { late: true, good: true }],
  ['Trivia Night', 'club', 2, [1, 4], '18:30-20:30', 'print:inprogress:taylor flash:new:priya', { late: true }],
  ['Paint and Sip', 'arts', 3, [2, 6], '17:30-19:30', 'print:waiting:maya web:new:',
    { signup: true, ask: ['print', 'maya', 'Which sizes do you want printed, and how many of each?'] }],
  ['Ski Day Trip', 'outdoor', 1, [2, 23, 24], '06:00-20:00', 'print:inprogress:maya flash:inprogress:priya', { signup: true, cost: '$60', est: 30 }],
  ['Castle Tour', 'itt', 3, [3, 13], '08:00-18:00', 'social:new:taylor flash:new:priya', { signup: true, cost: '$25' }],
  ['No-Tap Tournament', 'bowling', 4, [3, 27], '12:00-16:00', 'print:done:taylor sponsorship:declined:marcus', { decline: 'Under the size we can support (sample).' }],
  ['Car Care Clinic', 'auto', 5, [6, 9], '09:00-12:00', 'screen:new: web:inprogress:lena', {}],
  ['Kayak Morning', 'outdoor', 1, [8, 11], '08:00-11:00', 'print:new:taylor sponsorship:new:marcus', { signup: true }],
  ['Paint and Sip', 'arts', 3, -6, '17:00-19:00', 'social:done:maya flash:done:priya', { signup: true }],
  // one team
  ['Sample Menu Board', 'arts', 2, [3, 3], '11:00-13:00', 'print:waiting:taylor', { ask: ['print', 'taylor', 'Please send the final menu wording so we can start.'] }],
  ['LEGO Club', 'youth', 5, [1, 9], '15:30-17:00', 'social:inprogress:maya', {}],
  ['Karaoke Night', 'club', 2, [4, 5], '19:00-22:00', 'screen:new:taylor', { cancel: 'Moved to a later date (sample).' }],
  ['Trivia Night', 'club', 2, [5, 8], '18:30-20:30', 'print:new:maya', {}],
  ['Paint and Sip', 'arts', 3, [6, 18], '17:30-19:30', 'social:declined:maya', { decline: 'Covered by an earlier request (sample).' }],
  ['Family Bowling Day', 'bowling', 4, [9, 14], '13:00-17:00', 'flash:new:priya', {}],
  ['Kayak Morning', 'outdoor', 1, [9, 22], '08:00-11:00', 'web:new:', {}],
  ['Castle Tour', 'itt', 3, [10, 10], '08:00-18:00', 'print:new:taylor', { signup: true, cost: '$25' }],
  ['Car Care Clinic', 'auto', 5, -3, '09:00-12:00', 'print:done:taylor', {}],
  ['No-Tap Tournament', 'bowling', 4, -9, '12:00-16:00', 'screen:done:maya', {}],
  ['Ski Day Trip', 'outdoor', 1, 9, '06:00-20:00', 'print:inprogress:taylor', { late: true, cancel: 'Not enough sign-ups', signup: true, cost: '$60' }],
  ['LEGO Club', 'youth', 5, [11, 7], '15:30-17:00', 'web:new:lena', {}],
  // calendar only (Storytime is one recurring program entered as five dated entries)
  ['Storytime', 'library', 5, [1, 10], '10:00-10:45', '', { good: true, cost: 'Free' }],
  ['Storytime', 'library', 5, [2, 14], '10:00-10:45', '', { good: true, cost: 'Free' }],
  ['Storytime', 'library', 5, [3, 11], '10:00-10:45', '', { good: true, cost: 'Free' }],
  ['Storytime', 'library', 5, [4, 8], '10:00-10:45', '', { good: true, cost: 'Free' }],
  ['Storytime', 'library', 5, [5, 13], '10:00-10:45', '', { good: true, cost: 'Free' }],
  ['LEGO Club', 'youth', 5, 2, '15:30-17:00', '', { late: true, good: true }],
  ['First Friday Social', 'club', 2, [1, 'ff'], '17:00-19:00', '', { good: true }],
  ['First Friday Social', 'club', 2, [2, 'ff'], '17:00-19:00', '', {}],
  ['Kayak Morning', 'outdoor', 1, [7, 19], '08:00-11:00', '', { cancel: 'Facility closed for maintenance (sample).' }],
  ['Holiday Market Trip', 'itt', 3, -12, '', '', { signup: true, cost: '$35' }],
];

const DETAILS = {
  print: d => ({ sizes: ['A4', 'A3'], qty: 50, inHand: addDays(d, -21) }),
  social: () => ({ kinds: ['Event photo'] }),
  sponsorship: () => ({ breakEven: 80, cash: '500', items: 'Door prizes (sample)' }),
  web: () => ({ page: 'Events page' }),
};

export function buildSeeds(now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth(), today = ymd(now);
  const lastDay = new Date(y, m + 1, 0).getDate();
  const stamp = (day, i, extra = 0) => new Date(parseYmd(day).getTime() + (9 * 60 + (i * 13) % 240 + extra) * 60000).toISOString();

  return ROWS.map(([title, fac, who, when, time, lanes, o], i) => {
    let date, endDate = '';
    if (typeof when === 'number') {
      date = ymd(new Date(y, m, Math.min(lastDay, Math.max(1, now.getDate() + when))));
    } else {
      let day = when[1];
      if (day === 'ff') day = 1 + (5 - new Date(y, m + when[0], 1).getDay() + 7) % 7;
      date = ymd(new Date(y, m + when[0], day));
      if (when[2]) endDate = ymd(new Date(y, m + when[0], when[2]));
    }
    const past = date < today, f = facility(fac), name = REQUESTERS[who];
    const [start = '', end = ''] = time.split('-');
    const sub = [addDays(date, o.late ? -21 : -(70 + (i * 7) % 50)), addDays(today, -(1 + (i * 5) % 30))].sort()[0];
    const est = o.est || 40 + (i * 17) % 160;

    const jobs = lanes ? lanes.split(' ').map((s, k) => {
      const [service, status, owner] = s.split(':');
      const j = newJob(service, k + 1, DETAILS[service] ? DETAILS[service](date) : {}, addDays(date, service === 'print' ? -21 : -14));
      j.status = status; j.owner = owner || null;
      if (status === 'declined') j.declineReason = o.decline || 'Not possible this time (sample).';
      return j;
    }) : [];

    const thread = [];
    if (o.ask) {
      const [service, staff, text] = o.ask;
      thread.push({ at: stamp(sub, i, 120), author: staffName(staff), role: 'staff', kind: 'reply', jobId: jobs.find(j => j.service === service).id, text });
    }
    if (o.note) thread.push({ at: stamp(sub, i, 180), author: staffName(o.note[0]), role: 'staff', kind: 'note', text: o.note[1] });

    return {
      id: makeId(FIRST_SEED + i, now),
      submittedAt: stamp(sub, i),
      late: !!o.late,
      requester: { name, email: name.toLowerCase().replace(' ', '.') + '@example.com' },
      event: {
        facilityId: fac, section: f.section, title,
        description: o.desc || `Sample ${title.toLowerCase()} at the ${f.name}.`,
        date, endDate, allDay: !time, start, end,
        where: o.where || f.name, cost: o.cost || ['Free', '$5', '$10', '$15'][i % 4],
        estAttendance: est, actualAttendance: past ? Math.round(est * 0.9) : null,
        joint: !!o.joint, signup: o.signup ?? i % 2 === 0, afConnect: o.af || ['yes', 'notyet', 'no'][i % 3],
      },
      calendar: {
        status: o.cancel ? 'cancelled' : past || o.good || i % 3 ? 'good' : 'notconfirmed',
        cancelReason: o.cancel || '', type: o.type || '', notes: '',
      },
      jobs, thread,
      log: [{ at: stamp(sub, i), who: 'System', text: 'Request received' }],
    };
  });
}

// Holidays: computed for any year, so the calendar always has them.
const nth = (y, m, dow, n) => { const first = new Date(y, m, 1).getDay(); return new Date(y, m, 1 + (dow - first + 7) % 7 + (n - 1) * 7); };
const lastDow = (y, m, dow) => { const d = new Date(y, m + 1, 0); d.setDate(d.getDate() - (d.getDay() - dow + 7) % 7); return d; };

export function holidayMap(win) {
  const out = {};
  const put = (d, name) => { const k = ymd(d); if (k >= win.start && k <= win.end && !out[k]) out[k] = name; };
  for (let y = +win.start.slice(0, 4); y <= +win.end.slice(0, 4); y++) {
    const thanks = nth(y, 10, 4, 4), memorial = lastDow(y, 4, 1);
    put(new Date(y, 0, 1), "New Year's Day"); put(nth(y, 0, 1, 3), 'MLK Day'); put(nth(y, 1, 1, 3), "Presidents' Day");
    put(memorial, 'Memorial Day'); put(new Date(y, 5, 19), 'Juneteenth'); put(new Date(y, 6, 4), 'Independence Day');
    put(nth(y, 8, 1, 1), 'Labor Day'); put(nth(y, 9, 1, 2), 'Columbus Day'); put(new Date(y, 10, 11), 'Veterans Day');
    put(thanks, 'Thanksgiving'); put(new Date(y, 11, 25), 'Christmas Day');
    put(new Date(y, 10, thanks.getDate() + 1), 'Family Day (sample)');
    put(new Date(y, 11, 26), 'Family Day (sample)');
    put(new Date(y, 4, memorial.getDate() - 3), 'Family Day (sample)');
  }
  return out;
}
