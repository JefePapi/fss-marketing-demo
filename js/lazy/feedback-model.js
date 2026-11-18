export const TYPES = ['Feedback', 'Suggestion', 'Bug'];

export function buildEntry({type, message, name, page, route, theme}, id, at) {
  message = message.trim();
  if (!TYPES.includes(type) || !message || message.length > 2000 || name.length > 60)
    throw new Error('Invalid feedback fields');
  return {id, type, message, name:name.trim(), page, route, theme, at, read:false, delivery:'local'};
}

export const prependEntry = (entries, entry) => [entry, ...entries].slice(0, 200);

export function feedbackRows(entries) {
  const headers = ['Type', 'Message', 'Name', 'Page', 'Route', 'Design', 'Timestamp', 'Read'];
  return [{cells:headers}, ...entries.map(e => ({cells:[
    e.type, e.message, e.name || 'Anonymous', e.page, e.route, e.theme, e.at, e.read ? 'Yes' : 'No',
  ]}))];
}

// Indented Markdown keeps submitted markup, image references and mentions literal on GitHub.
const literal = text => String(text).replace(/^/gm, '    ');
export function issueText(entry) {
  const {type, message, name, page, route, theme, at} = entry;
  return `Type: ${type}\n\nMessage:\n\n${literal(message)}\n\nName:\n\n${literal(name || 'Anonymous')}\n\nSent from:\n\n${literal(page + ' · ' + route)}\n\nDesign: ${theme}\nTimestamp: ${at}\n\nSent from the FSS marketing demo`;
}

const encode = value => encodeURIComponent(value.toWellFormed());
function shorten(value, max) {
  const chars = Array.from(value);
  return chars.length > max ? chars.slice(0, max).join('') + '…' : value;
}

export function issueURL(entry) {
  const title = '[' + entry.type + '] ' + Array.from(entry.message.replace(/\s+/g, ' ')).slice(0, 60).join('');
  const base = 'https://github.com/JefePapi/fss-marketing-demo/issues/new?template=feedback.md&labels=feedback&title='
    + encode(title) + '&body=';
  const url = data => base + encode(issueText(data));
  if (url(entry).length < 7500) return url(entry);

  // Bound even an unusually long pasted hash or page title before budgeting the message.
  const summary = {...entry, page:shorten(entry.page, 64), route:shorten(entry.route, 160)};
  if (url(summary).length < 7500) return url(summary);
  const chars = Array.from(entry.message);
  const clipped = length => url({...summary, message:chars.slice(0, length).join('') + '\n[Message truncated for the GitHub link.]'});
  let low = 0, high = chars.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (clipped(mid).length < 7500) low = mid;
    else high = mid - 1;
  }
  return clipped(low);
}
