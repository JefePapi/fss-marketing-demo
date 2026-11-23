import { limits } from '../files.js';
import { CAL_STATUS, FACILITIES, LEAD_DAYS, SERVICES } from '../config.js';
import { DAYS, MONTHS } from '../model.js';
import { buildActivities, buildSeeds, holidayMap } from '../seed.js';

// Only public views with a known route can provide a capture.
const PUBLIC = new Set(['', 'request', 'other', 'status', 'calendar', 'activities', 'about']);
export const DESIGNS = new Set(['a', 'a-light', 'b', 'c', 'current']);

export function captureRoute(parts, {staff = false, detail = false} = {}) {
  const [page = ''] = parts;
  if (staff || page === 'staff' || page === 'manager') return 'staff-view';
  if (detail || page === 'sent' || (['status', 'activities'].includes(page) && parts.length > 1))
    return 'record-detail';
  if (parts.length > 1 || !PUBLIC.has(page)) return 'misleading-preview';
  return null;
}

export const messages = {
  'staff-view': 'Page capture is unavailable in Staff view.',
  'record-detail': 'Page capture is unavailable for individual records.',
  'misleading-preview': 'This page could not be captured accurately.',
  'no-snapshot': 'Open Feedback to capture this page.',
};

const shell = new Set([
  'Demo', '— sample data', 'Design:', 'Feedback', 'Marketing Department', '52 FSS Marketing',
  'Home', 'Request', 'Activities', 'Calendar', 'Calendar · read-only', 'Staff view (demo)',
  'Unofficial prototype for 52 FSS Marketing review. Not an official Air Force or government site.',
  'Changes will not be kept after you close this page.', 'About this demo', 'Pause motion', 'Play motion',
]);

