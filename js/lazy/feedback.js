import { h, field, openSheet, chips, toast } from '../ui.js';
import { feedbackEntries, writeFeedback, feedbackTemporary, withFeedbackLock } from '../store.js';
import { TYPES, buildEntry, prependEntry } from './feedback-model.js';
import { postFeedback, relayResult, feedbackCheck } from './feedback-relay.js';
import { capture, rememberCapture } from './feedback-capture.js';

const attempts = new Map();
export function deliverFeedback(id, token, allowed = () => true, screenshot) {
  // Browsers without Web Locks can still share an in-flight send in this tab.
  if (attempts.has(id)) return attempts.get(id);
  const attempt = sendStored(id, token, allowed, screenshot).finally(() => attempts.delete(id));
  attempts.set(id, attempt);
  return attempt;
}

function sendStored(id, token, allowed, screenshot) {
  // Serialize sends for the same entry across tabs, without holding the inbox
  // write lock during a slow POST. Re-read before updating so reads/deletes win.
  return withFeedbackLock(async () => {
    const entry = feedbackEntries().find(e => e.id === id);
    if (!entry || !allowed()) return relayResult(0);
    if (entry.delivery === 'sent') return relayResult(201,
      {ok:true, number:entry.issue, screenshot:entry.screenshotStatus}, Boolean(screenshot));
    const result = await postFeedback(entry, token, screenshot);
    if (result.delivery === 'sent' || !entry.delivery) await withFeedbackLock(() => {
      const entries = feedbackEntries();
      if (entries.some(e => e.id === id)) writeFeedback(entries.map(e => e.id === id
        ? {...e, delivery:result.delivery, issue:result.issue,
          ...(result.screenshotStatus && {screenshotStatus:result.screenshotStatus})} : e));
    });
    return result;
  }, 'mktdemo.feedback.send.' + id);
}

function saveDraft(entry, screenshot) {
  return withFeedbackLock(() => {
    const entries = feedbackEntries();
    const previous = entries.find(e => e.id === entry.id);
    const updated = screenshot || previous?.imageSubmission ? {...entry, imageSubmission:true} : entry;
    if (!previous) writeFeedback(prependEntry(entries, updated));
    else if (previous.delivery === 'local')
      writeFeedback(entries.map(e => e.id === entry.id ? {...updated, read:e.read} : e));
  });
}

export async function submitFeedback(entry, token, screenshot) {
  await saveDraft(entry, screenshot);
  return deliverFeedback(entry.id, token, undefined, screenshot);
}

export function feedbackStyles() {
  if (!document.getElementById('feedback-css'))
    document.head.append(h('link', {id:'feedback-css', rel:'stylesheet', href:'./css/feedback.css'}));
}

export const memoryNote = 'Browser storage is unavailable. Feedback changes last only until this page closes.';

