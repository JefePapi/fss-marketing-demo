import { h, page } from '../ui.js';
import { THEMES, currentTheme, setTheme, themeHero, themeIcon, themeArrow } from '../theme.js';

function designPicker() {
  const picker = h('section', { class:'design-picker', 'data-test':'theme-picker', 'aria-labelledby':'design-title' },
    h('h2', { id:'design-title' }, 'Choose a design'),
    h('div', { class:'design-options' }, THEMES.map(theme =>
      h('button', {
        type:'button', id:'design-' + theme.id, class:'design-option', 'data-test':'theme-option',
        'data-theme':theme.id, 'aria-pressed':String(currentTheme() === theme.id),
        onclick:() => setTheme(theme.id),
      },
      h('span', { class:'design-swatch' }, h('img', {
        src:theme.thumbnail, alt:'', width:320, height:180, onerror:e => { e.currentTarget.hidden = true; },
      })),
      h('strong', null, theme.label), h('small', null, theme.description)))));
  // Reveal the selected preview on narrow screens without scrolling the page.
  requestAnimationFrame(() => {
    const row = picker.querySelector('.design-options');
    if (row.scrollWidth <= row.clientWidth) return;
    const selected = row.querySelector('[aria-pressed=true]').getBoundingClientRect();
    const bounds = row.getBoundingClientRect();
    if (selected.right > bounds.right) row.scrollLeft += selected.right - bounds.right + 4;
  });
  return picker;
}

const shortcuts = [
  ['other','start-other',"Something that isn't an event",'A website change or a Flash magazine notice.'],
  ['activities','go-activities','Hours and info','Activity hours, closures and contact details (sample).'],
  ['status','go-status','Check on a request','Use your request number.'],
  ['calendar','go-calendar','See the calendar','The rolling 12 months.'],
];

function shortcut([route, id, title, description]) {
  const icon = themeIcon(route);
  return h('a', {id, href:'#/' + route, class:'card link-card shortcut entry'},
    icon && h('span', {class:'shortcut-icon entry-icon'}, icon),
    h('span', {class:'entry-copy'}, h('strong', null, title), h('small', {class:'sub'}, description)),
    themeArrow());
}

function guidance() {
  const ribbon = currentTheme() === 'c';
  return h('section', {id:'before-you-send', class:currentTheme() === 'current' ? 'surface guidance' : 'guidance'},
    h('div', {class:'guide-head'}, h('h2', null, 'Before you send'), h('small', null, 'Sample wording')),
    ribbon && h('p', {class:'lead-time'}, h('strong', null, '60'), ' ',
      h('span', null, 'days ahead', h('small', null, 'to send your event request'))),
    h('ul', null, !ribbon && h('li', null, 'Send events ', h('strong', null, '60 days ahead.')),
      h('li', null, 'One round of changes to a proof.'), h('li', null, 'The point of contact approves the final design.')));
}

export function homeView(ctx) {
  const hero = themeHero(ctx) || [
    h('h1', {tabindex:-1}, 'What do you need?'),
    h('a', {id:'start-request', 'data-test':'start-request', class:'btn primary', href:'#/request'}, 'Start a request'),
  ];
  // Night Wall puts the status shortcut next to its primary action.
  const statusInHero = !Array.isArray(hero) && hero.querySelector('#go-status');
  const links = shortcuts.filter(([route]) => route !== 'status' || !statusInHero);
  return page(hero, designPicker(),
    h('div', {class:'home-lower'},
      h('section', {class:'home-links destinations'},
        h('h2', null, currentTheme() === 'b' ? 'Quick access' : 'Quick links'),
        h('div', {class:'shortcut-grid entry-grid'}, links.map(shortcut))),
      guidance()));
}

export function notFound(id, exampleHref) {
  return page(h('div', { class: 'surface stack', id: 'not-found', 'data-test': 'not-found' },
    h('h1', { tabindex: '-1' }, 'We could not find that number in this demo'),
    h('p', null, id ? `Nothing here is saved under ${id}. ` : '', 'Requests only live in the browser they were sent from.'),
    h('p', null, h('a', { class: 'btn', href: exampleHref }, 'Open the sample request'))));
}
