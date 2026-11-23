import test from 'node:test'; import assert from 'node:assert/strict';
import worker, { validate, issueFor, localLimit } from './worker.js';
const O = 'https://jefepapi.github.io';
let ip = 0;
const req = (opts = {}) => new Request('https://x.workers.dev' + (opts.path || '/feedback'), { method: opts.method || 'POST',
  headers: { ...(opts.origin === null ? {} : { Origin: opts.origin || O }), 'Content-Type': opts.ct || 'application/json',
    'CF-Connecting-IP': opts.ip || 'test-sender-' + (++ip), ...opts.headers },
  body: (opts.method || 'POST') === 'POST' ? opts.raw ?? JSON.stringify(opts.body || { type: 'suggestion', message: 'Hi @team #12 ```x```', name: 'Jo', page: 'Home', route: '#/', theme: 'a', turnstileToken: 't' }) : undefined,
  ...(opts.raw instanceof ReadableStream && { duplex: 'half' }) });
test('rejects other origins', async () => { assert.equal((await worker.fetch(req({ origin: 'https://evil.example' }), {})).status, 403); assert.equal((await worker.fetch(req({ origin: null }), {})).status, 403); });
test('preflight has strict CORS', async () => { const r = await worker.fetch(req({ method: 'OPTIONS' }), {}); assert.equal(r.status, 204); assert.equal(r.headers.get('Access-Control-Allow-Origin'), O); });
test('503 when not configured', async () => { const r = await worker.fetch(req(), {}); assert.equal(r.status, 503); assert.equal((await r.json()).error, 'not configured'); assert.equal(r.headers.get('Access-Control-Allow-Origin'), O); });
test('429 when rate limited', async () => { const r = await worker.fetch(req(), { RATE_LIMIT: { limit: async () => ({ success: false }) } }); assert.equal(r.status, 429); });
test('validation', () => { assert.ok(validate({ type: 'x', message: 'a' }).error); assert.ok(validate({ type: 'bug', message: '  ' }).error); assert.ok(validate({ type: 'bug', message: 'a'.repeat(2001) }).error); assert.ok(validate({ type: 'bug', message: 'ok' }).value); });
test('issue text is inert', () => { const i = issueFor(validate({ type: 'suggestion', message: 'Hi @team #12 ```x```', theme: 'a' }).value); assert.ok(!/@team/.test(i.body)); assert.ok(!/```/.test(i.body)); assert.deepEqual(i.labels, ['feedback', 'suggestion']); assert.ok(i.title.startsWith('[Suggestion] ')); });
test('creates issue when configured and check passes', async () => {
  const calls = []; const orig = globalThis.fetch;
  globalThis.fetch = async (u, init) => { calls.push(String(u)); if (String(u).includes('siteverify')) return Response.json({ success: true, hostname: 'jefepapi.github.io' }); return new Response(JSON.stringify({ number: 7 }), { status: 201 }); };
  try { const r = await worker.fetch(req(), { GITHUB_TOKEN: 'x', TURNSTILE_SECRET: 'y', RATE_LIMIT: { limit: async () => ({ success: true }) } }); assert.equal(r.status, 201); assert.equal((await r.json()).number, 7); assert.equal(calls.length, 2); }
  finally { globalThis.fetch = orig; } });
test('bad turnstile is 403', async () => { const orig = globalThis.fetch; globalThis.fetch = async () => Response.json({ success: false });
  try { assert.equal((await worker.fetch(req(), { GITHUB_TOKEN: 'x', TURNSTILE_SECRET: 'y' })).status, 403); } finally { globalThis.fetch = orig; } });
test('local limiter allows 5 per minute', () => { for (let i = 0; i < 5; i++) assert.equal(localLimit('k', 1000), true); assert.equal(localLimit('k', 1000), false); assert.equal(localLimit('k', 62000), true); });

// Flat gray, single-component JPEGs made with Pillow. Wide fixtures use
// baseline scans and tall fixtures use progressive scans.
const jpegs = Object.fromEntries(Object.entries({
  wide: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAAIBQABAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAA/AIYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/9k=',
  tooWide: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAAIBQEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAA/AIYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/9k=',
  tall: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wgALCAUAAAgBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAT/2gAIAQEAAAABhAAAAAAAAAAAAAAAAAAAAAAAAAAH/8QAFBABAAAAAAAAAAAAAAAAAAAAcP/aAAgBAQABBQIg/8QAFBABAAAAAAAAAAAAAAAAAAAAcP/aAAgBAQAGPwIg/8QAFBABAAAAAAAAAAAAAAAAAAAAcP/aAAgBAQABPyEg/9oACAEBAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAA/8QAFBABAAAAAAAAAAAAAAAAAAAAcP/aAAgBAQABPxAg/9k=',
  tooTall: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wgALCAUBAAgBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAT/2gAIAQEAAAABhAAAAAAAAAAAAAAAAAAAAAAAAAAD/8QAFBABAAAAAAAAAAAAAAAAAAAAcP/aAAgBAQABBQIh/8QAFBABAAAAAAAAAAAAAAAAAAAAcP/aAAgBAQAGPwIh/8QAFBABAAAAAAAAAAAAAAAAAAAAcP/aAAgBAQABPyEh/9oACAEBAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAf//EABQQAQAAAAAAAAAAAAAAAAAAAHD/2gAIAQEAAT8QIf/Z',
}).map(([name, base64]) => [name, Buffer.from(base64, 'base64')]));

const withSize = size => Buffer.concat([
  jpegs.wide.subarray(0, -2), Buffer.alloc(size - jpegs.wide.length, 0xff), jpegs.wide.subarray(-2),
]); // JPEG permits FF fill bytes before EOI.
const imageCT = 'application/json; screenshot=jpeg';
const textFields = { type: 'feedback', message: 'Sample résumé', turnstileToken: 'sample-check' };
const imageBody = jpeg => ({ ...textFields, id: 'sample-id', screenshot: jpeg.toString('base64') });
const testEnv = {
  GITHUB_TOKEN: 'sample-issue-key', TURNSTILE_SECRET: 'sample-check-key',
  LIMITER: { idFromName: name => name, get: () => ({ hit: async () => true }) },
};

function stubExternal(t) {
  return t.mock.method(globalThis, 'fetch', async url => {
    if (url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify')
      return Response.json({ success: true, hostname: 'jefepapi.github.io' });
    assert.equal(url, 'https://api.github.com/repos/JefePapi/fss-demo-feedback/issues');
    return Response.json({ number: 7 }, { status: 201 });
  }).mock;
}

const modes = ['accurate length', 'no length', 'lying smaller length', 'chunked without length'];
function transport(raw, mode) {
  const size = Buffer.byteLength(raw);
  const headers = mode === 'accurate length' ? { 'Content-Length': String(size) }
    : mode === 'lying smaller length' ? { 'Content-Length': '1' } : {};
  if (mode !== 'chunked without length') return { raw, headers };
  const bytes = new TextEncoder().encode(raw);
  const split = bytes.indexOf(0xc3) + 1; // Split the UTF-8 character in the message.
  const chunks = [bytes.subarray(0, split), bytes.subarray(split, -1), bytes.subarray(-1)];
  return { headers, raw: new ReadableStream({
    pull(controller) {
      if (chunks.length) controller.enqueue(chunks.shift());
      else controller.close();
    },
  }) };
}

for (const mode of modes) {
  for (const [name, cap, body, ct] of [
    ['Text-only request', 8192, textFields],
    ['Image request', 368640, imageBody(withSize(262144)), imageCT],
  ]) {
    test(`${name} cap and one byte over (${mode})`, async t => {
      const upstream = stubExternal(t);
      const json = JSON.stringify(body);
      const atCap = json + ' '.repeat(cap - Buffer.byteLength(json));
      assert.equal((await worker.fetch(req({ ...transport(atCap, mode), ct }), testEnv)).status, 201);
      const rejected = await worker.fetch(req({ ...transport(atCap + ' ', mode), ct }), testEnv);
      assert.equal(rejected.status, 413);
      assert.equal(upstream.callCount(), 2);
    });
  }

  test(`JPEG byte cap and one byte over (${mode})`, async t => {
    const upstream = stubExternal(t);
    const send = size => worker.fetch(req({
      ...transport(JSON.stringify(imageBody(withSize(size))), mode), ct: imageCT,
    }), testEnv);
    assert.equal((await send(262144)).status, 201);
    assert.equal((await send(262145)).status, 413);
    assert.equal(upstream.callCount(), 2);
  });
}

for (const [name, cap, ct] of [['text-only', 8192], ['image', 368640, imageCT]]) {
  test(`cancels ${name} stream at the first excess byte`, async t => {
    const upstream = stubExternal(t);
    let pulls = 0, cancelled = false;
    const raw = new ReadableStream({
      pull(controller) {
        pulls++;
        assert.ok(pulls <= 2, 'read past the first excess byte');
        controller.enqueue(new Uint8Array(pulls === 1 ? cap : 1));
      },
      cancel() { cancelled = true; },
    }, { highWaterMark: 0 });
    const response = await worker.fetch(req({ raw, ct, headers: { 'Content-Length': '1' } }), testEnv);
    assert.equal(response.status, 413);
    assert.equal(pulls, 2);
    assert.equal(cancelled, true);
    assert.equal(upstream.callCount(), 0);
  });
}

for (const [axis, atCap, over] of [['width', jpegs.wide, jpegs.tooWide], ['height', jpegs.tall, jpegs.tooTall]]) {
  test(`JPEG ${axis} accepts 1280 and rejects 1281`, async t => {
    const upstream = stubExternal(t);
    const send = jpeg => worker.fetch(req({ body: imageBody(jpeg), ct: imageCT }), testEnv);
    assert.equal((await send(atCap)).status, 201);
    assert.equal((await send(over)).status, 413);
    assert.equal(upstream.callCount(), 2);
  });
}

function insertMarker(code, data) {
  return Buffer.concat([jpegs.wide.subarray(0, 20), Buffer.from([0xff, code, 0, data.length + 2]),
    data, jpegs.wide.subarray(20)]);
}

const exifWithGps = Buffer.from('45786966000049492a0008000000010025880400010000001a00000000000000010001000200020000004e00000000000000', 'hex');
for (const [name, jpeg] of [
  ['non-JPEG bytes', Buffer.from('not a JPEG')],
  ['missing SOI', jpegs.wide.subarray(2)],
  ['missing EOI', jpegs.wide.subarray(0, -2)],
  ['trailing data', Buffer.concat([jpegs.wide, jpegs.wide])],
  ['garbage segment length', insertMarker(0xdb, Buffer.alloc(0)).map((byte, i) => i === 23 ? 1 : byte)],
  ['malformed Huffman table', insertMarker(0xc4, Buffer.from([0, 255]))],
  ['unsupported SOF', jpegs.wide.map((byte, i) => i === 90 ? 0xc1 : byte)],
  ['EXIF with GPS IFD', insertMarker(0xe1, exifWithGps)],
  ['XMP APP1', insertMarker(0xe1, Buffer.from('http://ns.adobe.com/xap/1.0/\0'))],
  ['ICC APP2', insertMarker(0xe2, Buffer.from('ICC_PROFILE\0'))],
  ['comment', insertMarker(0xfe, Buffer.from('Sample comment'))],
  ['application-specific APP0', insertMarker(0xe0, Buffer.from('JFXX\0'))],
]) {
  test(`rejects JPEG with ${name}`, async t => {
    const upstream = stubExternal(t);
    const response = await worker.fetch(req({ body: imageBody(jpeg), ct: imageCT }), testEnv);
    assert.equal(response.status, 422);
    assert.match((await response.json()).error, /Send text only/);
    assert.equal(upstream.callCount(), 0);
  });
}

test('the image envelope requires a matching header and base64 JPEG', async t => {
  const upstream = stubExternal(t);
  for (const options of [
    { body: textFields, ct: imageCT }, { body: imageBody(jpegs.wide) },
    { body: { ...textFields, screenshot: '!!!!' }, ct: imageCT },
  ]) {
    assert.equal((await worker.fetch(req(options), testEnv)).status, 422);
  }
  assert.equal(upstream.callCount(), 0);
});

test('an accepted image makes exactly the same upstream calls as text only', async t => {
  const upstream = stubExternal(t);
  const text = await worker.fetch(req({ body: textFields }), testEnv);
  const image = await worker.fetch(req({ body: imageBody(jpegs.wide), ct: imageCT }), testEnv);
  assert.equal(text.status, 201);
  assert.equal(image.status, 201);
  assert.deepEqual(await text.json(), await image.json());
  assert.equal(upstream.callCount(), 4);
  const [textCheck, textIssue, imageCheck, imageIssue] = upstream.calls.map(call => call.arguments);
  assert.equal(imageCheck[0], textCheck[0]);
  assert.equal(imageCheck[1].method, textCheck[1].method);
  assert.deepEqual([...imageCheck[1].body], [...textCheck[1].body]);
  assert.equal(imageIssue[0], textIssue[0]);
  const normalize = options => {
    const issue = JSON.parse(options.body);
    issue.body = issue.body.replace(/^\*\*Received:\*\* .*$/m, '**Received:** sample-time');
    return { ...options, body: issue };
  };
  assert.deepEqual(normalize(imageIssue[1]), normalize(textIssue[1]));
});

test('a rejected JPEG still allows text from the same sender', async t => {
  const upstream = stubExternal(t);
  const ip = 'sample-rejected-image-sender';
  const failed = await worker.fetch(req({ body: imageBody(jpegs.tooWide), ct: imageCT, ip }), testEnv);
  assert.equal(failed.status, 413);
  assert.equal(upstream.callCount(), 0);
  assert.equal((await worker.fetch(req({ body: textFields, ip }), testEnv)).status, 201);
  assert.equal(upstream.callCount(), 2);
});

test('image admission preserves capacity for text across the same sender and all senders', async t => {
  const upstream = stubExternal(t);
  const hits = new Map();
  const env = { ...testEnv, LIMITER: { idFromName: name => name, get: name => ({
    async hit(limit = 5) {
      const count = (hits.get(name) || 0) + 1;
      if (count > limit) return false;
      hits.set(name, count);
      return true;
    },
  }) } };
  const sendImage = ip => worker.fetch(req({ body: imageBody(jpegs.wide), ct: imageCT, ip }), env);
  const ip = 'sample-image-sender';
  assert.equal((await sendImage(ip)).status, 201);
  assert.equal((await sendImage(ip)).status, 429);
  for (let i = 0; i < 9; i++) assert.equal((await sendImage('sample-image-sender-' + i)).status, 201);
  const busy = await sendImage('sample-image-busy');
  assert.equal(busy.status, 429);
  assert.match((await busy.json()).error, /Send text only/);
  assert.equal(upstream.callCount(), 20);
  assert.equal(hits.get('global'), 10);
  assert.equal((await worker.fetch(req({ body: textFields, ip }), env)).status, 201);
  assert.equal((await worker.fetch(req({ body: textFields, ip: 'sample-image-busy' }), env)).status, 201);
  assert.equal(hits.get('global'), 12);
  assert.equal(upstream.callCount(), 24);
});
