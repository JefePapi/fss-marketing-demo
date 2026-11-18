import { h } from '../ui.js';

export function hero() {
  return [
    h('div', { class: 'surface' },
      h('h1', { tabindex: '-1' }, 'What do you need?'),
      h('p', { class: 'lede' }, 'One form for marketing help. We send each part to the right team.')),
    h('a', { class: 'bigcard', href: '#/request', id: 'start-request', 'data-test': 'start-request' },
      h('span', { class: 'bigcard-title' }, 'Marketing for an event or program'),
      h('span', { class: 'bigcard-sub' }, 'Flyers, social media, the Flash magazine, sponsors, the website and the calendar. Typed once.'),
      h('span', { class: 'btn primary', 'aria-hidden': 'true' }, 'Start a request'))
  ];
}