export function openFeedback(opener) {
  const forgetCapture = rememberCapture();
  const markupEnabled = ['localhost', '127.0.0.1'].includes(location.hostname) &&
    new URLSearchParams(location.search).get('feedback-markup') === '1';
  feedbackStyles();
  const body = h('div', {class:'feedback-body'});
  const route = location.hash || '#/';
  const page = document.querySelector('#app h1')?.innerText.replace(/\s+/g, ' ').trim() || document.title;

  let check, stopMarkup;
  function compose() {
    check = feedbackCheck();
    let type = TYPES[0];
    let screenshotJpeg, draft, textOnly = false;
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
    const screenshot = h('div', {class:'feedback-screenshot'});
    const screenshotHint = h('p', {class:'hint'}, 'You can add a screenshot for the marketing team.');
    const screenshotStatus = h('p', {class:'hint', role:'status'});
    const add = h('button', {type:'button', class:'btn', onclick:async () => {
      if (save.disabled || add.getAttribute('aria-disabled') === 'true') return;
      add.setAttribute('aria-disabled', 'true');
      screenshotStatus.textContent = '';
      try {
        const result = capture();
        if (result.ok) {
          const {editScreenshot} = await import('./feedback-markup.js');
          if (form.isConnected && !save.disabled)
            stopMarkup = editScreenshot(result.canvas, form, add, showPreview, sendTextOnly);
          return;
        }
        sendTextOnly('A screenshot is unavailable for this page.');
      } catch {
        sendTextOnly('Could not add a screenshot.');
      } finally { add.removeAttribute('aria-disabled'); }
    }}, 'Add page screenshot');
    function sendTextOnly(reason) {
      const hadPreview = Boolean(screenshotJpeg);
      screenshotJpeg = undefined;
      textOnly = true;
      screenshotStatus.textContent = reason + ' You can still send text feedback.';
      save.textContent = 'Send text only';
      if (hadPreview) {
        screenshot.replaceChildren(screenshotHint, add, screenshotStatus);
        save.focus();
      }
    }
    function showPreview(img, encoded) {
      screenshotJpeg = encoded;
      textOnly = false;
      save.textContent = 'Save feedback';
      const remove = h('button', {type:'button', class:'btn', onclick:() => {
        screenshotJpeg = undefined;
        screenshot.replaceChildren(screenshotHint, add, screenshotStatus);
        add.focus();
      }}, 'Remove');
      screenshot.replaceChildren(h('p', {class:'hint'}, 'Your screenshot will be sent privately to the marketing team.'),
        remove, img);
      remove.focus();
      screenshot.scrollIntoView({block:'start'});
    }
    screenshot.append(screenshotHint, add, screenshotStatus);
    const save = h('button', {type:'submit', class:'btn primary'}, 'Save feedback');
    function readDraft() {
      const id = draft?.id ?? Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8,'0')).join('');
      draft = buildEntry({type, message:message.value, name:name.value,
        page, route, theme}, id, draft?.at ?? new Date().toISOString());
      return draft;
    }
    function showDelivery(result) {
      check.remove();
      screenshotJpeg = undefined;
      const thanks = h('h3', {tabindex:-1, 'aria-describedby':'feedback-delivery'}, 'Thanks — your feedback is saved in this demo.');
      body.replaceChildren(h('section', {class:'feedback-done'}, thanks,
        h('p', {id:'feedback-delivery', class:'feedback-status', role:'status', 'aria-live':'polite'}, result.text),
        feedbackTemporary() && h('p', {class:'note warn'}, memoryNote),
        h('button', {class:'btn', type:'button', onclick:compose}, 'Send another')));
      thanks.focus();
    }
    function waitForTextToken() {
      if (!check.token()) save.textContent = 'Getting ready...';
      return check.waitForToken();
    }
    async function showSavedDraft() {
      // The visitor may have edited the draft while the check was running.
      if (message.value.trim()) await saveDraft(readDraft());
      if (body.isConnected) showDelivery(relayResult(0));
    }
    const form = h('form', {class:'feedback-form', novalidate:true, onsubmit:async event => {
      event.preventDefault();
      if (save.disabled || form.hidden) return;
      if (!message.value.trim()) {
        error.textContent = 'Enter a message.';
        error.hidden = false;
        message.setAttribute('aria-invalid', 'true');
        message.focus();
        return;
      }
      save.disabled = true;
      save.setAttribute('aria-busy', 'true');
      const screenshotButton = screenshot.querySelector('button');
      screenshotButton.disabled = true;
      try {
        const token = textOnly ? await waitForTextToken() : check.token();
        if (!body.isConnected) return;
        if (textOnly && !token) { await showSavedDraft(); return; }
        const result = await submitFeedback(readDraft(), token, screenshotJpeg);
        if (!body.isConnected) return;
        if (result.screenshotError) {
          if (result.refreshCheck) check.reset();
          sendTextOnly(result.screenshotError);
          const textToken = await waitForTextToken();
          if (!body.isConnected) return;
          if (!textToken) { await showSavedDraft(); return; }
          save.textContent = 'Send text only';
          save.disabled = false;
          save.removeAttribute('aria-busy');
          screenshotButton.disabled = false;
          save.focus();
          return;
        }
        showDelivery(result);
      } catch {
        save.disabled = false;
        save.removeAttribute('aria-busy');
        screenshotButton.disabled = false;
        toast('Could not save feedback. Try again.');
      }
    }}, types, field(message.id, 'What do you like? What would you change?', message), count, error, field(name.id, 'Name (optional)', name),
      field('feedback-from', 'Sent from', h('input', {id:'feedback-from', readonly:true, value:page + ' · ' + route + ' · ' + theme})),
      markupEnabled && screenshot, h('p', {class:'hint'}, markupEnabled
        ? 'Saving keeps a browser copy of your written feedback and tries to send it privately to Marketing. Use sample details.'
        : 'Saving keeps a browser copy and tries to send this feedback privately to Marketing. Use sample details.'), check.container, save);
    body.replaceChildren(form);
    check.mount();
    message.focus();
  }
  openSheet('Feedback', body, opener, () => { stopMarkup?.(); forgetCapture(); check?.remove(); });
  compose();
}
