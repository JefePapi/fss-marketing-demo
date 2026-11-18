import { h } from '../ui.js';

// Original ribbon geometry. Each face has two cubic edges. Interpolating between
// them draws fine longitudinal grooves that turn with the sheet.
const ns = 'http://www.w3.org/2000/svg';
function svg(tag, attrs, ...children) {
  const node = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  node.append(...children);
  return node;
}
const decorative = { 'aria-hidden': 'true', focusable: 'false' };
const paths = {
  edit: 'M13 4H5v16h14v-8 M13 4v6h6 M13 4l6 6',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0 M12 7v5l4 2',
  status: 'M15 5H5v15h14v-8 M8 12l3 3 9-10',
  calendar: 'M3 6h18v15H3z M7 3v6 M17 3v6 M3 11h18 M7 15h2 M12 15h2',
  arrow: 'M4 12h15 M13 6l6 6-6 6',
  corner: 'M5 19 18 6 M7 6h11v11',
  sliders: 'M3 7h7m4 0h7M3 17h11m4 0h3 M10 4v6 M15 14v6',
};
export function icon(name) {
  return svg('svg', { ...decorative, viewBox: '0 0 24 24', width: 22, height: 22, fill: 'none',
    stroke: 'currentColor', 'stroke-width': 1.75, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
  svg('path', { d: paths[name] }));
}

export function ribbon(prefix) {
  const id = name => prefix + '-' + name;
  const paint = name => 'url(#' + id(name) + ')';
  const grad = (name, stops, vertical = false) => svg('linearGradient',
    { id: id(name), x2: vertical ? '12%' : '100%', y2: vertical ? '100%' : '8%' },
    ...stops.map(([offset, color, opacity = 1]) => svg('stop', { offset, 'stop-color': color, 'stop-opacity': opacity })));
  const defs = svg('defs', {},
    grad('silk', [[0,'#152b96'],[.18,'#2344ff'],[.37,'#487bff'],[.49,'#b9e7ff'],[.61,'#3875f1'],[.78,'#1375b2'],[1,'#133973']]),
    grad('turn', [[0,'#143eaa'],[.28,'#245eb8'],[.5,'#79c5ea'],[.64,'#d2f4ff'],[.76,'#59c8dd'],[1,'#21779e']], true),
    grad('teal', [[0,'#19628f'],[.22,'#078cba'],[.44,'#04cdce'],[.61,'#beffff'],[.75,'#31d1cf'],[1,'#00858f']]),
    grad('pane', [[0,'#bfe2ff',.21],[.48,'#b5d9fe',.04],[.85,'#9ad8ff',.12],[1,'#a4faef',.28]],true),
    grad('rim', [[0,'#e3f7ff'],[.26,'#739ac3'],[.52,'#e9feff'],[.78,'#7d9faf'],[1,'#b0f8ff']]));
  const face = (name, a, b) => {
    const curve = v => 'M' + v.slice(0,2).join(' ') + 'C' + v.slice(2).join(' ');
    const d = curve(a) + 'L' + b.slice(6).join(' ') + 'C' + [...b.slice(4,6), ...b.slice(2,4), ...b.slice(0,2)].join(' ') + 'Z';
    const g = svg('g', {}, svg('path', { d, fill: paint(name) }));
    for (let k = 0; k <= 22; k++) {
      const t = k / 22;
      const line = a.map((v,i) => +(v * (1-t) + b[i] * t).toFixed(2));
      g.append(svg('path', { d: curve(line), fill: 'none', stroke: k % 3 ? '#e6ffff' : '#052f82',
        'stroke-width': k === 0 || k === 22 ? 1.5 : .7, opacity: k % 3 ? .53 : .26 }));
    }
    return g;
  };
  const sheet = svg('g', { id: id('sheet') },
    face('turn', [334,87,491,0,400,308,555,266], [408,54,558,-22,486,253,638,221]),
    face('silk', [-126,157,72,344,175,161,334,87], [-126,295,95,428,227,148,408,54]),
    face('teal', [555,266,676,234,716,44,962,4], [638,221,754,218,806,118,962,132]));
  const paneShape = 'M248 91Q244 73 261 68L548 3Q566 -1 570 17L626 268Q630 286 612 290L327 356Q309 360 305 342Z';
  defs.append(sheet, svg('clipPath', { id: id('clip') }, svg('path', { d: paneShape })));
  const use = attrs => svg('use', { href: '#' + id('sheet'), ...attrs });
  return svg('svg', { ...decorative, class: 'ribbon', viewBox: '0 0 850 370', preserveAspectRatio: 'xMidYMid slice' },
    defs, use({}), svg('path', { d: paneShape, transform: 'translate(3 5)', fill: 'none', stroke: '#456a89', 'stroke-width': 5 }),
    svg('g', { 'clip-path': paint('clip') }, svg('path', { d: paneShape, fill: '#102843', opacity: .8 }), use({ transform: 'translate(8 -5)' }), svg('path', { d: paneShape, fill: paint('pane') })),
    svg('path', { d: paneShape, fill: 'none', stroke: paint('rim'), 'stroke-width': 3 }),
    svg('path', { d: paneShape, transform: 'translate(5 4) scale(.986 .98)', fill: 'none', stroke: '#f5fdff', opacity: .6 }));
}

export const shortcutIcon = route => icon({other:'edit',activities:'clock'}[route] || route);
export const shortcutArrow = () => icon('corner');

export function hero() {
  return h('section', { class: 'hero' },
      h('div', { class: 'hero-copy' }, h('p', { class: 'kicker' }, 'Marketing requests'),
        h('h1', { tabindex: -1 }, 'What are you ', h('em', null, 'planning?')),
        h('p', { class: 'lede' }, 'One request covers flyers, the website, Flash magazine and more.'),
        h('a', { class: 'btn primary', href: '#/request', id: 'start-request', 'data-test': 'start-request' },
          'Start a request', icon('arrow'))),
      h('div', { class: 'hero-art', 'aria-hidden':'true' }, ribbon('arrival')));
}

export function stepArt() {
  return h('div', {class:'step-art', 'aria-hidden':true}, ribbon('progress'));
}

export function brand() {
  const mark = svg('svg', {viewBox:'0 0 32 32', width:30, height:30, 'aria-hidden':true, focusable:false});
  for (const [d,fill] of [['M1 23 10 7h7L8 23Z','#82abff'], ['m10 7 8 18h7L17 7Z','#eef9ff'], ['m18 25 9-17h5l-7 17Z','#57dedb']]) {
    mark.append(svg('path', {d, fill}));
  }
  return [mark, h('span', null, '52 FSS Marketing')];
}
