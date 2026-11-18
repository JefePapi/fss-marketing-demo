// Fixed lists and labels. Everything here is sample data for the demo.
export const VERSION = 1;
export const STORE_KEY = 'mktdemo.v1';

// SAMPLE RULE: the agency sets the real lead time. 60 calendar days before the event.
export const LEAD_DAYS = 60;

export const TEAMS = { design: 'Design', flash: 'Flash', sponsorship: 'Sponsorship', web: 'Web' };

// Today's site has one form layout per team; used for the "old way" contrast.
export const OLD_FORMS = {
  design: 'Design form', flash: 'Flash Inputs form',
  sponsorship: 'Commercial Sponsorship form', web: 'Webmaster Request form',
};

export const SERVICES = [
  { id: 'print', team: 'design', label: 'Flyers or posters (design and print)', short: 'Flyers or posters' },
  { id: 'social', team: 'design', label: 'Social media graphic', short: 'Social media graphic' },
  { id: 'screen', team: 'design', label: 'Screen ad', short: 'Screen ad', note: '1920 × 1080, we size it for you.' },
  { id: 'flash', team: 'flash', label: 'Flash magazine listing', short: 'Flash magazine listing', note: 'The editor will tell you which issue.' },
  { id: 'sponsorship', team: 'sponsorship', label: 'Help getting sponsors', short: 'Help getting sponsors' },
  { id: 'web', team: 'web', label: 'Website listing', short: 'Website listing' },
];
export const svc = id => SERVICES.find(s => s.id === id);

export const SIZES = ['A6', 'A5', 'A4', 'A3', 'A1'];
export const SOCIAL_KINDS = ['Event photo', 'Cover photo'];

// Section codes are illustrative only.
export const FACILITIES = [
  ['fitness', 'Fitness Center', 'FSVS'], ['community', 'Community Center', 'FSWC'],
  ['club', 'Club', 'FSWC'], ['library', 'Library', 'FSDL'],
  ['arts', 'Arts and Crafts', 'FSWT'], ['auto', 'Auto Hobby', 'FSWT'],
  ['outdoor', 'Outdoor Recreation', 'FSWO'], ['itt', 'Trips and Travel', 'FSWI'],
  ['bowling', 'Bowling Center', 'FSWB'], ['youth', 'Youth Programs', 'FSYP'],
  ['lodging', 'Lodging', 'FSH'], ['pet', 'Pet Lodge', 'FSWS'],
].map(([id, name, section]) => ({ id, name, section }));
let live = FACILITIES;
export const setActivities = list => { live = list; };
export const activities = () => live;
export const MANAGERS = [
  {id:'mgrA',name:'Avery Lane',label:'Manager A',demo:true},
  {id:'mgrB',name:'Bo Kim',label:'Manager B',demo:true},
  {id:'mgrC',name:'Cleo Park',label:'Manager C'},
  {id:'mgrD',name:'Dev Shah',label:'Manager D'},
];
export const facility = id => live.find(f => f.id === id) || { id, name: 'Unknown facility', section: '' };
export const eventArea = e => facility(e.facilityId).areas?.find(a=>a.id===e.areaId);
export const eventAreaName = e => eventArea(e)?.name || e.areaName || '';
export const eventFacilityName = e => [facility(e.facilityId).name,eventAreaName(e)].filter(Boolean).join(' — ');

// Fake staff.
export const STAFF = [
  { id: 'maya', name: 'Maya Chen', team: 'design' }, { id: 'taylor', name: 'Taylor Reed', team: 'design' },
  { id: 'priya', name: 'Priya Nair', team: 'flash' }, { id: 'marcus', name: 'Marcus Bell', team: 'sponsorship' },
  { id: 'lena', name: 'Lena Fischer', team: 'web' },
];
export const staffName = id => (STAFF.find(s => s.id === id) || { name: 'Unassigned' }).name;

export const JOB_STATUS = { new: 'New', inprogress: 'In progress', waiting: 'Waiting on requester', onhold: 'On hold', done: 'Done', declined: 'Declined' };
export const JOB_STATUS_REQ = { ...JOB_STATUS, new: 'Received', waiting: 'We need something from you' };
export const OVERALL = { withdrawn: 'Closed by requester', onhold: 'On hold', calonly: 'Calendar only', declined: 'Declined', complete: 'Complete', waiting: 'Waiting on requester', inprogress: 'In progress', new: 'New' };
export const OVERALL_REQ = { ...OVERALL, withdrawn: 'You closed this request', calonly: 'On the calendar', new: 'Received', waiting: 'We need something from you' };
export const CAL_STATUS = { notconfirmed: 'Not confirmed', good: 'Good to go', cancelled: 'Cancelled' };
export const EVENT_TYPES = ['', 'Wing', 'AFE', 'M3'];
export const AF_CONNECT = { yes: 'Yes', notyet: 'Not yet', no: 'No' };

// The Rolling Calendar sheet's 16 headers. Spelling and spacing kept on purpose
// ("DAY " has a trailing space, "CONNCET" is how the sheet spells it).
export const HEADERS = [
  'DATE', 'DAY ', 'TIME OF EVENT', 'DATE OF TICKET SUBMISSION', 'LATE REQUEST', 'EVENT OR PROGRAM',
  'LOCATION', 'SECTION', 'POC (Name, Phone)', 'JOINT EVENT?', 'EST. ATTENDANCE', 'ACTUAL ATTENDANCE',
  'SIGNED UP REQUIRED?', 'ON AF CONNCET APP?', 'SPONSORSHIP REQUESTED', 'Notes',
];
export const EXTRA_HEADERS = ['STATUS', 'TYPE', 'REQUEST #'];
export const SHEET_TITLE = '52d FSS Calendar of Events — DEMO SAMPLE DATA';
