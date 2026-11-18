import { h, field, openSheet, chips, toast } from '../ui.js';
import { feedbackEntries, writeFeedback, feedbackTemporary, withFeedbackLock } from '../store.js';
import { TYPES, buildEntry, prependEntry, issueURL } from './feedback-model.js';
import { postFeedback, relayResult, feedbackCheck } from './feedback-relay.js';

const BACKENDS = {
  local: entry => withFeedbackLock(() => writeFeedback(prependEntry(feedbackEntries(), entry))),
  relay: postFeedback,
};

const attempts = new Map();
export function deliverFeedback(id, token, allowed = () => true) {
  // Browsers without Web Locks can still share an in-flight send in this tab.
  if (attempts.has(id)) return attempts.get(id);
  const attempt = sendStored(id, token, allowed).finally(() => attempts.delete(id));
  attempts.set(id, attempt);
  return attempt;
}

function sendStored(id, token, allowed) {
  // Serialize sends for the same entry across tabs, without holding the inbox
  // write lock during a slow POST. Re-read before updating so reads/deletes win.
  return withFeedbackLock(async () => {
    const entry = feedbackEntries().find(e => e.id === id);
    if (!entry || !allowed()) return relayResult(0);
    if (entry.delivery === 'sent') return relayResult(201, {ok:true, number:entry.issue});
    const result = await BACKENDS.relay(entry, token);
    if (result.delivery === 'sent' || !entry.delivery) await withFeedbackLock(() => {
      const entries = feedbackEntries();
      if (entries.some(e => e.id === id)) writeFeedback(entries.map(e => e.id === id
        ? {...e, delivery:result.delivery, issue:result.issue} : e));
    });
    return result;
  }, 'mktdemo.feedback.send.' + id);
}

export async function submitFeedback(entry, token) {
  await BACKENDS.local(entry);
  return deliverFeedback(entry.id, token);
}

export function feedbackStyles() {
  if (!document.getElementById('feedback-css'))
    document.head.append(h('link', {id:'feedback-css', rel:'stylesheet', href:'./css/feedback.css'}));
}

export const memoryNote = 'Browser storage is unavailable. Feedback changes last only until this page closes.';
export function githubAction(entry) {
  return h('div', {class:'feedback-share'},
    h('a', {class:'btn', href:issueURL(entry), target:'_blank', rel:'noopener noreferrer'}, 'Also post to GitHub'),
    h('p', {class:'hint'}, 'Opens GitHub in a new tab. You need a GitHub account; the post is public.'));
}

export function openFeedback(opener) {
  feedbackStyles();
  const body = h('div', {class:'feedback-body'});
  const route = location.hash || '#/';
  const page = document.querySelector('#app h1')?.innerText.replace(/\s+/g, ' ').trim() || document.title;

  let check;
  function compose() {
    check = feedbackCheck();
    let type = TYPES[0];
    const theme = document.documentElement.dataset.theme;
    const count = h('span', {id:'feedback-length', class:'hint', 'aria-live':'polite'}, '0 / 2000');
    const error = h('p', {id:'feedback-error', class:'err', role:'alert', hidden:true});
    const message = h('textarea', {id:'feedback-message', required:true, maxlength:2000, rows:4,
      'aria-describedby':'feedback-length feedback-error', oninput:() => {
        count.textContent = message.value.length + ' / 2000';
        if (message.value.trim()) {
          message.removeAttribute('aria-invalid');
          error.hidden = true;
        }
      }});
    const name = h('input', {id:'feedback-name', maxlength:60, autocomplete:'off'});
    const types = chips('feedback-type', 'Type', TYPES.map(t => [t,t]), type, value => { type = value; });
    types.querySelector('input').required = true;
    const save = h('button', {type:'submit', class:'btn primary'}, 'Save feedback');
    const form = h('form', {class:'feedback-form', novalidate:true, onsubmit:async event => {
      event.preventDefault();
      if (save.disabled) return;
      if (!message.value.trim()) {
        error.textContent = 'Enter a message.';
        error.hidden = false;
        message.setAttribute('aria-invalid', 'true');
        message.focus();
        return;
      }
      save.disabled = true;
      save.setAttribute('aria-busy', 'true');
      try {
        const id = Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8,'0')).join('');
        const entry = buildEntry({type, message:message.value, name:name.value,
          page, route, theme}, id, new Date().toISOString());
        const result = await submitFeedback(entry, check.token());
        if (!body.isConnected) return;
        check.remove();
        const thanks = h('h3', {tabindex:-1, 'aria-describedby':'feedback-delivery'}, 'Thanks — your feedback is saved in this demo.');
        body.replaceChildren(h('section', {class:'feedback-done'}, thanks,
          h('p', {id:'feedback-delivery', class:'feedback-status', role:'status', 'aria-live':'polite'}, result.text),
          feedbackTemporary() && h('p', {class:'note warn'}, memoryNote), githubAction(entry),
          h('button', {class:'btn', type:'button', onclick:compose}, 'Send another')));
        thanks.focus();
      } catch {
        save.disabled = false;
        save.removeAttribute('aria-busy');
        toast('Could not save feedback. Try again.');
      }
    }}, types, field(message.id, 'Message', message), count, error, field(name.id, 'Name (optional)', name),
      field('feedback-from', 'Sent from', h('input', {id:'feedback-from', readonly:true, value:page + ' · ' + route + ' · ' + theme})),
      h('p', {class:'hint'}, 'Saving keeps a browser copy and tries to send this feedback privately to Marketing. Use sample details.'), check.container, save);
    body.replaceChildren(form);
    check.mount();
    message.focus();
  }
  openSheet('Feedback', body, opener, () => check?.remove());
  compose();
}
