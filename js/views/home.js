import { h, page } from '../ui.js';

export function homeView() {
  return page(
    h('div', { class: 'surface' },
      h('h1', { tabindex: '-1' }, 'What do you need?'),
      h('p', { class: 'lede' }, 'One form for marketing help. We send each part to the right team.')),
    h('a', { class: 'bigcard', href: '#/request', id: 'start-request', 'data-test': 'start-request' },
      h('span', { class: 'bigcard-title' }, 'Marketing for an event or program'),
      h('span', { class: 'bigcard-sub' }, 'Flyers, social media, the Flash magazine, sponsors, the website and the calendar. Typed once.'),
      h('span', { class: 'btn primary', 'aria-hidden': 'true' }, 'Start a request')),
    h('div', { class: 'two' },
      h('a', { class: 'card link-card', href: '#/status', id: 'go-status' }, h('strong', null, 'Check on a request'), h('span', { class: 'sub' }, 'Use your request number.')),
      h('a', { class: 'card link-card', href: '#/calendar', id: 'go-calendar' }, h('strong', null, 'See the calendar'), h('span', { class: 'sub' }, 'The rolling 12 months.'))));
}

export function notFound(id, exampleHref) {
  return page(h('div', { class: 'surface stack', id: 'not-found', 'data-test': 'not-found' },
    h('h1', { tabindex: '-1' }, 'We could not find that number in this demo'),
    h('p', null, id ? `Nothing here is saved under ${id}. ` : '', 'Requests only live in the browser they were sent from.'),
    h('p', null, h('a', { class: 'btn', href: exampleHref }, 'Open the sample request'))));
}
