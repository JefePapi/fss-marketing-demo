import { h, page, field, select, confirmSheet, openSheet, copyText, toast } from '../ui.js';
import { feedbackEntries, withFeedbackLock, writeFeedback, feedbackTemporary, pref } from '../store.js';
import { download, toCSV } from '../export.js';
import { fmtStamp } from '../model.js';
import { TYPES, feedbackRows, issueText } from './feedback-model.js';
import { feedbackStyles, githubAction, memoryNote } from './feedback.js';

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
      if (pref('staff') && (pref('role') || 'marketing') === 'marketing') writeFeedback(edit(feedbackEntries()));
    });
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
      h('div', {class:'row wrap'}, toggle,
        action('Copy as text', async event => {
          const from = event.currentTarget, text = issueText(entry);
          if (await copyText(text)) toast('Feedback copied.');
          else openSheet('Copy feedback', field('feedback-copy', 'Select and copy this text',
            h('textarea', {id:'feedback-copy', readonly:true, rows:8, value:text})), from);
        }),
        action('Delete', event => confirmSheet('Delete this feedback from this browser?', 'Delete feedback', async () => {
          await change(entries => entries.filter(e => e.id !== entry.id));
          filter.focus();
        }, event.currentTarget))),
      githubAction(entry));
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
