import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEntry, feedbackRows, issueText, issueURL, prependEntry } from '../js/lazy/feedback-model.js';
import { relayResult, postFeedback } from '../js/lazy/feedback-relay.js';
import { toCSV } from '../js/export.js';

const input = {type:'Suggestion', message:'  A & B? #1 <sample>  ', name:' Sample ', page:'Queue', route:'#/staff?show=all', theme:'a-light'};
const entry = buildEntry(input, 'sample-id', '2026-11-18T12:00:00Z');

test('Feedback normalizes optional name, validates required fields, and starts unread', () => {
  assert.deepEqual(entry, {...input, name:'Sample', message:'A & B? #1 <sample>', read:false, delivery:'local', id:'sample-id', at:'2026-11-18T12:00:00Z'});
  for (const invalid of [{message:'  '}, {type:'Other'}, {message:'x'.repeat(2001)}, {name:'x'.repeat(61)}])
    assert.throws(() => buildEntry({...input,...invalid}, 'id', entry.at));
});

test('Feedback retains the newest 200 and preserves the original array', () => {
  const old = Array.from({length:200}, (_, i) => ({id:i}));
  const next = prependEntry(old, entry);
  assert.equal(next.length, 200);
  assert.equal(next[0], entry);
  assert.equal(next.at(-1).id, 198);
  assert.equal(old.length, 200);
});

test('Feedback CSV uses stable columns, Anonymous and spreadsheet-safe cells', () => {
  const csv = toCSV(feedbackRows([{...entry, message:'=1+1', name:''}]));
  assert.match(csv, /"Type","Message","Name","Page","Route","Design","Timestamp","Read"/);
  assert.match(csv, /"Suggestion","'=1\+1","Anonymous"/);
});

test('GitHub URL encodes a literal Markdown message and cannot change the destination or label', () => {
  const data = {...entry, message:'<img src=x>\n&labels=other # / "✨', name:''};
  const raw = issueURL(data), url = new URL(raw);
  assert.equal(url.origin + url.pathname, 'https://github.com/JefePapi/fss-marketing-demo/issues/new');
  assert.equal(url.searchParams.get('template'), 'feedback.md');
  assert.equal(url.searchParams.get('labels'), 'feedback');
  assert.equal(url.searchParams.get('title'), '[Suggestion] ' + data.message.replace('\n',' '));
  assert.equal(url.searchParams.get('body'), issueText(data));
  assert.match(issueText(data), /\n    <img src=x>\n    &labels=other/);
  assert.match(issueText(data), /Anonymous/);
  assert.doesNotMatch(raw, /[<>"]/);
});

test('Public issue drafts remain under 7500 characters, including wide text and oversized routes', () => {
  for (const message of ['🪁'.repeat(1000), '雪'.repeat(2000), '\ud800'.repeat(2000)]) {
    const raw = issueURL({...entry, message, route:'#/' + '雪'.repeat(5000)});
    assert.ok(raw.length < 7500);
    const args = new URL(raw).searchParams;
    assert.equal(Array.from(args.get('title').slice('[Suggestion] '.length)).length, 60);
    assert.match(args.get('body'), /Message truncated/);
    assert.match(args.get('body'), /Sent from the FSS marketing demo$/);
  }
});

test('Relay confirms only a 2xx response with an explicit ok flag', () => {
  for (const code of [200, 201, 299])
    assert.deepEqual(relayResult(code, {ok:true, number:12}), {delivery:'sent', issue:12, text:'Sent to the marketing team.'});
  for (const [code, body, reason] of [
    [503, null, "Shared sending isn't switched on yet."],
    [429, null, 'Too many messages right now — try again in a minute.'],
    ...[0, 400, 403, 502].map(code => [code, {ok:true}, "We couldn't send it right now."]),
    ...[null, {ok:false}, {ok:'true'}].map(body => [201, body, "We couldn't send it right now."]),
  ]) assert.deepEqual(relayResult(code, body), {delivery:'local', text:'Saved in this browser. ' + reason});
});

test('Relay bounds page context and aborts a stalled response at ten seconds', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  let signal, payload;
  const fetch = t.mock.method(globalThis, 'fetch', async (_, options) => {
    signal = options.signal;
    payload = JSON.parse(options.body);
    return {ok:true, status:201, json:() => new Promise((_, reject) =>
      signal.addEventListener('abort', () => reject(signal.reason), {once:true}))};
  });
  const attempt = postFeedback({...entry, page:'p'.repeat(210), route:'r'.repeat(210)}, '');
  await Promise.resolve();
  assert.equal(payload.page.length, 200);
  assert.equal(payload.route.length, 200);
  t.mock.timers.tick(9999);
  assert.equal(signal.aborted, false);
  t.mock.timers.tick(1);
  assert.deepEqual(await attempt, relayResult(0));
  assert.equal(signal.aborted, true);
  assert.equal(fetch.mock.callCount(), 1);
});
