import { h, field, openSheet, chips, toast } from '../ui.js';
import { feedbackEntries, writeFeedback, feedbackTemporary, withFeedbackLock } from '../store.js';
import { TYPES, buildEntry, prependEntry, issueURL } from './feedback-model.js';

const FEEDBACK_RELAY_URL = '';
const BACKENDS = {
  local: entry => withFeedbackLock(() => writeFeedback(prependEntry(feedbackEntries(), entry))),
  relay: null,
};

export async function submitFeedback(entry) {
  await BACKENDS.local(entry);
  if (FEEDBACK_RELAY_URL && BACKENDS.relay) {
    const {type, message, name, page, route, theme, at} = entry;
    try { await BACKENDS.relay(FEEDBACK_RELAY_URL, {type, message, name, page, route, theme, at}); }
    catch { toast('Saved in this browser. The GitHub relay is unavailable.'); }
  }
  return entry;
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

  function compose() {
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
      try {
        const id = Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8,'0')).join('');
        const entry = await submitFeedback(buildEntry({type, message:message.value, name:name.value,
          page, route, theme}, id, new Date().toISOString()));
        const thanks = h('h3', {tabindex:-1}, 'Thanks — your feedback is saved in this demo.');
        body.replaceChildren(h('section', {class:'feedback-done'}, thanks,
          feedbackTemporary() && h('p', {class:'note warn'}, memoryNote), githubAction(entry),
          h('button', {class:'btn', type:'button', onclick:compose}, 'Send another')));
        thanks.focus();
      } catch {
        save.disabled = false;
        toast('Could not save feedback. Try again.');
      }
    }}, types, field(message.id, 'Message', message), count, error, field(name.id, 'Name (optional)', name),
      field('feedback-from', 'Sent from', h('input', {id:'feedback-from', readonly:true, value:page + ' · ' + route + ' · ' + theme})),
      h('p', {class:'hint'}, 'Demo: saved only in this browser. Nothing is sent.'), save);
    body.replaceChildren(form);
    message.focus();
  }
  openSheet('Feedback', body, opener);
  compose();
}