const labels = {
  home: [
    'What do you need?', 'Start a request', 'Choose a design', 'Quick access', 'Quick links',
    'Night Wall', 'Night Wall Light', 'Mission Control', 'Ribbon Glass', 'Current (liquid glass)',
    'Bold event posters.', 'Posters on warm paper.', 'Live stats and terrain.', 'Ribbons and frosted glass.',
    'Sky-blue glass panels.', "Something that isn't an event", 'A website change or a Flash magazine notice.',
    'Hours and info', 'Activity hours, closures and contact details (sample).', 'Check on a request',
    'Use your request number.', 'See the calendar', 'The rolling 12 months.', 'Before you send', 'Sample wording',
    'Send events', '60 days ahead.', '60', 'days ahead', 'to send your event request',
    'One round of changes to a proof.', 'The point of contact approves the final design.',
    'Marketing requests', 'What are you', 'planning?', 'One request covers flyers, the website, Flash magazine and more.',
    'One form for marketing help. We send each part to the right team.', 'Marketing for an event or program',
    'Flyers, social media, the Flash magazine, sponsors, the website and the calendar. Typed once.',
    'Mission Control / Marketing', 'Flyers, social media, sponsors and more. One request reaches every team you need.',
    '“What do', 'you need?”', 'One request. We’ll send each part to the right team.', '→', '↗',
  ],
  other: [
    "Something that isn't an event", 'Demo: use made-up details. Nothing leaves this browser.',
    'A change to the website', 'A notice for the Flash magazine', 'Your name', 'Your email',
    'Your phone (optional; leave blank in the demo)', 'Title', 'What do you need?', 'Page address',
    'Old text', 'New text', 'Add pictures or files (optional)', 'Files stay in this browser only.',
    'Send request', limits,
  ],
  request: [
    'About you', 'About the event', 'What do you need from Marketing?', 'Check and send', 'You', 'Event',
    'Services', 'Review', 'Step 1 of 4', 'Step 2 of 4', 'Step 3 of 4', 'Step 4 of 4', '1', '2', '3', '4', '✓',
    'Demo: please use made-up details. Nothing you type leaves this browser.', 'Fill with sample answers',
    'Your name', 'Your email', 'Also send updates to (optional)', 'Comma-separated, up to 5 emails.',
    'Remember my details on this device', 'Your phone (optional)', 'Cancel', 'Back', 'Continue', 'Send request',
    'Which facility or activity?', 'Which area? (optional)', 'What is it called?', 'What is happening?',
    'A few sentences is plenty.', 'What day is it?', 'Ends on', 'Starts', 'Ends (optional)', 'Where exactly?',
    'What does it cost the customer?', '"Free" is fine.', 'How many people do you expect? (optional)',
    'Tap any that you need', 'Just put it on the calendar', 'No work for Marketing. Unticks the others.',
    'Add pictures or files (optional)', limits, 'Files stay in this browser only.', 'What you asked for', 'Edit', 'One request. We send each part to the right team.',
  ],
  status: ['Check on a request', 'Your request number', 'Your email', 'Check status', 'Try the sample request',
    'Forgot your number?', 'Find my requests'],
  calendar: ['Rolling calendar', 'Read-only', 'Month', 'List', 'Download', 'Copy link for Teams', 'Section',
    'Service', 'Status', 'Clear filters', '‹ Prev', 'Next ›', 'Calendar only', 'Tap a day to see its events.',
    'Nothing on this day.', 'No events.', 'No events match these filters.', ...SERVICES.map(s => s.short),
    ...Object.values(CAL_STATUS),
    'Demo: this calendar shows sample events, plus anything added in this browser. In the real system, everyone would see the same live calendar.'],
  activities: ['Activities', 'Demo: made-up hours and contact details.'],
  about: [
    'About this demo', 'What is fake', 'Where the data lives', 'Not in this demo', 'Start over', 'Reset demo data',
    'This is an unofficial prototype for 52 FSS Marketing review. It is not an official Air Force or government site. It shows how one request could replace several forms and fill the rolling calendar by itself.',
    'Every event, name and email is made up. The emails end in @example.com.',
    'Staff view has no login. It is a switch so you can see both sides.',
    `The lead-time note uses a sample rule: ${LEAD_DAYS} calendar days before the event. The agency sets the real rule.`,
    'Managers, hours and notifications are made up. The role switch is not a login.',
    'Section codes are for illustration only.',
    'Saving feedback keeps a browser copy and tries to send it privately to Marketing. You can also open a public GitHub issue draft.',
    'Marketing requests stay in this browser. A request sent on one phone does not show on another computer.',
    'The read-only calendar link is a display mode for the demo, not security. It shows the sample events plus whatever that browser added.',
    'Clearing browser data, or the Reset button below, returns to the samples.',
    "This demo shows how it would work. A real version stores requests on a server so everyone sees the same calendar; that is the part that needs the agency's hosting answer.",
    'This browser is blocking storage. Changes will not be kept after you close this page.',
    'Real email, file uploads, accounts, website-change-only requests, repeating events, proofing rounds, hiding money fields, account administration and shared data between visitors are left out on purpose. A gap here is not a decision about the real system.',
  ],
};
for (const page in labels) labels[page] = new Set(labels[page]);

// These slots only produce fixed UI copy. Everything else is masked even if
// its value happens to match a label, including results and record summaries.
const labelSlots = {
  home: '.hero-copy, .route-home > .glass > .surface, #start-request, .design-picker, .home-lower',
  other: 'form > :is(h1,.note,.choice,button), .field > label, #file-limits, #o-files ~ .hint',
  request: '.step-head, .tray, form > :is(button,.choice), .field > :is(label,.hint), ' +
    '.choices legend, .choicebox:last-of-type label, #step-4 :is(h2,dt,.link)',
  status: 'form > :is(h1,button,#status-example), section > :is(h2,button), .field > label',
  calendar: '.route-calendar > .glass > .surface > :is(h1,#calendar-note), .tabs, #filters :is(.flabel,.fchip,label), ' +
    '#copy-link, #download-toggle, #filter-clear, #month-prev, #month-next, #agenda > p, ' +
    '#calendar-body :is(.btn.off,.tapnote,.pill,p.sub)',
  activities: '.route-activities > .glass > :is(h1,p.note)',
  about: '.route-about > .glass > .surface > :is(h1,h2,p,#reset-demo), .route-about > .glass > .surface > ul > li',
};

