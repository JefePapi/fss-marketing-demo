import { h, page, field, select, confirmSheet, openSheet, copyText, toast } from '../ui.js';
import { feedbackEntries, withFeedbackLock, writeFeedback, feedbackTemporary, pref } from '../store.js';
import { download, toCSV } from '../export.js';
import { fmtStamp } from '../model.js';
import { TYPES, feedbackRows, issueText } from './feedback-model.js';
import { feedbackStyles, memoryNote, deliverFeedback } from './feedback.js';
import { feedbackCheck, TURNSTILE_SITE_KEY } from './feedback-relay.js';

const canReview = () => pref('staff') && (pref('role') || 'marketing') === 'marketing';
const sending = new Set();
let refreshInbox;
window.addEventListener('feedbackchange', () => refreshInbox?.());

export function staffFeedback() {
  feedbackStyles();
  const list = h('div', {class:'feedback-list'});
  const unread = h('span', {class:'count', id:'feedback-unread'});
  const warning = h('p', {class:'note warn'}, memoryNote);
  const filter = select('feedback-filter', [['', 'All types'], ...TYPES.map(t => [t,t])], '', draw);
  const visible = () => feedbackEntries().filter(e => !filter.value || e.type === filter.value);

  function change(edit) {
    return withFeedbackLock(() => {
      if (canReview()) writeFeedback(edit(feedbackEntries()));
    });
  }

  function retry(entry, opener) {
    if (!canReview() || sending.has(entry.id)) return;
    async function send(token) {
      if (!canReview() || sending.has(entry.id)) return;
      sending.add(entry.id);
      opener.disabled = true;
      opener.setAttribute('aria-busy', 'true');
      try {
        const result = await deliverFeedback(entry.id, token, canReview);
        if (list.isConnected) toast(result.text);
      } finally {
        sending.delete(entry.id);
        const button = document.getElementById('feedback-retry-' + entry.id);
        if (button) {
          button.disabled = false;
          button.removeAttribute('aria-busy');
        }
        if (list.isConnected && document.activeElement === document.body)
          (button || document.getElementById('feedback-read-' + entry.id))?.focus({preventScroll:true});
      }
    }
    if (!TURNSTILE_SITE_KEY) return send();
    const check = feedbackCheck();
    const form = h('form', {class:'feedback-form', onsubmit:event => {
      event.preventDefault();
      const token = check.token();
      close();
      send(token);
    }}, check.container, h('button', {class:'btn primary', type:'submit'}, 'Send feedback'));
    const close = openSheet('Try sending again', form, opener, check.remove);
    check.mount();
  }

  function row(entry) {
    const action = (label, onclick) => h('button', {type:'button', class:'btn', onclick}, label);
    const toggle = action(entry.read ? 'Mark unread' : 'Mark read', async () => {
      await change(entries => entries.map(e => e.id === entry.id ? {...e, read:!entry.read} : e));
      document.getElementById(toggle.id)?.focus({preventScroll:true});
    });
    toggle.id = 'feedback-read-' + entry.id;
    return h('article', {class:'card feedback-card', 'data-test':'feedback-entry', 'data-read':String(entry.read)},
      h('div', {class:'feedback-byline'}, h('span', {class:'pill'}, entry.type), h('strong', null, entry.name || 'Anonymous'),
        h('time', {datetime:entry.at}, fmtStamp(entry.at)), !entry.read && h('span', {class:'feedback-new'}, 'Unread')),
      h('p', {class:'feedback-message'}, entry.message),
      h('p', {class:'hint'}, entry.page + ' · ' + entry.route + ' · Design: ' + entry.theme),
      h('p', {class:'feedback-status'}, entry.delivery === 'sent'
        ? ('Sent' + (entry.issue ? ' · #' + entry.issue : '')) : 'Only in this browser'),
      h('div', {class:'row wrap'}, toggle,
        entry.delivery !== 'sent' && h('button', {type:'button', class:'btn', id:'feedback-retry-' + entry.id,
          disabled:sending.has(entry.id),
          'aria-busy':String(sending.has(entry.id)), onclick:event => retry(entry, event.currentTarget)}, 'Try sending again'),
        action('Copy as text', async event => {
          const from = event.currentTarget, text = issueText(entry);
          if (await copyText(text)) toast('Feedback copied.');
          else openSheet('Copy feedback', field('feedback-copy', 'Select and copy this text',
            h('textarea', {id:'feedback-copy', readonly:true, rows:8, value:text})), from);
        }),
        action('Delete', event => confirmSheet('Delete this feedback from this browser?', 'Delete feedback', async () => {
          await change(entries => entries.filter(e => e.id !== entry.id));
          filter.focus();
        }, event.currentTarget))));
  }

  function draw() {
    const entries = visible();
    unread.textContent = feedbackEntries().filter(e => !e.read).length + ' unread';
    warning.hidden = !feedbackTemporary();
    list.replaceChildren(...(entries.length ? entries.map(row) : [
      h('section', {class:'surface feedback-empty'}, h('h2', null, filter.value ? 'No matching feedback' : 'No feedback yet'),
        h('p', null, filter.value ? 'Choose All types to see other submissions.' : 'Feedback saved in this browser will appear here.')),
    ]));
  }
  draw();
  refreshInbox = () => { if (list.isConnected) draw(); };
  return page(h('a', {href:'#/staff'}, 'Back to queue'), h('div', {class:'feedback-byline'}, h('h1', {tabindex:-1}, 'Feedback'), unread),
    h('div', {class:'feedback-tools'}, field(filter.id, 'Filter by type', filter),
      h('button', {class:'btn', type:'button', onclick:() => download('feedback-demo.csv', 'text/csv;charset=utf-8', toCSV(feedbackRows(visible())))},
        'Download feedback (CSV)')), warning, list);
}
