import { h } from '../ui.js';

// Original two-ink poster cuts. All coordinates are fixed, decorative artwork.

function svgNode(tag, attrs) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

const cuts = {
  sheets: ['M12 7h62v65H12z M18 13v53h50V13z M27 23h32v5H27z M27 35h25v5H27z M80 20h6v64H25v-6h55z'],
  clock: ['M11 45a39 39 0 1 0 78 0a39 39 0 1 0-78 0 M17 45a33 33 0 1 1 66 0a33 33 0 1 1-66 0 M47 22h6v23l14 9-3 5-17-11z'],
  dates: ['M8 17h17V8h6v9h37V8h6v9h18v64H8z M14 37v38h72V37z M14 23v8h72v-8z M24 47h11v9H24z M43 47h11v9H43z'],
  bowl: [
    'M12 62a27 27 0 1 0 54 0a27 27 0 1 0-54 0 M26 47a3 3 0 1 1 6 0a3 3 0 1 1-6 0 M36 44a3 3 0 1 1 6 0a3 3 0 1 1-6 0 M31 55a3 3 0 1 1 6 0a3 3 0 1 1-6 0',
    'M61 10q2-9 9-6t2 12l-4 8-7-2z M60 25l7 2-1 4-8-2z M57 32l8 2q-4 11-1 22l-13 4q0-13 6-28 M80 22q3-9 9-5t0 13l-3 5-7-2z M78 36l7 2-1 4-8-2z M75 43l8 2q-4 11-2 20l-15 3q0-11 9-25',
  ],
  alpine: [
    'M1 75l33-43 11 10L66 9l33 67z M42 50l14-9 7 2 4-9 8 5-10-21z M17 62l15-8 3 3 4-9-6-8z',
    'M1 81l25-2 7 3 32-4 33 3v3H1z M4 23a12 12 0 1 0 24 0a12 12 0 1 0-24 0',
  ],
  record: [
    'M12 46a38 38 0 1 0 76 0a38 38 0 1 0-76 0 M35 46a15 15 0 1 1 30 0a15 15 0 1 1-30 0 M19 45a32 32 0 0 1 29-31v2a30 30 0 0 0-27 29z M25 46a26 26 0 0 1 23-26v2a24 24 0 0 0-21 24z M80 50a31 31 0 0 1-27 27v-2a29 29 0 0 0 25-25z',
    'M47 46a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M84 4l2 8 8 2-8 2-2 8-2-8-8-2 8-2z',
  ],
  track: [
    'M-6 77l48-59q14-16 30-7t7 23L43 83h-6l38-52q6-10-5-16T46 21L-2 81z M1 87l48-62q10-12 18-6t3 14L34 84h-6l39-54q3-5-2-7t-12 5L8 87z M13 88l44-59q5-6 7-3t-1 6L24 86z',
    'M65 76l9-12h23l-9 12z M78 58l4-5h14l-4 5z',
  ],
  pine: [
    'M-3 76l23-39-8 3 17-29 17 29-8-3 21 37-21-5v13H23V69z M46 71l16-29-6 2 15-27 16 27-6-2 17 29-20-5v12H66V66z',
    'M1 86l29-9 23 4 23-6 25 5v6z M47 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0',
  ],
  book: [
    'M7 22l39 13v43L7 65z M51 35l41-15v44L51 78z M12 17l32 10v4L12 21z M54 26l32-12v5L54 31z M14 32v3l24 8v-3z M14 41v3l18 6v-3z M60 40v3l23-8v-3z',
  ],
  flower: [
    'M50 33C22-12 14 25 36 41 1 28 3 59 34 53 7 78 35 92 45 62c-1 36 31 27 16-4 31 22 45-7 10-12 35-13 12-39-10-13 11-34-18-37-11 0z M44 48a8 8 0 1 1 16 0a8 8 0 1 1-16 0',
  ],
  globe: [
    'M12 44a38 38 0 1 0 76 0a38 38 0 1 0-76 0 M18 41q1-10 7-18l12 5-4 13z M20 54l-2-8h15l2 12-9 6z M35 21l-7-3 14-7z M38 40l3-12 8 1v11z M39 45h10v14l-9-1z M42 63l7 2v12z M54 11q7 5 10 14l-10 1z M54 30l12-2 3 13H54z M54 46h15l-2 11-13 3z M54 64l11-2-11 15z M72 41l-3-15 6-4q6 8 8 19z M71 57l2-11h10q-1 10-7 18z',
  ],
  spark: ['M50 1l6 23 18-15-7 23 24-4-17 16 23 8-24 5 14 20-23-9 1 23-15-20-14 20 1-24-24 10 15-20-25-5 23-8L9 28l25 4-8-23 18 15z M43 46a8 8 0 1 0 16 0a8 8 0 1 0-16 0'],
  tools: ['M21 9q-10 20 7 30l40 40q6 6 13-1t0-13L42 29Q48 8 31 6l4 14-8 5z M23 70l15-15 9 9-15 16q-6 6-11 0t2-10 M57 36l17-19 1-6 13-6 6 6-9 13-7 1-14 18z'],
  paw: ['M25 64q21-32 36-13l10 13q8 17-8 16l-13-4-14 4q-16 1-11-16z M14 36a8 11 -22 1 0 15-5a8 11 -22 1 0-15 5 M32 19a8 12 -12 1 0 16 0a8 12 -12 1 0-16 0 M54 19a8 12 18 1 0 15 4a8 12 18 1 0-15-4 M72 34a8 11 28 1 0 13 8a8 11 28 1 0-13-8'],
};