const weekdays = DAYS.map(day => day.slice(0, 3));
const shortMonths = MONTHS.map(month => month.slice(0, 3));
const holidays = new Set(Object.values(holidayMap({start:'2026-01-01',end:'2026-12-31'})));
const facilityNames = new Set(FACILITIES.map(item => item.name));
let eventTitles, areaNames;
const hours = /^(?:Closed|\d{2}:\d{2}–\d{2}:\d{2}(?:, \d{2}:\d{2}–\d{2}:\d{2})*)$/;

function calendarLabel(element, text) {
  if (element.matches('#calendar-body :is(#month-title,.month-banner)'))
    return MONTHS.includes(text.split(' ')[0]) && /^[A-Za-z]+ \d{4}$/.test(text);
  if (element.matches('#calendar-body .monthstrip > .mon'))
    return shortMonths.includes(text.split(' ')[0]) && /^[A-Za-z]+(?: \d{2})?$/.test(text);
  if (element.matches('#month-head > span')) return weekdays.includes(text);
  if (element.matches('#month-grid .dnum')) return /^(?:[1-9]|[12]\d|3[01])$/.test(text);
  if (element.matches('#month-grid .dots')) return /^\d{1,3}$/.test(text);
  if (element.matches('#month-grid .more')) return /^\+\d{1,3} more$/.test(text);
  if (element.matches('#calendar-body :is(.holname,.holtag,.holrow)')) return holidays.has(text);
  if (element.matches('#calendar-body :is(.evchip,.evrow .title)')) {
    eventTitles ??= new Set(buildSeeds().map(({event}) => event.title));
    return eventTitles.has(text);
  }
  if (element.matches('#calendar-body :is(.evchip > .t,.evrow .when > .sub)'))
    return /^(?:All day|Time not set|\d{4}(?:–\d{4})?)$/.test(text);
  if (element.matches('#calendar-body :is(.evrow .when,.holrow) > strong')) {
    const [day, number, month] = text.split(' ');
    return weekdays.includes(day) && /^(?:[1-9]|[12]\d|3[01])$/.test(number) &&
      shortMonths.includes(month) && text === `${day} ${number} ${month}`;
  }
  return false;
}

function activityLabel(element, text) {
  const [name] = text.split(' · ');
  if (element.matches('[data-test=activity-card] > strong'))
    return facilityNames.has(name) && (text === name || /^.+ · \d{1,2} areas?$/.test(text));
  if (element.matches('[data-test=activity-card] > span') && text.startsWith('Today: '))
    return hours.test(text.slice(7));
  if (element.matches('[data-test=activity-card] > [data-test=list-area]')) {
    areaNames ??= new Set(buildActivities().flatMap(({areas}) => areas.map(({name}) => name)));
    const [area, status] = text.split(' — ');
    return areaNames.has(area) && (status === 'Closed today' && text === area + ' — ' + status ||
      text.startsWith(area + ' — Open today ') && hours.test(text.slice(area.length + 14)));
  }
  return false;
}

export function approvedLabel(element, page, text) {
  if (!element.closest('#app'))
    return shell.has(text) && !!element.closest('#demo-banner,.site-head,#site-footer,#feedback-open');
  if (page === 'calendar' && calendarLabel(element, text)) return true;
  if (page === 'activities' && activityLabel(element, text)) return true;
  if (!page && element.matches('.hero.hud h1 > .prompt')) return text === '>';
  if (!page && element.matches('.hero.hud h1 > .type-line > .glyph')) {
    const line = element.parentElement;
    return text.length === 1 && line.textContent === (line.previousElementSibling?.matches('.prompt') ? 'What do' : 'you need?');
  }
  const view = page || 'home';
  return labels[view]?.has(text) && !!element.closest(labelSlots[view]);
}
