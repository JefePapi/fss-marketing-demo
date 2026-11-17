import { h, page } from '../ui.js';
import { LEAD_DAYS } from '../config.js';
import * as store from '../store.js';

export function aboutView(ctx) {
  const li = (...t) => h('li', null, t);
  return page(
    h('div', { class: 'surface stack' },
      h('h1', { tabindex: '-1' }, 'About this demo'),
      h('p', null, 'This is an unofficial prototype for 52 FSS Marketing review. It is not an official Air Force or government site. It shows how one request could replace several forms and fill the rolling calendar by itself.')),
    h('div', { class: 'surface stack' },
      h('h2', null, 'What is fake'),
      h('ul', null,
        li('Every event, name and email is made up. The emails end in @example.com.'),
        li('Staff view has no login. It is a switch so you can see both sides.'),
        li(`The lead-time note uses a sample rule: ${LEAD_DAYS} calendar days before the event. The agency sets the real rule.`),
        li('Section codes are for illustration only.'),
        li('No email is sent. Nothing you type leaves this browser.'))),
    h('div', { class: 'surface stack' },
      h('h2', null, 'Where the data lives'),
      h('ul', null,
        li('In this browser only. A request sent on one phone does not show on another computer.'),
        li('The read-only calendar link is a display mode for the demo, not security. It shows the sample events plus whatever that browser added.'),
        li('Clearing browser data, or the Reset button below, returns to the samples.')),
      h('p', null, 'This demo shows how it would work. A real version stores requests on a server so everyone sees the same calendar; that is the part that needs the agency\'s hosting answer.'),
      store.memoryOnly() && h('p', { class: 'note warn' }, 'This browser is blocking storage. Changes will not be kept after you close this page.')),
    h('div', { class: 'surface stack' },
      h('h2', null, 'Not in this demo'),
      h('p', null, 'Real email, file uploads, accounts, website-change-only requests, repeating events, proofing rounds, hiding money fields, admin screens, shared data between visitors and dark mode are left out on purpose. A gap here is not a decision about the real system.')),
    h('div', { class: 'surface stack' },
      h('h2', null, 'Start over'),
      h('p', null, `${store.requests().length} requests are saved in this browser.`),
      h('button', { class: 'btn', type: 'button', id: 'reset-demo', 'data-test': 'reset-demo', onclick: e => ctx.resetDemo(e.target) }, 'Reset demo data')));
}