export function illustration(key) {
  const svg = svgNode('svg', {viewBox:'0 0 100 90', 'aria-hidden':'true', focusable:'false'});
  for (const d of cuts[key]) svg.append(svgNode('path', {d, fill:'currentColor', 'fill-rule':'evenodd'}));
  return svg;
}

const prints = [
  ['Library','book','paper'], ['Outdoor Recreation','pine','forest'], ['Trivia Night','spark','plum'],
  ['Spring Carnival','flower','citrus'], ['Club','record','ink'], ['Auto Hobby','tools','paper'],
  ['Fitness Center','track','ink'], ['Fall Fest 5K','track','fire'], ['Bowling Center','bowl','paper'],
  ['Ski Trip','alpine','ice'], ['Arts and Crafts','flower','plum'], ['Pet Lodge','paw','forest'],
  ['Community Center','globe','ice'], ['Trips and Travel','globe','ink'], ['Youth Programs','spark','forest'],
  ['Vinyl Night','record','fire'], ['Alpine Weekend','alpine','paper'], ['Trail Run','pine','citrus'],
];

let wallSeen = false;
function posterWall() {
  const className = wallSeen ? 'poster-wall seen' : 'poster-wall';
  wallSeen = true;
  return h('div', {class:className, 'aria-hidden':'true'}, prints.map(([title, key, ink]) =>
    h('div', {class:'poster '+ink+' print-'+key}, illustration(key), h('b',null,title))));
}

export function shortcutIcon(route) {
  const symbol = {other:'sheets', activities:'clock', calendar:'dates'}[route];
  return symbol && illustration(symbol);
}
export function shortcutArrow() {
  return h('span', {class:'route-arrow','aria-hidden':'true'}, '↗');
}

export function hero() {
  return h('section', {class:'hero'}, posterWall(),
      h('div', {class:'hero-copy'},
        h('p', {class:'eyebrow'}, 'Marketing for an event or program'),
        h('h1', {tabindex:'-1', 'aria-label':'What do you need?'}, '“What do', h('br'), 'you need?”'),
        h('p', {class:'lede'}, 'One request. We’ll send each part to the right team.'),
        h('div', {class:'hero-actions'},
          h('a', {class:'btn primary', href:'#/request', id:'start-request', 'data-test':'start-request',
            'aria-label':'Start a request — Marketing for an event or program. Flyers, social media, the Flash magazine, sponsors, the website and the calendar. Typed once.'},
            'Start a request', h('span', {'aria-hidden':'true'}, '→')),
          h('a', {class:'btn', href:'#/status', id:'go-status', title:'Use your request number.'}, 'Check on a request'))));
}

export function stepArt(step) {
  return h('div', {class:'step-print', 'aria-hidden':true},
    illustration(['bowl','alpine','flower','track'][step - 1]));
}

export function brand() {
  const mark = svgNode('svg', {viewBox:'0 0 32 32', width:30, height:30, 'aria-hidden':true, focusable:false});
  mark.append(svgNode('path', {fill:'currentColor', d:'M2 23 12 5h6L8 23z M12 27 22 9h6L18 27z M22 27l7-12v12z'}));
  return [mark, h('span', null, '52 FSS Marketing')];
}
