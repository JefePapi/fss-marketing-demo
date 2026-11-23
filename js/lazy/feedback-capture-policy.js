import { limits } from '../files.js';

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
    'Service', 'Status', 'Clear filters', '‹ Prev', 'Next ›',
    'Demo: this calendar shows sample events, plus anything added in this browser. In the real system, everyone would see the same live calendar.'],
  activities: ['Activities'],
  about: ['About this demo', 'What is fake', 'Where the data lives', 'Not in this demo', 'Start over', 'Reset demo data'],
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
  calendar: '.route-calendar > .glass > .surface > :is(h1,#calendar-note), .tabs, #filters :is(.flabel,label), ' +
    '#copy-link, #download-toggle, #filter-clear, #month-prev, #month-next',
  activities: '.route-activities > .glass > h1',
  about: '.route-about > .glass > .surface > :is(h1,h2,#reset-demo)',
};

export function approvedLabel(element, page, text) {
  if (element.closest('#app')) return labels[page === '' ? 'home' : page]?.has(text) &&
    !!element.closest(labelSlots[page === '' ? 'home' : page]);
  return shell.has(text) && !!element.closest('#demo-banner,.site-head,#site-footer,#feedback-open');
}
