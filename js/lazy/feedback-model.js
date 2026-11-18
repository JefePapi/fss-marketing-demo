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

