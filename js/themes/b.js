import { h } from '../ui.js';
import { activities } from '../config.js';
import { calendarEvents, calWindow, fmtDay, overallStatus, ymd } from '../model.js';
import { hoursOn } from '../hours.js';
import { requests } from '../store.js';

// Local, decorative line art. All coordinates and paths are generated here.
const ns = 'http://www.w3.org/2000/svg';
function svg(tag, attrs) {
  const node = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}
const paths = {
  status: 'M4 5h12v6 M4 5v15h7 M7 9h5 M7 13h3 M20 16a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M19 19l3 3',
  activities: 'M3 20l6-12 4 7 3-5 5 10z M15 5h4 M17 3v4',
  calendar: 'M3 5h18v16H3z M7 3v5 M17 3v5 M3 10h18 M7 14h3 M13 14h3 M7 17h3',
  flash: 'M4 4h16v16H4z M7 8h10 M7 12h4v5H7z M14 12h3 M14 16h3',
  design: 'M4 20l2-7L16 3l5 5-10 10z M13 6l5 5 M6 13l5 5',
  sponsorship: 'M2 9l5-4 5 2 5-2 5 4-7 10-3-1-3 1z M12 7l-4 5 3 2 4-4',
  web: 'M2 4h20v16H2z M2 9h20 M6 6.5h1 M10 6.5h1',
  arrow: 'M4 12h15 M13 6l6 6-6 6',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z M12 6v6l4 2',
  layers: 'M2 7l10-5 10 5-10 5z M2 12l10 5 10-5 M2 17l10 5 10-5',
};
export function icon(key) {
  const el = svg('svg', { viewBox:'0 0 24 24', width:24, height:24, fill:'none', stroke:'currentColor',
    'stroke-width':2, 'stroke-linejoin':'round', 'stroke-linecap':'round', 'aria-hidden':true, focusable:false });
  el.append(svg('path', {d:paths[key]}));
  return el;
}

// An oblique survey grid with three ridges. One path per depth slice.
export function terrain() {
  const el = svg('svg', {viewBox:'0 0 600 360', class:'terrain', 'aria-hidden':true, focusable:false});
  const ground = (x,z) => {
    const ridge = (cx,cz,height,spread) => Math.max(0, 1-Math.hypot(x-cx,(z-cz)*1.24)/spread)*height;
    const peak = Math.max(ridge(0.64,0.55,220,0.48),ridge(0.28,0.34,123,0.31),ridge(0.85,0.30,91,0.28));
    const rough = 1+0.09*Math.sin(35*x+12*z)+0.055*Math.cos(41*z-14*x);
    return [(x*479+(1-z)*98+10).toFixed(1),(122+z*196-peak*rough+x*24).toFixed(1)];
  };
  for(let z=0; z<=32; z++) {
    const points = Array.from({length:47},(_,i)=>ground(i/46,z/32).join(','));
    const d = 'M'+points.join(' L');
    el.append(svg('path',{d:d+' V360 H0 Z',fill:'#0c1529'}));
    el.append(svg('path',{d,fill:'none',stroke:z<18?'#768ee7':'#40cadc','stroke-width':1.2}));
    if(z<32) {
      const wires = Array.from({length:47},(_,i)=>'M'+points[i]+' L'+ground(i/46,(z+1)/32)).join(' ');
      el.append(svg('path',{d:wires,fill:'none',stroke:'#506e9c','stroke-width':0.8}));
    }
  }
  return el;
}

export const shortcutIcon = route => icon(route === 'other' ? 'flash' : route);
export const shortcutArrow = () => icon('arrow');

function metric(label, value, total, symbol) {
  return h('div', {class:'metric'}, h('dt', null, icon(symbol), label),
    h('dd', null, value, h('small',null,' / '+total),
      h('progress', {value, max:Math.max(1,total), 'aria-hidden':true})));
}

let introPlayed = false;
function titleLine(line, offset) {
  return h('span', {class:'type-line', 'aria-hidden':true}, [...line].map((letter,i)=>{
    const node = h('span', {class:'glyph'}, letter);
    node.style.animationDelay = (offset+i)*19+'ms';
    return node;
  }), offset>0 && h('i',{class:'caret'}));
}

export function hero({now}) {
  const today = ymd(now);
  const records = requests().filter(r=>!r.mergedInto);
  const calendar = calendarEvents(records,calWindow(now)).filter(e=>e.status!=='cancelled');
  const events = calendar.filter(e=>e.date>=today);
  const next = events[0];
  const open = records.filter(r => ['new','inprogress','waiting','onhold'].includes(overallStatus(r)));
  const facilities = activities().filter(a=>!a.archived);
  const active = facilities.filter(a=>!hoursOn(a.info,today).closed);
  const headline = h('h1', {tabindex:-1, 'aria-label':'What do you need?', class:introPlayed?'':'intro'},
    h('span', {class:'prompt', 'aria-hidden':true}, '>'), titleLine('What do',0),titleLine('you need?',8));
  introPlayed = true;
  return h('div', {class:'home-top'},
      h('section', {class:'hero hud'}, h('div', {class:'survey'}, terrain()),
        h('div', {class:'hero-copy'}, h('p', {class:'eyebrow'}, 'Mission Control / Marketing'), headline,
          h('p', {class:'lede'}, 'Flyers, social media, sponsors and more. One request reaches every team you need.'),
          h('a', {class:'launch', href:'#/request', id:'start-request', 'data-test':'start-request',
            'aria-label':'Start a request. Marketing for an event or program Flyers, social media, the Flash magazine, sponsors, the website and the calendar. Typed once.'},
            h('span', null, 'Start a request', icon('arrow'))))),
      h('section', {class:'overview'}, h('div', {class:'section-head'}, h('h2',null,'Activity overview'),
        h('time', {dateTime:today}, fmtDay(today))),
        h('dl', {class:'metrics'}, metric('Open requests',open.length,records.length,'layers'), metric('Activities open today',active.length,facilities.length,'activities'),
          metric('Upcoming events',new Set(events.map(e=>e.id)).size,new Set(calendar.map(e=>e.id)).size,'calendar'),
          h('div', {class:'metric next-event'}, h('dt',null,icon('clock'),'Next on the calendar'),
            h('dd',null,next ? next.title : 'No upcoming event', next && h('small',null,fmtDay(next.date)))))));
}

export function brand() {
  const mark = svg('svg', {viewBox:'0 0 32 32', width:30, height:30, 'aria-hidden':true, focusable:false});
  mark.append(svg('circle', {cx:16, cy:16, r:13, fill:'none', stroke:'currentColor', 'stroke-width':2}),
    svg('path', {d:'M22 10 18 18 10 22 14 14Z', fill:'currentColor'}));
  return [mark, h('span', null, '52 FSS Marketing')];
}
